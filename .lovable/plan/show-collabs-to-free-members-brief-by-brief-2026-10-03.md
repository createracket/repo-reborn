# Show collabs to free members, brief by brief

## What you'll get

Every brief gets its own **"Show to free members"** switch, sitting right under
"Publish as opportunity". Only the briefs you switch on appear on a free
member's dashboard — everything else keeps the current paid-only behaviour.

- Briefs you've already saved stay hidden from free members until you switch
  them on. Nothing changes on its own.
- Briefs you share privately with someone still reach them, even if they're on
  free. Sharing is a deliberate hand-pick, so it shouldn't silently vanish. Say
  the word if you'd rather free members see nothing but the switched briefs.
- The **Free view** button on your own dashboard becomes a true preview: it
  shows exactly what a free member sees, so you can check before publishing.
- If none of your live briefs are switched on, free members still see the
  "Unlock access to collabs as a priority subscriber" prompt — the paid pitch
  stays as your default lever.
- When free members can see a few briefs, the feed shows with a one-line
  "Unlock every collab" note underneath, so the upgrade path is still there.

Free members still only see briefs matching their Vibe Check archetype (or all
members, if you've left the archetype filters empty on that brief) — the switch
adds to that rule, it doesn't replace it.

## How you'll use it

1. Dev view → **Campaign Builder** → open a brief
2. Switch on **Publish as opportunity**, then switch on **Show to free members**
3. Your dashboard → **Free view** to see it the way a free member does

## Technical details

- Migration: `ALTER TABLE public.campaign_briefs ADD COLUMN visible_to_free
  boolean NOT NULL DEFAULT false` — additive, existing rows get `false`.
- `BriefsManager` (`src/components/admin/BriefsManager.tsx`): second `Switch` in
  the existing publish row, optimistic update + `supabase.from("campaign_briefs")
  .update({ visible_to_free })`, plus a "Free" badge beside "Live opportunity"
  on the brief list row so it's visible without opening the brief.
- Dashboard (`src/routes/_authenticated.dashboard.tsx`): add `visible_to_free`
  to the `campaign_briefs` feed query (line ~338); the free branch (line ~1240)
  stops short-circuiting to the upsell and instead renders the feed filtered to
  `visible_to_free === true` plus anything privately shared with that person,
  falling back to the current upsell when that set is empty. Paid members'
  feed is untouched.
- Lead briefs have no publish path, so the switch applies to user briefs only.
- Verify in a signed-in preview: flip the switch on one brief, confirm Free view
  shows it and hides the rest, confirm Paid view is unchanged, and confirm the
  upsell still appears when nothing is switched on.
- Frontend changes need publishing to reach createracket.com.
