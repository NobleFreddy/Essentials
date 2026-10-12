/**
 * Bedrock Essentials - die Webseite.
 *
 * Geruest: Seitenleiste mit Gruppen (Welt · Gemeinschaft · Handel · Ich · Admin), oben Titel
 * und Status, am Handy eine Leiste unten und die Seitenleiste als Schublade. Navigiert wird
 * ueber den Anker (#/market), damit Zurueck im Browser funktioniert.
 *
 * Holt den Stand regelmaessig nach - lokal alle 3 Sekunden, sonst alle 10. Wer angemeldet ist,
 * bekommt dazu seine eigenen Daten; daraus ergeben sich die Zaehler fuer Ungelesenes (und auf
 * Wunsch Hinweise des Browsers).
 */
import { state, t, loadLang, pickMode, source, refreshMe, loggedIn, getJson, stored, store } from "./core.js";
import { el, $, ago, toast, loadIcons, avatar } from "./ui.js";
import { icon } from "./icons.js";
import { pixelText } from "./pixel.js";
import { createMap, loadColors, SCOPE_ICON } from "./map.js";
import { plain } from "./rawtext.js";
import { renderOverview, renderLegacy, renderMarket, renderBounties, renderRanks } from "./pages/public.js";
import { renderClans } from "./pages/clans.js";
import { renderProfile } from "./pages/profile.js";
import { renderAdmin } from "./pages/admin.js";
import { renderPlayers } from "./pages/players.js";
import { renderMessages } from "./pages/messages.js";
import { renderInfo } from "./pages/info.js";
import { allWaypoints, newWaypoint, showWaypoint, waypointList } from "./pages/waypoints.js";

/** [ID, Uebersetzungsschluessel] aller bekannten Items - fuer die Suche nach Namen. */
export let ITEM_IDS = [];

const OFFLINE_AFTER_MS = 90000;
const GROUPS = [
  ["web.group.world", [["overview", "home"], ["map", "map"], ["legacy", "legacy"], ["info", "info"]]],
  ["web.group.community", [["players", "players"], ["clans", "clans"], ["ranks", "ranks"]]],
  ["web.group.trade", [["market", "market"], ["bounties", "bounties"]]],
  ["web.group.me", [["messages", "messages"], ["profile", "profile"]]],
  ["web.group.admin", [["admin", "admin"]]],
];
const PAGES = GROUPS.flatMap(([, list]) => list.map(([p]) => p));
const ICON_OF = Object.fromEntries(GROUPS.flatMap(([, list]) => list));
const TABBAR = ["overview", "map", "market", "messages"];
const RENDER = {
  overview: renderOverview,
  map: renderMapPage,
  info: renderInfo,
  players: renderPlayers,
  legacy: renderLegacy,
  market: renderMarket,
  clans: renderClans,
  bounties: renderBounties,
  ranks: renderRanks,
  messages: renderMessages,
  profile: renderProfile,
  admin: renderAdmin,
};
let page = "overview";

// ---------------------------------------------------------------- Ungelesenes
const CHAT_SEEN = "be-chat-seen";
/** Was auf den Spieler wartet - je Seite eine Zahl. */
export function unread() {
  const b = state.me?.bundle;
  if (!b) return {};
  const msgs = (b.messages ?? []).filter((m) => !m.o && !m.r).length;
  const mail = (b.mail?.items?.length ?? 0) + (b.mail?.events?.length ?? 0);
  const offers = b.offers?.forMe?.length ?? 0;
  const seen = Number(stored(CHAT_SEEN + ":" + (b.clan?.id ?? "")) || 0);
  const chat = (b.clan?.chat ?? []).filter((m) => m.at > seen && m.name !== b.name).length;
  const invites = b.invites?.length ?? 0;
  return { messages: msgs, profile: mail, market: offers, clans: invites + chat, msgs, mail, offers, chat, invites };
}

/** Den Clan-Chat als gelesen merken (beim Oeffnen des Chats). */
export function chatSeen() {
  const b = state.me?.bundle;
  const last = Math.max(0, ...(b?.clan?.chat ?? []).map((m) => m.at));
  if (b?.clan) store(CHAT_SEEN + ":" + b.clan.id, String(last));
}

