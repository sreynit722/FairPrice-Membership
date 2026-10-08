# FairPrice Quick Membership (React + Supabase)

Built from the Figma file "Business Idea Simulation Prototype".

## Setup
1. Create a project at https://supabase.com
2. SQL Editor → paste and run `supabase/schema.sql`
3. `cp .env.example .env` and fill in Project URL + anon key (Settings → API)
4. `npm install && npm run dev`

## Flow
Poster → Join (phone) → Verify (demo code 123456) → Name → Success → App invite ($2 reward) → Home

Returning phone numbers skip the Name step and go straight to Home.
New members enter their age; Supabase stores the corresponding birth year and
calculates their current age dynamically, so it advances each calendar year.
Existing members with a full date of birth continue to use birthday-based age.
For an existing Supabase project, run the latest migration in `supabase/migrations`
before deploying the updated app.

## Supabase tables
members, rewards, activity, deals, member_prices (see schema.sql).

## Before production
The RLS policies in schema.sql are open demo policies. Switch to Supabase phone-OTP auth
(`supabase.auth.signInWithOtp({ phone })`) and restrict policies to `auth.uid() = id`.
