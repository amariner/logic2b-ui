import {
  availabilitySlots,
  canCancel,
  canConfirm,
  capacityFor,
  validateBookingInput,
  type BookingInput,
} from "./core.ts"
import type { PaymentProvider } from "./payments.ts"
import type { Store } from "./store.ts"
import type { Booking, Payment } from "./types.ts"

export interface RouterDeps {
  store: Store
  payments: PaymentProvider
  /** Current time in ms — injected so tests are deterministic. */
  now: () => number
  /** Unique id generator — injected so tests are deterministic. */
  id: () => string
  /** How long a `held` booking survives before its slot frees up. */
  holdMinutes?: number
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  })
}
const fail = (message: string, status: number) => json({ error: message }, status)

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json()
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  } catch {
    return null
  }
}

/**
 * The reservations + payments HTTP API as a single fetch handler.
 *
 *   GET  /health
 *   GET  /resources
 *   GET  /resources/:id
 *   GET  /resources/:id/availability?from&to&slot&partySize
 *   POST /bookings                      { resourceId,start,end,partySize,customerName,customerEmail }
 *   GET  /bookings/:id
 *   POST /bookings/:id/pay              { trigger? }   → charges, confirms on success
 *   POST /bookings/:id/confirm                         → confirm a free booking
 *   POST /bookings/:id/cancel                          → cancel (+ refund if paid)
 */
export function createRouter(deps: RouterDeps) {
  const { store, payments, now, id, holdMinutes = 15 } = deps

  return async function handle(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const seg = url.pathname.split("/").filter(Boolean)
    const path = "/" + seg.join("/")
    const method = req.method.toUpperCase()

    if (method === "OPTIONS") return new Response(null, { status: 204, headers: CORS })

    if (method === "GET" && path === "/health") return json({ ok: true })

    if (method === "GET" && path === "/resources") {
      return json({ resources: await store.listResources() })
    }

    if (method === "GET" && seg[0] === "resources" && seg.length === 2) {
      const r = await store.getResource(seg[1])
      return r ? json(r) : fail("resource not found", 404)
    }

    if (
      method === "GET" &&
      seg[0] === "resources" &&
      seg[2] === "availability" &&
      seg.length === 3
    ) {
      const r = await store.getResource(seg[1])
      if (!r) return fail("resource not found", 404)
      const from = url.searchParams.get("from")
      const to = url.searchParams.get("to")
      if (!from || !to || !Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to)))
        return fail("from and to (ISO dates) are required", 400)
      const slot = Number(url.searchParams.get("slot") ?? "60")
      const partySize = Number(url.searchParams.get("partySize") ?? "1")
      const bookings = await store.getBookingsForResource(r.id)
      return json({
        resource: r,
        slots: availabilitySlots(r, bookings, from, to, slot, partySize, now()),
      })
    }

    if (method === "POST" && path === "/bookings") {
      const body = await readJson(req)
      if (!body) return fail("invalid JSON body", 400)
      const valid = validateBookingInput(body as unknown as BookingInput)
      if (!valid.ok) return fail(valid.error, 400)
      const r = await store.getResource(valid.value.resourceId)
      if (!r) return fail("resource not found", 404)
      if (valid.value.partySize > r.capacity)
        return fail(`party size exceeds resource capacity (${r.capacity})`, 400)
      const bookings = await store.getBookingsForResource(r.id)
      const cap = capacityFor(
        r,
        bookings,
        valid.value.start,
        valid.value.end,
        valid.value.partySize,
        now()
      )
      if (!cap.ok)
        return fail(
          `not enough capacity for that time (remaining ${cap.remaining} of ${cap.capacity})`,
          409
        )
      const nowIso = new Date(now()).toISOString()
      const booking: Booking = {
        id: id(),
        resourceId: r.id,
        start: valid.value.start,
        end: valid.value.end,
        partySize: valid.value.partySize,
        customerName: valid.value.customerName,
        customerEmail: valid.value.customerEmail,
        status: "held",
        paymentId: null,
        holdExpiresAt: new Date(now() + holdMinutes * 60_000).toISOString(),
        createdAt: nowIso,
      }
      await store.putBooking(booking)
      return json({ booking, amountCents: r.priceCents, currency: r.currency }, 201)
    }

    if (method === "GET" && seg[0] === "bookings" && seg.length === 2) {
      const b = await store.getBooking(seg[1])
      if (!b) return fail("booking not found", 404)
      return json({ booking: b, payment: await store.getPaymentForBooking(b.id) })
    }

    if (method === "POST" && seg[0] === "bookings" && seg[2] === "pay" && seg.length === 3) {
      const b = await store.getBooking(seg[1])
      if (!b) return fail("booking not found", 404)
      if (b.status === "cancelled") return fail("booking is cancelled", 409)
      if (b.status === "confirmed")
        return json({ booking: b, payment: await store.getPaymentForBooking(b.id) })
      const r = await store.getResource(b.resourceId)
      if (!r) return fail("resource not found", 404)
      const body = (await readJson(req)) ?? {}
      const charge = await payments.createCharge({
        amountCents: r.priceCents,
        currency: r.currency,
        bookingId: b.id,
        trigger: typeof body.trigger === "string" ? body.trigger : undefined,
      })
      const payment: Payment = {
        id: id(),
        bookingId: b.id,
        amountCents: r.priceCents,
        currency: r.currency,
        status:
          charge.status === "succeeded"
            ? "succeeded"
            : charge.status === "pending"
              ? "pending"
              : "failed",
        provider: payments.name,
        providerRef: charge.providerRef,
        createdAt: new Date(now()).toISOString(),
      }
      await store.putPayment(payment)
      if (charge.status === "succeeded") {
        const confirmed: Booking = {
          ...b,
          status: "confirmed",
          paymentId: payment.id,
          holdExpiresAt: null,
        }
        await store.putBooking(confirmed)
        return json({ booking: confirmed, payment, clientSecret: charge.clientSecret })
      }
      const updated: Booking = { ...b, paymentId: payment.id }
      await store.putBooking(updated)
      return json(
        { booking: updated, payment, clientSecret: charge.clientSecret },
        charge.status === "failed" ? 402 : 202
      )
    }

    if (method === "POST" && seg[0] === "bookings" && seg[2] === "confirm" && seg.length === 3) {
      const b = await store.getBooking(seg[1])
      if (!b) return fail("booking not found", 404)
      if (!canConfirm(b)) return fail(`cannot confirm a ${b.status} booking`, 409)
      const confirmed: Booking = { ...b, status: "confirmed", holdExpiresAt: null }
      await store.putBooking(confirmed)
      return json({ booking: confirmed })
    }

    if (method === "POST" && seg[0] === "bookings" && seg[2] === "cancel" && seg.length === 3) {
      const b = await store.getBooking(seg[1])
      if (!b) return fail("booking not found", 404)
      if (!canCancel(b)) return fail("booking already cancelled", 409)
      let payment = await store.getPaymentForBooking(b.id)
      if (payment && payment.status === "succeeded") {
        const refund = await payments.refund(payment.providerRef ?? "")
        payment = { ...payment, status: refund.status === "refunded" ? "refunded" : payment.status }
        await store.putPayment(payment)
      }
      const cancelled: Booking = { ...b, status: "cancelled", holdExpiresAt: null }
      await store.putBooking(cancelled)
      return json({ booking: cancelled, payment })
    }

    return fail("not found", 404)
  }
}
