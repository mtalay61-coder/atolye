// SENARYO — SİPARİŞ DÜZENLERKEN ÜRÜN EKLEME (24 Eylül, v1.442.0; akış v1.446.0'da değişti).
// (27 Eylül, yeniden yazıldı — dosya taşımada kaybolmuştu)
//
// Kullanıcı: "Sipariş düzenle deyince stok ekleme de olsun; yarın kalan sipariş üzerine devam
// etmek için önemli."
// v1.442'de düzenleme kutularının yanına ayrı bir "Ürün ekle" düğmesi (`data-siparis-urun-ekle`)
// konmuştu; v1.446.0'dan beri (SİPARİŞ DÜZENLEME FORMDA) düzenleme SİPARİŞ FORMUNUN kendisinde ve
// ürün ekleme aynı formun "Kalem Ekle" alanından — ayrı düğme ve `sipariseKalemEklemeyeBasla`
// kaldırıldı (tek yol). Senaryo bugünkü akışı ölçüyor; eski senaryonun sürülemeyen kısmı (aramalı
// seçiciden ürün seçip kalemi kaydetmek) artık `mousedown` ile sürülüyor.
//
// Ölçülenler:
//   1. Tam ekran kartta ✎ → form "Satış siparişi düzenleniyor · SAT-7001" başlığıyla açılıyor,
//      içinde "Kalem Ekle" alanı (model arama) var; eski ayrı düğme yok.
//   2. Bot · Taba 41 × 3 eklenince formda mevcut Siyah satırının yanında yeni satır doğuyor.
//   3. Kaydedince kalem AYNI siparişe yazılıyor: sipariş sayısı değişmiyor, yeni sipariş no yok,
//      mevcut kalem (kimliği ve miktarı) bozulmuyor.
//   4. "Tamamlandı" siparişe yeni kalem eklenemiyor: kaydetme sebebini söyleyip reddediyor, kayıt aynı.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

function tohumHazirla() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  const bot = stok.find((p) => p.id === "u2");
  bot.variants = [...bot.variants, ...["40", "41", "42"].map((b) => ({ renk: "Taba", beden: b, miktar: 0, minStok: 0 }))];
  t["stok:items"] = JSON.stringify(stok);
  t["siparis:data"] = JSON.stringify([
    { id: "se1", siparisNo: "SAT-7001", tip: "Satış", cariId: "c2", durum: "Onaylandı",
      tarih: "2026-09-01", teslimTarihi: "2026-09-20", not: "", musteriKodu: "",
      kalemler: [{ id: "ke1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 5, karsilanan: 0, birim: "çift", birimFiyat: 400, paraBirimi: "TRY" }] },
    { id: "se2", siparisNo: "SAT-7002", tip: "Satış", cariId: "c2", durum: "Tamamlandı",
      tarih: "2026-09-01", teslimTarihi: "2026-09-20", not: "", musteriKodu: "",
      kalemler: [{ id: "ke2", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 2, karsilanan: 2, birim: "çift", birimFiyat: 400, paraBirimi: "TRY" }] },
  ]);
  return t;
}

const FORM = "[data-siparis-duzenleme]";

// Kart açma sırası: Tümü süzgeci → satırın tam ekran düğmesi → ✎ Düzenle (liste kartında yok).
async function duzenlemeyiAc(sayfa, no) {
  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /^Tümü\s*\(/.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(600);
  // Satırın kendi tam ekran düğmesi (`data-siparis-tam-ekran`): "ilk görünen Tam ekran" başka
  // siparişin kartını açabiliyordu.
  await sayfa.locator(`[data-siparis-tam-ekran="${no}"]:visible`).first().click();
  await sayfa.waitForTimeout(800);
  await sayfa.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /^Düzenle/.test(x.title || "") && x.getBoundingClientRect().width > 0);
    if (b) b.click();
  });
  await sayfa.waitForTimeout(600);
}

