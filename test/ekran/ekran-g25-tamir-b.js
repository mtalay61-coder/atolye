#!/usr/bin/env node
// EKRAN SINAMASI — B KURALI, GERÇEK İSTEMCİ (1.745.2) + G-25 SUNUCU (25 Kasım). Yalnız yerel PostgreSQL (gercek-pg-kopru; JWT'li authenticated).
// Kullanıcı: "B seçeneğini uygulayalım. İlk işçilik her çift için yalnız bir kez ödensin; tamire ayrılan çiftlerin ilk işçiliği sağlam dönüşe kadar
// beklesin. Tamiri başka usta yaparsa ilk işçilik ve tamir ücretinin alıcıları doğru ayrılsın. Tamir ücreti ayrıca ve açıkça onaylansın. ÜRT
// fişinde stok ve işçilik ayrı satırlarda gösterilsin; sağlam, tamir, hurda adetleri ile ödenen işçilik adedi, birim ücret ve toplam açık olsun."
// Fikstür: üretim g25-ek2 (ekr-bot, Siyah 40 × 10, Kesim), atama g25-ek2-a → g25-q (onaylı 10 × 35); tamirci g25-u2 (Personel, bölümde değil).
//   1 Uretimci: teslim 8 sağlam + 2 tamir (tamiri g25-u2 yapacak, önerilen 10) → ÜRT 280 (yalnız 8), tamir işi açık, ödeme defteri 8
//   2 Muhasip: Onaylar › Ücretler › tamir satırı ücret 15 → onayla
//   3 Uretimci: tamir işini teslim 2 sağlam → tamir 2 × 15 → g25-u2, ilk işçilik 2 × 35 → g25-q (ayrı satırlar); g25-q toplam 350 = 10 çift bir kez
//   4 Fişler: ilk ÜRT fişinde işçilik tablosu (sağlam 8 · tamir 2 · hurda 0 · ödenen 8 · 35 ₺ · 280 ₺); tamir fişinde iki işçilik satırı
const { ekranAc, O } = require("./ortak-ekran.js");
const DB = process.env.EKRAN_DB || "atolye_ekran";
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };

