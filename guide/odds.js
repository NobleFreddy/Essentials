/**
 * Wahrscheinlichkeiten lesbar machen - ohne DOM, damit der Test sie direkt pruefen kann.
 *
 *   pct(0.0025, "de")    "0,25 %"
 *   pct(0.25, "de")      "25 %"
 *   oneIn(0.0025)        400     (gerundet: niemand braucht "1 von 39 682")
 */
const locale = (lang) => (lang === "de" ? "de-DE" : "en-US");

/** Prozent mit sinnvoll vielen Stellen: 25 %, 0,75 %, 0,0023 %. */
export function pct(x, lang = "de") {
  if (!(x > 0)) return "–";
  const v = x * 100;
  return new Intl.NumberFormat(locale(lang), { maximumSignificantDigits: v >= 10 ? 3 : 2 }).format(v) + " %";
}

/**
 * "1 von N" - auf zwei gueltige Stellen gerundet, ab 20 Kills. Ab 50 % sagt der Satz nichts
 * mehr, dann gibt es keinen.
 * @returns {number|undefined}
 */
export function oneIn(x) {
  if (!(x > 0) || x >= 0.5) return undefined;
  const n = 1 / x;
  if (n < 20) return Math.round(n);
  const step = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / step) * step;
}

/** Eine Zahl in der Schreibweise der Sprache (32.000 oder 32,000). */
export const num = (n, lang = "de") => new Intl.NumberFormat(locale(lang)).format(n);
