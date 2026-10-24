# Birim/regresyon testleri (ek paket gerekmez):  python kaynak/test/test_birim.py
# Gercek veri klasorune dokunmaz: gecici klasorde calisir, internete cikmaz (yt-dlp cagrilari taklit edilir).
import os, sys, tempfile, unittest
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
