# Roadmap

## Done
- Step 1 — App shell & auth: Cloud on, Google sign-in, shared header (Write/Read tabs, account menu, sign-out), owner-scoped tables with RLS. Verified: sign-in, refresh persistence, view switching, sign-out.
- Step 2 — Write view: writing box pinned to the bottom, autosave ~1s after typing stops, notes saved as items type "note", auto-close on Esc / 60s idle / navigating away, blank notes never saved, browser draft backup. Lists render live while typing: "- " or "* " becomes a 5px soft grey-blue dot hanging left, second level an outline ring, "1. " a mono number in soft grey, Tab/Shift+Tab nest and unnest with the cursor staying put, Enter continues a list, Enter on an empty item ends or steps out, pasted text stays plain. Verified by the user.
- Step 3 — Read timeline: built from the design picture (dots + times, full notes, day headings like "Wednesday · 14 October", captures clamped to 4 lines with Expand, AI byline "AI · Synthesis of N items", Synthesize gated at 5 entries, month arrows and entry count). Oldest first within the month and inside each day; opens at the top on the oldest entry; switching Write/Read no longer jumps (mode + header advance only once the next route commits, and Read's list never inherits Write's scroll). Verified by the user.
- Step 4 — Marks & comments: select text in an opened item and a dark popup offers Mark (amber highlight) and Comment (highlight plus a field under that paragraph; Enter saves it as a grey italic "↳ Liraz" line, no border or timestamp). Clicking a mark offers Edit comment and Delete mark. Body text locks once the first mark exists — reading and annotating only, with the reason shown. Marks and comments also show in the Read timeline and work inside the writing box before a note is saved (verified in a test browser: mark, comment, reload persistence). Back arrow returns to Read. Verified by the user.
- Rail alignment fix: dot, time and first line of every entry share one centre line in both views (and on the composer's live dot/time) via a shared `--l1` variable (28.4px Write, 30.3px Read/item; mobile 25.5/27.1). Byline, capture title and lock line get the same first-line line-height; lock line sits 6px above the body.

- Step 5 — Capture: bookmarklet ("Capture to Ariadne" in the account menu) opens the app with title, link, writer and text in the writing box; logged-out captures wait through sign-in; the source fields fill themselves on every capture ("Paste a link" is the phone path); optional "What caught you?" line; no AI summary, no badge (per spec). Bookmarklet also goes into the first-visit steps when empty states are built. Verified by the user on a real article after the drag handle was rebuilt to carry the real `javascript:` code.
- [x] Write composer copy (16 Oct): placeholder is now "What couldn’t you stop thinking about today?"; the "Pasting something you read? Add its source" line is gone — every capture door fills the source itself. Verified signed-in in a test browser.
  - [x] Fix "Payload Too Large": article now handed over by message, not in the link; bookmark reuses an open Ariadne tab (published app only). Verify with user after publish.
- Bookmarklet button: one "Capture to Ariadne" button styled directly in the account menu (outlined, 44px, transparent fill, --meta-soft caption "Drag the button to your bookmarks bar." sitting 6px below with its left edge flush with the button's, menu-float shadow), same drag handle and code everywhere; no intermediate step or separate panel, and never in the header. Same button comes to "First steps" and the landing page when those are built. Verified by the user.
- Capture re-tested by the user with the freshly dragged bookmark on a real article: opened, filled and saved correctly. Step 5 closed.
- Read month clarity (the "9 entries" confusion): the header count now reads "9 of 19 entries" (month on screen of the whole timeline, hidden on mobile), clicking the month name opens the month strip your stylesheet already had — every month with entries, grouped by year, oldest left, current one dotted, closed by re-click / outside click / Esc / switching to Write — and the stream ends with one quiet underlined line naming the months still off screen ("September, August and July hold 10 more entries") that jumps to the nearest of them. Verified in a test browser as the demo account: strip open/close, jump to September, and the line re-pointing from every month.



- Read timeline spacing (brief 07): 22px between entries within a day (18px on phones) and exactly 40px from a day's last entry to the next day divider; each day keeps its own rail that stops at its last entry, with the "Wednesday · 14 October" label and hairline above it. Verified in the demo account: measured gaps 22/22 inside a day and 40 between all six days.
- Read order settled: each month starts at its first day and runs oldest → newest, opening at the top. The one place order matters — Synthesize — already lands you on the new note: verified in the test account (three notes → Synthesize → the view moves to the new synthesis item; back returns to Read with four entries).


## Next steps (spec build order — each starts when the user sends its prompt)

Seed import — DONE: 18 items + 27 marks loaded into the demo account (demo@ariadne-thread.app); your own account untouched. Email sign-in added to the sign-in page.
2. Synthesis — Done and approved by the user. Built to spec (5+ items, four sections, empty ones hidden, "From" links) and shaped over three rounds: "The thread" opens with 2–3 sentences; each section holds up to two findings, each a 2–3 sentence explanation, short bullet examples quoting the actual passages, then its "From" sources. While it runs, the word "Synthesize" greys out and a warm dot rides the thread icon's curve, keeps the same wave across the word and travels back, over and over; the status line under the header stays. Verified frame by frame in a test browser.
3. Empty states. The throwaway test account (lirazaxelrad2@gmail.com) is empty — samples go in via "Explore the demo entries" on the empty Read screen. After these tests: offer to clear the test junk out of the user's own account on request.
4. Landing page — DONE and verified in a test browser: header mark + wordmark with Sign in; hero lockup (logo, "Ariadne’s Thread", hook "AI that finds the thread in the maze of your mind.", Start / Try the demo); "How it works" rail of five steps with the screenshot panel beside it, auto-advancing 5s each (8s on Synthesize), clickable, Pause/Play, paused under prefers-reduced-motion; "Capture from anywhere" with the same bookmarklet button; closing repeat of the lockup + actions; privacy copy verbatim; footer "Built at the SheBuilds Buildathon, October 2026" + Privacy. Screens 01–05 were captured from the running app and served as CDN assets. "Try the demo" signs the read-only visitor in server-side and lands on Read with the full thread. Verified: all five images load at 1200×800, the carousel advances and changes the shot, the demo reaches Read with 8 current-month entries, no console errors, nothing clipped at the bottom.

## Open gaps (parked 16 Oct — pick up during polish)
- Item view gives no hint that text can be selected to mark it; the popup only appears once someone discovers it.
- Deleting the very last entry has not been checked: Read should fall back to "Your thread starts here" and Write should show the thread intro again.
- Mobile pass: the landing is done on a phone (steps as a list, the active step's shot under it, "Capture from anywhere" reworded to "+ Capture in the app" since the bookmarklet is desktop-only). Still to do: header two rows, month switcher on its own centred row, writing box fixed 232px, editable fields ≥16px.


## Submission checklist (event rules)
- Judges' demo login (demo@ariadne-thread.app) goes in the private submission form only — never in app code, never in public Slack. It is not the landing page's "Try the demo" account.
- Before submitting: sign in as the judges' demo account on the published app and confirm the 18 entries, marks and Synthesize all work there.
- Landing "Try the demo" uses its own read-only visitor account, so the judges' login never ships in the app.

## Still not supplied
- `ariadne-base.css` values are in `src/ariadne.css`, but the logo lockup/header mark SVG source, screens 01–11, and `seed.json` from the brief have not been uploaded.

## Landing page steps (apply when the real landing is built — current front page is a stand-in with no steps)
- Step label line-height: 20px; step number top: 0, line-height: 20px; step dot top: 5.5px.

## Extra, beyond the original Step 4
- Marks & comments inside the Write box before saving (Enter continues below a comment line).
- Ctrl/Cmd+Z removes the last mark (newest first) and undoes an auto-capital.
- Auto-capitals on, always: first word of a line and after ". ", "? ", "! " — Ctrl/Cmd+Z reverts.
- Overlapping marks verified in a test browser: two marks sharing words both render and both persist.
- Fixed: marks landing on the wrong words (blank lines were doubled on every save), Esc now closes from the source fields too, 60s close also runs while the tab is in the background.
- Fixed: LinkedIn captures — writer name now comes from the article's own data (LinkedIn has no author meta tag), and the title no longer repeats inside the text. Verified on the Brodsky article. Avatar-reload report not reproducible; likely the preview refreshing as the fix landed.

- [x] Landing pictures: cut header replaced with logo + view name strip (approved).
- [x] Hero title: user wants it exactly "like it was" (old screenshot image-14) — hook line reverted to 22px/300 --ink-recede; layout itself never changed. Published and confirmed good by the user (16 Oct).
- [x] Landing pictures replaced with live scenes (approved by the user 16 Oct): five moving scenes drawn in the app with the demo's own words — typing, capture arriving, a mark landing, the thread, a synthesis finding. Screenshots retired. "Try the demo" kept next to Start.
- [x] Republished (16 Oct 12:40 UTC): the live site now carries the live scenes.
- [ ] Synthesize scene's finding line is the AI's wording (built on real demo lines); the user may replace it with her own sentence.
- [x] Article attribution (16 Oct): the author is Judson Brewer, MD, PhD. Capture scene byline and Read scene source line carry the full name; the demo item's writer field set to match so the real demo agrees; the footer now carries a credit line linking to the article, rights reserved.
- [x] Landing bookmarklet placement (16 Oct, user's call): removed from the closing section so Start / Try the demo stand alone; the button stays only inside the Capture scene. Signed-out captures confirmed to be kept in the browser and restored after sign-in, so nothing is lost either way.
- [ ] Mobile preview review (16 Oct): user wants to see the landing on a phone in the preview — switched the preview to phone view; walk through the phone pass items above while it's there.

## Mobile capture (16 Oct)
- [x] Paste a link (phones only, under the writing box) — the page's title, writer and text come in like a bookmarklet capture. Verified on the real Substack article.
- [x] Share to Ariadne — app is installable (icon, manifest), shared links land in the writing box; signed-out shares wait through sign-in. Works on Android after "Add to home screen"; iPhone doesn't offer web apps in its Share menu, so iPhone uses Paste a link. Needs publish + a check on a real phone.

## Footer "How it works" (16 Oct)
- [x] Footer link "How it works" added next to Privacy and Support; opens the same card style as Privacy with five short lines, one per step (Write, Capture, Mark, Read, Synthesize). Esc, × and backdrop click all close it; focus returns to the link. Phone: lines stack.
- [x] Copy: the user's own five lines + On mobile section are wired into the footer pop-up (16 Oct).

## Speaking into notes (16 Oct)
- [x] Speak button under the writing box: talk, it turns into text in the box, autosaved and editable. No audio is kept anywhere — text only.
- [x] On a captured article the button reads "Speak a comment" and the words go into "What caught you?" at the end of the piece.
- [x] Words appear while still talking: each pause lands its phrase in the box, so Stop only sends the last bit.
- [x] Speech-to-text runs through src/routes/api/transcribe.ts (bearer-checked, streamed); recordings stop on their own after 10 minutes.
- [x] Real microphone test by the user — passed (16 Oct, second run): spoken words landed in the box while she was still talking, confirmed from her screenshot ("I can see the text while I'm speaking"). Phone header confirmed good from her screenshots.
- [x] Capture: subtitle (page description) and writer name now picked up (sailthru/parsely author meta, ld+json arrays).
- [x] Capture subtitle fixed for real (16 Oct): the bookmarklet's ellipsis check lost its backslashes inside the template literal (`/\u2026|\.\.\.$/` shipped as `/…|...$/`, matching every description), so the subtitle line was never prepended. Now double-escaped, and the visible dek element (Hearst `data-fp-dek`, common `.article-dek/.article-subtitle` selectors) is preferred over the SEO meta description. Verified on the Cosmopolitan chai-latte article: "A little creamy, a little sweet, and a little spicy—and no coffee shop run required." lands at the top with a blank line, writer Catharine Malzahn, correct title. Paste a link / phone share get the same dek preference in fetchPage.functions.ts. Verified by the user (16 Oct) with a freshly dragged button: subtitle at the top, then the full article, writer and title correct. The capture that held only the subtitle was a stray highlight on the page — a selection is taken as a chosen passage, as designed.
- [x] Published (16 Oct 12:40 UTC): the live site now hands out the fixed button. Live page confirmed serving (200, correct title).
- [x] Account menu: How it works, Privacy, Support
- [x] Capture caption (16 Oct): now "Drag the button to your bookmarks bar." — 6px directly below the button with its left edge flush with the button's, in the account menu and the Write intro; measured at 900/1280/1440px wide, one line, no clash with the neighbouring column.

## Pre-submission QA (16 Oct)
- [x] Automated: tests pass (incl. new rule tests), security + dependency scans clean, data separation rules checked, live landing OK on desktop and phone (no console errors, pop-ups open/close), demo account holds the 18 seed items only.
- [ ] (user) Judges' email sign-in on live, Google sign-in with a new account, Speak on phone, bookmarklet on 3 sites, iPhone Paste a link / Android Share, Safari + Firefox, link preview in WhatsApp.
- [x] Publish latest (How it works step 04 copy) and re-check on live — pushed and confirmed on ariadne-thread.lovable.app.

- [x] Capture composer redesign: all details inside the writing box (title, writer · domain, I wrote this, text with fade, What caught me)
