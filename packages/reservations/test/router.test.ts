import assert from "node:assert/strict"
import { beforeEach, describe, test } from "node:test"

import { MockPaymentProvider } from "../src/payments.ts"
import { createRouter } from "../src/router.ts"
import { MemoryStore } from "../src/store.ts"
import type { Resource } from "../src/types.ts"

const NOW = Date.parse("2026-07-14T18:00:00.000Z")
const RESOURCES: Resource[] = [
  { id: "table-4", name: "Table 4", kind: "table", capacity: 4, priceCents: 0, currency: "usd" },
  { id: "room-101", name: "Room 101", kind: "room", capacity: 2, priceCents: 18900, currency: "usd" },
]

let store: MemoryStore
let handle: (req: Request) => Promise<Response>

beforeEach(() => {
  store = new MemoryStore(RESOURCES.map((r) => ({ ...r })))
  let n = 0
  handle = createRouter({
    store,
    payments: new MockPaymentProvider(),
    now: () => NOW,
    id: () => `id-${++n}`,
    holdMinutes: 15,
  })
})

const get = (path: string) => handle(new Request(`http://x${path}`))
const post = (path: string, body?: unknown) =>
  handle(
    new Request(`http://x${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  )

const bookingBody = (over: Record<string, unknown> = {}) => ({
  resourceId: "room-101",
  start: "2026-07-14T19:00:00.000Z",
  end: "2026-07-14T20:00:00.000Z",
  partySize: 2,
  customerName: "Ada",
  customerEmail: "ada@example.com",
  ...over,
})

describe("reservations router", () => {
  test("health and resources", async () => {
    assert.equal((await get("/health")).status, 200)
    const res = await get("/resources")
    const body = (await res.json()) as { resources: Resource[] }
    assert.equal(body.resources.length, 2)
  })

  test("unknown resource 404s", async () => {
    assert.equal((await get("/resources/nope")).status, 404)
  })

  test("availability reports slots", async () => {
    const res = await get(
      "/resources/table-4/availability?from=2026-07-14T19:00:00.000Z&to=2026-07-14T22:00:00.000Z&slot=60&partySize=2"
    )
    assert.equal(res.status, 200)
    const body = (await res.json()) as { slots: unknown[] }
    assert.equal(body.slots.length, 3)
  })

  test("creates a held booking, then rejects an overbooking with 409", async () => {
    const first = await post("/bookings", bookingBody())
    assert.equal(first.status, 201)
    const created = (await first.json()) as {
      booking: { id: string; status: string }
      amountCents: number
    }
    assert.equal(created.booking.status, "held")
    assert.equal(created.amountCents, 18900)

    // room-101 has capacity 2 and is now fully held for that window.
    const second = await post("/bookings", bookingBody({ customerEmail: "bo@example.com" }))
    assert.equal(second.status, 409)
  })

  test("validation errors return 400", async () => {
    assert.equal((await post("/bookings", bookingBody({ customerEmail: "x" }))).status, 400)
    assert.equal((await post("/bookings", bookingBody({ partySize: 9 }))).status, 400) // exceeds capacity
  })

  test("pay confirms the booking and records a succeeded payment", async () => {
    const created = (await (await post("/bookings", bookingBody())).json()) as {
      booking: { id: string }
    }
    const res = await post(`/bookings/${created.booking.id}/pay`)
    assert.equal(res.status, 200)
    const body = (await res.json()) as {
      booking: { status: string; paymentId: string | null }
      payment: { status: string; provider: string }
    }
    assert.equal(body.booking.status, "confirmed")
    assert.equal(body.payment.status, "succeeded")
    assert.equal(body.payment.provider, "mock")
    assert.ok(body.booking.paymentId, "confirmed booking links its payment")
  })

  test("a declined charge returns 402 and leaves the booking held", async () => {
    const created = (await (await post("/bookings", bookingBody())).json()) as {
      booking: { id: string }
    }
    const res = await post(`/bookings/${created.booking.id}/pay`, { trigger: "decline" })
    assert.equal(res.status, 402)
    const body = (await res.json()) as { booking: { status: string }; payment: { status: string } }
    assert.equal(body.booking.status, "held")
    assert.equal(body.payment.status, "failed")
  })

  test("cancel refunds a paid booking and frees capacity", async () => {
    const created = (await (await post("/bookings", bookingBody())).json()) as {
      booking: { id: string }
    }
    await post(`/bookings/${created.booking.id}/pay`)
    const cancelled = await post(`/bookings/${created.booking.id}/cancel`)
    assert.equal(cancelled.status, 200)
    const body = (await cancelled.json()) as {
      booking: { status: string }
      payment: { status: string }
    }
    assert.equal(body.booking.status, "cancelled")
    assert.equal(body.payment.status, "refunded")

    // The same window is bookable again now that the booking is cancelled.
    const rebook = await post("/bookings", bookingBody({ customerEmail: "cy@example.com" }))
    assert.equal(rebook.status, 201)
  })

  test("confirm works for a free resource without payment", async () => {
    const created = (await (await post("/bookings", bookingBody({ resourceId: "table-4" }))).json()) as {
      booking: { id: string }
    }
    const res = await post(`/bookings/${created.booking.id}/confirm`)
    assert.equal(res.status, 200)
    const body = (await res.json()) as { booking: { status: string } }
    assert.equal(body.booking.status, "confirmed")
  })
})
