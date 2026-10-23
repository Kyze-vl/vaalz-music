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

# Indirirken her ~2 sn'de bir "x / y MB (hiz)" satiri yazar (uygulama son satiri gosterir); 30 sn veri gelmezse hata verir.
function Indir([string]$url, [string]$hedef) {
    Write-Output "Indiriliyor: $url"
    $istek = [Net.HttpWebRequest]::Create($url)
    $istek.Timeout = 30000; $istek.ReadWriteTimeout = 30000; $istek.UserAgent = "VaalzMusic"
    $yanit = $istek.GetResponse()
    try {
        $toplam = $yanit.ContentLength
        $ak = $yanit.GetResponseStream()
        $dosya = [IO.File]::Create($hedef)
        try {
            $tampon = New-Object byte[] 262144
            $okunan = 0L
            $toplamSaat = [Diagnostics.Stopwatch]::StartNew()
            $satirSaat = [Diagnostics.Stopwatch]::StartNew()
            while (($n = $ak.Read($tampon, 0, $tampon.Length)) -gt 0) {
                $dosya.Write($tampon, 0, $n)
                $okunan += $n
                if ($satirSaat.ElapsedMilliseconds -ge 2000) {
                    $satirSaat.Restart()
                    $hiz = $okunan / 1MB / [Math]::Max(0.1, $toplamSaat.Elapsed.TotalSeconds)
                    $mb = [Math]::Round($okunan / 1MB)
                    $hepsi = if ($toplam -gt 0) { " / " + [Math]::Round($toplam / 1MB) } else { "" }
                    Write-Output ("Indiriliyor: {0}{1} MB ({2:N1} MB/sn)" -f $mb, $hepsi, $hiz)
                }
            }
        }
        finally { $dosya.Dispose(); $ak.Dispose() }
        if ($toplam -gt 0 -and $okunan -ne $toplam) { throw "indirme yarim kaldi ($okunan / $toplam bayt)" }
    }
    finally { $yanit.Close() }
}

# Zip'ten yalnizca istenen dosyalari cikarir (Expand-Archive hepsini cikarir ve yavastir; ffmpeg zip'i ~300 MB aciliyor).
function ZiptenCikar([string]$zip, [string[]]$adlar, [string]$hedefKlasor) {
    Write-Output "Cikariliyor: $($adlar -join ', ')"
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $z = [IO.Compression.ZipFile]::OpenRead($zip)
    try {
        foreach ($ad in $adlar) {
            $giris = $z.Entries | Where-Object { $_.Name -eq $ad } | Select-Object -First 1
            if (-not $giris) { throw "$ad zip icinde bulunamadi" }
            [IO.Compression.ZipFileExtensions]::ExtractToFile($giris, (Join-Path $hedefKlasor $ad), $true)
        }
    }
    finally { $z.Dispose() }
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
                ZiptenCikar $zip @("deno.exe") $gecici
                Copy-Item (Join-Path $gecici "deno.exe") (Join-Path $araclarKlasoru "deno.exe") -Force
            }
            "ffmpeg" {
                $zip = Join-Path $gecici "ffmpeg.zip"
                Indir "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" $zip
                ZiptenCikar $zip @("ffmpeg.exe", "ffprobe.exe") $gecici
                foreach ($exe in "ffmpeg.exe", "ffprobe.exe") {
                    Copy-Item (Join-Path $gecici $exe) (Join-Path $araclarKlasoru $exe) -Force
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
