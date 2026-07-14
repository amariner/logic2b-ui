import type { Booking, Payment, Resource } from "./types.ts"

/** Persistence boundary. Prod uses D1Store; tests use MemoryStore. */
export interface Store {
  listResources(): Promise<Resource[]>
  getResource(id: string): Promise<Resource | null>
  /** All bookings for a resource (the caller filters by status/time). */
  getBookingsForResource(resourceId: string): Promise<Booking[]>
  getBooking(id: string): Promise<Booking | null>
  putBooking(booking: Booking): Promise<void>
  getPayment(id: string): Promise<Payment | null>
  getPaymentForBooking(bookingId: string): Promise<Payment | null>
  putPayment(payment: Payment): Promise<void>
}

/** In-memory store for tests and local development. */
export class MemoryStore implements Store {
  private resources = new Map<string, Resource>()
  private bookings = new Map<string, Booking>()
  private payments = new Map<string, Payment>()

  constructor(seedResources: Resource[] = []) {
    for (const r of seedResources) this.resources.set(r.id, r)
  }

  async listResources(): Promise<Resource[]> {
    return [...this.resources.values()]
  }
  async getResource(id: string): Promise<Resource | null> {
    return this.resources.get(id) ?? null
  }
  async getBookingsForResource(resourceId: string): Promise<Booking[]> {
    return [...this.bookings.values()].filter((b) => b.resourceId === resourceId)
  }
  async getBooking(id: string): Promise<Booking | null> {
    return this.bookings.get(id) ?? null
  }
  async putBooking(booking: Booking): Promise<void> {
    this.bookings.set(booking.id, booking)
  }
  async getPayment(id: string): Promise<Payment | null> {
    return this.payments.get(id) ?? null
  }
  async getPaymentForBooking(bookingId: string): Promise<Payment | null> {
    return (
      [...this.payments.values()].find((p) => p.bookingId === bookingId) ?? null
    )
  }
  async putPayment(payment: Payment): Promise<void> {
    this.payments.set(payment.id, payment)
  }
}

/* ------------------------------------------------------------- D1 (prod) ----
 * Minimal structural typing for the Cloudflare D1 binding so the package needs
 * no extra type dependency. The real binding satisfies this shape. */
export interface D1Result<T> {
  results: T[]
}
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<D1Result<T>>
  run(): Promise<unknown>
}
export interface D1Database {
  prepare(query: string): D1PreparedStatement
}

/** Row → Booking (D1 stores booleans/nulls as-is; columns match the schema). */
function toBooking(row: Record<string, unknown>): Booking {
  return {
    id: row.id as string,
    resourceId: row.resource_id as string,
    start: row.start as string,
    end: row.end as string,
    partySize: row.party_size as number,
    customerName: row.customer_name as string,
    customerEmail: row.customer_email as string,
    status: row.status as Booking["status"],
    paymentId: (row.payment_id as string | null) ?? null,
    holdExpiresAt: (row.hold_expires_at as string | null) ?? null,
    createdAt: row.created_at as string,
  }
}

function toPayment(row: Record<string, unknown>): Payment {
  return {
    id: row.id as string,
    bookingId: row.booking_id as string,
    amountCents: row.amount_cents as number,
    currency: row.currency as string,
    status: row.status as Payment["status"],
    provider: row.provider as string,
    providerRef: (row.provider_ref as string | null) ?? null,
    createdAt: row.created_at as string,
  }
}

export class D1Store implements Store {
  constructor(private db: D1Database) {}

  async listResources(): Promise<Resource[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM resources ORDER BY name")
      .all<Record<string, unknown>>()
    return results.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      kind: r.kind as string,
      capacity: r.capacity as number,
      priceCents: r.price_cents as number,
      currency: r.currency as string,
    }))
  }

  async getResource(id: string): Promise<Resource | null> {
    const r = await this.db
      .prepare("SELECT * FROM resources WHERE id = ?")
      .bind(id)
      .first<Record<string, unknown>>()
    if (!r) return null
    return {
      id: r.id as string,
      name: r.name as string,
      kind: r.kind as string,
      capacity: r.capacity as number,
      priceCents: r.price_cents as number,
      currency: r.currency as string,
    }
  }

  async getBookingsForResource(resourceId: string): Promise<Booking[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM bookings WHERE resource_id = ?")
      .bind(resourceId)
      .all<Record<string, unknown>>()
    return results.map(toBooking)
  }

  async getBooking(id: string): Promise<Booking | null> {
    const r = await this.db
      .prepare("SELECT * FROM bookings WHERE id = ?")
      .bind(id)
      .first<Record<string, unknown>>()
    return r ? toBooking(r) : null
  }

  async putBooking(b: Booking): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO bookings
           (id, resource_id, start, end, party_size, customer_name, customer_email, status, payment_id, hold_expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           status = excluded.status,
           payment_id = excluded.payment_id,
           hold_expires_at = excluded.hold_expires_at`
      )
      .bind(
        b.id,
        b.resourceId,
        b.start,
        b.end,
        b.partySize,
        b.customerName,
        b.customerEmail,
        b.status,
        b.paymentId,
        b.holdExpiresAt,
        b.createdAt
      )
      .run()
  }

  async getPayment(id: string): Promise<Payment | null> {
    const r = await this.db
      .prepare("SELECT * FROM payments WHERE id = ?")
      .bind(id)
      .first<Record<string, unknown>>()
    return r ? toPayment(r) : null
  }

  async getPaymentForBooking(bookingId: string): Promise<Payment | null> {
    const r = await this.db
      .prepare("SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC")
      .bind(bookingId)
      .first<Record<string, unknown>>()
    return r ? toPayment(r) : null
  }

  async putPayment(p: Payment): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO payments
           (id, booking_id, amount_cents, currency, status, provider, provider_ref, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET status = excluded.status, provider_ref = excluded.provider_ref`
      )
      .bind(
        p.id,
        p.bookingId,
        p.amountCents,
        p.currency,
        p.status,
        p.provider,
        p.providerRef,
        p.createdAt
      )
      .run()
  }
}
