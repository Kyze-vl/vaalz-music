# web/dil/<dil>.json degisimlerini web/app.js ve web/index.html uzerinde dener:  python dil_kontrol.py en
# Eslesmeyen/birden cok eslesen satirlari listeler ve cevrilmis app.js'in sozdizimini (node --check) denetler.
import os, sys, subprocess, tempfile
dil = sys.argv[1] if len(sys.argv) > 1 else "en"
KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["VAALZ_TEST"] = "1"
os.environ["VAALZ_BASE"] = tempfile.mkdtemp()
os.environ["VAALZ_WEB"] = os.path.join(KOK, "web")
sys.path.insert(0, os.path.join(KOK, "kaynak"))
import vaalzmusic as v

kod = 0
for ad in ("app.js", "index.html"):
    with open(os.path.join(KOK, "web", ad), "r", encoding="utf-8") as f:
        kaynak = f.read()
    eslesmeyen = []
    sonuc = v.dil_cevir(ad, kaynak, dil, eslesmeyen)
    girdi = [e for e in v.dil_degisimleri(dil) if str(e.get("file", "")).replace("\\", "/").endswith(ad)]
    cok = [e["old"][:70] for e in girdi if kaynak.count(e["old"]) > 1]
    print(f"{ad}: {len(girdi)} degisim, eslesmeyen {len(eslesmeyen)}, birden cok yerde gecen {len(cok)}")
    for s in eslesmeyen:
        print("  ESLESMEDI:", s[:110]); kod = 1
    for s in cok:
        print("  BIRDEN COK:", s)
    if ad == "app.js":
        gecici = os.path.join(tempfile.mkdtemp(), "app." + dil + ".js")
        with open(gecici, "w", encoding="utf-8") as f:
            f.write(sonuc)
        r = subprocess.run(["node", "--check", gecici], capture_output=True, text=True)
        print("  node --check:", "temiz" if r.returncode == 0 else r.stderr.strip()[:400])
        kod = kod or r.returncode
sys.exit(kod)
