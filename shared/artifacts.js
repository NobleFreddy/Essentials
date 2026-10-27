// Kopie aus packs/BE_BP/scripts/modules/artifacts/core/artifacts.js - beim Bauen ueberschrieben, hier nicht aendern.
/**
 * Artefakte - Datentabelle und reine Helfer (kein Minecraft-API).
 *
 * Vorbild ist die Java-Mod "Artifacts" von ochotonida: getragene Schmuckstuecke mit
 * dauerhaften Effekten, verteilt auf fuenf Plaetze. Bedrock hat keine zusaetzlichen
 * Ausruestungsplaetze, deshalb verwaltet das Modul fuenf eigene Plaetze: das Item wandert
 * beim Anlegen aus dem Inventar in den Platz und beim Ablegen zurueck.
 *
 * Jeder Eintrag:
 *   id      kurzer Name, das Item heisst essentials:<id>
 *   slot    head | necklace | belt | hands | feet
 *   rarity  common | uncommon | rare | legendary - steuert Fundchance, Farbe und Staerke
 *   weight  Gewicht beim zufaelligen Fund innerhalb einer Stufe (aus der Stufe abgeleitet)
 *   value   Zahl des Effekts (Prozent, Staerke, Reichweite - siehe effects.js)
 */

export const SLOTS = ["head", "necklace", "belt", "hands", "feet"];

/**
 * Getragene statt angelegte Artefakte.
 *
 * Das Drachenei ist kein Schmuckstueck, das man sich umhaengt - es ist *das* Drachenei,
 * das nach dem Enderdrachen auf dem Portal steht. Ein eigenes Item daneben waere eine
 * Dublette: zwei Drachen-Eier, von denen nur eines etwas kann. Also haengt die Macht am
 * Vanilla-Item, und es reicht, es im Inventar zu haben.
 *
 * Solche Artefakte belegen keinen Platz und kommen nie aus einem Fund-Topf - das Drachenei
 * legt der Drache selbst hin.
 *
 * Die Rueckspuluhr traegt man ebenfalls nur bei sich, hat aber ein eigenes Item: sie wird
 * beim Benutzen verbraucht, und wer gerade gestorben ist, hat keinen Platz mehr, auf dem sie
 * angelegt sein koennte - ein Freund gibt sie einem in die Hand. Sie faellt bei jedem Monster
 * mit einer eigenen Chance (REWIND_CHANCE), neben dem gewoehnlichen Fundwurf.
 */
export const CARRY_SLOT = "carried";
export const REWIND = "rewind_watch";
export const CARRIED_ITEM = { dragon_egg: "minecraft:dragon_egg", [REWIND]: "essentials:" + REWIND };
export const CARRIED_IDS = Object.keys(CARRIED_ITEM);
export const carriedItemOf = (id) => CARRIED_ITEM[id];
export const isCarriedArtifact = (id) => Object.prototype.hasOwnProperty.call(CARRIED_ITEM, id);
/** Getragen, aber mit eigenem Item statt einem Vanilla-Item - braucht Icon und Definition. */
export const hasOwnItem = (id) => !isCarriedArtifact(id) || String(CARRIED_ITEM[id]).startsWith("essentials:");

/** Rueckspuluhr: Chance in Prozent je getoetetem Monster - bei jedem, unabhaengig vom Topf. */
export const REWIND_CHANCE = 0.5;
/** So viele Sekunden vor dem Tod landet man wieder. */
export const REWIND_SECONDS = 5;
/** Wahrscheinlichkeit (0..1) je Kill, mit Gluecksschal-Faktor. */
export const rewindOdds = (percent = REWIND_CHANCE, luck = 1) => Math.min(1, Math.max(0, ((Number(percent) || 0) * (Number(luck) || 0)) / 100));

/**
 * Gluecksschal: Faktor auf jede Fundchance - Monster, Rueckspuluhr und wie oft Mimics auftauchen.
 * Der Standard; der Operator stellt die drei Faktoren in den Weltregeln einzeln ein.
 */
export const LUCK = 8;

export const RARITIES = ["common", "uncommon", "rare", "legendary", "mythic"];

/** Stufen, die auf die Traegergrenze des Operators zaehlen. */
export const LIMITED_RARITIES = ["legendary", "mythic"];
export const isLimited = (rarity) => LIMITED_RARITIES.includes(rarity);

/** Gewicht beim Zufallsfund innerhalb einer Stufe - seltene Stuecke sind auch im Topf seltener. */
export const RARITY_WEIGHT = { common: 10, uncommon: 6, rare: 3, legendary: 1, mythic: 0 };

/** Standard-Fundchance aus dem eigenen Topf eines Mobs, in Prozent je getoetetem Monster. */
export const DROP_CHANCES = { common: 1.5, uncommon: 0.8, rare: 0.25 };

