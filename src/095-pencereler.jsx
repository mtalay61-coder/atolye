// ================= PENCERE SİSTEMİ =================
//
// 19 Eylül (2. madde): `100-app.jsx` 7.758 satırdı ve her değişiklik oraya dokunuyordu. Tek
// dosyada çok iş olması, bu projede somut hatalara yol açtı (Adım 3'te yan etkilerin yarım
// kalması, v1.337'de yanlış yerin düzeltilmesi). Bölme işi buradan başlıyor.
//
// Pencere sistemi ilk aday, çünkü DIŞARIYA BAĞIMLILIĞI YOK: kendi state'i, kendi kuralları.
// App yalnız sonucu kullanıyor (`usePencereler()`).
//
// KURAL: bir kayıt için tek pencere. Aynı ürün ikinci kez açılırsa yeni pencere açılmıyor, var
// olan öne getiriliyor — yoksa aynı kartın iki kopyası düzenlenip biri diğerini eziyordu.
// ================= YENİLEMEDE EKRAN KORUNUYOR (25 Eylül, v1.448.0) =================
//
// Kullanıcı: "Sayfayı yenilediğimizde her şeyi kapatıp ana sayfaya alıyor. Yenilemeyi aslında
// açılan yeni renk vs. güncellensin diye yapıyorum."
//
// Yenileme veriyi buluttan TAM ve temiz okuyor (açılış yüklemesi, fark belleği, bekleyen yazma
// kuralları) — veriyi sayfa açıkken yerinde tazelemek o kuralların hepsini ikinci bir yoldan
// kurmak demekti, riskli. Onun yerine yenilemeden ÖNCEKİ ekran geri getiriliyor: açık modül
// sekmeleri, etkin sekme ve CANLI pencereler.
//
// CANLI PENCERE = kaydın yalnız kimliğini tutan ve her çizimde güncel veriden kurulan pencere
// (ürün, üretim, sipariş). Açıldığı andaki verinin KOPYASINI taşıyanlar (reçete, maliyet, fiş,
// ekstre, satın al, fiş taslağı) geri getirilmiyor: yenilemeden sonra ESKİ veriyi gösterirlerdi —
// yenilemenin amacının tam tersi. Silinmiş kaydın penceresi yükleme bitince ayıklanıyor (100-app).
//
// sessionStorage: sekmeye özel ve sekme kapanınca siliniyor. Yeni açılış ana sayfadan başlar;
// yalnız YENİLEME (ve otomatik sürüm geçişi) kaldığı yerden devam eder. Çıkışta siliniyor.
const ARAYUZ_ANAHTARI = "arayuz:durum";
const CANLI_PENCERE_TIPLERI = ["urun", "uretim", "siparis"];

function arayuzDurumuOku() {
  try {
    const d = JSON.parse(window.sessionStorage.getItem(ARAYUZ_ANAHTARI) || "null");
    if (!d || typeof d.tab !== "string" || !Array.isArray(d.acikSekmeler)) return null;
    const acikSekmeler = d.acikSekmeler.includes("anasayfa") ? d.acikSekmeler : ["anasayfa", ...d.acikSekmeler];
    const pencereler = (Array.isArray(d.pencereler) ? d.pencereler : []).filter((p) => p && CANLI_PENCERE_TIPLERI.includes(p.tip) && p.kayitId);
    return {
      tab: acikSekmeler.includes(d.tab) ? d.tab : "anasayfa",
      acikSekmeler,
      sekmeGecmisi: Array.isArray(d.sekmeGecmisi) ? d.sekmeGecmisi.filter((k) => acikSekmeler.includes(k)) : [d.tab],
      pencereler,
      aktifPencereId: pencereler.some((p) => p.id === d.aktifPencereId) ? d.aktifPencereId : null,
    };
  } catch (e) {
    return null;   // bozuk kayıt ya da depo kapalı: ana sayfadan açılır
  }
}

function arayuzDurumuYaz({ tab, acikSekmeler, sekmeGecmisi, acikPencereler, aktifPencereId }) {
  const pencereler = acikPencereler
    .filter((p) => CANLI_PENCERE_TIPLERI.includes(p.tip))
    // `gelinen` taşınmıyor: geldiği pencere kopya taşıyan türdense geri gelmeyecek.
    .map((p) => ({ id: p.id, tip: p.tip, kayitId: p.kayitId, baslik: p.baslik, veri: p.veri || {}, gelinen: null }));
  try {
    window.sessionStorage.setItem(ARAYUZ_ANAHTARI, JSON.stringify({
      tab, acikSekmeler, sekmeGecmisi, pencereler,
      aktifPencereId: pencereler.some((p) => p.id === aktifPencereId) ? aktifPencereId : null,
    }));
  } catch (e) { /* depo kapalı: yenilemede ana sayfa — eski davranış */ }
}

