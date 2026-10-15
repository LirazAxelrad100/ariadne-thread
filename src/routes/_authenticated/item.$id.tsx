import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Entry } from "@/components/Entry";
import { dayLabel, itemQuery } from "@/lib/items";

export const Route = createFileRoute("/_authenticated/item/$id")({
  head: () => ({
    meta: [
      { title: "Entry · Ariadne’s Thread" },
      { name: "description", content: "One entry, in full." },
      { property: "og:title", content: "Entry · Ariadne’s Thread" },
      { property: "og:description", content: "One entry, in full." },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(itemQuery(params.id)),
  component: ItemView,
});

function ItemView() {
  const { id } = Route.useParams();
  const { data: item } = useSuspenseQuery(itemQuery(id));
  return (
    <main className="stream">
      <div className="inner">
        <div className="itemTop">
          <Link to="/read" className="back" aria-label="Back to Read">←</Link>
          {item && <div className="dayDivider" style={{ flex: 1, marginBottom: 0 }}><span>{dayLabel(item.item_date)}</span></div>}
        </div>
        {item ? (
          <div className="thread"><Entry item={item} full /></div>
        ) : (
          <p className="empty">This entry is no longer here.</p>
        )}
      </div>
    </main>
  );
}
