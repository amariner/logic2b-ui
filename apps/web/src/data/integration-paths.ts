export const INTEGRATION_PATHS = [
  {
    id: "website",
    name: "Website + Copy Prompt",
    href: "/docs",
    access: "Browser",
    bestFor: "Exploring visually and handing a complete brief to an assistant.",
  },
  {
    id: "cli",
    name: "CLI",
    href: "/docs/installation",
    access: "Terminal",
    bestFor: "A developer adding source directly to an existing repository.",
  },
  {
    id: "vscode",
    name: "VS Code",
    href: "/docs/vscode",
    access: "Editor extension",
    bestFor: "Developers who want visual discovery, CLI-backed installs and presets in their workspace.",
  },
  {
    id: "remote-mcp",
    name: "Remote MCP",
    href: "/docs/llms",
    access: "Streamable HTTP",
    bestFor: "Agents without a shell, local Node runtime or registry client.",
  },
  {
    id: "local-mcp",
    name: "Local MCP",
    href: "/docs/llms",
    access: "stdio via npx",
    bestFor: "Terminal-backed agents that prefer MCP's structured contracts.",
  },
  {
    id: "registry",
    name: "Raw registry",
    href: "/r/index.json",
    access: "HTTPS JSON",
    bestFor: "Custom tooling that owns dependency resolution and file writes.",
  },
] as const;

export type IntegrationPathId = (typeof INTEGRATION_PATHS)[number]["id"];

type CapabilityValue = "Yes" | "No" | "Guided" | "Manual" | "Plan only";

export interface IntegrationCapability {
  label: string;
  detail: string;
  values: Record<IntegrationPathId, CapabilityValue>;
}

export const INTEGRATION_CAPABILITIES: IntegrationCapability[] = [
  {
    label: "No shell required",
    detail: "The access method itself works without a terminal on the client.",
    values: {
      website: "Yes",
      cli: "No",
      vscode: "Yes",
      "remote-mcp": "Yes",
      "local-mcp": "No",
      registry: "Yes",
    },
  },
  {
    label: "Returns complete source",
    detail: "The path exposes the registry files rather than an opaque runtime component.",
    values: {
      website: "Yes",
      cli: "Yes",
      vscode: "Yes",
      "remote-mcp": "Yes",
      "local-mcp": "Yes",
      registry: "Yes",
    },
  },
  {
    label: "Resolves transitive items",
    detail: "Registry dependencies are expanded into the resulting install operation or plan.",
    values: {
      website: "Guided",
      cli: "Yes",
      vscode: "Yes",
      "remote-mcp": "Yes",
      "local-mcp": "Yes",
      registry: "Manual",
    },
  },
  {
    label: "Writes project files",
    detail: "The logic2b tool mutates the repository itself. MCP deliberately returns a plan for its host agent to write.",
    values: {
      website: "No",
      cli: "Yes",
      vscode: "Yes",
      "remote-mcp": "Plan only",
      "local-mcp": "Plan only",
      registry: "No",
    },
  },
  {
    label: "Complete starter plan",
    detail: "Produces a runnable Next.js, Vite or Astro application contract from an empty directory.",
    values: {
      website: "Guided",
      cli: "No",
      vscode: "No",
      "remote-mcp": "Yes",
      "local-mcp": "Yes",
      registry: "Manual",
    },
  },
  {
    label: "Exact preset application",
    detail: "Applies the complete /create preset contract instead of only returning the base theme.",
    values: {
      website: "Guided",
      cli: "Yes",
      vscode: "Yes",
      "remote-mcp": "Yes",
      "local-mcp": "Yes",
      registry: "Manual",
    },
  },
  {
    label: "Theme contract lint",
    detail: "Checks missing, duplicate and invalid tokens, drift and contrast regressions.",
    values: {
      website: "No",
      cli: "No",
      vscode: "No",
      "remote-mcp": "Yes",
      "local-mcp": "Yes",
      registry: "No",
    },
  },
];

