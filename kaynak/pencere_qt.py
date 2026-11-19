#!/usr/bin/env python3
"""Vaalz Music - Linux uygulama penceresi (Qt WebEngine).

Chrome/Chromium/Edge/Brave gerektirmeden arayuzu kendi penceresinde acar: adres cubugu yok, gorev cubugunda
"Vaalz Music" olarak (vaalz-music.desktop) gorunur. vaalzmusic.py tarafindan ayri bir surec olarak baslatilir;
pencere kapaninca sunucu, eskisi gibi ping kesildiginde kendini kapatir.

Gereken: PySide6 (QtWebEngine ile). Arch: pyside6 + qt6-webengine, Debian/Ubuntu: python3-pyside6.qtwebengine*.

Kullanim:  python3 pencere_qt.py <url> <profil_klasoru> [simge.png]
"""
import os
import sys

# Arayuz muzigi kullanici tiklamadan da calabilmeli (Edge/Chrome penceresindeki --autoplay-policy ile ayni)
os.environ.setdefault("QTWEBENGINE_CHROMIUM_FLAGS", "--autoplay-policy=no-user-gesture-required")

from PySide6.QtCore import QUrl, QSettings, QByteArray
from PySide6.QtGui import QDesktopServices, QIcon
from PySide6.QtWidgets import QApplication, QMainWindow
from PySide6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile, QWebEngineSettings
from PySide6.QtWebEngineWidgets import QWebEngineView


def yerel_mi(url: QUrl) -> bool:
    return url.scheme() in ("http", "https") and url.host() in ("127.0.0.1", "localhost")


class Sayfa(QWebEnginePage):
    """Uygulamanin kendi adresi pencerede kalir; disaridaki her link varsayilan tarayicida acilir."""

    def acceptNavigationRequest(self, url, tur, ana_cerceve):
        if ana_cerceve and not yerel_mi(url) and url.scheme() not in ("about", "data", "blob"):
            QDesktopServices.openUrl(url)
            return False
        return super().acceptNavigationRequest(url, tur, ana_cerceve)

    def createWindow(self, tur):
        # target=_blank / window.open: yeni Qt penceresi acma, adresi yakalayip tarayiciya gonder
        gecici = QWebEnginePage(self.profile(), self)
        gecici.urlChanged.connect(lambda u: (QDesktopServices.openUrl(u), gecici.deleteLater()))
        return gecici


class Pencere(QMainWindow):
    def __init__(self, url, profil_yolu, simge):
        super().__init__()
        self.setWindowTitle("Vaalz Music")
        if simge and os.path.exists(simge):
            self.setWindowIcon(QIcon(simge))

        profil = QWebEngineProfile("vaalz-music", self)               # kalici profil: localStorage, cerezler
        profil.setPersistentStoragePath(os.path.join(profil_yolu, "depo"))
        profil.setCachePath(os.path.join(profil_yolu, "onbellek"))
        profil.setHttpCacheMaximumSize(20 * 1024 * 1024)
        profil.downloadRequested.connect(self.indirme)

        self.gorunum = QWebEngineView(self)
        sayfa = Sayfa(profil, self.gorunum)
        ayar = sayfa.settings()
        ayar.setAttribute(QWebEngineSettings.WebAttribute.PlaybackRequiresUserGesture, False)
        ayar.setAttribute(QWebEngineSettings.WebAttribute.LocalStorageEnabled, True)
        ayar.setAttribute(QWebEngineSettings.WebAttribute.FullScreenSupportEnabled, True)
        sayfa.fullScreenRequested.connect(lambda istek: (istek.accept(),
                                                        self.showFullScreen() if istek.toggleOn() else self.showNormal()))
        sayfa.titleChanged.connect(lambda t: self.setWindowTitle(t or "Vaalz Music"))
        self.gorunum.setPage(sayfa)
        self.gorunum.setUrl(QUrl(url))
        self.setCentralWidget(self.gorunum)

        self.ayarlar = QSettings(os.path.join(profil_yolu, "pencere.ini"), QSettings.Format.IniFormat)
        geo = self.ayarlar.value("geometri")
        if isinstance(geo, QByteArray) and not geo.isEmpty():
            self.restoreGeometry(geo)
        else:
            self.resize(1360, 840)

    def indirme(self, istek):
        hedef = os.path.join(os.path.expanduser("~"), "İndirilenler")
        if not os.path.isdir(hedef):
            hedef = os.path.expanduser("~")
        istek.setDownloadDirectory(hedef)
        istek.accept()

    def closeEvent(self, olay):
        self.ayarlar.setValue("geometri", self.saveGeometry())
        super().closeEvent(olay)


def main():
    if len(sys.argv) < 3:
        sys.exit("kullanim: pencere_qt.py <url> <profil_klasoru> [simge.png]")
    url, profil_yolu = sys.argv[1], sys.argv[2]
    simge = sys.argv[3] if len(sys.argv) > 3 else ""
    os.makedirs(profil_yolu, exist_ok=True)

    app = QApplication([sys.argv[0]])
    app.setApplicationName("VaalzMusic")             # X11 WM_CLASS (vaalz-music.desktop: StartupWMClass=VaalzMusic)
    app.setApplicationDisplayName("Vaalz Music")
    app.setDesktopFileName("vaalz-music")             # Wayland app_id -> menudeki simge ve gorev cubugu kaydi
    pencere = Pencere(url, profil_yolu, simge)
    pencere.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
