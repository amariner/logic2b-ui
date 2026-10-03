import { BEHAVIOR_STATES, validateBehavior, type RegistryBehavior } from "@logic2b/scaffold/behavior"

const unavailable = (how: string): RegistryBehavior["states"]["idle"] => ({ support: "not-applicable", how })
const consumer = (how: string): RegistryBehavior["states"]["idle"] => ({ support: "consumer", how })
const builtIn = (how: string, transitions?: RegistryBehavior["states"]["idle"]["transitions"], preserves?: string[]): RegistryBehavior["states"]["idle"] => ({ support: "built-in", how, ...(transitions ? { transitions } : {}), ...(preserves ? { preserves } : {}) })
const baseStates = () => Object.fromEntries(BEHAVIOR_STATES.map((name) => [name, unavailable("This state does not apply to this block.")])) as RegistryBehavior["states"]
const slots = (samples: Record<string, string>): RegistryBehavior["content"] => Object.entries(samples).map(([key, sample]) => ({ key, type: "text", path: `content.${key}`, sample, guidance: "Override this key through the content prop; keep labels and recovery actions specific to the user's task." }))

export const BEHAVIOR_CONTRACTS: Record<string, RegistryBehavior> = {
  "admin-customers-01": {
    schemaVersion: 1,
    states: {
      ...baseStates(),
      idle: unavailable("Use success for a loaded list; it does not fetch on mount."),
      loading: builtIn('status="loading"; hide stale rows and announce progress.', ["success", "error", "permission-denied"], ["query"]),
      empty: builtIn('status="success" with customers=[]; show the first-customer action when onAdd and canWrite are supplied.', ["success"]),
      "no-results": builtIn('A nonmatching query on a nonempty customer collection; Clear search restores the unfiltered list.', ["success"], ["customers"]),
      error: builtIn('status="error" and optional error; onRetry requests recovery without clearing query.', ["loading", "success"], ["query"]),
      success: builtIn('status="success" (default) and customers; optional successMessage announces an application-confirmed save.', ["loading", "error", "empty", "no-results"], ["query"]),
      submitting: consumer("Compose customer-edit-01 and supply its submitting status while the application saves."),
      "validation-error": consumer("Compose customer-edit-01 for field validation and server validation errors."),
      "permission-denied": builtIn('status="permission-denied" hides customer records. canWrite=false preserves read access and disables add/edit actions.'),
      unsaved: consumer("The edit form guards Cancel unless onCancelRequest delegates it to the host; guard dialog dismissal/navigation too."),
      offline: consumer("The application detects connectivity and selects error/retry or its own offline explanation."),
      partial: consumer("The application owns pagination and partial-result disclosure; customers is the supplied collection."),
    },
    content: slots({ title: "Customers", description: "Your customer base, segments and lifetime value.", addCustomer: "Add customer", allCustomers: "All customers", searchLabel: "Search customers", searchPlaceholder: "Search by name or email...", loading: "Loading customers...", emptyTitle: "No customers yet", emptyDescription: "Add your first customer to start building your customer base.", noResultsTitle: "No matching customers", noResultsDescription: "Try another name or email, or clear the search to see all customers.", clearSearch: "Clear search", errorTitle: "Customers could not be loaded", retry: "Try again", permissionTitle: "You cannot view customers" }),
    actions: [
      { name: "search", props: ["query", "onQueryChange"], consumer: ["Supply both props for a controlled query; otherwise local search is built in."] },
      { name: "create", props: ["onAdd", "canWrite"], consumer: ["Open and authorize a creation flow. No callback means the action is disabled."] },
      { name: "edit", props: ["onEdit", "canWrite"], consumer: ["Open the selected customer editor and persist successful changes to customers."] },
      { name: "retry", props: ["onRetry"], consumer: ["Retry the data request and provide the resulting status; no request is made by the block."] },
    ],
    intents: ["browse-customers", "filter-customers", "create-customer", "edit-customer", "recover-request"],
    journey: { after: ["customer-edit-01"] },
    responsive: { viewports: ["mobile", "desktop"], strategy: "At narrow widths, retain customer identity, segment and edit action; secondary columns appear from sm/md. The application chooses which data to expose.", touchTargets: "44px" },
    consumer: ["Supply customers and asynchronous request status; the default records are examples, not a backend.", "Authorize operations on the server and set canWrite/status from that outcome; disabled buttons are not an authorization boundary.", "Connect onAdd, onEdit and onRetry; update customers only after an application-confirmed save.", "Preserve local columns, content overrides and tokens when adapting or updating the copied source."],
  },
  "customer-edit-01": {
    schemaVersion: 1,
    states: {
      ...baseStates(),
      idle: builtIn('Controlled value/onChange with status="idle"; edit name, email, company and segment.', ["submitting", "validation-error", "unsaved"]),
      loading: builtIn('status="loading" while the host loads the customer; fields and actions are unavailable.', ["idle", "error", "permission-denied"]),
      empty: unavailable("A form always has a value object; use empty fields with idle for customer creation."),
      "no-results": unavailable("Search results belong to the list block."),
      error: builtIn('status="error" and optional error; onSubmit retries the preserved controlled values.', ["submitting", "idle"], ["value"]),
      success: builtIn('status="success" only after the application confirms a save; successMessage can replace the confirmation.', ["idle"], ["value"]),
      submitting: builtIn('status="submitting"; disable inputs, save and cancel, announce progress and ignore duplicate submission.', ["success", "error", "permission-denied"], ["value"]),
      "validation-error": builtIn("Submit missing/invalid name/email, or provide validationErrors for server field errors; link errors to controls and focus the first invalid field.", ["idle", "submitting"], ["value"]),
      "permission-denied": builtIn('status="permission-denied" explains the denied operation and disables edits/submission.', ["idle"], ["value"]),
      unsaved: builtIn("Cancel a dirty form to show Keep editing/Discard changes. initialValue or dirty defines the baseline. onCancelRequest delegates all cancellation requests to the host instead.", ["idle"], ["value"]),
      offline: consumer("The host detects connectivity and supplies error or another offline explanation; values stay controlled."),
      partial: unavailable("This form edits one complete customer value; partial records must be completed by the host."),
    },
    content: slots({ title: "Customer details", save: "Save customer", saving: "Saving customer...", retry: "Try saving again", cancel: "Cancel", nameLabel: "Name", emailLabel: "Email", companyLabel: "Company", segmentLabel: "Segment", loading: "Loading customer details...", validationTitle: "Check the highlighted fields.", errorTitle: "Customer could not be saved", errorDescription: "Your changes are still here. Try saving again.", successTitle: "Customer saved", permissionTitle: "You cannot edit this customer", discardTitle: "Discard unsaved changes?", keepEditing: "Keep editing", discardChanges: "Discard changes" }),
    actions: [
      { name: "change", props: ["value", "onChange"], consumer: ["Store the draft value and a baseline for dirty tracking; keep it through request failures."] },
      { name: "save", props: ["onSubmit", "status", "validationErrors"], consumer: ["Set submitting synchronously, persist/authorize on the server, then provide success/error/permission-denied and updated field errors."] },
      { name: "cancel", props: ["onCancel", "onCancelRequest", "initialValue", "dirty"], consumer: ["Close/discard only after onCancel is called. If supplying onCancelRequest, own the dirty confirmation for every dismissal request, including Cancel; guard parent dialog dismissal and route navigation."] },
    ],
    intents: ["create-customer", "edit-customer", "recover-request"],
    journey: { before: ["admin-customers-01"], after: ["admin-customers-01"] },
    responsive: { viewports: ["mobile", "desktop"], strategy: "Single-column labeled form with wrapping messages and reachable save/cancel/discard actions.", touchTargets: "44px" },
    consumer: ["Supply controlled value/onChange and an application-owned onSubmit; there is no backend or automatic persistence.", "Enforce permissions and authoritative validation on the server; client validation is basic name/email guidance.", "Set submitting before awaiting a request and keep the value on failures; do not show success before persistence confirms it.", "The built-in unsaved guard protects Cancel unless onCancelRequest delegates it to the host. The host must guard all dismissal requests, Escape/outside clicks/navigation, retain focus and prevent dismissal during submission."],
  },
}
for (const contract of Object.values(BEHAVIOR_CONTRACTS)) validateBehavior(contract)
export function behaviorFor(name: string): RegistryBehavior | undefined {
  return Object.hasOwn(BEHAVIOR_CONTRACTS, name) ? BEHAVIOR_CONTRACTS[name] : undefined
}
