import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Entry } from "@/components/Entry";
import { groupByDay, itemsQuery, monthKey } from "@/lib/items";

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
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(itemsQuery()),
  component: ReadView,
});

function ReadView() {
  const { data: items } = useSuspenseQuery(itemsQuery());
  const { m } = Route.useSearch();
  const navigate = useNavigate();
  const month = m ?? (items[0] ? monthKey(items[0].item_date) : monthKey(new Date()));
  const shown = items.filter((i) => monthKey(i.item_date) === month);

  if (!items.length) {
    return (
      <main className="stream">
        <div className="inner" style={{ alignItems: "center", textAlign: "center", paddingTop: "12vh" }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 300 }}>Nothing to read yet.</p>
          <p style={{ margin: "4px 0 0", fontSize: 15, color: "var(--ink-recede)" }}>
            Your notes and captures will gather here, day by day, newest first.
          </p>
          <p style={{ marginTop: 14, fontSize: 15 }}>
            <Link to="/write" style={{ color: "var(--ink)" }}>Write your first thought</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="stream">
      <div className="inner">
        {groupByDay(shown).map((g) => (
          <section key={g.key}>
            <div className="dayDivider"><span>{g.label}</span></div>
            <div className="thread">
              {g.items.map((it) => (
                <Entry key={it.id} item={it}
                  onOpen={() => navigate({ to: "/item/$id", params: { id: it.id } })} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
