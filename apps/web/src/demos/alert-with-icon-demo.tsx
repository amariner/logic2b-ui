import { Terminal } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/registry/ui/alert"

export default function AlertWithIconDemo() {
  return (
    <Alert>
      <Terminal />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can add components to your app using the CLI.
      </AlertDescription>
    </Alert>
  )
}
