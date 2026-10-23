"use strict";
// =============================================================== yardimcilar
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sure = s => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
const uzunSure = sn => { const d = Math.round(sn / 60), h = Math.floor(d / 60); return h ? `${h} sa ${d % 60} dk` : `${d} dk`; };
const mbYaz = b => b > 1073741824 ? (b / 1073741824).toFixed(2) + " GB" : b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const api = async (yol, govde) => {
  const r = await fetch(yol, govde === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(govde) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.hata || "Hata " + r.status);
  return j;
};

// ---- ikonlar (cizgi tarzi, tek aile)
const P = {
  play: ["fill", '<polygon points="7 4 20 12 7 20 7 4"/>'],
  pause: ["fill", '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>'],
  prev: ["fill", '<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" x2="5" y1="19" y2="5" stroke="currentColor" stroke-width="2"/>'],
  next: ["fill", '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19" stroke="currentColor" stroke-width="2"/>'],
  shuffle: ["", '<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.600 2.200"/><path d="M22 18h-5.900c-1.300 0-2.600-.7-3.300-1.800l-.5-.8"/><path d="m18 14 4 4-4 4"/>'],
  repeat: ["", '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>'],
  repeat1: ["", '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/><path d="M11 10h1v4"/>'],
  heart: ["", '<path d="M19 14c1.490-1.460 3-3.210 3-5.500A5.500 5.500 0 0 0 16.500 3c-1.760 0-3 .5-4.500 2-1.500-1.500-2.740-2-4.500-2A5.500 5.500 0 0 0 2 8.500c0 2.300 1.500 4.050 3 5.500l7 7Z"/>'],
  heartf: ["fill", '<path d="M19 14c1.490-1.460 3-3.210 3-5.500A5.500 5.500 0 0 0 16.500 3c-1.760 0-3 .5-4.500 2-1.500-1.500-2.740-2-4.500-2A5.500 5.500 0 0 0 2 8.500c0 2.300 1.500 4.050 3 5.500l7 7Z"/>'],
  vol: ["", '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.540 8.460a5 5 0 0 1 0 7.070"/><path d="M19.070 4.930a10 10 0 0 1 0 14.140"/>'],
  vol1: ["", '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.540 8.460a5 5 0 0 1 0 7.070"/>'],
  mute: ["", '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>'],
  queue: ["", '<path d="M21 15V6"/><path d="M18.500 18a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5Z"/><path d="M12 12H3"/><path d="M16 6H3"/><path d="M12 18H3"/>'],
  moon: ["", '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'],
  expand: ["", '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>'],
  search: ["", '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.300-4.300"/>'],
  home: ["", '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'],
  library: ["", '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>'],
  sliders: ["", '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>'],
  dl: ["", '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>'],
  more: ["", '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>'],
  plus: ["", '<path d="M5 12h14"/><path d="M12 5v14"/>'],
  x: ["", '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'],
  refresh: ["", '<path d="M3 12a9 9 0 0 1 9-9 9.750 9.750 0 0 1 6.740 2.740L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.750 9.750 0 0 1-6.740-2.740L3 16"/><path d="M8 16H3v5"/>'],
  trash: ["", '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>'],
  mic: ["", '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>'],
  folder: ["", '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.900a2 2 0 0 1-1.690-.9L9.600 3.900A2 2 0 0 0 7.930 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>'],
  chevl: ["", '<path d="m15 18-6-6 6-6"/>'],
  chevr: ["", '<path d="m9 18 6-6-6-6"/>'],
  pencil: ["", '<path d="M17 3a2.850 2.830 0 1 1 4 4L7.500 20.500 2 22l1.500-5.500Z"/>'],
};
const I = n => `<svg class="ic ${P[n][0] === "fill" ? "dolu" : ""}" viewBox="0 0 24 24" aria-hidden="true">${P[n][1]}</svg>`;
document.querySelectorAll("i[data-i]").forEach(e => { e.outerHTML = I(e.dataset.i); });
const hue = id => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

// =============================================================== durum
let L = { tracks: {}, playlists: [], liked: [], plays: {}, recent: [], lists: {}, kapaksiz: 0 };
const S = { base: [], queue: [], qi: -1, liste: null, karisik: false, tekrar: 0, sayildi: false, oneri: null, oneriDenendi: false, sirala: "yeni", hizli: [], araIds: [], sikIds: [] };
const ELEM = [$("#audio"), $("#audio2")]; let audio = ELEM[0]; const main = $("#main");
const T = id => L.tracks[id];
const listeBul = id => L.playlists.find(p => p.id === id);
const calinabilir = ids => ids.filter(i => T(i) && T(i).var);
const tumIndirilenler = () => siralaIdler(Object.values(L.tracks).filter(t => t.var).map(t => t.id));
const listeParcalari = lid => lid === "__begenilen" ? L.liked.filter(T) : lid === "__indirilenler" ? tumIndirilenler() : lid === "__ara" ? S.araIds : lid === "__hizli" ? S.hizli : lid === "__sik" ? S.sikIds : (listeBul(lid) || { tracks: [] }).tracks.filter(T);
function siralaIdler(ids) {
  const k = S.sirala, tr = (a, b) => String(a).localeCompare(String(b), "tr");
  return ids.slice().sort((a, b) => k === "ad" ? tr(T(a).title, T(b).title) : k === "sanatci" ? tr(T(a).artist, T(b).artist) || tr(T(a).title, T(b).title)
    : k === "cok" ? (L.plays[b] || 0) - (L.plays[a] || 0) : (T(b).eklendi || 0) - (T(a).eklendi || 0));
}
async function yukle() { L = await api("/api/kutuphane"); railCiz(); }

// kapak: yerel varsa yerel (internet yok); uzak sadece gorunen uzak kartlarda
function kapakUrl(id, uzak) {
  const t = T(id);
  if (t && t.kapak) return `/api/kapak/${encodeURIComponent(id)}`;
  return uzak ? `/api/kapak/${encodeURIComponent(id)}?uzak=1` : null;
}
const cv = (id, uzak = false) => { const u = kapakUrl(id, uzak); return `<div class="cv" style="--h:${hue(id)}">${u ? `<img loading="lazy" decoding="async" src="${u}" alt="" onerror="this.remove()">` : ""}</div>`; };
function mozaik(ids) {
  ids = ids.filter(i => T(i) && T(i).kapak).slice(0, 4);
  if (ids.length >= 4) return `<div class="mz">${ids.map(i => cv(i)).join("")}</div>`;
  if (ids.length) return `<div class="mz tek">${cv(ids[0])}</div>`;
  return `<div class="mz tek"><div class="cv" style="--h:${hue(String(Math.random()))};width:100%;height:100%"></div></div>`;
}
function kapakAyar(el, id) {
  el.style.setProperty("--h", hue(id || "x")); el.innerHTML = "";
  const u = id && kapakUrl(id); if (u) el.insertAdjacentHTML("beforeend", `<img src="${u}" alt="" onerror="this.remove()">`);
}
function toast(m) { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toast.z); toast.z = setTimeout(() => t.hidden = true, 2200); }

// ---- tema + vurgu rengi (Discord'daki gibi: taban tema + ozel renk; ek olarak kapaktan otomatik renk)
const TEMALAR = [
  ["sistem", "Sistem", null], ["koyu", "Kömür", ["#0a0a0b", "#17171a", "#ececea"]], ["onyx", "Onyx", ["#000", "#111113", "#ececea"]],
  ["ash", "Kül", ["#1a1b1f", "#282a30", "#eceef3"]], ["acik", "Açık", ["#f5f4f1", "#efeee9", "#19191c"]],
  // gradyan temalar: [önizleme arka planı, panel, yazı]; GRAD listesindekiler data-grad alır
  ["gece", "Gece mavimor", ["linear-gradient(48.17deg,#5348ca 11.21%,#140730 61.92%)", "#0000004d", "#f1f0f5"]], ["retro", "Retro yağmur bulutu", ["linear-gradient(148.71deg,#3a7ca1 5.64%,#58579a 26.38%,#58579a 49.92%,#3a7ca1 73.12%)", "#0000004d", "#f1f0f5"]],
  ["lofi", "Lofi ortamı", ["linear-gradient(179.52deg,#a4c0f7 7.08%,#a9e4e8 34.94%,#b0e2b8 65.12%,#cfdfa2 96.23%)", "#0000004d", "#f1f0f5"]], ["elma", "Yeşil elma", ["linear-gradient(180deg,#56b69f 6.15%,#63bc61 48.7%,#9eca67 93.07%)", "#0000004d", "#f1f0f5"]],
  ["mavimor", "Mavimor alacakaranlık", ["linear-gradient(47.61deg,#2c3fe7 11.18%,#261d83 64.54%)", "#0000004d", "#f1f0f5"]], ["alaca", "Alacakaranlık", ["linear-gradient(160deg,#69426a 0%,#111731 100%)", "#0000004d", "#f1f0f5"]],
];
const GRAD = new Set(["gece", "retro", "lofi", "elma", "mavimor", "alaca"]);
const VURGULAR = [["Kum", 35, 38], ["Mercan", 10, 70], ["Adaçayı", 105, 26], ["Gök", 210, 65], ["Lavanta", 260, 60], ["Gül", 335, 60]];
let TEMA = { mod: "sistem", vurgu: "oto" }, TEMA_ISIK = false, AK = "#d9c2a0";
try { Object.assign(TEMA, JSON.parse(localStorage.getItem("tema") || "{}")); } catch { }
const hsl = (h, s) => `hsl(${Math.round(h)} ${Math.round(s)}% ${TEMA_ISIK ? 40 : 72}%)`;
function hexHS(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, clamp((mx ? d / mx : 0) * 100, 25, 75)];
}
function temaUygula() {
  const sistem = matchMedia("(prefers-color-scheme: light)").matches ? "acik" : "koyu";
  const t = TEMA.mod === "sistem" ? sistem : TEMA.mod;
  document.documentElement.dataset.tema = t; TEMA_ISIK = t === "acik";
  if (GRAD.has(t)) document.documentElement.dataset.grad = ""; else delete document.documentElement.dataset.grad;
  vurgu(S.queue[S.qi]);
  try { localStorage.setItem("tema", JSON.stringify(TEMA)); } catch { }
}
matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => TEMA.mod === "sistem" && temaUygula());
const renkOnbellek = {};
function tintUygula() { const p = paletAl(); document.documentElement.style.setProperty("--tint", p.govde); }
function vurgu(id) {
  const koy = c => { AK = c; document.documentElement.style.setProperty("--ak", c); tintUygula(); if (typeof dalgaCiz === "function") dalgaCiz(); };
  const varsayilan = hsl(35, 38);
  if (TEMA.vurgu !== "oto") { const [h, s] = TEMA.vurgu.split(",").map(Number); return koy(hsl(h, s)); }
  const u = id && kapakUrl(id); if (!u) return koy(varsayilan);
  const r = renkOnbellek[id];
  if (r) return r === "gri" ? koy(varsayilan) : koy(hsl(r[0], clamp(r[1], 30, 62)));
  const im = new Image(); im.onload = () => {
    const c = document.createElement("canvas"); c.width = c.height = 24; const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(im, 0, 0, 24, 24); const d = x.getImageData(0, 0, 24, 24).data;
    let rr = 0, g = 0, b = 0, w = 0;
    for (let i = 0; i < d.length; i += 4) { const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]), s = mx ? (mx - mn) / mx : 0, k = s * s * (mx / 255) + .02; rr += d[i] * k; g += d[i + 1] * k; b += d[i + 2] * k; w += k; }
    rr /= w; g /= w; b /= w;
    const mx = Math.max(rr, g, b), mn = Math.min(rr, g, b); let h = 0;
    if (mx !== mn) { const dd = mx - mn; h = mx === rr ? ((g - b) / dd) % 6 : mx === g ? (b - rr) / dd + 2 : (rr - g) / dd + 4; h = (h * 60 + 360) % 360; }
    const sat = clamp((mx - mn) / (mx || 1), 0, 1);
    renkOnbellek[id] = sat < .14 ? "gri" : [h, sat * 100, mx / 255];
    if (S.queue[S.qi] === id && TEMA.vurgu === "oto") vurgu(id);
  }; im.onerror = () => koy(varsayilan); im.src = u; koy(varsayilan);
}

