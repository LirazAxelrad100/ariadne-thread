import { Link, useNavigate, useRouteContext, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { synthesize } from "@/lib/synthesize.functions";
import { itemsQuery, monthKey, monthLabel, monthShort, SYNTH_MIN } from "@/lib/items";
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { InfoDialog, SUPPORT, type InfoDialogKind } from "@/components/SiteFooter";
import { LogoMark, ThreadIcon } from "@/components/Logo";
import { signOut } from "@/lib/auth";
import { BookmarkletLink } from "@/components/BookmarkletLink";
import { demoModeQueryOptions } from "@/lib/demo";

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function formatWriting(d: Date) {
  const date = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

export function AppShell({ children }: { children: ReactNode }) {
  // resolvedLocation only advances once the next route has committed, so the
  // header and body mode stay in sync with the view still on screen — no
  // half-switched frame while the next view loads.
  const { pathname, search } = useRouterState({ select: (s) => s.resolvedLocation ?? s.location });
  const view: "write" | "read" = pathname.startsWith("/write") ? "write" : "read";
  const isItem = pathname.startsWith("/item");
  const now = useNow();
  const { user } = useRouteContext({ from: "/_authenticated" });
  const { data: demoMode } = useQuery(demoModeQueryOptions(user?.id));
  const queryClient = useQueryClient();
  const { data: items = [] } = useQuery(itemsQuery());

  useEffect(() => {
    const cls = isItem ? "mode-item" : view === "read" ? "mode-reading" : "mode-writing";
    document.body.classList.add(cls);
    return () => document.body.classList.remove(cls);
  }, [view, isItem]);

  // The landing page's demo account is read-only: the database already blocks
  // every write, so the controls that would fail are simply not shown.
  useEffect(() => {
    if (!demoMode) return;
    document.body.classList.add("mode-demo");
    return () => document.body.classList.remove("mode-demo");
  }, [demoMode]);

  const months = [...new Set(items.map((i) => monthKey(i.item_date)))]; // newest first
  const m = (search as { m?: string }).m;
  const month = m ?? months[0] ?? monthKey(now);
  const idx = months.indexOf(month);
  const older = idx >= 0 ? months[idx + 1] : undefined;
  const newer = idx > 0 ? months[idx - 1] : undefined;
  const count = items.filter((i) => monthKey(i.item_date) === month).length;

  // The month strip: every month that holds entries, so the whole span of the
  // timeline is one click away. It closes on re-click, a click outside, Esc,
  // or switching to Write.
  const [strip, setStrip] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => { setStrip(false); }, [view]);
  useEffect(() => {
    if (!strip) return;
    const onDown = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setStrip(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setStrip(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [strip]);

  // Oldest on the left, grouped by year: the strip reads as a span of time.
  const stripYears: { year: string; keys: string[] }[] = [];
  for (const k of [...months].reverse()) {
    const y = k.slice(0, 4);
    const g = stripYears[stripYears.length - 1];
    if (g && g.year === y) g.keys.push(k);
    else stripYears.push({ year: y, keys: [k] });
  }

  const qc = useQueryClient();
  const navigate = useNavigate();
  const runSynth = useServerFn(synthesize);
  const [synth, setSynth] = useState<{ state: "idle" | "loading" | "few" | "error"; message?: string | null }>({ state: "idle" });
  useEffect(() => { if (view !== "read") setSynth({ state: "idle" }); }, [view]);

  async function onSynthesize() {
    if (synth.state === "loading") return;
    if (items.filter((i) => !i.is_synthesis).length < SYNTH_MIN) { setSynth({ state: "few" }); return; }
    setSynth({ state: "loading" });
    try {
      const r = await runSynth();
      if (r.ok) {
        setSynth({ state: "idle" });
        await qc.invalidateQueries({ queryKey: ["items"] });
        navigate({ to: "/item/$id", params: { id: r.id } });
      } else if (r.reason === "few") setSynth({ state: "few" });
      else setSynth({ state: "error", message: r.message });
    } catch {
      setSynth({ state: "error" });
    }
  }

  return (
    <>
      <header className="topbar" ref={headerRef}>
        <Link to={demoMode ? "/read" : "/write"} className="logo">
          <LogoMark />
          <span>Ariadne’s Thread</span>
        </Link>
        <span className="barSep" />
        {view === "write" ? (
          <>
            <span className="barTitle">Write</span>
            <span className="meta"><span className="metaDate">{formatWriting(now).split(" · ")[0]} · </span>{formatWriting(now).split(" · ")[1]}</span>
          </>
        ) : (
          <>
            <span className="barTitle">Read</span>
            {items.length > 0 && (
            <nav className="monthNav" aria-label="Month">
              <Link to="/read" search={older ? { m: older } : {}} className="mArrow" aria-label="Previous month"
                disabled={!older} style={!older ? { opacity: 0.3, pointerEvents: "none" } : undefined}>‹</Link>
              <button className="mLabel" type="button"
                aria-expanded={months.length > 1 ? strip : undefined}
                onClick={() => months.length > 1 && setStrip((s) => !s)}>{monthLabel(month)}</button>
              <span className="mono mCount">· {count} {count === 1 ? "entry" : "entries"}</span>
              <Link to="/read" search={newer ? { m: newer } : {}} className="mArrow" aria-label="Next month"
                disabled={!newer} style={!newer ? { opacity: 0.3, pointerEvents: "none" } : undefined}>›</Link>
            </nav>
            )}
          </>
        )}
        <div className="spacer" />
        {(view === "write" ? items.length : count) > 0 && (
          <span className="mono headCount">
            {view === "write" ? items.length : count} {(view === "write" ? items.length : count) === 1 ? "entry" : "entries"}
          </span>
        )}
        {view === "read" && (
          <button className={synth.state === "loading" ? "synthBtn synthBusy" : "synthBtn"} type="button"
            onClick={onSynthesize} disabled={synth.state === "loading"} aria-busy={synth.state === "loading"}
            aria-label="Synthesize">
            <ThreadIcon />
            <span className="btnLabel">{synth.state === "loading" ? "Synthesizing…" : "Synthesize"}</span>
            {synth.state === "loading" && <span className="btnDot" aria-hidden="true" />}
          </button>
        )}
        {demoMode
          ? <button type="button" className="viewBtn"
              onClick={async () => { await signOut(queryClient); navigate({ to: "/", replace: true }); }}>
              Leave the demo
            </button>
          : view === "write"
          ? <Link to="/read" className="viewBtn">Read</Link>
          : <Link to="/write" className="viewBtn">Write</Link>}
        <AccountMenu />
        {view === "read" && months.length > 1 && (
          <nav className="monthStrip" aria-label="All months" hidden={!strip}>
            {stripYears.map((g, gi) => (
              <Fragment key={g.year}>
                {gi > 0 && <span className="msSep" aria-hidden="true" />}
                <span className="msYear">{g.year}</span>
                {g.keys.map((k) => (
                  <Link key={k} to="/read" search={{ m: k }} className="msMonth"
                    aria-current={k === month ? "true" : undefined}
                    onClick={() => setStrip(false)}>{monthShort(k)}</Link>
                ))}
              </Fragment>
            ))}
          </nav>
        )}
      </header>
      {view === "read" && synth.state !== "idle" && (
        <p className="synthState" role="status">
          {synth.state === "loading" && "Reading your notes and captures. This can take up to a minute."}
          {synth.state === "few" && "Not enough notes yet for AI synthesis."}
          {synth.state === "error" && (
            <>
              {synth.message ? `${synth.message} Nothing was saved.` : "Couldn’t finish the synthesis. Nothing was saved."}
              <button className="btn" type="button" onClick={onSynthesize}>Try again</button>
            </>
          )}
        </p>
      )}
      {children}
    </>
  );
}

function AccountMenu() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [info, setInfo] = useState<InfoDialogKind | null>(null);
  const closeInfo = useCallback(() => {
    setInfo(null);
    requestAnimationFrame(() => ref.current?.querySelector<HTMLButtonElement>(".account")?.focus());
  }, []);

  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
  const name = meta.full_name || meta.name || user.email || "";
  const avatar = meta.avatar_url || meta.picture;
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  // Keep the menu open while the user moves to the bookmarks bar.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    document.addEventListener("dragend", close);
    window.addEventListener("blur", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("dragend", close);
      window.removeEventListener("blur", close);
    };
  }, [open]);

  async function onSignOut() {
    setOpen(false);
    await signOut(queryClient);
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div ref={ref} style={{ display: "contents" }}>
      <button
        className="account"
        aria-label="Account"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={avatar ? { padding: 0, overflow: "hidden" } : undefined}
      >
        {avatar ? (
          <img src={avatar} alt="" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          initial
        )}
      </button>
      <div className="menu accountMenu" role="menu" aria-label="Account menu" hidden={!open}>
        <div style={{ padding: "6px 10px 8px", lineHeight: 1.4 }}>
          {name && name !== user.email && <div style={{ fontSize: 13.5, fontWeight: 500 }}>{name}</div>}
          <div className="meta" style={{ whiteSpace: "normal", wordBreak: "break-all" }}>{user.email}</div>
        </div>
        <BookmarkletLink />
        <button role="menuitem" onClick={() => { setOpen(false); setInfo("how"); }}>How it works</button>
        <button role="menuitem" onClick={() => { setOpen(false); setInfo("privacy"); }}>Privacy</button>
        <a role="menuitem" href={`mailto:${SUPPORT}`} onClick={() => setOpen(false)}>Support</a>
        <button role="menuitem" onClick={onSignOut}>Sign out</button>
      </div>
      {info && <InfoDialog kind={info} onClose={closeInfo} />}
    </div>
  );
}
