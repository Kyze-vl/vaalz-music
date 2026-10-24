/* Android uygulamasi koprusu: yalnizca Kotlin tarafi `VaalzAndroid` nesnesini enjekte ederse calisir (masaustunde hicbir sey yapmaz).
   Calan parcayi bildirim / kilit ekrani / kulaklik denetimlerine bildirir, onlardan gelen komutlari calara iletir. */
(function () {
  if (/[?&]android(&|$)/.test(location.search)) document.documentElement.classList.add("android");   // masaustunde onizleme: /?android
  const gercek = !!window.VaalzAndroid;
  if (gercek) document.documentElement.classList.add("android");
  if (!gercek && !document.documentElement.classList.contains("android")) return;

  // ---- Tema secimi yok: sistem koyuysa Onyx + "Kum" vurgusu, aciksa Retro yagmur bulutu + "Gul" vurgusu ----
  try {
    const temaUygulaAsil = temaUygula;
    temaUygula = function () {
      const koyu = !matchMedia("(prefers-color-scheme: light)").matches;
      TEMA.mod = koyu ? "onyx" : "retro";
      TEMA.vurgu = koyu ? "35,38" : "335,60";
      return temaUygulaAsil.apply(this, arguments);
    };
    temaUygula();
    matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => temaUygula());
  } catch (e) { }

  // ---- Ayarlar sayfasi: ayni ogeleri (kimlikler, olay baglari) koruyup kartlara boler; PC'ye ozel satirlari gizler ----
  function ayarDuzen(sy) {
    sy.dataset.ay = "1";
    const bas = sy.querySelector(".bas"), simge = ["sliders", "moon", "queue", "dl"];
    const gruplar = [{ ad: "", dugumler: [] }];
    let kaydet = null;
    for (const d of Array.from(sy.children)) {
      if (d === bas) continue;
      if (d.matches("h2.b")) { gruplar.push({ ad: d.textContent.trim(), dugumler: [] }); d.remove(); continue; }
      if (d.querySelector("[data-act=ayarKaydet]")) { kaydet = d; continue; }
      gruplar[gruplar.length - 1].dugumler.push(d);
    }
    // Android'de anlamsiz / islevsiz satirlar: cerez tarayicisi, klasoru ac, "YouTube aramasi" aciklamasi
    const gizle = (...l) => l.forEach(e => e && e.classList.add("ay-gizli"));
    const cerez = sy.querySelector("#aCerez"); if (cerez) gizle(cerez.previousElementSibling, cerez);
    const klasor = sy.querySelector("[data-act=klasorAc]");
    if (klasor) { const ip = klasor.closest(".ip"); gizle(ip.previousElementSibling, ip, ip.nextElementSibling); }
    const liste = sy.querySelector("#aListe");
    if (liste) { const et = liste.previousElementSibling; gizle(et && et.previousElementSibling, et && et.previousElementSibling && et.previousElementSibling.previousElementSibling); }
    gruplar.forEach((g, i) => {
      if (!g.dugumler.length) return;
      if (g.dugumler.some(n => n.matches && (n.matches(".temalar") || n.querySelector(".temalar")))) { g.dugumler.forEach(n => n.remove()); return; }   // tema secimi Android'de yok
      const k = document.createElement("details");
      k.className = "ay-k"; if (i < 2) k.open = true;
      const s = document.createElement("summary");
      s.innerHTML = (typeof I === "function" ? I(simge[i] || "sliders") : "") + `<b>${g.ad || (document.documentElement.lang === "en" ? "General" : "Genel")}</b>`;
      const ic = document.createElement("div"); ic.className = "ay-ic";
      g.dugumler.forEach(n => ic.appendChild(n));
      k.append(s, ic); sy.appendChild(k);
    });
    if (kaydet) { kaydet.classList.add("ay-kaydet"); sy.appendChild(kaydet); }
  }
  new MutationObserver(() => {
    const sy = document.querySelector("#main .sy:not([data-ay])");
    if (sy && sy.querySelector("#aDil")) ayarDuzen(sy);
  }).observe(document.getElementById("main"), { childList: true });

  // ---- Mini calar cubugu kaldirildi: yalnizca cal/duraklat dugmesi alt hapin en sagina tasinir (kimlik ve olay baglari ayni kalir) ----
  const cal = document.getElementById("btnCal"), ray = document.getElementById("rail");
  if (cal && ray) { cal.classList.add("ray-cal"); ray.appendChild(cal); }

  // ---- "Simdi caliyor" karti: mini calar bilgisi (kapak, ad, begen) hapin ustunde yuzer; dokununca / yukari kaydirinca tam ekran calar acilir ----
  const sol = document.querySelector("#dock .d-sol");
  if (sol) {
    const kart = document.createElement("div");
    kart.id = "ayKart"; kart.dataset.act = "odakAc";
    kart.appendChild(sol); document.body.appendChild(kart);
    const gorun = () => {
      let var_ = false; try { var_ = S.qi >= 0 && !!S.queue[S.qi]; } catch (e) { }
      kart.classList.toggle("var", var_); document.documentElement.classList.toggle("ay-kartli", var_);
    };
    new MutationObserver(gorun).observe(document.getElementById("dBaslik"), { childList: true, characterData: true, subtree: true });
    gorun(); setInterval(gorun, 1500);
    let y0 = null;
    kart.addEventListener("touchstart", e => { y0 = e.touches[0].clientY; }, { passive: true });
    kart.addEventListener("touchend", e => {
      if (y0 !== null && y0 - e.changedTouches[0].clientY > 30 && !e.target.closest("#btnBegen")) { e.preventDefault(); H.odakGoster(); }
      y0 = null;
    });
  }

  // ---- Tam ekran calar (Android): yalnizca calma ekrani; sira / sozler / benzer alttan acilan pencerede ----
  const odak = document.getElementById("odak");
  if (odak) {
    const ust = odak.querySelector(".o-ust"), kapat = ust && ust.querySelector("[data-act=odakKapat]");
    if (kapat) kapat.innerHTML = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';   // X yerine asagi ok
    const sol = odak.querySelector(".o-sol"), meta = odak.querySelector(".o-meta"), seek = odak.querySelector(".seekrow");
    const sag = document.getElementById("oSag");
    const ad = document.documentElement.lang === "en" ? ["Up next", "Lyrics", "Related"] : ["Sıradakiler", "Sözler", "Benzer"];
    // eylem dugmeleri (sira / sozler / benzer)
    const cip = document.createElement("div"); cip.className = "ay-cipler";
    [["sira", ad[0]], ["soz", ad[1]], ["benzer", ad[2]]].forEach(([k2, t]) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "ay-cip"; b.textContent = t; b.dataset.k = k2; cip.appendChild(b);
    });
    meta.after(cip);
    // ince ilerleme cubugu (tuvalin yerine)
    let surukleniyor = false;
    const cubuk = document.createElement("div"); cubuk.className = "ay-cubuk";
    cubuk.innerHTML = "<i></i><b></b>"; seek.insertBefore(cubuk, seek.querySelector("canvas"));
    const dolgu = cubuk.querySelector("i"), top = cubuk.querySelector("b");
    const yaz = o => { dolgu.style.width = top.style.left = (o * 100) + "%"; };
    const sureVar = () => isFinite(audio.duration) && audio.duration > 0;
    const guncelle = () => yaz(sureVar() ? Math.min(1, audio.currentTime / audio.duration) : 0);
    for (const el of ELEM) el.addEventListener("timeupdate", e => { if (e.target === audio && !surukleniyor) guncelle(); });
    const oranAl = e => { const r = cubuk.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); };
    cubuk.addEventListener("pointerdown", e => { surukleniyor = true; cubuk.setPointerCapture(e.pointerId); cubuk.classList.add("tut"); yaz(oranAl(e)); });
    cubuk.addEventListener("pointermove", e => { if (surukleniyor) yaz(oranAl(e)); });
    const birak = e => {
      if (!surukleniyor) return;
      surukleniyor = false; cubuk.classList.remove("tut");
      if (sureVar()) audio.currentTime = oranAl(e) * audio.duration;
    };
    cubuk.addEventListener("pointerup", birak); cubuk.addEventListener("pointercancel", birak);
    // alttan acilan pencere
    const perde = document.createElement("div"); perde.className = "ay-perde"; odak.querySelector(".o-ana").appendChild(perde);
    const tutac = document.createElement("div"); tutac.className = "ay-tutac"; tutac.innerHTML = "<i></i>"; sag.prepend(tutac);
    const ac = k2 => {
      const b = document.querySelector('#kuyruk [data-act=kTab][data-k="' + k2 + '"]'); if (b) b.click();
      odak.classList.add("ay-sheet");
    };
    const kapatPencere = () => { if (odak.classList.contains("ay-sheet")) odak.classList.remove("ay-sheet"); };   // gereksiz yazim izleyiciyi sonsuz dongude tetikler
    cip.addEventListener("click", e => { const b = e.target.closest(".ay-cip"); if (b) ac(b.dataset.k); });
    perde.addEventListener("click", kapatPencere);
    odak.addEventListener("click", e => { if (e.target.closest("#kuyruk .kc") || e.target.closest(".ay-tutac")) kapatPencere(); });
    let sy = null;
    sag.addEventListener("touchstart", e => { sy = e.touches[0].clientY; }, { passive: true });
    sag.addEventListener("touchend", e => { if (sy !== null && e.changedTouches[0].clientY - sy > 70 && e.target.closest(".k-bas, .ay-tutac")) kapatPencere(); sy = null; });
    // altta "Sıradakiler" tutacagi: dokun / yukari kaydir
    const alt = document.createElement("button"); alt.type = "button"; alt.className = "ay-alt"; alt.innerHTML = "<i></i><span>" + ad[0] + "</span>";
    alt.addEventListener("click", () => ac("sira"));
    let ay0 = null;
    alt.addEventListener("touchstart", e => { ay0 = e.touches[0].clientY; }, { passive: true });
    alt.addEventListener("touchend", e => { if (ay0 !== null && ay0 - e.changedTouches[0].clientY > 30) { e.preventDefault(); ac("sira"); } ay0 = null; });
    sol.appendChild(alt);
    // orta alandan tutup asagi kaydirinca calar parmagi izleyerek kapanir
    let kx = null, ky = null, kd = 0, kt = 0, surukle = false;
    sol.addEventListener("touchstart", e => {
      if (odak.classList.contains("ay-sheet") || e.target.closest(".ay-cubuk, button, .kont, .ay-cipler")) { ky = null; return; }
      kx = e.touches[0].clientX; ky = e.touches[0].clientY; kd = 0; kt = performance.now(); surukle = false;
    }, { passive: true });
    sol.addEventListener("touchmove", e => {
      if (ky === null) return;
      const dy = e.touches[0].clientY - ky, dx = e.touches[0].clientX - kx;
      if (!surukle && dy > 12 && dy > Math.abs(dx) * 1.5) { surukle = true; odak.style.transition = "none"; }
      if (!surukle) return;
      kd = Math.max(0, dy); odak.style.transform = "translateY(" + kd + "px)";
    }, { passive: true });
    const kBitir = () => {
      if (ky === null) return;
      const hizli = kd > 40 && kd / Math.max(1, performance.now() - kt) > 0.6;
      ky = null;
      if (!surukle) return;
      surukle = false;
      odak.style.transition = ""; odak.style.transform = "";      // parmagin biraktigi konumdan sinifa bagli gecis devralir
      if (kd > 140 || hizli) H.odakKapat();
    };
    sol.addEventListener("touchend", kBitir); sol.addEventListener("touchcancel", kBitir);
    new MutationObserver(() => { if (!odak.classList.contains("acik")) kapatPencere(); else guncelle(); }).observe(odak, { attributes: true, attributeFilter: ["class", "hidden"] });
  }

  if (!gercek) return;

  function gonder() {
    try {
      const id = S.queue[S.qi], t = id && T(id);
      const sure = (isFinite(audio.duration) && audio.duration) || (t && t.duration) || 0;
      VaalzAndroid.durum(JSON.stringify({
        var: !!t,
        caliyor: !audio.paused,
        baslik: t ? t.title : "",
        sanatci: t ? t.artist : "",
        album: t ? t.album : "",
        sure: Math.round(sure * 1000),
        konum: Math.round(audio.currentTime * 1000),
        kapak: t ? (kapakUrl(id) || "") : ""
      }));
    } catch (e) { }
  }

  for (const el of ELEM)
    for (const ad of ["play", "pause", "seeked", "loadedmetadata", "durationchange", "emptied"])
      el.addEventListener(ad, e => { if (e.target === audio) gonder(); });
  setInterval(gonder, 4000);          // konum kaymasini duzeltir; Kotlin degismeyen durumu yok sayar

  window.__vaalzKomut = function (k, v) {
    if (k === "play") audio.play().catch(() => { });
    else if (k === "pause") durdurHepsi();
    else if (k === "next") sonraki(false);
    else if (k === "prev") onceki();
    else if (k === "seek") audio.currentTime = v / 1000;
  };
})();
