# Customer composition — metadata and project source

Updated 30 September 2026. M3-01 remains in progress; this source slice provides
the shared core, CLI `compose` and MCP `compose_plan` for the customer journey.
It also exports grounded project files and presets for Next, Vite and Astro.
It requires a new package release/endpoint deployment before external use.
Check CLI help or MCP `tools/list`; npm rc.2 does not have these additions.

## Explicit requirements

The host interprets a brief and supplies stable requirement ids, static routes,
intent identifiers, roles, required states and action names. Planning does not
evaluate source, call a model, write a project or install dependencies. `brief` is
an optional input and does not affect matching or coverage; it is not echoed in
the plan.

| Explicit task | Role | Candidate |
| --- | --- | --- |
| `browse-customers`, `filter-customers` | `list` | `admin-customers-01` |
| `create-customer`, `edit-customer` | `primary-form` | `customer-edit-01` |

The verified payload must declare the requested intent in behavior metadata.
Missing metadata, another task/role, an excluded block or an excluded dependency
produce gaps. The planner does not substitute a login form for customer editing
or infer that a generic table implements customer management.

Save this request as `customer-requirements.json`:

```json
{
  "schemaVersion": 1,
  "stack": "vite",
  "locale": "en",
  "version": "1.0.0-rc.18",
  "requirements": [
    {
      "id": "browse",
      "route": "/customers",
      "task": "browse-customers",
      "roles": ["list"],
      "requiredStates": ["loading", "empty", "no-results", "error"],
      "actions": ["create", "edit", "retry"]
    },
    {
      "id": "edit",
      "route": "/customers/edit",
      "task": "edit-customer",
      "roles": ["primary-form"],
      "requiredStates": ["validation-error", "submitting", "error", "unsaved-changes"],
      "actions": ["save", "cancel"]
    }
  ],
  "constraints": { "maxPages": 2, "avoid": [], "mustInclude": [] }
}
```

From a source checkout:

```bash
pnpm --filter logic2b dev compose /absolute/path/customer-requirements.json --json
```

Call MCP `compose_plan` with the same JSON object. CLI `--registry-version`
overrides request `version`; otherwise CLI uses request `version`, then its
bundled registry version. MCP uses request `version`, defaulting to `next`.
Supply the same exact version for adapter parity. Each operation resolves one
immutable manifest and verifies selected payloads and their dependencies;
integrity failure is an error, never a fallback to mutable registry files.

The example returns two pages, one list and one form. Both requirements are
`partial`: the five named callbacks need consumer wiring. Their declared
loading/error/validation states remain visible as `built-in`. This does not
prove the application supplies the correct status transitions. Removing actions
can yield `covered` metadata; runtime verification is still required. Requiring
`offline` returns a consumer-owned state gap. Asking for `compare-plans` and
`primary-form` returns a gap, empty installation suggestion and low confidence.

## Project source and explicit new-project apply

Add `"output": "project"` to the request, or use CLI `--project`. Optional
`preset` accepts a real `/create` id and is canonicalized before registry reads.
Metadata installation suggestions include its icon library. Project output
applies the same theme/icon transforms as the existing scaffold core and retains
immutable item evidence and update snapshots. One cached verified client handles
selected assets and the theme foundation; a moving channel cannot mix releases.

```bash
pnpm --filter logic2b dev compose /absolute/path/customer-requirements.json --project --json
pnpm --filter logic2b dev compose /absolute/path/customer-requirements.json --apply /tmp/my-new-customer-app --json
```

The first command prints a plan. `--apply` writes its grounded files into a
newly created directory whose parent exists; any existing destination rejects,
including an empty directory. It never installs, starts or builds the app.
Inspect the new project, explicitly install dependencies and run its build.
Apply failures may retain a partially written new directory; inspect it instead
of treating this as the incremental transaction workflow. Existing applications
must use inspect/change plans to preserve customizations.

Project output is `project: null` with named gaps when roles/states are
unsupported, inclusions have no assigned role, a theme foundation conflicts
with exclusions, routes use private underscore segments or locale is outside
English/Spanish. Integrity/malformed-asset failures remain execution errors.
No unsupported need is replaced with a guessed screen.

`project` contains exact registry metadata, framework, preset, icon library,
install item evidence, complete files, commands and consumer notes. Next and
Astro receive native static route entries; Vite uses pathname routing and needs
a history-fallback host. Nested routes and `/index` remain distinct from `/`.
Only declared list/form roles render. The framework/theme foundation is explicit
in `project.items`; it does not grant requirement coverage.

