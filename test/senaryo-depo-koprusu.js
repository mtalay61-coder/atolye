// SENARYO — DEPO KÖPRÜSÜ: INDEXEDDB'YE GÖÇ.
//
// Kullanıcı: "5 MB uygulama için çok düşük. 1 ay sonra ne yapacağız?"
// Haklıydı: localStorage'ın ~5 MB sınırı hem küçük hem aynı kaynaktaki başka uygulamalarla
// PAYLAŞILIYOR. IndexedDB'nin kotası kıyaslanamayacak kadar büyük (aynı cihazda 10 GB bildirdi).
//
// Bu senaryo köprüyü GERÇEK bir tarayıcıda sınıyor: eski localStorage kayıtları IndexedDB'ye
// taşınıyor mu, taşındıktan sonra localStorage boşalıyor mu, okuma/yazma/silme/listeleme çalışıyor mu,
// ve bu uygulamaya ait OLMAYAN kayıtlara dokunulmuyor mu.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { normalles } = require("./senaryo-fis.js");

const KOPRU = fs.readFileSync(path.join(__dirname, "..", "depo-koprusu.js"), "utf8");

async function calistir() {
  const tarayici = await chromium.launch();
  const sayfa = await tarayici.newPage();
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));

  // Köprü YÜKLENMEDEN önce eski localStorage verisi konuyor — gerçek yükseltme durumu bu.
  // about:blank'te localStorage yasak; gerçek bir sayfa gerekiyor. Uygulamanın kendi test
  // paketini değil boş bir dosya sayfasını kullanıyoruz: sınanan şey KÖPRÜ, uygulama değil.
  await sayfa.goto("file://" + path.join(__dirname, "bos.html"));
  await sayfa.evaluate(() => {
    localStorage.setItem("atolye:stok:items", JSON.stringify([{ id: "u1", ad: "Deri" }]));
    localStorage.setItem("atolye:tanimlar:data", JSON.stringify({ renkler: [] }));
    // Başka uygulamanın kaydı: köprü buna DOKUNMAMALI.
    localStorage.setItem("not-defteri:tasks", "baskasinin-verisi");
  });

  await sayfa.evaluate(KOPRU);
  // Göç asenkron; ilk çağrı onu bekliyor.
  const okuma = await sayfa.evaluate(async () => (await window.storage.get("stok:items")).value);

  const gocSonrasi = await sayfa.evaluate(() => ({
    yerelKalanAtolye: Object.keys(localStorage).filter((k) => k.startsWith("atolye:")),
    yabanciDuruyor: localStorage.getItem("not-defteri:tasks"),
  }));

  // Yaz / oku / listele / sil
  const islemler = await sayfa.evaluate(async () => {
    await window.storage.set("cari:data", JSON.stringify([{ id: "c1" }]));
    const okundu = (await window.storage.get("cari:data")).value;
    const liste = (await window.storage.list("")).keys.sort();
    await window.storage.delete("cari:data");
    let silindiMi = false;
    try { await window.storage.get("cari:data"); } catch (e) { silindiMi = true; }
    return { okundu, liste, silindiMi };
  });

  // IndexedDB'de gerçekten duruyor mu?
  const idbIcerik = await sayfa.evaluate(() => new Promise((coz) => {
    const istek = indexedDB.open("atolye-depo", 1);
    istek.onsuccess = () => {
      const t = istek.result.transaction("kv", "readonly");
      const r = t.objectStore("kv").getAllKeys();
      r.onsuccess = () => coz((r.result || []).filter((k) => k !== "__goc_tamam").sort());
    };
  }));

  // Büyük veri: localStorage'ın tıkandığı boyut (~5 MB) burada sorun OLMAMALI.
  const buyukYazma = await sayfa.evaluate(async () => {
    const buyuk = "x".repeat(8 * 1024 * 1024); // 8 MB — eski köprüde kesin kota hatası
    try {
      await window.storage.set("buyuk:test", buyuk);
      const geri = (await window.storage.get("buyuk:test")).value;
      await window.storage.delete("buyuk:test");
      return { yazildi: true, boyutMB: Math.round(geri.length / 1024 / 1024) };
    } catch (e) {
      return { yazildi: false, hata: String(e.message).slice(0, 80) };
    }
  });

  await tarayici.close();
  return { hatalar, okuma, gocSonrasi, islemler, idbIcerik, buyukYazma };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
