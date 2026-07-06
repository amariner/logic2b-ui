import { useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/registry/ui/chart"
import { Button } from "@/registry/ui/button"
import { Badge } from "@/registry/ui/badge"
import { Separator } from "@/registry/ui/separator"
import { Switch } from "@/registry/ui/switch"
import { Checkbox } from "@/registry/ui/checkbox"
import { Label } from "@/registry/ui/label"
import { Slider } from "@/registry/ui/slider"
import { Textarea } from "@/registry/ui/textarea"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/registry/ui/toggle-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/ui/select"

/* ---------------------------------------------------------------------- */
/* Component showcase — the "controls" tile                               */
/* ---------------------------------------------------------------------- */
export function ComponentShowcase() {
  return (
    <Card>
      <CardContent className="grid gap-4 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">
            Button
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
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Button>
          <Button size="sm" variant="secondary">
            Secondary
          </Button>
          <Button size="sm" variant="outline">
            Outline
          </Button>
        </div>
        <Separator />
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Badge</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Checkbox defaultChecked aria-label="Toggle" />
          <Switch defaultChecked aria-label="Switch" />
        </div>
        <ToggleGroup type="single" defaultValue="bold" variant="outline" size="sm">
          <ToggleGroupItem value="bold" aria-label="Bold">
            B
          </ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Italic">
            <span className="italic">I</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Underline">
            <span className="underline">U</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </CardContent>
    </Card>
  )
}

/* ---------------------------------------------------------------------- */
/* Contribution history — bar chart                                       */
/* ---------------------------------------------------------------------- */
const contributionData = [
  { month: "Dec", value: 186 },
  { month: "Jan", value: 305 },
  { month: "Feb", value: 237 },
  { month: "Mar", value: 273 },
  { month: "Apr", value: 209 },
  { month: "May", value: 264 },
]
const contributionConfig = {
  value: { label: "Contributions", color: "var(--chart-1)" },
} satisfies ChartConfig

export function ContributionHistory({ animate = true }: { animate?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contribution History</CardTitle>
        <CardDescription>Last 6 months of activity</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={contributionConfig} className="h-40 w-full">
          <BarChart accessibilityLayer data={contributionData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={8}
              axisLine={false}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar
              dataKey="value"
              fill="var(--color-value)"
              radius={4}
              isAnimationActive={animate}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <Button variant="secondary" className="w-full">
          View Full Report
        </Button>
      </CardFooter>
    </Card>
  )
}

/* ---------------------------------------------------------------------- */
/* Analytics mini area chart                                              */
/* ---------------------------------------------------------------------- */
const analyticsData = [
  { d: "1", v: 40 },
  { d: "2", v: 62 },
  { d: "3", v: 51 },
  { d: "4", v: 78 },
  { d: "5", v: 66 },
  { d: "6", v: 92 },
  { d: "7", v: 74 },
]
const analyticsConfig = {
  v: { label: "Visitors", color: "var(--chart-2)" },
} satisfies ChartConfig

export function AnalyticsCard({ animate = true }: { animate?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>418.2K Visitors</CardDescription>
        </div>
        <Badge variant="secondary" className="text-emerald-600 dark:text-emerald-400">
          +10%
        </Badge>
      </CardHeader>
      <CardContent>
        <ChartContainer config={analyticsConfig} className="h-28 w-full">
          <AreaChart accessibilityLayer data={analyticsData} margin={{ left: 0, right: 0 }}>
            <defs>
              <linearGradient id="fillAnalytics" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-v)" stopOpacity={0.6} />
                <stop offset="95%" stopColor="var(--color-v)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area
              dataKey="v"
              type="natural"
              fill="url(#fillAnalytics)"
              stroke="var(--color-v)"
              strokeWidth={2}
              isAnimationActive={animate}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

/* ---------------------------------------------------------------------- */
/* Power usage bar chart                                                  */
/* ---------------------------------------------------------------------- */
const powerData = [
  { t: "6a", kw: 20 },
  { t: "8a", kw: 45 },
  { t: "10a", kw: 60 },
  { t: "12p", kw: 80 },
  { t: "2p", kw: 72 },
  { t: "4p", kw: 90 },
  { t: "6p", kw: 68 },
  { t: "8p", kw: 50 },
]
const powerConfig = {
  kw: { label: "kW", color: "var(--chart-4)" },
} satisfies ChartConfig

export function PowerUsage({ animate = true }: { animate?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Power Usage</CardTitle>
        <CardDescription>Whole home</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={powerConfig} className="h-32 w-full">
          <BarChart accessibilityLayer data={powerData}>
            <XAxis dataKey="t" tickLine={false} tickMargin={8} axisLine={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar
              dataKey="kw"
              fill="var(--color-kw)"
              radius={3}
              isAnimationActive={animate}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="justify-between text-sm">
        <div>
          <p className="text-muted-foreground">Currently Using</p>
          <p className="font-semibold tabular-nums">3.4 kW</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">Solar Gen</p>
          <p className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            +1.2 kW
          </p>
        </div>
      </CardFooter>
    </Card>
  )
}

/* ---------------------------------------------------------------------- */
/* Notifications with checkboxes                                          */
/* ---------------------------------------------------------------------- */
export function NotificationsCard() {
  const items = [
    {
      id: "n-tx",
      title: "Transaction alerts",
      desc: "Deposits, withdrawals, and transfers.",
      def: true,
    },
    {
      id: "n-sec",
      title: "Security alerts",
      desc: "Login attempts and account changes.",
      def: true,
    },
    {
      id: "n-goal",
      title: "Goal milestones",
      desc: "Updates at 25%, 50%, 75%, and 100%.",
      def: false,
    },
    {
      id: "n-mkt",
      title: "Market updates",
      desc: "Daily portfolio summary and price alerts.",
      def: false,
    },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Choose which alerts you want to receive.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {items.map((it) => (
          <div key={it.id} className="flex items-start gap-3">
            <Checkbox id={it.id} defaultChecked={it.def} className="mt-0.5" />
            <div className="grid gap-0.5">
              <Label htmlFor={it.id} className="font-medium">
                {it.title}
              </Label>
              <p className="text-xs text-muted-foreground">{it.desc}</p>
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Button variant="secondary" className="w-full">
          Save Preferences
        </Button>
      </CardFooter>
    </Card>
  )
}

/* ---------------------------------------------------------------------- */
/* Payout threshold — slider + select                                     */
/* ---------------------------------------------------------------------- */
export function PayoutThreshold() {
  const [amount, setAmount] = useState([2500])
  const money = amount[0].toLocaleString("en-US")
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout Threshold</CardTitle>
        <CardDescription>
          Set the minimum balance required before a payout is triggered.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2">
          <Label>Preferred Currency</Label>
          <Select defaultValue="usd">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="usd">USD — United States Dollar</SelectItem>
              <SelectItem value="eur">EUR — Euro</SelectItem>
              <SelectItem value="gbp">GBP — British Pound</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <Label>Minimum Payout Amount</Label>
            <span className="text-lg font-semibold tabular-nums">${money}.00</span>
          </div>
          <Slider
            value={amount}
            onValueChange={setAmount}
            min={50}
            max={10000}
            step={50}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>$50 (MIN)</span>
            <span>$10,000 (MAX)</span>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="payout-notes">Notes</Label>
          <Textarea
            id="payout-notes"
            placeholder="Add any notes for this payout configuration…"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Save Threshold</Button>
      </CardFooter>
    </Card>
  )
}