/** Der Streufund ist ein Bruchteil davon - in Prozent der Werte oben. */
export const SCATTER_SHARE = 10;
/** Legendaerer Streufund: eigene Chance je Kill in Prozent (rund einer je 5000 Monster). */
export const SCATTER_LEGENDARY = 0.02;
/** Chance eines grossen Bosses auf sein legendaeres Artefakt, in Prozent. */
export const BOSS_LEGENDARY = 50;

/**
 * Mimics ziehen aus einem eigenen Topf: sie sollen sich lohnen, also liegt das Gewicht
 * deutlich weiter oben als bei gewoehnlicher Monsterbeute - es faellt immer eins. Legendaeres
 * ist bewusst nicht dabei: das bleibt den Bossen und dem seltenen Streufund vorbehalten.
 */
export const MIMIC_CHANCES = { common: 20, uncommon: 40, rare: 30, legendary: 0 };
/** Wie oft ein Mimic auftaucht: Chance in Prozent je Pruefung, eine Pruefung je Spieler alle 30 s. */
export const MIMIC_CHANCE = 4;
export const MIMIC_EVERY_S = 30;
/** Untergrund-Fenster, in dem Mimics auftauchen. */
export const MIMIC_MIN_Y = -60;
export const MIMIC_MAX_Y = 50;
/** Wieviele legendaere (und mythische) Artefakte gleichzeitig getragen werden duerfen. */
export const LEGENDARY_LIMIT = 1;

/** Farbe des Namens im Menue. */
export const RARITY_COLOR = { common: "§7", uncommon: "§a", rare: "§b", legendary: "§6", mythic: "§d" };

/**
 * Seltenste zuerst - so verdeckt ein haeufiger Fund nie einen selteneren.
 * "mythic" fehlt hier mit Absicht: Mythisches faellt nie zufaellig, es hat seine eigene
 * Quelle (das Drachenei kommt vom ersten Enderdrachen der Welt und sonst von niemandem).
 */
const RAREST_FIRST = ["legendary", "rare", "uncommon", "common"];

/** Baut einen Eintrag: das Gewicht kommt immer aus der Stufe, damit es eine Quelle gibt. */
const A = (id, slot, rarity, value, extra) => ({
  id,
  slot,
  rarity,
  weight: RARITY_WEIGHT[rarity],
  ...(value === undefined ? {} : { value }),
  ...(extra ?? {}),
});

/** @type {{id:string, slot:string, rarity:string, weight:number, value?:number}[]} */
export const ARTIFACTS = [
  // ---- Kopf
  A("snorkel", "head", "common"),
  A("cowboy_hat", "head", "common"),
  A("drinking_hat", "head", "common", 30), // Prozent weniger Hunger
  A("night_vision_goggles", "head", "uncommon"),
  A("villager_mask", "head", "uncommon"),
  A("spark_core", "head", "rare", 6), // Reichweite in Bloecken
  A("guardian_crown", "head", "legendary"),
  // ---- Halskette
  A("panic_necklace", "necklace", "common"),
  A("flame_pendant", "necklace", "uncommon", 40), // Prozent Chance
  A("thorn_pendant", "necklace", "uncommon", 50),
  A("cross_necklace", "necklace", "uncommon"),
  A("shock_pendant", "necklace", "rare", 15),
  A("invisibility_scarf", "necklace", "rare"),
  A("lucky_scarf", "necklace", "rare", LUCK), // Faktor auf alle Fundchancen
  A("echo_heart", "necklace", "rare", 20), // Prozent gespeicherter Schaden
  A("phoenix_feather", "necklace", "legendary"),
  // ---- Guertel
  A("antidote_vessel", "belt", "common"),
  A("obsidian_skull", "belt", "uncommon"),
  A("helium_flamingo", "belt", "uncommon"),
  A("crystal_heart", "belt", "rare", 4), // zusaetzliche Herzen
  A("cloud_in_a_bottle", "belt", "rare"),
  A("universal_attractor", "belt", "rare", 6), // Reichweite in Bloecken
  A("everlasting_steak", "belt", "rare"),
  A("dragon_heart", "belt", "legendary", 8),
  // Mythisch und getragen: kein eigenes Item, keine Fundquelle, kein Platz. Es wirkt,
  // sobald das Vanilla-Drachenei im Inventar liegt. Der Wert sind die Absorptionsherzen.
  A("dragon_egg", CARRY_SLOT, "mythic", 4, { invisible: true, origin: "artifacts.origin.first_dragon" }),
  // Getragen mit eigenem Item: spult den letzten Tod zurueck und zerfaellt dabei (rewind.js).
  // "everywhere": kein Topf eines Mobs, sondern jedes Monster mit REWIND_CHANCE.
  A(REWIND, CARRY_SLOT, "rare", undefined, { invisible: true, everywhere: true, origin: "artifacts.origin.any_monster" }),
  // ---- Haende
  A("umbrella", "hands", "common"),
  A("pocket_piston", "hands", "common"),
  A("fire_gauntlet", "hands", "uncommon"),
  A("digging_claws", "hands", "uncommon"),
  A("feral_claws", "hands", "uncommon", 40), // Prozent schneller aufgeladen
  A("golden_hook", "hands", "uncommon", 25), // Prozent Chance auf Smaragde
  A("power_glove", "hands", "rare", 4), // zusaetzlicher Schaden
  A("vampiric_glove", "hands", "rare", 20), // Prozent Lebensraub
  A("void_glove", "hands", "legendary", 15),
  // ---- Fuesse
  A("flippers", "feet", "common"),
  A("running_shoes", "feet", "common"),
  A("steadfast_spikes", "feet", "common"),
  A("bunny_hoppers", "feet", "uncommon"),
  A("kitty_slippers", "feet", "uncommon", 8), // Reichweite in Bloecken
  A("aqua_dashers", "feet", "uncommon"),
  A("storm_striders", "feet", "legendary", 3), // Spruenge insgesamt
];

