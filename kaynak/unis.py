# -*- coding: utf-8 -*-
"""Vaalz Music uninstaller (unis.exe).

Vaalz Music is a portable folder (no installer, no registry entries). This program removes exactly the things the app
created inside its own folder, plus desktop/taskbar shortcuts that point to it. It never deletes files it does not know.

  unis.exe                      -> graphical wizard
  unis.exe --yes                -> no window; keeps music, deletes the rest   (add --delete-music / --keep-data)
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time

NOWIN = 0x08000000 if os.name == "nt" else 0
DETACHED = 0x00000008 if os.name == "nt" else 0

# Things the app creates in its own folder (nothing else is ever deleted)
APP_ITEMS = ["VaalzMusic.exe", "_vaalz", "web", "kurulum.ps1", "README.md", "LICENSE", "logs"]
DATA_DIR = "veri"                    # playlists, likes, settings, caches, the app's own Edge profile
MUSIC_DIR = "Indirilenler"           # default music folder
DATA_KEEP_FILES = ("config.json", "tracks.json", "playlists.json", "stats.json", "oneriler.json", "benzer.json", "coz.json")


def arg_deger(ad, varsayilan=None):
    if ad in sys.argv:
        i = sys.argv.index(ad)
        if i + 1 < len(sys.argv):
            return sys.argv[i + 1]
    return varsayilan


def klasor_boyutu(yol):
    n, b = 0, 0
    for kok, _, dosyalar in os.walk(yol):
        for d in dosyalar:
            n += 1
            try:
                b += os.path.getsize(os.path.join(kok, d))
            except OSError:
                pass
    return n, b


def mb(b):
    return f"{b / 1048576:.0f} MB" if b >= 1048576 else f"{b / 1024:.0f} KB"


def music_path(install):
    """Music folder from the app's settings, or the default one inside the app folder."""
    try:
        with open(os.path.join(install, DATA_DIR, "config.json"), "r", encoding="utf-8") as f:
            p = (json.load(f).get("indirilenler") or "").strip()
        if p:
            return os.path.normpath(p if os.path.isabs(p) else os.path.join(install, p))
    except Exception:
        pass
    return os.path.join(install, MUSIC_DIR)


def inside(yol, ana):
    try:
        return os.path.commonpath([os.path.normcase(os.path.abspath(yol)), os.path.normcase(os.path.abspath(ana))]) == \
               os.path.normcase(os.path.abspath(ana))
    except ValueError:
        return False


def rm(yol, log):
    """Delete a file or folder; retries because Windows may still hold a lock for a moment."""
    def zorla(fn, p, _):
        try:
            os.chmod(p, 0o700)
            fn(p)
        except OSError:
            pass
    for deneme in range(4):
        try:
            if os.path.isdir(yol) and not os.path.islink(yol):
                shutil.rmtree(yol, onerror=zorla)
            elif os.path.lexists(yol):
                os.remove(yol)
            if not os.path.lexists(yol):
                return True
        except OSError:
            pass
        time.sleep(0.7)
    log(f"  could not remove: {yol}")
    return False


def ps(script, install):
    """Run a short PowerShell snippet; the folder is passed through an environment variable (never spliced into the script)."""
    env = dict(os.environ, VZ_DIR=install)
    try:
        r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
                           capture_output=True, text=True, encoding="utf-8", errors="replace", env=env,
                           creationflags=NOWIN, timeout=60)
        return r.stdout.strip()
    except Exception:
        return ""


def close_app(install, log):
    log("Closing Vaalz Music if it is running...")
    ps("Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -and $_.ExecutablePath -like ($env:VZ_DIR + '\\*') -and "
       "$_.Name -eq 'VaalzMusic.exe' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }", install)
    ps("Get-CimInstance Win32_Process -Filter \"Name='msedge.exe'\" | "
       "Where-Object { $_.CommandLine -like ('*' + $env:VZ_DIR + '*pencere-profili*') } | "
       "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }", install)
    time.sleep(1.5)


def remove_shortcuts(install, log):
    log("Looking for desktop, Start menu and taskbar shortcuts...")
    out = ps(r"""
$w = New-Object -ComObject WScript.Shell
$yerler = @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('CommonDesktopDirectory'),
            [Environment]::GetFolderPath('Programs'), [Environment]::GetFolderPath('CommonPrograms'),
            (Join-Path $env:APPDATA 'Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar'))
foreach ($y in $yerler) {
  if (-not $y -or -not (Test-Path $y)) { continue }
  Get-ChildItem -LiteralPath $y -Filter *.lnk -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    try { $t = $w.CreateShortcut($_.FullName).TargetPath } catch { $t = '' }
    if ($t -and $t.StartsWith($env:VZ_DIR, [StringComparison]::OrdinalIgnoreCase)) {
      Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue; $_.Name
    }
  }
}""", install)
    for ad in [x for x in out.splitlines() if x.strip()]:
        log(f"Removed shortcut: {ad}")


