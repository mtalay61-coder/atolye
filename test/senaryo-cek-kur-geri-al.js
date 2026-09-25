// SENARYO — ÇEKTE CARİ BİRİMİNE KUR ÇEVİRİCİ VE "SON İŞLEMİ GERİ AL" (25 Eylül, v1.459.0).
//
// Kullanıcı: "Çek girişinde ve ciroda kur çevirici koyalım. TL çek alınıp USD hesabına
// izlenebilir. Ciro edilen çek geri iade alınabilir; bunun için son işlemi sil olsun — ciro edilen
// çekte veya bankaya tahsil için."
//
// Ölçülenler:
//   1. Çek & Senet > Yeni Çek: dolar carisi seçilince "Cari hesabı" USD geliyor; 42.000 ₺ çek
//      güncel kurla (42) 1000 $ öneriliyor; cariye 1000 $ işleniyor, çek 42.000 ₺ kalıyor.
//   2. Ciro: alıcı cari EUR ise birim EUR ve tutar kurla çevrilmiş geliyor.
//   3. Son İşlemi Geri Al (iki dokunuş): ciro fişi siliniyor, çek yeniden Portföyde.
//   4. Bankaya tahsile verme de geri alınıyor (kayıt doğurmayan aşama).
//   5. Tahsil geri alınıyor: bankadaki tahsil kaydı siliniyor, çek yeniden Tahsilde.
//   6. Cari kartında çek girişi: dolar carisine TL çek — çek ₺ kaydediliyor, hareket $.
const { uygulamaAc, depoOku, modulAc } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const cariler0 = JSON.parse(TOHUM["cari:data"]);
  cariler0.find((c) => c.id === "c2").paraBirimi = "USD";   // Müşteri B dolarla çalışıyor
  cariler0.find((c) => c.id === "c1").paraBirimi = "EUR";   // Tedarikçi A euroyla
  t["cari:data"] = JSON.stringify(cariler0);
  t["muhasebe:data"] = JSON.stringify({
    kasalar: [], kurlar: { USD: 42, EUR: 56 },
    bankalar: [{ id: "bnk1", ad: "Ziraat TL", paraBirimi: "TRY", hareketler: [] }],
    cekler: [
      // Tahsile verilip tahsil edilecek çek (5. ölçüm).
      { id: "ct", durum: "Portföyde", tip: "Alınan", cekNo: "T-1", cariId: "c3", tutar: 5000, paraBirimi: "TRY", vadeTarihi: "2026-10-01", banka: "Ziraat" },
    ],
  });

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await sayfa.waitForTimeout(2500);

  const gorunurTikla = (metin) => sayfa.evaluate((metin) => {
    const b = [...document.querySelectorAll("button")].filter((x) => x.getBoundingClientRect().width > 0)
      .filter((x) => x.textContent.trim() === metin).pop();   // son eşleşen: pencere en üstte çiziliyor
    if (b) b.click(); return !!b;
  }, metin);
  const secimYap = (secenekMetni) => sayfa.evaluate((m) => {
    const s = [...document.querySelectorAll("select")].filter((x) => x.getBoundingClientRect().width > 0)
      .find((x) => [...x.options].some((o) => o.textContent.includes(m)));
    const o = [...s.options].find((x) => x.textContent.includes(m));
    s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true }));
  }, secenekMetni);
  const yaz = async (secici, deger) => { await sayfa.locator(secici).first().fill(String(deger)); await sayfa.waitForTimeout(150); };
  const cekOku = async (id) => (((await depoOku(sayfa, "muhasebe:data")) || {}).cekler || []).find((c) => c.id === id || c.cekNo === id) || {};
  const cariHareketleri = async (id) => (((await depoOku(sayfa, "cari:data")) || []).find((c) => c.id === id) || {}).hareketler || [];
  const geriAl = async (cekId) => {
    await sayfa.locator(`[data-cek-geri-al="${cekId}"]`).click();
    await sayfa.waitForTimeout(200);
    const onayYazisi = await sayfa.locator(`[data-cek-geri-al="${cekId}"]`).textContent();
    await sayfa.locator(`[data-cek-geri-al="${cekId}"]`).click();
    await sayfa.waitForTimeout(1200);
    return onayYazisi.trim();
  };
  const islemAc = async (cekNo, aciklamaDeseni) => {
    await sayfa.evaluate((no) => {
      const satir = [...document.querySelectorAll("div")].filter((d) => d.getBoundingClientRect().width > 0 && d.textContent.includes(no) && [...d.querySelectorAll("button")].some((b) => /İşlemler/.test(b.textContent)))
        .sort((a, b) => a.textContent.length - b.textContent.length)[0];
      [...satir.querySelectorAll("button")].find((b) => /İşlemler/.test(b.textContent)).click();
    }, cekNo);
    await sayfa.waitForTimeout(500);
    await sayfa.evaluate((d) => { const b = [...document.querySelectorAll("button")].find((x) => new RegExp(d).test(x.textContent)); if (b) b.click(); }, aciklamaDeseni);
    await sayfa.waitForTimeout(400);
  };

  // ---- 1. YENİ ÇEK: TL çek, dolar carisi -----------------------------------------------------
  await modulAc(sayfa, "Çek & Senet");
  await sayfa.waitForTimeout(800);
  await gorunurTikla("Yeni Çek");
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => {
    const kutular = [...document.querySelectorAll("input")].filter((x) => x.getBoundingClientRect().width > 0);
    const noKutusu = kutular.find((x) => !x.type || x.type === "text");
    const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); };
    set(noKutusu, "K-42");
    set(kutular.find((x) => x.type === "number"), "42000");
    set(kutular.find((x) => x.type === "date"), "2026-12-01");
  });
  await secimYap("Müşteri B");
  await sayfa.waitForTimeout(400);
  const giris = {
    cariHesabi: await sayfa.locator("[data-cek-cari-pb]").inputValue(),
    onerilen: await sayfa.locator("[data-cek-cari-tutar]").inputValue(),
    kur: await sayfa.locator("[data-cek-cari-kur]").inputValue(),
  };
  await yaz("[data-cek-cari-tutar]", 1000);
  await gorunurTikla("Kaydet");
  await sayfa.waitForTimeout(1200);
  const k42 = await cekOku("K-42");
  const bHareket = (await cariHareketleri("c2")).find((h) => /K-42/.test(h.aciklama || "")) || {};
  giris.cek = { tutar: k42.tutar, pb: k42.paraBirimi, tlKarsiligi: k42.tlKarsiligi };
  giris.cariHareketi = { tutar: bHareket.tutar, pb: bHareket.paraBirimi, yon: bHareket.yon };

  // ---- 2. CİRO: alıcı EUR carisi ------------------------------------------------------------
  await islemAc("K-42", "Çeki başka bir cariye ver");
  await secimYap("Tedarikçi A");
  await sayfa.waitForTimeout(400);
  const ciro = {
    birim: await sayfa.evaluate(() => {
      const s = [...document.querySelectorAll("select")].filter((x) => x.getBoundingClientRect().width > 0)
        .find((x) => [...x.options].map((o) => o.textContent).join() === "TRY,USD,EUR");
      return s ? s.value : null;
    }),
    tutar: await sayfa.evaluate(() => [...document.querySelectorAll('input[type="number"]')].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.value)[0]),
  };
  await gorunurTikla("Ciro Et");
  await sayfa.waitForTimeout(1200);
  ciro.durum = (await cekOku("K-42")).durum;
  ciro.aHareketi = ((await cariHareketleri("c1")).find((h) => /Çek cirosu/.test(h.aciklama || "")) || {}).paraBirimi || null;

  // ---- 3. CİROYU GERİ AL ---------------------------------------------------------------------
  const ciroGeri = { onayYazisi: await geriAl(k42.id) };
  ciroGeri.durum = (await cekOku("K-42")).durum;
  ciroGeri.ciroFisiKaldi = (await cariHareketleri("c1")).some((h) => /Çek cirosu/.test(h.aciklama || ""));
  ciroGeri.girisHareketiDuruyor = (await cariHareketleri("c2")).some((h) => /K-42/.test(h.aciklama || ""));

  // ---- 4. TAHSİLE VER → GERİ AL ---------------------------------------------------------------
  await islemAc("T-1", "Çeki tahsil için bankaya ver");
  await secimYap("Ziraat TL");
  await sayfa.waitForTimeout(300);
  await gorunurTikla("Bankaya Tahsile Ver");
  await sayfa.waitForTimeout(1000);
  const tahsile = { durum: (await cekOku("ct")).durum };
  await geriAl("ct");
  const ctGeri = await cekOku("ct");
  tahsile.geriAlininca = { durum: ctGeri.durum, banka: ctGeri.tahsilBankaId || null };

  // ---- 5. TAHSİLE VER → TAHSİL → GERİ AL -------------------------------------------------------
  await islemAc("T-1", "Çeki tahsil için bankaya ver");
  await secimYap("Ziraat TL");
  await sayfa.waitForTimeout(300);
  await gorunurTikla("Bankaya Tahsile Ver");
  await sayfa.waitForTimeout(1000);
  await islemAc("T-1", "Çekin bedeli hesaba geçti");
  await gorunurTikla("Tahsil Edildi");
  await sayfa.waitForTimeout(1200);
  const bankaHareketSayisi = async () => ((((await depoOku(sayfa, "muhasebe:data")) || {}).bankalar || [])[0] || {}).hareketler.length;
  const tahsil = { durum: (await cekOku("ct")).durum, bankaHareketi: await bankaHareketSayisi() };
  await geriAl("ct");
  tahsil.geriAlininca = { durum: (await cekOku("ct")).durum, bankaHareketi: await bankaHareketSayisi() };

  // ---- 6. CARİ KARTI: dolar carisine TL çek ----------------------------------------------------
  await modulAc(sayfa, "Cari");
  await sayfa.waitForTimeout(700);
  await sayfa.evaluate(() => {
    const e = [...document.querySelectorAll("span, div")].find((x) => x.children.length === 0 && x.textContent.trim() === "Müşteri B" && x.getBoundingClientRect().width > 0);
    if (e) e.click();
  });
  await sayfa.waitForTimeout(700);
  await gorunurTikla("Tahsilat");
  await sayfa.waitForTimeout(500);
  await sayfa.evaluate(() => {
    const s = [...document.querySelectorAll("select")].filter((x) => x.getBoundingClientRect().width > 0).find((x) => [...x.options].some((o) => o.value === "Çek"));
    s.value = "Çek"; s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => {
    const k = [...document.querySelectorAll('input[type="number"]')].filter((x) => x.getBoundingClientRect().width > 0)[0];
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(k, "500");
    k.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await sayfa.locator('input[placeholder="Belge üzerindeki numara"]').first().fill("CK-7");
  await sayfa.locator("[data-cek-pb]").selectOption("TRY");
  await sayfa.waitForTimeout(300);
  const kart = { onerilenCekTutari: await sayfa.locator("[data-cek-tutar]").inputValue() };
  await yaz("[data-cek-tutar]", 21500);
  await gorunurTikla("Kaydet");
  await sayfa.waitForTimeout(1500);
  const ck7 = await cekOku("CK-7");
  const h7 = (await cariHareketleri("c2")).find((h) => h.cek && h.cek.cekNo === "CK-7") || {};
  kart.cek = { tutar: ck7.tutar, pb: ck7.paraBirimi, cariTutar: ck7.cariTutar, cariPB: ck7.cariPB };
  kart.hareket = { tutar: h7.tutar, pb: h7.paraBirimi, hesapTutar: h7.hesapTutar, hesapPB: h7.hesapPB };

  await tarayici.close();
  return { hatalar, giris, ciro, ciroGeri, tahsile, tahsil, kart };
}

if (require.main === module) {
  calistir().then((s) => {
    if (s.hatalar.length) console.log("SAYFA HATASI:", s.hatalar.join(" | "));
    console.log(normalles(s));
  });
}

module.exports = { calistir };
