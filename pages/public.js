/**
 * Seiten fuer alle: Uebersicht, Vermaechtnis, Handel, Kopfgeld, Ranglisten.
 * Wer angemeldet ist, bekommt dort zusaetzlich seine Knoepfe (annehmen, abstimmen ...).
 */
import { state, t, has, loggedIn, itemName } from "../core.js";
import { el, $, meter, ago, until, dateTime, empty, itemList, button, act, dialog, confirmDialog, toast, head, avatar, itemIcon } from "../ui.js";
import { icon } from "../icons.js";
import { pixelText } from "../pixel.js";
import { flatten, colorize, plain, fill } from "../rawtext.js";
import { refresh, ITEM_IDS, unread } from "../app.js";

const S = () => state.snap?.data ?? {};
const B = () => state.me?.bundle ?? null;
const card = (title, ...body) => el("section", "card", el("h2", "", title), ...body);
const cardI = (title, iconName, ...body) => el("section", "card", head(title, iconName), ...body);

/** Alle Spieler, die der Server kennt - auch offline -, fuer Namensfelder. */
export function playerNames(except) {
  const list = S().players?.length ? S().players : (S().online ?? []);
  return [...new Set(list.map((p) => p.name))].filter((n) => n && n !== except);
}

// ---------------------------------------------------------------- Bausteine
export function legacySummary(L) {
  if (!L?.enabled) return [empty("web.legacy.off")];
  if (!L.running && L.phase !== "storm") return [empty("web.legacy.idle"), L.cycle ? el("p", "muted", t("web.legacy.cycle", L.cycle, L.day)) : ""];
  const tags = el("div", "tags", L.phase === "storm" ? el("span", "tag bad", t("web.legacy.phase.storm", L.stormLeft)) : el("span", "tag good", t("web.legacy.phase.running")));
  if (L.vote?.open) tags.append(el("span", "tag warn", t(L.vote.kind === "emergency" ? "web.legacy.vote.emergency" : "web.legacy.vote", until(L.vote.endsAt))));
  else if (L.nextVote?.at > Date.now()) tags.append(el("span", "tag", "⌚ " + t("web.legacy.nextvote", dateTime(L.nextVote.at))));
  if (L.revealed?.name) tags.append(el("span", "tag bad", "⚠ " + t("web.legacy.revealed", plain(L.revealed.name))));
  return [
    el("div", "big", t("web.legacy.cycle", L.cycle, L.day)),
    tags,
    el("div", "row", el("span", "", t("web.legacy.progress")), el("span", "muted", (L.progress ?? 0) + " %")),
    meter((L.progress ?? 0) / 100),
    el("div", "row", el("span", "muted", t("web.legacy.done", L.done ?? 0)), el("span", "muted", t("web.legacy.alive", L.players ?? 0))),
  ];
}

function gatesBlock(g) {
  if (!g?.on) return [empty("web.gates.allopen")];
  const out = [el("p", "muted", t("web.gates.hours", g.hours))];
  for (const [k, nameKey, kind] of [
    ["nether", "legacy.gate.nether", "red"],
    ["end", "legacy.gate.end", "gold"],
  ]) {
    const d = g[k];
    if (!d) continue;
    const tag = d.open ? el("span", "tag good", t("web.gates.open")) : d.mode === "closed" ? el("span", "tag bad", t("web.gates.closed")) : el("span", "tag warn", t("web.gates.left", d.left));
    out.push(el("div", "row", el("span", "", plain(t(nameKey))), tag), meter(d.open ? 1 : d.need ? g.hours / d.need : 0, kind));
  }
  return out;
}

export function newsList(list, max = 25) {
  const rows = [...(list ?? [])].reverse().slice(0, max);
  if (!rows.length) return empty("web.news.none");
  return el(
    "ul",
    "news",
    ...rows.map((n) => {
      const time = el("time", "", ago(Date.now() - n.at));
      time.dateTime = new Date(n.at).toISOString();
      return el("li", "", time, el("span", "", colorize(flatten(n.msg, (k) => state.texts[k]))));
    })
  );
}