// ---------------------------------------------------------------- Woher ein Artefakt kommt
/**
 * Jedes Artefakt hat seinen Mob: der Schnorchel kommt vom Ertrunkenen, der Feueranhaenger
 * von der Lohe. Das macht die Suche gezielt - man weiss, wohin man geht, statt irgendetwas
 * zu toeten und zu hoffen.
 *
 * Damit trotzdem nichts unerreichbar ist, gibt es zwei Schichten (siehe rollFind):
 *   thematisch  der eigene Topf des Mobs, mit den Chancen aus den Weltregeln
 *   Streufund   alle 40 Artefakte, mit einem Bruchteil davon - jedes feindselige Monster
 *               kann theoretisch alles fallen lassen, legendaer eingeschlossen
 *
 * Mobs, die hier nicht stehen, haben keinen eigenen Topf; ihnen bleibt der Streufund.
 */
export const MOB_DROPS = {
  // ---- Ueberwelt
  "minecraft:zombie": ["running_shoes"],
  "minecraft:husk": ["cowboy_hat", "digging_claws"],
  "minecraft:drowned": ["snorkel", "flippers", "aqua_dashers", "shock_pendant"],
  "minecraft:zombie_villager_v2": ["villager_mask"],
  "minecraft:creeper": ["panic_necklace", "kitty_slippers"],
  "minecraft:skeleton": ["umbrella"], // brennt in der Sonne - also der Schirm
  "minecraft:bogged": ["antidote_vessel"],
  "minecraft:spider": ["feral_claws"],
  "minecraft:cave_spider": ["night_vision_goggles"],
  "minecraft:slime": ["bunny_hoppers"],
  "minecraft:silverfish": ["spark_core"],
  "minecraft:enderman": ["universal_attractor"],
  "minecraft:witch": ["antidote_vessel", "invisibility_scarf"],
  "minecraft:phantom": ["helium_flamingo"],
  "minecraft:guardian": ["thorn_pendant"], // Waechter machen selbst Dornenschaden
  "minecraft:breeze": ["pocket_piston"], // Windladung stoesst weg
  // ---- Illager
  "minecraft:pillager": ["lucky_scarf"],
  "minecraft:vindicator": ["cross_necklace"],
  "minecraft:evocation_illager": ["echo_heart"],
  "minecraft:ravager": ["crystal_heart", "storm_striders"],
  // ---- Nether
  "minecraft:magma_cube": ["steadfast_spikes", "fire_gauntlet"],
  "minecraft:blaze": ["flame_pendant"],
  "minecraft:ghast": ["cloud_in_a_bottle"],
  "minecraft:piglin": ["drinking_hat", "golden_hook"],
  "minecraft:piglin_brute": ["power_glove"],
  "minecraft:hoglin": ["everlasting_steak"],
  "minecraft:wither_skeleton": ["obsidian_skull", "vampiric_glove"],
  // ---- Bosse
  "minecraft:elder_guardian": ["guardian_crown"],
  "minecraft:wither": ["phoenix_feather"],
  "minecraft:warden": ["void_glove"],
  "minecraft:ender_dragon": ["dragon_heart"],
};

/**
 * Bosse lassen ihr legendaeres Stueck nach eigener Chance fallen. Der Anteil sagt, wieviel
 * vom Regler sie bekommen: ein Verwuester taucht in jedem Ueberfall auf und bekommt deshalb
 * die Haelfte, damit sich der Regler nicht in zwei Werte aufteilt, die auseinanderdriften.
 */