(async () => {
  const { kopruKur } = require("../gercek-pg-kopru.js");
  const k0 = kopruKur({ veritabani: DB });
  const q = (s, p) => k0.sorgu(s, p);
  // Her koşu kendi üretimiyle (aynı veritabanında yeniden koşunca önceki koşunun fişleri karışmasın)
  const N = String(Date.now() % 1000000); const U = `g25-b${N}`, A = `${U}-a`, NO = `G25B${N}`;
  await q(`insert into public.cariler (id, unvan, tip) values ('g25-u2', 'G25 Tamirci', 'Personel') on conflict (id) do nothing`);
  await q(`delete from public.isc_odeme where uretim_id = '${U}'`);
  await q(`delete from public.ucr_onay where ozet ->> 'uretim' = '${U}'`);
  await q(`delete from public.uretim_atamalari where uretim_id = '${U}'`);
  await q(`delete from public.uretim where id = '${U}'`);
  await q(`insert into public.uretim (id, siparis_no, takip_kodu, urun_id, asama, ek, renk, adet, model, beden_miktarlari, proses_ilerleme, olusturuldu)
    values ('${U}', '${NO}', '${NO}', 'ekr-bot', 'Kesim', '{}'::jsonb, 'Siyah', 10, 'Ekran Bot', '[{"beden": "40", "miktar": 10}]'::jsonb,
      '[{"proses": "Kesim", "sira": 1, "verildiMi": true, "tamamlandiMi": false, "personelId": "g25-q"}]'::jsonb, '2026-11-25T08:00:00.000Z')`);
  await q(`insert into public.uretim_atamalari (id, uretim_id, proses, personel_id, beden_miktarlari, miktar, verildi_mi, verilme_tarihi, tamamlandi_mi, tamir_mi, tamir_ucret, ek)
    values ('${A}', '${U}', 'Kesim', 'g25-q', '{"40": 10}'::jsonb, 10, true, '2026-11-25T08:10:00.000Z', false, false, 0, '{}'::jsonb)`);
  await q(`update public.urunler set proses_ucretleri = '{"Kesim": 35}'::jsonb where id = 'ekr-bot'`);
  await q(`insert into public.ucr_onay (anahtar, tur, ozet, onaylayan) values ('atama|${A}', 'atama', public.g25_ucret_guncel('atama|${A}'), 'fikstür')`);
  const cari = async () => (await q(`select h.cari_id, h.tutar::text t, coalesce((h.ek ->> 'ilkIscilik')::boolean, false) ilk from public.car_hareket h
    join public.stk_fis f on f.id = h.fis_no where f.uretim_id = '${U}' and not f.iptal and not h.iptal order by h.cari_id, h.tutar`)).map((x) => [x.cari_id, Number(x.t), x.ilk]);
  const odeme = async () => (await q(`select split_part(o.id, ':', 1) tur, o.cari_id, o.miktar::text m, o.ucret::text u from public.isc_odeme o join public.stk_fis f on f.istek = o.istek
    where o.uretim_id = '${U}' and not f.iptal`)).map((x) => [x.tur, x.cari_id, Number(x.m), Number(x.u)]).sort((a, b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : 1);
  const urtFis = async () => (await q(`select id from public.stk_fis where uretim_id = '${U}' and onek = 'ÜRT' and not iptal order by olusturma`)).map((x) => x.id);
  const kartAc = async (s) => { await O.modulAc(s, "Üretim"); await s.waitForTimeout(800); await s.getByText(NO, { exact: true }).last().click(); await s.waitForTimeout(1200); };

  // ── 1: Uretimci 8 sağlam + 2 tamir (tamirci g25-u2, önerilen 10)
  let tid = null;
  {
    const { tarayici, sayfa, hatalar } = await ekranAc(DB, { kullanici: "Uretimci" });
    sayfa.on("dialog", (d) => d.accept());
    await kartAc(sayfa);
    await sayfa.locator('[data-teslim-kutu="saglam|40"]:visible').first().fill("8");
    await sayfa.locator('[data-teslim-kutu="tamir|40"]:visible').first().fill("2"); await sayfa.waitForTimeout(400);
    await sayfa.locator('[data-teslim-tamir-kisi="40"]:visible').first().selectOption("g25-u2");
    await sayfa.locator('[data-teslim-tamir-ucret="40"]:visible').first().fill("10");
    await sayfa.locator("[data-teslim-al]:visible").first().click(); await sayfa.waitForTimeout(3500);
    k_("1 ilk teslim: tek ÜRT fişi, işçilik YALNIZ 8 sağlam (g25-q 280)", [(await urtFis()).length, await cari()], [1, [["g25-q", 280, false]]]);
    const t = (await q(`select id, personel_id, miktar::text m, tamir_ucret::text u, ek ->> 'tamirKaynakAtamaId' kay, tamamlandi_mi d from public.uretim_atamalari where uretim_id = '${U}' and tamir_mi`))[0] || {};
    tid = t.id;
    k_("1 tamir işi açık: g25-u2, 2 adet, önerilen 10, kaynak g25-ek2-a", [t.personel_id, Number(t.m), Number(t.u), t.kay, t.d], ["g25-u2", 2, 10, A, false]);
    k_("1 ödeme defteri: ilk iş 8", await odeme(), [["atama", "g25-q", 8, 35]]);
    k_("sayfa hatası yok (Uretimci 1)", hatalar, []);
    await tarayici.close();
  }
  // ── 2: Muhasip tamir ücretini 15 belirler, onaylar
  {
    const { tarayici, sayfa, hatalar } = await ekranAc(DB, { kullanici: "Muhasip" });
    await sayfa.locator("[data-onay-ac]").first().click(); await sayfa.waitForTimeout(1500);
    await sayfa.locator('[data-onay-sekme="ucret"]').click(); await sayfa.waitForTimeout(800);
    k_("2 tamir satırı listede, ücret kutusu var", await sayfa.locator(`[data-onay-tamir-ucret="atama|${tid}"]`).count(), 1);
    await sayfa.locator(`[data-onay-tamir-ucret="atama|${tid}"]`).fill("15");
    await sayfa.locator("[data-onay-ucret-onayla]").click(); await sayfa.waitForTimeout(2000);
    const o = (await q(`select a.tamir_ucret::text u, x.ozet from public.uretim_atamalari a left join public.ucr_onay x on x.anahtar = 'atama|' || a.id where a.id = $1`, [tid]))[0];
    k_("2 tamir ücreti 15 belirlendi ve AÇIKÇA onaylandı (atama + onay)", [Number(o.u), o.ozet && Number(o.ozet.ucret), o.ozet && o.ozet.tamir], [15, 15, true]);
    k_("sayfa hatası yok (Muhasip)", hatalar, []);
    await tarayici.close();
  }
  // ── 3: Uretimci tamir işini 2 sağlam teslim alır
  {
    const { tarayici, sayfa, hatalar } = await ekranAc(DB, { kullanici: "Uretimci" });
    sayfa.on("dialog", (d) => d.accept());
    await kartAc(sayfa);
    k_("3 açık tek iş (tamir) formu", await sayfa.locator("[data-teslim-al]:visible").count(), 1);
    await sayfa.locator('[data-teslim-kutu="saglam|40"]:visible').first().fill("2");
    await sayfa.locator("[data-teslim-al]:visible").first().click(); await sayfa.waitForTimeout(3500);
    k_("3 tamir teslimi: ikinci ÜRT fişi; tamir 2 × 15 → g25-u2, ilk 2 × 35 → g25-q (ayrı satır)", [(await urtFis()).length, await cari()],
      [2, [["g25-q", 70, true], ["g25-q", 280, false], ["g25-u2", 30, false]]]);
    k_("3 ödeme defteri: ilk 8 + ilk (tamirden) 2 + tamir 2", await odeme(), [["atama", "g25-q", 8, 35], ["atama", "g25-u2", 2, 15], ["ilk", "g25-q", 2, 35]]);
    k_("3 ilk usta 10 çift bir kez (350), tamirci 30", [(await cari()).filter((x) => x[0] === "g25-q").reduce((t, x) => t + x[1], 0),
      (await cari()).filter((x) => x[0] === "g25-u2").reduce((t, x) => t + x[1], 0)], [350, 30]);
    k_("sayfa hatası yok (Uretimci 2)", hatalar, []);
    await tarayici.close();
  }
  // ── 4: Fişler ekranı — işçilik ayrı tablo
  {
    const { tarayici, sayfa, hatalar } = await ekranAc(DB, { kullanici: "Muhasip" });
    const [f1, f2] = await urtFis();
    await O.modulAc(sayfa, "Fişler"); await sayfa.waitForTimeout(1500);
    const ac = async (no) => { await sayfa.locator(`[data-fis-kart="${no}"] > button`).first().click(); await sayfa.waitForTimeout(800); };
    const satirlar = async (no) => sayfa.locator(`[data-fis-kart="${no}"] [data-fis-iscilik-satir]`).evaluateAll((tr) =>
      tr.map((r) => Array.from(r.querySelectorAll("td")).map((td) => td.innerText.trim())));
    await ac(f1);
    k_("4 ilk fiş: işçilik tablosu sağlam 8 · tamir 2 · hurda 0 · ödenen 8 · 35 ₺ · 280 ₺",
      (await satirlar(f1)).map((r) => r.slice(2)), [["8", "2", "0", "8", "35 ₺", "280 ₺"]]);
    await ac(f2);
    k_("4 tamir fişi: iki işçilik satırı (tamir 2 × 15, ilk 2 × 35)", (await satirlar(f2)).map((r) => [r[5], r[6], r[7]]).sort(), [["2", "15 ₺", "30 ₺"], ["2", "35 ₺", "70 ₺"]]);
    k_("sayfa hatası yok (Fişler)", hatalar, []);
    await tarayici.close();
  }
  console.log(`── ekran-g25-tamir-b: ${gecen} ✓ / ${kalan} ✗ ──`);
  await k0.kapat();
  process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
