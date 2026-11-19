/* Android uygulamasi koprusu: yalnizca Kotlin tarafi `VaalzAndroid` nesnesini enjekte ederse calisir (masaustunde hicbir sey yapmaz).
   Calan parcayi bildirim / kilit ekrani / kulaklik denetimlerine bildirir, onlardan gelen komutlari calara iletir. */
(function () {
  if (/[?&]android(&|$)/.test(location.search)) document.documentElement.classList.add("android");   // masaustunde onizleme: /?android
  const gercek = !!window.VaalzAndroid;
  if (gercek) document.documentElement.classList.add("android");
  if (!gercek && !document.documentElement.classList.contains("android")) return;

  // WebView'in prefers-color-scheme degeri uygulama temasina (hep koyu) bagli kalir; sistem modunu Android'den okuruz
  const sistemKoyu = () => {
    try { if (window.VaalzAndroid && typeof VaalzAndroid.koyuMu === "function") return !!VaalzAndroid.koyuMu(); } catch (e) { }
    return !matchMedia("(prefers-color-scheme: light)").matches;
  };
  // ---- Tema secimi yok: sistem koyuysa Onyx + "Kum" vurgusu, aciksa Retro yagmur bulutu + "Gul" vurgusu ----
  try {
    const temaUygulaAsil = temaUygula;
    temaUygula = function () {
      const koyu = sistemKoyu();
      TEMA.mod = koyu ? "onyx" : "retro";
      if (TEMA.vurgu !== "oto") TEMA.vurgu = koyu ? "35,38" : "335,60";
      return temaUygulaAsil.apply(this, arguments);
    };
    temaUygula();
    matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => temaUygula());
    window.__vaalzTema = () => temaUygula();      // Kotlin, sistem modu degisince cagirir
  } catch (e) { }

  // ---- Ayarlar sayfasi: ayni ogeleri (kimlikler, olay baglari) koruyup kartlara boler; PC'ye ozel satirlari gizler ----
  let ayGeri = null;
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
    // Satir listesi (Netflix / Disney / Anizium tarzi): bolum etiketi, ikon + baslik + soluk deger + ok; dokununca alt sayfa acilir
    const en = document.documentElement.lang === "en";
    const yaziAl = (sel, f) => { const e = sy.querySelector(sel); return e ? f(e) : ""; };
    const tema = g => g.dugumler.some(n => n.matches && (n.matches(".temalar") || n.querySelector(".temalar")));
    gruplar.forEach(g => { if (tema(g)) { g.dugumler.forEach(n => n.remove()); g.dugumler = []; } });          // tema secimi Android'de yok
    const g0 = gruplar[0].dugumler;
    const dilNode = g0.find(n => n.querySelector && n.querySelector("#aDil"));
    const agNode = g0.find(n => n.classList && n.classList.contains("kutu") && n.id !== "sisKutu");
    const sesG = gruplar.find(g => g.dugumler.some(n => n.querySelector && n.querySelector("#eqOn")));
    const dlG = gruplar.find(g => g.dugumler.some(n => n.querySelector && n.querySelector("#aTasarruf")));
    const svg = ic => '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + ic + "</svg>";
    const gorunumDeger = () => (typeof TEMA !== "undefined" && TEMA.vurgu === "oto")
      ? (en ? "Auto from cover" : "Kapağa göre otomatik")
      : (en ? "Default (Yellow)" : "Varsayılan (Sarı)");
    const gorunumPanel = document.createElement("div");
    gorunumPanel.className = "ay-gorunum-panel";
    const gorunumSecenekler = [
      { k: "35,38", ad: en ? "Default (Yellow)" : "Varsayılan (Sarı)", alt: en ? "Fixed warm yellow background and accent" : "Sabit sıcak sarı arka plan ve vurgu rengi" },
      { k: "oto", ad: en ? "Auto from cover" : "Kapağa göre otomatik", alt: en ? "Adapts to the currently playing track cover" : "Çalan şarkının kapağına göre otomatik ayarlanır" }
    ];
    const gorunumKart = document.createElement("div"); gorunumKart.className = "ay-kart-grup";
    gorunumSecenekler.forEach(opt => {
      const btn = document.createElement("button"); btn.type = "button"; btn.className = "ay-radio-satir"; btn.dataset.vurgu = opt.k;
      btn.innerHTML = '<span class="ay-metin"><b>' + opt.ad + '</b><span class="ay-deger">' + opt.alt + '</span></span><span class="ay-radio"><i></i></span>';
      btn.addEventListener("click", () => {
        if (typeof TEMA !== "undefined") { TEMA.vurgu = opt.k; if (typeof temaUygula === "function") temaUygula(); }
        gorunumYenile();
        degerleriYenile();
      });
      gorunumKart.appendChild(btn);
    });
    const gorunumNot = document.createElement("p"); gorunumNot.className = "ay-kart-not";
    gorunumNot.textContent = en ? "Choose between the default yellow tone or automatic colors from the current song cover." : "Tam ekran oynatıcı ve uygulama vurgu rengi seçiminize göre anında güncellenir.";
    gorunumPanel.append(gorunumKart, gorunumNot);
    const gorunumYenile = () => {
      const aktifV = (typeof TEMA !== "undefined" && TEMA.vurgu === "oto") ? "oto" : "35,38";
      gorunumKart.querySelectorAll(".ay-radio-satir").forEach(b => b.classList.toggle("on", b.dataset.vurgu === aktifV));
    };
    gorunumYenile();

    const IKON = {
      gorunum: svg('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18c1.5 0 2.5-1 2.5-2.2 0-.6-.2-1.1-.6-1.5-.4-.4-.6-.9-.6-1.5 0-1.1.9-2 2-2H17a4 4 0 0 0 4-4c0-4.4-4-7.8-9-7.8z"/>'),
      dil: svg('<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'),
      ag: svg('<path d="M3 12h4l3-8 4 16 3-8h4"/>'),
      ses: typeof I === "function" ? I("queue") : "",
      dl: typeof I === "function" ? I("dl") : ""
    };
    const satirlar = [
      { bolum: en ? "DISPLAY OPTIONS" : "GÖRÜNTÜLEME SEÇENEKLERİ", id: "gorunum", baslik: en ? "Background color" : "Arkaplan rengi", dugumler: [gorunumPanel], deger: gorunumDeger },
      { bolum: en ? "AUDIO & DOWNLOADS" : "SES VE İNDİRME", id: "ses", baslik: en ? "Sound and playback" : "Ses ve oynatma", dugumler: sesG ? sesG.dugumler : [],
        deger: () => (yaziAl("#eqOn", e => e.checked) ? (en ? "Equalizer on" : "Ekolayzır açık") : (en ? "Equalizer off" : "Ekolayzır kapalı")) + " · " + (en ? "Crossfade " : "Geçiş ") + yaziAl("#cfSn", e => e.textContent) },
      { id: "dl", baslik: en ? "Downloads" : "İndirme", dugumler: dlG ? dlG.dugumler : [],
        deger: () => yaziAl("#esN", e => e.textContent) + (yaziAl("#aTasarruf", e => e.checked) ? (en ? " · data saver" : " · veri tasarrufu") : "") },
      { bolum: en ? "GENERAL" : "GENEL", id: "dil", baslik: "Dil / Language", dugumler: dilNode ? [dilNode] : [], deger: () => yaziAl("#aDil", e => e.options[e.selectedIndex].text) },
      { id: "ag", baslik: en ? "Internet usage" : "İnternet kullanımı", dugumler: agNode ? [agNode] : [], deger: () => { const e = agNode && agNode.querySelector("b"); return e ? (en ? "This month " : "Bu ay ") + e.textContent : ""; } }
    ].filter(s => s.dugumler.length);
    const ayListe = document.createElement("div"); ayListe.className = "ay-liste";
    const sayfalar = {};
    const degerleriYenile = () => satirlar.forEach(s => { const e = ayListe.querySelector('[data-ay-id="' + s.id + '"] .ay-deger'); if (e) e.textContent = s.deger(); });
    let aktif = null;
    const sunucusuz = id => id === "dil" || id === "ag" || id === "gorunum";
    const kapat = () => {
      if (!aktif) return;
      const kb = kaydet && kaydet.querySelector("[data-act=ayarKaydet]"); if (kb && !sunucusuz(aktif)) kb.click();   // ayarlar kapanirken kendiliginden kaydedilir
      sayfalar[aktif].hidden = true; sy.classList.remove("ay-ic-acik"); aktif = null; degerleriYenile();
      document.getElementById("main").scrollTop = 0;
    };
    const ac = id => {
      aktif = id; sayfalar[id].hidden = false; sy.classList.add("ay-ic-acik");
      if (kaydet && !sunucusuz(id)) sayfalar[id].appendChild(kaydet);
      document.getElementById("main").scrollTop = 0;
    };
    ayGeri = () => {
      if (!sy.isConnected) { ayGeri = null; return false; }      // sayfa degisti: eski alt sayfa geri tusunu tuketmesin
      if (aktif) { kapat(); return true; }
      return false;
    };
    // her degisiklik kendiliginden kaydedilir (alt sayfadan baska sekmeye gecilse de kayip olmasin)
    let kaydetZ = 0;
    sy.addEventListener("change", () => {
      clearTimeout(kaydetZ);
      kaydetZ = setTimeout(() => { const kb = kaydet && kaydet.querySelector("[data-act=ayarKaydet]"); if (sy.isConnected && kb && aktif && !sunucusuz(aktif)) kb.click(); }, 500);
    });
    let aktifGrup = null;
    satirlar.forEach(s => {
      if (s.bolum) {
        const et = document.createElement("div"); et.className = "ay-etiket"; et.textContent = s.bolum; ayListe.appendChild(et);
        aktifGrup = document.createElement("div"); aktifGrup.className = "ay-kart-grup"; ayListe.appendChild(aktifGrup);
      }
      const b = document.createElement("button"); b.type = "button"; b.className = "ay-satir"; b.dataset.ayId = s.id;
      b.innerHTML = IKON[s.id] + '<span class="ay-metin"><b>' + s.baslik + '</b><span class="ay-deger"></span></span>';
      b.addEventListener("click", () => ac(s.id)); (aktifGrup || ayListe).appendChild(b);
      const sp = document.createElement("div"); sp.className = "ay-sayfa"; sp.hidden = true;
      const ust = document.createElement("div"); ust.className = "ay-ust2";
      const geri = document.createElement("button"); geri.type = "button"; geri.className = "ay-geri"; geri.setAttribute("aria-label", en ? "Back" : "Geri"); geri.innerHTML = svg('<path d="m15 18-6-6 6-6"/>'); geri.addEventListener("click", kapat);
      const bs = document.createElement("h2"); bs.textContent = s.baslik; ust.append(geri, bs);
      const ic = document.createElement("div"); ic.className = "ay-ic"; s.dugumler.forEach(n => ic.appendChild(n));
      sp.append(ust, ic); sy.appendChild(sp); sayfalar[s.id] = sp;
    });
    const stilSel = sy.querySelector("#cubukStil");                    // "Düz çizgi" secenegi: oynatici ilerleme cubugu
    if (stilSel && !stilSel.querySelector('option[value="duz"]')) {
      const o = document.createElement("option"); o.value = "duz"; o.textContent = en ? "Plain line" : "Düz çizgi";
      stilSel.insertBefore(o, stilSel.firstChild); try { stilSel.value = AY.stil; } catch (x) { }
    }
    const kartEkle = (kap, baslik, satirlarDizisi) => {
      if (baslik) { const et = document.createElement("div"); et.className = "ay-etiket"; et.textContent = baslik; kap.appendChild(et); }
      const g = document.createElement("div"); g.className = "ay-kart-grup ay-ic-kart";
      satirlarDizisi.forEach(oge => {
        if (!oge) return;
        const r = document.createElement("div"); r.className = "ay-ic-satir";
        (Array.isArray(oge) ? oge : [oge]).forEach(n => n && r.appendChild(n));
        if (r.childNodes.length) g.appendChild(r);
      });
      if (g.childNodes.length) kap.appendChild(g);
    };
    const sesIc = sayfalar.ses && sayfalar.ses.querySelector(".ay-ic");
    if (sesIc) {
      const eqLbl = sesIc.querySelector("#eqOn") && sesIc.querySelector("#eqOn").closest("label");
      const eqPreIp = sesIc.querySelector("#eqPre") && sesIc.querySelector("#eqPre").closest(".ip");
      const ekoz = sesIc.querySelector(".ekoz");
      const esitleLbl = sesIc.querySelector("#esitleOn") && sesIc.querySelector("#esitleOn").closest("label");
      const esitleIp = sesIc.querySelector("#esitleHedef") && sesIc.querySelector("#esitleHedef").closest(".ip");
      const cfR = sesIc.querySelector("#cfR");
      const cfLbl = cfR && cfR.previousElementSibling;
      const stilLbl = stilSel && stilSel.previousElementSibling;
      const kalan = Array.from(sesIc.children).filter(n => ![eqLbl, eqPreIp, ekoz, esitleLbl, esitleIp, cfLbl, cfR, stilLbl, stilSel].includes(n));
      sesIc.innerHTML = "";
      kartEkle(sesIc, en ? "EQUALIZER" : "EKOLAYZIR", [eqLbl, eqPreIp, ekoz]);
      kartEkle(sesIc, en ? "SOUND CHECK & CROSSFADE" : "SES DENETİMİ VE GEÇİŞ", [esitleLbl, esitleIp, [cfLbl, cfR]]);
      kartEkle(sesIc, en ? "PLAYER" : "OYNATICI", [[stilLbl, stilSel]]);
      kalan.forEach(n => sesIc.appendChild(n));
    }
    const dlIc = sayfalar.dl && sayfalar.dl.querySelector(".ay-ic");
    if (dlIc) {
      const tasarrufLbl = dlIc.querySelector("#aTasarruf") && dlIc.querySelector("#aTasarruf").closest("label");
      const esInput = dlIc.querySelector("#aEs");
      const esLbl = esInput && esInput.previousElementSibling;
      const oneriLbl = dlIc.querySelector("#aOneri") && dlIc.querySelector("#aOneri").closest("label");
      const notlar = Array.from(dlIc.querySelectorAll("p.not:not(.ay-gizli)")).map(p => p.textContent.trim()).filter(Boolean);
      const gizliler = Array.from(dlIc.querySelectorAll(".ay-gizli"));
      dlIc.innerHTML = "";
      kartEkle(dlIc, en ? "DOWNLOAD OPTIONS" : "İNDİRME SEÇENEKLERİ", [tasarrufLbl, [esLbl, esInput]]);
      kartEkle(dlIc, en ? "HOME SUGGESTIONS" : "ANA SAYFA ÖNERİLERİ", [oneriLbl]);
      if (notlar.length) {
        const notP = document.createElement("p"); notP.className = "ay-kart-not";
        notP.textContent = notlar[0];
        dlIc.appendChild(notP);
      }
      gizliler.forEach(n => dlIc.appendChild(n));
    }
    const dilIc = sayfalar.dil && sayfalar.dil.querySelector(".ay-ic");
    if (dilIc && dilIc.firstElementChild) {
      const n = dilIc.firstElementChild;
      dilIc.innerHTML = "";
      kartEkle(dilIc, en ? "LANGUAGE" : "DİL SEÇİMİ", [n]);
    }
    sy.insertBefore(ayListe, bas.nextSibling);
    // "Kapaklari tara": guncelleme/yeniden kurulum sonrasi eksik kalan kapaklari tek dokunusla getirir (GENEL kartinda)
    const kapakBtn = document.createElement("button");
    kapakBtn.type = "button";
    kapakBtn.className = "ay-satir ay-aksiyon";
    const kapakDeger = () => {
      const n = (typeof L !== "undefined" && L.kapaksiz) ? L.kapaksiz : 0;
      return n > 0 ? (en ? n + " missing covers" : n + " eksik kapak") : (en ? "All covers present" : "Tüm kapaklar mevcut");
    };
    kapakBtn.innerHTML = svg('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>') +
      '<span class="ay-metin"><b>' + (en ? "Scan covers" : "Kapakları tara") + '</b><span class="ay-deger">' + kapakDeger() + '</span></span>';
    kapakBtn.addEventListener("click", async () => {
      const alt = kapakBtn.querySelector(".ay-deger");
      if (alt) alt.textContent = en ? "Scanning…" : "Taranıyor…";
      try {
        await api("/api/tara", {});
        const r = await api("/api/kapaklari-getir", {});
        if (r && r.sayi > 0) {
          if (typeof izle === "function") izle();
          if (typeof toast === "function") toast(en ? `Fetching ${r.sayi} missing covers…` : `${r.sayi} eksik kapak ekleniyor…`);
        } else {
          if (typeof toast === "function") toast(en ? "All covers are up to date" : "Tüm kapaklar zaten mevcut");
        }
        if (typeof yukle === "function") await yukle();
      } catch (x) {
        if (typeof toast === "function") toast(en ? "Could not scan covers" : "Kapaklar taranamadı");
      }
      if (alt) alt.textContent = kapakDeger();
    });
    (aktifGrup || ayListe).appendChild(kapakBtn);
    degerleriYenile();
    gruplar.forEach(g => g.dugumler.forEach(n => { if (!n.isConnected) return; if (n.classList && n.classList.contains("ay-gizli")) return; if (!n.closest(".ay-ic")) n.classList.add("ay-gizli"); }));
    if (kaydet) { kaydet.classList.add("ay-kaydet"); sy.appendChild(kaydet); }
  }
  new MutationObserver(() => {
    const sy = document.querySelector("#main .sy:not([data-ay])");
    if (sy && sy.querySelector("#aDil")) ayarDuzen(sy);
  }).observe(document.getElementById("main"), { childList: true });

  // ---- Alt hap: Kutuphane ile Ayarlar yer degistirir (Ana Sayfa - Ayarlar - Kutuphane) ----
  const cal = document.getElementById("btnCal"), ray = document.getElementById("rail");
  if (ray) {
    const nav = ray.querySelector("nav"), rfoot = ray.querySelector(".rfoot");
    const nvKit = ray.querySelector('[data-nav="kitaplik"]'), nvAyar = ray.querySelector('[data-nav="ayarlar"]');
    if (nav && rfoot && nvKit && nvAyar) { nav.appendChild(nvAyar); rfoot.appendChild(nvKit); }
  }

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

  // ---- Tam ekran calar (Android): Apple Music 3 modlu yerlesim (cal / soz / sira) ----
  const odak = document.getElementById("odak");
  if (odak) {
    odak.dataset.ayMod = "cal";
    const ust = odak.querySelector(".o-ust"), kapat = ust && ust.querySelector("[data-act=odakKapat]");
    if (kapat) kapat.innerHTML = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';   // X yerine asagi ok
    const sol = odak.querySelector(".o-sol"), meta = odak.querySelector(".o-meta"), seek = odak.querySelector(".seekrow");
    const sag = document.getElementById("oSag");
    const ad = document.documentElement.lang === "en" ? ["Up next", "Lyrics", "Related"] : ["Sıradakiler", "Sözler", "Benzer"];

    // Meta satiri: solda baslik/sanatci, sagda daire Begen + Uyku/Daha fazla dugmeleri
    const metaRow = document.createElement("div"); metaRow.className = "o-meta-row";
    meta.parentNode.insertBefore(metaRow, meta);
    metaRow.appendChild(meta);
    const metaAks = document.createElement("div"); metaAks.className = "o-meta-aks";
    const odakBegen = document.createElement("button"); odakBegen.type = "button"; odakBegen.className = "ib ay-daire"; odakBegen.id = "ayOdakBegen"; odakBegen.dataset.act = "begenCal"; odakBegen.title = "Beğen";
    const odakUyku = document.createElement("button"); odakUyku.type = "button"; odakUyku.className = "ib ay-daire ay-uyku-btn"; odakUyku.dataset.act = "uyku"; odakUyku.title = "Uyku zamanlayıcısı";
    odakUyku.innerHTML = (typeof I === "function" ? I("moon") : "") + '<span class="ay-uyku-rozet" id="ayUykuRozet" hidden></span>';
    const uykuRozet = odakUyku.querySelector("#ayUykuRozet");
    const uykuGuncelle = () => {
      const k = typeof window.__vaalzUykuKalan === "function" ? window.__vaalzUykuKalan() : "";
      odakUyku.classList.toggle("ac", !!k);
      if (uykuRozet) { uykuRozet.hidden = !k; uykuRozet.textContent = k === "Parça bitince" ? "Son" : (k ? k.split(":").slice(0, -1).join(":") + "d" : ""); }
    };
    window.addEventListener("vaalz-uyku", uykuGuncelle);
    setInterval(() => { if (!odak.hidden) uykuGuncelle(); }, 15000);
    uykuGuncelle();
    metaAks.append(odakBegen, odakUyku);
    metaRow.appendChild(metaAks);

    // #btnBegen durumunu odak ekranindaki begen dugmesine esitle
    const btnBegen0 = document.getElementById("btnBegen");
    const esitleBegen = () => {
      if (!btnBegen0) return;
      odakBegen.innerHTML = btnBegen0.innerHTML;
      odakBegen.classList.toggle("ac", btnBegen0.classList.contains("ac"));
    };
    if (btnBegen0) {
      new MutationObserver(esitleBegen).observe(btnBegen0, { childList: true, attributes: true, attributeFilter: ["class"] });
      esitleBegen();
    }

    // Kucuk kapak + baslik ust cubugu (soz / sira modunda ustte gorunur)
    const miniKapak = document.createElement("div"); miniKapak.className = "cv ay-mini-cv";
    metaRow.prepend(miniKapak);
    const oKapak = document.getElementById("oKapak");
    const esitleKapak = () => { if (oKapak) miniKapak.innerHTML = oKapak.innerHTML; };
    if (oKapak) {
      new MutationObserver(esitleKapak).observe(oKapak, { childList: true, attributes: true });
      esitleKapak();
    }

    // Sira modunda ustte 3 esit hap dugme (Karistir / Tekrar / Benzer)
    const siraKont = document.createElement("div"); siraKont.className = "ay-sira-kont";
    const oKaris = document.getElementById("oKaris"), oTekrar = document.getElementById("oTekrar");
    const btnBenzerMod = document.createElement("button"); btnBenzerMod.type = "button"; btnBenzerMod.className = "ib ay-benzer-hap"; btnBenzerMod.title = ad[2];
    btnBenzerMod.innerHTML = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z"/></svg>';
    if (oKaris) siraKont.appendChild(oKaris);
    if (oTekrar) siraKont.appendChild(oTekrar);
    siraKont.appendChild(btnBenzerMod);
    sag.prepend(siraKont);

    // ince ilerleme cubugu (tuvalin yerine)
    let surukleniyor = false;
    const cubuk = document.createElement("div"); cubuk.className = "ay-cubuk";
    cubuk.innerHTML = "<i></i><b></b>"; seek.insertBefore(cubuk, seek.querySelector("canvas"));
    const dolgu = cubuk.querySelector("i"), top = cubuk.querySelector("b");
    cubuk.setAttribute("role", "slider"); cubuk.tabIndex = 0;
    cubuk.setAttribute("aria-label", document.documentElement.lang === "en" ? "Progress" : "İlerleme");
    cubuk.setAttribute("aria-valuemin", "0"); cubuk.setAttribute("aria-valuemax", "100"); cubuk.setAttribute("aria-valuenow", "0");
    const yaz = o => { dolgu.style.width = top.style.left = (o * 100) + "%"; cubuk.setAttribute("aria-valuenow", String(Math.round(o * 100))); };
    cubuk.addEventListener("keydown", e => {
      const d = isFinite(audio.duration) ? audio.duration : 0;
      if (!d) return;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") { audio.currentTime = Math.min(d, audio.currentTime + 5); e.preventDefault(); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { audio.currentTime = Math.max(0, audio.currentTime - 5); e.preventDefault(); }
    });
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
    const stilUygula = () => { odak.classList.toggle("ay-duz", AY.stil === "duz"); try { oDalga.boyutla(); dalgaBaslat(); } catch (x) { } };
    try { if (!localStorage.getItem("ay_cubuk_ilk")) { localStorage.setItem("ay_cubuk_ilk", "1"); if (AY.stil !== "form") { AY.stil = "duz"; ayKaydet(); } } } catch (x) { }
    stilUygula();
    document.addEventListener("change", e => { if (e.target && e.target.id === "cubukStil") stilUygula(); });

    // Alttaki 3 ikonlu Apple Music cubugu: Sozler | Benzer | Siradakiler
    const altBar = document.createElement("div"); altBar.className = "ay-alt-bar";
    const mkBtn = (k2, baslik, svgI) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "ib ay-alt-b"; b.dataset.k = k2; b.title = baslik;
      b.innerHTML = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + svgI + '</svg>';
      return b;
    };
    const bSoz = mkBtn("soz", ad[1], '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M9 9h.01M15 9h.01" stroke-width="2.4"/>');
    const bBenzer = mkBtn("benzer", ad[2], '<path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z"/>');
    const bSira = mkBtn("sira", ad[0], '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/>');
    altBar.append(bSoz, bBenzer, bSira);
    sol.appendChild(altBar);

    const modKur = (mod, sekme) => {
      odak.dataset.ayMod = mod;
      const k2 = sekme || (mod === "soz" ? "soz" : "sira");
      const tab = document.querySelector('#kuyruk [data-act=kTab][data-k="' + k2 + '"]');
      if (mod !== "cal" && tab) tab.click();
      bSoz.classList.toggle("on", mod === "soz");
      bSira.classList.toggle("on", mod === "sira" && k2 !== "benzer");
      bBenzer.classList.toggle("on", mod === "sira" && k2 === "benzer");
      btnBenzerMod.classList.toggle("ac", mod === "sira" && k2 === "benzer");
    };

    bSoz.addEventListener("click", () => modKur(odak.dataset.ayMod === "soz" ? "cal" : "soz", "soz"));
    bSira.addEventListener("click", () => modKur(odak.dataset.ayMod === "sira" && !bBenzer.classList.contains("on") ? "cal" : "sira", "sira"));
    bBenzer.addEventListener("click", () => modKur(odak.dataset.ayMod === "sira" && bBenzer.classList.contains("on") ? "cal" : "sira", "benzer"));
    btnBenzerMod.addEventListener("click", () => modKur("sira", bBenzer.classList.contains("on") ? "sira" : "benzer"));
    miniKapak.addEventListener("click", () => modKur("cal"));

    // Orta/ust alandan tutup asagi kaydirinca calar parmagi izleyerek kapanir
    let kx = null, ky = null, kd = 0, kt = 0, surukle = false;
    odak.addEventListener("touchstart", e => {
      if (e.target.closest(".ay-cubuk, button, .kont, .ay-alt-bar, .ay-sira-kont, #kuyrukListe, #sozKutu, #benzerKutu")) { ky = null; return; }
      kx = e.touches[0].clientX; ky = e.touches[0].clientY; kd = 0; kt = performance.now(); surukle = false;
    }, { passive: true });
    odak.addEventListener("touchmove", e => {
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
      odak.style.transition = ""; odak.style.transform = "";
      if (kd > 140 || hizli) H.odakKapat();
    };
    odak.addEventListener("touchend", kBitir); odak.addEventListener("touchcancel", kBitir);
    new MutationObserver(() => { if (!odak.classList.contains("acik")) modKur("cal"); else guncelle(); }).observe(odak, { attributes: true, attributeFilter: ["class", "hidden"] });
  }

  // ---- Alt hap: basili tutup sekmeler uzerinde surukleyince secim parmagi izler, birakinca gecilir ----
  const hap = document.getElementById("rail");
  if (hap) {
    let bas = null, uz = null, surukleHap = false, bx = 0;
    const nvAl = e => { const t = e.touches[0] || e.changedTouches[0]; const el = document.elementFromPoint(t.clientX, t.clientY); return el && el.closest("#rail .nv"); };
    hap.addEventListener("touchstart", e => {
      const el = e.target.closest(".nv"); bas = el || null; uz = el || null; surukleHap = false; bx = e.touches[0].clientX;
    }, { passive: true });
    hap.addEventListener("touchmove", e => {
      if (!bas) return;
      if (!surukleHap && Math.abs(e.touches[0].clientX - bx) < 10) return;
      const el = nvAl(e); surukleHap = true; hap.classList.add("ay-surukle");
      if (el && el !== uz) { uz = el; hap.querySelectorAll(".nv").forEach(n => n.classList.toggle("ay-uz", n === el)); try { navigator.vibrate && navigator.vibrate(6); } catch (x) { } el.click(); }   // parmak hangi sekmedeyse o ekran hemen acilir
      else if (!uz) hap.querySelectorAll(".nv").forEach(n => n.classList.remove("ay-uz"));
      if (uz) uz.classList.add("ay-uz");
    }, { passive: true });
    const hapBitir = e => {
      if (!bas) return;
      hap.classList.remove("ay-surukle"); hap.querySelectorAll(".nv").forEach(n => n.classList.remove("ay-uz"));
      if (surukleHap && e.cancelable) e.preventDefault();          // surukleme sonrasi sahte tiklama olmasin
      bas = uz = null; surukleHap = false;
    };
    hap.addEventListener("touchend", hapBitir); hap.addEventListener("touchcancel", hapBitir);
  }

  // ---- "Simdi caliyor" karti: sag/sola kaydirinca onceki / sonraki, ayrica kucuk onceki-sonraki dugmeleri ----
  const kk = document.getElementById("ayKart");
  if (kk) {
    const dugme = (act, ic, baslik) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "ay-kd"; b.dataset.act = act; b.title = baslik;
      b.innerHTML = typeof I === "function" ? I(ic) : ""; return b;
    };
    const sagKapsul = document.createElement("div"); sagKapsul.className = "ay-kdler";
    if (cal) { cal.classList.add("ay-kd", "ay-cal"); sagKapsul.append(cal, dugme("sonraki", "next", "Sonraki")); }
    else sagKapsul.append(dugme("sonraki", "next", "Sonraki"));
    kk.querySelector(".d-sol").appendChild(sagKapsul);
    let x0 = null, y0k = null, dxk = 0, yatay = false, hareketEtti = false;
    kk.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; y0k = e.touches[0].clientY; dxk = 0; yatay = false; hareketEtti = false; }, { passive: true });
    kk.addEventListener("touchmove", e => {
      if (x0 === null) return;
      const dx = e.touches[0].clientX - x0, dy = e.touches[0].clientY - y0k;
      if (!yatay && Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.4) { yatay = true; kk.style.transition = "none"; }
      if (!yatay) return;
      hareketEtti = true; dxk = dx;
      kk.style.transform = "translateX(" + (dx * 0.6) + "px)"; kk.style.opacity = String(Math.max(0.35, 1 - Math.abs(dx) / 420));
    }, { passive: true });
    const kBit = () => {
      if (x0 === null) return;
      const dx = dxk; x0 = null;
      if (!yatay) return;
      yatay = false;
      const ileri = dx < -70, geri = dx > 70;
      if (ileri || geri) {
        // kart kenara kayar, sarki degisir, kart karsi taraftan geri gelir
        kk.style.transition = "transform .14s ease-in, opacity .14s ease-in"; kk.style.transform = "translateX(" + (ileri ? -90 : 90) + "px)"; kk.style.opacity = "0";
        setTimeout(() => {
          try { if (ileri) sonraki(false); else onceki(); } catch (x) { }
          kk.style.transition = "none"; kk.style.transform = "translateX(" + (ileri ? 90 : -90) + "px)";
          requestAnimationFrame(() => requestAnimationFrame(() => { kk.style.transition = "transform .22s cubic-bezier(.22,1,.36,1), opacity .22s"; kk.style.transform = ""; kk.style.opacity = ""; setTimeout(() => { kk.style.transition = ""; }, 260); }));
        }, 150);
      } else {
        kk.style.transition = "transform .2s ease-out, opacity .2s"; kk.style.transform = ""; kk.style.opacity = "";
        setTimeout(() => { kk.style.transition = ""; }, 240);
      }
    };
    kk.addEventListener("touchend", kBit); kk.addEventListener("touchcancel", kBit);
    kk.addEventListener("click", e => { if (hareketEtti) { e.stopPropagation(); e.preventDefault(); hareketEtti = false; } }, true);   // kaydirma sonrasi tam ekran acilmasin
  }

  // Android geri tusu: once alttan acilan pencereyi, sonra tam ekran calari, sonra ayarlar alt sayfasini kapatir
  window.__vaalzGeri = function () {
    const md = document.getElementById("modal");
    if (md && !md.hidden && typeof H.modalKapat === "function") { H.modalKapat(); return true; }      // acik pencere (Ekle vb.) once kapanir
    const o = document.getElementById("odak");
    if (o && o.classList.contains("acik")) { if (o.classList.contains("ay-sheet")) o.classList.remove("ay-sheet"); else H.odakKapat(); return true; }
    return ayGeri ? ayGeri() : false;
  };

  // ---- Sekme gecisi anlik olsun: sik okunan GET verileri (ayarlar, internet sayaci) onbellekten hemen verilir, arkada tazelenir ----
  // (api() degismez bir sabit; istekleri yapan fetch'i sararak ayni etkiyi elde ederiz.) Yazma (POST) olunca onbellek bosalir ve arkada yeniden doldurulur.
  const SWR = ["/api/ayarlar", "/api/ag"], swrOnbellek = new Map();
  const fetch0 = window.fetch.bind(window);
  const tazele = yol => fetch0(yol).then(r => (r.ok ? r.text() : null)).then(t => { if (t !== null) swrOnbellek.set(yol, t); }).catch(() => { });
  window.fetch = function (girdi, secenek) {
    const yol = typeof girdi === "string" ? girdi : (girdi && girdi.url) || "";
    const get = !secenek || !secenek.method || String(secenek.method).toUpperCase() === "GET";
    if (get && SWR.includes(yol) && swrOnbellek.has(yol)) {
      const ham = swrOnbellek.get(yol);
      tazele(yol);                                           // arkada tazele; sonraki gorunum guncel olur
      return Promise.resolve(new Response(ham, { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }));
    }
    if (!get) { swrOnbellek.clear(); setTimeout(() => SWR.forEach(tazele), 600); }
    return fetch0(girdi, secenek).then(r => { if (get && SWR.includes(yol) && r.ok) r.clone().text().then(t => swrOnbellek.set(yol, t)); return r; });
  };
  setTimeout(() => SWR.forEach(tazele), 2500);                // acilistan hemen sonra isit

  // ---- Dokunmatik ekranda :hover ilk dokunulan ogede takili kaliyor (iz birakiyor); stil dosyalarindaki :hover kurallari Android'de kaldirilir ----
  function hoverTemizle(liste) {
    for (let i = liste.length - 1; i >= 0; i--) {
      const r = liste[i];
      try {
        if (r.cssRules && !r.selectorText) { hoverTemizle(r.cssRules); continue; }       // @media / @supports
        if (!r.selectorText || r.selectorText.indexOf(":hover") < 0) continue;
        const kalan = r.selectorText.split(",").filter(x => x.indexOf(":hover") < 0);
        if (kalan.length) r.selectorText = kalan.join(","); else liste.deleteRule ? liste.deleteRule(i) : r.parentStyleSheet.deleteRule(i);
      } catch (x) { }
    }
  }
  const hoverHepsi = () => { for (const sh of Array.from(document.styleSheets)) { try { hoverTemizle(sh.cssRules); } catch (x) { } } };
  hoverHepsi(); addEventListener("load", hoverHepsi);

  // ---- Klavye acilinca (pencere kisalir) alt hap ve kart gizlenir; kapaninca geri gelir ----
  const yukseklik0 = innerHeight;
  const klavyeKontrol = () => document.documentElement.classList.toggle("ay-klavye", innerHeight < yukseklik0 * 0.8);
  addEventListener("resize", klavyeKontrol);

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
