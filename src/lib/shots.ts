// The five "How it works" steps and the screenshot shown for each.
// Each screenshot is a real screen of the running app, stored as a CDN asset.
import shotWrite from "@/assets/01_write_demo.png.asset.json";
import shotCapture from "@/assets/02_capture_demo.png.asset.json";
import shotMark from "@/assets/04_mark.png.asset.json";
import shotRead from "@/assets/03_read.png.asset.json";
import shotSynth from "@/assets/05_synthesis.png.asset.json";

export type Step = {
  n: string;
  name: string;
  copy: string;
  shot: string;
  alt: string;
};

export const STEPS: Step[] = [
  {
    n: "01",
    name: "Write",
    copy: "Whatever’s on your mind, jot it down.",
    shot: shotWrite.url,
    alt: "The writing box with a note being typed.",
  },
  {
    n: "02",
    name: "Capture",
    copy: "Read something that inspires you? Capture it in one click.",
    shot: shotCapture.url,
    alt: "A captured passage arriving in the writing box, with its title, writer and link filled in.",
  },
  {
    n: "03",
    name: "Mark",
    copy: "Mark the parts that move you. Add a note.",
    shot: shotMark.url,
    alt: "A captured passage with a mark and its note.",
  },
  {
    n: "04",
    name: "Read",
    copy: "Everything on your mind, in one stream.",
    shot: shotRead.url,
    alt: "The Read timeline with notes and captures.",
  },
  {
    n: "05",
    name: "Synthesize",
    copy: "Find the threads: patterns, open questions, thoughts you didn’t know you were having.",
    shot: shotSynth.url,
    alt: "One finding from a synthesis, with its sources.",
  },
];

// The lines shown in the footer's "How it works" pop-up.
// Footer copy lives here — edit it without touching the carousel above.
export const FOOTER_LINES: { name: string; line: string }[] = [
  {
    name: "01 · Write & Speak",
    line: "Jot down a thought as it comes. Prefer speaking? Tap Speak below the box—your words transcribe directly into text as you talk. No audio files are kept.",
  },
  {
    name: "02 · Capture & the Bookmarklet",
    line: "Drag the Capture to Ariadne button to your browser’s bookmarks bar. When an article inspires you, select a passage and click the bookmarklet. The text lands in your Write view with the author and source filled in. You can then mark sections and add comments.",
  },
  {
    name: "03 · Mark & Comment",
    line: "Highlight any phrase in a note or capture to mark it. Add a comment underneath to save your own reflection while it’s fresh.",
  },
  {
    name: "04 · Read",
    line: "A single chronological stream of everything you have written and clipped, oldest to newest.",
  },
  {
    name: "05 · Synthesize with AI",
    line: "Once you have at least three notes, tap Synthesize. Ariadne reads across your thoughts and comments to reveal recurring themes, unexpected connections, contradictions, and open questions—always citing the exact notes they came from.",
  },
];

export const FOOTER_MOBILE_LINES: { name: string; line: string }[] = [
  {
    name: "Capture on iPhone",
    line: "Copy the article link, open Ariadne, and tap Paste a link in Write.",
  },
  {
    name: "Capture on Android",
    line: "From any browser page, tap Share and pick Ariadne’s Thread.",
  },
  {
    name: "Record",
    line: "Tap Speak underneath the writing box or captured note, talk naturally, and watch the text appear sentence by sentence.",
  },
];

// How long each step holds before the carousel moves on. Synthesize gets
// longer so the finding can actually be read.
export const DURATIONS = [7000, 6500, 7500, 6000, 10000];
