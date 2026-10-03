import { BEHAVIOR_STATES, type RegistryBehavior } from "@logic2b/scaffold/behavior"

export const behaviorContract: RegistryBehavior = {
  schemaVersion: 1,
  states: Object.fromEntries(BEHAVIOR_STATES.map((name) => [name, {
    support: "consumer",
    how: "Supply the application outcome.",
  }])) as RegistryBehavior["states"],
  content: [{ key: "title", type: "text", path: "content.title", sample: "Customers" }],
  actions: [{ name: "retry", props: ["onRetry"], consumer: ["Reload customer data when retry is requested."] }],
  intents: ["browse-customers", "recover-request"],
  journey: { after: ["customer-edit-01"] },
  responsive: { viewports: ["mobile", "desktop"], strategy: "Columns collapse on mobile.", touchTargets: "44px" },
  consumer: ["Connect onRetry to your application data service."],
}
