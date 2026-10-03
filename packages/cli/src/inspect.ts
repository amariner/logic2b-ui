import { Command } from "commander"
import { resolve } from "node:path"
import { collectProjectSnapshot } from "@logic2b/scaffold/project-collector"
import { inspectProject } from "@logic2b/scaffold/project-context"

export interface InspectOptions {
  cwd?: string
  appRoot?: string
  json?: boolean
  details?: boolean
  snapshot?: boolean
  file?: string[]
  fileWrites?: boolean
  dependencyInstall?: boolean
  browser?: boolean
}

/** Read local context without using install/config defaults or executing code. */
export async function inspectProjectDirectory(options: InspectOptions = {}) {
  const snapshot = await collectProjectSnapshot(
    resolve(options.cwd ?? process.cwd()),
    {
      ...(options.appRoot === undefined ? {} : { appRoot: options.appRoot }),
      ...(options.file === undefined ? {} : { files: options.file }),
      inventory: options.details === true,
      capabilities: {
        fileWrites: options.fileWrites === true,
        dependencyInstall: options.dependencyInstall === true,
        browser: options.browser === true,
      },
    },
  )
  return options.snapshot
    ? snapshot
    : inspectProject(snapshot, { details: options.details === true })
}

/** Attach the read-only adapter separately so command behavior is testable. */
export function registerInspectCommand(program: Command): void {
  program
    .command("inspect")
    .description("Read project configuration and report context without changing files.")
    .option("-c, --cwd <path>", "working directory")
    .option("--app-root <path>", "application directory relative to the working directory")
    .option("--json", "emit the versioned project inspection as JSON", false)
    .option("--details", "include installed-file inventory and local-change hashes", false)
    .option("--snapshot", "emit sanitized JSON metadata for a host-supplied MCP snapshot", false)
    .option("--file <path>", "hash a selected project-relative file (repeatable)", (value: string, previous: string[]) => [...previous, value], [])
    .option("--file-writes", "declare that the host permits file writes", false)
    .option("--dependency-install", "declare that the host permits dependency installation", false)
    .option("--browser", "declare that the host can use a browser", false)
    .action(async (options: InspectOptions) => {
      const result = await inspectProjectDirectory(options)
      if (options.json || options.snapshot) {
        console.log(JSON.stringify(result, null, 2))
        return
      }
      if (!("summary" in result)) throw new Error("Project inspection did not return a summary.")
      console.log("Project inspection (schema 1)")
      for (const [field, value] of Object.entries(result.summary)) {
        const label = field.replace(/([a-z])([A-Z])/g, "$1 $2")
        console.log(`${label[0].toUpperCase()}${label.slice(1)}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
      }
      if (options.details && "context" in result) {
        console.log(`\nDetails:\n${JSON.stringify(result.context, null, 2)}`)
      }
    })
}
