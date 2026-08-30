declare module "semver" {
  export function validRange(range: string, options?: { includePrerelease?: boolean }): string | null
  export function maxSatisfying(
    versions: readonly string[],
    range: string,
    options?: { includePrerelease?: boolean },
  ): string | null
}
