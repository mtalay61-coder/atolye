// SENARYO — "SİPARİŞTEN SEÇ"TE HAZIR KOLİLER (v1.426.0 + v1.428.0 gruplama).
//
// Kullanıcı: "Siparişten seçte tüm siparişi ekliyor, koli olarak listelesin, oradan ekleyelim,
// barkod mantığında." Ardından: "koliler ekranı çok dolduruyor, nasıl azaltırız" — koliler ASORTİ
// İMZASINA göre tek satırda toplandı; kod kod seçmek "tek tek seç" ile açılıyor.
//
// Kurulum: SAT-1001 (102 Bayan Bot · Siyah, 36:21 37:38 38:38 39:38 40:19 = 154 çift), bu siparişe
// ait 19 HAZIR koli (her biri 8 çift, 36:1 37:2 38:2 39:2 40:1) → 152 çift kolide, 36 bedeninde
// 2 çift KOLİYE GİRMEMİŞ. Stok her bedende 50.
// Ölçülenler:
//   1. Panel açılınca: özet "19 koli · 152 çift", TEK grup satırı, kod düğmeleri KATLI (0 adet).
//   2. "tek tek seç" → 19 kod düğmesi; bir koliye tıklanınca 18 kalıyor, fişte "1 koli · 8 çift".
//      KALAN MİKTAR hatası (v1.426.0): tek koli kalemin yalnız bir kısmını taşıyor — sipariş
//      bekleyen listesinden DÜŞMEMELİ (panel açık, sipariş listede, kalan 146).
//   3. Adet kutusuna 3 → düğme "3 koli ekle" → fişte 4 koli · 32 çift, grup satırı "15 koli".
//      Koliler sıradan alınıyor (tek tek eklenen K-05 atlanıyor → K-01..K-03).
//   0. (v1.508.0) Başlıkta "kalan 154 = kolide 152 + kolisiz 2"; kolisiz tablo baştan yalnız 36:2.
//   4. "Tümünü ekle" → grup satırı kalmıyor; yalnız "Kolisiz kalanı ekle" ve 36 bedeninde 2 çiftlik
//      kalan matrisi görünüyor. Kolisiz kalan da eklenir.
//   6. Ayrı oturum: önce "Kolisiz kalanı ekle" yalnız 2 çift ekler, sonra "Tümünü ekle" ile kalan kapanır
//      (sipariş listeden düşer) — aynı mal iki kez eklenmez.
//   5. Kaydet + onay → 19 kolinin hepsi "Sevk edildi" (aynı fiş no), stok her bedende tam düşüyor,
//      karşılanan 36=21 37=38 38=38 39=38 40=19, sipariş Tamamlandı.
// (27 Eylül, yeniden yazıldı — dosya taşımada kaybolmuştu)
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

const BEDENLER = ["36", "37", "38", "39", "40"];
const ASORTI = { 36: 1, 37: 2, 38: 2, 39: 2, 40: 1 };

