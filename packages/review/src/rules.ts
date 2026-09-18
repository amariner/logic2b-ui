import type { RuleId } from "./contract.ts"
export const RULES: Readonly<Record<RuleId, { scope: "tokens" | "a11y"; title: string; docs: string; bad: string; good: string }>> = {
  "L2B-TOK-001": { scope: "tokens", title: "Use semantic color tokens when the project enables this policy", docs: "https://ui.logic2b.com/docs/review#l2b-tok-001", bad: '<div className="text-red-500" />', good: '<div className="text-destructive" />' },
  "L2B-A11Y-001": { scope: "a11y", title: "Name dialogs within a resolved label context", docs: "https://ui.logic2b.com/docs/review#l2b-a11y-001", bad: '<dialog open />', good: '<dialog aria-label="Edit customer" open />' },
  "L2B-A11Y-002": { scope: "a11y", title: "Associate controls with an accessible name", docs: "https://ui.logic2b.com/docs/review#l2b-a11y-002", bad: '<input />', good: '<label>Customer name<input /></label>' },
  "L2B-A11Y-003": { scope: "a11y", title: "Name buttons, including icon-only actions", docs: "https://ui.logic2b.com/docs/review#l2b-a11y-003", bad: '<button><svg aria-hidden="true" /></button>', good: '<button aria-label="Remove customer"><svg aria-hidden="true" /></button>' },
}
