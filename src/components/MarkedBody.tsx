import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { domToMd, listOnInput, listOnKeyDown, mdToHtml, plainPaste } from "@/lib/listEditor";
import { segments, toBody, toRendered, writerQuery, type Annot } from "@/lib/marks";

const SKIP = ".annot, .annotSlot";

function textNodes(root: HTMLElement): Text[] {
  const out: Text[] = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => ((n.parentElement?.closest(SKIP)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  while (w.nextNode()) out.push(w.currentNode as Text);
  return out;
}

/** Offset of a DOM boundary inside the rendered text. */
function renderedPos(root: HTMLElement, node: Node, offset: number): number {
  const r = document.createRange();
  r.setStart(root, 0);
  r.setEnd(node, offset);
  let acc = 0;
  for (const t of textNodes(root)) {
    if (!r.intersectsNode(t)) continue;
    acc += t === r.endContainer ? r.endOffset : t.length;
  }
  return acc;
}

function wrap(root: HTMLElement, from: number, to: number, id: string) {
  let acc = 0;
  for (const t of textNodes(root)) {
    const a = acc;
    const z = acc + t.length;
    acc = z;
    if (z <= from || a >= to) continue;
    let node = t;
    if (from > a) node = node.splitText(from - a);
    if (to < z) node.splitText(to - Math.max(a, from));
    const m = document.createElement("mark");
    m.dataset["id"] = id;
    node.parentNode!.insertBefore(m, node);
    m.appendChild(node);
  }
}

function blockOf(el: Element, root: HTMLElement): Element {
  let b: Element = el;
  while (b.parentElement && b.parentElement !== root && !/^(P|LI|DIV)$/.test(b.tagName)) b = b.parentElement;
  return b;
}

type Pop =
  | { kind: "new"; x: number; y: number; start: number; end: number }
  | { kind: "mark"; x: number; y: number; id: string };

export type MarkActions = {
  /** Saves the edited text before a mark is placed. */
  saveBody?: (body: string) => Promise<void>;
  create: (a: { start: number; end: number; quote: string; note: string | null }) => Promise<string | null>;
  setNote: (id: string, note: string | null) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

/**
 * An item's body with its marks and comments. With `actions`, selecting text
 * opens the Mark / Comment popup; with `editable`, the text can be edited
 * (only while it has no marks).
 */
export function MarkedBody({
  body, annots, className = "body", plain = true, editable = false, actions, onEdit,
}: {
  body: string;
  annots: Annot[];
  className?: string;
  plain?: boolean;
  editable?: boolean;
  actions?: MarkActions | undefined;
  onEdit?: ((body: string) => void) | undefined;
}) {
  const { data: writer = "" } = useQuery(writerQuery());
  const ref = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pop, setPop] = useState<Pop | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  // Callers pass freshly filtered arrays each render, so compare by content.
  const annotsKey = JSON.stringify(annots.map((a) => [a.id, a.start_offset, a.end_offset, a.note]));
  const prevAnnotsKey = useRef(annotsKey);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const annotsChanged = prevAnnotsKey.current !== annotsKey;
    prevAnnotsKey.current = annotsKey;
    // While typing, the DOM already holds this text: don't reset the caret.
    // New or changed marks still re-render, or they would never show in an editable box.
    if (editable && !annotsChanged && !editing && document.activeElement === root && domToMd(root) === body) return;
    root.innerHTML = mdToHtml(body, plain && !editable);
    const segs = segments(body);
    const sorted = [...annots].sort((a, b) => a.start_offset - b.start_offset);
    for (const a of sorted) for (const [f, t] of toRendered(segs, a.start_offset, a.end_offset)) wrap(root, f, t, a.id);
    // Comment lines go directly under the paragraph holding their mark.
    const after = new Map<Element, Element>();
    let newSlot: HTMLElement | null = null;
    for (const a of sorted) {
      const isEditing = a.id === editing;
      if (!a.note && !isEditing) continue;
      const marks = root.querySelectorAll(`mark[data-id="${a.id}"]`);
      const last = marks[marks.length - 1];
      if (!last) continue;
      const block = blockOf(last, root);
      const line = document.createElement("div");
      if (isEditing) {
        line.className = "annotSlot";
        newSlot = line;
      } else {
        line.className = "annot";
        const who = document.createElement("span");
        who.className = "who";
        who.textContent = writer;
        const text = document.createElement("span");
        text.className = "text";
        text.textContent = a.note;
        line.append(who, " ", text);
      }
      line.contentEditable = "false";
      if (block === root) root.appendChild(line);
      else if (block.tagName === "LI") block.appendChild(line);
      else (after.get(block) ?? block).after(line);
      after.set(block, line);
    }
    setSlot(newSlot);
  }, [body, annotsKey, editable, plain, editing, writer]);

  function place(rect: DOMRect) {
    const w = wrapRef.current!.getBoundingClientRect();
    return { x: rect.left + rect.width / 2 - w.left, y: rect.top - w.top - 10 };
  }

  function onMouseUp(e: React.MouseEvent) {
    if (!actions || !ref.current) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      if (!ref.current.contains(range.commonAncestorContainer)) return;
      const rs = renderedPos(ref.current, range.startContainer, range.startOffset);
      const re = renderedPos(ref.current, range.endContainer, range.endOffset);
      if (re <= rs) return;
      e.stopPropagation();
      setPop({ kind: "new", ...place(range.getBoundingClientRect()), start: rs, end: re });
      return;
    }
    const m = (e.target as HTMLElement).closest("mark[data-id]") as HTMLElement | null;
    if (m) {
      e.stopPropagation();
      setPop({ kind: "mark", ...place(m.getBoundingClientRect()), id: m.dataset["id"]! });
    } else setPop(null);
  }

  async function addMark(withComment: boolean) {
    if (!pop || pop.kind !== "new" || !actions || !ref.current) return;
    const text = editable ? domToMd(ref.current) : body;
    if (editable && text !== body) await actions.saveBody?.(text);
    const segs = segments(text);
    const start = toBody(segs, pop.start, false);
    const end = toBody(segs, pop.end, true);
    setPop(null);
    window.getSelection()?.removeAllRanges();
    if (end <= start) return;
    const id = await actions.create({ start, end, quote: text.slice(start, end), note: null });
    if (id && withComment) { setDraft(""); setEditing(id); }
  }

  async function commitNote() {
    const id = editing;
    if (!id || !actions) return;
    setEditing(null);
    const note = draft.trim() || null;
    const prev = annots.find((a) => a.id === id)?.note ?? null;
    if (note !== prev) await actions.setNote(id, note);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }} onMouseUp={onMouseUp}>
      <div
        ref={ref}
        className={className}
        contentEditable={editable || undefined}
        suppressContentEditableWarning
        style={editable ? { outline: "none" } : undefined}
        onPaste={editable ? plainPaste : undefined}
        onInput={editable ? () => { if (ref.current) { listOnInput(ref.current); onEdit?.(domToMd(ref.current)); } } : undefined}
        onKeyDown={editable ? (e) => ref.current && listOnKeyDown(e, ref.current) : undefined}
      />
      {pop && (
        <div
          className="selPop"
          style={{ left: pop.x, top: pop.y, transform: "translate(-50%, -100%)" }}
          onMouseDown={(e) => e.preventDefault()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {pop.kind === "new" ? (
            <>
              <button type="button" onClick={() => addMark(false)}><span className="sw" />Mark</button>
              <span className="sep" />
              <button type="button" onClick={() => addMark(true)}>↳ Comment</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => {
                const a = annots.find((x) => x.id === pop.id);
                setDraft(a?.note ?? ""); setEditing(pop.id); setPop(null);
              }}>↳ Edit comment</button>
              <span className="sep" />
              <button type="button" onClick={() => { const id = pop.id; setPop(null); void actions?.remove(id); }}>Delete mark</button>
            </>
          )}
        </div>
      )}
      {slot && editing && createPortal(
        <textarea
          className="annotInput"
          autoFocus
          rows={2}
          value={draft}
          placeholder="Add a comment"
          aria-label="Comment"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitNote}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void commitNote(); }
            if (e.key === "Escape") { e.preventDefault(); setDraft(annots.find((a) => a.id === editing)?.note ?? ""); setEditing(null); }
          }}
        />,
        slot,
      )}
    </div>
  );
}
