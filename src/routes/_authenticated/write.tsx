import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from "react";
import { fetchTodayNotes, hhmm, INCOMING_KEY, saveNote, type CaptureMeta, type Incoming, type NoteRow } from "@/lib/notes";
import { annotationsQuery } from "@/lib/marks";
import { itemsQuery } from "@/lib/items";
import { MarkedBody, type MarkActions } from "@/components/MarkedBody";
import { Entry } from "@/components/Entry";
import { BookmarkletLink } from "@/components/BookmarkletLink";
import { domToMd, listOnInput, listOnKeyDown, mdToHtml, plainPaste } from "@/lib/listEditor";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/write")({
  head: () => ({
    meta: [
      { title: "Write · Ariadne’s Thread" },
      { name: "description", content: "Write whatever is on your mind." },
      { property: "og:title", content: "Write · Ariadne’s Thread" },
      { property: "og:description", content: "Write whatever is on your mind." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WriteView,
});

const IDLE_MS = 60_000;
const DRAFT_KEY = "ariadne:draft";
type Draft = { id: string | null; body: string; startedAt: string; cap?: CaptureMeta | null };
const EMPTY_CAP: CaptureMeta = { title: "", source_url: "", writer: "", author_me: false, why: "" };

function WriteView() {
  const qc = useQueryClient();
  const { data: notes = [] } = useQuery({ queryKey: ["notes", "today"], queryFn: fetchTodayNotes });
  const { data: allAnnots = [] } = useQuery(annotationsQuery());
  const { data: allItems = [] } = useQuery(itemsQuery());

  const draft = useRef<Draft>({ id: null, body: "", startedAt: new Date().toISOString() });
  const saving = useRef<Promise<string | null>>(Promise.resolve(null));
  const saveTimer = useRef<number | undefined>(undefined);
  const idleLeft = useRef(IDLE_MS);
  const lastTick = useRef(Date.now());
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [liveTime, setLiveTime] = useState(() => new Date());
  const [boxBody, setBoxBody] = useState("");
  const [boxId, setBoxId] = useState<string | null>(null);
  const [cap, setCapState] = useState<CaptureMeta | null>(null);

  const persistLocal = () => localStorage.setItem(DRAFT_KEY, JSON.stringify(draft.current));

  const flush = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    const snapshot = { ...draft.current };
    saving.current = saving.current.then(async () => {
      try {
        const id = await saveNote(draft.current.id ?? snapshot.id, snapshot.body, snapshot.startedAt, snapshot.cap ?? null);
        if (draft.current.startedAt === snapshot.startedAt) {
          draft.current.id = id;
          setBoxId(id);
          persistLocal();
        }
        if (id) setSavedAt(hhmm(new Date()));
        return id;
      } catch {
        persistLocal(); /* keep the draft safe; next save retries */
        return null;
      }
    });
    return saving.current;
  }, []);

  const close = useCallback(async () => {
    const started = draft.current.startedAt;
    const savedId = await flush();
    // Something new landed in the box while saving (e.g. a capture): keep it.
    if (draft.current.startedAt !== started) return;
    // Save failed: keep the text in the box and in localStorage, never lose it.
    if (draft.current.body.trim() && !savedId) {
      persistLocal();
      return;
    }
    draft.current = { id: null, body: "", startedAt: new Date().toISOString() };
    localStorage.removeItem(DRAFT_KEY);
    setBoxBody("");
    setBoxId(null);
    setCapState(null);
    idleLeft.current = IDLE_MS;
    setSavedAt(null);
    setLiveTime(new Date());
    qc.invalidateQueries({ queryKey: ["notes"] });
  }, [flush, qc]);

  // Restore an unsynced draft, then land any capture sent by the bookmarklet.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Draft;
        if (d.body.trim()) {
          draft.current = d;
          setBoxBody(d.body);
          setBoxId(d.id);
          setCapState(d.cap ?? null);
          setLiveTime(new Date(d.startedAt));
          flush();
        }
      }
    } catch { /* ignore */ }
    // Deferred so a dev-mode remount can't close the capture right after it lands.
    const t = window.setTimeout(() => void (async () => {
      const inc = localStorage.getItem(INCOMING_KEY);
      if (!inc) return;
      try {
        const c = JSON.parse(inc) as Incoming;
        if (draft.current.body.trim()) await close();
        const meta: CaptureMeta = { ...EMPTY_CAP, title: c.title || "", source_url: c.url || "", writer: c.writer || "" };
        draft.current = { id: null, body: (c.text || "").trim(), startedAt: new Date().toISOString(), cap: meta };
        localStorage.removeItem(INCOMING_KEY);
        persistLocal();
        setBoxBody(draft.current.body);
        setCapState(meta);
        setLiveTime(new Date());
        if (draft.current.body) await flush();
      } catch { localStorage.removeItem(INCOMING_KEY); }
    })(), 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flush]);

  function setCap(next: CaptureMeta) {
    draft.current.cap = next;
    setCapState(next);
    idleLeft.current = IDLE_MS;
    persistLocal();
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(flush, 1000);
  }

  // 60s idle timer: runs while there is text, also while the tab is in the background.
  useEffect(() => {
    const t = window.setInterval(() => {
      const now = Date.now();
      const dt = now - lastTick.current;
      lastTick.current = now;
      if (!draft.current.body.trim()) return;
      idleLeft.current -= dt;
      if (idleLeft.current <= 0) close();
    }, 1000);
    return () => window.clearInterval(t);
  }, [close]);

  // Esc closes the note from anywhere on the page (the box, the capture fields, or nowhere in particular).
  // A comment being written handles its own Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if ((e.target as HTMLElement | null)?.closest?.(".annotInput")) return;
      e.preventDefault();
      (document.activeElement as HTMLElement | null)?.blur?.();
      void close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // Leaving Write closes the note.
  useEffect(() => () => { void close(); }, [close]);

  // Keep the newest past note visible just above the writing box: stick to the bottom
  // when notes change or the box grows, unless an earlier note is being edited.
  const streamRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = streamRef.current;
    if (!el) return;
    const toBottom = () => { if (!el.contains(document.activeElement)) el.scrollTop = el.scrollHeight; };
    toBottom();
    const ro = new ResizeObserver(toBottom);
    ro.observe(el);
    const inner = el.firstElementChild;
    if (inner) ro.observe(inner);
    return () => ro.disconnect();
  }, [notes.length]);

  function onEdit(body: string) {
    if (!draft.current.body.trim() && body.trim() && !draft.current.id) {
      draft.current.startedAt = new Date().toISOString();
      setLiveTime(new Date());
    }
    draft.current.body = body;
    setBoxBody(body);
    idleLeft.current = IDLE_MS;
    persistLocal();
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(flush, 1000);
  }

  const refreshMarks = () => qc.invalidateQueries({ queryKey: ["annotations"] });

  const actions: MarkActions = {
    saveBody: async (body) => {
      // Keep the box's text in step with the text the mark's offsets are counted in.
      draft.current.body = body;
      setBoxBody(body);
      persistLocal();
      await flush();
    },
    create: async ({ start, end, quote, note }) => {
      await flush();
      const id = draft.current.id;
      if (!id) return null;
      const { data, error } = await supabase
        .from("annotations")
        .insert({ item_id: id, start_offset: start, end_offset: end, quote, note })
        .select("id")
        .single();
      await refreshMarks();
      return error ? null : data.id;
    },
    setNote: async (aid, note) => {
      await supabase.from("annotations").update({ note }).eq("id", aid);
      await refreshMarks();
    },
    remove: async (aid) => {
      await supabase.from("annotations").delete().eq("id", aid);
      await refreshMarks();
    },
  };

  const boxAnnots = allAnnots.filter((a) => a.item_id === boxId);

  return (
    <>
      <main className="stream" ref={streamRef}>
        <div className="inner">
          {allItems.length === 0 && !boxBody && (
            <div className="firstSteps">
              <p className="fsTitle">First steps</p>
              <ol className="fsList">
                <li>Write your thoughts in the text field below — it saves as you type.</li>
                <li>
                  Capture text from any page with the bookmarklet — drag it to your bookmarks bar.
                  <BookmarkletLink />
                </li>
                <li>Select text in any note to mark it or add a related thought.</li>
              </ol>
            </div>
          )}
          {notes.length > 0 && (
            <div className="thread">
              {notes.filter((n) => n.id !== draft.current.id).map((n) =>
                n.type === "capture"
                  ? <Entry key={n.id} item={n} annots={allAnnots.filter((a) => a.item_id === n.id)} />
                  : <TodayNote key={n.id} note={n} />)}
            </div>
          )}
        </div>
      </main>
      <div className="composerWrap">
        <div className="composerRail">
          <span className="liveDot" />
          <span className="liveTime">{hhmm(liveTime)}</span>
          <div
            onPointerDown={() => { idleLeft.current = IDLE_MS; }}
            onInput={() => { idleLeft.current = IDLE_MS; }}
            onKeyDown={() => { idleLeft.current = IDLE_MS; }}
          >
            <MarkedBody
              body={boxBody}
              annots={boxAnnots}
              className="composer"
              editable
              actions={actions}
              onEdit={onEdit}
              placeholder="What's an idea you couldn't stop thinking about today?"
            />
          </div>
          {cap && <CaptureFields cap={cap} onChange={setCap} />}
          <p className="status">
            {savedAt ? <>Saved <span className="mono">{savedAt}</span></> : "Saves as you type"}
            <span className="escHint"> · Esc to close the {cap ? "capture" : "note"}</span>
            {!cap && (
              <> · <button type="button" className="capToggle" onClick={() => setCap({ ...EMPTY_CAP })}>Pasting something you read? Add its source</button></>
            )}
          </p>
        </div>
      </div>
    </>
  );
}

