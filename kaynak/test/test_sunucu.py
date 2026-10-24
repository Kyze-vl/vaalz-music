# 2000 eszamanli istek (bozuk/kotu niyetli dahil) + bellek olcumu. Once sunucu_test.py calisiyor olmali.
import http.client, json, random, threading, time, subprocess, re, collections, sys
PORT = 8799
def bellek():
    out = subprocess.run(["powershell", "-NoProfile", "-Command", "(Get-NetTCPConnection -LocalPort 8799 -State Listen | Select -First 1).OwningProcess | ForEach-Object { (Get-Process -Id $_).WorkingSet64 }"], capture_output=True, text=True).stdout.strip()
    return int(out) // 1024 if out.isdigit() else -1
def istek(yontem, yol, govde=None, basl=None, ham=None):
    c = http.client.HTTPConnection("127.0.0.1", PORT, timeout=20)
    h = {"Host": f"127.0.0.1:{PORT}"}; h.update(basl or {})
    if govde is not None: ham = json.dumps(govde).encode(); h["Content-Type"] = "application/json"
    c.request(yontem, yol, body=ham, headers=h)
    r = c.getresponse(); d = r.read(); c.close(); return r.status, d
k = json.loads(istek("GET", "/api/kutuphane")[1])
ids = [i for i, t in k["tracks"].items() if t["var"]]
print("parca:", len(ids), "baslangic bellek KB:", bellek())
sonuc = collections.Counter(); hatalar = []
def is_(n):
    for _ in range(n):
        try:
            x = random.random(); id_ = random.choice(ids)
            if x < .15: s, _ = istek("GET", "/api/kutuphane")
            elif x < .25: s, _ = istek("GET", "/api/durum")
            elif x < .5:
                a = random.randint(0, 100000); s, d = istek("GET", f"/api/parca/{id_}", basl={"Range": f"bytes={a}-{a+65535}"}); assert s in (200, 206, 416), s
            elif x < .6: s, _ = istek("GET", f"/api/kapak/{id_}")
            elif x < .65: s, _ = istek("GET", f"/api/zirve/{id_}")
            elif x < .7: s, _ = istek("GET", f"/api/soz/{id_}")
            elif x < .75: s, _ = istek("POST", "/api/say", {"id": id_})
            elif x < .8: s, _ = istek("POST", "/api/begen", {"id": id_, "on": random.random() < .5})
            elif x < .84: s, _ = istek("POST", "/api/say", ham=b"{bozuk json")
            elif x < .87: s, _ = istek("GET", "/api/bilinmeyen")
            elif x < .9: s, _ = istek("GET", "/s/../veri/config.json")
            elif x < .92: s, _ = istek("GET", "/api/parca/../../veri/config.json")
            elif x < .94: s, _ = istek("GET", "/api/kutuphane", basl={"Host": "evil.example.com"})
            elif x < .96: s, _ = istek("POST", "/api/begen", {"id": id_, "on": True}, basl={"Origin": "http://evil.example.com"})
            elif x < .97: s, _ = istek("POST", "/api/say", ham=b"x" * 3_000_000)
            elif x < .985: s, _ = istek("GET", f"/api/parca/{id_}", basl={"Range": "bytes=abc-"})
            else: s, _ = istek("GET", f"/api/parca/{id_}", basl={"Range": "bytes=999999999-"})
            sonuc[s] += 1
        except Exception as e:
            sonuc["HATA"] += 1; hatalar.append(repr(e)[:90])
t0 = time.time(); th = [threading.Thread(target=is_, args=(250,)) for _ in range(8)]
[t.start() for t in th]; [t.join() for t in th]
print("2000 istek", round(time.time() - t0, 1), "sn;", dict(sonuc))
print("hatalar:", collections.Counter(hatalar).most_common(5))
print("son bellek KB:", bellek(), "| sunucu hala yasiyor:", istek("GET", "/api/ping")[0] == 200)
# guvenlik kontrolleri ayri
print("traversal /s/ ->", istek("GET", "/s/..%5cveri%5cconfig.json")[0], istek("GET", "/s/%2e%2e/veri/config.json")[0])
print("evil Host ->", istek("GET", "/api/ayarlar", basl={"Host": "evil.com"})[0])
print("evil Origin POST ->", istek("POST", "/api/ayarlar", {"api_key": "x"}, basl={"Origin": "http://evil.com"})[0])
