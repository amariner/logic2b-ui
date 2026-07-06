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
import { Progress } from "@/registry/ui/progress"

/* ---------------------------------------------------------------------- */
/* "Set a new milestone" form card                                        */
/* ---------------------------------------------------------------------- */
export function MilestoneForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new milestone</CardTitle>
        <CardDescription>
          Define your target and we&apos;ll help you pace your savings.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="goal-name">Goal Name</Label>
          <Input id="goal-name" placeholder="e.g. New Car, Home Downpayment" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="goal-amount">Target Amount</Label>
            <Input id="goal-amount" defaultValue="$15,000" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="goal-date">Target Date</Label>
            <Input id="goal-date" defaultValue="Dec 2025" />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button className="w-full">Create Goal</Button>
        <Button variant="ghost" className="w-full">
          Cancel
        </Button>
      </CardFooter>
    </Card>
  )
}

/* ---------------------------------------------------------------------- */
/* QR connect card                                                        */
/* ---------------------------------------------------------------------- */
function QrCode() {
  // Deterministic pseudo-QR built from a fixed bit pattern (decorative only).
  const cells = 21
  const rows: boolean[][] = []
  let seed = 0x2f6b
  for (let y = 0; y < cells; y++) {
    const row: boolean[] = []
    for (let x = 0; x < cells; x++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      row.push(((seed >> 16) & 1) === 1)
    }
    rows.push(row)
  }
  // Force finder patterns in three corners.
  const finder = (oy: number, ox: number) => {
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 7; x++) {
        const edge = y === 0 || y === 6 || x === 0 || x === 6
        const core = y >= 2 && y <= 4 && x >= 2 && x <= 4
        rows[oy + y][ox + x] = edge || core
      }
  }
  finder(0, 0)
  finder(0, cells - 7)
  finder(cells - 7, 0)

  return (
    <svg
      viewBox={`0 0 ${cells} ${cells}`}
      className="size-40 rounded-md bg-white p-2"
      shapeRendering="crispEdges"
      role="img"
      aria-label="QR code"
    >
      {rows.map((row, y) =>
        row.map((on, x) =>
          on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#000" /> : null,
        ),
      )}
    </svg>
  )
}

export function QrConnectCard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
        <QrCode />
        <div>
          <p className="font-semibold">Scan to connect your device</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Open the logic2b app and scan this code to link your device.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

/* ---------------------------------------------------------------------- */
/* Empty-state "Distribute" card                                          */
/* ---------------------------------------------------------------------- */
export function DistributeCard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <div>
          <p className="font-semibold">Distribute your work</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your first release to start reaching your audience everywhere.
          </p>
        </div>
        <Button size="sm" variant="secondary">
          Create Release
        </Button>
      </CardContent>
    </Card>
  )
}

/* ---------------------------------------------------------------------- */
/* Claimable balance                                                      */
/* ---------------------------------------------------------------------- */
export function ClaimableBalance() {
  return (
    <Card>
      <CardHeader className="gap-1">
        <CardDescription>Claimable Balance</CardDescription>
        <CardTitle className="text-3xl tabular-nums">$1,211.29</CardTitle>
        <Badge variant="secondary" className="mt-1 w-fit gap-1.5">
          <span className="size-1.5 rounded-full bg-amber-500" />
          Pending Setup
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Net Royalties</span>
          <span className="tabular-nums">$1,248.75</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Processing Fee</span>
          <span className="tabular-nums text-muted-foreground">-$37.46</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between font-medium">
          <span>Total Ready to Claim</span>
          <span className="tabular-nums">$1,211.29</span>
        </div>
      </CardContent>
    </Card>
  )
}

/* ---------------------------------------------------------------------- */
/* Savings targets with progress                                          */
/* ---------------------------------------------------------------------- */
function TargetRow({
  label,
  amount,
  pct,
  current,
}: {
  label: string
  amount: string
  pct: number
  current: string
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{amount}</p>
      <Progress value={pct} className="mt-3" />
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{pct}% achieved</span>
        <span className="tabular-nums">{current}</span>
      </div>
    </div>
  )
}

