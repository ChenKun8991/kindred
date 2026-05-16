# 07 — Phase 5: Launch

> **Goal:** Make the product launch-ready — onboarding, polish, growth loops, and a public launch.
>
> **Milestone:** "A stranger signed up, understood it in under 2 minutes, and a referral brought a second user."
>
> **Duration estimate:** ~3 weeks

---

## 1. Scope

| In scope | Out of scope |
|---|---|
| First-run onboarding flow | Native mobile apps |
| Empty/loading/error state polish | Couple/Family plan |
| Referral system | Paid ad campaigns (test only) |
| Landing/marketing page | WhatsApp/Instagram import |
| Analytics + error monitoring | |
| Launch assets (demo video, PH page) | |

## 2. Features & acceptance criteria

### F5.1 — Onboarding flow
**Build:** After first Telegram login, a guided 4-step setup:
1. Set timezone (prefilled from browser).
2. Add your 3 most important people (quick form: name, type, birthday).
3. Connect Google to auto-import the rest (optional, Pro upsell here — free users skip).
4. Confirm bot notifications (deep-link to open the Telegram bot and `/start`).

**Acceptance:**
- [ ] A brand-new user reaches a populated, useful dashboard within the flow without confusion.
- [ ] Each step is skippable; skipping never leaves a broken state.
- [ ] Onboarding shows once; completing it sets a flag and never reappears.
- [ ] Step 4 verifiably links the bot to the account.

### F5.2 — State & UX polish
**Build:** Audit every screen for empty, loading, and error states. Add skeleton loaders for AI calls. Friendly error messages (never raw stack traces). Confirm destructive actions. Mobile pass on every page.

**Acceptance:**
- [ ] No screen shows a blank or raw-error state under any tested condition.
- [ ] AI calls show a skeleton/loading indicator and a timeout fallback.
- [ ] All destructive actions confirm.
- [ ] Full mobile pass at 375px with no broken layouts.

### F5.3 — Referral system
**Build:** Each user gets a referral link (`?ref=<code>`). A successful referral (referred user signs up and completes onboarding) grants both users 1 month of Pro. A simple referral status page (invited, joined, rewarded).

**Acceptance:**
- [ ] Sharing a link and a new user signing up via it attributes the referral.
- [ ] Reward (1 month Pro each) applies only after the referred user completes onboarding (prevents abuse).
- [ ] Self-referral and duplicate-account abuse are blocked (same telegram_id can't be referred).
- [ ] Referral status page reflects state accurately.

### F5.4 — Landing / marketing page
**Build:** A public page: headline (emotional outcome, not "CRM"), 3 core benefits, a 60-second demo embed, pricing, Telegram-login CTA. SEO basics (title, meta, OG image).

**Acceptance:**
- [ ] Loads fast (Lighthouse performance ≥ 90).
- [ ] CTA goes straight to Telegram login.
- [ ] OG image and meta render correctly when shared.
- [ ] Copy positions it as a personal relationship tool, never "CRM".

### F5.5 — Analytics & monitoring
**Build:** Privacy-respecting product analytics (signup, onboarding completion, key-feature use, upgrade, churn). Error monitoring (Sentry or equivalent) on web and bot. A simple internal metrics view (DAU, conversion, MRR pulled from Stripe).

**Acceptance:**
- [ ] Funnel events fire correctly (signup → onboarding done → first AI use → upgrade).
- [ ] Errors in web and bot are captured with enough context to debug.
- [ ] MRR/active-user numbers are visible to you without manual SQL.

### F5.6 — Launch assets
**Build:** A 60-second screen-recorded demo (add person → ask AI → receive bot plan). A Product Hunt page (tagline, gallery, first comment). 3 community posts drafted for the target subreddits/Telegram groups (story-led, not salesy).

**Acceptance:**
- [ ] Demo video clearly shows the core "wow" in under 60s.
- [ ] PH assets meet PH spec (image sizes, copy).
- [ ] Community posts are story-first and link to the landing page.

## 3. Launch readiness checklist (gate before going public)

- [ ] All Phase 1–4 acceptance criteria still pass (full regression).
- [ ] Privacy policy + terms published; data-deletion works end to end.
- [ ] Stripe in live mode; a real $9 charge tested and refunded.
- [ ] Bot stable under load test (simulate N concurrent notifications).
- [ ] Backups configured on the database; restore tested once.
- [ ] Rate limits on public endpoints (login, webhook, AI routes).
- [ ] Secrets in a secret manager; none in the repo.
- [ ] Rollback plan documented for web and bot deploys.

## 4. Launch sequence

1. Soft launch to the Phase 2/3 beta users (the ~20 who tested early) — give them lifetime or extended Pro, ask for testimonials.
2. Post the story to 3 target communities over 3 days (not all at once).
3. Product Hunt launch on a Tuesday–Thursday once you have testimonials and the demo.
4. Build-in-public recap thread on launch day.
5. Watch funnel + errors closely for 72h; hotfix fast.

## 5. Definition of done for Phase 5

- All acceptance checkboxes pass and the launch-readiness gate is fully checked.
- A genuinely new person can go from landing page → understanding → signed up → first value, unaided, in under 5 minutes.
- A referral has been demonstrated end to end with rewards applied.

## 6. Post-launch backlog (not this phase — record only)

- WhatsApp/Instagram via user data-export upload.
- Couple/Family shared network plan.
- Annual billing with discount.
- Native mobile app.
- Relationship-health insights and proactive "you're drifting from X" nudges.
- Outlook calendar parity.
