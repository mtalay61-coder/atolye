// SENARYO — ÜRETİMDE ARTAN HAMMADDE İADESİ AYRI FİŞ (kullanıcı, 17 Eylül: "üretimde 176 desi
// yapıldı ve 8 desi arttı, iade alındı; fişlerde üretimden artan stok girişi olması gerekmez miydi?
// Stok hareketinde görüyorum ama fişi yok, bu mantığa ters").
//
// ÖNCE: iade, çıkışla AYNI fiş numarasını taşıyordu. Fiş listesinde tek satır ve NET görünüyordu
// (-168); +8'lik iade hiçbir fişte ayrı görünmüyordu.
// ŞİMDİ: iade kendi fişinde (`…-İade`), fiş listesinde ayrı satır. Geri alma da onu tanıyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  // Kesim VERİLMİŞ, teslim alınmamış bir üretim: teslim alınırken artan iade edilecek.
  const t = { ...TOHUM };
  t["uretim:siparisler"] = JSON.stringify([{
    id: "up2", siparisNo: "1002", takipKodu: "1002", model: "Bot", urunId: "u2", renk: "Siyah", adet: 3,
    bedenMiktarlari: [{ beden: "41", miktar: 3 }], beden: "Siyah · 41:3",
    stogaEklendiMi: false, asama: "Kesim", durum: "Devam", olusturuldu: "2026-09-01T08:00:00.000Z",
    prosesIlerleme: [{
      proses: "Kesim", sira: 1, verildiMi: true, tamamlandiMi: false, personelId: "c3",
      atamalar: [{
        id: "at2", personelId: "c3", miktar: 3, bedenMiktarlari: { "41": 3 }, parcaBarkodu: "1002-1",
        // `verildiMi` (22 Eylül): teslim formu yalnız verilmiş atamada açılıyor; bu alan yoktu ve
        // senaryo bu yüzden hiç oturmamıştı (kart açılıyor, form çıkmıyordu).
        verildiMi: true, tamamlandiMi: false, verilmeTarihi: "2026-09-02",
        // Reçete 6 metre diyor, 8 metre verilmiş: 2 metre artan bekleniyor.
        verilenHammaddeler: { "u1|Siyah|": { verilen: 8, beklenen: 6 } },
      }],
    }],
  }]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  sayfa.on("dialog", (d) => d.accept());
  await sayfa.waitForTimeout(2500);

  await sayfa.getByRole("button", { name: "Üretim", exact: true }).click();
  await sayfa.waitForTimeout(700);
  await sayfa.getByText("1002", { exact: true }).last().click();
  await sayfa.waitForTimeout(900);
  // Form bekleyen atamada DOĞRUDAN açık (panel düğmesi kalktı). Eskiden burada "Teslim Al"
  // yazılı ilk düğmeye basılıyordu — o artık formun KENDİ gönder düğmesi, iade girilmeden
  // teslim alıyordu.
  await sayfa.waitForTimeout(700);
  const artanKutusu = await sayfa.evaluate(() => !!document.querySelector("[data-iade-kutusu]"));
  // Artan alanına 2 yazıp teslim al.
  await sayfa.evaluate(() => {
    const i = document.querySelector("[data-iade-kutusu]");
    if (i) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(i, "2");
      i.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-teslim-al]:visible").first().click();
  await sayfa.waitForTimeout(1800);

  const stok = await depoOku(sayfa, "stok:items");
  const deri = stok.find((p) => p.id === "u1");
  const hareketler = (deri.hareketler || []).map((h) => `${h.fisNo}:${h.miktar}`);
  const defter = (await depoOku(sayfa, "fisdefter:data")) || [];
  const iadeFisi = defter.filter((f) => String(f.fisNo || "").endsWith("-İade")).map((f) => `${f.fisNo}:${(f.stokHareketleri || []).reduce((t2, h) => t2 + h.miktar, 0)}`);

  await tarayici.close();
  return { hatalar, artanKutusu, hareketler, iadeFisi };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
