import * as React from "react"

import { cn } from "@/registry/lib/utils"
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
import { Label } from "@/registry/ui/label"
import { Separator } from "@/registry/ui/separator"
import { Switch } from "@/registry/ui/switch"

const toggles = [
  {
    id: "marketing",
    label: "Marketing emails",
    description: "Receive product news and occasional offers.",
    defaultChecked: false,
  },
  {
    id: "security",
    label: "Security alerts",
    description: "Get notified about new sign-ins and password changes.",
    defaultChecked: true,
  },
]

export function Settings({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16",
        className
      )}
      {...props}
    >
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your account details. This information is private.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" defaultValue="Ada Lovelace" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue="ada@example.com" />
          </div>
          <Separator />
          <div className="grid gap-4">
            {toggles.map((toggle) => (
              <div
                key={toggle.id}
                className="flex items-center justify-between gap-4"
              >
                <div className="grid gap-0.5">
                  <Label htmlFor={toggle.id}>{toggle.label}</Label>
                  <p className="text-muted-foreground text-sm">
                    {toggle.description}
                  </p>
                </div>
                <Switch id={toggle.id} defaultChecked={toggle.defaultChecked} />
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline">Cancel</Button>
          <Button>Save changes</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
