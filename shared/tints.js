/**
 * Biom-Faerbung der Karte: Gras, Laub und Wasser sind im Spiel graue Texturen, die das Biom
 * einfaerbt - in der Savanne gelblich, im Sumpf truebe, im warmen Ozean tuerkis.
 *
 * Gebraucht von der Karte (map.js) und beim Bauen des Textur-Atlas (tools/gen-block-atlas.mjs) -
 * deshalb hier, ohne Browser-Abhaengigkeiten.
 */

/** Welche Bloecke nach Biom gefaerbt werden. */
export const TINTED = {
  grass: /^(grass_block|short_grass|tall_grass|fern|large_fern|tallgrass|vine|sugar_cane|bush)$/,
  foliage: /^(oak|jungle|acacia|dark_oak|mangrove)_leaves$|^leaves2?$/,
  water: /^(flowing_)?water$/,
};

// Die Farbtabelle ist mit Ebenen-Gras, Wald-Laub und Ozean-Wasser gerechnet
export const BASE = { grass: [145, 189, 89], foliage: [119, 171, 47], water: [63, 118, 228] };
const BIOMES = [
  [/badlands|mesa/, { grass: [144, 129, 77], foliage: [158, 129, 77] }],
  [/desert|savanna/, { grass: [191, 183, 85], foliage: [174, 164, 42] }],
  [/mangrove/, { grass: [106, 112, 57], foliage: [141, 177, 39], water: [58, 122, 106] }],
  [/swamp/, { grass: [106, 112, 57], foliage: [106, 112, 57], water: [97, 123, 100] }],
  [/jungle/, { grass: [89, 201, 60], foliage: [48, 187, 11] }],
  [/cherry/, { grass: [182, 219, 97], foliage: [182, 219, 97] }],
  [/dark_forest|roofed/, { grass: [80, 122, 50], foliage: [89, 174, 48] }],
  [/birch/, { grass: [136, 187, 103], foliage: [107, 169, 65] }],
  [/snowy|frozen|ice|grove|peaks/, { grass: [128, 180, 151], foliage: [96, 161, 123] }],
  [/taiga|old_growth/, { grass: [134, 183, 131], foliage: [104, 164, 100] }],
  [/meadow/, { grass: [131, 187, 109], foliage: [99, 165, 80] }],
  [/forest|flower/, { grass: [121, 192, 90], foliage: [89, 174, 48] }],
];
const OCEAN = [
  [/lukewarm/, [69, 173, 242]],
  [/warm/, [67, 213, 238]],
  [/frozen/, [57, 56, 201]],
  [/cold/, [61, 87, 214]],
];

/** Die Farbe, mit der das Biom eine graue Textur dieser Art einfaerbt. */
export function biomeTint(kind, biome = "") {
  if (kind === "water") {
    const ocean = OCEAN.find(([re]) => re.test(biome));
    if (ocean) return ocean[1];
  }
  return BIOMES.find(([re]) => re.test(biome))?.[1]?.[kind] ?? BASE[kind];
}
