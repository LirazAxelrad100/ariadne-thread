import { useEffect, useRef, useState } from "react";
import { ThreadIcon } from "@/components/Logo";
import { bookmarkletHref } from "@/lib/bookmarklet";

/** Draggable "Capture to Ariadne" button. React blocks javascript: hrefs, so
 * the bookmarklet code is set on the element directly after mount. */
export function BookmarkletLink() {
  const ref = useRef<HTMLAnchorElement>(null);
  const [clicked, setClicked] = useState(false);
  useEffect(() => {
    ref.current?.setAttribute("href", bookmarkletHref(window.location.origin));
  }, []);
  return (
    <div className="bmInstall">
      <a ref={ref} className="btn bmButton" onClick={(e) => { e.preventDefault(); setClicked(true); }} draggable title="Drag me to your bookmarks bar">
        <ThreadIcon size={16} muted />
        Capture to Ariadne
      </a>
      <div className="bmHint">Desktop browsers only.</div>
      {clicked && <div className="bmClickNote" role="status">Drag it to your bookmarks bar instead.</div>}
    </div>
  );
}
