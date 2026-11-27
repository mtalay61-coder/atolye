#!/usr/bin/env node
// EKRAN SINAMASI — İKİ CİHAZDAN EŞZAMANLI "İŞİ VER" VE ATAMASIZ ARA PROSES (29 Kasım; kapsamlı inceleme 25, B4 devamı).
// Kullanıcı: "İki cihazdan eşzamanlı 'İşi Ver' işlemini de sına: aynı miktar iki kez atanabiliyor mu, teslim koruması bu kayıtlarla doğru
// çalışıyor mu?" + "Adım adı denetimi kaldırıldığında test yeşil kalmış. Atamasız ara proses yolunu doğrudan sınayarak bu denetimin
// koruduğu durumu göster." Canlıya hizalı, G-25'SİZ taban (EKRAN_DB). İstemci ISTEMCI_DIZIN (1.744.37). İki tarayıcı = iki cihaz.
//   V1 düz İşi Ver (tek adım Dikim, 10 çift): iki cihaz AYNI ANDA usta'ya 10 verir → kaç atama doğdu? (beklenen: toplam 10)
//      ardından bekleyen her atama teslim alınır → mamul / işçilik üretim adedini (10 / 350) aşmamalı
//   V2 aynısı, B bayat (yoklama donuk), A'dan sonra verir
//   V3 atamasız ara proses: adımlar Kesim (teslimli) → Yıkama (ara proses, fason cari, 4 ₺/çift; ATAMASI YOK) → Saya. İki cihaz AYNI ANDA
//      Saya'yı verir → her biri Yıkama için kendi ÜRT fişini keser (yükte teslim alınan atama yok — yalnız adım adı denetimi korur).
//      Beklenen: tek Yıkama fişi (fason −40), tek Saya ataması (10).
const ORTAK = require("../ekran/ortak-ekran.js");
const { toastlar, O } = ORTAK;
// YAYIN_HTML verilirse sınama test derlemesiyle değil YAYINLANMIŞ paketin kendisiyle koşar (yayin-ekran.js; SHA-256 denetimli).
const YAYIN = process.env.YAYIN_HTML ? require("./yayin-ekran.js") : null;
const { ekranAc, girisYap } = YAYIN || ORTAK;
const DB = process.env.EKRAN_DB || "inc_b4v";
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  console.log(`  ${ok ? "✓" : "✗"} [${ad}] ${JSON.stringify(g)}${ok ? "" : ` · beklenen ${JSON.stringify(b)}`}`); return ok; };

