// Kopie aus packs/BE_BP/scripts/modules/web/core - beim Bauen ueberschrieben, hier nicht aendern.
/**
 * Die Web-Karte: von oben gesehen, ein Pixel je Block.
 *
 * Ausgelesen wird nur, was geladen ist, also rund um die Spieler. Je Chunk (16 x 16 Bloecke)
 * entsteht ein Kartenstueck:
 *   p     die Block-IDs, die darin vorkommen (Palette - auch Bloecke fremder Addons)
 *   b     die Biome, die darin vorkommen
 *   data  Base64 von 256 x 5 Bytes, z-Reihe fuer z-Reihe, je Saeule:
 *           [Palette-Index, Hoehe tief, Hoehe hoch, Wassertiefe, Biom-Index]
 *         Hoehe = y + 64 (zwei Bytes, die ganze Bauhoehe), Wassertiefe bis 255
 *   s     nur im Nether: die Hoehe, ab der von oben gesucht wurde (sonst waere alles Decke)
 *
 * Farben macht die Webseite: aus einer Tabelle, die beim Bauen aus den echten Texturen
 * entsteht (tools/gen-map-colors.mjs), und fuer Unbekanntes nach dem Namen (fallbackColor).
 *
 * Das Auslesen kostet Rechenzeit, deshalb eine Warteschlange: je Runde hoechstens ein
 * Chunk, nahe Chunks zuerst, und ein schon gelesener erst nach einer Weile wieder.
 */
import { toBase64, fromBase64 } from "./protocol.js";

export const TILE_VERSION = 2;
export const BYTES_PER_COLUMN = 5;
const NETHER = "minecraft:nether";
const WATERY = /(^|:)(flowing_)?(water|lava)$/;

export const heightOf = (y) => Math.max(0, Math.min(65535, Math.floor(Number(y) || 0) + 64));
const shortId = (id) => String(id ?? "").replace(/^minecraft:/, "");

/** Biom nur alle 4 x 4 Bloecke fragen - es aendert sich nicht von Block zu Block. */
function biomeAt(dimension, x, y, z) {
  try {
    return shortId(dimension.getBiome?.({ x, y, z })?.id) || "";
  } catch {
    return "";
  }
}

/** Wie tief das Wasser (oder die Lava) unter der Oberflaeche ist. */
function depthBelow(dimension, x, y, z) {
  try {
    const floor = dimension.getBlockBelow?.({ x, y, z }, { maxDistance: 64 });
    return floor ? Math.max(0, Math.min(255, y - floor.location.y)) : 64;
  } catch {
    return 0;
  }
}

const isLiquid = (block) => {
  try {
    return !!block && (block.isLiquid === true || WATERY.test(block.typeId));
  } catch {
    return false;
  }
};

/**
 * Die Wasser- (oder Lava-)Oberflaeche ueber dem Grund. getTopmostBlock uebergeht
 * Fluessigkeiten und liefert den Meeresboden - ohne das hier gaebe es auf der Karte kein Wasser.
 * Erst ein Blick auf den Block darueber (billig); nur wenn dort Wasser ist, ein Strahl von
 * oben, der Fluessigkeiten trifft - sein erster Treffer ist die Oberflaeche.
 * @returns {object|undefined} der oberste Fluessigkeitsblock
 */
function liquidAbove(dimension, x, y, z, topY) {
  let above;
  try {
    above = dimension.getBlock?.({ x, y: y + 1, z });
  } catch {
    return undefined;
  }
  if (!isLiquid(above)) return undefined;
  try {
    const hit = dimension.getBlockFromRay?.({ x: x + 0.5, y: topY, z: z + 0.5 }, { x: 0, y: -1, z: 0 }, { includeLiquidBlocks: true, includePassableBlocks: true, maxDistance: topY - y });
    if (hit?.block && isLiquid(hit.block) && hit.block.location.y > y) return hit.block;
  } catch {
    /* Strahl ging nicht - dann wenigstens Wasser, einen Block tief */
  }
  return above;
}

/** Bis wohin von oben gesucht wird. */
function topOf(dimension, startY) {
  if (startY !== undefined) return startY;
  try {
    return Number(dimension.heightRange?.max) || 320;
  } catch {
    return 320;
  }
}

/**
 * Einen Chunk auslesen.
 * @param {{startY?:number}} [opt]  startY: von dieser Hoehe aus nach unten suchen (Nether)
 * @returns {{p:string[], b:string[], data:string, s?:number}|undefined} undefined = nicht geladen
 */
