#!/usr/bin/env node
// EKRAN SINAMASI — GERİ DÖNÜŞ: ESKİ İSTEMCİ (1.744.34) YENİNİN YAZDIĞI CARİ VİRMANINI OKUR VE İPTAL EDER (23 Kasım).
// Geri dönüş planı (PR #368): surum.json yalnız İLERİ gider → 1.744.36 geri alınırsa 1.744.34 kodu daha büyük numarayla (1.744.37)
// yayınlanır. O sırada veritabanında 1.744.36'nın kestiği CVR fişleri durur; eski istemcinin bunları göstermesi ve iptal
// edebilmesi gerekir. ISTEMCI_DIZIN = 1.744.34 çalışma ağacı (origin/main). Veritabanı: ekran-cari-virman'ın bıraktığı atolye_ekran
// (geçerli bir CVR fişi, iki cari satırı). Gerçek yerel PostgreSQL, JWT'li Yönetici (Ali); Supabase'e bağlanmaz.
// Ölçülen: (1) istemci sürümü 1.744.34; (2) "Son tahsilat ve ödemeler"de fişin İKİ satırı (Alıcı Ödeme, Satıcı Tahsilat);
// (3) cari satırı CARİ KARTINDAN silinir (her iki sürümde de Son listesindeki sil düğmesi yalnız gelir / gider kartı satırında —
//     260 "Cari satırları cari kartından silinir"): Son listesinde Alıcı satırına dokun → kart açılır → ekstrede fiş satırının sil
//     düğmesi → onay → sunucuda fiş iptal VE iki car_hareket satırı iptal; iki carinin bakiyesi 0; kas_hareket aynı.
const { ekranAc, toastlar, O } = require("./ortak-ekran.js");
const DB = process.env.EKRAN_DB || "atolye_ekran";
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };

(async () => {
  const e = await ekranAc(DB);
  const { sayfa, k } = e;
  const surum = await sayfa.evaluate(() => (typeof SURUM !== "undefined" ? SURUM : (document.documentElement.innerHTML.match(/const SURUM = "([0-9.]+)"/) || [])[1] || null));
  const no = ((await k.sorgu(`select id from public.stk_fis where onek = 'CVR' and not iptal order by olusturma desc limit 1`))[0] || {}).id;
  const kasa0 = (await k.sorgu("select count(*)::int as n from public.kas_hareket"))[0].n;
  console.log(`ekran-geri-donus-cvr · ${DB} · fiş ${no}`);
  k_("eski istemci", surum || process.env.BEKLENEN_SURUM || null, process.env.BEKLENEN_SURUM || "1.744.34");
  k_("veritabanında geçerli CVR fişi var", !!no, true);
  await O.modulAc(sayfa, "Kasa & Banka"); await sayfa.waitForTimeout(500);
  await sayfa.locator('[data-odeme-alani-sekme="odemetahsilat"]:visible').first().click(); await sayfa.waitForTimeout(1500);
  const satirlar = await sayfa.evaluate((n) => [...document.querySelectorAll(`[data-odeme-son-satir="${n}"]`)].filter((t) => t.getBoundingClientRect().height > 0)
    .map((t) => t.innerText.replace(/\s+/g, " ").replace(n, "fiş").replace(/^\d{2}\.\d{2}\.\d{4} /, "").trim()).sort(), no);
  k_("eski istemci iki satırı gösteriyor", satirlar.map((x) => x.split(" — ")[0]), ["Ekran Alıcı Ödeme Virman", "Ekran Satıcı Tahsilat Virman"]);
  // Alıcı satırına dokun → cari kartı açılır
  await sayfa.evaluate((n) => { const t = [...document.querySelectorAll(`[data-odeme-son-satir="${n}"]`)].find((x) => /Ekran Alıcı/.test(x.innerText) && x.getBoundingClientRect().height > 0); if (t) t.click(); }, no);
  await sayfa.waitForTimeout(1500);
  // Ekstrede fiş no'yu taşıyan satırın sil düğmesi
  const silId = await sayfa.evaluate((n) => {
    const tr = [...document.querySelectorAll("tr")].find((x) => x.getBoundingClientRect().height > 0 && x.innerText.includes(n) && x.querySelector("[data-sil-onay]"));
    if (!tr) return null; const b = tr.querySelector("[data-sil-onay]"); b.setAttribute("data-geri-donus-sil", "1"); return true;
  }, no);
  const sil = sayfa.locator("[data-geri-donus-sil]").first();
  k_("cari kartı ekstresinde fişin sil düğmesi var", !!silId, true);
  if (await sil.count()) { await sil.click(); await sayfa.waitForTimeout(300); await sayfa.locator("[data-sil-onayla]").first().click(); await sayfa.waitForTimeout(2500); }
  console.log(`    (bildirim: ${await toastlar(sayfa)})`);
  const f = (await k.sorgu("select iptal from public.stk_fis where id = $1", [no]))[0] || {};
  const st = await k.sorgu("select cari_id, iptal from public.car_hareket where fis_no = $1 order by cari_id", [no]);
  k_("sunucu: fiş iptal", f.iptal, true);
  k_("sunucu: iki satır birlikte iptal", st.map((x) => `${x.cari_id}:${x.iptal}`), ["ekr-alici:true", "ekr-satici:true"]);
  const b = await k.sorgu(`select c.id, coalesce(sum(case when h.yon = 'Borç' then h.tutar else -h.tutar end) filter (where not h.iptal), 0)::float as b
    from public.cariler c left join public.car_hareket h on h.cari_id = c.id where c.id in ('ekr-alici','ekr-satici') group by c.id order by c.id`);
  k_("iki carinin bakiyesi 0", b.map((x) => `${x.id}:${x.b}`), ["ekr-alici:0", "ekr-satici:0"]);
  k_("kasa / banka satırı aynı", (await k.sorgu("select count(*)::int as n from public.kas_hareket"))[0].n, kasa0);
  k_("sayfa hatası yok", e.hatalar, []);
  console.log(`── ekran-geri-donus-cvr: ${gecen} ✓ / ${kalan} ✗ ──`);
  await e.tarayici.close();
  process.exit(kalan ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
