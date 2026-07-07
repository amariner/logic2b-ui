import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/ui/table"

const rows = [
  { document: "Cover page", type: "Cover page", target: "18", status: "Done" },
  { document: "Table of contents", type: "Table of contents", target: "29", status: "Done" },
  { document: "Executive summary", type: "Narrative", target: "10", status: "In Progress" },
  { document: "Technical approach", type: "Narrative", target: "27", status: "In Progress" },
  { document: "Design", type: "Narrative", target: "2", status: "In Progress" },
]

export function DataTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>Sections due for review this cycle.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Section</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Target</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.document}>
                <TableCell className="font-medium">{row.document}</TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell className="text-right">{row.target}</TableCell>
                <TableCell className="text-right">{row.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
