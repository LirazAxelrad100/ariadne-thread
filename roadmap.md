# Roadmap

## Done
- Step 1 — App shell & auth: Cloud on, Google sign-in, shared header (Write/Read tabs, account menu, sign-out), owner-scoped tables with RLS. Verified: sign-in, refresh persistence, view switching, sign-out.
- Step 2 — Write view: writing box pinned to the bottom, autosave ~1s after typing stops, notes saved as items type "note", auto-close on Esc / 60s idle / navigating away, blank notes never saved, browser draft backup. Lists render live while typing: "- " or "* " becomes a 5px soft grey-blue dot hanging left, second level an outline ring, "1. " a mono number in soft grey, Tab/Shift+Tab nest and unnest with the cursor staying put, Enter continues a list, Enter on an empty item ends or steps out, pasted text stays plain. Verified by the user.

## Waiting on user
- None.

## In progress
- None.

## Next steps (spec build order — each starts when the user sends its prompt)
1. Marks & comments — text-lock after the first mark.
2. Capture — desktop bookmarklet + in-app paste on mobile.
3. Seed import — `/import` loads seed.json, idempotent on import_key; demo account preloaded.
4. Synthesis — needs 5+ items, four sections, "From" source links.
5. Empty states.
6. Landing page (current front page is a stand-in: logo + "Start").

## Still not supplied
- `ariadne-base.css` values are in `src/ariadne.css`, but the logo lockup/header mark SVG source, screens 01–11, and `seed.json` from the brief have not been uploaded.
