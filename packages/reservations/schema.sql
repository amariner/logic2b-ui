-- logic2b reservations — D1 schema.
-- Apply locally:  pnpm --filter @logic2b/reservations db:init:local
-- Apply remote:   pnpm --filter @logic2b/reservations db:init

CREATE TABLE IF NOT EXISTS resources (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL,
  capacity    INTEGER NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency    TEXT NOT NULL DEFAULT 'usd'
);

CREATE TABLE IF NOT EXISTS bookings (
  id              TEXT PRIMARY KEY,
  resource_id     TEXT NOT NULL REFERENCES resources(id),
  start           TEXT NOT NULL,
  end             TEXT NOT NULL,
  party_size      INTEGER NOT NULL,
  customer_name   TEXT NOT NULL,
  customer_email  TEXT NOT NULL,
  status          TEXT NOT NULL,           -- held | confirmed | cancelled
  payment_id      TEXT,
  hold_expires_at TEXT,
  created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_resource ON bookings(resource_id);

CREATE TABLE IF NOT EXISTS payments (
  id           TEXT PRIMARY KEY,
  booking_id   TEXT NOT NULL REFERENCES bookings(id),
  amount_cents INTEGER NOT NULL,
  currency     TEXT NOT NULL,
  status       TEXT NOT NULL,              -- pending | succeeded | failed | refunded
  provider     TEXT NOT NULL,
  provider_ref TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);

-- Demo resources spanning a few reservation domains.
INSERT OR IGNORE INTO resources (id, name, kind, capacity, price_cents, currency) VALUES
  ('table-4',   'Window table for 4',   'table', 4, 0,     'usd'),
  ('room-101',  'Deluxe room 101',      'room',  2, 18900, 'usd'),
  ('seat-a1',   'Workshop seat',        'seat',  1, 4900,  'usd'),
  ('bay-1',     'Detailing bay',        'service', 1, 8900, 'usd');
