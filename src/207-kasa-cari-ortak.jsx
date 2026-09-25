// ================= KASA/BANKA ↔ CARİ HAREKETİ: TEK ÇEKİRDEK =================
//
// Kullanıcı (17 Eylül): *"Muhasebede kasadan girilen ödeme ile cari içerisinden girilen ödemeler
// farklı oluyor... İstediğim tek defter gibi tek ekran, kimsenin kafası karışmasın; cari içinden
// kasa hareketi yapmak istediğinde kasa işlemlerini açsın AYNI KOD ile."*
//
// DURUM: aynı olayı iki ekran yazıyor —
//   • Muhasebe > Kasa/Banka kartı: yön "Giriş/Çıkış", cari opsiyonel.
//   • Cari kartı > Ödeme/Tahsilat: yön "Ödeme/Tahsilat", hesap seçimi.
// İkisi de hem cari hareketi hem kasa hareketi yazıyordu, ama HESABI AYRI AYRI yapıyorlardı. Bu
// yüzden yön kuralı bir tarafta unutuldu ve kasadan girilen ödeme cariye alacak yazıldı (v1.312.0).
//
// BU DOSYA O HESABI TEK YERE ALIYOR. İki form ekranda ayrı kalsa da ürettikleri kayıt tek
// fonksiyondan çıkıyor: yön, fiş numarası, bağ kimliği, karşı taraf alanları, açıklama.
// Görsel birleştirme ayrı iş; mantık birleştirmesi hata sınıfını kapatan asıl adım.
//
// SÖZLÜK — iki ekranın dili burada buluşuyor:
//   kasa/banka GİRİŞ  = cariden TAHSİLAT  → cari yönü `hareketYonu("Tahsilat")` = "Alacak"
//   kasa/banka ÇIKIŞ  = cariye  ÖDEME     → cari yönü `hareketYonu("Ödeme")`    = "Borç"

// `hesapYonu`: "Giriş" | "Çıkış"  →  işlem tipi: "Tahsilat" | "Ödeme"
function kasaIslemTipi(hesapYonu) {
  return hesapYonu === "Giriş" ? "Tahsilat" : "Ödeme";
}

// İşlem tipinden hesap yönü (ters çevrim) — cari kartı bu yönde soruyor.
function kasaHesapYonu(islemTipi) {
  return islemTipi === "Tahsilat" ? "Giriş" : "Çıkış";
}

// Tek çağrıda hem cari hem kasa/banka hareketini kurar.
//
// girdi:
//   islemTipi      "Tahsilat" | "Ödeme"   (hangi ekrandan gelirse gelsin bu dile çevrilir)
//   tarih          "2026-09-17"
//   cariId, cariUnvan
//   cariTutar, cariPB      cariye işlenecek tutar ve para birimi
//   hesapTur, hesapId, hesapAd, hesapPB, hesapTutar   kasa/banka tarafı
//   defter, aciklama, odemeSekli, kur
//   fisNo          çağıran üretir (numara havuzu ekranda) — verilmezse null
//
// dönen: { bagId, cariHareketi, muhasebeHareketi }
function kasaCariHareketiKur(girdi) {
  const {
    islemTipi, tarih, cariId, cariUnvan, cariTutar, cariPB,
    hesapTur, hesapId, hesapAd, hesapPB, hesapTutar,
    defter, aciklama, odemeSekli, kur, fisNo,
  } = girdi;

  const bagId = uid("mhbag");
  const hesapYonu = kasaHesapYonu(islemTipi);
  const ortakAciklama = `${islemTipi}${hesapAd ? ` (${hesapAd})` : ""}${aciklama ? `: ${aciklama}` : ""}`;

  const cariHareketi = {
    id: uid("hrk"),
    tarih,
    // TEK KURAL: yön `hareketYonu`dan. İki ekranın ayrışmasının sebebi buydu.
    yon: hareketYonu(islemTipi),
    tutar: cariTutar,
    paraBirimi: cariPB || "TRY",
    odemeSekli: odemeSekli || (hesapTur === "kasa" ? "Nakit" : "Havale/EFT"),
    vade: "",
    fisNo: fisNo || null,
    muhasebeBagId: bagId,
    aciklama: ortakAciklama,
    islemTipi,
    // KULLANICI (17 Eylül: "kullanıcı göstermiyor"): Son İşlemler listesi `kullanici` alanını
    // okuyor; kasa/cari yolundan yazılan hareketlerde bu alan hiç doldurulmuyordu. Değer tek
    // kaynaktan (`islemKullanicisiAd`, 025-veri-fark) geliyor — prop zinciriyle taşımak "bir yol
    // unutuldu" hatasına açık.
    kullanici: girdi.kullanici || islemKullanicisiAd(),
    // Karşı taraf ALAN olarak taşınıyor: ekstre bunları okuyor, açıklamadan ayrıştırmak kırılgan.
    hesapAd: hesapAd || null,
    hesapPB: hesapPB || null,
    hesapTutar: hesapTutar == null ? cariTutar : hesapTutar,
    defter: defter || "Genel",
  };

  const muhasebeHareketi = hesapId ? {
    id: uid("mhrk"),
    tarih,
    yon: hesapYonu,
    tutar: hesapTutar == null ? cariTutar : hesapTutar,
    cariTutar,
    cariPB: cariPB || "TRY",
    cariId: cariId || null,
    kur: kur || undefined,
    muhasebeBagId: bagId,
    defter: defter || "Genel",
    aciklama: `${islemTipi}${cariUnvan ? ` · ${cariUnvan}` : ""}${aciklama ? ` · ${aciklama}` : ""}`,
  } : null;

  return { bagId, cariHareketi, muhasebeHareketi, hesapTur, hesapId };
}