Use the same route for list and form requirements to create/edit within one
customer screen. The generated host supplies synthetic customers, local save,
retry, error and permission demonstrations, validation, submitting, discard and
focus restoration. Form-only pages expose a new draft; list-only pages remain
read-only. Data resets on reload and is independent per route. Navigation warns
about dirty drafts; this is not backend persistence or server authorization.
Original callback coverage stays partial despite local demonstration wiring.
English/Spanish copy is included in project source; other locale targets remain
supported by metadata output for a consumer to implement.

## Results and subsequent work

`schemaVersion: 1` includes an exact `registryVersion`, declared target stack
and locale, requirement coverage with evidence, pages/roles, content slot keys,
all state support values, callbacks, consumer and accessibility duties,
deduplicated dependency closure, gaps and metadata confidence. Missing
accessibility contracts remain `unknown`. Metadata locale records intent;
project output provides EN/ES sample copy. A source plan is not a build result.
The output schema is generated at `/r/schemas/compose-plan.json` on site build.

`covered` means all requested roles and states have declared built-in support
and no requested action needs wiring. `partial` retains a candidate but requires
consumer work. `gap` has no candidate or exceeds the page limit. Each required
state is checked for every selected role. A callback declaration yields partial
coverage, since the tool cannot establish that the callback is implemented.
Confidence summarizes this metadata only: high with no gaps, medium with
partial coverage, low with an uncovered requirement or impossible inclusion.

`constraints.avoid` excludes item names and categories across dependencies.
`mustInclude` adds verified install items, but never grants requirement coverage
without a role. An absent or excluded inclusion suppresses `next.install`.
Otherwise `next.install` contains selected root items and the exact version for
`install_plan`; `items` also includes their full dependency closure. A suggestion
can cover only part of the request, so review `coverage` and `gaps` first.

CLI exit 0 means no declared metadata gaps, 1 means a valid plan with gaps,
and 2 means invalid input or execution failure. Commander usage errors retain
its standard exit 1. Metadata verdicts also apply when project files are
successfully exported/applied: local demo wiring does not remove production gaps.
Do not chain install/build using `&&` when a valid plan deliberately exits 1.
Inspect existing projects, preserve customized source with explicit change plans,
wire real services and separately build/run consumer verification. Preview URLs
remain a later M3-02 contract.

Bounds: 64 KiB JSON, 24 requirements, eight roles and 16 actions per requirement,
six pages, 32 entries per constraint list, 128 dependency items and 4 MiB fetched
payload bytes per graph and 4 MiB output. Candidate roots (matched blocks plus
inclusions) must total at most 32, matching `install_plan`. Text identifiers are at most 128 characters; static
routes at most 256; brief at most 2,000; version/locale at most 64. Routes allow
`/` or slash-separated ASCII letters, digits, `_` and `-`; query strings,
dynamic segments, encoded segments and traversal are rejected. Duplicate ids,
array entries, unsupported states/schema versions and unknown fields reject
before registry work. File input is UTF-8 JSON and is never executed.
Project output adds at most 512 files. Presets are bounded to 256 characters;
supported `output` values are `metadata` (default) and `project`.

## Uso en español

El agente convierte la solicitud en requisitos explícitos; los identificadores
`browse-customers`, `edit-customer`, `list` y `primary-form` no se traducen.
Puedes usar `"locale": "es-ES"` y las rutas `/clientes` y `/clientes/editar`.
La salida de metadatos registra ese idioma; la salida de proyecto incluye los
textos de ejemplo en inglés o español mediante los slots de contenido.

Ejecuta el comando anterior con tu archivo JSON o envía el mismo objeto a
`compose_plan`. Revisa `coverage`, `gaps` y las responsabilidades del consumidor
antes de usar `next.install`. Los callbacks `onSave`, `onCancel`, `onCreate`,
`onEdit` y `onRetry` siguen necesitando implementación. La cobertura declarada
no acredita una aplicación funcional ni una auditoría de accesibilidad.

Para exportar la aplicación de ejemplo usa `"output": "project"` o
`--project`. `--apply /ruta/nueva` crea exclusivamente un proyecto nuevo sin
instalar ni ejecutar dependencias. Usa la misma ruta para lista y formulario si
quieres editar dentro de una pantalla. Los datos del ejemplo son locales y se
restablecen al recargar; la persistencia y los permisos del servidor siguen
pendientes aunque el ejemplo se compile y funcione.

## Remaining M3-01 scope

Broader intent/role contracts, discovery templates, studio
composition, dedicated site docs with browser gates and the held-out benchmark
remain pending. M3-02 proposal links are a separate dependent task. Preserve
existing immutable releases; extending metadata requires a new release rather
than editing older content-addressed payloads.
