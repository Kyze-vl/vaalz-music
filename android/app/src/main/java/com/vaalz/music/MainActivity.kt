package com.vaalz.music

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.WindowInsets
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebViewClient
import android.webkit.WebView
import android.widget.FrameLayout
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import com.yausername.ffmpeg.FFmpeg
import com.yausername.youtubedl_android.YoutubeDL
import org.json.JSONObject
import java.io.File
import java.net.InetSocketAddress
import java.net.Socket

class MainActivity : Activity() {
    private lateinit var web: WebView
    private var sunucuBasladi = false
    private lateinit var kok: FrameLayout

    /** WebView'u kurar; render sureci cokerse (Chromium hatasi) uygulama kapanmasin, sayfa yeniden acilsin */
    private fun webKur() {
        web = WebView(this)
        web.webViewClient = object : WebViewClient() {
            // Istemci yoksa Android adresleri (sayfa yenilemesi dahil) varsayilan tarayiciya atar; her sey uygulamanin icinde kalsin
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = false
            override fun onRenderProcessGone(view: WebView, detail: android.webkit.RenderProcessGoneDetail): Boolean {
                android.util.Log.w("Vaalz", "WebView render sureci coktu (cokme=${detail.didCrash()}); yeniden aciliyor")
                runOnUiThread {
                    try { kok.removeView(view); view.destroy() } catch (_: Exception) { }
                    webKur()
                    if (MedyaServisi.port > 0) web.loadUrl("http://127.0.0.1:${MedyaServisi.port}/")
                }
                return true
            }
        }
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.mediaPlaybackRequiresUserGesture = false
        web.setBackgroundColor(Color.parseColor("#0A0A0B"))
        web.addJavascriptInterface(Kopru(), "VaalzAndroid")
        kok.addView(web, FrameLayout.LayoutParams(-1, -1))
    }

    /** Web arayuzunden gelen "su an su parca caliyor" bilgisi -> bildirim / kilit ekrani */
    inner class Kopru {
        @JavascriptInterface
        fun durum(json: String) {
            try {
                val j = JSONObject(json)
                MedyaServisi.guncelle(
                    applicationContext,
                    MedyaServisi.Durum(
                        j.optBoolean("var"), j.optBoolean("caliyor"), j.optString("baslik"), j.optString("sanatci"),
                        j.optString("album"), j.optLong("sure"), j.optLong("konum"), j.optString("kapak")
                    )
                )
            } catch (_: Exception) { }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        kok = FrameLayout(this)
        kok.setBackgroundColor(Color.parseColor("#0A0A0B"))
        webKur()
        // Kenardan kenara cizimde durum/gezinme cubuklarinin altinda kalmasin
        kok.setOnApplyWindowInsetsListener { v, insets ->
            if (Build.VERSION.SDK_INT >= 30) {
                val b = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
                v.setPadding(b.left, b.top, b.right, b.bottom)
            } else {
                @Suppress("DEPRECATION")
                v.setPadding(insets.systemWindowInsetLeft, insets.systemWindowInsetTop, insets.systemWindowInsetRight, insets.systemWindowInsetBottom)
            }
            insets
        }
        setContentView(kok)
        kok.requestApplyInsets()
        web.loadData("<body style='background:#111;color:#eee;font-family:sans-serif'><h2>Vaalz Music baslatiliyor...</h2>", "text/html", "utf-8")

        // Bildirimdeki dugmeler -> web calar
        MedyaServisi.komutGonder = { k, v ->
            runOnUiThread { web.evaluateJavascript("window.__vaalzKomut&&__vaalzKomut('$k',$v)", null) }
        }
        izinAkisi()
    }

    // ---- depolama izni: yalnizca "Muzik ve ses" okuma (tum dosyalar izni YOK) ----
    private fun okumaIzni() =
        if (Build.VERSION.SDK_INT >= 33) Manifest.permission.READ_MEDIA_AUDIO else Manifest.permission.READ_EXTERNAL_STORAGE

    private fun izinAkisi() {
        if (checkSelfPermission(okumaIzni()) == PackageManager.PERMISSION_GRANTED) { sunucuyuBaslat(); return }
        AlertDialog.Builder(this)
            .setTitle("Müziklerin ve listelerin kalsın")
            .setMessage("Vaalz Music indirdiğin müzikleri telefonun Music/Vaalz Music klasörüne kaydeder. Uygulamayı silip yeniden yüklesen bile müziklerini ve listelerini bulabilmesi için “Müzik ve ses dosyaları” iznini iste. Başka hiçbir dosyana erişmez.")
            .setCancelable(false)
            .setPositiveButton("Devam") { _, _ ->
                val izinler = if (Build.VERSION.SDK_INT >= 33) arrayOf(okumaIzni(), Manifest.permission.POST_NOTIFICATIONS) else arrayOf(okumaIzni())
                requestPermissions(izinler, 3)
            }
            .setNegativeButton("Şimdilik değil") { _, _ -> sunucuyuBaslat() }
            .show()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 3) sunucuyuBaslat()
    }

