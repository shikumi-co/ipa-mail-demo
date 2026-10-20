// IPA楽々メール送信 モック。画面はハッシュ（#/properties など）で切り替える。状態はメモリ上だけ（再読み込みで data.js の値に戻る）。
// 仕様: docs/MOCK_SPEC.md。見た目は bukken-mail の docs/DESIGN.md（色の意味の名前・部品の形・左のナビ）
"use strict";

/* ------------------------------------------------------------------ 状態 */

const D = JSON.parse(JSON.stringify(window.MOCK_DATA));
const PREFS_ALL = ["北海道", "宮城県", "東京都", "神奈川県", "埼玉県", "千葉県", "愛知県", "京都府", "大阪府", "兵庫県", "福岡県"];
const STRUCTURES = ["RC", "SRC", "S", "木造"];
const KINDS = ["一棟マンション", "一棟アパート", "区分", "戸建", "土地"];
/** レインズの PDF から読み取った体の見本（モック。本番は Claude が PDF を読んで項目に起こし、確信の低い項目は「要確認」にする） */
const PDF_SAMPLES = [
  { name: "（例）蒲田五丁目アパート", kind: "一棟アパート", pref: "東京都", city: "大田区", addr: "蒲田5-10-3", structure: "木造", year: 2008, uncertain: ["addr"] },
  { name: "（例）天神南レジデンス", kind: "一棟マンション", pref: "福岡県", city: "福岡市中央区", addr: "渡辺通2-4-6", structure: "RC", year: 2015, uncertain: [] },
  { name: "（例）堺筋本町ビル 5F", kind: "区分", pref: "大阪府", city: "大阪市中央区", addr: "本町1-3-9", structure: "SRC", year: 1998, uncertain: ["structure"] },
];
const PDF_FIELD_LABELS = { name: "物件名", kind: "種別", pref: "都道府県", city: "市区町村", addr: "番地", structure: "構造", year: "築年数" };
function nextPropertyId() { return `p${String(D.properties.length + 1).padStart(2, "0")}`; }
function driveFolder() { return `物件概要書 / ${D.today.slice(0, 7)}`; }
/** PDF を受け取った体で「読み取り中」→ 項目を埋めた登録フォームへ（1.4 秒の待ちは本番の読み取りの代わり） */
function startPdfReading(fileName, size, sample) {
  const id = nextPropertyId();
  const driveId = `1MOCK${id}${String(Math.abs(hashStr(fileName))).padStart(6, "0")}`;
  ui.propNew = { stage: "reading", fileName, size, sample, extracted: null, docUrl: "", driveId };
  render();
  setTimeout(() => {
    if (ui.propNew.stage !== "reading") return;
    ui.propNew.extracted = PDF_SAMPLES[sample];
    ui.propNew.docUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;
    ui.propNew.stage = "form";
    render();
  }, 1400);
}
function hashStr(str) { let h = 0; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; }
function fmtSize(bytes) { return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }
const PRICE_STEPS = [1000, 3000, 5000, 10000, 20000, 30000, 50000, 80000, 100000];
const YIELD_STEPS = [4, 5, 6, 7, 8, 9, 10];
const YEAR_STEPS = [1981, 1990, 2000, 2010, 2015, 2020];

// 新しく起きたこと（送信・問合せ・LINE・変更）の時刻。モックの「今」から 1 分ずつ進める
let clockMin = 0;
function now() {
  const d = new Date(D.today);
  d.setMinutes(d.getMinutes() + ++clockMin);
  return toLocal(d);
}
function toLocal(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// LINE の友だち追加を、どの配信のメールから来たかに結ぶ（初期データ: 追加した日より前の、その人が宛先に入っている最後の送信済みの配信）
D.lineEvents = D.contacts
  .filter((c) => c.line.linked)
  .map((c) => {
    const m = D.campaigns
      .filter((m) => m.status === "sent" && m.sentAt <= c.line.at && m.recipients.some((r) => r.contactId === c.id))
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0];
    return { contactId: c.id, campaignId: m ? m.id : null, at: c.line.at };
  });

// 配信の作成（4 段）の途中の状態
let wizard = null;
function newWizard(propertyIds = [], from = null) {
  const base = from || {};
  ui.wizPropQuery = "";
  return {
    step: 1,
    propertyIds: [...propertyIds],
    mode: "auto",
    filters: { areas: [], price: "", yieldMin: "", yearMin: "", structures: [], tags: [] },
    excluded: new Set(),
    manualPicked: null,
    subject: base.subject || "",
    body: base.body || "いつもお世話になっております。\n新しく入った物件をご案内します。ご希望の条件に合うものを下にまとめました。\n気になる物件があれば、物件ごとの「この物件を問い合わせる」からお気軽にどうぞ。",
    previewContactId: null,
    scheduleAt: "2026-10-21T10:00",
    draftId: base.id || null,
  };
}

// 画面ごとの小さな状態（並べ替え・絞り込み・LINE の段など）
const ui = {
  propSort: "new",
  propArea: "",
  propStructure: "",
  contactQuery: "",
  wizPropQuery: "",
  campaignQuery: "",
  propNew: { stage: "upload", fileName: "", size: 0, sample: 0, extracted: null, docUrl: "", driveId: "" },
  contactArea: "",
  contactLine: "",
  lineStep: {},
  done: {},
  navOpen: false,
};

/* ------------------------------------------------------------------ 引く・数える */

const byId = (list, id) => list.find((x) => x.id === id);
const prop = (id) => byId(D.properties, id);
const contact = (id) => byId(D.contacts, id);
const campaign = (id) => byId(D.campaigns, id);
const owner = (id) => byId(D.owners, id);

/** 顧客の希望条件に物件が合うか */
function matches(c, p) {
  const f = c.prefs;
  return (
    (f.areas.length === 0 || f.areas.includes(p.pref)) &&
    (f.priceMin == null || p.price >= f.priceMin) &&
    (f.priceMax == null || p.price <= f.priceMax) &&
    (f.yieldMin == null || p.yield >= f.yieldMin) &&
    (f.yearMin == null || p.year == null || p.year >= f.yearMin) &&
    (f.structures.length === 0 || (p.structure != null && f.structures.includes(p.structure)))
  );
}
const matchingProps = (c, propIds) => propIds.map(prop).filter((p) => p && matches(c, p));
const matchingContacts = (p) => D.contacts.filter((c) => !c.unsubscribed && matches(c, p));

function campaignStats(m) {
  const sent = m.status === "sent" ? m.recipients.length : 0;
  const opened = m.recipients.filter((r) => r.openedAt).length;
  const inquiries = D.inquiries.filter((q) => q.campaignId === m.id).length;
  const lines = D.lineEvents.filter((e) => e.campaignId === m.id).length;
  const rate = sent ? Math.round((opened / sent) * 100) : null;
  const followups = D.followups.filter((f) => f.campaignId === m.id && f.status === "scheduled");
  return { sent, opened, inquiries, lines, rate, followups };
}

/** 顧客ごとの開封（送信済みの配信をまたいで） */
function contactOpens(c) {
  const rows = D.campaigns
    .filter((m) => m.status === "sent")
    .map((m) => ({ m, r: m.recipients.find((r) => r.contactId === c.id) }))
    .filter((x) => x.r)
    .sort((a, b) => b.m.sentAt.localeCompare(a.m.sentAt));
  const opened = rows.filter((x) => x.r.openedAt).length;
  let streak = 0;
  for (const x of rows) {
    if (x.r.openedAt) break;
    streak++;
  }
  return { rows, sent: rows.length, opened, rate: rows.length ? Math.round((opened / rows.length) * 100) : null, unopenedStreak: streak };
}

/* ------------------------------------------------------------------ 表示の小物 */

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}
const yen = (man) => (man == null ? "-" : `${Number(man).toLocaleString("ja-JP")} 万円`);
const pct = (v) => (v == null ? "-" : `${Number(v).toFixed(1)}%`);
function dt(s) {
  if (!s) return "-";
  const [d, t] = s.split("T");
  const [, mo, da] = d.split("-");
  return `${Number(mo)}/${Number(da)} ${t || ""}`.trim();
}
const dateOnly = (s) => (s ? s.slice(0, 10).replaceAll("-", "/") : "-");

function icon(name, size = 16, cls = "") {
  return `<i data-lucide="${name}" width="${size}" height="${size}" class="${cls} shrink-0" aria-hidden="true"></i>`;
}

const BTN = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-surface-subtle",
  outline: "bg-surface text-primary border border-primary hover:bg-primary-subtle",
  ghost: "text-ink-soft hover:bg-surface-subtle",
  danger: "bg-danger text-white hover:bg-danger-hover",
  line: "bg-line_app text-white hover:opacity-90",
};
const SIZE = { sm: "h-8 px-3 text-xs", md: "h-9 px-4 text-sm", lg: "h-12 px-6 text-base" };
function btnClass(variant = "secondary", size = "md", extra = "") {
  return `inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none ${BTN[variant]} ${SIZE[size]} ${extra}`;
}
/** ボタン。href ならリンク、action なら data-action（クリックで actions[action]） */
function btn(label, { variant = "secondary", size = "md", href, action, data = {}, iconName, extra = "", type = "button", disabled = false } = {}) {
  const inner = `${iconName ? icon(iconName, size === "lg" ? 18 : 16) : ""}${esc(label)}`;
  const attrs = Object.entries(data)
    .map(([k, v]) => `data-${k}="${esc(v)}"`)
    .join(" ");
  if (href) return `<a href="${esc(href)}" class="${btnClass(variant, size, extra)}" ${attrs}>${inner}</a>`;
  return `<button type="${type}" class="${btnClass(variant, size, extra)}" ${action ? `data-action="${action}"` : ""} ${attrs} ${disabled ? "disabled" : ""}>${inner}</button>`;
}

const TONE = {
  neutral: "bg-surface-subtle text-ink-soft border-line",
  brand: "bg-primary-subtle text-primary border-primary-muted",
  success: "bg-success-subtle text-success border-success-line",
  warning: "bg-warning-subtle text-warning border-warning-line",
  danger: "bg-danger-subtle text-danger border-danger-line",
  info: "bg-info-subtle text-info border-info-line",
};
function badge(text, tone = "neutral", dot = false) {
  return `<span class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONE[tone]}">${dot ? '<span class="h-1.5 w-1.5 rounded-full bg-current"></span>' : ""}${esc(text)}</span>`;
}
const CAMPAIGN_STATUS = { sent: ["送信済み", "success"], scheduled: ["予約", "info"], draft: ["下書き", "neutral"] };
const campaignBadge = (m) => badge(CAMPAIGN_STATUS[m.status][0], CAMPAIGN_STATUS[m.status][1], true);

