/**
 * Minecraft-Texte im Browser: RawMessage ({rawtext:[...]}, translate/with) und die
 * Farbcodes mit §. Alles wird als Textknoten gebaut, nie als HTML - was aus der Datenbank
 * kommt, kann so niemals Code in die Seite schmuggeln.
 */

/** Eine Nachricht samt Uebersetzung zu einem Text mit §-Codes. */
export function flatten(msg, t) {
  if (msg == null) return "";
  if (typeof msg === "string") return msg;
  if (typeof msg === "number") return String(msg);
  if (Array.isArray(msg)) return msg.map((m) => flatten(m, t)).join("");
  if (Array.isArray(msg.rawtext)) return msg.rawtext.map((m) => flatten(m, t)).join("");
  if (typeof msg.text === "string") return msg.text;
  if (typeof msg.translate === "string") {
    const template = t(msg.translate) ?? msg.translate;
    const args = Array.isArray(msg.with) ? msg.with.map((a) => flatten(a, t)) : Array.isArray(msg.with?.rawtext) ? msg.with.rawtext.map((a) => flatten(a, t)) : [];
    return fill(template, args);
  }
  return "";
}

/** %1, %2 ... und %s der Sprachdateien. */
export function fill(template, args) {
  let next = 0;
  return String(template).replace(/%(\d+)(\$s)?|%s|%%/g, (m, n) => {
    if (m === "%%") return "%";
    if (n) return args[Number(n) - 1] ?? "";
    return args[next++] ?? "";
  });
}

/** Farben der §-Codes - auf dunklem Grund etwas aufgehellt, damit alles lesbar bleibt. */
const COLORS = {
  0: "#9a9a9a",
  1: "#6f7dff",
  2: "#4fbf4f",
  3: "#3fbfbf",
  4: "#e05a4f",
  5: "#c86fc8",
  6: "#f0b232",
  7: "#c4c4c4",
  8: "#8a8a8a",
  9: "#8f9bff",
  a: "#7ce06f",
  b: "#6fe8e8",
  c: "#ff7b6f",
  d: "#ff8fff",
  e: "#ffe76f",
  f: "#ffffff",
  g: "#ddd605",
};

/** Text mit §-Codes als DOM-Fragment. */
export function colorize(text, doc = document) {
  const frag = doc.createDocumentFragment();
  let color;
  let bold = false;
  let italic = false;
  let buffer = "";
  const flush = () => {
    if (!buffer) return;
    const span = doc.createElement("span");
    span.textContent = buffer;
    if (color) span.style.color = color;
    if (bold) span.style.fontWeight = "700";
    if (italic) span.style.fontStyle = "italic";
    frag.appendChild(span);
    buffer = "";
  };
  const s = String(text ?? "");
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "§" && i + 1 < s.length) {
      flush();
      const code = s[++i].toLowerCase();
      if (COLORS[code]) color = COLORS[code];
      else if (code === "l") bold = true;
      else if (code === "o") italic = true;
      else if (code === "r") {
        color = undefined;
        bold = false;
        italic = false;
      }
      continue;
    }
    buffer += s[i];
  }
  flush();
  return frag;
}

/** Ohne §-Codes - fuer Titel und Vergleiche. */
export const plain = (text) => String(text ?? "").replace(/§./g, "");
