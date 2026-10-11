/**
 * Clans: Einladungen, der eigene Clan (Chat, Mitglieder, Bank, Anfragen, Protokoll,
 * Einstellungen - je nach Rang) und alle Clans des Servers.
 */
import { state, t, loggedIn, itemName } from "../core.js";
import { el, $, ago, empty, itemChip, button, act, dialog, confirmDialog, toast, tabs, head, avatar } from "../ui.js";
import { plain, fill } from "../rawtext.js";
import { refresh, chatSeen, unread } from "../app.js";
import { clanTag, playerNames } from "./public.js";

const S = () => state.snap?.data ?? {};
const B = () => state.me?.bundle ?? null;
const card = (title, iconName, ...body) => el("section", "card", head(title, iconName), ...body);
const say = (key, args) => fill(state.texts[key] ?? key, (args ?? []).map((a) => plain(String(a))));

// ---------------------------------------------------------------- Clans
let clanTab = "chat";
let openClan = "";

export function renderClans() {
  const me = B();
  const parts = [];
  if (me?.invites?.length) {
    parts.push(
      card(
        t("web.clans.invites"),
        "clans",
        ...me.invites.map((inv) =>
          el(
            "div",
            "row",
            el("span", "", clanTag(inv), " " + plain(inv.name) + " ", el("small", "muted", t("web.clans.invited_by", inv.by))),
            el("span", "actions", button(t("web.accept"), () => act("clan.invite.accept", { clanId: inv.clanId }, { after: refresh }), "primary"), button(t("web.decline"), () => act("clan.invite.decline", { clanId: inv.clanId }, { after: refresh }), "ghost"))
          )
        )
      )
    );
  }
  if (me?.clan) parts.push(myClan(me.clan, me));
  else if (loggedIn() && me) parts.push(el("section", "card wide cta", el("p", "", t("web.clans.none_mine")), button(t("web.clans.create"), () => createClan(me), "primary", "plus")));
  const list = S().clans ?? [];
  parts.push(el("h2", "section", t("web.clans.all")), list.length ? el("div", "cards", ...list.map((c) => clanCard(c, me))) : empty("web.clans.none"));
  $("page-clans").replaceChildren(...parts);
}
function clanCard(c, me) {
  const open = openClan === c.id;
  const head = el("div", "row", el("b", "", clanTag(c), " " + plain(c.name)), el("span", "muted", t("web.clans.level", c.level)));
  const box = el(
    "article",
    "card clan",
    head,
    el("div", "row muted", el("span", "", t("web.clans.members", c.members)), el("span", "", c.points + " " + t("web.clans.points"))),
    c.desc ? el("p", "note", plain(c.desc)) : "",
    el("div", "tags", c.open ? el("span", "tag good", t("web.clans.open")) : el("span", "tag", t("web.clans.closed")), c.leader ? el("span", "tag", "♛ " + plain(c.leader)) : "")
  );
  box.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    openClan = open ? "" : c.id;
    renderClans();
  });
  if (open) {
    box.classList.add("open");
    box.append(el("ul", "names", ...(c.list ?? []).map((m) => el("li", "", plain(m.name), el("small", "muted", " " + plain(t("clan.role." + m.role)))))));
  }
  if (loggedIn() && me && !me.clan && c.open) box.append(el("div", "actions", button(t("web.clans.request"), () => act("clan.request", { clanId: c.id }, { okText: t("web.clans.requested"), after: refresh }), "primary")));
  return box;
}

function myClan(c, me) {
  const list = [
    ["chat", t("web.clans.chat"), clanTab === "chat" ? 0 : unread().chat],
    ["members", t("web.clans.memberlist") + " (" + c.members.length + ")"],
    ["bank", t("web.clans.bank")],
    ...(c.perms.requests ? [["requests", t("web.clans.requests"), c.requests.length]] : []),
    ["log", t("web.clans.log")],
    ...(c.perms.settings || c.perms.motd ? [["settings", t("web.clans.settings")]] : []),
  ];
  if (!list.some(([k]) => k === clanTab)) clanTab = "chat";
  // Wer den Chat sieht, hat ihn gelesen
  if (clanTab === "chat") chatSeen();
  const bar = tabs(list, clanTab, (k) => {
    clanTab = k;
    renderClans();
  });
  const body = { chat: clanChat, members: clanMembers, bank: clanBank, requests: clanRequests, log: clanLog, settings: clanSettings }[clanTab](c, me);
  return el(
    "section",
    "card wide myclan",
    el("div", "card-head", el("h2", "", clanTag(c), " " + plain(c.name)), el("span", "tag", plain(t("clan.role." + c.role)) + " · " + t("web.clans.level", c.level))),
    c.motd ? el("p", "note", "📌 " + plain(c.motd)) : "",
    bar,
    body,
    el(
      "div",
      "actions",
      c.perms.invite ? button(t("web.clans.invite"), () => inviteToClan(), "ghost") : "",
      button(t("web.clans.leave"), async () => (await confirmDialog(t("web.clans.leave"), t("web.clans.leave.confirm", c.name), t("web.clans.leave"), true)) && act("clan.leave", {}, { after: refresh }), "danger")
    )
  );
}

