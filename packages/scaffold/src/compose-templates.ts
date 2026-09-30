/** First composition slice. Roles are retrieval hints, never behavior evidence.
 * Only the customer pair currently has a versioned behavior contract. */
export const CUSTOMER_COMPOSITION = [
  { item: "admin-customers-01", roles: ["list"], intents: ["browse-customers", "filter-customers"] },
  { item: "customer-edit-01", roles: ["primary-form"], intents: ["create-customer", "edit-customer"] },
] as const
