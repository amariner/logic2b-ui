import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/ui/table"

const items = [
  { name: "Keyboard", qty: 2, price: "$180.00" },
  { name: "Monitor", qty: 1, price: "$320.00" },
  { name: "Mouse", qty: 3, price: "$150.00" },
]

export default function TableSimpleDemo() {
  return (
    <Table className="w-[360px]">
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead className="text-center">Qty</TableHead>
          <TableHead className="text-right">Price</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.name}>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell className="text-center tabular-nums">
              {item.qty}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {item.price}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
