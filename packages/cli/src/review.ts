import { constants, type Stats } from "node:fs"
import { lstat, open, opendir, realpath } from "node:fs/promises"
import { isAbsolute, relative, resolve, sep } from "node:path"
import { reviewUi, validateReview, REVIEW_LIMITS, type ReviewFile, type ReviewScope } from "@logic2b/review"
const excluded = new Set([".git", "node_modules", ".logic2b", ".env"])
const sameIdentity = (left: Stats, right: Stats) => left.dev === right.dev && left.ino === right.ino && left.isDirectory() === right.isDirectory() && left.isSymbolicLink() === right.isSymbolicLink()
const sameSnapshot = (left: Stats, right: Stats) => sameIdentity(left, right) && left.size === right.size && left.mtimeMs === right.mtimeMs && left.ctimeMs === right.ctimeMs && left.nlink === right.nlink
const changed = () => new Error("Review source or its directory changed during reading; try again on a stable project.")
function readError(error: unknown, path?: string): never {
  const code = (error as NodeJS.ErrnoException)?.code
  const label = path?.replace(/[\u0000-\u001f\u007f]/g, "?").slice(0, REVIEW_LIMITS.pathLength)
  if (code === "ERR_ENCODING_INVALID_ENCODED_DATA") throw new Error("Review input contains invalid UTF-8 encoded data.")
  if (code && /^[A-Z][A-Z0-9_]+$/.test(code)) throw new Error(`Cannot read review ${label ? `input ${label}` : "working directory"} (${code}); select an existing, readable in-project file or directory.`)
  throw error
}
/** Explicit bounded source selection. Never runs project scripts or follows external paths. */
export async function reviewLocalFiles(options: { cwd: string; paths: string[]; semanticColors?: boolean; completeLabelContext?: boolean; scope?: ReviewScope[] }) {
  if (options.paths.length < 1 || options.paths.length > REVIEW_LIMITS.files) throw new Error("Provide 1–64 explicit review files or directories.")
  let root: string, rootIdentity: Stats
  try {
    root = await realpath(options.cwd)
    rootIdentity = await lstat(root)
    if (!rootIdentity.isDirectory()) throw new Error("Review working directory must be a directory.")
  } catch (error) { readError(error) }
  const files: ReviewFile[] = []
  const seen = new Set<string>()
  let bytes = 0, visited = 0
  function local(path: string) {
    const rel = relative(root, path)
    if (isAbsolute(rel) || rel === ".." || rel.startsWith(`..${sep}`) || rel.split(sep).some(part => excluded.has(part))) throw new Error("Review path escapes the project or selects a private/dependency directory.")
    return rel.split(sep).join("/")
  }
  async function checkRoot() {
    const stat = await lstat(root)
    if (!sameIdentity(rootIdentity, stat) || !stat.isDirectory() || stat.isSymbolicLink() || await realpath(root) !== root) throw changed()
  }
  async function ancestors(requested: string, target: string): Promise<Map<string, Stats>> {
    await checkRoot()
    const result = new Map<string, Stats>()
    for (const path of [requested, target]) {
      let current = root
      for (const part of local(path).split("/").slice(0, -1)) {
        current = resolve(current, part)
        const stat = await lstat(current)
        if (stat.isSymbolicLink()) {
          // Keep existing in-root ancestor aliases; canonical ancestors must
          // remain regular directories, and every alias target stays in-root.
          if (path === target) throw changed()
          const linked = await realpath(current)
          local(linked)
          if (!(await lstat(linked)).isDirectory()) throw changed()
        } else if (!stat.isDirectory()) throw changed()
        const earlier = result.get(current)
        if (earlier && !sameIdentity(earlier, stat)) throw changed()
        result.set(current, stat)
      }
    }
    return result
  }
  async function checkPath(requested: string, target: string, before: Stats, parents: Map<string, Stats>) {
    await checkRoot()
    if (await realpath(requested) !== target) throw changed()
    for (const [path, stat] of parents) if (!sameIdentity(stat, await lstat(path))) throw changed()
    if (!sameSnapshot(before, await lstat(target))) throw changed()
  }
  async function visit(requested: string, depth: number, explicit: boolean): Promise<void> {
    const selected = local(requested)
    try { await readSelected(requested, depth, explicit) } catch (error) { readError(error, selected || ".") }
  }
  async function readSelected(requested: string, depth: number, explicit: boolean): Promise<void> {
    if (++visited > 4096 || depth > 32) throw new Error("Review traversal limit exceeded; select more specific source files.")
    await checkRoot()
    const stat = await lstat(requested)
    if (stat.isSymbolicLink()) throw new Error("Review does not follow symbolic links; select the real in-project file.")
    const target = await realpath(requested)
    const path = local(target)
    if (stat.isDirectory()) {
      const parents = await ancestors(requested, target)
      const directory = await opendir(target)
      try {
        await checkPath(requested, target, stat, parents)
        for await (const entry of directory) if (!excluded.has(entry.name)) await visit(resolve(target, entry.name), depth + 1, false)
        await checkPath(requested, target, stat, parents)
      } finally { await directory.close().catch(error => { if ((error as NodeJS.ErrnoException).code !== "ERR_DIR_CLOSED") throw error }) }
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
    const parents = await ancestors(requested, target)
    const file = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
    try {
      const actual = await file.stat()
      if (!actual.isFile() || actual.nlink !== 1 || !sameSnapshot(stat, actual)) throw changed()
      await checkPath(requested, target, stat, parents)
      const buffer = Buffer.alloc(REVIEW_LIMITS.sourceBytes - bytes + 1)
      let size = 0
      while (size < buffer.length) { const read = await file.read(buffer, size, buffer.length - size, null); if (!read.bytesRead) break; size += read.bytesRead }
      bytes += size
      if (bytes > REVIEW_LIMITS.sourceBytes) throw new Error("Review exceeds the 256 KiB source limit.")
      const after = await file.stat()
      if (!sameSnapshot(actual, after) || size !== actual.size) throw changed()
      await checkPath(requested, target, stat, parents)
      files.push({ path, content: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, size)), labelContext: options.completeLabelContext ? "complete" : "partial" })
    } finally { await file.close() }
  }
  for (const path of options.paths) await visit(resolve(root, path), 0, true)
  if (!files.length) throw new Error("No TSX/JSX files were selected.")
  files.sort((a,b) => a.path.localeCompare(b.path))
  return reviewUi({ files, scope: options.scope, policy: { semanticColors: options.semanticColors === true } })
}
