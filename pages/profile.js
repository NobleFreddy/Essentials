/**
 * Anmelden und das eigene Profil.
 *
 * Anmelden: mit Spielername und Passwort - oder mit einem Code aus /link (das erste Mal und wenn
 * das Passwort vergessen ist; danach legt man gleich ein Passwort fest). Hat jemand "Code bei
 * neuem Geraet" an, fragt die Seite nach dem Passwort zusaetzlich nach einem frischen Code.
 *
 * Profil in drei Reitern: Uebersicht (Status, Statistik, was wartet), Postfach, Konto (Passwort,
 * Geraete, Code bei neuem Geraet, Hinweise des Browsers, abmelden, Konto loesen).
 */
import { state, t, loggedIn, login, loginPassword, logout, setPassword, setAccount, sessions, revokeSession, unlinkAccount } from "../core.js";
import { el, $, ago, empty, itemList, button, act, dialog, confirmDialog, toast, tabs, head, avatar } from "../ui.js";
import { icon } from "../icons.js";
import { plain, fill } from "../rawtext.js";
import { refresh, unread, notifyOn, setNotify } from "../app.js";
import { formatStat } from "./public.js";

const B = () => state.me?.bundle ?? null;
const card = (title, iconName, ...body) => el("section", "card", head(title, iconName), ...body);
const say = (key, args) => fill(state.texts[key] ?? key, (args ?? []).map((a) => plain(String(a))));
const PASSWORD_MIN = 8;

// ---------------------------------------------------------------- Anmelden
let loginTab = "password";
let pendingLogin; // { name, password } - wartet auf den Code fuer ein neues Geraet

function loginCard() {
  const box = el("section", "card narrow login");
  const draw = () => {
    const parts = [el("div", "login-head", el("span", "block big", ""), el("h2", "", t("web.login"))), tabs([["password", t("web.login.tab.password")], ["code", t("web.login.tab.code")]], loginTab, (k) => ((loginTab = k), (pendingLogin = undefined), draw()))];
    if (loginTab === "password") parts.push(...passwordForm());
    else parts.push(...codeForm());
    box.replaceChildren(...parts);
    box.querySelector("input")?.focus();
  };
  draw();
  return box;
}

const field = (label, input, hint) => el("label", "field", el("span", "", label), input, hint ? el("small", "muted", hint) : "");
function input(type, { placeholder = "", autocomplete = "", value = "", max = 128 } = {}) {
  const i = el("input");
  i.type = type;
  i.placeholder = placeholder;
  i.autocomplete = autocomplete;
  i.value = value;
  i.maxLength = max;
  return i;
}

function passwordForm() {
  const name = input("text", { autocomplete: "username", value: pendingLogin?.name ?? "", max: 40 });
  const pw = input("password", { autocomplete: "current-password", value: pendingLogin?.password ?? "" });
  const code = pendingLogin ? input("text", { placeholder: "ABC123", autocomplete: "one-time-code", max: 8 }) : undefined;
  const go = async () => {
    try {
      const out = await loginPassword(name.value.trim(), pw.value, code?.value);
      pendingLogin = undefined;
      toast(t("web.login.ok", out.name), "good");
      await refresh(true);
    } catch (err) {
      const reason = err.body?.reason;
      if (reason === "need_code") {
        pendingLogin = { name: name.value.trim(), password: pw.value };
        toast(t("web.login.need_code"), "warn");
        return renderProfile();
      }
      toast(t({ too_many: "web.login.too_many", locked: "web.login.locked", bad_code: "web.login.bad" }[reason] ?? "web.login.bad_password"), "bad");
    }
  };
  const form = el(
    "form",
    "form",
    field(t("web.login.name"), name),
    field(t("web.login.password"), pw),
    code ? field(t("web.login.code"), code, t("web.login.need_code")) : "",
    el("div", "actions", button(t("web.login.go"), () => {}, "primary wide", "key"))
  );
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    go();
  });
  form.querySelector("button").type = "submit";
  return [el("p", "muted", t("web.login.password.text")), form, el("p", "small muted", t("web.login.forgot"))];
}

function codeForm() {
  const code = input("text", { placeholder: "ABC123", autocomplete: "one-time-code", max: 8 });
  code.classList.add("code");
  const go = async () => {
    try {
      const out = await login(code.value);
      toast(t("web.login.ok", out.name), "good");
      await refresh(true);
      // Erstes Mal (oder Passwort vergessen): gleich ein Passwort festlegen
      await passwordDialog({ first: !out.hasPassword, fresh: true });
    } catch (err) {
      toast(t(err.body?.reason === "too_many" ? "web.login.too_many" : "web.login.bad"), "bad");
    }
  };
  const form = el("form", "form", el("div", "code-row", code, button(t("web.login.go"), () => {}, "primary", "key")));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    go();
  });
  form.querySelector("button").type = "submit";
  return [el("p", "muted", t("web.login.text")), el("ol", "steps", el("li", "", t("web.login.step1")), el("li", "", t("web.login.step2")), el("li", "", t("web.login.step3"))), form];
}

