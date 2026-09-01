import { ArrowDownRight, ArrowUpRight, ChevronDown, Download, MoreHorizontal, Search, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const metricCards = [
  { label: "Total revenue", value: "$84,290", change: "+12.5%", positive: true },
  { label: "Active customers", value: "8,452", change: "+8.2%", positive: true },
  { label: "Conversion rate", value: "4.86%", change: "+0.7%", positive: true },
  { label: "Avg. order value", value: "$96.70", change: "-2.4%", positive: false },
]

const bars = [42, 50, 45, 65, 58, 73, 68, 88, 79, 94, 86, 100]
const channels = [
  ["Organic search", "42.8%", "#6d4aff"], ["Direct", "24.5%", "#5596f6"], ["Paid social", "18.2%", "#28b9a8"], ["Email", "14.5%", "#e5a52c"],
]

export function AnalyticsDashboard() {
  return <main className="min-h-screen bg-[#f8f8fc] p-4 text-slate-900 md:p-6">
    <div className="mx-auto grid max-w-[1440px] gap-6 lg:grid-cols-[232px_1fr]">
      <aside className="hidden min-h-[calc(100vh-3rem)] rounded-2xl bg-[#17172a] p-4 text-slate-300 lg:flex lg:flex-col">
        <div className="mb-10 flex items-center gap-2 px-2 font-heading text-lg font-bold text-white"><span className="grid size-7 place-items-center rounded-lg bg-violet-500"><Sparkles size={15}/></span>pulse</div>
        <p className="px-3 text-[11px] font-semibold uppercase tracking-[.14em] text-slate-500">Workspace</p>
        <nav className="mt-3 grid gap-1 text-sm"><Nav label="Overview" active/><Nav label="Customers"/><Nav label="Sales"/><Nav label="Campaigns"/><Nav label="Reports"/></nav>
        <p className="mt-8 px-3 text-[11px] font-semibold uppercase tracking-[.14em] text-slate-500">Settings</p>
        <nav className="mt-3 grid gap-1 text-sm"><Nav label="Team members"/><Nav label="Integrations"/></nav>
        <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-xs font-medium text-white">Grow without limits</p><p className="mt-1 text-xs leading-5 text-slate-400">Unlock deeper insights for your team.</p><button className="mt-3 text-xs font-semibold text-violet-300">View plans →</button></div>
      </aside>
      <section className="min-w-0">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-slate-500">Monday, 18 August 2025</p><h1 className="mt-1 font-heading text-3xl font-bold tracking-tight">Good morning, Olivia</h1></div><div className="flex items-center gap-3"><button aria-label="Search" className="grid size-9 place-items-center rounded-lg border bg-white text-slate-500"><Search size={17}/></button><Button><Download size={16}/> Export</Button><div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-violet-300 to-indigo-600 text-xs font-bold text-white">OM</div></div></header>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-heading text-xl font-bold">Overview</h2><p className="mt-1 text-sm text-slate-500">Your performance at a glance.</p></div><button className="flex h-9 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-medium">Last 30 days <ChevronDown size={15}/></button></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metricCards.map((metric) => <Metric key={metric.label} {...metric}/>)}</div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.85fr)]"><RevenueChart/><ChannelChart/></div>
        <div className="mt-6"><OrdersTable/></div>
      </section>
    </div>
  </main>
}

function Nav({ label, active = false }: { label: string; active?: boolean }) { return <a href="#" className={`rounded-lg px-3 py-2.5 ${active ? "bg-violet-500 text-white shadow-sm" : "hover:bg-white/5 hover:text-white"}`}>{label}</a> }
function Metric({ label, value, change, positive }: typeof metricCards[number]) { return <Card><CardContent><p className="text-sm font-medium text-slate-500">{label}</p><div className="mt-3 flex items-end justify-between"><p className="font-heading text-2xl font-bold">{value}</p><span className={`mb-1 flex items-center text-xs font-semibold ${positive ? "text-emerald-600" : "text-rose-600"}`}>{positive ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {change}</span></div><p className="mt-3 text-xs text-slate-400">vs. previous period</p></CardContent></Card> }
function RevenueChart() { const path = "M0 170 C36 153 45 164 74 143 S112 129 140 138 S181 104 212 119 S257 89 289 101 S332 77 359 85 S410 44 443 58 S482 31 520 38"; return <Card><CardContent className="p-5"><div className="flex items-start justify-between"><div><h3 className="font-heading font-bold">Revenue overview</h3><p className="mt-1 text-sm text-slate-500">Revenue generated over time</p></div><button aria-label="More options" className="text-slate-400"><MoreHorizontal size={20}/></button></div><div className="mt-7 flex items-end gap-5"><p className="font-heading text-3xl font-bold">$84,290</p><span className="mb-1 flex items-center text-sm font-semibold text-emerald-600"><ArrowUpRight size={16}/>12.5%</span></div><svg viewBox="0 0 520 220" className="mt-5 h-56 w-full overflow-visible" role="img" aria-label="Revenue trend chart"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#714cf6" stopOpacity=".25"/><stop offset="1" stopColor="#714cf6" stopOpacity="0"/></linearGradient></defs>{[40, 90, 140, 190].map(y => <line key={y} x1="0" x2="520" y1={y} y2={y} stroke="#e8e8f0" strokeDasharray="4 5"/>)}<path d={`${path} L520 220 L0 220Z`} fill="url(#fill)"/><path d={path} fill="none" stroke="#714cf6" strokeWidth="3" strokeLinecap="round"/><circle cx="443" cy="58" r="5" fill="white" stroke="#714cf6" strokeWidth="3"/>{["Jul 20","Jul 25","Jul 30","Aug 4","Aug 9","Aug 14","Aug 18"].map((x,i)=><text key={x} x={i*83} y="216" fill="#94a3b8" fontSize="11">{x}</text>)}</svg></CardContent></Card> }
function ChannelChart() { return <Card><CardContent className="p-5"><div className="flex justify-between"><div><h3 className="font-heading font-bold">Traffic by channel</h3><p className="mt-1 text-sm text-slate-500">Sessions across sources</p></div><button aria-label="More options" className="text-slate-400"><MoreHorizontal size={20}/></button></div><div className="mt-8 flex items-center justify-center"><div className="grid size-44 place-items-center rounded-full" style={{background:"conic-gradient(#6d4aff 0 42.8%, #5596f6 42.8% 67.3%, #28b9a8 67.3% 85.5%, #e5a52c 85.5% 100%)"}}><div className="grid size-28 place-items-center rounded-full bg-white text-center"><b className="font-heading text-2xl">38.4k</b><span className="-mt-5 text-xs text-slate-500">sessions</span></div></div></div><div className="mt-8 grid gap-3">{channels.map(([name, share, color])=><div key={name} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-slate-600"><i className="size-2.5 rounded-full" style={{backgroundColor: color}}/>{name}</span><b>{share}</b></div>)}</div></CardContent></Card> }
function OrdersTable() { return <Card><CardContent className="p-0"><div className="flex items-center justify-between p-5"><div><h3 className="font-heading font-bold">Recent orders</h3><p className="mt-1 text-sm text-slate-500">Your latest customer activity</p></div><button className="text-sm font-semibold text-violet-600">View all</button></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-y bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Product</th><th className="px-4 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Amount</th></tr></thead><tbody>{[["Darlene Robertson","Pro annual plan","Paid","$288.00"],["Cody Fisher","Team monthly plan","Paid","$79.00"],["Esther Howard","Starter monthly plan","Pending","$29.00"]].map(row=><tr key={row[0]} className="border-b last:border-0"><td className="px-5 py-4 font-medium">{row[0]}</td><td className="px-4 py-4 text-slate-500">{row[1]}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row[2] === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{row[2]}</span></td><td className="px-5 py-4 text-right font-semibold">{row[3]}</td></tr>)}</tbody></table></div></CardContent></Card> }
