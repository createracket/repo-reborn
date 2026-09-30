# Content calendar view for roster pages (starting with Tixel)

## What you get

**In the roster builder (admin)**
- A new switch in the roster settings: **Show calendar view**. It's off by default, and switching it on only affects that roster.
- Each creator's edit form gets a **Posting date** field (a date picker). You can clear it at any time.
- A creator with no posting date just doesn't appear on the calendar.

**On the live roster page (when the switch is on)**
- The page opens in the usual list format, with no changes.
- A new **List / Calendar** toggle sits above the creators, next to the existing filters.
- **Calendar** shows a monthly grid, opening on the month of the next upcoming posting date (or the current month if there isn't one). Arrows move between months.
- Each creator appears on their posting date as a small chip showing their photo and name. Clicking the chip jumps back to their card in the list view.
- Busy days show up to 3 chips, then a "+2 more" link that opens that day's full list.
- Your category and status filters also apply to the calendar.
- It works in light and dark mode using the brand colours: posting chips are brand green and today is outlined in brand pink.
- On phones, the calendar becomes a month-by-month list of dates with creators under each date, so it stays readable.

When the switch is off, the page looks exactly as it does today, with no toggle.

## Design preview

```text
Desktop - live roster page, calendar toggled on
+--------------------------------------------------------------+
|  TIXEL SOCIAL                                   [header]     |
|  description ...                     [link] [link]           |
|                                                              |
|  [ List | *Calendar* ]    Category v   Status v              |
|                                                              |
|        <   October 2026   >                                  |
|  Mon    Tue    Wed    Thu    Fri    Sat    Sun               |
| +------+------+------+------+------+------+------+           |
| |  1   |  2   |  3   |  4   |  5   |  6   |  7   |           |
| |      |(o)Max|      |      |(o)Rag|      |      |           |
| +------+------+------+------+------+------+------+           |
| |  8   |  9   | [10] |  11  |  12  |  13  |  14  |           |
| |(o)Sou|      |today |      |(o)Sta|      |      |           |
| |(o)Tow|      |      |      |(o)Bat|      |      |           |
| |      |      |      |      |+2more|      |      |           |
| +------+------+------+------+------+------+------+           |
|  ...                                                         |
+--------------------------------------------------------------+
(o) = creator photo; green chip = scheduled post

Mobile - calendar toggled on
+------------------------+
| [ List | *Calendar* ]  |
|   <  October 2026  >   |
| Thu 2 Oct              |
|  (o) Max Jackson       |
| Sun 5 Oct              |
|  (o) Rageflower        |
| Wed 8 Oct              |
|  (o) South Summit      |
|  (o) Towns             |
+------------------------+

Admin - roster builder
  Settings:  [x] Show calendar view
  Creator edit:  Posting date  [ 12/10/2026  (cal) ] [clear]
```

## Rollout
1. Build the feature, switch it on for the Tixel roster (tixel-social), and add a couple of test dates so you can see the calendar working.
2. Check the list view, calendar view and phone layout in light and dark mode.
3. Any other roster can then use it by turning on the same switch.

## Technical details
- Database change: add `roster_items.posting_date date null` and `rosters.show_calendar boolean not null default false`. The existing grants and access rules already cover both tables.
- Update `get_public_roster` (it stays security definer, and anon/authenticated keep execute) so it returns `posting_date` for each creator and `show_calendar` for the roster.
- `src/routes/_authenticated.roster-builder.tsx`: add the settings switch and a Posting date input in the creator edit/add forms. Save it as a YYYY-MM-DD string with no timezone conversion.
- New `src/components/roster/RosterCalendar.tsx`: a pure month grid built with date-fns (Monday start), made from semantic tokens (`bg-lime`, `ring-pink-accent`, `report-light:` variants), plus a stacked list layout below `sm`.
- `src/routes/roster.$slug.tsx`: add a `view` state (list/calendar), shown only when `roster.show_calendar` is on. The calendar uses the same filtered creators as the list, and chip clicks switch back to the list and scroll to `#creator-<id>`.
