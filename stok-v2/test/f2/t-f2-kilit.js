#!/usr/bin/env node
// F2 — EŞZAMANLI KALEM DEĞİŞİKLİĞİ ∥ TESLİM: kilit sırası ve veri bütünlüğü (F2-TESLIMLI-KALEM-TASARIM.md § 6). Yöntemler F1.1 ile
// aynı (t-f11-kilit.js): A yazmadan önce kilit yoklaması, B zorlanmış araya girme, C doğal zorlama × F2_N (varsayılan 100).
// Bütünlük kahini: hiçbir geçerli hareket var olmayan kaleme ya da siparişe bağlı kalmaz (D2a / D2b / D2e = 0); teslimli kalemin
// ürün / renk / bedeni hareketle aynı (D3 / D3b = 0); miktar teslimin altında değil.
const F = require("../f0/f11-ortak.js");
const { ON } = F;
const N = Number(process.env.F2_N || 100);
const R = Number(process.env.F2_ZORLA || 3);
const BOLUM = (process.env.F2_BOLUM || "A,B,C").split(",");
const rast = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
let sayac = 0;
const KIM = `select set_config('request.jwt.claims', '{"email":"ali@atolye.local","role":"authenticated"}', true); set local role authenticated;`;
const kimlikli = (sql) => F.oturum(`begin; ${KIM} ${sql}; commit;`);
const uygula = ([ad, p]) => F.rpcSureli(ad, p);
function kesYuku(s, k, adet, istek, karsilanan) {
  return { istek, fis: { aile: "stok", tur: "Satış", onek: "SF", cariId: "c-yeni", siparisId: s.id, siparisNo: s.siparisNo },
    stok: { satirlar: [{ id: `${istek}-h`, urunId: "u-yeni", renk: "Siyah", miktar: -adet, kaynak: "Satış", siparisId: s.id, siparisNo: s.siparisNo, kalemId: k }] },
    alt: { siparis_kalemleri: { satirlar: [{ id: k, siparis_id: s.id, miktar: 10, karsilanan }] } } };
}
// İki kalemli sipariş; A'ya 3 teslim (birleştirme / silme hedefi B teslimsiz başlar)
function kur({ teslimsiz = false } = {}) {
  const on = `${ON}-${(sayac++).toString(36).padStart(4, "0")}`;
  const A = `${on}A`, B = `${on}B`;
  const s = F.siparisKur(F.sipObj(on, [F.kalemObj(A, 10, 0), F.kalemObj(B, 10, 0)]));
  if (!teslimsiz) { const r = F.rpc("fis_kes", kesYuku(s, A, 3, `${on}i`, 3)); if (!r.ok) throw new Error(`kurulum: ${r.hata}`); }
  return { on, s, A, B };
}
const butunluk = (on) => {
  const d = F.denetim(on); const o = {};
  ["D2a_sahipsiz_hareket_kalem_yok", "D2b_sahipsiz_hareket_siparis_yok", "D2e_gecmis_bag_kalem_yok", "D3_hareket_urunu_kalemden_farkli", "D3b_hareket_renk_beden_kalemden_farkli", "D1a_karsilanan_hareketten_farkli"]
    .forEach((k) => { if (d[k]) o[k] = d[k]; });
  return o;
};
const CIFT = {
  Q1: { ad: "kalem silme (alt_yaz sil B) ∥ fis_kes B'ye teslim", a: (x) => uygula(["alt_yaz", { siparis_kalemleri: { satirlar: [], sil: [x.B] } }]),
    b: (x) => uygula(["fis_kes", kesYuku(x.s, x.B, 2, `${x.on}-q1`, 2)]) },
  Q2: { ad: "birleştirme (alt_yaz A=20, sil B) ∥ fis_kes B'ye teslim", a: (x) => uygula(["alt_yaz", { siparis_kalemleri: { satirlar: [{ id: x.A, siparis_id: x.s.id, miktar: 20 }], sil: [x.B] } }]),
    b: (x) => uygula(["fis_kes", kesYuku(x.s, x.B, 2, `${x.on}-q2`, 2)]) },
  // Q3: sipariş teslimsiz başlar — yalnız yarışan teslim ölçülür (teslimli siparişin silinmesi t-f2 F2.sil-bayat-siparis)
  Q3: { ad: "teslimsiz sipariş silme (REST DELETE, cascade) ∥ fis_kes B'ye teslim", teslimsiz: true, a: (x) => kimlikli(`delete from public.siparisler where id = '${x.s.id}'`),
    b: (x) => uygula(["fis_kes", kesYuku(x.s, x.B, 2, `${x.on}-q3`, 2)]) },
  Q4: { ad: "renk değişimi (alt_yaz B renk Taba) ∥ fis_kes B'ye (Siyah) teslim", a: (x) => uygula(["alt_yaz", { siparis_kalemleri: { satirlar: [{ id: x.B, siparis_id: x.s.id, renk: "Taba" }] } }]),
    b: (x) => uygula(["fis_kes", kesYuku(x.s, x.B, 2, `${x.on}-q4`, 2)]) },
  Q5: { ad: "miktar indirme (alt_yaz B miktar 1) ∥ fis_kes B'ye 2 teslim", a: (x) => uygula(["alt_yaz", { siparis_kalemleri: { satirlar: [{ id: x.B, siparis_id: x.s.id, miktar: 1 }] } }]),
    b: (x) => uygula(["fis_kes", kesYuku(x.s, x.B, 2, `${x.on}-q5`, 2)]),
    ek: (x) => { const m = F.jsonSorgu(`select miktar::float as m, coalesce(karsilanan,0)::float as k from public.siparis_kalemleri where id = '${x.B}'`)[0]; return m && m.m < m.k ? { miktarTeslimAltinda: 1 } : {}; } },
};

