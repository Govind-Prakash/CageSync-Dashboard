# CageSync — Roadmap: July 2026

_Last updated: 2026-08-20_

Source of truth for outstanding work. Every unfinished capability discussed in prior sessions lives here, ordered, with per-step scope, verification, and commit templates. If a step is not in this file, it does not exist. If a step is here but not yet crossed out, it is not shipped.

---

## Table of contents

1. [Where we are today](#1-where-we-are-today)
2. [What has already shipped](#2-what-has-already-shipped)
3. [Remaining workstreams (grouped)](#3-remaining-workstreams-grouped)
4. [Detailed step-by-step blueprint](#4-detailed-step-by-step-blueprint)
5. [Recommended execution order](#5-recommended-execution-order)
6. [Verification protocol (applies to every step)](#6-verification-protocol-applies-to-every-step)
7. [Deferred decisions and open questions](#7-deferred-decisions-and-open-questions)
8. [Appendix — key schema/architectural decisions already made](#8-appendix)

---

## 1. Where we are today

**Repos**
- Dashboard (Next.js 15): `/Users/govindprakash/SAAS/cagesync-dashboard/` — pushed to `origin/main`, current head `8f00d69` (before this IV commit).
- Flutter mobile: `/Users/govindprakash/SAAS/cagesync/` — pushed to `origin/main`, current head `6ca3225`.

**Migrations applied via Supabase Dashboard SQL editor** (network blocks outbound port 5432 to the pooler): 0016, 0017, 0018, 0019, 0020, 0021, 0022. The `supabase_migrations.schema_migrations` table does NOT record any of them. All are idempotent (`IF NOT EXISTS` / `DROP POLICY IF EXISTS` / `ON CONFLICT DO NOTHING`) so a future `supabase db push` on a network that allows 5432 will safely no-op. To silence the CLI, run `supabase migration repair --status applied 0016 0017 0018 0019 0020 0021 0022` when unblocked.

**Discovered 2026-08-18 during VIII-1 test:** the 5 core entity tables + 2 flag tables were never in `supabase_realtime` publication, so Flutter's RealtimeSyncService received zero events despite subscribing correctly. Fixed by migration 0022. A second gap remains: Flutter has no cold-start Supabase→SQLite reconciliation, so rows created before app open still don't reach devices. Tracked as a Flutter follow-up.

**Users**
- 1 real user: `govind7x@gmail.com` (PI of "CageSync Lab", IISER Bhopal, id `add08510-…`)
- 11 other test accounts with no lab assignment
- Supabase project: `bcdiuxpetrwypqrxlsxh.supabase.co` (ap-northeast-2, ACTIVE_HEALTHY)

**Live schema state**
- Multi-tenancy foundation: `labs`, `profiles`, `rooms`, `cages`, `animals`, `treatments`, `litters`, `records`, `observations`, `breeding_pairs`, `experiments`, `experiment_animals`, `lab_invites`, `facilities`, `lab_memberships`, `facility_memberships`.
- RLS live on every table using the new helpers: `is_lab_member`, `role_in_lab`, `is_facility_overseer_of_lab`, `can_read_lab`, `can_write_lab`, `can_delete_lab`.
- 12 dashboard migrations applied (0001–0012).

**Apps status**
- Dashboard: all four visible tabs (Dashboard, Cages, Reminders, Settings) project real data. Header lab switcher live. Add-cage / add-animal / invite-member modals wire `lab_id` on insert.
- Flutter: bidirectional Supabase sync with outbox + realtime + orphan backfill; all 5 tabs show real data with honest empty states; multi-lab foundation now wired — Settings has lab picker with outbox guard; DAO reads scoped to active lab.
- Google Sheets sync restored via `AuthService.connectGoogleForSheets()` and rebuilt SheetsService.
- Invite flow: end-to-end works from BOTH dashboard AND Flutter — Flutter Settings → Invite collaborator opens dialog → inserts row → POSTs token to `/api/invites/send-email` on dashboard → Resend email → `/invite/accept` → `accept_invite` RPC → membership created. Auto-match trigger on signup for pending invites.

---

## 2. What has already shipped

### 2.1 Foundation
- Live schema dumped to `supabase/migrations/`.
- Table grants for `anon`/`authenticated`/`service_role` (fixed silent-write bug).
- Missing dashboard columns wired (`profiles.lab_settings`, `date_of_birth` typo, `lab_manager` role).
- `user_role` enum extended: `pi`, `researcher`, `technician`, `observer`, `lab_manager`, `facility_vet`, `facility_manager`.
- Founder lab bootstrap: `govind7x` = PI of "CageSync Lab".

### 2.2 Schema parity Flutter ↔ Supabase
- Aligned column names + tables across mobile SQLite and Supabase.
- Added Flutter-only fields to Supabase `cages` (barcode, cage_type, dam2_*, breeding_scheme).
- Created `litters` and `records` tables on Supabase.
- Added companion columns on `treatments` (drug/substance, given_at/administered_at, unit).
- Flutter SQLite migrated additively from v4 → v6.

### 2.3 Bidirectional realtime sync (Flutter)
- `ProfileService` (caches lab_id after login).
- `SupabaseSyncService` (push methods for all 5 entities).
- `RealtimeSyncService` (subscribes to Supabase channels).
- `OutboxFlusher` (retries on connectivity + 60s timer).
- `OrphanBackfillService` (sweeps pre-sync local rows on first login).
- All 5 repositories wired to push through the sync service.
- Auto-generates `cage_code` / `animal_code` for Supabase NOT NULL constraints.

### 2.4 Dashboard tabs — real data
- Dashboard: `_isEmpty`, `_tasks`, `_litters`, `_activity`, stat strip all from providers.
- Reminders: removed 4 hardcoded fake types; only real weaning reminders.
- Settings: team list reads real profiles; preferences persist to `profiles.lab_settings`.
- Cages summary line: real litter counts, animal counts, experiment names.

### 2.5 UI polish
- Cage list bottom padding fix (120 → 16 → scroll-content insets).
- Dashboard 12px gap above bottom nav (ColoredBox mask).
- Google Sheets sync fully restored + column count fix.

### 2.6 Security & multi-lab
- `lab_invites` token leak closed (SECURITY DEFINER `get_pending_invite`).
- Role-based write ladder split per table (observer read-only; technician insert+update no delete; researcher/lab_manager/pi full CRUD).
- **Multi-lab schema refactor** — foundation only (`lab_memberships`, `facility_memberships`, `facilities`, RLS rewrite). Not yet exposed via UI.

### 2.7 Invite flow (dashboard side)
- `/invite/accept?token=…` route (4 states).
- `accept_invite(token)` RPC.
- Login `?next=` handling (email + OAuth).
- Auto-match on signup (`handle_new_user` trigger).
- Resend email delivery from invite modal.

---

## 3. Remaining workstreams (grouped)

Each workstream expands into concrete steps in section 4.

### Workstream I — Multi-lab UX (make the schema actually usable)
- I-1. Dashboard header lab switcher ✅ shipped 2026-07-16
- I-2. Onboarding branching (PI vs invitee vs facility overseer) ✅ shipped 2026-07-16 (silent auto-create)
- I-3. Flutter lab switcher + adaptive header ✅ shipped 2026-07-16
- I-4. Cage transfer flow between labs ✅ shipped 2026-08-20 (dashboard `0024` + `c4d886d`, flutter `7541bc9`) — SQL block E for paste

### Workstream II — Institution registry + domain-verified search
- II-1. Schema additions (`institutions`, `labs.institution_id`, `labs.campus`, `labs.discoverable`, `facilities.institution_id`, `facilities.campus`, `user_institution_verifications`, `email_verification_codes`) ✅ shipped 2026-08-14 (dashboard `0016`+`0017`)
- II-2. Auto-verify on signup via email domain (extend `handle_new_user`) ✅ shipped 2026-08-14 (dashboard `0018`)
- II-3. Institution picker in lab / facility creation forms ✅ shipped 2026-08-14 as Settings → Lab profile → "Institution Registry" section (no lab-creation form exists; picker will be reused when one does)
- II-4. Email-code verification fallback
- II-5. `search_labs` RPC + facility-side search UI

### Workstream III — Facility feature
- III-1. `facility_technician` role + `facility_invites` table + `accept_facility_invite` RPC ✅ shipped 2026-08-20 (dashboard `0025` + `a644e0c` + `/invite-facility/accept` page)
- III-2. `lab_facility_affiliations` (mutual consent, replace `labs.facility_id` semantics) ✅ shipped 2026-08-20 (dashboard `0026` + `7623d4b`)
- III-3. Update `is_facility_overseer_of_lab` to use affiliations ✅ shipped 2026-08-20 (included in `0026`)
- III-4. Facility management page (dashboard) ✅ shipped 2026-08-20 (`/dashboard/facility` + sidebar link + invite modal, dashboard `59de0ae`)
- III-5. Lab-side "pending facility requests" acceptance UI ✅ shipped 2026-08-20 (dashboard `e223002` — FacilityRequestsSection in Settings → Lab Profile)
- III-6. Flutter facility view mode ✅ shipped 2026-08-21 (flutter `4bfafc2` foundation + `6a26d80` cross-lab cages view with mode toggle)

### Workstream IV — Flag system (facility staff → cage flags with photos)
- IV-1. Schema (`flag_types`, `cage_flags`, `cage_flag_attachments`) ✅ shipped 2026-08-14 (dashboard `0019`)
- IV-2. Supabase Storage bucket + RLS ✅ shipped 2026-08-14 (dashboard `0020`)
- IV-3. Seed flag_types (14 pre-defined) ✅ shipped 2026-08-14 (dashboard `0021`)
- IV-4. Flutter: flag creation dialog + photo capture + upload ✅ shipped 2026-08-20 (flutter `1a151d1..0392171`; dashboard `0023` relaxes RLS so lab writers can flag)
- IV-5. Dashboard: cage detail flags section + resolve flow ✅ shipped 2026-08-20 as `/dashboard/flags` inbox page (dashboard `63dfc4c`). Notification bell + panel wired to real cage_flags data (dashboard `77ee0e8`).
- IV-6. Realtime subscription addition ✅ shipped 2026-08-20 (dashboard `0022` publication + `63dfc4c`/`77ee0e8` client subscriptions; flutter `cage_flags` added to RealtimeSyncService._tables)
- IV-7. Instant email for urgent + daily digest (later)

### Workstream V — Direct writes for facility staff
- V-1. Observations INSERT policy extended to facility staff
- V-2. Optional: litter proposal system (`pending_proposals` + RPCs + PI inbox)

### Workstream VI — Invite flow completion
- VI-1. Flutter invite form (mirror of dashboard modal) + API route for email send ✅ shipped 2026-08-05 (dashboard `abab60a`, flutter `2848e76`)

### Workstream VII — Audit & compliance
- VII-1. Audit log table + triggers on destructive ops
- VII-2. Move `lab_settings` from `profiles` to `labs` (correct scoping)

### Workstream VIII — Verification & production hardening
- VIII-1. Round-trip parity test (Task #7 from original roadmap — never closed)
- VIII-2. Verify `cagesync.com` domain in Resend
- VIII-3. Change email `from` to `invites@cagesync.com`
- VIII-4. Rotate Resend API key
- VIII-5. Add `RESEND_API_KEY` + `NEXT_PUBLIC_SITE_URL` to Vercel env vars
- VIII-6. Commit or resolve the 8 pre-existing modified Flutter files ✅ shipped 2026-08-05 (flutter `2848e76`, `a422769`, `6ca3225`)
- VIII-7. Remove `records.synced_to_sheet` tech debt or formalize its purpose

---

## 4. Detailed step-by-step blueprint

Format for each step:
- **Purpose** — one-line "why"
- **Scope** — files touched, schema deltas
- **Prerequisites** — steps that must land first
- **Verification** — what to run/check before committing
- **Commit** — suggested message header
- **Rollback** — if this step goes wrong, how to undo

---

### I-1. Dashboard header lab switcher

**Purpose.** Users with multiple `lab_memberships` need to see + switch between their labs. Currently the dashboard reads `profiles.lab_id` as the sole active lab.

**Scope.**
- NEW: `src/components/lab-switcher.tsx` (client component)
- EDIT: `src/app/dashboard/layout.tsx` (or wherever the header lives) — mount switcher
- EDIT: `src/lib/supabase/lab.ts` — add `getMyLabMemberships()` helper
- NEW RPC: `set_active_lab(p_lab_id uuid)` (SECURITY DEFINER) that verifies membership then updates `profiles.lab_id`
- Migration: `0013_set_active_lab_function.sql`

**Prerequisites.** None (multi-lab schema already in place).

**Behavior.**
- Fetches `lab_memberships` for current user + their names.
- If only 1 membership → renders lab name as static label (no dropdown).
- If 2+ memberships → renders dropdown with lab list; selection calls `set_active_lab` then triggers `router.refresh()`.
- "All my labs" option only appears when a Cages tab is added that supports it (workstream I future) — not in this step.

**Verification.**
- ```sql
  SELECT proname FROM pg_proc WHERE proname = 'set_active_lab';
  ```
- Manually: temporarily insert a second `lab_memberships` row for `govind7x`; confirm dropdown appears + switching flips the active lab.
- After test, delete the temporary row.

**Commit.** `dashboard header lab switcher + set_active_lab rpc`

**Rollback.** Drop the RPC; remove component + layout mount; revert lab.ts.

---

### I-2. Auto-create personal lab on signup

**Purpose.** Fresh signup with no `lab_memberships` currently lands on `/dashboard` in a broken state. The individual-first onboarding: silently create a personal lab so the user is productive immediately, no chooser screen. When a PI later invites them, the multi-lab schema handles the rest.

_Design decision made 2026-07-13: `revised from the original "PI vs invitee chooser" design because forcing type-selection at signup is friction that provides zero benefit until the facility feature ships. See discussion in session log; TL;DR: modern SaaS onboarding is individual-first (Notion, Linear, Airtable all do this)._

**Scope.**
- Migration: `0014_auto_create_personal_lab.sql` — extends the `handle_new_user` trigger with a fallback block that creates a personal lab named `"{Full name}'s Colony"` and inserts the user as PI via `lab_memberships` (`joined_via='auto_created_personal'`), but only if steps (1) profile-create and (2) invite auto-match did NOT already result in a membership.
- No new routes, no middleware changes, no client-side code.

**Prerequisites.** None.

**Verification.**
- Simulate a brand-new signup by inserting into `auth.users` with a `raw_user_meta_data.full_name` → confirm profile row exists, personal lab exists with the correct name, `lab_memberships` row inserted with role=pi and `joined_via='auto_created_personal'`, `profiles.lab_id` populated.
- Test invite-first path (an invite already exists for the email) → user should skip personal-lab creation and land in the invited lab instead.

**Commit.** `auto-create personal lab on signup — no chooser`

**Rollback.** Restore the previous `handle_new_user` body from 0012.

### I-2b. Move cages on invite acceptance (deferred to I-4 territory)

**Purpose.** When Alice (with her own personal lab and 20 cages) accepts an invite to Zhang Lab, she likely wants to move some/all of those cages into Zhang Lab as her way of "onboarding" her work into the team.

**Scope.**
- Extend the `/invite/accept` flow: after successful accept, show a second step "Move cages from '{Personal Lab Name}' to '{Zhang Lab}'?" with checkbox list of all cages in the user's personal lab.
- Options: select all / select individually / skip.
- Uses the cage-transfer RPC from I-4 (needs I-4 built first).
- Post-selection: bulk transfer runs, then land on dashboard already switched to Zhang Lab as active.

**Semantics.** MOVE (cage.lab_id changes). Not copy, not access-grant. Alice still sees moved cages because she's now a Zhang Lab member.

**Prerequisites.** I-4 (single-cage transfer RPC) — extended to accept an array of cage_ids for bulk operation.

**Verification.** Full end-to-end: create personal lab with 5 test cages, accept invite to another lab, tick 3 cages, submit → 3 cages now show `lab_id` = new lab, 2 stay in personal lab, both accessible to Alice.

**Commit.** `move cages during invite acceptance flow`

---

### I-3. Flutter lab switcher + adaptive header ✅ shipped 2026-07-16 (cagesync `0f261a4`)

**Shipped design.** Split the concern in two: a read-only pill indicator on tab headers ("you are here"), and a dedicated switch action in Settings with an Instagram-style outbox guard preventing mid-sync switches.

**Delivered.**
- `lib/services/profile_service.dart` — `LabMembership` class + `currentMemberships()` (joins lab_memberships with labs) + `setActiveLab(labId)` (RPC + cache refresh + realtime restart).
- `lib/services/realtime_sync_service.dart` — public `restart()` that stops + `_startWhenReady()`.
- `lib/presentation/widgets/lab_indicator.dart` — read-only pill mounted on Cages tab header. Renders `SizedBox.shrink()` for solo users or during load.
- `lib/presentation/widgets/lab_picker.dart` — `openLabPicker(context, ref)` shows a bottom sheet listing memberships. Before switching, checks `OutboxFlusher.pendingCount()`; if > 0 shows "Sync pending changes first" alert with [Cancel] / [Sync now]. On sync, retries `OutboxFlusher.flush()` and blocks if still pending. On success, calls `setActiveLab()` and invalidates `cagesProvider`.
- Settings account section — shows "Switch lab" row for multi-lab users, read-only "Lab" row for solo users.
- DAO / provider lab_id filters — `CageDao.getAll({labId})`, `LitterDao.getAllDueLitters({labId})`, `dashboardTasksProvider`, `dashboardActivityProvider` (raw SQL UNION binds lab_id in all four legs).

**Follow-ups (not blocking).**
- Mount `LabIndicator` on Dashboard/Reminders headers once we resolve the white-pill / dark-green-gradient color clash.
- Extend lab_id filters to Animals/Treatments/Breeding DAO reads when those tabs get real data (currently only Cages + Dashboard tabs are wired).

---

### I-4. Cage transfer between labs

**Purpose.** Enable the "student sharing colony with PI" use case — transfer a cage from Lab A to Lab B while retaining the student's access to both labs' data.

**Scope.**
- Migration: `0015_transfer_cage_function.sql` — SECURITY DEFINER `transfer_cage(p_cage_id, p_to_lab_id)` that:
  - Verifies caller has write access to source lab AND target lab
  - Updates `cages.lab_id`
  - Updates `animals.lab_id` for all animals in that cage
  - Updates `litters.lab_id`, `treatments.lab_id`, `observations.lab_id` for anything referencing this cage's animals
  - Records to a new `cage_transfers` audit table
- NEW: `cage_transfers` table (cage_id, from_lab_id, to_lab_id, transferred_by, transferred_at, notes)
- Dashboard UI: cage detail page → "Move to another lab" action → pick from user's memberships → confirm dialog → execute
- Flutter: same in cage detail screen

**Prerequisites.** I-1 (user has multi-lab context).

**Verification.**
- Manual: create test cage in Lab A → transfer to Lab B → confirm cage + child rows now scoped to Lab B → confirm `cage_transfers` row logged.
- RLS: verify source lab members can no longer see the cage after transfer (unless they're also members of target lab).

**Commit.** `cage transfer rpc + audit table + dashboard/flutter ui`

**Rollback.** Reverse transfer via same function; drop `cage_transfers` if the whole feature is being killed.

---

### II-1. Institutions schema

**Purpose.** Support institution + campus + domain verification for the facility feature. Pure schema — nothing user-visible yet.

**Scope.**
- Migration: `0016_institutions_schema.sql` including:
  - `institutions(id, canonical_name, common_name, country, campuses text[], email_domains text[], status, created_at, updated_at)`
  - `ALTER TABLE labs ADD COLUMN institution_id`, `campus`, `discoverable boolean DEFAULT true`
  - `ALTER TABLE facilities ADD COLUMN institution_id`, `campus`
  - `user_institution_verifications(user_id, institution_id, verified_via, verified_at)` — PK (user_id, institution_id)
  - `email_verification_codes(id, user_id, institution_id, email, code_hash, expires_at, attempts, used, created_at)`
  - Indexes: gin on `institutions.email_domains`, tsvector on institution names
- Seed data: `0017_institutions_seed.sql` — ~20 institutions relevant to CageSync's market (IISER Bhopal, HUJI, Weizmann, IIT Bombay, AIIMS Delhi, MIT, Broad Institute, Stanford, UCSF, Salk, etc.). For each: canonical_name, common_name, campuses[], email_domains[].

**Prerequisites.** None.

**Verification.**
- ```sql
  SELECT count(*) FROM institutions;   -- should be ~20
  SELECT canonical_name, common_name, campuses, email_domains FROM institutions LIMIT 5;
  ```
- Confirm `labs.institution_id` column is nullable.

**Commit.** `institutions schema + campus + domain fields + seed data`

**Rollback.** Drop the new columns + tables (safe; nothing else references them yet).

---

### II-2. Auto-verify institution on signup

**Purpose.** When a new user signs up with `alice@huji.ac.il`, they should be auto-verified for HUJI so they can create a facility or search HUJI labs without manual email verification.

**Scope.**
- Migration: `0018_extend_handle_new_user_institution_match.sql` — replaces the current `handle_new_user` function body to append the institution auto-match:
  ```sql
  INSERT INTO user_institution_verifications (user_id, institution_id, verified_via)
  SELECT NEW.id, i.id, 'email_domain'
  FROM institutions i
  WHERE split_part(NEW.email, '@', 2) = ANY(i.email_domains)
    AND i.status = 'active'
  ON CONFLICT DO NOTHING;
  ```

**Prerequisites.** II-1.

**Verification.**
- Create a test auth user (via Supabase dashboard) with an `@huji.ac.il` email → confirm `user_institution_verifications` row appears.

**Commit.** `auto-verify institution on signup via email domain`

**Rollback.** Restore the previous handle_new_user body from 0012.

---

### II-3. Institution picker in lab / facility creation forms

**Purpose.** During lab creation (I-2 onboarding) or facility creation (III-4), the user picks an institution + campus from the registry rather than typing free text.

**Scope.**
- NEW: `src/components/institution-picker.tsx` — autocomplete on `institutions.common_name` + `canonical_name`.
- After institution selected, if `campuses` array has 2+ entries → show campus dropdown. If empty → hide campus field. If 1 entry → auto-fill.
- EDIT: Lab creation form (in I-2 onboarding).
- EDIT: Facility creation form (deferred to III-4 but this component is a prerequisite).
- Consider: institution list is small enough to ship inline (not an RPC). Alternatively, expose `list_institutions()` RPC that returns only active institutions (grants EXECUTE to anon + authenticated).

**Prerequisites.** II-1 (institutions table populated).

**Verification.**
- On lab creation, typing "hu" shows HUJI in dropdown.
- Picking HUJI reveals campus dropdown with 4 campuses.
- Picking Weizmann hides campus field.
- Submitting sets `labs.institution_id` + `labs.campus`.

**Commit.** `institution+campus picker in lab creation form`

**Rollback.** Revert form to free-text institution field.

---

### II-4. Email-code verification fallback

**Purpose.** Users with personal Gmail accounts working at HUJI need a way to verify their institutional affiliation without changing their signup email.

**Scope.**
- Migration: `0019_email_verification_rpcs.sql`:
  - `send_institution_verification_code(p_institution_id uuid, p_email text)` — inserts row into `email_verification_codes` with a hashed 6-digit code; server action then reads it back and sends via Resend to the entered email.
  - `verify_institution_code(p_institution_id uuid, p_code text)` — checks hash, expiry, attempts; on success inserts `user_institution_verifications` with `verified_via='email_code'`.
- NEW: `src/app/api/institutions/send-verification/route.ts` — POST endpoint that invokes send RPC + Resend email.
- NEW: `src/components/institution-verification-dialog.tsx` — used when user tries to access an institution they haven't verified for.

**Prerequisites.** II-1, II-2, II-3.

**Verification.**
- Sign up test account with Gmail email; try to access HUJI features → dialog appears.
- Enter `@huji.ac.il` email → send code → check inbox → enter code → confirm verification row inserted.

**Commit.** `email-code fallback for institution verification`

**Rollback.** Drop RPCs; remove route + dialog.

---

### II-5. Institution-scoped lab search + affiliation request

**Purpose.** Enable facility staff (Workstream III) to find and request oversight of specific labs at their institution.

**Scope.**
- Migration: `0020_search_labs_rpc.sql`:
  - `search_labs(p_institution_id uuid, p_campus text, p_query text)` — returns matching lab metadata (name, PI name, campus). Enforces `can_access_institution` at the top of the function; raises exception if not authorized.
- NEW: `src/app/dashboard/facility/search/page.tsx` (blocked on III-4 for the parent facility page, but the RPC + isolated component can be built first).

**Prerequisites.** II-1, II-2, II-4 (verification path exists), III-2 (affiliation table exists).

**Verification.**
- Manual: seed a few test labs at HUJI Ein Karem → verified user calls `search_labs` → gets results.
- Unauthorized user (different institution) → RPC raises exception.

**Commit.** `search_labs rpc + facility-side search ui`

**Rollback.** Drop the RPC; remove page.

---

### III-1. Facility technician role + facility invites

**Purpose.** Facility manager needs to invite vets and technicians to their facility.

**Scope.**
- Migration: `0021_facility_invites.sql`:
  - `facility_invites(id, facility_id, invited_by, email, role, token, accepted, expires_at, created_at)`
  - RLS: PI/lab_manager pattern replaced by `role_in_facility(facility_id) = 'facility_manager'`.
  - Helper: `role_in_facility(p_facility_id uuid)` returns `user_role`.
  - `get_pending_facility_invite(p_token text)` — mirror of `get_pending_invite`.
  - `accept_facility_invite(p_token text)` — mirror of `accept_invite` but writes to `facility_memberships`.
- EDIT: `handle_new_user` trigger — extend to also auto-match pending facility_invites (same pattern as lab_invites in 0012).
- Dashboard: facility staff invite modal (mirror of team invite modal).
- API route: `send-facility-invite-email` (mirror of send-invite-email).

**Prerequisites.** None (facility_memberships schema exists).

**Verification.**
- Insert test facility + facility_membership as manager.
- Send invite via modal → row inserted with token → email sent (or fallback).
- Click accept link → new user signs up → membership added → email match.

**Commit.** `facility invites + accept flow + technician role`

**Rollback.** Drop table + RPCs; revert modal + API route.

---

### III-2. Lab-facility affiliations (mutual consent)

**Purpose.** Replace the top-down `labs.facility_id` model with a many-to-many affiliation table requiring PI acceptance.

**Scope.**
- Migration: `0022_lab_facility_affiliations.sql`:
  - `lab_facility_affiliations(lab_id, facility_id, status, requested_by, requested_by_side, approved_by, requested_at, responded_at, notes)` — PK (lab_id, facility_id).
  - `request_facility_affiliation(p_lab_id, p_facility_id, p_notes)` — SECURITY DEFINER; caller must be either lab PI/manager or facility manager; inserts pending row.
  - `accept_facility_affiliation(p_lab_id, p_facility_id, p_notes)` — the OTHER side accepts.
  - `revoke_facility_affiliation(p_lab_id, p_facility_id)` — either side can revoke.
- Migration: `0023_update_facility_overseer_helper.sql` — rewrite `is_facility_overseer_of_lab` to check `lab_facility_affiliations` with `status='active'` instead of `labs.facility_id`.
- Migration: `0024_rename_labs_facility_id.sql` — rename `labs.facility_id` → `labs.physical_facility_id` for clarity (represents physical location, not oversight).

**Prerequisites.** III-1 (facility exists).

**Verification.**
- Test flow: PI creates lab → vet creates facility → vet requests affiliation → PI sees pending → PI accepts → affiliation active → vet's `can_read_lab(lab_id)` returns true.
- Revoke → `can_read_lab` returns false.

**Commit.** `lab-facility affiliations with mutual consent`

**Rollback.** Drop new table + rename column back + restore old helper body.

---

### III-3. Facility management page (dashboard)

**Purpose.** Home for facility staff. Lists affiliated labs, pending requests, staff, facility profile.

**Scope.**
- NEW: `src/app/dashboard/facility/page.tsx` (server component) — visible only when user has `facility_memberships`.
- NEW: `src/app/dashboard/facility/AffiliatedLabsList.tsx`.
- NEW: `src/app/dashboard/facility/PendingRequests.tsx` — inbound + outbound.
- NEW: `src/app/dashboard/facility/FacilityStaffList.tsx` + invite modal.
- NEW: `src/app/dashboard/facility/FacilityProfile.tsx`.
- EDIT: main dashboard nav — surface "Facility" link when user is a facility member.

**Prerequisites.** III-1, III-2.

**Verification.**
- Sign in as facility_manager → sidebar shows "Facility" link → page loads with affiliated labs list.
- Sign in as lab-only user → "Facility" link hidden.

**Commit.** `facility management dashboard`

**Rollback.** Remove `/dashboard/facility` route + nav link.

---

### III-4. Lab-side facility request acceptance

**Purpose.** PIs need a place to see and accept/decline pending facility affiliation requests.

**Scope.**
- EDIT: `src/app/dashboard/settings/page.tsx` — add "Facility oversight requests" section (only shown if user is PI/lab_manager of any lab).
- Bell icon in header shows badge count for pending requests.

**Prerequisites.** III-2, III-3.

**Verification.**
- With test pending request → PI's settings shows it → accept → status flips to active → vet's dashboard reflects.

**Commit.** `lab pi facility request inbox in settings`

**Rollback.** Remove the section.

---

### III-5. Flutter facility view mode

**Purpose.** Vet on their phone in a vivarium room needs the facility-scoped view.

**Scope.**
- EDIT: `lib/services/profile_service.dart` — extend `refresh()` to also cache `facility_memberships`.
- NEW: `lib/services/user_type_context.dart` — derives solo / multi_lab / facility_overseer from cached memberships.
- EDIT: Header widgets on each screen — render facility name when user is a facility overseer.
- EDIT: Cages tab — for facility overseers, show flat list across all affiliated labs with lab chip on each card + filter chips.
- EDIT: Scan tab — verify RLS handles cross-lab cage lookup (should already work; add lab chip on the scan-result screen).

**Prerequisites.** III-1, III-2, III-3.

**Verification.**
- Sign in as facility_manager on Flutter → header shows facility name; Cages tab shows cages from all affiliated labs with chips.
- Scan a cage from a different affiliated lab → detail screen shows lab chip.

**Commit.** `flutter facility view mode + cages tab adaptation`

**Rollback.** Revert header + Cages tab changes.

---

### IV-1. Flag system schema

**Purpose.** Store cage flags with typed reasons + severity + audit trail.

**Scope.**
- Migration: `0025_flag_system_schema.sql`:
  - `flag_types(id, label, description, icon, default_severity, sort_order, system, created_at)` — seed pre-populated (see IV-3).
  - `cage_flags(id, cage_id, lab_id, flag_type, severity, notes, flagged_by, resolved, resolved_by, resolved_at, resolution_notes, created_at)` — partial indexes on unresolved.
  - `cage_flag_attachments(id, flag_id, file_path, content_type, size_bytes, caption, uploaded_by, uploaded_at)`.
- RLS:
  - `flag_types` SELECT open to authenticated; no writes.
  - `cage_flags` SELECT `can_read_lab(lab_id)`; INSERT `is_facility_overseer_of_lab(lab_id)`; UPDATE by lab member (resolve) OR self within 1 hour (edit); no DELETE.
  - `cage_flag_attachments` scoped to parent flag's lab.

**Prerequisites.** None (works with current facility helpers).

**Verification.**
- ```sql
  SELECT count(*) FROM flag_types;    -- should be 14
  ```

**Commit.** `flag system schema + rls`

**Rollback.** Drop the three tables.

---

### IV-2. Supabase Storage bucket for flag attachments

**Purpose.** Photo storage backing cage_flag_attachments.

**Scope.**
- Migration: `0026_flag_storage_bucket.sql`:
  - `INSERT INTO storage.buckets (id, name, public) VALUES ('flag-attachments', 'flag-attachments', false);`
  - Storage policies for upload / read / delete (scoped by parent flag's lab via subquery).

**Prerequisites.** IV-1.

**Verification.**
- ```sql
  SELECT name, public FROM storage.buckets WHERE id = 'flag-attachments';
  ```
- Try uploading a test file via Supabase Studio using an authenticated session that has facility oversight — should succeed.

**Commit.** `flag-attachments storage bucket + rls`

**Rollback.** Delete bucket + drop policies.

---

### IV-3. Seed flag_types

**Purpose.** Pre-populate the 14 flag types so Flutter dropdown has content on day one.

**Scope.**
- Migration: `0027_flag_types_seed.sql` — INSERT 14 rows (overcrowded, sick_animal, injury, separate_pups, fighting, cage_dirty, water_food_issue, escaped, deceased, behavioral, pregnancy_noted, humane_endpoint, equipment_issue, other).

**Prerequisites.** IV-1.

**Verification.**
- ```sql
  SELECT id, label, default_severity FROM flag_types ORDER BY sort_order;
  ```

**Commit.** `seed 14 default flag types`

**Rollback.** `DELETE FROM flag_types WHERE system = true;` — safe if no flags reference these yet.

---

### IV-4. Flutter flag creation dialog + photo capture + upload

**Purpose.** The main entry point — vet on their phone tapping "flag" on a scanned cage.

**Scope.**
- NEW: `lib/presentation/screens/flags/flag_types_picker.dart` — bottom sheet with grid of icons.
- NEW: `lib/presentation/screens/flags/create_flag_screen.dart` — form: type, severity, notes, photos.
- NEW: `lib/services/flag_upload_service.dart` — orchestrates flag insert + photo compression + Storage upload + attachment insert.
- NEW: `lib/core/utils/image_compressor.dart` — wraps `flutter_image_compress` (add to pubspec).
- EDIT: cage detail screen — surface unresolved flags at top; add "Flag" button.
- EDIT: `pubspec.yaml` — add `flutter_image_compress` + `cached_network_image`.

**Prerequisites.** IV-1, IV-2, IV-3.

**Verification.**
- Manual: on Flutter, open cage → tap Flag → pick "Sick animal" → snap 2 photos → submit → verify:
  - `cage_flags` row created
  - Two files uploaded to `flag-attachments/flags/{id}/`
  - Two `cage_flag_attachments` rows created

**Commit.** `flutter flag creation with photo upload`

**Rollback.** Remove new screens + service; revert cage detail.

---

### IV-5. Dashboard cage detail flags section + resolve flow

**Purpose.** PI sees flags on their cages and marks them resolved.

**Scope.**
- EDIT: cage detail page — "Flags" section at top with unresolved flags.
- Each flag: icon, severity chip, notes, flagged_by name, timestamp, photos (thumbnails → lightbox).
- Photo signed URLs generated on demand via `supabase.storage.from('flag-attachments').createSignedUrl(path, 3600)`.
- Resolve button → dialog → update flag → refresh.

**Prerequisites.** IV-1, IV-2, IV-4 (so there are flags to display).

**Verification.**
- Flag a cage from Flutter → open dashboard → see flag with photo → click resolve → confirm resolved.

**Commit.** `dashboard cage flag display + resolve`

**Rollback.** Remove flags section.

---

### IV-6. Realtime subscription for cage_flags

**Purpose.** PI's dashboard shows new flags without manual refresh.

**Scope.**
- EDIT: `lib/services/realtime_sync_service.dart` — add `cage_flags` and `cage_flag_attachments` to `_tables`.
- EDIT: dashboard cage detail — subscribe to `cage_flags` postgres_changes filtered by cage_id.

**Prerequisites.** IV-1.

**Verification.**
- Two windows open: Flutter (as vet) + dashboard (as PI) → flag from Flutter → dashboard reflects within ~1s.

**Commit.** `realtime cage_flags subscription`

**Rollback.** Remove from _tables + dashboard subscription.

---

### IV-7. Notifications for urgent flags (later)

**Purpose.** Reduce PI response latency for urgent welfare issues.

**Scope.**
- Server: Postgres trigger on `cage_flags` INSERT — if `severity='urgent'`, insert into a `flag_notifications` queue table.
- Vercel cron / Supabase Edge Function — reads queue every minute, sends emails via Resend.
- Daily digest for `severity IN ('info', 'attention')` — batch by lab + PI.

**Prerequisites.** IV-1, IV-5.

**Verification.**
- Insert urgent test flag → confirm email arrives in PI's inbox within 2 minutes.

**Commit.** `urgent flag email + daily digest`

**Rollback.** Drop trigger + cron.

---

### V-1. Observations INSERT policy extended to facility staff

**Purpose.** Vets need direct write on `observations` — their welfare authority.

**Scope.**
- Migration: `0028_observations_insert_facility_staff.sql`:
  ```sql
  DROP POLICY "observations_insert_lab" ON observations;
  CREATE POLICY "observations_insert_lab" ON observations
    FOR INSERT TO authenticated
    WITH CHECK (
      can_write_lab(lab_id) 
      OR is_facility_overseer_of_lab(lab_id)
    );
  ```

**Prerequisites.** None.

**Verification.**
- Sign in as facility staff → attempt to INSERT observation for a cage in an affiliated lab → succeeds.
- Sign in as facility staff → attempt to INSERT observation for a cage in a non-affiliated lab → fails.

**Commit.** `observations write access for facility staff`

**Rollback.** Restore previous policy body.

---

### V-2. Litter proposal system (optional, later)

**Purpose.** Vets can seed litter records for PI to accept/augment.

**Scope.** Non-trivial — see previous discussion.
- Migration: `pending_proposals` table.
- RPCs: `propose_litter`, `accept_litter_proposal`, `reject_litter_proposal`, `expire_stale_proposals`.
- Dashboard: pending proposals inbox with bulk actions.
- Flutter: propose-litter form.

**Prerequisites.** IV-4 (vets already comfortable in the app).

**Verification.** Full end-to-end test with vet on Flutter, PI on dashboard.

**Commit.** `litter proposal system with pi review + bulk actions`

**Rollback.** Drop table + RPCs + UI.

---

### VI-1. Flutter invite form + shared email API route ✅ shipped 2026-08-05 (dashboard `abab60a`, flutter `2848e76`)

**Purpose.** Wire the dead "Invite collaborator" row in Flutter settings.

**Scope.**
- NEW: `src/app/api/invites/send-email/route.ts` — POST endpoint accepting `{ token }` with `Authorization: Bearer <supabase-jwt>`. Reuses `sendInviteEmail` internals.
- REFACTOR: `src/app/dashboard/team/actions.ts` — extract email-build logic into a shared function; server action + API route both use it.
- EDIT: `lib/presentation/screens/settings/redesigned_settings_screen.dart` — replace `_buildInviteRow` toast handler with a real dialog (email + role + send).
- Flutter calls: insert `lab_invites` row → POST to API route with JWT.

**Prerequisites.** None.

**Verification.**
- Open Flutter as PI → tap "Invite collaborator" → dialog → send → confirm `lab_invites` row + email delivered.

**Commit.** `flutter invite form + shared email api route`

**Rollback.** Remove API route + dialog; restore toast handler.

---

### VII-1. Audit log

**Purpose.** IACUC compliance — who deleted / modified what and when.

**Scope.**
- Migration: `audit_logs(id, user_id, lab_id, action, target_table, target_id, before_data jsonb, after_data jsonb, ip_address, user_agent, created_at)`.
- Triggers on destructive operations: DELETE on cages/animals/litters/treatments; UPDATE on `cage_flags.resolved`, `lab_memberships` (role changes), `lab_facility_affiliations` (revoke).
- Optional: read log via `/dashboard/audit` (PI-only view).

**Prerequisites.** None.

**Verification.**
- Delete a test cage → `audit_logs` row appears with before_data.

**Commit.** `audit_logs table + triggers on destructive ops`

**Rollback.** Drop triggers + table.

---

### VII-2. Move lab_settings from profiles to labs

**Purpose.** `profiles.lab_settings` is per-user but stores lab-wide config — architecturally wrong.

**Scope.**
- Migration: 
  - `ALTER TABLE labs ADD COLUMN settings jsonb NOT NULL DEFAULT '{}';`
  - Backfill: for each lab, pick the first PI's `lab_settings` and copy to `labs.settings`. (Or aggregate all PI's settings by lab — decision needed.)
  - Update `labSettingsProvider` in Flutter to read from `labs.settings` instead of `profiles.lab_settings`.
  - Update `ProfileService.updateLabSettings` to write to `labs.settings` (via SECURITY DEFINER RPC that checks caller is PI/lab_manager of the lab).
  - Deprecate but keep `profiles.lab_settings` column for one release cycle to allow rollback.

**Prerequisites.** None strictly; better after multi-lab UX (Workstream I) because it now makes sense per lab.

**Verification.**
- Migrate → verify Flutter still reads correct values → verify updates persist.

**Commit.** `move lab_settings from profiles to labs`

**Rollback.** Point Flutter back to `profiles.lab_settings` (still populated during grace period).

---

### VIII-1. Round-trip parity test (Task #7 — never closed)

**Purpose.** Verify Flutter ↔ Supabase ↔ dashboard sync end-to-end for all 5 entities, both directions.

**Scope.** Testing, not building. Requires you at a phone; me querying Supabase between steps.

**Test cases.**
1. Add an animal from Flutter → confirm in Supabase → confirm on dashboard.
2. Add a treatment from Flutter → confirm in Supabase → confirm on dashboard.
3. Add a litter from Flutter → confirm in Supabase → confirm on dashboard.
4. Add a record from Flutter → confirm in Supabase → confirm on dashboard.
5. Add a cage from dashboard → confirm arrives on Flutter via realtime → verify local SQLite updated.
6. Add an animal from dashboard → same verification.
7. Turn on airplane mode → add cage from Flutter → turn off airplane mode → verify outbox flushes and cage appears in Supabase.

**Verification.** Each case has an expected Supabase state I query.

**Commit.** None (verification only).

---

### VIII-2 through VIII-5. Resend production hardening

- **VIII-2.** In Resend dashboard: add `cagesync.com` domain → follow DNS instructions → verify status.
- **VIII-3.** Change `from` address in `src/app/dashboard/team/actions.ts:75` from `onboarding@resend.dev` to `invites@cagesync.com`.
- **VIII-4.** Rotate the API key: generate new key in Resend dashboard → replace in `.env.local` → replace in Vercel env vars → revoke old key.
- **VIII-5.** Vercel project settings: add `RESEND_API_KEY` (new value) + `NEXT_PUBLIC_SITE_URL=https://app.cagesync.com`.

**Verification per step:** send test invite to a non-Resend-account email and confirm delivery.

**Commit.** `use verified from address for invite emails` (only for VIII-3).

---

### VIII-6. Commit or resolve 8 pre-existing Flutter files ✅ shipped 2026-08-05

**Bundled into three commits on flutter main:**
- `2848e76` — VI-1 invite form (api_config, invite_member_dialog, settings wire-up)
- `a422769` — notification_settings_screen + flagged_cages gear wire-up + router entry
- `6ca3225` — paywall pricing update + onboarding badge clip + edit-profile FocusNode + drive_service UTC coercion

**Files still uncommitted on Flutter main (from before this session):**
- lib/core/router/app_router.dart
- lib/presentation/screens/flags/flagged_cages_screen.dart
- lib/presentation/screens/onboarding/widgets/onboarding_connect_screen.dart
- lib/presentation/screens/paywall/pro_paywall_screen.dart
- lib/presentation/screens/profile/edit_profile_screen.dart
- lib/presentation/screens/settings/redesigned_settings_screen.dart (interleaved with new changes now)
- lib/services/drive_service.dart
- lib/presentation/screens/flags/notification_settings_screen.dart (untracked)

**Action.** Review each diff, commit with descriptive message OR discard if no longer needed. `flagged_cages_screen.dart` and `notification_settings_screen.dart` might already be superseded by the flag system in Workstream IV — check before keeping.

**Commit.** Individual per file, or one bundled commit "pre-session flutter work" with clear list.

---

### VIII-7. records.synced_to_sheet tech debt

**Options:**
- Formalize: keep the column, document that it tracks Google Sheets sync state per record (Flutter-local).
- Remove: if Google Sheets sync is being fully deprecated in favor of Supabase, drop the column.

**Decision needed** based on Google Sheets sync roadmap.

---

## 5. Recommended execution order

Priorities depend on your near-term goal. Two paths:

### Path A — Ship multi-lab MVP for early users (fastest to value)
1. I-1 Dashboard lab switcher
2. I-2 Onboarding branching (PI path only for now)
3. I-3 Flutter lab switcher
4. VI-1 Flutter invite form
5. VIII-1 Sync round-trip verification
6. VIII-2 through VIII-5 Production hardening
7. VIII-6 Commit pre-existing Flutter work

**Estimated: 6-8 focused days. Ready to onboard real users.**

### Path B — Full facility feature (needed before onboarding a vivarium customer)
Everything in Path A, plus:

8. II-1 Institutions schema
9. II-3 Institution picker in creation forms
10. II-2 Auto-verify on signup
11. III-1 Facility invites + technician role
12. III-2 Lab-facility affiliations
13. III-3 Facility management dashboard
14. III-4 Lab-side facility request acceptance
15. III-5 Flutter facility view mode
16. II-5 Institution-scoped lab search
17. II-4 Email-code verification fallback
18. IV-1 through IV-6 Flag system (schema, storage, seed, Flutter, dashboard, realtime)
19. V-1 Observations write for facility staff

**Estimated: 4-5 weeks focused effort on top of Path A.**

### Path C — Compliance & polish (nice-to-haves)
- I-4 Cage transfer
- V-2 Litter proposal system
- VII-1 Audit log
- VII-2 lab_settings migration
- IV-7 Urgent flag notifications
- VIII-7 records.synced_to_sheet cleanup

**Estimated: 2 weeks. Do these after Path A or B based on real user feedback.**

---

## 6. Verification protocol (applies to every step)

For each step:

1. **Read the "Verification" checklist for that step.**
2. **Write the migration or code change.**
3. **Apply / build:**
   - Migrations: `echo Y | supabase db push -p '<password>'`
   - Dashboard: `npm run build` must succeed with 0 errors.
   - Flutter: `flutter analyze <touched files>` must succeed with 0 new issues.
4. **Run the verification queries or manual checks listed.**
5. **If anything fails: fix before committing. If migration is applied but code is broken, roll back the migration too.**
6. **Commit with the suggested message header** (co-author me if you want the pattern kept consistent).
7. **Do NOT proceed to the next step until the current one is verified working end-to-end.**

If a step has an app-side test that requires a phone or browser, the user does the test; I query Supabase to confirm state changes.

---

## 7. Deferred decisions and open questions

- **Multi-facility labs.** Current `lab_facility_affiliations` allows a lab to be affiliated with multiple facilities. Rare in practice. Defer UI for the "affiliated with 2+ facilities" case until a real customer needs it.
- **Institution registry population.** MVP seeds ~20 institutions manually. Long-term needs user-submitted-with-approval flow + admin curation UI. Defer until 50+ institutions requested.
- **Custom flag types per facility.** Facility-specific flag types (`flag_types.system=false`) not exposed in MVP. Add when a customer asks.
- **Litter proposal system (V-2).** Recommended to skip unless a facility customer specifically requests it. Direct observations + PI-creates-litter is simpler and enough.
- **HEIC image handling.** Flutter should convert HEIC to JPEG on device before upload. If any test user reports broken thumbnails, revisit.
- **Photo lifecycle policy.** Delete photos of resolved flags after N months? Decision needed when storage bill grows.
- **Institution email domain squatting.** Allow multiple facilities per (institution, campus) for MVP. Add ownership transfer + dispute path later.
- **`profiles.lab_id` after multi-lab UI.** Currently repurposed as "active lab". Consider explicit rename to `active_lab_id` after Workstream I lands, to remove semantic confusion.
- **Rate limiting.** No app-level rate limits on flag creation, invite sending, etc. Add if abuse observed.
- **Audit log retention.** How long to keep audit_logs? IACUC typically requires 3 years for animal research records. Set retention policy accordingly.
- **Facility signup email domain.** Do we require verified institutional email to CREATE a facility, or accept any verified user? Recommend requiring verification for MVP.

---

## 8. Appendix — key schema/architectural decisions already made

### Multi-tenancy model
- Users have many `lab_memberships` and many `facility_memberships`.
- `profiles.lab_id` = "active lab" (which lab the app is currently displaying).
- All entity RLS gated by `can_read_lab / can_write_lab / can_delete_lab` — do NOT directly filter on `lab_id = my_lab_id()`.
- Facility oversight is one-way (facility staff read affiliated labs; they never write except to `observations` and `cage_flags`).

### Role hierarchy (conservative ladder)
- `observer / facility_vet / facility_manager` (of lab, not facility) : read only
- `technician` : INSERT + UPDATE (no DELETE)
- `researcher / lab_manager / pi` : full CRUD

Facility-side roles:
- `facility_manager` : administrative authority within facility (invite staff, request affiliations)
- `facility_vet` : senior clinical authority
- `facility_technician` : day-to-day operations

### Consent model
- Lab invites: PI/lab_manager sends → invitee accepts (or auto-matched at signup by email).
- Facility affiliations: either side can request; the other side accepts.
- Facility staff invites: only facility_manager can send.

### Discovery model
- Institution-scoped search (bounded by verified institution) is the primary discovery mechanism.
- Fallbacks: by email, by lab ID, PI-initiated invite.
- No public listings.

### Write authority model
- Welfare data (observations, cage_flags) : facility staff have direct write.
- Research records (cages, animals, treatments, breeding_pairs, experiments) : PI-only writes.
- Litter records : PI-only writes; vet can PROPOSE (V-2, deferred).

### Facility ≠ physical location
- `labs.physical_facility_id` (after II-2 rename) : where the lab physically resides. Doesn't grant oversight.
- `lab_facility_affiliations` : which facilities have oversight of which labs. Grants read + limited write.
- These are separate concerns. A lab can be physically at HUJI Ein Karem but have oversight affiliations with both HUJI Ein Karem Vivarium and a shared HUJI Rehovot Vivarium (edge case).

---

_End of roadmap._

_When we resume: pick a Path (A / B / C) and I'll start from step 1 of that path. Each step will be scoped, applied, verified, and committed before moving to the next._
