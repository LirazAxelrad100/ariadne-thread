import { useEffect, useRef } from "react";
import { ThreadIcon } from "@/components/Logo";
import { bookmarkletHref } from "@/lib/bookmarklet";

/** Draggable "Capture to Ariadne" button. React blocks javascript: hrefs, so
 * the bookmarklet code is set on the element directly after mount. */
export function BookmarkletLink() {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    ref.current?.setAttribute("href", bookmarkletHref(window.location.origin));
  }, []);
  return (
    <a ref={ref} className="btn" onClick={(e) => e.preventDefault()} draggable title="Drag me to your bookmarks bar">
      <ThreadIcon />
      Capture to Ariadne
    </a>
  );
}
