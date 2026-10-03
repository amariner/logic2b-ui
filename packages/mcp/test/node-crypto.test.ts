import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import { test } from "node:test"

const run = promisify(execFile)
const cwd = fileURLToPath(new URL("..", import.meta.url))

test("Node startup supplies missing WebCrypto before rules hashes and verified registry reads", async () => {
  const code = `
    import assert from "node:assert/strict";
    import { createHash } from "node:crypto";
    delete globalThis.crypto;
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");
    const { createServer } = await import("./src/server.ts");
    const { ImmutableRegistry } = await import("./test/helpers/immutable-registry.ts");
    assert.equal(globalThis.crypto, undefined);
    const registry = new ImmutableRegistry({ items: [{ name: "button", type: "registry:ui", files: [] }] });
    const server = createServer({ base: registry.base, fetchImpl: registry.fetchImpl });
    assert.ok(globalThis.crypto.subtle);
    const crypto = globalThis.crypto;
    const second = createServer();
    assert.equal(globalThis.crypto, crypto);
    await second.close();
    const client = new Client({ name: "node-crypto-test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    try {
      const original = "Project instructions · 😀\\n";
      const rules = await client.callTool({ name: "agent_rules", arguments: { currentFiles: [{ path: "AGENTS.md", content: original }] } });
      assert.equal(rules.isError, undefined);
      const agents = rules.structuredContent.files.find((file) => file.path === "AGENTS.md");
      const expected = createHash("sha256").update(original, "utf8").digest("hex");
      assert.deepEqual(agents.precondition, { kind: "sha256", sha256: expected });
      assert.ok(agents.content.startsWith(original));
      const read = await client.callTool({ name: "get_component", arguments: { name: "button" } });
      assert.equal(read.isError, undefined);
      assert.ok(registry.calls.includes(registry.contentUrl("button")));
      process.stdout.write("verified");
    } finally {
      await client.close();
      await server.close();
    }
  `
  const { stdout, stderr } = await run(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", code], { cwd })
  assert.equal(stdout, "verified")
  assert.equal(stderr, "")
})
