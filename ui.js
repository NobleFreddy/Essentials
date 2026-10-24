/**
 * Bausteine der Webseite: Elemente, Balken, Items, Hinweise (Toasts) und Dialoge.
 * Alles als DOM gebaut, nie als HTML-Text - was vom Server kommt, bleibt Text.
 */
import { t, itemName, command, reasonText, getJson, state } from "./core.js";
import { icon } from "./icons.js";

export function el(tag, cls, ...kids) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  for (const k of kids.flat()) {
    if (k === undefined || k === null || k === false) continue;
    e.append(k instanceof Node ? k : String(k));
  }
  return e;
}

export const $ = (id) => document.getElementById(id);

export function meter(ratio, kind = "") {
  const m = el("div", "meter" + (kind ? " " + kind : ""));
  const bar = el("span");
  bar.style.width = Math.max(0, Math.min(100, ratio * 100)).toFixed(1) + "%";
  m.append(bar);
  return m;
}

export function ago(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return t("web.ago.s", s);
  if (s < 3600) return t("web.ago.m", Math.floor(s / 60));
  if (s < 86400) return t("web.ago.h", Math.floor(s / 3600));
  return t("web.ago.d", Math.floor(s / 86400));
}

export function until(ts) {
  const ms = ts - Date.now();
  return ms > 0 ? ago(ms) : "–";
}

