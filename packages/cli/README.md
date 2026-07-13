# logic2b

The command-line tool for [logic2b ui](https://ui.logic2b.com) — add beautifully
designed, copy-paste components to your project. You own the code.

## Usage

Initialize your project (creates `components.json` and the `cn()` helper):

```bash
npx logic2b@latest init
```

Add components (registry dependencies are resolved automatically):

```bash
npx logic2b@latest add button card dialog
```

List everything available in the registry:

```bash
npx logic2b@latest list
```

## Commands

| Command | Description |
| --- | --- |
| `init` | Create `components.json` and install the `cn()` helper. |
| `add <components...>` | Add one or more components and their dependencies. |
| `list` | List all components available in the registry. |

`init` and `add` install the required npm packages automatically, using
whichever package manager the project already uses (`packageManager` field or
lockfile — pnpm, npm, yarn or bun). Pass `--no-install` to just print the
install command instead.

Run `npx logic2b@latest <command> --help` for options.

## Documentation

Full docs, live previews and the theme builder are at
**[ui.logic2b.com](https://ui.logic2b.com)**.

## License

MIT © [logic2b](https://ui.logic2b.com). See [LICENSE](./LICENSE); third-party
notices in the
[project repository](https://github.com/amariner/logic2b-ui/blob/main/THIRD-PARTY-LICENSES.md).
