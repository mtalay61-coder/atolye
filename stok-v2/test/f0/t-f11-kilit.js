#!/usr/bin/env node
// F1.1 — KİLİT SIRASI (kullanıcı kuralı 4: "Yalnız 3 veya 10 denemede kilitlenme görülmemesi yeterli kabul edilmemeli").
// F1-1-BAG-IZI-TASARIM.md § 4. Üç ayrı ölçüm; biri tek başına yeterli sayılmaz:
//
//  A) YAZMADAN ÖNCE KİLİT (sıra kuralının doğrudan sınaması — rastlantıya bağlı değil): Sistem çapındaki kural "bütün satır
//     kilitleri İLK YAZMADAN önce" (ilk yazma deyiminin sonunda degisiklik.tekil tek satırı alınır; ondan sonra satır kilidi
//     beklemek = tekil'i tutarak beklemek = ters sıra). Bir tutucu oturum, işlemin kilitlemesi gereken satırı (L) 1,5 sn tutar;
//     işlem başlatılır; 0,5 sn sonra bir yoklama oturumu tekil'i 0,2 sn kilit süresiyle ister.
//       - işlem L'yi BEKLEDİ (süre ≥ tutma) ve yoklama tekil'i ALDI → işlem L'yi yazmadan önce istiyor (kural tamam)
//       - yoklama tekil'i alamadı → işlem yazdıktan sonra L'yi bekliyor (ters sıra; L'yi tutan biri tekil'i isterse kilitlenme)
//       - işlem beklemedi → L'yi hiç kilitlemiyor (o satır üzerinden sıralanmıyor)
//  B) ZORLANMIŞ ARAYA GİRME, her kilit noktası, iki başlangıç sırası: P1 (fis_iptal ∥ fis_bag_coz) ve P6 (ana fiş iptali ∥ bağlı
//     makbuz iptali). Tutucu sırayla kalem / fiş / hareket satırını ya da tekil'i 1 sn tutar; iki işlem iki sırayla gönderilir.
//  C) DOĞAL ZORLAMA: P1–P9 × N (F11_N, varsayılan 100), 0–40 ms rastgele aralık. Kilitlenme sayısı ve her denemede veri bütünlüğü:
//     karşılanan = bağımsız beklenen değer (kahin: hangi işlem işlendiyse) ve D1b / D2* / D6* = 0.
// Kabul (F1.1 sonrası): A'da fis_kes / fis_iptal / fis_bag_coz satırları tamam; B ve C'de P1–P7 için 0 kilitlenme ve bütünlük.
// P8 (stk_renk_tasi) ve P9 (eski yol stk_yaz, kurallar kapalı) F1.1 kapsamı DIŞI — puanlanmaz, gözlem olarak raporlanır.
const F = require("./f11-ortak.js");
const { ON, E } = F;
const N = Number(process.env.F11_N || 100);
const R = Number(process.env.F11_ZORLA || 3);
const SECIM = (process.env.F11_CIFT || "P1,P2,P3,P4,P5,P6,P6b,P7,P8,P9").split(",");
const BOLUM = (process.env.F11_BOLUM || "A,B,C").split(",");
const rast = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// ---- kurulum: sipariş + teslim fişi (ham fis_kes yükü — kurulum sınanan şey değil; DB büyüdükçe istemci yükü yavaşlıyor) ----
let sayac = 0;
function kur({ makbuz = false, urun = "u-yeni", renk = "Siyah", kalemsiz = false } = {}) {
  // sabit genişlik: denetim öneki (`like on%`) başka denemenin kimliğini kapsamasın (…-1 ⊂ …-10)
  const on = `${ON}-${(sayac++).toString(36).padStart(4, "0")}`;
  const k = `${on}k`;
  const s = F.siparisKur(F.sipObj(on, [F.kalemObj(k, 20, 0, { urunId: urun, renk })]));
  const r = F.rpc("fis_kes", kesYuku(s, k, 3, `${on}i`, { makbuz, urun, renk, kalemsiz }));
  if (!r.ok) throw new Error(`kurulum fis_kes: ${r.hata}`);
  const hid = F.psql(`select id from public.stk_hareket where fis_id = '${r.sonuc.fisNo}' order by id limit 1;`);
  return { on, s, k, fis: r.sonuc.fisNo, makbuz: r.sonuc.bagliFisNo || null, hid };
}
// kalemsiz: siparişsiz peşin satış (fiş kalem kilidi almaz — P6b: iki fiş yalnız fiş satırlarıyla sıralanır)
function kesYuku(s, k, adet, istek, { makbuz = false, urun = "u-yeni", renk = "Siyah", karsilanan = adet, kalemsiz = false } = {}) {
  const bag = kalemsiz ? {} : { siparisId: s.id, siparisNo: s.siparisNo };
  return { istek, fis: { aile: "stok", tur: "Satış", onek: "SF", cariId: "c-yeni", ...bag },
    stok: { satirlar: [{ id: `${istek}-h`, urunId: urun, renk, miktar: -adet, kaynak: "Satış", ...bag, ...(kalemsiz ? {} : { kalemId: k }) }] },
    ...(makbuz ? { bagli: { fis: { aile: "para", tur: "Tahsilat", onek: "TH", cariId: "c-yeni" },
      cari: { satirlar: [{ id: `${istek}-c`, cari_id: "c-yeni", yon: "Tahsilat", tutar: 10 }] } } } : {}),
    ...(kalemsiz ? {} : { alt: { siparis_kalemleri: { satirlar: [{ id: k, siparis_id: s.id, miktar: 20, karsilanan }], artis: [{ id: k, miktar: adet }] } } }) };
}
const iptalYuku = (x, adet = 3) => ({ no: x.fis, sebep: "F1.1 kilit", alt: { siparis_kalemleri: { satirlar: [{ id: x.k, siparis_id: x.s.id, miktar: 20, karsilanan: 0 }],
  artis: [{ id: x.k, miktar: -adet }] } } });
