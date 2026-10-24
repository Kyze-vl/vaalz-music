package com.vaalz.music

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.drawable.Icon
import android.os.Build
import android.os.IBinder
import java.net.HttpURLConnection
import java.net.URL

/** Indirme / liste tarama surerken uygulamanin arka planda kisilmamasi icin on plan servisi + ilerleme bildirimi. */
class IndirmeServisi : Service() {
    private data class Durum(val faz: String = "", val parca: String = "", val toplam: Int = 0, val biten: Int = 0, val yuzde: Int = 0)

    companion object {
        const val KANAL = "vaalz_indirme"
        const val BILDIRIM = 2
        const val BILDIRIM_BITTI = 3
        private var ornek: IndirmeServisi? = null
        private var son = Durum()
        private var enFazlaBiten = 0

        /** Python tarafindan ~1,5 sn'de bir cagrilir. */
        @JvmStatic
        fun guncelle(ctx: Context, mesgul: Boolean, faz: String, parca: String, toplam: Int, biten: Int, yuzde: Int) {
            val o = ornek
            if (mesgul) {
                son = Durum(faz, parca, toplam, biten, yuzde)
                enFazlaBiten = maxOf(enFazlaBiten, biten)
                if (o == null) {
                    try { ctx.startForegroundService(Intent(ctx, IndirmeServisi::class.java)) } catch (_: Exception) { }
                } else {
                    o.goster()
                }
            } else if (o != null) {
                o.bitir()
            }
        }
    }

    override fun onBind(i: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        ornek = this
        getSystemService(NotificationManager::class.java)
            .createNotificationChannel(NotificationChannel(KANAL, "İndirmeler", NotificationManager.IMPORTANCE_LOW).apply { setShowBadge(false) })
    }

    override fun onStartCommand(i: Intent?, flags: Int, id: Int): Int {
        if (i?.action == "durdur") {
            Thread {
                try {
                    (URL("http://127.0.0.1:${MedyaServisi.port}/api/indirme-durdur").openConnection() as HttpURLConnection).apply {
                        requestMethod = "POST"
                        doOutput = true
                        setRequestProperty("Content-Type", "application/json")
                        outputStream.use { it.write("{}".toByteArray()) }
                        responseCode
                        disconnect()
                    }
                } catch (_: Exception) { }
            }.start()
            return START_NOT_STICKY
        }
        val b = bildirim()
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(BILDIRIM, b, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
            else startForeground(BILDIRIM, b)
        } catch (_: Exception) { stopSelf() }
        return START_NOT_STICKY
    }

    fun goster() {
        getSystemService(NotificationManager::class.java).notify(BILDIRIM, bildirim())
    }

    fun bitir() {
        val n = enFazlaBiten
        enFazlaBiten = 0
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        if (n > 0) {
            getSystemService(NotificationManager::class.java).notify(
                BILDIRIM_BITTI,
                Notification.Builder(this, KANAL).setSmallIcon(R.drawable.ic_muzik)
                    .setContentTitle("İndirme bitti").setContentText("$n parça işlendi")
                    .setContentIntent(uygulamayiAc()).setAutoCancel(true).build()
            )
        }
    }

    private fun uygulamayiAc() = PendingIntent.getActivity(
        this, 0, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

    private fun bildirim(): Notification {
        val durdur = PendingIntent.getService(
            this, 7, Intent(this, IndirmeServisi::class.java).setAction("durdur"),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val d = son
        return Notification.Builder(this, KANAL)
            .setSmallIcon(R.drawable.ic_muzik)
            .setContentTitle(d.faz.ifEmpty { "İndiriliyor" })
            .setContentText(d.parca)
            .setSubText(if (d.toplam > 0) "${d.biten}/${d.toplam}" else null)
            .setProgress(100, d.yuzde, d.toplam == 0)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(uygulamayiAc())
            .addAction(Notification.Action.Builder(Icon.createWithResource(this, android.R.drawable.ic_menu_close_clear_cancel), "Durdur", durdur).build())
            .build()
    }

    override fun onDestroy() {
        ornek = null
        super.onDestroy()
    }
}
