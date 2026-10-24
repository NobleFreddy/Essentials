/**
 * Admin (nur Operatoren): Spieler - auch offline -, Welt, Einstellungen (Module, Spielregeln,
 * Karte), Web-Zugaenge und das Protokoll. Jede Aktion prueft das Addon noch einmal.
 */
import { state, t, resetWebsite, reasonText } from "../core.js";
import { el, $, ago, dateTime, empty, button, act, dialog, confirmDialog, tabs, head, avatar, toast } from "../ui.js";
import { plain, fill } from "../rawtext.js";
import { refresh, go, clearMapView } from "../app.js";
import { playerNames } from "./public.js";

const B = () => state.me?.bundle ?? null;
const card = (title, iconName, ...body) => el("section", "card", head(title, iconName), ...body);
const say = (key, args) => fill(state.texts[key] ?? key, (args ?? []).map((a) => plain(String(a))));

// ---------------------------------------------------------------- Admin
let adminQuery = "";
let adminFilter = "all";
const flagged = (p) => p.ban || p.frozen || p.warns > 0 || p.legacy === "timeout";

/** Wer hier steht: alle Spieler, die der Server kennt - auch offline. */
function adminList(a) {
  return a.players ?? a.online.map((p) => ({ ...p, online: true, ban: 0, warns: 0, frozen: false }));
}

function statusTags(p) {
  const tags = [];
  if (p.op) tags.push(el("span", "tag", "OP"));
  if (p.ban) tags.push(el("span", "tag bad", t("web.admin.tag.ban", p.ban < 0 ? "∞" : ago(p.ban * 60000))));
  if (p.frozen) tags.push(el("span", "tag warn", "❄ " + t("web.admin.tag.frozen")));
  if (p.warns) tags.push(el("span", "tag warn", "⚠ " + p.warns));
  if (p.legacy && p.legacy !== "alive") tags.push(el("span", "tag", t("web.admin.tag.legacy." + p.legacy)));
  return tags;
}

let adminTab = "players";

export function renderAdmin() {
  const a = B()?.admin;
  if (!a) return $("page-admin").replaceChildren(empty("web.admin.none"));
  const all = adminList(a);
  const bar = tabs(
    [
      ["players", t("web.admin.tab.players"), all.filter(flagged).length],
      ["world", t("web.admin.tab.world")],
      ["settings", t("web.admin.tab.settings")],
      ["web", t("web.admin.tab.web")],
      ["log", t("web.admin.tab.log")],
    ],
    adminTab,
    (k) => {
      adminTab = k;
      renderAdmin();
    }
  );
  const body = { players: playersTab, world: worldTab, settings: settingsTab, web: webTab, log: logTab }[adminTab](a, all);
  $("page-admin").replaceChildren(el("div", "grid", el("div", "wide", bar), ...body));
}

