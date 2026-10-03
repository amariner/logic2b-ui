import { Command, Option } from "commander"
import { constants, type Stats } from "node:fs"
import { lstat, open, realpath } from "node:fs/promises"
import { join, resolve } from "node:path"
import { normalizeProjectPath } from "@logic2b/scaffold/project-context"
import { REVIEW_LIMITS, reviewUi, validateReviewRequest } from "@logic2b/review"

export interface ReviewOptions {
  cwd?: string
  json?: boolean
  failOn?: "warning" | "error"
  semanticColors?: boolean
  suppressions?: string
}

type Identity = Pick<Stats, "dev" | "ino">
type ReviewResult = ReturnType<typeof reviewUi>
const sameIdentity = (left: Identity, right: Identity) => left.dev === right.dev && left.ino === right.ino
const sameFile = (left: Stats, right: Stats) => sameIdentity(left, right) && left.size === right.size && left.mtimeMs === right.mtimeMs && left.ctimeMs === right.ctimeMs
const changed = () => new Error("Review input changed during reading; retry with stable files.")

/** This adapter never follows file/ancestor symlinks or reads special files. */
class ReviewReader {
  constructor(readonly root: string, readonly identity: Identity) {}

  async inspect(path: string): Promise<{ target: string; ancestors: Identity[]; file: Stats }> {
    const rootStat = await lstat(this.root)
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory() || !sameIdentity(rootStat, this.identity) || await realpath(this.root) !== this.root) throw changed()
    const ancestors: Identity[] = [rootStat]
    let target = this.root
    const parts = path.split("/")
    for (let index = 0; index < parts.length; index++) {
      target = join(target, parts[index])
      const stat = await lstat(target)
      if (stat.isSymbolicLink()) throw new Error(`Review input ${path} uses a symlink; select regular files inside the project.`)
      if (index === parts.length - 1) {
        if (!stat.isFile()) throw new Error(`Review input ${path} must be a regular file; directories and special files are unsupported.`)
        return { target, ancestors, file: stat }
      }
      if (!stat.isDirectory()) throw new Error(`Review input ${path} must use regular directories.`)
      ancestors.push(stat)
    }
    throw new Error("Review input path must identify a file.")
  }

  async read(path: string, limit: number): Promise<string> {
    try {
      const before = await this.inspect(path)
      if (before.file.size > limit) throw new Error(`Review input ${path} exceeds the ${limit}-byte remaining read limit.`)
      const file = await open(before.target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
      try {
        const check = async () => {
          const descriptor = await file.stat()
          const current = await this.inspect(path)
          if (!descriptor.isFile() || !sameFile(before.file, descriptor) || !sameFile(before.file, current.file)
            || before.ancestors.length !== current.ancestors.length
            || before.ancestors.some((identity, index) => !sameIdentity(identity, current.ancestors[index]))) throw changed()
        }
        // Recheck every ancestor and the open descriptor before reading bytes.
        await check()
        const chunks: Uint8Array[] = []
        let count = 0
        while (true) {
          const buffer = new Uint8Array(Math.min(65536, Math.max(1, limit - count + 1)))
          const { bytesRead } = await file.read(buffer, 0, buffer.length, null)
          if (!bytesRead) break
          count += bytesRead
          if (count > limit) throw new Error(`Review input ${path} exceeds the ${limit}-byte remaining read limit.`)
          chunks.push(buffer.subarray(0, bytesRead))
        }
        await check()
        if (count !== before.file.size) throw changed()
        const bytes = new Uint8Array(count)
        let offset = 0
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
        try { return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes) } catch {
          throw new Error(`Review input ${path} must contain valid UTF-8 text.`)
        }
      } finally { await file.close() }
    } catch (error) {
      // Node filesystem messages contain absolute local paths. Keep errors useful
      // without disclosing the project root or any symlink destination.
      const code = (error as NodeJS.ErrnoException).code
      if (code) throw new Error(`Cannot read review input ${path} (${code}); select an existing, readable regular file inside the project.`)
      throw error
    }
  }
}