/** Passwort festlegen oder aendern. fresh: gerade mit Code angemeldet - das alte braucht es nicht. */
async function passwordDialog({ first = false, fresh = false } = {}) {
  const fields = [];
  if (!first && !fresh) fields.push({ name: "old", label: t("web.account.pw.old"), type: "password" });
  fields.push({ name: "pw", label: t("web.account.pw.new"), type: "password", hint: t("web.account.pw.rules", PASSWORD_MIN) }, { name: "pw2", label: t("web.account.pw.repeat"), type: "password" });
  const v = await dialog({ title: t(first ? "web.account.pw.set" : "web.account.pw.change"), text: first ? t("web.account.pw.first") : "", fields, ok: t("web.save") });
  if (!v) return;
  if (v.pw !== v.pw2) return toast(t("web.account.pw.mismatch"), "bad");
  if (v.pw.length < PASSWORD_MIN) return toast(t("web.account.pw.short", PASSWORD_MIN), "bad");
  try {
    await setPassword(v.pw, v.old);
    toast(t("web.account.pw.saved"), "good");
    await refresh(true);
  } catch (err) {
    toast(t({ bad_old: "web.account.pw.bad_old", weak_password: "web.account.pw.weak" }[err.body?.reason] ?? "web.err.error"), "bad");
  }
}

// ---------------------------------------------------------------- Profil
let profileTab = "overview";
let deviceList; // zuletzt geholte Sitzungen

export function renderProfile() {
  if (state.mode !== "local") return $("page-profile").replaceChildren(card(t("web.login"), "key", empty("web.login.local_only")));
  if (!loggedIn()) return $("page-profile").replaceChildren(loginCard());
  const me = state.me;
  const b = B();
  const counts = unread();
  const hero = el(
    "section",
    "card wide profile-hero",
    avatar(me?.name ?? "?", 64),
    el(
      "div",
      "",
      el("h2", "", plain(me?.name ?? "")),
      el("div", "tags", b ? el("span", b.online ? "tag good" : "tag", b.online ? t("web.online") : t("web.offline.player")) : "", b?.op ? el("span", "tag warn", "⚑ " + t("web.profile.op")) : "", b?.clan ? el("span", "tag", "[" + plain(b.clan.tag) + "] " + plain(b.clan.name)) : "")
    )
  );
  const bar = tabs(
    [
      ["overview", t("web.profile.tab.overview")],
      ["mail", t("web.mail"), counts.mail],
      ["account", t("web.profile.tab.account"), state.me?.account?.hasPassword ? 0 : "!"],
    ],
    profileTab,
    (k) => {
      profileTab = k;
      renderProfile();
    }
  );
  let body;
  if (!b && profileTab !== "account") body = [card(t("web.profile"), "profile", el("p", "muted", t("web.profile.waiting")))];
  else body = { overview: overviewTab, mail: mailTab, account: accountTab }[profileTab](b);
  $("page-profile").replaceChildren(el("div", "grid", hero, el("div", "wide", bar), ...body));
}

function overviewTab(b) {
  const parts = [];
  if (!state.me?.account?.hasPassword)
    parts.push(el("section", "card wide cta warn", el("p", "", icon("key"), " ", t("web.account.pw.missing")), button(t("web.account.pw.set"), () => passwordDialog({ first: true, fresh: state.me.account.fresh }), "primary")));
  if (b.queued?.length) parts.push(card(t("web.profile.queued"), "bell", el("ul", "news", ...b.queued.map((q) => el("li", "", el("time", "", ago(Date.now() - q.at)), el("span", "", t("web.cmd.type." + q.type.replace(/\./g, "_"))))))));
  if (b.stats)
    parts.push(
      el(
        "section",
        "card wide",
        head(t("web.profile.stats"), "ranks"),
        el("div", "stat-grid", ...Object.entries(b.stats).map(([k, v]) => el("div", "stat-tile", el("b", "", formatStat(k, v.value)), el("span", "", plain(t("stats.key." + k))), v.rank ? el("small", "muted", "#" + v.rank) : "")))
      )
    );
  if (!parts.length) parts.push(card(t("web.profile"), "profile", empty("web.profile.nothing")));
  return parts;
}

