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
    const IKON = {
      dil: svg('<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'),
      ag: svg('<path d="M3 12h4l3-8 4 16 3-8h4"/>'),
      ses: typeof I === "function" ? I("queue") : "",
      dl: typeof I === "function" ? I("dl") : ""
    };
    const satirlar = [
      { bolum: en ? "General" : "Genel", id: "dil", baslik: "Dil / Language", dugumler: dilNode ? [dilNode] : [], deger: () => yaziAl("#aDil", e => e.options[e.selectedIndex].text) },
      { id: "ag", baslik: en ? "Internet usage" : "İnternet kullanımı", dugumler: agNode ? [agNode] : [], deger: () => { const e = agNode && agNode.querySelector("b"); return e ? (en ? "This month " : "Bu ay ") + e.textContent : ""; } },
      { bolum: en ? "App" : "Uygulama", id: "ses", baslik: en ? "Sound and playback" : "Ses ve oynatma", dugumler: sesG ? sesG.dugumler : [],
        deger: () => (yaziAl("#eqOn", e => e.checked) ? (en ? "Equalizer on" : "Ekolayzır açık") : (en ? "Equalizer off" : "Ekolayzır kapalı")) + " · " + (en ? "Crossfade " : "Geçiş ") + yaziAl("#cfSn", e => e.textContent) },
      { id: "dl", baslik: en ? "Downloads" : "İndirme", dugumler: dlG ? dlG.dugumler : [],
        deger: () => yaziAl("#esN", e => e.textContent) + (yaziAl("#aTasarruf", e => e.checked) ? (en ? " · data saver" : " · veri tasarrufu") : "") }
    ].filter(s => s.dugumler.length);
    const ayListe = document.createElement("div"); ayListe.className = "ay-liste";
    const sayfalar = {};
    const degerleriYenile = () => satirlar.forEach(s => { const e = ayListe.querySelector('[data-ay-id="' + s.id + '"] .ay-deger'); if (e) e.textContent = s.deger(); });
    let aktif = null;
    const kapat = () => {
      if (!aktif) return;
      const kb = kaydet && kaydet.querySelector("[data-act=ayarKaydet]"); if (kb && aktif !== "dil" && aktif !== "ag") kb.click();   // ayarlar kapanirken kendiliginden kaydedilir
      sayfalar[aktif].hidden = true; sy.classList.remove("ay-ic-acik"); aktif = null; degerleriYenile();
      document.getElementById("main").scrollTop = 0;
    };
    const ac = id => {
      aktif = id; sayfalar[id].hidden = false; sy.classList.add("ay-ic-acik");
      if (kaydet && id !== "dil" && id !== "ag") sayfalar[id].appendChild(kaydet);
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
      kaydetZ = setTimeout(() => { const kb = kaydet && kaydet.querySelector("[data-act=ayarKaydet]"); if (sy.isConnected && kb && aktif && aktif !== "dil" && aktif !== "ag") kb.click(); }, 500);
    });
    satirlar.forEach(s => {
      if (s.bolum) { const et = document.createElement("div"); et.className = "ay-etiket"; et.textContent = s.bolum; ayListe.appendChild(et); }
      const b = document.createElement("button"); b.type = "button"; b.className = "ay-satir"; b.dataset.ayId = s.id;
      b.innerHTML = IKON[s.id] + '<span class="ay-metin"><b>' + s.baslik + '</b><span class="ay-deger"></span></span>';
      b.addEventListener("click", () => ac(s.id)); ayListe.appendChild(b);
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
    sy.insertBefore(ayListe, bas.nextSibling);
    degerleriYenile();
    gruplar.forEach(g => g.dugumler.forEach(n => { if (!n.isConnected) return; if (n.classList && n.classList.contains("ay-gizli")) return; if (!n.closest(".ay-ic")) n.classList.add("ay-gizli"); }));
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
    // erisilebilirlik: kaydirici rolu, deger bildirimi ve klavye / ekran okuyucu ile ilerletme
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
    // ilerleme cubugu stili: "duz" (varsayilan, ince cizgi) / "dalga" / "form" (Ayarlar > Ses ve oynatma'daki secim oynaticiya da uygulanir)
    const stilUygula = () => { odak.classList.toggle("ay-duz", AY.stil === "duz"); try { oDalga.boyutla(); dalgaBaslat(); } catch (x) { } };
    try { if (!localStorage.getItem("ay_cubuk_ilk")) { localStorage.setItem("ay_cubuk_ilk", "1"); if (AY.stil !== "form") { AY.stil = "duz"; ayKaydet(); } } } catch (x) { }
    stilUygula();
    document.addEventListener("change", e => { if (e.target && e.target.id === "cubukStil") stilUygula(); });
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
    sagKapsul.append(dugme("onceki", "prev", "Önceki"), dugme("sonraki", "next", "Sonraki"));
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
