import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteFooter";
import { BookmarkletLink } from "@/components/BookmarkletLink";
import { startDemoSession } from "@/lib/demo.functions";
import { STEPS, DURATIONS, type Step } from "@/lib/shots";
import { LiveScene } from "@/components/LiveScenes";

export function LandingPage() {
  const [cur, setCur] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoErr, setDemoErr] = useState(false);
  const openDemo = useServerFn(startDemoSession);
  const step: Step = STEPS[cur] ?? STEPS[0] ?? { n: "", name: "", copy: "", shot: "", alt: "" };

  // Reduced motion: the carousel starts paused instead of moving on its own.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused(true);
  }, []);

  useEffect(() => {
    if (paused || hover) return;
    const t = setTimeout(() => setCur((c) => (c + 1) % STEPS.length), DURATIONS[cur]);
    return () => clearTimeout(t);
  }, [cur, paused, hover]);

  async function tryDemo() {
    setDemoErr(false);
    setDemoBusy(true);
    const res = await openDemo();
    setDemoBusy(false);
    if (!res.ok) {
      setDemoErr(true);
      return;
    }
    await supabase.auth.setSession({
      access_token: res.access_token,
      refresh_token: res.refresh_token,
    });
    window.location.assign("/read");
  }

  const actions = (
    <div className="landActions">
      <Link to="/auth" className="btn primary" style={{ textDecoration: "none" }}>
        Start
      </Link>
      <button type="button" className="btn" onClick={tryDemo} disabled={demoBusy}>
        Try the demo
      </button>
    </div>
  );

  return (
    <>
      <header className="topbar" style={{ borderBottom: 0 }}>
        <Link to="/" className="logo">
          <LogoMark />
          <span>Ariadne’s Thread</span>
        </Link>
        <div className="spacer" />
        <Link to="/auth" className="btn" style={{ textDecoration: "none" }}>
          Sign in
        </Link>
      </header>

      <main className="stream landStream">
        <div className="landInner">
          <section className="landHero">
            <div className="landLock">
              <LogoMark size={92} />
              <div className="landLockText">
                <h1 className="landName">Ariadne’s Thread</h1>
                <p className="landHook">AI that finds the thread in the maze of your mind.</p>
              </div>
            </div>
            {actions}
            {demoErr && (
              <p className="landNote" role="status">
                Couldn’t open the demo just now. You can sign in instead.
              </p>
            )}
          </section>

          <section className="landHow">
            <div className="dayDivider">
              <span>How it works</span>
            </div>
            <div className="landCols liveCols">
              <div className="landStepsCol">
                <div
                  className="bigSteps"
                  onMouseEnter={() => setHover(true)}
                  onMouseLeave={() => setHover(false)}
                >
                  {STEPS.map((s, i) => (
                    <button
                      key={s.n}
                      type="button"
                      className="bigStep"
                      data-on={i === cur ? "1" : undefined}
                      onClick={() => {
                        setCur(i);
                        setPaused(true);
                      }}
                    >
                      <span className="bigStepNum">{s.n}</span>
                      <span className="bigStepName">{s.name}.</span>
                    </button>
                  ))}
                </div>
                <p className="bigCopy">{step.copy}</p>
                <div className="landStepBm bigBm">
                  <BookmarkletLink inline />
                </div>
                <button
                  type="button"
                  className="landPause"
                  onClick={() => setPaused((p) => !p)}
                >
                  {paused ? "Play" : "Pause"}
                </button>
              </div>

              <div className="liveStage">
                <LiveScene key={cur} step={cur} runKey={cur} />
              </div>
            </div>
          </section>


          <section className="landClose">
            <h2>Ariadne’s Thread</h2>
            <p>AI that finds the thread in the maze of your mind.</p>
            {actions}
          </section>

          <SiteFooter />
        </div>
      </main>
    </>
  );
}
