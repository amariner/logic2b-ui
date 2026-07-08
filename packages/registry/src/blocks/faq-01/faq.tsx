import * as React from "react"

import { cn } from "@/registry/lib/utils"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/registry/ui/accordion"

const faqs = [
  {
    q: "Do I own the code?",
    a: "Yes. Components are copied into your project — no runtime dependency, no lock-in. Edit them however you like.",
  },
  {
    q: "Which frameworks are supported?",
    a: "Anything that runs React and Tailwind: Next.js, Vite, Astro, Remix, TanStack Start and more. The CLI writes files into your project structure.",
  },
  {
    q: "How do updates work?",
    a: "Run the CLI's diff command to see what changed upstream, then re-add a component with --overwrite when you want the update.",
  },
  {
    q: "Is it free?",
    a: "Yes, it's open source under the MIT license. Use it in personal and commercial projects.",
  },
]

export function Faq({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-2xl px-6 py-16", className)}
      {...props}
    >
      <div className="mb-8 text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight">
          Frequently asked questions
        </h2>
        <p className="text-muted-foreground mt-3">
          Everything you need to know. Can&apos;t find an answer?{" "}
          <a href="#" className="text-foreground underline underline-offset-4">
            Get in touch
          </a>
          .
        </p>
      </div>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, i) => (
          <AccordionItem key={faq.q} value={`item-${i}`}>
            <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
