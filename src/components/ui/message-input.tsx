import React from 'react'
import { useEffect, useRef, useState, type ChangeEventHandler, type KeyboardEventHandler, type RefObject } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUp, Info, Loader2, Mic, Paperclip, RefreshCw, Square, X } from "lucide-react"
import { omit } from "remeda"

import { cn } from "@/lib/utils"
import { useAudioRecording } from "@/hooks/use-audio-recording"
import { useAutosizeTextArea } from "@/hooks/use-autosize-textarea"
import { AudioVisualizer } from "@/components/ui/audio-visualizer"
import { Button } from "@/components/ui/button"
import { FilePreview } from "@/components/ui/file-preview"
import { InterruptPrompt } from "@/components/ui/interrupt-prompt"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { AVAILABLE_MODELS, MODEL_DISPLAY_NAMES, type ApiProvider } from "@/constants/models"

interface MessageInputBaseProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string
  submitOnEnter?: boolean
  stop?: () => void
  isGenerating: boolean
  enableInterrupt?: boolean
  transcribeAudio?: (blob: Blob) => Promise<string>
  onRegenerate?: () => void
  showRegenerate?: boolean
  mode?: 'ask' | 'do'
  onModeChange?: (mode: 'ask' | 'do') => void
  provider?: 'openai' | 'anthropic' | 'google' | 'qwen' | 'ollama'
  model?: string
  onProviderChange?: (provider: 'openai' | 'anthropic' | 'google' | 'qwen' | 'ollama') => void
  onModelChange?: (model: string) => void
}

interface MessageInputWithoutAttachmentProps extends MessageInputBaseProps {
  allowAttachments?: false
}

interface MessageInputWithAttachmentsProps extends MessageInputBaseProps {
  allowAttachments: true
  files: File[] | null
  setFiles: React.Dispatch<React.SetStateAction<File[] | null>>
}

type MessageInputProps =
  | MessageInputWithoutAttachmentProps
  | MessageInputWithAttachmentsProps

