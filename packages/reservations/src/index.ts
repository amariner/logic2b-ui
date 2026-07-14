import {
  MockPaymentProvider,
  StripePaymentProvider,
  type PaymentProvider,
} from "./payments.ts"
import { createRouter } from "./router.ts"
import { D1Store, type D1Database } from "./store.ts"

export interface Env {
  DB: D1Database
  /** Set this Worker secret to switch payments from the mock to real Stripe. */
  STRIPE_SECRET_KEY?: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const store = new D1Store(env.DB)
    const payments: PaymentProvider = env.STRIPE_SECRET_KEY
      ? new StripePaymentProvider(env.STRIPE_SECRET_KEY)
      : new MockPaymentProvider()
    const router = createRouter({
      store,
      payments,
      now: () => Date.now(),
      id: () => crypto.randomUUID(),
    })
    return router(request)
  },
}