def uninstall(install, keep_music, keep_data, log):
    """Returns a short summary text."""
    close_app(install, log)
    muzik = music_path(install)
    muzik_icinde = inside(muzik, install)
    notlar = []

    # 1) application files
    for ad in APP_ITEMS:
        yol = os.path.join(install, ad)
        if os.path.lexists(yol):
            log(f"Removing {ad}")
            rm(yol, log)

    # 2) data (playlists, settings, caches, Edge profile)
    veri = os.path.join(install, DATA_DIR)
    if os.path.isdir(veri):
        if keep_data:
            profil = os.path.join(veri, "pencere-profili")
            if os.path.isdir(profil):
                log("Removing the app window's browser profile (settings are kept)")
                rm(profil, log)
            notlar.append(f'Playlists, likes and settings were kept in "{DATA_DIR}".')
        else:
            log("Removing playlists, likes, settings and caches")
            rm(veri, log)

    # 3) music
    if os.path.isdir(muzik):
        n, b = klasor_boyutu(muzik)
        if not muzik_icinde:
            log(f"Your music folder is outside the app folder and was not touched: {muzik}")
            notlar.append(f"Your music ({n} files, {mb(b)}) is in {muzik} and was left untouched.")
        elif keep_music:
            log(f"Keeping your music: {n} files, {mb(b)}")
            notlar.append(f'Your music ({n} files, {mb(b)}) was kept in "{os.path.basename(muzik)}".')
        else:
            log(f"Deleting your music: {n} files, {mb(b)}")
            rm(muzik, log)

    # 4) shortcuts
    remove_shortcuts(install, log)

    # 5) the (empty) folder; unis.exe removes itself and the folder after it exits
    return notlar


def final_cleanup(install, self_exe):
    """After this process exits: delete the temp copy of unis.exe, unis.exe itself and the app folder if it is empty.
    Done by a small batch file (it waits until this process has ended, then removes itself too)."""
    bat = os.path.join(tempfile.gettempdir(), "vaalz-unis-clean.bat")
    satirlar = [
        "@echo off",
        "ping -n 4 127.0.0.1 >nul",
        f'del /f /q "{self_exe}" 2>nul',
        f'rmdir "{os.path.dirname(self_exe)}" 2>nul',
        f'del /f /q "{os.path.join(install, "unis.exe")}" 2>nul',
        f'rmdir "{install}" 2>nul',
        '(goto) 2>nul & del /f /q "%~f0"',
    ]
    with open(bat, "w", encoding="mbcs", errors="replace") as f:
        f.write("\r\n".join(satirlar) + "\r\n")
    subprocess.Popen(["cmd", "/c", bat], creationflags=NOWIN | DETACHED, close_fds=True)


def relaunch_from_temp():
    """unis.exe lives in the folder it deletes, so it first runs from a temporary copy."""
    if "--from-temp" in sys.argv:
        return False
    if not getattr(sys, "frozen", False):
        return False
    install = os.path.dirname(os.path.abspath(sys.executable))
    tmp = os.path.join(tempfile.mkdtemp(prefix="vaalz-unis-"), "unis-run.exe")
    shutil.copy2(sys.executable, tmp)
    subprocess.Popen([tmp, "--from-temp", "--dir", install] + [a for a in sys.argv[1:]], creationflags=DETACHED, close_fds=True)
    return True


def install_dir():
    d = arg_deger("--dir")
    if d:
        return os.path.abspath(d)
    if getattr(sys, "frozen", False):
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def looks_like_app(install):
    return any(os.path.exists(os.path.join(install, x)) for x in ("VaalzMusic.exe", "_vaalz", "web", DATA_DIR))


# ------------------------------------------------------------------ GUI

