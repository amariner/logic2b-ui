# Security policy

## Supported versions

logic2b ui is in public beta. Security fixes land on `main` and ship through the
`next` npm channel for `logic2b` (CLI) and `@logic2b/mcp`; the public registry
at `https://ui.logic2b.com` is rebuilt from `main`. Older release candidates
are not patched separately: upgrade to the current `next` version.

| Artifact | Supported |
| --- | --- |
| `logic2b@next`, `@logic2b/mcp@next` | Current release candidate only |
| Registry releases (`/r/versions.json`) | Latest release; older manifests stay immutable and readable |
| VS Code extension preview | CI-built VSIX from `main` |

## Reporting a vulnerability

Please do not open a public issue for security problems. Report privately via
GitHub Security Advisories on this repository
(`https://github.com/amariner/logic2b-ui/security/advisories/new`). If that is
unavailable to you, contact the maintainer through the email on the GitHub
profile of the repository owner. Include the affected package and version, the
registry version if relevant, reproduction steps and the impact you observed.

You should receive an acknowledgement within seven days. We will keep you
informed while the issue is assessed and fixed, credit you in the release notes
if you wish, and ask you to keep details private until a fix is published.

## Scope and design boundaries

Things that help you assess a report:

- The CLI and MCP tools never execute registry content or caller-supplied
  source. Payloads are written to disk only by the CLI (or by the host applying
  an MCP plan); CSS passed to `lint_theme` and `apply_preset` is parsed as text.
- Registry reads resolve one immutable manifest and verify each payload's
  SHA-256 integrity; verified reads never fall back to the unversioned mirrors.
  File paths in payloads are validated against traversal before writing.
- The remote `/mcp` endpoint is stateless, read-only and account-free. Inputs
  are bounded (documented in `packages/mcp/src/limits.ts`); request bodies are
  capped while streaming. It has no filesystem or shell access.
- No telemetry, analytics or credentials are collected by the CLI, MCP server
  or extension.

Reports about missing rate limiting on the public endpoint, or about behavior
that requires a malicious registry URL configured by the user
(`LOGIC2B_REGISTRY`), are welcome but treated as hardening rather than
vulnerabilities unless they demonstrate concrete impact.
