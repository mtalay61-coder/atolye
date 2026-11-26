#!/usr/bin/env node
// EKRAN SINAMASI — ÜRETİM TESLİMİNDE ÇİFT STOK / ÇİFT ÖDEME (kapsamlı inceleme 25; kullanıcı: "üretim teslimi → iptal → yeniden teslim,
// kısmi teslim ve tamirde çift stok/ödeme. Bunları G-25'siz, mevcut canlı yapıya hizalı tabanda sına. Önceki G-25 sonuçlarını bunun
// yerine kullanma."). Uygulama EKRANDAN (istemci ISTEMCI_DIZIN, ör. 1.744.40), gerçek yerel PostgreSQL'e (gercek-pg-kopru, JWT'li
// authenticated). Taban: EKRAN_DB (inc_ekran_taban kopyası = canlı 25 yapısı + tohum-ekran + ekran kurulumu; G-25 nesnesi YOK).
// Supabase'e bağlanmaz.
//
// Her adımdan sonra SUNUCUDAN ölçülür (gözlemci, süper kullanıcı): mamul stoğu (stk_stok, ekr-bot renk/beden), personel cari bakiyesi
// (geçerli satır + geçerli fiş; alacak −), üretim başına GEÇERLİ / İPTAL ÜRT fişi sayısı, atamaların durumu. Beklenen her adımda elle
// yazılı (proses ücreti Kesim 35 ₺/çift, tamir 5 ₺/çift).
//   S1 tam teslim 10 → stok 10, usta −350, 1 geçerli fiş
//   S2 Geri Al → stok 0, usta 0, fiş iptal, atama teslim alınmadı
//   S3 yeniden teslim 10 → stok 10, usta −350 (700 DEĞİL), 1 geçerli + 1 iptal; sayfa yenileme sonrası değişmez (yeniden gönderim yok)
//   S4 kısmi: 6 → stok 6 / −210; kalan 4 → 10 / −350; ikinci parçayı Geri Al → 6 / −210; yeniden 4 → 10 / −350
//   S5 tamir: sağlam 7 + tamir 3 (tamirci, 5 ₺) → stok 7 (tamirdeki girmez), usta −350 (tamir çifti de ödenir — 079 kuralı),
//      tamir ataması 3; tamir teslimi 3 → stok 10, tamirci −15; Geri Al → 7 / 0; yeniden → 10 / −15; usta hep −350
//   S6 iki cihaz: B cihazı kartı açık bekler, A teslim alır; B (bayat) aynı atamayı teslim almaya çalışır → stok / ödeme İKİNCİ KEZ
//      yazılmamalı (sunucu reddi ya da istemci engeli; hangisi olduğu yazılır)
const { ekranAc, toastlar, O } = require("../ekran/ortak-ekran.js");
const DB = process.env.EKRAN_DB || "inc_fin";
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };

