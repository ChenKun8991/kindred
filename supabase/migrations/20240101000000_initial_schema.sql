-- =============================================================================
-- Kindred — Initial Schema (Phase 1)
-- =============================================================================

-- Enums
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

-- =============================================================================
-- Tables
-- =============================================================================

create table users (
  id               uuid primary key default gen_random_uuid(),
  telegram_id      bigint unique not null,
  telegram_username text,
  first_name       text,
  photo_url        text,
  timezone         text not null default 'UTC',
  created_at       timestamptz not null default now(),
  last_seen_at     timestamptz
);

create table people (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  name              text not null,
  nickname          text,
  relationship_type relationship_type not null default 'friend',
  birthday          date,
  first_met_date    date,
  first_met_context text,
  last_contact_date date,
  location          text,
  phone             text,
  email             text,
  instagram         text,
  hobbies           text[] default '{}',
  food_preferences  text,
  love_language     text,
  occupation        text,
  personality_notes text,
  gift_history      jsonb default '[]',
  notes             text,
  photo_url         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table events (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users(id) on delete cascade,
  person_id          uuid not null references people(id) on delete cascade,
  type               event_type not null,
  title              text not null,
  date               date not null,
  recurring          boolean not null default true,
  notify_days_before int[] not null default '{7,3,1}',
  plan_generated     jsonb,
  notes              text,
  created_at         timestamptz not null default now()
);

create table interactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  person_id  uuid not null references people(id) on delete cascade,
  date       date not null default current_date,
  channel    interaction_channel not null,
  notes      text,
  created_at timestamptz not null default now()
);

create table subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid unique not null references users(id) on delete cascade,
  tier                   subscription_tier not null default 'free',
  status                 subscription_status,
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table oauth_connections (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  provider          text not null,
  access_token_enc  text not null,
  refresh_token_enc text not null,
  scopes            text[] not null,
  expires_at        timestamptz,
  created_at        timestamptz not null default now(),
  unique(user_id, provider)
);

create table notification_queue (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  event_id      uuid not null references events(id) on delete cascade,
  scheduled_for date not null,
  status        notification_status not null default 'pending',
  payload       jsonb,
  sent_at       timestamptz,
  error         text,
  created_at    timestamptz not null default now(),
  unique(event_id, scheduled_for)
);

-- =============================================================================
-- Indexes
-- =============================================================================

create index idx_people_user          on people(user_id);
create index idx_events_user_date     on events(user_id, date);
create index idx_interactions_person  on interactions(person_id);
create index idx_notif_status         on notification_queue(status, scheduled_for);

-- =============================================================================
-- Triggers
-- =============================================================================

-- updated_at for people
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger people_updated_at
  before update on people
  for each row execute function set_updated_at();

-- updated_at for subscriptions
create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

-- bump last_contact_date on interaction insert
create or replace function bump_last_contact()
returns trigger language plpgsql as $$
begin
  update people
     set last_contact_date = greatest(coalesce(last_contact_date, '0001-01-01'::date), new.date)
   where id = new.person_id;
  return new;
end;
$$;

create trigger interactions_bump_contact
  after insert on interactions
  for each row execute function bump_last_contact();

-- =============================================================================
-- Row-Level Security
-- =============================================================================

alter table users             enable row level security;
alter table people            enable row level security;
alter table events            enable row level security;
alter table interactions      enable row level security;
alter table subscriptions     enable row level security;
alter table oauth_connections enable row level security;
alter table notification_queue enable row level security;

-- users: each user sees only their own row
create policy users_self on users
  using (id = current_setting('app.current_user_id', true)::uuid)
  with check (id = current_setting('app.current_user_id', true)::uuid);

-- pattern macro reused for all user_id-scoped tables
create policy people_owner on people
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);

create policy events_owner on events
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);

create policy interactions_owner on interactions
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);

create policy subscriptions_owner on subscriptions
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);

create policy oauth_connections_owner on oauth_connections
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);

create policy notification_queue_owner on notification_queue
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);
