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
  faturalar: "faturalar", fis_defteri: "fisDefteri", modeller: "modeller", teklifler: "teklifler",
  // mesajlar: sohbet kendi 6 sn yoklamasıyla tazeleniyor (100); cek_gorselleri: kendi yazma yolu, nadir — burada yok.
};
// Alan → yerel anahtar (bekleyen yazma defteri bu anahtarla tutuluyor): bekleyeni olan alan TAZELENMEZ, yerel kazanır.
const DEGISIKLIK_ALAN_ANAHTARI = {
  stok: "stok:items", cariler: "cari:data", siparisler: "siparis:data", uretim: "uretim:siparisler",
  stokRezervasyonlari: "stokrez:data", onaylar: "onaylar:data", cop: "cop:data", tanimlar: "tanimlar:data",
  muhasebe: "muhasebe:data", koliler: "koli:data", gorevler: "gorev:data", faturalar: "fatura:data", teklifler: "teklif:data",
  fisDefteri: "fisdefter:data", modeller: "model:data",
};
const DEGISIKLIK_ALAN_ADI = {
  stok: "Stok", cariler: "Cariler", siparisler: "Siparişler", uretim: "Üretim", stokRezervasyonlari: "Rezervasyonlar",
  onaylar: "Onaylar", cop: "Çöp", tanimlar: "Tanımlar", muhasebe: "Kasa / Banka", koliler: "Koliler", gorevler: "Görevler",
  faturalar: "Faturalar", fisDefteri: "Fiş defteri", modeller: "Modelhane", teklifler: "Teklifler",
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
    // KENDİ YAZMAMIZ ALAN BAZINDA (v1.645.2 — kullanıcı tek cihazla çalışırken "Başka cihazdan güncellendi: Kasa / Banka"
    // gördü). Damga ana tablo adıyla basılıyor (urunler) ama aynı kayıt alt tabloları da (varyantlar, stok_hareketleri…)
    // yazıyor ve onların sayacı da artıyor; tablo bazında bakınca alt tablonun artışı "başka cihaz" sayılıyordu. Aynı
    // alana ait HERHANGİ bir tabloya bu cihaz son 12 sn içinde yazdıysa (ya da yazma hâlâ yoldaysa — 030
    // `bulutSonYazma` o durumda "şimdi" döner) bu turda ertelenir.
    const kendiYazma = sonYazma ? Math.max(0, ...alaninTablolari(alan).map((t) => Number(sonYazma(t)) || 0)) : 0;
    if (sonYazma && simdi != null && simdi - kendiYazma < DEGISIKLIK_KENDI_YAZMA_MS) { ertelenen.push(tablo); return; }
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

// İÇERİK AYNI MI (v1.645.7 — kullanıcı tek cihazla koli etiketi basarken "Başka cihazdan güncellendi: Koliler" gördü).
// Kendi yazmamızı SÜREYLE ayırt etmek (12 sn) yetmiyor: yoklama sekme gizliyken durur — etiket yazdırma penceresi,
// başka uygulamaya geçiş — ve dönüşte kendi kaydımızın sayaç artışı 12 sn'yi aşmış oluyor. Son kapı içerik: buluttan
// okunan hâl ekrandakiyle aynıysa hiçbir şey değişmemiştir; tazeleme ve not yapılmaz. Anahtar sırası önemsiz (jsonb
// anahtarları yeniden sıralar), `undefined` alan yok sayılır (JSON gibi). Fark çıkarsa — gerçekten başka cihaz ya da
// bulutun eklediği alan — eski davranış: tazelenir ve not çıkar. Saf.
// `bosuAt`: null / "" alanlar da yok sayılır (yazma biçiminde boş alan null, ekranda hiç yok — v1.645.11).
function kararliJson(x, bosuAt) {
  if (x === null || typeof x !== "object") return JSON.stringify(x === undefined ? null : x);
  if (Array.isArray(x)) return "[" + x.map((v) => kararliJson(v, bosuAt)).join(",") + "]";
  return "{" + Object.keys(x).filter((k) => x[k] !== undefined && !(bosuAt && (x[k] === null || x[k] === ""))).sort()
    .map((k) => JSON.stringify(k) + ":" + kararliJson(x[k], bosuAt)).join(",") + "}";
}
function degisiklikIcerikAyni(a, b) {
  try { return kararliJson(a) === kararliJson(b); } catch (e) { return false; }
}

// ÇOK SATIRLI TABLOLARDA İÇERİK KARŞILAŞTIRMASI (v1.645.11 — kullanıcı tek cihazla 1.645.9'da yine "Başka cihazdan
// güncellendi: Cariler" gördü). `degisiklikIcerikAyni` buluttan OKUNMUŞ nesneyi ekrandakiyle düz karşılaştırıyordu;
// tek satırlık tablolarda (koliler: `veri` jsonb) yeterli, ama çok satırlı tablolarda okunan nesne yazılandan farklı
// biçimde geliyor: boş sütunlar `null` (ekranda alan hiç yok), hareketlere `cariId` eklenir, `zaman` "+00:00" ile
// döner ("…Z" değil), sunucu kendi sütunlarını ekleyebilir. İçerik aynıyken hep "farklı" çıkıp not düşüyordu.
// Çözüm: iki tarafı da YAZMA biçimine (035 TABLO_SEMA `satir` + `cocuklar.cikar`) çevirip karşılaştır; yerel satırda
// olan her sütun / `ek` alanı bulutta aynı mı (boş = null = "", tarih dizgesi = aynı an). Bulutun fazladan alanı
// (sunucu sütunu) yok sayılır. Kayıt / alt kayıt kümesi farklıysa (eklenen, silinen) farklıdır. Saf (TABLO_SEMA'yı okur).
function _icerikDegeri(v) {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) { const t = Date.parse(v); return Number.isNaN(t) ? v : t; }
  if (typeof v === "object") return kararliJson(v, true);
  return v;
}
function _satirAyni(yerel, bulut) {
  if (!bulut) return false;
  return Object.keys(yerel).every((k) => {
    if (k === "ek" && yerel.ek && typeof yerel.ek === "object" && !Array.isArray(yerel.ek)) {
      const be = (bulut.ek && typeof bulut.ek === "object") ? bulut.ek : {};
      return Object.keys(yerel.ek).every((a) => _icerikDegeri(yerel.ek[a]) === _icerikDegeri(be[a]));
    }
    return _icerikDegeri(yerel[k]) === _icerikDegeri(bulut[k]);
  });
}
function _tabloSatirHaritasi(tablo, kayitlar) {
  const sema = TABLO_SEMA[tablo];
  const ana = new Map(); const cocuk = new Map();
  (kayitlar || []).forEach((k) => {
    if (!k || k.id === undefined) return;
    ana.set(k.id, sema.satir(k));
    (sema.cocuklar || []).forEach((c) => c.cikar(k).forEach((r) => cocuk.set(`${c.tablo}|${c.anahtar(r)}`, r)));
  });
  return { ana, cocuk };
}
function tabloIcerikAyni(tablo, yerelKayitlar, bulutKayitlar) {
  if (!TABLO_SEMA[tablo]) return degisiklikIcerikAyni(yerelKayitlar, bulutKayitlar);
  try {
    const y = _tabloSatirHaritasi(tablo, yerelKayitlar); const b = _tabloSatirHaritasi(tablo, bulutKayitlar);
    if (y.ana.size !== b.ana.size || y.cocuk.size !== b.cocuk.size) return false;
    for (const [id, r] of y.ana) if (!_satirAyni(r, b.ana.get(id))) return false;
    for (const [id, r] of y.cocuk) if (!_satirAyni(r, b.cocuk.get(id))) return false;
    return true;
  } catch (e) { return false; }
}
