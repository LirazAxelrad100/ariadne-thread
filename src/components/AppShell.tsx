import { Link, useLocation, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LogoMark, ThreadIcon } from "@/components/Logo";
import { signOut } from "@/lib/auth";

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
  const { pathname } = useLocation();
  const view: "write" | "read" = pathname.startsWith("/read") ? "read" : "write";
  const now = useNow();

  useEffect(() => {
    const cls = view === "read" ? "mode-reading" : "mode-writing";
    document.body.classList.add(cls);
    return () => document.body.classList.remove(cls);
  }, [view]);

  const month = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

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
              <button className="mArrow" aria-label="Previous month" disabled>‹</button>
              <button className="mLabel" aria-expanded="false">{month}</button>
              <button className="mArrow" aria-label="Next month" disabled>›</button>
            </nav>
          </>
        )}
        <div className="spacer" />
        {view === "read" && (
          <button className="btn" type="button">
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

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
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
      <div className="menu" role="menu" hidden={!open}>
        <div style={{ padding: "6px 10px 8px", lineHeight: 1.4 }}>
          {name && name !== user.email && <div style={{ fontSize: 13.5, fontWeight: 500 }}>{name}</div>}
          <div className="meta" style={{ whiteSpace: "normal", wordBreak: "break-all" }}>{user.email}</div>
        </div>
        <button role="menuitem" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  );
}
