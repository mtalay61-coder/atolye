// SENARYO — ALIŞ TEK EKRANDA + ORTAK ONAY ADIMI (23 Eylül, v1.431.0).
//
// Kullanıcı: onay penceresi (kaydetmeden önce stok etkisinin özeti) ortak fiş ekranına taşınsın,
// alış ve satışta da çalışsın ("1 SEÇENEK"). Alış siparişinin kartındaki "Alış Fişi Oluştur" artık
// sipariş kartındaki eski teslim formunu değil, cari ALIŞ fişini açıyor.
//
// Kurulum: AS-1 (Tedarikçi A) — Deri · Siyah 25 metre × 12 TRY. Deri Siyah stoğu 7.
// SAT-2 (Müşteri B) — Bot · Siyah · 40 × 2 çift. Bot 40 stoğu 5.
// Ölçülenler:
//   1. Kartta "Alış Fişi Oluştur" cari alış fişini ("Cariden Alış Fişi") BOŞ açıyor; kalemler
//      "Siparişten seç"ten geliyor.
//   2. Kaydet → onay paneli: "Deri · Siyah: +25 metre", cari/defter satırı; bu anda depoya HİÇBİR ŞEY
//      yazılmamış (stok 7, cari hareketsiz, karşılanan 0).
//   3. Vazgeç → panel kapanıyor, kalem fişte duruyor, depo yine değişmemiş. Ctrl+S de aynı onaydan
//      geçiyor (doğrudan yazmıyor).
//   4. Onaylayınca: stok 7→32, cariye Alacak 300 TRY, AS-1 karşılanan 25 (Tamamlandı), fiş no AF-.
//   5. Satışta da onay çıkıyor ve işaret "-": SAT-2 → "Bot · Siyah: -2 çift", onaylayınca Bot 40 stoğu 5→3.
// (27 Eylül, yeniden yazıldı — dosya taşımada kaybolmuştu)
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

