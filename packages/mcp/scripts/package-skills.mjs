import { cp, mkdir, rm } from "node:fs/promises"
const destination = new URL("../skills/logic2b-ui/", import.meta.url)
await rm(new URL("../skills/", import.meta.url), { recursive: true, force: true })
await mkdir(destination, { recursive: true })
await cp(new URL("../../../skills/logic2b-ui/SKILL.md", import.meta.url), new URL("SKILL.md", destination))
