/**
 * Server-Guide: worum es auf dem Server geht, das Regelwerk und alle Addons mit Anleitung,
 * Items, Rezepten, Erzen, Kreaturen und Bauwerken.
 *
 *   #/guide              Ueberblick
 *   #/guide/rules        Regeln
 *   #/guide/addons       alle Addons
 *   #/guide/addon/<slug> ein Addon
 *   #/guide/items        Items & Rezepte (Suche ueber alle Addons)
 *
 * Die Texte stehen in guide/texts.js (von Hand), die Daten in guide/<slug>.json (aus den Packs,
 * tools/gen-guide.mjs). Geladen wird erst, wenn man hinschaut. Die Seite zeichnet sich nur neu,
 * wenn sich die Adresse oder die Sprache aendert - beim regelmaessigen Aktualisieren der
 * Webseite bleiben Scrollstand und aufgeklappte Abschnitte erhalten.
 */
import { state, t, getJson, itemName } from "../core.js";
import { el, $, head, tabs, itemIcon } from "../ui.js";
import { icon } from "../icons.js";
import { go, subRoute, ITEM_IDS } from "../app.js";
import { SERVER, RULES, ADDONS } from "../guide/texts.js";
import { pct, oneIn, num } from "../guide/odds.js";

let index;
const data = new Map(); // slug -> Daten eines Addons
const known = new Map(); // ID -> { n, i, slug, s, d, g, kind }
let rendered = "";
let token = 0;

// ---------------------------------------------------------------- Laden
async function ensureIndex() {
  index ??= await getJson("guide/index.json").catch(() => ({ addons: [], icons: { size: 16, cols: 1, rows: 1 } }));
  return index;
}

async function load(slug) {
  if (data.has(slug)) return data.get(slug);
  const d = await getJson("guide/" + slug + ".json").catch(() => undefined);
  if (!d) return undefined;
  data.set(slug, d);
  for (const it of d.items ?? []) known.set(it.id, { ...it, slug, kind: "item" });
  for (const b of d.blocks ?? []) if (!known.has(b.id)) known.set(b.id, { ...b, slug, kind: "block" });
  return d;
}

const withData = () => (index?.addons ?? []).filter((a) => !a.own && !a.encrypted && !a.missing);
const loadAll = () => Promise.all(withData().map((a) => load(a.slug)));

// ---------------------------------------------------------------- Kleinigkeiten
/** **fett**, *kursiv* und `code` - als echte Elemente, nie als HTML. */
export function rich(text) {
  const out = [];
  for (const part of String(text ?? "").split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/)) {
    if (!part) continue;
    if (part.startsWith("**")) out.push(el("b", "", part.slice(2, -2)));
    else if (part.startsWith("`")) out.push(el("code", "", part.slice(1, -1)));
    else if (part.startsWith("*") && part.length > 2) out.push(el("em", "", part.slice(1, -1)));
    else out.push(part);
  }
  return out;
}
const p = (text, cls = "") => el("p", cls, ...rich(text));
const lang = (o) => (o ? (state.lang === "de" && o.de) || o.en : "");
const title = (a) => ADDONS[a.slug]?.title ?? a.name;
const vanillaKey = new Map();

/** Name eines Items - aus den Addon-Daten, sonst aus den Minecraft-Texten. */
export function nameOf(id) {
  const k = known.get(id);
  if (k) return lang(k.n);
  if (String(id).startsWith("#")) return t("web.guide.tag", String(id).slice(1).replace(/^minecraft:/, "").replace(/_/g, " "));
  if (!vanillaKey.size) for (const [vid, key] of ITEM_IDS) vanillaKey.set(vid, key);
  const potion = String(id).match(/potion_type:(.+)$/);
  if (potion) return t("web.guide.potion", potion[1].replace(/_/g, " "));
  return itemName({ t: id, k: vanillaKey.get(id) || undefined });
}

/** Bild eines Items - aus dem Guide-Atlas, sonst wie ueberall auf der Seite. */
export function iconOf(id, size = 24) {
  const k = known.get(id);
  if (k?.i === undefined || !index) return itemIcon(String(id).startsWith("#") ? "?" : id, size);
  const a = index.icons;
  const box = el("i", "ico gico");
  box.style.width = box.style.height = size + "px";
  box.style.backgroundSize = a.cols * size + "px " + a.rows * size + "px";
  box.style.backgroundPosition = -(k.i % a.cols) * size + "px " + -Math.floor(k.i / a.cols) * size + "px";
  return box;
}

