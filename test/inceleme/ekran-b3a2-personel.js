#!/usr/bin/env node
// EKRAN DUMAN SINAMASI — B3a-2 KURULUYKEN PERSONEL OTURUMU (27 Kasım). Amaç: yeni alan kuralları uygulamanın KENDİ otomatik yazmalarını
// (açılış onarımları, kod verme, sayaçlar, görünüm) reddediyor mu? Yalnız stok yetkili Ayşe ve Yönetici Ali uygulamayı açar, modülleri
// gezer; sunucunun reddettiği her yazma (HTTP ≥ 400) listelenir — 0 olmalı. Ayşe'de fiyat kutuları kapalı, Ali'de açık olmalı
// (yeni ürün formu). Yerel PostgreSQL (gercek-pg-kopru). EKRAN_DB: canlıya hizalı taban + ekran tohumu + 29-b3a2-uygula.sql.
const { ekranAc, O } = require("../ekran/ortak-ekran.js");
const { Client } = require(process.env.KOPRU_PG || "pg");
const DB = process.env.EKRAN_DB || "b3a2_ekr";
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };
(async () => {
  for (const [kullanici, fiyatAcik] of [["Ayşe", false], ["Ali", true]]) {
    console.log(`\n■ ${kullanici}`);
    const c = await ekranAc(DB, { kullanici });
    const menu = await c.sayfa.evaluate(() => [...document.querySelectorAll("[data-nav]")].map((x) => x.getAttribute("data-nav")));
    for (const m of ["Ürün Stok", "Stok", "Üretim", "Sipariş", "Cari", "Fişler", "Anasayfa"]) {
      if (!menu.includes(m)) continue;
      try { await O.modulAc(c.sayfa, m); } catch (e) { console.log(`     (${m} açılamadı)`); }
      await c.sayfa.waitForTimeout(1500);
    }
    // ÜRÜN KARTI: fiyat kutuları yetkiye göre kapalı / açık; fiyat DIŞI alan (ad) değiştirilip kaydedilir — reddedilmemeli,
    // fiyat aynen kalmalı (istemci satırın tamamını yollar; sunucu yalnız gerçek fiyat değişikliğine bakar).
    if (menu.includes("Ürün Stok")) {
      const s = c.sayfa; const yeniAd = `Ekran Bot ${kullanici}`;
      await O.modulAc(s, "Ürün Stok"); await s.waitForTimeout(800);
      await s.evaluate(() => { const el = [...document.querySelectorAll("*")].find((x) => x.children.length === 0 && /^Ekran Bot/.test((x.textContent || "").trim()) && x.offsetParent);
        let p = el; for (let i = 0; i < 8 && p; i++, p = p.parentElement) { if (p.onclick || p.tagName === "BUTTON" || p.getAttribute("role") === "button") { p.click(); return; } } if (el) el.click(); });
      await s.waitForTimeout(1200);
      await s.evaluate(() => { const b = [...document.querySelectorAll('[data-kart-eylem="duzenle"]')].find((x) => x.offsetParent); if (b) b.click(); });
      await s.waitForTimeout(1000);
      // Kartın fiyat kutuları: sayı kutuları (step="any"). Yetkisizde alış + satış kutusu kapalıdır ve nedeni başlığında yazar;
      // yetkilide hiçbir sayı kutusu kapalı değildir.
      const kutu = await s.evaluate(() => [...document.querySelectorAll('input[type="number"]')].filter((x) => x.offsetParent && x.step === "any").map((x) => [x.disabled, /fiyat/i.test(x.title || "")]));
      const kapali = kutu.filter((x) => x[0]);
      k_(`${kullanici}: ürün kartında fiyat kutuları ${fiyatAcik ? "AÇIK" : "KAPALI"} (${kutu.length} sayı kutusu, ${kapali.length} kapalı)`,
        fiyatAcik ? kutu.length >= 2 && kapali.length === 0 : kapali.length === 2 && kapali.every((x) => x[1]), true);
      const bulundu = await s.evaluate((ad) => { const i = [...document.querySelectorAll("input")].find((x) => x.offsetParent && /^Ekran Bot/.test(x.value || "")); if (!i) return false; i.setAttribute("data-sinama-ad", "1"); return true; }, yeniAd);
      if (bulundu) { await s.locator('[data-sinama-ad="1"]').fill(yeniAd); await s.waitForTimeout(300);
        await s.evaluate(() => { const b = [...document.querySelectorAll('[data-kart-eylem="kaydet"]')].find((x) => x.offsetParent); if (b) b.click(); }); await s.waitForTimeout(3500); }
      const pg = new Client({ host: process.env.PGHOST || "localhost", database: DB, user: "postgres" }); await pg.connect();
      const satir = (await pg.query("select ad, satis_fiyati::text sf, alis_fiyati::text af from public.urunler where id = 'ekr-bot'")).rows[0]; await pg.end();
      k_(`${kullanici}: fiyat dışı alan (ad) kaydedildi, fiyatlar aynen`, [satir.ad, Number(satir.sf), Number(satir.af)], [yeniAd, 0, 0]);
    }
    await c.sayfa.waitForTimeout(10000);   // yoklama + gecikmeli otomatik yazmalar
    const red = c.k.gunluk.filter((x) => x.m !== "GET" && x.m !== "HEAD" && x.durum >= 400).map((x) => `${x.m} ${x.yol} ${x.durum} ${x.kod || ""} ${(x.mesaj || "").slice(0, 110)}`);
    k_(`${kullanici}: sunucunun reddettiği yazma YOK (${c.k.gunluk.filter((x) => x.m !== "GET" && x.m !== "HEAD").length} yazma isteği)`, red, []);
    k_(`${kullanici}: fiyat yetkisi bayrağı (satış / alış)`, await c.sayfa.evaluate(() => [window.__fiyatYetki.satis, window.__fiyatYetki.alis]), [fiyatAcik, fiyatAcik]);
    k_(`${kullanici}: sayfa hatası yok`, c.hatalar, []);
    await c.tarayici.close();
  }
  console.log(`\n── ekran-b3a2-personel: ${gecen} geçti · ${kalan} kaldı ──`);
  process.exit(kalan ? 1 : 0);
})().catch((x) => { console.error("HATA", x); process.exit(2); });