const taskRow = (task) =>
  el(
    "li",
    "",
    el("div", "label", el("span", "", el("span", "chain chain-" + task.chain), plain(t("legacy.task." + task.id))), el("span", "num", task.progress + " / " + task.target)),
    meter(task.target ? task.progress / task.target : 0, task.chain === 3 ? "gold" : "")
  );

// ---------------------------------------------------------------- Uebersicht
export function renderOverview() {
  const s = S();
  const online = s.online ?? [];
  const info = s.info ?? {};
  const me = B();
  const hero = el(
    "section",
    "hero",
    el(
      "div",
      "hero-text",
      pixelText(info.name || "Bedrock Essentials", "hero-pixel"),
      el("p", "lead", info.about ? plain(info.about) : t("web.hero.text")),
      el(
        "div",
        "actions",
        info.address ? link("#/info", t("web.hero.join"), "primary", "globe") : "",
        link("#/map", t("web.hero.map"), "ghost", "map"),
        me ? "" : link("#/profile", t("web.nav.login"), "ghost", "key")
      )
    ),
    el(
      "div",
      "hero-online",
      el("span", "big-num", String(online.length)),
      el("span", "muted", t("web.stat.online")),
      el("div", "avatars", ...online.slice(0, 12).map((p) => avatar(p.name, 30)))
    )
  );
  const counts = el(
    "div",
    "stats-row",
    stat(online.length, "web.stat.online", "#/players", "players"),
    stat((s.market ?? []).length, "web.stat.offers", "#/market", "market"),
    stat((s.clans ?? []).length, "web.stat.clans", "#/clans", "clans"),
    stat((s.bounties ?? []).length, "web.stat.bounties", "#/bounties", "bounties")
  );
  const parts = [];
  if (me) parts.push(forYou(me));
  parts.push(cardI(t("web.legacy"), "legacy", ...legacySummary(s.legacy)), cardI(t("web.gates"), "globe", ...gatesBlock(s.gates)), el("section", "card wide", head(t("web.news"), "bell"), newsList(s.news)));
  $("page-overview").replaceChildren(hero, counts, el("div", "grid", ...parts));
}

/** Was auf den Angemeldeten wartet - jeweils mit Sprung dorthin. */
function forYou(me) {
  const u = unread();
  const rows = [
    ["messages", "messages", u.msgs, "web.you.msgs"],
    ["market", "market", u.offers, "web.you.offers"],
    ["clans", "clans", u.invites, "web.you.invites"],
    ["clans", "clans", u.chat, "web.you.chat"],
    ["profile", "gift", u.mail, "web.you.mail"],
  ].filter(([, , n]) => n > 0);
  return cardI(
    t("web.you", plain(me.name)),
    "profile",
    rows.length ? el("div", "you-list", ...rows.map(([p, ic, n, key]) => link("#/" + p, t(key, n), "you", ic))) : el("p", "muted", t("web.you.none"))
  );
}

function link(href, label, cls, iconName) {
  const a = el("a", "btn " + cls, iconName ? icon(iconName) : "", label);
  a.href = href;
  return a;
}

function stat(n, key, href, iconName) {
  const a = el("a", "stat", el("span", "stat-icon", icon(iconName)), el("span", "", el("b", "", String(n)), el("span", "", t(key))));
  a.href = href;
  return a;
}

// ---------------------------------------------------------------- Vermaechtnis
export function renderLegacy() {
  const s = S();
  const L = s.legacy ?? {};
  const mine = B()?.legacy;
  const parts = [card(t("web.legacy"), ...legacySummary(L))];
  if (mine) parts.push(myLegacy(mine));
  const tasks = L.tasks ?? [];
  parts.push(card(t("web.tasks"), tasks.length ? el("ul", "bars", ...tasks.map(taskRow)) : empty("web.tasks.none")));
  parts.push(card(t("web.gates"), ...gatesBlock(s.gates)));
  const top = s.top ?? [];
  parts.push(card(t("web.top"), top.length ? el("ol", "top-list", ...top.map((p) => el("li", "", el("span", "", plain(p.name)), el("span", "muted", String(p.value))))) : empty("web.top.none")));
  $("page-legacy").replaceChildren(el("div", "grid", ...parts));
}

