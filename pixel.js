/**
 * Pixel-Schrift fuer Ueberschriften - wie im Spiel, mit Schatten unten rechts.
 *
 * Eigene 5x7-Zeichen (Grossbuchstaben, Ziffern, Umlaute, etwas Satzzeichen) als SVG - keine
 * Schriftdatei, nichts von fremden Servern. Was die Schrift nicht kennt, steht als normaler
 * Text da. Fuer Vorleseprogramme traegt das SVG den Text als Beschriftung.
 */
const G = {
  A: ".###.|#...#|#...#|#####|#...#|#...#|#...#",
  B: "####.|#...#|#...#|####.|#...#|#...#|####.",
  C: ".###.|#...#|#....|#....|#....|#...#|.###.",
  D: "####.|#...#|#...#|#...#|#...#|#...#|####.",
  E: "#####|#....|#....|####.|#....|#....|#####",
  F: "#####|#....|#....|####.|#....|#....|#....",
  G: ".###.|#...#|#....|#.###|#...#|#...#|.###.",
  H: "#...#|#...#|#...#|#####|#...#|#...#|#...#",
  I: "###|.#.|.#.|.#.|.#.|.#.|###",
  J: "....#|....#|....#|....#|#...#|#...#|.###.",
  K: "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#",
  L: "#....|#....|#....|#....|#....|#....|#####",
  M: "#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#",
  N: "#...#|##..#|#.#.#|#..##|#...#|#...#|#...#",
  O: ".###.|#...#|#...#|#...#|#...#|#...#|.###.",
  P: "####.|#...#|#...#|####.|#....|#....|#....",
  Q: ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#",
  R: "####.|#...#|#...#|####.|#..#.|#...#|#...#",
  S: ".####|#....|#....|.###.|....#|....#|####.",
  T: "#####|..#..|..#..|..#..|..#..|..#..|..#..",
  U: "#...#|#...#|#...#|#...#|#...#|#...#|.###.",
  V: "#...#|#...#|#...#|#...#|#...#|.#.#.|..#..",
  W: "#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#",
  X: "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
  Y: "#...#|#...#|.#.#.|..#..|..#..|..#..|..#..",
  Z: "#####|....#|...#.|..#..|.#...|#....|#####",
  Ä: "#...#|.###.|#...#|#...#|#####|#...#|#...#",
  Ö: "#...#|.###.|#...#|#...#|#...#|#...#|.###.",
  Ü: "#...#|.....|#...#|#...#|#...#|#...#|.###.",
  0: ".###.|#...#|#..##|#.#.#|##..#|#...#|.###.",
  1: "..#..|.##..|..#..|..#..|..#..|..#..|#####",
  2: ".###.|#...#|....#|..##.|.#...|#....|#####",
  3: ".###.|#...#|....#|..##.|....#|#...#|.###.",
  4: "...#.|..##.|.#.#.|#..#.|#####|...#.|...#.",
  5: "#####|#....|####.|....#|....#|#...#|.###.",
  6: "..##.|.#...|#....|####.|#...#|#...#|.###.",
  7: "#####|....#|...#.|..#..|..#..|..#..|..#..",
  8: ".###.|#...#|#...#|.###.|#...#|#...#|.###.",
  9: ".###.|#...#|#...#|.####|....#|...#.|.##..",
  ".": ".|.|.|.|.|.|#",
  ",": ".|.|.|.|.|#|#",
  "!": "#|#|#|#|#|.|#",
  "?": ".###.|#...#|....#|...#.|..#..|.....|..#..",
  ":": ".|#|.|.|.|#|.",
  "-": ".....|.....|.....|#####|.....|.....|.....",
  "'": "#|#|.|.|.|.|.",
  "&": ".##..|#..#.|.##..|.#...|#.#.#|#..#.|.##.#",
  "/": "....#|...#.|...#.|..#..|.#...|.#...|#....",
  "(": "..#|.#.|#..|#..|#..|.#.|..#",
  ")": "#..|.#.|..#|..#|..#|.#.|#..",
  "+": ".....|..#..|..#..|#####|..#..|..#..|.....",
  "#": ".#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#.",
  " ": "..|..|..|..|..|..|..",
};
const GLYPHS = Object.fromEntries(Object.entries(G).map(([k, v]) => [k, v.split("|")]));

const prepare = (text) => String(text).toUpperCase().replace(/ß/g, "SS");

/** Kann die Pixel-Schrift diesen Text ganz zeichnen? */
export const canPixel = (text) => [...prepare(text)].every((c) => GLYPHS[c]);

/** Die Pfade fuer Text und Schatten (ohne DOM - so laesst es sich pruefen). */
export function pixelPath(text) {
  let x = 0;
  let d = "";
  for (const c of prepare(text)) {
    const rows = GLYPHS[c];
    if (!rows) continue;
    rows.forEach((row, y) => {
      for (let i = 0; i < row.length; i++) if (row[i] === "#") d += "M" + (x + i) + " " + y + "h1v1h-1z";
    });
    x += rows[0].length + 1;
  }
  return { d, width: Math.max(1, x - 1), height: 7 };
}

/** Ueberschrift in Pixel-Schrift - oder als normaler Text, wenn ein Zeichen fehlt. */
export function pixelText(text, cls = "") {
  if (!canPixel(text)) {
    const span = document.createElement("span");
    span.className = "pixel-fallback " + cls;
    span.textContent = text;
    return span;
  }
  const { d, width, height } = pixelPath(text);
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 " + (width + 1) + " " + (height + 1));
  svg.setAttribute("class", "pixel " + cls);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", text);
  svg.style.setProperty("--w", String(width + 1));
  const shadow = document.createElementNS(NS, "path");
  shadow.setAttribute("d", d);
  shadow.setAttribute("transform", "translate(1 1)");
  shadow.setAttribute("class", "pixel-shadow");
  const main = document.createElementNS(NS, "path");
  main.setAttribute("d", d);
  svg.append(shadow, main);
  return svg;
}
