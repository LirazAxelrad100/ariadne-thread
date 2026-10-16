import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useLayoutEffect, useRef } from "react";
import { Entry } from "@/components/Entry";
import { groupByDay, itemsQuery, monthKey, monthNames } from "@/lib/items";
import { annotationsQuery } from "@/lib/marks";

type Search = { m?: string };

export const Route = createFileRoute("/_authenticated/read")({
  validateSearch: (s: Record<string, unknown>): Search =>
    typeof s["m"] === "string" && /^\d{4}-\d{2}$/.test(s["m"]) ? { m: s["m"] } : {},
  head: () => ({
    meta: [
      { title: "Read · Ariadne’s Thread" },
      { name: "description", content: "Your notes and captures, day by day." },
      { property: "og:title", content: "Read · Ariadne’s Thread" },
      { property: "og:description", content: "Your notes and captures, day by day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(itemsQuery()),
    context.queryClient.ensureQueryData(annotationsQuery()),
  ]),
  component: ReadView,
});

function ReadView() {
  const { data: items } = useSuspenseQuery(itemsQuery());
  const { data: annots } = useSuspenseQuery(annotationsQuery());
  const { m } = Route.useSearch();
  const navigate = useNavigate();
  const month = m ?? (items[0] ? monthKey(items[0].item_date) : monthKey(new Date()));
  // Read runs oldest → newest, top to bottom (user rule); items arrive newest-first.
  const shown = items.filter((i) => monthKey(i.item_date) === month).reverse();
  const streamRef = useRef<HTMLElement>(null);

  // What this month doesn't hold, in the direction you'd read on to it: the
  // months before this one, or — once you're at the oldest — the months after.
  const months = [...new Set(items.map((i) => monthKey(i.item_date)))]; // newest first
  const idx = months.indexOf(month);
  const rest = idx < 0 ? []
    : idx + 1 < months.length ? months.slice(idx + 1)
    : months.slice(0, idx).reverse();
  const restCount = items.filter((i) => rest.includes(monthKey(i.item_date))).length;

  // Scroll to top before paint so switching views never shows a jump.
  useLayoutEffect(() => {
    streamRef.current?.scrollTo({ top: 0 });
  }, [month]);

  if (!items.length) {
    return (
      <main className="stream">
        <div className="inner" style={{ alignItems: "center", textAlign: "center", paddingTop: "12vh" }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 300 }}>Nothing to read yet.</p>
          <p style={{ margin: "4px 0 0", fontSize: 15, color: "var(--ink-recede)" }}>
            Your notes and captures will gather here, day by day.
          </p>
          <p style={{ marginTop: 14, fontSize: 15 }}>
            <Link to="/write" style={{ color: "var(--ink)" }}>Write your first thought</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    // key forces a fresh node: React would otherwise reuse Write's <main>
    // and carry its scrolled-down position into Read.
    <main className="stream" key={`read-${month}`} ref={streamRef}>
      <div className="inner">
        {groupByDay(shown).map((g) => (
          <section key={g.key}>
            <div className="dayDivider"><span>{g.label}</span></div>
            <div className="thread">
              {g.items.map((it) => (
                <Entry key={it.id} item={it} annots={annots.filter((a) => a.item_id === it.id)}
                  onOpen={() => navigate({ to: "/item/$id", params: { id: it.id } })} />
              ))}
            </div>
          </section>
        ))}

        {/* The month ends here; the timeline doesn't. One quiet line naming the
            months still off screen, which jumps to the nearest of them. */}
        {rest.length > 0 && (
          <div className="monthSign">
            <button
              type="button"
              className="moreBtn"
              onClick={() => navigate({ to: "/read", search: { m: rest[0]! } })}
            >
              {monthNames(rest, month)} {rest.length === 1 ? "holds" : "hold"} {restCount} more{" "}
              {restCount === 1 ? "entry" : "entries"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
