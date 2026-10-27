/**
 * Verwaltung -> Weltregeln: alles, was ein Operator im Spiel unter den Weltregeln der Module
 * einstellt - je Modul eine Karte. Die Tabellen (core/settings.js im Addon) schickt der Server
 * mit, samt Grenzen und Raster; geprueft wird dort noch einmal genauso.
 *
 * Darunter die einzelnen Artefakt-Chancen: je Artefakt seine Fundorte mit dem gerechneten Wert
 * und einem Feld fuer eine feste Chance. Gerechnet wird mit derselben Datei wie im Spiel
 * (web/shared/artifacts.js, oddsSheet).
 */
import { state, t, getJson } from "../core.js";
import { el, button, act, head, switchRow, itemIcon, confirmDialog } from "../ui.js";
import { plain } from "../rawtext.js";
import { refresh } from "../app.js";
import { num } from "../guide/odds.js";

// Verstellt, aber noch nicht gespeichert (je Modul) - uebersteht das Neuzeichnen der Seite
const drafts = {};
const opened = new Set();
const label = (key) => plain(t(key));
// Vier gueltige Stellen - auch 0,0023 % (num() schnitte nach drei Nachkommastellen ab)
const fmt = (n) => new Intl.NumberFormat(state.lang === "de" ? "de-DE" : "en-US", { maximumSignificantDigits: 4 }).format(Number(n) || 0);

/** 3600 -> "1 h" - fuer Auswahlen in Sekunden (Dauer einer Abstimmung). */
function seconds(s) {
  for (const [size, key] of [
    [86400, "web.admin.set.days"],
    [3600, "web.admin.set.hours"],
    [60, "web.admin.set.minutes"],
  ]) {
    if (s >= size && s % size === 0) return t(key, num(s / size, state.lang));
  }
  return t("web.admin.set.seconds", num(s, state.lang));
}

function optionText(spec, value, i) {
  if (spec.labels) return label(spec.labels[i]);
  if (spec.format === "seconds") return seconds(value);
  if (spec.format === "factor") return "×" + num(value, state.lang);
  return String(value);
}

/** Ein Feld je Art (Schalter, Regler, Auswahl, Menge, Text). */
function field(spec, value, set) {
  const name = label(spec.label);
  switch (spec.kind) {
    case "toggle":
      return switchRow(name, "", value, false, (on) => set(on));
    case "number": {
      const input = el("input");
      input.type = "range";
      Object.assign(input, { min: spec.min, max: spec.max, step: spec.step, value });
      const shown = el("b", "", num(value, state.lang));
      input.addEventListener("input", () => {
        const v = Number(input.value);
        shown.textContent = num(v, state.lang);
        set(v);
      });
      return el("label", "field", el("span", "", el("span", "", name), shown), input);
    }
    case "choice": {
      const select = el("select");
      spec.options.forEach((o, i) => select.append(Object.assign(el("option", "", optionText(spec, o, i)), { value: String(i), selected: o === value })));
      // Ein alter Wert zwischen zwei Stufen: als eigene Zeile, damit die Auswahl ihn nicht still aendert
      if (!spec.options.includes(value)) select.prepend(Object.assign(el("option", "", spec.format === "seconds" ? seconds(value) : String(value)), { value: "", selected: true }));
      select.addEventListener("change", () => select.value !== "" && set(spec.options[Number(select.value)]));
      return el("label", "field", el("span", "", name), select);
    }
    case "multi": {
      const chosen = new Set(value ?? []);
      const boxes = spec.options.map((o, i) => {
        const box = el("input");
        box.type = "checkbox";
        box.checked = chosen.has(o);
        box.addEventListener("change", () => {
          if (box.checked) chosen.add(o);
          else chosen.delete(o);
          set(spec.options.filter((x) => chosen.has(x)));
        });
        return el("label", "check", box, optionText(spec, o, i));
      });
      return el("div", "field", el("span", "", name), el("div", "set-multi", ...boxes));
    }
    case "text": {
      const input = el("input");
      input.type = "text";
      input.maxLength = spec.text;
      input.value = value ?? "";
      input.addEventListener("input", () => set(input.value));
      return el("label", "field", el("span", "", name), input);
    }
  }
  return "";
}

