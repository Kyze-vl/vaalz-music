# -*- coding: utf-8 -*-
"""
Vaalz Music - yerel muzik calar + indirici.

* Calma ve "Indirilenler" HICBIR ZAMAN internet kullanmaz (dosyalar diskten calinir).
* Internet sadece: playlist senkronu, indirme, oneriler (Ana Sayfa acikken, 24 saatte bir),
  YouTube aramasi ve gorunen uzak kapaklar. Hepsi sayaca yazilir.
* Arka uc sadece 127.0.0.1'de dinler; arayuz web/ klasorunden gelir ve Edge uygulama penceresinde acilir.
"""

import array
import collections
import hashlib
import html
import json
import mimetypes
import os
import queue
import random
import re
import shutil
import signal
import subprocess
import sys
import threading
import time
import traceback
import urllib.error
import urllib.parse
import urllib.request
import uuid
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

if getattr(sys, "frozen", False):
    BASE = os.path.dirname(sys.executable)
else:
    BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.environ.get("VAALZ_BASE", BASE)          # gelistirme/test icin
WEB = os.environ.get("VAALZ_WEB", os.path.join(BASE, "web"))
VERI = os.path.join(BASE, "veri")
# Android (dar depolama izni): yt-dlp once GECICI klasore yazar, bitince YAYIN[0](yol) dosyayi paylasilan muzik klasorune tasir ve
# son adini dondurur; kapak/soz onbellegi (.vaalzmusic) paylasilan klasore yazilamadigi icin VM_KOK'te tutulur. Masaustunde ikisi de bos.
GECICI = os.environ.get("VAALZ_GECICI")
VM_KOK = os.environ.get("VAALZ_VM")
YAYIN = [None]
LOGD = os.path.join(BASE, "logs")
ONBELLEK = os.path.join(VERI, "onbellek")
NOWIN = 0x08000000 if os.name == "nt" else 0
DUSUK = 0x00004000 if os.name == "nt" else 0   # BELOW_NORMAL: indirme PC'yi yormasin
YENI_OTURUM = {} if os.name == "nt" else {"start_new_session": True}   # Linux: yt-dlp + ffmpeg ayni surec grubunda, durdurunca birlikte kapanir
LINUX = os.name != "nt"

for d in (VERI, LOGD, ONBELLEK):
    os.makedirs(d, exist_ok=True)

SES_UZ = (".wav", ".flac", ".mp3", ".m4a", ".opus", ".ogg", ".aac", ".wma")
SES_TIPI = {".wav": "audio/wav", ".flac": "audio/flac", ".m4a": "audio/mp4", ".opus": "audio/ogg",
            ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".aac": "audio/aac", ".wma": "audio/x-ms-wma"}
META_ISTEK_KB = 400   # her yt-dlp metaveri cagrisi icin tahmini internet (KB)

VARSAYILAN = {
    "port": 8765,
    "indirilenler": os.path.join(BASE, "Indirilenler"),
    "format": "flac",
    "cookies_browser": "",      # bos = cerez kullanma. "firefox": yt-dlp, o tarayicidaki YouTube oturumunu (Premium ses kalitesi) yerelde okur
    "otomatik_oneri": True,
    "veri_tasarrufu": False,    # True: kaynaktaki kucuk akis (~130 kbps AAC), donusturme yok -> ~%50-60 daha az internet
    "es_zamanli": 4,            # ayni anda kac parca indirilsin
    "playlists": [],            # takip edilen YouTube Music playlist linkleri (ilk acilista bos)
    "dil": "tr",                # arayuz dili: "tr" ya da "en" (web/dil/<dil>.json degisim listesi sunulurken uygulanir)
}
KILIT = threading.RLock()
PORT_AKTIF = [8765]


# ---------------------------------------------------------------------------
# Kalici veri
# ---------------------------------------------------------------------------

def oku(ad, varsayilan):
    yol = os.path.join(VERI, ad)
    if not os.path.exists(yol):
        return varsayilan
    for deneme in range(4):                      # antivirus/kilit anlik okumayi engelleyebilir
        try:
            with open(yol, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            time.sleep(0.25)
    try:                                         # hala okunamiyorsa uzerine yazmadan once yedegini al
        shutil.copy(yol, yol + ".bozuk")
    except Exception:
        pass
    return varsayilan


def yaz(ad, veri):
    yol = os.path.join(VERI, ad)
    with open(yol + ".tmp", "w", encoding="utf-8") as f:
        json.dump(veri, f, ensure_ascii=False, indent=1)
    os.replace(yol + ".tmp", yol)


cfg = dict(VARSAYILAN)
cfg.update(oku("config.json", {}))
tracks = oku("tracks.json", {})
playlists = oku("playlists.json", {})
stats = oku("stats.json", {})
for k, v in {"plays": {}, "recent": [], "lists": {}, "liked": [], "ag": {}}.items():
    stats.setdefault(k, v)
oneriler = oku("oneriler.json", {"zaman": 0, "liste": []})
benzer_onbellek = oku("benzer.json", {})   # parca id -> {"zaman", "liste"}: "Benzer" sekmesi icin parca basina bir kez
oturum_ag = [0]


def kaydet():
    with KILIT:
        yaz("config.json", cfg)
        yaz("tracks.json", tracks)
        yaz("playlists.json", playlists)
        yaz("stats.json", stats)


def ag_say(bayt):
    """Internet sayaci (bayt): oturum + aylik."""
    ay = time.strftime("%Y-%m")
    with KILIT:
        oturum_ag[0] += int(bayt)
        stats["ag"][ay] = stats["ag"].get(ay, 0) + int(bayt)


def ind_klasoru():
    p = cfg["indirilenler"]
    os.makedirs(p, exist_ok=True)
    return p


_gizli = set()


def vm_klasoru(alt=""):
    kok = VM_KOK or os.path.join(ind_klasoru(), ".vaalzmusic")
    p = os.path.join(kok, alt)
    if not os.path.isdir(p):
        os.makedirs(p, exist_ok=True)
    if os.name == "nt" and kok not in _gizli:
        _gizli.add(kok)
        try:
            import ctypes
            ctypes.windll.kernel32.SetFileAttributesW(kok, 2)
        except Exception:
            pass
    return p


def dosya_yolu(vid):
    m = tracks.get(vid)
    if not m or not m.get("dosya"):
        return None
    p = os.path.join(ind_klasoru(), m["dosya"])
    return p if os.path.exists(p) else None


def yerel_kapak(vid):
    p = os.path.join(vm_klasoru("kapaklar"), vid + ".jpg")
    return p if os.path.exists(p) else None


# ---------------------------------------------------------------------------
# Indirilenler klasorunu tara (indirici.py ile inen dosyalar dahil)
# ---------------------------------------------------------------------------

def dosya_sure(yol):
    try:
        if yol.lower().endswith(".wav"):
            with wave.open(yol) as w:
                return w.getnframes() / float(w.getframerate())
    except Exception:
        pass
    try:
        r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", yol],
                           capture_output=True, text=True, creationflags=NOWIN | DUSUK, timeout=20)
        return float(r.stdout.strip())
    except Exception:
        return 0


def ad_ayir(dosya):
    ad = os.path.splitext(dosya)[0]
    ad = re.sub(r"\s*\[[\w-]{11}\]$", "", ad).strip()
    if " - " in ad:
        sanatci, baslik = ad.split(" - ", 1)
        return baslik.strip(), sanatci.strip()
    return ad, ""


def ses_dosyalari():
    """Indirilenler klasorundeki (alt klasorler dahil) ses dosyalari: {klasore gore yol: tam yol}. '.' ile baslayan klasorler (.vaalzmusic) atlanir."""
    kl = ind_klasoru()
    cikti = {}
    for kok, klasorler, dosyalar in os.walk(kl):
        klasorler[:] = [d for d in klasorler if not d.startswith(".")]
        for ad in dosyalar:
            if ad.lower().endswith(SES_UZ):
                tam = os.path.join(kok, ad)
                cikti[os.path.relpath(tam, kl)] = tam
    return cikti


def dosya_kimligi(rel):
    m = re.search(r"\[([\w-]{11})\]\.\w+$", rel)
    return m.group(1) if m else "f_" + hashlib.md5(rel.encode("utf-8")).hexdigest()[:10]


_tara_calisiyor = threading.Lock()


def tara():
    """Klasoru (alt klasorler dahil) kutuphaneyle esitler: yeni dosyalar eklenir, elle silinenler kutuphaneden duser."""
    kl = ind_klasoru()
    bulunan = {}
    for rel, tam in sorted(ses_dosyalari().items()):
        bulunan.setdefault(dosya_kimligi(rel), (rel, tam))
    yeni = []
    with KILIT:
        for vid, (rel, tam) in bulunan.items():
            m = tracks.get(vid)
            if not m:
                baslik, sanatci = ad_ayir(os.path.basename(rel))
                try:
                    zaman = int(os.stat(tam).st_mtime)
                except OSError:
                    zaman = int(time.time())
                m = tracks[vid] = {"id": vid, "title": baslik, "artist": sanatci, "album": "", "duration": 0,
                                   "eklendi": zaman, "dosya": None}
                yeni.append(vid)
            if m.get("dosya") != rel:
                m["dosya"] = rel
            if not m.get("duration"):
                yeni.append(vid)
        for vid, m in tracks.items():
            if m.get("dosya") and vid not in bulunan:
                m["dosya"] = None
    for vid in set(yeni):
        s = dosya_sure(os.path.join(kl, tracks[vid]["dosya"]))
        if s:
            tracks[vid]["duration"] = round(s)
    kaydet()
    try:
        analiz_olay.set()
    except NameError:
        pass
    return len(bulunan)


def tara_arkada():
    """Kutuphane yuklenirken klasor ile kayit uyusmuyorsa (elle eklenen/silinen dosya) arka planda esitle."""
    if not _tara_calisiyor.acquire(blocking=False):
        return

    def is_():
        try:
            tara()
        except Exception as e:
            gunluk("Tarama basarisiz: " + str(e))
        finally:
            _tara_calisiyor.release()
    threading.Thread(target=is_, daemon=True).start()


# ---------------------------------------------------------------------------
# Sistem durumu: gerekli dis araclar (pakete konmaz; kullanici bilgisayarina kurulur)
# ---------------------------------------------------------------------------

# (ad, aranan komut(lar), winget paket kimligi, ne icin)
ARACLAR = [
    ("yt-dlp", ("yt-dlp",), "yt-dlp.yt-dlp", "YouTube Music'ten indirme"),
    ("ffmpeg", ("ffmpeg",), "Gyan.FFmpeg", "ses ayiklama, kapak ve ses analizi"),
    ("deno", ("deno",), "DenoLand.Deno", "YouTube'un JavaScript dogrulamasi (yt-dlp icin)"),
]
KURULUM_BETIGI = os.path.join(BASE, "kurulum.sh" if LINUX else "kurulum.ps1")
LINUX_KOMUT = {"yt-dlp": "yt-dlp (GitHub'dan resmi sürüm → ~/.local/bin/yt-dlp)",
               "ffmpeg": "ffmpeg (paket yöneticisiyle: apt / dnf / pacman, yetki penceresi açılır)",
               "deno": "deno (GitHub'dan resmi sürüm → ~/.local/bin/deno)"}
