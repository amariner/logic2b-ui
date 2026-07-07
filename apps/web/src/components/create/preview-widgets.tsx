import type { ReactNode } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts"

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
import { Switch } from "@/registry/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/registry/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/registry/ui/accordion"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/registry/ui/chart"

/* -------------------------------------------------------------------------- */
/* Buy Investment                                                             */
/* -------------------------------------------------------------------------- */
export function BuyInvestment() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Buy Investment</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="bi-amount">Amount to Invest</Label>
          <Input id="bi-amount" defaultValue="$ 1,000.00" />
        </div>
        <div className="grid gap-2">
          <Label>Order Type</Label>
          <Select defaultValue="market">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market">Market Order</SelectItem>
              <SelectItem value="limit">Limit Order</SelectItem>
              <SelectItem value="stop">Stop Order</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Market orders execute at the current price.
          </p>
        </div>
        <Separator />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Estimated Shares</span>
          <span className="font-medium tabular-nums">1.95</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Buying Power</span>
          <span className="font-medium tabular-nums">$12,450.00</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Review Order</Button>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Receiving Method (radio group)                                             */
/* -------------------------------------------------------------------------- */
export function ReceivingMethod() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Receiving Method</CardTitle>
        <CardDescription>Where should we send your payouts?</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="rm-name">Account Holder Name</Label>
          <Input id="rm-name" defaultValue="Synthetic Horizons Music LLC" />
        </div>
        <RadioGroup defaultValue="bank" className="grid grid-cols-2 gap-2">
          <Label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 has-[[data-state=checked]]:border-ring">
            <RadioGroupItem value="bank" className="mt-0.5" />
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">Bank Transfer</span>
              <span className="text-xs text-muted-foreground">SWIFT / IBAN</span>
            </span>
          </Label>
          <Label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 has-[[data-state=checked]]:border-ring">
            <RadioGroupItem value="paypal" className="mt-0.5" />
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">PayPal</span>
              <span className="text-xs text-muted-foreground">Instant Payout</span>
            </span>
          </Label>
        </RadioGroup>
        <div className="grid gap-2">
          <Label htmlFor="rm-iban">IBAN / Account Number</Label>
          <Input id="rm-iban" placeholder="DE89 3704 0044 ..." />
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="secondary" className="w-full">
          Save Payout Settings
        </Button>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Recent Transactions                                                        */
