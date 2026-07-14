"use client"

import * as React from "react"
import { CheckIcon, CopyIcon } from "lucide-react"

import { cn } from "@/registry/lib/utils"

export interface CodeBlockProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  /** The code to render and copy. */
  code: string
  /** Optional language label shown in the header (display only — no highlighting). */
  language?: string
}

/**
 * A styled code container with a one-click copy button. Dependency-free (no
 * syntax highlighter): renders the code verbatim in a `<pre>` and copies it via
 * the Clipboard API, with a copied-state affordance.
 */
function CodeBlock({ className, code, language, ...props }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )

  React.useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable (insecure context / denied) — no-op.
    }
  }

  const CopyButton = (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : "Copy code"}
      className={cn(
        "text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-7 items-center justify-center rounded-md transition-colors outline-none",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px]"
      )}
    >
      {copied ? (
        <CheckIcon className="size-3.5" />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
    </button>
  )

  return (
    <div
      data-slot="code-block"
      className={cn(
        "bg-muted/40 relative overflow-hidden rounded-lg border",
        className
      )}
      {...props}
    >
      {language ? (
        <div className="flex items-center justify-between border-b px-3 py-1.5">
          <span className="text-muted-foreground font-mono text-xs">
            {language}
          </span>
          {CopyButton}
        </div>
      ) : (
        <div className="absolute top-1.5 right-1.5 z-10">{CopyButton}</div>
      )}
      <pre
        className={cn(
          "overflow-x-auto p-4 text-sm leading-relaxed",
          !language && "pr-11"
        )}
      >
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  )
}

export { CodeBlock }
