import { useEffect, useRef, useState } from "react";

const SUPPORT = "support@ariadne-thread.app";

export function SiteFooter() {
  const [open, setOpen] = useState(false);
  const linkRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => linkRef.current?.focus());
  };

  useEffect(() => {
    if (!open) linkRef.current && document.activeElement === document.body && linkRef.current.focus();
  }, [open]);

  return (
    <>
      <footer className="landFoot">
        <span>Built at the SheBuilds Buildathon, October 2026</span>
        <span className="landFootLinks">
          <button ref={linkRef} type="button" className="landFootLink" onClick={() => setOpen(true)}>
            Privacy
          </button>
          <a className="landFootLink" href={`mailto:${SUPPORT}`}>
            Support
          </a>
        </span>
      </footer>
      {open && (
        <div className="privBackdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div className="privCard" role="dialog" aria-modal="true" aria-labelledby="privTitle">
            <div className="privHead">
              <h2 id="privTitle">Privacy</h2>
              <button ref={closeRef} type="button" className="privClose" aria-label="Close" onClick={close}>
                ×
              </button>
            </div>
            <p>Your board is yours. Nothing you write or save is shared with or visible to anyone else.</p>
            <p>
              When you press Synthesize, your notes and clips are sent to an AI service to find patterns in them. It is
              used to produce your synthesis and nothing else — not to train models, not to build a profile of you.
            </p>
            <p>Your items and marks are stored so the board works. There are no ads and your data is not sold.</p>
            <p>
              Want it gone? Email <a href={`mailto:${SUPPORT}`}>{SUPPORT}</a> and your account and everything in it will
              be deleted.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
