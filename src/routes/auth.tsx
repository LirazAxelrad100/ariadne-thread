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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  // Stay blank while a session may be arriving (e.g. back from Google), so the form never flashes.
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const returning = /access_token|code=|error=/.test(window.location.hash + window.location.search);
    let fallback: ReturnType<typeof setTimeout> | undefined;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/write", replace: true });
      else if (returning) fallback = setTimeout(() => setChecking(false), 4000);
      else setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/write", replace: true });
    });
    return () => { sub.subscription.unsubscribe(); if (fallback) clearTimeout(fallback); };
  }, [navigate]);

  async function onSignIn() {
    setError(null);
    const result = await signInWithGoogle();
    if (result.error) setError("Couldn’t sign in. Please try again.");
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError("Wrong email or password.");
  }

  if (checking) return null;

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
          <form
            onSubmit={onEmail}
            style={{ display: "flex", flexDirection: "column", gap: 10, width: 280, marginTop: 28 }}
          >
            <p style={{ margin: 0, fontSize: 14, color: "var(--ink-recede)" }}>Or sign in with email</p>
            <input className="capField" type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ fontSize: 16 }} required />
            <input className="capField" type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ fontSize: 16 }} required />
            <button className="btn" type="submit" style={{ height: 44 }}>Sign in</button>
          </form>
          {error && (
            <p style={{ marginTop: 14, fontSize: 14, color: "var(--ink-recede)" }}>{error}</p>
          )}
        </div>
      </main>
    </>
  );
}