function playersTab(a, all) {
  const list = all.filter((p) => (adminFilter === "all" || (adminFilter === "online" ? p.online : flagged(p))) && (!adminQuery || p.name.toLowerCase().includes(adminQuery)));
  const search = el("input", "search");
  search.type = "search";
  search.placeholder = t("web.players.search");
  search.value = adminQuery;
  search.addEventListener("input", () => {
    adminQuery = search.value.trim().toLowerCase();
    renderAdmin();
    const again = $("page-admin").querySelector("input.search");
    again?.focus();
    again?.setSelectionRange(again.value.length, again.value.length);
  });
  const counts = { all: all.length, online: all.filter((p) => p.online).length, flagged: all.filter(flagged).length };
  const filterBar = tabs(
    ["all", "online", "flagged"].map((k) => [k, t("web.admin.filter." + k, counts[k])]),
    adminFilter,
    (k) => {
      adminFilter = k;
      renderAdmin();
    }
  );
  const players = el(
    "ul",
    "members player-list",
    ...list.map((p) =>
      el(
        "li",
        "",
        el("span", "who", avatar(p.name, 30), el("i", "dot" + (p.online ? " on" : "")), el("b", "", plain(p.name)), ...statusTags(p), p.online ? "" : el("small", "muted", p.seen ? t("web.players.seen", ago(Date.now() - p.seen)) : "")),
        el(
          "span",
          "actions",
          button(t("web.admin.warn"), () => adminReason("admin.warn", p, t("web.admin.warn")), "ghost small"),
          p.ban ? button(t("web.admin.unban"), () => act("admin.unban", who(p), { after: refresh }), "ghost small") : button(t("web.admin.ban"), () => banDialog(p.name, p.id), "danger small"),
          button(t("web.admin.more"), () => adminMenu(p), "ghost small", "settings")
        )
      )
    )
  );
  const bans = a.bans.length
    ? el("ul", "members", ...a.bans.map((b) => el("li", "", el("span", "", plain(b.name), el("small", "muted", " " + (b.left < 0 ? "∞" : ago(b.left * 60000)) + " · " + plain(b.reason || "-"))), button(t("web.admin.unban"), () => act("admin.unban", { name: b.name, id: b.id }, { after: refresh }), "ghost small"))))
    : empty("web.admin.bans.none");
  const pending = (a.pending ?? []).length
    ? el(
        "ul",
        "members",
        ...a.pending.map((c) =>
          el(
            "li",
            "",
            el("span", "", el("b", "", pendingLabel(c)), el("small", "muted", " · " + plain(c.target) + " · " + t("web.admin.pending.by", plain(c.by), ago(Date.now() - c.at)))),
            button(t("web.admin.pending.cancel"), () => act("admin.pending.cancel", { id: c.id }, { after: refresh }), "ghost small")
          )
        )
      )
    : empty("web.admin.pending.none");
  return [
    el("section", "card wide", head(t("web.admin.players"), "players"), el("div", "toolbar", search, filterBar), el("p", "muted small", t("web.admin.players.text")), list.length ? players : empty("web.nobody")),
    card(t("web.admin.bans"), "admin", bans, el("div", "actions", button(t("web.admin.ban.name"), () => banDialog(""), "ghost small"), button(t("web.admin.unban.name"), () => nameDialog("admin.unban", t("web.admin.unban")), "ghost small"))),
    card(t("web.admin.pending"), "bell", el("p", "muted small", t("web.admin.pending.text")), pending),
  ];
}

function worldTab(a) {
  const gates = el(
    "div",
    "",
    ...a.gates.map((g) =>
      el(
        "div",
        "row",
        el("span", "", plain(t(g.key === "nether" ? "legacy.gate.nether" : "legacy.gate.end"))),
        tabs(["auto", "open", "closed"].map((m) => [m, t("web.admin.gate." + m)]), g.mode, (m) => act("admin.gate", { dim: g.key, mode: m }, { after: refresh }))
      )
    )
  );
  return [
    card(
      t("web.admin.world"),
      "globe",
      el(
        "div",
        "actions wrap",
        button(t("web.admin.broadcast"), broadcastDialog, "primary", "send"),
        button(a.maintenance ? t("web.admin.maintenance.off") : t("web.admin.maintenance.on"), async () => {
          if (!a.maintenance && !(await confirmDialog(t("web.admin.maintenance.on"), t("web.admin.maintenance.confirm"), t("web.admin.maintenance.on"), true))) return;
          await act("admin.maintenance", { on: !a.maintenance }, { after: refresh });
        }, a.maintenance ? "danger" : "ghost"),
        button(t("web.admin.clearlag"), async () => (await confirmDialog(t("web.admin.clearlag"), t("web.admin.clearlag.confirm"), t("web.admin.clearlag"))) && act("admin.clearlag", {}, { after: refresh }), "ghost")
      )
    ),
    card(t("web.gates"), "map", gates),
    card(
      t("web.admin.legacy"),
      "legacy",
      votePlanLine(),
      el(
        "div",
        "actions wrap",
        button(t("web.admin.vote.plan"), () => votePlanDialog(), "ghost"),
        nextVote() ? button(t("web.admin.vote.unplan"), () => act("admin.vote.unplan", {}, { after: refresh }), "ghost") : "",
        button(t("web.admin.ltimeout"), () => ltimeoutDialog(""), "ghost"),
        button(t("web.admin.lpardon"), () => nameDialog("admin.lpardon", t("web.admin.lpardon")), "ghost")
      )
    ),
  ];
}

/** Ein Schalter, der sofort einen Befehl schickt. */
function switchRow(label, hint, on, disabled, onChange) {
  const box = el("input");
  box.type = "checkbox";
  box.checked = !!on;
  box.disabled = !!disabled;
  box.addEventListener("change", () => onChange(box.checked));
  return el("label", "switch-row" + (disabled ? " disabled" : ""), el("span", "", el("b", "", label), hint ? el("small", "muted", hint) : ""), el("span", "switch", box, el("i")));
}

