import * as React from "react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/registry/ui/accordion"
import { Button } from "@/registry/ui/button"

export default function AccordionControlledDemo() {
  const [value, setValue] = React.useState("item-1")

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setValue("item-1")}>
          Open first
        </Button>
        <Button size="sm" variant="outline" onClick={() => setValue("item-2")}>
          Open second
        </Button>
      </div>
      <Accordion
        type="single"
        collapsible
        value={value}
        onValueChange={setValue}
        className="w-full"
      >
        <AccordionItem value="item-1">
          <AccordionTrigger>First section</AccordionTrigger>
          <AccordionContent>
            The open item is driven by external state.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Second section</AccordionTrigger>
          <AccordionContent>
            Use the buttons above to control which panel is expanded.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
