const assert = require("node:assert/strict")
const Module = require("node:module")

const registeredCommands = []
const registeredViews = []
const executedTasks = []
const errors = []
const messages = []
const files = new Map()
const directories = new Set()
const symlinks = new Set()
const effects = []
let settings = {}
let selection = ["agents"]
let endTask
let beforeRead
let rejectEdit = false

class Disposable { dispose() {} }
class EventEmitter { event = () => new Disposable(); fire() {}; dispose() {} }
class TreeItem { constructor(label, collapsibleState) { Object.assign(this, { label, collapsibleState }) } }
class ThemeIcon { constructor(id) { this.id = id } }
class FileSystemError extends Error {
  constructor(code) { super(code); this.code = code }
}
class Uri {
  constructor(value) { this.value = value; this.fsPath = new URL(value).pathname }
  toString() { return this.value }
  static parse(value) { return new Uri(value) }
  static joinPath(base, ...parts) { return new Uri(`${base.value.replace(/\/$/, "")}/${parts.join("/")}`) }
}
class WorkspaceEdit {
  edits = []
  createFile(uri, options) { this.edits.push({ kind: "create", uri, ...options }) }
  replace(uri, range, content) { this.edits.push({ kind: "replace", uri, range, content }) }
}

const folder = { name: "Remote project", index: 0, uri: Uri.parse("vscode-remote://ssh-remote+preview/workspaces/customer app") }
const key = (path) => Uri.joinPath(folder.uri, ...path.split("/")).toString()
function put(path, content) {
  files.set(key(path), Buffer.from(content))
  const segments = path.split("/")
  for (let index = 1; index < segments.length; index++) directories.add(key(segments.slice(0, index).join("/")))
}
function text(path) { return files.get(key(path))?.toString("utf8") }
function reset(config = {}) {
  files.clear(); directories.clear(); symlinks.clear(); effects.length = 0; errors.length = 0; messages.length = 0
  vscode.workspace.textDocuments.length = 0
  settings = {}; selection = ["agents"]; beforeRead = undefined; rejectEdit = false
  put("components.json", JSON.stringify({ logic2b: { registry: "https://ui.logic2b.com", ...config } }))
  put("package.json", JSON.stringify({ dependencies: { vite: "7", react: "19" } }))
  put(".logic2b/manifest.json", JSON.stringify({ schemaVersion: 1, registry: { resolvedVersion: "1.0.0-rc.17" }, items: { button: { files: ["ui/button.tsx"] } } }))
}

const vscode = {
  ShellExecution: class { constructor(command, args, options) { Object.assign(this, { command, args, options }) } },
  Task: class { constructor(definition, scope, name, source, execution) { Object.assign(this, { definition, scope, name, source, execution }) } },
  TaskRevealKind: { Always: 1 }, TaskPanelKind: { Dedicated: 1 },
  EventEmitter, TreeItem, ThemeIcon, Uri, FileSystemError, WorkspaceEdit,
  Range: class { constructor(start, end) { Object.assign(this, { start, end }) } },
  FileType: { File: 1, Directory: 2, SymbolicLink: 64 },
  TreeItemCollapsibleState: { None: 0, Expanded: 2 },
  workspace: {
    workspaceFolders: [folder], textDocuments: [],
    getConfiguration() { return { get(name, fallback) { return settings[name] ?? fallback } } },
    fs: {
      async stat(uri) {
        const path = uri.toString()
        if (symlinks.has(path)) return { type: 66, size: 0 }
        if (files.has(path)) return { type: 1, size: files.get(path).length }
        if (directories.has(path)) return { type: 2, size: 0 }
        throw new FileSystemError("FileNotFound")
      },
      async readFile(uri) {
        const value = Buffer.from(files.get(uri.toString()))
        if (beforeRead) beforeRead(uri)
        return value
      },
      async createDirectory(uri) { effects.push({ kind: "directory", uri }); directories.add(uri.toString()) },
    },
    async openTextDocument(uri) {
      const existing = this.textDocuments.find((document) => document.uri.toString() === uri.toString())
      if (existing) return existing
      const raw = files.get(uri.toString()).toString("utf8")
      const bom = raw.startsWith("\ufeff") ? "\ufeff" : ""
      const document = {
        uri, isDirty: false, buffer: bom ? raw.slice(1) : raw,
        getText() { return this.buffer },
        positionAt(offset) { return { line: 0, character: offset } },
        async save() { effects.push({ kind: "save", uri }); files.set(uri.toString(), Buffer.from(bom + this.buffer)); this.isDirty = false; return true },
      }
      this.textDocuments.push(document)
      return document
    },
    async applyEdit(edit) {
      if (rejectEdit) return false
      for (const entry of edit.edits) {
        effects.push(entry)
        if (entry.kind === "create") { assert.equal(files.has(entry.uri.toString()), false); files.set(entry.uri.toString(), Buffer.from(entry.contents)) }
        else {
          const document = this.textDocuments.find((item) => item.uri.toString() === entry.uri.toString())
          document.buffer = entry.content; document.isDirty = true
        }
      }
      return true
    },
    createFileSystemWatcher() { return { onDidCreate() { return new Disposable() }, onDidChange() { return new Disposable() }, onDidDelete() { return new Disposable() }, dispose() {} } },
    onDidChangeConfiguration() { return new Disposable() },
  },
  window: {
    registerTreeDataProvider(id, provider) { registeredViews.push({ id, provider }); return new Disposable() },
    async showQuickPick(items) { return items.filter((item) => selection.includes(item.format)) },
    async showErrorMessage(message) { errors.push(message) },
    async showInformationMessage(message) { messages.push(message) },
  },
  commands: { registerCommand(id, handler) { registeredCommands.push({ id, handler }); return new Disposable() } },
  tasks: {
    async executeTask(task) { executedTasks.push(task) },
    onDidEndTaskProcess(handler) { endTask = handler; return new Disposable() },
  },
}