function settingsTab(a) {
  const modules = (a.modules ?? []).map((m) =>
    switchRow(plain(t(m.key)), m.locked ? t("web.admin.module.locked") : "", m.on, m.locked, (on) => act("admin.module", { id: m.id, on }, { after: refresh }))
  );
  const rules = (a.rules ?? []).map((r) => switchRow(t("web.admin.rule." + r.name), r.name, r.value, false, (value) => act("admin.gamerule", { name: r.name, value }, { after: refresh })));
  const radius = el("input");
  radius.type = "range";
  radius.min = 1;
  radius.max = 8;
  radius.value = a.web?.radius ?? 4;
  const radiusLabel = el("b", "", String(radius.value));
  radius.addEventListener("input", () => (radiusLabel.textContent = radius.value));
  radius.addEventListener("change", () => act("admin.webcfg", { radius: Number(radius.value) }, { after: refresh }));
  return [
    el("section", "card", head(t("web.admin.modules"), "settings"), el("p", "muted small", t("web.admin.modules.text")), el("div", "switches", ...modules)),
    el("section", "card", head(t("web.admin.rules"), "globe"), el("div", "switches", ...rules)),
    card(
      t("web.admin.mapcfg"),
      "map",
      switchRow(t("web.admin.mapcfg.on"), t("web.admin.mapcfg.hint"), a.web?.map, false, (on) => act("admin.webcfg", { map: on }, { after: refresh })),
      el("label", "field", el("span", "", t("web.admin.mapcfg.radius"), " ", radiusLabel), radius)
    ),
    card(t("web.info"), "info", el("p", "muted small", t("web.admin.info.text")), el("div", "actions", button(t("web.info.edit"), () => go("info"), "ghost small"))),
  ];
}

function webTab(a) {
  const access = new Map((state.me?.access ?? []).map((x) => [x.name, x]));
  const rows = (a.linked ?? []).map((l) => {
    const x = access.get(l.name);
    return el(
      "li",
      "",
      el(
        "span",
        "who",
        avatar(l.name, 28),
        el("b", "", plain(l.name)),
        l.op ? el("span", "tag", "OP") : "",
        x?.password ? el("span", "tag good", t("web.admin.web.password")) : el("span", "tag", t("web.admin.web.code_only")),
        el("small", "muted", x ? t("web.admin.web.sessions", x.sessions) + " · " + t("web.account.device.used", ago(Date.now() - x.used)) : t("web.admin.web.no_session"))
      ),
      l.name === state.me?.name
        ? ""
        : button(t("web.admin.web.revoke"), async () => (await confirmDialog(t("web.admin.web.revoke"), t("web.admin.web.revoke.confirm", plain(l.name)), t("web.admin.web.revoke"), true)) && act("admin.unlink", { name: l.name }, { after: refresh }), "danger small")
    );
  });
  return [el("section", "card wide", head(t("web.admin.web"), "key"), el("p", "muted small", t("web.admin.web.text")), rows.length ? el("ul", "members", ...rows) : empty("web.admin.web.none")), resetCard()];
}

// ---------------------------------------------------------------- Webseite zuruecksetzen
/** Zur Sicherheit muss man dieses Wort eintippen. */
export const RESET_WORD = "RESET";

function resetCard() {
  return el("section", "card wide danger-zone", head(t("web.admin.reset"), "close"), el("p", "muted small", t("web.admin.reset.text")), el("div", "actions", button(t("web.admin.reset.go"), resetDialog, "danger small")));
}

async function resetDialog() {
  const v = await dialog({
    title: t("web.admin.reset"),
    text: t("web.admin.reset.confirm"),
    danger: true,
    ok: t("web.admin.reset.go"),
    fields: [
      { name: "map", type: "checkbox", label: t("web.admin.reset.map"), value: true },
      { name: "accounts", type: "checkbox", label: t("web.admin.reset.accounts"), value: true },
      { name: "word", label: t("web.admin.reset.word", RESET_WORD), maxlength: 20 },
    ],
  });
  if (!v) return;
  if (String(v.word).trim().toUpperCase() !== RESET_WORD) return toast(t("web.admin.reset.wrong", RESET_WORD), "bad");
  try {
    await resetWebsite({ map: v.map, accounts: v.accounts });
    if (v.map) clearMapView();
    toast(t("web.admin.reset.done"), "good");
  } catch (err) {
    toast(reasonText("admin.reset", err.body?.reason), "bad");
  }
  await refresh(true);
}

function logTab(a) {
  const log = a.log.length ? el("ul", "news", ...a.log.map((l) => el("li", "", el("time", "", ago(Date.now() - l.at)), el("span", "", plain(l.by) + ": " + say(l.key, l.args))))) : empty("web.admin.log.none");
  return [el("section", "card wide", head(t("web.admin.log"), "admin"), log)];
}

