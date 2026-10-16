<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules

- `src/ariadne.css` is the user's verbatim design stylesheet; use its class names (`.topbar`, `.stream`, `.thread`, `.btn`…) in components instead of re-styling with Tailwind. Why: the user requires the exact original numbers.
- Signed-in views live under `src/routes/_authenticated/` and share the header in `src/components/AppShell.tsx`, which also sets the `mode-writing` / `mode-reading` body class the stylesheet keys on. Why: one header, CSS modes driven by the body.
- All user data lives in `items` (notes, captures, synthesis notes via `is_synthesis`) and `annotations` (marks/comments by character offset), both owner-scoped by RLS on `user_id`. Why: spec stores everything as items; marks map from seed offsets.
- Marks/comments render through `src/components/MarkedBody.tsx`; offsets are into the raw body and mapped to rendered text by `src/lib/marks.ts` (list prefixes and blank lines are skipped). Why: one renderer for Read, item view and Write keeps offsets consistent.
- All bookmarklet installation placements reuse `BookmarkletLink`, including its caption and click feedback; render it directly in the account menu without an intermediate action or panel. Why: the draggable code and button stay identical everywhere with one installation control.
- Synthesis runs in `src/lib/synthesize.functions.ts` (server fn, user-scoped client) and is saved as an `items` row with `is_synthesis`; its body uses `## Section` lines and `From: [[id|label]]` lines, rendered only when `MarkedBody` gets `synth`. Why: one stored text keeps marks/comments working with the same offset mapping.
- Phone capture (Paste a link, Share to Ariadne via the manifest share_target) all funnels through `/capture?url=&text=&title=`, which fetches the page with the authenticated `fetchPage` server fn and stashes it like the bookmarklet. Why: one landing path for every capture door.
- Speech-to-text in the Write composer goes through `src/routes/api/transcribe.ts` (bearer-verified server route, streamed); audio is never stored. Why: user wants text only, no audio files.
- Query keys are not user-scoped, so the query cache is cleared after `supabase.auth.signOut()` and again on the auth page before entering Write. Why: a cache cleared before sign-out refills with signed-out empty lists, which flash the first-visit intro on the next sign-in.
- Small site icons (`icon-16.png`, `favicon.png`, `icon-48.png`, `favicon.ico`, and the declared `icon-mark.svg`) are rasterized from `public/icon-mark.svg`, a tight-crop thick-stroke variant of the app icon, with `rsvg-convert` + PIL; never hand-edit those PNGs. Why: the roomy `public/icon.svg` collapses to an unreadable smudge at 16px. A dragged bookmarklet's icon in the bookmarks bar is out of our hands — Chrome keys icons by URL and a `javascript:` bookmark has none, so it always shows the generic globe; don't re-attempt it.
