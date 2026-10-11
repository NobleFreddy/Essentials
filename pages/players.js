/**
 * Alle Spieler des Servers - online und offline. Angemeldet kann man jedem schreiben, etwas
 * schicken, ein Angebot machen, ein Kopfgeld aussetzen oder ihn in den Clan einladen - auch
 * wenn er gerade nicht spielt: Nachrichten und Geschenke warten dann auf ihn.
 */
import { state, t, loggedIn } from "../core.js";
import { el, $, ago, empty, button, act, dialog, toast, tabs, avatar } from "../ui.js";
import { plain } from "../rawtext.js";
import { refresh, go } from "../app.js";
import { pickBody, newOffer, newBounty } from "./public.js";
import { adminMenu } from "./admin.js";

const S = () => state.snap?.data ?? {};
const B = () => state.me?.bundle ?? null;

let query = "";
let filter = "all";

export function renderPlayers() {
  const me = B();
  const all = S().players?.length ? S().players : (S().online ?? []).map((p) => ({ ...p, online: true }));
  const list = all.filter((p) => (filter !== "online" || p.online) && (!query || p.name.toLowerCase().includes(query) || (p.clan ?? "").toLowerCase().includes(query)));

  const search = el("input", "search");
  search.type = "search";
  search.placeholder = t("web.players.search");
  search.value = query;
  search.addEventListener("input", () => {
    query = search.value.trim().toLowerCase();
    renderPlayers();
    const again = $("page-players").querySelector("input.search");
    again?.focus();
    again?.setSelectionRange(again.value.length, again.value.length);
  });
  const bar = tabs(
    ["all", "online"].map((k) => [k, t("web.players.filter." + k, k === "online" ? all.filter((p) => p.online).length : all.length)]),
    filter,
    (k) => {
      filter = k;
      renderPlayers();
    }
  );

  const cards = list.map((p) => {
    const self = p.name === me?.name;
    const box = el(
      "article",
      "card player" + (p.online ? " online" : ""),
      el(
        "div",
        "player-head",
        avatar(p.name, 44),
        el(
          "div",
          "",
          el("b", "", plain(p.name)),
          el("div", "tags", el("span", "status", el("i", "dot" + (p.online ? " on" : "")), p.online ? t("web.players.online") : p.seen ? t("web.players.seen", ago(Date.now() - p.seen)) : t("web.offline.player")), p.clan ? el("span", "tag", "[" + plain(p.clan) + "]") : "", self ? el("span", "tag warn", t("web.players.you")) : "")
        )
      )
    );
    if (loggedIn() && me && !self) box.append(actionsFor(p, me));
    return box;
  });

  $("page-players").replaceChildren(
    el("div", "toolbar", search, bar),
    el("p", "muted small", t(loggedIn() && me ? "web.players.text" : "web.players.login")),
    cards.length ? el("div", "cards players", ...cards) : empty("web.players.none")
  );
}

function actionsFor(p, me) {
  const box = el(
    "div",
    "actions player-actions",
    button(t("web.players.note"), () => go("messages", p.name), "primary small", "messages"),
    button(t("web.players.gift"), () => giftDialog(me, p.name), "ghost small", "gift"),
    button(t("web.players.offer"), () => newOffer(me, p.name), "ghost small", "market"),
    button(t("web.players.bounty"), () => newBounty(me, p.name), "ghost small", "bounties")
  );
  if (me.clan?.perms?.invite && !p.clan) box.append(button(t("web.players.invite"), () => act("clan.invite", { name: p.name }, { okText: t("web.players.invited", p.name), after: refresh }), "ghost small", "clans"));
  const entry = me.admin?.players?.find((e) => e.name === p.name);
  if (entry) box.append(button("", () => adminMenu(entry), "ghost small icon-only", "admin"));
  return box;
}

export async function giftDialog(me, name) {
  if (!me.online || !me.inventory) return toast(t("web.need.online"), "warn");
  if (!me.inventory.length) return toast(t("web.inv.empty"), "warn");
  const picks = pickBody(me.inventory);
  const v = await dialog({ title: t("web.players.gift.title", plain(name)), text: t("web.players.gift.text"), body: picks, ok: t("web.players.gift") });
  if (!v) return;
  const chosen = picks.read();
  if (!chosen.length) return toast(t("web.market.nothing"), "warn");
  await act("mail.gift", { to: name, picks: chosen }, { okText: t("web.players.gift.sent", name), after: refresh });
}