export const BOSS_SHARE = {
  "minecraft:ender_dragon": 1,
  "minecraft:wither": 1,
  "minecraft:warden": 1,
  "minecraft:elder_guardian": 1,
  "minecraft:ravager": 0.5,
};

export const MOB_IDS = Object.keys(MOB_DROPS);
export const dropsOf = (mob) => MOB_DROPS[mob] ?? [];
export const bossShare = (mob) => BOSS_SHARE[mob] ?? 0;
export const isBossMob = (mob) => bossShare(mob) > 0;
/** Name des Mobs in der Sprachdatei. */
export const mobKeyOf = (mob) => "artifacts.mob." + String(mob ?? "").replace("minecraft:", "");
/** Wo findet man dieses Artefakt? Leere Liste = nur als Streufund. */
export const sourcesOf = (id) => MOB_IDS.filter((mob) => MOB_DROPS[mob].includes(id));
/** Aus einer ID-Liste nur die einer Stufe. */
const ofRarity = (ids, rarity) => ids.filter((id) => artifactById(id)?.rarity === rarity);

export const ITEM_PREFIX = "essentials:";

/** Das Item zu einem Artefakt - bei getragenen Artefakten das Vanilla-Item selbst. */
export const itemIdOf = (id) => CARRIED_ITEM[id] ?? ITEM_PREFIX + id;
export const shortIdOf = (typeId) => String(typeId ?? "").replace(ITEM_PREFIX, "");
export const artifactById = (id) => ARTIFACTS.find((a) => a.id === id);
/**
 * Das Artefakt zu einem Item - nur fuer eigene Items, und getragene zaehlen nicht mit:
 * sie liegen im Inventar und werden nie angelegt.
 */
export const artifactForItem = (typeId) => {
  if (!String(typeId ?? "").startsWith(ITEM_PREFIX)) return undefined;
  const a = artifactById(shortIdOf(typeId));
  return a && !isCarriedArtifact(a.id) ? a : undefined;
};
export const isArtifact = (typeId) => !!artifactForItem(typeId);
export const bySlot = (slot) => ARTIFACTS.filter((a) => a.slot === slot);
/** Die Artefakte, die man bei sich traegt statt anzulegen. */
export const carriedArtifacts = () => ARTIFACTS.filter((a) => isCarriedArtifact(a.id));
export const byRarity = (rarity) => ARTIFACTS.filter((a) => a.rarity === rarity);

/**
 * IDs einer Stufe - passt direkt als Topf in randomArtifact(). Getragene stehen in keinem
 * Topf: das Drachenei hat seine eigene Herkunft, die Rueckspuluhr ihren eigenen Wurf.
 */
export const poolOf = (rarity) => byRarity(rarity).filter((a) => !isCarriedArtifact(a.id)).map((a) => a.id);
/** Alles, was ein Fundwurf ziehen darf - die 40 Artefakte mit Platz. */
const droppable = () => ARTIFACTS.filter((a) => !isCarriedArtifact(a.id));

export const rarityOf = (artifact) => (RARITIES.includes(artifact?.rarity) ? artifact.rarity : "common");
export const colorOf = (artifact) => RARITY_COLOR[rarityOf(artifact)];

/** Name und Beschreibung im Menue kommen aus der Sprachdatei. */
export const nameKeyOf = (id) => "item." + itemIdOf(id) + ".name";
export const descKeyOf = (id) => "artifacts.desc." + id;
export const slotKeyOf = (slot) => "artifacts.slot." + slot;
export const rarityKeyOf = (rarity) => "artifacts.rarity." + rarity;

/**
 * Zufaelliges Artefakt nach Gewicht.
 * @param {()=>number} rand  Zufallszahl 0..1 (im Test ersetzbar)
 * @param {string[]} [pool]  nur diese IDs beruecksichtigen
 */
export function randomArtifact(rand = Math.random, pool) {
  const list = pool?.length ? ARTIFACTS.filter((a) => pool.includes(a.id)) : droppable();
  if (!list.length) return undefined;
  const total = list.reduce((n, a) => n + Math.max(0, a.weight), 0);
  if (total <= 0) return list[0];
  let roll = rand() * total;
  for (const a of list) {
    roll -= Math.max(0, a.weight);
    if (roll < 0) return a;
  }
  return list[list.length - 1];
}

