# Roadmap

## Done
- Step 1 — App shell & auth: Cloud on, Google sign-in, shared header (Write/Read tabs, account menu, sign-out), owner-scoped tables with RLS. Verified: sign-in, refresh persistence, view switching, sign-out.

## Waiting on user
- Header review (user is checking it in the preview now).

## Next steps (spec build order — each starts when the user sends its prompt)
1. Write view — writing box pinned to the bottom, autosave, notes/captures as items.
2. Read view — timeline of items, month switcher + month strip.
3. Marks & comments — text-lock after the first mark.
4. Capture — desktop bookmarklet + in-app paste on mobile.
5. Seed import — `/import` loads seed.json, idempotent on import_key; demo account preloaded.
6. Synthesis — needs 5+ items, four sections, "From" source links.
7. Empty states.
8. Landing page (current front page is a stand-in: logo + "Start").

## Still not supplied
- `ariadne-base.css` values are in `src/ariadne.css`, but the logo lockup/header mark SVG source, screens 01–11, and `seed.json` from the brief have not been uploaded.
