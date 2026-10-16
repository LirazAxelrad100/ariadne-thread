import { createFileRoute, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { enrich } from "@/lib/share";
import { fetchTodayNotes, hhmm, INCOMING_KEY, saveNote, type CaptureMeta, type Incoming, type NoteRow } from "@/lib/notes";
import { annotationsQuery } from "@/lib/marks";
import { hostOf, itemsQuery } from "@/lib/items";
import { MarkedBody, type MarkActions } from "@/components/MarkedBody";
import { Entry } from "@/components/Entry";
import { BookmarkletLink } from "@/components/BookmarkletLink";
import { VoiceButton } from "@/components/VoiceButton";
import { domToMd, listOnInput, listOnKeyDown, mdToHtml, plainPaste } from "@/lib/listEditor";
import { supabase } from "@/integrations/supabase/client";
import { demoModeQueryOptions } from "@/lib/demo";

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
  const navigateTo = useNavigate();
  const { user } = useRouteContext({ from: "/_authenticated" });
  const { data: demoMode } = useQuery(demoModeQueryOptions(user?.id));
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
  // Once something is written, the first-visit intro stays gone — even in the
  // moment between closing the note and the saved list arriving.
  const [wrote, setWrote] = useState(false);

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
    // Both lists: today's notes for the stream, all items for the first-visit
    // intro — after the first save it must never come back.
    qc.invalidateQueries({ queryKey: ["notes"] });
    qc.invalidateQueries({ queryKey: ["items"] });
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
        let c = JSON.parse(inc) as Incoming & { pending?: boolean };
        // Shared while signed out: fetch the page now that there's a session.
        if (c.pending && c.url) c = await enrich({ url: c.url, text: c.text, title: c.title });
        if (draft.current.body.trim()) await close();
        const meta: CaptureMeta = { ...EMPTY_CAP, title: c.title || "", source_url: c.url || "", writer: c.writer || "" };
        draft.current = { id: null, body: (c.text || "").trim(), startedAt: new Date().toISOString(), cap: meta };
        localStorage.removeItem(INCOMING_KEY);
        persistLocal();
        setBoxBody(draft.current.body);
        setWrote(true);
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
    if (body.trim()) setWrote(true);
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
          {allItems.length === 0 && !boxBody && !boxId && !wrote && (
            <div className="firstSteps">
              <svg className="fsThread" viewBox="0 0 900 120" aria-hidden="true">
                <path d="M 0 118 C 50 120, 105 103, 150 100 C 240 94, 360 42, 450 40 C 540 38, 660 106, 750 100 C 785 98, 822 66, 842 46" fill="none" />
                <circle cx="150" cy="100" r="5" />
                <circle cx="450" cy="40" r="5" />
                <circle cx="750" cy="100" r="5" />
                <circle cx="842" cy="46" r="7" className="fsThreadEnd" />
              </svg>
              <div className="fsCols">
                <div className="fsCol">
                  <p className="fsColTitle">Write</p>
                  <p className="fsColText">Whatever’s on your mind, jot it down.</p>
                </div>
                <div className="fsCol">
                  <p className="fsColTitle">Capture</p>
                  <p className="fsColText">Read something that inspires you? Capture it in one click.</p>
                  <BookmarkletLink compact />
                </div>
                <div className="fsCol">
                  <p className="fsColTitle">Mark</p>
                  <p className="fsColText">Mark the parts that move you. Add a note.</p>
                </div>
              </div>
            </div>
          )}
          {notes.length > 0 && (
            <div className="thread">
              {notes.filter((n) => n.id !== draft.current.id).map((n) =>
                n.type === "capture"
                  ? <Entry key={n.id} item={n} annots={allAnnots.filter((a) => a.item_id === n.id)}
                      onOpen={() => navigateTo({ to: "/item/$id", params: { id: n.id } })} />
                  : <TodayNote key={n.id} note={n} />)}
            </div>
          )}
        </div>
      </main>
      <div className="composerWrap">
        {demoMode ? (
          <p className="demoNote">
            The demo is read-only — nothing here can be changed. Open Read to follow the
            thread, and press Synthesize to see what the AI finds.
          </p>
        ) : (
        <div className="composerRail">
          <span className="liveDot" />
          <span className="liveTime">{hhmm(liveTime)}</span>
          <div
            className={cap ? "capBox" : undefined}
            onPointerDown={() => { idleLeft.current = IDLE_MS; }}
            onInput={() => { idleLeft.current = IDLE_MS; }}
            onKeyDown={() => { idleLeft.current = IDLE_MS; }}
          >
            {cap && <CaptureHead cap={cap} onChange={setCap} />}
            <FadeScroll on={!!cap} dep={boxBody}>
              <MarkedBody
                body={boxBody}
                annots={boxAnnots}
                className={cap ? "composer capText" : "composer"}
                editable
                actions={actions}
                onEdit={onEdit}
                placeholder={cap ? "The captured text" : "What couldn’t you stop thinking about today?"}
              />
            </FadeScroll>
            {cap && (
              <div className="capWhyRow">
                <span className="capWhyLabel">What caught me</span>
                <input className="capInput capWhy" placeholder="one line, optional" value={cap.why}
                  onChange={(e) => setCap({ ...cap, why: e.target.value })} aria-label="What caught me" />
              </div>
            )}
          </div>
          <p className="status">
            <VoiceButton
              label={cap ? "Speak a comment" : "Speak"}
              onText={(t) => {
                const c = draft.current.cap;
                if (c) setCap({ ...c, why: c.why.trim() ? `${c.why.trim()} ${t}` : t });
                else onEdit(draft.current.body.trim() ? `${draft.current.body.replace(/\s+$/, "")}\n\n${t}` : t);
              }}
            />
            {" · "}
            {savedAt ? <>Saved <span className="mono">{savedAt}</span></> : "Saves as you type"}
            <span className="escHint"> · Esc to close the {cap ? "capture" : "note"}</span>
            {!cap && !boxBody && (
              <span className="pasteLinkWrap"> · <PasteLink /></span>
            )}
          </p>
        </div>
        )}
      </div>
    </>
  );
}