// =============================================================== yan liste
function railCiz() {
  const aktif = (location.hash.match(/^#\/liste\/(.+)$/) || [])[1];
  const sirali = [...L.playlists].sort((a, b) => (L.lists[b.id] || 0) - (L.lists[a.id] || 0) || a.title.localeCompare(b.title, "tr"));
  const satir = (id, ad, alt, ids) => `<a class="rl ${aktif === id ? "on" : ""}" href="#/liste/${esc(id)}">${cv(ids.find(i => T(i) && T(i).kapak) || id)}<div class="mt"><b>${esc(ad)}</b><span>${esc(alt)}</span></div></a>`;
  $("#railListe").innerHTML = satir("__begenilen", "Beğendiklerim", `${L.liked.length} parça`, L.liked) +
    sirali.map(p => satir(p.id, p.title, `${p.tracks.length} parça${p.local ? "" : " · YouTube"}`, p.tracks)).join("");
}
function navIsaretle(ad) { document.querySelectorAll("[data-nav]").forEach(a => a.classList.toggle("on", a.dataset.nav === ad)); }
async function agGuncelle(ag) {
  try { ag = ag || await api("/api/ag"); $("#agKutu").innerHTML = `İnternet<br>bu ay <b>${mbYaz(ag.ay)}</b> · bu oturum <b>${mbYaz(ag.oturum)}</b>`; } catch { }
}

// =============================================================== parca satiri / kartlar
const surukleOk = lid => { const p = listeBul(lid); return !!(p && p.local); };
function satir(id, lid, no) {
  const t = T(id); if (!t) return "";
  const cal = S.queue[S.qi] === id, b = L.liked.includes(id);
  return `<div class="sr ${t.var ? "" : "yok"} ${cal ? "cal" : ""}" ${surukleOk(lid) ? 'draggable="true"' : ""} data-act="satirCal" data-id="${esc(id)}" data-liste="${esc(lid)}">
    <span class="no">${cal ? '<span class="eq"><i></i><i></i><i></i></span>' : no}</span>${cv(id, !t.var)}
    <div class="mt"><b>${esc(t.title)}</b><span>${esc(t.artist)}${t.var ? "" : " · indirilmedi"}</span></div>
    <span class="alb">${esc(t.album)}</span><span class="sn">${sure(t.duration)}</span>
    ${t.var ? `<button class="ib ${b ? "ac" : ""}" data-act="begen" data-id="${esc(id)}" title="Beğen">${I(b ? "heartf" : "heart")}</button>` : `<button class="ib ac" data-act="indir" data-id="${esc(id)}" title="İndir">${I("dl")}</button>`}
    <button class="ib" data-act="menu" data-id="${esc(id)}" data-liste="${esc(lid)}" title="Daha fazla">${I("more")}</button></div>`;
}
const satirBas = () => `<div class="baslik-p"><span style="text-align:center">#</span><span></span><span>Parça</span><span class="alb">Albüm</span><span style="text-align:right">Süre</span><span></span><span></span></div>`;
function parcaKart(id, lid) {
  const t = T(id);
  return `<div class="kt" data-act="satirCal" data-id="${esc(id)}" data-liste="${esc(lid)}"><div class="cvw">${cv(id)}<div class="pl">${I("play")}</div></div><h3>${esc(t.title)}</h3><p>${esc(t.artist)}</p></div>`;
}
function listeKart(p) {
  const ids = p.id === "__begenilen" ? L.liked : p.tracks;
  return `<div class="kt" data-act="git" data-to="#/liste/${esc(p.id)}"><div class="cvw">${mozaik(ids.filter(T))}<div class="pl" data-act="listeCal" data-liste="${esc(p.id)}">${I("play")}</div></div><h3>${esc(p.title)}</h3><p>${ids.length} parça${p.local ? "" : " · YouTube"}</p></div>`;
}
function oneriKart(o, listeli) {
  const var_ = T(o.id) && T(o.id).var;
  return `<div class="kt" style="cursor:default"><div class="cvw"><div class="cv" style="--h:${hue(o.id)}"><img loading="lazy" decoding="async" src="/api/kapak/${encodeURIComponent(o.id)}?uzak=1" alt="" onerror="this.remove()"></div><div class="pl onz" data-act="onizle" data-onz="${esc(o.id)}" data-id="${esc(o.id)}" data-d="${o.duration || 0}" title="Önizle (30 sn)">${I("play")}${I("pause")}</div></div>
   <h3 title="${esc(o.title)}">${esc(o.title)}</h3><p>${esc(o.artist)}${o.duration ? " · " + sure(o.duration) : ""}</p>
   <button class="btn k" data-act="indir" ${var_ ? "disabled" : ""} data-id="${esc(o.id)}" data-t="${esc(o.title)}" data-a="${esc(o.artist)}" data-d="${o.duration || 0}">${var_ ? "İndirildi" : I("dl") + "İndir"}</button>${listeli ? `<button class="btn k" style="margin-left:6px" data-act="araListe" data-id="${esc(o.id)}" data-t="${esc(o.title)}" data-a="${esc(o.artist)}" data-d="${o.duration || 0}" title="İndir ve bir playlist'e ekle">${I("plus")}Playlist</button>` : ""}</div>`;
}

// =============================================================== sayfalar
const GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
// ---- sistem durumu: gerekli dis araclar (pakete dahil degil; winget ile kurulur)
let SIS = null;
async function sistemYukle(yenile) { try { SIS = await api("/api/sistem" + (yenile ? "?yenile=1" : "")); } catch { } return SIS; }
function sisKutu() {
  if (!SIS) return `<div class="kutu" id="sisKutu"><h3>Sistem durumu</h3><p class="not">Kontrol ediliyor…</p></div>`;
  const k = SIS.kurulum || {}, eksik = SIS.araclar.filter(a => !a.var);
  if (SIS.kurulabilir === undefined) SIS.kurulabilir = !!(SIS.winget && SIS.betik);          // eski sunucu surumuyle uyum
  SIS.araclar.forEach(a => { if (!a.komut) a.komut = "winget install --id " + a.winget; });
  const satir = a => `<div class="sis-s"><span class="d ${a.var ? "ok" : "yok"}"></span><b>${esc(a.ad)}</b><span>${a.var ? esc(a.surum || "kurulu") : "kurulu değil"} · ${esc(a.ne)}</span></div>`;
  return `<div class="kutu" id="sisKutu"><h3>Sistem durumu</h3>
   <p>Çalmak için hiçbir şey gerekmez. YouTube'dan indirmek için aşağıdaki araçlar gerekir. Bunlar <b style="color:var(--txt)">uygulamaya dahil değildir</b>; ${SIS.os === "linux" ? "Linux'ta <code>kurulum.sh</code> ile bilgisayarına kurulur (yt-dlp ve deno kendi klasörüne, ffmpeg paket yöneticinle)" : "Windows'un resmi paket yöneticisi (winget) ile kurulur; winget yoksa resmi sürüm sayfalarından uygulamanın kendi <code>araclar</code> klasörüne indirilir"}.</p>
   <div style="margin:12px 0 4px">${SIS.araclar.map(satir).join("")}</div>
   ${eksik.length ? `<p class="not">“Eksikleri kur” şunları yapar: ${eksik.map(a => `<code>${esc(a.komut)}</code>`).join(" · ")}. Betik açık kaynaktır: <code>${SIS.os === "linux" ? "kurulum.sh" : "kurulum.ps1"}</code>. Başka hiçbir şey indirilmez.</p>` : ""}
   ${k.calisiyor ? `<p class="not" style="color:var(--ak)">Kuruluyor… ${esc((k.log || []).slice(-1)[0] || "")}</p>` : ""}
   ${k.hata ? `<p class="not" style="color:var(--uyari)">${esc(k.hata)}</p>` : ""}
   ${!SIS.kurulabilir ? `<p class="not" style="color:var(--uyari)">${SIS.os === "linux" ? "Kurulum betiği çalıştırılamadı (bash ya da kurulum.sh yok). Araçları elle kur (README)." : "winget bulunamadı. Microsoft Store'dan “Uygulama Yükleyici”yi kurup tekrar dene ya da araçları elle kur (README)."}</p>` : ""}
   ${!SIS.pencere ? `<p class="not" style="color:var(--uyari)">${SIS.os === "linux" ? "Chrome/Chromium/Edge bulunamadı" : "Microsoft Edge bulunamadı"}; arayüz varsayılan tarayıcında açılır.</p>` : ""}
   <div class="ip" style="margin-top:12px">${eksik.length ? `<button class="btn on" data-act="sisKur" ${k.calisiyor || !SIS.kurulabilir ? "disabled" : ""}>${I("dl")}Eksikleri kur</button>` : ""}
    <button class="btn" data-act="sisYenile">${I("refresh")}Yeniden kontrol et</button>
    ${SIS.araclar[0].var ? `<button class="btn" data-act="sisGuncelle" ${k.calisiyor ? "disabled" : ""}>yt-dlp'yi güncelle</button>` : ""}</div></div>`;
}
function sisCiz() { const e = $("#sisKutu"); if (e) e.outerHTML = sisKutu(); }
async function sisIzle() {
  for (let i = 0; i < 400; i++) {
    await new Promise(r => setTimeout(r, 2000));
    await sistemYukle(true); sisCiz();
    if (!SIS || !SIS.kurulum || !SIS.kurulum.calisiyor) break;
  }
  if (SIS && !SIS.eksik.length && /^#\/?$/.test(location.hash || "#/")) yonlendir();
}

async function sayfaHome() {
  navIsaretle("home");
  const var_ = Object.values(L.tracks).filter(t => t.var);
  if (!var_.length) {
    main.innerHTML = `<div class="sy" style="max-width:720px"><div class="bas"><span class="eyebrow">Hoş geldin</span><h1 class="b">Vaalz Music</h1></div>
     <p style="color:var(--mut);margin:10px 0 18px">Hafif ve yerel bir müzik çalar. Çalma ve “İndirilenler” hiçbir zaman internet kullanmaz. İstersen YouTube Music playlistlerini içe aktarıp indirebilirsin.</p>
     ${sisKutu()}
     <div class="kutu"><h3>Başlamak için</h3><p><b style="color:var(--txt)">1.</b> Bir playlist linki ekle (YouTube Music, Spotify, Deezer), <b style="color:var(--txt)">2.</b> ya da <b style="color:var(--txt)">keşfetmeye başla</b>: bir şarkı ya da sanatçı ara, beğendiklerini indirip kendi playlistine ekle. Kendi müziklerin varsa <code>Indirilenler</code> klasörüne atman yeter.</p>
      <div class="ip" style="margin-top:12px"><button class="btn on" data-act="linkEkle">${I("plus")}Playlist linki ekle</button><button class="btn on" data-act="kesfet">${I("search")}Keşfetmeye başla</button><button class="btn" data-act="git" data-to="#/kitaplik">Kütüphane</button></div></div></div>`;
    return;
  }
  const son = L.recent.filter(i => T(i) && T(i).var);
  const sik = Object.keys(L.plays).filter(i => T(i) && T(i).var && L.plays[i] > 0).sort((a, b) => L.plays[b] - L.plays[a]).slice(0, 10);
  const d = new Date(), saat = d.getHours(), selam = saat < 6 ? "İyi geceler" : saat < 12 ? "Günaydın" : saat < 18 ? "İyi günler" : "İyi akşamlar";
  const dev = S.queue[S.qi] || son[0] || var_[0].id, dt = T(dev);
  S.hizli = son.slice(0, 14); S.sikIds = sik;
  main.innerHTML = `<div class="sy">
   <div class="bas"><span class="eyebrow">${GUN[d.getDay()]}, ${d.toLocaleDateString("tr", { day: "numeric", month: "long" })}</span><h1 class="b">${selam}</h1></div>
   ${SIS && SIS.eksik.length ? sisKutu() : ""}
   <div class="devam">${cv(dev)}<div><span class="eyebrow">${son.length ? "Kaldığın yer" : "Başlangıç"}</span><h2>${esc(dt.title)}</h2><p>${esc(dt.artist || "Bilinmeyen sanatçı")}</p>
    <div class="bt"><button class="btn on" data-act="satirCal" data-id="${esc(dev)}" data-liste="__indirilenler">${I("play")}Devam et</button><button class="btn" data-act="hepsiKaristir">${I("shuffle")}Tümünü karıştır</button></div></div></div>
   <h2 class="b">Son dinlediklerim</h2>${son.length ? `<div class="satir">${son.slice(0, 14).map(i => parcaKart(i, "__hizli")).join("")}</div>` : `<p class="not">Dinledikçe burada görünecek.</p>`}
   <h2 class="b">Sık dinlediklerim <small>en çok çaldıkların</small></h2>${sik.length ? `<div class="sik">${sik.map((i, n) => `<div class="sk1" data-act="satirCal" data-id="${esc(i)}" data-liste="__sik"><span class="nm">${n + 1}</span>${cv(i)}<div class="mt"><b>${esc(T(i).title)}</b><span>${esc(T(i).artist)}</span></div><span class="ad">${L.plays[i]} dinleme</span></div>`).join("")}</div>` : `<p class="not">Bir parçayı yarıya kadar dinleyince sayılır; dinledikçe sıralama oluşur.</p>`}
   <div id="benzer"></div></div>`;
  benzerCiz();
}
async function benzerCiz() {
  const kutu = $("#benzer"); if (!kutu) return;
  let o; try { o = await api("/api/oneriler"); } catch { return; }
  S.oneri = o;
  const gercek = Object.values(L.tracks).some(t => t.var && !t.id.startsWith("f_"));
  if (L.otomatik_oneri && gercek && (o.eski || !o.liste.length) && !S.oneriDenendi && !o.calisiyor) {
    S.oneriDenendi = true; api("/api/oneriler/yenile", {}).then(izle).catch(() => { });
  }
  const bekle = o.calisiyor || (S.oneriDenendi && !o.liste.length && durumSon && durumSon.mesgul);
  kutu.innerHTML = `<h2 class="b">Dinlediklerine benzer <small>${o.zaman ? new Date(o.zaman * 1000).toLocaleString("tr", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</small><span class="sag"><button class="link" data-act="oneriYenile">Yenile</button></span></h2>
    ${bekle ? `<p class="not">YouTube'dan getiriliyor (birkaç MB)…</p>` : o.liste.length ? `<div class="satir">${o.liste.slice(0, 20).map(oneriKart).join("")}</div><p class="not">Bu bölüm yalnızca Ana Sayfa açıkken ve 24 saatte bir internet kullanır; kapaklar bir kez indirilip saklanır.</p>` : `<p class="not">${L.otomatik_oneri ? "Henüz öneri yok." : "Otomatik öneri kapalı; “Yenile” ile getirebilirsin."}</p>`}`;
}

const sekme = a => `<div class="sekme"><a href="#/kitaplik" class="${a === "p" ? "on" : ""}">Playlistler</a><a href="#/kitaplik/indirilenler" class="${a === "i" ? "on" : ""}">İndirilenler</a></div>`;
function sayfaKitaplik(alt) {
  navIsaretle("kitaplik");
  if (alt === "indirilenler") {
    const ids = tumIndirilenler(), sn = ids.reduce((a, i) => a + (T(i).duration || 0), 0);
    main.innerHTML = `<div class="sy"><div class="bas" style="padding-bottom:0"><span class="eyebrow">Kütüphane</span></div>${sekme("i")}
     <div class="sat" style="margin-top:26px"><div><h1 class="b">İndirilenler</h1><p class="not">${ids.length} parça${sn ? " · " + uzunSure(sn) : ""} · internet kullanmaz, doğrudan diskten çalar</p></div>
      <div class="ip"><button class="btn on" data-act="listeCal" data-liste="__indirilenler">${I("play")}Çal</button><button class="btn" data-act="listeKaristir" data-liste="__indirilenler">${I("shuffle")}Karıştır</button></div></div>
     <div class="sat" style="margin-top:18px"><div class="ip">${L.kapaksiz ? `<button class="btn k" data-act="kapaklar" title="Kapağı olmayan parçaların kapakları bir kez indirilir">Eksik kapaklar (${L.kapaksiz}) · ~${(L.kapaksiz * .08).toFixed(1)} MB</button>` : ""}<button class="btn k" data-act="tara">${I("refresh")}Klasörü tara</button><button class="btn k" data-act="klasorAc">${I("folder")}Klasörü aç</button></div>
      <select class="inp" id="sirala" style="width:170px;height:32px">${[["yeni", "Son eklenen"], ["ad", "Ada göre"], ["sanatci", "Sanatçıya göre"], ["cok", "Çok dinlenen"]].map(([k, a]) => `<option value="${k}" ${S.sirala === k ? "selected" : ""}>${a}</option>`).join("")}</select></div>
     <div id="isPanel"></div>
     ${ids.length ? satirBas() + ids.map((i, n) => satir(i, "__indirilenler", n + 1)).join("") : `<div class="bos"><h2>Henüz indirilen yok</h2><p>Playlist sayfasından indirebilir ya da dosyaları Indirilenler klasörüne atıp “Klasörü tara”ya basabilirsin.</p></div>`}</div>`;
  } else {
    const lists = [{ id: "__begenilen", title: "Beğendiklerim", tracks: L.liked, local: true }, ...L.playlists];
    main.innerHTML = `<div class="sy"><div class="bas" style="padding-bottom:0"><span class="eyebrow">Kütüphane</span></div>${sekme("p")}
     <div class="sat" style="margin-top:22px"><p class="not" style="margin:0">${L.playlists.length} playlist</p><div class="ip"><button class="btn on k" data-act="linkEkle">${I("plus")}Linkten ekle</button><button class="btn k" data-act="kontrol" title="Playlistleri YouTube'dan okur (~0,4 MB/liste)">${I("refresh")}Hepsini güncelle</button></div></div>
     <div id="isPanel"></div>
     <div class="pg" style="margin-top:18px"><div class="yeni-k" data-act="linkEkle"><div>${I("dl")}Linkten ekle (YouTube, Spotify, Deezer)</div></div><div class="yeni-k" data-act="yeniListe"><div>${I("plus")}Yeni playlist</div></div>${lists.map(listeKart).join("")}</div></div>`;
  }
  panelCiz(durumSon);
}

function sayfaListe(id) {
  navIsaretle("");
  const sabit = id === "__begenilen";
  const p = sabit ? { id, title: "Beğendiklerim", tracks: L.liked, local: false, sabit: true } : listeBul(id);
  if (!p) { main.innerHTML = `<div class="bos"><h2>Playlist bulunamadı</h2></div>`; return; }
  const ids = p.tracks.filter(T), sn = ids.reduce((a, i) => a + (T(i).duration || 0), 0);
  const eksik = ids.filter(i => !T(i).var), mb = eksik.reduce((a, i) => a + (T(i).duration || 210) / 60 * (L.veri_tasarrufu ? 1 : 2) + (i.startsWith("q_") ? .5 : 0), 0);
  main.innerHTML = `<div class="sy"><div class="ph">${mozaik(ids)}<div><span class="eyebrow">${sabit ? "Otomatik playlist" : p.local ? "Senin playlistin" : "YouTube Music playlisti"}</span><h1 class="b">${esc(p.title)}</h1>
   <p>${ids.length} parça${sn ? " · " + uzunSure(sn) : ""}${eksik.length ? ` · <span style="color:var(--ak)">${eksik.length} tanesi indirilmedi</span>` : ""}</p>
   <div class="bt"><button class="btn on" data-act="listeCal" data-liste="${esc(p.id)}">${I("play")}Çal</button><button class="btn" data-act="listeKaristir" data-liste="${esc(p.id)}">${I("shuffle")}Karıştır</button>
    ${eksik.length ? `<button class="btn" data-act="listeIndir" data-liste="${esc(p.id)}" data-n="${eksik.length}" data-mb="${mb.toFixed(0)}">${I("dl")}Eksikleri indir · ~${mb.toFixed(0)} MB</button>` : ""}
    ${!p.local && !sabit ? `<button class="btn" data-act="kontrol" data-url="${esc(p.url)}">${I("refresh")}Güncelle</button><button class="btn" data-act="listeKaldir" data-liste="${esc(p.id)}">${I("trash")}Takibi bırak</button>` : ""}
    ${p.local && !sabit ? `<button class="btn" data-act="listeAd" data-liste="${esc(p.id)}">${I("pencil")}Adı değiştir</button><button class="btn" data-act="listeSil" data-liste="${esc(p.id)}">${I("trash")}Sil</button>` : ""}</div></div></div>
   <div id="isPanel"></div>
   ${ids.length ? satirBas() + ids.map((i, n) => satir(i, p.id, n + 1)).join("") : `<div class="bos"><h2>Bu playlist boş</h2><p>Parçaların ⋯ menüsünden “Playlist'e ekle” ile doldurabilirsin.</p></div>`}</div>`;
  panelCiz(durumSon);
}

function sayfaAra(q) {
  navIsaretle("");
  const k = q.toLocaleLowerCase("tr");
  const parcalar = Object.values(L.tracks).filter(t => (t.title + " " + t.artist + " " + t.album).toLocaleLowerCase("tr").includes(k)).sort((a, b) => b.var - a.var);
  const listeler = L.playlists.filter(p => p.title.toLocaleLowerCase("tr").includes(k));
  S.araIds = parcalar.filter(t => t.var).map(t => t.id);
  main.innerHTML = `<div class="sy"><div class="bas"><span class="eyebrow">Arama</span><h1 class="b">${esc(q)}</h1></div>
   <div class="ip" style="margin-top:10px"><button class="btn on" data-act="apiAra" data-q="${esc(q)}">${I("search")}YouTube'da ara</button><span class="not" style="margin:0">hesap ya da anahtar gerekmez · her arama ~0,5 MB internet</span></div>
   ${listeler.length ? `<h2 class="b">Playlistler</h2><div class="satir">${listeler.map(listeKart).join("")}</div>` : ""}
   <h2 class="b">Kütüphanende <small>${parcalar.length} parça · internet kullanılmaz</small></h2>
   ${parcalar.length ? parcalar.slice(0, 80).map((t, n) => satir(t.id, "__ara", n + 1)).join("") : `<p class="not">Kütüphanende eşleşme yok.</p>`}
   <div id="apiSonuc"></div></div>`;
}
async function araIndirEkle(listeId, yeniAd) {
  const p = S.araParca; if (!p) return;
  try {
    await api("/api/indir", { id: p.id, title: p.title, artist: p.artist, duration: p.duration });
    let ad;
    if (yeniAd) { const r = await api("/api/liste/yeni", { title: yeniAd, parca: p.id }); listeId = r.id; ad = yeniAd; }
    else { await api("/api/liste/ekle", { id: listeId, parca: p.id }); ad = (listeBul(listeId) || {}).title || "playlist"; }
    await yukle(); toast(`“${p.title}” indiriliyor ve “${ad}” playlistine eklenecek`); izle();
  } catch (e) { toast(e.message); }
}
function araListeModal() {
  const yerel = L.playlists.filter(p => p.local);
  modalAc(`<h3>İndir ve playlist'e ekle</h3><p class="not" style="margin:0 0 10px">${esc(S.araParca.title)}</p>${yerel.map(p => `<a class="rl" data-act="araListeSec" data-liste="${esc(p.id)}">${cv(p.tracks.find(i => T(i) && T(i).kapak) || p.id)}<div class="mt"><b>${esc(p.title)}</b><span>${p.tracks.length} parça</span></div></a>`).join("") || `<p class="not">Henüz kendi playlistin yok; yeni bir tane oluştur.</p>`}
   <div class="ip"><button class="btn" data-act="modalKapat">Kapat</button><button class="btn on" data-act="araYeniListe">${I("plus")}Yeni playlist</button></div>`);
}
async function apiAra(q) {
  const kutu = $("#apiSonuc"); kutu.innerHTML = `<p class="not" style="margin-top:24px">YouTube'da aranıyor…</p>`;
  try {
    const { sonuclar } = await api("/api/ara?q=" + encodeURIComponent(q));
    agGuncelle();
    kutu.innerHTML = `<h2 class="b">YouTube sonuçları <small>indirmek için</small></h2><div class="satir" style="flex-wrap:wrap;row-gap:22px">${sonuclar.map(s => oneriKart(s, true)).join("") || "<p class='not'>Sonuç yok.</p>"}</div>`;
  } catch (e) { kutu.innerHTML = `<div class="kutu"><div class="hata">${esc(e.message)}</div></div>`; }
}

async function sayfaAyarlar() {
  navIsaretle("ayarlar");
  const a = await api("/api/ayarlar"), ag = await api("/api/ag");
  if (decodeURIComponent(location.hash) !== "#/ayarlar") return;
  main.innerHTML = `<div class="sy" style="max-width:720px"><div class="bas"><span class="eyebrow">Tercihler</span><h1 class="b">Ayarlar</h1></div>
   <div class="kutu"><h3>İnternet kullanımı (yaklaşık)</h3><p>Bu ay <b style="color:var(--txt)">${mbYaz(ag.ay)}</b> · bu oturum <b style="color:var(--txt)">${mbYaz(ag.oturum)}</b>. Müzik çalma ve İndirilenler hiçbir zaman internet kullanmaz; sayaç yalnızca indirme, senkron, öneri, arama ve uzak kapakları sayar.</p></div>
   ${sisKutu()}
   <h2 class="b" style="margin-top:30px">Görünüm</h2>
   <div class="temalar">${TEMALAR.map(([k, ad, r]) => `<button class="tema ${TEMA.mod === k ? "on" : ""}" data-act="tema" data-k="${k}"><div class="on-izle" style="${r ? `background:${r[0]};--pa:var(--ak);--pt:${r[2]}33;--px:${r[2]}` : "background:linear-gradient(105deg,#0a0a0b 50%,#f5f4f1 50%);--pa:var(--ak);--pt:#8888;--px:#888"}"><i style="background:${r ? r[1] : "#17171a"};${r ? "" : "opacity:.9"}"></i><i></i><em></em><u></u><b></b></div><span>${ad}</span></button>`).join("")}</div>
   <label class="f">Vurgu rengi <small>çubuk, çalan parça ve kalp için</small></label>
   <div class="vurgular"><button class="vr oto ${TEMA.vurgu === "oto" ? "on" : ""}" data-act="vurgu" data-k="oto" title="Çalan parçanın kapağından">Kapaktan</button>
    ${VURGULAR.map(([ad, h, s]) => `<button class="vr ${TEMA.vurgu === h + "," + s ? "on" : ""}" style="background:hsl(${h} ${s}% 66%)" data-act="vurgu" data-k="${h},${s}" title="${ad}"></button>`).join("")}
    <input type="color" class="vr" id="ozelRenk" value="#8fb8e8" title="Özel renk"></div>
   <h2 class="b" style="margin-top:34px">Ses ve oynatma</h2>
   <label class="f" style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="eqOn" ${AY.eq ? "checked" : ""}> Ekolayzır</label>
   <div class="ip"><select class="inp" id="eqPre" style="width:190px">${Object.entries(EQ_ONAYAR).map(([k, [ad]]) => `<option value="${k}" ${AY.onayar === k ? "selected" : ""}>${ad}</option>`).join("")}<option value="ozel" ${AY.onayar === "ozel" ? "selected" : ""}>Özel</option></select><span class="not" style="margin:0">Açıkken yükselmeler otomatik ön kazançla dengelenir</span></div>
   <div class="ekoz">${EQ_HZ.map((f, i) => `<div class="eqk"><span>${AY.bant[i] > 0 ? "+" : ""}${AY.bant[i]}</span><input type="range" class="eq-k" orient="vertical" min="-12" max="12" step="1" value="${AY.bant[i]}" data-b="${i}"><em>${f >= 1000 ? f / 1000 + "k" : f}</em></div>`).join("")}</div>
   <label class="f" style="display:flex;gap:10px;align-items:center;margin-top:26px"><input type="checkbox" id="esitleOn" ${AY.esitle ? "checked" : ""}> Ses eşitleme <small>parçalar arası ses farkını dengeler</small></label>
   <div class="ip"><select class="inp" id="esitleHedef" style="width:190px">${[[-16, "Sessiz (-16 LUFS)"], [-14, "Dengeli (-14 LUFS)"], [-12, "Yüksek (-12 LUFS)"]].map(([v, a]) => `<option value="${v}" ${AY.hedef === v ? "selected" : ""}>${a}</option>`).join("")}</select><span class="not" style="margin:0" id="esitleDurum"></span></div>
   <label class="f">Parçalar arası geçiş <small id="cfSn">${AY.cf ? AY.cf + " sn" : "kapalı"}</small></label><input type="range" id="cfR" min="0" max="12" step="1" value="${AY.cf}" style="width:260px;accent-color:var(--ak)">
   <label class="f">İlerleme çubuğu stili</label><select class="inp" id="cubukStil" style="width:260px"><option value="dalga" ${AY.stil === "dalga" ? "selected" : ""}>Renkli dalga</option><option value="form" ${AY.stil === "form" ? "selected" : ""}>Ses dalga formu</option></select>
   <label class="f" style="margin-top:34px">YouTube araması <small>hesap ya da API anahtarı gerekmez</small></label><p class="not" style="margin-top:0">Arama kutusuna yazıp “YouTube'da ara”ya basınca yt-dlp ile aranır; sonuçlardan indirip playlistine ekleyebilirsin.</p>
   <label class="f">Playlistler <small>her satıra bir link</small></label><textarea class="inp" id="aListe">${esc(a.playlists.join("\n"))}</textarea>
   <h2 class="b" style="margin-top:34px">İndirme</h2>
   <p class="not" style="margin-top:0">Varsayılan bicim <b>FLAC</b> (kayıpsız, hızlı). Biçim seçmene gerek yok.</p>
   <label class="f" style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="aTasarruf" ${a.veri_tasarrufu ? "checked" : ""}> Veri tasarrufu modu</label>
   <p class="not" style="margin-top:0">Açıkken YouTube'un en küçük ses akışı (~130 kbps AAC) indirilir ve <b>M4A</b> olarak saklanır; dönüştürme yapılmaz. Premium 256 kbps akışına göre yaklaşık yarı kadar internet harcar, kalite biraz düşer. İnterneti belirleyen kaynak akıştır: FLAC'a ya da MP3'e çevirmek veri miktarını değiştirmez.</p>
   <label class="f">Aynı anda indirme <small id="esN">${a.es_zamanli} parça</small></label><input type="range" id="aEs" min="1" max="8" step="1" value="${a.es_zamanli}" style="width:260px;accent-color:var(--ak)">
   <p class="not">Her parçanın başlangıcı birkaç saniye sürer (YouTube'un doğrulaması); asıl indirme ~1 sn. Eşzamanlı indirme bu bekleyişi paylaştırır. 4 önerilir; YouTube yavaşlatırsa (çok istek uyarısı) düşür.</p>
   <label class="f">Çerezler için tarayıcı <small>Premium 256 kbps ses için YouTube'a girişli tarayıcı; boş = kapalı</small></label><input class="inp" id="aCerez" value="${esc(a.cookies_browser)}" placeholder="firefox">
   <label class="f">İndirilenler klasörü</label><div class="ip"><input class="inp" disabled value="${esc(a.indirilenler)}" style="flex:1"><button class="btn" data-act="klasorAc">${I("folder")}Klasörü aç</button></div><p class="not">Müzikler bu klasörde (alt klasörler dahil) durur. Buradan elle sildiğin dosya, uygulama yenilendiğinde kütüphaneden düşer; playlistler kalır.</p>
   <label class="f" style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="aOneri" ${a.otomatik_oneri ? "checked" : ""}> Ana Sayfa'da benzer parçaları otomatik getir (24 saatte bir)</label>
   <div class="ip" style="margin-top:26px"><button class="btn on" data-act="ayarKaydet">Kaydet</button><span id="aMsg" class="not" style="margin:0"></span></div></div>`;
}

// =============================================================== yonlendirme
async function yonlendir() {
  const h = decodeURIComponent(location.hash || "#/"); railCiz(); agGuncelle();
  let m;
  if (h === "#/" || h === "#") await sayfaHome();
  else if (h === "#/kitaplik") sayfaKitaplik("");
  else if (h === "#/kitaplik/indirilenler") sayfaKitaplik("indirilenler");
  else if (h === "#/ayarlar") await sayfaAyarlar();
  else if ((m = h.match(/^#\/liste\/(.+)$/))) sayfaListe(m[1]);
  else if ((m = h.match(/^#\/ara\/(.*)$/))) sayfaAra(m[1]);
  else await sayfaHome();
}
window.addEventListener("hashchange", () => { yonlendir(); main.scrollTop = 0; });

// =============================================================== ses motoru: %200'e kadar ses, ekolayzir, ses esitleme, gecis (crossfade)
let ctx = null, gainN = null, comp = null, pre = null, boostBagli = false, V = 0.8, sessizMi = false, gecisV = false;
const AY = Object.assign({ eq: false, bant: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], onayar: "duz", esitle: true, hedef: -14, cf: 0, stil: "dalga" }, (() => { try { return JSON.parse(localStorage.getItem("ses_ayar") || "{}"); } catch { return {}; } })());
const ayKaydet = () => { try { localStorage.setItem("ses_ayar", JSON.stringify(AY)); } catch { } };
const EQ_HZ = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const EQ_ONAYAR = { duz: ["Düz", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], bas: ["Bas artır", [6, 5, 4, 2, 0, 0, 0, 0, 0, 0]], tiz: ["Tiz artır", [0, 0, 0, 0, 0, 0, 2, 4, 5, 6]], vokal: ["Vokal", [-2, -2, -1, 1, 3, 4, 3, 1, 0, -1]], akustik: ["Akustik", [3, 3, 2, 1, 1, 1, 2, 2, 3, 2]], elektronik: ["Elektronik", [5, 4, 1, 0, -2, 2, 1, 2, 4, 5]], rock: ["Rock", [4, 3, 2, 0, -1, -1, 1, 3, 4, 4]], hiphop: ["Hip-hop", [5, 5, 3, 1, -1, -1, 1, 0, 2, 3]] };
let eqN = [], xg = [null, null];
function sesZinciri() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "playback" });
    gainN = ctx.createGain(); pre = ctx.createGain(); comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -4; comp.knee.value = 3; comp.ratio.value = 14; comp.attack.value = .002; comp.release.value = .18;
    eqN = EQ_HZ.map((f, i) => { const b = ctx.createBiquadFilter(); b.type = i === 0 ? "lowshelf" : i === 9 ? "highshelf" : "peaking"; b.frequency.value = f; b.Q.value = 1.1; b.gain.value = 0; return b; });
    for (let i = 0; i < 9; i++) eqN[i].connect(eqN[i + 1]);
    eqN[9].connect(pre); pre.connect(gainN); gainN.connect(ctx.destination);
    ELEM.forEach((el, i) => { const k = ctx.createMediaElementSource(el), g = ctx.createGain(); k.connect(g); g.connect(eqN[0]); xg[i] = g; g.gain.value = i === ELEM.indexOf(audio) ? normKaz(S.queue[S.qi]) : 0; });
    eqUygula();
  } catch { ctx = null; }
}
function normKaz(id) {                 // parca basina ses esitleme kazanci (hedef LUFS'a gore)
  const t = id && T(id); if (!AY.esitle || !t || t.lufs == null || t.lufs <= -90) return 1;
  return clamp(Math.pow(10, (AY.hedef - t.lufs) / 20), .12, 4);
}
function normUygula() {
  if (!ctx) return; const id = S.queue[S.qi], ai = ELEM.indexOf(audio), t = ctx.currentTime;
  if (!gecisV) { xg[ai].gain.cancelScheduledValues(t); xg[ai].gain.setTargetAtTime(normKaz(id), t, .05); }
  limitle();
}
function eqUygula() {
  if (!ctx) return; const t = ctx.currentTime;
  eqN.forEach((b, i) => b.gain.setTargetAtTime(AY.eq ? AY.bant[i] : 0, t, .03));
  pre.gain.setTargetAtTime(AY.eq ? Math.pow(10, -Math.max(0, ...AY.bant) / 20) : 1, t, .03);   // kirpilmayi onlemek icin on kazanc
  limitle();
}
function limitle() {                    // >%100 ses, esitleme yukseltmesi ya da EQ artisi varsa sinirlayici araya girer
  if (!ctx) return;
  const gerek = (sessizMi ? 0 : V) > 1 || normKaz(S.queue[S.qi]) > 1.01 || (AY.eq && Math.max(...AY.bant) > 0);
  if (gerek !== boostBagli) { gainN.disconnect(); if (gerek) { gainN.connect(comp); comp.connect(ctx.destination); } else gainN.connect(ctx.destination); boostBagli = gerek; }
}
function sesUygula() {
  const g = sessizMi ? 0 : V;
  if (!ctx) { audio.volume = clamp(g, 0, 1); }
  else { ELEM.forEach(e => { e.volume = 1; }); gainN.gain.setTargetAtTime(g, ctx.currentTime, .015); limitle(); }
  const yuz = Math.round(V * 100), el = $("#ses");
  el.value = yuz; el.style.setProperty("--p", yuz / 2 + "%"); el.classList.toggle("boost", V > 1);
  $("#sesYuzde").textContent = sessizMi ? "0%" : yuz + "%"; $("#sesYuzde").classList.toggle("boost", V > 1 && !sessizMi);
  $("#btnSes").innerHTML = I(sessizMi || V === 0 ? "mute" : V < .5 ? "vol1" : "vol");
  try { localStorage.setItem("ses", yuz); } catch { }
}
const ileriIndeks = () => { if (S.qi + 1 < S.queue.length) return S.qi + 1; if (S.tekrar === 1) { if (S.karisik) S.queue = karistirDizi(S.base); return 0; } return -1; };
function gecisBaslat(ni) {              // crossfade: iki ses elemani, esit guc egrisi
  const id = S.queue[ni]; if (!ctx || gecisV || !id || !T(id) || !T(id).var) return false;
  gecisV = true;
  const eski = audio, yeni = ELEM[eski === ELEM[0] ? 1 : 0], ei = ELEM.indexOf(eski), yi = ELEM.indexOf(yeni), cf = AY.cf, t = ctx.currentTime, ng = normKaz(id);
  const yukari = new Float32Array(64), asagi = new Float32Array(64), eg = xg[ei].gain.value;
  for (let i = 0; i < 64; i++) { const u = i / 63; yukari[i] = Math.sin(u * Math.PI / 2) * ng; asagi[i] = Math.cos(u * Math.PI / 2) * eg; }
  yeni.src = "/api/parca/" + encodeURIComponent(id); yeni.currentTime = 0; S.sayildi = false;
  xg[yi].gain.cancelScheduledValues(t); xg[yi].gain.setValueAtTime(0, t); xg[yi].gain.setValueCurveAtTime(yukari, t, cf);
  xg[ei].gain.cancelScheduledValues(t); xg[ei].gain.setValueAtTime(eg, t); xg[ei].gain.setValueCurveAtTime(asagi, t, cf);
  yeni.play().catch(() => { });
  S.qi = ni; audio = yeni; bilgi(); oturumKaydet();
  setTimeout(() => { if (audio !== eski) { eski.pause(); eski.removeAttribute("src"); eski.load(); } gecisV = false; limitle(); }, cf * 1000 + 150);
  return true;
}
$("#ses").addEventListener("input", e => { V = e.target.value / 100; sessizMi = false; sesUygula(); });
$("#ses").closest(".sesk").addEventListener("wheel", e => { e.preventDefault(); V = clamp(V + (e.deltaY < 0 ? .05 : -.05), 0, 2); sessizMi = false; sesUygula(); }, { passive: false });
try { const v = localStorage.getItem("ses"); if (v !== null) V = clamp(+v / 100, 0, 2); } catch { }

// =============================================================== dalgali ilerleme cubugu (VLC gibi: surukledikce aninda, calmaya devam eder)
const dalgalar = [];
// Dalga: cubuk duz kalir; cubugun ustunde 5 yari saydam katman farkli frekans/faz/yukseklikte kayar.
//  * katman i: frekans, faz ve yukseklik KATMAN tablosunda; renkler paletAl() icinde ana renkten HSL ile uretilir
//  * dalga yalnizca calarken gorunur; genislik olcegi ilerleme azken kucuk, genisleyince 1
const bez = (x1, y1, x2, y2) => t => {
  if (t <= 0) return 0; if (t >= 1) return 1; let u = t;
  for (let i = 0; i < 8; i++) { const x = 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3 - t, d = 3 * x1 * (1 - u) ** 2 + 6 * (x2 - x1) * u * (1 - u) + 3 * (1 - x2) * u * u; if (Math.abs(x) < 1e-5) break; u -= x / (d || 1); }
  return 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u * u * (1 - u) + u ** 3;
};
const ENV_IN = bez(.3, .2, .6, 1), ENV_OUT = bez(.3, .2, .6, 1);
const KATMAN = { faz: [0, 1.1, 2.3, 3.5, 4.8], yuk: [1, .82, .66, .52, .4], frek: [.8, 1.0, 1.4, 1.8, 2.1], hiz: .55, dongu: 3 };
function renkAyir(c) {
  let m = /hsl\(\s*([\d.]+)\s+([\d.]+)%/.exec(c);
  if (m) return [+m[1], +m[2]];
  m = /#([0-9a-f]{6})/i.exec(c); return m ? hexHS("#" + m[1]) : [35, 38];
}
let _pal = { ak: "", v: null };
function paletAl() {
  if (_pal.ak === AK + TEMA_ISIK) return _pal.v;
  const [h, s0] = renkAyir(AK), S = Math.max(s0, 62), L = TEMA_ISIK ? 48 : 58;
  const v = [[`hsla(${h},${S}%,${L}%,.9)`, "lighter"], ["rgba(255,255,255,.9)", "overlay"], [`hsla(${h},${S * .95}%,${TEMA_ISIK ? 66 : 79}%,1)`, "source-over"],
    [`hsla(${h},95%,${TEMA_ISIK ? 50 : 56}%,.9)`, "screen"], [`hsla(${h},${S}%,${TEMA_ISIK ? 36 : 45}%,1)`, "source-over"]];
  v.govde = `hsl(${h},${S}%,${L}%)`; v.isik = `hsla(${h},${S}%,${L}%,.6)`;
  _pal = { ak: AK + TEMA_ISIK, v }; return v;
}
// kubbe egrisi: (r,0) -> (bw/2,1) -> (bw,0) iki ikinci derece Bezier; yay uzunluguna gore orneklenir
function kubbe(bw, r) {
  const pts = [[r, 0]], q = (p0, p1, p2, t) => [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]];
  const seg = (a, c, b) => { for (let i = 1; i <= 24; i++) pts.push(q(a, c, b, i / 24)); };
  seg([r, 0], [r, 1], [bw / 2, 1]); seg([bw / 2, 1], [bw, 1], [bw, 0]);
  const len = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = len[len.length - 1] || 1;
  return f => { const d = clamp(f, 0, 1) * L; let i = 1; while (i < len.length - 1 && len[i] < d) i++; const u = (d - len[i - 1]) / ((len[i] - len[i - 1]) || 1); return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * clamp(u, 0, 1); };
}
let ZIRVE = { id: null, z: null };
async function zirveYukle(id) {
  if (AY.stil !== "form" || !id || ZIRVE.id === id) return; ZIRVE = { id, z: null };
  try { const r = await api("/api/zirve/" + encodeURIComponent(id)); if (ZIRVE.id === id) { ZIRVE.z = r.z; dalgaCiz(); } } catch { }
}
class Dalga {
  constructor(cvs, o) {
    this.c = cvs; this.x = cvs.getContext("2d"); this.o = Object.assign({ olcek: 1.1, koyu: false }, o);
    this.dp = this.o.olcek; this.mot = 0; this.ws = 1; this.t0 = performance.now(); this.acik = false;
    this.surukle = false; this.uzerinde = false; this.f = 0; this.sonSeek = 0;
    this.boyutla(); new ResizeObserver(() => this.boyutla()).observe(cvs);
    cvs.addEventListener("pointerdown", e => { cvs.setPointerCapture(e.pointerId); this.surukle = true; this.git(e, true); });
    cvs.addEventListener("pointermove", e => { this.uzerinde = true; if (this.surukle) this.git(e, false); this.ipucu(e); });
    cvs.addEventListener("pointerup", e => { if (this.surukle) { this.git(e, true); this.surukle = false; } this.ciz(); });
    cvs.addEventListener("pointercancel", () => { this.surukle = false; });
    cvs.addEventListener("pointerleave", () => { this.uzerinde = false; $("#ipucu").hidden = true; this.ciz(); });
    cvs.addEventListener("keydown", e => { if (e.key === "ArrowRight") audio.currentTime += 5; else if (e.key === "ArrowLeft") audio.currentTime -= 5; });
    dalgalar.push(this);
  }
  boyutla() { const d = devicePixelRatio || 1, r = this.c.getBoundingClientRect(); this.w = r.width; this.h = r.height; this.c.width = Math.round(r.width * d); this.c.height = Math.round(r.height * d); this.x.setTransform(d, 0, 0, d, 0, 0); this.ciz(); }
  oran(e) { const r = this.c.getBoundingClientRect(), p = 7 * this.dp; return clamp((e.clientX - r.left - p) / (r.width - 2 * p), 0, 1); }
  git(e, kesin) {
    const f = this.oran(e), d = audio.duration; if (!d) return; this.f = f;
    const simdi = performance.now();
    if (kesin || simdi - this.sonSeek > 40) { audio.currentTime = f * d; this.sonSeek = simdi; }   // surukledikce anlik seek, ses akmaya devam eder
    zamanYaz(f * d); this.ipucu(e); dalgaCiz();
  }
  ipucu(e) { const d = audio.duration; if (!d) return; const t = $("#ipucu"), r = this.c.getBoundingClientRect(); t.textContent = sure(this.oran(e) * d); t.style.left = clamp(e.clientX, r.left + 20, r.right - 20) + "px"; t.style.top = r.top - 2 + "px"; t.hidden = false; }
  adim(simdi, dt, cal) {
    this.acik = cal;
    this.mot += ((cal ? 1 : 0) - this.mot) * (1 - Math.exp(-dt * 7)); if (Math.abs((cal ? 1 : 0) - this.mot) < .004) this.mot = cal ? 1 : 0;
    const d = audio.duration || 0, p = this.surukle ? this.f : (d ? audio.currentTime / d : 0), bw = p * (this.w - 14 * this.dp), W = this.w - 14 * this.dp;
    const hedef = bw < 7 * this.dp ? .1 : bw < W / 6 ? .3 : 1; this.ws += (hedef - this.ws) * (1 - Math.exp(-dt * 12));
  }
  cizForm(x, w, h, dp, pad, W, p, pal) {
    const kal = 3 * dp, bosluk = 2 * dp, n = Math.max(20, Math.floor(W / (kal + bosluk))), z = ZIRVE.z, maxH = h - 10 * dp, cy = h / 2 + dp, tx = pad + p * W, cal = this.mot;
    x.lineWidth = kal;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), px = pad + u * W, k = u * (z.length - 1), j = Math.floor(k), v = (z[j] * (1 - (k - j)) + (z[Math.min(z.length - 1, j + 1)] || 0) * (k - j));
      const yuk = Math.max(2 * dp, Math.pow(v, .8) * maxH * (.92 + .08 * Math.sin(i * .7 + performance.now() / 380) * cal));
      x.strokeStyle = px <= tx ? pal.govde : (this.o.koyu ? "rgba(252,252,252,.28)" : cssRenk("--trk")); x.beginPath(); x.moveTo(px, cy - yuk / 2); x.lineTo(px, cy + yuk / 2); x.stroke();
    }
    x.strokeStyle = "#fff"; x.lineWidth = 2.4 * dp; x.beginPath(); x.moveTo(tx, cy - maxH / 2 - 2 * dp); x.lineTo(tx, cy + maxH / 2 + 2 * dp); x.stroke();
  }
  hareketli() { return this.acik || this.mot > 0; }
  ciz() {
    const x = this.x, w = this.w, h = this.h, dp = this.dp, T = 5 * dp, yarim = T / 2, pad = 7 * dp, W = w - 2 * pad;
    if (!W || W < 20) return;
    const d = audio.duration || 0, p = clamp(this.surukle ? this.f : (d ? audio.currentTime / d : 0), 0, 1);
    const bw = p * W, tx = pad + bw, cy = h - 14 * dp - 1, ust = cy - yarim, pal = paletAl();
    x.clearRect(0, 0, w, h); x.lineCap = "round"; x.lineJoin = "round";
    if (AY.stil === "form" && ZIRVE.z && ZIRVE.id === S.queue[S.qi]) return this.cizForm(x, w, h, dp, pad, W, p, pal);
    // 1) kalan kisim: duz soluk cizgi
    if (tx + 9 * dp < w - pad) { x.strokeStyle = this.o.koyu ? "rgba(252,252,252,.34)" : cssRenk("--trk"); x.lineWidth = T; x.beginPath(); x.moveTo(tx + 9 * dp, cy); x.lineTo(w - pad, cy); x.stroke(); }
    // 2) oynanan kisim: duz kalin cubuk
    if (bw > 0) { x.strokeStyle = pal[0][0]; x.lineWidth = T; x.beginPath(); x.moveTo(pad, cy); x.lineTo(tx, cy); x.stroke(); }
    // 3) dalga katmanlari: cubugun ustunde, yari saydam dolgu alanlari
    if (this.mot > .002 && bw > yarim * 2) {
      const sc = kubbe(bw, yarim), tf = (performance.now() - this.t0) / 1000 * -8, orta = (bw - yarim) * .5 + yarim, a0 = 5 * dp;
      for (let i = 0; i < 5; i++) {
        const a = a0 * KATMAN.yuk[i], genlik = this.mot * this.ws;
        if (genlik * a < .3) continue;
        const faz = tf * KATMAN.hiz + KATMAN.faz[i], fr = KATMAN.frek[i] * Math.PI * 2 * KATMAN.dongu / W;
        x.beginPath(); x.moveTo(pad, ust);
        for (let xi = 0; xi <= bw; xi += 2) {
          const s = Math.sin(fr * xi + faz), c = sc(xi / bw);
          const v = (a * c * s - a) * c * genlik;
          const env = xi <= yarim ? 0 : xi <= orta ? ENV_IN((xi - yarim) / orta) : ENV_OUT(1 - (xi - yarim - orta) / orta);
          x.lineTo(pad + xi, ust + env * v);
        }
        x.lineTo(tx, ust); x.lineTo(pad, ust); x.closePath();
        x.globalCompositeOperation = pal[i][1]; x.fillStyle = pal[i][0]; x.fill();
      }
      x.globalCompositeOperation = "source-over";
    }
    // 4) thumb: isik + dolgu + beyaz halka
    const g = x.createRadialGradient(tx, cy, 0, tx, cy, 14 * dp); g.addColorStop(0, pal.isik); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.beginPath(); x.arc(tx, cy, 14 * dp, 0, 7); x.fill();
    const tr = this.surukle || this.uzerinde ? 7.6 * dp : 7 * dp;
    x.fillStyle = pal.govde; x.beginPath(); x.arc(tx, cy, tr - dp, 0, 7); x.fill();
    x.strokeStyle = "#fff"; x.lineWidth = 2 * dp; x.beginPath(); x.arc(tx, cy, tr, 0, 7); x.stroke();
  }
}
const _cr = {}; let _crT = "";
function cssRenk(ad) { const t = document.documentElement.dataset.tema; if (_crT !== t) { for (const k in _cr) delete _cr[k]; _crT = t; } return _cr[ad] || (_cr[ad] = getComputedStyle(document.documentElement).getPropertyValue(ad).trim()); }
let dalgaZ = 0, dalgaIstek = 0;
function dalgaCiz() { for (const d of dalgalar) if (d.c.offsetParent !== null) d.ciz(); }
function dalgaDongu(t) {
  dalgaIstek = 0;
  const cal = !audio.paused && !document.hidden;
  const dt = Math.min(.1, (t - dalgaZ) / 1000 || .033); dalgaZ = t;
  let hareket = false;
  for (const d of dalgalar) { d.adim(t, dt, cal); if (d.hareketli()) hareket = true; }
  dalgaCiz();
  if (hareket && !document.hidden) dalgaIstek = setTimeout(() => requestAnimationFrame(dalgaDongu), 16);
}
function dalgaBaslat() { if (!dalgaIstek) { dalgaIstek = 1; requestAnimationFrame(dalgaDongu); } }
document.addEventListener("visibilitychange", dalgaBaslat);
const dDalga = new Dalga($("#dalga")), oDalga = new Dalga($("#oDalga"), { olcek: 1.5 });
function zamanYaz(c) {
  const d = audio.duration || 0;
  $("#tGec").textContent = sure(c); $("#oGec").textContent = sure(c); $("#tTop").textContent = sure(d); $("#oTop").textContent = sure(d);
}

// =============================================================== oynatici
const karistirDizi = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function kuyrukKur(ids, bas, lid, karisik, calsin = true) {
  ids = calinabilir(ids); if (!ids.length) return toast("Çalınacak (indirilmiş) parça yok");
  S.base = ids; S.liste = lid; if (karisik !== undefined) S.karisik = karisik;
  const b = bas && ids.includes(bas) ? bas : (S.karisik ? ids[Math.floor(Math.random() * ids.length)] : ids[0]);
  S.queue = S.karisik ? [b, ...karistirDizi(ids.filter(i => i !== b))] : ids.slice();
  S.qi = S.queue.indexOf(b);
  if (lid && !lid.startsWith("__")) api("/api/cal", { liste: lid });
  calIndex(calsin);
}
function calIndex(calsin = true, t0 = 0) {
  const id = S.queue[S.qi]; if (!id) return;
  gecisV = false;
  const diger = ELEM[audio === ELEM[0] ? 1 : 0]; try { diger.pause(); } catch { }
  if (ctx) { const t = ctx.currentTime; xg[ELEM.indexOf(audio)].gain.cancelScheduledValues(t); xg[ELEM.indexOf(audio)].gain.setValueAtTime(normKaz(id), t); xg[ELEM.indexOf(diger)].gain.cancelScheduledValues(t); xg[ELEM.indexOf(diger)].gain.setValueAtTime(0, t); }
  audio.src = "/api/parca/" + encodeURIComponent(id); S.sayildi = false;
  if (t0) audio.addEventListener("loadedmetadata", () => { audio.currentTime = t0; dalgaCiz(); }, { once: true });
  if (calsin) { sesZinciri(); if (ctx && ctx.state === "suspended") ctx.resume(); sesUygula(); normUygula(); audio.play().catch(() => { }); }
  bilgi(); oturumKaydet();
}
function bilgi() {
  const id = S.queue[S.qi], t = id && T(id);
  $("#dBaslik").textContent = t ? t.title : "Bir şarkı seç";
  $("#dSanatci").textContent = t ? [t.artist, t.album].filter(Boolean).join(" · ") : "";
  $("#oBaslik").textContent = t ? t.title : ""; $("#oSanatci").textContent = t ? t.artist : "";
  kapakAyar($("#dKapak"), id); kapakAyar($("#oKapak"), id); vurgu(id);
  document.title = t ? `${t.title} · Vaalz Music` : "Vaalz Music";
  if ("mediaSession" in navigator && t) navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album, artwork: t.kapak ? [{ src: kapakUrl(id), sizes: "600x600", type: "image/jpeg" }] : [] });
  butonlar(); kuyrukCiz(); isaretle(); dalgaCiz(); sozYukle(id); zirveYukle(id);
}
function butonlar() {
  const cal = I(audio.paused ? "play" : "pause"), id = S.queue[S.qi], b = L.liked.includes(id);
  $("#btnCal").innerHTML = cal; $("#oCal").innerHTML = cal;
  $("#btnBegen").innerHTML = I(b ? "heartf" : "heart"); $("#btnBegen").className = "ib" + (b ? " ac" : "");
  for (const k of ["btnKaris", "oKaris"]) { $("#" + k).innerHTML = I("shuffle"); $("#" + k).className = "ib " + (S.karisik ? "ac" : "sol"); $("#" + k).title = S.karisik ? "Karışık: açık" : "Karışık: kapalı"; }
  for (const k of ["btnTekrar", "oTekrar"]) { const e = $("#" + k); e.innerHTML = I(S.tekrar === 2 ? "repeat1" : "repeat"); e.className = "ib " + (S.tekrar ? "ac" : "sol"); e.title = ["Döngü: kapalı", "Döngü: tüm liste", "Döngü: tek parça"][S.tekrar]; }
  document.body.classList.toggle("durdu", audio.paused);
}
function isaretle() {
  const id = S.queue[S.qi];
  document.querySelectorAll(".sr").forEach(r => {
    const cal = r.dataset.id === id; r.classList.toggle("cal", cal);
    const no = r.querySelector(".no"), var_ = no.querySelector(".eq");
    if (cal && !var_) no.innerHTML = '<span class="eq"><i></i><i></i><i></i></span>';
    if (!cal && var_) no.textContent = [...r.parentNode.querySelectorAll(".sr")].indexOf(r) + 1;
  });
}
function sonraki(oto) {
  if (!S.queue.length) return;
  if (oto && S.tekrar === 2) { audio.currentTime = 0; audio.play(); return; }
  const ni = ileriIndeks(); if (ni < 0) { audio.pause(); return; }
  S.qi = ni; calIndex();
}
function onceki() { if (audio.currentTime > 4 || S.qi <= 0) { audio.currentTime = 0; return; } S.qi--; calIndex(); }
function oturumKaydet(t) { try { localStorage.setItem("oturum", JSON.stringify({ base: S.base, queue: S.queue, qi: S.qi, liste: S.liste, karisik: S.karisik, tekrar: S.tekrar, t: t || 0 })); } catch { } }

let hataSay = 0;
const AKT = f => function (e) { if (e.target === audio) f.call(this, e); };   // sadece aktif ses elemaninin olaylari
let sonKayit = 0;
for (const el of ELEM) {
  el.addEventListener("play", AKT(() => { butonlar(); dalgaBaslat(); if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing"; }));
  el.addEventListener("pause", AKT(() => { butonlar(); dalgaBaslat(); if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused"; }));
  el.addEventListener("seeked", AKT(dalgaCiz));
  el.addEventListener("loadedmetadata", AKT(() => { zamanYaz(audio.currentTime); dalgaCiz(); }));
  el.addEventListener("ended", AKT(() => sonraki(true)));
  el.addEventListener("error", AKT(() => {
    if (!audio.getAttribute("src")) return; const id = S.queue[S.qi]; toast("Çalınamadı: " + ((T(id) && T(id).title) || "dosya bozuk olabilir"));
    if (++hataSay > 4) { hataSay = 0; audio.pause(); return; }
    if (S.queue.length > 1) setTimeout(() => sonraki(false), 500);
  }));
  el.addEventListener("playing", AKT(() => { hataSay = 0; }));
  el.addEventListener("timeupdate", AKT(() => {
    const d = audio.duration || 0, c = audio.currentTime;
    if (!dDalga.surukle && !oDalga.surukle) zamanYaz(c);
    if (audio.paused) dalgaCiz();
    sozGuncelle(c);
    if (!S.sayildi && d && c > Math.min(30, d * .5)) { S.sayildi = true; const id = S.queue[S.qi]; L.plays[id] = (L.plays[id] || 0) + 1; L.recent = [id, ...L.recent.filter(x => x !== id)]; api("/api/say", { id }); }
    if (Date.now() - sonKayit > 5000) { sonKayit = Date.now(); oturumKaydet(c); }
    if (AY.cf > 0 && ctx && !gecisV && !audio.paused && d > AY.cf * 2 && d - c <= AY.cf + .05 && S.tekrar !== 2) { const ni = ileriIndeks(); if (ni >= 0) gecisBaslat(ni); }
  }));
}
if ("mediaSession" in navigator) {
  const ms = navigator.mediaSession;
  ms.setActionHandler("play", () => audio.play()); ms.setActionHandler("pause", () => audio.pause());
  ms.setActionHandler("previoustrack", onceki); ms.setActionHandler("nexttrack", () => sonraki(false));
  ms.setActionHandler("seekto", e => { audio.currentTime = e.seekTime; });
}

// uyku zamanlayicisi
let uykuZ = null;
function uykuKur(dk) {
  clearTimeout(uykuZ); $("#btnUyku").classList.toggle("ac", !!dk); if (!dk) return toast("Uyku zamanlayıcısı kapalı");
  toast(`${dk} dakika sonra müzik duracak`);
  uykuZ = setTimeout(() => { const v = V; let n = 20; const z = setInterval(() => { V = Math.max(0, v * (--n / 20)); sesUygula(); if (n <= 0) { clearInterval(z); audio.pause(); V = v; sesUygula(); $("#btnUyku").classList.remove("ac"); } }, 150); }, dk * 60000);
}

// =============================================================== kuyruk / modal / menu
let KTAB = "sira";
function kuyrukCiz() {
  if ($("#kuyruk").hidden) return;
  document.querySelectorAll(".kt-b").forEach(b => b.classList.toggle("on", b.dataset.k === KTAB));
  $("#kuyrukListe").hidden = KTAB !== "sira"; $("#sozKutu").hidden = KTAB !== "soz"; $("#benzerKutu").hidden = KTAB !== "benzer";
  if (KTAB === "soz") return sozCiz();
  if (KTAB === "benzer") return benzerSekme();
  const kutu = $("#kuyrukListe"), eskiKaydirma = kutu.scrollTop, bas = Math.max(0, S.qi - 30);     // 30 parca geriye: dinlediklerin de listede
  kutu.innerHTML = S.queue.slice(bas, S.qi + 100).map((id, n) => {
    const i = bas + n, t = T(id), sonra = i > S.qi;
    return t ? `<div class="kq ${i === S.qi ? "cal" : ""} ${i < S.qi ? "gecmis" : ""}" ${sonra ? 'draggable="true"' : ""} data-act="kuyrukGit" data-i="${i}">${cv(id)}<div class="mt"><b>${esc(t.title)}</b><span>${esc(t.artist)}</span></div><span class="not" style="margin:0">${sure(t.duration)}</span>${sonra ? `<button class="ib kc kx" data-act="kuyrukCikar" data-i="${i}" title="Sıradan çıkar">${I("x")}</button>` : ""}</div>` : "";
  }).join("") || `<p class="not" style="padding:16px">Kuyruk boş.</p>`;
  const cal = kutu.querySelector(".kq.cal");        // parca degisince ya da ilk acilista calan parca en uste gelir; yoksa kaydirma korunur
  if (cal && (kutu.dataset.qi !== String(S.qi) || eskiKaydirma === 0)) kutu.scrollTop += cal.getBoundingClientRect().top - kutu.getBoundingClientRect().top - 4;
  else kutu.scrollTop = eskiKaydirma;
  kutu.dataset.qi = S.qi;
}

const BZ = { id: null, durum: "", liste: [], hata: "" };
function benzerYukle(id, yenile) {
  BZ.id = id; BZ.durum = "yukle"; BZ.liste = []; BZ.hata = "";
  api(`/api/benzer?id=${encodeURIComponent(id)}${yenile ? "&yenile=1" : ""}`)
    .then(o => { if (BZ.id !== id) return; BZ.liste = o.liste; BZ.durum = "tamam"; if (KTAB === "benzer") benzerSekme(); })
    .catch(e => { if (BZ.id !== id) return; BZ.durum = "hata"; BZ.hata = e.message || "alınamadı"; if (KTAB === "benzer") benzerSekme(); });
}
function benzerSekme() {
  const k = $("#benzerKutu"), id = S.queue[S.qi], t = id && T(id);
  if (!id) { k.innerHTML = '<div class="bos" style="padding:40px 16px"><h2>Bir şarkı çal</h2><p>Çalan şarkıya benzerler burada görünür.</p></div>'; return; }
  if (id.startsWith("f_")) { k.innerHTML = '<div class="bos" style="padding:40px 16px"><h2>Bu parça YouTube’dan değil</h2><p>Benzerler yalnızca YouTube’dan indirilen parçalar için bulunabilir.</p></div>'; return; }
  if (BZ.id !== id) benzerYukle(id);
  const baslik = `<p class="not" style="padding:4px 12px 8px"><b style="color:var(--txt)">${esc(t ? t.title : "")}</b> şarkısına benzerler</p>`;
  if (BZ.durum === "yukle") { k.innerHTML = baslik + '<p class="not" style="padding:12px">YouTube’dan getiriliyor (parça başına bir kez, birkaç yüz KB)…</p>'; return; }
  if (BZ.durum === "hata") { k.innerHTML = baslik + `<p class="not" style="padding:12px">Benzerler alınamadı: ${esc(BZ.hata)}</p><button class="btn" style="margin:0 12px" data-act="benzerYenile">${I("refresh")}Tekrar dene</button>`; return; }
  const l = BZ.liste.filter(o => !(T(o.id) && T(o.id).var)).slice(0, 40);
  k.innerHTML = baslik + (l.length ? l.map(o => { const v = `data-id="${esc(o.id)}" data-t="${esc(o.title)}" data-a="${esc(o.artist)}" data-d="${o.duration || 0}"`; return `<div class="kq" data-act="onizle" ${v} title="Önizleme için tıkla (30 sn)"><div class="cv" style="--h:${hue(o.id)}"><img loading="lazy" src="/api/kapak/${encodeURIComponent(o.id)}?uzak=1" alt="" onerror="this.remove()"></div><div class="mt"><b>${esc(o.title)}</b><span>${esc(o.artist)}</span></div><button class="ib kc onz" data-act="onizle" data-onz="${esc(o.id)}" ${v} title="Önizle (30 sn)">${I("play")}${I("pause")}</button><button class="ib kc" data-act="indir" ${v} title="İndir">${I("dl")}</button><button class="ib kc" data-act="araListe" ${v} title="İndir ve playlist'e ekle">${I("plus")}</button></div>`; }).join("") + `<p class="not" style="padding:10px 12px"><button class="link" data-act="benzerYenile">Yenile</button> · bir parça için bir kez indirilip saklanır.</p>`
    : '<div class="bos" style="padding:40px 16px"><h2>Yeni öneri yok</h2><p>Bulunan benzerlerin hepsi zaten kütüphanende.</p></div>');
}

// ---- sarki sozleri (.lrc): yerel dosya, istege bagli internetten bulma
const SOZ = { id: null, sat: [], senkron: false, ix: -1, var: false };
function lrcCoz(m) {
  const sat = []; let off = 0, senk = false;
  for (const ham of String(m || "").split(/\r?\n/)) {
    const o = /^\[offset:\s*(-?\d+)\]/i.exec(ham); if (o) { off = +o[1] / 1000; continue; }
    const tl = [...ham.matchAll(/\[(\d+):(\d+(?:[.:]\d+)?)\]/g)]; const metin = ham.replace(/\[[^\]]*\]/g, "").trim();
    if (tl.length) { senk = true; for (const x of tl) sat.push({ t: +x[1] * 60 + parseFloat(x[2].replace(":", ".")) - off, s: metin }); }
    else if (!/^\[[a-z]+:/i.test(ham.trim()) && ham.trim()) sat.push({ t: -1, s: metin });
  }
  if (senk) sat.sort((a, b) => a.t - b.t);
  return { sat: senk ? sat.filter(x => x.t >= 0) : sat, senk };
}
async function sozYukle(id) {
  if (!id || SOZ.id === id) return; SOZ.id = id; SOZ.sat = []; SOZ.ix = -1; SOZ.var = false;
  try { const r = await api("/api/soz/" + encodeURIComponent(id)); if (SOZ.id !== id) return; SOZ.var = r.var; const c = lrcCoz(r.metin); SOZ.sat = c.sat; SOZ.senkron = c.senk; } catch { }
  sozCiz(); odakSoz();
}
function sozCiz() {
  const k = $("#sozKutu"); if (!k || k.hidden) return;
  if (!SOZ.var) { k.innerHTML = `<div class="bos" style="padding:40px 20px"><h2>Söz yok</h2><p>Yanına <b>.lrc</b> dosyası koyabilir, elle yapıştırabilir ya da internetten (lrclib.net, ~5 KB) arayabilirsin.</p><br><div class="ip" style="justify-content:center"><button class="btn on" data-act="sozBul">İnternetten bul</button><button class="btn" data-act="sozEkle">Elle ekle</button></div></div>`; return; }
  k.innerHTML = `<div class="soz-liste">${SOZ.sat.map((x, i) => `<p class="sl2" data-i="${i}" ${SOZ.senkron ? `data-act="sozGit" data-t="${x.t}"` : ""}>${esc(x.s) || "♪"}</p>`).join("")}</div><div class="ip" style="padding:10px 14px"><button class="btn k" data-act="sozEkle">Düzenle</button><button class="btn k" data-act="sozSil">Kaldır</button></div>`;
  SOZ.ix = -1; sozGuncelle(audio.currentTime, true);
}
function sozGuncelle(c, zorla) {
  if (!SOZ.senkron || !SOZ.sat.length) return;
  let lo = 0, hi = SOZ.sat.length - 1, ix = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (SOZ.sat[m].t <= c + .15) { ix = m; lo = m + 1; } else hi = m - 1; }
  if (ix === SOZ.ix && !zorla) return; SOZ.ix = ix;
  const k = $("#sozKutu"); if (k && !k.hidden) { k.querySelectorAll(".sl2").forEach((p, i) => p.classList.toggle("on", i === ix)); const p = k.querySelector(".sl2.on"); if (p) p.scrollIntoView({ block: "center", behavior: zorla ? "auto" : "smooth" }); }
  odakSoz();
}
let ODAK_SOZ = false;
function odakSoz() {
  const e = $("#oSoz"); if (!e) return; e.hidden = !ODAK_SOZ; $("#oSozBtn").classList.toggle("ac", ODAK_SOZ);
  if (!ODAK_SOZ) return;
  if (!SOZ.var) { e.innerHTML = '<span class="s0">Bu parça için söz yok</span>'; return; }
  const g = i => (SOZ.sat[i] && SOZ.sat[i].s) || "";
  e.innerHTML = SOZ.senkron ? `<span class="s0">${esc(g(SOZ.ix - 1))}</span><span class="s1">${esc(g(SOZ.ix)) || "♪"}</span><span class="s0">${esc(g(SOZ.ix + 1))}</span>` : `<span class="s0">${esc(SOZ.sat.slice(0, 3).map(x => x.s).join(" · "))}</span>`;
}

// ---- surukle-birak: playlist ve kuyruk siralama
let SURUK = null;
const hedefSatir = e => e.target.closest && e.target.closest(".sr[draggable], .kq[draggable]");
document.addEventListener("dragstart", e => { const r = hedefSatir(e); if (!r) return; SURUK = { el: r, id: r.dataset.id, i: +r.dataset.i, kuyruk: r.classList.contains("kq"), liste: r.dataset.liste }; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", "x"); r.classList.add("surukleniyor"); });
document.addEventListener("dragend", () => { if (SURUK) SURUK.el.classList.remove("surukleniyor"); document.querySelectorAll(".drop-ust,.drop-alt").forEach(x => x.classList.remove("drop-ust", "drop-alt")); SURUK = null; });
document.addEventListener("dragover", e => {
  const r = hedefSatir(e); if (!r || !SURUK || r === SURUK.el || r.classList.contains("kq") !== SURUK.kuyruk) return; e.preventDefault();
  const ust = e.clientY < r.getBoundingClientRect().top + r.offsetHeight / 2;
  document.querySelectorAll(".drop-ust,.drop-alt").forEach(x => x !== r && x.classList.remove("drop-ust", "drop-alt")); r.classList.toggle("drop-ust", ust); r.classList.toggle("drop-alt", !ust);
});
document.addEventListener("drop", async e => {
  const r = hedefSatir(e); if (!r || !SURUK || r === SURUK.el) return; e.preventDefault();
  const ust = e.clientY < r.getBoundingClientRect().top + r.offsetHeight / 2;
  if (SURUK.kuyruk) {
    const from = SURUK.i; let to = +r.dataset.i + (ust ? 0 : 1); if (to <= S.qi) to = S.qi + 1; const [x] = S.queue.splice(from, 1); if (from < to) to--; S.queue.splice(to, 0, x); kuyrukCiz(); oturumKaydet(audio.currentTime);
  } else {
    const p = listeBul(SURUK.liste); if (!p || !p.local) return; const dizi = p.tracks.filter(x => x !== SURUK.id), hi = dizi.indexOf(r.dataset.id); dizi.splice(hi + (ust ? 0 : 1), 0, SURUK.id);
    p.tracks = dizi; await api("/api/liste/sirala", { id: p.id, tracks: dizi }); await yukle(); yonlendir();
  }
});
function modalAc(h) { const m = $("#modal"); m.innerHTML = `<div class="mk">${h}</div>`; m.hidden = false; }
const modalKapat = () => { $("#modal").hidden = true; };
$("#modal").addEventListener("mousedown", e => { if (e.target.id === "modal") modalKapat(); });
function girdiModal(baslik, deger, tamam) {
  modalAc(`<h3>${esc(baslik)}</h3><input class="inp" id="mIn" value="${esc(deger)}"><div class="ip"><button class="btn" data-act="modalKapat">Vazgeç</button><button class="btn on" id="mOk">Tamam</button></div>`);
  const i = $("#mIn"); i.focus(); i.select();
  const git = () => { const v = i.value.trim(); modalKapat(); if (v) tamam(v); };
  $("#mOk").onclick = git; i.onkeydown = e => { if (e.key === "Enter") git(); };
}
function listeSec(parca) {
  const yerel = L.playlists.filter(p => p.local);
  modalAc(`<h3>Playlist'e ekle</h3>${yerel.map(p => `<a class="rl" data-act="listeyeEkle" data-liste="${esc(p.id)}" data-id="${esc(parca)}">${cv(p.tracks.find(i => T(i) && T(i).kapak) || p.id)}<div class="mt"><b>${esc(p.title)}</b><span>${p.tracks.length} parça</span></div></a>`).join("") || `<p class="not">Henüz kendi playlistin yok.</p>`}
   <div class="ip"><button class="btn" data-act="modalKapat">Kapat</button><button class="btn on" data-act="yeniListe" data-parca="${esc(parca)}">${I("plus")}Yeni playlist</button></div>`);
}
function menuAc(x, y, items, fn) {
  const m = $("#menu"); m.innerHTML = items.map(([k, ad, cls]) => `<button data-m="${k}" class="${cls || ""}">${ad}</button>`).join("");
  m.hidden = false; m.style.left = Math.min(x, innerWidth - 230) + "px"; m.style.top = Math.max(8, Math.min(y, innerHeight - m.offsetHeight - 10)) + "px";
  m.onclick = e => { const k = e.target.dataset.m; if (k) { m.hidden = true; fn(k); } };
}
function parcaMenusu(x, y, id, lid) {
  const t = T(id), pl = listeBul(lid), it = [];
  if (t.var) it.push(["cal", "Çal"], ["sira", "Sıradaki olarak çal"], ["ekle", "Kuyruğa ekle"]); else it.push(["indir", "İndir"]);
  it.push(["liste", "Playlist'e ekle…"]);
  if (pl && pl.local) it.push(["cikar", "Bu playlist'ten çıkar"]);
  if (t.var) it.push(["goster", "Klasörde göster"]);
  if (t.var) it.push(["sil", "Dosyayı diskten sil", "tehlike"]);
  menuAc(x, y, it, async k => {
    if (k === "cal") kuyrukKur([id], id, null);
    if (k === "sira" || k === "ekle") { if (S.qi < 0) kuyrukKur([id], id, null); else { S.queue.splice(k === "sira" ? S.qi + 1 : S.queue.length, 0, id); toast("Kuyruğa eklendi"); kuyrukCiz(); } }
    if (k === "indir") H.indir({ dataset: { id } });
    if (k === "liste") listeSec(id);
    if (k === "cikar") { await api("/api/liste/cikar", { id: lid, parca: id }); await yukle(); yonlendir(); }
    if (k === "goster") api("/api/klasor-ac", { id }).catch(e => toast(e.message));
    if (k === "sil" && confirm(`“${t.title}” diskten silinsin mi?`)) { await api("/api/dosya-sil", { id }); await yukle(); yonlendir(); toast("Silindi"); }
  });
}

// =============================================================== eylemler
const sesAyarOlaylari = () => {
  document.addEventListener("input", e => {
    const t = e.target;
    if (t.classList && t.classList.contains("eq-k")) { AY.bant[+t.dataset.b] = +t.value; AY.onayar = "ozel"; t.parentNode.querySelector("span").textContent = (t.value > 0 ? "+" : "") + t.value; const sel = $("#eqPre"); if (sel) sel.value = "ozel"; ayKaydet(); eqUygula(); }
    if (t.id === "aEs") { $("#esN").textContent = t.value + " parça"; }
    if (t.id === "cfR") { AY.cf = +t.value; $("#cfSn").textContent = AY.cf ? AY.cf + " sn" : "kapalı"; ayKaydet(); }
  });
  document.addEventListener("change", e => {
    const t = e.target;
    if (t.id === "eqOn") { AY.eq = t.checked; ayKaydet(); eqUygula(); }
    if (t.id === "eqPre") { AY.onayar = t.value; if (EQ_ONAYAR[t.value]) { AY.bant = EQ_ONAYAR[t.value][1].slice(); document.querySelectorAll(".eq-k").forEach((k, i) => { k.value = AY.bant[i]; k.parentNode.querySelector("span").textContent = (AY.bant[i] > 0 ? "+" : "") + AY.bant[i]; }); if (!AY.eq) { AY.eq = true; $("#eqOn").checked = true; } } ayKaydet(); eqUygula(); }
    if (t.id === "esitleOn") { AY.esitle = t.checked; ayKaydet(); normUygula(); }
    if (t.id === "esitleHedef") { AY.hedef = +t.value; ayKaydet(); normUygula(); }
    if (t.id === "cubukStil") { AY.stil = t.value; ayKaydet(); ZIRVE = { id: null, z: null }; zirveYukle(S.queue[S.qi]); dalgaCiz(); }
  });
};
sesAyarOlaylari();
let odakZ = 0;
const H = {
  git: t => { location.hash = t.dataset.to; },
  calDur: () => { if (S.qi < 0) { const son = L.recent.filter(i => T(i) && T(i).var); return kuyrukKur(tumIndirilenler(), son[0] || null, "__indirilenler", false); } if (audio.paused) { sesZinciri(); if (ctx && ctx.state === "suspended") ctx.resume(); sesUygula(); audio.play(); } else audio.pause(); },
  onceki, sonraki: () => sonraki(false),
  tekrar: () => { S.tekrar = (S.tekrar + 1) % 3; butonlar(); toast(["Döngü kapalı", "Tüm liste döngüde", "Tek parça döngüde"][S.tekrar]); oturumKaydet(audio.currentTime); },
  karistir: () => {
    S.karisik = !S.karisik; const cur = S.queue[S.qi];
    if (S.base.length) { S.queue = S.karisik ? [cur, ...karistirDizi(S.base.filter(i => i !== cur))] : S.base.slice(); S.qi = Math.max(0, S.queue.indexOf(cur)); }
    butonlar(); kuyrukCiz(); toast(S.karisik ? "Karışık çalma açık" : "Karışık çalma kapalı");
  },
  sessiz: () => { sessizMi = !sessizMi; sesUygula(); },
  begenCal: () => { const id = S.queue[S.qi]; if (id) H.begen({ dataset: { id } }); },
  begen: (t, e) => {
    e && e.stopPropagation(); const id = t.dataset.id, on = !L.liked.includes(id);
    L.liked = on ? [id, ...L.liked] : L.liked.filter(x => x !== id); api("/api/begen", { id, on }); butonlar(); railCiz();
    document.querySelectorAll(`.sr[data-id="${CSS.escape(id)}"] .ib[data-act="begen"]`).forEach(b => { b.innerHTML = I(on ? "heartf" : "heart"); b.classList.toggle("ac", on); });
  },
  satirCal: t => {
    const id = t.dataset.id, lid = t.dataset.liste;
    if (!T(id).var) return toast("Bu parça henüz indirilmemiş — satırdaki indir simgesine bas");
    kuyrukKur(listeParcalari(lid), id, lid);
  },
  listeCal: (t, e) => { e && e.stopPropagation(); kuyrukKur(listeParcalari(t.dataset.liste), null, t.dataset.liste, false); },
  listeKaristir: t => kuyrukKur(listeParcalari(t.dataset.liste), null, t.dataset.liste, true),
  hepsiKaristir: () => kuyrukKur(tumIndirilenler(), null, "__indirilenler", true),
  menu: (t, e) => { e.stopPropagation(); const r = t.getBoundingClientRect(); parcaMenusu(r.left - 190, r.bottom, t.dataset.id, t.dataset.liste); },
  odakAc: () => { if ($("#odak").classList.contains("acik")) H.odakKapat(); else H.odakGoster(); },
  odakGoster: () => {            // alt panelin ustunden yumusakca yukari kayan sayfa; alt panel yerinde kalir
    const o = $("#odak"), k = $("#kuyruk"); clearTimeout(odakZ); o.hidden = false; o.classList.toggle("yalin", localStorage.getItem("odakYalin") === "1");
    $("#oSag").appendChild(k); k.classList.add("gomulu"); k.hidden = false; kuyrukCiz();
    void o.offsetWidth; o.classList.add("acik"); document.body.classList.add("odakAcik"); dalgaBaslat();
  },
  odakKapat: () => {
    const o = $("#odak"); if (o.hidden || !o.classList.contains("acik")) return;
    o.classList.remove("acik"); document.body.classList.remove("odakAcik");
    odakZ = setTimeout(() => { o.hidden = true; const k = $("#kuyruk"); k.classList.remove("gomulu"); k.hidden = true; document.body.appendChild(k); }, 540);
  },
  oPanel: () => { const o = $("#odak"); o.classList.toggle("yalin"); try { localStorage.setItem("odakYalin", o.classList.contains("yalin") ? "1" : "0"); } catch { } setTimeout(() => oDalga.boyutla(), 30); },
  kuyrukAc: () => { if ($("#odak").classList.contains("acik")) { KTAB = "sira"; return kuyrukCiz(); } const k = $("#kuyruk"); if (!k.hidden && KTAB === "sira" && !k.classList.contains("gomulu")) k.hidden = true; else { k.hidden = false; KTAB = "sira"; } kuyrukCiz(); },
  sozAc: () => { if ($("#odak").classList.contains("acik")) { KTAB = "soz"; return kuyrukCiz(); } const k = $("#kuyruk"); if (!k.hidden && KTAB === "soz" && !k.classList.contains("gomulu")) k.hidden = true; else { k.hidden = false; KTAB = "soz"; } kuyrukCiz(); },
  kTab: t => { KTAB = t.dataset.k; kuyrukCiz(); },
  kuyrukCikar: (t, e) => { e.stopPropagation(); const i = +t.dataset.i; if (i > S.qi) { S.queue.splice(i, 1); kuyrukCiz(); } },
  sozGit: t => { const x = parseFloat(t.dataset.t); if (isFinite(x)) audio.currentTime = x; },
  sozBul: async t => { t.disabled = true; t.textContent = "Aranıyor…"; try { const r = await api("/api/soz/bul", { id: S.queue[S.qi] }); agGuncelle(); if (!r.var) toast("Bu parça için söz bulunamadı"); SOZ.id = null; await sozYukle(S.queue[S.qi]); } catch (e) { toast(e.message); t.disabled = false; t.textContent = "İnternetten bul"; } },
  sozEkle: () => { const id = S.queue[S.qi]; if (!id) return; modalAc(`<h3>Sözler (.lrc ya da düz metin)</h3><textarea class="inp" id="sozMetin" style="height:260px" placeholder="[00:12.30] Satır...">${esc(SOZ.var ? SOZ.sat.map(x => (x.t >= 0 ? `[${String(Math.floor(x.t / 60)).padStart(2, "0")}:${(x.t % 60).toFixed(2).padStart(5, "0")}] ` : "") + x.s).join("\n") : "")}</textarea><div class="ip"><button class="btn" data-act="modalKapat">Vazgeç</button><button class="btn on" data-act="sozKaydet">Kaydet</button></div>`); },
  sozKaydet: async () => { const id = S.queue[S.qi]; await api("/api/soz/kaydet", { id, metin: $("#sozMetin").value }); modalKapat(); SOZ.id = null; await sozYukle(id); toast("Sözler kaydedildi"); },
  sozSil: async () => { const id = S.queue[S.qi]; await api("/api/soz/kaydet", { id, metin: "" }); SOZ.id = null; await sozYukle(id); },
  oSoz: () => { },
  kuyrukKapat: () => { if ($("#kuyruk").classList.contains("gomulu")) return; $("#kuyruk").hidden = true; },
  kuyrukGit: t => { S.qi = +t.dataset.i; calIndex(); },
  uyku: (t, e) => { e.stopPropagation(); const r = t.getBoundingClientRect(); menuAc(r.left - 90, r.top - 200, [["15", "15 dakika"], ["30", "30 dakika"], ["45", "45 dakika"], ["60", "1 saat"], ["0", "Kapalı"]], k => uykuKur(+k)); },
  modalKapat,
  yeniListe: t => girdiModal("Yeni playlist", "", async ad => {
    const { id } = await api("/api/liste/yeni", { title: ad, parca: t && t.dataset ? t.dataset.parca : undefined });
    await yukle(); location.hash = "#/liste/" + id; yonlendir();
  }),
  listeAd: t => girdiModal("Playlist adı", listeBul(t.dataset.liste).title, async ad => { await api("/api/liste/ad", { id: t.dataset.liste, title: ad }); await yukle(); yonlendir(); }),
  listeSil: t => { if (confirm("Bu playlist silinsin mi? (Şarkı dosyaları silinmez)")) api("/api/liste/sil", { id: t.dataset.liste }).then(yukle).then(() => { location.hash = "#/kitaplik"; }); },
  listeyeEkle: async t => { await api("/api/liste/ekle", { id: t.dataset.liste, parca: t.dataset.id }); modalKapat(); await yukle(); toast("Playlist'e eklendi"); },
  indir: async t => {
    const eskiMetin = t.innerHTML, btn = t.classList && t.classList.contains("btn");
    if (btn) { t.disabled = true; t.textContent = "Kuyrukta"; }
    try { const d = T(t.dataset.id) || {}; await api("/api/indir", { id: t.dataset.id, title: t.dataset.t || d.title, artist: t.dataset.a || d.artist, duration: +t.dataset.d || d.duration });
      toast("İndirme arka planda başladı"); izle(); } catch (e) { toast(e.message); if (btn) { t.disabled = false; t.innerHTML = eskiMetin; } }
  },
  listeIndir: async t => { if (confirm(`${t.dataset.n} parça indirilecek (~${t.dataset.mb} MB internet). Devam edilsin mi?`)) { await api("/api/indir-liste", { id: t.dataset.liste }); toast("İndirme arka planda başladı"); izle(); } },
  apiAra: t => apiAra(t.dataset.q),
  durdur: async () => { if (!confirm("Devam eden indirmeler durdurulsun ve bekleyenler kuyruktan çıkarılsın mı? (Biten parçalar kalır)")) return; try { const r = await api("/api/indirme-durdur", {}); toast(`Durduruldu · ${r.calisan} çalışan, ${r.bekleyen} bekleyen iptal`); } catch (e) { toast(e.message); } izle(); },
  klasorAc: () => api("/api/klasor-ac", {}).catch(e => toast(e.message)),
  kesfet: () => { const k = $("#arama"); k.focus(); toast("Bir şarkı ya da sanatçı yaz, sonra “YouTube'da ara”ya bas"); },
  araListe: t => { S.araParca = { id: t.dataset.id, title: t.dataset.t, artist: t.dataset.a, duration: +t.dataset.d || 0 }; araListeModal(); },
  araYeniListe: () => { modalKapat(); girdiModal("Yeni playlist", "", ad => araIndirEkle(null, ad)); },
  araListeSec: async t => { modalKapat(); await araIndirEkle(t.dataset.liste); },
  sisKur: async () => { try { await api("/api/sistem/kur", { araclar: SIS.araclar.filter(a => !a.var).map(a => a.ad) }); } catch (e) { toast(e.message); return; } await sistemYukle(true); sisCiz(); sisIzle(); },
  sisGuncelle: async () => { try { await api("/api/sistem/kur", { araclar: ["yt-dlp"], guncelle: true }); } catch (e) { toast(e.message); return; } await sistemYukle(true); sisCiz(); sisIzle(); },
  sisYenile: async () => { await sistemYukle(true); sisCiz(); },
  onizle: t => onizleBaslat(t.dataset.id),
  benzerYenile: () => { const id = S.queue[S.qi]; if (id) { benzerYukle(id, true); benzerSekme(); } },
  kaydir: t => { const s = t.parentNode.querySelector(".satir"); s.scrollBy({ left: (+t.dataset.y) * Math.max(200, s.clientWidth * .85), behavior: "smooth" }); },
  oneriYenile: async () => { await api("/api/oneriler/yenile", { zorla: true }); S.oneriDenendi = true; izle(); },
  linkEkle: () => modalAc(`<div class="link-modal"><h3>Playlist linki ekle</h3><p>YouTube Music, <b style="color:var(--txt)">Spotify</b> ya da <b style="color:var(--txt)">Deezer</b> playlist/albüm linkini yapıştır. Spotify ve Deezer listelerinde parça adları okunur, indirirken her parça YouTube'da aranır.</p><input class="inp" id="lnkUrl" placeholder="https://music.youtube.com/playlist?list=… · https://open.spotify.com/playlist/…" spellcheck="false"><label class="f" style="display:flex;gap:10px;align-items:center;margin:14px 0 0"><input type="checkbox" id="lnkIndir" checked> Ekledikten sonra eksik parçaları hemen indir</label><div class="ip"><button class="btn" data-act="modalKapat">Vazgeç</button><button class="btn on" data-act="linkGonder">Ekle</button></div></div>`),
  linkGonder: async () => {
    const url = $("#lnkUrl").value.trim();
    const harici = /open\.spotify\.com\/(intl-[\w-]+\/)?(playlist|album)\/|deezer\.com\/([a-z]{2}\/)?(playlist|album)\//.test(url);
    if (!harici && !/list=[A-Za-z0-9_-]+/.test(url)) return toast("Geçerli bir YouTube Music, Spotify ya da Deezer playlist linki değil");
    if (harici) {
      const btn = document.querySelector('[data-act="linkGonder"]'); btn.disabled = true; btn.textContent = "Okunuyor…";
      try {
        const r = await api("/api/liste/link", { url }); const dl = $("#lnkIndir").checked; modalKapat(); await yukle();
        location.hash = "#/liste/" + r.id; toast(`${r.sayi} parça eklendi`);
        if (dl && confirm(`${r.sayi} parça indirilecek. Her parça önce YouTube'da aranır (parça başına ~0,5 MB ek internet). Başlansın mı?`)) { await api("/api/indir-liste", { id: r.id }); izle(); }
      } catch (e) { btn.disabled = false; btn.textContent = "Ekle"; toast(e.message); }
      return;
    }
    const r = await api("/api/liste/link", { url, indir: $("#lnkIndir").checked }); modalKapat(); S.gitListe = r.id; toast("Playlist okunuyor…"); izle();
  },
  listeKaldir: async t => { if (confirm("Bu YouTube playlist'i takipten çıkarılsın mı? (İndirilen şarkı dosyaları silinmez)")) { await api("/api/liste/kaldir", { id: t.dataset.liste }); await yukle(); location.hash = "#/kitaplik"; } },
  kontrol: async t => { await api("/api/senkron/kontrol", { url: t && t.dataset && t.dataset.url || undefined }); izle(); },
  basla: async () => { await api("/api/senkron/basla", {}); izle(); },
  tara: async () => { const r = await api("/api/tara", {}); await yukle(); yonlendir(); toast(`${r.sayi} dosya bulundu`); },
  kapaklar: async () => { const n = L.kapaksiz; if (confirm(`${n} parçanın kapağı indirilecek (~${(n * .08).toFixed(1)} MB). Bir kez indirilip saklanır. Devam?`)) { await api("/api/kapaklari-getir", {}); izle(); } },
  tema: t => { TEMA.mod = t.dataset.k; temaUygula(); document.querySelectorAll(".tema").forEach(e => e.classList.toggle("on", e === t)); },
  vurgu: t => { TEMA.vurgu = t.dataset.k; temaUygula(); document.querySelectorAll(".vr").forEach(e => e.classList.toggle("on", e === t)); },
  ayarKaydet: async () => {
    await api("/api/ayarlar", { playlists: $("#aListe").value.split(/\s+/).filter(Boolean), veri_tasarrufu: $("#aTasarruf").checked, es_zamanli: +$("#aEs").value, cookies_browser: $("#aCerez").value, otomatik_oneri: $("#aOneri").checked });
    L.otomatik_oneri = $("#aOneri").checked; L.veri_tasarrufu = $("#aTasarruf").checked; $("#aMsg").textContent = "Kaydedildi";
  },
};
document.addEventListener("click", e => {
  const m = $("#menu"); if (!m.hidden && !m.contains(e.target)) m.hidden = true;
  const t = e.target.closest("[data-act]"); if (!t || !H[t.dataset.act]) return;
  try { const r = H[t.dataset.act](t, e); if (r && r.catch) r.catch(hataGoster); } catch (x) { hataGoster(x); }
});
function hataGoster(x) { const m = String((x && x.message) || x); toast(/Failed to fetch|NetworkError|Load failed/i.test(m) ? "Vaalz Music sunucusuna ulaşılamıyor — uygulamayı yeniden aç" : m); console.error(x); }
window.addEventListener("unhandledrejection", e => { if (e.reason && !e.reason.__goruldu) { hataGoster(e.reason); } });
$("#dock").addEventListener("click", e => {
  if (e.target.closest("button,input,canvas,a,select,[data-act],.seekrow")) return;
  if (S.qi >= 0) H.odakAc();
});
document.addEventListener("contextmenu", e => { const r = e.target.closest(".sr[data-id]"); if (r) { e.preventDefault(); parcaMenusu(e.clientX, e.clientY, r.dataset.id, r.dataset.liste); } });
document.addEventListener("input", e => { if (e.target.id === "ozelRenk") { const [h, s] = hexHS(e.target.value); TEMA.vurgu = Math.round(h) + "," + Math.round(s); temaUygula(); document.querySelectorAll(".vr").forEach(x => x.classList.remove("on")); e.target.classList.add("on"); } });
document.addEventListener("change", e => { if (e.target.id === "sirala") { S.sirala = e.target.value; yonlendir(); } });

// arama (yazdikca yerel arama; internet yok)
let oncekiHash = "#/", araZ;
$("#arama").addEventListener("input", e => {
  clearTimeout(araZ); const q = e.target.value.trim();
  araZ = setTimeout(() => {
    if (!q) { if (location.hash.startsWith("#/ara/")) location.hash = oncekiHash; return; }
    if (!location.hash.startsWith("#/ara/")) oncekiHash = location.hash || "#/";
    history.replaceState(null, "", "#/ara/" + encodeURIComponent(q)); sayfaAra(q);
  }, 140);
});
$("#aramaForm").addEventListener("submit", e => e.preventDefault());
document.addEventListener("keydown", e => {
  const yaz = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && document.activeElement.type !== "range";
  if (e.key === "/" && !yaz) { e.preventDefault(); $("#arama").focus(); return; }
  if (e.key === "Escape") { H.odakKapat(); H.kuyrukKapat(); modalKapat(); $("#menu").hidden = true; if (yaz) document.activeElement.blur(); return; }
  if (yaz) return;
  if (e.code === "Space") { e.preventDefault(); H.calDur(); }
  else if (e.key === "ArrowRight") audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
  else if (e.key === "ArrowLeft") audio.currentTime = Math.max(0, audio.currentTime - 5);
  else if (e.key === "ArrowUp") { e.preventDefault(); V = clamp(V + .05, 0, 2); sessizMi = false; sesUygula(); }
  else if (e.key === "ArrowDown") { e.preventDefault(); V = clamp(V - .05, 0, 2); sessizMi = false; sesUygula(); }
  else if (e.key.toLowerCase() === "f") H.odakAc();
  else if (e.key.toLowerCase() === "m") H.sessiz();
  else if (e.key.toLowerCase() === "n") sonraki(false);
  else if (e.key.toLowerCase() === "p") onceki();
});

// =============================================================== arka plan isi izleme (sadece is varken sorgular)
let izliyor = false, sonMesgul = false, durumSon = null;
function panelCiz(d) {
  const kutu = $("#isPanel"); if (!kutu || !d) return;
  const b = d.bekleyen;
  const html = `${d.mesgul ? `<div class="kutu"><b>${esc(d.faz)}</b>${d.toplam ? ` · ${d.biten}/${d.toplam}` : ""}<div class="bar2"><i style="width:${d.toplam ? ((d.biten + d.yuzde / 100) / d.toplam * 100) : 5}%"></i></div><span class="not">${esc(d.parca)} ${d.yuzde ? Math.round(d.yuzde) + "%" : ""} · bu işte ~${d.mb.toFixed(1)} MB indirildi</span>${d.faz === "Indiriliyor" ? `<div style="margin-top:10px"><button class="btn" data-act="durdur">${I("x")}İndirmeyi durdur</button></div>` : ""}</div>` : ""}
   ${b ? `<div class="kutu">${b.sayi ? `<b>${b.sayi} indirilmemiş parça</b> bulundu · tahmini internet <b>~${b.mb} MB</b><br><br><button class="btn on" data-act="basla">İndirmeyi başlat</button>` : "Her şey güncel, indirilecek parça yok."}</div>` : ""}
   ${d.hatalar.length ? `<div class="kutu">${d.hatalar.map(h => `<div class="hata">${esc(h.baslik)} — ${esc(h.mesaj)}</div>`).join("")}</div>` : ""}`;
  if (kutu.dataset.son !== html) { kutu.dataset.son = html; kutu.innerHTML = html; }
}
async function izle() {
  if (izliyor) return; izliyor = true;
  while (true) {
    let d; try { d = await api("/api/durum"); } catch { break; }
    durumSon = d;
    const chip = $("#durumChip"); chip.hidden = !d.mesgul;
    if (d.mesgul) chip.textContent = `${d.faz}${d.toplam ? ` ${d.biten}/${d.toplam}` : ""}${d.yuzde ? " · %" + Math.round(d.yuzde) : ""}`;
    panelCiz(d); agGuncelle(d.ag);
    if (sonMesgul && !d.mesgul) {
      await yukle();
      if (S.gitListe) { const g = S.gitListe; S.gitListe = null; if (listeBul(g)) { location.hash = "#/liste/" + g; await yonlendir(); } else toast("Playlist okunamadı — linki kontrol et"); }
      if (!/^#\/(ayarlar|ara\/)/.test(decodeURIComponent(location.hash)) && !(document.activeElement && document.activeElement.matches("input,textarea,select"))) { const sy = main.scrollTop; await yonlendir(); main.scrollTop = sy; }
      else railCiz();
    }
    sonMesgul = d.mesgul;
    if (!d.mesgul) break;
    await new Promise(r => setTimeout(r, 1200));
  }
  izliyor = false;
}

// =============================================================== baslangic
setInterval(() => fetch("/api/ping").catch(() => { }), 20000);
fetch("/api/ping");
(async () => {
  temaUygula(); await yukle(); butonlar(); sesUygula();
  try {
    const o = JSON.parse(localStorage.getItem("oturum") || "null");
    if (o && o.queue && o.queue.length) { Object.assign(S, { base: o.base.filter(i => T(i) && T(i).var), queue: o.queue.filter(i => T(i) && T(i).var), liste: o.liste, karisik: o.karisik, tekrar: o.tekrar }); S.qi = Math.min(o.qi, S.queue.length - 1); if (S.queue.length) calIndex(false, o.t); }
  } catch { }
  bilgi(); await yonlendir(); izle();
  sistemYukle().then(() => { sisCiz(); if (SIS && SIS.eksik.length && /^#\/?$/.test(location.hash || "#/")) yonlendir(); if (SIS && SIS.kurulum && SIS.kurulum.calisiyor) sisIzle(); });
})();

// ---- yatay seritler: basili tutup surukleme + kenar oklari
function kayanGuncelle(s) {
  const k = s.parentNode; if (!k || !k.classList.contains("kayan")) return;
  const tasma = s.scrollWidth - s.clientWidth > 4;
  k.querySelector(".ok.sol").hidden = !tasma || s.scrollLeft < 6;
  k.querySelector(".ok.sag").hidden = !tasma || s.scrollLeft > s.scrollWidth - s.clientWidth - 6;
}
function kayanKur() {
  document.querySelectorAll("#main .satir:not(.kayanli)").forEach(s => {
    s.classList.add("kayanli");
    if (s.style.flexWrap === "wrap") return;
    const k = document.createElement("div"); k.className = "kayan";
    s.parentNode.insertBefore(k, s); k.appendChild(s);
    s.insertAdjacentHTML("beforebegin", `<button class="ok sol" data-act="kaydir" data-y="-1" title="Geri" hidden>${I("chevl")}</button>`);
    s.insertAdjacentHTML("afterend", `<button class="ok sag" data-act="kaydir" data-y="1" title="İleri" hidden>${I("chevr")}</button>`);
    new ResizeObserver(() => kayanGuncelle(s)).observe(s);
    requestAnimationFrame(() => kayanGuncelle(s));
  });
}
new MutationObserver(kayanKur).observe(document.getElementById("main"), { childList: true, subtree: true });
window.addEventListener("resize", () => document.querySelectorAll(".satir.kayanli").forEach(kayanGuncelle));
document.addEventListener("scroll", e => { if (e.target.classList && e.target.classList.contains("kayanli")) kayanGuncelle(e.target); }, true);
let _srk = null;
document.addEventListener("pointerdown", e => {
  const s = e.target.closest && e.target.closest(".satir.kayanli");
  if (!s || e.pointerType !== "mouse" || e.button !== 0 || e.target.closest("input,select,textarea")) return;
  e.preventDefault();                       // metin/resim secimi ve tarayicinin resim surukleme hayaleti baslamasin
  _srk = { s, x: e.clientX, l: s.scrollLeft, tasidi: false };
});
document.addEventListener("pointermove", e => {
  if (!_srk) return;
  const dx = e.clientX - _srk.x;
  if (!_srk.tasidi && Math.abs(dx) > 5) { _srk.tasidi = true; _srk.s.classList.add("tutuldu"); _srk.s.setPointerCapture && _srk.s.setPointerCapture(e.pointerId); }
  if (_srk.tasidi) _srk.s.scrollLeft = _srk.l - dx;
});
const _srkEngel = e => { if (e.target.closest && e.target.closest(".satir.kayanli")) e.preventDefault(); };
document.addEventListener("dragstart", _srkEngel); document.addEventListener("selectstart", _srkEngel);
const _srkBit = () => { if (_srk && _srk.tasidi) { const s = _srk.s; s.classList.remove("tutuldu"); s.dataset.srk = "1"; setTimeout(() => delete s.dataset.srk, 0); } _srk = null; };
document.addEventListener("pointerup", _srkBit); document.addEventListener("pointercancel", _srkBit);
document.addEventListener("click", e => { const s = e.target.closest && e.target.closest(".satir.kayanli"); if (s && s.dataset.srk) { e.stopPropagation(); e.preventDefault(); } }, true);

// pencereye donunce: klasorde elle silinen/eklenen dosyalar kutuphaneye yansisin
let _odakSon = 0;
window.addEventListener("focus", async () => {
  if (Date.now() - _odakSon < 4000) return; _odakSon = Date.now();
  const once = Object.values(L.tracks).filter(t => t.var).length;
  try { await yukle(); await new Promise(r => setTimeout(r, 1500)); await yukle(); } catch { return; }
  const sonra = Object.values(L.tracks).filter(t => t.var).length;
  if (sonra !== once && !/^#\/ayarlar/.test(location.hash) && !(document.activeElement && document.activeElement.matches("input,textarea,select"))) { const sy = main.scrollTop; await yonlendir(); main.scrollTop = sy; }
});

// ---- onizleme: indirmeden 30 sn dinle (ayri bir ses elemani; ana oynatici etkilenmez, calarken durur)
const ONIZLE = { a: null, id: null, durum: "", zaman: null };
const ONIZ_HEPSI = new Set();        // olusturulan tum onizleme ses elemanlari: biri artakalsa bile durdurulur
const ONIZ_SURE = 30;                // saniye
function onizleCiz() {
  document.querySelectorAll("[data-onz]").forEach(el => { el.dataset.durum = el.dataset.onz === ONIZLE.id ? ONIZLE.durum : ""; });
}
function onizleDurdur() {
  clearTimeout(ONIZLE.zaman);
  for (const x of ONIZ_HEPSI) { try { x.pause(); x.removeAttribute("src"); x.load(); } catch { } }
  ONIZ_HEPSI.clear();
  ONIZLE.a = null; ONIZLE.id = null; ONIZLE.durum = ""; onizleCiz();
}
async function onizleBaslat(id) {
  if (!id) return;
  if (ONIZLE.id === id) return onizleDurdur();
  onizleDurdur(); ONIZLE.id = id; ONIZLE.durum = "yukle"; onizleCiz();
  try {
    let a = null;
    for (let deneme = 0; deneme < 2 && !a; deneme++) {       // adres bazen ilk denemede reddedilir: taze adresle bir kez daha dene
      const r = await api("/api/onizle?id=" + encodeURIComponent(id) + (deneme ? "&taze=1" : ""));
      if (ONIZLE.id !== id) return;
      const x = new Audio(r.url); x.volume = Math.min(1, V || .8); x.preload = "auto"; ONIZ_HEPSI.add(x);
      try { await new Promise((tamam, hata) => { x.addEventListener("error", hata, { once: true }); x.addEventListener("playing", tamam, { once: true }); x.play().catch(hata); }); a = x; }
      catch { try { x.pause(); x.removeAttribute("src"); x.load(); } catch { } ONIZ_HEPSI.delete(x); }
    }
    if (!a) throw new Error("Önizleme açılamadı");
    if (ONIZLE.id !== id) { a.pause(); ONIZ_HEPSI.delete(a); return; }
    for (const e of ELEM) if (!e.paused) e.pause();            // ana oynatici susar
    a.addEventListener("ended", onizleDurdur);
    a.addEventListener("error", () => { if (ONIZLE.id === id) onizleDurdur(); });
    a.addEventListener("timeupdate", () => { if (a.currentTime >= ONIZ_SURE && ONIZLE.a === a) onizleDurdur(); });   // zamanlayici susturulsa bile 30 sn'de durur
    ONIZLE.a = a; ONIZLE.durum = "cal"; onizleCiz();
    ONIZLE.zaman = setTimeout(onizleDurdur, ONIZ_SURE * 1000 + 500);
  } catch (e) { if (ONIZLE.id === id) { toast(e.message || "Önizleme açılamadı"); onizleDurdur(); } }
}
ELEM.forEach(e => e.addEventListener("play", () => { if (ONIZLE.id) onizleDurdur(); }));
