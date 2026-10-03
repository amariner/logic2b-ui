import { CLI_PACKAGE_SELECTOR } from "@logic2b/scaffold/package-selectors"
import { RULES_LIMITS, validateRulePrecondition } from "@logic2b/scaffold/rules"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import * as vscode from "vscode"

import {
  applyPresetToProject,
  COMMAND_IDS,
  cliArgsForAgentRules,
  DEFAULT_REGISTRY,
  documentationUrl,
  normalizeRegistryUrl,
  registryKind,
  themePathFromCssEntry,
  type RegistryIndexItem,
} from "./core"
import {
  agentRulesOptionsFromProject,
  applyWorkspaceAgentRules,
  prepareWorkspaceAgentRules,
  projectAgentRulesEnabled,
  type AgentRulesWorkspace,
  type WorkspaceAgentRulesOptions,
} from "./agent-rules"
import { RegistryItemNode, RegistryTreeProvider } from "./registry-tree"

const runFile = promisify(execFile)
const RULE_FILE_BYTES = RULES_LIMITS.currentFileBytes
const RULE_FORMATS = ["agents", "claude", "cursor", "copilot"] as const

function agentRulesEnabled(folder: vscode.WorkspaceFolder): boolean {
  return vscode.workspace.getConfiguration("logic2b", folder.uri).get("agentRules.enabled", true)
}

function configuredRuleFormats(folder: vscode.WorkspaceFolder): typeof RULE_FORMATS[number][] {
  const configured = vscode.workspace.getConfiguration("logic2b", folder.uri).get<unknown>("agentRules.formats", ["agents"])
  if (!Array.isArray(configured) || !configured.length || configured.some((value) => !(RULE_FORMATS as readonly unknown[]).includes(value))) {
    throw new Error("logic2b.agentRules.formats must select agents, claude, cursor or copilot.")
  }
  return [...new Set(configured)] as typeof RULE_FORMATS[number][]
}

function isMissing(error: unknown): boolean {
  return error instanceof vscode.FileSystemError && error.code === "FileNotFound"
}

async function safeRulesUri(folder: vscode.WorkspaceFolder, path: string): Promise<{ uri: vscode.Uri; stat?: vscode.FileStat }> {
  const segments = path.split("/")
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || /[\\:\u0000-\u001f]/.test(segment))) throw new Error("Agent rules paths must remain inside the workspace.")
  let stat: vscode.FileStat | undefined
  for (let index = 1; index <= segments.length; index++) {
    const uri = vscode.Uri.joinPath(folder.uri, ...segments.slice(0, index))
    try { stat = await vscode.workspace.fs.stat(uri) } catch (error) { if (isMissing(error)) { stat = undefined; break } throw error }
    if (stat.type & vscode.FileType.SymbolicLink) throw new Error(`Agent rules cannot use a symlink at ${segments.slice(0, index).join("/")}.`)
    if (index < segments.length && !(stat.type & vscode.FileType.Directory)) throw new Error("An agent rules parent path is not a directory.")
  }
  return { uri: vscode.Uri.joinPath(folder.uri, ...segments), stat }
}

async function readWorkspaceRuleText(folder: vscode.WorkspaceFolder, path: string): Promise<string | null> {
  const { uri, stat } = await safeRulesUri(folder, path)
  const open = vscode.workspace.textDocuments.find((document) => document.uri.toString() === uri.toString())
  if (open?.isDirty) throw new Error(`Save ${path} before generating agent rules.`)
  if (!stat) return null
  if (!(stat.type & vscode.FileType.File)) throw new Error(`${path} must be a regular workspace file.`)
  if (stat.size > RULE_FILE_BYTES) throw new Error(`${path} exceeds the 64 KiB agent rules input limit.`)
  const bytes = await vscode.workspace.fs.readFile(uri)
  if (bytes.byteLength > RULE_FILE_BYTES) throw new Error(`${path} exceeds the 64 KiB agent rules input limit.`)
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes)
}

