#!/usr/bin/env node
// F0 / D2–D3 — TESLİM GEÇMİŞİ OLAN KALEM: birleştirilmez, silinmez, ürün/renk değişmez, miktarı teslimin altına inmez.
// Yazmalar uygulamanın gerçek köprüsünden (040 supabaseTabloEsitle → alt_yaz). Birleştirme 075 bekleyenKalemleriBirlestir —
// kaynaktan AYNEN (saf fonksiyon, erp.cjs dışa aktarmıyor).
const fs = require("fs");
const path = require("path");
const T = require("./ortak.js");
const { ON } = T;
const k075 = fs.readFileSync(path.join(__dirname, "../../../src/075-fis-ortak.jsx"), "utf8");
const b = k075.indexOf("function bekleyenKalemleriBirlestir"), s = k075.indexOf("\n}\n", b) + 3;
const bekleyenKalemleriBirlestir = new Function(`${k075.slice(b, s)}; return bekleyenKalemleriBirlestir;`)();

(async () => {
  console.log(`F0 / D2–D3 kalem bağı · önek ${ON} · kurallar açık: ${T.kurallarAcik()}`);
  const durum = (...idler) => Object.fromEntries(idler.map((id) => [id.split("-").pop(), { ...T.kalemDb(id), teslim: T.teslimDb(id) }]));

  // D2.birlestirme — A (10) ve B (10) aynı ürün/renk/fiyat, bekleyen; A'ya 3, B'ye 4 teslim; planlama iptali birleştirir (088:158, 076:32)
  {
    const A = `${ON}-m-A`, B = `${ON}-m-B`;
    const s = T.siparisKur(T.sipObj(`${ON}-sm`, [T.kalemObj(A, 10, 0), T.kalemObj(B, 10, 0)]));
    T.rpc("fis_kes", T.teslimYuku({ s, kalemId: A, adet: 3, ekran: 0, istek: `${ON}-im1` }));
    T.rpc("fis_kes", T.teslimYuku({ s, kalemId: B, adet: 4, ekran: 0, istek: `${ON}-im2` }));
    const ekran = { ...s, durum: "Kısmi Teslim", kalemler: [T.kalemObj(A, 10, 3), T.kalemObj(B, 10, 4)] };
    const once = durum(A, B);
    const r = await T.kaydet("siparisler", [ekran], [{ ...ekran, kalemler: bekleyenKalemleriBirlestir(ekran.kalemler) }]);
    const sonra = { ...durum(A, B), yazma: r.hata ? "RED" : r.istekler };
    const toplamK = (sonra.A.var ? sonra.A.karsilanan : 0) + (sonra.B.var ? sonra.B.karsilanan : 0);
    T.kontrol("D2.birlestirme", "teslimli parçalar birleştirilmez: B durur, toplam karşılanan = toplam teslim (7)", { once, sonra,
      gercek: [sonra.B.var, toplamK, sonra.A.teslim + sonra.B.teslim], beklenen: [true, 7, 7] });
  }

  // D2.teslimli-sil — A (20) 5 teslim + C (10) teslimsiz; kullanıcı A'yı siparişten siler
  {
    const A = `${ON}-d-A`, C = `${ON}-d-C`;
    const s = T.siparisKur(T.sipObj(`${ON}-sd`, [T.kalemObj(A, 20, 0), T.kalemObj(C, 10, 0, { renk: "Beyaz" })]));
    T.rpc("fis_kes", T.teslimYuku({ s, kalemId: A, adet: 5, ekran: 0, istek: `${ON}-id1` }));
    const ekran = { ...s, durum: "Kısmi Teslim", kalemler: [T.kalemObj(A, 20, 5), T.kalemObj(C, 10, 0, { renk: "Beyaz" })] };
    const once = durum(A);
    const r = await T.kaydet("siparisler", [ekran], [{ ...ekran, kalemler: [ekran.kalemler[1]] }]);
    const sonra = { ...durum(A), yazma: r.hata ? "RED" : r.istekler };
    T.kontrol("D2.teslimli-sil", "teslimli kalem silinemez (A durur, 5 / 5)", { once, sonra, gercek: [sonra.A.var, sonra.A.karsilanan, sonra.A.teslim], beklenen: [true, 5, 5] });

    // D2.teslimsiz-sil — teslimsiz C silinebilir (BUGÜN YEŞİL: korunacak davranış)
    const ekran2 = { ...ekran, kalemler: sonra.A.var ? [T.kalemObj(A, 20, 5), T.kalemObj(C, 10, 0, { renk: "Beyaz" })] : [T.kalemObj(C, 10, 0, { renk: "Beyaz" })] };
    await T.kaydet("siparisler", [ekran2], [{ ...ekran2, kalemler: ekran2.kalemler.filter((k) => k.id !== C) }]);
    T.kontrol("D2.teslimsiz-sil", "teslimsiz kalem silinebilir", { sonra: { C: T.kalemDb(C).var }, gercek: T.kalemDb(C).var, beklenen: false });
  }

  // D3.renk-degisir — teslimli kalemin rengi değiştirilir (Siyah → Beyaz): hareket Siyah çıktı
  {
    const A = `${ON}-r-A`;
    const s = T.siparisKur(T.sipObj(`${ON}-sr`, [T.kalemObj(A, 20, 0)]));
    T.rpc("fis_kes", T.teslimYuku({ s, kalemId: A, adet: 5, ekran: 0, istek: `${ON}-ir1` }));
    const ekran = { ...s, durum: "Kısmi Teslim", kalemler: [T.kalemObj(A, 20, 5)] };
    const once = durum(A);
    const r = await T.kaydet("siparisler", [ekran], [{ ...ekran, kalemler: [T.kalemObj(A, 20, 5, { renk: "Beyaz" })] }]);
    const sonra = { ...durum(A), yazma: r.hata ? "RED" : r.istekler };
    T.kontrol("D3.renk-degisir", "teslimli kalemin rengi değişmez (Siyah kalır)", { once, sonra, gercek: sonra.A.renk, beklenen: "Siyah" });
  }

  // D3.miktar-teslim-alti — 5 teslimli kalemin miktarı 3'e indirilir (fazla teslim onaysız oluşur)
  {
    const A = `${ON}-q-A`;
    const s = T.siparisKur(T.sipObj(`${ON}-sq`, [T.kalemObj(A, 20, 0)]));
    T.rpc("fis_kes", T.teslimYuku({ s, kalemId: A, adet: 5, ekran: 0, istek: `${ON}-iq1` }));
    const ekran = { ...s, durum: "Kısmi Teslim", kalemler: [T.kalemObj(A, 20, 5)] };
    const once = durum(A);
    const r = await T.kaydet("siparisler", [ekran], [{ ...ekran, kalemler: [T.kalemObj(A, 3, 5)] }]);
    const sonra = { ...durum(A), yazma: r.hata ? "RED" : r.istekler };
    T.kontrol("D3.miktar-teslim-alti", "miktar teslim edilenin altına inemez (20 kalır)", { once, sonra, gercek: sonra.A.miktar, beklenen: 20 });
    // D3.miktar-teslim-ustu — 5 teslimli kalemin miktarı 15'e indirilebilir (BUGÜN YEŞİL: korunacak)
    const ekran2 = { ...ekran, kalemler: [T.kalemObj(A, sonra.A.miktar, 5)] };
    await T.kaydet("siparisler", [ekran2], [{ ...ekran2, kalemler: [T.kalemObj(A, 15, 5)] }]);
    T.kontrol("D3.miktar-teslim-ustu", "miktar teslim edilenin üstünde değişebilir (15)", { sonra: { miktar: T.kalemDb(A).miktar }, gercek: T.kalemDb(A).miktar, beklenen: 15 });
  }

  const d = T.denetim();
  // F2 (2 Kasım, bilerek değişti): yukarıdaki senaryolar artık sahipsiz hareket ÜRETEMEZ (sunucu reddeder) — denetimin sahipsiz
  // hareketi yakalama yeteneği t-denetim DN.sahipsiz-kalem'de (eski veri taklidiyle) ölçülür. Önce: D2a > 0 bekleniyordu.
  T.kontrol("D2.denetim-yakalar", "senaryolardan sonra denetimde sahipsiz hareket yok (D2a 0)", { sonra: { D2a: d.D2a_sahipsiz_hareket_kalem_yok, D4a: d.D4a_onaysiz_fazla_teslim },
    gercek: d.D2a_sahipsiz_hareket_kalem_yok, beklenen: 0 });
  T.bitir();
})().catch((e) => { console.error(e); process.exit(2); });
