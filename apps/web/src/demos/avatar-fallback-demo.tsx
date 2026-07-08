import { Avatar, AvatarFallback, AvatarImage } from "@/registry/ui/avatar"

export default function AvatarFallbackDemo() {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-12">
        <AvatarImage src="/does-not-exist.png" alt="Broken source" />
        <AvatarFallback>L2</AvatarFallback>
      </Avatar>
      <Avatar className="size-12">
        <AvatarFallback>UI</AvatarFallback>
      </Avatar>
    </div>
  )
}
