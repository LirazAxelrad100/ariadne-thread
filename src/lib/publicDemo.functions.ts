import { createServerFn } from "@tanstack/react-start";
import type { Item } from "@/lib/items";
import type { Annot } from "@/lib/marks";

// The judges' demo account. Its thread is shown read-only to every visitor at /demo.
const DEMO_USER_ID = "a65f4767-c88a-4951-9bd6-0cd4c80b5d23";
const COLS = "id, type, is_synthesis, title, body, source_url, source_label, writer, why, author_me, synthesis, item_date";

/** Public, read-only: returns only the demo account's items and marks, nothing else. */
export const getPublicDemo = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [items, annots] = await Promise.all([
    supabaseAdmin.from("items").select(COLS).eq("user_id", DEMO_USER_ID).order("item_date", { ascending: false }),
    supabaseAdmin.from("annotations")
      .select("id, item_id, quote, note, start_offset, end_offset, created_at")
      .eq("user_id", DEMO_USER_ID),
  ]);
  if (items.error) throw new Error("Could not load the demo");
  if (annots.error) throw new Error("Could not load the demo");
  return { items: (items.data ?? []) as Item[], annots: (annots.data ?? []) as unknown as Annot[] };
});
