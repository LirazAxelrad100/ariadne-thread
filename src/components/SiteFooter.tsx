import { useEffect, useRef, useState, type RefObject } from "react";
import { FOOTER_LINES, FOOTER_MOBILE_LINES } from "@/lib/shots";

export const SUPPORT = "support@ariadne-thread.app";

export type InfoDialogKind = "privacy" | "how";

/** The How it works / Privacy pop-up, shared by the landing footer and the account menu. */
export function InfoDialog({ kind, onClose }: { kind: InfoDialogKind; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const titleId = kind === "how" ? "howTitle" : "privTitle";
  return (
    <div className="privBackdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="privCard" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="privHead">
          <h2 id={titleId}>{kind === "how" ? "How it works" : "Privacy"}</h2>
          <button ref={closeRef} type="button" className="privClose" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        {kind === "how" ? (
          <div className="privSteps">
            {FOOTER_LINES.map((l) => (
              <p className="privStep" key={l.name}>
                <span className="privStepName">{l.name}</span>
                <span className="privStepLine">{l.line}</span>
              </p>
            ))}
            <h3 className="privSub">On mobile</h3>
            {FOOTER_MOBILE_LINES.map((l) => (
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
  );
}

export function SiteFooter() {
  const [open, setOpen] = useState<InfoDialogKind | null>(null);
  const howRef = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  const close = () => {
    const back = trigger.current;
    setOpen(null);
    requestAnimationFrame(() => back?.focus());
  };

  const show = (which: InfoDialogKind, from: RefObject<HTMLButtonElement | null>) => {
    trigger.current = from.current;
    setOpen(which);
  };

  return (
    <>
      <footer className="landFoot">
        <div className="landFootRow">
          <span>Built at the SheBuilds Buildathon, October 2026</span>
          <span className="landFootLinks">
            <button ref={howRef} type="button" className="landFootLink" onClick={() => show("how", howRef)}>
              How it works
            </button>
            <button ref={linkRef} type="button" className="landFootLink" onClick={() => show("privacy", linkRef)}>
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
      {open && <InfoDialog kind={open} onClose={close} />}
    </>
  );
}
