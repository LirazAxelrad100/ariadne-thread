import { Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createParser } from "eventsource-parser";
import { supabase } from "@/integrations/supabase/client";

const RATE = 16000;
const MAX_SEC = 600;

function encodeWav(chunks: Float32Array[], inRate: number): File {
  const ratio = inRate / RATE;
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const all = new Float32Array(total);
  let o = 0;
  for (const c of chunks) { all.set(c, o); o += c.length; }
  const n = Math.floor(total / ratio);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const tag = (p: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(p + i, s.charCodeAt(i)); };
  tag(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); tag(8, "WAVE"); tag(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  tag(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, all[Math.floor(i * ratio)]!));
    v.setInt16(44 + i * 2, s * (s < 0 ? 32768 : 32767), true);
  }
  return new File([buf], "recording.wav", { type: "audio/wav" });
}

type Rec = { stop: () => void; cancel: () => void };

/**
 * Records and cuts the audio at natural pauses, so each spoken phrase is
 * turned into text while the speaker carries on.
 */
async function startRec(onSegment: (f: File) => void): Promise<Rec> {
  // iPhone: the audio engine must be created and resumed inside the tap
  // itself, before any await — otherwise iOS refuses to start it.
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  const resumed = ctx.resume().catch(() => {});
  if (!navigator.mediaDevices?.getUserMedia) { void ctx.close(); throw new Error("unsupported"); }
  let stream: MediaStream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { void ctx.close(); throw e; }
  await resumed;
  const src = ctx.createMediaStreamSource(stream);
  const node = ctx.createScriptProcessor(4096, 1, 1);
  const rate = ctx.sampleRate;
  let chunks: Float32Array[] = [];
  let len = 0, voiced = 0, quiet = 0;
  const cut = () => {
    if (voiced > rate * 0.4) onSegment(encodeWav(chunks, rate));
    chunks = []; len = 0; voiced = 0; quiet = 0;
  };
  node.onaudioprocess = (e) => {
    const d = new Float32Array(e.inputBuffer.getChannelData(0));
    let sum = 0;
    for (const x of d) sum += x * x;
    const loud = Math.sqrt(sum / d.length) > 0.012;
    if (!loud && voiced === 0) { chunks = [d]; len = d.length; return; } // keep a little lead-in only
    chunks.push(d); len += d.length;
    if (loud) { voiced += d.length; quiet = 0; } else quiet += d.length;
    // A pause after a phrase, or a long run-on: send what we have.
    if ((voiced > rate * 1.2 && quiet > rate * 0.7) || len > rate * 20) cut();
  };
  src.connect(node); node.connect(ctx.destination);
  const end = () => { stream.getTracks().forEach((t) => t.stop()); node.disconnect(); src.disconnect(); void ctx.close(); };
  return { stop: () => { node.onaudioprocess = null; cut(); end(); }, cancel: end };
}

async function transcribe(file: File): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: form,
  });
  if (!res.ok || !res.body) {
    if (res.status === 402) throw new Error("AI credits have run out.");
    if (res.status === 429) throw new Error("Too many requests — try again in a moment.");
    throw new Error("Couldn’t turn that into text.");
  }
  let text = "", final: string | null = null;
  const parser = createParser({
    onEvent: (ev) => {
      try {
        const d = JSON.parse(ev.data) as { type?: string; delta?: string; text?: string };
        if (d.type === "transcript.text.delta" && d.delta) text += d.delta;
        if (d.type === "transcript.text.done" && typeof d.text === "string") final = d.text;
      } catch { /* ignore keep-alives */ }
    },
  });
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) { const { done, value } = await reader.read(); if (done) break; parser.feed(value); }
  return (final ?? text).trim();
}

/** Speak instead of typing: records, turns speech into text, hands the text over. Audio is never kept. */
export function VoiceButton({ onText, label = "Speak", box = false }: { onText: (t: string) => void; label?: string; box?: boolean }) {
  const [state, setState] = useState<"idle" | "rec">("idle");
  const [sec, setSec] = useState(0);
  const [pending, setPending] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const rec = useRef<Rec | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const heard = useRef(false);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => () => rec.current?.cancel(), []);
  useEffect(() => {
    if (state !== "rec") return;
    const t = window.setInterval(() => setSec((s) => { if (s + 1 >= MAX_SEC) stop(); return s + 1; }), 1000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Phrases are transcribed in parallel but land in the box in the order spoken.
  function segment(file: File) {
    setPending((n) => n + 1);
    const job = transcribe(file).catch((e: Error) => { setErr(e.message); return ""; });
    queue.current = queue.current.then(async () => {
      const t = await job;
      if (t) { heard.current = true; onTextRef.current(t); }
      setPending((n) => n - 1);
    });
  }

  async function start() {
    setErr(null);
    heard.current = false;
    try { rec.current = await startRec(segment); setSec(0); setState("rec"); }
    catch (e) {
      const n = (e as { name?: string })?.name;
      setErr(n === "NotAllowedError" || n === "SecurityError"
        ? "Microphone blocked. Allow it for this site in your browser settings."
        : "Microphone not available.");
    }
  }
  function stop() {
    const r = rec.current; rec.current = null;
    if (!r) return;
    r.stop();
    setState("idle");
    void queue.current.then(() => { if (!heard.current) setErr((e) => e ?? "Didn’t catch any words."); });
  }

  const mm = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  if (box) return (
    <span className="voice">
      {state === "idle" && pending > 0 && <span className="voiceBusy">Turning it into text…</span>}
      {err && state === "idle" && !pending && <span className="voiceErr">{err}</span>}
      {state === "idle" && !pending && (
        <button type="button" className="speakBtn" onClick={start} onMouseDown={(e) => e.preventDefault()}>
          <Mic size={14} aria-hidden />Speak
        </button>
      )}
      {state === "rec" && (
        <button type="button" className="speakBtn" onClick={stop} onMouseDown={(e) => e.preventDefault()} aria-label="Stop recording">
          <span className="voiceDot" />Listening…
        </button>
      )}
    </span>
  );
  return (
    <span className="voice">
      {state === "idle" && !pending && <button type="button" className="capToggle" onClick={start} onMouseDown={(e) => e.preventDefault()}>{label}</button>}
      {state === "rec" && (
        <button type="button" className="capToggle voiceRec" onClick={stop} onMouseDown={(e) => e.preventDefault()} aria-label="Stop recording">
          <span className="voiceDot" />Stop <span className="mono">{mm}</span>
        </button>
      )}
      {state === "idle" && pending > 0 && <span className="voiceBusy">Turning it into text…</span>}
      {err && state === "idle" && !pending && <span className="voiceErr"> {err}</span>}
    </span>
  );
}
