// Hand-authored candidate edits for the reference lifecycle. These helpers are
// fixture inputs, never the behavioral oracle and never product source synthesis.
export const CUSTOM_PATH = "src/components/admin-customers-01/admin-customers.tsx"
export const HOST_PATH = "src/components/starter-page.tsx"
export const THEME_PATH = "src/styles/theme.css"

function once(source: string, before: string, after: string): string {
  if (source.split(before).length !== 2) throw new Error(`Fixture source anchor must occur exactly once: ${before.slice(0, 100)}`)
  return source.replace(before, after)
}

/** First request: a real local column and domain copy in the installed block. */
export function customizeCustomerSource(source: string): string {
  let result = once(source, "  email: string\n", "  email: string\n  accountOwner?: string\n")
  result = once(result, 'title: "Customers", description: "Your customer base, segments and lifetime value."', 'title: "Customer workspace", description: "Your team, your customer relationships."')
  result = once(result, '<TableHead>{text.customer}</TableHead>', '<TableHead>{text.customer}</TableHead><TableHead className="hidden w-24 whitespace-normal sm:table-cell">Account owner</TableHead>')
  result = once(result,
    '{text.orders}: {c.orders} · {text.spent}: {c.spent}</p></TableCell>',
    '{text.orders}: {c.orders} · {text.spent}: {c.spent}</p><p className="text-muted-foreground text-xs sm:hidden">Account owner: {c.accountOwner ?? "Unassigned"}</p></TableCell>')
  return once(result,
    '</TableCell>\n            <TableCell className="hidden tabular-nums sm:table-cell">',
    '</TableCell>\n            <TableCell className="hidden whitespace-normal break-words sm:table-cell">{c.accountOwner ?? "Unassigned"}</TableCell>\n            <TableCell className="hidden tabular-nums sm:table-cell">')
}

/** Second request: segment filtering combines with the existing search/sort. */
export function addSegmentFilter(source: string): string {
  let result = once(source,
    '  const [query, setQuery] = React.useState(defaultQuery)\n',
    '  const [query, setQuery] = React.useState(defaultQuery)\n  const [segment, setSegment] = React.useState<Segment | "all">("all")\n')
  result = once(result, 'customers.filter(c => `${c.name}\\n${c.email}`.toLocaleLowerCase().includes(q))', 'customers.filter(c => (segment === "all" || c.segment === segment) && `${c.name}\\n${c.email}`.toLocaleLowerCase().includes(q))')
  return once(result,
    '        <div className="relative"><SearchIcon',
    '        <label className="flex min-w-0 flex-col gap-1 text-sm">Customer segment<select aria-label="Customer segment" className="min-h-11 max-w-full rounded border bg-background px-2" value={segment} disabled={!ready} onChange={event => setSegment(event.target.value as Segment | "all")}><option value="all">All segments</option><option value="active">Active</option><option value="new">New</option><option value="churned">Churned</option></select></label>\n        <div className="relative"><SearchIcon')
}

export function customizeHost(source: string): string {
  let result = once(source, 'id: "zoe", name: "Zoe Chen",', 'id: "zoe", accountOwner: "Lin Park", name: "Zoe Chen",')
  result = once(result, 'id: "alex", name: "Alex Morgan",', 'id: "alex", accountOwner: "Zara Ruiz", name: "Alex Morgan",')
  result = once(result, 'id: "mina", name: "Mina Patel",', 'id: "mina", accountOwner: "Noah Reed", name: "Mina Patel",')
  return once(result, 'id: `created-${nextId.current++}`, name: "",', 'id: `created-${nextId.current++}`, accountOwner: "Avery Stone", name: "",')
}

export function customizeTheme(source: string): string {
  if (source.includes("Customer workspace brand override")) throw new Error("Fixture brand override already exists")
  return source + '\n/* Customer workspace brand override: preserve during agent edits and updates. */\n:root:not(.dark) {\n  --primary: #075985;\n  --primary-foreground: #ffffff;\n}\n'
}

/** Intentionally overlaps rc.18's real upstream table-width fix. */
export function conflictCustomerSource(source: string): string {
  return once(source, '<Table className="table-fixed">', '<Table className="table-fixed caption-bottom">')
}
