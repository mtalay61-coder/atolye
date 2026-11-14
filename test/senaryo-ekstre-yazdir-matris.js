// SENARYO — YAZDIRILAN EKSTREDE BEDEN MATRİSİ (v1.744.21). Kullanıcı (14 Kasım, ekstre çıktısı görüntüsüyle: açıklamada
// "27506 D · 1008 – SİGARO SÜET — 36:1, 37:2, 38:2, 39:2, 40:1 Çift"): "Ekstreyi de sipariş hareketi gibi matris düzeninde yap".
// Kurulum (Tedarikçi A): bedenli satış (Bot Siyah 40:2 41:3 + Taba 40:4), bedensiz alış (Deri Siyah 11 metre), ödeme.
// Ölçülen: cari kartı sağ tık › "Ekstre yazdır" penceresinde bedenli fiş matris (başlık bedenler + Toplam; satır ürün · renk;
// hücre miktar, boş "—"; toplam × fiyat); bedensiz fiş eski tek satır; ödeme açıklaması; borç/alacak/bakiye sütunları.
const { uygulamaAc, modulAc, sagTikSec } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const cariler = JSON.parse(TOHUM["cari:data"]);
  const ortak = { paraBirimi: "TRY", vade: "", defter: "Genel", odemeSekli: "Nakit" };
  cariler.find((c) => c.id === "c1").hareketler = [
    { ...ortak, id: "h-a", tarih: "2026-09-10", yon: "Alacak", tutar: 134.31, fisNo: "AF-0910001", urunAd: "Deri", renk: "Siyah", beden: "",
      miktar: 11, birimFiyat: 12.21, birim: "metre", aciklama: "Alış" },
    ...[["Siyah", "40", 2], ["Siyah", "41", 3], ["Taba", "40", 4]].map(([renk, beden, miktar], i) => ({ ...ortak, id: "h-b" + i, tarih: "2026-09-11",
      yon: "Borç", tutar: miktar * 900, fisNo: "SF-0911001", urunAd: "Bot", renk, beden, miktar, birimFiyat: 900, birim: "çift", aciklama: "Satış" })),
    { ...ortak, id: "h-d", tarih: "2026-09-13", yon: "Borç", tutar: 1000, fisNo: "ODM-TEST", aciklama: "Ödeme" },
  ];
  t["cari:data"] = JSON.stringify(cariler);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await modulAc(sayfa, "Cari"); await sayfa.waitForTimeout(500);
  await sayfa.locator('button:has-text("Tedarikçi A"):visible').last().click(); await sayfa.waitForTimeout(800);
  await sagTikSec(sayfa, "[data-cari-ust-serit]", "ekstre");
  await sayfa.waitForTimeout(800);
  const sonuc = await sayfa.evaluate(() => {
    const alan = document.querySelector("#ekstre-yazdir-alani");
    if (!alan) return null;
    const tablo = [...alan.querySelectorAll("table")].find((tb) => [...tb.querySelectorAll(":scope > thead th")].some((th) => th.textContent.trim() === "Bakiye"));
    return [...tablo.tBodies[0].rows].map((tr) => {
      const td = tr.children;
      const m = td[2].querySelector("[data-ekstre-yazdir-matris] table");
      return {
        fis: td[0].textContent.trim(),
        aciklama: m ? null : td[2].textContent.replace(/\s+/g, " ").trim(),
        matris: m ? [...m.rows].map((r) => [...r.cells].map((c) => c.textContent.replace(/\s+/g, " ").trim())) : null,
        borc: td[3].textContent.trim(), alacak: td[4].textContent.trim(), bakiye: td[5].textContent.trim(),
      };
    });
  });
  await tarayici.close();
  return { satirlar: sonuc, hatalar };
}
if (require.main === module) calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
module.exports = { calistir };
