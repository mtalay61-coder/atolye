// BİRİM TESTİ — KURULUM SİHİRBAZI (v1.644.0): ne zaman açılır; seçimler tanımlara EKLENİR (mevcut silinmez, aynı ad
// ikinci kez açılmaz), renk kodu ve proses barkod aralığı Tanımlar kuralıyla.
const E = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`  ${ok ? "✓" : "✗"} ${ad}`); if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); } };
const G = E.kurulumSihirbaziGerekli;
const yon = { rol: "Yönetici" };
bekle("boş firma + Yönetici → açılır", G({ tanimlar: {}, stok: [], cariler: [], aktifKullanici: yon, girisAktif: true }), true);
bekle("ürün varsa açılmaz", G({ tanimlar: {}, stok: [{ id: 1 }], cariler: [], aktifKullanici: yon, girisAktif: true }), false);
bekle("renk varsa açılmaz", G({ tanimlar: { renkler: [{ ad: "Siyah" }] }, stok: [], cariler: [], aktifKullanici: yon, girisAktif: true }), false);
bekle("tamamlandıysa açılmaz", G({ tanimlar: { kurulumTamamlandi: true }, stok: [], cariler: [], aktifKullanici: yon, girisAktif: true }), false);
bekle("Yönetici değilse açılmaz", G({ tanimlar: {}, stok: [], cariler: [], aktifKullanici: { rol: "Kullanıcı" }, girisAktif: true }), false);
bekle("giriş kapalıysa herkes", G({ tanimlar: {}, stok: [], cariler: [], aktifKullanici: null, girisAktif: false }), true);
bekle("liste ayrıştırma", E.kurulumListesi(" 34, 42 ;\n43,, "), ["34", "42", "43"]);

let n = 0;
const kimlik = (on) => `${on}-${++n}`;
const once = {
  firmaBilgileri: { logo: "LOGO", unvan: "" },
  bedenler: [{ id: "b0", ad: "38", tip: "Beden" }, { id: "y0", ad: "16 cm", tip: "Boyut" }],
  renkler: [{ id: "r0", ad: "siyah", kod: "105" }],
  renkKombinasyonlari: [{ kod: "106" }],
  prosesler: [{ id: "p0", ad: "Kesim", sira: 0, baslangicNo: 1000 }],
};
const t = E.kurulumTanimlariniUygula(once, {
  firma: { unvan: " Öz Deri ", telefon: "", vergiDairesi: "Merter" },
  olculer: ["37", "38", "39"],
  renkler: [{ ad: "Siyah", kod: "#111" }, { ad: "Beyaz", kod: "#fff" }, { ad: "Taba", kod: "#a60" }],
  prosesler: ["Kesim", "Saya", "Montaj"],
  kdvAktif: true,
}, kimlik);
bekle("firma: unvan kırpıldı, logo korundu, boş alan yazılmadı, KDV", t.firmaBilgileri, { logo: "LOGO", unvan: "Öz Deri", vergiDairesi: "Merter", kdvAktif: true });
bekle("ölçü: 38 tekrar açılmadı, boyut yerinde", t.bedenler.map((b) => `${b.ad}/${b.tip}`), ["38/Beden", "16 cm/Boyut", "37/Beden", "39/Beden"]);
bekle("renk: siyah tekrar açılmadı; kodlar 107,108 (106 model rengi atlandı)", t.renkler.map((r) => `${r.ad}:${r.kod}`), ["siyah:105", "Beyaz:107", "Taba:108"]);
bekle("proses: Kesim tekrar yok; sıra ve binlik aralık", t.prosesler.map((p) => `${p.ad}:${p.sira}:${p.baslangicNo}`), ["Kesim:0:1000", "Saya:1:2000", "Montaj:2:3000"]);
bekle("tamamlandı işareti", t.kurulumTamamlandi, true);
bekle("girdi değişmedi", once.bedenler.length + once.renkler.length + once.prosesler.length, 4);
process.exit(hata);
