// SENARYO — WEB SİTESİ MÜŞTERİ PORTALI, ERP TARAFI (v1.646.0).
//
// Kullanıcı: "Herkes koleksiyonumuzu görmesin" · "Müşteri sipariş de verebilsin, ona özel fiyatlar ve modeller".
// Ölçülen:
//   1) Müşteri cari kartı › Bilgiler: "Kod ver" → 10 karakterlik, karışan harfsiz kod; cariye `siteKodu` yazılır.
//      Tedarikçi kartında panel YOK. "Erişimi kapat" kodu siler.
//   2) Siparişler › Satış: Supabase'deki `site_talepleri` (taklit) "Siteden gelen" panelinde; "Siparişe çevir" formu
//      doldurur (cari, kalem, fiyat, not) — KAYDETMEZ; "Kaydet" siparişe `siteTalepId` yazar ve talep panelden düşer.
//      ERP'de olmayan renk/beden satırı forma alınmaz.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

const TALEP = {
  id: "talep-1", cari_id: "c2", cari_unvan: "Müşteri B", olusturma: "2026-10-12T10:15:00+00:00", durum: "yeni",
  not_metni: "Acil", toplam_cift: 5,
  kalemler: [
    { urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 3, birimFiyat: 30, paraBirimi: "USD" },
    { urunId: "u2", urunAd: "Bot", renk: "Mor", beden: "41", miktar: 2, birimFiyat: 30, paraBirimi: "USD" },
  ],
};

async function calistir() {
  const t = { ...TOHUM };
  let talepOkuma = 0;
  const onceRota = async (sayfa) => {
    await sayfa.route("**/rest/v1/site_talepleri*", (r) => { talepOkuma++; r.fulfill({ contentType: "application/json", body: JSON.stringify([TALEP]) }); });
  };
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false, onceRota });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  // ---- 1) Cari kartı ----
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(600);
  await sayfa.locator('button:has-text("Müşteri B"):visible').last().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator('[data-cari-sekme="bilgiler"]:visible').last().click();
  await sayfa.waitForTimeout(300);
  const panelOnce = await sayfa.locator("[data-site-erisim]:visible").count();
  await sayfa.locator("[data-site-kod-ver]:visible").last().click();
  await sayfa.waitForTimeout(500);
  const kodEkranda = (await sayfa.locator("[data-site-kodu]:visible").last().textContent()) || "";
  const c2 = ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c2") || {};
  const kod = {
    panelVar: panelOnce > 0,
    uzunluk: kodEkranda.length,
    karisanHarfYok: /^[A-HJKMNP-Z2-9]{10}$/.test(kodEkranda),
    cariyeYazildi: c2.siteKodu === kodEkranda,
  };
  // Hesabım'da görünen defter (v1.648.0): Genel varsayılan (alan yok), seçilince cariye yazılır.
  await sayfa.locator("[data-site-defter]:visible").last().selectOption("Ikisi");
  await sayfa.waitForTimeout(300);
  kod.defterYazildi = (((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c2") || {}).siteDefter;
  await sayfa.locator('button:has-text("Erişimi kapat"):visible').last().click();
  await sayfa.waitForTimeout(400);
  const c2Sonra = ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c2") || {};
  kod.kapatinciSilindi = !c2Sonra.siteKodu;
  kod.kapatinciKodVerDugmesi = (await sayfa.locator("[data-site-kod-ver]:visible").count()) > 0;

  await sayfa.locator('button:has-text("Tedarikçi A"):visible').last().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator('[data-cari-sekme="bilgiler"]:visible').last().click();
  await sayfa.waitForTimeout(300);
  kod.tedarikciKartindaPanel = await sayfa.locator("[data-site-erisim]:visible").count();

  // ---- 2) Siteden gelen talep ----
  await modulAc(sayfa, "Sipariş");
  await sayfa.waitForTimeout(900);
  const panelMetni = ((await sayfa.locator("[data-site-talepleri]").first().textContent().catch(() => "")) || "").replace(/\s+/g, " ");
  await sayfa.locator('[data-site-talep="talep-1"] button:has-text("Siparişe çevir")').click();
  await sayfa.waitForTimeout(600);
  const kayitOncesi = ((await depoOku(sayfa, "siparis:data")) || []).filter((s) => s.siteTalepId).length;
  const formAcik = await sayfa.locator("#siparis-yeni-form").count();
  await sayfa.locator('[data-siparis-kaydet="1"]').first().click();
  await sayfa.waitForTimeout(900);
  const yeni = ((await depoOku(sayfa, "siparis:data")) || []).find((s) => s.siteTalepId === "talep-1");
  const talep = {
    panel: /Siteden gelen sipariş talepleri \(1\)/.test(panelMetni) && /Müşteri B/.test(panelMetni) && /5 çift/.test(panelMetni) && /Acil/.test(panelMetni),
    formAcildi: formAcik > 0,
    cevirmeKaydetmedi: kayitOncesi === 0,
    siparis: yeni ? {
      cari: yeni.cariId, tip: yeni.tip, not: yeni.not,
      kalemler: (yeni.kalemler || []).map((k) => `${k.urunAd} ${k.renk} ${k.beden} ×${k.miktar} @${k.birimFiyat} ${k.paraBirimi}`),
    } : null,
    paneldenDustu: (await sayfa.locator("[data-site-talepleri]").count()) === 0,
    tabloOkundu: talepOkuma > 0,
  };
  await tarayici.close();
  return { hatalar, kod, talep };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
