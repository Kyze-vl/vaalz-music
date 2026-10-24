/* Android uygulamasi koprusu: yalnizca Kotlin tarafi `VaalzAndroid` nesnesini enjekte ederse calisir (masaustunde hicbir sey yapmaz).
   Calan parcayi bildirim / kilit ekrani / kulaklik denetimlerine bildirir, onlardan gelen komutlari calara iletir. */
(function () {
  if (/[?&]android(&|$)/.test(location.search)) document.documentElement.classList.add("android");   // masaustunde onizleme: /?android
  if (!window.VaalzAndroid) return;
  document.documentElement.classList.add("android");

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
