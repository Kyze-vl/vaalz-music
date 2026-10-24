"""Android'de Vaalz sunucusunu arka plan is parcacigi olarak baslatir (masaustundeki main() degismeden).

yt-dlp ve ffmpeg, youtubedl-android kutuphanesinin paketledigi ikililerdir (Kotlin tarafi acar). Sunucu bunlari
`subprocess` ile cagirir; burada yollar ve ortam degiskenleri Android'e gore ayarlanir.

Depolama: "tum dosyalar" izni YOK. Muzikler Music/Vaalz Music'e MediaStore ile (Depo.kt) yazilir; kutuphane kaydi
(parcalar, playlistler, begeniler) sessiz bir mp3'un etiketine gomulu yedek olarak ayni sekilde saklanir.
Uygulama silinip yeniden kurulunca yedek okunur, kayit geri gelir.
"""
import base64
import glob
import json
import os
import subprocess
import threading
import time
import types
import zlib

MUZIK = "/storage/emulated/0/Music/Vaalz Music"
YEDEK_ARAMA = ["/storage/emulated/0/Audiobooks/Vaalz Music", "/storage/emulated/0/Podcasts/Vaalz Music", MUZIK]


class _Ortam:
    """Arac yollari + alt surec ortami."""

    def __init__(self, yerel, taban, onbellek):
        self.yerel = yerel                                    # nativeLibraryDir (libpython.so, libffmpeg.so ...)
        self.taban = taban                                    # <noBackupFiles>/youtubedl-android
        py = os.path.join(taban, "packages", "python", "usr")
        ff = os.path.join(taban, "packages", "ffmpeg", "usr")
        self.python = os.path.join(yerel, "libpython.so")
        self.ytdlp = os.path.join(taban, "yt-dlp", "yt-dlp")
        self.ffmpeg = os.path.join(yerel, "libffmpeg.so")
        self.ffprobe = os.path.join(yerel, "libffprobe.so")
        self.qjs = os.path.join(yerel, "libqjs.so")
        self.env = dict(os.environ)
        self.env.update({
            "LD_LIBRARY_PATH": os.pathsep.join([os.path.join(py, "lib"), os.path.join(ff, "lib")]),
            "SSL_CERT_FILE": os.path.join(py, "etc", "tls", "cert.pem"),
            "PATH": os.environ.get("PATH", "") + os.pathsep + yerel,
            "PYTHONHOME": py,
            "HOME": py,
            "TMPDIR": onbellek,
        })
        self.adlar = {"yt-dlp": self.ytdlp, "ffmpeg": self.ffmpeg, "ffprobe": self.ffprobe, "deno": self.qjs}

    def komut(self):
        return [self.python, self.ytdlp, "--no-cache-dir", "--ffmpeg-location", self.ffmpeg,
                "--js-runtimes", "quickjs:" + self.qjs]


class _Subprocess(types.ModuleType):
    """vaalzmusic icin subprocess: "ffmpeg"/"ffprobe" adlarini gercek yola cevirir, ortami ekler."""

    def __init__(self, ort):
        super().__init__("subprocess")
        self._ort = ort

    def __getattr__(self, ad):
        return getattr(subprocess, ad)

    def _duzelt(self, args, kw):
        if isinstance(args, (list, tuple)) and args and args[0] in ("ffmpeg", "ffprobe"):
            args = [self._ort.ffmpeg if args[0] == "ffmpeg" else self._ort.ffprobe] + list(args[1:])
        kw.setdefault("env", self._ort.env)
        return args, kw

    def run(self, args, *a, **kw):
        args, kw = self._duzelt(args, kw)
        return subprocess.run(args, *a, **kw)

    def Popen(self, args, *a, **kw):
        args, kw = self._duzelt(args, kw)
        return subprocess.Popen(args, *a, **kw)


class _Shutil(types.ModuleType):
    def __init__(self, ort):
        super().__init__("shutil")
        self._ort = ort

    def __getattr__(self, ad):
        import shutil
        return getattr(shutil, ad)

    def which(self, ad, *a, **kw):
        if ad in self._ort.adlar:
            return self._ort.adlar[ad] if os.path.exists(self._ort.adlar[ad]) else None
        import shutil
        return shutil.which(ad, *a, **kw)


# ---------------------------------------------------------------------------
# Kutuphane yedegi: sessiz mp3 + ID3 etiketinde sikistirilmis JSON
# ---------------------------------------------------------------------------

