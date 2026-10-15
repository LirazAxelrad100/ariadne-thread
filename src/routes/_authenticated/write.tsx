import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { fetchTodayNotes, hhmm, saveNote, type NoteRow } from "@/lib/notes";
import { annotationsQuery } from "@/lib/marks";
import { MarkedBody, type MarkActions } from "@/components/MarkedBody";
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
type Draft = { id: string | null; body: string; startedAt: string };

function WriteView() {
  const qc = useQueryClient();
  const { data: notes = [] } = useQuery({ queryKey: ["notes", "today"], queryFn: fetchTodayNotes });
  const { data: allAnnots = [] } = useQuery(annotationsQuery());

  const draft = useRef<Draft>({ id: null, body: "", startedAt: new Date().toISOString() });
  const saving = useRef<Promise<void>>(Promise.resolve());
  const saveTimer = useRef<number | undefined>(undefined);
  const idleLeft = useRef(IDLE_MS);
  const lastTick = useRef(Date.now());
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [liveTime, setLiveTime] = useState(() => new Date());
  const [boxBody, setBoxBody] = useState("");
  const [boxId, setBoxId] = useState<string | null>(null);

  const persistLocal = () => localStorage.setItem(DRAFT_KEY, JSON.stringify(draft.current));

  const flush = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    const snapshot = { ...draft.current };
    saving.current = saving.current.then(async () => {
      try {
        const id = await saveNote(draft.current.id ?? snapshot.id, snapshot.body, snapshot.startedAt);
        if (draft.current.startedAt === snapshot.startedAt) {
          draft.current.id = id;
          setBoxId(id);
          persistLocal();
        }
        if (id) setSavedAt(hhmm(new Date()));
      } catch {
        /* stays in localStorage; next save retries */
      }
    });
    return saving.current;
  }, []);

  const close = useCallback(async () => {
    await flush();
    draft.current = { id: null, body: "", startedAt: new Date().toISOString() };
    localStorage.removeItem(DRAFT_KEY);
    setBoxBody("");
    setBoxId(null);
    idleLeft.current = IDLE_MS;
    setSavedAt(null);
    setLiveTime(new Date());
    qc.invalidateQueries({ queryKey: ["notes"] });
  }, [flush, qc]);

  // Restore an unsynced draft, then focus.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Draft;
        if (d.body.trim()) {
          draft.current = d;
          setBoxBody(d.body);
          setBoxId(d.id);
          setLiveTime(new Date(d.startedAt));
          flush();
        }
      }
    } catch { /* ignore */ }
  }, [flush]);

  // 60s idle timer: runs only while there is text, pauses while the tab is hidden.
  useEffect(() => {
    const t = window.setInterval(() => {
      const now = Date.now();
      const dt = now - lastTick.current;
      lastTick.current = now;
      if (document.hidden || !draft.current.body.trim()) return;
      idleLeft.current -= dt;
      if (idleLeft.current <= 0) close();
    }, 1000);
    return () => window.clearInterval(t);
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
      draft.current.body = body;
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
          {notes.length > 0 && (
            <div className="thread">
              {notes.filter((n) => n.id !== draft.current.id).map((n) => <TodayNote key={n.id} note={n} />)}
            </div>
          )}
        </div>
      </main>
      <div className="composerWrap">
        <div className="composerRail">
          <span className="liveDot" />
          <span className="liveTime">{hhmm(liveTime)}</span>
          <div
            onKeyDown={(e) => {
              if (e.key === "Escape" && !(e.target as HTMLElement).closest(".annotInput")) {
                e.preventDefault();
                void close();
              }
            }}
          >
            <MarkedBody
              body={boxBody}
              annots={boxAnnots}
              className="composer"
              editable
              actions={actions}
              onEdit={onEdit}
            />
          </div>
          <p className="status">
            {savedAt ? <>Saved <span className="mono">{savedAt}</span></> : "Saves as you type"}
            <span className="escHint"> · Esc to close the note</span>
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
