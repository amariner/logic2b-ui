import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { checkMcpWorkerBudget } from "../scripts/mcp-worker-budget.mjs";

const chunksDir = resolve("dist/server/chunks");

test("the /mcp worker chunk stays within its size budget", { skip: !existsSync(chunksDir) && "run pnpm build first" }, () => {
  console.log(checkMcpWorkerBudget(resolve("dist/server")));
});