const PENDING_KEY = { "admin.clearinv": "web.admin.clearinv", "admin.heal": "web.admin.heal", "admin.mode": "web.admin.mode" };
const pendingLabel = (c) => t(PENDING_KEY[c.type] ?? "web.admin.more") + (c.mode ? " → " + t("web.admin.mode." + c.mode) : "");

/** Was mit einem Betroffenen passieren soll, der offline ist: gemerkt bis zum Betreten. */
const later = (p) => ({ after: refresh, queuedText: t("web.admin.later", p.name) });

/** Alles, was ein Operator mit einem Spieler machen kann - online wie offline. */
export async function adminMenu(p) {
  const run = (fn) => () => {
    box.closest("dialog")?.close("");
    fn();
  };
  const item = (label, fn, cls = "ghost", hint = "") => [button(label, run(fn), cls), hint ? el("small", "muted", hint) : ""];
  const offlineHint = p.online ? "" : t("web.admin.later.hint");
  const box = el(
    "div",
    "menu-list",
    ...item("✉ " + t("web.players.note"), () => go("messages", p.name)),
    ...item("⚠ " + t("web.admin.warn"), () => adminReason("admin.warn", p, t("web.admin.warn"))),
    ...(p.warns ? item("⚠ " + t("web.admin.unwarn", p.warns), () => act("admin.unwarn", who(p), { after: refresh })) : []),
    ...item("❄ " + t(p.frozen ? "web.admin.unfreeze" : "web.admin.freeze"), () => act("admin.freeze", { ...who(p), on: !p.frozen }, { after: refresh }), "ghost", p.online || p.frozen ? "" : t("web.admin.freeze.hint")),
    ...(p.online ? item("⏏ " + t("web.admin.kick"), () => adminReason("admin.kick", p, t("web.admin.kick")), "danger") : []),
    ...(p.ban ? item("✓ " + t("web.admin.unban"), () => act("admin.unban", who(p), { after: refresh })) : item("⛔ " + t("web.admin.ban"), () => banDialog(p.name, p.id), "danger")),
    ...item("❤ " + t("web.admin.heal"), () => act("admin.heal", who(p), later(p)), "ghost", offlineHint),
    ...item("◐ " + t("web.admin.mode"), () => modeDialog(p), "ghost", offlineHint),
    ...item("🗑 " + t("web.admin.clearinv"), async () => (await confirmDialog(t("web.admin.clearinv"), t("web.admin.clearinv.confirm", plain(p.name)), t("web.admin.clearinv"), true)) && act("admin.clearinv", who(p), later(p)), "danger", offlineHint),
    ...(p.legacy ? item("⌛ " + t("web.admin.ltimeout"), () => ltimeoutDialog(p.name, p.id)) : []),
    ...(p.legacy && p.legacy !== "alive" ? item("☀ " + t("web.admin.lpardon"), () => act("admin.lpardon", who(p), { after: refresh })) : [])
  );
  await dialog({ title: plain(p.name), text: p.online ? t("web.players.online") : p.seen ? t("web.players.seen", ago(Date.now() - p.seen)) : "", body: box, ok: t("web.ok"), cancel: false });
}

async function modeDialog(p) {
  const v = await dialog({
    title: t("web.admin.mode") + " · " + plain(p.name),
    text: p.online ? "" : t("web.admin.later.hint"),
    fields: [{ name: "mode", label: t("web.admin.mode"), type: "select", options: ["survival", "creative", "adventure", "spectator"].map((m) => [m, t("web.admin.mode." + m)]), value: "survival" }],
    ok: t("web.admin.mode.set"),
  });
  if (v) await act("admin.mode", { ...who(p), mode: v.mode }, later(p));
}

const knownNames = () => [...new Set([...(B()?.admin?.players ?? []).map((p) => p.name), ...playerNames()])];

/**
 * Wen eine Aktion trifft: Name und ID. Derselbe Name kann unter mehreren IDs stehen (Welt neu
 * hochgeladen) - mit der ID trifft es genau den Eintrag, auf den man geklickt hat.
 */
const who = (p) => ({ name: p.name, id: p.id });

/** Die ID gilt nur, solange der Name im Feld nicht geaendert wurde. */
const typed = (value, name, id) => (value === name && id ? { name: value, id } : { name: value });

async function adminReason(type, p, title) {
  const v = await dialog({ title: title + " · " + p.name, fields: [{ name: "reason", label: t("web.admin.reason"), maxlength: 120 }], ok: title, danger: type !== "admin.warn" });
  if (v) await act(type, { ...who(p), reason: v.reason }, { after: refresh });
}

