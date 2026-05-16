# Phase 1 — Execution Guide

> How to set up, run, test, and verify every feature built in Phase 1.
> Assumes you have Node.js ≥ 20 and pnpm installed.

---

## 1. Prerequisites

### 1.1 Accounts you need before starting

| Service | What for | URL |
|---|---|---|
| Supabase | Database + RLS + pg_cron | supabase.com |
| Telegram | Create a bot via @BotFather | t.me/BotFather |
| Vercel (optional) | Staging deploy | vercel.com |

### 1.2 Create your Telegram bot

```
1. Open Telegram → search @BotFather
2. /newbot → follow prompts → copy the token
3. /setdomain → set to your localhost or staging domain
   (needed for the Login Widget to work)
```

Save the token — it goes in `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_SECRET`.

### 1.3 Create your Supabase project

1. supabase.com → New project
2. Settings → API → copy **Project URL**, **anon key**, **service_role key**
3. Run the migration (see §3 below)

---

## 2. Local setup

### 2.1 Install dependencies

```bash
# From the repo root
pnpm install
```

### 2.2 Environment variables

```bash
cp .env.example apps/web/.env.local
```

Open `apps/web/.env.local` and fill in every value:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# NextAuth — generate a random secret:
#   openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generated>

# Telegram
TELEGRAM_BOT_TOKEN=<token from BotFather>
TELEGRAM_BOT_SECRET=<same as TELEGRAM_BOT_TOKEN>
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=<your bot's @username without the @>
```

> The `ANTHROPIC_API_KEY`, `STRIPE_*`, `GOOGLE_*`, and `INTERNAL_API_SECRET` are
> not needed for Phase 1 — leave them blank or omit them.

---

## 3. Database setup

### 3.1 Run the migration in Supabase

In the Supabase dashboard → **SQL Editor** → paste and run the entire file:

```
supabase/migrations/20240101000000_initial_schema.sql
```

This creates:
- All 6 enums (`relationship_type`, `event_type`, `interaction_channel`, etc.)
- All 7 tables (`users`, `people`, `events`, `interactions`, `subscriptions`, `oauth_connections`, `notification_queue`)
- 4 indexes
- 3 triggers (`set_updated_at`, `bump_last_contact`, `subscriptions_updated_at`)
- RLS policies on every table

### 3.2 Verify migration ran correctly

In Supabase → **Table Editor** — you should see all 7 tables.

Run this in SQL Editor to confirm triggers exist:

```sql
select trigger_name, event_object_table
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table;
```

Expected output: `people_updated_at`, `subscriptions_updated_at`, `interactions_bump_contact`.

### 3.3 Verify RLS is enabled

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Every table should show `rowsecurity = true`.

---

## 4. Run the app locally

```bash
# From repo root — starts the Next.js dev server
pnpm dev
```

App runs at **http://localhost:3000**

You should be redirected to `/login` if not authenticated.

To run only the web app:

```bash
pnpm --filter @kindred/web dev
```

---

## 5. Manual test walkthrough (Phase 1 demo script)

Work through these steps in order. Each one exercises a specific acceptance criterion.

### Step 1 — Login

1. Open **http://localhost:3000/login**
2. Click the **Log in with Telegram** widget
3. Authorize in Telegram
4. You should land on **/dashboard**

**Verify in Supabase:**
```sql
select id, telegram_id, first_name, created_at from users order by created_at desc limit 5;
select user_id, tier from subscriptions order by created_at desc limit 5;
```
→ One `users` row and one `subscriptions` row (`tier = 'free'`) should exist.

**Verify auth guard:**
- Open an incognito window → go to **http://localhost:3000/dashboard**
- Should redirect to `/login` ✓

---

### Step 2 — Add people

Navigate to **People → Add person**

**Test 1: Minimal person**
- Name: `Alex`
- Relationship: `Friend`
- Leave everything else blank
- Click **Add person** → should land on Alex's detail page

**Test 2: Full person**
- Name: `Sarah Lim`
- Nickname: `Saz`
- Relationship: `Close Friend`
- Birthday: pick a date, check **Year unknown**
- First met: a past date
- How you met: `University orientation 2018`
- Location: `Singapore`
- Hobbies: `hiking, coffee, reading`
- Food preferences: `Vegetarian, allergic to nuts`
- Notes: `Loves jazz. Promoted last March.`
- Click **Add person**

**Verify birthday event was auto-created:**
- On Sarah's detail page → Events section should show `Sarah Lim's Birthday`
- In Supabase:
  ```sql
  select title, date, type, recurring from events
  where person_id = (select id from people where name = 'Sarah Lim');
  ```
  → Should see one `birthday` event, `recurring = true`

**Test 3: Birthday with year unknown**
- Sarah's birthday should display as e.g. `May 23` (no year) on her profile

---

### Step 3 — People list features

Go to **/dashboard/people**

