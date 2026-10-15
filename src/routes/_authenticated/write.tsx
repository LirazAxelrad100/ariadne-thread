import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/write")({
  head: () => ({
    meta: [
      { title: "Write · Ariadne’s Thread" },
      { name: "description", content: "Write whatever is on your mind." },
      { property: "og:title", content: "Write · Ariadne’s Thread" },
      { property: "og:description", content: "Write whatever is on your mind." },
    ],
  }),
  component: WriteView,
});

function WriteView() {
  return (
    <main className="stream">
      <div className="inner">
        <div className="thread" />
      </div>
    </main>
  );
}
