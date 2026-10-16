import { supabase } from "@/integrations/supabase/client";
import type { Item } from "@/lib/items";

export type NoteRow = Item;

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Today's notes and captures (Write shows both above the box). */
export async function fetchTodayNotes(): Promise<NoteRow[]> {
  const { data, error } = await supabase
    .from("items")
    .select("id, type, is_synthesis, title, body, source_url, source_label, writer, why, author_me, synthesis, item_date")
    .in("type", ["note", "capture"])
    .eq("is_synthesis", false)
    .gte("item_date", startOfToday().toISOString())
    .order("item_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as NoteRow[];
}

/** Source details of a capture; null for a plain note. */
export type CaptureMeta = {
  title: string; source_url: string; writer: string; author_me: boolean; why: string;
};

function capFields(cap: CaptureMeta) {
  return {
    title: cap.title.trim() || null,
    source_url: cap.source_url.trim() || null,
    writer: cap.writer.trim() || null,
    author_me: cap.author_me,
    why: cap.why.trim() || null,
  };
}

/** Save a note's (or capture's) text. Blank text deletes it (or never creates it). Returns the id, or null if nothing is stored. */
export async function saveNote(id: string | null, body: string, startedAt: string, cap: CaptureMeta | null = null): Promise<string | null> {
  if (!body.trim()) {
    if (id) await supabase.from("items").delete().eq("id", id);
    return null;
  }
  const extra = cap ? { type: "capture" as const, ...capFields(cap) } : {};
  if (id) {
    const { error } = await supabase.from("items").update({ body, ...extra }).eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase
    .from("items")
    .insert({ type: "note" as const, body, item_date: startedAt, ...extra })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** A small sample set for a brand-new account ("Explore the demo entries" on
 *  an empty Read). Inserts only while the account has no items at all, so it
 *  can never duplicate or overwrite anything; returns how many were added. */
export async function loadDemoItems(): Promise<number> {
  const { count, error: countError } = await supabase.from("items").select("id", { count: "exact", head: true });
  if (countError) throw countError;
  if (count) return 0;
  const at = (daysAgo: number, h: number, m: number) => {
    const d = new Date(Date.now() - daysAgo * 86_400_000);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const rows = [
    {
      type: "note" as const,
      item_date: at(0, 9, 12),
      body: "An idea I couldn't stop thinking about today:\n\n- most tools ask me to finish a thought before I know what it is\n- this one lets it stay half-formed\n\nWhat if the note is the unit, not the document?",
    },
    {
      type: "capture" as const,
      item_date: at(1, 21, 40),
      title: "The Case for Slow Reading",
      writer: "Demo Library",
      source_url: "https://example.com/slow-reading",
      why: "The part about re-reading being a form of attention, not a failure of memory.",
      body: "We treat re-reading as an admission that the first pass failed. But attention is not a one-time payment. The second reading is where the text starts answering questions you didn't know you had.\n\nSpeed is a metric for machines. Understanding has its own clock, and it ticks in returns.",
    },
    {
      type: "note" as const,
      item_date: at(2, 8, 5),
      body: "Morning pages, day four. The resistance is not at the start of writing, it's at the start of deciding what the writing is about. Skip the deciding.",
    },
    {
      type: "capture" as const,
      item_date: at(3, 17, 22),
      title: "Tools Should Dissolve",
      writer: "Demo Library",
      source_url: "https://example.com/tools-dissolve",
      why: "A tool you notice is a tool that's in the way.",
      body: "The best interface is the one you stop perceiving. A pencil does not have a user experience; it has a presence so quiet that the thought and the mark feel like one event.\n\nSoftware rarely earns this. It wants to be seen, to be engaged with, to notify. Every badge is a small confession that the tool doubts its own necessity.",
    },
    {
      type: "note" as const,
      item_date: at(4, 23, 3),
      body: "Late thought: the timeline is the right shape for a mind. Not folders, not graphs. Just what came after what, with the marks I left along the way.",
    },
    {
      type: "capture" as const,
      item_date: at(5, 12, 47),
      title: "On Marginalia",
      writer: "Demo Library",
      source_url: "https://example.com/marginalia",
      why: "Marks as a conversation with the text — exactly what the mark button is for.",
      body: "A marked book is a conversation. The underline says: this. The exclamation says: really? The note in the margin says: and here is what it stirred in me.\n\nReaders who never mark are polite guests. Readers who mark have moved in.",
    },
  ];
  const { error } = await supabase.from("items").insert(rows);
  if (error) throw error;
  return rows.length;
}

export const INCOMING_KEY = "ariadne:incoming";
export type Incoming = { url: string; title: string; text: string; writer: string };

export function hhmm(d: Date | string) {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export type ListItem = { text: string; level: number; n?: number | undefined };
export type Block = { kind: "p"; text: string } | { kind: "ul" | "ol"; items: ListItem[] };

/** Minimal markdown: blank-line paragraphs, "- " / "* " bullets, "1. " numbered, two-space indent = second level. */
export function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of text.split(/\n{2,}/)) {
    let para: string[] = [];
    let list: { kind: "ul" | "ol"; items: ListItem[] } | null = null;
    const flushP = () => { if (para.length) blocks.push({ kind: "p", text: para.join("\n") }); para = []; };
    const flushL = () => { if (list?.items.length) blocks.push(list); list = null; };
    for (const line of chunk.split("\n")) {
      const m = line.match(/^(\s*)([-*•]|\d+\.)\s+(.*)$/);
      if (m) {
        flushP();
        const kind = /\d/.test((m[2] ?? "")) ? "ol" : "ul";
        if (list && list.kind !== kind) flushL();
        if (!list) list = { kind, items: [] };
        list.items.push({ text: m[3] ?? "", level: (m[1] ?? "").length >= 2 ? 1 : 0, n: kind === "ol" ? parseInt((m[2] ?? "")) : undefined });
      } else if (line.trim()) { flushL(); para.push(line); }
    }
    flushP(); flushL();
  }
  return blocks;
}
