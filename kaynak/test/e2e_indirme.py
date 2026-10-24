# Uctan uca indirme hizi testi (GERCEK internet kullanir!):  python e2e_indirme.py flac 8 4   (mod: flac|tasarruf, parca sayisi, es_zamanli)
import http.client, json, time, sys
def g(y, m="GET", b=None):
    c = http.client.HTTPConnection("127.0.0.1", 8799, timeout=60); c.request(m, y, body=json.dumps(b) if b is not None else None, headers={"Content-Type": "application/json"}); r = c.getresponse(); return json.loads(r.read() or b"{}")
import os
gercek = json.load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "veri", "playlists.json"), encoding="utf-8"))
aday = [v for p in gercek.values() for v in p["tracks"]]
src = {}
for v in aday: src.setdefault(v, 1)
aday = list(src)
mevcut = set(g("/api/kutuphane")["tracks"])
yeni = [i for i in aday if i not in mevcut]
mod = sys.argv[1]; n = int(sys.argv[2]); es = int(sys.argv[3])
ids = yeni[:n]; print("indirilecek:", len(ids), "mod:", mod, "es_zamanli:", es)
g("/api/ayarlar", "POST", {"cookies_browser": "firefox", "veri_tasarrufu": mod == "tasarruf", "es_zamanli": es})
t = time.time()
for i in ids: g("/api/indir", "POST", {"id": i, "title": i, "artist": ""})
while True:
    d = g("/api/durum")
    if not d["mesgul"]: break
    time.sleep(0.5)
sure = time.time() - t
k = g("/api/kutuphane")["tracks"]; tamam = [i for i in ids if k.get(i, {}).get("var")]
print(f"{len(tamam)}/{len(ids)} parca, {sure:.1f} sn  ({sure/max(1,len(ids)):.1f} sn/parca), indirilen ~{d['mb']:.1f} MB, hatalar: {d['hatalar'][:2]}")