kurulum = {"calisiyor": False, "log": [], "bitti": False, "hata": ""}
_arac_onbellek = {"t": 0, "v": None}


def yol_yenile():
    """winget kurulumundan sonra acik uygulama yeni PATH'i gormez: kayit defterinden okuyup ekler."""
    if os.environ.get("VAALZ_YOL_YENILEME") == "0":                        # sifirdan kurulum testi icin
        return
    if LINUX:               # kurulum.sh araclari ~/.local/bin altina koyar; acik uygulama PATH'ini yeniden okumaz
        mevcut = os.environ.get("PATH", "").split(os.pathsep)
        ek = [d for d in (os.path.expanduser("~/.local/bin"), os.path.expanduser("~/.deno/bin")) if os.path.isdir(d) and d not in mevcut]
        if ek:
            os.environ["PATH"] = os.pathsep.join(mevcut + ek)
        return
    arac_dir = os.path.join(BASE, "araclar")          # kurulum.ps1, winget yoksa araclari buraya indirir
    if os.path.isdir(arac_dir) and arac_dir not in os.environ.get("PATH", "").split(os.pathsep):
        os.environ["PATH"] = os.environ.get("PATH", "") + os.pathsep + arac_dir
    try:
        import winreg
        parcalar = []
        for kok, alt in ((winreg.HKEY_CURRENT_USER, "Environment"),
                         (winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment")):
            try:
                with winreg.OpenKey(kok, alt) as k:
                    parcalar.append(os.path.expandvars(winreg.QueryValueEx(k, "Path")[0]))
            except OSError:
                pass
        mevcut = os.environ.get("PATH", "").split(os.pathsep)
        ek = [x for p in parcalar for x in p.split(os.pathsep) if x and x not in mevcut]
        links = os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft", "WinGet", "Links")
        if os.path.isdir(links) and links not in mevcut and links not in ek:
            ek.append(links)
        if ek:
            os.environ["PATH"] = os.pathsep.join(mevcut + ek)
    except Exception:
        pass


yol_yenile()


def arac_surum(exe):
    try:
        r = subprocess.run([exe, "--version"], capture_output=True, text=True, encoding="utf-8", errors="replace",
                           creationflags=NOWIN, timeout=8)
        satir = ((r.stdout or r.stderr).strip().splitlines() or [""])[0]
        m = re.search(r"version\s+(\S+)|(\d+\.\d+(?:\.\d+)?)", satir)          # ffmpeg: "ffmpeg version N-1234-g... Copyright ..."
        return ((m.group(1) or m.group(2)) if m else satir)[:40]
    except Exception:
        return ""


def sistem_durumu(zorla=False):
    if not zorla and _arac_onbellek["v"] and time.time() - _arac_onbellek["t"] < 20:
        return _arac_onbellek["v"]
    araclar = []
    for ad, komutlar, winget, ne in ARACLAR:
        yol = next((shutil.which(k) for k in komutlar if shutil.which(k)), None)
        araclar.append({"ad": ad, "var": bool(yol), "surum": arac_surum(yol) if yol else "", "winget": winget, "ne": ne,
                        "komut": LINUX_KOMUT[ad] if LINUX else (f"winget install --id {winget}" if shutil.which("winget") else f"{ad} (resmi sürüm sayfasından → araclar klasörü)")})
    if LINUX:
        pencere = bool(chromium_bul())
        kurulabilir = bool(shutil.which("bash")) and os.path.isfile(KURULUM_BETIGI)
    else:
        pencere = any(os.path.exists(p) for p in (r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                                                  r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"))
        kurulabilir = os.path.isfile(KURULUM_BETIGI)           # winget yoksa betik dogrudan indirir
    d = {"araclar": araclar, "pencere": pencere, "eksik": [a["ad"] for a in araclar if not a["var"]],
         "os": "linux" if LINUX else "windows", "kurulabilir": kurulabilir,
         "winget": bool(shutil.which("winget")), "betik": os.path.isfile(KURULUM_BETIGI)}
    _arac_onbellek.update(t=time.time(), v=d)
    return d


def kurulum_calistir(adlar, guncelle=False):
    """Yalnizca ARACLAR icindeki bilinen paketler; komutlar KURULUM_BETIGI (kurulum.ps1 / kurulum.sh) icinde acikca yazilidir."""
    gecerli = [a for a in adlar if a in {x[0] for x in ARACLAR}]
    with KILIT:
        if kurulum["calisiyor"] or not gecerli:
            return
        kurulum.update(calisiyor=True, log=[], bitti=False, hata="")

    def is_():
        try:
            if not os.path.isfile(KURULUM_BETIGI):
                raise RuntimeError(os.path.basename(KURULUM_BETIGI) + " bulunamadi")
            if LINUX:
                args = ["bash", KURULUM_BETIGI, "--paketler", ",".join(gecerli)] + (["--guncelle"] if guncelle else [])
            else:
                args = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", KURULUM_BETIGI, "-Paketler", ",".join(gecerli)]
                if guncelle:
                    args.append("-Guncelle")
            p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, text=True,
                                 encoding="utf-8", errors="replace", creationflags=NOWIN)
            for satir in p.stdout:
                satir = satir.strip()
                if satir:
                    with KILIT:
                        kurulum["log"] = (kurulum["log"] + [satir[:200]])[-12:]
            p.wait()
            if p.returncode != 0:
                raise RuntimeError(f"kurulum betigi {p.returncode} koduyla bitti")
        except Exception as e:
            kurulum["hata"] = str(e)
            gunluk("Arac kurulumu basarisiz: " + str(e))
        finally:
            yol_yenile()
            _arac_onbellek["v"] = None
            kurulum.update(calisiyor=False, bitti=True)
    threading.Thread(target=is_, daemon=True).start()


# ---------------------------------------------------------------------------
# yt-dlp yardimcilari
# ---------------------------------------------------------------------------

def ytdlp_komutu():
    exe = shutil.which("yt-dlp")
    if exe:
        return [exe]
    if getattr(sys, "frozen", False):
        raise RuntimeError("yt-dlp bulunamadi: Ayarlar > Sistem durumu bolumunden kurabilirsin")
    return [sys.executable, "-m", "yt_dlp"]


HATALAR = [
    (r"Sign in to confirm|Please sign in|age.?restricted|inappropriate for some", "Giris gerekiyor (tarayici cerezleri okunamadi)"),
    (r"Private video|is private", "Parca gizli"),
    (r"Video unavailable|no longer available|not available|removed", "Parca artik yok / kaldirilmis"),
    (r"geo.?restrict|blocked it in your country|not available in your country", "Bolge kisitlamasi"),
    (r"HTTP Error 429|Too Many Requests", "Cok fazla istek - biraz bekle"),
    (r"getaddrinfo failed|Failed to resolve|NameResolutionError|Temporary failure|timed out", "Internet baglantisi yok"),
    (r"ffmpeg|ffprobe", "ffmpeg bulunamadi / donusturme hatasi"),
    (r"No space left|\[Errno 28\]", "Diskte yer kalmadi"),
    (r"does not exist|Incomplete data|Unable to recognize playlist|HTTP Error 404", "Liste/parca bulunamadi (link gecersiz olabilir)"),
]


def hata_ozeti(metin):
    for desen, ozet in HATALAR:
        if re.search(desen, metin or "", re.I):
            return ozet
    for s in reversed((metin or "").splitlines()):
        if s.strip().startswith("ERROR"):
            return s.strip()[:200]
    return "Bilinmeyen hata"


CEREZ_YOK = [False]   # tarayici cerezleri okunamiyorsa her parcada bos yere denemeyelim


def cerez_denemeleri():
    b = (cfg.get("cookies_browser") or "").strip()
    return ([["--cookies-from-browser", b]] if b and not CEREZ_YOK[0] else []) + [[]]


def ytdlp_json(args):
    son = ""
    for ek in cerez_denemeleri():
        r = subprocess.run(ytdlp_komutu() + ek + args, capture_output=True, text=True, encoding="utf-8",
                           errors="replace", creationflags=NOWIN | DUSUK, timeout=180)
        ag_say(META_ISTEK_KB * 1024)
        if r.returncode == 0 and r.stdout.strip():
            return json.loads(r.stdout)
        son = r.stderr
    raise RuntimeError(hata_ozeti(son))


def temiz_sanatci(s):
    return re.sub(r"\s*-\s*Topic$", "", s or "").strip()


def liste_id(url):
    return (urllib.parse.parse_qs(urllib.parse.urlparse(url).query).get("list") or [""])[0]


def liste_url(girdi):
    m = re.search(r"list=([A-Za-z0-9_-]+)", girdi or "")
    return "https://music.youtube.com/playlist?list=" + m.group(1) if m else None


# ---------------------------------------------------------------------------
# Baska platformlarin listeleri (Spotify, Deezer): parca adlarini okur, indirirken YouTube'da aranir
# ---------------------------------------------------------------------------

def harici_tur(girdi):
    """(platform, tur, id) ya da None. Desteklenen: Spotify playlist/album, Deezer playlist/album."""
    g = girdi or ""
    m = re.search(r"open\.spotify\.com/(?:intl-[\w-]+/)?(playlist|album)/([A-Za-z0-9]{10,30})", g)
    if m:
        return ("spotify", m.group(1), m.group(2))
    m = re.search(r"deezer\.com/(?:[a-z]{2}/)?(playlist|album)/(\d{3,20})", g)
    if m:
        return ("deezer", m.group(1), m.group(2))
    return None


def _http_al(url):
    istek = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(istek, timeout=20) as r:
        veri = r.read()
    ag_say(len(veri) + 2000)
    return veri.decode("utf-8", "replace")


def harici_liste(tur):
    """(baslik, [{"title", "artist", "duration"(sn)}]) dondurur."""
    platform, kind, kid = tur
    if platform == "spotify":
        h = _http_al(f"https://open.spotify.com/embed/{kind}/{kid}")
        m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', h, re.S)
        if not m:
            raise RuntimeError("Spotify listesi okunamadi (liste herkese acik olmali)")
        ent = json.loads(m.group(1))["props"]["pageProps"]["state"]["data"]["entity"]
        parcalar = [{"title": t.get("title") or "", "artist": re.sub(r"[\s\xa0]+", " ", t.get("subtitle") or "").strip(),
                     "duration": round((t.get("duration") or 0) / 1000)} for t in ent.get("trackList") or [] if t.get("title")]
        return ent.get("name") or "Spotify listesi", parcalar
    ad = json.loads(_http_al(f"https://api.deezer.com/{kind}/{kid}"))
    if ad.get("error"):
        raise RuntimeError("Deezer listesi okunamadi")
    parcalar, i = [], 0
    while i < 500:
        sayfa = json.loads(_http_al(f"https://api.deezer.com/{kind}/{kid}/tracks?limit=100&index={i}"))
        for t in sayfa.get("data") or []:
            parcalar.append({"title": t.get("title") or "", "artist": (t.get("artist") or {}).get("name") or "",
                             "duration": t.get("duration") or 0})
        if not sayfa.get("next") or not sayfa.get("data"):
            break
        i += 100
    return ad.get("title") or "Deezer listesi", parcalar


coz_haritasi = oku("coz.json", {})      # yer tutucu (q_...) -> gercek YouTube kimligi


def harici_ice_aktar(url):
    """Listeyi yerel bir playlist olarak olusturur. Parcalar 'yer tutucu'dur: ilk indirmede YouTube'da aranip gercek parcaya baglanir."""
    tur = harici_tur(url)
    baslik, parcalar = harici_liste(tur)
    if not parcalar:
        raise RuntimeError("Listede parca bulunamadi")
    idler = []
    with KILIT:
        for p in parcalar:
            q = "q_" + hashlib.md5(f"{p['artist']}|{p['title']}".lower().encode("utf-8")).hexdigest()[:9]
            gercek = coz_haritasi.get(q)
            if gercek and gercek in tracks:
                q = gercek
            elif q not in tracks:
                tracks[q] = {"id": q, "title": p["title"], "artist": p["artist"], "album": "", "duration": p["duration"],
                             "eklendi": int(time.time()), "dosya": None, "kesin_ad": True,
                             "sorgu": (p["artist"] + " " + p["title"]).strip()}
            if q not in idler:
                idler.append(q)
        lid = "l_" + uuid.uuid4().hex[:8]
        playlists[lid] = {"id": lid, "title": baslik[:80], "url": None, "local": True, "tracks": idler}
        kaydet()
    gunluk(f"Harici liste: {baslik} ({len(idler)} parca)")
    return lid, len(idler)


def kimlik_degistir(eski, yeni):
    with KILIT:
        m = tracks.pop(eski, None)
        if m and yeni not in tracks:
            m = dict(m, id=yeni)
            m.pop("sorgu", None)
            tracks[yeni] = m
        for pl in playlists.values():
            if eski in pl["tracks"]:
                sira = []
                for x in pl["tracks"]:
                    x = yeni if x == eski else x
                    if x not in sira:
                        sira.append(x)
                pl["tracks"] = sira
        for anahtar in ("liked", "recent"):
            stats[anahtar] = list(dict.fromkeys(yeni if x == eski else x for x in stats[anahtar]))
        if eski in stats["plays"]:
            stats["plays"][yeni] = stats["plays"].get(yeni, 0) + stats["plays"].pop(eski)
        coz_haritasi[eski] = yeni
        yaz("coz.json", coz_haritasi)
        kaydet()


def sorgu_coz(q_id):
    """Yer tutucu parcayi YouTube aramasiyla gercek bir videoya baglar (sure en yakin olan)."""
    m = tracks.get(q_id) or {}
    sure = m.get("duration") or 0
    veri = ytdlp_json(["--flat-playlist", "-J", "--no-warnings", f"ytsearch5:{m.get('sorgu') or m.get('title')}"])
    adaylar = [e for e in veri.get("entries") or []
               if re.fullmatch(r"[\w-]{11}", e.get("id") or "") and 0 < (e.get("duration") or 0) <= 900]
    if not adaylar:
        raise RuntimeError("YouTube'da bulunamadi")
    if sure:
        yakin = [e for e in adaylar if abs(e["duration"] - sure) <= max(8, sure * 0.08)]
        secilen = min(yakin or adaylar, key=lambda e: abs(e["duration"] - sure))   # esitlikte arama sirasi korunur
    else:
        secilen = adaylar[0]
    kimlik_degistir(q_id, secilen["id"])
    return secilen["id"]


# ---------------------------------------------------------------------------
# Is kuyrugu (tek calisan; indirmeler sirayla ve dusuk oncelikle)
# ---------------------------------------------------------------------------

durum = {"mesgul": False, "faz": "", "parca": "", "yuzde": 0, "toplam": 0, "biten": 0,
         "hatalar": [], "mb": 0.0, "bekleyen": None, "log": [], "ids": [], "aktif": {}}
isler = queue.Queue()


def gunluk(m):
    with KILIT:
        durum["log"].append(time.strftime("%H:%M:%S ") + m)
        del durum["log"][:-40]
    try:
        with open(os.path.join(LOGD, "vaalzmusic.log"), "a", encoding="utf-8") as f:
            f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + m + "\n")
    except Exception:
        pass


def is_ekle(fn, indirme=0, idler=()):
    with KILIT:
        if isler.unfinished_tasks == 0:
            durum.update(toplam=0, biten=0, hatalar=[], mb=0.0, ids=[], aktif={})
        durum["toplam"] += indirme
        durum["ids"] += list(idler)
        durum["mesgul"] = True
    isler.put(fn)


def calisan():
    while True:
        fn = isler.get()
        durum["mesgul"] = True
        try:
            fn()
        except Exception:
            gunluk("HATA: " + traceback.format_exc())
        finally:
            isler.task_done()
            if isler.unfinished_tasks == 0:
                durum.update(mesgul=False, faz="", parca="", yuzde=0, ids=[])
                kaydet()


# ---------------------------------------------------------------------------
# Parca indirme (indirici.py ile ayni yontem: en iyi ses -> WAV)
# ---------------------------------------------------------------------------

BOYUT = re.compile(r"of\s+~?\s*([\d.]+)\s*(KiB|MiB|GiB)")


def kare_kapak(ham, hedef):
    r = subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", ham, "-vf",
                        "crop='min(iw,ih)':'min(iw,ih)',scale='min(600,iw)':-2", "-q:v", "3", hedef],
                       creationflags=NOWIN | DUSUK)
    if r.returncode != 0:
        shutil.copy(ham, hedef)


