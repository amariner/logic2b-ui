# @logic2b/reservations

A generic **reservations / booking + payments backend** — a Cloudflare Worker
backed by D1 — for any resource you can book: restaurant tables, hotel rooms,
class seats, equipment, service slots. It powers the storefront and booking
blocks in the logic2b registry.

It is an **isolated package**: it does not touch the static
`ui.logic2b.com` site or its deploy. Deploy it separately when you want it live.

## Design

- **Pure core** (`src/core.ts`) — overlap/capacity math, availability slots and
  input validation, with no I/O so it is fully unit-tested.
- **Injectable `Store`** (`src/store.ts`) — `D1Store` in production,
  `MemoryStore` in tests/local.
- **Pluggable `PaymentProvider`** (`src/payments.ts`) — `MockPaymentProvider`
  (deterministic, no keys) by default; set `STRIPE_SECRET_KEY` and the Worker
  uses the real `StripePaymentProvider` (PaymentIntents) automatically.
- **One fetch handler** (`src/router.ts`) — the whole REST API, built from an
  injected store, payment provider, clock and id generator (deterministic in
  tests).

## API

| Method & path | Purpose |
| --- | --- |
| `GET /health` | Liveness |
| `GET /resources` | List bookable resources |
| `GET /resources/:id` | One resource |
| `GET /resources/:id/availability?from&to&slot&partySize` | Per-slot remaining capacity |
| `POST /bookings` | Create a **held** booking (capacity-checked) |
| `GET /bookings/:id` | Read a booking + its payment |
| `POST /bookings/:id/pay` | Charge, and **confirm** on success (`{ trigger }` — `"decline"` forces failure on the mock) |
| `POST /bookings/:id/confirm` | Confirm a free booking without payment |
| `POST /bookings/:id/cancel` | Cancel (and refund a paid booking) |

A booking holds its slot for `holdMinutes` (default 15); expired holds free
their capacity automatically. Capacity is respected across overlapping bookings
so a resource is never double-booked beyond `capacity`.

## Develop

```bash
pnpm --filter @logic2b/reservations lint    # tsc --noEmit
pnpm --filter @logic2b/reservations test    # node:test (core + router)

# Run the real Worker against a local D1:
pnpm --filter @logic2b/reservations db:init:local
pnpm --filter @logic2b/reservations dev
```

## Deploy

```bash
wrangler d1 create logic2b-reservations       # paste database_id into wrangler.jsonc
pnpm --filter @logic2b/reservations db:init    # apply schema to the remote DB
# Optional real payments (kept out of source control):
wrangler secret put STRIPE_SECRET_KEY
pnpm --filter @logic2b/reservations deploy
```

Without `STRIPE_SECRET_KEY` the backend runs on the mock payment provider — safe
for demos and integration work; swap in the key when you're ready for live
charges.