/**
 * Ein Fundwurf fuer einen Kill - zwei Schichten in einem Durchlauf.
 *
 * Gewuerfelt wird von der seltensten Stufe abwaerts, und innerhalb einer Stufe erst der
 * Streufund, dann der eigene Topf des Mobs. Diese Reihenfolge ist der ganze Trick: sonst
 * wuerde ein gewoehnlicher Fund aus dem eigenen Topf den legendaeren Streufund verdecken,
 * der im selben Kill faellig gewesen waere. Es faellt hoechstens ein Artefakt.
 *
 * Legendaeres hat keinen eigenen Regler fuer den thematischen Topf: es kommt vom Boss oder
 * aus dem Streufund. Dass die Schleife es trotzdem durchlaeuft, kostet nichts - chances
 * kennt den Schluessel nicht, also trifft der Wurf nie.
 *
 * @param {string} mob      typeId des getoeteten Wesens
 * @param {object} chances  aus chancesOf(): common, uncommon, rare, scatterShare,
 *                          scatterLegendary, bossLegendary, mobSpecific
 * @param {()=>number} rand
 * @param {number} luck     Faktor auf alle Chancen (Gluecksschal = LUCK)
 * @param {object} [odds]   feste Chancen des Operators (siehe findTable)
 * @returns {{rarity:string, pool:string[], scattered:boolean}|undefined}
 */
export function rollFind(mob, chances, rand = Math.random, luck = 1, odds) {
  // Hat der Operator feste Chancen gesetzt, zieht der Wurf aus der fertigen Tabelle - ohne
  // ist sie genau diese Rechnung (killOdds), also wuerfelt alles wie zuvor
  if (hasKillOdds(odds)) {
    const id = pickFromTable(findTable(mob, chances, luck, odds), rand);
    const artifact = id && artifactById(id);
    if (!artifact) return undefined;
    return { rarity: artifact.rarity, pool: [id], scattered: chances?.mobSpecific !== false && !dropsOf(mob).includes(id) };
  }
  const factor = Number(luck) || 0;
  const hit = (percent) => percent > 0 && rand() * 100 < percent * factor;
  // Ohne mobSpecific gibt es keine Toepfe: jedes Monster wuerfelt gegen alle 40
  const specific = chances?.mobSpecific !== false;
  const own = specific ? dropsOf(mob) : droppable().map((a) => a.id);
  const share = bossShare(mob);
  for (const rarity of RAREST_FIRST) {
    if (rarity === "legendary" && share > 0) {
      const pool = ofRarity(own, "legendary");
      if (pool.length && hit((Number(chances?.bossLegendary) || 0) * share)) return { rarity, pool, scattered: false };
    }
    if (specific && hit(scatterOf(chances, rarity))) return { rarity, pool: poolOf(rarity), scattered: true };
    const pool = ofRarity(own, rarity);
    if (pool.length && hit(Number(chances?.[rarity]) || 0)) return { rarity, pool, scattered: false };
  }
  return undefined;
}

/** Streufund-Chance einer Stufe: ein Bruchteil der thematischen, legendaer steht fuer sich. */
export function scatterOf(chances, rarity) {
  if (rarity === "legendary") return Number(chances?.scatterLegendary) || 0;
  return ((Number(chances?.[rarity]) || 0) * (Number(chances?.scatterShare) || 0)) / 100;
}

// ---------------------------------------------------------------- Wahrscheinlichkeiten
/** Anteile eines Topfs nach Gewicht - wie randomArtifact() zieht. */
function shares(pool) {
  const list = ARTIFACTS.filter((a) => pool.includes(a.id));
  const total = list.reduce((n, a) => n + Math.max(0, a.weight), 0);
  if (total <= 0) return list.length ? [[list[0].id, 1]] : [];
  return list.map((a) => [a.id, Math.max(0, a.weight) / total]);
}

/**
 * Wie wahrscheinlich faellt welches Artefakt bei einem Kill? Genau wie rollFind gerechnet:
 * dieselbe Reihenfolge, Schluss beim ersten Treffer, im Topf nach Gewicht. Fuer den
 * Server-Guide der Webseite - ein Test haelt beides beisammen.
 *
 * Ein spaeter Wurf kommt nur dran, wenn alle frueheren daneben gingen. Beim Verwuester etwa
 * faellt das Kristallherz deshalb seltener als die 0,25 % seines Reglers: in einem Viertel
 * der Kills hat vorher schon der Sturmlaeufer getroffen.
 *
 * @param {string} mob    typeId; ein Monster ohne eigenen Topf hat nur den Streufund
 * @param {object} chances wie bei rollFind
 * @param {number} luck   Faktor wie bei rollFind (Gluecksschal = LUCK)
 * @returns {Object<string, number>} Artefakt-ID -> Wahrscheinlichkeit je Kill (0..1)
 */