// Sipariş listesinden numarasıyla kartı seçip tam ekran açar.
async function kartAc(sayfa, modul, no) {
  await modulAc(sayfa, modul);
  await sayfa.waitForTimeout(600);
  await sayfa.locator("[data-durum-cip=\"Tümü\"]:visible").first().click().catch(() => {});
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate((n) => {
    const el = [...document.querySelectorAll("*")].find((e) =>
      e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === n && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  }, no);
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await sayfa.waitForTimeout(700);
}

// Onay panelinin görünen özeti (yoksa null).
const onayOku = (sayfa) => sayfa.evaluate(() => {
  const p = document.querySelector("[data-fis-onay]");
  if (!p) return null;
  return {
    baslik: p.firstElementChild.textContent.trim(),
    cari: ((p.children[1] || {}).textContent || "").replace(/\s+/g, " ").trim(),
    satirlar: [...p.querySelectorAll("[data-fis-onay-satir]")].map((r) =>
      [...(r.tagName === "TR" ? r.children : [r])].map((c) => c.textContent.replace(/\s+/g, " ").trim()).join(" | ")),
    evetAktif: !(p.querySelector("[data-fis-onay-evet]") || {}).disabled,
  };
});

async function calistir() {
  const t = { ...TOHUM };
  t["siparis:data"] = JSON.stringify([
    { id: "s1", siparisNo: "AS-1", tip: "Alış", cariId: "c1", durum: "Onaylandı", tarih: "2026-09-20", teslimTarihi: "2026-09-25", teslimSayaci: 0,
      kalemler: [{ id: "sk1", urunId: "u1", urunAd: "Deri", renk: "Siyah", beden: "", miktar: 25, karsilanan: 0, birim: "metre", birimFiyat: 12, paraBirimi: "TRY" }] },
    { id: "s2", siparisNo: "SAT-2", tip: "Satış", cariId: "c2", durum: "Onaylandı", tarih: "2026-09-20", teslimTarihi: "2026-09-25", teslimSayaci: 0,
      kalemler: [{ id: "sk2", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "40", miktar: 2, karsilanan: 0, birim: "çift", birimFiyat: 900, paraBirimi: "TRY" }] },
  ]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);

  // Depodaki durumun kısa özeti — "henüz yazılmadı" ölçümü bunun değişmemesine bakıyor.
  const depoDurumu = async () => {
    const deri = ((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u1");
    const c1 = ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c1");
    const as1 = ((await depoOku(sayfa, "siparis:data")) || []).find((s) => s.id === "s1");
    return {
      deriSiyah: deri.variants.find((v) => v.renk === "Siyah").miktar,
      cariHareket: (c1.hareketler || []).length,
      karsilanan: as1.kalemler[0].karsilanan || 0,
    };
  };

  // 1) Alış fişi kartta açılıyor
  await kartAc(sayfa, "Alış Siparişi", "AS-1");
  await sayfa.locator("[data-fis-olustur]:visible").first().click();
  await sayfa.waitForTimeout(900);
  const acilis = await sayfa.evaluate(() => ({
    baslik: [...document.querySelectorAll("span")].map((e) => e.textContent.trim()).find((x) => /^Cari(den|ye) .* Fişi$/.test(x)) || null,
    bosAcildi: document.querySelectorAll("[data-fis-miktar]").length === 0,
    siparistenSec: !!document.querySelector("[data-siparisten-sec]"),
  }));
  await sayfa.locator("[data-siparisten-sec]:visible").first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator('[data-siparisten-ekle="AS-1"]:visible').first().click();
  await sayfa.waitForTimeout(400);
  const fisSatiri = await sayfa.locator("[data-fis-miktar]:visible").count();

  // 2) Kaydet → onay; henüz yazılmamış olmalı
  await sayfa.locator("[data-fis-kaydet]:visible").first().click();
  await sayfa.waitForTimeout(600);
  const onay = await onayOku(sayfa);
  const onayAnindaDepo = await depoDurumu();

  // 3) Vazgeç → geri dönüş; sonra Ctrl+S de onaya gidiyor
  await sayfa.locator("[data-fis-onay-vazgec]").first().click();
  await sayfa.waitForTimeout(400);
  const vazgecSonrasi = {
    onayKapandi: !(await sayfa.evaluate(() => !!document.querySelector("[data-fis-onay]"))),
    fisSatiri: await sayfa.locator("[data-fis-miktar]:visible").count(),
    depo: await depoDurumu(),
  };
  await sayfa.locator("[data-fis-miktar]:visible").first().click();
  await sayfa.keyboard.press("Control+s");
  await sayfa.waitForTimeout(600);
  const ctrlS = { onayAcildi: !!(await onayOku(sayfa)), depo: await depoDurumu() };

  // 4) Onayla
  await sayfa.locator("[data-fis-onay-evet]").first().click();
  await sayfa.waitForTimeout(1800);
  const c1 = ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c1");
  const as1 = ((await depoOku(sayfa, "siparis:data")) || []).find((s) => s.id === "s1");
  const alisSonrasi = {
    ...(await depoDurumu()),
    siparisDurum: as1.durum,
    cari: (c1.hareketler || []).map((h) => `${h.yon} ${h.tutar} ${h.paraBirimi} · ${h.fisNo} · ${h.urunAd} ${h.renk} ${h.miktar} × ${h.birimFiyat}`),
  };

  // 5) Satışta da onay, işaret "-"
  await kartAc(sayfa, "Sipariş", "SAT-2");
  await sayfa.locator("[data-fis-olustur]:visible").first().click();
  await sayfa.waitForTimeout(900);
  await sayfa.locator("[data-siparisten-sec]:visible").first().click();
  await sayfa.waitForTimeout(300);
  await sayfa.locator('[data-siparisten-ekle="SAT-2"]:visible').first().click();
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-fis-kaydet]:visible").first().click();
  await sayfa.waitForTimeout(600);
  const satisOnay = await onayOku(sayfa);
  const botOnce = ((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u2").variants.find((v) => v.beden === "40").miktar;
  await sayfa.locator("[data-fis-onay-evet]").first().click();
  await sayfa.waitForTimeout(1800);
  const botSonra = ((await depoOku(sayfa, "stok:items")) || []).find((p) => p.id === "u2").variants.find((v) => v.beden === "40").miktar;
  const c2 = ((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === "c2");

  await tarayici.close();
  return {
    hatalar, acilis, fisSatiri, onay, onayAnindaDepo, vazgecSonrasi, ctrlS, alisSonrasi,
    satis: { onay: satisOnay, bot40: `${botOnce}→${botSonra}`, cari: (c2.hareketler || []).map((h) => `${h.yon} ${h.tutar} · ${h.fisNo}`) },
  };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
