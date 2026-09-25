// ================= ONAY SİSTEMİ =================
//
// 19 Eylül (2. madde, 13. tur): yetkisi olmayan kullanıcının hassas işlemini (silme, düzenleme)
// doğrudan uygulamak yerine yöneticinin onayına düşüren mekanizma.
//
// NEDEN İŞLEM TİPİ + PARAMETRE SAKLANIYOR, FONKSİYON DEĞİL: onay bir sonraki açılışta da
// karşılanabilmeli. Bir kapanış (closure) saklanamaz, uygulama kapanınca kaybolur. Bu yüzden
// "ne yapılacağı" tip ve parametre olarak yazılıyor; onaylandığında o tipe karşılık gelen iş
// yeniden kuruluyor.
//
// ONAY BEKLEYEN İŞ YAPILMIŞ SAYILMAZ: istek düşer, kullanıcıya söylenir, ekranda hiçbir şey
// değişmez. "Sanki oldu" göstermek, iki kişinin farklı gerçeğe bakması demekti.
//
// `islerRef`: silme zincirleri App'te bu hook'tan SONRA tanımlanıyor. Doğrudan parametre almak
// yerine ref üzerinden çağrılıyorlar — tanım sırası artık bir bağımlılık değil.
function useOnaySistemi(d) {
  const { onaylar, setOnaylar, aktifKullanici, showToast, siparisler, setSiparisler, islerRef } = d;
  const [onayliIslem, setOnayliIslem] = useState(null);

const onaySave = useCallback((next) => {
  setOnaylar(next);
  yazimiIzle(tabloYaz("onaylar:data", "onaylar", next), "Onaylar", next);
}, []);

// Yetkisi olmayan bir kullanıcı hassas bir işlem (silme/düzenleme) yapmaya çalıştığında, işlemi
// DOĞRUDAN uygulamak yerine yöneticinin onayına düşürür. `uygula` fonksiyonu, onaylandığında
// gerçekten çalıştırılacak asıl işlemdir (parametresiz bir kapanış/closure olarak saklanamayacağı
// için, onay kaydına işlemi YENİDEN ÇALIŞTIRABİLECEK bir "tip" ve "parametreler" bilgisi yazılır).
function onayIste(modul, islemTipi, aciklama, uygulaTipi, uygulaParametreleri) {
  const yeni = {
    id: uid("onay"),
    kullaniciId: aktifKullanici ? aktifKullanici.id : null,
    kullaniciAd: aktifKullanici ? aktifKullanici.ad : "Bilinmeyen",
    modul, islemTipi, aciklama, uygulaTipi, uygulaParametreleri,
    tarih: new Date().toISOString(),
    durum: "Bekliyor",
  };
  onaySave([yeni, ...onaylar]);
  showToast("Bu işlem için yönetici onayı istendi");
}

// Muhasebe silme işlemlerinin GERÇEK mantığı (kasa/banka hareketinin cari tarafındaki karşılığını
// da bulup temizlemek dahil) MuhasebeModule içinde yaşıyor. Onaylandığında o mantığı BURADA
// yeniden yazmak, iki kopyanın zamanla birbirinden ayrılması demek olurdu. Bunun yerine onaylanan
// işlem bir "görev" olarak modüle iletilir; modül kendi fonksiyonuyla uygular ve görevi kapatır.
const [muhasebeOnayliIslem, setMuhasebeOnayliIslem] = useState(null);

// Onaylanan bir isteğin GERÇEK işlemini çalıştırır. Yeni bir onay-gerektiren işlem türü eklendikçe
// buraya yeni bir "case" eklenir.
function onayUygula(istek) {
  const { uygulaTipi: tip, uygulaParametreleri: p } = istek;
  if (tip === "urunSil") {
    islerRef.current.urunSilCascade(p.productId);
  } else if (tip === "cariSil") {
    islerRef.current.cariSilCascade(p.cariId);
  } else if (tip === "siparisSil") {
    // Onay yoluyla silme de çöpe düşer — yetkisiz kullanıcının isteği onaylandığında kaydın
    // izsiz kaybolması, doğrudan silmeye göre DAHA az denetlenebilir bir sonuç doğururdu.
    const silinecek = siparisler.find((x) => x.id === p.siparisId);
    if (silinecek) {
      islerRef.current.copaAt("siparis", `${silinecek.tip} ${silinecek.siparisNo}`, silinecek, {
        ozet: `${(silinecek.kalemler || []).length} kalem — durum: ${silinecek.durum} (onayla silindi)`,
        yanEtkiliMi: false,
      });
    }
    const nextSiparisler = siparisler.filter((x) => x.id !== p.siparisId);
    setSiparisler(nextSiparisler);
    yazimiIzle(tabloYaz("siparis:data", "siparisler", nextSiparisler), "Siparişler", nextSiparisler);
  } else if (tip === "uretimSil") {
    islerRef.current.uretimSil(p.uretimId, p.cascade);
  } else if (tip === "muhasebeHareketSil" || tip === "muhasebeHesapSil" || tip === "muhasebeCekSil") {
    // nonce: aynı işlem iki kez onaylanırsa (ya da aynı parametrelerle tekrar gelirse) useEffect'in
    // bunu YENİ bir görev olarak görmesi için. Referans eşitliği yeterli olmazdı.
    setMuhasebeOnayliIslem({ tip, ...p, nonce: Date.now() });
  }
}

function onayaKarar(onayId, kararVer) {
  const istek = onaylar.find((o) => o.id === onayId);
  if (!istek) return;
  if (kararVer === "Onaylandı") onayUygula(istek);
  onaySave(onaylar.map((o) => (o.id === onayId ? { ...o, durum: kararVer, kararTarihi: new Date().toISOString() } : o)));
  showToast(kararVer === "Onaylandı" ? "İşlem onaylandı ve uygulandı" : "İşlem reddedildi");
}

// "Kaydedilemedi, tekrar deneyin" mesajı, sorunu ÇÖZMEK için hiçbir bilgi vermiyordu — üstelik
// "tekrar deneyin" yanlış yönlendirmeydi: boyut aşımında tekrar denemek hiçbir zaman işe yaramaz.
// Bu fonksiyon hatanın gerçek sebebini ve ne yapılması gerektiğini söyler.



  return {
    onaySave, onayIste, onayUygula, onayaKarar, onayliIslem, setOnayliIslem,
    muhasebeOnayliIslem, setMuhasebeOnayliIslem,
  };
}
