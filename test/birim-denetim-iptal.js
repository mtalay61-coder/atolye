// BİRİM TESTİ — VERİ TUTARLILIK DENETİMİ İPTAL EDİLMİŞ SİPARİŞİ SAYMAZ (v1.729.0, src/125).
// Kullanıcı (29 Ekim): denetim "SAT-1023 · 1063 - Açık Bej Süet · 36 — siparişte 1, stok hareketlerinde 0" diye CİDDİ bulgu
// verdi; "1023 iptal edilen sipariş, ürün tedarik edilmeden satış yapıldı". İptal (088) teslim fişine dokunmaz, yalnız bağı
// çözer: hareketten siparisId/kalemId kalkar, kalemin karşılananı tarihçe olarak kalır → iki sayı hiç tutmaz.
global.window = global.window || {};
const { veriTutarliligiDenetle, siparisBaglariniCoz } = require("./erp.cjs");
let hata = 0;
const bekle = (ad, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`  ${ok ? "✓" : "✗"} ${ad}`);
  if (!ok) { hata = 1; console.log("    beklenen:", JSON.stringify(b), "· çıkan:", JSON.stringify(a)); }
};
const kodlar = (r) => r.bulgular.filter((b) => b.kod === "siparis-karsilanan" || b.kod === "hayalet-karsilanan").map((b) => b.kod).sort();
const siparis = { id: "s1023", siparisNo: "SAT-1023", tip: "Satış", durum: "Tamamlandı", cariId: "c1",
  kalemler: [{ id: "k36", urunId: "u1", urunAd: "27063 D", renk: "1063 - Açık Bej Süet", beden: "36", miktar: 1, karsilanan: 1 }] };
// Tedarik edilmeden satış: stok eksiye düştü (eksi stok kırpılmaz), sevk hareketi siparişe bağlı.
const stok = [{ id: "u1", ad: "27063 D", variants: [{ renk: "1063 - Açık Bej Süet", beden: "36", miktar: -1 }],
  hareketler: [{ id: "h1", renk: "1063 - Açık Bej Süet", beden: "36", miktar: -1, fisNo: "SF-1", siparisId: "s1023", kalemId: "k36", siparisNo: "SAT-1023" }] }];
const veri = { stok, cariler: [], siparisler: [siparis], tanimlar: {}, fisDefteri: [], muhasebe: {}, uretim: [], stokRezervasyonlari: [] };
bekle("teslim edilmiş, bağlı sipariş → bulgu yok", kodlar(veriTutarliligiDenetle(veri)), []);
const iptal = siparisBaglariniCoz({ stok, cariler: [], siparisler: [siparis] }, "s1023", { zaman: "2026-10-29T10:00:00Z" });
const sonra = { ...veri, stok: iptal.stok, siparisler: iptal.siparisler };
bekle("iptal: hareketin bağı çözüldü, karşılanan kaldı", [iptal.stok[0].hareketler[0].siparisId, iptal.siparisler[0].kalemler[0].karsilanan, iptal.siparisler[0].durum], [undefined, 1, "İptal"]);
bekle("iptal edilmiş sipariş → ciddi bulgu YOK", kodlar(veriTutarliligiDenetle(sonra)), []);
const iptalsiz = { ...sonra, siparisler: [{ ...iptal.siparisler[0], durum: "Tamamlandı" }] };
bekle("aynı durum iptal edilmemiş siparişte → hâlâ bulgu (kontrol çalışıyor)", kodlar(veriTutarliligiDenetle(iptalsiz)), ["hayalet-karsilanan", "siparis-karsilanan"]);
console.log(hata ? "\nBAŞARISIZ" : "\nTAMAM");
process.exit(hata);