function rulesWorkspace(folder: vscode.WorkspaceFolder): AgentRulesWorkspace {
  return {
    read: (path) => readWorkspaceRuleText(folder, path),
    async apply(files) {
      const documents = new Map<string, { document: vscode.TextDocument; bom: string }>()
      for (const file of files) {
        const content = await readWorkspaceRuleText(folder, file.path)
        await validateRulePrecondition(content ?? undefined, file.precondition)
        if (file.action !== "create") {
          const document = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(folder.uri, ...file.path.split("/")))
          if (document.isDirty) throw new Error(`Save ${file.path} before generating agent rules.`)
          // VS Code keeps the encoding BOM outside TextDocument.getText().
          const bom = content?.startsWith("\ufeff") ? "\ufeff" : ""
          await validateRulePrecondition(bom + document.getText(), file.precondition)
          documents.set(file.path, { document, bom })
        }
      }
      // Parent directories are created only after every file precondition passes.
      for (const file of files) if (file.action === "create" && file.path.includes("/")) {
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(folder.uri, ...file.path.split("/").slice(0, -1)))
      }
      const edit = new vscode.WorkspaceEdit()
      for (const file of files) {
        const { uri } = await safeRulesUri(folder, file.path)
        await validateRulePrecondition((await readWorkspaceRuleText(folder, file.path)) ?? undefined, file.precondition)
        const opened = documents.get(file.path)
        if (file.action === "create") edit.createFile(uri, { overwrite: false, contents: new TextEncoder().encode(file.content) })
        else if (opened) {
          const { document, bom } = opened
          if (document.isDirty) throw new Error(`Save ${file.path} before generating agent rules.`)
          await validateRulePrecondition(bom + document.getText(), file.precondition)
          edit.replace(uri, wholeDocumentRange(document), bom && file.content.startsWith(bom) ? file.content.slice(1) : file.content)
        }
      }
      if (!(await vscode.workspace.applyEdit(edit))) return false
      for (const { document } of documents.values()) if (!(await document.save())) throw new Error("Agent rules were edited but a workspace file could not be saved. Review the affected files.")
      return true
    },
  }
}

async function generateAgentRules(
  provider: RegistryTreeProvider,
  requestedFolder?: vscode.WorkspaceFolder,
  automatic = false,
): Promise<void> {
  const folder = requestedFolder ?? await pickWorkspaceFolder()
  if (!folder || (automatic && !agentRulesEnabled(folder))) return
  try {
    let formats = configuredRuleFormats(folder)
    if (!automatic) {
      const selected = await vscode.window.showQuickPick(RULE_FORMATS.map((format) => ({
        label: ({ agents: "AGENTS.md", claude: "Claude Code", cursor: "Cursor", copilot: "GitHub Copilot" })[format],
        description: ({ agents: "Universal project instructions", claude: "CLAUDE.md import and AGENTS.md", cursor: ".cursor/rules/logic2b.mdc", copilot: ".github/copilot-instructions.md" })[format],
        picked: formats.includes(format),
        format,
      })), { canPickMany: true, title: "Generate logic2b agent rules", placeHolder: "Choose editor formats; DESIGN.md is included" })
      if (!selected?.length) return
      formats = selected.map((entry) => entry.format)
    }
    const config = await readWorkspaceRuleText(folder, "components.json")
    if (config === null) throw new Error("Initialize logic2b before generating agent rules.")
    const projectEnabled = projectAgentRulesEnabled(config)
    if (automatic && !projectEnabled) return
    const manifest = await readWorkspaceRuleText(folder, ".logic2b/manifest.json")
    const pkg = await readWorkspaceRuleText(folder, "package.json")
    const options: WorkspaceAgentRulesOptions = { ...agentRulesOptionsFromProject(config, manifest, pkg), formats }
    const workspace = rulesWorkspace(folder)
    const plan = await prepareWorkspaceAgentRules(workspace, options)
    const changed = await applyWorkspaceAgentRules(workspace, plan)
    if (!automatic) await vscode.window.showInformationMessage(changed ? `Updated logic2b agent rules in ${changed} file(s).` : "logic2b agent rules are already current.")
  } catch (error) {
    await vscode.window.showErrorMessage(`Could not generate agent rules: ${error instanceof Error ? error.message : error}`)
  }
}

function registryUrl(): string {
  return normalizeRegistryUrl(
    vscode.workspace.getConfiguration("logic2b").get("registryUrl", DEFAULT_REGISTRY),
  )
}

