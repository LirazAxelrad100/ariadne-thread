# Roadmap

## Done
- Step 1 — App shell & auth: Cloud on, Google sign-in, shared header (Write/Read tabs, account menu, sign-out), owner-scoped tables with RLS. Verified: sign-in, refresh persistence, view switching, sign-out.
- Step 2 — Write view: writing box pinned to the bottom, autosave ~1s after typing stops, notes saved as items type "note", auto-close on Esc / 60s idle / navigating away, blank notes never saved, browser draft backup. Lists render live while typing: "- " or "* " becomes a 5px soft grey-blue dot hanging left, second level an outline ring, "1. " a mono number in soft grey, Tab/Shift+Tab nest and unnest with the cursor staying put, Enter continues a list, Enter on an empty item ends or steps out, pasted text stays plain. Verified by the user.
- Step 3 — Read timeline: built from the design picture (dots + times, full notes, day headings like "Wednesday · 14 October", captures clamped to 4 lines with Expand, AI byline "AI · Synthesis of N items", Synthesize gated at 5 entries, month arrows and entry count). Oldest first within the month and inside each day; opens at the top on the oldest entry; switching Write/Read no longer jumps (mode + header advance only once the next route commits, and Read's list never inherits Write's scroll). Verified by the user.
- Step 4 — Marks & comments: select text in an opened item and a dark popup offers Mark (amber highlight) and Comment (highlight plus a field under that paragraph; Enter saves it as a grey italic "↳ Liraz" line, no border or timestamp). Clicking a mark offers Edit comment and Delete mark. Body text locks once the first mark exists — reading and annotating only, with the reason shown. Marks and comments also show in the Read timeline and work inside the writing box before a note is saved (verified in a test browser: mark, comment, reload persistence). Back arrow returns to Read. Verified by the user.
- Rail alignment fix: dot, time and first line of every entry share one centre line in both views (and on the composer's live dot/time) via a shared `--l1` variable (28.4px Write, 30.3px Read/item; mobile 25.5/27.1). Byline, capture title and lock line get the same first-line line-height; lock line sits 6px above the body.

- Step 5 — Capture: bookmarklet ("Capture to Ariadne" in the account menu) opens the app with title, link, writer and text in the writing box; logged-out captures wait through sign-in; "Add its source" turns a pasted text into a capture (phone path); optional "What caught you?" line; no AI summary, no badge (per spec). Bookmarklet also goes into the first-visit steps when empty states are built. Verified by the user on a real article after the drag handle was rebuilt to carry the real `javascript:` code.
  - [x] Fix "Payload Too Large": article now handed over by message, not in the link; bookmark reuses an open Ariadne tab (published app only). Verify with user after publish.

## Next steps (spec build order — each starts when the user sends its prompt)
0. Re-test capture with the user after installing the updated bookmark: LinkedIn bullets and a Guardian piece are the known cases.
1. Account-menu bookmarklet button and panel built: “Get the bookmarklet” opens the installation panel, shared draggable button with caption and click feedback. Add the same button to "First steps" and the landing page later; never to the header itself.
2. Seed import — `/import` loads seed.json, idempotent on import_key; demo account preloaded.
3. Synthesis — needs 5+ items, four sections, "From" source links.
4. Empty states.
5. Landing page (current front page is a stand-in: logo + "Start").

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
