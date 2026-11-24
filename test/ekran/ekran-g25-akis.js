#!/usr/bin/env node
// EKRAN SINAMASI — G-25 KULLANICI AKIŞI, YENİ İSTEMCİ (1.745.0) + G-25 SUNUCU (24 Kasım). Yalnız yerel PostgreSQL (gercek-pg-kopru;
// JWT'li authenticated — her kullanıcı giriş ekranından). Supabase'e bağlanmaz. Kullanıcı: "Yeni mesai ve tamir akışını ayrı istemci
// sürümünde tamamla. Yetkisiz düğmeleri kapat, sunucu retlerini kullanıcıya açıkça göster." + "meşru üretim tesliminin çalıştığını sına".
// Fikstür (bu dosya kurar): üretim g25-ek1 (ekr-bot, Siyah 40 × 10, tek adım Kesim), atama g25-ek1-a → g25-q (Personel, bölümde değil).
// Kesim ücreti 35 ONAYSIZ başlar. Adımlar:
//   1 Uretimci: Üretim › Ücret onayları → Kesim 35 "onay bekliyor" görünür
//   2 Uretimci: teslim al → sunucu reddeder; ekranda ret iletisi (ücret onay bekliyor), sunucuda fiş YOK, atama tamamlanmadı
//   3 Uretimci: Üretim › Mesai bildirimi → g25-p hafta içi 10 s → bekleyen bildirim; ekranda TUTAR YOK
//   4 Uretimci: cari kartı (g25-p) › maaş kutusu KAPALI; maaş şeridi YOK; Ödeme & Tahsilat cari virmanı Kaydet KAPALI (menüde varsa)
//   5 Muhasip: "Onay bekliyor" şeridi → Onaylar › Ücretler › Kesim seç → onayla (ucr_onay); Mesai › Onayla → TEK MS fişi 2.000 ₺
//      (30.000 / 225 × 10 × 1,5); ikinci kez onay düğmesi listede yok (bildirim onaylı); sunucuda MS sayısı 1
//   6 Uretimci (yeni oturum): aynı teslim → GEÇER: tek ÜRT fişi, g25-q Alacak 350 (10 × 35), atama tamamlandı, isc_odeme 1 satır
//   7 Uretimci: Mesai bildirimi › aynı ay → "onaylandı", Bildir kapalı
const { ekranAc, toastlar, O } = require("./ortak-ekran.js");
const DB = process.env.EKRAN_DB || "atolye_ekran";
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };

