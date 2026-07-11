import * as React from "react"

import { cn } from "@/registry/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/registry/ui/avatar"
import { Button } from "@/registry/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/ui/card"
import { Input } from "@/registry/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/ui/select"
import { Separator } from "@/registry/ui/separator"

const members = [
  {
    name: "Sofia Davis",
    email: "sofia@example.com",
    role: "owner",
    avatar: "https://github.com/shadcn.png",
    initials: "SD",
  },
  {
    name: "Jackson Lee",
    email: "jackson@example.com",
    role: "member",
    avatar: "",
    initials: "JL",
  },
  {
    name: "Isabella Nguyen",
    email: "isabella@example.com",
    role: "member",
    avatar: "",
    initials: "IN",
  },
]

const roles = [
  { value: "owner", label: "Owner" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
]

export function TeamMembers({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-xl flex-col px-6 py-16",
        className
      )}
      {...props}
    >
      <Card>
        <CardHeader>
          <CardTitle>Team members</CardTitle>
          <CardDescription>
            Invite your team members to collaborate.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {members.map((member) => (
            <div
              key={member.email}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  {member.avatar ? (
                    <AvatarImage src={member.avatar} alt={member.name} />
                  ) : null}
                  <AvatarFallback>{member.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium leading-none">
                    {member.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {member.email}
                  </p>
                </div>
              </div>
              <Select defaultValue={member.role}>
                <SelectTrigger
                  className="w-[110px]"
                  aria-label={`Role for ${member.name}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <Separator />
          <div className="grid gap-2">
            <p className="text-sm font-medium">Invite by email</p>
            <div className="flex gap-2">
              <Input type="email" placeholder="email@example.com" />
              <Button>Invite</Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Members can view and edit shared projects.
        </CardFooter>
      </Card>
    </div>
  )
}