export function MessageInput({
  placeholder,
  className,
  onKeyDown: onKeyDownProp,
  submitOnEnter = true,
  stop,
  isGenerating,
  enableInterrupt = true,
  transcribeAudio,
  onRegenerate,
  showRegenerate = false,
  mode = 'ask',
  onModeChange,
  provider,
  model,
  onProviderChange,
  onModelChange,
  ...props
}: MessageInputProps) {
  // Set placeholder based on mode
  const defaultPlaceholder = mode === 'ask' ? 'Ask a question...' : 'What would you like me to do?';
  const effectivePlaceholder = placeholder || defaultPlaceholder;

  const [isDragging, setIsDragging] = useState(false)
  const [showInterruptPrompt, setShowInterruptPrompt] = useState(false)

  // Get all models grouped by provider
  const allModelsGrouped = Object.entries(AVAILABLE_MODELS).map(([providerKey, models]) => ({
    provider: providerKey as ApiProvider,
    models: models
  }))

  // Get display name for model
  const getModelDisplayName = (modelId: string) => {
    return MODEL_DISPLAY_NAMES[modelId] || modelId
  }

  // Get display name without parentheses for button
  const getModelDisplayNameShort = (modelId: string) => {
    const fullName = MODEL_DISPLAY_NAMES[modelId] || modelId
    // Remove everything in parentheses including the parentheses
    return fullName.replace(/\s*\([^)]*\)/g, '').trim()
  }

  // Get provider name for display
  const getProviderDisplayName = (provider: string) => {
    const names: Record<string, string> = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'google': 'Google',
      'qwen': 'Qwen',
      'ollama': 'Ollama'
    }
    return names[provider] || provider
  }

  // Find which provider a model belongs to
  const findProviderForModel = (modelId: string): ApiProvider | null => {
    for (const [providerKey, models] of Object.entries(AVAILABLE_MODELS)) {
      if (models.includes(modelId)) {
        return providerKey as ApiProvider
      }
    }
    return null
  }

  // Handle model change and save to storage
  const handleModelChange = (newModel: string) => {
    onModelChange?.(newModel)
    // Find the provider for this model and update both
    const newProvider = findProviderForModel(newModel)
    if (newProvider && onProviderChange) {
      onProviderChange(newProvider)
      // Save both to Chrome storage
      chrome.storage.sync.set({
        earth_engine_llm_model: newModel,
        earth_engine_llm_provider: newProvider
      })
    } else {
      // Just save the model
      chrome.storage.sync.set({ earth_engine_llm_model: newModel })
    }
  }

  const {
    isListening,
    isSpeechSupported,
    isRecording,
    isTranscribing,
    audioStream,
    toggleListening,
    stopRecording,
  } = useAudioRecording({
    transcribeAudio,
    onTranscriptionComplete: (text) => {
      props.onChange?.({ target: { value: text } } as any)
    },
  })

  useEffect(() => {
    if (!isGenerating) {
      setShowInterruptPrompt(false)
    }
  }, [isGenerating])

  const addFiles = (files: File[] | null) => {
    if (props.allowAttachments) {
      props.setFiles((currentFiles) => {
        if (currentFiles === null) {
          return files
        }

        if (files === null) {
          return currentFiles
        }

        return [...currentFiles, ...files]
      })
    }
  }

  const onDragOver = (event: React.DragEvent) => {
    if (props.allowAttachments !== true) return
    event.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (event: React.DragEvent) => {
    if (props.allowAttachments !== true) return
    event.preventDefault()
    setIsDragging(false)
  }

  const onDrop = (event: React.DragEvent) => {
    setIsDragging(false)
    if (props.allowAttachments !== true) return
    event.preventDefault()
    const dataTransfer = event.dataTransfer
    if (dataTransfer.files.length) {
      addFiles(Array.from(dataTransfer.files))
    }
  }

  const onPaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items
    if (!items) return

    const text = event.clipboardData.getData("text")
    if (text && text.length > 500 && props.allowAttachments) {
      event.preventDefault()
      const blob = new Blob([text], { type: "text/plain" })
      const file = new File([blob], "Pasted text", {
        type: "text/plain",
        lastModified: Date.now(),
      })
      addFiles([file])
      return
    }

    const files = Array.from(items)
      .map((item) => item.getAsFile())
      .filter((file) => file !== null)

    if (props.allowAttachments && files.length > 0) {
      addFiles(files)
    }
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (submitOnEnter && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()

      if (isGenerating && stop && enableInterrupt) {
        if (showInterruptPrompt) {
          stop()
          setShowInterruptPrompt(false)
          event.currentTarget.form?.requestSubmit()
        } else if (
          props.value ||
          (props.allowAttachments && props.files?.length)
        ) {
          setShowInterruptPrompt(true)
          return
        }
      }

      event.currentTarget.form?.requestSubmit()
    }

    onKeyDownProp?.(event)
  }

  const textAreaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (textAreaRef.current) {
      const currentRef = textAreaRef.current;
      const maxHeight = 300; // Maximum height in pixels before scrolling
      const borderWidth = 0;

      const borderAdjustment = borderWidth * 2;

      let originalHeight = parseFloat(currentRef.dataset.originalHeight || '0');
      if (!originalHeight) {
          originalHeight = currentRef.scrollHeight - borderAdjustment;
          currentRef.dataset.originalHeight = String(originalHeight);
      }

      currentRef.style.height = 'auto';
      const scrollHeight = currentRef.scrollHeight;
      const clampedToMax = Math.min(scrollHeight, maxHeight);
      const clampedToMin = Math.max(clampedToMax, originalHeight);
      currentRef.style.height = `${clampedToMin + borderAdjustment}px`;
    }
  }, [props.value]);

  const showFileList =
    props.allowAttachments && props.files && props.files.length > 0

  return (
    <div
      className="relative flex w-full"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {enableInterrupt && (
        <InterruptPrompt
          isOpen={showInterruptPrompt}
          close={() => setShowInterruptPrompt(false)}
        />
      )}

      <RecordingPrompt
        isVisible={isRecording}
        onStopRecording={stopRecording}
      />

      <div className="relative flex w-full items-center space-x-2">
        <div className="relative flex-1">
          <textarea
            aria-label="Write your prompt here"
            placeholder={effectivePlaceholder}
            ref={textAreaRef as RefObject<HTMLTextAreaElement>}
            onPaste={onPaste}
            onKeyDown={onKeyDown}
            className={cn(
              "z-10 w-full grow resize-none rounded-xl border border-input bg-background p-3 pb-12 text-sm ring-offset-background transition-[border] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px] overflow-y-auto",
              showFileList && "pb-16",
              className
            )}
            {...(props.allowAttachments
              ? omit(props, ["allowAttachments", "files", "setFiles"])
              : omit(props, ["allowAttachments"]))}
          />

          {props.allowAttachments && showFileList && (
            <div className="absolute inset-x-3 bottom-0 z-20 overflow-x-scroll py-3">
              <div className="flex space-x-3">
                <AnimatePresence mode="popLayout">
                  {props.files?.map((file) => {
                    return (
                      <FilePreview
                        key={file.name + String(file.lastModified)}
                        file={file}
                        onRemove={() => {
                          props.setFiles((files) => {
                            if (!files) return null

                            const filtered = Array.from(files).filter(
                              (f) => f !== file
                            )
                            if (filtered.length === 0) return null
                            return filtered
                          })
                        }}
                      />
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute left-3 right-3 bottom-3 z-20 flex justify-between items-center">
        {/* Left side - Mode and Model selectors */}
        <div className="flex gap-2 items-center">
          {onModeChange && (
            <Select value={mode} onValueChange={(value) => onModeChange(value as 'ask' | 'do')}>
              <SelectTrigger className="h-7 w-12 px-1.5 text-[11px] border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                <span>{mode === 'ask' ? 'Ask' : 'Do'}</span>
              </SelectTrigger>
              <SelectContent side="top" className="w-28">
                <SelectItem value="ask">Ask</SelectItem>
                <SelectItem value="do">Do</SelectItem>
              </SelectContent>
            </Select>
          )}
          {model && onModelChange && (
            <Select value={model} onValueChange={handleModelChange}>
              <SelectTrigger className="h-7 w-auto min-w-[130px] max-w-[160px] px-1.5 text-[11px] border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                <span className="truncate">{getModelDisplayNameShort(model)}</span>
              </SelectTrigger>
              <SelectContent side="top" className="max-h-80 w-64">
                {allModelsGrouped.map(({ provider: providerKey, models }, groupIndex) => (
                  <React.Fragment key={providerKey}>
                    {groupIndex > 0 && (
                      <div className="border-t border-gray-600 my-1" />
                    )}
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {getProviderDisplayName(providerKey)}
                    </div>
                    {models.map((modelId) => (
                      <SelectItem key={modelId} value={modelId}>
                        {getModelDisplayName(modelId)}
                      </SelectItem>
                    ))}
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Right side - Action buttons */}
        <div className="flex gap-2">
        {showRegenerate && onRegenerate && !isGenerating && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-7 w-7"
            aria-label="Regenerate response"
            onClick={onRegenerate}
            title="Regenerate"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
        {props.allowAttachments && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-7 w-7"
            aria-label="Attach a file"
            onClick={async () => {
              const files = await showFileUploadDialog()
              addFiles(files)
            }}
          >
            <Paperclip className="h-3.5 w-3.5" />
          </Button>
        )}
        {isSpeechSupported && (
          <AnimatePresence>
            {isRecording ? (
              <motion.div
                className="h-7 w-7"
              >
                <Button
                  type="button"
                  variant="outline"
                  className={cn("h-7 w-7", isListening && "text-primary")}
                  aria-label="Voice input"
                  size="icon"
                  onClick={toggleListening}
                >
                  <Mic size={14} />
                </Button>
              </motion.div>
            ) : (
          <Button
            type="button"
            variant="outline"
            className={cn("h-7 w-7", isListening && "text-primary")}
            aria-label="Voice input"
            size="icon"
            onClick={toggleListening}
          >
                <Mic size={14} />
          </Button>
            )}
          </AnimatePresence>
        )}
        {isGenerating && stop ? (
          <Button
            type="button"
            size="icon"
            className="h-7 w-7"
            aria-label="Stop generating"
            onClick={stop}
          >
            <Square className="h-2.5 w-2.5 animate-pulse" fill="currentColor" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            className="h-7 w-7 transition-opacity"
            aria-label="Send message"
            disabled={props.value === "" || isGenerating}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
        </div>
      </div>

      {props.allowAttachments && <FileUploadOverlay isDragging={isDragging} />}

      <RecordingControls
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        audioStream={audioStream}
        textAreaHeight={textAreaRef.current?.scrollHeight || 0}
        onStopRecording={stopRecording}
      />

      {transcribeAudio && (
        <AnimatePresence>
          {isRecording ? (
            <motion.div
              className="absolute inset-0 z-20 flex items-center justify-center rounded-xl"
            >
              <AudioVisualizer
                mediaRecorder={audioStream ? new MediaRecorder(audioStream) : null}
              />
              <Button
                type="button"
                variant="outline"
                className="absolute bottom-4 right-4 h-8 w-8"
                aria-label="Stop recording"
                onClick={stopRecording}
              >
                <Square className="h-3 w-3 animate-pulse" fill="currentColor" />
              </Button>
            </motion.div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className={cn("h-8 w-8", isListening && "text-primary")}
              aria-label="Voice input"
              size="icon"
              onClick={toggleListening}
            >
              <Mic size={16} />
            </Button>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
MessageInput.displayName = "MessageInput"

interface FileUploadOverlayProps {
  isDragging: boolean
}

function FileUploadOverlay({ isDragging }: FileUploadOverlayProps) {
  return (
    <AnimatePresence>
      {isDragging && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center space-x-2 rounded-xl border border-dashed border-border bg-background text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-hidden
        >
          <Paperclip className="h-4 w-4" />
          <span>Drop your files here to attach them.</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function showFileUploadDialog() {
  const input = document.createElement("input")

  input.type = "file"
  input.multiple = true
  input.accept = "*/*"
  input.click()

  return new Promise<File[] | null>((resolve) => {
    input.onchange = (e) => {
      const files = (e.currentTarget as HTMLInputElement).files

      if (files) {
        resolve(Array.from(files))
        return
      }

      resolve(null)
    }
  })
}

function TranscribingOverlay() {
  return (
    <motion.div
      className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <motion.div
          className="absolute inset-0 h-8 w-8 animate-pulse rounded-full bg-primary/20"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 1 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground">
        Transcribing audio...
      </p>
    </motion.div>
  )
}

interface RecordingPromptProps {
  isVisible: boolean
  onStopRecording: () => void
}

function RecordingPrompt({ isVisible, onStopRecording }: RecordingPromptProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ top: 0, filter: "blur(5px)" }}
          animate={{
            top: -40,
            filter: "blur(0px)",
            transition: {
              type: "spring",
              filter: { type: "tween" },
            },
          }}
          exit={{ top: 0, filter: "blur(5px)" }}
          className="absolute left-1/2 flex -translate-x-1/2 cursor-pointer overflow-hidden whitespace-nowrap rounded-full border bg-background py-1 text-center text-sm text-muted-foreground"
          onClick={onStopRecording}
        >
          <span className="mx-2.5 flex items-center">
            <Info className="mr-2 h-3 w-3" />
            Click to finish recording
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface RecordingControlsProps {
  isRecording: boolean
  isTranscribing: boolean
  audioStream: MediaStream | null
  textAreaHeight: number
  onStopRecording: () => void
}

function RecordingControls({
  isRecording,
  isTranscribing,
  audioStream,
  textAreaHeight,
  onStopRecording,
}: RecordingControlsProps) {
  if (isRecording) {
    return (
      <div
        className="absolute inset-[1px] z-50 overflow-hidden rounded-xl"
        style={{ height: textAreaHeight - 2 }}
      >
        <AudioVisualizer
          // Removed props passed here since the component logic is commented out
        />
      </div>
    )
  }

  if (isTranscribing) {
    return (
      <div
        className="absolute inset-[1px] z-50 overflow-hidden rounded-xl"
        style={{ height: textAreaHeight - 2 }}
      >
        <TranscribingOverlay />
      </div>
    )
  }

  return null
}
