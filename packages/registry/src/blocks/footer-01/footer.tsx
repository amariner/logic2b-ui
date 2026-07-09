import * as React from "react"

import { cn } from "@/registry/lib/utils"

const columns = [
  {
    title: "Product",
    links: ["Components", "Blocks", "Charts", "Themes", "Changelog"],
  },
  {
    title: "Resources",
    links: ["Documentation", "Installation", "For agents", "CLI", "Examples"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Careers", "Contact"],
  },
]

function LogoMark(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 523.83 536.87" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M403.46,202.16c-60.83,93.91-71.45,143.92-44.45,209.15,10.99,26.54,32.1,55.89,54.35,75.57,17.76,15.71,20.23,25.12,10.04,38.19-6.97,8.93-14.31,13.01-20.71,11.49-1.93-.46-11.87-6.23-22.07-12.8-49.82-32.2-90.43-44.39-138.3-41.53-34.25,2.04-62.31,10.2-110.19,32.03-44.52,20.29-58.65,24.55-71.19,21.36-2.74-.68-7.96-3.89-11.61-7.11-12.97-11.47-12.61-23.15,2.18-70.64,20.34-65.24,24.79-89.78,22.59-124.35-3.01-47.65-18.68-83.85-56.15-129.68-8.96-10.98-16.82-21.9-17.47-24.28-1.68-6.18,1.04-12.15,9.37-20.45,12.46-12.4,19.13-10.83,46.17,10.87,54.55,43.72,121,57.77,174.32,36.81,22.68-8.93,57.22-30.53,88.51-55.36,35.79-28.4,63.48-54.57,109.37-103.36C464.76,9.19,471.58,3.53,484.96.84c11.09-2.22,17.42-.26,27.32,8.49,7.06,6.23,9.04,8.96,10.41,14.17,4.51,17.46-3.75,33.37-36.84,70.85-29.02,32.88-60.73,74.38-82.39,107.82h0Z" />
    </svg>
  )
}

function GitHubIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

function XIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export function Footer({ className, ...props }: React.ComponentProps<"footer">) {
  return (
    <footer className={cn("w-full border-t", className)} {...props}>
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-3">
            <a href="#" className="flex items-center gap-2 font-semibold">
              <LogoMark className="size-5" />
              logic2b
            </a>
            <p className="text-muted-foreground max-w-xs text-sm">
              The design system that ships with the code. Copy-paste components
              for React and Tailwind.
            </p>
          </div>
          {columns.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">{column.title}</h3>
              <ul className="grid gap-2">
                {column.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row">
          <p className="text-muted-foreground text-sm">
            © 2026 logic2b. All rights reserved.
          </p>
          <div className="flex items-center gap-1">
            <a
              href="#"
              aria-label="GitHub"
              className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex size-8 items-center justify-center rounded-md transition-colors"
            >
              <GitHubIcon className="size-4" />
            </a>
            <a
              href="#"
              aria-label="X"
              className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex size-8 items-center justify-center rounded-md transition-colors"
            >
              <XIcon className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