export function SavingsTargets() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Savings Targets</CardTitle>
        <CardDescription>Active milestones across your portfolio.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <TargetRow label="Retirement" amount="$420,000" pct={65} current="$273,000" />
        <TargetRow label="Real Estate" amount="$85,000" pct={32} current="$27,200" />
      </CardContent>
    </Card>
  )
}

/* ---------------------------------------------------------------------- */
/* Dividend list with CSS sparklines                                      */
/* ---------------------------------------------------------------------- */
function Sparkbars({ bars }: { bars: number[] }) {
  return (
    <div className="flex h-8 items-end gap-1">
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-1.5 rounded-sm bg-muted-foreground/40"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  )
}

export function DividendList() {
  const holdings = [
    { name: "Vanguard", shares: "450 Shares", bars: [30, 55, 40, 70, 90] },
    { name: "S&P 500 VOO", shares: "112 Shares", bars: [50, 40, 65, 45, 80] },
    { name: "Apple AAPL", shares: "85 Shares", bars: [40, 60, 35, 55, 45] },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Q2 Dividend Income</CardTitle>
        <CardDescription>Quarterly payouts across your holdings.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {holdings.map((h) => (
          <div key={h.name} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{h.name}</p>
              <p className="text-xs text-muted-foreground">{h.shares}</p>
            </div>
            <Sparkbars bars={h.bars} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/* ---------------------------------------------------------------------- */
/* Chat card (static visual)                                              */
/* ---------------------------------------------------------------------- */
export function ChatCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>New Chat</CardTitle>
        <CardDescription>How can I help you today?</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
          I&apos;m building a chat UI and the scroll behavior is driving me nuts.
        </div>
        <div className="mr-auto max-w-[85%] rounded-lg rounded-bl-sm bg-muted px-3 py-2 text-sm">
          Let&apos;s pin the viewport to the bottom on new messages — I&apos;ll show
          you a hook.
        </div>
      </CardContent>
      <CardFooter>
        <div className="relative w-full">
          <Input placeholder="Send a message…" className="pr-10" />
          <div className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 12 7-7 7 7M12 5v14" />
            </svg>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

/* ---------------------------------------------------------------------- */
/* Account access form (static visual)                                    */
/* ---------------------------------------------------------------------- */
export function AccountAccess() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Access</CardTitle>
        <CardDescription>Update your credentials or re-authenticate.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="acc-email">Email Address</Label>
          <Input id="acc-email" type="email" defaultValue="artist@studio.inc" />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="acc-pass">Current Password</Label>
            <span className="text-xs text-muted-foreground">Forgot?</span>
          </div>
          <Input id="acc-pass" type="password" defaultValue="password" />
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="secondary" className="w-full">
          Update Security
        </Button>
      </CardFooter>
    </Card>
  )
}

/* ---------------------------------------------------------------------- */
/* Payments card with breadcrumb-like path                                */
/* ---------------------------------------------------------------------- */
export function PaymentsCard() {
  const rows = [
    { title: "Change transfer limit", desc: "Adjust how much you can send." },
    { title: "Scheduled transfers", desc: "Set up a transfer for later." },
    { title: "Recurring payments", desc: "Manage your repeated card charges." },
  ]
  return (
    <Card>
      <CardHeader>
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>Home</span>
          <span>/</span>
          <span>…</span>
          <span>/</span>
          <span className="text-foreground">Payments</span>
        </nav>
      </CardHeader>
      <CardContent className="grid gap-2">
        {rows.map((r) => (
          <div
            key={r.title}
            className="flex items-center gap-3 rounded-lg border p-3 text-sm"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-medium">{r.title}</p>
              <p className="truncate text-xs text-muted-foreground">{r.desc}</p>
            </div>
            <svg
              className="ml-auto text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
