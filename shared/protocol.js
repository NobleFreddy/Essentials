// Kopie aus packs/BE_BP/scripts/modules/web/core - beim Bauen ueberschrieben, hier nicht aendern.
/**
 * Das Protokoll zwischen dem Addon und der Web-Bruecke (BE_WEB).
 *
 * Beide sind getrennte Verhaltenspakete: das Addon bleibt bei der stabilen API, nur die
 * Bruecke braucht die Beta-Module fuer HTTP. Gemeinsamen Speicher haben zwei Pakete nicht
 * (dynamische Eigenschaften gehoeren je einem Paket) - sie reden ueber Skript-Ereignisse:
 *
 *   Bruecke -> Addon   essentials:web_pull   "<Anfrage-Nr>"         gib mir den Stand
 *   Addon -> Bruecke   essentials:web_part   "<Nr>|<i>|<n>|<Stueck>" der Stand in Stuecken
 *
 * Ein Ereignis traegt nur eine begrenzte Nachricht, deshalb die Stuecke. Die Bruecke setzt
 * sie wieder zusammen, auch wenn sie durcheinander ankommen.
 *
 * Diese Datei kommt beim Bauen unveraendert auch in die Bruecke (siehe tools/build.mjs) -
 * kein Minecraft-Import, nur reines JavaScript.
 */

export const PULL_ID = "essentials:web_pull";
export const PART_ID = "essentials:web_part";
export const COMMAND_ID = "essentials:web_cmd";

/** So viele Zeichen je Stueck - mit Luft unter der Grenze eines Skript-Ereignisses. */
export const PART_SIZE = 1800;
/** Unvollstaendige Sendungen werden nach dieser Zeit verworfen. */
export const PART_TTL_MS = 30000;

/**
 * Einen Text in Stuecke teilen.
 * @returns {string[]} "<req>|<i>|<n>|<stueck>"
 */
export function split(req, text, size = PART_SIZE) {
  const body = String(text ?? "");
  const n = Math.max(1, Math.ceil(body.length / size));
  const out = [];
  for (let i = 0; i < n; i++) out.push(req + "|" + i + "|" + n + "|" + body.slice(i * size, (i + 1) * size));
  return out;
}

/** Ein Stueck lesen - undefined, wenn es keins ist. */
export function parsePart(message) {
  const s = String(message ?? "");
  const a = s.indexOf("|");
  const b = a < 0 ? -1 : s.indexOf("|", a + 1);
  const c = b < 0 ? -1 : s.indexOf("|", b + 1);
  if (c < 0) return undefined;
  const req = s.slice(0, a);
  const i = Number(s.slice(a + 1, b));
  const n = Number(s.slice(b + 1, c));
  if (!req || !Number.isInteger(i) || !Number.isInteger(n) || n < 1 || n > 10000 || i < 0 || i >= n) return undefined;
  return { req, i, n, data: s.slice(c + 1) };
}

/**
 * Setzt Stuecke wieder zusammen.
 * accept(message) liefert den ganzen Text, sobald das letzte fehlende Stueck da ist.
 */
export function createAssembler(ttl = PART_TTL_MS) {
  const open = new Map();
  return {
    accept(message, now = Date.now()) {
      for (const [req, entry] of open) if (now - entry.at > ttl) open.delete(req);
      const part = parsePart(message);
      if (!part) return undefined;
      let entry = open.get(part.req);
      if (!entry || entry.n !== part.n) {
        entry = { n: part.n, parts: new Array(part.n), got: 0, at: now };
        open.set(part.req, entry);
      }
      if (entry.parts[part.i] === undefined) entry.got++;
      entry.parts[part.i] = part.data;
      if (entry.got < entry.n) return undefined;
      open.delete(part.req);
      return entry.parts.join("");
    },
    get pending() {
      return open.size;
    },
  };
}

// ---------------------------------------------------------------- Base64
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Bytes zu Base64 - die Skript-Umgebung von Bedrock kennt kein btoa. */
export function toBase64(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63];
    out += i + 1 < bytes.length ? ALPHABET[(n >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? ALPHABET[n & 63] : "=";
  }
  return out;
}

export function fromBase64(text) {
  const s = String(text ?? "").replace(/[^A-Za-z0-9+/]/g, "");
  const out = [];
  for (let i = 0; i < s.length; i += 4) {
    const n = (ALPHABET.indexOf(s[i]) << 18) | (ALPHABET.indexOf(s[i + 1]) << 12) | ((ALPHABET.indexOf(s[i + 2]) & 63) << 6) | (ALPHABET.indexOf(s[i + 3]) & 63);
    out.push((n >> 16) & 255);
    if (i + 2 < s.length && s[i + 2] !== undefined) out.push((n >> 8) & 255);
    if (i + 3 < s.length && s[i + 3] !== undefined) out.push(n & 255);
  }
  return out;
}
