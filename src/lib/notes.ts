import { supabase } from "@/integrations/supabase/client";

export type NoteRow = { id: string; body: string; item_date: string };

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function fetchTodayNotes(): Promise<NoteRow[]> {
  const { data, error } = await supabase
    .from("items")
    .select("id, body, item_date")
    .eq("type", "note")
    .gte("item_date", startOfToday().toISOString())
    .order("item_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Save a note's text. Blank text deletes the note (or never creates it). Returns the id, or null if nothing is stored. */
export async function saveNote(id: string | null, body: string, startedAt: string): Promise<string | null> {
  if (!body.trim()) {
    if (id) await supabase.from("items").delete().eq("id", id);
    return null;
  }
  if (id) {
    const { error } = await supabase.from("items").update({ body }).eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase
    .from("items")
    .insert({ type: "note", body, item_date: startedAt })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export function hhmm(d: Date | string) {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** Minimal markdown: blank-line paragraphs, "- " / "* " lines become bullets. */
export function toBlocks(text: string): Array<{ kind: "p"; text: string } | { kind: "ul"; items: string[] }> {
  const blocks: Array<{ kind: "p"; text: string } | { kind: "ul"; items: string[] }> = [];
  for (const chunk of text.split(/\n{2,}/)) {
    let para: string[] = [];
    let list: string[] = [];
    const flushP = () => { if (para.length) blocks.push({ kind: "p", text: para.join("\n") }); para = []; };
    const flushL = () => { if (list.length) blocks.push({ kind: "ul", items: list }); list = []; };
    for (const line of chunk.split("\n")) {
      const m = line.match(/^\s*[-*•]\s+(.*)$/);
      if (m) { flushP(); list.push(m[1] ?? ""); } else if (line.trim()) { flushL(); para.push(line); }
    }
    flushP(); flushL();
  }
  return blocks;
}