async function pickWorkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
  const folders = vscode.workspace.workspaceFolders ?? []
  if (folders.length === 0) {
    await vscode.window.showErrorMessage("Open a workspace before using logic2b.")
    return undefined
  }
  if (folders.length === 1) return folders[0]
  return vscode.window.showWorkspaceFolderPick({
    placeHolder: "Choose the workspace where logic2b should make changes",
  })
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri)
    return true
  } catch {
    return false
  }
}

async function executeCliTask(
  folder: vscode.WorkspaceFolder,
  command: "init" | "add",
  args: string[],
): Promise<void> {
  const enabled = agentRulesEnabled(folder)
  let help = ""
  if (!enabled) {
    try {
      help = (await runFile("npx", [CLI_PACKAGE_SELECTOR, command, "--help"], { cwd: folder.uri.fsPath, timeout: 15_000, maxBuffer: 64 * 1024 })).stdout
    } catch {
      await vscode.window.showErrorMessage("Could not check the CLI's agent rules opt-out support. Retry when CLI help is available; no install task was started.")
      return
    }
  }
  const execution = new vscode.ShellExecution(
    "npx",
    [CLI_PACKAGE_SELECTOR, command, ...cliArgsForAgentRules(args, enabled, help)],
    { cwd: folder.uri.fsPath },
  )
  const task = new vscode.Task(
    { type: "logic2b", command },
    folder,
    command === "init" ? "Initialize workspace" : `Install ${args.join(", ")}`,
    "logic2b",
    execution,
  )
  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    panel: vscode.TaskPanelKind.Dedicated,
    clear: true,
  }
  await vscode.tasks.executeTask(task)
}

async function initializeWorkspace(
  requestedFolder?: vscode.WorkspaceFolder,
): Promise<void> {
  const folder = requestedFolder ?? (await pickWorkspaceFolder())
  if (!folder) return
  const args = registryUrl() === DEFAULT_REGISTRY ? [] : ["--registry", registryUrl()]
  await executeCliTask(folder, "init", args)
}

async function ensureInitialized(
  folder: vscode.WorkspaceFolder,
): Promise<boolean> {
  const config = vscode.Uri.joinPath(folder.uri, "components.json")
  if (await fileExists(config)) return true
  const action = await vscode.window.showWarningMessage(
    "This workspace has no components.json. Initialize logic2b first, then run the install command again.",
    "Initialize",
  )
  if (action === "Initialize") await initializeWorkspace(folder)
  return false
}

async function installItems(
  provider: RegistryTreeProvider,
  requested?: RegistryIndexItem[],
): Promise<void> {
  let items = requested
  if (!items) {
    const installable = (await provider.getItems()).filter(
      (item) => registryKind(item) !== null,
    )
    const picks = await vscode.window.showQuickPick(
      installable.map((item) => ({
        label: item.title ?? item.name,
        description: item.name,
        detail: item.description,
        item,
      })),
      {
        canPickMany: true,
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: "Choose components, blocks or charts to install",
        title: "Install from the logic2b registry",
      },
    )
    if (!picks || picks.length === 0) return
    items = picks.map((pick) => pick.item)
  }

  const folder = await pickWorkspaceFolder()
  if (!folder || !(await ensureInitialized(folder))) return
  await executeCliTask(
    folder,
    "add",
    [...new Set(items.map((item) => item.name))],
  )
}

function wholeDocumentRange(document: vscode.TextDocument): vscode.Range {
  return new vscode.Range(
    document.positionAt(0),
    document.positionAt(document.getText().length),
  )
}

