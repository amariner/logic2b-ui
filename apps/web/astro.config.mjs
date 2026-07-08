// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  site: "https://ui.logic2b.com",
  output: "static",
  adapter: cloudflare(),
  redirects: {
    "/charts": "/charts/area",
  },
  integrations: [react(), mdx()],
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      // Force linked/monorepo React libs through Vite so dev SSR uses a single React copy.
      noExternal: [
        "radix-ui",
        /^@radix-ui\//,
        "cmdk",
        "sonner",
        "recharts",
        "lucide-react",
        "react-hook-form",
        "@hookform/resolvers",
        "react-day-picker",
        "vaul",
        "embla-carousel-react",
        "react-resizable-panels",
        "input-otp",
      ],
    },
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        "@/registry": fileURLToPath(
          new URL("../../packages/registry/src", import.meta.url),
        ),
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});
