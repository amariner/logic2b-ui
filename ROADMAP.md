# logic2b ui — Interfaces agents can build, verify and maintain

Updated: 5 September 2026. This is the canonical product direction and delivery
order. [EXECUTION.md](./docs/EXECUTION.md) is the actionable queue;
[implementation guides](./docs/guides/README.md) define individual contracts.
The previous roadmap is preserved in [ROADMAP-HISTORY.md](./ROADMAP-HISTORY.md).

## Product promise

Give a coding agent the design system, context and evidence it needs to deliver
a usable interface and keep improving it without losing the user's design or
customizations. The code belongs to the consuming project.

Our first audience is developers and small teams building React SaaS products,
dashboards and internal tools with coding agents. Our reference journey is a
customer-management screen: browse/filter, create/edit, recover from an error,
use it on mobile, then change and update it without losing local work.

Two connected jobs define the product:

1. **Build interfaces with agents:** understand the existing project, compose
   from real components, review the result, apply bounded changes and verify.
2. **Build interfaces for agents:** make runs, tool activity, approval scope,
   artifacts, cancellation and recovery understandable to the human user.

The first job has priority. A broad component catalog, another chat kit or an
MCP endpoint alone is not evidence that we solve either job better.

## What exists and what does not

The repository already implements the registry, theme/typeset studio, React
components and blocks, CLI, local/remote MCP, three starter families, token
exports, three-way CLI updates, component accessibility metadata, generated
API docs and consumer/visual/accessibility test infrastructure.

Project inspection, incremental change plans, behavior/content contracts,
`review_ui`, consumer runtime verification, structured composition, proposal
links and the agent-run kit are **planned**, unless the execution queue links
a completed implementation and its evidence. Do not advertise these as shipped.
Versioned integrity exists, but the MCP's omitted-version path still reads
mutable mirrors until M0-03 is implemented.

## Delivery milestones

| Milestone | User outcome | Deliverables | Exit evidence |
| --- | --- | --- | --- |
| M0 — credible public beta | An external developer understands and installs the advertised product | Honest landing/onboarding; consistent beta commands; verified registry default; typed MCP results and bounded inputs; contribution/release guidance | Clean-consumer install of advertised artifacts, working human links, protocol regression tests, recorded first-use attempts |
| M1 — complete reference interface | The customer-management journey works beyond the happy path | States/content/actions on priority blocks; distributed agent rules; project context; first high-confidence review rules | Loading, empty, error, success, submitting and permission states; keyboard/mobile tests; scoped static findings and known unknowns |
| M2 — safe iteration | A second agent request preserves the first implementation | Incremental change plans with preconditions; conflict handling; consumer runtime verification | Customized fixture survives modification and upstream update; stale plans reject; repeat apply is a no-op; replayable browser evidence |
| M3 — composition people can inspect | The proposed screen is the one that gets built | Structured requirements; composition validator; exact-version proposal; forms/tables from schemas; one MCP Apps pilot | Preview/install equivalence, explicit gaps, validated examples in all supported stacks, link fallback in unsupported hosts |
| M4 — understandable agent products | People can follow, intervene in and recover an agent run | One complete agent-run block, approvals, artifact diff, failure/cancel/retry states; optional runtime adapters | Deterministic event replay and accessible interactions; no execution after denial; announced state transitions |
| M5 — demonstrate advantage | Improvements survive comparison and real use | Repeated comparative evaluations, external contributor pilots, optional aggregate feedback | Published method, raw evidence, failures and measured human corrections; opt-in only |

M5 evaluation design starts in M0; measurements accompany every milestone.
Do not wait for telemetry infrastructure to observe five consenting pilot
developers. Milestones express dependencies, not promises about calendar dates.
The earlier November trademark/release expectation is historical context;
brand/publication decisions and technical readiness are tracked separately.

## Execution order

Start with M0-01 through M0-04 in [the queue](./docs/EXECUTION.md). Then deliver
one vertical customer-management slice across M1/M2 before extending contracts
to every block. Each task has an owner, dependencies, scoped changes and a
verification handoff. Status must be `ready`, `in-progress`, `blocked` or `done`;
`done` requires implementation and passing relevant gates, not a design doc.

Keep one active implementation per agent. Independent agents may work on
disjoint packages only after agreeing ownership; shared contracts land first.
No automatic authorization to publish npm packages, change repository
visibility or contact people is implied by a roadmap task.

## Product and architecture decisions

- **The host reasons; our tools ground and verify.** No model API inside the
  registry/MCP server. The host turns a brief into explicit requirements;
  deterministic tools validate coverage, compatibility, states and gaps.
- **Existing projects first.** Detect aliases, versions, installed components,
  tokens and customizations before proposing writes. Never assume a blank app.
- **One core across surfaces.** CLI, local/remote MCP and site consume shared
  contracts. A remote MCP cannot inspect a filesystem or execute a build by
  itself: the host supplies bounded context and runs available checks.
- **Plans are inspectable data.** Use exact versions, file preconditions,
  declared operations and evidence. Applying a plan is the host's responsibility;
  existing user authorization should not become redundant approval prompts.
- **Verification states its limits.** Static analysis, runtime assertions and
  human design judgment are different evidence. Native HTML is not inherently
  a defect. Unknown is not pass. A score is not an accessibility certificate.
- **Design quality is part of completion.** Information hierarchy, content
  length, responsive behavior, keyboard operation and failure/recovery states
  must be assessed in the reference journey, not only in isolated components.
- **Context has a cost.** Prefer compact discovery and selective detail. Measure
  input/output bytes, tool calls, elapsed time and available token usage.
- **Interoperate.** Stay shadcn-compatible. Adopt useful standards and small
  adapters; avoid duplicating established ecosystem features without evidence.
- **UI ownership stays clear.** No backend product platform, model orchestration
  runtime, auth service or universal visual editor in the core.

## Evidence and success measures

Primary outcome: the share of reference tasks that meet functional and design
criteria without human corrective edits, including a subsequent change.
Track time to first useful screen, number of human corrections, required-state
coverage, accessibility/keyboard failures, local-edit preservation and context
cost. Define the denominator, test environment and measurement window.

Benchmark the same agent and task under baseline documentation, existing
CLI/MCP and the new context/contracts/review workflow. Use at least five
independent attempts per condition for the pilot; report spread and all
failures, not just the best run. Treat this as pilot evidence, not a broad
statistical claim. Keep held-out tasks and independent runtime checks so a
review rule cannot award itself proof of usability. See guide 14.

## Deferred until evidence supports them

Framework ports, community registry hosting, theme marketplace, a full Figma
component library, industrial/HMI tooling and a broad AI chat component catalog.
Maintain existing capabilities, but do not grow these lanes ahead of M1/M2.
User preferences (guide 08) are not decorative: bring forward the accessibility
parts when the reference journey exposes a need. Do not interpret normal
post-install customization as product failure without user feedback.

## Release discipline

The beta must install the candidate that the docs demonstrate. Keep npm
dist-tags explicit and preserve stable users; publish only through
[RELEASING.md](./RELEASING.md). GitHub integration and npm publication are
separate operations. For each release, record exact commit, registry version,
CLI/MCP versions, tests actually run, known gaps and rollback path.
