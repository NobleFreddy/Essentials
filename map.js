/**
 * Die Karte: Kartenstuecke (je 16 x 16 Bloecke) auf einer Leinwand, verschieben und zoomen.
 *
 * Farben: aus der Tabelle der echten Texturen (shared/colors.json, auch fremde Addons),
 * sonst nach dem Namen (fallbackColor). Gras, Laub und Wasser faerbt das Biom - in der
 * Savanne gelblich, im Sumpf truebe, im warmen Ozean tuerkis. Dazu Relief wie bei einer
 * Lampe im Nordwesten, und Wasser wird mit der Tiefe dunkler.
 */
import { decodeTile, fallbackColor } from "./shared/mapscan.js";
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
  const dims = new Map(); // dim -> Map("cx,cz" -> tile)
  let dim = "minecraft:overworld";
  const view = { x: 0, z: 0, scale: 3 };
  let players = [];
  let waypoints = [];
  let placing = false;
  let grid = false;
  let dirty = true;
  const fitted = new Set();

  const key = (cx, cz) => cx + "," + cz;
  const tilesOf = (d = dim) => {
    if (!dims.has(d)) dims.set(d, new Map());
    return dims.get(d);
  };

  function shadeTile(d, cx, cz) {
    const tiles = tilesOf(d);
    const t = tiles.get(key(cx, cz));
    if (!t) return;
    const north = tiles.get(key(cx, cz - 1));
    const west = tiles.get(key(cx - 1, cz));
    const img = new ImageData(16, 16);
    // Je Block: Helligkeit (Relief) und ob die Nachbarn im Norden / Westen hoeher liegen -
    // die Texturen bekommen dort eine Schattenkante
    t.shade = new Float32Array(256);
    t.edge = new Uint8Array(256);
    t.tex = undefined;
    for (let z = 0; z < 16; z++) {
      for (let x = 0; x < 16; x++) {
        const col = t.cols[z * 16 + x];
        const n = z > 0 ? t.cols[(z - 1) * 16 + x] : north?.cols[15 * 16 + x];
        const w = x > 0 ? t.cols[z * 16 + x - 1] : west?.cols[z * 16 + 15];
        let f = 1;
        if (col.depth > 0) {
          // Wasser: je tiefer, desto dunkler; ganz flach scheint der Grund durch
          f = 1.08 - Math.min(0.5, col.depth * 0.04);
        } else {
          const delta = (n ? col.y - n.y : 0) + (w ? col.y - w.y : 0);
          f = 1 + Math.max(-0.32, Math.min(0.22, delta * 0.07));
          t.edge[z * 16 + x] = (n && n.y > col.y && !n.depth ? 1 : 0) | (w && w.y > col.y && !w.depth ? 2 : 0);
        }
        t.shade[z * 16 + x] = f;
        const [r, g, b] = columnRgb(col);
        const i = (z * 16 + x) * 4;
        img.data[i] = Math.min(255, r * f);
        img.data[i + 1] = Math.min(255, g * f);
        img.data[i + 2] = Math.min(255, b * f);
        img.data[i + 3] = col.id === "air" ? 0 : 255;
      }
    }
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 16;
    c.getContext("2d").putImageData(img, 0, 0);
    t.image = c;
    texCache.delete(t);
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
      const col = t.cols[i];
      const id = col.id.replace(/^minecraft:/, "");
      const f = t.shade[i];
      const bx = (i % 16) * S;
      const bz = Math.floor(i / 16) * S;
      const cell = id === "air" ? undefined : atlas.ids[id];
      // Unbekannter Block (fremdes Addon): seine Farbe, leicht gemasert
      const flat = cell === undefined ? columnRgb(col) : undefined;
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
    if (budget.left <= 0) return undefined;
    budget.left--;
    c = textureTile(t);
    texCache.set(t, c);
    while (texCache.size > TEXTURE_CACHE) texCache.delete(texCache.keys().next().value);
    return c;
  }

  /** Neue oder geaenderte Kartenstuecke uebernehmen. */
  function addTiles(list, d = "minecraft:overworld") {
    const tiles = tilesOf(d);
    const touched = [];
    for (const row of list) {
      const cols = decodeTile(row);
      if (cols.length !== 256) continue;
      tiles.set(key(row.cx, row.cz), { cols, image: undefined, cx: row.cx, cz: row.cz });
      touched.push([row.cx, row.cz]);
    }
    // Das Stueck selbst, und die Nachbarn im Sueden und Osten (ihr Relief haengt an ihm)
    for (const [cx, cz] of touched) {
      shadeTile(d, cx, cz);
      shadeTile(d, cx, cz + 1);
      shadeTile(d, cx + 1, cz);
    }
    if (d === dim && !fitted.has(d) && tiles.size) fit();
    dirty = true;
    return touched.length;
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
    const tiles = tilesOf();
    const textured = view.scale >= TEXTURE_SCALE;
    if (textured && !atlas) loadAtlas(() => (dirty = true));
    const budget = { left: TEXTURE_PER_FRAME };
    for (let cz = cz0; cz <= cz1; cz++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const t = tiles.get(key(cx, cz));
        if (!t?.image) continue;
        const px = Math.floor((cx * 16 - left) * s);
        const pz = Math.floor((cz * 16 - top) * s);
        const size = Math.ceil(16 * s);
        const tex = textured && atlas ? texturedImage(t, budget) : undefined;
        // Verkleinerte Texturen glaetten (sonst flimmern sie), vergroesserte Bloecke scharf lassen
        ctx.imageSmoothingEnabled = !!tex && size < tex.width;
        ctx.drawImage(tex ?? t.image, px, pz, size, size);
      }
    }
    // Noch nicht alle Texturen fertig - im naechsten Bild weiter
    if (textured && atlas && budget.left <= 0) dirty = true;
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
    return t.cols[(((z % 16) + 16) % 16) * 16 + (((x % 16) + 16) % 16)];
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
