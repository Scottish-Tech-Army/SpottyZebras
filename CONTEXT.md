# Spotty Zebras — Project Context

## Tech Stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Supabase (PostgreSQL) for auth, database, storage
- Shadcn/ui for components

## Database Tables
- app_user: id, full_name, role ('parent'|'admin'|'super_admin'), is_active, created_at, updated_at
- parent_profile: user_id (FK), full_name, email, phone, relationship_to_child, address fields, second carer fields, emergency contact, registration_group, referral_source
- child: parent_id (FK), full_name, date_of_birth, gender, address fields, additional_support_needs, medical_conditions, photo_consent
- event: created_by (FK), title, description, event_date, start_time, end_time, location, image_url, age_range_min/max, price (0=free), max_capacity, status
- booking: event_id (FK), child_id (FK), parent_id (FK), status ('confirmed')

## Auth Flow
- Supabase Auth handles email + password (auth.users internal)
- On signup: create auth record → app_user (is_active=FALSE) → parent_profile → children
- Login checks: auth verifies password → app checks role + is_active in app_user
- Parents can't use the platform until admin sets is_active=TRUE

## Key Decisions
- No email in app_user table (auth.users handles login email)
- full_name duplicated in app_user AND parent_profile (avoids JOINs)
- price=0 means free event, price>0 means paid
- Booking DELETE = cancellation (no cancelled status)
- Up to 5 children per parent (enforced in app code)
- Admins manage data via Supabase Studio in phase 1