async function main() {
  const originalLoad = Module._load
  const originalFetch = globalThis.fetch
  let fetches = 0
  Module._load = function load(request, parent, isMain) { return request === "vscode" ? vscode : originalLoad.call(this, request, parent, isMain) }
  globalThis.fetch = async () => { fetches++; throw new Error("Unexpected registry request") }
  try {
    const extension = require("../dist/extension.js")
    const context = { subscriptions: [] }
    extension.activate(context)
    assert.equal(registeredViews.length, 1)
    assert.equal(registeredViews[0].id, "logic2b.registry")
    assert.deepEqual(registeredCommands.map(({ id }) => id), ["logic2b.refreshRegistry", "logic2b.searchRegistry", "logic2b.installItem", "logic2b.installItems", "logic2b.initializeWorkspace", "logic2b.applyPreset", "logic2b.openCreate", "logic2b.openDocumentation", "logic2b.generateAgentRules"])
    assert.equal(context.subscriptions.length, 14)
    const command = (id) => registeredCommands.find((entry) => entry.id === id).handler
    await command("logic2b.initializeWorkspace")(folder)
    const { CLI_PACKAGE_SELECTOR } = require("@logic2b/scaffold/package-selectors")
    assert.equal(executedTasks[0].execution.command, "npx")
    assert.deepEqual(executedTasks[0].execution.args, [CLI_PACKAGE_SELECTOR, "init"])
    assert.equal(executedTasks[0].execution.options.cwd, folder.uri.fsPath)

    reset()
    put("AGENTS.md", "\ufeff# Local policy\nKeep our native customer controls.\n")
    put("DESIGN.md", "# Existing design\nKeep our spacing scale.\n")
    await command("logic2b.generateAgentRules")()
    assert.deepEqual(errors, [])
    assert.ok(text("AGENTS.md").startsWith("\ufeff# Local policy\nKeep our native customer controls.\n"))
    assert.equal(files.get(key("AGENTS.md")).subarray(0, 3).toString("hex"), "efbbbf")
    assert.equal(text("AGENTS.md").startsWith("\ufeff\ufeff"), false)
    assert.ok(text("DESIGN.md").startsWith("# Existing design\nKeep our spacing scale.\n"))
    assert.match(text("AGENTS.md"), /Components: `button`/)
    const previous = text("AGENTS.md")
    const previousEffects = effects.length
    await command("logic2b.generateAgentRules")()
    assert.equal(text("AGENTS.md"), previous)
    assert.equal(effects.length, previousEffects)
    assert.match(messages.at(-1), /already current/)
    put(".logic2b/manifest.json", JSON.stringify({ schemaVersion: 1, registry: { resolvedVersion: "1.0.0-rc.17" }, items: { button: { files: ["ui/button.tsx"] }, card: { files: ["ui/card.tsx"] } } }))
    await endTask({ exitCode: 0, execution: { task: executedTasks[0] } })
    assert.match(text("AGENTS.md"), /Components: `button` · `card`/)
    assert.ok(effects.every((entry) => entry.uri.toString().startsWith("vscode-remote://")))

    for (const preference of ["setting", "project", "failed"]) {
      reset(preference === "project" ? { agentRules: false } : {})
      if (preference === "setting") settings["agentRules.enabled"] = false
      await endTask({ exitCode: preference === "failed" ? 1 : 0, execution: { task: executedTasks[0] } })
      assert.equal(effects.length, 0)
      assert.equal(text("AGENTS.md"), undefined)
    }
    reset({ agentRules: false })
    const config = text("components.json")
    await command("logic2b.generateAgentRules")()
    assert.match(text("AGENTS.md"), /logic2b:rules:start/)
    assert.equal(text("components.json"), config)

    reset()
    put("AGENTS.md", "Local instructions.\n")
    let changed = false
    beforeRead = (uri) => { if (!changed && uri.toString() === key("AGENTS.md")) { changed = true; put("AGENTS.md", "Concurrent colleague change.\n") } }
    await command("logic2b.generateAgentRules")()
    assert.match(errors.at(-1), /stale|changed|precondition/i)
    assert.equal(effects.length, 0)
    assert.equal(text("AGENTS.md"), "Concurrent colleague change.\n")

    reset()
    put("AGENTS.md", "Saved instructions.\n")
    const dirty = await vscode.workspace.openTextDocument(Uri.joinPath(folder.uri, "AGENTS.md"))
    dirty.isDirty = true; dirty.buffer = "Unsaved instructions.\n"
    await command("logic2b.generateAgentRules")()
    assert.match(errors.at(-1), /Save AGENTS.md/)
    assert.equal(effects.length, 0)
    assert.equal(dirty.getText(), "Unsaved instructions.\n")

    reset()
    selection = ["cursor"]
    symlinks.add(key(".cursor"))
    await command("logic2b.generateAgentRules")()
    assert.match(errors.at(-1), /symlink/)
    assert.equal(effects.length, 0)

    reset()
    put("AGENTS.md", "x".repeat(65537))
    await command("logic2b.generateAgentRules")()
    assert.match(errors.at(-1), /64 KiB/)
    assert.equal(effects.length, 0)

    reset()
    rejectEdit = true
    await command("logic2b.generateAgentRules")()
    assert.match(errors.at(-1), /could not apply every/i)
    assert.equal(messages.length, 0)
    assert.equal(fetches, 0)
    console.log("✓ bundle activates, generates remote workspace rules, preserves BOM/custom content and rejects dirty/stale/symlink inputs")
  } finally { Module._load = originalLoad; globalThis.fetch = originalFetch }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
