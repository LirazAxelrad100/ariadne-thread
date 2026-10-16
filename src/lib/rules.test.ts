import { describe, expect, it } from "vitest";
import { SYNTH_MIN, wordCount, hostOf } from "@/lib/items";
import { extract } from "@/lib/fetchPage.functions";

describe("product rules", () => {
  it("synthesis needs at least 3 items", () => {
    expect(SYNTH_MIN).toBe(3);
  });

  it("counts words for the 120-word shortening rule", () => {
    expect(wordCount(Array(121).fill("w").join(" "))).toBe(121);
    expect(wordCount("  ")).toBe(0);
  });

  it("shows the site name without www", () => {
    expect(hostOf("https://www.theguardian.com/x")).toBe("theguardian.com");
  });

  it("puts the subtitle above the captured article", () => {
    const html = `<meta property="og:title" content="T"><meta name="author" content="Ann Lee">
      <meta property="og:description" content="A little creamy, a little sweet, and a little spicy.">
      <article><p>First paragraph of the story.</p></article>`;
    const r = extract(html, "https://example.com/a");
    expect(r.writer).toBe("Ann Lee");
    expect(r.text.startsWith("A little creamy, a little sweet, and a little spicy.")).toBe(true);
    expect(r.text).toContain("First paragraph of the story.");
  });
});
