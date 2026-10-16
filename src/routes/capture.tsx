import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { INCOMING_KEY, type Incoming } from "@/lib/notes";
import { enrich, readShared } from "@/lib/share";

export const Route = createFileRoute("/capture")({
  head: () => ({
    meta: [
      { title: "Capture · Ariadne’s Thread" },
      { name: "description", content: "Bringing what you read into your writing box." },
      { property: "og:title", content: "Capture · Ariadne’s Thread" },
      { property: "og:description", content: "Bringing what you read into your writing box." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CapturePage,
});

function stash(d: Partial<Incoming> & { pending?: boolean }) {
  const inc = {
    url: String(d.url ?? "").slice(0, 2000),
    title: String(d.title ?? "").slice(0, 300),
    text: String(d.text ?? "").slice(0, 60000),
    writer: String(d.writer ?? "").slice(0, 120),
    ...(d.pending ? { pending: true } : {}),
  };
  localStorage.setItem(INCOMING_KEY, JSON.stringify(inc));
}

/** Landing spot for the bookmarklet, Share to Ariadne and Paste a link:
 * receive the page, stash it in the browser, then go to Write (or sign-in
 * first — the stash survives it). */
function CapturePage() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const go = () =>
      supabase.auth.getSession().then(({ data }) => {
        navigate({ to: data.session ? "/write" : "/auth", replace: true });
      });

    const q = new URLSearchParams(window.location.search);
    const shared = readShared(q);
    if (shared.url || shared.text) {
      history.replaceState(null, "", "/capture");
      void supabase.auth.getSession().then(async ({ data }) => {
        if (data.session && shared.url) stash(await enrich(shared));
        else stash({ ...shared, pending: !!shared.url });
        void go();
      });
      return;
    }

    const raw = window.location.hash.slice(1);
    if (raw) {
      try { stash(JSON.parse(decodeURIComponent(raw))); } catch { /* broken link */ }
      history.replaceState(null, "", "/capture");
      void go();
      return;
    }

    const fromBookmark = q.has("bm");
    const opener = window.opener as Window | null;
    if (!fromBookmark || !opener) {
      if (fromBookmark) setFailed(true);
      else void go();
      return;
    }

    let done = false;
    const onMsg = (e: MessageEvent) => {
      if (done || e.source !== opener) return;
      const m = e.data as { type?: string; d?: Partial<Incoming> } | null;
      if (!m || m.type !== "ariadne:page" || !m.d) return;
      done = true;
      stash(m.d);
      try { opener.postMessage("ariadne:got", "*"); } catch { /* tab closed */ }
      history.replaceState(null, "", "/capture");
      void go();
    };
    window.addEventListener("message", onMsg);
    // "ready" carries no data, so any origin may hear it.
    const ping = () => { try { opener.postMessage("ariadne:ready", "*"); } catch { /* closed */ } };
    ping();
    const t = window.setInterval(ping, 300);
    const stop = window.setTimeout(() => {
      window.clearInterval(t);
      if (!done) setFailed(true);
    }, 15000);
    return () => {
      window.removeEventListener("message", onMsg);
      window.clearInterval(t);
      window.clearTimeout(stop);
    };
  }, [navigate]);

  return (
    <main className="stream">
      <div className="inner" style={{ alignItems: "center", textAlign: "center", paddingTop: "12vh" }}>
        <p style={{ margin: 0, fontSize: 17, fontWeight: 300 }}>
          {failed
            ? "The page didn’t come through. Go back to it and click Capture to Ariadne again."
            : "Bringing it in…"}
        </p>
      </div>
    </main>
  );
}
