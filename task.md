# Kindred — Master Task List

> Derived from all spec docs (00–09). Work phases in order. Do not start a phase until all acceptance criteria for the previous phase pass. Each task maps to one or more acceptance criteria.

---

## Setup: Repo & Tooling

- [ ] Initialize monorepo with pnpm workspaces (apps/web, apps/bot, packages/db, packages/ai, packages/shared)
- [ ] Configure Turborepo build pipeline
- [ ] Set up TypeScript (`tsconfig.json`) across all packages
- [ ] Install and configure Tailwind + shadcn/ui in `apps/web`
- [ ] Create `.env.example` for all required secrets (no secrets committed)
- [ ] Configure CI (GitHub Actions): typecheck, lint, unit tests, cross-user isolation test

---

## Phase 1 — Foundation

### DB & RLS

- [ ] Write and run full SQL migration from `02-DATA-MODEL.md` (all enums, tables, indexes, triggers)
- [ ] Enable RLS on all 7 user-data tables
- [ ] Implement `app.current_user_id` session-variable scoping in the DB access layer (`packages/db`)
- [ ] Write the `set_updated_at` trigger (people)
- [ ] Write the `bump_last_contact` trigger (interactions → people.last_contact_date)
- [ ] Write automated cross-user isolation test (user A cannot read user B's rows)

### Auth

- [ ] Set up NextAuth.js with a custom Telegram Login provider
- [ ] Build Telegram Login Widget on the landing/login page
- [ ] Server route `POST /api/auth/telegram`: verify HMAC-SHA256, reject tampered/stale (>24h) payloads
- [ ] Upsert `users` row + create `subscriptions` row (`tier='free'`) on first login
- [ ] Write unit tests: valid hash, forged hash, stale auth_date
- [ ] Implement logout (`POST /api/auth/logout`) → clear session, redirect to landing

### Dashboard Shell

- [ ] Build authenticated layout: top nav (Home, People, Calendar, Settings), avatar menu (logout)
- [ ] Implement auth guard: unauthenticated requests to `/dashboard/*` redirect to login
- [ ] Verify nav active-state highlighting
- [ ] Responsive layout: test at 375px, 768px, 1280px
- [ ] Add empty states with primary CTA for all list views

### People CRUD

- [ ] `GET /api/people` with `q`, `type`, `sort` query params
- [ ] `POST /api/people` server action / route handler
- [ ] `GET /api/people/:id` (person + events + interactions)
- [ ] `PATCH /api/people/:id` (partial update)
- [ ] `DELETE /api/people/:id` (cascade confirmed in DB)
- [ ] Build People list page: searchable, filterable by `relationship_type`, sortable
- [ ] Build "Add person" form: all `people` table fields; multi-tag input for `hobbies`; repeatable rows for `gift_history`
- [ ] Birthday input: handle unknown year — store as `0001-MM-DD`; `formatBirthday()` helper hides year when `0001`
- [ ] Build person detail page: all fields, grouped, inline edit
- [ ] Delete with confirmation dialog

### Events

- [ ] `POST /api/events`, `PATCH /api/events/:id`, `DELETE /api/events/:id`
- [ ] `GET /api/events` with `from`/`to` params; `nextOccurrence(event, fromDate)` helper for recurring resolution
- [ ] Auto-create birthday event when `birthday` set on person (server action logic, not a DB trigger)
- [ ] Reconcile birthday event on `PATCH /api/people/:id` (update date, no duplicate)
- [ ] Remove auto-created birthday event when birthday cleared (if user hasn't manually edited it)
- [ ] Build Calendar page: events for next 90 days, grouped by month, color-coded by type

### Interactions

- [ ] `POST /api/interactions` route; side effect bumps `people.last_contact_date`
- [ ] "Log contact" action on person page (date default today, channel, notes)
- [ ] Interaction history timeline on person page (newest-first, channel + notes)

### Dashboard Home

- [ ] Stat cards: people tracked, events this week, people needing attention (no contact 30+ days), days to next birthday
- [ ] "Upcoming events" panel (next 30 days, resolves recurring)
- [ ] "Recent people" panel
- [ ] Verify stats against seeded test data

### Settings

- [ ] Timezone selector (IANA list, browser default, stored on `users`)
- [ ] Account info display
- [ ] Delete account: wipes all owned rows; typed confirmation required

### Phase 1 Gate

- [ ] All Phase 1 acceptance criteria pass
- [ ] End-to-end demo script runnable on staging (log in → add 5 people → calendar → log interaction → stats → log out → log back in → data persists)
- [ ] Deployed to Vercel (staging) + Supabase staging project

---

## Phase 2 — Intelligence

### AI Service Module (`packages/ai`)

- [ ] Set up `packages/ai` with prompt templates in `packages/ai/prompts/` (versioned, e.g. `summarize.v1.ts`)
- [ ] Implement `summarizePerson(person, recentInteractions) → string`
- [ ] Implement `chatAboutPerson(person, interactions, history, message) → string`
- [ ] Implement `generateEventPlan(person, event, freeSlots?) → EventPlan` (calendar-blind for now)
- [ ] Add `packages/ai/CHANGELOG.md`; update on every prompt version bump
- [ ] Verify Claude API key is server-only (build output + network inspection checks)

### Person AI Summary (F2.1)

- [ ] AI summary block on person detail page with refresh button
- [ ] Cache last summary; regenerate on demand or on material profile change
- [ ] `POST /api/ai/summary` route (`{ personId, fresh? }`)
- [ ] Test: sparse profile → graceful "add more details" message, no hallucination

### Per-Contact AI Chat (F2.2)

- [ ] Add `ai_chats` table migration (id, user_id, person_id, role, content, created_at + RLS)
- [ ] Chat panel on person page
- [ ] `POST /api/ai/chat` and `GET /api/ai/chat/:personId` routes
- [ ] Persist both turns to `ai_chats`; history scoped per person
- [ ] Test: relevant gift suggestions, honest "I don't know" for unanswerable questions

### AI Event Plan (F2.3)

- [ ] "Generate plan" action on any upcoming event
- [ ] `POST /api/ai/plan` route; store result in `events.plan_generated`
- [ ] Render plan with regenerate option
- [ ] Test: `effort_level` differs by `relationship_type`; plan references actual profile hobbies

### Telegram Bot Worker (F2.4)

- [ ] Scaffold `apps/bot` with grammY (TypeScript)
- [ ] Deploy bot worker to Railway (staging)
- [ ] `/start` command: link chat to user by `telegram_id`
- [ ] `/who <name>` command: fuzzy match, return AI summary
- [ ] `/upcoming` command: list events in next 30 days
- [ ] `/plan <name>` command: generate/return plan for next event
- [ ] `/help` command
- [ ] All bot data access scoped to requesting user (cross-user test)
- [ ] Bot imports from `packages/ai` — no duplicated prompt logic

### Scheduler & Notifications (F2.5)

- [ ] `pg_cron` job: daily at fixed UTC time; find events where next occurrence − today ∈ `notify_days_before`; insert into `notification_queue` (idempotent via unique constraint)
- [ ] Supabase Edge Function: process `pending` queue rows → generate plan if partner/family/close_friend tier → POST to `/internal/send` → mark sent/failed
- [ ] `POST /internal/send` on bot worker (shared-secret auth); deliver Telegram message
- [ ] Timezone-aware day calculation (user's `timezone`, not UTC)
- [ ] Failed delivery: mark `failed` with error, retry on next run
- [ ] Test: simulate cron run, verify exactly one notification, unique constraint prevents duplicates

### AI Usage Tracking

- [ ] Create `ai_usage` table migration (user_id, kind, day, count)
- [ ] Record every Claude call; no enforcement yet (enforcement in Phase 3)

### Phase 2 Gate

- [ ] All Phase 2 acceptance criteria pass (no regression on Phase 1)
- [ ] End-to-end demo: add person with birthday 3 days out → cron run → Telegram message with tier-appropriate plan → dashboard AI chat returns grounded answers

---

## Phase 3 — Monetization

### Stripe Setup (F3.1)

- [ ] Create Stripe Product "Kindred Pro", $9/mo price in test mode
- [ ] Lazy customer creation on first checkout; store `stripe_customer_id` on `subscriptions`

### Entitlements Helper

- [ ] Build `packages/shared/entitlements.ts`: `can(user, entitlement) → { allowed, reason? }`
- [ ] Wire `can()` to every gated server action/route — no ad-hoc tier checks elsewhere

### Checkout Flow (F3.2)

- [ ] `POST /api/billing/checkout` → Stripe-hosted Checkout session
- [ ] "Upgrade to Pro" entry points: settings, every paywall modal, bot `/upgrade` command
- [ ] `/upgrade` bot command returns a unique checkout link for the requesting user
- [ ] Success/cancel URLs return to dashboard

### Stripe Webhook (F3.3)

- [ ] `POST /api/webhooks/stripe`: signature-verified; handle `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [ ] Update `subscriptions.tier / status / current_period_end` on each event
- [ ] Idempotent by Stripe event id
- [ ] Test: upgrade → Pro unlocks; cancel → access to period end → reverts; payment_failed → past_due banner

### Paywall UX (F3.4)

- [ ] Web: upgrade modal for every gated action (specific copy per gate, never generic)
- [ ] Bot: short message + `/upgrade` link for gated commands
- [ ] 11th person attempt: explain limit, offer upgrade, keep existing 10 manageable
- [ ] Post-cancel with >10 people: read-only on existing; add blocked

### Fair-Use AI Limits (F3.5)

- [ ] Enforce free limits using `ai_usage` table: 3 summary refreshes/day, 1 plan/month
- [ ] Block free user on 4th summary refresh (clear message)
- [ ] Block free user's 2nd plan in a month
- [ ] Pro users unlimited but still logged

### Billing Portal

- [ ] `GET /api/billing/portal` → Stripe billing portal URL
- [ ] `GET /api/entitlements` endpoint for UI badge/hide logic

### Phase 3 Gate

- [ ] All Phase 3 acceptance criteria pass (no regression on Phases 1–2)
- [ ] Full test-mode flow: free → paywall → upgrade → unlock → cancel → access until period end → revert
- [ ] All tier logic goes through `can()` (grep confirms no ad-hoc checks)

---

## Phase 4 — Integrations

### Google OAuth (F4.1)

- [ ] `GET /api/google/connect` (Pro-gated): redirect to Google consent URL
- [ ] `GET /api/google/callback`: exchange code, encrypt tokens, store in `oauth_connections`
- [ ] `POST /api/google/disconnect`: revoke at Google, delete connection
- [ ] Token encryption at rest (env key, not committed); auto-refresh on expiry
- [ ] Consent screen requests only: `contacts.readonly`, `calendar.freebusy`, `calendar.events` (incremental)
- [ ] Extend delete-account flow to revoke Google grants

### Contact Import (F4.2)

- [ ] `POST /api/google/import/preview`: fetch contacts, dedup-annotate, return preview list
- [ ] `POST /api/google/import/commit`: create selected people + auto birthday events (idempotent)
- [ ] Dedup by name+email or name+phone (no import if match exists)
- [ ] Paginate large contact lists; no timeout
- [ ] UI: reviewable import list with bulk-set `relationship_type`

### Calendar-Aware Planning (F4.3)

- [ ] Extend `generateEventPlan` to accept `freeSlots?: TimeSlot[]`
- [ ] Before plan generation for a connected Pro user: query Google Calendar free/busy (±5 days around event date, evenings)
- [ ] Pass available slots into prompt; `suggested_date` is now availability-grounded
- [ ] Graceful fallback to calendar-blind if free/busy call fails (with a note)
- [ ] Phase 2 calendar-blind behavior preserved for non-connected users (regression test)

### Add to Calendar (F4.4)

- [ ] `POST /api/google/calendar/add-event`: create Google Calendar event from plan's suggested date
- [ ] "Add to my calendar" button on plan UI — explicit user action only
- [ ] Incremental consent prompt if `calendar.events` scope not yet granted

### Phase 4 Gate

- [ ] All Phase 4 acceptance criteria pass (no regression on Phases 1–3)
- [ ] Demo: connect Google → import contacts → calendar-aware plan → add to calendar

---

## Phase 5 — Launch

### Onboarding Flow (F5.1)

- [ ] 4-step onboarding: timezone → add 3 people (quick form) → Google connect (optional/Pro) → link Telegram bot
- [ ] Each step skippable without broken state
- [ ] Onboarding flag on user; shows exactly once
- [ ] Step 4 deep-link verifiably links the bot account

### UX Polish (F5.2)

- [ ] Audit every screen for empty, loading, error states
- [ ] Add skeleton loaders for all AI calls; timeout fallback
- [ ] Friendly error messages — no raw stack traces ever
- [ ] Confirmation dialogs on all destructive actions
- [ ] Full mobile pass at 375px

### Referral System (F5.3)

- [ ] Generate unique referral code per user; `?ref=<code>` attribution on signup
- [ ] Award 1 month Pro to both referrer and referred after referred user completes onboarding
- [ ] Block self-referral and duplicate-account abuse (same `telegram_id`)
- [ ] Referral status page: invited / joined / rewarded

### Landing Page (F5.4)

- [ ] Public marketing page: headline, 3 benefits, demo embed, pricing, Telegram-login CTA
- [ ] SEO: title, meta description, OG image
- [ ] Lighthouse performance ≥ 90
- [ ] Copy: "personal relationship tool", never "CRM"

### Analytics & Monitoring (F5.5)

- [ ] Instrument key funnel events (signup, onboarding done, first AI use, upgrade, churn)
- [ ] Sentry (or equivalent) on web and bot
- [ ] Internal metrics view: DAU, conversion, MRR (Stripe API)
- [ ] Data export endpoint: all user data as JSON

### Launch Assets (F5.6)

- [ ] Record 60-second screen demo (add person → ask AI → receive bot plan)
- [ ] Prepare Product Hunt page (tagline, gallery images, first comment)
- [ ] Draft 3 community posts (story-led, links to landing page)

### Launch Readiness Checklist

- [ ] All Phase 1–4 acceptance criteria still pass (full regression)
- [ ] Privacy policy + terms published; data deletion works end to end
- [ ] Stripe in live mode; real $9 charge tested and refunded
- [ ] Bot load-tested (simulate N concurrent notifications)
- [ ] DB daily backups configured; restore tested once
- [ ] Rate limits on login, webhook, AI routes, bot commands
- [ ] No secrets in repo; all in platform secret managers; CI fails on committed secret pattern
- [ ] Rollback plan documented for web and bot deploys
- [ ] Google OAuth app reviewed/approved for production scopes

---

## Cross-Cutting (all phases)

- [ ] Zod schemas in `packages/shared/schemas` for every API input; used by both web and bot
- [ ] All API responses in `{ ok: true, data }` / `{ ok: false, error: { code, message } }` shape
- [ ] Error codes from `08-API-CONTRACTS.md §10` used consistently; clients branch on `error.code`
- [ ] Claude API called server-side only — verified in CI (no key in client bundle)
- [ ] RLS cross-user isolation test runs in CI every phase
- [ ] Dependency vulnerability scanning in CI
