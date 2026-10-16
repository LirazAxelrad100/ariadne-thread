import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { hhmm } from "@/lib/notes";
import { hostOf, itemsQuery, wordCount, type Item } from "@/lib/items";
import type { Annot } from "@/lib/marks";
import { MarkedBody, type MarkActions } from "@/components/MarkedBody";

const SHORT_CAPTURE = 120;

/** One timeline entry, as in the Read design. `full` = item view (no cut). */
export function Entry({
  item, full = false, onOpen, annots = [], actions, editable = false, onEdit,
}: {
  item: Item;
  full?: boolean;
  onOpen?: () => void;
  annots?: Annot[];
  actions?: MarkActions;
  editable?: boolean;
  onEdit?: (body: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isCapture = item.type === "capture";
  const words = wordCount(item.body);
  const cut = isCapture && !full && !expanded && words > SHORT_CAPTURE;
  const synthCount = (item.synthesis as { count?: number } | null)?.count;
  const navigate = useNavigate();
  const { data: all } = useQuery({ ...itemsQuery(), enabled: item.is_synthesis });
  const known = useMemo(() => (all ? new Set(all.map((i) => i.id)) : undefined), [all]);
  // "From" source links open that item.
  const onSource = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a[data-item]") as HTMLElement | null;
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
    navigate({ to: "/item/$id", params: { id: a.dataset["item"]! } });
  };

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
      <div style={isCapture ? { marginTop: 10 } : undefined} onClickCapture={item.is_synthesis ? onSource : undefined}>
        <MarkedBody
          body={item.body}
          annots={annots}
          className={`body${cut ? " clamp4" : ""}${item.is_synthesis ? " synth" : ""}`}
          editable={editable && annots.length === 0 && !item.is_synthesis}
          synth={item.is_synthesis}
          known={known}
          actions={actions}
          onEdit={onEdit}
        />
      </div>

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
