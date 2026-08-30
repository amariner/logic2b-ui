"use client"

import * as React from "react"
import {
  ArrowLeftIcon,
  Inbox,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  StarIcon,
  TrashIcon,
} from "lucide-react"

import { cn } from "@/registry/lib/utils"
import { Avatar, AvatarFallback } from "@/registry/ui/avatar"
import { Badge } from "@/registry/ui/badge"
import { Button } from "@/registry/ui/button"
import { Input } from "@/registry/ui/input"
import { Separator } from "@/registry/ui/separator"

type MailFolder = "inbox" | "sent" | "trash"
type Mail = {
  id: number
  folder: MailFolder
  sender: string
  email: string
  subject: string
  preview: string
  body: string[]
  time: string
  unread?: boolean
  starred?: boolean
  label?: string
}

const MAILS: Mail[] = [
  {
    id: 1,
    folder: "inbox",
    sender: "Maya Chen",
    email: "maya@northstar.design",
    subject: "Final review for the launch system",
    preview: "The new component inventory is ready for a final pass before we publish.",
    body: [
      "Hi team,",
      "The new component inventory is ready for a final pass. I checked the responsive states and the updated token notes; everything is aligned with the launch checklist.",
      "Could you review the marketing examples before tomorrow afternoon? Once those are approved, I can hand the package to the product teams.",
      "Thanks, Maya",
    ],
    time: "10:42",
    unread: true,
    starred: true,
    label: "Design",
  },
  {
    id: 2,
    folder: "inbox",
    sender: "Noah Williams",
    email: "noah@acme.dev",
    subject: "Weekly engineering notes",
    preview: "A short recap of the registry migration and the remaining follow-ups.",
    body: [
      "Hello,",
      "This week we completed the registry migration and verified every consumer build. The only remaining follow-up is to update two internal templates.",
      "I added the timings and owners to the project brief.",
    ],
    time: "09:18",
    unread: true,
    label: "Updates",
  },
  {
    id: 3,
    folder: "inbox",
    sender: "Ava Patel",
    email: "ava@orbitlabs.io",
    subject: "Research session tomorrow",
    preview: "We have five participants confirmed for the navigation study.",
    body: [
      "Hi,",
      "We have five participants confirmed for tomorrow's navigation study. The session links and discussion guide are in the shared workspace.",
      "Let me know if you want me to add any questions before the first call.",
    ],
    time: "Yesterday",
  },
  {
    id: 4,
    folder: "inbox",
    sender: "Finance",
    email: "finance@example.com",
    subject: "August usage report",
    preview: "Your workspace usage report is ready to review.",
    body: [
      "Your August workspace usage report is now available.",
      "Spend remained within the approved range and no action is required.",
    ],
    time: "Mon",
    label: "Finance",
  },
  {
    id: 5,
    folder: "sent",
    sender: "Jordan Lee",
    email: "jordan@example.com",
    subject: "Re: Platform handoff",
    preview: "Here are the build notes and verification results from the handoff.",
    body: [
      "Hi Jordan,",
      "Here are the build notes and verification results from the handoff. All production checks passed and the migration guide is attached to the project brief.",
      "Best, Alex",
    ],
    time: "Fri",
  },
  {
    id: 6,
    folder: "trash",
    sender: "Events",
    email: "events@example.com",
    subject: "Invitation: product meetup",
    preview: "Join the local product community for an evening of short talks.",
    body: [
      "You're invited to the next product community meetup.",
      "The evening includes three short talks followed by an open Q&A.",
    ],
    time: "Aug 22",
  },
]

const FOLDERS = [
  { value: "inbox", label: "Inbox", icon: Inbox },
  { value: "starred", label: "Starred", icon: StarIcon },
  { value: "sent", label: "Sent", icon: SendIcon },
  { value: "trash", label: "Trash", icon: TrashIcon },
] as const

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
}

