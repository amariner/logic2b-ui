/** ISO-8601 datetime string, e.g. "2026-07-14T19:00:00.000Z". */
export type ISODate = string

/**
 * A bookable resource of any kind — a restaurant table, a hotel room, a class
 * seat, an equipment unit, a service slot. `capacity` is how many "seats" the
 * resource holds at one time (a table for 4 → capacity 4; a 1:1 service → 1).
 */
export interface Resource {
  id: string
  name: string
  /** Free-form category so this fits any domain ("table", "room", "seat", …). */
  kind: string
  capacity: number
  /** Price charged per booking, in the smallest currency unit (cents). */
  priceCents: number
  currency: string
}

export type BookingStatus = "held" | "confirmed" | "cancelled"

export interface Booking {
  id: string
  resourceId: string
  start: ISODate
  end: ISODate
  partySize: number
  customerName: string
  customerEmail: string
  status: BookingStatus
  paymentId: string | null
  /** While `held`, the slot is reserved until this instant, then it frees up. */
  holdExpiresAt: ISODate | null
  createdAt: ISODate
}

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded"

export interface Payment {
  id: string
  bookingId: string
  amountCents: number
  currency: string
  status: PaymentStatus
  provider: string
  providerRef: string | null
  createdAt: ISODate
}
