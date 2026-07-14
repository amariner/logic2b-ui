"use client"

import * as React from "react"
import { UploadIcon } from "lucide-react"

import { cn } from "@/registry/lib/utils"

export interface FileDropzoneProps
  extends Omit<React.ComponentProps<"div">, "onDrop" | "children"> {
  /** Called with the accepted files when they are dropped or selected. */
  onFiles?: (files: File[]) => void
  /** `accept` attribute forwarded to the file input (e.g. `"image/*"`). */
  accept?: string
  /** Allow selecting more than one file. Default `false`. */
  multiple?: boolean
  disabled?: boolean
  /** Replace the default icon/prompt with your own content. */
  children?: React.ReactNode
}

/**
 * A drag-and-drop file surface with click / keyboard to browse. Native DnD (no
 * dependencies): highlights while a file is dragged over it and calls `onFiles`
 * with the dropped or selected files. Rendering the file list is left to the
 * consumer.
 */
function FileDropzone({
  className,
  onFiles,
  accept,
  multiple = false,
  disabled,
  children,
  ...props
}: FileDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = React.useState(false)

  const emit = (list: FileList | null) => {
    if (!list || list.length === 0) return
    onFiles?.(Array.from(list))
  }

  const open = () => {
    if (!disabled) inputRef.current?.click()
  }

  return (
    <div
      data-slot="file-dropzone"
      data-dragging={dragging ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          open()
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (!disabled) emit(e.dataTransfer.files)
      }}
      className={cn(
        "border-input flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors outline-none",
        "hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "data-dragging:border-ring data-dragging:bg-accent/60",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          emit(e.target.files)
          e.target.value = ""
        }}
      />
      {children ?? (
        <>
          <UploadIcon className="text-muted-foreground size-6" />
          <div className="text-sm">
            <span className="font-medium">Click to upload</span>
            <span className="text-muted-foreground"> or drag and drop</span>
          </div>
        </>
      )}
    </div>
  )
}

export { FileDropzone }
