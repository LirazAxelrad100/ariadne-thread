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

// The five short lines shown in the footer's "How it works" pop-up.
// Footer copy lives here — edit it without touching the carousel above.
export const FOOTER_LINES: { name: string; line: string }[] = STEPS.map((s) => ({
  name: s.name,
  line: s.copy,
}));

// How long each step holds before the carousel moves on. Synthesize gets
// longer so the finding can actually be read.
export const DURATIONS = [7000, 6500, 7500, 6000, 10000];