/** Read only explicitly selected files; source is data and is never executed. */
export async function reviewProjectFiles(paths: string[], options: ReviewOptions = {}): Promise<ReviewResult> {
  if (options.failOn !== undefined && options.failOn !== "warning" && options.failOn !== "error") throw new Error("Review --fail-on must be warning or error.")
  if (!Array.isArray(paths) || paths.length === 0 || paths.length > REVIEW_LIMITS.files) throw new Error(`Review requires 1–${REVIEW_LIMITS.files} explicit TSX/JSX file paths.`)
  const files = paths.map((path) => ({ path: normalizeProjectPath(path), content: "" }))
  const policy = { semanticColors: options.semanticColors === true }
  // Validate all paths and duplicates before reading any local source.
  validateReviewRequest({ schemaVersion: 1, files, policy })
  const suppressionPath = options.suppressions === undefined ? undefined : normalizeProjectPath(options.suppressions)
  if (suppressionPath !== undefined && !suppressionPath.endsWith(".json")) throw new Error("Review --suppressions must select a relative JSON file.")
  let root: string
  let rootStat: Stats
  try {
    root = await realpath(resolve(options.cwd ?? process.cwd()))
    rootStat = await lstat(root)
  } catch {
    throw new Error("Review working directory must be an existing, readable directory.")
  }
  if (!rootStat.isDirectory()) throw new Error("Review working directory must be a directory.")
  const reader = new ReviewReader(root, rootStat)
  let suppressions: unknown
  if (suppressionPath !== undefined) {
    const content = await reader.read(suppressionPath, 64 * 1024)
    try { suppressions = JSON.parse(content.replace(/^\uFEFF/, "")) } catch { throw new Error("Review suppressions must contain a valid JSON array.") }
    validateReviewRequest({ schemaVersion: 1, files, policy, suppressions })
  }
  let bytes = 0
  for (const file of files) {
    file.content = await reader.read(file.path, Math.min(REVIEW_LIMITS.fileBytes, REVIEW_LIMITS.totalBytes - bytes))
    bytes += Buffer.byteLength(file.content)
  }
  const request = { schemaVersion: 1, files, policy, ...(suppressionPath === undefined ? {} : { suppressions }) }
  validateReviewRequest(request)
  return reviewUi(request)
}

function printReview(result: ReviewResult): void {
  console.log(`Static UI review (schema ${result.schemaVersion}; engine ${result.engineVersion})`)
  console.log(`Findings: ${result.summary.errors} errors, ${result.summary.warnings} warnings, ${result.summary.info} info`)
  console.log(`Evaluated rules: ${result.evaluatedRules.join(", ")}`)
  let currentFile = ""
  for (const finding of result.findings) {
    if (finding.file !== currentFile) { currentFile = finding.file; console.log(`\n${currentFile}`) }
    console.log(`  ${finding.line}:${finding.column} ${finding.severity} ${finding.rule} (${finding.category}; ${finding.confidence} confidence): ${finding.message}`)
    for (const evidence of finding.evidence) console.log(`    Evidence: ${evidence}`)
    if (finding.fix) console.log(`    Suggestion: ${finding.fix}`)
    console.log(`    ${finding.docs}`)
  }
  console.log(`\nUnknown checks: ${result.unknowns.length}. Unknown is not pass.`)
  for (const unknown of result.unknowns) console.log(`  ${unknown.file}:${unknown.line}:${unknown.column} ${unknown.rule}: ${unknown.reason}`)
  console.log(`Suppressed findings: ${result.suppressed.length}`)
  for (const entry of result.suppressed) console.log(`  ${entry.finding.file}:${entry.finding.line} ${entry.finding.rule}: ${entry.reason}`)
  for (const limitation of result.limitations) console.log(`Limitation: ${limitation}`)
}

export function registerReviewCommand(program: Command): void {
  program.command("review <paths...>")
    .description("Review explicit TSX/JSX files without executing, changing or uploading source.")
    .option("-c, --cwd <path>", "working directory; source paths are relative to it")
    .option("--json", "emit the versioned static review result as JSON", false)
    .addOption(new Option("--fail-on <severity>", "exit 1 for unsuppressed findings at this level or above").choices(["warning", "error"]).default("error"))
    .option("--semantic-colors", "enable the explicit semantic-color design policy", false)
    .option("--suppressions <path>", "read a relative JSON array of reasoned file/rule/line suppressions (64 KiB max)")
    .action(async (paths: string[], options: ReviewOptions) => {
      const result = await reviewProjectFiles(paths, options)
      if (options.json) console.log(JSON.stringify(result, null, 2))
      else printReview(result)
      if (result.summary.errors > 0 || (options.failOn === "warning" && result.summary.warnings > 0)) process.exitCode = 1
    })
}