/* -------------------------------------------------------------------------- */
export function RecentTransactions() {
  const rows = [
    { name: "Blue Bottle Coffee", cat: "Food & Drink", when: "Today, 10:24 AM", amt: "-$6.50", pos: false },
    { name: "Whole Foods Market", cat: "Groceries", when: "Yesterday", amt: "-$142.30", pos: false },
    { name: "Stripe Payout", cat: "Income", when: "Oct 12", amt: "+$4,200.00", pos: true },
    { name: "Uber Technologies", cat: "Transport", when: "Oct 11", amt: "-$24.10", pos: false },
    { name: "Netflix Subscription", cat: "Entertainment", when: "Oct 10", amt: "-$19.99", pos: false },
  ]
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest account activity.</CardDescription>
        </div>
        <Button variant="outline" size="sm">
          View All
        </Button>
      </CardHeader>
      <CardContent className="grid gap-1">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3 rounded-md px-1 py-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><path d="M2 10h20" /></svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.name}</p>
              <p className="truncate text-xs text-muted-foreground">{r.cat}</p>
            </div>
            <span className="hidden text-xs text-muted-foreground sm:block">{r.when}</span>
            <span className={`text-sm font-medium tabular-nums ${r.pos ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{r.amt}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Transfer Funds                                                             */
/* -------------------------------------------------------------------------- */
export function TransferFunds() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Funds</CardTitle>
        <CardDescription>Move money between your connected accounts.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="tf-amt">Amount to Transfer</Label>
          <Input id="tf-amt" defaultValue="$ 1,200.00" />
        </div>
        <div className="grid gap-2">
          <Label>From Account</Label>
          <Select defaultValue="checking">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="checking">Main Checking (··8402) — $12,450.00</SelectItem>
              <SelectItem value="savings">High Yield Savings (··1192) — $42,100.00</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>To Account</Label>
          <Select defaultValue="savings">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="savings">High Yield Savings (··1192) — $42,100.00</SelectItem>
              <SelectItem value="checking">Main Checking (··8402) — $12,450.00</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5 rounded-lg border bg-muted/40 p-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Estimated arrival</span><span>Today</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Transaction fee</span><span className="tabular-nums">$0.00</span></div>
          <Separator className="my-1" />
          <div className="flex justify-between font-medium"><span>Total amount</span><span className="tabular-nums">$1,200.00</span></div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Confirm Transfer</Button>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Preferences (select + switches)                                            */
/* -------------------------------------------------------------------------- */
export function PreferencesCard() {
  const toggles = [
    { id: "pf-public", title: "Public Statistics", desc: "Allow others to see your total stream count." },
    { id: "pf-email", title: "Email Notifications", desc: "Monthly royalty reports and distribution updates." },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>Manage your account settings and notifications.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label>Default Currency</Label>
          <Select defaultValue="usd">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="usd">USD — United States Dollar</SelectItem>
              <SelectItem value="eur">EUR — Euro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {toggles.map((t) => (
          <div key={t.id} className="flex items-start justify-between gap-3">
            <div className="grid gap-0.5">
              <Label htmlFor={t.id} className="font-medium">{t.title}</Label>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </div>
            <Switch id={t.id} defaultChecked />
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="ghost" size="sm">Reset</Button>
        <Button size="sm">Save Preferences</Button>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Social Links                                                               */
/* -------------------------------------------------------------------------- */
export function SocialLinks() {
  const fields = [
    { id: "sl-spotify", label: "Spotify Artist URL", val: "spotify.com/artist/3j…2k" },
    { id: "sl-ig", label: "Instagram Handle", val: "@julianduryea_music" },
    { id: "sl-sc", label: "SoundCloud URL", val: "soundcloud.com/username" },
    { id: "sl-web", label: "Website", val: "https://yoursite.com" },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Links</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {fields.map((f) => (
          <div key={f.id} className="grid gap-1.5">
            <Label htmlFor={f.id} className="text-xs">{f.label}</Label>
            <Input id={f.id} defaultValue={f.val} />
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="ghost" size="sm">Discard</Button>
        <Button size="sm">Save Changes</Button>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Shipping Address (form grid)                                               */
/* -------------------------------------------------------------------------- */
export function ShippingAddress() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipping Address</CardTitle>
        <CardDescription>Where should we deliver?</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="sa-street">Street address</Label>
          <Input id="sa-street" placeholder="123 Main Street" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="sa-city">City</Label>
            <Input id="sa-city" placeholder="San Francisco" />
          </div>
          <div className="grid gap-2">
            <Label>State</Label>
            <Select defaultValue="ca">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ca">California</SelectItem>
                <SelectItem value="ny">New York</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="sa-zip">ZIP Code</Label>
            <Input id="sa-zip" placeholder="94102" />
          </div>
          <div className="grid gap-2">
            <Label>Country</Label>
            <Select defaultValue="us">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="es">Spain</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" size="sm">Cancel</Button>
        <Button size="sm">Save Address</Button>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Profile                                                                    */
/* -------------------------------------------------------------------------- */
export function ProfileCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Manage your profile information.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="pr-name">Name</Label>
          <Input id="pr-name" defaultValue="logic2b" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pr-email">Public Email</Label>
          <Select defaultValue="m">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="m">m@logic2b.com</SelectItem>
              <SelectItem value="hi">hi@logic2b.com</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pr-bio">Bio</Label>
          <Textarea id="pr-bio" placeholder="Tell us a little about yourself" />
        </div>
      </CardContent>
      <CardFooter>
        <Button>Save Profile</Button>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Keyboard Shortcuts                                                         */
/* -------------------------------------------------------------------------- */
function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground">
      {children}
    </kbd>
  )
}
export function ShortcutsCard() {
  const rows = [
    { label: "Search", keys: ["⌘", "K"] },
    { label: "Quick Actions", keys: ["⌘", "J"] },
    { label: "New File", keys: ["⌘", "N"] },
    { label: "Save", keys: ["⌘", "S"] },
    { label: "Toggle Sidebar", keys: ["⌘", "B"] },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Shortcuts</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between rounded-md px-1 py-1.5 text-sm">
            <span>{r.label}</span>
            <span className="flex gap-1">
              {r.keys.map((k, i) => <Kbd key={i}>{k}</Kbd>)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Invoice (table)                                                            */
/* -------------------------------------------------------------------------- */
export function InvoiceCard() {
  const items = [
    { name: "Design System License", qty: 1, rate: "$499.00", amt: "$499.00" },
    { name: "Priority Support", qty: 12, rate: "$99.00", amt: "$1,188.00" },
    { name: "Custom Components", qty: 3, rate: "$250.00", amt: "$750.00" },
  ]
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Invoice #INV-2847</CardTitle>
          <CardDescription>Due March 30, 2026</CardDescription>
        </div>
        <Badge variant="secondary">Pending</Badge>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it.name}>
                <TableCell className="font-medium">{it.name}</TableCell>
                <TableCell className="text-right tabular-nums">{it.qty}</TableCell>
                <TableCell className="text-right tabular-nums">{it.amt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-3 flex justify-between border-t pt-3 text-sm font-medium">
          <span>Total Due</span>
          <span className="tabular-nums">$2,437.00</span>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" size="sm">Download PDF</Button>
        <Button size="sm">Pay Now</Button>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Book Appointment                                                           */
/* -------------------------------------------------------------------------- */
export function BookAppointment() {
  const slots = ["9:00 AM", "10:30 AM", "11:00 AM", "1:30 PM"]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Book Appointment</CardTitle>
        <CardDescription>Dr. Sarah Chen · Cardiology</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm font-medium">Available on March 18, 2026</p>
        <div className="grid grid-cols-4 gap-2">
          {slots.map((s, i) => (
            <Button key={s} variant={i === 0 ? "default" : "outline"} size="sm" className="text-xs">
              {s}
            </Button>
          ))}
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium">New patient?</p>
          <p className="text-xs text-muted-foreground">Please arrive 15 minutes early.</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Book Appointment</Button>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* File Upload                                                                */
/* -------------------------------------------------------------------------- */
export function FileUpload() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>File Upload</CardTitle>
        <CardDescription>Drag and drop or browse.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5" /><path d="M12 3v12" /></svg>
          </div>
          <div>
            <p className="text-sm font-medium">Upload files</p>
            <p className="text-xs text-muted-foreground">PNG, JPG, PDF up to 10MB</p>
          </div>
          <Button variant="outline" size="sm">Browse Files</Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Environment Variables                                                      */
/* -------------------------------------------------------------------------- */
export function EnvVariables() {
  const rows = [
    { k: "DATABASE_URL", v: "••••••••" },
    { k: "NEXT_PUBLIC_API", v: "https://api.example.com" },
    { k: "STRIPE_SECRET", v: "••••••••" },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Environment Variables</CardTitle>
        <CardDescription>Production · 8 variables</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {rows.map((r) => (
          <div key={r.k} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 font-mono text-xs">
            <span className="font-medium">{r.k}</span>
            <span className="truncate text-muted-foreground">{r.v}</span>
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" size="sm">Edit</Button>
        <Button size="sm">Deploy</Button>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Security FAQ (tabs + accordion)                                            */
/* -------------------------------------------------------------------------- */
export function SecurityFaq() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Help Center</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <Accordion type="single" collapsible defaultValue="a1">
              <AccordionItem value="a1">
                <AccordionTrigger className="text-sm">How secure is my financial data?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  We use bank-level AES-256 encryption and never store your credentials.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="a2">
                <AccordionTrigger className="text-sm">How do I connect my bank?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Head to Settings → Accounts and follow the secure connection flow.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="a3">
                <AccordionTrigger className="text-sm">Can I export my data for taxes?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes — export a full CSV or PDF report from the Reports section anytime.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>
          <TabsContent value="billing" className="py-6 text-center text-sm text-muted-foreground">
            No billing questions yet.
          </TabsContent>
          <TabsContent value="goals" className="py-6 text-center text-sm text-muted-foreground">
            No goal questions yet.
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* 404 card                                                                   */
/* -------------------------------------------------------------------------- */
export function NotFoundCard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-2xl font-bold">404</p>
        <p className="text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
        <div className="relative w-full max-w-xs">
          <Input placeholder="Try searching for pages…" className="pl-8" />
          <svg className="absolute left-2.5 top-2.5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        </div>
        <Button variant="link" size="sm">Go to homepage</Button>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Charts                                                                     */
/* -------------------------------------------------------------------------- */
const stockData = [
  { d: "1", v: 120 }, { d: "2", v: 132 }, { d: "3", v: 101 }, { d: "4", v: 134 },
  { d: "5", v: 90 }, { d: "6", v: 130 }, { d: "7", v: 121 }, { d: "8", v: 145 },
]
const stockConfig = { v: { label: "Price", color: "var(--chart-1)" } } satisfies ChartConfig
export function StockPerformance({ animate = false }: { animate?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Performance</CardTitle>
        <CardDescription>6-month price history · VOO</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={stockConfig} className="h-32 w-full">
          <AreaChart accessibilityLayer data={stockData} margin={{ left: 0, right: 0 }}>
            <defs>
              <linearGradient id="fillStock" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-v)" stopOpacity={0.5} />
                <stop offset="95%" stopColor="var(--color-v)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area dataKey="v" type="monotone" fill="url(#fillStock)" stroke="var(--color-v)" strokeWidth={2} isAnimationActive={animate} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

const trafficData = [
  { m: "Jan", desktop: 186, mobile: 80 },
  { m: "Feb", desktop: 305, mobile: 200 },
  { m: "Mar", desktop: 237, mobile: 120 },
  { m: "Apr", desktop: 173, mobile: 190 },
  { m: "May", desktop: 209, mobile: 130 },
  { m: "Jun", desktop: 214, mobile: 140 },
]
const trafficConfig = {
  desktop: { label: "Desktop", color: "var(--chart-1)" },
  mobile: { label: "Mobile", color: "var(--chart-2)" },
} satisfies ChartConfig
export function TrafficChannels({ animate = false }: { animate?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Traffic channels</CardTitle>
        <CardDescription>Desktop and mobile, last 6 months.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={trafficConfig} className="h-40 w-full">
          <BarChart accessibilityLayer data={trafficData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="m" tickLine={false} tickMargin={8} axisLine={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={3} isAnimationActive={animate} />
            <Bar dataKey="mobile" fill="var(--color-mobile)" radius={3} isAnimationActive={animate} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="justify-between text-sm">
        <div><p className="text-muted-foreground">Desktop</p><p className="font-semibold tabular-nums">1,224</p></div>
        <div><p className="text-muted-foreground">Mobile</p><p className="font-semibold tabular-nums">860</p></div>
        <div className="text-right"><p className="text-muted-foreground">Mix delta</p><p className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">+42%</p></div>
      </CardFooter>
    </Card>
  )
}
