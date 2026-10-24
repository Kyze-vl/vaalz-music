package com.vaalz.music

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.drawable.Icon
import android.media.MediaMetadata
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Build
import android.os.IBinder
import android.os.SystemClock
import java.net.URL

/** Bildirimdeki / kilit ekranindaki / kulaklik denetimleri. Calan ses WebView'da; burasi onu uzaktan yonetir. */
class MedyaServisi : Service() {
    data class Durum(
        val var_: Boolean = false, val caliyor: Boolean = false,
        val baslik: String = "", val sanatci: String = "", val album: String = "",
        val sure: Long = 0, val konum: Long = 0, val kapak: String = ""
    )

    companion object {
        const val KANAL = "vaalz_medya"
        const val BILDIRIM = 1
        var ornek: MedyaServisi? = null
        var komutGonder: ((String, Long) -> Unit)? = null
        var port = 8765
        private var son = Durum()

        fun guncelle(ctx: Context, d: Durum) {
            son = d
            val o = ornek
            if (o != null) { o.isle(d); return }
            if (d.var_) try { ctx.startForegroundService(Intent(ctx, MedyaServisi::class.java)) } catch (_: Exception) { }
        }

        fun durdur(ctx: Context) { ctx.stopService(Intent(ctx, MedyaServisi::class.java)) }
    }

    private lateinit var oturum: MediaSession
    private var kapakUrl = ""
    private var kapakBmp: Bitmap? = null
    private var onceki: Durum? = null
    private var onDe = false
    private var gosterilenBmp: Bitmap? = null

    override fun onBind(i: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        ornek = this
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(KANAL, "Müzik çalar", NotificationManager.IMPORTANCE_LOW).apply { setShowBadge(false) })
        oturum = MediaSession(this, "VaalzMusic").apply {
            setCallback(object : MediaSession.Callback() {
                override fun onPlay() = k("play")
                override fun onPause() = k("pause")
                override fun onSkipToNext() = k("next")
                override fun onSkipToPrevious() = k("prev")
                override fun onSeekTo(pos: Long) = k("seek", pos)
            })
            isActive = true
        }
        isle(son)
    }

    override fun onStartCommand(i: Intent?, flags: Int, id: Int): Int {
        when (i?.action) {
            "play" -> k("play"); "pause" -> k("pause"); "next" -> k("next"); "prev" -> k("prev")
        }
        if (!onDe) isle(son)
        return START_NOT_STICKY
    }

    private fun k(komut: String, v: Long = 0) { komutGonder?.invoke(komut, v) }

    fun isle(d: Durum) {
        val o = onceki
        val bilgiAyni = o != null && o.var_ == d.var_ && o.caliyor == d.caliyor && o.baslik == d.baslik &&
                o.sanatci == d.sanatci && o.sure == d.sure && o.kapak == d.kapak && gosterilenBmp === kapakBmp
        if (bilgiAyni && onDe) {      // yalnizca konum degisti: oturumu guncelle, bildirimi yenileme
            oturum.setPlaybackState(durumBuild(d))
            onceki = d
            return
        }
        onceki = d
        gosterilenBmp = kapakBmp
        if (d.kapak != kapakUrl) {
            kapakUrl = d.kapak; kapakBmp = null
            if (d.kapak.isNotEmpty()) Thread {
                val bmp = try { BitmapFactory.decodeStream(URL("http://127.0.0.1:$port${d.kapak}").openStream()) } catch (_: Exception) { null }
                if (bmp != null && kapakUrl == d.kapak) { kapakBmp = bmp; ornek?.let { it.isle(son) } }
            }.start()
        }
        oturum.setMetadata(
            MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, d.baslik)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, d.sanatci)
                .putString(MediaMetadata.METADATA_KEY_ALBUM, d.album)
                .putLong(MediaMetadata.METADATA_KEY_DURATION, d.sure)
                .putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, kapakBmp)
                .build()
        )
        oturum.setPlaybackState(durumBuild(d))
        val b = bildirim(d)
        if (!onDe) {
            try {
                if (Build.VERSION.SDK_INT >= 29) startForeground(BILDIRIM, b, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
                else startForeground(BILDIRIM, b)
                onDe = true
            } catch (_: Exception) { }
        } else {
            getSystemService(NotificationManager::class.java).notify(BILDIRIM, b)
        }
    }

    private fun durumBuild(d: Durum) = PlaybackState.Builder()
        .setActions(
            PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or PlaybackState.ACTION_PLAY_PAUSE or
                    PlaybackState.ACTION_SKIP_TO_NEXT or PlaybackState.ACTION_SKIP_TO_PREVIOUS or PlaybackState.ACTION_SEEK_TO
        )
        .setState(
            if (d.caliyor) PlaybackState.STATE_PLAYING else PlaybackState.STATE_PAUSED,
            d.konum, if (d.caliyor) 1f else 0f, SystemClock.elapsedRealtime()
        ).build()

    private fun eylem(ad: String, ikon: Int, baslik: String): Notification.Action {
        val pi = PendingIntent.getService(this, ad.hashCode(), Intent(this, MedyaServisi::class.java).setAction(ad), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        return Notification.Action.Builder(Icon.createWithResource(this, ikon), baslik, pi).build()
    }

    private fun bildirim(d: Durum): Notification {
        val ac = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return Notification.Builder(this, KANAL)
            .setSmallIcon(R.drawable.ic_muzik)
            .setContentTitle(d.baslik.ifEmpty { "Vaalz Music" })
            .setContentText(d.sanatci)
            .setLargeIcon(kapakBmp)
            .setContentIntent(ac)
            .setOnlyAlertOnce(true)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .addAction(eylem("prev", android.R.drawable.ic_media_previous, "Önceki"))
            .addAction(
                if (d.caliyor) eylem("pause", android.R.drawable.ic_media_pause, "Duraklat")
                else eylem("play", android.R.drawable.ic_media_play, "Çal")
            )
            .addAction(eylem("next", android.R.drawable.ic_media_next, "Sonraki"))
            .setStyle(Notification.MediaStyle().setMediaSession(oturum.sessionToken).setShowActionsInCompactView(0, 1, 2))
            .build()
    }

    override fun onDestroy() {
        ornek = null
        oturum.release()
        super.onDestroy()
    }
}

