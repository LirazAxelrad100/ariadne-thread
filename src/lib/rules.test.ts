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
  it("takes the article byline over a site-wide author tag", () => {
    const r = extract(`<meta name="author" content="Marketing Communications: Web | University of Notre Dame"><p property="author" typeof="Person"><span>Author:</span> <span property="name"><a href="/stories/authors/kerry-temple/">Kerry Temple ’74</a></span></p>`, "https://x.org/a");
    expect(r.writer).toBe("Kerry Temple ’74");
  });
  it("reads a contributor byline", () => {
    expect(extract(`<div class="byline">By <a href="/contributor/john-freeman/">John Freeman</a></div>`, "https://x.org/a").writer).toBe("John Freeman");
  });
  it("skips a 'Contributors' menu link for the real byline", () => {
    expect(extract(`<nav><a href="https://x.org/contributors/">Contributors</a></nav><main><a href="/contributors/">Contributors</a><div class="byline">By John Freeman</div></main>`, "https://x.org/a").writer).toBe("John Freeman");
  });
});
