// SENARYO — SATIŞ FİŞİNDE KOLİ GRUPLAMA (23 Eylül, v1.424.0; v1.425.0'dan beri koliler ELLE okutuluyor)
// (27 Eylül, yeniden yazıldı — dosya taşımada kaybolmuştu)
//
// Kullanıcı (ekran görüntüsü): üç aynı-asortili koli tek satırda "KOLİ İÇ. MİK. 8 × KOLİ ADET 3 =
// TOP. ADET 24 Çift" görünsün; farklı asorti alt satırda toplansın.
//
// Kurulum: 125 Model Siyah 36-40 (her beden 10). SAT-9 (Müşteri B, 900 ₺/çift).
//   K-1, K-2, K-3: 36:1 37:2 38:2 39:2 40:1 (= 8 çift, aynı asorti imzası)
//   K-4:           36:2 37:2               (= 4 çift, farklı imza)
//
// Ölçülenler:
//   1. Sipariş kartından boş fiş; 4 koli okutulunca "4 koli · 28 çift".
//   2. Tablo 2 satır: [8 / 3 / 24 çift / 21.600] ve [4 / 1 / 4 çift / 3.600]; beden hücreleri koli
//      içeriğini (koli BAŞINA) gösterir ve SALT OKUNUR (girdi yok); KOLİ ADET hücresi koli kodlarını
//      title'da taşır. Sütunlar yalnız fişte koli varsa görünür.
//   3. Kayıt: 4 koli "Sevk edildi" (aynı fiş), stok bütün bedenlerde doğru düşer
//      (36:10→5, 37:10→2, 38:10→4, 39:10→4, 40:10→7), karşılanan kolilerin toplamı.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

const BEDENLER = ["36", "37", "38", "39", "40"];

function tohumKur() {
  const t = { ...TOHUM };
  const tan = JSON.parse(t["tanimlar:data"]);
  // Tohumda yalnız 40-42 var; kolilerdeki bedenler tanımlı olsun.
  ["36", "37", "38", "39"].forEach((b, i) => { if (!tan.bedenler.some((x) => x.ad === b)) tan.bedenler.push({ id: `bk${i}`, ad: b }); });
  t["tanimlar:data"] = JSON.stringify(tan);
  const stok = JSON.parse(t["stok:items"]);
  stok.push({
    id: "m1", ad: "125 Model", kategori: "Mamul", birim: "çift", olcuTipi: "Beden",
    variants: BEDENLER.map((beden) => ({ renk: "Siyah", beden, miktar: 10 })),
    hareketler: [], recete: [], birimFiyat: 465, satisFiyati: 900,
  });
  t["stok:items"] = JSON.stringify(stok);
  const sipMiktar = { 36: 5, 37: 8, 38: 6, 39: 6, 40: 3 };   // = kolilerin toplamı
  t["siparis:data"] = JSON.stringify([{
    id: "s9", siparisNo: "SAT-9", tip: "Satış", cariId: "c2", durum: "Onaylandı",
    tarih: "2026-09-01", teslimTarihi: "2026-09-20", teslimSayaci: 0,
    kalemler: BEDENLER.map((beden, i) => ({ id: `k${i + 1}`, urunId: "m1", urunAd: "125 Model", renk: "Siyah", beden,
      miktar: sipMiktar[beden], karsilanan: 0, birim: "çift", birimFiyat: 900, paraBirimi: "TRY" })),
  }]);
  const koli = (n, dagilim) => ({ id: `koli-${n}`, kod: `K-${n}`, durum: "Hazır", olusturma: "2026-09-21T08:00:00.000Z",
    siparisId: "s9", cariId: "c2", uretimId: "", not: "",
    kalemler: Object.entries(dagilim).map(([beden, adet]) => ({ urunId: "m1", urunAd: "125 Model", renk: "Siyah", beden, adet })) });
  const asorti = { 36: 1, 37: 2, 38: 2, 39: 2, 40: 1 };
  t["koli:data"] = JSON.stringify([koli(1, asorti), koli(2, asorti), koli(3, asorti), koli(4, { 36: 2, 37: 2 })]);
  return t;
}