(async () => {
  const { kopruKur } = require("../gercek-pg-kopru.js");
  const k0 = kopruKur({ veritabani: DB });
  const q = (s, p) => k0.sorgu(s, p);
  // FİKSTÜR (yönetim yetkisiyle — sınanan bu değil)
  await q(`delete from public.uretim_atamalari where uretim_id = 'g25-ek1'`);
  await q(`delete from public.uretim where id = 'g25-ek1'`);
  await q(`insert into public.uretim (id, siparis_no, takip_kodu, urun_id, asama, ek, renk, adet, model, beden_miktarlari, proses_ilerleme, olusturuldu)
    values ('g25-ek1', 'G25EK1', 'G25EK1', 'ekr-bot', 'Kesim', '{}'::jsonb, 'Siyah', 10, 'Ekran Bot', '[{"beden": "40", "miktar": 10}]'::jsonb,
      '[{"proses": "Kesim", "sira": 1, "verildiMi": true, "tamamlandiMi": false, "personelId": "g25-q"}]'::jsonb, '2026-11-24T08:00:00.000Z')`);
  await q(`insert into public.uretim_atamalari (id, uretim_id, proses, personel_id, beden_miktarlari, miktar, verildi_mi, verilme_tarihi, tamamlandi_mi, tamir_mi, tamir_ucret, ek)
    values ('g25-ek1-a', 'g25-ek1', 'Kesim', 'g25-q', '{"40": 10}'::jsonb, 10, true, '2026-11-24T08:10:00.000Z', false, false, 0, '{}'::jsonb)`);
  await q(`update public.urunler set proses_ucretleri = '{"Kesim": 35}'::jsonb where id = 'ekr-bot'`);
  await q(`delete from public.ucr_onay where anahtar like 'proses|ekr-bot|%'`);
  await q(`delete from public.mes_bildirim where cari_id = 'g25-p'`);
  const ay = new Date().toISOString().slice(0, 7);
  const sayi = async (s, p) => Number((await q(s, p))[0].n);
  const urtFis = () => sayi(`select count(*) n from public.stk_fis where uretim_id = 'g25-ek1' and not iptal`);
  const msSayisi = () => sayi(`select count(*) n from public.car_hareket h join public.stk_fis f on f.id = h.fis_no where h.cari_id = 'g25-p' and f.onek = 'MS' and not f.iptal and not h.iptal`);
  const gorunurMetin = (s) => s.evaluate(() => document.body.innerText.replace(/\s+/g, " "));

  const teslimAl = async (s) => {
    await O.modulAc(s, "Üretim"); await s.waitForTimeout(800);
    await s.getByText("G25EK1", { exact: true }).last().click(); await s.waitForTimeout(1000);
    const n = await s.locator("[data-teslim-al]:visible").count();
    if (n) await s.locator("[data-teslim-al]:visible").first().click();
    await s.waitForTimeout(3000);
    return n > 0;
  };

  // ── 1–4: Uretimci
  {
    const { tarayici, sayfa, hatalar } = await ekranAc(DB, { kullanici: "Uretimci" });
    sayfa.on("dialog", (d) => d.accept());
    await O.modulAc(sayfa, "Üretim"); await sayfa.waitForTimeout(800);
    await sayfa.locator("[data-uretim-ucret-onaylari]").first().click(); await sayfa.waitForTimeout(1500);
    k_("1 ücret onay listesinde Kesim 35 bekliyor", await sayfa.locator('[data-ucret-onay-bekleyen="proses|ekr-bot|Kesim"]').count(), 1);
    await sayfa.locator("[data-uretim-ucret-onaylari]").first().click();
    const fis0 = await urtFis();
    const form = await teslimAl(sayfa);
    const metin = await gorunurMetin(sayfa);
    k_("2 teslim formu bulundu", form, true);
    k_("2 onaysız ücretle teslim: sunucuda fiş yok", (await urtFis()) - fis0, 0);
    k_("2 atama tamamlanmadı", (await q("select tamamlandi_mi t from public.uretim_atamalari where id = 'g25-ek1-a'"))[0].t, false);
    k_("2 ekranda ret iletisi (ücret onay bekliyor)", /Teslim kaydedilemedi.*Kesim ücreti \(35 ₺\) cari \/ muhasebe onayı bekliyor/.test(metin), true);
    // 3 mesai bildirimi
    await O.modulAc(sayfa, "Üretim"); await sayfa.waitForTimeout(600);
    await sayfa.locator("[data-uretim-mesai-bildirimi]").first().click(); await sayfa.waitForTimeout(1500);
    const satir = sayfa.locator('[data-mesai-bildirim-satir="g25-p"]');
    k_("3 bölüm personeli satırı var", await satir.count(), 1);
    await satir.locator('[data-mesai-bildirim-saat="haftaIci"]').fill("10");
    await satir.locator('[data-mesai-bildir="g25-p"]').click(); await sayfa.waitForTimeout(1500);
    const b = (await q(`select durum, saatler from public.mes_bildirim where cari_id = 'g25-p' and ay = $1`, [ay]))[0] || {};
    k_("3 sunucuda bekleyen bildirim (10 s)", [b.durum, b.saatler && Number(b.saatler.haftaIci)], ["bekliyor", 10]);
    k_("3 ekranda durum 'onay bekliyor', TUTAR YOK", [await satir.locator("[data-mesai-bildirim-durum]").innerText().then((x) => x.trim()), /₺/.test(await satir.innerText())], ["onay bekliyor", false]);
    k_("3 cari / MS değişmedi", await msSayisi(), 0);
    // 4 yetkisiz düğmeler
    k_("4 maaş şeridi yok", await sayfa.locator("[data-maas-bekliyor]").count(), 0);
    // Üretim rolünde cari görüntüleme yok → Cari menüsü de yok (1.744.36'da da). Kart denetimi cari görüntüleyebilen yetkisizde (Sefci) yapılır.
    k_("4 Uretimci'de Cari menüsü yok", await sayfa.locator('[data-nav="Cari"]').count(), 0);
    const kart = { count: async () => 0 };
    if (await kart.count()) {
      await kart.last().click(); await sayfa.waitForTimeout(700);
      await sayfa.locator('[data-cari-sekme="bilgiler"]:visible').last().click(); await sayfa.waitForTimeout(600);
      k_("4 cari kartı: maaş kutusu kapalı", await sayfa.locator("[data-personel-maas]:visible").first().isDisabled(), true);
      k_("4 cari kartı: 'Mesaiyi yaz' yok, 'onaya gönder' var", [await sayfa.locator("[data-mesai-yaz]:visible").count(), await sayfa.locator("[data-mesai-bildir-kart]:visible").count()], [0, 1]);
    }
    k_("sayfa hatası yok (Uretimci)", hatalar, []);
    await tarayici.close();
  }
  // ── 4b: Sefci (cari GÖRÜNTÜLEME + üretim / stok / fişler kaydetme; PARA yok) — 1.744.36'da mesaiyi ve maaşı yazabiliyordu
  {
    await q(`update public.tanimlar set veri = jsonb_set(veri, '{kullanicilar}', (select jsonb_agg(x) from jsonb_array_elements(veri -> 'kullanicilar') x where x ->> 'kullaniciAdi' <> 'Sefci')
      || '[{"id": "k-sefci", "kullaniciAdi": "Sefci", "rol": "Kullanıcı", "yetkiler": {"cari": {"goruntuleme": true}, "uretim": {"goruntuleme": true, "kaydetme": true}, "stok": {"goruntuleme": true, "kaydetme": true}, "fisler": {"goruntuleme": true, "kaydetme": true}, "siparis": {"goruntuleme": true}}}]'::jsonb) where id = 'tekil'`);
    const { tarayici, sayfa, hatalar } = await ekranAc(DB, { kullanici: "Sefci" });
    k_("4b Sefci: maaş şeridi yok", await sayfa.locator("[data-maas-bekliyor]").count(), 0);
    await O.modulAc(sayfa, "Cari"); await sayfa.waitForTimeout(700);
    await sayfa.locator('button:has-text("G25 Personel"):visible').last().click(); await sayfa.waitForTimeout(700);
    await sayfa.locator('[data-cari-sekme="bilgiler"]:visible').last().click(); await sayfa.waitForTimeout(600);
    k_("4b Sefci: maaş ve aylık saat kutusu kapalı", [await sayfa.locator("[data-personel-maas]:visible").first().isDisabled(),
      await sayfa.locator("[data-personel-saat]:visible").first().isDisabled()], [true, true]);
    k_("4b Sefci: 'Mesaiyi yaz' yok, 'onaya gönder' var, tutar yok", [await sayfa.locator("[data-mesai-yaz]:visible").count(),
      await sayfa.locator("[data-mesai-bildir-kart]:visible").count(), await sayfa.locator("[data-mesai-tutar]:visible").count()], [0, 1, 0]);
    // kartından ÖNCEKİ ay için bildirim (Üretim'den bildirilen bu ayla çakışmasın)
    const once = new Date(); once.setMonth(once.getMonth() - 1); const oncekiAy = once.toISOString().slice(0, 7);
    await sayfa.locator("[data-mesai-ay]:visible").first().fill(oncekiAy);
    await sayfa.locator('[data-mesai-saat="pazar"]:visible').first().fill("4");
    await sayfa.locator("[data-mesai-bildir-kart]:visible").first().click(); await sayfa.waitForTimeout(1500);
    k_("4b Sefci: kartından bildirim gitti (bekliyor, MS yok)", [((await q(`select durum from public.mes_bildirim where cari_id = 'g25-p' and ay = $1`, [oncekiAy]))[0] || {}).durum,
      await sayfa.locator("[data-mesai-bildirildi]:visible").count(), await msSayisi()], ["bekliyor", 1, 0]);
    // cari kartı serbest hareket Kaydet kapalı (formu açabilmek için hareket düğmesi gerekirse atlanır)
    k_("sayfa hatası yok (Sefci)", hatalar, []);
    await tarayici.close();
  }
  // ── 5: Muhasip onaylar
  {
    const { tarayici, sayfa, hatalar } = await ekranAc(DB, { kullanici: "Muhasip" });
    k_("5 'Onay bekliyor' şeridi görünür", (await sayfa.locator("[data-onay-bekliyor]").count()) > 0, true);
    await sayfa.locator("[data-onay-ac]").first().click(); await sayfa.waitForTimeout(1500);
    await sayfa.locator('[data-onay-sekme="ucret"]').click(); await sayfa.waitForTimeout(800);
    await sayfa.locator('[data-onay-ucret-sec="proses|ekr-bot|Kesim"]').check();
    await sayfa.locator("[data-onay-ucret-onayla]").click(); await sayfa.waitForTimeout(2000);
    const o = (await q(`select ozet from public.ucr_onay where anahtar = 'proses|ekr-bot|Kesim'`))[0];
    k_("5 Kesim 35 onaylandı (sunucu)", o && Number(o.ozet.ucret), 35);
    await sayfa.locator('[data-onay-sekme="mesai"]').click(); await sayfa.waitForTimeout(800);
    const bid = (await q(`select id from public.mes_bildirim where cari_id = 'g25-p' and ay = $1`, [ay]))[0].id;
    k_("5 mesai tutarı ekranda 2.000 ₺", (await sayfa.locator(`[data-onay-mesai="${bid}"] [data-onay-mesai-tutar]`).innerText()).replace(/\s/g, ""), "2.000₺");
    await sayfa.locator(`[data-onay-mesai-onayla="${bid}"]`).click(); await sayfa.waitForTimeout(2500);
    const ms = await q(`select h.tutar::text t from public.car_hareket h join public.stk_fis f on f.id = h.fis_no where h.cari_id = 'g25-p' and f.onek = 'MS' and not f.iptal`);
    k_("5 tek MS fişi 2.000 ₺", ms.map((x) => Number(x.t)), [2000]);
    k_("5 bildirim onaylı, listeden düştü", [(await q(`select durum from public.mes_bildirim where id = $1`, [bid]))[0].durum, await sayfa.locator(`[data-onay-mesai-onayla="${bid}"]`).count()], ["onaylandi", 0]);
    // 5b TAMİR: üretim tamir talebi (önerilen 5.000) → yetkili Onaylar › Ücretler'de ücreti 40 BELİRLER ve onaylar
    await q(`delete from public.uretim_atamalari where id = 'g25-ek1-t'`);
    await q(`insert into public.uretim_atamalari (id, uretim_id, proses, personel_id, beden_miktarlari, miktar, verildi_mi, tamamlandi_mi, tamir_mi, tamir_ucret, tamir_sebep, ek)
      values ('g25-ek1-t', 'g25-ek1', 'Kesim', 'g25-q', '{"40": 2}'::jsonb, 2, true, false, true, 5000, 'dikiş kaçığı', '{}'::jsonb)`);
    await sayfa.locator("[data-onay-kapat]").click(); await sayfa.waitForTimeout(500);
    // Onaylar penceresi her açılışta sunucudan yeniden okur (şerit kapanınca yeniden sayar)
    await sayfa.waitForTimeout(1500);
    await sayfa.locator("[data-onay-ac]").first().click(); await sayfa.waitForTimeout(1500);
    await sayfa.locator('[data-onay-sekme="ucret"]').click(); await sayfa.waitForTimeout(800);
    k_("5b tamir talebi listede (onay bekliyor, 5.000)", (await sayfa.locator('[data-onay-ucret="tamir|g25-ek1-t"]').innerText()).includes("5.000"), true);
    await sayfa.locator('[data-onay-tamir-ucret="tamir|g25-ek1-t"]').fill("40");
    await sayfa.locator("[data-onay-ucret-onayla]").click(); await sayfa.waitForTimeout(2000);
    const t = (await q(`select a.tamir_ucret::text u, o.ozet from public.uretim_atamalari a left join public.ucr_onay o on o.anahtar = 'tamir|g25-ek1-t' where a.id = 'g25-ek1-t'`))[0];
    k_("5b tamir ücreti 40 belirlendi ve onaylandı (atama + onay özeti)", [Number(t.u), t.ozet && Number(t.ozet.ucret), t.ozet && Number(t.ozet.miktar)], [40, 40, 2]);
    await q(`delete from public.uretim_atamalari where id = 'g25-ek1-t'`);   // teslim adımını etkilemesin (sunucu teslimi matriste)
    k_("sayfa hatası yok (Muhasip)", hatalar, []);
    await tarayici.close();
  }
  // ── 6–7: Uretimci yeniden
  {
    const { tarayici, sayfa, hatalar } = await ekranAc(DB, { kullanici: "Uretimci" });
    sayfa.on("dialog", (d) => d.accept());
    const fis0 = await urtFis();
    await teslimAl(sayfa);
    const yaz = await q(`select h.cari_id, h.yon, h.tutar::text t from public.car_hareket h join public.stk_fis f on f.id = h.fis_no
      where f.uretim_id = 'g25-ek1' and not f.iptal and not h.iptal`);
    k_("6 onaylı ücretle teslim: tek ÜRT fişi", (await urtFis()) - fis0, 1);
    k_("6 işçilik g25-q Alacak 350", yaz.map((x) => [x.cari_id, x.yon, Number(x.t)]), [["g25-q", "Alacak", 350]]);
    k_("6 atama tamamlandı + ödeme kaydı", [(await q("select tamamlandi_mi t from public.uretim_atamalari where id = 'g25-ek1-a'"))[0].t,
      await sayi("select count(*) n from public.isc_odeme where id = 'atama:g25-ek1-a'")], [true, 1]);
    await O.modulAc(sayfa, "Üretim"); await sayfa.waitForTimeout(600);
    await sayfa.locator("[data-uretim-mesai-bildirimi]").first().click(); await sayfa.waitForTimeout(1500);
    const satir = sayfa.locator('[data-mesai-bildirim-satir="g25-p"]');
    k_("7 bildirim 'onaylandı', Bildir kapalı", [/^onaylandı/.test((await satir.locator("[data-mesai-bildirim-durum]").innerText()).trim()),
      await satir.locator('[data-mesai-bildir="g25-p"]').isDisabled()], [true, true]);
    k_("7 MS hâlâ tek", await msSayisi(), 1);
    k_("sayfa hatası yok (Uretimci 2)", hatalar, []);
    await tarayici.close();
  }
  console.log(`── ekran-g25-akis: ${gecen} ✓ / ${kalan} ✗ ──`);
  await k0.kapat();
  process.exit(kalan ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
