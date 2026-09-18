import { constants } from "node:fs"
import { lstat, open, opendir, realpath } from "node:fs/promises"
import { isAbsolute, relative, resolve, sep } from "node:path"
import { reviewUi, validateReview, REVIEW_LIMITS, type ReviewFile, type ReviewScope } from "@logic2b/review"
const excluded = new Set([".git", "node_modules", ".logic2b", ".env"])
/** Explicit bounded source selection. Never runs project scripts or follows external paths. */
export async function reviewLocalFiles(options: { cwd: string; paths: string[]; semanticColors?: boolean; completeLabelContext?: boolean; scope?: ReviewScope[] }) {
  if (options.paths.length < 1 || options.paths.length > REVIEW_LIMITS.files) throw new Error("Provide 1–64 explicit review files or directories.")
  const root = await realpath(options.cwd)
  const files: ReviewFile[] = []
  const seen = new Set<string>()
  let bytes = 0, visited = 0
  function local(path: string) {
    const rel = relative(root, path)
    if (isAbsolute(rel) || rel === ".." || rel.startsWith(`..${sep}`) || rel.split(sep).some(part => excluded.has(part))) throw new Error("Review path escapes the project or selects a private/dependency directory.")
    return rel.split(sep).join("/")
  }
  async function visit(requested: string, depth: number, explicit: boolean): Promise<void> {
    if (++visited > 4096 || depth > 32) throw new Error("Review traversal limit exceeded; select more specific source files.")
    local(requested)
    const stat = await lstat(requested)
    if (stat.isSymbolicLink()) throw new Error("Review does not follow symbolic links; select the real in-project file.")
    const target = await realpath(requested)
    const path = local(target)
    if (stat.isDirectory()) {
      const directory = await opendir(target)
      for await (const entry of directory) if (!excluded.has(entry.name)) await visit(resolve(target, entry.name), depth + 1, false)
      return
    }
    if (!stat.isFile() || !/\.(tsx|jsx)$/.test(path)) {
      if (explicit) throw new Error("Review accepts TSX/JSX files or source directories.")
      return
    }
    if (seen.has(target)) throw new Error("Duplicate or overlapping review file selection.")
    seen.add(target)
    // Validate the public path contract before reading source bytes.
    validateReview({ files: [{ path, content: "" }] })
    if (stat.nlink !== 1) throw new Error("Review does not read multiply linked files; select an independent in-project source file.")
    if (files.length >= REVIEW_LIMITS.files || bytes + stat.size > REVIEW_LIMITS.sourceBytes) throw new Error("Review exceeds 64 files or 256 KiB; select a smaller source set.")
    const file = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW)
    try {
      const actual = await file.stat()
      if (!actual.isFile() || actual.nlink !== 1 || actual.dev !== stat.dev || actual.ino !== stat.ino || await realpath(requested) !== target) throw new Error("Review source changed while opening; try again.")
      const buffer = Buffer.alloc(REVIEW_LIMITS.sourceBytes - bytes + 1)
      let size = 0
      while (size < buffer.length) { const read = await file.read(buffer, size, buffer.length - size, null); if (!read.bytesRead) break; size += read.bytesRead }
      bytes += size
      if (bytes > REVIEW_LIMITS.sourceBytes) throw new Error("Review exceeds the 256 KiB source limit.")
      const after = await file.stat()
      if (after.size !== actual.size || after.mtimeMs !== actual.mtimeMs || after.ctimeMs !== actual.ctimeMs) throw new Error("Review source changed while reading; try again.")
      files.push({ path, content: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, size)), labelContext: options.completeLabelContext ? "complete" : "partial" })
    } finally { await file.close() }
  }
  for (const path of options.paths) await visit(resolve(root, path), 0, true)
  if (!files.length) throw new Error("No TSX/JSX files were selected.")
  files.sort((a,b) => a.path.localeCompare(b.path))
  return reviewUi({ files, scope: options.scope, policy: { semanticColors: options.semanticColors === true } })
}
