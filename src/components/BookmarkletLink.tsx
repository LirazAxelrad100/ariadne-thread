import { useEffect, useRef, useState } from "react";
import { ThreadIcon } from "@/components/Logo";
import { bookmarkletHref } from "@/lib/bookmarklet";

const PUBLIC_ORIGIN = "https://ariadne-thread.lovable.app";

/** Draggable "Capture to Ariadne" button. React blocks javascript: hrefs, so
 * the bookmarklet code is set on the element directly after mount.
 * `compact` is the smaller first-steps variant: shorter button, and the
 * "Desktop browsers only." note moves into the tooltip. */
export function BookmarkletLink({ compact = false }: { compact?: boolean } = {}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [clicked, setClicked] = useState(false);
  useEffect(() => {
    // Preview and editor addresses are temporary and private, so a bookmark
    // saved from them breaks ("404"). Always point at the live app instead.
    const here = window.location.origin;
    const origin = /^http:\/\/localhost(:\d+)?$/.test(here) ? here : PUBLIC_ORIGIN;
    ref.current?.setAttribute("href", bookmarkletHref(origin));
  }, []);
  return (
    <div className="bmInstall">
      <a
        ref={ref}
        className={compact ? "btn bmButton bmButtonCompact" : "btn bmButton"}
        onClick={(e) => { e.preventDefault(); setClicked(true); }}
        draggable
        title={compact ? "Desktop browsers only" : "Drag me to your bookmarks bar"}
      >
        <ThreadIcon size={16} muted />
        Capture to Ariadne
      </a>
      <div className="bmHint">{compact ? "Drag to your bookmarks bar" : "Desktop browsers only."}</div>
      {clicked && <div className="bmClickNote" role="status">Drag it to your bookmarks bar instead.</div>}
    </div>
  );
}
