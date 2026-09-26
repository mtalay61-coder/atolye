// SENARYO — KAYDEDİLMİŞ SİPARİŞİ DÜZENLEME (sipariş formuyla, v1.446.0).
//
// Kullanıcı (6 Eylül): "Kaydedilmiş siparişi düzenlemek yok, düzenleme ekleyelim."
// Kullanıcı (25 Eylül): "Düzenle deyince arkada yeni sipariş girişi gibi çalışıyor ve üstteki
// ekranı kapatman gerekiyor. Yeni sipariş gibi hareket edecek ama altta girilenler gösterecek ve
// girilenler de düzenlenebilir olacak: renk, adet, stok gibi değiştirilebilir (planlananlar
// değişemez)."
//
// Ölçülenler:
//   0. Kartın kendisinde düzenleme kutusu YOK (düzenleme formda).
//   1. ✎ Düzenle formu tam ekran kartın ÖNÜNDE açıyor (ekranın ortasındaki öğe forma ait).
//   2. Form başlığı siparişten dolu; teslimat yapılmış siparişte cari KİLİTLİ.
//   3. Girilmiş kalemler altta: kilitli (karşılanmış) satır ayrı ve salt okunur; serbest
//      satırlarda ürün/renk seçicisi, miktar ve fiyat kutusu var.
//   4. Serbest kalemde miktar, fiyat, ÜRÜN ve RENK değişiyor; yeni ürün aynı formdan ekleniyor.
//   5. Kaydedince: sipariş yerinde güncelleniyor, kilitli kalem ve cari aynen korunuyor, form
//      kapanıyor ve tam ekran kart görünür kalıyor.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  // Ürün değiştirmeyi ölçmek için ikinci bir mamul: Taba'sı YOK, Kahve'si var.
  stok.push({ id: "u3", ad: "Çizme", kategori: "Mamul", birim: "çift", birimFiyat: 500, hareketler: [],
    variants: [{ renk: "Siyah", beden: "40", miktar: 0 }, { renk: "Kahve", beden: "40", miktar: 0 }, { renk: "Kahve", beden: "41", miktar: 0 }] });
  t["stok:items"] = JSON.stringify(stok);
  t["siparis:data"] = JSON.stringify([
    {
      id: "sd1", siparisNo: "SAT-D1", tip: "Satış", cariId: "c2", durum: "Onaylandı",
      tarih: "2026-09-01", teslimTarihi: "2026-09-20", not: "ilk not", musteriKodu: "",
      kalemler: [
        // TEMİZ kalem — düzenlenebilmeli.
        { id: "kd1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 5, karsilanan: 0, birim: "çift", birimFiyat: 400, paraBirimi: "TRY" },
        // KARŞILANMIŞ kalem — kilitli olmalı.
        { id: "kd2", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 4, karsilanan: 2, birim: "çift", birimFiyat: 400, paraBirimi: "TRY" },
        // TEMİZ, ürün kartında artık olmayan renk (Taba) — "(listede yok)" olarak görünmeli.
        { id: "kd3", urunId: "u2", urunAd: "Bot", renk: "Taba", beden: "40", miktar: 3, karsilanan: 0, birim: "çift", birimFiyat: 350, paraBirimi: "TRY" },
      ],
    },
  ]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);

  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(600);
  // Durum süzgeci varsayılan "Bekliyor"; sipariş "Onaylandı" olduğu için önce "Tümü" seçiliyor.
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => {
    const d = [...document.querySelectorAll("div")]
      .filter((x) => x.textContent.includes("SAT-D1") && x.getBoundingClientRect().width > 0)
      .pop();
    if (d) d.click();
  });
  await sayfa.waitForTimeout(700);
  await sayfa.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await sayfa.waitForTimeout(800);

  // 0. KARTTA KUTU YOK.
  const kartKutusu = await sayfa.evaluate(() => ({
    miktar: document.querySelectorAll('[data-siparis-karti] input[title^="Sipariş miktarı"]').length,
    fiyat: document.querySelectorAll('[data-siparis-karti] input[title^="Birim fiyat"]').length,
    sil: document.querySelectorAll('[data-siparis-karti] button[title="Bu kalemi sil"]').length,
  }));

  // 1. ✎ Düzenle → form ÖNDE.
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => /^Düzenle/.test(x.title || "") && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(600);
  const formOnde = await sayfa.evaluate(() => {
    const form = document.querySelector('[data-siparis-duzenleme="sd1"]');
    if (!form) return { formVar: false };
    const orta = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return {
      formVar: true,
      ortadakiFormda: form.contains(orta),
      baslik: /Satış siparişi düzenleniyor/.test(form.textContent) && /SAT-D1/.test(form.textContent),
      kaydetDugmesi: !!form.querySelector("[data-siparis-duzenle-kaydet]"),
    };
  });

  // 2. Başlık dolu, cari kilitli.
  const baslikDolu = await sayfa.evaluate(() => {
    const form = document.querySelector('[data-siparis-duzenleme="sd1"]');
    const cari = form.querySelector("[data-siparis-cari]");
    return {
      cari: cari.value, cariKilitli: cari.disabled,
      tarihler: [...form.querySelectorAll('input[type="date"]')].map((i) => i.value),
      notVar: [...form.querySelectorAll("input")].some((i) => i.value === "ilk not"),
    };
  });

  // 3. Satırlar.
  const satirlar = await sayfa.evaluate(() => [...document.querySelectorAll("[data-form-kalem-satiri]")].map((tr) => ({
    tur: tr.getAttribute("data-form-kalem-satiri"),
    urunSecici: !!tr.querySelector("[data-form-kalem-urun]"),
    renk: (tr.querySelector("[data-form-kalem-renk]") || {}).value || null,
    renkSecenekleri: [...((tr.querySelector("[data-form-kalem-renk]") || {}).options || [])].map((o) => o.textContent),
    miktarKutusu: tr.querySelectorAll('input[type="number"]').length,
    silDugmesi: tr.querySelectorAll('button[title="Bu bedeni sil"]').length,
  })));

  // 4a. Siyah (serbest) satırda miktar 5 → 8.
  const siyahSerbest = sayfa.locator('tr[data-form-kalem-satiri="serbest"]').first();
  const miktarKutusu = siyahSerbest.locator('input[type="number"]').first();
  await miktarKutusu.fill("8");
  await miktarKutusu.blur();
  await sayfa.waitForTimeout(300);

  // 4b. Taba satırı: ÜRÜN → Çizme (Taba Çizme'de yok → renk boşalır), sonra renk → Kahve, fiyat 375.
  const tabaSatiri = sayfa.locator('tr[data-form-kalem-satiri="serbest"]').nth(1);
  await tabaSatiri.locator("[data-form-kalem-urun]").selectOption("u3");
  await sayfa.waitForTimeout(300);
  const renkBosaldi = await sayfa.evaluate(() => {
    const tr = document.querySelectorAll('tr[data-form-kalem-satiri="serbest"]')[1];
    return (tr.querySelector("[data-form-kalem-renk]") || {}).value;
  });
  // Renk seçilmeden kaydetmek reddedilmeli.
  await sayfa.locator("[data-siparis-duzenle-kaydet]").click();
  await sayfa.waitForTimeout(400);
  const renksizRed = await sayfa.evaluate(() => /Çizme: renk seçin/.test(document.body.innerText));
  const renksizKayitYok = ((await depoOku(sayfa, "siparis:data")) || [])[0].kalemler.every((k) => k.urunId === "u2");
  await sayfa.locator('tr[data-form-kalem-satiri="serbest"]').nth(1).locator("[data-form-kalem-renk]").selectOption("Kahve");
  await sayfa.waitForTimeout(300);
  const fiyatKutusu = sayfa.locator('tr[data-form-kalem-satiri="serbest"]').nth(1).locator('input[type="number"]').last();
  await fiyatKutusu.fill("375");
  await fiyatKutusu.blur();
  await sayfa.waitForTimeout(300);

  // 4c. YENİ ÜRÜN aynı formdan: Çizme · Siyah · 40 × 2.
  await sayfa.locator('[data-siparis-duzenleme] input[placeholder="Model ara…"]').first().click();
  await sayfa.waitForTimeout(300);
  // Seçim `onMouseDown`da: gerçek fare tıklaması gerekiyor.
  await sayfa.locator("[data-siparis-duzenleme] button", { hasText: "Çizme" }).first().click();
  await sayfa.waitForTimeout(400);
  // v1.469.0: renk yazarak seçiliyor (resimli liste) — yaz, öneriye dokun.
  const renkKutusu = sayfa.locator("[data-siparis-duzenleme] [data-siparis-renk-arama]").first();
  await renkKutusu.click();
  await renkKutusu.fill("siy");
  await sayfa.waitForTimeout(200);
  await sayfa.locator('[data-siparis-duzenleme] [data-aramali-oneri="Siyah"]').first().dispatchEvent("mousedown");
  await sayfa.waitForTimeout(300);
  await sayfa.locator('[data-olcu-miktar="40"]').fill("2");
  await sayfa.locator("[data-kalemlere-ekle]:visible").first().click();
  await sayfa.waitForTimeout(400);

  // Başlık: teslim tarihi ve not.
  await sayfa.locator('[data-siparis-duzenleme] input[type="date"]').last().fill("2026-10-15");
  const notKutusu = sayfa.locator('[data-siparis-duzenleme] input[placeholder="Opsiyonel"]').first();
  await notKutusu.fill("düzeltilmiş not");
  await sayfa.waitForTimeout(200);

  // 5. Kaydet.
  await sayfa.locator("[data-siparis-duzenle-kaydet]").click();
  await sayfa.waitForTimeout(1000);
  const sonra = await sayfa.evaluate(() => ({
    formKapandi: !document.querySelector("[data-siparis-duzenleme]"),
    kartGorunur: [...document.querySelectorAll('[data-siparis-karti="sd1"]')].some((d) => d.getBoundingClientRect().width > 0),
  }));
  const sipSon = ((await depoOku(sayfa, "siparis:data")) || []).find((x) => x.id === "sd1") || {};

  // DURUM GÖSTERİLİYOR, SEÇİLMİYOR (7 Eylül).
  const durumGosterimi = await sayfa.evaluate(() => ({
    seciciVar: [...document.querySelectorAll("select")]
      .some((x) => [...x.options].some((o) => /Kısmi Teslim/.test(o.textContent))),
    rozet: (() => {
      const r = [...document.querySelectorAll("span")].find((x) => /hareketlerinden hesaplan/.test(x.title || ""));
      return r ? r.textContent.trim() : null;
    })(),
  }));

  await tarayici.close();
  return {
    hatalar,
    kartKutusu,
    formOnde,
    baslikDolu,
    satirlar,
    renkBosaldi,
    renksizRed,
    renksizKayitYok,
    sonra,
    durumGosterimi,
    kalemler: (sipSon.kalemler || []).map((k) => `${k.id.startsWith("kd") ? k.id : "yeni"}:${k.urunAd}:${k.renk}:${k.beden}:${k.miktar}:${k.birimFiyat}:${k.karsilanan || 0}`),
    baslik: { teslimTarihi: sipSon.teslimTarihi, not: sipSon.not },
    cariKorundu: sipSon.cariId === "c2",
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