(async () => {
  console.log(`F2 kilit / eşzamanlılık · önek ${ON} · N=${N} · kurallar ${F.kurallarAcik() ? "açık" : "KAPALI"}`);
  if (BOLUM.includes("A")) {
    console.log("A) yazmadan önce kilit — alt_yaz birden çok deyim yazıyor (önce upsert, sonra silme)");
    const x = kur();
    const tut = F.oturum(`begin; select 1 from public.siparis_kalemleri where id = '${x.B}' for update; select pg_sleep(1.5); commit;`);
    await F.uyu(200);
    const op = uygula(["alt_yaz", { siparis_kalemleri: { satirlar: [{ id: x.A, siparis_id: x.s.id, miktar: 20 }], sil: [x.B] } }]);
    await F.uyu(500);
    const y = await F.oturum(`set lock_timeout = '200ms'; begin; update public.degisiklik set zaman = zaman where id = 'tekil'; rollback;`);
    const [r] = await Promise.all([op, tut]);
    const bekledi = r.sure_ms >= 1100;
    const sonuc = !bekledi ? "kilitlemiyor" : (y.ok ? "tamam" : "TERS SIRA (yazdıktan sonra bekliyor)");
    F.kontrol("F2K.A-alt_yaz-sil", "alt_yaz (upsert A + sil B) → silinecek kalem B: ilk yazmadan önce kilitlenir", { sonra: { islem: F.kisa(r), bekledi, tekilSerbest: y.ok, sure_ms: r.sure_ms, sonuc }, gercek: sonuc, beklenen: "tamam" });
  }
  if (BOLUM.includes("B")) {
    console.log(`B) zorlanmış araya girme — B kalemi 1 sn tutulur, iki sıra × ${R}`);
    for (const [ad, C] of Object.entries(CIFT)) {
      let kil = 0, bozuk = 0; const ornek = [];
      for (const ilkA of [true, false]) for (let i = 0; i < R; i++) {
        const x = kur({ teslimsiz: !!C.teslimsiz });
        const tut = F.oturum(`begin; select 1 from public.siparis_kalemleri where id = '${x.B}' for update; select pg_sleep(1); commit;`);
        await F.uyu(200);
        const p1 = ilkA ? C.a(x) : C.b(x); await F.uyu(150); const p2 = ilkA ? C.b(x) : C.a(x);
        const [r1, r2] = await Promise.all([p1, p2, tut]);
        kil += [r1, r2].filter(F.kilitlenmeMi).length;
        const b = { ...butunluk(x.on), ...(C.ek ? C.ek(x) : {}) };
        if (Object.keys(b).length) { bozuk += 1; if (ornek.length < 2) ornek.push({ ilk: ilkA ? "a" : "b", a: F.kisa(ilkA ? r1 : r2), b: F.kisa(ilkA ? r2 : r1), b2: b }); }
      }
      F.kontrol(`F2K.B-${ad}-kilit`, `${ad} ${C.ad} · zorlanmış ${2 * R}: kilitlenme 0`, { sonra: { kilitlenme: kil }, gercek: kil, beklenen: 0 });
      F.kontrol(`F2K.B-${ad}-veri`, `${ad} · zorlanmış: sahipsiz / kimlik / miktar bozulması yok`, { sonra: { bozuk, ornek }, gercek: bozuk, beklenen: 0 });
    }
  }
  if (BOLUM.includes("C")) {
    console.log(`C) doğal zorlama × ${N}, 0–40 ms, rastgele sıra`);
    for (const [ad, C] of Object.entries(CIFT)) {
      let kil = 0, bozuk = 0, ikisi = 0; const ornek = []; const bas = Date.now();
      for (let i = 0; i < N; i++) {
        const x = kur({ teslimsiz: !!C.teslimsiz }); const ilkA = Math.random() < 0.5;
        const p1 = ilkA ? C.a(x) : C.b(x); await F.uyu(rast(0, 40)); const p2 = ilkA ? C.b(x) : C.a(x);
        const [r1, r2] = await Promise.all([p1, p2]);
        kil += [r1, r2].filter(F.kilitlenmeMi).length; if (r1.ok && r2.ok) ikisi += 1;
        const b = { ...butunluk(x.on), ...(C.ek ? C.ek(x) : {}) };
        if (Object.keys(b).length) { bozuk += 1; if (ornek.length < 2) ornek.push({ a: F.kisa(ilkA ? r1 : r2), b: F.kisa(ilkA ? r2 : r1), b2: b }); }
      }
      const ozet = { kilitlenme: kil, ikisiTamam: `${ikisi}/${N}`, bozuk, ornek, sure_sn: Math.round((Date.now() - bas) / 1000) };
      F.kontrol(`F2K.C-${ad}-kilit`, `${ad} ${C.ad} × ${N}: kilitlenme 0`, { sonra: ozet, gercek: kil, beklenen: 0 });
      F.kontrol(`F2K.C-${ad}-veri`, `${ad} × ${N}: sahipsiz / kimlik / miktar bozulması yok`, { sonra: { bozuk }, gercek: bozuk, beklenen: 0 });
    }
  }
  F.bitir();
})().catch((e) => { console.error(e); process.exit(2); });
