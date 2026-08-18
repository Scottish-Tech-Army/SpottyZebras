# Spotty Zebras — Project Context

## Tech Stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Supabase (PostgreSQL) for auth, database, storage
- Shadcn/ui for components

## Database Tables
- app_user: id, full_name, role ('parent'|'admin'|'super_admin'), is_active, created_at, updated_at
- parent_profile: user_id (FK), full_name, email, phone, address_line_1, address_line_2, town, postcode, second_carer_name, second_carer_email, second_carer_phone, second_carer_address_line_1, second_carer_address_line_2, second_carer_town, second_carer_postcode, emergency_contact_name, emergency_contact_phone, referral_source, created_at, updated_at
- child: parent_id (FK), full_name, date_of_birth, address_line_1, address_line_2, town, postcode, additional_support_needs, allergies, photo_consent
- event: created_by (FK), title, description, start_time/end_time (timestamptz), location, image_url (Storage path), age_range_min/max, price (0=free), max_capacity, status
- booking: event_id (FK), child_id (FK), parent_id (FK), status ('pending'|'confirmed'), payment_id (FK, nullable - null for free bookings), hold_expires_at (timestamptz, nullable). 'pending' = a spot held for an in-flight paid checkout (see hold_expires_at); 'confirmed' = booked (free, or paid+settled). Unique (event_id, child_id).
- payment: id, type ('donation'|'event_booking'), status ('succeeded'|'refunded'|'failed'|'pending'), amount (numeric, £), currency, stripe_payment_intent_id (unique), stripe_invoice_id, stripe_subscription_id, paid_at; event side: parent_id (FK), event_id (FK), event_payer_name/email; donation side: is_gift_aid, donor_first_name, donor_last_name, donor_email, donor_address_line_1/2, donor_town, donor_postcode. Written by Stripe webhook, idempotent on stripe_payment_intent_id. RLS on (service-role only).

## Auth Flow
- Supabase Auth handles email + password (auth.users internal)
- On signup: create auth record → app_user (is_active=FALSE) → parent_profile → children
- Login checks: auth verifies password → app checks role + is_active in app_user.
- Parents can't use the platform until admin sets is_active=TRUE

## Key Decisions
- No email in app_user table (auth.users handles login email)
- full_name duplicated in app_user AND parent_profile (avoids JOINs)
- price=0 means free event, price>0 means paid
- Paid-event booking = hold-then-confirm (never oversells): tapping "Pay" atomically reserves a 10-min `pending` hold via the `book_event_spots` DB function (locks the event row with SELECT…FOR UPDATE, so concurrent bookers serialise); the Stripe webhook confirms it via `confirm_held_booking` once payment settles. Free events use the same `book_event_spots` function (status='confirmed'). Leaving the payment screen (back / tab close / 10-min timer) releases the hold via DELETE /api/event-payment; otherwise it auto-expires. Availability (`spotsLeft`) counts confirmed + live holds. Enforced by the `book_event_spots` / `confirm_held_booking` DB functions (applied directly to the DB, not kept as a repo migration). See ADR docs/adr/0001-event-booking-payment.md.
- Booking DELETE = cancellation (no cancelled status)
- Up to 4 children per parent (enforced in app code)
- Admins manage data via Supabase Studio in phase 1
- Payments: one `payment` ledger for both donations & paid bookings; written by the Stripe webhook (not at checkout), idempotent on stripe_payment_intent_id, retried by Stripe on failure
- Gift Aid inlined on the donation row (is_gift_aid + donor_* snapshot at donation time); recurring donations copy Gift Aid from Stripe subscription metadata onto each monthly invoice's row
- Xero: Stripe → Xero via a connector (no app code); the `payment` table is the app's own record + the source for the HMRC Gift Aid claim export