/** "Sa., 25.10., 20:00" - in der Sprache der Seite und der Zeitzone dessen, der sie ansieht. */
export function dateTime(ts) {
  try {
    return new Date(ts).toLocaleString(state.lang === "de" ? "de-DE" : "en-GB", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return new Date(ts).toISOString().slice(0, 16).replace("T", " ");
  }
}

export const empty = (key) => el("p", "empty", t(key));

// ---------------------------------------------------------------- Item-Bilder
/** Der Atlas aus tools/gen-item-icons.mjs: ID -> Feld. Fehlt er, gibt es Ersatzbilder. */
let atlas = { size: 16, cols: 1, rows: 1, ids: {} };
export async function loadIcons() {
  try {
    atlas = await getJson("shared/items.json");
  } catch {
    /* ohne Bilder */
  }
}

const hue = (s) => {
  let h = 2166136261;
  for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return Math.abs(h) % 360;
};

/** Bild eines Items - aus dem Atlas, sonst ein Feld mit Anfangsbuchstaben (fremde Addons). */
export function itemIcon(typeId, size = 24) {
  const id = String(typeId ?? "");
  const key = id.startsWith("minecraft:") ? id.slice(10) : id;
  const i = atlas.ids[key];
  const box = el("i", "ico");
  box.style.width = box.style.height = size + "px";
  if (i === undefined) {
    box.classList.add("ico-none");
    box.textContent = (key.split(":").pop() || "?")[0].toUpperCase();
    box.style.setProperty("--h", String(hue(key)));
    box.style.fontSize = Math.round(size * 0.55) + "px";
    return box;
  }
  box.style.backgroundSize = atlas.cols * size + "px " + atlas.rows * size + "px";
  box.style.backgroundPosition = -(i % atlas.cols) * size + "px " + -Math.floor(i / atlas.cols) * size + "px";
  return box;
}

/** Ein Spieler als kleines Pixel-Bild mit Anfangsbuchstaben - die Farbe ergibt sich aus dem Namen. */
export function avatar(name, size = 28) {
  const a = el("span", "avatar", String(name ?? "?").slice(0, 1).toUpperCase());
  a.style.setProperty("--h", String(hue(name)));
  a.style.width = a.style.height = size + "px";
  a.style.fontSize = Math.round(size * 0.5) + "px";
  a.title = String(name ?? "");
  return a;
}

/** Reiter: [[key, label, badge?]] - aktiv ist current. */
export function tabs(list, current, onPick) {
  return el(
    "div",
    "seg",
    ...list.map(([key, label, badge]) => {
      const b = el("button", key === current ? "active" : "", label, badge ? el("span", "badge", String(badge)) : "");
      b.type = "button";
      b.addEventListener("click", () => onPick(key));
      return b;
    })
  );
}

/** Ueberschrift eines Kastens mit Symbol und optionalen Knoepfen rechts. */
export const head = (title, iconName, ...right) => el("div", "card-head", el("h2", "", iconName ? icon(iconName) : "", title), right.length ? el("div", "actions", ...right) : "");

/** "64× Diamant" als kleines Feld, Verzauberungen als Hinweis. */
export function itemChip(it) {
  const chip = el("span", "item", itemIcon(it.t, 22), el("b", "", it.n + "×"), " " + itemName(it));
  if (it.e?.length) {
    chip.classList.add("ench");
    chip.title = it.e.join(", ");
  }
  if (it.nm) chip.title = (chip.title ? chip.title + " · " : "") + it.t;
  return chip;
}

export const itemList = (list) => el("span", "items", ...(list ?? []).map(itemChip));

export function button(label, onClick, kind = "", iconName) {
  const b = el("button", "btn" + (kind ? " " + kind : ""), iconName ? icon(iconName) : "", label);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

// ---------------------------------------------------------------- Hinweise
export function toast(text, kind = "") {
  const box = $("toasts");
  const n = el("div", "toast" + (kind ? " " + kind : ""), text);
  box.append(n);
  setTimeout(() => n.classList.add("gone"), 4500);
  setTimeout(() => n.remove(), 5200);
  return n;
}

/**
 * Einen Befehl ausfuehren, mit Hinweisen fuer jeden Schritt. Danach after() - meist: eigene
 * Daten neu holen und neu zeichnen.
 */
export async function act(type, args, { okText, queuedText, after, quiet = false } = {}) {
  // quiet: kein "Wird gesendet"/"Erledigt" - nur, wenn etwas schiefgeht oder wartet
  const note = quiet ? el("i") : toast(t("web.cmd.sending"));
  try {
    const res = await command(type, args, (s) => {
      if (s.state === "sent") note.textContent = t("web.cmd.sent");
    });
    note.remove();
    if (res.state === "queued") toast(queuedText ?? t("web.cmd.queued"), "warn");
    else if (res.state === "done") quiet || toast(okText ?? t("web.cmd.done"), "good");
    else toast(reasonText(type, res.reason), "bad");
    await after?.(true);
    return res;
  } catch (err) {
    note.remove();
    toast(reasonText(type, err.body?.reason ?? "error"), "bad");
    return { state: "failed" };
  }
}

// ---------------------------------------------------------------- Dialoge
/**
 * Ein Formular im Dialog.
 * fields: [{ name, label, type: text|number|textarea|checkbox|select, value, options, min, max, list, hint }]
 * @returns {Promise<object|undefined>} die Werte, oder undefined bei Abbrechen
 */
export function dialog({ title, text, fields = [], ok = t("web.ok"), danger = false, body, cancel = true }) {
  return new Promise((resolve) => {
    const d = el("dialog", "dlg");
    const form = el("form");
    form.method = "dialog";
    form.append(el("h3", "", title));
    if (text) form.append(el("p", "muted", text));
    if (body) form.append(body);
    const inputs = {};
    for (const f of fields) {
      const id = "f-" + f.name + "-" + Math.random().toString(36).slice(2, 7);
      let input;
      if (f.type === "textarea") input = el("textarea");
      else if (f.type === "select") {
        input = el("select");
        for (const [value, label] of f.options) {
          const o = el("option", "", label);
          o.value = value;
          input.append(o);
        }
      } else {
        input = el("input");
        input.type = f.type ?? "text";
        if (f.min !== undefined) input.min = f.min;
        if (f.max !== undefined) input.max = f.max;
        if (f.list) {
          const dl = el("datalist");
          dl.id = id + "-list";
          for (const v of f.list) dl.append(Object.assign(el("option"), { value: v }));
          form.append(dl);
          input.setAttribute("list", dl.id);
        }
      }
      input.id = id;
      if (f.type === "checkbox") input.checked = !!f.value;
      else if (f.value !== undefined) input.value = f.value;
      if (f.maxlength) input.maxLength = f.maxlength;
      inputs[f.name] = input;
      const label = el("label", f.type === "checkbox" ? "check" : "", f.type === "checkbox" ? input : "", f.label);
      label.htmlFor = id;
      form.append(f.type === "checkbox" ? label : el("div", "field", label, input, f.hint ? el("small", "muted", f.hint) : ""));
    }
    const cancelBtn = button(t("web.cancel"), () => d.close(""), "ghost");
    const submit = el("button", "btn" + (danger ? " danger" : " primary"), ok);
    submit.value = "ok";
    form.append(el("div", "actions", cancel ? cancelBtn : "", submit));
    d.append(form);
    document.body.append(d);
    d.addEventListener("close", () => {
      const values = Object.fromEntries(Object.entries(inputs).map(([k, i]) => [k, i.type === "checkbox" ? i.checked : i.type === "number" ? Number(i.value) : i.value]));
      d.remove();
      resolve(d.returnValue === "ok" ? values : undefined);
    });
    d.showModal();
    (Object.values(inputs)[0] ?? submit).focus();
  });
}

export const confirmDialog = (title, text, ok, danger = false) => dialog({ title, text, ok, danger }).then((v) => !!v);