function card(inner, cls = "p-6") {
  return `<section class="rounded-xl border border-line bg-surface shadow-sm ${cls}">${inner}</section>`;
}
function cardHeader(title, { description = "", action = "" } = {}) {
  return `<div class="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4"><div class="min-w-0"><h2 class="text-sm font-bold text-ink">${esc(title)}</h2>${description ? `<p class="mt-0.5 text-xs text-muted">${description}</p>` : ""}</div>${action ? `<div class="flex flex-wrap gap-2">${action}</div>` : ""}</div>`;
}
function pageHeader(title, { description = "", actions = "", back = null } = {}) {
  return `<div class="mb-6">${back ? `<a href="${back.href}" class="mb-2 inline-flex items-center gap-0.5 text-sm font-medium text-primary hover:underline">${icon("chevron-left")}${esc(back.label)}</a>` : ""}
    <div class="flex flex-wrap items-end justify-between gap-3"><div class="min-w-0"><h1 class="text-2xl font-bold text-ink">${esc(title)}</h1>${description ? `<p class="mt-1 text-sm text-muted">${description}</p>` : ""}</div>${actions ? `<div class="flex flex-wrap gap-2">${actions}</div>` : ""}</div></div>`;
}
/** 画面の上の帯「このモックで確かめること」 */
function mockBand(text, req) {
  return `<div class="mb-5 flex items-start gap-2 rounded-lg border border-info-line bg-info-subtle px-3.5 py-2.5 text-sm text-info">${icon("lightbulb", 16, "mt-0.5")}<p><span class="font-bold">このモックで確かめること${req ? `（要望 ${req}）` : ""}:</span> ${text}</p></div>`;
}
function note(text, tone = "warning") {
  return `<div class="rounded-lg border border-${tone}-line bg-${tone}-subtle px-3.5 py-2.5 text-sm text-${tone}">${text}</div>`;
}
/** 表（DESIGN.md: TableCard の中を overflow-x-auto で包む） */
function table(headers, rows, { minW = "min-w-[640px]", empty = "まだありません" } = {}) {
  const th = headers.map((h) => `<th class="px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap text-muted ${h.cls || ""}">${h.label}</th>`).join("");
  const body = rows.length
    ? rows.map((r) => `<tr class="border-t border-line hover:bg-surface-subtle/60">${r.map((c, i) => `<td class="px-4 py-3 align-top text-sm ${headers[i]?.td || ""}">${c}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${headers.length}" class="px-4 py-10 text-center text-sm text-muted">${empty}</td></tr>`;
  return `<div class="overflow-hidden rounded-xl border border-line bg-surface shadow-sm"><div class="overflow-x-auto"><table class="w-full ${minW} border-collapse"><thead class="bg-surface-subtle"><tr>${th}</tr></thead><tbody>${body}</tbody></table></div></div>`;
}
const FIELD = "w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
function field(label, inner, hint = "") {
  return `<label class="block"><span class="mb-1 block text-xs font-bold text-ink-soft">${label}</span>${inner}${hint ? `<span class="mt-1 block text-xs text-muted">${hint}</span>` : ""}</label>`;
}
/** チップ・チェックの並びのように、中に押せるものが複数ある欄（label で包むと見出しを押したときに最初のものが押される） */
function group(label, inner) {
  return `<div role="group" aria-label="${esc(label)}"><span class="mb-1 block text-xs font-bold text-ink-soft">${label}</span>${inner}</div>`;
}
function select(name, options, value, { cls = "", data = "" } = {}) {
  return `<select name="${name}" class="${FIELD} h-9 ${cls}" ${data}>${options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value ?? "") ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
}
const linkName = (href, text) => `<a href="${href}" class="font-bold text-ink hover:text-primary hover:underline">${esc(text)}</a>`;
function kpi(label, value, sub = "", iconName = "") {
  return card(`<div class="flex items-center gap-2 text-xs font-medium text-muted">${iconName ? icon(iconName, 16, "text-primary") : ""}${esc(label)}</div><div class="mt-2 text-display font-bold tabular-nums text-ink">${value}</div>${sub ? `<div class="mt-1 text-xs text-muted">${sub}</div>` : ""}`, "p-5");
}

function prefsSummary(f) {
  const parts = [];
  parts.push(f.areas.length ? f.areas.join("・") : "エリア指定なし");
  if (f.priceMin != null || f.priceMax != null) parts.push(`${f.priceMin != null ? yen(f.priceMin) : ""}〜${f.priceMax != null ? yen(f.priceMax) : ""}`);
  if (f.yieldMin != null) parts.push(`利回り ${pct(f.yieldMin)}以上`);
  if (f.yearMin != null) parts.push(`${f.yearMin} 年以降`);
  if (f.structures.length) parts.push(f.structures.join("・"));
  return parts.join(" ／ ");
}
/** 自動で選んだ理由（1 行） */
function reasonLine(c, propIds) {
  const ps = matchingProps(c, propIds);
  if (!ps.length) return "";
  return `合う物件: ${ps.map((p) => p.name.replace("（例）", "")).join("・")}（希望: ${prefsSummary(c.prefs)}）`;
}

/* ------------------------------------------------------------------ 外枠 */

// 左のナビの「顧客が見る画面」の見本: 福岡の配信（m3）の宛先で、まだ開いていない・LINE 未連携の人（開くと開封が記録され、LINE も試せる）
const SAMPLE = (() => {
  const m = D.campaigns.find((x) => x.id === "m3");
  const r = m.recipients.find((x) => !x.openedAt && !contact(x.contactId).line.linked) || m.recipients[0];
  return { m: m.id, c: r.contactId };
})();

const NAV = [
  { group: "業務", items: [
    { href: "#/", label: "ダッシュボード", icon: "layout-dashboard", match: (r) => r === "" },
    { href: "#/properties", label: "物件", icon: "building-2", match: (r) => r.startsWith("properties") },
    { href: "#/contacts", label: "顧客", icon: "users", match: (r) => r.startsWith("contacts") },
    { href: "#/campaigns", label: "配信", icon: "send", match: (r) => r.startsWith("campaigns") },
    { href: "#/opens", label: "開封の状況", icon: "mail-open", match: (r) => r.startsWith("opens") },
  ] },
  { group: "管理", items: [{ href: "#/settings", label: "設定", icon: "settings", match: (r) => r.startsWith("settings") }] },
  { group: "顧客が見る画面（モック）", items: [
    { href: `#/mail/${SAMPLE.m}/${SAMPLE.c}`, label: "届くメール", icon: "mail", match: (r) => r.startsWith("mail") },
    { href: `#/prefs/${SAMPLE.c}?m=${SAMPLE.m}`, label: "希望条件の変更", icon: "sliders-horizontal", match: (r) => r.startsWith("prefs") },
    { href: `#/line/${SAMPLE.c}?m=${SAMPLE.m}`, label: "LINE 友だち追加", icon: "message-circle", match: (r) => r.startsWith("line") },
  ] },
];

function navHtml(route) {
  return NAV.map((g) => `<div class="mt-5 first:mt-2"><div class="px-3 pb-1 text-2xs font-bold tracking-wide text-faint">${esc(g.group)}</div>${g.items
    .map((it) => {
      const on = it.match(route);
      return `<a href="${it.href}" class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${on ? "bg-primary-subtle text-primary" : "text-ink-soft hover:bg-surface-subtle"}" ${on ? 'aria-current="page"' : ""}>${icon(it.icon, 18)}${esc(it.label)}</a>`;
    })
    .join("")}</div>`).join("");
}
const LOGO = `<a href="#/" class="flex items-center gap-2"><span class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">${icon("mail", 18)}</span><span class="text-base font-bold text-ink">IPA<span class="text-primary">楽々</span>メール送信</span></a>`;

function shell(route, content) {
  return `<div class="min-h-screen md:flex">
    <aside class="hidden w-60 shrink-0 border-r border-line bg-surface md:block"><div class="sticky top-0 flex h-screen flex-col"><div class="px-5 py-5">${LOGO}</div><nav class="flex-1 overflow-y-auto px-3 pb-6">${navHtml(route)}</nav>
      <div class="border-t border-line px-5 py-3 text-xs text-muted">モック（偽データ・保存しません）<br><button data-action="reset" class="mt-1 text-primary hover:underline">最初の状態に戻す</button></div></div></aside>
    <div class="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">${LOGO}<button data-action="nav" class="${btnClass("ghost", "sm")}" aria-label="メニュー" aria-expanded="${ui.navOpen}">${icon(ui.navOpen ? "x" : "menu", 18)}</button></div>
    ${ui.navOpen ? `<div class="border-b border-line bg-surface px-3 pb-4 md:hidden">${navHtml(route)}</div>` : ""}
    <main class="min-w-0 flex-1"><div class="mx-auto max-w-screen-2xl px-4 py-5 md:px-8 md:py-8">${content}</div></main></div>`;
}

/** 顧客が見る画面（メール・フォーム）。管理画面のナビは出さない */
function publicShell(content, back = "#/") {
  return `<div class="min-h-screen bg-[#eef1f5]"><div class="bg-ink px-4 py-2 text-xs text-white"><div class="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2"><span class="inline-flex items-center gap-1.5">${icon("eye", 14)}顧客が見る画面のモック（本番ではメールやブラウザで開きます）</span><a href="${back}" class="inline-flex items-center gap-1 font-medium underline">${icon("arrow-left", 14)}管理画面に戻る</a></div></div>
    <div class="mx-auto max-w-3xl px-4 py-6">${content}</div></div>`;
}

/* ------------------------------------------------------------------ 画面: ダッシュボード */

function viewDashboard() {
  const published = D.properties.filter((p) => p.published).length;
  const lineLinked = D.contacts.filter((c) => c.line.linked).length;
  const sent = D.campaigns.filter((m) => m.status === "sent").sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const totalSent = sent.reduce((n, m) => n + m.recipients.length, 0);
  const totalOpened = sent.reduce((n, m) => n + m.recipients.filter((r) => r.openedAt).length, 0);
  const today = D.today.slice(0, 10);
  const tomorrow = toLocal(new Date(new Date(D.today).getTime() + 86400000)).slice(0, 10);
  const schedules = [
    ...D.campaigns.filter((m) => m.status === "scheduled").map((m) => ({ at: m.scheduledAt, label: `${m.no} ${m.subject}`, href: `#/campaigns/${m.id}`, kind: "配信" })),
    ...D.followups.filter((f) => f.status === "scheduled").map((f) => ({ at: f.at, label: `${f.no} ${f.subject}`, href: `#/campaigns/${f.campaignId}`, kind: `再配信（${FOLLOWUP_TARGETS[f.target]}）` })),
  ].filter((s) => s.at.slice(0, 10) === today || s.at.slice(0, 10) === tomorrow).sort((a, b) => a.at.localeCompare(b.at));
  const openInq = D.inquiries.filter((q) => q.status === "未対応");

  return pageHeader("ダッシュボード", { description: `今日 ${dateOnly(D.today)}（モックの日付）`, actions: btn("新規配信", { variant: "primary", href: "#/campaigns/new", iconName: "plus" }) }) +
    mockBand("物件・顧客の数、直近の配信の開封率、今日と明日の予約、未対応の問合せが 1 画面で分かるか") +
    `<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      ${kpi("物件", `${D.properties.length}`, `配信に使える ${published} 件`, "building-2")}
      ${kpi("顧客", `${D.contacts.length}`, `LINE 連携 ${lineLinked} 人`, "users")}
      ${kpi("開封率（送信済み）", totalSent ? `${Math.round((totalOpened / totalSent) * 100)}%` : "-", `${totalOpened} / ${totalSent} 通`, "mail-open")}
      ${kpi("未対応の問合せ", `${openInq.length}`, `全 ${D.inquiries.length} 件`, "message-square")}
    </div>
    <div class="mt-6 grid gap-4 lg:grid-cols-3">
      <div class="min-w-0 lg:col-span-2">${card(cardHeader("直近の配信", { action: btn("すべて見る", { size: "sm", href: "#/campaigns" }) }) +
        `<div class="overflow-x-auto"><table class="w-full min-w-[560px]"><thead class="bg-surface-subtle"><tr>${["件名", "送信日時", "送信数", "開封率", "問合せ"].map((h) => `<th class="px-4 py-2 text-left text-xs font-medium text-muted whitespace-nowrap">${h}</th>`).join("")}</tr></thead><tbody>${sent
          .slice(0, 4)
          .map((m) => {
            const s = campaignStats(m);
            return `<tr class="border-t border-line"><td class="max-w-[300px] truncate px-4 py-3 text-sm" title="${esc(m.subject)}">${noTag(m.no, "mr-1.5")}${linkName(`#/campaigns/${m.id}`, m.subject)}</td><td class="px-4 py-3 text-sm whitespace-nowrap tabular-nums">${dt(m.sentAt)}</td><td class="px-4 py-3 text-sm tabular-nums">${s.sent}</td><td class="px-4 py-3 text-sm whitespace-nowrap tabular-nums">${rateBar(s.rate)}</td><td class="px-4 py-3 text-sm tabular-nums">${s.inquiries}</td></tr>`;
          })
          .join("")}</tbody></table></div>`, "p-0")}</div>
      <div class="flex min-w-0 flex-col gap-4">
        ${card(cardHeader("今日・明日の予約") + `<ul class="divide-y divide-line">${schedules.length ? schedules.map((s) => `<li class="px-5 py-3"><div class="flex items-center gap-2 text-xs text-muted">${icon("clock", 14)}<span class="tabular-nums">${dt(s.at)}</span>${badge(s.kind, "info")}</div><a href="${s.href}" class="mt-1 block truncate text-sm font-medium text-ink hover:text-primary hover:underline">${esc(s.label)}</a></li>`).join("") : '<li class="px-5 py-6 text-sm text-muted">予約はありません</li>'}</ul>`, "p-0")}
        ${card(cardHeader("未対応の問合せ") + `<ul class="divide-y divide-line">${openInq.length ? openInq.map((q) => inquiryItem(q)).join("") : '<li class="px-5 py-6 text-sm text-muted">ありません</li>'}</ul>`, "p-0")}
      </div>
    </div>`;
}
function rateBar(rate) {
  if (rate == null) return '<span class="text-muted">-</span>';
  return `<span class="inline-flex items-center gap-2"><span class="h-1.5 w-16 overflow-hidden rounded-full bg-surface-subtle"><span class="block h-full rounded-full bg-primary" style="width:${rate}%"></span></span>${rate}%</span>`;
}
function inquiryItem(q) {
  const c = contact(q.contactId);
  const p = prop(q.propertyId);
  return `<li class="px-5 py-3"><div class="flex flex-wrap items-center gap-2 text-xs text-muted"><span class="tabular-nums">${dt(q.at)}</span>${badge(q.status, q.status === "未対応" ? "warning" : q.status === "対応中" ? "info" : "success")}</div>
    <div class="mt-1 text-sm">${linkName(`#/contacts/${c.id}`, c.name)} <span class="text-muted">→</span> <a href="#/properties/${p.id}" class="text-sm text-primary hover:underline">${esc(p.name)}</a></div><p class="mt-0.5 text-xs text-ink-soft">${esc(q.message)}</p></li>`;
}

/* ------------------------------------------------------------------ 画面: 物件 */

function viewProperties() {
  let list = D.properties.slice();
  if (ui.propArea) list = list.filter((p) => p.pref === ui.propArea);
  if (ui.propStructure) list = list.filter((p) => p.structure === ui.propStructure);
  const sorters = {
    new: (a, b) => b.createdAt.localeCompare(a.createdAt),
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    "yield-desc": (a, b) => b.yield - a.yield,
    "year-desc": (a, b) => (b.year ?? 0) - (a.year ?? 0),
  };
  list.sort(sorters[ui.propSort]);
  const areas = [...new Set(D.properties.map((p) => p.pref))];
  return pageHeader("物件", { description: "配信する物件の一覧。概要書の PDF は Google ドライブに置き、メールにはダウンロード URL を入れます", actions: btn("物件を登録", { variant: "primary", href: "#/properties/new", iconName: "plus" }) }) +
    mockBand("物件の項目（所在地・価格・利回り・築年・構造・種別・概要書の URL）と、価格・利回り・築年での並べ替え、エリア・構造での絞り込み", "1") +
    `<div class="mb-4 flex flex-wrap items-center gap-2">
      ${select("propArea", [["", "エリア: すべて"], ...areas.map((a) => [a, a])], ui.propArea, { cls: "!w-auto", data: 'data-change="propArea"' })}
      ${select("propStructure", [["", "構造: すべて"], ...STRUCTURES.map((s) => [s, s])], ui.propStructure, { cls: "!w-auto", data: 'data-change="propStructure"' })}
      ${select("propSort", [["new", "並べ替え: 登録の新しい順"], ["price-asc", "価格の安い順"], ["price-desc", "価格の高い順"], ["yield-desc", "利回りの高い順"], ["year-desc", "築年の新しい順"]], ui.propSort, { cls: "!w-auto", data: 'data-change="propSort"' })}
      <span class="text-sm text-muted tabular-nums">${list.length} 件</span>
    </div>` +
    table(
      [{ label: "物件名" }, { label: "所在地" }, { label: "種別" }, { label: "構造", td: "whitespace-nowrap" }, { label: "築年", td: "whitespace-nowrap tabular-nums" }, { label: "価格", td: "whitespace-nowrap tabular-nums" }, { label: "利回り", td: "whitespace-nowrap tabular-nums" }, { label: "配信", td: "whitespace-nowrap" }, { label: "合う顧客", td: "whitespace-nowrap tabular-nums" }],
      list.map((p) => [linkName(`#/properties/${p.id}`, p.name), `${esc(p.pref)} ${esc(p.city)}`, esc(p.kind), esc(p.structure || "-"), p.year ? `${p.year} 年` : "-", yen(p.price), pct(p.yield), p.published ? badge("使える", "success", true) : badge("使わない", "neutral", true), `${matchingContacts(p).length} 人`]),
      { minW: "min-w-[900px]" },
    );
}

