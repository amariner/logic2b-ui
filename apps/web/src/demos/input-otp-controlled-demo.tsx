"use client"

import * as React from "react"

import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/registry/ui/input-otp"

export default function InputOTPControlledDemo() {
  const [value, setValue] = React.useState("")

  return (
    <div className="flex flex-col items-center gap-2">
      <InputOTP maxLength={4} value={value} onChange={setValue}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
      <div className="text-muted-foreground text-sm">
        {value === "" ? "Enter your PIN" : `You entered: ${value}`}
      </div>
    </div>
  )
}