- **Search:** type `sara` → only Sarah appears
- **Filter:** dropdown → `Close Friend` → only close friends listed
- **Sort:** `Last contact` → people with oldest/no contact first

---

### Step 4 — Events

On Sarah's detail page → **Add event**:
- Type: `Anniversary`
- Title: `Sarah and Tom's Anniversary`
- Date: a future date
- Recurring: checked

→ Should appear in her events list and on **/dashboard/calendar**

**Calendar page:**
- Go to **/dashboard/calendar**
- Events for the next 90 days grouped by month
- Birthday events should be pink, anniversary purple

**Birthday recurrence test:**
- Change Sarah's birthday (go to edit page)
- The birthday event date should update automatically — no duplicate created
- Verify in Supabase:
  ```sql
  select count(*) from events
  where person_id = (select id from people where name = 'Sarah Lim')
  and type = 'birthday';
  ```
  → Should always be exactly `1`

---

### Step 5 — Log an interaction

On Sarah's detail page → **Log contact**:
- Date: today
- Channel: `In person`
- Notes: `Caught up over lunch, she got promoted`
- Click **Log contact**

**Verify:**
- Interaction appears in timeline on Sarah's page (newest first)
- `last_contact_date` updated on her profile
- In Supabase:
  ```sql
  select last_contact_date from people where name = 'Sarah Lim';
  ```
  → Should equal today's date

---

### Step 6 — Dashboard home

Go to **/dashboard**

Verify the 4 stat cards:
- **People tracked** → total count
- **Events this week** → events within 7 days
- **Needs attention** → people with no contact in 30+ days (or never)
- **Days to next birthday** → days until nearest birthday

Add Alex to the "needs attention" bucket by confirming he has no `last_contact_date`.

---

### Step 7 — Settings

Go to **/dashboard/settings**

**Timezone:**
- Select a different timezone → Save → toast confirms
- Verify in Supabase:
  ```sql
  select timezone from users where telegram_id = <your id>;
  ```

---

### Step 8 — Edit and delete

**Edit:**
- Open Sarah's profile → **Edit**
- Change her nickname → **Update person** → changes persist on reload

**Delete:**
- Add a throwaway person (name: `Test Delete`)
- Open their profile → **Delete** → confirm dialog
- Verify they're gone from the list
- Verify cascade in Supabase:
  ```sql
  select count(*) from events where user_id = '<your user id>';
  select count(*) from interactions where user_id = '<your user id>';
  ```
  → Counts should not include the deleted person's rows

---

### Step 9 — Logout and session persistence

1. Click your avatar → **Log out** → redirected to `/login`
2. Log back in with Telegram
3. All your people, events, and interactions should still be there ✓

---

## 6. Automated tests

### 6.1 Run the auth unit tests

```bash
pnpm --filter @kindred/web exec vitest run src/lib/auth/__tests__/telegram.test.ts
```

Expected output:
```
✓ verifyTelegramPayload > accepts a valid payload
✓ verifyTelegramPayload > rejects a tampered hash
✓ verifyTelegramPayload > rejects a stale auth_date (>24h)

Test Files  1 passed (1)
Tests       3 passed (3)
```

### 6.2 Run typecheck across the monorepo

```bash
pnpm typecheck
```

→ Should exit with no errors.

### 6.3 RLS cross-user isolation test (manual SQL)

Create a second user by logging in from a second Telegram account (or manually insert a row). Then verify that querying with user A's ID cannot return user B's people:

```sql
-- Set session as user A
set local app.current_user_id = '<user-A-uuid>';
select count(*) from people; -- should return only user A's count

-- Set session as user B
set local app.current_user_id = '<user-B-uuid>';
select count(*) from people; -- should return only user B's count
```

---

## 7. Key file map