const KIND = { inhalt: "good", komfort: "", gemeinschaft: "warn", technik: "" };

// ---------------------------------------------------------------- Seite
export async function renderGuide() {
  const route = subRoute() || "overview";
  const key = route + "|" + state.lang;
  const page = $("page-guide");
  if (key === rendered && page.childElementCount) return;
  rendered = key;
  if (openDlg?.open) openDlg.close();
  const mine = ++token;
  await ensureIndex();
  const [tab, arg] = route.split("/");
  const current = tab === "addon" ? "addons" : ["rules", "addons", "items"].includes(tab) ? tab : "overview";
  const nav = tabs(
    [
      ["overview", t("web.guide.tab.overview")],
      ["rules", t("web.guide.tab.rules")],
      ["addons", t("web.guide.tab.addons")],
      ["items", t("web.guide.tab.items")],
    ],
    current,
    (k) => go("guide", k === "overview" ? undefined : k)
  );
  page.replaceChildren(el("div", "guide-nav wide", nav), el("p", "muted", t("web.guide.loading")));
  let body;
  if (tab === "rules") body = rulesView();
  else if (tab === "addons") body = addonsView();
  else if (tab === "addon") body = await addonView(arg);
  else if (tab === "items") body = await itemsView(decodeURIComponent(arg ?? ""));
  else body = overviewView();
  if (mine !== token) return; // inzwischen woanders hin
  page.replaceChildren(el("div", "guide-nav wide", nav), ...[].concat(body));
  if (tab === "addon") window.scrollTo({ top: 0 });
}

// ---------------------------------------------------------------- Ueberblick
function overviewView() {
  const addonChip = (slug) => {
    const a = index.addons.find((x) => x.slug === slug);
    const c = el("a", "chip on", ADDONS[slug]?.title ?? a?.name ?? slug);
    c.href = "#/guide/addon/" + slug;
    return c;
  };
  return [
    el("section", "card wide guide-hero", el("h2", "", SERVER.title), ...SERVER.intro.map((x) => p(x, "lead"))),
    el(
      "div",
      "guide-pillars wide",
      ...SERVER.pillars.map((pl) => el("section", "card pillar", head(pl.title, pl.icon), p(pl.text), el("div", "filters", ...pl.addons.map(addonChip))))
    ),
    el("section", "card", head(t("web.guide.start"), "check"), el("ol", "steps", ...SERVER.start.map((x) => el("li", "", el("span", "", ...rich(x)))))),
    el("section", "card", head(t("web.guide.keys"), "settings"), el("dl", "keys", ...SERVER.keys.flatMap(([k, v]) => [el("dt", "", ...rich(k)), el("dd", "", ...rich(v))]))),
    el("section", "card wide", head(t("web.guide.path"), "map"), el("ol", "path", ...SERVER.path.map((s) => el("li", "", el("b", "", s.stage), p(s.text))))),
    el("section", "card wide", head(t("web.guide.addons"), "legacy"), el("div", "filters", ...index.addons.filter((a) => !a.missing && a.slug !== "essentials-web").map((a) => addonChip(a.slug)))),
  ];
}

// ---------------------------------------------------------------- Regeln
function rulesView() {
  return [
    el("section", "card wide guide-hero", el("h2", "", t("web.guide.rules.title")), p(t("web.guide.rules.lead"), "lead")),
    ...RULES.map((r) => el("section", "card rule", el("h3", "", r.title), el("ul", "", ...r.items.map((x) => el("li", "", el("span", "", ...rich(x))))))),
  ];
}

