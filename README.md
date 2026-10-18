# Ariadne's Thread

AI that finds the thread in the maze of your mind.

A personal space for your thoughts, ideas, plans, and inspirations. A text-based timeline of everything that goes through your mind, with an AI to synthesize it — find connections, patterns, and contradictions. Ariadne's Thread is your personal springboard.

**Live:** https://ariadne-thread.lovable.app
**Demo thread, read-only, no sign-in:** https://ariadne-thread.lovable.app/demo

Built at SheBuilds Season 04 — Lovable's 3-day build event for women, October 15–17 2026. Around 16 hours of real build time inside the 72-hour window.

## How it works

1. **Write.** Whatever's on your mind, jot it down.
2. **Capture.** Read something that inspires you? Capture it in one click.
3. **Mark.** Mark the parts that move you. Add a note.
4. **Read.** Everything on your mind, in one stream.
5. **Synthesize.** Find the threads: patterns, open questions, thoughts you didn't know you were having.

### Write

One box, pinned to the bottom of the screen. It autosaves constantly — there is no save button. A note closes when you leave the view, switch tab, or stop typing for a minute, and moves up into today's list. Prefer speaking? Tap Speak and talk; the words arrive as text. No audio files are kept.

### Capture

Drag **Capture to Ariadne** to your browser's bookmarks bar. On any article, select a passage and click it: the text lands in Write with the title, writer and source filled in. On a phone, copy the link and tap **Paste a link**, or use Share → Ariadne's Thread.

### Mark

Highlight any phrase in a note or capture to mark it, and write a comment underneath while the thought is fresh. Marks are the signal the AI reads. Once a passage is marked, that text locks so the marks stay where they were placed.

### Read

A single chronological stream — notes, captures, and synthesis notes together, oldest to newest.

### Synthesize

Press it and the AI reads across everything you have written and clipped, and writes back four things: **Themes, Connections, Open questions, Contradictions.** Every finding cites the notes it came from, and a link opens that item. It needs at least three entries, and it never invents a finding to fill a section.

## What it deliberately isn't

Text only — no images, audio or video in the thread. No sharing: one private thread per account, and nothing you write is visible to anyone else.

## Privacy

> Your board is yours. Nothing you write or save is shared with or visible to anyone else.
>
> When you press Synthesize, your notes and clips are sent to an AI service to find patterns in them. It is used to produce your synthesis and nothing else — not to train models, not to build a profile of you.
>
> Your items and marks are stored so the board works. There are no ads and your data is not sold.
>
> Want it gone? Email lirazaxelrad2@gmail.com and your account and everything in it will be deleted.

## How it's built

- **TanStack Start** (React 19, SSR) with TypeScript, **Tailwind CSS v4**
- **Lovable Cloud** (Supabase) — email and Google sign-in, Postgres, row-level security so each account only ever reads its own rows
- **Lovable AI Gateway** — synthesis and speech-to-text

Two decisions worth a look:

- **Marks are character offsets into the raw text**, re-mapped to the rendered text at paint time (`src/lib/marks.ts`). List markers, prefixes and blank lines are skipped in the mapping, so one renderer serves Read, the item view and Write and offsets stay consistent everywhere.
- **A synthesis is stored as a plain item** with a flag (`src/lib/synthesize.functions.ts`), not a special type. Its body is markdown-ish text with `From: [[id|label]]` source lines, which means marks and comments work on an AI note exactly as they do on your own writing.

Capture has one landing path: the bookmarklet, "Paste a link", and the phone Share target all funnel through `/capture`, so a capture stashed while signed out survives into Write after sign-in.

## Layout

```text
src/
  routes/
    index.tsx            landing page (logged out)
    auth.tsx             sign in
    capture.tsx          where every capture lands
    demo.tsx             read-only demo thread
    _authenticated/
      write.tsx          the writing box
      read.tsx           the timeline
      item.$id.tsx       one entry, full screen
  components/
    MarkedBody.tsx       renders text with marks and comments
    BookmarkletLink.tsx  the install button, reused everywhere
  lib/
    marks.ts             offset mapping
    synthesize.functions.ts   the AI pass
    bookmarklet.ts       the capture script
```

## Run it locally

```sh
npm i
npm run dev
```

`.env` holds only the publishable backend keys — nothing private.

## Where it's going

Native apps for mobile and desktop. Export. Support for local folders.

## Demo data

The demo thread is prepared sample data, not a real person's mind — 19 fictional entries, 27 marks, and one synthesis the app actually produced.
