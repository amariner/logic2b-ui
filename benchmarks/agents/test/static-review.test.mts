import assert from "node:assert/strict"
import test from "node:test"
import { REVIEW_RULES } from "@logic2b/review"
import { staticReviewEvidence } from "../scripts/static-review.mts"

test("benchmark uses shared rule ids without awarding independent acceptance", () => {
  const result = staticReviewEvidence({schemaVersion: 1, files: [{path: "view.tsx", content: "export const View = () => <button />"}]})
  assert.deepEqual(result.ruleIds, REVIEW_RULES.map((rule) => rule.id))
  assert.equal(result.acceptanceEvidence, false)
  assert.equal(result.review.findings[0]?.rule, "L2B-A11Y-003")
  assert.equal("score" in result, false)
  assert.equal("success" in result, false)
})

test("unknown wrappers remain unknown in benchmark evidence", () => {
  const result = staticReviewEvidence({schemaVersion: 1, files: [{path: "view.tsx", content: "export const View = () => <Button />"}]})
  assert.equal(result.review.summary.errors, 0)
  assert.ok(result.review.unknowns.length > 0)
})
