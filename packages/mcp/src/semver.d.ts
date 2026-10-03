declare module "semver/functions/valid.js" {
  export default function valid(version: string, options?: { includePrerelease?: boolean }): string | null
}

declare module "semver/ranges/valid.js" {
  export default function validRange(range: string, options?: { includePrerelease?: boolean }): string | null
}

declare module "semver/ranges/max-satisfying.js" {
  export default function maxSatisfying(
    versions: readonly string[],
    range: string,
    options?: { includePrerelease?: boolean },
  ): string | null
}