// ---------------------------------------------------------------- Addons
function addonsView() {
  return el(
    "div",
    "guide-addons wide",
    ...index.addons
      .filter((a) => !a.missing && a.slug !== "essentials-web")
      .map((a) => {
        const txt = ADDONS[a.slug] ?? {};
        const counts = [["items", a.items], ["recipes", a.recipes], ["mobs", a.mobs], ["structures", a.structures]].filter(([, n]) => n > 0).map(([k, n]) => t("web.guide.count." + k, n));
        const card = el(
          "a",
          "card addon-card",
          el("div", "card-head", el("h2", "", title(a)), txt.kind ? el("span", "tag " + (KIND[txt.kind] ?? ""), t("web.guide.kind." + txt.kind)) : ""),
          txt.short ? p(txt.short) : "",
          a.encrypted ? el("p", "muted small", t("web.guide.encrypted")) : counts.length ? el("p", "muted small", counts.join(" · ")) : ""
        );
        card.href = "#/guide/addon/" + a.slug;
        return card;
      })
  );
}

async function addonView(slug) {
  const a = index.addons.find((x) => x.slug === slug);
  if (!a) return el("section", "card", p(t("web.guide.none")));
  const txt = ADDONS[slug] ?? {};
  const d = !a.own && !a.encrypted ? await load(slug) : undefined;
  const parts = [];
  const back = el("a", "btn ghost small", icon("back"), t("web.guide.tab.addons"));
  back.href = "#/guide/addons";
  parts.push(
    el(
      "section",
      "card wide guide-hero",
      el("div", "card-head", el("h2", "", title(a)), el("div", "actions", txt.kind ? el("span", "tag " + (KIND[txt.kind] ?? ""), t("web.guide.kind." + txt.kind)) : "", back)),
      el("p", "muted small", [txt.by, a.version ? "Version " + a.version : ""].filter(Boolean).join(" · ")),
      txt.short ? p(txt.short, "lead") : "",
      ...(txt.about ?? []).map((x) => p(x)),
      ...(txt.warn ?? []).map((x) => el("p", "callout bad", ...rich(x))),
      a.encrypted && !txt.warn ? el("p", "callout bad", t("web.guide.encrypted")) : ""
    )
  );
  if (txt.start?.length) parts.push(el("section", "card", head(t("web.guide.howto"), "check"), el("ol", "steps", ...txt.start.map((x) => el("li", "", el("span", "", ...rich(x)))))));
  if (txt.features?.length) parts.push(el("section", "card" + (txt.start?.length ? "" : " wide"), head(t("web.guide.features"), "legacy"), el("dl", "features", ...txt.features.flatMap(([k, v]) => [el("dt", "", ...rich(k)), el("dd", "", ...rich(v))]))));
  if (txt.tips?.length) parts.push(el("section", "card wide", head(t("web.guide.tips"), "info"), el("ul", "tips", ...txt.tips.map((x) => el("li", "", el("span", "", ...rich(x)))))));
  if (slug === "essentials") parts.push(...(await artifactsView()));
  if (!d) return parts;

  if (d.wiki?.length) parts.push(el("section", "card wide", head(t("web.guide.wiki"), "info"), el("div", "wiki", ...d.wiki.map((w) => el("details", "", el("summary", "", lang(w.t)), p(lang(w.d)))))));
  if (d.ores?.length) parts.push(oresCard(d));
  if (d.mobs?.length) parts.push(mobsCard(d));
  if (d.structures?.length) parts.push(el("section", "card wide", head(t("web.guide.structures"), "map"), el("dl", "structures", ...d.structures.flatMap((s) => [el("dt", "", prettyGroup(s.g)), el("dd", "", s.list.join(" · "))]))));
  if (d.loot?.length) parts.push(el("section", "card wide", head(t("web.guide.loot"), "gift"), el("div", "loot", ...d.loot.map((id) => slot(id)))));
  if (d.items?.length) parts.push(gridCard(t("web.guide.items"), d.items));
  if (d.blocks?.length) parts.push(gridCard(t("web.guide.blocks"), d.blocks, true));
  return parts;
}

// ---------------------------------------------------------------- Artefakte (Essentials)
/**
 * Alle Artefakte mit Faehigkeit, Platz und Fundchance - aus guide/artifacts.json, das
 * tools/web.mjs mit denselben Formeln rechnet, mit denen das Spiel wuerfelt.
 */
let arts;
let lucky = false; // Schalter "mit Gluecksschal" - bleibt stehen, solange die Seite offen ist

