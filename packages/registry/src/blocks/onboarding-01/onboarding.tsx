"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"

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
import { Progress } from "@/registry/ui/progress"

const steps = [
  { title: "Account", description: "Tell us who you are." },
  { title: "Workspace", description: "Name your workspace." },
  { title: "Invite", description: "Bring your team along." },
]

export function Onboarding({ className, ...props }: React.ComponentProps<"div">) {
  const [step, setStep] = React.useState(0)
  const isLast = step === steps.length - 1
  const progress = ((step + 1) / steps.length) * 100
  const current = steps[step]

  return (
    <div
      className={cn("mx-auto flex w-full max-w-md flex-col px-6 py-16", className)}
      {...props}
    >
      <Card>
        <CardHeader>
          <div className="mb-4 flex items-center justify-between">
            {steps.map((s, index) => {
              const done = index < step
              const active = index === step
              return (
                <React.Fragment key={s.title}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                        done && "border-primary bg-primary text-primary-foreground",
                        active && "border-primary text-foreground",
                        !done && !active && "text-muted-foreground"
                      )}
                    >
                      {done ? <CheckIcon className="size-4" /> : index + 1}
                    </div>
                    <span
                      className={cn(
                        "text-xs",
                        active ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {s.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="mx-2 mb-5 h-px flex-1 bg-border" />
                  )}
                </React.Fragment>
              )
            })}
          </div>
          <Progress value={progress} className="h-1.5" />
          <CardTitle className="pt-4">{current.title}</CardTitle>
          <CardDescription>{current.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {step === 0 && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" placeholder="Ada Lovelace" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="ada@example.com" />
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="workspace">Workspace name</Label>
                <Input id="workspace" placeholder="Acme Inc." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="url">Workspace URL</Label>
                <Input id="url" placeholder="acme" />
              </div>
            </>
          )}
          {step === 2 && (
            <div className="grid gap-2">
              <Label htmlFor="invite">Invite teammates</Label>
              <Input id="invite" type="email" placeholder="teammate@example.com" />
              <p className="text-muted-foreground text-xs">
                Separate multiple emails with a comma. You can skip this and do it
                later.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            Back
          </Button>
          <Button
            onClick={() => {
              if (!isLast) setStep((s) => s + 1)
            }}
          >
            {isLast ? "Finish" : "Continue"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
