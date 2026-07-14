export interface ChargeRequest {
  amountCents: number
  currency: string
  bookingId: string
  description?: string
  /** Test hook: set to "decline" to force a failed charge (mock provider). */
  trigger?: string
}

export interface ChargeResult {
  status: "succeeded" | "failed" | "pending"
  providerRef: string
  /** For client-side confirmation flows (Stripe PaymentIntent). */
  clientSecret?: string
}

/** A pluggable payment gateway. Swap the mock for Stripe by setting the key. */
export interface PaymentProvider {
  readonly name: string
  createCharge(req: ChargeRequest): Promise<ChargeResult>
  refund(providerRef: string): Promise<{ status: "refunded" | "failed" }>
}

/**
 * Deterministic in-process gateway for tests, demos and local development — no
 * network, no keys. Charges succeed unless `trigger === "decline"`. Reference
 * ids are derived from the booking id so they are stable across runs.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock"

  async createCharge(req: ChargeRequest): Promise<ChargeResult> {
    if (req.trigger === "decline") {
      return { status: "failed", providerRef: `mock_declined_${req.bookingId}` }
    }
    return {
      status: "succeeded",
      providerRef: `mock_ch_${req.bookingId}`,
      clientSecret: `mock_secret_${req.bookingId}`,
    }
  }

  async refund(): Promise<{ status: "refunded" | "failed" }> {
    return { status: "refunded" }
  }
}

/**
 * Real Stripe gateway via the REST API (PaymentIntents). Not exercised without
 * a secret key — wire it up by setting the STRIPE_SECRET_KEY Worker secret; the
 * router uses it automatically when present. Interface-compatible with the mock.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe"
  private base = "https://api.stripe.com/v1"

  constructor(private secretKey: string) {}

  private form(params: Record<string, string>): string {
    return Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&")
  }

  async createCharge(req: ChargeRequest): Promise<ChargeResult> {
    const res = await fetch(`${this.base}/payment_intents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: this.form({
        amount: String(req.amountCents),
        currency: req.currency,
        "metadata[bookingId]": req.bookingId,
        description: req.description ?? `Booking ${req.bookingId}`,
        confirm: "true",
        "payment_method_types[]": "card",
      }),
    })
    const data = (await res.json()) as {
      id?: string
      status?: string
      client_secret?: string
    }
    if (!res.ok || !data.id) {
      return { status: "failed", providerRef: data.id ?? "stripe_error" }
    }
    return {
      status: data.status === "succeeded" ? "succeeded" : "pending",
      providerRef: data.id,
      clientSecret: data.client_secret,
    }
  }

  async refund(providerRef: string): Promise<{ status: "refunded" | "failed" }> {
    const res = await fetch(`${this.base}/refunds`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: this.form({ payment_intent: providerRef }),
    })
    return { status: res.ok ? "refunded" : "failed" }
  }
}
