export type DoLine = { kind: "do" | "dont"; text: string };

/** Parses a dos-and-don'ts line. "+ text" = tick, "x text" / "- text" = cross. */
export function parseDoLine(raw: string): DoLine {
  const line = (raw ?? "").trim();
  const m = /^([+x×✓✗-])\s*(.*)$/i.exec(line);
  if (!m) return { kind: "do", text: line };
  const marker = m[1].toLowerCase();
  const kind: DoLine["kind"] = marker === "+" || marker === "✓" ? "do" : "dont";
  return { kind, text: m[2].trim() };
}
