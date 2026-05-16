# 08 — API Contracts

> Every internal endpoint, its request/response shape, auth requirement, and which phase introduces it. Shapes are the contract — implement to these.

---

## 1. Conventions

- All web endpoints are Next.js route handlers / server actions under `/api` or as server actions.
- Auth: `session` = requires a valid Telegram-derived NextAuth session. `internal` = requires the shared-secret header `x-internal-secret`. `webhook` = signature-verified by the provider.
- All responses: `{ ok: true, data }` or `{ ok: false, error: { code, message } }`.
- All inputs validated by a shared zod schema in `packages/shared/schemas`.
- Dates are ISO-8601 strings. IDs are uuids unless stated.

## 2. Auth (Phase 1)

### `POST /api/auth/telegram`
Verify the Telegram Login widget payload, upsert user, create session.
- Auth: none (this establishes it)
- Body: `{ id, first_name, username?, photo_url?, auth_date, hash }`
- 200: `{ ok: true, data: { userId } }` + session cookie set
- 401: invalid hash or stale `auth_date`

### `POST /api/auth/logout`
- Auth: session → clears session.

## 3. People (Phase 1)

### `GET /api/people`
- Auth: session
- Query: `q?`, `type?`, `sort? = name|upcoming|last_contact`
- 200: `{ ok: true, data: Person[] }`

### `POST /api/people`
- Auth: session
- Body: `PersonInput` (all `people` fields except server-managed)
- Side effect: auto-create birthday event if `birthday` set
- 200: `{ ok: true, data: Person }`
- 403: free-tier 10-person limit reached (Phase 3) → `error.code = 'LIMIT_PEOPLE'`

### `GET /api/people/:id`
- Auth: session (ownership enforced)
- 200: `{ ok: true, data: Person & { events: Event[]; interactions: Interaction[] } }`

### `PATCH /api/people/:id`
- Auth: session
- Body: partial `PersonInput`
- Side effect: reconcile auto birthday event if `birthday` changed
- 200: `{ ok: true, data: Person }`

### `DELETE /api/people/:id`
- Auth: session
- Cascades events + interactions + ai_chats
- 200: `{ ok: true }`

## 4. Events (Phase 1)

### `GET /api/events`
- Auth: session
- Query: `from?`, `to?` (defaults: today → +90d), resolves recurring to next occurrence
- 200: `{ ok: true, data: ResolvedEvent[] }` where `ResolvedEvent` adds `next_occurrence`

### `POST /api/events` / `PATCH /api/events/:id` / `DELETE /api/events/:id`
- Auth: session
- Body: `EventInput { person_id, type, title, date, recurring, notify_days_before, notes? }`
- Standard ok/data responses.

## 5. Interactions (Phase 1)

### `POST /api/interactions`
- Auth: session
- Body: `{ person_id, date?, channel, notes? }`
- Side effect: bumps `people.last_contact_date`
- 200: `{ ok: true, data: Interaction }`

## 6. AI (Phase 2)

### `POST /api/ai/summary`
- Auth: session
- Body: `{ personId, fresh?: boolean }`
- 200: `{ ok: true, data: { summary: string, cached: boolean } }`
- 403: free fair-use exceeded (Phase 3) → `error.code = 'LIMIT_AI_SUMMARY'`

### `POST /api/ai/chat`
- Auth: session; entitlement `ai.chat` (Phase 3 — Pro only)
- Body: `{ personId, message: string }`
- Persists both turns to `ai_chats`
- 200: `{ ok: true, data: { reply: string } }`
- 403: not Pro → `error.code = 'ENTITLEMENT_AI_CHAT'`

### `GET /api/ai/chat/:personId`
- Auth: session → returns chat history for that person.

### `POST /api/ai/plan`
- Auth: session
- Body: `{ eventId, fresh?: boolean }`
- Phase 4: server fetches Google free/busy if connected and passes to the planner
- 200: `{ ok: true, data: EventPlan }`
- 403: free monthly plan limit → `error.code = 'LIMIT_AI_PLAN'`

## 7. Billing (Phase 3)

### `POST /api/billing/checkout`
- Auth: session
- Body: `{ plan: 'pro_monthly' }`
- 200: `{ ok: true, data: { checkoutUrl: string } }`

### `GET /api/billing/portal`
- Auth: session → `{ ok: true, data: { portalUrl } }` (Stripe billing portal)

### `POST /api/webhooks/stripe`
- Auth: webhook (Stripe signature)
- Handles: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- Idempotent by Stripe event id
- 200 always on valid signature (even for ignored event types); 400 on bad signature

### `GET /api/entitlements`
- Auth: session
- 200: `{ ok: true, data: { tier, entitlements: Entitlement[], limits: {...}, usage: {...} } }`
- UI uses this to badge/hide Pro features; server still re-checks on each gated call.

## 8. Integrations (Phase 4)

### `GET /api/google/connect`
- Auth: session; entitlement `integrations.google`
- 302 → Google consent URL (state param signed)

### `GET /api/google/callback`
- Auth: session + valid signed state
- Exchanges code, encrypts + stores tokens
- 302 → settings with success/failure flag

### `POST /api/google/disconnect`
- Auth: session → revokes at Google, deletes connection. `{ ok: true }`

### `POST /api/google/import/preview`
- Auth: session → fetches contacts, returns dedup-annotated preview
- 200: `{ ok: true, data: { contacts: ImportCandidate[] } }`

### `POST /api/google/import/commit`
- Auth: session
- Body: `{ selectedIds: string[], defaultType?: relationship_type }`
- Idempotent; creates people + birthday events
- 200: `{ ok: true, data: { imported: number, skipped: number } }`

### `POST /api/google/calendar/add-event`
- Auth: session; calendar.events scope
- Body: `{ eventId }` (uses stored plan's suggested date)
- 200: `{ ok: true, data: { googleEventId } }`

## 9. Internal (Phase 2)

### `POST /internal/send` (on the bot worker)
- Auth: internal (shared secret header)
- Body: `{ telegram_id, text, plan?: EventPlan }`
- Bot delivers the message; returns `{ ok: true }` or `{ ok: false, error }`
- Public access is rejected — secret required.

### Scheduler (pg_cron + Edge Function, Phase 2)
- Not an HTTP API surface for clients. The Edge Function reads `notification_queue` where `status='pending' and scheduled_for <= today`, processes, and calls `/internal/send`.

## 10. Error codes (canonical)

| Code | Meaning |
|---|---|
| `UNAUTHENTICATED` | No/invalid session |
| `FORBIDDEN` | Authenticated but not owner |
| `NOT_FOUND` | Resource missing or not owned |
| `VALIDATION` | Body failed schema |
| `LIMIT_PEOPLE` | Free 10-person cap |
| `LIMIT_AI_SUMMARY` | Free summary refresh cap |
| `LIMIT_AI_PLAN` | Free monthly plan cap |
| `ENTITLEMENT_AI_CHAT` | Pro-only feature |
| `ENTITLEMENT_GOOGLE` | Pro-only integration |
| `INTEGRATION_ERROR` | Google API failure (degrade gracefully) |
| `INTERNAL` | Unexpected; logged to monitoring |

Every endpoint returns one of these codes on failure — clients branch on `error.code`, never on message text.
