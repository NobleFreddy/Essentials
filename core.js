/**
 * Grundlagen der Webseite: Sprache, Datenquelle, Anmeldung, Befehle.
 *
 * Datenquellen (pickMode):
 *   local     der lokale Server (tools/local-server.mjs) - alles, auch Anmeldung und Aktionen
 *   supabase  nur Anzeige (Stufe 1) - fuer GitHub Pages, gelesen ueber die Edge Function
 *   demo      Beispieldaten
 */
export const cfg = window.BE_CONFIG ?? {};
const params = new URLSearchParams(location.search);

export const state = {
  mode: "demo",
  snap: null, // { data, updated_at }
  me: null, // { id, name, bundle, positions }
  lang: "de",
  texts: {},
  items: {},
};

// ---------------------------------------------------------------- Sprache
export const stored = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
export const store = (k, v) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* privater Modus */
  }
};

state.lang = stored("be-lang") || (navigator.language?.toLowerCase().startsWith("de") ? "de" : "en");

/** Uebersetzung mit %1, %2 ... */
export function t(key, ...args) {
  const s = state.texts[key];
  if (s === undefined) return key;
  return args.length ? s.replace(/%(\d+)/g, (_, n) => String(args[Number(n) - 1] ?? "")) : s;
}
export const has = (key) => state.texts[key] !== undefined;

export async function loadLang(lang = state.lang) {
  state.lang = lang;
  store("be-lang", lang);
  const [texts, items] = await Promise.all([getJson("lang/" + lang + ".json").catch(() => ({})), getJson("lang/items_" + lang + ".json").catch(() => ({}))]);
  state.texts = texts;
  state.items = items;
  document.documentElement.lang = lang;
}

/** Name eines Items: aus der Sprachdatei, sonst aus der ID ("ruby_block" -> "Ruby Block"). */
export function itemName(it) {
  if (it?.nm) return it.nm;
  const k = it?.k;
  const fromLang = k && (state.items[k] ?? state.texts[k]);
  if (fromLang) return fromLang.replace(/§./g, "");
  const id = String(it?.t ?? "?").replace(/^[a-z0-9_]+:/, "");
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------- Abfragen
export async function getJson(url, opts = {}) {
  const r = await fetch(url, { cache: "no-cache", ...opts });
  if (!r.ok) {
    const err = new Error(r.status + " " + r.statusText);
    err.status = r.status;
    try {
      err.body = await r.json();
    } catch {
      /* kein JSON */
    }
    throw err;
  }
  return r.json();
}

const token = () => stored("be-token");
export const loggedIn = () => !!token() && state.mode === "local";
const authHeaders = () => (token() ? { Authorization: "Bearer " + token() } : {});

async function post(url, body) {
  return getJson(url, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(body ?? {}) });
}

// Supabase (nur Anzeige): ueber die Edge Function "essentials-web" - ohne Schluessel, die Daten
// liegen in einem eigenen Schema, das die REST-API nicht freigibt
const fnUrl = (query) => cfg.supabaseUrl.replace(/\/+$/, "") + "/functions/v1/" + (cfg.webFunction || "essentials-web") + "?" + query;
const PAGE = 2000;

const SOURCES = {
  local: {
    snapshot: () => getJson("api/snapshot"),
    tiles: (dim, since) => getJson("api/tiles?dim=" + encodeURIComponent(dim) + (since ? "&since=" + encodeURIComponent(since) : "")),
  },
  demo: {
    snapshot: async () => ({ data: await getJson("demo/snapshot.json"), updated_at: new Date().toISOString() }),
    tiles: async (dim, since) => (since || dim !== "minecraft:overworld" ? [] : getJson("demo/tiles.json")),
  },
  supabase: {
    snapshot: () => getJson(fnUrl("what=snapshot")),
    tiles: async (dim, since) => {
      const out = [];
      let from = since;
      // Seitenweise: eine volle Seite heisst, es kommt noch mehr (eine Millisekunde Ueberlappung
      // schadet nicht - gleiche Stuecke ueberschreiben sich nur)
      for (let i = 0; i < 50; i++) {
        const page = await getJson(fnUrl("what=tiles&dim=" + encodeURIComponent(dim) + (from ? "&since=" + encodeURIComponent(from) : "")));
        out.push(...page);
        if (page.length < PAGE) break;
        from = new Date(Date.parse(page.at(-1).updated_at) - 1).toISOString();
      }
      return out;
    },
  },
};

