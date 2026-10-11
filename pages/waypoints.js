/**
 * Wegpunkte auf der Karte: setzen (Klick auf die Karte oder "an meiner Stelle"), ansehen,
 * hinspringen, loeschen. Fuer sich, fuer den Clan oder fuer alle.
 */
import { state, t, loggedIn } from "../core.js";
import { el, button, act, dialog, confirmDialog, toast, empty } from "../ui.js";
import { plain } from "../rawtext.js";
import { SCOPE_ICON } from "../map.js";

/** Dieselben Farben wie im Addon (core/waypoints.js) - dort wird nur die Nummer gespeichert. */
export const COLORS = ["#f0b232", "#e5534b", "#7ce06f", "#6fb8ff", "#c38cff", "#ff8cc6", "#ffffff", "#40d0c0"];
const DIM_KEY = { "minecraft:overworld": "web.map.overworld", "minecraft:nether": "web.map.nether", "minecraft:the_end": "web.map.end" };

/** Oeffentliche aus dem Stand, dazu die eigenen und die des Clans aus dem eigenen Paket. */
export function allWaypoints() {
  const byId = new Map();
  for (const w of state.snap?.data?.waypoints ?? []) byId.set(w.id, w);
  for (const w of state.me?.bundle?.waypoints ?? []) byId.set(w.id, w);
  return [...byId.values()];
}

const scopeLabel = (w) => SCOPE_ICON[w.scope] + " " + (w.scope === "clan" && w.clan ? t("web.wp.scope.clan") + " [" + plain(w.clan) + "]" : t("web.wp.scope." + w.scope));
const coords = (w) => w.x + (w.y === null || w.y === undefined ? "" : " " + w.y) + " " + w.z;

function scopeOptions() {
  const out = [["me", SCOPE_ICON.me + " " + t("web.wp.scope.me")]];
  if (state.me?.bundle?.clan) out.push(["clan", SCOPE_ICON.clan + " " + t("web.wp.scope.clan")]);
  out.push(["all", SCOPE_ICON.all + " " + t("web.wp.scope.all")]);
  return out;
}

const colorOptions = () => COLORS.map((c, i) => [String(i), "● " + t("web.wp.color." + i)]);

/**
 * Einen Wegpunkt anlegen. pos: { x, z, y?, d } - oder { here: true } fuer die eigene Stelle.
 */
export async function newWaypoint(pos, after) {
  if (!loggedIn() || !state.me?.bundle) return toast(t("web.wp.login"), "warn");
  const fields = [
    { name: "name", label: t("web.wp.name"), maxlength: 32 },
    { name: "scope", label: t("web.wp.scope"), type: "select", options: scopeOptions(), value: "me" },
    { name: "color", label: t("web.wp.color"), type: "select", options: colorOptions(), value: "0" },
  ];
  if (!pos.here) fields.push({ name: "y", label: t("web.wp.y"), type: "number", value: pos.y ?? "", min: -64, max: 320, hint: t("web.wp.y.hint") });
  const v = await dialog({
    title: t("web.wp.new"),
    text: pos.here ? t("web.wp.here.text") : t("web.wp.at", pos.x, pos.z, t(DIM_KEY[pos.d] ?? "web.map.overworld")),
    fields,
    ok: t("web.wp.create"),
  });
  if (!v?.name?.trim()) return;
  const args = { name: v.name.trim(), scope: v.scope, color: Number(v.color) };
  if (pos.here) args.here = true;
  else Object.assign(args, { x: pos.x, z: pos.z, d: pos.d, y: Number.isFinite(v.y) && String(v.y) !== "" ? Math.round(v.y) : null });
  await act("wp.add", args, { okText: t("web.wp.created", args.name), after });
}

export async function removeWaypoint(w, after) {
  if (!(await confirmDialog(t("web.wp.remove"), t("web.wp.remove.confirm", plain(w.name)), t("web.wp.remove"), true))) return;
  await act("wp.remove", { id: w.id }, { after });
}

/** Klick auf einen Wegpunkt. */
export async function showWaypoint(w, after) {
  const body = el(
    "div",
    "wp-info",
    el("p", "", el("span", "dot-color", "●"), " ", scopeLabel(w)),
    el("p", "muted", t(DIM_KEY[w.d] ?? "web.map.overworld") + " · " + coords(w)),
    w.owner ? el("p", "muted", t("web.wp.by", plain(w.owner))) : ""
  );
  body.querySelector(".dot-color").style.color = w.color;
  const copy = button("⧉ " + t("web.wp.copy"), async () => {
    try {
      await navigator.clipboard.writeText(coords(w));
      toast(t("web.wp.copied"), "good");
    } catch {
      toast(coords(w));
    }
  }, "ghost small");
  body.append(el("div", "actions", copy, w.del ? button(t("web.wp.remove"), () => (body.closest("dialog")?.close(""), removeWaypoint(w, after)), "danger small") : ""));
  await dialog({ title: plain(w.name), body, ok: t("web.ok"), cancel: false });
}

/** Die Liste unter der Karte. */
export function waypointList(map, { onShow, after }) {
  const list = allWaypoints().sort((a, b) => Number(b.mine) - Number(a.mine) || a.name.localeCompare(b.name));
  const head = el("div", "card-head", el("h2", "", t("web.wp.title")), el("span", "muted", loggedIn() ? t("web.wp.limits") : t("web.wp.login")));
  if (!list.length) return el("section", "card wide", head, empty("web.wp.none"));
  const rows = list.map((w) => {
    const dot = el("i", "wp-dot");
    dot.style.background = w.color;
    const other = w.d !== map.dimension;
    return el(
      "li",
      other ? "dim" : "",
      el("span", "", dot, el("b", "", plain(w.name)), el("small", "muted", " " + scopeLabel(w) + " · " + coords(w) + (other ? " · " + t(DIM_KEY[w.d] ?? "web.map.overworld") : "") + (w.owner && !w.mine ? " · " + plain(w.owner) : ""))),
      el("span", "actions", button("⌖ " + t("web.wp.show"), () => onShow(w), "ghost small"), w.del ? button("✕", () => removeWaypoint(w, after), "ghost small") : "")
    );
  });
  return el("section", "card wide", head, el("ul", "members wp-list", ...rows));
}
