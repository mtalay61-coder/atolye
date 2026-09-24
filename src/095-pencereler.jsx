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
function usePencereler() {
const [acikPencereler, setAcikPencereler] = useState([]); // [{id, tip, baslik, veri}]
const [aktifPencereId, setAktifPencereId] = useState(null);
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
