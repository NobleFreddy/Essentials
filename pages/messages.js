/**
 * Nachrichten: links die Unterhaltungen (ungelesene hervorgehoben), rechts der Verlauf mit
 * Eingabe. Schreiben geht an jeden Spieler, auch offline - er liest es auf der Webseite oder
 * im Spiel mit /post. Am Handy steht immer nur eine der beiden Seiten da.
 */
import { state, t, loggedIn, command } from "../core.js";
import { el, $, ago, empty, button, act, dialog, avatar, head } from "../ui.js";
import { icon } from "../icons.js";
import { plain } from "../rawtext.js";
import { refresh, go, subRoute } from "../app.js";
import { playerNames } from "./public.js";

const S = () => state.snap?.data ?? {};
const B = () => state.me?.bundle ?? null;
const readAsked = new Set(); // Unterhaltungen, fuer die "gelesen" schon unterwegs ist
let draft = {};

/** Nachrichten nach Gegenueber, neueste Unterhaltung zuerst. */
export function threads(messages) {
  const by = new Map();
  for (const m of messages ?? []) {
    const th = by.get(m.w) ?? { name: m.w, list: [], unread: 0 };
    th.list.push(m);
    if (!m.o && !m.r) th.unread++;
    by.set(m.w, th);
  }
  return [...by.values()].sort((a, b) => b.list.at(-1).at - a.list.at(-1).at);
}

export function renderMessages() {
  const page = $("page-messages");
  if (state.mode !== "local") return page.replaceChildren(el("section", "card", head(t("web.nav.messages"), "messages"), empty("web.login.local_only")));
  if (!loggedIn()) return page.replaceChildren(el("section", "card narrow cta", el("p", "", t("web.msg.login")), button(t("web.nav.login"), () => go("profile"), "primary", "key")));
  const b = B();
  if (!b) return page.replaceChildren(el("section", "card", el("p", "muted", t("web.profile.waiting"))));
  const list = threads(b.messages);
  const current = subRoute();
  const selected = current ? (list.find((th) => th.name.toLowerCase() === current.toLowerCase()) ?? { name: current, list: [], unread: 0 }) : undefined;

  const side = el(
    "section",
    "card inbox-list",
    head(t("web.nav.messages"), "", button(t("web.msg.new"), newMessage, "primary small", "plus")),
    list.length
      ? el(
          "ul",
          "threads",
          ...list.map((th) => {
            const last = th.list.at(-1);
            const a = el("a", "thread" + (th.unread ? " unread" : "") + (selected?.name === th.name ? " active" : ""), avatar(th.name, 36), el("span", "thread-text", el("span", "thread-top", el("b", "", plain(th.name)), el("time", "", ago(Date.now() - last.at))), el("span", "preview", (last.o ? "» " : "") + plain(last.t))), th.unread ? el("span", "badge", String(th.unread)) : "");
            a.href = "#/messages/" + encodeURIComponent(th.name);
            return el("li", "", a);
          })
        )
      : empty("web.msg.none")
  );

  const main = selected ? conversation(selected) : el("section", "card inbox-main empty-state", icon("messages", "big"), el("p", "muted", t("web.msg.pick")));
  page.replaceChildren(el("div", "inbox" + (selected ? " has-thread" : ""), side, main));
  const log = page.querySelector(".bubbles");
  if (log) log.scrollTop = log.scrollHeight;

  // Geoeffnet = gelesen (still, ohne Hinweis)
  if (selected?.unread && !readAsked.has(selected.name)) {
    readAsked.add(selected.name);
    command("msg.read", { with: selected.name })
      .then(() => refresh(true))
      .finally(() => setTimeout(() => readAsked.delete(selected.name), 5000));
  }
}

function conversation(th) {
  const people = S().players ?? [];
  const who = people.find((p) => p.name.toLowerCase() === th.name.toLowerCase());
  const status = who ? (who.online ? t("web.players.online") : who.seen ? t("web.players.seen", ago(Date.now() - who.seen)) : t("web.offline.player")) : "";
  const back = el("a", "icon-btn only-mobile", icon("back"));
  back.href = "#/messages";
  const top = el("div", "conv-head", back, avatar(th.name, 36), el("div", "", el("b", "", plain(th.name)), el("small", "muted", status)));
  let lastDay = "";
  const bubbles = el("div", "bubbles");
  for (const m of th.list) {
    const day = new Date(m.at).toLocaleDateString(state.lang);
    if (day !== lastDay) {
      bubbles.append(el("div", "day", day));
      lastDay = day;
    }
    const time = el("time", "", new Date(m.at).toLocaleTimeString(state.lang, { hour: "2-digit", minute: "2-digit" }));
    bubbles.append(el("div", "bubble " + (m.o ? "out" : "in"), el("span", "", plain(m.t)), time));
  }
  if (!th.list.length) bubbles.append(el("p", "muted center", t("web.msg.start", plain(th.name))));

  const input = el("textarea");
  input.rows = 1;
  input.maxLength = 300;
  input.placeholder = t("web.msg.placeholder", plain(th.name));
  input.value = draft[th.name] ?? "";
  input.addEventListener("input", () => (draft[th.name] = input.value));
  const send = async () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    draft[th.name] = "";
    bubbles.append(el("div", "bubble out pending", el("span", "", text), el("time", "", "…")));
    bubbles.scrollTop = bubbles.scrollHeight;
    await act("msg.send", { to: th.name, text }, { quiet: true, after: () => refresh(true) });
    $("page-messages").querySelector(".composer textarea")?.focus();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  const composer = el("div", "composer", input, button("", send, "primary icon-only", "send"));
  return el("section", "card inbox-main", top, bubbles, composer);
}

async function newMessage() {
  const v = await dialog({
    title: t("web.msg.new"),
    text: t("web.msg.new.text"),
    fields: [
      { name: "to", label: t("web.player"), list: playerNames(B()?.name) },
      { name: "text", label: t("web.admin.message"), type: "textarea", maxlength: 300 },
    ],
    ok: t("web.send"),
  });
  if (!v?.to?.trim()) return;
  const to = v.to.trim();
  if (v.text?.trim()) {
    const res = await act("msg.send", { to, text: v.text.trim() }, { okText: t("web.players.note.sent", to), after: () => refresh(true) });
    if (res.state !== "done" && res.state !== "queued") return;
  }
  go("messages", to);
}

