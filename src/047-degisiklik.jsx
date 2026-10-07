// DEĞİŞİKLİK SAYACI — başka cihazın yazdığını anında görmek (7 Ekim 2026, v1.611.0).
//
// Kullanıcı: "Başka kullanıcıların yaptığı işlemler geç düşüyor, anında nasıl görebiliriz?" Uygulama buluttaki
// değişiklikleri yalnız AÇILIŞTA okuyordu (sohbet hariç). Supabase'de tek satırlık `degisiklik` tablosu var
// (degisiklik-sayaci.sql): her tabloya tetikleyici, yazmada o tablonun sayacını artırır. Uygulama sekme açıkken
// birkaç saniyede bir bu satırı okur; sayacı artan tabloları (kendi yazmamız değilse) buluttan yeniden çeker ve
// ekrana sessizce işler (100 `bulutDegisikligiUygula`). Gerçek zamanlı WebSocket (Supabase Realtime) yerine yoklama:
// kurulumu tek SQL, bağlantı kopması / uyku derdi yok; gecikme en çok bir yoklama aralığı.
//
// Bu dosya SAF parçaları taşır (birim testi `birim-degisiklik`); okuma/yazma 100'de.

// Bulut tablosu → uygulama alanı (state). Alt tablolar ana alana düşer: kalem değişince siparişler tazelenir.
const DEGISIKLIK_TABLO_ALANI = {
  urunler: "stok", varyantlar: "stok", stok_hareketleri: "stok",
  cariler: "cariler", cari_hareketleri: "cariler",
  siparisler: "siparisler", siparis_kalemleri: "siparisler",
  uretim: "uretim", uretim_atamalari: "uretim",
  stok_rezervasyonlari: "stokRezervasyonlari", onaylar: "onaylar", cop: "cop",
  tanimlar: "tanimlar", muhasebe: "muhasebe", koliler: "koliler", gorevler: "gorevler",
  faturalar: "faturalar", fis_defteri: "fisDefteri", modeller: "modeller",
  // mesajlar: sohbet kendi 6 sn yoklamasıyla tazeleniyor (100); cek_gorselleri: kendi yazma yolu, nadir — burada yok.
};
// Alan → yerel anahtar (bekleyen yazma defteri bu anahtarla tutuluyor): bekleyeni olan alan TAZELENMEZ, yerel kazanır.
const DEGISIKLIK_ALAN_ANAHTARI = {
  stok: "stok:items", cariler: "cari:data", siparisler: "siparis:data", uretim: "uretim:siparisler",
  stokRezervasyonlari: "stokrez:data", onaylar: "onaylar:data", cop: "cop:data", tanimlar: "tanimlar:data",
  muhasebe: "muhasebe:data", koliler: "koli:data", gorevler: "gorev:data", faturalar: "fatura:data",
  fisDefteri: "fisdefter:data", modeller: "model:data",
};
const DEGISIKLIK_ALAN_ADI = {
  stok: "Stok", cariler: "Cariler", siparisler: "Siparişler", uretim: "Üretim", stokRezervasyonlari: "Rezervasyonlar",
  onaylar: "Onaylar", cop: "Çöp", tanimlar: "Tanımlar", muhasebe: "Kasa / Banka", koliler: "Koliler", gorevler: "Görevler",
  faturalar: "Faturalar", fisDefteri: "Fiş defteri", modeller: "Modelhane",
};
const DEGISIKLIK_YOKLAMA_MS = 8000;
const DEGISIKLIK_KENDI_YAZMA_MS = 12000;

// Sayaç farkından tazelenecek alanları çıkarır. Saf.
//   onceki/yeni: { tablo: sayı }. `sonYazma(tablo)` → bu cihazın o tabloya son yazma zamanı (ms), `simdi` → şimdi.
//   `bekleyenAnahtarlar`: bekleyen yazma defterindeki yerel anahtarlar.
// Döner: { alanlar: [...], tablolar: [...], ertelenen: [...tablolar] } — ertelenen: bizim yazmamız olabilir, bu turda
// geçilir ama "görüldü" sayılmaz; sonraki turda yazma yaşlanınca tazelenir (başka cihazın aynı andaki kaydı kaçmasın).
function degisiklikFarki(onceki, yeni, { sonYazma, simdi, bekleyenAnahtarlar } = {}) {
  const alanlar = new Set(); const tablolar = []; const ertelenen = []; const bekleyen = new Set(bekleyenAnahtarlar || []);
  Object.entries(yeni || {}).forEach(([tablo, sayi]) => {
    const alan = DEGISIKLIK_TABLO_ALANI[tablo];
    if (!alan) return;
    if (Number(sayi) === Number((onceki || {})[tablo] || 0)) return;
    if (sonYazma && simdi != null && simdi - (sonYazma(tablo) || 0) < DEGISIKLIK_KENDI_YAZMA_MS) { ertelenen.push(tablo); return; }
    const anahtar = DEGISIKLIK_ALAN_ANAHTARI[alan];
    if (anahtar && bekleyen.has(anahtar)) { ertelenen.push(tablo); return; }
    alanlar.add(alan); tablolar.push(tablo);
  });
  return { alanlar: Array.from(alanlar), tablolar, ertelenen };
}

// Bir alan için buluttan okunacak tablolar (alt tablolar dahil).
function alaninTablolari(alan) {
  return Object.entries(DEGISIKLIK_TABLO_ALANI).filter(([, a]) => a === alan).map(([t]) => t);
}

// "Görüldü" sayaçları: tazelenen ve değişmeyen tablolar yeni değeri alır, ertelenenler eski değerde kalır.
function degisiklikGoruldu(onceki, yeni, ertelenen) {
  const e = new Set(ertelenen || []);
  const sonuc = { ...(yeni || {}) };
  e.forEach((t) => { if ((onceki || {})[t] !== undefined) sonuc[t] = onceki[t]; else delete sonuc[t]; });
  return sonuc;
}
