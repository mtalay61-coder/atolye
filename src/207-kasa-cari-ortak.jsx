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

// RESMİ P. TİPİ ALANI (v1.676.0 — kullanıcı: "Ödeme tahsilat ve cari kartına da ekle"; v1.675.0 Banka Excel'iyle aynı
// kural). Defter "Muhasebe" iken aynı kayıt Resmi defterde başka para biriminde tutulabilir: `resmiPB` + `resmiTutar`
// (tek kayıt; 200 hareketDefterde). Tutar boş bırakılırsa sistemdeki kurla önerilen değer yazılır.
// KUR KUTUSU (v1.678.0 — kullanıcı: "Muhasebe seçince çift kur girmek gerekli, Resmi ve Genel için"). Alan iki
// yönlü: kur yazılırsa tutar = ana tutar ÷ kur; tutar yazılırsa kur = ana tutar ÷ tutar. Kur "1 <seçilen PB> = ? <ana PB>"
// biçiminde (üst şeritteki kurla aynı okuma). İkisi de boşsa sistem kuruyla öneri.
function resmiTutarHesapla(anaPB, anaTutar, deger, kurlar) {
  const pb = (deger && deger.pb) || anaPB;
  if (pb === anaPB) return { pb, tutar: anaTutar, kur: 1 };
  const sayi = (v) => parseFloat(String(v || "").replace(",", "."));
  const elleTutar = sayi(deger && deger.tutar);
  const elleKur = sayi(deger && deger.kur);
  // TERS YÖN: seçilen birim TRY ise kur "1 <ana PB> = ? TRY" okunur (1 TRY = 0,025 USD yazmak okunaksız).
  const ters = pb === "TRY";
  const sistemKur = ters ? paraCevirGenel(1, anaPB, pb, kurlar) : paraCevirGenel(1, pb, anaPB, kurlar);
  if (elleTutar > 0) return { pb, ters, tutar: elleTutar, kur: anaTutar > 0 ? (ters ? elleTutar / anaTutar : anaTutar / elleTutar) : null };
  const kur = elleKur > 0 ? elleKur : sistemKur;
  return { pb, ters, tutar: kur > 0 && anaTutar > 0 ? (ters ? anaTutar * kur : anaTutar / kur) : null, kur };
}
function resmiAlanlari(defter, anaPB, anaTutar, deger, kurlar) {
  const pb = deger && deger.pb;
  if (defter !== "Muhasebe" || !pb || pb === anaPB) return {};
  const h = resmiTutarHesapla(anaPB, anaTutar, deger, kurlar);
  return h.tutar > 0 ? { resmiPB: pb, resmiTutar: stokYuvarla(h.tutar) } : {};
}
function ResmiTutarAlani({ defter, anaPB, anaTutar, kurlar, deger, onDegis, stil, etiket = "Resmi", veri = "resmi", ayniAd }) {
  if (defter !== "Muhasebe") return null;
  const pb = (deger && deger.pb) || anaPB;
  const h = resmiTutarHesapla(anaPB, anaTutar, deger, kurlar);
  const kutu = { fontSize: 12, padding: "3px 6px" };
  return (
    <div data-resmi-tutar-alani="1" style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", fontSize: 12, ...(stil || {}) }}>
      <span style={{ fontWeight: 700, color: "var(--erp-info)" }}>{etiket}</span>
      <select data-resmi-pb={veri === "resmi" ? "1" : undefined} data-karsi-pb={veri === "karsi" ? "1" : undefined} data-renk-koru="1" value={pb} onChange={(e) => onDegis({ pb: e.target.value, tutar: "", kur: "" })} style={kutu}>
        {MUHASEBE_PARA_BIRIMLERI.map((p) => <option key={p} value={p}>{p === anaPB ? `${p} (${ayniAd || (veri === "karsi" ? "kasa ile" : "Genel ile")} aynı)` : p}</option>)}
      </select>
      {pb !== anaPB && (<>
        <span>kur 1 {h.ters ? anaPB : pb} =</span>
        <input data-resmi-kur={veri === "resmi" ? "1" : undefined} data-karsi-kur={veri === "karsi" ? "1" : undefined} data-renk-koru="1" inputMode="decimal"
          value={deger && deger.kur ? deger.kur : (h.kur > 0 ? String(Math.round(h.kur * 10000) / 10000) : "")}
          onChange={(e) => onDegis({ pb, kur: e.target.value, tutar: "" })} style={{ ...kutu, width: 72 }} />
        <span>{h.ters ? pb : anaPB} →</span>
        <input data-resmi-tutar={veri === "resmi" ? "1" : undefined} data-karsi-tutar={veri === "karsi" ? "1" : undefined} data-renk-koru="1" inputMode="decimal"
          value={deger && deger.tutar ? deger.tutar : (h.tutar > 0 ? String(stokYuvarla(h.tutar)) : "")}
          onChange={(e) => onDegis({ pb, tutar: e.target.value, kur: "" })} style={{ ...kutu, width: 100, fontWeight: 700 }} />
        <span>{PARA_SEMBOLU[pb] || pb}</span>
      </>)}
    </div>
  );
}

// KARŞI TARAF TEK LİSTEDE (v1.681.0 — kullanıcı: "cari ve gelir gider kartları aynı yerden seçilsin, farklı olmasına
// gerek yok"). CariSecici'ye carilerle birlikte gelir/gider kartları da verilir; kart kimliği "kart:<id>" önekiyle
// ayrılır, seçenekte "gelir/gider kartı" diye işaretlenir. Çağıran `karsiTarafCoz(id)` ile hangisi olduğunu ayırır.
function karsiTarafListesi(cariler, kartlar) {
  return [
    ...(cariler || []).filter((c) => !c.pasif),
    ...(kartlar || []).map((k) => ({ id: `kart:${k.id}`, unvan: k.ad, resmiUnvan: k.tur === "gelir" ? "gelir kartı" : "gelir/gider kartı", kod: "" })),
  ];
}
function karsiTarafCoz(id) {
  const s = String(id || "");
  return s.startsWith("kart:") ? { kartId: s.slice(5), cariId: "" } : { kartId: "", cariId: s };
}
