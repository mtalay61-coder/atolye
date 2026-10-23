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
  // Giriş formu = sipariş formu (v1.716.0, teklif kipi, tam ekran katman): cari, model, renk, ölçü matrisi, kalemlere ekle.
  await tikla("[data-teklif-yeni]");
  await sayfa.waitForTimeout(400);
  const formBasligi = (await metin("[data-siparis-form-eylemler]"))[0] || "yok";
  const gecerlilikVar = await sayfa.locator("[data-teklif-gecerlilik]").count();
  const cariKutusu = sayfa.locator("[data-siparis-cari]:visible").first();
  await cariKutusu.click(); await cariKutusu.fill("Müşteri"); await sayfa.waitForTimeout(250); await cariKutusu.press("Enter"); await sayfa.waitForTimeout(200);
  const seciliCari = await cariKutusu.getAttribute("data-cari-id");
  const urunKutusu = sayfa.locator("[data-siparis-urun]:visible").first();
  await urunKutusu.click(); await urunKutusu.fill("Bot"); await sayfa.waitForTimeout(250); await urunKutusu.press("Enter"); await sayfa.waitForTimeout(300);
  const renkKutusu = sayfa.locator("[data-siparis-renk-arama]:visible").first();
  await renkKutusu.click(); await renkKutusu.fill("Siy"); await sayfa.waitForTimeout(200);
  await sayfa.locator('[data-aramali-oneri="Siyah"]').first().dispatchEvent("mousedown"); await sayfa.waitForTimeout(300);
  const matrisOlculeri = await sayfa.evaluate(() => [...document.querySelectorAll("[data-olcu-miktar]")].map((e) => e.getAttribute("data-olcu-miktar")));
  await sayfa.locator('[data-olcu-miktar="40"]').fill("2");
  await sayfa.locator('[data-olcu-miktar="41"]').fill("3");
  await sayfa.locator("[data-kalemlere-ekle]:visible").first().click(); await sayfa.waitForTimeout(400);
  const kalemSayisi = await sayfa.evaluate(() => (document.querySelector("[data-siparis-form-kalem-sayisi]") || {}).getAttribute("data-siparis-form-kalem-sayisi"));
  await sayfa.locator("[data-siparis-kaydet]:visible").first().click();
  await sayfa.waitForTimeout(500);
  const satirlar = await sayfa.evaluate(() => [...document.querySelectorAll("[data-teklif-satir]")].map((e) => e.getAttribute("data-teklif-satir")));
  const durum1 = await sayfa.evaluate(() => [...document.querySelectorAll("[data-teklif-durum]")].map((e) => e.getAttribute("data-teklif-durum")));
  const teklifYerel1 = (await depoOku(sayfa, "teklif:data")) || [];

  // ---- 1b) Düzenle: aynı form teklif kaydıyla açılır (başlıkta numara, 2 kalem), Vazgeç ile kapanır.
  await tikla("[data-teklif-satir] > button");
  await sayfa.waitForTimeout(300);
  await tikla("[data-teklif-duzenle]");
  await sayfa.waitForTimeout(500);
  const duzenlemeBasligi = (await metin("[data-siparis-form-eylemler]"))[0] || "yok";
  const duzenlemeKalem = await sayfa.evaluate(() => (document.querySelector("[data-siparis-form-kalem-sayisi]") || {}).getAttribute("data-siparis-form-kalem-sayisi"));
  await sayfa.locator("[data-siparis-form-vazgec]:visible").first().click();
  await sayfa.waitForTimeout(400);
  const formKapandi = (await sayfa.locator("[data-siparis-form-eylemler]").count()) === 0;
  // ---- 2) Gönderildi (satır hâlâ açık)
  if ((await sayfa.locator("[data-teklif-gonderildi]").count()) === 0) { await tikla("[data-teklif-satir] > button"); await sayfa.waitForTimeout(300); }
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
    modulVar, formBasligi, gecerlilikVar, seciliCari, matrisOlculeri, kalemSayisi, satirlar, durum1,
    teklif1: teklifYerel1.map((t) => ({ no: t.teklifNo, durum: t.durum, cari: t.cariId, kalem: (t.kalemler || []).map((k) => `${k.urunAd} ${k.renk} ${k.beden}:${k.miktar}@${k.birimFiyat}${k.paraBirimi}`), not: t.not, gecerlilikVar: !!t.gecerlilikTarihi, defter: t.defterTercihi })),
    duzenlemeBasligi, duzenlemeKalem, formKapandi, durum2,
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
