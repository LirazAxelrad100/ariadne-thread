import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Item = {
  id: string;
  type: string;
  is_synthesis: boolean;
  title: string | null;
  body: string;
  source_url: string | null;
  source_label: string | null;
  writer: string | null;
  why: string | null;
  author_me: boolean;
  synthesis: unknown;
  item_date: string;
};

const COLS = "id, type, is_synthesis, title, body, source_url, source_label, writer, why, author_me, synthesis, item_date";

/** Spec: Synthesize needs at least this many items. */
export const SYNTH_MIN = 5;

export const itemsQuery = () =>
  queryOptions({
    queryKey: ["items"],
    queryFn: async (): Promise<Item[]> => {
      const { data, error } = await supabase.from("items").select(COLS).order("item_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });

export const itemQuery = (id: string) =>
  queryOptions({
    queryKey: ["items", id],
    queryFn: async (): Promise<Item | null> => {
      const { data, error } = await supabase.from("items").select(COLS).eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Item | null;
    },
  });

export function monthKey(d: Date | string) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y!, m! - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/** "Sep" — the month strip's short labels. */
export function monthShort(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y!, m! - 1, 1).toLocaleDateString("en-GB", { month: "short" });
}

/** Month names for a signpost line, nearest first, the year only when it
 *  isn't the year on screen: "September, August and July". */
export function monthNames(keys: string[], near: string) {
  const parts = keys.map((k) => {
    const name = new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, 1)
      .toLocaleDateString("en-GB", { month: "long" });
    return k.slice(0, 4) === near.slice(0, 4) ? name : `${name} ${k.slice(0, 4)}`;
  });
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}


/** "Wednesday · 14 October" */
export function dayLabel(d: Date | string) {
  const x = new Date(d);
  const wd = x.toLocaleDateString("en-GB", { weekday: "long" });
  const dm = x.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  return `${wd} · ${dm}`;
}

export function groupByDay(items: Item[]) {
  const groups: { key: string; label: string; items: Item[] }[] = [];
  for (const it of items) {
    const key = new Date(it.item_date).toDateString();
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) { g = { key, label: dayLabel(it.item_date), items: [] }; groups.push(g); }
    g.items.push(it);
  }
  return groups;
}

export function wordCount(t: string) {
  return t.trim() ? t.trim().split(/\s+/).length : 0;
}

export function hostOf(url: string | null) {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}
