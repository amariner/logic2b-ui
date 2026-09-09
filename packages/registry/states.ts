import { BEHAVIOR_STATES, type RegistryBehavior } from "../scaffold/src/behavior.ts"
const state = (how: string, transition: string, support: "built-in" | "consumer" | "not-applicable" = "built-in") => ({ support, how, transition })
const base = Object.fromEntries(BEHAVIOR_STATES.map(name => [name, state("Not applicable to this block.", "No transition owned by this block.", "not-applicable")])) as RegistryBehavior["states"]
const slot = (key: string, sample: string) => ({ key, path: `content.${key}`, type: "text" as const, sample })
export const BEHAVIOR_CONTRACTS: Record<string, RegistryBehavior> = {
  "admin-customers-01": {
    schemaVersion: 1,
    states: { ...base,
      loading: state('status="loading" disables actions and announces loading.', 'Supply customers and status="idle", or status="error".'),
      empty: state('status="idle" and customers=[] show first-customer guidance.', 'onCreate opens the consumer create form.'),
      "no-results": state('Search has no matching name/email in a nonempty list.', 'Clear search resets the local filter without changing customer data.'),
      error: state('status="error" renders an alert and onRetry action.', 'Consumer retries loading; local search is retained.'),
      success: state('status="idle" renders supplied rows and truthful counts.', 'onEdit receives the chosen customer; consumer opens the form.'),
      "permission-denied": state('status="permission-denied" hides data; canEdit=false leaves read-only rows.', 'Consumer rechecks authorization before enabling writes.'),
      offline: state('Map offline reads to error with custom copy; no connectivity detection.', 'Consumer owns reconnection and retry.', 'consumer'),
      partial: state('Counts cover supplied rows only; no server pagination.', 'Consumer owns partial-data indicators and loading more.', 'consumer'),
    },
    content: [slot("title", "Customers"), slot("search", "Search customers"), slot("emptyTitle", "No customers yet"), slot("noResults", "No matching customers"), slot("error", "Customers could not be loaded. Try again."), slot("retry", "Try again")],
    intents: ["browse-customers", "filter-customers", "create-customer", "edit-customer"],
    actions: [{ name: "create", callback: "onCreate", responsibility: "Open a form and persist a new customer." }, { name: "edit", callback: "onEdit", responsibility: "Use stable customer ids and protect unsaved edits when switching." }, { name: "retry", callback: "onRetry", responsibility: "Fetch data and report loading/error/idle." }],
    journey: { before: [], after: ["customer-edit-01"] },
    responsive: { viewports: ["mobile", "tablet", "desktop"], strategy: "Stack header and KPIs on mobile; wrap names/emails, show orders/spend beneath the name, hide last-order column below md.", touchTargets: "44px" },
    consumer: ["Supply real customers; the default is empty. Bind callbacks or their buttons stay disabled.", "Authorize reads and writes on the server; disabled controls are not a security boundary.", "Maintain stable ids and preserve custom copy, columns and theme tokens across updates.", "Offline detection, pagination, remote search and data fetching belong to the consumer."],
  },
  "customer-edit-01": {
    schemaVersion: 1,
    states: { ...base,
      loading: state('status="loading" disables fields and announces loading.', 'Supply value/savedValue and status="idle".'),
      error: state('status="error" announces failure while preserving controlled input.', 'Retry Save; consumer clears server errors and sets submitting.'),
      success: state('status="success" with value=savedValue announces saved.', 'Editing makes the form dirty again; consumer sets idle.'),
      submitting: state('status="submitting" locks fields, Save and Cancel.', 'Consumer resolves to success, error or permission-denied; prevent duplicate requests.'),
      "validation-error": state('Submit a blank name or malformed email; first invalid field receives focus. fieldErrors accepts server validation.', 'Editing clears local field errors; consumer clears stale server errors.'),
      "permission-denied": state('status="permission-denied" disables edits and saving.', 'Consumer rechecks permission, preserving the draft.'),
      "unsaved-changes": state('value differs from savedValue; Cancel asks whether to discard.', 'Keep editing restores Cancel focus; Discard invokes onCancel.'),
      offline: state('Use status="error" and custom copy; draft stays controlled.', 'Consumer owns connectivity and retry; no offline persistence.', 'consumer'),
    },
    content: [slot("title", "Customer details"), slot("name", "Full name"), slot("email", "Email address"), slot("save", "Save customer"), slot("error", "The customer could not be saved. Your changes are still here. Try again."), slot("discard", "Discard changes")],
    intents: ["create-customer", "edit-customer"],
    actions: [{ name: "change", callback: "onValueChange", responsibility: "Update controlled value and clear stale server errors." }, { name: "save", callback: "onSave", responsibility: "Set submitting synchronously, authorize/persist on server, handle rejection and update savedValue only on success." }, { name: "cancel", callback: "onCancel", responsibility: "Close the editor and restore focus to its opener after confirmation." }],
    journey: { before: ["admin-customers-01"], after: ["admin-customers-01"] },
    responsive: { viewports: ["mobile", "tablet", "desktop"], strategy: "Single-column fields and wrapping actions within a max-width card.", touchTargets: "44px" },
    consumer: ["Own value, savedValue, status and server persistence. Never treat a local validation pass as server authorization.", "Set submitting synchronously and keep it until the request settles; do not optimistically close a failed form.", "Protect external navigation and record switches against unsaved changes. Remount the form with a record key.", "Restore focus when opening/closing the editor. Clear server field errors when the affected value changes."],
  },
}
