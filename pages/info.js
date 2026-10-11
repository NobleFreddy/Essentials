/**
 * Server-Info: Name, Beschreibung, Adresse zum Kopieren und zum direkten Hinzufuegen in
 * Minecraft, Regeln, Ansprechpartner und Links. Operatoren bearbeiten alles hier.
 *
 * Links kommen nur mit http(s) aus der Welt (siehe core/info.js im Addon) - hier wird es zur
 * Sicherheit noch einmal geprueft, und sie oeffnen sich ohne Verweis auf diese Seite.
 */
import { state, t } from "../core.js";
import { el, $, empty, button, act, dialog, toast, head, avatar } from "../ui.js";
import { icon } from "../icons.js";
import { pixelText } from "../pixel.js";
import { plain } from "../rawtext.js";
import { refresh } from "../app.js";

const S = () => state.snap?.data ?? {};
const B = () => state.me?.bundle ?? null;
const SAFE_URL = /^https?:\/\/[^\s"<>]+$/i;

/** minecraft://?addExternalServer=Name|adresse:port - legt den Server in Minecraft an. */
export const joinLink = (info) => "minecraft://?addExternalServer=" + encodeURIComponent((info.name || "Server").replace(/\|/g, " ")) + "|" + info.address + ":" + (info.port || 19132);

export function renderInfo() {
  const info = S().info ?? {};
  const op = !!B()?.op;
  const online = S().online ?? [];
  const parts = [];

  const hero = el(
    "section",
    "card wide info-hero",
    el("div", "", pixelText(info.name || "Bedrock Essentials", "hero-pixel"), info.about ? el("p", "lead", plain(info.about)) : el("p", "muted", t(op ? "web.info.empty.op" : "web.info.empty"))),
    op ? button(t("web.info.edit"), () => editInfo(info), "ghost small", "settings") : ""
  );
  parts.push(hero);

  if (info.address) {
    const addr = info.address + ":" + (info.port || 19132);
    const copy = button(t("web.info.copy"), async () => {
      try {
        await navigator.clipboard.writeText(addr);
        toast(t("web.info.copied"), "good");
      } catch {
        toast(addr);
      }
    }, "ghost small", "copy");
    const add = el("a", "btn primary small", icon("plus"), t("web.info.add"));
    add.href = joinLink(info);
    parts.push(
      el(
        "section",
        "card",
        head(t("web.info.join"), "globe"),
        el("div", "address", el("code", "", info.address), el("span", "muted", t("web.info.port", info.port || 19132))),
        el("div", "actions", copy, add),
        el("p", "muted small", t("web.info.join.hint"))
      )
    );
  }

  parts.push(
    el(
      "section",
      "card",
      head(t("web.info.now"), "players"),
      el("div", "avatars", ...online.slice(0, 24).map((p) => avatar(p.name, 32))),
      el("p", "muted small", t("web.info.counts", online.length, (S().players ?? []).length, (S().clans ?? []).length))
    )
  );

  if (info.rules?.length) parts.push(el("section", "card", head(t("web.info.rules"), "admin"), el("ol", "rules", ...info.rules.map((r) => el("li", "", plain(r))))));
  if (info.contact || info.links?.length) {
    const links = (info.links ?? [])
      .filter((l) => SAFE_URL.test(l.url))
      .map((l) => {
        const a = el("a", "link", icon("external"), plain(l.label || l.url));
        a.href = l.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        return a;
      });
    parts.push(el("section", "card", head(t("web.info.contact"), "messages"), info.contact ? el("p", "", plain(info.contact)) : "", links.length ? el("div", "links", ...links) : ""));
  }
  if (parts.length === 2 && !info.address && !op) parts.push(empty("web.info.empty"));
  $("page-info").replaceChildren(el("div", "grid", ...parts));
}

async function editInfo(info) {
  const v = await dialog({
    title: t("web.info.edit"),
    fields: [
      { name: "name", label: t("web.info.f.name"), value: info.name ?? "", maxlength: 40 },
      { name: "about", label: t("web.info.f.about"), type: "textarea", value: info.about ?? "", maxlength: 600 },
      { name: "address", label: t("web.info.f.address"), value: info.address ?? "", maxlength: 80, hint: t("web.info.f.address.hint") },
      { name: "port", label: t("web.info.f.port"), type: "number", value: info.port ?? 19132, min: 1, max: 65535 },
      { name: "rules", label: t("web.info.f.rules"), type: "textarea", value: (info.rules ?? []).join("\n"), hint: t("web.info.f.rules.hint") },
      { name: "contact", label: t("web.info.f.contact"), value: info.contact ?? "", maxlength: 120 },
      { name: "links", label: t("web.info.f.links"), type: "textarea", value: (info.links ?? []).map((l) => l.label + " | " + l.url).join("\n"), hint: t("web.info.f.links.hint") },
    ],
    ok: t("web.save"),
  });
  if (!v) return;
  const links = String(v.links ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const i = line.lastIndexOf("|");
      return i >= 0 ? { label: line.slice(0, i).trim(), url: line.slice(i + 1).trim() } : { label: "", url: line };
    });
  if (links.some((l) => !SAFE_URL.test(l.url))) return toast(t("web.err.bad_url"), "bad");
  await act(
    "admin.info",
    {
      name: v.name,
      about: v.about,
      address: v.address.trim(),
      port: Math.round(Number(v.port) || 19132),
      rules: String(v.rules ?? "").split("\n"),
      contact: v.contact,
      links,
    },
    { after: refresh }
  );
}
