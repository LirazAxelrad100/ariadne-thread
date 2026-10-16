import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Entry } from "@/components/Entry";
import type { MarkActions } from "@/components/MarkedBody";
import { supabase } from "@/integrations/supabase/client";
import { dayLabel, itemQuery } from "@/lib/items";
import { annotationsQuery } from "@/lib/marks";

export const Route = createFileRoute("/_authenticated/item/$id")({
  validateSearch: (search: Record<string, unknown>): { from?: "write" | "read" } => ({
    from: search.from === "write" ? "write" : search.from === "read" ? "read" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entry · Ariadne’s Thread" },
      { name: "description", content: "One entry, in full." },
      { property: "og:title", content: "Entry · Ariadne’s Thread" },
      { property: "og:description", content: "One entry, in full." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context, params }) => Promise.all([
    context.queryClient.ensureQueryData(itemQuery(params.id)),
    context.queryClient.ensureQueryData(annotationsQuery()),
  ]),
  component: ItemView,
});

function ItemView() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { from } = Route.useSearch();
  const backTo = from === "write" ? "/write" : "/read";
  const { data: item } = useSuspenseQuery(itemQuery(id));
  const { data: all } = useSuspenseQuery(annotationsQuery());
  const annots = all.filter((a) => a.item_id === id);
  const locked = annots.length > 0;
  const saveTimer = useRef<number | undefined>(undefined);
  const pending = useRef<string | null>(null);

  // Esc goes back (unless typing a comment, which handles its own Esc).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const t = e.target as HTMLElement;
      if (t.closest(".annotInput")) return;
      navigate({ to: backTo });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, backTo]);

  async function saveBody(body: string) {
    window.clearTimeout(saveTimer.current);
    pending.current = null;
    if (!body.trim()) return; // never wipe an opened item by clearing it
    await supabase.from("items").update({ body }).eq("id", id);
    await qc.invalidateQueries({ queryKey: ["items"] });
  }

  // Flush unsaved edits when leaving.
  useEffect(() => () => { if (pending.current !== null) void saveBody(pending.current); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function onEdit(body: string) {
    pending.current = body;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void saveBody(body), 1000);
  }

  const refreshMarks = () => qc.invalidateQueries({ queryKey: ["annotations"] });

  const actions: MarkActions = {
    saveBody,
    create: async ({ start, end, quote, note }) => {
      const { data, error } = await supabase
        .from("annotations")
        .insert({ item_id: id, start_offset: start, end_offset: end, quote, note })
        .select("id")
        .single();
      await refreshMarks();
      return error ? null : data.id;
    },
    setNote: async (aid, note) => {
      await supabase.from("annotations").update({ note }).eq("id", aid);
      await refreshMarks();
    },
    remove: async (aid) => {
      await supabase.from("annotations").delete().eq("id", aid);
      await refreshMarks();
    },
  };

  const [asking, setAsking] = useState(false);
  async function deleteItem() {
    window.clearTimeout(saveTimer.current);
    pending.current = null;
    await supabase.from("annotations").delete().eq("item_id", id);
    await supabase.from("items").delete().eq("id", id);
    await Promise.all([qc.invalidateQueries({ queryKey: ["items"] }), refreshMarks()]);
    navigate({ to: backTo });
  }

  return (
    <main className="stream">
      <div className="inner">
        <div className="itemTop">
          <Link to={backTo} className="back" aria-label="Back">←</Link>
          {item && <div className="dayDivider" style={{ flex: 1, marginBottom: 0 }}><span>{dayLabel(item.item_date)}</span></div>}
          {item && (
            <div className="itemDel">
              {asking ? (
                <>
                  <span>Delete this?</span>
                  <button type="button" className="confirm" onClick={() => void deleteItem()}>Delete</button>
                  <button type="button" onClick={() => setAsking(false)}>Cancel</button>
                </>
              ) : (
                <button type="button" onClick={() => setAsking(true)}>Delete</button>
              )}
            </div>
          )}
        </div>
        {item ? (
          <>
            {locked && <p className="lockLine">Text is locked while it has marks. Delete all marks to edit again.</p>}
            <div className="thread">
              <Entry item={item} full annots={annots} actions={actions} editable={!locked} onEdit={onEdit} />
            </div>
          </>
        ) : (
          <p className="empty">This entry is no longer here.</p>
        )}
      </div>
    </main>
  );
}
