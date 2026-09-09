import { PROJECT_LIMITS } from "./project-context.ts"
const text = { type: "string" }
const path = { type: "string", minLength: 1, maxLength: PROJECT_LIMITS.pathLength }
const digest = { type: "string", pattern: "^[a-f0-9]{64}$" }
const boolean = { type: "boolean" }
const integer = { type: "integer", minimum: 0 }
const array = (items: Record<string, unknown>, maxItems?: number) => ({ type: "array", items, ...(maxItems === undefined ? {} : { maxItems }) })
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({ type: "object", properties, required, additionalProperties: false })
const capabilities = object({ fileWrites: boolean, dependencyInstall: boolean, browser: boolean })
const framework = object({ name: { enum: ["next", "vite", "astro", "unknown"] }, version: text }, ["name"])
export const PROJECT_SNAPSHOT_SCHEMA = object({
  schemaVersion: { const: 1 }, appRoot: path,
  configurations: array(object({ path, content: { type: "string", maxLength: PROJECT_LIMITS.configBytes } }), PROJECT_LIMITS.configurations),
  files: array(object({ path, sha256: digest, baseSha256: digest }, ["path", "sha256"]), PROJECT_LIMITS.inventory),
  applications: array(path, 100), capabilities,
}, ["schemaVersion", "configurations", "files"])
export const PROJECT_CONTEXT_SCHEMA = object({
  schemaVersion: { const: 1 }, appRoot: path, framework, reactVersion: text, tailwindVersion: text, sourceRoot: path,
  aliases: { type: "object", additionalProperties: array(path) }, componentAliases: { type: "object", additionalProperties: path },
  stylesheets: array(path), stylesheetEntry: path, iconLibrary: text, preset: text, registryVersion: text, registrySelector: text,
  installed: array(object({ name: text, files: array(object({ registryPath: path, path, sha256: digest, modified: boolean, state: { enum: ["present", "missing", "unresolved"] } }, ["registryPath", "state"])) })),
  selectedFiles: array(object({ path, sha256: digest })), capabilities,
  evidence: array(object({ field: text, source: text, confidence: { enum: ["known", "inferred"] } })), unknowns: array(text),
}, ["schemaVersion", "appRoot", "framework", "aliases", "componentAliases", "stylesheets", "installed", "selectedFiles", "capabilities", "evidence", "unknowns"])
export const PROJECT_INSPECTION_SCHEMA = object({
  schemaVersion: { const: 1 }, detail: { enum: ["summary", "full"] },
  summary: object({ framework, appRoot: path, sourceRoot: path, installedItems: integer, inspectedFiles: integer, modifiedFiles: integer, unresolvedFiles: integer, aliasCount: integer, applications: array(path), applicationCount: integer, capabilities }, ["framework", "appRoot", "installedItems", "inspectedFiles", "modifiedFiles", "unresolvedFiles", "aliasCount", "applications", "applicationCount", "capabilities"]),
  unknownCount: integer, unknowns: array(text), guidance: array(text), context: PROJECT_CONTEXT_SCHEMA,
}, ["schemaVersion", "detail", "summary", "unknownCount", "unknowns", "guidance"])
