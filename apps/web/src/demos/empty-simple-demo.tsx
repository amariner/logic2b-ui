import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/registry/ui/empty"

export default function EmptySimpleDemo() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>404 — Not Found</EmptyTitle>
        <EmptyDescription>
          The page you are looking for does not exist. <a href="#">Go home</a>.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