function viewPropertyNew() {
  const st = ui.propNew;
  const head = pageHeader("物件を登録", { back: { href: "#/properties", label: "物件の一覧" } }) +
    mockBand("レインズの PDF を上げるだけで、物件名・種別・都道府県・市区町村・番地・構造・築年数が自動で入り、Google ドライブのダウンロード URL ができるか。価格・利回りも PDF から読み取るかは要確認", "1");
  if (st.stage === "upload") {
    return head + card(`<div class="flex flex-col items-center gap-3 py-6 text-center" data-dropzone>
        <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-subtle text-primary">${icon("file-up", 28)}</span>
        <h2 class="text-base font-bold">レインズの物件概要書（PDF）をここにドロップ</h2>
        <p class="text-sm text-ink-soft">または <label class="cursor-pointer font-bold text-primary hover:underline">ファイルを選ぶ<input type="file" accept="application/pdf,.pdf" data-change="propPdf" class="sr-only"></label></p>
        <p class="max-w-md text-xs text-muted">上げた PDF は Google ドライブ（${esc(driveFolder())}）に保存され、ダウンロード URL が自動で作られます。PDF から 物件名・種別・都道府県・市区町村・番地・構造・築年数 を読み取って、登録の項目に入れます。</p>
        <div class="mt-2 flex flex-wrap justify-center gap-2">${PDF_SAMPLES.map((x, i) => btn(`見本の PDF で試す（${x.pref}）`, { action: "prop-pdf-sample", data: { i }, iconName: "file-text", size: "sm" })).join("")}</div>
        <p class="text-xs text-muted">※ モックなので、どんな PDF を選んでも見本の項目が入ります。ファイルはどこにも送られません</p>
      </div>`, "p-6 border-2 border-dashed border-line-strong");
  }
  if (st.stage === "reading") {
    return head + card(`<div class="flex flex-col items-center gap-3 py-10 text-center">
        <span class="h-8 w-8 animate-spin rounded-full border-4 border-primary-muted border-t-primary"></span>
        <p class="text-sm font-bold">${esc(st.fileName)}（${fmtSize(st.size)}）を読み取っています…</p>
        <p class="text-xs text-muted">Google ドライブに保存 → ダウンロード URL を生成 → PDF から項目を読み取り</p>
      </div>`);
  }
  const x = st.extracted;
  const opt = (arr) => arr.map((v) => [v, v]);
  const auto = (key) => x.uncertain.includes(key) ? ` ${badge("要確認", "warning")}` : ` ${badge("PDF から", "success")}`;
  const cls = (key) => `${FIELD} h-9 ${x.uncertain.includes(key) ? "border-warning-line bg-warning-subtle" : ""}`;
  const age = D.today.slice(0, 4) - x.year;
  const uncertainNote = x.uncertain.length ? note(`読み取りの確信が低い項目（${x.uncertain.map((k) => PDF_FIELD_LABELS[k]).join("・")}）は「要確認」にしています。PDF と見比べて直してください`, "warning") : note("読み取った項目を確かめて、価格・利回りを入れて登録してください", "info");
  return head +
    card(cardHeader("アップロードした PDF", { description: "Google ドライブに保存し、ダウンロード URL を自動で作りました" }) + `<div class="grid gap-3 px-5 py-4 text-sm">
        <div class="flex flex-wrap items-center gap-2">${icon("file-text", 16, "text-primary")}<span class="font-bold">${esc(st.fileName)}</span><span class="text-muted">${fmtSize(st.size)}</span>${badge("Google ドライブに保存済み", "success", true)}</div>
        <div class="grid gap-1 sm:grid-cols-[7rem_1fr]"><span class="text-xs font-bold text-ink-soft">保存先</span><span>Google ドライブ › ${esc(driveFolder())} › ${esc(st.fileName)}</span></div>
        <div class="grid gap-1 sm:grid-cols-[7rem_1fr]"><span class="text-xs font-bold text-ink-soft">ダウンロード URL</span><span class="flex flex-wrap items-center gap-2"><code class="break-all rounded bg-surface-subtle px-2 py-1 text-xs">${esc(st.docUrl)}</code>${btn("コピー", { action: "copy-text", data: { text: st.docUrl }, iconName: "copy", size: "sm" })}</span></div>
        <p class="text-xs text-muted">この URL が物件の「概要書」になり、メールの「概要書を見る」から開きます（モックの URL なので実際には開けません）。${btn("別の PDF にする", { action: "prop-pdf-again", size: "sm", extra: "ml-2" })}</p>
      </div>`, "p-0 mb-4") +
    card(cardHeader("PDF から読み取った項目", { description: "物件名・種別・都道府県・市区町村・番地・構造・築年数は自動で入っています" }) + `<div class="px-5 pt-4">${uncertainNote}</div><form data-form="property" class="grid gap-4 px-5 py-4 md:grid-cols-2">
      <input type="hidden" name="docUrl" value="${esc(st.docUrl)}"><input type="hidden" name="pdfName" value="${esc(st.fileName)}">
      ${field(`物件名${auto("name")}`, `<input name="name" required class="${cls("name")}" value="${esc(x.name)}">`)}
      ${field(`種別${auto("kind")}`, select("kind", opt(KINDS), x.kind))}
      ${field(`都道府県${auto("pref")}`, select("pref", opt(PREFS_ALL), x.pref))}
      ${field(`市区町村${auto("city")}`, `<input name="city" class="${cls("city")}" value="${esc(x.city)}">`)}
      ${field(`番地${auto("addr")}`, `<input name="addr" class="${cls("addr")}" value="${esc(x.addr)}">`)}
      ${field(`構造${auto("structure")}`, select("structure", opt(STRUCTURES), x.structure, { cls: x.uncertain.includes("structure") ? "border-warning-line bg-warning-subtle" : "" }))}
      ${field(`築年数${auto("year")}`, `<input name="year" type="number" min="1900" max="2030" class="${cls("year")}" value="${x.year}">`, `築 ${age} 年（${x.year} 年築。西暦で持ち、築年数は配信のときに計算します）`)}
      <div class="hidden md:block"></div>
      ${field("価格（万円）", `<input name="price" type="number" min="0" step="10" required class="${FIELD} h-9" placeholder="例: 8800">`, "手で入力（PDF から読み取るかは要確認）")}
      ${field("利回り（%）", `<input name="yield" type="number" min="0" step="0.1" required class="${FIELD} h-9" placeholder="例: 7.2">`, "手で入力（PDF から読み取るかは要確認）")}
      <div class="md:col-span-2">${field("メモ（社内だけ）", `<textarea name="memo" rows="3" class="${FIELD} py-2"></textarea>`)}</div>
      <label class="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" name="published" checked> 配信に使う（外すと配信の作成で選べない）</label>
      <div class="flex flex-wrap gap-2 md:col-span-2">${btn("登録する", { variant: "primary", type: "submit", iconName: "check" })}${btn("やめる", { href: "#/properties" })}</div>
    </form>`, "p-0");
}

