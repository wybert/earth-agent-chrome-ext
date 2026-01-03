import { ModelMessage, streamText, tool, TextPart, ImagePart, FilePart, stepCountIs } from 'ai';
import type { Message, Provider, BuiltInProvider, OpenAICompatibleConfig } from '../types/extension';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createQwen } from 'qwen-ai-provider';
import { createOllama } from 'ollama-ai-provider';
import { createResilientFetch } from '../lib/utils';
import { GEE_ASK_MODE_PROMPT, GEE_DO_MODE_PROMPT, GEE_SYSTEM_PROMPT } from '../lib/prompts/gee-prompts';
import { createAITools, type ToolEventCallback } from '../lib/tools/ai-tools';
import { OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY } from '../constants/models';
import { estimatePromptTokens } from '../lib/utils/token-counter';
import { getModelContextLimit } from '../constants/model-limits';

// Re-export ToolEventCallback and Provider for backwards compatibility
export type { ToolEventCallback, Provider };

// Default models configuration (for built-in providers only)
export const DEFAULT_MODELS: Record<BuiltInProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-5-20250929',
  google: 'gemini-2.5-pro',
  qwen: 'qwen-max-latest',
  ollama: 'phi3'
};

const NETWORK_RETRY_ATTEMPTS = 3;
const NETWORK_RETRY_BASE_DELAY_MS = 700;

/**
 * Sequential Tool Execution Configuration
 *
 * When true: Tools are executed one at a time (safer for stateful operations like Earth Engine editor)
 * When false: Tools may be executed in parallel (faster but may cause race conditions)
 *
 * Supported natively by: OpenAI, Anthropic
 * Fallback via prompt for: Google, Qwen, Ollama, custom providers
 */
const SEQUENTIAL_TOOL_EXECUTION = true;