def indirme_formati():
    return "m4a" if cfg.get("veri_tasarrufu") else "best"


def parca_indir(vid):
    kl = ind_klasoru()
    cikis = GECICI or kl                                  # yt-dlp'nin yazdigi klasor (Android'de gecici, sonra YAYIN ile tasinir)
    os.makedirs(cikis, exist_ok=True)
    ham = vm_klasoru("ham")
    fmt = indirme_formati()
    if cfg.get("veri_tasarrufu"):
        # internet harcamasini belirleyen sey kaynak akistir (donusturme degil): kucuk AAC akisi sec, yeniden kodlama yok
        bicim = ["-f", "bestaudio[ext=m4a][abr<=140]/bestaudio[abr<=140]/worstaudio/bestaudio", "-x", "--audio-format", "best"]   # secilen akis Opus ise AAC'ye cevrilmez
    else:
        # kaynagin en iyi akisi, yeniden kodlama yok ("best": kaynak kodegi korunur, yalnizca kapsayici duzeltilir).
        # YouTube kaynaklari zaten kayiplidir; FLAC'a cevirmek kaliteyi artirmaz, yalnizca dosyayi sisirir.
        bicim = ["-f", "bestaudio/best", "-x", "--audio-format", "best"]
    yolf = os.path.join(ham, vid + ".yol.txt")           # yt-dlp'nin bildirdigi gercek cikti yolu
    args = bicim + ["--write-info-json", "--write-thumbnail", "--convert-thumbnails", "jpg",
                    "--no-playlist", "--no-warnings", "--newline", "--windows-filenames",
                    "--print-to-file", "after_move:filepath", yolf,
                    "-o", os.path.join(cikis, "%(title).120B [%(id)s].%(ext)s"),
                    "-o", "infojson:" + os.path.join(ham, "%(id)s"),
                    "-o", "thumbnail:" + os.path.join(ham, "%(id)s"),
                    "https://music.youtube.com/watch?v=" + vid]
    cikti, kod, cerezli_denendi = [], 1, False
    for ek in cerez_denemeleri():
        cikti = []
        if IPTAL.is_set():
            raise RuntimeError("iptal")
        try:
            os.remove(yolf)
        except OSError:
            pass
        p = subprocess.Popen(ytdlp_komutu() + ek + args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                             text=True, encoding="utf-8", errors="replace", creationflags=NOWIN | DUSUK, **YENI_OTURUM)
        CALISAN.add(p)
        for satir in p.stdout:
            cikti.append(satir.rstrip())
            m = re.search(r"\[download\]\s+([\d.]+)%", satir)
            if m:
                with KILIT:
                    durum["aktif"][vid] = float(m.group(1))
                    durum["yuzde"] = sum(durum["aktif"].values()) / max(1, len(durum["aktif"]))
                b = BOYUT.search(satir)
                if b and re.search(r"100(\.0)?% of .+ in ", satir):
                    mb = float(b.group(1)) * {"KiB": 1 / 1024, "MiB": 1, "GiB": 1024}[b.group(2)]
                    with KILIT:
                        durum["mb"] += mb
                    ag_say(mb * 1048576)
        p.wait()
        CALISAN.discard(p)
        if IPTAL.is_set():
            raise RuntimeError("iptal")
        kod = p.returncode
        if kod == 0:
            if cerezli_denendi:                      # cerezli deneme basarisizdi, cerezsiz oldu: sonraki parcalarda zaman kaybetme
                CEREZ_YOK[0] = True
                gunluk("Tarayici cerezleri kullanilamiyor; cerezsiz devam ediliyor")
            break
        if ek:
            cerezli_denendi = True
    if kod != 0:
        raise RuntimeError(hata_ozeti("\n".join(cikti)))

    dosya = None
    try:
        with open(yolf, "r", encoding="utf-8") as f:
            bildirilen = [s.strip() for s in f if s.strip()][-1]
        if os.path.isfile(bildirilen) and os.path.normcase(os.path.dirname(os.path.abspath(bildirilen))) == os.path.normcase(os.path.abspath(cikis)):
            dosya = os.path.basename(bildirilen)
    except (OSError, IndexError):
        pass
    try:
        os.remove(yolf)
    except OSError:
        pass
    if not dosya:       # yol bildirilmediyse: ayni kimlikli dosyalardan en son yazilani al
        adaylar = [f for f in os.listdir(cikis) if f"[{vid}]." in f and f.lower().endswith(SES_UZ)]
        dosya = max(adaylar, key=lambda f: os.path.getmtime(os.path.join(cikis, f)), default=None)
    if not dosya:
        raise RuntimeError("Dosya olusmadi")
    if YAYIN[0] and cikis != kl:                          # Android: gecici dosyayi paylasilan muzik klasorune tasi
        dosya = YAYIN[0](os.path.join(cikis, dosya)) or dosya
    info = {}
    try:
        with open(os.path.join(ham, vid + ".info.json"), "r", encoding="utf-8") as f:
            info = json.load(f)
    except Exception:
        pass
    jpg = os.path.join(ham, vid + ".jpg")
    if os.path.exists(jpg):
        kare_kapak(jpg, os.path.join(vm_klasoru("kapaklar"), vid + ".jpg"))
    for g in (jpg, os.path.join(ham, vid + ".info.json")):
        try:
            os.remove(g)
        except OSError:
            pass
    sanatci = info.get("artist") or ", ".join(info.get("artists") or []) or temiz_sanatci(info.get("uploader") or info.get("channel"))
    with KILIT:
        m = tracks.setdefault(vid, {"id": vid})
        kesin = m.get("kesin_ad")                      # Spotify/Deezer'dan gelen ad ve sanatci korunur
        m.update(title=(m.get("title") if kesin else None) or info.get("track") or info.get("title") or m.get("title") or vid,
                 artist=(m.get("artist") if kesin else None) or sanatci or m.get("artist") or "", album=info.get("album") or m.get("album") or "",
                 duration=info.get("duration") or m.get("duration") or 0, dosya=dosya,
                 eklendi=int(time.time()))
        m.pop("lufs", None)          # ses seviyesi yeniden olculsun
        kaydet()


