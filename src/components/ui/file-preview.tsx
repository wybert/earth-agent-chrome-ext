"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { FileIcon, X, ImageIcon } from "lucide-react"

interface FilePreviewProps {
  file: File | {
    type?: string;
    name?: string;
    data?: string;
    mimeType?: string;
    size?: number;
  }
  onRemove?: () => void
}

export const FilePreview = React.forwardRef<HTMLDivElement, FilePreviewProps>(
  (props, ref) => {
    // Handle case where file is a standard File object
    if (props.file instanceof File) {
      if (props.file.type.startsWith("image/")) {
        return <ImageFilePreview {...props} ref={ref} />
      }

      if (
        props.file.type.startsWith("text/") ||
        props.file.name.endsWith(".txt") ||
        props.file.name.endsWith(".md")
      ) {
        return <TextFilePreview {...props} ref={ref} />
      }

      return <GenericFilePreview {...props} ref={ref} />
    } 
    
    // Handle our custom image data format from chat messages
    else {
      const fileType = props.file.type || props.file.mimeType || '';
      
      // For images with data URL
      if (fileType === 'image' || fileType.startsWith('image/') || (props.file.data && props.file.data.startsWith('data:image/'))) {
        return <CustomImagePreview {...props} ref={ref} />
      }
      
      // For text files
      if (fileType.startsWith('text/') || (props.file.name && 
          (props.file.name.endsWith('.txt') || props.file.name.endsWith('.md')))) {
        return <GenericFilePreview {...props} ref={ref} />
      }
      
      // Default fallback
      return <GenericFilePreview {...props} ref={ref} />
    }
  }
)
FilePreview.displayName = "FilePreview"

// New component for handling custom image format from chat
const CustomImagePreview = React.forwardRef<HTMLDivElement, FilePreviewProps>(
  ({ file, onRemove }, ref) => {
    // Extract data from our custom format
    const imageData = 'data' in file ? file.data : '';
    const fileName = 'name' in file ? file.name : 'Image';
    
    return (
      <motion.div
        ref={ref}
        className="relative flex max-w-[200px] rounded-md border p-1.5 pr-2 text-xs"
        layout
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
      >
        <div className="flex w-full items-center space-x-2">
          {imageData ? (
            <img
              alt={`Attachment ${fileName}`}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border bg-muted object-cover"
              src={imageData}
            />
          ) : (
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border bg-muted">
              <ImageIcon className="h-6 w-6 text-foreground" />
            </div>
          )}
          <span className="w-full truncate text-muted-foreground">
            {fileName || 'Image attachment'}
          </span>
        </div>

        {onRemove ? (
          <button
            className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full border bg-background"
            type="button"
            onClick={onRemove}
            aria-label="Remove attachment"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        ) : null}
      </motion.div>
    )
  }
)
CustomImagePreview.displayName = "CustomImagePreview"

const ImageFilePreview = React.forwardRef<HTMLDivElement, FilePreviewProps>(
  ({ file, onRemove }, ref) => {
    const [imageUrl, setImageUrl] = useState<string>("");

    useEffect(() => {
      // Only use URL.createObjectURL for actual File objects
      if (file instanceof File) {
        const url = URL.createObjectURL(file);
        setImageUrl(url);
        
        return () => {
          URL.revokeObjectURL(url);
        };
      }
      // For custom file-like objects that might have data URL
      else if ('data' in file && typeof file.data === 'string') {
        setImageUrl(file.data);
      }
    }, [file]);

    const fileName = file instanceof File ? file.name : ('name' in file ? file.name : 'image.png');

    return (
      <motion.div
        ref={ref}
        className="relative flex max-w-[200px] rounded-md border p-1.5 pr-2 text-xs"
        layout
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
      >
        <div className="flex w-full items-center space-x-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={`Attachment ${fileName}`}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border bg-muted object-cover"
            src={imageUrl}
          />
          <span className="w-full truncate text-muted-foreground">
            {fileName}
          </span>
        </div>

        {onRemove ? (
          <button
            className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full border bg-background"
            type="button"
            onClick={onRemove}
            aria-label="Remove attachment"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        ) : null}
      </motion.div>
    )
  }
)
ImageFilePreview.displayName = "ImageFilePreview"

const TextFilePreview = React.forwardRef<HTMLDivElement, FilePreviewProps>(
  ({ file, onRemove }, ref) => {
    const [preview, setPreview] = React.useState<string>("")

    useEffect(() => {
      // Handle standard File objects
      if (file instanceof File) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const text = e.target?.result as string
          setPreview(text.slice(0, 50) + (text.length > 50 ? "..." : ""))
        }
        reader.readAsText(file)
      } 
      // Handle custom data objects
      else if ('data' in file && typeof file.data === 'string') {
        // For text data, just show the first 50 chars
        setPreview(file.data.slice(0, 50) + (file.data.length > 50 ? "..." : ""))
      }
    }, [file])

    // Get file name from either standard File or custom object
    const fileName = file instanceof File ? file.name : (file.name || 'text.txt');

    return (
      <motion.div
        ref={ref}
        className="relative flex max-w-[200px] rounded-md border p-1.5 pr-2 text-xs"
        layout
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
      >
        <div className="flex w-full items-center space-x-2">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border bg-muted p-0.5">
            <div className="h-full w-full overflow-hidden text-[6px] leading-none text-muted-foreground">
              {preview || "Loading..."}
            </div>
          </div>
          <span className="w-full truncate text-muted-foreground">
            {fileName}
          </span>
        </div>

        {onRemove ? (
          <button
            className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full border bg-background"
            type="button"
            onClick={onRemove}
            aria-label="Remove attachment"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        ) : null}
      </motion.div>
    )
  }
)
TextFilePreview.displayName = "TextFilePreview"

const GenericFilePreview = React.forwardRef<HTMLDivElement, FilePreviewProps>(
  ({ file, onRemove }, ref) => {
    return (
      <motion.div
        ref={ref}
        className="relative flex max-w-[200px] rounded-md border p-1.5 pr-2 text-xs"
        layout
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
      >
        <div className="flex w-full items-center space-x-2">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border bg-muted">
            <FileIcon className="h-6 w-6 text-foreground" />
          </div>
          <span className="w-full truncate text-muted-foreground">
            {file.name}
          </span>
        </div>

        {onRemove ? (
          <button
            className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full border bg-background"
            type="button"
            onClick={onRemove}
            aria-label="Remove attachment"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        ) : null}
      </motion.div>
    )
  }
)
GenericFilePreview.displayName = "GenericFilePreview"
