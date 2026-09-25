// SENARYO — Cari kartından ALIŞ FİŞİ kesme (`stokFisiKaydet` yolu).
//
// Bu bir "altın çıktı" testi: senaryo çalıştırılır, ortaya çıkan stok ve cari kayıtları
// normalleştirilip (rastgele kimlikler ve zaman damgaları sabitlenir) basılır. Refaktörden önce
// ve sonra alınan çıktılar BİREBİR aynı olmalı; fark varsa refaktör davranışı değiştirmiştir.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");

// Rastgele değerleri sabitler: hrk_xxx kimlikleri sırayla numaralanır, ISO zaman damgaları
// ve bugünün tarihi sabit metne çevrilir. Kalanı birebir karşılaştırılabilir.
// Anahtarlar SIRALANIYOR: nesne anahtarlarının sırası anlam taşımaz (bulut eşlemesi ada göre),
// ama sıra değişikliği diff'i okunmaz yapar. Sıralayınca diff yalnızca GERÇEK farkları gösterir.
function anahtarSirala(x) {
  if (Array.isArray(x)) return x.map(anahtarSirala);
  if (x && typeof x === "object") {
    const y = {};
    Object.keys(x).sort().forEach((k) => { y[k] = anahtarSirala(x[k]); });
    return y;
  }
  return x;
}

// ÜRÜN SEÇİMİ (18 Eylül): açılır liste yerine datalist'li arama kutusu. Kutuya ürünün TAM
// etiketi yazılıyor (kategori/birim ekli olabilir), o yüzden etiket listeden okunuyor.
async function urunEtiketiBul(sayfa, ad) {
  return sayfa.evaluate((a) => {
    const dl = document.getElementById("fis-urun-listesi");
    const o = dl ? [...dl.options].find((x) => x.value === a || x.value.includes(a)) : null;
    return o ? o.value : a;
  }, ad);
}