const chance = (x) => {
  const n = oneIn(x);
  return [el("b", "", pct(x, state.lang)), n ? el("small", "muted", " · " + t("web.guide.art.onein", num(n, state.lang))) : ""];
};
const srcRow = (label, x) => [el("dt", "", label), el("dd", "", ...chance(x))];
const slotName = (s) => t(s === "carried" ? "web.guide.art.carried" : "artifacts.slot." + s);

async function artifactsView() {
  arts ??= await getJson("guide/artifacts.json").catch(() => undefined);
  if (!arts) return [];
  const r = arts.rules;
  const P = (percent) => pct(percent / 100, state.lang);
  const how = [
    t("web.guide.art.how.slots"),
    t("web.guide.art.how.own", P(r.common), P(r.uncommon), P(r.rare)),
    t("web.guide.art.how.scatter", num(r.scatterShare, state.lang) + " %", P(r.scatterLegendary)),
    t("web.guide.art.how.boss", P(r.bossLegendary), P(r.bossLegendary * (r.bossShare?.ravager ?? 0.5))),
    t("web.guide.art.how.mimic", r.mimicEvery, P(r.mimicChance), r.mimicY[0], r.mimicY[1]),
    t("web.guide.art.how.limits", r.legendaryLimit),
    t("web.guide.art.how.luck"),
    t("web.guide.art.how.enchant"),
  ];

  const search = el("input");
  search.type = "search";
  search.placeholder = t("web.guide.filter");
  const option = (value, label) => Object.assign(el("option", "", label), { value });
  const slotSel = el("select", "", option("", t("web.guide.art.slot.all")), ...arts.slots.map((s) => option(s, slotName(s))));
  const raritySel = el("select", "", option("", t("web.guide.art.rarity.all")), ...arts.rarities.map((x) => option(x, t("artifacts.rarity." + x))));
  const luck = el("input");
  luck.type = "checkbox";
  luck.checked = lucky;
  const luckLabel = el("label", "check", luck, t("web.guide.art.luck"));
  const info = el("p", "muted small");
  const grid = el("div", "art-grid");
  const mobBody = el("tbody");

  const card = (a) => {
    const rows = [
      ...a.from.flatMap((s) => srcRow(lang(arts.mobs[s.mob]) + (s.boss ? " ★" : ""), lucky ? s.p2 : s.p)),
      ...(a.any ? srcRow(t("web.guide.art.anymonster"), lucky ? a.any2 : a.any) : []),
      // Mimics geben immer eins - der Schal aendert daran nichts
      ...(a.mimic ? srcRow(t("web.guide.art.mimic"), a.mimic) : []),
    ];
    return el(
      "article",
      "art-card r-" + a.rarity,
      el(
        "div",
        "art-head",
        itemIcon(a.item, 36),
        el(
          "div",
          "",
          el("b", "", lang(a.n)),
          state.lang === "de" && a.n.en && a.n.en !== a.n.de ? el("small", "muted sub", a.n.en) : "",
          el("div", "tags", el("span", "tag rar r-" + a.rarity, t("artifacts.rarity." + a.rarity)), el("span", "tag", slotName(a.slot)))
        )
      ),
      p(lang(a.d)),
      a.origin ? el("p", "muted small", "⚑ " + lang(a.origin)) : "",
      rows.length ? el("dl", "art-src", ...rows) : ""
    );
  };

  const draw = () => {
    lucky = luck.checked;
    const q = search.value.trim().toLowerCase();
    const shown = arts.list.filter(
      (a) =>
        (!slotSel.value || a.slot === slotSel.value) &&
        (!raritySel.value || a.rarity === raritySel.value) &&
        (!q || [a.n.de, a.n.en, a.d.de, a.d.en, ...a.from.map((s) => lang(arts.mobs[s.mob]))].join(" ").toLowerCase().includes(q))
    );
    info.textContent = t("web.guide.art.count", shown.length, arts.list.length);
    grid.replaceChildren(...(shown.length ? shown.map(card) : [el("p", "empty", t("web.guide.art.none"))]));
    // Nach Monster: dieselben Zahlen, andersherum gelesen
    const byMob = new Map();
    for (const a of arts.list) for (const s of a.from) byMob.set(s.mob, [...(byMob.get(s.mob) ?? []), [a, s]]);
    mobBody.replaceChildren(
      ...[...byMob].map(([mob, list]) =>
        el(
          "tr",
          "",
          el("td", "", el("b", "", lang(arts.mobs[mob])), r.bossShare?.[mob] ? el("small", "muted sub", t("web.guide.art.boss")) : ""),
          el("td", "", el("div", "art-chips", ...list.map(([a, s]) => el("span", "art-chip r-" + a.rarity, itemIcon(a.item, 20), el("span", "", lang(a.n)), el("b", "", pct(lucky ? s.p2 : s.p, state.lang))))))
        )
      )
    );
  };
  for (const c of [search, slotSel, raritySel]) c.addEventListener("input", draw);
  luck.addEventListener("change", draw);
  draw();

  return [
    el("section", "card wide", head(t("web.guide.art.how"), "info"), p(t("web.guide.art.lead", arts.list.length), "muted"), el("ul", "tips", ...how.map((x) => el("li", "", el("span", "", ...rich(x)))))),
    el("section", "card wide", head(t("web.guide.art.title") + " (" + arts.list.length + ")", "gift"), el("div", "toolbar art-toolbar", search, slotSel, raritySel, luckLabel), info, grid),
    el(
      "section",
      "card wide",
      head(t("web.guide.art.bymob"), "players"),
      p(t("web.guide.art.bymob.lead"), "muted small"),
      el("div", "table-wrap", el("table", "data art-mobs", el("thead", "", el("tr", "", el("th", "", t("web.guide.col.name")), el("th", "", t("web.guide.art.title")))), mobBody))
    ),
  ];
}

