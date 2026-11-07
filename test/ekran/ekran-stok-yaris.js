#!/usr/bin/env node
// EKRAN SINAMASI — STOK: KAYDETTİKTEN HEMEN SONRA EKRAN (7 Kasım). ekran-stok'un ilk koşusunda çıkıştan sonra bildirim "Başka cihazdan
// güncellendi: Stok" oldu ve formdaki "mevcut:" eski değeri gösterdi (sunucu doğru). Yarış mı? Aynı adım N kez: giriş ya da çıkış,
// 2,5 sn sonra ekran ↔ sunucu; bildirim metni kaydedilir. Ölçülen: kaç denemede ekran sunucudan farklı, fark kalıcı mı (10 sn sonra).
const { ekranAc, toastlar, O } = require("./ortak-ekran.js");
const DB = process.env.EKRAN_DB || "atolye_ekran"; const URUN = "ekr-bot"; const N = Number(process.env.YARIS_N || 8);
(async () => {
  const e = await ekranAc(DB); const { sayfa, k } = e;
  const sunucu = async () => Object.fromEntries((await k.sorgu(`select renk_ad || '/' || olcu_ad as a, miktar::float as m from public.stk_stok where urun_id = $1 and renk_ad = 'Siyah' order by 1`, [URUN])).map((x) => [x.a, x.m]));
  const formAc = async () => { await O.modulAc(sayfa, "Stok"); await sayfa.waitForTimeout(500);
    if (!(await sayfa.locator("[data-stok-giris-seridi]").count())) { await sayfa.locator('button[title^="Bağımsız stok girişi"]').first().click(); await sayfa.waitForTimeout(300); }
    await sayfa.locator("[data-stok-giris-urun]").first().selectOption(URUN); await sayfa.waitForTimeout(200);
    await sayfa.locator("[data-stok-giris-renk]").first().selectOption("Siyah"); await sayfa.waitForTimeout(200); };
  const ekran = async () => { await formAc(); const r = {};
    for (const b of ["40", "41"]) r[`Siyah/${b}`] = Number(((await sayfa.locator(`[data-stok-giris-miktar="${b}"]`).first().evaluate((i) => i.closest("label").innerText)).match(/mevcut:\s*(-?[\d.,]+)/) || [])[1]);
    await sayfa.locator("[data-stok-giris-seridi] .btn-ghost").first().click(); await sayfa.waitForTimeout(200); return r; };
  let fark = 0, kalici = 0; const satir = [];
  for (let i = 0; i < N; i++) {
    const yon = i % 2 === 0 ? "Giriş" : "Çıkış";
    await formAc();
    if (yon === "Çıkış") await sayfa.locator("[data-stok-giris-seridi]").locator("xpath=..").locator("button", { hasText: "Çıkış" }).first().click();
    await sayfa.locator('[data-stok-giris-miktar="40"]').first().fill("1");
    await sayfa.locator("[data-stok-giris-seridi] .btn-save").first().click();
    await sayfa.waitForTimeout(2500);
    const t = await toastlar(sayfa); const s = await sunucu(); const ek = await ekran();
    const esit = JSON.stringify(s) === JSON.stringify(ek);
    let sonra = null;
    if (!esit) { fark += 1; await sayfa.waitForTimeout(10000); sonra = await ekran(); if (JSON.stringify(sonra) !== JSON.stringify(await sunucu())) kalici += 1; }
    satir.push(`${i + 1}. ${yon} · sunucu ${JSON.stringify(s)} · ekran ${JSON.stringify(ek)} ${esit ? "AYNI" : `FARKLI → 10 sn sonra ${JSON.stringify(sonra)}`} · bildirim: ${t.slice(0, 70)}`);
  }
  satir.forEach((x) => console.log("  " + x));
  console.log(`── ekran-stok-yaris: ${N} denemede ekran ≠ sunucu: ${fark}; 10 sn sonra hâlâ farklı: ${kalici} ──`);
  await e.tarayici.close(); await k.kapat();
  process.exit(kalici ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