// Custom fetch function for Anthropic to handle CORS
const corsProxyFetch = async (input: string | URL | Request, options: RequestInit = {}): Promise<Response> => {
  // Get the URL as a string
  let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  
  // Fix the Anthropic API path if needed
  // If the URL is to Anthropic but missing the /v1 path segment, add it
  if (url.startsWith('https://api.anthropic.com/') && !url.includes('/v1/')) {
    url = url.replace('https://api.anthropic.com/', 'https://api.anthropic.com/v1/');
    console.log(`🔄 [CORS Proxy] Fixed API path: ${url}`);
    
    // If input is a string, replace it directly
    if (typeof input === 'string') {
      input = url;
    } 
    // If input is a URL object, create a new URL
    else if (input instanceof URL) {
      input = new URL(url);
    }
    // If input is a Request, create a new Request with the corrected URL
    else {
      input = new Request(url, input);
    }
  }
  
  console.log(`🔄 [CORS Proxy] Fetching from ${url}`);
  
  try {
    // Add the required headers for browser requests to Anthropic
    const headers = new Headers(options.headers || {});
    headers.set('anthropic-version', '2023-06-01');
    headers.set('anthropic-dangerous-direct-browser-access', 'true');
    
    // Create new options with enhanced headers
    const enhancedOptions: RequestInit = {
      ...options,
      headers,
      // Add credentials to ensure cookies are sent with the request
      credentials: 'include',
      // Add mode to handle CORS preflight
      mode: 'cors'
    };
    
    console.log(`🔄 [CORS Proxy] Headers set: ${JSON.stringify(Object.fromEntries(headers.entries()))}`);
    
    // Make the fetch request with enhanced options
    const response = await fetch(input, enhancedOptions);
    
    // Log success or error
    if (response.ok) {
      console.log(`✅ [CORS Proxy] Request succeeded: ${response.status} ${response.statusText}`);
    } else {
      console.error(`❌ [CORS Proxy] Request failed: ${response.status} ${response.statusText}`);
      // Try to get error details
      try {
        const errorData = await response.clone().text();
        console.error(`❌ [CORS Proxy] Error details: ${errorData}`);
      } catch (e) {
        console.error(`❌ [CORS Proxy] Could not read error details`);
      }
    }
    
    return response;
  } catch (error) {
    console.error(`❌ [CORS Proxy] Fetch error:`, error);
    // Create a synthetic error response
    return new Response(
      JSON.stringify({
        error: {
          type: 'fetch_error',
          message: error instanceof Error ? error.message : String(error),
          details: 'Error occurred during custom fetch operation'
        }
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

/**
 * Handle chat messages from the UI
 */
export async function handleChatRequest(
  messages: Message[],
  apiKey: string,
  provider: Provider,
  model?: string,
  heliconeHeaders?: Record<string, string>,
  baseURL?: string,
  onToolEvent?: ToolEventCallback,
  mode: 'ask' | 'do' = 'ask',
  profile?: { prompt?: string; tools?: string[] }
): Promise<Response> {
  try {
    // Debug log at start of request
    console.log(`🔍 [Chat Handler] Request starting with provider: ${provider}, requested model: ${model || 'default'}, mode: ${mode}`);
    
    if (!apiKey && provider !== 'ollama') {
      console.error(`❌ [Chat Handler] API key not configured for ${provider}`);
      return new Response(JSON.stringify({
        error: 'API key not configured',
        message: 'Please set your API key in the extension settings'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Load project context from storage
    let projectContext = '';
    try {
      const storageResult = await chrome.storage.local.get(['earth_engine_project_context']);
      projectContext = storageResult['earth_engine_project_context'] || '';
      if (projectContext) {
        console.log(`📋 [Chat Handler] Loaded project context (${projectContext.length} characters)`);
      }
    } catch (error) {
      console.error('❌ [Chat Handler] Error loading project context:', error);
      // Continue without project context if there's an error
    }

    // Setup LLM provider
    let llmProvider: ReturnType<typeof createOpenAI> | ReturnType<typeof createAnthropic> | ReturnType<typeof createGoogleGenerativeAI> | ReturnType<typeof createQwen> | ReturnType<typeof createOllama>;
    let effectiveModel: string;

    if (provider === 'openai') {
      // Validate API key
      if (!apiKey || apiKey.trim() === '') {
        console.error(`❌ [Chat Handler] OpenAI API key is missing or empty`);
        return new Response(JSON.stringify({
          error: 'OpenAI API key is required',
          message: 'Please configure your OpenAI API key in the extension settings.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Validate API key format (OpenAI keys start with sk-)
      if (!apiKey.startsWith('sk-')) {
        console.error(`❌ [Chat Handler] Invalid OpenAI API key format. Key should start with 'sk-', got: ${apiKey.substring(0, 10)}...`);
        return new Response(JSON.stringify({
          error: 'Invalid OpenAI API key format',
          message: 'OpenAI API keys should start with "sk-". Please check your API key in settings.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      console.log(`🔧 [Chat Handler] OpenAI API key validated: ${apiKey.substring(0, 10)}... (length: ${apiKey.length})`);

      // Configure OpenAI with Helicone proxy if headers are provided
      const openaiConfig: any = {
        apiKey,
        fetch: createResilientFetch({
          label: 'ChatHandler:OpenAI',
          maxAttempts: NETWORK_RETRY_ATTEMPTS,
          baseDelayMs: NETWORK_RETRY_BASE_DELAY_MS,
        })
      };

      if (heliconeHeaders && heliconeHeaders['Helicone-Auth']) {
        console.log('🔍 [Chat Handler] Configuring OpenAI with Helicone observability');
        openaiConfig.baseURL = 'https://oai.helicone.ai/v1';
        openaiConfig.headers = heliconeHeaders;
      }

      llmProvider = createOpenAI(openaiConfig);
      effectiveModel = model || DEFAULT_MODELS.openai;
      console.log(`✅ [Chat Handler] Using OpenAI provider with model: ${effectiveModel}${heliconeHeaders ? ' (with Helicone)' : ''}`);
    } else if (provider === 'anthropic') {
      effectiveModel = model || DEFAULT_MODELS.anthropic;

      // Create the Anthropic provider with optional Helicone configuration
      const anthropicConfig: any = {
        apiKey,
        // Use our custom fetch wrapped with retries to handle CORS and transient failures
        fetch: createResilientFetch({
          label: 'ChatHandler:Anthropic',
          fetchImpl: corsProxyFetch,
          maxAttempts: NETWORK_RETRY_ATTEMPTS,
          baseDelayMs: NETWORK_RETRY_BASE_DELAY_MS,
        }),
      };
      
      if (heliconeHeaders && heliconeHeaders['Helicone-Auth']) {
        console.log('🔍 [Chat Handler] Configuring Anthropic with Helicone observability');
        anthropicConfig.baseURL = 'https://anthropic.helicone.ai';
        anthropicConfig.headers = heliconeHeaders;
      } else {
        // Set the correct baseURL for the Anthropic API, without the version path
        anthropicConfig.baseURL = 'https://api.anthropic.com';
      }
      
      llmProvider = createAnthropic(anthropicConfig);
      
      console.log(`Using Anthropic provider with model: ${effectiveModel} (UI selection was: ${model || 'not specified'})${heliconeHeaders ? ' (with Helicone)' : ''}`);
    } else if (provider === 'google') {
      effectiveModel = model || DEFAULT_MODELS.google;

      // Validate API key format for Google
      if (!apiKey || !apiKey.startsWith('AIza') || apiKey.length !== 39) {
        console.error(`❌ [Chat Handler] Invalid Google API key format. Expected format: AIzaXXX... (39 characters), got: ${apiKey ? apiKey.substring(0, 10) + '...' : 'empty'}`);
        return new Response(JSON.stringify({ 
          error: 'Invalid Google API key format. Please check your Google API key in settings.' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Create the Google provider
      const googleConfig: any = {
        apiKey,
        fetch: createResilientFetch({
          label: 'ChatHandler:Google',
          maxAttempts: NETWORK_RETRY_ATTEMPTS,
          baseDelayMs: NETWORK_RETRY_BASE_DELAY_MS,
        }),
        // Add baseURL to help with debugging
        // Note: AI SDK Google provider uses the default Google AI API endpoint
      };
      
      if (heliconeHeaders && heliconeHeaders['Helicone-Auth']) {
        console.log('🔍 [Chat Handler] Configuring Google with Helicone observability');
        // Note: Helicone support for Google might need different configuration
        googleConfig.headers = heliconeHeaders;
      }
      
      console.log(`🔧 [Chat Handler] Creating Google provider with config:`, {
        apiKeyPrefix: apiKey.substring(0, 10) + '...',
        model: effectiveModel,
        hasHeliconeHeaders: !!heliconeHeaders
      });
      
      try {
        llmProvider = createGoogleGenerativeAI(googleConfig);
        console.log(`✅ [Chat Handler] Google provider created successfully`);
      } catch (error) {
        console.error(`❌ [Chat Handler] Failed to create Google provider:`, error);
        return new Response(JSON.stringify({ 
          error: `Failed to create Google provider: ${error instanceof Error ? error.message : String(error)}` 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      console.log(`Using Google provider with model: ${effectiveModel} (UI selection was: ${model || 'not specified'})${heliconeHeaders ? ' (with Helicone)' : ''}`);
    } else if (provider === 'qwen') {
      effectiveModel = model || DEFAULT_MODELS.qwen;

      // Validate API key for Qwen (should be a DashScope API key)
      if (!apiKey || apiKey.trim() === '') {
        console.error(`❌ [Chat Handler] Qwen API key is missing or empty`);
        return new Response(JSON.stringify({ 
          error: 'Qwen API key is required. Please check your Qwen API key in settings.' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Create the Qwen provider with the specified base URL
      const qwenConfig: any = {
        apiKey,
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        fetch: createResilientFetch({
          label: 'ChatHandler:Qwen',
          maxAttempts: NETWORK_RETRY_ATTEMPTS,
          baseDelayMs: NETWORK_RETRY_BASE_DELAY_MS,
        }),
      };
      
      if (heliconeHeaders && heliconeHeaders['Helicone-Auth']) {
        console.log('🔍 [Chat Handler] Configuring Qwen with Helicone observability');
        // Note: Helicone support for Qwen might need different configuration
        qwenConfig.headers = heliconeHeaders;
      }
      
      console.log(`🔧 [Chat Handler] Creating Qwen provider with config:`, {
        apiKeyPrefix: apiKey.substring(0, 10) + '...',
        model: effectiveModel,
        baseURL: qwenConfig.baseURL,
        hasHeliconeHeaders: !!heliconeHeaders
      });
      
      try {
        llmProvider = createQwen(qwenConfig);
        console.log(`✅ [Chat Handler] Qwen provider created successfully`);
      } catch (error) {
        console.error(`❌ [Chat Handler] Failed to create Qwen provider:`, error);
        return new Response(JSON.stringify({ 
          error: `Failed to create Qwen provider: ${error instanceof Error ? error.message : String(error)}` 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      console.log(`Using Qwen provider with model: ${effectiveModel} (UI selection was: ${model || 'not specified'})${heliconeHeaders ? ' (with Helicone)' : ''}`);
    } else if (provider === 'ollama') {
      console.log(`🔧 [Chat Handler] Processing Ollama request:`, {
        requestedModel: model,
        baseURL: baseURL,
        hasApiKey: !!apiKey,
        defaultModel: DEFAULT_MODELS.ollama
      });
      
      // Use the requested model if provided, otherwise use the default
      let selectedModel = model;
      if (!selectedModel || selectedModel.trim() === '') {
        console.log(`⚠️ [Chat Handler] No Ollama model specified. Using default.`);
        selectedModel = DEFAULT_MODELS.ollama;
      }
      
      effectiveModel = selectedModel;
      
      // Use baseURL from parameter or default Ollama baseURL
      const ollamaBaseURL = baseURL || 'http://localhost:11434/api';
      
      // Create a simple fetch function for Ollama with proper headers
      const ollamaFetch = async (input: string | URL | Request, options: RequestInit = {}): Promise<Response> => {
        // Add required headers for Ollama
        const defaultHeaders = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Chrome-Extension'
        };
        
        // Merge with existing headers
        options.headers = {
          ...defaultHeaders,
          ...options.headers
        };
        
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        console.log(`🔄 [Ollama Fetch] Making request to: ${url} (${options.method || 'GET'})`);
        
        try {
          const response = await fetch(input, options);
          if (!response.ok) {
            console.error(`❌ [Ollama Fetch] Error: ${response.status} ${response.statusText}`);
          }
          return response;
        } catch (error) {
          console.error(`❌ [Ollama Fetch] Network error:`, error);
          throw error;
        }
      };

      const resilientOllamaFetch = createResilientFetch({
        label: 'ChatHandler:Ollama',
        fetchImpl: ollamaFetch,
        maxAttempts: NETWORK_RETRY_ATTEMPTS,
        baseDelayMs: NETWORK_RETRY_BASE_DELAY_MS,
      });
      
      // Create the Ollama provider with the specified base URL
      const ollamaConfig: any = {
        baseURL: ollamaBaseURL,
        // Use our custom fetch for Ollama requests
        fetch: resilientOllamaFetch
      };
      
      // Add the API key only if it exists and is not empty
      if (apiKey && apiKey.trim() !== '') {
        console.log('🔧 [Chat Handler] Adding API key to Ollama config');
        ollamaConfig.apiKey = apiKey;
      } else {
        console.log('🔧 [Chat Handler] No API key provided for Ollama (expected for local instances)');
      }
      
      if (heliconeHeaders && heliconeHeaders['Helicone-Auth']) {
        console.log('🔍 [Chat Handler] Configuring Ollama with Helicone observability');
        ollamaConfig.headers = heliconeHeaders;
      }
      
      console.log(`🔧 [Chat Handler] Creating Ollama provider with config:`, {
        model: effectiveModel,
        baseURL: ollamaBaseURL,
        hasApiKey: !!ollamaConfig.apiKey,
        hasHeliconeHeaders: !!heliconeHeaders
      });
      
      try {
        llmProvider = createOllama(ollamaConfig);
        console.log(`✅ [Chat Handler] Ollama provider created successfully`);
      } catch (error) {
        console.error(`❌ [Chat Handler] Failed to create Ollama provider:`, error);
        return new Response(JSON.stringify({ 
          error: `Failed to create Ollama provider: ${error instanceof Error ? error.message : String(error)}` 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      console.log(`Using Ollama provider with model: ${effectiveModel} at ${ollamaBaseURL} (UI selection was: ${model || 'not specified'})${heliconeHeaders ? ' (with Helicone)' : ''}`);
    } else if (provider.startsWith('custom:')) {
      // Handle custom OpenAI Compatible providers
      const configId = provider.replace('custom:', '');
      console.log(`🔧 [Chat Handler] Processing custom provider request: ${configId}`);

      try {
        // Load custom provider config from storage
        const storageResult = await chrome.storage.sync.get([OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY]);
        const configs: OpenAICompatibleConfig[] = storageResult[OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY] || [];
        const customConfig = configs.find(c => c.id === configId);

        if (!customConfig) {
          console.error(`❌ [Chat Handler] Custom provider config not found: ${configId}`);
          return new Response(JSON.stringify({
            error: 'Custom provider configuration not found',
            message: 'The selected custom provider no longer exists. Please check your settings.'
          }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (!customConfig.enabled) {
          console.error(`❌ [Chat Handler] Custom provider is disabled: ${customConfig.name}`);
          return new Response(JSON.stringify({
            error: 'Custom provider is disabled',
            message: `The provider "${customConfig.name}" is currently disabled. Please enable it in settings.`
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        console.log(`✅ [Chat Handler] Found custom provider config: ${customConfig.name}`);

        // Use the custom provider's configuration
        const customOpenAIConfig: any = {
          apiKey: customConfig.apiKey,
          baseURL: customConfig.baseURL,
          fetch: createResilientFetch({
            label: `ChatHandler:Custom:${customConfig.name}`,
            maxAttempts: NETWORK_RETRY_ATTEMPTS,
            baseDelayMs: NETWORK_RETRY_BASE_DELAY_MS,
          })
        };

        // Add Helicone headers if provided
        if (heliconeHeaders && heliconeHeaders['Helicone-Auth']) {
          console.log(`🔍 [Chat Handler] Configuring custom provider "${customConfig.name}" with Helicone observability`);
          customOpenAIConfig.headers = heliconeHeaders;
        }

        llmProvider = createOpenAI(customOpenAIConfig);
        effectiveModel = model || customConfig.modelName;

        console.log(`✅ [Chat Handler] Using custom provider "${customConfig.name}" with model: ${effectiveModel} at ${customConfig.baseURL}${heliconeHeaders ? ' (with Helicone)' : ''}`);
      } catch (error) {
        console.error(`❌ [Chat Handler] Error loading custom provider config:`, error);
        return new Response(JSON.stringify({
          error: 'Failed to load custom provider configuration',
          message: error instanceof Error ? error.message : String(error)
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported API provider' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Message mapping that supports both string content and multi-modal content with parts
    const formattedMessages: ModelMessage[] = messages
      .map((msg): ModelMessage | null => {
        // Handle messages with simple string content
        if ((msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system') && 
            typeof msg.content === 'string') {
          return { role: msg.role, content: msg.content };
        }
        // Handle messages with parts (multi-modal content)
        else if ((msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system') && 
                 msg.parts && Array.isArray(msg.parts)) {
          
          // Log that we're processing a multi-modal message
          console.log('Processing multi-modal message with parts:', msg.parts.length);
          console.log('Multi-modal message parts types:', msg.parts.map(p => p.type).join(', '));
          
          // Build an array of properly-typed parts
          const formattedParts: (TextPart | ImagePart)[] = [];
          
          for (const part of msg.parts) {
            if (part.type === 'text' && part.text) {
              console.log('Processing text part:', part.text.substring(0, 50) + (part.text.length > 50 ? '...' : ''));
              formattedParts.push({ type: 'text', text: part.text } as TextPart);
            } else if (part.type === 'file' && part.mimeType?.startsWith('image/') && part.data) {
              console.log('Processing image attachment in message', {
                mimeType: part.mimeType,
                dataLength: part.data.length,
                dataPrefix: part.data.substring(0, 30) + '...'
              });
              
              // Ensure data URL format is correct (should start with data:image/...)
              let imageData = part.data;
              if (!imageData.startsWith('data:')) {
                imageData = `data:${part.mimeType || 'image/png'};base64,${part.data}`;
                console.log('Added proper data URL prefix to image');
              }
              
              formattedParts.push({ 
                type: 'image', 
                image: imageData,
                mimeType: part.mimeType 
              } as ImagePart);
            }
          }
          
          // Only return if we have valid parts
          if (formattedParts.length > 0) {
            console.log(`Created formatted message with ${formattedParts.length} parts:`, 
              formattedParts.map(p => p.type).join(', '));
            return { role: msg.role, content: formattedParts as any };
          } else {
            console.warn('No valid parts found in multi-modal message');
          }
        }
        console.warn('Filtering out message with incompatible role/content:', msg);
        return null;
      })
      .filter((msg): msg is ModelMessage => msg !== null);

    // Build final system prompt by selecting mode-specific prompt and combining with project context
    const basePrompt = mode === 'ask' ? GEE_ASK_MODE_PROMPT : GEE_DO_MODE_PROMPT;
    let finalSystemPrompt = basePrompt;
    if (projectContext && projectContext.trim()) {
      finalSystemPrompt = `${basePrompt}

## Project-Specific Context

${projectContext}`;
      console.log(`📋 [Chat Handler] Using ${mode} mode system prompt with project context (${projectContext.length} chars)`);
      console.log(`📋 [Chat Handler] Full system prompt:\n${finalSystemPrompt}`);
    } else {
      console.log(`📋 [Chat Handler] Using ${mode} mode system prompt (no project context)`);
    }

    if (profile?.prompt && profile.prompt.trim()) {
      finalSystemPrompt = `${finalSystemPrompt}

## Profile Instructions

${profile.prompt.trim()}`;
      console.log(`📋 [Chat Handler] Applied profile prompt (${profile.prompt.trim().length} chars)`);
    }

    // Add sequential tool execution instruction for providers without native support
    // OpenAI and Anthropic have native providerOptions, others need prompt-based control
    if (SEQUENTIAL_TOOL_EXECUTION) {
      if (['openai', 'anthropic'].includes(provider)) {
        console.log(`📋 [Chat Handler] Sequential tool execution enabled for ${provider} (native providerOptions)`);
      } else {
        finalSystemPrompt = `${finalSystemPrompt}

## Tool Execution Rules

IMPORTANT: Execute tools ONE AT A TIME. After calling a tool, wait for its result before calling the next tool. Do not call multiple tools in parallel.`;
        console.log(`📋 [Chat Handler] Sequential tool execution enabled for ${provider} (prompt fallback)`);
      }
    } else {
      console.log(`📋 [Chat Handler] Parallel tool execution enabled (SEQUENTIAL_TOOL_EXECUTION = false)`);
    }

    // Configure stream options based on provider
    // Create a shared error container that can be accessed from both onError and the stream
    let streamError: { message: string } | null = null;

    let streamOptions: any = {
      model: llmProvider(effectiveModel),
      // Temporarily remove system prompt for Ollama to match curl format
      ...(provider !== 'ollama' && { system: finalSystemPrompt }),
      messages: formattedMessages,
      temperature: 0.7,
      maxRetries: 3,
      // Provider-specific options for sequential tool execution
      providerOptions: {
        // OpenAI: parallelToolCalls = false means sequential
        openai: { parallelToolCalls: !SEQUENTIAL_TOOL_EXECUTION },
        // Anthropic: disableParallelToolUse = true means sequential
        anthropic: { disableParallelToolUse: SEQUENTIAL_TOOL_EXECUTION },
      },
      // Add onError callback to capture streaming errors and store them
      onError: ({ error }: { error: any }) => {
        console.error(`❌ [Chat Handler] Streaming error occurred for ${provider} provider:`, error);
        console.error(`❌ [Chat Handler] Error type: ${error?.name}`);
        console.error(`❌ [Chat Handler] Error message: ${error?.message}`);

        // Store the error so we can include it in the response
        streamError = {
          message: error?.message || String(error)
        };

        if (error?.cause) {
          console.error(`❌ [Chat Handler] Error cause:`, error.cause);
        }
        if (error?.stack) {
          console.error(`❌ [Chat Handler] Error stack:`, error.stack);
        }

        // Log specific information based on error type
        if (error?.message?.includes('fetch')) {
          console.error(`❌ [Chat Handler] Network fetch error detected. Possible causes:`);
          console.error(`   1. Invalid API key`);
          console.error(`   2. Network connectivity issues`);
          console.error(`   3. API endpoint unreachable`);
          console.error(`   4. CORS issues (unlikely for OpenAI)`);
        }
      },
      // Add callbacks to track tool execution for debugging
      onStepStart: ({ toolCalls }: { toolCalls?: any[] }) => {
        if (toolCalls && toolCalls.length > 0) {
          toolCalls.forEach((toolCall: any) => {
            console.log(`🛠️ [Tool Start] ${toolCall.toolName}`, {
              args: toolCall.args
            });
          });
        }
      },
      onStepFinish: ({ toolCalls, toolResults }: { toolCalls?: any[], toolResults?: any[] }) => {
        if (toolCalls && toolCalls.length > 0) {
          toolCalls.forEach((toolCall: any, index: number) => {
            const result = toolResults?.[index];
            console.log(`✅ [Tool Finish] ${toolCall.toolName}`, {
              success: result ? 'completed' : 'no result',
              resultPreview: result ? (typeof result === 'string' ? result.substring(0, 100) : JSON.stringify(result).substring(0, 100)) : 'none'
            });
          });
        }
      },
    };

    // Create all AI tools with event callback
    const {
      // Utility tools
      weatherTool,
      dateTimeTool,
      // Simplified code editing tools (Claude Code-style)
      readCodeTool,
      editCodeTool,
      insertAtLineTool,
      undoEditTool,
      // Earth Engine tools
      earthEngineDatasetTool,
      runCurrentCodeTool,
      // Browser interaction tools
      screenshotTool,
      snapshotTool,
      clickByRefIdTool,
      clickByCoordinatesTool,
      // Earth Engine state tools
      resetMapInspectorConsoleTool,
      getConsoleOutputTool,
      getScriptTool,
      getMapInfoTool,
      getInspectorOutputTool
    } = createAITools(onToolEvent);

    // Read-only tools for "ask" mode
    const readOnlyTools = {
      weather: weatherTool,
      dateTime: dateTimeTool,
      readCode: readCodeTool,  // Can read code (no modifications)
      earthEngineDataset: earthEngineDatasetTool,
      screenshot: screenshotTool,
      snapshot: snapshotTool,
      clickByRefId: clickByRefIdTool,
      clickByCoordinates: clickByCoordinatesTool,
      getConsoleOutput: getConsoleOutputTool,
      getScript: getScriptTool,
      getMapInfo: getMapInfoTool,
      getInspectorOutput: getInspectorOutputTool,
    };

    // Write tools for "do" mode (includes all read-only tools plus these)
    const writeTools = {
      editCode: editCodeTool,
      insertAtLine: insertAtLineTool,
      undoEdit: undoEditTool,
      runCurrentCode: runCurrentCodeTool,
      resetMapInspectorConsole: resetMapInspectorConsoleTool
    };

    // Determine which tools to use based on mode
    const toolsToUse = mode === 'ask' ? readOnlyTools : { ...readOnlyTools, ...writeTools };
    const allowedTools = profile?.tools?.length ? new Set(profile.tools) : null;
    const effectiveToolsToUse = allowedTools
      ? Object.fromEntries(Object.entries(toolsToUse).filter(([key]) => allowedTools.has(key)))
      : toolsToUse;

    console.log(
      `🛠️ [Chat Handler] Adding tools for ${provider} provider in ${mode} mode (${Object.keys(effectiveToolsToUse).length} tools)` +
        (allowedTools ? ` [filtered by profile allowlist: ${allowedTools.size}]` : '')
    );
    streamOptions.tools = effectiveToolsToUse;
    streamOptions.toolChoice = 'auto';
    streamOptions.stopWhen = stepCountIs(12); // Stop after 12 steps
    
    // For Anthropic models, add special headers for browser usage
    if (provider === 'anthropic') {
      console.log(`🔧 [Chat Handler] Adding special headers for Anthropic browser usage`);
      streamOptions.headers = {
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      };
      // Note: In AI SDK 5.0, multi-modal tool results (images) are automatically
      // supported for both Anthropic and OpenAI when using toModelOutput
    }
    
    // For Google provider, add specific logging and validation
    if (provider === 'google') {
      console.log(`🔧 [Chat Handler] Using Google provider with API key length: ${apiKey.length}`);
      console.log(`🔧 [Chat Handler] Google model being used: ${effectiveModel}`);
    }
    
    // For Ollama provider, add specific logging (now using normal AI SDK flow)
    if (provider === 'ollama') {
      console.log(`🔧 [Chat Handler] Using Ollama provider with model: ${effectiveModel}`);
      console.log(`🔧 [Chat Handler] Ollama base URL: ${baseURL || 'http://localhost:11434/api'}`);
    }
      

    
    console.log(`📊 [Chat Handler] Final stream configuration:`, JSON.stringify(streamOptions, (k, v) => 
      k === 'messages' ? '[Messages array]' : (k === 'tools' ? '[Tools object]' : v), 2));
    
    try {
      // Update callbacks to call onToolEvent if provided
      if (onToolEvent) {
        console.log('🔧 [Chat Handler] onToolEvent callback is provided, setting up step callbacks');

        // Track tool start times for duration calculation
        const toolStartTimes = new Map<string, number>();

        // Note: tool_start events are sent manually by each tool's execute function
        // This ensures they're sent before the tool actually starts executing
        streamOptions.onStepStart = ({ toolCalls }: { toolCalls?: any[] }) => {
          console.log('🔧 [Chat Handler] ========== onStepStart CALLED ==========');
          console.log('🔧 [Chat Handler] Timestamp:', new Date().toISOString());
          console.log('🔧 [Chat Handler] Number of tool calls:', toolCalls?.length || 0);
          console.log('🔧 [Chat Handler] toolCalls:', JSON.stringify(toolCalls, null, 2));

          // Record start times for each tool
          if (toolCalls && toolCalls.length > 0) {
            toolCalls.forEach((toolCall: any, index: number) => {
              const toolId = toolCall.toolCallId || `${toolCall.toolName}_${index}`;
              toolStartTimes.set(toolId, Date.now());

              console.log(`🛠️ [Tool Start][${index + 1}/${toolCalls.length}] ${toolCall.toolName}`);
              console.log(`   - Tool ID: ${toolId}`);
              console.log(`   - Args:`, toolCall.args);

              // Special logging for code execution tools
              if (toolCall.toolName === 'editCode') {
                const code = toolCall.args?.code || '';
                console.log(`   - Code length: ${code.length} characters`);
                console.log(`   - Code preview: ${code.substring(0, 100)}...`);
              }
            });
          }
          console.log('🔧 [Chat Handler] ========== onStepStart END ==========');
        };

        streamOptions.onStepFinish = ({ toolCalls, toolResults }: { toolCalls?: any[], toolResults?: any[] }) => {
          console.log('🔧 [Chat Handler] ========== onStepFinish CALLED ==========');
          console.log('🔧 [Chat Handler] Timestamp:', new Date().toISOString());
          console.log('🔧 [Chat Handler] Number of tool calls:', toolCalls?.length || 0);
          console.log('🔧 [Chat Handler] Number of tool results:', toolResults?.length || 0);

          if (toolCalls && toolCalls.length > 0) {
            toolCalls.forEach((toolCall: any, index: number) => {
              const result = toolResults?.[index];

              console.log(`✅ [Tool Finish][${index + 1}/${toolCalls.length}] ${toolCall.toolName}`);
              console.log(`   - Tool ID: ${toolCall.toolCallId || 'N/A'}`);
              console.log(`   - Result status: ${result ? 'completed' : 'no result'}`);

              if (result) {
                console.log(`   - Result type: ${typeof result}`);
                const resultPreview = typeof result === 'string'
                  ? result.substring(0, 100)
                  : JSON.stringify(result).substring(0, 100);
                console.log(`   - Result preview: ${resultPreview}...`);

                // Special logging for code execution results
                if (result.executionId) {
                  console.log(`   - Execution ID: ${result.executionId}`);
                }
                if (result.success !== undefined) {
                  console.log(`   - Success: ${result.success}`);
                }
              }

              // Pass the full result object for tools that have structured data (like diff)
              // The Vercel AI SDK wraps results in { type: 'tool-result', result: <actual-result> }
              // We need to extract the actual result from the wrapper
              let eventResult: any;
              console.log(`   - Raw result type: ${typeof result}`);
              console.log(`   - Raw result keys: ${result ? Object.keys(result).join(', ') : 'null'}`);
              console.log(`   - Raw result:`, JSON.stringify(result, null, 2)?.substring(0, 500));

              if (!result) {
                eventResult = undefined;
              } else if (typeof result === 'string') {
                eventResult = result.substring(0, 500);
              } else if (typeof result === 'object') {
                // Check if this is a Vercel AI SDK wrapper object
                // The actual tool result is in result.output (not result.result!)
                const actualResult = result.output !== undefined ? result.output :
                                     result.result !== undefined ? result.result : result;
                console.log(`   - Extracted result keys: ${actualResult ? Object.keys(actualResult).join(', ') : 'null'}`);
                console.log(`   - Extracted result has diff: ${!!(actualResult?.diff)}`);
                console.log(`   - Extracted result:`, JSON.stringify(actualResult, null, 2)?.substring(0, 500));
                eventResult = actualResult;
              } else {
                eventResult = 'completed';
              }

              // Calculate duration from start time
              const toolId = toolCall.toolCallId || `${toolCall.toolName}_${index}`;
              const startTime = toolStartTimes.get(toolId);
              const duration = startTime ? Date.now() - startTime : undefined;

              const event = {
                type: 'tool_finish' as const,
                toolName: toolCall.toolName,
                args: toolCall.args,
                result: eventResult,
                duration,  // Add duration in milliseconds
                timestamp: Date.now()
              };
              console.log(`🔧 [Chat Handler] Calling onToolEvent with tool_finish (duration: ${duration}ms)`);
              onToolEvent(event);
            });
          } else {
            console.log('🔧 [Chat Handler] onStepFinish called but no toolCalls found');
          }
          console.log('🔧 [Chat Handler] ========== onStepFinish END ==========');
        };
      } else {
        console.log('🔧 [Chat Handler] onToolEvent callback is NOT provided');
      }

      // Estimate token usage before making the API call
      const systemPrompt = streamOptions.system as string || '';
      const toolCount = Object.keys(toolsToUse).length;
      const tokenEstimate = estimatePromptTokens(systemPrompt, messages, toolCount);

      console.log(`📊 [Chat Handler] Token estimate before API call:`, {
        systemTokens: tokenEstimate.systemTokens,
        toolTokens: tokenEstimate.toolTokens,
        messageTokens: tokenEstimate.messageTokens,
        totalEstimated: tokenEstimate.totalTokens
      });

      // Check token estimate against model limit
      const modelLimit = getModelContextLimit(effectiveModel);
      const estimatedPercentage = (tokenEstimate.totalTokens / modelLimit) * 100;

      // Warn if approaching or exceeding limit (but still allow the request)
      if (estimatedPercentage >= 100) {
        console.error(`🚨 [Chat Handler] Token estimate (${tokenEstimate.totalTokens}) exceeds model limit (${modelLimit})! Request may fail.`);
      } else if (estimatedPercentage >= 90) {
        console.warn(`⚠️ [Chat Handler] Token estimate (${tokenEstimate.totalTokens}) is ${estimatedPercentage.toFixed(1)}% of model limit (${modelLimit})`);
      }

      // Use streamText for AI generation with tools
      // streamText returns the result object synchronously. The async work happens when the stream is consumed.
      const result = streamText(streamOptions);

      console.timeEnd('streamText execution');
      console.log(`✅ [Chat Handler] Completed streamText call. Converting to text stream response.`);

      // Create a custom stream that wraps the AI SDK stream and catches errors
      const encoder = new TextEncoder();
      const customErrorHandlingStream = new ReadableStream({
        async start(controller) {
          try {
            // Send token estimate as the first chunk
            const estimateChunk = encoder.encode(`data: ${JSON.stringify({
              type: 'token_estimate',
              estimate: {
                promptTokens: tokenEstimate.totalTokens,
                systemTokens: tokenEstimate.systemTokens,
                toolTokens: tokenEstimate.toolTokens,
                messageTokens: tokenEstimate.messageTokens
              }
            })}\n\n`);
            controller.enqueue(estimateChunk);
            // Get the original text stream
            const originalStream = result.toTextStreamResponse().body;
            if (!originalStream) {
              throw new Error('No response body from toTextStreamResponse');
            }

            const reader = originalStream.getReader();
            const decoder = new TextDecoder();

            // Read from the original stream
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                // Before closing, send token usage information
                try {
                  const usage = await result.usage;
                  if (usage) {
                    console.log(`📊 [Chat Handler] Token usage:`, usage);
                    const usageChunk = encoder.encode(`data: ${JSON.stringify({
                      type: 'token_usage',
                      usage: {
                        promptTokens: usage.inputTokens || 0,
                        completionTokens: usage.outputTokens || 0,
                        totalTokens: (usage.inputTokens || 0) + (usage.outputTokens || 0)
                      }
                    })}\n\n`);
                    controller.enqueue(usageChunk);
                  }
                } catch (usageError) {
                  console.warn(`⚠️ [Chat Handler] Could not get token usage:`, usageError);
                }

                // Check if there was an error captured by onError
                if (streamError) {
                  console.log(`❌ [Chat Handler] Sending captured error to frontend:`, streamError.message);
                  const errorChunk = encoder.encode(`error:${JSON.stringify({ error: streamError.message })}\n`);
                  controller.enqueue(errorChunk);
                }
                controller.close();
                break;
              }

              // Forward the chunk
              controller.enqueue(value);
            }
          } catch (error: any) {
            // If an error occurs during streaming, send it to the frontend
            console.error(`❌ [Chat Handler] Stream error caught:`, error);

            // Create an error message in the stream format
            const errorMessage = error?.message || String(error);
            const errorChunk = encoder.encode(`error:${JSON.stringify({ error: errorMessage })}\n`);
            controller.enqueue(errorChunk);
            controller.close();
          }
        }
      });

      return new Response(customErrorHandlingStream, {
        headers: result.toTextStreamResponse().headers
      });
    } catch (streamError: any) {
      console.timeEnd('streamText execution');
      // This block will catch errors during the *initial setup* of the stream,
      // but not errors that occur *during* the streaming process itself.
      // Those are handled by the `onError` callback.
      console.error(`❌ [Chat Handler] streamText setup error for ${provider} provider:`, streamError);
      
      // Additional logging for Google provider errors
      if (provider === 'google') {
        console.error(`❌ [Google Provider] Detailed error information:`);
        console.error(`  - Model: ${effectiveModel}`);
        console.error(`  - API Key length: ${apiKey.length}`);
        console.error(`  - Error name: ${streamError.name}`);
        console.error(`  - Error message: ${streamError.message}`);
        console.error(`  - Error stack: ${streamError.stack}`);
        
        if (streamError.cause) {
          console.error(`  - Error cause:`, streamError.cause);
        }
        
        // Check for specific Google API errors
        if (streamError.message?.includes('API key')) {
          console.error(`❌ [Google Provider] API key related error detected`);
        }
        if (streamError.message?.includes('model')) {
          console.error(`❌ [Google Provider] Model related error detected`);
        }
        if (streamError.message?.includes('quota') || streamError.message?.includes('billing')) {
          console.error(`❌ [Google Provider] Quota/billing related error detected`);
        }
      }
      
      return new Response(JSON.stringify({ 
        error: 'Chat processing failed',
        message: streamError instanceof Error ? streamError.message : 'Unknown error occurred',
        provider: provider,
        model: effectiveModel
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error: any) {
    console.error('Chat handler general error:', error);
    return new Response(JSON.stringify({ 
      error: 'Chat processing failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
