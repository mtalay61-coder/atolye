// SENARYO — TEDARİK GİRİŞLERİ VE KAYNAK İZİ (kullanıcı, 13 Eylül).
//
//   "100 çiftlik ürün satın alma ile giriş oldu, burada yanlış gösteriyor (üretimden diyor).
//    Alış ve üretim giriş fişlerini bir sekmede toplayalım; tıklayınca üretim veya alış fişine gitsin."
//
// Aynı ürün/renk/bedende iki giriş: 100 satın alma (AF-…), 3 üretim (10007-Kesim-2-Giriş). 103 çift
// sevk edildi. Ölçülen: sevk satırı iki kaynağı MİKTARIYLA gösteriyor (eskiden hepsi "üretimden");
// Tedarik Girişleri bölümü iki satır; alış satırına tıklayınca Fişler'de o fiş açılıyor.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  const bot = stok.find((p) => p.id === "u2");
  bot.variants = [{ renk: "Siyah", beden: "41", miktar: 0 }, { renk: "Siyah", beden: "42", miktar: 5 }];
  bot.hareketler = [
    { id: "sh-alis", tarih: "2026-09-12", tip: "Giriş", kaynak: "Satınalma", renk: "Siyah", beden: "41", miktar: 100, birim: "çift", fisNo: "AF-20260912-001", siparisNo: "AS-77", rezervasyonSiparisId: "s1", cariId: "c1" },
    { id: "sh-alis42", tarih: "2026-09-12", tip: "Giriş", kaynak: "Satınalma", renk: "Siyah", beden: "42", miktar: 5, birim: "çift", fisNo: "AF-20260912-001", siparisNo: "AS-77", rezervasyonSiparisId: "s1", cariId: "c1" },
    { id: "sh-uretim", tarih: "2026-09-13", tip: "Giriş", kaynak: "Üretim", renk: "Siyah", beden: "41", miktar: 3, birim: "çift", fisNo: "10007-Kesim-2-Giriş", siparisNo: "10007", uretimId: "up9", rezervasyonSiparisId: "s1" },
    { id: "sh-satis", tarih: "2026-09-13", tip: "Çıkış", kaynak: "Satış", renk: "Siyah", beden: "41", miktar: -103, birim: "çift", fisNo: "SF-20260913-001", siparisNo: "SAT-1", cariId: "c2" },
  ];
  t["stok:items"] = JSON.stringify(stok);
  t["uretim:siparisler"] = JSON.stringify([{ id: "up9", siparisNo: "10007", takipKodu: "10007", model: "Bot", urunId: "u2", renk: "Siyah", adet: 3,
    bedenMiktarlari: [{ beden: "41", miktar: 3 }], stogaEklendiMi: true, durum: "Tamamlandı", prosesIlerleme: [] }]);
  t["siparis:data"] = JSON.stringify([
    { id: "s1", siparisNo: "SAT-1", tip: "Satış", cariId: "c2", durum: "Kısmi Teslim", tarih: "2026-09-10", kalemler: [
      { id: "k1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 103, karsilanan: 103, birim: "çift", birimFiyat: 25, paraBirimi: "USD", planlama: { tip: "Satınalma", referansNo: "AS-77" } },
      { id: "k2", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "42", miktar: 5, karsilanan: 0, birim: "çift", birimFiyat: 25, paraBirimi: "USD", planlama: { tip: "Satınalma", referansNo: "AS-77" } },
    ] },
    { id: "a1", siparisNo: "AS-77", tip: "Alış", cariId: "c1", durum: "Tamamlandı", tarih: "2026-09-11", kalemler: [
      { id: "ak1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 100, karsilanan: 100, birim: "çift", birimFiyat: 15, paraBirimi: "USD" } ] },
  ]);
  const cariler = JSON.parse(TOHUM["cari:data"]).map((c) => {
    if (c.id === "c2") return { ...c, whatsapp: "0532 123 45 67", eposta: "musteri@ornek.com", hareketler: [{ id: "ch-satis", tarih: "2026-09-13", yon: "Borç", tutar: 2575, paraBirimi: "USD", fisNo: "SF-20260913-001", siparisId: "s1", siparisNo: "SAT-1", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 103, birim: "çift", birimFiyat: 25, defter: "Genel" }] };
    if (c.id === "c1") return { ...c, hareketler: [{ id: "ch-alis", tarih: "2026-09-12", yon: "Alacak", tutar: 1500, paraBirimi: "USD", fisNo: "AF-20260912-001", siparisId: "a1", siparisNo: "AS-77", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 100, birim: "çift", birimFiyat: 15, defter: "Genel" }] };
    return c;
  });
  t["cari:data"] = JSON.stringify(cariler);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await sayfa.getByRole("button", { name: "Sipariş", exact: true }).click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-durum-cip=\"Tümü\"]:visible").first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "SAT-1" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(800);

  // PLANLAMA ÇİPİ (13 Eylül): "Satın Alındı (103): AS-77 · AF-…" — alış fişi no da yazıyor.
  // Planlama bölümü tam ekran kartta.
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll('button[title^="Tam ekran aç"]')].find((x) => x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Tedarik Planlama/.test(x.textContent) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  const planlamaCipi = await sayfa.evaluate(() => { const f = document.querySelector("[data-alis-fisi]"); return f ? f.closest("button").textContent.replace(/\s+/g, " ").trim() : null; });
  // TEDARİK DETAYI (13 Eylül): tedarikçi adı, durum, fiş; PDF/WhatsApp/E-posta düğmeleri (aynı yol).
  const tedarikDetay = await sayfa.evaluate(() => {
    const s = document.querySelector("[data-tedarik-detay-satir]");
    return s && { metin: s.textContent.replace(/\s+/g, " ").trim(), pdf: !!s.querySelector("[data-paylas-pdf]"), whatsapp: !!s.querySelector("[data-paylas-whatsapp]"), eposta: !!s.querySelector("[data-paylas-eposta]") };
  });
  const [tedarikPdf] = await Promise.all([
    sayfa.waitForEvent("download", { timeout: 15000 }).catch(() => null),
    sayfa.evaluate(() => document.querySelector("[data-tedarik-detay-satir] [data-paylas-pdf]").click()),
  ]);
  const tedarikPdfIndi = !!tedarikPdf;

  // TEDARİK GİRİŞLERİ artık "Fişler" sekmesinde (15 Eylül). Ölçüm tam ekran kartta yapılıyor.
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Fişler/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  const tedarik = await sayfa.evaluate(() => {
    const kap = document.querySelector("[data-tedarik-girisleri]");
    if (!kap) return null;
    // MATRİS: satır = fiş + ürün + renk, sütun = beden, sonda toplam.
    const bas = [...kap.querySelectorAll("thead th")].map((x) => x.textContent.trim());
    return { sayi: kap.getAttribute("data-tedarik-girisleri"), baslik: bas,
      satirlar: [...kap.querySelectorAll("[data-tedarik-giris]")].map((tr) => [...tr.children].slice(0, -1).map((td) => td.textContent.trim()).join(" · ")) };
  });
  // SEVK MATRİSİ (13 Eylül): sütun = beden, hücrede miktar ve kaynak İKONLARI (ipucunda açıklama).
  // Sevk matrisi FİŞ GEÇMİŞİ içinde; o da artık "Fişler" sekmesinde (15 Eylül).
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Fişler/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(700);
  const kaynakSatirlari = await sayfa.evaluate(() => {
    const tb = document.querySelector("[data-sevk-matris]");
    if (!tb) return null;
    const bas = [...tb.querySelectorAll("thead th")].map((x) => x.textContent.trim());
    const hucreler = [...tb.querySelectorAll("tbody td")].map((td) => ({
      miktar: (td.querySelector("div") || td).textContent.trim(),
      ikonlar: [...td.querySelectorAll("[data-kaynak-ikon]")].map((b) => `${b.getAttribute("data-kaynak-ikon")}:${b.textContent.trim()}:${(b.getAttribute("title") || "").split(" (")[0]}`),
    }));
    return { bas, hucreler };
  });

  // Tam ekranı küçült: sonraki ölçümler liste kartında.
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll('button[title="Küçült — sekme çubuğunda kalır"]')].find((x) => x.getBoundingClientRect().height > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(500);
  // Liste kartında da Fişler sekmesine geç (sekme seçimi kart başına).
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Fişler/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  // Alış satırına tıkla → Fişler'de o fiş.
  await sayfa.evaluate(() => { const tr = document.querySelector('[data-tedarik-giris="AF-20260912-001"]'); if (tr) tr.click(); });
  await sayfa.waitForTimeout(1000);
  const fisAcildi = await sayfa.evaluate(() => {
    const h1 = document.querySelector("h1");
    return { modul: h1 ? h1.textContent.trim() : null, fisGorunur: [...document.querySelectorAll("*")].some((e) => e.textContent.trim() === "AF-20260912-001" && e.children.length === 0 && e.getBoundingClientRect().width > 0) };
  });

  // YAZDIR + WHATSAPP (13 Eylül): kartta iki düğme; WhatsApp bağlantısı cari kartındaki numaraya
  // (Müşteri B'ye whatsapp 0532… verildi) ve sipariş özeti metnini taşıyor; Yazdır dosya indiriyor.
  await sayfa.getByRole("button", { name: "Sipariş", exact: true }).click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-durum-cip=\"Tümü\"]:visible").first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "SAT-1" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(700);
  // Kart daha önce açılmıştı; ikinci tıklama KAPATIR (aç/kapa) — kapandıysa yeniden aç.
  if (!(await sayfa.evaluate(() => !!document.querySelector("[data-paylas-seridi] [data-paylas-pdf]")))) {
    await sayfa.evaluate(() => {
      const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "SAT-1" && e.children.length === 0);
      let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
    });
    await sayfa.waitForTimeout(700);
  }
  // PAYLAŞ ŞERİDİ (13 Eylül): sipariş kartında tek bileşen — PDF · WhatsApp · E-posta.
  const paylasim = await sayfa.evaluate(() => {
    const s = document.querySelector("[data-paylas-seridi]");
    const a = s && s.querySelector("[data-paylas-whatsapp]");
    return { yazdirVar: !!(s && s.querySelector("[data-paylas-pdf]")), numara: a && a.getAttribute("data-paylas-whatsapp"), eposta: s && (s.querySelector("[data-paylas-eposta]") || {}).getAttribute("data-paylas-eposta"), dosya: s && s.getAttribute("data-paylas-seridi") };
  });
  // WHATSAPP (PDF): test ortamında esm.sh yok → PDF üretilemez, yedek yol: numaraya sohbet açılır
  // (yeni pencere). Gerçek cihazda paylaş menüsü PDF ekli açılır — bu ortamda ölçülemiyor.
  const [popup] = await Promise.all([
    sayfa.waitForEvent("popup", { timeout: 15000 }).catch(() => null),
    sayfa.evaluate(() => document.querySelector("[data-paylas-seridi] [data-paylas-whatsapp]").click()),
  ]);
  const whatsappAcildi = popup ? decodeURIComponent(popup.url()).split("?")[0] : null;
  if (popup) await popup.close();
  // PDF düğmesi: kütüphane yüklenemeyince yazdırılabilir HTML indiriyor (yedek yol).
  const [indirme] = await Promise.all([
    sayfa.waitForEvent("download", { timeout: 15000 }).catch(() => null),
    sayfa.evaluate(() => document.querySelector("[data-paylas-seridi] [data-paylas-pdf]").click()),
  ]);
  const dosyaIndi = !!indirme;
  // E-POSTA (13 Eylül): Müşteri B'de e-posta var → düğme adresli. Test ortamında PDF üretilemez ve
  // `mailto:` başsız tarayıcıda gidilemez; ölçülen: düğmenin adresi taşıması ve yedek yolun (dosya
  // indirme + uyarı) çalışması. Gerçek gönderim `eposta` fonksiyonuna bağlı (cihazda denenecek).
  const epostaDugmesi = await sayfa.evaluate(() => (document.querySelector("[data-paylas-seridi] [data-paylas-eposta]") || {}).getAttribute("data-paylas-eposta"));
  const [epostaIndirme] = await Promise.all([
    sayfa.waitForEvent("download", { timeout: 15000 }).catch(() => null),
    sayfa.evaluate(() => document.querySelector("[data-paylas-seridi] [data-paylas-eposta]").click()),
  ]);
  await sayfa.waitForTimeout(500);
  const epostaUyari = await sayfa.evaluate(() => (document.body.innerText.match(/posta programı açılıyor|E-posta gönderildi|e-posta yok/) || [])[0] || null).catch(() => "sayfa-gitti");
  const eposta = { dugme: epostaDugmesi, dosyaIndi: !!epostaIndirme, uyari: epostaUyari };

  await tarayici.close();
  return { hatalar, kaynakSatirlari, planlamaCipi, tedarikDetay, tedarikPdfIndi, tedarik, fisAcildi, paylasim, whatsappAcildi, dosyaIndi, eposta };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
