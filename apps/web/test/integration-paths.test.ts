import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  INTEGRATION_CAPABILITIES,
  INTEGRATION_PATHS,
  integrationPathsMarkdown,
} from "../src/data/integration-paths.ts";

describe("integration path comparison", () => {
  test("uses unique stable path ids", () => {
    const ids = INTEGRATION_PATHS.map((path) => path.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test("defines every capability for every path", () => {
    const expected = INTEGRATION_PATHS.map((path) => path.id).sort();
    for (const capability of INTEGRATION_CAPABILITIES) {
      assert.deepEqual(Object.keys(capability.values).sort(), expected);
    }
  });

  test("emits a complete agent-readable Markdown matrix", () => {
    const markdown = integrationPathsMarkdown();
    for (const path of INTEGRATION_PATHS) assert.ok(markdown.includes(path.name));
    for (const capability of INTEGRATION_CAPABILITIES) {
      assert.ok(markdown.includes(capability.label));
    }
    assert.doesNotMatch(markdown, /undefined|<IntegrationPaths/);
  });

  test("emits the same integration contract in Spanish", () => {
    const markdown = integrationPathsMarkdown("es");
    assert.match(markdown, /\| Capacidad \|/);
    assert.match(markdown, /MCP remoto|Registro directo/);
    assert.match(markdown, /Sí|Solo plan/);
    assert.doesNotMatch(markdown, /undefined|<IntegrationPaths/);
  });
});
