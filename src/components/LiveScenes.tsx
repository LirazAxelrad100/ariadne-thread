// Live "How it works" scenes: the product drawn in real text, using only the
// demo account's own words. Every scene is driven by `t` (ms since the scene
// started); with reduced motion `t` is Infinity, so each scene shows finished.
import { useEffect, useState } from "react";
import { ThreadIcon } from "@/components/Logo";
import { BookmarkletLink } from "@/components/BookmarkletLink";

function useClock(key: number) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(Number.POSITIVE_INFINITY);
      return;
    }
    const start = performance.now();
    setT(0);
    const id = setInterval(() => setT(performance.now() - start), 40);
    return () => clearInterval(id);
  }, [key]);
  return t;
}

const typed = (text: string, t: number, from: number, msPerChar = 38) =>
  t === Number.POSITIVE_INFINITY ? text : text.slice(0, Math.max(0, Math.floor((t - from) / msPerChar)));
const caret = (text: string, shown: string) => (shown.length < text.length ? <span className="liveCaret" /> : null);

function Entry({ time, children, live }: { time: string; children: React.ReactNode; live?: boolean }) {
  return (
    <div className="liveEntry">
      <span className="liveDot" data-live={live ? "1" : undefined} />
      <span className="liveTime">{time}</span>
      <div className="liveBody">{children}</div>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="dayDivider liveDivider">
      <span>{label}</span>
    </div>
  );
}

function WriteScene({ t }: { t: number }) {
  const text = "It’s over! It went well, I think. People talked, asked questions, were engaged. I think it went well.";
  const shown = typed(text, t, 600);
  return (
    <>
      <Divider label="Tuesday · 6 October" />
      <div className="liveRail">
        <Entry time="16:30">
          <p className="liveRecede">
            First session of the reading group today, and I’m both happy and excited. And the excitement leans a little towards tension.
          </p>
        </Entry>
        <Entry time="19:00" live>
          <div className="liveComposer">
            {shown}
            {caret(text, shown)}
          </div>
          <p className="liveCaption">{shown.length === text.length ? "Saved 19:00 · Esc to close the note" : "Saves as you type"}</p>
        </Entry>
      </div>
    </>
  );
}

function CaptureScene({ t }: { t: number }) {
  const sel = t > 1400;
  const clicked = t > 2800;
  const landed = t > 3600;
  return (
    <>
      <div className="liveBrowser">
        <div className="liveUrl">
          <span className="liveLights"><i /><i /><i /></span>
          <span className="liveUrlText">substack.com/home/post/p-169790855</span>
        </div>
        <div className="liveBookmarks">
          <span>Recipes</span>
          <span>News</span>
          <span className="livePill" data-on={clicked ? "1" : undefined}>
            <ThreadIcon size={12} muted /> Capture to Ariadne
          </span>
        </div>
        <div className="livePage">
          <h3>What If Anxiety Is a Habit, Not a Disorder?</h3>
          <p>
            Here’s the question that I now ask every anxious patient, and that you can ask yourself:{" "}
            <span className="liveSel" data-on={sel ? "1" : undefined}>
              “What if your anxiety isn’t a disorder to be cured, but a habit to be changed?”
            </span>{" "}
            This isn’t psychobabble.
          </p>
        </div>
      </div>
      <p className="liveCaption liveLanded" data-on={landed ? "1" : undefined}>
        → lands in your Read as a capture, with the passage you selected
      </p>
      <div className="liveBmGet">
        <BookmarkletLink inline />
      </div>
    </>
  );
}

