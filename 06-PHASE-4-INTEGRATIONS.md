# 06 — Phase 4: Integrations

> **Goal:** Remove manual work and deepen value. Connect Google so contacts and birthdays import automatically and event plans become calendar-aware.
>
> **Milestone:** "It imported my contacts with their birthdays, and when it planned my friend's birthday it knew I was free Saturday."
>
> **Duration estimate:** ~3 weeks

---

## 1. Scope

| In scope | Out of scope |
|---|---|
| Google OAuth2 (Pro-gated) | WhatsApp / Instagram (post-launch, data-export approach) |
| Google People API: contact import | Two-way contact sync (one-way import only here) |
| Google Calendar API: free/busy read | Auto-creating calendar events without confirmation |
| Calendar-aware event planning | Outlook (post-launch; same pattern) |
| Add-to-calendar (with explicit user action) | |
| Token storage (encrypted) + refresh | |

## 2. Why Google first

Google People + Calendar are official, well-documented, consent-based APIs. They deliver the two highest-value automations — auto-importing contacts/birthdays and calendar-aware planning — with no ToS risk. WhatsApp/Instagram have no official personal-data API and are deliberately deferred to a post-launch "export your data and upload it" approach.

## 3. Features & acceptance criteria

### F4.1 — Google OAuth connect (Pro only)
**Build:** A "Connect Google" action in settings. OAuth2 authorization code flow. Request minimal scopes:
- `https://www.googleapis.com/auth/contacts.readonly`
- `https://www.googleapis.com/auth/calendar.freebusy`
- `https://www.googleapis.com/auth/calendar.events` (only for explicit add-to-calendar)

Store encrypted tokens in `oauth_connections`. Implement refresh-token rotation. A "Disconnect" action revokes and deletes tokens.

**Acceptance:**
- [ ] Connect is gated by the `integrations.google` entitlement (free users see the paywall).
- [ ] Consent screen requests exactly the scopes above, no more.
- [ ] Tokens are encrypted at rest (DB inspection shows ciphertext, not raw tokens).
- [ ] Expired access token auto-refreshes transparently before an API call.
- [ ] Disconnect revokes the grant with Google and deletes the stored connection.

### F4.2 — Contact import (Google People API)
**Build:** After connect, a "Import contacts" flow: fetch contacts, show a reviewable list (name, birthday if present, email/phone), let the user select which to import, map into `people` (default `relationship_type = 'acquaintance'`, user can bulk-set). De-duplicate against existing people by name + email/phone. Imported people with birthdays auto-create birthday events (reuse Phase 1 logic).

**Acceptance:**
- [ ] Import preview lists contacts with birthdays detected and pre-checked.
- [ ] Duplicate detection prevents importing a person who already exists (matched by name+email or name+phone).
- [ ] Imported contacts with birthdays produce birthday events automatically.
- [ ] Import is resumable/idempotent — re-running doesn't duplicate.
- [ ] Large contact lists are paginated and don't time out.

### F4.3 — Calendar-aware planning
**Build:** Extend `generateEventPlan` to accept `freeSlots`. Before generating a plan for an event, query the Google Calendar free/busy API around the event date (configurable window, e.g. ±5 days, evenings) and pass available slots into the prompt. The plan's `suggested_date` is now grounded in real availability.

**Acceptance:**
- [ ] For a connected user, a generated plan proposes a date the user is actually free (verified against a seeded busy calendar).
- [ ] If the user is busy on the event date, the plan suggests the nearest free alternative and says so.
- [ ] For a non-connected (or free) user, planning still works calendar-blind (Phase 2 behavior preserved — no regression).
- [ ] Free/busy query failure degrades gracefully to calendar-blind, with a note.

### F4.4 — Add to calendar
**Build:** On a generated plan, an "Add to my calendar" button creates a Google Calendar event (title, the suggested date/time, notes from the plan) via the Calendar events scope. Explicit user action only — never automatic.

**Acceptance:**
- [ ] Button creates exactly one calendar event with correct details.
- [ ] No calendar event is ever created without the user clicking the button.
- [ ] If the events scope wasn't granted, the button prompts an incremental consent for just that scope.

## 4. Security & privacy requirements (this phase)

- Tokens encrypted with a key from environment/secret manager — never committed, never in the DB in plaintext.
- Only the minimum scopes; `calendar.freebusy` (not full calendar read) is used for planning.
- A clear privacy explanation on the connect screen: what is accessed, why, and that it can be disconnected anytime.
- Disconnect must revoke at Google, not just locally delete.
- Account deletion (Phase 1) extended to revoke Google grants too.

## 5. Failure handling

| Failure | Behavior |
|---|---|
| Token refresh fails | Mark connection invalid, prompt reconnect, never crash a plan/import |
| Google API rate limit | Backoff + retry; surface a soft error, preserve partial progress |
| Free/busy unavailable | Fall back to calendar-blind planning with a note |
| Partial import failure | Report which contacts failed; successfully imported ones persist |

## 6. Definition of done for Phase 4

- All acceptance checkboxes pass.
- Demo: connect Google → import contacts (birthdays auto-detected) → generate a plan for an upcoming birthday that proposes a genuinely free evening → add it to calendar with one click.
- No scope creep beyond the three declared scopes.
- Phase 2 calendar-blind behavior still works for non-connected users (regression test).

## 7. Demo script (what you show after Phase 4)

1. Connect Google in settings (Pro feature).
2. Import 20 contacts — show birthdays auto-detected and events created.
3. Generate a plan for a birthday next week — show it picked Saturday because you're busy Friday.
4. One click → it's in your Google Calendar.

This phase makes the product low-effort and sticky — the manual data entry burden largely disappears.
