
# Paid Subscriptions on Create Racket

Goal: introduce a Free tier plus one or more Paid tiers, billed monthly/yearly through Stripe, integrated with the existing email + Google login and the current access-code system (which will double as promo/discount codes).

## 1. Provider choice — Stripe (built-in)

Use Lovable's built-in Stripe payments integration (no API keys or Stripe account setup required from you upfront). This gives us:
- Hosted, PCI-compliant Stripe Checkout + Customer Portal
- Webhooks handled for us into our backend
- Tax handling via Stripe (default: full compliance handling for digital/SaaS if your seller country is eligible; otherwise tax calculation only)
- Test mode immediately, live mode after account claim/verification

Before enabling, I'll run the eligibility check and confirm with you.

## 2. Plans & pricing structure

Define plans in one place (`src/lib/plans.ts`) so UI + server share the same source of truth. Starting shape (final names/prices TBC with you):

| Tier | Price | Who it's for | Key gates |
|---|---|---|---|
| Free | $0 | Fans, browsing artists | Vibe Check, browse public rosters/reports, limited briefs/month |
| Artist Pro | e.g. $9/mo or $90/yr | Individual artists | Public profile, apply to unlimited briefs, roster inclusion |
| Studio | e.g. $29/mo | Managers/creatives | Roster builder, campaign reports, multi-artist |
| Brand | Custom / retainer | Brands & agencies | Briefs, campaign reports, roster access — often billed off-platform |

Each plan defined once with: `id`, `stripe_price_id_monthly`, `stripe_price_id_yearly`, `features[]`, `limits{}`.

## 3. Database changes

New migration:

- `subscription_plans` — mirror of the code-side plan list (id, name, tier rank, feature flags). Optional but useful for admin edits without redeploying.
- `subscriptions` — one row per user:
  - `user_id` (FK auth.users, unique)
  - `plan_id` (FK subscription_plans, defaults to `free`)
  - `status` (`active` | `trialing` | `past_due` | `canceled` | `incomplete`)
  - `stripe_customer_id`, `stripe_subscription_id`
  - `current_period_end`, `cancel_at_period_end`
  - `promo_code_used` (nullable, references `promo_codes.code`)
  - timestamps
- `promo_codes` — extends today's access codes:
  - `code` (PK, e.g. `VERIFIEDFAN`, `RACKETISCOOL`)
  - `stripe_coupon_id` (nullable — if set, applied at Checkout)
  - `discount_percent` / `discount_amount` (for display)
  - `duration` (`once` | `forever` | `repeating`)
  - `max_redemptions`, `redeemed_count`, `expires_at`
  - `grants_plan_id` (optional — for full comp codes)
  - `active` bool
- `user_roles` already exists — leave untouched.

RLS: users can read their own `subscriptions` row; admins can read all; `promo_codes` readable to authenticated for validation lookups, write to admins only. All new `public` tables get the required `GRANT`s per project rules.

Seed today's access codes into `promo_codes` so the current gate still works end-to-end.

## 4. Auth + access code integration

Keep `/login` exactly as is for authentication. What changes:

- The access-code field on signup becomes an optional **promo code** field. Behaviour:
  - Empty → user signs up onto Free tier (no gating).
  - Valid code → stored in `sessionStorage` and passed through to Checkout as the Stripe coupon; if it's a "grants_plan_id" comp code, we skip Checkout and directly assign the plan.
- The current "soft-launch gate" (must enter code to see signup form) becomes opt-in: I'll add an admin toggle `require_access_code_for_signup`. Default off once subscriptions ship, so the whole world can sign up onto Free.
- On first sign-in, a Postgres trigger creates a `subscriptions` row with `plan_id = 'free'` (extends existing `handle_new_user`).

## 5. Stripe integration (server-side)

All server logic uses TanStack `createServerFn` and public routes for webhooks — no Supabase Edge Functions.

- `src/lib/billing.functions.ts`
  - `createCheckoutSession({ planId, interval, promoCode? })` — creates/finds Stripe customer for the signed-in user, returns Checkout URL. Applies coupon if promo code valid.
  - `createPortalSession()` — returns Stripe Customer Portal URL for managing/canceling.
  - `getMySubscription()` — returns current plan + status for UI.
- `src/routes/api/public/stripe-webhook.ts` — verifies Stripe signature, handles:
  - `checkout.session.completed` → upsert subscription
  - `customer.subscription.updated` / `.deleted` → sync status, period end
  - `invoice.payment_failed` → mark `past_due`
  - On promo redemption, increment `promo_codes.redeemed_count`.

## 6. Client UI

- **`/pricing` route** — public marketing page with all tiers, monthly/yearly toggle, "Get started" CTAs. Free → `/login?mode=signup`; paid → Checkout (redirects through login if signed out).
- **Login/signup** — promo code field stays; label updated ("Have a code? Apply it at checkout").
- **`/settings/billing`** (under `_authenticated`) — shows current plan, renewal date, "Manage billing" (Portal), "Upgrade" / "Cancel".
- **Feature gating helper** — `useSubscription()` hook + `<RequirePlan tier="pro">…</RequirePlan>` wrapper. Used to gate roster builder, campaign reports, etc.
- Header shows a small "Upgrade" chip for Free users.

## 7. Admin

New "Subscriptions" tab in `/admin`:
- List users with plan, status, MRR contribution
- Manually grant/revoke a plan (writes to `subscriptions`, no Stripe call)
- CRUD for `promo_codes` (create Stripe coupon via server fn, store IDs)
- Toggle for `require_access_code_for_signup`

## 8. Rollout steps (execution order)

1. Confirm plan names, prices, and which existing features gate to which tier.
2. Run `recommend_payment_provider` and enable Stripe payments (built-in).
3. Migration: `subscription_plans`, `subscriptions`, `promo_codes`, extend `handle_new_user` trigger. Seed plans + migrate existing access codes into `promo_codes`.
4. Create Stripe products/prices via `batch_create_product` (test mode first).
5. Implement billing server functions + Stripe webhook route.
6. Build `/pricing`, `/settings/billing`, and the `useSubscription` gating helper.
7. Update `/login` to treat access codes as promo codes and stop hard-gating signup (behind admin toggle).
8. Add Subscriptions tab to admin.
9. Test end-to-end in Stripe test mode (signup → checkout → webhook → gated feature unlocks → cancel).
10. Claim/verify Stripe account → flip to live mode.

## Technical notes

- Source of truth for entitlements = `subscriptions.status IN ('active','trialing')` AND `current_period_end > now()`; UI reads via `getMySubscription()` server fn, cached with TanStack Query.
- Never trust client-side plan claims for gating — server fns re-check `subscriptions` before any premium action.
- Webhook route lives under `/api/public/*` and verifies `STRIPE_WEBHOOK_SECRET` before any DB write.
- Promo codes are validated server-side against `promo_codes` AND translated to a Stripe coupon at Checkout — never let the client pick the discount.
- Existing access codes (`VERIFIEDFAN`, `RACKETISCOOL`) will be migrated as 100%-off / grants-Pro codes so nothing breaks for early users.

## Questions before I build

1. Plan names + monthly/yearly prices you want to launch with?
2. Which existing features should be Pro-only vs Free (roster builder, campaign reports, applying to briefs, etc.)?
3. Should Brand tier be self-serve Stripe or "Contact us" only (off-platform billing)?
4. Do you want a free trial on paid plans (e.g. 14 days)?
