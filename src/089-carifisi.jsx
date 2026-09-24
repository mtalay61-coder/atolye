// ================= CARİ KARTINDAN FİŞ KESME =================
//
// 19 Eylül (2. madde, 5. tur): App'ten çıkarılan beşinci parça. Cari kartındaki "Alış Fişi" /
// "Satış Fişi" ekranından gelen kayıt yolu.
//
// KURALLAR (pahalıya öğrenilenler):
//   • Fiş SİPARİŞ OLUŞTURMAZ: fiş olmuş bir işin belgesidir (mal elde, borç doğdu); sipariş
//     gelecek bir malı anlatır. İkisini karıştırmak, kapanmış işi açık sipariş gibi göstermekti.
//   • TEK FİŞ NUMARASI bütün kalemleri bağlar ve cari tarafına TEK hareket yazılır — ekstre belge
//     bazlı okunur; üç malzemelik bir alışverişin üç ayrı satır olarak görünmesi değil.
//   • Defter yazılamazsa hiçbir türev tabloya dokunulmaz (atomik kapı, 22. bölüm).
function useCariFisiKaydet(d) {
  const {
    addCariHareketFromStok, aktifKullanici, cariler, fisDefterineYaz, muhasebeyePesinIsle,
    setSiparisler, setStok, showToast, siparisler, stok, fisGeriAlRef, koliler, saveKoliler,
  } = d;

const stokFisiKaydet = useCallback(async (cariId, tip, fis) => {
  const alisMi = tip === "Alış";
  const kalemler = (fis.kalemler || []).filter((k) => (k.miktar || 0) > 0);
  if (kalemler.length === 0) { showToast("Fişte kalem yok"); return; }

  // Kullanıcının yazdığı numara (tedarikçinin gerçek irsaliye no'su) varsa o korunur.
  // Sıra numarası: "AF-20260902-001". Rastgele son blok yerine sayılabilir bir numara —
  // muhasebede fişlerin sıralı olması bekleniyor.
  const fisNo = (fis.fisNo || "").trim() || fisNoSiradaki(alisMi ? "AF" : "SF", tumFisNumaralari(cariler));
  // Stok hareketi tam zaman damgası tutar (sıralama saate duyarlı), cari hareketi gün bazlı.
  // Fiş tarihi kullanıcıdan geliyor; o günün saatini uydurmak yerine kaydın girildiği an eklenir.
  const zaman = new Date().toISOString();
  const kayitPB = fis.paraBirimi || "TRY";
  const fisAciklamasi = fis.aciklama || `${alisMi ? "Cariden Alış" : "Cariye Satış"} fişi`;

  const fisGovdesi = {
    fisNo, tip, cariId,
    kaynak: alisMi ? "Satınalma" : "Satış",
    stokTarihi: `${fis.tarih}T${zaman.slice(11)}`,
    cariTarihi: fis.tarih,
    zaman,
    kayitParaBirimi: kayitPB,
    // Kur, fişin KENDİ kayıt kurudur (`kayitKurlari`) — güncel kur değil. Kurlar sonradan
    // değişse de bu fişin tutarı kaymaz; yoksa geçmiş bir alışın borcu her gün başka görünürdü.
    kurlar: fis.kayitKurlari || {},
    kurZorunlu: true,      // sessizce eksik tutar yazmaktansa hiç yazmamak
    tutarYuvarla: true,
    birimFiyatBolerek: false,
    // Yön TEK YERDEN geliyor (bkz. `hareketYonu`): alış cariye borçlanmaktır (−),
    // satış cariden alacaklı olmaktır (+). Burada elle "Borç" yazmak, iki fiş yolunun
    // birbirinden ayrışmasına ve alış ile satışın aynı yöne gitmesine yol açmıştı.
    yon: hareketYonu(tip),
    kullanici: (aktifKullanici && aktifKullanici.ad) || null,
    defter: fis.defter || "Genel",
    odemeSekli: fis.odemeSekli || "Nakit",
    vade: fis.vade || "",
    // PEŞİN TAHSİLAT/ÖDEME — yalnızca formda hesap seçilmişse dolu gelir. Boşsa fiş eskisi
    // gibi yalnız cari borcu yazar; varsayılan davranış değişmiyor.
    pesin: fis.pesin || null,
    siparis: null,
    kalemler,
    stokAciklama: () => `${alisMi ? "Alış" : "Satış"} fişi · ${fisNo}`,
    cariAciklama: (k, c) =>
      `${fisAciklamasi}: ${k.urunAd} · ${k.renk}${k.beden ? " · " + k.beden : ""} · ` +
      `${k.miktar} ${k.birim || ""}`.trim() +
      (c.cevrildiMi
        ? ` (${(k.birimFiyat || 0).toLocaleString("tr-TR", { maximumFractionDigits: 4 })} ${c.kalemPB}` +
          `${c.kur ? ` × ${c.kur}` : ""}${c.kurHedef ? ` ÷ ${c.kurHedef}` : ""} = ` +
          `${c.birimFiyat.toLocaleString("tr-TR", { maximumFractionDigits: 4 })} ${c.hedefPB})`
        : ""),
  };
  const sonuc = fisYaz(stok, cariler, fisGovdesi);

  if (sonuc.yazilmadi) {
    showToast(`Kur bulunamadı (${[...sonuc.cevrilemeyenler].join(", ")} → ${kayitPB}) — fiş kaydedilmedi`);
    return null;
  }

  // DEFTER KAPISI: buradan geçmeyen fişin hiçbir yan etkisi uygulanmaz.
  if (!(await fisDefterineYaz(fisGovdesi, sonuc))) return null;

  // Stok ÖNCE hesaplanıp SONRA yazılıyor. Eskiden `setStok` kur kontrolünden ÖNCE çağrılıyordu:
  // kur bulunamayınca fiş "kaydedilmedi" deniyor ama MAL ZATEN STOĞA GİRMİŞ oluyordu.
  // SİPARİŞE BAĞLI KALEMLER (9b): fiş kalemi `siparis` + `kalemId` taşıyorsa o siparişin teslim
  // alınanı artar, durum güncellenir — sipariş kartından kesilen fişle aynı sonuç. Geri alma
  // `fisGeriAl`da hareketten (`siparisId|kalemId`) okunuyor, burada ek bir şey gerekmez.
  const bagliKalemler = kalemler.filter((k) => k.siparis && k.siparis.id && k.kalemId);
  if (bagliKalemler.length > 0) {
    setSiparisler((prev) => {
      const next = prev.map((s) => {
        const benim = bagliKalemler.filter((k) => k.siparis.id === s.id);
        if (benim.length === 0) return s;
        const nextKalemler = s.kalemler.map((k) => {
          const eklenecek = benim.filter((b) => b.kalemId === k.id).reduce((t, b) => t + (b.miktar || 0), 0);
          return eklenecek > 0 ? { ...k, karsilanan: Math.min(k.miktar, (k.karsilanan || 0) + eklenecek) } : k;
        });
        const tumuTam = nextKalemler.every((k) => (k.karsilanan || 0) >= k.miktar);
        const hicYok = nextKalemler.every((k) => (k.karsilanan || 0) === 0);
        return { ...s, kalemler: nextKalemler, durum: tumuTam ? "Tamamlandı" : hicYok ? s.durum : "Kısmi Teslim" };
      });
      yazimiIzle(tabloYaz("siparis:data", "siparisler", next), "Siparişler", next);
      return next;
    });
  }
  setStok(sonuc.stok);
  yazimiIzle(tabloYaz("stok:items", "urunler", sonuc.stok), "Stok kartları", sonuc.stok);
  // OKUTULAN KOLİLER (23 Eylül, v1.420.0): satırlar `koliId` taşıyorsa koli "Sevk edildi"ye geçer ve
  // hangi fişle çıktığını saklar — sipariş kartından kesilen fişle AYNI işaret; `fisGeriAl` bu bağdan
  // koliyi geri "Hazır" yapıyor. Fiş defteri yazımı yukarıda tuttuğu için buraya gelindi.
  const koliIdler = [...new Set(kalemler.map((k) => k.koliId).filter(Boolean))];
  if (koliIdler.length && saveKoliler) {
    const zaman = new Date().toISOString();
    saveKoliler((koliler || []).map((k) => (koliIdler.includes(k.id) ? { ...k, durum: "Sevk edildi", sevkFisNo: fisNo, sevkZamani: zaman } : k)));
  }
  // Cari tarafı huniden geçiyor (fiş no / kimlik / zaman güvencesi orada).
  addCariHareketFromStok(cariId, sonuc.cariHareketleri);

  // PEŞİN KISIM: kasa/banka hareketi. Cari tarafı yukarıda yazıldı (fişin açtığı borcu kapatan
  // kayıt); burada yalnız hesabın kendi defteri güncelleniyor. İkisi `muhasebeBagId` ile bağlı,
  // yani fiş geri alınınca `fisGeriAl` bu hareketi de siliyor.
  if (sonuc.pesinHareket) muhasebeyePesinIsle(sonuc.pesinHareket);

  const toplamTutar = stokYuvarla(sonuc.cariHareketleri
    .filter((h) => h.defter !== "Resmi")
    .reduce((t, h) => t + h.tutar, 0));
  showToast(`${alisMi ? "Alış" : "Satış"} fişi kaydedildi — ${fisNo} · ${kalemler.length} kalem · ${toplamTutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${PARA_SEMBOLU[kayitPB] || kayitPB}`, {
    // GERİ AL HAREKET KİMLİKLERİYLE (21 Eylül): fiş defterine bakmak yetmiyordu — defter yazımı
    // beklemede kalınca fiş bulunamıyor, geri al çalışmıyordu. `fisYaz` her stok hareketinin
    // kimliğini döndürüyor (`kimlikler`); cari hareketleri de kendi kimliğiyle. Geri alma
    // doğrudan bu kimliklerle yapılıyor, deftere bağlı değil.
    geriAl: () => fisGeriAlRef && fisGeriAlRef.current && fisGeriAlRef.current(fisNo, [
      ...[...(sonuc.kimlikler || new Map()).values()],
      ...((sonuc.cariHareketleri || []).map((h) => h.id).filter(Boolean)),
    ]),
  });
  return fisNo;
}, [stok, cariler, showToast, addCariHareketFromStok, muhasebeyePesinIsle, aktifKullanici, fisDefterineYaz, fisGeriAlRef, koliler, saveKoliler]);

  return stokFisiKaydet;
}
