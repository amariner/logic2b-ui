import { Badge } from "@/registry/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/ui/table"

const members = [
  { name: "Olivia Martin", role: "Owner", status: "Active" },
  { name: "Jackson Lee", role: "Member", status: "Active" },
  { name: "Isabella Nguyen", role: "Member", status: "Invited" },
]

export default function TableStatusDemo() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.name}>
            <TableCell className="font-medium">{member.name}</TableCell>
            <TableCell>{member.role}</TableCell>
            <TableCell className="text-right">
              <Badge
                variant={member.status === "Active" ? "secondary" : "outline"}
              >
                {member.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
