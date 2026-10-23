// SENARYO — TEKLİF (v1.715.0, 326-teklif). Kullanıcı: "Teklif diye alan ekleyelim, siparişin aynısı ama onaylanınca
// siparişe dönüşecek şekilde." Ölçülen:
//  1) Siparişler › Teklif menüsü; Yeni Teklif: müşteri, ürün (Bot) + renk (Siyah) + ölçü miktarları, fiyat önerisi; kaydet → TKL-1001.
//  2) Liste satırı: durum Hazırlanıyor, toplam; "Gönderildi işaretle" → Gönderildi.
//  3) "Onaylandı — siparişe dönüştür" → satış siparişi SAT-… açılır (kalemler birebir), teklif "Siparişe dönüştü · SAT-…",
//     ekran Sipariş sekmesine gider. Dönüşen teklif düzenlenemez/silinemez (düğmeler yok).
//  4) Yerel kopyalar: teklif:data ve siparis:data tutarlı.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

async function calistir() {
  const hatalar = [];
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  sayfa.on("dialog", (d) => d.accept());
  await sayfa.waitForTimeout(2200);
  const metin = (sec) => sayfa.evaluate((s) => [...document.querySelectorAll(s)].map((e) => e.textContent.replace(/\s+/g, " ").trim()), sec);
  const tikla = async (sec) => { await sayfa.locator(sec).first().click(); await sayfa.waitForTimeout(300); };

  // ---- 1) Menü → Teklif
  // Menü düğmeleri kapalıyken de DOM'da (data-nav) — doğrudan tıklanır.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Teklif"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const modulVar = await sayfa.locator("[data-teklif-modulu]").count();
  await tikla("[data-teklif-yeni]");
  await sayfa.locator("[data-teklif-cari]").first().click();
  await sayfa.locator("[data-teklif-cari]").first().fill("Müşteri");
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-teklif-cari]").first().press("Enter");
  await sayfa.waitForTimeout(200);
  const seciliCari = await sayfa.locator("[data-teklif-cari]").first().getAttribute("data-cari-id");
  await sayfa.locator("[data-teklif-urun]").first().click();
  await sayfa.locator("[data-teklif-urun]").first().fill("Bot");
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-teklif-urun]").first().press("Enter");
  await sayfa.waitForTimeout(300);
  const seciliUrun = (await metin("[data-teklif-secili-urun]"))[0] || "";
  await sayfa.locator("[data-teklif-renk]").selectOption("Siyah");
  await sayfa.waitForTimeout(300);
  const fiyatOnerisi = await sayfa.locator("[data-teklif-fiyat]").inputValue();
  await sayfa.locator("[data-teklif-fiyat]").fill("150");
  await sayfa.locator('[data-teklif-miktar="40"]').fill("2");
  await sayfa.locator('[data-teklif-miktar="41"]').fill("3");
  await tikla("[data-teklif-kalem-ekle]");
  const kalemGruplari = await sayfa.evaluate(() => [...document.querySelectorAll("[data-teklif-kalem-grup]")].map((e) => e.getAttribute("data-teklif-kalem-grup")));
  await sayfa.locator("[data-teklif-not]").fill("30 gün vade");
  await tikla("[data-teklif-kaydet]");
  await sayfa.waitForTimeout(500);
  const satirlar = await sayfa.evaluate(() => [...document.querySelectorAll("[data-teklif-satir]")].map((e) => e.getAttribute("data-teklif-satir")));
  const durum1 = await sayfa.evaluate(() => [...document.querySelectorAll("[data-teklif-durum]")].map((e) => e.getAttribute("data-teklif-durum")));
  const teklifYerel1 = (await depoOku(sayfa, "teklif:data")) || [];

  // ---- 2) Gönderildi
  await tikla("[data-teklif-satir] > button");
  await sayfa.waitForTimeout(300);
  await tikla("[data-teklif-gonderildi]");
  const durum2 = await sayfa.evaluate(() => [...document.querySelectorAll("[data-teklif-durum]")].map((e) => e.getAttribute("data-teklif-durum")));

  // ---- 3) Siparişe dönüştür (onay kutusu kabul edilir)
  await tikla("[data-teklif-donustur]");
  await sayfa.waitForTimeout(900);
  const siparisYerel = (await depoOku(sayfa, "siparis:data")) || [];
  const yeniSiparis = siparisYerel.find((s) => s.teklifNo === "TKL-1001") || null;
  const teklifYerel2 = (await depoOku(sayfa, "teklif:data")) || [];
  const sekmeBasligi = await sayfa.evaluate(() => (document.querySelector("h1") || {}).textContent || "");
  // Sipariş listesinde görünüyor mu (hedef verildi → liste süzgeci "Tümü")?
  const siparisEkranda = await sayfa.evaluate(() => /SAT-1\d{3}/.test(document.body.innerText));
  // Teklif sekmesine dön: dönüşen teklif için düzenle/sil/dönüştür yok, "Siparişe git" var.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Teklif"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  await tikla('[data-teklif-durum-filtre="Tümü"]');
  // Satır daha önce açıldıysa açık kalır (acikId); kapalıysa aç.
  if ((await sayfa.locator("[data-teklif-yazdir]").count()) === 0) await tikla("[data-teklif-satir] > button");
  const dugmeler = {
    donustur: await sayfa.locator("[data-teklif-donustur]").count(),
    duzenle: await sayfa.locator("[data-teklif-duzenle]").count(),
    sil: await sayfa.locator("[data-teklif-sil]").count(),
    siparisGit: (await metin("[data-teklif-siparise-git]"))[0] || "yok",
  };
  const durum3 = await sayfa.evaluate(() => [...document.querySelectorAll("[data-teklif-durum]")].map((e) => e.textContent.trim()));

  await tarayici.close();
  return {
    modulVar, seciliCari, seciliUrun, fiyatOnerisi, kalemGruplari, satirlar, durum1,
    teklif1: teklifYerel1.map((t) => ({ no: t.teklifNo, durum: t.durum, cari: t.cariId, kalem: (t.kalemler || []).map((k) => `${k.urunAd} ${k.renk} ${k.beden}:${k.miktar}@${k.birimFiyat}${k.paraBirimi}`), not: t.not, gecerlilikVar: !!t.gecerlilikTarihi })),
    durum2,
    yeniSiparis: yeniSiparis && { no: /^SAT-1\d{3}$/.test(yeniSiparis.siparisNo), tip: yeniSiparis.tip, durum: yeniSiparis.durum, cari: yeniSiparis.cariId, teklifNo: yeniSiparis.teklifNo,
      kalem: yeniSiparis.kalemler.map((k) => `${k.urunAd} ${k.renk} ${k.beden}:${k.miktar}@${k.birimFiyat} k=${k.karsilanan}`), not: yeniSiparis.not },
    teklif2: teklifYerel2.map((t) => ({ no: t.teklifNo, durum: t.durum, siparisNoVar: /^SAT-1\d{3}$/.test(t.siparisNo || "") })),
    sekmeBasligi, siparisEkranda, dugmeler, durum3, hatalar,
  };
}

if (require.main === module) {
  calistir().then((s) => console.log(JSON.stringify(s, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { calistir };
