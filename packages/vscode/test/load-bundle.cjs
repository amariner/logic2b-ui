const assert = require("node:assert/strict")
const Module = require("node:module")

const registeredCommands = []
const registeredViews = []
const executedTasks = []

class Disposable {
  dispose() {}
}

class EventEmitter {
  event = () => new Disposable()
  fire() {}
  dispose() {}
}

class TreeItem {
  constructor(label, collapsibleState) {
    this.label = label
    this.collapsibleState = collapsibleState
  }
}

class ThemeIcon {
  constructor(id) {
    this.id = id
  }
}

const vscode = {
  FileType: undefined, Position: undefined, Range: undefined, WorkspaceEdit: undefined,
  ShellExecution: class { constructor(command, args, options) { Object.assign(this, { command, args, options }) } },
  Task: class { constructor(definition, folder, name, source, execution) { Object.assign(this, { definition, folder, name, source, execution }) } },
  TaskRevealKind: { Always: 1 },
  TaskPanelKind: { Dedicated: 1 },
  EventEmitter,
  TreeItem,
  ThemeIcon,
  TreeItemCollapsibleState: { None: 0, Expanded: 2 },
  Uri: {
    parse(value) {
      return { value }
    },
  },
  workspace: {
    workspaceFolders: [],
    getConfiguration() {
      return { get(_name, fallback) { return fallback } }
    },
    createFileSystemWatcher() {
      return {
        onDidCreate() { return new Disposable() },
        onDidChange() { return new Disposable() },
        onDidDelete() { return new Disposable() },
        dispose() {},
      }
    },
    onDidChangeConfiguration() { return new Disposable() },
  },
  window: {
    registerTreeDataProvider(id, provider) {
      registeredViews.push({ id, provider })
      return new Disposable()
    },
  },
  commands: {
    registerCommand(id, handler) {
      registeredCommands.push({ id, handler })
      return new Disposable()
    },
  },
  tasks: {
    async executeTask(task) { executedTasks.push(task) },
    onDidEndTaskProcess() { return new Disposable() },
  },
}

const originalLoad = Module._load
Module._load = function load(request, parent, isMain) {
  return request === "vscode"
    ? vscode
    : originalLoad.call(this, request, parent, isMain)
}

;(async () => {
try {
  const extension = require("../dist/extension.js")
  const context = { subscriptions: [] }
  extension.activate(context)

  assert.equal(registeredViews.length, 1)
  assert.equal(registeredViews[0].id, "logic2b.registry")
  assert.deepEqual(
    registeredCommands.map(({ id }) => id),
    [
      "logic2b.refreshRegistry",
      "logic2b.searchRegistry",
      "logic2b.installItem",
      "logic2b.installItems",
      "logic2b.initializeWorkspace",
      "logic2b.applyPreset",
      "logic2b.generateAgentRules",
      "logic2b.openCreate",
      "logic2b.openDocumentation",
    ],
  )
  assert.equal(context.subscriptions.length, 14)
  // Execute the registered command through the real bundle, without a shell.
  registeredCommands.find(({ id }) => id === "logic2b.initializeWorkspace").handler({ uri: { fsPath: "/tmp/beta workspace" } })
  const { CLI_PACKAGE_SELECTOR } = require("@logic2b/scaffold/package-selectors")
  assert.equal(executedTasks[0].execution.command, "npx")
  assert.deepEqual(executedTasks[0].execution.args, [CLI_PACKAGE_SELECTOR, "init"])
  assert.equal(executedTasks[0].execution.options.cwd, "/tmp/beta workspace")
  // Exercise the actual registered rule command through a remote workspace provider.
  const prefix = "vscode-remote://fixture/app"
  const fileMap = new Map([
    [`${prefix}/components.json`, JSON.stringify({ logic2b: { registry: "https://ui.logic2b.com" } })],
    [`${prefix}/AGENTS.md`, "# Remote user policy\r\nKeep this text.\r\n"],
  ])
  const errors = []
  let applied = 0
  vscode.workspace.workspaceFolders = [{ uri: { value: prefix }, name: "remote", index: 0 }]
  vscode.Uri.joinPath = (base, ...parts) => ({ value: base.value + "/" + parts.join("/") })
  vscode.FileType = { File: 1, Directory: 2, SymbolicLink: 64 }
  vscode.Position = class { constructor(line, character) { Object.assign(this, { line, character }) } }
  vscode.Range = class { constructor(start, end) { Object.assign(this, { start, end }) } }
  vscode.WorkspaceEdit = class {
    operations = []
    createFile(uri, options) { this.operations.push({ type: "create", uri, options }) }
    insert(uri, position, content) { this.operations.push({ type: "write", uri, content }) }
    replace(uri, range, content) { this.operations.push({ type: "write", uri, content }) }
  }
  vscode.workspace.fs = { async stat(uri) {
    if (fileMap.has(uri.value)) return { type: 1, size: Buffer.byteLength(fileMap.get(uri.value)) }
    if ([...fileMap.keys()].some(key => key.startsWith(uri.value + "/"))) return { type: 2, size: 0 }
    throw Object.assign(new Error("Missing"), { code: "FileNotFound" })
  } }
  vscode.workspace.openTextDocument = async uri => ({ getText: () => fileMap.get(uri.value), positionAt: offset => offset, save: async () => true })
  vscode.workspace.applyEdit = async edit => {
    applied++
    for (const op of edit.operations) {
      if (op.type === "create") { assert.ok(!fileMap.has(op.uri.value)); fileMap.set(op.uri.value, "") }
      else fileMap.set(op.uri.value, op.content)
    }
    return true
  }
  vscode.window.showInformationMessage = async () => {}
  vscode.window.showErrorMessage = async message => errors.push(message)
  const generate = registeredCommands.find(({ id }) => id === "logic2b.generateAgentRules").handler
  await generate()
  assert.deepEqual(errors, [])
  assert.ok(fileMap.get(`${prefix}/AGENTS.md`).startsWith("# Remote user policy\r\nKeep this text.\r\n"))
  assert.ok(fileMap.has(`${prefix}/DESIGN.md`))
  await generate()
  assert.equal(applied, 1)
  fileMap.set(`${prefix}/DESIGN.md`, "<!-- logic2b:design:start v2 -->\n<!-- logic2b:design:end -->")
  const before = new Map(fileMap)
  await generate()
  assert.equal(applied, 1); assert.deepEqual(fileMap, before)
  assert.match(errors[0], /markers/)
  assert.equal(executedTasks.length, 1, "rules must not spawn a shell")
  console.log("✓ bundled extension activates and merges rules through a remote workspace provider")
} finally {
  Module._load = originalLoad
}

})().catch(error => { console.error(error); process.exitCode = 1 })
