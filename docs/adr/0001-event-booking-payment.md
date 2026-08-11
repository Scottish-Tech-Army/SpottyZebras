# ADR 0001 — Event booking & payment

- **Status:** Accepted
- **Date:** 2026-08-11
- **Context files:** `CONTEXT.md`
- **DB objects:** `book_event_spots()` and `confirm_held_booking()` functions, plus
  `booking.hold_expires_at` / `status='pending'` / unique `(event_id, child_id)`.
  Applied directly to the database (the one-off migration SQL is not kept in the repo;
  the schema is the source of truth and will be recreated for production at launch).

## Context

Parents book their children onto events. Events are **free** (`price = 0`) or **paid**
(`price > 0`), and may have a **capacity** (`max_capacity`, or `null` = unlimited).

Two hard requirements shaped the design:

1. **Never oversell.** If capacity is _N_, at most _N_ children can hold a place —
   even when several parents book the last spot at the same instant.
2. **Never charge for a spot we can't honour.** The charity does **not** issue
   refunds for events, so a parent must never be charged and then told the event
   was full.

A naïve "count the bookings, then insert if there's room" has a race: two requests
both read _"1 spot left"_, both decide they fit, both insert → oversold. Adding more
count checks doesn't close it — any **check-then-write** across two statements has
this gap.

## Decision

### 1. Atomicity via a row lock in a DB function

All capacity logic lives in two Postgres functions that **lock the event row**
(`SELECT … FOR UPDATE`) before counting and writing. The lock serialises concurrent
bookers for the _same_ event: the second transaction blocks until the first commits,
then sees the true count. This is the single mechanism that makes overselling
impossible. It lives in the database (not app code) because that's the only layer
that can guarantee atomicity across concurrent requests and serverless instances.

- **`book_event_spots(event_id, parent_id, child_ids[], status, hold_minutes, payment_id)`**
  — locks the event, releases expired holds, dedupes children who already have a
  row, checks capacity, inserts. Used for both free bookings (`status='confirmed'`)
  and paid holds (`status='pending'`). Returns `{ booked, full, child_ids, expires_at }`.
- **`confirm_held_booking(event_id, parent_id, child_ids[], payment_id)`**
  — flips a parent's `pending` holds to `confirmed` and attaches the payment.
  Idempotent; if a hold expired mid-payment it still honours the paid booking.

### 2. Paid events: hold-then-confirm (reserve **before** paying)

We claim the spot **before** the card screen, not after:

1. Parent picks children in the RSVP dialog and taps **Pay**.
2. `POST /api/event-payment` validates (ownership, age, event is paid), then calls
   `book_event_spots(status='pending', hold_minutes=10)` to **atomically hold** the
   spots for 10 minutes, and creates a Stripe **PaymentIntent** carrying
   `type='event_booking'`, `event_id`, `parent_id`, `child_ids`, payer name/email.
3. The parent is taken to `/events/payment` (Stripe Elements + a 10-minute countdown).
4. On success Stripe redirects to `/events/payment/success`; the **webhook**
   (`payment_intent.succeeded`) writes the `payment` row and calls
   `confirm_held_booking` to turn the holds into confirmed bookings.

**Why reserve first (vs. authorise-then-capture):** the loser of a race is refused
_up front_ — before entering card details — and is never charged. The alternative
(authorise both cards, capture the winner, cancel the loser) shows the loser a
brief pending charge and needs the success page to poll for the final result. Given
"no refunds" and a small user base, reserve-first is simpler and kinder. Trade-off
accepted: an abandoned checkout can hold a spot for up to 10 minutes.

### 3. The 10-minute hold and releasing it

- The hold is a `booking` row with `status='pending'` and `hold_expires_at = now()+10m`.
- **Availability counts holds:** `/api/events` `spotsLeft` = capacity − (confirmed +
  live holds), so a seat mid-checkout shows as unavailable to everyone else.
- **"Going" ignores holds:** `GET /api/bookings` returns only `confirmed`, so an
  unpaid hold never shows as booked.
- **Leaving the payment screen releases the hold immediately.** Back button, the
  countdown hitting zero, or a tab close call `DELETE /api/event-payment`, which
  deletes the parent's pending rows and cancels the unpaid PaymentIntent. The
  success redirect is suppressed from releasing (a `paying` flag), so a completed
  payment is kept. If the release never fires (e.g. a hard crash), the 10-minute
  expiry is the backstop — expired holds stop counting toward capacity and are
  lazily deleted on the next `book_event_spots` call for that event.
- **Re-booking is blocked while a hold is live:** a live hold is left in place, so a
  second reservation for the same child is refused ("already booked, or a payment
  is in progress"), preventing a double charge. A card retry on the _same_ payment
  page reuses the existing hold.

### 4. Free events

Same function, `status='confirmed'`, no hold — `POST /api/bookings` books directly
and atomically, so free events can't oversell either.

### 5. The webhook is the only writer of confirmed paid bookings

Consistent with donations, no booking is written at checkout. The Stripe webhook
(idempotent on `stripe_payment_intent_id`) is the authoritative writer, so retries
and duplicate deliveries can't double-record or double-book.

## Flow summary

```
FREE                         PAID
tap event                    tap event
  → RSVP dialog                → RSVP dialog
  → POST /api/bookings         → Pay → POST /api/event-payment
     book_event_spots            book_event_spots(pending, 10m)  ← spot HELD
     (confirmed)                 + create PaymentIntent
  → "Going"                    → /events/payment  (Stripe + countdown)
                                 → pay ─success→ /events/payment/success
                                        │          webhook: payment_intent.succeeded
                                        │            write payment row
                                        │            confirm_held_booking → "Going"
                                        └─leave/timeout→ DELETE /api/event-payment
                                                          release hold + cancel PI
```

## Consequences

**Good**
- Overselling is structurally impossible (the event-row lock), for free and paid.
- No refund is ever needed for a lost race — the loser never pays.
- One ledger (`payment`) and one writer (the webhook) for donations and bookings.
- Held spots are visible to everyone as unavailable in real time.

**Costs / limits**
- `booking` gains a transient `pending` state + `hold_expires_at`; every place that
  counts or displays bookings must respect it (done: `/api/events`, `/api/bookings`).
- An abandoned checkout can hold a spot for up to 10 minutes (bounded, self-healing).
- Capacity logic lives in SQL functions — schema changes must keep them in sync, and
  the functions require a `service_role` grant (new objects aren't covered by earlier
  blanket grants).
- Hard tab-close relies on a best-effort `keepalive` request; if it doesn't land, the
  10-minute expiry cleans up instead.

## Alternatives considered

- **Enforce capacity only in the webhook (auto-capture).** Rejected: money is already
  captured by the time we detect "full" → forces a refund, which is disallowed.
- **Authorise then capture-or-cancel.** Correct, and needs no hold table, but the
  loser sees a pending charge and the success page must poll. Rejected for UX given
  the no-refund rule and small scale.
- **App-level `SELECT count()` + insert.** The current bug — non-atomic, oversells.
```
