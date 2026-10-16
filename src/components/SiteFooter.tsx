import { useEffect, useRef, useState, type RefObject } from "react";
import { FOOTER_LINES } from "@/lib/shots";

const SUPPORT = "support@ariadne-thread.app";

type Dialog = "privacy" | "how";

export function SiteFooter() {
  const [open, setOpen] = useState<Dialog | null>(null);
  const howRef = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Which link opened the pop-up, so focus can go back to it on close.
  const trigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    const back = trigger.current;
    setOpen(null);
    requestAnimationFrame(() => back?.focus());
  };

  const show = (which: Dialog, from: RefObject<HTMLButtonElement | null>) => {
    trigger.current = from.current;
    setOpen(which);
  };

  return (
    <>
      <footer className="landFoot">
        <div className="landFootRow">
          <span>Built at the SheBuilds Buildathon, October 2026</span>
          <span className="landFootLinks">
            <button
              ref={howRef}
              type="button"
              className="landFootLink"
              onClick={() => show("how", howRef)}
            >
              How it works
            </button>
            <button
              ref={linkRef}
              type="button"
              className="landFootLink"
              onClick={() => show("privacy", linkRef)}
            >
              Privacy
            </button>
            <a className="landFootLink" href={`mailto:${SUPPORT}`}>
              Support
            </a>
          </span>
        </div>
        <p className="landCredit">
          Sample article:{" "}
          <a href="https://substack.com/home/post/p-169790855" target="_blank" rel="noreferrer">
            “What If Anxiety Is a Habit, Not a Disorder?”
          </a>{" "}
          by Judson Brewer, MD, PhD. All rights reserved.
        </p>
      </footer>
      {open && (
        <div className="privBackdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div
            className="privCard"
            role="dialog"
            aria-modal="true"
            aria-labelledby={open === "how" ? "howTitle" : "privTitle"}
          >
            <div className="privHead">
              <h2 id={open === "how" ? "howTitle" : "privTitle"}>
                {open === "how" ? "How it works" : "Privacy"}
              </h2>
              <button
                ref={closeRef}
                type="button"
                className="privClose"
                aria-label="Close"
                onClick={close}
              >
                ×
              </button>
            </div>
            {open === "how" ? (
              <div className="privSteps">
                {FOOTER_LINES.map((l) => (
                  <p className="privStep" key={l.name}>
                    <span className="privStepName">{l.name}</span>
                    <span className="privStepLine">{l.line}</span>
                  </p>
                ))}
              </div>
            ) : (
              <>
                <p>
                  Your board is yours. Nothing you write or save is shared with or visible to anyone
                  else.
                </p>
                <p>
                  When you press Synthesize, your notes and clips are sent to an AI service to find
                  patterns in them. It is used to produce your synthesis and nothing else — not to
                  train models, not to build a profile of you.
                </p>
                <p>
                  Your items and marks are stored so the board works. There are no ads and your data
                  is not sold.
                </p>
                <p>
                  Want it gone? Email <a href={`mailto:${SUPPORT}`}>{SUPPORT}</a> and your account
                  and everything in it will be deleted.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