export async function pickMode() {
  if (params.has("demo")) return (state.mode = "demo");
  // Auf GitHub Pages gibt es keinen lokalen Server - gar nicht erst fragen
  if (/\.github\.io$/i.test(location.hostname)) return (state.mode = cfg.supabaseUrl ? "supabase" : "demo");
  try {
    if ((await getJson("api/status")).mode === "local") return (state.mode = "local");
  } catch {
    /* kein lokaler Server */
  }
  return (state.mode = cfg.supabaseUrl ? "supabase" : "demo");
}

export const source = {
  snapshot: () => SOURCES[state.mode].snapshot(),
  tiles: (dim, since) => SOURCES[state.mode].tiles(dim, since),
};

// ---------------------------------------------------------------- Anmeldung
/**
 * Dieses Geraet: eine zufaellige Kennung (bleibt im Browser) und eine lesbare Bezeichnung
 * fuer die Geraeteliste ("Chrome · Windows"). Der Server speichert nur einen Hash davon.
 */
export function device() {
  let id = stored("be-device");
  if (!id || id.length < 16) {
    const bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    id = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    store("be-device", id);
  }
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return { device: id, label: browser + (os ? " · " + os : "") };
}

/** Mit /link-Code (erstes Mal, Passwort vergessen). */
export async function login(code) {
  const out = await post("api/login", { code, ...device() });
  store("be-token", out.token);
  return out;
}

/** Mit Spielername und Passwort - code nur, wenn der Server ihn fuer ein neues Geraet verlangt. */
export async function loginPassword(name, password, code) {
  const out = await post("api/login", { name, password, ...(code ? { code } : {}), ...device() });
  store("be-token", out.token);
  return out;
}

export const setPassword = (password, old) => post("api/password", { password, ...(old ? { old } : {}) });
export const setAccount = (values) => post("api/account", values);
export const sessions = () => getJson("api/sessions", { headers: authHeaders() });
export const revokeSession = (args) => post("api/sessions", args);

/** Konto ganz loesen: im Spiel nicht mehr verknuepft, Passwort weg. */
export async function unlinkAccount() {
  await post("api/account/unlink", {});
  store("be-token", null);
  state.me = null;
}

export async function logout(everywhere = false) {
  try {
    await post("api/logout", { everywhere });
  } catch {
    /* ohnehin weg */
  }
  store("be-token", null);
  state.me = null;
}

/** Eigene Daten holen. Ein abgelaufener Zugang meldet sich still ab. */
export async function refreshMe() {
  if (!loggedIn()) return (state.me = null);
  try {
    state.me = await getJson("api/me", { headers: authHeaders() });
  } catch (err) {
    if (err.status === 401) {
      store("be-token", null);
      state.me = null;
    }
  }
  return state.me;
}

// ---------------------------------------------------------------- Befehle
/**
 * Einen Befehl schicken und auf das Ergebnis warten.
 * onState(state) wird bei jedem Wechsel gerufen: waiting, sent, queued, done, failed.
 */
export async function command(type, args, onState = () => {}) {
  const { id } = await post("api/cmd", { type, args });
  onState({ state: "waiting" });
  const started = Date.now();
  let last = "waiting";
  while (Date.now() - started < 90000) {
    await new Promise((r) => setTimeout(r, 1200));
    let s;
    try {
      s = await getJson("api/cmd?id=" + encodeURIComponent(id), { headers: authHeaders() });
    } catch {
      continue;
    }
    if (s.state !== last) {
      last = s.state;
      onState(s);
    }
    if (s.state === "done" || s.state === "failed" || s.state === "queued") return s;
  }
  const s = { state: "failed", reason: "timeout" };
  onState(s);
  return s;
}

/** Fehlertext zu einem Grund - aus den Texten des passenden Moduls, sonst allgemein. */
export function reasonText(type, reason) {
  const area = String(type).split(".")[0];
  const prefix = { trade: "trade.err.", mail: "trade.err.", clan: "clan.err.", legacy: "legacy.err.", bounty: "bounty.err." }[area];
  for (const key of [prefix && prefix + reason, "web.err." + reason]) if (key && has(key)) return t(key).replace(/%\d/g, "");
  return t("web.err.generic", reason ?? "?");
}
