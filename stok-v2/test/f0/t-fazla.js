#!/usr/bin/env node
// F0 / D4 — MİKTARI AŞAN TESLİM. Kullanıcı kararı (1 Kasım): SATIŞTA varsayılan YASAK; istisna yalnız yetkili yönetici onayı +
// gerekçeyle. ALIŞ için kural henüz verilmedi (bugünkü iş kuralları raporda incelendi) — alış satırları GÖZLEM, kırmızı/yeşil yok.
// F3: alış dışındaki çıkışlarda sunucu güncel kalanla denetler. Alış bu kümede hâlâ gözlemdir.
const T = require("./ortak.js");
const { ON } = T;

(async () => {
  console.log(`F0 / D4 fazla teslim · önek ${ON}`);

  // D4.satis-eszamanli — 20'lik kalem: 14 teslim; iki kullanıcı (ikisinin ekranında 14, kalan 6) aynı anda 5'er
  {
    const A = `${ON}-e-A`;
    const s = T.siparisKur(T.sipObj(`${ON}-se`, [T.kalemObj(A, 20, 0)]));
    T.rpc("fis_kes", T.teslimYuku({ s, kalemId: A, adet: 14, ekran: 0, istek: `${ON}-ie0` }));
    const once = { karsilanan: T.kalemDb(A).karsilanan, teslim: T.teslimDb(A), miktar: 20 };
    const y1 = T.teslimYuku({ s, kalemId: A, adet: 5, ekran: 14, istek: `${ON}-ie1` });
    const y2 = T.teslimYuku({ s, kalemId: A, adet: 5, ekran: 14, istek: `${ON}-ie2` });
    const p1 = T.rpcAyri("fis_kes", y1, { bekleSn: 0.8 }); await T.uyu(250);
    const [r1, r2] = await Promise.all([p1, T.rpcAyri("fis_kes", y2)]);
    const sonra = { karsilanan: T.kalemDb(A).karsilanan, teslim: T.teslimDb(A), kabul: [r1.ok, r2.ok], hata: [r1.hata, r2.hata].filter(Boolean) };
    T.kontrol("D4.satis-eszamanli", "eşzamanlı teslimde biri reddedilir: teslim 19, karşılanan 19", { once, sonra,
      gercek: [sonra.kabul.filter(Boolean).length, sonra.teslim, sonra.karsilanan], beklenen: [1, 19, 19] });
  }

  // D4.satis-onaysiz-fazla — tek istek, 20'lik kaleme 25 (255 stok fişi yolu fazlayı işaretleyip gönderir; onay alanı yok)
  {
    const A = `${ON}-t-A`;
    const s = T.siparisKur(T.sipObj(`${ON}-st`, [T.kalemObj(A, 20, 0)]));
    const once = { karsilanan: T.kalemDb(A).karsilanan, teslim: T.teslimDb(A) };
    const r = T.rpc("fis_kes", T.teslimYuku({ s, kalemId: A, adet: 25, ekran: 0, istek: `${ON}-it1` }));
    const sonra = { karsilanan: T.kalemDb(A).karsilanan, teslim: T.teslimDb(A), kabul: r.ok };
    T.kontrol("D4.satis-onaysiz-fazla", "onaysız fazla teslim sunucuda reddedilir (teslim 0)", { once, sonra, gercek: [sonra.kabul, sonra.teslim], beklenen: [false, 0] });
  }

  // D4.satis-tam-sinir — 20'lik kaleme tam 20 (sınır) kabul edilir — BUGÜN YEŞİL (korunacak)
  {
    const A = `${ON}-b-A`;
    const s = T.siparisKur(T.sipObj(`${ON}-sb`, [T.kalemObj(A, 20, 0)]));
    const r = T.rpc("fis_kes", T.teslimYuku({ s, kalemId: A, adet: 20, ekran: 0, istek: `${ON}-ib1` }));
    T.kontrol("D4.satis-tam-sinir", "tam miktar kabul edilir (20 / 20)", { sonra: { kabul: r.ok, teslim: T.teslimDb(A) }, gercek: [r.ok, T.teslimDb(A)], beklenen: [true, 20] });
  }

  // GÖZLEM — ALIŞ: 20'lik alış kalemi, 14 teslim alındı; iki kullanıcı aynı anda 5'er teslim alır
  {
    const A = `${ON}-a-A`;
    const s = T.siparisKur(T.sipObj(`${ON}-sa`, [T.kalemObj(A, 20, 0)], { tip: "Alış" }));
    T.rpc("fis_kes", T.teslimYuku({ s, kalemId: A, adet: 14, ekran: 0, istek: `${ON}-ia0` }));
    const y1 = T.teslimYuku({ s, kalemId: A, adet: 5, ekran: 14, istek: `${ON}-ia1` });
    const y2 = T.teslimYuku({ s, kalemId: A, adet: 5, ekran: 14, istek: `${ON}-ia2` });
    const p1 = T.rpcAyri("fis_kes", y1, { bekleSn: 0.8 }); await T.uyu(250);
    const [r1, r2] = await Promise.all([p1, T.rpcAyri("fis_kes", y2)]);
    T.gozlem("D4.alis-eszamanli", "alış 14 + 5 + 5 (miktar 20)", { kabul: [r1.ok, r2.ok], teslim: T.teslimDb(A, "Alış"), karsilanan: T.kalemDb(A).karsilanan });
    const B = `${ON}-a-B`;
    const s2 = T.siparisKur(T.sipObj(`${ON}-sa2`, [T.kalemObj(B, 20, 0)], { tip: "Alış" }));
    const r3 = T.rpc("fis_kes", T.teslimYuku({ s: s2, kalemId: B, adet: 25, ekran: 0, istek: `${ON}-ia3` }));
    T.gozlem("D4.alis-tek-fazla", "alış tek istekte 25 (miktar 20)", { kabul: r3.ok, teslim: T.teslimDb(B, "Alış"), karsilanan: T.kalemDb(B).karsilanan,
      fazlaIsareti: T.psql(`select bool_or(fazla_gonderim) from public.stk_hareket where kalem_id = '${B}';`) });
  }

  const d = T.denetim();
  T.kontrol("D4.denetim-yakalar", "denetim onaysız fazlayı (D4a) ve işaretli fazlayı (D4b) ayırıyor", { sonra: { D4a: d.D4a_onaysiz_fazla_teslim, D4b: d.D4b_isaretli_fazla_teslim },
    gercek: [d.D4a_onaysiz_fazla_teslim > 0, d.D4b_isaretli_fazla_teslim > 0], beklenen: [true, true] });
  T.bitir();
})().catch((e) => { console.error(e); process.exit(2); });
