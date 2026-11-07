#!/usr/bin/env node
// EKRAN SINAMASI — STOK: YENİDEN OKUMA ↔ KAYDETME YARIŞI (7 Kasım). Zorla sıra:
//   1. başka cihaz (doğrudan fis_kes, u-yeni) stok yazar → değişiklik sayacı artar
//   2. bu cihazın yoklaması sayacı görür ve stok tablolarını yeniden okur — bu okuma (GET varyantlar / stok_hareketleri / urunler)
//      köprüde 4 sn BEKLETİLİR (yavaş ağ)
//   3. okuma yoldayken kullanıcı ekrandan çıkış kaydeder (Ekran Bot Siyah 40: −1)
//   4. eski okuma döner. Ölçülen: ekran ("mevcut:") sunucuya (stk_stok) dönüyor mu; 0 / 10 / 20 / 40 sn sonra.
// Kahin: en geç birkaç yoklama turu sonra ekran = sunucu (eski okuma yeni kaydı kalıcı ezmemeli).
const { ekranAc, toastlar, O } = require("./ortak-ekran.js");
const DB = process.env.EKRAN_DB || "atolye_ekran"; const URUN = "ekr-bot";
(async () => {
  let bekletAktif = false, bekletilen = 0;
  const e = await ekranAc(DB, { mudahale: async (s, k) => {
    await s.route(/\/rest\/v1\/(varyantlar|stok_hareketleri|urunler)\?/, async (r) => {
      if (!bekletAktif || r.request().method() !== "GET") return r.fallback();
      bekletilen += 1;
      const istek = r.request();
      const yanit = await k.__yanitla({ url: () => istek.url(), method: () => "GET", headers: () => istek.headers(), postData: () => null });   // ŞİMDİ okunur (eski hâl)
      await new Promise((c) => setTimeout(c, 4000));
      return r.fulfill(yanit);
    });
  } });
  const { sayfa, k } = e;
  const sunucu = async () => Object.fromEntries((await k.sorgu(`select renk_ad || '/' || olcu_ad as a, miktar::float as m from public.stk_stok where urun_id = $1 and renk_ad = 'Siyah' order by 1`, [URUN])).map((x) => [x.a, x.m]));
  const formAc = async () => { await O.modulAc(sayfa, "Stok"); await sayfa.waitForTimeout(400);
    if (!(await sayfa.locator("[data-stok-giris-seridi]").count())) { await sayfa.locator('button[title^="Bağımsız stok girişi"]').first().click(); await sayfa.waitForTimeout(300); }
    await sayfa.locator("[data-stok-giris-urun]").first().selectOption(URUN); await sayfa.waitForTimeout(200);
    await sayfa.locator("[data-stok-giris-renk]").first().selectOption("Siyah"); await sayfa.waitForTimeout(200); };
  const ekran = async () => { await formAc(); const r = {};
    for (const b of ["40", "41"]) r[`Siyah/${b}`] = Number(((await sayfa.locator(`[data-stok-giris-miktar="${b}"]`).first().evaluate((i) => i.closest("label").innerText)).match(/mevcut:\s*(-?[\d.,]+)/) || [])[1]);
    await sayfa.locator("[data-stok-giris-seridi] .btn-ghost").first().click(); await sayfa.waitForTimeout(200); return r; };
  // hazırlık: Siyah 40'a 5 giriş (ekrandan), sonra 15 sn bekle (kendi yazma penceresi geçsin)
  await formAc(); await sayfa.locator('[data-stok-giris-miktar="40"]').first().fill("5");
  await sayfa.locator("[data-stok-giris-seridi] .btn-save").first().click(); await sayfa.waitForTimeout(15000);
  console.log(`  hazırlık: sunucu ${JSON.stringify(await sunucu())} · ekran ${JSON.stringify(await ekran())}`);
  // 1. başka cihaz yazar (oturumlu, fis_kes)
  // başka cihaz = aynı kullanıcının (Ali, Yönetici) ikinci oturumu; köprünün kendi istek yolundan (ayrı işlem, oturumlu)
  const yuk = { p: { istek: `baska-cihaz-${Date.now()}`, fis: { aile: "stok", tur: "Giriş", onek: "MNL", kaynak: "Manuel" },
    stok: { satirlar: [{ id: `bc-${Date.now()}`, urunId: "u-yeni", renk: "Siyah", miktar: 1, kaynak: "Manuel" }] } } };
  const bc = await k.__yanitla({ url: () => "http://yerel/rest/v1/rpc/fis_kes", method: () => "POST",
    headers: () => ({ authorization: "Bearer yerel-test:ali@atolye.local", "x-atolye-surum": "1.744.7" }), postData: () => JSON.stringify(yuk) });
  console.log(`  başka cihaz fis_kes: ${bc.status} ${bc.body.slice(0, 80)}`);
  bekletAktif = true;
  // 2. yoklama sayacı görsün ve yeniden okumaya başlasın (en çok 8 sn) — bekletilen GET görülünce 3. adım
  const bas = Date.now(); while (!bekletilen && Date.now() - bas < 20000) await sayfa.waitForTimeout(200);
  console.log(`  yeniden okuma başladı mı: ${bekletilen ? "evet" : "HAYIR"} (${Math.round((Date.now() - bas) / 1000)} sn)`);
  // 3. okuma yoldayken çıkış (form yeniden açılır — yeniden okuma henüz dönmedi)
  await formAc();
  await sayfa.locator("[data-stok-giris-seridi]").locator("xpath=..").locator("button", { hasText: "Çıkış" }).first().click();
  await sayfa.locator('[data-stok-giris-miktar="40"]').first().fill("1");
  await sayfa.locator("[data-stok-giris-seridi] .btn-save").first().click();
  await sayfa.waitForTimeout(500);
  bekletAktif = false;
  const olcumler = [];
  for (const sn of [5, 10, 20, 40]) {
    await sayfa.waitForTimeout((sn - (olcumler.length ? [5, 10, 20, 40][olcumler.length - 1] : 0)) * 1000);
    const s = await sunucu(), ek = await ekran();
    olcumler.push({ sn, sunucu: s, ekran: ek, ayni: JSON.stringify(s) === JSON.stringify(ek) });
    console.log(`  +${sn} sn · sunucu ${JSON.stringify(s)} · ekran ${JSON.stringify(ek)} ${JSON.stringify(s) === JSON.stringify(ek) ? "AYNI" : "FARKLI"}`);
  }
  console.log(`  bildirimler: ${(await toastlar(sayfa)).slice(0, 200)}`);
  const son = olcumler[olcumler.length - 1];
  console.log(`── ekran-stok-tazeleme: ${son.ayni ? "ekran sunucuya döndü" : "EKRAN 40 sn SONRA HÂLÂ ESKİ"} (ilk fark ${olcumler.findIndex((x) => !x.ayni) >= 0 ? "var" : "yok"}) ──`);
  await e.tarayici.close(); await k.kapat();
  process.exit(son.ayni ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
