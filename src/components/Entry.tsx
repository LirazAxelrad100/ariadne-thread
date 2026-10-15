import { useState } from "react";
import { mdToHtml } from "@/lib/listEditor";
import { hhmm } from "@/lib/notes";
import { hostOf, wordCount, type Item } from "@/lib/items";

const SHORT_CAPTURE = 120;

/** One timeline entry, as in the Read design. `full` = item view (no cut). */
export function Entry({ item, full = false, onOpen }: { item: Item; full?: boolean; onOpen?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const isCapture = item.type === "capture";
  const words = wordCount(item.body);
  const cut = isCapture && !full && !expanded && words > SHORT_CAPTURE;
  const synthCount = (item.synthesis as { count?: number } | null)?.count;

  return (
    <article className={`entry${item.is_synthesis ? " synthesis" : ""}`} onClick={onOpen}>
      <span className="dot" />
      <span className="time">{hhmm(item.item_date)}</span>
      {item.is_synthesis && (
        <div className="byline">AI{synthCount ? ` · Synthesis of ${synthCount} items` : " · Synthesis"}</div>
      )}
      {isCapture && (
        <>
          {item.title && <div className="capTitle">{item.title}</div>}
          <div className="capMeta">
            {item.author_me ? "You" : item.writer}
            {(item.author_me || item.writer) && item.source_url ? " · " : ""}
            {item.source_url && (
              <a href={item.source_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                {item.source_label || hostOf(item.source_url)}
              </a>
            )}
          </div>
        </>
      )}
      <div
        className={`body${cut ? " clamp4" : ""}`}
        style={isCapture ? { marginTop: 10 } : undefined}
        dangerouslySetInnerHTML={{ __html: mdToHtml(item.body, true) }}
      />
      {isCapture && item.why && (
        <div className="caught"><span className="who">What caught me</span> <span className="text">{item.why}</span></div>
      )}
      {isCapture && !full && words > SHORT_CAPTURE && (
        <div className="moreRow">
          <button type="button" className="moreBtn" onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}>
            {expanded ? "Collapse" : "Expand"}
          </button>
          <span className="mono">{words.toLocaleString("en-US")} words</span>
        </div>
      )}
    </article>
  );
}
