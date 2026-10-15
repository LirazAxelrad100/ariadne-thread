# Roadmap

## Done
- Step 1 — App shell & auth: Cloud on, Google sign-in, shared header (Write/Read tabs, account menu, sign-out), owner-scoped tables with RLS. Verified: sign-in, refresh persistence, view switching, sign-out.
- Step 2 — Write view: writing box pinned to the bottom, autosave ~1s after typing stops, notes saved as items type "note", auto-close on Esc / 60s idle / navigating away, blank notes never saved, browser draft backup. Lists render live while typing: "- " or "* " becomes a 5px soft grey-blue dot hanging left, second level an outline ring, "1. " a mono number in soft grey, Tab/Shift+Tab nest and unnest with the cursor staying put, Enter continues a list, Enter on an empty item ends or steps out, pasted text stays plain. Verified by the user.
- Step 3 — Read timeline: built from the design picture (dots + times, full notes, day headings like "Wednesday · 14 October", captures clamped to 4 lines with Expand, AI byline "AI · Synthesis of N items", Synthesize gated at 5 entries, month arrows and entry count). Oldest first within the month and inside each day; opens at the top on the oldest entry; switching Write/Read no longer jumps (mode + header advance only once the next route commits, and Read's list never inherits Write's scroll). Verified by the user.
- Step 4 — Marks & comments: select text in an opened item and a dark popup offers Mark (amber highlight) and Comment (highlight plus a field under that paragraph; Enter saves it as a grey italic "↳ Liraz" line, no border or timestamp). Clicking a mark offers Edit comment and Delete mark. Body text locks once the first mark exists — reading and annotating only, with the reason shown. Marks and comments also show in the Read timeline and work inside the writing box before a note is saved (verified in a test browser: mark, comment, reload persistence). Back arrow returns to Read. Verified by the user.


## Next steps (spec build order — each starts when the user sends its prompt)
1. Capture — desktop bookmarklet + in-app paste on mobile.
2. Seed import — `/import` loads seed.json, idempotent on import_key; demo account preloaded.
3. Synthesis — needs 5+ items, four sections, "From" source links.
4. Empty states.
5. Landing page (current front page is a stand-in: logo + "Start").

## Still not supplied
- `ariadne-base.css` values are in `src/ariadne.css`, but the logo lockup/header mark SVG source, screens 01–11, and `seed.json` from the brief have not been uploaded.

## Extra, beyond the original Step 4
- Marks & comments inside the Write box before saving (Enter continues below a comment line).
- Ctrl/Cmd+Z removes the last mark (newest first) and undoes an auto-capital.
- Auto-capitals on, always: first word of a line and after ". ", "? ", "! " — Ctrl/Cmd+Z reverts.
- Overlapping marks verified in a test browser: two marks sharing words both render and both persist.
