import hashlib
import os
import sys
import zipfile

R = r"C:\Users\kerem\Desktop\Vaalz Music"
D = os.path.join(R, "kaynak", "build", "dist", "VaalzMusic")
OUT = r"C:\Users\kerem\Desktop\Vaalz Music Surum"
ZIP = os.path.join(OUT, "VaalzMusic-v0.1.0-windows.zip")
KOK = "Vaalz Music"

os.makedirs(OUT, exist_ok=True)
if os.path.exists(ZIP):
    os.remove(ZIP)

# (kaynak, zip icindeki yol)
ogeler = [
    (os.path.join(D if os.path.isdir(D) else R, "VaalzMusic.exe"), "VaalzMusic.exe"),
    (os.path.join(D if os.path.isdir(D) else R, "_vaalz"), "_vaalz"),
    (os.path.join(R, "web"), "web"),
    (os.path.join(R, "kurulum.ps1"), "kurulum.ps1"),
    (os.path.join(R, "unis.exe"), "unis.exe"),
    (os.path.join(R, "README.md"), "README.md"),
    (os.path.join(R, "LICENSE"), "LICENSE"),
]
sayi = 0
with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for kaynak, hedef in ogeler:
        if os.path.isdir(kaynak):
            for kok, klasorler, dosyalar in os.walk(kaynak):
                klasorler[:] = [d for d in klasorler if d != "__pycache__"]
                for ad in dosyalar:
                    tam = os.path.join(kok, ad)
                    rel = os.path.relpath(tam, kaynak).replace("\\", "/")
                    z.write(tam, f"{KOK}/{hedef}/{rel}")
                    sayi += 1
        else:
            z.write(kaynak, f"{KOK}/{hedef}")
            sayi += 1
h = hashlib.sha256(open(ZIP, "rb").read()).hexdigest()
print(f"dosya: {sayi} | boyut: {os.path.getsize(ZIP) / 1048576:.1f} MB\nsha256: {h}")
with zipfile.ZipFile(ZIP) as z:
    adlar = z.namelist()
    ust = sorted({a.split('/')[1] for a in adlar if a.count('/') >= 1 and a.split('/')[1]})
    print("ust duzey:", ", ".join(ust))
    print("yasakli girdi:", [a for a in adlar if any(f"/{x}/" in a or a.endswith(f"/{x}") for x in ("veri", "logs", "Indirilenler", "kaynak", ".vaalzmusic"))])
open(os.path.join(OUT, "SHA256.txt"), "w").write(f"{h}  VaalzMusic-v0.1.0-windows.zip\n")
