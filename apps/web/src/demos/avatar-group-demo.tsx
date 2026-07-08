import { Avatar, AvatarFallback, AvatarImage } from "@/registry/ui/avatar"

export default function AvatarGroupDemo() {
  return (
    <div className="flex -space-x-2">
      <Avatar className="ring-background ring-2">
        <AvatarImage src="https://github.com/vercel.png" alt="@vercel" />
        <AvatarFallback>VC</AvatarFallback>
      </Avatar>
      <Avatar className="ring-background ring-2">
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
      <Avatar className="ring-background ring-2">
        <AvatarFallback>CD</AvatarFallback>
      </Avatar>
      <Avatar className="ring-background ring-2">
        <AvatarFallback>+3</AvatarFallback>
      </Avatar>
    </div>
  )
}
