// SENARYO — FİNANS RAPORU (25 Eylül, v1.463.0).
//
// Kullanıcı: "Finans raporu ekleyelim; birden fazla rapor, sipariş raporu gibi kaydederiz. Varlık
// raporu örnek: alacaklar, borçlar, hammadde/mamul stok değeri, portföydeki çekler, yazılan çekler…
// 2 defter için ayrı filtreleyerek."
//
// Ölçülenler:
//   1. Finans ▸ Finans Raporu açılıyor; varlık özeti grupları ve NET VARLIK.
//   2. Hazır şablonlar listede; "Varlık Raporu" gruplu tablo ve Net Etki toplamı = net varlık.
//   3. Defter "Genel · Resmi yan yana": özet iki sütun + fark; Resmi'de yalnız Resmi/Muhasebe kayıtları.
//   4. Yeni rapor kaydedilince `tanimlar.raporlar`a YALNIZ o yazılıyor (hazır şablonlar değil).
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const cariler0 = JSON.parse(TOHUM["cari:data"]);
  const ekle = (id, h) => { const c = cariler0.find((x) => x.id === id); c.hareketler = [...(c.hareketler || []), h]; };
  ekle("c2", { id: "fr1", tarih: "2026-09-01", yon: "Borç", tutar: 10000, paraBirimi: "TRY", defter: "Genel", fisNo: "SAT-1", aciklama: "Satış" });
  ekle("c2", { id: "fr2", tarih: "2026-09-02", yon: "Borç", tutar: 3000, paraBirimi: "TRY", defter: "Resmi", fisNo: "SAT-2", aciklama: "Satış" });
  ekle("c1", { id: "fr3", tarih: "2026-09-03", yon: "Alacak", tutar: 2000, paraBirimi: "TRY", defter: "Muhasebe", fisNo: "ALS-1", aciklama: "Alış" });
  t["cari:data"] = JSON.stringify(cariler0);
  t["muhasebe:data"] = JSON.stringify({
    kurlar: { USD: 40, EUR: 50 },
    kasalar: [{ id: "k1", ad: "Merkez", paraBirimi: "TRY", hareketler: [{ id: "m1", tarih: "2026-09-01", yon: "Giriş", tutar: 1500, defter: "Genel" }] }],
    bankalar: [],
    cekler: [
      { id: "ck1", tip: "Alınan", durum: "Portföyde", cekNo: "P1", cariId: "c2", tutar: 4000, paraBirimi: "TRY", vadeTarihi: "2026-11-01" },
      { id: "ck2", tip: "Verilen", durum: "Portföyde", cekNo: "S1", cariId: "c1", tutar: 1000, paraBirimi: "TRY", vadeTarihi: "2026-10-15" },
    ],
  });

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await modulAc(sayfa, "Finans Raporu");
  await sayfa.waitForTimeout(900);

  const ozet = () => sayfa.evaluate(() => {
    const k = document.querySelector("[data-finans-ozet]");
    const hucreler = (tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent.trim());
    return {
      basliklar: [...k.querySelectorAll("thead th")].map((th) => th.textContent.trim()),
      gruplar: [...k.querySelectorAll("[data-finans-ozet-grup]")].map(hucreler),
      toplamlar: [...k.querySelectorAll("[data-finans-ozet-toplam]")].map(hucreler),
    };
  });
  const tumu = await ozet();

  const hazirlar = await sayfa.evaluate(() => [...document.querySelectorAll("[data-kayitli-rapor]")].map((b) => b.getAttribute("data-kayitli-rapor")));
  await sayfa.locator('[data-kayitli-rapor="Varlık Raporu"]').click();
  await sayfa.waitForTimeout(500);
  const varlikRaporu = await sayfa.evaluate(() => {
    const tablo = document.querySelector("[data-rapor-tablo]");
    const satirlar = [...tablo.querySelectorAll("tbody tr")].map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent.trim()).join(" | "));
    const toplam = [...tablo.querySelectorAll("[data-rapor-toplam] td")].map((td) => td.textContent.trim()).filter(Boolean);
    return { satirlar, toplam };
  });

  await sayfa.locator('[data-finans-secim="YanYana"]').click();
  await sayfa.waitForTimeout(600);
  const yanYana = await ozet();

  // Yeni rapor: yalnız Stoklar, kaydet.
  await sayfa.locator('[data-finans-secim="Tümü"]').click();
  await sayfa.waitForTimeout(300);
  await sayfa.evaluate(() => [...document.querySelectorAll("button")].find((b) => /Yeni rapor/.test(b.textContent)).click());
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-rapor-ad]").fill("Benim Stok Raporum");
  await sayfa.locator("[data-rapor-kaydet]").click();
  await sayfa.waitForTimeout(800);
  const tanim = await depoOku(sayfa, "tanimlar:data");
  const kaydedilen = ((tanim && tanim.raporlar) || []).filter((r) => r.modul === "finans").map((r) => r.ad);

  await tarayici.close();
  return { hatalar, tumu, hazirlar, varlikRaporu, yanYana, kaydedilen };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