    private fun sunucuyuBaslat() {
        if (sunucuBasladi) return
        sunucuBasladi = true
        Thread {
            val webDir = File(filesDir, "web")
            webDir.deleteRecursively()
            kopyala("web", webDir)
            // yt-dlp (kendi python'uyla) ve ffmpeg: ilk acilista diske acilir (~150 MB), sonra bu adim aninda biter
            try {
                YoutubeDL.getInstance().init(application)
                FFmpeg.getInstance().init(application)
            } catch (e: Exception) {
                android.util.Log.e("Vaalz", "Arac kurulumu basarisiz", e)
            }
            // yt-dlp, YouTube degistikce eskir: acilista arka planda sonuncuya guncellenir (kucuk indirme, yeni surum yoksa hicbir sey indirmez)
            Thread {
                try {
                    val d = YoutubeDL.getInstance().updateYoutubeDL(application, YoutubeDL.UpdateChannel.STABLE)
                    android.util.Log.i("Vaalz", "yt-dlp guncelleme: $d")
                } catch (e: Exception) {
                    android.util.Log.w("Vaalz", "yt-dlp guncellenemedi", e)
                }
            }.start()
            if (!Python.isStarted()) Python.start(AndroidPlatform(this))
            Python.getInstance().getModule("android_main").callAttr(
                "baslat", filesDir.absolutePath, webDir.absolutePath, applicationInfo.nativeLibraryDir,
                File(noBackupFilesDir, "youtubedl-android").absolutePath, cacheDir.absolutePath,
                File(filesDir, "gecici").absolutePath, File(filesDir, "vm").absolutePath
            )
            val port = bekle()
            MedyaServisi.port = port
            runOnUiThread {
                if (port > 0) web.loadUrl("http://127.0.0.1:$port/")
                else web.loadData("Sunucu acilamadi", "text/plain", "utf-8")
            }
        }.start()
    }

    private fun kopyala(asset: String, hedef: File) {
        val liste = assets.list(asset) ?: emptyArray()
        if (liste.isEmpty()) {
            hedef.parentFile?.mkdirs()
            assets.open(asset).use { i -> hedef.outputStream().use { o -> i.copyTo(o) } }
        } else {
            hedef.mkdirs()
            for (ad in liste) kopyala("$asset/$ad", File(hedef, ad))
        }
    }

    private fun bekle(): Int {
        repeat(60) {
            val port = Python.getInstance().getModule("android_main").callAttr("port").toInt()
            try {
                Socket().use { it.connect(InetSocketAddress("127.0.0.1", port), 300) }
                return port
            } catch (_: Exception) {
                Thread.sleep(250)
            }
        }
        return -1
    }

    // Geri tusu: once tam ekran calari kapat, sonra sayfa gecmisinde geri git; en sonda uygulamayi
    // arka plana at (kapatirsak muzik de durur).
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        web.evaluateJavascript("(function(){try{if(window.__vaalzGeri&&__vaalzGeri())return 1;var o=document.getElementById('odak');if(o&&o.classList.contains('acik')){H.odakKapat();return 1}}catch(e){}return 0})()") { r ->
            if (r == "1") return@evaluateJavascript
            if (web.canGoBack()) web.goBack() else moveTaskToBack(true)
        }
    }

    override fun onDestroy() {
        MedyaServisi.komutGonder = null
        MedyaServisi.durdur(applicationContext)
        super.onDestroy()
    }
}
