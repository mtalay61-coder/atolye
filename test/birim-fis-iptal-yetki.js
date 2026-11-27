// BİRİM TESTİ — FİŞ İPTALİ / "GERİ AL" YETKİSİ (v1.744.44, 094 fisIptalYetkisi / fisIptalDugmesiGizli).
// Sunucu kuralı (fis_iptal / fis_iptal_toplu): stk_yetki(array['stok','fisler','siparis','uretim','cari','muhasebe'], 'silme') — altı
// modülden HERHANGİ birinde silme; giriş kapalıysa ya da Yönetici ise serbest. İstemci bunun AYNISINI söylemeli: yoksa sunucunun
// reddedeceği "Sil" / "Geri Al" düğmesi görünür (ekran sınaması P1: yalnız muhasebe ve yalnız üretim hesabı 403 aldı).
const { fisIptalYetkisi, fisIptalDugmesiGizli } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "\n    çıkan:   ", JSON.stringify(a)); } };
const ALTI = ["stok", "fisler", "siparis", "uretim", "cari", "muhasebe"];
const TUMU = { goruntuleme: true, duzenleme: true, kaydetme: true };
const T = { girisAktifMi: true, kullanicilar: [
  ...ALTI.map((m) => ({ id: `sil-${m}`, rol: "Personel", yetkiler: { [m]: { silme: true } } })),
  { id: "muh", rol: "Personel", yetkiler: { muhasebe: TUMU } },                     // ekran sınamasındaki 1. hesap
  { id: "urt", rol: "Personel", yetkiler: { uretim: TUMU } },                       // ekran sınamasındaki 2. hesap
  { id: "hepsi-silmesiz", rol: "Personel", yetkiler: Object.fromEntries(ALTI.map((m) => [m, TUMU])) },
  { id: "tanim", rol: "Personel", yetkiler: { tanimlar: { ...TUMU, silme: true }, rapor: { silme: true } } },
  { id: "bos", rol: "Personel" },
  { id: "yon", rol: "Yönetici" }] };
const kim = (id) => T.kullanicilar.find((k) => k.id === id);

console.log("1) serbest durumlar");
bekle("giriş sistemi kapalı → true (kullanıcı yok)", fisIptalYetkisi({ girisAktifMi: false }, null), true);
bekle("giriş sistemi kapalı → true (yetkisiz kullanıcı)", fisIptalYetkisi({ girisAktifMi: false, kullanicilar: T.kullanicilar }, kim("bos")), true);
bekle("tanımlar yok → true (yetkiVarMi ile aynı)", fisIptalYetkisi(null, null), true);
bekle("Yönetici → true", fisIptalYetkisi(T, kim("yon")), true);

console.log("2) altı modülün her birinde tek başına silme");
ALTI.forEach((m) => bekle(`yalnız ${m} › silme → true`, fisIptalYetkisi(T, kim(`sil-${m}`)), true));

console.log("3) silme yoksa");
bekle("yalnız muhasebe görüntüleme + düzenleme + kaydetme → false", fisIptalYetkisi(T, kim("muh")), false);
bekle("yalnız üretim görüntüleme + düzenleme + kaydetme → false", fisIptalYetkisi(T, kim("urt")), false);
bekle("altı modülde de kaydetme / düzenleme, silme yok → false", fisIptalYetkisi(T, kim("hepsi-silmesiz")), false);
bekle("tanimlar / rapor modülünde silme → false (sunucu listesinde yok)", fisIptalYetkisi(T, kim("tanim")), false);
bekle("yetki kaydı hiç yok → false", fisIptalYetkisi(T, kim("bos")), false);
bekle("kullanıcı yok (giriş açık) → false", fisIptalYetkisi(T, null), false);

console.log("4) GÜNCEL kayıt tanımlardan");
bekle("oturumdaki eski nesnede silme var, güncel kayıtta yok → false", fisIptalYetkisi(T, { id: "muh", rol: "Personel", yetkiler: { muhasebe: { silme: true } } }), false);
bekle("oturumdaki eski nesnede yok, güncel kayıtta var → true", fisIptalYetkisi(T, { id: "sil-cari", rol: "Personel", yetkiler: {} }), true);
bekle("tanımlarda kaydı olmayan kullanıcı kendi nesnesinden okunur", fisIptalYetkisi(T, { id: "yok", rol: "Personel", yetkiler: { stok: { silme: true } } }), true);

console.log("5) düğme gizli mi (onay sistemi)");
bekle("yetki yok, onay kapalı → gizli", fisIptalDugmesiGizli(T, kim("muh")), true);
bekle("yetki yok, onay AÇIK → eski davranış (gizlenmez)", fisIptalDugmesiGizli({ ...T, onaySistemiAcik: true }, kim("muh")), false);
bekle("yetki var → gizlenmez", fisIptalDugmesiGizli(T, kim("sil-uretim")), false);
bekle("Yönetici → gizlenmez", fisIptalDugmesiGizli(T, kim("yon")), false);
bekle("giriş kapalı → gizlenmez", fisIptalDugmesiGizli({ girisAktifMi: false }, null), false);

console.log(hata ? "\nBAŞARISIZ" : "\nTümü geçti");
process.exit(hata);
