import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Fetch a public page for "Paste a link" / "Share to Ariadne" and pull out
 * title, writer and readable text. Signed-in users only. Pages behind a login
 * come back with whatever is public (often just the title). */
export const fetchPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ url: z.string().trim().url().max(2000) }).parse(d))
  .handler(async ({ data }) => {
    const u = new URL(data.url);
    if (!/^https?:$/.test(u.protocol) || isPrivateHost(u.hostname)) throw new Error("This link can't be opened.");
    let html = "";
    try {
      const res = await fetch(u.toString(), {
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; AriadneThread/1.0; +https://ariadne-thread.lovable.app)",
          accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok && (res.headers.get("content-type") ?? "").includes("html")) {
        html = (await res.text()).slice(0, 2_000_000);
      }
    } catch { /* unreachable page: fall back to the link alone */ }
    return extract(html, u.toString());
  });

function isPrivateHost(h: string) {
  return /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|\[?f[cd])/i.test(h) || h.endsWith(".local") || h.endsWith(".internal");
}

function decode(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&rsquo;/g, "\u2019").replace(/&lsquo;/g, "\u2018").replace(/&rdquo;/g, "\u201d").replace(/&ldquo;/g, "\u201c")
    .replace(/&mdash;/g, "\u2014").replace(/&ndash;/g, "\u2013").replace(/&hellip;/g, "\u2026")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function meta(html: string, key: string) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  const c = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return c ? decode(c).trim() : "";
}

export function extract(html: string, url: string) {
  const strip = (s: string) => decode(s.replace(/<[^>]+>/g, "")).replace(/[ \t]+/g, " ").trim();
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const title = meta(html, "og:title") || (h1 ? strip(h1) : "") || strip(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");

  const nu = (v: string) => cleanWriter(/^https?:/.test(v) ? "" : v);
  const relAuthor = html.match(/<a[^>]*rel=["']author["'][^>]*>([\s\S]*?)<\/a>/i)?.[1];
  // In-page byline links (/author/, /authors/, /contributor/) and schema.org name spans beat site-wide meta tags.
  const linkAuthor = html.match(/<a[^>]+href=["'][^"']*\/(?:authors?|contributors?|writers?)\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/i)?.[1];
  const propName = html.match(/property=["']author["'][^>]*>[\s\S]{0,300}?property=["']name["'][^>]*>([\s\S]*?)<\//i)?.[1];
  const bylineEl = html.match(/<(?:p|div|span)[^>]+class=["'][^"']*\bbyline\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|div|span)>/i)?.[1];
  let writer = nu(relAuthor ? strip(relAuthor) : "") || nu(propName ? strip(propName) : "") || nu(linkAuthor ? strip(linkAuthor) : "") || nu(bylineEl ? strip(bylineEl) : "")
    || nu(meta(html, "author")) || nu(meta(html, "sailthru.author")) || nu(meta(html, "parsely-author")) || nu(meta(html, "article:author"));
  if (!writer) {
    for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        let o = JSON.parse(m[1] ?? "");
        if (Array.isArray(o)) o = o[0];
        if (o?.["@graph"]) o = o["@graph"].find((g: { author?: unknown }) => g.author) ?? o["@graph"][0];
        const a = o?.author ?? o?.creator;
        const n = (Array.isArray(a) ? a[0] : a)?.name;
        if (n) { writer = String(n); break; }
      } catch { /* bad json */ }
    }
  }
  writer = cleanWriter(writer);

  let body = html.replace(/<(script|style|noscript|svg|nav|aside|footer|header|form|figure|iframe|button)[\s\S]*?<\/\1>/gi, "");
  const scope =
    body.match(/<div[^>]+class=["'][^"']*\bbody markup\b[^"']*["'][^>]*>([\s\S]*)/i)?.[1] ??
    body.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ??
    body.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ??
    body.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? "";
  const paras = [...scope.matchAll(/<(p|li|h2|h3|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => ((m[1] ?? "").toLowerCase() === "li" ? "- " : "") + strip(m[2] ?? ""))
    .filter((t) => t.replace(/^- /, "").length > 1 && t !== title);
  let text = paras.join("\n\n");
  const end = text.search(/\n\s*(share this post|discussion about this post|ready for more\?|related (stories|articles)|you might also like|subscribe to)/i);
  if (end > 0) text = text.slice(0, end);
  const dekEl =
    html.match(/<div[^>]+data-fp-dek[^>]*>([\s\S]*?)<\/div>/i)?.[1] ??
    html.match(/<(?:div|p|h2)[^>]+class=["'][^"']*(?:article-dek|article-subtitle|entry__subtitle)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|p|h2)>/i)?.[1] ?? "";
  const dek = (dekEl ? strip(dekEl) : "") || meta(html, "og:description") || meta(html, "description");
  if (!text) text = dek;
  else if (dek.length > 20 && !text.includes(dek.slice(0, 40)) && !/(\u2026|\.\.\.)$/.test(dek)) text = dek + "\n\n" + text;

  return { url, title: title.slice(0, 300), writer: writer.slice(0, 120), text: text.trim().slice(0, 60000) };
}

/** Strip "By"/"Author:" labels; drop URLs and site/department names that CMSs put in author tags. */
export function cleanWriter(v: string) {
  const w = (v || "").replace(/\s+/g, " ").trim().replace(/^(by|author:?|written by)\s+/i, "").replace(/^author:\s*/i, "").trim();
  if (/^https?:/.test(w) || w.length > 80 || w.includes("|")) return "";
  if (/\b(marketing|communications|web team|staff|editorial|newsroom|university of|magazine|admin)\b/i.test(w)) return "";
  return w;
}
