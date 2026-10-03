import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { gzipSync } from "node:zlib";
import { test } from "node:test";

/** M1-04 adds the pinned Babel JSX/TSX parser. Measured tool subtree:
 * 757,422 bytes raw / 175,187 bytes gzip, versus the previous 253,787-byte
 * entry. Count local dependent chunks too: moving the parser cannot hide it.
 * This is a project regression budget, not a claim of deployed Worker size. */
const MCP_WORKER_BUDGET_BYTES = 800 * 1024;
const MCP_WORKER_GZIP_BUDGET_BYTES = 192 * 1024;

const chunksDir = resolve("dist/server/chunks");

test("the /mcp worker chunk stays within its size budget", { skip: !existsSync(chunksDir) && "run pnpm build first" }, () => {
  const chunks = readdirSync(chunksDir).filter((name) => /^mcp_.*\.mjs$/.test(name));
  assert.equal(chunks.length, 1, `expected one mcp_*.mjs chunk, found: ${chunks.join(", ") || "none"}`);
  const seen = new Set<string>();
  let bytes = 0, gzipBytes = 0;
  function visit(path: string): void {
    if (seen.has(path)) return;
    assert.ok(!relative(chunksDir, path).startsWith(".."), "MCP dependency must remain within built chunks");
    seen.add(path);
    const content = readFileSync(path);
    bytes += content.length;
    gzipBytes += gzipSync(content).length;
    for (const match of content.toString("utf8").matchAll(/(?:from\s*|import\s*(?:\(\s*)?)["'](\.[^"']+\.mjs)["']/g)) {
      visit(resolve(dirname(path), match[1]));
    }
  }
  visit(resolve(chunksDir, chunks[0]));
  console.log(`mcp worker subtree (${seen.size} chunks): ${bytes} bytes; gzip ${gzipBytes} bytes`);
  assert.ok(bytes <= MCP_WORKER_BUDGET_BYTES, `${bytes} bytes exceeds the ${MCP_WORKER_BUDGET_BYTES}-byte budget`);
  assert.ok(gzipBytes <= MCP_WORKER_GZIP_BUDGET_BYTES, `${gzipBytes} gzip bytes exceeds the ${MCP_WORKER_GZIP_BUDGET_BYTES}-byte budget`);
});
