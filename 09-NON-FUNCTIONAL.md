# 09 — Non-Functional Requirements

> Cross-cutting requirements that apply to every phase: security, privacy, performance, cost, reliability, and compliance. These are acceptance criteria too — a phase is not done if it violates these.

---

## 1. Security

| Requirement | Detail |
|---|---|
| Telegram auth verification | HMAC-SHA256 of the data-check-string with the bot token as key; reject mismatches and `auth_date` older than 24h. |
| Server-only AI key | The Claude API key is read only in server runtime; never shipped to client or bot client; verify via build output + network inspection. |
| RLS everywhere | Every user-data table has RLS enabled with an ownership policy. Cross-user access is automatically tested in CI. |
| Internal endpoint secret | `/internal/send` and any service-to-service call requires a strong shared secret; rotate-able via env. |
| Webhook signatures | Stripe webhook verified by signing secret; reject unsigned. |
| OAuth token encryption | Google tokens encrypted at rest with a key from the secret manager; decrypted only in-process for an API call. |
| Secrets management | No secrets in the repo or client bundles. Use platform secret stores (Vercel/Railway/Supabase). CI fails if a secret pattern is committed. |
| Input validation | All external input validated by shared zod schemas before use. |
| Rate limiting | Login, Stripe webhook, AI routes, and bot commands are rate-limited per user/IP. |
| Dependency hygiene | Automated dependency vulnerability scanning; no known-critical vulns at release. |

## 2. Privacy

| Requirement | Detail |
|---|---|
| Data minimization | Store only user-entered facts and AI-extracted structured fields. Never store raw third-party message content. Google scopes are read-minimal (`contacts.readonly`, `calendar.freebusy`). |
| Right to delete | Account deletion wipes all owned rows, cancels Stripe subscription, and revokes Google grants — verified end to end (Phase 1 builds the core, Phases 3–4 extend it). |
| Data export | A user can export all their data as JSON on request (build by Phase 5). |
| Transparency | The Google connect screen states exactly what is accessed and why; privacy policy published before launch. |
| Third-party data | The user is storing data about other people. The privacy policy must address this; provide a clear deletion path and avoid enrichment from sources the user didn't authorize. |
| No ad/data sale | User and contact data is never sold or used for advertising. Stated in policy. |

## 3. Performance

| Surface | Target |
|---|---|
| Dashboard authenticated page TTFB | < 500ms p75 |
| People list (up to 500 people) | Renders < 1s p75; paginate beyond 100 |
| AI summary/chat/plan response | Streamed or < 6s p75; always show a loading state |
| Bot command response | < 3s p75 for non-AI; AI commands acknowledge immediately then follow up |
| Landing page | Lighthouse performance ≥ 90 |
| Scheduler run | Completes within its window even at 10k events; batched processing |

## 4. Reliability

| Requirement | Detail |
|---|---|
| Notification idempotency | `notification_queue` unique `(event_id, scheduled_for)` guarantees no duplicate sends even if cron double-runs. |
| Graceful AI degradation | If Claude is unavailable, features show a clear retry state; the app never crashes. Cached summaries/plans still render. |
| Graceful integration degradation | Google API failure falls back (calendar-blind planning; partial import preserves successes). |
| Webhook idempotency | Stripe events de-duplicated by event id; replay is safe. |
| Backups | Daily DB backups; a restore drill performed once before launch. |
| Deploy safety | Web and bot have independent deploys and documented rollback. A bad bot deploy must not take down the dashboard. |
| Monitoring | Error monitoring on web + bot; alert on webhook failures and scheduler failures. |

## 5. Cost control

| Lever | Rule |
|---|---|
| AI caching | Summaries and plans cached; never regenerate on page load if profile unchanged. |
| Usage tracking | Per-user AI usage recorded (`ai_usage`) from Phase 2 — feeds free limits and cost visibility. |
| Model choice | Use `claude-sonnet-4-20250514` for chat/plan; consider a cheaper tier for short summaries if cost pressure appears (prompt-versioned change). |
| Free-tier guardrails | Hard caps (10 people, 1 plan/mo, 3 summary refresh/day) keep free users near-zero marginal cost. |
| Infra | Start on free/low tiers (Supabase free, Vercel hobby/pro, Railway starter). Estimated < $20/mo until ~hundreds of users. |
| Target unit economics | AI + infra cost per Pro user < $1/mo against $9 price (≈ 85–90% gross margin). |

## 6. Accessibility & UX baseline

| Requirement | Detail |
|---|---|
| Keyboard | All interactive elements reachable and operable by keyboard. |
| Contrast | Text meets WCAG AA contrast in light and dark modes. |
| States | Every list/async surface has empty, loading, and error states (enforced in Phase 5 audit but built incrementally). |
| Mobile | Fully usable at 375px width — the dashboard is the product, not desktop-only. |
| No dead ends | Every paywall and error offers a clear next action. |

## 7. Compliance posture

- A published privacy policy and terms of service before public launch (Phase 5 gate).
- Stripe handles PCI scope — never store card data.
- Honor data deletion and export requests (build hooks early, formalize by launch).
- If targeting EU users, the data-minimization + delete/export design already supports GDPR-style requests; document the lawful basis (consent) and processor list (Supabase, Stripe, Google, Anthropic, hosting).

## 8. Testing requirements (per phase)

| Test type | Requirement |
|---|---|
| Cross-user isolation | Automated test proving user A cannot access user B's data — required from Phase 1, run in CI every phase. |
| Auth | HMAC verification unit tests (valid, tampered, stale). |
| AI grounding | Tests asserting AI output does not invent facts for sparse profiles (Phase 2+). |
| Billing | Stripe test-mode flows: upgrade, cancel, past_due, resubscribe, webhook replay (Phase 3). |
| Integration | Mocked Google API: token refresh, import dedup, free/busy fallback (Phase 4). |
| Regression | Each phase re-runs all prior phases' acceptance criteria before being marked done. |

## 9. Definition of "phase complete" (global gate)

A phase is complete only when:
1. All that phase's feature acceptance criteria pass.
2. No requirement in this document is regressed.
3. The cross-user isolation test still passes.
4. The phase's demo script can be performed live on staging.

Do not proceed to the next phase until all four hold.
