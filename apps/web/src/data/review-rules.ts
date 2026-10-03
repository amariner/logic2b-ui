import { REVIEW_RULES } from "@logic2b/review"

// The public ids, categories and descriptions come from the executed rules.
export const reviewRules = REVIEW_RULES
const cell = (value: string) => value.replaceAll("|", "\\|").replace(/\s+/g, " ").trim()
export function reviewRulesMarkdown(): string {
  return [
    "| Rule | Category | Detection |",
    "| --- | --- | --- |",
    ...reviewRules.map((rule) => `| [${rule.id}](${rule.docs}) | ${rule.category} | ${cell(rule.description)} |`),
  ].join("\n")
}
