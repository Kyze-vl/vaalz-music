# Vaalz Music - gerekli arac kurulum betigi / dependency installer
#
# Bu dosya, uygulamanin "Ayarlar > Sistem durumu" bolumundeki "Kur" dugmesine basildiginda calistirilir.
# This script runs when you press "Install" in Settings > System status. Nothing else is run or downloaded.
#
# Yaptigi tek sey: eksik araclari Windows'un resmi paket yoneticisi (winget) ile kurmak.
# Its only job: install missing tools through Windows' official package manager (winget).
#
#   yt-dlp  -> winget id: yt-dlp.yt-dlp    (https://github.com/yt-dlp/yt-dlp)
#   ffmpeg  -> winget id: Gyan.FFmpeg      (https://www.gyan.dev/ffmpeg/builds/)
#   deno    -> winget id: DenoLand.Deno    (https://deno.com)  [yt-dlp'nin YouTube JS dogrulamasi icin]
#
# Kullanici verisi okunmaz, hicbir yere gonderilmez. Kurulum yalnizca winget kaynaklarindan paket indirir.
# No user data is read or sent anywhere. Packages come only from winget's own sources.
#
# Elle de calistirabilirsin / you can also run it manually:
#   powershell -ExecutionPolicy Bypass -File kurulum.ps1 -Paketler yt-dlp,ffmpeg,deno
#   powershell -ExecutionPolicy Bypass -File kurulum.ps1 -Paketler yt-dlp -Guncelle      (yt-dlp'yi guncelle)

param(
    [Parameter(Mandatory = $true)][string[]]$Paketler,
    [switch]$Guncelle
)

$ErrorActionPreference = "Stop"

# "-File" ile cagrildiginda "yt-dlp,ffmpeg" tek bir metin olarak gelir; virgulden ayir.
$Paketler = @($Paketler | ForEach-Object { $_ -split "," } | Where-Object { $_ })

# Yalnizca bu liste: baska paket kurulamaz.
$izinli = @{
    "yt-dlp" = "yt-dlp.yt-dlp"
    "ffmpeg" = "Gyan.FFmpeg"
    "deno"   = "DenoLand.Deno"
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Output "HATA: winget bulunamadi. Microsoft Store'dan 'Uygulama Yukleyici' (App Installer) kur, sonra tekrar dene."
    exit 2
}

$hata = 0
foreach ($ad in $Paketler) {
    if (-not $izinli.ContainsKey($ad)) {
        Write-Output "ATLANDI: '$ad' izinli listede yok."
        continue
    }
    $id = $izinli[$ad]
    if ($Guncelle) {
        Write-Output "Guncelleniyor: $ad  (winget upgrade --id $id)"
        winget upgrade --id $id --exact --silent --accept-source-agreements --accept-package-agreements
    }
    else {
        Write-Output "Kuruluyor: $ad  (winget install --id $id)"
        winget install --id $id --exact --silent --no-upgrade --accept-source-agreements --accept-package-agreements
    }
    # 0 = basarili, -1978335189 = "guncelleme/yeni surum yok" (zararsiz)
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne -1978335189 -and $LASTEXITCODE -ne -1978335135) {
        Write-Output "HATA: $ad kurulamadi (kod $LASTEXITCODE)"
        $hata = 1
    }
    else {
        Write-Output "Tamam: $ad"
    }
}
exit $hata
