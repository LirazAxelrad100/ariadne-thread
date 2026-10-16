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
- All bookmarklet installation placements reuse `BookmarkletLink`, including its caption and click feedback; the account menu switches to a dedicated installation panel. Why: the draggable code and button stay identical everywhere.
