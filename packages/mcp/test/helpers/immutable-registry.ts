/**
 * Immutable registry fixture builder. Produces the same shapes the site
 * publishes — `/r/versions.json`, `/r/versions/<v>.json` manifests and
 * content-addressed `/r/content/<sha256>.json` payloads — so tests exercise
 * the verified reader instead of loosening it to fit mutable-mirror mocks.
 * Routes are mutable on purpose: tests tamper, delete and republish.
 */
import { createHash } from "node:crypto"

import { changelogUrl, demosIndexUrl, demoUrl, versionsUrl, type DemoEntry, type DemoIndexEntry, type FetchLike } from "../../src/registry.ts"

export interface FixtureItem {
  name: string
  type: string
  title?: string
  description?: string
  categories?: string[]
  version?: string
  dependencies?: string[]
  registryDependencies?: string[]
  files?: { path: string; type: string; content: string }[]
  [extra: string]: unknown
}

export interface ReleaseOptions {
  channel?: string
  releasedAt?: string
}

export interface ImmutableRegistryOptions {
  base?: string
  version?: string
  channel?: string
  /** Extra channels, e.g. `{ stable: "^1.0.0" }`. */
  channels?: Record<string, string>
  items: FixtureItem[]
  demos?: { index: DemoIndexEntry[]; entries: DemoEntry[] }
}

export class ImmutableRegistry {
  readonly base: string
  readonly routes = new Map<string, string>()
  /** Every URL requested through `fetchImpl`, in order. */
  readonly calls: string[] = []
  readonly fetchImpl: FetchLike
  readonly channels: Record<string, string>
  readonly releases: { version: string; channel: string; releasedAt: string; manifest: string }[] = []
  private readonly integrities = new Map<string, Map<string, string>>()
  private readonly contents = new Map<string, Map<string, string>>()
  version: string

  constructor({
    base = "https://reg.test",
    version = "1.0.0",
    channel = "next",
    channels = {},
    items,
    demos,
  }: ImmutableRegistryOptions) {
    this.base = base
    this.version = version
    this.channels = { ...channels }
    this.fetchImpl = async (url: string) => {
      this.calls.push(url)
      const body = this.routes.get(url)
      return body === undefined
        ? { ok: false, status: 404, text: async () => "Not found" }
        : { ok: true, status: 200, text: async () => body }
    }
    this.publish(version, items, { channel })
    if (demos) {
      this.routes.set(demosIndexUrl(base), JSON.stringify(demos.index))
      for (const demo of demos.entries) this.routes.set(demoUrl(base, demo.name), JSON.stringify(demo))
    }
  }

  /** Append a release, move its channel and `latest` to it. */
  publish(version: string, items: FixtureItem[], { channel = "next", releasedAt = "2026-08-29" }: ReleaseOptions = {}) {
    const manifestPath = `/r/versions/${version}.json`
    const integrities = new Map<string, string>()
    const contents = new Map<string, string>()
    const manifestItems = items.map((item) => {
      const { version: itemVersion, ...payload } = item
      const text = JSON.stringify({ description: item.name, ...payload })
      const digest = createHash("sha256").update(text)
      const integrity = `sha256-${digest.digest("base64")}`
      const content = `/r/content/${createHash("sha256").update(text).digest("hex")}.json`
      this.routes.set(`${this.base}${content}`, text)
      integrities.set(item.name, integrity)
      contents.set(item.name, content)
      const changelog = `/r/changelog/${item.name}.json`
      if (!this.routes.has(changelogUrl(this.base, item.name))) {
        this.routes.set(
          changelogUrl(this.base, item.name),
          JSON.stringify({
            schemaVersion: 1,
            name: item.name,
            currentVersion: itemVersion ?? version,
            changes: [{ version: itemVersion ?? version, releasedAt, kind: "baseline", summary: "Initial." }],
          })
        )
      }
      return {
        name: item.name,
        type: item.type,
        ...(item.title ? { title: item.title } : {}),
        description: item.description ?? item.name,
        ...(item.categories ? { categories: item.categories } : {}),
        version: itemVersion ?? version,
        registryVersion: version,
        integrity,
        content,
        changelog,
        ...(item.accessibility ? { accessibility: `/r/${item.name}.json#accessibility` } : {}),
        ...(item.api ? { api: `/r/${item.name}.json#api` } : {}),
      }
    })
    this.integrities.set(version, integrities)
    this.contents.set(version, contents)
    this.routes.set(
      `${this.base}${manifestPath}`,
      JSON.stringify({ schemaVersion: 1, version, channel, releasedAt, items: manifestItems })
    )
    this.releases.unshift({ version, channel, releasedAt, manifest: manifestPath })
    this.channels[channel] = version
    this.version = version
    this.writeVersions()
    return this
  }

  /** Rewrite `/r/versions.json` from the current releases and channels. */
  writeVersions(latest = this.version) {
    this.routes.set(
      versionsUrl(this.base),
      JSON.stringify({ schemaVersion: 1, latest, channels: this.channels, versions: this.releases })
    )
  }

  get versionsUrl() {
    return versionsUrl(this.base)
  }

  manifestUrl(version = this.version) {
    return `${this.base}/r/versions/${version}.json`
  }

  contentUrl(name: string, version = this.version) {
    const content = this.contents.get(version)?.get(name)
    if (!content) throw new Error(`fixture has no ${name}@${version}`)
    return `${this.base}${content}`
  }

  integrity(name: string, version = this.version) {
    const integrity = this.integrities.get(version)?.get(name)
    if (!integrity) throw new Error(`fixture has no ${name}@${version}`)
    return integrity
  }

  /** Replace a published payload without updating its manifest integrity. */
  tamper(name: string, mutate: (item: Record<string, unknown>) => Record<string, unknown>, version = this.version) {
    const url = this.contentUrl(name, version)
    this.routes.set(url, JSON.stringify(mutate(JSON.parse(this.routes.get(url)!))))
    return this
  }

  /** Replace the manifest body for a release (malformed-manifest cases). */
  replaceManifest(body: unknown, version = this.version) {
    this.routes.set(this.manifestUrl(version), typeof body === "string" ? body : JSON.stringify(body))
    return this
  }

  callsTo(url: string) {
    return this.calls.filter((entry) => entry === url).length
  }
}

/** Legacy mutable mirror URLs: verified reads must never request these. */
export function mirrorUrls(base: string, names: string[]) {
  return [`${base}/r/index.json`, ...names.map((name) => `${base}/r/${encodeURIComponent(name)}.json`)]
}