(async () => {
  const { kopruKur } = require("../gercek-pg-kopru.js");
  const k0 = kopruKur({ veritabani: DB });
  const q = (s, p) => k0.sorgu(s, p);
  // FİKSTÜR (gözlemci; sınanan bu değil): iki personel, Kesim ücreti, dört üretim (tek adım Kesim, Siyah 40 × 10, iş usta'ya verilmiş)
  await q(`insert into public.cariler (id, unvan, tip) values ('fin-usta', 'Fin Usta', 'Personel'), ('fin-tamirci', 'Fin Tamirci', 'Personel')
           on conflict (id) do nothing`);
  await q(`update public.urunler set proses_ucretleri = '{"Kesim": 35}'::jsonb where id = 'ekr-bot'`);
  for (const n of [1, 2, 3, 4, 5, 6]) {
    await q(`insert into public.uretim (id, siparis_no, takip_kodu, urun_id, asama, ek, renk, adet, model, beden_miktarlari, proses_ilerleme, olusturuldu)
      values ($1, $2, $2, 'ekr-bot', 'Kesim', '{}'::jsonb, 'Siyah', 10, 'Ekran Bot', '[{"beden": "40", "miktar": 10}]'::jsonb,
        '[{"proses": "Kesim", "sira": 1, "verildiMi": true, "tamamlandiMi": false, "personelId": "fin-usta"}]'::jsonb, '2026-11-26T08:00:00.000Z')
      on conflict (id) do nothing`, [`fin-${n}`, `FIN${n}`]);
    await q(`insert into public.uretim_atamalari (id, uretim_id, proses, personel_id, beden_miktarlari, miktar, verildi_mi, verilme_tarihi, tamamlandi_mi, tamir_mi, tamir_ucret, ek)
      values ($1, $2, 'Kesim', 'fin-usta', '{"40": 10}'::jsonb, 10, true, '2026-11-26T08:10:00.000Z', false, false, 0, '{}'::jsonb) on conflict (id) do nothing`, [`fin-${n}-a`, `fin-${n}`]);
  }
  const stok = async () => Number(((await q(`select coalesce(sum(miktar), 0)::float m from public.stk_stok where urun_id = 'ekr-bot' and renk_ad = 'Siyah' and olcu_ad = '40'`))[0] || {}).m || 0);
  const cari = async (id) => Number((await q(`select coalesce(sum(case when h.yon ilike 'b%' then h.tutar else -h.tutar end), 0)::float t
      from public.car_hareket h left join public.stk_fis f on f.id = h.fis_id where h.cari_id = $1 and not coalesce(h.iptal, false) and (h.fis_id is null or not f.iptal)`, [id]))[0].t);
  const fisler = async (u) => { const r = (await q(`select count(*) filter (where not iptal) g, count(*) filter (where iptal) i from public.stk_fis where uretim_id = $1`, [u]))[0];
    return `${r.g} geçerli / ${r.i} iptal`; };
  const atamalar = async (u) => (await q(`select id, miktar::float m, tamamlandi_mi t, tamir_mi tm, personel_id p from public.uretim_atamalari where uretim_id = $1 order by id`, [u]))
    .map((a) => `${a.id.replace(u + "-", "")}:${a.m}${a.tm ? "T" : ""}:${a.p || "-"}:${a.t ? "teslim" : "bekliyor"}`);
  const durum = async (u) => ({ stok: await stok(), usta: await cari("fin-usta"), tamirci: await cari("fin-tamirci"), fis: await fisler(u) });
  const say = async (u) => console.log(`     ${u}: ${JSON.stringify(await durum(u))} · atamalar ${JSON.stringify(await atamalar(u))}`);

  const e = await ekranAc(DB);
  const { sayfa } = e;
  sayfa.on("dialog", (d) => d.accept());
  console.log(`ekran-uretim-finans · ${DB} · istemci ${await sayfa.evaluate(() => window.__SURUM || document.title)} · kurallar ${e.ayar.fis_aktif ? "AÇIK" : "KAPALI"} · G-25 nesnesi ${(await q("select count(*) n from pg_proc where proname like 'g25%'"))[0].n}`);

  const kartAc = async (s, no) => {
    await O.modulAc(s, "Üretim"); await s.waitForTimeout(900);
    await s.getByText(no, { exact: true }).last().click(); await s.waitForTimeout(1200);
  };
  // Teslim formu: n'inci (0'dan) görünür form; SAĞLAM / TAMİR satırındaki 40 kutusu
  const formlar = (s) => s.locator("div", { has: s.locator("[data-teslim-al]") }).filter({ hasText: "Teslim Al ·" });
  // Kart teslimden sonra kapanabiliyor / liste yeniden diziliyor → eylemden önce gerekli öğe görünmüyorsa kart yeniden açılır
  const acik = async (s, no, secici) => {
    if (await s.locator(secici).count()) return;
    await kartAc(s, no);
    // tamamlanan adım kapalı durur: "detay / geri al" açar
    if (!(await s.locator(secici).count()) && (await s.getByText("detay / geri al").count())) { await s.getByText("detay / geri al").last().click(); await s.waitForTimeout(900); }
  };
  const GERI = 'span:has-text("Teslim Alındı") >> button:has-text("Geri Al")';
  const teslim = async (s, { no, saglam, tamir = 0, tamirci = null, tamirUcret = null, form = 0, ciftTik = false }) => {
    await acik(s, no, "[data-teslim-al]:visible");
    const f = s.locator("[data-teslim-al]:visible").nth(form).locator("xpath=ancestor::div[.//table][1]");
    const satirKutu = (etiket) => f.locator("tr", { hasText: etiket }).locator("input").first();
    await satirKutu("SAĞLAM").fill(String(saglam));
    if (tamir) {
      await satirKutu("TAMİR").fill(String(tamir)); await s.waitForTimeout(300);
      const kim = f.locator("label", { hasText: "Tamiri kim yapacak" }).locator("select");
      if (tamirci) await kim.selectOption(tamirci);
      if (tamirUcret != null) await f.locator("label", { hasText: "Tamir ücreti" }).locator("input").fill(String(tamirUcret));
    }
    await s.waitForTimeout(300);
    const dugme = s.locator("[data-teslim-al]:visible").nth(form);
    if (ciftTik) await dugme.dblclick(); else await dugme.click();
    await s.waitForTimeout(3500);
  };
  // Teslimi geri al: devam eden adımda "Teslim Alındı" yanındaki Geri Al; TAMAMLANAN adımda kart kapalı özet gösterir →
  // "detay / geri al" → "Atamalar: … Geri Al" (iş verme Geri Al'ı ile karışmasın diye ikisi ayrı aranır)
  const TAM = 'div:has-text("Atamalar:") >> button:has-text("Geri Al")';
  const geriAlDugmeleri = async (s, no) => {
    if (await s.locator(GERI + ":visible").count()) return s.locator(GERI + ":visible");
    if (await s.locator(TAM + ":visible").count()) return s.locator(TAM + ":visible");
    const detay = s.getByText("detay / geri al");
    if (await detay.count() && await detay.last().isVisible()) { await detay.last().click(); await s.waitForTimeout(900); return s.locator(TAM + ":visible"); }
    await kartAc(s, no);
    if (await s.locator(GERI + ":visible").count()) return s.locator(GERI + ":visible");
    if (await s.getByText("detay / geri al").count()) { await s.getByText("detay / geri al").last().click(); await s.waitForTimeout(900); }
    return s.locator(TAM + ":visible");
  };
  const geriAl = async (s, no, sira = 0) => {
    const d = await geriAlDugmeleri(s, no);
    const n = await d.count();
    await d.nth(sira < 0 ? n + sira : sira).click();
    await s.waitForTimeout(3500);
  };
  const toast = async (s) => (await toastlar(s)).slice(0, 220);

  // ── S1–S3: tam teslim → Geri Al → yeniden teslim
  console.log("\n■ S1–S3 · FIN1 · tam teslim → Geri Al → yeniden teslim");
  await kartAc(sayfa, "FIN1");
  k_("S0 başlangıç", await durum("fin-1"), { stok: 0, usta: 0, tamirci: 0, fis: "0 geçerli / 0 iptal" });
  await teslim(sayfa, { no: "FIN1", saglam: 10 });
  k_("S1 tam teslim 10 → stok 10, usta −350, 1 fiş", await durum("fin-1"), { stok: 10, usta: -350, tamirci: 0, fis: "1 geçerli / 0 iptal" });
  k_("S1 atama teslim alındı", await atamalar("fin-1"), ["a:10:fin-usta:teslim"]);
  await geriAl(sayfa, "FIN1");
  k_("S2 Geri Al → stok 0, usta 0, fiş iptal", await durum("fin-1"), { stok: 0, usta: 0, tamirci: 0, fis: "0 geçerli / 1 iptal" });
  k_("S2 atama yeniden bekliyor", await atamalar("fin-1"), ["a:10:fin-usta:bekliyor"]);
  await teslim(sayfa, { no: "FIN1", saglam: 10 });
  k_("S3 yeniden teslim → stok 10, usta −350 (çift ödeme yok)", await durum("fin-1"), { stok: 10, usta: -350, tamirci: 0, fis: "1 geçerli / 1 iptal" });
  await sayfa.reload(); await sayfa.waitForTimeout(500);
  await sayfa.evaluate(() => { const kok = window.__ReactDOMClient.createRoot(document.getElementById("kok")); kok.render(window.__React.createElement(window.__App)); });
  await sayfa.waitForTimeout(4000);
  const { girisYap } = require("../ekran/ortak-ekran.js"); await girisYap(sayfa);
  await sayfa.waitForTimeout(2500);
  k_("S3 sayfa yenileme sonrası sunucu değişmedi (yeniden gönderim yok)", await durum("fin-1"), { stok: 10, usta: -350, tamirci: 0, fis: "1 geçerli / 1 iptal" });
  await say("fin-1");

  // ── S4: kısmi teslim
  console.log("\n■ S4 · FIN2 · kısmi 6 + 4, ikinci parçayı Geri Al, yeniden 4 (son teslimde çift tık)");
  await kartAc(sayfa, "FIN2");
  await teslim(sayfa, { no: "FIN2", saglam: 6 });
  k_("S4a kısmi 6 → stok 6, usta −210", await durum("fin-2"), { stok: 16, usta: -560, tamirci: 0, fis: "1 geçerli / 0 iptal" });
  k_("S4a kalan 4 ustada (yeni atama)", (await atamalar("fin-2")).map((x) => x.split(":").slice(1).join(":")).sort(), ["4:fin-usta:bekliyor", "6:fin-usta:teslim"]);
  await say("fin-2");
  await teslim(sayfa, { no: "FIN2", saglam: 4 });
  k_("S4b kalan 4 → stok 10, usta −350 (FIN2 payı)", await durum("fin-2"), { stok: 20, usta: -700, tamirci: 0, fis: "2 geçerli / 0 iptal" });
  await say("fin-2");
  await geriAl(sayfa, "FIN2", 1);
  k_("S4c ikinci parça Geri Al → FIN2 6 / −210", await durum("fin-2"), { stok: 16, usta: -560, tamirci: 0, fis: "1 geçerli / 1 iptal" });
  await say("fin-2");
  await teslim(sayfa, { no: "FIN2", saglam: 4, ciftTik: true });
  k_("S4d yeniden 4 (çift tık) → FIN2 10 / −350, tek yeni fiş", await durum("fin-2"), { stok: 20, usta: -700, tamirci: 0, fis: "2 geçerli / 1 iptal" });
  await say("fin-2");

  // ── S5: tamir
  console.log("\n■ S5 · FIN3 · sağlam 7 + tamir 3 (Fin Tamirci, 5 ₺) → tamir teslimi → Geri Al → yeniden");
  await kartAc(sayfa, "FIN3");
  await teslim(sayfa, { no: "FIN3", saglam: 7, tamir: 3, tamirci: "fin-tamirci", tamirUcret: 5 });
  k_("S5a stok +7 (tamirdeki girmez), usta +10 çift ödendi", await durum("fin-3"), { stok: 27, usta: -1050, tamirci: 0, fis: "1 geçerli / 0 iptal" });
  await say("fin-3");
  const tAtama = (await atamalar("fin-3")).filter((x) => x.includes("T:"));
  k_("S5a tamir ataması 3 çift Fin Tamirci'de", tAtama.map((x) => x.split(":").slice(1).join(":")), ["3T:fin-tamirci:bekliyor"]);
  // tamir formu: kartta ikinci görünür teslim formu olabilir; bekleyen tek form tamir ataması
  await teslim(sayfa, { no: "FIN3", saglam: 3, form: 0 });
  k_("S5b tamir teslimi → stok +3, tamirci −15, usta değişmedi", await durum("fin-3"), { stok: 30, usta: -1050, tamirci: -15, fis: "2 geçerli / 0 iptal" });
  await say("fin-3");
  console.log(`     toast: ${await toast(sayfa)}`);
  // tamir teslimini geri al: kartta iki "Teslim Alındı"; tamir ataması ikinci sırada (atama sırası)
  await geriAl(sayfa, "FIN3", -1);
  const s5c = await durum("fin-3");
  k_("S5c tamir teslimini Geri Al → stok −3, tamirci 0, usta değişmedi", s5c, { stok: 27, usta: -1050, tamirci: 0, fis: "1 geçerli / 1 iptal" });
  await say("fin-3");
  console.log(`     toast: ${await toast(sayfa)}`);
  if (s5c.tamirci === 0) {
    await teslim(sayfa, { no: "FIN3", saglam: 3, form: 0 });
    k_("S5d tamiri yeniden teslim → stok +3, tamirci −15 (çift değil)", await durum("fin-3"), { stok: 30, usta: -1050, tamirci: -15, fis: "2 geçerli / 1 iptal" });
    await say("fin-3");
  }

  // ── S6: iki cihaz — bayat cihaz aynı atamayı teslim alır
  console.log("\n■ S6 · FIN4 · iki cihaz: A teslim alır, B (kartı önceden açık, bayat) aynı atamayı teslim almaya çalışır");
  const B = await ekranAc(DB);
  B.sayfa.on("dialog", (d) => d.accept());
  await kartAc(B.sayfa, "FIN4");
  // B'nin değişiklik yoklamasını dondur: bayat cihaz A'nın teslimini görmesin (ekran-ad-bag'deki gibi)
  await B.sayfa.route("**/rest/v1/degisiklik**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await kartAc(sayfa, "FIN4");
  const once6 = await durum("fin-4");
  await teslim(sayfa, { no: "FIN4", saglam: 10 });
  k_("S6a A teslim aldı → stok +10, usta −350", [ (await durum("fin-4")).stok - once6.stok, (await durum("fin-4")).usta - once6.usta ], [10, -350]);
  const bFormVar = await B.sayfa.locator("[data-teslim-al]:visible").count();
  console.log(`     B cihazında teslim formu hâlâ görünüyor: ${bFormVar > 0}`);
  if (bFormVar > 0) await teslim(B.sayfa, { no: "FIN4", saglam: 10 });
  const s6 = await durum("fin-4");
  k_("S6b bayat B'nin teslimi stok / ödemeyi İKİNCİ KEZ yazmadı", [s6.stok - once6.stok, s6.usta - once6.usta, s6.fis], [10, -350, "1 geçerli / 0 iptal"]);
  console.log(`     B toast: ${await toast(B.sayfa)}`);
  console.log(`     B bekleyen yazma: ${JSON.stringify(await B.sayfa.evaluate(() => { try { return Object.keys(JSON.parse(localStorage.getItem("atolye:bekleyen-yazmalar") || "{}")); } catch (x) { return "?"; } }))}`);
  await say("fin-4");
  // S7 / S8: yoklama DONDURULMADAN (gerçek iki cihaz). S7: B, A'nın tesliminden hemen sonra basar (8 sn'lik yoklama aralığının içinde).
  // S8: B, A'dan 12 sn sonra basar (yoklama en az bir kez döndü) — istemci tazelediyse form kalkmış olmalı.
  for (const [ad, no, bekle] of [["S7", "FIN5", 0], ["S8", "FIN6", 12000]]) {
    console.log(`\n■ ${ad} · ${no} · iki cihaz, yoklama AÇIK, B ${bekle / 1000} sn sonra basar`);
    const C = await ekranAc(DB); C.sayfa.on("dialog", (d) => d.accept());
    await kartAc(C.sayfa, no); await kartAc(sayfa, no);
    const once = await durum(`fin-${no.slice(3)}`);
    await teslim(sayfa, { no, saglam: 10 });
    await C.sayfa.waitForTimeout(bekle);
    const formVar = await C.sayfa.locator("[data-teslim-al]:visible").count();
    console.log(`     B cihazında teslim formu ${bekle / 1000} sn sonra: ${formVar > 0 ? "GÖRÜNÜYOR" : "yok (tazelendi)"}`);
    let bSonuc = "form yok";
    if (formVar > 0) {
      try {
        const f = C.sayfa.locator("[data-teslim-al]:visible").first().locator("xpath=ancestor::div[.//table][1]");
        await f.locator("tr", { hasText: "SAĞLAM" }).locator("input").first().fill("10", { timeout: 3000 });
        await C.sayfa.locator("[data-teslim-al]:visible").first().click({ timeout: 3000 });
        bSonuc = "B bastı"; await C.sayfa.waitForTimeout(3500);
      } catch (x) { bSonuc = "B basamadan form kalktı (yoklama tazeledi)"; }
    }
    console.log(`     ${bSonuc}`);
    const son = await durum(`fin-${no.slice(3)}`);
    k_(`${ad} ikinci cihaz stok / ödemeyi İKİNCİ KEZ yazmadı`, [son.stok - once.stok, son.usta - once.usta, son.fis], [10, -350, "1 geçerli / 0 iptal"]);
    console.log(`     B toast: ${await toast(C.sayfa)}`);
    k_(`sayfa hatası yok (${ad} B)`, C.hatalar, []);
    await C.tarayici.close();
  }
  k_("sayfa hatası yok (A)", e.hatalar, []);
  k_("sayfa hatası yok (B)", B.hatalar, []);
  await B.tarayici.close();
  await e.tarayici.close();
  console.log(`\n── ekran-uretim-finans: ${gecen} geçti · ${kalan} kaldı ──`);
  process.exit(kalan ? 1 : 0);
})().catch((x) => { console.error("HATA", x); process.exit(2); });
