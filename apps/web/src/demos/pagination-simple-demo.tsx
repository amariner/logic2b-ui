import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/registry/ui/pagination"

export default function PaginationSimpleDemo() {
  return (
    <Pagination>
      <PaginationContent className="w-full justify-between">
        <PaginationItem>
          <PaginationPrevious href="#" />
        </PaginationItem>
        <span className="text-muted-foreground text-sm">Page 2 of 10</span>
        <PaginationItem>
          <PaginationNext href="#" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
