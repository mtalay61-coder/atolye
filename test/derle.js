#!/usr/bin/env node
// TEST DERLEYİCİSİ — atolye-erp.jsx -> test/erp.cjs
//
// Neden var: değişikliği göndermeden önce mantığı İZOLE ÇALIŞTIRIP test etmek gerekiyor.
// Denetleyiciler + derleme kontrolü bu oturumlarda bulunan gizli hataların hiçbirini yakalayamazdı.
//
// Nasıl: import satırları sahte modüllere çevrilir (React yerel kurulumdan, lucide/xlsx sahte),
// JSX TypeScript ile derlenir, dosyanın sonuna `module.exports` eklenir. Böylece saf fonksiyonlar
// (fisYaz gibi) tarayıcı açmadan doğrudan Node'dan çağrılabiliyor.
const fs = require("fs");
const path = require("path");
const KOK = path.join(__dirname, "..");
const ts = require("typescript");

const girdi = process.argv[2] || path.join(KOK, "atolye-erp.jsx");
const cikti = process.argv[3] || path.join(__dirname, "erp.cjs");

// Dışa aktarılacak üst düzey adlar. Test neye bakacaksa buraya eklenir.
const DISA_AKTAR = [
  "fiyatBul",   // fiyat çözümleme: cari/renk/beden kırılımı (18 Eylül)
  "useFisDefteriYazma",   // fiş defteri yazma kancası — bayat okuma senaryosu (22 Eylül)
  "karZararHesapla",      // işçilik yönü senaryosu: rapor işçiliği saymaya devam ediyor mu (22 Eylül)
  "useCopKutusu", "yazimiIzle", "tabloYaz",   // yazma hatası senaryosu (22 Eylül, v1.410.0)
  "code128Cubuklar", "code128SatirdanCoz", "kameraKaresiCoz",   // kamera çözücüsü (22 Eylül)
  "fisYaz", "fisGeriAl",
  "stokYuvarla", "paraCevirGenel", "fisNoUret", "fiseAitCariHareketiMi",
  "HAREKET_GECMIS_SINIRI", "hesapBakiyesi", "defterKapsar", "kurSorusu", "kurUygula", "kurTersHesapla", "CEK_ISLEMLERI", "cekIzinliIslemler", "cekSilinebilirMi", "cekIslemUygula", "cekHareketKilidi", "cekEtkinGecmis", "cekIslemGeriAl", "cekSonIslemi", "cekOzeti", "cekIslemHareketiBul", "finansRaporSatirlari", "finansOzet", "cariYaslandirma", "finansUretimDegerleri", "cekDurumGeriAl", "sayiYaziyla", "tutarYaziyla", "cekIadeHareketi", "cekTahsilHesapHareketi", "hesabaHareketEkle", "mrpHesapla", "paraKoduna", "sonAlisFiyatlari", "surumDahaYeniMi", "whatsappNumarasi", "siparisMetinOzeti", "siparisWhatsappBaglantisi", "siparisCiktisiHTML", "raporHesapla", "raporSuz", "raporGrupla", "siparisRaporSatirlari", "SIPARIS_RAPOR_ALANLARI", "uretimAsamaDagilimi", "raporAra", "raporKolonAra", "raporSayiKosulu", "raporMatris", "eksiStokSebebi", "receteGerceklesmeEkle", "receteGerceklesmeDurumu", "receteGerceklesmeAnahtari", "esIkizleriBirlestir", "acilisFarklari", "acilisFisleriUret", "acilisAcigi", "gorselleriAyir", "gorselleriBirlestir", "gorselFarki", "urunGorselleri", "veriBoyutu", "TABLO_SEMA", "veriTutarliligiDenetle",
  "ambalajUrunuMu", "ambalajDegiskenSatirMi", "ambalajRengiUygula", "receteRenkKapsamEksikleri",
  "ambalajRenkSecenekleri", "hareketYonu", "fisNoSiradaki", "fisOnEki", "tumFisNumaralari", "ibandanBanka", "bilinenSubeler", "BANKALAR", "code128Cubuklar", "barkodSvg", "parcaBarkoduUret", "barkodCoz",
  "KOD_HANE", "BARKOD_UZUNLUK", "kodMetni", "kodlariAta", "cariKodlariAta", "cariKodMetni", "urunBarkoduKur", "urunBarkoduCoz", "varyantinBarkodu", "renkKoduBul", "bedenKoduBul", "barkodEksikleri", "imzaHesapla", "imzaBenzerligi", "gorselEslestir", "ozelKodGoc", "urunOzelKodAlanlari", "ozelKodCiftleri", "ozelKodMetni", "eslesenOzelKodlar", "ozelKodAlaniUyar", "siradakiAdim", "dagitilmamis", "enBuyukUretimNo", "uretimAtamaEki", "uretimBolunmusMu", "uretimParcaKodlari", "stokDurumu", "rezervasyonKarsilama", "hammaddeRezervasyonDagit", "uretimKaynakEtiketi", "kaynakEtiketi",
];

