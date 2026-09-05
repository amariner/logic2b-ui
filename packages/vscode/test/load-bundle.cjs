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
      "logic2b.openCreate",
      "logic2b.openDocumentation",
    ],
  )
  assert.equal(context.subscriptions.length, 13)
  // Execute the registered command through the real bundle, without a shell.
  registeredCommands.find(({ id }) => id === "logic2b.initializeWorkspace").handler({ uri: { fsPath: "/tmp/beta workspace" } })
  const { CLI_PACKAGE_SELECTOR } = require("@logic2b/scaffold/package-selectors")
  assert.equal(executedTasks[0].execution.command, "npx")
  assert.deepEqual(executedTasks[0].execution.args, [CLI_PACKAGE_SELECTOR, "init"])
  assert.equal(executedTasks[0].execution.options.cwd, "/tmp/beta workspace")
  console.log("✓ bundled extension activates and registers its native surfaces")
} finally {
  Module._load = originalLoad
}
