// SENARYO — YEREL YAZMA HATASI ARTIK SESSİZ DEĞİL (22 Eylül, v1.410.0, 13. denetim)
//
// `tabloYaz(...).catch(() => {})` 90 yerde yerel yazma hatasını (depo dolu, boyut aşımı) yutuyordu:
// değişiklik yalnız bellekte kalıyor, sayfa yenilenince HABER VERMEDEN kayboluyordu. Hepsi
// `yazimiIzle`e çevrildi. En tehlikelisi çöpten geri yüklemeydi: yazma beklenmeden kayıt çöpten
// siliniyordu — yazma tutmazsa kayıt ne listede ne çöpte kalıyordu.
//
// Depo sahte olarak bozuluyor (yalnız "stok:items" anahtarı, her deneme hata). Ölçülen:
//  1) yazimiIzle: söz reddedilmiyor, `yerel: true` dönüyor ve bildirim köprüsü çağrılıyor;
//  2) bozuk depoda geri yükleme: kayıt LİSTEYE EKLENMEDİ, ÇÖPTE KALDI, uyarı verildi;
//  3) sağlam depoda geri yükleme: kayıt listede, çöp boş, normal mesaj.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc(TOHUM, { hataYaz: false });
  await sayfa.waitForTimeout(2500);
  const sonuc = await sayfa.evaluate(async () => {
    const R = window.__React;
    const { useCopKutusu, yazimiIzle, tabloYaz } = window.__erp;
    const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
    const bildirimler = [];
    window.__kayitHatasiBildir = (hata, etiket) => bildirimler.push(etiket);
    let bozuk = false;
    const asilSet = window.storage.set.bind(window.storage);
    window.storage.set = async (a, d, p) => {
      if (bozuk && a === "stok:items") throw new Error("QuotaExceededError (test)");
      return asilSet(a, d, p);
    };
    const r = {};

    // 1) yardımcının kendisi
    bozuk = true;
    const s1 = await yazimiIzle(tabloYaz("stok:items", "urunler", [{ id: "x" }]), "Stok kartları", []);
    r.yardimci = { ok: s1.ok, yerel: !!s1.yerel, bildirim: bildirimler.slice() };

    // 2-3) çöpten geri yükleme
    let api = null, durum = null;
    const toastlar = [];
    const copKaydi = { id: "cop1", tur: "urun", baslik: "Silinen Ürün", veri: { id: "u-sil", ad: "Silinen Ürün" },
      geriAlinabilirMi: true, yanEtkiliMi: false, silinmeTarihi: "2026-09-20T10:00:00.000Z" };
    function Duzenek() {
      const [stok, setStok] = R.useState([{ id: "u-var", ad: "Var" }]);
      const [cop, setCop] = R.useState([copKaydi]);
      durum = { stok, cop };
      api = useCopKutusu({ cop, setCop, showToast: (m) => toastlar.push(m), aktifKullanici: { ad: "t" },
        stok, cariler: [], siparisler: [], uretim: [], koliler: [], muhasebe: {},
        setStok, setCariler: () => {}, setSiparisler: () => {}, setUretim: () => {}, setKoliler: () => {}, setMuhasebe: () => {} });
      return null;
    }
    const kur = async () => {
      const kap = document.createElement("div"); document.body.appendChild(kap);
      const kok = window.__ReactDOMClient.createRoot(kap);
      kok.render(R.createElement(Duzenek)); await bekle(100); return kok;
    };
    const ozet = () => ({ stok: durum.stok.map((x) => x.id), cop: durum.cop.map((x) => x.id), toast: toastlar.slice(-1)[0] || null });

    bildirimler.length = 0;
    let kok = await kur();
    bozuk = true;
    await api.coptanGeriYukle("cop1");
    await bekle(200);
    r.bozukDepo = { ...ozet(), bildirim: bildirimler.slice() };
    kok.unmount();

    toastlar.length = 0; bildirimler.length = 0;
    kok = await kur();
    bozuk = false;
    await api.coptanGeriYukle("cop1");
    await bekle(300);
    r.saglamDepo = { ...ozet(), bildirim: bildirimler.slice() };
    kok.unmount();
    window.storage.set = asilSet;
    return r;
  });
  await tarayici.close();
  return sonuc;
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