(async () => {
  const { kopruKur } = require("../gercek-pg-kopru.js");
  const k0 = kopruKur({ veritabani: DB });
  const q = (s, p) => k0.sorgu(s, p);
  await q(`insert into public.cariler (id, unvan, tip) values ('fin-usta', 'Fin Usta', 'Personel'), ('fin-usta2', 'Fin Usta2', 'Personel'),
           ('fin-fason', 'Fin Fason', 'Personel') on conflict (id) do nothing`);
  await q(`update public.urunler set proses_ucretleri = '{"Dikim": 35, "Kesim": 30, "Saya": 20}'::jsonb where id = 'ekr-bot'`);
  await q(`update public.tanimlar set veri = jsonb_set(veri, '{araProsesler}', '[{"id": "ap-yik", "ad": "Yıkama", "cariId": "fin-fason", "ucret": 4}]'::jsonb) where id = 'tekil'`);
  const uretim = async (no, pi, asama) => {
    const id = `b4-${no.toLowerCase()}`;
    await q(`insert into public.uretim (id, siparis_no, takip_kodu, urun_id, asama, ek, renk, adet, model, beden_miktarlari, proses_ilerleme, olusturuldu)
      values ($1, $2, $2, 'ekr-bot', $3, '{}'::jsonb, 'Siyah', 10, 'Ekran Bot', '[{"beden": "40", "miktar": 10}]'::jsonb, $4::jsonb, '2026-11-29T08:00:00.000Z')
      on conflict (id) do nothing`, [id, no, asama, JSON.stringify(pi)]);
    return id;
  };
  const tek = [{ proses: "Dikim", sira: 1, verildiMi: false, tamamlandiMi: false }];
  const ID = { B4V1: await uretim("B4V1", tek, "Dikim"), B4V2: await uretim("B4V2", tek, "Dikim") };
  ID.B4V3 = await uretim("B4V3", [
    { proses: "Kesim", sira: 1, verildiMi: true, tamamlandiMi: true, personelId: "fin-usta", tamamlanmaTarihi: "2026-11-29T09:00:00.000Z" },
    { proses: "Yıkama", sira: 1.5, tamamlandiMi: false, personelId: null, tamamlanmaTarihi: null, araProsesMi: true, araProsesId: "ap-yik", araProsesCariId: "fin-fason" },
    { proses: "Saya", sira: 2, verildiMi: false, tamamlandiMi: false }], "Saya");
  await q(`insert into public.uretim_atamalari (id, uretim_id, proses, personel_id, beden_miktarlari, miktar, verildi_mi, verilme_tarihi, tamamlandi_mi, tamamlanma_tarihi, sonuc, tamir_mi, tamir_ucret, ek)
    values ('b4-b4v3-a', 'b4-b4v3', 'Kesim', 'fin-usta', '{"40": 10}'::jsonb, 10, true, '2026-11-29T08:10:00.000Z', true, '2026-11-29T09:00:00.000Z',
      '{"saglam": {"40": 10}, "tamir": [], "hurda": []}'::jsonb, false, 0, '{"fisNo": "B4V3-Kesim"}'::jsonb) on conflict (id) do nothing`);

  const stok = async () => Number(((await q(`select coalesce(sum(miktar), 0)::float m from public.stk_stok where urun_id = 'ekr-bot' and renk_ad = 'Siyah' and olcu_ad = '40'`))[0] || {}).m || 0);
  const cari = async (id) => Number((await q(`select coalesce(sum(case when h.yon ilike 'b%' then h.tutar else -h.tutar end), 0)::float t
      from public.car_hareket h left join public.stk_fis f on f.id = h.fis_id where h.cari_id = $1 and not coalesce(h.iptal, false) and (h.fis_id is null or not f.iptal)`, [id]))[0].t);
  const fisler = async (u) => { const r = (await q(`select count(*) filter (where not iptal) g, count(*) filter (where iptal) i from public.stk_fis where uretim_id = $1`, [u]))[0];
    return `${r.g} geçerli / ${r.i} iptal`; };
  const atamalar = async (u) => (await q(`select proses, miktar::float m, tamamlandi_mi t, personel_id p from public.uretim_atamalari where uretim_id = $1 order by id`, [u]))
    .map((a) => `${a.proses}:${a.m}:${a.p || "-"}:${a.t ? "teslim" : "bekliyor"}`).sort();
  const foto = async () => ({ mamul: await stok(), usta: await cari("fin-usta"), usta2: await cari("fin-usta2"), fason: await cari("fin-fason") });
  const fark = (a, b) => Object.fromEntries(Object.keys(b).map((x) => [x, Math.round((b[x] - a[x]) * 100) / 100]).filter(([, v]) => v !== 0));

  const cihaz = async (ad) => { const c = await ekranAc(DB); c.ad = ad; c.sayfa.on("dialog", (d) => d.accept()); return c; };
  const kartAc = async (s, no) => {
    for (let i = 0; i < 20 && !(await s.locator('[data-nav="Üretim"]').count()); i++) await s.waitForTimeout(1000);
    await O.modulAc(s, "Üretim"); await s.waitForTimeout(900); await s.getByText(no, { exact: true }).last().click(); await s.waitForTimeout(1200); };
  const dondur = async (c) => { await c.sayfa.route("**/rest/v1/degisiklik**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" })); };
  const yenile = async (c) => {
    if (YAYIN) return YAYIN.yenile(c);
    for (let deneme = 0; deneme < 3; deneme++) {
      await c.sayfa.reload(); await c.sayfa.waitForTimeout(800);
      await c.sayfa.evaluate(() => { const kok = window.__ReactDOMClient.createRoot(document.getElementById("kok")); kok.render(window.__React.createElement(window.__App)); });
      for (let i = 0; i < 30; i++) {
        if (await (require("../ekran/ortak-ekran.js").uretimMenusuHazir)(c.sayfa)) break;
        if (await c.sayfa.locator('input[type="password"]:visible').count()) { try { await girisYap(c.sayfa); } catch (x) { /* yeniden bakılır */ } }
        await c.sayfa.waitForTimeout(1000);
      }
      if (await (require("../ekran/ortak-ekran.js").uretimMenusuHazir)(c.sayfa)) break;
    }
    await c.sayfa.waitForTimeout(1500);
  };
  // İşi Ver hazırlığı: personel seçilir, düğme döner (basılmaz)
  const verHazirla = async (s, no, personel) => {
    if (!(await s.locator('button:has-text("İşi Ver"):visible').count())) await kartAc(s, no);
    await s.locator("select:visible", { has: s.locator("option", { hasText: "⚠ Personel seçin" }) }).last().selectOption(personel);
    await s.waitForTimeout(300);
    return s.locator('button:has-text("İşi Ver"):visible').last();
  };
  const teslimHepsi = async (c, no) => {
    for (let tur = 0; tur < 4; tur++) {
      await yenile(c); await kartAc(c.sayfa, no);
      if (!(await c.sayfa.locator("[data-teslim-al]:visible").count())) break;
      await c.sayfa.locator("[data-teslim-al]:visible").first().click(); await c.sayfa.waitForTimeout(3500);
      console.log(`     teslim ${tur + 1}: ${(await toastlar(c.sayfa)).replace(/\s+/g, " ").slice(0, 200)}`);
    }
  };
  const toast = async (s) => (await toastlar(s)).replace(/\s+/g, " ").slice(0, 240);

  const A = await cihaz("A"), B = await cihaz("B");
  console.log(`ekran-uretim-b4-ver · ${DB} · G-25 nesnesi ${(await q("select count(*) n from pg_proc where proname like 'g25%'"))[0].n} · B4 kurulu ${(await q("select count(*) n from pg_proc where proname like 'b4\\_%'"))[0].n > 0 ? "EVET" : "HAYIR"}`
    + ` · adım adı denetimi ${(await q("select coalesce((select prosrc like '%if v_cakisan is not null then%' from pg_proc where proname = 'b4_teslim_denetle'), false) v"))[0].v ? "AÇIK" : "YOK / KAPALI"}`);

  for (const [ad, no, bayat] of [["V1", "B4V1", false], ["V2", "B4V2", true]]) {
    const u = ID[no]; console.log(`\n■ ${ad} · ${no} · düz İşi Ver, iki cihaz ${bayat ? "(B bayat, A'dan sonra)" : "AYNI ANDA"}`);
    await yenile(A); await yenile(B); await kartAc(A.sayfa, no); await kartAc(B.sayfa, no); const o = await foto();
    const da = await verHazirla(A.sayfa, no, "fin-usta"), db = await verHazirla(B.sayfa, no, "fin-usta");
    if (bayat) { await dondur(B); await da.click(); await A.sayfa.waitForTimeout(3500); await db.click(); }
    else await Promise.all([da.click(), db.click()]);
    await A.sayfa.waitForTimeout(5000);
    console.log(`     A: ${await toast(A.sayfa)}\n     B: ${await toast(B.sayfa)}`);
    const at = await atamalar(u);
    k_(`${ad} verilen toplam üretim adedini (10) aşmadı`, at, ["Dikim:10:fin-usta:bekliyor"]);
    if (bayat) await B.sayfa.unroute("**/rest/v1/degisiklik**");
    // Gecikmeli gönderim var mı? (bekleyen defter 60 sn'de yeniden dener) — 75 sn sonra atamalar ve iki cihazın bekleyen / inceleme defteri
    await A.sayfa.waitForTimeout(75000);
    const defter = (c) => c.sayfa.evaluate(() => { const o = (k) => { try { return Object.keys(JSON.parse(localStorage.getItem(k) || "{}")); } catch (x) { return ["?"]; } };
      return { bekleyen: o("bekleyen:yazma"), inceleme: o("bekleyen:inceleme") }; });
    console.log(`     75 sn sonra: atamalar ${JSON.stringify(await atamalar(u))} · A ${JSON.stringify(await defter(A))} · B ${JSON.stringify(await defter(B))}`);
    console.log(`     B ekranı: ${(await B.sayfa.evaluate(() => document.body.innerText)).replace(/\s+/g, " ").match(/B4V[12].{0,160}/)?.[0] || "-"}`);
    k_(`${ad} 75 sn sonra da tek atama (gecikmeli ikinci atama yok)`, await atamalar(u), ["Dikim:10:fin-usta:bekliyor"]);
    await teslimHepsi(A, no);
    k_(`${ad} bütün teslimlerden sonra mamul / işçilik üretim adediyle sınırlı (10 / −350)`, fark(o, await foto()), { mamul: 10, usta: -350 });
    console.log(`     ${no}: fiş ${await fisler(u)} · atamalar ${JSON.stringify(await atamalar(u))}`);
  }

  { const no = "B4V3", u = ID[no]; console.log(`\n■ V3 · ${no} · atamasız ara proses (Yıkama) — iki cihaz AYNI ANDA Saya'yı verir`);
    await yenile(A); await yenile(B); await kartAc(A.sayfa, no); await kartAc(B.sayfa, no); const o = await foto();
    const da = await verHazirla(A.sayfa, no, "fin-usta2"), db = await verHazirla(B.sayfa, no, "fin-usta2");
    await Promise.all([da.click(), db.click()]); await A.sayfa.waitForTimeout(5000);
    console.log(`     A: ${await toast(A.sayfa)}\n     B: ${await toast(B.sayfa)}`);
    k_("V3 tek Yıkama fişi: fason −40 (80 değil)", [fark(o, await foto()), await fisler(u)], [{ fason: -40 }, "1 geçerli / 0 iptal"]);
    k_("V3 tek Saya ataması (10)", (await atamalar(u)).filter((x) => x.startsWith("Saya")), ["Saya:10:fin-usta2:bekliyor"]);
    await teslimHepsi(A, no);
    k_("V3 Saya teslimlerinden sonra: mamul +10, usta2 −200, fason −40", fark(o, await foto()), { mamul: 10, usta2: -200, fason: -40 });
    console.log(`     ${no}: fiş ${await fisler(u)} · atamalar ${JSON.stringify(await atamalar(u))}`);
  }
  if (YAYIN) { console.log(`\n■ yayın paketi ${require("path").basename(process.env.YAYIN_HTML)} · sha256 ${process.env.YAYIN_SHA}`);
    k_("canlı / G-25 deneme projesine giden istek ya da WebSocket YOK", YAYIN.disIstekler, []); }
  k_("sayfa hatası yok (A)", A.hatalar, []); k_("sayfa hatası yok (B)", B.hatalar, []);
  await A.tarayici.close(); await B.tarayici.close();
  console.log(`\n── ekran-uretim-b4-ver: ${gecen} geçti · ${kalan} kaldı ──`);
  process.exit(kalan ? 1 : 0);
})().catch((x) => { console.error("HATA", x); process.exit(2); });
