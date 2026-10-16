import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { signInWithGoogle } from "@/lib/auth";
import { LogoMark } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteFooter";


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Ariadne’s Thread" },
      { name: "description", content: "Sign in to your private stream of notes and captures." },
      { property: "og:title", content: "Ariadne’s Thread" },
      { property: "og:description", content: "AI that finds the thread in the maze of your mind." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://ariadne-thread.lovable.app/og-card.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://ariadne-thread.lovable.app/og-card.jpg" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  // Stay blank while a session may be arriving (e.g. back from Google), so the form never flashes.
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const returning = /access_token|code=|error=/.test(window.location.hash + window.location.search);
    let settled = false;
    const show = () => { if (settled) return; settled = true; setChecking(false); };
    // However long the server check below takes, the form always appears.
    const neverBlank = setTimeout(show, returning ? 4000 : 1200);
    // Drop anything cached while signed out (empty lists), so Write never
    // shows the first-visit picture before this account's notes arrive.
    let entered = false;
    const enter = (email?: string) => {
      if (entered) return;
      entered = true; settled = true;
      queryClient.clear();
      // Judges' demo account opens on Read: Write only shows today, so it
      // would be empty on whatever day they look.
      navigate({ to: email === DEMO_EMAIL ? "/read" : "/write", replace: true });
    };
    // A stored login can belong to an account that no longer exists (the
    // landing-page demo we removed). Ask the server before sending them on:
    // the guard on /write throws them straight back here, so an unverified
    // auto-enter bounces /auth ⇄ /write forever on a blank screen.
    let verify: Promise<void> | undefined;
    const check = () => {
      verify ??= (async () => {
        try {
        const { data: me, error } = await supabase.auth.getUser();
        if (!error && me.user) return enter(me.user.email);
        // Flaky network is not a dead login: show the form but keep the
        // session, so a reload can still get them in.
        if (!error || error.name !== "AuthRetryableFetchError") {
          await supabase.auth.signOut();
          queryClient.clear();
        }
        show();
        } finally { verify = undefined; }
      })();
      return verify;
    };
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void check();
      else show();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) void check();
    });
    return () => { sub.subscription.unsubscribe(); clearTimeout(neverBlank); };
  }, [navigate, queryClient]);

  async function onSignIn() {
    setError(null);
    const result = await signInWithGoogle();
    if (result.error) setError("Couldn’t sign in. Please try again.");
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [passErr, setPassErr] = useState<string | null>(null);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setEmailErr(null); setPassErr(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setEmailErr("Enter your email address."); return; }
    if (!password) { setPassErr("Enter your password."); return; }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setPassErr("Wrong email or password.");
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
      <main className="authPage">
        <div className="authCenter">
          <div className="authCol">
            <LogoMark size={56} />
            <h1 className="authHead">Pick up the thread.</h1>
            <p className="authLead">
              Your notes and captures are private.<br />Only you can see them.
            </p>
            <button type="button" className="authGoogle" onClick={onSignIn}>Continue with Google</button>
            {error && <p className="authErr" style={{ marginTop: 8 }}>{error}</p>}
            <div className="authOr">or with email</div>
            <form className="authForm" onSubmit={onEmail} noValidate>
              <div className="authField">
                <label htmlFor="auth-email">Email</label>
                <input id="auth-email" type="email" autoComplete="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailErr(null); }} />
                {emailErr && <p className="authErr">{emailErr}</p>}
              </div>
              <div className="authField">
                <label htmlFor="auth-pass">Password</label>
                <input id="auth-pass" type="password" autoComplete="current-password" value={password}
                  onChange={(e) => { setPassword(e.target.value); setPassErr(null); }} />
                {passErr && <p className="authErr">{passErr}</p>}
              </div>
              <button className="authSubmit" type="submit">Sign in</button>
            </form>
          </div>
        </div>
        <SiteFooter />
      </main>
    </>
  );
}
