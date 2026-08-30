"use client"

import * as React from "react"
import {
  BotIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlusIcon,
  SendIcon,
  SparklesIcon,
} from "lucide-react"

import { cn } from "@/registry/lib/utils"
import { Avatar, AvatarFallback } from "@/registry/ui/avatar"
import { Badge } from "@/registry/ui/badge"
import { Button } from "@/registry/ui/button"
import { Separator } from "@/registry/ui/separator"
import { Textarea } from "@/registry/ui/textarea"

type Message = {
  id: string
  role: "assistant" | "user"
  content: string
}

type StreamState = "idle" | "streaming" | "stopped"

const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "I reviewed the component contract. The strongest next step is to keep loading, empty, error and success states in the same accessible structure.",
  },
  {
    id: "question",
    role: "user",
    content: "Turn that into a concise implementation checklist.",
  },
  {
    id: "answer",
    role: "assistant",
    content:
      "1. Preserve one labelled region across states.\n2. Announce progress without moving focus.\n3. Keep retry actions beside the error.\n4. Test keyboard flow and reduced motion.",
  },
]

const STREAMED_RESPONSE =
  "Start with a stable message list and expose generation progress through a polite status. Keep the composer usable while idle, provide a visible stop action while streaming, and return focus to the prompt after completion. Then cover success, interruption and retry in automated tests."

const CONVERSATIONS = [
  ["Design system audit", "2 min ago"],
  ["Release checklist", "Yesterday"],
  ["Dashboard empty states", "Mon"],
] as const

export function AiChat({ className, ...props }: React.ComponentProps<"div">) {
  const [messages, setMessages] = React.useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = React.useState("")
  const [streamState, setStreamState] = React.useState<StreamState>("idle")
  const timeoutRef = React.useRef<number | null>(null)
  const endRef = React.useRef<HTMLDivElement>(null)
  const nextId = React.useRef(0)

  const stopTimer = React.useCallback(() => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = null
  }, [])

  React.useEffect(() => stopTimer, [stopTimer])

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" })
  }, [messages])

  function streamAnswer() {
    stopTimer()
    const id = `assistant-${nextId.current++}`
    const chunks = STREAMED_RESPONSE.match(/\S+\s*/g) ?? [STREAMED_RESPONSE]
    let index = 0
    setMessages((current) => [...current, { id, role: "assistant", content: "" }])
    setStreamState("streaming")

    const appendChunk = () => {
      const chunk = chunks[index]
      index += 1
      setMessages((current) =>
        current.map((message) =>
          message.id === id
            ? { ...message, content: message.content + chunk }
            : message
        )
      )
      if (index < chunks.length) {
        timeoutRef.current = window.setTimeout(appendChunk, 55)
      } else {
        timeoutRef.current = null
        setStreamState("idle")
      }
    }

    timeoutRef.current = window.setTimeout(appendChunk, 120)
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const content = input.trim()
    if (!content || streamState === "streaming") return
    setMessages((current) => [
      ...current,
      { id: `user-${nextId.current++}`, role: "user", content },
    ])
    setInput("")
    streamAnswer()
  }

  function stopStreaming() {
    stopTimer()
    setStreamState("stopped")
  }

  return (
    <div
      className={cn(
        "mx-auto grid h-[700px] w-full max-w-[1400px] overflow-hidden border bg-background lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)_250px]",
        className
      )}
      {...props}
    >
      <aside className="hidden border-r p-4 lg:flex lg:flex-col" aria-label="Conversations">
        <Button className="mb-6 w-full justify-start">
          <PlusIcon className="size-4" />
          New conversation
        </Button>
        <h2 className="mb-2 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Recent
        </h2>
        <nav aria-label="Recent conversations" className="space-y-1">
          {CONVERSATIONS.map(([title, time], index) => (
            <Button
              key={title}
              variant={index === 0 ? "secondary" : "ghost"}
              className="h-auto w-full justify-start px-2 py-2.5 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{title}</span>
                <span className="block text-xs font-normal text-muted-foreground">{time}</span>
              </span>
            </Button>
          ))}
        </nav>
        <div className="mt-auto rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-4" />
            <p className="text-sm font-medium">12,480 tokens left</p>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Context resets with a new conversation.
          </p>
        </div>
      </aside>

      <main className="flex min-w-0 flex-col" aria-label="AI conversation">
        <header className="flex min-h-16 items-center gap-3 border-b px-4 sm:px-6">
          <div className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <BotIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-heading font-semibold">Design system copilot</h1>
            <p className="text-xs text-muted-foreground">Registry and accessibility context enabled</p>
          </div>
          <Badge variant="secondary" className="ml-auto hidden sm:inline-flex">GPT-5</Badge>
          <Button variant="ghost" size="icon" aria-label="More conversation options">
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </header>

        <div
          className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8"
          role="log"
          aria-label="Conversation messages"
          aria-live="polite"
        >
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((message) => (
              <article
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" && "justify-end"
                )}
              >
                {message.role === "assistant" && (
                  <Avatar className="mt-0.5 size-8">
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%]",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border bg-muted/40"
                  )}
                >
                  {message.content || (
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2Icon className="size-4 animate-spin" />
                      Thinking…
                    </span>
                  )}
                </div>
              </article>
            ))}
            <div ref={endRef} />
          </div>
        </div>

        <div className="border-t bg-background p-3 sm:p-4">
          <div className="mx-auto max-w-3xl">
            <div className="mb-2 flex min-h-6 items-center justify-between gap-3 text-xs text-muted-foreground">
              <span role="status">
                {streamState === "streaming"
                  ? "Generating response…"
                  : streamState === "stopped"
                    ? "Generation stopped"
                    : "Ready"}
              </span>
              {streamState === "stopped" && (
                <Button variant="link" className="h-auto p-0 text-xs" onClick={streamAnswer}>
                  Continue response
                </Button>
              )}
            </div>
            <form onSubmit={submit} className="rounded-xl border bg-background p-2 shadow-sm">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about your interface…"
                aria-label="Prompt"
                className="min-h-16 resize-none border-0 shadow-none focus-visible:ring-0"
              />
              <div className="flex items-center justify-between pt-2">
                <p className="hidden text-xs text-muted-foreground sm:block">
                  AI can make mistakes. Review generated code.
                </p>
                {streamState === "streaming" ? (
                  <Button type="button" variant="outline" size="sm" onClick={stopStreaming}>
                    <span className="size-2.5 rounded-sm bg-current" aria-hidden="true" />
                    Stop generating
                  </Button>
                ) : (
                  <Button type="submit" size="sm" disabled={!input.trim()} className="ml-auto">
                    <SendIcon className="size-4" />
                    Send
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>

      <aside className="hidden border-l p-5 xl:block" aria-label="Conversation context">
        <h2 className="font-heading font-semibold">Context</h2>
        <p className="mt-1 text-xs text-muted-foreground">Sources available to this conversation</p>
        <Separator className="my-5" />
        <div className="space-y-3">
          {["Component API", "Accessibility contracts", "Release roadmap"].map((source) => (
            <div key={source} className="rounded-lg border p-3">
              <p className="text-sm font-medium">{source}</p>
              <p className="mt-1 text-xs text-muted-foreground">Synced just now</p>
            </div>
          ))}
        </div>
        <Separator className="my-5" />
        <h3 className="text-sm font-medium">Response style</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Concise answers with implementation details and explicit accessibility checks.
        </p>
      </aside>
    </div>
  )
}
