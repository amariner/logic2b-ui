declare module "cloudflare:workers" {
  export const env: {
    ASSETS?: {
      fetch: typeof fetch
    }
  }
}