INDIR_Q = queue.Queue()
INDIR_BEKLEYEN = set()
INDIR_AKTIF = [False]
IPTAL = threading.Event()        # "Durdur"a basildi: calisan indirmeler oldurulur, kuyruk bosaltilir
CALISAN = set()                  # calisan yt-dlp surecleri


def kismi_temizle(vid):
    """Durdurulan indirmenin yarim kalan dosyalari silinir (ses dosyasi olmayan her sey); biten ses dosyasina dokunulmaz."""
    kl = ind_klasoru()
    for kok, klasorler, dosyalar in os.walk(kl):
        klasorler[:] = [d for d in klasorler if not d.startswith(".")]
        for ad in dosyalar:
            if f"[{vid}]" in ad and not ad.lower().endswith(SES_UZ):        # .part, .ytdl, kapak resmi, gecici bicimler
                try:
                    os.remove(os.path.join(kok, ad))
                except OSError:
                    pass
    if GECICI and os.path.isdir(GECICI):                  # Android gecici klasoru: biten dosya dahil [id]'li her sey
        for ad in os.listdir(GECICI):
            if f"[{vid}]" in ad:
                try:
                    os.remove(os.path.join(GECICI, ad))
                except OSError:
                    pass
    ham = vm_klasoru("ham")
    for ad in os.listdir(ham):
        if ad.startswith(vid + "."):
            try:
                os.remove(os.path.join(ham, ad))
            except OSError:
                pass


def indirmeyi_durdur():
    IPTAL.set()
    with KILIT:
        aktif = list(durum["aktif"])
        bekleyen = 0
        while True:
            try:
                INDIR_Q.get_nowait()
                bekleyen += 1
            except queue.Empty:
                break
        INDIR_BEKLEYEN.clear()
        durum["toplam"] = max(durum["biten"], durum["toplam"] - bekleyen)
        durum["ids"] = [v for v in durum["ids"] if v in aktif]
        surecler = list(CALISAN)
    for p in surecler:
        try:           # yt-dlp'nin baslattigi ffmpeg de kapansin
            if LINUX:
                os.killpg(os.getpgid(p.pid), signal.SIGTERM)
            else:
                subprocess.run(["taskkill", "/PID", str(p.pid), "/T", "/F"], capture_output=True, creationflags=NOWIN, timeout=15)
        except Exception:
            try:
                p.kill()
            except Exception:
                pass

    def sonra():
        for _ in range(60):
            if not INDIR_AKTIF[0]:
                break
            time.sleep(0.5)
        for v in aktif:
            kismi_temizle(v)
        IPTAL.clear()
        gunluk(f"Indirme durduruldu ({len(aktif)} calisan, {bekleyen} bekleyen iptal)")
    threading.Thread(target=sonra, daemon=True).start()
    return {"calisan": len(aktif), "bekleyen": bekleyen}


def indir_tek(vid):
    m = tracks.get(vid, {})
    ad = (m.get("artist") + " - " if m.get("artist") else "") + (m.get("title") or vid)
    gecici = ("Cok fazla istek", "Internet baglantisi", "zaman asimi")
    with KILIT:
        durum["aktif"][vid] = 0.0
        durum["parca"] = ad + (f"  (+{len(durum['aktif']) - 1} parça daha)" if len(durum["aktif"]) > 1 else "")
    hata = None
    coz_hata, hazir = None, False
    if vid.startswith("q_") and m.get("sorgu"):          # baska platformdan gelen parca: once YouTube'da bul
        try:
            yeni = sorgu_coz(vid)
            with KILIT:
                durum["aktif"].pop(vid, None)
                durum["aktif"][yeni] = 0.0
                durum["ids"] = [yeni if x == vid else x for x in durum["ids"]]
            vid, m = yeni, tracks.get(yeni, m)
            hazir = bool(dosya_yolu(vid))                # ayni parca zaten indirilmisse tekrar indirme
        except Exception as e:
            coz_hata = str(e)
    for deneme in range(0 if (coz_hata or hazir) else 3):
        if IPTAL.is_set():
            hata = "iptal"
            break
        try:
            parca_indir(vid)
            gunluk("Indirildi: " + ad)
            analiz_olay.set()
            hata = None
            break
        except Exception as e:
            hata = str(e)
            if IPTAL.is_set():
                hata = "iptal"
                break
            if deneme < 2 and any(k in hata for k in gecici):
                time.sleep(8 * (deneme + 1))
                continue
            break
    if coz_hata and not IPTAL.is_set():
        hata = coz_hata
    with KILIT:
        if hata and hata != "iptal":
            durum["hatalar"].append({"id": vid, "baslik": m.get("title") or vid, "mesaj": hata})
            gunluk(f"Indirilemedi {vid}: {hata}")
        durum["biten"] += 1
        durum["aktif"].pop(vid, None)
        durum["yuzde"] = sum(durum["aktif"].values()) / len(durum["aktif"]) if durum["aktif"] else 0
        if vid in durum["ids"]:
            durum["ids"].remove(vid)


def indirme_yonetici():
    """Ortak indirme kuyrugu: ayni anda es_zamanli (varsayilan 4) parca indirir. Calisirken eklenen parcalar da alinir."""
    from concurrent.futures import ThreadPoolExecutor
    while True:
        n = max(1, min(8, int(cfg.get("es_zamanli") or 4)))
        durum["faz"] = "Indiriliyor"

        def isci():
            while True:
                try:
                    vid = INDIR_Q.get(timeout=2.5)       # arka arkaya gelen tiklamalari bekle
                except queue.Empty:
                    return
                with KILIT:
                    INDIR_BEKLEYEN.discard(vid)
                indir_tek(vid)
        with ThreadPoolExecutor(max_workers=n) as ex:
            for f in [ex.submit(isci) for _ in range(n)]:
                f.result()
        with KILIT:
            if INDIR_Q.empty():
                INDIR_AKTIF[0] = False
                return


def indirmeye_ekle(idler):
    """Parcalari indirme kuyruguna ekler (tek tek indir tiklamalari da ayni havuzda paralel calisir)."""
    with KILIT:
        yeni = [v for v in dict.fromkeys(idler) if v not in INDIR_BEKLEYEN and v not in durum["aktif"]]
        if not yeni:
            return 0
        if isler.unfinished_tasks == 0 and not INDIR_AKTIF[0]:
            durum.update(toplam=0, biten=0, hatalar=[], mb=0.0, ids=[], aktif={})
        for v in yeni:
            INDIR_BEKLEYEN.add(v)
            INDIR_Q.put(v)
        durum["toplam"] += len(yeni)
        durum["ids"] += [v for v in yeni if v not in durum["ids"]]
        durum["mesgul"] = True
        baslat = not INDIR_AKTIF[0]
        INDIR_AKTIF[0] = True
    if baslat:
        isler.put(indirme_yonetici)
    return len(yeni)


# ---------------------------------------------------------------------------
# Liste senkronu
# ---------------------------------------------------------------------------

def tahmini_mb(idler):
    sn = sum((tracks.get(i, {}).get("duration") or 210) for i in idler)
    return round(sn / 60 * (1.0 if cfg.get("veri_tasarrufu") else 1.5), 1)


def listeyi_cek(url):
    pid = liste_id(url)
    veri = ytdlp_json(["--flat-playlist", "-J", "--no-warnings", url])
    sira = []
    with KILIT:
        for e in veri.get("entries") or []:
            vid, baslik = e.get("id"), e.get("title") or ""
            if not vid or baslik in ("[Deleted video]", "[Private video]"):
                continue
            sira.append(vid)
            tracks.setdefault(vid, {"id": vid, "eklendi": int(time.time()), "dosya": None, "title": baslik,
                                    "album": "", "duration": e.get("duration") or 0,
                                    "artist": temiz_sanatci(e.get("channel") or e.get("uploader"))})
        playlists[pid] = {"id": pid, "title": veri.get("title") or pid, "url": url, "local": False, "tracks": sira}
        kaydet()
    gunluk(f"Liste: {playlists[pid]['title']} ({len(sira)} parca)")


def eksikler(idler):
    return [v for v in dict.fromkeys(idler) if not dosya_yolu(v)]


def kontrol_isi(sadece=None):
    durum["faz"], durum["bekleyen"] = "Listeler denetleniyor", None
    for url in ([sadece] if sadece else cfg["playlists"]):
        durum["parca"] = liste_id(url)
        try:
            listeyi_cek(url)
        except Exception as e:
            durum["hatalar"].append({"id": liste_id(url), "baslik": "Liste: " + liste_id(url), "mesaj": str(e)})
            gunluk(f"Liste alinamadi {liste_id(url)}: {e}")
    tara()
    hedef = [v for p in playlists.values() if not p["local"] and (not sadece or p["url"] == sadece) for v in p["tracks"]]
    e = eksikler(hedef)
    durum["bekleyen"] = {"sayi": len(e), "mb": tahmini_mb(e), "idler": e}


# ---------------------------------------------------------------------------
# Benzer icerik onerileri
# ---------------------------------------------------------------------------

def oneri_isi():
    durum["faz"] = "Benzerler araniyor"
    sahip = [v for v in tracks if dosya_yolu(v) and not v.startswith("f_")]
    if not sahip:
        return
    plays, liked = stats["plays"], set(stats["liked"])
    tohum = []
    for v in sorted(sahip, key=lambda v: -(plays.get(v, 0) * 2 + (3 if v in liked else 0)))[:3]:
        tohum.append(v)
    for v in stats["recent"]:
        if v in sahip and v not in tohum and len(tohum) < 6:
            tohum.append(v)
    rest = [v for v in sahip if v not in tohum]
    tohum += random.sample(rest, min(1, len(rest)))
    sayac, bilgi = {}, {}
    for i, t in enumerate(tohum):
        durum["parca"] = f"{i + 1}/{len(tohum)}"
        try:
            veri = ytdlp_json(["--flat-playlist", "-J", "--no-warnings", "--playlist-end", "30",
                               f"https://www.youtube.com/watch?v={t}&list=RD{t}"])
        except Exception as e:
            gunluk(f"Oneri alinamadi {t}: {e}")
            continue
        for e in veri.get("entries") or []:
            vid = e.get("id")
            if not vid or dosya_yolu(vid):
                continue
            sayac[vid] = sayac.get(vid, 0) + 1
            bilgi[vid] = {"id": vid, "title": e.get("title") or vid,
                          "artist": temiz_sanatci(e.get("channel") or e.get("uploader")), "duration": e.get("duration") or 0}
    global oneriler
    oneriler = {"zaman": int(time.time()),
                "liste": sorted(bilgi.values(), key=lambda x: (-sayac[x["id"]], random.random()))[:60]}
    yaz("oneriler.json", oneriler)
    gunluk(f"{len(oneriler['liste'])} benzer parca bulundu")


_onizle_onbellek = {}      # vid -> (zaman, ses baytlari, icerik turu)


