import { webcrypto } from "node:crypto"

// Node 18 exposes WebCrypto through node:crypto even without its optional global.
// Shared generators remain compatible with browsers and workers.
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true, writable: true })
}
