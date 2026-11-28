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
const bolumler = [{ id: "b1", ad: "Kesimhane", prosesler: ["Kesim"], personel: [{ cariId: "ic" }] }];
const fason = { id: "fs", unvan: "Fason Usta", tip: "Personel", altTip: "Fasoncu" };
const D = (tipler, cari) => yon(iscilikBolumu({ cariTipleri: tipler, bolumler }, [cari], "Kesim", "fs"));
console.log("bag-risk-fasoncu · iscilikBolumu(tanimlar, cariler, proses, kişi) — işçilik cariye mi, bölüm tahakkukuna mı");
// 0) BUGÜNKÜ VERİ (dönüştürülmemiş): tipte `fason` alanı ve kimlik yok → davranış bugünküyle aynı kalmalı
k_("dönüştürülmemiş veri: \"Fasoncu\" tipindeki kişinin işçiliği cariye", D([{ ad: "Fasoncu", temel: "Personel" }], fason), "cariye alacak");
k_("dönüştürülmemiş veri: Tanımlar'da cari tipi listesi hiç yokken de cariye (varsayılan tip)", yon(iscilikBolumu({ bolumler }, [fason], "Kesim", "fs")), "cariye alacak");
k_("dönüştürülmemiş veri: başka özel tipteki (\"Kargo\") bölüm dışı kişi prosesin bölümüne (değişmedi)", D([{ ad: "Kargo", temel: "Personel" }], { ...fason, altTip: "Kargo" }), "bölüm tahakkuku (Kesimhane)");
// 1) TİPİN GÖRÜNEN ADI DEĞİŞİR — uygulamanın yazdığı hâl: tip { ad: yeni, id, fason: o anki geçerli değer }, cari { altTip: yeni, altTipId }
k_("tipin adı \"Fason Atölye\" olunca aynı kişinin işçiliği yine cariye (ödeme yönü değişmez)",
  D([{ ad: "Fason Atölye", temel: "Personel", id: "ctip-1", fason: true }], { ...fason, altTip: "Fason Atölye", altTipId: "ctip-1" }), "cariye alacak");
k_("tipin adı \"FASONCU\" yazılınca işçilik yine cariye", D([{ ad: "FASONCU", temel: "Personel", id: "ctip-1", fason: true }], { ...fason, altTip: "FASONCU", altTipId: "ctip-1" }), "cariye alacak");
// 2) AD DEĞİŞİKLİĞİ YARIM KALIR: Tanımlar yeni adda, cari kaydı yazılamamış
k_("yarım kalan ad değişikliği (cari eski adda, kimliksiz): işçilik yine cariye", D([{ ad: "Fason Atölye", temel: "Personel", id: "ctip-1", fason: true }], fason), "cariye alacak");
k_("yarım kalan ad değişikliği (cari eski adda ama tip kimliği damgalı): kimlikten bulunur, cariye",
  D([{ ad: "Dış Atölye", temel: "Personel", id: "ctip-2", fason: true }], { ...fason, altTip: "Dış Usta", altTipId: "ctip-2" }), "cariye alacak");
// 3) DAVRANIŞ ADA BAĞLI DEĞİL: işaret başka adlı tipte; "Fasoncu" adlı tipte işaret kapalı
k_("fason işareti taşıyan başka adlı tip (\"Dış Usta\") cariye yazılır", D([{ ad: "Dış Usta", temel: "Personel", id: "ctip-2", fason: true }], { ...fason, altTip: "Dış Usta", altTipId: "ctip-2" }), "cariye alacak");
k_("adı \"Fasoncu\" olup işareti KAPALI tip fason sayılmaz (ad davranışı belirlemez)", D([{ ad: "Fasoncu", temel: "Personel", id: "ctip-3", fason: false }], { ...fason, altTipId: "ctip-3" }), "bölüm tahakkuku (Kesimhane)");
k_("adında \"fason\" geçen ama işaretlenmemiş tip TAHMİNLE fason sayılmaz", D([{ ad: "Fason Saya", temel: "Personel" }], { ...fason, altTip: "Fason Saya" }), "bölüm tahakkuku (Kesimhane)");
// 4) bölüm personeli kuralı etkilenmedi
k_("bölüm personeli (tipsiz) bölüme — değişmedi", yon(iscilikBolumu({ bolumler }, [{ id: "ic", tip: "Personel" }], "Kalfa", "ic")), "bölüm tahakkuku (Kesimhane)");
console.log(`SONUÇ: ${gecen} hedefte · ${kalan} AÇIK`);
process.exit(kalan ? 1 : 0);