function normalles(veri, sirala = true) {
  let s = JSON.stringify(sirala ? anahtarSirala(veri) : veri, null, 1);
  const kimlikler = new Map();
  s = s.replace(/[a-z]+-[a-z0-9]{6,}-[a-z0-9]{3,}/g, (k) => {
    if (!kimlikler.has(k)) kimlikler.set(k, `#${kimlikler.size + 1}`);
    return kimlikler.get(k);
  });
  s = s.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, "<zaman>");
  s = s.replace(/\d{4}-\d{2}-\d{2}/g, "<tarih>");
  s = s.replace(/(MH|AF|SF|OTO)-\d+-[A-Z0-9]+/g, "<fisno>");
  // TARİH TAŞIYAN FİŞ NUMARASI (23 Eylül): cari fişleri "AF-0923001" biçiminde — AF + AAGG + sıra.
  // Normalleştirilmezse altın çıktılar ERTESİ GÜN kendiliğinden kırılırdı (AF-0924001). Sıra numarası
  // korunuyor: aynı fişte olma / farklı fişte olma ayrımı testin konusu.
  s = s.replace(/\b(AF|SF)-\d{4}(\d{3})\b/g, "<fisno-$2>");
  // Açılış göçünün (16 Eylül) fiş numarası her koşuda rastgele son ek taşıyor: ACL-20260916-02DRR2.
  // Altın çıktıların her koşuda değişmemesi için normalleştiriliyor.
  // 17 Eylül: numara biçimi kısaldı (ACL-0917 02XY). Eski uzun biçim de normalleştiriliyor,
  // eski altın çıktılar okunabilir kalsın.
  s = s.replace(/ACL-\d{4}(-)?[A-Z0-9]{6}/g, "<acilis-fisno>");
  s = s.replace(/ACL-\d{8}-[A-Z0-9]+/g, "<acilis-fisno>");
  return s;
}

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc(TOHUM, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2000);

  await sayfa.getByRole("button", { name: "Cari", exact: true }).click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator('button:has-text("Tedarikçi A")').nth(1).click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator('[data-cari-fis-ac="Alış"]').first().click();
  await sayfa.waitForTimeout(600);

  // Fiş numarası ELLE veriliyor: üretilen numara rastgele olur, karşılaştırma yapılamazdı.
  await sayfa.locator('input[placeholder="Boşsa sistem üretir"]').fill("AF-TEST");

  // 1. kalem: Deri · Siyah · 3 metre × 150 ₺
  await sayfa.locator("[data-urun-arama]").first().fill(await urunEtiketiBul(sayfa, "Deri"));
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-renk-arama]").first().fill("Siyah");
  await sayfa.waitForTimeout(300);
  // 18 Eylül: miktar kutusu ölçünün yanına alındı, sıra değişti — kutular artık işaretle
  // bulunuyor (`data-kalem-fiyat` / `data-kalem-miktar`), sırayla değil.
  await sayfa.locator("[data-kalem-fiyat]:visible").first().fill("150");
  await sayfa.locator("[data-kalem-miktar]:visible").first().fill("3");
  await sayfa.locator("[data-kalemlere-ekle]:visible").first().click();
  await sayfa.waitForTimeout(400);

  // 2. kalem: Bot · Siyah · bedenlere 2 ve 1 çift × 900 ₺ (beden matrisi bu yolda da çalışmalı)
  await sayfa.locator("[data-urun-arama]").first().fill(await urunEtiketiBul(sayfa, "Bot"));
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-renk-arama]").first().fill("Siyah");
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-kalem-fiyat]:visible").first().fill("900");
  await sayfa.locator('[data-kalem-miktar="40"]:visible').first().fill("2");
  await sayfa.locator('[data-kalem-miktar="41"]:visible').first().fill("1");
  await sayfa.locator("[data-kalemlere-ekle]:visible").first().click();
  await sayfa.waitForTimeout(400);

  await sayfa.locator("[data-fis-kaydet]").first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-fis-onay-evet]").first().click();   // ONAY ADIMI (v1.431.0)
  await sayfa.waitForTimeout(1200);

  // SATIŞ FİŞİ — aynı kapıdan geçen ikinci tip. Yön (Borç/Alacak) burada görünür.
  await sayfa.locator(`button:has-text("Müşteri B")`).last().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator('[data-cari-fis-ac="Satış"]').first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator('input[placeholder="Boşsa sistem üretir"]').fill("SF-TEST");
  await sayfa.locator("[data-urun-arama]").first().fill(await urunEtiketiBul(sayfa, "Bot"));
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-renk-arama]").first().fill("Siyah");
  await sayfa.waitForTimeout(300);
  await sayfa.locator("[data-kalem-fiyat]:visible").first().fill("1200");
  await sayfa.locator('[data-kalem-miktar="40"]:visible').first().fill("4");   // stok 7'den 3'e
  await sayfa.locator("[data-kalemlere-ekle]:visible").first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-fis-kaydet]").first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-fis-onay-evet]").first().click();   // ONAY ADIMI (v1.431.0)
  await sayfa.waitForTimeout(1200);

  const stok = await depoOku(sayfa, "stok:items");
  const cariler = await depoOku(sayfa, "cari:data");

  // GERİ AL (ERP standardı, 21 Eylül): satış fişinin toast'unda "Geri al" var; basınca fiş
  // geri alınır — stok 3'ten 7'ye döner, cari hareketi kalkar. Toast sol altta.
  const geriAlDugmesi = await sayfa.evaluate(() => {
    const b = document.querySelector("[data-toast-geri-al]");
    if (!b) return null;
    const t = b.closest("[data-toast]") || b.parentElement;
    const r = t.getBoundingClientRect();
    return { var: true, solda: r.left < window.innerWidth / 2 };
  });
  await sayfa.evaluate(() => { const b = document.querySelector("[data-toast-geri-al]"); if (b) b.click(); });
  await sayfa.waitForTimeout(1200);
  const stokSonra = await depoOku(sayfa, "stok:items");
  const geriAlindi = {
    botSiyah40: (() => { const p = (stokSonra || []).find((x) => x.id === "u2"); const v = p && p.variants.find((x) => x.renk === "Siyah" && x.beden === "40"); return v ? v.miktar : null; })(),
  };
  await tarayici.close();

  return {
    geriAlDugmesi, geriAlindi,
    hatalar,
    stok: (stok || []).map((p) => ({ ad: p.ad, variants: p.variants, hareketler: p.hareketler })),
    cariler: (cariler || []).map((c) => ({ unvan: c.unvan, hareketler: c.hareketler })),
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    // Anahtar sırası okunabilirlik için sıralanıyor; sıra değişikliği DAVRANIŞ değiştirmez
    // (bulut eşlemesi ada göre). Yine de gözden kaçmasın diye sırasız hâlin özeti de basılıyor.
    const sirasiz = require("crypto").createHash("sha256")
      .update(normalles(s, false)).digest("hex").slice(0, 12);
    console.log(normalles(s));
    console.log("sırasız özet: " + sirasiz);
  });
}

module.exports = { calistir, normalles, anahtarSirala };