export function scanChunk(dimension, cx, cz, opt = {}) {
  const x0 = cx * 16;
  const z0 = cz * 16;
  try {
    if (dimension.isChunkLoaded && !dimension.isChunkLoaded({ x: x0 + 8, y: 64, z: z0 + 8 })) return undefined;
  } catch {
    return undefined;
  }
  const palette = [];
  const index = new Map();
  const biomes = [];
  const biomeIndex = new Map();
  const cellBiome = new Map();
  const bytes = new Array(256 * BYTES_PER_COLUMN);
  const topY = topOf(dimension, opt.startY);
  for (let z = 0; z < 16; z++) {
    for (let x = 0; x < 16; x++) {
      let block;
      try {
        block = opt.startY !== undefined ? dimension.getTopmostBlock({ x: x0 + x, z: z0 + z }, opt.startY) : dimension.getTopmostBlock({ x: x0 + x, z: z0 + z });
      } catch {
        return undefined; // mitten im Lesen entladen - beim naechsten Mal
      }
      // Wasser ueber dem Grund: die Oberflaeche zeigen, die Tiefe bis zum Grund merken
      let depth = 0;
      if (block && !isLiquid(block)) {
        const floorY = Number(block.location?.y ?? block.y) || 0;
        const surface = liquidAbove(dimension, x0 + x, floorY, z0 + z, topY);
        if (surface) {
          depth = Math.max(1, Math.min(255, Number(surface.location?.y ?? floorY + 1) - floorY));
          block = surface;
        }
      } else if (block) depth = depthBelow(dimension, x0 + x, Number(block.location?.y ?? block.y) || 0, z0 + z);
      const id = block ? shortId(block.typeId) : "air";
      if (!index.has(id)) {
        index.set(id, palette.length);
        palette.push(id);
      }
      const y = block ? Number(block.location?.y ?? block.y) || 0 : -64;
      const h = heightOf(y);
      const cell = (z >> 2) * 4 + (x >> 2);
      if (!cellBiome.has(cell)) {
        const b = biomeAt(dimension, x0 + x, y + 1, z0 + z);
        if (!biomeIndex.has(b)) {
          biomeIndex.set(b, biomes.length);
          biomes.push(b);
        }
        cellBiome.set(cell, biomeIndex.get(b));
      }
      const o = (z * 16 + x) * BYTES_PER_COLUMN;
      bytes[o] = index.get(id) & 255;
      bytes[o + 1] = h & 255;
      bytes[o + 2] = (h >> 8) & 255;
      bytes[o + 3] = depth;
      bytes[o + 4] = cellBiome.get(cell) & 255;
    }
  }
  const tile = { p: palette, b: biomes, data: toBase64(bytes) };
  if (opt.startY !== undefined) tile.s = opt.startY;
  return tile;
}

/** Ein Kartenstueck lesen - fuer Tests und die Webseite. */
export function decodeTile(tile) {
  const bytes = fromBase64(tile?.data);
  const cols = [];
  for (let i = 0; i + BYTES_PER_COLUMN - 1 < bytes.length; i += BYTES_PER_COLUMN) {
    cols.push({ id: tile.p?.[bytes[i]] ?? "air", y: bytes[i + 1] + bytes[i + 2] * 256 - 64, depth: bytes[i + 3], biome: tile.b?.[bytes[i + 4]] ?? "" });
  }
  return cols;
}

// ---------------------------------------------------------------- Farben ohne Tabelle
/**
 * Farbe fuer einen Block, den die Farbtabelle nicht kennt - nach seinem Namen. Was gar nicht
 * passt, bekommt eine feste Farbe aus dem Namen selbst: dasselbe Addon-Erz sieht so ueberall
 * gleich aus und hebt sich vom Nachbarn ab.
 */
const RULES = [
  [/water|bubble_column/, "#3f76e4"],
  [/lava|magma/, "#d4500c"],
  [/leaves/, "#5c8c2e"],
  [/ice/, "#a0c4ff"],
  [/snow/, "#f5f8fa"],
  [/grass|fern|vine|bush|sapling|crop|wheat|carrot|potato/, "#6ea840"],
  [/flower|tulip|rose|poppy|orchid|daisy|allium|petal/, "#e3c84a"],
  [/red_sand/, "#c26a2a"],
  [/sand/, "#dbd3a0"],
  [/gravel/, "#8a8580"],
  [/dirt|mud|farmland|path/, "#866043"],
  [/(_log|_wood|_stem|hyphae)$/, "#6b5130"],
  [/planks|_door|_fence|_slab|_stairs|table|chest|barrel/, "#a2834f"],
  [/brick/, "#966054"],
  [/glass/, "#c0e0f0"],
  [/gold/, "#f5da2a"],
  [/diamond/, "#61dbd5"],
  [/emerald/, "#2bb84e"],
  [/ruby|redstone/, "#b5262a"],
  [/sapphire|lapis/, "#2f5bbd"],
  [/copper/, "#c06c50"],
  [/iron|steel|metal|anvil/, "#c8c8c8"],
  [/netherrack|crimson/, "#6f3534"],
  [/warped/, "#2b6963"],
  [/soul/, "#51402f"],
  [/blackstone|basalt/, "#3a3639"],
  [/end_stone|purpur/, "#dbdea0"],
  [/obsidian/, "#15101f"],
  [/deepslate|tuff/, "#4d4d50"],
  [/stone|cobble|ore|andesite|granite|diorite|rock/, "#7d7d7d"],
  [/torch|lantern|lamp|light|glow/, "#f0c040"],
  [/wool|concrete|terracotta|carpet/, "#b0b0b0"],
];