async function calistir() {
  const t = { ...TOHUM };
  const tanim = JSON.parse(TOHUM["tanimlar:data"]);
  tanim.bedenler = BEDENLER.map((b, i) => ({ id: "bb" + i, ad: b }));
  t["tanimlar:data"] = JSON.stringify(tanim);
  const stok = JSON.parse(TOHUM["stok:items"]);
  stok.push({
    id: "m102", ad: "102 Bayan Bot", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    variants: BEDENLER.map((b) => ({ renk: "Siyah", beden: b, miktar: 50 })),
    hareketler: [], recete: [], birimFiyat: 500,
  });
  t["stok:items"] = JSON.stringify(stok);
  // 36 bedeninde 21 = 19 koli × 1 + 2 kolisiz.
  const siparisMiktar = { 36: 21, 37: 38, 38: 38, 39: 38, 40: 19 };
  t["siparis:data"] = JSON.stringify([{
    id: "s1001", siparisNo: "SAT-1001", tip: "Satış", cariId: "c2", durum: "Onaylandı",
    tarih: "2026-09-01", teslimTarihi: "2026-09-20", teslimSayaci: 0,
    kalemler: BEDENLER.map((b) => ({
      id: "k" + b, urunId: "m102", urunAd: "102 Bayan Bot", renk: "Siyah", beden: b,
      miktar: siparisMiktar[b], karsilanan: 0, birim: "çift", birimFiyat: 500, paraBirimi: "TRY",
    })),
  }]);
  // 19 koli, depoda KARIŞIK SIRADA (tersten): "adet kadar ekle" kolileri KOD sırasıyla almalı (v1.505.0'da
  // düzeltildi — önce depodaki sırayla alıyordu). Beklenen yine K-01..K-03.
  const kodlar = Array.from({ length: 19 }, (_, i) => `K-${String(19 - i).padStart(2, "0")}`);
  t["koli:data"] = JSON.stringify(kodlar.map((kod) => ({
    id: "koli-" + kod, kod, durum: "Hazır", olusturma: "2026-09-01T08:00:00.000Z",
    siparisId: "s1001", cariId: "c2", uretimId: "", not: "",
    kalemler: BEDENLER.map((b) => ({ urunId: "m102", urunAd: "102 Bayan Bot", renk: "Siyah", beden: b, adet: ASORTI[b] })),
  })));

  const hatalar = [];
  // Sipariş kartından satış fişini açıp "Siparişten seç"i açar (iki oturumda aynı yol).
  const fisiAc = async () => {
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-durum-cip=\"Tümü\"]:visible").first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) =>
      e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "SAT-1001" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-fis-olustur]:visible").first().click();
  await sayfa.waitForTimeout(900);
  await sayfa.locator("[data-siparisten-sec]:visible").first().click();
  await sayfa.waitForTimeout(400);
  return { tarayici, sayfa };
  };
  let { tarayici, sayfa } = await fisiAc();

  // Paneldeki durumun özeti — her adımdan sonra aynı gözle bakılıyor. `kalanli`: altta duran KOLİSİZ
  // matris + "Kolisiz kalanı ekle" de alınsın mı. v1.508.0: kolide ve kolisiz AYRI (kullanıcı: "ikisinin
  // toplamı toplam adedi versin") — matris açılışta da yalnız kolisiz 2 çifti gösteriyor.
  const panel = (kalanli = false) => sayfa.evaluate((kalanli) => {
    const sip = document.querySelector('[data-siparisten-sec-siparis="SAT-1001"]');
    const ozet = sip ? ([...sip.querySelectorAll("span")].find((e) => /^Hazır koliler/.test(e.textContent.trim())) || {}).textContent : null;
    const gruplar = [...document.querySelectorAll("[data-koli-grup]")].map((g) =>
      `${g.querySelector("b").textContent} · ${g.getAttribute("data-koli-grup")} · düğme "${(g.querySelector("[data-koli-grup-ekle]") || {}).textContent.trim()}"`);
    const fisKoli = document.querySelector("[data-fis-koliler] b");
    return {
      siparisListede: !!sip,
      durumKalan: sip ? (sip.querySelector("span.mono") || {}).textContent : null,
      ozet: ozet ? ozet.trim() : null,
      gruplar,
      kodDugmesi: document.querySelectorAll("[data-siparis-koli-ekle]").length,
      tumunuEkle: !!document.querySelector("[data-siparis-koli-tumu]"),
      ...(kalanli ? {
      kolisizDugme: ((document.querySelector('[data-siparisten-ekle="SAT-1001"]') || {}).textContent || "").trim() || null,
      kalanMatris: sip && sip.querySelector("table") ? [...sip.querySelectorAll("table tr")].map((tr) => [...tr.children].map((c) => c.textContent.trim()).join(" | ")) : [],
      } : {}),
      fistekiKoliler: fisKoli ? fisKoli.textContent : null,
      fistekiKodlar: [...document.querySelectorAll("[data-fis-koli]")].map((e) => e.getAttribute("data-fis-koli")),
    };
  }, kalanli);

  const acilis = await panel(true);

  // 2) tek tek seç → bir koli
  await sayfa.locator("[data-koli-grup-ac]:visible").first().click();
  await sayfa.waitForTimeout(300);
  const tekTekAcik = await panel();
  await sayfa.locator('[data-siparis-koli-ekle="K-05"]').first().click();
  await sayfa.waitForTimeout(500);
  const tekKoliSonrasi = await panel();

  // 3) adet kutusu 3
  await sayfa.locator("[data-koli-grup-adet]:visible").first().fill("3");
  await sayfa.waitForTimeout(250);
  const adetYazilinca = await sayfa.evaluate(() => (document.querySelector("[data-koli-grup-ekle]") || {}).textContent.trim());
  await sayfa.locator("[data-koli-grup-ekle]:visible").first().click();
  await sayfa.waitForTimeout(500);
  const ucKoliSonrasi = await panel();

  // 4) Tümünü ekle
  await sayfa.locator("[data-siparis-koli-tumu]:visible").first().click();
  await sayfa.waitForTimeout(600);
  const tumuSonrasi = await panel(true);
  await sayfa.locator('[data-siparisten-ekle="SAT-1001"]:visible').first().click();
  await sayfa.waitForTimeout(500);
  const kolisizSonrasi = await panel(true);
  const fisSatirlari = await sayfa.evaluate(() => document.querySelectorAll("[data-fis-miktar]").length);

  // 5) Kaydet + onay
  await sayfa.locator("[data-fis-kaydet]:visible").first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-fis-onay-evet]").first().click();
  await sayfa.waitForTimeout(1800);

  const koliler = (await depoOku(sayfa, "koli:data")) || [];
  const durumlar = {};
  koliler.forEach((k) => { durumlar[k.durum] = (durumlar[k.durum] || 0) + 1; });
  const sevkFisleri = [...new Set(koliler.map((k) => k.sevkFisNo || "(yok)"))];
  const bot = ((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "m102") || {};
  const stokSonra = (bot.variants || []).map((v) => `${v.beden}=${v.miktar}`).join(" ");
  const sip = ((await depoOku(sayfa, "siparis:data")) || []).find((s) => s.id === "s1001") || {};
  const karsilanan = (sip.kalemler || []).map((k) => `${k.beden}=${k.karsilanan || 0}`).join(" ");

  await tarayici.close();

  // 6) YENİ OTURUM — KOLİSİZ ÖNCE (v1.508.0): hiç koli eklenmeden "Kolisiz kalanı ekle" yalnız 2 çifti eklemeli;
  // ardından "Tümünü ekle" kolileri ekleyince sipariş kalanı tam kapanmalı (önce 154 + 152 = çift ekleniyordu).
  ({ tarayici, sayfa } = await fisiAc());
  await sayfa.locator('[data-siparisten-ekle="SAT-1001"]:visible').first().click();
  await sayfa.waitForTimeout(500);
  const kolisizOnce = { sonra: await panel(true) };
  await sayfa.locator("[data-siparis-koli-tumu]:visible").first().click();
  await sayfa.waitForTimeout(600);
  kolisizOnce.tumuSonrasi = await panel(true);
  await tarayici.close();

  return {
    hatalar,
    kolisizOnce,
    acilis, tekTekAcik: { kodDugmesi: tekTekAcik.kodDugmesi },
    tekKoliSonrasi, adetYazilinca, ucKoliSonrasi, tumuSonrasi, kolisizSonrasi, fisSatirlari,
    kayit: { durumlar, sevkFisSayisi: sevkFisleri.length, sevkFisi: sevkFisleri[0], stokSonra, karsilanan, siparisDurum: sip.durum },
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