/** Eine Karte je Modul - zugeklappt, damit die Seite bei zwanzig Modulen lesbar bleibt. */
function moduleCard(section, on) {
  const draft = (drafts[section.id] ??= {});
  const save = button(
    t("web.admin.set.save"),
    async () => {
      const res = await act("admin.settings", { module: section.id, values: { ...draft } }, { okText: t("web.admin.set.saved") });
      if (res.state === "done" || res.state === "queued") drafts[section.id] = {};
      await refresh(true);
    },
    "small"
  );
  const count = el("span", "badge");
  const status = () => {
    const n = Object.keys(draft).length;
    save.disabled = !n;
    count.textContent = n ? String(n) : "";
  };
  const mark = (spec, value) => {
    if (JSON.stringify(value) === JSON.stringify(spec.value)) delete draft[spec.key];
    else draft[spec.key] = value;
    status();
  };
  status();
  const groups = [...new Set(section.specs.map((s) => s.group ?? ""))];
  const box = el(
    "details",
    "card wide set-card",
    el("summary", "", el("h2", "", label(section.nameKey)), on === false ? el("span", "tag", t("web.admin.set.off")) : "", count),
    el(
      "div",
      "art-rules-grid",
      ...groups.map((g) =>
        el(
          "div",
          "art-rules",
          g && section.groups?.[g] ? el("h4", "", label(section.groups[g])) : "",
          ...section.specs.filter((s) => (s.group ?? "") === g).map((s) => field(s, s.key in draft ? draft[s.key] : s.value, (v) => mark(s, v)))
        )
      )
    ),
    el("div", "actions", save)
  );
  box.open = opened.has(section.id);
  box.addEventListener("toggle", () => (box.open ? opened.add(section.id) : opened.delete(section.id)));
  return box;
}

// ---------------------------------------------------------------- Einzelne Artefakt-Chancen
let arts; // guide/artifacts.json - Namen der Artefakte und Monster
let shared; // web/shared/artifacts.js - dieselbe Rechnung wie im Spiel
const oddsDraft = {};
let oddsQuery = "";
const CHUNK = 50; // so viele Werte je Befehl - ein Befehl darf hoechstens 4 KB gross sein

/** Die Fundchancen-Regeln in der Form von publicRules() - aus der Tabelle der Artefakte. */
function chanceRules(section) {
  const v = Object.fromEntries((section?.specs ?? []).map((s) => [s.key, s.value]));
  return { common: v.dropCommon, uncommon: v.dropUncommon, rare: v.dropRare, scatterShare: v.scatterShare, scatterLegendary: v.scatterLegendary, bossLegendary: v.bossLegendary, mobSpecific: v.mobSpecific };
}

const lang = (o) => (o ? o[state.lang] || o.de || o.en : "");

function sourceName(source) {
  if (source === "*") return t("web.admin.odds.any");
  if (source === "mimic") return t("web.admin.odds.mimic");
  return lang(arts.mobs?.[source.replace("minecraft:", "")]) || source;
}

