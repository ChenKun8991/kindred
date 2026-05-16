# 05 — Phase 3: Monetization

> **Goal:** You can charge money. Free vs Pro tiers, Stripe checkout, webhook-driven access, and graceful paywalls.
>
> **Milestone:** "Someone paid $9 and their Pro features unlocked instantly without me touching anything."
>
> **Duration estimate:** ~2 weeks

---

## 1. Scope

| In scope | Out of scope |
|---|---|
| Free vs Pro feature gating | Annual billing UI polish (can be a follow-up) |
| Stripe Checkout (monthly Pro) | Couple/Family plan (post-launch) |
| Stripe webhook → subscription state | Dunning emails (basic only here) |
| Paywall UX in web + bot | Tax handling beyond Stripe Tax defaults |
| Fair-use AI limits | |

## 2. Plan definition

| Capability | Free | Pro ($9/mo) |
|---|---|---|
| People tracked | 10 max | Unlimited |
| Birthday/event notifications (bot) | Yes | Yes |
| AI relationship summary | Yes (cached, refresh limited to 3/day total) | Yes (unlimited) |
| Per-contact AI chat | Not available | Yes |
| AI event plans | 1 per month total | Unlimited |
| Google Calendar / Contacts (Phase 4) | Not available | Yes |
| Interaction logging | Yes | Yes |

**Rationale:** Free is genuinely useful (the database + reminders + a taste of AI) but the features that create the "wow" and ongoing value — chat and unlimited plans — sit behind Pro.

## 3. Gating implementation

A single server-side helper is the only place tier logic lives:

```ts
// packages/shared/entitlements.ts
type Entitlement =
  | 'people.unlimited'
  | 'ai.chat'
  | 'ai.plan.unlimited'
  | 'ai.summary.unlimited'
  | 'integrations.google';

function can(user, entitlement): { allowed: boolean; reason?: string }
```

- Every gated action calls `can()` server-side before doing work.
- The UI also calls a read-only entitlements endpoint to show/hide or badge Pro features — but the server check is authoritative (never trust the client).
- Free-tier numeric limits (10 people, 1 plan/month, 3 summary refresh/day) are checked against counts/usage records.

## 4. Features & acceptance criteria

### F3.1 — Stripe setup
**Build:** One Stripe Product "Kindred Pro" with a monthly $9 price. Stripe customer created lazily on first checkout. Store `stripe_customer_id` and `stripe_subscription_id` on `subscriptions`.

**Acceptance:**
- [ ] Test-mode checkout completes and returns the user to a success page.
- [ ] A Stripe customer is created and linked to the user.

### F3.2 — Checkout flow
**Build:** "Upgrade to Pro" entry points: settings page, every paywall, and a bot `/upgrade` command that returns a unique checkout link. Checkout is Stripe-hosted; success/cancel URLs return to the dashboard.

**Acceptance:**
- [ ] Clicking upgrade anywhere leads to a working Stripe Checkout session for the logged-in user.
- [ ] `/upgrade` in the bot returns a link that, when paid, upgrades the same user.
- [ ] Cancel returns to the app with no state change.

### F3.3 — Webhook → access
**Build:** A Stripe webhook endpoint handling `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. It updates `subscriptions.tier/status/current_period_end`. Signature-verified.

**Acceptance:**
- [ ] Successful payment sets `tier='pro'`, `status='active'` and Pro unlocks within seconds (no manual step).
- [ ] Cancellation sets `status='canceled'`; access continues until `current_period_end`, then reverts to free.
- [ ] `payment_failed` sets `status='past_due'` and shows a non-blocking banner; access continues through the grace window.
- [ ] Webhook rejects unsigned/invalid-signature requests.
- [ ] Webhook is idempotent (replaying an event does not double-apply).

### F3.4 — Paywall UX
**Build:** When a free user hits a gate:
- Web: a clear modal — what the feature does, what Pro costs, one upgrade button. Never a dead end.
- Bot: a short message + `/upgrade` link.
Free limit reached (11th person, 2nd monthly plan) shows the same pattern with specific copy.

**Acceptance:**
- [ ] Every gated action has a defined paywall message (no generic "forbidden").
- [ ] The 11th person attempt explains the limit and offers upgrade, and still lets them manage existing 10.
- [ ] Downgrade (post-cancel) with >10 people: existing people remain readable; adding new is blocked until under limit or re-upgraded. No data deleted.

### F3.5 — Fair-use AI limits (free)
**Build:** Track AI usage per user (a `ai_usage` table: user_id, kind, day, count). Enforce free limits (3 summary refreshes/day, 1 plan/month). Pro is unlimited but still logged for cost monitoring.

**Acceptance:**
- [ ] Free user is blocked from a 4th summary refresh in a day with a clear message.
- [ ] Free user's 2nd plan in a month is gated to upgrade.
- [ ] Pro user is never blocked but usage is recorded.

## 5. Billing edge cases (must handle)

- **Resubscribe** after cancel: reuses the existing Stripe customer; tier flips back to pro on new active subscription.
- **Webhook arrives before checkout redirect**: the success page must read state from the DB (updated by webhook), not assume it from the redirect.
- **Clock/grace**: access is determined by `status` AND `current_period_end`, evaluated server-side at request time.
- **Account deletion with active subscription**: cancel the Stripe subscription as part of the delete-account flow.

## 6. Definition of done for Phase 3

- All acceptance checkboxes pass.
- A full real test in Stripe test mode: free user hits chat paywall → upgrades → chat unlocks → cancels → keeps access until period end → reverts to free with data intact.
- All tier logic flows through the single `can()` helper (grep confirms no ad-hoc tier checks).
- Webhook is signature-verified and idempotent.

## 7. Demo script (what you show after Phase 3)

1. As a free user, try to open AI chat → see the paywall.
2. Upgrade via Stripe test card → return → chat is unlocked instantly.
3. Show the bot `/upgrade` link works for the same account.
4. Cancel in settings → confirm access continues to period end, data untouched.

After this phase the business is real: it can take money and grant access automatically.
