# Vaalz Music

**Hafif, hızlı, yerel müzik çalar. İstersen YouTube Music, Spotify ve Deezer playlistlerini içe aktarır.**
*A light, fast, local music player. Optionally imports your YouTube Music, Spotify and Deezer playlists.*

[Türkçe](#türkçe) · [English](#english)

---

## Türkçe

Vaalz Music, sevdiğin parçaları kendi bilgisayarına indirip sade bir arayüzde dinlemeni sağlayan, Windows için yazılmış hafif bir müzik çalardır. **Üyelik, hesap ya da giriş gerektirmez.** Parçaları bir arama kutusundan bulabilir ya da bir playlist linki (YouTube Music, Spotify, Deezer) yapıştırarak toplu indirebilirsin; indirdiklerin kendi arşivinde (FLAC) durur ve **çalma ile "İndirilenler" hiçbir zaman internet kullanmaz.** Kendi müzik dosyalarını da klasöre atıp aynı arayüzde çalabilirsin.

### Özellikler
- Koyu/sade arayüz, 11 tema (gradyan temalar dahil) ve albüm kapağından otomatik vurgu rengi
- Karışık çalma, döngü, kuyruk (sürükle-bırak), uyku zamanlayıcısı
- **%200'e kadar ses**, 10 bantlı ekolayzır, **ses eşitleme** (LUFS) ve **crossfade**
- Senkronlu sözler (isteğe bağlı, [lrclib.net](https://lrclib.net))
- Playlist oluşturma, beğenme, sürükle-bırak sıralama
- Ana Sayfa'da "dinlediklerine benzer" önerileri, çalan şarkıya özel "Benzer" sekmesi
- **Keşfet:** arama kutusundan YouTube'da ara (hesap ya da API anahtarı gerekmez), indir ve doğrudan yeni bir playlist'e ekle
- **Spotify ve Deezer linkleri:** playlist ya da albüm linkini yapıştır, parça adları okunur; indirirken her parça YouTube'da aranıp en uygun sonuç indirilir (adı ve sanatçısı Spotify/Deezer'daki gibi kalır)
- Playlist linkinden toplu indirme (4 eşzamanlı), "veri tasarrufu" modu, indirmeyi istediğin an durdurma
- Müzikler uygulamanın kendi klasöründeki `Indirilenler\` içinde (alt klasörler dahil) durur; "Klasörü aç" / "Klasörde göster" ile açılır. Dosyayı oradan elle silersen kütüphaneden düşer, playlistler kalır.

### Kurulum
1. [Releases](../../releases) sayfasından son sürümün `.zip` dosyasını indir, bir klasöre çıkar.
2. `VaalzMusic.exe`'yi çalıştır.
3. Müzik çalmak için başka hiçbir şey gerekmez. **İndirme özelliği** için gerekli araçlar ilk açılışta kontrol edilir; eksik olan varsa uygulama bunu gösterir ve **sen "Eksikleri kur"a basınca** kurar (aşağıya bak).

> Windows 10/11 ve Microsoft Edge gerekir (arayüz Edge'in uygulama penceresinde açılır).

#### Linux
1. `VaalzMusic-…-linux.tar.gz` dosyasını indirip çıkar: `tar xzf VaalzMusic-*-linux.tar.gz && cd VaalzMusic-linux`
2. Çalıştır: `./vaalzmusic.sh` (Python 3.8+ gerekir; ek paket yok). İstersen uygulama menüsüne ekle: `./vaalzmusic.sh --shortcut`
3. Arayüz Chrome / Chromium / Edge / Brave varsa uygulama penceresinde, yoksa varsayılan tarayıcında (ör. Firefox) bir sekmede açılır.
4. İndirme için araçlar Ayarlar > Sistem durumu'ndan kurulur: **yt-dlp** ve **deno** GitHub'daki resmi sürümlerden `~/.local/bin` içine (root gerekmez), **ffmpeg** paket yöneticinle (`apt`/`dnf`/`pacman`, şifre penceresi açılır). Betik açık: [`kurulum.sh`](kurulum.sh). Elle: `bash kurulum.sh --paketler yt-dlp,deno,ffmpeg`
5. Kaldırma: `./unis.sh` (müziği saklama seçeneği sorar; `--yes`, `--delete-music`, `--keep-data` da var).

### Şeffaflık: ne indirilir, ne gönderilir?

Bu depoda **yt-dlp, ffmpeg ya da başka bir üçüncü taraf program yoktur.** İndirme özelliği için bu araçlar gerekir ve senin bilgisayarına **Windows'un resmi paket yöneticisi `winget`** ile kurulur (winget yoksa aynı araçlar resmi sürüm sayfalarından indirilir, aşağıya bak):

| Araç | winget kimliği | Ne için |
|---|---|---|
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | `yt-dlp.yt-dlp` | YouTube Music'ten indirme |
| [ffmpeg](https://www.gyan.dev/ffmpeg/builds/) | `Gyan.FFmpeg` | FLAC'a dönüştürme, kapak ve ses analizi |
| [Deno](https://deno.com) | `DenoLand.Deno` | yt-dlp'nin YouTube JavaScript doğrulaması |

- Kurulumu yapan betik tamamen açıktır: [`kurulum.ps1`](kurulum.ps1) (kısa ve okunabilir bir betik). Yalnızca yukarıdaki üç paketi `winget install` ile kurar. **winget yoksa** (örneğin Windows Server) aynı üç aracı yalnızca şu resmi adreslerden uygulamanın yanındaki `araclar\` klasörüne indirir: yt-dlp ve deno için `github.com/yt-dlp/yt-dlp` ile `github.com/denoland/deno` sürüm sayfaları, ffmpeg için `gyan.dev/ffmpeg/builds`. Bu yolda indirmeler winget'in yaptığı gibi sağlama toplamıyla doğrulanmaz. Betik başka hiçbir şey indirmez ve çalıştırmaz.
- Betik **yalnızca sen düğmeye bastığında** çalışır. İstersen kendin de kurabilirsin: `winget install --id yt-dlp.yt-dlp` · `winget install --id Gyan.FFmpeg` · `winget install --id DenoLand.Deno`
- Hiçbir kişisel veri toplanmaz, hiçbir yere gönderilmez. Telemetri, hesap, reklam yok. Sunucu yalnızca `127.0.0.1`'de (bu bilgisayarda) dinler.
- İnternet **yalnızca** şu durumlarda kullanılır: playlist senkronu, Spotify/Deezer liste okuma (Spotify'ın herkese açık gömme sayfası, Deezer'ın açık API'si; giriş ya da anahtar gerekmez), indirme, Ana Sayfa önerileri (sayfa açıkken, 24 saatte bir), "Benzer" sekmesi (parça başına bir kez), uzak kapaklar, YouTube araması (arama kutusu, her arama ~0,5 MB) ve (isteğe bağlı) söz arama. Ayarlar'daki sayaç tahmini kullanımı gösterir.
- **Tarayıcı çerezleri varsayılan olarak kapalıdır.** Premium ses kalitesi için isteğe bağlı olarak Ayarlar'dan açılabilir; bu durumda yt-dlp, seçtiğin tarayıcıdaki YouTube oturumunu *yerelde* okur ve yalnızca YouTube'a gönderir.

### Kaldırma
Klasördeki **`unis.exe`**'yi çalıştır (İngilizce kaldırma sihirbazı). Vaalz Music kurulum gerektirmeyen taşınabilir bir klasördür; sistemde kayıt defteri girdisi ya da gizli dosya bırakmaz. `unis.exe` yalnızca uygulamanın kendi oluşturduğu dosyaları ve bu klasörü gösteren masaüstü/Başlat/görev çubuğu kısayollarını siler; tanımadığı hiçbir dosyaya dokunmaz.
- **Keep my music** (varsayılan işaretli): `Indirilenler` klasörü ve içindeki müzikler silinmez.
- **Also keep my playlists, likes and settings**: `veri` klasörü kalır; yeniden kurarsan kaldığın yerden devam edersin.
- Sessiz kullanım: `unis.exe --yes` (müzik kalır), `--delete-music`, `--keep-data`.

### Kaynaktan çalıştırma / derleme
```powershell
python kaynak\vaalzmusic.py          # geliştirme (Python 3.11+, ek paket yok)
python kaynak\yap.py                 # VaalzMusic.exe üretir (PyInstaller gerekir)
```
Geliştirme ortam değişkenleri: `VAALZ_BASE` (veri kökü), `VAALZ_WEB` (arayüz klasörü), `VAALZ_TEST=1` (pencere ve bekçi yok).

### Sorumluluk reddi
Vaalz Music yalnızca **hakkın olan içerik / kişisel kullanım** içindir. YouTube'un Hizmet Şartları ve bulunduğun ülkenin telif yasalarına uymak **kullanıcının sorumluluğundadır**. Bu depo müzik, DRM kırma aracı ya da YouTube markasını barındırmaz; indirme özelliği, kullanıcının kendi kurduğu ayrı bir açık kaynak araca (yt-dlp) dayanır. Yazılım "olduğu gibi" sunulur.

### Bilinen sınırlar
- Windows 10/11 ve Linux (masaüstü); macOS ve mobil yok. Arayüz Türkçe.
- Spotify: yalnızca herkese açık playlist/albümler ve ilk ~100 parça okunur. Deezer: en fazla 500 parça. Apple Music, Tidal vb. desteklenmez.
- Spotify/Deezer parçalarında YouTube'daki eşleşme otomatiktir (süreye bakılır); nadiren yanlış sürüm gelebilir.
- PyInstaller ile derlenen `.exe` dosyaları bazı antivirüslerde **yanlış alarm** verebilir; kaynak kodu bu depoda, derlemeyi kendin de yapabilirsin.
- YouTube değişirse yt-dlp'nin güncellenmesi gerekebilir: Ayarlar > Sistem durumu > "yt-dlp'yi güncelle".

### Lisans
[MIT](LICENSE)

---

## English

Vaalz Music is a light Windows music player that lets you download the tracks you like and play them in a simple interface. **No membership, account or login is required.** Find tracks with the search box, or paste a playlist link (YouTube Music, Spotify, Deezer) to download in bulk; what you download stays in your own archive (FLAC), and **playback and the "Downloads" library never use the internet.** You can also drop your own music files into the folder and play them in the same interface.

### Features
- Clean dark UI, 11 themes (including gradient themes), automatic accent colour from album art
- Shuffle, repeat, drag-and-drop queue, sleep timer
- Volume up to **200%**, 10-band equaliser, **loudness normalisation** (LUFS) and **crossfade**
- Synced lyrics (optional, via [lrclib.net](https://lrclib.net))
- Playlists, likes, drag-and-drop ordering
- "Similar to what you listen to" on the home page, plus a per-track "Similar" tab
- **Discover:** search YouTube from the search box (no account or API key needed), download and add straight to a new playlist
- **Spotify and Deezer links:** paste a playlist or album link and the track names are read; at download time each track is searched on YouTube and the best match is downloaded (name and artist stay as on Spotify/Deezer)
- Bulk download from a playlist link (4 in parallel), "data saver" mode, stop downloads at any time
- Music lives in `Indirilenler\` inside the app's own folder (subfolders included); open it with "Open folder" / "Show in folder". Delete a file there by hand and it disappears from the library while playlists stay.

### Install
1. Download the latest `.zip` from [Releases](../../releases) and extract it.
2. Run `VaalzMusic.exe`.
3. Nothing else is needed to play music. For the **download feature**, required tools are checked on first launch; if any are missing the app tells you and installs them **when you press "Install missing"**.

> Requires Windows 10/11 and Microsoft Edge (the UI opens in an Edge app window).

#### Linux
1. Download and extract `VaalzMusic-…-linux.tar.gz`: `tar xzf VaalzMusic-*-linux.tar.gz && cd VaalzMusic-linux`
2. Run `./vaalzmusic.sh` (needs Python 3.8+, no extra packages). To add it to your applications menu: `./vaalzmusic.sh --shortcut`
3. The UI opens in an app window if Chrome / Chromium / Edge / Brave is installed, otherwise in a tab of your default browser (e.g. Firefox).
4. For downloading, tools are installed from Settings > System status: **yt-dlp** and **deno** from the official GitHub releases into `~/.local/bin` (no root), **ffmpeg** through your package manager (`apt`/`dnf`/`pacman`, a password prompt appears). The script is open: [`kurulum.sh`](kurulum.sh). Manually: `bash kurulum.sh --paketler yt-dlp,deno,ffmpeg`
5. Uninstall: `./unis.sh` (asks whether to keep your music; `--yes`, `--delete-music`, `--keep-data` also work).

### Transparency: what is installed, what is sent?

This repository contains **no yt-dlp, ffmpeg or any other third-party program.** The download feature needs them, and they are installed on your PC through **Windows' official package manager, `winget`**:

| Tool | winget id | Purpose |
|---|---|---|
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | `yt-dlp.yt-dlp` | Downloading from YouTube Music |
| [ffmpeg](https://www.gyan.dev/ffmpeg/builds/) | `Gyan.FFmpeg` | FLAC conversion, cover art and audio analysis |
| [Deno](https://deno.com) | `DenoLand.Deno` | JavaScript challenge solving for yt-dlp |

- The installer script is fully open: [`kurulum.ps1`](kurulum.ps1) (a short, readable script). It only runs `winget install` for the three packages above. **Without winget** (e.g. Windows Server) it downloads the same three tools only from these official addresses into an `araclar\` folder next to the app: the `github.com/yt-dlp/yt-dlp` and `github.com/denoland/deno` release pages for yt-dlp and deno, and `gyan.dev/ffmpeg/builds` for ffmpeg. On this path the downloads are not checksum-verified the way winget does. The script downloads and executes nothing else.
- It runs **only when you click the button**. You can also install them yourself: `winget install --id yt-dlp.yt-dlp` · `winget install --id Gyan.FFmpeg` · `winget install --id DenoLand.Deno`
- No personal data is collected or sent anywhere. No telemetry, accounts or ads. The server listens only on `127.0.0.1`.
- The internet is used **only** for: playlist sync, reading Spotify/Deezer lists (Spotify's public embed page and Deezer's open API; no login or key needed), downloads, home-page suggestions (while the page is open, once per 24 h), the "Similar" tab (once per track), remote covers, and YouTube search (each search ~0.5 MB) and (optional) lyrics. A counter in Settings shows the estimated usage.
- **Browser cookies are off by default.** You may enable them in Settings for Premium audio quality; yt-dlp then reads your YouTube session from the chosen browser *locally* and sends it only to YouTube.

### Uninstall
Run **`unis.exe`** in the app folder (an English uninstall wizard). Vaalz Music is a portable folder; it leaves no registry entries or hidden files. `unis.exe` removes only the files the app created and the desktop/Start menu/taskbar shortcuts pointing to this folder; it never touches files it does not recognise.
- **Keep my music** (checked by default): the `Indirilenler` folder and your music are not deleted.
- **Also keep my playlists, likes and settings**: the `veri` folder stays, so a reinstall picks up where you left off.
- Silent use: `unis.exe --yes` (keeps music), `--delete-music`, `--keep-data`.

### Run / build from source
```powershell
python kaynak\vaalzmusic.py          # development (Python 3.11+, no extra packages)
python kaynak\yap.py                 # builds VaalzMusic.exe (needs PyInstaller)
```
Dev environment variables: `VAALZ_BASE` (data root), `VAALZ_WEB` (UI folder), `VAALZ_TEST=1` (no window, no watchdog).

### Disclaimer
Vaalz Music is intended only for **content you have the right to use / personal use**. Complying with YouTube's Terms of Service and your country's copyright law is **your responsibility**. This repository contains no music, no DRM-circumvention tool and no YouTube branding; the download feature relies on a separate open-source tool (yt-dlp) that you install yourself. The software is provided "as is".

### Known limitations
- Windows 10/11 and Linux (desktop); no macOS or mobile. The UI is Turkish only.
- Spotify: only public playlists/albums and the first ~100 tracks are read. Deezer: up to 500 tracks. Apple Music, Tidal etc. are not supported.
- For Spotify/Deezer tracks the YouTube match is automatic (duration is compared); occasionally a wrong version may be picked.
- Executables built with PyInstaller may trigger **false positives** in some antivirus products; the full source is here and you can build it yourself.
- If YouTube changes, yt-dlp may need an update: Settings > System status > "Update yt-dlp".

### License
[MIT](LICENSE)
