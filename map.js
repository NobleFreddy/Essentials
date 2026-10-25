/**
 * Die Karte: Kartenstuecke (je 16 x 16 Bloecke) auf einer Leinwand, verschieben und zoomen.
 *
 * Farben: aus der Tabelle der echten Texturen (shared/colors.json, auch fremde Addons),
 * sonst nach dem Namen (fallbackColor). Gras, Laub und Wasser faerbt das Biom - in der
 * Savanne gelblich, im Sumpf truebe, im warmen Ozean tuerkis. Dazu Relief wie bei einer
 * Lampe im Nordwesten, und Wasser wird mit der Tiefe dunkler.
 */
import { tileBytes, columnAt, fallbackColor, BYTES_PER_COLUMN } from "./shared/mapscan.js";
import { TINTED, BASE, biomeTint } from "./shared/tints.js";

// ---------------------------------------------------------------- Texturen
/**
 * Nah herangezoomt (ab TEXTURE_SCALE Bildpunkten je Block) zeigt die Karte die echten
 * Block-Texturen (shared/blocks.png, aus tools/gen-block-atlas.mjs) - mit derselben
 * Biom-Faerbung und demselben Relief wie die Farben. Der Atlas wird erst dann geladen.
 */
export const TEXTURE_SCALE = 6;
/** So viele Stuecke mit Textur bleiben im Speicher (je 256 x 256 Pixel). */
const TEXTURE_CACHE = 320;
/** So viele werden je Bild neu gezeichnet - der Rest folgt im naechsten, die Karte ruckelt nicht. */
const TEXTURE_PER_FRAME = 24;
/**
 * Gezeichnet wird in Regionen: eine Leinwand fuer REGION x REGION Stuecke, ein Pixel je Block.
 * Frueher hatte jedes Stueck seine eigene - bei zwanzigtausend Stuecken zehntausende
 * Leinwaende, und das Zeichnen wurde zaeh.
 */
export const REGION = 8;
/**
 * So viele Stuecke werden je Bild schattiert. Eine grosse Karte entsteht so ueber ein paar
 * Bilder hinweg, statt die Seite beim Laden fuer Sekunden (auf dem Handy: Minuten) einzufrieren.
 */
const SHADE_PER_FRAME = 600;
/** Mittleres Grau der Biom-Texturen: so hell wie in der Farbansicht (siehe gen-map-colors.mjs). */
export const GREY = 150;
let atlas;
let atlasLoading;
function loadAtlas(onReady) {
  if (atlas || atlasLoading) return;
  atlasLoading = (async () => {
    try {
      const [info, img] = await Promise.all([
        fetch("shared/blocks.json", { cache: "force-cache" }).then((r) => r.json()),
        new Promise((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = "shared/blocks.png";
        }),
      ]);
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      atlas = { ...info, width: img.width, px: g.getImageData(0, 0, img.width, img.height).data };
      onReady?.();
    } catch {
      /* ohne Texturen - die Farben reichen */
    }
  })();
}

// ---------------------------------------------------------------- Farben
let table = {};
export async function loadColors(url = "shared/colors.json") {
  try {
    table = await (await fetch(url, { cache: "force-cache" })).json();
  } catch {
    table = {};
  }
}

/** "#rrggbb" oder "hsl(h, s%, l%)" -> [r, g, b] */
export function parseColor(c) {
  if (c.startsWith("#")) return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const m = c.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!m) return [127, 127, 127];
  const h = Number(m[1]) / 360;
  const s = Number(m[2]) / 100;
  const l = Number(m[3]) / 100;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(v * 255));
}

const rgbCache = new Map();
export function blockRgb(id) {
  let rgb = rgbCache.get(id);
  if (!rgb) {
    rgb = parseColor(table[id] ?? table[id.replace(/^minecraft:/, "")] ?? fallbackColor(id));
    rgbCache.set(id, rgb);
  }
  return rgb;
}

