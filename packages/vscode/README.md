# logic2b ui for VS Code

Browse the logic2b registry, install source components you own, and apply a
theme preset without leaving VS Code.

## Features

- Activity Bar registry grouped into Components, Blocks and Charts.
- Search, refresh, documentation links and installed-item status.
- Single-item and multi-item install through `npx logic2b@next add`.
- Workspace initialization through `npx logic2b@next init`.
- Preset application to `theme.css` and `components.json` using the shared
  `@logic2b/tokens` codec.
- **Generate Agent Rules…** writes shared managed instructions and a separate
  design reference in AGENTS, Claude, Cursor or Copilot formats.
- Successful initialization/installation refreshes the configured managed
  sections, preserving project instructions outside the markers.

The extension supports local, SSH, WSL and container workspaces because file
edits use the VS Code workspace API and CLI tasks run in the workspace host.
Restricted Mode is intentionally unsupported: installing components executes a
task and applying a preset writes project files.

`logic2b.agentRules.formats` selects automatic formats (default: `agents`).
`logic2b.agentRules.enabled: false` opts out of automatic refresh; the explicit
command still works. When opting out, the extension checks CLI help and adds
`--no-agent-rules` only if that CLI supports it, preserving compatibility with
the old published package. Rules generation itself uses workspace files and
the shared pure generator, with no registry request. It rejects dirty files,
symlinked rule paths, malformed markers and stale file snapshots before edits.
Automatic refresh also respects `logic2b.agentRules: false` in `components.json`;
explicit generation keeps that persistent preference unchanged.

## Development VSIX

```bash
pnpm --filter logic2b-ui package:vsix
code --install-extension packages/vscode/dist/logic2b-ui.vsix
```

The extension is currently a repository-built preview. Marketplace publication
will follow only after the publisher identity is approved.
