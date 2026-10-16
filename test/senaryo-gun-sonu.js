// SENARYO — GÜN SONU RAPORU (v1.686.0, 264).
//
// Kullanıcı: "Gün sonu raporu yapalım … gün içerisindeki hareketleri (alış, satış, kasa, üretim) detaylı; gün sonu cari
// bakiyeleri, eldeki çekler, kasada ve bankadaki paralar, stok miktarları."
// Tohum verisinde 30 Ağustos'ta üretim hareketleri ve işçilik var; buna bir satış fişi, kasa tahsilatı ve portföy çeki
// eklenir. Ölçülen: rapor o günün hareketlerini, gün sonu bakiyelerini ve stok miktarlarını gösteriyor; ertesi gün
// hareket bölümleri boşalıyor ama bakiyeler taşınıyor.
const { uygulamaAc, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const t = { ...TOHUM };
  const cariler = JSON.parse(TOHUM["cari:data"]);
  const musteri = cariler.find((c) => c.id === "c2");
  musteri.hareketler = [
    { id: "hs1", tarih: "2026-08-30", yon: "Borç", tutar: 500, paraBirimi: "TRY", fisNo: "SF-1", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 2, birim: "çift", birimFiyat: 250, defter: "Genel" },
    { id: "ht1", tarih: "2026-08-30", yon: "Alacak", islemTipi: "Tahsilat", tutar: 300, paraBirimi: "TRY", fisNo: "THS-1", aciklama: "Tahsilat (TL Kasa)", defter: "Genel", muhasebeBagId: "m1" },
  ];
  t["cari:data"] = JSON.stringify(cariler);
  t["muhasebe:data"] = JSON.stringify({ kasalar: [{ id: "k1", ad: "TL Kasa", paraBirimi: "TRY", hareketler: [
    { id: "kh0", tarih: "2026-08-29", yon: "Giriş", tutar: 1000, defter: "Genel", aciklama: "Açılış" },
    { id: "kh1", tarih: "2026-08-30", yon: "Giriş", tutar: 300, cariId: "c2", defter: "Genel", aciklama: "Tahsilat", muhasebeBagId: "m1" },
  ] }], bankalar: [], cekler: [{ id: "ck1", cekNo: "123", banka: "Ziraat", cariId: "c2", tutar: 750, paraBirimi: "TRY", vadeTarihi: "2026-10-01", durum: "Portföyde", defter: "Genel" }], kurlar: {} });
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  // v1.687.0: ayrı menü değil, Finans Raporu › Görünüm: Gün Sonu.
  await modulAc(sayfa, "Finans Raporu");
  await sayfa.waitForTimeout(600);
  await sayfa.locator('[data-finans-secim="gunsonu"]').first().click();
  await sayfa.waitForTimeout(500);
  const oku = async (gun) => {
    await sayfa.locator("[data-gun-sonu-tarih]").fill(gun);
    await sayfa.waitForTimeout(500);
    return sayfa.evaluate(() => {
      const kok = document.querySelector("[data-gun-sonu-icerik]");
      const bolumler = {};
      // v1.688.4: bölümler ekranda ayrı çerçeveli, süzgeçli listeler (data-gun-sonu-bolum).
      [...kok.querySelectorAll("[data-gun-sonu-bolum]")].forEach((d) => {
        bolumler[d.getAttribute("data-gun-sonu-bolum")] = [...d.querySelectorAll("tbody tr")].map((tr) => [...tr.children].map((td) => td.textContent.trim()).join(" | "));
      });
      const ozet = [...kok.querySelectorAll("table")[0].querySelectorAll("td")].map((td) => td.innerText.replace(/\s+/g, " ").trim());
      return { ozet, bolumler };
    });
  };
  const gun30 = await oku("2026-08-30");
  // Süzgeç: Kasa bakiyeleri listesinde olmayan hesap aranınca satır kalmaz, temizlenince döner.
  const kutu = sayfa.locator('[data-gun-sonu-ara="Kasa ve banka bakiyeleri (gün sonu)|Hesap"]');
  await kutu.fill("yok"); await sayfa.waitForTimeout(200);
  const suzgec = [await sayfa.locator('[data-gun-sonu-bolum="Kasa ve banka bakiyeleri (gün sonu)"] tbody tr').count()];
  await kutu.fill("tl"); await sayfa.waitForTimeout(200);
  suzgec.push(await sayfa.locator('[data-gun-sonu-bolum="Kasa ve banka bakiyeleri (gün sonu)"] tbody tr').count());
  await kutu.fill("");
  const gun31 = await oku("2026-08-31");
  const dugmeler = await sayfa.evaluate(() => ["pdf", "excel", "gonder", "otomatik", "saat", "alicilar"].filter((d) => !!document.querySelector(`[data-gun-sonu-${d}]`)));
  await tarayici.close();
  return { hatalar, dugmeler, suzgec, gun30, gun31: { ozet: gun31.ozet, hareketBolumleri: ["Alış / Satış fişleri", "Kasa / banka hareketleri", "Üretim — stok hareketleri"].map((b) => [b, (gun31.bolumler[b] || []).length]), kasa: gun31.bolumler["Kasa ve banka bakiyeleri (gün sonu)"], cari: gun31.bolumler["Cari bakiyeleri (gün sonu, Genel defter)"] } };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 1))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
