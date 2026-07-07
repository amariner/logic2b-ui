import type { ReactNode } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  XAxis,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/ui/card"
import { Button } from "@/registry/ui/button"
import { Input } from "@/registry/ui/input"
import { Label } from "@/registry/ui/label"
import { Textarea } from "@/registry/ui/textarea"
import { Badge } from "@/registry/ui/badge"
import { Separator } from "@/registry/ui/separator"
import { Checkbox } from "@/registry/ui/checkbox"
import { Skeleton } from "@/registry/ui/skeleton"
import { Avatar, AvatarFallback } from "@/registry/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/ui/tabs"
import { ChartContainer, type ChartConfig } from "@/registry/ui/chart"

/* -------------------------------------------------------------------------- */
/* Nova — style + token swatches (reflects the live theme)                    */
/* -------------------------------------------------------------------------- */
export function NovaTypography() {
  const tokens = [
    { name: "--background", cls: "bg-background" },
    { name: "--foreground", cls: "bg-foreground" },
    { name: "--primary", cls: "bg-primary" },
    { name: "--secondary", cls: "bg-secondary" },
    { name: "--muted", cls: "bg-muted" },
    { name: "--accent", cls: "bg-accent" },
    { name: "--border", cls: "bg-border" },
    { name: "--chart-1", cls: "bg-chart-1" },
    { name: "--chart-2", cls: "bg-chart-2" },
    { name: "--chart-3", cls: "bg-chart-3" },
    { name: "--chart-4", cls: "bg-chart-4" },
    { name: "--chart-5", cls: "bg-chart-5" },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Nova</CardTitle>
        <CardDescription>
          A preview of the typography and the theme tokens you&apos;ve picked.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-6 gap-2">
          {tokens.map((t) => (
            <div key={t.name} className="grid gap-1 text-center">
              <div className={`aspect-square rounded-md border ${t.cls}`} />
              <span className="truncate text-[9px] text-muted-foreground">
                {t.name.replace("--", "")}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Typography sample                                                          */
/* -------------------------------------------------------------------------- */
export function TypographySample() {
  return (
    <Card>
      <CardHeader>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Inherit — Inter
        </p>
        <CardTitle className="text-xl">Designing with rhythm and hierarchy.</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm leading-6 text-muted-foreground">
        <p>
          A strong body style keeps long-form content readable and balances the
          visual weight of headings.
        </p>
        <p>
          Thoughtful spacing and cadence help paragraphs scan quickly without
          feeling dense.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="secondary" className="w-full">Share Feedback</Button>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Toolbar — icon button grid                                                 */
/* -------------------------------------------------------------------------- */
function IconBtn({ children }: { children: ReactNode }) {
  return (
    <button className="inline-flex size-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
      {children}
    </button>
  )
}
export function ToolbarIcons() {
  const P = (d: string) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />
  )
  const icons = [
    '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
    '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    '<path d="M5 12h14"/><path d="M12 5v14"/>',
    '<path d="M5 12h14"/>',
    '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    '<path d="M20 6 9 17l-5-5"/>',
    '<path d="m6 9 6 6 6-6"/>',
    '<path d="m9 18 6-6-6-6"/>',
    '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  ]
  return (
    <Card>
      <CardContent className="grid grid-cols-8 gap-2 pt-6">
        {icons.map((d, i) => (
          <IconBtn key={i}>{P(d)}</IconBtn>
        ))}
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Codespaces — tabs + empty state                                            */
/* -------------------------------------------------------------------------- */
export function Codespaces() {
  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs defaultValue="cloud">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cloud">Codespaces</TabsTrigger>
            <TabsTrigger value="local">Local</TabsTrigger>
          </TabsList>
          <TabsContent value="cloud">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Codespaces</p>
                <p className="text-xs text-muted-foreground">Your workspaces in the cloud</p>
              </div>
              <Button variant="ghost" size="sm">+</Button>
            </div>
            <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 6h.01M6 18h.01"/></svg>
              <p className="text-sm font-medium">No codespaces</p>
              <p className="max-w-[220px] text-xs text-muted-foreground">
                You don&apos;t have any codespaces with this repository checked out.
              </p>
              <Button variant="outline" size="sm">Create Codespace</Button>
            </div>
          </TabsContent>
          <TabsContent value="local" className="py-8 text-center text-sm text-muted-foreground">
            Open the repository locally.
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Invite Team                                                                */
/* -------------------------------------------------------------------------- */
export function InviteTeam() {
  const rows = [
    { email: "alex@example.com", role: "editor" },
    { email: "sam@example.com", role: "viewer" },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Team</CardTitle>
        <CardDescription>Add members to your workspace.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {rows.map((r) => (
          <div key={r.email} className="flex gap-2">
            <Input defaultValue={r.email} className="flex-1" />
            <Select defaultValue={r.role}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
        <Button variant="outline" size="sm" className="w-full">+ Add another</Button>
        <div className="grid gap-1.5">
          <Label className="text-xs">Or share invite link</Label>
          <div className="flex gap-2">
            <Input defaultValue="https://app.co/invite/x8f2k" className="flex-1" />
            <Button variant="outline" size="icon" aria-label="Copy link">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Send Invites</Button>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* AI Agent — feature list                                                    */
/* -------------------------------------------------------------------------- */
export function AIAgent() {
  const feats = [
    { t: "Code reviews", d: "with full codebase context to catch hard-to-find bugs." },
    { t: "Code suggestions", d: "validated in sandboxes before you merge." },
    { t: "Root-cause analysis", d: "for production issues with deployment context." },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ship faster with the AI Agent</CardTitle>
        <CardDescription>Available on the Pro plan.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {feats.map((f) => (
          <div key={f.t} className="flex items-start gap-2.5 text-sm">
            <svg className="mt-0.5 shrink-0 text-emerald-500" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            <p><span className="font-medium">{f.t}</span>{" "}<span className="text-muted-foreground">{f.d}</span></p>
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="ghost" size="sm">Cancel</Button>
        <Button size="sm">Enable with $100 credits</Button>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Skeleton loading card                                                      */
/* -------------------------------------------------------------------------- */
export function SkeletonCard() {
  return (
    <Card>
      <CardContent className="grid gap-4 pt-6">
        <Skeleton className="h-4 w-2/3" />
        <div className="grid gap-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Browser Share — donut                                                      */
/* -------------------------------------------------------------------------- */
const browserData = [
  { k: "chrome", v: 44, fill: "var(--chart-1)" },
  { k: "edge", v: 21, fill: "var(--chart-2)" },
  { k: "firefox", v: 31, fill: "var(--chart-3)" },
  { k: "safari", v: 12, fill: "var(--chart-4)" },
]
const browserConfig = { v: { label: "Share" } } satisfies ChartConfig
export function BrowserShare({ animate = false }: { animate?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Browser Share</CardTitle>
          <CardDescription>January – June 2026</CardDescription>
        </div>
        <Badge variant="secondary">Firefox</Badge>
      </CardHeader>
      <CardContent>
        <div className="relative mx-auto aspect-square max-h-[170px]">
          <ChartContainer config={browserConfig} className="mx-auto aspect-square h-full">
            <PieChart>
              <Pie data={browserData} dataKey="v" nameKey="k" innerRadius="68%" outerRadius="92%" strokeWidth={0} isAnimationActive={animate}>
                {browserData.map((d) => <Cell key={d.k} fill={d.fill} />)}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums">935</span>
            <span className="text-xs text-muted-foreground">Visitors</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {["Chrome", "Edge", "Firefox", "Safari"].map((b, i) => (
            <span key={b} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: browserData[i].fill }} />
              {b}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* No Team Members                                                            */
/* -------------------------------------------------------------------------- */
export function NoTeamMembers() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex -space-x-2">
          {["AA", "SM", "JD"].map((n) => (
            <Avatar key={n} className="size-9 border-2 border-background">
              <AvatarFallback className="text-xs">{n}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        <div>
          <p className="font-semibold">No Team Members</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite your team to collaborate on this project.
          </p>
        </div>
        <Button size="sm">Invite Members</Button>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Report Bug                                                                 */
/* -------------------------------------------------------------------------- */
export function ReportBug() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Bug</CardTitle>
        <CardDescription>Help us fix issues faster.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="rb-title">Title</Label>
          <Input id="rb-title" placeholder="Brief description of the issue" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Severity</Label>
            <Select defaultValue="medium">
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Component</Label>
            <Select defaultValue="dashboard">
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dashboard">Dashboard</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rb-steps">Steps to reproduce</Label>
          <Textarea id="rb-steps" placeholder="1. Go to 2. Click on 3. Observe…" />
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" size="sm">Attach File</Button>
        <Button size="sm">Submit Bug</Button>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Contributors                                                               */
/* -------------------------------------------------------------------------- */
export function Contributors() {
  const people = ["AB", "CD", "EF", "GH", "IJ", "KL", "MN", "OP", "QR", "ST", "UV", "WX"]
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Contributors</CardTitle>
        <Badge variant="secondary">312</Badge>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {people.map((p) => (
            <Avatar key={p} className="size-9">
              <AvatarFallback className="text-[11px]">{p}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="link" size="sm" className="px-0">+ 810 contributors</Button>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Topic feedback                                                             */
/* -------------------------------------------------------------------------- */
export function TopicFeedback() {
  return (
    <Card>
      <CardHeader>
        <Label>Topic</Label>
        <Select defaultValue="bug">
          <SelectTrigger className="w-full"><SelectValue placeholder="Select a topic" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bug">Bug report</SelectItem>
            <SelectItem value="idea">Feature idea</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Label htmlFor="tf-msg">Feedback</Label>
        <Textarea id="tf-msg" placeholder="Your feedback helps us improve…" />
      </CardContent>
      <CardFooter>
        <Button size="sm">Submit</Button>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Sleep Report — stacked bars                                                */
/* -------------------------------------------------------------------------- */
const sleepData = [
  { d: "M", deep: 2, light: 4, rem: 1.2 },
  { d: "T", deep: 2.4, light: 3.6, rem: 1.4 },
  { d: "W", deep: 1.8, light: 4.2, rem: 1.1 },
  { d: "T", deep: 2.6, light: 3.9, rem: 1.6 },
  { d: "F", deep: 2.1, light: 4.1, rem: 1.3 },
  { d: "S", deep: 3, light: 4.4, rem: 1.7 },
  { d: "S", deep: 2.8, light: 4.3, rem: 1.5 },
]
const sleepConfig = {
  deep: { label: "Deep", color: "var(--chart-1)" },
  light: { label: "Light", color: "var(--chart-2)" },
  rem: { label: "REM", color: "var(--chart-3)" },
} satisfies ChartConfig
export function SleepReport({ animate = false }: { animate?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sleep Report</CardTitle>
        <CardDescription>Last night · 7h 24m</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={sleepConfig} className="h-36 w-full">
          <BarChart accessibilityLayer data={sleepData}>
            <XAxis dataKey="d" tickLine={false} tickMargin={8} axisLine={false} />
            <Bar dataKey="deep" stackId="s" fill="var(--color-deep)" isAnimationActive={animate} />
            <Bar dataKey="light" stackId="s" fill="var(--color-light)" isAnimationActive={animate} />
            <Bar dataKey="rem" stackId="s" fill="var(--color-rem)" radius={[3, 3, 0, 0]} isAnimationActive={animate} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="justify-between text-sm">
        <span className="font-medium">Good</span>
        <Button variant="ghost" size="sm">Details</Button>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Weekly Fitness — bars                                                      */
/* -------------------------------------------------------------------------- */
const fitnessData = [
  { d: "M", v: 320 }, { d: "T", v: 480 }, { d: "W", v: 260 }, { d: "T", v: 540 },
  { d: "F", v: 410 }, { d: "S", v: 600 }, { d: "S", v: 380 },
]
const fitnessConfig = { v: { label: "Calories", color: "var(--chart-1)" } } satisfies ChartConfig
export function WeeklyFitness({ animate = false }: { animate?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Fitness Summary</CardTitle>
        <CardDescription>Calories and workout load by day.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={fitnessConfig} className="h-32 w-full">
          <BarChart accessibilityLayer data={fitnessData}>
            <XAxis dataKey="d" tickLine={false} tickMargin={8} axisLine={false} />
            <Bar dataKey="v" fill="var(--color-v)" radius={3} isAnimationActive={animate} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <Button variant="secondary" className="w-full">View details</Button>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Visitors — area                                                            */
/* -------------------------------------------------------------------------- */
const visitorsData = [
  { d: "1", v: 60 }, { d: "2", v: 48 }, { d: "3", v: 66 }, { d: "4", v: 90 },
  { d: "5", v: 72 }, { d: "6", v: 40 }, { d: "7", v: 84 },
]
const visitorsConfig = { v: { label: "Visitors", color: "var(--chart-1)" } } satisfies ChartConfig
export function VisitorsChart({ animate = false }: { animate?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Visitors</CardTitle>
          <CardDescription>Last 6 months</CardDescription>
        </div>
        <Badge variant="secondary" className="text-emerald-600 dark:text-emerald-400">+2%</Badge>
      </CardHeader>
      <CardContent>
        <ChartContainer config={visitorsConfig} className="h-32 w-full">
          <AreaChart accessibilityLayer data={visitorsData} margin={{ left: 0, right: 0 }}>
            <defs>
              <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-v)" stopOpacity={0.5} />
                <stop offset="95%" stopColor="var(--color-v)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area dataKey="v" type="natural" fill="url(#fillVisitors)" stroke="var(--color-v)" strokeWidth={2} isAnimationActive={animate} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Usage meter — "5 days remaining in cycle"                                  */
/* -------------------------------------------------------------------------- */
export function UsageMeter() {
  const rows = [
    { name: "Edge Requests", val: "$1.83K" },
    { name: "Fast Data Transfer", val: "$952.51" },
    { name: "Monitoring data points", val: "$901.20" },
    { name: "Web Analytics Events", val: "$603.71" },
    { name: "ISR Writes", val: "524.52K / 2M" },
    { name: "Function Duration", val: "5.11 GB-Hrs" },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">5 days remaining in cycle</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2.5">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="size-1.5 rounded-full bg-muted-foreground/50" />
              {r.name}
            </span>
            <span className="font-medium tabular-nums">{r.val}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Anomaly alert / upsell                                                     */
/* -------------------------------------------------------------------------- */
export function AnomalyAlert() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="font-semibold">Get alerted for anomalies</p>
        <p className="text-sm text-muted-foreground">
          Automatically monitor your projects for anomalies and get notified.
        </p>
        <Button variant="secondary" size="sm">Upgrade to Observability Plus</Button>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Live Audio Waveform                                                        */
/* -------------------------------------------------------------------------- */
export function AudioWaveform() {
  const bars = [30, 55, 20, 70, 45, 90, 35, 60, 25, 80, 50, 40, 65, 30, 75, 45, 55, 20, 68, 38]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Audio Waveform</CardTitle>
        <CardDescription>Real-time microphone input visualization.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-20 items-center justify-center gap-1">
          {bars.map((h, i) => (
            <span key={i} className="w-1 rounded-full bg-primary/70" style={{ height: `${h}%` }} />
          ))}
        </div>
      </CardContent>
      <CardFooter className="grid grid-cols-3 gap-2">
        <Button size="sm">Start</Button>
        <Button variant="outline" size="sm">Stop</Button>
        <Button variant="ghost" size="sm">Static</Button>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Contributions & Activity                                                   */
/* -------------------------------------------------------------------------- */
export function ContributionsActivity() {
  const rows = [
    { name: "Edge Requests", val: "$1.83K" },
    { name: "Fast Data Transfer", val: "$952.51" },
    { name: "Monitoring data points", val: "$901.20" },
    { name: "Web Analytics Events", val: "$603.71" },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contributions & Activity</CardTitle>
        <CardDescription>Manage your activity visibility.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <label className="flex items-start gap-3 rounded-lg border p-3">
          <Checkbox className="mt-0.5" />
          <span className="grid gap-0.5">
            <span className="text-sm font-medium">Make profile private and hide activity</span>
            <span className="text-xs text-muted-foreground">
              Hide contributions from your profile and from social features.
            </span>
          </span>
        </label>
        <div className="grid gap-2">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                {r.name}
              </span>
              <span className="font-medium tabular-nums">{r.val}</span>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="secondary" size="sm">Save Changes</Button>
      </CardFooter>
    </Card>
  )
}
