# 08 — User preferences: density, contrast, motion, text size

**Status:** proposed · **Lane:** guarantee quality · **Target:** v1.1 ·
**Depends on:** nothing; extends the `@logic2b/tokens` codec.

## Why (the user)

Themes today are about the brand: color, radius, type, icons. The person on
the other side has preferences the brand does not decide for them: they may
need larger text, higher contrast, less motion, or a denser screen because
they work in a data table all day. Operating systems expose some of these
(`prefers-reduced-motion`, `prefers-contrast`, `prefers-color-scheme`) and
apps ignore most of them. Making preferences a first-class axis of the token
system means every block, chart and generated app respects them without the
agent having to remember.

## What ships

- Two new preset axes in `@logic2b/tokens`: `density`
  (`compact | comfortable | spacious`) and `contrast` (`standard | high`).
  The id grows from 12 to 14 fields; old ids decode with defaults.
- Runtime: `use-preferences` hook (`registry:hook`) and a `preferences-menu`
  component; a **Preferences** section added to `settings-01`.
- Studio (`/create`): Density and Contrast controls with live preview; the
  contrast audit runs on the high-contrast set too.
- MCP/CLI: `apply_preset`, `export_tokens`, `contrast_audit`, `lint_theme`,
  `decode_preset` and `init --preset` understand the axes.
- Docs: `/docs/preferences` and an update to `/docs/theming`.

## Design

### Tokens

- **Density** scales Tailwind v4's `--spacing` base and the control-height
  tokens the registry uses (`--control-h-sm/md/lg`, introduced here and
  adopted by `Button`, `Input`, `Select`, `Item`, table rows):
  compact `0.225rem`, comfortable `0.25rem` (today), spacious `0.28rem`.
  Applied via `[data-density="compact"]` on `<html>`, so it can be a user
  override at runtime and a preset default at build time.
- **Contrast** swaps the muted/border/ring ladder for a high-contrast ladder
  that the existing WCAG 2.2 + APCA audit verifies at AAA for body and AA for
  muted text, in both modes. Applied via `[data-contrast="high"]`; it also
  responds to `@media (prefers-contrast: more)` by default.
- **Motion** is already covered by the motion presets and
  `prefers-reduced-motion`; the hook exposes an override
  (`[data-motion="reduced"]`) that the presets honor alongside the media
  query.
- **Text size** is a runtime-only preference (`[data-text="lg"]` → `html {
  font-size: 112.5% }`) because it must follow the person, not the brand; the
  typeset studio's readability audit is run at both sizes.

### Runtime

```ts
const { density, contrast, motion, text, colorScheme, set, reset } = usePreferences()
```

Reads system media queries for initial values, persists overrides in
`localStorage` (namespaced, try/catch, no SSR access), writes the `data-*`
attributes and `.dark` on `<html>`, and exposes a `<PreferencesMenu />`
(a `DropdownMenu` with radio groups) for headers and the settings block.
No network, no cookies.

### Codec

`ThemeConfig` gains `density` and `contrast` at the end; `encodePreset`
omits trailing defaults so ids only grow when a non-default value is chosen;
`decodePreset` keeps accepting 6-, 11- and 12-field ids.

### Where it lives

| Piece | Path |
| --- | --- |
| Codec, CSS emitters, audit | `packages/tokens/src/index.ts`, `contrast.ts`, `lint.ts`, `export.ts` |
| Control-height tokens | `packages/registry/src/theme.css`, adopting components under `packages/registry/src/ui/` |
| Hook + component | `packages/registry/src/hooks/use-preferences.ts`, `packages/registry/src/ui/preferences-menu.tsx`, items in `packages/registry/items/misc.ts` |
| Settings block | `packages/registry/src/blocks/settings-01/` |
| Studio | `apps/web/src/pages/create.astro`, rail components |
| Docs | `apps/web/src/content/docs/preferences.mdx`, `theming.mdx` (+ `docs-es`) |
| Style Dictionary exports | `packages/tokens/scripts`, `apps/web/public/tokens/default/` |

## Implementation steps

1. Codec fields + decode compatibility tests against every historical id
   shape in the test corpus.
2. Control-height tokens in `theme.css` and adoption in the components that
   size controls; visual baselines must not change at `comfortable`.
3. High-contrast ladder generated from the base scale; contrast audit
   extended; `lint_theme` checks the ladder when present.
4. Hook + `preferences-menu` + settings block section, with a11y contracts.
5. Studio controls, CSS export, `AGENTS.md` note ("respect
   `data-density`/`data-contrast`; never hardcode heights").
6. MCP/CLI plumbing (mostly free once the codec and emitters know the axes);
   `export_tokens` and the public Style Dictionary artifacts add the
   high-contrast set.
7. Docs and visual/axe coverage at compact + high contrast for the block
   set.

## Gates

- Codec tests (old ids decode; canonical re-encode is stable).
- Contrast audit: high-contrast set passes AAA body / AA muted in both modes.
- Visual: unchanged baselines at defaults; new baselines for compact and
  high-contrast on blocks and playgrounds.
- Budgets: portable token exports stay within the 32 KiB budget or the
  budget is consciously raised in the same PR.
- `test:scaffolds` + `test:scaffold` with a preset that sets both axes.

## Out of scope

- Per-user preference sync across devices (that is the consumer's backend).
- Font-family choices at runtime (typeset stays a brand decision).
