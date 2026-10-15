import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/read")({
  head: () => ({
    meta: [
      { title: "Read · Ariadne’s Thread" },
      { name: "description", content: "Your notes and captures, day by day." },
      { property: "og:title", content: "Read · Ariadne’s Thread" },
      { property: "og:description", content: "Your notes and captures, day by day." },
    ],
  }),
  component: ReadView,
});

function ReadView() {
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
