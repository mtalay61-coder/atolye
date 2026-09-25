// SENARYO — MOBİL GÖRÜNÜM DÜZENLEYİCİ (kullanıcı, 14 Eylül: "mobil için dizayn ve kısıtlama
// yapacağımız ekran; sürükle bırak şeklinde olsun, neyi nereye koyacaksan").
//
// Ölçülen: Tanımlar > Genel'de düzenleyici; ok düğmesiyle sıra değişiyor ve kaydediliyor; gizlenen
// modül alt çubukta çıkmıyor; alt çubuk sıralamadaki ilk DÖRT görünür modülü gösteriyor;
// "Varsayılana dön" ayarı sıfırlıyor. (Sürükleme pointer olaylarıyla; testte ok düğmeleri
// ölçülüyor — aynı `kaydet` yolunu kullanıyorlar.)
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const { tarayici, sayfa } = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2200);
  await sayfa.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Görünüm" && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await sayfa.waitForTimeout(500);

  const ekranVar = await sayfa.evaluate(() => !!document.querySelector("[data-mobil-gorunum]"));
  const ilkSira = await sayfa.evaluate(() => [...document.querySelectorAll("[data-mobil-satir]")].map((e) => e.getAttribute("data-mobil-satir")).slice(0, 5));
  const ilkOnizleme = await sayfa.evaluate(() => [...document.querySelectorAll("[data-mobil-onizleme]")].map((e) => e.getAttribute("data-mobil-onizleme")));

  // "Cari"yi iki sıra yukarı taşı.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-mobil-yukari="cari"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-mobil-yukari="cari"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const tasindiktanSonra = await sayfa.evaluate(() => [...document.querySelectorAll("[data-mobil-satir]")].map((e) => e.getAttribute("data-mobil-satir")).slice(0, 4));

  // "Anasayfa"yı gizle.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-mobil-gizle="anasayfa"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const kayit = (await depoOku(sayfa, "tanimlar:data")).mobilGorunum;
  const onizleme = await sayfa.evaluate(() => [...document.querySelectorAll("[data-mobil-onizleme]")].map((e) => e.getAttribute("data-mobil-onizleme")));

  // ALT ÇUBUK SAYISI (15 Eylül): 4 yerine 6.
  await sayfa.evaluate(() => { const sel = document.querySelector("[data-mobil-altcubuk-sayisi]"); if (sel) { sel.value = "6"; sel.dispatchEvent(new Event("change", { bubbles: true })); } });
  await sayfa.waitForTimeout(600);
  const onizlemeAlti = await sayfa.evaluate(() => [...document.querySelectorAll("[data-mobil-onizleme]")].length);

  // MODÜL İÇİ BÖLÜMLER: "Sipariş" satırına dokun, bir bölümü gizle.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-mobil-ac="siparis"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const bolumler = await sayfa.evaluate(() => [...document.querySelectorAll("[data-mobil-bolum]")].map((e) => e.getAttribute("data-mobil-bolum")));
  // "Tedarik Girişleri"ni gizle → mobil düzende sipariş kartında çıkmamalı (15 Eylül).
  await sayfa.evaluate(() => { const b = document.querySelector('[data-mobil-bolum-gizle="tedarikGirisleri"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-mobil-bolum-gizle="ihtiyac"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-mobil-bolum-yukari="rezervasyon"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const bolumKaydi = ((await depoOku(sayfa, "tanimlar:data")).mobilGorunum || {}).bolumler;

  // Telefon genişliğinde alt çubuk ayarı uyguluyor mu?
  await sayfa.setViewportSize({ width: 390, height: 780 });
  await sayfa.waitForTimeout(600);
  const altCubuk = await sayfa.evaluate(() => [...document.querySelectorAll(".mobile-tabs button")].map((b) => b.textContent.trim()));

  // DÜZEN KİPİ (15 Eylül): geniş ekranda "Her zaman mobil" seçilince alt çubuk çıkmalı.
  await sayfa.setViewportSize({ width: 1200, height: 900 });
  await sayfa.waitForTimeout(500);
  const genisVarsayilan = await sayfa.evaluate(() => ({
    govde: document.body.className,
    cubukGorunur: !!document.querySelector(".mobile-tabs") && getComputedStyle(document.querySelector(".mobile-tabs")).display !== "none",
  }));
  await sayfa.evaluate(() => { const b = document.querySelector('[data-mobil-kip-sec="acik"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const zorlaMobil = await sayfa.evaluate(() => ({
    govde: document.body.className,
    cubukGorunur: getComputedStyle(document.querySelector(".mobile-tabs")).display !== "none",
    menuGizli: getComputedStyle(document.querySelector(".ust-menu")).display === "none",
    tercih: window.localStorage.getItem("mobil:duzen"),
  }));
  await sayfa.evaluate(() => { const b = document.querySelector('[data-mobil-kip-sec="oto"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(400);

  // TÜMÜ PANELİ + MASAÜSTÜNE DÖNÜŞ (15 Eylül): telefonda alt çubuğa sığmayan modüller ve düzen
  // anahtarı burada. Bu olmadan "her zaman mobil" seçen kullanıcı kilitleniyordu.
  await sayfa.setViewportSize({ width: 390, height: 780 });
  await sayfa.waitForTimeout(500);
  await sayfa.evaluate(() => { const b = document.querySelector("[data-mobil-tumu]"); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const tumuPaneli = await sayfa.evaluate(() => ({
    acik: !!document.querySelector("[data-mobil-menu]"),
    moduller: [...document.querySelectorAll("[data-mobil-menu-modul]")].map((e) => e.getAttribute("data-mobil-menu-modul")).length,
    masaustuDugmesi: !!document.querySelector("[data-mobil-masaustu]"),
  }));
  await sayfa.evaluate(() => { const b = document.querySelector("[data-mobil-masaustu]"); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const masaustuneDonus = await sayfa.evaluate(() => ({
    govde: document.body.className,
    tercih: window.localStorage.getItem("mobil:duzen"),
    menuGorunur: getComputedStyle(document.querySelector(".ust-menu")).display !== "none",
  }));

  // Varsayılana dön.
  await sayfa.setViewportSize({ width: 1200, height: 900 });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = document.querySelector("[data-mobil-sifirla]"); if (b) b.click(); });
  await sayfa.waitForTimeout(600);
  const sifirlandi = (await depoOku(sayfa, "tanimlar:data")).mobilGorunum;

  // UYARI SÜRESİ VE KAPATMA (15 Eylül): eski süre 2,2 sn idi ve okunmuyordu. Artık uzunluğa göre
  // (en az 4 sn) ve üzerine dokununca kapanıyor.
  await sayfa.evaluate(() => { const b = document.querySelector("[data-mobil-sifirla]"); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  const uyariMetni = await sayfa.evaluate(() => { const t = document.querySelector("[data-toast]"); return t ? t.innerText.trim() : null; });
  await sayfa.waitForTimeout(2800);
  const eskiSureyiAsti = await sayfa.evaluate(() => !!document.querySelector("[data-toast]"));
  await sayfa.evaluate(() => { const t = document.querySelector("[data-toast]"); if (t) t.click(); });
  await sayfa.waitForTimeout(300);
  const dokununcaKapandi = await sayfa.evaluate(() => !document.querySelector("[data-toast]"));

  await tarayici.close();
  return { hatalar, uyariMetni, eskiSureyiAsti, dokununcaKapandi, tumuPaneli, masaustuneDonus, genisVarsayilan, zorlaMobil, ekranVar, ilkSira, ilkOnizleme, tasindiktanSonra, onizlemeAlti, bolumler, bolumKaydi,
    kayit: kayit && { ilkDort: kayit.sira.slice(0, 4), gizli: kayit.gizli }, onizleme, altCubuk,
    sifirlandi: sifirlandi && { ilkUc: sifirlandi.sira.slice(0, 3), gizli: sifirlandi.gizli } };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
