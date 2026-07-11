"use client"

import * as React from "react"
import { SendIcon } from "lucide-react"

import { cn } from "@/registry/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/ui/avatar"
import { Button } from "@/registry/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/ui/card"
import { Input } from "@/registry/ui/input"

type Message = {
  role: "agent" | "user"
  content: string
}

const initialMessages: Message[] = [
  { role: "agent", content: "Hi, how can I help you today?" },
  { role: "user", content: "Hey, I'm having trouble with my account." },
  { role: "agent", content: "What seems to be the problem?" },
  { role: "user", content: "I can't log in." },
]

export function Chat({ className, ...props }: React.ComponentProps<"div">) {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages)
  const [input, setInput] = React.useState("")
  const endRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" })
  }, [messages])

  function send(event: React.FormEvent) {
    event.preventDefault()
    const content = input.trim()
    if (!content) return
    setMessages((prev) => [...prev, { role: "user", content }])
    setInput("")
  }

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-lg flex-col px-6 py-16",
        className
      )}
      {...props}
    >
      <Card className="flex h-[560px] flex-col">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" alt="Support" />
            <AvatarFallback>SD</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-sm">Sofia Davis</CardTitle>
            <CardDescription>support@example.com</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex-1 space-y-4 overflow-y-auto py-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                message.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {message.content}
            </div>
          ))}
          <div ref={endRef} />
        </CardContent>
        <CardFooter className="border-t pt-6">
          <form onSubmit={send} className="flex w-full items-center gap-2">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type your message..."
              aria-label="Message"
            />
            <Button type="submit" size="icon" disabled={!input.trim()}>
              <SendIcon className="size-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