async function applyPreset(): Promise<void> {
  const folder = await pickWorkspaceFolder()
  if (!folder) return
  const presetId = await vscode.window.showInputBox({
    title: "Apply a logic2b preset",
    prompt: "Paste the preset id generated by ui.logic2b.com/create",
    placeHolder: "Preset id",
    ignoreFocusOut: true,
  })
  if (!presetId) return

  const configUri = vscode.Uri.joinPath(folder.uri, "components.json")
  try {
    const configDocument = await vscode.workspace.openTextDocument(configUri)
    const configText = configDocument.getText()
    const configValue: unknown = JSON.parse(configText)
    if (
      typeof configValue !== "object" ||
      configValue === null ||
      Array.isArray(configValue)
    ) {
      throw new Error("components.json must be a JSON object.")
    }
    const cssEntry = (configValue as { tailwind?: { css?: unknown } }).tailwind?.css
    if (typeof cssEntry !== "string") {
      throw new Error('components.json must define "tailwind.css".')
    }

    // Resolve the theme path before opening it; applyPresetToProject validates
    // the same path again before any workspace edit is created.
    const pathSegments = themePathFromCssEntry(cssEntry).split("/")
    const themeUri = vscode.Uri.joinPath(
      folder.uri,
      ...pathSegments,
    )
    const themeDocument = await vscode.workspace.openTextDocument(themeUri)
    const patch = applyPresetToProject(configText, themeDocument.getText(), presetId)

    const edit = new vscode.WorkspaceEdit()
    edit.replace(configUri, wholeDocumentRange(configDocument), patch.config)
    edit.replace(themeUri, wholeDocumentRange(themeDocument), patch.themeCss)
    if (!(await vscode.workspace.applyEdit(edit))) {
      throw new Error("VS Code rejected the workspace edit.")
    }
    const saved = await Promise.all([configDocument.save(), themeDocument.save()])
    if (saved.some((value) => !value)) {
      throw new Error("The preset was applied in the editor but one file could not be saved.")
    }
    await vscode.window.showInformationMessage(
      `Applied preset: ${patch.preset.base} / ${patch.preset.theme} / ${patch.preset.radius}.`,
    )
  } catch (error) {
    await vscode.window.showErrorMessage(
      `Could not apply preset: ${error instanceof Error ? error.message : error}`,
    )
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const provider = new RegistryTreeProvider(registryUrl)
  context.subscriptions.push(
    provider,
    vscode.window.registerTreeDataProvider("logic2b.registry", provider),
    vscode.commands.registerCommand(COMMAND_IDS[0], () =>
      provider.refresh({ refetch: true }),
    ),
    vscode.commands.registerCommand(COMMAND_IDS[1], async () => {
      const query = await vscode.window.showInputBox({
        title: "Search the logic2b registry",
        placeHolder: "Component, block, chart or capability",
        value: provider.getQuery(),
      })
      if (query !== undefined) provider.setQuery(query)
    }),
    vscode.commands.registerCommand(
      COMMAND_IDS[2],
      async (node?: RegistryItemNode) => {
        if (node instanceof RegistryItemNode) await installItems(provider, [node.item])
        else await installItems(provider)
      },
    ),
    vscode.commands.registerCommand(COMMAND_IDS[3], () => installItems(provider)),
    vscode.commands.registerCommand(COMMAND_IDS[4], initializeWorkspace),
    vscode.commands.registerCommand(COMMAND_IDS[5], applyPreset),
    vscode.commands.registerCommand(COMMAND_IDS[6], () =>
      vscode.env.openExternal(vscode.Uri.parse(`${registryUrl()}/create`)),
    ),
    vscode.commands.registerCommand(
      COMMAND_IDS[7],
      async (node?: RegistryItemNode) => {
        if (!(node instanceof RegistryItemNode)) {
          await vscode.env.openExternal(vscode.Uri.parse(`${registryUrl()}/docs`))
          return
        }
        await vscode.env.openExternal(
          vscode.Uri.parse(documentationUrl(registryUrl(), node.item)),
        )
      },
    ),
    vscode.commands.registerCommand(COMMAND_IDS[8], () => generateAgentRules(provider)),
  )

  const watcher = vscode.workspace.createFileSystemWatcher(
    "**/{components.json,.logic2b/manifest.json}",
  )
  watcher.onDidCreate(() => provider.refresh())
  watcher.onDidChange(() => provider.refresh())
  watcher.onDidDelete(() => provider.refresh())
  context.subscriptions.push(
    watcher,
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("logic2b.registryUrl")) {
        provider.refresh({ refetch: true })
      }
    }),
    vscode.tasks.onDidEndTaskProcess(async (event) => {
      const task = event.execution.task
      if (task.definition.type !== "logic2b") return
      provider.refresh()
      if (event.exitCode !== 0 || !["init", "add"].includes(task.definition.command)) return
      const folder = task.scope
      if (typeof folder === "object" && "uri" in folder) await generateAgentRules(provider, folder, true)
    }),
  )
}

export function deactivate(): void {}