def surec_agaci_oldur(p):
    """yt-dlp (ve baslattigi alt surecler) hemen kapansin."""
    try:
        if LINUX:
            os.killpg(os.getpgid(p.pid), signal.SIGTERM)
        else:
            subprocess.run(["taskkill", "/PID", str(p.pid), "/T", "/F"], capture_output=True, creationflags=NOWIN, timeout=15)
    except Exception:
        try:
            p.kill()
        except Exception:
            pass


def onizle_ses(vid, taze=False):
    """Parcanin ilk ~40 saniyelik sesi. yt-dlp kendi indiricisiyle akisi stdout'a verir, ilk baytlar okunup surec kapatilir
    (yt-dlp'nin kendi istemcisi kullanildigi icin YouTube'un 403 vermesi gibi sorunlar yasanmaz). 20 dk bellekte tutulur."""
    with KILIT:
        e = _onizle_onbellek.get(vid)
    if e and not taze and time.time() - e[0] < 1200:
        return e[1], e[2]
    N = 900_000                                           # ~55 sn (130 kbps); fazlasi okunmaz
    son = ""
    veri = b""
    for ek in cerez_denemeleri():
        p = subprocess.Popen(ytdlp_komutu() + ek + ["-f", "bestaudio[ext=m4a]/bestaudio", "--no-playlist", "--no-warnings", "--no-part",
                                                     "--no-progress", "-o", "-", "https://www.youtube.com/watch?v=" + vid],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, creationflags=NOWIN | DUSUK, **YENI_OTURUM)
        zamanlayici = threading.Timer(75, surec_agaci_oldur, (p,))
        zamanlayici.start()
        try:
            veri = p.stdout.read(N)
        finally:
            zamanlayici.cancel()
            surec_agaci_oldur(p)
        try:
            son = p.stderr.read(4000).decode("utf-8", "replace")
        except Exception:
            son = ""
        ag_say(META_ISTEK_KB * 1024 + len(veri))
        if len(veri) >= 20_000:
            break
    if len(veri) < 20_000:
        raise RuntimeError(hata_ozeti(son) if son.strip() else "Ses alinamadi")
    tur = "audio/webm" if veri[:4] == b"\x1a\x45\xdf\xa3" else "audio/mp4"
    with KILIT:
        _onizle_onbellek[vid] = (time.time(), veri, tur)
        if len(_onizle_onbellek) > 12:                                     # bellek: en eski onizlemeler atilir
            for k in sorted(_onizle_onbellek, key=lambda k: _onizle_onbellek[k][0])[:4]:
                del _onizle_onbellek[k]
    return veri, tur


def benzer_getir(vid, yenile=False):
    """Tek bir parcaya benzerler (YouTube karisimi). Parca basina onbellekte tutulur: ayni parca icin internet bir kez kullanilir."""
    with KILIT:
        e = benzer_onbellek.get(vid)
    if e and not yenile and time.time() - e["zaman"] < 7 * 86400:
        return e
    veri = ytdlp_json(["--flat-playlist", "-J", "--no-warnings", "--playlist-end", "40",
                       f"https://www.youtube.com/watch?v={vid}&list=RD{vid}"])
    liste = []
    for x in veri.get("entries") or []:
        i = x.get("id")
        if not i or i == vid:
            continue
        liste.append({"id": i, "title": x.get("title") or i, "artist": temiz_sanatci(x.get("channel") or x.get("uploader")),
                      "duration": x.get("duration") or 0})
    e = {"zaman": int(time.time()), "liste": liste}
    with KILIT:
        benzer_onbellek[vid] = e
        if len(benzer_onbellek) > 300:       # eskileri at
            for k in sorted(benzer_onbellek, key=lambda k: benzer_onbellek[k]["zaman"])[:50]:
                del benzer_onbellek[k]
        yaz("benzer.json", benzer_onbellek)
    return e


# ---------------------------------------------------------------------------
# Eksik kapaklar (acik istekle)
# ---------------------------------------------------------------------------