function myLegacy(m) {
  const box = card(t("web.legacy.mine"));
  box.append(
    el("div", "row", el("span", "", t("web.legacy.role")), el("b", "", plain(t("legacy.role." + m.role)))),
    el("div", "row", el("span", "", "CP"), el("b", "", String(m.cp))),
    el("div", "row", el("span", "", t("web.legacy.status")), el("span", m.status === "alive" ? "tag good" : "tag bad", t("legacy.status." + m.status) + (m.banMinutes > 0 ? " · " + ago(m.banMinutes * 60000) : ""))),
    el("div", "row", el("span", "", t("web.legacy.strikes")), el("span", "muted", m.strikes + "/3"))
  );
  // Nur der Verraeter sieht das - und nur, wenn es knapp wird
  if (m.revealIn) box.append(el("p", "callout bad", t("web.legacy.revealwarn", m.revealIn)));
  if (m.vote?.open) {
    box.append(el("h3", "", t(m.vote.kind === "emergency" ? "web.legacy.vote.emergency" : "web.legacy.vote", until(m.vote.endsAt))));
    if (!m.canVote) box.append(empty("web.legacy.novote"));
    else {
      const mineVote = m.vote.mine;
      const list = el("div", "vote-list");
      for (const c of m.vote.candidates) {
        list.append(button((mineVote === c.id ? "◆ " : "◇ ") + c.name + (c.timeout ? " (" + t("legacy.vote.in_timeout").replace(/[()]/g, "") + ")" : ""), () => vote(c.id, c.name), mineVote === c.id ? "primary" : ""));
      }
      list.append(button((mineVote === m.vote.skip ? "◆ " : "⏭ ") + plain(t("legacy.vote.skip")), () => vote(m.vote.skip, plain(t("legacy.vote.skip.name"))), mineVote === m.vote.skip ? "primary" : "ghost"));
      box.append(list);
    }
  }
  return box;
}

async function vote(target, name) {
  if (!(await confirmDialog(t("web.legacy.vote.title"), t("web.legacy.vote.confirm", name), t("web.legacy.vote.ok")))) return;
  await act("legacy.vote", { target }, { okText: t("web.legacy.vote.done", name), after: refresh });
}

// ---------------------------------------------------------------- Handel
let marketQuery = "";

export function renderMarket() {
  const s = S();
  const me = B();
  const offers = (s.market ?? []).filter((o) => !marketQuery || matches(o, marketQuery));
  const search = el("input", "search");
  search.type = "search";
  search.placeholder = t("web.market.search");
  search.value = marketQuery;
  search.addEventListener("input", () => {
    marketQuery = search.value.trim().toLowerCase();
    renderMarket();
    const again = $("page-market").querySelector("input.search");
    again?.focus();
    again?.setSelectionRange(again.value.length, again.value.length);
  });
  const tools = el("div", "toolbar", search, loggedIn() && me ? button("✚ " + t("web.market.new"), () => newOffer(me), "primary") : el("span", "muted", t("web.login.hint")));
  const parts = [tools];
  if (me?.offers?.forMe?.length) parts.push(el("h2", "section", t("web.market.forme")), el("div", "cards", ...me.offers.forMe.map((o) => offerCard(o, "forme"))));
  if (me?.offers?.mine?.length) parts.push(el("h2", "section", t("web.market.mine")), el("div", "cards", ...me.offers.mine.map((o) => offerCard(o, "mine"))));
  parts.push(el("h2", "section", t("web.market.public")), offers.length ? el("div", "cards", ...offers.map((o) => offerCard(o, o.seller === me?.name ? "mine" : "public"))) : empty("web.market.none"));
  $("page-market").replaceChildren(...parts);
}

function matches(o, q) {
  const text = [o.seller, o.note, ...o.give.map(itemName), ...o.give.map((i) => i.t), o.want ? itemName(o.want) : ""].join(" ").toLowerCase();
  return text.includes(q);
}

