// SENARYO — WEB SİTESİ MÜŞTERİ PORTALI, ERP TARAFI (v1.646.0).
//
// Kullanıcı: "Herkes koleksiyonumuzu görmesin" · "Müşteri sipariş de verebilsin, ona özel fiyatlar ve modeller".
// Ölçülen:
//   1) Müşteri cari kartı › Bilgiler (v1.649.0 — kullanıcı adı + şifre): hesap yoksa "Giriş bilgisi oluştur" →
//      ünvandan kullanıcı adı önerisi + 8 karakterlik rastgele şifre; Kaydet `site_hesap_kaydet` rpc'sine gider (taklit
//      sunucu), cari kaydına ŞİFRE YAZILMAZ; kaydettikten sonra bilgiler + WhatsApp bağlantısı görünür. Defter
//      seçimi cariye yazılır. "Erişimi kapat" `site_hesap_sil` çağırır. Tedarikçi kartında panel YOK.
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
  // Taklit sunucu: site hesabı tablosu bellekte.
  let hesap = null; const rpcCagrilari = [];
  const onceRota = async (sayfa) => {
    await sayfa.route("**/rest/v1/site_talepleri*", (r) => { talepOkuma++; r.fulfill({ contentType: "application/json", body: JSON.stringify([TALEP]) }); });
    await sayfa.route("**/rest/v1/rpc/site_hesap_*", (r) => {
      const ad = r.request().url().split("/rpc/")[1]; const g = JSON.parse(r.request().postData() || "{}");
      rpcCagrilari.push(ad);
      if (ad === "site_hesap_bilgi") return r.fulfill({ contentType: "application/json", body: JSON.stringify(hesap) });
      if (ad === "site_hesap_kaydet") { hesap = { kullanici: g.p_kullanici, sonGiris: null, kilitli: false, _sifre: g.p_sifre }; return r.fulfill({ status: 204, body: "" }); }
      if (ad === "site_hesap_sil") { hesap = null; return r.fulfill({ status: 204, body: "" }); }
      r.fulfill({ status: 404, body: "" });
    });
  };
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false, onceRota });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.on("dialog", (d) => d.accept());
  await sayfa.waitForTimeout(2200);

  // ---- 1) Cari kartı ----
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(600);
  await sayfa.locator('button:has-text("Müşteri B"):visible').last().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator('[data-cari-sekme="bilgiler"]:visible').last().click();
  await sayfa.waitForTimeout(500);
  const panelOnce = await sayfa.locator("[data-site-erisim]:visible").count();
  await sayfa.locator("[data-site-hesap-ac]:visible").last().click();
  await sayfa.waitForTimeout(300);
  const oneri = await sayfa.locator("[data-site-kullanici-gir]:visible").last().inputValue();
  const sifre = await sayfa.locator("[data-site-sifre-gir]:visible").last().inputValue();
  await sayfa.locator("[data-site-hesap-kaydet]:visible").last().click();
  await sayfa.waitForTimeout(600);
  const c2 = ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c2") || {};
  const yeniGiris = ((await sayfa.locator("[data-site-yeni-giris]:visible").last().textContent().catch(() => "")) || "").replace(/\s+/g, " ");
  const kod = {
    panelVar: panelOnce > 0,
    kullaniciOnerisi: oneri,
    sifreUzunluk: sifre.length, sifreKarisanHarfYok: /^[a-hjkmnp-z2-9]{8}$/.test(sifre),
    sunucuyaGitti: !!hesap && hesap.kullanici === oneri && hesap._sifre === sifre,
    cariyeSifreYazilmadi: !JSON.stringify(c2).includes(sifre),
    kayittanSonraGosterildi: yeniGiris.includes(oneri) && yeniGiris.includes(sifre) && /WhatsApp ile gönder/.test(yeniGiris),
    kullaniciRozeti: await sayfa.locator("[data-site-kullanici]:visible").last().textContent(),
  };
  // Hesabım'da görünen defter (v1.648.0): Genel varsayılan (alan yok), seçilince cariye yazılır.
  await sayfa.locator("[data-site-defter]:visible").last().selectOption("Ikisi");
  await sayfa.waitForTimeout(300);
  kod.defterYazildi = (((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c2") || {}).siteDefter;
  await sayfa.locator('button:has-text("Erişimi kapat"):visible').last().click();
  await sayfa.waitForTimeout(500);
  kod.kapatinciSilindi = hesap === null;
  kod.kapatinciOlusturDugmesi = (await sayfa.locator("[data-site-hesap-ac]:visible").count()) > 0;
  kod.rpc = Array.from(new Set(rpcCagrilari)).sort();

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
