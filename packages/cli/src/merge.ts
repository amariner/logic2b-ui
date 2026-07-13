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

export function merge3(base: string, local: string, remote: string): MergeResult {
  // Fast paths.
  if (local === remote) return { merged: local, conflicts: 0 }
  if (local === base) return { merged: remote, conflicts: 0 }
  if (remote === base) return { merged: local, conflicts: 0 }

  const b = base.split("\n")
  const l = local.split("\n")
  const r = remote.split("\n")
  const ml = matchIndices(b, l)
  const mr = matchIndices(b, r)

  const out: string[] = []
  let conflicts = 0
  let bi = 0
  let li = 0
  let ri = 0

  while (bi <= b.length) {
    // Stable line: present unchanged in both sides at the current cursor.
    if (bi < b.length && ml.get(bi) === li && mr.get(bi) === ri) {
      out.push(b[bi])
      bi++
      li++
      ri++
      continue
    }
    // Next base line that survives on BOTH sides bounds the unstable chunk.
    let bj = bi
    while (bj < b.length && !(ml.has(bj) && mr.has(bj))) bj++
    const lEnd = bj < b.length ? ml.get(bj)! : l.length
    const rEnd = bj < b.length ? mr.get(bj)! : r.length
    const bSlice = b.slice(bi, bj)
    const lSlice = l.slice(li, lEnd)
    const rSlice = r.slice(ri, rEnd)

    if (eq(lSlice, rSlice)) {
      out.push(...lSlice) // both made the same change
    } else if (eq(lSlice, bSlice)) {
      out.push(...rSlice) // only the registry changed
    } else if (eq(rSlice, bSlice)) {
      out.push(...lSlice) // only the project changed
    } else {
      conflicts++
      out.push("<<<<<<< local", ...lSlice, "=======", ...rSlice, ">>>>>>> registry")
    }

    bi = bj
    li = lEnd
    ri = rEnd
    if (bi < b.length) {
      out.push(b[bi]) // the stable boundary line itself
      bi++
      li++
      ri++
    } else {
      break
    }
  }

  return { merged: out.join("\n"), conflicts }
}