const prettyGroup = (g) => String(g).replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const DIM = { overworld: "web.map.overworld", nether: "web.map.nether", the_end: "web.map.end" };

function oresCard(d) {
  const order = { overworld: 0, nether: 1, the_end: 2 };
  const sorted = [...d.ores].sort((x, y) => (order[x.dims[0]] ?? 3) - (order[y.dims[0]] ?? 3) || nameOf(x.b[0]).localeCompare(nameOf(y.b[0])));
  const rows = sorted.map((o) =>
    el(
      "tr",
      "",
      el("td", "", el("span", "ore", ...o.b.slice(0, 1).map((id) => iconOf(id, 22)), el("span", "", nameOf(o.b[0]))), o.b.length > 1 ? el("small", "muted sub", t("web.guide.variants", o.b.length - 1)) : ""),
      el("td", "", o.dims.map((x) => t(DIM[x] ?? x)).join(", ")),
      el("td", "", o.y ? (o.y[0] ?? "?") + " … " + (o.y[1] ?? "?") : "–"),
      el("td", "", o.per !== undefined ? String(o.per) + (o.chance !== undefined && o.chance < 1 ? " (" + Math.round(o.chance * 100) + " %)" : "") : "–"),
      el("td", "", o.size ? String(o.size) : "–")
    )
  );
  return el(
    "section",
    "card wide",
    head(t("web.guide.ores"), "pin"),
    el("div", "table-wrap", el("table", "data", el("thead", "", el("tr", "", ...["ore", "dim", "height", "perchunk", "size"].map((k) => el("th", "", t("web.guide.col." + k))))), el("tbody", "", ...rows))),
    el("p", "muted small", t("web.guide.ores.hint"))
  );
}

function mobsCard(d) {
  const search = el("input");
  search.type = "search";
  search.placeholder = t("web.guide.filter");
  const body = el("tbody");
  const draw = () => {
    const q = search.value.trim().toLowerCase();
    const list = d.mobs.filter((m) => !q || (lang(m.n) + " " + m.n.en + " " + m.id).toLowerCase().includes(q));
    body.replaceChildren(
      ...list.slice(0, 400).map((m) =>
        el(
          "tr",
          "",
          el("td", "", el("b", "", lang(m.n)), m.d ? el("small", "muted sub", lang(m.d)) : ""),
          el("td", "", m.hp !== undefined ? "♥ " + m.hp : "–"),
          el("td", "", m.atk !== undefined ? "⚔ " + m.atk : "–"),
          el("td", "", m.h === 1 ? el("span", "tag bad", t("web.guide.hostile")) : m.h === 2 ? el("span", "tag warn", t("web.guide.neutral")) : el("span", "tag", t("web.guide.peaceful"))),
          el("td", "", el("span", "loot", ...(m.drops ?? []).slice(0, 8).map((id) => slot(id, undefined, 22))))
        )
      )
    );
  };
  search.addEventListener("input", draw);
  draw();
  return el(
    "section",
    "card wide",
    head(t("web.guide.mobs") + " (" + d.mobs.length + ")", "players"),
    el("div", "toolbar", search),
    el("div", "table-wrap tall", el("table", "data", el("thead", "", el("tr", "", ...["name", "hp", "atk", "type", "drops"].map((k) => el("th", "", t("web.guide.col." + k))))), body))
  );
}

