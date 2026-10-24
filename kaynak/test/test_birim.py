# Birim/regresyon testleri (ek paket gerekmez):  python kaynak/test/test_birim.py
# Gercek veri klasorune dokunmaz: gecici klasorde calisir, internete cikmaz (yt-dlp cagrilari taklit edilir).
import os, socket, sys, tempfile, unittest
from unittest import mock

KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["VAALZ_TEST"] = "1"
os.environ["VAALZ_BASE"] = tempfile.mkdtemp()
os.environ["VAALZ_WEB"] = os.path.join(KOK, "web")
sys.path.insert(0, os.path.join(KOK, "kaynak"))
import vaalzmusic as v


class SorguCoz(unittest.TestCase):
    def cozum(self, sure, adaylar):
        v.tracks["q1"] = {"title": "Sarki", "sorgu": "sarki", "duration": sure}
        veri = {"entries": [{"id": i, "duration": d} for i, d in adaylar]}
        with mock.patch.object(v, "ytdlp_json", return_value=veri), mock.patch.object(v, "kimlik_degistir") as kd:
            return v.sorgu_coz("q1"), kd

    def test_sureye_en_yakin_secilir(self):
        s, kd = self.cozum(200, [("aaaaaaaaaaa", 260), ("bbbbbbbbbbb", 203), ("ccccccccccc", 198)])
        self.assertEqual(s, "ccccccccccc")
        kd.assert_called_once_with("q1", "ccccccccccc")

    def test_sure_yoksa_ilk_aday(self):
        s, _ = self.cozum(0, [("aaaaaaaaaaa", 260), ("bbbbbbbbbbb", 203)])
        self.assertEqual(s, "aaaaaaaaaaa")

    def test_gecersiz_kimlik_ve_cok_uzun_videolar_elenir(self):
        with self.assertRaises(RuntimeError):
            self.cozum(200, [("kisa", 200), ("ddddddddddd", 5000), ("eeeeeeeeeee", 0)])


class SozKaydet(unittest.TestCase):
    def test_gecersiz_kimlik_reddedilir(self):
        for kotu in ("../x", "a/b", "", "ab", None, 5, "a" * 40, "ab cd ef"):
            with self.assertRaises(ValueError, msg=repr(kotu)):
                v.soz_kaydet(kotu, "metin")

    def test_yaz_ve_sil(self):
        v.soz_kaydet("abcdefghijk", "[00:01.00] merhaba")
        p = os.path.join(v.vm_klasoru("soz"), "abcdefghijk.lrc")
        self.assertTrue(os.path.exists(p))
        v.soz_kaydet("abcdefghijk", "   ")          # bos metin = sozu sil
        self.assertFalse(os.path.exists(p))


class Kilit(unittest.TestCase):
    def test_ikinci_ornek_kilit_alamaz(self):
        self.assertTrue(v.kilit_al())
        self.assertFalse(v.kilit_al())


class ListeEkleme(unittest.TestCase):
    def setUp(self):
        for vid in ("aaaaaaaaaaa", "bbbbbbbbbbb", "ccccccccccc", "ddddddddddd"):
            v.tracks[vid] = {"id": vid, "title": vid, "artist": "x", "duration": 200, "dosya": None}
        v.playlists["yt1"] = {"id": "yt1", "title": "YT", "url": "https://x", "local": False, "tracks": ["aaaaaaaaaaa"]}
        v.playlists["yer1"] = {"id": "yer1", "title": "Yerel", "url": None, "local": True, "tracks": ["aaaaaaaaaaa"]}

    def test_youtube_listesine_ekleme_guncellemede_korunur(self):
        v.listeye_ekle(v.playlists["yt1"], "bbbbbbbbbbb")
        v.listeye_ekle(v.playlists["yt1"], "bbbbbbbbbbb")                       # ikinci kez eklenmez
        self.assertEqual(v.playlists["yt1"]["tracks"], ["aaaaaaaaaaa", "bbbbbbbbbbb"])
        self.assertEqual(v.playlists["yt1"]["ekler"], ["bbbbbbbbbbb"])
        # YouTube'daki liste degisti: yalnizca ccc var. Elle eklenen bbb yine listede olmali.
        veri = {"title": "YT", "entries": [{"id": "ccccccccccc", "title": "c", "duration": 100}]}
        with mock.patch.object(v, "ytdlp_json", return_value=veri), mock.patch.object(v, "kaydet"):
            v.listeyi_cek("https://x")
        pid = v.liste_id("https://x")
        self.assertEqual(v.playlists[pid]["tracks"], ["ccccccccccc"])             # kimlik url'den turetildigi icin yeni kayit
        v.playlists[pid]["ekler"] = ["bbbbbbbbbbb"]
        with mock.patch.object(v, "ytdlp_json", return_value=veri), mock.patch.object(v, "kaydet"):
            v.listeyi_cek("https://x")
        self.assertEqual(v.playlists[pid]["tracks"], ["ccccccccccc", "bbbbbbbbbbb"])

    def test_yerel_listede_ekler_alani_yok(self):
        v.listeye_ekle(v.playlists["yer1"], "bbbbbbbbbbb")
        self.assertEqual(v.playlists["yer1"]["tracks"], ["aaaaaaaaaaa", "bbbbbbbbbbb"])
        self.assertNotIn("ekler", v.playlists["yer1"])