const bagCoz = (x) => ["fis_bag_coz", { siparisId: x.s.id, siparisNo: x.s.siparisNo }];
const karsilanan = (k) => Number(F.psql(`select coalesce(karsilanan, 0) from public.siparis_kalemleri where id = '${k}';`));
const fisIptalMi = (no) => F.psql(`select iptal from public.stk_fis where id = '${no}';`) === "t";
const KIM = `select set_config('request.jwt.claims', '{"email":"ali@atolye.local","role":"authenticated"}', true); set local role authenticated;`;
const kimlikli = (sql) => F.oturum(`begin; ${KIM} ${sql}; commit;`);
const uygula = ([ad, p]) => F.rpcSureli(ad, p);

// P8 için ayrı ürün (renk taşıma bütün ürünün varyantını değiştirir; u-yeni'yi kirletmesin)
const U8 = `${ON}-u8`;
let u8Renk = ["F11A", "F11B"];

// ---- işlem çiftleri: { hazirla() → x, a(x), b(x), kahin(x, ra, rb) → beklenen karşılanan, ek(x) → ek bütünlük } ----
const CIFT = {
  P1: { ad: "fis_iptal ∥ fis_bag_coz (aynı sipariş)", hazirla: () => kur(),
    a: (x) => uygula(["fis_iptal", iptalYuku(x)]), b: (x) => uygula(bagCoz(x)), kahin: (x, ra) => (ra.ok ? 0 : 3) },
  P2: { ad: "fis_bag_coz ∥ fis_bag_coz (iki cihaz aynı siparişi iptal eder)", hazirla: () => kur(),
    a: (x) => uygula(bagCoz(x)), b: (x) => uygula(bagCoz(x)), kahin: () => 3 },
  P3: { ad: "fis_bag_coz ∥ fis_kes (aynı kaleme yeni teslim)", hazirla: () => kur(),
    a: (x) => uygula(bagCoz(x)), b: (x) => uygula(["fis_kes", kesYuku(x.s, x.k, 2, `${x.on}-p3`, { karsilanan: 5 })]), kahin: (x, ra, rb) => 3 + (rb.ok ? 2 : 0) },
  P4: { ad: "fis_bag_coz ∥ alt_yaz (aynı siparişin düzenlemesi)", hazirla: () => kur(),
    a: (x) => uygula(bagCoz(x)), b: (x) => uygula(["alt_yaz", { siparis_kalemleri: { satirlar: [{ id: x.k, siparis_id: x.s.id, miktar: 20, karsilanan: 3, fiyat: 150 }] } }]),
    kahin: () => 3, ek: (x, ra, rb) => (rb.ok && F.psql(`select fiyat from public.siparis_kalemleri where id = '${x.k}';`) !== "150" ? { fiyatYazilmadi: 1 } : {}) },
  P5: { ad: "fis_iptal ∥ fis_kes (aynı kalem)", hazirla: () => kur(),
    a: (x) => uygula(["fis_iptal", iptalYuku(x)]), b: (x) => uygula(["fis_kes", kesYuku(x.s, x.k, 2, `${x.on}-p5`, { karsilanan: 5 })]),
    kahin: (x, ra, rb) => (ra.ok ? 0 : 3) + (rb.ok ? 2 : 0) },
  P6: { ad: "fis_iptal (ana fiş) ∥ fis_iptal (bağlı makbuz)", hazirla: () => kur({ makbuz: true }),
    a: (x) => uygula(["fis_iptal", iptalYuku(x)]), b: (x) => uygula(["fis_iptal", { no: x.makbuz, sebep: "F1.1 kilit makbuz" }]),
    kahin: (x, ra, rb) => (ra.ok || rb.ok ? 0 : 3),
    ek: (x, ra, rb) => ((ra.ok || rb.ok) && !(fisIptalMi(x.fis) && fisIptalMi(x.makbuz)) ? { ikiFisBirlikteIptalDegil: 1 } : {}) },
  P6b: { ad: "fis_iptal (ana fiş) ∥ fis_iptal (bağlı makbuz) — siparişsiz peşin satış (kalem kilidi yok)", hazirla: () => kur({ makbuz: true, kalemsiz: true }),
    a: (x) => uygula(["fis_iptal", { no: x.fis, sebep: "F1.1 kilit" }]), b: (x) => uygula(["fis_iptal", { no: x.makbuz, sebep: "F1.1 kilit makbuz" }]),
    kahin: () => null,
    ek: (x, ra, rb) => ((ra.ok || rb.ok) && !(fisIptalMi(x.fis) && fisIptalMi(x.makbuz)) ? { ikiFisBirlikteIptalDegil: 1 } : {}) },
  P7: { ad: "fis_bag_coz ∥ REST sipariş başlığı (durum İptal)", hazirla: () => kur(),
    a: (x) => uygula(bagCoz(x)), b: (x) => kimlikli(`update public.siparisler set durum = 'İptal' where id = '${x.s.id}'`), kahin: () => 3 },
  P8: { ad: "fis_iptal ∥ stk_renk_tasi (aynı varyantın hareketleri)", acikRisk: true,
    hazirla: () => { const x = kur({ urun: U8, renk: u8Renk[0] }); x.renk = u8Renk; u8Renk = [u8Renk[1], u8Renk[0]];
      // hedef varyant var olsun (birleştirme yolu: hareketler taşınır → fis_iptal'in güncellediği satırlarla çakışır)
      F.rpc("fis_kes", kesYuku(x.s, x.k, 1, `${x.on}-p8h`, { urun: U8, renk: x.renk[1], karsilanan: 4 })); return x; },
    a: (x) => uygula(["fis_iptal", iptalYuku(x)]), b: (x) => uygula(["stk_renk_tasi", { eslesmeler: [{ urunId: U8, eski: x.renk[0], yeni: x.renk[1] }] }]),
    kahin: (x, ra) => (ra.ok ? 1 : 4) },
  P9: { ad: "fis_iptal ∥ eski yol stk_yaz satır iptali (kurallar KAPALI)", acikRisk: true, kurallarKapali: true, hazirla: () => kur(),
    a: (x) => uygula(["fis_iptal", iptalYuku(x)]), b: (x) => uygula(["stk_yaz", { iptal: [x.hid] }]), kahin: (x, ra) => (ra.ok ? 0 : null) },
};