def gui(install):
    import tkinter as tk
    from tkinter import messagebox, ttk

    kok = tk.Tk()
    kok.title("Vaalz Music - Uninstall")
    kok.resizable(False, False)
    genislik, yukseklik = 500, 470
    kok.geometry(f"{genislik}x{yukseklik}+{(kok.winfo_screenwidth() - genislik) // 2}+{(kok.winfo_screenheight() - yukseklik) // 3}")
    BG, FG, SOLUK, VURGU = "#101012", "#ececea", "#8b8b93", "#8f8cf0"
    kok.configure(bg=BG)
    stil = ttk.Style()
    stil.theme_use("clam")
    stil.configure("TCheckbutton", background=BG, foreground=FG, font=("Segoe UI", 10))
    stil.map("TCheckbutton", background=[("active", BG)])

    tk.Label(kok, text="Uninstall Vaalz Music", bg=BG, fg=FG, font=("Segoe UI Semibold", 15)).pack(anchor="w", padx=24, pady=(22, 4))
    tk.Label(kok, text="This removes Vaalz Music from your computer. Nothing outside its own folder is touched.\n"
                       "Folder: " + install, bg=BG, fg=SOLUK, font=("Segoe UI", 9), justify="left", wraplength=450).pack(anchor="w", padx=24)

    muzik = music_path(install)
    n, b = klasor_boyutu(muzik) if os.path.isdir(muzik) else (0, 0)
    keep_music = tk.BooleanVar(value=True)
    keep_data = tk.BooleanVar(value=False)
    kutu = tk.Frame(kok, bg=BG)
    kutu.pack(fill="x", padx=24, pady=(16, 6))
    ttk.Checkbutton(kutu, text=f"Keep my music  ({n} files, {mb(b)})", variable=keep_music).pack(anchor="w")
    tk.Label(kutu, text='Your downloaded songs stay in the "Indirilenler" folder.' if inside(muzik, install)
             else "Your music folder is outside the app folder, so it is never touched.",
             bg=BG, fg=SOLUK, font=("Segoe UI", 9)).pack(anchor="w", padx=24, pady=(0, 8))
    ttk.Checkbutton(kutu, text="Also keep my playlists, likes and settings", variable=keep_data).pack(anchor="w")
    tk.Label(kutu, text='They stay in the "veri" folder, so a reinstall picks up where you left off.',
             bg=BG, fg=SOLUK, font=("Segoe UI", 9)).pack(anchor="w", padx=24)

    gunluk = tk.Text(kok, height=7, bg="#17171a", fg=SOLUK, relief="flat", font=("Consolas", 9), state="disabled", wrap="word")
    gunluk.pack(fill="x", padx=24, pady=(10, 10))

    def log(m):
        def yaz():
            gunluk.configure(state="normal")
            gunluk.insert("end", m + "\n")
            gunluk.see("end")
            gunluk.configure(state="disabled")
        kok.after(0, yaz)

    dugmeler = tk.Frame(kok, bg=BG)
    dugmeler.pack(fill="x", padx=24, pady=(0, 18))

    def btn(metin, komut, vurgulu=False):
        return tk.Button(dugmeler, text=metin, command=komut, font=("Segoe UI", 10), relief="flat", cursor="hand2", padx=18, pady=6,
                         bg=VURGU if vurgulu else "#26262b", fg="#101012" if vurgulu else FG,
                         activebackground="#a8a6f5" if vurgulu else "#33333a", activeforeground="#101012" if vurgulu else FG)

    durum = {"bitti": False}

    def bitir(notlar):
        for w in dugmeler.winfo_children():
            w.destroy()
        log("")
        log("Done. Vaalz Music has been removed.")
        for x in notlar:
            log(x)
        btn("Close", kok.destroy, True).pack(side="right")
        durum["bitti"] = True

    def baslat():
        if not keep_music.get() and inside(music_path(install), install) and n:
            if not messagebox.askyesno("Delete your music?", f"This will permanently delete {n} songs ({mb(b)}).\n\nContinue?",
                                       icon="warning", default="no"):
                return
        for w in dugmeler.winfo_children():
            w.configure(state="disabled")

        def is_():
            try:
                notlar = uninstall(install, keep_music.get(), keep_data.get(), log)
            except Exception as e:
                notlar = [f"Something went wrong: {e}"]
            kok.after(0, lambda: bitir(notlar))
        threading.Thread(target=is_, daemon=True).start()

    btn("Cancel", kok.destroy).pack(side="right", padx=(10, 0))
    btn("Uninstall", baslat, True).pack(side="right")
    kok.mainloop()
    return durum["bitti"]


def main():
    if relaunch_from_temp():
        return
    install = install_dir()
    self_exe = os.path.abspath(sys.executable)
    if not looks_like_app(install):
        print("This folder does not look like a Vaalz Music folder:", install)
        return
    sessiz = "--yes" in sys.argv
    if sessiz:
        uninstall(install, "--delete-music" not in sys.argv, "--keep-data" in sys.argv, lambda m: print(m, flush=True))
        bitti = True
    else:
        bitti = gui(install)
    if bitti and getattr(sys, "frozen", False) and "--from-temp" in sys.argv:
        final_cleanup(install, self_exe)


if __name__ == "__main__":
    main()