export function MailClient({ className, ...props }: React.ComponentProps<"div">) {
  const [folder, setFolder] = React.useState<(typeof FOLDERS)[number]["value"]>("inbox")
  const [query, setQuery] = React.useState("")
  const [selectedId, setSelectedId] = React.useState(1)
  const [starred, setStarred] = React.useState(
    () => new Set(MAILS.filter((mail) => mail.starred).map((mail) => mail.id))
  )

  const visible = MAILS.filter((mail) => {
    const inFolder = folder === "starred" ? starred.has(mail.id) : mail.folder === folder
    const haystack = `${mail.sender} ${mail.subject} ${mail.preview}`.toLowerCase()
    return inFolder && haystack.includes(query.toLowerCase())
  })
  const selected = visible.find((mail) => mail.id === selectedId) ?? visible[0]

  function toggleStar(id: number) {
    setStarred((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div
      className={cn(
        "mx-auto grid h-[680px] w-full max-w-7xl overflow-hidden border bg-background md:grid-cols-[190px_300px_minmax(0,1fr)] lg:grid-cols-[220px_360px_minmax(0,1fr)]",
        className
      )}
      {...props}
    >
      <aside className="hidden border-r p-4 md:flex md:flex-col" aria-label="Mailbox folders">
        <Button className="mb-5 w-full justify-start">
          <PlusIcon className="size-4" />
          Compose
        </Button>
        <nav className="space-y-1" aria-label="Mail folders">
          {FOLDERS.map((item) => {
            const Icon = item.icon
            const count =
              item.value === "starred"
                ? starred.size
                : MAILS.filter((mail) => mail.folder === item.value).length
            return (
              <Button
                key={item.value}
                variant={folder === item.value ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setFolder(item.value)}
                aria-current={folder === item.value ? "page" : undefined}
              >
                <Icon className="size-4" />
                {item.label}
                <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                  {count}
                </span>
              </Button>
            )
          })}
        </nav>
        <div className="mt-auto rounded-lg border bg-muted/40 p-3">
          <p className="text-sm font-medium">Team inbox</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            2.4 GB of 10 GB used
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full w-1/4 rounded-full bg-primary" />
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-col border-r" aria-label={`${folder} messages`}>
        <div className="border-b p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="font-heading text-lg font-semibold capitalize">{folder}</h1>
              <p className="text-muted-foreground text-xs">{visible.length} messages</p>
            </div>
            <Button variant="ghost" size="icon" aria-label="More mailbox options">
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </div>
          <div className="relative">
            <SearchIcon className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-8"
              placeholder="Search mail..."
              aria-label="Search mail"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto" role="list" aria-label="Messages">
          {visible.map((mail) => (
            <div key={mail.id} role="listitem">
              <button
                type="button"
                className={cn(
                  "w-full border-b px-4 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  selected?.id === mail.id && "bg-muted/70"
                )}
                onClick={() => setSelectedId(mail.id)}
                aria-current={selected?.id === mail.id ? "true" : undefined}
              >
                <span className="flex items-start gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn("truncate text-sm", mail.unread && "font-semibold")}>
                        {mail.sender}
                      </span>
                      {mail.unread && (
                        <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                      )}
                      <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                        {mail.time}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-sm font-medium">{mail.subject}</span>
                    <span className="text-muted-foreground mt-1 line-clamp-2 block text-xs leading-relaxed">
                      {mail.preview}
                    </span>
                    {mail.label && (
                      <Badge variant="secondary" className="mt-2">
                        {mail.label}
                      </Badge>
                    )}
                  </span>
                </span>
              </button>
            </div>
          ))}
          {visible.length === 0 && (
            <p className="text-muted-foreground px-4 py-12 text-center text-sm">
              No messages found.
            </p>
          )}
        </div>
      </section>

      <article className="hidden min-w-0 flex-col md:flex" aria-labelledby="mail-subject">
        {selected ? (
          <>
            <div className="flex h-[69px] items-center gap-1 border-b px-4">
              <Button variant="ghost" size="icon" aria-label="Back to message list" className="lg:hidden">
                <ArrowLeftIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={starred.has(selected.id) ? "Remove from starred" : "Add to starred"}
                aria-pressed={starred.has(selected.id)}
                onClick={() => toggleStar(selected.id)}
              >
                <StarIcon className={cn("size-4", starred.has(selected.id) && "fill-current")} />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Move message to trash">
                <TrashIcon className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="More message options" className="ml-auto">
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-8">
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback>{initials(selected.sender)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h2 id="mail-subject" className="font-heading text-xl font-semibold">
                    {selected.subject}
                  </h2>
                  <p className="mt-2 text-sm font-medium">{selected.sender}</p>
                  <p className="text-muted-foreground text-xs">{selected.email}</p>
                </div>
                <time className="text-muted-foreground text-xs">{selected.time}</time>
              </div>
              <Separator className="my-6" />
              <div className="max-w-2xl space-y-4 text-sm leading-7">
                {selected.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
            <div className="border-t p-4">
              <Button variant="outline">
                <ArrowLeftIcon className="size-4" />
                Reply
              </Button>
            </div>
          </>
        ) : (
          <div className="text-muted-foreground grid flex-1 place-items-center text-sm">
            Select a message to read it.
          </div>
        )}
      </article>
    </div>
  )
}