function viewProperty(id) {
  const p = prop(id);
  if (!p) return notFound();
  const fits = matchingContacts(p);
  const used = D.campaigns.filter((m) => m.propertyIds.includes(p.id));
  const dl = [
    ["所在地", `${p.pref} ${p.city} ${p.addr}`],
    ["種別", p.kind],
    ["構造", p.structure || "-"],
    ["築年", p.year ? `${p.year} 年` : "-"],
    ["価格", yen(p.price)],
    ["利回り", pct(p.yield)],
    ["概要書", `<a href="${esc(p.docUrl)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-primary hover:underline break-all">${icon("external-link", 14)}${esc(p.docUrl)}</a>${p.pdfName ? `<span class="mt-0.5 block text-xs text-muted">${esc(p.pdfName)}（Google ドライブ › ${esc(driveFolder())}）</span>` : ""}`],
    ["メモ", p.memo || "-"],
  ];
  return pageHeader(p.name, {
    back: { href: "#/properties", label: "物件の一覧" },
    description: p.published ? "配信に使えます" : "配信に使わない物件です（配信の作成では選べません）",
    actions: (p.published ? btn("この物件で配信を作る", { variant: "primary", action: "wizard-from-property", data: { id: p.id }, iconName: "send" }) : "") + btn(p.published ? "配信に使わない" : "配信に使う", { action: "toggle-published", data: { id: p.id } }),
  }) +
    mockBand("物件の中身と、希望条件に合う顧客の人数（＝自動で選ばれる宛先）が分かるか", "1・2") +
    `<div class="grid gap-4 lg:grid-cols-3">
      <div class="min-w-0 lg:col-span-1">${card(cardHeader("物件の項目") + `<dl class="divide-y divide-line">${dl.map(([k, v]) => `<div class="grid grid-cols-[6rem_1fr] gap-3 px-5 py-3 text-sm"><dt class="text-xs font-bold text-muted">${k}</dt><dd class="min-w-0 ${k === "概要書" ? "" : "tabular-nums"}">${k === "概要書" ? v : esc(v)}</dd></div>`).join("")}</dl>`, "p-0")}</div>
      <div class="flex min-w-0 flex-col gap-4 lg:col-span-2">
        ${card(cardHeader(`希望条件に合う顧客（${fits.length} 人）`, { description: "顧客の希望条件（エリア・価格・利回り・築年・構造）にこの物件が当てはまる人。配信の作成の「自動で選ぶ」と同じ" }) +
          `<ul class="divide-y divide-line">${fits.map((c) => `<li class="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5"><div class="min-w-0">${linkName(`#/contacts/${c.id}`, c.name)}<div class="text-xs text-muted">${esc(prefsSummary(c.prefs))}</div></div>${c.line.linked ? badge("LINE", "success") : ""}</li>`).join("") || '<li class="px-5 py-6 text-sm text-muted">合う顧客はいません</li>'}</ul>`, "p-0")}
        ${card(cardHeader("この物件を入れた配信") + `<ul class="divide-y divide-line">${used.map((m) => `<li class="flex flex-wrap items-center gap-2 px-5 py-2.5">${noTag(m.no)}${campaignBadge(m)}${linkName(`#/campaigns/${m.id}`, m.subject)}<span class="text-xs text-muted tabular-nums">${dt(m.sentAt || m.scheduledAt)}</span></li>`).join("") || '<li class="px-5 py-6 text-sm text-muted">まだありません</li>'}</ul>`, "p-0")}
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ 画面: 顧客 */

function viewContacts() {
  const q = ui.contactQuery.trim();
  let list = D.contacts.slice();
  if (q) list = list.filter((c) => [c.name, c.email].some((s) => s.includes(q)));
  if (ui.contactArea) list = list.filter((c) => c.prefs.areas.length === 0 || c.prefs.areas.includes(ui.contactArea));
  if (ui.contactLine === "linked") list = list.filter((c) => c.line.linked);
  if (ui.contactLine === "none") list = list.filter((c) => !c.line.linked);
  return pageHeader("顧客", { description: "送り先（個人のお客様）と、その人の希望条件", actions: btn("顧客を登録", { variant: "primary", action: "mock-only", data: { text: "顧客の登録はモックでは省略しています（Excel 取込と手入力の画面は本番で）" }, iconName: "plus" }) }) +
    mockBand("顧客ごとの希望条件（エリア・価格・利回り・築年・構造）と LINE の連携が一覧で分かるか", "1.5・7") +
    `<div class="mb-4 flex flex-wrap items-center gap-2">
      <div class="relative">${icon("search", 16, "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted")}<input data-input="contactQuery" value="${esc(ui.contactQuery)}" placeholder="氏名・メールで検索" class="${FIELD} h-9 w-64 !rounded-full pl-9"></div>
      ${select("contactArea", [["", "希望エリア: すべて"], ...PREFS_ALL.map((a) => [a, a])], ui.contactArea, { cls: "!w-auto", data: 'data-change="contactArea"' })}
      ${select("contactLine", [["", "LINE: すべて"], ["linked", "LINE 連携済み"], ["none", "未連携"]], ui.contactLine, { cls: "!w-auto", data: 'data-change="contactLine"' })}
      <span class="text-sm text-muted tabular-nums">${list.length} 人</span>
    </div>` +
    table(
      [{ label: "氏名", td: "whitespace-nowrap" }, { label: "希望エリア" }, { label: "価格", td: "whitespace-nowrap tabular-nums" }, { label: "利回り", td: "whitespace-nowrap tabular-nums" }, { label: "築年", td: "whitespace-nowrap tabular-nums" }, { label: "構造", td: "whitespace-nowrap" }, { label: "LINE", td: "whitespace-nowrap" }, { label: "社内担当", td: "whitespace-nowrap" }, { label: "開封率", td: "whitespace-nowrap tabular-nums" }],
      list.map((c) => {
        const f = c.prefs;
        const o = contactOpens(c);
        return [
          `${linkName(`#/contacts/${c.id}`, c.name)}`,
          esc(f.areas.join("・") || "指定なし"),
          f.priceMin == null && f.priceMax == null ? '<span class="text-muted">指定なし</span>' : `${f.priceMin != null ? f.priceMin.toLocaleString() : ""}〜${f.priceMax != null ? f.priceMax.toLocaleString() : ""} 万円`,
          f.yieldMin != null ? `${pct(f.yieldMin)}以上` : '<span class="text-muted">-</span>',
          f.yearMin != null ? `${f.yearMin} 年〜` : '<span class="text-muted">-</span>',
          esc(f.structures.join("・") || "-"),
          c.line.linked ? badge("連携済み", "success", true) : badge("未連携", "neutral", true),
          esc(owner(c.ownerId).name),
          o.rate == null ? "-" : `${o.rate}%`,
        ];
      }),
      { minW: "min-w-[980px]" },
    );
}

function viewContact(id) {
  const c = contact(id);
  if (!c) return notFound();
  const o = contactOpens(c);
  const inqs = D.inquiries.filter((q) => q.contactId === c.id).sort((a, b) => b.at.localeCompare(a.at));
  const hist = D.prefHistory.filter((h) => h.contactId === c.id).sort((a, b) => b.at.localeCompare(a.at));
  const fitProps = D.properties.filter((p) => p.published && matches(c, p));
  const f = c.prefs;
  const prefRows = [
    ["希望エリア", f.areas.join("・") || "指定なし"],
    ["価格", f.priceMin == null && f.priceMax == null ? "指定なし" : `${f.priceMin != null ? yen(f.priceMin) : ""} 〜 ${f.priceMax != null ? yen(f.priceMax) : ""}`],
    ["利回り", f.yieldMin != null ? `${pct(f.yieldMin)} 以上` : "指定なし"],
    ["築年", f.yearMin != null ? `${f.yearMin} 年以降` : "指定なし"],
    ["構造", f.structures.join("・") || "指定なし"],
  ];
  const info = [
    ["メール", c.email],
    ["電話", c.phone],
    ["社内担当", owner(c.ownerId).name],
    ["タグ", c.tags.join("・")],
    ["メモ", c.memo || "-"],
  ];
  return pageHeader(c.name, {
    back: { href: "#/contacts", label: "顧客の一覧" },
    description: c.unsubscribed ? '<span class="text-danger">配信停止済み（配信の宛先に入りません）</span>' : "",
    actions: btn("希望条件の変更フォームを開く（顧客の画面）", { href: `#/prefs/${c.id}`, iconName: "external-link" }),
  }) +
    mockBand("希望条件・開封の履歴・問合せの履歴・LINE の連携・希望条件の変更履歴（本人が変えた分は「本人が変更」）が 1 画面で分かるか", "1.5・3・6・7・8") +
    `<div class="grid gap-4 lg:grid-cols-3">
      <div class="flex flex-col gap-4">
        ${card(cardHeader("顧客の項目") + dlRows(info), "p-0")}
        ${card(cardHeader("LINE") + `<div class="px-5 py-4 text-sm">${c.line.linked ? `<div class="flex items-center gap-2">${badge("連携済み", "success", true)}<span class="text-muted tabular-nums">${dt(c.line.at)}</span></div><p class="mt-2 text-xs text-muted">新着物件を LINE でも受け取れます</p>` : `<div>${badge("未連携", "neutral", true)}</div><p class="mt-2 text-xs text-muted">メールの「LINE で最新情報を受け取る」から本人が友だち追加すると連携済みになります</p>`}</div>`, "p-0")}
      </div>
      <div class="flex min-w-0 flex-col gap-4 lg:col-span-2">
        ${card(cardHeader("希望条件", { description: hist[0] ? `最後の変更: ${dt(hist[0].at)}（${hist[0].by === "self" ? "本人" : "社内"}）` : "" }) + dlRows(prefRows) + `<div class="border-t border-line px-5 py-3 text-xs text-muted">今の希望条件に合う物件: ${fitProps.length ? fitProps.map((p) => `<a href="#/properties/${p.id}" class="text-primary hover:underline">${esc(p.name)}</a>`).join("、") : "なし"}</div>`, "p-0")}
        ${card(cardHeader(`開封の履歴（${o.opened} / ${o.sent} 通）`) + `<ul class="divide-y divide-line">${o.rows.map((x) => `<li class="flex flex-wrap items-center gap-2 px-5 py-2.5 text-sm">${x.r.openedAt ? badge(`開封 ${dt(x.r.openedAt)}`, "success", true) : badge("未開封", "neutral", true)}${noTag(x.m.no)}${linkName(`#/campaigns/${x.m.id}`, x.m.subject)}<a href="#/mail/${x.m.id}/${c.id}" class="ml-auto text-xs text-primary hover:underline">届いたメール</a></li>`).join("") || '<li class="px-5 py-6 text-sm text-muted">まだ送っていません</li>'}</ul>`, "p-0")}
        ${card(cardHeader(`問合せの履歴（${inqs.length} 件）`) + `<ul class="divide-y divide-line">${inqs.map((q) => inquiryItem(q)).join("") || '<li class="px-5 py-6 text-sm text-muted">まだありません</li>'}</ul>`, "p-0")}
        ${card(cardHeader("希望条件の変更履歴") + `<ul class="divide-y divide-line">${hist.map((h) => `<li class="flex flex-wrap items-center gap-2 px-5 py-2.5 text-sm"><span class="text-xs text-muted tabular-nums">${dt(h.at)}</span>${h.by === "self" ? badge("本人が変更", "brand") : badge("社内で変更", "neutral")}<span>${esc(h.summary)}</span></li>`).join("") || '<li class="px-5 py-6 text-sm text-muted">まだありません</li>'}</ul>`, "p-0")}
      </div>
    </div>`;
}
function dlRows(rows) {
  return `<dl class="divide-y divide-line">${rows.map(([k, v]) => `<div class="grid grid-cols-[6rem_1fr] gap-3 px-5 py-2.5 text-sm"><dt class="text-xs font-bold text-muted">${esc(k)}</dt><dd class="min-w-0 break-words">${esc(v)}</dd></div>`).join("")}</dl>`;
}

/* ------------------------------------------------------------------ 画面: 配信の一覧・詳細 */

function viewCampaigns() {
  const q = ui.campaignQuery.trim();
  let list = D.campaigns.slice().sort((a, b) => (b.sentAt || b.scheduledAt || "9").localeCompare(a.sentAt || a.scheduledAt || "9"));
  if (q) list = list.filter((m) => String(m.no).includes(q) || m.subject.includes(q) || m.propertyIds.some((pid) => prop(pid).name.includes(q)));
  return pageHeader("配信", { description: "物件の一斉送信。送信済み・予約・下書き。配信には 7 桁の ID が付きます", actions: btn("新規配信", { variant: "primary", href: "#/campaigns/new", iconName: "plus" }) }) +
    mockBand("配信ごとの ID・状態・送信数・開封率・問合せ・再配信の予約が一覧で分かるか。1 日に何百通も作っても ID で探せるか", "3・4") +
    `<div class="mb-4 flex flex-wrap items-center gap-3">
      <div class="relative">${icon("search", 16, "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted")}<input data-input="campaignQuery" value="${esc(ui.campaignQuery)}" placeholder="ID・件名・物件名で検索" class="${FIELD} h-9 w-72 max-w-full !rounded-full pl-9"></div>
      <span class="text-sm text-muted">${q ? `${list.length} 件 / ${D.campaigns.length} 件` : `${D.campaigns.length} 件`}</span></div>` +
    table(
      [{ label: "ID", td: "whitespace-nowrap" }, { label: "件名" }, { label: "状態", td: "whitespace-nowrap" }, { label: "物件", td: "whitespace-nowrap tabular-nums" }, { label: "宛先", td: "whitespace-nowrap tabular-nums" }, { label: "開封率", td: "whitespace-nowrap tabular-nums" }, { label: "問合せ", td: "whitespace-nowrap tabular-nums" }, { label: "送信・予約", td: "whitespace-nowrap tabular-nums" }],
      list.map((m) => {
        const s = campaignStats(m);
        return [
          `<a href="#/campaigns/${m.id}" class="font-mono text-sm tabular-nums text-primary hover:underline">${m.no}</a>`,
          `${linkName(`#/campaigns/${m.id}`, m.subject)}${s.followups.map((f) => `<div class="mt-1">${badge(`再配信の予約 ${f.no}（${dt(f.at)}）`, "info")}</div>`).join("")}`,
          campaignBadge(m),
          `${m.propertyIds.length} 件`,
          `${m.recipients.length} 人`,
          m.status === "sent" ? rateBar(s.rate) : "-",
          m.status === "sent" ? `${s.inquiries}` : "-",
          dt(m.sentAt || m.scheduledAt),
        ];
      }),
      { minW: "min-w-[960px]", empty: q ? `「${esc(q)}」に合う配信はありません` : "まだありません" },
    );
}

function viewCampaign(id) {
  const m = campaign(id);
  if (!m) return notFound();
  const s = campaignStats(m);
  const actions =
    m.status === "sent"
      ? btn("再配信を予約", { variant: "primary", href: `#/campaigns/${m.id}/followup`, iconName: "calendar-clock" })
      : m.status === "scheduled"
        ? btn("今すぐ送る（モック）", { variant: "primary", action: "send-now", data: { id: m.id }, iconName: "send" }) + btn("予約を取り消す", { action: "cancel-schedule", data: { id: m.id } })
        : btn("続きを作る", { variant: "primary", action: "wizard-from-draft", data: { id: m.id }, iconName: "pencil" });
  const rows = m.recipients.map((r) => {
    const c = contact(r.contactId);
    const inq = D.inquiries.filter((q) => q.campaignId === m.id && q.contactId === c.id);
    const line = D.lineEvents.find((e) => e.campaignId === m.id && e.contactId === c.id);
    return [
      `${linkName(`#/contacts/${c.id}`, c.name)}`,
      m.status !== "sent" ? '<span class="text-muted">-</span>' : r.openedAt ? badge(`開封 ${dt(r.openedAt)}`, "success", true) : badge("未開封", "neutral", true),
      inq.length ? badge(`問合せ ${inq.length}`, "warning") : '<span class="text-muted">-</span>',
      line ? badge("LINE 追加", "success") : c.line.linked ? '<span class="text-xs text-muted">連携済み</span>' : '<span class="text-muted">-</span>',
      `<a href="#/mail/${m.id}/${c.id}" class="inline-flex items-center gap-1 text-sm text-primary hover:underline">${icon("mail", 14)}メールを見る</a>`,
    ];
  });
  return pageHeader(m.subject, { back: { href: "#/campaigns", label: "配信の一覧" }, actions, description: `配信 ID ${noTag(m.no)}` }) +
    mockBand("配信 ID・送信数・開封数・開封率・問合せ・LINE 追加と、宛先ごとの開封／未開封。「再配信を予約」から未開封者だけに送れるか", "3・4・5") +
    `<div class="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-line bg-surface px-5 py-3 text-sm text-ink-soft shadow-sm">${noTag(m.no)}${campaignBadge(m)}
      <span class="inline-flex items-center gap-1.5">${icon(m.status === "sent" ? "send" : "clock", 14, "text-muted")}${m.status === "sent" ? `送信 ${dt(m.sentAt)}` : m.status === "scheduled" ? `予約 ${dt(m.scheduledAt)}` : "下書き"}</span>
      <span class="inline-flex items-center gap-1.5">${icon("building-2", 14, "text-muted")}物件 ${m.propertyIds.map((pid) => `<a href="#/properties/${pid}" class="text-primary hover:underline">${esc(prop(pid).name)}</a>`).join("、")}</span>
      ${s.followups.length ? badge(`予約 ${s.followups.length} 件`, "info", true) : ""}</div>
    <div class="grid grid-cols-2 gap-4 md:grid-cols-5">
      ${kpi("送信数", s.sent, m.status === "sent" ? "" : "まだ送っていません", "send")}
      ${kpi("開封数", s.opened, "", "mail-open")}
      ${kpi("開封率", s.rate == null ? "-" : `${s.rate}%`, "画像の読み込みで計測（目安）", "percent")}
      ${kpi("問合せ", s.inquiries, "", "message-square")}
      ${kpi("LINE 追加", s.lines, "", "message-circle")}
    </div>
    ${s.followups.length ? `<div class="mt-4">${card(cardHeader(`再配信の予約（${s.followups.length} 件）`, { action: btn("予約を足す", { size: "sm", href: `#/campaigns/${m.id}/followup`, iconName: "plus" }) }) + followupList(m), "p-0")}</div>` : ""}
    <div class="mt-6"><h2 class="mb-2 text-base font-bold">宛先（${m.recipients.length} 人）</h2>${table([{ label: "顧客" }, { label: "開封", td: "whitespace-nowrap" }, { label: "問合せ", td: "whitespace-nowrap" }, { label: "LINE", td: "whitespace-nowrap" }, { label: "", td: "whitespace-nowrap" }], rows, { minW: "min-w-[720px]" })}</div>`;
}
function followupList(m) {
  const list = D.followups.filter((f) => f.campaignId === m.id && f.status === "scheduled").sort((a, b) => a.at.localeCompare(b.at));
  return `<ul class="divide-y divide-line">${list
    .map((f) => {
      const n = followupTargets(m, f.target).length;
      return `<li class="flex flex-wrap items-center gap-2 px-5 py-3 text-sm"><span class="inline-flex items-center gap-1 tabular-nums">${icon("clock", 14, "text-muted")}${dt(f.at)}</span>${noTag(f.no)}${badge(`${FOLLOWUP_TARGETS[f.target]} ${n} 人`, "info")}<span class="min-w-0 flex-1 truncate" title="${esc(f.subject)}">${esc(f.subject)}</span>
        <span class="flex gap-2">${btn("編集", { size: "sm", href: `#/campaigns/${m.id}/followup?edit=${f.id}` })}${btn("取り消す", { size: "sm", action: "cancel-followup", data: { id: f.id } })}</span></li>`;
    })
    .join("") || '<li class="px-5 py-6 text-sm text-muted">予約はありません</li>'}</ul>`;
}
const FOLLOWUP_TARGETS = { unopened: "未開封者だけ", opened: "開封者だけ", all: "全員" };
const followupTargets = (m, target) => (target === "unopened" ? m.recipients.filter((r) => !r.openedAt) : target === "opened" ? m.recipients.filter((r) => r.openedAt) : m.recipients).filter((r) => !contact(r.contactId).unsubscribed);

/* ------------------------------------------------------------------ 画面: シナリオ配信（再配信の予約） */

function viewFollowup(id, query) {
  const m = campaign(id);
  if (!m) return notFound();
  if (m.status !== "sent") return pageHeader("再配信を予約", { back: { href: `#/campaigns/${m.id}`, label: "配信の詳細" } }) + note("再配信は、送信済みの配信からだけ予約できます");
  const editing = query.edit ? D.followups.find((f) => f.id === query.edit) : null;
  const f = editing || { target: "unopened", at: shortcutAt(1, 10), subject: m.subject, body: m.body };
  const [date, time] = f.at.split("T");
  const nAll = followupTargets(m, "all").length;
  const nUn = followupTargets(m, "unopened").length;
  const nOp = followupTargets(m, "opened").length;
  return pageHeader(editing ? "再配信の予約を編集" : "再配信を予約", { back: { href: `#/campaigns/${m.id}`, label: "配信の詳細" }, description: `もとの配信: ${noTag(m.no)} ${esc(m.subject)}（${dt(m.sentAt)} 送信・開封 ${campaignStats(m).opened} / ${m.recipients.length}）${editing ? `　この予約の ID: ${noTag(editing.no)}` : "　予約すると新しい配信 ID が付きます"}` }) +
    mockBand("1 回目の配信をもとに、対象（未開封者だけ／開封者だけ／全員）・日時・件名と本文を変えて予約できるか。予約は一覧から取り消し・編集できるか", "4・5") +
    `<div class="grid gap-4 lg:grid-cols-3"><div class="min-w-0 lg:col-span-2">${card(`<form data-form="followup" data-campaign="${m.id}" data-edit="${editing ? editing.id : ""}" class="flex flex-col gap-5">
      <fieldset><legend class="mb-2 text-xs font-bold text-ink-soft">対象</legend><div class="grid gap-2 sm:grid-cols-3">
        ${radioCard("target", "unopened", f.target === "unopened", "未開封者だけ", `${nUn} 人（1 回目を開いていない人）`)}
        ${radioCard("target", "opened", f.target === "opened", "開封者だけ", `${nOp} 人（1 回目を開いた人。関心の高い人に別の案内を送るなど）`)}
        ${radioCard("target", "all", f.target === "all", "全員", `${nAll} 人（1 回目の宛先すべて）`)}
      </div></fieldset>
      <fieldset><legend class="mb-2 text-xs font-bold text-ink-soft">送る日時</legend><div class="flex flex-wrap items-center gap-2">
        <input type="date" name="date" value="${date}" class="${FIELD} h-9 !w-auto" required><input type="time" name="time" value="${time}" class="${FIELD} h-9 !w-auto" required>
        <span class="text-xs text-muted">近道:</span>${btn("翌日 10:00", { size: "sm", action: "fu-shortcut", data: { days: 1 } })}${btn("3 日後 10:00", { size: "sm", action: "fu-shortcut", data: { days: 3 } })}${btn("1 週間後 10:00", { size: "sm", action: "fu-shortcut", data: { days: 7 } })}
      </div></fieldset>
      ${field("件名", `<input name="subject" value="${esc(f.subject)}" class="${FIELD} h-9" required>`)}
      <div class="-mt-3 flex flex-wrap gap-2">${btn("例: 件名を変える（【再送】を付ける）", { size: "sm", variant: "ghost", action: "fu-subject", iconName: "wand-2" })}</div>
      ${field("本文", `<textarea name="body" rows="7" class="${FIELD} py-2">${esc(f.body)}</textarea>`, "物件の一覧（その人の希望条件に合う物件）・LINE・希望条件の変更・配信停止のリンクは、1 回目と同じく自動で付きます")}
      <div class="-mt-3 flex flex-wrap gap-2">${btn("例: 本文の先頭に一文を足す", { size: "sm", variant: "ghost", action: "fu-prepend", iconName: "wand-2" })}${btn("1 回目の件名・本文に戻す", { size: "sm", variant: "ghost", action: "fu-reset", iconName: "rotate-ccw" })}</div>
      <div class="flex flex-wrap gap-2 border-t border-line pt-4">${btn(editing ? "予約を直す" : "予約する", { variant: "primary", type: "submit", iconName: "calendar-check" })}${btn("やめる", { href: `#/campaigns/${m.id}` })}</div>
    </form>`)}</div>
    <div>${card(cardHeader("この配信の予約") + followupList(m), "p-0")}</div></div>`;
}
function radioCard(name, value, checked, title, sub) {
  return `<label class="flex cursor-pointer items-start gap-2 rounded-lg border px-3.5 py-3 text-sm ${checked ? "border-primary bg-primary-subtle" : "border-line-strong bg-surface hover:bg-surface-subtle"}"><input type="radio" name="${name}" value="${value}" ${checked ? "checked" : ""} class="mt-0.5" data-rerender-radio><span><span class="block font-bold">${esc(title)}</span><span class="block text-xs text-muted">${esc(sub)}</span></span></label>`;
}
function shortcutAt(days, hour) {
  const d = new Date(D.today);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return toLocal(d);
}

/* ------------------------------------------------------------------ 画面: 配信の作成（4 段） */

const STEPS = ["物件を選ぶ", "宛先を決める", "件名・本文", "プレビューと送信"];

function wizardRecipients(w) {
  if (w.mode === "auto") {
    return D.contacts.filter((c) => !c.unsubscribed && matchingProps(c, w.propertyIds).length > 0);
  }
  const f = w.filters;
  const virtual = {
    pref: null,
    price: f.price === "" ? null : Number(f.price),
    yield: f.yieldMin === "" ? null : Number(f.yieldMin),
    year: f.yearMin === "" ? null : Number(f.yearMin),
  };
  return D.contacts.filter((c) => {
    if (c.unsubscribed) return false;
    const p = c.prefs;
    if (f.areas.length && !(p.areas.length === 0 || p.areas.some((a) => f.areas.includes(a)))) return false;
    if (virtual.price != null && ((p.priceMin != null && virtual.price < p.priceMin) || (p.priceMax != null && virtual.price > p.priceMax))) return false;
    if (virtual.yield != null && p.yieldMin != null && virtual.yield < p.yieldMin) return false;
    if (virtual.year != null && p.yearMin != null && virtual.year < p.yearMin) return false;
    if (f.structures.length && !(p.structures.length === 0 || p.structures.some((s) => f.structures.includes(s)))) return false;
    if (f.tags.length && !c.tags.some((t) => f.tags.includes(t))) return false;
    return true;
  });
}
const wizardSelected = (w) => wizardRecipients(w).filter((c) => !w.excluded.has(c.id));

function viewWizard(query) {
  if (!wizard) wizard = newWizard(query.property ? [query.property] : []);
  const w = wizard;
  const stepper = `<ol class="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">${STEPS.map((s, i) => {
    const n = i + 1;
    const state = n === w.step ? "now" : n < w.step ? "done" : "todo";
    const cls = state === "now" ? "border-primary bg-primary-subtle text-primary" : state === "done" ? "border-line bg-surface text-ink-soft" : "border-line bg-surface text-muted";
    return `<li><button data-action="wiz-go" data-step="${n}" ${n > w.step ? "disabled" : ""} class="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium ${cls} disabled:cursor-default"><span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${state === "now" ? "bg-primary text-white" : state === "done" ? "bg-success text-white" : "bg-surface-subtle text-muted"} text-xs">${state === "done" ? icon("check", 14) : n}</span>${s}</button></li>`;
  }).join("")}</ol>`;
  const body = [wizStep1, wizStep2, wizStep3, wizStep4][w.step - 1](w);
  return pageHeader(w.draftId ? "配信の続きを作る" : "新規配信", { back: { href: "#/campaigns", label: "配信の一覧" } }) + stepper + body;
}

function wizNav(w, { next = "次へ", nextDisabled = false } = {}) {
  return `<div class="sticky bottom-0 z-20 -mx-4 mt-6 flex flex-wrap items-center gap-2 border-t border-line bg-surface/95 px-4 py-3 md:-mx-8 md:px-8">
    ${w.step > 1 ? btn("戻る", { action: "wiz-back", iconName: "arrow-left" }) : btn("やめる", { action: "wiz-cancel" })}
    <span class="flex-1"></span>${btn("下書きに保存", { action: "wiz-save-draft", iconName: "save" })}
    ${w.step < 4 ? btn(next, { variant: "primary", action: "wiz-next", iconName: "arrow-right", disabled: nextDisabled }) : ""}</div>`;
}

function wizStep1(w) {
  const all = D.properties.filter((p) => p.published);
  const q = ui.wizPropQuery.trim();
  const list = q ? all.filter((p) => [p.name, p.pref, p.city, p.addr, p.kind, p.structure || ""].some((s) => s.includes(q))) : all;
  const picked = all.filter((p) => w.propertyIds.includes(p.id));
  return mockBand("配信する物件を選べるか（複数可）。配信に使わない物件は出ない。検索で絞っても、選んだ物件は保たれる", "2") +
    `<p class="mb-3 text-sm text-ink-soft">配信する物件を選びます（複数可）。選んだ物件が、顧客ごとに「希望条件に合うもの」だけメールに入ります。</p>
    <div class="mb-3 flex flex-wrap items-center gap-3">
      <div class="relative">${icon("search", 16, "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted")}<input data-input="wizPropQuery" value="${esc(ui.wizPropQuery)}" placeholder="物件名・所在地・種別・構造で検索" class="${FIELD} h-9 w-72 max-w-full !rounded-full pl-9"></div>
      <span class="text-sm text-muted">${q ? `${list.length} 件 / ${all.length} 件` : `${all.length} 件`}</span>
      <span class="text-sm">選択中 <b>${picked.length}</b> 件${picked.length ? `<span class="text-muted">（${esc(picked.map((p) => p.name).join("、"))}）</span>` : ""}</span>
    </div>
    ${list.length ? "" : `<p class="rounded-xl border border-dashed border-line bg-surface px-5 py-6 text-sm text-muted">「${esc(q)}」に合う物件はありません</p>`}
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">${list.map((p) => {
      const on = w.propertyIds.includes(p.id);
      return `<label class="flex cursor-pointer gap-3 rounded-xl border p-4 ${on ? "border-primary bg-primary-subtle" : "border-line bg-surface hover:bg-surface-subtle"} shadow-sm"><input type="checkbox" data-action="wiz-prop" data-id="${p.id}" ${on ? "checked" : ""} class="mt-1">
        <span class="min-w-0"><span class="block font-bold">${esc(p.name)}</span><span class="block text-xs text-muted">${esc(p.pref)} ${esc(p.city)} ／ ${esc(p.kind)} ／ ${esc(p.structure || "-")} ／ ${p.year ? `${p.year} 年` : "-"}</span>
        <span class="mt-1 block text-sm tabular-nums">${yen(p.price)} ・ 利回り ${pct(p.yield)}</span><span class="mt-1 block text-xs text-muted">合う顧客 ${matchingContacts(p).length} 人</span></span></label>`;
    }).join("")}</div>` + wizNav(w, { nextDisabled: w.propertyIds.length === 0 });
}

function wizStep2(w) {
  const all = wizardRecipients(w);
  const selected = all.filter((c) => !w.excluded.has(c.id));
  const tabs = `<div class="mb-4 inline-flex rounded-lg bg-surface-subtle p-1 ring-1 ring-line">${[["auto", "希望条件に合う顧客を自動で選ぶ", "sparkles"], ["manual", "手で絞る", "sliders-horizontal"]].map(([k, l, ic]) => `<button data-action="wiz-mode" data-mode="${k}" class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${w.mode === k ? "bg-surface text-primary shadow-sm" : "text-ink-soft"}">${icon(ic, 14)}${l}</button>`).join("")}</div>`;
  const f = w.filters;
  const chips = (key, values) => `<div class="flex flex-wrap gap-1">${values.map((v) => {
    const on = f[key].includes(v);
    return `<button data-action="wiz-chip" data-key="${key}" data-value="${esc(v)}" aria-pressed="${on}" class="inline-flex h-7 items-center gap-1 rounded-full border px-3 text-xs font-medium ${on ? "border-primary bg-primary text-white" : "border-line-strong bg-surface text-ink-soft hover:bg-surface-subtle"}">${on ? icon("check", 12) : ""}${esc(v)}</button>`;
  }).join("")}</div>`;
  const manual = w.mode === "manual" ? card(`<div class="grid gap-4 md:grid-cols-2">
      ${group("エリア（希望エリアに含む顧客）", chips("areas", PREFS_ALL))}
      ${group("構造（希望の構造に含む顧客）", chips("structures", STRUCTURES))}
      ${field("価格（この価格が希望の範囲に入る顧客）", select("price", [["", "指定しない"], ...PRICE_STEPS.map((v) => [v, yen(v)])], f.price, { data: 'data-wiz-filter="price"' }))}
      ${field("利回り（この利回りで足りる顧客）", select("yieldMin", [["", "指定しない"], ...YIELD_STEPS.map((v) => [v, `${v}.0%`])], f.yieldMin, { data: 'data-wiz-filter="yieldMin"' }))}
      ${field("築年（この築年で足りる顧客）", select("yearMin", [["", "指定しない"], ...YEAR_STEPS.map((v) => [v, `${v} 年築`])], f.yearMin, { data: 'data-wiz-filter="yearMin"' }))}
      ${group("タグ", chips("tags", D.tags))}
    </div><div class="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">${btn("選んだ物件の値で埋める", { size: "sm", action: "wiz-fill", iconName: "wand-2" })}${btn("条件を消す", { size: "sm", variant: "ghost", action: "wiz-clear" })}</div>`, "p-5 mb-4") : "";
  const list = all
    .map((c) => {
      const on = !w.excluded.has(c.id);
      const reason = w.mode === "auto" ? reasonLine(c, w.propertyIds) : `希望: ${prefsSummary(c.prefs)}`;
      return `<label class="flex cursor-pointer items-start gap-3 px-5 py-2.5 hover:bg-surface-subtle/60"><input type="checkbox" data-action="wiz-pick" data-id="${c.id}" ${on ? "checked" : ""} class="mt-1"><span class="min-w-0"><span class="font-bold">${esc(c.name)}</span>${c.line.linked ? ` ${badge("LINE", "success")}` : ""}<span class="block text-xs text-muted">${esc(reason)}</span></span></label>`;
    })
    .join("");
  const unsub = D.contacts.filter((c) => c.unsubscribed).length;
  return mockBand("「自動で選ぶ」で、選んだ物件のどれかに希望条件が合う顧客が理由つきで出るか。手で絞ると件数がすぐ変わるか", "2") +
    tabs + manual +
    `<div class="mb-2 flex flex-wrap items-center gap-3"><span class="rounded-full bg-primary-subtle px-3 py-1 text-sm font-bold text-primary tabular-nums">宛先 ${selected.length} 人</span><span class="text-xs text-muted">${w.mode === "auto" ? `選んだ物件（${w.propertyIds.length} 件）のどれかに希望条件が合う ${all.length} 人` : `条件に当てはまる ${all.length} 人`}。チェックを外すと宛先から外れます${unsub ? `。配信停止の ${unsub} 人は入りません` : ""}</span></div>` +
    card(`<div class="divide-y divide-line">${list || '<p class="px-5 py-10 text-center text-sm text-muted">当てはまる顧客がいません</p>'}</div>`, "p-0") +
    wizNav(w, { nextDisabled: selected.length === 0 });
}

function wizStep3(w) {
  if (!w.subject) w.subject = `【新着】${w.propertyIds.map((id) => prop(id).name.replace("（例）", "")).join("・")}のご案内`;
  return mockBand("件名と本文は全員に共通。物件の一覧は顧客ごとに自動で差し込まれることが分かるか", "2・6") +
    `<div class="grid gap-4 lg:grid-cols-3"><div class="min-w-0 lg:col-span-2">${card(`<div class="flex flex-col gap-4">
      ${field("件名", `<input data-wiz-text="subject" value="${esc(w.subject)}" class="${FIELD} h-9">`)}
      ${field("本文（全員に共通）", `<textarea data-wiz-text="body" rows="8" class="${FIELD} py-2">${esc(w.body)}</textarea>`)}
    </div>`)}</div>
    <div>${card(`<h2 class="text-sm font-bold">メールに自動で入るもの</h2><ol class="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-ink-soft">
      <li>宛名（氏名 様）とあいさつ</li><li>上の本文</li><li><b>あなたの希望条件に合う物件</b>の表（その顧客に合う物件だけ。所在地・利回り・価格・築年・構造、「概要書を見る」「この物件を問い合わせる」）</li><li>LINE で最新情報を受け取る（友だち追加）</li><li>希望条件を変更する・配信停止のリンク</li></ol>
      <p class="mt-3 text-xs text-muted">概要書は PDF を添付せず、URL のリンクで渡します（添付の容量・迷惑メールの判定を避けるため）</p>`, "p-5")}</div></div>` +
    wizNav(w);
}

function wizStep4(w) {
  const sel = wizardSelected(w);
  if (!w.previewContactId || !sel.some((c) => c.id === w.previewContactId)) w.previewContactId = sel[0]?.id;
  const c = contact(w.previewContactId);
  const temp = { id: "preview", subject: w.subject, body: w.body, propertyIds: w.propertyIds, status: "draft" };
  return mockBand("顧客を切り替えると、メールの中の物件一覧がその人の希望条件に合わせて変わるか。「今すぐ送る」と「予約する」", "2・6") +
    `<div class="grid gap-4 lg:grid-cols-3">
      <div class="min-w-0 lg:col-span-2"><div class="mb-3 flex flex-wrap items-center gap-2"><span class="text-sm font-bold">プレビューする顧客</span>${select("previewContact", sel.map((x) => [x.id, `${x.name}（合う物件 ${matchingProps(x, w.propertyIds).length} 件）`]), w.previewContactId, { cls: "!w-auto max-w-full", data: 'data-change="previewContact"' })}</div>
        ${c ? mailView(temp, c, { preview: true }) : note("宛先がいません")}</div>
      <div class="flex flex-col gap-4">${card(`<h2 class="text-sm font-bold">送る内容</h2><dl class="mt-3 space-y-2 text-sm"><div class="flex justify-between gap-3"><dt class="text-muted">宛先</dt><dd class="font-bold tabular-nums">${sel.length} 人</dd></div><div class="flex justify-between gap-3"><dt class="text-muted">物件</dt><dd class="text-right">${w.propertyIds.map((id) => esc(prop(id).name)).join("<br>")}</dd></div><div class="flex justify-between gap-3"><dt class="text-muted">件名</dt><dd class="text-right">${esc(w.subject)}</dd></div></dl>
        <div class="mt-4 flex flex-col gap-2 border-t border-line pt-4">${btn(`今すぐ ${sel.length} 人に送る`, { variant: "primary", action: "wiz-send", iconName: "send", disabled: !sel.length })}
          <div class="mt-2 text-xs font-bold text-ink-soft">日時を決めて送る</div><input type="datetime-local" data-wiz-text="scheduleAt" value="${w.scheduleAt}" class="${FIELD} h-9">${btn("予約する", { action: "wiz-schedule", iconName: "calendar-clock", disabled: !sel.length })}</div>`, "p-5")}</div>
    </div>` + wizNav(w);
}

/* ------------------------------------------------------------------ 画面: 届くメール */

/** 届くメール（HTML メール）。preview は配信の作成のプレビュー（リンクは押せるがモックの説明つき） */
function mailView(m, c, { preview = false } = {}) {
  const fits = matchingProps(c, m.propertyIds);
  const ps = fits.length ? fits : m.propertyIds.map(prop);
  const q = m.id === "preview" ? "" : `?m=${m.id}`;
  const rows = ps
    .map((p) => `<tr class="border-t border-[#e5e7eb] align-top"><td class="px-3 py-3"><div class="font-bold text-[#111827]">${esc(p.name)}</div><div class="text-xs text-[#6b7280]">${esc(p.pref)} ${esc(p.city)}</div>
      <div class="mt-2 flex flex-wrap gap-2"><a class="mail-button border border-[#cbd5e1] bg-white !px-2.5 !py-1.5 !text-xs !font-medium text-[#23406d]" href="${esc(p.docUrl)}" target="_blank" rel="noopener">${icon("file-text", 14)}概要書を見る</a><a class="mail-button bg-[#23406d] !px-2.5 !py-1.5 !text-xs text-white" href="#/inquiry/${p.id}/${c.id}${q}">${icon("message-square", 14)}この物件を問い合わせる</a></div></td>
      <td class="px-3 py-3 whitespace-nowrap tabular-nums">${pct(p.yield)}</td><td class="px-3 py-3 whitespace-nowrap tabular-nums">${yen(p.price)}</td><td class="px-3 py-3 whitespace-nowrap tabular-nums">${p.year ? `${p.year} 年` : "-"}</td><td class="px-3 py-3 whitespace-nowrap">${esc(p.structure || "-")}</td></tr>`)
    .join("");
  return `<div class="mail-frame overflow-hidden rounded-xl border border-[#d1d5db] bg-white shadow-sm">
    <div class="border-b border-[#e5e7eb] bg-[#f9fafb] px-5 py-3 text-xs text-[#4b5563]"><div><span class="inline-block w-14 text-[#9ca3af]">差出人</span>${esc(D.settings.senderName)} &lt;info@example.jp&gt;</div><div><span class="inline-block w-14 text-[#9ca3af]">宛先</span>${esc(c.name)} 様 &lt;${esc(c.email)}&gt;</div><div class="mt-1 text-sm font-bold text-[#111827]"><span class="inline-block w-14 text-xs font-normal text-[#9ca3af]">件名</span>${esc(m.subject)}</div></div>
    <div class="px-5 py-6 text-[15px] leading-relaxed text-[#1f2937]">
      <p>${esc(c.name)} 様</p>
      <p class="mt-4 whitespace-pre-wrap">${esc(m.body)}</p>
      <h3 class="mt-6 border-l-4 border-[#23406d] pl-2 text-base font-bold text-[#111827]">${fits.length ? "あなたの希望条件に合う物件" : "ご案内の物件"}（${ps.length} 件）</h3>
      <p class="mt-1 text-xs text-[#6b7280]">ご登録の希望条件: ${esc(prefsSummary(c.prefs))}</p>
      <div class="mt-2 overflow-x-auto rounded-lg border border-[#e5e7eb]"><table class="w-full min-w-[560px] text-sm"><thead class="bg-[#f3f4f6] text-left text-xs text-[#4b5563]"><tr><th class="px-3 py-2">物件・所在地</th><th class="px-3 py-2">利回り</th><th class="px-3 py-2">価格</th><th class="px-3 py-2">築年</th><th class="px-3 py-2">構造</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="mt-6 rounded-lg bg-[#f0fdf4] p-4 text-center"><p class="text-sm text-[#166534]">新着物件を LINE でもお届けします</p><a class="mail-button mt-2 bg-[#06c755] text-white" href="#/line/${c.id}${q}">${icon("message-circle", 16)}LINE で最新情報を受け取る（友だち追加）</a></div>
      <p class="mt-6 text-sm">ご希望の条件が変わったときは、こちらから変更できます: <a class="font-bold text-[#23406d] underline" href="#/prefs/${c.id}${q}">希望条件を変更する</a></p>
      <hr class="my-6 border-[#e5e7eb]">
      <p class="text-xs text-[#6b7280]">${esc(D.settings.senderName)}<br>${esc(D.settings.unsubscribeText)} <a class="underline" href="#" data-action="unsubscribe" data-id="${c.id}">配信停止</a><br><span class="text-[#9ca3af]">配信番号 ${m.no}（お問い合わせの際にお伝えください）</span></p>
    </div>
    <div class="border-t border-dashed border-[#f59e0b] bg-[#fffbeb] px-5 py-2 text-xs text-[#92400e]">※（モックだけの注記）ここに 1px の透明な画像が入り、メールを開くと読み込まれて開封として記録されます。画像を表示しない設定・Gmail や Apple の画像の先読みで、実際とずれることがあります${preview ? "。プレビューでは記録しません" : ""}</div>
  </div>`;
}

function viewMail(mid, cid) {
  const m = campaign(mid);
  const c = contact(cid);
  if (!m || !c) return publicShell(notFound());
  let recorded = "";
  const r = m.recipients.find((x) => x.contactId === c.id);
  if (m.status === "sent" && r && !r.openedAt) {
    r.openedAt = now();
    recorded = note(`（モック）このメールを開いたので、${esc(c.name)} さんの開封を記録しました（${dt(r.openedAt)}）。配信の詳細・顧客の詳細の開封に出ます`, "success");
  }
  return publicShell(
    mockBand("届くメールの中身: 宛名 → 本文 → 希望条件に合う物件の表（概要書の URL・問い合わせ）→ LINE の友だち追加 → 希望条件の変更 → 配信停止", "3・6・7・8") +
      (recorded ? `<div class="mb-4">${recorded}</div>` : "") +
      (r ? "" : `<div class="mb-4">${note("（モック）この顧客はこの配信の宛先ではありません。見た目の確認用に表示しています", "info")}</div>`) +
      mailView(m, c),
    `#/campaigns/${m.id}`,
  );
}

