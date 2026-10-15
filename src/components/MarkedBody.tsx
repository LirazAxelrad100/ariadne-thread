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

/** Enter at the end of a line that has comments under it starts a new line below the comments. */
function enterBelowComment(e: React.KeyboardEvent, root: HTMLElement): boolean {
  if (e.key !== "Enter" || e.shiftKey) return false;
  const sel = window.getSelection();
  if (!sel || !sel.isCollapsed || !sel.rangeCount) return false;
  const r = sel.getRangeAt(0);
  let block: Node | null = r.startContainer;
  while (block && block.parentNode !== root) block = block.parentNode;
  if (!block || (block instanceof Element && /^(UL|OL)$/.test(block.tagName))) return false;
  // Find the first comment line after the caret's line (loose text at the root counts as one line).
  let annot: Node | null = block.nextSibling;
  while (annot && !(annot instanceof Element && annot.matches(".annot, .annotSlot"))) {
    if (annot instanceof Element && /^(DIV|P|UL|OL)$/.test(annot.tagName)) return false;
    annot = annot.nextSibling;
  }
  if (!annot) return false;
  const tail = document.createRange();
  tail.setStart(r.endContainer, r.endOffset);
  tail.setEndBefore(annot);
  if (tail.toString().trim()) return false;
  e.preventDefault();
  let last = annot as Element;
  while (last.nextElementSibling?.matches(".annot, .annotSlot")) last = last.nextElementSibling;
  const d = document.createElement("div");
  d.appendChild(document.createElement("br"));
  last.after(d);
  const c = document.createRange();
  c.setStart(d, 0);
  c.collapse(true);
  sel.removeAllRanges();
  sel.addRange(c);
  return true;
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
  // Marks made here since the last keystroke; Ctrl/Cmd+Z removes them newest first.
  const undoStack = useRef<string[]>([]);
  // Auto-capital after ". ", "? ", "! " — Ctrl/Cmd+Z right after puts the small letter back.
  const lastCap = useRef<{ node: Text; at: number; lower: string } | null>(null);
  const autoCap = (ev: InputEvent) => {
    if (ev.inputType !== "insertText" || !ev.data || ev.data.length !== 1) return;
    const ch = ev.data;
    if (ch === ch.toUpperCase()) return;
    const sel = window.getSelection();
    const node = sel?.anchorNode;
    if (!sel || !node || node.nodeType !== Node.TEXT_NODE) return;
    const at = sel.anchorOffset - 1;
    const t = node.textContent ?? "";
    if (at < 0 || t[at] !== ch || !/[.!?][\s\u00a0]+$/.test(t.slice(0, at))) return;
    node.textContent = t.slice(0, at) + ch.toUpperCase() + t.slice(at + 1);
    sel.collapse(node, at + 1);
    lastCap.current = { node: node as Text, at, lower: ch };
  };
  const undoCap = () => {
    const c = lastCap.current;
    lastCap.current = null;
    if (!c || !c.node.isConnected) return false;
    const t = c.node.textContent ?? "";
    if (t[c.at] !== c.lower.toUpperCase()) return false;
    c.node.textContent = t.slice(0, c.at) + c.lower + t.slice(c.at + 1);
    window.getSelection()?.collapse(c.node, c.at + 1);
    return true;
  };

  useLayoutEffect(() => {
    if (!actions) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== "z") return;
      const t = e.target as HTMLElement | null;
      if (t && t.closest("textarea, input")) return;
      if (t && t.isContentEditable && t !== ref.current && !ref.current?.contains(t)) return;
      const id = undoStack.current.pop();
      if (!id) return;
      e.preventDefault();
      e.stopPropagation();
      setPop(null);
      if (editing === id) setEditing(null);
      void actions.remove(id);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

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
    const sameText = editable && domToMd(root) === body;
    if (sameText && !annotsChanged && !editing && document.activeElement === root) return;
    if (sameText) {
      // Keep the box's own structure (lists, caret area): only redo marks and comment lines.
      root.querySelectorAll(".annot, .annotSlot").forEach((n) => n.remove());
      root.querySelectorAll("mark[data-id]").forEach((m) => m.replaceWith(...Array.from(m.childNodes)));
      root.normalize();
    } else {
      root.innerHTML = mdToHtml(body, plain && !editable);
    }
    // Loose text at the top of an editable box becomes its own line, so comment lines sit under the whole line.
    if (editable) {
      let group: HTMLDivElement | null = null;
      for (const n of Array.from(root.childNodes)) {
        const isBlock = n instanceof Element && /^(DIV|P|UL|OL)$/.test(n.tagName);
        if (isBlock) { group = null; continue; }
        if (!group) { group = document.createElement("div"); root.insertBefore(group, n); }
        group.appendChild(n);
      }
    }
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
    // Keep an editable line after a trailing comment so writing can continue below it.
    if (editable && root.lastElementChild?.matches(".annot, .annotSlot")) {
      const d = document.createElement("div");
      d.appendChild(document.createElement("br"));
      root.appendChild(d);
    }
    setSlot(newSlot);
  }, [body, annotsKey, editable, plain, editing, writer]);

  function place(rect: DOMRect) {
    const w = wrapRef.current!.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - w.left;
    return { x: Math.min(Math.max(x, 90), w.width - 90), y: rect.top - w.top - 10 };
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
    if (id) undoStack.current.push(id);
    if (id && editable) ref.current?.focus({ preventScroll: true });
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
        onInput={editable ? (e) => { undoStack.current = []; lastCap.current = null; if (ref.current) { autoCap(e.nativeEvent as InputEvent); listOnInput(ref.current); onEdit?.(domToMd(ref.current)); } } : undefined}
        onKeyDown={editable ? (e) => {
          if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z" && undoCap()) { e.preventDefault(); if (ref.current) onEdit?.(domToMd(ref.current)); return; }
          if (e.key.length === 1 || e.key === "Backspace" || e.key === "Enter") lastCap.current = null;
          if (ref.current && !enterBelowComment(e, ref.current)) listOnKeyDown(e, ref.current);
        } : undefined}
      />
      {pop && (
        <div
          className="selPop"
          style={{ left: pop.x, top: pop.y, transform: "translate(-50%, -100%)", whiteSpace: "nowrap" }}
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