let kaynak = fs.readFileSync(girdi, "utf8");

// ---- import satırlarını sahtele ---------------------------------------------------------------
// lucide-react ve xlsx testte hiç çizilmiyor; her ikon adı için boş bir bileşen yeterli.
kaynak = kaynak.replace(/^import React[\s\S]*?from "react";/m,
  'const React = require("react");\n' +
  'const { useState, useEffect, useCallback, useRef } = React;');
// XLSX sahte: dosya yazmıyor, ama `raporExcelAktar` çağrılabilsin (çıktı `window.__sonRaporExcel`e düşüyor).
kaynak = kaynak.replace(/^import \* as XLSX from "xlsx";/m, "const XLSX = { utils: { book_new: () => ({}), aoa_to_sheet: (a) => a, json_to_sheet: (a) => a, book_append_sheet: () => {} }, writeFile: () => {} };");
kaynak = kaynak.replace(/^import \{[\s\S]*?\} from "lucide-react";/m, (blok) => {
  // İçeride yorum satırları var; ayıklanmazsa yorum metni "ikon adı" sanılıp bozuk kod üretiliyor.
  const adlar = blok.match(/\{([\s\S]*?)\}/)[1]
    .replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
    .split(",").map((a) => a.trim().split(" as ").pop().trim())
    .filter((a) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(a));
  // İkonlar testte GÖRÜNÜR bir öğe olarak çiziliyor: yalnızca ikon taşıyan düğmelerin metni boş
  // kalıyor ve Playwright'ta bulunamıyorlardı. `data-ikon` ile her düğme adıyla seçilebilir.
  return adlar.map((a) => `const ${a} = (p) => React.createElement("i", { "data-ikon": "${a}" });`).join(" ");
});
kaynak = kaynak.replace(/export default function AtolyeERP/, "function AtolyeERP");

kaynak += `\nmodule.exports = { AtolyeERP, ${DISA_AKTAR
  .filter((ad) => new RegExp(`(function|const|let)\\s+${ad}\\b`).test(kaynak))
  .join(", ")} };\n`;

const cevrildi = ts.transpileModule(kaynak, {
  compilerOptions: {
    jsx: ts.JsxEmit.React,
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    removeComments: false,
  },
  fileName: "erp.jsx",
});

// Tarayıcı nesneleri Node'da yok; saf fonksiyonları çağırmak için asgari kalıplar yeterli.
const KALIP = `
globalThis.window = globalThis.window || globalThis;
globalThis.document = globalThis.document || { getElementById: () => null, createElement: () => ({ style: {}, appendChild() {}, setAttribute() {} }), head: { appendChild() {} }, body: { appendChild() {} } };
globalThis.localStorage = globalThis.localStorage || { getItem: () => null, setItem() {}, removeItem() {}, key: () => null, length: 0 };
globalThis.fetch = globalThis.fetch || (() => Promise.reject(new Error("ağ kapalı")));
globalThis.window.storage = globalThis.window.storage || {
  get: async () => { throw new Error("bulunamadı"); }, set: async () => ({}), delete: async () => ({}), list: async () => ({ keys: [] }),
};
`;

fs.writeFileSync(cikti, KALIP + cevrildi.outputText, "utf8");
console.log(`Derlendi: ${path.relative(KOK, cikti)}  (${(fs.statSync(cikti).size / 1024).toFixed(0)} KB)`);
