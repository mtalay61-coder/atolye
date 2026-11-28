#!/usr/bin/env node
// BAĞ RİSKİ — "FASONCU" ADI ÖDEME YÖNÜNÜ BELİRLİYOR (28 Kasım). Kalıcı sınama; istemcinin kuralını (015 `iscilikBolumu`) doğrudan ölçer.
// Kural bugün `cari.altTip === "Fasoncu"` der: fasoncunun işçiliği CARİYE alacak yazılır (bölüm tahakkukuna değil). "Fasoncu" kullanıcının
// Tanımlar › Firma › Cari Tipleri'nde AÇTIĞI ve ADINI DEĞİŞTİREBİLDİĞİ bir tiptir (200 `CariTipleriTanimi.degistir`: ad değişince o
// tipteki carilerin `altTip` alanı da yeni ada taşınır). Hedef: görünen ad değişince işçilik muhasebesi DEĞİŞMEZ.
// Bugün KALAN satırlar açık risktir; Paket F kapatınca geçer. Kullanım: (cd test && node derle.js) && node test/inceleme/bag-risk-fasoncu.js
const path = require("path");
const { iscilikBolumu } = require(path.join(__dirname, "..", "erp.cjs"));
let gecen = 0, kalan = 0;
const k_ = (ad, g, b) => { const ok = JSON.stringify(g) === JSON.stringify(b); if (ok) gecen += 1; else kalan += 1;
  console.log(`  ${ok ? "✓" : "✗ AÇIK"} ${ad}${ok ? "" : ` — görülen ${JSON.stringify(g)} · hedef ${JSON.stringify(b)}`}`); };
const yon = (b) => (b ? `bölüm tahakkuku (${b.ad})` : "cariye alacak");
const tanimlar = { cariTipleri: [{ ad: "Fasoncu", temel: "Personel" }], bolumler: [{ id: "b1", ad: "Kesimhane", prosesler: ["Kesim"], personel: [{ cariId: "ic" }] }] };
const fason = { id: "fs", unvan: "Fason Usta", tip: "Personel", altTip: "Fasoncu" };
console.log("bag-risk-fasoncu · iscilikBolumu(tanimlar, cariler, proses, kişi)");
k_("başlangıç: fasoncunun bölüme bağlı prosesteki işçiliği cariye", yon(iscilikBolumu(tanimlar, [fason], "Kesim", "fs")), "cariye alacak");
// 1) tipin GÖRÜNEN ADI değişir (uygulama carilerin altTip'ini de yeni ada taşır)
const t2 = { ...tanimlar, cariTipleri: [{ ad: "Fason Atölye", temel: "Personel" }] };
k_("tipin adı \"Fason Atölye\" olunca aynı kişinin işçiliği yine cariye (ödeme yönü değişmez)",
  yon(iscilikBolumu(t2, [{ ...fason, altTip: "Fason Atölye" }], "Kesim", "fs")), "cariye alacak");
// 2) yalnız yazım farkı
k_("tipin adı \"FASONCU\" yazılınca işçilik yine cariye", yon(iscilikBolumu({ ...tanimlar, cariTipleri: [{ ad: "FASONCU", temel: "Personel" }] }, [{ ...fason, altTip: "FASONCU" }], "Kesim", "fs")), "cariye alacak");
// 3) ters yön: sıradan bir tipe "Fasoncu" adı verilirse o tipteki BÖLÜM dışı kişi fasoncu sayılmamalı (davranış ada bağlı olmamalı)
const t3 = { ...tanimlar, cariTipleri: [{ ad: "Fasoncu", temel: "Personel", fason: false }, { ad: "Dış Usta", temel: "Personel", fason: true }] };
k_("fason işareti taşıyan başka adlı tip (\"Dış Usta\") cariye yazılır", yon(iscilikBolumu(t3, [{ ...fason, altTip: "Dış Usta" }], "Kesim", "fs")), "cariye alacak");
console.log(`SONUÇ: ${gecen} hedefte · ${kalan} AÇIK`);
process.exit(0);
