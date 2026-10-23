# -*- coding: utf-8 -*-
"""Vaalz Music'i VaalzMusic.exe olarak derler. Calistir: python yap.py  (kaynak klasorunden)"""
import math
import os
import shutil
import struct
import subprocess
import sys
import zlib

KAYNAK = os.path.dirname(os.path.abspath(__file__))
ANA = os.path.dirname(KAYNAK)
N = 256


def ikon_uret():
    V = [(62, 66), (104, 66), (128, 148), (152, 66), (194, 66), (148, 200), (108, 200)]

    def icinde(x, y, poly):
        c = False
        j = len(poly) - 1
        for i in range(len(poly)):
            xi, yi = poly[i]
            xj, yj = poly[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                c = not c
            j = i
        return c

    def yuvarlak_kare(x, y, r=60, s=N):
        dx, dy = max(r - x, 0, x - (s - 1 - r)), max(r - y, 0, y - (s - 1 - r))
        return dx * dx + dy * dy <= r * r

    ham = bytearray()
    for y in range(N):
        ham.append(0)
        for x in range(N):
            toplam = [0, 0, 0, 0]
            for sy in (0.17, 0.5, 0.83):
                for sx in (0.17, 0.5, 0.83):
                    px, py = x + sx, y + sy
                    if not yuvarlak_kare(px, py):
                        continue
                    t = (px + py) / (2 * N)
                    if icinde(px, py, V):
                        u = (py - 66) / 134            # V: ustten alta beyazdan soluk mora
                        renk = (int(255 - 62 * u), int(255 - 57 * u), 255)
                    else:                              # zemin: gece mavimor gradyani (sol ustten sag alta)
                        renk = (int(83 + (20 - 83) * t * 1.25), int(72 + (7 - 72) * t * 1.25), int(202 + (48 - 202) * t * 1.25))
                        renk = tuple(max(0, c) for c in renk)
                    toplam[0] += renk[0]; toplam[1] += renk[1]; toplam[2] += renk[2]; toplam[3] += 1
            a = toplam[3]
            ham += bytes((toplam[0] // a, toplam[1] // a, toplam[2] // a, round(a / 9 * 255)) if a else (0, 0, 0, 0))

    def chunk(tip, veri):
        c = struct.pack(">I", len(veri)) + tip + veri
        return c + struct.pack(">I", zlib.crc32(tip + veri) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", N, N, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(bytes(ham), 9)) + chunk(b"IEND", b"")
    os.makedirs(os.path.join(ANA, "web"), exist_ok=True)
    with open(os.path.join(ANA, "web", "icon.png"), "wb") as f:
        f.write(png)
    ico = struct.pack("<HHH", 0, 1, 1) + struct.pack("<BBBBHHII", 0, 0, 0, 0, 1, 32, len(png), 22) + png
    with open(os.path.join(KAYNAK, "icon.ico"), "wb") as f:
        f.write(ico)


def derle_unis():
    """unis.exe: kaldirma programi (tek dosya; kendini gecici klasore kopyalayip calisir)."""
    gecici = os.path.join(KAYNAK, "build-unis")
    subprocess.check_call([sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean", "--onefile", "--noconsole",
                           "--icon", os.path.join(KAYNAK, "icon.ico"), "--name", "unis",
                           "--distpath", os.path.join(gecici, "dist"), "--workpath", gecici, "--specpath", gecici,
                           os.path.join(KAYNAK, "unis.py")])
    hedef = os.path.join(ANA, "unis.exe")
    if os.path.isfile(hedef):
        os.remove(hedef)
    shutil.move(os.path.join(gecici, "dist", "unis.exe"), hedef)
    shutil.rmtree(gecici, ignore_errors=True)


def derle():
    """onedir: acilista gecici klasore acma yok (daha hizli, antivirus dostu, %TEMP%'te _MEI kalintisi birakmaz)."""
    gecici = os.path.join(KAYNAK, "build")
    dist = os.path.join(gecici, "dist")
    subprocess.check_call([sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean", "--onedir", "--noconsole",
                           "--contents-directory", "_vaalz", "--icon", os.path.join(KAYNAK, "icon.ico"), "--name", "VaalzMusic",
                           "--distpath", dist, "--workpath", gecici, "--specpath", gecici,
                           os.path.join(KAYNAK, "vaalzmusic.py")])
    kaynak = os.path.join(dist, "VaalzMusic")
    hedef_exe = os.path.join(ANA, "VaalzMusic.exe")
    if os.path.isfile(hedef_exe):
        try:                                   # calisiyorsa dosya kilitlidir: yarim silme yapmadan dur
            open(hedef_exe, "ab").close()
        except OSError:
            print("VaalzMusic.exe calisiyor; uygulamayi kapatip tekrar calistir. Yeni derleme su klasorde hazir:", kaynak)
            sys.exit(1)
    eski = os.path.join(ANA, "_vaalz")
    if os.path.isdir(eski):
        shutil.rmtree(eski)
    for ad in os.listdir(kaynak):
        hedef = os.path.join(ANA, ad)
        if os.path.isfile(hedef):
            os.remove(hedef)
        shutil.move(os.path.join(kaynak, ad), hedef)
    shutil.rmtree(gecici, ignore_errors=True)


if __name__ == "__main__":
    ikon_uret()
    derle_unis()
    derle()
    print("Tamam:", os.path.join(ANA, "VaalzMusic.exe"))
