import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  TOOL_CALL_MARKER,
  isCompletedToolCall,
} from "../scripts/adapters/codex.mjs"

describe("Codex benchmark adapter", () => {
  test("counts each completed tool event once", () => {
    assert.equal(
      isCompletedToolCall({
        type: "item.completed",
        item: { type: "command_execution" },
      }),
      true,
    )
    assert.equal(
      isCompletedToolCall({
        type: "item.completed",
        item: { type: "file_change" },
      }),
      true,
    )
    assert.equal(
      isCompletedToolCall({
        type: "item.started",
        item: { type: "command_execution" },
      }),
      false,
    )
  })

  test("does not count model narration as a tool call", () => {
    assert.equal(
      isCompletedToolCall({
        type: "item.completed",
        item: { type: "agent_message" },
      }),
      false,
    )
    assert.equal(
      isCompletedToolCall({
        type: "item.completed",
        item: { type: "reasoning" },
      }),
      false,
    )
    assert.equal(TOOL_CALL_MARKER, "LOGIC2B_TOOL_CALL")
  })
})
