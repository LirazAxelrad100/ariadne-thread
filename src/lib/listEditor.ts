// Rich list editing for contentEditable boxes. Notes are stored as plain text:
// "- " bullets, "1. " numbers, two spaces per nesting level.

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const LINE = /^(\s*)([-*•]|\d+\.)\s+(.*)$/;

/** Plain text -> HTML with real nested <ul>/<ol>. Non-list lines become <div>s. */
export function mdToHtml(text: string, plainLines = false): string {
  let out = "";
  const stack: Array<"ul" | "ol"> = [];
  const close = (to: number) => { while (stack.length > to) out += `</li></${stack.pop()}>`; };
  for (const line of text.split("\n")) {
    const m = line.match(LINE);
    if (m) {
      const level = Math.floor((m[1] ?? "").length / 2);
      const kind = /\d/.test(m[2] ?? "") ? "ol" : "ul";
      if (level + 1 > stack.length) {
        while (stack.length < level + 1) {
          const start = kind === "ol" && stack.length === level ? ` start="${parseInt(m[2] ?? "1")}"` : "";
          out += `<${kind}${start}><li>`;
          stack.push(kind);
        }
      } else {
        close(level + 1);
        if (stack[level] !== kind) { close(level); out += `<${kind}><li>`; stack.push(kind); }
        else out += "</li><li>";
      }
      out += esc(m[3] ?? "");
    } else {
      close(0);
      out += plainLines ? (line.trim() ? `<p>${esc(line)}</p>` : "") : `<div>${line ? esc(line) : "<br>"}</div>`;
    }
  }
  close(0);
  return out;
}

/** DOM of an editable box -> plain text. Empty list items are dropped. */
export function domToMd(root: HTMLElement): string {
  const lines: string[] = [];
  let cur = "";
  let open = false;
  const push = () => { if (open) lines.push(cur); cur = ""; open = false; };
  const walkList = (list: Element, depth: number) => {
    let n = parseInt(list.getAttribute("start") ?? "1") || 1;
    for (const li of Array.from(list.children)) {
      if (li.tagName !== "LI") { if (/^(UL|OL)$/.test(li.tagName)) walkList(li, depth + 1); continue; }
      let text = "";
      const nested: Element[] = [];
      li.childNodes.forEach((c) => {
        if (c instanceof Element && /^(UL|OL)$/.test(c.tagName)) nested.push(c);
        else text += c.textContent ?? "";
      });
      text = text.replace(/\u00a0/g, " ").replace(/\n/g, " ").trimEnd();
      if (text.trim()) lines.push(`${"  ".repeat(depth)}${list.tagName === "OL" ? `${n++}.` : "-"} ${text.trim()}`);
      nested.forEach((l) => walkList(l, depth + 1));
    }
  };
  const walk = (node: Node) => {
    node.childNodes.forEach((c) => {
      if (c.nodeType === Node.TEXT_NODE) { cur += (c.textContent ?? "").replace(/\u00a0/g, " "); open = true; }
      else if (c instanceof Element) {
        if (c.tagName === "BR") { open = true; push(); }
        else if (/^(UL|OL)$/.test(c.tagName)) { push(); walkList(c, 0); }
        else if (/^(DIV|P)$/.test(c.tagName)) { push(); walk(c); if (open || !c.textContent) { open = true; push(); } }
        else { walk(c); }
      }
    });
  };
  walk(root);
  push();
  return lines.join("\n").replace(/\n+$/, "");
}

function inList(node: Node | null, root: HTMLElement) {
  for (let n = node; n && n !== root; n = n.parentNode) if (n instanceof Element && n.tagName === "LI") return true;
  return false;
}

/** After typing: "- ", "* " or "1. " at the start of a line turns into a list. */
export function listOnInput(root: HTMLElement) {
  const sel = window.getSelection();
  const node = sel?.anchorNode;
  if (!sel || !node || node.nodeType !== Node.TEXT_NODE || inList(node, root)) return;
  const t = node.textContent ?? "";
  const m = t.match(/^([-*]|\d+\.)[\s\u00a0]/);
  if (!m || sel.anchorOffset !== m[0].length) return;
  const prev = node.previousSibling;
  if (prev && !(prev instanceof Element && prev.tagName === "BR")) return;
  const r = document.createRange();
  r.setStart(node, 0);
  r.setEnd(node, m[0].length);
  sel.removeAllRanges();
  sel.addRange(r);
  document.execCommand("delete");
  document.execCommand(/\d/.test(m[1] ?? "") ? "insertOrderedList" : "insertUnorderedList");
}

/** Tab / Shift+Tab nest list items. Returns true when handled. */
export function listOnKeyDown(e: React.KeyboardEvent, root: HTMLElement) {
  if (e.key !== "Tab") return false;
  e.preventDefault();
  if (inList(window.getSelection()?.anchorNode ?? null, root)) document.execCommand(e.shiftKey ? "outdent" : "indent");
  return true;
}

/** Paste as plain text. */
export function plainPaste(e: React.ClipboardEvent) {
  e.preventDefault();
  document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
}
