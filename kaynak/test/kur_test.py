# Gercek kutuphaneye dokunmadan arayuzu/sunucuyu denemek icin SAHTE veri ortami kurar (kaynak/test/vaalz-test).
# On kosul: Vaalz Music/veri/oneriler.json ve onbellek kapaklari ile Indirilenler icinde en az bir parca olmali.
# Test ortami: gercek kutuphaneye dokunmadan arayuzu denemek icin sahte veri
import json, os, re, shutil, subprocess, wave, random, time
import os as _o
KOK = _o.path.dirname(_o.path.dirname(_o.path.dirname(_o.path.abspath(__file__))))
GERCEK = KOK
TEST = _o.path.join(_o.path.dirname(_o.path.abspath(__file__)), "vaalz-test")
shutil.rmtree(TEST, ignore_errors=True)
ind = os.path.join(TEST, "Indirilenler"); kap = os.path.join(ind, ".vaalzmusic", "kapaklar")
os.makedirs(kap); os.makedirs(os.path.join(TEST, "veri"))
o = json.load(open(os.path.join(GERCEK, "veri", "oneriler.json"), encoding="utf-8"))["liste"]
ids = []
for x in o:
    src = os.path.join(GERCEK, "veri", "onbellek", x["id"] + ".jpg")
    if not os.path.exists(src): continue
    ad = re.sub(r'[\\/:*?"<>|]', "", f'{x["artist"]} - {x["title"]}') + f' [{x["id"]}].wav'
    with wave.open(os.path.join(ind, ad), "wb") as w:
        w.setnchannels(1); w.setsampwidth(1); w.setframerate(8000)
        w.writeframes(bytes([128]) * 8000 * x["duration"])
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-vf", "crop='min(iw,ih)':'min(iw,ih)',scale=600:-2", "-q:v", "3", os.path.join(kap, x["id"] + ".jpg")])
    ids.append(x["id"])
# gercek test parcasi
shutil.copy(os.path.join(GERCEK, "Indirilenler", "Ceza - Neyim Var Ki (feat. Sagopa K) [vBJ11fVpGxc].wav"), ind)
shutil.copy(os.path.join(GERCEK, "Indirilenler", ".vaalzmusic", "kapaklar", "vBJ11fVpGxc.jpg"), kap)
ids.insert(0, "vBJ11fVpGxc")
random.seed(3)
plays = {i: random.randint(1, 30) for i in ids[:14]}
stats = {"plays": plays, "recent": ids[3:15], "lists": {}, "liked": ids[1:6], "ag": {"2026-10": 3_400_000}}
json.dump(stats, open(os.path.join(TEST, "veri", "stats.json"), "w"))
pl = {
 "l_a": {"id": "l_a", "title": "Gece Sürüşü", "url": None, "local": True, "tracks": ids[2:9]},
 "l_b": {"id": "l_b", "title": "Çalışırken", "url": None, "local": True, "tracks": ids[9:15]},
 "PLx": {"id": "PLx", "title": "TÜRKÇE0", "url": "https://music.youtube.com/playlist?list=PLx", "local": False, "tracks": ids[:20]},
 "PLy": {"id": "PLy", "title": "Best Ost", "url": "https://music.youtube.com/playlist?list=PLy", "local": False, "tracks": ids[10:24]},
}
json.dump(pl, open(os.path.join(TEST, "veri", "playlists.json"), "w"))
json.dump({"port": 8799, "indirilenler": ind, "otomatik_oneri": False, "playlists": [], "format": "flac", "cookies_browser": "", "api_key": ""}, open(os.path.join(TEST, "veri", "config.json"), "w"))
json.dump({"zaman": int(time.time()), "liste": o[:12]}, open(os.path.join(TEST, "veri", "oneriler.json"), "w"))
os.makedirs(os.path.join(TEST, "veri", "onbellek"), exist_ok=True)
for x in o:
    s = os.path.join(GERCEK, "veri", "onbellek", x["id"] + ".jpg")
    if os.path.exists(s): shutil.copy(s, os.path.join(TEST, "veri", "onbellek"))
print("tamam", len(ids), "parca")
