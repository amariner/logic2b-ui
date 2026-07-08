import * as React from "react"

import { cn } from "@/registry/lib/utils"
import { Button } from "@/registry/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/ui/card"
import { Input } from "@/registry/ui/input"
import { Label } from "@/registry/ui/label"
import { Textarea } from "@/registry/ui/textarea"

export function ContactForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-svh items-center justify-center p-6 md:p-10",
        className
      )}
      {...props}
    >
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Get in touch</CardTitle>
          <CardDescription>
            Tell us what you&apos;re building and we&apos;ll get back to you
            within one business day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="first-name">First name</Label>
                  <Input id="first-name" placeholder="Ada" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="last-name">Last name</Label>
                  <Input id="last-name" placeholder="Lovelace" required />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ada@example.com"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="What can we help you with?"
                  className="min-h-28"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Send message
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
