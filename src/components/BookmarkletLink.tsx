import { useEffect, useRef, useState } from "react";
import { ThreadIcon } from "@/components/Logo";
import { bookmarkletHref } from "@/lib/bookmarklet";

const PUBLIC_ORIGIN = "https://ariadne-thread.lovable.app";

/** Draggable "Capture to Ariadne" button. React blocks javascript: hrefs, so
 * the bookmarklet code is set on the element directly after mount.
 * `compact` is the smaller first-steps variant: shorter button. `inline` is the
 * smallest, landing-carousel variant: button and hint on one line. */
export function BookmarkletLink({ compact = false, inline = false }: { compact?: boolean; inline?: boolean } = {}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [clicked, setClicked] = useState(false);
  useEffect(() => {
    // Preview and editor addresses are temporary and private, so a bookmark
    // saved from them breaks ("404"). Always point at the live app instead.
    const here = window.location.origin;
    const origin = /^http:\/\/localhost(:\d+)?$/.test(here) ? here : PUBLIC_ORIGIN;
    ref.current?.setAttribute("href", bookmarkletHref(origin));
  }, []);
  const cls = inline ? "btn bmButton bmButtonInline" : compact ? "btn bmButton bmButtonCompact" : "btn bmButton";
  return (
    <div className={inline ? "bmInstall bmInstallInline" : "bmInstall"}>
      <a
        ref={ref}
        className={cls}
        onClick={(e) => { e.preventDefault(); setClicked(true); }}
        draggable
        title="Drag me to your bookmarks bar"
      >
        <ThreadIcon size={inline ? 14 : 16} muted />
        Capture to Ariadne
      </a>
      <div className="bmHint">
        {inline ? "drag to your bookmarks bar" : "Drag it to your bookmarks bar."}
      </div>
      {clicked && <div className="bmClickNote" role="status">Drag the button instead of clicking it.</div>}
    </div>
  );
}
