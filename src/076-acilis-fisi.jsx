// ================= AÇILIŞ FİŞİ =================
//
// Kullanıcı (31 Ağustos'tan beri bekliyor): "Her hareket fişe bağlı olsun, stok hareketten
// türetilsin."
//
// ---- NEDEN ŞU ANA KADAR MÜMKÜN DEĞİLDİ ---------------------------------------------------------
//
// Ürünün miktarı iki yerde duruyor:
//   `variants[].miktar`  — ekranlarda okunan sayı (ÖNBELLEK)
//   `hareketler[]`       — o sayının nereden geldiğini anlatan kayıtlar (DEFTER)
//
// İkisi bugün birbirinden bağımsız: uygulama ilk kurulduğunda ya da elle stok girildiğinde miktar
// yazıldı ama karşılığında hareket YAZILMADI. Yani defter, önbelleği açıklamıyor. Bu yüzden
// "stok hareketten türetilsin" demek bugün mümkün değil — türetseydik, açılış bakiyeleri sıfırlanır
// ve elde olan mal kayıtta yok olurdu.
//
// AÇILIŞ FİŞİ tam olarak bu boşluğu kapatıyor: her ürün+varyant için "hareketlerin anlatamadığı
// kadarı"nı TEK bir hareket olarak yazıyor. Ondan sonra defter önbelleği eksiksiz açıklıyor ve
// tutarlılık denetimi anlamlı hale geliyor.
//
// ---- İKİNCİ ENGEL: GEÇMİŞ KIRPMASI -------------------------------------------------------------
//
// `HAREKET_GECMIS_SINIRI` ürün başına 1000 hareket tutuyor, fazlası atılıyor. Kırpılan hareketler
// toplamdan da düşüyor, yani fark yeniden açılıyor. Bu YANLIŞ ALARM değil, gerçek bir kopukluk —
// ve açılış fişi bunu da soğuruyor: fark her hesaplandığında kırpılmış geçmiş de farkın içinde
// kalıyor. Kırpma olan üründe ikinci bir açılış fişi kesmek, kaybolan geçmişi tek satıra indirmek
// demek; sayı doğru kalıyor, ayrıntı kaybı ise zaten kırpmanın kendisinden geliyor.
const ACILIS_KAYNAK = "Açılış";

// Bir ürünün varyant bazında "defterin açıklayamadığı" miktarı.
//
// Hareketler renk+beden ile eşleşiyor. Renk/bedeni BOŞ olan eski hareketler (bedensiz malzeme)
// aynı anahtara düşüyor, çünkü varyantları da öyle.
function acilisFarklari(urun) {
  const toplamlar = new Map();
  const anahtar = (renk, beden) => `${renk || ""}|${beden || ""}`;
  (urun.hareketler || []).forEach((h) => {
    const a = anahtar(h.renk, h.beden);
    toplamlar.set(a, (toplamlar.get(a) || 0) + (h.miktar || 0));
  });
  const farklar = [];
  (urun.variants || []).forEach((v) => {
    const a = anahtar(v.renk, v.beden);
    const fark = stokYuvarla((v.miktar || 0) - (toplamlar.get(a) || 0));
    if (fark !== 0) farklar.push({ renk: v.renk, beden: v.beden, fark });
  });
  return farklar;
}

// Bütün stok için açılış hareketleri. `fisNo` üretimi ÇAĞIRANDAN geliyor ki fonksiyon saf kalsın
// ve test edilebilsin.
//
// TEK FİŞ NUMARASI, ÜRÜN BAŞINA: "1000 üründe 1000 fiş" değil, ürün başına bir açılış belgesi.
// Fiş numarası hareketin hangi olaydan doğduğunu söyler; bir ürünün bütün varyantlarının açılışı
// TEK bir olaydır.
function acilisFisleriUret(stok, { fisNoUretici, tarih }) {
  const hareketler = [];
  const yeniStok = (stok || []).map((u) => {
    const farklar = acilisFarklari(u);
    if (farklar.length === 0) return u;
    const fisNo = fisNoUretici();
    const yeniler = farklar.map((f) => ({
      id: uid("hrk"),
      tarih,
      renk: f.renk,
      beden: f.beden,
      miktar: f.fark,
      // FİŞSİZ HAREKET OLMAZ (proje kuralı, 12. denetim): açılış da bir fişe bağlı.
      fisNo,
      kaynak: ACILIS_KAYNAK,
      aciklama: "Açılış bakiyesi — bu miktarın hareket karşılığı yoktu",
    }));
    hareketler.push(...yeniler);
    return { ...u, hareketler: [...yeniler, ...(u.hareketler || [])].slice(0, HAREKET_GECMIS_SINIRI) };
  });
  return { stok: yeniStok, hareketler, urunSayisi: new Set(hareketler.map((h) => h.fisNo)).size };   // sirasiz-tamam
}

// Önbellek ile defter arasındaki AÇIK — tutarlılık denetiminin ve ekrandaki özetin kaynağı.
// Açılış fişi kesildikten sonra bu liste boşalmalı; boşalmıyorsa arada hareket yazmayan bir yol
// kalmış demektir.
function acilisAcigi(stok) {
  const satirlar = [];
  (stok || []).forEach((u) => {
    acilisFarklari(u).forEach((f) => {
      satirlar.push({ urunId: u.id, urunAd: u.ad, renk: f.renk, beden: f.beden, fark: f.fark });
    });
  });
  return satirlar;
}
