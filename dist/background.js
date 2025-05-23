/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/@ai-sdk/anthropic/dist/index.mjs":
/*!*******************************************************!*\
  !*** ./node_modules/@ai-sdk/anthropic/dist/index.mjs ***!
  \*******************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   anthropic: () => (/* binding */ anthropic),
/* harmony export */   createAnthropic: () => (/* binding */ createAnthropic)
/* harmony export */ });
/* harmony import */ var _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @ai-sdk/provider */ "./node_modules/@ai-sdk/provider/dist/index.mjs");
/* harmony import */ var _ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @ai-sdk/provider-utils */ "./node_modules/@ai-sdk/provider-utils/dist/index.mjs");
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "./node_modules/zod/lib/index.mjs");
// src/anthropic-provider.ts



// src/anthropic-messages-language-model.ts




// src/anthropic-error.ts


var anthropicErrorDataSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
  type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("error"),
  error: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    type: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
    message: zod__WEBPACK_IMPORTED_MODULE_0__.z.string()
  })
});
var anthropicFailedResponseHandler = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_1__.createJsonErrorResponseHandler)({
  errorSchema: anthropicErrorDataSchema,
  errorToMessage: (data) => data.error.message
});

// src/anthropic-prepare-tools.ts

function prepareTools(mode) {
  var _a;
  const tools = ((_a = mode.tools) == null ? void 0 : _a.length) ? mode.tools : void 0;
  const toolWarnings = [];
  const betas = /* @__PURE__ */ new Set();
  if (tools == null) {
    return { tools: void 0, tool_choice: void 0, toolWarnings, betas };
  }
  const anthropicTools2 = [];
  for (const tool of tools) {
    switch (tool.type) {
      case "function":
        anthropicTools2.push({
          name: tool.name,
          description: tool.description,
          input_schema: tool.parameters
        });
        break;
      case "provider-defined":
        switch (tool.id) {
          case "anthropic.computer_20250124":
            betas.add("computer-use-2025-01-24");
            anthropicTools2.push({
              name: tool.name,
              type: "computer_20250124",
              display_width_px: tool.args.displayWidthPx,
              display_height_px: tool.args.displayHeightPx,
              display_number: tool.args.displayNumber
            });
            break;
          case "anthropic.computer_20241022":
            betas.add("computer-use-2024-10-22");
            anthropicTools2.push({
              name: tool.name,
              type: "computer_20241022",
              display_width_px: tool.args.displayWidthPx,
              display_height_px: tool.args.displayHeightPx,
              display_number: tool.args.displayNumber
            });
            break;
          case "anthropic.text_editor_20250124":
            betas.add("computer-use-2025-01-24");
            anthropicTools2.push({
              name: tool.name,
              type: "text_editor_20250124"
            });
            break;
          case "anthropic.text_editor_20241022":
            betas.add("computer-use-2024-10-22");
            anthropicTools2.push({
              name: tool.name,
              type: "text_editor_20241022"
            });
            break;
          case "anthropic.bash_20250124":
            betas.add("computer-use-2025-01-24");
            anthropicTools2.push({
              name: tool.name,
              type: "bash_20250124"
            });
            break;
          case "anthropic.bash_20241022":
            betas.add("computer-use-2024-10-22");
            anthropicTools2.push({
              name: tool.name,
              type: "bash_20241022"
            });
            break;
          default:
            toolWarnings.push({ type: "unsupported-tool", tool });
            break;
        }
        break;
      default:
        toolWarnings.push({ type: "unsupported-tool", tool });
        break;
    }
  }
  const toolChoice = mode.toolChoice;
  if (toolChoice == null) {
    return {
      tools: anthropicTools2,
      tool_choice: void 0,
      toolWarnings,
      betas
    };
  }
  const type = toolChoice.type;
  switch (type) {
    case "auto":
      return {
        tools: anthropicTools2,
        tool_choice: { type: "auto" },
        toolWarnings,
        betas
      };
    case "required":
      return {
        tools: anthropicTools2,
        tool_choice: { type: "any" },
        toolWarnings,
        betas
      };
    case "none":
      return { tools: void 0, tool_choice: void 0, toolWarnings, betas };
    case "tool":
      return {
        tools: anthropicTools2,
        tool_choice: { type: "tool", name: toolChoice.toolName },
        toolWarnings,
        betas
      };
    default: {
      const _exhaustiveCheck = type;
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_2__.UnsupportedFunctionalityError({
        functionality: `Unsupported tool choice type: ${_exhaustiveCheck}`
      });
    }
  }
}

// src/convert-to-anthropic-messages-prompt.ts


function convertToAnthropicMessagesPrompt({
  prompt,
  sendReasoning,
  warnings
}) {
  var _a, _b, _c, _d;
  const betas = /* @__PURE__ */ new Set();
  const blocks = groupIntoBlocks(prompt);
  let system = void 0;
  const messages = [];
  function getCacheControl(providerMetadata) {
    var _a2;
    const anthropic2 = providerMetadata == null ? void 0 : providerMetadata.anthropic;
    const cacheControlValue = (_a2 = anthropic2 == null ? void 0 : anthropic2.cacheControl) != null ? _a2 : anthropic2 == null ? void 0 : anthropic2.cache_control;
    return cacheControlValue;
  }
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const isLastBlock = i === blocks.length - 1;
    const type = block.type;
    switch (type) {
      case "system": {
        if (system != null) {
          throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_2__.UnsupportedFunctionalityError({
            functionality: "Multiple system messages that are separated by user/assistant messages"
          });
        }
        system = block.messages.map(({ content, providerMetadata }) => ({
          type: "text",
          text: content,
          cache_control: getCacheControl(providerMetadata)
        }));
        break;
      }
      case "user": {
        const anthropicContent = [];
        for (const message of block.messages) {
          const { role, content } = message;
          switch (role) {
            case "user": {
              for (let j = 0; j < content.length; j++) {
                const part = content[j];
                const isLastPart = j === content.length - 1;
                const cacheControl = (_a = getCacheControl(part.providerMetadata)) != null ? _a : isLastPart ? getCacheControl(message.providerMetadata) : void 0;
                switch (part.type) {
                  case "text": {
                    anthropicContent.push({
                      type: "text",
                      text: part.text,
                      cache_control: cacheControl
                    });
                    break;
                  }
                  case "image": {
                    anthropicContent.push({
                      type: "image",
                      source: part.image instanceof URL ? {
                        type: "url",
                        url: part.image.toString()
                      } : {
                        type: "base64",
                        media_type: (_b = part.mimeType) != null ? _b : "image/jpeg",
                        data: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_1__.convertUint8ArrayToBase64)(part.image)
                      },
                      cache_control: cacheControl
                    });
                    break;
                  }
                  case "file": {
                    if (part.mimeType !== "application/pdf") {
                      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_2__.UnsupportedFunctionalityError({
                        functionality: "Non-PDF files in user messages"
                      });
                    }
                    betas.add("pdfs-2024-09-25");
                    anthropicContent.push({
                      type: "document",
                      source: part.data instanceof URL ? {
                        type: "url",
                        url: part.data.toString()
                      } : {
                        type: "base64",
                        media_type: "application/pdf",
                        data: part.data
                      },
                      cache_control: cacheControl
                    });
                    break;
                  }
                }
              }
              break;
            }
            case "tool": {
              for (let i2 = 0; i2 < content.length; i2++) {
                const part = content[i2];
                const isLastPart = i2 === content.length - 1;
                const cacheControl = (_c = getCacheControl(part.providerMetadata)) != null ? _c : isLastPart ? getCacheControl(message.providerMetadata) : void 0;
                const toolResultContent = part.content != null ? part.content.map((part2) => {
                  var _a2;
                  switch (part2.type) {
                    case "text":
                      return {
                        type: "text",
                        text: part2.text,
                        cache_control: void 0
                      };
                    case "image":
                      return {
                        type: "image",
                        source: {
                          type: "base64",
                          media_type: (_a2 = part2.mimeType) != null ? _a2 : "image/jpeg",
                          data: part2.data
                        },
                        cache_control: void 0
                      };
                  }
                }) : JSON.stringify(part.result);
                anthropicContent.push({
                  type: "tool_result",
                  tool_use_id: part.toolCallId,
                  content: toolResultContent,
                  is_error: part.isError,
                  cache_control: cacheControl
                });
              }
              break;
            }
            default: {
              const _exhaustiveCheck = role;
              throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
            }
          }
        }
        messages.push({ role: "user", content: anthropicContent });
        break;
      }
      case "assistant": {
        const anthropicContent = [];
        for (let j = 0; j < block.messages.length; j++) {
          const message = block.messages[j];
          const isLastMessage = j === block.messages.length - 1;
          const { content } = message;
          for (let k = 0; k < content.length; k++) {
            const part = content[k];
            const isLastContentPart = k === content.length - 1;
            const cacheControl = (_d = getCacheControl(part.providerMetadata)) != null ? _d : isLastContentPart ? getCacheControl(message.providerMetadata) : void 0;
            switch (part.type) {
              case "text": {
                anthropicContent.push({
                  type: "text",
                  text: (
                    // trim the last text part if it's the last message in the block
                    // because Anthropic does not allow trailing whitespace
                    // in pre-filled assistant responses
                    isLastBlock && isLastMessage && isLastContentPart ? part.text.trim() : part.text
                  ),
                  cache_control: cacheControl
                });
                break;
              }
              case "reasoning": {
                if (sendReasoning) {
                  anthropicContent.push({
                    type: "thinking",
                    thinking: part.text,
                    signature: part.signature,
                    cache_control: cacheControl
                  });
                } else {
                  warnings.push({
                    type: "other",
                    message: "sending reasoning content is disabled for this model"
                  });
                }
                break;
              }
              case "redacted-reasoning": {
                anthropicContent.push({
                  type: "redacted_thinking",
                  data: part.data,
                  cache_control: cacheControl
                });
                break;
              }
              case "tool-call": {
                anthropicContent.push({
                  type: "tool_use",
                  id: part.toolCallId,
                  name: part.toolName,
                  input: part.args,
                  cache_control: cacheControl
                });
                break;
              }
            }
          }
        }
        messages.push({ role: "assistant", content: anthropicContent });
        break;
      }
      default: {
        const _exhaustiveCheck = type;
        throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
      }
    }
  }
  return {
    prompt: { system, messages },
    betas
  };
}
function groupIntoBlocks(prompt) {
  const blocks = [];
  let currentBlock = void 0;
  for (const message of prompt) {
    const { role } = message;
    switch (role) {
      case "system": {
        if ((currentBlock == null ? void 0 : currentBlock.type) !== "system") {
          currentBlock = { type: "system", messages: [] };
          blocks.push(currentBlock);
        }
        currentBlock.messages.push(message);
        break;
      }
      case "assistant": {
        if ((currentBlock == null ? void 0 : currentBlock.type) !== "assistant") {
          currentBlock = { type: "assistant", messages: [] };
          blocks.push(currentBlock);
        }
        currentBlock.messages.push(message);
        break;
      }
      case "user": {
        if ((currentBlock == null ? void 0 : currentBlock.type) !== "user") {
          currentBlock = { type: "user", messages: [] };
          blocks.push(currentBlock);
        }
        currentBlock.messages.push(message);
        break;
      }
      case "tool": {
        if ((currentBlock == null ? void 0 : currentBlock.type) !== "user") {
          currentBlock = { type: "user", messages: [] };
          blocks.push(currentBlock);
        }
        currentBlock.messages.push(message);
        break;
      }
      default: {
        const _exhaustiveCheck = role;
        throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
      }
    }
  }
  return blocks;
}

// src/map-anthropic-stop-reason.ts
function mapAnthropicStopReason(finishReason) {
  switch (finishReason) {
    case "end_turn":
    case "stop_sequence":
      return "stop";
    case "tool_use":
      return "tool-calls";
    case "max_tokens":
      return "length";
    default:
      return "unknown";
  }
}

// src/anthropic-messages-language-model.ts
var AnthropicMessagesLanguageModel = class {
  constructor(modelId, settings, config) {
    this.specificationVersion = "v1";
    this.defaultObjectGenerationMode = "tool";
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
  }
  supportsUrl(url) {
    return url.protocol === "https:";
  }
  get provider() {
    return this.config.provider;
  }
  get supportsImageUrls() {
    return this.config.supportsImageUrls;
  }
  async getArgs({
    mode,
    prompt,
    maxTokens = 4096,
    // 4096: max model output tokens TODO update default in v5
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    stopSequences,
    responseFormat,
    seed,
    providerMetadata: providerOptions
  }) {
    var _a, _b, _c;
    const type = mode.type;
    const warnings = [];
    if (frequencyPenalty != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "frequencyPenalty"
      });
    }
    if (presencePenalty != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "presencePenalty"
      });
    }
    if (seed != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "seed"
      });
    }
    if (responseFormat != null && responseFormat.type !== "text") {
      warnings.push({
        type: "unsupported-setting",
        setting: "responseFormat",
        details: "JSON response format is not supported."
      });
    }
    const { prompt: messagesPrompt, betas: messagesBetas } = convertToAnthropicMessagesPrompt({
      prompt,
      sendReasoning: (_a = this.settings.sendReasoning) != null ? _a : true,
      warnings
    });
    const anthropicOptions = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_1__.parseProviderOptions)({
      provider: "anthropic",
      providerOptions,
      schema: anthropicProviderOptionsSchema
    });
    const isThinking = ((_b = anthropicOptions == null ? void 0 : anthropicOptions.thinking) == null ? void 0 : _b.type) === "enabled";
    const thinkingBudget = (_c = anthropicOptions == null ? void 0 : anthropicOptions.thinking) == null ? void 0 : _c.budgetTokens;
    const baseArgs = {
      // model id:
      model: this.modelId,
      // standardized settings:
      max_tokens: maxTokens,
      temperature,
      top_k: topK,
      top_p: topP,
      stop_sequences: stopSequences,
      // provider specific settings:
      ...isThinking && {
        thinking: { type: "enabled", budget_tokens: thinkingBudget }
      },
      // prompt:
      system: messagesPrompt.system,
      messages: messagesPrompt.messages
    };
    if (isThinking) {
      if (thinkingBudget == null) {
        throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_2__.UnsupportedFunctionalityError({
          functionality: "thinking requires a budget"
        });
      }
      if (baseArgs.temperature != null) {
        baseArgs.temperature = void 0;
        warnings.push({
          type: "unsupported-setting",
          setting: "temperature",
          details: "temperature is not supported when thinking is enabled"
        });
      }
      if (topK != null) {
        baseArgs.top_k = void 0;
        warnings.push({
          type: "unsupported-setting",
          setting: "topK",
          details: "topK is not supported when thinking is enabled"
        });
      }
      if (topP != null) {
        baseArgs.top_p = void 0;
        warnings.push({
          type: "unsupported-setting",
          setting: "topP",
          details: "topP is not supported when thinking is enabled"
        });
      }
      baseArgs.max_tokens = maxTokens + thinkingBudget;
    }
    switch (type) {
      case "regular": {
        const {
          tools,
          tool_choice,
          toolWarnings,
          betas: toolsBetas
        } = prepareTools(mode);
        return {
          args: { ...baseArgs, tools, tool_choice },
          warnings: [...warnings, ...toolWarnings],
          betas: /* @__PURE__ */ new Set([...messagesBetas, ...toolsBetas])
        };
      }
      case "object-json": {
        throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_2__.UnsupportedFunctionalityError({
          functionality: "json-mode object generation"
        });
      }
      case "object-tool": {
        const { name, description, parameters } = mode.tool;
        return {
          args: {
            ...baseArgs,
            tools: [{ name, description, input_schema: parameters }],
            tool_choice: { type: "tool", name }
          },
          warnings,
          betas: messagesBetas
        };
      }
      default: {
        const _exhaustiveCheck = type;
        throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
      }
    }
  }
  async getHeaders({
    betas,
    headers
  }) {
    return (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_1__.combineHeaders)(
      await (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_1__.resolve)(this.config.headers),
      betas.size > 0 ? { "anthropic-beta": Array.from(betas).join(",") } : {},
      headers
    );
  }
  buildRequestUrl(isStreaming) {
    var _a, _b, _c;
    return (_c = (_b = (_a = this.config).buildRequestUrl) == null ? void 0 : _b.call(_a, this.config.baseURL, isStreaming)) != null ? _c : `${this.config.baseURL}/messages`;
  }
  transformRequestBody(args) {
    var _a, _b, _c;
    return (_c = (_b = (_a = this.config).transformRequestBody) == null ? void 0 : _b.call(_a, args)) != null ? _c : args;
  }
  async doGenerate(options) {
    var _a, _b, _c, _d;
    const { args, warnings, betas } = await this.getArgs(options);
    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse
    } = await (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_1__.postJsonToApi)({
      url: this.buildRequestUrl(false),
      headers: await this.getHeaders({ betas, headers: options.headers }),
      body: this.transformRequestBody(args),
      failedResponseHandler: anthropicFailedResponseHandler,
      successfulResponseHandler: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_1__.createJsonResponseHandler)(
        anthropicMessagesResponseSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const { messages: rawPrompt, ...rawSettings } = args;
    let text = "";
    for (const content of response.content) {
      if (content.type === "text") {
        text += content.text;
      }
    }
    let toolCalls = void 0;
    if (response.content.some((content) => content.type === "tool_use")) {
      toolCalls = [];
      for (const content of response.content) {
        if (content.type === "tool_use") {
          toolCalls.push({
            toolCallType: "function",
            toolCallId: content.id,
            toolName: content.name,
            args: JSON.stringify(content.input)
          });
        }
      }
    }
    const reasoning = response.content.filter(
      (content) => content.type === "redacted_thinking" || content.type === "thinking"
    ).map(
      (content) => content.type === "thinking" ? {
        type: "text",
        text: content.thinking,
        signature: content.signature
      } : {
        type: "redacted",
        data: content.data
      }
    );
    return {
      text,
      reasoning: reasoning.length > 0 ? reasoning : void 0,
      toolCalls,
      finishReason: mapAnthropicStopReason(response.stop_reason),
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens
      },
      rawCall: { rawPrompt, rawSettings },
      rawResponse: {
        headers: responseHeaders,
        body: rawResponse
      },
      response: {
        id: (_a = response.id) != null ? _a : void 0,
        modelId: (_b = response.model) != null ? _b : void 0
      },
      warnings,
      providerMetadata: {
        anthropic: {
          cacheCreationInputTokens: (_c = response.usage.cache_creation_input_tokens) != null ? _c : null,
          cacheReadInputTokens: (_d = response.usage.cache_read_input_tokens) != null ? _d : null
        }
      },
      request: { body: JSON.stringify(args) }
    };
  }
  async doStream(options) {
    const { args, warnings, betas } = await this.getArgs(options);
    const body = { ...args, stream: true };
    const { responseHeaders, value: response } = await (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_1__.postJsonToApi)({
      url: this.buildRequestUrl(true),
      headers: await this.getHeaders({ betas, headers: options.headers }),
      body: this.transformRequestBody(body),
      failedResponseHandler: anthropicFailedResponseHandler,
      successfulResponseHandler: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_1__.createEventSourceResponseHandler)(
        anthropicMessagesChunkSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const { messages: rawPrompt, ...rawSettings } = args;
    let finishReason = "unknown";
    const usage = {
      promptTokens: Number.NaN,
      completionTokens: Number.NaN
    };
    const toolCallContentBlocks = {};
    let providerMetadata = void 0;
    let blockType = void 0;
    return {
      stream: response.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            var _a, _b, _c, _d;
            if (!chunk.success) {
              controller.enqueue({ type: "error", error: chunk.error });
              return;
            }
            const value = chunk.value;
            switch (value.type) {
              case "ping": {
                return;
              }
              case "content_block_start": {
                const contentBlockType = value.content_block.type;
                blockType = contentBlockType;
                switch (contentBlockType) {
                  case "text":
                  case "thinking": {
                    return;
                  }
                  case "redacted_thinking": {
                    controller.enqueue({
                      type: "redacted-reasoning",
                      data: value.content_block.data
                    });
                    return;
                  }
                  case "tool_use": {
                    toolCallContentBlocks[value.index] = {
                      toolCallId: value.content_block.id,
                      toolName: value.content_block.name,
                      jsonText: ""
                    };
                    return;
                  }
                  default: {
                    const _exhaustiveCheck = contentBlockType;
                    throw new Error(
                      `Unsupported content block type: ${_exhaustiveCheck}`
                    );
                  }
                }
              }
              case "content_block_stop": {
                if (toolCallContentBlocks[value.index] != null) {
                  const contentBlock = toolCallContentBlocks[value.index];
                  controller.enqueue({
                    type: "tool-call",
                    toolCallType: "function",
                    toolCallId: contentBlock.toolCallId,
                    toolName: contentBlock.toolName,
                    args: contentBlock.jsonText
                  });
                  delete toolCallContentBlocks[value.index];
                }
                blockType = void 0;
                return;
              }
              case "content_block_delta": {
                const deltaType = value.delta.type;
                switch (deltaType) {
                  case "text_delta": {
                    controller.enqueue({
                      type: "text-delta",
                      textDelta: value.delta.text
                    });
                    return;
                  }
                  case "thinking_delta": {
                    controller.enqueue({
                      type: "reasoning",
                      textDelta: value.delta.thinking
                    });
                    return;
                  }
                  case "signature_delta": {
                    if (blockType === "thinking") {
                      controller.enqueue({
                        type: "reasoning-signature",
                        signature: value.delta.signature
                      });
                    }
                    return;
                  }
                  case "input_json_delta": {
                    const contentBlock = toolCallContentBlocks[value.index];
                    controller.enqueue({
                      type: "tool-call-delta",
                      toolCallType: "function",
                      toolCallId: contentBlock.toolCallId,
                      toolName: contentBlock.toolName,
                      argsTextDelta: value.delta.partial_json
                    });
                    contentBlock.jsonText += value.delta.partial_json;
                    return;
                  }
                  default: {
                    const _exhaustiveCheck = deltaType;
                    throw new Error(
                      `Unsupported delta type: ${_exhaustiveCheck}`
                    );
                  }
                }
              }
              case "message_start": {
                usage.promptTokens = value.message.usage.input_tokens;
                usage.completionTokens = value.message.usage.output_tokens;
                providerMetadata = {
                  anthropic: {
                    cacheCreationInputTokens: (_a = value.message.usage.cache_creation_input_tokens) != null ? _a : null,
                    cacheReadInputTokens: (_b = value.message.usage.cache_read_input_tokens) != null ? _b : null
                  }
                };
                controller.enqueue({
                  type: "response-metadata",
                  id: (_c = value.message.id) != null ? _c : void 0,
                  modelId: (_d = value.message.model) != null ? _d : void 0
                });
                return;
              }
              case "message_delta": {
                usage.completionTokens = value.usage.output_tokens;
                finishReason = mapAnthropicStopReason(value.delta.stop_reason);
                return;
              }
              case "message_stop": {
                controller.enqueue({
                  type: "finish",
                  finishReason,
                  usage,
                  providerMetadata
                });
                return;
              }
              case "error": {
                controller.enqueue({ type: "error", error: value.error });
                return;
              }
              default: {
                const _exhaustiveCheck = value;
                throw new Error(`Unsupported chunk type: ${_exhaustiveCheck}`);
              }
            }
          }
        })
      ),
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders },
      warnings,
      request: { body: JSON.stringify(body) }
    };
  }
};
var anthropicMessagesResponseSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
  type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("message"),
  id: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().nullish(),
  model: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().nullish(),
  content: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(
    zod__WEBPACK_IMPORTED_MODULE_0__.z.discriminatedUnion("type", [
      zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("text"),
        text: zod__WEBPACK_IMPORTED_MODULE_0__.z.string()
      }),
      zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("thinking"),
        thinking: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
        signature: zod__WEBPACK_IMPORTED_MODULE_0__.z.string()
      }),
      zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("redacted_thinking"),
        data: zod__WEBPACK_IMPORTED_MODULE_0__.z.string()
      }),
      zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("tool_use"),
        id: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
        name: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
        input: zod__WEBPACK_IMPORTED_MODULE_0__.z.unknown()
      })
    ])
  ),
  stop_reason: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().nullish(),
  usage: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    input_tokens: zod__WEBPACK_IMPORTED_MODULE_0__.z.number(),
    output_tokens: zod__WEBPACK_IMPORTED_MODULE_0__.z.number(),
    cache_creation_input_tokens: zod__WEBPACK_IMPORTED_MODULE_0__.z.number().nullish(),
    cache_read_input_tokens: zod__WEBPACK_IMPORTED_MODULE_0__.z.number().nullish()
  })
});
var anthropicMessagesChunkSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.discriminatedUnion("type", [
  zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("message_start"),
    message: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      id: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().nullish(),
      model: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().nullish(),
      usage: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        input_tokens: zod__WEBPACK_IMPORTED_MODULE_0__.z.number(),
        output_tokens: zod__WEBPACK_IMPORTED_MODULE_0__.z.number(),
        cache_creation_input_tokens: zod__WEBPACK_IMPORTED_MODULE_0__.z.number().nullish(),
        cache_read_input_tokens: zod__WEBPACK_IMPORTED_MODULE_0__.z.number().nullish()
      })
    })
  }),
  zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("content_block_start"),
    index: zod__WEBPACK_IMPORTED_MODULE_0__.z.number(),
    content_block: zod__WEBPACK_IMPORTED_MODULE_0__.z.discriminatedUnion("type", [
      zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("text"),
        text: zod__WEBPACK_IMPORTED_MODULE_0__.z.string()
      }),
      zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("thinking"),
        thinking: zod__WEBPACK_IMPORTED_MODULE_0__.z.string()
      }),
      zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("tool_use"),
        id: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
        name: zod__WEBPACK_IMPORTED_MODULE_0__.z.string()
      }),
      zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("redacted_thinking"),
        data: zod__WEBPACK_IMPORTED_MODULE_0__.z.string()
      })
    ])
  }),
  zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("content_block_delta"),
    index: zod__WEBPACK_IMPORTED_MODULE_0__.z.number(),
    delta: zod__WEBPACK_IMPORTED_MODULE_0__.z.discriminatedUnion("type", [
      zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("input_json_delta"),
        partial_json: zod__WEBPACK_IMPORTED_MODULE_0__.z.string()
      }),
      zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("text_delta"),
        text: zod__WEBPACK_IMPORTED_MODULE_0__.z.string()
      }),
      zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("thinking_delta"),
        thinking: zod__WEBPACK_IMPORTED_MODULE_0__.z.string()
      }),
      zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("signature_delta"),
        signature: zod__WEBPACK_IMPORTED_MODULE_0__.z.string()
      })
    ])
  }),
  zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("content_block_stop"),
    index: zod__WEBPACK_IMPORTED_MODULE_0__.z.number()
  }),
  zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("error"),
    error: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      type: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
      message: zod__WEBPACK_IMPORTED_MODULE_0__.z.string()
    })
  }),
  zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("message_delta"),
    delta: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({ stop_reason: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().nullish() }),
    usage: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({ output_tokens: zod__WEBPACK_IMPORTED_MODULE_0__.z.number() })
  }),
  zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("message_stop")
  }),
  zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    type: zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("ping")
  })
]);
var anthropicProviderOptionsSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
  thinking: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
    type: zod__WEBPACK_IMPORTED_MODULE_0__.z.union([zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("enabled"), zod__WEBPACK_IMPORTED_MODULE_0__.z.literal("disabled")]),
    budgetTokens: zod__WEBPACK_IMPORTED_MODULE_0__.z.number().optional()
  }).optional()
});

// src/anthropic-tools.ts

var Bash20241022Parameters = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
  command: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
  restart: zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean().optional()
});
function bashTool_20241022(options = {}) {
  return {
    type: "provider-defined",
    id: "anthropic.bash_20241022",
    args: {},
    parameters: Bash20241022Parameters,
    execute: options.execute,
    experimental_toToolResultContent: options.experimental_toToolResultContent
  };
}
var Bash20250124Parameters = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
  command: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
  restart: zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean().optional()
});
function bashTool_20250124(options = {}) {
  return {
    type: "provider-defined",
    id: "anthropic.bash_20250124",
    args: {},
    parameters: Bash20250124Parameters,
    execute: options.execute,
    experimental_toToolResultContent: options.experimental_toToolResultContent
  };
}
var TextEditor20241022Parameters = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
  command: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum(["view", "create", "str_replace", "insert", "undo_edit"]),
  path: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
  file_text: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().optional(),
  insert_line: zod__WEBPACK_IMPORTED_MODULE_0__.z.number().int().optional(),
  new_str: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().optional(),
  old_str: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().optional(),
  view_range: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(zod__WEBPACK_IMPORTED_MODULE_0__.z.number().int()).optional()
});
function textEditorTool_20241022(options = {}) {
  return {
    type: "provider-defined",
    id: "anthropic.text_editor_20241022",
    args: {},
    parameters: TextEditor20241022Parameters,
    execute: options.execute,
    experimental_toToolResultContent: options.experimental_toToolResultContent
  };
}
var TextEditor20250124Parameters = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
  command: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum(["view", "create", "str_replace", "insert", "undo_edit"]),
  path: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),
  file_text: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().optional(),
  insert_line: zod__WEBPACK_IMPORTED_MODULE_0__.z.number().int().optional(),
  new_str: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().optional(),
  old_str: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().optional(),
  view_range: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(zod__WEBPACK_IMPORTED_MODULE_0__.z.number().int()).optional()
});
function textEditorTool_20250124(options = {}) {
  return {
    type: "provider-defined",
    id: "anthropic.text_editor_20250124",
    args: {},
    parameters: TextEditor20250124Parameters,
    execute: options.execute,
    experimental_toToolResultContent: options.experimental_toToolResultContent
  };
}
var Computer20241022Parameters = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
  action: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([
    "key",
    "type",
    "mouse_move",
    "left_click",
    "left_click_drag",
    "right_click",
    "middle_click",
    "double_click",
    "screenshot",
    "cursor_position"
  ]),
  coordinate: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(zod__WEBPACK_IMPORTED_MODULE_0__.z.number().int()).optional(),
  text: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().optional()
});
function computerTool_20241022(options) {
  return {
    type: "provider-defined",
    id: "anthropic.computer_20241022",
    args: {
      displayWidthPx: options.displayWidthPx,
      displayHeightPx: options.displayHeightPx,
      displayNumber: options.displayNumber
    },
    parameters: Computer20241022Parameters,
    execute: options.execute,
    experimental_toToolResultContent: options.experimental_toToolResultContent
  };
}
var Computer20250124Parameters = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
  action: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([
    "key",
    "hold_key",
    "type",
    "cursor_position",
    "mouse_move",
    "left_mouse_down",
    "left_mouse_up",
    "left_click",
    "left_click_drag",
    "right_click",
    "middle_click",
    "double_click",
    "triple_click",
    "scroll",
    "wait",
    "screenshot"
  ]),
  coordinate: zod__WEBPACK_IMPORTED_MODULE_0__.z.tuple([zod__WEBPACK_IMPORTED_MODULE_0__.z.number().int(), zod__WEBPACK_IMPORTED_MODULE_0__.z.number().int()]).optional(),
  duration: zod__WEBPACK_IMPORTED_MODULE_0__.z.number().optional(),
  scroll_amount: zod__WEBPACK_IMPORTED_MODULE_0__.z.number().optional(),
  scroll_direction: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum(["up", "down", "left", "right"]).optional(),
  start_coordinate: zod__WEBPACK_IMPORTED_MODULE_0__.z.tuple([zod__WEBPACK_IMPORTED_MODULE_0__.z.number().int(), zod__WEBPACK_IMPORTED_MODULE_0__.z.number().int()]).optional(),
  text: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().optional()
});
function computerTool_20250124(options) {
  return {
    type: "provider-defined",
    id: "anthropic.computer_20250124",
    args: {
      displayWidthPx: options.displayWidthPx,
      displayHeightPx: options.displayHeightPx,
      displayNumber: options.displayNumber
    },
    parameters: Computer20250124Parameters,
    execute: options.execute,
    experimental_toToolResultContent: options.experimental_toToolResultContent
  };
}
var anthropicTools = {
  bash_20241022: bashTool_20241022,
  bash_20250124: bashTool_20250124,
  textEditor_20241022: textEditorTool_20241022,
  textEditor_20250124: textEditorTool_20250124,
  computer_20241022: computerTool_20241022,
  computer_20250124: computerTool_20250124
};

// src/anthropic-provider.ts
function createAnthropic(options = {}) {
  var _a;
  const baseURL = (_a = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_1__.withoutTrailingSlash)(options.baseURL)) != null ? _a : "https://api.anthropic.com/v1";
  const getHeaders = () => ({
    "anthropic-version": "2023-06-01",
    "x-api-key": (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_1__.loadApiKey)({
      apiKey: options.apiKey,
      environmentVariableName: "ANTHROPIC_API_KEY",
      description: "Anthropic"
    }),
    ...options.headers
  });
  const createChatModel = (modelId, settings = {}) => new AnthropicMessagesLanguageModel(modelId, settings, {
    provider: "anthropic.messages",
    baseURL,
    headers: getHeaders,
    fetch: options.fetch,
    supportsImageUrls: true
  });
  const provider = function(modelId, settings) {
    if (new.target) {
      throw new Error(
        "The Anthropic model function cannot be called with the new keyword."
      );
    }
    return createChatModel(modelId, settings);
  };
  provider.languageModel = createChatModel;
  provider.chat = createChatModel;
  provider.messages = createChatModel;
  provider.textEmbeddingModel = (modelId) => {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_2__.NoSuchModelError({ modelId, modelType: "textEmbeddingModel" });
  };
  provider.tools = anthropicTools;
  return provider;
}
var anthropic = createAnthropic();

//# sourceMappingURL=index.mjs.map

/***/ }),

/***/ "./node_modules/@ai-sdk/openai/dist/index.mjs":
/*!****************************************************!*\
  !*** ./node_modules/@ai-sdk/openai/dist/index.mjs ***!
  \****************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createOpenAI: () => (/* binding */ createOpenAI),
/* harmony export */   openai: () => (/* binding */ openai)
/* harmony export */ });
/* harmony import */ var _ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @ai-sdk/provider-utils */ "./node_modules/@ai-sdk/provider-utils/dist/index.mjs");
/* harmony import */ var _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @ai-sdk/provider */ "./node_modules/@ai-sdk/provider/dist/index.mjs");
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! zod */ "./node_modules/zod/lib/index.mjs");
// src/openai-provider.ts


// src/openai-chat-language-model.ts




// src/convert-to-openai-chat-messages.ts


function convertToOpenAIChatMessages({
  prompt,
  useLegacyFunctionCalling = false,
  systemMessageMode = "system"
}) {
  const messages = [];
  const warnings = [];
  for (const { role, content } of prompt) {
    switch (role) {
      case "system": {
        switch (systemMessageMode) {
          case "system": {
            messages.push({ role: "system", content });
            break;
          }
          case "developer": {
            messages.push({ role: "developer", content });
            break;
          }
          case "remove": {
            warnings.push({
              type: "other",
              message: "system messages are removed for this model"
            });
            break;
          }
          default: {
            const _exhaustiveCheck = systemMessageMode;
            throw new Error(
              `Unsupported system message mode: ${_exhaustiveCheck}`
            );
          }
        }
        break;
      }
      case "user": {
        if (content.length === 1 && content[0].type === "text") {
          messages.push({ role: "user", content: content[0].text });
          break;
        }
        messages.push({
          role: "user",
          content: content.map((part, index) => {
            var _a, _b, _c, _d;
            switch (part.type) {
              case "text": {
                return { type: "text", text: part.text };
              }
              case "image": {
                return {
                  type: "image_url",
                  image_url: {
                    url: part.image instanceof URL ? part.image.toString() : `data:${(_a = part.mimeType) != null ? _a : "image/jpeg"};base64,${(0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.convertUint8ArrayToBase64)(part.image)}`,
                    // OpenAI specific extension: image detail
                    detail: (_c = (_b = part.providerMetadata) == null ? void 0 : _b.openai) == null ? void 0 : _c.imageDetail
                  }
                };
              }
              case "file": {
                if (part.data instanceof URL) {
                  throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
                    functionality: "'File content parts with URL data' functionality not supported."
                  });
                }
                switch (part.mimeType) {
                  case "audio/wav": {
                    return {
                      type: "input_audio",
                      input_audio: { data: part.data, format: "wav" }
                    };
                  }
                  case "audio/mp3":
                  case "audio/mpeg": {
                    return {
                      type: "input_audio",
                      input_audio: { data: part.data, format: "mp3" }
                    };
                  }
                  case "application/pdf": {
                    return {
                      type: "file",
                      file: {
                        filename: (_d = part.filename) != null ? _d : `part-${index}.pdf`,
                        file_data: `data:application/pdf;base64,${part.data}`
                      }
                    };
                  }
                  default: {
                    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
                      functionality: `File content part type ${part.mimeType} in user messages`
                    });
                  }
                }
              }
            }
          })
        });
        break;
      }
      case "assistant": {
        let text = "";
        const toolCalls = [];
        for (const part of content) {
          switch (part.type) {
            case "text": {
              text += part.text;
              break;
            }
            case "tool-call": {
              toolCalls.push({
                id: part.toolCallId,
                type: "function",
                function: {
                  name: part.toolName,
                  arguments: JSON.stringify(part.args)
                }
              });
              break;
            }
          }
        }
        if (useLegacyFunctionCalling) {
          if (toolCalls.length > 1) {
            throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
              functionality: "useLegacyFunctionCalling with multiple tool calls in one message"
            });
          }
          messages.push({
            role: "assistant",
            content: text,
            function_call: toolCalls.length > 0 ? toolCalls[0].function : void 0
          });
        } else {
          messages.push({
            role: "assistant",
            content: text,
            tool_calls: toolCalls.length > 0 ? toolCalls : void 0
          });
        }
        break;
      }
      case "tool": {
        for (const toolResponse of content) {
          if (useLegacyFunctionCalling) {
            messages.push({
              role: "function",
              name: toolResponse.toolName,
              content: JSON.stringify(toolResponse.result)
            });
          } else {
            messages.push({
              role: "tool",
              tool_call_id: toolResponse.toolCallId,
              content: JSON.stringify(toolResponse.result)
            });
          }
        }
        break;
      }
      default: {
        const _exhaustiveCheck = role;
        throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
      }
    }
  }
  return { messages, warnings };
}

// src/map-openai-chat-logprobs.ts
function mapOpenAIChatLogProbsOutput(logprobs) {
  var _a, _b;
  return (_b = (_a = logprobs == null ? void 0 : logprobs.content) == null ? void 0 : _a.map(({ token, logprob, top_logprobs }) => ({
    token,
    logprob,
    topLogprobs: top_logprobs ? top_logprobs.map(({ token: token2, logprob: logprob2 }) => ({
      token: token2,
      logprob: logprob2
    })) : []
  }))) != null ? _b : void 0;
}

// src/map-openai-finish-reason.ts
function mapOpenAIFinishReason(finishReason) {
  switch (finishReason) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "content_filter":
      return "content-filter";
    case "function_call":
    case "tool_calls":
      return "tool-calls";
    default:
      return "unknown";
  }
}

// src/openai-error.ts


var openaiErrorDataSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
  error: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
    message: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
    // The additional information below is handled loosely to support
    // OpenAI-compatible providers that have slightly different error
    // responses:
    type: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
    param: zod__WEBPACK_IMPORTED_MODULE_2__.z.any().nullish(),
    code: zod__WEBPACK_IMPORTED_MODULE_2__.z.union([zod__WEBPACK_IMPORTED_MODULE_2__.z.string(), zod__WEBPACK_IMPORTED_MODULE_2__.z.number()]).nullish()
  })
});
var openaiFailedResponseHandler = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.createJsonErrorResponseHandler)({
  errorSchema: openaiErrorDataSchema,
  errorToMessage: (data) => data.error.message
});

// src/get-response-metadata.ts
function getResponseMetadata({
  id,
  model,
  created
}) {
  return {
    id: id != null ? id : void 0,
    modelId: model != null ? model : void 0,
    timestamp: created != null ? new Date(created * 1e3) : void 0
  };
}

// src/openai-prepare-tools.ts

function prepareTools({
  mode,
  useLegacyFunctionCalling = false,
  structuredOutputs
}) {
  var _a;
  const tools = ((_a = mode.tools) == null ? void 0 : _a.length) ? mode.tools : void 0;
  const toolWarnings = [];
  if (tools == null) {
    return { tools: void 0, tool_choice: void 0, toolWarnings };
  }
  const toolChoice = mode.toolChoice;
  if (useLegacyFunctionCalling) {
    const openaiFunctions = [];
    for (const tool of tools) {
      if (tool.type === "provider-defined") {
        toolWarnings.push({ type: "unsupported-tool", tool });
      } else {
        openaiFunctions.push({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        });
      }
    }
    if (toolChoice == null) {
      return {
        functions: openaiFunctions,
        function_call: void 0,
        toolWarnings
      };
    }
    const type2 = toolChoice.type;
    switch (type2) {
      case "auto":
      case "none":
      case void 0:
        return {
          functions: openaiFunctions,
          function_call: void 0,
          toolWarnings
        };
      case "required":
        throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
          functionality: "useLegacyFunctionCalling and toolChoice: required"
        });
      default:
        return {
          functions: openaiFunctions,
          function_call: { name: toolChoice.toolName },
          toolWarnings
        };
    }
  }
  const openaiTools2 = [];
  for (const tool of tools) {
    if (tool.type === "provider-defined") {
      toolWarnings.push({ type: "unsupported-tool", tool });
    } else {
      openaiTools2.push({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          strict: structuredOutputs ? true : void 0
        }
      });
    }
  }
  if (toolChoice == null) {
    return { tools: openaiTools2, tool_choice: void 0, toolWarnings };
  }
  const type = toolChoice.type;
  switch (type) {
    case "auto":
    case "none":
    case "required":
      return { tools: openaiTools2, tool_choice: type, toolWarnings };
    case "tool":
      return {
        tools: openaiTools2,
        tool_choice: {
          type: "function",
          function: {
            name: toolChoice.toolName
          }
        },
        toolWarnings
      };
    default: {
      const _exhaustiveCheck = type;
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
        functionality: `Unsupported tool choice type: ${_exhaustiveCheck}`
      });
    }
  }
}

// src/openai-chat-language-model.ts
var OpenAIChatLanguageModel = class {
  constructor(modelId, settings, config) {
    this.specificationVersion = "v1";
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
  }
  get supportsStructuredOutputs() {
    var _a;
    return (_a = this.settings.structuredOutputs) != null ? _a : isReasoningModel(this.modelId);
  }
  get defaultObjectGenerationMode() {
    if (isAudioModel(this.modelId)) {
      return "tool";
    }
    return this.supportsStructuredOutputs ? "json" : "tool";
  }
  get provider() {
    return this.config.provider;
  }
  get supportsImageUrls() {
    return !this.settings.downloadImages;
  }
  getArgs({
    mode,
    prompt,
    maxTokens,
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    stopSequences,
    responseFormat,
    seed,
    providerMetadata
  }) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const type = mode.type;
    const warnings = [];
    if (topK != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "topK"
      });
    }
    if ((responseFormat == null ? void 0 : responseFormat.type) === "json" && responseFormat.schema != null && !this.supportsStructuredOutputs) {
      warnings.push({
        type: "unsupported-setting",
        setting: "responseFormat",
        details: "JSON response format schema is only supported with structuredOutputs"
      });
    }
    const useLegacyFunctionCalling = this.settings.useLegacyFunctionCalling;
    if (useLegacyFunctionCalling && this.settings.parallelToolCalls === true) {
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
        functionality: "useLegacyFunctionCalling with parallelToolCalls"
      });
    }
    if (useLegacyFunctionCalling && this.supportsStructuredOutputs) {
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
        functionality: "structuredOutputs with useLegacyFunctionCalling"
      });
    }
    const { messages, warnings: messageWarnings } = convertToOpenAIChatMessages(
      {
        prompt,
        useLegacyFunctionCalling,
        systemMessageMode: getSystemMessageMode(this.modelId)
      }
    );
    warnings.push(...messageWarnings);
    const baseArgs = {
      // model id:
      model: this.modelId,
      // model specific settings:
      logit_bias: this.settings.logitBias,
      logprobs: this.settings.logprobs === true || typeof this.settings.logprobs === "number" ? true : void 0,
      top_logprobs: typeof this.settings.logprobs === "number" ? this.settings.logprobs : typeof this.settings.logprobs === "boolean" ? this.settings.logprobs ? 0 : void 0 : void 0,
      user: this.settings.user,
      parallel_tool_calls: this.settings.parallelToolCalls,
      // standardized settings:
      max_tokens: maxTokens,
      temperature,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
      response_format: (responseFormat == null ? void 0 : responseFormat.type) === "json" ? this.supportsStructuredOutputs && responseFormat.schema != null ? {
        type: "json_schema",
        json_schema: {
          schema: responseFormat.schema,
          strict: true,
          name: (_a = responseFormat.name) != null ? _a : "response",
          description: responseFormat.description
        }
      } : { type: "json_object" } : void 0,
      stop: stopSequences,
      seed,
      // openai specific settings:
      // TODO remove in next major version; we auto-map maxTokens now
      max_completion_tokens: (_b = providerMetadata == null ? void 0 : providerMetadata.openai) == null ? void 0 : _b.maxCompletionTokens,
      store: (_c = providerMetadata == null ? void 0 : providerMetadata.openai) == null ? void 0 : _c.store,
      metadata: (_d = providerMetadata == null ? void 0 : providerMetadata.openai) == null ? void 0 : _d.metadata,
      prediction: (_e = providerMetadata == null ? void 0 : providerMetadata.openai) == null ? void 0 : _e.prediction,
      reasoning_effort: (_g = (_f = providerMetadata == null ? void 0 : providerMetadata.openai) == null ? void 0 : _f.reasoningEffort) != null ? _g : this.settings.reasoningEffort,
      // messages:
      messages
    };
    if (isReasoningModel(this.modelId)) {
      if (baseArgs.temperature != null) {
        baseArgs.temperature = void 0;
        warnings.push({
          type: "unsupported-setting",
          setting: "temperature",
          details: "temperature is not supported for reasoning models"
        });
      }
      if (baseArgs.top_p != null) {
        baseArgs.top_p = void 0;
        warnings.push({
          type: "unsupported-setting",
          setting: "topP",
          details: "topP is not supported for reasoning models"
        });
      }
      if (baseArgs.frequency_penalty != null) {
        baseArgs.frequency_penalty = void 0;
        warnings.push({
          type: "unsupported-setting",
          setting: "frequencyPenalty",
          details: "frequencyPenalty is not supported for reasoning models"
        });
      }
      if (baseArgs.presence_penalty != null) {
        baseArgs.presence_penalty = void 0;
        warnings.push({
          type: "unsupported-setting",
          setting: "presencePenalty",
          details: "presencePenalty is not supported for reasoning models"
        });
      }
      if (baseArgs.logit_bias != null) {
        baseArgs.logit_bias = void 0;
        warnings.push({
          type: "other",
          message: "logitBias is not supported for reasoning models"
        });
      }
      if (baseArgs.logprobs != null) {
        baseArgs.logprobs = void 0;
        warnings.push({
          type: "other",
          message: "logprobs is not supported for reasoning models"
        });
      }
      if (baseArgs.top_logprobs != null) {
        baseArgs.top_logprobs = void 0;
        warnings.push({
          type: "other",
          message: "topLogprobs is not supported for reasoning models"
        });
      }
      if (baseArgs.max_tokens != null) {
        if (baseArgs.max_completion_tokens == null) {
          baseArgs.max_completion_tokens = baseArgs.max_tokens;
        }
        baseArgs.max_tokens = void 0;
      }
    } else if (this.modelId.startsWith("gpt-4o-search-preview") || this.modelId.startsWith("gpt-4o-mini-search-preview")) {
      if (baseArgs.temperature != null) {
        baseArgs.temperature = void 0;
        warnings.push({
          type: "unsupported-setting",
          setting: "temperature",
          details: "temperature is not supported for the search preview models and has been removed."
        });
      }
    }
    switch (type) {
      case "regular": {
        const { tools, tool_choice, functions, function_call, toolWarnings } = prepareTools({
          mode,
          useLegacyFunctionCalling,
          structuredOutputs: this.supportsStructuredOutputs
        });
        return {
          args: {
            ...baseArgs,
            tools,
            tool_choice,
            functions,
            function_call
          },
          warnings: [...warnings, ...toolWarnings]
        };
      }
      case "object-json": {
        return {
          args: {
            ...baseArgs,
            response_format: this.supportsStructuredOutputs && mode.schema != null ? {
              type: "json_schema",
              json_schema: {
                schema: mode.schema,
                strict: true,
                name: (_h = mode.name) != null ? _h : "response",
                description: mode.description
              }
            } : { type: "json_object" }
          },
          warnings
        };
      }
      case "object-tool": {
        return {
          args: useLegacyFunctionCalling ? {
            ...baseArgs,
            function_call: {
              name: mode.tool.name
            },
            functions: [
              {
                name: mode.tool.name,
                description: mode.tool.description,
                parameters: mode.tool.parameters
              }
            ]
          } : {
            ...baseArgs,
            tool_choice: {
              type: "function",
              function: { name: mode.tool.name }
            },
            tools: [
              {
                type: "function",
                function: {
                  name: mode.tool.name,
                  description: mode.tool.description,
                  parameters: mode.tool.parameters,
                  strict: this.supportsStructuredOutputs ? true : void 0
                }
              }
            ]
          },
          warnings
        };
      }
      default: {
        const _exhaustiveCheck = type;
        throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
      }
    }
  }
  async doGenerate(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const { args: body, warnings } = this.getArgs(options);
    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse
    } = await (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.postJsonToApi)({
      url: this.config.url({
        path: "/chat/completions",
        modelId: this.modelId
      }),
      headers: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.combineHeaders)(this.config.headers(), options.headers),
      body,
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.createJsonResponseHandler)(
        openaiChatResponseSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const { messages: rawPrompt, ...rawSettings } = body;
    const choice = response.choices[0];
    const completionTokenDetails = (_a = response.usage) == null ? void 0 : _a.completion_tokens_details;
    const promptTokenDetails = (_b = response.usage) == null ? void 0 : _b.prompt_tokens_details;
    const providerMetadata = { openai: {} };
    if ((completionTokenDetails == null ? void 0 : completionTokenDetails.reasoning_tokens) != null) {
      providerMetadata.openai.reasoningTokens = completionTokenDetails == null ? void 0 : completionTokenDetails.reasoning_tokens;
    }
    if ((completionTokenDetails == null ? void 0 : completionTokenDetails.accepted_prediction_tokens) != null) {
      providerMetadata.openai.acceptedPredictionTokens = completionTokenDetails == null ? void 0 : completionTokenDetails.accepted_prediction_tokens;
    }
    if ((completionTokenDetails == null ? void 0 : completionTokenDetails.rejected_prediction_tokens) != null) {
      providerMetadata.openai.rejectedPredictionTokens = completionTokenDetails == null ? void 0 : completionTokenDetails.rejected_prediction_tokens;
    }
    if ((promptTokenDetails == null ? void 0 : promptTokenDetails.cached_tokens) != null) {
      providerMetadata.openai.cachedPromptTokens = promptTokenDetails == null ? void 0 : promptTokenDetails.cached_tokens;
    }
    return {
      text: (_c = choice.message.content) != null ? _c : void 0,
      toolCalls: this.settings.useLegacyFunctionCalling && choice.message.function_call ? [
        {
          toolCallType: "function",
          toolCallId: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.generateId)(),
          toolName: choice.message.function_call.name,
          args: choice.message.function_call.arguments
        }
      ] : (_d = choice.message.tool_calls) == null ? void 0 : _d.map((toolCall) => {
        var _a2;
        return {
          toolCallType: "function",
          toolCallId: (_a2 = toolCall.id) != null ? _a2 : (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.generateId)(),
          toolName: toolCall.function.name,
          args: toolCall.function.arguments
        };
      }),
      finishReason: mapOpenAIFinishReason(choice.finish_reason),
      usage: {
        promptTokens: (_f = (_e = response.usage) == null ? void 0 : _e.prompt_tokens) != null ? _f : NaN,
        completionTokens: (_h = (_g = response.usage) == null ? void 0 : _g.completion_tokens) != null ? _h : NaN
      },
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders, body: rawResponse },
      request: { body: JSON.stringify(body) },
      response: getResponseMetadata(response),
      warnings,
      logprobs: mapOpenAIChatLogProbsOutput(choice.logprobs),
      providerMetadata
    };
  }
  async doStream(options) {
    if (this.settings.simulateStreaming) {
      const result = await this.doGenerate(options);
      const simulatedStream = new ReadableStream({
        start(controller) {
          controller.enqueue({ type: "response-metadata", ...result.response });
          if (result.text) {
            controller.enqueue({
              type: "text-delta",
              textDelta: result.text
            });
          }
          if (result.toolCalls) {
            for (const toolCall of result.toolCalls) {
              controller.enqueue({
                type: "tool-call-delta",
                toolCallType: "function",
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                argsTextDelta: toolCall.args
              });
              controller.enqueue({
                type: "tool-call",
                ...toolCall
              });
            }
          }
          controller.enqueue({
            type: "finish",
            finishReason: result.finishReason,
            usage: result.usage,
            logprobs: result.logprobs,
            providerMetadata: result.providerMetadata
          });
          controller.close();
        }
      });
      return {
        stream: simulatedStream,
        rawCall: result.rawCall,
        rawResponse: result.rawResponse,
        warnings: result.warnings
      };
    }
    const { args, warnings } = this.getArgs(options);
    const body = {
      ...args,
      stream: true,
      // only include stream_options when in strict compatibility mode:
      stream_options: this.config.compatibility === "strict" ? { include_usage: true } : void 0
    };
    const { responseHeaders, value: response } = await (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.postJsonToApi)({
      url: this.config.url({
        path: "/chat/completions",
        modelId: this.modelId
      }),
      headers: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.combineHeaders)(this.config.headers(), options.headers),
      body,
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.createEventSourceResponseHandler)(
        openaiChatChunkSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const { messages: rawPrompt, ...rawSettings } = args;
    const toolCalls = [];
    let finishReason = "unknown";
    let usage = {
      promptTokens: void 0,
      completionTokens: void 0
    };
    let logprobs;
    let isFirstChunk = true;
    const { useLegacyFunctionCalling } = this.settings;
    const providerMetadata = { openai: {} };
    return {
      stream: response.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
            if (!chunk.success) {
              finishReason = "error";
              controller.enqueue({ type: "error", error: chunk.error });
              return;
            }
            const value = chunk.value;
            if ("error" in value) {
              finishReason = "error";
              controller.enqueue({ type: "error", error: value.error });
              return;
            }
            if (isFirstChunk) {
              isFirstChunk = false;
              controller.enqueue({
                type: "response-metadata",
                ...getResponseMetadata(value)
              });
            }
            if (value.usage != null) {
              const {
                prompt_tokens,
                completion_tokens,
                prompt_tokens_details,
                completion_tokens_details
              } = value.usage;
              usage = {
                promptTokens: prompt_tokens != null ? prompt_tokens : void 0,
                completionTokens: completion_tokens != null ? completion_tokens : void 0
              };
              if ((completion_tokens_details == null ? void 0 : completion_tokens_details.reasoning_tokens) != null) {
                providerMetadata.openai.reasoningTokens = completion_tokens_details == null ? void 0 : completion_tokens_details.reasoning_tokens;
              }
              if ((completion_tokens_details == null ? void 0 : completion_tokens_details.accepted_prediction_tokens) != null) {
                providerMetadata.openai.acceptedPredictionTokens = completion_tokens_details == null ? void 0 : completion_tokens_details.accepted_prediction_tokens;
              }
              if ((completion_tokens_details == null ? void 0 : completion_tokens_details.rejected_prediction_tokens) != null) {
                providerMetadata.openai.rejectedPredictionTokens = completion_tokens_details == null ? void 0 : completion_tokens_details.rejected_prediction_tokens;
              }
              if ((prompt_tokens_details == null ? void 0 : prompt_tokens_details.cached_tokens) != null) {
                providerMetadata.openai.cachedPromptTokens = prompt_tokens_details == null ? void 0 : prompt_tokens_details.cached_tokens;
              }
            }
            const choice = value.choices[0];
            if ((choice == null ? void 0 : choice.finish_reason) != null) {
              finishReason = mapOpenAIFinishReason(choice.finish_reason);
            }
            if ((choice == null ? void 0 : choice.delta) == null) {
              return;
            }
            const delta = choice.delta;
            if (delta.content != null) {
              controller.enqueue({
                type: "text-delta",
                textDelta: delta.content
              });
            }
            const mappedLogprobs = mapOpenAIChatLogProbsOutput(
              choice == null ? void 0 : choice.logprobs
            );
            if (mappedLogprobs == null ? void 0 : mappedLogprobs.length) {
              if (logprobs === void 0) logprobs = [];
              logprobs.push(...mappedLogprobs);
            }
            const mappedToolCalls = useLegacyFunctionCalling && delta.function_call != null ? [
              {
                type: "function",
                id: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.generateId)(),
                function: delta.function_call,
                index: 0
              }
            ] : delta.tool_calls;
            if (mappedToolCalls != null) {
              for (const toolCallDelta of mappedToolCalls) {
                const index = toolCallDelta.index;
                if (toolCalls[index] == null) {
                  if (toolCallDelta.type !== "function") {
                    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'function' type.`
                    });
                  }
                  if (toolCallDelta.id == null) {
                    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'id' to be a string.`
                    });
                  }
                  if (((_a = toolCallDelta.function) == null ? void 0 : _a.name) == null) {
                    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'function.name' to be a string.`
                    });
                  }
                  toolCalls[index] = {
                    id: toolCallDelta.id,
                    type: "function",
                    function: {
                      name: toolCallDelta.function.name,
                      arguments: (_b = toolCallDelta.function.arguments) != null ? _b : ""
                    },
                    hasFinished: false
                  };
                  const toolCall2 = toolCalls[index];
                  if (((_c = toolCall2.function) == null ? void 0 : _c.name) != null && ((_d = toolCall2.function) == null ? void 0 : _d.arguments) != null) {
                    if (toolCall2.function.arguments.length > 0) {
                      controller.enqueue({
                        type: "tool-call-delta",
                        toolCallType: "function",
                        toolCallId: toolCall2.id,
                        toolName: toolCall2.function.name,
                        argsTextDelta: toolCall2.function.arguments
                      });
                    }
                    if ((0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.isParsableJson)(toolCall2.function.arguments)) {
                      controller.enqueue({
                        type: "tool-call",
                        toolCallType: "function",
                        toolCallId: (_e = toolCall2.id) != null ? _e : (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.generateId)(),
                        toolName: toolCall2.function.name,
                        args: toolCall2.function.arguments
                      });
                      toolCall2.hasFinished = true;
                    }
                  }
                  continue;
                }
                const toolCall = toolCalls[index];
                if (toolCall.hasFinished) {
                  continue;
                }
                if (((_f = toolCallDelta.function) == null ? void 0 : _f.arguments) != null) {
                  toolCall.function.arguments += (_h = (_g = toolCallDelta.function) == null ? void 0 : _g.arguments) != null ? _h : "";
                }
                controller.enqueue({
                  type: "tool-call-delta",
                  toolCallType: "function",
                  toolCallId: toolCall.id,
                  toolName: toolCall.function.name,
                  argsTextDelta: (_i = toolCallDelta.function.arguments) != null ? _i : ""
                });
                if (((_j = toolCall.function) == null ? void 0 : _j.name) != null && ((_k = toolCall.function) == null ? void 0 : _k.arguments) != null && (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.isParsableJson)(toolCall.function.arguments)) {
                  controller.enqueue({
                    type: "tool-call",
                    toolCallType: "function",
                    toolCallId: (_l = toolCall.id) != null ? _l : (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.generateId)(),
                    toolName: toolCall.function.name,
                    args: toolCall.function.arguments
                  });
                  toolCall.hasFinished = true;
                }
              }
            }
          },
          flush(controller) {
            var _a, _b;
            controller.enqueue({
              type: "finish",
              finishReason,
              logprobs,
              usage: {
                promptTokens: (_a = usage.promptTokens) != null ? _a : NaN,
                completionTokens: (_b = usage.completionTokens) != null ? _b : NaN
              },
              ...providerMetadata != null ? { providerMetadata } : {}
            });
          }
        })
      ),
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders },
      request: { body: JSON.stringify(body) },
      warnings
    };
  }
};
var openaiTokenUsageSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
  prompt_tokens: zod__WEBPACK_IMPORTED_MODULE_2__.z.number().nullish(),
  completion_tokens: zod__WEBPACK_IMPORTED_MODULE_2__.z.number().nullish(),
  prompt_tokens_details: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
    cached_tokens: zod__WEBPACK_IMPORTED_MODULE_2__.z.number().nullish()
  }).nullish(),
  completion_tokens_details: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
    reasoning_tokens: zod__WEBPACK_IMPORTED_MODULE_2__.z.number().nullish(),
    accepted_prediction_tokens: zod__WEBPACK_IMPORTED_MODULE_2__.z.number().nullish(),
    rejected_prediction_tokens: zod__WEBPACK_IMPORTED_MODULE_2__.z.number().nullish()
  }).nullish()
}).nullish();
var openaiChatResponseSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
  id: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
  created: zod__WEBPACK_IMPORTED_MODULE_2__.z.number().nullish(),
  model: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
  choices: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(
    zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
      message: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
        role: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("assistant").nullish(),
        content: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
        function_call: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
          arguments: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
          name: zod__WEBPACK_IMPORTED_MODULE_2__.z.string()
        }).nullish(),
        tool_calls: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(
          zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
            id: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
            type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("function"),
            function: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
              name: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
              arguments: zod__WEBPACK_IMPORTED_MODULE_2__.z.string()
            })
          })
        ).nullish()
      }),
      index: zod__WEBPACK_IMPORTED_MODULE_2__.z.number(),
      logprobs: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
        content: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(
          zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
            token: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
            logprob: zod__WEBPACK_IMPORTED_MODULE_2__.z.number(),
            top_logprobs: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(
              zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
                token: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
                logprob: zod__WEBPACK_IMPORTED_MODULE_2__.z.number()
              })
            )
          })
        ).nullable()
      }).nullish(),
      finish_reason: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish()
    })
  ),
  usage: openaiTokenUsageSchema
});
var openaiChatChunkSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.union([
  zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
    id: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
    created: zod__WEBPACK_IMPORTED_MODULE_2__.z.number().nullish(),
    model: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
    choices: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(
      zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
        delta: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
          role: zod__WEBPACK_IMPORTED_MODULE_2__.z.enum(["assistant"]).nullish(),
          content: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
          function_call: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
            name: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().optional(),
            arguments: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().optional()
          }).nullish(),
          tool_calls: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(
            zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
              index: zod__WEBPACK_IMPORTED_MODULE_2__.z.number(),
              id: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
              type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("function").nullish(),
              function: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
                name: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
                arguments: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish()
              })
            })
          ).nullish()
        }).nullish(),
        logprobs: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
          content: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(
            zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
              token: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
              logprob: zod__WEBPACK_IMPORTED_MODULE_2__.z.number(),
              top_logprobs: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(
                zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
                  token: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
                  logprob: zod__WEBPACK_IMPORTED_MODULE_2__.z.number()
                })
              )
            })
          ).nullable()
        }).nullish(),
        finish_reason: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
        index: zod__WEBPACK_IMPORTED_MODULE_2__.z.number()
      })
    ),
    usage: openaiTokenUsageSchema
  }),
  openaiErrorDataSchema
]);
function isReasoningModel(modelId) {
  return modelId.startsWith("o");
}
function isAudioModel(modelId) {
  return modelId.startsWith("gpt-4o-audio-preview");
}
function getSystemMessageMode(modelId) {
  var _a, _b;
  if (!isReasoningModel(modelId)) {
    return "system";
  }
  return (_b = (_a = reasoningModels[modelId]) == null ? void 0 : _a.systemMessageMode) != null ? _b : "developer";
}
var reasoningModels = {
  "o1-mini": {
    systemMessageMode: "remove"
  },
  "o1-mini-2024-09-12": {
    systemMessageMode: "remove"
  },
  "o1-preview": {
    systemMessageMode: "remove"
  },
  "o1-preview-2024-09-12": {
    systemMessageMode: "remove"
  },
  o3: {
    systemMessageMode: "developer"
  },
  "o3-2025-04-16": {
    systemMessageMode: "developer"
  },
  "o3-mini": {
    systemMessageMode: "developer"
  },
  "o3-mini-2025-01-31": {
    systemMessageMode: "developer"
  },
  "o4-mini": {
    systemMessageMode: "developer"
  },
  "o4-mini-2025-04-16": {
    systemMessageMode: "developer"
  }
};

// src/openai-completion-language-model.ts




// src/convert-to-openai-completion-prompt.ts

function convertToOpenAICompletionPrompt({
  prompt,
  inputFormat,
  user = "user",
  assistant = "assistant"
}) {
  if (inputFormat === "prompt" && prompt.length === 1 && prompt[0].role === "user" && prompt[0].content.length === 1 && prompt[0].content[0].type === "text") {
    return { prompt: prompt[0].content[0].text };
  }
  let text = "";
  if (prompt[0].role === "system") {
    text += `${prompt[0].content}

`;
    prompt = prompt.slice(1);
  }
  for (const { role, content } of prompt) {
    switch (role) {
      case "system": {
        throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.InvalidPromptError({
          message: "Unexpected system message in prompt: ${content}",
          prompt
        });
      }
      case "user": {
        const userMessage = content.map((part) => {
          switch (part.type) {
            case "text": {
              return part.text;
            }
            case "image": {
              throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
                functionality: "images"
              });
            }
          }
        }).join("");
        text += `${user}:
${userMessage}

`;
        break;
      }
      case "assistant": {
        const assistantMessage = content.map((part) => {
          switch (part.type) {
            case "text": {
              return part.text;
            }
            case "tool-call": {
              throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
                functionality: "tool-call messages"
              });
            }
          }
        }).join("");
        text += `${assistant}:
${assistantMessage}

`;
        break;
      }
      case "tool": {
        throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
          functionality: "tool messages"
        });
      }
      default: {
        const _exhaustiveCheck = role;
        throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
      }
    }
  }
  text += `${assistant}:
`;
  return {
    prompt: text,
    stopSequences: [`
${user}:`]
  };
}

// src/map-openai-completion-logprobs.ts
function mapOpenAICompletionLogProbs(logprobs) {
  return logprobs == null ? void 0 : logprobs.tokens.map((token, index) => ({
    token,
    logprob: logprobs.token_logprobs[index],
    topLogprobs: logprobs.top_logprobs ? Object.entries(logprobs.top_logprobs[index]).map(
      ([token2, logprob]) => ({
        token: token2,
        logprob
      })
    ) : []
  }));
}

// src/openai-completion-language-model.ts
var OpenAICompletionLanguageModel = class {
  constructor(modelId, settings, config) {
    this.specificationVersion = "v1";
    this.defaultObjectGenerationMode = void 0;
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
  }
  get provider() {
    return this.config.provider;
  }
  getArgs({
    mode,
    inputFormat,
    prompt,
    maxTokens,
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    stopSequences: userStopSequences,
    responseFormat,
    seed
  }) {
    var _a;
    const type = mode.type;
    const warnings = [];
    if (topK != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "topK"
      });
    }
    if (responseFormat != null && responseFormat.type !== "text") {
      warnings.push({
        type: "unsupported-setting",
        setting: "responseFormat",
        details: "JSON response format is not supported."
      });
    }
    const { prompt: completionPrompt, stopSequences } = convertToOpenAICompletionPrompt({ prompt, inputFormat });
    const stop = [...stopSequences != null ? stopSequences : [], ...userStopSequences != null ? userStopSequences : []];
    const baseArgs = {
      // model id:
      model: this.modelId,
      // model specific settings:
      echo: this.settings.echo,
      logit_bias: this.settings.logitBias,
      logprobs: typeof this.settings.logprobs === "number" ? this.settings.logprobs : typeof this.settings.logprobs === "boolean" ? this.settings.logprobs ? 0 : void 0 : void 0,
      suffix: this.settings.suffix,
      user: this.settings.user,
      // standardized settings:
      max_tokens: maxTokens,
      temperature,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
      seed,
      // prompt:
      prompt: completionPrompt,
      // stop sequences:
      stop: stop.length > 0 ? stop : void 0
    };
    switch (type) {
      case "regular": {
        if ((_a = mode.tools) == null ? void 0 : _a.length) {
          throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
            functionality: "tools"
          });
        }
        if (mode.toolChoice) {
          throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
            functionality: "toolChoice"
          });
        }
        return { args: baseArgs, warnings };
      }
      case "object-json": {
        throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
          functionality: "object-json mode"
        });
      }
      case "object-tool": {
        throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
          functionality: "object-tool mode"
        });
      }
      default: {
        const _exhaustiveCheck = type;
        throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
      }
    }
  }
  async doGenerate(options) {
    const { args, warnings } = this.getArgs(options);
    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse
    } = await (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.postJsonToApi)({
      url: this.config.url({
        path: "/completions",
        modelId: this.modelId
      }),
      headers: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.combineHeaders)(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.createJsonResponseHandler)(
        openaiCompletionResponseSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const { prompt: rawPrompt, ...rawSettings } = args;
    const choice = response.choices[0];
    return {
      text: choice.text,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens
      },
      finishReason: mapOpenAIFinishReason(choice.finish_reason),
      logprobs: mapOpenAICompletionLogProbs(choice.logprobs),
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders, body: rawResponse },
      response: getResponseMetadata(response),
      warnings,
      request: { body: JSON.stringify(args) }
    };
  }
  async doStream(options) {
    const { args, warnings } = this.getArgs(options);
    const body = {
      ...args,
      stream: true,
      // only include stream_options when in strict compatibility mode:
      stream_options: this.config.compatibility === "strict" ? { include_usage: true } : void 0
    };
    const { responseHeaders, value: response } = await (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.postJsonToApi)({
      url: this.config.url({
        path: "/completions",
        modelId: this.modelId
      }),
      headers: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.combineHeaders)(this.config.headers(), options.headers),
      body,
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.createEventSourceResponseHandler)(
        openaiCompletionChunkSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const { prompt: rawPrompt, ...rawSettings } = args;
    let finishReason = "unknown";
    let usage = {
      promptTokens: Number.NaN,
      completionTokens: Number.NaN
    };
    let logprobs;
    let isFirstChunk = true;
    return {
      stream: response.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            if (!chunk.success) {
              finishReason = "error";
              controller.enqueue({ type: "error", error: chunk.error });
              return;
            }
            const value = chunk.value;
            if ("error" in value) {
              finishReason = "error";
              controller.enqueue({ type: "error", error: value.error });
              return;
            }
            if (isFirstChunk) {
              isFirstChunk = false;
              controller.enqueue({
                type: "response-metadata",
                ...getResponseMetadata(value)
              });
            }
            if (value.usage != null) {
              usage = {
                promptTokens: value.usage.prompt_tokens,
                completionTokens: value.usage.completion_tokens
              };
            }
            const choice = value.choices[0];
            if ((choice == null ? void 0 : choice.finish_reason) != null) {
              finishReason = mapOpenAIFinishReason(choice.finish_reason);
            }
            if ((choice == null ? void 0 : choice.text) != null) {
              controller.enqueue({
                type: "text-delta",
                textDelta: choice.text
              });
            }
            const mappedLogprobs = mapOpenAICompletionLogProbs(
              choice == null ? void 0 : choice.logprobs
            );
            if (mappedLogprobs == null ? void 0 : mappedLogprobs.length) {
              if (logprobs === void 0) logprobs = [];
              logprobs.push(...mappedLogprobs);
            }
          },
          flush(controller) {
            controller.enqueue({
              type: "finish",
              finishReason,
              logprobs,
              usage
            });
          }
        })
      ),
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders },
      warnings,
      request: { body: JSON.stringify(body) }
    };
  }
};
var openaiCompletionResponseSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
  id: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
  created: zod__WEBPACK_IMPORTED_MODULE_2__.z.number().nullish(),
  model: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
  choices: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(
    zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
      text: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
      finish_reason: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
      logprobs: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
        tokens: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(zod__WEBPACK_IMPORTED_MODULE_2__.z.string()),
        token_logprobs: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(zod__WEBPACK_IMPORTED_MODULE_2__.z.number()),
        top_logprobs: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(zod__WEBPACK_IMPORTED_MODULE_2__.z.record(zod__WEBPACK_IMPORTED_MODULE_2__.z.string(), zod__WEBPACK_IMPORTED_MODULE_2__.z.number())).nullable()
      }).nullish()
    })
  ),
  usage: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
    prompt_tokens: zod__WEBPACK_IMPORTED_MODULE_2__.z.number(),
    completion_tokens: zod__WEBPACK_IMPORTED_MODULE_2__.z.number()
  })
});
var openaiCompletionChunkSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.union([
  zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
    id: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
    created: zod__WEBPACK_IMPORTED_MODULE_2__.z.number().nullish(),
    model: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
    choices: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(
      zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
        text: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
        finish_reason: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
        index: zod__WEBPACK_IMPORTED_MODULE_2__.z.number(),
        logprobs: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
          tokens: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(zod__WEBPACK_IMPORTED_MODULE_2__.z.string()),
          token_logprobs: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(zod__WEBPACK_IMPORTED_MODULE_2__.z.number()),
          top_logprobs: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(zod__WEBPACK_IMPORTED_MODULE_2__.z.record(zod__WEBPACK_IMPORTED_MODULE_2__.z.string(), zod__WEBPACK_IMPORTED_MODULE_2__.z.number())).nullable()
        }).nullish()
      })
    ),
    usage: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
      prompt_tokens: zod__WEBPACK_IMPORTED_MODULE_2__.z.number(),
      completion_tokens: zod__WEBPACK_IMPORTED_MODULE_2__.z.number()
    }).nullish()
  }),
  openaiErrorDataSchema
]);

// src/openai-embedding-model.ts



var OpenAIEmbeddingModel = class {
  constructor(modelId, settings, config) {
    this.specificationVersion = "v1";
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
  }
  get provider() {
    return this.config.provider;
  }
  get maxEmbeddingsPerCall() {
    var _a;
    return (_a = this.settings.maxEmbeddingsPerCall) != null ? _a : 2048;
  }
  get supportsParallelCalls() {
    var _a;
    return (_a = this.settings.supportsParallelCalls) != null ? _a : true;
  }
  async doEmbed({
    values,
    headers,
    abortSignal
  }) {
    if (values.length > this.maxEmbeddingsPerCall) {
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.TooManyEmbeddingValuesForCallError({
        provider: this.provider,
        modelId: this.modelId,
        maxEmbeddingsPerCall: this.maxEmbeddingsPerCall,
        values
      });
    }
    const { responseHeaders, value: response } = await (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.postJsonToApi)({
      url: this.config.url({
        path: "/embeddings",
        modelId: this.modelId
      }),
      headers: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.combineHeaders)(this.config.headers(), headers),
      body: {
        model: this.modelId,
        input: values,
        encoding_format: "float",
        dimensions: this.settings.dimensions,
        user: this.settings.user
      },
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.createJsonResponseHandler)(
        openaiTextEmbeddingResponseSchema
      ),
      abortSignal,
      fetch: this.config.fetch
    });
    return {
      embeddings: response.data.map((item) => item.embedding),
      usage: response.usage ? { tokens: response.usage.prompt_tokens } : void 0,
      rawResponse: { headers: responseHeaders }
    };
  }
};
var openaiTextEmbeddingResponseSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
  data: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(zod__WEBPACK_IMPORTED_MODULE_2__.z.object({ embedding: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(zod__WEBPACK_IMPORTED_MODULE_2__.z.number()) })),
  usage: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({ prompt_tokens: zod__WEBPACK_IMPORTED_MODULE_2__.z.number() }).nullish()
});

// src/openai-image-model.ts



// src/openai-image-settings.ts
var modelMaxImagesPerCall = {
  "dall-e-3": 1,
  "dall-e-2": 10,
  "gpt-image-1": 10
};
var hasDefaultResponseFormat = /* @__PURE__ */ new Set(["gpt-image-1"]);

// src/openai-image-model.ts
var OpenAIImageModel = class {
  constructor(modelId, settings, config) {
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
    this.specificationVersion = "v1";
  }
  get maxImagesPerCall() {
    var _a, _b;
    return (_b = (_a = this.settings.maxImagesPerCall) != null ? _a : modelMaxImagesPerCall[this.modelId]) != null ? _b : 1;
  }
  get provider() {
    return this.config.provider;
  }
  async doGenerate({
    prompt,
    n,
    size,
    aspectRatio,
    seed,
    providerOptions,
    headers,
    abortSignal
  }) {
    var _a, _b, _c, _d;
    const warnings = [];
    if (aspectRatio != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "aspectRatio",
        details: "This model does not support aspect ratio. Use `size` instead."
      });
    }
    if (seed != null) {
      warnings.push({ type: "unsupported-setting", setting: "seed" });
    }
    const currentDate = (_c = (_b = (_a = this.config._internal) == null ? void 0 : _a.currentDate) == null ? void 0 : _b.call(_a)) != null ? _c : /* @__PURE__ */ new Date();
    const { value: response, responseHeaders } = await (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.postJsonToApi)({
      url: this.config.url({
        path: "/images/generations",
        modelId: this.modelId
      }),
      headers: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.combineHeaders)(this.config.headers(), headers),
      body: {
        model: this.modelId,
        prompt,
        n,
        size,
        ...(_d = providerOptions.openai) != null ? _d : {},
        ...!hasDefaultResponseFormat.has(this.modelId) ? { response_format: "b64_json" } : {}
      },
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.createJsonResponseHandler)(
        openaiImageResponseSchema
      ),
      abortSignal,
      fetch: this.config.fetch
    });
    return {
      images: response.data.map((item) => item.b64_json),
      warnings,
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders
      }
    };
  }
};
var openaiImageResponseSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
  data: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(zod__WEBPACK_IMPORTED_MODULE_2__.z.object({ b64_json: zod__WEBPACK_IMPORTED_MODULE_2__.z.string() }))
});

// src/openai-transcription-model.ts


var openAIProviderOptionsSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
  include: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(zod__WEBPACK_IMPORTED_MODULE_2__.z.string()).nullish(),
  language: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
  prompt: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
  temperature: zod__WEBPACK_IMPORTED_MODULE_2__.z.number().min(0).max(1).nullish().default(0),
  timestampGranularities: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(zod__WEBPACK_IMPORTED_MODULE_2__.z.enum(["word", "segment"])).nullish().default(["segment"])
});
var languageMap = {
  afrikaans: "af",
  arabic: "ar",
  armenian: "hy",
  azerbaijani: "az",
  belarusian: "be",
  bosnian: "bs",
  bulgarian: "bg",
  catalan: "ca",
  chinese: "zh",
  croatian: "hr",
  czech: "cs",
  danish: "da",
  dutch: "nl",
  english: "en",
  estonian: "et",
  finnish: "fi",
  french: "fr",
  galician: "gl",
  german: "de",
  greek: "el",
  hebrew: "he",
  hindi: "hi",
  hungarian: "hu",
  icelandic: "is",
  indonesian: "id",
  italian: "it",
  japanese: "ja",
  kannada: "kn",
  kazakh: "kk",
  korean: "ko",
  latvian: "lv",
  lithuanian: "lt",
  macedonian: "mk",
  malay: "ms",
  marathi: "mr",
  maori: "mi",
  nepali: "ne",
  norwegian: "no",
  persian: "fa",
  polish: "pl",
  portuguese: "pt",
  romanian: "ro",
  russian: "ru",
  serbian: "sr",
  slovak: "sk",
  slovenian: "sl",
  spanish: "es",
  swahili: "sw",
  swedish: "sv",
  tagalog: "tl",
  tamil: "ta",
  thai: "th",
  turkish: "tr",
  ukrainian: "uk",
  urdu: "ur",
  vietnamese: "vi",
  welsh: "cy"
};
var OpenAITranscriptionModel = class {
  constructor(modelId, config) {
    this.modelId = modelId;
    this.config = config;
    this.specificationVersion = "v1";
  }
  get provider() {
    return this.config.provider;
  }
  getArgs({
    audio,
    mediaType,
    providerOptions
  }) {
    var _a, _b, _c, _d, _e;
    const warnings = [];
    const openAIOptions = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.parseProviderOptions)({
      provider: "openai",
      providerOptions,
      schema: openAIProviderOptionsSchema
    });
    const formData = new FormData();
    const blob = audio instanceof Uint8Array ? new Blob([audio]) : new Blob([(0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.convertBase64ToUint8Array)(audio)]);
    formData.append("model", this.modelId);
    formData.append("file", new File([blob], "audio", { type: mediaType }));
    if (openAIOptions) {
      const transcriptionModelOptions = {
        include: (_a = openAIOptions.include) != null ? _a : void 0,
        language: (_b = openAIOptions.language) != null ? _b : void 0,
        prompt: (_c = openAIOptions.prompt) != null ? _c : void 0,
        temperature: (_d = openAIOptions.temperature) != null ? _d : void 0,
        timestamp_granularities: (_e = openAIOptions.timestampGranularities) != null ? _e : void 0
      };
      for (const key in transcriptionModelOptions) {
        const value = transcriptionModelOptions[key];
        if (value !== void 0) {
          formData.append(key, String(value));
        }
      }
    }
    return {
      formData,
      warnings
    };
  }
  async doGenerate(options) {
    var _a, _b, _c, _d, _e, _f;
    const currentDate = (_c = (_b = (_a = this.config._internal) == null ? void 0 : _a.currentDate) == null ? void 0 : _b.call(_a)) != null ? _c : /* @__PURE__ */ new Date();
    const { formData, warnings } = this.getArgs(options);
    const {
      value: response,
      responseHeaders,
      rawValue: rawResponse
    } = await (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.postFormDataToApi)({
      url: this.config.url({
        path: "/audio/transcriptions",
        modelId: this.modelId
      }),
      headers: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.combineHeaders)(this.config.headers(), options.headers),
      formData,
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.createJsonResponseHandler)(
        openaiTranscriptionResponseSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const language = response.language != null && response.language in languageMap ? languageMap[response.language] : void 0;
    return {
      text: response.text,
      segments: (_e = (_d = response.words) == null ? void 0 : _d.map((word) => ({
        text: word.word,
        startSecond: word.start,
        endSecond: word.end
      }))) != null ? _e : [],
      language,
      durationInSeconds: (_f = response.duration) != null ? _f : void 0,
      warnings,
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders,
        body: rawResponse
      }
    };
  }
};
var openaiTranscriptionResponseSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
  text: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
  language: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
  duration: zod__WEBPACK_IMPORTED_MODULE_2__.z.number().nullish(),
  words: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(
    zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
      word: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
      start: zod__WEBPACK_IMPORTED_MODULE_2__.z.number(),
      end: zod__WEBPACK_IMPORTED_MODULE_2__.z.number()
    })
  ).nullish()
});

// src/responses/openai-responses-language-model.ts



// src/responses/convert-to-openai-responses-messages.ts


function convertToOpenAIResponsesMessages({
  prompt,
  systemMessageMode
}) {
  const messages = [];
  const warnings = [];
  for (const { role, content } of prompt) {
    switch (role) {
      case "system": {
        switch (systemMessageMode) {
          case "system": {
            messages.push({ role: "system", content });
            break;
          }
          case "developer": {
            messages.push({ role: "developer", content });
            break;
          }
          case "remove": {
            warnings.push({
              type: "other",
              message: "system messages are removed for this model"
            });
            break;
          }
          default: {
            const _exhaustiveCheck = systemMessageMode;
            throw new Error(
              `Unsupported system message mode: ${_exhaustiveCheck}`
            );
          }
        }
        break;
      }
      case "user": {
        messages.push({
          role: "user",
          content: content.map((part, index) => {
            var _a, _b, _c, _d;
            switch (part.type) {
              case "text": {
                return { type: "input_text", text: part.text };
              }
              case "image": {
                return {
                  type: "input_image",
                  image_url: part.image instanceof URL ? part.image.toString() : `data:${(_a = part.mimeType) != null ? _a : "image/jpeg"};base64,${(0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.convertUint8ArrayToBase64)(part.image)}`,
                  // OpenAI specific extension: image detail
                  detail: (_c = (_b = part.providerMetadata) == null ? void 0 : _b.openai) == null ? void 0 : _c.imageDetail
                };
              }
              case "file": {
                if (part.data instanceof URL) {
                  throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
                    functionality: "File URLs in user messages"
                  });
                }
                switch (part.mimeType) {
                  case "application/pdf": {
                    return {
                      type: "input_file",
                      filename: (_d = part.filename) != null ? _d : `part-${index}.pdf`,
                      file_data: `data:application/pdf;base64,${part.data}`
                    };
                  }
                  default: {
                    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
                      functionality: "Only PDF files are supported in user messages"
                    });
                  }
                }
              }
            }
          })
        });
        break;
      }
      case "assistant": {
        for (const part of content) {
          switch (part.type) {
            case "text": {
              messages.push({
                role: "assistant",
                content: [{ type: "output_text", text: part.text }]
              });
              break;
            }
            case "tool-call": {
              messages.push({
                type: "function_call",
                call_id: part.toolCallId,
                name: part.toolName,
                arguments: JSON.stringify(part.args)
              });
              break;
            }
          }
        }
        break;
      }
      case "tool": {
        for (const part of content) {
          messages.push({
            type: "function_call_output",
            call_id: part.toolCallId,
            output: JSON.stringify(part.result)
          });
        }
        break;
      }
      default: {
        const _exhaustiveCheck = role;
        throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
      }
    }
  }
  return { messages, warnings };
}

// src/responses/map-openai-responses-finish-reason.ts
function mapOpenAIResponseFinishReason({
  finishReason,
  hasToolCalls
}) {
  switch (finishReason) {
    case void 0:
    case null:
      return hasToolCalls ? "tool-calls" : "stop";
    case "max_output_tokens":
      return "length";
    case "content_filter":
      return "content-filter";
    default:
      return hasToolCalls ? "tool-calls" : "unknown";
  }
}

// src/responses/openai-responses-prepare-tools.ts

function prepareResponsesTools({
  mode,
  strict
}) {
  var _a;
  const tools = ((_a = mode.tools) == null ? void 0 : _a.length) ? mode.tools : void 0;
  const toolWarnings = [];
  if (tools == null) {
    return { tools: void 0, tool_choice: void 0, toolWarnings };
  }
  const toolChoice = mode.toolChoice;
  const openaiTools2 = [];
  for (const tool of tools) {
    switch (tool.type) {
      case "function":
        openaiTools2.push({
          type: "function",
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          strict: strict ? true : void 0
        });
        break;
      case "provider-defined":
        switch (tool.id) {
          case "openai.web_search_preview":
            openaiTools2.push({
              type: "web_search_preview",
              search_context_size: tool.args.searchContextSize,
              user_location: tool.args.userLocation
            });
            break;
          default:
            toolWarnings.push({ type: "unsupported-tool", tool });
            break;
        }
        break;
      default:
        toolWarnings.push({ type: "unsupported-tool", tool });
        break;
    }
  }
  if (toolChoice == null) {
    return { tools: openaiTools2, tool_choice: void 0, toolWarnings };
  }
  const type = toolChoice.type;
  switch (type) {
    case "auto":
    case "none":
    case "required":
      return { tools: openaiTools2, tool_choice: type, toolWarnings };
    case "tool": {
      if (toolChoice.toolName === "web_search_preview") {
        return {
          tools: openaiTools2,
          tool_choice: {
            type: "web_search_preview"
          },
          toolWarnings
        };
      }
      return {
        tools: openaiTools2,
        tool_choice: {
          type: "function",
          name: toolChoice.toolName
        },
        toolWarnings
      };
    }
    default: {
      const _exhaustiveCheck = type;
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
        functionality: `Unsupported tool choice type: ${_exhaustiveCheck}`
      });
    }
  }
}

// src/responses/openai-responses-language-model.ts
var OpenAIResponsesLanguageModel = class {
  constructor(modelId, config) {
    this.specificationVersion = "v1";
    this.defaultObjectGenerationMode = "json";
    this.supportsStructuredOutputs = true;
    this.modelId = modelId;
    this.config = config;
  }
  get provider() {
    return this.config.provider;
  }
  getArgs({
    mode,
    maxTokens,
    temperature,
    stopSequences,
    topP,
    topK,
    presencePenalty,
    frequencyPenalty,
    seed,
    prompt,
    providerMetadata,
    responseFormat
  }) {
    var _a, _b, _c;
    const warnings = [];
    const modelConfig = getResponsesModelConfig(this.modelId);
    const type = mode.type;
    if (topK != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "topK"
      });
    }
    if (seed != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "seed"
      });
    }
    if (presencePenalty != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "presencePenalty"
      });
    }
    if (frequencyPenalty != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "frequencyPenalty"
      });
    }
    if (stopSequences != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "stopSequences"
      });
    }
    const { messages, warnings: messageWarnings } = convertToOpenAIResponsesMessages({
      prompt,
      systemMessageMode: modelConfig.systemMessageMode
    });
    warnings.push(...messageWarnings);
    const openaiOptions = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.parseProviderOptions)({
      provider: "openai",
      providerOptions: providerMetadata,
      schema: openaiResponsesProviderOptionsSchema
    });
    const isStrict = (_a = openaiOptions == null ? void 0 : openaiOptions.strictSchemas) != null ? _a : true;
    const baseArgs = {
      model: this.modelId,
      input: messages,
      temperature,
      top_p: topP,
      max_output_tokens: maxTokens,
      ...(responseFormat == null ? void 0 : responseFormat.type) === "json" && {
        text: {
          format: responseFormat.schema != null ? {
            type: "json_schema",
            strict: isStrict,
            name: (_b = responseFormat.name) != null ? _b : "response",
            description: responseFormat.description,
            schema: responseFormat.schema
          } : { type: "json_object" }
        }
      },
      // provider options:
      metadata: openaiOptions == null ? void 0 : openaiOptions.metadata,
      parallel_tool_calls: openaiOptions == null ? void 0 : openaiOptions.parallelToolCalls,
      previous_response_id: openaiOptions == null ? void 0 : openaiOptions.previousResponseId,
      store: openaiOptions == null ? void 0 : openaiOptions.store,
      user: openaiOptions == null ? void 0 : openaiOptions.user,
      instructions: openaiOptions == null ? void 0 : openaiOptions.instructions,
      // model-specific settings:
      ...modelConfig.isReasoningModel && ((openaiOptions == null ? void 0 : openaiOptions.reasoningEffort) != null || (openaiOptions == null ? void 0 : openaiOptions.reasoningSummary) != null) && {
        reasoning: {
          ...(openaiOptions == null ? void 0 : openaiOptions.reasoningEffort) != null && {
            effort: openaiOptions.reasoningEffort
          },
          ...(openaiOptions == null ? void 0 : openaiOptions.reasoningSummary) != null && {
            summary: openaiOptions.reasoningSummary
          }
        }
      },
      ...modelConfig.requiredAutoTruncation && {
        truncation: "auto"
      }
    };
    if (modelConfig.isReasoningModel) {
      if (baseArgs.temperature != null) {
        baseArgs.temperature = void 0;
        warnings.push({
          type: "unsupported-setting",
          setting: "temperature",
          details: "temperature is not supported for reasoning models"
        });
      }
      if (baseArgs.top_p != null) {
        baseArgs.top_p = void 0;
        warnings.push({
          type: "unsupported-setting",
          setting: "topP",
          details: "topP is not supported for reasoning models"
        });
      }
    }
    switch (type) {
      case "regular": {
        const { tools, tool_choice, toolWarnings } = prepareResponsesTools({
          mode,
          strict: isStrict
          // TODO support provider options on tools
        });
        return {
          args: {
            ...baseArgs,
            tools,
            tool_choice
          },
          warnings: [...warnings, ...toolWarnings]
        };
      }
      case "object-json": {
        return {
          args: {
            ...baseArgs,
            text: {
              format: mode.schema != null ? {
                type: "json_schema",
                strict: isStrict,
                name: (_c = mode.name) != null ? _c : "response",
                description: mode.description,
                schema: mode.schema
              } : { type: "json_object" }
            }
          },
          warnings
        };
      }
      case "object-tool": {
        return {
          args: {
            ...baseArgs,
            tool_choice: { type: "function", name: mode.tool.name },
            tools: [
              {
                type: "function",
                name: mode.tool.name,
                description: mode.tool.description,
                parameters: mode.tool.parameters,
                strict: isStrict
              }
            ]
          },
          warnings
        };
      }
      default: {
        const _exhaustiveCheck = type;
        throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
      }
    }
  }
  async doGenerate(options) {
    var _a, _b, _c, _d, _e, _f, _g;
    const { args: body, warnings } = this.getArgs(options);
    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse
    } = await (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.postJsonToApi)({
      url: this.config.url({
        path: "/responses",
        modelId: this.modelId
      }),
      headers: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.combineHeaders)(this.config.headers(), options.headers),
      body,
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.createJsonResponseHandler)(
        zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
          id: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
          created_at: zod__WEBPACK_IMPORTED_MODULE_2__.z.number(),
          model: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
          output: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(
            zod__WEBPACK_IMPORTED_MODULE_2__.z.discriminatedUnion("type", [
              zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
                type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("message"),
                role: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("assistant"),
                content: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(
                  zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
                    type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("output_text"),
                    text: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
                    annotations: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(
                      zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
                        type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("url_citation"),
                        start_index: zod__WEBPACK_IMPORTED_MODULE_2__.z.number(),
                        end_index: zod__WEBPACK_IMPORTED_MODULE_2__.z.number(),
                        url: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
                        title: zod__WEBPACK_IMPORTED_MODULE_2__.z.string()
                      })
                    )
                  })
                )
              }),
              zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
                type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("function_call"),
                call_id: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
                name: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
                arguments: zod__WEBPACK_IMPORTED_MODULE_2__.z.string()
              }),
              zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
                type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("web_search_call")
              }),
              zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
                type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("computer_call")
              }),
              zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
                type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("reasoning"),
                summary: zod__WEBPACK_IMPORTED_MODULE_2__.z.array(
                  zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
                    type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("summary_text"),
                    text: zod__WEBPACK_IMPORTED_MODULE_2__.z.string()
                  })
                )
              })
            ])
          ),
          incomplete_details: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({ reason: zod__WEBPACK_IMPORTED_MODULE_2__.z.string() }).nullable(),
          usage: usageSchema
        })
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const outputTextElements = response.output.filter((output) => output.type === "message").flatMap((output) => output.content).filter((content) => content.type === "output_text");
    const toolCalls = response.output.filter((output) => output.type === "function_call").map((output) => ({
      toolCallType: "function",
      toolCallId: output.call_id,
      toolName: output.name,
      args: output.arguments
    }));
    const reasoningSummary = (_b = (_a = response.output.find((item) => item.type === "reasoning")) == null ? void 0 : _a.summary) != null ? _b : null;
    return {
      text: outputTextElements.map((content) => content.text).join("\n"),
      sources: outputTextElements.flatMap(
        (content) => content.annotations.map((annotation) => {
          var _a2, _b2, _c2;
          return {
            sourceType: "url",
            id: (_c2 = (_b2 = (_a2 = this.config).generateId) == null ? void 0 : _b2.call(_a2)) != null ? _c2 : (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.generateId)(),
            url: annotation.url,
            title: annotation.title
          };
        })
      ),
      finishReason: mapOpenAIResponseFinishReason({
        finishReason: (_c = response.incomplete_details) == null ? void 0 : _c.reason,
        hasToolCalls: toolCalls.length > 0
      }),
      toolCalls: toolCalls.length > 0 ? toolCalls : void 0,
      reasoning: reasoningSummary ? reasoningSummary.map((summary) => ({
        type: "text",
        text: summary.text
      })) : void 0,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens
      },
      rawCall: {
        rawPrompt: void 0,
        rawSettings: {}
      },
      rawResponse: {
        headers: responseHeaders,
        body: rawResponse
      },
      request: {
        body: JSON.stringify(body)
      },
      response: {
        id: response.id,
        timestamp: new Date(response.created_at * 1e3),
        modelId: response.model
      },
      providerMetadata: {
        openai: {
          responseId: response.id,
          cachedPromptTokens: (_e = (_d = response.usage.input_tokens_details) == null ? void 0 : _d.cached_tokens) != null ? _e : null,
          reasoningTokens: (_g = (_f = response.usage.output_tokens_details) == null ? void 0 : _f.reasoning_tokens) != null ? _g : null
        }
      },
      warnings
    };
  }
  async doStream(options) {
    const { args: body, warnings } = this.getArgs(options);
    const { responseHeaders, value: response } = await (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.postJsonToApi)({
      url: this.config.url({
        path: "/responses",
        modelId: this.modelId
      }),
      headers: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.combineHeaders)(this.config.headers(), options.headers),
      body: {
        ...body,
        stream: true
      },
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.createEventSourceResponseHandler)(
        openaiResponsesChunkSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const self = this;
    let finishReason = "unknown";
    let promptTokens = NaN;
    let completionTokens = NaN;
    let cachedPromptTokens = null;
    let reasoningTokens = null;
    let responseId = null;
    const ongoingToolCalls = {};
    let hasToolCalls = false;
    return {
      stream: response.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            if (!chunk.success) {
              finishReason = "error";
              controller.enqueue({ type: "error", error: chunk.error });
              return;
            }
            const value = chunk.value;
            if (isResponseOutputItemAddedChunk(value)) {
              if (value.item.type === "function_call") {
                ongoingToolCalls[value.output_index] = {
                  toolName: value.item.name,
                  toolCallId: value.item.call_id
                };
                controller.enqueue({
                  type: "tool-call-delta",
                  toolCallType: "function",
                  toolCallId: value.item.call_id,
                  toolName: value.item.name,
                  argsTextDelta: value.item.arguments
                });
              }
            } else if (isResponseFunctionCallArgumentsDeltaChunk(value)) {
              const toolCall = ongoingToolCalls[value.output_index];
              if (toolCall != null) {
                controller.enqueue({
                  type: "tool-call-delta",
                  toolCallType: "function",
                  toolCallId: toolCall.toolCallId,
                  toolName: toolCall.toolName,
                  argsTextDelta: value.delta
                });
              }
            } else if (isResponseCreatedChunk(value)) {
              responseId = value.response.id;
              controller.enqueue({
                type: "response-metadata",
                id: value.response.id,
                timestamp: new Date(value.response.created_at * 1e3),
                modelId: value.response.model
              });
            } else if (isTextDeltaChunk(value)) {
              controller.enqueue({
                type: "text-delta",
                textDelta: value.delta
              });
            } else if (isResponseReasoningSummaryTextDeltaChunk(value)) {
              controller.enqueue({
                type: "reasoning",
                textDelta: value.delta
              });
            } else if (isResponseOutputItemDoneChunk(value) && value.item.type === "function_call") {
              ongoingToolCalls[value.output_index] = void 0;
              hasToolCalls = true;
              controller.enqueue({
                type: "tool-call",
                toolCallType: "function",
                toolCallId: value.item.call_id,
                toolName: value.item.name,
                args: value.item.arguments
              });
            } else if (isResponseFinishedChunk(value)) {
              finishReason = mapOpenAIResponseFinishReason({
                finishReason: (_a = value.response.incomplete_details) == null ? void 0 : _a.reason,
                hasToolCalls
              });
              promptTokens = value.response.usage.input_tokens;
              completionTokens = value.response.usage.output_tokens;
              cachedPromptTokens = (_c = (_b = value.response.usage.input_tokens_details) == null ? void 0 : _b.cached_tokens) != null ? _c : cachedPromptTokens;
              reasoningTokens = (_e = (_d = value.response.usage.output_tokens_details) == null ? void 0 : _d.reasoning_tokens) != null ? _e : reasoningTokens;
            } else if (isResponseAnnotationAddedChunk(value)) {
              controller.enqueue({
                type: "source",
                source: {
                  sourceType: "url",
                  id: (_h = (_g = (_f = self.config).generateId) == null ? void 0 : _g.call(_f)) != null ? _h : (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.generateId)(),
                  url: value.annotation.url,
                  title: value.annotation.title
                }
              });
            }
          },
          flush(controller) {
            controller.enqueue({
              type: "finish",
              finishReason,
              usage: { promptTokens, completionTokens },
              ...(cachedPromptTokens != null || reasoningTokens != null) && {
                providerMetadata: {
                  openai: {
                    responseId,
                    cachedPromptTokens,
                    reasoningTokens
                  }
                }
              }
            });
          }
        })
      ),
      rawCall: {
        rawPrompt: void 0,
        rawSettings: {}
      },
      rawResponse: { headers: responseHeaders },
      request: { body: JSON.stringify(body) },
      warnings
    };
  }
};
var usageSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
  input_tokens: zod__WEBPACK_IMPORTED_MODULE_2__.z.number(),
  input_tokens_details: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({ cached_tokens: zod__WEBPACK_IMPORTED_MODULE_2__.z.number().nullish() }).nullish(),
  output_tokens: zod__WEBPACK_IMPORTED_MODULE_2__.z.number(),
  output_tokens_details: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({ reasoning_tokens: zod__WEBPACK_IMPORTED_MODULE_2__.z.number().nullish() }).nullish()
});
var textDeltaChunkSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
  type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("response.output_text.delta"),
  delta: zod__WEBPACK_IMPORTED_MODULE_2__.z.string()
});
var responseFinishedChunkSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
  type: zod__WEBPACK_IMPORTED_MODULE_2__.z.enum(["response.completed", "response.incomplete"]),
  response: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
    incomplete_details: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({ reason: zod__WEBPACK_IMPORTED_MODULE_2__.z.string() }).nullish(),
    usage: usageSchema
  })
});
var responseCreatedChunkSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
  type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("response.created"),
  response: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
    id: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
    created_at: zod__WEBPACK_IMPORTED_MODULE_2__.z.number(),
    model: zod__WEBPACK_IMPORTED_MODULE_2__.z.string()
  })
});
var responseOutputItemDoneSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
  type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("response.output_item.done"),
  output_index: zod__WEBPACK_IMPORTED_MODULE_2__.z.number(),
  item: zod__WEBPACK_IMPORTED_MODULE_2__.z.discriminatedUnion("type", [
    zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
      type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("message")
    }),
    zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
      type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("function_call"),
      id: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
      call_id: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
      name: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
      arguments: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
      status: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("completed")
    })
  ])
});
var responseFunctionCallArgumentsDeltaSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
  type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("response.function_call_arguments.delta"),
  item_id: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
  output_index: zod__WEBPACK_IMPORTED_MODULE_2__.z.number(),
  delta: zod__WEBPACK_IMPORTED_MODULE_2__.z.string()
});
var responseOutputItemAddedSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
  type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("response.output_item.added"),
  output_index: zod__WEBPACK_IMPORTED_MODULE_2__.z.number(),
  item: zod__WEBPACK_IMPORTED_MODULE_2__.z.discriminatedUnion("type", [
    zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
      type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("message")
    }),
    zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
      type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("function_call"),
      id: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
      call_id: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
      name: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
      arguments: zod__WEBPACK_IMPORTED_MODULE_2__.z.string()
    })
  ])
});
var responseAnnotationAddedSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
  type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("response.output_text.annotation.added"),
  annotation: zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
    type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("url_citation"),
    url: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
    title: zod__WEBPACK_IMPORTED_MODULE_2__.z.string()
  })
});
var responseReasoningSummaryTextDeltaSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
  type: zod__WEBPACK_IMPORTED_MODULE_2__.z.literal("response.reasoning_summary_text.delta"),
  item_id: zod__WEBPACK_IMPORTED_MODULE_2__.z.string(),
  output_index: zod__WEBPACK_IMPORTED_MODULE_2__.z.number(),
  summary_index: zod__WEBPACK_IMPORTED_MODULE_2__.z.number(),
  delta: zod__WEBPACK_IMPORTED_MODULE_2__.z.string()
});
var openaiResponsesChunkSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.union([
  textDeltaChunkSchema,
  responseFinishedChunkSchema,
  responseCreatedChunkSchema,
  responseOutputItemDoneSchema,
  responseFunctionCallArgumentsDeltaSchema,
  responseOutputItemAddedSchema,
  responseAnnotationAddedSchema,
  responseReasoningSummaryTextDeltaSchema,
  zod__WEBPACK_IMPORTED_MODULE_2__.z.object({ type: zod__WEBPACK_IMPORTED_MODULE_2__.z.string() }).passthrough()
  // fallback for unknown chunks
]);
function isTextDeltaChunk(chunk) {
  return chunk.type === "response.output_text.delta";
}
function isResponseOutputItemDoneChunk(chunk) {
  return chunk.type === "response.output_item.done";
}
function isResponseFinishedChunk(chunk) {
  return chunk.type === "response.completed" || chunk.type === "response.incomplete";
}
function isResponseCreatedChunk(chunk) {
  return chunk.type === "response.created";
}
function isResponseFunctionCallArgumentsDeltaChunk(chunk) {
  return chunk.type === "response.function_call_arguments.delta";
}
function isResponseOutputItemAddedChunk(chunk) {
  return chunk.type === "response.output_item.added";
}
function isResponseAnnotationAddedChunk(chunk) {
  return chunk.type === "response.output_text.annotation.added";
}
function isResponseReasoningSummaryTextDeltaChunk(chunk) {
  return chunk.type === "response.reasoning_summary_text.delta";
}
function getResponsesModelConfig(modelId) {
  if (modelId.startsWith("o")) {
    if (modelId.startsWith("o1-mini") || modelId.startsWith("o1-preview")) {
      return {
        isReasoningModel: true,
        systemMessageMode: "remove",
        requiredAutoTruncation: false
      };
    }
    return {
      isReasoningModel: true,
      systemMessageMode: "developer",
      requiredAutoTruncation: false
    };
  }
  return {
    isReasoningModel: false,
    systemMessageMode: "system",
    requiredAutoTruncation: false
  };
}
var openaiResponsesProviderOptionsSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
  metadata: zod__WEBPACK_IMPORTED_MODULE_2__.z.any().nullish(),
  parallelToolCalls: zod__WEBPACK_IMPORTED_MODULE_2__.z.boolean().nullish(),
  previousResponseId: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
  store: zod__WEBPACK_IMPORTED_MODULE_2__.z.boolean().nullish(),
  user: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
  reasoningEffort: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
  strictSchemas: zod__WEBPACK_IMPORTED_MODULE_2__.z.boolean().nullish(),
  instructions: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
  reasoningSummary: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish()
});

// src/openai-tools.ts

var WebSearchPreviewParameters = zod__WEBPACK_IMPORTED_MODULE_2__.z.object({});
function webSearchPreviewTool({
  searchContextSize,
  userLocation
} = {}) {
  return {
    type: "provider-defined",
    id: "openai.web_search_preview",
    args: {
      searchContextSize,
      userLocation
    },
    parameters: WebSearchPreviewParameters
  };
}
var openaiTools = {
  webSearchPreview: webSearchPreviewTool
};

// src/openai-speech-model.ts


var OpenAIProviderOptionsSchema = zod__WEBPACK_IMPORTED_MODULE_2__.z.object({
  instructions: zod__WEBPACK_IMPORTED_MODULE_2__.z.string().nullish(),
  speed: zod__WEBPACK_IMPORTED_MODULE_2__.z.number().min(0.25).max(4).default(1).nullish()
});
var OpenAISpeechModel = class {
  constructor(modelId, config) {
    this.modelId = modelId;
    this.config = config;
    this.specificationVersion = "v1";
  }
  get provider() {
    return this.config.provider;
  }
  getArgs({
    text,
    voice = "alloy",
    outputFormat = "mp3",
    speed,
    instructions,
    providerOptions
  }) {
    const warnings = [];
    const openAIOptions = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.parseProviderOptions)({
      provider: "openai",
      providerOptions,
      schema: OpenAIProviderOptionsSchema
    });
    const requestBody = {
      model: this.modelId,
      input: text,
      voice,
      response_format: "mp3",
      speed,
      instructions
    };
    if (outputFormat) {
      if (["mp3", "opus", "aac", "flac", "wav", "pcm"].includes(outputFormat)) {
        requestBody.response_format = outputFormat;
      } else {
        warnings.push({
          type: "unsupported-setting",
          setting: "outputFormat",
          details: `Unsupported output format: ${outputFormat}. Using mp3 instead.`
        });
      }
    }
    if (openAIOptions) {
      const speechModelOptions = {};
      for (const key in speechModelOptions) {
        const value = speechModelOptions[key];
        if (value !== void 0) {
          requestBody[key] = value;
        }
      }
    }
    return {
      requestBody,
      warnings
    };
  }
  async doGenerate(options) {
    var _a, _b, _c;
    const currentDate = (_c = (_b = (_a = this.config._internal) == null ? void 0 : _a.currentDate) == null ? void 0 : _b.call(_a)) != null ? _c : /* @__PURE__ */ new Date();
    const { requestBody, warnings } = this.getArgs(options);
    const {
      value: audio,
      responseHeaders,
      rawValue: rawResponse
    } = await (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.postJsonToApi)({
      url: this.config.url({
        path: "/audio/speech",
        modelId: this.modelId
      }),
      headers: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.combineHeaders)(this.config.headers(), options.headers),
      body: requestBody,
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.createBinaryResponseHandler)(),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    return {
      audio,
      warnings,
      request: {
        body: JSON.stringify(requestBody)
      },
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders,
        body: rawResponse
      }
    };
  }
};

// src/openai-provider.ts
function createOpenAI(options = {}) {
  var _a, _b, _c;
  const baseURL = (_a = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.withoutTrailingSlash)(options.baseURL)) != null ? _a : "https://api.openai.com/v1";
  const compatibility = (_b = options.compatibility) != null ? _b : "compatible";
  const providerName = (_c = options.name) != null ? _c : "openai";
  const getHeaders = () => ({
    Authorization: `Bearer ${(0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.loadApiKey)({
      apiKey: options.apiKey,
      environmentVariableName: "OPENAI_API_KEY",
      description: "OpenAI"
    })}`,
    "OpenAI-Organization": options.organization,
    "OpenAI-Project": options.project,
    ...options.headers
  });
  const createChatModel = (modelId, settings = {}) => new OpenAIChatLanguageModel(modelId, settings, {
    provider: `${providerName}.chat`,
    url: ({ path }) => `${baseURL}${path}`,
    headers: getHeaders,
    compatibility,
    fetch: options.fetch
  });
  const createCompletionModel = (modelId, settings = {}) => new OpenAICompletionLanguageModel(modelId, settings, {
    provider: `${providerName}.completion`,
    url: ({ path }) => `${baseURL}${path}`,
    headers: getHeaders,
    compatibility,
    fetch: options.fetch
  });
  const createEmbeddingModel = (modelId, settings = {}) => new OpenAIEmbeddingModel(modelId, settings, {
    provider: `${providerName}.embedding`,
    url: ({ path }) => `${baseURL}${path}`,
    headers: getHeaders,
    fetch: options.fetch
  });
  const createImageModel = (modelId, settings = {}) => new OpenAIImageModel(modelId, settings, {
    provider: `${providerName}.image`,
    url: ({ path }) => `${baseURL}${path}`,
    headers: getHeaders,
    fetch: options.fetch
  });
  const createTranscriptionModel = (modelId) => new OpenAITranscriptionModel(modelId, {
    provider: `${providerName}.transcription`,
    url: ({ path }) => `${baseURL}${path}`,
    headers: getHeaders,
    fetch: options.fetch
  });
  const createSpeechModel = (modelId) => new OpenAISpeechModel(modelId, {
    provider: `${providerName}.speech`,
    url: ({ path }) => `${baseURL}${path}`,
    headers: getHeaders,
    fetch: options.fetch
  });
  const createLanguageModel = (modelId, settings) => {
    if (new.target) {
      throw new Error(
        "The OpenAI model function cannot be called with the new keyword."
      );
    }
    if (modelId === "gpt-3.5-turbo-instruct") {
      return createCompletionModel(
        modelId,
        settings
      );
    }
    return createChatModel(modelId, settings);
  };
  const createResponsesModel = (modelId) => {
    return new OpenAIResponsesLanguageModel(modelId, {
      provider: `${providerName}.responses`,
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch
    });
  };
  const provider = function(modelId, settings) {
    return createLanguageModel(modelId, settings);
  };
  provider.languageModel = createLanguageModel;
  provider.chat = createChatModel;
  provider.completion = createCompletionModel;
  provider.responses = createResponsesModel;
  provider.embedding = createEmbeddingModel;
  provider.textEmbedding = createEmbeddingModel;
  provider.textEmbeddingModel = createEmbeddingModel;
  provider.image = createImageModel;
  provider.imageModel = createImageModel;
  provider.transcription = createTranscriptionModel;
  provider.transcriptionModel = createTranscriptionModel;
  provider.speech = createSpeechModel;
  provider.speechModel = createSpeechModel;
  provider.tools = openaiTools;
  return provider;
}
var openai = createOpenAI({
  compatibility: "strict"
  // strict for OpenAI API
});

//# sourceMappingURL=index.mjs.map

/***/ }),

/***/ "./node_modules/@ai-sdk/provider-utils/dist/index.mjs":
/*!************************************************************!*\
  !*** ./node_modules/@ai-sdk/provider-utils/dist/index.mjs ***!
  \************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   asValidator: () => (/* binding */ asValidator),
/* harmony export */   combineHeaders: () => (/* binding */ combineHeaders),
/* harmony export */   convertAsyncIteratorToReadableStream: () => (/* binding */ convertAsyncIteratorToReadableStream),
/* harmony export */   convertBase64ToUint8Array: () => (/* binding */ convertBase64ToUint8Array),
/* harmony export */   convertUint8ArrayToBase64: () => (/* binding */ convertUint8ArrayToBase64),
/* harmony export */   createBinaryResponseHandler: () => (/* binding */ createBinaryResponseHandler),
/* harmony export */   createEventSourceParserStream: () => (/* binding */ createEventSourceParserStream),
/* harmony export */   createEventSourceResponseHandler: () => (/* binding */ createEventSourceResponseHandler),
/* harmony export */   createIdGenerator: () => (/* binding */ createIdGenerator),
/* harmony export */   createJsonErrorResponseHandler: () => (/* binding */ createJsonErrorResponseHandler),
/* harmony export */   createJsonResponseHandler: () => (/* binding */ createJsonResponseHandler),
/* harmony export */   createJsonStreamResponseHandler: () => (/* binding */ createJsonStreamResponseHandler),
/* harmony export */   createStatusCodeErrorResponseHandler: () => (/* binding */ createStatusCodeErrorResponseHandler),
/* harmony export */   delay: () => (/* binding */ delay),
/* harmony export */   extractResponseHeaders: () => (/* binding */ extractResponseHeaders),
/* harmony export */   generateId: () => (/* binding */ generateId),
/* harmony export */   getErrorMessage: () => (/* binding */ getErrorMessage),
/* harmony export */   getFromApi: () => (/* binding */ getFromApi),
/* harmony export */   isAbortError: () => (/* binding */ isAbortError),
/* harmony export */   isParsableJson: () => (/* binding */ isParsableJson),
/* harmony export */   isValidator: () => (/* binding */ isValidator),
/* harmony export */   loadApiKey: () => (/* binding */ loadApiKey),
/* harmony export */   loadOptionalSetting: () => (/* binding */ loadOptionalSetting),
/* harmony export */   loadSetting: () => (/* binding */ loadSetting),
/* harmony export */   parseJSON: () => (/* binding */ parseJSON),
/* harmony export */   parseProviderOptions: () => (/* binding */ parseProviderOptions),
/* harmony export */   postFormDataToApi: () => (/* binding */ postFormDataToApi),
/* harmony export */   postJsonToApi: () => (/* binding */ postJsonToApi),
/* harmony export */   postToApi: () => (/* binding */ postToApi),
/* harmony export */   removeUndefinedEntries: () => (/* binding */ removeUndefinedEntries),
/* harmony export */   resolve: () => (/* binding */ resolve),
/* harmony export */   safeParseJSON: () => (/* binding */ safeParseJSON),
/* harmony export */   safeValidateTypes: () => (/* binding */ safeValidateTypes),
/* harmony export */   validateTypes: () => (/* binding */ validateTypes),
/* harmony export */   validator: () => (/* binding */ validator),
/* harmony export */   validatorSymbol: () => (/* binding */ validatorSymbol),
/* harmony export */   withoutTrailingSlash: () => (/* binding */ withoutTrailingSlash),
/* harmony export */   zodValidator: () => (/* binding */ zodValidator)
/* harmony export */ });
/* harmony import */ var _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @ai-sdk/provider */ "./node_modules/@ai-sdk/provider/dist/index.mjs");
/* harmony import */ var nanoid_non_secure__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! nanoid/non-secure */ "./node_modules/nanoid/non-secure/index.js");
/* harmony import */ var secure_json_parse__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! secure-json-parse */ "./node_modules/secure-json-parse/index.js");
// src/combine-headers.ts
function combineHeaders(...headers) {
  return headers.reduce(
    (combinedHeaders, currentHeaders) => ({
      ...combinedHeaders,
      ...currentHeaders != null ? currentHeaders : {}
    }),
    {}
  );
}

// src/convert-async-iterator-to-readable-stream.ts
function convertAsyncIteratorToReadableStream(iterator) {
  return new ReadableStream({
    /**
     * Called when the consumer wants to pull more data from the stream.
     *
     * @param {ReadableStreamDefaultController<T>} controller - The controller to enqueue data into the stream.
     * @returns {Promise<void>}
     */
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (error) {
        controller.error(error);
      }
    },
    /**
     * Called when the consumer cancels the stream.
     */
    cancel() {
    }
  });
}

// src/delay.ts
async function delay(delayInMs) {
  return delayInMs == null ? Promise.resolve() : new Promise((resolve2) => setTimeout(resolve2, delayInMs));
}

// src/event-source-parser-stream.ts
function createEventSourceParserStream() {
  let buffer = "";
  let event = void 0;
  let data = [];
  let lastEventId = void 0;
  let retry = void 0;
  function parseLine(line, controller) {
    if (line === "") {
      dispatchEvent(controller);
      return;
    }
    if (line.startsWith(":")) {
      return;
    }
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) {
      handleField(line, "");
      return;
    }
    const field = line.slice(0, colonIndex);
    const valueStart = colonIndex + 1;
    const value = valueStart < line.length && line[valueStart] === " " ? line.slice(valueStart + 1) : line.slice(valueStart);
    handleField(field, value);
  }
  function dispatchEvent(controller) {
    if (data.length > 0) {
      controller.enqueue({
        event,
        data: data.join("\n"),
        id: lastEventId,
        retry
      });
      data = [];
      event = void 0;
      retry = void 0;
    }
  }
  function handleField(field, value) {
    switch (field) {
      case "event":
        event = value;
        break;
      case "data":
        data.push(value);
        break;
      case "id":
        lastEventId = value;
        break;
      case "retry":
        const parsedRetry = parseInt(value, 10);
        if (!isNaN(parsedRetry)) {
          retry = parsedRetry;
        }
        break;
    }
  }
  return new TransformStream({
    transform(chunk, controller) {
      const { lines, incompleteLine } = splitLines(buffer, chunk);
      buffer = incompleteLine;
      for (let i = 0; i < lines.length; i++) {
        parseLine(lines[i], controller);
      }
    },
    flush(controller) {
      parseLine(buffer, controller);
      dispatchEvent(controller);
    }
  });
}
function splitLines(buffer, chunk) {
  const lines = [];
  let currentLine = buffer;
  for (let i = 0; i < chunk.length; ) {
    const char = chunk[i++];
    if (char === "\n") {
      lines.push(currentLine);
      currentLine = "";
    } else if (char === "\r") {
      lines.push(currentLine);
      currentLine = "";
      if (chunk[i + 1] === "\n") {
        i++;
      }
    } else {
      currentLine += char;
    }
  }
  return { lines, incompleteLine: currentLine };
}

// src/extract-response-headers.ts
function extractResponseHeaders(response) {
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

// src/generate-id.ts


var createIdGenerator = ({
  prefix,
  size: defaultSize = 16,
  alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  separator = "-"
} = {}) => {
  const generator = (0,nanoid_non_secure__WEBPACK_IMPORTED_MODULE_0__.customAlphabet)(alphabet, defaultSize);
  if (prefix == null) {
    return generator;
  }
  if (alphabet.includes(separator)) {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.InvalidArgumentError({
      argument: "separator",
      message: `The separator "${separator}" must not be part of the alphabet "${alphabet}".`
    });
  }
  return (size) => `${prefix}${separator}${generator(size)}`;
};
var generateId = createIdGenerator();

// src/get-error-message.ts
function getErrorMessage(error) {
  if (error == null) {
    return "unknown error";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return JSON.stringify(error);
}

// src/get-from-api.ts


// src/remove-undefined-entries.ts
function removeUndefinedEntries(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([_key, value]) => value != null)
  );
}

// src/is-abort-error.ts
function isAbortError(error) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

// src/get-from-api.ts
var getOriginalFetch = () => globalThis.fetch;
var getFromApi = async ({
  url,
  headers = {},
  successfulResponseHandler,
  failedResponseHandler,
  abortSignal,
  fetch = getOriginalFetch()
}) => {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: removeUndefinedEntries(headers),
      signal: abortSignal
    });
    const responseHeaders = extractResponseHeaders(response);
    if (!response.ok) {
      let errorInformation;
      try {
        errorInformation = await failedResponseHandler({
          response,
          url,
          requestBodyValues: {}
        });
      } catch (error) {
        if (isAbortError(error) || _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.APICallError.isInstance(error)) {
          throw error;
        }
        throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.APICallError({
          message: "Failed to process error response",
          cause: error,
          statusCode: response.status,
          url,
          responseHeaders,
          requestBodyValues: {}
        });
      }
      throw errorInformation.value;
    }
    try {
      return await successfulResponseHandler({
        response,
        url,
        requestBodyValues: {}
      });
    } catch (error) {
      if (error instanceof Error) {
        if (isAbortError(error) || _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.APICallError.isInstance(error)) {
          throw error;
        }
      }
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.APICallError({
        message: "Failed to process successful response",
        cause: error,
        statusCode: response.status,
        url,
        responseHeaders,
        requestBodyValues: {}
      });
    }
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    if (error instanceof TypeError && error.message === "fetch failed") {
      const cause = error.cause;
      if (cause != null) {
        throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.APICallError({
          message: `Cannot connect to API: ${cause.message}`,
          cause,
          url,
          isRetryable: true,
          requestBodyValues: {}
        });
      }
    }
    throw error;
  }
};

// src/load-api-key.ts

function loadApiKey({
  apiKey,
  environmentVariableName,
  apiKeyParameterName = "apiKey",
  description
}) {
  if (typeof apiKey === "string") {
    return apiKey;
  }
  if (apiKey != null) {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.LoadAPIKeyError({
      message: `${description} API key must be a string.`
    });
  }
  if (typeof process === "undefined") {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.LoadAPIKeyError({
      message: `${description} API key is missing. Pass it using the '${apiKeyParameterName}' parameter. Environment variables is not supported in this environment.`
    });
  }
  apiKey = process.env[environmentVariableName];
  if (apiKey == null) {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.LoadAPIKeyError({
      message: `${description} API key is missing. Pass it using the '${apiKeyParameterName}' parameter or the ${environmentVariableName} environment variable.`
    });
  }
  if (typeof apiKey !== "string") {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.LoadAPIKeyError({
      message: `${description} API key must be a string. The value of the ${environmentVariableName} environment variable is not a string.`
    });
  }
  return apiKey;
}

// src/load-optional-setting.ts
function loadOptionalSetting({
  settingValue,
  environmentVariableName
}) {
  if (typeof settingValue === "string") {
    return settingValue;
  }
  if (settingValue != null || typeof process === "undefined") {
    return void 0;
  }
  settingValue = process.env[environmentVariableName];
  if (settingValue == null || typeof settingValue !== "string") {
    return void 0;
  }
  return settingValue;
}

// src/load-setting.ts

function loadSetting({
  settingValue,
  environmentVariableName,
  settingName,
  description
}) {
  if (typeof settingValue === "string") {
    return settingValue;
  }
  if (settingValue != null) {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.LoadSettingError({
      message: `${description} setting must be a string.`
    });
  }
  if (typeof process === "undefined") {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.LoadSettingError({
      message: `${description} setting is missing. Pass it using the '${settingName}' parameter. Environment variables is not supported in this environment.`
    });
  }
  settingValue = process.env[environmentVariableName];
  if (settingValue == null) {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.LoadSettingError({
      message: `${description} setting is missing. Pass it using the '${settingName}' parameter or the ${environmentVariableName} environment variable.`
    });
  }
  if (typeof settingValue !== "string") {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.LoadSettingError({
      message: `${description} setting must be a string. The value of the ${environmentVariableName} environment variable is not a string.`
    });
  }
  return settingValue;
}

// src/parse-json.ts



// src/validate-types.ts


// src/validator.ts
var validatorSymbol = Symbol.for("vercel.ai.validator");
function validator(validate) {
  return { [validatorSymbol]: true, validate };
}
function isValidator(value) {
  return typeof value === "object" && value !== null && validatorSymbol in value && value[validatorSymbol] === true && "validate" in value;
}
function asValidator(value) {
  return isValidator(value) ? value : zodValidator(value);
}
function zodValidator(zodSchema) {
  return validator((value) => {
    const result = zodSchema.safeParse(value);
    return result.success ? { success: true, value: result.data } : { success: false, error: result.error };
  });
}

// src/validate-types.ts
function validateTypes({
  value,
  schema: inputSchema
}) {
  const result = safeValidateTypes({ value, schema: inputSchema });
  if (!result.success) {
    throw _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.TypeValidationError.wrap({ value, cause: result.error });
  }
  return result.value;
}
function safeValidateTypes({
  value,
  schema
}) {
  const validator2 = asValidator(schema);
  try {
    if (validator2.validate == null) {
      return { success: true, value };
    }
    const result = validator2.validate(value);
    if (result.success) {
      return result;
    }
    return {
      success: false,
      error: _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.TypeValidationError.wrap({ value, cause: result.error })
    };
  } catch (error) {
    return {
      success: false,
      error: _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.TypeValidationError.wrap({ value, cause: error })
    };
  }
}

// src/parse-json.ts
function parseJSON({
  text,
  schema
}) {
  try {
    const value = secure_json_parse__WEBPACK_IMPORTED_MODULE_2__.parse(text);
    if (schema == null) {
      return value;
    }
    return validateTypes({ value, schema });
  } catch (error) {
    if (_ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.JSONParseError.isInstance(error) || _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.TypeValidationError.isInstance(error)) {
      throw error;
    }
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.JSONParseError({ text, cause: error });
  }
}
function safeParseJSON({
  text,
  schema
}) {
  try {
    const value = secure_json_parse__WEBPACK_IMPORTED_MODULE_2__.parse(text);
    if (schema == null) {
      return { success: true, value, rawValue: value };
    }
    const validationResult = safeValidateTypes({ value, schema });
    return validationResult.success ? { ...validationResult, rawValue: value } : validationResult;
  } catch (error) {
    return {
      success: false,
      error: _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.JSONParseError.isInstance(error) ? error : new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.JSONParseError({ text, cause: error })
    };
  }
}
function isParsableJson(input) {
  try {
    secure_json_parse__WEBPACK_IMPORTED_MODULE_2__.parse(input);
    return true;
  } catch (e) {
    return false;
  }
}

// src/parse-provider-options.ts

function parseProviderOptions({
  provider,
  providerOptions,
  schema
}) {
  if ((providerOptions == null ? void 0 : providerOptions[provider]) == null) {
    return void 0;
  }
  const parsedProviderOptions = safeValidateTypes({
    value: providerOptions[provider],
    schema
  });
  if (!parsedProviderOptions.success) {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.InvalidArgumentError({
      argument: "providerOptions",
      message: `invalid ${provider} provider options`,
      cause: parsedProviderOptions.error
    });
  }
  return parsedProviderOptions.value;
}

// src/post-to-api.ts

var getOriginalFetch2 = () => globalThis.fetch;
var postJsonToApi = async ({
  url,
  headers,
  body,
  failedResponseHandler,
  successfulResponseHandler,
  abortSignal,
  fetch
}) => postToApi({
  url,
  headers: {
    "Content-Type": "application/json",
    ...headers
  },
  body: {
    content: JSON.stringify(body),
    values: body
  },
  failedResponseHandler,
  successfulResponseHandler,
  abortSignal,
  fetch
});
var postFormDataToApi = async ({
  url,
  headers,
  formData,
  failedResponseHandler,
  successfulResponseHandler,
  abortSignal,
  fetch
}) => postToApi({
  url,
  headers,
  body: {
    content: formData,
    values: Object.fromEntries(formData.entries())
  },
  failedResponseHandler,
  successfulResponseHandler,
  abortSignal,
  fetch
});
var postToApi = async ({
  url,
  headers = {},
  body,
  successfulResponseHandler,
  failedResponseHandler,
  abortSignal,
  fetch = getOriginalFetch2()
}) => {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: removeUndefinedEntries(headers),
      body: body.content,
      signal: abortSignal
    });
    const responseHeaders = extractResponseHeaders(response);
    if (!response.ok) {
      let errorInformation;
      try {
        errorInformation = await failedResponseHandler({
          response,
          url,
          requestBodyValues: body.values
        });
      } catch (error) {
        if (isAbortError(error) || _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.APICallError.isInstance(error)) {
          throw error;
        }
        throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.APICallError({
          message: "Failed to process error response",
          cause: error,
          statusCode: response.status,
          url,
          responseHeaders,
          requestBodyValues: body.values
        });
      }
      throw errorInformation.value;
    }
    try {
      return await successfulResponseHandler({
        response,
        url,
        requestBodyValues: body.values
      });
    } catch (error) {
      if (error instanceof Error) {
        if (isAbortError(error) || _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.APICallError.isInstance(error)) {
          throw error;
        }
      }
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.APICallError({
        message: "Failed to process successful response",
        cause: error,
        statusCode: response.status,
        url,
        responseHeaders,
        requestBodyValues: body.values
      });
    }
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    if (error instanceof TypeError && error.message === "fetch failed") {
      const cause = error.cause;
      if (cause != null) {
        throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.APICallError({
          message: `Cannot connect to API: ${cause.message}`,
          cause,
          url,
          requestBodyValues: body.values,
          isRetryable: true
          // retry when network error
        });
      }
    }
    throw error;
  }
};

// src/resolve.ts
async function resolve(value) {
  if (typeof value === "function") {
    value = value();
  }
  return Promise.resolve(value);
}

// src/response-handler.ts

var createJsonErrorResponseHandler = ({
  errorSchema,
  errorToMessage,
  isRetryable
}) => async ({ response, url, requestBodyValues }) => {
  const responseBody = await response.text();
  const responseHeaders = extractResponseHeaders(response);
  if (responseBody.trim() === "") {
    return {
      responseHeaders,
      value: new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.APICallError({
        message: response.statusText,
        url,
        requestBodyValues,
        statusCode: response.status,
        responseHeaders,
        responseBody,
        isRetryable: isRetryable == null ? void 0 : isRetryable(response)
      })
    };
  }
  try {
    const parsedError = parseJSON({
      text: responseBody,
      schema: errorSchema
    });
    return {
      responseHeaders,
      value: new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.APICallError({
        message: errorToMessage(parsedError),
        url,
        requestBodyValues,
        statusCode: response.status,
        responseHeaders,
        responseBody,
        data: parsedError,
        isRetryable: isRetryable == null ? void 0 : isRetryable(response, parsedError)
      })
    };
  } catch (parseError) {
    return {
      responseHeaders,
      value: new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.APICallError({
        message: response.statusText,
        url,
        requestBodyValues,
        statusCode: response.status,
        responseHeaders,
        responseBody,
        isRetryable: isRetryable == null ? void 0 : isRetryable(response)
      })
    };
  }
};
var createEventSourceResponseHandler = (chunkSchema) => async ({ response }) => {
  const responseHeaders = extractResponseHeaders(response);
  if (response.body == null) {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.EmptyResponseBodyError({});
  }
  return {
    responseHeaders,
    value: response.body.pipeThrough(new TextDecoderStream()).pipeThrough(createEventSourceParserStream()).pipeThrough(
      new TransformStream({
        transform({ data }, controller) {
          if (data === "[DONE]") {
            return;
          }
          controller.enqueue(
            safeParseJSON({
              text: data,
              schema: chunkSchema
            })
          );
        }
      })
    )
  };
};
var createJsonStreamResponseHandler = (chunkSchema) => async ({ response }) => {
  const responseHeaders = extractResponseHeaders(response);
  if (response.body == null) {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.EmptyResponseBodyError({});
  }
  let buffer = "";
  return {
    responseHeaders,
    value: response.body.pipeThrough(new TextDecoderStream()).pipeThrough(
      new TransformStream({
        transform(chunkText, controller) {
          if (chunkText.endsWith("\n")) {
            controller.enqueue(
              safeParseJSON({
                text: buffer + chunkText,
                schema: chunkSchema
              })
            );
            buffer = "";
          } else {
            buffer += chunkText;
          }
        }
      })
    )
  };
};
var createJsonResponseHandler = (responseSchema) => async ({ response, url, requestBodyValues }) => {
  const responseBody = await response.text();
  const parsedResult = safeParseJSON({
    text: responseBody,
    schema: responseSchema
  });
  const responseHeaders = extractResponseHeaders(response);
  if (!parsedResult.success) {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.APICallError({
      message: "Invalid JSON response",
      cause: parsedResult.error,
      statusCode: response.status,
      responseHeaders,
      responseBody,
      url,
      requestBodyValues
    });
  }
  return {
    responseHeaders,
    value: parsedResult.value,
    rawValue: parsedResult.rawValue
  };
};
var createBinaryResponseHandler = () => async ({ response, url, requestBodyValues }) => {
  const responseHeaders = extractResponseHeaders(response);
  if (!response.body) {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.APICallError({
      message: "Response body is empty",
      url,
      requestBodyValues,
      statusCode: response.status,
      responseHeaders,
      responseBody: void 0
    });
  }
  try {
    const buffer = await response.arrayBuffer();
    return {
      responseHeaders,
      value: new Uint8Array(buffer)
    };
  } catch (error) {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.APICallError({
      message: "Failed to read response as array buffer",
      url,
      requestBodyValues,
      statusCode: response.status,
      responseHeaders,
      responseBody: void 0,
      cause: error
    });
  }
};
var createStatusCodeErrorResponseHandler = () => async ({ response, url, requestBodyValues }) => {
  const responseHeaders = extractResponseHeaders(response);
  const responseBody = await response.text();
  return {
    responseHeaders,
    value: new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.APICallError({
      message: response.statusText,
      url,
      requestBodyValues,
      statusCode: response.status,
      responseHeaders,
      responseBody
    })
  };
};

// src/uint8-utils.ts
var { btoa, atob } = globalThis;
function convertBase64ToUint8Array(base64String) {
  const base64Url = base64String.replace(/-/g, "+").replace(/_/g, "/");
  const latin1string = atob(base64Url);
  return Uint8Array.from(latin1string, (byte) => byte.codePointAt(0));
}
function convertUint8ArrayToBase64(array) {
  let latin1string = "";
  for (let i = 0; i < array.length; i++) {
    latin1string += String.fromCodePoint(array[i]);
  }
  return btoa(latin1string);
}

// src/without-trailing-slash.ts
function withoutTrailingSlash(url) {
  return url == null ? void 0 : url.replace(/\/$/, "");
}

//# sourceMappingURL=index.mjs.map

/***/ }),

/***/ "./node_modules/@ai-sdk/provider/dist/index.mjs":
/*!******************************************************!*\
  !*** ./node_modules/@ai-sdk/provider/dist/index.mjs ***!
  \******************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AISDKError: () => (/* binding */ AISDKError),
/* harmony export */   APICallError: () => (/* binding */ APICallError),
/* harmony export */   EmptyResponseBodyError: () => (/* binding */ EmptyResponseBodyError),
/* harmony export */   InvalidArgumentError: () => (/* binding */ InvalidArgumentError),
/* harmony export */   InvalidPromptError: () => (/* binding */ InvalidPromptError),
/* harmony export */   InvalidResponseDataError: () => (/* binding */ InvalidResponseDataError),
/* harmony export */   JSONParseError: () => (/* binding */ JSONParseError),
/* harmony export */   LoadAPIKeyError: () => (/* binding */ LoadAPIKeyError),
/* harmony export */   LoadSettingError: () => (/* binding */ LoadSettingError),
/* harmony export */   NoContentGeneratedError: () => (/* binding */ NoContentGeneratedError),
/* harmony export */   NoSuchModelError: () => (/* binding */ NoSuchModelError),
/* harmony export */   TooManyEmbeddingValuesForCallError: () => (/* binding */ TooManyEmbeddingValuesForCallError),
/* harmony export */   TypeValidationError: () => (/* binding */ TypeValidationError),
/* harmony export */   UnsupportedFunctionalityError: () => (/* binding */ UnsupportedFunctionalityError),
/* harmony export */   getErrorMessage: () => (/* binding */ getErrorMessage),
/* harmony export */   isJSONArray: () => (/* binding */ isJSONArray),
/* harmony export */   isJSONObject: () => (/* binding */ isJSONObject),
/* harmony export */   isJSONValue: () => (/* binding */ isJSONValue)
/* harmony export */ });
// src/errors/ai-sdk-error.ts
var marker = "vercel.ai.error";
var symbol = Symbol.for(marker);
var _a;
var _AISDKError = class _AISDKError extends Error {
  /**
   * Creates an AI SDK Error.
   *
   * @param {Object} params - The parameters for creating the error.
   * @param {string} params.name - The name of the error.
   * @param {string} params.message - The error message.
   * @param {unknown} [params.cause] - The underlying cause of the error.
   */
  constructor({
    name: name14,
    message,
    cause
  }) {
    super(message);
    this[_a] = true;
    this.name = name14;
    this.cause = cause;
  }
  /**
   * Checks if the given error is an AI SDK Error.
   * @param {unknown} error - The error to check.
   * @returns {boolean} True if the error is an AI SDK Error, false otherwise.
   */
  static isInstance(error) {
    return _AISDKError.hasMarker(error, marker);
  }
  static hasMarker(error, marker15) {
    const markerSymbol = Symbol.for(marker15);
    return error != null && typeof error === "object" && markerSymbol in error && typeof error[markerSymbol] === "boolean" && error[markerSymbol] === true;
  }
};
_a = symbol;
var AISDKError = _AISDKError;

// src/errors/api-call-error.ts
var name = "AI_APICallError";
var marker2 = `vercel.ai.error.${name}`;
var symbol2 = Symbol.for(marker2);
var _a2;
var APICallError = class extends AISDKError {
  constructor({
    message,
    url,
    requestBodyValues,
    statusCode,
    responseHeaders,
    responseBody,
    cause,
    isRetryable = statusCode != null && (statusCode === 408 || // request timeout
    statusCode === 409 || // conflict
    statusCode === 429 || // too many requests
    statusCode >= 500),
    // server error
    data
  }) {
    super({ name, message, cause });
    this[_a2] = true;
    this.url = url;
    this.requestBodyValues = requestBodyValues;
    this.statusCode = statusCode;
    this.responseHeaders = responseHeaders;
    this.responseBody = responseBody;
    this.isRetryable = isRetryable;
    this.data = data;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker2);
  }
};
_a2 = symbol2;

// src/errors/empty-response-body-error.ts
var name2 = "AI_EmptyResponseBodyError";
var marker3 = `vercel.ai.error.${name2}`;
var symbol3 = Symbol.for(marker3);
var _a3;
var EmptyResponseBodyError = class extends AISDKError {
  // used in isInstance
  constructor({ message = "Empty response body" } = {}) {
    super({ name: name2, message });
    this[_a3] = true;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker3);
  }
};
_a3 = symbol3;

// src/errors/get-error-message.ts
function getErrorMessage(error) {
  if (error == null) {
    return "unknown error";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return JSON.stringify(error);
}

// src/errors/invalid-argument-error.ts
var name3 = "AI_InvalidArgumentError";
var marker4 = `vercel.ai.error.${name3}`;
var symbol4 = Symbol.for(marker4);
var _a4;
var InvalidArgumentError = class extends AISDKError {
  constructor({
    message,
    cause,
    argument
  }) {
    super({ name: name3, message, cause });
    this[_a4] = true;
    this.argument = argument;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker4);
  }
};
_a4 = symbol4;

// src/errors/invalid-prompt-error.ts
var name4 = "AI_InvalidPromptError";
var marker5 = `vercel.ai.error.${name4}`;
var symbol5 = Symbol.for(marker5);
var _a5;
var InvalidPromptError = class extends AISDKError {
  constructor({
    prompt,
    message,
    cause
  }) {
    super({ name: name4, message: `Invalid prompt: ${message}`, cause });
    this[_a5] = true;
    this.prompt = prompt;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker5);
  }
};
_a5 = symbol5;

// src/errors/invalid-response-data-error.ts
var name5 = "AI_InvalidResponseDataError";
var marker6 = `vercel.ai.error.${name5}`;
var symbol6 = Symbol.for(marker6);
var _a6;
var InvalidResponseDataError = class extends AISDKError {
  constructor({
    data,
    message = `Invalid response data: ${JSON.stringify(data)}.`
  }) {
    super({ name: name5, message });
    this[_a6] = true;
    this.data = data;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker6);
  }
};
_a6 = symbol6;

// src/errors/json-parse-error.ts
var name6 = "AI_JSONParseError";
var marker7 = `vercel.ai.error.${name6}`;
var symbol7 = Symbol.for(marker7);
var _a7;
var JSONParseError = class extends AISDKError {
  constructor({ text, cause }) {
    super({
      name: name6,
      message: `JSON parsing failed: Text: ${text}.
Error message: ${getErrorMessage(cause)}`,
      cause
    });
    this[_a7] = true;
    this.text = text;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker7);
  }
};
_a7 = symbol7;

// src/errors/load-api-key-error.ts
var name7 = "AI_LoadAPIKeyError";
var marker8 = `vercel.ai.error.${name7}`;
var symbol8 = Symbol.for(marker8);
var _a8;
var LoadAPIKeyError = class extends AISDKError {
  // used in isInstance
  constructor({ message }) {
    super({ name: name7, message });
    this[_a8] = true;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker8);
  }
};
_a8 = symbol8;

// src/errors/load-setting-error.ts
var name8 = "AI_LoadSettingError";
var marker9 = `vercel.ai.error.${name8}`;
var symbol9 = Symbol.for(marker9);
var _a9;
var LoadSettingError = class extends AISDKError {
  // used in isInstance
  constructor({ message }) {
    super({ name: name8, message });
    this[_a9] = true;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker9);
  }
};
_a9 = symbol9;

// src/errors/no-content-generated-error.ts
var name9 = "AI_NoContentGeneratedError";
var marker10 = `vercel.ai.error.${name9}`;
var symbol10 = Symbol.for(marker10);
var _a10;
var NoContentGeneratedError = class extends AISDKError {
  // used in isInstance
  constructor({
    message = "No content generated."
  } = {}) {
    super({ name: name9, message });
    this[_a10] = true;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker10);
  }
};
_a10 = symbol10;

// src/errors/no-such-model-error.ts
var name10 = "AI_NoSuchModelError";
var marker11 = `vercel.ai.error.${name10}`;
var symbol11 = Symbol.for(marker11);
var _a11;
var NoSuchModelError = class extends AISDKError {
  constructor({
    errorName = name10,
    modelId,
    modelType,
    message = `No such ${modelType}: ${modelId}`
  }) {
    super({ name: errorName, message });
    this[_a11] = true;
    this.modelId = modelId;
    this.modelType = modelType;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker11);
  }
};
_a11 = symbol11;

// src/errors/too-many-embedding-values-for-call-error.ts
var name11 = "AI_TooManyEmbeddingValuesForCallError";
var marker12 = `vercel.ai.error.${name11}`;
var symbol12 = Symbol.for(marker12);
var _a12;
var TooManyEmbeddingValuesForCallError = class extends AISDKError {
  constructor(options) {
    super({
      name: name11,
      message: `Too many values for a single embedding call. The ${options.provider} model "${options.modelId}" can only embed up to ${options.maxEmbeddingsPerCall} values per call, but ${options.values.length} values were provided.`
    });
    this[_a12] = true;
    this.provider = options.provider;
    this.modelId = options.modelId;
    this.maxEmbeddingsPerCall = options.maxEmbeddingsPerCall;
    this.values = options.values;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker12);
  }
};
_a12 = symbol12;

// src/errors/type-validation-error.ts
var name12 = "AI_TypeValidationError";
var marker13 = `vercel.ai.error.${name12}`;
var symbol13 = Symbol.for(marker13);
var _a13;
var _TypeValidationError = class _TypeValidationError extends AISDKError {
  constructor({ value, cause }) {
    super({
      name: name12,
      message: `Type validation failed: Value: ${JSON.stringify(value)}.
Error message: ${getErrorMessage(cause)}`,
      cause
    });
    this[_a13] = true;
    this.value = value;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker13);
  }
  /**
   * Wraps an error into a TypeValidationError.
   * If the cause is already a TypeValidationError with the same value, it returns the cause.
   * Otherwise, it creates a new TypeValidationError.
   *
   * @param {Object} params - The parameters for wrapping the error.
   * @param {unknown} params.value - The value that failed validation.
   * @param {unknown} params.cause - The original error or cause of the validation failure.
   * @returns {TypeValidationError} A TypeValidationError instance.
   */
  static wrap({
    value,
    cause
  }) {
    return _TypeValidationError.isInstance(cause) && cause.value === value ? cause : new _TypeValidationError({ value, cause });
  }
};
_a13 = symbol13;
var TypeValidationError = _TypeValidationError;

// src/errors/unsupported-functionality-error.ts
var name13 = "AI_UnsupportedFunctionalityError";
var marker14 = `vercel.ai.error.${name13}`;
var symbol14 = Symbol.for(marker14);
var _a14;
var UnsupportedFunctionalityError = class extends AISDKError {
  constructor({
    functionality,
    message = `'${functionality}' functionality not supported.`
  }) {
    super({ name: name13, message });
    this[_a14] = true;
    this.functionality = functionality;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker14);
  }
};
_a14 = symbol14;

// src/json-value/is-json.ts
function isJSONValue(value) {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isJSONValue);
  }
  if (typeof value === "object") {
    return Object.entries(value).every(
      ([key, val]) => typeof key === "string" && isJSONValue(val)
    );
  }
  return false;
}
function isJSONArray(value) {
  return Array.isArray(value) && value.every(isJSONValue);
}
function isJSONObject(value) {
  return value != null && typeof value === "object" && Object.entries(value).every(
    ([key, val]) => typeof key === "string" && isJSONValue(val)
  );
}

//# sourceMappingURL=index.mjs.map

/***/ }),

/***/ "./node_modules/@ai-sdk/ui-utils/dist/index.mjs":
/*!******************************************************!*\
  !*** ./node_modules/@ai-sdk/ui-utils/dist/index.mjs ***!
  \******************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   asSchema: () => (/* binding */ asSchema),
/* harmony export */   callChatApi: () => (/* binding */ callChatApi),
/* harmony export */   callCompletionApi: () => (/* binding */ callCompletionApi),
/* harmony export */   extractMaxToolInvocationStep: () => (/* binding */ extractMaxToolInvocationStep),
/* harmony export */   fillMessageParts: () => (/* binding */ fillMessageParts),
/* harmony export */   formatAssistantStreamPart: () => (/* binding */ formatAssistantStreamPart),
/* harmony export */   formatDataStreamPart: () => (/* binding */ formatDataStreamPart),
/* harmony export */   generateId: () => (/* reexport safe */ _ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.generateId),
/* harmony export */   getMessageParts: () => (/* binding */ getMessageParts),
/* harmony export */   getTextFromDataUrl: () => (/* binding */ getTextFromDataUrl),
/* harmony export */   isAssistantMessageWithCompletedToolCalls: () => (/* binding */ isAssistantMessageWithCompletedToolCalls),
/* harmony export */   isDeepEqualData: () => (/* binding */ isDeepEqualData),
/* harmony export */   jsonSchema: () => (/* binding */ jsonSchema),
/* harmony export */   parseAssistantStreamPart: () => (/* binding */ parseAssistantStreamPart),
/* harmony export */   parseDataStreamPart: () => (/* binding */ parseDataStreamPart),
/* harmony export */   parsePartialJson: () => (/* binding */ parsePartialJson),
/* harmony export */   prepareAttachmentsForRequest: () => (/* binding */ prepareAttachmentsForRequest),
/* harmony export */   processAssistantStream: () => (/* binding */ processAssistantStream),
/* harmony export */   processDataStream: () => (/* binding */ processDataStream),
/* harmony export */   processTextStream: () => (/* binding */ processTextStream),
/* harmony export */   shouldResubmitMessages: () => (/* binding */ shouldResubmitMessages),
/* harmony export */   updateToolCallResult: () => (/* binding */ updateToolCallResult),
/* harmony export */   zodSchema: () => (/* binding */ zodSchema)
/* harmony export */ });
/* harmony import */ var _ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @ai-sdk/provider-utils */ "./node_modules/@ai-sdk/provider-utils/dist/index.mjs");
/* harmony import */ var zod_to_json_schema__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! zod-to-json-schema */ "./node_modules/zod-to-json-schema/dist/esm/index.js");
// src/index.ts


// src/assistant-stream-parts.ts
var textStreamPart = {
  code: "0",
  name: "text",
  parse: (value) => {
    if (typeof value !== "string") {
      throw new Error('"text" parts expect a string value.');
    }
    return { type: "text", value };
  }
};
var errorStreamPart = {
  code: "3",
  name: "error",
  parse: (value) => {
    if (typeof value !== "string") {
      throw new Error('"error" parts expect a string value.');
    }
    return { type: "error", value };
  }
};
var assistantMessageStreamPart = {
  code: "4",
  name: "assistant_message",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("id" in value) || !("role" in value) || !("content" in value) || typeof value.id !== "string" || typeof value.role !== "string" || value.role !== "assistant" || !Array.isArray(value.content) || !value.content.every(
      (item) => item != null && typeof item === "object" && "type" in item && item.type === "text" && "text" in item && item.text != null && typeof item.text === "object" && "value" in item.text && typeof item.text.value === "string"
    )) {
      throw new Error(
        '"assistant_message" parts expect an object with an "id", "role", and "content" property.'
      );
    }
    return {
      type: "assistant_message",
      value
    };
  }
};
var assistantControlDataStreamPart = {
  code: "5",
  name: "assistant_control_data",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("threadId" in value) || !("messageId" in value) || typeof value.threadId !== "string" || typeof value.messageId !== "string") {
      throw new Error(
        '"assistant_control_data" parts expect an object with a "threadId" and "messageId" property.'
      );
    }
    return {
      type: "assistant_control_data",
      value: {
        threadId: value.threadId,
        messageId: value.messageId
      }
    };
  }
};
var dataMessageStreamPart = {
  code: "6",
  name: "data_message",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("role" in value) || !("data" in value) || typeof value.role !== "string" || value.role !== "data") {
      throw new Error(
        '"data_message" parts expect an object with a "role" and "data" property.'
      );
    }
    return {
      type: "data_message",
      value
    };
  }
};
var assistantStreamParts = [
  textStreamPart,
  errorStreamPart,
  assistantMessageStreamPart,
  assistantControlDataStreamPart,
  dataMessageStreamPart
];
var assistantStreamPartsByCode = {
  [textStreamPart.code]: textStreamPart,
  [errorStreamPart.code]: errorStreamPart,
  [assistantMessageStreamPart.code]: assistantMessageStreamPart,
  [assistantControlDataStreamPart.code]: assistantControlDataStreamPart,
  [dataMessageStreamPart.code]: dataMessageStreamPart
};
var StreamStringPrefixes = {
  [textStreamPart.name]: textStreamPart.code,
  [errorStreamPart.name]: errorStreamPart.code,
  [assistantMessageStreamPart.name]: assistantMessageStreamPart.code,
  [assistantControlDataStreamPart.name]: assistantControlDataStreamPart.code,
  [dataMessageStreamPart.name]: dataMessageStreamPart.code
};
var validCodes = assistantStreamParts.map((part) => part.code);
var parseAssistantStreamPart = (line) => {
  const firstSeparatorIndex = line.indexOf(":");
  if (firstSeparatorIndex === -1) {
    throw new Error("Failed to parse stream string. No separator found.");
  }
  const prefix = line.slice(0, firstSeparatorIndex);
  if (!validCodes.includes(prefix)) {
    throw new Error(`Failed to parse stream string. Invalid code ${prefix}.`);
  }
  const code = prefix;
  const textValue = line.slice(firstSeparatorIndex + 1);
  const jsonValue = JSON.parse(textValue);
  return assistantStreamPartsByCode[code].parse(jsonValue);
};
function formatAssistantStreamPart(type, value) {
  const streamPart = assistantStreamParts.find((part) => part.name === type);
  if (!streamPart) {
    throw new Error(`Invalid stream part type: ${type}`);
  }
  return `${streamPart.code}:${JSON.stringify(value)}
`;
}

// src/process-chat-response.ts


// src/duplicated/usage.ts
function calculateLanguageModelUsage({
  promptTokens,
  completionTokens
}) {
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens
  };
}

// src/parse-partial-json.ts


// src/fix-json.ts
function fixJson(input) {
  const stack = ["ROOT"];
  let lastValidIndex = -1;
  let literalStart = null;
  function processValueStart(char, i, swapState) {
    {
      switch (char) {
        case '"': {
          lastValidIndex = i;
          stack.pop();
          stack.push(swapState);
          stack.push("INSIDE_STRING");
          break;
        }
        case "f":
        case "t":
        case "n": {
          lastValidIndex = i;
          literalStart = i;
          stack.pop();
          stack.push(swapState);
          stack.push("INSIDE_LITERAL");
          break;
        }
        case "-": {
          stack.pop();
          stack.push(swapState);
          stack.push("INSIDE_NUMBER");
          break;
        }
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9": {
          lastValidIndex = i;
          stack.pop();
          stack.push(swapState);
          stack.push("INSIDE_NUMBER");
          break;
        }
        case "{": {
          lastValidIndex = i;
          stack.pop();
          stack.push(swapState);
          stack.push("INSIDE_OBJECT_START");
          break;
        }
        case "[": {
          lastValidIndex = i;
          stack.pop();
          stack.push(swapState);
          stack.push("INSIDE_ARRAY_START");
          break;
        }
      }
    }
  }
  function processAfterObjectValue(char, i) {
    switch (char) {
      case ",": {
        stack.pop();
        stack.push("INSIDE_OBJECT_AFTER_COMMA");
        break;
      }
      case "}": {
        lastValidIndex = i;
        stack.pop();
        break;
      }
    }
  }
  function processAfterArrayValue(char, i) {
    switch (char) {
      case ",": {
        stack.pop();
        stack.push("INSIDE_ARRAY_AFTER_COMMA");
        break;
      }
      case "]": {
        lastValidIndex = i;
        stack.pop();
        break;
      }
    }
  }
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const currentState = stack[stack.length - 1];
    switch (currentState) {
      case "ROOT":
        processValueStart(char, i, "FINISH");
        break;
      case "INSIDE_OBJECT_START": {
        switch (char) {
          case '"': {
            stack.pop();
            stack.push("INSIDE_OBJECT_KEY");
            break;
          }
          case "}": {
            lastValidIndex = i;
            stack.pop();
            break;
          }
        }
        break;
      }
      case "INSIDE_OBJECT_AFTER_COMMA": {
        switch (char) {
          case '"': {
            stack.pop();
            stack.push("INSIDE_OBJECT_KEY");
            break;
          }
        }
        break;
      }
      case "INSIDE_OBJECT_KEY": {
        switch (char) {
          case '"': {
            stack.pop();
            stack.push("INSIDE_OBJECT_AFTER_KEY");
            break;
          }
        }
        break;
      }
      case "INSIDE_OBJECT_AFTER_KEY": {
        switch (char) {
          case ":": {
            stack.pop();
            stack.push("INSIDE_OBJECT_BEFORE_VALUE");
            break;
          }
        }
        break;
      }
      case "INSIDE_OBJECT_BEFORE_VALUE": {
        processValueStart(char, i, "INSIDE_OBJECT_AFTER_VALUE");
        break;
      }
      case "INSIDE_OBJECT_AFTER_VALUE": {
        processAfterObjectValue(char, i);
        break;
      }
      case "INSIDE_STRING": {
        switch (char) {
          case '"': {
            stack.pop();
            lastValidIndex = i;
            break;
          }
          case "\\": {
            stack.push("INSIDE_STRING_ESCAPE");
            break;
          }
          default: {
            lastValidIndex = i;
          }
        }
        break;
      }
      case "INSIDE_ARRAY_START": {
        switch (char) {
          case "]": {
            lastValidIndex = i;
            stack.pop();
            break;
          }
          default: {
            lastValidIndex = i;
            processValueStart(char, i, "INSIDE_ARRAY_AFTER_VALUE");
            break;
          }
        }
        break;
      }
      case "INSIDE_ARRAY_AFTER_VALUE": {
        switch (char) {
          case ",": {
            stack.pop();
            stack.push("INSIDE_ARRAY_AFTER_COMMA");
            break;
          }
          case "]": {
            lastValidIndex = i;
            stack.pop();
            break;
          }
          default: {
            lastValidIndex = i;
            break;
          }
        }
        break;
      }
      case "INSIDE_ARRAY_AFTER_COMMA": {
        processValueStart(char, i, "INSIDE_ARRAY_AFTER_VALUE");
        break;
      }
      case "INSIDE_STRING_ESCAPE": {
        stack.pop();
        lastValidIndex = i;
        break;
      }
      case "INSIDE_NUMBER": {
        switch (char) {
          case "0":
          case "1":
          case "2":
          case "3":
          case "4":
          case "5":
          case "6":
          case "7":
          case "8":
          case "9": {
            lastValidIndex = i;
            break;
          }
          case "e":
          case "E":
          case "-":
          case ".": {
            break;
          }
          case ",": {
            stack.pop();
            if (stack[stack.length - 1] === "INSIDE_ARRAY_AFTER_VALUE") {
              processAfterArrayValue(char, i);
            }
            if (stack[stack.length - 1] === "INSIDE_OBJECT_AFTER_VALUE") {
              processAfterObjectValue(char, i);
            }
            break;
          }
          case "}": {
            stack.pop();
            if (stack[stack.length - 1] === "INSIDE_OBJECT_AFTER_VALUE") {
              processAfterObjectValue(char, i);
            }
            break;
          }
          case "]": {
            stack.pop();
            if (stack[stack.length - 1] === "INSIDE_ARRAY_AFTER_VALUE") {
              processAfterArrayValue(char, i);
            }
            break;
          }
          default: {
            stack.pop();
            break;
          }
        }
        break;
      }
      case "INSIDE_LITERAL": {
        const partialLiteral = input.substring(literalStart, i + 1);
        if (!"false".startsWith(partialLiteral) && !"true".startsWith(partialLiteral) && !"null".startsWith(partialLiteral)) {
          stack.pop();
          if (stack[stack.length - 1] === "INSIDE_OBJECT_AFTER_VALUE") {
            processAfterObjectValue(char, i);
          } else if (stack[stack.length - 1] === "INSIDE_ARRAY_AFTER_VALUE") {
            processAfterArrayValue(char, i);
          }
        } else {
          lastValidIndex = i;
        }
        break;
      }
    }
  }
  let result = input.slice(0, lastValidIndex + 1);
  for (let i = stack.length - 1; i >= 0; i--) {
    const state = stack[i];
    switch (state) {
      case "INSIDE_STRING": {
        result += '"';
        break;
      }
      case "INSIDE_OBJECT_KEY":
      case "INSIDE_OBJECT_AFTER_KEY":
      case "INSIDE_OBJECT_AFTER_COMMA":
      case "INSIDE_OBJECT_START":
      case "INSIDE_OBJECT_BEFORE_VALUE":
      case "INSIDE_OBJECT_AFTER_VALUE": {
        result += "}";
        break;
      }
      case "INSIDE_ARRAY_START":
      case "INSIDE_ARRAY_AFTER_COMMA":
      case "INSIDE_ARRAY_AFTER_VALUE": {
        result += "]";
        break;
      }
      case "INSIDE_LITERAL": {
        const partialLiteral = input.substring(literalStart, input.length);
        if ("true".startsWith(partialLiteral)) {
          result += "true".slice(partialLiteral.length);
        } else if ("false".startsWith(partialLiteral)) {
          result += "false".slice(partialLiteral.length);
        } else if ("null".startsWith(partialLiteral)) {
          result += "null".slice(partialLiteral.length);
        }
      }
    }
  }
  return result;
}

// src/parse-partial-json.ts
function parsePartialJson(jsonText) {
  if (jsonText === void 0) {
    return { value: void 0, state: "undefined-input" };
  }
  let result = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.safeParseJSON)({ text: jsonText });
  if (result.success) {
    return { value: result.value, state: "successful-parse" };
  }
  result = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.safeParseJSON)({ text: fixJson(jsonText) });
  if (result.success) {
    return { value: result.value, state: "repaired-parse" };
  }
  return { value: void 0, state: "failed-parse" };
}

// src/data-stream-parts.ts
var textStreamPart2 = {
  code: "0",
  name: "text",
  parse: (value) => {
    if (typeof value !== "string") {
      throw new Error('"text" parts expect a string value.');
    }
    return { type: "text", value };
  }
};
var dataStreamPart = {
  code: "2",
  name: "data",
  parse: (value) => {
    if (!Array.isArray(value)) {
      throw new Error('"data" parts expect an array value.');
    }
    return { type: "data", value };
  }
};
var errorStreamPart2 = {
  code: "3",
  name: "error",
  parse: (value) => {
    if (typeof value !== "string") {
      throw new Error('"error" parts expect a string value.');
    }
    return { type: "error", value };
  }
};
var messageAnnotationsStreamPart = {
  code: "8",
  name: "message_annotations",
  parse: (value) => {
    if (!Array.isArray(value)) {
      throw new Error('"message_annotations" parts expect an array value.');
    }
    return { type: "message_annotations", value };
  }
};
var toolCallStreamPart = {
  code: "9",
  name: "tool_call",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("toolCallId" in value) || typeof value.toolCallId !== "string" || !("toolName" in value) || typeof value.toolName !== "string" || !("args" in value) || typeof value.args !== "object") {
      throw new Error(
        '"tool_call" parts expect an object with a "toolCallId", "toolName", and "args" property.'
      );
    }
    return {
      type: "tool_call",
      value
    };
  }
};
var toolResultStreamPart = {
  code: "a",
  name: "tool_result",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("toolCallId" in value) || typeof value.toolCallId !== "string" || !("result" in value)) {
      throw new Error(
        '"tool_result" parts expect an object with a "toolCallId" and a "result" property.'
      );
    }
    return {
      type: "tool_result",
      value
    };
  }
};
var toolCallStreamingStartStreamPart = {
  code: "b",
  name: "tool_call_streaming_start",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("toolCallId" in value) || typeof value.toolCallId !== "string" || !("toolName" in value) || typeof value.toolName !== "string") {
      throw new Error(
        '"tool_call_streaming_start" parts expect an object with a "toolCallId" and "toolName" property.'
      );
    }
    return {
      type: "tool_call_streaming_start",
      value
    };
  }
};
var toolCallDeltaStreamPart = {
  code: "c",
  name: "tool_call_delta",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("toolCallId" in value) || typeof value.toolCallId !== "string" || !("argsTextDelta" in value) || typeof value.argsTextDelta !== "string") {
      throw new Error(
        '"tool_call_delta" parts expect an object with a "toolCallId" and "argsTextDelta" property.'
      );
    }
    return {
      type: "tool_call_delta",
      value
    };
  }
};
var finishMessageStreamPart = {
  code: "d",
  name: "finish_message",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("finishReason" in value) || typeof value.finishReason !== "string") {
      throw new Error(
        '"finish_message" parts expect an object with a "finishReason" property.'
      );
    }
    const result = {
      finishReason: value.finishReason
    };
    if ("usage" in value && value.usage != null && typeof value.usage === "object" && "promptTokens" in value.usage && "completionTokens" in value.usage) {
      result.usage = {
        promptTokens: typeof value.usage.promptTokens === "number" ? value.usage.promptTokens : Number.NaN,
        completionTokens: typeof value.usage.completionTokens === "number" ? value.usage.completionTokens : Number.NaN
      };
    }
    return {
      type: "finish_message",
      value: result
    };
  }
};
var finishStepStreamPart = {
  code: "e",
  name: "finish_step",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("finishReason" in value) || typeof value.finishReason !== "string") {
      throw new Error(
        '"finish_step" parts expect an object with a "finishReason" property.'
      );
    }
    const result = {
      finishReason: value.finishReason,
      isContinued: false
    };
    if ("usage" in value && value.usage != null && typeof value.usage === "object" && "promptTokens" in value.usage && "completionTokens" in value.usage) {
      result.usage = {
        promptTokens: typeof value.usage.promptTokens === "number" ? value.usage.promptTokens : Number.NaN,
        completionTokens: typeof value.usage.completionTokens === "number" ? value.usage.completionTokens : Number.NaN
      };
    }
    if ("isContinued" in value && typeof value.isContinued === "boolean") {
      result.isContinued = value.isContinued;
    }
    return {
      type: "finish_step",
      value: result
    };
  }
};
var startStepStreamPart = {
  code: "f",
  name: "start_step",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("messageId" in value) || typeof value.messageId !== "string") {
      throw new Error(
        '"start_step" parts expect an object with an "id" property.'
      );
    }
    return {
      type: "start_step",
      value: {
        messageId: value.messageId
      }
    };
  }
};
var reasoningStreamPart = {
  code: "g",
  name: "reasoning",
  parse: (value) => {
    if (typeof value !== "string") {
      throw new Error('"reasoning" parts expect a string value.');
    }
    return { type: "reasoning", value };
  }
};
var sourcePart = {
  code: "h",
  name: "source",
  parse: (value) => {
    if (value == null || typeof value !== "object") {
      throw new Error('"source" parts expect a Source object.');
    }
    return {
      type: "source",
      value
    };
  }
};
var redactedReasoningStreamPart = {
  code: "i",
  name: "redacted_reasoning",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("data" in value) || typeof value.data !== "string") {
      throw new Error(
        '"redacted_reasoning" parts expect an object with a "data" property.'
      );
    }
    return { type: "redacted_reasoning", value: { data: value.data } };
  }
};
var reasoningSignatureStreamPart = {
  code: "j",
  name: "reasoning_signature",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("signature" in value) || typeof value.signature !== "string") {
      throw new Error(
        '"reasoning_signature" parts expect an object with a "signature" property.'
      );
    }
    return {
      type: "reasoning_signature",
      value: { signature: value.signature }
    };
  }
};
var fileStreamPart = {
  code: "k",
  name: "file",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("data" in value) || typeof value.data !== "string" || !("mimeType" in value) || typeof value.mimeType !== "string") {
      throw new Error(
        '"file" parts expect an object with a "data" and "mimeType" property.'
      );
    }
    return { type: "file", value };
  }
};
var dataStreamParts = [
  textStreamPart2,
  dataStreamPart,
  errorStreamPart2,
  messageAnnotationsStreamPart,
  toolCallStreamPart,
  toolResultStreamPart,
  toolCallStreamingStartStreamPart,
  toolCallDeltaStreamPart,
  finishMessageStreamPart,
  finishStepStreamPart,
  startStepStreamPart,
  reasoningStreamPart,
  sourcePart,
  redactedReasoningStreamPart,
  reasoningSignatureStreamPart,
  fileStreamPart
];
var dataStreamPartsByCode = Object.fromEntries(
  dataStreamParts.map((part) => [part.code, part])
);
var DataStreamStringPrefixes = Object.fromEntries(
  dataStreamParts.map((part) => [part.name, part.code])
);
var validCodes2 = dataStreamParts.map((part) => part.code);
var parseDataStreamPart = (line) => {
  const firstSeparatorIndex = line.indexOf(":");
  if (firstSeparatorIndex === -1) {
    throw new Error("Failed to parse stream string. No separator found.");
  }
  const prefix = line.slice(0, firstSeparatorIndex);
  if (!validCodes2.includes(prefix)) {
    throw new Error(`Failed to parse stream string. Invalid code ${prefix}.`);
  }
  const code = prefix;
  const textValue = line.slice(firstSeparatorIndex + 1);
  const jsonValue = JSON.parse(textValue);
  return dataStreamPartsByCode[code].parse(jsonValue);
};
function formatDataStreamPart(type, value) {
  const streamPart = dataStreamParts.find((part) => part.name === type);
  if (!streamPart) {
    throw new Error(`Invalid stream part type: ${type}`);
  }
  return `${streamPart.code}:${JSON.stringify(value)}
`;
}

// src/process-data-stream.ts
var NEWLINE = "\n".charCodeAt(0);
function concatChunks(chunks, totalLength) {
  const concatenatedChunks = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    concatenatedChunks.set(chunk, offset);
    offset += chunk.length;
  }
  chunks.length = 0;
  return concatenatedChunks;
}
async function processDataStream({
  stream,
  onTextPart,
  onReasoningPart,
  onReasoningSignaturePart,
  onRedactedReasoningPart,
  onSourcePart,
  onFilePart,
  onDataPart,
  onErrorPart,
  onToolCallStreamingStartPart,
  onToolCallDeltaPart,
  onToolCallPart,
  onToolResultPart,
  onMessageAnnotationsPart,
  onFinishMessagePart,
  onFinishStepPart,
  onStartStepPart
}) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks = [];
  let totalLength = 0;
  while (true) {
    const { value } = await reader.read();
    if (value) {
      chunks.push(value);
      totalLength += value.length;
      if (value[value.length - 1] !== NEWLINE) {
        continue;
      }
    }
    if (chunks.length === 0) {
      break;
    }
    const concatenatedChunks = concatChunks(chunks, totalLength);
    totalLength = 0;
    const streamParts = decoder.decode(concatenatedChunks, { stream: true }).split("\n").filter((line) => line !== "").map(parseDataStreamPart);
    for (const { type, value: value2 } of streamParts) {
      switch (type) {
        case "text":
          await (onTextPart == null ? void 0 : onTextPart(value2));
          break;
        case "reasoning":
          await (onReasoningPart == null ? void 0 : onReasoningPart(value2));
          break;
        case "reasoning_signature":
          await (onReasoningSignaturePart == null ? void 0 : onReasoningSignaturePart(value2));
          break;
        case "redacted_reasoning":
          await (onRedactedReasoningPart == null ? void 0 : onRedactedReasoningPart(value2));
          break;
        case "file":
          await (onFilePart == null ? void 0 : onFilePart(value2));
          break;
        case "source":
          await (onSourcePart == null ? void 0 : onSourcePart(value2));
          break;
        case "data":
          await (onDataPart == null ? void 0 : onDataPart(value2));
          break;
        case "error":
          await (onErrorPart == null ? void 0 : onErrorPart(value2));
          break;
        case "message_annotations":
          await (onMessageAnnotationsPart == null ? void 0 : onMessageAnnotationsPart(value2));
          break;
        case "tool_call_streaming_start":
          await (onToolCallStreamingStartPart == null ? void 0 : onToolCallStreamingStartPart(value2));
          break;
        case "tool_call_delta":
          await (onToolCallDeltaPart == null ? void 0 : onToolCallDeltaPart(value2));
          break;
        case "tool_call":
          await (onToolCallPart == null ? void 0 : onToolCallPart(value2));
          break;
        case "tool_result":
          await (onToolResultPart == null ? void 0 : onToolResultPart(value2));
          break;
        case "finish_message":
          await (onFinishMessagePart == null ? void 0 : onFinishMessagePart(value2));
          break;
        case "finish_step":
          await (onFinishStepPart == null ? void 0 : onFinishStepPart(value2));
          break;
        case "start_step":
          await (onStartStepPart == null ? void 0 : onStartStepPart(value2));
          break;
        default: {
          const exhaustiveCheck = type;
          throw new Error(`Unknown stream part type: ${exhaustiveCheck}`);
        }
      }
    }
  }
}

// src/process-chat-response.ts
async function processChatResponse({
  stream,
  update,
  onToolCall,
  onFinish,
  generateId: generateId2 = _ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.generateId,
  getCurrentDate = () => /* @__PURE__ */ new Date(),
  lastMessage
}) {
  var _a, _b;
  const replaceLastMessage = (lastMessage == null ? void 0 : lastMessage.role) === "assistant";
  let step = replaceLastMessage ? 1 + // find max step in existing tool invocations:
  ((_b = (_a = lastMessage.toolInvocations) == null ? void 0 : _a.reduce((max, toolInvocation) => {
    var _a2;
    return Math.max(max, (_a2 = toolInvocation.step) != null ? _a2 : 0);
  }, 0)) != null ? _b : 0) : 0;
  const message = replaceLastMessage ? structuredClone(lastMessage) : {
    id: generateId2(),
    createdAt: getCurrentDate(),
    role: "assistant",
    content: "",
    parts: []
  };
  let currentTextPart = void 0;
  let currentReasoningPart = void 0;
  let currentReasoningTextDetail = void 0;
  function updateToolInvocationPart(toolCallId, invocation) {
    const part = message.parts.find(
      (part2) => part2.type === "tool-invocation" && part2.toolInvocation.toolCallId === toolCallId
    );
    if (part != null) {
      part.toolInvocation = invocation;
    } else {
      message.parts.push({
        type: "tool-invocation",
        toolInvocation: invocation
      });
    }
  }
  const data = [];
  let messageAnnotations = replaceLastMessage ? lastMessage == null ? void 0 : lastMessage.annotations : void 0;
  const partialToolCalls = {};
  let usage = {
    completionTokens: NaN,
    promptTokens: NaN,
    totalTokens: NaN
  };
  let finishReason = "unknown";
  function execUpdate() {
    const copiedData = [...data];
    if (messageAnnotations == null ? void 0 : messageAnnotations.length) {
      message.annotations = messageAnnotations;
    }
    const copiedMessage = {
      // deep copy the message to ensure that deep changes (msg attachments) are updated
      // with SolidJS. SolidJS uses referential integration of sub-objects to detect changes.
      ...structuredClone(message),
      // add a revision id to ensure that the message is updated with SWR. SWR uses a
      // hashing approach by default to detect changes, but it only works for shallow
      // changes. This is why we need to add a revision id to ensure that the message
      // is updated with SWR (without it, the changes get stuck in SWR and are not
      // forwarded to rendering):
      revisionId: generateId2()
    };
    update({
      message: copiedMessage,
      data: copiedData,
      replaceLastMessage
    });
  }
  await processDataStream({
    stream,
    onTextPart(value) {
      if (currentTextPart == null) {
        currentTextPart = {
          type: "text",
          text: value
        };
        message.parts.push(currentTextPart);
      } else {
        currentTextPart.text += value;
      }
      message.content += value;
      execUpdate();
    },
    onReasoningPart(value) {
      var _a2;
      if (currentReasoningTextDetail == null) {
        currentReasoningTextDetail = { type: "text", text: value };
        if (currentReasoningPart != null) {
          currentReasoningPart.details.push(currentReasoningTextDetail);
        }
      } else {
        currentReasoningTextDetail.text += value;
      }
      if (currentReasoningPart == null) {
        currentReasoningPart = {
          type: "reasoning",
          reasoning: value,
          details: [currentReasoningTextDetail]
        };
        message.parts.push(currentReasoningPart);
      } else {
        currentReasoningPart.reasoning += value;
      }
      message.reasoning = ((_a2 = message.reasoning) != null ? _a2 : "") + value;
      execUpdate();
    },
    onReasoningSignaturePart(value) {
      if (currentReasoningTextDetail != null) {
        currentReasoningTextDetail.signature = value.signature;
      }
    },
    onRedactedReasoningPart(value) {
      if (currentReasoningPart == null) {
        currentReasoningPart = {
          type: "reasoning",
          reasoning: "",
          details: []
        };
        message.parts.push(currentReasoningPart);
      }
      currentReasoningPart.details.push({
        type: "redacted",
        data: value.data
      });
      currentReasoningTextDetail = void 0;
      execUpdate();
    },
    onFilePart(value) {
      message.parts.push({
        type: "file",
        mimeType: value.mimeType,
        data: value.data
      });
      execUpdate();
    },
    onSourcePart(value) {
      message.parts.push({
        type: "source",
        source: value
      });
      execUpdate();
    },
    onToolCallStreamingStartPart(value) {
      if (message.toolInvocations == null) {
        message.toolInvocations = [];
      }
      partialToolCalls[value.toolCallId] = {
        text: "",
        step,
        toolName: value.toolName,
        index: message.toolInvocations.length
      };
      const invocation = {
        state: "partial-call",
        step,
        toolCallId: value.toolCallId,
        toolName: value.toolName,
        args: void 0
      };
      message.toolInvocations.push(invocation);
      updateToolInvocationPart(value.toolCallId, invocation);
      execUpdate();
    },
    onToolCallDeltaPart(value) {
      const partialToolCall = partialToolCalls[value.toolCallId];
      partialToolCall.text += value.argsTextDelta;
      const { value: partialArgs } = parsePartialJson(partialToolCall.text);
      const invocation = {
        state: "partial-call",
        step: partialToolCall.step,
        toolCallId: value.toolCallId,
        toolName: partialToolCall.toolName,
        args: partialArgs
      };
      message.toolInvocations[partialToolCall.index] = invocation;
      updateToolInvocationPart(value.toolCallId, invocation);
      execUpdate();
    },
    async onToolCallPart(value) {
      const invocation = {
        state: "call",
        step,
        ...value
      };
      if (partialToolCalls[value.toolCallId] != null) {
        message.toolInvocations[partialToolCalls[value.toolCallId].index] = invocation;
      } else {
        if (message.toolInvocations == null) {
          message.toolInvocations = [];
        }
        message.toolInvocations.push(invocation);
      }
      updateToolInvocationPart(value.toolCallId, invocation);
      execUpdate();
      if (onToolCall) {
        const result = await onToolCall({ toolCall: value });
        if (result != null) {
          const invocation2 = {
            state: "result",
            step,
            ...value,
            result
          };
          message.toolInvocations[message.toolInvocations.length - 1] = invocation2;
          updateToolInvocationPart(value.toolCallId, invocation2);
          execUpdate();
        }
      }
    },
    onToolResultPart(value) {
      const toolInvocations = message.toolInvocations;
      if (toolInvocations == null) {
        throw new Error("tool_result must be preceded by a tool_call");
      }
      const toolInvocationIndex = toolInvocations.findIndex(
        (invocation2) => invocation2.toolCallId === value.toolCallId
      );
      if (toolInvocationIndex === -1) {
        throw new Error(
          "tool_result must be preceded by a tool_call with the same toolCallId"
        );
      }
      const invocation = {
        ...toolInvocations[toolInvocationIndex],
        state: "result",
        ...value
      };
      toolInvocations[toolInvocationIndex] = invocation;
      updateToolInvocationPart(value.toolCallId, invocation);
      execUpdate();
    },
    onDataPart(value) {
      data.push(...value);
      execUpdate();
    },
    onMessageAnnotationsPart(value) {
      if (messageAnnotations == null) {
        messageAnnotations = [...value];
      } else {
        messageAnnotations.push(...value);
      }
      execUpdate();
    },
    onFinishStepPart(value) {
      step += 1;
      currentTextPart = value.isContinued ? currentTextPart : void 0;
      currentReasoningPart = void 0;
      currentReasoningTextDetail = void 0;
    },
    onStartStepPart(value) {
      if (!replaceLastMessage) {
        message.id = value.messageId;
      }
      message.parts.push({ type: "step-start" });
      execUpdate();
    },
    onFinishMessagePart(value) {
      finishReason = value.finishReason;
      if (value.usage != null) {
        usage = calculateLanguageModelUsage(value.usage);
      }
    },
    onErrorPart(error) {
      throw new Error(error);
    }
  });
  onFinish == null ? void 0 : onFinish({ message, finishReason, usage });
}

// src/process-chat-text-response.ts


// src/process-text-stream.ts
async function processTextStream({
  stream,
  onTextPart
}) {
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    await onTextPart(value);
  }
}

// src/process-chat-text-response.ts
async function processChatTextResponse({
  stream,
  update,
  onFinish,
  getCurrentDate = () => /* @__PURE__ */ new Date(),
  generateId: generateId2 = _ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.generateId
}) {
  const textPart = { type: "text", text: "" };
  const resultMessage = {
    id: generateId2(),
    createdAt: getCurrentDate(),
    role: "assistant",
    content: "",
    parts: [textPart]
  };
  await processTextStream({
    stream,
    onTextPart: (chunk) => {
      resultMessage.content += chunk;
      textPart.text += chunk;
      update({
        message: { ...resultMessage },
        data: [],
        replaceLastMessage: false
      });
    }
  });
  onFinish == null ? void 0 : onFinish(resultMessage, {
    usage: { completionTokens: NaN, promptTokens: NaN, totalTokens: NaN },
    finishReason: "unknown"
  });
}

// src/call-chat-api.ts
var getOriginalFetch = () => fetch;
async function callChatApi({
  api,
  body,
  streamProtocol = "data",
  credentials,
  headers,
  abortController,
  restoreMessagesOnFailure,
  onResponse,
  onUpdate,
  onFinish,
  onToolCall,
  generateId: generateId2,
  fetch: fetch2 = getOriginalFetch(),
  lastMessage,
  requestType = "generate"
}) {
  var _a, _b, _c;
  const request = requestType === "resume" ? fetch2(`${api}?chatId=${body.id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    signal: (_a = abortController == null ? void 0 : abortController()) == null ? void 0 : _a.signal,
    credentials
  }) : fetch2(api, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    signal: (_b = abortController == null ? void 0 : abortController()) == null ? void 0 : _b.signal,
    credentials
  });
  const response = await request.catch((err) => {
    restoreMessagesOnFailure();
    throw err;
  });
  if (onResponse) {
    try {
      await onResponse(response);
    } catch (err) {
      throw err;
    }
  }
  if (!response.ok) {
    restoreMessagesOnFailure();
    throw new Error(
      (_c = await response.text()) != null ? _c : "Failed to fetch the chat response."
    );
  }
  if (!response.body) {
    throw new Error("The response body is empty.");
  }
  switch (streamProtocol) {
    case "text": {
      await processChatTextResponse({
        stream: response.body,
        update: onUpdate,
        onFinish,
        generateId: generateId2
      });
      return;
    }
    case "data": {
      await processChatResponse({
        stream: response.body,
        update: onUpdate,
        lastMessage,
        onToolCall,
        onFinish({ message, finishReason, usage }) {
          if (onFinish && message != null) {
            onFinish(message, { usage, finishReason });
          }
        },
        generateId: generateId2
      });
      return;
    }
    default: {
      const exhaustiveCheck = streamProtocol;
      throw new Error(`Unknown stream protocol: ${exhaustiveCheck}`);
    }
  }
}

// src/call-completion-api.ts
var getOriginalFetch2 = () => fetch;
async function callCompletionApi({
  api,
  prompt,
  credentials,
  headers,
  body,
  streamProtocol = "data",
  setCompletion,
  setLoading,
  setError,
  setAbortController,
  onResponse,
  onFinish,
  onError,
  onData,
  fetch: fetch2 = getOriginalFetch2()
}) {
  var _a;
  try {
    setLoading(true);
    setError(void 0);
    const abortController = new AbortController();
    setAbortController(abortController);
    setCompletion("");
    const response = await fetch2(api, {
      method: "POST",
      body: JSON.stringify({
        prompt,
        ...body
      }),
      credentials,
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      signal: abortController.signal
    }).catch((err) => {
      throw err;
    });
    if (onResponse) {
      try {
        await onResponse(response);
      } catch (err) {
        throw err;
      }
    }
    if (!response.ok) {
      throw new Error(
        (_a = await response.text()) != null ? _a : "Failed to fetch the chat response."
      );
    }
    if (!response.body) {
      throw new Error("The response body is empty.");
    }
    let result = "";
    switch (streamProtocol) {
      case "text": {
        await processTextStream({
          stream: response.body,
          onTextPart: (chunk) => {
            result += chunk;
            setCompletion(result);
          }
        });
        break;
      }
      case "data": {
        await processDataStream({
          stream: response.body,
          onTextPart(value) {
            result += value;
            setCompletion(result);
          },
          onDataPart(value) {
            onData == null ? void 0 : onData(value);
          },
          onErrorPart(value) {
            throw new Error(value);
          }
        });
        break;
      }
      default: {
        const exhaustiveCheck = streamProtocol;
        throw new Error(`Unknown stream protocol: ${exhaustiveCheck}`);
      }
    }
    if (onFinish) {
      onFinish(prompt, result);
    }
    setAbortController(null);
    return result;
  } catch (err) {
    if (err.name === "AbortError") {
      setAbortController(null);
      return null;
    }
    if (err instanceof Error) {
      if (onError) {
        onError(err);
      }
    }
    setError(err);
  } finally {
    setLoading(false);
  }
}

// src/data-url.ts
function getTextFromDataUrl(dataUrl) {
  const [header, base64Content] = dataUrl.split(",");
  const mimeType = header.split(";")[0].split(":")[1];
  if (mimeType == null || base64Content == null) {
    throw new Error("Invalid data URL format");
  }
  try {
    return window.atob(base64Content);
  } catch (error) {
    throw new Error(`Error decoding data URL`);
  }
}

// src/extract-max-tool-invocation-step.ts
function extractMaxToolInvocationStep(toolInvocations) {
  return toolInvocations == null ? void 0 : toolInvocations.reduce((max, toolInvocation) => {
    var _a;
    return Math.max(max, (_a = toolInvocation.step) != null ? _a : 0);
  }, 0);
}

// src/get-message-parts.ts
function getMessageParts(message) {
  var _a;
  return (_a = message.parts) != null ? _a : [
    ...message.toolInvocations ? message.toolInvocations.map((toolInvocation) => ({
      type: "tool-invocation",
      toolInvocation
    })) : [],
    ...message.reasoning ? [
      {
        type: "reasoning",
        reasoning: message.reasoning,
        details: [{ type: "text", text: message.reasoning }]
      }
    ] : [],
    ...message.content ? [{ type: "text", text: message.content }] : []
  ];
}

// src/fill-message-parts.ts
function fillMessageParts(messages) {
  return messages.map((message) => ({
    ...message,
    parts: getMessageParts(message)
  }));
}

// src/is-deep-equal-data.ts
function isDeepEqualData(obj1, obj2) {
  if (obj1 === obj2)
    return true;
  if (obj1 == null || obj2 == null)
    return false;
  if (typeof obj1 !== "object" && typeof obj2 !== "object")
    return obj1 === obj2;
  if (obj1.constructor !== obj2.constructor)
    return false;
  if (obj1 instanceof Date && obj2 instanceof Date) {
    return obj1.getTime() === obj2.getTime();
  }
  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length)
      return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!isDeepEqualData(obj1[i], obj2[i]))
        return false;
    }
    return true;
  }
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length)
    return false;
  for (const key of keys1) {
    if (!keys2.includes(key))
      return false;
    if (!isDeepEqualData(obj1[key], obj2[key]))
      return false;
  }
  return true;
}

// src/prepare-attachments-for-request.ts
async function prepareAttachmentsForRequest(attachmentsFromOptions) {
  if (!attachmentsFromOptions) {
    return [];
  }
  if (globalThis.FileList && attachmentsFromOptions instanceof globalThis.FileList) {
    return Promise.all(
      Array.from(attachmentsFromOptions).map(async (attachment) => {
        const { name, type } = attachment;
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (readerEvent) => {
            var _a;
            resolve((_a = readerEvent.target) == null ? void 0 : _a.result);
          };
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(attachment);
        });
        return {
          name,
          contentType: type,
          url: dataUrl
        };
      })
    );
  }
  if (Array.isArray(attachmentsFromOptions)) {
    return attachmentsFromOptions;
  }
  throw new Error("Invalid attachments type");
}

// src/process-assistant-stream.ts
var NEWLINE2 = "\n".charCodeAt(0);
function concatChunks2(chunks, totalLength) {
  const concatenatedChunks = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    concatenatedChunks.set(chunk, offset);
    offset += chunk.length;
  }
  chunks.length = 0;
  return concatenatedChunks;
}
async function processAssistantStream({
  stream,
  onTextPart,
  onErrorPart,
  onAssistantMessagePart,
  onAssistantControlDataPart,
  onDataMessagePart
}) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks = [];
  let totalLength = 0;
  while (true) {
    const { value } = await reader.read();
    if (value) {
      chunks.push(value);
      totalLength += value.length;
      if (value[value.length - 1] !== NEWLINE2) {
        continue;
      }
    }
    if (chunks.length === 0) {
      break;
    }
    const concatenatedChunks = concatChunks2(chunks, totalLength);
    totalLength = 0;
    const streamParts = decoder.decode(concatenatedChunks, { stream: true }).split("\n").filter((line) => line !== "").map(parseAssistantStreamPart);
    for (const { type, value: value2 } of streamParts) {
      switch (type) {
        case "text":
          await (onTextPart == null ? void 0 : onTextPart(value2));
          break;
        case "error":
          await (onErrorPart == null ? void 0 : onErrorPart(value2));
          break;
        case "assistant_message":
          await (onAssistantMessagePart == null ? void 0 : onAssistantMessagePart(value2));
          break;
        case "assistant_control_data":
          await (onAssistantControlDataPart == null ? void 0 : onAssistantControlDataPart(value2));
          break;
        case "data_message":
          await (onDataMessagePart == null ? void 0 : onDataMessagePart(value2));
          break;
        default: {
          const exhaustiveCheck = type;
          throw new Error(`Unknown stream part type: ${exhaustiveCheck}`);
        }
      }
    }
  }
}

// src/schema.ts


// src/zod-schema.ts

function zodSchema(zodSchema2, options) {
  var _a;
  const useReferences = (_a = options == null ? void 0 : options.useReferences) != null ? _a : false;
  return jsonSchema(
    (0,zod_to_json_schema__WEBPACK_IMPORTED_MODULE_1__["default"])(zodSchema2, {
      $refStrategy: useReferences ? "root" : "none",
      target: "jsonSchema7"
      // note: openai mode breaks various gemini conversions
    }),
    {
      validate: (value) => {
        const result = zodSchema2.safeParse(value);
        return result.success ? { success: true, value: result.data } : { success: false, error: result.error };
      }
    }
  );
}

// src/schema.ts
var schemaSymbol = Symbol.for("vercel.ai.schema");
function jsonSchema(jsonSchema2, {
  validate
} = {}) {
  return {
    [schemaSymbol]: true,
    _type: void 0,
    // should never be used directly
    [_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_0__.validatorSymbol]: true,
    jsonSchema: jsonSchema2,
    validate
  };
}
function isSchema(value) {
  return typeof value === "object" && value !== null && schemaSymbol in value && value[schemaSymbol] === true && "jsonSchema" in value && "validate" in value;
}
function asSchema(schema) {
  return isSchema(schema) ? schema : zodSchema(schema);
}

// src/should-resubmit-messages.ts
function shouldResubmitMessages({
  originalMaxToolInvocationStep,
  originalMessageCount,
  maxSteps,
  messages
}) {
  var _a;
  const lastMessage = messages[messages.length - 1];
  return (
    // check if the feature is enabled:
    maxSteps > 1 && // ensure there is a last message:
    lastMessage != null && // ensure we actually have new steps (to prevent infinite loops in case of errors):
    (messages.length > originalMessageCount || extractMaxToolInvocationStep(lastMessage.toolInvocations) !== originalMaxToolInvocationStep) && // check that next step is possible:
    isAssistantMessageWithCompletedToolCalls(lastMessage) && // limit the number of automatic steps:
    ((_a = extractMaxToolInvocationStep(lastMessage.toolInvocations)) != null ? _a : 0) < maxSteps
  );
}
function isAssistantMessageWithCompletedToolCalls(message) {
  if (message.role !== "assistant") {
    return false;
  }
  const lastStepStartIndex = message.parts.reduce((lastIndex, part, index) => {
    return part.type === "step-start" ? index : lastIndex;
  }, -1);
  const lastStepToolInvocations = message.parts.slice(lastStepStartIndex + 1).filter((part) => part.type === "tool-invocation");
  return lastStepToolInvocations.length > 0 && lastStepToolInvocations.every((part) => "result" in part.toolInvocation);
}

// src/update-tool-call-result.ts
function updateToolCallResult({
  messages,
  toolCallId,
  toolResult: result
}) {
  var _a;
  const lastMessage = messages[messages.length - 1];
  const invocationPart = lastMessage.parts.find(
    (part) => part.type === "tool-invocation" && part.toolInvocation.toolCallId === toolCallId
  );
  if (invocationPart == null) {
    return;
  }
  const toolResult = {
    ...invocationPart.toolInvocation,
    state: "result",
    result
  };
  invocationPart.toolInvocation = toolResult;
  lastMessage.toolInvocations = (_a = lastMessage.toolInvocations) == null ? void 0 : _a.map(
    (toolInvocation) => toolInvocation.toolCallId === toolCallId ? toolResult : toolInvocation
  );
}

//# sourceMappingURL=index.mjs.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/api/context.js":
/*!******************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/api/context.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ContextAPI: () => (/* binding */ ContextAPI)
/* harmony export */ });
/* harmony import */ var _context_NoopContextManager__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../context/NoopContextManager */ "./node_modules/@opentelemetry/api/build/esm/context/NoopContextManager.js");
/* harmony import */ var _internal_global_utils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../internal/global-utils */ "./node_modules/@opentelemetry/api/build/esm/internal/global-utils.js");
/* harmony import */ var _diag__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./diag */ "./node_modules/@opentelemetry/api/build/esm/api/diag.js");
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __read = (undefined && undefined.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};



var API_NAME = 'context';
var NOOP_CONTEXT_MANAGER = new _context_NoopContextManager__WEBPACK_IMPORTED_MODULE_0__.NoopContextManager();
/**
 * Singleton object which represents the entry point to the OpenTelemetry Context API
 */
var ContextAPI = /** @class */ (function () {
    /** Empty private constructor prevents end users from constructing a new instance of the API */
    function ContextAPI() {
    }
    /** Get the singleton instance of the Context API */
    ContextAPI.getInstance = function () {
        if (!this._instance) {
            this._instance = new ContextAPI();
        }
        return this._instance;
    };
    /**
     * Set the current context manager.
     *
     * @returns true if the context manager was successfully registered, else false
     */
    ContextAPI.prototype.setGlobalContextManager = function (contextManager) {
        return (0,_internal_global_utils__WEBPACK_IMPORTED_MODULE_1__.registerGlobal)(API_NAME, contextManager, _diag__WEBPACK_IMPORTED_MODULE_2__.DiagAPI.instance());
    };
    /**
     * Get the currently active context
     */
    ContextAPI.prototype.active = function () {
        return this._getContextManager().active();
    };
    /**
     * Execute a function with an active context
     *
     * @param context context to be active during function execution
     * @param fn function to execute in a context
     * @param thisArg optional receiver to be used for calling fn
     * @param args optional arguments forwarded to fn
     */
    ContextAPI.prototype.with = function (context, fn, thisArg) {
        var _a;
        var args = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            args[_i - 3] = arguments[_i];
        }
        return (_a = this._getContextManager()).with.apply(_a, __spreadArray([context, fn, thisArg], __read(args), false));
    };
    /**
     * Bind a context to a target function or event emitter
     *
     * @param context context to bind to the event emitter or function. Defaults to the currently active context
     * @param target function or event emitter to bind
     */
    ContextAPI.prototype.bind = function (context, target) {
        return this._getContextManager().bind(context, target);
    };
    ContextAPI.prototype._getContextManager = function () {
        return (0,_internal_global_utils__WEBPACK_IMPORTED_MODULE_1__.getGlobal)(API_NAME) || NOOP_CONTEXT_MANAGER;
    };
    /** Disable and remove the global context manager */
    ContextAPI.prototype.disable = function () {
        this._getContextManager().disable();
        (0,_internal_global_utils__WEBPACK_IMPORTED_MODULE_1__.unregisterGlobal)(API_NAME, _diag__WEBPACK_IMPORTED_MODULE_2__.DiagAPI.instance());
    };
    return ContextAPI;
}());

//# sourceMappingURL=context.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/api/diag.js":
/*!***************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/api/diag.js ***!
  \***************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DiagAPI: () => (/* binding */ DiagAPI)
/* harmony export */ });
/* harmony import */ var _diag_ComponentLogger__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../diag/ComponentLogger */ "./node_modules/@opentelemetry/api/build/esm/diag/ComponentLogger.js");
/* harmony import */ var _diag_internal_logLevelLogger__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../diag/internal/logLevelLogger */ "./node_modules/@opentelemetry/api/build/esm/diag/internal/logLevelLogger.js");
/* harmony import */ var _diag_types__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../diag/types */ "./node_modules/@opentelemetry/api/build/esm/diag/types.js");
/* harmony import */ var _internal_global_utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../internal/global-utils */ "./node_modules/@opentelemetry/api/build/esm/internal/global-utils.js");
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __read = (undefined && undefined.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};




var API_NAME = 'diag';
/**
 * Singleton object which represents the entry point to the OpenTelemetry internal
 * diagnostic API
 */
var DiagAPI = /** @class */ (function () {
    /**
     * Private internal constructor
     * @private
     */
    function DiagAPI() {
        function _logProxy(funcName) {
            return function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                var logger = (0,_internal_global_utils__WEBPACK_IMPORTED_MODULE_0__.getGlobal)('diag');
                // shortcut if logger not set
                if (!logger)
                    return;
                return logger[funcName].apply(logger, __spreadArray([], __read(args), false));
            };
        }
        // Using self local variable for minification purposes as 'this' cannot be minified
        var self = this;
        // DiagAPI specific functions
        var setLogger = function (logger, optionsOrLogLevel) {
            var _a, _b, _c;
            if (optionsOrLogLevel === void 0) { optionsOrLogLevel = { logLevel: _diag_types__WEBPACK_IMPORTED_MODULE_1__.DiagLogLevel.INFO }; }
            if (logger === self) {
                // There isn't much we can do here.
                // Logging to the console might break the user application.
                // Try to log to self. If a logger was previously registered it will receive the log.
                var err = new Error('Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation');
                self.error((_a = err.stack) !== null && _a !== void 0 ? _a : err.message);
                return false;
            }
            if (typeof optionsOrLogLevel === 'number') {
                optionsOrLogLevel = {
                    logLevel: optionsOrLogLevel,
                };
            }
            var oldLogger = (0,_internal_global_utils__WEBPACK_IMPORTED_MODULE_0__.getGlobal)('diag');
            var newLogger = (0,_diag_internal_logLevelLogger__WEBPACK_IMPORTED_MODULE_2__.createLogLevelDiagLogger)((_b = optionsOrLogLevel.logLevel) !== null && _b !== void 0 ? _b : _diag_types__WEBPACK_IMPORTED_MODULE_1__.DiagLogLevel.INFO, logger);
            // There already is an logger registered. We'll let it know before overwriting it.
            if (oldLogger && !optionsOrLogLevel.suppressOverrideMessage) {
                var stack = (_c = new Error().stack) !== null && _c !== void 0 ? _c : '<failed to generate stacktrace>';
                oldLogger.warn("Current logger will be overwritten from " + stack);
                newLogger.warn("Current logger will overwrite one already registered from " + stack);
            }
            return (0,_internal_global_utils__WEBPACK_IMPORTED_MODULE_0__.registerGlobal)('diag', newLogger, self, true);
        };
        self.setLogger = setLogger;
        self.disable = function () {
            (0,_internal_global_utils__WEBPACK_IMPORTED_MODULE_0__.unregisterGlobal)(API_NAME, self);
        };
        self.createComponentLogger = function (options) {
            return new _diag_ComponentLogger__WEBPACK_IMPORTED_MODULE_3__.DiagComponentLogger(options);
        };
        self.verbose = _logProxy('verbose');
        self.debug = _logProxy('debug');
        self.info = _logProxy('info');
        self.warn = _logProxy('warn');
        self.error = _logProxy('error');
    }
    /** Get the singleton instance of the DiagAPI API */
    DiagAPI.instance = function () {
        if (!this._instance) {
            this._instance = new DiagAPI();
        }
        return this._instance;
    };
    return DiagAPI;
}());

//# sourceMappingURL=diag.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/api/trace.js":
/*!****************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/api/trace.js ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TraceAPI: () => (/* binding */ TraceAPI)
/* harmony export */ });
/* harmony import */ var _internal_global_utils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../internal/global-utils */ "./node_modules/@opentelemetry/api/build/esm/internal/global-utils.js");
/* harmony import */ var _trace_ProxyTracerProvider__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../trace/ProxyTracerProvider */ "./node_modules/@opentelemetry/api/build/esm/trace/ProxyTracerProvider.js");
/* harmony import */ var _trace_spancontext_utils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../trace/spancontext-utils */ "./node_modules/@opentelemetry/api/build/esm/trace/spancontext-utils.js");
/* harmony import */ var _trace_context_utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../trace/context-utils */ "./node_modules/@opentelemetry/api/build/esm/trace/context-utils.js");
/* harmony import */ var _diag__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./diag */ "./node_modules/@opentelemetry/api/build/esm/api/diag.js");
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */





var API_NAME = 'trace';
/**
 * Singleton object which represents the entry point to the OpenTelemetry Tracing API
 */
var TraceAPI = /** @class */ (function () {
    /** Empty private constructor prevents end users from constructing a new instance of the API */
    function TraceAPI() {
        this._proxyTracerProvider = new _trace_ProxyTracerProvider__WEBPACK_IMPORTED_MODULE_0__.ProxyTracerProvider();
        this.wrapSpanContext = _trace_spancontext_utils__WEBPACK_IMPORTED_MODULE_1__.wrapSpanContext;
        this.isSpanContextValid = _trace_spancontext_utils__WEBPACK_IMPORTED_MODULE_1__.isSpanContextValid;
        this.deleteSpan = _trace_context_utils__WEBPACK_IMPORTED_MODULE_2__.deleteSpan;
        this.getSpan = _trace_context_utils__WEBPACK_IMPORTED_MODULE_2__.getSpan;
        this.getActiveSpan = _trace_context_utils__WEBPACK_IMPORTED_MODULE_2__.getActiveSpan;
        this.getSpanContext = _trace_context_utils__WEBPACK_IMPORTED_MODULE_2__.getSpanContext;
        this.setSpan = _trace_context_utils__WEBPACK_IMPORTED_MODULE_2__.setSpan;
        this.setSpanContext = _trace_context_utils__WEBPACK_IMPORTED_MODULE_2__.setSpanContext;
    }
    /** Get the singleton instance of the Trace API */
    TraceAPI.getInstance = function () {
        if (!this._instance) {
            this._instance = new TraceAPI();
        }
        return this._instance;
    };
    /**
     * Set the current global tracer.
     *
     * @returns true if the tracer provider was successfully registered, else false
     */
    TraceAPI.prototype.setGlobalTracerProvider = function (provider) {
        var success = (0,_internal_global_utils__WEBPACK_IMPORTED_MODULE_3__.registerGlobal)(API_NAME, this._proxyTracerProvider, _diag__WEBPACK_IMPORTED_MODULE_4__.DiagAPI.instance());
        if (success) {
            this._proxyTracerProvider.setDelegate(provider);
        }
        return success;
    };
    /**
     * Returns the global tracer provider.
     */
    TraceAPI.prototype.getTracerProvider = function () {
        return (0,_internal_global_utils__WEBPACK_IMPORTED_MODULE_3__.getGlobal)(API_NAME) || this._proxyTracerProvider;
    };
    /**
     * Returns a tracer from the global tracer provider.
     */
    TraceAPI.prototype.getTracer = function (name, version) {
        return this.getTracerProvider().getTracer(name, version);
    };
    /** Remove the global tracer provider */
    TraceAPI.prototype.disable = function () {
        (0,_internal_global_utils__WEBPACK_IMPORTED_MODULE_3__.unregisterGlobal)(API_NAME, _diag__WEBPACK_IMPORTED_MODULE_4__.DiagAPI.instance());
        this._proxyTracerProvider = new _trace_ProxyTracerProvider__WEBPACK_IMPORTED_MODULE_0__.ProxyTracerProvider();
    };
    return TraceAPI;
}());

//# sourceMappingURL=trace.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/context/NoopContextManager.js":
/*!*********************************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/context/NoopContextManager.js ***!
  \*********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   NoopContextManager: () => (/* binding */ NoopContextManager)
/* harmony export */ });
/* harmony import */ var _context__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./context */ "./node_modules/@opentelemetry/api/build/esm/context/context.js");
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __read = (undefined && undefined.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};

var NoopContextManager = /** @class */ (function () {
    function NoopContextManager() {
    }
    NoopContextManager.prototype.active = function () {
        return _context__WEBPACK_IMPORTED_MODULE_0__.ROOT_CONTEXT;
    };
    NoopContextManager.prototype.with = function (_context, fn, thisArg) {
        var args = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            args[_i - 3] = arguments[_i];
        }
        return fn.call.apply(fn, __spreadArray([thisArg], __read(args), false));
    };
    NoopContextManager.prototype.bind = function (_context, target) {
        return target;
    };
    NoopContextManager.prototype.enable = function () {
        return this;
    };
    NoopContextManager.prototype.disable = function () {
        return this;
    };
    return NoopContextManager;
}());

//# sourceMappingURL=NoopContextManager.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/context/context.js":
/*!**********************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/context/context.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ROOT_CONTEXT: () => (/* binding */ ROOT_CONTEXT),
/* harmony export */   createContextKey: () => (/* binding */ createContextKey)
/* harmony export */ });
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/** Get a key to uniquely identify a context value */
function createContextKey(description) {
    // The specification states that for the same input, multiple calls should
    // return different keys. Due to the nature of the JS dependency management
    // system, this creates problems where multiple versions of some package
    // could hold different keys for the same property.
    //
    // Therefore, we use Symbol.for which returns the same key for the same input.
    return Symbol.for(description);
}
var BaseContext = /** @class */ (function () {
    /**
     * Construct a new context which inherits values from an optional parent context.
     *
     * @param parentContext a context from which to inherit values
     */
    function BaseContext(parentContext) {
        // for minification
        var self = this;
        self._currentContext = parentContext ? new Map(parentContext) : new Map();
        self.getValue = function (key) { return self._currentContext.get(key); };
        self.setValue = function (key, value) {
            var context = new BaseContext(self._currentContext);
            context._currentContext.set(key, value);
            return context;
        };
        self.deleteValue = function (key) {
            var context = new BaseContext(self._currentContext);
            context._currentContext.delete(key);
            return context;
        };
    }
    return BaseContext;
}());
/** The root context is used as the default parent context when there is no active context */
var ROOT_CONTEXT = new BaseContext();
//# sourceMappingURL=context.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/diag/ComponentLogger.js":
/*!***************************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/diag/ComponentLogger.js ***!
  \***************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DiagComponentLogger: () => (/* binding */ DiagComponentLogger)
/* harmony export */ });
/* harmony import */ var _internal_global_utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../internal/global-utils */ "./node_modules/@opentelemetry/api/build/esm/internal/global-utils.js");
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __read = (undefined && undefined.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};

/**
 * Component Logger which is meant to be used as part of any component which
 * will add automatically additional namespace in front of the log message.
 * It will then forward all message to global diag logger
 * @example
 * const cLogger = diag.createComponentLogger({ namespace: '@opentelemetry/instrumentation-http' });
 * cLogger.debug('test');
 * // @opentelemetry/instrumentation-http test
 */
var DiagComponentLogger = /** @class */ (function () {
    function DiagComponentLogger(props) {
        this._namespace = props.namespace || 'DiagComponentLogger';
    }
    DiagComponentLogger.prototype.debug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return logProxy('debug', this._namespace, args);
    };
    DiagComponentLogger.prototype.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return logProxy('error', this._namespace, args);
    };
    DiagComponentLogger.prototype.info = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return logProxy('info', this._namespace, args);
    };
    DiagComponentLogger.prototype.warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return logProxy('warn', this._namespace, args);
    };
    DiagComponentLogger.prototype.verbose = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return logProxy('verbose', this._namespace, args);
    };
    return DiagComponentLogger;
}());

function logProxy(funcName, namespace, args) {
    var logger = (0,_internal_global_utils__WEBPACK_IMPORTED_MODULE_0__.getGlobal)('diag');
    // shortcut if logger not set
    if (!logger) {
        return;
    }
    args.unshift(namespace);
    return logger[funcName].apply(logger, __spreadArray([], __read(args), false));
}
//# sourceMappingURL=ComponentLogger.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/diag/internal/logLevelLogger.js":
/*!***********************************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/diag/internal/logLevelLogger.js ***!
  \***********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createLogLevelDiagLogger: () => (/* binding */ createLogLevelDiagLogger)
/* harmony export */ });
/* harmony import */ var _types__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../types */ "./node_modules/@opentelemetry/api/build/esm/diag/types.js");
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function createLogLevelDiagLogger(maxLevel, logger) {
    if (maxLevel < _types__WEBPACK_IMPORTED_MODULE_0__.DiagLogLevel.NONE) {
        maxLevel = _types__WEBPACK_IMPORTED_MODULE_0__.DiagLogLevel.NONE;
    }
    else if (maxLevel > _types__WEBPACK_IMPORTED_MODULE_0__.DiagLogLevel.ALL) {
        maxLevel = _types__WEBPACK_IMPORTED_MODULE_0__.DiagLogLevel.ALL;
    }
    // In case the logger is null or undefined
    logger = logger || {};
    function _filterFunc(funcName, theLevel) {
        var theFunc = logger[funcName];
        if (typeof theFunc === 'function' && maxLevel >= theLevel) {
            return theFunc.bind(logger);
        }
        return function () { };
    }
    return {
        error: _filterFunc('error', _types__WEBPACK_IMPORTED_MODULE_0__.DiagLogLevel.ERROR),
        warn: _filterFunc('warn', _types__WEBPACK_IMPORTED_MODULE_0__.DiagLogLevel.WARN),
        info: _filterFunc('info', _types__WEBPACK_IMPORTED_MODULE_0__.DiagLogLevel.INFO),
        debug: _filterFunc('debug', _types__WEBPACK_IMPORTED_MODULE_0__.DiagLogLevel.DEBUG),
        verbose: _filterFunc('verbose', _types__WEBPACK_IMPORTED_MODULE_0__.DiagLogLevel.VERBOSE),
    };
}
//# sourceMappingURL=logLevelLogger.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/diag/types.js":
/*!*****************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/diag/types.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DiagLogLevel: () => (/* binding */ DiagLogLevel)
/* harmony export */ });
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Defines the available internal logging levels for the diagnostic logger, the numeric values
 * of the levels are defined to match the original values from the initial LogLevel to avoid
 * compatibility/migration issues for any implementation that assume the numeric ordering.
 */
var DiagLogLevel;
(function (DiagLogLevel) {
    /** Diagnostic Logging level setting to disable all logging (except and forced logs) */
    DiagLogLevel[DiagLogLevel["NONE"] = 0] = "NONE";
    /** Identifies an error scenario */
    DiagLogLevel[DiagLogLevel["ERROR"] = 30] = "ERROR";
    /** Identifies a warning scenario */
    DiagLogLevel[DiagLogLevel["WARN"] = 50] = "WARN";
    /** General informational log message */
    DiagLogLevel[DiagLogLevel["INFO"] = 60] = "INFO";
    /** General debug log message */
    DiagLogLevel[DiagLogLevel["DEBUG"] = 70] = "DEBUG";
    /**
     * Detailed trace level logging should only be used for development, should only be set
     * in a development environment.
     */
    DiagLogLevel[DiagLogLevel["VERBOSE"] = 80] = "VERBOSE";
    /** Used to set the logging level to include all logging */
    DiagLogLevel[DiagLogLevel["ALL"] = 9999] = "ALL";
})(DiagLogLevel || (DiagLogLevel = {}));
//# sourceMappingURL=types.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/internal/global-utils.js":
/*!****************************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/internal/global-utils.js ***!
  \****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getGlobal: () => (/* binding */ getGlobal),
/* harmony export */   registerGlobal: () => (/* binding */ registerGlobal),
/* harmony export */   unregisterGlobal: () => (/* binding */ unregisterGlobal)
/* harmony export */ });
/* harmony import */ var _platform__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../platform */ "./node_modules/@opentelemetry/api/build/esm/platform/browser/globalThis.js");
/* harmony import */ var _version__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../version */ "./node_modules/@opentelemetry/api/build/esm/version.js");
/* harmony import */ var _semver__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./semver */ "./node_modules/@opentelemetry/api/build/esm/internal/semver.js");
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



var major = _version__WEBPACK_IMPORTED_MODULE_0__.VERSION.split('.')[0];
var GLOBAL_OPENTELEMETRY_API_KEY = Symbol.for("opentelemetry.js.api." + major);
var _global = _platform__WEBPACK_IMPORTED_MODULE_1__._globalThis;
function registerGlobal(type, instance, diag, allowOverride) {
    var _a;
    if (allowOverride === void 0) { allowOverride = false; }
    var api = (_global[GLOBAL_OPENTELEMETRY_API_KEY] = (_a = _global[GLOBAL_OPENTELEMETRY_API_KEY]) !== null && _a !== void 0 ? _a : {
        version: _version__WEBPACK_IMPORTED_MODULE_0__.VERSION,
    });
    if (!allowOverride && api[type]) {
        // already registered an API of this type
        var err = new Error("@opentelemetry/api: Attempted duplicate registration of API: " + type);
        diag.error(err.stack || err.message);
        return false;
    }
    if (api.version !== _version__WEBPACK_IMPORTED_MODULE_0__.VERSION) {
        // All registered APIs must be of the same version exactly
        var err = new Error("@opentelemetry/api: Registration of version v" + api.version + " for " + type + " does not match previously registered API v" + _version__WEBPACK_IMPORTED_MODULE_0__.VERSION);
        diag.error(err.stack || err.message);
        return false;
    }
    api[type] = instance;
    diag.debug("@opentelemetry/api: Registered a global for " + type + " v" + _version__WEBPACK_IMPORTED_MODULE_0__.VERSION + ".");
    return true;
}
function getGlobal(type) {
    var _a, _b;
    var globalVersion = (_a = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _a === void 0 ? void 0 : _a.version;
    if (!globalVersion || !(0,_semver__WEBPACK_IMPORTED_MODULE_2__.isCompatible)(globalVersion)) {
        return;
    }
    return (_b = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _b === void 0 ? void 0 : _b[type];
}
function unregisterGlobal(type, diag) {
    diag.debug("@opentelemetry/api: Unregistering a global for " + type + " v" + _version__WEBPACK_IMPORTED_MODULE_0__.VERSION + ".");
    var api = _global[GLOBAL_OPENTELEMETRY_API_KEY];
    if (api) {
        delete api[type];
    }
}
//# sourceMappingURL=global-utils.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/internal/semver.js":
/*!**********************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/internal/semver.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   _makeCompatibilityCheck: () => (/* binding */ _makeCompatibilityCheck),
/* harmony export */   isCompatible: () => (/* binding */ isCompatible)
/* harmony export */ });
/* harmony import */ var _version__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../version */ "./node_modules/@opentelemetry/api/build/esm/version.js");
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var re = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
/**
 * Create a function to test an API version to see if it is compatible with the provided ownVersion.
 *
 * The returned function has the following semantics:
 * - Exact match is always compatible
 * - Major versions must match exactly
 *    - 1.x package cannot use global 2.x package
 *    - 2.x package cannot use global 1.x package
 * - The minor version of the API module requesting access to the global API must be less than or equal to the minor version of this API
 *    - 1.3 package may use 1.4 global because the later global contains all functions 1.3 expects
 *    - 1.4 package may NOT use 1.3 global because it may try to call functions which don't exist on 1.3
 * - If the major version is 0, the minor version is treated as the major and the patch is treated as the minor
 * - Patch and build tag differences are not considered at this time
 *
 * @param ownVersion version which should be checked against
 */
function _makeCompatibilityCheck(ownVersion) {
    var acceptedVersions = new Set([ownVersion]);
    var rejectedVersions = new Set();
    var myVersionMatch = ownVersion.match(re);
    if (!myVersionMatch) {
        // we cannot guarantee compatibility so we always return noop
        return function () { return false; };
    }
    var ownVersionParsed = {
        major: +myVersionMatch[1],
        minor: +myVersionMatch[2],
        patch: +myVersionMatch[3],
        prerelease: myVersionMatch[4],
    };
    // if ownVersion has a prerelease tag, versions must match exactly
    if (ownVersionParsed.prerelease != null) {
        return function isExactmatch(globalVersion) {
            return globalVersion === ownVersion;
        };
    }
    function _reject(v) {
        rejectedVersions.add(v);
        return false;
    }
    function _accept(v) {
        acceptedVersions.add(v);
        return true;
    }
    return function isCompatible(globalVersion) {
        if (acceptedVersions.has(globalVersion)) {
            return true;
        }
        if (rejectedVersions.has(globalVersion)) {
            return false;
        }
        var globalVersionMatch = globalVersion.match(re);
        if (!globalVersionMatch) {
            // cannot parse other version
            // we cannot guarantee compatibility so we always noop
            return _reject(globalVersion);
        }
        var globalVersionParsed = {
            major: +globalVersionMatch[1],
            minor: +globalVersionMatch[2],
            patch: +globalVersionMatch[3],
            prerelease: globalVersionMatch[4],
        };
        // if globalVersion has a prerelease tag, versions must match exactly
        if (globalVersionParsed.prerelease != null) {
            return _reject(globalVersion);
        }
        // major versions must match
        if (ownVersionParsed.major !== globalVersionParsed.major) {
            return _reject(globalVersion);
        }
        if (ownVersionParsed.major === 0) {
            if (ownVersionParsed.minor === globalVersionParsed.minor &&
                ownVersionParsed.patch <= globalVersionParsed.patch) {
                return _accept(globalVersion);
            }
            return _reject(globalVersion);
        }
        if (ownVersionParsed.minor <= globalVersionParsed.minor) {
            return _accept(globalVersion);
        }
        return _reject(globalVersion);
    };
}
/**
 * Test an API version to see if it is compatible with this API.
 *
 * - Exact match is always compatible
 * - Major versions must match exactly
 *    - 1.x package cannot use global 2.x package
 *    - 2.x package cannot use global 1.x package
 * - The minor version of the API module requesting access to the global API must be less than or equal to the minor version of this API
 *    - 1.3 package may use 1.4 global because the later global contains all functions 1.3 expects
 *    - 1.4 package may NOT use 1.3 global because it may try to call functions which don't exist on 1.3
 * - If the major version is 0, the minor version is treated as the major and the patch is treated as the minor
 * - Patch and build tag differences are not considered at this time
 *
 * @param version version of the API requesting an instance of the global API
 */
var isCompatible = _makeCompatibilityCheck(_version__WEBPACK_IMPORTED_MODULE_0__.VERSION);
//# sourceMappingURL=semver.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/platform/browser/globalThis.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/platform/browser/globalThis.js ***!
  \**********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   _globalThis: () => (/* binding */ _globalThis)
/* harmony export */ });
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// Updates to this file should also be replicated to @opentelemetry/core too.
/**
 * - globalThis (New standard)
 * - self (Will return the current window instance for supported browsers)
 * - window (fallback for older browser implementations)
 * - global (NodeJS implementation)
 * - <object> (When all else fails)
 */
/** only globals that common to node and browsers are allowed */
// eslint-disable-next-line node/no-unsupported-features/es-builtins, no-undef
var _globalThis = typeof globalThis === 'object'
    ? globalThis
    : typeof self === 'object'
        ? self
        : typeof window === 'object'
            ? window
            : typeof __webpack_require__.g === 'object'
                ? __webpack_require__.g
                : {};
//# sourceMappingURL=globalThis.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/trace-api.js":
/*!****************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/trace-api.js ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   trace: () => (/* binding */ trace)
/* harmony export */ });
/* harmony import */ var _api_trace__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./api/trace */ "./node_modules/@opentelemetry/api/build/esm/api/trace.js");
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// Split module-level variable definition into separate files to allow
// tree-shaking on each api instance.

/** Entrypoint for trace API */
var trace = _api_trace__WEBPACK_IMPORTED_MODULE_0__.TraceAPI.getInstance();
//# sourceMappingURL=trace-api.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js":
/*!*****************************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js ***!
  \*****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   NonRecordingSpan: () => (/* binding */ NonRecordingSpan)
/* harmony export */ });
/* harmony import */ var _invalid_span_constants__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./invalid-span-constants */ "./node_modules/@opentelemetry/api/build/esm/trace/invalid-span-constants.js");
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * The NonRecordingSpan is the default {@link Span} that is used when no Span
 * implementation is available. All operations are no-op including context
 * propagation.
 */
var NonRecordingSpan = /** @class */ (function () {
    function NonRecordingSpan(_spanContext) {
        if (_spanContext === void 0) { _spanContext = _invalid_span_constants__WEBPACK_IMPORTED_MODULE_0__.INVALID_SPAN_CONTEXT; }
        this._spanContext = _spanContext;
    }
    // Returns a SpanContext.
    NonRecordingSpan.prototype.spanContext = function () {
        return this._spanContext;
    };
    // By default does nothing
    NonRecordingSpan.prototype.setAttribute = function (_key, _value) {
        return this;
    };
    // By default does nothing
    NonRecordingSpan.prototype.setAttributes = function (_attributes) {
        return this;
    };
    // By default does nothing
    NonRecordingSpan.prototype.addEvent = function (_name, _attributes) {
        return this;
    };
    NonRecordingSpan.prototype.addLink = function (_link) {
        return this;
    };
    NonRecordingSpan.prototype.addLinks = function (_links) {
        return this;
    };
    // By default does nothing
    NonRecordingSpan.prototype.setStatus = function (_status) {
        return this;
    };
    // By default does nothing
    NonRecordingSpan.prototype.updateName = function (_name) {
        return this;
    };
    // By default does nothing
    NonRecordingSpan.prototype.end = function (_endTime) { };
    // isRecording always returns false for NonRecordingSpan.
    NonRecordingSpan.prototype.isRecording = function () {
        return false;
    };
    // By default does nothing
    NonRecordingSpan.prototype.recordException = function (_exception, _time) { };
    return NonRecordingSpan;
}());

//# sourceMappingURL=NonRecordingSpan.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/trace/NoopTracer.js":
/*!***********************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/trace/NoopTracer.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   NoopTracer: () => (/* binding */ NoopTracer)
/* harmony export */ });
/* harmony import */ var _api_context__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../api/context */ "./node_modules/@opentelemetry/api/build/esm/api/context.js");
/* harmony import */ var _trace_context_utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../trace/context-utils */ "./node_modules/@opentelemetry/api/build/esm/trace/context-utils.js");
/* harmony import */ var _NonRecordingSpan__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./NonRecordingSpan */ "./node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js");
/* harmony import */ var _spancontext_utils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./spancontext-utils */ "./node_modules/@opentelemetry/api/build/esm/trace/spancontext-utils.js");
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */




var contextApi = _api_context__WEBPACK_IMPORTED_MODULE_0__.ContextAPI.getInstance();
/**
 * No-op implementations of {@link Tracer}.
 */
var NoopTracer = /** @class */ (function () {
    function NoopTracer() {
    }
    // startSpan starts a noop span.
    NoopTracer.prototype.startSpan = function (name, options, context) {
        if (context === void 0) { context = contextApi.active(); }
        var root = Boolean(options === null || options === void 0 ? void 0 : options.root);
        if (root) {
            return new _NonRecordingSpan__WEBPACK_IMPORTED_MODULE_1__.NonRecordingSpan();
        }
        var parentFromContext = context && (0,_trace_context_utils__WEBPACK_IMPORTED_MODULE_2__.getSpanContext)(context);
        if (isSpanContext(parentFromContext) &&
            (0,_spancontext_utils__WEBPACK_IMPORTED_MODULE_3__.isSpanContextValid)(parentFromContext)) {
            return new _NonRecordingSpan__WEBPACK_IMPORTED_MODULE_1__.NonRecordingSpan(parentFromContext);
        }
        else {
            return new _NonRecordingSpan__WEBPACK_IMPORTED_MODULE_1__.NonRecordingSpan();
        }
    };
    NoopTracer.prototype.startActiveSpan = function (name, arg2, arg3, arg4) {
        var opts;
        var ctx;
        var fn;
        if (arguments.length < 2) {
            return;
        }
        else if (arguments.length === 2) {
            fn = arg2;
        }
        else if (arguments.length === 3) {
            opts = arg2;
            fn = arg3;
        }
        else {
            opts = arg2;
            ctx = arg3;
            fn = arg4;
        }
        var parentContext = ctx !== null && ctx !== void 0 ? ctx : contextApi.active();
        var span = this.startSpan(name, opts, parentContext);
        var contextWithSpanSet = (0,_trace_context_utils__WEBPACK_IMPORTED_MODULE_2__.setSpan)(parentContext, span);
        return contextApi.with(contextWithSpanSet, fn, undefined, span);
    };
    return NoopTracer;
}());

function isSpanContext(spanContext) {
    return (typeof spanContext === 'object' &&
        typeof spanContext['spanId'] === 'string' &&
        typeof spanContext['traceId'] === 'string' &&
        typeof spanContext['traceFlags'] === 'number');
}
//# sourceMappingURL=NoopTracer.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/trace/NoopTracerProvider.js":
/*!*******************************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/trace/NoopTracerProvider.js ***!
  \*******************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   NoopTracerProvider: () => (/* binding */ NoopTracerProvider)
/* harmony export */ });
/* harmony import */ var _NoopTracer__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./NoopTracer */ "./node_modules/@opentelemetry/api/build/esm/trace/NoopTracer.js");
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * An implementation of the {@link TracerProvider} which returns an impotent
 * Tracer for all calls to `getTracer`.
 *
 * All operations are no-op.
 */
var NoopTracerProvider = /** @class */ (function () {
    function NoopTracerProvider() {
    }
    NoopTracerProvider.prototype.getTracer = function (_name, _version, _options) {
        return new _NoopTracer__WEBPACK_IMPORTED_MODULE_0__.NoopTracer();
    };
    return NoopTracerProvider;
}());

//# sourceMappingURL=NoopTracerProvider.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/trace/ProxyTracer.js":
/*!************************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/trace/ProxyTracer.js ***!
  \************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ProxyTracer: () => (/* binding */ ProxyTracer)
/* harmony export */ });
/* harmony import */ var _NoopTracer__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./NoopTracer */ "./node_modules/@opentelemetry/api/build/esm/trace/NoopTracer.js");
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var NOOP_TRACER = new _NoopTracer__WEBPACK_IMPORTED_MODULE_0__.NoopTracer();
/**
 * Proxy tracer provided by the proxy tracer provider
 */
var ProxyTracer = /** @class */ (function () {
    function ProxyTracer(_provider, name, version, options) {
        this._provider = _provider;
        this.name = name;
        this.version = version;
        this.options = options;
    }
    ProxyTracer.prototype.startSpan = function (name, options, context) {
        return this._getTracer().startSpan(name, options, context);
    };
    ProxyTracer.prototype.startActiveSpan = function (_name, _options, _context, _fn) {
        var tracer = this._getTracer();
        return Reflect.apply(tracer.startActiveSpan, tracer, arguments);
    };
    /**
     * Try to get a tracer from the proxy tracer provider.
     * If the proxy tracer provider has no delegate, return a noop tracer.
     */
    ProxyTracer.prototype._getTracer = function () {
        if (this._delegate) {
            return this._delegate;
        }
        var tracer = this._provider.getDelegateTracer(this.name, this.version, this.options);
        if (!tracer) {
            return NOOP_TRACER;
        }
        this._delegate = tracer;
        return this._delegate;
    };
    return ProxyTracer;
}());

//# sourceMappingURL=ProxyTracer.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/trace/ProxyTracerProvider.js":
/*!********************************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/trace/ProxyTracerProvider.js ***!
  \********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ProxyTracerProvider: () => (/* binding */ ProxyTracerProvider)
/* harmony export */ });
/* harmony import */ var _ProxyTracer__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ProxyTracer */ "./node_modules/@opentelemetry/api/build/esm/trace/ProxyTracer.js");
/* harmony import */ var _NoopTracerProvider__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./NoopTracerProvider */ "./node_modules/@opentelemetry/api/build/esm/trace/NoopTracerProvider.js");
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


var NOOP_TRACER_PROVIDER = new _NoopTracerProvider__WEBPACK_IMPORTED_MODULE_0__.NoopTracerProvider();
/**
 * Tracer provider which provides {@link ProxyTracer}s.
 *
 * Before a delegate is set, tracers provided are NoOp.
 *   When a delegate is set, traces are provided from the delegate.
 *   When a delegate is set after tracers have already been provided,
 *   all tracers already provided will use the provided delegate implementation.
 */
var ProxyTracerProvider = /** @class */ (function () {
    function ProxyTracerProvider() {
    }
    /**
     * Get a {@link ProxyTracer}
     */
    ProxyTracerProvider.prototype.getTracer = function (name, version, options) {
        var _a;
        return ((_a = this.getDelegateTracer(name, version, options)) !== null && _a !== void 0 ? _a : new _ProxyTracer__WEBPACK_IMPORTED_MODULE_1__.ProxyTracer(this, name, version, options));
    };
    ProxyTracerProvider.prototype.getDelegate = function () {
        var _a;
        return (_a = this._delegate) !== null && _a !== void 0 ? _a : NOOP_TRACER_PROVIDER;
    };
    /**
     * Set the delegate tracer provider
     */
    ProxyTracerProvider.prototype.setDelegate = function (delegate) {
        this._delegate = delegate;
    };
    ProxyTracerProvider.prototype.getDelegateTracer = function (name, version, options) {
        var _a;
        return (_a = this._delegate) === null || _a === void 0 ? void 0 : _a.getTracer(name, version, options);
    };
    return ProxyTracerProvider;
}());

//# sourceMappingURL=ProxyTracerProvider.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/trace/context-utils.js":
/*!**************************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/trace/context-utils.js ***!
  \**************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   deleteSpan: () => (/* binding */ deleteSpan),
/* harmony export */   getActiveSpan: () => (/* binding */ getActiveSpan),
/* harmony export */   getSpan: () => (/* binding */ getSpan),
/* harmony export */   getSpanContext: () => (/* binding */ getSpanContext),
/* harmony export */   setSpan: () => (/* binding */ setSpan),
/* harmony export */   setSpanContext: () => (/* binding */ setSpanContext)
/* harmony export */ });
/* harmony import */ var _context_context__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../context/context */ "./node_modules/@opentelemetry/api/build/esm/context/context.js");
/* harmony import */ var _NonRecordingSpan__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./NonRecordingSpan */ "./node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js");
/* harmony import */ var _api_context__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../api/context */ "./node_modules/@opentelemetry/api/build/esm/api/context.js");
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



/**
 * span key
 */
var SPAN_KEY = (0,_context_context__WEBPACK_IMPORTED_MODULE_0__.createContextKey)('OpenTelemetry Context Key SPAN');
/**
 * Return the span if one exists
 *
 * @param context context to get span from
 */
function getSpan(context) {
    return context.getValue(SPAN_KEY) || undefined;
}
/**
 * Gets the span from the current context, if one exists.
 */
function getActiveSpan() {
    return getSpan(_api_context__WEBPACK_IMPORTED_MODULE_1__.ContextAPI.getInstance().active());
}
/**
 * Set the span on a context
 *
 * @param context context to use as parent
 * @param span span to set active
 */
function setSpan(context, span) {
    return context.setValue(SPAN_KEY, span);
}
/**
 * Remove current span stored in the context
 *
 * @param context context to delete span from
 */
function deleteSpan(context) {
    return context.deleteValue(SPAN_KEY);
}
/**
 * Wrap span context in a NoopSpan and set as span in a new
 * context
 *
 * @param context context to set active span on
 * @param spanContext span context to be wrapped
 */
function setSpanContext(context, spanContext) {
    return setSpan(context, new _NonRecordingSpan__WEBPACK_IMPORTED_MODULE_2__.NonRecordingSpan(spanContext));
}
/**
 * Get the span context of the span if it exists.
 *
 * @param context context to get values from
 */
function getSpanContext(context) {
    var _a;
    return (_a = getSpan(context)) === null || _a === void 0 ? void 0 : _a.spanContext();
}
//# sourceMappingURL=context-utils.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/trace/invalid-span-constants.js":
/*!***********************************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/trace/invalid-span-constants.js ***!
  \***********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   INVALID_SPANID: () => (/* binding */ INVALID_SPANID),
/* harmony export */   INVALID_SPAN_CONTEXT: () => (/* binding */ INVALID_SPAN_CONTEXT),
/* harmony export */   INVALID_TRACEID: () => (/* binding */ INVALID_TRACEID)
/* harmony export */ });
/* harmony import */ var _trace_flags__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./trace_flags */ "./node_modules/@opentelemetry/api/build/esm/trace/trace_flags.js");
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var INVALID_SPANID = '0000000000000000';
var INVALID_TRACEID = '00000000000000000000000000000000';
var INVALID_SPAN_CONTEXT = {
    traceId: INVALID_TRACEID,
    spanId: INVALID_SPANID,
    traceFlags: _trace_flags__WEBPACK_IMPORTED_MODULE_0__.TraceFlags.NONE,
};
//# sourceMappingURL=invalid-span-constants.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/trace/spancontext-utils.js":
/*!******************************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/trace/spancontext-utils.js ***!
  \******************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   isSpanContextValid: () => (/* binding */ isSpanContextValid),
/* harmony export */   isValidSpanId: () => (/* binding */ isValidSpanId),
/* harmony export */   isValidTraceId: () => (/* binding */ isValidTraceId),
/* harmony export */   wrapSpanContext: () => (/* binding */ wrapSpanContext)
/* harmony export */ });
/* harmony import */ var _invalid_span_constants__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./invalid-span-constants */ "./node_modules/@opentelemetry/api/build/esm/trace/invalid-span-constants.js");
/* harmony import */ var _NonRecordingSpan__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./NonRecordingSpan */ "./node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js");
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


var VALID_TRACEID_REGEX = /^([0-9a-f]{32})$/i;
var VALID_SPANID_REGEX = /^[0-9a-f]{16}$/i;
function isValidTraceId(traceId) {
    return VALID_TRACEID_REGEX.test(traceId) && traceId !== _invalid_span_constants__WEBPACK_IMPORTED_MODULE_0__.INVALID_TRACEID;
}
function isValidSpanId(spanId) {
    return VALID_SPANID_REGEX.test(spanId) && spanId !== _invalid_span_constants__WEBPACK_IMPORTED_MODULE_0__.INVALID_SPANID;
}
/**
 * Returns true if this {@link SpanContext} is valid.
 * @return true if this {@link SpanContext} is valid.
 */
function isSpanContextValid(spanContext) {
    return (isValidTraceId(spanContext.traceId) && isValidSpanId(spanContext.spanId));
}
/**
 * Wrap the given {@link SpanContext} in a new non-recording {@link Span}
 *
 * @param spanContext span context to be wrapped
 * @returns a new non-recording {@link Span} with the provided context
 */
function wrapSpanContext(spanContext) {
    return new _NonRecordingSpan__WEBPACK_IMPORTED_MODULE_1__.NonRecordingSpan(spanContext);
}
//# sourceMappingURL=spancontext-utils.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/trace/status.js":
/*!*******************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/trace/status.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SpanStatusCode: () => (/* binding */ SpanStatusCode)
/* harmony export */ });
/**
 * An enumeration of status codes.
 */
var SpanStatusCode;
(function (SpanStatusCode) {
    /**
     * The default status.
     */
    SpanStatusCode[SpanStatusCode["UNSET"] = 0] = "UNSET";
    /**
     * The operation has been validated by an Application developer or
     * Operator to have completed successfully.
     */
    SpanStatusCode[SpanStatusCode["OK"] = 1] = "OK";
    /**
     * The operation contains an error.
     */
    SpanStatusCode[SpanStatusCode["ERROR"] = 2] = "ERROR";
})(SpanStatusCode || (SpanStatusCode = {}));
//# sourceMappingURL=status.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/trace/trace_flags.js":
/*!************************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/trace/trace_flags.js ***!
  \************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TraceFlags: () => (/* binding */ TraceFlags)
/* harmony export */ });
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var TraceFlags;
(function (TraceFlags) {
    /** Represents no flag set. */
    TraceFlags[TraceFlags["NONE"] = 0] = "NONE";
    /** Bit to represent whether trace is sampled in trace flags. */
    TraceFlags[TraceFlags["SAMPLED"] = 1] = "SAMPLED";
})(TraceFlags || (TraceFlags = {}));
//# sourceMappingURL=trace_flags.js.map

/***/ }),

/***/ "./node_modules/@opentelemetry/api/build/esm/version.js":
/*!**************************************************************!*\
  !*** ./node_modules/@opentelemetry/api/build/esm/version.js ***!
  \**************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   VERSION: () => (/* binding */ VERSION)
/* harmony export */ });
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// this is autogenerated file, see scripts/version-update.js
var VERSION = '1.9.0';
//# sourceMappingURL=version.js.map

/***/ }),

/***/ "./node_modules/ai/dist/index.mjs":
/*!****************************************!*\
  !*** ./node_modules/ai/dist/index.mjs ***!
  \****************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AISDKError: () => (/* reexport safe */ _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError),
/* harmony export */   APICallError: () => (/* reexport safe */ _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.APICallError),
/* harmony export */   AssistantResponse: () => (/* binding */ AssistantResponse),
/* harmony export */   DownloadError: () => (/* binding */ DownloadError),
/* harmony export */   EmptyResponseBodyError: () => (/* reexport safe */ _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.EmptyResponseBodyError),
/* harmony export */   InvalidArgumentError: () => (/* binding */ InvalidArgumentError),
/* harmony export */   InvalidDataContentError: () => (/* binding */ InvalidDataContentError),
/* harmony export */   InvalidMessageRoleError: () => (/* binding */ InvalidMessageRoleError),
/* harmony export */   InvalidPromptError: () => (/* reexport safe */ _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.InvalidPromptError),
/* harmony export */   InvalidResponseDataError: () => (/* reexport safe */ _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.InvalidResponseDataError),
/* harmony export */   InvalidStreamPartError: () => (/* binding */ InvalidStreamPartError),
/* harmony export */   InvalidToolArgumentsError: () => (/* binding */ InvalidToolArgumentsError),
/* harmony export */   JSONParseError: () => (/* reexport safe */ _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.JSONParseError),
/* harmony export */   LangChainAdapter: () => (/* binding */ langchain_adapter_exports),
/* harmony export */   LlamaIndexAdapter: () => (/* binding */ llamaindex_adapter_exports),
/* harmony export */   LoadAPIKeyError: () => (/* reexport safe */ _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.LoadAPIKeyError),
/* harmony export */   MCPClientError: () => (/* binding */ MCPClientError),
/* harmony export */   MessageConversionError: () => (/* binding */ MessageConversionError),
/* harmony export */   NoContentGeneratedError: () => (/* reexport safe */ _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.NoContentGeneratedError),
/* harmony export */   NoImageGeneratedError: () => (/* binding */ NoImageGeneratedError),
/* harmony export */   NoObjectGeneratedError: () => (/* binding */ NoObjectGeneratedError),
/* harmony export */   NoOutputSpecifiedError: () => (/* binding */ NoOutputSpecifiedError),
/* harmony export */   NoSuchModelError: () => (/* reexport safe */ _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.NoSuchModelError),
/* harmony export */   NoSuchProviderError: () => (/* binding */ NoSuchProviderError),
/* harmony export */   NoSuchToolError: () => (/* binding */ NoSuchToolError),
/* harmony export */   Output: () => (/* binding */ output_exports),
/* harmony export */   RetryError: () => (/* binding */ RetryError),
/* harmony export */   StreamData: () => (/* binding */ StreamData),
/* harmony export */   ToolCallRepairError: () => (/* binding */ ToolCallRepairError),
/* harmony export */   ToolExecutionError: () => (/* binding */ ToolExecutionError),
/* harmony export */   TypeValidationError: () => (/* reexport safe */ _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.TypeValidationError),
/* harmony export */   UnsupportedFunctionalityError: () => (/* reexport safe */ _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError),
/* harmony export */   appendClientMessage: () => (/* binding */ appendClientMessage),
/* harmony export */   appendResponseMessages: () => (/* binding */ appendResponseMessages),
/* harmony export */   convertToCoreMessages: () => (/* binding */ convertToCoreMessages),
/* harmony export */   coreAssistantMessageSchema: () => (/* binding */ coreAssistantMessageSchema),
/* harmony export */   coreMessageSchema: () => (/* binding */ coreMessageSchema),
/* harmony export */   coreSystemMessageSchema: () => (/* binding */ coreSystemMessageSchema),
/* harmony export */   coreToolMessageSchema: () => (/* binding */ coreToolMessageSchema),
/* harmony export */   coreUserMessageSchema: () => (/* binding */ coreUserMessageSchema),
/* harmony export */   cosineSimilarity: () => (/* binding */ cosineSimilarity),
/* harmony export */   createDataStream: () => (/* binding */ createDataStream),
/* harmony export */   createDataStreamResponse: () => (/* binding */ createDataStreamResponse),
/* harmony export */   createIdGenerator: () => (/* reexport safe */ _ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.createIdGenerator),
/* harmony export */   createProviderRegistry: () => (/* binding */ createProviderRegistry),
/* harmony export */   customProvider: () => (/* binding */ customProvider),
/* harmony export */   defaultSettingsMiddleware: () => (/* binding */ defaultSettingsMiddleware),
/* harmony export */   embed: () => (/* binding */ embed),
/* harmony export */   embedMany: () => (/* binding */ embedMany),
/* harmony export */   experimental_createMCPClient: () => (/* binding */ createMCPClient),
/* harmony export */   experimental_createProviderRegistry: () => (/* binding */ experimental_createProviderRegistry),
/* harmony export */   experimental_customProvider: () => (/* binding */ experimental_customProvider),
/* harmony export */   experimental_generateImage: () => (/* binding */ generateImage),
/* harmony export */   experimental_generateSpeech: () => (/* binding */ generateSpeech),
/* harmony export */   experimental_transcribe: () => (/* binding */ transcribe),
/* harmony export */   experimental_wrapLanguageModel: () => (/* binding */ experimental_wrapLanguageModel),
/* harmony export */   extractReasoningMiddleware: () => (/* binding */ extractReasoningMiddleware),
/* harmony export */   formatAssistantStreamPart: () => (/* reexport safe */ _ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatAssistantStreamPart),
/* harmony export */   formatDataStreamPart: () => (/* reexport safe */ _ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart),
/* harmony export */   generateId: () => (/* reexport safe */ _ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.generateId),
/* harmony export */   generateObject: () => (/* binding */ generateObject),
/* harmony export */   generateText: () => (/* binding */ generateText),
/* harmony export */   jsonSchema: () => (/* reexport safe */ _ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.jsonSchema),
/* harmony export */   parseAssistantStreamPart: () => (/* reexport safe */ _ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.parseAssistantStreamPart),
/* harmony export */   parseDataStreamPart: () => (/* reexport safe */ _ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.parseDataStreamPart),
/* harmony export */   pipeDataStreamToResponse: () => (/* binding */ pipeDataStreamToResponse),
/* harmony export */   processDataStream: () => (/* reexport safe */ _ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.processDataStream),
/* harmony export */   processTextStream: () => (/* reexport safe */ _ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.processTextStream),
/* harmony export */   simulateReadableStream: () => (/* binding */ simulateReadableStream),
/* harmony export */   simulateStreamingMiddleware: () => (/* binding */ simulateStreamingMiddleware),
/* harmony export */   smoothStream: () => (/* binding */ smoothStream),
/* harmony export */   streamObject: () => (/* binding */ streamObject),
/* harmony export */   streamText: () => (/* binding */ streamText),
/* harmony export */   tool: () => (/* binding */ tool),
/* harmony export */   wrapLanguageModel: () => (/* binding */ wrapLanguageModel),
/* harmony export */   zodSchema: () => (/* reexport safe */ _ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.zodSchema)
/* harmony export */ });
/* harmony import */ var _ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @ai-sdk/provider-utils */ "./node_modules/@ai-sdk/provider-utils/dist/index.mjs");
/* harmony import */ var _ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @ai-sdk/ui-utils */ "./node_modules/@ai-sdk/ui-utils/dist/index.mjs");
/* harmony import */ var _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @ai-sdk/provider */ "./node_modules/@ai-sdk/provider/dist/index.mjs");
/* harmony import */ var _opentelemetry_api__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @opentelemetry/api */ "./node_modules/@opentelemetry/api/build/esm/trace-api.js");
/* harmony import */ var _opentelemetry_api__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @opentelemetry/api */ "./node_modules/@opentelemetry/api/build/esm/trace/status.js");
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! zod */ "./node_modules/zod/lib/index.mjs");
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name17 in all)
    __defProp(target, name17, { get: all[name17], enumerable: true });
};

// core/index.ts



// core/data-stream/create-data-stream.ts

function createDataStream({
  execute,
  onError = () => "An error occurred."
  // mask error messages for safety by default
}) {
  let controller;
  const ongoingStreamPromises = [];
  const stream = new ReadableStream({
    start(controllerArg) {
      controller = controllerArg;
    }
  });
  function safeEnqueue(data) {
    try {
      controller.enqueue(data);
    } catch (error) {
    }
  }
  try {
    const result = execute({
      write(data) {
        safeEnqueue(data);
      },
      writeData(data) {
        safeEnqueue((0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("data", [data]));
      },
      writeMessageAnnotation(annotation) {
        safeEnqueue((0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("message_annotations", [annotation]));
      },
      writeSource(source) {
        safeEnqueue((0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("source", source));
      },
      merge(streamArg) {
        ongoingStreamPromises.push(
          (async () => {
            const reader = streamArg.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done)
                break;
              safeEnqueue(value);
            }
          })().catch((error) => {
            safeEnqueue((0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("error", onError(error)));
          })
        );
      },
      onError
    });
    if (result) {
      ongoingStreamPromises.push(
        result.catch((error) => {
          safeEnqueue((0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("error", onError(error)));
        })
      );
    }
  } catch (error) {
    safeEnqueue((0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("error", onError(error)));
  }
  const waitForStreams = new Promise(async (resolve) => {
    while (ongoingStreamPromises.length > 0) {
      await ongoingStreamPromises.shift();
    }
    resolve();
  });
  waitForStreams.finally(() => {
    try {
      controller.close();
    } catch (error) {
    }
  });
  return stream;
}

// core/util/prepare-response-headers.ts
function prepareResponseHeaders(headers, {
  contentType,
  dataStreamVersion
}) {
  const responseHeaders = new Headers(headers != null ? headers : {});
  if (!responseHeaders.has("Content-Type")) {
    responseHeaders.set("Content-Type", contentType);
  }
  if (dataStreamVersion !== void 0) {
    responseHeaders.set("X-Vercel-AI-Data-Stream", dataStreamVersion);
  }
  return responseHeaders;
}

// core/data-stream/create-data-stream-response.ts
function createDataStreamResponse({
  status,
  statusText,
  headers,
  execute,
  onError
}) {
  return new Response(
    createDataStream({ execute, onError }).pipeThrough(new TextEncoderStream()),
    {
      status,
      statusText,
      headers: prepareResponseHeaders(headers, {
        contentType: "text/plain; charset=utf-8",
        dataStreamVersion: "v1"
      })
    }
  );
}

// core/util/prepare-outgoing-http-headers.ts
function prepareOutgoingHttpHeaders(headers, {
  contentType,
  dataStreamVersion
}) {
  const outgoingHeaders = {};
  if (headers != null) {
    for (const [key, value] of Object.entries(headers)) {
      outgoingHeaders[key] = value;
    }
  }
  if (outgoingHeaders["Content-Type"] == null) {
    outgoingHeaders["Content-Type"] = contentType;
  }
  if (dataStreamVersion !== void 0) {
    outgoingHeaders["X-Vercel-AI-Data-Stream"] = dataStreamVersion;
  }
  return outgoingHeaders;
}

// core/util/write-to-server-response.ts
function writeToServerResponse({
  response,
  status,
  statusText,
  headers,
  stream
}) {
  response.writeHead(status != null ? status : 200, statusText, headers);
  const reader = stream.getReader();
  const read = async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done)
          break;
        response.write(value);
      }
    } catch (error) {
      throw error;
    } finally {
      response.end();
    }
  };
  read();
}

// core/data-stream/pipe-data-stream-to-response.ts
function pipeDataStreamToResponse(response, {
  status,
  statusText,
  headers,
  execute,
  onError
}) {
  writeToServerResponse({
    response,
    status,
    statusText,
    headers: prepareOutgoingHttpHeaders(headers, {
      contentType: "text/plain; charset=utf-8",
      dataStreamVersion: "v1"
    }),
    stream: createDataStream({ execute, onError }).pipeThrough(
      new TextEncoderStream()
    )
  });
}

// errors/invalid-argument-error.ts

var name = "AI_InvalidArgumentError";
var marker = `vercel.ai.error.${name}`;
var symbol = Symbol.for(marker);
var _a;
var InvalidArgumentError = class extends _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError {
  constructor({
    parameter,
    value,
    message
  }) {
    super({
      name,
      message: `Invalid argument for parameter ${parameter}: ${message}`
    });
    this[_a] = true;
    this.parameter = parameter;
    this.value = value;
  }
  static isInstance(error) {
    return _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError.hasMarker(error, marker);
  }
};
_a = symbol;

// util/retry-with-exponential-backoff.ts



// util/retry-error.ts

var name2 = "AI_RetryError";
var marker2 = `vercel.ai.error.${name2}`;
var symbol2 = Symbol.for(marker2);
var _a2;
var RetryError = class extends _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError {
  constructor({
    message,
    reason,
    errors
  }) {
    super({ name: name2, message });
    this[_a2] = true;
    this.reason = reason;
    this.errors = errors;
    this.lastError = errors[errors.length - 1];
  }
  static isInstance(error) {
    return _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError.hasMarker(error, marker2);
  }
};
_a2 = symbol2;

// util/retry-with-exponential-backoff.ts
var retryWithExponentialBackoff = ({
  maxRetries = 2,
  initialDelayInMs = 2e3,
  backoffFactor = 2
} = {}) => async (f) => _retryWithExponentialBackoff(f, {
  maxRetries,
  delayInMs: initialDelayInMs,
  backoffFactor
});
async function _retryWithExponentialBackoff(f, {
  maxRetries,
  delayInMs,
  backoffFactor
}, errors = []) {
  try {
    return await f();
  } catch (error) {
    if ((0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.isAbortError)(error)) {
      throw error;
    }
    if (maxRetries === 0) {
      throw error;
    }
    const errorMessage = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.getErrorMessage)(error);
    const newErrors = [...errors, error];
    const tryNumber = newErrors.length;
    if (tryNumber > maxRetries) {
      throw new RetryError({
        message: `Failed after ${tryNumber} attempts. Last error: ${errorMessage}`,
        reason: "maxRetriesExceeded",
        errors: newErrors
      });
    }
    if (error instanceof Error && _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.APICallError.isInstance(error) && error.isRetryable === true && tryNumber <= maxRetries) {
      await (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.delay)(delayInMs);
      return _retryWithExponentialBackoff(
        f,
        { maxRetries, delayInMs: backoffFactor * delayInMs, backoffFactor },
        newErrors
      );
    }
    if (tryNumber === 1) {
      throw error;
    }
    throw new RetryError({
      message: `Failed after ${tryNumber} attempts with non-retryable error: '${errorMessage}'`,
      reason: "errorNotRetryable",
      errors: newErrors
    });
  }
}

// core/prompt/prepare-retries.ts
function prepareRetries({
  maxRetries
}) {
  if (maxRetries != null) {
    if (!Number.isInteger(maxRetries)) {
      throw new InvalidArgumentError({
        parameter: "maxRetries",
        value: maxRetries,
        message: "maxRetries must be an integer"
      });
    }
    if (maxRetries < 0) {
      throw new InvalidArgumentError({
        parameter: "maxRetries",
        value: maxRetries,
        message: "maxRetries must be >= 0"
      });
    }
  }
  const maxRetriesResult = maxRetries != null ? maxRetries : 2;
  return {
    maxRetries: maxRetriesResult,
    retry: retryWithExponentialBackoff({ maxRetries: maxRetriesResult })
  };
}

// core/telemetry/assemble-operation-name.ts
function assembleOperationName({
  operationId,
  telemetry
}) {
  return {
    // standardized operation and resource name:
    "operation.name": `${operationId}${(telemetry == null ? void 0 : telemetry.functionId) != null ? ` ${telemetry.functionId}` : ""}`,
    "resource.name": telemetry == null ? void 0 : telemetry.functionId,
    // detailed, AI SDK specific data:
    "ai.operationId": operationId,
    "ai.telemetry.functionId": telemetry == null ? void 0 : telemetry.functionId
  };
}

// core/telemetry/get-base-telemetry-attributes.ts
function getBaseTelemetryAttributes({
  model,
  settings,
  telemetry,
  headers
}) {
  var _a17;
  return {
    "ai.model.provider": model.provider,
    "ai.model.id": model.modelId,
    // settings:
    ...Object.entries(settings).reduce((attributes, [key, value]) => {
      attributes[`ai.settings.${key}`] = value;
      return attributes;
    }, {}),
    // add metadata as attributes:
    ...Object.entries((_a17 = telemetry == null ? void 0 : telemetry.metadata) != null ? _a17 : {}).reduce(
      (attributes, [key, value]) => {
        attributes[`ai.telemetry.metadata.${key}`] = value;
        return attributes;
      },
      {}
    ),
    // request headers
    ...Object.entries(headers != null ? headers : {}).reduce((attributes, [key, value]) => {
      if (value !== void 0) {
        attributes[`ai.request.headers.${key}`] = value;
      }
      return attributes;
    }, {})
  };
}

// core/telemetry/get-tracer.ts


// core/telemetry/noop-tracer.ts
var noopTracer = {
  startSpan() {
    return noopSpan;
  },
  startActiveSpan(name17, arg1, arg2, arg3) {
    if (typeof arg1 === "function") {
      return arg1(noopSpan);
    }
    if (typeof arg2 === "function") {
      return arg2(noopSpan);
    }
    if (typeof arg3 === "function") {
      return arg3(noopSpan);
    }
  }
};
var noopSpan = {
  spanContext() {
    return noopSpanContext;
  },
  setAttribute() {
    return this;
  },
  setAttributes() {
    return this;
  },
  addEvent() {
    return this;
  },
  addLink() {
    return this;
  },
  addLinks() {
    return this;
  },
  setStatus() {
    return this;
  },
  updateName() {
    return this;
  },
  end() {
    return this;
  },
  isRecording() {
    return false;
  },
  recordException() {
    return this;
  }
};
var noopSpanContext = {
  traceId: "",
  spanId: "",
  traceFlags: 0
};

// core/telemetry/get-tracer.ts
function getTracer({
  isEnabled = false,
  tracer
} = {}) {
  if (!isEnabled) {
    return noopTracer;
  }
  if (tracer) {
    return tracer;
  }
  return _opentelemetry_api__WEBPACK_IMPORTED_MODULE_3__.trace.getTracer("ai");
}

// core/telemetry/record-span.ts

function recordSpan({
  name: name17,
  tracer,
  attributes,
  fn,
  endWhenDone = true
}) {
  return tracer.startActiveSpan(name17, { attributes }, async (span) => {
    try {
      const result = await fn(span);
      if (endWhenDone) {
        span.end();
      }
      return result;
    } catch (error) {
      try {
        if (error instanceof Error) {
          span.recordException({
            name: error.name,
            message: error.message,
            stack: error.stack
          });
          span.setStatus({
            code: _opentelemetry_api__WEBPACK_IMPORTED_MODULE_4__.SpanStatusCode.ERROR,
            message: error.message
          });
        } else {
          span.setStatus({ code: _opentelemetry_api__WEBPACK_IMPORTED_MODULE_4__.SpanStatusCode.ERROR });
        }
      } finally {
        span.end();
      }
      throw error;
    }
  });
}

// core/telemetry/select-telemetry-attributes.ts
function selectTelemetryAttributes({
  telemetry,
  attributes
}) {
  if ((telemetry == null ? void 0 : telemetry.isEnabled) !== true) {
    return {};
  }
  return Object.entries(attributes).reduce((attributes2, [key, value]) => {
    if (value === void 0) {
      return attributes2;
    }
    if (typeof value === "object" && "input" in value && typeof value.input === "function") {
      if ((telemetry == null ? void 0 : telemetry.recordInputs) === false) {
        return attributes2;
      }
      const result = value.input();
      return result === void 0 ? attributes2 : { ...attributes2, [key]: result };
    }
    if (typeof value === "object" && "output" in value && typeof value.output === "function") {
      if ((telemetry == null ? void 0 : telemetry.recordOutputs) === false) {
        return attributes2;
      }
      const result = value.output();
      return result === void 0 ? attributes2 : { ...attributes2, [key]: result };
    }
    return { ...attributes2, [key]: value };
  }, {});
}

// core/embed/embed.ts
async function embed({
  model,
  value,
  maxRetries: maxRetriesArg,
  abortSignal,
  headers,
  experimental_telemetry: telemetry
}) {
  const { maxRetries, retry } = prepareRetries({ maxRetries: maxRetriesArg });
  const baseTelemetryAttributes = getBaseTelemetryAttributes({
    model,
    telemetry,
    headers,
    settings: { maxRetries }
  });
  const tracer = getTracer(telemetry);
  return recordSpan({
    name: "ai.embed",
    attributes: selectTelemetryAttributes({
      telemetry,
      attributes: {
        ...assembleOperationName({ operationId: "ai.embed", telemetry }),
        ...baseTelemetryAttributes,
        "ai.value": { input: () => JSON.stringify(value) }
      }
    }),
    tracer,
    fn: async (span) => {
      const { embedding, usage, rawResponse } = await retry(
        () => (
          // nested spans to align with the embedMany telemetry data:
          recordSpan({
            name: "ai.embed.doEmbed",
            attributes: selectTelemetryAttributes({
              telemetry,
              attributes: {
                ...assembleOperationName({
                  operationId: "ai.embed.doEmbed",
                  telemetry
                }),
                ...baseTelemetryAttributes,
                // specific settings that only make sense on the outer level:
                "ai.values": { input: () => [JSON.stringify(value)] }
              }
            }),
            tracer,
            fn: async (doEmbedSpan) => {
              var _a17;
              const modelResponse = await model.doEmbed({
                values: [value],
                abortSignal,
                headers
              });
              const embedding2 = modelResponse.embeddings[0];
              const usage2 = (_a17 = modelResponse.usage) != null ? _a17 : { tokens: NaN };
              doEmbedSpan.setAttributes(
                selectTelemetryAttributes({
                  telemetry,
                  attributes: {
                    "ai.embeddings": {
                      output: () => modelResponse.embeddings.map(
                        (embedding3) => JSON.stringify(embedding3)
                      )
                    },
                    "ai.usage.tokens": usage2.tokens
                  }
                })
              );
              return {
                embedding: embedding2,
                usage: usage2,
                rawResponse: modelResponse.rawResponse
              };
            }
          })
        )
      );
      span.setAttributes(
        selectTelemetryAttributes({
          telemetry,
          attributes: {
            "ai.embedding": { output: () => JSON.stringify(embedding) },
            "ai.usage.tokens": usage.tokens
          }
        })
      );
      return new DefaultEmbedResult({ value, embedding, usage, rawResponse });
    }
  });
}
var DefaultEmbedResult = class {
  constructor(options) {
    this.value = options.value;
    this.embedding = options.embedding;
    this.usage = options.usage;
    this.rawResponse = options.rawResponse;
  }
};

// core/util/split-array.ts
function splitArray(array, chunkSize) {
  if (chunkSize <= 0) {
    throw new Error("chunkSize must be greater than 0");
  }
  const result = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
}

// core/embed/embed-many.ts
async function embedMany({
  model,
  values,
  maxRetries: maxRetriesArg,
  abortSignal,
  headers,
  experimental_telemetry: telemetry
}) {
  const { maxRetries, retry } = prepareRetries({ maxRetries: maxRetriesArg });
  const baseTelemetryAttributes = getBaseTelemetryAttributes({
    model,
    telemetry,
    headers,
    settings: { maxRetries }
  });
  const tracer = getTracer(telemetry);
  return recordSpan({
    name: "ai.embedMany",
    attributes: selectTelemetryAttributes({
      telemetry,
      attributes: {
        ...assembleOperationName({ operationId: "ai.embedMany", telemetry }),
        ...baseTelemetryAttributes,
        // specific settings that only make sense on the outer level:
        "ai.values": {
          input: () => values.map((value) => JSON.stringify(value))
        }
      }
    }),
    tracer,
    fn: async (span) => {
      const maxEmbeddingsPerCall = model.maxEmbeddingsPerCall;
      if (maxEmbeddingsPerCall == null) {
        const { embeddings: embeddings2, usage } = await retry(() => {
          return recordSpan({
            name: "ai.embedMany.doEmbed",
            attributes: selectTelemetryAttributes({
              telemetry,
              attributes: {
                ...assembleOperationName({
                  operationId: "ai.embedMany.doEmbed",
                  telemetry
                }),
                ...baseTelemetryAttributes,
                // specific settings that only make sense on the outer level:
                "ai.values": {
                  input: () => values.map((value) => JSON.stringify(value))
                }
              }
            }),
            tracer,
            fn: async (doEmbedSpan) => {
              var _a17;
              const modelResponse = await model.doEmbed({
                values,
                abortSignal,
                headers
              });
              const embeddings3 = modelResponse.embeddings;
              const usage2 = (_a17 = modelResponse.usage) != null ? _a17 : { tokens: NaN };
              doEmbedSpan.setAttributes(
                selectTelemetryAttributes({
                  telemetry,
                  attributes: {
                    "ai.embeddings": {
                      output: () => embeddings3.map((embedding) => JSON.stringify(embedding))
                    },
                    "ai.usage.tokens": usage2.tokens
                  }
                })
              );
              return { embeddings: embeddings3, usage: usage2 };
            }
          });
        });
        span.setAttributes(
          selectTelemetryAttributes({
            telemetry,
            attributes: {
              "ai.embeddings": {
                output: () => embeddings2.map((embedding) => JSON.stringify(embedding))
              },
              "ai.usage.tokens": usage.tokens
            }
          })
        );
        return new DefaultEmbedManyResult({ values, embeddings: embeddings2, usage });
      }
      const valueChunks = splitArray(values, maxEmbeddingsPerCall);
      const embeddings = [];
      let tokens = 0;
      for (const chunk of valueChunks) {
        const { embeddings: responseEmbeddings, usage } = await retry(() => {
          return recordSpan({
            name: "ai.embedMany.doEmbed",
            attributes: selectTelemetryAttributes({
              telemetry,
              attributes: {
                ...assembleOperationName({
                  operationId: "ai.embedMany.doEmbed",
                  telemetry
                }),
                ...baseTelemetryAttributes,
                // specific settings that only make sense on the outer level:
                "ai.values": {
                  input: () => chunk.map((value) => JSON.stringify(value))
                }
              }
            }),
            tracer,
            fn: async (doEmbedSpan) => {
              var _a17;
              const modelResponse = await model.doEmbed({
                values: chunk,
                abortSignal,
                headers
              });
              const embeddings2 = modelResponse.embeddings;
              const usage2 = (_a17 = modelResponse.usage) != null ? _a17 : { tokens: NaN };
              doEmbedSpan.setAttributes(
                selectTelemetryAttributes({
                  telemetry,
                  attributes: {
                    "ai.embeddings": {
                      output: () => embeddings2.map((embedding) => JSON.stringify(embedding))
                    },
                    "ai.usage.tokens": usage2.tokens
                  }
                })
              );
              return { embeddings: embeddings2, usage: usage2 };
            }
          });
        });
        embeddings.push(...responseEmbeddings);
        tokens += usage.tokens;
      }
      span.setAttributes(
        selectTelemetryAttributes({
          telemetry,
          attributes: {
            "ai.embeddings": {
              output: () => embeddings.map((embedding) => JSON.stringify(embedding))
            },
            "ai.usage.tokens": tokens
          }
        })
      );
      return new DefaultEmbedManyResult({
        values,
        embeddings,
        usage: { tokens }
      });
    }
  });
}
var DefaultEmbedManyResult = class {
  constructor(options) {
    this.values = options.values;
    this.embeddings = options.embeddings;
    this.usage = options.usage;
  }
};

// errors/no-image-generated-error.ts

var name3 = "AI_NoImageGeneratedError";
var marker3 = `vercel.ai.error.${name3}`;
var symbol3 = Symbol.for(marker3);
var _a3;
var NoImageGeneratedError = class extends _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError {
  constructor({
    message = "No image generated.",
    cause,
    responses
  }) {
    super({ name: name3, message, cause });
    this[_a3] = true;
    this.responses = responses;
  }
  static isInstance(error) {
    return _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError.hasMarker(error, marker3);
  }
};
_a3 = symbol3;

// core/generate-text/generated-file.ts

var DefaultGeneratedFile = class {
  constructor({
    data,
    mimeType
  }) {
    const isUint8Array = data instanceof Uint8Array;
    this.base64Data = isUint8Array ? void 0 : data;
    this.uint8ArrayData = isUint8Array ? data : void 0;
    this.mimeType = mimeType;
  }
  // lazy conversion with caching to avoid unnecessary conversion overhead:
  get base64() {
    if (this.base64Data == null) {
      this.base64Data = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.convertUint8ArrayToBase64)(this.uint8ArrayData);
    }
    return this.base64Data;
  }
  // lazy conversion with caching to avoid unnecessary conversion overhead:
  get uint8Array() {
    if (this.uint8ArrayData == null) {
      this.uint8ArrayData = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.convertBase64ToUint8Array)(this.base64Data);
    }
    return this.uint8ArrayData;
  }
};
var DefaultGeneratedFileWithType = class extends DefaultGeneratedFile {
  constructor(options) {
    super(options);
    this.type = "file";
  }
};

// core/util/detect-mimetype.ts

var imageMimeTypeSignatures = [
  {
    mimeType: "image/gif",
    bytesPrefix: [71, 73, 70],
    base64Prefix: "R0lG"
  },
  {
    mimeType: "image/png",
    bytesPrefix: [137, 80, 78, 71],
    base64Prefix: "iVBORw"
  },
  {
    mimeType: "image/jpeg",
    bytesPrefix: [255, 216],
    base64Prefix: "/9j/"
  },
  {
    mimeType: "image/webp",
    bytesPrefix: [82, 73, 70, 70],
    base64Prefix: "UklGRg"
  },
  {
    mimeType: "image/bmp",
    bytesPrefix: [66, 77],
    base64Prefix: "Qk"
  },
  {
    mimeType: "image/tiff",
    bytesPrefix: [73, 73, 42, 0],
    base64Prefix: "SUkqAA"
  },
  {
    mimeType: "image/tiff",
    bytesPrefix: [77, 77, 0, 42],
    base64Prefix: "TU0AKg"
  },
  {
    mimeType: "image/avif",
    bytesPrefix: [
      0,
      0,
      0,
      32,
      102,
      116,
      121,
      112,
      97,
      118,
      105,
      102
    ],
    base64Prefix: "AAAAIGZ0eXBhdmlm"
  },
  {
    mimeType: "image/heic",
    bytesPrefix: [
      0,
      0,
      0,
      32,
      102,
      116,
      121,
      112,
      104,
      101,
      105,
      99
    ],
    base64Prefix: "AAAAIGZ0eXBoZWlj"
  }
];
var audioMimeTypeSignatures = [
  {
    mimeType: "audio/mpeg",
    bytesPrefix: [255, 251],
    base64Prefix: "//s="
  },
  {
    mimeType: "audio/wav",
    bytesPrefix: [82, 73, 70, 70],
    base64Prefix: "UklGR"
  },
  {
    mimeType: "audio/ogg",
    bytesPrefix: [79, 103, 103, 83],
    base64Prefix: "T2dnUw"
  },
  {
    mimeType: "audio/flac",
    bytesPrefix: [102, 76, 97, 67],
    base64Prefix: "ZkxhQw"
  },
  {
    mimeType: "audio/aac",
    bytesPrefix: [64, 21, 0, 0],
    base64Prefix: "QBUA"
  },
  {
    mimeType: "audio/mp4",
    bytesPrefix: [102, 116, 121, 112],
    base64Prefix: "ZnR5cA"
  }
];
var stripID3 = (data) => {
  const bytes = typeof data === "string" ? (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.convertBase64ToUint8Array)(data) : data;
  const id3Size = (bytes[6] & 127) << 21 | (bytes[7] & 127) << 14 | (bytes[8] & 127) << 7 | bytes[9] & 127;
  return bytes.slice(id3Size + 10);
};
function stripID3TagsIfPresent(data) {
  const hasId3 = typeof data === "string" && data.startsWith("SUQz") || typeof data !== "string" && data.length > 10 && data[0] === 73 && // 'I'
  data[1] === 68 && // 'D'
  data[2] === 51;
  return hasId3 ? stripID3(data) : data;
}
function detectMimeType({
  data,
  signatures
}) {
  const processedData = stripID3TagsIfPresent(data);
  for (const signature of signatures) {
    if (typeof processedData === "string" ? processedData.startsWith(signature.base64Prefix) : processedData.length >= signature.bytesPrefix.length && signature.bytesPrefix.every(
      (byte, index) => processedData[index] === byte
    )) {
      return signature.mimeType;
    }
  }
  return void 0;
}

// core/generate-image/generate-image.ts
async function generateImage({
  model,
  prompt,
  n = 1,
  size,
  aspectRatio,
  seed,
  providerOptions,
  maxRetries: maxRetriesArg,
  abortSignal,
  headers
}) {
  var _a17;
  const { retry } = prepareRetries({ maxRetries: maxRetriesArg });
  const maxImagesPerCall = (_a17 = model.maxImagesPerCall) != null ? _a17 : 1;
  const callCount = Math.ceil(n / maxImagesPerCall);
  const callImageCounts = Array.from({ length: callCount }, (_, i) => {
    if (i < callCount - 1) {
      return maxImagesPerCall;
    }
    const remainder = n % maxImagesPerCall;
    return remainder === 0 ? maxImagesPerCall : remainder;
  });
  const results = await Promise.all(
    callImageCounts.map(
      async (callImageCount) => retry(
        () => model.doGenerate({
          prompt,
          n: callImageCount,
          abortSignal,
          headers,
          size,
          aspectRatio,
          seed,
          providerOptions: providerOptions != null ? providerOptions : {}
        })
      )
    )
  );
  const images = [];
  const warnings = [];
  const responses = [];
  for (const result of results) {
    images.push(
      ...result.images.map(
        (image) => {
          var _a18;
          return new DefaultGeneratedFile({
            data: image,
            mimeType: (_a18 = detectMimeType({
              data: image,
              signatures: imageMimeTypeSignatures
            })) != null ? _a18 : "image/png"
          });
        }
      )
    );
    warnings.push(...result.warnings);
    responses.push(result.response);
  }
  if (!images.length) {
    throw new NoImageGeneratedError({ responses });
  }
  return new DefaultGenerateImageResult({ images, warnings, responses });
}
var DefaultGenerateImageResult = class {
  constructor(options) {
    this.images = options.images;
    this.warnings = options.warnings;
    this.responses = options.responses;
  }
  get image() {
    return this.images[0];
  }
};

// core/generate-object/generate-object.ts



// errors/no-object-generated-error.ts

var name4 = "AI_NoObjectGeneratedError";
var marker4 = `vercel.ai.error.${name4}`;
var symbol4 = Symbol.for(marker4);
var _a4;
var NoObjectGeneratedError = class extends _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError {
  constructor({
    message = "No object generated.",
    cause,
    text: text2,
    response,
    usage,
    finishReason
  }) {
    super({ name: name4, message, cause });
    this[_a4] = true;
    this.text = text2;
    this.response = response;
    this.usage = usage;
    this.finishReason = finishReason;
  }
  static isInstance(error) {
    return _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError.hasMarker(error, marker4);
  }
};
_a4 = symbol4;

// util/download-error.ts

var name5 = "AI_DownloadError";
var marker5 = `vercel.ai.error.${name5}`;
var symbol5 = Symbol.for(marker5);
var _a5;
var DownloadError = class extends _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError {
  constructor({
    url,
    statusCode,
    statusText,
    cause,
    message = cause == null ? `Failed to download ${url}: ${statusCode} ${statusText}` : `Failed to download ${url}: ${cause}`
  }) {
    super({ name: name5, message, cause });
    this[_a5] = true;
    this.url = url;
    this.statusCode = statusCode;
    this.statusText = statusText;
  }
  static isInstance(error) {
    return _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError.hasMarker(error, marker5);
  }
};
_a5 = symbol5;

// util/download.ts
async function download({ url }) {
  var _a17;
  const urlText = url.toString();
  try {
    const response = await fetch(urlText);
    if (!response.ok) {
      throw new DownloadError({
        url: urlText,
        statusCode: response.status,
        statusText: response.statusText
      });
    }
    return {
      data: new Uint8Array(await response.arrayBuffer()),
      mimeType: (_a17 = response.headers.get("content-type")) != null ? _a17 : void 0
    };
  } catch (error) {
    if (DownloadError.isInstance(error)) {
      throw error;
    }
    throw new DownloadError({ url: urlText, cause: error });
  }
}

// core/prompt/data-content.ts


// core/prompt/invalid-data-content-error.ts

var name6 = "AI_InvalidDataContentError";
var marker6 = `vercel.ai.error.${name6}`;
var symbol6 = Symbol.for(marker6);
var _a6;
var InvalidDataContentError = class extends _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError {
  constructor({
    content,
    cause,
    message = `Invalid data content. Expected a base64 string, Uint8Array, ArrayBuffer, or Buffer, but got ${typeof content}.`
  }) {
    super({ name: name6, message, cause });
    this[_a6] = true;
    this.content = content;
  }
  static isInstance(error) {
    return _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError.hasMarker(error, marker6);
  }
};
_a6 = symbol6;

// core/prompt/data-content.ts

var dataContentSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.union([
  zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
  zod__WEBPACK_IMPORTED_MODULE_5__.z.instanceof(Uint8Array),
  zod__WEBPACK_IMPORTED_MODULE_5__.z.instanceof(ArrayBuffer),
  zod__WEBPACK_IMPORTED_MODULE_5__.z.custom(
    // Buffer might not be available in some environments such as CloudFlare:
    (value) => {
      var _a17, _b;
      return (_b = (_a17 = globalThis.Buffer) == null ? void 0 : _a17.isBuffer(value)) != null ? _b : false;
    },
    { message: "Must be a Buffer" }
  )
]);
function convertDataContentToBase64String(content) {
  if (typeof content === "string") {
    return content;
  }
  if (content instanceof ArrayBuffer) {
    return (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.convertUint8ArrayToBase64)(new Uint8Array(content));
  }
  return (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.convertUint8ArrayToBase64)(content);
}
function convertDataContentToUint8Array(content) {
  if (content instanceof Uint8Array) {
    return content;
  }
  if (typeof content === "string") {
    try {
      return (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.convertBase64ToUint8Array)(content);
    } catch (error) {
      throw new InvalidDataContentError({
        message: "Invalid data content. Content string is not a base64-encoded media.",
        content,
        cause: error
      });
    }
  }
  if (content instanceof ArrayBuffer) {
    return new Uint8Array(content);
  }
  throw new InvalidDataContentError({ content });
}
function convertUint8ArrayToText(uint8Array) {
  try {
    return new TextDecoder().decode(uint8Array);
  } catch (error) {
    throw new Error("Error decoding Uint8Array to text");
  }
}

// core/prompt/invalid-message-role-error.ts

var name7 = "AI_InvalidMessageRoleError";
var marker7 = `vercel.ai.error.${name7}`;
var symbol7 = Symbol.for(marker7);
var _a7;
var InvalidMessageRoleError = class extends _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError {
  constructor({
    role,
    message = `Invalid message role: '${role}'. Must be one of: "system", "user", "assistant", "tool".`
  }) {
    super({ name: name7, message });
    this[_a7] = true;
    this.role = role;
  }
  static isInstance(error) {
    return _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError.hasMarker(error, marker7);
  }
};
_a7 = symbol7;

// core/prompt/split-data-url.ts
function splitDataUrl(dataUrl) {
  try {
    const [header, base64Content] = dataUrl.split(",");
    return {
      mimeType: header.split(";")[0].split(":")[1],
      base64Content
    };
  } catch (error) {
    return {
      mimeType: void 0,
      base64Content: void 0
    };
  }
}

// core/prompt/convert-to-language-model-prompt.ts
async function convertToLanguageModelPrompt({
  prompt,
  modelSupportsImageUrls = true,
  modelSupportsUrl = () => false,
  downloadImplementation = download
}) {
  const downloadedAssets = await downloadAssets(
    prompt.messages,
    downloadImplementation,
    modelSupportsImageUrls,
    modelSupportsUrl
  );
  return [
    ...prompt.system != null ? [{ role: "system", content: prompt.system }] : [],
    ...prompt.messages.map(
      (message) => convertToLanguageModelMessage(message, downloadedAssets)
    )
  ];
}
function convertToLanguageModelMessage(message, downloadedAssets) {
  var _a17, _b, _c, _d, _e, _f;
  const role = message.role;
  switch (role) {
    case "system": {
      return {
        role: "system",
        content: message.content,
        providerMetadata: (_a17 = message.providerOptions) != null ? _a17 : message.experimental_providerMetadata
      };
    }
    case "user": {
      if (typeof message.content === "string") {
        return {
          role: "user",
          content: [{ type: "text", text: message.content }],
          providerMetadata: (_b = message.providerOptions) != null ? _b : message.experimental_providerMetadata
        };
      }
      return {
        role: "user",
        content: message.content.map((part) => convertPartToLanguageModelPart(part, downloadedAssets)).filter((part) => part.type !== "text" || part.text !== ""),
        providerMetadata: (_c = message.providerOptions) != null ? _c : message.experimental_providerMetadata
      };
    }
    case "assistant": {
      if (typeof message.content === "string") {
        return {
          role: "assistant",
          content: [{ type: "text", text: message.content }],
          providerMetadata: (_d = message.providerOptions) != null ? _d : message.experimental_providerMetadata
        };
      }
      return {
        role: "assistant",
        content: message.content.filter(
          // remove empty text parts:
          (part) => part.type !== "text" || part.text !== ""
        ).map((part) => {
          var _a18;
          const providerOptions = (_a18 = part.providerOptions) != null ? _a18 : part.experimental_providerMetadata;
          switch (part.type) {
            case "file": {
              return {
                type: "file",
                data: part.data instanceof URL ? part.data : convertDataContentToBase64String(part.data),
                filename: part.filename,
                mimeType: part.mimeType,
                providerMetadata: providerOptions
              };
            }
            case "reasoning": {
              return {
                type: "reasoning",
                text: part.text,
                signature: part.signature,
                providerMetadata: providerOptions
              };
            }
            case "redacted-reasoning": {
              return {
                type: "redacted-reasoning",
                data: part.data,
                providerMetadata: providerOptions
              };
            }
            case "text": {
              return {
                type: "text",
                text: part.text,
                providerMetadata: providerOptions
              };
            }
            case "tool-call": {
              return {
                type: "tool-call",
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                args: part.args,
                providerMetadata: providerOptions
              };
            }
          }
        }),
        providerMetadata: (_e = message.providerOptions) != null ? _e : message.experimental_providerMetadata
      };
    }
    case "tool": {
      return {
        role: "tool",
        content: message.content.map((part) => {
          var _a18;
          return {
            type: "tool-result",
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            result: part.result,
            content: part.experimental_content,
            isError: part.isError,
            providerMetadata: (_a18 = part.providerOptions) != null ? _a18 : part.experimental_providerMetadata
          };
        }),
        providerMetadata: (_f = message.providerOptions) != null ? _f : message.experimental_providerMetadata
      };
    }
    default: {
      const _exhaustiveCheck = role;
      throw new InvalidMessageRoleError({ role: _exhaustiveCheck });
    }
  }
}
async function downloadAssets(messages, downloadImplementation, modelSupportsImageUrls, modelSupportsUrl) {
  const urls = messages.filter((message) => message.role === "user").map((message) => message.content).filter(
    (content) => Array.isArray(content)
  ).flat().filter(
    (part) => part.type === "image" || part.type === "file"
  ).filter(
    (part) => !(part.type === "image" && modelSupportsImageUrls === true)
  ).map((part) => part.type === "image" ? part.image : part.data).map(
    (part) => (
      // support string urls:
      typeof part === "string" && (part.startsWith("http:") || part.startsWith("https:")) ? new URL(part) : part
    )
  ).filter((image) => image instanceof URL).filter((url) => !modelSupportsUrl(url));
  const downloadedImages = await Promise.all(
    urls.map(async (url) => ({
      url,
      data: await downloadImplementation({ url })
    }))
  );
  return Object.fromEntries(
    downloadedImages.map(({ url, data }) => [url.toString(), data])
  );
}
function convertPartToLanguageModelPart(part, downloadedAssets) {
  var _a17, _b, _c, _d;
  if (part.type === "text") {
    return {
      type: "text",
      text: part.text,
      providerMetadata: (_a17 = part.providerOptions) != null ? _a17 : part.experimental_providerMetadata
    };
  }
  let mimeType = part.mimeType;
  let data;
  let content;
  let normalizedData;
  const type = part.type;
  switch (type) {
    case "image":
      data = part.image;
      break;
    case "file":
      data = part.data;
      break;
    default:
      throw new Error(`Unsupported part type: ${type}`);
  }
  try {
    content = typeof data === "string" ? new URL(data) : data;
  } catch (error) {
    content = data;
  }
  if (content instanceof URL) {
    if (content.protocol === "data:") {
      const { mimeType: dataUrlMimeType, base64Content } = splitDataUrl(
        content.toString()
      );
      if (dataUrlMimeType == null || base64Content == null) {
        throw new Error(`Invalid data URL format in part ${type}`);
      }
      mimeType = dataUrlMimeType;
      normalizedData = convertDataContentToUint8Array(base64Content);
    } else {
      const downloadedFile = downloadedAssets[content.toString()];
      if (downloadedFile) {
        normalizedData = downloadedFile.data;
        mimeType != null ? mimeType : mimeType = downloadedFile.mimeType;
      } else {
        normalizedData = content;
      }
    }
  } else {
    normalizedData = convertDataContentToUint8Array(content);
  }
  switch (type) {
    case "image": {
      if (normalizedData instanceof Uint8Array) {
        mimeType = (_b = detectMimeType({
          data: normalizedData,
          signatures: imageMimeTypeSignatures
        })) != null ? _b : mimeType;
      }
      return {
        type: "image",
        image: normalizedData,
        mimeType,
        providerMetadata: (_c = part.providerOptions) != null ? _c : part.experimental_providerMetadata
      };
    }
    case "file": {
      if (mimeType == null) {
        throw new Error(`Mime type is missing for file part`);
      }
      return {
        type: "file",
        data: normalizedData instanceof Uint8Array ? convertDataContentToBase64String(normalizedData) : normalizedData,
        filename: part.filename,
        mimeType,
        providerMetadata: (_d = part.providerOptions) != null ? _d : part.experimental_providerMetadata
      };
    }
  }
}

// core/prompt/prepare-call-settings.ts
function prepareCallSettings({
  maxTokens,
  temperature,
  topP,
  topK,
  presencePenalty,
  frequencyPenalty,
  stopSequences,
  seed
}) {
  if (maxTokens != null) {
    if (!Number.isInteger(maxTokens)) {
      throw new InvalidArgumentError({
        parameter: "maxTokens",
        value: maxTokens,
        message: "maxTokens must be an integer"
      });
    }
    if (maxTokens < 1) {
      throw new InvalidArgumentError({
        parameter: "maxTokens",
        value: maxTokens,
        message: "maxTokens must be >= 1"
      });
    }
  }
  if (temperature != null) {
    if (typeof temperature !== "number") {
      throw new InvalidArgumentError({
        parameter: "temperature",
        value: temperature,
        message: "temperature must be a number"
      });
    }
  }
  if (topP != null) {
    if (typeof topP !== "number") {
      throw new InvalidArgumentError({
        parameter: "topP",
        value: topP,
        message: "topP must be a number"
      });
    }
  }
  if (topK != null) {
    if (typeof topK !== "number") {
      throw new InvalidArgumentError({
        parameter: "topK",
        value: topK,
        message: "topK must be a number"
      });
    }
  }
  if (presencePenalty != null) {
    if (typeof presencePenalty !== "number") {
      throw new InvalidArgumentError({
        parameter: "presencePenalty",
        value: presencePenalty,
        message: "presencePenalty must be a number"
      });
    }
  }
  if (frequencyPenalty != null) {
    if (typeof frequencyPenalty !== "number") {
      throw new InvalidArgumentError({
        parameter: "frequencyPenalty",
        value: frequencyPenalty,
        message: "frequencyPenalty must be a number"
      });
    }
  }
  if (seed != null) {
    if (!Number.isInteger(seed)) {
      throw new InvalidArgumentError({
        parameter: "seed",
        value: seed,
        message: "seed must be an integer"
      });
    }
  }
  return {
    maxTokens,
    // TODO v5 remove default 0 for temperature
    temperature: temperature != null ? temperature : 0,
    topP,
    topK,
    presencePenalty,
    frequencyPenalty,
    stopSequences: stopSequences != null && stopSequences.length > 0 ? stopSequences : void 0,
    seed
  };
}

// core/prompt/standardize-prompt.ts




// core/prompt/attachments-to-parts.ts
function attachmentsToParts(attachments) {
  var _a17, _b, _c;
  const parts = [];
  for (const attachment of attachments) {
    let url;
    try {
      url = new URL(attachment.url);
    } catch (error) {
      throw new Error(`Invalid URL: ${attachment.url}`);
    }
    switch (url.protocol) {
      case "http:":
      case "https:": {
        if ((_a17 = attachment.contentType) == null ? void 0 : _a17.startsWith("image/")) {
          parts.push({ type: "image", image: url });
        } else {
          if (!attachment.contentType) {
            throw new Error(
              "If the attachment is not an image, it must specify a content type"
            );
          }
          parts.push({
            type: "file",
            data: url,
            mimeType: attachment.contentType
          });
        }
        break;
      }
      case "data:": {
        let header;
        let base64Content;
        let mimeType;
        try {
          [header, base64Content] = attachment.url.split(",");
          mimeType = header.split(";")[0].split(":")[1];
        } catch (error) {
          throw new Error(`Error processing data URL: ${attachment.url}`);
        }
        if (mimeType == null || base64Content == null) {
          throw new Error(`Invalid data URL format: ${attachment.url}`);
        }
        if ((_b = attachment.contentType) == null ? void 0 : _b.startsWith("image/")) {
          parts.push({
            type: "image",
            image: convertDataContentToUint8Array(base64Content)
          });
        } else if ((_c = attachment.contentType) == null ? void 0 : _c.startsWith("text/")) {
          parts.push({
            type: "text",
            text: convertUint8ArrayToText(
              convertDataContentToUint8Array(base64Content)
            )
          });
        } else {
          if (!attachment.contentType) {
            throw new Error(
              "If the attachment is not an image or text, it must specify a content type"
            );
          }
          parts.push({
            type: "file",
            data: base64Content,
            mimeType: attachment.contentType
          });
        }
        break;
      }
      default: {
        throw new Error(`Unsupported URL protocol: ${url.protocol}`);
      }
    }
  }
  return parts;
}

// core/prompt/message-conversion-error.ts

var name8 = "AI_MessageConversionError";
var marker8 = `vercel.ai.error.${name8}`;
var symbol8 = Symbol.for(marker8);
var _a8;
var MessageConversionError = class extends _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError {
  constructor({
    originalMessage,
    message
  }) {
    super({ name: name8, message });
    this[_a8] = true;
    this.originalMessage = originalMessage;
  }
  static isInstance(error) {
    return _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError.hasMarker(error, marker8);
  }
};
_a8 = symbol8;

// core/prompt/convert-to-core-messages.ts
function convertToCoreMessages(messages, options) {
  var _a17, _b;
  const tools = (_a17 = options == null ? void 0 : options.tools) != null ? _a17 : {};
  const coreMessages = [];
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const isLastMessage = i === messages.length - 1;
    const { role, content, experimental_attachments } = message;
    switch (role) {
      case "system": {
        coreMessages.push({
          role: "system",
          content
        });
        break;
      }
      case "user": {
        if (message.parts == null) {
          coreMessages.push({
            role: "user",
            content: experimental_attachments ? [
              { type: "text", text: content },
              ...attachmentsToParts(experimental_attachments)
            ] : content
          });
        } else {
          const textParts = message.parts.filter((part) => part.type === "text").map((part) => ({
            type: "text",
            text: part.text
          }));
          coreMessages.push({
            role: "user",
            content: experimental_attachments ? [...textParts, ...attachmentsToParts(experimental_attachments)] : textParts
          });
        }
        break;
      }
      case "assistant": {
        if (message.parts != null) {
          let processBlock2 = function() {
            const content2 = [];
            for (const part of block) {
              switch (part.type) {
                case "file":
                case "text": {
                  content2.push(part);
                  break;
                }
                case "reasoning": {
                  for (const detail of part.details) {
                    switch (detail.type) {
                      case "text":
                        content2.push({
                          type: "reasoning",
                          text: detail.text,
                          signature: detail.signature
                        });
                        break;
                      case "redacted":
                        content2.push({
                          type: "redacted-reasoning",
                          data: detail.data
                        });
                        break;
                    }
                  }
                  break;
                }
                case "tool-invocation":
                  content2.push({
                    type: "tool-call",
                    toolCallId: part.toolInvocation.toolCallId,
                    toolName: part.toolInvocation.toolName,
                    args: part.toolInvocation.args
                  });
                  break;
                default: {
                  const _exhaustiveCheck = part;
                  throw new Error(`Unsupported part: ${_exhaustiveCheck}`);
                }
              }
            }
            coreMessages.push({
              role: "assistant",
              content: content2
            });
            const stepInvocations = block.filter(
              (part) => part.type === "tool-invocation"
            ).map((part) => part.toolInvocation);
            if (stepInvocations.length > 0) {
              coreMessages.push({
                role: "tool",
                content: stepInvocations.map(
                  (toolInvocation) => {
                    if (!("result" in toolInvocation)) {
                      throw new MessageConversionError({
                        originalMessage: message,
                        message: "ToolInvocation must have a result: " + JSON.stringify(toolInvocation)
                      });
                    }
                    const { toolCallId, toolName, result } = toolInvocation;
                    const tool2 = tools[toolName];
                    return (tool2 == null ? void 0 : tool2.experimental_toToolResultContent) != null ? {
                      type: "tool-result",
                      toolCallId,
                      toolName,
                      result: tool2.experimental_toToolResultContent(result),
                      experimental_content: tool2.experimental_toToolResultContent(result)
                    } : {
                      type: "tool-result",
                      toolCallId,
                      toolName,
                      result
                    };
                  }
                )
              });
            }
            block = [];
            blockHasToolInvocations = false;
            currentStep++;
          };
          var processBlock = processBlock2;
          let currentStep = 0;
          let blockHasToolInvocations = false;
          let block = [];
          for (const part of message.parts) {
            switch (part.type) {
              case "text": {
                if (blockHasToolInvocations) {
                  processBlock2();
                }
                block.push(part);
                break;
              }
              case "file":
              case "reasoning": {
                block.push(part);
                break;
              }
              case "tool-invocation": {
                if (((_b = part.toolInvocation.step) != null ? _b : 0) !== currentStep) {
                  processBlock2();
                }
                block.push(part);
                blockHasToolInvocations = true;
                break;
              }
            }
          }
          processBlock2();
          break;
        }
        const toolInvocations = message.toolInvocations;
        if (toolInvocations == null || toolInvocations.length === 0) {
          coreMessages.push({ role: "assistant", content });
          break;
        }
        const maxStep = toolInvocations.reduce((max, toolInvocation) => {
          var _a18;
          return Math.max(max, (_a18 = toolInvocation.step) != null ? _a18 : 0);
        }, 0);
        for (let i2 = 0; i2 <= maxStep; i2++) {
          const stepInvocations = toolInvocations.filter(
            (toolInvocation) => {
              var _a18;
              return ((_a18 = toolInvocation.step) != null ? _a18 : 0) === i2;
            }
          );
          if (stepInvocations.length === 0) {
            continue;
          }
          coreMessages.push({
            role: "assistant",
            content: [
              ...isLastMessage && content && i2 === 0 ? [{ type: "text", text: content }] : [],
              ...stepInvocations.map(
                ({ toolCallId, toolName, args }) => ({
                  type: "tool-call",
                  toolCallId,
                  toolName,
                  args
                })
              )
            ]
          });
          coreMessages.push({
            role: "tool",
            content: stepInvocations.map((toolInvocation) => {
              if (!("result" in toolInvocation)) {
                throw new MessageConversionError({
                  originalMessage: message,
                  message: "ToolInvocation must have a result: " + JSON.stringify(toolInvocation)
                });
              }
              const { toolCallId, toolName, result } = toolInvocation;
              const tool2 = tools[toolName];
              return (tool2 == null ? void 0 : tool2.experimental_toToolResultContent) != null ? {
                type: "tool-result",
                toolCallId,
                toolName,
                result: tool2.experimental_toToolResultContent(result),
                experimental_content: tool2.experimental_toToolResultContent(result)
              } : {
                type: "tool-result",
                toolCallId,
                toolName,
                result
              };
            })
          });
        }
        if (content && !isLastMessage) {
          coreMessages.push({ role: "assistant", content });
        }
        break;
      }
      case "data": {
        break;
      }
      default: {
        const _exhaustiveCheck = role;
        throw new MessageConversionError({
          originalMessage: message,
          message: `Unsupported role: ${_exhaustiveCheck}`
        });
      }
    }
  }
  return coreMessages;
}

// core/prompt/detect-prompt-type.ts
function detectPromptType(prompt) {
  if (!Array.isArray(prompt)) {
    return "other";
  }
  if (prompt.length === 0) {
    return "messages";
  }
  const characteristics = prompt.map(detectSingleMessageCharacteristics);
  if (characteristics.some((c) => c === "has-ui-specific-parts")) {
    return "ui-messages";
  } else if (characteristics.every(
    (c) => c === "has-core-specific-parts" || c === "message"
  )) {
    return "messages";
  } else {
    return "other";
  }
}
function detectSingleMessageCharacteristics(message) {
  if (typeof message === "object" && message !== null && (message.role === "function" || // UI-only role
  message.role === "data" || // UI-only role
  "toolInvocations" in message || // UI-specific field
  "parts" in message || // UI-specific field
  "experimental_attachments" in message)) {
    return "has-ui-specific-parts";
  } else if (typeof message === "object" && message !== null && "content" in message && (Array.isArray(message.content) || // Core messages can have array content
  "experimental_providerMetadata" in message || "providerOptions" in message)) {
    return "has-core-specific-parts";
  } else if (typeof message === "object" && message !== null && "role" in message && "content" in message && typeof message.content === "string" && ["system", "user", "assistant", "tool"].includes(message.role)) {
    return "message";
  } else {
    return "other";
  }
}

// core/prompt/message.ts


// core/types/provider-metadata.ts


// core/types/json-value.ts

var jsonValueSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.lazy(
  () => zod__WEBPACK_IMPORTED_MODULE_5__.z.union([
    zod__WEBPACK_IMPORTED_MODULE_5__.z.null(),
    zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
    zod__WEBPACK_IMPORTED_MODULE_5__.z.number(),
    zod__WEBPACK_IMPORTED_MODULE_5__.z.boolean(),
    zod__WEBPACK_IMPORTED_MODULE_5__.z.record(zod__WEBPACK_IMPORTED_MODULE_5__.z.string(), jsonValueSchema),
    zod__WEBPACK_IMPORTED_MODULE_5__.z.array(jsonValueSchema)
  ])
);

// core/types/provider-metadata.ts
var providerMetadataSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.record(
  zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
  zod__WEBPACK_IMPORTED_MODULE_5__.z.record(zod__WEBPACK_IMPORTED_MODULE_5__.z.string(), jsonValueSchema)
);

// core/prompt/content-part.ts


// core/prompt/tool-result-content.ts

var toolResultContentSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.array(
  zod__WEBPACK_IMPORTED_MODULE_5__.z.union([
    zod__WEBPACK_IMPORTED_MODULE_5__.z.object({ type: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal("text"), text: zod__WEBPACK_IMPORTED_MODULE_5__.z.string() }),
    zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
      type: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal("image"),
      data: zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
      mimeType: zod__WEBPACK_IMPORTED_MODULE_5__.z.string().optional()
    })
  ])
);

// core/prompt/content-part.ts
var textPartSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  type: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal("text"),
  text: zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var imagePartSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  type: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal("image"),
  image: zod__WEBPACK_IMPORTED_MODULE_5__.z.union([dataContentSchema, zod__WEBPACK_IMPORTED_MODULE_5__.z.instanceof(URL)]),
  mimeType: zod__WEBPACK_IMPORTED_MODULE_5__.z.string().optional(),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var filePartSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  type: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal("file"),
  data: zod__WEBPACK_IMPORTED_MODULE_5__.z.union([dataContentSchema, zod__WEBPACK_IMPORTED_MODULE_5__.z.instanceof(URL)]),
  filename: zod__WEBPACK_IMPORTED_MODULE_5__.z.string().optional(),
  mimeType: zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var reasoningPartSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  type: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal("reasoning"),
  text: zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var redactedReasoningPartSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  type: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal("redacted-reasoning"),
  data: zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var toolCallPartSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  type: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal("tool-call"),
  toolCallId: zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
  toolName: zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
  args: zod__WEBPACK_IMPORTED_MODULE_5__.z.unknown(),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var toolResultPartSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  type: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal("tool-result"),
  toolCallId: zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
  toolName: zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
  result: zod__WEBPACK_IMPORTED_MODULE_5__.z.unknown(),
  content: toolResultContentSchema.optional(),
  isError: zod__WEBPACK_IMPORTED_MODULE_5__.z.boolean().optional(),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});

// core/prompt/message.ts
var coreSystemMessageSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  role: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal("system"),
  content: zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var coreUserMessageSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  role: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal("user"),
  content: zod__WEBPACK_IMPORTED_MODULE_5__.z.union([
    zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
    zod__WEBPACK_IMPORTED_MODULE_5__.z.array(zod__WEBPACK_IMPORTED_MODULE_5__.z.union([textPartSchema, imagePartSchema, filePartSchema]))
  ]),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var coreAssistantMessageSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  role: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal("assistant"),
  content: zod__WEBPACK_IMPORTED_MODULE_5__.z.union([
    zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
    zod__WEBPACK_IMPORTED_MODULE_5__.z.array(
      zod__WEBPACK_IMPORTED_MODULE_5__.z.union([
        textPartSchema,
        filePartSchema,
        reasoningPartSchema,
        redactedReasoningPartSchema,
        toolCallPartSchema
      ])
    )
  ]),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var coreToolMessageSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  role: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal("tool"),
  content: zod__WEBPACK_IMPORTED_MODULE_5__.z.array(toolResultPartSchema),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var coreMessageSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.union([
  coreSystemMessageSchema,
  coreUserMessageSchema,
  coreAssistantMessageSchema,
  coreToolMessageSchema
]);

// core/prompt/standardize-prompt.ts
function standardizePrompt({
  prompt,
  tools
}) {
  if (prompt.prompt == null && prompt.messages == null) {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.InvalidPromptError({
      prompt,
      message: "prompt or messages must be defined"
    });
  }
  if (prompt.prompt != null && prompt.messages != null) {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.InvalidPromptError({
      prompt,
      message: "prompt and messages cannot be defined at the same time"
    });
  }
  if (prompt.system != null && typeof prompt.system !== "string") {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.InvalidPromptError({
      prompt,
      message: "system must be a string"
    });
  }
  if (prompt.prompt != null) {
    if (typeof prompt.prompt !== "string") {
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.InvalidPromptError({
        prompt,
        message: "prompt must be a string"
      });
    }
    return {
      type: "prompt",
      system: prompt.system,
      messages: [
        {
          role: "user",
          content: prompt.prompt
        }
      ]
    };
  }
  if (prompt.messages != null) {
    const promptType = detectPromptType(prompt.messages);
    if (promptType === "other") {
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.InvalidPromptError({
        prompt,
        message: "messages must be an array of CoreMessage or UIMessage"
      });
    }
    const messages = promptType === "ui-messages" ? convertToCoreMessages(prompt.messages, {
      tools
    }) : prompt.messages;
    if (messages.length === 0) {
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.InvalidPromptError({
        prompt,
        message: "messages must not be empty"
      });
    }
    const validationResult = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.safeValidateTypes)({
      value: messages,
      schema: zod__WEBPACK_IMPORTED_MODULE_5__.z.array(coreMessageSchema)
    });
    if (!validationResult.success) {
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.InvalidPromptError({
        prompt,
        message: "messages must be an array of CoreMessage or UIMessage",
        cause: validationResult.error
      });
    }
    return {
      type: "messages",
      messages,
      system: prompt.system
    };
  }
  throw new Error("unreachable");
}

// core/types/usage.ts
function calculateLanguageModelUsage({
  promptTokens,
  completionTokens
}) {
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens
  };
}
function addLanguageModelUsage(usage1, usage2) {
  return {
    promptTokens: usage1.promptTokens + usage2.promptTokens,
    completionTokens: usage1.completionTokens + usage2.completionTokens,
    totalTokens: usage1.totalTokens + usage2.totalTokens
  };
}

// core/generate-object/inject-json-instruction.ts
var DEFAULT_SCHEMA_PREFIX = "JSON schema:";
var DEFAULT_SCHEMA_SUFFIX = "You MUST answer with a JSON object that matches the JSON schema above.";
var DEFAULT_GENERIC_SUFFIX = "You MUST answer with JSON.";
function injectJsonInstruction({
  prompt,
  schema,
  schemaPrefix = schema != null ? DEFAULT_SCHEMA_PREFIX : void 0,
  schemaSuffix = schema != null ? DEFAULT_SCHEMA_SUFFIX : DEFAULT_GENERIC_SUFFIX
}) {
  return [
    prompt != null && prompt.length > 0 ? prompt : void 0,
    prompt != null && prompt.length > 0 ? "" : void 0,
    // add a newline if prompt is not null
    schemaPrefix,
    schema != null ? JSON.stringify(schema) : void 0,
    schemaSuffix
  ].filter((line) => line != null).join("\n");
}

// core/generate-object/output-strategy.ts




// core/util/async-iterable-stream.ts
function createAsyncIterableStream(source) {
  const stream = source.pipeThrough(new TransformStream());
  stream[Symbol.asyncIterator] = () => {
    const reader = stream.getReader();
    return {
      async next() {
        const { done, value } = await reader.read();
        return done ? { done: true, value: void 0 } : { done: false, value };
      }
    };
  };
  return stream;
}

// core/generate-object/output-strategy.ts
var noSchemaOutputStrategy = {
  type: "no-schema",
  jsonSchema: void 0,
  validatePartialResult({ value, textDelta }) {
    return { success: true, value: { partial: value, textDelta } };
  },
  validateFinalResult(value, context) {
    return value === void 0 ? {
      success: false,
      error: new NoObjectGeneratedError({
        message: "No object generated: response did not match schema.",
        text: context.text,
        response: context.response,
        usage: context.usage,
        finishReason: context.finishReason
      })
    } : { success: true, value };
  },
  createElementStream() {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
      functionality: "element streams in no-schema mode"
    });
  }
};
var objectOutputStrategy = (schema) => ({
  type: "object",
  jsonSchema: schema.jsonSchema,
  validatePartialResult({ value, textDelta }) {
    return {
      success: true,
      value: {
        // Note: currently no validation of partial results:
        partial: value,
        textDelta
      }
    };
  },
  validateFinalResult(value) {
    return (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.safeValidateTypes)({ value, schema });
  },
  createElementStream() {
    throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
      functionality: "element streams in object mode"
    });
  }
});
var arrayOutputStrategy = (schema) => {
  const { $schema, ...itemSchema } = schema.jsonSchema;
  return {
    type: "enum",
    // wrap in object that contains array of elements, since most LLMs will not
    // be able to generate an array directly:
    // possible future optimization: use arrays directly when model supports grammar-guided generation
    jsonSchema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        elements: { type: "array", items: itemSchema }
      },
      required: ["elements"],
      additionalProperties: false
    },
    validatePartialResult({ value, latestObject, isFirstDelta, isFinalDelta }) {
      var _a17;
      if (!(0,_ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.isJSONObject)(value) || !(0,_ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.isJSONArray)(value.elements)) {
        return {
          success: false,
          error: new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.TypeValidationError({
            value,
            cause: "value must be an object that contains an array of elements"
          })
        };
      }
      const inputArray = value.elements;
      const resultArray = [];
      for (let i = 0; i < inputArray.length; i++) {
        const element = inputArray[i];
        const result = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.safeValidateTypes)({ value: element, schema });
        if (i === inputArray.length - 1 && !isFinalDelta) {
          continue;
        }
        if (!result.success) {
          return result;
        }
        resultArray.push(result.value);
      }
      const publishedElementCount = (_a17 = latestObject == null ? void 0 : latestObject.length) != null ? _a17 : 0;
      let textDelta = "";
      if (isFirstDelta) {
        textDelta += "[";
      }
      if (publishedElementCount > 0) {
        textDelta += ",";
      }
      textDelta += resultArray.slice(publishedElementCount).map((element) => JSON.stringify(element)).join(",");
      if (isFinalDelta) {
        textDelta += "]";
      }
      return {
        success: true,
        value: {
          partial: resultArray,
          textDelta
        }
      };
    },
    validateFinalResult(value) {
      if (!(0,_ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.isJSONObject)(value) || !(0,_ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.isJSONArray)(value.elements)) {
        return {
          success: false,
          error: new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.TypeValidationError({
            value,
            cause: "value must be an object that contains an array of elements"
          })
        };
      }
      const inputArray = value.elements;
      for (const element of inputArray) {
        const result = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.safeValidateTypes)({ value: element, schema });
        if (!result.success) {
          return result;
        }
      }
      return { success: true, value: inputArray };
    },
    createElementStream(originalStream) {
      let publishedElements = 0;
      return createAsyncIterableStream(
        originalStream.pipeThrough(
          new TransformStream({
            transform(chunk, controller) {
              switch (chunk.type) {
                case "object": {
                  const array = chunk.object;
                  for (; publishedElements < array.length; publishedElements++) {
                    controller.enqueue(array[publishedElements]);
                  }
                  break;
                }
                case "text-delta":
                case "finish":
                case "error":
                  break;
                default: {
                  const _exhaustiveCheck = chunk;
                  throw new Error(
                    `Unsupported chunk type: ${_exhaustiveCheck}`
                  );
                }
              }
            }
          })
        )
      );
    }
  };
};
var enumOutputStrategy = (enumValues) => {
  return {
    type: "enum",
    // wrap in object that contains result, since most LLMs will not
    // be able to generate an enum value directly:
    // possible future optimization: use enums directly when model supports top-level enums
    jsonSchema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        result: { type: "string", enum: enumValues }
      },
      required: ["result"],
      additionalProperties: false
    },
    validateFinalResult(value) {
      if (!(0,_ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.isJSONObject)(value) || typeof value.result !== "string") {
        return {
          success: false,
          error: new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.TypeValidationError({
            value,
            cause: 'value must be an object that contains a string in the "result" property.'
          })
        };
      }
      const result = value.result;
      return enumValues.includes(result) ? { success: true, value: result } : {
        success: false,
        error: new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.TypeValidationError({
          value,
          cause: "value must be a string in the enum"
        })
      };
    },
    validatePartialResult() {
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
        functionality: "partial results in enum mode"
      });
    },
    createElementStream() {
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.UnsupportedFunctionalityError({
        functionality: "element streams in enum mode"
      });
    }
  };
};
function getOutputStrategy({
  output,
  schema,
  enumValues
}) {
  switch (output) {
    case "object":
      return objectOutputStrategy((0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.asSchema)(schema));
    case "array":
      return arrayOutputStrategy((0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.asSchema)(schema));
    case "enum":
      return enumOutputStrategy(enumValues);
    case "no-schema":
      return noSchemaOutputStrategy;
    default: {
      const _exhaustiveCheck = output;
      throw new Error(`Unsupported output: ${_exhaustiveCheck}`);
    }
  }
}

// core/generate-object/validate-object-generation-input.ts
function validateObjectGenerationInput({
  output,
  mode,
  schema,
  schemaName,
  schemaDescription,
  enumValues
}) {
  if (output != null && output !== "object" && output !== "array" && output !== "enum" && output !== "no-schema") {
    throw new InvalidArgumentError({
      parameter: "output",
      value: output,
      message: "Invalid output type."
    });
  }
  if (output === "no-schema") {
    if (mode === "auto" || mode === "tool") {
      throw new InvalidArgumentError({
        parameter: "mode",
        value: mode,
        message: 'Mode must be "json" for no-schema output.'
      });
    }
    if (schema != null) {
      throw new InvalidArgumentError({
        parameter: "schema",
        value: schema,
        message: "Schema is not supported for no-schema output."
      });
    }
    if (schemaDescription != null) {
      throw new InvalidArgumentError({
        parameter: "schemaDescription",
        value: schemaDescription,
        message: "Schema description is not supported for no-schema output."
      });
    }
    if (schemaName != null) {
      throw new InvalidArgumentError({
        parameter: "schemaName",
        value: schemaName,
        message: "Schema name is not supported for no-schema output."
      });
    }
    if (enumValues != null) {
      throw new InvalidArgumentError({
        parameter: "enumValues",
        value: enumValues,
        message: "Enum values are not supported for no-schema output."
      });
    }
  }
  if (output === "object") {
    if (schema == null) {
      throw new InvalidArgumentError({
        parameter: "schema",
        value: schema,
        message: "Schema is required for object output."
      });
    }
    if (enumValues != null) {
      throw new InvalidArgumentError({
        parameter: "enumValues",
        value: enumValues,
        message: "Enum values are not supported for object output."
      });
    }
  }
  if (output === "array") {
    if (schema == null) {
      throw new InvalidArgumentError({
        parameter: "schema",
        value: schema,
        message: "Element schema is required for array output."
      });
    }
    if (enumValues != null) {
      throw new InvalidArgumentError({
        parameter: "enumValues",
        value: enumValues,
        message: "Enum values are not supported for array output."
      });
    }
  }
  if (output === "enum") {
    if (schema != null) {
      throw new InvalidArgumentError({
        parameter: "schema",
        value: schema,
        message: "Schema is not supported for enum output."
      });
    }
    if (schemaDescription != null) {
      throw new InvalidArgumentError({
        parameter: "schemaDescription",
        value: schemaDescription,
        message: "Schema description is not supported for enum output."
      });
    }
    if (schemaName != null) {
      throw new InvalidArgumentError({
        parameter: "schemaName",
        value: schemaName,
        message: "Schema name is not supported for enum output."
      });
    }
    if (enumValues == null) {
      throw new InvalidArgumentError({
        parameter: "enumValues",
        value: enumValues,
        message: "Enum values are required for enum output."
      });
    }
    for (const value of enumValues) {
      if (typeof value !== "string") {
        throw new InvalidArgumentError({
          parameter: "enumValues",
          value,
          message: "Enum values must be strings."
        });
      }
    }
  }
}

// core/generate-object/generate-object.ts
var originalGenerateId = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.createIdGenerator)({ prefix: "aiobj", size: 24 });
async function generateObject({
  model,
  enum: enumValues,
  // rename bc enum is reserved by typescript
  schema: inputSchema,
  schemaName,
  schemaDescription,
  mode,
  output = "object",
  system,
  prompt,
  messages,
  maxRetries: maxRetriesArg,
  abortSignal,
  headers,
  experimental_repairText: repairText,
  experimental_telemetry: telemetry,
  experimental_providerMetadata,
  providerOptions = experimental_providerMetadata,
  _internal: {
    generateId: generateId3 = originalGenerateId,
    currentDate = () => /* @__PURE__ */ new Date()
  } = {},
  ...settings
}) {
  validateObjectGenerationInput({
    output,
    mode,
    schema: inputSchema,
    schemaName,
    schemaDescription,
    enumValues
  });
  const { maxRetries, retry } = prepareRetries({ maxRetries: maxRetriesArg });
  const outputStrategy = getOutputStrategy({
    output,
    schema: inputSchema,
    enumValues
  });
  if (outputStrategy.type === "no-schema" && mode === void 0) {
    mode = "json";
  }
  const baseTelemetryAttributes = getBaseTelemetryAttributes({
    model,
    telemetry,
    headers,
    settings: { ...settings, maxRetries }
  });
  const tracer = getTracer(telemetry);
  return recordSpan({
    name: "ai.generateObject",
    attributes: selectTelemetryAttributes({
      telemetry,
      attributes: {
        ...assembleOperationName({
          operationId: "ai.generateObject",
          telemetry
        }),
        ...baseTelemetryAttributes,
        // specific settings that only make sense on the outer level:
        "ai.prompt": {
          input: () => JSON.stringify({ system, prompt, messages })
        },
        "ai.schema": outputStrategy.jsonSchema != null ? { input: () => JSON.stringify(outputStrategy.jsonSchema) } : void 0,
        "ai.schema.name": schemaName,
        "ai.schema.description": schemaDescription,
        "ai.settings.output": outputStrategy.type,
        "ai.settings.mode": mode
      }
    }),
    tracer,
    fn: async (span) => {
      var _a17, _b, _c, _d;
      if (mode === "auto" || mode == null) {
        mode = model.defaultObjectGenerationMode;
      }
      let result;
      let finishReason;
      let usage;
      let warnings;
      let rawResponse;
      let response;
      let request;
      let logprobs;
      let resultProviderMetadata;
      switch (mode) {
        case "json": {
          const standardizedPrompt = standardizePrompt({
            prompt: {
              system: outputStrategy.jsonSchema == null ? injectJsonInstruction({ prompt: system }) : model.supportsStructuredOutputs ? system : injectJsonInstruction({
                prompt: system,
                schema: outputStrategy.jsonSchema
              }),
              prompt,
              messages
            },
            tools: void 0
          });
          const promptMessages = await convertToLanguageModelPrompt({
            prompt: standardizedPrompt,
            modelSupportsImageUrls: model.supportsImageUrls,
            modelSupportsUrl: (_a17 = model.supportsUrl) == null ? void 0 : _a17.bind(model)
            // support 'this' context
          });
          const generateResult = await retry(
            () => recordSpan({
              name: "ai.generateObject.doGenerate",
              attributes: selectTelemetryAttributes({
                telemetry,
                attributes: {
                  ...assembleOperationName({
                    operationId: "ai.generateObject.doGenerate",
                    telemetry
                  }),
                  ...baseTelemetryAttributes,
                  "ai.prompt.format": {
                    input: () => standardizedPrompt.type
                  },
                  "ai.prompt.messages": {
                    input: () => JSON.stringify(promptMessages)
                  },
                  "ai.settings.mode": mode,
                  // standardized gen-ai llm span attributes:
                  "gen_ai.system": model.provider,
                  "gen_ai.request.model": model.modelId,
                  "gen_ai.request.frequency_penalty": settings.frequencyPenalty,
                  "gen_ai.request.max_tokens": settings.maxTokens,
                  "gen_ai.request.presence_penalty": settings.presencePenalty,
                  "gen_ai.request.temperature": settings.temperature,
                  "gen_ai.request.top_k": settings.topK,
                  "gen_ai.request.top_p": settings.topP
                }
              }),
              tracer,
              fn: async (span2) => {
                var _a18, _b2, _c2, _d2, _e, _f;
                const result2 = await model.doGenerate({
                  mode: {
                    type: "object-json",
                    schema: outputStrategy.jsonSchema,
                    name: schemaName,
                    description: schemaDescription
                  },
                  ...prepareCallSettings(settings),
                  inputFormat: standardizedPrompt.type,
                  prompt: promptMessages,
                  providerMetadata: providerOptions,
                  abortSignal,
                  headers
                });
                const responseData = {
                  id: (_b2 = (_a18 = result2.response) == null ? void 0 : _a18.id) != null ? _b2 : generateId3(),
                  timestamp: (_d2 = (_c2 = result2.response) == null ? void 0 : _c2.timestamp) != null ? _d2 : currentDate(),
                  modelId: (_f = (_e = result2.response) == null ? void 0 : _e.modelId) != null ? _f : model.modelId
                };
                if (result2.text === void 0) {
                  throw new NoObjectGeneratedError({
                    message: "No object generated: the model did not return a response.",
                    response: responseData,
                    usage: calculateLanguageModelUsage(result2.usage),
                    finishReason: result2.finishReason
                  });
                }
                span2.setAttributes(
                  selectTelemetryAttributes({
                    telemetry,
                    attributes: {
                      "ai.response.finishReason": result2.finishReason,
                      "ai.response.object": { output: () => result2.text },
                      "ai.response.id": responseData.id,
                      "ai.response.model": responseData.modelId,
                      "ai.response.timestamp": responseData.timestamp.toISOString(),
                      "ai.usage.promptTokens": result2.usage.promptTokens,
                      "ai.usage.completionTokens": result2.usage.completionTokens,
                      // standardized gen-ai llm span attributes:
                      "gen_ai.response.finish_reasons": [result2.finishReason],
                      "gen_ai.response.id": responseData.id,
                      "gen_ai.response.model": responseData.modelId,
                      "gen_ai.usage.prompt_tokens": result2.usage.promptTokens,
                      "gen_ai.usage.completion_tokens": result2.usage.completionTokens
                    }
                  })
                );
                return { ...result2, objectText: result2.text, responseData };
              }
            })
          );
          result = generateResult.objectText;
          finishReason = generateResult.finishReason;
          usage = generateResult.usage;
          warnings = generateResult.warnings;
          rawResponse = generateResult.rawResponse;
          logprobs = generateResult.logprobs;
          resultProviderMetadata = generateResult.providerMetadata;
          request = (_b = generateResult.request) != null ? _b : {};
          response = generateResult.responseData;
          break;
        }
        case "tool": {
          const standardizedPrompt = standardizePrompt({
            prompt: { system, prompt, messages },
            tools: void 0
          });
          const promptMessages = await convertToLanguageModelPrompt({
            prompt: standardizedPrompt,
            modelSupportsImageUrls: model.supportsImageUrls,
            modelSupportsUrl: (_c = model.supportsUrl) == null ? void 0 : _c.bind(model)
            // support 'this' context,
          });
          const inputFormat = standardizedPrompt.type;
          const generateResult = await retry(
            () => recordSpan({
              name: "ai.generateObject.doGenerate",
              attributes: selectTelemetryAttributes({
                telemetry,
                attributes: {
                  ...assembleOperationName({
                    operationId: "ai.generateObject.doGenerate",
                    telemetry
                  }),
                  ...baseTelemetryAttributes,
                  "ai.prompt.format": {
                    input: () => inputFormat
                  },
                  "ai.prompt.messages": {
                    input: () => JSON.stringify(promptMessages)
                  },
                  "ai.settings.mode": mode,
                  // standardized gen-ai llm span attributes:
                  "gen_ai.system": model.provider,
                  "gen_ai.request.model": model.modelId,
                  "gen_ai.request.frequency_penalty": settings.frequencyPenalty,
                  "gen_ai.request.max_tokens": settings.maxTokens,
                  "gen_ai.request.presence_penalty": settings.presencePenalty,
                  "gen_ai.request.temperature": settings.temperature,
                  "gen_ai.request.top_k": settings.topK,
                  "gen_ai.request.top_p": settings.topP
                }
              }),
              tracer,
              fn: async (span2) => {
                var _a18, _b2, _c2, _d2, _e, _f, _g, _h;
                const result2 = await model.doGenerate({
                  mode: {
                    type: "object-tool",
                    tool: {
                      type: "function",
                      name: schemaName != null ? schemaName : "json",
                      description: schemaDescription != null ? schemaDescription : "Respond with a JSON object.",
                      parameters: outputStrategy.jsonSchema
                    }
                  },
                  ...prepareCallSettings(settings),
                  inputFormat,
                  prompt: promptMessages,
                  providerMetadata: providerOptions,
                  abortSignal,
                  headers
                });
                const objectText = (_b2 = (_a18 = result2.toolCalls) == null ? void 0 : _a18[0]) == null ? void 0 : _b2.args;
                const responseData = {
                  id: (_d2 = (_c2 = result2.response) == null ? void 0 : _c2.id) != null ? _d2 : generateId3(),
                  timestamp: (_f = (_e = result2.response) == null ? void 0 : _e.timestamp) != null ? _f : currentDate(),
                  modelId: (_h = (_g = result2.response) == null ? void 0 : _g.modelId) != null ? _h : model.modelId
                };
                if (objectText === void 0) {
                  throw new NoObjectGeneratedError({
                    message: "No object generated: the tool was not called.",
                    response: responseData,
                    usage: calculateLanguageModelUsage(result2.usage),
                    finishReason: result2.finishReason
                  });
                }
                span2.setAttributes(
                  selectTelemetryAttributes({
                    telemetry,
                    attributes: {
                      "ai.response.finishReason": result2.finishReason,
                      "ai.response.object": { output: () => objectText },
                      "ai.response.id": responseData.id,
                      "ai.response.model": responseData.modelId,
                      "ai.response.timestamp": responseData.timestamp.toISOString(),
                      "ai.usage.promptTokens": result2.usage.promptTokens,
                      "ai.usage.completionTokens": result2.usage.completionTokens,
                      // standardized gen-ai llm span attributes:
                      "gen_ai.response.finish_reasons": [result2.finishReason],
                      "gen_ai.response.id": responseData.id,
                      "gen_ai.response.model": responseData.modelId,
                      "gen_ai.usage.input_tokens": result2.usage.promptTokens,
                      "gen_ai.usage.output_tokens": result2.usage.completionTokens
                    }
                  })
                );
                return { ...result2, objectText, responseData };
              }
            })
          );
          result = generateResult.objectText;
          finishReason = generateResult.finishReason;
          usage = generateResult.usage;
          warnings = generateResult.warnings;
          rawResponse = generateResult.rawResponse;
          logprobs = generateResult.logprobs;
          resultProviderMetadata = generateResult.providerMetadata;
          request = (_d = generateResult.request) != null ? _d : {};
          response = generateResult.responseData;
          break;
        }
        case void 0: {
          throw new Error(
            "Model does not have a default object generation mode."
          );
        }
        default: {
          const _exhaustiveCheck = mode;
          throw new Error(`Unsupported mode: ${_exhaustiveCheck}`);
        }
      }
      function processResult(result2) {
        const parseResult = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.safeParseJSON)({ text: result2 });
        if (!parseResult.success) {
          throw new NoObjectGeneratedError({
            message: "No object generated: could not parse the response.",
            cause: parseResult.error,
            text: result2,
            response,
            usage: calculateLanguageModelUsage(usage),
            finishReason
          });
        }
        const validationResult = outputStrategy.validateFinalResult(
          parseResult.value,
          {
            text: result2,
            response,
            usage: calculateLanguageModelUsage(usage)
          }
        );
        if (!validationResult.success) {
          throw new NoObjectGeneratedError({
            message: "No object generated: response did not match schema.",
            cause: validationResult.error,
            text: result2,
            response,
            usage: calculateLanguageModelUsage(usage),
            finishReason
          });
        }
        return validationResult.value;
      }
      let object2;
      try {
        object2 = processResult(result);
      } catch (error) {
        if (repairText != null && NoObjectGeneratedError.isInstance(error) && (_ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.JSONParseError.isInstance(error.cause) || _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.TypeValidationError.isInstance(error.cause))) {
          const repairedText = await repairText({
            text: result,
            error: error.cause
          });
          if (repairedText === null) {
            throw error;
          }
          object2 = processResult(repairedText);
        } else {
          throw error;
        }
      }
      span.setAttributes(
        selectTelemetryAttributes({
          telemetry,
          attributes: {
            "ai.response.finishReason": finishReason,
            "ai.response.object": {
              output: () => JSON.stringify(object2)
            },
            "ai.usage.promptTokens": usage.promptTokens,
            "ai.usage.completionTokens": usage.completionTokens
          }
        })
      );
      return new DefaultGenerateObjectResult({
        object: object2,
        finishReason,
        usage: calculateLanguageModelUsage(usage),
        warnings,
        request,
        response: {
          ...response,
          headers: rawResponse == null ? void 0 : rawResponse.headers,
          body: rawResponse == null ? void 0 : rawResponse.body
        },
        logprobs,
        providerMetadata: resultProviderMetadata
      });
    }
  });
}
var DefaultGenerateObjectResult = class {
  constructor(options) {
    this.object = options.object;
    this.finishReason = options.finishReason;
    this.usage = options.usage;
    this.warnings = options.warnings;
    this.providerMetadata = options.providerMetadata;
    this.experimental_providerMetadata = options.providerMetadata;
    this.response = options.response;
    this.request = options.request;
    this.logprobs = options.logprobs;
  }
  toJsonResponse(init) {
    var _a17;
    return new Response(JSON.stringify(this.object), {
      status: (_a17 = init == null ? void 0 : init.status) != null ? _a17 : 200,
      headers: prepareResponseHeaders(init == null ? void 0 : init.headers, {
        contentType: "application/json; charset=utf-8"
      })
    });
  }
};

// core/generate-object/stream-object.ts



// util/delayed-promise.ts
var DelayedPromise = class {
  constructor() {
    this.status = { type: "pending" };
    this._resolve = void 0;
    this._reject = void 0;
  }
  get value() {
    if (this.promise) {
      return this.promise;
    }
    this.promise = new Promise((resolve, reject) => {
      if (this.status.type === "resolved") {
        resolve(this.status.value);
      } else if (this.status.type === "rejected") {
        reject(this.status.error);
      }
      this._resolve = resolve;
      this._reject = reject;
    });
    return this.promise;
  }
  resolve(value) {
    var _a17;
    this.status = { type: "resolved", value };
    if (this.promise) {
      (_a17 = this._resolve) == null ? void 0 : _a17.call(this, value);
    }
  }
  reject(error) {
    var _a17;
    this.status = { type: "rejected", error };
    if (this.promise) {
      (_a17 = this._reject) == null ? void 0 : _a17.call(this, error);
    }
  }
};

// util/create-resolvable-promise.ts
function createResolvablePromise() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {
    promise,
    resolve,
    reject
  };
}

// core/util/create-stitchable-stream.ts
function createStitchableStream() {
  let innerStreamReaders = [];
  let controller = null;
  let isClosed = false;
  let waitForNewStream = createResolvablePromise();
  const processPull = async () => {
    if (isClosed && innerStreamReaders.length === 0) {
      controller == null ? void 0 : controller.close();
      return;
    }
    if (innerStreamReaders.length === 0) {
      waitForNewStream = createResolvablePromise();
      await waitForNewStream.promise;
      return processPull();
    }
    try {
      const { value, done } = await innerStreamReaders[0].read();
      if (done) {
        innerStreamReaders.shift();
        if (innerStreamReaders.length > 0) {
          await processPull();
        } else if (isClosed) {
          controller == null ? void 0 : controller.close();
        }
      } else {
        controller == null ? void 0 : controller.enqueue(value);
      }
    } catch (error) {
      controller == null ? void 0 : controller.error(error);
      innerStreamReaders.shift();
      if (isClosed && innerStreamReaders.length === 0) {
        controller == null ? void 0 : controller.close();
      }
    }
  };
  return {
    stream: new ReadableStream({
      start(controllerParam) {
        controller = controllerParam;
      },
      pull: processPull,
      async cancel() {
        for (const reader of innerStreamReaders) {
          await reader.cancel();
        }
        innerStreamReaders = [];
        isClosed = true;
      }
    }),
    addStream: (innerStream) => {
      if (isClosed) {
        throw new Error("Cannot add inner stream: outer stream is closed");
      }
      innerStreamReaders.push(innerStream.getReader());
      waitForNewStream.resolve();
    },
    /**
     * Gracefully close the outer stream. This will let the inner streams
     * finish processing and then close the outer stream.
     */
    close: () => {
      isClosed = true;
      waitForNewStream.resolve();
      if (innerStreamReaders.length === 0) {
        controller == null ? void 0 : controller.close();
      }
    },
    /**
     * Immediately close the outer stream. This will cancel all inner streams
     * and close the outer stream.
     */
    terminate: () => {
      isClosed = true;
      waitForNewStream.resolve();
      innerStreamReaders.forEach((reader) => reader.cancel());
      innerStreamReaders = [];
      controller == null ? void 0 : controller.close();
    }
  };
}

// core/util/now.ts
function now() {
  var _a17, _b;
  return (_b = (_a17 = globalThis == null ? void 0 : globalThis.performance) == null ? void 0 : _a17.now()) != null ? _b : Date.now();
}

// core/generate-object/stream-object.ts
var originalGenerateId2 = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.createIdGenerator)({ prefix: "aiobj", size: 24 });
function streamObject({
  model,
  schema: inputSchema,
  schemaName,
  schemaDescription,
  mode,
  output = "object",
  system,
  prompt,
  messages,
  maxRetries,
  abortSignal,
  headers,
  experimental_telemetry: telemetry,
  experimental_providerMetadata,
  providerOptions = experimental_providerMetadata,
  onError,
  onFinish,
  _internal: {
    generateId: generateId3 = originalGenerateId2,
    currentDate = () => /* @__PURE__ */ new Date(),
    now: now2 = now
  } = {},
  ...settings
}) {
  validateObjectGenerationInput({
    output,
    mode,
    schema: inputSchema,
    schemaName,
    schemaDescription
  });
  const outputStrategy = getOutputStrategy({ output, schema: inputSchema });
  if (outputStrategy.type === "no-schema" && mode === void 0) {
    mode = "json";
  }
  return new DefaultStreamObjectResult({
    model,
    telemetry,
    headers,
    settings,
    maxRetries,
    abortSignal,
    outputStrategy,
    system,
    prompt,
    messages,
    schemaName,
    schemaDescription,
    providerOptions,
    mode,
    onError,
    onFinish,
    generateId: generateId3,
    currentDate,
    now: now2
  });
}
var DefaultStreamObjectResult = class {
  constructor({
    model,
    headers,
    telemetry,
    settings,
    maxRetries: maxRetriesArg,
    abortSignal,
    outputStrategy,
    system,
    prompt,
    messages,
    schemaName,
    schemaDescription,
    providerOptions,
    mode,
    onError,
    onFinish,
    generateId: generateId3,
    currentDate,
    now: now2
  }) {
    this.objectPromise = new DelayedPromise();
    this.usagePromise = new DelayedPromise();
    this.providerMetadataPromise = new DelayedPromise();
    this.warningsPromise = new DelayedPromise();
    this.requestPromise = new DelayedPromise();
    this.responsePromise = new DelayedPromise();
    const { maxRetries, retry } = prepareRetries({
      maxRetries: maxRetriesArg
    });
    const baseTelemetryAttributes = getBaseTelemetryAttributes({
      model,
      telemetry,
      headers,
      settings: { ...settings, maxRetries }
    });
    const tracer = getTracer(telemetry);
    const self = this;
    const stitchableStream = createStitchableStream();
    const eventProcessor = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        if (chunk.type === "error") {
          onError == null ? void 0 : onError({ error: chunk.error });
        }
      }
    });
    this.baseStream = stitchableStream.stream.pipeThrough(eventProcessor);
    recordSpan({
      name: "ai.streamObject",
      attributes: selectTelemetryAttributes({
        telemetry,
        attributes: {
          ...assembleOperationName({
            operationId: "ai.streamObject",
            telemetry
          }),
          ...baseTelemetryAttributes,
          // specific settings that only make sense on the outer level:
          "ai.prompt": {
            input: () => JSON.stringify({ system, prompt, messages })
          },
          "ai.schema": outputStrategy.jsonSchema != null ? { input: () => JSON.stringify(outputStrategy.jsonSchema) } : void 0,
          "ai.schema.name": schemaName,
          "ai.schema.description": schemaDescription,
          "ai.settings.output": outputStrategy.type,
          "ai.settings.mode": mode
        }
      }),
      tracer,
      endWhenDone: false,
      fn: async (rootSpan) => {
        var _a17, _b;
        if (mode === "auto" || mode == null) {
          mode = model.defaultObjectGenerationMode;
        }
        let callOptions;
        let transformer;
        switch (mode) {
          case "json": {
            const standardizedPrompt = standardizePrompt({
              prompt: {
                system: outputStrategy.jsonSchema == null ? injectJsonInstruction({ prompt: system }) : model.supportsStructuredOutputs ? system : injectJsonInstruction({
                  prompt: system,
                  schema: outputStrategy.jsonSchema
                }),
                prompt,
                messages
              },
              tools: void 0
            });
            callOptions = {
              mode: {
                type: "object-json",
                schema: outputStrategy.jsonSchema,
                name: schemaName,
                description: schemaDescription
              },
              ...prepareCallSettings(settings),
              inputFormat: standardizedPrompt.type,
              prompt: await convertToLanguageModelPrompt({
                prompt: standardizedPrompt,
                modelSupportsImageUrls: model.supportsImageUrls,
                modelSupportsUrl: (_a17 = model.supportsUrl) == null ? void 0 : _a17.bind(model)
                // support 'this' context
              }),
              providerMetadata: providerOptions,
              abortSignal,
              headers
            };
            transformer = {
              transform: (chunk, controller) => {
                switch (chunk.type) {
                  case "text-delta":
                    controller.enqueue(chunk.textDelta);
                    break;
                  case "response-metadata":
                  case "finish":
                  case "error":
                    controller.enqueue(chunk);
                    break;
                }
              }
            };
            break;
          }
          case "tool": {
            const standardizedPrompt = standardizePrompt({
              prompt: { system, prompt, messages },
              tools: void 0
            });
            callOptions = {
              mode: {
                type: "object-tool",
                tool: {
                  type: "function",
                  name: schemaName != null ? schemaName : "json",
                  description: schemaDescription != null ? schemaDescription : "Respond with a JSON object.",
                  parameters: outputStrategy.jsonSchema
                }
              },
              ...prepareCallSettings(settings),
              inputFormat: standardizedPrompt.type,
              prompt: await convertToLanguageModelPrompt({
                prompt: standardizedPrompt,
                modelSupportsImageUrls: model.supportsImageUrls,
                modelSupportsUrl: (_b = model.supportsUrl) == null ? void 0 : _b.bind(model)
                // support 'this' context,
              }),
              providerMetadata: providerOptions,
              abortSignal,
              headers
            };
            transformer = {
              transform(chunk, controller) {
                switch (chunk.type) {
                  case "tool-call-delta":
                    controller.enqueue(chunk.argsTextDelta);
                    break;
                  case "response-metadata":
                  case "finish":
                  case "error":
                    controller.enqueue(chunk);
                    break;
                }
              }
            };
            break;
          }
          case void 0: {
            throw new Error(
              "Model does not have a default object generation mode."
            );
          }
          default: {
            const _exhaustiveCheck = mode;
            throw new Error(`Unsupported mode: ${_exhaustiveCheck}`);
          }
        }
        const {
          result: { stream, warnings, rawResponse, request },
          doStreamSpan,
          startTimestampMs
        } = await retry(
          () => recordSpan({
            name: "ai.streamObject.doStream",
            attributes: selectTelemetryAttributes({
              telemetry,
              attributes: {
                ...assembleOperationName({
                  operationId: "ai.streamObject.doStream",
                  telemetry
                }),
                ...baseTelemetryAttributes,
                "ai.prompt.format": {
                  input: () => callOptions.inputFormat
                },
                "ai.prompt.messages": {
                  input: () => JSON.stringify(callOptions.prompt)
                },
                "ai.settings.mode": mode,
                // standardized gen-ai llm span attributes:
                "gen_ai.system": model.provider,
                "gen_ai.request.model": model.modelId,
                "gen_ai.request.frequency_penalty": settings.frequencyPenalty,
                "gen_ai.request.max_tokens": settings.maxTokens,
                "gen_ai.request.presence_penalty": settings.presencePenalty,
                "gen_ai.request.temperature": settings.temperature,
                "gen_ai.request.top_k": settings.topK,
                "gen_ai.request.top_p": settings.topP
              }
            }),
            tracer,
            endWhenDone: false,
            fn: async (doStreamSpan2) => ({
              startTimestampMs: now2(),
              doStreamSpan: doStreamSpan2,
              result: await model.doStream(callOptions)
            })
          })
        );
        self.requestPromise.resolve(request != null ? request : {});
        let usage;
        let finishReason;
        let providerMetadata;
        let object2;
        let error;
        let accumulatedText = "";
        let textDelta = "";
        let response = {
          id: generateId3(),
          timestamp: currentDate(),
          modelId: model.modelId
        };
        let latestObjectJson = void 0;
        let latestObject = void 0;
        let isFirstChunk = true;
        let isFirstDelta = true;
        const transformedStream = stream.pipeThrough(new TransformStream(transformer)).pipeThrough(
          new TransformStream({
            async transform(chunk, controller) {
              var _a18, _b2, _c;
              if (isFirstChunk) {
                const msToFirstChunk = now2() - startTimestampMs;
                isFirstChunk = false;
                doStreamSpan.addEvent("ai.stream.firstChunk", {
                  "ai.stream.msToFirstChunk": msToFirstChunk
                });
                doStreamSpan.setAttributes({
                  "ai.stream.msToFirstChunk": msToFirstChunk
                });
              }
              if (typeof chunk === "string") {
                accumulatedText += chunk;
                textDelta += chunk;
                const { value: currentObjectJson, state: parseState } = (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.parsePartialJson)(accumulatedText);
                if (currentObjectJson !== void 0 && !(0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.isDeepEqualData)(latestObjectJson, currentObjectJson)) {
                  const validationResult = outputStrategy.validatePartialResult({
                    value: currentObjectJson,
                    textDelta,
                    latestObject,
                    isFirstDelta,
                    isFinalDelta: parseState === "successful-parse"
                  });
                  if (validationResult.success && !(0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.isDeepEqualData)(
                    latestObject,
                    validationResult.value.partial
                  )) {
                    latestObjectJson = currentObjectJson;
                    latestObject = validationResult.value.partial;
                    controller.enqueue({
                      type: "object",
                      object: latestObject
                    });
                    controller.enqueue({
                      type: "text-delta",
                      textDelta: validationResult.value.textDelta
                    });
                    textDelta = "";
                    isFirstDelta = false;
                  }
                }
                return;
              }
              switch (chunk.type) {
                case "response-metadata": {
                  response = {
                    id: (_a18 = chunk.id) != null ? _a18 : response.id,
                    timestamp: (_b2 = chunk.timestamp) != null ? _b2 : response.timestamp,
                    modelId: (_c = chunk.modelId) != null ? _c : response.modelId
                  };
                  break;
                }
                case "finish": {
                  if (textDelta !== "") {
                    controller.enqueue({ type: "text-delta", textDelta });
                  }
                  finishReason = chunk.finishReason;
                  usage = calculateLanguageModelUsage(chunk.usage);
                  providerMetadata = chunk.providerMetadata;
                  controller.enqueue({ ...chunk, usage, response });
                  self.usagePromise.resolve(usage);
                  self.providerMetadataPromise.resolve(providerMetadata);
                  self.responsePromise.resolve({
                    ...response,
                    headers: rawResponse == null ? void 0 : rawResponse.headers
                  });
                  const validationResult = outputStrategy.validateFinalResult(
                    latestObjectJson,
                    {
                      text: accumulatedText,
                      response,
                      usage
                    }
                  );
                  if (validationResult.success) {
                    object2 = validationResult.value;
                    self.objectPromise.resolve(object2);
                  } else {
                    error = new NoObjectGeneratedError({
                      message: "No object generated: response did not match schema.",
                      cause: validationResult.error,
                      text: accumulatedText,
                      response,
                      usage,
                      finishReason
                    });
                    self.objectPromise.reject(error);
                  }
                  break;
                }
                default: {
                  controller.enqueue(chunk);
                  break;
                }
              }
            },
            // invoke onFinish callback and resolve toolResults promise when the stream is about to close:
            async flush(controller) {
              try {
                const finalUsage = usage != null ? usage : {
                  promptTokens: NaN,
                  completionTokens: NaN,
                  totalTokens: NaN
                };
                doStreamSpan.setAttributes(
                  selectTelemetryAttributes({
                    telemetry,
                    attributes: {
                      "ai.response.finishReason": finishReason,
                      "ai.response.object": {
                        output: () => JSON.stringify(object2)
                      },
                      "ai.response.id": response.id,
                      "ai.response.model": response.modelId,
                      "ai.response.timestamp": response.timestamp.toISOString(),
                      "ai.usage.promptTokens": finalUsage.promptTokens,
                      "ai.usage.completionTokens": finalUsage.completionTokens,
                      // standardized gen-ai llm span attributes:
                      "gen_ai.response.finish_reasons": [finishReason],
                      "gen_ai.response.id": response.id,
                      "gen_ai.response.model": response.modelId,
                      "gen_ai.usage.input_tokens": finalUsage.promptTokens,
                      "gen_ai.usage.output_tokens": finalUsage.completionTokens
                    }
                  })
                );
                doStreamSpan.end();
                rootSpan.setAttributes(
                  selectTelemetryAttributes({
                    telemetry,
                    attributes: {
                      "ai.usage.promptTokens": finalUsage.promptTokens,
                      "ai.usage.completionTokens": finalUsage.completionTokens,
                      "ai.response.object": {
                        output: () => JSON.stringify(object2)
                      }
                    }
                  })
                );
                await (onFinish == null ? void 0 : onFinish({
                  usage: finalUsage,
                  object: object2,
                  error,
                  response: {
                    ...response,
                    headers: rawResponse == null ? void 0 : rawResponse.headers
                  },
                  warnings,
                  providerMetadata,
                  experimental_providerMetadata: providerMetadata
                }));
              } catch (error2) {
                controller.enqueue({ type: "error", error: error2 });
              } finally {
                rootSpan.end();
              }
            }
          })
        );
        stitchableStream.addStream(transformedStream);
      }
    }).catch((error) => {
      stitchableStream.addStream(
        new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "error", error });
            controller.close();
          }
        })
      );
    }).finally(() => {
      stitchableStream.close();
    });
    this.outputStrategy = outputStrategy;
  }
  get object() {
    return this.objectPromise.value;
  }
  get usage() {
    return this.usagePromise.value;
  }
  get experimental_providerMetadata() {
    return this.providerMetadataPromise.value;
  }
  get providerMetadata() {
    return this.providerMetadataPromise.value;
  }
  get warnings() {
    return this.warningsPromise.value;
  }
  get request() {
    return this.requestPromise.value;
  }
  get response() {
    return this.responsePromise.value;
  }
  get partialObjectStream() {
    return createAsyncIterableStream(
      this.baseStream.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            switch (chunk.type) {
              case "object":
                controller.enqueue(chunk.object);
                break;
              case "text-delta":
              case "finish":
              case "error":
                break;
              default: {
                const _exhaustiveCheck = chunk;
                throw new Error(`Unsupported chunk type: ${_exhaustiveCheck}`);
              }
            }
          }
        })
      )
    );
  }
  get elementStream() {
    return this.outputStrategy.createElementStream(this.baseStream);
  }
  get textStream() {
    return createAsyncIterableStream(
      this.baseStream.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            switch (chunk.type) {
              case "text-delta":
                controller.enqueue(chunk.textDelta);
                break;
              case "object":
              case "finish":
              case "error":
                break;
              default: {
                const _exhaustiveCheck = chunk;
                throw new Error(`Unsupported chunk type: ${_exhaustiveCheck}`);
              }
            }
          }
        })
      )
    );
  }
  get fullStream() {
    return createAsyncIterableStream(this.baseStream);
  }
  pipeTextStreamToResponse(response, init) {
    writeToServerResponse({
      response,
      status: init == null ? void 0 : init.status,
      statusText: init == null ? void 0 : init.statusText,
      headers: prepareOutgoingHttpHeaders(init == null ? void 0 : init.headers, {
        contentType: "text/plain; charset=utf-8"
      }),
      stream: this.textStream.pipeThrough(new TextEncoderStream())
    });
  }
  toTextStreamResponse(init) {
    var _a17;
    return new Response(this.textStream.pipeThrough(new TextEncoderStream()), {
      status: (_a17 = init == null ? void 0 : init.status) != null ? _a17 : 200,
      headers: prepareResponseHeaders(init == null ? void 0 : init.headers, {
        contentType: "text/plain; charset=utf-8"
      })
    });
  }
};

// core/generate-text/generate-text.ts


// errors/no-output-specified-error.ts

var name9 = "AI_NoOutputSpecifiedError";
var marker9 = `vercel.ai.error.${name9}`;
var symbol9 = Symbol.for(marker9);
var _a9;
var NoOutputSpecifiedError = class extends _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError {
  // used in isInstance
  constructor({ message = "No output specified." } = {}) {
    super({ name: name9, message });
    this[_a9] = true;
  }
  static isInstance(error) {
    return _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError.hasMarker(error, marker9);
  }
};
_a9 = symbol9;

// errors/tool-execution-error.ts

var name10 = "AI_ToolExecutionError";
var marker10 = `vercel.ai.error.${name10}`;
var symbol10 = Symbol.for(marker10);
var _a10;
var ToolExecutionError = class extends _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError {
  constructor({
    toolArgs,
    toolName,
    toolCallId,
    cause,
    message = `Error executing tool ${toolName}: ${(0,_ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.getErrorMessage)(cause)}`
  }) {
    super({ name: name10, message, cause });
    this[_a10] = true;
    this.toolArgs = toolArgs;
    this.toolName = toolName;
    this.toolCallId = toolCallId;
  }
  static isInstance(error) {
    return _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError.hasMarker(error, marker10);
  }
};
_a10 = symbol10;

// core/prompt/prepare-tools-and-tool-choice.ts


// core/util/is-non-empty-object.ts
function isNonEmptyObject(object2) {
  return object2 != null && Object.keys(object2).length > 0;
}

// core/prompt/prepare-tools-and-tool-choice.ts
function prepareToolsAndToolChoice({
  tools,
  toolChoice,
  activeTools
}) {
  if (!isNonEmptyObject(tools)) {
    return {
      tools: void 0,
      toolChoice: void 0
    };
  }
  const filteredTools = activeTools != null ? Object.entries(tools).filter(
    ([name17]) => activeTools.includes(name17)
  ) : Object.entries(tools);
  return {
    tools: filteredTools.map(([name17, tool2]) => {
      const toolType = tool2.type;
      switch (toolType) {
        case void 0:
        case "function":
          return {
            type: "function",
            name: name17,
            description: tool2.description,
            parameters: (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.asSchema)(tool2.parameters).jsonSchema
          };
        case "provider-defined":
          return {
            type: "provider-defined",
            name: name17,
            id: tool2.id,
            args: tool2.args
          };
        default: {
          const exhaustiveCheck = toolType;
          throw new Error(`Unsupported tool type: ${exhaustiveCheck}`);
        }
      }
    }),
    toolChoice: toolChoice == null ? { type: "auto" } : typeof toolChoice === "string" ? { type: toolChoice } : { type: "tool", toolName: toolChoice.toolName }
  };
}

// core/util/split-on-last-whitespace.ts
var lastWhitespaceRegexp = /^([\s\S]*?)(\s+)(\S*)$/;
function splitOnLastWhitespace(text2) {
  const match = text2.match(lastWhitespaceRegexp);
  return match ? { prefix: match[1], whitespace: match[2], suffix: match[3] } : void 0;
}

// core/util/remove-text-after-last-whitespace.ts
function removeTextAfterLastWhitespace(text2) {
  const match = splitOnLastWhitespace(text2);
  return match ? match.prefix + match.whitespace : text2;
}

// core/generate-text/parse-tool-call.ts



// errors/invalid-tool-arguments-error.ts

var name11 = "AI_InvalidToolArgumentsError";
var marker11 = `vercel.ai.error.${name11}`;
var symbol11 = Symbol.for(marker11);
var _a11;
var InvalidToolArgumentsError = class extends _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError {
  constructor({
    toolArgs,
    toolName,
    cause,
    message = `Invalid arguments for tool ${toolName}: ${(0,_ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.getErrorMessage)(
      cause
    )}`
  }) {
    super({ name: name11, message, cause });
    this[_a11] = true;
    this.toolArgs = toolArgs;
    this.toolName = toolName;
  }
  static isInstance(error) {
    return _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError.hasMarker(error, marker11);
  }
};
_a11 = symbol11;

// errors/no-such-tool-error.ts

var name12 = "AI_NoSuchToolError";
var marker12 = `vercel.ai.error.${name12}`;
var symbol12 = Symbol.for(marker12);
var _a12;
var NoSuchToolError = class extends _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError {
  constructor({
    toolName,
    availableTools = void 0,
    message = `Model tried to call unavailable tool '${toolName}'. ${availableTools === void 0 ? "No tools are available." : `Available tools: ${availableTools.join(", ")}.`}`
  }) {
    super({ name: name12, message });
    this[_a12] = true;
    this.toolName = toolName;
    this.availableTools = availableTools;
  }
  static isInstance(error) {
    return _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError.hasMarker(error, marker12);
  }
};
_a12 = symbol12;

// errors/tool-call-repair-error.ts

var name13 = "AI_ToolCallRepairError";
var marker13 = `vercel.ai.error.${name13}`;
var symbol13 = Symbol.for(marker13);
var _a13;
var ToolCallRepairError = class extends _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError {
  constructor({
    cause,
    originalError,
    message = `Error repairing tool call: ${(0,_ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.getErrorMessage)(cause)}`
  }) {
    super({ name: name13, message, cause });
    this[_a13] = true;
    this.originalError = originalError;
  }
  static isInstance(error) {
    return _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError.hasMarker(error, marker13);
  }
};
_a13 = symbol13;

// core/generate-text/parse-tool-call.ts
async function parseToolCall({
  toolCall,
  tools,
  repairToolCall,
  system,
  messages
}) {
  if (tools == null) {
    throw new NoSuchToolError({ toolName: toolCall.toolName });
  }
  try {
    return await doParseToolCall({ toolCall, tools });
  } catch (error) {
    if (repairToolCall == null || !(NoSuchToolError.isInstance(error) || InvalidToolArgumentsError.isInstance(error))) {
      throw error;
    }
    let repairedToolCall = null;
    try {
      repairedToolCall = await repairToolCall({
        toolCall,
        tools,
        parameterSchema: ({ toolName }) => (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.asSchema)(tools[toolName].parameters).jsonSchema,
        system,
        messages,
        error
      });
    } catch (repairError) {
      throw new ToolCallRepairError({
        cause: repairError,
        originalError: error
      });
    }
    if (repairedToolCall == null) {
      throw error;
    }
    return await doParseToolCall({ toolCall: repairedToolCall, tools });
  }
}
async function doParseToolCall({
  toolCall,
  tools
}) {
  const toolName = toolCall.toolName;
  const tool2 = tools[toolName];
  if (tool2 == null) {
    throw new NoSuchToolError({
      toolName: toolCall.toolName,
      availableTools: Object.keys(tools)
    });
  }
  const schema = (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.asSchema)(tool2.parameters);
  const parseResult = toolCall.args.trim() === "" ? (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.safeValidateTypes)({ value: {}, schema }) : (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.safeParseJSON)({ text: toolCall.args, schema });
  if (parseResult.success === false) {
    throw new InvalidToolArgumentsError({
      toolName,
      toolArgs: toolCall.args,
      cause: parseResult.error
    });
  }
  return {
    type: "tool-call",
    toolCallId: toolCall.toolCallId,
    toolName,
    args: parseResult.value
  };
}

// core/generate-text/reasoning-detail.ts
function asReasoningText(reasoning) {
  const reasoningText = reasoning.filter((part) => part.type === "text").map((part) => part.text).join("");
  return reasoningText.length > 0 ? reasoningText : void 0;
}

// core/generate-text/to-response-messages.ts
function toResponseMessages({
  text: text2 = "",
  files,
  reasoning,
  tools,
  toolCalls,
  toolResults,
  messageId,
  generateMessageId
}) {
  const responseMessages = [];
  const content = [];
  if (reasoning.length > 0) {
    content.push(
      ...reasoning.map(
        (part) => part.type === "text" ? { ...part, type: "reasoning" } : { ...part, type: "redacted-reasoning" }
      )
    );
  }
  if (files.length > 0) {
    content.push(
      ...files.map((file) => ({
        type: "file",
        data: file.base64,
        mimeType: file.mimeType
      }))
    );
  }
  if (text2.length > 0) {
    content.push({ type: "text", text: text2 });
  }
  if (toolCalls.length > 0) {
    content.push(...toolCalls);
  }
  if (content.length > 0) {
    responseMessages.push({
      role: "assistant",
      content,
      id: messageId
    });
  }
  if (toolResults.length > 0) {
    responseMessages.push({
      role: "tool",
      id: generateMessageId(),
      content: toolResults.map((toolResult) => {
        const tool2 = tools[toolResult.toolName];
        return (tool2 == null ? void 0 : tool2.experimental_toToolResultContent) != null ? {
          type: "tool-result",
          toolCallId: toolResult.toolCallId,
          toolName: toolResult.toolName,
          result: tool2.experimental_toToolResultContent(toolResult.result),
          experimental_content: tool2.experimental_toToolResultContent(
            toolResult.result
          )
        } : {
          type: "tool-result",
          toolCallId: toolResult.toolCallId,
          toolName: toolResult.toolName,
          result: toolResult.result
        };
      })
    });
  }
  return responseMessages;
}

// core/generate-text/generate-text.ts
var originalGenerateId3 = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.createIdGenerator)({
  prefix: "aitxt",
  size: 24
});
var originalGenerateMessageId = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.createIdGenerator)({
  prefix: "msg",
  size: 24
});
async function generateText({
  model,
  tools,
  toolChoice,
  system,
  prompt,
  messages,
  maxRetries: maxRetriesArg,
  abortSignal,
  headers,
  maxSteps = 1,
  experimental_generateMessageId: generateMessageId = originalGenerateMessageId,
  experimental_output: output,
  experimental_continueSteps: continueSteps = false,
  experimental_telemetry: telemetry,
  experimental_providerMetadata,
  providerOptions = experimental_providerMetadata,
  experimental_activeTools: activeTools,
  experimental_prepareStep: prepareStep,
  experimental_repairToolCall: repairToolCall,
  _internal: {
    generateId: generateId3 = originalGenerateId3,
    currentDate = () => /* @__PURE__ */ new Date()
  } = {},
  onStepFinish,
  ...settings
}) {
  var _a17;
  if (maxSteps < 1) {
    throw new InvalidArgumentError({
      parameter: "maxSteps",
      value: maxSteps,
      message: "maxSteps must be at least 1"
    });
  }
  const { maxRetries, retry } = prepareRetries({ maxRetries: maxRetriesArg });
  const baseTelemetryAttributes = getBaseTelemetryAttributes({
    model,
    telemetry,
    headers,
    settings: { ...settings, maxRetries }
  });
  const initialPrompt = standardizePrompt({
    prompt: {
      system: (_a17 = output == null ? void 0 : output.injectIntoSystemPrompt({ system, model })) != null ? _a17 : system,
      prompt,
      messages
    },
    tools
  });
  const tracer = getTracer(telemetry);
  return recordSpan({
    name: "ai.generateText",
    attributes: selectTelemetryAttributes({
      telemetry,
      attributes: {
        ...assembleOperationName({
          operationId: "ai.generateText",
          telemetry
        }),
        ...baseTelemetryAttributes,
        // model:
        "ai.model.provider": model.provider,
        "ai.model.id": model.modelId,
        // specific settings that only make sense on the outer level:
        "ai.prompt": {
          input: () => JSON.stringify({ system, prompt, messages })
        },
        "ai.settings.maxSteps": maxSteps
      }
    }),
    tracer,
    fn: async (span) => {
      var _a18, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
      const callSettings = prepareCallSettings(settings);
      let currentModelResponse;
      let currentToolCalls = [];
      let currentToolResults = [];
      let currentReasoningDetails = [];
      let stepCount = 0;
      const responseMessages = [];
      let text2 = "";
      const sources = [];
      const steps = [];
      let usage = {
        completionTokens: 0,
        promptTokens: 0,
        totalTokens: 0
      };
      let stepType = "initial";
      do {
        const promptFormat = stepCount === 0 ? initialPrompt.type : "messages";
        const stepInputMessages = [
          ...initialPrompt.messages,
          ...responseMessages
        ];
        const prepareStepResult = await (prepareStep == null ? void 0 : prepareStep({
          model,
          steps,
          maxSteps,
          stepNumber: stepCount
        }));
        const stepToolChoice = (_a18 = prepareStepResult == null ? void 0 : prepareStepResult.toolChoice) != null ? _a18 : toolChoice;
        const stepActiveTools = (_b = prepareStepResult == null ? void 0 : prepareStepResult.experimental_activeTools) != null ? _b : activeTools;
        const stepModel = (_c = prepareStepResult == null ? void 0 : prepareStepResult.model) != null ? _c : model;
        const promptMessages = await convertToLanguageModelPrompt({
          prompt: {
            type: promptFormat,
            system: initialPrompt.system,
            messages: stepInputMessages
          },
          modelSupportsImageUrls: stepModel.supportsImageUrls,
          modelSupportsUrl: (_d = stepModel.supportsUrl) == null ? void 0 : _d.bind(stepModel)
          // support 'this' context
        });
        const mode = {
          type: "regular",
          ...prepareToolsAndToolChoice({
            tools,
            toolChoice: stepToolChoice,
            activeTools: stepActiveTools
          })
        };
        currentModelResponse = await retry(
          () => recordSpan({
            name: "ai.generateText.doGenerate",
            attributes: selectTelemetryAttributes({
              telemetry,
              attributes: {
                ...assembleOperationName({
                  operationId: "ai.generateText.doGenerate",
                  telemetry
                }),
                ...baseTelemetryAttributes,
                // model:
                "ai.model.provider": stepModel.provider,
                "ai.model.id": stepModel.modelId,
                // prompt:
                "ai.prompt.format": { input: () => promptFormat },
                "ai.prompt.messages": {
                  input: () => JSON.stringify(promptMessages)
                },
                "ai.prompt.tools": {
                  // convert the language model level tools:
                  input: () => {
                    var _a19;
                    return (_a19 = mode.tools) == null ? void 0 : _a19.map((tool2) => JSON.stringify(tool2));
                  }
                },
                "ai.prompt.toolChoice": {
                  input: () => mode.toolChoice != null ? JSON.stringify(mode.toolChoice) : void 0
                },
                // standardized gen-ai llm span attributes:
                "gen_ai.system": stepModel.provider,
                "gen_ai.request.model": stepModel.modelId,
                "gen_ai.request.frequency_penalty": settings.frequencyPenalty,
                "gen_ai.request.max_tokens": settings.maxTokens,
                "gen_ai.request.presence_penalty": settings.presencePenalty,
                "gen_ai.request.stop_sequences": settings.stopSequences,
                "gen_ai.request.temperature": settings.temperature,
                "gen_ai.request.top_k": settings.topK,
                "gen_ai.request.top_p": settings.topP
              }
            }),
            tracer,
            fn: async (span2) => {
              var _a19, _b2, _c2, _d2, _e2, _f2;
              const result = await stepModel.doGenerate({
                mode,
                ...callSettings,
                inputFormat: promptFormat,
                responseFormat: output == null ? void 0 : output.responseFormat({ model }),
                prompt: promptMessages,
                providerMetadata: providerOptions,
                abortSignal,
                headers
              });
              const responseData = {
                id: (_b2 = (_a19 = result.response) == null ? void 0 : _a19.id) != null ? _b2 : generateId3(),
                timestamp: (_d2 = (_c2 = result.response) == null ? void 0 : _c2.timestamp) != null ? _d2 : currentDate(),
                modelId: (_f2 = (_e2 = result.response) == null ? void 0 : _e2.modelId) != null ? _f2 : stepModel.modelId
              };
              span2.setAttributes(
                selectTelemetryAttributes({
                  telemetry,
                  attributes: {
                    "ai.response.finishReason": result.finishReason,
                    "ai.response.text": {
                      output: () => result.text
                    },
                    "ai.response.toolCalls": {
                      output: () => JSON.stringify(result.toolCalls)
                    },
                    "ai.response.id": responseData.id,
                    "ai.response.model": responseData.modelId,
                    "ai.response.timestamp": responseData.timestamp.toISOString(),
                    "ai.usage.promptTokens": result.usage.promptTokens,
                    "ai.usage.completionTokens": result.usage.completionTokens,
                    // standardized gen-ai llm span attributes:
                    "gen_ai.response.finish_reasons": [result.finishReason],
                    "gen_ai.response.id": responseData.id,
                    "gen_ai.response.model": responseData.modelId,
                    "gen_ai.usage.input_tokens": result.usage.promptTokens,
                    "gen_ai.usage.output_tokens": result.usage.completionTokens
                  }
                })
              );
              return { ...result, response: responseData };
            }
          })
        );
        currentToolCalls = await Promise.all(
          ((_e = currentModelResponse.toolCalls) != null ? _e : []).map(
            (toolCall) => parseToolCall({
              toolCall,
              tools,
              repairToolCall,
              system,
              messages: stepInputMessages
            })
          )
        );
        currentToolResults = tools == null ? [] : await executeTools({
          toolCalls: currentToolCalls,
          tools,
          tracer,
          telemetry,
          messages: stepInputMessages,
          abortSignal
        });
        const currentUsage = calculateLanguageModelUsage(
          currentModelResponse.usage
        );
        usage = addLanguageModelUsage(usage, currentUsage);
        let nextStepType = "done";
        if (++stepCount < maxSteps) {
          if (continueSteps && currentModelResponse.finishReason === "length" && // only use continue when there are no tool calls:
          currentToolCalls.length === 0) {
            nextStepType = "continue";
          } else if (
            // there are tool calls:
            currentToolCalls.length > 0 && // all current tool calls have results:
            currentToolResults.length === currentToolCalls.length
          ) {
            nextStepType = "tool-result";
          }
        }
        const originalText = (_f = currentModelResponse.text) != null ? _f : "";
        const stepTextLeadingWhitespaceTrimmed = stepType === "continue" && // only for continue steps
        text2.trimEnd() !== text2 ? originalText.trimStart() : originalText;
        const stepText = nextStepType === "continue" ? removeTextAfterLastWhitespace(stepTextLeadingWhitespaceTrimmed) : stepTextLeadingWhitespaceTrimmed;
        text2 = nextStepType === "continue" || stepType === "continue" ? text2 + stepText : stepText;
        currentReasoningDetails = asReasoningDetails(
          currentModelResponse.reasoning
        );
        sources.push(...(_g = currentModelResponse.sources) != null ? _g : []);
        if (stepType === "continue") {
          const lastMessage = responseMessages[responseMessages.length - 1];
          if (typeof lastMessage.content === "string") {
            lastMessage.content += stepText;
          } else {
            lastMessage.content.push({
              text: stepText,
              type: "text"
            });
          }
        } else {
          responseMessages.push(
            ...toResponseMessages({
              text: text2,
              files: asFiles(currentModelResponse.files),
              reasoning: asReasoningDetails(currentModelResponse.reasoning),
              tools: tools != null ? tools : {},
              toolCalls: currentToolCalls,
              toolResults: currentToolResults,
              messageId: generateMessageId(),
              generateMessageId
            })
          );
        }
        const currentStepResult = {
          stepType,
          text: stepText,
          // TODO v5: rename reasoning to reasoningText (and use reasoning for composite array)
          reasoning: asReasoningText(currentReasoningDetails),
          reasoningDetails: currentReasoningDetails,
          files: asFiles(currentModelResponse.files),
          sources: (_h = currentModelResponse.sources) != null ? _h : [],
          toolCalls: currentToolCalls,
          toolResults: currentToolResults,
          finishReason: currentModelResponse.finishReason,
          usage: currentUsage,
          warnings: currentModelResponse.warnings,
          logprobs: currentModelResponse.logprobs,
          request: (_i = currentModelResponse.request) != null ? _i : {},
          response: {
            ...currentModelResponse.response,
            headers: (_j = currentModelResponse.rawResponse) == null ? void 0 : _j.headers,
            body: (_k = currentModelResponse.rawResponse) == null ? void 0 : _k.body,
            // deep clone msgs to avoid mutating past messages in multi-step:
            messages: structuredClone(responseMessages)
          },
          providerMetadata: currentModelResponse.providerMetadata,
          experimental_providerMetadata: currentModelResponse.providerMetadata,
          isContinued: nextStepType === "continue"
        };
        steps.push(currentStepResult);
        await (onStepFinish == null ? void 0 : onStepFinish(currentStepResult));
        stepType = nextStepType;
      } while (stepType !== "done");
      span.setAttributes(
        selectTelemetryAttributes({
          telemetry,
          attributes: {
            "ai.response.finishReason": currentModelResponse.finishReason,
            "ai.response.text": {
              output: () => currentModelResponse.text
            },
            "ai.response.toolCalls": {
              output: () => JSON.stringify(currentModelResponse.toolCalls)
            },
            "ai.usage.promptTokens": currentModelResponse.usage.promptTokens,
            "ai.usage.completionTokens": currentModelResponse.usage.completionTokens
          }
        })
      );
      return new DefaultGenerateTextResult({
        text: text2,
        files: asFiles(currentModelResponse.files),
        reasoning: asReasoningText(currentReasoningDetails),
        reasoningDetails: currentReasoningDetails,
        sources,
        outputResolver: () => {
          if (output == null) {
            throw new NoOutputSpecifiedError();
          }
          return output.parseOutput(
            { text: text2 },
            {
              response: currentModelResponse.response,
              usage,
              finishReason: currentModelResponse.finishReason
            }
          );
        },
        toolCalls: currentToolCalls,
        toolResults: currentToolResults,
        finishReason: currentModelResponse.finishReason,
        usage,
        warnings: currentModelResponse.warnings,
        request: (_l = currentModelResponse.request) != null ? _l : {},
        response: {
          ...currentModelResponse.response,
          headers: (_m = currentModelResponse.rawResponse) == null ? void 0 : _m.headers,
          body: (_n = currentModelResponse.rawResponse) == null ? void 0 : _n.body,
          messages: responseMessages
        },
        logprobs: currentModelResponse.logprobs,
        steps,
        providerMetadata: currentModelResponse.providerMetadata
      });
    }
  });
}
async function executeTools({
  toolCalls,
  tools,
  tracer,
  telemetry,
  messages,
  abortSignal
}) {
  const toolResults = await Promise.all(
    toolCalls.map(async ({ toolCallId, toolName, args }) => {
      const tool2 = tools[toolName];
      if ((tool2 == null ? void 0 : tool2.execute) == null) {
        return void 0;
      }
      const result = await recordSpan({
        name: "ai.toolCall",
        attributes: selectTelemetryAttributes({
          telemetry,
          attributes: {
            ...assembleOperationName({
              operationId: "ai.toolCall",
              telemetry
            }),
            "ai.toolCall.name": toolName,
            "ai.toolCall.id": toolCallId,
            "ai.toolCall.args": {
              output: () => JSON.stringify(args)
            }
          }
        }),
        tracer,
        fn: async (span) => {
          try {
            const result2 = await tool2.execute(args, {
              toolCallId,
              messages,
              abortSignal
            });
            try {
              span.setAttributes(
                selectTelemetryAttributes({
                  telemetry,
                  attributes: {
                    "ai.toolCall.result": {
                      output: () => JSON.stringify(result2)
                    }
                  }
                })
              );
            } catch (ignored) {
            }
            return result2;
          } catch (error) {
            throw new ToolExecutionError({
              toolCallId,
              toolName,
              toolArgs: args,
              cause: error
            });
          }
        }
      });
      return {
        type: "tool-result",
        toolCallId,
        toolName,
        args,
        result
      };
    })
  );
  return toolResults.filter(
    (result) => result != null
  );
}
var DefaultGenerateTextResult = class {
  constructor(options) {
    this.text = options.text;
    this.files = options.files;
    this.reasoning = options.reasoning;
    this.reasoningDetails = options.reasoningDetails;
    this.toolCalls = options.toolCalls;
    this.toolResults = options.toolResults;
    this.finishReason = options.finishReason;
    this.usage = options.usage;
    this.warnings = options.warnings;
    this.request = options.request;
    this.response = options.response;
    this.steps = options.steps;
    this.experimental_providerMetadata = options.providerMetadata;
    this.providerMetadata = options.providerMetadata;
    this.logprobs = options.logprobs;
    this.outputResolver = options.outputResolver;
    this.sources = options.sources;
  }
  get experimental_output() {
    return this.outputResolver();
  }
};
function asReasoningDetails(reasoning) {
  if (reasoning == null) {
    return [];
  }
  if (typeof reasoning === "string") {
    return [{ type: "text", text: reasoning }];
  }
  return reasoning;
}
function asFiles(files) {
  var _a17;
  return (_a17 = files == null ? void 0 : files.map((file) => new DefaultGeneratedFile(file))) != null ? _a17 : [];
}

// core/generate-text/output.ts
var output_exports = {};
__export(output_exports, {
  object: () => object,
  text: () => text
});



// errors/index.ts


// errors/invalid-stream-part-error.ts

var name14 = "AI_InvalidStreamPartError";
var marker14 = `vercel.ai.error.${name14}`;
var symbol14 = Symbol.for(marker14);
var _a14;
var InvalidStreamPartError = class extends _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError {
  constructor({
    chunk,
    message
  }) {
    super({ name: name14, message });
    this[_a14] = true;
    this.chunk = chunk;
  }
  static isInstance(error) {
    return _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError.hasMarker(error, marker14);
  }
};
_a14 = symbol14;

// errors/mcp-client-error.ts

var name15 = "AI_MCPClientError";
var marker15 = `vercel.ai.error.${name15}`;
var symbol15 = Symbol.for(marker15);
var _a15;
var MCPClientError = class extends _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError {
  constructor({
    name: name17 = "MCPClientError",
    message,
    cause
  }) {
    super({ name: name17, message, cause });
    this[_a15] = true;
  }
  static isInstance(error) {
    return _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError.hasMarker(error, marker15);
  }
};
_a15 = symbol15;

// core/generate-text/output.ts
var text = () => ({
  type: "text",
  responseFormat: () => ({ type: "text" }),
  injectIntoSystemPrompt({ system }) {
    return system;
  },
  parsePartial({ text: text2 }) {
    return { partial: text2 };
  },
  parseOutput({ text: text2 }) {
    return text2;
  }
});
var object = ({
  schema: inputSchema
}) => {
  const schema = (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.asSchema)(inputSchema);
  return {
    type: "object",
    responseFormat: ({ model }) => ({
      type: "json",
      schema: model.supportsStructuredOutputs ? schema.jsonSchema : void 0
    }),
    injectIntoSystemPrompt({ system, model }) {
      return model.supportsStructuredOutputs ? system : injectJsonInstruction({
        prompt: system,
        schema: schema.jsonSchema
      });
    },
    parsePartial({ text: text2 }) {
      const result = (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.parsePartialJson)(text2);
      switch (result.state) {
        case "failed-parse":
        case "undefined-input":
          return void 0;
        case "repaired-parse":
        case "successful-parse":
          return {
            // Note: currently no validation of partial results:
            partial: result.value
          };
        default: {
          const _exhaustiveCheck = result.state;
          throw new Error(`Unsupported parse state: ${_exhaustiveCheck}`);
        }
      }
    },
    parseOutput({ text: text2 }, context) {
      const parseResult = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.safeParseJSON)({ text: text2 });
      if (!parseResult.success) {
        throw new NoObjectGeneratedError({
          message: "No object generated: could not parse the response.",
          cause: parseResult.error,
          text: text2,
          response: context.response,
          usage: context.usage,
          finishReason: context.finishReason
        });
      }
      const validationResult = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.safeValidateTypes)({
        value: parseResult.value,
        schema
      });
      if (!validationResult.success) {
        throw new NoObjectGeneratedError({
          message: "No object generated: response did not match schema.",
          cause: validationResult.error,
          text: text2,
          response: context.response,
          usage: context.usage,
          finishReason: context.finishReason
        });
      }
      return validationResult.value;
    }
  };
};

// core/generate-text/smooth-stream.ts


var CHUNKING_REGEXPS = {
  word: /\S+\s+/m,
  line: /\n+/m
};
function smoothStream({
  delayInMs = 10,
  chunking = "word",
  _internal: { delay: delay2 = _ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.delay } = {}
} = {}) {
  let detectChunk;
  if (typeof chunking === "function") {
    detectChunk = (buffer) => {
      const match = chunking(buffer);
      if (match == null) {
        return null;
      }
      if (!match.length) {
        throw new Error(`Chunking function must return a non-empty string.`);
      }
      if (!buffer.startsWith(match)) {
        throw new Error(
          `Chunking function must return a match that is a prefix of the buffer. Received: "${match}" expected to start with "${buffer}"`
        );
      }
      return match;
    };
  } else {
    const chunkingRegex = typeof chunking === "string" ? CHUNKING_REGEXPS[chunking] : chunking;
    if (chunkingRegex == null) {
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.InvalidArgumentError({
        argument: "chunking",
        message: `Chunking must be "word" or "line" or a RegExp. Received: ${chunking}`
      });
    }
    detectChunk = (buffer) => {
      const match = chunkingRegex.exec(buffer);
      if (!match) {
        return null;
      }
      return buffer.slice(0, match.index) + (match == null ? void 0 : match[0]);
    };
  }
  return () => {
    let buffer = "";
    return new TransformStream({
      async transform(chunk, controller) {
        if (chunk.type !== "text-delta") {
          if (buffer.length > 0) {
            controller.enqueue({ type: "text-delta", textDelta: buffer });
            buffer = "";
          }
          controller.enqueue(chunk);
          return;
        }
        buffer += chunk.textDelta;
        let match;
        while ((match = detectChunk(buffer)) != null) {
          controller.enqueue({ type: "text-delta", textDelta: match });
          buffer = buffer.slice(match.length);
          await delay2(delayInMs);
        }
      }
    });
  };
}

// core/generate-text/stream-text.ts




// util/as-array.ts
function asArray(value) {
  return value === void 0 ? [] : Array.isArray(value) ? value : [value];
}

// util/consume-stream.ts
async function consumeStream({
  stream,
  onError
}) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done } = await reader.read();
      if (done)
        break;
    }
  } catch (error) {
    onError == null ? void 0 : onError(error);
  } finally {
    reader.releaseLock();
  }
}

// core/util/merge-streams.ts
function mergeStreams(stream1, stream2) {
  const reader1 = stream1.getReader();
  const reader2 = stream2.getReader();
  let lastRead1 = void 0;
  let lastRead2 = void 0;
  let stream1Done = false;
  let stream2Done = false;
  async function readStream1(controller) {
    try {
      if (lastRead1 == null) {
        lastRead1 = reader1.read();
      }
      const result = await lastRead1;
      lastRead1 = void 0;
      if (!result.done) {
        controller.enqueue(result.value);
      } else {
        controller.close();
      }
    } catch (error) {
      controller.error(error);
    }
  }
  async function readStream2(controller) {
    try {
      if (lastRead2 == null) {
        lastRead2 = reader2.read();
      }
      const result = await lastRead2;
      lastRead2 = void 0;
      if (!result.done) {
        controller.enqueue(result.value);
      } else {
        controller.close();
      }
    } catch (error) {
      controller.error(error);
    }
  }
  return new ReadableStream({
    async pull(controller) {
      try {
        if (stream1Done) {
          await readStream2(controller);
          return;
        }
        if (stream2Done) {
          await readStream1(controller);
          return;
        }
        if (lastRead1 == null) {
          lastRead1 = reader1.read();
        }
        if (lastRead2 == null) {
          lastRead2 = reader2.read();
        }
        const { result, reader } = await Promise.race([
          lastRead1.then((result2) => ({ result: result2, reader: reader1 })),
          lastRead2.then((result2) => ({ result: result2, reader: reader2 }))
        ]);
        if (!result.done) {
          controller.enqueue(result.value);
        }
        if (reader === reader1) {
          lastRead1 = void 0;
          if (result.done) {
            await readStream2(controller);
            stream1Done = true;
          }
        } else {
          lastRead2 = void 0;
          if (result.done) {
            stream2Done = true;
            await readStream1(controller);
          }
        }
      } catch (error) {
        controller.error(error);
      }
    },
    cancel() {
      reader1.cancel();
      reader2.cancel();
    }
  });
}

// core/generate-text/run-tools-transformation.ts

function runToolsTransformation({
  tools,
  generatorStream,
  toolCallStreaming,
  tracer,
  telemetry,
  system,
  messages,
  abortSignal,
  repairToolCall
}) {
  let toolResultsStreamController = null;
  const toolResultsStream = new ReadableStream({
    start(controller) {
      toolResultsStreamController = controller;
    }
  });
  const activeToolCalls = {};
  const outstandingToolResults = /* @__PURE__ */ new Set();
  let canClose = false;
  let finishChunk = void 0;
  function attemptClose() {
    if (canClose && outstandingToolResults.size === 0) {
      if (finishChunk != null) {
        toolResultsStreamController.enqueue(finishChunk);
      }
      toolResultsStreamController.close();
    }
  }
  const forwardStream = new TransformStream({
    async transform(chunk, controller) {
      const chunkType = chunk.type;
      switch (chunkType) {
        case "text-delta":
        case "reasoning":
        case "reasoning-signature":
        case "redacted-reasoning":
        case "source":
        case "response-metadata":
        case "error": {
          controller.enqueue(chunk);
          break;
        }
        case "file": {
          controller.enqueue(
            new DefaultGeneratedFileWithType({
              data: chunk.data,
              mimeType: chunk.mimeType
            })
          );
          break;
        }
        case "tool-call-delta": {
          if (toolCallStreaming) {
            if (!activeToolCalls[chunk.toolCallId]) {
              controller.enqueue({
                type: "tool-call-streaming-start",
                toolCallId: chunk.toolCallId,
                toolName: chunk.toolName
              });
              activeToolCalls[chunk.toolCallId] = true;
            }
            controller.enqueue({
              type: "tool-call-delta",
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName,
              argsTextDelta: chunk.argsTextDelta
            });
          }
          break;
        }
        case "tool-call": {
          try {
            const toolCall = await parseToolCall({
              toolCall: chunk,
              tools,
              repairToolCall,
              system,
              messages
            });
            controller.enqueue(toolCall);
            const tool2 = tools[toolCall.toolName];
            if (tool2.execute != null) {
              const toolExecutionId = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.generateId)();
              outstandingToolResults.add(toolExecutionId);
              recordSpan({
                name: "ai.toolCall",
                attributes: selectTelemetryAttributes({
                  telemetry,
                  attributes: {
                    ...assembleOperationName({
                      operationId: "ai.toolCall",
                      telemetry
                    }),
                    "ai.toolCall.name": toolCall.toolName,
                    "ai.toolCall.id": toolCall.toolCallId,
                    "ai.toolCall.args": {
                      output: () => JSON.stringify(toolCall.args)
                    }
                  }
                }),
                tracer,
                fn: async (span) => tool2.execute(toolCall.args, {
                  toolCallId: toolCall.toolCallId,
                  messages,
                  abortSignal
                }).then(
                  (result) => {
                    toolResultsStreamController.enqueue({
                      ...toolCall,
                      type: "tool-result",
                      result
                    });
                    outstandingToolResults.delete(toolExecutionId);
                    attemptClose();
                    try {
                      span.setAttributes(
                        selectTelemetryAttributes({
                          telemetry,
                          attributes: {
                            "ai.toolCall.result": {
                              output: () => JSON.stringify(result)
                            }
                          }
                        })
                      );
                    } catch (ignored) {
                    }
                  },
                  (error) => {
                    toolResultsStreamController.enqueue({
                      type: "error",
                      error: new ToolExecutionError({
                        toolCallId: toolCall.toolCallId,
                        toolName: toolCall.toolName,
                        toolArgs: toolCall.args,
                        cause: error
                      })
                    });
                    outstandingToolResults.delete(toolExecutionId);
                    attemptClose();
                  }
                )
              });
            }
          } catch (error) {
            toolResultsStreamController.enqueue({
              type: "error",
              error
            });
          }
          break;
        }
        case "finish": {
          finishChunk = {
            type: "finish",
            finishReason: chunk.finishReason,
            logprobs: chunk.logprobs,
            usage: calculateLanguageModelUsage(chunk.usage),
            experimental_providerMetadata: chunk.providerMetadata
          };
          break;
        }
        default: {
          const _exhaustiveCheck = chunkType;
          throw new Error(`Unhandled chunk type: ${_exhaustiveCheck}`);
        }
      }
    },
    flush() {
      canClose = true;
      attemptClose();
    }
  });
  return new ReadableStream({
    async start(controller) {
      return Promise.all([
        generatorStream.pipeThrough(forwardStream).pipeTo(
          new WritableStream({
            write(chunk) {
              controller.enqueue(chunk);
            },
            close() {
            }
          })
        ),
        toolResultsStream.pipeTo(
          new WritableStream({
            write(chunk) {
              controller.enqueue(chunk);
            },
            close() {
              controller.close();
            }
          })
        )
      ]);
    }
  });
}

// core/generate-text/stream-text.ts
var originalGenerateId4 = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.createIdGenerator)({
  prefix: "aitxt",
  size: 24
});
var originalGenerateMessageId2 = (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.createIdGenerator)({
  prefix: "msg",
  size: 24
});
function streamText({
  model,
  tools,
  toolChoice,
  system,
  prompt,
  messages,
  maxRetries,
  abortSignal,
  headers,
  maxSteps = 1,
  experimental_generateMessageId: generateMessageId = originalGenerateMessageId2,
  experimental_output: output,
  experimental_continueSteps: continueSteps = false,
  experimental_telemetry: telemetry,
  experimental_providerMetadata,
  providerOptions = experimental_providerMetadata,
  experimental_toolCallStreaming = false,
  toolCallStreaming = experimental_toolCallStreaming,
  experimental_activeTools: activeTools,
  experimental_repairToolCall: repairToolCall,
  experimental_transform: transform,
  onChunk,
  onError,
  onFinish,
  onStepFinish,
  _internal: {
    now: now2 = now,
    generateId: generateId3 = originalGenerateId4,
    currentDate = () => /* @__PURE__ */ new Date()
  } = {},
  ...settings
}) {
  return new DefaultStreamTextResult({
    model,
    telemetry,
    headers,
    settings,
    maxRetries,
    abortSignal,
    system,
    prompt,
    messages,
    tools,
    toolChoice,
    toolCallStreaming,
    transforms: asArray(transform),
    activeTools,
    repairToolCall,
    maxSteps,
    output,
    continueSteps,
    providerOptions,
    onChunk,
    onError,
    onFinish,
    onStepFinish,
    now: now2,
    currentDate,
    generateId: generateId3,
    generateMessageId
  });
}
function createOutputTransformStream(output) {
  if (!output) {
    return new TransformStream({
      transform(chunk, controller) {
        controller.enqueue({ part: chunk, partialOutput: void 0 });
      }
    });
  }
  let text2 = "";
  let textChunk = "";
  let lastPublishedJson = "";
  function publishTextChunk({
    controller,
    partialOutput = void 0
  }) {
    controller.enqueue({
      part: { type: "text-delta", textDelta: textChunk },
      partialOutput
    });
    textChunk = "";
  }
  return new TransformStream({
    transform(chunk, controller) {
      if (chunk.type === "step-finish") {
        publishTextChunk({ controller });
      }
      if (chunk.type !== "text-delta") {
        controller.enqueue({ part: chunk, partialOutput: void 0 });
        return;
      }
      text2 += chunk.textDelta;
      textChunk += chunk.textDelta;
      const result = output.parsePartial({ text: text2 });
      if (result != null) {
        const currentJson = JSON.stringify(result.partial);
        if (currentJson !== lastPublishedJson) {
          publishTextChunk({ controller, partialOutput: result.partial });
          lastPublishedJson = currentJson;
        }
      }
    },
    flush(controller) {
      if (textChunk.length > 0) {
        publishTextChunk({ controller });
      }
    }
  });
}
var DefaultStreamTextResult = class {
  constructor({
    model,
    telemetry,
    headers,
    settings,
    maxRetries: maxRetriesArg,
    abortSignal,
    system,
    prompt,
    messages,
    tools,
    toolChoice,
    toolCallStreaming,
    transforms,
    activeTools,
    repairToolCall,
    maxSteps,
    output,
    continueSteps,
    providerOptions,
    now: now2,
    currentDate,
    generateId: generateId3,
    generateMessageId,
    onChunk,
    onError,
    onFinish,
    onStepFinish
  }) {
    this.warningsPromise = new DelayedPromise();
    this.usagePromise = new DelayedPromise();
    this.finishReasonPromise = new DelayedPromise();
    this.providerMetadataPromise = new DelayedPromise();
    this.textPromise = new DelayedPromise();
    this.reasoningPromise = new DelayedPromise();
    this.reasoningDetailsPromise = new DelayedPromise();
    this.sourcesPromise = new DelayedPromise();
    this.filesPromise = new DelayedPromise();
    this.toolCallsPromise = new DelayedPromise();
    this.toolResultsPromise = new DelayedPromise();
    this.requestPromise = new DelayedPromise();
    this.responsePromise = new DelayedPromise();
    this.stepsPromise = new DelayedPromise();
    var _a17;
    if (maxSteps < 1) {
      throw new InvalidArgumentError({
        parameter: "maxSteps",
        value: maxSteps,
        message: "maxSteps must be at least 1"
      });
    }
    this.output = output;
    let recordedStepText = "";
    let recordedContinuationText = "";
    let recordedFullText = "";
    let stepReasoning = [];
    let stepFiles = [];
    let activeReasoningText = void 0;
    let recordedStepSources = [];
    const recordedSources = [];
    const recordedResponse = {
      id: generateId3(),
      timestamp: currentDate(),
      modelId: model.modelId,
      messages: []
    };
    let recordedToolCalls = [];
    let recordedToolResults = [];
    let recordedFinishReason = void 0;
    let recordedUsage = void 0;
    let stepType = "initial";
    const recordedSteps = [];
    let rootSpan;
    const eventProcessor = new TransformStream({
      async transform(chunk, controller) {
        controller.enqueue(chunk);
        const { part } = chunk;
        if (part.type === "text-delta" || part.type === "reasoning" || part.type === "source" || part.type === "tool-call" || part.type === "tool-result" || part.type === "tool-call-streaming-start" || part.type === "tool-call-delta") {
          await (onChunk == null ? void 0 : onChunk({ chunk: part }));
        }
        if (part.type === "error") {
          await (onError == null ? void 0 : onError({ error: part.error }));
        }
        if (part.type === "text-delta") {
          recordedStepText += part.textDelta;
          recordedContinuationText += part.textDelta;
          recordedFullText += part.textDelta;
        }
        if (part.type === "reasoning") {
          if (activeReasoningText == null) {
            activeReasoningText = { type: "text", text: part.textDelta };
            stepReasoning.push(activeReasoningText);
          } else {
            activeReasoningText.text += part.textDelta;
          }
        }
        if (part.type === "reasoning-signature") {
          if (activeReasoningText == null) {
            throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError({
              name: "InvalidStreamPart",
              message: "reasoning-signature without reasoning"
            });
          }
          activeReasoningText.signature = part.signature;
          activeReasoningText = void 0;
        }
        if (part.type === "redacted-reasoning") {
          stepReasoning.push({ type: "redacted", data: part.data });
        }
        if (part.type === "file") {
          stepFiles.push(part);
        }
        if (part.type === "source") {
          recordedSources.push(part.source);
          recordedStepSources.push(part.source);
        }
        if (part.type === "tool-call") {
          recordedToolCalls.push(part);
        }
        if (part.type === "tool-result") {
          recordedToolResults.push(part);
        }
        if (part.type === "step-finish") {
          const stepMessages = toResponseMessages({
            text: recordedContinuationText,
            files: stepFiles,
            reasoning: stepReasoning,
            tools: tools != null ? tools : {},
            toolCalls: recordedToolCalls,
            toolResults: recordedToolResults,
            messageId: part.messageId,
            generateMessageId
          });
          const currentStep = recordedSteps.length;
          let nextStepType = "done";
          if (currentStep + 1 < maxSteps) {
            if (continueSteps && part.finishReason === "length" && // only use continue when there are no tool calls:
            recordedToolCalls.length === 0) {
              nextStepType = "continue";
            } else if (
              // there are tool calls:
              recordedToolCalls.length > 0 && // all current tool calls have results:
              recordedToolResults.length === recordedToolCalls.length
            ) {
              nextStepType = "tool-result";
            }
          }
          const currentStepResult = {
            stepType,
            text: recordedStepText,
            reasoning: asReasoningText(stepReasoning),
            reasoningDetails: stepReasoning,
            files: stepFiles,
            sources: recordedStepSources,
            toolCalls: recordedToolCalls,
            toolResults: recordedToolResults,
            finishReason: part.finishReason,
            usage: part.usage,
            warnings: part.warnings,
            logprobs: part.logprobs,
            request: part.request,
            response: {
              ...part.response,
              messages: [...recordedResponse.messages, ...stepMessages]
            },
            providerMetadata: part.experimental_providerMetadata,
            experimental_providerMetadata: part.experimental_providerMetadata,
            isContinued: part.isContinued
          };
          await (onStepFinish == null ? void 0 : onStepFinish(currentStepResult));
          recordedSteps.push(currentStepResult);
          recordedToolCalls = [];
          recordedToolResults = [];
          recordedStepText = "";
          recordedStepSources = [];
          stepReasoning = [];
          stepFiles = [];
          activeReasoningText = void 0;
          if (nextStepType !== "done") {
            stepType = nextStepType;
          }
          if (nextStepType !== "continue") {
            recordedResponse.messages.push(...stepMessages);
            recordedContinuationText = "";
          }
        }
        if (part.type === "finish") {
          recordedResponse.id = part.response.id;
          recordedResponse.timestamp = part.response.timestamp;
          recordedResponse.modelId = part.response.modelId;
          recordedResponse.headers = part.response.headers;
          recordedUsage = part.usage;
          recordedFinishReason = part.finishReason;
        }
      },
      async flush(controller) {
        var _a18;
        try {
          if (recordedSteps.length === 0) {
            return;
          }
          const lastStep = recordedSteps[recordedSteps.length - 1];
          self.warningsPromise.resolve(lastStep.warnings);
          self.requestPromise.resolve(lastStep.request);
          self.responsePromise.resolve(lastStep.response);
          self.toolCallsPromise.resolve(lastStep.toolCalls);
          self.toolResultsPromise.resolve(lastStep.toolResults);
          self.providerMetadataPromise.resolve(
            lastStep.experimental_providerMetadata
          );
          self.reasoningPromise.resolve(lastStep.reasoning);
          self.reasoningDetailsPromise.resolve(lastStep.reasoningDetails);
          const finishReason = recordedFinishReason != null ? recordedFinishReason : "unknown";
          const usage = recordedUsage != null ? recordedUsage : {
            completionTokens: NaN,
            promptTokens: NaN,
            totalTokens: NaN
          };
          self.finishReasonPromise.resolve(finishReason);
          self.usagePromise.resolve(usage);
          self.textPromise.resolve(recordedFullText);
          self.sourcesPromise.resolve(recordedSources);
          self.filesPromise.resolve(lastStep.files);
          self.stepsPromise.resolve(recordedSteps);
          await (onFinish == null ? void 0 : onFinish({
            finishReason,
            logprobs: void 0,
            usage,
            text: recordedFullText,
            reasoning: lastStep.reasoning,
            reasoningDetails: lastStep.reasoningDetails,
            files: lastStep.files,
            sources: lastStep.sources,
            toolCalls: lastStep.toolCalls,
            toolResults: lastStep.toolResults,
            request: (_a18 = lastStep.request) != null ? _a18 : {},
            response: lastStep.response,
            warnings: lastStep.warnings,
            providerMetadata: lastStep.providerMetadata,
            experimental_providerMetadata: lastStep.experimental_providerMetadata,
            steps: recordedSteps
          }));
          rootSpan.setAttributes(
            selectTelemetryAttributes({
              telemetry,
              attributes: {
                "ai.response.finishReason": finishReason,
                "ai.response.text": { output: () => recordedFullText },
                "ai.response.toolCalls": {
                  output: () => {
                    var _a19;
                    return ((_a19 = lastStep.toolCalls) == null ? void 0 : _a19.length) ? JSON.stringify(lastStep.toolCalls) : void 0;
                  }
                },
                "ai.usage.promptTokens": usage.promptTokens,
                "ai.usage.completionTokens": usage.completionTokens
              }
            })
          );
        } catch (error) {
          controller.error(error);
        } finally {
          rootSpan.end();
        }
      }
    });
    const stitchableStream = createStitchableStream();
    this.addStream = stitchableStream.addStream;
    this.closeStream = stitchableStream.close;
    let stream = stitchableStream.stream;
    for (const transform of transforms) {
      stream = stream.pipeThrough(
        transform({
          tools,
          stopStream() {
            stitchableStream.terminate();
          }
        })
      );
    }
    this.baseStream = stream.pipeThrough(createOutputTransformStream(output)).pipeThrough(eventProcessor);
    const { maxRetries, retry } = prepareRetries({
      maxRetries: maxRetriesArg
    });
    const tracer = getTracer(telemetry);
    const baseTelemetryAttributes = getBaseTelemetryAttributes({
      model,
      telemetry,
      headers,
      settings: { ...settings, maxRetries }
    });
    const initialPrompt = standardizePrompt({
      prompt: {
        system: (_a17 = output == null ? void 0 : output.injectIntoSystemPrompt({ system, model })) != null ? _a17 : system,
        prompt,
        messages
      },
      tools
    });
    const self = this;
    recordSpan({
      name: "ai.streamText",
      attributes: selectTelemetryAttributes({
        telemetry,
        attributes: {
          ...assembleOperationName({ operationId: "ai.streamText", telemetry }),
          ...baseTelemetryAttributes,
          // specific settings that only make sense on the outer level:
          "ai.prompt": {
            input: () => JSON.stringify({ system, prompt, messages })
          },
          "ai.settings.maxSteps": maxSteps
        }
      }),
      tracer,
      endWhenDone: false,
      fn: async (rootSpanArg) => {
        rootSpan = rootSpanArg;
        async function streamStep({
          currentStep,
          responseMessages,
          usage,
          stepType: stepType2,
          previousStepText,
          hasLeadingWhitespace,
          messageId
        }) {
          var _a18;
          const promptFormat = responseMessages.length === 0 ? initialPrompt.type : "messages";
          const stepInputMessages = [
            ...initialPrompt.messages,
            ...responseMessages
          ];
          const promptMessages = await convertToLanguageModelPrompt({
            prompt: {
              type: promptFormat,
              system: initialPrompt.system,
              messages: stepInputMessages
            },
            modelSupportsImageUrls: model.supportsImageUrls,
            modelSupportsUrl: (_a18 = model.supportsUrl) == null ? void 0 : _a18.bind(model)
            // support 'this' context
          });
          const mode = {
            type: "regular",
            ...prepareToolsAndToolChoice({ tools, toolChoice, activeTools })
          };
          const {
            result: { stream: stream2, warnings, rawResponse, request },
            doStreamSpan,
            startTimestampMs
          } = await retry(
            () => recordSpan({
              name: "ai.streamText.doStream",
              attributes: selectTelemetryAttributes({
                telemetry,
                attributes: {
                  ...assembleOperationName({
                    operationId: "ai.streamText.doStream",
                    telemetry
                  }),
                  ...baseTelemetryAttributes,
                  "ai.prompt.format": {
                    input: () => promptFormat
                  },
                  "ai.prompt.messages": {
                    input: () => JSON.stringify(promptMessages)
                  },
                  "ai.prompt.tools": {
                    // convert the language model level tools:
                    input: () => {
                      var _a19;
                      return (_a19 = mode.tools) == null ? void 0 : _a19.map((tool2) => JSON.stringify(tool2));
                    }
                  },
                  "ai.prompt.toolChoice": {
                    input: () => mode.toolChoice != null ? JSON.stringify(mode.toolChoice) : void 0
                  },
                  // standardized gen-ai llm span attributes:
                  "gen_ai.system": model.provider,
                  "gen_ai.request.model": model.modelId,
                  "gen_ai.request.frequency_penalty": settings.frequencyPenalty,
                  "gen_ai.request.max_tokens": settings.maxTokens,
                  "gen_ai.request.presence_penalty": settings.presencePenalty,
                  "gen_ai.request.stop_sequences": settings.stopSequences,
                  "gen_ai.request.temperature": settings.temperature,
                  "gen_ai.request.top_k": settings.topK,
                  "gen_ai.request.top_p": settings.topP
                }
              }),
              tracer,
              endWhenDone: false,
              fn: async (doStreamSpan2) => ({
                startTimestampMs: now2(),
                // get before the call
                doStreamSpan: doStreamSpan2,
                result: await model.doStream({
                  mode,
                  ...prepareCallSettings(settings),
                  inputFormat: promptFormat,
                  responseFormat: output == null ? void 0 : output.responseFormat({ model }),
                  prompt: promptMessages,
                  providerMetadata: providerOptions,
                  abortSignal,
                  headers
                })
              })
            })
          );
          const transformedStream = runToolsTransformation({
            tools,
            generatorStream: stream2,
            toolCallStreaming,
            tracer,
            telemetry,
            system,
            messages: stepInputMessages,
            repairToolCall,
            abortSignal
          });
          const stepRequest = request != null ? request : {};
          const stepToolCalls = [];
          const stepToolResults = [];
          const stepReasoning2 = [];
          const stepFiles2 = [];
          let activeReasoningText2 = void 0;
          let stepFinishReason = "unknown";
          let stepUsage = {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
          };
          let stepProviderMetadata;
          let stepFirstChunk = true;
          let stepText = "";
          let fullStepText = stepType2 === "continue" ? previousStepText : "";
          let stepLogProbs;
          let stepResponse = {
            id: generateId3(),
            timestamp: currentDate(),
            modelId: model.modelId
          };
          let chunkBuffer = "";
          let chunkTextPublished = false;
          let inWhitespacePrefix = true;
          let hasWhitespaceSuffix = false;
          async function publishTextChunk({
            controller,
            chunk
          }) {
            controller.enqueue(chunk);
            stepText += chunk.textDelta;
            fullStepText += chunk.textDelta;
            chunkTextPublished = true;
            hasWhitespaceSuffix = chunk.textDelta.trimEnd() !== chunk.textDelta;
          }
          self.addStream(
            transformedStream.pipeThrough(
              new TransformStream({
                async transform(chunk, controller) {
                  var _a19, _b, _c;
                  if (stepFirstChunk) {
                    const msToFirstChunk = now2() - startTimestampMs;
                    stepFirstChunk = false;
                    doStreamSpan.addEvent("ai.stream.firstChunk", {
                      "ai.response.msToFirstChunk": msToFirstChunk
                    });
                    doStreamSpan.setAttributes({
                      "ai.response.msToFirstChunk": msToFirstChunk
                    });
                    controller.enqueue({
                      type: "step-start",
                      messageId,
                      request: stepRequest,
                      warnings: warnings != null ? warnings : []
                    });
                  }
                  if (chunk.type === "text-delta" && chunk.textDelta.length === 0) {
                    return;
                  }
                  const chunkType = chunk.type;
                  switch (chunkType) {
                    case "text-delta": {
                      if (continueSteps) {
                        const trimmedChunkText = inWhitespacePrefix && hasLeadingWhitespace ? chunk.textDelta.trimStart() : chunk.textDelta;
                        if (trimmedChunkText.length === 0) {
                          break;
                        }
                        inWhitespacePrefix = false;
                        chunkBuffer += trimmedChunkText;
                        const split = splitOnLastWhitespace(chunkBuffer);
                        if (split != null) {
                          chunkBuffer = split.suffix;
                          await publishTextChunk({
                            controller,
                            chunk: {
                              type: "text-delta",
                              textDelta: split.prefix + split.whitespace
                            }
                          });
                        }
                      } else {
                        await publishTextChunk({ controller, chunk });
                      }
                      break;
                    }
                    case "reasoning": {
                      controller.enqueue(chunk);
                      if (activeReasoningText2 == null) {
                        activeReasoningText2 = {
                          type: "text",
                          text: chunk.textDelta
                        };
                        stepReasoning2.push(activeReasoningText2);
                      } else {
                        activeReasoningText2.text += chunk.textDelta;
                      }
                      break;
                    }
                    case "reasoning-signature": {
                      controller.enqueue(chunk);
                      if (activeReasoningText2 == null) {
                        throw new InvalidStreamPartError({
                          chunk,
                          message: "reasoning-signature without reasoning"
                        });
                      }
                      activeReasoningText2.signature = chunk.signature;
                      activeReasoningText2 = void 0;
                      break;
                    }
                    case "redacted-reasoning": {
                      controller.enqueue(chunk);
                      stepReasoning2.push({
                        type: "redacted",
                        data: chunk.data
                      });
                      break;
                    }
                    case "tool-call": {
                      controller.enqueue(chunk);
                      stepToolCalls.push(chunk);
                      break;
                    }
                    case "tool-result": {
                      controller.enqueue(chunk);
                      stepToolResults.push(chunk);
                      break;
                    }
                    case "response-metadata": {
                      stepResponse = {
                        id: (_a19 = chunk.id) != null ? _a19 : stepResponse.id,
                        timestamp: (_b = chunk.timestamp) != null ? _b : stepResponse.timestamp,
                        modelId: (_c = chunk.modelId) != null ? _c : stepResponse.modelId
                      };
                      break;
                    }
                    case "finish": {
                      stepUsage = chunk.usage;
                      stepFinishReason = chunk.finishReason;
                      stepProviderMetadata = chunk.experimental_providerMetadata;
                      stepLogProbs = chunk.logprobs;
                      const msToFinish = now2() - startTimestampMs;
                      doStreamSpan.addEvent("ai.stream.finish");
                      doStreamSpan.setAttributes({
                        "ai.response.msToFinish": msToFinish,
                        "ai.response.avgCompletionTokensPerSecond": 1e3 * stepUsage.completionTokens / msToFinish
                      });
                      break;
                    }
                    case "file": {
                      stepFiles2.push(chunk);
                      controller.enqueue(chunk);
                      break;
                    }
                    case "source":
                    case "tool-call-streaming-start":
                    case "tool-call-delta": {
                      controller.enqueue(chunk);
                      break;
                    }
                    case "error": {
                      controller.enqueue(chunk);
                      stepFinishReason = "error";
                      break;
                    }
                    default: {
                      const exhaustiveCheck = chunkType;
                      throw new Error(`Unknown chunk type: ${exhaustiveCheck}`);
                    }
                  }
                },
                // invoke onFinish callback and resolve toolResults promise when the stream is about to close:
                async flush(controller) {
                  const stepToolCallsJson = stepToolCalls.length > 0 ? JSON.stringify(stepToolCalls) : void 0;
                  let nextStepType = "done";
                  if (currentStep + 1 < maxSteps) {
                    if (continueSteps && stepFinishReason === "length" && // only use continue when there are no tool calls:
                    stepToolCalls.length === 0) {
                      nextStepType = "continue";
                    } else if (
                      // there are tool calls:
                      stepToolCalls.length > 0 && // all current tool calls have results:
                      stepToolResults.length === stepToolCalls.length
                    ) {
                      nextStepType = "tool-result";
                    }
                  }
                  if (continueSteps && chunkBuffer.length > 0 && (nextStepType !== "continue" || // when the next step is a regular step, publish the buffer
                  stepType2 === "continue" && !chunkTextPublished)) {
                    await publishTextChunk({
                      controller,
                      chunk: {
                        type: "text-delta",
                        textDelta: chunkBuffer
                      }
                    });
                    chunkBuffer = "";
                  }
                  try {
                    doStreamSpan.setAttributes(
                      selectTelemetryAttributes({
                        telemetry,
                        attributes: {
                          "ai.response.finishReason": stepFinishReason,
                          "ai.response.text": { output: () => stepText },
                          "ai.response.toolCalls": {
                            output: () => stepToolCallsJson
                          },
                          "ai.response.id": stepResponse.id,
                          "ai.response.model": stepResponse.modelId,
                          "ai.response.timestamp": stepResponse.timestamp.toISOString(),
                          "ai.usage.promptTokens": stepUsage.promptTokens,
                          "ai.usage.completionTokens": stepUsage.completionTokens,
                          // standardized gen-ai llm span attributes:
                          "gen_ai.response.finish_reasons": [stepFinishReason],
                          "gen_ai.response.id": stepResponse.id,
                          "gen_ai.response.model": stepResponse.modelId,
                          "gen_ai.usage.input_tokens": stepUsage.promptTokens,
                          "gen_ai.usage.output_tokens": stepUsage.completionTokens
                        }
                      })
                    );
                  } catch (error) {
                  } finally {
                    doStreamSpan.end();
                  }
                  controller.enqueue({
                    type: "step-finish",
                    finishReason: stepFinishReason,
                    usage: stepUsage,
                    providerMetadata: stepProviderMetadata,
                    experimental_providerMetadata: stepProviderMetadata,
                    logprobs: stepLogProbs,
                    request: stepRequest,
                    response: {
                      ...stepResponse,
                      headers: rawResponse == null ? void 0 : rawResponse.headers
                    },
                    warnings,
                    isContinued: nextStepType === "continue",
                    messageId
                  });
                  const combinedUsage = addLanguageModelUsage(usage, stepUsage);
                  if (nextStepType === "done") {
                    controller.enqueue({
                      type: "finish",
                      finishReason: stepFinishReason,
                      usage: combinedUsage,
                      providerMetadata: stepProviderMetadata,
                      experimental_providerMetadata: stepProviderMetadata,
                      logprobs: stepLogProbs,
                      response: {
                        ...stepResponse,
                        headers: rawResponse == null ? void 0 : rawResponse.headers
                      }
                    });
                    self.closeStream();
                  } else {
                    if (stepType2 === "continue") {
                      const lastMessage = responseMessages[responseMessages.length - 1];
                      if (typeof lastMessage.content === "string") {
                        lastMessage.content += stepText;
                      } else {
                        lastMessage.content.push({
                          text: stepText,
                          type: "text"
                        });
                      }
                    } else {
                      responseMessages.push(
                        ...toResponseMessages({
                          text: stepText,
                          files: stepFiles2,
                          reasoning: stepReasoning2,
                          tools: tools != null ? tools : {},
                          toolCalls: stepToolCalls,
                          toolResults: stepToolResults,
                          messageId,
                          generateMessageId
                        })
                      );
                    }
                    await streamStep({
                      currentStep: currentStep + 1,
                      responseMessages,
                      usage: combinedUsage,
                      stepType: nextStepType,
                      previousStepText: fullStepText,
                      hasLeadingWhitespace: hasWhitespaceSuffix,
                      messageId: (
                        // keep the same id when continuing a step:
                        nextStepType === "continue" ? messageId : generateMessageId()
                      )
                    });
                  }
                }
              })
            )
          );
        }
        await streamStep({
          currentStep: 0,
          responseMessages: [],
          usage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
          },
          previousStepText: "",
          stepType: "initial",
          hasLeadingWhitespace: false,
          messageId: generateMessageId()
        });
      }
    }).catch((error) => {
      self.addStream(
        new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "error", error });
            controller.close();
          }
        })
      );
      self.closeStream();
    });
  }
  get warnings() {
    return this.warningsPromise.value;
  }
  get usage() {
    return this.usagePromise.value;
  }
  get finishReason() {
    return this.finishReasonPromise.value;
  }
  get experimental_providerMetadata() {
    return this.providerMetadataPromise.value;
  }
  get providerMetadata() {
    return this.providerMetadataPromise.value;
  }
  get text() {
    return this.textPromise.value;
  }
  get reasoning() {
    return this.reasoningPromise.value;
  }
  get reasoningDetails() {
    return this.reasoningDetailsPromise.value;
  }
  get sources() {
    return this.sourcesPromise.value;
  }
  get files() {
    return this.filesPromise.value;
  }
  get toolCalls() {
    return this.toolCallsPromise.value;
  }
  get toolResults() {
    return this.toolResultsPromise.value;
  }
  get request() {
    return this.requestPromise.value;
  }
  get response() {
    return this.responsePromise.value;
  }
  get steps() {
    return this.stepsPromise.value;
  }
  /**
  Split out a new stream from the original stream.
  The original stream is replaced to allow for further splitting,
  since we do not know how many times the stream will be split.
  
  Note: this leads to buffering the stream content on the server.
  However, the LLM results are expected to be small enough to not cause issues.
     */
  teeStream() {
    const [stream1, stream2] = this.baseStream.tee();
    this.baseStream = stream2;
    return stream1;
  }
  get textStream() {
    return createAsyncIterableStream(
      this.teeStream().pipeThrough(
        new TransformStream({
          transform({ part }, controller) {
            if (part.type === "text-delta") {
              controller.enqueue(part.textDelta);
            }
          }
        })
      )
    );
  }
  get fullStream() {
    return createAsyncIterableStream(
      this.teeStream().pipeThrough(
        new TransformStream({
          transform({ part }, controller) {
            controller.enqueue(part);
          }
        })
      )
    );
  }
  async consumeStream(options) {
    var _a17;
    try {
      await consumeStream({
        stream: this.fullStream,
        onError: options == null ? void 0 : options.onError
      });
    } catch (error) {
      (_a17 = options == null ? void 0 : options.onError) == null ? void 0 : _a17.call(options, error);
    }
  }
  get experimental_partialOutputStream() {
    if (this.output == null) {
      throw new NoOutputSpecifiedError();
    }
    return createAsyncIterableStream(
      this.teeStream().pipeThrough(
        new TransformStream({
          transform({ partialOutput }, controller) {
            if (partialOutput != null) {
              controller.enqueue(partialOutput);
            }
          }
        })
      )
    );
  }
  toDataStreamInternal({
    getErrorMessage: getErrorMessage5 = () => "An error occurred.",
    // mask error messages for safety by default
    sendUsage = true,
    sendReasoning = false,
    sendSources = false,
    experimental_sendFinish = true
  }) {
    return this.fullStream.pipeThrough(
      new TransformStream({
        transform: async (chunk, controller) => {
          const chunkType = chunk.type;
          switch (chunkType) {
            case "text-delta": {
              controller.enqueue((0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("text", chunk.textDelta));
              break;
            }
            case "reasoning": {
              if (sendReasoning) {
                controller.enqueue(
                  (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("reasoning", chunk.textDelta)
                );
              }
              break;
            }
            case "redacted-reasoning": {
              if (sendReasoning) {
                controller.enqueue(
                  (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("redacted_reasoning", {
                    data: chunk.data
                  })
                );
              }
              break;
            }
            case "reasoning-signature": {
              if (sendReasoning) {
                controller.enqueue(
                  (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("reasoning_signature", {
                    signature: chunk.signature
                  })
                );
              }
              break;
            }
            case "file": {
              controller.enqueue(
                (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("file", {
                  mimeType: chunk.mimeType,
                  data: chunk.base64
                })
              );
              break;
            }
            case "source": {
              if (sendSources) {
                controller.enqueue(
                  (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("source", chunk.source)
                );
              }
              break;
            }
            case "tool-call-streaming-start": {
              controller.enqueue(
                (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("tool_call_streaming_start", {
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName
                })
              );
              break;
            }
            case "tool-call-delta": {
              controller.enqueue(
                (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("tool_call_delta", {
                  toolCallId: chunk.toolCallId,
                  argsTextDelta: chunk.argsTextDelta
                })
              );
              break;
            }
            case "tool-call": {
              controller.enqueue(
                (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("tool_call", {
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                  args: chunk.args
                })
              );
              break;
            }
            case "tool-result": {
              controller.enqueue(
                (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("tool_result", {
                  toolCallId: chunk.toolCallId,
                  result: chunk.result
                })
              );
              break;
            }
            case "error": {
              controller.enqueue(
                (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("error", getErrorMessage5(chunk.error))
              );
              break;
            }
            case "step-start": {
              controller.enqueue(
                (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("start_step", {
                  messageId: chunk.messageId
                })
              );
              break;
            }
            case "step-finish": {
              controller.enqueue(
                (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("finish_step", {
                  finishReason: chunk.finishReason,
                  usage: sendUsage ? {
                    promptTokens: chunk.usage.promptTokens,
                    completionTokens: chunk.usage.completionTokens
                  } : void 0,
                  isContinued: chunk.isContinued
                })
              );
              break;
            }
            case "finish": {
              if (experimental_sendFinish) {
                controller.enqueue(
                  (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("finish_message", {
                    finishReason: chunk.finishReason,
                    usage: sendUsage ? {
                      promptTokens: chunk.usage.promptTokens,
                      completionTokens: chunk.usage.completionTokens
                    } : void 0
                  })
                );
              }
              break;
            }
            default: {
              const exhaustiveCheck = chunkType;
              throw new Error(`Unknown chunk type: ${exhaustiveCheck}`);
            }
          }
        }
      })
    );
  }
  pipeDataStreamToResponse(response, {
    status,
    statusText,
    headers,
    data,
    getErrorMessage: getErrorMessage5,
    sendUsage,
    sendReasoning,
    sendSources,
    experimental_sendFinish
  } = {}) {
    writeToServerResponse({
      response,
      status,
      statusText,
      headers: prepareOutgoingHttpHeaders(headers, {
        contentType: "text/plain; charset=utf-8",
        dataStreamVersion: "v1"
      }),
      stream: this.toDataStream({
        data,
        getErrorMessage: getErrorMessage5,
        sendUsage,
        sendReasoning,
        sendSources,
        experimental_sendFinish
      })
    });
  }
  pipeTextStreamToResponse(response, init) {
    writeToServerResponse({
      response,
      status: init == null ? void 0 : init.status,
      statusText: init == null ? void 0 : init.statusText,
      headers: prepareOutgoingHttpHeaders(init == null ? void 0 : init.headers, {
        contentType: "text/plain; charset=utf-8"
      }),
      stream: this.textStream.pipeThrough(new TextEncoderStream())
    });
  }
  // TODO breaking change 5.0: remove pipeThrough(new TextEncoderStream())
  toDataStream(options) {
    const stream = this.toDataStreamInternal({
      getErrorMessage: options == null ? void 0 : options.getErrorMessage,
      sendUsage: options == null ? void 0 : options.sendUsage,
      sendReasoning: options == null ? void 0 : options.sendReasoning,
      sendSources: options == null ? void 0 : options.sendSources,
      experimental_sendFinish: options == null ? void 0 : options.experimental_sendFinish
    }).pipeThrough(new TextEncoderStream());
    return (options == null ? void 0 : options.data) ? mergeStreams(options == null ? void 0 : options.data.stream, stream) : stream;
  }
  mergeIntoDataStream(writer, options) {
    writer.merge(
      this.toDataStreamInternal({
        getErrorMessage: writer.onError,
        sendUsage: options == null ? void 0 : options.sendUsage,
        sendReasoning: options == null ? void 0 : options.sendReasoning,
        sendSources: options == null ? void 0 : options.sendSources,
        experimental_sendFinish: options == null ? void 0 : options.experimental_sendFinish
      })
    );
  }
  toDataStreamResponse({
    headers,
    status,
    statusText,
    data,
    getErrorMessage: getErrorMessage5,
    sendUsage,
    sendReasoning,
    sendSources,
    experimental_sendFinish
  } = {}) {
    return new Response(
      this.toDataStream({
        data,
        getErrorMessage: getErrorMessage5,
        sendUsage,
        sendReasoning,
        sendSources,
        experimental_sendFinish
      }),
      {
        status,
        statusText,
        headers: prepareResponseHeaders(headers, {
          contentType: "text/plain; charset=utf-8",
          dataStreamVersion: "v1"
        })
      }
    );
  }
  toTextStreamResponse(init) {
    var _a17;
    return new Response(this.textStream.pipeThrough(new TextEncoderStream()), {
      status: (_a17 = init == null ? void 0 : init.status) != null ? _a17 : 200,
      headers: prepareResponseHeaders(init == null ? void 0 : init.headers, {
        contentType: "text/plain; charset=utf-8"
      })
    });
  }
};

// errors/no-speech-generated-error.ts

var NoSpeechGeneratedError = class extends _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError {
  constructor(options) {
    super({
      name: "AI_NoSpeechGeneratedError",
      message: "No speech audio generated."
    });
    this.responses = options.responses;
  }
};

// core/generate-speech/generated-audio-file.ts
var DefaultGeneratedAudioFile = class extends DefaultGeneratedFile {
  constructor({
    data,
    mimeType
  }) {
    super({ data, mimeType });
    let format = "mp3";
    if (mimeType) {
      const mimeTypeParts = mimeType.split("/");
      if (mimeTypeParts.length === 2) {
        if (mimeType !== "audio/mpeg") {
          format = mimeTypeParts[1];
        }
      }
    }
    if (!format) {
      throw new Error(
        "Audio format must be provided or determinable from mimeType"
      );
    }
    this.format = format;
  }
};

// core/generate-speech/generate-speech.ts
async function generateSpeech({
  model,
  text: text2,
  voice,
  outputFormat,
  instructions,
  speed,
  providerOptions = {},
  maxRetries: maxRetriesArg,
  abortSignal,
  headers
}) {
  var _a17;
  const { retry } = prepareRetries({ maxRetries: maxRetriesArg });
  const result = await retry(
    () => model.doGenerate({
      text: text2,
      voice,
      outputFormat,
      instructions,
      speed,
      abortSignal,
      headers,
      providerOptions
    })
  );
  if (!result.audio || result.audio.length === 0) {
    throw new NoSpeechGeneratedError({ responses: [result.response] });
  }
  return new DefaultSpeechResult({
    audio: new DefaultGeneratedAudioFile({
      data: result.audio,
      mimeType: (_a17 = detectMimeType({
        data: result.audio,
        signatures: audioMimeTypeSignatures
      })) != null ? _a17 : "audio/mp3"
    }),
    warnings: result.warnings,
    responses: [result.response],
    providerMetadata: result.providerMetadata
  });
}
var DefaultSpeechResult = class {
  constructor(options) {
    var _a17;
    this.audio = options.audio;
    this.warnings = options.warnings;
    this.responses = options.responses;
    this.providerMetadata = (_a17 = options.providerMetadata) != null ? _a17 : {};
  }
};

// errors/no-transcript-generated-error.ts

var NoTranscriptGeneratedError = class extends _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError {
  constructor(options) {
    super({
      name: "AI_NoTranscriptGeneratedError",
      message: "No transcript generated."
    });
    this.responses = options.responses;
  }
};

// core/transcribe/transcribe.ts
async function transcribe({
  model,
  audio,
  providerOptions = {},
  maxRetries: maxRetriesArg,
  abortSignal,
  headers
}) {
  const { retry } = prepareRetries({ maxRetries: maxRetriesArg });
  const audioData = audio instanceof URL ? (await download({ url: audio })).data : convertDataContentToUint8Array(audio);
  const result = await retry(
    () => {
      var _a17;
      return model.doGenerate({
        audio: audioData,
        abortSignal,
        headers,
        providerOptions,
        mediaType: (_a17 = detectMimeType({
          data: audioData,
          signatures: audioMimeTypeSignatures
        })) != null ? _a17 : "audio/wav"
      });
    }
  );
  if (!result.text) {
    throw new NoTranscriptGeneratedError({ responses: [result.response] });
  }
  return new DefaultTranscriptionResult({
    text: result.text,
    segments: result.segments,
    language: result.language,
    durationInSeconds: result.durationInSeconds,
    warnings: result.warnings,
    responses: [result.response],
    providerMetadata: result.providerMetadata
  });
}
var DefaultTranscriptionResult = class {
  constructor(options) {
    var _a17;
    this.text = options.text;
    this.segments = options.segments;
    this.language = options.language;
    this.durationInSeconds = options.durationInSeconds;
    this.warnings = options.warnings;
    this.responses = options.responses;
    this.providerMetadata = (_a17 = options.providerMetadata) != null ? _a17 : {};
  }
};

// core/util/merge-objects.ts
function mergeObjects(target, source) {
  if (target === void 0 && source === void 0) {
    return void 0;
  }
  if (target === void 0) {
    return source;
  }
  if (source === void 0) {
    return target;
  }
  const result = { ...target };
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      if (sourceValue === void 0)
        continue;
      const targetValue = key in target ? target[key] : void 0;
      const isSourceObject = sourceValue !== null && typeof sourceValue === "object" && !Array.isArray(sourceValue) && !(sourceValue instanceof Date) && !(sourceValue instanceof RegExp);
      const isTargetObject = targetValue !== null && targetValue !== void 0 && typeof targetValue === "object" && !Array.isArray(targetValue) && !(targetValue instanceof Date) && !(targetValue instanceof RegExp);
      if (isSourceObject && isTargetObject) {
        result[key] = mergeObjects(
          targetValue,
          sourceValue
        );
      } else {
        result[key] = sourceValue;
      }
    }
  }
  return result;
}

// core/middleware/default-settings-middleware.ts
function defaultSettingsMiddleware({
  settings
}) {
  return {
    middlewareVersion: "v1",
    transformParams: async ({ params }) => {
      var _a17;
      return {
        ...settings,
        ...params,
        providerMetadata: mergeObjects(
          settings.providerMetadata,
          params.providerMetadata
        ),
        // special case for temperature 0
        // TODO remove when temperature defaults to undefined
        temperature: params.temperature === 0 || params.temperature == null ? (_a17 = settings.temperature) != null ? _a17 : 0 : params.temperature
      };
    }
  };
}

// core/util/get-potential-start-index.ts
function getPotentialStartIndex(text2, searchedText) {
  if (searchedText.length === 0) {
    return null;
  }
  const directIndex = text2.indexOf(searchedText);
  if (directIndex !== -1) {
    return directIndex;
  }
  for (let i = text2.length - 1; i >= 0; i--) {
    const suffix = text2.substring(i);
    if (searchedText.startsWith(suffix)) {
      return i;
    }
  }
  return null;
}

// core/middleware/extract-reasoning-middleware.ts
function extractReasoningMiddleware({
  tagName,
  separator = "\n",
  startWithReasoning = false
}) {
  const openingTag = `<${tagName}>`;
  const closingTag = `</${tagName}>`;
  return {
    middlewareVersion: "v1",
    wrapGenerate: async ({ doGenerate }) => {
      const { text: rawText, ...rest } = await doGenerate();
      if (rawText == null) {
        return { text: rawText, ...rest };
      }
      const text2 = startWithReasoning ? openingTag + rawText : rawText;
      const regexp = new RegExp(`${openingTag}(.*?)${closingTag}`, "gs");
      const matches = Array.from(text2.matchAll(regexp));
      if (!matches.length) {
        return { text: text2, ...rest };
      }
      const reasoning = matches.map((match) => match[1]).join(separator);
      let textWithoutReasoning = text2;
      for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i];
        const beforeMatch = textWithoutReasoning.slice(0, match.index);
        const afterMatch = textWithoutReasoning.slice(
          match.index + match[0].length
        );
        textWithoutReasoning = beforeMatch + (beforeMatch.length > 0 && afterMatch.length > 0 ? separator : "") + afterMatch;
      }
      return { ...rest, text: textWithoutReasoning, reasoning };
    },
    wrapStream: async ({ doStream }) => {
      const { stream, ...rest } = await doStream();
      let isFirstReasoning = true;
      let isFirstText = true;
      let afterSwitch = false;
      let isReasoning = startWithReasoning;
      let buffer = "";
      return {
        stream: stream.pipeThrough(
          new TransformStream({
            transform: (chunk, controller) => {
              if (chunk.type !== "text-delta") {
                controller.enqueue(chunk);
                return;
              }
              buffer += chunk.textDelta;
              function publish(text2) {
                if (text2.length > 0) {
                  const prefix = afterSwitch && (isReasoning ? !isFirstReasoning : !isFirstText) ? separator : "";
                  controller.enqueue({
                    type: isReasoning ? "reasoning" : "text-delta",
                    textDelta: prefix + text2
                  });
                  afterSwitch = false;
                  if (isReasoning) {
                    isFirstReasoning = false;
                  } else {
                    isFirstText = false;
                  }
                }
              }
              do {
                const nextTag = isReasoning ? closingTag : openingTag;
                const startIndex = getPotentialStartIndex(buffer, nextTag);
                if (startIndex == null) {
                  publish(buffer);
                  buffer = "";
                  break;
                }
                publish(buffer.slice(0, startIndex));
                const foundFullMatch = startIndex + nextTag.length <= buffer.length;
                if (foundFullMatch) {
                  buffer = buffer.slice(startIndex + nextTag.length);
                  isReasoning = !isReasoning;
                  afterSwitch = true;
                } else {
                  buffer = buffer.slice(startIndex);
                  break;
                }
              } while (true);
            }
          })
        ),
        ...rest
      };
    }
  };
}

// core/middleware/simulate-streaming-middleware.ts
function simulateStreamingMiddleware() {
  return {
    middlewareVersion: "v1",
    wrapStream: async ({ doGenerate }) => {
      const result = await doGenerate();
      const simulatedStream = new ReadableStream({
        start(controller) {
          controller.enqueue({ type: "response-metadata", ...result.response });
          if (result.reasoning) {
            if (typeof result.reasoning === "string") {
              controller.enqueue({
                type: "reasoning",
                textDelta: result.reasoning
              });
            } else {
              for (const reasoning of result.reasoning) {
                switch (reasoning.type) {
                  case "text": {
                    controller.enqueue({
                      type: "reasoning",
                      textDelta: reasoning.text
                    });
                    if (reasoning.signature != null) {
                      controller.enqueue({
                        type: "reasoning-signature",
                        signature: reasoning.signature
                      });
                    }
                    break;
                  }
                  case "redacted": {
                    controller.enqueue({
                      type: "redacted-reasoning",
                      data: reasoning.data
                    });
                    break;
                  }
                }
              }
            }
          }
          if (result.text) {
            controller.enqueue({
              type: "text-delta",
              textDelta: result.text
            });
          }
          if (result.toolCalls) {
            for (const toolCall of result.toolCalls) {
              controller.enqueue({
                type: "tool-call-delta",
                toolCallType: "function",
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                argsTextDelta: toolCall.args
              });
              controller.enqueue({
                type: "tool-call",
                ...toolCall
              });
            }
          }
          controller.enqueue({
            type: "finish",
            finishReason: result.finishReason,
            usage: result.usage,
            logprobs: result.logprobs,
            providerMetadata: result.providerMetadata
          });
          controller.close();
        }
      });
      return {
        stream: simulatedStream,
        rawCall: result.rawCall,
        rawResponse: result.rawResponse,
        warnings: result.warnings
      };
    }
  };
}

// core/middleware/wrap-language-model.ts
var wrapLanguageModel = ({
  model,
  middleware: middlewareArg,
  modelId,
  providerId
}) => {
  return asArray(middlewareArg).reverse().reduce((wrappedModel, middleware) => {
    return doWrap({ model: wrappedModel, middleware, modelId, providerId });
  }, model);
};
var doWrap = ({
  model,
  middleware: { transformParams, wrapGenerate, wrapStream },
  modelId,
  providerId
}) => {
  var _a17;
  async function doTransform({
    params,
    type
  }) {
    return transformParams ? await transformParams({ params, type }) : params;
  }
  return {
    specificationVersion: "v1",
    provider: providerId != null ? providerId : model.provider,
    modelId: modelId != null ? modelId : model.modelId,
    defaultObjectGenerationMode: model.defaultObjectGenerationMode,
    supportsImageUrls: model.supportsImageUrls,
    supportsUrl: (_a17 = model.supportsUrl) == null ? void 0 : _a17.bind(model),
    supportsStructuredOutputs: model.supportsStructuredOutputs,
    async doGenerate(params) {
      const transformedParams = await doTransform({ params, type: "generate" });
      const doGenerate = async () => model.doGenerate(transformedParams);
      const doStream = async () => model.doStream(transformedParams);
      return wrapGenerate ? wrapGenerate({
        doGenerate,
        doStream,
        params: transformedParams,
        model
      }) : doGenerate();
    },
    async doStream(params) {
      const transformedParams = await doTransform({ params, type: "stream" });
      const doGenerate = async () => model.doGenerate(transformedParams);
      const doStream = async () => model.doStream(transformedParams);
      return wrapStream ? wrapStream({ doGenerate, doStream, params: transformedParams, model }) : doStream();
    }
  };
};
var experimental_wrapLanguageModel = wrapLanguageModel;

// core/prompt/append-client-message.ts
function appendClientMessage({
  messages,
  message
}) {
  return [
    ...messages.length > 0 && messages[messages.length - 1].id === message.id ? messages.slice(0, -1) : messages,
    message
  ];
}

// core/prompt/append-response-messages.ts


function appendResponseMessages({
  messages,
  responseMessages,
  _internal: { currentDate = () => /* @__PURE__ */ new Date() } = {}
}) {
  var _a17, _b, _c, _d;
  const clonedMessages = structuredClone(messages);
  for (const message of responseMessages) {
    const role = message.role;
    const lastMessage = clonedMessages[clonedMessages.length - 1];
    const isLastMessageAssistant = lastMessage.role === "assistant";
    switch (role) {
      case "assistant": {
        let getToolInvocations2 = function(step) {
          return (typeof message.content === "string" ? [] : message.content.filter((part) => part.type === "tool-call")).map((call) => ({
            state: "call",
            step,
            args: call.args,
            toolCallId: call.toolCallId,
            toolName: call.toolName
          }));
        };
        var getToolInvocations = getToolInvocations2;
        const parts = [{ type: "step-start" }];
        let textContent = "";
        let reasoningTextContent = void 0;
        if (typeof message.content === "string") {
          textContent = message.content;
          parts.push({
            type: "text",
            text: message.content
          });
        } else {
          let reasoningPart = void 0;
          for (const part of message.content) {
            switch (part.type) {
              case "text": {
                reasoningPart = void 0;
                textContent += part.text;
                parts.push({
                  type: "text",
                  text: part.text
                });
                break;
              }
              case "reasoning": {
                if (reasoningPart == null) {
                  reasoningPart = {
                    type: "reasoning",
                    reasoning: "",
                    details: []
                  };
                  parts.push(reasoningPart);
                }
                reasoningTextContent = (reasoningTextContent != null ? reasoningTextContent : "") + part.text;
                reasoningPart.reasoning += part.text;
                reasoningPart.details.push({
                  type: "text",
                  text: part.text,
                  signature: part.signature
                });
                break;
              }
              case "redacted-reasoning": {
                if (reasoningPart == null) {
                  reasoningPart = {
                    type: "reasoning",
                    reasoning: "",
                    details: []
                  };
                  parts.push(reasoningPart);
                }
                reasoningPart.details.push({
                  type: "redacted",
                  data: part.data
                });
                break;
              }
              case "tool-call":
                break;
              case "file":
                if (part.data instanceof URL) {
                  throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError({
                    name: "InvalidAssistantFileData",
                    message: "File data cannot be a URL"
                  });
                }
                parts.push({
                  type: "file",
                  mimeType: part.mimeType,
                  data: convertDataContentToBase64String(part.data)
                });
                break;
            }
          }
        }
        if (isLastMessageAssistant) {
          const maxStep = (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.extractMaxToolInvocationStep)(
            lastMessage.toolInvocations
          );
          (_a17 = lastMessage.parts) != null ? _a17 : lastMessage.parts = [];
          lastMessage.content = textContent;
          lastMessage.reasoning = reasoningTextContent;
          lastMessage.parts.push(...parts);
          lastMessage.toolInvocations = [
            ...(_b = lastMessage.toolInvocations) != null ? _b : [],
            ...getToolInvocations2(maxStep === void 0 ? 0 : maxStep + 1)
          ];
          getToolInvocations2(maxStep === void 0 ? 0 : maxStep + 1).map((call) => ({
            type: "tool-invocation",
            toolInvocation: call
          })).forEach((part) => {
            lastMessage.parts.push(part);
          });
        } else {
          clonedMessages.push({
            role: "assistant",
            id: message.id,
            createdAt: currentDate(),
            // generate a createdAt date for the message, will be overridden by the client
            content: textContent,
            reasoning: reasoningTextContent,
            toolInvocations: getToolInvocations2(0),
            parts: [
              ...parts,
              ...getToolInvocations2(0).map((call) => ({
                type: "tool-invocation",
                toolInvocation: call
              }))
            ]
          });
        }
        break;
      }
      case "tool": {
        (_c = lastMessage.toolInvocations) != null ? _c : lastMessage.toolInvocations = [];
        if (lastMessage.role !== "assistant") {
          throw new Error(
            `Tool result must follow an assistant message: ${lastMessage.role}`
          );
        }
        (_d = lastMessage.parts) != null ? _d : lastMessage.parts = [];
        for (const contentPart of message.content) {
          const toolCall = lastMessage.toolInvocations.find(
            (call) => call.toolCallId === contentPart.toolCallId
          );
          const toolCallPart = lastMessage.parts.find(
            (part) => part.type === "tool-invocation" && part.toolInvocation.toolCallId === contentPart.toolCallId
          );
          if (!toolCall) {
            throw new Error("Tool call not found in previous message");
          }
          toolCall.state = "result";
          const toolResult = toolCall;
          toolResult.result = contentPart.result;
          if (toolCallPart) {
            toolCallPart.toolInvocation = toolResult;
          } else {
            lastMessage.parts.push({
              type: "tool-invocation",
              toolInvocation: toolResult
            });
          }
        }
        break;
      }
      default: {
        const _exhaustiveCheck = role;
        throw new Error(`Unsupported message role: ${_exhaustiveCheck}`);
      }
    }
  }
  return clonedMessages;
}

// core/registry/custom-provider.ts

function customProvider({
  languageModels,
  textEmbeddingModels,
  imageModels,
  fallbackProvider
}) {
  return {
    languageModel(modelId) {
      if (languageModels != null && modelId in languageModels) {
        return languageModels[modelId];
      }
      if (fallbackProvider) {
        return fallbackProvider.languageModel(modelId);
      }
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.NoSuchModelError({ modelId, modelType: "languageModel" });
    },
    textEmbeddingModel(modelId) {
      if (textEmbeddingModels != null && modelId in textEmbeddingModels) {
        return textEmbeddingModels[modelId];
      }
      if (fallbackProvider) {
        return fallbackProvider.textEmbeddingModel(modelId);
      }
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.NoSuchModelError({ modelId, modelType: "textEmbeddingModel" });
    },
    imageModel(modelId) {
      if (imageModels != null && modelId in imageModels) {
        return imageModels[modelId];
      }
      if (fallbackProvider == null ? void 0 : fallbackProvider.imageModel) {
        return fallbackProvider.imageModel(modelId);
      }
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.NoSuchModelError({ modelId, modelType: "imageModel" });
    }
  };
}
var experimental_customProvider = customProvider;

// core/registry/no-such-provider-error.ts

var name16 = "AI_NoSuchProviderError";
var marker16 = `vercel.ai.error.${name16}`;
var symbol16 = Symbol.for(marker16);
var _a16;
var NoSuchProviderError = class extends _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.NoSuchModelError {
  constructor({
    modelId,
    modelType,
    providerId,
    availableProviders,
    message = `No such provider: ${providerId} (available providers: ${availableProviders.join()})`
  }) {
    super({ errorName: name16, modelId, modelType, message });
    this[_a16] = true;
    this.providerId = providerId;
    this.availableProviders = availableProviders;
  }
  static isInstance(error) {
    return _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.AISDKError.hasMarker(error, marker16);
  }
};
_a16 = symbol16;

// core/registry/provider-registry.ts

function createProviderRegistry(providers, {
  separator = ":"
} = {}) {
  const registry = new DefaultProviderRegistry({
    separator
  });
  for (const [id, provider] of Object.entries(providers)) {
    registry.registerProvider({ id, provider });
  }
  return registry;
}
var experimental_createProviderRegistry = createProviderRegistry;
var DefaultProviderRegistry = class {
  constructor({ separator }) {
    this.providers = {};
    this.separator = separator;
  }
  registerProvider({
    id,
    provider
  }) {
    this.providers[id] = provider;
  }
  getProvider(id) {
    const provider = this.providers[id];
    if (provider == null) {
      throw new NoSuchProviderError({
        modelId: id,
        modelType: "languageModel",
        providerId: id,
        availableProviders: Object.keys(this.providers)
      });
    }
    return provider;
  }
  splitId(id, modelType) {
    const index = id.indexOf(this.separator);
    if (index === -1) {
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.NoSuchModelError({
        modelId: id,
        modelType,
        message: `Invalid ${modelType} id for registry: ${id} (must be in the format "providerId${this.separator}modelId")`
      });
    }
    return [id.slice(0, index), id.slice(index + this.separator.length)];
  }
  languageModel(id) {
    var _a17, _b;
    const [providerId, modelId] = this.splitId(id, "languageModel");
    const model = (_b = (_a17 = this.getProvider(providerId)).languageModel) == null ? void 0 : _b.call(_a17, modelId);
    if (model == null) {
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.NoSuchModelError({ modelId: id, modelType: "languageModel" });
    }
    return model;
  }
  textEmbeddingModel(id) {
    var _a17;
    const [providerId, modelId] = this.splitId(id, "textEmbeddingModel");
    const provider = this.getProvider(providerId);
    const model = (_a17 = provider.textEmbeddingModel) == null ? void 0 : _a17.call(provider, modelId);
    if (model == null) {
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.NoSuchModelError({
        modelId: id,
        modelType: "textEmbeddingModel"
      });
    }
    return model;
  }
  imageModel(id) {
    var _a17;
    const [providerId, modelId] = this.splitId(id, "imageModel");
    const provider = this.getProvider(providerId);
    const model = (_a17 = provider.imageModel) == null ? void 0 : _a17.call(provider, modelId);
    if (model == null) {
      throw new _ai_sdk_provider__WEBPACK_IMPORTED_MODULE_1__.NoSuchModelError({ modelId: id, modelType: "imageModel" });
    }
    return model;
  }
};

// core/tool/mcp/mcp-client.ts


// core/tool/tool.ts
function tool(tool2) {
  return tool2;
}

// core/tool/mcp/mcp-sse-transport.ts


// core/tool/mcp/json-rpc-message.ts


// core/tool/mcp/types.ts

var LATEST_PROTOCOL_VERSION = "2024-11-05";
var SUPPORTED_PROTOCOL_VERSIONS = [
  LATEST_PROTOCOL_VERSION,
  "2024-10-07"
];
var ClientOrServerImplementationSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  name: zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
  version: zod__WEBPACK_IMPORTED_MODULE_5__.z.string()
}).passthrough();
var BaseParamsSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  _meta: zod__WEBPACK_IMPORTED_MODULE_5__.z.optional(zod__WEBPACK_IMPORTED_MODULE_5__.z.object({}).passthrough())
}).passthrough();
var ResultSchema = BaseParamsSchema;
var RequestSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  method: zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
  params: zod__WEBPACK_IMPORTED_MODULE_5__.z.optional(BaseParamsSchema)
});
var ServerCapabilitiesSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  experimental: zod__WEBPACK_IMPORTED_MODULE_5__.z.optional(zod__WEBPACK_IMPORTED_MODULE_5__.z.object({}).passthrough()),
  logging: zod__WEBPACK_IMPORTED_MODULE_5__.z.optional(zod__WEBPACK_IMPORTED_MODULE_5__.z.object({}).passthrough()),
  prompts: zod__WEBPACK_IMPORTED_MODULE_5__.z.optional(
    zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
      listChanged: zod__WEBPACK_IMPORTED_MODULE_5__.z.optional(zod__WEBPACK_IMPORTED_MODULE_5__.z.boolean())
    }).passthrough()
  ),
  resources: zod__WEBPACK_IMPORTED_MODULE_5__.z.optional(
    zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
      subscribe: zod__WEBPACK_IMPORTED_MODULE_5__.z.optional(zod__WEBPACK_IMPORTED_MODULE_5__.z.boolean()),
      listChanged: zod__WEBPACK_IMPORTED_MODULE_5__.z.optional(zod__WEBPACK_IMPORTED_MODULE_5__.z.boolean())
    }).passthrough()
  ),
  tools: zod__WEBPACK_IMPORTED_MODULE_5__.z.optional(
    zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
      listChanged: zod__WEBPACK_IMPORTED_MODULE_5__.z.optional(zod__WEBPACK_IMPORTED_MODULE_5__.z.boolean())
    }).passthrough()
  )
}).passthrough();
var InitializeResultSchema = ResultSchema.extend({
  protocolVersion: zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
  capabilities: ServerCapabilitiesSchema,
  serverInfo: ClientOrServerImplementationSchema,
  instructions: zod__WEBPACK_IMPORTED_MODULE_5__.z.optional(zod__WEBPACK_IMPORTED_MODULE_5__.z.string())
});
var PaginatedResultSchema = ResultSchema.extend({
  nextCursor: zod__WEBPACK_IMPORTED_MODULE_5__.z.optional(zod__WEBPACK_IMPORTED_MODULE_5__.z.string())
});
var ToolSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  name: zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
  description: zod__WEBPACK_IMPORTED_MODULE_5__.z.optional(zod__WEBPACK_IMPORTED_MODULE_5__.z.string()),
  inputSchema: zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
    type: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal("object"),
    properties: zod__WEBPACK_IMPORTED_MODULE_5__.z.optional(zod__WEBPACK_IMPORTED_MODULE_5__.z.object({}).passthrough())
  }).passthrough()
}).passthrough();
var ListToolsResultSchema = PaginatedResultSchema.extend({
  tools: zod__WEBPACK_IMPORTED_MODULE_5__.z.array(ToolSchema)
});
var TextContentSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  type: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal("text"),
  text: zod__WEBPACK_IMPORTED_MODULE_5__.z.string()
}).passthrough();
var ImageContentSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  type: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal("image"),
  data: zod__WEBPACK_IMPORTED_MODULE_5__.z.string().base64(),
  mimeType: zod__WEBPACK_IMPORTED_MODULE_5__.z.string()
}).passthrough();
var ResourceContentsSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  /**
   * The URI of this resource.
   */
  uri: zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: zod__WEBPACK_IMPORTED_MODULE_5__.z.optional(zod__WEBPACK_IMPORTED_MODULE_5__.z.string())
}).passthrough();
var TextResourceContentsSchema = ResourceContentsSchema.extend({
  text: zod__WEBPACK_IMPORTED_MODULE_5__.z.string()
});
var BlobResourceContentsSchema = ResourceContentsSchema.extend({
  blob: zod__WEBPACK_IMPORTED_MODULE_5__.z.string().base64()
});
var EmbeddedResourceSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  type: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal("resource"),
  resource: zod__WEBPACK_IMPORTED_MODULE_5__.z.union([TextResourceContentsSchema, BlobResourceContentsSchema])
}).passthrough();
var CallToolResultSchema = ResultSchema.extend({
  content: zod__WEBPACK_IMPORTED_MODULE_5__.z.array(
    zod__WEBPACK_IMPORTED_MODULE_5__.z.union([TextContentSchema, ImageContentSchema, EmbeddedResourceSchema])
  ),
  isError: zod__WEBPACK_IMPORTED_MODULE_5__.z.boolean().default(false).optional()
}).or(
  ResultSchema.extend({
    toolResult: zod__WEBPACK_IMPORTED_MODULE_5__.z.unknown()
  })
);

// core/tool/mcp/json-rpc-message.ts
var JSONRPC_VERSION = "2.0";
var JSONRPCRequestSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  jsonrpc: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal(JSONRPC_VERSION),
  id: zod__WEBPACK_IMPORTED_MODULE_5__.z.union([zod__WEBPACK_IMPORTED_MODULE_5__.z.string(), zod__WEBPACK_IMPORTED_MODULE_5__.z.number().int()])
}).merge(RequestSchema).strict();
var JSONRPCResponseSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  jsonrpc: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal(JSONRPC_VERSION),
  id: zod__WEBPACK_IMPORTED_MODULE_5__.z.union([zod__WEBPACK_IMPORTED_MODULE_5__.z.string(), zod__WEBPACK_IMPORTED_MODULE_5__.z.number().int()]),
  result: ResultSchema
}).strict();
var JSONRPCErrorSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  jsonrpc: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal(JSONRPC_VERSION),
  id: zod__WEBPACK_IMPORTED_MODULE_5__.z.union([zod__WEBPACK_IMPORTED_MODULE_5__.z.string(), zod__WEBPACK_IMPORTED_MODULE_5__.z.number().int()]),
  error: zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
    code: zod__WEBPACK_IMPORTED_MODULE_5__.z.number().int(),
    message: zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
    data: zod__WEBPACK_IMPORTED_MODULE_5__.z.optional(zod__WEBPACK_IMPORTED_MODULE_5__.z.unknown())
  })
}).strict();
var JSONRPCNotificationSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
  jsonrpc: zod__WEBPACK_IMPORTED_MODULE_5__.z.literal(JSONRPC_VERSION)
}).merge(
  zod__WEBPACK_IMPORTED_MODULE_5__.z.object({
    method: zod__WEBPACK_IMPORTED_MODULE_5__.z.string(),
    params: zod__WEBPACK_IMPORTED_MODULE_5__.z.optional(BaseParamsSchema)
  })
).strict();
var JSONRPCMessageSchema = zod__WEBPACK_IMPORTED_MODULE_5__.z.union([
  JSONRPCRequestSchema,
  JSONRPCNotificationSchema,
  JSONRPCResponseSchema,
  JSONRPCErrorSchema
]);

// core/tool/mcp/mcp-sse-transport.ts
var SseMCPTransport = class {
  constructor({
    url,
    headers
  }) {
    this.connected = false;
    this.url = new URL(url);
    this.headers = headers;
  }
  async start() {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        return resolve();
      }
      this.abortController = new AbortController();
      const establishConnection = async () => {
        var _a17, _b, _c;
        try {
          const headers = new Headers(this.headers);
          headers.set("Accept", "text/event-stream");
          const response = await fetch(this.url.href, {
            headers,
            signal: (_a17 = this.abortController) == null ? void 0 : _a17.signal
          });
          if (!response.ok || !response.body) {
            const error = new MCPClientError({
              message: `MCP SSE Transport Error: ${response.status} ${response.statusText}`
            });
            (_b = this.onerror) == null ? void 0 : _b.call(this, error);
            return reject(error);
          }
          const stream = response.body.pipeThrough(new TextDecoderStream()).pipeThrough((0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.createEventSourceParserStream)());
          const reader = stream.getReader();
          const processEvents = async () => {
            var _a18, _b2, _c2;
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  if (this.connected) {
                    this.connected = false;
                    throw new MCPClientError({
                      message: "MCP SSE Transport Error: Connection closed unexpectedly"
                    });
                  }
                  return;
                }
                const { event, data } = value;
                if (event === "endpoint") {
                  this.endpoint = new URL(data, this.url);
                  if (this.endpoint.origin !== this.url.origin) {
                    throw new MCPClientError({
                      message: `MCP SSE Transport Error: Endpoint origin does not match connection origin: ${this.endpoint.origin}`
                    });
                  }
                  this.connected = true;
                  resolve();
                } else if (event === "message") {
                  try {
                    const message = JSONRPCMessageSchema.parse(
                      JSON.parse(data)
                    );
                    (_a18 = this.onmessage) == null ? void 0 : _a18.call(this, message);
                  } catch (error) {
                    const e = new MCPClientError({
                      message: "MCP SSE Transport Error: Failed to parse message",
                      cause: error
                    });
                    (_b2 = this.onerror) == null ? void 0 : _b2.call(this, e);
                  }
                }
              }
            } catch (error) {
              if (error instanceof Error && error.name === "AbortError") {
                return;
              }
              (_c2 = this.onerror) == null ? void 0 : _c2.call(this, error);
              reject(error);
            }
          };
          this.sseConnection = {
            close: () => reader.cancel()
          };
          processEvents();
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }
          (_c = this.onerror) == null ? void 0 : _c.call(this, error);
          reject(error);
        }
      };
      establishConnection();
    });
  }
  async close() {
    var _a17, _b, _c;
    this.connected = false;
    (_a17 = this.sseConnection) == null ? void 0 : _a17.close();
    (_b = this.abortController) == null ? void 0 : _b.abort();
    (_c = this.onclose) == null ? void 0 : _c.call(this);
  }
  async send(message) {
    var _a17, _b, _c;
    if (!this.endpoint || !this.connected) {
      throw new MCPClientError({
        message: "MCP SSE Transport Error: Not connected"
      });
    }
    try {
      const headers = new Headers(this.headers);
      headers.set("Content-Type", "application/json");
      const init = {
        method: "POST",
        headers,
        body: JSON.stringify(message),
        signal: (_a17 = this.abortController) == null ? void 0 : _a17.signal
      };
      const response = await fetch(this.endpoint, init);
      if (!response.ok) {
        const text2 = await response.text().catch(() => null);
        const error = new MCPClientError({
          message: `MCP SSE Transport Error: POSTing to endpoint (HTTP ${response.status}): ${text2}`
        });
        (_b = this.onerror) == null ? void 0 : _b.call(this, error);
        return;
      }
    } catch (error) {
      (_c = this.onerror) == null ? void 0 : _c.call(this, error);
      return;
    }
  }
};

// core/tool/mcp/mcp-transport.ts
function createMcpTransport(config) {
  if (config.type !== "sse") {
    throw new MCPClientError({
      message: "Unsupported or invalid transport configuration. If you are using a custom transport, make sure it implements the MCPTransport interface."
    });
  }
  return new SseMCPTransport(config);
}
function isCustomMcpTransport(transport) {
  return "start" in transport && typeof transport.start === "function" && "send" in transport && typeof transport.send === "function" && "close" in transport && typeof transport.close === "function";
}

// core/tool/mcp/mcp-client.ts
var CLIENT_VERSION = "1.0.0";
async function createMCPClient(config) {
  const client = new MCPClient(config);
  await client.init();
  return client;
}
var MCPClient = class {
  constructor({
    transport: transportConfig,
    name: name17 = "ai-sdk-mcp-client",
    onUncaughtError
  }) {
    this.requestMessageId = 0;
    this.responseHandlers = /* @__PURE__ */ new Map();
    this.serverCapabilities = {};
    this.isClosed = true;
    this.onUncaughtError = onUncaughtError;
    if (isCustomMcpTransport(transportConfig)) {
      this.transport = transportConfig;
    } else {
      this.transport = createMcpTransport(transportConfig);
    }
    this.transport.onclose = () => this.onClose();
    this.transport.onerror = (error) => this.onError(error);
    this.transport.onmessage = (message) => {
      if ("method" in message) {
        this.onError(
          new MCPClientError({
            message: "Unsupported message type"
          })
        );
        return;
      }
      this.onResponse(message);
    };
    this.clientInfo = {
      name: name17,
      version: CLIENT_VERSION
    };
  }
  async init() {
    try {
      await this.transport.start();
      this.isClosed = false;
      const result = await this.request({
        request: {
          method: "initialize",
          params: {
            protocolVersion: LATEST_PROTOCOL_VERSION,
            capabilities: {},
            clientInfo: this.clientInfo
          }
        },
        resultSchema: InitializeResultSchema
      });
      if (result === void 0) {
        throw new MCPClientError({
          message: "Server sent invalid initialize result"
        });
      }
      if (!SUPPORTED_PROTOCOL_VERSIONS.includes(result.protocolVersion)) {
        throw new MCPClientError({
          message: `Server's protocol version is not supported: ${result.protocolVersion}`
        });
      }
      this.serverCapabilities = result.capabilities;
      await this.notification({
        method: "notifications/initialized"
      });
      return this;
    } catch (error) {
      await this.close();
      throw error;
    }
  }
  async close() {
    var _a17;
    if (this.isClosed)
      return;
    await ((_a17 = this.transport) == null ? void 0 : _a17.close());
    this.onClose();
  }
  assertCapability(method) {
    switch (method) {
      case "initialize":
        break;
      case "tools/list":
      case "tools/call":
        if (!this.serverCapabilities.tools) {
          throw new MCPClientError({
            message: `Server does not support tools`
          });
        }
        break;
      default:
        throw new MCPClientError({
          message: `Unsupported method: ${method}`
        });
    }
  }
  async request({
    request,
    resultSchema,
    options
  }) {
    return new Promise((resolve, reject) => {
      if (this.isClosed) {
        return reject(
          new MCPClientError({
            message: "Attempted to send a request from a closed client"
          })
        );
      }
      this.assertCapability(request.method);
      const signal = options == null ? void 0 : options.signal;
      signal == null ? void 0 : signal.throwIfAborted();
      const messageId = this.requestMessageId++;
      const jsonrpcRequest = {
        ...request,
        jsonrpc: "2.0",
        id: messageId
      };
      const cleanup = () => {
        this.responseHandlers.delete(messageId);
      };
      this.responseHandlers.set(messageId, (response) => {
        if (signal == null ? void 0 : signal.aborted) {
          return reject(
            new MCPClientError({
              message: "Request was aborted",
              cause: signal.reason
            })
          );
        }
        if (response instanceof Error) {
          return reject(response);
        }
        try {
          const result = resultSchema.parse(response.result);
          resolve(result);
        } catch (error) {
          const parseError = new MCPClientError({
            message: "Failed to parse server response",
            cause: error
          });
          reject(parseError);
        }
      });
      this.transport.send(jsonrpcRequest).catch((error) => {
        cleanup();
        reject(error);
      });
    });
  }
  async listTools({
    params,
    options
  } = {}) {
    try {
      return this.request({
        request: { method: "tools/list", params },
        resultSchema: ListToolsResultSchema,
        options
      });
    } catch (error) {
      throw error;
    }
  }
  async callTool({
    name: name17,
    args,
    options
  }) {
    try {
      return this.request({
        request: { method: "tools/call", params: { name: name17, arguments: args } },
        resultSchema: CallToolResultSchema,
        options: {
          signal: options == null ? void 0 : options.abortSignal
        }
      });
    } catch (error) {
      throw error;
    }
  }
  async notification(notification) {
    const jsonrpcNotification = {
      ...notification,
      jsonrpc: "2.0"
    };
    await this.transport.send(jsonrpcNotification);
  }
  /**
   * Returns a set of AI SDK tools from the MCP server
   * @returns A record of tool names to their implementations
   */
  async tools({
    schemas = "automatic"
  } = {}) {
    var _a17;
    const tools = {};
    try {
      const listToolsResult = await this.listTools();
      for (const { name: name17, description, inputSchema } of listToolsResult.tools) {
        if (schemas !== "automatic" && !(name17 in schemas)) {
          continue;
        }
        const parameters = schemas === "automatic" ? (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.jsonSchema)({
          ...inputSchema,
          properties: (_a17 = inputSchema.properties) != null ? _a17 : {},
          additionalProperties: false
        }) : schemas[name17].parameters;
        const self = this;
        const toolWithExecute = tool({
          description,
          parameters,
          execute: async (args, options) => {
            var _a18;
            (_a18 = options == null ? void 0 : options.abortSignal) == null ? void 0 : _a18.throwIfAborted();
            return self.callTool({
              name: name17,
              args,
              options
            });
          }
        });
        tools[name17] = toolWithExecute;
      }
      return tools;
    } catch (error) {
      throw error;
    }
  }
  onClose() {
    if (this.isClosed)
      return;
    this.isClosed = true;
    const error = new MCPClientError({
      message: "Connection closed"
    });
    for (const handler of this.responseHandlers.values()) {
      handler(error);
    }
    this.responseHandlers.clear();
  }
  onError(error) {
    if (this.onUncaughtError) {
      this.onUncaughtError(error);
    }
  }
  onResponse(response) {
    const messageId = Number(response.id);
    const handler = this.responseHandlers.get(messageId);
    if (handler === void 0) {
      throw new MCPClientError({
        message: `Protocol error: Received a response for an unknown message ID: ${JSON.stringify(
          response
        )}`
      });
    }
    this.responseHandlers.delete(messageId);
    handler(
      "result" in response ? response : new MCPClientError({
        message: response.error.message,
        cause: response.error
      })
    );
  }
};

// core/util/cosine-similarity.ts
function cosineSimilarity(vector1, vector2, options) {
  if (vector1.length !== vector2.length) {
    throw new InvalidArgumentError({
      parameter: "vector1,vector2",
      value: { vector1Length: vector1.length, vector2Length: vector2.length },
      message: `Vectors must have the same length`
    });
  }
  const n = vector1.length;
  if (n === 0) {
    if (options == null ? void 0 : options.throwErrorForEmptyVectors) {
      throw new InvalidArgumentError({
        parameter: "vector1",
        value: vector1,
        message: "Vectors cannot be empty"
      });
    }
    return 0;
  }
  let magnitudeSquared1 = 0;
  let magnitudeSquared2 = 0;
  let dotProduct = 0;
  for (let i = 0; i < n; i++) {
    const value1 = vector1[i];
    const value2 = vector2[i];
    magnitudeSquared1 += value1 * value1;
    magnitudeSquared2 += value2 * value2;
    dotProduct += value1 * value2;
  }
  return magnitudeSquared1 === 0 || magnitudeSquared2 === 0 ? 0 : dotProduct / (Math.sqrt(magnitudeSquared1) * Math.sqrt(magnitudeSquared2));
}

// core/util/simulate-readable-stream.ts

function simulateReadableStream({
  chunks,
  initialDelayInMs = 0,
  chunkDelayInMs = 0,
  _internal
}) {
  var _a17;
  const delay2 = (_a17 = _internal == null ? void 0 : _internal.delay) != null ? _a17 : _ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.delay;
  let index = 0;
  return new ReadableStream({
    async pull(controller) {
      if (index < chunks.length) {
        await delay2(index === 0 ? initialDelayInMs : chunkDelayInMs);
        controller.enqueue(chunks[index++]);
      } else {
        controller.close();
      }
    }
  });
}

// streams/assistant-response.ts

function AssistantResponse({ threadId, messageId }, process2) {
  const stream = new ReadableStream({
    async start(controller) {
      var _a17;
      const textEncoder = new TextEncoder();
      const sendMessage = (message) => {
        controller.enqueue(
          textEncoder.encode(
            (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatAssistantStreamPart)("assistant_message", message)
          )
        );
      };
      const sendDataMessage = (message) => {
        controller.enqueue(
          textEncoder.encode(
            (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatAssistantStreamPart)("data_message", message)
          )
        );
      };
      const sendError = (errorMessage) => {
        controller.enqueue(
          textEncoder.encode((0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatAssistantStreamPart)("error", errorMessage))
        );
      };
      const forwardStream = async (stream2) => {
        var _a18, _b;
        let result = void 0;
        for await (const value of stream2) {
          switch (value.event) {
            case "thread.message.created": {
              controller.enqueue(
                textEncoder.encode(
                  (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatAssistantStreamPart)("assistant_message", {
                    id: value.data.id,
                    role: "assistant",
                    content: [{ type: "text", text: { value: "" } }]
                  })
                )
              );
              break;
            }
            case "thread.message.delta": {
              const content = (_a18 = value.data.delta.content) == null ? void 0 : _a18[0];
              if ((content == null ? void 0 : content.type) === "text" && ((_b = content.text) == null ? void 0 : _b.value) != null) {
                controller.enqueue(
                  textEncoder.encode(
                    (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatAssistantStreamPart)("text", content.text.value)
                  )
                );
              }
              break;
            }
            case "thread.run.completed":
            case "thread.run.requires_action": {
              result = value.data;
              break;
            }
          }
        }
        return result;
      };
      controller.enqueue(
        textEncoder.encode(
          (0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatAssistantStreamPart)("assistant_control_data", {
            threadId,
            messageId
          })
        )
      );
      try {
        await process2({
          sendMessage,
          sendDataMessage,
          forwardStream
        });
      } catch (error) {
        sendError((_a17 = error.message) != null ? _a17 : `${error}`);
      } finally {
        controller.close();
      }
    },
    pull(controller) {
    },
    cancel() {
    }
  });
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}

// streams/langchain-adapter.ts
var langchain_adapter_exports = {};
__export(langchain_adapter_exports, {
  mergeIntoDataStream: () => mergeIntoDataStream,
  toDataStream: () => toDataStream,
  toDataStreamResponse: () => toDataStreamResponse
});


// streams/stream-callbacks.ts
function createCallbacksTransformer(callbacks = {}) {
  const textEncoder = new TextEncoder();
  let aggregatedResponse = "";
  return new TransformStream({
    async start() {
      if (callbacks.onStart)
        await callbacks.onStart();
    },
    async transform(message, controller) {
      controller.enqueue(textEncoder.encode(message));
      aggregatedResponse += message;
      if (callbacks.onToken)
        await callbacks.onToken(message);
      if (callbacks.onText && typeof message === "string") {
        await callbacks.onText(message);
      }
    },
    async flush() {
      if (callbacks.onCompletion) {
        await callbacks.onCompletion(aggregatedResponse);
      }
      if (callbacks.onFinal) {
        await callbacks.onFinal(aggregatedResponse);
      }
    }
  });
}

// streams/langchain-adapter.ts
function toDataStreamInternal(stream, callbacks) {
  return stream.pipeThrough(
    new TransformStream({
      transform: async (value, controller) => {
        var _a17;
        if (typeof value === "string") {
          controller.enqueue(value);
          return;
        }
        if ("event" in value) {
          if (value.event === "on_chat_model_stream") {
            forwardAIMessageChunk(
              (_a17 = value.data) == null ? void 0 : _a17.chunk,
              controller
            );
          }
          return;
        }
        forwardAIMessageChunk(value, controller);
      }
    })
  ).pipeThrough(createCallbacksTransformer(callbacks)).pipeThrough(new TextDecoderStream()).pipeThrough(
    new TransformStream({
      transform: async (chunk, controller) => {
        controller.enqueue((0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("text", chunk));
      }
    })
  );
}
function toDataStream(stream, callbacks) {
  return toDataStreamInternal(stream, callbacks).pipeThrough(
    new TextEncoderStream()
  );
}
function toDataStreamResponse(stream, options) {
  var _a17;
  const dataStream = toDataStreamInternal(
    stream,
    options == null ? void 0 : options.callbacks
  ).pipeThrough(new TextEncoderStream());
  const data = options == null ? void 0 : options.data;
  const init = options == null ? void 0 : options.init;
  const responseStream = data ? mergeStreams(data.stream, dataStream) : dataStream;
  return new Response(responseStream, {
    status: (_a17 = init == null ? void 0 : init.status) != null ? _a17 : 200,
    statusText: init == null ? void 0 : init.statusText,
    headers: prepareResponseHeaders(init == null ? void 0 : init.headers, {
      contentType: "text/plain; charset=utf-8",
      dataStreamVersion: "v1"
    })
  });
}
function mergeIntoDataStream(stream, options) {
  options.dataStream.merge(toDataStreamInternal(stream, options.callbacks));
}
function forwardAIMessageChunk(chunk, controller) {
  if (typeof chunk.content === "string") {
    controller.enqueue(chunk.content);
  } else {
    const content = chunk.content;
    for (const item of content) {
      if (item.type === "text") {
        controller.enqueue(item.text);
      }
    }
  }
}

// streams/llamaindex-adapter.ts
var llamaindex_adapter_exports = {};
__export(llamaindex_adapter_exports, {
  mergeIntoDataStream: () => mergeIntoDataStream2,
  toDataStream: () => toDataStream2,
  toDataStreamResponse: () => toDataStreamResponse2
});


function toDataStreamInternal2(stream, callbacks) {
  const trimStart = trimStartOfStream();
  return (0,_ai_sdk_provider_utils__WEBPACK_IMPORTED_MODULE_2__.convertAsyncIteratorToReadableStream)(stream[Symbol.asyncIterator]()).pipeThrough(
    new TransformStream({
      async transform(message, controller) {
        controller.enqueue(trimStart(message.delta));
      }
    })
  ).pipeThrough(createCallbacksTransformer(callbacks)).pipeThrough(new TextDecoderStream()).pipeThrough(
    new TransformStream({
      transform: async (chunk, controller) => {
        controller.enqueue((0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("text", chunk));
      }
    })
  );
}
function toDataStream2(stream, callbacks) {
  return toDataStreamInternal2(stream, callbacks).pipeThrough(
    new TextEncoderStream()
  );
}
function toDataStreamResponse2(stream, options = {}) {
  var _a17;
  const { init, data, callbacks } = options;
  const dataStream = toDataStreamInternal2(stream, callbacks).pipeThrough(
    new TextEncoderStream()
  );
  const responseStream = data ? mergeStreams(data.stream, dataStream) : dataStream;
  return new Response(responseStream, {
    status: (_a17 = init == null ? void 0 : init.status) != null ? _a17 : 200,
    statusText: init == null ? void 0 : init.statusText,
    headers: prepareResponseHeaders(init == null ? void 0 : init.headers, {
      contentType: "text/plain; charset=utf-8",
      dataStreamVersion: "v1"
    })
  });
}
function mergeIntoDataStream2(stream, options) {
  options.dataStream.merge(toDataStreamInternal2(stream, options.callbacks));
}
function trimStartOfStream() {
  let isStreamStart = true;
  return (text2) => {
    if (isStreamStart) {
      text2 = text2.trimStart();
      if (text2)
        isStreamStart = false;
    }
    return text2;
  };
}

// streams/stream-data.ts


// util/constants.ts
var HANGING_STREAM_WARNING_TIME_MS = 15 * 1e3;

// streams/stream-data.ts
var StreamData = class {
  constructor() {
    this.encoder = new TextEncoder();
    this.controller = null;
    this.isClosed = false;
    this.warningTimeout = null;
    const self = this;
    this.stream = new ReadableStream({
      start: async (controller) => {
        self.controller = controller;
        if (true) {
          self.warningTimeout = setTimeout(() => {
            console.warn(
              "The data stream is hanging. Did you forget to close it with `data.close()`?"
            );
          }, HANGING_STREAM_WARNING_TIME_MS);
        }
      },
      pull: (controller) => {
      },
      cancel: (reason) => {
        this.isClosed = true;
      }
    });
  }
  async close() {
    if (this.isClosed) {
      throw new Error("Data Stream has already been closed.");
    }
    if (!this.controller) {
      throw new Error("Stream controller is not initialized.");
    }
    this.controller.close();
    this.isClosed = true;
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
    }
  }
  append(value) {
    if (this.isClosed) {
      throw new Error("Data Stream has already been closed.");
    }
    if (!this.controller) {
      throw new Error("Stream controller is not initialized.");
    }
    this.controller.enqueue(
      this.encoder.encode((0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("data", [value]))
    );
  }
  appendMessageAnnotation(value) {
    if (this.isClosed) {
      throw new Error("Data Stream has already been closed.");
    }
    if (!this.controller) {
      throw new Error("Stream controller is not initialized.");
    }
    this.controller.enqueue(
      this.encoder.encode((0,_ai_sdk_ui_utils__WEBPACK_IMPORTED_MODULE_0__.formatDataStreamPart)("message_annotations", [value]))
    );
  }
};

//# sourceMappingURL=index.mjs.map

/***/ }),

/***/ "./node_modules/nanoid/non-secure/index.js":
/*!*************************************************!*\
  !*** ./node_modules/nanoid/non-secure/index.js ***!
  \*************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   customAlphabet: () => (/* binding */ customAlphabet),
/* harmony export */   nanoid: () => (/* binding */ nanoid)
/* harmony export */ });
let urlAlphabet =
  'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict'
let customAlphabet = (alphabet, defaultSize = 21) => {
  return (size = defaultSize) => {
    let id = ''
    let i = size | 0
    while (i--) {
      id += alphabet[(Math.random() * alphabet.length) | 0]
    }
    return id
  }
}
let nanoid = (size = 21) => {
  let id = ''
  let i = size | 0
  while (i--) {
    id += urlAlphabet[(Math.random() * 64) | 0]
  }
  return id
}



/***/ }),

/***/ "./node_modules/secure-json-parse/index.js":
/*!*************************************************!*\
  !*** ./node_modules/secure-json-parse/index.js ***!
  \*************************************************/
/***/ ((module) => {



const hasBuffer = typeof Buffer !== 'undefined'
const suspectProtoRx = /"(?:_|\\u005[Ff])(?:_|\\u005[Ff])(?:p|\\u0070)(?:r|\\u0072)(?:o|\\u006[Ff])(?:t|\\u0074)(?:o|\\u006[Ff])(?:_|\\u005[Ff])(?:_|\\u005[Ff])"\s*:/
const suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/

function _parse (text, reviver, options) {
  // Normalize arguments
  if (options == null) {
    if (reviver !== null && typeof reviver === 'object') {
      options = reviver
      reviver = undefined
    }
  }

  if (hasBuffer && Buffer.isBuffer(text)) {
    text = text.toString()
  }

  // BOM checker
  if (text && text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1)
  }

  // Parse normally, allowing exceptions
  const obj = JSON.parse(text, reviver)

  // Ignore null and non-objects
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  const protoAction = (options && options.protoAction) || 'error'
  const constructorAction = (options && options.constructorAction) || 'error'

  // options: 'error' (default) / 'remove' / 'ignore'
  if (protoAction === 'ignore' && constructorAction === 'ignore') {
    return obj
  }

  if (protoAction !== 'ignore' && constructorAction !== 'ignore') {
    if (suspectProtoRx.test(text) === false && suspectConstructorRx.test(text) === false) {
      return obj
    }
  } else if (protoAction !== 'ignore' && constructorAction === 'ignore') {
    if (suspectProtoRx.test(text) === false) {
      return obj
    }
  } else {
    if (suspectConstructorRx.test(text) === false) {
      return obj
    }
  }

  // Scan result for proto keys
  return filter(obj, { protoAction, constructorAction, safe: options && options.safe })
}

function filter (obj, { protoAction = 'error', constructorAction = 'error', safe } = {}) {
  let next = [obj]

  while (next.length) {
    const nodes = next
    next = []

    for (const node of nodes) {
      if (protoAction !== 'ignore' && Object.prototype.hasOwnProperty.call(node, '__proto__')) { // Avoid calling node.hasOwnProperty directly
        if (safe === true) {
          return null
        } else if (protoAction === 'error') {
          throw new SyntaxError('Object contains forbidden prototype property')
        }

        delete node.__proto__ // eslint-disable-line no-proto
      }

      if (constructorAction !== 'ignore' &&
          Object.prototype.hasOwnProperty.call(node, 'constructor') &&
          Object.prototype.hasOwnProperty.call(node.constructor, 'prototype')) { // Avoid calling node.hasOwnProperty directly
        if (safe === true) {
          return null
        } else if (constructorAction === 'error') {
          throw new SyntaxError('Object contains forbidden prototype property')
        }

        delete node.constructor
      }

      for (const key in node) {
        const value = node[key]
        if (value && typeof value === 'object') {
          next.push(value)
        }
      }
    }
  }
  return obj
}

function parse (text, reviver, options) {
  const stackTraceLimit = Error.stackTraceLimit
  Error.stackTraceLimit = 0
  try {
    return _parse(text, reviver, options)
  } finally {
    Error.stackTraceLimit = stackTraceLimit
  }
}

function safeParse (text, reviver) {
  const stackTraceLimit = Error.stackTraceLimit
  Error.stackTraceLimit = 0
  try {
    return _parse(text, reviver, { safe: true })
  } catch (_e) {
    return null
  } finally {
    Error.stackTraceLimit = stackTraceLimit
  }
}

module.exports = parse
module.exports["default"] = parse
module.exports.parse = parse
module.exports.safeParse = safeParse
module.exports.scan = filter


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/Options.js":
/*!*************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/Options.js ***!
  \*************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   defaultOptions: () => (/* binding */ defaultOptions),
/* harmony export */   getDefaultOptions: () => (/* binding */ getDefaultOptions),
/* harmony export */   ignoreOverride: () => (/* binding */ ignoreOverride),
/* harmony export */   jsonDescription: () => (/* binding */ jsonDescription)
/* harmony export */ });
const ignoreOverride = Symbol("Let zodToJsonSchema decide on which parser to use");
const jsonDescription = (jsonSchema, def) => {
    if (def.description) {
        try {
            return {
                ...jsonSchema,
                ...JSON.parse(def.description),
            };
        }
        catch { }
    }
    return jsonSchema;
};
const defaultOptions = {
    name: undefined,
    $refStrategy: "root",
    basePath: ["#"],
    effectStrategy: "input",
    pipeStrategy: "all",
    dateStrategy: "format:date-time",
    mapStrategy: "entries",
    removeAdditionalStrategy: "passthrough",
    allowedAdditionalProperties: true,
    rejectedAdditionalProperties: false,
    definitionPath: "definitions",
    target: "jsonSchema7",
    strictUnions: false,
    definitions: {},
    errorMessages: false,
    markdownDescription: false,
    patternStrategy: "escape",
    applyRegexFlags: false,
    emailStrategy: "format:email",
    base64Strategy: "contentEncoding:base64",
    nameStrategy: "ref",
};
const getDefaultOptions = (options) => (typeof options === "string"
    ? {
        ...defaultOptions,
        name: options,
    }
    : {
        ...defaultOptions,
        ...options,
    });


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/Refs.js":
/*!**********************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/Refs.js ***!
  \**********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getRefs: () => (/* binding */ getRefs)
/* harmony export */ });
/* harmony import */ var _Options_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Options.js */ "./node_modules/zod-to-json-schema/dist/esm/Options.js");

const getRefs = (options) => {
    const _options = (0,_Options_js__WEBPACK_IMPORTED_MODULE_0__.getDefaultOptions)(options);
    const currentPath = _options.name !== undefined
        ? [..._options.basePath, _options.definitionPath, _options.name]
        : _options.basePath;
    return {
        ..._options,
        currentPath: currentPath,
        propertyPath: undefined,
        seen: new Map(Object.entries(_options.definitions).map(([name, def]) => [
            def._def,
            {
                def: def._def,
                path: [..._options.basePath, _options.definitionPath, name],
                // Resolution of references will be forced even though seen, so it's ok that the schema is undefined here for now.
                jsonSchema: undefined,
            },
        ])),
    };
};


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/errorMessages.js":
/*!*******************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/errorMessages.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   addErrorMessage: () => (/* binding */ addErrorMessage),
/* harmony export */   setResponseValueAndErrors: () => (/* binding */ setResponseValueAndErrors)
/* harmony export */ });
function addErrorMessage(res, key, errorMessage, refs) {
    if (!refs?.errorMessages)
        return;
    if (errorMessage) {
        res.errorMessage = {
            ...res.errorMessage,
            [key]: errorMessage,
        };
    }
}
function setResponseValueAndErrors(res, key, value, errorMessage, refs) {
    res[key] = value;
    addErrorMessage(res, key, errorMessage, refs);
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/index.js":
/*!***********************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/index.js ***!
  \***********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   addErrorMessage: () => (/* reexport safe */ _errorMessages_js__WEBPACK_IMPORTED_MODULE_2__.addErrorMessage),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   defaultOptions: () => (/* reexport safe */ _Options_js__WEBPACK_IMPORTED_MODULE_0__.defaultOptions),
/* harmony export */   getDefaultOptions: () => (/* reexport safe */ _Options_js__WEBPACK_IMPORTED_MODULE_0__.getDefaultOptions),
/* harmony export */   getRefs: () => (/* reexport safe */ _Refs_js__WEBPACK_IMPORTED_MODULE_1__.getRefs),
/* harmony export */   ignoreOverride: () => (/* reexport safe */ _Options_js__WEBPACK_IMPORTED_MODULE_0__.ignoreOverride),
/* harmony export */   jsonDescription: () => (/* reexport safe */ _Options_js__WEBPACK_IMPORTED_MODULE_0__.jsonDescription),
/* harmony export */   parseAnyDef: () => (/* reexport safe */ _parsers_any_js__WEBPACK_IMPORTED_MODULE_5__.parseAnyDef),
/* harmony export */   parseArrayDef: () => (/* reexport safe */ _parsers_array_js__WEBPACK_IMPORTED_MODULE_6__.parseArrayDef),
/* harmony export */   parseBigintDef: () => (/* reexport safe */ _parsers_bigint_js__WEBPACK_IMPORTED_MODULE_7__.parseBigintDef),
/* harmony export */   parseBooleanDef: () => (/* reexport safe */ _parsers_boolean_js__WEBPACK_IMPORTED_MODULE_8__.parseBooleanDef),
/* harmony export */   parseBrandedDef: () => (/* reexport safe */ _parsers_branded_js__WEBPACK_IMPORTED_MODULE_9__.parseBrandedDef),
/* harmony export */   parseCatchDef: () => (/* reexport safe */ _parsers_catch_js__WEBPACK_IMPORTED_MODULE_10__.parseCatchDef),
/* harmony export */   parseDateDef: () => (/* reexport safe */ _parsers_date_js__WEBPACK_IMPORTED_MODULE_11__.parseDateDef),
/* harmony export */   parseDef: () => (/* reexport safe */ _parseDef_js__WEBPACK_IMPORTED_MODULE_3__.parseDef),
/* harmony export */   parseDefaultDef: () => (/* reexport safe */ _parsers_default_js__WEBPACK_IMPORTED_MODULE_12__.parseDefaultDef),
/* harmony export */   parseEffectsDef: () => (/* reexport safe */ _parsers_effects_js__WEBPACK_IMPORTED_MODULE_13__.parseEffectsDef),
/* harmony export */   parseEnumDef: () => (/* reexport safe */ _parsers_enum_js__WEBPACK_IMPORTED_MODULE_14__.parseEnumDef),
/* harmony export */   parseIntersectionDef: () => (/* reexport safe */ _parsers_intersection_js__WEBPACK_IMPORTED_MODULE_15__.parseIntersectionDef),
/* harmony export */   parseLiteralDef: () => (/* reexport safe */ _parsers_literal_js__WEBPACK_IMPORTED_MODULE_16__.parseLiteralDef),
/* harmony export */   parseMapDef: () => (/* reexport safe */ _parsers_map_js__WEBPACK_IMPORTED_MODULE_17__.parseMapDef),
/* harmony export */   parseNativeEnumDef: () => (/* reexport safe */ _parsers_nativeEnum_js__WEBPACK_IMPORTED_MODULE_18__.parseNativeEnumDef),
/* harmony export */   parseNeverDef: () => (/* reexport safe */ _parsers_never_js__WEBPACK_IMPORTED_MODULE_19__.parseNeverDef),
/* harmony export */   parseNullDef: () => (/* reexport safe */ _parsers_null_js__WEBPACK_IMPORTED_MODULE_20__.parseNullDef),
/* harmony export */   parseNullableDef: () => (/* reexport safe */ _parsers_nullable_js__WEBPACK_IMPORTED_MODULE_21__.parseNullableDef),
/* harmony export */   parseNumberDef: () => (/* reexport safe */ _parsers_number_js__WEBPACK_IMPORTED_MODULE_22__.parseNumberDef),
/* harmony export */   parseObjectDef: () => (/* reexport safe */ _parsers_object_js__WEBPACK_IMPORTED_MODULE_23__.parseObjectDef),
/* harmony export */   parseOptionalDef: () => (/* reexport safe */ _parsers_optional_js__WEBPACK_IMPORTED_MODULE_24__.parseOptionalDef),
/* harmony export */   parsePipelineDef: () => (/* reexport safe */ _parsers_pipeline_js__WEBPACK_IMPORTED_MODULE_25__.parsePipelineDef),
/* harmony export */   parsePromiseDef: () => (/* reexport safe */ _parsers_promise_js__WEBPACK_IMPORTED_MODULE_26__.parsePromiseDef),
/* harmony export */   parseReadonlyDef: () => (/* reexport safe */ _parsers_readonly_js__WEBPACK_IMPORTED_MODULE_27__.parseReadonlyDef),
/* harmony export */   parseRecordDef: () => (/* reexport safe */ _parsers_record_js__WEBPACK_IMPORTED_MODULE_28__.parseRecordDef),
/* harmony export */   parseSetDef: () => (/* reexport safe */ _parsers_set_js__WEBPACK_IMPORTED_MODULE_29__.parseSetDef),
/* harmony export */   parseStringDef: () => (/* reexport safe */ _parsers_string_js__WEBPACK_IMPORTED_MODULE_30__.parseStringDef),
/* harmony export */   parseTupleDef: () => (/* reexport safe */ _parsers_tuple_js__WEBPACK_IMPORTED_MODULE_31__.parseTupleDef),
/* harmony export */   parseUndefinedDef: () => (/* reexport safe */ _parsers_undefined_js__WEBPACK_IMPORTED_MODULE_32__.parseUndefinedDef),
/* harmony export */   parseUnionDef: () => (/* reexport safe */ _parsers_union_js__WEBPACK_IMPORTED_MODULE_33__.parseUnionDef),
/* harmony export */   parseUnknownDef: () => (/* reexport safe */ _parsers_unknown_js__WEBPACK_IMPORTED_MODULE_34__.parseUnknownDef),
/* harmony export */   primitiveMappings: () => (/* reexport safe */ _parsers_union_js__WEBPACK_IMPORTED_MODULE_33__.primitiveMappings),
/* harmony export */   selectParser: () => (/* reexport safe */ _selectParser_js__WEBPACK_IMPORTED_MODULE_35__.selectParser),
/* harmony export */   setResponseValueAndErrors: () => (/* reexport safe */ _errorMessages_js__WEBPACK_IMPORTED_MODULE_2__.setResponseValueAndErrors),
/* harmony export */   zodPatterns: () => (/* reexport safe */ _parsers_string_js__WEBPACK_IMPORTED_MODULE_30__.zodPatterns),
/* harmony export */   zodToJsonSchema: () => (/* reexport safe */ _zodToJsonSchema_js__WEBPACK_IMPORTED_MODULE_36__.zodToJsonSchema)
/* harmony export */ });
/* harmony import */ var _Options_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Options.js */ "./node_modules/zod-to-json-schema/dist/esm/Options.js");
/* harmony import */ var _Refs_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Refs.js */ "./node_modules/zod-to-json-schema/dist/esm/Refs.js");
/* harmony import */ var _errorMessages_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./errorMessages.js */ "./node_modules/zod-to-json-schema/dist/esm/errorMessages.js");
/* harmony import */ var _parseDef_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./parseDef.js */ "./node_modules/zod-to-json-schema/dist/esm/parseDef.js");
/* harmony import */ var _parseTypes_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./parseTypes.js */ "./node_modules/zod-to-json-schema/dist/esm/parseTypes.js");
/* harmony import */ var _parsers_any_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./parsers/any.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/any.js");
/* harmony import */ var _parsers_array_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./parsers/array.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/array.js");
/* harmony import */ var _parsers_bigint_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./parsers/bigint.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/bigint.js");
/* harmony import */ var _parsers_boolean_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./parsers/boolean.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/boolean.js");
/* harmony import */ var _parsers_branded_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./parsers/branded.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/branded.js");
/* harmony import */ var _parsers_catch_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./parsers/catch.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/catch.js");
/* harmony import */ var _parsers_date_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./parsers/date.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/date.js");
/* harmony import */ var _parsers_default_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./parsers/default.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/default.js");
/* harmony import */ var _parsers_effects_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./parsers/effects.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/effects.js");
/* harmony import */ var _parsers_enum_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./parsers/enum.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/enum.js");
/* harmony import */ var _parsers_intersection_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ./parsers/intersection.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/intersection.js");
/* harmony import */ var _parsers_literal_js__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./parsers/literal.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/literal.js");
/* harmony import */ var _parsers_map_js__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ./parsers/map.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/map.js");
/* harmony import */ var _parsers_nativeEnum_js__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ./parsers/nativeEnum.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/nativeEnum.js");
/* harmony import */ var _parsers_never_js__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ./parsers/never.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/never.js");
/* harmony import */ var _parsers_null_js__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ./parsers/null.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/null.js");
/* harmony import */ var _parsers_nullable_js__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ./parsers/nullable.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/nullable.js");
/* harmony import */ var _parsers_number_js__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! ./parsers/number.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/number.js");
/* harmony import */ var _parsers_object_js__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! ./parsers/object.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/object.js");
/* harmony import */ var _parsers_optional_js__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(/*! ./parsers/optional.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/optional.js");
/* harmony import */ var _parsers_pipeline_js__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(/*! ./parsers/pipeline.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/pipeline.js");
/* harmony import */ var _parsers_promise_js__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(/*! ./parsers/promise.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/promise.js");
/* harmony import */ var _parsers_readonly_js__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(/*! ./parsers/readonly.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/readonly.js");
/* harmony import */ var _parsers_record_js__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(/*! ./parsers/record.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/record.js");
/* harmony import */ var _parsers_set_js__WEBPACK_IMPORTED_MODULE_29__ = __webpack_require__(/*! ./parsers/set.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/set.js");
/* harmony import */ var _parsers_string_js__WEBPACK_IMPORTED_MODULE_30__ = __webpack_require__(/*! ./parsers/string.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/string.js");
/* harmony import */ var _parsers_tuple_js__WEBPACK_IMPORTED_MODULE_31__ = __webpack_require__(/*! ./parsers/tuple.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/tuple.js");
/* harmony import */ var _parsers_undefined_js__WEBPACK_IMPORTED_MODULE_32__ = __webpack_require__(/*! ./parsers/undefined.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/undefined.js");
/* harmony import */ var _parsers_union_js__WEBPACK_IMPORTED_MODULE_33__ = __webpack_require__(/*! ./parsers/union.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/union.js");
/* harmony import */ var _parsers_unknown_js__WEBPACK_IMPORTED_MODULE_34__ = __webpack_require__(/*! ./parsers/unknown.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/unknown.js");
/* harmony import */ var _selectParser_js__WEBPACK_IMPORTED_MODULE_35__ = __webpack_require__(/*! ./selectParser.js */ "./node_modules/zod-to-json-schema/dist/esm/selectParser.js");
/* harmony import */ var _zodToJsonSchema_js__WEBPACK_IMPORTED_MODULE_36__ = __webpack_require__(/*! ./zodToJsonSchema.js */ "./node_modules/zod-to-json-schema/dist/esm/zodToJsonSchema.js");






































/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_zodToJsonSchema_js__WEBPACK_IMPORTED_MODULE_36__.zodToJsonSchema);


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parseDef.js":
/*!**************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parseDef.js ***!
  \**************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseDef: () => (/* binding */ parseDef)
/* harmony export */ });
/* harmony import */ var _Options_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Options.js */ "./node_modules/zod-to-json-schema/dist/esm/Options.js");
/* harmony import */ var _selectParser_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./selectParser.js */ "./node_modules/zod-to-json-schema/dist/esm/selectParser.js");


function parseDef(def, refs, forceResolution = false) {
    const seenItem = refs.seen.get(def);
    if (refs.override) {
        const overrideResult = refs.override?.(def, refs, seenItem, forceResolution);
        if (overrideResult !== _Options_js__WEBPACK_IMPORTED_MODULE_0__.ignoreOverride) {
            return overrideResult;
        }
    }
    if (seenItem && !forceResolution) {
        const seenSchema = get$ref(seenItem, refs);
        if (seenSchema !== undefined) {
            return seenSchema;
        }
    }
    const newItem = { def, path: refs.currentPath, jsonSchema: undefined };
    refs.seen.set(def, newItem);
    const jsonSchemaOrGetter = (0,_selectParser_js__WEBPACK_IMPORTED_MODULE_1__.selectParser)(def, def.typeName, refs);
    // If the return was a function, then the inner definition needs to be extracted before a call to parseDef (recursive)
    const jsonSchema = typeof jsonSchemaOrGetter === "function"
        ? parseDef(jsonSchemaOrGetter(), refs)
        : jsonSchemaOrGetter;
    if (jsonSchema) {
        addMeta(def, refs, jsonSchema);
    }
    if (refs.postProcess) {
        const postProcessResult = refs.postProcess(jsonSchema, def, refs);
        newItem.jsonSchema = jsonSchema;
        return postProcessResult;
    }
    newItem.jsonSchema = jsonSchema;
    return jsonSchema;
}
const get$ref = (item, refs) => {
    switch (refs.$refStrategy) {
        case "root":
            return { $ref: item.path.join("/") };
        case "relative":
            return { $ref: getRelativePath(refs.currentPath, item.path) };
        case "none":
        case "seen": {
            if (item.path.length < refs.currentPath.length &&
                item.path.every((value, index) => refs.currentPath[index] === value)) {
                console.warn(`Recursive reference detected at ${refs.currentPath.join("/")}! Defaulting to any`);
                return {};
            }
            return refs.$refStrategy === "seen" ? {} : undefined;
        }
    }
};
const getRelativePath = (pathA, pathB) => {
    let i = 0;
    for (; i < pathA.length && i < pathB.length; i++) {
        if (pathA[i] !== pathB[i])
            break;
    }
    return [(pathA.length - i).toString(), ...pathB.slice(i)].join("/");
};
const addMeta = (def, refs, jsonSchema) => {
    if (def.description) {
        jsonSchema.description = def.description;
        if (refs.markdownDescription) {
            jsonSchema.markdownDescription = def.description;
        }
    }
    return jsonSchema;
};


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parseTypes.js":
/*!****************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parseTypes.js ***!
  \****************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);



/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/any.js":
/*!*****************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/any.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseAnyDef: () => (/* binding */ parseAnyDef)
/* harmony export */ });
function parseAnyDef() {
    return {};
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/array.js":
/*!*******************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/array.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseArrayDef: () => (/* binding */ parseArrayDef)
/* harmony export */ });
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! zod */ "./node_modules/zod/lib/index.mjs");
/* harmony import */ var _errorMessages_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../errorMessages.js */ "./node_modules/zod-to-json-schema/dist/esm/errorMessages.js");
/* harmony import */ var _parseDef_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../parseDef.js */ "./node_modules/zod-to-json-schema/dist/esm/parseDef.js");



function parseArrayDef(def, refs) {
    const res = {
        type: "array",
    };
    if (def.type?._def &&
        def.type?._def?.typeName !== zod__WEBPACK_IMPORTED_MODULE_2__.ZodFirstPartyTypeKind.ZodAny) {
        res.items = (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_1__.parseDef)(def.type._def, {
            ...refs,
            currentPath: [...refs.currentPath, "items"],
        });
    }
    if (def.minLength) {
        (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "minItems", def.minLength.value, def.minLength.message, refs);
    }
    if (def.maxLength) {
        (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "maxItems", def.maxLength.value, def.maxLength.message, refs);
    }
    if (def.exactLength) {
        (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "minItems", def.exactLength.value, def.exactLength.message, refs);
        (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "maxItems", def.exactLength.value, def.exactLength.message, refs);
    }
    return res;
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/bigint.js":
/*!********************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/bigint.js ***!
  \********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseBigintDef: () => (/* binding */ parseBigintDef)
/* harmony export */ });
/* harmony import */ var _errorMessages_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../errorMessages.js */ "./node_modules/zod-to-json-schema/dist/esm/errorMessages.js");

function parseBigintDef(def, refs) {
    const res = {
        type: "integer",
        format: "int64",
    };
    if (!def.checks)
        return res;
    for (const check of def.checks) {
        switch (check.kind) {
            case "min":
                if (refs.target === "jsonSchema7") {
                    if (check.inclusive) {
                        (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "minimum", check.value, check.message, refs);
                    }
                    else {
                        (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "exclusiveMinimum", check.value, check.message, refs);
                    }
                }
                else {
                    if (!check.inclusive) {
                        res.exclusiveMinimum = true;
                    }
                    (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "minimum", check.value, check.message, refs);
                }
                break;
            case "max":
                if (refs.target === "jsonSchema7") {
                    if (check.inclusive) {
                        (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "maximum", check.value, check.message, refs);
                    }
                    else {
                        (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "exclusiveMaximum", check.value, check.message, refs);
                    }
                }
                else {
                    if (!check.inclusive) {
                        res.exclusiveMaximum = true;
                    }
                    (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "maximum", check.value, check.message, refs);
                }
                break;
            case "multipleOf":
                (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "multipleOf", check.value, check.message, refs);
                break;
        }
    }
    return res;
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/boolean.js":
/*!*********************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/boolean.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseBooleanDef: () => (/* binding */ parseBooleanDef)
/* harmony export */ });
function parseBooleanDef() {
    return {
        type: "boolean",
    };
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/branded.js":
/*!*********************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/branded.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseBrandedDef: () => (/* binding */ parseBrandedDef)
/* harmony export */ });
/* harmony import */ var _parseDef_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../parseDef.js */ "./node_modules/zod-to-json-schema/dist/esm/parseDef.js");

function parseBrandedDef(_def, refs) {
    return (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(_def.type._def, refs);
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/catch.js":
/*!*******************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/catch.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseCatchDef: () => (/* binding */ parseCatchDef)
/* harmony export */ });
/* harmony import */ var _parseDef_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../parseDef.js */ "./node_modules/zod-to-json-schema/dist/esm/parseDef.js");

const parseCatchDef = (def, refs) => {
    return (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(def.innerType._def, refs);
};


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/date.js":
/*!******************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/date.js ***!
  \******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseDateDef: () => (/* binding */ parseDateDef)
/* harmony export */ });
/* harmony import */ var _errorMessages_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../errorMessages.js */ "./node_modules/zod-to-json-schema/dist/esm/errorMessages.js");

function parseDateDef(def, refs, overrideDateStrategy) {
    const strategy = overrideDateStrategy ?? refs.dateStrategy;
    if (Array.isArray(strategy)) {
        return {
            anyOf: strategy.map((item, i) => parseDateDef(def, refs, item)),
        };
    }
    switch (strategy) {
        case "string":
        case "format:date-time":
            return {
                type: "string",
                format: "date-time",
            };
        case "format:date":
            return {
                type: "string",
                format: "date",
            };
        case "integer":
            return integerDateParser(def, refs);
    }
}
const integerDateParser = (def, refs) => {
    const res = {
        type: "integer",
        format: "unix-time",
    };
    if (refs.target === "openApi3") {
        return res;
    }
    for (const check of def.checks) {
        switch (check.kind) {
            case "min":
                (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "minimum", check.value, // This is in milliseconds
                check.message, refs);
                break;
            case "max":
                (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "maximum", check.value, // This is in milliseconds
                check.message, refs);
                break;
        }
    }
    return res;
};


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/default.js":
/*!*********************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/default.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseDefaultDef: () => (/* binding */ parseDefaultDef)
/* harmony export */ });
/* harmony import */ var _parseDef_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../parseDef.js */ "./node_modules/zod-to-json-schema/dist/esm/parseDef.js");

function parseDefaultDef(_def, refs) {
    return {
        ...(0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(_def.innerType._def, refs),
        default: _def.defaultValue(),
    };
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/effects.js":
/*!*********************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/effects.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseEffectsDef: () => (/* binding */ parseEffectsDef)
/* harmony export */ });
/* harmony import */ var _parseDef_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../parseDef.js */ "./node_modules/zod-to-json-schema/dist/esm/parseDef.js");

function parseEffectsDef(_def, refs) {
    return refs.effectStrategy === "input"
        ? (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(_def.schema._def, refs)
        : {};
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/enum.js":
/*!******************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/enum.js ***!
  \******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseEnumDef: () => (/* binding */ parseEnumDef)
/* harmony export */ });
function parseEnumDef(def) {
    return {
        type: "string",
        enum: Array.from(def.values),
    };
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/intersection.js":
/*!**************************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/intersection.js ***!
  \**************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseIntersectionDef: () => (/* binding */ parseIntersectionDef)
/* harmony export */ });
/* harmony import */ var _parseDef_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../parseDef.js */ "./node_modules/zod-to-json-schema/dist/esm/parseDef.js");

const isJsonSchema7AllOfType = (type) => {
    if ("type" in type && type.type === "string")
        return false;
    return "allOf" in type;
};
function parseIntersectionDef(def, refs) {
    const allOf = [
        (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(def.left._def, {
            ...refs,
            currentPath: [...refs.currentPath, "allOf", "0"],
        }),
        (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(def.right._def, {
            ...refs,
            currentPath: [...refs.currentPath, "allOf", "1"],
        }),
    ].filter((x) => !!x);
    let unevaluatedProperties = refs.target === "jsonSchema2019-09"
        ? { unevaluatedProperties: false }
        : undefined;
    const mergedAllOf = [];
    // If either of the schemas is an allOf, merge them into a single allOf
    allOf.forEach((schema) => {
        if (isJsonSchema7AllOfType(schema)) {
            mergedAllOf.push(...schema.allOf);
            if (schema.unevaluatedProperties === undefined) {
                // If one of the schemas has no unevaluatedProperties set,
                // the merged schema should also have no unevaluatedProperties set
                unevaluatedProperties = undefined;
            }
        }
        else {
            let nestedSchema = schema;
            if ("additionalProperties" in schema &&
                schema.additionalProperties === false) {
                const { additionalProperties, ...rest } = schema;
                nestedSchema = rest;
            }
            else {
                // As soon as one of the schemas has additionalProperties set not to false, we allow unevaluatedProperties
                unevaluatedProperties = undefined;
            }
            mergedAllOf.push(nestedSchema);
        }
    });
    return mergedAllOf.length
        ? {
            allOf: mergedAllOf,
            ...unevaluatedProperties,
        }
        : undefined;
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/literal.js":
/*!*********************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/literal.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseLiteralDef: () => (/* binding */ parseLiteralDef)
/* harmony export */ });
function parseLiteralDef(def, refs) {
    const parsedType = typeof def.value;
    if (parsedType !== "bigint" &&
        parsedType !== "number" &&
        parsedType !== "boolean" &&
        parsedType !== "string") {
        return {
            type: Array.isArray(def.value) ? "array" : "object",
        };
    }
    if (refs.target === "openApi3") {
        return {
            type: parsedType === "bigint" ? "integer" : parsedType,
            enum: [def.value],
        };
    }
    return {
        type: parsedType === "bigint" ? "integer" : parsedType,
        const: def.value,
    };
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/map.js":
/*!*****************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/map.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseMapDef: () => (/* binding */ parseMapDef)
/* harmony export */ });
/* harmony import */ var _parseDef_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../parseDef.js */ "./node_modules/zod-to-json-schema/dist/esm/parseDef.js");
/* harmony import */ var _record_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./record.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/record.js");


function parseMapDef(def, refs) {
    if (refs.mapStrategy === "record") {
        return (0,_record_js__WEBPACK_IMPORTED_MODULE_1__.parseRecordDef)(def, refs);
    }
    const keys = (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(def.keyType._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items", "items", "0"],
    }) || {};
    const values = (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(def.valueType._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items", "items", "1"],
    }) || {};
    return {
        type: "array",
        maxItems: 125,
        items: {
            type: "array",
            items: [keys, values],
            minItems: 2,
            maxItems: 2,
        },
    };
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/nativeEnum.js":
/*!************************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/nativeEnum.js ***!
  \************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseNativeEnumDef: () => (/* binding */ parseNativeEnumDef)
/* harmony export */ });
function parseNativeEnumDef(def) {
    const object = def.values;
    const actualKeys = Object.keys(def.values).filter((key) => {
        return typeof object[object[key]] !== "number";
    });
    const actualValues = actualKeys.map((key) => object[key]);
    const parsedTypes = Array.from(new Set(actualValues.map((values) => typeof values)));
    return {
        type: parsedTypes.length === 1
            ? parsedTypes[0] === "string"
                ? "string"
                : "number"
            : ["string", "number"],
        enum: actualValues,
    };
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/never.js":
/*!*******************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/never.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseNeverDef: () => (/* binding */ parseNeverDef)
/* harmony export */ });
function parseNeverDef() {
    return {
        not: {},
    };
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/null.js":
/*!******************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/null.js ***!
  \******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseNullDef: () => (/* binding */ parseNullDef)
/* harmony export */ });
function parseNullDef(refs) {
    return refs.target === "openApi3"
        ? {
            enum: ["null"],
            nullable: true,
        }
        : {
            type: "null",
        };
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/nullable.js":
/*!**********************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/nullable.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseNullableDef: () => (/* binding */ parseNullableDef)
/* harmony export */ });
/* harmony import */ var _parseDef_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../parseDef.js */ "./node_modules/zod-to-json-schema/dist/esm/parseDef.js");
/* harmony import */ var _union_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./union.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/union.js");


function parseNullableDef(def, refs) {
    if (["ZodString", "ZodNumber", "ZodBigInt", "ZodBoolean", "ZodNull"].includes(def.innerType._def.typeName) &&
        (!def.innerType._def.checks || !def.innerType._def.checks.length)) {
        if (refs.target === "openApi3") {
            return {
                type: _union_js__WEBPACK_IMPORTED_MODULE_1__.primitiveMappings[def.innerType._def.typeName],
                nullable: true,
            };
        }
        return {
            type: [
                _union_js__WEBPACK_IMPORTED_MODULE_1__.primitiveMappings[def.innerType._def.typeName],
                "null",
            ],
        };
    }
    if (refs.target === "openApi3") {
        const base = (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(def.innerType._def, {
            ...refs,
            currentPath: [...refs.currentPath],
        });
        if (base && "$ref" in base)
            return { allOf: [base], nullable: true };
        return base && { ...base, nullable: true };
    }
    const base = (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(def.innerType._def, {
        ...refs,
        currentPath: [...refs.currentPath, "anyOf", "0"],
    });
    return base && { anyOf: [base, { type: "null" }] };
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/number.js":
/*!********************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/number.js ***!
  \********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseNumberDef: () => (/* binding */ parseNumberDef)
/* harmony export */ });
/* harmony import */ var _errorMessages_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../errorMessages.js */ "./node_modules/zod-to-json-schema/dist/esm/errorMessages.js");

function parseNumberDef(def, refs) {
    const res = {
        type: "number",
    };
    if (!def.checks)
        return res;
    for (const check of def.checks) {
        switch (check.kind) {
            case "int":
                res.type = "integer";
                (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.addErrorMessage)(res, "type", check.message, refs);
                break;
            case "min":
                if (refs.target === "jsonSchema7") {
                    if (check.inclusive) {
                        (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "minimum", check.value, check.message, refs);
                    }
                    else {
                        (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "exclusiveMinimum", check.value, check.message, refs);
                    }
                }
                else {
                    if (!check.inclusive) {
                        res.exclusiveMinimum = true;
                    }
                    (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "minimum", check.value, check.message, refs);
                }
                break;
            case "max":
                if (refs.target === "jsonSchema7") {
                    if (check.inclusive) {
                        (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "maximum", check.value, check.message, refs);
                    }
                    else {
                        (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "exclusiveMaximum", check.value, check.message, refs);
                    }
                }
                else {
                    if (!check.inclusive) {
                        res.exclusiveMaximum = true;
                    }
                    (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "maximum", check.value, check.message, refs);
                }
                break;
            case "multipleOf":
                (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "multipleOf", check.value, check.message, refs);
                break;
        }
    }
    return res;
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/object.js":
/*!********************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/object.js ***!
  \********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseObjectDef: () => (/* binding */ parseObjectDef)
/* harmony export */ });
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! zod */ "./node_modules/zod/lib/index.mjs");
/* harmony import */ var _parseDef_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../parseDef.js */ "./node_modules/zod-to-json-schema/dist/esm/parseDef.js");


function parseObjectDef(def, refs) {
    const forceOptionalIntoNullable = refs.target === "openAi";
    const result = {
        type: "object",
        properties: {},
    };
    const required = [];
    const shape = def.shape();
    for (const propName in shape) {
        let propDef = shape[propName];
        if (propDef === undefined || propDef._def === undefined) {
            continue;
        }
        let propOptional = safeIsOptional(propDef);
        if (propOptional && forceOptionalIntoNullable) {
            if (propDef instanceof zod__WEBPACK_IMPORTED_MODULE_1__.ZodOptional) {
                propDef = propDef._def.innerType;
            }
            if (!propDef.isNullable()) {
                propDef = propDef.nullable();
            }
            propOptional = false;
        }
        const parsedDef = (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(propDef._def, {
            ...refs,
            currentPath: [...refs.currentPath, "properties", propName],
            propertyPath: [...refs.currentPath, "properties", propName],
        });
        if (parsedDef === undefined) {
            continue;
        }
        result.properties[propName] = parsedDef;
        if (!propOptional) {
            required.push(propName);
        }
    }
    if (required.length) {
        result.required = required;
    }
    const additionalProperties = decideAdditionalProperties(def, refs);
    if (additionalProperties !== undefined) {
        result.additionalProperties = additionalProperties;
    }
    return result;
}
function decideAdditionalProperties(def, refs) {
    if (def.catchall._def.typeName !== "ZodNever") {
        return (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(def.catchall._def, {
            ...refs,
            currentPath: [...refs.currentPath, "additionalProperties"],
        });
    }
    switch (def.unknownKeys) {
        case "passthrough":
            return refs.allowedAdditionalProperties;
        case "strict":
            return refs.rejectedAdditionalProperties;
        case "strip":
            return refs.removeAdditionalStrategy === "strict"
                ? refs.allowedAdditionalProperties
                : refs.rejectedAdditionalProperties;
    }
}
function safeIsOptional(schema) {
    try {
        return schema.isOptional();
    }
    catch {
        return true;
    }
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/optional.js":
/*!**********************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/optional.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseOptionalDef: () => (/* binding */ parseOptionalDef)
/* harmony export */ });
/* harmony import */ var _parseDef_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../parseDef.js */ "./node_modules/zod-to-json-schema/dist/esm/parseDef.js");

const parseOptionalDef = (def, refs) => {
    if (refs.currentPath.toString() === refs.propertyPath?.toString()) {
        return (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(def.innerType._def, refs);
    }
    const innerSchema = (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(def.innerType._def, {
        ...refs,
        currentPath: [...refs.currentPath, "anyOf", "1"],
    });
    return innerSchema
        ? {
            anyOf: [
                {
                    not: {},
                },
                innerSchema,
            ],
        }
        : {};
};


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/pipeline.js":
/*!**********************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/pipeline.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parsePipelineDef: () => (/* binding */ parsePipelineDef)
/* harmony export */ });
/* harmony import */ var _parseDef_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../parseDef.js */ "./node_modules/zod-to-json-schema/dist/esm/parseDef.js");

const parsePipelineDef = (def, refs) => {
    if (refs.pipeStrategy === "input") {
        return (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(def.in._def, refs);
    }
    else if (refs.pipeStrategy === "output") {
        return (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(def.out._def, refs);
    }
    const a = (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(def.in._def, {
        ...refs,
        currentPath: [...refs.currentPath, "allOf", "0"],
    });
    const b = (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(def.out._def, {
        ...refs,
        currentPath: [...refs.currentPath, "allOf", a ? "1" : "0"],
    });
    return {
        allOf: [a, b].filter((x) => x !== undefined),
    };
};


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/promise.js":
/*!*********************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/promise.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parsePromiseDef: () => (/* binding */ parsePromiseDef)
/* harmony export */ });
/* harmony import */ var _parseDef_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../parseDef.js */ "./node_modules/zod-to-json-schema/dist/esm/parseDef.js");

function parsePromiseDef(def, refs) {
    return (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(def.type._def, refs);
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/readonly.js":
/*!**********************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/readonly.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseReadonlyDef: () => (/* binding */ parseReadonlyDef)
/* harmony export */ });
/* harmony import */ var _parseDef_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../parseDef.js */ "./node_modules/zod-to-json-schema/dist/esm/parseDef.js");

const parseReadonlyDef = (def, refs) => {
    return (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(def.innerType._def, refs);
};


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/record.js":
/*!********************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/record.js ***!
  \********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseRecordDef: () => (/* binding */ parseRecordDef)
/* harmony export */ });
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! zod */ "./node_modules/zod/lib/index.mjs");
/* harmony import */ var _parseDef_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../parseDef.js */ "./node_modules/zod-to-json-schema/dist/esm/parseDef.js");
/* harmony import */ var _string_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./string.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/string.js");
/* harmony import */ var _branded_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./branded.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/branded.js");




function parseRecordDef(def, refs) {
    if (refs.target === "openAi") {
        console.warn("Warning: OpenAI may not support records in schemas! Try an array of key-value pairs instead.");
    }
    if (refs.target === "openApi3" &&
        def.keyType?._def.typeName === zod__WEBPACK_IMPORTED_MODULE_3__.ZodFirstPartyTypeKind.ZodEnum) {
        return {
            type: "object",
            required: def.keyType._def.values,
            properties: def.keyType._def.values.reduce((acc, key) => ({
                ...acc,
                [key]: (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(def.valueType._def, {
                    ...refs,
                    currentPath: [...refs.currentPath, "properties", key],
                }) ?? {},
            }), {}),
            additionalProperties: refs.rejectedAdditionalProperties,
        };
    }
    const schema = {
        type: "object",
        additionalProperties: (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(def.valueType._def, {
            ...refs,
            currentPath: [...refs.currentPath, "additionalProperties"],
        }) ?? refs.allowedAdditionalProperties,
    };
    if (refs.target === "openApi3") {
        return schema;
    }
    if (def.keyType?._def.typeName === zod__WEBPACK_IMPORTED_MODULE_3__.ZodFirstPartyTypeKind.ZodString &&
        def.keyType._def.checks?.length) {
        const { type, ...keyType } = (0,_string_js__WEBPACK_IMPORTED_MODULE_1__.parseStringDef)(def.keyType._def, refs);
        return {
            ...schema,
            propertyNames: keyType,
        };
    }
    else if (def.keyType?._def.typeName === zod__WEBPACK_IMPORTED_MODULE_3__.ZodFirstPartyTypeKind.ZodEnum) {
        return {
            ...schema,
            propertyNames: {
                enum: def.keyType._def.values,
            },
        };
    }
    else if (def.keyType?._def.typeName === zod__WEBPACK_IMPORTED_MODULE_3__.ZodFirstPartyTypeKind.ZodBranded &&
        def.keyType._def.type._def.typeName === zod__WEBPACK_IMPORTED_MODULE_3__.ZodFirstPartyTypeKind.ZodString &&
        def.keyType._def.type._def.checks?.length) {
        const { type, ...keyType } = (0,_branded_js__WEBPACK_IMPORTED_MODULE_2__.parseBrandedDef)(def.keyType._def, refs);
        return {
            ...schema,
            propertyNames: keyType,
        };
    }
    return schema;
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/set.js":
/*!*****************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/set.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseSetDef: () => (/* binding */ parseSetDef)
/* harmony export */ });
/* harmony import */ var _errorMessages_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../errorMessages.js */ "./node_modules/zod-to-json-schema/dist/esm/errorMessages.js");
/* harmony import */ var _parseDef_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../parseDef.js */ "./node_modules/zod-to-json-schema/dist/esm/parseDef.js");


function parseSetDef(def, refs) {
    const items = (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_1__.parseDef)(def.valueType._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items"],
    });
    const schema = {
        type: "array",
        uniqueItems: true,
        items,
    };
    if (def.minSize) {
        (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(schema, "minItems", def.minSize.value, def.minSize.message, refs);
    }
    if (def.maxSize) {
        (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(schema, "maxItems", def.maxSize.value, def.maxSize.message, refs);
    }
    return schema;
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/string.js":
/*!********************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/string.js ***!
  \********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseStringDef: () => (/* binding */ parseStringDef),
/* harmony export */   zodPatterns: () => (/* binding */ zodPatterns)
/* harmony export */ });
/* harmony import */ var _errorMessages_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../errorMessages.js */ "./node_modules/zod-to-json-schema/dist/esm/errorMessages.js");

let emojiRegex = undefined;
/**
 * Generated from the regular expressions found here as of 2024-05-22:
 * https://github.com/colinhacks/zod/blob/master/src/types.ts.
 *
 * Expressions with /i flag have been changed accordingly.
 */
const zodPatterns = {
    /**
     * `c` was changed to `[cC]` to replicate /i flag
     */
    cuid: /^[cC][^\s-]{8,}$/,
    cuid2: /^[0-9a-z]+$/,
    ulid: /^[0-9A-HJKMNP-TV-Z]{26}$/,
    /**
     * `a-z` was added to replicate /i flag
     */
    email: /^(?!\.)(?!.*\.\.)([a-zA-Z0-9_'+\-\.]*)[a-zA-Z0-9_+-]@([a-zA-Z0-9][a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,}$/,
    /**
     * Constructed a valid Unicode RegExp
     *
     * Lazily instantiate since this type of regex isn't supported
     * in all envs (e.g. React Native).
     *
     * See:
     * https://github.com/colinhacks/zod/issues/2433
     * Fix in Zod:
     * https://github.com/colinhacks/zod/commit/9340fd51e48576a75adc919bff65dbc4a5d4c99b
     */
    emoji: () => {
        if (emojiRegex === undefined) {
            emojiRegex = RegExp("^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$", "u");
        }
        return emojiRegex;
    },
    /**
     * Unused
     */
    uuid: /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/,
    /**
     * Unused
     */
    ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
    ipv4Cidr: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
    /**
     * Unused
     */
    ipv6: /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/,
    ipv6Cidr: /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
    base64: /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
    base64url: /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
    nanoid: /^[a-zA-Z0-9_-]{21}$/,
    jwt: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
};
function parseStringDef(def, refs) {
    const res = {
        type: "string",
    };
    if (def.checks) {
        for (const check of def.checks) {
            switch (check.kind) {
                case "min":
                    (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "minLength", typeof res.minLength === "number"
                        ? Math.max(res.minLength, check.value)
                        : check.value, check.message, refs);
                    break;
                case "max":
                    (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "maxLength", typeof res.maxLength === "number"
                        ? Math.min(res.maxLength, check.value)
                        : check.value, check.message, refs);
                    break;
                case "email":
                    switch (refs.emailStrategy) {
                        case "format:email":
                            addFormat(res, "email", check.message, refs);
                            break;
                        case "format:idn-email":
                            addFormat(res, "idn-email", check.message, refs);
                            break;
                        case "pattern:zod":
                            addPattern(res, zodPatterns.email, check.message, refs);
                            break;
                    }
                    break;
                case "url":
                    addFormat(res, "uri", check.message, refs);
                    break;
                case "uuid":
                    addFormat(res, "uuid", check.message, refs);
                    break;
                case "regex":
                    addPattern(res, check.regex, check.message, refs);
                    break;
                case "cuid":
                    addPattern(res, zodPatterns.cuid, check.message, refs);
                    break;
                case "cuid2":
                    addPattern(res, zodPatterns.cuid2, check.message, refs);
                    break;
                case "startsWith":
                    addPattern(res, RegExp(`^${escapeLiteralCheckValue(check.value, refs)}`), check.message, refs);
                    break;
                case "endsWith":
                    addPattern(res, RegExp(`${escapeLiteralCheckValue(check.value, refs)}$`), check.message, refs);
                    break;
                case "datetime":
                    addFormat(res, "date-time", check.message, refs);
                    break;
                case "date":
                    addFormat(res, "date", check.message, refs);
                    break;
                case "time":
                    addFormat(res, "time", check.message, refs);
                    break;
                case "duration":
                    addFormat(res, "duration", check.message, refs);
                    break;
                case "length":
                    (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "minLength", typeof res.minLength === "number"
                        ? Math.max(res.minLength, check.value)
                        : check.value, check.message, refs);
                    (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "maxLength", typeof res.maxLength === "number"
                        ? Math.min(res.maxLength, check.value)
                        : check.value, check.message, refs);
                    break;
                case "includes": {
                    addPattern(res, RegExp(escapeLiteralCheckValue(check.value, refs)), check.message, refs);
                    break;
                }
                case "ip": {
                    if (check.version !== "v6") {
                        addFormat(res, "ipv4", check.message, refs);
                    }
                    if (check.version !== "v4") {
                        addFormat(res, "ipv6", check.message, refs);
                    }
                    break;
                }
                case "base64url":
                    addPattern(res, zodPatterns.base64url, check.message, refs);
                    break;
                case "jwt":
                    addPattern(res, zodPatterns.jwt, check.message, refs);
                    break;
                case "cidr": {
                    if (check.version !== "v6") {
                        addPattern(res, zodPatterns.ipv4Cidr, check.message, refs);
                    }
                    if (check.version !== "v4") {
                        addPattern(res, zodPatterns.ipv6Cidr, check.message, refs);
                    }
                    break;
                }
                case "emoji":
                    addPattern(res, zodPatterns.emoji(), check.message, refs);
                    break;
                case "ulid": {
                    addPattern(res, zodPatterns.ulid, check.message, refs);
                    break;
                }
                case "base64": {
                    switch (refs.base64Strategy) {
                        case "format:binary": {
                            addFormat(res, "binary", check.message, refs);
                            break;
                        }
                        case "contentEncoding:base64": {
                            (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(res, "contentEncoding", "base64", check.message, refs);
                            break;
                        }
                        case "pattern:zod": {
                            addPattern(res, zodPatterns.base64, check.message, refs);
                            break;
                        }
                    }
                    break;
                }
                case "nanoid": {
                    addPattern(res, zodPatterns.nanoid, check.message, refs);
                }
                case "toLowerCase":
                case "toUpperCase":
                case "trim":
                    break;
                default:
                    /* c8 ignore next */
                    ((_) => { })(check);
            }
        }
    }
    return res;
}
function escapeLiteralCheckValue(literal, refs) {
    return refs.patternStrategy === "escape"
        ? escapeNonAlphaNumeric(literal)
        : literal;
}
const ALPHA_NUMERIC = new Set("ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789");
function escapeNonAlphaNumeric(source) {
    let result = "";
    for (let i = 0; i < source.length; i++) {
        if (!ALPHA_NUMERIC.has(source[i])) {
            result += "\\";
        }
        result += source[i];
    }
    return result;
}
// Adds a "format" keyword to the schema. If a format exists, both formats will be joined in an allOf-node, along with subsequent ones.
function addFormat(schema, value, message, refs) {
    if (schema.format || schema.anyOf?.some((x) => x.format)) {
        if (!schema.anyOf) {
            schema.anyOf = [];
        }
        if (schema.format) {
            schema.anyOf.push({
                format: schema.format,
                ...(schema.errorMessage &&
                    refs.errorMessages && {
                    errorMessage: { format: schema.errorMessage.format },
                }),
            });
            delete schema.format;
            if (schema.errorMessage) {
                delete schema.errorMessage.format;
                if (Object.keys(schema.errorMessage).length === 0) {
                    delete schema.errorMessage;
                }
            }
        }
        schema.anyOf.push({
            format: value,
            ...(message &&
                refs.errorMessages && { errorMessage: { format: message } }),
        });
    }
    else {
        (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(schema, "format", value, message, refs);
    }
}
// Adds a "pattern" keyword to the schema. If a pattern exists, both patterns will be joined in an allOf-node, along with subsequent ones.
function addPattern(schema, regex, message, refs) {
    if (schema.pattern || schema.allOf?.some((x) => x.pattern)) {
        if (!schema.allOf) {
            schema.allOf = [];
        }
        if (schema.pattern) {
            schema.allOf.push({
                pattern: schema.pattern,
                ...(schema.errorMessage &&
                    refs.errorMessages && {
                    errorMessage: { pattern: schema.errorMessage.pattern },
                }),
            });
            delete schema.pattern;
            if (schema.errorMessage) {
                delete schema.errorMessage.pattern;
                if (Object.keys(schema.errorMessage).length === 0) {
                    delete schema.errorMessage;
                }
            }
        }
        schema.allOf.push({
            pattern: stringifyRegExpWithFlags(regex, refs),
            ...(message &&
                refs.errorMessages && { errorMessage: { pattern: message } }),
        });
    }
    else {
        (0,_errorMessages_js__WEBPACK_IMPORTED_MODULE_0__.setResponseValueAndErrors)(schema, "pattern", stringifyRegExpWithFlags(regex, refs), message, refs);
    }
}
// Mutate z.string.regex() in a best attempt to accommodate for regex flags when applyRegexFlags is true
function stringifyRegExpWithFlags(regex, refs) {
    if (!refs.applyRegexFlags || !regex.flags) {
        return regex.source;
    }
    // Currently handled flags
    const flags = {
        i: regex.flags.includes("i"),
        m: regex.flags.includes("m"),
        s: regex.flags.includes("s"), // `.` matches newlines
    };
    // The general principle here is to step through each character, one at a time, applying mutations as flags require. We keep track when the current character is escaped, and when it's inside a group /like [this]/ or (also) a range like /[a-z]/. The following is fairly brittle imperative code; edit at your peril!
    const source = flags.i ? regex.source.toLowerCase() : regex.source;
    let pattern = "";
    let isEscaped = false;
    let inCharGroup = false;
    let inCharRange = false;
    for (let i = 0; i < source.length; i++) {
        if (isEscaped) {
            pattern += source[i];
            isEscaped = false;
            continue;
        }
        if (flags.i) {
            if (inCharGroup) {
                if (source[i].match(/[a-z]/)) {
                    if (inCharRange) {
                        pattern += source[i];
                        pattern += `${source[i - 2]}-${source[i]}`.toUpperCase();
                        inCharRange = false;
                    }
                    else if (source[i + 1] === "-" && source[i + 2]?.match(/[a-z]/)) {
                        pattern += source[i];
                        inCharRange = true;
                    }
                    else {
                        pattern += `${source[i]}${source[i].toUpperCase()}`;
                    }
                    continue;
                }
            }
            else if (source[i].match(/[a-z]/)) {
                pattern += `[${source[i]}${source[i].toUpperCase()}]`;
                continue;
            }
        }
        if (flags.m) {
            if (source[i] === "^") {
                pattern += `(^|(?<=[\r\n]))`;
                continue;
            }
            else if (source[i] === "$") {
                pattern += `($|(?=[\r\n]))`;
                continue;
            }
        }
        if (flags.s && source[i] === ".") {
            pattern += inCharGroup ? `${source[i]}\r\n` : `[${source[i]}\r\n]`;
            continue;
        }
        pattern += source[i];
        if (source[i] === "\\") {
            isEscaped = true;
        }
        else if (inCharGroup && source[i] === "]") {
            inCharGroup = false;
        }
        else if (!inCharGroup && source[i] === "[") {
            inCharGroup = true;
        }
    }
    try {
        new RegExp(pattern);
    }
    catch {
        console.warn(`Could not convert regex pattern at ${refs.currentPath.join("/")} to a flag-independent form! Falling back to the flag-ignorant source`);
        return regex.source;
    }
    return pattern;
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/tuple.js":
/*!*******************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/tuple.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseTupleDef: () => (/* binding */ parseTupleDef)
/* harmony export */ });
/* harmony import */ var _parseDef_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../parseDef.js */ "./node_modules/zod-to-json-schema/dist/esm/parseDef.js");

function parseTupleDef(def, refs) {
    if (def.rest) {
        return {
            type: "array",
            minItems: def.items.length,
            items: def.items
                .map((x, i) => (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(x._def, {
                ...refs,
                currentPath: [...refs.currentPath, "items", `${i}`],
            }))
                .reduce((acc, x) => (x === undefined ? acc : [...acc, x]), []),
            additionalItems: (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(def.rest._def, {
                ...refs,
                currentPath: [...refs.currentPath, "additionalItems"],
            }),
        };
    }
    else {
        return {
            type: "array",
            minItems: def.items.length,
            maxItems: def.items.length,
            items: def.items
                .map((x, i) => (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(x._def, {
                ...refs,
                currentPath: [...refs.currentPath, "items", `${i}`],
            }))
                .reduce((acc, x) => (x === undefined ? acc : [...acc, x]), []),
        };
    }
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/undefined.js":
/*!***********************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/undefined.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseUndefinedDef: () => (/* binding */ parseUndefinedDef)
/* harmony export */ });
function parseUndefinedDef() {
    return {
        not: {},
    };
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/union.js":
/*!*******************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/union.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseUnionDef: () => (/* binding */ parseUnionDef),
/* harmony export */   primitiveMappings: () => (/* binding */ primitiveMappings)
/* harmony export */ });
/* harmony import */ var _parseDef_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../parseDef.js */ "./node_modules/zod-to-json-schema/dist/esm/parseDef.js");

const primitiveMappings = {
    ZodString: "string",
    ZodNumber: "number",
    ZodBigInt: "integer",
    ZodBoolean: "boolean",
    ZodNull: "null",
};
function parseUnionDef(def, refs) {
    if (refs.target === "openApi3")
        return asAnyOf(def, refs);
    const options = def.options instanceof Map ? Array.from(def.options.values()) : def.options;
    // This blocks tries to look ahead a bit to produce nicer looking schemas with type array instead of anyOf.
    if (options.every((x) => x._def.typeName in primitiveMappings &&
        (!x._def.checks || !x._def.checks.length))) {
        // all types in union are primitive and lack checks, so might as well squash into {type: [...]}
        const types = options.reduce((types, x) => {
            const type = primitiveMappings[x._def.typeName]; //Can be safely casted due to row 43
            return type && !types.includes(type) ? [...types, type] : types;
        }, []);
        return {
            type: types.length > 1 ? types : types[0],
        };
    }
    else if (options.every((x) => x._def.typeName === "ZodLiteral" && !x.description)) {
        // all options literals
        const types = options.reduce((acc, x) => {
            const type = typeof x._def.value;
            switch (type) {
                case "string":
                case "number":
                case "boolean":
                    return [...acc, type];
                case "bigint":
                    return [...acc, "integer"];
                case "object":
                    if (x._def.value === null)
                        return [...acc, "null"];
                case "symbol":
                case "undefined":
                case "function":
                default:
                    return acc;
            }
        }, []);
        if (types.length === options.length) {
            // all the literals are primitive, as far as null can be considered primitive
            const uniqueTypes = types.filter((x, i, a) => a.indexOf(x) === i);
            return {
                type: uniqueTypes.length > 1 ? uniqueTypes : uniqueTypes[0],
                enum: options.reduce((acc, x) => {
                    return acc.includes(x._def.value) ? acc : [...acc, x._def.value];
                }, []),
            };
        }
    }
    else if (options.every((x) => x._def.typeName === "ZodEnum")) {
        return {
            type: "string",
            enum: options.reduce((acc, x) => [
                ...acc,
                ...x._def.values.filter((x) => !acc.includes(x)),
            ], []),
        };
    }
    return asAnyOf(def, refs);
}
const asAnyOf = (def, refs) => {
    const anyOf = (def.options instanceof Map
        ? Array.from(def.options.values())
        : def.options)
        .map((x, i) => (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(x._def, {
        ...refs,
        currentPath: [...refs.currentPath, "anyOf", `${i}`],
    }))
        .filter((x) => !!x &&
        (!refs.strictUnions ||
            (typeof x === "object" && Object.keys(x).length > 0)));
    return anyOf.length ? { anyOf } : undefined;
};


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/parsers/unknown.js":
/*!*********************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/parsers/unknown.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   parseUnknownDef: () => (/* binding */ parseUnknownDef)
/* harmony export */ });
function parseUnknownDef() {
    return {};
}


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/selectParser.js":
/*!******************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/selectParser.js ***!
  \******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   selectParser: () => (/* binding */ selectParser)
/* harmony export */ });
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_30__ = __webpack_require__(/*! zod */ "./node_modules/zod/lib/index.mjs");
/* harmony import */ var _parsers_any_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./parsers/any.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/any.js");
/* harmony import */ var _parsers_array_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./parsers/array.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/array.js");
/* harmony import */ var _parsers_bigint_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./parsers/bigint.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/bigint.js");
/* harmony import */ var _parsers_boolean_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./parsers/boolean.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/boolean.js");
/* harmony import */ var _parsers_branded_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./parsers/branded.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/branded.js");
/* harmony import */ var _parsers_catch_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./parsers/catch.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/catch.js");
/* harmony import */ var _parsers_date_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./parsers/date.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/date.js");
/* harmony import */ var _parsers_default_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./parsers/default.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/default.js");
/* harmony import */ var _parsers_effects_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./parsers/effects.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/effects.js");
/* harmony import */ var _parsers_enum_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./parsers/enum.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/enum.js");
/* harmony import */ var _parsers_intersection_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./parsers/intersection.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/intersection.js");
/* harmony import */ var _parsers_literal_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./parsers/literal.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/literal.js");
/* harmony import */ var _parsers_map_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./parsers/map.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/map.js");
/* harmony import */ var _parsers_nativeEnum_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./parsers/nativeEnum.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/nativeEnum.js");
/* harmony import */ var _parsers_never_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./parsers/never.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/never.js");
/* harmony import */ var _parsers_null_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ./parsers/null.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/null.js");
/* harmony import */ var _parsers_nullable_js__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./parsers/nullable.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/nullable.js");
/* harmony import */ var _parsers_number_js__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ./parsers/number.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/number.js");
/* harmony import */ var _parsers_object_js__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ./parsers/object.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/object.js");
/* harmony import */ var _parsers_optional_js__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ./parsers/optional.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/optional.js");
/* harmony import */ var _parsers_pipeline_js__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ./parsers/pipeline.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/pipeline.js");
/* harmony import */ var _parsers_promise_js__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ./parsers/promise.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/promise.js");
/* harmony import */ var _parsers_record_js__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! ./parsers/record.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/record.js");
/* harmony import */ var _parsers_set_js__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! ./parsers/set.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/set.js");
/* harmony import */ var _parsers_string_js__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(/*! ./parsers/string.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/string.js");
/* harmony import */ var _parsers_tuple_js__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(/*! ./parsers/tuple.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/tuple.js");
/* harmony import */ var _parsers_undefined_js__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(/*! ./parsers/undefined.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/undefined.js");
/* harmony import */ var _parsers_union_js__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(/*! ./parsers/union.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/union.js");
/* harmony import */ var _parsers_unknown_js__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(/*! ./parsers/unknown.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/unknown.js");
/* harmony import */ var _parsers_readonly_js__WEBPACK_IMPORTED_MODULE_29__ = __webpack_require__(/*! ./parsers/readonly.js */ "./node_modules/zod-to-json-schema/dist/esm/parsers/readonly.js");































const selectParser = (def, typeName, refs) => {
    switch (typeName) {
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodString:
            return (0,_parsers_string_js__WEBPACK_IMPORTED_MODULE_24__.parseStringDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodNumber:
            return (0,_parsers_number_js__WEBPACK_IMPORTED_MODULE_17__.parseNumberDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodObject:
            return (0,_parsers_object_js__WEBPACK_IMPORTED_MODULE_18__.parseObjectDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodBigInt:
            return (0,_parsers_bigint_js__WEBPACK_IMPORTED_MODULE_2__.parseBigintDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodBoolean:
            return (0,_parsers_boolean_js__WEBPACK_IMPORTED_MODULE_3__.parseBooleanDef)();
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodDate:
            return (0,_parsers_date_js__WEBPACK_IMPORTED_MODULE_6__.parseDateDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodUndefined:
            return (0,_parsers_undefined_js__WEBPACK_IMPORTED_MODULE_26__.parseUndefinedDef)();
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodNull:
            return (0,_parsers_null_js__WEBPACK_IMPORTED_MODULE_15__.parseNullDef)(refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodArray:
            return (0,_parsers_array_js__WEBPACK_IMPORTED_MODULE_1__.parseArrayDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodUnion:
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
            return (0,_parsers_union_js__WEBPACK_IMPORTED_MODULE_27__.parseUnionDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodIntersection:
            return (0,_parsers_intersection_js__WEBPACK_IMPORTED_MODULE_10__.parseIntersectionDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodTuple:
            return (0,_parsers_tuple_js__WEBPACK_IMPORTED_MODULE_25__.parseTupleDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodRecord:
            return (0,_parsers_record_js__WEBPACK_IMPORTED_MODULE_22__.parseRecordDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodLiteral:
            return (0,_parsers_literal_js__WEBPACK_IMPORTED_MODULE_11__.parseLiteralDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodEnum:
            return (0,_parsers_enum_js__WEBPACK_IMPORTED_MODULE_9__.parseEnumDef)(def);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodNativeEnum:
            return (0,_parsers_nativeEnum_js__WEBPACK_IMPORTED_MODULE_13__.parseNativeEnumDef)(def);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodNullable:
            return (0,_parsers_nullable_js__WEBPACK_IMPORTED_MODULE_16__.parseNullableDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodOptional:
            return (0,_parsers_optional_js__WEBPACK_IMPORTED_MODULE_19__.parseOptionalDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodMap:
            return (0,_parsers_map_js__WEBPACK_IMPORTED_MODULE_12__.parseMapDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodSet:
            return (0,_parsers_set_js__WEBPACK_IMPORTED_MODULE_23__.parseSetDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodLazy:
            return () => def.getter()._def;
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodPromise:
            return (0,_parsers_promise_js__WEBPACK_IMPORTED_MODULE_21__.parsePromiseDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodNaN:
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodNever:
            return (0,_parsers_never_js__WEBPACK_IMPORTED_MODULE_14__.parseNeverDef)();
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodEffects:
            return (0,_parsers_effects_js__WEBPACK_IMPORTED_MODULE_8__.parseEffectsDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodAny:
            return (0,_parsers_any_js__WEBPACK_IMPORTED_MODULE_0__.parseAnyDef)();
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodUnknown:
            return (0,_parsers_unknown_js__WEBPACK_IMPORTED_MODULE_28__.parseUnknownDef)();
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodDefault:
            return (0,_parsers_default_js__WEBPACK_IMPORTED_MODULE_7__.parseDefaultDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodBranded:
            return (0,_parsers_branded_js__WEBPACK_IMPORTED_MODULE_4__.parseBrandedDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodReadonly:
            return (0,_parsers_readonly_js__WEBPACK_IMPORTED_MODULE_29__.parseReadonlyDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodCatch:
            return (0,_parsers_catch_js__WEBPACK_IMPORTED_MODULE_5__.parseCatchDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodPipeline:
            return (0,_parsers_pipeline_js__WEBPACK_IMPORTED_MODULE_20__.parsePipelineDef)(def, refs);
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodFunction:
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodVoid:
        case zod__WEBPACK_IMPORTED_MODULE_30__.ZodFirstPartyTypeKind.ZodSymbol:
            return undefined;
        default:
            /* c8 ignore next */
            return ((_) => undefined)(typeName);
    }
};


/***/ }),

/***/ "./node_modules/zod-to-json-schema/dist/esm/zodToJsonSchema.js":
/*!*********************************************************************!*\
  !*** ./node_modules/zod-to-json-schema/dist/esm/zodToJsonSchema.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   zodToJsonSchema: () => (/* binding */ zodToJsonSchema)
/* harmony export */ });
/* harmony import */ var _parseDef_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./parseDef.js */ "./node_modules/zod-to-json-schema/dist/esm/parseDef.js");
/* harmony import */ var _Refs_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Refs.js */ "./node_modules/zod-to-json-schema/dist/esm/Refs.js");


const zodToJsonSchema = (schema, options) => {
    const refs = (0,_Refs_js__WEBPACK_IMPORTED_MODULE_1__.getRefs)(options);
    const definitions = typeof options === "object" && options.definitions
        ? Object.entries(options.definitions).reduce((acc, [name, schema]) => ({
            ...acc,
            [name]: (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(schema._def, {
                ...refs,
                currentPath: [...refs.basePath, refs.definitionPath, name],
            }, true) ?? {},
        }), {})
        : undefined;
    const name = typeof options === "string"
        ? options
        : options?.nameStrategy === "title"
            ? undefined
            : options?.name;
    const main = (0,_parseDef_js__WEBPACK_IMPORTED_MODULE_0__.parseDef)(schema._def, name === undefined
        ? refs
        : {
            ...refs,
            currentPath: [...refs.basePath, refs.definitionPath, name],
        }, false) ?? {};
    const title = typeof options === "object" &&
        options.name !== undefined &&
        options.nameStrategy === "title"
        ? options.name
        : undefined;
    if (title !== undefined) {
        main.title = title;
    }
    const combined = name === undefined
        ? definitions
            ? {
                ...main,
                [refs.definitionPath]: definitions,
            }
            : main
        : {
            $ref: [
                ...(refs.$refStrategy === "relative" ? [] : refs.basePath),
                refs.definitionPath,
                name,
            ].join("/"),
            [refs.definitionPath]: {
                ...definitions,
                [name]: main,
            },
        };
    if (refs.target === "jsonSchema7") {
        combined.$schema = "http://json-schema.org/draft-07/schema#";
    }
    else if (refs.target === "jsonSchema2019-09" || refs.target === "openAi") {
        combined.$schema = "https://json-schema.org/draft/2019-09/schema#";
    }
    if (refs.target === "openAi" &&
        ("anyOf" in combined ||
            "oneOf" in combined ||
            "allOf" in combined ||
            ("type" in combined && Array.isArray(combined.type)))) {
        console.warn("Warning: OpenAI may not support schemas with unions as roots! Try wrapping it in an object property.");
    }
    return combined;
};



/***/ }),

/***/ "./node_modules/zod/lib/index.mjs":
/*!****************************************!*\
  !*** ./node_modules/zod/lib/index.mjs ***!
  \****************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BRAND: () => (/* binding */ BRAND),
/* harmony export */   DIRTY: () => (/* binding */ DIRTY),
/* harmony export */   EMPTY_PATH: () => (/* binding */ EMPTY_PATH),
/* harmony export */   INVALID: () => (/* binding */ INVALID),
/* harmony export */   NEVER: () => (/* binding */ NEVER),
/* harmony export */   OK: () => (/* binding */ OK),
/* harmony export */   ParseStatus: () => (/* binding */ ParseStatus),
/* harmony export */   Schema: () => (/* binding */ ZodType),
/* harmony export */   ZodAny: () => (/* binding */ ZodAny),
/* harmony export */   ZodArray: () => (/* binding */ ZodArray),
/* harmony export */   ZodBigInt: () => (/* binding */ ZodBigInt),
/* harmony export */   ZodBoolean: () => (/* binding */ ZodBoolean),
/* harmony export */   ZodBranded: () => (/* binding */ ZodBranded),
/* harmony export */   ZodCatch: () => (/* binding */ ZodCatch),
/* harmony export */   ZodDate: () => (/* binding */ ZodDate),
/* harmony export */   ZodDefault: () => (/* binding */ ZodDefault),
/* harmony export */   ZodDiscriminatedUnion: () => (/* binding */ ZodDiscriminatedUnion),
/* harmony export */   ZodEffects: () => (/* binding */ ZodEffects),
/* harmony export */   ZodEnum: () => (/* binding */ ZodEnum),
/* harmony export */   ZodError: () => (/* binding */ ZodError),
/* harmony export */   ZodFirstPartyTypeKind: () => (/* binding */ ZodFirstPartyTypeKind),
/* harmony export */   ZodFunction: () => (/* binding */ ZodFunction),
/* harmony export */   ZodIntersection: () => (/* binding */ ZodIntersection),
/* harmony export */   ZodIssueCode: () => (/* binding */ ZodIssueCode),
/* harmony export */   ZodLazy: () => (/* binding */ ZodLazy),
/* harmony export */   ZodLiteral: () => (/* binding */ ZodLiteral),
/* harmony export */   ZodMap: () => (/* binding */ ZodMap),
/* harmony export */   ZodNaN: () => (/* binding */ ZodNaN),
/* harmony export */   ZodNativeEnum: () => (/* binding */ ZodNativeEnum),
/* harmony export */   ZodNever: () => (/* binding */ ZodNever),
/* harmony export */   ZodNull: () => (/* binding */ ZodNull),
/* harmony export */   ZodNullable: () => (/* binding */ ZodNullable),
/* harmony export */   ZodNumber: () => (/* binding */ ZodNumber),
/* harmony export */   ZodObject: () => (/* binding */ ZodObject),
/* harmony export */   ZodOptional: () => (/* binding */ ZodOptional),
/* harmony export */   ZodParsedType: () => (/* binding */ ZodParsedType),
/* harmony export */   ZodPipeline: () => (/* binding */ ZodPipeline),
/* harmony export */   ZodPromise: () => (/* binding */ ZodPromise),
/* harmony export */   ZodReadonly: () => (/* binding */ ZodReadonly),
/* harmony export */   ZodRecord: () => (/* binding */ ZodRecord),
/* harmony export */   ZodSchema: () => (/* binding */ ZodType),
/* harmony export */   ZodSet: () => (/* binding */ ZodSet),
/* harmony export */   ZodString: () => (/* binding */ ZodString),
/* harmony export */   ZodSymbol: () => (/* binding */ ZodSymbol),
/* harmony export */   ZodTransformer: () => (/* binding */ ZodEffects),
/* harmony export */   ZodTuple: () => (/* binding */ ZodTuple),
/* harmony export */   ZodType: () => (/* binding */ ZodType),
/* harmony export */   ZodUndefined: () => (/* binding */ ZodUndefined),
/* harmony export */   ZodUnion: () => (/* binding */ ZodUnion),
/* harmony export */   ZodUnknown: () => (/* binding */ ZodUnknown),
/* harmony export */   ZodVoid: () => (/* binding */ ZodVoid),
/* harmony export */   addIssueToContext: () => (/* binding */ addIssueToContext),
/* harmony export */   any: () => (/* binding */ anyType),
/* harmony export */   array: () => (/* binding */ arrayType),
/* harmony export */   bigint: () => (/* binding */ bigIntType),
/* harmony export */   boolean: () => (/* binding */ booleanType),
/* harmony export */   coerce: () => (/* binding */ coerce),
/* harmony export */   custom: () => (/* binding */ custom),
/* harmony export */   date: () => (/* binding */ dateType),
/* harmony export */   datetimeRegex: () => (/* binding */ datetimeRegex),
/* harmony export */   "default": () => (/* binding */ z),
/* harmony export */   defaultErrorMap: () => (/* binding */ errorMap),
/* harmony export */   discriminatedUnion: () => (/* binding */ discriminatedUnionType),
/* harmony export */   effect: () => (/* binding */ effectsType),
/* harmony export */   "enum": () => (/* binding */ enumType),
/* harmony export */   "function": () => (/* binding */ functionType),
/* harmony export */   getErrorMap: () => (/* binding */ getErrorMap),
/* harmony export */   getParsedType: () => (/* binding */ getParsedType),
/* harmony export */   "instanceof": () => (/* binding */ instanceOfType),
/* harmony export */   intersection: () => (/* binding */ intersectionType),
/* harmony export */   isAborted: () => (/* binding */ isAborted),
/* harmony export */   isAsync: () => (/* binding */ isAsync),
/* harmony export */   isDirty: () => (/* binding */ isDirty),
/* harmony export */   isValid: () => (/* binding */ isValid),
/* harmony export */   late: () => (/* binding */ late),
/* harmony export */   lazy: () => (/* binding */ lazyType),
/* harmony export */   literal: () => (/* binding */ literalType),
/* harmony export */   makeIssue: () => (/* binding */ makeIssue),
/* harmony export */   map: () => (/* binding */ mapType),
/* harmony export */   nan: () => (/* binding */ nanType),
/* harmony export */   nativeEnum: () => (/* binding */ nativeEnumType),
/* harmony export */   never: () => (/* binding */ neverType),
/* harmony export */   "null": () => (/* binding */ nullType),
/* harmony export */   nullable: () => (/* binding */ nullableType),
/* harmony export */   number: () => (/* binding */ numberType),
/* harmony export */   object: () => (/* binding */ objectType),
/* harmony export */   objectUtil: () => (/* binding */ objectUtil),
/* harmony export */   oboolean: () => (/* binding */ oboolean),
/* harmony export */   onumber: () => (/* binding */ onumber),
/* harmony export */   optional: () => (/* binding */ optionalType),
/* harmony export */   ostring: () => (/* binding */ ostring),
/* harmony export */   pipeline: () => (/* binding */ pipelineType),
/* harmony export */   preprocess: () => (/* binding */ preprocessType),
/* harmony export */   promise: () => (/* binding */ promiseType),
/* harmony export */   quotelessJson: () => (/* binding */ quotelessJson),
/* harmony export */   record: () => (/* binding */ recordType),
/* harmony export */   set: () => (/* binding */ setType),
/* harmony export */   setErrorMap: () => (/* binding */ setErrorMap),
/* harmony export */   strictObject: () => (/* binding */ strictObjectType),
/* harmony export */   string: () => (/* binding */ stringType),
/* harmony export */   symbol: () => (/* binding */ symbolType),
/* harmony export */   transformer: () => (/* binding */ effectsType),
/* harmony export */   tuple: () => (/* binding */ tupleType),
/* harmony export */   undefined: () => (/* binding */ undefinedType),
/* harmony export */   union: () => (/* binding */ unionType),
/* harmony export */   unknown: () => (/* binding */ unknownType),
/* harmony export */   util: () => (/* binding */ util),
/* harmony export */   "void": () => (/* binding */ voidType),
/* harmony export */   z: () => (/* binding */ z)
/* harmony export */ });
var util;
(function (util) {
    util.assertEqual = (val) => val;
    function assertIs(_arg) { }
    util.assertIs = assertIs;
    function assertNever(_x) {
        throw new Error();
    }
    util.assertNever = assertNever;
    util.arrayToEnum = (items) => {
        const obj = {};
        for (const item of items) {
            obj[item] = item;
        }
        return obj;
    };
    util.getValidEnumValues = (obj) => {
        const validKeys = util.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
        const filtered = {};
        for (const k of validKeys) {
            filtered[k] = obj[k];
        }
        return util.objectValues(filtered);
    };
    util.objectValues = (obj) => {
        return util.objectKeys(obj).map(function (e) {
            return obj[e];
        });
    };
    util.objectKeys = typeof Object.keys === "function" // eslint-disable-line ban/ban
        ? (obj) => Object.keys(obj) // eslint-disable-line ban/ban
        : (object) => {
            const keys = [];
            for (const key in object) {
                if (Object.prototype.hasOwnProperty.call(object, key)) {
                    keys.push(key);
                }
            }
            return keys;
        };
    util.find = (arr, checker) => {
        for (const item of arr) {
            if (checker(item))
                return item;
        }
        return undefined;
    };
    util.isInteger = typeof Number.isInteger === "function"
        ? (val) => Number.isInteger(val) // eslint-disable-line ban/ban
        : (val) => typeof val === "number" && isFinite(val) && Math.floor(val) === val;
    function joinValues(array, separator = " | ") {
        return array
            .map((val) => (typeof val === "string" ? `'${val}'` : val))
            .join(separator);
    }
    util.joinValues = joinValues;
    util.jsonStringifyReplacer = (_, value) => {
        if (typeof value === "bigint") {
            return value.toString();
        }
        return value;
    };
})(util || (util = {}));
var objectUtil;
(function (objectUtil) {
    objectUtil.mergeShapes = (first, second) => {
        return {
            ...first,
            ...second, // second overwrites first
        };
    };
})(objectUtil || (objectUtil = {}));
const ZodParsedType = util.arrayToEnum([
    "string",
    "nan",
    "number",
    "integer",
    "float",
    "boolean",
    "date",
    "bigint",
    "symbol",
    "function",
    "undefined",
    "null",
    "array",
    "object",
    "unknown",
    "promise",
    "void",
    "never",
    "map",
    "set",
]);
const getParsedType = (data) => {
    const t = typeof data;
    switch (t) {
        case "undefined":
            return ZodParsedType.undefined;
        case "string":
            return ZodParsedType.string;
        case "number":
            return isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
        case "boolean":
            return ZodParsedType.boolean;
        case "function":
            return ZodParsedType.function;
        case "bigint":
            return ZodParsedType.bigint;
        case "symbol":
            return ZodParsedType.symbol;
        case "object":
            if (Array.isArray(data)) {
                return ZodParsedType.array;
            }
            if (data === null) {
                return ZodParsedType.null;
            }
            if (data.then &&
                typeof data.then === "function" &&
                data.catch &&
                typeof data.catch === "function") {
                return ZodParsedType.promise;
            }
            if (typeof Map !== "undefined" && data instanceof Map) {
                return ZodParsedType.map;
            }
            if (typeof Set !== "undefined" && data instanceof Set) {
                return ZodParsedType.set;
            }
            if (typeof Date !== "undefined" && data instanceof Date) {
                return ZodParsedType.date;
            }
            return ZodParsedType.object;
        default:
            return ZodParsedType.unknown;
    }
};

const ZodIssueCode = util.arrayToEnum([
    "invalid_type",
    "invalid_literal",
    "custom",
    "invalid_union",
    "invalid_union_discriminator",
    "invalid_enum_value",
    "unrecognized_keys",
    "invalid_arguments",
    "invalid_return_type",
    "invalid_date",
    "invalid_string",
    "too_small",
    "too_big",
    "invalid_intersection_types",
    "not_multiple_of",
    "not_finite",
]);
const quotelessJson = (obj) => {
    const json = JSON.stringify(obj, null, 2);
    return json.replace(/"([^"]+)":/g, "$1:");
};
class ZodError extends Error {
    get errors() {
        return this.issues;
    }
    constructor(issues) {
        super();
        this.issues = [];
        this.addIssue = (sub) => {
            this.issues = [...this.issues, sub];
        };
        this.addIssues = (subs = []) => {
            this.issues = [...this.issues, ...subs];
        };
        const actualProto = new.target.prototype;
        if (Object.setPrototypeOf) {
            // eslint-disable-next-line ban/ban
            Object.setPrototypeOf(this, actualProto);
        }
        else {
            this.__proto__ = actualProto;
        }
        this.name = "ZodError";
        this.issues = issues;
    }
    format(_mapper) {
        const mapper = _mapper ||
            function (issue) {
                return issue.message;
            };
        const fieldErrors = { _errors: [] };
        const processError = (error) => {
            for (const issue of error.issues) {
                if (issue.code === "invalid_union") {
                    issue.unionErrors.map(processError);
                }
                else if (issue.code === "invalid_return_type") {
                    processError(issue.returnTypeError);
                }
                else if (issue.code === "invalid_arguments") {
                    processError(issue.argumentsError);
                }
                else if (issue.path.length === 0) {
                    fieldErrors._errors.push(mapper(issue));
                }
                else {
                    let curr = fieldErrors;
                    let i = 0;
                    while (i < issue.path.length) {
                        const el = issue.path[i];
                        const terminal = i === issue.path.length - 1;
                        if (!terminal) {
                            curr[el] = curr[el] || { _errors: [] };
                            // if (typeof el === "string") {
                            //   curr[el] = curr[el] || { _errors: [] };
                            // } else if (typeof el === "number") {
                            //   const errorArray: any = [];
                            //   errorArray._errors = [];
                            //   curr[el] = curr[el] || errorArray;
                            // }
                        }
                        else {
                            curr[el] = curr[el] || { _errors: [] };
                            curr[el]._errors.push(mapper(issue));
                        }
                        curr = curr[el];
                        i++;
                    }
                }
            }
        };
        processError(this);
        return fieldErrors;
    }
    static assert(value) {
        if (!(value instanceof ZodError)) {
            throw new Error(`Not a ZodError: ${value}`);
        }
    }
    toString() {
        return this.message;
    }
    get message() {
        return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
    }
    get isEmpty() {
        return this.issues.length === 0;
    }
    flatten(mapper = (issue) => issue.message) {
        const fieldErrors = {};
        const formErrors = [];
        for (const sub of this.issues) {
            if (sub.path.length > 0) {
                fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
                fieldErrors[sub.path[0]].push(mapper(sub));
            }
            else {
                formErrors.push(mapper(sub));
            }
        }
        return { formErrors, fieldErrors };
    }
    get formErrors() {
        return this.flatten();
    }
}
ZodError.create = (issues) => {
    const error = new ZodError(issues);
    return error;
};

const errorMap = (issue, _ctx) => {
    let message;
    switch (issue.code) {
        case ZodIssueCode.invalid_type:
            if (issue.received === ZodParsedType.undefined) {
                message = "Required";
            }
            else {
                message = `Expected ${issue.expected}, received ${issue.received}`;
            }
            break;
        case ZodIssueCode.invalid_literal:
            message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
            break;
        case ZodIssueCode.unrecognized_keys:
            message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
            break;
        case ZodIssueCode.invalid_union:
            message = `Invalid input`;
            break;
        case ZodIssueCode.invalid_union_discriminator:
            message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
            break;
        case ZodIssueCode.invalid_enum_value:
            message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
            break;
        case ZodIssueCode.invalid_arguments:
            message = `Invalid function arguments`;
            break;
        case ZodIssueCode.invalid_return_type:
            message = `Invalid function return type`;
            break;
        case ZodIssueCode.invalid_date:
            message = `Invalid date`;
            break;
        case ZodIssueCode.invalid_string:
            if (typeof issue.validation === "object") {
                if ("includes" in issue.validation) {
                    message = `Invalid input: must include "${issue.validation.includes}"`;
                    if (typeof issue.validation.position === "number") {
                        message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
                    }
                }
                else if ("startsWith" in issue.validation) {
                    message = `Invalid input: must start with "${issue.validation.startsWith}"`;
                }
                else if ("endsWith" in issue.validation) {
                    message = `Invalid input: must end with "${issue.validation.endsWith}"`;
                }
                else {
                    util.assertNever(issue.validation);
                }
            }
            else if (issue.validation !== "regex") {
                message = `Invalid ${issue.validation}`;
            }
            else {
                message = "Invalid";
            }
            break;
        case ZodIssueCode.too_small:
            if (issue.type === "array")
                message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
            else if (issue.type === "string")
                message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
            else if (issue.type === "number")
                message = `Number must be ${issue.exact
                    ? `exactly equal to `
                    : issue.inclusive
                        ? `greater than or equal to `
                        : `greater than `}${issue.minimum}`;
            else if (issue.type === "date")
                message = `Date must be ${issue.exact
                    ? `exactly equal to `
                    : issue.inclusive
                        ? `greater than or equal to `
                        : `greater than `}${new Date(Number(issue.minimum))}`;
            else
                message = "Invalid input";
            break;
        case ZodIssueCode.too_big:
            if (issue.type === "array")
                message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
            else if (issue.type === "string")
                message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
            else if (issue.type === "number")
                message = `Number must be ${issue.exact
                    ? `exactly`
                    : issue.inclusive
                        ? `less than or equal to`
                        : `less than`} ${issue.maximum}`;
            else if (issue.type === "bigint")
                message = `BigInt must be ${issue.exact
                    ? `exactly`
                    : issue.inclusive
                        ? `less than or equal to`
                        : `less than`} ${issue.maximum}`;
            else if (issue.type === "date")
                message = `Date must be ${issue.exact
                    ? `exactly`
                    : issue.inclusive
                        ? `smaller than or equal to`
                        : `smaller than`} ${new Date(Number(issue.maximum))}`;
            else
                message = "Invalid input";
            break;
        case ZodIssueCode.custom:
            message = `Invalid input`;
            break;
        case ZodIssueCode.invalid_intersection_types:
            message = `Intersection results could not be merged`;
            break;
        case ZodIssueCode.not_multiple_of:
            message = `Number must be a multiple of ${issue.multipleOf}`;
            break;
        case ZodIssueCode.not_finite:
            message = "Number must be finite";
            break;
        default:
            message = _ctx.defaultError;
            util.assertNever(issue);
    }
    return { message };
};

let overrideErrorMap = errorMap;
function setErrorMap(map) {
    overrideErrorMap = map;
}
function getErrorMap() {
    return overrideErrorMap;
}

const makeIssue = (params) => {
    const { data, path, errorMaps, issueData } = params;
    const fullPath = [...path, ...(issueData.path || [])];
    const fullIssue = {
        ...issueData,
        path: fullPath,
    };
    if (issueData.message !== undefined) {
        return {
            ...issueData,
            path: fullPath,
            message: issueData.message,
        };
    }
    let errorMessage = "";
    const maps = errorMaps
        .filter((m) => !!m)
        .slice()
        .reverse();
    for (const map of maps) {
        errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
    }
    return {
        ...issueData,
        path: fullPath,
        message: errorMessage,
    };
};
const EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
    const overrideMap = getErrorMap();
    const issue = makeIssue({
        issueData: issueData,
        data: ctx.data,
        path: ctx.path,
        errorMaps: [
            ctx.common.contextualErrorMap, // contextual error map is first priority
            ctx.schemaErrorMap, // then schema-bound map if available
            overrideMap, // then global override map
            overrideMap === errorMap ? undefined : errorMap, // then global default map
        ].filter((x) => !!x),
    });
    ctx.common.issues.push(issue);
}
class ParseStatus {
    constructor() {
        this.value = "valid";
    }
    dirty() {
        if (this.value === "valid")
            this.value = "dirty";
    }
    abort() {
        if (this.value !== "aborted")
            this.value = "aborted";
    }
    static mergeArray(status, results) {
        const arrayValue = [];
        for (const s of results) {
            if (s.status === "aborted")
                return INVALID;
            if (s.status === "dirty")
                status.dirty();
            arrayValue.push(s.value);
        }
        return { status: status.value, value: arrayValue };
    }
    static async mergeObjectAsync(status, pairs) {
        const syncPairs = [];
        for (const pair of pairs) {
            const key = await pair.key;
            const value = await pair.value;
            syncPairs.push({
                key,
                value,
            });
        }
        return ParseStatus.mergeObjectSync(status, syncPairs);
    }
    static mergeObjectSync(status, pairs) {
        const finalObject = {};
        for (const pair of pairs) {
            const { key, value } = pair;
            if (key.status === "aborted")
                return INVALID;
            if (value.status === "aborted")
                return INVALID;
            if (key.status === "dirty")
                status.dirty();
            if (value.status === "dirty")
                status.dirty();
            if (key.value !== "__proto__" &&
                (typeof value.value !== "undefined" || pair.alwaysSet)) {
                finalObject[key.value] = value.value;
            }
        }
        return { status: status.value, value: finalObject };
    }
}
const INVALID = Object.freeze({
    status: "aborted",
});
const DIRTY = (value) => ({ status: "dirty", value });
const OK = (value) => ({ status: "valid", value });
const isAborted = (x) => x.status === "aborted";
const isDirty = (x) => x.status === "dirty";
const isValid = (x) => x.status === "valid";
const isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

var errorUtil;
(function (errorUtil) {
    errorUtil.errToObj = (message) => typeof message === "string" ? { message } : message || {};
    errorUtil.toString = (message) => typeof message === "string" ? message : message === null || message === void 0 ? void 0 : message.message;
})(errorUtil || (errorUtil = {}));

var _ZodEnum_cache, _ZodNativeEnum_cache;
class ParseInputLazyPath {
    constructor(parent, value, path, key) {
        this._cachedPath = [];
        this.parent = parent;
        this.data = value;
        this._path = path;
        this._key = key;
    }
    get path() {
        if (!this._cachedPath.length) {
            if (this._key instanceof Array) {
                this._cachedPath.push(...this._path, ...this._key);
            }
            else {
                this._cachedPath.push(...this._path, this._key);
            }
        }
        return this._cachedPath;
    }
}
const handleResult = (ctx, result) => {
    if (isValid(result)) {
        return { success: true, data: result.value };
    }
    else {
        if (!ctx.common.issues.length) {
            throw new Error("Validation failed but no issues detected.");
        }
        return {
            success: false,
            get error() {
                if (this._error)
                    return this._error;
                const error = new ZodError(ctx.common.issues);
                this._error = error;
                return this._error;
            },
        };
    }
};
function processCreateParams(params) {
    if (!params)
        return {};
    const { errorMap, invalid_type_error, required_error, description } = params;
    if (errorMap && (invalid_type_error || required_error)) {
        throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
    }
    if (errorMap)
        return { errorMap: errorMap, description };
    const customMap = (iss, ctx) => {
        var _a, _b;
        const { message } = params;
        if (iss.code === "invalid_enum_value") {
            return { message: message !== null && message !== void 0 ? message : ctx.defaultError };
        }
        if (typeof ctx.data === "undefined") {
            return { message: (_a = message !== null && message !== void 0 ? message : required_error) !== null && _a !== void 0 ? _a : ctx.defaultError };
        }
        if (iss.code !== "invalid_type")
            return { message: ctx.defaultError };
        return { message: (_b = message !== null && message !== void 0 ? message : invalid_type_error) !== null && _b !== void 0 ? _b : ctx.defaultError };
    };
    return { errorMap: customMap, description };
}
class ZodType {
    get description() {
        return this._def.description;
    }
    _getType(input) {
        return getParsedType(input.data);
    }
    _getOrReturnCtx(input, ctx) {
        return (ctx || {
            common: input.parent.common,
            data: input.data,
            parsedType: getParsedType(input.data),
            schemaErrorMap: this._def.errorMap,
            path: input.path,
            parent: input.parent,
        });
    }
    _processInputParams(input) {
        return {
            status: new ParseStatus(),
            ctx: {
                common: input.parent.common,
                data: input.data,
                parsedType: getParsedType(input.data),
                schemaErrorMap: this._def.errorMap,
                path: input.path,
                parent: input.parent,
            },
        };
    }
    _parseSync(input) {
        const result = this._parse(input);
        if (isAsync(result)) {
            throw new Error("Synchronous parse encountered promise.");
        }
        return result;
    }
    _parseAsync(input) {
        const result = this._parse(input);
        return Promise.resolve(result);
    }
    parse(data, params) {
        const result = this.safeParse(data, params);
        if (result.success)
            return result.data;
        throw result.error;
    }
    safeParse(data, params) {
        var _a;
        const ctx = {
            common: {
                issues: [],
                async: (_a = params === null || params === void 0 ? void 0 : params.async) !== null && _a !== void 0 ? _a : false,
                contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap,
            },
            path: (params === null || params === void 0 ? void 0 : params.path) || [],
            schemaErrorMap: this._def.errorMap,
            parent: null,
            data,
            parsedType: getParsedType(data),
        };
        const result = this._parseSync({ data, path: ctx.path, parent: ctx });
        return handleResult(ctx, result);
    }
    "~validate"(data) {
        var _a, _b;
        const ctx = {
            common: {
                issues: [],
                async: !!this["~standard"].async,
            },
            path: [],
            schemaErrorMap: this._def.errorMap,
            parent: null,
            data,
            parsedType: getParsedType(data),
        };
        if (!this["~standard"].async) {
            try {
                const result = this._parseSync({ data, path: [], parent: ctx });
                return isValid(result)
                    ? {
                        value: result.value,
                    }
                    : {
                        issues: ctx.common.issues,
                    };
            }
            catch (err) {
                if ((_b = (_a = err === null || err === void 0 ? void 0 : err.message) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === null || _b === void 0 ? void 0 : _b.includes("encountered")) {
                    this["~standard"].async = true;
                }
                ctx.common = {
                    issues: [],
                    async: true,
                };
            }
        }
        return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result)
            ? {
                value: result.value,
            }
            : {
                issues: ctx.common.issues,
            });
    }
    async parseAsync(data, params) {
        const result = await this.safeParseAsync(data, params);
        if (result.success)
            return result.data;
        throw result.error;
    }
    async safeParseAsync(data, params) {
        const ctx = {
            common: {
                issues: [],
                contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap,
                async: true,
            },
            path: (params === null || params === void 0 ? void 0 : params.path) || [],
            schemaErrorMap: this._def.errorMap,
            parent: null,
            data,
            parsedType: getParsedType(data),
        };
        const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
        const result = await (isAsync(maybeAsyncResult)
            ? maybeAsyncResult
            : Promise.resolve(maybeAsyncResult));
        return handleResult(ctx, result);
    }
    refine(check, message) {
        const getIssueProperties = (val) => {
            if (typeof message === "string" || typeof message === "undefined") {
                return { message };
            }
            else if (typeof message === "function") {
                return message(val);
            }
            else {
                return message;
            }
        };
        return this._refinement((val, ctx) => {
            const result = check(val);
            const setError = () => ctx.addIssue({
                code: ZodIssueCode.custom,
                ...getIssueProperties(val),
            });
            if (typeof Promise !== "undefined" && result instanceof Promise) {
                return result.then((data) => {
                    if (!data) {
                        setError();
                        return false;
                    }
                    else {
                        return true;
                    }
                });
            }
            if (!result) {
                setError();
                return false;
            }
            else {
                return true;
            }
        });
    }
    refinement(check, refinementData) {
        return this._refinement((val, ctx) => {
            if (!check(val)) {
                ctx.addIssue(typeof refinementData === "function"
                    ? refinementData(val, ctx)
                    : refinementData);
                return false;
            }
            else {
                return true;
            }
        });
    }
    _refinement(refinement) {
        return new ZodEffects({
            schema: this,
            typeName: ZodFirstPartyTypeKind.ZodEffects,
            effect: { type: "refinement", refinement },
        });
    }
    superRefine(refinement) {
        return this._refinement(refinement);
    }
    constructor(def) {
        /** Alias of safeParseAsync */
        this.spa = this.safeParseAsync;
        this._def = def;
        this.parse = this.parse.bind(this);
        this.safeParse = this.safeParse.bind(this);
        this.parseAsync = this.parseAsync.bind(this);
        this.safeParseAsync = this.safeParseAsync.bind(this);
        this.spa = this.spa.bind(this);
        this.refine = this.refine.bind(this);
        this.refinement = this.refinement.bind(this);
        this.superRefine = this.superRefine.bind(this);
        this.optional = this.optional.bind(this);
        this.nullable = this.nullable.bind(this);
        this.nullish = this.nullish.bind(this);
        this.array = this.array.bind(this);
        this.promise = this.promise.bind(this);
        this.or = this.or.bind(this);
        this.and = this.and.bind(this);
        this.transform = this.transform.bind(this);
        this.brand = this.brand.bind(this);
        this.default = this.default.bind(this);
        this.catch = this.catch.bind(this);
        this.describe = this.describe.bind(this);
        this.pipe = this.pipe.bind(this);
        this.readonly = this.readonly.bind(this);
        this.isNullable = this.isNullable.bind(this);
        this.isOptional = this.isOptional.bind(this);
        this["~standard"] = {
            version: 1,
            vendor: "zod",
            validate: (data) => this["~validate"](data),
        };
    }
    optional() {
        return ZodOptional.create(this, this._def);
    }
    nullable() {
        return ZodNullable.create(this, this._def);
    }
    nullish() {
        return this.nullable().optional();
    }
    array() {
        return ZodArray.create(this);
    }
    promise() {
        return ZodPromise.create(this, this._def);
    }
    or(option) {
        return ZodUnion.create([this, option], this._def);
    }
    and(incoming) {
        return ZodIntersection.create(this, incoming, this._def);
    }
    transform(transform) {
        return new ZodEffects({
            ...processCreateParams(this._def),
            schema: this,
            typeName: ZodFirstPartyTypeKind.ZodEffects,
            effect: { type: "transform", transform },
        });
    }
    default(def) {
        const defaultValueFunc = typeof def === "function" ? def : () => def;
        return new ZodDefault({
            ...processCreateParams(this._def),
            innerType: this,
            defaultValue: defaultValueFunc,
            typeName: ZodFirstPartyTypeKind.ZodDefault,
        });
    }
    brand() {
        return new ZodBranded({
            typeName: ZodFirstPartyTypeKind.ZodBranded,
            type: this,
            ...processCreateParams(this._def),
        });
    }
    catch(def) {
        const catchValueFunc = typeof def === "function" ? def : () => def;
        return new ZodCatch({
            ...processCreateParams(this._def),
            innerType: this,
            catchValue: catchValueFunc,
            typeName: ZodFirstPartyTypeKind.ZodCatch,
        });
    }
    describe(description) {
        const This = this.constructor;
        return new This({
            ...this._def,
            description,
        });
    }
    pipe(target) {
        return ZodPipeline.create(this, target);
    }
    readonly() {
        return ZodReadonly.create(this);
    }
    isOptional() {
        return this.safeParse(undefined).success;
    }
    isNullable() {
        return this.safeParse(null).success;
    }
}
const cuidRegex = /^c[^\s-]{8,}$/i;
const cuid2Regex = /^[0-9a-z]+$/;
const ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
// const uuidRegex =
//   /^([a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[a-f0-9]{4}-[a-f0-9]{12}|00000000-0000-0000-0000-000000000000)$/i;
const uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
const nanoidRegex = /^[a-z0-9_-]{21}$/i;
const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
const durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
// from https://stackoverflow.com/a/46181/1550155
// old version: too slow, didn't support unicode
// const emailRegex = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i;
//old email regex
// const emailRegex = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@((?!-)([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{1,})[^-<>()[\].,;:\s@"]$/i;
// eslint-disable-next-line
// const emailRegex =
//   /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\])|(\[IPv6:(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))\])|([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])*(\.[A-Za-z]{2,})+))$/;
// const emailRegex =
//   /^[a-zA-Z0-9\.\!\#\$\%\&\'\*\+\/\=\?\^\_\`\{\|\}\~\-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
// const emailRegex =
//   /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;
const emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
// const emailRegex =
//   /^[a-z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9\-]+)*$/i;
// from https://thekevinscott.com/emojis-in-javascript/#writing-a-regular-expression
const _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
let emojiRegex;
// faster, simpler, safer
const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
const ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
// const ipv6Regex =
// /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/;
const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
const ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
// https://stackoverflow.com/questions/7860392/determine-if-string-is-in-base64-using-javascript
const base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
// https://base64.guru/standards/base64url
const base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
// simple
// const dateRegexSource = `\\d{4}-\\d{2}-\\d{2}`;
// no leap year validation
// const dateRegexSource = `\\d{4}-((0[13578]|10|12)-31|(0[13-9]|1[0-2])-30|(0[1-9]|1[0-2])-(0[1-9]|1\\d|2\\d))`;
// with leap year validation
const dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
const dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
    // let regex = `\\d{2}:\\d{2}:\\d{2}`;
    let regex = `([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d`;
    if (args.precision) {
        regex = `${regex}\\.\\d{${args.precision}}`;
    }
    else if (args.precision == null) {
        regex = `${regex}(\\.\\d+)?`;
    }
    return regex;
}
function timeRegex(args) {
    return new RegExp(`^${timeRegexSource(args)}$`);
}
// Adapted from https://stackoverflow.com/a/3143231
function datetimeRegex(args) {
    let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
    const opts = [];
    opts.push(args.local ? `Z?` : `Z`);
    if (args.offset)
        opts.push(`([+-]\\d{2}:?\\d{2})`);
    regex = `${regex}(${opts.join("|")})`;
    return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
    if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
        return true;
    }
    if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
        return true;
    }
    return false;
}
function isValidJWT(jwt, alg) {
    if (!jwtRegex.test(jwt))
        return false;
    try {
        const [header] = jwt.split(".");
        // Convert base64url to base64
        const base64 = header
            .replace(/-/g, "+")
            .replace(/_/g, "/")
            .padEnd(header.length + ((4 - (header.length % 4)) % 4), "=");
        const decoded = JSON.parse(atob(base64));
        if (typeof decoded !== "object" || decoded === null)
            return false;
        if (!decoded.typ || !decoded.alg)
            return false;
        if (alg && decoded.alg !== alg)
            return false;
        return true;
    }
    catch (_a) {
        return false;
    }
}
function isValidCidr(ip, version) {
    if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
        return true;
    }
    if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
        return true;
    }
    return false;
}
class ZodString extends ZodType {
    _parse(input) {
        if (this._def.coerce) {
            input.data = String(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.string) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.string,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        const status = new ParseStatus();
        let ctx = undefined;
        for (const check of this._def.checks) {
            if (check.kind === "min") {
                if (input.data.length < check.value) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_small,
                        minimum: check.value,
                        type: "string",
                        inclusive: true,
                        exact: false,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "max") {
                if (input.data.length > check.value) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_big,
                        maximum: check.value,
                        type: "string",
                        inclusive: true,
                        exact: false,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "length") {
                const tooBig = input.data.length > check.value;
                const tooSmall = input.data.length < check.value;
                if (tooBig || tooSmall) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    if (tooBig) {
                        addIssueToContext(ctx, {
                            code: ZodIssueCode.too_big,
                            maximum: check.value,
                            type: "string",
                            inclusive: true,
                            exact: true,
                            message: check.message,
                        });
                    }
                    else if (tooSmall) {
                        addIssueToContext(ctx, {
                            code: ZodIssueCode.too_small,
                            minimum: check.value,
                            type: "string",
                            inclusive: true,
                            exact: true,
                            message: check.message,
                        });
                    }
                    status.dirty();
                }
            }
            else if (check.kind === "email") {
                if (!emailRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "email",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "emoji") {
                if (!emojiRegex) {
                    emojiRegex = new RegExp(_emojiRegex, "u");
                }
                if (!emojiRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "emoji",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "uuid") {
                if (!uuidRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "uuid",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "nanoid") {
                if (!nanoidRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "nanoid",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "cuid") {
                if (!cuidRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "cuid",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "cuid2") {
                if (!cuid2Regex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "cuid2",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "ulid") {
                if (!ulidRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "ulid",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "url") {
                try {
                    new URL(input.data);
                }
                catch (_a) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "url",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "regex") {
                check.regex.lastIndex = 0;
                const testResult = check.regex.test(input.data);
                if (!testResult) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "regex",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "trim") {
                input.data = input.data.trim();
            }
            else if (check.kind === "includes") {
                if (!input.data.includes(check.value, check.position)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_string,
                        validation: { includes: check.value, position: check.position },
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "toLowerCase") {
                input.data = input.data.toLowerCase();
            }
            else if (check.kind === "toUpperCase") {
                input.data = input.data.toUpperCase();
            }
            else if (check.kind === "startsWith") {
                if (!input.data.startsWith(check.value)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_string,
                        validation: { startsWith: check.value },
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "endsWith") {
                if (!input.data.endsWith(check.value)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_string,
                        validation: { endsWith: check.value },
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "datetime") {
                const regex = datetimeRegex(check);
                if (!regex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_string,
                        validation: "datetime",
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "date") {
                const regex = dateRegex;
                if (!regex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_string,
                        validation: "date",
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "time") {
                const regex = timeRegex(check);
                if (!regex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_string,
                        validation: "time",
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "duration") {
                if (!durationRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "duration",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "ip") {
                if (!isValidIP(input.data, check.version)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "ip",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "jwt") {
                if (!isValidJWT(input.data, check.alg)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "jwt",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "cidr") {
                if (!isValidCidr(input.data, check.version)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "cidr",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "base64") {
                if (!base64Regex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "base64",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "base64url") {
                if (!base64urlRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "base64url",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else {
                util.assertNever(check);
            }
        }
        return { status: status.value, value: input.data };
    }
    _regex(regex, validation, message) {
        return this.refinement((data) => regex.test(data), {
            validation,
            code: ZodIssueCode.invalid_string,
            ...errorUtil.errToObj(message),
        });
    }
    _addCheck(check) {
        return new ZodString({
            ...this._def,
            checks: [...this._def.checks, check],
        });
    }
    email(message) {
        return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
    }
    url(message) {
        return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
    }
    emoji(message) {
        return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
    }
    uuid(message) {
        return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
    }
    nanoid(message) {
        return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
    }
    cuid(message) {
        return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
    }
    cuid2(message) {
        return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
    }
    ulid(message) {
        return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
    }
    base64(message) {
        return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
    }
    base64url(message) {
        // base64url encoding is a modification of base64 that can safely be used in URLs and filenames
        return this._addCheck({
            kind: "base64url",
            ...errorUtil.errToObj(message),
        });
    }
    jwt(options) {
        return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
    }
    ip(options) {
        return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
    }
    cidr(options) {
        return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
    }
    datetime(options) {
        var _a, _b;
        if (typeof options === "string") {
            return this._addCheck({
                kind: "datetime",
                precision: null,
                offset: false,
                local: false,
                message: options,
            });
        }
        return this._addCheck({
            kind: "datetime",
            precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
            offset: (_a = options === null || options === void 0 ? void 0 : options.offset) !== null && _a !== void 0 ? _a : false,
            local: (_b = options === null || options === void 0 ? void 0 : options.local) !== null && _b !== void 0 ? _b : false,
            ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message),
        });
    }
    date(message) {
        return this._addCheck({ kind: "date", message });
    }
    time(options) {
        if (typeof options === "string") {
            return this._addCheck({
                kind: "time",
                precision: null,
                message: options,
            });
        }
        return this._addCheck({
            kind: "time",
            precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
            ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message),
        });
    }
    duration(message) {
        return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
    }
    regex(regex, message) {
        return this._addCheck({
            kind: "regex",
            regex: regex,
            ...errorUtil.errToObj(message),
        });
    }
    includes(value, options) {
        return this._addCheck({
            kind: "includes",
            value: value,
            position: options === null || options === void 0 ? void 0 : options.position,
            ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message),
        });
    }
    startsWith(value, message) {
        return this._addCheck({
            kind: "startsWith",
            value: value,
            ...errorUtil.errToObj(message),
        });
    }
    endsWith(value, message) {
        return this._addCheck({
            kind: "endsWith",
            value: value,
            ...errorUtil.errToObj(message),
        });
    }
    min(minLength, message) {
        return this._addCheck({
            kind: "min",
            value: minLength,
            ...errorUtil.errToObj(message),
        });
    }
    max(maxLength, message) {
        return this._addCheck({
            kind: "max",
            value: maxLength,
            ...errorUtil.errToObj(message),
        });
    }
    length(len, message) {
        return this._addCheck({
            kind: "length",
            value: len,
            ...errorUtil.errToObj(message),
        });
    }
    /**
     * Equivalent to `.min(1)`
     */
    nonempty(message) {
        return this.min(1, errorUtil.errToObj(message));
    }
    trim() {
        return new ZodString({
            ...this._def,
            checks: [...this._def.checks, { kind: "trim" }],
        });
    }
    toLowerCase() {
        return new ZodString({
            ...this._def,
            checks: [...this._def.checks, { kind: "toLowerCase" }],
        });
    }
    toUpperCase() {
        return new ZodString({
            ...this._def,
            checks: [...this._def.checks, { kind: "toUpperCase" }],
        });
    }
    get isDatetime() {
        return !!this._def.checks.find((ch) => ch.kind === "datetime");
    }
    get isDate() {
        return !!this._def.checks.find((ch) => ch.kind === "date");
    }
    get isTime() {
        return !!this._def.checks.find((ch) => ch.kind === "time");
    }
    get isDuration() {
        return !!this._def.checks.find((ch) => ch.kind === "duration");
    }
    get isEmail() {
        return !!this._def.checks.find((ch) => ch.kind === "email");
    }
    get isURL() {
        return !!this._def.checks.find((ch) => ch.kind === "url");
    }
    get isEmoji() {
        return !!this._def.checks.find((ch) => ch.kind === "emoji");
    }
    get isUUID() {
        return !!this._def.checks.find((ch) => ch.kind === "uuid");
    }
    get isNANOID() {
        return !!this._def.checks.find((ch) => ch.kind === "nanoid");
    }
    get isCUID() {
        return !!this._def.checks.find((ch) => ch.kind === "cuid");
    }
    get isCUID2() {
        return !!this._def.checks.find((ch) => ch.kind === "cuid2");
    }
    get isULID() {
        return !!this._def.checks.find((ch) => ch.kind === "ulid");
    }
    get isIP() {
        return !!this._def.checks.find((ch) => ch.kind === "ip");
    }
    get isCIDR() {
        return !!this._def.checks.find((ch) => ch.kind === "cidr");
    }
    get isBase64() {
        return !!this._def.checks.find((ch) => ch.kind === "base64");
    }
    get isBase64url() {
        // base64url encoding is a modification of base64 that can safely be used in URLs and filenames
        return !!this._def.checks.find((ch) => ch.kind === "base64url");
    }
    get minLength() {
        let min = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "min") {
                if (min === null || ch.value > min)
                    min = ch.value;
            }
        }
        return min;
    }
    get maxLength() {
        let max = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "max") {
                if (max === null || ch.value < max)
                    max = ch.value;
            }
        }
        return max;
    }
}
ZodString.create = (params) => {
    var _a;
    return new ZodString({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodString,
        coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
        ...processCreateParams(params),
    });
};
// https://stackoverflow.com/questions/3966484/why-does-modulus-operator-return-fractional-number-in-javascript/31711034#31711034
function floatSafeRemainder(val, step) {
    const valDecCount = (val.toString().split(".")[1] || "").length;
    const stepDecCount = (step.toString().split(".")[1] || "").length;
    const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
    const valInt = parseInt(val.toFixed(decCount).replace(".", ""));
    const stepInt = parseInt(step.toFixed(decCount).replace(".", ""));
    return (valInt % stepInt) / Math.pow(10, decCount);
}
class ZodNumber extends ZodType {
    constructor() {
        super(...arguments);
        this.min = this.gte;
        this.max = this.lte;
        this.step = this.multipleOf;
    }
    _parse(input) {
        if (this._def.coerce) {
            input.data = Number(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.number) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.number,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        let ctx = undefined;
        const status = new ParseStatus();
        for (const check of this._def.checks) {
            if (check.kind === "int") {
                if (!util.isInteger(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_type,
                        expected: "integer",
                        received: "float",
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "min") {
                const tooSmall = check.inclusive
                    ? input.data < check.value
                    : input.data <= check.value;
                if (tooSmall) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_small,
                        minimum: check.value,
                        type: "number",
                        inclusive: check.inclusive,
                        exact: false,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "max") {
                const tooBig = check.inclusive
                    ? input.data > check.value
                    : input.data >= check.value;
                if (tooBig) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_big,
                        maximum: check.value,
                        type: "number",
                        inclusive: check.inclusive,
                        exact: false,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "multipleOf") {
                if (floatSafeRemainder(input.data, check.value) !== 0) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.not_multiple_of,
                        multipleOf: check.value,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "finite") {
                if (!Number.isFinite(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.not_finite,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else {
                util.assertNever(check);
            }
        }
        return { status: status.value, value: input.data };
    }
    gte(value, message) {
        return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
        return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
        return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
        return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
        return new ZodNumber({
            ...this._def,
            checks: [
                ...this._def.checks,
                {
                    kind,
                    value,
                    inclusive,
                    message: errorUtil.toString(message),
                },
            ],
        });
    }
    _addCheck(check) {
        return new ZodNumber({
            ...this._def,
            checks: [...this._def.checks, check],
        });
    }
    int(message) {
        return this._addCheck({
            kind: "int",
            message: errorUtil.toString(message),
        });
    }
    positive(message) {
        return this._addCheck({
            kind: "min",
            value: 0,
            inclusive: false,
            message: errorUtil.toString(message),
        });
    }
    negative(message) {
        return this._addCheck({
            kind: "max",
            value: 0,
            inclusive: false,
            message: errorUtil.toString(message),
        });
    }
    nonpositive(message) {
        return this._addCheck({
            kind: "max",
            value: 0,
            inclusive: true,
            message: errorUtil.toString(message),
        });
    }
    nonnegative(message) {
        return this._addCheck({
            kind: "min",
            value: 0,
            inclusive: true,
            message: errorUtil.toString(message),
        });
    }
    multipleOf(value, message) {
        return this._addCheck({
            kind: "multipleOf",
            value: value,
            message: errorUtil.toString(message),
        });
    }
    finite(message) {
        return this._addCheck({
            kind: "finite",
            message: errorUtil.toString(message),
        });
    }
    safe(message) {
        return this._addCheck({
            kind: "min",
            inclusive: true,
            value: Number.MIN_SAFE_INTEGER,
            message: errorUtil.toString(message),
        })._addCheck({
            kind: "max",
            inclusive: true,
            value: Number.MAX_SAFE_INTEGER,
            message: errorUtil.toString(message),
        });
    }
    get minValue() {
        let min = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "min") {
                if (min === null || ch.value > min)
                    min = ch.value;
            }
        }
        return min;
    }
    get maxValue() {
        let max = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "max") {
                if (max === null || ch.value < max)
                    max = ch.value;
            }
        }
        return max;
    }
    get isInt() {
        return !!this._def.checks.find((ch) => ch.kind === "int" ||
            (ch.kind === "multipleOf" && util.isInteger(ch.value)));
    }
    get isFinite() {
        let max = null, min = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "finite" ||
                ch.kind === "int" ||
                ch.kind === "multipleOf") {
                return true;
            }
            else if (ch.kind === "min") {
                if (min === null || ch.value > min)
                    min = ch.value;
            }
            else if (ch.kind === "max") {
                if (max === null || ch.value < max)
                    max = ch.value;
            }
        }
        return Number.isFinite(min) && Number.isFinite(max);
    }
}
ZodNumber.create = (params) => {
    return new ZodNumber({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodNumber,
        coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
        ...processCreateParams(params),
    });
};
class ZodBigInt extends ZodType {
    constructor() {
        super(...arguments);
        this.min = this.gte;
        this.max = this.lte;
    }
    _parse(input) {
        if (this._def.coerce) {
            try {
                input.data = BigInt(input.data);
            }
            catch (_a) {
                return this._getInvalidInput(input);
            }
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.bigint) {
            return this._getInvalidInput(input);
        }
        let ctx = undefined;
        const status = new ParseStatus();
        for (const check of this._def.checks) {
            if (check.kind === "min") {
                const tooSmall = check.inclusive
                    ? input.data < check.value
                    : input.data <= check.value;
                if (tooSmall) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_small,
                        type: "bigint",
                        minimum: check.value,
                        inclusive: check.inclusive,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "max") {
                const tooBig = check.inclusive
                    ? input.data > check.value
                    : input.data >= check.value;
                if (tooBig) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_big,
                        type: "bigint",
                        maximum: check.value,
                        inclusive: check.inclusive,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "multipleOf") {
                if (input.data % check.value !== BigInt(0)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.not_multiple_of,
                        multipleOf: check.value,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else {
                util.assertNever(check);
            }
        }
        return { status: status.value, value: input.data };
    }
    _getInvalidInput(input) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.bigint,
            received: ctx.parsedType,
        });
        return INVALID;
    }
    gte(value, message) {
        return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
        return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
        return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
        return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
        return new ZodBigInt({
            ...this._def,
            checks: [
                ...this._def.checks,
                {
                    kind,
                    value,
                    inclusive,
                    message: errorUtil.toString(message),
                },
            ],
        });
    }
    _addCheck(check) {
        return new ZodBigInt({
            ...this._def,
            checks: [...this._def.checks, check],
        });
    }
    positive(message) {
        return this._addCheck({
            kind: "min",
            value: BigInt(0),
            inclusive: false,
            message: errorUtil.toString(message),
        });
    }
    negative(message) {
        return this._addCheck({
            kind: "max",
            value: BigInt(0),
            inclusive: false,
            message: errorUtil.toString(message),
        });
    }
    nonpositive(message) {
        return this._addCheck({
            kind: "max",
            value: BigInt(0),
            inclusive: true,
            message: errorUtil.toString(message),
        });
    }
    nonnegative(message) {
        return this._addCheck({
            kind: "min",
            value: BigInt(0),
            inclusive: true,
            message: errorUtil.toString(message),
        });
    }
    multipleOf(value, message) {
        return this._addCheck({
            kind: "multipleOf",
            value,
            message: errorUtil.toString(message),
        });
    }
    get minValue() {
        let min = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "min") {
                if (min === null || ch.value > min)
                    min = ch.value;
            }
        }
        return min;
    }
    get maxValue() {
        let max = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "max") {
                if (max === null || ch.value < max)
                    max = ch.value;
            }
        }
        return max;
    }
}
ZodBigInt.create = (params) => {
    var _a;
    return new ZodBigInt({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodBigInt,
        coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
        ...processCreateParams(params),
    });
};
class ZodBoolean extends ZodType {
    _parse(input) {
        if (this._def.coerce) {
            input.data = Boolean(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.boolean) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.boolean,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        return OK(input.data);
    }
}
ZodBoolean.create = (params) => {
    return new ZodBoolean({
        typeName: ZodFirstPartyTypeKind.ZodBoolean,
        coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
        ...processCreateParams(params),
    });
};
class ZodDate extends ZodType {
    _parse(input) {
        if (this._def.coerce) {
            input.data = new Date(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.date) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.date,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        if (isNaN(input.data.getTime())) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_date,
            });
            return INVALID;
        }
        const status = new ParseStatus();
        let ctx = undefined;
        for (const check of this._def.checks) {
            if (check.kind === "min") {
                if (input.data.getTime() < check.value) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_small,
                        message: check.message,
                        inclusive: true,
                        exact: false,
                        minimum: check.value,
                        type: "date",
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "max") {
                if (input.data.getTime() > check.value) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_big,
                        message: check.message,
                        inclusive: true,
                        exact: false,
                        maximum: check.value,
                        type: "date",
                    });
                    status.dirty();
                }
            }
            else {
                util.assertNever(check);
            }
        }
        return {
            status: status.value,
            value: new Date(input.data.getTime()),
        };
    }
    _addCheck(check) {
        return new ZodDate({
            ...this._def,
            checks: [...this._def.checks, check],
        });
    }
    min(minDate, message) {
        return this._addCheck({
            kind: "min",
            value: minDate.getTime(),
            message: errorUtil.toString(message),
        });
    }
    max(maxDate, message) {
        return this._addCheck({
            kind: "max",
            value: maxDate.getTime(),
            message: errorUtil.toString(message),
        });
    }
    get minDate() {
        let min = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "min") {
                if (min === null || ch.value > min)
                    min = ch.value;
            }
        }
        return min != null ? new Date(min) : null;
    }
    get maxDate() {
        let max = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "max") {
                if (max === null || ch.value < max)
                    max = ch.value;
            }
        }
        return max != null ? new Date(max) : null;
    }
}
ZodDate.create = (params) => {
    return new ZodDate({
        checks: [],
        coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
        typeName: ZodFirstPartyTypeKind.ZodDate,
        ...processCreateParams(params),
    });
};
class ZodSymbol extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.symbol) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.symbol,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        return OK(input.data);
    }
}
ZodSymbol.create = (params) => {
    return new ZodSymbol({
        typeName: ZodFirstPartyTypeKind.ZodSymbol,
        ...processCreateParams(params),
    });
};
class ZodUndefined extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.undefined) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.undefined,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        return OK(input.data);
    }
}
ZodUndefined.create = (params) => {
    return new ZodUndefined({
        typeName: ZodFirstPartyTypeKind.ZodUndefined,
        ...processCreateParams(params),
    });
};
class ZodNull extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.null) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.null,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        return OK(input.data);
    }
}
ZodNull.create = (params) => {
    return new ZodNull({
        typeName: ZodFirstPartyTypeKind.ZodNull,
        ...processCreateParams(params),
    });
};
class ZodAny extends ZodType {
    constructor() {
        super(...arguments);
        // to prevent instances of other classes from extending ZodAny. this causes issues with catchall in ZodObject.
        this._any = true;
    }
    _parse(input) {
        return OK(input.data);
    }
}
ZodAny.create = (params) => {
    return new ZodAny({
        typeName: ZodFirstPartyTypeKind.ZodAny,
        ...processCreateParams(params),
    });
};
class ZodUnknown extends ZodType {
    constructor() {
        super(...arguments);
        // required
        this._unknown = true;
    }
    _parse(input) {
        return OK(input.data);
    }
}
ZodUnknown.create = (params) => {
    return new ZodUnknown({
        typeName: ZodFirstPartyTypeKind.ZodUnknown,
        ...processCreateParams(params),
    });
};
class ZodNever extends ZodType {
    _parse(input) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.never,
            received: ctx.parsedType,
        });
        return INVALID;
    }
}
ZodNever.create = (params) => {
    return new ZodNever({
        typeName: ZodFirstPartyTypeKind.ZodNever,
        ...processCreateParams(params),
    });
};
class ZodVoid extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.undefined) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.void,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        return OK(input.data);
    }
}
ZodVoid.create = (params) => {
    return new ZodVoid({
        typeName: ZodFirstPartyTypeKind.ZodVoid,
        ...processCreateParams(params),
    });
};
class ZodArray extends ZodType {
    _parse(input) {
        const { ctx, status } = this._processInputParams(input);
        const def = this._def;
        if (ctx.parsedType !== ZodParsedType.array) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.array,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        if (def.exactLength !== null) {
            const tooBig = ctx.data.length > def.exactLength.value;
            const tooSmall = ctx.data.length < def.exactLength.value;
            if (tooBig || tooSmall) {
                addIssueToContext(ctx, {
                    code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
                    minimum: (tooSmall ? def.exactLength.value : undefined),
                    maximum: (tooBig ? def.exactLength.value : undefined),
                    type: "array",
                    inclusive: true,
                    exact: true,
                    message: def.exactLength.message,
                });
                status.dirty();
            }
        }
        if (def.minLength !== null) {
            if (ctx.data.length < def.minLength.value) {
                addIssueToContext(ctx, {
                    code: ZodIssueCode.too_small,
                    minimum: def.minLength.value,
                    type: "array",
                    inclusive: true,
                    exact: false,
                    message: def.minLength.message,
                });
                status.dirty();
            }
        }
        if (def.maxLength !== null) {
            if (ctx.data.length > def.maxLength.value) {
                addIssueToContext(ctx, {
                    code: ZodIssueCode.too_big,
                    maximum: def.maxLength.value,
                    type: "array",
                    inclusive: true,
                    exact: false,
                    message: def.maxLength.message,
                });
                status.dirty();
            }
        }
        if (ctx.common.async) {
            return Promise.all([...ctx.data].map((item, i) => {
                return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
            })).then((result) => {
                return ParseStatus.mergeArray(status, result);
            });
        }
        const result = [...ctx.data].map((item, i) => {
            return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
        });
        return ParseStatus.mergeArray(status, result);
    }
    get element() {
        return this._def.type;
    }
    min(minLength, message) {
        return new ZodArray({
            ...this._def,
            minLength: { value: minLength, message: errorUtil.toString(message) },
        });
    }
    max(maxLength, message) {
        return new ZodArray({
            ...this._def,
            maxLength: { value: maxLength, message: errorUtil.toString(message) },
        });
    }
    length(len, message) {
        return new ZodArray({
            ...this._def,
            exactLength: { value: len, message: errorUtil.toString(message) },
        });
    }
    nonempty(message) {
        return this.min(1, message);
    }
}
ZodArray.create = (schema, params) => {
    return new ZodArray({
        type: schema,
        minLength: null,
        maxLength: null,
        exactLength: null,
        typeName: ZodFirstPartyTypeKind.ZodArray,
        ...processCreateParams(params),
    });
};
function deepPartialify(schema) {
    if (schema instanceof ZodObject) {
        const newShape = {};
        for (const key in schema.shape) {
            const fieldSchema = schema.shape[key];
            newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
        }
        return new ZodObject({
            ...schema._def,
            shape: () => newShape,
        });
    }
    else if (schema instanceof ZodArray) {
        return new ZodArray({
            ...schema._def,
            type: deepPartialify(schema.element),
        });
    }
    else if (schema instanceof ZodOptional) {
        return ZodOptional.create(deepPartialify(schema.unwrap()));
    }
    else if (schema instanceof ZodNullable) {
        return ZodNullable.create(deepPartialify(schema.unwrap()));
    }
    else if (schema instanceof ZodTuple) {
        return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
    }
    else {
        return schema;
    }
}
class ZodObject extends ZodType {
    constructor() {
        super(...arguments);
        this._cached = null;
        /**
         * @deprecated In most cases, this is no longer needed - unknown properties are now silently stripped.
         * If you want to pass through unknown properties, use `.passthrough()` instead.
         */
        this.nonstrict = this.passthrough;
        // extend<
        //   Augmentation extends ZodRawShape,
        //   NewOutput extends util.flatten<{
        //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
        //       ? Augmentation[k]["_output"]
        //       : k extends keyof Output
        //       ? Output[k]
        //       : never;
        //   }>,
        //   NewInput extends util.flatten<{
        //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
        //       ? Augmentation[k]["_input"]
        //       : k extends keyof Input
        //       ? Input[k]
        //       : never;
        //   }>
        // >(
        //   augmentation: Augmentation
        // ): ZodObject<
        //   extendShape<T, Augmentation>,
        //   UnknownKeys,
        //   Catchall,
        //   NewOutput,
        //   NewInput
        // > {
        //   return new ZodObject({
        //     ...this._def,
        //     shape: () => ({
        //       ...this._def.shape(),
        //       ...augmentation,
        //     }),
        //   }) as any;
        // }
        /**
         * @deprecated Use `.extend` instead
         *  */
        this.augment = this.extend;
    }
    _getCached() {
        if (this._cached !== null)
            return this._cached;
        const shape = this._def.shape();
        const keys = util.objectKeys(shape);
        return (this._cached = { shape, keys });
    }
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.object) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.object,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        const { status, ctx } = this._processInputParams(input);
        const { shape, keys: shapeKeys } = this._getCached();
        const extraKeys = [];
        if (!(this._def.catchall instanceof ZodNever &&
            this._def.unknownKeys === "strip")) {
            for (const key in ctx.data) {
                if (!shapeKeys.includes(key)) {
                    extraKeys.push(key);
                }
            }
        }
        const pairs = [];
        for (const key of shapeKeys) {
            const keyValidator = shape[key];
            const value = ctx.data[key];
            pairs.push({
                key: { status: "valid", value: key },
                value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
                alwaysSet: key in ctx.data,
            });
        }
        if (this._def.catchall instanceof ZodNever) {
            const unknownKeys = this._def.unknownKeys;
            if (unknownKeys === "passthrough") {
                for (const key of extraKeys) {
                    pairs.push({
                        key: { status: "valid", value: key },
                        value: { status: "valid", value: ctx.data[key] },
                    });
                }
            }
            else if (unknownKeys === "strict") {
                if (extraKeys.length > 0) {
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.unrecognized_keys,
                        keys: extraKeys,
                    });
                    status.dirty();
                }
            }
            else if (unknownKeys === "strip") ;
            else {
                throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
            }
        }
        else {
            // run catchall validation
            const catchall = this._def.catchall;
            for (const key of extraKeys) {
                const value = ctx.data[key];
                pairs.push({
                    key: { status: "valid", value: key },
                    value: catchall._parse(new ParseInputLazyPath(ctx, value, ctx.path, key) //, ctx.child(key), value, getParsedType(value)
                    ),
                    alwaysSet: key in ctx.data,
                });
            }
        }
        if (ctx.common.async) {
            return Promise.resolve()
                .then(async () => {
                const syncPairs = [];
                for (const pair of pairs) {
                    const key = await pair.key;
                    const value = await pair.value;
                    syncPairs.push({
                        key,
                        value,
                        alwaysSet: pair.alwaysSet,
                    });
                }
                return syncPairs;
            })
                .then((syncPairs) => {
                return ParseStatus.mergeObjectSync(status, syncPairs);
            });
        }
        else {
            return ParseStatus.mergeObjectSync(status, pairs);
        }
    }
    get shape() {
        return this._def.shape();
    }
    strict(message) {
        errorUtil.errToObj;
        return new ZodObject({
            ...this._def,
            unknownKeys: "strict",
            ...(message !== undefined
                ? {
                    errorMap: (issue, ctx) => {
                        var _a, _b, _c, _d;
                        const defaultError = (_c = (_b = (_a = this._def).errorMap) === null || _b === void 0 ? void 0 : _b.call(_a, issue, ctx).message) !== null && _c !== void 0 ? _c : ctx.defaultError;
                        if (issue.code === "unrecognized_keys")
                            return {
                                message: (_d = errorUtil.errToObj(message).message) !== null && _d !== void 0 ? _d : defaultError,
                            };
                        return {
                            message: defaultError,
                        };
                    },
                }
                : {}),
        });
    }
    strip() {
        return new ZodObject({
            ...this._def,
            unknownKeys: "strip",
        });
    }
    passthrough() {
        return new ZodObject({
            ...this._def,
            unknownKeys: "passthrough",
        });
    }
    // const AugmentFactory =
    //   <Def extends ZodObjectDef>(def: Def) =>
    //   <Augmentation extends ZodRawShape>(
    //     augmentation: Augmentation
    //   ): ZodObject<
    //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
    //     Def["unknownKeys"],
    //     Def["catchall"]
    //   > => {
    //     return new ZodObject({
    //       ...def,
    //       shape: () => ({
    //         ...def.shape(),
    //         ...augmentation,
    //       }),
    //     }) as any;
    //   };
    extend(augmentation) {
        return new ZodObject({
            ...this._def,
            shape: () => ({
                ...this._def.shape(),
                ...augmentation,
            }),
        });
    }
    /**
     * Prior to zod@1.0.12 there was a bug in the
     * inferred type of merged objects. Please
     * upgrade if you are experiencing issues.
     */
    merge(merging) {
        const merged = new ZodObject({
            unknownKeys: merging._def.unknownKeys,
            catchall: merging._def.catchall,
            shape: () => ({
                ...this._def.shape(),
                ...merging._def.shape(),
            }),
            typeName: ZodFirstPartyTypeKind.ZodObject,
        });
        return merged;
    }
    // merge<
    //   Incoming extends AnyZodObject,
    //   Augmentation extends Incoming["shape"],
    //   NewOutput extends {
    //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
    //       ? Augmentation[k]["_output"]
    //       : k extends keyof Output
    //       ? Output[k]
    //       : never;
    //   },
    //   NewInput extends {
    //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
    //       ? Augmentation[k]["_input"]
    //       : k extends keyof Input
    //       ? Input[k]
    //       : never;
    //   }
    // >(
    //   merging: Incoming
    // ): ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"],
    //   NewOutput,
    //   NewInput
    // > {
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    setKey(key, schema) {
        return this.augment({ [key]: schema });
    }
    // merge<Incoming extends AnyZodObject>(
    //   merging: Incoming
    // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
    // ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"]
    // > {
    //   // const mergedShape = objectUtil.mergeShapes(
    //   //   this._def.shape(),
    //   //   merging._def.shape()
    //   // );
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    catchall(index) {
        return new ZodObject({
            ...this._def,
            catchall: index,
        });
    }
    pick(mask) {
        const shape = {};
        util.objectKeys(mask).forEach((key) => {
            if (mask[key] && this.shape[key]) {
                shape[key] = this.shape[key];
            }
        });
        return new ZodObject({
            ...this._def,
            shape: () => shape,
        });
    }
    omit(mask) {
        const shape = {};
        util.objectKeys(this.shape).forEach((key) => {
            if (!mask[key]) {
                shape[key] = this.shape[key];
            }
        });
        return new ZodObject({
            ...this._def,
            shape: () => shape,
        });
    }
    /**
     * @deprecated
     */
    deepPartial() {
        return deepPartialify(this);
    }
    partial(mask) {
        const newShape = {};
        util.objectKeys(this.shape).forEach((key) => {
            const fieldSchema = this.shape[key];
            if (mask && !mask[key]) {
                newShape[key] = fieldSchema;
            }
            else {
                newShape[key] = fieldSchema.optional();
            }
        });
        return new ZodObject({
            ...this._def,
            shape: () => newShape,
        });
    }
    required(mask) {
        const newShape = {};
        util.objectKeys(this.shape).forEach((key) => {
            if (mask && !mask[key]) {
                newShape[key] = this.shape[key];
            }
            else {
                const fieldSchema = this.shape[key];
                let newField = fieldSchema;
                while (newField instanceof ZodOptional) {
                    newField = newField._def.innerType;
                }
                newShape[key] = newField;
            }
        });
        return new ZodObject({
            ...this._def,
            shape: () => newShape,
        });
    }
    keyof() {
        return createZodEnum(util.objectKeys(this.shape));
    }
}
ZodObject.create = (shape, params) => {
    return new ZodObject({
        shape: () => shape,
        unknownKeys: "strip",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params),
    });
};
ZodObject.strictCreate = (shape, params) => {
    return new ZodObject({
        shape: () => shape,
        unknownKeys: "strict",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params),
    });
};
ZodObject.lazycreate = (shape, params) => {
    return new ZodObject({
        shape,
        unknownKeys: "strip",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params),
    });
};
class ZodUnion extends ZodType {
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        const options = this._def.options;
        function handleResults(results) {
            // return first issue-free validation if it exists
            for (const result of results) {
                if (result.result.status === "valid") {
                    return result.result;
                }
            }
            for (const result of results) {
                if (result.result.status === "dirty") {
                    // add issues from dirty option
                    ctx.common.issues.push(...result.ctx.common.issues);
                    return result.result;
                }
            }
            // return invalid
            const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_union,
                unionErrors,
            });
            return INVALID;
        }
        if (ctx.common.async) {
            return Promise.all(options.map(async (option) => {
                const childCtx = {
                    ...ctx,
                    common: {
                        ...ctx.common,
                        issues: [],
                    },
                    parent: null,
                };
                return {
                    result: await option._parseAsync({
                        data: ctx.data,
                        path: ctx.path,
                        parent: childCtx,
                    }),
                    ctx: childCtx,
                };
            })).then(handleResults);
        }
        else {
            let dirty = undefined;
            const issues = [];
            for (const option of options) {
                const childCtx = {
                    ...ctx,
                    common: {
                        ...ctx.common,
                        issues: [],
                    },
                    parent: null,
                };
                const result = option._parseSync({
                    data: ctx.data,
                    path: ctx.path,
                    parent: childCtx,
                });
                if (result.status === "valid") {
                    return result;
                }
                else if (result.status === "dirty" && !dirty) {
                    dirty = { result, ctx: childCtx };
                }
                if (childCtx.common.issues.length) {
                    issues.push(childCtx.common.issues);
                }
            }
            if (dirty) {
                ctx.common.issues.push(...dirty.ctx.common.issues);
                return dirty.result;
            }
            const unionErrors = issues.map((issues) => new ZodError(issues));
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_union,
                unionErrors,
            });
            return INVALID;
        }
    }
    get options() {
        return this._def.options;
    }
}
ZodUnion.create = (types, params) => {
    return new ZodUnion({
        options: types,
        typeName: ZodFirstPartyTypeKind.ZodUnion,
        ...processCreateParams(params),
    });
};
/////////////////////////////////////////////////////
/////////////////////////////////////////////////////
//////////                                 //////////
//////////      ZodDiscriminatedUnion      //////////
//////////                                 //////////
/////////////////////////////////////////////////////
/////////////////////////////////////////////////////
const getDiscriminator = (type) => {
    if (type instanceof ZodLazy) {
        return getDiscriminator(type.schema);
    }
    else if (type instanceof ZodEffects) {
        return getDiscriminator(type.innerType());
    }
    else if (type instanceof ZodLiteral) {
        return [type.value];
    }
    else if (type instanceof ZodEnum) {
        return type.options;
    }
    else if (type instanceof ZodNativeEnum) {
        // eslint-disable-next-line ban/ban
        return util.objectValues(type.enum);
    }
    else if (type instanceof ZodDefault) {
        return getDiscriminator(type._def.innerType);
    }
    else if (type instanceof ZodUndefined) {
        return [undefined];
    }
    else if (type instanceof ZodNull) {
        return [null];
    }
    else if (type instanceof ZodOptional) {
        return [undefined, ...getDiscriminator(type.unwrap())];
    }
    else if (type instanceof ZodNullable) {
        return [null, ...getDiscriminator(type.unwrap())];
    }
    else if (type instanceof ZodBranded) {
        return getDiscriminator(type.unwrap());
    }
    else if (type instanceof ZodReadonly) {
        return getDiscriminator(type.unwrap());
    }
    else if (type instanceof ZodCatch) {
        return getDiscriminator(type._def.innerType);
    }
    else {
        return [];
    }
};
class ZodDiscriminatedUnion extends ZodType {
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.object) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.object,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        const discriminator = this.discriminator;
        const discriminatorValue = ctx.data[discriminator];
        const option = this.optionsMap.get(discriminatorValue);
        if (!option) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_union_discriminator,
                options: Array.from(this.optionsMap.keys()),
                path: [discriminator],
            });
            return INVALID;
        }
        if (ctx.common.async) {
            return option._parseAsync({
                data: ctx.data,
                path: ctx.path,
                parent: ctx,
            });
        }
        else {
            return option._parseSync({
                data: ctx.data,
                path: ctx.path,
                parent: ctx,
            });
        }
    }
    get discriminator() {
        return this._def.discriminator;
    }
    get options() {
        return this._def.options;
    }
    get optionsMap() {
        return this._def.optionsMap;
    }
    /**
     * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
     * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
     * have a different value for each object in the union.
     * @param discriminator the name of the discriminator property
     * @param types an array of object schemas
     * @param params
     */
    static create(discriminator, options, params) {
        // Get all the valid discriminator values
        const optionsMap = new Map();
        // try {
        for (const type of options) {
            const discriminatorValues = getDiscriminator(type.shape[discriminator]);
            if (!discriminatorValues.length) {
                throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
            }
            for (const value of discriminatorValues) {
                if (optionsMap.has(value)) {
                    throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
                }
                optionsMap.set(value, type);
            }
        }
        return new ZodDiscriminatedUnion({
            typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
            discriminator,
            options,
            optionsMap,
            ...processCreateParams(params),
        });
    }
}
function mergeValues(a, b) {
    const aType = getParsedType(a);
    const bType = getParsedType(b);
    if (a === b) {
        return { valid: true, data: a };
    }
    else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
        const bKeys = util.objectKeys(b);
        const sharedKeys = util
            .objectKeys(a)
            .filter((key) => bKeys.indexOf(key) !== -1);
        const newObj = { ...a, ...b };
        for (const key of sharedKeys) {
            const sharedValue = mergeValues(a[key], b[key]);
            if (!sharedValue.valid) {
                return { valid: false };
            }
            newObj[key] = sharedValue.data;
        }
        return { valid: true, data: newObj };
    }
    else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
        if (a.length !== b.length) {
            return { valid: false };
        }
        const newArray = [];
        for (let index = 0; index < a.length; index++) {
            const itemA = a[index];
            const itemB = b[index];
            const sharedValue = mergeValues(itemA, itemB);
            if (!sharedValue.valid) {
                return { valid: false };
            }
            newArray.push(sharedValue.data);
        }
        return { valid: true, data: newArray };
    }
    else if (aType === ZodParsedType.date &&
        bType === ZodParsedType.date &&
        +a === +b) {
        return { valid: true, data: a };
    }
    else {
        return { valid: false };
    }
}
class ZodIntersection extends ZodType {
    _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        const handleParsed = (parsedLeft, parsedRight) => {
            if (isAborted(parsedLeft) || isAborted(parsedRight)) {
                return INVALID;
            }
            const merged = mergeValues(parsedLeft.value, parsedRight.value);
            if (!merged.valid) {
                addIssueToContext(ctx, {
                    code: ZodIssueCode.invalid_intersection_types,
                });
                return INVALID;
            }
            if (isDirty(parsedLeft) || isDirty(parsedRight)) {
                status.dirty();
            }
            return { status: status.value, value: merged.data };
        };
        if (ctx.common.async) {
            return Promise.all([
                this._def.left._parseAsync({
                    data: ctx.data,
                    path: ctx.path,
                    parent: ctx,
                }),
                this._def.right._parseAsync({
                    data: ctx.data,
                    path: ctx.path,
                    parent: ctx,
                }),
            ]).then(([left, right]) => handleParsed(left, right));
        }
        else {
            return handleParsed(this._def.left._parseSync({
                data: ctx.data,
                path: ctx.path,
                parent: ctx,
            }), this._def.right._parseSync({
                data: ctx.data,
                path: ctx.path,
                parent: ctx,
            }));
        }
    }
}
ZodIntersection.create = (left, right, params) => {
    return new ZodIntersection({
        left: left,
        right: right,
        typeName: ZodFirstPartyTypeKind.ZodIntersection,
        ...processCreateParams(params),
    });
};
class ZodTuple extends ZodType {
    _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.array) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.array,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        if (ctx.data.length < this._def.items.length) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                minimum: this._def.items.length,
                inclusive: true,
                exact: false,
                type: "array",
            });
            return INVALID;
        }
        const rest = this._def.rest;
        if (!rest && ctx.data.length > this._def.items.length) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                maximum: this._def.items.length,
                inclusive: true,
                exact: false,
                type: "array",
            });
            status.dirty();
        }
        const items = [...ctx.data]
            .map((item, itemIndex) => {
            const schema = this._def.items[itemIndex] || this._def.rest;
            if (!schema)
                return null;
            return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
        })
            .filter((x) => !!x); // filter nulls
        if (ctx.common.async) {
            return Promise.all(items).then((results) => {
                return ParseStatus.mergeArray(status, results);
            });
        }
        else {
            return ParseStatus.mergeArray(status, items);
        }
    }
    get items() {
        return this._def.items;
    }
    rest(rest) {
        return new ZodTuple({
            ...this._def,
            rest,
        });
    }
}
ZodTuple.create = (schemas, params) => {
    if (!Array.isArray(schemas)) {
        throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
    }
    return new ZodTuple({
        items: schemas,
        typeName: ZodFirstPartyTypeKind.ZodTuple,
        rest: null,
        ...processCreateParams(params),
    });
};
class ZodRecord extends ZodType {
    get keySchema() {
        return this._def.keyType;
    }
    get valueSchema() {
        return this._def.valueType;
    }
    _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.object) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.object,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        const pairs = [];
        const keyType = this._def.keyType;
        const valueType = this._def.valueType;
        for (const key in ctx.data) {
            pairs.push({
                key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
                value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
                alwaysSet: key in ctx.data,
            });
        }
        if (ctx.common.async) {
            return ParseStatus.mergeObjectAsync(status, pairs);
        }
        else {
            return ParseStatus.mergeObjectSync(status, pairs);
        }
    }
    get element() {
        return this._def.valueType;
    }
    static create(first, second, third) {
        if (second instanceof ZodType) {
            return new ZodRecord({
                keyType: first,
                valueType: second,
                typeName: ZodFirstPartyTypeKind.ZodRecord,
                ...processCreateParams(third),
            });
        }
        return new ZodRecord({
            keyType: ZodString.create(),
            valueType: first,
            typeName: ZodFirstPartyTypeKind.ZodRecord,
            ...processCreateParams(second),
        });
    }
}
class ZodMap extends ZodType {
    get keySchema() {
        return this._def.keyType;
    }
    get valueSchema() {
        return this._def.valueType;
    }
    _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.map) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.map,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        const keyType = this._def.keyType;
        const valueType = this._def.valueType;
        const pairs = [...ctx.data.entries()].map(([key, value], index) => {
            return {
                key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
                value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"])),
            };
        });
        if (ctx.common.async) {
            const finalMap = new Map();
            return Promise.resolve().then(async () => {
                for (const pair of pairs) {
                    const key = await pair.key;
                    const value = await pair.value;
                    if (key.status === "aborted" || value.status === "aborted") {
                        return INVALID;
                    }
                    if (key.status === "dirty" || value.status === "dirty") {
                        status.dirty();
                    }
                    finalMap.set(key.value, value.value);
                }
                return { status: status.value, value: finalMap };
            });
        }
        else {
            const finalMap = new Map();
            for (const pair of pairs) {
                const key = pair.key;
                const value = pair.value;
                if (key.status === "aborted" || value.status === "aborted") {
                    return INVALID;
                }
                if (key.status === "dirty" || value.status === "dirty") {
                    status.dirty();
                }
                finalMap.set(key.value, value.value);
            }
            return { status: status.value, value: finalMap };
        }
    }
}
ZodMap.create = (keyType, valueType, params) => {
    return new ZodMap({
        valueType,
        keyType,
        typeName: ZodFirstPartyTypeKind.ZodMap,
        ...processCreateParams(params),
    });
};
class ZodSet extends ZodType {
    _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.set) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.set,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        const def = this._def;
        if (def.minSize !== null) {
            if (ctx.data.size < def.minSize.value) {
                addIssueToContext(ctx, {
                    code: ZodIssueCode.too_small,
                    minimum: def.minSize.value,
                    type: "set",
                    inclusive: true,
                    exact: false,
                    message: def.minSize.message,
                });
                status.dirty();
            }
        }
        if (def.maxSize !== null) {
            if (ctx.data.size > def.maxSize.value) {
                addIssueToContext(ctx, {
                    code: ZodIssueCode.too_big,
                    maximum: def.maxSize.value,
                    type: "set",
                    inclusive: true,
                    exact: false,
                    message: def.maxSize.message,
                });
                status.dirty();
            }
        }
        const valueType = this._def.valueType;
        function finalizeSet(elements) {
            const parsedSet = new Set();
            for (const element of elements) {
                if (element.status === "aborted")
                    return INVALID;
                if (element.status === "dirty")
                    status.dirty();
                parsedSet.add(element.value);
            }
            return { status: status.value, value: parsedSet };
        }
        const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
        if (ctx.common.async) {
            return Promise.all(elements).then((elements) => finalizeSet(elements));
        }
        else {
            return finalizeSet(elements);
        }
    }
    min(minSize, message) {
        return new ZodSet({
            ...this._def,
            minSize: { value: minSize, message: errorUtil.toString(message) },
        });
    }
    max(maxSize, message) {
        return new ZodSet({
            ...this._def,
            maxSize: { value: maxSize, message: errorUtil.toString(message) },
        });
    }
    size(size, message) {
        return this.min(size, message).max(size, message);
    }
    nonempty(message) {
        return this.min(1, message);
    }
}
ZodSet.create = (valueType, params) => {
    return new ZodSet({
        valueType,
        minSize: null,
        maxSize: null,
        typeName: ZodFirstPartyTypeKind.ZodSet,
        ...processCreateParams(params),
    });
};
class ZodFunction extends ZodType {
    constructor() {
        super(...arguments);
        this.validate = this.implement;
    }
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.function) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.function,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        function makeArgsIssue(args, error) {
            return makeIssue({
                data: args,
                path: ctx.path,
                errorMaps: [
                    ctx.common.contextualErrorMap,
                    ctx.schemaErrorMap,
                    getErrorMap(),
                    errorMap,
                ].filter((x) => !!x),
                issueData: {
                    code: ZodIssueCode.invalid_arguments,
                    argumentsError: error,
                },
            });
        }
        function makeReturnsIssue(returns, error) {
            return makeIssue({
                data: returns,
                path: ctx.path,
                errorMaps: [
                    ctx.common.contextualErrorMap,
                    ctx.schemaErrorMap,
                    getErrorMap(),
                    errorMap,
                ].filter((x) => !!x),
                issueData: {
                    code: ZodIssueCode.invalid_return_type,
                    returnTypeError: error,
                },
            });
        }
        const params = { errorMap: ctx.common.contextualErrorMap };
        const fn = ctx.data;
        if (this._def.returns instanceof ZodPromise) {
            // Would love a way to avoid disabling this rule, but we need
            // an alias (using an arrow function was what caused 2651).
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            const me = this;
            return OK(async function (...args) {
                const error = new ZodError([]);
                const parsedArgs = await me._def.args
                    .parseAsync(args, params)
                    .catch((e) => {
                    error.addIssue(makeArgsIssue(args, e));
                    throw error;
                });
                const result = await Reflect.apply(fn, this, parsedArgs);
                const parsedReturns = await me._def.returns._def.type
                    .parseAsync(result, params)
                    .catch((e) => {
                    error.addIssue(makeReturnsIssue(result, e));
                    throw error;
                });
                return parsedReturns;
            });
        }
        else {
            // Would love a way to avoid disabling this rule, but we need
            // an alias (using an arrow function was what caused 2651).
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            const me = this;
            return OK(function (...args) {
                const parsedArgs = me._def.args.safeParse(args, params);
                if (!parsedArgs.success) {
                    throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
                }
                const result = Reflect.apply(fn, this, parsedArgs.data);
                const parsedReturns = me._def.returns.safeParse(result, params);
                if (!parsedReturns.success) {
                    throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
                }
                return parsedReturns.data;
            });
        }
    }
    parameters() {
        return this._def.args;
    }
    returnType() {
        return this._def.returns;
    }
    args(...items) {
        return new ZodFunction({
            ...this._def,
            args: ZodTuple.create(items).rest(ZodUnknown.create()),
        });
    }
    returns(returnType) {
        return new ZodFunction({
            ...this._def,
            returns: returnType,
        });
    }
    implement(func) {
        const validatedFunc = this.parse(func);
        return validatedFunc;
    }
    strictImplement(func) {
        const validatedFunc = this.parse(func);
        return validatedFunc;
    }
    static create(args, returns, params) {
        return new ZodFunction({
            args: (args
                ? args
                : ZodTuple.create([]).rest(ZodUnknown.create())),
            returns: returns || ZodUnknown.create(),
            typeName: ZodFirstPartyTypeKind.ZodFunction,
            ...processCreateParams(params),
        });
    }
}
class ZodLazy extends ZodType {
    get schema() {
        return this._def.getter();
    }
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        const lazySchema = this._def.getter();
        return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
    }
}
ZodLazy.create = (getter, params) => {
    return new ZodLazy({
        getter: getter,
        typeName: ZodFirstPartyTypeKind.ZodLazy,
        ...processCreateParams(params),
    });
};
class ZodLiteral extends ZodType {
    _parse(input) {
        if (input.data !== this._def.value) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                received: ctx.data,
                code: ZodIssueCode.invalid_literal,
                expected: this._def.value,
            });
            return INVALID;
        }
        return { status: "valid", value: input.data };
    }
    get value() {
        return this._def.value;
    }
}
ZodLiteral.create = (value, params) => {
    return new ZodLiteral({
        value: value,
        typeName: ZodFirstPartyTypeKind.ZodLiteral,
        ...processCreateParams(params),
    });
};
function createZodEnum(values, params) {
    return new ZodEnum({
        values,
        typeName: ZodFirstPartyTypeKind.ZodEnum,
        ...processCreateParams(params),
    });
}
class ZodEnum extends ZodType {
    constructor() {
        super(...arguments);
        _ZodEnum_cache.set(this, void 0);
    }
    _parse(input) {
        if (typeof input.data !== "string") {
            const ctx = this._getOrReturnCtx(input);
            const expectedValues = this._def.values;
            addIssueToContext(ctx, {
                expected: util.joinValues(expectedValues),
                received: ctx.parsedType,
                code: ZodIssueCode.invalid_type,
            });
            return INVALID;
        }
        if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f")) {
            __classPrivateFieldSet(this, _ZodEnum_cache, new Set(this._def.values), "f");
        }
        if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f").has(input.data)) {
            const ctx = this._getOrReturnCtx(input);
            const expectedValues = this._def.values;
            addIssueToContext(ctx, {
                received: ctx.data,
                code: ZodIssueCode.invalid_enum_value,
                options: expectedValues,
            });
            return INVALID;
        }
        return OK(input.data);
    }
    get options() {
        return this._def.values;
    }
    get enum() {
        const enumValues = {};
        for (const val of this._def.values) {
            enumValues[val] = val;
        }
        return enumValues;
    }
    get Values() {
        const enumValues = {};
        for (const val of this._def.values) {
            enumValues[val] = val;
        }
        return enumValues;
    }
    get Enum() {
        const enumValues = {};
        for (const val of this._def.values) {
            enumValues[val] = val;
        }
        return enumValues;
    }
    extract(values, newDef = this._def) {
        return ZodEnum.create(values, {
            ...this._def,
            ...newDef,
        });
    }
    exclude(values, newDef = this._def) {
        return ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
            ...this._def,
            ...newDef,
        });
    }
}
_ZodEnum_cache = new WeakMap();
ZodEnum.create = createZodEnum;
class ZodNativeEnum extends ZodType {
    constructor() {
        super(...arguments);
        _ZodNativeEnum_cache.set(this, void 0);
    }
    _parse(input) {
        const nativeEnumValues = util.getValidEnumValues(this._def.values);
        const ctx = this._getOrReturnCtx(input);
        if (ctx.parsedType !== ZodParsedType.string &&
            ctx.parsedType !== ZodParsedType.number) {
            const expectedValues = util.objectValues(nativeEnumValues);
            addIssueToContext(ctx, {
                expected: util.joinValues(expectedValues),
                received: ctx.parsedType,
                code: ZodIssueCode.invalid_type,
            });
            return INVALID;
        }
        if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f")) {
            __classPrivateFieldSet(this, _ZodNativeEnum_cache, new Set(util.getValidEnumValues(this._def.values)), "f");
        }
        if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f").has(input.data)) {
            const expectedValues = util.objectValues(nativeEnumValues);
            addIssueToContext(ctx, {
                received: ctx.data,
                code: ZodIssueCode.invalid_enum_value,
                options: expectedValues,
            });
            return INVALID;
        }
        return OK(input.data);
    }
    get enum() {
        return this._def.values;
    }
}
_ZodNativeEnum_cache = new WeakMap();
ZodNativeEnum.create = (values, params) => {
    return new ZodNativeEnum({
        values: values,
        typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
        ...processCreateParams(params),
    });
};
class ZodPromise extends ZodType {
    unwrap() {
        return this._def.type;
    }
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.promise &&
            ctx.common.async === false) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.promise,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        const promisified = ctx.parsedType === ZodParsedType.promise
            ? ctx.data
            : Promise.resolve(ctx.data);
        return OK(promisified.then((data) => {
            return this._def.type.parseAsync(data, {
                path: ctx.path,
                errorMap: ctx.common.contextualErrorMap,
            });
        }));
    }
}
ZodPromise.create = (schema, params) => {
    return new ZodPromise({
        type: schema,
        typeName: ZodFirstPartyTypeKind.ZodPromise,
        ...processCreateParams(params),
    });
};
class ZodEffects extends ZodType {
    innerType() {
        return this._def.schema;
    }
    sourceType() {
        return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects
            ? this._def.schema.sourceType()
            : this._def.schema;
    }
    _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        const effect = this._def.effect || null;
        const checkCtx = {
            addIssue: (arg) => {
                addIssueToContext(ctx, arg);
                if (arg.fatal) {
                    status.abort();
                }
                else {
                    status.dirty();
                }
            },
            get path() {
                return ctx.path;
            },
        };
        checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
        if (effect.type === "preprocess") {
            const processed = effect.transform(ctx.data, checkCtx);
            if (ctx.common.async) {
                return Promise.resolve(processed).then(async (processed) => {
                    if (status.value === "aborted")
                        return INVALID;
                    const result = await this._def.schema._parseAsync({
                        data: processed,
                        path: ctx.path,
                        parent: ctx,
                    });
                    if (result.status === "aborted")
                        return INVALID;
                    if (result.status === "dirty")
                        return DIRTY(result.value);
                    if (status.value === "dirty")
                        return DIRTY(result.value);
                    return result;
                });
            }
            else {
                if (status.value === "aborted")
                    return INVALID;
                const result = this._def.schema._parseSync({
                    data: processed,
                    path: ctx.path,
                    parent: ctx,
                });
                if (result.status === "aborted")
                    return INVALID;
                if (result.status === "dirty")
                    return DIRTY(result.value);
                if (status.value === "dirty")
                    return DIRTY(result.value);
                return result;
            }
        }
        if (effect.type === "refinement") {
            const executeRefinement = (acc) => {
                const result = effect.refinement(acc, checkCtx);
                if (ctx.common.async) {
                    return Promise.resolve(result);
                }
                if (result instanceof Promise) {
                    throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
                }
                return acc;
            };
            if (ctx.common.async === false) {
                const inner = this._def.schema._parseSync({
                    data: ctx.data,
                    path: ctx.path,
                    parent: ctx,
                });
                if (inner.status === "aborted")
                    return INVALID;
                if (inner.status === "dirty")
                    status.dirty();
                // return value is ignored
                executeRefinement(inner.value);
                return { status: status.value, value: inner.value };
            }
            else {
                return this._def.schema
                    ._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx })
                    .then((inner) => {
                    if (inner.status === "aborted")
                        return INVALID;
                    if (inner.status === "dirty")
                        status.dirty();
                    return executeRefinement(inner.value).then(() => {
                        return { status: status.value, value: inner.value };
                    });
                });
            }
        }
        if (effect.type === "transform") {
            if (ctx.common.async === false) {
                const base = this._def.schema._parseSync({
                    data: ctx.data,
                    path: ctx.path,
                    parent: ctx,
                });
                if (!isValid(base))
                    return base;
                const result = effect.transform(base.value, checkCtx);
                if (result instanceof Promise) {
                    throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
                }
                return { status: status.value, value: result };
            }
            else {
                return this._def.schema
                    ._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx })
                    .then((base) => {
                    if (!isValid(base))
                        return base;
                    return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({ status: status.value, value: result }));
                });
            }
        }
        util.assertNever(effect);
    }
}
ZodEffects.create = (schema, effect, params) => {
    return new ZodEffects({
        schema,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect,
        ...processCreateParams(params),
    });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
    return new ZodEffects({
        schema,
        effect: { type: "preprocess", transform: preprocess },
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        ...processCreateParams(params),
    });
};
class ZodOptional extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType === ZodParsedType.undefined) {
            return OK(undefined);
        }
        return this._def.innerType._parse(input);
    }
    unwrap() {
        return this._def.innerType;
    }
}
ZodOptional.create = (type, params) => {
    return new ZodOptional({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodOptional,
        ...processCreateParams(params),
    });
};
class ZodNullable extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType === ZodParsedType.null) {
            return OK(null);
        }
        return this._def.innerType._parse(input);
    }
    unwrap() {
        return this._def.innerType;
    }
}
ZodNullable.create = (type, params) => {
    return new ZodNullable({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodNullable,
        ...processCreateParams(params),
    });
};
class ZodDefault extends ZodType {
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        let data = ctx.data;
        if (ctx.parsedType === ZodParsedType.undefined) {
            data = this._def.defaultValue();
        }
        return this._def.innerType._parse({
            data,
            path: ctx.path,
            parent: ctx,
        });
    }
    removeDefault() {
        return this._def.innerType;
    }
}
ZodDefault.create = (type, params) => {
    return new ZodDefault({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodDefault,
        defaultValue: typeof params.default === "function"
            ? params.default
            : () => params.default,
        ...processCreateParams(params),
    });
};
class ZodCatch extends ZodType {
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        // newCtx is used to not collect issues from inner types in ctx
        const newCtx = {
            ...ctx,
            common: {
                ...ctx.common,
                issues: [],
            },
        };
        const result = this._def.innerType._parse({
            data: newCtx.data,
            path: newCtx.path,
            parent: {
                ...newCtx,
            },
        });
        if (isAsync(result)) {
            return result.then((result) => {
                return {
                    status: "valid",
                    value: result.status === "valid"
                        ? result.value
                        : this._def.catchValue({
                            get error() {
                                return new ZodError(newCtx.common.issues);
                            },
                            input: newCtx.data,
                        }),
                };
            });
        }
        else {
            return {
                status: "valid",
                value: result.status === "valid"
                    ? result.value
                    : this._def.catchValue({
                        get error() {
                            return new ZodError(newCtx.common.issues);
                        },
                        input: newCtx.data,
                    }),
            };
        }
    }
    removeCatch() {
        return this._def.innerType;
    }
}
ZodCatch.create = (type, params) => {
    return new ZodCatch({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodCatch,
        catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
        ...processCreateParams(params),
    });
};
class ZodNaN extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.nan) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.nan,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        return { status: "valid", value: input.data };
    }
}
ZodNaN.create = (params) => {
    return new ZodNaN({
        typeName: ZodFirstPartyTypeKind.ZodNaN,
        ...processCreateParams(params),
    });
};
const BRAND = Symbol("zod_brand");
class ZodBranded extends ZodType {
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        const data = ctx.data;
        return this._def.type._parse({
            data,
            path: ctx.path,
            parent: ctx,
        });
    }
    unwrap() {
        return this._def.type;
    }
}
class ZodPipeline extends ZodType {
    _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.common.async) {
            const handleAsync = async () => {
                const inResult = await this._def.in._parseAsync({
                    data: ctx.data,
                    path: ctx.path,
                    parent: ctx,
                });
                if (inResult.status === "aborted")
                    return INVALID;
                if (inResult.status === "dirty") {
                    status.dirty();
                    return DIRTY(inResult.value);
                }
                else {
                    return this._def.out._parseAsync({
                        data: inResult.value,
                        path: ctx.path,
                        parent: ctx,
                    });
                }
            };
            return handleAsync();
        }
        else {
            const inResult = this._def.in._parseSync({
                data: ctx.data,
                path: ctx.path,
                parent: ctx,
            });
            if (inResult.status === "aborted")
                return INVALID;
            if (inResult.status === "dirty") {
                status.dirty();
                return {
                    status: "dirty",
                    value: inResult.value,
                };
            }
            else {
                return this._def.out._parseSync({
                    data: inResult.value,
                    path: ctx.path,
                    parent: ctx,
                });
            }
        }
    }
    static create(a, b) {
        return new ZodPipeline({
            in: a,
            out: b,
            typeName: ZodFirstPartyTypeKind.ZodPipeline,
        });
    }
}
class ZodReadonly extends ZodType {
    _parse(input) {
        const result = this._def.innerType._parse(input);
        const freeze = (data) => {
            if (isValid(data)) {
                data.value = Object.freeze(data.value);
            }
            return data;
        };
        return isAsync(result)
            ? result.then((data) => freeze(data))
            : freeze(result);
    }
    unwrap() {
        return this._def.innerType;
    }
}
ZodReadonly.create = (type, params) => {
    return new ZodReadonly({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodReadonly,
        ...processCreateParams(params),
    });
};
////////////////////////////////////////
////////////////////////////////////////
//////////                    //////////
//////////      z.custom      //////////
//////////                    //////////
////////////////////////////////////////
////////////////////////////////////////
function cleanParams(params, data) {
    const p = typeof params === "function"
        ? params(data)
        : typeof params === "string"
            ? { message: params }
            : params;
    const p2 = typeof p === "string" ? { message: p } : p;
    return p2;
}
function custom(check, _params = {}, 
/**
 * @deprecated
 *
 * Pass `fatal` into the params object instead:
 *
 * ```ts
 * z.string().custom((val) => val.length > 5, { fatal: false })
 * ```
 *
 */
fatal) {
    if (check)
        return ZodAny.create().superRefine((data, ctx) => {
            var _a, _b;
            const r = check(data);
            if (r instanceof Promise) {
                return r.then((r) => {
                    var _a, _b;
                    if (!r) {
                        const params = cleanParams(_params, data);
                        const _fatal = (_b = (_a = params.fatal) !== null && _a !== void 0 ? _a : fatal) !== null && _b !== void 0 ? _b : true;
                        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
                    }
                });
            }
            if (!r) {
                const params = cleanParams(_params, data);
                const _fatal = (_b = (_a = params.fatal) !== null && _a !== void 0 ? _a : fatal) !== null && _b !== void 0 ? _b : true;
                ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
            }
            return;
        });
    return ZodAny.create();
}
const late = {
    object: ZodObject.lazycreate,
};
var ZodFirstPartyTypeKind;
(function (ZodFirstPartyTypeKind) {
    ZodFirstPartyTypeKind["ZodString"] = "ZodString";
    ZodFirstPartyTypeKind["ZodNumber"] = "ZodNumber";
    ZodFirstPartyTypeKind["ZodNaN"] = "ZodNaN";
    ZodFirstPartyTypeKind["ZodBigInt"] = "ZodBigInt";
    ZodFirstPartyTypeKind["ZodBoolean"] = "ZodBoolean";
    ZodFirstPartyTypeKind["ZodDate"] = "ZodDate";
    ZodFirstPartyTypeKind["ZodSymbol"] = "ZodSymbol";
    ZodFirstPartyTypeKind["ZodUndefined"] = "ZodUndefined";
    ZodFirstPartyTypeKind["ZodNull"] = "ZodNull";
    ZodFirstPartyTypeKind["ZodAny"] = "ZodAny";
    ZodFirstPartyTypeKind["ZodUnknown"] = "ZodUnknown";
    ZodFirstPartyTypeKind["ZodNever"] = "ZodNever";
    ZodFirstPartyTypeKind["ZodVoid"] = "ZodVoid";
    ZodFirstPartyTypeKind["ZodArray"] = "ZodArray";
    ZodFirstPartyTypeKind["ZodObject"] = "ZodObject";
    ZodFirstPartyTypeKind["ZodUnion"] = "ZodUnion";
    ZodFirstPartyTypeKind["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
    ZodFirstPartyTypeKind["ZodIntersection"] = "ZodIntersection";
    ZodFirstPartyTypeKind["ZodTuple"] = "ZodTuple";
    ZodFirstPartyTypeKind["ZodRecord"] = "ZodRecord";
    ZodFirstPartyTypeKind["ZodMap"] = "ZodMap";
    ZodFirstPartyTypeKind["ZodSet"] = "ZodSet";
    ZodFirstPartyTypeKind["ZodFunction"] = "ZodFunction";
    ZodFirstPartyTypeKind["ZodLazy"] = "ZodLazy";
    ZodFirstPartyTypeKind["ZodLiteral"] = "ZodLiteral";
    ZodFirstPartyTypeKind["ZodEnum"] = "ZodEnum";
    ZodFirstPartyTypeKind["ZodEffects"] = "ZodEffects";
    ZodFirstPartyTypeKind["ZodNativeEnum"] = "ZodNativeEnum";
    ZodFirstPartyTypeKind["ZodOptional"] = "ZodOptional";
    ZodFirstPartyTypeKind["ZodNullable"] = "ZodNullable";
    ZodFirstPartyTypeKind["ZodDefault"] = "ZodDefault";
    ZodFirstPartyTypeKind["ZodCatch"] = "ZodCatch";
    ZodFirstPartyTypeKind["ZodPromise"] = "ZodPromise";
    ZodFirstPartyTypeKind["ZodBranded"] = "ZodBranded";
    ZodFirstPartyTypeKind["ZodPipeline"] = "ZodPipeline";
    ZodFirstPartyTypeKind["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
const instanceOfType = (
// const instanceOfType = <T extends new (...args: any[]) => any>(
cls, params = {
    message: `Input not instance of ${cls.name}`,
}) => custom((data) => data instanceof cls, params);
const stringType = ZodString.create;
const numberType = ZodNumber.create;
const nanType = ZodNaN.create;
const bigIntType = ZodBigInt.create;
const booleanType = ZodBoolean.create;
const dateType = ZodDate.create;
const symbolType = ZodSymbol.create;
const undefinedType = ZodUndefined.create;
const nullType = ZodNull.create;
const anyType = ZodAny.create;
const unknownType = ZodUnknown.create;
const neverType = ZodNever.create;
const voidType = ZodVoid.create;
const arrayType = ZodArray.create;
const objectType = ZodObject.create;
const strictObjectType = ZodObject.strictCreate;
const unionType = ZodUnion.create;
const discriminatedUnionType = ZodDiscriminatedUnion.create;
const intersectionType = ZodIntersection.create;
const tupleType = ZodTuple.create;
const recordType = ZodRecord.create;
const mapType = ZodMap.create;
const setType = ZodSet.create;
const functionType = ZodFunction.create;
const lazyType = ZodLazy.create;
const literalType = ZodLiteral.create;
const enumType = ZodEnum.create;
const nativeEnumType = ZodNativeEnum.create;
const promiseType = ZodPromise.create;
const effectsType = ZodEffects.create;
const optionalType = ZodOptional.create;
const nullableType = ZodNullable.create;
const preprocessType = ZodEffects.createWithPreprocess;
const pipelineType = ZodPipeline.create;
const ostring = () => stringType().optional();
const onumber = () => numberType().optional();
const oboolean = () => booleanType().optional();
const coerce = {
    string: ((arg) => ZodString.create({ ...arg, coerce: true })),
    number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
    boolean: ((arg) => ZodBoolean.create({
        ...arg,
        coerce: true,
    })),
    bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
    date: ((arg) => ZodDate.create({ ...arg, coerce: true })),
};
const NEVER = INVALID;

var z = /*#__PURE__*/Object.freeze({
    __proto__: null,
    defaultErrorMap: errorMap,
    setErrorMap: setErrorMap,
    getErrorMap: getErrorMap,
    makeIssue: makeIssue,
    EMPTY_PATH: EMPTY_PATH,
    addIssueToContext: addIssueToContext,
    ParseStatus: ParseStatus,
    INVALID: INVALID,
    DIRTY: DIRTY,
    OK: OK,
    isAborted: isAborted,
    isDirty: isDirty,
    isValid: isValid,
    isAsync: isAsync,
    get util () { return util; },
    get objectUtil () { return objectUtil; },
    ZodParsedType: ZodParsedType,
    getParsedType: getParsedType,
    ZodType: ZodType,
    datetimeRegex: datetimeRegex,
    ZodString: ZodString,
    ZodNumber: ZodNumber,
    ZodBigInt: ZodBigInt,
    ZodBoolean: ZodBoolean,
    ZodDate: ZodDate,
    ZodSymbol: ZodSymbol,
    ZodUndefined: ZodUndefined,
    ZodNull: ZodNull,
    ZodAny: ZodAny,
    ZodUnknown: ZodUnknown,
    ZodNever: ZodNever,
    ZodVoid: ZodVoid,
    ZodArray: ZodArray,
    ZodObject: ZodObject,
    ZodUnion: ZodUnion,
    ZodDiscriminatedUnion: ZodDiscriminatedUnion,
    ZodIntersection: ZodIntersection,
    ZodTuple: ZodTuple,
    ZodRecord: ZodRecord,
    ZodMap: ZodMap,
    ZodSet: ZodSet,
    ZodFunction: ZodFunction,
    ZodLazy: ZodLazy,
    ZodLiteral: ZodLiteral,
    ZodEnum: ZodEnum,
    ZodNativeEnum: ZodNativeEnum,
    ZodPromise: ZodPromise,
    ZodEffects: ZodEffects,
    ZodTransformer: ZodEffects,
    ZodOptional: ZodOptional,
    ZodNullable: ZodNullable,
    ZodDefault: ZodDefault,
    ZodCatch: ZodCatch,
    ZodNaN: ZodNaN,
    BRAND: BRAND,
    ZodBranded: ZodBranded,
    ZodPipeline: ZodPipeline,
    ZodReadonly: ZodReadonly,
    custom: custom,
    Schema: ZodType,
    ZodSchema: ZodType,
    late: late,
    get ZodFirstPartyTypeKind () { return ZodFirstPartyTypeKind; },
    coerce: coerce,
    any: anyType,
    array: arrayType,
    bigint: bigIntType,
    boolean: booleanType,
    date: dateType,
    discriminatedUnion: discriminatedUnionType,
    effect: effectsType,
    'enum': enumType,
    'function': functionType,
    'instanceof': instanceOfType,
    intersection: intersectionType,
    lazy: lazyType,
    literal: literalType,
    map: mapType,
    nan: nanType,
    nativeEnum: nativeEnumType,
    never: neverType,
    'null': nullType,
    nullable: nullableType,
    number: numberType,
    object: objectType,
    oboolean: oboolean,
    onumber: onumber,
    optional: optionalType,
    ostring: ostring,
    pipeline: pipelineType,
    preprocess: preprocessType,
    promise: promiseType,
    record: recordType,
    set: setType,
    strictObject: strictObjectType,
    string: stringType,
    symbol: symbolType,
    transformer: effectsType,
    tuple: tupleType,
    'undefined': undefinedType,
    union: unionType,
    unknown: unknownType,
    'void': voidType,
    NEVER: NEVER,
    ZodIssueCode: ZodIssueCode,
    quotelessJson: quotelessJson,
    ZodError: ZodError
});




/***/ }),

/***/ "./src/background/chat-handler.ts":
/*!****************************************!*\
  !*** ./src/background/chat-handler.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DEFAULT_MODELS: () => (/* binding */ DEFAULT_MODELS),
/* harmony export */   GEE_SYSTEM_PROMPT: () => (/* binding */ GEE_SYSTEM_PROMPT),
/* harmony export */   handleChatRequest: () => (/* binding */ handleChatRequest)
/* harmony export */ });
/* harmony import */ var ai__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ai */ "./node_modules/ai/dist/index.mjs");
/* harmony import */ var _ai_sdk_openai__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @ai-sdk/openai */ "./node_modules/@ai-sdk/openai/dist/index.mjs");
/* harmony import */ var _ai_sdk_anthropic__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @ai-sdk/anthropic */ "./node_modules/@ai-sdk/anthropic/dist/index.mjs");
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! zod */ "./node_modules/zod/lib/index.mjs");
/* harmony import */ var _lib_tools_context7__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../lib/tools/context7 */ "./src/lib/tools/context7/index.ts");





// Default models configuration
const DEFAULT_MODELS = {
    openai: 'gpt-4o',
    anthropic: 'claude-3-5-haiku-20241022'
};
// Custom fetch function for Anthropic to handle CORS
const corsProxyFetch = async (input, options = {}) => {
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
        const enhancedOptions = {
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
        }
        else {
            console.error(`❌ [CORS Proxy] Request failed: ${response.status} ${response.statusText}`);
            // Try to get error details
            try {
                const errorData = await response.clone().text();
                console.error(`❌ [CORS Proxy] Error details: ${errorData}`);
            }
            catch (e) {
                console.error(`❌ [CORS Proxy] Could not read error details`);
            }
        }
        return response;
    }
    catch (error) {
        console.error(`❌ [CORS Proxy] Fetch error:`, error);
        // Create a synthetic error response
        return new Response(JSON.stringify({
            error: {
                type: 'fetch_error',
                message: error instanceof Error ? error.message : String(error),
                details: 'Error occurred during custom fetch operation'
            }
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
// Earth Engine system prompt with domain expertise
const GEE_SYSTEM_PROMPT = `You are Earth Engine Assistant, an AI specialized in Google Earth Engine (GEE) geospatial analysis.

Your capabilities:
- Provide code examples for GEE tasks like image processing, classification, and visualization
- Explain Earth Engine concepts, APIs, and best practices
- Help troubleshoot Earth Engine code issues
- Recommend appropriate datasets and methods for geospatial analysis
- You can use tools to get the weather in a location
- You can search for Earth Engine datasets and get documentation
- You can insert JavaScript code directly into the Earth Engine code editor
- You can execute JavaScript code in the Earth Engine environment
- You can take a screenshot of the current browser tab and include it directly in your responses

Workflow for map-related questions:
1. When a user asks about creating a map, visualizing data, or needs geospatial analysis, ALWAYS use the earthEngineDataset tool FIRST to retrieve relevant dataset information
2. Wait for the tool response to get dataset IDs, paths, and documentation
3. Based on the retrieved information, craft appropriate code examples that correctly reference the dataset
4. Provide a complete, working solution that includes proper dataset loading, processing, and visualization
5. If the user reports issues or you need to see the visual output, consider using the screenshot tool to capture the current state of the map or console.

Visual Assistance Workflow:
1. When a user asks about what's on their map or to analyze current visual elements, use the screenshot tool
2. The screenshot will be captured and included directly in your response
3. You can then analyze what's visible in the image and provide context, explanations, or suggestions
4. Use phrases like "As I can see in the screenshot..." when referring to visual elements
5. When analyzing maps, point out relevant features like coastlines, urban areas, vegetation patterns, etc.

Workflow for implementing code:
1. When a user wants to implement/run code, first ensure the code is complete and correct
2. You have TWO options for executing code:
   a. Use the earthEngineScript tool to INSERT the code into the Google Earth Engine editor
   b. Use the earthEngineRunCode tool to DIRECTLY RUN the code in the Earth Engine environment

When to use earthEngineScript vs earthEngineRunCode:
- Use earthEngineScript when the user wants to examine, modify, or save the code before running it
- Use earthEngineRunCode when the user wants immediate results or to execute a quick test
- If the user says "run this code" or "execute this", use earthEngineRunCode
- If the user says "add this code" or "put this in the editor", use earthEngineScript
- When uncertain, use earthEngineScript as it's less invasive

Debugging Workflow:
1. If a user reports an error after running code, ask for the specific error message.
2. Check the code you provided for obvious syntax errors or logical flaws.
3. If the error isn't clear, consider using the screenshot tool to see the GEE console output or map state.
4. Based on the error message and potentially the screenshot, suggest corrections or alternative approaches.

Instructions:
- Always provide code within backticks: \`code\`
- Format Earth Engine code with proper JavaScript/Python syntax
- When suggesting large code blocks, include comments explaining key steps
- Cite specific Earth Engine functions and methods when relevant
- For complex topics, break down explanations step-by-step
- If you're unsure about something, acknowledge limitations rather than providing incorrect information
- When asked about weather, use the weather tool to get real-time information and format it nicely
- When asked about Earth Engine datasets, use the earthEngineDataset tool to get up-to-date documentation
- For ANY map or geospatial visualization request, FIRST use earthEngineDataset tool before providing code
- When a user wants to implement your code suggestion, use the appropriate tool based on their intent
- Use the screenshot tool judiciously when visual context is needed for debugging or understanding results.
- When users ask you to "make a screenshot and tell me about what's going on", use the screenshot tool and analyze the image in your response

Common Earth Engine patterns:
- Image and collection loading: ee.Image(), ee.ImageCollection()
- Filtering: .filterDate(), .filterBounds()
- Reducing: .reduce(), .mean(), .median()
- Visualization: Map.addLayer(), ui.Map(), ui.Chart()
- Classification: .classify(), ee.Classifier.randomForest()
- Exporting: Export.image.toDrive(), Export.table.toAsset()

Dataset-Driven Code Examples:
- After retrieving dataset information using the earthEngineDataset tool, include the exact dataset ID/path in your code
- Match your code examples to the specific bands, properties, and structure of the dataset
- Include appropriate visualization parameters based on the dataset type
- Reference key metadata like resolution, time range, and units when available

Code Implementation:
- When a user asks to implement a code example, offer to insert it directly using the earthEngineScript tool
- When a user asks to run or execute code immediately, use the earthEngineRunCode tool
- Before inserting or running, ensure the code is complete, properly formatted and includes all necessary imports
- Always offer to help troubleshoot any errors that may occur when running the inserted code
- If a user is asked to "try this code", automatically offer to insert or run it for them

Speak in a helpful, educational tone while providing practical guidance for Earth Engine tasks.`;
/**
 * Handle chat messages from the UI
 */
async function handleChatRequest(messages, apiKey, provider, model) {
    try {
        // Debug log at start of request
        console.log(`🔍 [Chat Handler] Request starting with provider: ${provider}, requested model: ${model || 'default'}`);
        if (!apiKey) {
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
        // Setup LLM provider
        let llmProvider;
        let effectiveModel;
        if (provider === 'openai') {
            llmProvider = (0,_ai_sdk_openai__WEBPACK_IMPORTED_MODULE_1__.createOpenAI)({ apiKey });
            effectiveModel = model || DEFAULT_MODELS.openai;
            console.log(`Using OpenAI provider with model: ${effectiveModel}`);
        }
        else if (provider === 'anthropic') {
            // Check if the requested model exists in our available model list
            const anthropicModels = [
                'claude-3-7-sonnet-20250219',
                'claude-3-5-sonnet-20241022',
                'claude-3-5-haiku-20241022',
                'claude-3-5-sonnet-20240620'
            ];
            // Use the requested model if it's in our list, otherwise use the default
            let selectedModel = model;
            if (!selectedModel || !anthropicModels.includes(selectedModel)) {
                console.log(`⚠️ [Chat Handler] Requested Claude model "${model}" not found in available models. Using default.`);
                selectedModel = DEFAULT_MODELS.anthropic;
            }
            effectiveModel = selectedModel;
            // Create the Anthropic provider
            llmProvider = (0,_ai_sdk_anthropic__WEBPACK_IMPORTED_MODULE_2__.createAnthropic)({
                apiKey,
                // Set the correct baseURL for the Anthropic API, without the version path
                baseURL: 'https://api.anthropic.com',
                // Use our custom fetch to handle CORS issues
                fetch: corsProxyFetch,
            });
            console.log(`Using Anthropic provider with model: ${effectiveModel} (UI selection was: ${model || 'not specified'})`);
        }
        else {
            return new Response(JSON.stringify({ error: 'Unsupported API provider' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // Message mapping that supports both string content and multi-modal content with parts
        const formattedMessages = messages
            .map((msg) => {
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
                const formattedParts = [];
                for (const part of msg.parts) {
                    if (part.type === 'text' && part.text) {
                        console.log('Processing text part:', part.text.substring(0, 50) + (part.text.length > 50 ? '...' : ''));
                        formattedParts.push({ type: 'text', text: part.text });
                    }
                    else if (part.type === 'file' && part.mimeType?.startsWith('image/') && part.data) {
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
                        });
                    }
                }
                // Only return if we have valid parts
                if (formattedParts.length > 0) {
                    console.log(`Created formatted message with ${formattedParts.length} parts:`, formattedParts.map(p => p.type).join(', '));
                    return { role: msg.role, content: formattedParts };
                }
                else {
                    console.warn('No valid parts found in multi-modal message');
                }
            }
            console.warn('Filtering out message with incompatible role/content:', msg);
            return null;
        })
            .filter((msg) => msg !== null);
        // Define the weather tool using the AI SDK tool format
        const weatherTool = (0,ai__WEBPACK_IMPORTED_MODULE_3__.tool)({
            description: 'Get the weather in a location',
            parameters: zod__WEBPACK_IMPORTED_MODULE_4__.z.object({
                location: zod__WEBPACK_IMPORTED_MODULE_4__.z.string().describe('The location to get the weather for'),
            }),
            execute: async ({ location }) => {
                // Simulate weather data
                const temperature = 72 + Math.floor(Math.random() * 21) - 10;
                return {
                    location,
                    temperature,
                    description: temperature > 75 ? 'Sunny and warm' : 'Partly cloudy',
                    humidity: Math.floor(Math.random() * 30) + 50, // Random humidity between 50-80%
                };
            },
        });
        // Define Earth Engine dataset documentation tool
        const earthEngineDatasetTool = (0,ai__WEBPACK_IMPORTED_MODULE_3__.tool)({
            description: 'Get information about Earth Engine datasets including documentation and code examples',
            parameters: zod__WEBPACK_IMPORTED_MODULE_4__.z.object({
                datasetQuery: zod__WEBPACK_IMPORTED_MODULE_4__.z.string().describe('The Earth Engine dataset or topic to search for (e.g., "LANDSAT", "elevation", "MODIS")')
            }),
            execute: async ({ datasetQuery }) => {
                try {
                    console.log(`🌍 [EarthEngineDatasetTool] Tool called with query: "${datasetQuery}"`);
                    console.time('EarthEngineDatasetTool execution');
                    // Use the Context7 getDocumentation function to fetch dataset information
                    // The Earth Engine dataset catalog is stored in wybert/earthengine-dataset-catalog-md
                    const result = await (0,_lib_tools_context7__WEBPACK_IMPORTED_MODULE_0__.getDocumentation)('wybert/earthengine-dataset-catalog-md', datasetQuery, { tokens: 15000 } // Get a good amount of content
                    );
                    console.timeEnd('EarthEngineDatasetTool execution');
                    if (!result.success || !result.content) {
                        console.warn(`❌ [EarthEngineDatasetTool] No results found for "${datasetQuery}". Error: ${result.message}`);
                        return {
                            found: false,
                            message: result.message || `Could not find documentation for "${datasetQuery}"`,
                            suggestion: "Try a more general search term or check the spelling of the dataset name."
                        };
                    }
                    console.log(`✅ [EarthEngineDatasetTool] Found documentation for "${datasetQuery}". Content length: ${result.content.length} chars`);
                    return {
                        found: true,
                        query: datasetQuery,
                        documentation: result.content,
                        message: `Documentation found for Earth Engine dataset related to "${datasetQuery}"`
                    };
                }
                catch (error) {
                    console.error(`❌ [EarthEngineDatasetTool] Error fetching Earth Engine dataset info:`, error);
                    return {
                        found: false,
                        message: `Error retrieving Earth Engine dataset information: ${error instanceof Error ? error.message : String(error)}`,
                        suggestion: "Try again with a different dataset name or more specific query."
                    };
                }
            },
        });
        // Define Earth Engine script editor tool
        const earthEngineScriptTool = (0,ai__WEBPACK_IMPORTED_MODULE_3__.tool)({
            description: 'Insert JavaScript code into the Google Earth Engine code editor',
            parameters: zod__WEBPACK_IMPORTED_MODULE_4__.z.object({
                scriptId: zod__WEBPACK_IMPORTED_MODULE_4__.z.string().describe('The ID of the script to edit (use "current" for the currently open script)'),
                code: zod__WEBPACK_IMPORTED_MODULE_4__.z.string().describe('The Google Earth Engine JavaScript code to insert into the editor')
            }),
            execute: async ({ scriptId, code }) => {
                try {
                    console.log(`🔧 [EarthEngineScriptTool] Tool called to edit script "${scriptId}"`);
                    console.time('EarthEngineScriptTool execution');
                    const targetScriptId = scriptId === 'current' ? 'current_editor' : scriptId;
                    // Check if Chrome tabs API is available
                    if (typeof chrome === 'undefined' || !chrome.tabs) {
                        console.warn('❌ [EarthEngineScriptTool] Chrome tabs API not available');
                        return {
                            success: false,
                            error: 'Cannot edit Earth Engine scripts: Extension context not available',
                            suggestion: "This operation requires running in a Chrome extension environment"
                        };
                    }
                    // Find the Earth Engine tab
                    const earthEngineTabs = await new Promise((resolve) => {
                        chrome.tabs.query({ url: "*://code.earthengine.google.com/*" }, (tabs) => {
                            resolve(tabs || []);
                        });
                    });
                    if (earthEngineTabs.length === 0) {
                        console.warn('❌ [EarthEngineScriptTool] No Earth Engine tab found');
                        return {
                            success: false,
                            error: 'No Earth Engine tab found',
                            suggestion: "Please open Google Earth Engine in a browser tab first"
                        };
                    }
                    const tabId = earthEngineTabs[0].id;
                    if (!tabId) {
                        console.warn('❌ [EarthEngineScriptTool] Invalid Earth Engine tab');
                        return {
                            success: false,
                            error: 'Invalid Earth Engine tab',
                            suggestion: "Please reload your Earth Engine tab and try again"
                        };
                    }
                    console.log(`🔧 [EarthEngineScriptTool] Found Earth Engine tab: ${tabId}`);
                    // Check/inject content script
                    try {
                        await new Promise((resolve, reject) => {
                            const timeout = setTimeout(() => reject(new Error('Content script ping timed out')), 300);
                            chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
                                clearTimeout(timeout);
                                if (chrome.runtime.lastError) {
                                    reject(new Error(chrome.runtime.lastError.message || 'Error pinging content script'));
                                }
                                else {
                                    resolve();
                                }
                            });
                        });
                        console.log(`🔧 [EarthEngineScriptTool] Content script ready`);
                    }
                    catch (pingError) {
                        const errorMessage = pingError instanceof Error ? pingError.message : String(pingError);
                        console.log(`🔧 [EarthEngineScriptTool] Content script not ready: ${errorMessage}, injecting...`);
                        try {
                            await new Promise((resolve, reject) => {
                                chrome.scripting.executeScript({
                                    target: { tabId },
                                    files: ['content.js']
                                }, (results) => {
                                    if (chrome.runtime.lastError) {
                                        reject(new Error(chrome.runtime.lastError.message || 'Failed to inject content script'));
                                    }
                                    else {
                                        setTimeout(resolve, 500); // Wait for script init
                                    }
                                });
                            });
                            console.log(`🔧 [EarthEngineScriptTool] Content script injected successfully`);
                        }
                        catch (injectError) {
                            const injectErrorMessage = injectError instanceof Error ? injectError.message : String(injectError);
                            console.warn(`❌ [EarthEngineScriptTool] Failed to inject content script: ${injectErrorMessage}`);
                            return {
                                success: false,
                                error: `Content script not available: ${injectErrorMessage}`,
                                suggestion: "Try refreshing the Earth Engine tab and ensure the extension has permission"
                            };
                        }
                    }
                    // Send message to content script
                    const result = await new Promise((resolve) => {
                        chrome.tabs.sendMessage(tabId, { type: 'EDIT_SCRIPT', scriptId: targetScriptId, content: code }, (response) => {
                            if (chrome.runtime.lastError) {
                                resolve({ success: false, error: chrome.runtime.lastError.message || 'Error communicating with content script' });
                            }
                            else {
                                resolve(response || { success: false, error: 'No response from content script' });
                            }
                        });
                    });
                    console.timeEnd('EarthEngineScriptTool execution');
                    if (!result.success) {
                        console.warn(`❌ [EarthEngineScriptTool] Failed to edit script via content script: ${result.error}`);
                        return {
                            success: false,
                            error: result.error || 'Unknown error editing script',
                            suggestion: "Check content script logs or ensure EE tab is active."
                        };
                    }
                    console.log(`✅ [EarthEngineScriptTool] Successfully edited script "${targetScriptId}"`);
                    return {
                        success: true,
                        scriptId: targetScriptId,
                        message: result.message || `Successfully inserted code into Earth Engine script "${targetScriptId}"`,
                        nextSteps: "You can now run the script in Earth Engine by clicking the 'Run' button"
                    };
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`❌ [EarthEngineScriptTool] Unexpected error:`, error);
                    return {
                        success: false,
                        error: `Unexpected error in EarthEngineScriptTool: ${errorMessage}`,
                        suggestion: "Check background script logs for more details"
                    };
                }
            },
        });
        // Define Earth Engine code runner tool
        const earthEngineRunCodeTool = (0,ai__WEBPACK_IMPORTED_MODULE_3__.tool)({
            description: 'Run JavaScript code in the Google Earth Engine code editor',
            parameters: zod__WEBPACK_IMPORTED_MODULE_4__.z.object({
                code: zod__WEBPACK_IMPORTED_MODULE_4__.z.string().describe('The Google Earth Engine JavaScript code to run in the editor')
            }),
            execute: async ({ code }) => {
                try {
                    console.log(`🏃 [EarthEngineRunCodeTool] Tool called to run code`);
                    console.time('EarthEngineRunCodeTool execution');
                    // Check if Chrome tabs API is available
                    if (typeof chrome === 'undefined' || !chrome.tabs) {
                        console.warn('❌ [EarthEngineRunCodeTool] Chrome tabs API not available');
                        return {
                            success: false,
                            error: 'Cannot run Earth Engine code: Extension context not available',
                            suggestion: "This operation requires running in a Chrome extension environment"
                        };
                    }
                    // Find the Earth Engine tab
                    const earthEngineTabs = await new Promise((resolve) => {
                        chrome.tabs.query({ url: "*://code.earthengine.google.com/*" }, (tabs) => {
                            resolve(tabs || []);
                        });
                    });
                    if (earthEngineTabs.length === 0) {
                        console.warn('❌ [EarthEngineRunCodeTool] No Earth Engine tab found');
                        return {
                            success: false,
                            error: 'No Earth Engine tab found',
                            suggestion: "Please open Google Earth Engine in a browser tab first"
                        };
                    }
                    const tabId = earthEngineTabs[0].id;
                    if (!tabId) {
                        console.warn('❌ [EarthEngineRunCodeTool] Invalid Earth Engine tab');
                        return {
                            success: false,
                            error: 'Invalid Earth Engine tab',
                            suggestion: "Please reload your Earth Engine tab and try again"
                        };
                    }
                    console.log(`🏃 [EarthEngineRunCodeTool] Found Earth Engine tab: ${tabId}`);
                    // Check/inject content script
                    try {
                        await new Promise((resolve, reject) => {
                            const timeout = setTimeout(() => reject(new Error('Content script ping timed out')), 300);
                            chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
                                clearTimeout(timeout);
                                if (chrome.runtime.lastError) {
                                    reject(new Error(chrome.runtime.lastError.message || 'Error pinging content script'));
                                }
                                else {
                                    resolve();
                                }
                            });
                        });
                        console.log(`🏃 [EarthEngineRunCodeTool] Content script ready`);
                    }
                    catch (pingError) {
                        const errorMessage = pingError instanceof Error ? pingError.message : String(pingError);
                        console.log(`🏃 [EarthEngineRunCodeTool] Content script not ready: ${errorMessage}, injecting...`);
                        try {
                            await new Promise((resolve, reject) => {
                                chrome.scripting.executeScript({
                                    target: { tabId },
                                    files: ['content.js']
                                }, (results) => {
                                    if (chrome.runtime.lastError) {
                                        reject(new Error(chrome.runtime.lastError.message || 'Failed to inject content script'));
                                    }
                                    else {
                                        setTimeout(resolve, 500); // Wait for script init
                                    }
                                });
                            });
                            console.log(`🏃 [EarthEngineRunCodeTool] Content script injected successfully`);
                        }
                        catch (injectError) {
                            const injectErrorMessage = injectError instanceof Error ? injectError.message : String(injectError);
                            console.warn(`❌ [EarthEngineRunCodeTool] Failed to inject content script: ${injectErrorMessage}`);
                            return {
                                success: false,
                                error: `Content script not available: ${injectErrorMessage}`,
                                suggestion: "Try refreshing the Earth Engine tab and ensure the extension has permission"
                            };
                        }
                    }
                    // Send message to content script
                    const result = await new Promise((resolve) => {
                        chrome.tabs.sendMessage(tabId, { type: 'RUN_CODE', code }, (response) => {
                            if (chrome.runtime.lastError) {
                                resolve({ success: false, error: chrome.runtime.lastError.message || 'Error communicating with content script' });
                            }
                            else {
                                resolve(response || { success: false, error: 'No response from content script' });
                            }
                        });
                    });
                    console.timeEnd('EarthEngineRunCodeTool execution');
                    if (!result.success) {
                        console.warn(`❌ [EarthEngineRunCodeTool] Failed to run code via content script: ${result.error}`);
                        return {
                            success: false,
                            error: result.error || 'Unknown error running code',
                            suggestion: "Check content script logs or ensure EE tab is active."
                        };
                    }
                    console.log(`✅ [EarthEngineRunCodeTool] Successfully ran code with result: ${result.result || 'No result returned'}`);
                    return {
                        success: true,
                        result: result.result || 'Code executed successfully',
                        message: 'Earth Engine code executed successfully',
                        nextSteps: "Check the Earth Engine console for any output or results"
                    };
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`❌ [EarthEngineRunCodeTool] Unexpected error:`, error);
                    return {
                        success: false,
                        error: `Unexpected error in EarthEngineRunCodeTool: ${errorMessage}`,
                        suggestion: "Check background script logs for more details"
                    };
                }
            },
        });
        // Define Screenshot tool
        const screenshotTool = (0,ai__WEBPACK_IMPORTED_MODULE_3__.tool)({
            description: 'Capture a screenshot of the current active browser tab. Useful for seeing map visualizations, console errors, or task status in Google Earth Engine.',
            parameters: zod__WEBPACK_IMPORTED_MODULE_4__.z.object({}), // No parameters needed
            execute: async () => {
                try {
                    console.log(`📸 [ScreenshotTool] Tool called`);
                    console.time('ScreenshotTool execution');
                    // Check if Chrome tabs API is available
                    if (typeof chrome === 'undefined' || !chrome.tabs) {
                        console.warn('❌ [ScreenshotTool] Chrome tabs API not available');
                        return {
                            success: false,
                            error: 'Cannot take screenshots: Extension context not available',
                        };
                    }
                    // Get the active tab in the current window
                    const tabs = await new Promise((resolve) => {
                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                            resolve(tabs || []);
                        });
                    });
                    if (!tabs || tabs.length === 0) {
                        console.warn('❌ [ScreenshotTool] No active tab found');
                        return {
                            success: false,
                            error: 'No active tab found',
                        };
                    }
                    const activeTab = tabs[0];
                    if (!activeTab.id || !activeTab.windowId) {
                        console.warn('❌ [ScreenshotTool] Invalid active tab information');
                        return {
                            success: false,
                            error: 'Could not get active tab information',
                        };
                    }
                    console.log(`📸 [ScreenshotTool] Capturing visible area of tab ${activeTab.id}`);
                    // Capture the visible tab area with reduced quality
                    const dataUrl = await new Promise((resolve, reject) => {
                        chrome.tabs.captureVisibleTab(activeTab.windowId, { format: 'jpeg', quality: 50 }, (dataUrl) => {
                            if (chrome.runtime.lastError) {
                                reject(new Error(chrome.runtime.lastError.message || 'Unknown error capturing tab'));
                            }
                            else if (!dataUrl) {
                                reject(new Error('captureVisibleTab returned empty data URL'));
                            }
                            else {
                                resolve(dataUrl);
                            }
                        });
                    });
                    // Resize the image in the active tab's content script
                    let resizedDataUrl = dataUrl;
                    try {
                        if (activeTab.id) {
                            // Inject and execute the resizing script in the active tab
                            const results = await chrome.scripting.executeScript({
                                target: { tabId: activeTab.id },
                                func: (imgSrc, maxWidth) => {
                                    return new Promise((resolve, reject) => {
                                        const img = new Image();
                                        img.onload = () => {
                                            const canvas = document.createElement('canvas');
                                            let width = img.width;
                                            let height = img.height;
                                            // Calculate new dimensions while maintaining aspect ratio
                                            if (width > maxWidth) {
                                                const ratio = maxWidth / width;
                                                width = maxWidth;
                                                height = Math.floor(height * ratio);
                                            }
                                            canvas.width = width;
                                            canvas.height = height;
                                            const ctx = canvas.getContext('2d');
                                            if (!ctx) {
                                                reject('Could not get canvas context');
                                                return;
                                            }
                                            // Draw and compress
                                            ctx.drawImage(img, 0, 0, width, height);
                                            // Return as JPEG with reduced quality
                                            const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
                                            resolve(resizedDataUrl);
                                        };
                                        img.onerror = () => reject('Error loading image for resizing');
                                        img.src = imgSrc;
                                    });
                                },
                                args: [dataUrl, 640] // Limit width to 640px max
                            });
                            if (results && results[0] && results[0].result) {
                                resizedDataUrl = results[0].result;
                                console.log(`📸 [ScreenshotTool] Successfully resized image: ${resizedDataUrl.length} bytes`);
                            }
                        }
                    }
                    catch (resizeError) {
                        console.warn(`📸 [ScreenshotTool] Error resizing image:`, resizeError);
                        // Continue with original image if resize fails
                    }
                    console.timeEnd('ScreenshotTool execution');
                    console.log(`✅ [ScreenshotTool] Screenshot captured (data URL length: ${resizedDataUrl.length})`);
                    // Log the full screenshot data URL for viewing in a new tab
                    console.log('🖼️ [ScreenshotTool] SCREENSHOT DATA URL FOR VIEWING:');
                    console.log(resizedDataUrl);
                    console.log('🖼️ [ScreenshotTool] END OF SCREENSHOT DATA URL');
                    // Return result with screenshot data
                    return {
                        success: true,
                        message: 'Screenshot captured successfully.',
                        screenshotDataUrl: resizedDataUrl
                    };
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`❌ [ScreenshotTool] Error capturing screenshot:`, error);
                    console.timeEnd('ScreenshotTool execution'); // Ensure timeEnd is called on error
                    return {
                        success: false,
                        error: `Error taking screenshot: ${errorMessage}`,
                    };
                }
            },
            // Fix experimental_toToolResultContent to match expected type signature
            experimental_toToolResultContent: (result) => {
                console.log('📸 [ScreenshotTool] Converting result to tool content');
                if (!result.success) {
                    // Return error as text
                    return [{ type: 'text', text: `Error taking screenshot: ${result.error || 'Unknown error'}` }];
                }
                // Extract the base64 content from the data URL
                let base64Data = result.screenshotDataUrl;
                // Remove the data URL prefix if it exists (e.g., "data:image/jpeg;base64,")
                if (base64Data.includes(';base64,')) {
                    base64Data = base64Data.split(';base64,')[1];
                    console.log('📸 [ScreenshotTool] Extracted base64 data from data URL');
                }
                // Return both text and image for successful screenshots
                return [
                    { type: 'text', text: 'Here is the screenshot of the current browser tab:' },
                    { type: 'image', data: base64Data, mimeType: 'image/jpeg' }
                ];
            },
        });
        // Log the final messages being sent to AI provider
        console.log(`[Chat Handler] Sending ${formattedMessages.length} messages to AI provider ${provider} (${effectiveModel})`);
        // Log detailed information about formatted messages
        console.log('📝 [Chat Handler] FORMATTED MESSAGES DETAILED LOG:');
        console.log(JSON.stringify(formattedMessages, (key, value) => {
            // For image data, truncate the string to avoid console flooding
            if (key === 'image' && typeof value === 'string' && value.length > 100) {
                return value.substring(0, 100) + '... [truncated]';
            }
            return value;
        }, 2));
        console.log('📝 [Chat Handler] END OF FORMATTED MESSAGES LOG');
        // Log details of messages with image parts for debugging
        formattedMessages.forEach((msg, idx) => {
            if (Array.isArray(msg.content)) {
                const partTypes = msg.content.map(p => p.type).join(', ');
                console.log(`[Chat Handler] Message ${idx} (${msg.role}) contains parts: ${partTypes}`);
                // Log image parts specifically
                const imageParts = msg.content.filter(p => p.type === 'image');
                if (imageParts.length > 0) {
                    console.log(`[Chat Handler] Message ${idx} contains ${imageParts.length} image parts`);
                    imageParts.forEach((p, i) => {
                        console.log(`[Chat Handler] Image ${i + 1} data type: ${typeof p.image}, length: ${typeof p.image === 'string' ? p.image.substring(0, 50) + '...' : 'non-string'}`);
                        // Log full image data for viewing in a new tab
                        if (typeof p.image === 'string') {
                            console.log(`🖼️ [Chat Handler] IMAGE ${i + 1} DATA URL FOR VIEWING:`);
                            console.log(p.image);
                            console.log(`🖼️ [Chat Handler] END OF IMAGE ${i + 1} DATA URL`);
                        }
                    });
                }
            }
            else {
                console.log(`[Chat Handler] Message ${idx} (${msg.role}): Simple string content`);
                console.log(`Content: ${typeof msg.content === 'string' ? msg.content.substring(0, 100) + '...' : 'non-string content'}`);
            }
        });
        console.log(`🚀 [Chat Handler] Starting AI stream with provider: ${provider}, model: ${effectiveModel}`);
        console.time('streamText execution');
        // Configure stream options based on provider
        let streamOptions = {
            model: llmProvider(effectiveModel),
            system: GEE_SYSTEM_PROMPT,
            messages: formattedMessages,
            tools: {
                weather: weatherTool,
                earthEngineDataset: earthEngineDatasetTool,
                earthEngineScript: earthEngineScriptTool,
                earthEngineRunCode: earthEngineRunCodeTool,
                screenshot: screenshotTool
            },
            maxSteps: 5, // Allow up to 5 steps
            temperature: 0.7,
        };
        // For Anthropic models, add special headers for browser usage
        if (provider === 'anthropic') {
            console.log(`🔧 [Chat Handler] Adding special headers for Anthropic browser usage`);
            streamOptions.headers = {
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            };
            // Enable experimental content for multi-modal tool responses (supported by Anthropic)
            streamOptions.experimental_enableToolContentInResult = true;
        }
        console.log(`📊 [Chat Handler] Final stream configuration:`, JSON.stringify(streamOptions, (k, v) => k === 'messages' ? '[Messages array]' : (k === 'tools' ? '[Tools object]' : v), 2));
        // Use streamText for AI generation with tools
        const result = await (0,ai__WEBPACK_IMPORTED_MODULE_3__.streamText)(streamOptions);
        console.timeEnd('streamText execution');
        console.log(`✅ [Chat Handler] Completed streamText call. Converting to text stream response.`);
        // Debug the result object to see what we got back
        console.log(`📊 [Chat Handler] Result type: ${typeof result}`);
        console.log(`📊 [Chat Handler] Result keys: ${Object.keys(result).join(', ')}`);
        // If there were tool calls, log them
        if (result.toolCalls && Array.isArray(result.toolCalls)) {
            console.log(`🛠️ [Chat Handler] Tool calls made: ${result.toolCalls.length}`);
            result.toolCalls.forEach((call, idx) => {
                console.log(`🛠️ [Chat Handler] Tool call ${idx + 1}: ${call.name || 'unnamed'}`);
                if (call.args) {
                    console.log(`🛠️ [Chat Handler] Tool call args: ${JSON.stringify(call.args)}`);
                }
                if (call.result) {
                    console.log(`🛠️ [Chat Handler] Tool call result status: ${call.result.success ? 'success' : 'failure'}`);
                }
            });
        }
        // Convert to text stream response
        return result.toTextStreamResponse();
    }
    catch (error) {
        console.error('Chat handler error:', error);
        return new Response(JSON.stringify({
            error: 'Chat processing failed',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}


/***/ }),

/***/ "./src/lib/tools/context7/getDocumentation.ts":
/*!****************************************************!*\
  !*** ./src/lib/tools/context7/getDocumentation.ts ***!
  \****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   getDocumentation: () => (/* binding */ getDocumentation)
/* harmony export */ });
/**
 * Fetches documentation for Google Earth Engine datasets from Context7
 * This tool uses a Context7-compatible library ID (obtained from resolveLibraryId)
 * to fetch documentation about Earth Engine datasets
 *
 * @param context7CompatibleLibraryID - The library ID from resolveLibraryId (e.g., "wybert/earthengine-dataset-catalog-md")
 * @param topic - Optional topic to filter documentation (e.g., "population", "landsat")
 * @param options - Additional options for the request (tokens, folders)
 * @returns The documentation content, success status, and any error messages
 */
// Define the base URL for Context7 API
const CONTEXT7_API_BASE_URL = "https://context7.com/api";
const DEFAULT_TYPE = "txt";
async function getDocumentation(context7CompatibleLibraryID, topic, options = {}) {
    try {
        // Check if we have a valid library ID
        if (!context7CompatibleLibraryID) {
            return {
                success: false,
                content: null,
                message: 'Missing Context7-compatible library ID. Use resolveLibraryId first.',
            };
        }
        // If running in a content script or sidepanel context, use the background script
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            return new Promise((resolve) => {
                // Add a timeout to handle cases where background script doesn't respond
                const timeoutId = setTimeout(() => {
                    console.warn('Background script connection timed out. Falling back to direct API call.');
                    // Fall back to direct API call if background script isn't responding
                    makeDirectApiCall(context7CompatibleLibraryID, topic, options).then(resolve);
                }, 2000); // 2 second timeout
                try {
                    chrome.runtime.sendMessage({
                        type: 'CONTEXT7_GET_DOCUMENTATION',
                        libraryId: context7CompatibleLibraryID,
                        topic,
                        options
                    }, (response) => {
                        // Clear the timeout since we got a response
                        clearTimeout(timeoutId);
                        if (chrome.runtime.lastError) {
                            console.warn('Chrome runtime error:', chrome.runtime.lastError);
                            console.info('Falling back to direct API call...');
                            // Fall back to direct API call if there's a communication error
                            makeDirectApiCall(context7CompatibleLibraryID, topic, options).then(resolve);
                            return;
                        }
                        // We got a valid response from the background
                        resolve(response);
                    });
                }
                catch (err) {
                    // Clear the timeout
                    clearTimeout(timeoutId);
                    console.error('Error sending message to background script:', err);
                    console.info('Falling back to direct API call...');
                    // Fall back to direct API call if there's an exception
                    makeDirectApiCall(context7CompatibleLibraryID, topic, options).then(resolve);
                }
            });
        }
        // Direct API call when running in background script or Node.js environment
        return makeDirectApiCall(context7CompatibleLibraryID, topic, options);
    }
    catch (error) {
        return {
            success: false,
            content: null,
            message: `Error fetching documentation: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
/**
 * Helper function to make a direct API call to Context7
 * Used as a fallback when background script communication fails
 */
async function makeDirectApiCall(context7CompatibleLibraryID, topic, options = {}) {
    try {
        // Remove leading slash if present
        if (context7CompatibleLibraryID.startsWith("/")) {
            context7CompatibleLibraryID = context7CompatibleLibraryID.slice(1);
        }
        // Build the URL using URL object
        const url = new URL(`${CONTEXT7_API_BASE_URL}/v1/${context7CompatibleLibraryID}`);
        // Add options to URL params
        if (options.tokens)
            url.searchParams.set("tokens", options.tokens.toString());
        if (options.folders)
            url.searchParams.set("folders", options.folders);
        if (topic)
            url.searchParams.set("topic", topic);
        url.searchParams.set("type", DEFAULT_TYPE);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json, text/plain',
                'X-Context7-Source': 'earth-agent-ai-sdk',
            },
        });
        if (!response.ok) {
            return {
                success: false,
                content: null,
                message: `Failed to fetch documentation: ${response.statusText}`,
            };
        }
        // Get the text content directly
        const text = await response.text();
        // Check if the text is valid
        if (!text || text === "No content available" || text === "No context data available") {
            return {
                success: false,
                content: null,
                message: 'No documentation content found',
            };
        }
        // Try to parse as JSON in case of JSON response
        try {
            const data = JSON.parse(text);
            if (data && data.content) {
                return {
                    success: true,
                    content: data.content,
                };
            }
        }
        catch (e) {
            // Not JSON, use text as is
        }
        // Return the text content directly
        return {
            success: true,
            content: text,
        };
    }
    catch (error) {
        return {
            success: false,
            content: null,
            message: `Error making direct API call: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (getDocumentation);


/***/ }),

/***/ "./src/lib/tools/context7/index.ts":
/*!*****************************************!*\
  !*** ./src/lib/tools/context7/index.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getDocumentation: () => (/* reexport safe */ _getDocumentation__WEBPACK_IMPORTED_MODULE_1__["default"]),
/* harmony export */   resolveLibraryId: () => (/* reexport safe */ _resolveLibraryId__WEBPACK_IMPORTED_MODULE_0__["default"])
/* harmony export */ });
/* harmony import */ var _resolveLibraryId__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./resolveLibraryId */ "./src/lib/tools/context7/resolveLibraryId.ts");
/* harmony import */ var _getDocumentation__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./getDocumentation */ "./src/lib/tools/context7/getDocumentation.ts");
/**
 * Context7 tools for fetching Google Earth Engine dataset documentation
 *
 * This module provides tools to:
 * 1. Resolve library names to Context7-compatible IDs
 * 2. Fetch detailed documentation about Earth Engine datasets
 *
 * Usage example:
 * ```typescript
 * import { resolveLibraryId, getDocumentation } from './lib/tools/context7';
 *
 * async function fetchLandsatDocs() {
 *   // First, resolve the library ID
 *   const resolveResult = await resolveLibraryId('Earth Engine datasets');
 *
 *   if (resolveResult.success && resolveResult.libraryId) {
 *     // Then fetch documentation about Landsat
 *     const docs = await getDocumentation(resolveResult.libraryId, 'Landsat');
 *
 *     if (docs.success && docs.content) {
 *       console.log(docs.content);
 *     }
 *   }
 * }
 * ```
 */




/***/ }),

/***/ "./src/lib/tools/context7/resolveLibraryId.ts":
/*!****************************************************!*\
  !*** ./src/lib/tools/context7/resolveLibraryId.ts ***!
  \****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   resolveLibraryId: () => (/* binding */ resolveLibraryId)
/* harmony export */ });
/**
 * Resolves a general library name into a Context7-compatible library ID
 * This tool is required as a first step before using getDocumentation
 * to retrieve Earth Engine dataset documentation
 *
 * @param libraryName - The library name to search for (e.g., "Earth Engine", "MODIS")
 * @returns The Context7-compatible library ID that can be used with getDocumentation
 */
// Define the base URL for Context7 API
const CONTEXT7_API_BASE_URL = "https://context7.com/api";
async function resolveLibraryId(libraryName) {
    try {
        // If running in a content script or sidepanel context, use the background script
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            // Check if background script is available
            // Add a timeout to prevent hanging if background isn't responsive
            return new Promise((resolve) => {
                // Add a timeout to handle cases where the background script doesn't respond
                const timeoutId = setTimeout(() => {
                    console.warn('Background script connection timed out. Falling back to direct API call.');
                    // Fall back to direct API call if background script isn't responding
                    makeDirectApiCall(libraryName).then(resolve);
                }, 2000); // 2 second timeout
                try {
                    chrome.runtime.sendMessage({
                        type: 'CONTEXT7_RESOLVE_LIBRARY_ID',
                        libraryName
                    }, (response) => {
                        // Clear the timeout since we got a response
                        clearTimeout(timeoutId);
                        // Handle error if present
                        if (chrome.runtime.lastError) {
                            console.warn('Chrome runtime error:', chrome.runtime.lastError);
                            console.info('Falling back to direct API call...');
                            // Fall back to direct API call if there's a communication error
                            makeDirectApiCall(libraryName).then(resolve);
                            return;
                        }
                        // We got a valid response from the background
                        resolve(response);
                    });
                }
                catch (err) {
                    // Clear the timeout
                    clearTimeout(timeoutId);
                    console.error('Error sending message to background script:', err);
                    console.info('Falling back to direct API call...');
                    // Fall back to direct API call if there's an exception
                    makeDirectApiCall(libraryName).then(resolve);
                }
            });
        }
        // Direct API call when running in background script or Node.js environment
        return makeDirectApiCall(libraryName);
    }
    catch (error) {
        return {
            success: false,
            libraryId: null,
            message: `Error resolving library ID: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
/**
 * Helper function to make a direct API call to Context7
 * Used as a fallback when background script communication fails
 */
async function makeDirectApiCall(libraryName) {
    try {
        // Create URL object using the base URL
        const url = new URL(`${CONTEXT7_API_BASE_URL}/v1/search`);
        // Set search params using proper URL API
        url.searchParams.set("query", libraryName);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Context7-Source': 'earth-agent-ai-sdk',
            },
        });
        if (!response.ok) {
            return {
                success: false,
                libraryId: null,
                message: `Failed to search for library ID: ${response.statusText}`,
            };
        }
        const data = await response.json();
        // Check if we got valid results
        if (data && Array.isArray(data.results) && data.results.length > 0) {
            // Find the best match for Earth Engine datasets
            const earthEngineMatch = data.results.find((result) => result.id &&
                (result.id.includes('earthengine') ||
                    result.id.includes('earth-engine') ||
                    result.title?.toLowerCase().includes('earth engine')));
            if (earthEngineMatch) {
                return {
                    success: true,
                    libraryId: earthEngineMatch.id,
                };
            }
            // If no Earth Engine specific match, return the first result
            return {
                success: true,
                libraryId: data.results[0].id,
                alternatives: data.results.slice(1, 5).map((result) => result.id),
            };
        }
        return {
            success: false,
            libraryId: null,
            message: 'No matching library found',
            alternatives: data?.results?.map((result) => result.id) || [],
        };
    }
    catch (error) {
        return {
            success: false,
            libraryId: null,
            message: `Error making direct API call: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (resolveLibraryId);


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!*********************************!*\
  !*** ./src/background/index.ts ***!
  \*********************************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   sendMessageToEarthEngineTab: () => (/* binding */ sendMessageToEarthEngineTab)
/* harmony export */ });
/* harmony import */ var _chat_handler__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./chat-handler */ "./src/background/chat-handler.ts");
/* harmony import */ var _lib_tools_context7__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/tools/context7 */ "./src/lib/tools/context7/index.ts");


// Store active port connections
let port = null;
// Store connections from side panel ports with type safety
const sidePanelPorts = new Map();
// Store information about loaded content scripts
const contentScriptTabs = new Map();
// Timing constants
const CONTENT_SCRIPT_PING_TIMEOUT = 5000; // 5 seconds
const TAB_ACTION_RETRY_DELAY = 1000; // 1 second
const MAX_TAB_ACTION_RETRIES = 3;
// API configuration storage keys
const OPENAI_API_KEY_STORAGE_KEY = 'earth_engine_openai_api_key';
const ANTHROPIC_API_KEY_STORAGE_KEY = 'earth_engine_anthropic_api_key';
const API_KEY_STORAGE_KEY = 'earth_engine_llm_api_key'; // Keep for backward compatibility
const API_PROVIDER_STORAGE_KEY = 'earth_engine_llm_provider';
const MODEL_STORAGE_KEY = 'earth_engine_llm_model';
// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
    // Only open side panel if we're on the Earth Engine Code Editor
    if (tab.url?.startsWith('https://code.earthengine.google.com/')) {
        // Open the side panel
        await chrome.sidePanel.open({ windowId: tab.windowId });
        await chrome.sidePanel.setOptions({
            enabled: true,
            path: 'sidepanel.html'
        });
    }
    else {
        // If not on Earth Engine, create a new tab with Earth Engine
        await chrome.tabs.create({
            url: 'https://code.earthengine.google.com/'
        });
    }
});
// Validate server identity with better error handling
async function validateServerIdentity(host, port) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        const response = await fetch(`http://${host}:${port}/.identity`, {
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            console.error(`Invalid server response: ${response.status}`);
            return false;
        }
        const identity = await response.json();
        // Validate the server signature
        if (identity && identity.signature === "mcp-browser-connector-24x7") {
            return true;
        }
        else {
            console.error("Invalid server signature - not the browser tools server");
            return false;
        }
    }
    catch (error) {
        // Handle network errors more gracefully
        console.error("Error validating server identity:", error);
        // Don't throw an error, just return false if we can't connect
        return false;
    }
}
// Forward message to Earth Engine tab with improved error handling and retries
async function sendMessageToEarthEngineTab(message, options) {
    const timeout = options?.timeout || CONTENT_SCRIPT_PING_TIMEOUT;
    const maxRetries = options?.retries || MAX_TAB_ACTION_RETRIES;
    let retryCount = 0;
    console.log('Forwarding message to Earth Engine tab:', message);
    async function attemptSend() {
        // Find Earth Engine tab
        const tabs = await chrome.tabs.query({ url: "*://code.earthengine.google.com/*" });
        if (!tabs || tabs.length === 0) {
            console.error('No Earth Engine tab found');
            return {
                success: false,
                error: 'No Earth Engine tab found. Please open Google Earth Engine at https://code.earthengine.google.com/ in a tab and try again.'
            };
        }
        const tabId = tabs[0].id;
        if (!tabId) {
            console.error('Invalid Earth Engine tab');
            return {
                success: false,
                error: 'Invalid Earth Engine tab'
            };
        }
        // Check if we know the content script is loaded
        if (!contentScriptTabs.has(tabId)) {
            console.log(`Content script not registered for tab ${tabId}, checking with PING...`);
            // Try to ping the content script first
            try {
                await pingContentScript(tabId, timeout);
                console.log(`Content script responded to PING in tab ${tabId}`);
                contentScriptTabs.set(tabId, true);
            }
            catch (error) {
                console.error(`Content script did not respond to PING in tab ${tabId}:`, error);
                // If we've already retried too many times, give up
                if (retryCount >= maxRetries) {
                    return {
                        success: false,
                        error: `Content script did not respond after ${maxRetries} attempts. Please ensure you have the Google Earth Engine tab open and fully loaded at https://code.earthengine.google.com/`
                    };
                }
                // Try to reload the content script by refreshing the tab
                try {
                    console.log(`Attempting to reload content script in tab ${tabId}...`);
                    await chrome.tabs.reload(tabId);
                    // Wait for the page to reload and content script to initialize
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    // Increment retry count and try again
                    retryCount++;
                    console.log(`Retrying after tab reload (attempt ${retryCount}/${maxRetries})...`);
                    return attemptSend();
                }
                catch (reloadError) {
                    return {
                        success: false,
                        error: 'Content script not loaded and tab refresh failed. Please ensure the Earth Engine tab is open and refresh it manually.'
                    };
                }
            }
        }
        // Send message to the content script in the Earth Engine tab
        try {
            console.log(`Sending message to tab ${tabId}`);
            // Use a timeout promise to handle cases where chrome.tabs.sendMessage doesn't reject
            const messagePromise = new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    // Remove tab from tracking if timeout occurs
                    contentScriptTabs.delete(tabId);
                    reject(new Error(`Message to tab ${tabId} timed out after ${timeout}ms`));
                }, timeout);
                chrome.tabs.sendMessage(tabId, message, (response) => {
                    clearTimeout(timeoutId);
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    resolve(response);
                });
            });
            const response = await messagePromise;
            console.log('Received response from Earth Engine tab:', response);
            return response;
        }
        catch (error) {
            console.error('Error communicating with Earth Engine tab:', error);
            // If communication fails, remove tab from tracked tabs so we'll try to ping again next time
            contentScriptTabs.delete(tabId);
            // If we have retries left, try again
            if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Communication failed, retrying (attempt ${retryCount}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, TAB_ACTION_RETRY_DELAY));
                return attemptSend();
            }
            return {
                success: false,
                error: `Error communicating with Earth Engine tab: ${error instanceof Error ? error.message : String(error)}.
        Please make sure the Earth Engine tab is open and active at https://code.earthengine.google.com/`
            };
        }
    }
    return attemptSend();
}
// Helper function to ping content script with timeout
function pingContentScript(tabId, timeout = CONTENT_SCRIPT_PING_TIMEOUT) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error('Content script ping timed out'));
        }, timeout);
        chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
            clearTimeout(timeoutId);
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }
            if (response && response.success) {
                resolve(true);
            }
            else {
                reject(new Error('Invalid ping response'));
            }
        });
    });
}
// Handle messages from content script or side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background script received message:', message);
    switch (message.type) {
        case 'INIT':
            // Handle initialization
            sendResponse({ status: 'initialized' });
            return false; // Synchronous response
        case 'CONTENT_SCRIPT_LOADED':
            // Mark content script as loaded for the specific tab
            if (sender.tab && sender.tab.id) {
                console.log(`Content script loaded and registered for tab ${sender.tab.id}`);
                contentScriptTabs.set(sender.tab.id, true);
                sendResponse({ success: true, message: 'Content script registered' });
            }
            else {
                console.warn('Received CONTENT_SCRIPT_LOADED without tab info');
                sendResponse({ success: false, error: 'Missing tab information' });
            }
            return false; // Synchronous response
        case 'CONTENT_SCRIPT_HEARTBEAT':
            // Acknowledge heartbeat from content script
            console.log('Received heartbeat from content script', sender.tab?.id);
            sendResponse({ success: true, message: 'Heartbeat acknowledged' });
            return false; // Synchronous response
        case 'VALIDATE_SERVER':
            if (message.payload && message.payload.host && message.payload.port) {
                validateServerIdentity(message.payload.host, message.payload.port)
                    .then(isValid => {
                    sendResponse({ isValid });
                })
                    .catch(error => {
                    sendResponse({ isValid: false, error: error.message });
                });
                return true; // Will respond asynchronously
            }
            sendResponse({ isValid: false, error: 'Invalid payload for VALIDATE_SERVER' });
            return false; // Synchronous response
        case 'API_REQUEST':
            // Handle API requests directly (e.g., proxied chat requests if needed)
            if (message.payload && message.payload.endpoint === '/api/chat') {
                (async () => {
                    try {
                        // Get API key/provider from storage
                        const config = await chrome.storage.local.get([
                            API_KEY_STORAGE_KEY,
                            API_PROVIDER_STORAGE_KEY,
                            MODEL_STORAGE_KEY
                        ]);
                        const apiKey = config[API_KEY_STORAGE_KEY];
                        const provider = config[API_PROVIDER_STORAGE_KEY] || 'openai';
                        const model = config[MODEL_STORAGE_KEY];
                        if (!apiKey) {
                            throw new Error('API key not found in storage');
                        }
                        const body = message.payload.body || {};
                        const response = await (0,_chat_handler__WEBPACK_IMPORTED_MODULE_0__.handleChatRequest)(body.messages, apiKey, provider, model);
                        // Stream the response back? Requires careful handling
                        // For simplicity, let's assume non-streaming for direct API calls for now
                        const responseData = await response.json(); // Or handle stream appropriately
                        sendResponse({ success: true, data: responseData });
                    }
                    catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        console.error('Error handling proxied API request:', error);
                        sendResponse({ success: false, error: `API request failed: ${errorMessage}` });
                    }
                })();
                return true; // Will respond asynchronously
            }
            sendResponse({ success: false, error: 'Invalid API_REQUEST payload' });
            return false; // Synchronous response
        // --- Handlers for Direct Earth Engine Tool Calls --- 
        case 'EDIT_SCRIPT':
            // Forward to Earth Engine tab
            (async () => {
                try {
                    const response = await sendMessageToEarthEngineTab(message);
                    sendResponse(response);
                }
                catch (error) {
                    sendResponse({
                        success: false,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            })();
            return true; // Will respond asynchronously
        case 'CHAT_MESSAGE':
            // Handle chat messages from the sidepanel
            (async () => {
                try {
                    console.log('Processing chat message');
                    // Get API key/provider from storage
                    const config = await chrome.storage.local.get([
                        API_KEY_STORAGE_KEY,
                        OPENAI_API_KEY_STORAGE_KEY,
                        ANTHROPIC_API_KEY_STORAGE_KEY,
                        API_PROVIDER_STORAGE_KEY,
                        MODEL_STORAGE_KEY
                    ]);
                    // Determine provider and API key to use
                    const provider = config[API_PROVIDER_STORAGE_KEY] || 'openai';
                    let apiKey = '';
                    if (provider === 'openai') {
                        apiKey = config[OPENAI_API_KEY_STORAGE_KEY] || config[API_KEY_STORAGE_KEY] || '';
                    }
                    else if (provider === 'anthropic') {
                        apiKey = config[ANTHROPIC_API_KEY_STORAGE_KEY] || config[API_KEY_STORAGE_KEY] || '';
                    }
                    const model = config[MODEL_STORAGE_KEY];
                    if (!apiKey) {
                        sendResponse({
                            type: 'ERROR',
                            error: 'API key not configured. Please set your API key in the extension settings.'
                        });
                        return;
                    }
                    // Create a unique request ID for tracking
                    const requestId = Date.now().toString();
                    // Process the chat messages
                    const chatMessages = message.messages || [];
                    // Handle image attachments if present
                    if (message.attachments && message.attachments.length > 0) {
                        // Find the last user message and ensure it has parts
                        const lastUserMessageIndex = chatMessages.length - 1;
                        if (lastUserMessageIndex >= 0 && chatMessages[lastUserMessageIndex].role === 'user') {
                            // Convert the message to use parts if it doesn't have them already
                            if (!chatMessages[lastUserMessageIndex].parts) {
                                chatMessages[lastUserMessageIndex].parts = [
                                    { type: 'text', text: chatMessages[lastUserMessageIndex].content || '' }
                                ];
                            }
                            // Add image parts
                            message.attachments.forEach((attachment) => {
                                if (attachment.type === 'image' && chatMessages[lastUserMessageIndex].parts) {
                                    chatMessages[lastUserMessageIndex].parts.push(attachment);
                                }
                            });
                        }
                    }
                    try {
                        // Handle the chat request through the appropriate handler
                        const response = await (0,_chat_handler__WEBPACK_IMPORTED_MODULE_0__.handleChatRequest)(chatMessages, apiKey, provider, model);
                        // Get response body as a readable stream
                        const reader = response.body?.getReader();
                        if (!reader) {
                            throw new Error('No readable stream available from response');
                        }
                        // Stream the response back to the sender
                        let accumulatedResponse = '';
                        // Use a loop to read all chunks from the stream
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done)
                                break;
                            // Convert the chunk to text
                            const chunkText = new TextDecoder().decode(value);
                            accumulatedResponse += chunkText;
                            // Forward the chunk to the sender - using proper API
                            if (sender.tab && sender.tab.id) {
                                chrome.tabs.sendMessage(sender.tab.id, {
                                    type: 'CHAT_STREAM_CHUNK',
                                    requestId,
                                    chunk: chunkText
                                });
                            }
                            else if (port) {
                                // If this is from a port connection like sidebar
                                port.postMessage({
                                    type: 'CHAT_STREAM_CHUNK',
                                    requestId,
                                    chunk: chunkText
                                });
                            }
                        }
                        // Send the end of stream notification
                        if (sender.tab && sender.tab.id) {
                            chrome.tabs.sendMessage(sender.tab.id, {
                                type: 'CHAT_STREAM_END',
                                requestId,
                                fullText: accumulatedResponse
                            });
                        }
                        else if (port) {
                            // If this is from a port connection like sidebar
                            port.postMessage({
                                type: 'CHAT_STREAM_END',
                                requestId,
                                fullText: accumulatedResponse
                            });
                        }
                    }
                    catch (error) {
                        console.error('Error processing chat request:', error);
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        // Send error response using proper API
                        if (sender.tab && sender.tab.id) {
                            chrome.tabs.sendMessage(sender.tab.id, {
                                type: 'ERROR',
                                requestId,
                                error: `Chat request failed: ${errorMessage}`
                            });
                        }
                        else if (port) {
                            // If this is from a port connection like sidebar
                            port.postMessage({
                                type: 'ERROR',
                                requestId,
                                error: `Chat request failed: ${errorMessage}`
                            });
                        }
                    }
                }
                catch (error) {
                    console.error('Error handling chat message:', error);
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    // Send error response
                    sendResponse({
                        type: 'ERROR',
                        error: `Error handling chat message: ${errorMessage}`
                    });
                }
            })();
            return true; // Will respond asynchronously
        // Handle Context7 API requests
        case 'CONTEXT7_RESOLVE_LIBRARY_ID':
            (async () => {
                try {
                    console.log('Resolving library ID for:', message.libraryName);
                    const result = await (0,_lib_tools_context7__WEBPACK_IMPORTED_MODULE_1__.resolveLibraryId)(message.libraryName);
                    console.log('Resolve result:', result);
                    sendResponse(result);
                }
                catch (error) {
                    console.error('Error resolving library ID:', error);
                    sendResponse({
                        success: false,
                        libraryId: null,
                        message: `Error resolving library ID: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            })();
            return true; // Will respond asynchronously
        case 'CONTEXT7_GET_DOCUMENTATION':
            (async () => {
                try {
                    console.log('Getting documentation for:', message.libraryId, message.topic);
                    const result = await (0,_lib_tools_context7__WEBPACK_IMPORTED_MODULE_1__.getDocumentation)(message.libraryId, message.topic);
                    console.log('Documentation result:', result.success, result.content?.substring(0, 50));
                    sendResponse(result);
                }
                catch (error) {
                    console.error('Error getting documentation:', error);
                    sendResponse({
                        success: false,
                        content: null,
                        message: `Error getting documentation: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            })();
            return true; // Will respond asynchronously
        case 'CONTEXT7_DATASET_INFO':
            (async () => {
                try {
                    console.log('Getting dataset info for:', message.topic);
                    // First, search for the dataset
                    const searchResult = await (0,_lib_tools_context7__WEBPACK_IMPORTED_MODULE_1__.resolveLibraryId)(`Earth Engine ${message.topic}`);
                    if (!searchResult.success || !searchResult.libraryId) {
                        sendResponse({
                            success: false,
                            message: `Could not find documentation for "${message.topic}". ${searchResult.message || ''}`,
                            alternatives: searchResult.alternatives,
                        });
                        return;
                    }
                    // Then get documentation
                    const docResult = await (0,_lib_tools_context7__WEBPACK_IMPORTED_MODULE_1__.getDocumentation)(searchResult.libraryId, message.topic);
                    if (!docResult.success || !docResult.content) {
                        sendResponse({
                            success: false,
                            message: `Could not find documentation for topic "${message.topic}". ${docResult.message || ''}`,
                        });
                        return;
                    }
                    sendResponse({
                        success: true,
                        content: docResult.content,
                        message: `Documentation found for topic: ${message.topic}`,
                    });
                }
                catch (error) {
                    console.error('Error getting dataset info:', error);
                    sendResponse({
                        success: false,
                        message: `Error retrieving Earth Engine documentation: ${error instanceof Error ? error.message : String(error)}`,
                    });
                }
            })();
            return true; // Will respond asynchronously
        // Browser Automation Tools
        case 'SCREENSHOT':
            (async () => {
                try {
                    console.log('Taking screenshot of active tab');
                    // Get the active tab
                    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (!tabs || tabs.length === 0) {
                        sendResponse({
                            success: false,
                            error: 'No active tab found'
                        });
                        return;
                    }
                    // Take the screenshot
                    try {
                        const dataUrl = await chrome.tabs.captureVisibleTab(tabs[0].windowId, {
                            format: 'png',
                            quality: 100
                        });
                        console.log('Screenshot captured successfully');
                        sendResponse({
                            success: true,
                            screenshotData: dataUrl,
                            message: 'Screenshot captured successfully'
                        });
                    }
                    catch (captureError) {
                        console.error('Error capturing screenshot:', captureError);
                        sendResponse({
                            success: false,
                            error: `Error capturing screenshot: ${captureError instanceof Error ? captureError.message : String(captureError)}`
                        });
                    }
                }
                catch (error) {
                    console.error('Error processing screenshot request:', error);
                    sendResponse({
                        success: false,
                        error: `Error processing screenshot request: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            })();
            return true; // Will respond asynchronously
        case 'SNAPSHOT':
            (async () => {
                try {
                    console.log('Taking accessibility snapshot of active tab');
                    // Get the active tab
                    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (!tabs || tabs.length === 0 || !tabs[0].id) {
                        sendResponse({
                            success: false,
                            error: 'No active tab found'
                        });
                        return;
                    }
                    const tabId = tabs[0].id;
                    // Execute the snapshot script in the tab using the same logic as our snapshot tool
                    const results = await chrome.scripting.executeScript({
                        target: { tabId },
                        func: () => {
                            const refCounter = { value: 1 };
                            const processedElements = new WeakSet();
                            function shouldIncludeElement(element) {
                                const tagName = element.tagName.toLowerCase();
                                // Always include interactive elements
                                const interactiveElements = [
                                    'a', 'button', 'input', 'textarea', 'select', 'option',
                                    'details', 'summary', 'label', 'fieldset', 'legend'
                                ];
                                if (interactiveElements.includes(tagName)) {
                                    return true;
                                }
                                // Include elements with explicit roles
                                if (element.hasAttribute('role')) {
                                    return true;
                                }
                                // Include elements with click handlers
                                if (element.hasAttribute('onclick') || element.hasAttribute('ng-click')) {
                                    return true;
                                }
                                // Include headings
                                if (/^h[1-6]$/.test(tagName)) {
                                    return true;
                                }
                                // Include structural elements with meaningful content
                                const structuralElements = ['main', 'nav', 'aside', 'section', 'article', 'header', 'footer'];
                                if (structuralElements.includes(tagName)) {
                                    return true;
                                }
                                // Include generic containers that might be clickable
                                if (['div', 'span'].includes(tagName)) {
                                    const style = window.getComputedStyle(element);
                                    if (style.cursor === 'pointer' || element.hasAttribute('tabindex')) {
                                        return true;
                                    }
                                }
                                // Include images with alt text
                                if (tagName === 'img' && element.hasAttribute('alt')) {
                                    return true;
                                }
                                return false;
                            }
                            function getElementRole(element) {
                                // Check explicit role
                                const explicitRole = element.getAttribute('role');
                                if (explicitRole) {
                                    return explicitRole;
                                }
                                // Determine implicit role based on tag
                                const tagName = element.tagName.toLowerCase();
                                const roleMap = {
                                    'a': 'link',
                                    'button': 'button',
                                    'input': getInputRole(element),
                                    'textarea': 'textbox',
                                    'select': 'combobox',
                                    'option': 'option',
                                    'img': 'img',
                                    'h1': 'heading',
                                    'h2': 'heading',
                                    'h3': 'heading',
                                    'h4': 'heading',
                                    'h5': 'heading',
                                    'h6': 'heading',
                                    'main': 'main',
                                    'nav': 'navigation',
                                    'aside': 'complementary',
                                    'section': 'region',
                                    'article': 'article',
                                    'header': 'banner',
                                    'footer': 'contentinfo',
                                    'fieldset': 'group',
                                    'legend': 'legend',
                                    'label': 'label'
                                };
                                return roleMap[tagName] || 'generic';
                            }
                            function getInputRole(input) {
                                const type = (input.type || 'text').toLowerCase();
                                const inputRoleMap = {
                                    'text': 'textbox',
                                    'email': 'textbox',
                                    'password': 'textbox',
                                    'search': 'searchbox',
                                    'tel': 'textbox',
                                    'url': 'textbox',
                                    'number': 'spinbutton',
                                    'range': 'slider',
                                    'checkbox': 'checkbox',
                                    'radio': 'radio',
                                    'button': 'button',
                                    'submit': 'button',
                                    'reset': 'button',
                                    'file': 'button'
                                };
                                return inputRoleMap[type] || 'textbox';
                            }
                            function getAccessibleName(element) {
                                // Check aria-label
                                const ariaLabel = element.getAttribute('aria-label');
                                if (ariaLabel) {
                                    return ariaLabel.trim();
                                }
                                // Check aria-labelledby
                                const labelledBy = element.getAttribute('aria-labelledby');
                                if (labelledBy) {
                                    const referencedElement = document.getElementById(labelledBy);
                                    if (referencedElement) {
                                        return getTextContent(referencedElement).trim();
                                    }
                                }
                                // For form controls, check associated label
                                if (element instanceof HTMLInputElement ||
                                    element instanceof HTMLTextAreaElement ||
                                    element instanceof HTMLSelectElement) {
                                    // Check for label element
                                    const labels = document.querySelectorAll(`label[for="${element.id}"]`);
                                    if (labels.length > 0) {
                                        return getTextContent(labels[0]).trim();
                                    }
                                    // Check for wrapping label
                                    const wrappingLabel = element.closest('label');
                                    if (wrappingLabel) {
                                        return getTextContent(wrappingLabel).trim();
                                    }
                                    // Check placeholder
                                    const placeholder = element.getAttribute('placeholder');
                                    if (placeholder) {
                                        return placeholder.trim();
                                    }
                                }
                                // Check title attribute
                                const title = element.getAttribute('title');
                                if (title) {
                                    return title.trim();
                                }
                                // For images, check alt attribute
                                if (element instanceof HTMLImageElement) {
                                    const alt = element.getAttribute('alt');
                                    if (alt) {
                                        return alt.trim();
                                    }
                                }
                                // Get text content for other elements
                                const textContent = getTextContent(element).trim();
                                if (textContent && textContent.length < 100) { // Reasonable length limit
                                    return textContent;
                                }
                                return '';
                            }
                            function getTextContent(element) {
                                const clone = element.cloneNode(true);
                                // Remove child interactive elements to avoid nested labels
                                const interactiveSelectors = [
                                    'button', 'a', 'input', 'textarea', 'select',
                                    '[role="button"]', '[role="link"]', '[role="textbox"]'
                                ];
                                for (const selector of interactiveSelectors) {
                                    const interactiveElements = clone.querySelectorAll(selector);
                                    interactiveElements.forEach(el => el.remove());
                                }
                                return clone.textContent || '';
                            }
                            function createAccessibilityNode(element) {
                                const computedStyle = window.getComputedStyle(element);
                                // Skip hidden elements
                                if (computedStyle.display === 'none' ||
                                    computedStyle.visibility === 'hidden' ||
                                    computedStyle.opacity === '0') {
                                    return null;
                                }
                                // Skip very small elements (likely not interactive)
                                const rect = element.getBoundingClientRect();
                                if (rect.width < 1 || rect.height < 1) {
                                    return null;
                                }
                                // Determine if this element should be included
                                if (!shouldIncludeElement(element)) {
                                    return null;
                                }
                                // Get role (explicit or implicit)
                                const role = getElementRole(element);
                                // Get accessible name
                                const name = getAccessibleName(element);
                                // Create ref and assign to element (matching playwright-mcp format)
                                const ref = `e${refCounter.value++}`;
                                element.setAttribute('aria-ref', ref);
                                // Get cursor style
                                const cursor = computedStyle.cursor;
                                const node = {
                                    role
                                };
                                if (name) {
                                    node.name = name;
                                }
                                node.ref = ref;
                                if (cursor && cursor !== 'auto' && cursor !== 'default') {
                                    node.cursor = cursor;
                                }
                                return node;
                            }
                            function shouldProcessChildren(element) {
                                const tagName = element.tagName.toLowerCase();
                                // Don't process children of leaf elements
                                const leafElements = ['input', 'textarea', 'img', 'br', 'hr'];
                                if (leafElements.includes(tagName)) {
                                    return false;
                                }
                                // Process children of structural elements
                                return true;
                            }
                            function buildAccessibilityTree(element, maxDepth = 10, currentDepth = 0) {
                                if (currentDepth > maxDepth || processedElements.has(element)) {
                                    return [];
                                }
                                processedElements.add(element);
                                const nodes = [];
                                // Process current element if it's meaningful
                                const node = createAccessibilityNode(element);
                                if (node) {
                                    nodes.push(node);
                                    // Process children for interactive/structural elements
                                    if (shouldProcessChildren(element)) {
                                        const children = [];
                                        // Process regular DOM children
                                        for (const child of Array.from(element.children)) {
                                            const childNodes = buildAccessibilityTree(child, maxDepth, currentDepth + 1);
                                            children.push(...childNodes);
                                        }
                                        // Process shadow DOM children if element has open shadow root
                                        if (element.shadowRoot && element.shadowRoot.mode === 'open') {
                                            for (const shadowChild of Array.from(element.shadowRoot.children)) {
                                                const shadowNodes = buildAccessibilityTree(shadowChild, maxDepth, currentDepth + 1);
                                                children.push(...shadowNodes);
                                            }
                                        }
                                        if (children.length > 0) {
                                            node.children = children;
                                        }
                                    }
                                }
                                else {
                                    // If current element isn't meaningful, process its children directly
                                    for (const child of Array.from(element.children)) {
                                        const childNodes = buildAccessibilityTree(child, maxDepth, currentDepth);
                                        nodes.push(...childNodes);
                                    }
                                    // Also process shadow DOM children if element has open shadow root
                                    if (element.shadowRoot && element.shadowRoot.mode === 'open') {
                                        for (const shadowChild of Array.from(element.shadowRoot.children)) {
                                            const shadowNodes = buildAccessibilityTree(shadowChild, maxDepth, currentDepth);
                                            nodes.push(...shadowNodes);
                                        }
                                    }
                                }
                                return nodes;
                            }
                            function formatAsYaml(nodes, indent = '') {
                                const lines = [];
                                for (const node of nodes) {
                                    let line = `${indent}- ${node.role}`;
                                    if (node.name) {
                                        line += ` "${node.name}"`;
                                    }
                                    if (node.ref) {
                                        line += ` [ref=${node.ref}]`;
                                    }
                                    if (node.cursor) {
                                        line += ` [cursor=${node.cursor}]`;
                                    }
                                    lines.push(line + ':');
                                    if (node.children && node.children.length > 0) {
                                        const childYaml = formatAsYaml(node.children, indent + '  ');
                                        lines.push(childYaml);
                                    }
                                }
                                return lines.join('\n');
                            }
                            try {
                                // Get page information
                                const pageUrl = window.location.href;
                                const pageTitle = document.title;
                                // Generate the accessibility tree
                                const rootElement = document.body || document.documentElement;
                                if (!rootElement) {
                                    throw new Error('No root element found');
                                }
                                const accessibilityTree = buildAccessibilityTree(rootElement);
                                // Format as YAML similar to playwright-mcp
                                const yamlContent = formatAsYaml(accessibilityTree);
                                // Create the complete markdown response matching playwright-mcp format exactly
                                const snapshot = [
                                    '- Ran Playwright code:',
                                    '```js',
                                    '// <internal code to capture accessibility snapshot>',
                                    '```',
                                    '',
                                    `- Page URL: ${pageUrl}`,
                                    `- Page Title: ${pageTitle}`,
                                    '- Page Snapshot',
                                    '```yaml',
                                    yamlContent,
                                    '```'
                                ].join('\n');
                                return {
                                    success: true,
                                    snapshot
                                };
                            }
                            catch (error) {
                                return {
                                    success: false,
                                    error: error instanceof Error ? error.message : 'Failed to capture snapshot'
                                };
                            }
                        }
                    });
                    if (!results || results.length === 0) {
                        sendResponse({
                            success: false,
                            error: 'Failed to execute snapshot script'
                        });
                        return;
                    }
                    const result = results[0].result;
                    console.log('Accessibility snapshot captured successfully');
                    sendResponse(result);
                }
                catch (error) {
                    console.error('Error taking accessibility snapshot:', error);
                    sendResponse({
                        success: false,
                        error: `Error taking accessibility snapshot: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            })();
            return true; // Will respond asynchronously
        case 'CLICK':
            (async () => {
                try {
                    console.log('Click request for selector:', message.payload?.selector);
                    // Get the active tab
                    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (!tabs || tabs.length === 0 || !tabs[0].id) {
                        sendResponse({
                            success: false,
                            error: 'No active tab found'
                        });
                        return;
                    }
                    const tabId = tabs[0].id;
                    const selector = message.payload?.selector;
                    const position = message.payload?.position;
                    if (!selector && !position) {
                        sendResponse({
                            success: false,
                            error: 'No selector or position provided'
                        });
                        return;
                    }
                    const results = await chrome.scripting.executeScript({
                        target: { tabId },
                        func: (selector, position, ref) => {
                            try {
                                let element = null;
                                if (ref) {
                                    // Try to find element by ref attribute (playwright-mcp style)
                                    element = document.querySelector(`[aria-ref="${ref}"]`);
                                    if (!element) {
                                        return { success: false, error: `Element not found with ref: ${ref}` };
                                    }
                                }
                                else if (selector) {
                                    // Try to find element by selector
                                    element = document.querySelector(selector);
                                    if (!element) {
                                        return { success: false, error: `Element not found with selector: ${selector}` };
                                    }
                                    // Scroll element into view
                                    element.scrollIntoView({ behavior: 'auto', block: 'center' });
                                }
                                else if (position) {
                                    // Find element at position
                                    element = document.elementFromPoint(position.x, position.y);
                                    if (!element) {
                                        return { success: false, error: `No element found at position (${position.x}, ${position.y})` };
                                    }
                                }
                                if (!element) {
                                    return { success: false, error: 'No element to click' };
                                }
                                // Scroll element into view if we found it by ref
                                if (ref) {
                                    element.scrollIntoView({ behavior: 'auto', block: 'center' });
                                }
                                // Get element position for click coordinates
                                const rect = element.getBoundingClientRect();
                                const clickX = position?.x || rect.left + rect.width / 2;
                                const clickY = position?.y || rect.top + rect.height / 2;
                                // Create and dispatch click events
                                const clickEvent = new MouseEvent('click', {
                                    view: window,
                                    bubbles: true,
                                    cancelable: true,
                                    clientX: clickX,
                                    clientY: clickY
                                });
                                element.dispatchEvent(clickEvent);
                                return { success: true, message: 'Click executed successfully' };
                            }
                            catch (error) {
                                return {
                                    success: false,
                                    error: `Error clicking element: ${error instanceof Error ? error.message : String(error)}`
                                };
                            }
                        },
                        args: [selector || null, position || null, message.payload?.ref || null]
                    });
                    if (!results || results.length === 0) {
                        sendResponse({
                            success: false,
                            error: 'No result from script execution'
                        });
                        return;
                    }
                    // Return the result
                    sendResponse(results[0].result);
                }
                catch (error) {
                    console.error('Error processing click request:', error);
                    sendResponse({
                        success: false,
                        error: `Error processing click request: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            })();
            return true; // Will respond asynchronously
        case 'TYPE':
            (async () => {
                try {
                    console.log('Type request for selector:', message.payload?.selector);
                    // Get the active tab
                    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (!tabs || tabs.length === 0 || !tabs[0].id) {
                        sendResponse({
                            success: false,
                            error: 'No active tab found'
                        });
                        return;
                    }
                    // Execute script in the tab to type text
                    const tabId = tabs[0].id;
                    const selector = message.payload?.selector;
                    const text = message.payload?.text;
                    if (!selector) {
                        sendResponse({
                            success: false,
                            error: 'No selector provided'
                        });
                        return;
                    }
                    if (text === undefined || text === null) {
                        sendResponse({
                            success: false,
                            error: 'No text provided'
                        });
                        return;
                    }
                    const results = await chrome.scripting.executeScript({
                        target: { tabId },
                        func: (selector, text) => {
                            try {
                                const element = document.querySelector(selector);
                                if (!element) {
                                    return { success: false, error: `Element not found with selector: ${selector}` };
                                }
                                // Scroll element into view
                                element.scrollIntoView({ behavior: 'auto', block: 'center' });
                                // Focus the element
                                element.focus();
                                // Handle different types of elements
                                if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                                    // For standard form elements
                                    element.value = text;
                                    // Trigger input and change events
                                    element.dispatchEvent(new Event('input', { bubbles: true }));
                                    element.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                                else if (element.isContentEditable) {
                                    // For contentEditable elements
                                    element.textContent = text;
                                    // Trigger input event for React and other frameworks
                                    element.dispatchEvent(new InputEvent('input', { bubbles: true }));
                                }
                                else {
                                    return {
                                        success: false,
                                        error: 'Element is not an input, textarea, or contentEditable element'
                                    };
                                }
                                return { success: true, message: 'Text typed successfully' };
                            }
                            catch (error) {
                                return {
                                    success: false,
                                    error: `Error typing text: ${error instanceof Error ? error.message : String(error)}`
                                };
                            }
                        },
                        args: [selector, text]
                    });
                    if (!results || results.length === 0) {
                        sendResponse({
                            success: false,
                            error: 'No result from script execution'
                        });
                        return;
                    }
                    // Return the result
                    sendResponse(results[0].result);
                }
                catch (error) {
                    console.error('Error processing type request:', error);
                    sendResponse({
                        success: false,
                        error: `Error processing type request: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            })();
            return true; // Will respond asynchronously
        case 'GET_ELEMENT':
            (async () => {
                try {
                    console.log('GetElement request for selector:', message.payload?.selector);
                    // Get the active tab
                    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (!tabs || tabs.length === 0 || !tabs[0].id) {
                        sendResponse({
                            success: false,
                            error: 'No active tab found'
                        });
                        return;
                    }
                    // Execute script in the tab to get element information
                    const tabId = tabs[0].id;
                    const selector = message.payload?.selector;
                    const limit = message.payload?.limit || 10;
                    if (!selector) {
                        sendResponse({
                            success: false,
                            error: 'No selector provided'
                        });
                        return;
                    }
                    const results = await chrome.scripting.executeScript({
                        target: { tabId },
                        func: (selector, limit) => {
                            try {
                                const elements = Array.from(document.querySelectorAll(selector));
                                if (!elements || elements.length === 0) {
                                    return {
                                        success: false,
                                        error: `No elements found with selector: ${selector}`
                                    };
                                }
                                const limitedElements = elements.slice(0, limit);
                                const elementInfos = limitedElements.map(element => {
                                    // Get all attributes as key-value pairs
                                    const attributesObj = {};
                                    for (const attr of element.attributes) {
                                        attributesObj[attr.name] = attr.value;
                                    }
                                    // Check if element is visible
                                    const style = window.getComputedStyle(element);
                                    const isVisible = style.display !== 'none' &&
                                        style.visibility !== 'hidden' &&
                                        style.opacity !== '0';
                                    // Check if element is enabled (for form controls)
                                    let isEnabled = true;
                                    if (element instanceof HTMLButtonElement ||
                                        element instanceof HTMLInputElement ||
                                        element instanceof HTMLSelectElement ||
                                        element instanceof HTMLTextAreaElement ||
                                        element instanceof HTMLOptionElement) {
                                        isEnabled = !element.disabled;
                                    }
                                    // Get bounding client rect
                                    const rect = element.getBoundingClientRect();
                                    const boundingRect = {
                                        top: rect.top,
                                        right: rect.right,
                                        bottom: rect.bottom,
                                        left: rect.left,
                                        width: rect.width,
                                        height: rect.height
                                    };
                                    // Get element value if applicable
                                    let value = undefined;
                                    if (element instanceof HTMLInputElement ||
                                        element instanceof HTMLTextAreaElement ||
                                        element instanceof HTMLSelectElement) {
                                        value = element.value;
                                    }
                                    return {
                                        tagName: element.tagName.toLowerCase(),
                                        id: element.id || undefined,
                                        className: element.className || undefined,
                                        textContent: element.textContent ? element.textContent.trim() : undefined,
                                        value,
                                        attributes: attributesObj,
                                        isVisible,
                                        isEnabled,
                                        boundingRect
                                    };
                                });
                                return {
                                    success: true,
                                    elements: elementInfos,
                                    count: elements.length
                                };
                            }
                            catch (error) {
                                return {
                                    success: false,
                                    error: `Error getting element information: ${error instanceof Error ? error.message : String(error)}`
                                };
                            }
                        },
                        args: [selector, limit]
                    });
                    if (!results || results.length === 0) {
                        sendResponse({
                            success: false,
                            error: 'No result from script execution'
                        });
                        return;
                    }
                    // Return the result
                    sendResponse(results[0].result);
                }
                catch (error) {
                    console.error('Error processing getElement request:', error);
                    sendResponse({
                        success: false,
                        error: `Error processing getElement request: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            })();
            return true; // Will respond asynchronously
        default:
            console.warn(`Unknown message type received in background: ${message.type}`);
            sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
            return false; // Synchronous response
    }
});
// Listen for side panel connections
chrome.runtime.onConnect.addListener((newPort) => {
    if (newPort.name === 'sidepanel') {
        console.log('Side panel connected');
        // Store the port globally so it can be used by other message handlers
        port = newPort;
        newPort.onMessage.addListener(async (message) => {
            console.log('Received message from side panel:', message);
            // Handle side panel specific messages
            switch (message.type) {
                case 'INIT':
                    newPort.postMessage({ type: 'INIT_RESPONSE', status: 'initialized' });
                    break;
                case 'CHAT_MESSAGE':
                    // Handle chat messages from side panel
                    handleChatMessage(message, newPort);
                    break;
                case 'PING':
                    // Handle ping messages from side panel
                    console.log('Received PING from side panel, responding with PONG');
                    newPort.postMessage({ type: 'PONG', timestamp: Date.now() });
                    break;
                default:
                    console.warn('Unknown side panel message type:', message.type);
                    newPort.postMessage({ type: 'ERROR', error: 'Unknown message type' });
            }
        });
        newPort.onDisconnect.addListener(() => {
            console.log('Side panel disconnected');
            if (port === newPort) {
                // Clear the global port reference when this port disconnects
                port = null;
            }
        });
    }
});
// Helper function to handle chat messages
async function handleChatMessage(message, port) {
    const requestId = `req_${Date.now()}`;
    console.log(`[${requestId}] Handling chat message...`);
    console.log(`[${requestId}] Message type: ${message.type}`);
    // Debug log provider/model information from message if available
    if (message.provider) {
        console.log(`[${requestId}] Requested provider: ${message.provider}`);
    }
    if (message.model) {
        console.log(`[${requestId}] Requested model: ${message.model}`);
    }
    // Log attachment information
    if (message.attachments && message.attachments.length > 0) {
        console.log(`[${requestId}] Message contains ${message.attachments.length} attachment(s)`);
        message.attachments.forEach((att, index) => {
            console.log(`[${requestId}] Attachment ${index + 1}: type=${att.type}, data length=${att.data ? att.data.length : 'undefined'}`);
        });
    }
    else {
        console.log(`[${requestId}] Message contains no attachments`);
    }
    try {
        let conversationMessages;
        // If there are attachments, create a message with parts array
        if (message.attachments && message.attachments.length > 0) {
            const lastMessage = message.messages ? message.messages[message.messages.length - 1] : null;
            // If we're adding to existing messages, replace the last user message with one that has parts
            if (message.messages && message.messages.length > 0) {
                // Copy all except the last message if it's a user message
                conversationMessages = lastMessage && lastMessage.role === 'user'
                    ? message.messages.slice(0, -1)
                    : [...message.messages];
                // Add a new user message with parts array
                conversationMessages.push({
                    role: 'user',
                    parts: [
                        { type: 'text', text: message.message || "Here's an image:" },
                        ...message.attachments.map((img) => ({
                            type: 'file',
                            mimeType: img.mimeType || 'image/png',
                            name: 'image.png',
                            data: img.data,
                            size: img.data.length
                        }))
                    ]
                });
            }
            else {
                // No existing messages, create new array with single user message
                conversationMessages = [{
                        role: 'user',
                        parts: [
                            { type: 'text', text: message.message || "Here's an image:" },
                            ...message.attachments.map((img) => ({
                                type: 'file',
                                mimeType: img.mimeType || 'image/png',
                                name: 'image.png',
                                data: img.data,
                                size: img.data.length
                            }))
                        ]
                    }];
            }
            console.log(`[${requestId}] Created message with ${message.attachments.length} attachments in parts array`);
        }
        else {
            // No attachments, proceed with normal message
            conversationMessages = message.messages || [{
                    role: 'user',
                    content: message.message
                }];
        }
        console.log(`[${requestId}] Processing chat with ${conversationMessages.length} messages in history`);
        // Get API key and provider from storage
        const apiConfig = await new Promise((resolve, reject) => {
            chrome.storage.sync.get([API_KEY_STORAGE_KEY, OPENAI_API_KEY_STORAGE_KEY, ANTHROPIC_API_KEY_STORAGE_KEY, API_PROVIDER_STORAGE_KEY, MODEL_STORAGE_KEY], (result) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                const provider = result[API_PROVIDER_STORAGE_KEY] || 'openai';
                // Choose the appropriate API key based on provider
                let apiKey = '';
                if (provider === 'openai') {
                    apiKey = result[OPENAI_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
                }
                else if (provider === 'anthropic') {
                    apiKey = result[ANTHROPIC_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
                }
                else {
                    apiKey = result[API_KEY_STORAGE_KEY] || '';
                }
                // Get the user-selected model or fall back to empty string (which will use the default in chat-handler.ts)
                const model = result[MODEL_STORAGE_KEY] || '';
                console.log(`[${requestId}] Using provider: ${provider}, model: ${model || 'default'}`);
                resolve({
                    apiKey,
                    provider,
                    model: model
                });
            });
        });
        if (!apiConfig.apiKey) {
            console.error(`[${requestId}] API key not configured`);
            port.postMessage({
                type: 'ERROR',
                requestId,
                error: 'API key not configured. Please configure it in the extension settings.'
            });
            return;
        }
        // Check if any messages have parts or attachments
        const hasMultiModalContent = conversationMessages.some((msg) => msg.parts && Array.isArray(msg.parts));
        if (hasMultiModalContent) {
            console.log(`[${requestId}] Detected messages with multi-modal content (parts array)`);
        }
        // Call the new handler which directly processes messages
        const response = await (0,_chat_handler__WEBPACK_IMPORTED_MODULE_0__.handleChatRequest)(conversationMessages, apiConfig.apiKey, apiConfig.provider, // Cast to Provider type
        apiConfig.model);
        console.log(`[${requestId}] Response status from chat handler: ${response.status}`);
        if (!response.ok) {
            // Handle potential errors from the handler
            let errorPayload;
            try {
                errorPayload = await response.json();
            }
            catch (e) {
                errorPayload = { error: `API Error: ${response.statusText}` };
            }
            console.error(`[${requestId}] Error from chat handler:`, errorPayload);
            port.postMessage({
                type: 'ERROR',
                requestId,
                error: errorPayload.error || errorPayload.message || 'Unknown API error'
            });
            return; // Stop processing on error
        }
        // Check if the response body exists
        if (!response.body) {
            console.error(`[${requestId}] Response body is null.`);
            port.postMessage({
                type: 'ERROR',
                requestId,
                error: 'Received empty response from API handler'
            });
            return; // Stop processing if no body
        }
        // Process the simple text stream from response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        console.log(`[${requestId}] Reading text stream...`);
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log(`[${requestId}] Text stream finished.`);
                    port.postMessage({
                        type: 'CHAT_STREAM_END',
                        requestId
                    });
                    break; // Exit loop when stream is done
                }
                // Decode the chunk and send it directly
                const chunk = decoder.decode(value, { stream: true });
                if (chunk) { // Avoid sending empty chunks if decoder yields them
                    port.postMessage({
                        type: 'CHAT_STREAM_CHUNK',
                        requestId,
                        chunk: chunk
                    });
                }
            }
        }
        catch (streamError) {
            const errorMessage = streamError instanceof Error ? streamError.message : String(streamError);
            console.error(`[${requestId}] Error reading text stream:`, errorMessage);
            port.postMessage({
                type: 'ERROR',
                requestId,
                error: `Stream reading error: ${errorMessage}`
            });
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[${requestId}] Chat processing error:`, errorMessage);
        port.postMessage({
            type: 'ERROR',
            requestId,
            error: `Chat handler error: ${errorMessage}`
        });
    }
}
// Generate a fallback response for Earth Engine queries
function generateFallbackResponse(query) {
    const keywords = {
        'ndvi': 'NDVI (Normalized Difference Vegetation Index) can be calculated using: ```\nvar ndvi = image.normalizedDifference(["NIR", "RED"]);\n```',
        'landsat': 'Landsat imagery can be accessed via: ```\nvar landsat = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")\n```',
        'sentinel': 'Sentinel imagery is available through: ```\nvar sentinel = ee.ImageCollection("COPERNICUS/S2_SR")\n```',
        'export': 'You can export images using Export.image.toDrive() or visualize them with Map.addLayer()',
        'classify': 'For classification, use ee.Classifier methods like randomForest() or smileCart()',
        'reducer': 'Reducers like mean(), sum(), or min() can aggregate data spatially or temporally'
    };
    // Check if any keywords are in the query
    for (const [key, response] of Object.entries(keywords)) {
        if (query.toLowerCase().includes(key)) {
            return response;
        }
    }
    // Default response
    return "I can help with Earth Engine tasks like image processing, classification, and data export. Could you provide more details about what you're trying to do?";
}

})();

/******/ })()
;
//# sourceMappingURL=background.js.map