(async () => {
  console.log(`F1.1 kilit sırası · önek ${ON} · N=${N} · zorlanmış tekrar ${R} · kurallar ${F.kurallarAcik() ? "açık" : "KAPALI"} · iz sütunları ${F.izSutunlari()}/3`);
  F.psql(`insert into public.urunler (id, ad, kategori) values ('${U8}', 'F1.1 renk sınaması', 'Mamul') on conflict do nothing;`);

  // ================= A) YAZMADAN ÖNCE KİLİT =================
  if (BOLUM.includes("A")) {
    console.log("A) yazmadan önce kilit — tutucu L'yi 1,5 sn tutar; işlem bekliyorsa, tekil serbest mi?");
    const TUT = 1500;
    const yokla = async (tutucuSql, islem) => {
      const tut = F.oturum(`begin; ${tutucuSql}; select pg_sleep(${TUT / 1000}); commit;`);
      await F.uyu(200);
      const op = islem();
      await F.uyu(500);
      const y = await F.oturum(`set lock_timeout = '200ms'; begin; update public.degisiklik set zaman = zaman where id = 'tekil'; rollback;`);
      const [r] = await Promise.all([op, tut]);
      const bekledi = r.sure_ms >= TUT - 400;
      return { islem: F.kisa(r), bekledi, tekilSerbest: y.ok, sure_ms: r.sure_ms, sonuc: !bekledi ? "kilitlemiyor" : (y.ok ? "tamam" : "TERS SIRA (yazdıktan sonra bekliyor)") };
    };
    const noktalar = [
      { kimlik: "F11.A-fis_kes-kalem", ad: "fis_kes → kalem satırı", tutucu: (x) => `select 1 from public.siparis_kalemleri where id = '${x.k}' for update`,
        islem: (x) => uygula(["fis_kes", kesYuku(x.s, x.k, 1, `${x.on}-ak`, { karsilanan: 4 })]) },
      { kimlik: "F11.A-fis_iptal-kalem", ad: "fis_iptal → kalem satırı", tutucu: (x) => `select 1 from public.siparis_kalemleri where id = '${x.k}' for update`,
        islem: (x) => uygula(["fis_iptal", iptalYuku(x)]) },
      { kimlik: "F11.A-fis_iptal-fis", ad: "fis_iptal → iptal edilen fiş satırı", tutucu: (x) => `select 1 from public.stk_fis where id = '${x.fis}' for update`,
        islem: (x) => uygula(["fis_iptal", iptalYuku(x)]) },
      { kimlik: "F11.A-fis_iptal-makbuz", ad: "fis_iptal → BAĞLI makbuz satırı", makbuz: true, tutucu: (x) => `select 1 from public.stk_fis where id = '${x.makbuz}' for update`,
        islem: (x) => uygula(["fis_iptal", iptalYuku(x)]) },
      { kimlik: "F11.A-fis_iptal-makbuz-kalemsiz", ad: "fis_iptal → BAĞLI makbuz satırı (siparişsiz peşin satış)", makbuz: true, kalemsiz: true,
        tutucu: (x) => `select 1 from public.stk_fis where id = '${x.makbuz}' for update`, islem: (x) => uygula(["fis_iptal", { no: x.fis, sebep: "F1.1 kilit" }]) },
      { kimlik: "F11.A-fis_iptal-gecmis-kalem", ad: "fis_iptal → sipariş iptalinden sonra GEÇMİŞ kalem satırı", sonraBagCoz: true,
        // uygulamanın gerçek yükü: sipariş iptalinden sonra yerel veride bağ çözülmüş, fisGeriAl kalem düşümü BOŞ → alt YOK
        tutucu: (x) => `select 1 from public.siparis_kalemleri where id = '${x.k}' for update`, islem: (x) => uygula(["fis_iptal", { no: x.fis, sebep: "F1.1 kilit" }]) },
      { kimlik: "F11.A-fis_bag_coz-kalem", ad: "fis_bag_coz → siparişin kalem satırı", tutucu: (x) => `select 1 from public.siparis_kalemleri where id = '${x.k}' for update`,
        islem: (x) => uygula(bagCoz(x)) },
      { kimlik: "F11.A-fis_bag_coz-fis", ad: "fis_bag_coz → siparişe bağlı fiş satırı", tutucu: (x) => `select 1 from public.stk_fis where id = '${x.fis}' for update`,
        islem: (x) => uygula(bagCoz(x)) },
      { kimlik: "F11.A-alt_yaz-kalem", ad: "alt_yaz (tek deyim) → kalem satırı", tutucu: (x) => `select 1 from public.siparis_kalemleri where id = '${x.k}' for update`,
        islem: (x) => uygula(["alt_yaz", { siparis_kalemleri: { satirlar: [{ id: x.k, siparis_id: x.s.id, miktar: 20, karsilanan: 3, fiyat: 120 }] } }]) },
      { kimlik: "F11.A-stk_renk_tasi-hareket", ad: "stk_renk_tasi → hareket satırı (P8, açık risk)", acikRisk: true, u8: true,
        tutucu: (x) => `select 1 from public.stk_hareket where id = '${x.hid}' for update`,
        islem: (x) => uygula(["stk_renk_tasi", { eslesmeler: [{ urunId: U8, eski: x.renk[0], yeni: x.renk[1] }] }]) },
      { kimlik: "F11.A-stk_yaz-fis", ad: "stk_yaz satır iptali (eski yol, kurallar kapalı) → fiş satırı (P9, açık risk)", acikRisk: true, kurallarKapali: true,
        tutucu: (x) => `select 1 from public.stk_fis where id = '${x.fis}' for update`, islem: (x) => uygula(["stk_yaz", { iptal: [x.hid] }]) },
    ];
    for (const n of noktalar) {
      const kural0 = F.kurallarAcik();
      if (n.kurallarKapali) F.kurallariAyarla(false);
      let x;
      if (n.u8) { x = CIFT.P8.hazirla(); } else { x = kur({ makbuz: !!n.makbuz, kalemsiz: !!n.kalemsiz }); }
      if (n.sonraBagCoz) F.rpc(...bagCoz(x));
      const r = await yokla(n.tutucu(x), () => n.islem(x));
      if (n.kurallarKapali) F.kurallariAyarla(kural0);
      if (n.acikRisk) F.gozlem(n.kimlik, n.ad, r);
      else F.kontrol(n.kimlik, n.ad, { sonra: r, gercek: r.sonuc, beklenen: "tamam" });
    }
  }

  // ================= B) ZORLANMIŞ ARAYA GİRME =================
  if (BOLUM.includes("B")) {
    console.log(`B) zorlanmış araya girme — her kilit noktası × iki başlangıç sırası × ${R}`);
    const noktalar = {
      kalem: (x) => `select 1 from public.siparis_kalemleri where id = '${x.k}' for update`,
      fis: (x) => `select 1 from public.stk_fis where id = '${x.fis}' for update`,
      hareket: (x) => `select 1 from public.stk_hareket where id = '${x.hid}' for update`,
      tekil: () => "update public.degisiklik set zaman = zaman where id = 'tekil'",
      makbuz: (x) => `select 1 from public.stk_fis where id = '${x.makbuz}' for update`,
    };
    for (const cift of ["P1", "P6", "P6b"]) {
      const C = CIFT[cift];
      for (const [nokta, tutSql] of Object.entries(noktalar)) {
        if (nokta === "makbuz" && cift === "P1") continue;
        let kil = 0, bozuk = 0; const ornek = [];
        for (const ilkA of [true, false]) {
          for (let i = 0; i < R; i++) {
            const x = C.hazirla();
            const tut = F.oturum(`begin; ${tutSql(x)}; select pg_sleep(1); commit;`);
            await F.uyu(200);
            const p1 = ilkA ? C.a(x) : C.b(x);
            await F.uyu(150);
            const p2 = ilkA ? C.b(x) : C.a(x);
            const [r1, r2] = await Promise.all([p1, p2, tut]);
            const [ra, rb] = ilkA ? [r1, r2] : [r2, r1];
            kil += [ra, rb].filter(F.kilitlenmeMi).length;
            const bek = C.kahin(x, ra, rb), gerc = karsilanan(x.k);
            const but = { ...F.butunlukDenetimi(x.on), ...(C.ek ? C.ek(x, ra, rb) : {}) };
            if ((bek !== null && gerc !== bek) || Object.keys(but).length) { bozuk += 1; if (ornek.length < 2) ornek.push({ ilk: ilkA ? "a" : "b", a: F.kisa(ra), b: F.kisa(rb), karsilanan: gerc, beklenen: bek, but }); }
          }
        }
        F.kontrol(`F11.B-${cift}-${nokta}-kilit`, `${cift} ${C.ad} · tutulan: ${nokta} · ${2 * R} deneme: kilitlenme 0`, { sonra: { kilitlenme: kil },
          gercek: kil, beklenen: 0 });
        F.kontrol(`F11.B-${cift}-${nokta}-veri`, `${cift} · tutulan: ${nokta}: karşılanan = beklenen, D1b / D2 / D6 = 0`, { sonra: { bozuk, ornek },
          gercek: bozuk, beklenen: 0 });
      }
    }
  }

  // ================= C) DOĞAL ZORLAMA =================
  if (BOLUM.includes("C")) {
    console.log(`C) doğal zorlama — her çift × ${N}, 0–40 ms rastgele aralık, rastgele başlangıç sırası`);
    for (const cift of SECIM) {
      const C = CIFT[cift];
      const kural0 = F.kurallarAcik();
      if (C.kurallarKapali) F.kurallariAyarla(false);
      let kil = 0, ikisi = 0, bozuk = 0; const hatalar = {}; const ornek = [];
      const bas = Date.now();
      for (let i = 0; i < N; i++) {
        const x = C.hazirla();
        const ilkA = Math.random() < 0.5;
        const p1 = ilkA ? C.a(x) : C.b(x);
        await F.uyu(rast(0, 40));
        const p2 = ilkA ? C.b(x) : C.a(x);
        const [r1, r2] = await Promise.all([p1, p2]);
        const [ra, rb] = ilkA ? [r1, r2] : [r2, r1];
        const k = [ra, rb].filter(F.kilitlenmeMi).length;
        kil += k; if (ra.ok && rb.ok) ikisi += 1;
        [ra, rb].forEach((r) => { if (!r.ok && !F.kilitlenmeMi(r)) { const h = (r.hata || "?").slice(0, 70); hatalar[h] = (hatalar[h] || 0) + 1; } });
        const bek = C.kahin(x, ra, rb), gerc = karsilanan(x.k);
        const but = { ...F.butunlukDenetimi(x.on), ...(C.ek ? C.ek(x, ra, rb) : {}) };
        if ((bek !== null && gerc !== bek) || Object.keys(but).length) { bozuk += 1; if (ornek.length < 2) ornek.push({ a: F.kisa(ra), b: F.kisa(rb), karsilanan: gerc, beklenen: bek, but }); }
      }
      if (C.kurallarKapali) F.kurallariAyarla(kural0);
      const ozet = { kilitlenme: kil, oran: `${Math.round((100 * kil) / N)}%`, ikisiTamam: `${ikisi}/${N}`, bozuk, digerHata: hatalar, ornek, sure_sn: Math.round((Date.now() - bas) / 1000) };
      if (C.acikRisk) F.gozlem(`F11.C-${cift}`, `${cift} ${C.ad} × ${N}`, ozet);
      else {
        F.kontrol(`F11.C-${cift}-kilit`, `${cift} ${C.ad} × ${N}: kilitlenme 0`, { sonra: ozet, gercek: kil, beklenen: 0 });
        F.kontrol(`F11.C-${cift}-veri`, `${cift} × ${N}: her denemede karşılanan = beklenen, D1b / D2 / D6 = 0`, { sonra: { bozuk }, gercek: bozuk, beklenen: 0 });
      }
    }
  }
  if (!F.kurallarAcik()) F.kurallariAyarla(true);
  F.bitir();
})().catch((e) => { try { F.kurallariAyarla(true); } catch (x) { /* */ } console.error(e); process.exit(2); });