function arayuzDurumuSil() {
  try { window.sessionStorage.removeItem(ARAYUZ_ANAHTARI); } catch (e) { /* yok say */ }
}

function usePencereler(baslangic) {
const [acikPencereler, setAcikPencereler] = useState(() => (baslangic ? baslangic.pencereler : [])); // [{id, tip, baslik, veri}]
const [aktifPencereId, setAktifPencereId] = useState(() => (baslangic ? baslangic.aktifPencereId : null));
// Açık ürün pencerelerinin ürün kimlikleri. Dizi kimliği her render'da değişmesin diye bellekte.
const acikUrunIdleri = React.useMemo(
  () => acikPencereler.filter((p) => p.tip === "urun").map((p) => p.kayitId),
  [acikPencereler]
);
const acikUretimIdleri = React.useMemo(
  () => acikPencereler.filter((p) => p.tip === "uretim").map((p) => p.kayitId),
  [acikPencereler]
);
const acikSiparisPencereleri = React.useMemo(
  () => acikPencereler.filter((p) => p.tip === "siparis"),
  [acikPencereler]
);

// `gelinen`: bu pencere hangi pencereden açıldıysa onun kimliği. Kapatılınca oraya dönülüyor
// (bkz. `pencereKapat`) — kullanıcı (10 Eylül): "gidiş geçişlerinde bağla, kapatınca geri
// ekrana gelsin".
const pencereAc = useCallback((tip, id, baslik, veri, gelinen) => {
  const pencereId = `${tip}-${id}`;
  // Aynı ID'li pencere ZATEN açıksa, önceden SADECE aktif hale getirilip veri hiç GÜNCELLENMİYORDU —
  // bu, örneğin bir cariye hareket ekledikten SONRA "Ekstre Yazdır"a tekrar basıldığında, ekstrenin
  // BAYAT (eski) veriyle açılmasına yol açıyordu (yeni hareket hiç görünmüyordu). Artık pencere zaten
  // açık olsa bile, `veri` ve `baslik` HER ZAMAN en güncel haliyle üzerine yazılıyor.
  setAcikPencereler((prev) =>
    prev.some((p) => p.id === pencereId)
      // `gelinen` YALNIZ VERİLDİYSE yazılıyor: aynı pencere başka bir yerden yeniden
      // açıldığında eski geliş yolunu silmemek için.
      ? prev.map((p) => (p.id === pencereId ? { ...p, baslik, veri, gelinen: gelinen || p.gelinen } : p))
      // `kayitId`: pencerenin gösterdiği kaydın KENDİ kimliği. Şerit sekmesi eskiden pencere
      // kimliğini (`siparis-s1`) kayıt kimliği gibi kullanıyordu; hiçbir kayıtla eşleşmiyordu.
      : [...prev, { id: pencereId, tip, kayitId: id, baslik, veri, gelinen: gelinen || null }]
  );
  setAktifPencereId(pencereId);
}, []);

const pencereKapat = useCallback((pencereId) => {
  setAcikPencereler((prev) => {
    const kapanan = prev.find((p) => p.id === pencereId);
    const next = prev.filter((p) => p.id !== pencereId);
    setAktifPencereId((aktif) => {
      if (aktif !== pencereId) return aktif;
      // NEREDEN GELİNDİYSE ORAYA DÖNÜLÜYOR (kullanıcı, 10 Eylül: "gidiş geçişlerinde bağla,
      // kapatınca geri ekrana gelsin").
      //
      // Önceden LİSTENİN SONUNCU penceresine dönülüyordu — açılış sırası, geliş yolu değil.
      // Siparişten fiş açılıp fiş kapatıldığında araya başka bir pencere girdiyse kullanıcı
      // hiç ilgisi olmayan bir ekranda buluyordu kendini.
      //
      // `gelinen` hâlâ AÇIKSA oraya dönülüyor; kapanmışsa eski davranış (son pencere) geçerli.
      if (kapanan && kapanan.gelinen && next.some((p) => p.id === kapanan.gelinen)) {
        return kapanan.gelinen;
      }
      return next.length > 0 ? next[next.length - 1].id : null;
    });
    return next;
  });
}, []);

// "−" (küçültme): pencereyi LİSTEDEN SİLMEZ, sadece o an görünen içeriği gizler (aktifPencereId'yi
// boşaltır). Sekme çubuğunda kalmaya devam eder, tıklanınca kaldığı yerden geri açılır.
const pencereKucult = useCallback(() => setAktifPencereId(null), []);

  return {
    acikPencereler, setAcikPencereler, aktifPencereId, setAktifPencereId,
    acikUrunIdleri, acikUretimIdleri, acikSiparisPencereleri,
    pencereAc, pencereKapat, pencereKucult,
  };
}
