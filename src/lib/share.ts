import { fetchPage } from "@/lib/fetchPage.functions";
import type { Incoming } from "@/lib/notes";

/** A shared or pasted link: phones send it as ?url=, ?text= or both (Android
 * often puts the link inside text). Pull the link out; any other text is the
 * passage the reader selected. */
export function readShared(q: URLSearchParams) {
  const rawText = (q.get("text") ?? "").trim();
  let url = (q.get("url") ?? "").trim();
  let text = rawText;
  if (!url) {
    const m = rawText.match(/https?:\/\/\S+/);
    if (m) { url = m[0]; text = rawText.replace(m[0], "").trim(); }
  }
  return { url, text, title: (q.get("title") ?? "").trim() };
}

/** Fill in title/writer/text from the page itself. The reader's own selection wins over the whole article. */
export async function enrich(s: { url: string; text: string; title: string }): Promise<Incoming> {
  let page = { url: s.url, title: "", writer: "", text: "" };
  try { page = await fetchPage({ data: { url: s.url } }); } catch { /* keep the link alone */ }
  return { url: s.url, title: page.title || s.title, writer: page.writer, text: s.text || page.text };
}