export function killOdds(mob, chances, luck = 1) {
  const factor = Number(luck) || 0;
  const specific = chances?.mobSpecific !== false;
  const own = specific ? dropsOf(mob) : droppable().map((a) => a.id);
  const share = bossShare(mob);
  const out = {};
  let miss = 1; // Wahrscheinlichkeit, dass bis hierher nichts getroffen hat
  const roll = (pool, percent) => {
    const q = percent > 0 ? Math.min(1, (percent * factor) / 100) : 0;
    if (!q) return;
    for (const [id, w] of shares(pool)) out[id] = (out[id] ?? 0) + miss * q * w;
    miss *= 1 - q;
  };
  for (const rarity of RAREST_FIRST) {
    if (rarity === "legendary" && share > 0) {
      const pool = ofRarity(own, "legendary");
      if (pool.length) roll(pool, (Number(chances?.bossLegendary) || 0) * share);
    }
    if (specific) roll(poolOf(rarity), scatterOf(chances, rarity));
    const pool = ofRarity(own, rarity);
    if (pool.length) roll(pool, Number(chances?.[rarity]) || 0);
  }
  return out;
}

/** Was in einem Mimic steckt: je Artefakt die Wahrscheinlichkeit (zusammen 1 - es faellt immer eins). */
export function mimicOdds() {
  const tiers = RARITIES.filter((r) => (MIMIC_CHANCES[r] ?? 0) > 0);
  const total = tiers.reduce((n, r) => n + MIMIC_CHANCES[r], 0);
  const out = {};
  for (const r of tiers) for (const [id, w] of shares(poolOf(r))) out[id] = (MIMIC_CHANCES[r] / total) * w;
  return out;
}

// ---------------------------------------------------------------- Feste Chancen des Operators
/**
 * Feste Chancen je Fundort: der Operator legt fuer ein Artefakt genau fest, wie oft es faellt -
 * je Monster aus seinem Topf, fuer "jedes andere Monster" und im Mimic. Gespeichert als
 * "<Fundort>|<Artefakt>" -> Prozent; was nicht fest ist, rechnet weiter ueber die Stufen.
 *   minecraft:pillager|lucky_scarf   je Kill eines Pluenderers
 *   *|lucky_scarf                    je Kill jedes Monsters, das es nicht im eigenen Topf hat
 *   mimic|lucky_scarf                Anteil in einem Mimic (die uebrigen teilen sich den Rest)
 */
export const ANY_MOB = "*";
export const MIMIC_SOURCE = "mimic";
export const oddsKey = (source, id) => source + "|" + id;

/** Gibt es diesen Fundort fuer dieses Artefakt? Ein Monster nur, wenn es in seinem Topf steht. */
export function validOddsKey(key) {
  const parts = String(key).split("|");
  if (parts.length !== 2 || !droppable().some((a) => a.id === parts[1])) return false;
  return parts[0] === ANY_MOB || parts[0] === MIMIC_SOURCE || dropsOf(parts[0]).includes(parts[1]);
}

/**
 * Aenderungen pruefen: Prozent von 0 bis 100, null nimmt einen festen Wert wieder heraus.
 * Alles oder nichts - ein falscher Fundort oder Wert, und nichts gilt.
 * @returns {Object<string, number|null>|undefined}
 */
export function checkOdds(changes) {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return undefined;
  const out = {};
  for (const [key, v] of Object.entries(changes)) {
    if (!validOddsKey(key)) return undefined;
    if (v === null) out[key] = null;
    else if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100) out[key] = Number(v.toPrecision(6));
    else return undefined;
  }
  return Object.keys(out).length ? out : undefined;
}

const fixedOf = (odds, key) => (typeof odds?.[key] === "number" && Number.isFinite(odds[key]) ? Math.min(100, Math.max(0, odds[key])) / 100 : undefined);
const hasOdds = (odds, mimic) => !!odds && Object.keys(odds).some((k) => k.startsWith(MIMIC_SOURCE + "|") === mimic && fixedOf(odds, k) !== undefined);
export const hasKillOdds = (odds) => hasOdds(odds, false);
export const hasMimicOdds = (odds) => hasOdds(odds, true);

/** Aus einer Tabelle (Artefakt -> Wahrscheinlichkeit) ziehen: eins oder - im Rest bis 1 - keins. */
export function pickFromTable(table, rand = Math.random) {
  let roll = rand();
  for (const [id, p] of Object.entries(table)) {
    if (roll < p) return id;
    roll -= p;
  }
  return undefined;
}

/**
 * Was bei einem Kill faellt, als Tabelle: je Artefakt die Wahrscheinlichkeit (0..1), zusammen
 * hoechstens eins. Grundlage ist killOdds() - genau die Rechnung der Stufen -, darueber liegen
 * die festen Chancen, mal dem Gluecksschal. Zusammen ueber 100 %: anteilig gekuerzt.
 */
