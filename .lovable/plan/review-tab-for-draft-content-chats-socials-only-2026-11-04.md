# Review tab for draft content (Chats Socials only)

## What you'll get

**Report builder (Chats only)** — a new collapsed "Draft content" section:
- Add a draft: upload image(s) or video (9:16 or square), write the draft caption.
- "Link to calendar entry" dropdown listing the report's key events. Once linked, the draft takes that entry's date, time and platform tags (IG, TT, FB, Story, etc.).
- Per draft you see the client's status (Pending / Approved / Amends needed) and any comments they left, with a "Mark resolved" option.
- Drafts start hidden; a "Show on Review tab" switch publishes each one.

**Live Chats report** — a third tab **Review** next to Posts and Calendar (beside Listening):
- Cards styled like the Posts tab and your example: media on top with platform icon, a grey **DRAFT** banner, platform tag pills from the linked calendar entry, scheduled date/time, then **Caption** with the draft text.
- Under each card: **Approve** button and **Request amends** button. Amends opens a comment box (name optional, comment required). No login needed.
- Once approved, the card shows "Approved" with the date; comments show in a short thread under the card.

## Things to know
- Anyone with the live report link could approve or comment, as the report is public with no passcode. Comments are length-limited and rate-limited to cut spam; you'll be able to delete any.
- Approving here doesn't publish anything — it's a sign-off record for you.
- Only the Chats report gets this for now.

## Technical details
- New tables: `report_draft_posts` (report_id, calendar_event_id nullable, media_url, media_type, caption, published, approval_status, approved_at, position) and `report_draft_comments` (draft_id, author_name, body, created_at, resolved). Admin-only RLS; no anon grants.
- Calendar events live in `calendar_events` JSON; link by the event's id field (add a stable id to events lacking one when saved).
- Public read via narrow SECURITY DEFINER RPC limited to published, code-free `chats-socials`, returning only published drafts + comments (no emails).
- Approve/comment via public `createServerFn`s that validate (zod, max 1000 chars) and check the draft belongs to a published code-free Chats report, then write with the admin client; simple per-draft rate cap.
- Media uploads reuse the existing `spotlight-images` upload path from Upload photo/video.
- Tab gated by a slug helper (like `reportCalendarPlatforms`), with a test.
