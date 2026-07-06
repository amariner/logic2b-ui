import { Avatar, AvatarFallback, AvatarImage } from "@/registry/ui/avatar"

export default function AvatarDemo() {
  return (
    <div className="flex justify-center gap-3">
      <Avatar>
        <AvatarImage src="https://github.com/vercel.png" alt="@logic2b" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>L2</AvatarFallback>
      </Avatar>
    </div>
  )
}