export function findTable(mob, chances, luck = 1, odds) {
  const out = killOdds(mob, chances, luck);
  if (!hasKillOdds(odds)) return out;
  const factor = Number(luck) || 0;
  const own = chances?.mobSpecific !== false ? dropsOf(mob) : [];
  for (const a of droppable()) {
    const fixed = fixedOf(odds, oddsKey(mob, a.id)) ?? (own.includes(a.id) ? undefined : fixedOf(odds, oddsKey(ANY_MOB, a.id)));
    if (fixed === undefined) continue;
    const p = Math.min(1, fixed * factor);
    if (p > 0) out[a.id] = p;
    else delete out[a.id];
  }
  const sum = Object.values(out).reduce((n, p) => n + p, 0);
  if (sum > 1) for (const id of Object.keys(out)) out[id] /= sum;
  return out;
}

/**
 * Was in einem Mimic steckt (zusammen genau 1): mimicOdds(), darueber die festen Anteile - die
 * uebrigen teilen sich, was dann noch bleibt, im alten Verhaeltnis.
 */
export function mimicTable(odds) {
  const base = mimicOdds();
  if (!hasMimicOdds(odds)) return base;
  const fixed = {};
  for (const a of droppable()) {
    const f = fixedOf(odds, oddsKey(MIMIC_SOURCE, a.id));
    if (f !== undefined) fixed[a.id] = f;
  }
  const fixedSum = Object.values(fixed).reduce((n, p) => n + p, 0);
  const restIds = Object.keys(base).filter((id) => !(id in fixed));
  const restBase = restIds.reduce((n, id) => n + base[id], 0);
  const rest = Math.max(0, 1 - fixedSum);
  const out = {};
  if (restBase > 0) for (const id of restIds) if (rest > 0) out[id] = (base[id] / restBase) * rest;
  for (const [id, p] of Object.entries(fixed)) if (p > 0) out[id] = p;
  // Ein Mimic gibt immer genau eins
  const sum = Object.values(out).reduce((n, p) => n + p, 0);
  if (sum > 0) for (const id of Object.keys(out)) out[id] /= sum;
  return out;
}

const pickOf = (rules) => (key, fallback) => (typeof rules?.[key] === "number" && Number.isFinite(rules[key]) ? rules[key] : fallback);

/** Die Fundchancen der Stufen (wie chancesOf in store.js) aus Regeln in der Form von publicRules(). */
export function chancesFrom(rules = {}) {
  const pick = pickOf(rules);
  return {
    common: pick("common", DROP_CHANCES.common),
    uncommon: pick("uncommon", DROP_CHANCES.uncommon),
    rare: pick("rare", DROP_CHANCES.rare),
    scatterShare: pick("scatterShare", SCATTER_SHARE),
    scatterLegendary: pick("scatterLegendary", SCATTER_LEGENDARY),
    bossLegendary: pick("bossLegendary", BOSS_LEGENDARY),
    mobSpecific: rules?.mobSpecific !== false,
  };
}

/**
 * Die Liste fuer den Operator: je Artefakt seine Fundorte, jeder mit dem gerechneten Wert (ohne
 * feste Chancen, ohne Schal) und dem festen, falls es einen gibt - in Prozent. Das Menue im
 * Spiel und die Verwaltung der Webseite zeigen damit dasselbe.
 * @returns {{id:string, rows:{key:string, source:string, calc:number, fixed:number|undefined}[]}[]}
 */
export function oddsSheet(rules = {}, odds = {}) {
  const chances = chancesFrom(rules);
  const cache = new Map();
  const base = (mob) => {
    if (!cache.has(mob)) cache.set(mob, killOdds(mob, chances, 1));
    return cache.get(mob);
  };
  const mimic = mimicOdds();
  const row = (source, id, p) => {
    const key = oddsKey(source, id);
    return { key, source, calc: (p ?? 0) * 100, fixed: typeof odds?.[key] === "number" ? odds[key] : undefined };
  };
  return droppable().map((a) => ({
    id: a.id,
    rows: [...sourcesOf(a.id).map((mob) => row(mob, a.id, base(mob)[a.id])), row(ANY_MOB, a.id, base("")[a.id]), row(MIMIC_SOURCE, a.id, mimic[a.id])],
  }));
}

/**
 * Fundchancen fuer den Server-Guide der Webseite: je Artefakt und Fundort die Wahrscheinlichkeit
 * pro Kill, ohne und mit Gluecksschal, dazu "jedes andere Monster" und Mimic. Die Webseite
 * rechnet damit die Weltregeln nach, die der Server meldet - eine Kopie dieser Datei liegt
 * unter web/shared/.
 *
 * @param {object} rules  wie publicRules() in store.js: common, uncommon, rare, scatterShare,
 *                        scatterLegendary, bossLegendary, mobSpecific, mimics, rewindChance,
 *                        luckFind, luckWatch, odds - was fehlt, hat den Standardwert
 * @returns {Object<string, {from: {mob: string, p: number, p2: number}[], any: number, any2: number, mimic: number}>}
 */
