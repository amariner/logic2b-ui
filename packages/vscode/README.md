# logic2b ui for VS Code

Browse the logic2b registry, install source components you own, and apply a
theme preset without leaving VS Code.

## Features

- Activity Bar registry grouped into Components, Blocks and Charts.
- Search, refresh, documentation links and installed-item status.
- Single-item and multi-item install through `npx logic2b@latest add`.
- Workspace initialization through `npx logic2b@latest init`.
- Preset application to `theme.css` and `components.json` using the shared
  `@logic2b/tokens` codec.

The extension supports local, SSH, WSL and container workspaces because file
edits use the VS Code workspace API and CLI tasks run in the workspace host.
Restricted Mode is intentionally unsupported: installing components executes a
task and applying a preset writes project files.

## Development VSIX

```bash
pnpm --filter logic2b-ui package:vsix
code --install-extension packages/vscode/dist/logic2b-ui.vsix
```

The extension is currently a repository-built preview. Marketplace publication
will follow only after the publisher identity is approved.