/** Raster aller Items/Bloecke eines Addons - mit Filter nach Name und Gruppe. */
function gridCard(label, list, collapsed = false) {
  const search = el("input");
  search.type = "search";
  search.placeholder = t("web.guide.filter");
  const groups = [...new Set(list.map((x) => x.g).filter(Boolean))].sort();
  const sel = el("select");
  sel.append(Object.assign(el("option", "", t("web.guide.all")), { value: "" }), ...groups.map((g) => Object.assign(el("option", "", prettyGroup(g)), { value: g })));
  const grid = el("div", "igrid");
  const draw = () => {
    const q = search.value.trim().toLowerCase();
    const shown = list.filter((x) => (!sel.value || x.g === sel.value) && (!q || (lang(x.n) + " " + x.n.en + " " + x.id).toLowerCase().includes(q)));
    grid.replaceChildren(...shown.map((x) => tile(x)));
  };
  search.addEventListener("input", draw);
  sel.addEventListener("change", draw);
  const box = el("details", "card wide grid-card", el("summary", "", el("h2", "", label + " (" + list.length + ")")), el("div", "toolbar", search, groups.length > 1 ? sel : ""), grid);
  box.open = !collapsed;
  let drawn = false;
  // Grosse Raster erst zeichnen, wenn sie offen sind
  const ensure = () => {
    if (box.open && !drawn) {
      drawn = true;
      draw();
    }
  };
  box.addEventListener("toggle", ensure);
  ensure();
  return box;
}

function tile(x) {
  const b = el("button", "itile", iconOf(x.id, 32), el("span", "", lang(x.n)));
  b.type = "button";
  b.title = x.id;
  b.addEventListener("click", () => itemDialog(x.id));
  return b;
}

/** Ein Feld mit Bild (und Anzahl) - klickbar, wenn es ein Item ist. */
function slot(id, count, size = 28) {
  const b = el("button", "slot", iconOf(id, size), count > 1 ? el("b", "cnt", String(count)) : "");
  b.type = "button";
  b.title = nameOf(id);
  if (!String(id).startsWith("#")) b.addEventListener("click", () => itemDialog(id));
  else b.disabled = true;
  return b;
}

// ---------------------------------------------------------------- Rezepte
/** Gleiche Rezepte an verschiedenen Stationen (Ofen und Schmelzofen ...) nur einmal zeigen. */
function merge(list) {
  const by = new Map();
  for (const r of list) {
    const sig = [r.r, r.n ?? 1, r.w, r.h, r.k === "crafting_table" ? "ct" : "x", ...r.c].join("|");
    const seen = by.get(sig);
    if (seen) seen.ks.push(r.k);
    else by.set(sig, { ...r, ks: [r.k] });
  }
  return [...by.values()];
}

function recipeView(r) {
  let input;
  if (r.k === "crafting_table" && r.w > 0) {
    input = el("div", "rgrid");
    input.style.gridTemplateColumns = "repeat(" + r.w + ", auto)";
    input.append(...r.c.map((c) => (c ? slot(c) : el("span", "slot empty"))));
  } else {
    input = el("div", "rrow", ...r.c.map((c) => (c ? slot(c) : "")));
  }
  const station = (r.ks ?? [r.k]).map((k) => t("web.guide.station." + k)).join(" / ") + (r.k === "crafting_table" && !r.w ? " · " + t("web.guide.shapeless") : "");
  return el("div", "recipe", el("span", "station muted small", station), el("div", "rbody", input, el("span", "arrow", "→"), slot(r.r, r.n, 34)));
}