// Browser-Hinweise: nur wenn erlaubt und der Zaehler steigt
let lastCounts;
export const notifyOn = () => stored("be-notify") === "1" && typeof Notification !== "undefined" && Notification.permission === "granted";
export async function setNotify(on) {
  if (!on) return store("be-notify", null);
  if (typeof Notification === "undefined") return toast(t("web.notify.unsupported"), "warn");
  const p = await Notification.requestPermission();
  if (p === "granted") {
    store("be-notify", "1");
    toast(t("web.notify.on"), "good");
  } else toast(t("web.notify.denied"), "warn");
}
function notifyChanges() {
  const now = unread();
  if (lastCounts && notifyOn() && document.hidden) {
    for (const [k, key] of [["msgs", "web.notify.msgs"], ["offers", "web.notify.offers"], ["invites", "web.notify.invites"], ["chat", "web.notify.chat"], ["mail", "web.notify.mail"]]) {
      if ((now[k] ?? 0) > (lastCounts[k] ?? 0)) {
        try {
          new Notification(t("web.title"), { body: t(key, now[k]), tag: "be-" + k });
        } catch {
          /* nicht moeglich */
        }
      }
    }
  }
  lastCounts = now;
}

// ---------------------------------------------------------------- Navigation
function currentPage() {
  const p = location.hash.replace(/^#\/?/, "").split("/")[0];
  return PAGES.includes(p) ? p : "overview";
}

const visible = (p) => p !== "admin" || !!state.me?.bundle?.op;

function navLink(p, cls = "") {
  const counts = unread();
  const label = p === "profile" && !(loggedIn() && state.me) ? t("web.nav.login") : t("web.nav." + p);
  const a = el("a", cls + (p === page ? " active" : ""), icon(ICON_OF[p]), el("span", "label", label), counts[p] ? el("span", "badge", String(counts[p])) : "");
  a.href = "#/" + p;
  a.addEventListener("click", () => closeDrawer());
  return a;
}

function renderNav() {
  $("nav").replaceChildren(
    ...GROUPS.map(([key, list]) => {
      const shown = list.filter(([p]) => visible(p));
      return shown.length ? el("div", "nav-group", el("span", "nav-head", t(key)), ...shown.map(([p]) => navLink(p))) : "";
    })
  );
  const counts = unread();
  const more = el("button", "", icon("menu"), el("span", "label", t("web.nav.more")));
  more.type = "button";
  more.addEventListener("click", openDrawer);
  const moreBadge = PAGES.filter((p) => !TABBAR.includes(p)).reduce((n, p) => n + (counts[p] ?? 0), 0);
  if (moreBadge) more.append(el("span", "badge", String(moreBadge)));
  $("tabbar").replaceChildren(...TABBAR.map((p) => navLink(p)), more);
  // Konto oben rechts
  const chip = $("account-chip");
  if (loggedIn() && state.me) chip.replaceChildren(avatar(state.me.name, 26), el("span", "label", plain(state.me.name)));
  else chip.replaceChildren(icon("profile"), el("span", "label", t("web.nav.login")));
}

const openDrawer = () => {
  $("side").classList.add("open");
  $("scrim").hidden = false;
};
const closeDrawer = () => {
  $("side").classList.remove("open");
  $("scrim").hidden = true;
};

function show() {
  lastRender = Date.now();
  page = currentPage();
  if (!visible(page)) page = "overview";
  for (const p of PAGES) $("page-" + p).hidden = p !== page;
  $("page-title").replaceChildren(icon(ICON_OF[page]), pixelText(t("web.nav." + page)));
  document.title = t("web.nav." + page) + " · " + (serverName() || "Bedrock Essentials");
  renderNav();
  renderPage();
  if (page === "map") window.dispatchEvent(new Event("resize"));
  window.scrollTo({ top: 0 });
}

function renderPage() {
  try {
    RENDER[page]?.();
  } catch (err) {
    console.error(err);
  }
}

// ---------------------------------------------------------------- Kopf
const serverName = () => state.snap?.data?.info?.name || "";

function renderStatus() {
  const snap = state.snap;
  const pill = $("status-pill");
  $("brand-name").replaceChildren(pixelText(serverName() || "Bedrock Essentials", "brand-pixel"));
  if (!snap) {
    pill.className = "pill";
    pill.textContent = "…";
    $("status-line").textContent = "";
    return;
  }
  const age = Date.now() - Date.parse(snap.updated_at);
  const online = age < OFFLINE_AFTER_MS;
  pill.className = "pill " + (online ? "on" : "off");
  pill.replaceChildren(el("i", "dot" + (online ? " on" : "")), online ? t("web.online") + " · " + (snap.data?.online?.length ?? 0) : t("web.offline"));
  $("status-line").textContent = t("web.updated", ago(age));
}

function renderBanner() {
  const note = state.mode === "demo" ? "web.demo" : !state.snap ? "web.waiting" : "";
  $("banner").hidden = !note;
  if (note) $("banner").textContent = t(note);
}

// ---------------------------------------------------------------- Theme
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  store("be-theme", theme);
  $("theme-toggle").replaceChildren(icon(theme === "dark" ? "sun" : "moon"));
  $("theme-toggle").title = t(theme === "dark" ? "web.theme.light" : "web.theme.dark");
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#0f1115" : "#eef1f5";
}

