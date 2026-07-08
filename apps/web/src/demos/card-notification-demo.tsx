import { Bell } from "lucide-react"

import { Button } from "@/registry/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/ui/card"

export default function CardNotificationDemo() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-4" />
          Notifications
        </CardTitle>
        <CardDescription>You have 3 unread messages.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex items-start gap-3 rounded-md border p-3">
          <span className="bg-primary mt-1 size-2 shrink-0 rounded-full" />
          <div className="grid gap-0.5">
            <p className="text-sm font-medium">Your build is ready</p>
            <p className="text-muted-foreground text-xs">2 minutes ago</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">
          Mark all as read
        </Button>
      </CardFooter>
    </Card>
  )
}
