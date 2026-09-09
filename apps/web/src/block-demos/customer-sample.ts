import type { Customer } from "@/registry/blocks/admin-customers-01/admin-customers"

export const sampleCustomers: Customer[] = [
  { name: "Olivia Martin", email: "olivia@example.com", orders: 24, spent: "$3,120", lastOrder: "2026-07-14", segment: "active" },
  { name: "Jackson Lee", email: "jackson@example.com", orders: 2, spent: "$168", lastOrder: "2026-07-10", segment: "new" },
  { name: "Isabella Nguyen", email: "isabella@example.com", orders: 41, spent: "$6,540", lastOrder: "2026-07-13", segment: "active" },
  { name: "William Kim", email: "william@example.com", orders: 8, spent: "$742", lastOrder: "2026-02-18", segment: "churned" },
  { name: "Sofia Davis", email: "sofia@example.com", orders: 1, spent: "$18", lastOrder: "2026-07-12", segment: "new" },
  { name: "Liam Johnson", email: "liam@example.com", orders: 17, spent: "$2,410", lastOrder: "2026-07-09", segment: "active" },
]