const PATHS_ES: Record<IntegrationPathId, { name: string; access: string; bestFor: string }> = {
  website: {
    name: "Web + Copy Prompt",
    access: "Navegador",
    bestFor: "Explorar visualmente y entregar un encargo completo a un asistente.",
  },
  cli: {
    name: "CLI",
    access: "Terminal",
    bestFor: "Desarrolladores que añaden código a un repositorio existente.",
  },
  vscode: {
    name: "VS Code",
    access: "Extensión del editor",
    bestFor: "Desarrolladores que quieren descubrimiento visual, instalación mediante CLI y presets en su workspace.",
  },
  "remote-mcp": {
    name: "MCP remoto",
    access: "HTTP streamable",
    bestFor: "Agentes sin shell, Node local ni cliente propio del registro.",
  },
  "local-mcp": {
    name: "MCP local",
    access: "stdio mediante npx",
    bestFor: "Agentes con terminal que prefieren contratos MCP estructurados.",
  },
  registry: {
    name: "Registro directo",
    access: "JSON por HTTPS",
    bestFor: "Herramientas propias que resuelven dependencias y escriben archivos.",
  },
};

const CAPABILITIES_ES: Record<string, { label: string; detail: string }> = {
  "No shell required": {
    label: "No requiere shell",
    detail: "El método de acceso funciona sin terminal en el cliente.",
  },
  "Returns complete source": {
    label: "Devuelve el código completo",
    detail: "Expone archivos del registro, no un componente runtime opaco.",
  },
  "Resolves transitive items": {
    label: "Resuelve elementos transitivos",
    detail: "Expande dependencias del registro en la instalación o el plan.",
  },
  "Writes project files": {
    label: "Escribe archivos del proyecto",
    detail: "La herramienta modifica el repositorio; MCP devuelve un plan explícito.",
  },
  "Complete starter plan": {
    label: "Plan de starter completo",
    detail: "Produce una app Next.js, Vite o Astro ejecutable desde un directorio vacío.",
  },
  "Exact preset application": {
    label: "Aplicación exacta del preset",
    detail: "Aplica todo el contrato de /create y no solo el tema base.",
  },
  "Theme contract lint": {
    label: "Lint del contrato de tema",
    detail: "Comprueba tokens, deriva y regresiones de contraste.",
  },
};

const VALUES_ES: Record<CapabilityValue, string> = {
  Yes: "Sí",
  No: "No",
  Guided: "Guiado",
  Manual: "Manual",
  "Plan only": "Solo plan",
};

export function localizedIntegrationPaths(locale: "en" | "es" = "en") {
  if (locale === "en") {
    return { paths: INTEGRATION_PATHS, capabilities: INTEGRATION_CAPABILITIES };
  }
  return {
    paths: INTEGRATION_PATHS.map((path) => ({ ...path, ...PATHS_ES[path.id] })),
    capabilities: INTEGRATION_CAPABILITIES.map((capability) => ({
      ...capability,
      ...CAPABILITIES_ES[capability.label],
      values: Object.fromEntries(
        Object.entries(capability.values).map(([id, value]) => [id, VALUES_ES[value]]),
      ) as Record<IntegrationPathId, string>,
    })),
  };
}

export function integrationPathsMarkdown(locale: "en" | "es" = "en"): string {
  const { paths, capabilities } = localizedIntegrationPaths(locale);
  const header = `| ${locale === "es" ? "Capacidad" : "Capability"} | ${paths.map((path) => path.name).join(" | ")} |`;
  const separator = `| --- | ${paths.map(() => "---").join(" | ")} |`;
  const rows = capabilities.map(
    (capability) =>
      `| ${capability.label} | ${paths.map((path) => capability.values[path.id]).join(" | ")} |`,
  );
  const notes = paths.map(
    (path) => `- **${path.name}:** ${path.bestFor}`,
  );

  return [header, separator, ...rows, "", ...notes].join("\n");
}