// ---------------------------------------------------------------- Karte
const DIMS = [
  ["minecraft:overworld", "web.map.overworld"],
  ["minecraft:nether", "web.map.nether"],
  ["minecraft:the_end", "web.map.end"],
];
const since = {};
let map;
const FILTERS = ["players", "me", "clan", "all", "marks"];
const filter = (() => {
  try {
    return { players: true, me: true, clan: true, all: true, marks: true, ...JSON.parse(stored("be-map-filter") || "{}") };
  } catch {
    return Object.fromEntries(FILTERS.map((k) => [k, true]));
  }
})();

const btn = (label, cls, onClick, iconName) => {
  const b = el("button", "btn " + cls, iconName ? icon(iconName) : "", label);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
};

function renderMapPage() {
  const dims = el(
    "div",
    "seg",
    ...DIMS.map(([id, key]) => {
      const b = el("button", map.dimension === id ? "active" : "", t(key));
      b.type = "button";
      b.addEventListener("click", async () => {
        map.setDimension(id);
        renderMapPage();
        await refreshTiles();
      });
      return b;
    })
  );
  const tools = $("map-tools");
  tools.replaceChildren(dims, btn(t("web.map.grid"), "ghost small", () => map.toggleGrid()), btn(t("web.map.center"), "ghost small", () => map.fit()));
  const mine = state.me?.positions?.find((p) => p.id === state.me.id);
  if (mine) {
    tools.append(
      btn(t("web.map.me"), "ghost small", () => {
        if ((mine.d ?? "minecraft:overworld") !== map.dimension) map.setDimension(mine.d);
        map.centerOn(mine.x, mine.z);
        renderMapPage();
      })
    );
  }
  // Wegpunkt: der naechste Klick auf die Karte setzt ihn - oder an der eigenen Stelle
  tools.append(
    btn(t(map.placing ? "web.wp.placing" : "web.wp.add"), map.placing ? "primary small" : "ghost small", () => {
      if (!loggedIn()) return toast(t("web.wp.login"), "warn");
      map.setPlacing(!map.placing);
      renderMapPage();
    }, map.placing ? "close" : "pin")
  );
  if (state.me?.bundle?.online) tools.append(btn(t("web.wp.here"), "ghost small", () => newWaypoint({ here: true }, () => refresh(true)), "plus"));
  // Was die Karte zeigt
  const chips = el(
    "div",
    "filters",
    ...FILTERS.map((k) => {
      const c = el("button", "chip" + (filter[k] ? " on" : ""), t("web.map.filter." + k));
      c.type = "button";
      c.addEventListener("click", () => {
        filter[k] = !filter[k];
        store("be-map-filter", JSON.stringify(filter));
        applyMapData();
        renderMapPage();
      });
      return c;
    })
  );
  tools.append(chips);
  $("map-wp").replaceChildren(
    waypointList(map, {
      onShow: (w) => {
        if (w.d !== map.dimension) map.setDimension(w.d);
        map.centerOn(w.x, w.z);
        renderMapPage();
        refreshTiles();
        $("map").scrollIntoView({ behavior: "smooth", block: "center" });
      },
      after: () => refresh(true),
    })
  );
  $("map-info").textContent = map.size() ? t("web.map.tiles", map.size()) : "";
  $("map-empty").hidden = map.size() > 0;
  $("map-players").textContent = loggedIn() ? t("web.map.players.clan") : t("web.map.players.login");
}

