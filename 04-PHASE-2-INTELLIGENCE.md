# 04 — Phase 2: Intelligence

> **Goal:** The product becomes genuinely smart. AI chat per contact, an AI relationship summary, AI event plans, and a Telegram bot that proactively notifies the user.
>
> **Milestone:** "The bot told me my friend's birthday is in 3 days and gave me a plan I'd actually use — and I can ask the dashboard anything about anyone."
>
> **Duration estimate:** ~3 weeks

---

## 1. Scope

| In scope | Out of scope |
|---|---|
| Shared AI service module (`packages/ai`) | Calendar-aware planning (Phase 4 — plans are calendar-blind here) |
| Person AI summary | Stripe gating (Phase 3 — everything is free in this phase) |
| Per-contact AI chat | Google integrations (Phase 4) |
| AI event plan generation | |
| Telegram bot worker (commands) | |
| Scheduler + notification queue + delivery | |

## 2. The AI service module

Lives in `packages/ai`, imported by both web and bot. Three functions, each with a versioned prompt template in `packages/ai/prompts/`.

### 2.1 `summarizePerson(person, recentInteractions) → string`
Produces a warm, concise 2–4 sentence relationship summary. Used on the person page header and the bot `/who` command.

**Prompt contract:**
- Input: structured person fields + last 5 interactions.
- Output: plain text, no markdown headers, 2–4 sentences, second person ("You met Sarah at...").
- Must not invent facts not present in the input. If a field is empty, omit it gracefully.

### 2.2 `chatAboutPerson(person, interactions, history, message) → string`
Powers the per-contact chat. Claude is given the full person profile + interaction log + prior chat turns + the new user message.

**Prompt contract:**
- System prompt establishes: you are a thoughtful assistant helping the user be a better friend/partner/family member to *this specific person*; use only the provided context; be concrete and specific; never fabricate.
- Output: conversational, actionable. May propose plans, gift ideas, message drafts.
- Hard rule: if asked something the data can't answer, say so and suggest what to add to the profile.

### 2.3 `generateEventPlan(person, event, freeSlots?) → EventPlan`
Generates a structured plan. In Phase 2 `freeSlots` is always undefined (calendar comes in Phase 4) — the prompt must handle its absence.

**`EventPlan` type (stored in `events.plan_generated`):**
```ts
type EventPlan = {
  summary: string;            // one-line framing
  suggested_date?: string;    // ISO; null if no calendar data
  ideas: {
    activity: string;
    why: string;              // tied to the person's profile
  }[];
  gift_suggestions: {
    item: string;
    reason: string;
    approx_budget?: string;
  }[];
  message_draft: string;      // a ready-to-send message to the person
  effort_level: 'light' | 'medium' | 'detailed'; // scales by relationship_type
};
```

**Tiering rule:** `effort_level` and depth scale by `person.relationship_type`:
- `partner` / `family` → `detailed`: full multi-part plan, thoughtful gifts, personal message.
- `close_friend` → `medium`: an activity + gift idea + short message.
- `friend` / `colleague` / `acquaintance` → `light`: a reminder + a one-line suggestion + a short greeting.

## 3. Features & acceptance criteria

### F2.1 — Person AI summary
**Build:** On the person detail page, show an AI summary block with a refresh button. Cache the last summary; regenerate on demand or when the profile materially changes.

**Acceptance:**
- [ ] Summary reflects only data in the profile (test with sparse and rich profiles).
- [ ] Empty profile produces a graceful "not much known yet — add details to improve this" style message, not a hallucination.
- [ ] Refresh produces an updated summary after edits.

### F2.2 — Per-contact AI chat
**Build:** A chat panel on the person page. Messages call a server route → `chatAboutPerson`. Chat history persists per person (new table `ai_chats`: id, user_id, person_id, role, content, created_at — add migration).

**Acceptance:**
- [ ] Asking "what should I get them for their birthday?" yields suggestions grounded in their hobbies/food/notes.
- [ ] Asking something unanswerable yields an honest "I don't have that info; add it to their profile" reply.
- [ ] Chat history persists across page reloads and is scoped per person.
- [ ] The Claude API key is never exposed client-side (verify in network tab).

