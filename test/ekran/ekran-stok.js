#!/usr/bin/env node
// EKRAN SINAMASI — STOK (7 Kasım). Uygulama EKRANDAN, gerçek yerel PostgreSQL'e karşı (gercek-pg-kopru). Canlı benzeri kopya
// (atolye_guvenlik → 12-geri-al = canlının bugünkü hâli, fiş kuralları KAPALI), kurulum: test/ekran/kurulum.sql (Ekran Bot,
// Siyah / Taba × 40 / 41, stok 0).
// Her adımda RENK × BEDEN stoğu iki yerden ölçülür ve beklenenle karşılaştırılır:
//   SUNUCU — stk_stok (fiş VE satır geçerliyse sayar; uygulamanın okuduğu görünüm)
//   EKRAN  — Bağımsız Stok Girişi formundaki "mevcut:" değeri (ürün + renk seçilince her beden için)
// Adımlar: giriş · ikinci renge giriş · çıkış · çıkışın iptali (Fişler › sağ tık › Sil) · sayfa yenileme · Kaydet'e çift tık ·
//   aynı kaydetme isteği ağda iki kez · yanıt kaybı (sunucu yazdı, cihaz yanıtı alamadı) sonra kullanıcı yeniden Kaydet · yenileme.
const assert = require("assert/strict");
const { ekranAc, yenile, toastlar, O } = require("./ortak-ekran.js");
const DB = process.env.EKRAN_DB || "atolye_ekran";
const URUN = "ekr-bot";
let gecen = 0, kalan = 0; const tablo = [];
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };

