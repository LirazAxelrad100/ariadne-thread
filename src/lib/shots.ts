// The five "How it works" steps and the screenshot shown for each.
// Screenshot files are added by src/lib/shots.ts once they are captured.
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
    shot: "",
    alt: "The writing box with a note being typed.",
  },
  {
    n: "02",
    name: "Capture",
    copy: "Read something that inspires you? Capture it in one click.",
    shot: "",
    alt: "An article with a passage selected, captured into Ariadne’s Thread.",
  },
  {
    n: "03",
    name: "Mark",
    copy: "Mark the parts that move you. Add a note.",
    shot: "",
    alt: "A captured passage with a mark and its note.",
  },
  {
    n: "04",
    name: "Read",
    copy: "Everything on your mind, in one stream.",
    shot: "",
    alt: "The Read timeline with notes and captures.",
  },
  {
    n: "05",
    name: "Synthesize",
    copy: "Find the threads: patterns, open questions, thoughts you didn’t know you were having.",
    shot: "",
    alt: "One finding from a synthesis, with its sources.",
  },
];

// How long each step holds before the carousel moves on. Synthesize gets
// longer so the finding can actually be read.
export const DURATIONS = [5000, 5000, 5000, 5000, 8000];
