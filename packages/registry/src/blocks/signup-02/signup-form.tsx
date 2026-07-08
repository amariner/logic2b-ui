import * as React from "react"
import { SparklesIcon } from "lucide-react"

import { cn } from "@/registry/lib/utils"
import { Button } from "@/registry/ui/button"
import { Input } from "@/registry/ui/input"
import { Label } from "@/registry/ui/label"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("grid min-h-svh lg:grid-cols-2", className)} {...props}>
      <div className="bg-muted relative hidden lg:flex lg:items-center lg:justify-center">
        <SparklesIcon className="text-muted-foreground/20 size-32" />
      </div>
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <form>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Create your account</h1>
                  <p className="text-muted-foreground text-sm text-balance">
                    Enter your details below to get started
                  </p>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="Ada Lovelace" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required />
                  </div>
                  <Button type="submit" className="w-full">
                    Create account
                  </Button>
                </div>
                <div className="text-center text-sm">
                  Already have an account?{" "}
                  <a href="#" className="underline underline-offset-4">
                    Sign in
                  </a>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
