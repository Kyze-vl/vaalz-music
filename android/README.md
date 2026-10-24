# Vaalz Music — Android

Masaüstü sürümle aynı Python sunucusunu (`kaynak/vaalzmusic.py`) ve aynı web arayüzünü (`web/`) telefonun içinde çalıştırır.
Sunucu [Chaquopy](https://chaquo.com/chaquopy/) ile uygulamanın içinde başlar, arayüz bir WebView'da `127.0.0.1` üzerinden açılır.
İndirme için yt-dlp ve ffmpeg uygulamayla birlikte gelir ([youtubedl-android](https://github.com/junkfood02/youtubedl-android)); ayrıca bir şey kurman gerekmez.

## Kurulum (APK)
1. GitHub **Releases** sayfasından `Vaalz-Music-<sürüm>-android.apk` dosyasını indir.
2. Dosyaya dokun; Android "bilinmeyen kaynaklardan yükleme" izni ister, ver.
3. İlk açılışta "Müzik ve ses dosyaları" iznini iste (yalnızca yeniden kurulumda müziklerini ve listelerini bulmak için; başka dosyana erişmez).

Gereksinim: Android 10 (API 29) veya üstü, 64-bit ARM (`arm64-v8a`) telefon.

## Özellikler
- Çalma, kuyruk, sözler, ekolayzır, ses eşitleme; ekran kapalıyken çalma, kilit ekranı ve bildirim denetimleri.
- Playlist linkinden (YouTube Music, Spotify, Deezer) içe aktarma, arama ve indirme.
- Müzikler `Music/Vaalz Music` klasörüne kaydedilir. Listeler ve beğeniler küçük bir yedek dosyasıyla (`Audiobooks/Vaalz Music`) korunur; uygulamayı silip yeniden yüklesen geri gelir.
- Telefona özel arayüz: yüzen alt gezinme, "şimdi çalıyor" kartı, tam ekran çalar, düz liste ayarlar. Tema telefonun açık/koyu moduna göre otomatik.

## Kendin derlemek
Gerekenler: JDK 17, Android SDK (platform 35, build-tools 35.0.0), Gradle (proje `gradlew` getirir).

```
cd android
./gradlew assembleDebug          # hata ayıklama APK'sı
./gradlew assembleRelease        # imzalı APK (aşağıya bak)
```

`web/` ve `kaynak/vaalzmusic.py` her derlemede uygulamaya kopyalanır; Android'e özel kopya yoktur.
Android'e özgü ayarlar `web/android.js`, `web/mobil.css` ve `android/` altındadır.

### Release imzası
Anahtar ve parolalar depoda **yoktur**. `~/.vaalz-keys/keystore.properties` (ya da `VAALZ_KEYSTORE_PROPS` ortam değişkeninin gösterdiği dosya) şu anahtarları içermelidir:

```
storeFile=C:/yol/vaalz-release.jks
storePassword=...
keyAlias=vaalz
keyPassword=...
```
Dosya yoksa `assembleRelease` imzasız APK üretir. Güncellemelerin eski sürümün üstüne kurulabilmesi için her sürümde **aynı anahtar** kullanılmalıdır.

## Gizlilik ve güvenlik notları
- **Yerel sunucu:** Uygulama, telefonun içinde yalnızca `127.0.0.1` üzerinde bir HTTP sunucusu çalıştırır. Her açılışta rastgele bir **oturum sırrı** üretilir; sunucu bu sırrı taşımayan isteklere (örneğin telefondaki başka bir uygulamadan gelenlere) yanıt vermez. WebView yalnızca bu sunucuyu açar; dışarı giden bağlantılar tarayıcıda açılır.
- **Kütüphane yedeği:** Listeler, beğeniler ve dinleme sayıları `Audiobooks/Vaalz Music` klasöründeki küçük bir ses dosyasına (`vaalz-yedek-*.mp3`) şifresiz olarak yazılır; bu klasörü okuyabilen başka uygulamalar içeriği görebilir. Bu dosyayı istemiyorsan silebilirsin (yeniden kurulumda listeler geri gelmez). Uygulama verisi Android'in sistem yedeğine alınmaz (`allowBackup=false`).
- **Otomatik güncelleme:** Uygulama her açılışta yt-dlp'nin yeni sürümü olup olmadığını GitHub'a sorar; varsa küçük bir indirme yapar (YouTube değiştikçe eski sürüm çalışmaz hâle gelir).
- Üçüncü taraf bileşenler ve lisansları: [THIRD-PARTY.md](THIRD-PARTY.md).

## Bilinen sınırlar
- Yalnızca `arm64-v8a` (çoğu güncel telefon). 16 KB sayfa boyutlu cihazlar denenmedi.
- Başka bir kurulumdan kalan müzik dosyası uygulamadan silinemez (Android'in dosya sahipliği kuralı).
- Kapak resimleri yeniden kurulumda yedeğe girmez; yeniden indirilir.
- Google Play için hazırlanmadı; APK doğrudan dağıtılır.
