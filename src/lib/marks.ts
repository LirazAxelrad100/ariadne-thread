// Marks and comments are stored as character offsets into an item's plain-text body.
// The rendered body drops list prefixes ("- ", "1. ", indentation) and blank lines,
// so we map between body offsets and offsets into the rendered text.
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Annot = {
  id: string;
  item_id: string;
  quote: string;
  note: string | null;
  start_offset: number;
  end_offset: number;
  created_at: string;
};

const LINE = /^(\s*)([-*•]|\d+\.)\s+(.*)$/;

export type Seg = { b: number; r: number; len: number };

/** Text runs of the body that appear in the rendered text, in order. */
export function segments(body: string): Seg[] {
  const segs: Seg[] = [];
  let pos = 0;
  let r = 0;
  for (const line of body.split("\n")) {
    const m = line.match(LINE);
    const text = m ? (m[3] ?? "") : line;
    const start = pos + line.length - text.length;
    if (text.trim()) {
      segs.push({ b: start, r, len: text.length });
      r += text.length;
    }
    pos += line.length + 1;
  }
  return segs;
}

/** Rendered offset -> body offset. */
export function toBody(segs: Seg[], rp: number, isEnd: boolean): number {
  for (const s of segs) {
    const inside = isEnd ? rp > s.r && rp <= s.r + s.len : rp >= s.r && rp < s.r + s.len;
    if (inside) return s.b + (rp - s.r);
  }
  const last = segs[segs.length - 1];
  return last ? last.b + last.len : 0;
}

/** Body range -> rendered ranges (one per run it crosses). */
export function toRendered(segs: Seg[], start: number, end: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const s of segs) {
    const a = Math.max(start, s.b);
    const z = Math.min(end, s.b + s.len);
    if (z > a) out.push([s.r + (a - s.b), s.r + (z - s.b)]);
  }
  return out;
}

export const annotationsQuery = () =>
  queryOptions({
    queryKey: ["annotations"],
    queryFn: async (): Promise<Annot[]> => {
      const { data, error } = await supabase
        .from("annotations")
        .select("id, item_id, quote, note, start_offset, end_offset, created_at")
        .order("start_offset", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Annot[];
    },
  });

export const writerQuery = () =>
  queryOptions({
    queryKey: ["me", "writer"],
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const m = (data.user?.user_metadata ?? {}) as { full_name?: string; name?: string };
      const full = m.full_name || m.name || data.user?.email?.split("@")[0] || "You";
      return full.split(" ")[0] ?? full;
    },
  });