function offerCard(o, kind) {
  const c = el(
    "article",
    "card offer",
    el("div", "offer-top", o.give[0] ? itemIcon(o.give[0].t, 40) : "", el("div", "", el("b", "", plain(o.seller)), el("small", "muted", t("web.market.expires", until(o.expires))))),
    o.target ? el("p", "muted", t("web.market.to", o.target)) : "",
    el("div", "offer-line", el("span", "muted", t("web.market.gives")), itemList(o.give)),
    el("div", "offer-line", el("span", "muted", t("web.market.wants")), o.want ? itemList([o.want]) : el("span", "tag good", t("web.market.gift"))),
    o.note ? el("p", "note", "„" + plain(o.note) + "“") : ""
  );
  if (!loggedIn()) return c;
  const actions = el("div", "actions");
  if (kind === "mine") actions.append(button(t("web.market.cancel"), async () => (await confirmDialog(t("web.market.cancel"), t("web.market.cancel.confirm"), t("web.market.cancel"), true)) && act("trade.cancel", { offerId: o.id }, { after: refresh }), "ghost"));
  else {
    actions.append(button(t("web.market.accept"), async () => (await confirmDialog(t("web.market.accept"), o.want ? t("web.market.accept.confirm", o.want.n + "× " + itemName(o.want)) : t("web.market.accept.gift"), t("web.market.accept"))) && act("trade.accept", { offerId: o.id }, { after: refresh }), "primary"));
    if (kind === "forme") actions.append(button(t("web.market.decline"), () => act("trade.decline", { offerId: o.id }, { after: refresh }), "ghost"));
  }
  c.append(actions);
  return c;
}

/** Items aus dem eigenen Inventar waehlen - fuer Angebote und Kopfgelder. */
export function pickBody(inventory) {
  const box = el("div", "picks");
  const rows = [];
  for (const it of inventory) {
    const cb = el("input");
    cb.type = "checkbox";
    const n = el("input", "amount");
    n.type = "number";
    n.min = 1;
    n.max = it.n;
    n.value = it.n;
    rows.push({ it, cb, n });
    box.append(el("label", "pick", cb, itemIcon(it.t, 24), el("span", "", itemName(it) + (it.e?.length ? " ✦" : "")), n, el("span", "muted", "/ " + it.n)));
  }
  box.read = () => rows.filter((r) => r.cb.checked).map((r) => ({ slot: r.it.slot, t: r.it.t, amount: Math.max(1, Math.min(r.it.n, Number(r.n.value) || 1)) }));
  return box;
}

/** "Diamant" oder "minecraft:diamond" -> Typ-ID */
export function resolveItem(text) {
  const q = String(text ?? "").trim().toLowerCase();
  if (!q) return undefined;
  if (/^[a-z0-9_]+:[a-z0-9_./]+$/.test(q)) return q;
  const hit = ITEM_IDS.find(([id, key]) => id === q || id === "minecraft:" + q || (state.items[key] ?? "").toLowerCase() === q);
  return hit?.[0];
}

const itemSuggestions = () => ITEM_IDS.map(([id, key]) => state.items[key] ?? id.replace("minecraft:", ""));

export async function newOffer(me, target = "") {
  if (!me.online || !me.inventory) return toast(t("web.need.online"), "warn");
  if (!me.inventory.length) return toast(t("web.inv.empty"), "warn");
  const picks = pickBody(me.inventory);
  const v = await dialog({
    title: t("web.market.new"),
    text: t("web.market.new.text"),
    body: picks,
    fields: [
      { name: "want", label: t("web.market.want"), list: itemSuggestions(), hint: t("web.market.want.hint") },
      { name: "amount", label: t("web.market.amount"), type: "number", value: 1, min: 1, max: 2304 },
      { name: "target", label: t("web.market.target"), value: target, list: playerNames(me.name), hint: t("web.market.target.hint") },
      { name: "note", label: t("web.market.note"), maxlength: 60 },
      { name: "days", label: t("web.market.days"), type: "select", options: [1, 2, 3, 5, 7].map((d) => [String(d), t("web.market.days.n", d)]), value: "3" },
    ],
    ok: t("web.market.create"),
  });
  if (!v) return;
  const chosen = picks.read();
  if (!chosen.length) return toast(t("web.market.nothing"), "warn");
  let want = null;
  if (v.want.trim()) {
    const id = resolveItem(v.want);
    if (!id) return toast(t("web.market.unknown_item", v.want), "bad");
    want = { t: id, n: Math.max(1, Math.floor(v.amount) || 1) };
  }
  await act("trade.create", { picks: chosen, want, target: v.target.trim() || null, note: v.note, days: Number(v.days) }, { okText: t("web.market.created"), after: refresh });
}

