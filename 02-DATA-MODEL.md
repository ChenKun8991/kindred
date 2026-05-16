# 02 — Data Model

> The complete database schema. This is the contract every phase depends on. SQL is provided ready to paste into Supabase.

---

## 1. Entity overview

```
users ──1:N──> people ──1:N──> events
                  │
                  └──1:N──> interactions

users ──1:1──> subscriptions
users ──1:N──> oauth_connections
events ──1:N──> notification_queue
```

- A `user` is one human (identified by Telegram).
- A `person` is someone in that user's life.
- An `event` is a dated occasion attached to a person (birthday, anniversary, custom).
- An `interaction` is a logged contact with a person.
- A `subscription` tracks Stripe billing state.
- An `oauth_connection` stores encrypted Google tokens.
- A `notification_queue` row is a pending push to deliver.

## 2. Enums

```sql
create type relationship_type as enum (
  'partner', 'family', 'close_friend', 'friend', 'colleague', 'acquaintance'
);

create type event_type as enum (
  'birthday', 'anniversary', 'meetup', 'custom', 'reminder'
);

create type interaction_channel as enum (
  'in_person', 'whatsapp', 'call', 'telegram', 'email', 'other'
);

create type subscription_tier as enum ('free', 'pro');

create type subscription_status as enum (
  'active', 'past_due', 'canceled', 'trialing', 'incomplete'
);

create type notification_status as enum (
  'pending', 'processing', 'sent', 'failed'
);
```

## 3. Tables

### 3.1 `users`

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | `default gen_random_uuid()` |
| telegram_id | bigint UNIQUE NOT NULL | Stable identity across web + bot |
| telegram_username | text | May be null (not all users have one) |
| first_name | text | From Telegram |
| photo_url | text | From Telegram, optional |
| timezone | text | IANA tz, default `'UTC'`, set during onboarding |
| created_at | timestamptz | `default now()` |
| last_seen_at | timestamptz | Updated on login / bot use |

### 3.2 `people`

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users.id NOT NULL | Owner |
| name | text NOT NULL | Full name |
| nickname | text | What the user calls them |
| relationship_type | relationship_type NOT NULL | Default `'friend'` |
| birthday | date | Nullable. Year may be unknown — store as `0001-MM-DD` and treat year as unknown in UI |
| first_met_date | date | |
| first_met_context | text | "Uni orientation 2018" |
| last_contact_date | date | Auto-updated when an interaction is logged |
| location | text | City / country |
| phone | text | Optional |
| email | text | Optional |
| instagram | text | Handle, optional |
| hobbies | text[] | Array |
| food_preferences | text | Likes / dislikes / allergies |
| love_language | text | For partner / close family |
| occupation | text | |
| personality_notes | text | |
| gift_history | jsonb | `[{ date, item, occasion, reaction }]` |
| notes | text | Free-form |
| photo_url | text | Optional avatar |
| created_at | timestamptz | `default now()` |
| updated_at | timestamptz | Trigger-updated |

### 3.3 `events`

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users.id NOT NULL | Denormalized for RLS speed |
| person_id | uuid FK → people.id NOT NULL | `on delete cascade` |
| type | event_type NOT NULL | |
| title | text NOT NULL | "Sarah's birthday" |
| date | date NOT NULL | |
| recurring | boolean NOT NULL | Default `true` for birthday/anniversary |
| notify_days_before | int[] NOT NULL | Default `'{7,3,1}'` |
| plan_generated | jsonb | Stored AI plan, nullable |
| notes | text | |
| created_at | timestamptz | `default now()` |

### 3.4 `interactions`

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users.id NOT NULL | |
| person_id | uuid FK → people.id NOT NULL | `on delete cascade` |
| date | date NOT NULL | Default `current_date` |
| channel | interaction_channel NOT NULL | |
| notes | text | "Caught up over lunch, she got promoted" |
| created_at | timestamptz | `default now()` |

A trigger updates `people.last_contact_date` to the max interaction date on insert.

### 3.5 `subscriptions`

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users.id UNIQUE NOT NULL | One per user |
| tier | subscription_tier NOT NULL | Default `'free'` |
| status | subscription_status | Null while on free |
| stripe_customer_id | text | |
| stripe_subscription_id | text | |
| current_period_end | timestamptz | When access expires if not renewed |
| created_at | timestamptz | `default now()` |
| updated_at | timestamptz | |

### 3.6 `oauth_connections`

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users.id NOT NULL | |
| provider | text NOT NULL | `'google'` |
| access_token_enc | text NOT NULL | Encrypted |
| refresh_token_enc | text NOT NULL | Encrypted |
| scopes | text[] NOT NULL | Granted scopes |
| expires_at | timestamptz | |
| created_at | timestamptz | `default now()` |

