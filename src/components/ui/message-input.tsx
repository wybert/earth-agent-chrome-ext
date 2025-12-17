import React from 'react'
import { useEffect, useRef, useState, type ChangeEventHandler, type KeyboardEventHandler, type RefObject } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUp, Info, Loader2, Mic, Paperclip, Square, X } from "lucide-react"
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
import { AVAILABLE_MODELS, MODEL_DISPLAY_NAMES, OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY, type ApiProvider } from "@/constants/models"
import type { OpenAICompatibleConfig, Provider } from "@/types/extension"

// File upload validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES_COUNT = 10 // Maximum 10 files
const ALLOWED_FILE_TYPES = [
  // Images
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'text/plain', 'text/csv', 'text/markdown',
  'application/pdf',
  'application/json',
  // Code files
  'text/javascript', 'application/javascript',
  'text/html', 'text/css',
  'application/x-python', 'text/x-python',
]

interface MessageInputBaseProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string
  submitOnEnter?: boolean
  stop?: () => void
  isGenerating: boolean
  enableInterrupt?: boolean
  transcribeAudio?: (blob: Blob) => Promise<string>
  mode?: string
  onModeChange?: (mode: string) => void
  profiles?: Array<{ id: string; name: string }>
  provider?: Provider
  model?: string
  onProviderChange?: (provider: Provider) => void
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
  mode = 'ask',
  onModeChange,
  profiles = [],
  provider,
  model,
  onProviderChange,
  onModelChange,
  ...props
}: MessageInputProps) {
  // Set placeholder based on mode
  const placeholderMode = mode === 'ask' ? 'ask' : 'do';
  const defaultPlaceholder = placeholderMode === 'ask' ? 'Ask a question...' : 'What would you like me to do?';
  const effectivePlaceholder = placeholder || defaultPlaceholder;

  const [isDragging, setIsDragging] = useState(false)
  const [showInterruptPrompt, setShowInterruptPrompt] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [customProviders, setCustomProviders] = useState<OpenAICompatibleConfig[]>([])

  // Load custom providers from storage
  useEffect(() => {
    chrome.storage.sync.get([OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY], (result) => {
      const configs: OpenAICompatibleConfig[] = result[OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY] || []
      // Only include enabled providers
      setCustomProviders(configs.filter(c => c.enabled))
    })

    // Listen for changes to custom providers
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'sync' && changes[OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY]) {
        const configs: OpenAICompatibleConfig[] = changes[OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY].newValue || []
        setCustomProviders(configs.filter(c => c.enabled))
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [])

  // Get all models grouped by provider
  const allModelsGrouped = Object.entries(AVAILABLE_MODELS).map(([providerKey, models]) => ({
    provider: providerKey as ApiProvider,
    models: models
  }))

  // Get display name for model (supports custom providers)
  const getModelDisplayName = (modelId: string) => {
    // Check if it's a custom provider
    if (provider?.startsWith('custom:')) {
      const configId = provider.replace('custom:', '')
      const config = customProviders.find(c => c.id === configId)
      if (config) {
        return `${config.name} - ${modelId}`
      }
    }
    return MODEL_DISPLAY_NAMES[modelId] || modelId
  }

  // Get display name without parentheses for button
  const getModelDisplayNameShort = (modelId: string) => {
    // For custom providers, show just the provider name and model
    if (provider?.startsWith('custom:')) {
      const configId = provider.replace('custom:', '')
      const config = customProviders.find(c => c.id === configId)
      if (config) {
        return `${config.name} - ${modelId}`
      }
    }

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
  const handleModelChange = (value: string) => {
    // Check if it's a custom provider (format: "custom:{id}:{model}")
    if (value.startsWith('custom:')) {
      const parts = value.split(':')
      if (parts.length === 3) {
        const providerId = `custom:${parts[1]}`
        const modelName = parts[2]

        onModelChange?.(modelName)
        onProviderChange?.(providerId as Provider)

        chrome.storage.sync.set({
          earth_engine_llm_model: modelName,
          earth_engine_llm_provider: providerId
        })
        return
      }
    }

    // Built-in provider model
    onModelChange?.(value)
    // Find the provider for this model and update both
    const newProvider = findProviderForModel(value)
    if (newProvider && onProviderChange) {
      onProviderChange(newProvider)
      // Save both to Chrome storage
      chrome.storage.sync.set({
        earth_engine_llm_model: value,
        earth_engine_llm_provider: newProvider
      })
    } else {
      // Just save the model
      chrome.storage.sync.set({ earth_engine_llm_model: value })
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

  // Clear file error after 5 seconds
  useEffect(() => {
    if (fileError) {
      const timer = setTimeout(() => setFileError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [fileError])

  const validateFiles = (files: File[], currentFiles: File[] | null): { valid: File[], error: string | null } => {
    const currentCount = currentFiles?.length || 0
    const totalCount = currentCount + files.length

    // Check total file count
    if (totalCount > MAX_FILES_COUNT) {
      return {
        valid: [],
        error: `Maximum ${MAX_FILES_COUNT} files allowed. You're trying to add ${files.length} file(s) but already have ${currentCount}.`
      }
    }

    const validFiles: File[] = []
    const errors: string[] = []

    for (const file of files) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB.`)
        continue
      }

      // Check file type
      if (!ALLOWED_FILE_TYPES.includes(file.type) && file.type !== '') {
        errors.push(`"${file.name}" type (${file.type}) is not supported.`)
        continue
      }

      // File is valid
      validFiles.push(file)
    }

    return {
      valid: validFiles,
      error: errors.length > 0 ? errors.join(' ') : null
    }
  }

  const addFiles = (files: File[] | null) => {
    if (props.allowAttachments && files && files.length > 0) {
      props.setFiles((currentFiles) => {
        const { valid, error } = validateFiles(files, currentFiles)

        if (error) {
          setFileError(error)
        }

        if (valid.length === 0) {
          return currentFiles
        }

        if (currentFiles === null) {
          return valid
        }

        return [...currentFiles, ...valid]
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

      <div className="relative flex w-full flex-col">
        {/* File upload error message */}
        <AnimatePresence>
          {fileError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2"
            >
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1 text-sm text-destructive">
                  {fileError}
                </div>
                <button
                  onClick={() => setFileError(null)}
                  className="text-destructive hover:text-destructive/80 transition-colors"
                  aria-label="Dismiss error"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* File attachments preview - above the input */}
        {props.allowAttachments && showFileList && (
          <div className="mb-2 overflow-x-auto">
            <div className="flex space-x-3 p-2">
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

        {/* Input area */}
        <div className="relative flex w-full items-center space-x-2">
          <div className="relative flex-1">
            <textarea
              aria-label="Write your prompt here"
              placeholder={effectivePlaceholder}
              ref={textAreaRef as RefObject<HTMLTextAreaElement>}
              onPaste={onPaste}
              onKeyDown={onKeyDown}
              data-onboarding="chat-input"
              className={cn(
                "z-10 w-full grow resize-none rounded-xl border border-input bg-background p-3 pb-12 text-sm ring-offset-background transition-[border] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px] overflow-y-auto",
                className
              )}
              {...(props.allowAttachments
                ? omit(props, ["allowAttachments", "files", "setFiles"])
                : omit(props, ["allowAttachments"]))}
            />
          </div>
        </div>
      </div>

      <div className="absolute left-3 right-3 bottom-3 z-20 flex justify-between items-center">
        {/* Left side - Mode and Model selectors */}
        <div className="flex gap-2 items-center">
          {onModeChange && (
            <Select value={mode} onValueChange={(value) => onModeChange(value)}>
              <SelectTrigger
                className="h-7 w-auto min-w-[64px] max-w-[160px] px-1.5 text-[11px] border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                data-onboarding="mode-selector"
              >
                <span className="truncate">
                  {mode === 'ask'
                    ? 'Ask'
                    : mode === 'do'
                      ? 'Do'
                      : mode.startsWith('profile:')
                        ? (profiles.find((p) => `profile:${p.id}` === mode)?.name || 'Profile')
                        : mode}
                </span>
              </SelectTrigger>
              <SelectContent side="top" className="w-56">
                <SelectItem value="ask">Ask</SelectItem>
                <SelectItem value="do">Do</SelectItem>
                {profiles.length > 0 ? (
                  <>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                    <div className="px-2 py-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      Profiles
                    </div>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={`profile:${p.id}`}>
                        <span className="truncate" title={p.name}>
                          {p.name}
                        </span>
                      </SelectItem>
                    ))}
                  </>
                ) : null}
              </SelectContent>
            </Select>
          )}
          {model && onModelChange && (
            <Select value={model} onValueChange={handleModelChange}>
              <SelectTrigger className="h-7 w-auto min-w-[130px] max-w-[160px] px-1.5 text-[11px] border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                <span className="truncate">{getModelDisplayNameShort(model)}</span>
              </SelectTrigger>
              <SelectContent side="top" className="max-h-80 w-64">
                {/* Built-in Providers */}
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

                {/* Custom Providers */}
                {customProviders.length > 0 && (
                  <>
                    <div className="border-t border-gray-600 my-1" />
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Custom Providers
                    </div>
                    {customProviders.map((config) => (
                      <SelectItem
                        key={`custom:${config.id}`}
                        value={`custom:${config.id}:${config.modelName}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          <span>{config.name} - {config.modelName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Right side - Action buttons */}
        <div className="flex gap-2">
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
  // Set accepted file types based on ALLOWED_FILE_TYPES
  input.accept = ALLOWED_FILE_TYPES.join(',')
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
