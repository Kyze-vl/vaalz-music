# Android sürümünde kullanılan üçüncü taraf bileşenler

Bu dosya, Android APK'sına giren bileşenleri ve **yayımlanmış lisans bilgilerini** listeler. Hukuki değerlendirme değildir;
APK'yı dağıtan kişi lisans yükümlülüklerini (özellikle GPL-3.0) ayrıca değerlendirmelidir.

| Bileşen | Sürüm | Lisans (kaynak) | Not |
|---|---|---|---|
| `io.github.junkfood02.youtubedl-android:library`, `:common` | 0.18.1 | **GPL-3.0** (Maven POM'unda bildirilen) | yt-dlp ve Python çalışma zamanını Android'de çalıştırır |
| `io.github.junkfood02.youtubedl-android:ffmpeg` | 0.18.1 | **GPL-3.0** (Maven POM'unda bildirilen) | ffmpeg ve ffprobe ikilileri, `libqjs` (QuickJS); ffmpeg derleme bayrakları (LGPL/GPL) ayrıca doğrulanmadı |
| yt-dlp | uygulama ilk açılışta en güncel sürüme günceller | Unlicense | `updateYoutubeDL(STABLE)` |
| Chaquopy (Gradle eklentisi + Python 3.12 çalışma zamanı) | 17.1.0 | resmî sayfadan doğrulanmalı (chaquo.com) | Vaalz sunucusunu telefonda çalıştırır |
| Vaalz Music (bu depo) | 0.1.0 | MIT (kök `LICENSE`) | Kök MIT lisansı, yukarıdaki bileşenlerin lisansını değiştirmez |

## Açık noktalar
- APK, GPL-3.0 olarak bildirilen kütüphaneleri içerir. Birleşik dağıtımda hangi lisans koşullarının geçerli olduğu, lisans metinlerinin APK içinde ya da Release sayfasında yer alması ve **karşılık gelen kaynağın** (bu depo, kullanılan bağımlılık sürümleri ve derleme talimatı) sunulması dağıtıcının sorumluluğundadır.
- APK içindeki ikililerin tam derleme yapılandırması (`ffmpeg -buildconf`) incelenmedi.
- Bağımlılık sürümleri `android/app/build.gradle.kts` içinde sabittir; Release açıklamasına sürümler ve imza sertifikası parmak izi eklenmelidir.