UNIQUE on `(user_id, provider)`.

### 3.7 `notification_queue`

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users.id NOT NULL | |
| event_id | uuid FK → events.id NOT NULL | `on delete cascade` |
| scheduled_for | date NOT NULL | The day this should be sent |
| status | notification_status NOT NULL | Default `'pending'` |
| payload | jsonb | Rendered message + optional plan |
| sent_at | timestamptz | |
| error | text | If failed |
| created_at | timestamptz | `default now()` |

UNIQUE on `(event_id, scheduled_for)` to prevent duplicate sends.

## 4. Full SQL migration (Phase 1 ships this)

```sql
-- enums
create type relationship_type as enum ('partner','family','close_friend','friend','colleague','acquaintance');
create type event_type as enum ('birthday','anniversary','meetup','custom','reminder');
create type interaction_channel as enum ('in_person','whatsapp','call','telegram','email','other');
create type subscription_tier as enum ('free','pro');
create type subscription_status as enum ('active','past_due','canceled','trialing','incomplete');
create type notification_status as enum ('pending','processing','sent','failed');

-- users
create table users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  telegram_username text,
  first_name text,
  photo_url text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

-- people
create table people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  nickname text,
  relationship_type relationship_type not null default 'friend',
  birthday date,
  first_met_date date,
  first_met_context text,
  last_contact_date date,
  location text,
  phone text,
  email text,
  instagram text,
  hobbies text[] default '{}',
  food_preferences text,
  love_language text,
  occupation text,
  personality_notes text,
  gift_history jsonb default '[]',
  notes text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- events
create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  type event_type not null,
  title text not null,
  date date not null,
  recurring boolean not null default true,
  notify_days_before int[] not null default '{7,3,1}',
  plan_generated jsonb,
  notes text,
  created_at timestamptz not null default now()
);

-- interactions
create table interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  date date not null default current_date,
  channel interaction_channel not null,
  notes text,
  created_at timestamptz not null default now()
);

-- subscriptions
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references users(id) on delete cascade,
  tier subscription_tier not null default 'free',
  status subscription_status,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- oauth_connections
create table oauth_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null,
  access_token_enc text not null,
  refresh_token_enc text not null,
  scopes text[] not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, provider)
);

-- notification_queue
create table notification_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  scheduled_for date not null,
  status notification_status not null default 'pending',
  payload jsonb,
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique(event_id, scheduled_for)
);

-- indexes
create index idx_people_user on people(user_id);
create index idx_events_user_date on events(user_id, date);
create index idx_interactions_person on interactions(person_id);
create index idx_notif_status on notification_queue(status, scheduled_for);

-- updated_at trigger for people
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger people_updated_at before update on people
for each row execute function set_updated_at();

-- last_contact_date trigger
create or replace function bump_last_contact() returns trigger as $$
begin
  update people set last_contact_date = greatest(coalesce(last_contact_date,'0001-01-01'), new.date)
  where id = new.person_id;
  return new;
end;
$$ language plpgsql;

create trigger interactions_bump_contact after insert on interactions
for each row execute function bump_last_contact();
```

## 5. Row-Level Security (mandatory)

```sql
alter table users enable row level security;
alter table people enable row level security;
alter table events enable row level security;
alter table interactions enable row level security;
alter table subscriptions enable row level security;
alter table oauth_connections enable row level security;
alter table notification_queue enable row level security;

-- Policy pattern: the app sets a session variable `app.current_user_id`
-- after verifying the Telegram session. All policies check ownership.

create policy people_owner on people
  using (user_id = current_setting('app.current_user_id')::uuid)
  with check (user_id = current_setting('app.current_user_id')::uuid);

-- Repeat the same pattern for events, interactions, subscriptions,
-- oauth_connections, notification_queue. users table policy checks id directly.
```

The bot worker and scheduler use the Supabase service role (bypasses RLS) but every query is still explicitly scoped by `user_id` in code — RLS is defense in depth, not the only guard.

## 6. Auto-generated events rule

When a `person` is created or their `birthday` is set/changed:
- If birthday is present and no `birthday`-type event exists for that person → auto-create one (`recurring = true`, `notify_days_before = {7,3,1}`).
- Same for an explicit anniversary field if added later.

This logic lives in a server action (Phase 1), not a DB trigger, so it can be tested and reasoned about in application code.

## 7. Free-tier limit enforcement

The free tier caps `people` per user at **10**. Enforcement is in the application layer (Phase 3) — a count check before insert — not in the schema, so the limit can be changed without a migration.