/** Alle Rezepte (aller geladenen Addons), die id herstellen bzw. verwenden. */
function recipesFor(id) {
  const make = [];
  const use = [];
  for (const d of data.values()) {
    for (const r of d.recipes ?? []) {
      if (r.r === id) make.push(r);
      else if (r.c.includes(id)) use.push(r);
    }
  }
  return { make, use };
}

const STATS = [
  ["dur", (v) => String(v)],
  ["dmg", (v) => String(v)],
  ["armor", (v) => String(v)],
  ["slot", (v) => t("web.guide.slot." + v)],
  ["speed", (v) => String(v)],
  ["food", (v) => String(v)],
  ["sat", (v) => String(v)],
  ["stack", (v) => String(v)],
];

let openDlg;
async function itemDialog(id) {
  await loadAll();
  const k = known.get(id);
  const found = recipesFor(id);
  const make = merge(found.make);
  const use = found.use;
  const addon = k ? index.addons.find((a) => a.slug === k.slug) : undefined;
  const statsRows = k?.s ? STATS.filter(([key]) => k.s[key] !== undefined).flatMap(([key, f]) => [el("dt", "", t("web.guide.s." + key)), el("dd", "", f(k.s[key]))]) : [];
  const body = el(
    "div",
    "item-detail",
    el("div", "item-head", iconOf(id, 48), el("div", "", el("h3", "", nameOf(id)), el("p", "muted small", [k?.n?.de && state.lang === "de" ? k.n.en : "", addon ? title(addon) : "Minecraft", id].filter(Boolean).join(" · ")))),
    k?.n?.extra ? p(k.n.extra, "muted") : "",
    k?.d ? p(lang(k.d)) : "",
    statsRows.length ? el("dl", "stats", ...statsRows) : "",
    el("h4", "", t("web.guide.recipes") + " (" + make.length + ")"),
    make.length ? el("div", "recipes", ...make.slice(0, 12).map(recipeView)) : el("p", "muted small", t(k ? "web.guide.norecipe" : "web.guide.vanilla")),
    use.length ? el("h4", "", t("web.guide.uses") + " (" + use.length + ")") : "",
    use.length ? el("div", "loot", ...[...new Set(use.map((r) => r.r))].slice(0, 60).map((rid) => slot(rid))) : ""
  );
  if (!openDlg || !openDlg.isConnected) {
    openDlg = el("dialog", "dlg guide-dlg");
    openDlg.addEventListener("click", (e) => e.target === openDlg && openDlg.close());
    openDlg.addEventListener("close", () => openDlg.remove());
    document.body.append(openDlg);
  }
  const close = el("button", "icon-btn close", icon("close"));
  close.type = "button";
  close.title = t("web.cancel");
  close.addEventListener("click", () => openDlg.close());
  openDlg.replaceChildren(close, body);
  if (!openDlg.open) openDlg.showModal();
  openDlg.scrollTop = 0;
}

// ---------------------------------------------------------------- Items & Rezepte
async function itemsView(initial) {
  await loadAll();
  const search = el("input");
  search.type = "search";
  search.placeholder = t("web.guide.search");
  search.value = initial;
  const sel = el("select");
  sel.append(Object.assign(el("option", "", t("web.guide.all")), { value: "" }), ...withData().filter((a) => a.items || a.blocks).map((a) => Object.assign(el("option", "", title(a)), { value: a.slug })));
  const info = el("p", "muted small");
  const list = el("div", "igrid");
  const draw = () => {
    const q = search.value.trim().toLowerCase();
    const all = [...known.values()].filter((x) => (!sel.value || x.slug === sel.value) && (!q || (lang(x.n) + " " + x.n.en + " " + x.id).toLowerCase().includes(q)));
    info.textContent = t("web.guide.results", all.length);
    list.replaceChildren(...all.slice(0, 300).map((x) => tile(x)));
  };
  search.addEventListener("input", draw);
  sel.addEventListener("change", draw);
  draw();
  setTimeout(() => search.focus());
  const total = withData().reduce((n, a) => n + (a.recipes ?? 0), 0);
  return el("section", "card wide", head(t("web.guide.tab.items"), "search"), p(t("web.guide.items.lead", known.size, total), "muted"), el("div", "toolbar", search, sel), info, list);
}