export function columnRgb(col) {
  const id = col.id.replace(/^minecraft:/, "");
  let rgb = blockRgb(id);
  for (const kind of ["grass", "foliage", "water"]) {
    if (!TINTED[kind].test(id) || !col.biome) continue;
    const t = biomeTint(kind, col.biome);
    rgb = rgb.map((v, i) => (v * t[i]) / BASE[kind][i]);
    break;
  }
  return rgb;
}

// ---------------------------------------------------------------- Karte
/** Zeichen vor dem Namen eines Wegpunkts: fuer mich, fuer den Clan, fuer alle. */
export const SCOPE_ICON = { me: "◆", clan: "⚑", all: "★", death: "✝", home: "⌂" };

export function createMap(canvas, { onHover, onClick } = {}) {
  const ctx = canvas.getContext("2d");
  const dims = new Map(); // dim -> { tiles: Map("cx,cz" -> tile), regions: Map("rx,rz" -> region) }
  let dim = "minecraft:overworld";
  const view = { x: 0, z: 0, scale: 3 };
  let players = [];
  let waypoints = [];
  let placing = false;
  let grid = false;
  let dirty = true;
  const fitted = new Set();

  const key = (cx, cz) => cx + "," + cz;
  const layerOf = (d = dim) => {
    if (!dims.has(d)) dims.set(d, { tiles: new Map(), regions: new Map() });
    return dims.get(d);
  };
  const tilesOf = (d = dim) => layerOf(d).tiles;

  /** Die Region eines Stuecks - eine Leinwand fuer REGION x REGION Stuecke, ein Pixel je Block. */
  function regionOf(layer, cx, cz) {
    const rx = Math.floor(cx / REGION);
    const rz = Math.floor(cz / REGION);
    const k = key(rx, rz);
    let r = layer.regions.get(k);
    if (!r) {
      const c = document.createElement("canvas");
      c.width = REGION * 16;
      c.height = REGION * 16;
      r = { rx, rz, canvas: c, ctx: c.getContext("2d"), pending: new Set() };
      layer.regions.set(k, r);
    }
    return r;
  }

  /** Neu zu schattieren - das geschieht erst, wenn die Region zu sehen ist (draw). */
  function queue(layer, t) {
    if (!t) return;
    t.shade = undefined;
    texCache.delete(t);
    regionOf(layer, t.cx, t.cz).pending.add(t);
  }

  /** Farbe von Block und Biom - einmal berechnet, dann aus dem Speicher. */
  const colorCache = new Map();
  function colorOf(id, biome) {
    const k = id + "|" + biome;
    let rgb = colorCache.get(k);
    if (!rgb) {
      rgb = columnRgb({ id, biome });
      colorCache.set(k, rgb);
    }
    return rgb;
  }
  const colorAt = (t, i) => colorOf(t.p?.[t.bytes[i * BYTES_PER_COLUMN]] ?? "air", t.b?.[t.bytes[i * BYTES_PER_COLUMN + 4]] ?? "");

  /**
   * Ein Stueck in seine Region malen. Laeuft fuer zehntausende Stuecke - deshalb direkt auf den
   * Bytes, ohne Objekte je Saeule. Hoehen bleiben roh (y + 64, nie negativ): fuer das Relief
   * zaehlen nur die Unterschiede, -1 heisst "kein Nachbar".
   */
  function shadeTile(layer, t) {
    const north = layer.tiles.get(key(t.cx, t.cz - 1));
    const west = layer.tiles.get(key(t.cx - 1, t.cz));
    const B = BYTES_PER_COLUMN;
    const bytes = t.bytes;
    const img = new ImageData(16, 16);
    const out = img.data;
    const local = new Map(); // (Block, Biom) dieses Stuecks -> Farbe
    // Je Block: Helligkeit (Relief, in Hundertsteln) und ob die Nachbarn im Norden / Westen
    // hoeher liegen - die Texturen bekommen dort eine Schattenkante
    t.shade = new Uint8Array(256);
    t.edge = new Uint8Array(256);
    for (let z = 0; z < 16; z++) {
      for (let x = 0; x < 16; x++) {
        const i = z * 16 + x;
        const o = i * B;
        const y = bytes[o + 1] + bytes[o + 2] * 256;
        const depth = bytes[o + 3];
        let n = -1;
        let nDepth = 0;
        const nb = z > 0 ? bytes : north?.bytes;
        if (nb) {
          const q = z > 0 ? o - 16 * B : (240 + x) * B;
          n = nb[q + 1] + nb[q + 2] * 256;
          nDepth = nb[q + 3];
        }
        let w = -1;
        let wDepth = 0;
        const wb = x > 0 ? bytes : west?.bytes;
        if (wb) {
          const q = x > 0 ? o - B : (z * 16 + 15) * B;
          w = wb[q + 1] + wb[q + 2] * 256;
          wDepth = wb[q + 3];
        }
        let f = 1;
        if (depth > 0) {
          // Wasser: je tiefer, desto dunkler; ganz flach scheint der Grund durch
          f = 1.08 - Math.min(0.5, depth * 0.04);
        } else {
          const delta = (n >= 0 ? y - n : 0) + (w >= 0 ? y - w : 0);
          f = 1 + Math.max(-0.32, Math.min(0.22, delta * 0.07));
          t.edge[i] = (n > y && !nDepth ? 1 : 0) | (w > y && !wDepth ? 2 : 0);
        }
        t.shade[i] = Math.round(f * 100);
        const ck = (bytes[o] << 8) | bytes[o + 4];
        let rgb = local.get(ck);
        if (!rgb) {
          rgb = colorAt(t, i);
          local.set(ck, rgb);
        }
        const p = i * 4;
        out[p] = Math.min(255, rgb[0] * f);
        out[p + 1] = Math.min(255, rgb[1] * f);
        out[p + 2] = Math.min(255, rgb[2] * f);
        out[p + 3] = (t.p?.[bytes[o]] ?? "air") === "air" ? 0 : 255;
      }
    }
    const r = regionOf(layer, t.cx, t.cz);
    r.ctx.putImageData(img, (t.cx - r.rx * REGION) * 16, (t.cz - r.rz * REGION) * 16);
    r.pending.delete(t);
  }

  // Stuecke mit Textur: zuletzt benutzte zuletzt (Map behaelt die Reihenfolge)
  const texCache = new Map();

  /** Ein Kartenstueck mit Texturen zeichnen: 16 x 16 Bloecke zu je 16 x 16 Pixeln. */
  function textureTile(t) {
    const S = atlas.size;
    const W = 16 * S;
    const img = new ImageData(W, W);
    const out = img.data;
    for (let i = 0; i < 256; i++) {
      const col = columnAt(t, t.bytes, i);
      const id = col.id.replace(/^minecraft:/, "");
      const f = t.shade[i] / 100;
      const bx = (i % 16) * S;
      const bz = Math.floor(i / 16) * S;
      const cell = id === "air" ? undefined : atlas.ids[id];
      // Unbekannter Block (fremdes Addon): seine Farbe, leicht gemasert
      const flat = cell === undefined ? colorAt(t, i) : undefined;
      const kind = cell !== undefined ? atlas.tint[cell] : undefined;
      const tint = kind ? biomeTint(kind, col.biome) : undefined;
      const sx = cell !== undefined ? (cell % atlas.cols) * S : 0;
      const sy = cell !== undefined ? Math.floor(cell / atlas.cols) * S : 0;
      const edge = t.edge[i];
      for (let py = 0; py < S; py++) {
        for (let px = 0; px < S; px++) {
          const o = ((bz + py) * W + bx + px) * 4;
          if (id === "air") continue;
          let r;
          let g;
          let b;
          if (flat) {
            const n = ((px * 7 + py * 13) % 5) * 0.02 + 0.96;
            [r, g, b] = [flat[0] * n, flat[1] * n, flat[2] * n];
          } else {
            const a = ((sy + py) * atlas.width + sx + px) * 4;
            r = atlas.px[a];
            g = atlas.px[a + 1];
            b = atlas.px[a + 2];
            if (tint) {
              r = (r * tint[0]) / GREY;
              g = (g * tint[1]) / GREY;
              b = (b * tint[2]) / GREY;
            }
          }
          // Schattenkante, wo der Nachbar hoeher liegt
          const k = f * ((edge & 1 && py === 0) || (edge & 2 && px === 0) ? 0.72 : 1);
          out[o] = Math.min(255, r * k);
          out[o + 1] = Math.min(255, g * k);
          out[o + 2] = Math.min(255, b * k);
          out[o + 3] = 255;
        }
      }
    }
    const c = document.createElement("canvas");
    c.width = W;
    c.height = W;
    c.getContext("2d").putImageData(img, 0, 0);
    return c;
  }

  /** Die Textur-Fassung eines Stuecks - aus dem Speicher, neu (wenn das Budget reicht) oder keine. */
  function texturedImage(t, budget) {
    let c = texCache.get(t);
    if (c) {
      texCache.delete(t);
      texCache.set(t, c);
      return c;
    }
    if (budget.left <= 0 || !t.shade) return undefined;
    budget.left--;
    c = textureTile(t);
    texCache.set(t, c);
    while (texCache.size > TEXTURE_CACHE) texCache.delete(texCache.keys().next().value);
    return c;
  }

  /**
   * Neue oder geaenderte Kartenstuecke uebernehmen. Hier wird nur entpackt - schattiert wird
   * erst beim Zeichnen und nur, was zu sehen ist, ein paar hundert Stuecke je Bild.
   */
  function addTiles(list, d = "minecraft:overworld") {
    const layer = layerOf(d);
    let n = 0;
    for (const row of list) {
      const bytes = tileBytes(row);
      if (bytes.length < 256 * BYTES_PER_COLUMN) continue;
      const t = { cx: row.cx, cz: row.cz, p: row.p, b: row.b, bytes, shade: undefined, edge: undefined };
      layer.tiles.set(key(row.cx, row.cz), t);
      // Das Stueck selbst, und die Nachbarn im Sueden und Osten (ihr Relief haengt an ihm)
      queue(layer, t);
      queue(layer, layer.tiles.get(key(row.cx, row.cz + 1)));
      queue(layer, layer.tiles.get(key(row.cx + 1, row.cz)));
      n++;
    }
    if (d === dim && !fitted.has(d) && layer.tiles.size) fit();
    dirty = true;
    return n;
  }

  /** Auf die Mitte des Erkundeten setzen. */
  function fit() {
    const tiles = tilesOf();
    if (!tiles.size) return;
    let sx = 0;
    let sz = 0;
    for (const t of tiles.values()) {
      sx += t.cx * 16 + 8;
      sz += t.cz * 16 + 8;
    }
    view.x = sx / tiles.size;
    view.z = sz / tiles.size;
    fitted.add(dim);
    dirty = true;
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    dirty = true;
  }

  function draw() {
    if (!dirty) return;
    // Unsichtbar (eine andere Seite ist offen): spaeter zeichnen, wenn die Karte wieder da ist
    if (!canvas.getClientRects().length) return;
    dirty = false;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width;
    const h = canvas.height;
    const s = view.scale * dpr;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#0d0f13";
    ctx.fillRect(0, 0, w, h);
    const left = view.x - w / 2 / s;
    const top = view.z - h / 2 / s;
    const cx0 = Math.floor(left / 16) - 1;
    const cz0 = Math.floor(top / 16) - 1;
    const cx1 = Math.ceil((left + w / s) / 16);
    const cz1 = Math.ceil((top + h / s) / 16);
    const layer = layerOf();
    // Erst die Regionen in Farbe - schattiert wird, was gerade zu sehen ist, mit Budget
    const shading = { left: SHADE_PER_FRAME };
    const span = REGION * 16;
    for (let rz = Math.floor(cz0 / REGION); rz <= Math.floor(cz1 / REGION); rz++) {
      for (let rx = Math.floor(cx0 / REGION); rx <= Math.floor(cx1 / REGION); rx++) {
        const r = layer.regions.get(key(rx, rz));
        if (!r) continue;
        for (const t of r.pending) {
          if (shading.left-- <= 0) break;
          shadeTile(layer, t);
        }
        const px = Math.floor((rx * span - left) * s);
        const pz = Math.floor((rz * span - top) * s);
        const size = Math.ceil(span * s);
        ctx.drawImage(r.canvas, px, pz, size, size);
      }
    }
    // Noch nicht alles schattiert - im naechsten Bild weiter
    if (shading.left < 0) dirty = true;
    // Nah dran: darueber die echten Texturen (nur wenige Stuecke sind dann zu sehen)
    const textured = view.scale >= TEXTURE_SCALE;
    if (textured && !atlas) loadAtlas(() => (dirty = true));
    if (textured && atlas) {
      const budget = { left: TEXTURE_PER_FRAME };
      for (let cz = cz0; cz <= cz1; cz++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          const t = layer.tiles.get(key(cx, cz));
          if (!t) continue;
          const tex = texturedImage(t, budget);
          if (!tex) continue;
          const px = Math.floor((cx * 16 - left) * s);
          const pz = Math.floor((cz * 16 - top) * s);
          const size = Math.ceil(16 * s);
          // Verkleinerte Texturen glaetten (sonst flimmern sie), vergroesserte Bloecke scharf lassen
          ctx.imageSmoothingEnabled = size < tex.width;
          ctx.drawImage(tex, px, pz, size, size);
        }
      }
      ctx.imageSmoothingEnabled = false;
      // Noch nicht alle Texturen fertig - im naechsten Bild weiter
      if (budget.left <= 0) dirty = true;
    }
    if (grid && view.scale >= 2) {
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let cx = cx0; cx <= cx1; cx++) {
        const px = Math.floor((cx * 16 - left) * s) + 0.5;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, h);
      }
      for (let cz = cz0; cz <= cz1; cz++) {
        const pz = Math.floor((cz * 16 - top) * s) + 0.5;
        ctx.moveTo(0, pz);
        ctx.lineTo(w, pz);
      }
      ctx.stroke();
    }
    ctx.font = 12 * dpr + "px system-ui, sans-serif";
    ctx.textAlign = "center";
    for (const wp of waypoints) {
      if ((wp.d ?? "minecraft:overworld") !== dim) continue;
      const px = (wp.x + 0.5 - left) * s;
      const pz = (wp.z + 0.5 - top) * s;
      if (px < -100 || pz < -40 || px > w + 100 || pz > h + 40) continue;
      const r = 6 * dpr;
      ctx.fillStyle = wp.color || "#f0b232";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(px, pz - r);
      ctx.lineTo(px + r, pz);
      ctx.lineTo(px, pz + r);
      ctx.lineTo(px - r, pz);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      const label = (SCOPE_ICON[wp.scope] ?? "") + " " + wp.name;
      ctx.lineWidth = 3 * dpr;
      ctx.strokeText(label, px, pz - 10 * dpr);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, px, pz - 10 * dpr);
    }
    for (const p of players) {
      if ((p.d ?? "minecraft:overworld") !== dim) continue;
      const px = (p.x - left) * s;
      const pz = (p.z - top) * s;
      ctx.fillStyle = p.color || "#f0b232";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(px, pz, 5 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.strokeText(p.name, px, pz - 9 * dpr);
      ctx.fillText(p.name, px, pz - 9 * dpr);
    }
  }

  function loop() {
    draw();
    requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- Bedienung
  const pointers = new Map();
  let pinch;

  const worldAt = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect();
    return { x: view.x + (clientX - r.left - r.width / 2) / view.scale, z: view.z + (clientY - r.top - r.height / 2) / view.scale };
  };

  function zoomAt(clientX, clientY, factor) {
    const before = worldAt(clientX, clientY);
    view.scale = Math.max(0.25, Math.min(32, view.scale * factor));
    const after = worldAt(clientX, clientY);
    view.x += before.x - after.x;
    view.z += before.z - after.z;
    dirty = true;
  }

  /** Der Wegpunkt unter dem Zeiger (bis 10 Pixel daneben). */
  function waypointAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    let best;
    let bestDist = 10;
    for (const wp of waypoints) {
      if ((wp.d ?? "minecraft:overworld") !== dim) continue;
      const sx = r.left + r.width / 2 + (wp.x + 0.5 - view.x) * view.scale;
      const sy = r.top + r.height / 2 + (wp.z + 0.5 - view.z) * view.scale;
      const dist = Math.hypot(sx - clientX, sy - clientY);
      if (dist < bestDist) {
        best = wp;
        bestDist = dist;
      }
    }
    return best;
  }

  /** Was unter dem Mauszeiger liegt: Block, Hoehe, Biom. */
  function inspect(x, z) {
    const t = tilesOf().get(key(Math.floor(x / 16), Math.floor(z / 16)));
    if (!t) return undefined;
    return columnAt(t, t.bytes, (((z % 16) + 16) % 16) * 16 + (((x % 16) + 16) % 16));
  }

  // Ein Klick ist, was sich kaum bewegt hat - sonst war es Verschieben
  let press;
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    press = pointers.size === 1 ? { id: e.pointerId, x: e.clientX, y: e.clientY } : undefined;
    canvas.classList.add("dragging");
  });
  canvas.addEventListener("pointermove", (e) => {
    const w = worldAt(e.clientX, e.clientY);
    const bx = Math.floor(w.x);
    const bz = Math.floor(w.z);
    onHover?.(bx, bz, inspect(bx, bz), waypointAt(e.clientX, e.clientY));
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    if (pointers.size === 1) {
      view.x -= (e.clientX - prev.x) / view.scale;
      view.z -= (e.clientY - prev.y) / view.scale;
      dirty = true;
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, dist / pinch);
      pinch = dist;
    }
  });
  const up = (e) => {
    if (e.type === "pointerup" && press?.id === e.pointerId && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 5) {
      const w = worldAt(e.clientX, e.clientY);
      const bx = Math.floor(w.x);
      const bz = Math.floor(w.z);
      onClick?.({ x: bx, z: bz, col: inspect(bx, bz), wp: placing ? undefined : waypointAt(e.clientX, e.clientY), placing });
    }
    press = undefined;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = undefined;
    if (!pointers.size) canvas.classList.remove("dragging");
  };
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.2 : 1 / 1.2);
    },
    { passive: false }
  );

  new ResizeObserver(resize).observe(canvas);
  resize();
  loop();

  return {
    addTiles,
    fit,
    setPlayers(list) {
      players = list ?? [];
      dirty = true;
    },
    setWaypoints(list) {
      waypoints = list ?? [];
      dirty = true;
    },
    /** Naechster Klick setzt einen Wegpunkt. */
    setPlacing(on) {
      placing = !!on;
      canvas.classList.toggle("placing", placing);
    },
    get placing() {
      return placing;
    },
    setDimension(d) {
      dim = d;
      if (!fitted.has(d)) fit();
      dirty = true;
    },
    get dimension() {
      return dim;
    },
    toggleGrid() {
      grid = !grid;
      dirty = true;
      return grid;
    },
    centerOn(x, z) {
      view.x = x;
      view.z = z;
      view.scale = Math.max(view.scale, 4);
      dirty = true;
    },
    size(d = dim) {
      return tilesOf(d).size;
    },
    /** Alle Kartenstuecke vergessen (nach dem Zuruecksetzen der Webseite). */
    clear() {
      dims.clear();
      texCache.clear();
      fitted.clear();
      dirty = true;
    },
  };
}