export function guideOdds(rules = {}) {
  const pick = pickOf(rules);
  const chances = chancesFrom(rules);
  const fixed = rules?.odds;
  const luck = Math.max(1, pick("luckFind", LUCK));
  const luckWatch = Math.max(1, pick("luckWatch", LUCK));
  const watch = pick("rewindChance", REWIND_CHANCE);
  const cache = new Map();
  const table = (mob, factor) => {
    const key = mob + "|" + factor;
    if (!cache.has(key)) cache.set(key, findTable(mob, chances, factor, fixed));
    return cache.get(key);
  };
  const mimic = rules?.mimics === false ? {} : mimicTable(fixed);
  const out = {};
  for (const a of ARTIFACTS) {
    out[a.id] = {
      from: sourcesOf(a.id).map((mob) => ({ mob, p: table(mob, 1)[a.id] ?? 0, p2: table(mob, luck)[a.id] ?? 0 })),
      // Die Rueckspuluhr hat keinen Topf, sondern ihren eigenen Wurf bei jedem Monster
      any: a.everywhere ? rewindOdds(watch, 1) : (table("", 1)[a.id] ?? 0),
      any2: a.everywhere ? rewindOdds(watch, luckWatch) : (table("", luck)[a.id] ?? 0),
      mimic: mimic[a.id] ?? 0,
    };
  }
  return out;
}

/** Leere Platzbelegung. */
export const emptySlots = () => Object.fromEntries(SLOTS.map((s) => [s, null]));

/** Angelegte Artefakte als Liste [{slot, artifact}], leere Plaetze ausgelassen. */
export function wornList(equipped) {
  const out = [];
  for (const slot of SLOTS) {
    const a = artifactById(equipped?.[slot]);
    if (a) out.push({ slot, artifact: a });
  }
  return out;
}

/**
 * Wirkt dieses Artefakt gerade? Angelegt auf einem der fuenf Plaetze - oder, bei einem
 * getragenen Artefakt, schlicht im Inventar (siehe withCarried).
 */
export const isWorn = (equipped, id) => equipped?.carried?.includes(id) === true || SLOTS.some((s) => equipped?.[s] === id);

/** Die angelegten Artefakte plus die, die jemand nur bei sich traegt. */
export function withCarried(equipped, carried) {
  if (!carried?.length) return equipped;
  return { ...equipped, carried: [...carried] };
}

/** Wieviele Artefakte der begrenzten Stufen sind angelegt (legendaer und mythisch)? */
export const legendaryCount = (equipped) => wornList(equipped).filter((e) => isLimited(e.artifact.rarity)).length;

/** Traegt dieses Artefakt niemand am Koerper, egal was der Sichtbarkeitsschalter sagt? */
export const isInvisible = (id) => !!artifactById(id)?.invisible;
/** Woher es kommt, wenn kein Mob dahintersteckt - sonst undefined. */
export const originKeyOf = (id) => artifactById(id)?.origin;

/** Hoechste angelegte Stufe - faerbt die Anzeige in der Aktionsleiste. */
export function topRarity(equipped) {
  let best;
  for (const { artifact } of wornList(equipped)) {
    if (!best || RARITIES.indexOf(artifact.rarity) > RARITIES.indexOf(best)) best = artifact.rarity;
  }
  return best;
}

/** Wert eines angelegten Artefakts (0, wenn es nicht getragen wird). */
export function valueOf(equipped, id, fallback = 0) {
  if (!isWorn(equipped, id)) return 0;
  return artifactById(id)?.value ?? fallback;
}

/** Faktor auf eine Fundchance: mit Gluecksschal der eingestellte (Standard LUCK), sonst 1. */
export const luckOf = (equipped, factor = LUCK) => (isWorn(equipped, "lucky_scarf") ? Math.max(1, Number(factor) || 1) : 1);

// ---------------------------------------------------------------- kleine Rechenhelfer
/** Trifft eine Chance in Prozent? */
export const chanceHit = (percent, rand = Math.random) => percent > 0 && rand() * 100 < percent;

/** Lebensraub: Anteil des ausgeteilten Schadens, auf 0,5 gerundet. */
export const lifesteal = (damage, percent) => Math.round(Math.max(0, damage) * (percent / 100) * 2) / 2;

/** Fortschritt einer Abklingzeit: true, wenn sie abgelaufen ist. */
export const cooldownOver = (lastTick, currentTick, ticks) => !Number.isFinite(lastTick) || currentTick - lastTick >= ticks;
