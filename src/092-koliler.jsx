// ================= KOLİ (PAKETLEME) =================
//
// 19 Eylül (2. madde, 3. tur): App'ten çıkarılan üçüncü parça. Koli kaydetme, koli açma ve silme.
//
// KOLİ KODU SIRALI ("K-0919001"): fiş numaralarıyla aynı gerekçe — barkod okunmadığında insan
// gözüyle okunup elle aranabilmeli. Rastgele bir blok bunu imkânsız kılıyordu.
//
// SİLME ÇÖPE GİDİYOR: koli silinince içindeki çiftler stoğa geri dönüyor ve kayıt çöp kutusuna
// düşüyor — yanlışlıkla silinen bir koli, paketlenmiş malın kaybolması demek olurdu.
function useKoliler(d) {
  const { koliler, setKoliler, stok, showToast, copaAt, kaydetmeHatasiBildir, aktifKullanici } = d;

const saveKoliler = useCallback(async (next) => {
  setKoliler(next);
  try {
    await tekilYaz("koli:data", "koliler", next);
  } catch (e) {
    kaydetmeHatasiBildir(e, "Koliler", next);
  }
}, [kaydetmeHatasiBildir]);

const koliEkle = useCallback((veri) => {
  const kod = fisNoSiradaki("K", (koliler || []).map((k) => k.kod));
  const yeni = {
    id: uid("koli"),
    kod,
    durum: "Hazır",
    olusturma: new Date().toISOString(),
    kullanici: (aktifKullanici && aktifKullanici.ad) || null,
    ...veri,
  };
  saveKoliler([yeni, ...(koliler || [])]);
  showToast(`Koli oluşturuldu: ${kod}`);
}, [koliler, saveKoliler, showToast, aktifKullanici]);

// ÇOKLU KOLİ (19 Eylül): asortili koli kurarken aynı anda N koli oluşturuluyor. `koliEkle`yi
// döngüde çağırmak İŞE YARAMIYOR — her çağrı aynı `koliler` dizisini görüyor ve sonuncusu
// diğerlerini eziyor; üç set için tek koli kaydediliyordu. Numaralar ve kayıt TEK yazmada
// üretiliyor.
const koliEkleCoklu = useCallback((adet, veri) => {
  const sayi = Math.max(1, Math.floor(adet || 1));
  const mevcut = koliler || [];
  const kodlar = mevcut.map((k) => k.kod);
  const yeniler = [];
  for (let i = 0; i < sayi; i += 1) {
    const kod = fisNoSiradaki("K", [...kodlar, ...yeniler.map((y) => y.kod)]);
    yeniler.push({
      id: uid("koli"),
      kod,
      durum: "Hazır",
      olusturma: new Date().toISOString(),
      kullanici: (aktifKullanici && aktifKullanici.ad) || null,
      ...veri,
      kalemler: (veri.kalemler || []).map((k) => ({ ...k })),
    });
  }
  saveKoliler([...yeniler.reverse(), ...mevcut]);
  showToast(sayi === 1 ? `Koli oluşturuldu: ${yeniler[0].kod}` : `${sayi} koli oluşturuldu`);
}, [koliler, saveKoliler, showToast, aktifKullanici]);

const koliSil = useCallback((koliId) => {
  const koli = (koliler || []).find((k) => k.id === koliId);
  if (!koli) return;
  // SEVK EDİLMİŞ KOLİ SİLİNMEZ: onun karşılığı bir satış fişi var; koliyi tek başına silmek
  // fişi dayanaksız bırakırdı. Sevkiyatı geri almak fişin işi (bkz. fisGeriAl).
  if ((koli.durum || "Hazır") === "Sevk edildi") {
    showToast("Sevk edilmiş koli silinemez — önce sevkiyat fişini geri alın");
    return;
  }
  copaAt("koli", koli.kod, koli, {
    ozet: `${(koli.kalemler || []).reduce((t, x) => t + (x.adet || 0), 0)} çift · ${(koli.kalemler || []).length} kalem`,
    geriAlinabilirMi: false,
  });
  saveKoliler((koliler || []).filter((k) => k.id !== koliId));
  showToast(`Koli silindi: ${koli.kod}`);
}, [koliler, saveKoliler, showToast, copaAt]);

  return { saveKoliler, koliEkle, koliEkleCoklu, koliSil };
}