// Aramalı seçici öneriyi `onMouseDown` ile seçiyor — düz click değil (bkz. siparis-form-duzen).
async function kalemEkle(sayfa, urun, renk, olcu, miktar) {
  await sayfa.locator(`${FORM} input[placeholder="Model ara…"]`).first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator(`${FORM} button`, { hasText: urun }).first().dispatchEvent("mousedown");
  await sayfa.waitForTimeout(400);
  const k = sayfa.locator(`${FORM} [data-siparis-renk-arama]`).first();
  await k.click();
  await k.fill(renk.slice(0, 3).toLocaleLowerCase("tr-TR"));
  await sayfa.waitForTimeout(200);
  await sayfa.locator(`${FORM} [data-aramali-oneri="${renk}"]`).first().dispatchEvent("mousedown");
  await sayfa.waitForTimeout(300);
  await sayfa.locator(`${FORM} [data-olcu-miktar="${olcu}"]`).fill(String(miktar));
  await sayfa.locator(`${FORM} [data-kalemlere-ekle]`).click();
  await sayfa.waitForTimeout(400);
}

const formSatirlari = (sayfa) => sayfa.evaluate((F) => [...document.querySelectorAll(`${F} [data-form-kalem-satiri]`)].map((tr) => {
  const urun = tr.querySelector("[data-form-kalem-urun]");
  const renk = tr.querySelector("[data-form-kalem-renk]");
  const miktarlar = [...tr.querySelectorAll('button[title="Bu bedeni sil"]')].map((b) => b.parentElement.querySelector("input").value);
  // Ürün seçicisi <select>: değeri kimlik, görünen adı seçili seçenekte.
  const urunAd = urun ? (urun.selectedOptions ? urun.selectedOptions[0].textContent.trim() : urun.textContent.trim()) : "?";
  return `${urunAd} · ${renk ? renk.value : "?"}: ${miktarlar.join(",")}`;
}), FORM);

const kalemOzeti = (sp) => (sp.kalemler || []).map((k) => `${k.id.startsWith("ke") ? k.id : "yeni"} ${k.urunAd} · ${k.renk} · ${k.beden} × ${k.miktar}`);

async function calistir() {
  const hatalar = [];

  // ---- A) ONAYLANMIŞ SİPARİŞE ÜRÜN EKLE ----
  const { tarayici, sayfa } = await uygulamaAc(tohumHazirla(), { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2300);
  await duzenlemeyiAc(sayfa, "SAT-7001");

  const form = await sayfa.evaluate((F) => {
    const f = document.querySelector(F);
    if (!f) return null;
    // textContent: başlık CSS ile BÜYÜK harfe çevriliyor; innerText "İ"li hâli verir.
    const metin = f.textContent;
    return {
      baslik: (metin.match(/Satış siparişi düzenleniyor/) || [null])[0],
      siparisNo: metin.includes("SAT-7001"),
      kalemEkleAlani: /Kalem Ekle/.test(metin) && !!f.querySelector('input[placeholder="Model ara…"]'),
      eskiAyriDugme: document.querySelectorAll("[data-siparis-urun-ekle]").length,
    };
  }, FORM);
  const onceSatirlar = await formSatirlari(sayfa);
  await kalemEkle(sayfa, "Bot", "Taba", "41", 3);
  const sonraSatirlar = await formSatirlari(sayfa);
  await sayfa.locator("[data-siparis-duzenle-kaydet]").click();
  await sayfa.waitForTimeout(1000);
  const sipler = (await depoOku(sayfa, "siparis:data")) || [];
  const kayit = {
    siparisSayisi: sipler.length,
    siparisNolari: sipler.map((s) => s.siparisNo),
    sat7001: kalemOzeti(sipler.find((s) => s.id === "se1") || {}),
    formKapandi: (await sayfa.locator(FORM).count()) === 0,
  };
  await tarayici.close();

  // ---- B) TAMAMLANMIŞ SİPARİŞE YENİ KALEM YOK ----
  const { tarayici: t2, sayfa: s2 } = await uygulamaAc(tohumHazirla(), { hataYaz: false });
  s2.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await s2.waitForTimeout(2300);
  await duzenlemeyiAc(s2, "SAT-7002");
  await kalemEkle(s2, "Bot", "Taba", "40", 1);
  await s2.locator("[data-siparis-duzenle-kaydet]").click();
  await s2.waitForTimeout(800);
  const tamamlandi = {
    uyari: await s2.evaluate(() => (document.body.innerText.match(/Sipariş "Tamamlandı" durumunda — yeni kalem eklenemez/) || [null])[0]),
    formAcikKaldi: (await s2.locator(FORM).count()) === 1,
    sat7002: kalemOzeti(((await depoOku(s2, "siparis:data")) || []).find((s) => s.id === "se2") || {}),
  };
  await t2.close();

  return { hatalar, form, formSatirlari: { once: onceSatirlar, sonra: sonraSatirlar }, kayit, tamamlandi };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