function MarkScene({ t }: { t: number }) {
  const marked = t > 1500;
  const pop = t > 700 && t < 2600;
  const comment = "Fear makes us stupid";
  const shown = typed(comment, t, 2900, 70);
  return (
    <>
      <Divider label="Saturday · 3 October" />
      <div className="liveRail">
        <Entry time="12:00">
          <p className="liveTitle">Dental treatment, survival, nothing changes faster than the mind</p>
          <p>
            I am very, very afraid of dental treatment. So I make time for it. Before and after, free time in abundance. Time to be afraid.{" "}
            <span className="liveMarkWrap">
              {marked ? <mark>That’s how I turned a one-hour event into an event lasting several weeks.</mark> : <span className="liveSel" data-on={t > 300 ? "1" : undefined}>That’s how I turned a one-hour event into an event lasting several weeks.</span>}
              {pop && (
                <span className="livePop">
                  <span className="sw" /> Mark <span className="livePopSep" /> ↳ Comment
                </span>
              )}
            </span>
          </p>
          {t > 2800 && (
            <p className="liveComment">
              ↳ Liraz <em>{shown}</em>
              {caret(comment, shown)}
            </p>
          )}
        </Entry>
      </div>
    </>
  );
}

function ReadScene({ t }: { t: number }) {
  const show = (i: number) => (t > i * 500 ? "1" : undefined);
  return (
    <>
      <Divider label="Tuesday · 6 October" />
      <div className="liveRail">
        <div className="liveFade" data-on={show(0)}>
          <Entry time="16:30"><p>First session of the reading group today, and I’m both happy and excited.</p></Entry>
        </div>
        <div className="liveFade" data-on={show(1)}>
          <Entry time="19:00"><p>It’s over! It went well, I think. People talked, asked questions, were engaged.</p></Entry>
        </div>
        <div className="liveFade" data-on={show(2)}>
          <Entry time="19:25"><p>Just checked my email: I got into SheBuilds! Excited. <mark>From excitement to excitement, from tension to tension.</mark></p></Entry>
        </div>
      </div>
      <div className="liveFade" data-on={show(3)}>
        <Divider label="Wednesday · 7 October" />
        <div className="liveRail">
          <Entry time="12:00">
            <p className="liveTitle">What If Anxiety Is a Habit, Not a Disorder?</p>
            <p className="liveSrc">substack.com</p>
            <p>… <mark>“What if your anxiety isn’t a disorder to be cured, but a habit to be changed?”</mark> …</p>
            <p className="liveComment">↳ Liraz <em>habits we can change, we have something to work with</em></p>
          </Entry>
        </div>
      </div>
    </>
  );
}

function SynthScene({ t }: { t: number }) {
  const working = t < 2200;
  const text = "Excitement and tension travel together. Good news and hard tasks arrive with the same tightness, and fear stretches short events into long ones.";
  const shown = typed(text, t, 2600, 30);
  return (
    <>
      <div className="liveSynthTop">
        <span className="livePill liveSynthBtn" data-on={working ? "1" : undefined}>
          <ThreadIcon size={14} muted working={working} /> Synthesize
        </span>
      </div>
      {!working && (
        <div className="liveRail">
          <Entry time="09:12" live>
            <p className="liveMeta">AI · Synthesis of 18 items</p>
            <p className="liveTitle">Themes</p>
            <p className="liveBig">
              {shown}
              {caret(text, shown)}
            </p>
            {shown.length === text.length && (
              <p className="liveFrom">
                From <u>First session of the reading group…</u> · <u>Just checked my email…</u> · <u>Dental treatment, survival…</u>
              </p>
            )}
            <p className="liveSkelHead">Connections</p>
            <span className="liveBar" style={{ width: "78%" }} />
            <span className="liveBar" style={{ width: "52%" }} />
            <p className="liveSkelHead">Open questions</p>
            <span className="liveBar" style={{ width: "64%" }} />
          </Entry>
        </div>
      )}
    </>
  );
}

export function LiveScene({ step, runKey }: { step: number; runKey: number }) {
  const t = useClock(runKey);
  return (
    <div className="liveScene" aria-hidden="true">
      {step === 0 && <WriteScene t={t} />}
      {step === 1 && <CaptureScene t={t} />}
      {step === 2 && <MarkScene t={t} />}
      {step === 3 && <ReadScene t={t} />}
      {step === 4 && <SynthScene t={t} />}
    </div>
  );
}