/** Sich selbst und den eigenen Clan - mehr gibt der Server ohnehin nicht heraus. */
function playersForMap() {
  const me = state.me;
  if (!me?.positions || !filter.players) return [];
  const myClan = me.bundle?.clan?.id;
  return me.positions.filter((p) => p.id === me.id || (myClan && p.clan?.id === myClan)).map((p) => ({ ...p, color: p.id === me.id ? "#f0b232" : "#7ce06f" }));
}

/** Wegpunkte nach Filter, dazu Todespunkt und Clan-Home. */
function marksForMap() {
  const list = allWaypoints().filter((w) => filter[w.scope]);
  const b = state.me?.bundle;
  if (filter.marks && b?.death) list.push({ id: "death", name: t("web.map.death"), scope: "death", color: "#b8c0cc", ...b.death });
  if (filter.marks && b?.clan?.home) list.push({ id: "home", name: t("web.map.home", plain(b.clan.tag || b.clan.name)), scope: "home", color: "#7ce06f", ...b.clan.home });
  return list;
}

function applyMapData() {
  map?.setPlayers(playersForMap());
  map?.setWaypoints(marksForMap());
}

/** Klick auf die Karte: Wegpunkt setzen oder einen ansehen. */
function mapClick({ x, z, col, wp, placing }) {
  if (placing) {
    map.setPlacing(false);
    renderMapPage();
    return newWaypoint({ x, z, d: map.dimension, y: col && col.id !== "air" ? col.y + 1 : undefined }, () => refresh(true));
  }
  if (wp && wp.scope !== "death" && wp.scope !== "home") showWaypoint(wp, () => refresh(true));
}

/** Nether und Oberwelt: 1 Block im Nether = 8 in der Oberwelt. */
function otherSide(x, z) {
  if (map.dimension === "minecraft:overworld") return t("web.map.as.nether", Math.floor(x / 8), Math.floor(z / 8));
  if (map.dimension === "minecraft:nether") return t("web.map.as.over", x * 8, z * 8);
  return "";
}

/** Nach dem Zuruecksetzen: die Karte im Browser leeren und von vorn laden. */
export function clearMapView() {
  for (const k of Object.keys(since)) delete since[k];
  map?.clear();
  state.snap = null;
}

async function refreshTiles() {
  const dim = map.dimension;
  try {
    const rows = await source.tiles(dim, since[dim]);
    if (rows.length) {
      map.addTiles(rows, dim);
      since[dim] = rows.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), since[dim] ?? "");
    }
  } catch {
    /* naechstes Mal */
  }
  if (page === "map") {
    $("map-info").textContent = map.size() ? t("web.map.tiles", map.size()) : "";
    $("map-empty").hidden = map.size() > 0;
  }
}

// ---------------------------------------------------------------- Daten
async function refreshSnapshot() {
  try {
    state.snap = (await source.snapshot()) ?? null;
  } catch {
    /* Server gerade weg - der alte Stand bleibt stehen */
  }
}

let lastSig = "";
let lastRender = 0;

/** Woran man erkennt, dass sich fuer die Seite etwas geaendert hat - ohne Zeitstempel. */
const signature = () => JSON.stringify([state.snap?.data && { ...state.snap.data, at: 0 }, state.me?.bundle && { ...state.me.bundle, at: 0 }, state.me?.account, state.me?.access, state.me?.name ?? "", loggedIn()]);

/**
 * Alles neu holen und die aktuelle Seite neu zeichnen. force: auch wenn gerade jemand in
 * ein Feld tippt - nach einer eigenen Aktion soll er das Ergebnis sehen.
 */
