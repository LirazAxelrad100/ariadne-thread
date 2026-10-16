import { describe, expect, it } from "vitest";
import { segments, toBody, toRendered } from "./marks";

describe("mark offsets", () => {
  const body = "Intro line\n\n- first bullet\n- second";
  const segs = segments(body);

  it("maps rendered text back to body offsets, skipping bullet prefixes", () => {
    // rendered: "Intro line" + "first bullet" + "second"
    const start = toBody(segs, 10, false); // "f" of "first"
    expect(body.slice(start, start + 5)).toBe("first");
  });

  it("a mark across two bullets becomes two rendered pieces", () => {
    const s = body.indexOf("bullet");
    const e = body.indexOf("second") + 3;
    expect(toRendered(segs, s, e)).toEqual([[16, 22], [22, 25]]);
  });
});

describe("synthesis bodies", () => {
  it("skips the header prefix and the From line when mapping marks", () => {
    const body = "## Themes\nFear grows.\nFrom: [[abc|A note…]]\n- Example";
    const segs = segments(body, true);
    expect(segs.map((s) => body.slice(s.b, s.b + s.len))).toEqual(["Themes", "Fear grows.", "Example"]);
  });
});
