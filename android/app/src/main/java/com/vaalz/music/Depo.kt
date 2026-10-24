package com.vaalz.music

import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.provider.MediaStore
import java.io.File

/**
 * Paylasilan depolama (Music/Vaalz Music) ile MediaStore uzerinden calisir: "tum dosyalar" izni gerekmez.
 * Kendi olusturdugumuz dosyalara izinsiz erisiriz; uygulama silinip yeniden kurulunca eski dosyalari
 * "Muzik ve ses" okuma izniyle okuruz.
 */
object Depo {
    const val MUZIK = "Music/Vaalz Music/"
    private val YEDEK_KLASORLERI = listOf("Audiobooks/Vaalz Music/", "Podcasts/Vaalz Music/", "Music/Vaalz Music/")

    private val MIME = mapOf(
        "opus" to "audio/ogg", "ogg" to "audio/ogg", "m4a" to "audio/mp4", "mp3" to "audio/mpeg",
        "flac" to "audio/flac", "wav" to "audio/x-wav", "aac" to "audio/aac", "wma" to "audio/x-ms-wma"
    )

    private fun koleksiyon(): Uri = MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)

    /** Ayni ad+klasorde (bizim gorebildigimiz) kayit varsa Uri'si. */
    private fun bul(ctx: Context, klasor: String, ad: String): Uri? {
        ctx.contentResolver.query(
            koleksiyon(), arrayOf(MediaStore.MediaColumns._ID),
            "${MediaStore.MediaColumns.DISPLAY_NAME}=? AND ${MediaStore.MediaColumns.RELATIVE_PATH}=?", arrayOf(ad, klasor), null
        )?.use { if (it.moveToFirst()) return ContentUris.withAppendedId(koleksiyon(), it.getLong(0)) }
        return null
    }

    /**
     * Gecici klasordeki bitmis ses dosyasini Music/Vaalz Music'e tasir; son dosya adini dondurur (hata: null).
     * Ayni adli dosya zaten varsa yenisini yazmaz, mevcut adi dondurur.
     */
    @JvmStatic
    fun yayinla(ctx: Context, kaynakYol: String, ad: String): String? {
        val kaynak = File(kaynakYol)
        if (!kaynak.isFile) return null
        if (bul(ctx, MUZIK, ad) != null) { kaynak.delete(); return ad }
        val uzanti = ad.substringAfterLast('.', "").lowercase()
        val v = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, ad)
            put(MediaStore.MediaColumns.MIME_TYPE, MIME[uzanti] ?: "audio/mpeg")
            put(MediaStore.MediaColumns.RELATIVE_PATH, MUZIK)
            put(MediaStore.MediaColumns.IS_PENDING, 1)
        }
        val uri = ctx.contentResolver.insert(koleksiyon(), v) ?: return null
        try {
            ctx.contentResolver.openOutputStream(uri)!!.use { o -> kaynak.inputStream().use { it.copyTo(o) } }
            ctx.contentResolver.update(uri, ContentValues().apply { put(MediaStore.MediaColumns.IS_PENDING, 0) }, null, null)
        } catch (e: Exception) {
            ctx.contentResolver.delete(uri, null, null)
            return null
        }
        kaynak.delete()
        var son = ad      // sistem ad cakismasinda "ad (1)" yapabilir
        ctx.contentResolver.query(uri, arrayOf(MediaStore.MediaColumns.DISPLAY_NAME), null, null, null)?.use { if (it.moveToFirst()) son = it.getString(0) }
        return son
    }

    /**
     * Kutuphane yedegi (sessiz mp3 tasiyici). Bu kurulumun kendi yedek dosyasi varsa yerinde gunceller, yoksa yenisini olusturur.
     * Eski kurulumlardan kalan yedekler okunabilir ama degistirilemez; en yenisi geri yuklemede secilir.
     */
    @JvmStatic
    fun yedekYaz(ctx: Context, veri: ByteArray, yeniAd: String): Boolean {
        for (klasor in YEDEK_KLASORLERI) {
            // Once YENI dosya bekleyen (IS_PENDING) olarak yazilir; dogrulaninca gorunur olur ve ancak o zaman eski yedekler silinir:
            // yazma sirasinda sure olurse ya da depolama dolarsa onceki saglam yedek korunur.
            val eskiler = ArrayList<Uri>()
            ctx.contentResolver.query(
                koleksiyon(), arrayOf(MediaStore.MediaColumns._ID),
                "${MediaStore.MediaColumns.DISPLAY_NAME} LIKE ? AND ${MediaStore.MediaColumns.RELATIVE_PATH}=? AND ${MediaStore.MediaColumns.OWNER_PACKAGE_NAME}=?",
                arrayOf("vaalz-yedek-%", klasor, ctx.packageName), null
            )?.use { while (it.moveToNext()) eskiler.add(ContentUris.withAppendedId(koleksiyon(), it.getLong(0))) }
            var yeni: Uri? = null
            try {
                val v = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, yeniAd)
                    put(MediaStore.MediaColumns.MIME_TYPE, "audio/mpeg")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, klasor)
                    put(MediaStore.MediaColumns.IS_PENDING, 1)
                }
                yeni = ctx.contentResolver.insert(koleksiyon(), v) ?: continue
                ctx.contentResolver.openOutputStream(yeni)!!.use { it.write(veri) }
                ctx.contentResolver.update(yeni, ContentValues().apply { put(MediaStore.MediaColumns.IS_PENDING, 0) }, null, null)
                for (e in eskiler) { try { ctx.contentResolver.delete(e, null, null) } catch (_: Exception) { } }
                return true
            } catch (e: Exception) {
                android.util.Log.w("Vaalz", "Yedek yazilamadi ($klasor)", e)
                yeni?.let { try { ctx.contentResolver.delete(it, null, null) } catch (_: Exception) { } }   // yarim yeni dosyayi temizle
            }
        }
        return false
    }
}
