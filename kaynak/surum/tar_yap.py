import hashlib
import io
import os
import tarfile

R = r"C:\Users\kerem\Desktop\Vaalz Music"
OUT = r"C:\Users\kerem\Desktop\Vaalz Music Surum"
ADI = "VaalzMusic-v0.1.0-linux.tar.gz"
KOK = "VaalzMusic-linux"
os.makedirs(OUT, exist_ok=True)
yol = os.path.join(OUT, ADI)

# (kaynak, paket ici yol, izin)
tekler = [
    ("kaynak/vaalzmusic.py", "kaynak/vaalzmusic.py", 0o644),
    ("kurulum.sh", "kurulum.sh", 0o755),
    ("vaalzmusic.sh", "vaalzmusic.sh", 0o755),
    ("unis.sh", "unis.sh", 0o755),
    ("README.md", "README.md", 0o644),
    ("LICENSE", "LICENSE", 0o644),
]


def temiz(ti):
    ti.uid = ti.gid = 0
    ti.uname = ti.gname = "root"
    return ti


sayi = 0
with tarfile.open(yol, "w:gz", compresslevel=9) as t:
    for kaynak, hedef, izin in tekler:
        veri = open(os.path.join(R, kaynak), "rb").read()
        if hedef.endswith((".sh", ".py")):
            veri = veri.replace(b"\r\n", b"\n")                   # Linux'ta betiklerde CRLF olmasin
        ti = tarfile.TarInfo(f"{KOK}/{hedef}")
        ti.size = len(veri)
        ti.mode = izin
        ti.mtime = int(os.path.getmtime(os.path.join(R, kaynak)))
        t.addfile(temiz(ti), io.BytesIO(veri))
        sayi += 1
    web = os.path.join(R, "web")
    for kok, klasorler, dosyalar in os.walk(web):
        klasorler[:] = [d for d in klasorler if d != "__pycache__"]
        for ad in dosyalar:
            tam = os.path.join(kok, ad)
            rel = os.path.relpath(tam, R).replace("\\", "/")
            veri = open(tam, "rb").read()
            if ad.endswith((".html", ".js", ".css")):
                veri = veri.replace(b"\r\n", b"\n")
            ti = tarfile.TarInfo(f"{KOK}/{rel}")
            ti.size = len(veri)
            ti.mode = 0o644
            ti.mtime = int(os.path.getmtime(tam))
            t.addfile(temiz(ti), io.BytesIO(veri))
            sayi += 1

h = hashlib.sha256(open(yol, "rb").read()).hexdigest()
print(f"dosya: {sayi} | boyut: {os.path.getsize(yol) / 1048576:.2f} MB\nsha256: {h}")
with tarfile.open(yol) as t:
    adlar = t.getnames()
    print("girdiler:", ", ".join(sorted({a.split('/')[1] for a in adlar if '/' in a})))
    print("yasakli:", [a for a in adlar if any(f"/{x}" in a for x in ("veri", "logs", "Indirilenler", "test", ".vaalzmusic"))])
with open(os.path.join(OUT, "SHA256.txt"), "a") as f:
    f.write(f"{h}  {ADI}\n")
