import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Entry } from "@/components/Entry";
import { LogoMark } from "@/components/Logo";
import { groupByDay } from "@/lib/items";
import { getPublicDemo } from "@/lib/publicDemo.functions";

const demoQuery = () => queryOptions({ queryKey: ["public-demo"], queryFn: () => getPublicDemo() });

const TITLE = "Demo thread · Ariadne’s Thread";
const DESC = "A sample thread of notes, captured articles, marks and an AI synthesis — read only.";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://ariadne-thread.lovable.app/og-card.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://ariadne-thread.lovable.app/og-card.jpg" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(demoQuery()),
  component: DemoView,
});

function DemoView() {
  const { data } = useSuspenseQuery(demoQuery());
  const shown = useMemo(() => [...data.items].reverse(), [data.items]); // oldest first
  const known = useMemo(() => new Set(data.items.map((i) => i.id)), [data.items]);

  useEffect(() => {
    document.body.classList.add("mode-reading");
    return () => document.body.classList.remove("mode-reading");
  }, []);

  const jump = (id: string) =>
    document.getElementById(`demo-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <header className="topbar">
        <Link to="/" className="logo">
          <LogoMark />
          <span>Ariadne’s Thread</span>
        </Link>
        <span className="mono demoTag">Demo · read only</span>
        <div className="spacer" />
        <Link to="/auth" className="btn primary" style={{ textDecoration: "none" }}>
          Start your own
        </Link>
      </header>
      <main className="stream">
        <div className="inner">
          {groupByDay(shown).map((g) => (
            <section key={g.key}>
              <div className="dayDivider"><span>{g.label}</span></div>
              <div className="thread">
                {g.items.map((it) => (
                  <div key={it.id} id={`demo-${it.id}`}>
                    <Entry item={it} annots={data.annots.filter((a) => a.item_id === it.id)}
                      knownIds={known} onSourceItem={jump} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