def uzak_kapak_indir(vid, hedef, kaliteler=("maxresdefault", "hqdefault")):
    for ad in kaliteler:
        try:
            req = urllib.request.Request(f"https://i.ytimg.com/vi/{vid}/{ad}.jpg", headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as r:
                veri = r.read()
            ag_say(len(veri))
            with open(hedef, "wb") as f:
                f.write(veri)
            return True
        except Exception:
            continue
    return False


def kapak_isi():
    durum["faz"] = "Kapaklar getiriliyor"
    for vid in [v for v, m in tracks.items() if dosya_yolu(v) and not v.startswith("f_") and not yerel_kapak(v)]:
        durum["parca"] = tracks[vid].get("title", vid)
        ham = os.path.join(vm_klasoru("ham"), vid + ".jpg")
        if uzak_kapak_indir(vid, ham):
            kare_kapak(ham, os.path.join(vm_klasoru("kapaklar"), vid + ".jpg"))
            os.remove(ham)
        durum["biten"] += 1


def kapaksiz():
    return [v for v, m in tracks.items() if dosya_yolu(v) and not v.startswith("f_") and not yerel_kapak(v)]


# ---------------------------------------------------------------------------
# YouTube aramasi (sadece acik istekle; API anahtari / hesap gerekmez: yt-dlp'nin arama ozelligi)
# ---------------------------------------------------------------------------

def ara(q):
    q = re.sub(r"\s+", " ", (q or "")).strip()[:120]
    if len(q) < 2:
        raise RuntimeError("Aramak icin en az 2 harf yaz")
    veri = ytdlp_json(["--flat-playlist", "-J", "--no-warnings", f"ytsearch25:{q}"])
    sonuc = []
    for e in veri.get("entries") or []:
        vid = e.get("id")
        sure = e.get("duration") or 0
        if not vid or not re.fullmatch(r"[\w-]{11}", vid) or sure > 900:      # 15 dk ustu: mix/canli yayin
            continue
        sonuc.append({"id": vid, "title": e.get("title") or vid,
                      "artist": temiz_sanatci(e.get("channel") or e.get("uploader")),
                      "duration": sure, "var": bool(dosya_yolu(vid))})
        if len(sonuc) >= 20:
            break
    return sonuc


def kapak_yolu(vid, uzak):
    if not re.fullmatch(r"[\w-]{6,20}", vid):
        return None
    y = yerel_kapak(vid)
    if y:
        return y
    onb = os.path.join(ONBELLEK, vid + ".jpg")
    if os.path.exists(onb):
        return onb
    # gorunum amacli uzak kapak kucuk (~8 KB, mqdefault): 28 parcalik listede ~2.6 MB yerine ~0.2 MB
    if uzak and not vid.startswith("f_") and uzak_kapak_indir(vid, onb, ("mqdefault", "hqdefault")):
        return onb
    return None


# ---------------------------------------------------------------------------
# Ses dalga formu (zirveler), ses seviyesi (LUFS) analizi, sarki sozleri
# ---------------------------------------------------------------------------

def zirveler(vid):
    yol = dosya_yolu(vid)
    if not yol:
        raise RuntimeError("dosya yok")
    kl = os.path.join(VERI, "zirve")
    os.makedirs(kl, exist_ok=True)
    f = os.path.join(kl, vid + ".json")
    if os.path.exists(f):
        return oku("zirve/" + vid + ".json", [])
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", yol, "-ac", "1", "-ar", "4000", "-f", "s16le", "-"],
                       capture_output=True, creationflags=NOWIN | DUSUK, timeout=180)
    a = array.array("h")
    a.frombytes(r.stdout[:len(r.stdout) // 2 * 2])
    n = 480
    adim = max(1, len(a) // n)
    z = []
    for i in range(n):
        parca = a[i * adim:(i + 1) * adim]
        z.append(max(max(parca), -min(parca)) if parca else 0)
    tepe = max(z) or 1
    z = [round(x / tepe, 3) for x in z]
    yaz("zirve/" + vid + ".json", z)
    return z


def lufs_olc(yol):
    r = subprocess.run(["ffmpeg", "-nostats", "-hide_banner", "-i", yol, "-af", "ebur128=framelog=quiet", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace",
                       creationflags=NOWIN | DUSUK, timeout=400)
    m = re.findall(r"I:\s+(-?\d+(?:\.\d+)?)\s+LUFS", r.stderr or "")
    return float(m[-1]) if m else None


analiz_olay = threading.Event()


def analiz_dongu():
    """Arka planda, dusuk oncelikle: henuz olculmemis parcalarin ses seviyesini (LUFS) olcer. Internet kullanmaz."""
    while True:
        analiz_olay.wait()
        analiz_olay.clear()
        sayac = 0
        for vid in list(tracks):
            m = tracks.get(vid)
            if not m or "lufs" in m or not dosya_yolu(vid):
                continue
            try:
                v = lufs_olc(dosya_yolu(vid))
            except Exception:
                v = None
            with KILIT:
                m["lufs"] = v if v is not None else -99
            sayac += 1
            if sayac % 4 == 0:
                kaydet()
            time.sleep(0.3)
        if sayac:
            kaydet()


def soz_dosyalari(vid):
    adaylar = [os.path.join(vm_klasoru("soz"), vid + ".lrc")]
    m = tracks.get(vid) or {}
    if m.get("dosya"):
        taban = os.path.splitext(os.path.join(ind_klasoru(), m["dosya"]))[0]
        adaylar += [taban + ".lrc", taban + ".txt"]
    return adaylar


def soz_oku(vid):
    for p in soz_dosyalari(vid):
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8-sig", errors="replace") as f:
                    return f.read()
            except Exception:
                pass
    return None


def soz_kaydet(vid, metin):
    if not isinstance(vid, str) or not re.fullmatch(r"[A-Za-z0-9_-]{6,20}", vid):
        raise ValueError("Gecersiz parca kimligi")
    p =os.path.join(vm_klasoru("soz"), vid + ".lrc")
    if metin and metin.strip():
        with open(p, "w", encoding="utf-8") as f:
            f.write(metin)
    elif os.path.exists(p):
        os.remove(p)


def _temiz_ad(s):
    s = re.sub(r"\(.*?\)|\[.*?\]", "", s or "")
    s = re.sub(r"\s*-\s*(official|video|audio|lyrics?|hd|4k).*$", "", s, flags=re.I)
    return re.sub(r"\s+", " ", s).strip()


def soz_bul(vid):
    """lrclib.net'ten (ucretsiz, acik servis) senkronlu soz arar. SADECE kullanici isteyince cagrilir; ~5-10 KB."""
    m = tracks.get(vid) or {}
    baslik, sanatci = _temiz_ad(m.get("title")), _temiz_ad(m.get("artist"))
    sure = int(m.get("duration") or 0)
    ham = []

    def al(url):
        req = urllib.request.Request(url, headers={"User-Agent": "VaalzMusic/1.0 (yerel muzik calar)"})
        with urllib.request.urlopen(req, timeout=12) as r:
            veri = r.read()
        ag_say(len(veri) + 1500)
        return json.loads(veri)

    try:
        q = urllib.parse.urlencode({"artist_name": sanatci, "track_name": baslik, "duration": sure} if sure else {"artist_name": sanatci, "track_name": baslik})
        ham.append(al("https://lrclib.net/api/get?" + q))
    except Exception:
        pass
    if not ham:
        try:
            for x in al("https://lrclib.net/api/search?" + urllib.parse.urlencode({"q": (sanatci + " " + baslik).strip()}))[:5]:
                ham.append(x)
        except Exception:
            pass
    for x in ham:
        t = x.get("syncedLyrics") or x.get("plainLyrics")
        if t:
            soz_kaydet(vid, t)
            return {"var": True, "metin": t, "senkron": bool(x.get("syncedLyrics"))}
    return {"var": False}


# ---------------------------------------------------------------------------
# Ozetler
# ---------------------------------------------------------------------------

def kutuphane_json():
    with KILIT:
        t = {}
        try:                     # tek seferde dizin listesi: parca basina dosya sistemi sorgusu yok (1500 parcada 0.7 sn -> ~0.05 sn)
            dosyalar = set(ses_dosyalari())
            kapaklar = set(os.listdir(vm_klasoru("kapaklar")))
            bilinen = {m["dosya"] for m in tracks.values() if m.get("dosya")}
            yeniler = [r for r in dosyalar - bilinen if not (tracks.get(dosya_kimligi(r)) or {}).get("dosya")]
            if bilinen - dosyalar or yeniler:        # elle silinen ya da eklenen dosya var: kayitlari esitle
                tara_arkada()
        except OSError:
            dosyalar, kapaklar = set(), set()
        for vid, m in tracks.items():
            var = bool(m.get("dosya")) and m["dosya"] in dosyalar
            t[vid] = {"id": vid, "title": m.get("title", ""), "artist": m.get("artist", ""), "album": m.get("album", ""),
                      "duration": m.get("duration", 0), "var": var, "eklendi": m.get("eklendi", 0), "lufs": m.get("lufs"),
                      "kapak": (vid + ".jpg") in kapaklar}
        return {"tracks": t, "playlists": list(playlists.values()), "liked": stats["liked"], "plays": stats["plays"],
                "recent": stats["recent"], "lists": stats["lists"],
                "otomatik_oneri": cfg["otomatik_oneri"], "veri_tasarrufu": cfg["veri_tasarrufu"],
                "kapaksiz": sum(1 for v, x in t.items() if x["var"] and not x["kapak"] and not v.startswith("f_"))}


def ag_json():
    return {"oturum": oturum_ag[0], "ay": stats["ag"].get(time.strftime("%Y-%m"), 0)}


def ayarlar_json():
    return {"cookies_browser": cfg["cookies_browser"], "format": cfg["format"],
            "playlists": cfg["playlists"], "indirilenler": cfg["indirilenler"], "otomatik_oneri": cfg["otomatik_oneri"],
            "veri_tasarrufu": cfg["veri_tasarrufu"], "es_zamanli": cfg["es_zamanli"], "dil": cfg.get("dil", "tr")}


# ---------------------------------------------------------------------------
# Arayuz dili: kaynak (web/index.html, web/app.js) Turkce yazilidir. "en" secilince web/dil/en.json icindeki
# {file, old, new} degisimleri sunulurken uygulanir. Eslesmeyen satir atlanir (o metin Turkce kalir) ve gunluge yazilir.
# ---------------------------------------------------------------------------

_DIL_ONBELLEK = {}
_DIL_UYARILAN = set()
DILLER = ("tr", "en")


def dil_degisimleri(dil):
    """web/dil/<dil>.json ve parca parca eklenen <dil>.<ad>.json dosyalarini sirayla birlestirir."""
    klasor = os.path.join(WEB, "dil")
    try:
        dosyalar = sorted(f for f in os.listdir(klasor) if f == dil + ".json" or (f.startswith(dil + ".") and f.endswith(".json")))
    except OSError:
        return []
    imza = tuple((f, os.path.getmtime(os.path.join(klasor, f))) for f in dosyalar)
    onb = _DIL_ONBELLEK.get(dil)
    if onb and onb[0] == imza:
        return onb[1]
    liste = []
    for f in dosyalar:
        try:
            with open(os.path.join(klasor, f), "r", encoding="utf-8") as fh:
                liste += [e for e in json.load(fh) if isinstance(e, dict)]
        except Exception as e:
            gunluk(f"dil dosyasi okunamadi ({f}): {e}")
    _DIL_ONBELLEK[dil] = (imza, liste)
    return liste


def dil_cevir(ad, metin, dil, eslesmeyen=None):
    """ad: 'app.js' / 'index.html'. Eslesmeyen degisimleri eslesmeyen listesine ekler."""
    for e in dil_degisimleri(dil):
        dosya = str(e.get("file", "")).replace("\\", "/")
        if dosya != ad and not dosya.endswith("/" + ad):
            continue
        eski, yeni = e.get("old"), e.get("new")
        if not eski or not isinstance(yeni, str):
            continue
        if eski in metin:
            metin = metin.replace(eski, yeni)
        else:
            if eslesmeyen is not None:
                eslesmeyen.append(eski)
            elif (dil, eski) not in _DIL_UYARILAN:
                _DIL_UYARILAN.add((dil, eski))
                gunluk(f"dil: eslesmedi ({ad}): {eski[:80]}")
    return metin


# Sunucunun arayuze gonderdigi metinler (hata ozetleri, arac aciklamalari, kurulum gunlugu): cevirileri web/dil/<dil>.msg.json icinde,
# {"file": "kaynak/vaalzmusic.py", "old": <Turkce metin>, "new": <ceviri>}. Kisa girdiler yalnizca metnin TAMAMI esitse uygulanir
# ("alt": true olanlar ve hata/mesaj/log anahtarlarinda her girdi alt dize olarak da uygulanir); parca adlarini bozmamak icin.
_METIN_ANAHTAR = {"hata", "mesaj", "log", "ne", "komut"}
_CEVRILEN_ANAHTAR = _METIN_ANAHTAR | {"parca", "baslik"}


def mesaj_cevir(s, alt_izin, dil):
    for e in dil_degisimleri(dil):
        if not str(e.get("file", "")).replace("\\", "/").endswith("vaalzmusic.py"):
            continue
        eski, yeni = e.get("old"), e.get("new")
        if not eski or not isinstance(yeni, str):
            continue
        if s == eski:
            return yeni
        if (alt_izin or e.get("alt")) and eski in s:
            s = s.replace(eski, yeni)
    return s


def mesajlari_cevir(o, anahtar=None, dil="en"):
    if isinstance(o, str):
        return mesaj_cevir(o, anahtar in _METIN_ANAHTAR, dil) if anahtar in _CEVRILEN_ANAHTAR else o
    if isinstance(o, list):
        return [mesajlari_cevir(x, anahtar, dil) for x in o]
    if isinstance(o, dict):
        return {k: mesajlari_cevir(v, k, dil) for k, v in o.items()}
    return o


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------

son_ping = [0.0]


class Istek(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):
        pass

    def _yerel_mi(self):
        return self.headers.get("Host", "").split(":")[0] in ("127.0.0.1", "localhost")

    def _json(self, veri, kod=200):
        dil = cfg.get("dil", "tr")
        if dil != "tr" and not self.path.startswith(("/api/kutuphane", "/api/oneriler", "/api/ara", "/api/benzer")):
            veri = mesajlari_cevir(veri, None, dil)
        b = json.dumps(veri, ensure_ascii=False).encode("utf-8")
        self.send_response(kod)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b)

    def _dosya(self, yol, tip, onbellek=False):
        ad, dil = os.path.basename(yol), cfg.get("dil", "tr")
        if dil != "tr" and ad in ("index.html", "app.js"):
            with open(yol, "r", encoding="utf-8") as f:
                b = dil_cevir(ad, f.read(), dil).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", tip)
            self.send_header("Content-Length", str(len(b)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(b)
            return
        boyut = os.path.getsize(yol)
        bas, son, kod = 0, boyut - 1, 200
        m = re.match(r"bytes=(\d*)-(\d*)", self.headers.get("Range") or "")
        if m and (m.group(1) or m.group(2)):
            if m.group(1) == "":
                bas = max(0, boyut - int(m.group(2)))
            else:
                bas = int(m.group(1))
                if m.group(2):
                    son = min(son, int(m.group(2)))
            if bas > son or bas >= boyut:
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{boyut}")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            kod = 206
        self.send_response(kod)
        self.send_header("Content-Type", tip)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(son - bas + 1))
        if kod == 206:
            self.send_header("Content-Range", f"bytes {bas}-{son}/{boyut}")
        self.send_header("Cache-Control", "max-age=86400" if onbellek else "no-cache")
        self.end_headers()
        kalan = son - bas + 1
        with open(yol, "rb") as f:
            f.seek(bas)
            while kalan > 0:
                parca = f.read(min(65536, kalan))
                if not parca:
                    break
                self.wfile.write(parca)
                kalan -= len(parca)

    def _404(self):
        self.send_response(404)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        try:
            if not self._yerel_mi():
                return self._404()
            u = urllib.parse.urlparse(self.path)
            p, q = u.path, urllib.parse.parse_qs(u.query)
            if p == "/":
                return self._dosya(os.path.join(WEB, "index.html"), "text/html; charset=utf-8")
            if p.startswith("/s/"):
                yol = os.path.normpath(os.path.join(WEB, p[3:]))
                if (yol == WEB or yol.startswith(WEB + os.sep)) and os.path.isfile(yol):
                    return self._dosya(yol, mimetypes.guess_type(yol)[0] or "application/octet-stream")
                return self._404()
            if p == "/api/ping":
                son_ping[0] = time.time()
                return self._json({"ok": True, "app": "vaalz-music", "api_version": 1})
            if p == "/api/kutuphane":
                return self._json(kutuphane_json())
            if p == "/api/durum":
                with KILIT:
                    d = {k: v for k, v in durum.items() if k != "log"}
                    d["log"] = durum["log"][-6:]
                    d["ag"] = ag_json()
                    return self._json(d)
            if p == "/api/ag":
                return self._json(ag_json())
            if p == "/api/ayarlar":
                return self._json(ayarlar_json())
            if p == "/api/oneriler":
                yas = time.time() - oneriler["zaman"]
                with KILIT:
                    liste = [x for x in oneriler["liste"] if not dosya_yolu(x["id"])]
                return self._json({"zaman": oneriler["zaman"], "liste": liste,
                                   "eski": yas > 86400, "calisiyor": durum["faz"] == "Benzerler araniyor"})
            if p == "/api/onizle":
                vid = (q.get("id") or [""])[0]
                if not re.fullmatch(r"[A-Za-z0-9_-]{11}", vid):
                    return self._json({"hata": "gecersiz parca"}, 400)
                try:
                    onizle_ses(vid, (q.get("taze") or [""])[0] == "1")
                    return self._json({"url": "/api/onizle-ses?id=" + vid})
                except Exception as ex:
                    return self._json({"hata": str(ex)}, 502)
            if p == "/api/onizle-ses":
                vid = (q.get("id") or [""])[0]
                if not re.fullmatch(r"[A-Za-z0-9_-]{11}", vid):
                    return self._404()
                try:
                    veri, tur = onizle_ses(vid)
                except Exception:
                    return self._404()
                bas, son, kod = 0, len(veri) - 1, 200
                m = re.match(r"bytes=(\d*)-(\d*)", self.headers.get("Range") or "")
                if m and (m.group(1) or m.group(2)):
                    if m.group(1) == "":
                        bas = max(0, len(veri) - int(m.group(2)))
                    else:
                        bas = int(m.group(1))
                        if m.group(2):
                            son = min(int(m.group(2)), len(veri) - 1)
                    if bas > son or bas >= len(veri):
                        self.send_response(416)
                        self.send_header("Content-Range", f"bytes */{len(veri)}")
                        self.send_header("Content-Length", "0")
                        self.end_headers()
                        return
                    kod = 206
                parca = veri[bas:son + 1]
                self.send_response(kod)
                self.send_header("Content-Type", tur)
                self.send_header("Accept-Ranges", "bytes")
                self.send_header("Content-Length", str(len(parca)))
                if kod == 206:
                    self.send_header("Content-Range", f"bytes {bas}-{son}/{len(veri)}")
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(parca)
                return
            if p == "/api/benzer":
                vid = (q.get("id") or [""])[0]
                if not re.fullmatch(r"[A-Za-z0-9_-]{6,20}", vid):
                    return self._json({"hata": "gecersiz parca"}, 400)
                try:
                    e = benzer_getir(vid, (q.get("yenile") or [""])[0] == "1")
                except Exception as ex:
                    return self._json({"hata": str(ex)}, 502)
                with KILIT:
                    liste = [x for x in e["liste"] if not dosya_yolu(x["id"])]
                return self._json({"zaman": e["zaman"], "liste": liste})
            if p == "/api/sistem":
                d = dict(sistem_durumu(q.get("yenile") == ["1"]))
                with KILIT:
                    d["kurulum"] = dict(kurulum)
                return self._json(d)
            if p == "/api/ara":
                try:
                    return self._json({"sonuclar": ara((q.get("q") or [""])[0])})
                except Exception as e:
                    return self._json({"hata": str(e)}, 400)
            if p.startswith("/api/parca/"):
                yol = dosya_yolu(p.rsplit("/", 1)[1])
                if not yol:
                    return self._404()
                return self._dosya(yol, SES_TIPI.get(os.path.splitext(yol)[1].lower(), "audio/mpeg"))
            if p.startswith("/api/zirve/"):
                try:
                    return self._json({"z": zirveler(p.rsplit("/", 1)[1])})
                except Exception as e:
                    return self._json({"hata": str(e)}, 404)
            if p.startswith("/api/soz/"):
                t = soz_oku(p.rsplit("/", 1)[1])
                return self._json({"var": t is not None, "metin": t})
            if p.startswith("/api/kapak/"):
                yol = kapak_yolu(p.rsplit("/", 1)[1], q.get("uzak") == ["1"])
                return self._dosya(yol, "image/jpeg", onbellek=True) if yol else self._404()
            self._404()
        except (ConnectionError, BrokenPipeError):
            pass
        except Exception:
            gunluk("GET hata: " + traceback.format_exc())
            try:
                self._json({"hata": "sunucu hatasi"}, 500)
            except Exception:
                pass

    def do_POST(self):
        try:
            if not self._yerel_mi():
                return self._404()
            org, port = self.headers.get("Origin"), PORT_AKTIF[0]
            if org and org not in (f"http://127.0.0.1:{port}", f"http://localhost:{port}"):
                return self._json({"hata": "yasak"}, 403)
            n = int(self.headers.get("Content-Length") or 0)
            if n > 2_000_000:
                return self._json({"hata": "istek cok buyuk"}, 413)
            g = json.loads(self.rfile.read(n) or b"{}") if n else {}
            self._json(self.post_isle(self.path, g))
        except (ConnectionError, BrokenPipeError):
            pass
        except Exception as e:
            gunluk("POST hata: " + traceback.format_exc())
            try:
                self._json({"hata": str(e)}, 400)
            except Exception:
                pass

    def post_isle(self, p, g):
        with KILIT:
            if p == "/api/say":
                v = g.get("id")
                stats["plays"][v] = stats["plays"].get(v, 0) + 1
                stats["recent"] = ([v] + [x for x in stats["recent"] if x != v])[:60]
                kaydet()
                return {"ok": True}
            if p == "/api/cal":
                if g.get("liste"):
                    stats["lists"][g["liste"]] = int(time.time())
                    kaydet()
                return {"ok": True}
            if p == "/api/begen":
                v = g.get("id")
                stats["liked"] = [x for x in stats["liked"] if x != v]
                if g.get("on"):
                    stats["liked"].insert(0, v)
                kaydet()
                return {"ok": True}
            if p == "/api/liste/yeni":
                lid = "l_" + uuid.uuid4().hex[:8]
                playlists[lid] = {"id": lid, "title": (g.get("title") or "Yeni playlist")[:80], "url": None,
                                  "local": True, "tracks": [g["parca"]] if g.get("parca") in tracks else []}
                kaydet()
                return {"id": lid}
            if p == "/api/liste/sil":
                if playlists.get(g.get("id"), {}).get("local"):
                    del playlists[g["id"]]
                    kaydet()
                return {"ok": True}
            if p == "/api/liste/ad":
                if playlists.get(g.get("id"), {}).get("local"):
                    playlists[g["id"]]["title"] = (g.get("title") or "").strip()[:80] or "Adsiz"
                    kaydet()
                return {"ok": True}
            if p == "/api/liste/ekle":
                pl = playlists.get(g.get("id"))
                if pl and pl["local"]:
                    for v in ([g["parca"]] if g.get("parca") else g.get("parcalar", [])):
                        if v in tracks and v not in pl["tracks"]:
                            pl["tracks"].append(v)
                    kaydet()
                return {"ok": True}
            if p == "/api/liste/cikar":
                pl = playlists.get(g.get("id"))
                if pl and pl["local"]:
                    pl["tracks"] = [x for x in pl["tracks"] if x != g.get("parca")]
                    kaydet()
                return {"ok": True}
            if p == "/api/liste/sirala":
                pl = playlists.get(g.get("id"))
                if pl and pl["local"] and sorted(g.get("tracks", [])) == sorted(pl["tracks"]):
                    pl["tracks"] = g["tracks"]
                    kaydet()
                return {"ok": True}
            if p == "/api/ayarlar":
                if "cookies_browser" in g:
                    cfg["cookies_browser"] = str(g["cookies_browser"]).strip().lower()
                if g.get("format") in ("wav", "flac", "m4a", "opus", "mp3"):
                    cfg["format"] = g["format"]
                if "otomatik_oneri" in g:
                    cfg["otomatik_oneri"] = bool(g["otomatik_oneri"])
                if "veri_tasarrufu" in g:
                    cfg["veri_tasarrufu"] = bool(g["veri_tasarrufu"])
                if "es_zamanli" in g:
                    cfg["es_zamanli"] = max(1, min(8, int(g["es_zamanli"] or 4)))
                if g.get("dil") in DILLER:
                    cfg["dil"] = g["dil"]
                if "cookies_browser" in g:
                    CEREZ_YOK[0] = False
                if "playlists" in g:
                    cfg["playlists"] = [u for u in (liste_url(x) for x in g["playlists"]) if u]
                kaydet()
                return ayarlar_json()
            if p == "/api/dosya-sil":
                yol = dosya_yolu(g.get("id"))
                if yol:
                    os.remove(yol)
                    k = yerel_kapak(g["id"])
                    if k:
                        os.remove(k)
                    tracks[g["id"]]["dosya"] = None
                    kaydet()
                return {"ok": True}

        if p == "/api/soz/bul":
            return soz_bul(g.get("id"))
        if p == "/api/soz/kaydet":
            soz_kaydet(g.get("id"), g.get("metin") or "")
            return {"ok": True}
        if p == "/api/liste/link":
            if harici_tur(g.get("url")):
                lid, n = harici_ice_aktar(g.get("url"))
                return {"ok": True, "id": lid, "harici": True, "sayi": n}
            u = liste_url(g.get("url"))
            if not u:
                raise ValueError("Gecerli bir YouTube Music playlist linki degil")
            with KILIT:
                if u not in cfg["playlists"]:
                    cfg["playlists"].append(u)
                kaydet()
            otomatik = bool(g.get("indir"))

            def link_isi():
                kontrol_isi(u)
                if otomatik:
                    b = durum.get("bekleyen") or {}
                    idler = b.get("idler") or []
                    durum["bekleyen"] = None
                    if idler:
                        indirmeye_ekle(idler)
            is_ekle(link_isi)
            return {"ok": True, "id": liste_id(u)}
        if p == "/api/liste/kaldir":
            with KILIT:
                pl = playlists.get(g.get("id"))
                if pl and not pl["local"]:
                    cfg["playlists"] = [x for x in cfg["playlists"] if liste_id(x) != pl["id"]]
                    del playlists[pl["id"]]
                    kaydet()
            return {"ok": True}
        if p == "/api/tara":
            return {"sayi": tara()}
        if p == "/api/senkron/kontrol":
            u = g.get("url")
            is_ekle(lambda: kontrol_isi(u))
            return {"ok": True}
        if p == "/api/senkron/basla":
            idler = (durum.get("bekleyen") or {}).get("idler") or []
            durum["bekleyen"] = None
            if idler:
                indirmeye_ekle(idler)
            return {"ok": True, "sayi": len(idler)}
        if p == "/api/indir-liste":
            pl = playlists.get(g.get("id"))
            idler = eksikler(pl["tracks"]) if pl else []
            if idler:
                indirmeye_ekle(idler)
            return {"sayi": len(idler)}
        if p == "/api/indirme-durdur":
            return indirmeyi_durdur()
        if p == "/api/klasor-ac":
            yol = dosya_yolu(g.get("id")) if g.get("id") else None
            if LINUX:
                for yonetici in ("dolphin", "nautilus"):                 # dosyayi secili gosterebilenler
                    if yol and shutil.which(yonetici):
                        subprocess.Popen([yonetici, "--select", yol], start_new_session=True)
                        return {"ok": True}
                ac = shutil.which("xdg-open")
                if not ac:
                    raise ValueError("xdg-open bulunamadi; klasor: " + ind_klasoru())
                subprocess.Popen([ac, os.path.dirname(yol) if yol else ind_klasoru()], start_new_session=True)
            elif yol:
                subprocess.Popen(["explorer", "/select," + os.path.normpath(yol)])       # klasoru acar, dosyayi secili gosterir
            else:
                os.startfile(ind_klasoru())
            return {"ok": True}
        if p == "/api/sistem/kur":
            kurulum_calistir([str(x) for x in (g.get("araclar") or [])], bool(g.get("guncelle")))
            return {"ok": True}
        if p == "/api/oneriler/yenile":
            if time.time() - oneriler["zaman"] < 3600 and not g.get("zorla"):
                return {"ok": True, "atlandi": True}
            if durum["faz"] != "Benzerler araniyor":
                is_ekle(oneri_isi)
            return {"ok": True}
        if p == "/api/kapaklari-getir":
            n = kapaksiz()
            is_ekle(kapak_isi, len(n))
            return {"sayi": len(n)}
        if p == "/api/indir":
            vid = g.get("id")
            if not re.fullmatch(r"[\w-]{11}", vid or ""):
                raise ValueError("gecersiz id")
            with KILIT:
                tracks.setdefault(vid, {"id": vid, "eklendi": int(time.time()), "dosya": None,
                                        "title": g.get("title") or vid, "artist": g.get("artist") or "",
                                        "album": "", "duration": g.get("duration") or 0})
                if g.get("liste") in playlists and playlists[g["liste"]]["local"] and vid not in playlists[g["liste"]]["tracks"]:
                    playlists[g["liste"]]["tracks"].append(vid)
                kaydet()
            if not dosya_yolu(vid) and vid not in durum["ids"]:
                indirmeye_ekle([vid])
            return {"ok": True}
        raise ValueError("bilinmeyen istek")


# ---------------------------------------------------------------------------
# Baslat
# ---------------------------------------------------------------------------

def _guvenli(f):
    try:
        f()
    except Exception:
        gunluk("gorev cubugu kimligi ayarlanamadi: " + traceback.format_exc())

def gorev_cubugu_kimligi():
    """Edge uygulama penceresini VaalzMusic.exe'ye baglar: gorev cubuguna sabitleyince Edge degil Vaalz Music acilir ve ikonu gorunur."""
    if os.name != "nt" or not getattr(sys, "frozen", False):
        return
    import ctypes
    from ctypes import wintypes

    class GUID(ctypes.Structure):
        _fields_ = [("a", ctypes.c_uint32), ("b", ctypes.c_uint16), ("c", ctypes.c_uint16), ("d", ctypes.c_ubyte * 8)]

    def guid(s):
        g = GUID()
        ctypes.oledll.ole32.CLSIDFromString(ctypes.c_wchar_p(s), ctypes.byref(g))
        return g

    class KEY(ctypes.Structure):
        _fields_ = [("fmtid", GUID), ("pid", wintypes.DWORD)]

    class PROPVARIANT(ctypes.Structure):
        _fields_ = [("vt", ctypes.c_ushort), ("r1", ctypes.c_ushort), ("r2", ctypes.c_ushort), ("r3", ctypes.c_ushort),
                    ("p", ctypes.c_void_p), ("pad", ctypes.c_void_p)]

    ole32, shell32, user32 = ctypes.windll.ole32, ctypes.windll.shell32, ctypes.windll.user32
    ole32.CoInitialize(None)
    iid = guid("{886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99}")        # IPropertyStore
    fmt = guid("{9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3}")        # System.AppUserModel.*
    exe = sys.executable
    degerler = {5: "Vaalz.Music.Player.v2", 2: f'"{exe}"', 3: f"{exe},0", 4: "Vaalz Music"}   # ID, RelaunchCommand, RelaunchIconResource, RelaunchDisplayNameResource
    yapildi = set()
    PROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

    def ayarla(hwnd):
        ps = ctypes.c_void_p()
        if shell32.SHGetPropertyStoreForWindow(hwnd, ctypes.byref(iid), ctypes.byref(ps)) != 0 or not ps:
            return False
        vt = ctypes.cast(ctypes.cast(ps, ctypes.POINTER(ctypes.c_void_p))[0], ctypes.POINTER(ctypes.c_void_p))
        set_value = ctypes.WINFUNCTYPE(ctypes.HRESULT, ctypes.c_void_p, ctypes.POINTER(KEY), ctypes.POINTER(PROPVARIANT))(vt[6])
        commit = ctypes.WINFUNCTYPE(ctypes.HRESULT, ctypes.c_void_p)(vt[7])
        release = ctypes.WINFUNCTYPE(ctypes.c_ulong, ctypes.c_void_p)(vt[2])
        try:
            for pid, deger in degerler.items():
                ham = (deger + chr(0)).encode("utf-16-le")
                ole32.CoTaskMemAlloc.restype = ctypes.c_void_p
                tampon = ole32.CoTaskMemAlloc(len(ham))
                ctypes.memmove(tampon, ham, len(ham))
                pv = PROPVARIANT()
                pv.vt = 31                                   # VT_LPWSTR
                pv.p = tampon
                set_value(ps, ctypes.byref(KEY(fmt, pid)), ctypes.byref(pv))
                ole32.PropVariantClear(ctypes.byref(pv))
            commit(ps)
        finally:
            release(ps)
        return True

    def tara(hwnd, _):
        if not user32.IsWindowVisible(hwnd):
            return True
        sinif = ctypes.create_unicode_buffer(64)
        user32.GetClassNameW(hwnd, sinif, 64)
        n = user32.GetWindowTextLengthW(hwnd)
        if sinif.value != "Chrome_WidgetWin_1" or not n:
            return True
        ad = ctypes.create_unicode_buffer(n + 1)
        user32.GetWindowTextW(hwnd, ad, n + 1)
        if ad.value.endswith("Vaalz Music"):
            if hwnd not in yapildi and ayarla(hwnd):
                yapildi.add(hwnd)
            ikon_ata(hwnd)
        return True

    cb = PROC(tara)
    while True:
        user32.EnumWindows(cb, 0)
        time.sleep(0.25 if not yapildi else 2.0)        # pencere gorunur olur olmaz kimlik ve ikon atansin (Windows ilk gordugu ikonu AUMID icin onbellege alir)


def chromium_bul():
    """Linux: --app penceresi acabilen tarayici (Chrome, Chromium, Edge, Brave, Vivaldi)."""
    for ad in ("google-chrome-stable", "google-chrome", "chromium", "chromium-browser", "microsoft-edge-stable", "microsoft-edge",
               "brave-browser", "vivaldi"):
        yol = shutil.which(ad)
        if yol:
            return yol
    return None


def profil_temizle():
    """Edge/Chrome yeni profile ilk acilista yuzlerce MB uzanti, IndexedDB ve onbellek koyar; uygulamamiza gerekmez.
    Yalnizca yeniden uretilebilir klasorler silinir; ayarlar ('Local Storage') ve cerezler kalir."""
    kok = os.path.join(VERI, "pencere-profili")
    if not os.path.isdir(kok):
        return
    if LINUX and os.path.lexists(os.path.join(kok, "SingletonLock")):        # bu profil su an acik: dokunma
        return
    hedefler = [os.path.join(kok, ad) for ad in ("WidevineCdm", "Edge Wallet", "Edge Entity Extraction", "Subresource Filter",
                                                  "GrShaderCache", "ShaderCache", "component_crx_cache", "extensions_crx_cache")]
    hedefler += [os.path.join(kok, "Default", ad) for ad in ("Extensions", "IndexedDB", "Service Worker", "Code Cache", "GPUCache",
                                                             "Local Extension Settings", "Extension State", "Extension Rules",
                                                             "Extension Scripts", "EdgeCoupons")]
    for yol in hedefler:
        if os.path.isdir(yol):
            shutil.rmtree(yol, ignore_errors=True)


def pencere_ac(url):
    profil_temizle()
    secenekler = ["--disable-extensions", "--disable-default-apps", "--disk-cache-size=20971520", "--media-cache-size=1",
                  "--window-size=1360,840", "--no-first-run", "--no-default-browser-check",
                  "--disable-features=Translate,OptimizationHints,MediaRouter,AutofillServerCommunication",
                  "--disable-background-networking", "--disable-sync", "--disable-component-update",
                  "--disable-domain-reliability", "--no-pings", "--disable-breakpad",
                  "--metrics-recording-only", "--safebrowsing-disable-auto-update",
                  "--autoplay-policy=no-user-gesture-required"]
    profil = f"--user-data-dir={os.path.join(VERI, 'pencere-profili')}"
    if LINUX:
        exe = chromium_bul()
        if exe:
            subprocess.Popen([exe, f"--app={url}", profil, "--class=VaalzMusic", "--name=VaalzMusic"] + secenekler,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
            return
    else:
        for exe in (r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                    r"C:\Program Files\Google\Chrome\Application\chrome.exe"):
            if os.path.exists(exe):
                subprocess.Popen([exe, f"--app={url}", profil] + secenekler)
                threading.Thread(target=lambda: _guvenli(gorev_cubugu_kimligi), daemon=True).start()
                return
    import webbrowser            # uygulama penceresi acabilen tarayici yok (ornegin yalnizca Firefox): varsayilan tarayicida sekme
    webbrowser.open(url)


def zaten_calisiyor(port):
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/ping", timeout=2) as r:
            y = json.loads(r.read(200))
            # "app" alani olmayan yanit = kimlik eklenmeden onceki Vaalz surumu; baska bir "app" adi yabanci hizmettir
            return isinstance(y, dict) and y.get("ok") is True and y.get("app", "vaalz-music") == "vaalz-music"
    except Exception:
        return False


def bekci():
    baslangic = time.time()
    onceki = time.time()
    while True:
        time.sleep(10)
        simdi = time.time()
        if simdi - onceki > 40:          # bilgisayar uykudan donmus: pencerenin tekrar ping atmasina firsat ver
            son_ping[0] = simdi
            baslangic = simdi
        onceki = simdi
        if son_ping[0] == 0.0:
            if simdi - baslangic > 90:
                os._exit(0)
        elif simdi - son_ping[0] > 240 and not durum["mesgul"]:
            kaydet()
            os._exit(0)


KILIT_DOSYA = []


def kilit_al():
    """Veri klasorune ozel isletim sistemi kilidi: ayni anda iki ornek baslarsa yalnizca biri sunucu acar."""
    try:
        os.makedirs(VERI, exist_ok=True)
        f = open(os.path.join(VERI, ".kilit"), "a+")
    except OSError:
        return True                                  # kilit dosyasi acilamiyorsa eski davranisa don
    try:
        if os.name == "nt":
            import msvcrt
            f.seek(0)
            msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        f.close()
        return False
    KILIT_DOSYA.append(f)                            # surec bitene kadar acik kalir
    return True


def mevcut_ornek(port):
    for p in range(port, port + 12):             # ilk port doluyken baslayan onceki ornek siradaki portlardan birinde olabilir
        if zaten_calisiyor(p):
            return p
    return None


def main():
    port = cfg["port"]
    if not kilit_al():                           # baska ornek su an basliyor ya da calisiyor: onun hazir olmasini bekle
        for _ in range(30):
            p = mevcut_ornek(port)
            if p:
                if not os.environ.get("VAALZ_TEST"):
                    pencere_ac(f"http://127.0.0.1:{p}/")
                return
            time.sleep(0.5)
        return
    p = mevcut_ornek(port)                       # kilitsiz eski surumlerin calisan ornegi
    if p:
        if not os.environ.get("VAALZ_TEST"):
            pencere_ac(f"http://127.0.0.1:{p}/")
        return
    srv = None
    for deneme in range(port, port + 12):        # baska bir program portu tutuyorsa siradakini dene
        try:
            srv = ThreadingHTTPServer(("127.0.0.1", deneme), Istek)
            port = deneme
            break
        except OSError:
            continue
    if srv is None:
        gunluk("Hicbir port acilamadi")
        return
    PORT_AKTIF[0] = port
    url = f"http://127.0.0.1:{port}/"
    srv.daemon_threads = True
    srv.handle_error = lambda *a: None   # tarayici baglantiyi keserse sessiz gec
    threading.Thread(target=calisan, daemon=True).start()
    if not os.environ.get("VAALZ_TEST"):
        threading.Thread(target=bekci, daemon=True).start()
    threading.Thread(target=tara, daemon=True).start()
    threading.Thread(target=analiz_dongu, daemon=True).start()
    analiz_olay.set()
    if not os.environ.get("VAALZ_TEST"):
        pencere_ac(url)
    srv.serve_forever()


if __name__ == "__main__":
    main()
