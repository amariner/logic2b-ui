import type { RegistryItem } from "../types.ts"

/**
 * The logic2b design system, distributed. This is what makes an installed
 * logic2b component look like logic2b and not stock shadcn: the oklch
 * monochrome token ladder, chart palette, radius and the Space Grotesk / Inter
 * font wiring from DESIGN.md.
 *
 * Shipped two ways for maximum interop:
 *  - `files: [theme.css]` — a complete, drop-in stylesheet the logic2b CLI
 *    writes into the project (fonts + tokens + @theme inline + base layer).
 *  - `cssVars` / `css` — the same values in the shadcn registry-item shape, so
 *    shadcn-speaking tools can merge them into an existing globals.css.
 */
export const items: RegistryItem[] = [
  {
    name: "theme",
    type: "registry:style",
    title: "logic2b theme",
    description:
      "The logic2b design system: monochrome oklch token ladder (light + dark), the 5-stop chart palette, 0.625rem radius, and Space Grotesk / Inter font wiring. Install this once so every component renders as logic2b, not stock shadcn.",
    dependencies: [
      "tw-animate-css",
      "@fontsource-variable/inter",
      "@fontsource-variable/space-grotesk",
    ],
    files: [{ path: "src/theme.css", type: "registry:style" }],
    cssVars: {
      theme: {
        "font-sans":
          '"Inter Variable", ui-sans-serif, system-ui, sans-serif',
        "font-heading":
          '"Space Grotesk Variable", "Inter Variable", ui-sans-serif, system-ui, sans-serif',
        "font-mono":
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        radius: "0.625rem",
      },
      light: {
        background: "oklch(1 0 0)",
        foreground: "oklch(0.145 0 0)",
        card: "oklch(1 0 0)",
        "card-foreground": "oklch(0.145 0 0)",
        popover: "oklch(1 0 0)",
        "popover-foreground": "oklch(0.145 0 0)",
        primary: "oklch(0.205 0 0)",
        "primary-foreground": "oklch(0.985 0 0)",
        secondary: "oklch(0.97 0 0)",
        "secondary-foreground": "oklch(0.205 0 0)",
        muted: "oklch(0.97 0 0)",
        "muted-foreground": "oklch(0.556 0 0)",
        accent: "oklch(0.97 0 0)",
        "accent-foreground": "oklch(0.205 0 0)",
        destructive: "oklch(0.577 0.245 27.325)",
        "destructive-foreground": "oklch(0.985 0 0)",
        border: "oklch(0.922 0 0)",
        input: "oklch(0.922 0 0)",
        ring: "oklch(0.708 0 0)",
        "chart-1": "oklch(0.646 0.222 41.116)",
        "chart-2": "oklch(0.6 0.118 184.704)",
        "chart-3": "oklch(0.398 0.07 227.392)",
        "chart-4": "oklch(0.828 0.189 84.429)",
        "chart-5": "oklch(0.769 0.188 70.08)",
        sidebar: "oklch(0.985 0 0)",
        "sidebar-foreground": "oklch(0.145 0 0)",
        "sidebar-primary": "oklch(0.205 0 0)",
        "sidebar-primary-foreground": "oklch(0.985 0 0)",
        "sidebar-accent": "oklch(0.97 0 0)",
        "sidebar-accent-foreground": "oklch(0.205 0 0)",
        "sidebar-border": "oklch(0.922 0 0)",
        "sidebar-ring": "oklch(0.708 0 0)",
      },
      dark: {
        background: "oklch(0.145 0 0)",
        foreground: "oklch(0.985 0 0)",
        card: "oklch(0.205 0 0)",
        "card-foreground": "oklch(0.985 0 0)",
        popover: "oklch(0.205 0 0)",
        "popover-foreground": "oklch(0.985 0 0)",
        primary: "oklch(0.922 0 0)",
        "primary-foreground": "oklch(0.205 0 0)",
        secondary: "oklch(0.269 0 0)",
        "secondary-foreground": "oklch(0.985 0 0)",
        muted: "oklch(0.269 0 0)",
        "muted-foreground": "oklch(0.708 0 0)",
        accent: "oklch(0.269 0 0)",
        "accent-foreground": "oklch(0.985 0 0)",
        destructive: "oklch(0.704 0.191 22.216)",
        "destructive-foreground": "oklch(0.985 0 0)",
        border: "oklch(1 0 0 / 10%)",
        input: "oklch(1 0 0 / 15%)",
        ring: "oklch(0.556 0 0)",
        "chart-1": "oklch(0.488 0.243 264.376)",
        "chart-2": "oklch(0.696 0.17 162.48)",
        "chart-3": "oklch(0.769 0.188 70.08)",
        "chart-4": "oklch(0.627 0.265 303.9)",
        "chart-5": "oklch(0.645 0.246 16.439)",
        sidebar: "oklch(0.205 0 0)",
        "sidebar-foreground": "oklch(0.985 0 0)",
        "sidebar-primary": "oklch(0.922 0 0)",
        "sidebar-primary-foreground": "oklch(0.205 0 0)",
        "sidebar-accent": "oklch(0.269 0 0)",
        "sidebar-accent-foreground": "oklch(0.985 0 0)",
        "sidebar-border": "oklch(1 0 0 / 10%)",
        "sidebar-ring": "oklch(0.556 0 0)",
      },
    },
    docs: "Import the written stylesheet from your app entry (e.g. `@import \"./styles/theme.css\";`). Dark mode is class-based: toggle `.dark` on <html>.",
  },
  {
    name: "use-mobile",
    type: "registry:hook",
    title: "useIsMobile",
    description:
      "A React hook that tracks whether the viewport is below the mobile breakpoint (768px) via matchMedia. Used by sidebar and any responsive component.",
    registryDependencies: [],
    files: [{ path: "src/hooks/use-mobile.ts", type: "registry:hook" }],
  },
]
