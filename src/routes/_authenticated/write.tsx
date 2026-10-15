import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTodayNotes, hhmm, saveNote, toBlocks, type NoteRow } from "@/lib/notes";

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

  const boxRef = useRef<HTMLDivElement>(null);
  const draft = useRef<Draft>({ id: null, body: "", startedAt: new Date().toISOString() });
  const saving = useRef<Promise<void>>(Promise.resolve());
  const saveTimer = useRef<number | undefined>(undefined);
  const idleLeft = useRef(IDLE_MS);
  const lastTick = useRef(Date.now());
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [liveTime, setLiveTime] = useState(() => new Date());

  const persistLocal = () => localStorage.setItem(DRAFT_KEY, JSON.stringify(draft.current));

  const flush = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    const snapshot = { ...draft.current };
    saving.current = saving.current.then(async () => {
      try {
        const id = await saveNote(draft.current.id ?? snapshot.id, snapshot.body, snapshot.startedAt);
        if (draft.current.startedAt === snapshot.startedAt) {
          draft.current.id = id;
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
    if (boxRef.current) boxRef.current.innerText = "";
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
          if (boxRef.current) boxRef.current.innerText = d.body;
          setLiveTime(new Date(d.startedAt));
          flush();
        }
      }
    } catch { /* ignore */ }
    boxRef.current?.focus();
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

  function onInput() {
    const body = boxRef.current?.innerText.replace(/\n$/, "") ?? "";
    if (!draft.current.body.trim() && body.trim() && !draft.current.id) {
      draft.current.startedAt = new Date().toISOString();
      setLiveTime(new Date());
    }
    draft.current.body = body;
    idleLeft.current = IDLE_MS;
    persistLocal();
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(flush, 1000);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      void close();
      return;
    }
    continueBullet(e);
  }

  return (
    <>
      <main className="stream">
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
            ref={boxRef}
            className="composer"
            contentEditable="plaintext-only"
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Write"
            onInput={onInput}
            onKeyDown={onKeyDown}
          />
          <p className="status">
            {savedAt ? <>Saved <span className="mono">{savedAt}</span></> : "Saves as you type"}
            <span className="escHint"> · Esc to close the note</span>
          </p>
        </div>
      </div>
    </>
  );
}

// Enter after a "- " line continues the bullet on the next line.
function continueBullet(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== "Enter" || e.shiftKey) return;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const pre = range.cloneRange();
  pre.selectNodeContents(e.currentTarget);
  pre.setEnd(range.startContainer, range.startOffset);
  const before = pre.toString();
  const line = before.slice(before.lastIndexOf("\n") + 1);
  if (!line.startsWith("- ")) return;
  e.preventDefault();
  document.execCommand("insertText", false, "\n- ");
}

function TodayNote({ note }: { note: NoteRow }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.innerText = note.body;
      ref.current.focus();
    }
  }, [editing, note.body]);

  async function onBlur() {
    const body = ref.current?.innerText.replace(/\n$/, "") ?? "";
    setEditing(false);
    if (body !== note.body) {
      await saveNote(note.id, body, note.item_date);
      qc.invalidateQueries({ queryKey: ["notes"] });
    }
  }

  return (
    <article className="entry" onClick={() => setEditing(true)}>
      <span className="dot" />
      <span className="time">{hhmm(note.item_date)}</span>
      {editing ? (
        <div ref={ref} className="body" contentEditable="plaintext-only" suppressContentEditableWarning
          style={{ outline: "none", whiteSpace: "pre-wrap" }} onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === "Escape") (e.currentTarget as HTMLElement).blur();
            else continueBullet(e);
          }} />
      ) : (
        <div className="body">
          {toBlocks(note.body).map((b, i) =>
            b.kind === "p" ? <p key={i} style={{ whiteSpace: "pre-wrap" }}>{b.text}</p>
              : <ul key={i}>{b.items.map((t, j) => <li key={j}>{t}</li>)}</ul>,
          )}
        </div>
      )}
    </article>
  );
}
