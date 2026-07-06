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

Run `npx logic2b@latest <command> --help` for options.

## Documentation

Full docs, live previews and the theme builder are at
**[ui.logic2b.com](https://ui.logic2b.com)**.

## License

MIT