export async function refresh(force = false) {
  await Promise.all([refreshSnapshot(), refreshMe()]);
  // Die Verwaltung gibt es erst, wenn das eigene Paket da ist - stand sie in der Adresse, jetzt hin
  if (currentPage() !== page && visible(currentPage())) show();
  applyMapData();
  renderStatus();
  renderBanner();
  renderNav();
  notifyChanges();
  // Waehrend jemand tippt oder ein Dialog offen ist, nicht unter seinen Fingern neu zeichnen
  const active = document.activeElement;
  const typing = active?.matches?.("input, textarea, select") && $("page-" + page)?.contains(active);
  const sig = signature();
  const due = sig !== lastSig || Date.now() - lastRender > 30000;
  if ((force || (due && !typing)) && !document.querySelector("dialog[open]")) {
    lastSig = sig;
    lastRender = Date.now();
    renderPage();
  }
}

/** Zu einer Seite springen (auch mit Unterziel: go("messages", "Ben")). */
export function go(p, sub) {
  location.hash = "#/" + p + (sub ? "/" + encodeURIComponent(sub) : "");
}
export const subRoute = () => decodeURIComponent(location.hash.replace(/^#\/?[^/]*\/?/, ""));

// ---------------------------------------------------------------- Start
function applyTexts() {
  for (const node of document.querySelectorAll("[data-t]")) node.textContent = t(node.dataset.t);
  $("lang-toggle").textContent = state.lang === "de" ? "EN" : "DE";
  $("lang-toggle").title = t("web.lang");
  $("menu-btn").replaceChildren(icon("menu"));
  $("menu-btn").title = t("web.nav.more");
}

async function start() {
  applyTheme(stored("be-theme") || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
  await pickMode();
  await Promise.all([loadLang(), loadColors(), loadIcons()]);
  ITEM_IDS = await getJson("shared/itemlist.json").catch(() => []);
  map = createMap($("map"), {
    onClick: mapClick,
    onHover: (x, z, col, wp) => {
      const parts = wp ? [(SCOPE_ICON[wp.scope] ?? "") + " " + plain(wp.name)] : [];
      parts.push("X " + x, "Z " + z);
      if (col && col.id !== "air") {
        parts.push(col.id.replace("minecraft:", ""), "Y " + col.y);
        if (col.biome) parts.push(col.biome.replace(/_/g, " "));
        if (col.depth) parts.push(t("web.map.depth", col.depth));
      }
      const other = otherSide(x, z);
      if (other) parts.push(other);
      $("map-coords").textContent = parts.join(" · ");
    },
  });
  applyTexts();
  $("lang-toggle").addEventListener("click", async () => {
    await loadLang(state.lang === "de" ? "en" : "de");
    applyTexts();
    renderStatus();
    renderBanner();
    show();
  });
  $("theme-toggle").addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
  $("menu-btn").addEventListener("click", openDrawer);
  $("scrim").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeDrawer());
  let lastPage = currentPage();
  window.addEventListener("hashchange", () => {
    // Innerhalb einer Seite (z. B. eine Unterhaltung) nicht nach oben springen
    if (currentPage() === lastPage) return renderPage();
    lastPage = currentPage();
    show();
  });
  await refresh();
  await refreshTiles();
  show();
  // Lokal oft; ueber Supabase sparsam (die Aufrufe zaehlen gegen ein kostenloses Kontingent,
  // das sich die Seite mit einem anderen Projekt teilt) - und gar nicht, solange der Tab im
  // Hintergrund ist. Kommt er nach vorn, wird sofort nachgeholt.
  // Angemeldet alle 15 s - so oft meldet sich der Server bei Supabase
  const fast = state.mode === "local";
  const visibleOnly = (fn) => () => fast || !document.hidden ? fn() : undefined;
  let ticks = 0;
  setInterval(visibleOnly(() => (fast || loggedIn() || ++ticks % 2 === 0) && refresh()), fast ? 3000 : 15000);
  setInterval(visibleOnly(refreshTiles), fast ? 3000 : 60000);
  setInterval(renderStatus, 5000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !fast) {
      refresh();
      refreshTiles();
    }
  });
}

start();