### F2.3 — AI event plan
**Build:** A "Generate plan" action on any upcoming event. Calls `generateEventPlan`, stores result in `events.plan_generated`, renders it nicely. Regenerate option.

**Acceptance:**
- [ ] A partner birthday yields a `detailed` plan; a casual friend yields a `light` plan (verify `effort_level` differs by type).
- [ ] Plan content references the person's actual profile (e.g. uses their hobbies).
- [ ] Stored plan reloads without re-calling Claude until the user regenerates.

### F2.4 — Telegram bot worker
**Build:** A grammY worker (separate Railway deployment). Commands:

| Command | Behavior |
|---|---|
| `/start` | Links the chat to the user (matches `telegram_id`). If no web account yet, explains how to sign up. |
| `/who <name>` | Fuzzy-matches a person, returns the AI summary. |
| `/upcoming` | Lists events in the next 30 days. |
| `/plan <name>` | Generates/returns a plan for that person's next event. |
| `/help` | Lists commands. |

**Acceptance:**
- [ ] `/start` from a Telegram account already linked to a web user resolves to that user's data.
- [ ] `/who sara` fuzzy-matches "Sarah Lim" and returns her summary.
- [ ] Unknown name returns a helpful "no match, did you mean…?" response.
- [ ] All bot data access is scoped to the requesting user (cross-user test).
- [ ] Bot reuses `packages/ai` — no duplicated prompt logic.

### F2.5 — Scheduler & notifications
**Build:**
1. A `pg_cron` job runs daily at a fixed UTC time.
2. It finds events where `event_next_occurrence - today ∈ notify_days_before` and inserts `notification_queue` rows (idempotent via the unique constraint).
3. A Supabase Edge Function processes `pending` queue rows: builds the message, generates a plan for partner/family/close_friend tiers, marks `processing` → calls the bot worker's authenticated `/internal/send` endpoint → marks `sent` (or `failed` with error).
4. The bot worker delivers the Telegram message.

**Acceptance:**
- [ ] Seeding an event with a birthday 7 days out causes exactly one queued + sent notification on the correct day (test by simulating the cron run).
- [ ] The unique constraint prevents a duplicate notification if the job runs twice.
- [ ] A `partner` birthday notification includes a generated plan; an `acquaintance` one is a simple reminder.
- [ ] Timezone is respected — "day before" is computed in the user's `timezone`, not UTC.
- [ ] A failed delivery is marked `failed` with the error and retried on the next run.
- [ ] The `/internal/send` endpoint rejects requests without the shared secret.

## 4. Prompt versioning rule

Every prompt template file is named with a version suffix (e.g. `summarize.v1.ts`). Changing a prompt = new version + a note in a `packages/ai/CHANGELOG.md`. This makes AI behavior changes reviewable and reversible.

## 5. Cost guardrails

- Cache summaries and plans; never call Claude on page load if a cached version exists and the profile is unchanged.
- Bot `/who` uses the cached summary unless `--fresh` is passed.
- Track per-user AI call count (a counter on `users` or a `usage` table) — needed for Phase 3 fair-use limits.

## 6. Definition of done for Phase 2

- All acceptance checkboxes pass.
- End-to-end demo: add a person with a birthday 3 days out → cron run → Telegram message arrives with a tier-appropriate plan → open dashboard → chat with AI about that person and get grounded answers.
- No prompt logic duplicated between web and bot.
- AI never invents facts in tests with sparse profiles.

## 7. Demo script (what you show after Phase 2)

1. Open your partner's profile, click "Ask AI" → "what should I do for her birthday?" → get a specific, profile-grounded answer.
2. Show the generated event plan with gift ideas tied to her hobbies.
3. Switch to Telegram, send `/upcoming` → see her birthday listed.
4. Show a real notification that arrived from the bot with a plan.

This is the moment the product becomes "I need this." Everything after monetizes and scales it.