def _id3_mp3(b64):
    """ID3v2.3 etiketi (TXXX:VAALZ = base64) + birkac sessiz MPEG kare. Muzik uygulamalarinda 'yedek' diye gorunur."""
    def kare(kimlik, govde):
        return kimlik + len(govde).to_bytes(4, "big") + b"\0\0" + govde
    cerceveler = (kare(b"TIT2", b"\x00Vaalz Music kutuphane yedegi - silme") + kare(b"TPE1", b"\x00Vaalz Music")
                  + kare(b"TALB", b"\x00Vaalz Yedek") + kare(b"TXXX", b"\x00VAALZ\x00" + b64))
    n = len(cerceveler)
    boyut = bytes([(n >> 21) & 0x7F, (n >> 14) & 0x7F, (n >> 7) & 0x7F, n & 0x7F])
    sessiz = (b"\xff\xfb\x90\xc4" + b"\x00" * 413) * 4          # MPEG1 L3 128 kbps 44,1 kHz mono: 417 baytlik kare
    return b"ID3\x03\x00\x00" + boyut + cerceveler + sessiz


def _id3_oku(veri):
    if veri[:3] != b"ID3" or len(veri) < 10:
        return None
    boyut = ((veri[6] & 0x7F) << 21) | ((veri[7] & 0x7F) << 14) | ((veri[8] & 0x7F) << 7) | (veri[9] & 0x7F)
    i, son = 10, min(len(veri), 10 + boyut)
    while i + 10 <= son:
        kimlik = veri[i:i + 4]
        n = int.from_bytes(veri[i + 4:i + 8], "big")
        if not kimlik.strip(b"\0"):
            break
        govde = veri[i + 10:i + 10 + n]
        if kimlik == b"TXXX" and govde[1:7] == b"VAALZ\x00":
            return govde[7:]
        i += 10 + n
    return None


def yedek_oku():
    """Paylasilan depolamadaki en yeni yedegi dondurur (yoksa/okunamazsa None)."""
    adaylar = []
    for k in YEDEK_ARAMA:
        try:
            adaylar += glob.glob(os.path.join(k, "vaalz-yedek-*.mp3"))
        except OSError:
            pass
    sirali = []
    for y in adaylar:
        try:
            sirali.append((os.path.getmtime(y), y))
        except OSError:
            pass
    for _, y in sorted(sirali, reverse=True):
        try:
            with open(y, "rb") as f:
                b64 = _id3_oku(f.read())
            if b64:
                veri = json.loads(zlib.decompress(base64.b64decode(b64)).decode("utf-8"))
                if veri.get("surum") == 1:
                    return veri
        except Exception:
            continue
    return None


def _geri_yukle(taban):
    """Yeni kurulumda (kayit yok) yedekten tracks/playlists/stats/ayarlari yazar. vaalzmusic iceri alinmadan ONCE cagrilir."""
    veri_dir = os.path.join(taban, "veri")
    if os.path.exists(os.path.join(veri_dir, "tracks.json")) or os.path.exists(os.path.join(veri_dir, "playlists.json")):
        return False
    y = yedek_oku()
    if not y:
        return False
    os.makedirs(veri_dir, exist_ok=True)
    for ad, anahtar in (("tracks.json", "tracks"), ("playlists.json", "playlists"), ("stats.json", "stats"), ("config.json", "cfg")):
        with open(os.path.join(veri_dir, ad), "w", encoding="utf-8") as f:
            json.dump(y.get(anahtar) or {}, f, ensure_ascii=False)
    return True


YEDEK_AYAR = ("playlists", "format", "otomatik_oneri", "veri_tasarrufu", "es_zamanli", "dil")


