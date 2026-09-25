// SENARYO — FİŞ DEFTERİ (kullanıcı, 15 Eylül: "fişleri 3 defter değil tek deftere yazsa",
// "alt yapının çok sağlam olması gerekir"). Adım 1: her fişin tek kaydı, atomik yazma.
//
// Ölçülen: (1) fiş kesilince deftere TEK kayıt düşüyor — kalemler, stok hareketleri ve cari
// hareketi bir arada; (2) defterden hesaplanan stok toplamı ürünün varyantıyla aynı (türev
// tutarlı); (3) fiş geri alınınca defterde kayıt SİLİNMİYOR, `iptal: true` oluyor.
const { uygulamaAc, depoOku } = require("./ortak.js");
const { TOHUM } = require("./tohum.js");
const { alisSiparisindenTeslimEt } = require("./alis-teslim-yardimci.js");
const { normalles } = require("./senaryo-fis.js");

async function calistir() {
  const t = { ...TOHUM };
  const stok = JSON.parse(TOHUM["stok:items"]);
  const bot = stok.find((p) => p.id === "u2");
  bot.variants = [{ renk: "Siyah", beden: "41", miktar: 0 }];
  bot.hareketler = [];
  t["stok:items"] = JSON.stringify(stok);
  t["siparis:data"] = JSON.stringify([{ id: "a1", siparisNo: "ALS-5", tip: "Alış", cariId: "c1", durum: "Bekliyor", tarih: "2026-09-15",
    kalemler: [{ id: "ak1", urunId: "u2", urunAd: "Bot", renk: "Siyah", beden: "41", miktar: 6, karsilanan: 0, birim: "çift", birimFiyat: 20, paraBirimi: "TRY" }] }]);
  t["fisdefter:data"] = JSON.stringify([]);

  const { tarayici, sayfa } = await uygulamaAc(t, { hataYaz: false });
  const hatalar = []; sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  sayfa.on("dialog", (d) => d.accept());
  await sayfa.waitForTimeout(2200);

  // Alış siparişinden fiş kes.
  await sayfa.getByRole("button", { name: "Alış Siparişi", exact: true }).click();
  await sayfa.waitForTimeout(600);
  await sayfa.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "ALS-5" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await sayfa.waitForTimeout(800);
  // Fiş düğmesi tam ekran kartta.
  await sayfa.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await sayfa.waitForTimeout(700);
  await alisSiparisindenTeslimEt(sayfa);

  const defter = (await depoOku(sayfa, "fisdefter:data")) || [];
  const kayit = defter[0] || null;
  const defterOzeti = kayit && {
    fisNo: kayit.fisNo, tip: kayit.tip, siparisNo: kayit.siparisNo, iptal: kayit.iptal,
    kalem: (kayit.kalemler || []).map((k) => `${k.urunAd}/${k.renk}/${k.beden}:${k.miktar}`),
    stokHareketi: (kayit.stokHareketleri || []).map((h) => `${h.renk}/${h.beden}:${h.miktar}`),
    cariHareketi: (kayit.cariHareketleri || []).map((h) => `${h.yon}:${h.tutar}`),
  };
  const varyant = ((await depoOku(sayfa, "stok:items")).find((p) => p.id === "u2").variants || [])
    .map((v) => `${v.beden}:${v.miktar}`);
  // Defterden hesaplanan toplam (türev tutarlılığı).
  const defterToplami = defter.filter((f) => !f.iptal).flatMap((f) => f.stokHareketleri || [])
    .reduce((t2, h) => t2 + (h.miktar || 0), 0);

  // Geri al: cari ekstresinden fiş grubunu sil.
  await sayfa.getByRole("button", { name: "Cari", exact: true }).click();
  await sayfa.waitForTimeout(500);
  await sayfa.locator('button:has-text("Tedarikçi A"):visible').last().click();
  await sayfa.waitForTimeout(700);
  await sayfa.locator('button[title="Sil"]:visible').last().click();
  await sayfa.waitForTimeout(300);
  // Onay artık pencere (21 Eylül): ikinci adım penceredeki Sil.
  await sayfa.locator('[data-sil-onayla]').first().click();
  await sayfa.waitForTimeout(1500);
  const defterSonra = (await depoOku(sayfa, "fisdefter:data")) || [];
  const iptalDurumu = defterSonra.map((f) => `${f.fisNo}:${f.iptal ? "iptal" : "aktif"}`);
  const varyantSonra = ((await depoOku(sayfa, "stok:items")).find((p) => p.id === "u2").variants || []).map((v) => `${v.beden}:${v.miktar}`);

  // ---- ADIM 3: SİPARİŞ YOLU ATOMİK Mİ? ----
  // Defterde AYNI fiş numarası varsa yazma reddedilir ve HİÇBİR yan etki uygulanmaz: sipariş
  // karşılanmaz, stok değişmez. (Gerçekte bu durum çift tıklamada oluşur.)
  // ALIŞ TEK EKRANA TAŞINDI (23 Eylül, v1.431.0): fiş numarası artık "ALS-5-F1" değil, cari fiş
  // biçiminde — AF + AAGG + sıra. Defterdeki çakışmayı kurmak için o günün İLK numarası hesaplanıp
  // deftere önceden konuyor; testin ölçtüğü şey aynı: defter reddedince HİÇBİR yan etki olmamalı.
  const bugun = new Date();
  const beklenenFisNo = `AF-${String(bugun.getMonth() + 1).padStart(2, "0")}${String(bugun.getDate()).padStart(2, "0")}001`;
  const ikinci = await uygulamaAc({ ...t,
    "fisdefter:data": JSON.stringify([{ id: beklenenFisNo, fisNo: beklenenFisNo, tip: "Alış", kaynak: "Satınalma",
      cariId: "c1", siparisId: "a1", siparisNo: "ALS-5", zaman: "2026-09-15T10:00:00.000Z",
      kalemler: [], stokHareketleri: [], cariHareketleri: [], iptal: false }]) }, { hataYaz: false });
  const s2 = ikinci.sayfa;
  s2.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  s2.on("dialog", (d) => d.accept());
  await s2.waitForTimeout(2300);
  await s2.getByRole("button", { name: "Alış Siparişi", exact: true }).click();
  await s2.waitForTimeout(600);
  await s2.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.getBoundingClientRect().width > 0 && (e.textContent || "").trim() === "ALS-5" && e.children.length === 0);
    let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON") { p.click(); return; } }
  });
  await s2.waitForTimeout(800);
  await s2.locator('button[title^="Tam ekran aç"]:visible').first().click();
  await s2.waitForTimeout(700);
  await alisSiparisindenTeslimEt(s2, { bekle: 1500 });
  const atomik = {
    uyari: await s2.evaluate(() => /zaten kayıtlı/.test(document.body.innerText)),
    siparisKarsilanan: ((await depoOku(s2, "siparis:data"))[0].kalemler || []).map((k) => k.karsilanan),
    varyant: ((await depoOku(s2, "stok:items")).find((p) => p.id === "u2").variants || []).map((v) => `${v.beden}:${v.miktar}`),
    defterSayisi: ((await depoOku(s2, "fisdefter:data")) || []).length,
  };
  await ikinci.tarayici.close();

  // ---- ADIM 2: DEFTERDEN YENİDEN KUR ----
  // Kayıp hareket taklidi: stok hareketini sil (defterde duruyor), denetim yakalasın ve geri yazsın.
  // Kayıp hareket taklidi: yeni oturum, defterde fiş var ama üründe hareket yok ve varyant 0.
  const dorduncu = await uygulamaAc({ ...t, "fisdefter:data": JSON.stringify(defter),
    "stok:items": JSON.stringify((() => { const st = JSON.parse(t["stok:items"]); const p2 = st.find((x) => x.id === "u2"); p2.hareketler = []; p2.variants = [{ renk: "Siyah", beden: "41", miktar: 0 }]; return st; })()) },
    { hataYaz: false });
  const s4 = dorduncu.sayfa;
  s4.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  s4.on("dialog", (d) => d.accept());
  await s4.waitForTimeout(2300);
  await s4.getByRole("button", { name: "Tanımlar / Ayarlar", exact: true }).first().click();
  await s4.waitForTimeout(600);
  await s4.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Bakım" && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  await s4.waitForTimeout(400);
  await s4.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Denetimi Başlat/.test(x.textContent)); if (b) b.click(); });
  await s4.waitForTimeout(900);
  const defterBulgusu = await s4.evaluate(() => (document.body.innerText.match(/Fiş defterinde var, stokta yok\s*(\d+) kayıt/) || [])[1] || "0");
  await s4.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Fiş defterinde var, stokta yok/.test(x.textContent)); if (b) b.click(); });
  await s4.waitForTimeout(400);
  // OTOMATİK ONARIM KALDIRILDI (20 Eylül): "Defterden yeniden kur" düğmesi yoktu artık —
  // denetim yalnız BİLDİRİYOR. Düzeltme izi kalan bir işlemle yapılıyor (sayım fişi, fişi
  // geri alıp yeniden kesme). Ölçüm buna göre değişti: düğme OLMAMALI.
  const kurDugmesi = await s4.evaluate(() => (document.querySelector("[data-defterden-kur]") || {}).textContent || null);
  const onarimUyarisi = await s4.evaluate(() => /Otomatik düzeltme yok/.test(document.body.innerText));
  const kurSonrasi = { kaldirildi: kurDugmesi === null, uyariVar: onarimUyarisi };
  await dorduncu.tarayici.close();

  // ---- PARÇA 2: FİŞ YOLU DIŞINDAKİ HAREKETLER DE DEFTERDE ----
  // Üretim hareketi ve açılış göçü fiş yollarından geçmiyor; stok yazımından toplanıp deftere
  // düşmeleri gerekiyor (16 Eylül).
  const besinci = await uygulamaAc({ ...TOHUM }, { hataYaz: false });
  besinci.sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await besinci.sayfa.waitForTimeout(3000);
  const otomatikDefter = await (async () => {
    const d = (await depoOku(besinci.sayfa, "fisdefter:data")) || [];
    return {
      kaynaklar: [...new Set(d.map((f) => f.kaynak))].sort(),
      hepsiOtomatikIsaretli: d.every((f) => f.otomatik === true),
      hareketiOlmayanKayit: d.filter((f) => (f.stokHareketleri || []).length === 0).length,
    };
  })();
  await besinci.tarayici.close();

  // ---- FİŞSİZ HAREKET YAZILAMAZ (16 Eylül) ----
  // Numarasız bir hareket (sayım) tohuma konuluyor: açılışta kaynağına göre ön ekli numara almalı,
  // kalıcı yazılmalı ve deftere düşmeli.
  const tFissiz = { ...TOHUM };
  {
    const st = JSON.parse(TOHUM["stok:items"]);
    const bot = st.find((p) => p.id === "u2");
    bot.hareketler = [...(bot.hareketler || []), { id: "h-fissiz", tarih: "2026-09-16", renk: "Siyah", beden: "41", miktar: 2, kaynak: "Sayım" }];
    tFissiz["stok:items"] = JSON.stringify(st);
  }
  const altinci = await uygulamaAc(tFissiz, { hataYaz: false });
  altinci.sayfa.on("pageerror", (e) => hatalar.push(e.message.split("\n")[0]));
  await altinci.sayfa.waitForTimeout(3000);
  const fissizSonuc = await (async () => {
    const urun = (await depoOku(altinci.sayfa, "stok:items")).find((x) => x.id === "u2");
    const d = (await depoOku(altinci.sayfa, "fisdefter:data")) || [];
    const sayim = (urun.hareketler || []).find((h) => h.kaynak === "Sayım");
    return {
      fissizKalan: (urun.hareketler || []).filter((h) => !h.fisNo).length,
      sayimFisOnEki: sayim && String(sayim.fisNo || "").slice(0, 3),
      otomatikIsaretli: !!(sayim && sayim.fisOtomatik),
      defterKaynaklari: [...new Set(d.map((f) => f.kaynak))].sort(),
    };
  })();
  await altinci.tarayici.close();

  await tarayici.close();
  return { hatalar, fissizSonuc, otomatikDefter, atomik, defterBulgusu, kurDugmesi, kurSonrasi, defterKayitSayisi: defter.length, defterOzeti, varyant, defterToplami, iptalDurumu, varyantSonra };
}

if (require.main === module) {
  calistir().then((s) => console.log(normalles(s)));
}

module.exports = { calistir };
