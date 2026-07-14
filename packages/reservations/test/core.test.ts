import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  availabilitySlots,
  capacityFor,
  occupiesCapacity,
  overlaps,
  validateBookingInput,
} from "../src/core.ts"
import type { Booking, Resource } from "../src/types.ts"

const NOW = Date.parse("2026-07-14T18:00:00.000Z")
const resource: Resource = {
  id: "r",
  name: "R",
  kind: "table",
  capacity: 4,
  priceCents: 0,
  currency: "usd",
}

function booking(over: Partial<Booking> = {}): Booking {
  return {
    id: "b",
    resourceId: "r",
    start: "2026-07-14T19:00:00.000Z",
    end: "2026-07-14T20:00:00.000Z",
    partySize: 2,
    customerName: "A",
    customerEmail: "a@b.co",
    status: "confirmed",
    paymentId: null,
    holdExpiresAt: null,
    createdAt: "2026-07-14T18:00:00.000Z",
    ...over,
  }
}

describe("overlaps", () => {
  test("touching intervals do not overlap", () => {
    assert.equal(overlaps(0, 10, 10, 20), false)
  })
  test("nested and partial overlaps are detected", () => {
    assert.equal(overlaps(0, 10, 5, 8), true)
    assert.equal(overlaps(5, 15, 0, 10), true)
  })
})

describe("occupiesCapacity", () => {
  test("confirmed counts, cancelled does not", () => {
    assert.equal(occupiesCapacity(booking({ status: "confirmed" }), NOW), true)
    assert.equal(occupiesCapacity(booking({ status: "cancelled" }), NOW), false)
  })
  test("held counts until its hold expires", () => {
    const future = new Date(NOW + 60_000).toISOString()
    const past = new Date(NOW - 60_000).toISOString()
    assert.equal(occupiesCapacity(booking({ status: "held", holdExpiresAt: future }), NOW), true)
    assert.equal(occupiesCapacity(booking({ status: "held", holdExpiresAt: past }), NOW), false)
  })
})

describe("capacityFor", () => {
  test("subtracts overlapping party sizes", () => {
    const cap = capacityFor(resource, [booking({ partySize: 2 })], "2026-07-14T19:30:00.000Z", "2026-07-14T19:45:00.000Z", 2, NOW)
    assert.equal(cap.remaining, 2)
    assert.equal(cap.ok, true)
    assert.equal(capacityFor(resource, [booking({ partySize: 2 })], "2026-07-14T19:30:00.000Z", "2026-07-14T19:45:00.000Z", 3, NOW).ok, false)
  })
  test("ignores non-overlapping, cancelled and expired holds", () => {
    const bookings = [
      booking({ id: "far", start: "2026-07-14T22:00:00.000Z", end: "2026-07-14T23:00:00.000Z", partySize: 4 }),
      booking({ id: "x", status: "cancelled", partySize: 4 }),
      booking({ id: "exp", status: "held", holdExpiresAt: new Date(NOW - 1000).toISOString(), partySize: 4 }),
    ]
    const cap = capacityFor(resource, bookings, "2026-07-14T19:00:00.000Z", "2026-07-14T20:00:00.000Z", 4, NOW)
    assert.equal(cap.remaining, 4)
  })
  test("exceptBookingId excludes a booking from the count", () => {
    const cap = capacityFor(resource, [booking({ id: "self", partySize: 4 })], "2026-07-14T19:00:00.000Z", "2026-07-14T20:00:00.000Z", 4, NOW, "self")
    assert.equal(cap.remaining, 4)
  })
})

describe("availabilitySlots", () => {
  test("splits the window and reports per-slot remaining", () => {
    const slots = availabilitySlots(resource, [booking({ partySize: 2 })], "2026-07-14T19:00:00.000Z", "2026-07-14T22:00:00.000Z", 60, 1, NOW)
    assert.equal(slots.length, 3)
    assert.equal(slots[0].remaining, 2) // 19-20 overlaps the 2-seat booking
    assert.equal(slots[1].remaining, 4)
    assert.equal(slots[2].remaining, 4)
    assert.ok(slots.every((s) => s.available))
  })
})

describe("validateBookingInput", () => {
  const base = {
    resourceId: "r",
    start: "2026-07-14T19:00:00.000Z",
    end: "2026-07-14T20:00:00.000Z",
    partySize: 2,
    customerName: "Ada",
    customerEmail: "ada@example.com",
  }
  test("accepts a well-formed input", () => {
    const r = validateBookingInput(base)
    assert.equal(r.ok, true)
  })
  test("rejects bad dates, party size and email", () => {
    assert.equal(validateBookingInput({ ...base, end: base.start }).ok, false)
    assert.equal(validateBookingInput({ ...base, partySize: 0 }).ok, false)
    assert.equal(validateBookingInput({ ...base, partySize: 1.5 }).ok, false)
    assert.equal(validateBookingInput({ ...base, customerEmail: "nope" }).ok, false)
    assert.equal(validateBookingInput({ ...base, start: "not-a-date" }).ok, false)
  })
})