function TodayNote({ note }: { note: NoteRow }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const { data: all = [] } = useQuery(annotationsQuery());
  const annots = all.filter((a) => a.item_id === note.id);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.innerHTML = mdToHtml(note.body);
      ref.current.focus();
    }
  }, [editing, note.body]);

  async function onBlur() {
    const body = ref.current ? domToMd(ref.current) : "";
    setEditing(false);
    if (body !== note.body) {
      await saveNote(note.id, body, note.item_date);
      qc.invalidateQueries({ queryKey: ["notes"] });
    }
  }

  return (
    <article className="entry" onClick={() => { if (!annots.length) setEditing(true); }}>
      <span className="dot" />
      <span className="time">{hhmm(note.item_date)}</span>
      {editing ? (
        <div ref={ref} className="body" contentEditable suppressContentEditableWarning
          style={{ outline: "none" }} onBlur={onBlur} onPaste={plainPaste}
          onInput={() => ref.current && listOnInput(ref.current)}
          onKeyDown={(e) => {
            if (e.key === "Escape") (e.currentTarget as HTMLElement).blur();
            else if (ref.current) listOnKeyDown(e, ref.current);
          }} />
      ) : (
        <MarkedBody body={note.body} annots={annots} />
      )}
    </article>
  );
}

function CaptureFields({ cap, onChange }: { cap: CaptureMeta; onChange: (c: CaptureMeta) => void }) {
  const set = (k: keyof CaptureMeta) => (e: ChangeEvent<HTMLInputElement>) =>
    onChange({ ...cap, [k]: k === "author_me" ? e.target.checked : e.target.value });
  return (
    <div className="capFields">
      <input className="capField capFieldTitle" placeholder="Title" value={cap.title} onChange={set("title")} aria-label="Title" />
      <div className="capRow">
        <input className="capField" placeholder="Writer" value={cap.writer} onChange={set("writer")} aria-label="Writer" disabled={cap.author_me} />
        <input className="capField" placeholder="Source link" value={cap.source_url} onChange={set("source_url")} aria-label="Source link" inputMode="url" />
        <label className="capMine"><input type="checkbox" checked={cap.author_me} onChange={set("author_me")} /> I wrote this</label>
      </div>
      <input className="capField capWhy" placeholder="What caught you? (optional)" value={cap.why} onChange={set("why")} aria-label="What caught you?" />
    </div>
  );
}
