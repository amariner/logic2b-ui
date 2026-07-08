import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/registry/ui/accordion"

export default function AccordionMultipleDemo() {
  return (
    <Accordion type="multiple" className="w-full">
      <AccordionItem value="shipping">
        <AccordionTrigger>How long does shipping take?</AccordionTrigger>
        <AccordionContent>
          Orders are processed within 24 hours and typically arrive in 3–5
          business days.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="returns">
        <AccordionTrigger>What is your return policy?</AccordionTrigger>
        <AccordionContent>
          You can return any unused item within 30 days for a full refund.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="support">
        <AccordionTrigger>How do I contact support?</AccordionTrigger>
        <AccordionContent>
          Reach us any time from the help menu — multiple sections can stay
          open at once.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
