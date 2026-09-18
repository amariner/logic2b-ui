/**
 * Line-based three-way merge for `logic2b update`.
 *
 * base = the registry content recorded at install time (.logic2b/base),
 * local = the file in the project, remote = the registry content now.
 * Non-overlapping edits merge cleanly; overlapping different edits produce
 * git-style conflict markers.
 */

/** LCS match pairs [aIndex, bIndex], monotonically increasing on both sides. */
function matchIndices(a: string[], b: string[]): Map<number, number> {
  const n = a.length
  const m = b.length
  if ((n + 1) * (m + 1) > 4_000_000) throw new Error("Component merge exceeds the 4,000,000-cell comparison limit. Preserve both versions and resolve this large file manually.")
  // DP table of LCS lengths (small files — components are a few hundred lines).
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const pairs = new Map<number, number>()
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.set(i, j)
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++
    } else {
      j++
    }
  }
  return pairs
}

const eq = (a: string[], b: string[]) =>
  a.length === b.length && a.every((line, i) => line === b[i])

export interface MergeResult {
  merged: string
  conflicts: number
}

interface Edit { start: number; end: number; lines: string[]; side: "local" | "remote" }

/** Express each side's edits in base coordinates. Adjacent changed base lines
 * are independent edits, even when there is no unchanged line between them. */
function edits(base: string[], side: string[], name: Edit["side"]): Edit[] {
  const result: Edit[] = []
  let start = 0, next = 0
  for (const [baseIndex, sideIndex] of [...matchIndices(base, side), [base.length, side.length]]) {
    if (baseIndex > start || sideIndex > next) result.push({ start, end: baseIndex, lines: side.slice(next, sideIndex), side: name })
    start = baseIndex + 1
    next = sideIndex + 1
  }
  return result
}

function overlaps(a: Edit, b: Edit): boolean {
  // Insertions conflict at the same point or inside a replaced range. At the
  // outside boundary they remain independent and precede/follow that edit.
  if (a.start === a.end && b.start === b.end) return a.start === b.start
  if (a.start === a.end) return b.start < a.start && a.start < b.end
  if (b.start === b.end) return a.start < b.start && b.start < a.end
  return a.start < b.end && b.start < a.end
}

export function merge3(base: string, local: string, remote: string, labels = { local: "local", remote: "registry" }): MergeResult {
  // Fast paths.
  if (local === remote) return { merged: local, conflicts: 0 }
  if (local === base) return { merged: remote, conflicts: 0 }
  if (remote === base) return { merged: local, conflicts: 0 }

  const b = base.split("\n")
  const l = local.split("\n")
  const r = remote.split("\n")
  const changes = [...edits(b, l, "local"), ...edits(b, r, "remote")]
    .sort((a, z) => a.start - z.start || a.end - z.end)
  // Connected overlapping edits form one conflict candidate. Taking the
  // transitive closure handles a wide replacement crossing several hunks on
  // the other side without dropping the unchanged text between those hunks.
  const parent = changes.map((_, index) => index)
  const find = (index: number): number => {
    while (parent[index] !== index) { parent[index] = parent[parent[index]]; index = parent[index] }
    return index
  }
  for (let i = 0; i < changes.length; i++) for (let j = i + 1; j < changes.length && changes[j].start <= changes[i].end; j++) {
    if (changes[i].side !== changes[j].side && overlaps(changes[i], changes[j])) parent[find(j)] = find(i)
  }
  const groups = new Map<number, Edit[]>()
  for (let i = 0; i < changes.length; i++) {
    const key = find(i), group = groups.get(key) ?? []
    group.push(changes[i]); groups.set(key, group)
  }
  const chunks = [...groups.values()].sort((a, z) => a[0].start - z[0].start || a[0].end - z[0].end)
  const out: string[] = []
  let conflicts = 0
  let bi = 0
  for (const chunk of chunks) {
    const start = chunk[0].start, end = Math.max(...chunk.map(change => change.end))
    out.push(...b.slice(bi, start))
    const materialize = (side: Edit["side"]) => {
      const lines: string[] = []
      let cursor = start
      for (const change of chunk.filter(change => change.side === side)) {
        lines.push(...b.slice(cursor, change.start), ...change.lines)
        cursor = change.end
      }
      lines.push(...b.slice(cursor, end))
      return lines
    }
    const bSlice = b.slice(start, end)
    const lSlice = materialize("local"), rSlice = materialize("remote")

    if (eq(lSlice, rSlice)) {
      out.push(...lSlice) // both made the same change
    } else if (eq(lSlice, bSlice)) {
      out.push(...rSlice) // only the registry changed
    } else if (eq(rSlice, bSlice)) {
      out.push(...lSlice) // only the project changed
    } else {
      conflicts++
      out.push(`<<<<<<< ${labels.local}`, ...lSlice, "=======", ...rSlice, `>>>>>>> ${labels.remote}`)
    }

    bi = end
  }
  out.push(...b.slice(bi))
  return { merged: out.join("\n"), conflicts }
}
