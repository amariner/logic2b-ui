import type { ReactNode } from "react"
import { Cell, Pie, PieChart } from "recharts"

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
import { Badge } from "@/registry/ui/badge"
import { Separator } from "@/registry/ui/separator"
import { Switch } from "@/registry/ui/switch"
import { Slider } from "@/registry/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/registry/ui/toggle-group"
import { ChartContainer, type ChartConfig } from "@/registry/ui/chart"

/* -------------------------------------------------------------------------- */
/* Portfolio donut                                                            */
/* -------------------------------------------------------------------------- */
const donutData = [
  { k: "saved", v: 24000, fill: "var(--chart-1)" },
  { k: "rest", v: 6000, fill: "var(--muted)" },
]
const donutConfig = { v: { label: "Progress" } } satisfies ChartConfig
export function PortfolioDonut({ animate = false }: { animate?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Goal Progress</CardTitle>
        <CardDescription>Retirement target</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative mx-auto aspect-square max-h-[200px]">
          <ChartContainer config={donutConfig} className="mx-auto aspect-square h-full">
            <PieChart>
              <Pie
                data={donutData}
                dataKey="v"
                nameKey="k"
                innerRadius="66%"
                outerRadius="92%"
                strokeWidth={0}
                startAngle={90}
                endAngle={-270}
                isAnimationActive={animate}
              >
                {donutData.map((d) => (
                  <Cell key={d.k} fill={d.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums">$24,000</span>
            <span className="text-xs text-muted-foreground">80% of $30,000</span>
          </div>
        </div>
        <div className="mt-2 grid gap-2 text-sm">
          <div className="flex justify-between border-t pt-2">
            <span className="text-muted-foreground">Projected Finish</span>
            <span className="font-medium">October 2024</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly Average</span>
            <span className="font-medium tabular-nums">$1,250</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Top Contributor</span>
            <span className="font-medium">Auto-Transfer</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Kitchen Island — smart lighting controls                                   */
/* -------------------------------------------------------------------------- */
function ControlSlider({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground">
        {icon}
      </span>
      <div className="grid flex-1 gap-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Slider defaultValue={[value]} max={100} step={1} />
      </div>
    </div>
  )
}
export function LightingControls() {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Kitchen Island</CardTitle>
          <CardDescription>Hue Color Ambient</CardDescription>
        </div>
        <Switch defaultChecked aria-label="Power" />
      </CardHeader>
      <CardContent className="grid gap-4">
        <ToggleGroup
          type="single"
          defaultValue="cooking"
          variant="outline"
          size="sm"
          className="grid grid-cols-4"
        >
          <ToggleGroupItem value="cooking" className="text-xs">Cooking</ToggleGroupItem>
          <ToggleGroupItem value="dining" className="text-xs">Dining</ToggleGroupItem>
          <ToggleGroupItem value="night" className="text-xs">Night</ToggleGroupItem>
          <ToggleGroupItem value="focus" className="text-xs">Focus</ToggleGroupItem>
        </ToggleGroup>
        <ControlSlider
          label="Brightness"
          value={72}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>}
        />
        <ControlSlider
          label="Color Temp"
          value={45}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" /></svg>}
        />
        <ControlSlider
          label="Volume"
          value={60}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4.7 6.5 9H3v6h3.5L11 19.3z" /><path d="M16 9a5 5 0 0 1 0 6" /></svg>}
        />
        <ControlSlider
          label="Fade"
          value={30}
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 0 0 20Z" fill="currentColor" /></svg>}
        />
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Living Room — roller shades                                                */
/* -------------------------------------------------------------------------- */
export function RollerShades() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Living Room</CardTitle>
        <CardDescription>Roller Shades</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="relative h-24 overflow-hidden rounded-lg border bg-gradient-to-b from-muted-foreground/20 to-muted">
          <div className="absolute inset-x-0 top-0 h-2/3 bg-muted-foreground/25" />
        </div>
        <Slider defaultValue={[66]} max={100} step={1} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>OPEN</span>
          <span>CLOSE</span>
        </div>
      </CardContent>
      <CardFooter className="grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm">Open</Button>
        <Button variant="outline" size="sm">Half</Button>
        <Button variant="outline" size="sm">Closed</Button>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Holdings search + list                                                     */
/* -------------------------------------------------------------------------- */
export function HoldingsTable() {
  const holdings = [
    { sym: "VOO", name: "Vanguard S&P 500 ETF", meta: "112 SHARES · JAN 2021", tag: "ETF", val: "$48,230.40" },
    { sym: "VIG", name: "Vanguard Dividend Appr.", meta: "450 SHARES · MAR 2022", tag: "ETF", val: "$26,033.79" },
    { sym: "AAPL", name: "Apple Inc.", meta: "85 SHARES · NOV 2020", tag: "Stock", val: "$18,488.90" },
    { sym: "O", name: "Realty Income Corp", meta: "320 SHARES · JUN 2023", tag: "REIT", val: "$15,136.59" },
  ]
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="relative">
          <svg className="absolute left-2.5 top-2.5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <Input placeholder="Search holdings or tickers…" className="pl-8" />
        </div>
        <ToggleGroup type="single" defaultValue="stocks" variant="outline" size="sm" className="justify-start">
          <ToggleGroupItem value="stocks" className="text-xs">Stocks</ToggleGroupItem>
          <ToggleGroupItem value="etfs" className="text-xs">ETFs</ToggleGroupItem>
          <ToggleGroupItem value="reits" className="text-xs">REITs</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="grid gap-1">
        {holdings.map((h) => (
          <div key={h.sym} className="flex items-center gap-2.5 rounded-md px-1 py-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold">
              {h.sym}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{h.name}</p>
              <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">{h.meta}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-medium tabular-nums">{h.val}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{h.tag}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Dashboard navigation (two columns)                                         */
/* -------------------------------------------------------------------------- */
function NavList({ title, items, active }: { title: string; items: string[]; active?: string }) {
  return (
    <div className="grid gap-1">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.map((it) => (
        <span
          key={it}
          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
            it === active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground"
          }`}
        >
          <span className="size-1.5 rounded-full bg-current opacity-50" />
          {it}
        </span>
      ))}
    </div>
  )
}
export function DashboardNav() {
  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-5 pt-6 sm:grid-cols-2">
        <div className="grid gap-4">
          <NavList title="Overview" items={["Dashboard", "Transactions", "Investments", "Accounts", "Spending"]} active="Dashboard" />
          <NavList title="Planning" items={["Goals", "Budget", "Reports", "Documents"]} />
        </div>
        <div className="grid gap-4">
          <NavList title="Account" items={["Profile", "Billing", "Notifications", "Security", "Appearance"]} />
          <NavList title="Support" items={["Help Center", "Contact Us", "Docs", "Status"]} />
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Card Balance + Payment Due                                                 */
/* -------------------------------------------------------------------------- */
export function CardBalance() {
  return (
    <Card>
      <CardHeader className="gap-1">
        <CardDescription>Card Balance</CardDescription>
        <CardTitle className="text-3xl tabular-nums">US$12.94</CardTitle>
        <p className="text-xs text-muted-foreground">US$11,337.06 available</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-xs text-muted-foreground">Payment Due</p>
            <p className="font-semibold">1 Apr</p>
          </div>
          <Button size="sm" variant="secondary">Pay Early</Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Upcoming Payments — mini calendar + list                                   */
/* -------------------------------------------------------------------------- */
export function UpcomingPayments() {
  const weeks = [
    [28, 29, 30, 1, 2, 3, 4],
    [5, 6, 7, 8, 9, 10, 11],
    [12, 13, 14, 15, 16, 17, 18],
    [19, 20, 21, 22, 23, 24, 25],
    [26, 27, 28, 29, 30, 31, 1],
  ]
  const items = [
    { name: "Netflix Subscription", date: "Apr 15", amt: "$19.99" },
    { name: "Rent Payment", date: "Apr 1", amt: "$2,400.00" },
    { name: "Auto Insurance", date: "Apr 22", amt: "$186.00" },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Payments</CardTitle>
        <CardDescription>Select a date to view scheduled payments.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm font-medium">
            <button className="text-muted-foreground hover:text-foreground" aria-label="Previous month">‹</button>
            <span>July 2026</span>
            <button className="text-muted-foreground hover:text-foreground" aria-label="Next month">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <span key={d} className="py-1">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {weeks.flat().map((d, i) => {
              const muted = i < 3 || i >= weeks.flat().length - 1
              const active = d === 7 && i === 9
              return (
                <span
                  key={i}
                  className={`flex aspect-square items-center justify-center rounded-md ${
                    active ? "bg-primary font-medium text-primary-foreground" : muted ? "text-muted-foreground/40" : "hover:bg-accent"
                  }`}
                >
                  {d}
                </span>
              )
            })}
          </div>
        </div>
        <Separator />
        <div className="grid gap-2">
          {items.map((it) => (
            <div key={it.name} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{it.name}</p>
                <p className="text-xs text-muted-foreground">{it.date}</p>
              </div>
              <span className="font-medium tabular-nums">{it.amt}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Cover Art upload                                                           */
/* -------------------------------------------------------------------------- */
export function CoverArtUpload() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Cover Art
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed bg-muted/40 text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" /></svg>
        </div>
      </CardContent>
      <CardFooter className="grid gap-1.5">
        <Button className="w-full">Upload Artwork</Button>
        <p className="text-center text-xs text-muted-foreground">Minimum 3000 × 3000px · JPEG or PNG</p>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Connect Bank — empty state                                                 */
/* -------------------------------------------------------------------------- */
export function ConnectBank() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 18 0" /><path d="M5 21V10l7-6 7 6v11" /><path d="M9 21v-6h6v6" /></svg>
        </div>
        <div>
          <p className="font-semibold">Connect Bank</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Link your payout method to receive monthly royalty distributions automatically.
          </p>
        </div>
        <Button size="sm" variant="secondary">Set Up Payouts</Button>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Front Door — smart lock                                                    */
/* -------------------------------------------------------------------------- */
export function FrontDoorLock() {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Front Door</CardTitle>
          <CardDescription>Smart Lock Pro</CardDescription>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          Locked
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 8h.01" /><rect width="16" height="16" x="4" y="4" rx="3" /><path d="m4 15 4-4a3 5 0 0 1 3 0l5 5" /><path d="m14 14 1-1a3 5 0 0 1 3 0l2 2" /></svg>
          <Badge className="absolute right-2 top-2 gap-1 bg-red-600 text-white hover:bg-red-600">
            <span className="size-1.5 rounded-full bg-white" />
            Live
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Dollar-Cost Averaging — text                                               */
/* -------------------------------------------------------------------------- */
export function DollarCostAveraging() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dollar-Cost Averaging</CardTitle>
        <CardDescription>A strategy for building wealth over time.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm leading-6 text-muted-foreground">
        <p>
          <span className="underline decoration-muted-foreground/40 underline-offset-2">Over time</span>,
          this smooths out the average cost of your investments. When prices drop, your
          fixed amount buys more shares; when prices rise, you buy fewer — a lower
          average cost per share than lump-sum investing during volatile periods.
        </p>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Syncing accounts — loading state                                           */
/* -------------------------------------------------------------------------- */
export function SyncingAccounts() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <svg className="animate-spin text-muted-foreground" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
        <div>
          <p className="font-semibold">Syncing your accounts</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;re pulling in your latest transactions. This usually takes a few seconds.
          </p>
        </div>
        <Button size="sm" variant="outline">Cancel</Button>
      </CardContent>
    </Card>
  )
}
