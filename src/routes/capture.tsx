import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { INCOMING_KEY, type Incoming } from "@/lib/notes";

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

/** Landing spot for the bookmarklet: stash the page in the browser, then go to
 * Write (or sign-in first — the stash survives it). */
function CapturePage() {
  const navigate = useNavigate();
  useEffect(() => {
    const raw = window.location.hash.slice(1);
    if (raw) {
      try {
        const d = JSON.parse(decodeURIComponent(raw)) as Partial<Incoming>;
        const inc: Incoming = {
          url: String(d.url ?? "").slice(0, 2000),
          title: String(d.title ?? "").slice(0, 300),
          text: String(d.text ?? "").slice(0, 60000),
          writer: String(d.writer ?? "").slice(0, 120),
        };
        localStorage.setItem(INCOMING_KEY, JSON.stringify(inc));
      } catch { /* ignore a broken link */ }
      history.replaceState(null, "", "/capture");
    }
    supabase.auth.getSession().then(({ data }) => {
      navigate({ to: data.session ? "/write" : "/auth", replace: true });
    });
  }, [navigate]);

  return (
    <main className="stream">
      <div className="inner" style={{ alignItems: "center", textAlign: "center", paddingTop: "12vh" }}>
        <p style={{ margin: 0, fontSize: 17, fontWeight: 300 }}>Bringing it in…</p>
      </div>
    </main>
  );
}
