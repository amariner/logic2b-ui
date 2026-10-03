import { resolve, dirname, basename } from "node:path"
import { fileURLToPath } from "node:url"
import { reviewUi, REVIEW_RULES, type ReviewRequest } from "@logic2b/review"
import { readBoundedFile } from "./evaluation-v2.mts"

/** Advisory intervention evidence, never an acceptance verdict or v1 score. */
export function staticReviewEvidence(request: ReviewRequest) {
  return {
    schemaVersion: 1 as const,
    kind: "advisory-static-review" as const,
    acceptanceEvidence: false as const,
    ruleIds: REVIEW_RULES.map((rule) => rule.id),
    review: reviewUi(request),
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  if (args.length !== 1 || args[0]!.startsWith("--")) {
    throw new Error("Usage: pnpm --dir benchmarks/agents review <review-request.json>")
  }
  const path = resolve(args[0]!)
  const input = await readBoundedFile(dirname(path), basename(path), 2 * 1024 * 1024)
  let request: ReviewRequest
  try { request = JSON.parse(input.toString("utf8")) as ReviewRequest }
  catch { throw new Error("Review request must contain valid JSON.") }
  console.log(JSON.stringify(staticReviewEvidence(request), null, 2))
}
