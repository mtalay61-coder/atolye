// SENARYO — ÇIKIŞ/ALIŞ FİŞİNE BİRDEN ÇOK SATIR.
//
// Kullanıcı: "aynı fişe 1'den fazla satır eklemesine izin ver, eklediğimizi altta satır oluştursun,
// 1 veya 1'den fazla satır oluşturup kaydet deyince fişi kaydetsin."
//
// Ölçülenler:
//   - "Fişi Oluştur" fiş PENCERESİNİ açar (23 Eylül, v1.431.0: alış da ortak fiş ekranında).
//   - Aynı modelin başka rengi ve başka bir model, AYNI fişe ayrı satır olarak eklenir.
//   - Her satır kendi bedenlerini taşır; toplam kutu sayısı satırların bedenlerinin toplamıdır.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  // İKİ RENKLİ alış siparişi: aynı modele iki ayrı satır eklenebiliyor mu?
  t["siparis:data"] = JSON.stringify([{
    id: "s1", siparisNo: "AS-1", tip: "Alış", cariId: "c1", durum: "Onaylandı",
    tarih: "2026-08-20", teslimTarihi: "2026-09-01", teslimSayaci: 0,
    kalemler: [
      { id: "b1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 5, karsilanan: 0, birim: "çift", birimFiyat: 900, paraBirimi: "TRY" },
      { id: "b2", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 4, karsilanan: 0, birim: "çift", birimFiyat: 900, paraBirimi: "TRY" },
      { id: "b3", urunId: "u2", urunAd: "Bot", renk: "Taba", beden: "40", miktar: 3, karsilanan: 0, birim: "çift", birimFiyat: 900, paraBirimi: "TRY" },
      { id: "b4", urunId: "u1", urunAd: "Deri", renk: "Siyah", beden: "", miktar: 6, karsilanan: 0, birim: "metre", birimFiyat: 120, paraBirimi: "TRY" },
    ],
  }]);
  const stok = JSON.parse(t["stok:items"]);
  stok[1].variants.push({ renk: "Taba", beden: "40", miktar: 0 });
  t["stok:items"] = JSON.stringify(stok);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await sayfa.getByRole("button", { name: "Alış Siparişi", exact: true }).click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-durum-cip=\"Tümü\"]:visible").first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.getByText("AS-1", { exact: true }).last().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-fis-olustur]:visible").first().click();
  await sayfa.waitForTimeout(900);
  const fisAcildi = await sayfa.locator("[data-kalemlere-ekle]:visible").count();

  // Satır sayısı: fişteki miktar kutusu taşıyan ürün+renk satırları.
  const satirSay = () => sayfa.evaluate(() => [...document.querySelectorAll("tr")]
    .filter((tr) => tr.querySelector("[data-fis-miktar]")).length);
  const etiketBul = (ad) => sayfa.evaluate((a) => {
    const dl = document.getElementById("fis-urun-listesi");
    const o = dl ? [...dl.options].find((x) => x.value.includes(a)) : null;
    return o ? o.value : a;
  }, ad);
  const ekle = async (urun, renk, miktar) => {
    await sayfa.locator("[data-urun-arama]").first().fill(await etiketBul(urun));
    await sayfa.waitForTimeout(400);
    await sayfa.locator("[data-renk-arama]").first().fill(renk);
    await sayfa.waitForTimeout(400);
    await sayfa.locator("[data-kalem-miktar]:visible").first().fill(String(miktar));
    await sayfa.waitForTimeout(200);
    await sayfa.locator("[data-kalemlere-ekle]:visible").first().click();
    await sayfa.waitForTimeout(600);
  };

  await ekle("Deri", "Siyah", 3);
  const satir1 = await satirSay();
  await ekle("Deri", "Taba", 2);
  const satir2 = await satirSay();
  await ekle("Bot", "Siyah", 1);
  const satir3 = await satirSay();
  const bedenKutusu = await sayfa.locator("[data-fis-miktar]:visible").count();

  await tarayici.close();

  return {
    hatalar,
    fisAcildi,
    satirSayisi: { birinci: satir1, ikinci: satir2, ucuncu: satir3 },
    // Bot Siyah (40, 41) + Bot Taba (40) + Deri (bedensiz) = 4
    bedenKutusu,
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
