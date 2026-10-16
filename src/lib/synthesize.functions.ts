import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SYNTH_MIN } from "@/lib/items";

export type SynthResult =
  | { ok: true; id: string }
  | { ok: false; reason: "few"; count: number }
  | { ok: false; reason: "error"; message: string | null };

const SECTIONS = [
  ["themes", "Themes"],
  ["connections", "Connections"],
  ["open_questions", "Open questions"],
  ["contradictions", "Contradictions"],
] as const;

const CAPTURE_CHARS = 6000;

const INSTRUCTIONS = `You read one person's private notes and the articles they captured, and find the threads between them.

Return four lists: themes, connections, open_questions, contradictions.
- themes: recurring subjects. Sort by how many items they appear in, most first.
- connections: non-obvious links between specific items.
- open_questions: questions the person keeps circling without answering.
- contradictions: places where the person's thinking, or their sources, clearly pull against each other.

Each entry: "text" is one or two short sentences. "examples" are 1-3 short bullets pointing at concrete evidence (a phrase, a claim). "sources" are the numbers of the items the entry draws on.

Weighting: the person's own words matter most. NOTE items, "What caught me" lines, MARK passages and especially MARK comments are personal reflection — weight them about 3x higher than raw captured article text. A CAPTURE marked "written by the user" counts as the person's own note.

Rules:
- Use only item numbers from the list. Every entry needs at least one source.
- If nothing clearly fits a list, return it empty. Never invent findings, never manufacture conflicts.
- Be short and concise: at most 4 entries per list, and cite only the 2-4 items that matter most for each entry. Write in English even if items are in other languages.
- Never mention item numbers inside text or examples.`;

type Row = {
  id: string; type: string; title: string | null; body: string; writer: string | null;
  why: string | null; author_me: boolean; item_date: string;
};
type Entry = { text: string; examples: string[]; sources: number[] };

function label(it: Row) {
  const raw = it.type === "capture" && it.title
    ? it.title
    : it.body.replace(/^\s*([-*•]|\d+\.)\s+/gm, "").replace(/\s+/g, " ").trim().split(" ").slice(0, 5).join(" ") + "…";
  return raw.replace(/[[\]|]/g, "").trim() || "Untitled";
}

export const synthesize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SynthResult> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("items")
      .select("id, type, title, body, writer, why, author_me, item_date")
      .eq("is_synthesis", false)
      .order("item_date", { ascending: true });
    if (error) return { ok: false, reason: "error", message: null };
    const items = (rows ?? []) as Row[];
    if (items.length < SYNTH_MIN) return { ok: false, reason: "few", count: items.length };

    const { data: marks } = await supabase.from("annotations").select("item_id, quote, note");
    const byItem = new Map<string, { quote: string; note: string | null }[]>();
    for (const m of marks ?? []) {
      const list = byItem.get(m.item_id) ?? [];
      list.push(m);
      byItem.set(m.item_id, list);
    }

    const input = items.map((it, i) => {
      const own = it.type !== "capture" || it.author_me;
      const head = it.type === "capture"
        ? `[${i + 1}] CAPTURE${it.author_me ? " (written by the user)" : ""} · ${it.item_date.slice(0, 10)} · "${it.title ?? ""}"${it.writer ? ` by ${it.writer}` : ""}`
        : `[${i + 1}] NOTE · ${it.item_date.slice(0, 10)}`;
      const body = own ? it.body : it.body.slice(0, CAPTURE_CHARS);
      const parts = [head, body];
      if (it.why) parts.push(`What caught me: ${it.why}`);
      for (const m of byItem.get(it.id) ?? []) parts.push(`MARK: "${m.quote}"${m.note ? ` — COMMENT: ${m.note}` : ""}`);
      return parts.join("\n");
    }).join("\n\n---\n\n");

    try {
      const [{ streamText, Output, NoObjectGeneratedError }, { createOpenAI }, { z }] = await Promise.all([
        import("ai"), import("@ai-sdk/openai"), import("zod"),
      ]);
      const apiKey = process.env["LOVABLE_API_KEY"];
      if (!apiKey) return { ok: false, reason: "error", message: null };
      let runId: string | undefined;
      const provider = createOpenAI({
        baseURL: "https://ai.gateway.lovable.dev/v1",
        apiKey,
        headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        fetch: async (url, init) => {
          const h = new Headers(init?.headers);
          if (runId) h.set("X-Lovable-AIG-Run-ID", runId);
          const res = await fetch(url, { ...init, headers: h });
          runId ??= res.headers.get("X-Lovable-AIG-Run-ID")?.trim() || undefined;
          return res;
        },
      });
      const entry = z.object({ text: z.string(), examples: z.array(z.string()), sources: z.array(z.number()) });
      const schema = z.object({
        themes: z.array(entry), connections: z.array(entry),
        open_questions: z.array(entry), contradictions: z.array(entry),
      });
      let failure: unknown = null;
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        system: INSTRUCTIONS,
        prompt: `Items (${items.length}):\n\n${input}`,
        output: Output.object({ schema }),
        onError: ({ error: e }) => { failure = e; },
        providerOptions: {
          openai: {
            forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto",
            store: false, include: ["reasoning.encrypted_content"],
          },
        },
      });
      let out: Record<string, Entry[]>;
      try {
        out = (await result.output) as Record<string, Entry[]>;
      } catch (e) {
        if (NoObjectGeneratedError.isInstance(e) && e.text) {
          try { out = JSON.parse(e.text); } catch { throw e; }
        } else throw failure ?? e;
      }

      // Keep only numbers on the list; drop entries left without a source.
      let body = "";
      const used = new Set<number>();
      for (const [key, name] of SECTIONS) {
        const entries = (Array.isArray(out[key]) ? out[key] : [])
          .map((e) => ({ ...e, sources: [...new Set((e.sources ?? []).filter((n) => Number.isInteger(n) && n >= 1 && n <= items.length))] }))
          .filter((e) => e.text?.trim() && e.sources.length);
        if (!entries.length) continue;
        body += `${body ? "\n" : ""}## ${name}\n`;
        for (const e of entries) {
          body += `${e.text.replace(/\s*\n\s*/g, " ").trim()}\n`;
          for (const x of (e.examples ?? []).slice(0, 3)) if (x.trim()) body += `- ${x.replace(/\s*\n\s*/g, " ").trim()}\n`;
          e.sources.forEach((n) => used.add(n));
          body += `From: ${e.sources.map((n) => `[[${items[n - 1]!.id}|${label(items[n - 1]!)}]]`).join(" · ")}\n`;
        }
      }
      if (!body) return { ok: false, reason: "error", message: "No clear threads were found yet." };

      const now = new Date();
      const { data: saved, error: saveErr } = await supabase
        .from("items")
        .insert({
          type: "note", is_synthesis: true, writer: "AI", body: body.trimEnd(), item_date: now.toISOString(),
          title: `Synthesis: ${now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
          synthesis: { count: items.length, sources: used.size },
        })
        .select("id")
        .single();
      if (saveErr) return { ok: false, reason: "error", message: null };
      return { ok: true, id: saved.id };
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode;
      console.error("synthesize failed", status, e);
      const msg = status === 402 || status === 403
        ? ((e as { responseBody?: string }).responseBody?.match(/"message"\s*:\s*"([^"]+)"/)?.[1] ?? null)
        : null;
      return { ok: false, reason: "error", message: msg };
    }
  });
