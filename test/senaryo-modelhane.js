// SENARYO — MODELHANE (kullanıcı, 17 Eylül: "henüz koleksiyona girmeyen mamulleri oluşturmak;
// modelci çizimleri yükleyecek, kalıp, taban, teknik çizim, render... ayrı bir yer olmalı").
//
// Ölçülen: (1) menüde Modelhane var ve boşken yol gösteriyor; (2) yeni model açılıyor, aşaması
// "Fikir"; (3) künye alanları (kalıp, taban) kaydediliyor; (4) aşama değişince geçmişe yazılıyor;
// (5) "Koleksiyona Al" modeli MAMUL ÜRÜN KARTINA dönüştürüyor — teknik not taşınıyor, model kaydı
// silinmiyor, "Koleksiyonda" aşamasına geçip ürünün kimliğini taşıyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  // Reçete maliyeti için deriye alış fiyatı (20 Eylül).
  const t = { ...TOHUM };
  // PARA BİRİMİ (20 Eylül): deri 2,5 $ · kur 48 → 120 ₺. Dolar fiyatı TL sayılsaydı 2,5 ₺ çıkardı.
  const st = JSON.parse(TOHUM["stok:items"]);
  const deri = st.find((p) => p.id === "u1"); deri.alisFiyati = 2.5; deri.alisParaBirimi = "USD";
  t["stok:items"] = JSON.stringify(st);
  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  sayfa.on("dialog", (d) => d.accept());
  await sayfa.waitForTimeout(2400);

  await sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Modelhane"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(800);

  // ---- RESİMLER (İLHAM HAVUZU) — 17 Eylül ----
  // Resimden model: resim kapak oluyor, düşünülen taban künyeye geçiyor, ilham kaydı havuzdan
  // çıkıyor (modele dönüştü).
  const anaSekmeler = await sayfa.evaluate(() => [...document.querySelectorAll("[data-modelhane-sekme]")].map((e) => e.getAttribute("data-modelhane-sekme")));
  const acilis = await sayfa.evaluate(() => ({
    ekranVar: !!document.querySelector("[data-modelhane]"),
    bosMesaj: /Yeni Model/.test(document.body.innerText),
    suzgecler: [...document.querySelectorAll("[data-model-suzgec]")].map((e) => e.getAttribute("data-model-suzgec")),
  }));

  // İlham havuzuna resim ekleyip modele çevirme, ayrı bir oturumda (tohumda ilham kaydıyla) ölçülüyor.

  // Yeni model.
  await sayfa.evaluate(() => { const b = document.querySelector("[data-model-yeni]"); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-model-kod]").fill("M-512");
  await sayfa.locator("[data-model-ad]").fill("512 Bağcıklı Bot");
  await sayfa.locator("[data-model-sezon]").fill("2027 Kış");
  await sayfa.locator("[data-model-modelci]").fill("Mahmut");
  await sayfa.evaluate(() => { const b = document.querySelector("[data-model-kaydet]"); if (b) b.click(); });
  await sayfa.waitForTimeout(1200);

  const eklendi = (await depoOku(sayfa, "model:data")).map((m) => `${m.kod}:${m.ad}:${m.asama}`);

  // Künye: kalıp ve taban.
  await sayfa.locator('[data-model-alan="kalip"]').fill("Ç-38 klasik");
  await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-model-alan="taban"]').fill("Kauçuk 4 mm");
  await sayfa.waitForTimeout(500);
  // Teknik not.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-model-sekme="teknik"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.locator("[data-model-teknik-not]").fill("Saya dikişi 3 mm, astar deri");
  await sayfa.waitForTimeout(700);
  // Aşama: onaylı.
  // MODELHANE 2. TUR (20 Eylül): reçete — Deri'yi ekle (tohumda alış fiyatı var), toplam çıkmalı;
  // hedef maliyetle karşılaştırılmalı.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-model-sekme="recete"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => {
    const s = document.querySelector("[data-model-recete-hammadde]");
    const o = [...s.options].find((x) => /Deri/.test(x.textContent));
    if (o) { s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await sayfa.waitForTimeout(500);
  const recete = await sayfa.evaluate(() => {
    const t = document.querySelector("[data-model-recete-toplam]");
    return { satir: document.querySelectorAll("[data-model-recete] input[type=number]").length, toplam: t ? t.textContent.replace(/\s+/g, " ").trim().slice(0, 40) : null };
  });

  // NUMUNE TURLARI: tur aç, "onay" kararı ver → aşama kendiliğinden "onaylı" olmalı.
  await sayfa.evaluate(() => { const b = document.querySelector('[data-model-sekme="numune"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => { const b = document.querySelector("[data-model-numune-ekle]"); if (b) b.click(); });
  await sayfa.waitForTimeout(400);
  await sayfa.evaluate(() => {
    const s = document.querySelector('[data-model-numune-karar="1"]');
    if (s) { s.value = "onay"; s.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await sayfa.waitForTimeout(600);
  // NUMUNE ÜRETİMİ (3. tur, 20 Eylül): ½ çift üret → deri reçete 1 × 0,5 = 0,5 desi düşmeli,
  // NUM fişi yazılmalı, mamul stoğuna HİÇBİR ŞEY girmemeli.
  const deriOnce = (await depoOku(sayfa, "stok:items")).find((p) => p.id === "u1").variants.reduce((t, v) => t + (v.miktar || 0), 0);
  await sayfa.evaluate(() => { const b = document.querySelector('[data-model-numune-uret="1"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(900);
  const numuneUretim = await (async () => {
    const s2 = await depoOku(sayfa, "stok:items");
    const d = s2.find((p) => p.id === "u1");
    const numHareket = (d.hareketler || []).find((h) => h.kaynak === "Numune");
    const mamulGiris = s2.filter((p) => p.kategori === "Mamul").some((p) => (p.hareketler || []).some((h) => h.kaynak === "Numune"));
    return { deriSonra: d.variants.reduce((t, v) => t + (v.miktar || 0), 0), hareket: numHareket ? `${numHareket.fisNo.startsWith("NUM-") ? "NUM-…" : numHareket.fisNo}:${numHareket.miktar}` : null, mamuleGirdi: mamulGiris };
  })();
  const numune = await sayfa.evaluate(() => ({
    turSayisi: document.querySelectorAll("[data-model-numune-turu]").length,
    uretildiYazisi: /Üretildi/.test(document.body.innerText),
  }));
  const numuneFark = Math.round((deriOnce - numuneUretim.deriSonra) * 100) / 100;

  // ATÖLYE NUMUNE EMRİ (3. tur, 20 Eylül): üretim modülünde emir açılır — ürün kartı YOK,
  // reçete emre kopyalanır (`numuneMi`, `recete`), üretim `uretimUrunu()` ile sanal ürün görür.
  await sayfa.evaluate(() => { const b = document.querySelector("[data-model-numune-emir]"); if (b && !b.disabled) b.click(); });
  await sayfa.waitForTimeout(900);
  const numuneEmri = await (async () => {
    const u = (await depoOku(sayfa, "uretim:siparisler")) || [];
    const n = u.find((x) => x.numuneMi);
    return n ? { var: true, urunIdBos: n.urunId == null, receteSatiri: (n.recete || []).length, model: n.model } : { var: false };
  })();

  await sayfa.evaluate(() => { const b = document.querySelector('[data-model-asama="onayli"]'); if (b) b.click(); });
  await sayfa.waitForTimeout(800);

  const kunye = await (async () => {
    const m = (await depoOku(sayfa, "model:data"))[0];
    return { kalip: m.kalip, taban: m.taban, teknikNot: m.teknikNot, asama: m.asama, gecmisSayisi: (m.gecmis || []).length };
  })();

  // Koleksiyona al.
  await sayfa.evaluate(() => { const b = document.querySelector("[data-koleksiyona-al]"); if (b) b.click(); });
  await sayfa.waitForTimeout(1600);

  const sonuc = await (async () => {
    const m = (await depoOku(sayfa, "model:data"))[0];
    const urun = (await depoOku(sayfa, "stok:items")).find((p) => p.modelId === m.id);
    return {
      modelAsamasi: m.asama,
      modelSilinmedi: !!m.kod,
      urunOlustu: !!urun,
      urunAdi: urun && urun.ad,
      urunKategorisi: urun && urun.kategori,
      teknikNotTasindi: !!(urun && /Saya dikişi/.test(urun.teknikNot || "")),
      kunyeNotu: urun && urun.not,
    };
  })();

  await tarayici.close();

  // ---- RESİMDEN MODEL ----
  const G = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
  const t2 = { ...TOHUM };
  t2["model:data"] = JSON.stringify([{ id: "i1", tip: "ilham", gorsel: G, not: "Fuardan", taban: "", modelAdi: "", olusturuldu: "2026-09-17T10:00:00.000Z" }]);
  const ikinci = await uygulamaAc(t2, { hataYaz: false });
  ikinci.sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await ikinci.sayfa.waitForTimeout(2400);
  await ikinci.sayfa.evaluate(() => { const b = document.querySelector('[data-nav="Modelhane"]'); if (b) b.click(); });
  await ikinci.sayfa.waitForTimeout(800);
  await ikinci.sayfa.evaluate(() => { const b = document.querySelector('[data-modelhane-sekme="resimler"]'); if (b) b.click(); });
  await ikinci.sayfa.waitForTimeout(600);
  const havuz = await ikinci.sayfa.evaluate(() => ({
    havuzVar: !!document.querySelector("[data-ilham-havuzu]"),
    resimSayisi: document.querySelectorAll("[data-ilham]").length,
    tabanAlani: !!document.querySelector("[data-ilham-taban]"),
  }));
  await ikinci.sayfa.locator("[data-ilham-taban]").first().fill("Kauçuk 4 mm EVA");
  await ikinci.sayfa.waitForTimeout(400);
  await ikinci.sayfa.locator("[data-ilham-ad]").first().fill("601 Sneaker");
  await ikinci.sayfa.waitForTimeout(400);
  await ikinci.sayfa.evaluate(() => { const b = document.querySelector("[data-ilham-model-yap]"); if (b) b.click(); });
  await ikinci.sayfa.waitForTimeout(1400);
  const resimdenModel = (await depoOku(ikinci.sayfa, "model:data"))
    .map((m) => `${m.tip || "model"}:${m.kod || ""}:${m.ad || ""}:${m.taban || ""}:${m.kapakResmi ? "kapak" : "-"}`);
  await ikinci.tarayici.close();

  return { hatalar, recete, numune, numuneEmri, numuneUretim, numuneFark, acilis, anaSekmeler, eklendi, kunye, sonuc, havuz, resimdenModel };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