function mailTab(b) {
  const mail = b.mail;
  return [
    el(
      "section",
      "card wide",
      head(t("web.mail"), "gift", mail?.items?.length ? button(t("web.mail.claim"), () => act("mail.claim", {}, { after: refresh }), "primary small") : ""),
      mail?.items?.length ? itemList(mail.items) : empty("web.mail.empty"),
      mail?.events?.length ? el("ul", "news", ...[...mail.events].reverse().map((e) => el("li", "", el("time", "", ago(Date.now() - e.at)), el("span", "", say(e.key, e.args))))) : ""
    ),
  ];
}

function accountTab() {
  const acc = state.me?.account ?? {};
  const parts = [];
  // Passwort
  parts.push(
    card(
      t("web.account.security"),
      "key",
      el("div", "row", el("span", "", t("web.account.pw")), acc.hasPassword ? el("span", "tag good", t("web.account.pw.is_set")) : el("span", "tag warn", t("web.account.pw.not_set"))),
      el("div", "actions", button(t(acc.hasPassword ? "web.account.pw.change" : "web.account.pw.set"), () => passwordDialog({ first: !acc.hasPassword, fresh: acc.fresh }), "primary small")),
      toggleRow(t("web.account.need_code"), t("web.account.need_code.hint"), !!acc.needCode, !acc.hasPassword, async (on) => {
        try {
          await setAccount({ needCode: on });
          toast(t(on ? "web.account.need_code.on" : "web.account.need_code.off"), "good");
        } catch {
          toast(t("web.err.error"), "bad");
        }
        await refresh(true);
      })
    )
  );
  // Hinweise
  parts.push(
    card(
      t("web.notify"),
      "bell",
      toggleRow(t("web.notify.toggle"), t("web.notify.hint"), notifyOn(), false, async (on) => {
        await setNotify(on);
        renderProfile();
      })
    )
  );
  // Geraete
  const list = el("ul", "members devices", el("li", "", el("span", "muted", t("web.loading"))));
  const showDevices = (rows) => {
    deviceList = rows;
    list.replaceChildren(
      ...rows.map((s) =>
        el(
          "li",
          s.current ? "current" : "",
          el("span", "who", icon("device"), el("b", "", plain(s.label)), s.current ? el("span", "tag good", t("web.account.this_device")) : "", el("small", "muted", t("web.account.device.used", ago(Date.now() - s.used)) + " · " + t(s.via === "password" ? "web.account.via.password" : "web.account.via.code"))),
          s.current ? "" : button(t("web.logout"), async () => (await revokeSession({ sid: s.sid }), loadDevices()), "ghost small")
        )
      )
    );
  };
  const loadDevices = () => sessions().then(showDevices, () => list.replaceChildren(empty("web.err.error")));
  if (deviceList) showDevices(deviceList);
  loadDevices();
  parts.push(
    el(
      "section",
      "card",
      head(t("web.account.devices"), "device", button(t("web.account.others"), async () => {
        if (!(await confirmDialog(t("web.account.others"), t("web.account.others.confirm"), t("web.account.others"), true))) return;
        const out = await revokeSession({ others: true });
        toast(t("web.account.others.done", out.count ?? 0), "good");
        loadDevices();
      }, "ghost small")),
      list
    )
  );
  // Abmelden und loesen
  parts.push(
    card(
      t("web.account.leave"),
      "logout",
      el(
        "div",
        "actions wrap",
        button(t("web.logout"), async () => {
          await logout(false);
          await refresh(true);
        }, "ghost", "logout"),
        button(t("web.logout.all"), async () => {
          if (!(await confirmDialog(t("web.logout.all"), t("web.logout.all.confirm"), t("web.logout.all"), true))) return;
          await logout(true);
          await refresh(true);
        }, "ghost"),
        button(t("web.account.unlink"), async () => {
          if (!(await confirmDialog(t("web.account.unlink"), t("web.account.unlink.confirm"), t("web.account.unlink"), true))) return;
          await unlinkAccount();
          toast(t("web.account.unlink.done"), "good");
          await refresh(true);
        }, "danger")
      )
    )
  );
  return parts;
}

/** Ein Schalter mit Erklaerung. */
function toggleRow(label, hint, on, disabled, onChange) {
  const box = el("input");
  box.type = "checkbox";
  box.checked = on;
  box.disabled = disabled;
  box.addEventListener("change", () => onChange(box.checked));
  return el("label", "switch-row" + (disabled ? " disabled" : ""), el("span", "", el("b", "", label), el("small", "muted", hint)), el("span", "switch", box, el("i")));
}