export function fallbackColor(id) {
  const s = String(id ?? "").toLowerCase();
  if (!s || s === "air") return "#0d0f13";
  const short = s.replace(/^[a-z0-9_]+:/, "");
  for (const [re, color] of RULES) if (re.test(short)) return color;
  // Feste Farbe aus dem Namen (FNV-1a), mittel hell und nicht zu grell
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  const hue = (h >>> 0) % 360;
  return "hsl(" + hue + ", 35%, 48%)";
}

// ---------------------------------------------------------------- Warteschlange
export const chunkOf = (v) => Math.floor(Number(v) / 16);
const keyOf = (dim, cx, cz) => dim + ":" + cx + ":" + cz;

/** Im Nether von Kopfhoehe des Spielers aus nach unten - so zeigt die Karte seine Ebene. */
export const startYFor = (dim, y) => (dim === NETHER ? Math.max(1, Math.min(120, Math.floor(Number(y) || 64) + 2)) : undefined);

/**
 * Die Warteschlange des Scanners.
 *   plan(spots)  wo gerade Spieler sind - daraus die Chunks, die dran sind
 *   next()       der naechste Chunk, nahe zuerst
 *   done(...)    gelesen: Kartenstueck merken, wenn es sich geaendert hat
 *   take(max)    die geaenderten Stuecke zum Versenden
 */
export function createScanner({ radius = 4, rescanMs = 10 * 60 * 1000 } = {}) {
  const scanned = new Map(); // key -> { at, sig }
  const pending = new Map(); // key -> tile
  let queue = [];

  return {
    get radius() {
      return radius;
    },
    set radius(r) {
      radius = Math.max(1, Math.min(8, Math.floor(Number(r) || 4)));
    },
    /** @param {{dim:string, x:number, z:number, y?:number}[]} spots */
    plan(spots, now = Date.now()) {
      const seen = new Set();
      const list = [];
      for (const s of spots) {
        const pcx = chunkOf(s.x);
        const pcz = chunkOf(s.z);
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dz = -radius; dz <= radius; dz++) {
            const cx = pcx + dx;
            const cz = pcz + dz;
            const key = keyOf(s.dim, cx, cz);
            if (seen.has(key)) continue;
            seen.add(key);
            const last = scanned.get(key);
            if (last && now - last.at < rescanMs) continue;
            list.push({ dim: s.dim, cx, cz, startY: startYFor(s.dim, s.y), dist: dx * dx + dz * dz });
          }
        }
      }
      queue = list.sort((a, b) => a.dist - b.dist);
      return queue.length;
    },
    next() {
      return queue.shift();
    },
    /** @param {object} tile  das Ergebnis von scanChunk */
    done(dim, cx, cz, tile, now = Date.now()) {
      const key = keyOf(dim, cx, cz);
      const sig = typeof tile === "string" ? tile : tile.data + "|" + tile.p.join(",") + "|" + (tile.b ?? []).join(",");
      const before = scanned.get(key);
      scanned.set(key, { at: now, sig });
      if (before?.sig === sig) return false;
      pending.set(key, typeof tile === "string" ? { d: dim, cx, cz, data: tile } : { d: dim, cx, cz, v: TILE_VERSION, ...tile });
      return true;
    },
    take(max = 6) {
      const out = [];
      for (const [key, tile] of pending) {
        if (out.length >= max) break;
        out.push(tile);
        pending.delete(key);
      }
      return out;
    },
    get queued() {
      return queue.length;
    },
    get waiting() {
      return pending.size;
    },
    /** Alles noch einmal schicken (z. B. nachdem die Datenbank geleert wurde). */
    reset() {
      scanned.clear();
      pending.clear();
      queue = [];
    },
  };
}
