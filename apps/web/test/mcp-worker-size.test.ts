import assert from "node:assert/strict";
import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

/** Budget for the server-rendered /mcp worker chunk (bytes). Recorded so a
 *  dependency or refactor cannot silently double the edge bundle. */
const MCP_WORKER_BUDGET_BYTES = 256 * 1024;

const chunksDir = resolve("dist/server/chunks");

test("the /mcp worker chunk stays within its size budget", { skip: !existsSync(chunksDir) && "run pnpm build first" }, () => {
  const chunks = readdirSync(chunksDir).filter((name) => /^mcp_.*\.mjs$/.test(name));
  assert.equal(chunks.length, 1, `expected one mcp_*.mjs chunk, found: ${chunks.join(", ") || "none"}`);
  const bytes = statSync(resolve(chunksDir, chunks[0])).size;
  console.log(`mcp worker chunk ${chunks[0]}: ${bytes} bytes`);
  assert.ok(bytes <= MCP_WORKER_BUDGET_BYTES, `${bytes} bytes exceeds the ${MCP_WORKER_BUDGET_BYTES}-byte budget`);
});