/* ------------------------------------------------------------------ 画面: 問合せ・LINE・希望条件の変更（顧客が開く） */

function viewInquiry(pid, cid, query) {
  const p = prop(pid);
  const c = contact(cid);
  if (!p || !c) return publicShell(notFound());
  const key = `inq-${pid}-${cid}`;
  const back = query.m ? `#/mail/${query.m}/${cid}` : "#/";
  if (ui.done[key]) {
    return publicShell(card(`<div class="py-6 text-center">${icon("circle-check", 40, "mx-auto text-success")}<h1 class="mt-3 text-xl font-bold">お問い合わせを受け付けました</h1><p class="mt-2 text-sm text-ink-soft">担当の ${esc(owner(c.ownerId).name)} に届きました。折り返しご連絡します。</p>
      <div class="mt-6 flex flex-wrap justify-center gap-2">${query.m ? btn("メールに戻る", { href: back }) : ""}${btn("（管理画面）配信の詳細で確かめる", { href: query.m ? `#/campaigns/${query.m}` : `#/contacts/${c.id}`, variant: "outline" })}</div></div>`), back);
  }
  const dl = [["所在地", `${p.pref} ${p.city} ${p.addr}`], ["種別", p.kind], ["価格", yen(p.price)], ["利回り", pct(p.yield)], ["築年", p.year ? `${p.year} 年` : "-"], ["構造", p.structure || "-"]];
  return publicShell(
    mockBand("メールの「この物件を問い合わせる」から開くページ。氏名・メールは入力済みで、要望を書いて送れるか。送ると社内担当に届き、配信と顧客の詳細の問合せが 1 件増える", "6") +
      card(`<h1 class="text-xl font-bold">${esc(p.name)}</h1><dl class="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">${dl.map(([k, v]) => `<div class="flex gap-3"><dt class="w-16 shrink-0 text-xs font-bold text-muted">${k}</dt><dd class="tabular-nums">${esc(v)}</dd></div>`).join("")}</dl>
        <a href="${esc(p.docUrl)}" target="_blank" rel="noopener" class="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">${icon("file-text", 14)}概要書を見る</a>
        <form data-form="inquiry" data-property="${p.id}" data-contact="${c.id}" data-campaign="${esc(query.m || "")}" class="mt-6 flex flex-col gap-4 border-t border-line pt-5">
          <h2 class="text-base font-bold">この物件を問い合わせる</h2>
          <div class="grid gap-4 sm:grid-cols-2">${field("お名前", `<input value="${esc(c.name.replace("（例）", ""))}" readonly class="${FIELD} h-9 bg-surface-subtle">`)}${field("メール", `<input value="${esc(c.email)}" readonly class="${FIELD} h-9 bg-surface-subtle">`)}</div>
          ${field("ご要望（任意）", `<textarea name="message" rows="4" class="${FIELD} py-2" placeholder="例: 内見を希望します／レントロールを見たい／融資の相談をしたい"></textarea>`)}
          <div>${btn("問い合わせる", { variant: "primary", type: "submit", iconName: "send", size: "lg" })}</div>
        </form>`),
    back,
  );
}

function viewLine(cid, query) {
  const c = contact(cid);
  if (!c) return publicShell(notFound());
  const back = query.m ? `#/mail/${query.m}/${cid}` : "#/";
  const step = c.line.linked && ui.lineStep[cid] == null ? 3 : ui.lineStep[cid] || 0;
  const noteText = "本番では LINE ログインで本人を確かめてから友だち追加します（友だち追加の URL のパラメータだけでは、誰が追加したかを確かめられないため）。";
  const frames = [
    () => card(`<div class="text-center"><span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-line_app text-white">${icon("message-circle", 28)}</span><h1 class="mt-3 text-xl font-bold">LINE で新着物件を受け取る</h1><p class="mt-2 text-sm text-ink-soft">${esc(c.name)} 様。LINE でログインして友だち追加すると、希望条件に合う新着物件を LINE でもお届けします。</p>
      <div class="mt-5">${btn("LINE でログインして友だち追加", { variant: "line", size: "lg", action: "line-step", data: { id: c.id, step: 1 }, iconName: "log-in" })}</div><p class="mt-4 text-xs text-muted">${noteText}</p></div>`),
    () => lineMock("LINE ログイン（擬似画面）", `<p class="text-sm">「（例）IPA 不動産」があなたの LINE のプロフィール（表示名）を使うことを許可しますか。</p>`, btn("ログインした（許可する）", { variant: "line", action: "line-step", data: { id: c.id, step: 2 } })),
    () => lineMock("友だち追加（擬似画面）", `<div class="flex items-center gap-3"><span class="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">${icon("building-2", 22)}</span><div><div class="font-bold">（例）IPA 不動産</div><div class="text-xs text-[#6b7280]">新着物件のお知らせ</div></div></div>`, btn("友だち追加した", { variant: "line", action: "line-step", data: { id: c.id, step: 3 } })),
    () => card(`<div class="py-4 text-center">${icon("circle-check", 40, "mx-auto text-success")}<h1 class="mt-3 text-xl font-bold">友だち追加が完了しました</h1><p class="mt-2 text-sm text-ink-soft">新着物件を LINE でもお届けします。</p><p class="mt-1 text-xs text-muted tabular-nums">連携: ${dt(c.line.at)}</p>
      <div class="mt-6 flex flex-wrap justify-center gap-2">${query.m ? btn("メールに戻る", { href: back }) : ""}${btn("（管理画面）顧客の詳細で確かめる", { href: `#/contacts/${c.id}`, variant: "outline" })}</div></div>`),
  ];
  return publicShell(mockBand("メールのボタンから、LINE ログイン → 友だち追加 → 完了まで。完了すると顧客の詳細が「LINE 連携済み」になる", "7") + `<div class="mx-auto max-w-md">${frames[step]()}</div>`, back);
}
function lineMock(title, content, action) {
  return `<div class="overflow-hidden rounded-2xl border border-[#d1d5db] bg-white shadow-sm"><div class="bg-[#06c755] px-4 py-3 text-sm font-bold text-white">${esc(title)}</div><div class="px-5 py-6">${content}<div class="mt-5">${action}</div><p class="mt-4 text-xs text-[#6b7280]">※ LINE の画面の代わりのモックです</p></div></div>`;
}

function viewPrefs(cid, query) {
  const c = contact(cid);
  if (!c) return publicShell(notFound());
  const back = query.m ? `#/mail/${query.m}/${cid}` : "#/";
  if (ui.done[`prefs-${cid}`]) {
    return publicShell(card(`<div class="py-6 text-center">${icon("circle-check", 40, "mx-auto text-success")}<h1 class="mt-3 text-xl font-bold">希望条件を変更しました</h1><p class="mt-2 text-sm text-ink-soft">${esc(prefsSummary(c.prefs))}</p><p class="mt-1 text-sm text-ink-soft">次の配信から、この条件に合う物件をお届けします。</p>
      <div class="mt-6 flex flex-wrap justify-center gap-2">${btn("もう一度変える", { action: "prefs-again", data: { id: c.id } })}${btn("（管理画面）顧客の詳細で確かめる", { href: `#/contacts/${c.id}`, variant: "outline" })}</div></div>`), back);
  }
  const f = c.prefs;
  const checks = (name, values, chosen) => `<div class="flex flex-wrap gap-2">${values.map((v) => `<label class="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm"><input type="checkbox" name="${name}" value="${esc(v)}" ${chosen.includes(v) ? "checked" : ""}>${esc(v)}</label>`).join("")}</div>`;
  return publicShell(
    mockBand("メールの「希望条件を変更する」から開くフォーム。今の条件が入った状態で開き、変えて送ると顧客の詳細（希望条件・変更履歴「本人が変更」）に反映される", "8") +
      card(`<h1 class="text-xl font-bold">希望条件の変更</h1><p class="mt-1 text-sm text-ink-soft">${esc(c.name)} 様。ご希望に合う物件だけをお送りします。</p>
        <form data-form="prefs" data-contact="${c.id}" class="mt-6 flex flex-col gap-5">
          ${group("希望エリア（複数可・選ばなければ全国）", checks("areas", PREFS_ALL, f.areas))}
          <div class="grid gap-4 sm:grid-cols-2">${field("価格の下限", select("priceMin", [["", "下限なし"], ...PRICE_STEPS.map((v) => [v, yen(v)])], f.priceMin))}${field("価格の上限", select("priceMax", [["", "上限なし"], ...PRICE_STEPS.map((v) => [v, yen(v)])], f.priceMax))}</div>
          <div class="grid gap-4 sm:grid-cols-2">${field("利回りの下限", select("yieldMin", [["", "指定しない"], ...YIELD_STEPS.map((v) => [v, `${v}.0% 以上`])], f.yieldMin))}${field("築年（何年以降）", select("yearMin", [["", "指定しない"], ...YEAR_STEPS.map((v) => [v, `${v} 年以降`])], f.yearMin))}</div>
          ${group("構造（複数可・選ばなければすべて）", checks("structures", STRUCTURES, f.structures))}
          <div>${btn("この条件で変更する", { variant: "primary", type: "submit", iconName: "check", size: "lg" })}</div>
        </form>`),
    back,
  );
}

/* ------------------------------------------------------------------ 画面: 開封の状況・設定 */

function viewOpens() {
  const rows = D.contacts.map((c) => ({ c, o: contactOpens(c) })).filter((x) => x.o.sent > 0).sort((a, b) => (b.o.rate ?? -1) - (a.o.rate ?? -1));
  const cold = rows.filter((x) => x.o.unopenedStreak >= 2).sort((a, b) => b.o.unopenedStreak - a.o.unopenedStreak);
  return pageHeader("開封の状況", { description: "送信済みの配信をまたいだ、顧客ごとの開封" }) +
    mockBand("よく開く顧客と、未開封が続く顧客が分かるか（再配信や電話のきっかけ）", "3") +
    `<div class="mb-6">${note("開封はメールの中の画像の読み込みで数えるので目安です。画像を表示しない設定では「未開封」に、Gmail・Apple の画像の先読みでは「開封」に寄ることがあります", "info")}</div>
    <h2 class="mb-2 text-base font-bold">未開封が続く顧客（直近 2 通以上）</h2>` +
    table([{ label: "顧客" }, { label: "続けて未開封", td: "whitespace-nowrap tabular-nums" }, { label: "社内担当", td: "whitespace-nowrap" }, { label: "LINE", td: "whitespace-nowrap" }], cold.map(({ c, o }) => [`${linkName(`#/contacts/${c.id}`, c.name)}`, `${o.unopenedStreak} 通`, esc(owner(c.ownerId).name), c.line.linked ? badge("連携済み", "success", true) : badge("未連携", "neutral", true)]), { empty: "いません", minW: "min-w-[560px]" }) +
    `<h2 class="mb-2 mt-8 text-base font-bold">顧客ごとの開封率</h2>` +
    table([{ label: "顧客" }, { label: "送った", td: "whitespace-nowrap tabular-nums" }, { label: "開いた", td: "whitespace-nowrap tabular-nums" }, { label: "開封率", td: "whitespace-nowrap tabular-nums" }, { label: "最後に開いた", td: "whitespace-nowrap tabular-nums" }], rows.map(({ c, o }) => {
      const last = o.rows.find((x) => x.r.openedAt);
      return [`${linkName(`#/contacts/${c.id}`, c.name)}`, `${o.sent} 通`, `${o.opened} 通`, rateBar(o.rate), last ? dt(last.r.openedAt) : "-"];
    }), { minW: "min-w-[640px]" });
}

function viewSettings() {
  return pageHeader("設定") +
    mockBand("配信停止の文言、LINE 連携の設定欄、開封計測の注意が分かるか", "3・7") +
    `<div class="grid max-w-3xl gap-4">
      ${card(cardHeader("配信停止の文言", { description: "メールの最後に入ります（配信停止のリンクの前）" }) + `<form data-form="settings-unsub" class="flex flex-col gap-3 px-5 py-4"><textarea name="text" rows="3" class="${FIELD} py-2">${esc(D.settings.unsubscribeText)}</textarea><div>${btn("保存", { type: "submit" })}</div></form>`, "p-0")}
      ${card(cardHeader("LINE 連携", { description: "LINE Developers で作るチャネルの値を入れます（モックでは保存しません）" }) + `<div class="grid gap-4 px-5 py-4 sm:grid-cols-2">${field("チャネル ID", `<input class="${FIELD} h-9" placeholder="例: 1234567890">`)}${field("チャネルシークレット", `<input type="password" class="${FIELD} h-9" placeholder="（入力しても保存しません）" autocomplete="off">`)}</div><div class="px-5 pb-4">${note("本番では LINE ログインで本人を確かめてから友だち追加につなぎます。友だち追加の URL だけでは、誰が追加したかを確かめられません", "info")}</div>`, "p-0")}
      ${card(cardHeader("物件概要書（PDF）の保存先", { description: "PDF はデータベースに入れず、外部のストレージに置きます。システムが持つのはダウンロード URL と読み取った項目だけ" }) + `<div class="grid gap-3 px-5 py-4 text-sm"><div class="flex flex-wrap items-center gap-2">${icon("hard-drive", 16, "text-primary")}<span class="font-bold">Google ドライブ</span>${badge("連携済み", "success", true)}<span class="text-muted">フォルダ: 物件概要書 › 年月ごと（例: ${esc(driveFolder())}）</span></div><div class="flex flex-wrap gap-2">${btn("連携をやり直す", { action: "mock-only", data: { text: "本番では Google アカウントで連携し、保存先のフォルダを選びます" }, size: "sm" })}${btn("保存先のフォルダを開く", { action: "mock-only", data: { text: "本番では Google ドライブのフォルダが開きます" }, size: "sm", iconName: "external-link" })}</div>${note("1 日に数十件の PDF を上げても、データベースは URL と項目の分しか増えません。PDF の容量は Google ドライブ側で持ちます", "info")}</div>`, "p-0")}
      ${card(cardHeader("開封の計測について") + `<div class="px-5 py-4">${note("開封はメールの中の 1px の画像の読み込みで数えます。画像を表示しない設定の人は「未開封」になり、Gmail・Apple（iCloud）の画像の先読みでは、本人が開いていなくても「開封」になることがあります。開封率は目安として見てください")}</div>`, "p-0")}
    </div>`;
}

function notFound() {
  return card(`<p class="text-sm">見つかりません。</p><a href="#/" class="mt-2 inline-block text-sm text-primary hover:underline">ダッシュボードへ</a>`);
}

/* ------------------------------------------------------------------ ルーター */

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, qs] = raw.split("?");
  const query = Object.fromEntries(new URLSearchParams(qs || ""));
  return { path: path.replace(/\/$/, ""), parts: path.split("/").filter(Boolean), query };
}

function render() {
  const { path, parts, query } = parseHash();
  const [a, b, c] = parts;
  let html;
  if (a === "mail") html = viewMail(b, c);
  else if (a === "inquiry") html = viewInquiry(b, c, query);
  else if (a === "line") html = viewLine(b, query);
  else if (a === "prefs") html = viewPrefs(b, query);
  else {
    let content;
    if (!a) content = viewDashboard();
    else if (a === "properties" && b === "new") content = viewPropertyNew();
    else if (a === "properties" && b) content = viewProperty(b);
    else if (a === "properties") content = viewProperties();
    else if (a === "contacts" && b) content = viewContact(b);
    else if (a === "contacts") content = viewContacts();
    else if (a === "campaigns" && b === "new") content = viewWizard(query);
    else if (a === "campaigns" && b && c === "followup") content = viewFollowup(b, query);
    else if (a === "campaigns" && b) content = viewCampaign(b);
    else if (a === "campaigns") content = viewCampaigns();
    else if (a === "opens") content = viewOpens();
    else if (a === "settings") content = viewSettings();
    else content = notFound();
    html = shell(path, content);
  }
  document.getElementById("app").innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

let lastPath = null;
window.addEventListener("hashchange", () => {
  const { path } = parseHash();
  if (path !== lastPath) {
    ui.navOpen = false;
    // 配信の作成から離れたら、途中の状態は捨てる（下書きは「下書きに保存」で残す）
    if (!path.startsWith("campaigns/new")) wizard = null;
    lastPath = path;
    window.scrollTo(0, 0);
  }
  render();
});

/* ------------------------------------------------------------------ 操作 */

function toast(text, tone = "success") {
  const el = document.getElementById("toast");
  el.innerHTML = `<div class="pointer-events-auto flex items-center gap-2 rounded-lg border border-${tone}-line bg-surface px-4 py-2.5 text-sm text-ink shadow-sm">${icon(tone === "success" ? "circle-check" : "info", 16, `text-${tone}`)}${esc(text)}</div>`;
  if (window.lucide) window.lucide.createIcons();
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.innerHTML = ""), 3200);
}
const go = (hash) => {
  if (location.hash === hash) render();
  else location.hash = hash;
};
const nextCampaignId = () => `m${D.campaigns.length + 1}`;
/** 配信の ID（7 桁の通し番号。再配信の予約にも付く。1 日に何百通も作っても、件名ではなく番号で探せるように） */
const nextCampaignNo = () => Math.max(1000000, ...D.campaigns.map((m) => m.no || 0), ...D.followups.map((f) => f.no || 0)) + 1;
const noTag = (no, cls = "") => `<span class="inline-flex items-center rounded border border-line bg-surface-subtle px-1.5 py-0.5 font-mono text-xs tabular-nums text-ink-soft ${cls}">${no}</span>`;

function saveWizard(status, extra = {}) {
  const w = wizard;
  const recipients = wizardSelected(w).map((c) => ({ contactId: c.id, openedAt: null }));
  const data = { subject: w.subject || "（件名なし）", body: w.body, propertyIds: w.propertyIds.slice(), status, recipients, sentAt: null, scheduledAt: null, ...extra };
  let m;
  if (w.draftId) {
    m = campaign(w.draftId);
    Object.assign(m, data);
  } else {
    m = { id: nextCampaignId(), no: nextCampaignNo(), ...data };
    D.campaigns.push(m);
  }
  wizard = null;
  return m;
}

const actions = {
  nav() {
    ui.navOpen = !ui.navOpen;
    render();
  },
  reset() {
    location.hash = "#/";
    location.reload();
  },
  "mock-only"(el) {
    toast(el.dataset.text, "info");
  },
  "prop-pdf-sample"(el) {
    const i = Number(el.dataset.i);
    startPdfReading(`${PDF_SAMPLES[i].name.replace("（例）", "")}_概要書.pdf`, 1536000 + i * 420000, i);
  },
  "prop-pdf-again"() {
    ui.propNew = { stage: "upload", fileName: "", size: 0, sample: 0, extracted: null, docUrl: "", driveId: "" };
    render();
  },
  "copy-text"(el) {
    (navigator.clipboard ? navigator.clipboard.writeText(el.dataset.text) : Promise.reject()).then(() => toast("コピーしました"), () => toast("コピーできませんでした", "info"));
  },
  "toggle-published"(el) {
    const p = prop(el.dataset.id);
    p.published = !p.published;
    toast(p.published ? "配信に使う物件にしました" : "配信に使わない物件にしました");
    render();
  },
  "wizard-from-property"(el) {
    wizard = newWizard([el.dataset.id]);
    go("#/campaigns/new");
  },
  "wizard-from-draft"(el) {
    const m = campaign(el.dataset.id);
    wizard = newWizard(m.propertyIds, m);
    wizard.excluded = new Set(wizardRecipients(wizard).filter((c) => !m.recipients.some((r) => r.contactId === c.id)).map((c) => c.id));
    go("#/campaigns/new");
  },
  "wiz-prop"(el) {
    const id = el.dataset.id;
    wizard.propertyIds = wizard.propertyIds.includes(id) ? wizard.propertyIds.filter((x) => x !== id) : [...wizard.propertyIds, id];
    wizard.excluded = new Set();
    render();
  },
  "wiz-go"(el) {
    wizard.step = Number(el.dataset.step);
    render();
  },
  "wiz-next"() {
    wizard.step = Math.min(4, wizard.step + 1);
    render();
    window.scrollTo(0, 0);
  },
  "wiz-back"() {
    wizard.step = Math.max(1, wizard.step - 1);
    render();
    window.scrollTo(0, 0);
  },
  "wiz-cancel"() {
    wizard = null;
    go("#/campaigns");
  },
  "wiz-mode"(el) {
    wizard.mode = el.dataset.mode;
    wizard.excluded = new Set();
    // 手で絞るに初めて切り替えたときは、選んだ物件の値で埋めておく（条件なし＝全員から始めない）
    const f = wizard.filters;
    if (wizard.mode === "manual" && !f.areas.length && !f.structures.length && !f.tags.length && !f.price && !f.yieldMin && !f.yearMin) return actions["wiz-fill"]();
    render();
  },
  "wiz-chip"(el) {
    const { key, value } = el.dataset;
    const arr = wizard.filters[key];
    wizard.filters[key] = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    render();
  },
  "wiz-fill"() {
    const ps = wizard.propertyIds.map(prop);
    if (!ps.length) return toast("先に物件を選んでください", "info");
    const p = ps[0];
    wizard.filters = { areas: [...new Set(ps.map((x) => x.pref))], price: String(PRICE_STEPS.find((v) => v >= p.price) ?? ""), yieldMin: String(Math.floor(p.yield)), yearMin: p.year ? String([...YEAR_STEPS].reverse().find((v) => v <= p.year) ?? "") : "", structures: p.structure ? [p.structure] : [], tags: [] };
    render();
  },
  "wiz-clear"() {
    wizard.filters = { areas: [], price: "", yieldMin: "", yearMin: "", structures: [], tags: [] };
    render();
  },
  "wiz-pick"(el) {
    const id = el.dataset.id;
    if (wizard.excluded.has(id)) wizard.excluded.delete(id);
    else wizard.excluded.add(id);
    render();
  },
  "wiz-save-draft"() {
    const m = saveWizard("draft");
    toast("下書きに保存しました");
    go(`#/campaigns/${m.id}`);
  },
  "wiz-send"() {
    const m = saveWizard("sent", { sentAt: now() });
    toast(`${m.recipients.length} 人に送りました（モック）。宛先の「メールを見る」で開くと開封になります`);
    go(`#/campaigns/${m.id}`);
  },
  "wiz-schedule"() {
    const at = wizard.scheduleAt;
    if (!at) return toast("日時を入れてください", "info");
    const m = saveWizard("scheduled", { scheduledAt: at });
    toast(`${dt(at)} に予約しました`);
    go(`#/campaigns/${m.id}`);
  },
  "send-now"(el) {
    const m = campaign(el.dataset.id);
    m.status = "sent";
    m.sentAt = now();
    m.scheduledAt = null;
    toast("送りました（モック）");
    render();
  },
  "cancel-schedule"(el) {
    const m = campaign(el.dataset.id);
    m.status = "draft";
    m.scheduledAt = null;
    toast("予約を取り消して下書きに戻しました");
    render();
  },
  "cancel-followup"(el) {
    const f = D.followups.find((x) => x.id === el.dataset.id);
    f.status = "canceled";
    toast("再配信の予約を取り消しました");
    render();
  },
  "fu-shortcut"(el) {
    const form = el.closest("form");
    const [d, t] = shortcutAt(Number(el.dataset.days), 10).split("T");
    form.date.value = d;
    form.time.value = t;
  },
  "fu-subject"(el) {
    const form = el.closest("form");
    if (!form.subject.value.startsWith("【再送】")) form.subject.value = `【再送】${form.subject.value.replace(/^【[^】]*】/, "")}`;
  },
  "fu-prepend"(el) {
    const form = el.closest("form");
    const line = "先日お送りしたご案内を、まだご覧になっていない方にお送りしています。";
    if (!form.body.value.startsWith(line)) form.body.value = `${line}\n${form.body.value}`;
  },
  "fu-reset"(el) {
    const form = el.closest("form");
    const m = campaign(form.dataset.campaign);
    form.subject.value = m.subject;
    form.body.value = m.body;
  },
  "line-step"(el) {
    const c = contact(el.dataset.id);
    const step = Number(el.dataset.step);
    ui.lineStep[c.id] = step;
    if (step === 3 && !c.line.linked) {
      c.line = { linked: true, at: now() };
      const { query } = parseHash();
      D.lineEvents.push({ contactId: c.id, campaignId: query.m || null, at: c.line.at });
    }
    render();
  },
  "prefs-again"(el) {
    delete ui.done[`prefs-${el.dataset.id}`];
    render();
  },
  unsubscribe(el, ev) {
    ev.preventDefault();
    const c = contact(el.dataset.id);
    toast(`（モック）配信停止のページの代わり: ${c.name} さんは次の配信から宛先に入りません`, "info");
    c.unsubscribed = true;
  },
};

document.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-action]");
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (!fn) return;
  if (el.tagName === "A") ev.preventDefault();
  fn(el, ev);
});

document.addEventListener("change", (ev) => {
  const el = ev.target;
  if (el.dataset.change === "propPdf") {
    const f = el.files && el.files[0];
    if (f) startPdfReading(f.name, f.size, Math.abs(hashStr(f.name)) % PDF_SAMPLES.length);
  } else if (el.dataset.change) {
    const key = el.dataset.change;
    if (key === "previewContact") wizard.previewContactId = el.value;
    else ui[key] = el.value;
    render();
  } else if (el.dataset.wizFilter) {
    wizard.filters[el.dataset.wizFilter] = el.value;
    render();
  } else if (el.hasAttribute("data-rerender-radio")) {
    // 対象のラジオの見た目だけ変える（入力中の件名・本文は消さない）
    el.closest("fieldset").querySelectorAll("label").forEach((l) => {
      const on = l.querySelector("input").checked;
      l.className = l.className.replace(/border-primary bg-primary-subtle|border-line-strong bg-surface hover:bg-surface-subtle/, on ? "border-primary bg-primary-subtle" : "border-line-strong bg-surface hover:bg-surface-subtle");
    });
  }
});

document.addEventListener("dragover", (ev) => { if (ev.target.closest("[data-dropzone]")) ev.preventDefault(); });
document.addEventListener("drop", (ev) => {
  const z = ev.target.closest("[data-dropzone]");
  if (!z) return;
  ev.preventDefault();
  const f = ev.dataTransfer.files && ev.dataTransfer.files[0];
  if (f) startPdfReading(f.name, f.size, Math.abs(hashStr(f.name)) % PDF_SAMPLES.length);
});

document.addEventListener("input", (ev) => {
  const el = ev.target;
  if (["contactQuery", "wizPropQuery", "campaignQuery"].includes(el.dataset.input)) {
    const key = el.dataset.input;
    ui[key] = el.value;
    const pos = el.selectionStart;
    render();
    const again = document.querySelector(`[data-input="${key}"]`);
    again.focus();
    again.setSelectionRange(pos, pos);
  } else if (el.dataset.wizText) {
    wizard[el.dataset.wizText] = el.value;
  }
});

document.addEventListener("submit", (ev) => {
  const form = ev.target;
  const kind = form.dataset.form;
  if (!kind) return;
  ev.preventDefault();
  const fd = new FormData(form);
  if (kind === "property") {
    const id = `p${String(D.properties.length + 1).padStart(2, "0")}`;
    D.properties.push({
      id,
      name: fd.get("name"),
      pref: fd.get("pref"),
      city: fd.get("city"),
      addr: fd.get("addr"),
      price: Number(fd.get("price")),
      yield: Number(fd.get("yield")),
      year: fd.get("year") ? Number(fd.get("year")) : null,
      structure: fd.get("structure"),
      kind: fd.get("kind"),
      docUrl: fd.get("docUrl"),
      pdfName: fd.get("pdfName") || "",
      memo: fd.get("memo"),
      published: fd.get("published") === "on",
      createdAt: now(),
    });
    ui.propNew = { stage: "upload", fileName: "", size: 0, sample: 0, extracted: null, docUrl: "", driveId: "" };
    toast("物件を登録しました");
    go(`#/properties/${id}`);
  } else if (kind === "followup") {
    const m = campaign(form.dataset.campaign);
    const data = { target: fd.get("target"), at: `${fd.get("date")}T${fd.get("time")}`, subject: fd.get("subject"), body: fd.get("body") };
    if (form.dataset.edit) {
      Object.assign(D.followups.find((f) => f.id === form.dataset.edit), data);
      toast("予約を直しました");
    } else {
      D.followups.push({ id: `f${D.followups.length + 1}`, no: nextCampaignNo(), campaignId: m.id, status: "scheduled", ...data });
      toast(`${dt(data.at)} に再配信を予約しました（${followupTargets(m, data.target).length} 人）`);
    }
    go(`#/campaigns/${m.id}`);
  } else if (kind === "inquiry") {
    const pid = form.dataset.property;
    const cid = form.dataset.contact;
    const mid = form.dataset.campaign || D.campaigns.filter((m) => m.status === "sent" && m.propertyIds.includes(pid) && m.recipients.some((r) => r.contactId === cid)).map((m) => m.id).pop() || null;
    D.inquiries.push({ id: `q${D.inquiries.length + 1}`, campaignId: mid, propertyId: pid, contactId: cid, at: now(), message: fd.get("message") || "（ご要望の記入なし）", status: "未対応" });
    ui.done[`inq-${pid}-${cid}`] = true;
    render();
  } else if (kind === "prefs") {
    const c = contact(form.dataset.contact);
    const before = prefsSummary(c.prefs);
    const num = (k) => (fd.get(k) ? Number(fd.get(k)) : null);
    c.prefs = { areas: fd.getAll("areas"), priceMin: num("priceMin"), priceMax: num("priceMax"), yieldMin: num("yieldMin"), yearMin: num("yearMin"), structures: fd.getAll("structures") };
    const after = prefsSummary(c.prefs);
    D.prefHistory.push({ id: `h${D.prefHistory.length + 1}`, contactId: c.id, at: now(), by: "self", summary: before === after ? "変更なし（同じ条件で送信）" : `${before} → ${after}` });
    ui.done[`prefs-${c.id}`] = true;
    render();
  } else if (kind === "settings-unsub") {
    D.settings.unsubscribeText = fd.get("text");
    toast("保存しました（メモリ上だけ）");
  }
});

lastPath = parseHash().path;
render();