def _yedek_dongusu(v, ctx, depo):
    """Kayit degisince (kaydet cagrisi) 20 sn sakinlesmeyi bekleyip yedegi yazar."""
    son_yazilan = ""
    while True:
        time.sleep(5)
        if time.time() - _degisti[0] < 20 or _degisti[0] <= _yazilan[0]:
            continue
        try:
            with v.KILIT:
                veri = {"surum": 1, "zaman": int(time.time()), "tracks": v.tracks, "playlists": v.playlists, "stats": v.stats,
                        "cfg": {k: v.cfg.get(k) for k in YEDEK_AYAR}}
                ham = json.dumps(veri, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            if ham == son_yazilan:
                _yazilan[0] = _degisti[0]
                continue
            b64 = base64.b64encode(zlib.compress(ham, 9))
            ad = "vaalz-yedek-%d.mp3" % int(time.time())
            if depo.yedekYaz(ctx, _id3_mp3(b64), ad):
                son_yazilan = ham
                _yazilan[0] = _degisti[0]
        except Exception:
            pass


_degisti = [0.0]
_yazilan = [0.0]


def baslat(taban, web, yerel, arac_taban, onbellek, gecici, vm):
    os.environ["VAALZ_BASE"] = taban
    os.environ["VAALZ_WEB"] = web
    os.environ["VAALZ_TEST"] = "1"           # pencere acma + bekci kapali
    os.environ["VAALZ_GECICI"] = gecici      # yt-dlp once buraya yazar
    os.environ["VAALZ_VM"] = vm              # kapak/soz onbellegi (paylasilan klasore yazilamaz)
    os.makedirs(gecici, exist_ok=True)
    for ad in os.listdir(gecici):            # onceki oturumdan kalan yarim dosyalar
        try:
            os.remove(os.path.join(gecici, ad))
        except OSError:
            pass
    geri = _geri_yukle(taban)
    ort = _Ortam(yerel, arac_taban, onbellek)
    import vaalzmusic
    from java import jclass
    from com.chaquo.python import Python
    ctx = Python.getPlatform().getApplication()
    depo = jclass("com.vaalz.music.Depo")

    vaalzmusic.subprocess = _Subprocess(ort)
    vaalzmusic.shutil = _Shutil(ort)
    vaalzmusic.ytdlp_komutu = ort.komut
    vaalzmusic.cfg["indirilenler"] = MUZIK
    try:
        os.makedirs(MUZIK, exist_ok=True)
    except OSError:
        pass

    def yayinla(yol):
        ad = depo.yayinla(ctx, yol, os.path.basename(yol))
        return str(ad) if ad else None
    vaalzmusic.YAYIN[0] = yayinla

    kaydet0 = vaalzmusic.kaydet

    def kaydet():
        kaydet0()
        _degisti[0] = time.time()
    vaalzmusic.kaydet = kaydet

    surum_onbellek = {}

    def surum(ad, komut):
        if ad not in surum_onbellek:
            try:
                r = subprocess.run(komut, capture_output=True, text=True, timeout=20, env=ort.env)
                satir = ((r.stdout or r.stderr).strip().splitlines() or [""])[0]
                surum_onbellek[ad] = satir[:40]
            except Exception:
                surum_onbellek[ad] = ""
        return surum_onbellek[ad]

    def sistem_durumu(zorla=False):
        arac = []
        for ad, ne, yol, komut in (
            ("yt-dlp", "YouTube Music'ten indirme", ort.ytdlp, ort.komut()[:2] + ["--version"]),
            ("ffmpeg", "ses ayiklama, kapak ve ses analizi", ort.ffmpeg, [ort.ffmpeg, "-version"]),
            ("deno", "YouTube'un JavaScript dogrulamasi (QuickJS)", ort.qjs, None),
        ):
            var = os.path.exists(yol)
            s = ""
            if var and komut:
                s = surum(ad, komut)
                if ad == "ffmpeg":
                    s = s.replace("ffmpeg version ", "").split(" ")[0]
            arac.append({"ad": ad, "var": var, "surum": s, "winget": "", "ne": ne, "komut": ""})
        return {"araclar": arac, "pencere": True, "eksik": [a["ad"] for a in arac if not a["var"]],
                "os": "android", "kurulabilir": False, "winget": False, "betik": False}

    vaalzmusic.sistem_durumu = sistem_durumu
    threading.Thread(target=vaalzmusic.main, daemon=True).start()
    threading.Thread(target=_indirme_izle, args=(vaalzmusic, ctx), daemon=True).start()
    threading.Thread(target=_yedek_dongusu, args=(vaalzmusic, ctx, depo), daemon=True).start()
    _degisti[0] = time.time()                  # acilistan ~20 sn sonra bu kurulumun kendi yedegi yazilir (geri yuklemeden sonra da)
    return bool(geri)


def _indirme_izle(v, ctx):
    """Sunucu mesgulken (indirme, liste tarama) Kotlin'deki on plan servisini ayakta tutar."""
    from java import jclass
    servis = jclass("com.vaalz.music.IndirmeServisi")
    while True:
        time.sleep(1.5)
        try:
            d = v.durum
            toplam = int(d.get("toplam") or 0)
            ilerleme = sum(d.get("aktif", {}).values()) if d.get("aktif") else 0
            yuzde = int((int(d.get("biten") or 0) * 100 + ilerleme) / (toplam * 100) * 100) if toplam else 0
            servis.guncelle(ctx, bool(d.get("mesgul")), str(d.get("faz") or ""), str(d.get("parca") or ""),
                            toplam, int(d.get("biten") or 0), max(0, min(100, yuzde)))
        except Exception:
            pass


def port():
    import vaalzmusic
    return vaalzmusic.PORT_AKTIF[0]