function TodayNote({ note }: { note: NoteRow }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
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
    <article className="entry" style={{ cursor: "pointer" }} onClick={() => { if (!editing) navigate({ to: "/item/$id", params: { id: note.id } }); }}>
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

/** Title, writer, source and "I wrote this", laid out like a capture entry in Read. */
function CaptureHead({ cap, onChange }: { cap: CaptureMeta; onChange: (c: CaptureMeta) => void }) {
  const [editUrl, setEditUrl] = useState(false);
  const host = hostOf(cap.source_url);
  const writer = cap.author_me ? "You" : cap.writer;
  return (
    <div className="capHead">
      <input className="capInput capTitle" placeholder="Title" value={cap.title}
        onChange={(e) => onChange({ ...cap, title: e.target.value })} aria-label="Title" />
      <div className="capMeta">
        <span className="capGrow" data-value={writer || "Writer"}>
          <input className="capInput" placeholder="Writer" value={writer} readOnly={cap.author_me}
            onChange={(e) => onChange({ ...cap, writer: e.target.value })} aria-label="Writer" size={1} />
        </span>
        <span className="capSep" aria-hidden="true">·</span>
        {editUrl || !host ? (
          <input className="capInput capUrl" placeholder="Source link" value={cap.source_url} inputMode="url"
            autoFocus={editUrl} onBlur={() => setEditUrl(false)}
            onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); }}
            onChange={(e) => onChange({ ...cap, source_url: e.target.value })} aria-label="Source link" />
        ) : (
          <button type="button" className="capHost" onClick={() => setEditUrl(true)} aria-label={`Source: ${cap.source_url}. Edit`}>
            {host}
          </button>
        )}
        <label className="capMine">
          <input type="checkbox" checked={cap.author_me} onChange={(e) => onChange({ ...cap, author_me: e.target.checked })} />
          <span className="capCheck" aria-hidden="true" />
          I wrote this
        </label>
      </div>
    </div>
  );
}

/** Captured text scrolls inside the box; a fade at the bottom says there's more below. */
function FadeScroll({ on, dep, children }: { on: boolean; dep: unknown; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(".composer");
    if (!on || !el) { setMore(false); return; }
    const check = () => setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 2);
    check();
    el.addEventListener("scroll", check);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, [on, dep]);
  return <div ref={ref} className={on ? "capTextWrap" : undefined} data-more={more || undefined}>{children}</div>;
}

/** Phone capture: paste an article's link, the page comes in like a bookmarklet capture. */
function PasteLink() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const ok = /^https?:\/\/\S+\.\S+/.test(url.trim());
  const go = () => { if (ok) window.location.assign("/capture?url=" + encodeURIComponent(url.trim())); };
  if (!open) return <button type="button" className="capToggle" onClick={() => setOpen(true)}>Paste a link</button>;
  return (
    <span className="pasteLink">
      <input className="capField" autoFocus type="url" inputMode="url" placeholder="https://…" value={url}
        aria-label="Article link" onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
          if (e.key === "Enter") { e.preventDefault(); go(); }
        }} />
      <button type="button" className="btn" disabled={!ok} onClick={go}>Capture</button>
    </span>
  );
}
