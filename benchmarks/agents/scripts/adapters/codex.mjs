#!/usr/bin/env node

import { spawn } from "node:child_process"
import { pathToFileURL } from "node:url"

export const TOOL_CALL_MARKER = "LOGIC2B_TOOL_CALL"

const NON_TOOL_ITEM_TYPES = new Set([
  "agent_message",
  "reasoning",
])

export function isCompletedToolCall(value) {
  return (
    value?.type === "item.completed" &&
    typeof value.item?.type === "string" &&
    !NON_TOOL_ITEM_TYPES.has(value.item.type)
  )
}

function argument(name) {
  const index = process.argv.indexOf(name)
  if (index === -1 || !process.argv[index + 1]) {
    throw new Error(`Missing required ${name} argument.`)
  }
  return process.argv[index + 1]
}

function optionalArgument(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

function writeJsonEvents(stream, destination) {
  let pending = ""
  stream.setEncoding("utf8")
  stream.on("data", (chunk) => {
    pending += chunk
    const lines = pending.split("\n")
    pending = lines.pop() ?? ""
    for (const line of lines) {
      destination.write(`${line}\n`)
      try {
        if (isCompletedToolCall(JSON.parse(line))) {
          destination.write(`${TOOL_CALL_MARKER}\n`)
        }
      } catch {
        // Codex may emit a diagnostic line alongside JSON events. Preserve it.
      }
    }
  })
  stream.on("end", () => {
    if (pending) destination.write(pending)
  })
}

export function main() {
  const codex = argument("--codex")
  const model = argument("--model")
  const mcpUrl = optionalArgument("--mcp-url")
  const workspace = process.env.LOGIC2B_BENCHMARK_WORKSPACE
  const prompt = process.env.LOGIC2B_BENCHMARK_PROMPT

  if (!workspace || !prompt) {
    throw new Error("The benchmark workspace and prompt environment variables are required.")
  }

  const codexArgs = [
    "exec",
    "--json",
    "--ephemeral",
    "--ignore-user-config",
    "--ignore-rules",
    "--skip-git-repo-check",
    "--model",
    model,
    "--sandbox",
    "workspace-write",
    "--disable",
    "apps",
    "--disable",
    "plugins",
    "--disable",
    "remote_plugin",
    "--disable",
    "recommended_plugins",
    "--disable",
    "browser_use",
    "--disable",
    "in_app_browser",
    "--disable",
    "computer_use",
    "--disable",
    "multi_agent",
    "--disable",
    "goals",
    "--disable",
    "hooks",
    "-c",
    'approval_policy="never"',
    "-c",
    "sandbox_workspace_write.network_access=true",
  ]
  if (mcpUrl) {
    codexArgs.push(
      "-c",
      `mcp_servers.logic2b.url=${JSON.stringify(mcpUrl)}`,
    )
  }
  codexArgs.push("--cd", workspace, "-")

  const child = spawn(
    codex,
    codexArgs,
    {
      cwd: workspace,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    },
  )

  writeJsonEvents(child.stdout, process.stdout)
  child.stderr.pipe(process.stderr)
  child.stdin.end(prompt)

  child.on("error", (error) => {
    console.error(error.message)
    process.exitCode = 1
  })

  child.on("close", (code, signal) => {
    if (signal) {
      console.error(`Codex exited after signal ${signal}.`)
      process.exitCode = 1
    } else {
      process.exitCode = code ?? 1
    }
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
