import {
  SCAFFOLD_STARTERS,
  SCAFFOLD_STARTER_DEFINITIONS,
  type ScaffoldStarter,
} from "@logic2b/scaffold"

export interface LaunchDemo {
  name: ScaffoldStarter
  title: string
  description: string
  items: readonly string[]
  command: string
  previewHref: string
  accent: string
}

const ACCENTS: Record<ScaffoldStarter, string> = {
  marketing: "from-fuchsia-500/24 via-violet-500/10 to-transparent",
  dashboard: "from-cyan-500/24 via-blue-500/10 to-transparent",
  auth: "from-amber-500/24 via-orange-500/10 to-transparent",
}

export const LAUNCH_DEMOS: readonly LaunchDemo[] = SCAFFOLD_STARTERS.map(
  (name) => {
    const definition = SCAFFOLD_STARTER_DEFINITIONS[name]
    const projectName = `logic2b-${name}`

    return {
      name,
      title: definition.title,
      description: definition.description,
      items: definition.items,
      command: `pnpm dlx logic2b init --cwd ${projectName} --template vite --starter ${name} --name ${projectName}`,
      previewHref: `/demos/launch/${name}`,
      accent: ACCENTS[name],
    }
  },
)

export function getLaunchDemo(name: string): LaunchDemo | undefined {
  return LAUNCH_DEMOS.find((demo) => demo.name === name)
}
