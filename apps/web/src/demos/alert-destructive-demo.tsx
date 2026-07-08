import { AlertCircle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/registry/ui/alert"

export default function AlertDestructiveDemo() {
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>Unable to process your payment.</AlertTitle>
      <AlertDescription>
        Please verify your billing information and try again.
      </AlertDescription>
    </Alert>
  )
}
