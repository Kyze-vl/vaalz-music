#!/usr/bin/env bash
# Vaalz Music uninstaller (Linux)
#
# Vaalz Music is a portable folder. This removes exactly what the app created inside its own folder, plus its menu
# shortcut. It never deletes files it does not know. Tools installed by kurulum.sh (yt-dlp, deno in ~/.local/bin and ffmpeg
# from your package manager) are shared with other programs and are NOT removed.
#
#   ./unis.sh                    interactive
#   ./unis.sh --yes              no questions: keep music, delete the rest   (add --delete-music and/or --keep-data)

cd "$(dirname "$(readlink -f "$0")")" || exit 1
DIR="$(pwd)"

YES=0; DELETE_MUSIC=0; KEEP_DATA=0
for a in "$@"; do
  case "$a" in
    --yes) YES=1 ;;
    --delete-music) DELETE_MUSIC=1 ;;
    --keep-data) KEEP_DATA=1 ;;
  esac
done

if [ ! -f "$DIR/kaynak/vaalzmusic.py" ] && [ ! -d "$DIR/web" ]; then
  echo "This folder does not look like a Vaalz Music folder: $DIR" >&2
  exit 1
fi

# music folder: from settings, otherwise ./Indirilenler
MUSIC="$DIR/Indirilenler"
if [ -f "$DIR/veri/config.json" ] && command -v python3 >/dev/null 2>&1; then
  P="$(python3 - "$DIR" <<'PY'
import json, os, sys
d = sys.argv[1]
try:
    p = (json.load(open(os.path.join(d, "veri", "config.json"), encoding="utf-8")).get("indirilenler") or "").strip()
    print(os.path.normpath(p if os.path.isabs(p) else os.path.join(d, p)) if p else "")
except Exception:
    print("")
PY
)"
  [ -n "$P" ] && MUSIC="$P"
fi
case "$MUSIC" in "$DIR"/*) INSIDE=1 ;; *) INSIDE=0 ;; esac

COUNT=0
[ -d "$MUSIC" ] && COUNT="$(find "$MUSIC" -type f 2>/dev/null | wc -l)"

if [ "$YES" = 0 ]; then
  echo "Uninstall Vaalz Music"
  echo "Folder: $DIR"
  echo
  if [ "$INSIDE" = 1 ]; then
    read -r -p "Keep my music ($COUNT files in \"$(basename "$MUSIC")\")? [Y/n] " r
    case "$r" in n|N|no|NO) DELETE_MUSIC=1 ;; *) DELETE_MUSIC=0 ;; esac
  else
    echo "Your music folder is outside the app folder, so it is never touched: $MUSIC"
  fi
  read -r -p "Also keep my playlists, likes and settings (\"veri\" folder)? [y/N] " r
  case "$r" in y|Y|yes|YES) KEEP_DATA=1 ;; *) KEEP_DATA=0 ;; esac
  if [ "$DELETE_MUSIC" = 1 ] && [ "$INSIDE" = 1 ] && [ "$COUNT" -gt 0 ]; then
    read -r -p "This permanently deletes $COUNT music files. Type 'delete' to confirm: " r
    [ "$r" = "delete" ] || { echo "Cancelled."; exit 1; }
  fi
fi

echo "Closing Vaalz Music if it is running..."
pkill -f "$DIR/kaynak/vaalzmusic.py" 2>/dev/null
pkill -f -- "--user-data-dir=$DIR/veri/pencere-profili" 2>/dev/null
sleep 1

for x in kaynak web kurulum.sh kurulum.ps1 vaalzmusic.sh README.md LICENSE logs; do
  [ -e "$DIR/$x" ] && { echo "Removing $x"; rm -rf "${DIR:?}/$x"; }
done

if [ -d "$DIR/veri" ]; then
  if [ "$KEEP_DATA" = 1 ]; then
    echo "Removing the app window's browser profile (settings are kept)"
    rm -rf "$DIR/veri/pencere-profili"
  else
    echo "Removing playlists, likes, settings and caches"
    rm -rf "${DIR:?}/veri"
  fi
fi

if [ -d "$MUSIC" ]; then
  if [ "$INSIDE" = 0 ]; then
    echo "Your music folder is outside the app folder and was not touched: $MUSIC"
  elif [ "$DELETE_MUSIC" = 1 ]; then
    echo "Deleting your music: $COUNT files"
    rm -rf "$MUSIC"
  else
    echo "Keeping your music: $COUNT files in $MUSIC"
  fi
fi

APPS="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
if [ -f "$APPS/vaalz-music.desktop" ] && grep -q "$DIR" "$APPS/vaalz-music.desktop" 2>/dev/null; then
  echo "Removing menu shortcut"
  rm -f "$APPS/vaalz-music.desktop"
fi

echo
echo "Done. Vaalz Music has been removed."
# remove this script, then the folder if it is empty
SELF="$DIR/unis.sh"
rm -f "$SELF"
rmdir "$DIR" 2>/dev/null
exit 0
