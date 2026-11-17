// BİRİM TESTİ — SUNUCUNUN AÇTIĞI CARİ BAŞKA CİHAZLARDA KORUNUR MU (güvenlik 22, 16 Kasım).
// Site kayıt onayı (site_kayit_onayla_yeni_cari) cariyi SUNUCUDA açar; o cariyi henüz görmemiş ya da BEKLEYEN cari yazması olan
// başka bir cihaz onu silmemeli / ezmemeli. Uygulamanın GERÇEK işlevleriyle (erp.cjs) ölçülür:
//   1) Bayat cihaz (fark tabanı S'siz) başka bir cariyi düzenler → fark S'yi silinen saymaz.
//   2) Bekleyen yazmalı açılış (defterde "yaz") → ekran = yerel + buluttaki S; taban buluttan; ilk yazma S'yi silmez / eklemez.
//   3) Aynı, defterde ayrıca bu cihazın bilerek sildiği B ("sil") → yalnız B silinir, S kalır.
//   4) Eski defter biçimi (ayrıntısız bekleyen) → yerel + buluttaki yeniler (S dahil).
//   5) Değişiklik sayacı: bekleyen cari yazması varken cariler tazelenmez ama "görüldü" de sayılmaz; bekleyen bitince tazelenir.
//   6) Tazelemeden sonra S'nin düzenlenmesi (kod ataması) GÜNCELLEME sayılır, ekleme değil (sürüm kilitli PATCH yolu).
const depo = {};
globalThis.window = { localStorage: { getItem: (k) => (k in depo ? depo[k] : null), setItem: (k, v) => { depo[k] = String(v); }, removeItem: (k) => { delete depo[k]; } } };
const { tabloFarki, tabloBaslangicTam, tabloBaslangicBekleyen, yereliBulutlaBirlestir, bekleyenKayitEkle, degisiklikFarki, degisiklikGoruldu } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const kimlik = (l) => (l || []).map((k) => (k && k.id !== undefined ? k.id : k));
const A = { id: "cari-a", unvan: "Müşteri A", tip: "Müşteri", hareketler: [] };
const B = { id: "cari-b", unvan: "Müşteri B", tip: "Müşteri", hareketler: [] };
const S = { id: "cari-s1-ab12", unvan: "Siteden Gelen Ltd", tip: "Müşteri", telefon: "05321234567", hareketler: [], siteOdemeSor: true, notlar: "Web sitesinden kayıt" };
const A2 = { ...A, telefon: "02120000000" };
const sifirla = () => { Object.keys(depo).forEach((k) => delete depo[k]); };

// 1) Bayat cihaz
sifirla();
tabloBaslangicTam("cariler", [A, B]);
let f = tabloFarki("cariler", [A2, B]);
bekle("1) bayat cihaz A'yı düzenler: yalnız A güncellenir, silinen yok", [kimlik(f.guncellenen), f.silinen, kimlik(f.eklenen)], [["cari-a"], [], []]);

// 2) Bekleyen yazmalı açılış (defter ayrıntılı: A "yaz")
sifirla();
tabloBaslangicTam("cariler", [A, B]);
f = tabloFarki("cariler", [A2, B]);                       // yazma düştü varsayılır → deftere
bekleyenKayitEkle("cariler", f, []);
const bulut = [A, B, S];
let ekran = yereliBulutlaBirlestir([A2, B], bulut, "cariler");
bekle("2) açılış ekranı: A yerelden (düzenlenmiş), B ve S buluttan", ekran.map((k) => `${k.id}:${k.telefon || "-"}`).sort(), ["cari-a:02120000000", "cari-b:-", "cari-s1-ab12:05321234567"]);
tabloBaslangicBekleyen("cariler", bulut, ekran);
f = tabloFarki("cariler", ekran);
// Defterdeki "yaz" kaydı tabandan bilerek düşer (yeniden gönderilsin, 025 bekleyenKayitlariTabanaUygula) → A "eklenen" görünür;
// sunucuda kayıt sürümü bilindiği için ekleme / güncelleme ayrımını sürüm haritası yapar (040). Ölçülen S'dir.
bekle("2) ilk yazma: yalnız A gider; S ne silinir ne yeniden gönderilir", [[...kimlik(f.eklenen), ...kimlik(f.guncellenen)], f.silinen], [["cari-a"], []]);

// 3) Defterde ayrıca bu cihazın sildiği B
sifirla();
tabloBaslangicTam("cariler", [A, B]);
f = tabloFarki("cariler", [A2]);                          // A düzenlendi, B silindi; yazma düştü
bekleyenKayitEkle("cariler", f, []);
ekran = yereliBulutlaBirlestir([A2], bulut, "cariler");
bekle("3) açılış ekranı: B (bu cihazda silinen) yok, S var", kimlik(ekran).sort(), ["cari-a", "cari-s1-ab12"]);
tabloBaslangicBekleyen("cariler", bulut, ekran);
f = tabloFarki("cariler", ekran);
bekle("3) ilk yazma: A gider, yalnız B silinir; S'ye dokunulmaz", [[...kimlik(f.eklenen), ...kimlik(f.guncellenen)], f.silinen], [["cari-a"], ["cari-b"]]);

// 4) Eski defter biçimi: bekleyen var ama ayrıntı yok
sifirla();
ekran = yereliBulutlaBirlestir([A2, B], bulut, "cariler");
bekle("4) ayrıntısız bekleyen: yerel + buluttaki yeniler (S dahil)", kimlik(ekran), ["cari-a", "cari-b", "cari-s1-ab12"]);

// 5) Değişiklik sayacı
const once = { cariler: 4 };
const sonra = { cariler: 5 };
const f5a = degisiklikFarki(once, sonra, { sonYazma: () => 0, simdi: 100000, bekleyenAnahtarlar: ["cari:data"] });
bekle("5) bekleyen cari yazması varken tazelenmez, ertelenir", [f5a.alanlar, f5a.ertelenen], [[], ["cariler"]]);
const gorulen = degisiklikGoruldu(once, sonra, f5a.ertelenen);
bekle("5) ertelenen 'görüldü' sayılmaz", gorulen, { cariler: 4 });
const f5b = degisiklikFarki(gorulen, sonra, { sonYazma: () => 0, simdi: 200000, bekleyenAnahtarlar: [] });
bekle("5) bekleyen bitince tazelenir", f5b.alanlar, ["cariler"]);

// 6) Tazelemeden sonra S'nin düzenlenmesi
sifirla();
tabloBaslangicTam("cariler", bulut);
f = tabloFarki("cariler", [A, B, { ...S, kod: 17 }]);
bekle("6) tazelemeden sonra S'ye kod atanması güncellemedir (ekleme değil)", [kimlik(f.guncellenen), kimlik(f.eklenen), f.silinen], [["cari-s1-ab12"], [], []]);

console.log(hata ? "── sunucu carisi birim testi HATALI ──" : "── sunucu carisi birim testi temiz ──");
process.exit(hata);
