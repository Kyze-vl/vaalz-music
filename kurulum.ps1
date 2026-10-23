# Vaalz Music - gerekli arac kurulum betigi / dependency installer
#
# Bu dosya, uygulamanin "Ayarlar > Sistem durumu" bolumundeki "Kur" dugmesine basildiginda calistirilir.
# This script runs when you press "Install" in Settings > System status. Nothing else is run or downloaded.
#
# Yaptigi tek sey: eksik araclari Windows'un resmi paket yoneticisi (winget) ile kurmak.
# Its only job: install missing tools through Windows' official package manager (winget).
# winget yoksa ayni araclar resmi surum sayfalarindan "araclar" klasorune indirilir (yonetici izni gerekmez):
#   yt-dlp.exe  https://github.com/yt-dlp/yt-dlp/releases/latest
#   deno.exe    https://github.com/denoland/deno/releases/latest
#   ffmpeg.exe, ffprobe.exe   https://www.gyan.dev/ffmpeg/builds/ (release essentials)
#
#   yt-dlp  -> winget id: yt-dlp.yt-dlp    (https://github.com/yt-dlp/yt-dlp)
#   ffmpeg  -> winget id: Gyan.FFmpeg      (https://www.gyan.dev/ffmpeg/builds/)
#   deno    -> winget id: DenoLand.Deno    (https://deno.com)  [yt-dlp'nin YouTube JS dogrulamasi icin]
#
# Kullanici verisi okunmaz, hicbir yere gonderilmez. winget varsa paketler yalnizca winget kaynaklarindan iner;
# winget yoksa yalnizca yukarida yazili uc resmi adresten iner (ve bu betik baska hicbir sey indirmez/calistirmaz).
# No user data is read or sent anywhere. With winget, packages come only from winget's own sources; without winget,
# only from the three official addresses listed above. Nothing else is downloaded or executed.
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

# winget yoksa (Uygulama Yukleyici kurulu degil): araclar bu betigin yanindaki "araclar" klasorune dogrudan indirilir.
# Without winget: tools are downloaded straight from their official release pages into the "araclar" folder next to this script.
$wingetVar = [bool](Get-Command winget -ErrorAction SilentlyContinue)
$araclarKlasoru = Join-Path $PSScriptRoot "araclar"
$ProgressPreference = "SilentlyContinue"
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

function Indir([string]$url, [string]$hedef) {
    Write-Output "Indiriliyor: $url"
    Invoke-WebRequest -Uri $url -OutFile $hedef -UseBasicParsing
}

function DogrudanKur([string]$ad) {
    New-Item -ItemType Directory -Force -Path $araclarKlasoru | Out-Null
    $gecici = Join-Path ([IO.Path]::GetTempPath()) ("vaalz-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Force -Path $gecici | Out-Null
    try {
        switch ($ad) {
            "yt-dlp" {
                $dosya = Join-Path $gecici "yt-dlp.exe"
                Indir "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" $dosya
                Copy-Item $dosya (Join-Path $araclarKlasoru "yt-dlp.exe") -Force
            }
            "deno" {
                $zip = Join-Path $gecici "deno.zip"
                Indir "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip" $zip
                Expand-Archive -Path $zip -DestinationPath $gecici -Force
                Copy-Item (Join-Path $gecici "deno.exe") (Join-Path $araclarKlasoru "deno.exe") -Force
            }
            "ffmpeg" {
                $zip = Join-Path $gecici "ffmpeg.zip"
                Indir "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" $zip
                Expand-Archive -Path $zip -DestinationPath $gecici -Force
                foreach ($exe in "ffmpeg.exe", "ffprobe.exe") {
                    $bulunan = Get-ChildItem -Path $gecici -Recurse -Filter $exe | Select-Object -First 1
                    if (-not $bulunan) { throw "$exe zip icinde bulunamadi" }
                    Copy-Item $bulunan.FullName (Join-Path $araclarKlasoru $exe) -Force
                }
            }
        }
    }
    finally {
        Remove-Item -Recurse -Force $gecici -ErrorAction SilentlyContinue
    }
}

$hata = 0
foreach ($ad in $Paketler) {
    if (-not $izinli.ContainsKey($ad)) {
        Write-Output "ATLANDI: '$ad' izinli listede yok."
        continue
    }
    if (-not $wingetVar) {
        Write-Output "winget yok, dogrudan kuruluyor: $ad  ->  $araclarKlasoru"
        try {
            DogrudanKur $ad
            Write-Output "Tamam: $ad"
        }
        catch {
            Write-Output "HATA: $ad kurulamadi ($($_.Exception.Message))"
            $hata = 1
        }
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