| What | File |
|---|---|
| Telegram HMAC verifier | [apps/web/src/lib/auth/telegram.ts](apps/web/src/lib/auth/telegram.ts) |
| Auth unit tests | [apps/web/src/lib/auth/\_\_tests\_\_/telegram.test.ts](apps/web/src/lib/auth/__tests__/telegram.test.ts) |
| NextAuth options | [apps/web/src/lib/auth/options.ts](apps/web/src/lib/auth/options.ts) |
| Session guard (`requireSession`) | [apps/web/src/lib/auth/session.ts](apps/web/src/lib/auth/session.ts) |
| NextAuth route handler | [apps/web/src/app/api/auth/\[...nextauth\]/route.ts](apps/web/src/app/api/auth/[...nextauth]/route.ts) |
| Telegram login widget | [apps/web/src/components/auth/TelegramLoginButton.tsx](apps/web/src/components/auth/TelegramLoginButton.tsx) |
| Dashboard layout + auth guard | [apps/web/src/app/dashboard/layout.tsx](apps/web/src/app/dashboard/layout.tsx) |
| People server actions | [apps/web/src/app/actions/people.ts](apps/web/src/app/actions/people.ts) |
| Events server actions | [apps/web/src/app/actions/events.ts](apps/web/src/app/actions/events.ts) |
| Interactions server action | [apps/web/src/app/actions/interactions.ts](apps/web/src/app/actions/interactions.ts) |
| Settings server actions | [apps/web/src/app/actions/settings.ts](apps/web/src/app/actions/settings.ts) |
| People list page | [apps/web/src/app/dashboard/people/page.tsx](apps/web/src/app/dashboard/people/page.tsx) |
| Person detail page | [apps/web/src/app/dashboard/people/\[id\]/page.tsx](apps/web/src/app/dashboard/people/[id]/page.tsx) |
| Calendar page | [apps/web/src/app/dashboard/calendar/page.tsx](apps/web/src/app/dashboard/calendar/page.tsx) |
| Dashboard home | [apps/web/src/app/dashboard/page.tsx](apps/web/src/app/dashboard/page.tsx) |
| Settings page | [apps/web/src/app/dashboard/settings/page.tsx](apps/web/src/app/dashboard/settings/page.tsx) |
| DB query helpers | [packages/db/src/queries/](packages/db/src/queries/) |
| Zod schemas | [packages/shared/src/schemas/](packages/shared/src/schemas/) |
| Birthday formatter | [packages/shared/src/helpers.ts](packages/shared/src/helpers.ts) |
| `nextOccurrence()` | [packages/db/src/queries/events.ts](packages/db/src/queries/events.ts) |
| SQL migration | [supabase/migrations/20240101000000\_initial\_schema.sql](supabase/migrations/20240101000000_initial_schema.sql) |

---

## 8. Common issues

### "Telegram Login Widget doesn't appear"
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` must be set (without the `@`)
- The bot's domain must match your dev URL in BotFather → `/setdomain`

### "HMAC verification failed"
- Make sure `TELEGRAM_BOT_TOKEN` matches the exact token from BotFather (no spaces)
- `auth_date` check: if your system clock is wrong, tokens may appear stale

### "Supabase query returns no data"
- Check `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- The migration must have run successfully

### "RLS policy error" in Supabase logs
- The app uses the service-role key which bypasses RLS
- All queries are still explicitly scoped by `user_id = session.userId` in code

### "Port already in use"
```bash
# Kill whatever is on 3000
lsof -ti:3000 | xargs kill -9
pnpm dev
```

---

## 9. Phase 1 acceptance checklist

Run through each item before marking Phase 1 done.

**F1.1 — Telegram login**
- [ ] Widget → authorize → land on `/dashboard`
- [ ] Tampered hash rejected (auth unit test passes)
- [ ] Stale `auth_date` rejected (auth unit test passes)
- [ ] Returning user logs into same account (same `telegram_id`)
- [ ] Logout clears session → redirected to `/login`

**F1.2 — Database & RLS**
- [ ] All 7 tables, 4 indexes, 3 triggers exist in Supabase
- [ ] Cross-user SQL test: user A cannot see user B's rows
- [ ] `last_contact_date` updates after interaction insert
- [ ] `updated_at` updates after person edit

**F1.3 — Dashboard shell**
- [ ] `/dashboard/*` unauthenticated → redirect to `/login`
- [ ] Nav highlights active section
- [ ] Renders at 375px (mobile), 768px (tablet), 1280px (desktop)
- [ ] Every list has an empty state + primary CTA

**F1.4 — People CRUD**
- [ ] Create with only name + relationship type
- [ ] Create with every field including hobbies (comma-separated) and gift history
- [ ] Birthday with unknown year shows `May 23` not `May 23, 0001`
- [ ] Edit persists on reload
- [ ] Delete cascades events + interactions (verified in DB)
- [ ] Search + filter + sort work in combination

**F1.5 — Events**
- [ ] Setting birthday → auto-creates exactly 1 birthday event
- [ ] Changing birthday → updates existing event (no duplicate)
- [ ] Removing birthday → removes auto-created event
- [ ] Manual events (anniversary, custom, reminder, meetup) can be added
- [ ] Calendar shows next 90 days grouped by month, color-coded

**F1.6 — Interactions**
- [ ] Logging interaction → `last_contact_date` updates
- [ ] Timeline shows newest-first with channel + notes

**F1.7 — Dashboard home**
- [ ] Stats are correct (test against known seeded data)
- [ ] "Needs attention" shows people with no contact in 30+ days
- [ ] Upcoming events resolves recurring birthdays to next occurrence

**F1.8 — Settings**
- [ ] Timezone change persists in DB
- [ ] Delete account requires typed confirmation `delete my account`
- [ ] Delete account removes all owned rows

---

## 10. Next step

Once all checkboxes above are ticked:

→ **Phase 2: Intelligence** — AI chat per contact, event plans, Telegram bot, notifications.

See [04-PHASE-2-INTELLIGENCE.md](04-PHASE-2-INTELLIGENCE.md) for the spec.
