# Customer composition — first source slice

Updated 30 September 2026. M3-01 remains in progress; this source slice provides
the shared core, CLI `compose` and MCP `compose_plan` for the customer journey.
It requires a new package release/endpoint deployment before external use.
Check CLI help or MCP `tools/list`; npm rc.2 does not have these additions.

## Explicit requirements

The host interprets a brief and supplies stable requirement ids, static routes,
intent identifiers, roles, required states and action names. Nothing evaluates
source, calls a model, writes a project or installs dependencies. `brief` is
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

## Results and subsequent work

`schemaVersion: 1` includes an exact `registryVersion`, declared target stack
and locale, requirement coverage with evidence, pages/roles, content slot keys,
all state support values, callbacks, consumer and accessibility duties,
deduplicated dependency closure, gaps and metadata confidence. Missing
accessibility contracts remain `unknown`. Locale records intent; no translation
is generated. Target stack is recorded without claiming framework build proof.
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
its standard exit 1. No `--apply` exists in this slice. Inspect the existing
project, preserve customized source with explicit change plans, wire data,
callbacks, routing, persistence and authorization, then separately build and
run the consumer verification workflow. No scaffold request or preview URL is
returned: current starters do not materialize these composed routes.

Bounds: 64 KiB JSON, 24 requirements, eight roles and 16 actions per requirement,
six pages, 32 entries per constraint list, 128 dependency items and 4 MiB fetched
payload bytes per graph and 4 MiB output. Candidate roots (matched blocks plus
inclusions) must total at most 32, matching `install_plan`. Text identifiers are at most 128 characters; static
routes at most 256; brief at most 2,000; version/locale at most 64. Routes allow
`/` or slash-separated ASCII letters, digits, `_` and `-`; query strings,
dynamic segments, encoded segments and traversal are rejected. Duplicate ids,
array entries, unsupported states/schema versions and unknown fields reject
before registry work. File input is UTF-8 JSON and is never executed.

## Uso en español

El agente convierte la solicitud en requisitos explícitos; los identificadores
`browse-customers`, `edit-customer`, `list` y `primary-form` no se traducen.
Puedes usar `"locale": "es-ES"` y las rutas `/clientes` y `/clientes/editar`.
El plan registra ese idioma, pero la aplicación debe proporcionar los textos
traducidos mediante los slots de contenido.

Ejecuta el comando anterior con tu archivo JSON o envía el mismo objeto a
`compose_plan`. Revisa `coverage`, `gaps` y las responsabilidades del consumidor
antes de usar `next.install`. Los callbacks `onSave`, `onCancel`, `onCreate`,
`onEdit` y `onRetry` siguen necesitando implementación. La cobertura declarada
no acredita una aplicación funcional ni una auditoría de accesibilidad.

## Remaining M3-01 scope

Broader intent/role contracts, discovery templates, preset integration, composed
source/scaffold equivalence, three-framework composed consumer builds, studio
composition, dedicated site docs with browser gates and the held-out benchmark
remain pending. M3-02 proposal links are a separate dependent task. Preserve
existing immutable releases; extending metadata requires a new release rather
than editing older content-addressed payloads.