async function calistir() {
  const hatalar = [];
  const { tarayici, sayfa } = await uygulamaAc(tohumKur(), { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);

  // Sipariş kartı → "Satış Fişi Oluştur" (fiş BOŞ açılır, v1.425.0).
  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-durum-cip="Tümü"]:visible').first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) =>
      e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "SAT-9" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-fis-olustur]:visible").first().click();
  await sayfa.waitForTimeout(900);

  // Fiş tablosunu başlıklarıyla okur: her satır { BAŞLIK: hücre }. Beden hücresinde girdi varsa
  // "girdi:<değer>", salt okunur span ise düz metin — salt okunurluk böyle ölçülüyor.
  const tabloOku = () => sayfa.evaluate(() => {
    const tablo = [...document.querySelectorAll("table")].find((t) => /TOP\. ADET/.test((t.querySelector("thead") || {}).textContent || ""));
    if (!tablo) return null;
    const basliklar = [...tablo.querySelectorAll("thead th")].map((th) => th.textContent.trim());
    const satirlar = [...tablo.querySelectorAll("tbody tr")].filter((tr) => tr.children.length === basliklar.length).map((tr) => {
      const o = {};
      [...tr.children].forEach((td, i) => {
        const girdi = td.querySelector("input");
        const baslik = basliklar[i] || String(i);
        if (!baslik) return;   // sil düğmesi sütunu
        const secim = td.querySelector("select");
        const rozetler = [...td.querySelectorAll("[data-fis-satir-siparis]")].map((r) => r.getAttribute("data-fis-satir-siparis"));
        o[baslik] = girdi ? `girdi:${girdi.value}` : secim ? `secim:${secim.value}`
          : rozetler.length ? `${td.firstChild.textContent.trim()} [sipariş ${rozetler.join(",")}]`
          : td.textContent.replace(/\s+/g, " ").trim();
        if (baslik === "KOLİ ADET" && td.getAttribute("title")) o["KOLİ KODLARI"] = td.getAttribute("title");
      });
      return o;
    });
    return { basliklar: basliklar.filter(Boolean), satirlar };
  });

  const okut = async (kod) => {
    await sayfa.locator("[data-koli-okut]:visible").first().fill(kod);
    await sayfa.locator("[data-barkod-ekle]:visible").first().click();
    await sayfa.waitForTimeout(500);
  };
  for (const kod of ["K-1", "K-2", "K-3", "K-4"]) await okut(kod);
  const fis = await sayfa.evaluate(() => ({
    koliOzeti: ((document.querySelector("[data-fis-koliler] b") || {}).textContent || null),
    koliler: [...document.querySelectorAll("[data-fis-koli]")].map((e) => e.getAttribute("data-fis-koli")),
  }));
  const tablo = await tabloOku();

  await sayfa.locator("[data-fis-kaydet]:visible").first().click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator("[data-fis-onay-evet]").first().click();   // ONAY ADIMI (v1.431.0)
  await sayfa.waitForTimeout(1500);

  const m1 = ((await depoOku(sayfa, "stok:items")) || []).find((u) => u.id === "m1") || {};
  const sip = ((await depoOku(sayfa, "siparis:data")) || [])[0] || {};
  const koliler = (await depoOku(sayfa, "koli:data")) || [];
  const cari = ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c2") || {};
  const fisNolari = [...new Set(koliler.map((k) => k.sevkFisNo))];
  await tarayici.close();
  return {
    hatalar, fis, tablo,
    kayit: {
      stok: (m1.variants || []).map((v) => `${v.beden}=${v.miktar}`).join(" "),
      varyantSayisi: (m1.variants || []).length,
      karsilanan: (sip.kalemler || []).map((k) => `${k.beden}=${k.karsilanan || 0}/${k.miktar}`).join(" "),
      koliler: koliler.map((k) => `${k.kod} ${k.durum}`),
      tekFis: fisNolari.length === 1 && !!fisNolari[0],
      cariToplam: (cari.hareketler || []).filter((h) => h.fisNo === fisNolari[0]).reduce((t, h) => t + (h.tutar || 0), 0),
    },
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
