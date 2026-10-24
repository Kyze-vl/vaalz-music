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
