# CageSync Dashboard — Claude Context File

> This file exists so any Claude session can pick up exactly where the last one left off.
> Always read this file at the start of every session before writing any code.

---

## What is CageSync?

CageSync is a biotech SaaS platform for lab animal colony management.
- **Mobile app:** Flutter (already built) — QR cage scanning, colony tracking, genotype management, treatment logs, breeding timelines, Google Sheets sync
- **Web dashboard:** Next.js (this repo) — PI command center, facility oversight, team management
- **Hosted at:** app.cagesync.com (Vercel)
- **Landing page:** cagesync.com (separate repo)

**Founder:** Govind Prakash — IISER Bhopal BS-MS 2022 graduate, solo founder, technical background in Python, Flutter, AWS

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Auth + DB | Supabase (Postgres + RLS + Realtime) |
| Hosting | Vercel (app.cagesync.com) |
| Email | Resend (planned) |
| Payments | Stripe (planned, v2) |

---

## Architecture Decisions

1. **Supabase is source of truth** — all data lives in Postgres
2. **Google Sheets is one-directional export only** — Supabase → Sheets, never reverse
3. **Google Sheets sync is a feature** — marketed as "Live Google Sheets sync" not "export"
4. **RLS enforced at DB level** — lab isolation, facility vet access all done in Postgres policies
5. **No VPS** — Vercel + Supabase free tier until first paying customer, then Vercel Pro + Supabase Pro ($25/mo)

---

## User Roles (Hierarchy)

```
facility_vet / facility_manager  ← above all labs, read-only across facility, can flag cages
    └── pi                       ← full lab control, can change member roles
        └── lab_manager          ← read/write all cages, cannot change roles
            └── researcher       ← read/write own experiment cages only
                └── technician   ← log observations/treatments only
                    └── observer ← read-only everything
```

---

## Brand Identity

See BRAND.md for full details. Quick reference:

- **Primary:** `#1A7F64` (deep teal)
- **Primary light:** `#25A882`
- **Surface:** `#F8FAFB`
- **Ink (text):** `#1A1A2E`
- **Amber accent:** `#F5A623`
- **Danger:** `#E53E3E`
- **Fonts:** Space Grotesk (headings), Inter (body), Source Code Pro (data/IDs)

---

## Database Schema Status

### ✅ Designed (SQL ready in supabase/migrations/)
- labs, profiles, rooms, cages, animals
- treatments, observations, breeding_pairs
- experiments, experiment_animals, lab_invites

### 🔲 Designed but not yet run
- facilities (links labs to a facility)
- cage_flags (facility vet flagging system)
- audit_logs (IACUC compliance)
- attachments (PCR images, protocol PDFs)
- notifications (in-app)
- animal_transfers (cage/lab transfer history)
- genotype_records (PCR confirmation history)
- tasks (scheduled reminders)
- litters (per breeding pair)
- substances (drug registry)
- lab_settings (per lab config)
- sync_logs (Google Sheets sync history)
- qr_codes (QR registry)

### Key RLS Pattern
```sql
-- Helper: get current user's lab_id
CREATE OR REPLACE FUNCTION my_lab_id()
RETURNS UUID AS $$
  SELECT lab_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;
```

---

## Project Structure

```
cagesync-dashboard/
├── CLAUDE.md                    ← YOU ARE HERE
├── BRAND.md                     ← brand colors, fonts, tokens
├── supabase/
│   └── migrations/              ← all SQL files numbered and ordered
├── src/
│   ├── middleware.ts            ← auth redirect middleware
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts        ← browser client
│   │       ├── server.ts        ← server client
│   │       └── middleware.ts    ← session management
│   └── app/
│       ├── login/               ← auth pages
│       ├── dashboard/           ← main dashboard
│       └── ...
```

---

## Current Build Status

- [x] Next.js project initialized
- [x] Supabase client utilities created (client.ts, server.ts, middleware.ts)
- [x] .env.local configured
- [x] Dashboard shell (layout, sidebar, dynamic topbar)
- [x] Cages page (complete with add cage modal)
- [ ] Login page
- [ ] Supabase SQL schema run
- [ ] Auth flow tested end-to-end

---

## Environment Variables Needed

```
NEXT_PUBLIC_SUPABASE_URL=https://bcdiuxpetrwypqrxlsxh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SECRET_KEY=your_secret_key
```

---

## Competitors

- **SoftMouse** — established, no native mobile app, opaque pricing
- **Moustra** — newer, web-only
- **Benchling** — enterprise ELN, overkill for colony management, expensive
- **MIMS** — outdated UI, desktop-only

**CageSync advantage:** Only mobile-first (Flutter) + web dashboard combo in this niche. Facility vet oversight layer is unique.

---

## UI/UX Design Patterns

### Page Title Pattern
**RULE:** Page titles live ONLY in the topbar — never duplicate on the page content.

- ✅ Dynamic topbar shows current page name (DynamicTopbar component)
- ❌ Don't add `<h1>Page Name</h1>` to page content
- ❌ Don't hardcode page titles in layout

**Implementation:**
```tsx
// ✅ Good: Action buttons aligned right, no title
<div className="flex items-center justify-end mb-6">
  <AddButton />
</div>

// ❌ Bad: Duplicate title
<div className="flex items-center justify-between mb-6">
  <h1>Page Name</h1>
  <AddButton />
</div>
```

---

## Important Rules for Claude

1. Always use brand colors from BRAND.md — never generic blue/gray defaults
2. Use Space Grotesk for headings, Inter for body text
3. No `<form>` tags — use onClick handlers
4. Supabase SSR pattern must use `@supabase/ssr` — not the old `@supabase/auth-helpers-nextjs`
5. All data mutations go through server actions or API routes — never call Supabase directly from client for writes
6. RLS is always on — never use service role key on the frontend
7. Keep components small and focused — no mega-components
8. **Page titles ONLY in topbar** — never duplicate on page content