import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ariadne’s Thread — AI that finds the thread in the maze of your mind" },
      { name: "description", content: "A private stream of your thoughts and the things you read, with AI that finds the threads between them." },
      { property: "og:title", content: "Ariadne’s Thread" },
      { property: "og:description", content: "AI that finds the thread in the maze of your mind." },
    ],
  }),
  component: Landing,
});

// Temporary landing: the full landing page (carousel, privacy, footer) is a later step.
function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/write", replace: true });
    });
  }, [navigate]);

  return (
    <>
      <header className="topbar" style={{ borderBottom: 0 }}>
        <Link to="/" className="logo">
          <LogoMark />
          <span>Ariadne’s Thread</span>
        </Link>
        <div className="spacer" />
        <Link to="/auth" className="btn" style={{ textDecoration: "none" }}>Sign in</Link>
      </header>
      <main className="stream">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8vh 0 7vh" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <LogoMark size={92} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: 64, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
                Ariadne’s Thread
              </h1>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 300, color: "var(--ink-recede)", lineHeight: 1.4 }}>
                AI that finds the thread in the maze of your mind.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
            <Link to="/auth" className="btn primary" style={{ height: 48, paddingInline: 22, fontSize: 15, textDecoration: "none" }}>
              Start
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