// ---------------------------------------------------------------- Kopfgeld
export function renderBounties() {
  const list = S().bounties ?? [];
  const me = B();
  const tools = el("div", "toolbar", el("p", "muted", t("web.bounty.text")), loggedIn() && me ? button("✚ " + t("web.bounty.new"), () => newBounty(me), "primary") : "");
  $("page-bounties").replaceChildren(
    tools,
    list.length
      ? el("div", "cards", ...list.map((b) => el("article", "card", el("div", "row", el("b", "", "☠ " + plain(b.name)), el("span", "muted", t("web.bounty.by", b.by))), itemList(b.items))))
      : empty("web.bounty.none")
  );
}

export async function newBounty(me, target = "") {
  if (!me.online || !me.inventory) return toast(t("web.need.online"), "warn");
  const picks = pickBody(me.inventory);
  const v = await dialog({
    title: t("web.bounty.new"),
    body: picks,
    fields: [{ name: "target", label: t("web.bounty.target"), value: target, list: playerNames(me.name) }],
    ok: t("web.bounty.place"),
  });
  if (!v) return;
  const chosen = picks.read();
  if (!chosen.length || !v.target.trim()) return toast(t("web.market.nothing"), "warn");
  await act("bounty.place", { target: v.target.trim(), picks: chosen }, { after: refresh });
}

// ---------------------------------------------------------------- Ranglisten
let statKey = "playtimeMin";
const STAT_KEYS = ["playtimeMin", "blocksBroken", "blocksPlaced", "mobKills", "playerKills", "deaths", "distance", "trades", "bounties"];

export function formatStat(key, v) {
  if (key === "playtimeMin") return v >= 60 ? Math.floor(v / 60) + " h " + (v % 60) + " min" : v + " min";
  if (key === "distance") return v >= 1000 ? (v / 1000).toFixed(1) + " km" : v + " m";
  return String(v);
}

export function renderRanks() {
  const s = S();
  const tabs = el("div", "tabs", ...STAT_KEYS.map((k) => button(plain(t("stats.key." + k)), () => ((statKey = k), renderRanks()), k === statKey ? "primary" : "ghost")));
  const rows = s.stats?.[statKey] ?? [];
  const mine = B()?.stats?.[statKey];
  const table = rows.length
    ? el("ol", "top-list", ...rows.map((r) => el("li", r.name === B()?.name ? "me" : "", el("span", "", plain(r.name)), el("span", "muted", formatStat(statKey, r.value)))))
    : empty("web.ranks.none");
  const clans = (s.clans ?? []).slice(0, 10);
  $("page-ranks").replaceChildren(
    el(
      "div",
      "grid",
      el("section", "card wide", el("h2", "", t("web.ranks.players")), tabs, table, mine?.value ? el("p", "muted", t("web.ranks.mine", formatStat(statKey, mine.value), mine.rank ?? "–")) : ""),
      card(t("web.ranks.clans"), clans.length ? el("ol", "top-list", ...clans.map((c) => el("li", "", el("span", "", clanTag(c), " " + plain(c.name)), el("span", "muted", t("web.clans.level", c.level) + " · " + c.points)))) : empty("web.clans.none"))
    )
  );
}

const MC = { 0: "#9a9a9a", 1: "#6f7dff", 2: "#4fbf4f", 3: "#3fbfbf", 4: "#e05a4f", 5: "#c86fc8", 6: "#f0b232", 7: "#c4c4c4", 8: "#8a8a8a", 9: "#8f9bff", a: "#7ce06f", b: "#6fe8e8", c: "#ff7b6f", d: "#ff8fff", e: "#ffe76f", f: "#ffffff" };
export function clanTag(c) {
  const tag = el("span", "clan-tag", "[" + plain(c.tag) + "]");
  tag.style.color = MC[c.color] ?? MC[6];
  return tag;
}

export { fill, has };
