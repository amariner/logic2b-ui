import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { DEFAULT_CONFIG, encodePreset } from "../src/index.ts"
import {
  oklchToHex8,
  portableGlobalTokens,
  portableModeTokens,
  portableTokenBundle,
  tokensStudioBundle,
} from "../src/export.ts"

describe("portable token export", () => {
  test("emits a lossless DTCG-shaped light/dark bundle", () => {
    const bundle = portableTokenBundle(DEFAULT_CONFIG)
    assert.equal(bundle.$extensions.logic2b.modes.join(","), "light,dark")
    assert.deepEqual(bundle.light.background, {
      $type: "color",
      $value: "oklch(1 0 0)",
    })
    assert.deepEqual(bundle.global.radius, {
      $type: "dimension",
      $value: { value: 0.625, unit: "rem" },
    })
    assert.equal(bundle.light.radius, undefined)
    assert.equal(bundle.dark.radius, undefined)
    assert.equal(bundle.global["type-leading-base"].$type, "number")
  })

  test("derives deterministic #RRGGBBAA native colors", () => {
    assert.equal(oklchToHex8("oklch(1 0 0)"), "#FFFFFFFF")
    assert.equal(oklchToHex8("oklch(0 0 0 / 10%)"), "#0000001A")
    const native = portableModeTokens(DEFAULT_CONFIG, "dark", {
      nativeColors: true,
    })
    assert.match(String(native.background.$value), /^#[0-9A-F]{8}$/)
    assert.equal(native.background.$type, "color")
  })

  test("emits a Tokens Studio collection with light and dark variable modes", () => {
    const bundle = tokensStudioBundle(DEFAULT_CONFIG)

    assert.deepEqual(bundle.$metadata.tokenSetOrder, ["global", "light", "dark"])
    assert.deepEqual(bundle.global, portableGlobalTokens(DEFAULT_CONFIG))
    assert.deepEqual(
      bundle.light,
      portableModeTokens(DEFAULT_CONFIG, "light", { includeGlobals: false }),
    )
    assert.deepEqual(
      bundle.dark,
      portableModeTokens(DEFAULT_CONFIG, "dark", { includeGlobals: false }),
    )
    assert.deepEqual(
      bundle.$themes.map(({ name, group, selectedTokenSets }) => ({
        name,
        group,
        selectedTokenSets,
      })),
      [
        {
          name: "Light",
          group: "Logic2b",
          selectedTokenSets: {
            global: "enabled",
            light: "enabled",
            dark: "disabled",
          },
        },
        {
          name: "Dark",
          group: "Logic2b",
          selectedTokenSets: {
            global: "enabled",
            light: "disabled",
            dark: "enabled",
          },
        },
      ],
    )
    assert.equal(new Set(bundle.$themes.map(({ id }) => id)).size, 2)
    assert.ok(
      bundle.$themes.every(({ id }) =>
        id.startsWith(`logic2b:${encodePreset(DEFAULT_CONFIG)}:`),
      ),
    )
    assert.equal(Object.hasOwn(bundle, "$schema"), false)
    assert.equal(Object.hasOwn(bundle, "$extensions"), false)
  })

  test("rejects values that are not oklch colors", () => {
    assert.throws(() => oklchToHex8("#fff"), /non-oklch color/)
  })
})
