import { createHash } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import StyleDictionary from "style-dictionary"
import { formats, transformGroups } from "style-dictionary/enums"

import {
  DEFAULT_CONFIG,
  decodePreset,
  encodePreset,
  type Mode,
  type ThemeConfig,
} from "../src/index.ts"
import {
  portableGlobalTokens,
  portableModeTokens,
  portableTokenBundle,
  type PortableTokenSet,
} from "../src/export.ts"

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const defaultOut = resolve(packageRoot, "../../apps/web/public/tokens/default")

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const requestedPreset = argument("--preset")
const config: ThemeConfig = requestedPreset
  ? (decodePreset(requestedPreset) ?? (() => {
      throw new Error(`Invalid logic2b preset id "${requestedPreset}".`)
    })())
  : DEFAULT_CONFIG
const preset = encodePreset(config)
const outDir = resolve(argument("--out-dir") ?? defaultOut)

async function formatMode(
  name: string,
  tokens: PortableTokenSet,
  transformGroup: string,
  format: string,
  destination: string,
  options: Record<string, unknown> = {},
): Promise<string> {
  const dictionary = new StyleDictionary({
    usesDtcg: true,
    tokens,
    platforms: {
      [name]: {
        transformGroup,
        files: [
          {
            destination,
            format,
            options: { showFileHeader: false, ...options },
          },
        ],
      },
    },
  })
  const output = await dictionary.formatPlatform(name)
  if (output.length !== 1 || typeof output[0].output !== "string") {
    throw new Error(`Style Dictionary did not emit ${name}/${destination}.`)
  }
  return output[0].output
}

async function css(mode: Mode): Promise<string> {
  return formatMode(
    `css-${mode}`,
    portableModeTokens(config, mode),
    transformGroups.css,
    formats.cssVariables,
    `${mode}.css`,
    { selector: mode === "light" ? ":root" : ".dark", sort: "name" },
  )
}

async function native(
  mode: Mode,
  platform: "android" | "ios",
): Promise<string> {
  const tokens = portableModeTokens(config, mode, { nativeColors: true })
  const globals = portableGlobalTokens(config)
  const colorAndRadius = Object.fromEntries(
    Object.entries({ ...globals, ...tokens }).filter(
      ([name, value]) => value.$type === "color" || name === "radius",
    ),
  )
  return platform === "android"
    ? formatMode(
        `android-${mode}`,
        colorAndRadius,
        transformGroups.android,
        formats.androidResources,
        `logic2b_${mode}.xml`,
      )
    : formatMode(
        `ios-${mode}`,
        colorAndRadius,
        transformGroups.iosSwift,
        formats.iosSwiftClassSwift,
        `Logic2b${mode === "light" ? "Light" : "Dark"}Tokens.swift`,
        { className: `Logic2b${mode === "light" ? "Light" : "Dark"}Tokens` },
      )
}

const [lightCss, darkCss, androidLight, androidDark, iosLight, iosDark] =
  await Promise.all([
    css("light"),
    css("dark"),
    native("light", "android"),
    native("dark", "android"),
    native("light", "ios"),
    native("dark", "ios"),
  ])

const artifacts = new Map<string, string>([
  ["logic2b.tokens.json", `${JSON.stringify(portableTokenBundle(config), null, 2)}\n`],
  ["logic2b.css", `${lightCss.trim()}\n\n${darkCss.trim()}\n`],
  ["android/values/logic2b_tokens.xml", androidLight],
  ["android/values-night/logic2b_tokens.xml", androidDark],
  ["ios/Logic2bLightTokens.swift", iosLight],
  ["ios/Logic2bDarkTokens.swift", iosDark],
])

for (const [path, content] of artifacts) {
  const target = resolve(outDir, path)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, content)
}

const integrity = Object.fromEntries(
  [...artifacts].map(([path, content]) => [
    path,
    `sha256-${createHash("sha256").update(content).digest("base64")}`,
  ]),
)
await writeFile(
  resolve(outDir, "manifest.json"),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      preset,
      generator: "style-dictionary@5.5.2",
      files: integrity,
      notes: [
        "CSS preserves the source oklch values.",
        "Native colors are deterministic, gamut-clamped sRGB conversions of the same semantic tokens.",
        "iOS and Android receive separate light/dark resources; CSS font stacks remain in the DTCG and web artifacts because native font registration is application-specific.",
      ],
    },
    null,
    2,
  )}\n`,
)

console.log(
  `✓ Style Dictionary exports: ${artifacts.size} files for preset ${preset} → ${outDir}`,
)