async function banDialog(name, id) {
  const v = await dialog({
    title: t("web.admin.ban"),
    fields: [
      { name: "name", label: t("web.player"), value: name, list: knownNames() },
      { name: "minutes", label: t("web.admin.duration"), type: "select", options: [10, 30, 60, 180, 360, 720, 1440, 4320, 10080, 0].map((m) => [String(m), m ? ago(m * 60000) : t("web.admin.forever")]), value: "60" },
      { name: "reason", label: t("web.admin.reason"), maxlength: 120 },
    ],
    ok: t("web.admin.ban"),
    danger: true,
  });
  if (v?.name?.trim()) await act("admin.ban", { ...typed(v.name.trim(), name, id), minutes: Number(v.minutes), reason: v.reason }, { after: refresh });
}

async function nameDialog(type, title) {
  const v = await dialog({ title, fields: [{ name: "name", label: t("web.player"), list: knownNames() }], ok: title });
  if (v?.name?.trim()) await act(type, { name: v.name.trim() }, { after: refresh });
}

// ---------------------------------------------------------------- Geplante Abstimmung
/** Wiederholung wie im Spiel (VOTE_REPEATS in legacy/core/schedule.js): 0 = einmalig, in Tagen. */
const REPEATS = [0, 1, 2, 3, 4, 5, 6, 7, 14];
const repeatLabel = (n) => (!n ? t("web.admin.vote.once") : n === 1 ? t("web.admin.vote.daily") : n % 7 === 0 ? t("web.admin.vote.weeks", n / 7) : t("web.admin.vote.days", n));
const nextVote = () => {
  const p = state.snap?.data?.legacy?.nextVote;
  return p?.at > Date.now() ? p : null;
};

function votePlanLine() {
  const p = nextVote();
  return el("p", "muted small", p ? "⌚ " + t("web.admin.vote.planned", dateTime(p.at), repeatLabel(p.every)) : t("web.admin.vote.none"));
}

/** Zwei Ziffern - fuer das Feld "Datum und Uhrzeit", das Ortszeit ohne Zone erwartet. */
const two = (n) => String(n).padStart(2, "0");
const localInput = (ms) => {
  const d = new Date(ms);
  return d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()) + "T" + two(d.getHours()) + ":" + two(d.getMinutes());
};

async function votePlanDialog() {
  const p = nextVote();
  // Vorschlag: der bestehende Termin, sonst morgen 20 Uhr
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(20, 0, 0, 0);
  const v = await dialog({
    title: t("web.admin.vote.plan"),
    text: t("web.admin.vote.plan.text"),
    fields: [
      { name: "at", label: t("web.admin.vote.when"), type: "datetime-local", value: localInput(p?.at ?? tomorrow.getTime()) },
      { name: "every", label: t("web.admin.vote.repeat"), type: "select", options: REPEATS.map((n) => [String(n), repeatLabel(n)]), value: String(p?.every ?? 0) },
    ],
    ok: t("web.admin.vote.save"),
  });
  if (!v?.at) return;
  const at = new Date(v.at).getTime();
  if (!(at > Date.now())) return toast(t("web.admin.vote.past"), "bad");
  await act("admin.vote.plan", { at, every: Number(v.every) || 0 }, { okText: t("web.admin.vote.planned", dateTime(at), repeatLabel(Number(v.every) || 0)), after: refresh });
}

async function ltimeoutDialog(name = "", id) {
  const v = await dialog({
    title: t("web.admin.ltimeout"),
    fields: [
      { name: "name", label: t("web.player"), value: name, list: knownNames() },
      { name: "hours", label: t("web.admin.hours"), type: "number", value: 4, min: 1, max: 72 },
    ],
    ok: t("web.admin.ltimeout"),
    danger: true,
  });
  if (v?.name?.trim()) await act("admin.ltimeout", { ...typed(v.name.trim(), name, id), hours: Math.max(1, Math.min(72, Math.floor(v.hours) || 4)) }, { after: refresh });
}

async function broadcastDialog() {
  const v = await dialog({
    title: t("web.admin.broadcast"),
    fields: [
      { name: "text", label: t("web.admin.message"), type: "textarea", maxlength: 300 },
      { name: "title", label: t("web.admin.big"), type: "checkbox" },
    ],
    ok: t("web.send"),
  });
  if (v?.text?.trim()) await act("admin.broadcast", { text: v.text.trim(), title: v.title }, { after: refresh });
}

