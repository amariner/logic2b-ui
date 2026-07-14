import type { Booking, ISODate, Resource } from "./types.ts"

/** Two half-open intervals [aStart, aEnd) and [bStart, bEnd) overlap. */
export function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd
}

/** A booking counts against capacity unless it is cancelled or an expired hold. */
export function occupiesCapacity(booking: Booking, nowMs: number): boolean {
  if (booking.status === "cancelled") return false
  if (booking.status === "held") {
    return (
      booking.holdExpiresAt == null || Date.parse(booking.holdExpiresAt) > nowMs
    )
  }
  return true // confirmed
}

export interface CapacityResult {
  ok: boolean
  /** Seats still free across the requested window (never negative). */
  remaining: number
  capacity: number
}

/**
 * How much capacity is left on `resource` across [start, end) given the other
 * bookings, and whether `partySize` fits. Expired holds and cancellations are
 * ignored. `exceptBookingId` lets a booking be re-checked without counting
 * itself.
 */
export function capacityFor(
  resource: Resource,
  bookings: Booking[],
  start: ISODate,
  end: ISODate,
  partySize: number,
  nowMs: number,
  exceptBookingId?: string
): CapacityResult {
  const s = Date.parse(start)
  const e = Date.parse(end)
  const used = bookings
    .filter(
      (b) =>
        b.id !== exceptBookingId &&
        occupiesCapacity(b, nowMs) &&
        overlaps(s, e, Date.parse(b.start), Date.parse(b.end))
    )
    .reduce((sum, b) => sum + b.partySize, 0)
  const remaining = Math.max(0, resource.capacity - used)
  return { ok: partySize <= remaining, remaining, capacity: resource.capacity }
}

export interface Slot {
  start: ISODate
  end: ISODate
  remaining: number
  available: boolean
}

/**
 * Break [from, to) into fixed-length slots and report remaining capacity per
 * slot for a given party size. The building block for an availability grid.
 */
export function availabilitySlots(
  resource: Resource,
  bookings: Booking[],
  from: ISODate,
  to: ISODate,
  slotMinutes: number,
  partySize: number,
  nowMs: number
): Slot[] {
  const step = slotMinutes * 60_000
  const fromMs = Date.parse(from)
  const toMs = Date.parse(to)
  const slots: Slot[] = []
  for (let s = fromMs; s + step <= toMs; s += step) {
    const startISO = new Date(s).toISOString()
    const endISO = new Date(s + step).toISOString()
    const cap = capacityFor(resource, bookings, startISO, endISO, partySize, nowMs)
    slots.push({
      start: startISO,
      end: endISO,
      remaining: cap.remaining,
      available: cap.ok,
    })
  }
  return slots
}

export interface BookingInput {
  resourceId: unknown
  start: unknown
  end: unknown
  partySize: unknown
  customerName: unknown
  customerEmail: unknown
}

export interface ValidBookingInput {
  resourceId: string
  start: ISODate
  end: ISODate
  partySize: number
  customerName: string
  customerEmail: string
}

const isFiniteDate = (v: unknown): v is string =>
  typeof v === "string" && Number.isFinite(Date.parse(v))

/** Validate raw booking input; returns the typed value or a human message. */
export function validateBookingInput(
  input: BookingInput
): { ok: true; value: ValidBookingInput } | { ok: false; error: string } {
  if (typeof input.resourceId !== "string" || input.resourceId.length === 0)
    return { ok: false, error: "resourceId is required" }
  if (!isFiniteDate(input.start)) return { ok: false, error: "start must be an ISO date" }
  if (!isFiniteDate(input.end)) return { ok: false, error: "end must be an ISO date" }
  if (Date.parse(input.end as string) <= Date.parse(input.start as string))
    return { ok: false, error: "end must be after start" }
  if (
    typeof input.partySize !== "number" ||
    !Number.isInteger(input.partySize) ||
    input.partySize < 1
  )
    return { ok: false, error: "partySize must be a positive integer" }
  if (typeof input.customerName !== "string" || input.customerName.trim() === "")
    return { ok: false, error: "customerName is required" }
  if (
    typeof input.customerEmail !== "string" ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.customerEmail)
  )
    return { ok: false, error: "customerEmail must be a valid email" }
  return {
    ok: true,
    value: {
      resourceId: input.resourceId,
      start: input.start,
      end: input.end,
      partySize: input.partySize,
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail,
    },
  }
}

/** Booking status transition rules. */
export function canConfirm(booking: Booking): boolean {
  return booking.status === "held"
}
export function canCancel(booking: Booking): boolean {
  return booking.status !== "cancelled"
}
