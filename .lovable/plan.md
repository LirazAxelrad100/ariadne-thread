# Pre-submission QA checklist for the judges

Goal: a judge opens the live site, signs in with the demo account, and every main feature works without surprises. I run the checks I can do automatically; the ones that need a real phone, microphone or browser bookmarks bar are marked **(you)**.

## 1. First impression (live site, signed out)
- Landing loads fast with no errors in the browser console; the carousel advances, pauses on hover, and the live scenes show demo content (no "test" text).
- Footer: How it works, Privacy and Support open and close (×, Esc, clicking outside); How it works scrolls on small screens; Support opens an email to support@ariadne-thread.app.
- "Try the demo" lands in the read-only demo, and nothing in it looks broken or offers actions that would fail.
- The link preview (title, description) looks right when you paste the link into WhatsApp/Slack **(you)**.

## 2. Judges' sign-in
- demo@ariadne-thread.app signs in with email and password on the live site; wrong password shows a clear message.
- Google sign-in works for a new account; a brand-new account sees the empty states (Write intro, empty Read) correctly.
- Sign out returns to the sign-in page and leaves no data on screen.

## 3. Core flows, signed in as the demo account
- **Write**: type a note, see "Saved", reload — it's still there. Esc closes the note.
- **Speak**: words appear while talking, Stop adds the last part **(you, desktop + phone)**.
- **Capture**: bookmarklet from the account menu on 3 sites (a Substack, the Guardian, Cosmopolitan) — title, writer, subtitle and text come in; with text highlighted only the highlight comes in **(you)**.
- **Mark + comment**: highlight text, mark it, add a comment, reload — they stay in place, also on long captures and on a synthesis.
- **Read**: oldest to newest, day dividers, month switcher and month strip work; long articles are shortened with Expand.
- **Item view**: open an entry, read it in full, delete with confirmation returns to Read.
- **Synthesize**: works with 3+ notes, shows "Not enough notes yet…" below that, the result's "From" links open the right notes.

## 4. Phone **(you)**
- iPhone: Paste a link captures an article. Android: Share → Ariadne's Thread.
- Header fits on one row in Write and Read, the writing box stays at the bottom with the keyboard open, no page scrolling, no zoom on tapping text fields.
- Bookmarklet button is hidden on phones.

## 5. Browsers and screens
- Chrome, Safari and Firefox on desktop; widths 1440, 1280, 900 and a phone size; zoom 200%. No clipped text or overlaps.

## 6. Safety and privacy
- Fresh security scan and dependency scan; fix anything new.
- Another account cannot see the demo account's notes (data separation check).
- The demo account's content is what you want judges to see; leftover test notes removed.
- Pages that can't be fetched or bad links show a calm message, not an error screen.

## 7. Automated tests
- Run the existing tests (marks positioning, routing) and add small tests for the rules that matter: synthesis needs 3 non-synthesis items, long captures shorten over 120 words.

## 8. Final
- Publish the latest version, then repeat sections 1–3 quickly on the live address.
- Open items in the roadmap are closed or consciously left out.

## Technical details
- Automated checks via Playwright against localhost and the published URL, console/network logs, `security--run_security_scan`, `security--dependency_scan`, an RLS check with a second account, and `bunx vitest run`.
