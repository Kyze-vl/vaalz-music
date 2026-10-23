#!/usr/bin/env bash
# Vaalz Music - dependency installer for Linux / gerekli arac kurulum betigi
#
# Runs when you press "Install missing" in Settings > System status. Nothing else is downloaded or executed.
# Uygulamada Ayarlar > Sistem durumu > "Eksikleri kur" dugmesine basinca calisir. Baska hicbir sey indirilmez.
#
#   yt-dlp : official release file from GitHub (small Python zipapp, ~3 MB) -> ~/.local/bin/yt-dlp
#            https://github.com/yt-dlp/yt-dlp/releases/latest
#   deno   : official release zip from GitHub (~40 MB; yt-dlp needs it for YouTube's JavaScript checks) -> ~/.local/bin/deno
#            https://github.com/denoland/deno/releases/latest
#   ffmpeg : from your distribution's package manager (apt / dnf / pacman); a graphical password prompt (pkexec) appears
#
# No user data is read or sent anywhere. yt-dlp and deno go to your own ~/.local/bin (no root needed).
# Already installed tools are NOT touched, unless you press "Update yt-dlp" (--guncelle).
#
# Manual use / elle calistirma:
#   bash kurulum.sh --paketler yt-dlp,deno,ffmpeg
#   bash kurulum.sh --paketler yt-dlp --guncelle
#   bash kurulum.sh --paketler yt-dlp,deno,ffmpeg --dry-run     (only prints what it would do)

set -u

PAKETLER=""
GUNCELLE=0
KURU=0
while [ $# -gt 0 ]; do
  case "$1" in
    --paketler) PAKETLER="${2:-}"; shift 2 ;;
    --guncelle) GUNCELLE=1; shift ;;
    --dry-run)  KURU=1; shift ;;
    *) shift ;;
  esac
done

BIN="$HOME/.local/bin"
HATA=0
export PATH="$BIN:$HOME/.deno/bin:$PATH"

say()  { printf '%s\n' "$*"; }
run()  { say "+ $*"; if [ "$KURU" = 1 ]; then return 0; fi; "$@"; }

# download <url> <dest>
indir() {
  if command -v curl >/dev/null 2>&1; then
    run curl -fL --retry 2 --connect-timeout 20 -o "$2.tmp" "$1" && run mv -f "$2.tmp" "$2"
  elif command -v wget >/dev/null 2>&1; then
    run wget -q -O "$2.tmp" "$1" && run mv -f "$2.tmp" "$2"
  else
    say "ERROR: neither curl nor wget found. Install one of them (sudo apt install curl)."; return 1
  fi
}

mimari() {
  case "$(uname -m)" in
    x86_64|amd64) echo "x86_64" ;;
    aarch64|arm64) echo "aarch64" ;;
    *) echo "" ;;
  esac
}

kur_ytdlp() {
  if command -v yt-dlp >/dev/null 2>&1 && [ "$GUNCELLE" = 0 ]; then
    if yt-dlp --version >/dev/null 2>&1; then say "OK: yt-dlp already installed ($(yt-dlp --version 2>/dev/null))"; return 0; fi
    say "yt-dlp is installed but does not run; reinstalling the official release"
  fi
  if ! command -v python3 >/dev/null 2>&1; then say "ERROR: python3 is needed to run yt-dlp."; return 1; fi
  say "Installing yt-dlp -> $BIN/yt-dlp"
  run mkdir -p "$BIN" || return 1
  indir "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp" "$BIN/yt-dlp" || return 1
  run chmod +x "$BIN/yt-dlp" || return 1
  if [ "$KURU" = 0 ] && ! "$BIN/yt-dlp" --version >/dev/null 2>&1; then
    say "ERROR: yt-dlp was installed but cannot run with your Python ($(python3 -V 2>&1)). Current yt-dlp needs a newer Python;"
    say "       update Python (e.g. sudo apt install python3) or install yt-dlp from your package manager."
    return 1
  fi
  say "Done: yt-dlp"
}

kur_deno() {
  if command -v deno >/dev/null 2>&1; then say "OK: deno already installed"; return 0; fi
  local m; m="$(mimari)"
  if [ -z "$m" ]; then say "ERROR: unsupported CPU architecture for deno: $(uname -m)"; return 1; fi
  say "Installing deno -> $BIN/deno"
  run mkdir -p "$BIN" || return 1
  local zip="$BIN/deno-indirilen.zip"
  indir "https://github.com/denoland/deno/releases/latest/download/deno-${m}-unknown-linux-gnu.zip" "$zip" || return 1
  if [ "$KURU" = 0 ]; then
    python3 - "$zip" "$BIN" <<'PY' || return 1
import sys, zipfile, os
z, hedef = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(z) as f:
    f.extract("deno", hedef)
os.chmod(os.path.join(hedef, "deno"), 0o755)
os.remove(z)
PY
  else
    say "+ unzip deno from $zip into $BIN"
  fi
  say "Done: deno"
}

kur_ffmpeg() {
  if command -v ffmpeg >/dev/null 2>&1; then say "OK: ffmpeg already installed"; return 0; fi
  local komut=""
  if   command -v apt-get >/dev/null 2>&1; then komut="apt-get install -y ffmpeg"
  elif command -v dnf     >/dev/null 2>&1; then komut="dnf install -y ffmpeg-free"
  elif command -v pacman  >/dev/null 2>&1; then komut="pacman -S --noconfirm ffmpeg"
  elif command -v zypper  >/dev/null 2>&1; then komut="zypper --non-interactive install ffmpeg"
  fi
  if [ -z "$komut" ]; then say "ERROR: no supported package manager. Please install ffmpeg yourself."; return 1; fi
  say "Installing ffmpeg with your package manager: $komut"
  if [ "$(id -u)" = 0 ]; then
    run $komut || { say "ERROR: '$komut' failed."; return 1; }
  elif command -v pkexec >/dev/null 2>&1; then
    run pkexec $komut || { say "ERROR: '$komut' failed or was cancelled."; return 1; }
  else
    say "ERROR: cannot ask for a password here. Run in a terminal:  sudo $komut"; return 1
  fi
  if [ "$KURU" = 0 ] && ! { ffmpeg -version >/dev/null 2>&1 && ffprobe -version >/dev/null 2>&1; }; then say "ERROR: ffmpeg/ffprobe are still not usable after install."; return 1; fi
  say "Done: ffmpeg"
}

IFS=',' read -r -a LISTE <<< "$PAKETLER"
for ad in "${LISTE[@]}"; do
  case "$ad" in
    yt-dlp) kur_ytdlp || { say "ERROR: yt-dlp could not be installed"; HATA=1; } ;;
    deno)   kur_deno  || { say "ERROR: deno could not be installed"; HATA=1; } ;;
    ffmpeg) kur_ffmpeg || { say "ERROR: ffmpeg could not be installed"; HATA=1; } ;;
    "") ;;
    *) say "SKIPPED: '$ad' is not on the allowed list." ;;
  esac
done
exit $HATA