async function fillOdds(box, a) {
  arts ??= await getJson("guide/artifacts.json").catch(() => undefined);
  shared ??= await import("../shared/artifacts.js").catch(() => undefined);
  if (!arts || !shared?.oddsSheet) return box.replaceChildren(head(t("web.admin.odds"), "gift"), el("p", "muted", t("web.admin.odds.none")));
  const fixed = a.artifactOdds ?? {};
  const sheet = shared.oddsSheet(chanceRules((a.settings ?? []).find((s) => s.id === "artifacts")), fixed);
  const byId = new Map(arts.list.map((x) => [x.id, x]));

  const save = button(t("web.admin.odds.save"), () => saveOdds(), "small");
  const reset = button(t("web.admin.odds.resetAll"), () => resetAll(), "ghost small");
  const status = () => {
    save.disabled = !Object.keys(oddsDraft).length;
    reset.disabled = !Object.keys(fixed).length;
  };
  async function send(set) {
    const keys = Object.keys(set);
    for (let i = 0; i < keys.length; i += CHUNK) {
      const part = Object.fromEntries(keys.slice(i, i + CHUNK).map((k) => [k, set[k]]));
      const res = await act("admin.odds", { set: part }, { okText: t("web.admin.odds.saved") });
      if (res.state !== "done" && res.state !== "queued") return false;
    }
    return true;
  }
  async function saveOdds() {
    if (await send({ ...oddsDraft })) for (const k of Object.keys(oddsDraft)) delete oddsDraft[k];
    await refresh(true);
  }
  async function resetAll() {
    if (!(await confirmDialog(t("web.admin.odds.resetAll"), t("web.admin.odds.resetAll.confirm"), t("web.admin.odds.resetAll"), true))) return;
    if (await send(Object.fromEntries(Object.keys(fixed).map((k) => [k, null])))) for (const k of Object.keys(oddsDraft)) delete oddsDraft[k];
    await refresh(true);
  }

  const rowOf = (row) => {
    const input = el("input");
    input.type = "number";
    Object.assign(input, { min: 0, max: 100, step: "any", placeholder: fmt(row.calc) });
    const current = row.key in oddsDraft ? oddsDraft[row.key] : row.fixed;
    input.value = current === null || current === undefined ? "" : String(current);
    const undo = button("↺", () => {
      if (row.fixed === undefined) delete oddsDraft[row.key];
      else oddsDraft[row.key] = null;
      input.value = "";
      paint();
      status();
    }, "ghost small");
    undo.title = t("web.admin.odds.reset");
    const paint = () => {
      const v = row.key in oddsDraft ? oddsDraft[row.key] : row.fixed;
      line.classList.toggle("fixed", v !== undefined && v !== null);
      line.classList.toggle("changed", row.key in oddsDraft);
      undo.hidden = v === undefined || v === null;
    };
    input.addEventListener("input", () => {
      const text = input.value.trim();
      const v = Number(text);
      if (!text) {
        if (row.fixed === undefined) delete oddsDraft[row.key];
        else oddsDraft[row.key] = null;
      } else if (Number.isFinite(v) && v >= 0 && v <= 100) {
        if (v === row.fixed) delete oddsDraft[row.key];
        else oddsDraft[row.key] = v;
      }
      paint();
      status();
    });
    const line = el("label", "odds-row", el("span", "", sourceName(row.source)), el("span", "odds-in", input, el("small", "muted", "%"), undo));
    line.title = t("web.admin.odds.calc", fmt(row.calc) + " %");
    paint();
    return line;
  };

  const grid = el("div", "odds-grid");
  const draw = () => {
    const q = oddsQuery.trim().toLowerCase();
    const shown = sheet.filter((entry) => {
      const x = byId.get(entry.id);
      if (!q) return true;
      return [lang(x?.n), x?.n?.en, ...entry.rows.map((r) => sourceName(r.source))].join(" ").toLowerCase().includes(q);
    });
    grid.replaceChildren(
      ...shown.map((entry) => {
        const x = byId.get(entry.id);
        const n = entry.rows.filter((r) => r.fixed !== undefined).length;
        return el(
          "article",
          "odds-card r-" + (x?.rarity ?? "common"),
          el("div", "art-head", x ? itemIcon(x.item, 28) : "", el("b", "", lang(x?.n) || entry.id), n ? el("span", "tag", t("web.admin.odds.fixed", n)) : ""),
          ...entry.rows.map(rowOf)
        );
      })
    );
  };
  const search = el("input");
  search.type = "search";
  search.placeholder = t("web.admin.odds.search");
  search.value = oddsQuery;
  search.addEventListener("input", () => {
    oddsQuery = search.value;
    draw();
  });
  draw();
  status();
  box.replaceChildren(head(t("web.admin.odds"), "gift"), el("p", "muted small", t("web.admin.odds.text")), el("div", "toolbar", search, save, reset), grid);
}

export function rulesTab(a) {
  // Erst ab Essentials 1.29 im Paket - ein aelterer Server schickt keine Tabellen
  if (!a.settings?.length) return [el("section", "card wide", head(t("web.admin.tab.rules"), "settings"), el("p", "muted", t("web.admin.set.old")))];
  const on = new Map((a.modules ?? []).map((m) => [m.id, m.on]));
  const odds = el("section", "card wide", head(t("web.admin.odds"), "gift"), el("p", "muted small", "…"));
  fillOdds(odds, a);
  return [
    el("section", "card wide", head(t("web.admin.tab.rules"), "settings"), el("p", "muted small", t("web.admin.set.text"))),
    ...a.settings.map((section) => moduleCard(section, on.get(section.id))),
    odds,
  ];
}
