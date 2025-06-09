# Model Selection for Earth Engine Agent

## Overview

The Earth Engine Agent now supports selecting different AI models for OpenAI, Anthropic, and Google providers. This feature allows users to choose the most appropriate model for their needs, balancing capability, speed, and cost considerations.

## Accessing Model Selection

1. Click the **Settings** button in the chat interface
2. Select your preferred **API Provider** (OpenAI, Anthropic, or Google)
3. Choose a specific **Model** from the dropdown menu
4. Enter your API key for the selected provider
5. Click **Save** to apply your changes

## Available Models

### OpenAI Models

| Model | Description | Best For |
|-------|-------------|----------|
| **gpt-4.5-preview** | Latest model with advanced capabilities | State-of-the-art performance for complex tasks |
| **o4-mini** | Latest fast model with excellent reasoning | Fast performance with high-quality responses |
| **gpt-4.1** | Improved version with enhanced reasoning | High-quality analysis and complex problem-solving |
| **gpt-4.1-mini** | Lighter version of GPT-4.1 | Faster responses with good accuracy |
| **gpt-4o** | Powerful general-purpose model | Excellent overall performance and capabilities |
| **gpt-4o-mini** | Faster version of GPT-4o | Quick responses with good quality |
| **gpt-4-turbo** | Enhanced GPT-4 model | Complex reasoning at moderate cost |
| **gpt-4** | Original GPT-4 | Stable, well-tested performance |
| **gpt-3.5-turbo** | Most cost-effective option | Simple queries, faster responses, lower cost |

*Note: Date-specific model versions (like gpt-4o-2024-05-13) are also available in the extension settings for users who need specific model versions.*

### Anthropic Models

| Model | Description | Best For |
|-------|-------------|----------|
| **claude-opus-4-20250514** | Next-generation Claude model | Most complex geospatial analysis, cutting-edge research |
| **claude-sonnet-4-20250514** | Advanced balanced model | Best overall performance for Earth Engine tasks |
| **claude-3-opus-20240229** | Most capable Claude 3 model | Complex geospatial analysis, detailed explanations |
| **claude-3-sonnet-20240229** | Balanced capability & speed | General Earth Engine tasks with good performance |
| **claude-3-haiku-20240307** | Fastest Claude option | Quick responses, basic queries, lower cost |
| **claude-3.5-sonnet-20240620** | Enhanced Claude 3.5 | Improved capabilities with good performance |
| **claude-3.7-sonnet-20240808** | Latest Claude 3 model | Best overall Claude 3 performance |

### Google Models

| Model | Description | Best For |
|-------|-------------|----------|
| **gemini-2.5-pro-preview** | Latest Gemini model with experimental features | Cutting-edge research, experimental workflows |
| **gemini-2.5-flash-preview** | Fast Gemini 2.5 with advanced capabilities | Quick analysis with high quality |
| **gemini-2.5-pro-exp** | Experimental Gemini with enhanced reasoning | Complex Earth Engine analysis |
| **gemini-2.0-flash** | Balanced performance and speed | General Earth Engine tasks |
| **gemini-1.5-pro** | Long context, strong reasoning | Large dataset analysis, extensive code |
| **gemini-1.5-pro-latest** | Latest version of Gemini 1.5 Pro | Most recent improvements to Gemini 1.5 |
| **gemini-1.5-flash** | Fast processing, cost-effective | Quick responses, routine tasks |
| **gemini-1.5-flash-latest** | Latest version of Gemini 1.5 Flash | Most recent improvements to Flash |
| **gemini-1.5-flash-8b** | Lightweight, very fast | Simple queries, rapid prototyping |
| **gemini-1.5-flash-8b-latest** | Latest 8B model | Fastest responses for basic tasks |

## Considerations

### Performance vs. Cost

- Most powerful models (Claude-Opus-4, GPT-4.5-preview, Claude-Sonnet-4, GPT-4.1) provide superior code generation and explanations but at higher cost
- Faster models (O4-mini, GPT-4o-mini, GPT-3.5-Turbo, Claude-3-Haiku) offer quicker responses at lower cost with varying quality levels
- Balanced models (Claude-Sonnet-4, GPT-4o, GPT-4-turbo, Claude-3-Sonnet) provide a good middle ground between performance and cost

### API Pricing

Remember that different models have different pricing structures:

- OpenAI charges based on input and output tokens
- Anthropic charges based on input and output tokens with different rates for each model
- Google charges based on input and output tokens with competitive pricing for Gemini models
- Check the respective provider's pricing pages for current rates

## Technical Details

The selected model is stored in Chrome's synced storage and persists across browser sessions. When you change providers, the system automatically selects the default model for that provider.

The model selection affects all interactions with the Earth Engine Agent, including:
- Code generation
- Explanations
- Tool usage
- Troubleshooting

## Troubleshooting

If you encounter issues with a specific model:

1. **API Key Errors**: Ensure your API key has access to the selected model
2. **Model Availability**: Some models may be deprecated or replaced over time
3. **Quota Limits**: Check if you've reached usage limits for the selected model
4. **Response Quality**: Try a more capable model for complex Earth Engine tasks
5. **Version-Specific Issues**: If a model version is problematic, try a different date version of the same model
6. **Tier Access**: Some models may require a higher API tier or specific permissions

For persistent issues, try reverting to the default model (GPT-4o for OpenAI, Claude-3-Haiku for Anthropic, or Gemini-1.5-Pro-Latest for Google).