import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signInWithGoogle } from "@/lib/auth";
import { LogoMark } from "@/components/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Ariadne’s Thread" },
      { name: "description", content: "Sign in to your private stream of notes and captures." },
      { property: "og:title", content: "Sign in · Ariadne’s Thread" },
      { property: "og:description", content: "Sign in to your private stream of notes and captures." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/write", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/write", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function onSignIn() {
    setError(null);
    const result = await signInWithGoogle();
    if (result.error) setError("Couldn’t sign in. Please try again.");
  }

  return (
    <>
      <header className="topbar" style={{ borderBottom: 0 }}>
        <a className="logo" href="/">
          <LogoMark />
          <span>Ariadne’s Thread</span>
        </a>
        <div className="spacer" />
      </header>
      <main className="stream">
        <div className="inner" style={{ alignItems: "center", textAlign: "center", paddingTop: "12vh" }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 300 }}>Sign in to continue.</p>
          <p style={{ margin: "4px 0 22px", fontSize: 15, color: "var(--ink-recede)" }}>
            Your notes and captures stay private to you.
          </p>
          <button className="btn primary" style={{ height: 48, paddingInline: 22, fontSize: 15 }} onClick={onSignIn}>
            Continue with Google
          </button>
          {error && (
            <p style={{ marginTop: 14, fontSize: 14, color: "var(--ink-recede)" }}>{error}</p>
          )}
        </div>
      </main>
    </>
  );
}
