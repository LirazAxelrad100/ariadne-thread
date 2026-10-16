import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/Logo";
import { BookmarkletLink } from "@/components/BookmarkletLink";
import { startDemoSession } from "@/lib/demo.functions";
import { STEPS, DURATIONS, type Step } from "@/lib/shots";

const STEP_H = 96;
const PRIVACY = [
  "Your board is yours. Nothing you write or save is shared with or visible to anyone else.",
  "When you press Synthesize, your notes and clips are sent to an AI service to find patterns in them. It is used to produce your synthesis and nothing else — not to train models, not to build a profile of you.",
  "Your items and marks are stored so the board works. There are no ads and your data is not sold.",
];

export function LandingPage() {
  const [cur, setCur] = useState(0);
  const [paused, setPaused] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoErr, setDemoErr] = useState(false);
  const openDemo = useServerFn(startDemoSession);
  const step: Step = STEPS[cur] ?? STEPS[0] ?? { n: "", name: "", copy: "", shot: "", alt: "" };

  // Reduced motion: the carousel starts paused instead of moving on its own.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused(true);
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setCur((c) => (c + 1) % STEPS.length), DURATIONS[cur]);
    return () => clearTimeout(t);
  }, [cur, paused]);

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
            <div className="landCols">
              <div className="landStepsCol">
                <div className="landSteps">
                  <div
                    className="landGrow"
                    style={{ height: (cur + 1) * STEP_H - STEP_H / 2 }}
                  />
                  {STEPS.map((s, i) => (
                    <div
                      key={s.n}
                      className="landStep"
                      data-on={i === cur ? "1" : undefined}
                      onClick={() => {
                        setCur(i);
                        setPaused(true);
                      }}
                    >
                      <span className="landStepDot" aria-hidden="true" />
                      <span className="landStepNum">{s.n}</span>
                      <span className="landStepName">{s.name}</span>
                      <p className="landStepCopy">{s.copy}</p>
                      {s.shot && (
                        <img className="landShotMini" src={s.shot} alt={s.alt} />
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="landPause"
                  onClick={() => setPaused((p) => !p)}
                >
                  {paused ? "Play" : "Pause"}
                </button>
              </div>

              <div className="landShot">
                {step.shot ? (
                  <img src={step.shot} alt={step.alt} />
                ) : (
                  <div className="landShotPh">
                    {step.n} · {step.name}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="landCapture">
            <div className="dayDivider">
              <span>Capture from anywhere</span>
            </div>
            <div className="landCapCols">
              <p className="landCapCopy">
                Drag this button to your bookmarks bar. On any page, select a passage
                and click it to send it here.
              </p>
              <p className="landCapPhone">
                The bookmarklet works on desktop browsers. On your phone, tap + Capture
                in the app and paste the passage you want to keep.
              </p>
              <BookmarkletLink />
            </div>
          </section>

          <section className="landClose">
            <h2>Ariadne’s Thread</h2>
            <p>AI that finds the thread in the maze of your mind.</p>
            {actions}
          </section>

          <section className="landPrivacy" id="privacy">
            <div className="dayDivider">
              <span>Privacy</span>
            </div>
            {PRIVACY.map((p) => (
              <p key={p.slice(0, 20)}>{p}</p>
            ))}
            <p>
              Want it gone? Email{" "}
              <a href="mailto:lirazaxelrad2@gmail.com">lirazaxelrad2@gmail.com</a> and
              your account and everything in it will be deleted.
            </p>
          </section>

          <footer className="landFoot">
            <span>Built at the SheBuilds Buildathon, October 2026</span>
            <a href="#privacy">Privacy</a>
          </footer>
        </div>
      </main>
    </>
  );
}
