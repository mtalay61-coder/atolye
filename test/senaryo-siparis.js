// SENARYO — Alış siparişinden TESLİM ALMA (`siparisGerceklestir` yolu).
// Kullanımı senaryo-fis.js ile aynı: çalıştır, çıktıyı refaktör öncesi/sonrası karşılaştır.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { alisSiparisindenTeslimEt } = require("./alis-teslim-yardimci.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc(TOHUM, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2000);

  await sayfa.getByRole("button", { name: "Alış Siparişi", exact: true }).click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-durum-cip=\"Tümü\"]:visible").first().click();
  await sayfa.waitForTimeout(400);
  // Önce özet satırı açılır, sonra kartın kendisi tam ekrana alınır: teslim paneli yalnızca
  // tam karttadır (özet satırı salt okunur önizlemedir).
  await sayfa.locator('div:has-text("AS-1")').last().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await sayfa.waitForTimeout(600);

  await alisSiparisindenTeslimEt(sayfa, { miktarlar: [4, 3] });

  const stok = await depoOku(sayfa, "stok:items");
  const cariler = await depoOku(sayfa, "cari:data");
  const siparisler = await depoOku(sayfa, "siparis:data");
  await tarayici.close();

  return {
    hatalar,
    stok: (stok || []).map((p) => ({ ad: p.ad, variants: p.variants, hareketler: p.hareketler })),
    cariler: (cariler || []).map((c) => ({ unvan: c.unvan, hareketler: c.hareketler })),
    siparisler: (siparisler || []).map((s) => ({ no: s.siparisNo, durum: s.durum, teslimSayaci: s.teslimSayaci, defterTercihi: s.defterTercihi, kalemler: s.kalemler })),
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
