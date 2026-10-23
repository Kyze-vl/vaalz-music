#!/usr/bin/env bash
# Vaalz Music launcher (Linux)
#   ./vaalzmusic.sh              start the app
#   ./vaalzmusic.sh --shortcut   add "Vaalz Music" to your applications menu (and remove it later with unis.sh)
cd "$(dirname "$(readlink -f "$0")")" || exit 1
DIR="$(pwd)"

if ! command -v python3 >/dev/null 2>&1 || ! python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)'; then
  echo "Vaalz Music needs Python 3.8 or newer (sudo apt install python3)." >&2
  exit 1
fi

if [ "${1:-}" = "--shortcut" ] || [ "${1:-}" = "--kisayol" ]; then
  APPS="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
  mkdir -p "$APPS"
  cat > "$APPS/vaalz-music.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Vaalz Music
Comment=Light, fast, local music player
Exec="$DIR/vaalzmusic.sh"
Icon=$DIR/web/icon.png
Terminal=false
Categories=AudioVideo;Audio;Player;
StartupWMClass=VaalzMusic
EOF
  chmod +x "$APPS/vaalz-music.desktop"
  echo "Added to your applications menu: $APPS/vaalz-music.desktop"
  exit 0
fi

exec python3 kaynak/vaalzmusic.py "$@"
