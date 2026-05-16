# 03 — Phase 1: Foundation

> **Goal:** A user can log in with Telegram and fully manage their relationship database. No AI, no payments, no integrations yet.
>
> **Milestone:** "I can log in and my contacts, events, and notes are saved and editable."
>
> **Duration estimate:** ~3 weeks

---

## 1. Scope

| In scope | Out of scope (later phases) |
|---|---|
| Telegram Login auth + session | AI chat (Phase 2) |
| Supabase schema + RLS deployed | Telegram notifications (Phase 2) |
| Dashboard shell + navigation | Stripe / paywall (Phase 3) |
| People: create, read, update, delete | Google integrations (Phase 4) |
| Events: auto-create birthday, manual add/edit | Onboarding flow (Phase 5) |
| Interactions: log a contact | |
| Dashboard home: stats + upcoming events + recent people | |
| Settings: timezone, account | |

## 2. Features & acceptance criteria

### F1.1 — Telegram login
**Build:** Telegram Login Widget on the landing page. Server route verifies the HMAC hash with the bot token. On success, upsert into `users`, create a `subscriptions` row with `tier='free'`, issue a NextAuth session.

**Acceptance:**
- [ ] Clicking the widget and authorizing in Telegram returns the user to an authenticated dashboard.
- [ ] The HMAC verification rejects tampered payloads (unit test with a forged hash).
- [ ] `auth_date` older than 24h is rejected.
- [ ] A returning user logs in to the same account (matched by `telegram_id`).
- [ ] Logout clears the session and redirects to the landing page.

### F1.2 — Database & RLS
**Build:** Run the full migration from `02-DATA-MODEL.md`. Enable RLS on all tables. Implement the session-variable scoping (`app.current_user_id`) in the DB access layer.

**Acceptance:**
- [ ] All tables, enums, indexes, and triggers exist.
- [ ] A query as user A cannot return user B's rows (integration test).
- [ ] The `last_contact_date` trigger fires correctly on interaction insert.
- [ ] The `updated_at` trigger fires on people update.

### F1.3 — Dashboard shell
**Build:** Authenticated layout with top nav: Home, People, Calendar, Settings, and an avatar menu (logout). Responsive down to mobile width. Empty states for every list.

**Acceptance:**
- [ ] Unauthenticated access to any `/dashboard/*` route redirects to login.
- [ ] Nav highlights the active section.
- [ ] Renders correctly at 375px, 768px, 1280px widths.
- [ ] Every list has a clear empty state with a primary action.

### F1.4 — People CRUD
**Build:** A People list (searchable, filterable by `relationship_type`, sortable by name / upcoming event / last contact). A "Add person" form covering every field in the `people` table. A person detail page showing all fields, grouped sensibly, with inline edit. Delete with confirmation (cascades events + interactions).

**Acceptance:**
- [ ] Can create a person with only `name` + `relationship_type` (everything else optional).
- [ ] Can create a person with every field populated, including `hobbies` (multi-tag input) and `gift_history` (repeatable rows).
- [ ] Birthday accepts a date with unknown year and displays it as "23 May" without a year.
- [ ] Editing a field persists and shows on reload.
- [ ] Deleting a person removes their events and interactions (verify in DB).
- [ ] Search matches name and nickname; filter and sort combine correctly.

### F1.5 — Events
**Build:** When a person is created/edited with a `birthday`, auto-create a recurring `birthday` event (per `02-DATA-MODEL.md` §6). Allow manual add/edit/delete of any event type on the person page and a global Calendar page listing all events chronologically with type color-coding.

**Acceptance:**
- [ ] Setting a birthday on a new person auto-creates exactly one birthday event.
- [ ] Changing the birthday updates the existing event (no duplicate).
- [ ] Removing the birthday removes the auto-created event (only if untouched by the user).
- [ ] Manual events (anniversary, custom, reminder, meetup) can be added with a title, date, recurrence, and `notify_days_before`.
- [ ] Calendar page shows the next 90 days grouped by month, color-coded by type.

### F1.6 — Interactions
**Build:** "Log contact" action on a person page — date (default today), channel, notes. Show an interaction history timeline on the person page.

**Acceptance:**
- [ ] Logging an interaction updates the person's `last_contact_date`.
- [ ] The timeline shows interactions newest-first with channel and notes.

### F1.7 — Dashboard home
**Build:** Home shows four stat cards (people tracked, events this week, people needing attention [no contact in 30+ days], days to next birthday), an "upcoming events" panel (next 30 days), and a "recent people" panel.

**Acceptance:**
- [ ] Stats compute correctly against seeded test data.
- [ ] "Needs attention" lists people with `last_contact_date` older than 30 days (or never contacted).
- [ ] Upcoming events panel correctly resolves recurring birthdays to their next occurrence.

### F1.8 — Settings
**Build:** Timezone selector (IANA list, defaults from browser, stored on `users`), account info, delete-account action (wipes all user data — required for trust and later compliance).

**Acceptance:**
- [ ] Changing timezone persists and is reflected in date calculations.
- [ ] Delete account removes the user and all owned rows; confirms via typed confirmation.

## 3. Key technical decisions for this phase

- **Recurring event resolution** is computed at read time (a helper `nextOccurrence(event, fromDate)`), not stored. Only the canonical `date` is stored.
- **Birthday with unknown year**: store as year `0001`. A `formatBirthday()` helper hides the year when it equals `0001`.
- **Validation**: every form is validated with a shared zod schema from `packages/shared` so the same schema guards the API.
- **No optimistic UI yet** — keep it simple; server action → revalidate. Optimize later if needed.

## 4. Definition of done for Phase 1

- All acceptance checkboxes above pass.
- A new person can demo the full loop: log in → add 5 people with full detail → see them on the calendar → log an interaction → see updated stats → log out → log back in → data persists.
- RLS verified by an automated cross-user test.
- Deployed to staging (Vercel + Supabase staging project) and reachable via Telegram login.

## 5. Demo script (what you show after Phase 1)

1. Log in with Telegram in one click.
2. Add your partner with birthday, hobbies, food prefs, love language, notes.
3. Add your mum and two friends.
4. Show the calendar auto-populated with their birthdays.
5. Log "called mum today" — show her last-contact updates and she leaves the "needs attention" list.
6. Show the home dashboard summarizing everything.

This phase alone is a usable relationship database. The next phase makes it intelligent.