function clanChat(c) {
  const log = el(
    "ul",
    "chat",
    ...(c.chat ?? []).map((m) => el("li", (m.via === "web" ? "web " : "") + (m.name === B()?.name ? "own" : ""), avatar(m.name, 26), el("div", "msg", el("div", "msg-head", el("b", "", plain(m.name)), el("time", "", ago(Date.now() - m.at))), el("span", "", plain(m.text)))))
  );
  const input = el("input");
  input.maxLength = 256;
  input.placeholder = t("web.clans.chat.placeholder");
  const send = async () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    await act("clan.chat", { text }, { okText: t("web.clans.chat.sent"), after: refresh });
    document.querySelector(".chat-input input")?.focus();
  };
  input.addEventListener("keydown", (e) => e.key === "Enter" && send());
  setTimeout(() => (log.scrollTop = log.scrollHeight));
  return el("div", "", (c.chat ?? []).length ? log : empty("web.clans.chat.empty"), el("div", "chat-input", input, button(t("web.send"), send, "primary")));
}

function clanMembers(c, me) {
  return el(
    "ul",
    "members",
    ...c.members.map((m) => {
      const actions = el("span", "actions");
      if (m.id !== me.id) {
        if (c.perms.promote && m.role === "member") actions.append(button(t("web.clans.promote"), () => act("clan.promote", { playerId: m.id }, { after: refresh }), "ghost small"));
        if (c.perms.promote && m.role === "officer") actions.append(button(t("web.clans.demote"), () => act("clan.demote", { playerId: m.id }, { after: refresh }), "ghost small"));
        if (c.perms.kick && m.role !== "leader")
          actions.append(button(t("web.clans.kick"), async () => (await confirmDialog(t("web.clans.kick"), t("web.clans.kick.confirm", m.name), t("web.clans.kick"), true)) && act("clan.kick", { playerId: m.id }, { after: refresh }), "danger small"));
      }
      return el("li", "", el("span", "who", avatar(m.name, 28), el("i", m.online ? "dot on" : "dot"), el("b", "", plain(m.name)), el("small", "muted", plain(t("clan.role." + m.role)))), actions);
    })
  );
}

function clanBank(c) {
  if (!c.bank.length) return empty("web.clans.bank.empty");
  return el(
    "ul",
    "members",
    ...c.bank.map((it) =>
      el(
        "li",
        "",
        itemChip(it),
        c.perms.withdraw
          ? button(
              t("web.clans.bank.take"),
              async () => {
                if (!B()?.online) return toast(t("web.need.online.queue"), "warn");
                const v = await dialog({ title: t("web.clans.bank.take"), text: itemName(it), fields: [{ name: "amount", label: t("web.market.amount"), type: "number", value: it.n, min: 1, max: it.n }], ok: t("web.clans.bank.take") });
                if (v) await act("clan.bank.take", { index: it.i, t: it.t, amount: Math.max(1, Math.min(it.n, v.amount || 1)) }, { after: refresh });
              },
              "ghost small"
            )
          : ""
      )
    )
  );
}

function clanRequests(c) {
  if (!c.requests.length) return empty("web.clans.requests.none");
  return el(
    "ul",
    "members",
    ...c.requests.map((r) =>
      el("li", "", el("span", "", plain(r.name), el("small", "muted", " " + ago(Date.now() - r.at))), el("span", "actions", button(t("web.accept"), () => act("clan.request.accept", { playerId: r.id }, { after: refresh }), "primary small"), button(t("web.decline"), () => act("clan.request.decline", { playerId: r.id }, { after: refresh }), "ghost small")))
    )
  );
}

function clanLog(c) {
  if (!c.log.length) return empty("web.clans.log.none");
  return el("ul", "news", ...[...c.log].reverse().map((l) => el("li", "", el("time", "", ago(Date.now() - l.at)), el("span", "", say(l.key, l.args)))));
}

function clanSettings(c) {
  const desc = el("textarea");
  desc.maxLength = 120;
  desc.value = c.desc ?? "";
  const motd = el("input");
  motd.maxLength = 120;
  motd.value = c.motd ?? "";
  const open = el("input");
  open.type = "checkbox";
  open.checked = !!c.open;
  const args = () => ({ ...(c.perms.settings ? { desc: desc.value, open: open.checked } : {}), motd: motd.value });
  return el(
    "div",
    "form",
    c.perms.settings ? el("label", "field", t("web.clans.desc"), desc) : "",
    el("label", "field", t("web.clans.motd"), motd),
    c.perms.settings ? el("label", "check", open, t("web.clans.open.toggle")) : "",
    el("div", "actions", button(t("web.save"), () => act("clan.settings", args(), { after: refresh }), "primary"))
  );
}

async function inviteToClan() {
  const v = await dialog({ title: t("web.clans.invite"), fields: [{ name: "name", label: t("web.player"), list: playerNames(B()?.name) }], ok: t("web.clans.invite") });
  if (v?.name?.trim()) await act("clan.invite", { name: v.name.trim() }, { okText: t("web.clans.invited", v.name.trim()), after: refresh });
}

async function createClan(me) {
  if (!me.online) return toast(t("web.need.online.queue"), "warn");
  const v = await dialog({
    title: t("web.clans.create"),
    text: t("web.clans.create.text"),
    fields: [
      { name: "name", label: t("web.clans.name"), maxlength: 24 },
      { name: "tag", label: t("web.clans.tag"), maxlength: 6 },
    ],
    ok: t("web.clans.create"),
  });
  if (v) await act("clan.create", { name: v.name.trim(), tag: v.tag.trim() }, { after: refresh });
}