(async () => {
  // ağ müdahalesi: sıradaki fis_kes için "tekrar" (aynı isteği sunucuya iki kez) ya da "kayip" (sunucu yazar, yanıt düşer)
  let mod = null; const ozel = [];
  const mudahale = async (s, k) => {
    await s.route("**/rest/v1/rpc/fis_kes**", async (r) => {
      if (!mod) return r.fallback();
      const m = mod; mod = null;
      const istek = r.request();
      const sahte = { url: () => istek.url(), method: () => istek.method(), headers: () => istek.headers(), postData: () => istek.postData() };
      const bir = await k.__yanitla(sahte);
      ozel.push({ m, ilk: bir.status, govde: bir.body.slice(0, 160) });
      if (m === "kayip") return r.abort("connectionreset");
      const iki = await k.__yanitla(sahte);
      ozel.push({ m, ikinci: iki.status, govde: iki.body.slice(0, 160) });
      return r.fulfill(iki);
    });
  };
  const e = await ekranAc(DB, { mudahale });
  const { sayfa, k } = e;
  console.log(`ekran-stok · ${DB} · istemci ${await sayfa.evaluate(() => (window.__SURUM || document.title))} · kurallar ${e.ayar.fis_aktif ? "AÇIK" : "KAPALI"}`);

  const beklenen = { "Siyah/40": 0, "Siyah/41": 0, "Taba/40": 0, "Taba/41": 0 };
  const sunucu = async () => Object.fromEntries((await k.sorgu(`select renk_ad || '/' || olcu_ad as a, miktar::float as m from public.stk_stok where urun_id = $1 order by 1`, [URUN])).map((x) => [x.a, x.m]));
  const fisler = async () => (await k.sorgu(`select f.id, f.tur, f.iptal, (select string_agg(r.ad || '/' || o.ad || ':' || h.miktar, ',' order by r.ad, o.ad) from public.stk_hareket h
      join public.stk_varyant v on v.id = h.varyant_id left join public.stk_renk r on r.id = v.renk_id left join public.stk_olcu o on o.id = v.olcu_id where h.fis_id = f.id and not h.iptal) as satirlar
    from public.stk_fis f where f.id in (select fis_id from public.stk_hareket where urun_id = $1) order by f.olusturma`, [URUN]));
  const stokAc = async () => {
    try { await O.modulAc(sayfa, "Stok"); }
    catch (h) { console.log("    ! menü:", (await sayfa.evaluate(() => document.body.innerText)).slice(0, 600).replace(/\n/g, " · ")); throw h; }
    await sayfa.waitForTimeout(700);
  };
  const formAc = async () => {
    if (!(await sayfa.locator("[data-stok-giris-seridi]").count())) { await sayfa.locator('button[title^="Bağımsız stok girişi"]').first().click(); await sayfa.waitForTimeout(400); }
    await sayfa.locator("[data-stok-giris-urun]").first().selectOption(URUN); await sayfa.waitForTimeout(250);
  };
  const ekran = async () => {
    await stokAc(); await formAc();
    const sonuc = {};
    for (const renk of ["Siyah", "Taba"]) {
      await sayfa.locator("[data-stok-giris-renk]").first().selectOption(renk); await sayfa.waitForTimeout(250);
      for (const b of ["40", "41"]) {
        const t = await sayfa.locator(`[data-stok-giris-miktar="${b}"]`).first().evaluate((i) => i.closest("label").innerText);
        sonuc[`${renk}/${b}`] = Number((t.match(/mevcut:\s*(-?[\d.,]+)/) || [])[1]);
      }
    }
    await sayfa.locator("[data-stok-giris-seridi] .btn-ghost").first().click(); await sayfa.waitForTimeout(300);   // Vazgeç
    return sonuc;
  };
  const olc = async (adim) => {
    const s = await sunucu(); const ek = await ekran();
    console.log(`${adim}`);
    k_(`${adim} · sunucu (stk_stok)`, s, beklenen);
    k_(`${adim} · ekran ("mevcut:")`, ek, beklenen);
    tablo.push({ adim, beklenen: { ...beklenen }, sunucu: s, ekran: ek });
  };
  // ekrandan giriş / çıkış: yon "Giriş" | "Çıkış"; kaydet: "tek" | "cift" (çift tık)
  const hareket = async (renk, miktarlar, { yon = "Giriş", kaydet = "tek" } = {}) => {
    await stokAc(); await formAc();
    await sayfa.locator("[data-stok-giris-renk]").first().selectOption(renk); await sayfa.waitForTimeout(250);
    if (yon === "Çıkış") { await sayfa.locator("[data-stok-giris-seridi]").locator("xpath=..").locator("button", { hasText: "Çıkış" }).first().click(); await sayfa.waitForTimeout(200); }
    for (const [b, m] of Object.entries(miktarlar)) await sayfa.locator(`[data-stok-giris-miktar="${b}"]`).first().fill(String(m));
    const d = sayfa.locator("[data-stok-giris-seridi] .btn-save").first();
    if (kaydet === "cift") await d.dblclick(); else await d.click();
    await sayfa.waitForTimeout(2500);
    const t = await toastlar(sayfa);
    const son = (await k.sorgu(`select id from public.stk_fis where id in (select fis_id from public.stk_hareket where urun_id = $1) order by olusturma desc limit 1`, [URUN]))[0];
    return { toast: t, fis: son && son.id, formAcik: (await sayfa.locator("[data-stok-giris-seridi]").count()) > 0 };
  };

  await olc("0 · başlangıç");

  const g1 = await hareket("Siyah", { 40: 5, 41: 3 });
  beklenen["Siyah/40"] += 5; beklenen["Siyah/41"] += 3;
  console.log(`    giriş fişi ${g1.fis} · ${g1.toast.slice(0, 90)}`);
  await olc("1 · giriş Siyah 40:5 41:3");

  const g2 = await hareket("Taba", { 40: 2 });
  beklenen["Taba/40"] += 2;
  console.log(`    giriş fişi ${g2.fis}`);
  await olc("2 · giriş Taba 40:2");

  const c1 = await hareket("Siyah", { 40: 2 }, { yon: "Çıkış" });
  beklenen["Siyah/40"] -= 2;
  console.log(`    çıkış fişi ${c1.fis} · bildirim: ${c1.toast.slice(0, 120)}`);
  await olc("3 · çıkış Siyah 40:2");
  for (const sn of [5, 15]) { await sayfa.waitForTimeout(sn * 1000 - (sn === 15 ? 5000 : 0)); console.log(`    çıkıştan ~${sn} sn sonra ekran: ${JSON.stringify(await ekran())}`); }

  // İPTAL: Fişler › çıkış fişinin başlığına sağ tık › Sil / Bu Fişi Temizle › Evet
  await O.modulAc(sayfa, "Fişler"); await sayfa.waitForTimeout(900);
  const secici = `[data-fis-kart="${c1.fis}"]`;
  const bulundu = await sayfa.locator(secici).count();
  let silindi = false;
  if (bulundu) { silindi = (await O.sagTikSec(sayfa, secici, "sil")); await sayfa.waitForTimeout(400);
    if (silindi) { await sayfa.locator("[data-evet-temizle]").first().click(); await sayfa.waitForTimeout(2500); } }
  const it = await toastlar(sayfa);
  console.log(`    iptal: fiş kartı ${bulundu ? "bulundu" : "YOK"} · menü ${silindi ? "Sil seçildi" : "Sil yok"} · ${it.slice(0, 120)}`);
  const c1Sunucu = (await fisler()).find((f) => f.id === c1.fis);
  k_("4 · çıkış fişi sunucuda iptal", c1Sunucu && c1Sunucu.iptal, true);
  beklenen["Siyah/40"] += 2;
  await olc("4 · çıkış fişinin iptali");

  await yenile(sayfa);
  await olc("5 · sayfa yenilendi");

  // ÇİFT TIK
  const f0 = (await fisler()).length;
  const d1 = await hareket("Taba", { 41: 4 }, { kaydet: "cift" });
  beklenen["Taba/41"] += 4;
  k_("6 · çift tık → tek fiş", (await fisler()).length - f0, 1);
  await olc("6 · Kaydet'e çift tık (Taba 41:4)");

  // AYNI İSTEK AĞDA İKİ KEZ (yeniden gönderim): aynı gövde (aynı istek kimliği) sunucuya iki kez
  const f1 = (await fisler()).length;
  mod = "tekrar";
  const d2 = await hareket("Siyah", { 41: 1 });
  beklenen["Siyah/41"] += 1;
  console.log(`    tekrar: ${JSON.stringify(ozel.filter((x) => x.m === "tekrar").map((x) => x.ilk || x.ikinci))} · ${(ozel.find((x) => x.ikinci) || {}).govde || ""}`);
  k_("7 · aynı istek iki kez → tek fiş", (await fisler()).length - f1, 1);
  await olc("7 · aynı kaydetme isteği ağda iki kez (Siyah 41:1)");

  // YANIT KAYBI: sunucu yazar, yanıt cihaza ulaşmaz; uygulama ne der, form açık mı; kullanıcı yeniden Kaydet'e basar
  const f2 = (await fisler()).length;
  mod = "kayip";
  const d3 = await hareket("Taba", { 40: 3 });
  console.log(`    yanıt kaybı: form ${d3.formAcik ? "AÇIK" : "kapandı"} · ${d3.toast.slice(0, 160)}`);
  let tekrarBasildi = false;
  if (d3.formAcik) {
    tekrarBasildi = true;
    await sayfa.locator("[data-stok-giris-seridi] .btn-save").first().click(); await sayfa.waitForTimeout(2500);
    console.log(`    kullanıcı yeniden Kaydet: ${(await toastlar(sayfa)).slice(0, 160)}`);
  }
  beklenen["Taba/40"] += 3;
  k_(`8 · yanıt kaybı${tekrarBasildi ? " + yeniden Kaydet" : ""} → tek fiş`, (await fisler()).length - f2, 1);
  await olc(`8 · yanıt kaybı${tekrarBasildi ? " + yeniden Kaydet" : ""} (Taba 40:3)`);

  await yenile(sayfa);
  await olc("9 · sayfa yenilendi");

  console.log("FİŞLER (sunucu)"); (await fisler()).forEach((f) => console.log(`    ${f.id} ${f.tur} ${f.iptal ? "İPTAL" : "geçerli"} ${f.satirlar || "—"}`));
  const hatali = k.gunluk.filter((g) => g.durum >= 400 && !/^(onaylar|cop|cek_gorselleri|modeller|gorevler)$/.test(g.yol));
  console.log(`  ağ: ${k.gunluk.length} istek, hatalı ${hatali.length} ${JSON.stringify(hatali.slice(0, 8))}`);
  if (e.hatalar.length) console.log(`  sayfa hataları: ${e.hatalar.slice(0, 5).join(" | ")}`);
  require("fs").writeFileSync(process.env.EKRAN_TABLO || "/dev/null", JSON.stringify(tablo, null, 1));
  console.log(`── ekran-stok: ${gecen} geçti, ${kalan} kaldı ──`);
  await e.tarayici.close(); await k.kapat();
  process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
