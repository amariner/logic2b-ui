import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { ACCESSIBILITY_CONTRACTS } from "../accessibility.ts"
import { registry } from "../registry.ts"

describe("accessibility contracts", () => {
  const uiItems = registry.filter((item) => item.type === "registry:ui")
  const nonUiItems = registry.filter((item) => item.type !== "registry:ui")

  test("cover every UI item and only UI items", () => {
    assert.equal(uiItems.length, 71)
    assert.equal(Object.keys(ACCESSIBILITY_CONTRACTS).length, uiItems.length)
    assert.deepEqual(
      uiItems.map((item) => item.name).sort(),
      Object.keys(ACCESSIBILITY_CONTRACTS).sort(),
    )
    assert.ok(uiItems.every((item) => item.accessibility))
    assert.ok(nonUiItems.every((item) => !item.accessibility))
  })

  test("keep every contract actionable", () => {
    for (const item of uiItems) {
      const contract = item.accessibility
      assert.ok(contract, `${item.name} should expose a contract`)
      assert.ok(contract.pattern.trim(), `${item.name} should name its pattern`)
      assert.ok(contract.aria.length > 0, `${item.name} should document semantics`)
      assert.ok(
        contract.consumer.length > 0,
        `${item.name} should document consumer responsibilities`,
      )
      for (const interaction of contract.keyboard) {
        assert.ok(interaction.keys.length > 0, `${item.name} has an empty key set`)
        assert.ok(interaction.action.trim(), `${item.name} has an empty key action`)
      }
    }
  })

  test("publish known gaps instead of implying full support", () => {
    assert.match(
      ACCESSIBILITY_CONTRACTS["color-picker"].limitations?.join(" ") ?? "",
      /pointer-only/i,
    )
    assert.match(
      ACCESSIBILITY_CONTRACTS.parallax.limitations?.join(" ") ?? "",
      /reduced-motion/i,
    )
  })
})
