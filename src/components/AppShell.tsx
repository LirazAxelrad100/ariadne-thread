import { Link, useNavigate, useRouteContext, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { itemsQuery, monthKey, monthLabel, SYNTH_MIN } from "@/lib/items";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LogoMark, ThreadIcon } from "@/components/Logo";
import { signOut } from "@/lib/auth";
import { BookmarkletLink } from "@/components/BookmarkletLink";

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
  const { data: items = [] } = useQuery({ ...itemsQuery(), enabled: view === "read" });

  useEffect(() => {
    const cls = isItem ? "mode-item" : view === "read" ? "mode-reading" : "mode-writing";
    document.body.classList.add(cls);
    return () => document.body.classList.remove(cls);
  }, [view, isItem]);

  const months = [...new Set(items.map((i) => monthKey(i.item_date)))]; // newest first
  const m = (search as { m?: string }).m;
  const month = m ?? months[0] ?? monthKey(now);
  const idx = months.indexOf(month);
  const older = idx >= 0 ? months[idx + 1] : undefined;
  const newer = idx > 0 ? months[idx - 1] : undefined;
  const count = items.filter((i) => monthKey(i.item_date) === month).length;

  return (
    <>
      <header className="topbar">
        <Link to="/write" className="logo">
          <LogoMark />
          <span>Ariadne’s Thread</span>
        </Link>
        <span className="barSep" />
        {view === "write" ? (
          <>
            <span className="headDot" />
            <span className="barTitle">Writing now</span>
            <span className="meta">{formatWriting(now)}</span>
          </>
        ) : (
          <>
            <span className="barTitle">Read</span>
            <nav className="monthNav" aria-label="Month">
              <Link to="/read" search={older ? { m: older } : {}} className="mArrow" aria-label="Previous month"
                disabled={!older} style={!older ? { opacity: 0.3, pointerEvents: "none" } : undefined}>‹</Link>
              <span className="mLabel">{monthLabel(month)}</span>
              <Link to="/read" search={newer ? { m: newer } : {}} className="mArrow" aria-label="Next month"
                disabled={!newer} style={!newer ? { opacity: 0.3, pointerEvents: "none" } : undefined}>›</Link>
            </nav>
            <span className="mono">{count} {count === 1 ? "entry" : "entries"}</span>
          </>
        )}
        <div className="spacer" />
        {view === "read" && (
          <button className="btn" type="button" disabled={items.length < SYNTH_MIN}
            title={items.length < SYNTH_MIN ? `Synthesize needs at least ${SYNTH_MIN} entries` : undefined}
            style={items.length < SYNTH_MIN ? { opacity: 0.45, cursor: "default" } : undefined}>
            <ThreadIcon />
            Synthesize
          </button>
        )}
        <span className="barSep" />
        <nav className="viewNav" aria-label="Views">
          <Link to="/write" aria-current={view === "write" ? "page" : undefined}>Write</Link>
          <Link to="/read" aria-current={view === "read" ? "page" : undefined}>Read</Link>
        </nav>
        <AccountMenu />
      </header>
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

  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
  const name = meta.full_name || meta.name || user.email || "";
  const avatar = meta.avatar_url || meta.picture;
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  // The menu closes by itself: on an outside click, Esc, after dragging the
  // bookmarklet out, when the window loses focus, or 1.5s after the pointer leaves it.
  const leaveTimer = useRef<number | undefined>(undefined);
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
      window.clearTimeout(leaveTimer.current);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("dragend", close);
      window.removeEventListener("blur", close);
    };
  }, [open]);
  const onLeave = () => {
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => setOpen(false), 1500);
  };
  const onEnter = () => window.clearTimeout(leaveTimer.current);

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
      <div className="menu" role="menu" hidden={!open}>
        <div style={{ padding: "6px 10px 8px", lineHeight: 1.4 }}>
          {name && name !== user.email && <div style={{ fontSize: 13.5, fontWeight: 500 }}>{name}</div>}
          <div className="meta" style={{ whiteSpace: "normal", wordBreak: "break-all" }}>{user.email}</div>
        </div>
        <div className="bmBlock">
          <BookmarkletLink />
          <div className="bmHint">Drag it to your bookmarks bar. On any page, select a passage and click it. Desktop only. On a phone, paste text into the box.</div>
        </div>
        <button role="menuitem" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  );
}
