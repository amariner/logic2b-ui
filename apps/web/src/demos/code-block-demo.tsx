import { CodeBlock } from "@/registry/ui/code-block"

export default function CodeBlockDemo() {
  return (
    <CodeBlock
      language="bash"
      code={`npx logic2b@next add code-block`}
      className="w-full max-w-md"
    />
  )
}