class ListeBenzerleri(unittest.TestCase):
    def test_ortak_cikanlar_once_ve_mevcutlar_elenir(self):
        v.tracks.update({t: {"id": t, "title": t, "dosya": None} for t in ("s1_aaaaaaaaa", "s2_aaaaaaaaa")})
        pl = {"id": "p", "tracks": ["s1_aaaaaaaaa", "s2_aaaaaaaaa", "f_yerel"], "local": True}
        oneri = lambda *ids: {"zaman": 1, "liste": [{"id": i, "title": i, "artist": "", "duration": 1} for i in ids]}
        sonuc = {"s1_aaaaaaaaa": oneri("x1", "ortak", "zatenvar"), "s2_aaaaaaaaa": oneri("ortak", "x2")}
        with mock.patch.object(v, "benzer_getir", side_effect=lambda t, y=False: sonuc[t]):
            r = v.liste_benzerleri(pl, False, {"s1_aaaaaaaaa", "s2_aaaaaaaaa", "zatenvar"})
        ids = [x["id"] for x in r["liste"]]
        self.assertEqual(ids[0], "ortak")                                         # iki parcayla eslesen basta
        self.assertNotIn("zatenvar", ids)
        self.assertEqual(r["tohum"], 2)                                           # f_ ile baslayan yerel parca tohum olmaz

    def test_hepsi_hata_verirse_hata_firlatilir(self):
        v.tracks["s9_aaaaaaaaa"] = {"id": "s9_aaaaaaaaa", "title": "t", "dosya": None}
        pl = {"id": "p", "tracks": ["s9_aaaaaaaaa"], "local": True}
        with mock.patch.object(v, "benzer_getir", side_effect=RuntimeError("ag yok")):
            with self.assertRaises(RuntimeError):
                v.liste_benzerleri(pl, False, set())


class Acilis(unittest.TestCase):
    def test_kapali_portlar_hizli_elenir(self):
        # bos portlari yoklamak (12 port) bazi bilgisayarlarda 2 sn x 12 surerdi; paralel + kisa deneme ile saniyeler icinde bitmeli
        import time
        bos = socket.socket(); bos.bind(("127.0.0.1", 0)); port = bos.getsockname()[1]; bos.close()
        t = time.time()
        self.assertIsNone(v.mevcut_ornek(port))
        self.assertLess(time.time() - t, 5)

    def test_yabanci_dinleyici_vaalz_sayilmaz(self):
        s = socket.socket(); s.bind(("127.0.0.1", 0)); s.listen(1)
        try:
            self.assertFalse(v.zaten_calisiyor(s.getsockname()[1]))
        finally:
            s.close()


class Dil(unittest.TestCase):
    def test_sistem_dili(self):
        with mock.patch.object(v.sys, "platform", "linux"):
            for ortam, beklenen in (("tr_TR.UTF-8", "tr"), ("en_US.UTF-8", "en"), ("de_DE.UTF-8", "en")):
                with mock.patch.dict(os.environ, {"LC_ALL": ortam}):
                    self.assertEqual(v.sistem_dili(), beklenen)

    def test_cevirilerin_hepsi_eslesiyor(self):
        for ad in ("app.js", "index.html"):
            with open(os.path.join(KOK, "web", ad), encoding="utf-8") as f:
                kaynak = f.read()
            eslesmeyen = []
            v.dil_cevir(ad, kaynak, "en", eslesmeyen)
            self.assertEqual(eslesmeyen, [], ad)

    def test_sunucu_mesaji_cevrilir(self):
        self.assertEqual(v.mesaj_cevir("Bilinmeyen hata", True, "en"), "Unknown error")


if __name__ == "__main__":
    unittest.main()
