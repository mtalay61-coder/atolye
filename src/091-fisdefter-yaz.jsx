// ================= FİŞ DEFTERİNE YAZMA =================
//
// 19 Eylül (2. madde, 4. tur): App'ten çıkarılan dördüncü parça. Fiş defterine kayıt yazma,
// atomik kapı ve iptal.
//
// DEFTER DOĞRULUĞUN KAYNAĞI (21–22. bölüm): kesilen her fişin tek kaydı burada. Kayıt
// YAZILAMAZSA türev tablolara (stok, cari, sipariş) hiç dokunulmuyor — yarım kalmış bir işlem,
// hiç yapılmamış işlemden kötüdür. Geri alınan fiş SİLİNMİYOR, `iptal: true` ile işaretleniyor:
// "ne oldu" sorusunun cevabı kaydın yokluğundan çıkarılamaz.
function useFisDefteriYazma(d) {
  const { fisDefteri, setFisDefteri, showToast, kaydetmeHatasiBildir, aktifKullanici } = d;

// ---- EN GÜNCEL DEFTER (22 Eylül, denetim 18 — "kapanış state'i") --------------------------------
// Üç fonksiyon da defteri kendi oluşturuldukları andaki FOTOĞRAFTAN okuyordu. Üç ayrı hata:
//  1) Yazma başarısız olunca `setFisDefteri(fisDefteri)` BEKLEME ÖNCESİNİN defterini geri koyuyordu;
//     arada yazılan fiş bellekten, bir sonraki tam yazmayla buluttan da siliniyordu.
//  2) Bir üretim geri alınınca `forEach(fisDefterindeIptal)` aynı fotoğraftan üç kez iptal kuruyordu;
//     yalnız sonuncusu kalıyordu.
//  3) Çağıranların bağımlılık dizisinde `fisDefterindeIptal` yoktu: üretim geri alma, sayfa açılışındaki
//     BOŞ defteri görüyor ve hiçbir fişi iptal etmiyordu (sonda: bulundu=false ×3).
// Çözüm: okuma ve yazma tek bir ref üzerinden. Ref her çizimde state'e eşitlenir, bu fonksiyonların
// yazması da onu ANINDA günceller (çizim beklenmez). State güncellemeleri fonksiyonlu: başka bir yolun
// (açılış yüklemesi, otomatik defter) araya giren değişikliği ezilmez. Fonksiyonlar artık `fisDefteri`ne
// bağımlı değil — kararlı; eski bir kopyası çağrılsa bile güncel defteri görür.
const defterRef = useRef(fisDefteri);
defterRef.current = fisDefteri;

// Tek kayıt ekle; başarısızsa YALNIZ o kaydı geri çıkar.
const kayitEkleVeYaz = useCallback(async (kayit) => {
  const next = [kayit, ...(defterRef.current || [])];
  defterRef.current = next;
  setFisDefteri((onceki) => [kayit, ...(onceki || []).filter((k) => k !== kayit)]);
  try {
    await tekilYaz(FIS_DEFTERI_ANAHTAR, "fis_defteri", next);
    return true;
  } catch (e) {
    // Yerel yazma da başarısızsa (depo dolu) işlem gerçekten yapılamaz. Geri alınan yalnız BU kayıt:
    // bekleme sırasında yazılan başka fişler yerinde kalır.
    defterRef.current = (defterRef.current || []).filter((k) => k !== kayit);
    setFisDefteri((onceki) => (onceki || []).filter((k) => k !== kayit));
    // Bekleme sırasında başka bir yazma (başka fiş, iptal) bu kaydı İÇEREN tam defteri depoya
    // yazmış olabilir: yan etkileri hiç uygulanmamış bir fiş defterde kalırdı. Geri alınmış hâl
    // yazılır; depo tümden bozuksa bu da düşer ve hata zaten bildirildi.
    yazimiIzle(tekilYaz(FIS_DEFTERI_ANAHTAR, "fis_defteri", defterRef.current), "Fiş defteri", defterRef.current);
    kaydetmeHatasiBildir(e, "Fiş defteri", next);
    showToast("Fiş kaydedilemedi — hiçbir değişiklik yapılmadı");
    return false;
  }
}, [kaydetmeHatasiBildir, showToast]);

const fisDefterineKayitYaz = useCallback(async (kayit) => {
  if (fisDefterindeVarMi(defterRef.current, kayit.fisNo)) {
    showToast(`${kayit.fisNo} zaten kayıtlı — fiş iki kez yazılmaz`);
    return false;
  }
  return kayitEkleVeYaz(kayit);
}, [kayitEkleVeYaz, showToast]);

const fisDefterineYaz = useCallback(async (fis, sonuc) => {
  if (fisDefterindeVarMi(defterRef.current, fis.fisNo)) {
    // Aynı numara ikinci kez: çift tıklama ya da yeniden deneme. Sessizce geçmek mükerrer
    // hareket demek; reddetmek doğrusu. (Ref sayesinde aynı çizimdeki ikinci tıklama da görülür.)
    showToast(`${fis.fisNo} zaten kayıtlı — fiş iki kez yazılmaz`);
    return false;
  }
  const kayit = fisDefterKaydiKur(fis, sonuc, { kullanici: (aktifKullanici && aktifKullanici.ad) || "" });
  return kayitEkleVeYaz(kayit);
}, [aktifKullanici, kayitEkleVeYaz, showToast]);

// Fiş geri alınınca defterde İPTAL işaretlenir (silinmez). Arka arkaya çağrılabilir
// (`forEach`): her çağrı bir öncekinin sonucunun üzerine kurar.
const fisDefterindeIptal = useCallback((fisNo) => {
  const { defter, bulundu } = fisDefterindeIptalEt(defterRef.current, fisNo);
  if (!bulundu) return;
  defterRef.current = defter;
  // State'e AYNI iptal zamanı yazılır (bulutla bellek aynı kaydı taşısın).
  const iptalZamani = (defter.find((x) => x.fisNo === fisNo && x.iptal) || {}).iptalZamani;
  setFisDefteri((onceki) => (onceki || []).map((x) =>
    (x.fisNo === fisNo && !x.iptal ? { ...x, iptal: true, iptalZamani } : x)));
  yazimiIzle(tekilYaz(FIS_DEFTERI_ANAHTAR, "fis_defteri", defter), "Fiş defteri", defter);
}, []);

  return { fisDefterineKayitYaz, fisDefterineYaz, fisDefterindeIptal };
}
