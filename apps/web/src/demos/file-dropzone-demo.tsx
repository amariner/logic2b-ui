"use client"

import * as React from "react"

import { FileDropzone } from "@/registry/ui/file-dropzone"

export default function FileDropzoneDemo() {
  const [files, setFiles] = React.useState<string[]>([])

  return (
    <div className="w-full max-w-sm space-y-3">
      <FileDropzone
        multiple
        onFiles={(f) => setFiles(f.map((file) => file.name))}
      />
      {files.length > 0 && (
        <ul className="text-muted-foreground space-y-1 text-sm">
          {files.map((name) => (
            <li key={name} className="truncate">
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
