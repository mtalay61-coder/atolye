// SENARYO — ÜRÜN MALİYETİ VE SATIŞ FİYATI (kullanıcı, 20 Eylül: "1 çift ürün için çift başı genel
// gider, hammadde gideri, işçilik gideri ve kâr olarak satış fiyatı çıkarabiliriz").
//
// Ürün kartı › Maliyet sekmesi (21 Eylül'de Reçete'den taşındı): hammadde (reçete × kart alış fiyatı) + işçilik (proses ücretleri)
// + çift başı genel gider (genel gider defteri / aylık hedef) = tam maliyet; kâr marjı ile satış
// fiyatı önerisi. v1.378.0'da yapıldı ama senaryosu yoktu.
//
// Ölçülen: (1) çift başı genel gider ürün kartına iniyor; (2) tam maliyet üç parçanın toplamı;
// (3) kâr marjı uygulanmış satış fiyatı görünüyor.
const { uygulamaAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const hatalar = [];
  const t = { ...TOHUM };
  const tan = JSON.parse(TOHUM["tanimlar:data"]);
  // Genel gider: 60.000 / 3.000 çift = 20 ₺/çift
  tan.aylikUretimHedefi = 3000;
  tan.giderKartlari = [{ id: "gk1", ad: "Kira", grup: "yonetim", tur: "gider" }];
  tan.genelGiderler = [{ id: "g1", ad: "Kira", grup: "yonetim", aylikTutar: 60000, giderKartId: "gk1" }];
  t["tanimlar:data"] = JSON.stringify(tan);

  const st = JSON.parse(TOHUM["stok:items"]);
  const bot = st.find((p) => p.id === "u2");
  const deri = st.find((p) => p.id === "u1");
  // PARA BİRİMİ (20 Eylül): deri 2 $ · kur 48 = 96 ₺/desi. TL sayılsaydı maliyet 48 kat düşük çıkardı.
  // SİMGEYLE (21 Eylül): gerçek stok kartları "$" saklıyor, "USD" değil. Test önce kodla
  // yazıldığı için simge sorununu yakalayamamıştı — kullanıcının ekranında "$, ₺ kuru
  // girilmemiş" çıktı. Şimdi gerçek veriyle aynı biçim; bir malzeme de "₺" ile.
  deri.alisFiyati = 2; deri.alisParaBirimi = "$";
  bot.recete = [{ hammaddeUrunId: "u1", hammaddeAd: "Deri", mamulRenk: "Siyah", renk: "Siyah", beden: "", miktar: 2, birim: "desi", proses: "Kesim" }];
  bot.prosesUcretleri = { Kesim: 50 };         // işçilik 50 ₺
  bot.karMarji = 25;
  t["stok:items"] = JSON.stringify(st);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Mamul Stok"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Bot" && e.getBoundingClientRect().width > 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(1200);
  await sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Maliyet" && x.offsetParent); if (b) b.click(); });
  await sayfa.waitForTimeout(800);

  const maliyet = await sayfa.evaluate(() => {
    const m = document.body.innerText.replace(/\n/g, " | ");
    const al = (etiket) => { const i = m.indexOf(etiket); return i < 0 ? null : m.slice(i, i + 80).split("|")[0].trim(); };
    // ÖZET TEK SÜTUN (21 Eylül): etiketler değişti, işaretlerden okunuyor.
    const oku = (isaret) => { const e = document.querySelector(isaret); return e ? e.textContent.replace(/\s+/g, " ").trim() : null; };
    return {
      hammadde: oku("[data-ozet-hammadde]"),
      iscilik: oku("[data-ozet-iscilik]"),
      tamMaliyet: oku("[data-ozet-tam]"),
      kar: oku("[data-ozet-kar]"),
      satisOnerisi: oku("[data-ozet-toplam]"),
      marjKutusu: !!document.querySelector("[data-kar-marji]"),
    };
  });

  // KURU EKSİK UYARISI (21 Eylül): kur tablosunda olmayan birimle ikinci
  // senaryoda (GBP) uyarı çıkmalı. Burada (USD, kur var) ÇIKMAMALI.
  const kurUyarisiYok = await sayfa.evaluate(() => !document.querySelector("[data-kur-eksik]"));

  await tarayici.close();

  // İkinci açılış: deri GBP ile, GBP kuru tabloda yok → uyarı.
  const t2 = { ...t };
  const st2 = JSON.parse(t["stok:items"]);
  const deri2 = st2.find((p) => p.id === "u1"); deri2.alisParaBirimi = "GBP";   // kur tablosunda YOK (tohumda USD ve EUR var)
  t2["stok:items"] = JSON.stringify(st2);
  const ikinci = await uygulamaAc(t2, { hataYaz: false });
  await ikinci.sayfa.waitForTimeout(2500);
  await ikinci.sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Mamul Stok"]'); if (b) b.click(); });
  await ikinci.sayfa.waitForTimeout(900);
  await ikinci.sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "Bot" && e.getBoundingClientRect().width > 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await ikinci.sayfa.waitForTimeout(1200);
  await ikinci.sayfa.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Maliyet" && x.offsetParent); if (b) b.click(); });
  await ikinci.sayfa.waitForTimeout(800);
  const kurUyarisi = await ikinci.sayfa.evaluate(() => { const e = document.querySelector("[data-kur-eksik]"); return e ? e.textContent.replace(/\s+/g, " ").trim().slice(0, 40) : null; });
  await ikinci.tarayici.close();

  return { hatalar, maliyet, kurUyarisiYok, kurUyarisi };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
