// sabitTip: "Satış" | "Alış". Verildiğinde modül tek tarafa kilitlenir ve iç sekme çubuğu
// gösterilmez — sol menüde zaten ayrı iki giriş var, ikinci bir sekme katmanı gereksiz tekrar olurdu.
function SiparisModule({ onSiparisGitGlobal, mobilBolumAyari, onFiseGitNo, sabitTip, siparisler, onSave, showToast, cariler, stok, stokRezervasyonlari, uretim, onGoToCari, onGoToUretim, onGerceklestir, onSatisFisiAc, onSilCascade, onCopaAt, onPlanlaUretim, onPlanlaSatinAlma, onPlanlamaTemizle, asortiler, hedefSiparisId, onHedefTuketildi, hedefYeniAlis, onYeniAlisTuketildi, onAsortiOlustur, firmaBilgileri, onPencereAc, aktifPencereId, onPencereKapat, onPencereKucult, acikSiparisPencereleri, onUruneGit, onModelRengiVeRecete, onYeniRenkKaydet, tanimlarRenkler, tanimlarBedenler, tanimlarOzelKodAlanlari, kurlar , koliler, raporlar, onRaporlarKaydet, aktifKullanici, tanimlarProsesler, tanimlarAraProsesler }) {
  // RAPORLAR SEKMESİ (kullanıcı, 12 Eylül: "her modülün içine sekme olarak rapor"). Liste ile
  // raporlar aynı ekranda yan yana durmasın diye üst sekme; motor 245-rapor'da, burada yalnız
  // sipariş kalemleri düz satıra çevriliyor.
  const [ustSekme, setUstSekme] = useState("liste"); // "liste" | "raporlar"
  // sabitTip verilmişse sekme ona kilitlenir; setSiparisSekme çağrıları etkisiz kalır.
  const [siparisSekmeSerbest, setSiparisSekmeSerbest] = useState("satis");
  const siparisSekme = sabitTip ? (sabitTip === "Alış" ? "alis" : "satis") : siparisSekmeSerbest;
  const setSiparisSekme = sabitTip ? (() => {}) : setSiparisSekmeSerbest;
  const [durumFiltre, setDurumFiltre] = useState("Bekliyor");
  const [siparisArama, setSiparisArama] = useState("");
  // Alan bazlı filtre. Üstteki genel arama kutusu "her yerde ara" yapar; bu şerit ise her kutunun
  // KENDİ alanında arar — "cari adında Ahmet geçen" ile "notunda Ahmet geçen" ayrımı burada kurulur.
  const [siparisKolonFiltre, setSiparisKolonFiltre] = useState({ no: "", cari: "", tarih: "" });
  const siparisKolonAktif = Object.values(siparisKolonFiltre).some((v) => String(v).trim() !== "");
  const [acikSiparisId, setAcikSiparisId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  // VAR OLAN SİPARİŞE KALEM EKLEME. Karta ayrı bir kalem formu yazmak yerine, ZATEN OLAN form
  // hedefe yönlendiriliyor: ürün seçici, asorti uygulama, barkod okutma, fiyat bulma, ölçü
  // matrisi — hepsi burada. İkinci bir form, ayrışacak ikinci bir form demekti.
  // Dolu olduğunda "Siparişi Kaydet" yerine "Bu Siparişe Ekle" çalışıyor.
  // DÜZENLENEN SİPARİŞ (25 Eylül): doluysa form yeni sipariş değil, bu siparişin düzenlemesi.
  const [duzenlenenId, setDuzenlenenId] = useState(null);
  const [tip, setTip] = useState("Satış");
  const [cariId, setCariId] = useState("");
  const [tarih, setTarih] = useState(bugunYerel());
  const [teslimTarihi, setTeslimTarihi] = useState("");
  const [not, setNot] = useState("");
  const [siparisDefter, setSiparisDefter] = useState("Genel"); // "Genel" | "Resmi" | "Muhasebe"
  const [musteriKodu, setMusteriKodu] = useState(""); // Müşteri/tedarikçinin kendi verdiği referans kodu — sipariş no'nun YERİNE değil, YANINDA tutulur.
  // Siparişin ambalajı (kutu). { urunId, renk } — ikisi de boşsa reçetedeki varsayılan kutu geçerlidir.
  // Kutu tercihi KALEM bazındadır. Yalnızca renk tutulur — hangi ambalaj ürünü olduğu reçeteden
  // gelir ve değişmez. (Sipariş seviyesindeki eski alan kaldırıldı; iki seviyeyi birlikte tutmak
  // "hangisi geçerli?" belirsizliği yaratıyordu.)
  const [kAmbalajRenk, setKAmbalajRenk] = useState("");
  // Tam ekran açılan sipariş. Liste içindeki önizlemeden AYRI tutulur: biri salt-okunur bakış,
  // diğeri üzerinde çalışılan ekran.
  // TAM EKRAN SİPARİŞLER — tek kaynak pencere yöneticisi (bkz. StokModule, kullanıcı 11 Eylül:
  // "üst sekmeler düzgün çalışmıyor"). Eskiden modül tek bir `tamEkranSiparisId` tutuyordu; iki
  // sipariş sekmesi açıkken şeritten öncekine dönülünce kart çizilmiyordu.
  //
  // Satış ve Alış bu modülün İKİ AYRI kopyası (sabitTip). Pencere hangi kopyadan açıldıysa o kopya
  // çiziyor (`veri.sahipTip`): ikisi birden çizseydi aynı sipariş iki ayrı kartta, iki ayrı
  // yarım girişle dururdu. Şerit sekmesi de kullanıcıyı o kopyanın ekranına götürüyor.
  const tamEkranAc = (siparisId, baslik) => {
    if (onPencereAc) onPencereAc("siparis", siparisId, baslik, { sahipTip: sabitTip || null });
  };
  // Sipariş ekranından yeni renk ekleme paneli.
  const [yeniRenkPaneli, setYeniRenkPaneli] = useState(false);
  const [yrRenkSayisi, setYrRenkSayisi] = useState(1);
  const [yrPozisyonlar, setYrPozisyonlar] = useState({}); // { pozisyonNo: renkId }
  const [yrKaynakRenk, setYrKaynakRenk] = useState("");
  // Pozisyon kutularında yazılan metin (v1.469.0); seçim `yrPozisyonlar`da kimlikle.
  const [yrPozisyonYazi, setYrPozisyonYazi] = useState({});
  const [yrHammaddeRenkleri, setYrHammaddeRenkleri] = useState({});
  // Panel içinden yeni mamul rengi oluşturma: hangi pozisyon için ve hangi ad.
  const [yrYeniPozisyon, setYrYeniPozisyon] = useState(null);
  const [yrYeniAd, setYrYeniAd] = useState("");
  // Oluşturulmuş ama henüz listeye düşmemiş renk adları: { pozisyonNo: ad }
  const [yrBekleyenAdlar, setYrBekleyenAdlar] = useState({}); // receteSatirId -> yeni hammadde rengi
  const [kayitParaBirimi, setKayitParaBirimi] = useState(null); // Fiş toplamının hangi para biriminde takip edileceği (opsiyonel).
  const [kayitKurlari, setKayitKurlari] = useState({});
  const [kalemler, setKalemler] = useState([]);
  // Asorti barkodu okutma kutusu (fuar akışı).
  const [barkodGirisi, setBarkodGirisi] = useState("");
  // BARKOD PANELİ KATLANIR (v1.470.0 — kullanıcı: "barkod okutu da tıklayınca açılsın, kullanmayınca
  // çok yer kaplıyor"). Kapalıyken tek ince düğme. Son tercih bu cihazda hatırlanıyor: fuarda
  // okutarak çalışan açık bırakır, elle giren kapalı — her sipariş açılışında yeniden tıklamasın.
  const [barkodPaneli, setBarkodPaneli] = useState(() => {
    try { return window.localStorage.getItem("siparis:barkodPaneli") === "acik"; } catch (e) { return false; }
  });
  const barkodPaneliDegistir = (acik) => {
    setBarkodPaneli(acik);
    try { window.localStorage.setItem("siparis:barkodPaneli", acik ? "acik" : "kapali"); } catch (e) { /* özel pencere: yalnız bu oturum */ }
  };

  const [kUrunId, setKUrunId] = useState("");
  // FOTOĞRAFTAN ÜRÜN TANIMA (24 Eylül, v1.439.0 — kullanıcı: "kamera ile ürün okuma da olsun,
  // barkodsuz ürünün fotoğrafından ürünün ne olduğunu tanısın"). Paketlemedeki (315) ve stok
  // kartındaki (152) ile AYNI bileşen: karşılaştırma KULLANICININ KENDİ ürün görselleriyle,
  // cihazın içinde yapılıyor — dışarıya hiçbir şey gitmiyor, uydurma ürün üretilemez.
  const [fotoAcik, setFotoAcik] = useState(false);
  const [kRenk, setKRenk] = useState("");
  // Renk kutusunda YAZILAN metin (v1.469.0): seçim `kRenk`, yazı bu. Dışarıdan değişen seçim
  // (barkod, ürün değişimi, kalem eklendikten sonra sıfırlama) kutuya yansıtılıyor; yarım yazım
  // (listede olmayan) seçimi boşaltır ama yazıyı silmez.
  const [kRenkYazi, setKRenkYazi] = useState("");
  // Eklenecek kalemin RENK BAZLI notları (v1.470.0 açıklama → v1.476.0 proses bazlı notlar): "Ekle" ile
  // bu ürün+rengin bütün ölçülerine yazılır. `kNotTaslak`: yazılıp "+"lanmamış not (o da eklenir).
  // `kNotAnahtar`: Ekle'den sonra not düzenleyicisini sıfırlamak için (iç yazı durumu temizlensin).
  const [kNotlar, setKNotlar] = useState([]);
  const [kNotTaslak, setKNotTaslak] = useState(null);
  const [kNotAnahtar, setKNotAnahtar] = useState(0);
  const oncekiKRenk = useRef("");
  useEffect(() => {
    const onceki = oncekiKRenk.current;
    oncekiKRenk.current = kRenk;
    // Seçim geldiyse kutuya yazılır; seçim DIŞARIDAN boşaldıysa (kutuda hâlâ eski renk yazıyor)
    // kutu da boşalır. Yazarken boşalan seçimde kutudaki yarım metin korunur.
    setKRenkYazi((y) => (kRenk ? kRenk : (y === onceki ? "" : y)));
  }, [kRenk]);
  const [kMiktarlar, setKMiktarlar] = useState({}); // { beden: miktarString }

  useEffect(() => {
    if (!hedefSiparisId) return;
    const hedef = siparisler.find((s) => s.id === hedefSiparisId);
    if (hedef) {
      setSiparisSekme(hedef.tip === "Alış" ? "alis" : "satis");
      // DURUM SÜZGECİ HEDEFİ GİZLİYORDU (kullanıcı ekran görüntüsüyle bildirdi, 10 Eylül).
      //
      // Süzgeç varsayılan "Bekliyor"da kalıyor; hedef sipariş "Tamamlandı" ise ekran açılıyor ama
      // liste BOŞ görünüyordu: "Bu filtre/aramayla eşleşen alış siparişi yok." Kullanıcı doğru
      // yere geldiğini bile anlamıyordu.
      //
      // TÜMÜ + ARAMAYA SİPARİŞ NO (kullanıcı, 10 Eylül: "tümünü açıp arama ekranına o sipariş no
      // yazsa daha sade olur; şu anda hepsini gösteriyor, aşağıda kalabiliyor").
      //
      // Önce hedefin KENDİ durumu seçiliyordu; o durumda onlarca sipariş olabiliyor ve hedef
      // listenin altında kayboluyordu. Süzgeç yerine ARAMA kullanılıyor: tek sipariş kalıyor,
      // kullanıcı aramayı silince tam listeye dönüyor. Fişler ekranındaki (v1.217.0) yol.
      setDurumFiltre("Tümü");
      setSiparisArama(hedef.siparisNo || "");
      setAcikSiparisId(hedefSiparisId);
      if (onHedefTuketildi) onHedefTuketildi();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hedefSiparisId]);
  const [kFiyat, setKFiyat] = useState("");
  const [kParaBirimi, setKParaBirimi] = useState("TRY");

  // DEPO'DAN GELEN ALIŞ TASLAĞI — Depo matrisindeki "Alış Fişi" butonu buraya düşer.
  // Yeni bir ekran tasarlanmadı: var olan alış formu, kalem girişi ÖN DOLGULU açılıyor.
  // Kalem otomatik EKLENMİYOR — miktar ve fiyat tedarikçiye göre değişir; kullanıcı görüp
  // gerekirse değiştirerek "Kalemlere Ekle" der. Otomatik eklemek, yanlış miktarın fark
  // edilmeden fişe girmesi demekti.
  useEffect(() => {
    if (!hedefYeniAlis) return;
    const bitir = () => { if (onYeniAlisTuketildi) onYeniAlisTuketildi(); };
    const p = (stok || []).find((x) => x.id === hedefYeniAlis.urunId);
    if (!p) {
      if (showToast) showToast("Ürün bulunamadı — stok kartı silinmiş olabilir");
      bitir();
      return;
    }
    setTip("Alış");
    setShowForm(true);
    setKUrunId(p.id);
    setKRenk(hedefYeniAlis.renk || "");
    setKMiktarlar(hedefYeniAlis.miktarlar || {});
    const { fiyat } = fiyatBul(p, hedefYeniAlis.renk || null, null, cariId, "Alış", cariler);
    setKFiyat(String(fiyat || ""));
    // Cari DOLUYSA dokunulmuyor: kullanıcı bilinçli bir tedarikçi seçmiş olabilir; onu ezmek
    // sessizce yanlış cariye kayıt açardı. urunSec içinde de aynı kural geçerli.
    if (!cariId && p.tedarikciId) {
      const ted = (cariler || []).find((c) => c.id === p.tedarikciId && !c.pasif);
      if (ted) setCariId(ted.id);
    }
    // Form listenin altında; ekranın dışında kalırsa buton çalışmamış sanılır.
    setTimeout(() => {
      const el = typeof document !== "undefined" ? document.getElementById("siparis-yeni-form") : null;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    bitir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hedefYeniAlis]);


  const cariUygun = cariler.filter((c) => c.tip === (tip === "Satış" ? "Müşteri" : "Tedarikçi") || c.tip === "Her İkisi");
  const urunUygun = tip === "Satış" ? stok.filter((p) => p.kategori === "Mamul") : stok;
  const seciliUrun = urunUygun.find((p) => p.id === kUrunId);
  // Liste artık STOKTAKİ TÜM ambalaj renkleri değil, bu modelin reçetesinde izin verilenler.
  // Kullanıcı reçetede o satır için hangi renkleri işaretlediyse siparişte onlar çıkıyor;
  // işaretlemediyse o hammaddenin tüm renkleri. Reçetede değişken ambalaj yoksa liste boş kalır
  // ve alan hiç gösterilmez — seçilecek bir şey olmadığında soru sormanın anlamı yok.
  const kAmbalajRenkleri = ambalajRenkSecenekleri(seciliUrun, stok);
  const renkSecenekleri = seciliUrun ? Array.from(new Set(seciliUrun.variants.map((v) => v.renk))) : [];
  // TEK SEÇENEK SORULMAZ (23 Eylül, v1.432.0) — fiş ekranındaki (255) kuralın aynısı: tek renk
  // varsa kendiliğinden seçilir; o renk "Standart" (renksiz yer tutucu) ise alan hiç çizilmez.
  // RENKSİZ ÜRÜN GENİŞ TANIMLI (26 Eylül, v1.478.0 — kullanıcı: "renk olmadığı için alış giremiyorum,
  // renksiz stoklarda renk seçici açılmayacak"). Yalnız tek rengi tam "Standart" olan ürün renksiz
  // sayılıyordu; rengi BOŞ ("") kaydedilmiş ya da HİÇ varyantı olmayan ürün (renk/beden seçmeden
  // açılan hammadde) renk kutusunu boş gösteriyor, kutu boş kalınca miktar da açılmıyordu. Artık bütün
  // renk değerleri yer tutucuysa (`olcuGoster` boş) ya da hiç yoksa renk sorulmaz; renk kendiliğinden
  // seçilir (varyant yoksa "Standart" — fiş yazımı eksik varyantı kendisi açıyor, bkz. 078-fisyaz).
  const renksizUrun = !!seciliUrun && renkSecenekleri.every((r) => !olcuGoster(r));
  // Boş renk "Standart" olarak seçilir: boş dize "seçilmedi" sayılıyor ve miktar kutularını kapatıyordu;
  // varyant eşleşmesi `stokAnahtarNrm` ile ("" = "Standart").
  const tekRenk = renksizUrun ? "Standart" : (renkSecenekleri.length === 1 ? renkSecenekleri[0] : "");
  const renkSorulmaz = renksizUrun;
  useEffect(() => {
    if (tekRenk && kRenk !== tekRenk) { setKRenk(tekRenk); setKMiktarlar({}); }
  }, [tekRenk]);   // eslint-disable-line react-hooks/exhaustive-deps
  // BEDENLER KÜÇÜKTEN BÜYÜĞE.
  //
  // Varyantlar EKLENME sırasında duruyor; kullanıcı 40'ı önce eklediyse sipariş formunda sütunlar
  // "40 36 37 38 39" diye çıkıyordu. Beden bir SIRA ifade eder; ekleme sırası değil sayısal sıra
  // beklenir. `bedenSirala` sayıyı sayı gibi sıralıyor ("10" > "9"), sayısal olmayanları
  // (S/M/L gibi) alfabetik bırakıyor.
  // Varyantı hiç olmayan renksiz üründe tek bir "Standart" kutusu (v1.478.0, fiş ekranıyla aynı).
  const bedenSecenekleri = seciliUrun
    ? (() => {
        const l = bedenSirala(Array.from(new Set(seciliUrun.variants.filter((v) => stokAnahtarNrm(v.renk) === stokAnahtarNrm(kRenk)).map((v) => v.beden))));
        return l.length ? l : (renksizUrun && kRenk ? ["Standart"] : []);
      })()
    : [];

  // Seçili mamul rengin reçetesi var mı? Yeni bir renk eklendiğinde reçete satırları otomatik
  // oluşmaz — o renk için eşleştirme yapılmadan sipariş girilirse hammadde ihtiyacı SIFIR çıkar ve
  // eksik sessizce fark edilmez. Bu yüzden sipariş ekranında, kalem eklenmeden ÖNCE uyarılır.
  const seciliRenkReceteDurumu = (() => {
    if (!seciliUrun || !kRenk || seciliUrun.kategori !== "Mamul") return null;
    const recete = seciliUrun.recete || [];
    if (recete.length === 0) return { durum: "recetesiz", satirSayisi: 0 };
    const buRenk = recete.filter((r) => r.mamulRenk === kRenk);
    if (buRenk.length === 0) return { durum: "renkEksik", satirSayisi: 0 };

    // Renk için satır VAR ama bazı hammaddeler bu renge hiç tanımlanmamış olabilir.
    // Örnek: bağcık yalnızca üç renge eşleştirilmiş, seçilen dördüncü renkte hiç bağcık yok.
    // Bu durumda sipariş girilebilir ama üretimde o hammadde düşmez — sessiz kalmamalı.
    const eksikHammaddeler = receteRenkKapsamEksikleri(seciliUrun, stok)
      .filter((e) => e.eksikRenkler.includes(kRenk))
      .map((e) => e.hammaddeAd + (e.proses ? ` (${e.proses})` : ""));
    if (eksikHammaddeler.length > 0) {
      return { durum: "hammaddeEksik", satirSayisi: buRenk.length, eksikHammaddeler };
    }
    return { durum: "tamam", satirSayisi: buRenk.length };
  })();


  function stokMiktari(urun, renk, beden) {
    if (!urun) return 0;
    // "" ile "Standart" aynı varyant (renksiz ürün, v1.478.0).
    const v = urun.variants.find((x) => stokAnahtarNrm(x.renk) === stokAnahtarNrm(renk) && stokAnahtarNrm(x.beden) === stokAnahtarNrm(beden));
    return v ? v.miktar : 0;
  }

  function resetForm() {
    setCariId(""); setTarih(bugunYerel()); setTeslimTarihi(""); setNot("");
    setKalemler([]); setKUrunId(""); setKRenk(""); setKMiktarlar({}); setKFiyat(""); setKNotlar([]); setKNotTaslak(null); setKNotAnahtar((x) => x + 1); setSiparisDefter("Genel");
    setMusteriKodu(""); setKayitParaBirimi(null); setKayitKurlari({});
    setKAmbalajRenk("");
  }

  // HAVUZ: siparişe girilebilecek ürünlerin görselleri (ürün+renk). Havuzu ÇAĞIRAN belirliyor;
  // burada `urunUygun` zaten tipe göre süzülmüş (alışta hammadde, satışta mamul) — fotoğrafın
  // yanlış listede aranması böylece engelleniyor.
  const fotoHavuzu = (urunUygun || []).flatMap((u) =>
    Array.from(new Set((u.variants || []).map((v) => v.renk))).map((renk) => ({
      urunId: u.id, renk, urunAd: u.ad, etiket: "",
      gorsel: (u.renkResimleri || {})[renk] || u.kapakResmi || null,
    })));

  // SEÇİM ÖNERİDİR: kalem ekleme alanı DOLDURULUYOR, kalem KENDİLİĞİNDEN EKLENMİYOR. Miktarı ve
  // fiyatı kullanıcı görüp onaylıyor — yanlış modeli sessizce siparişe yazmak, hiç önermemekten
  // pahalı olurdu (bileşenin kendi kuralı da bu).
  function fotoSecimi(secim) {
    setFotoAcik(false);
    urunSec(secim.urunId);
    setKRenk(secim.renk);
    showToast(`${secim.urunAd} · ${secim.renk} seçildi — miktarı girip ekleyin`);
  }

  function urunSec(urunId) {
    setKUrunId(urunId);
    setKRenk(""); setKMiktarlar({});
    const p = urunUygun.find((u) => u.id === urunId);
    if (p) {
      const { fiyat } = fiyatBul(p, null, null, cariId, tip, cariler);
      setKFiyat(String(fiyat || ""));

      // ALIŞ siparişinde: ürünün varsayılan tedarikçisi henüz cari seçilmemişse otomatik doldurulur.
      // Zaten bir cari seçiliyse DOKUNULMAZ — kullanıcının bilinçli seçimini ezmek, farklı bir
      // tedarikçiden alım yaparken sessizce yanlış cariye kayıt açardı.
      if (tip === "Alış" && !cariId && p.tedarikciId) {
        const ted = cariler.find((c) => c.id === p.tedarikciId && !c.pasif);
        if (ted) {
          setCariId(ted.id);
          showToast(`Tedarikçi "${ted.unvan}" olarak dolduruldu — ürün kartındaki varsayılan`);
        }
      }
    }
  }


  // Barkod kurmak/çözmek için gereken üç liste; çözücü üçüne birden bakıyor.
  const barkodTanimlari = { renkler: tanimlarRenkler, bedenler: tanimlarBedenler, asortiler };

  // BARKOD OKUTMA — fuar akışı.
  //
  // Kullanıcı: "Sipariş giriş ekranında barkod okut bölümü olsun ve okutulan ürün asorti kadar
  // eklensin. Sonradan asorti katları veya adet düzenlemek için satır düzenlemek de gerekli."
  //
  // Okutma, asortinin BEDEN DAĞILIMINI kalemlere ekliyor (36:1, 37:2, 38:2, 39:2, 40:1 = 8 çift).
  // Aynı kod ikinci kez okutulursa miktarlar ARTIYOR — asorti katı böyle oluşuyor, ayrı bir
  // "kaç kat" kutusuna gerek kalmıyor. Eklenen satırlar normal kalemler; miktarları aşağıdaki
  // listeden tek tek düzenlenebiliyor.
  function asortiBarkodOkut(kod) {
    const temiz = String(kod || "").trim();
    if (!temiz) return;
    const cozum = urunBarkoduCoz(temiz, stok || [], barkodTanimlari);
    if (!cozum) { showToast(`Tanınmayan barkod: ${temiz}`); setBarkodGirisi(""); return; }

    // SEVİYE SEVİYE ne yapılacağı farklı. Renksiz/bedensiz bir kod okutulunca ne ekleneceği belli
    // değil — hangi renk, hangi beden? Kaleme çevirmek yerine sebebi söyleniyor: sessizce yanlış
    // satır yazmaktansa hiç yazmamak doğru.
    if (cozum.seviye === "stok") {
      showToast(`${cozum.urun.ad}: bu kod yalnızca ürünü gösteriyor, renk/beden içermiyor`);
      setBarkodGirisi("");
      return;
    }
    if (cozum.seviye === "renk") {
      showToast(`${cozum.urun.ad} · ${cozum.renk}: bu kod beden içermiyor`);
      setBarkodGirisi("");
      return;
    }

    const fiyat = parseFloat(kFiyat) || cozum.urun.birimFiyat || 0;

    // TEK ÇİFT — 12 haneli kod. Aynı kodu tekrar okutmak miktarı artırıyor; kutuları tek tek
    // okutarak sipariş girmenin yolu bu.
    if (cozum.seviye === "beden") {
      const i = kalemler.findIndex((k) => k.urunId === cozum.urun.id && k.renk === cozum.renk && k.beden === cozum.beden && !kalemKilitSebebi(k));
      if (i >= 0) setKalemler(kalemler.map((k, j) => (j === i ? { ...k, miktar: k.miktar + 1 } : k)));
      else setKalemler([...kalemler, {
        id: uid("kalem"), urunId: cozum.urun.id, urunAd: cozum.urun.ad, renk: cozum.renk,
        beden: cozum.beden, miktar: 1, karsilanan: 0, birim: cozum.urun.birim || "çift",
        birimFiyat: fiyat, paraBirimi: kParaBirimi,
      }]);
      setBarkodGirisi("");
      showToast(`${cozum.urun.ad} · ${cozum.renk} · ${cozum.beden}: 1 eklendi`);
      return;
    }

    if (cozum.dagilim.length === 0) { showToast(`${cozum.urun.ad} · ${cozum.renk}: asortideki bedenler bu üründe yok`); return; }

    let sonraki = [...kalemler];
    cozum.dagilim.forEach((d) => {
      const i = sonraki.findIndex((k) => k.urunId === cozum.urun.id && k.renk === cozum.renk && k.beden === d.beden && !kalemKilitSebebi(k));
      if (i >= 0) sonraki = sonraki.map((k, j) => (j === i ? { ...k, miktar: k.miktar + d.adet } : k));
      else sonraki.push({
        id: uid("kalem"), urunId: cozum.urun.id, urunAd: cozum.urun.ad, renk: cozum.renk,
        beden: d.beden, miktar: d.adet, karsilanan: 0, birim: cozum.urun.birim || "çift",
        birimFiyat: fiyat, paraBirimi: kParaBirimi,
      });
    });
    setKalemler(sonraki);
    setBarkodGirisi("");
    // Üründe olmayan bedenler SESSİZCE atlanmıyor: sipariş eksik girilmiş olacak, kullanıcı bilsin.
    showToast(cozum.eksikBedenler.length
      ? `${cozum.urun.ad} · ${cozum.renk} · ${cozum.asorti.ad}: ${cozum.toplam} çift eklendi — ${cozum.eksikBedenler.join(", ")} bedeni üründe yok`
      : `${cozum.urun.ad} · ${cozum.renk} · ${cozum.asorti.ad}: ${cozum.toplam} çift eklendi`);
  }

  function kalemEkle() {
    if (!seciliUrun || !kRenk) return showToast("Ürün ve renk seçin");
    const fiyat = parseFloat(kFiyat) || 0;
    const notlar = notlariTekille([...kNotlar, ...(kNotTaslak ? [kNotTaslak] : [])]);
    const eklenecekler = bedenSecenekleri
      .map((b) => ({ beden: b, miktar: parseFloat(kMiktarlar[b]) || 0 }))
      .filter((x) => x.miktar > 0);
    if (eklenecekler.length === 0) return showToast("En az bir ölçüye miktar girin");
    // ÖNEMLİ: aynı ürün+renk+beden için "Kalemlere Ekle" birden fazla kez tıklanırsa (örn. kullanıcı
    // butona ard arda basarsa, ya da aynı rengi unutup tekrar eklerse), YENİ bir SATIR eklemek yerine
    // VAR OLAN satırın miktarı ARTIRILIR — aksi halde aynı beden için birbirini tekrar eden onlarca
    // kalem birikir (tam da bu hatanın kaynağı buydu). Birim fiyat/para birimi çakışırsa en SON girilen
    // değer kullanılır.
    let eklenenSayisi = 0;
    let birlestirilenSayisi = 0;
    let sonrakiKalemler = [...kalemler];
    eklenecekler.forEach((x) => {
      const mevcutIndex = sonrakiKalemler.findIndex(
        // Düzenlemede kilitli (planlanmış/teslim alınmış) kalemin miktarı buradan ARTMAZ: yeni satır açılır.
        (k) => k.urunId === seciliUrun.id && k.renk === kRenk && k.beden === x.beden && !kalemKilitSebebi(k)
      );
      if (mevcutIndex >= 0) {
        birlestirilenSayisi++;
        sonrakiKalemler = sonrakiKalemler.map((k, i) =>
          i === mevcutIndex
            // Notlar EKLENİR (eskiler korunur): ikinci "Ekle" miktar artırmak içindir, önce yazılan
            // notu sessizce silmesin.
            ? { ...k, miktar: k.miktar + x.miktar, birimFiyat: fiyat, paraBirimi: kParaBirimi, ambalaj: kAmbalajRenk ? { renk: kAmbalajRenk } : k.ambalaj,
                ...(notlar.length ? { notlar: notlariTekille([...kalemNotlari(k), ...notlar]), aciklama: undefined } : {}) }
            : k
        );
      } else {
        eklenenSayisi++;
        sonrakiKalemler = [
          ...sonrakiKalemler,
          {
            id: uid("kalem"), urunId: seciliUrun.id, urunAd: seciliUrun.ad, birim: seciliUrun.birim,
            renk: kRenk, beden: x.beden, miktar: x.miktar, birimFiyat: fiyat, paraBirimi: kParaBirimi,
            // Kutu tercihi kaleme yazılır. Boşsa alan hiç oluşmaz; "seçildi ama rengi yok" gibi
            // yanıltıcı bir durum kalmasın.
            // urunId tutulmaz: hangi ambalaj ürünü olduğu reçeteden gelir, burada yalnızca renk sapması saklanır.
            ambalaj: kAmbalajRenk ? { renk: kAmbalajRenk } : null,
            // Boşsa alan hiç yazılmıyor (eski kayıtlarla aynı biçim).
            ...(notlar.length ? { notlar } : {}),
          },
        ];
      }
    });
    setKalemler(sonrakiKalemler);
    setKUrunId(""); setKRenk(""); setKMiktarlar({}); setKFiyat(""); setKNotlar([]); setKNotTaslak(null); setKNotAnahtar((x) => x + 1);
    // Kullanıcıya AÇIKÇA geri bildirim: eğer birleştirme olduysa bunu belirtiyoruz — böylece "hiçbir şey
    // olmadı" sanıp tekrar tıklama isteği duyulmaz, tam tersi netlik sağlanır.
    if (birlestirilenSayisi > 0 && eklenenSayisi > 0) {
      showToast(`${eklenenSayisi} yeni kalem eklendi, ${birlestirilenSayisi} kalem var olan satırla birleştirildi`);
    } else if (birlestirilenSayisi > 0) {
      showToast(`${birlestirilenSayisi} kalem, var olan satır(lar)la birleştirildi (miktar arttırıldı)`);
    } else {
      showToast(`${eklenenSayisi} kalem eklendi`);
    }
  }

  // Kilitli kalem (düzenlemede planlanmış/teslim alınmış olan) formda da silinemez, değişmez —
  // arayüz kutuyu hiç çizmiyor, bu kapı da ikinci güvence.
  function kalemSil(id) {
    const k = kalemler.find((x) => x.id === id);
    if (k && kalemKilitSebebi(k)) return showToast(kalemKilitSebebi(k));
    setKalemler(kalemler.filter((x) => x.id !== id));
  }

  // Bir kalemin miktarını ya da birim fiyatını, satırı silip yeniden eklemeye gerek kalmadan
  // doğrudan yerinde günceller.
  function kalemDuzenle(id, alan, deger) {
    setKalemler(kalemler.map((k) => (k.id === id && !kalemKilitSebebi(k) ? { ...k, [alan]: deger } : k)));
  }

  // Sesli komuttan (Claude API ile ayrıştırılmış) dönen bilgiyi forma işler. Hiçbir şeyi otomatik
  // kaydetmez — sadece formu doldurur, kullanıcı gözden geçirip "Kalemler'e Ekle" / "Siparişi Kaydet" der.
  function sesliSonucUygula(parsed) {
    const normalize = (s) => (s || "").toString().trim().toLocaleLowerCase("tr-TR");
    let mesajParcalari = [];

    if (parsed.cariAdi) {
      const eslesen = cariUygun.find((c) => normalize(c.unvan).includes(normalize(parsed.cariAdi)) || normalize(parsed.cariAdi).includes(normalize(c.unvan)));
      if (eslesen) { setCariId(eslesen.id); mesajParcalari.push(`Cari: ${eslesen.unvan}`); }
      else mesajParcalari.push(`⚠ Cari eşleşmedi: "${parsed.cariAdi}"`);
    }

    if (parsed.teslimTarihi) setTeslimTarihi(parsed.teslimTarihi);
    if (parsed.not) setNot(parsed.not);

    if (parsed.urunAdi) {
      const eslesenUrun = urunUygun.find((p) => normalize(p.ad).includes(normalize(parsed.urunAdi)) || normalize(parsed.urunAdi).includes(normalize(p.ad)));
      if (eslesenUrun) {
        mesajParcalari.push(`Ürün: ${eslesenUrun.ad}`);
        setKUrunId(eslesenUrun.id);
        const fiyat = parsed.birimFiyat ?? (tip === "Satış" ? eslesenUrun.satisFiyati : eslesenUrun.alisFiyati) ?? "";
        setKFiyat(String(fiyat));

        const urunRenkleri = Array.from(new Set(eslesenUrun.variants.map((v) => v.renk)));
        let secilenRenk = "";
        if (parsed.renk) {
          secilenRenk = urunRenkleri.find((r) => normalize(r).includes(normalize(parsed.renk)) || normalize(parsed.renk).includes(normalize(r))) || "";
        }
        if (secilenRenk) {
          setKRenk(secilenRenk);
          mesajParcalari.push(`Renk: ${secilenRenk}`);
          if (parsed.bedenMiktarlari && typeof parsed.bedenMiktarlari === "object") {
            const urunBedenleri = bedenSirala(Array.from(new Set(eslesenUrun.variants.filter((v) => v.renk === secilenRenk).map((v) => v.beden))));
            const yeniMiktarlar = {};
            Object.entries(parsed.bedenMiktarlari).forEach(([beden, miktar]) => {
              const eslesenBeden = urunBedenleri.find((b) => normalize(b) === normalize(beden)) || urunBedenleri.find((b) => normalize(b).includes(normalize(beden)));
              if (eslesenBeden && miktar > 0) yeniMiktarlar[eslesenBeden] = String(miktar);
            });
            setKMiktarlar(yeniMiktarlar);
            if (Object.keys(yeniMiktarlar).length > 0) {
              mesajParcalari.push(`Miktarlar: ${Object.entries(yeniMiktarlar).map(([b, m]) => `${b}:${m}`).join(", ")}`);
            }
          }
        } else if (parsed.renk) {
          mesajParcalari.push(`⚠ Renk eşleşmedi: "${parsed.renk}"`);
        }
      } else {
        mesajParcalari.push(`⚠ Ürün eşleşmedi: "${parsed.urunAdi}"`);
      }
    }

    showToast(mesajParcalari.length > 0 ? mesajParcalari.join(" · ") + " — kontrol edip ekleyin" : "Sesli komuttan bilgi çıkarılamadı");
  }

  // ---- KAYDEDİLMİŞ SİPARİŞİ DÜZENLEME — YENİ SİPARİŞ FORMUYLA (25 Eylül) ----------------------
  //
  // Kullanıcı: "Siparişte düzenleme düzgün çalışmıyor, düzenle deyince arkada yeni sipariş girişi
  // gibi çalışıyor ve üstteki ekranı kapatman gerekiyor. Yeni sipariş gibi hareket edecek ama altta
  // girilenler gösterecek ve girilenler de düzenlenebilir olacak: renk, adet, stok gibi
  // değiştirilebilir (planlananlar değişemez)."
  //
  // Eskiden iki ayrı yol vardı: kartın içinde başlık kutuları (✎) ve formu kartın ARKASINDA açan
  // "kalem ekle". Şimdi tek yol: form siparişin başlığı ve kalemleriyle dolu açılıyor, tam ekran
  // kartın ÖNÜNDE duruyor; kaydedince sipariş yerinde güncelleniyor.
  //
  // KİLİT KURALI DEĞİŞMEDİ (`kalemKilitSebebi`): planlanmış ya da teslim alınmış kalem formda
  // görünür ama değiştirilemez/silinemez. Kaydederken de kilitli kalem ASIL kayıttan alınıyor —
  // ekranda bir şekilde değişmiş olsa bile karşı kaydı (üretim, alış, fiş) yalancı çıkaramaz.
  function siparisDuzenlemeyiBaslat(siparisId) {
    const siparis = siparisler.find((s) => s.id === siparisId);
    if (!siparis) return;
    resetForm();
    setDuzenlenenId(siparisId);
    setTip(siparis.tip);
    setCariId(siparis.cariId || "");
    setTarih(siparis.tarih || bugunYerel());
    setTeslimTarihi(siparis.teslimTarihi || "");
    setNot(siparis.not || "");
    setMusteriKodu(siparis.musteriKodu || "");
    setSiparisDefter(siparis.defterTercihi || "Genel");
    setKayitParaBirimi(siparis.kayitParaBirimi || null);
    setKayitKurlari(siparis.kayitKurlari || {});
    setKalemler((siparis.kalemler || []).map((k) => ({ ...k })));
    setShowForm(true);
  }

  function duzenlemedenCik() {
    setDuzenlenenId(null);
    resetForm();
    setShowForm(false);
  }

  function siparisDuzenlemeKaydet() {
    const siparis = siparisler.find((s) => s.id === duzenlenenId);
    if (!siparis) { duzenlemedenCik(); return showToast("Düzenlenen sipariş bulunamadı — silinmiş olabilir"); }
    if (!cariId) return showToast(tip === "Satış" ? "Müşteri seçin" : "Tedarikçi seçin");
    // CARİ, TESLİMAT YAPILMIŞSA DEĞİŞMEZ: fişler o cariye kesildi; değiştirmek ekstre ile siparişi
    // birbirinden koparırdı.
    const teslimVar = (siparis.kalemler || []).some((k) => (k.karsilanan || 0) > 0);
    if (teslimVar && cariId !== siparis.cariId) return showToast("Bu siparişten teslimat/fiş yapılmış — cari değiştirilemez");

    const asillar = siparis.kalemler || [];
    // KAPALI SİPARİŞE YENİ KALEM YOK (eski "kalem ekle" kuralı korunuyor): kapanmış bir işi yeni
    // kalemle sessizce yeniden açmak olurdu. Var olan kalemlerin düzeltilmesi serbest.
    const yeniKalemVar = kalemler.some((k) => !asillar.some((a) => a.id === k.id));
    if (yeniKalemVar && (siparis.durum === "Tamamlandı" || siparis.durum === "İptal")) {
      return showToast(`Sipariş "${siparis.durum}" durumunda — yeni kalem eklenemez`);
    }
    const kilitliAsil = asillar.filter((k) => kalemKilitSebebi(k));
    const kilitliIdler = new Set(kilitliAsil.map((k) => k.id));
    const serbest = kalemler.filter((k) => !kilitliIdler.has(k.id));
    if (kilitliAsil.length + serbest.length === 0) return showToast("En az 1 kalem olmalı — siparişi kaldırmak için Sil'i kullanın");
    for (const k of serbest) {
      if (!(k.miktar > 0)) return showToast(`${k.urunAd} · ${k.renk || "—"} · ${k.beden}: miktar sıfır olamaz`);
      const urun = (stok || []).find((u) => u.id === k.urunId);
      // Yalnız BOŞ renk engelleniyor (ürün değişince renk boşalıyor). Kayıtlı ama üründen sonradan
      // kalkmış bir renk engellenmiyor: dokunulmamış eski bir satır yüzünden sipariş kaydedilemez
      // olmamalı; seçicide "(listede yok)" olarak görünüyor.
      if (urunRenkleri(urun).length > 0 && !k.renk) return showToast(`${k.urunAd}: renk seçin`);
    }
    // Form siparişin kopyasıyla açıldığı için sıra korunuyor. Kilitli kalem ASIL kayıttan alınıyor;
    // formdan bir şekilde düşmüşse de sona geri ekleniyor — kilitli kalem bu yoldan silinemez.
    // NOTLAR istisna (v1.476.0): kilitli kalemin miktarı/fiyatı asıldan, NOTU formdan — notlar
    // üretimde canlı okunuyor, planlanmış işe not eklemek bu yüzden serbest (`grupNotDegistir`).
    const sonKalemler = kalemler.map((k) => {
      if (!kilitliIdler.has(k.id)) return k;
      const asil = asillar.find((a) => a.id === k.id);
      const notlar = kalemNotlari(k);
      return { ...asil, notlar: notlar.length ? notlar : undefined, aciklama: undefined };
    });
    kilitliAsil.forEach((k) => { if (!kalemler.some((x) => x.id === k.id)) sonKalemler.push(k); });

    onSave(siparisler.map((s) => (s.id !== siparis.id ? s : {
      ...s,
      cariId, tarih, teslimTarihi, not: not.trim(), musteriKodu: musteriKodu.trim(),
      defterTercihi: siparisDefter, kayitParaBirimi, kayitKurlari,
      kalemler: sonKalemler,
    })));
    showToast(`${siparis.siparisNo} güncellendi`);
    duzenlemedenCik();
  }

  // Ürünün seçilebilir renkleri (varyantlardan). Renksiz ürünlerde boş liste döner.
  function urunRenkleri(urun) {
    return Array.from(new Set(((urun && urun.variants) || []).map((v) => v.renk).filter(Boolean)));
  }

  // FORMDAKİ BİR SATIRI (ürün+renk grubu) DEĞİŞTİRME — ürün ya da renk. Yalnız kilitsiz kalemlere
  // uygulanıyor. Değişiklikten sonra aynı ürün+renk+ölçüye düşen kilitsiz kalemler TEK SATIRDA
  // birleşiyor (miktarlar toplanıyor): aynı hücrede iki kalem dururken biri ekranda görünmezdi.
  function grupDegistir(grupKalemIdleri, degisiklik) {
    const idler = new Set(grupKalemIdleri);
    const degismis = kalemler.map((k) => (idler.has(k.id) && !kalemKilitSebebi(k) ? { ...k, ...degisiklik } : k));
    const sonuc = [];
    degismis.forEach((k) => {
      if (kalemKilitSebebi(k)) { sonuc.push(k); return; }
      const i = sonuc.findIndex((x) => !kalemKilitSebebi(x) && x.urunId === k.urunId && x.renk === k.renk && x.beden === k.beden);
      if (i >= 0) sonuc[i] = { ...sonuc[i], miktar: sonuc[i].miktar + k.miktar };
      else sonuc.push(k);
    });
    if (sonuc.length < degismis.length) showToast("Aynı ürün/renk/ölçüdeki satırlar birleştirildi (miktarlar toplandı)");
    setKalemler(sonuc);
  }

  // NOTLAR KİLİTLİ SATIRDA DA DEĞİŞİR (v1.476.0): planlanmış kalemin miktarı/fiyatı donuk, ama nota
  // üretim sürerken de ihtiyaç doğuyor ("temizlemede her tek poşete") — üretim notu siparişten canlı
  // okuduğu için buraya yazılan hemen atölyeye düşer. Birleştirme yok: yalnız not alanı değişiyor.
  function grupNotDegistir(grupKalemIdleri, notlar) {
    const idler = new Set(grupKalemIdleri);
    setKalemler(kalemler.map((k) => (idler.has(k.id) ? { ...k, notlar: notlar.length ? notlar : undefined, aciklama: undefined } : k)));
  }
  // Notun proses seçenekleri — üretim emrinin kuracağı sırayla: ürünün o rengi için reçetedeki
  // prosesler, her birinin ardına ürün kartında bağlı ARA proses ("Temizleme" gibi, üretimde ayrı
  // satır olur). Sonra tanımlı diğer prosesler: reçete sonradan genişleyebilir, not kaybolmasın.
  function notProsesleri(urun, renk) {
    const sira = {};
    (tanimlarProsesler || []).forEach((p, i) => { sira[p.ad] = p.sira != null ? p.sira : 100 + i; });
    const recetedekiler = [...new Set(((urun && urun.recete) || []).filter((r) => r.proses && (!renk || r.mamulRenk === renk)).map((r) => r.proses))]
      .sort((a, b) => (sira[a] ?? 999) - (sira[b] ?? 999));
    const liste = [];
    recetedekiler.forEach((p) => {
      liste.push(p);
      araProsesIdleri(urun, p).forEach((araId) => {   // v1.477.0: birden çok ara proses
        const ara = (tanimlarAraProsesler || []).find((x) => x.id === araId);
        if (ara && !liste.includes(ara.ad)) liste.push(ara.ad);
      });
    });
    (tanimlarProsesler || []).map((p) => p.ad).sort((a, b) => (sira[a] ?? 999) - (sira[b] ?? 999))
      .forEach((p) => { if (!liste.includes(p)) liste.push(p); });
    return liste;
  }

  function grupUrunDegistir(grupKalemIdleri, urunId) {
    const urun = urunUygun.find((u) => u.id === urunId);
    if (!urun) return;
    const ilk = kalemler.find((k) => k.id === grupKalemIdleri[0]);
    // Renk yeni üründe de varsa korunuyor; yoksa boşalıyor ve satır "renk seçin" diye işaretleniyor.
    // Başka bir renge sessizce atamak, yanlış rengin siparişe girmesi demekti.
    const renk = ilk && urunRenkleri(urun).includes(ilk.renk) ? ilk.renk : "";
    // Kutu (ambalaj) tercihi ürüne özgü; ürün değişince geçersiz.
    grupDegistir(grupKalemIdleri, { urunId: urun.id, urunAd: urun.ad, birim: urun.birim, renk, ambalaj: null });
  }

  function siparisKaydet() {
    if (!cariId) return showToast(tip === "Satış" ? "Müşteri seçin" : "Tedarikçi seçin");
    if (kalemler.length === 0) return showToast("En az 1 kalem ekleyin");
    const siparis = {
      id: uid("sip"),
      siparisNo: sonrakiSiparisNo(siparisler, tip === "Satış" ? "SAT-" : "ALS-"),
      tip, cariId, tarih, teslimTarihi, not: not.trim(),
      musteriKodu: musteriKodu.trim(),
      kayitParaBirimi, kayitKurlari,
      durum: "Bekliyor", kalemler,
      defterTercihi: siparisDefter,
      olusturuldu: new Date().toISOString(),
    };
    onSave([siparis, ...siparisler]);
    resetForm();
    setShowForm(false);
    showToast("Sipariş oluşturuldu");
  }

  // ELLE DURUM GÜNCELLEME KALDIRILDI (7 Eylül). Durum siparişin HAREKETLERİNDEN hesaplanıyor;
  // elle seçim onunla çelişebiliyordu: kullanıcı "Tamamlandı" seçse de teslim edilmemiş kalem
  // duruyorsa liste onu bekleyen sayıyordu. İki kaynak varsa biri yalan söyler.

  // Bir siparişin "kayıt para birimi"ni (fişin genel toplamının hangi para biriminde takip edileceğini)
  // ve kullanılan kurları KALICI olarak siparişe kaydeder — ürün satırlarının kendi fiyatı/para birimi
  // DEĞİŞMEZ, sadece bu üst düzey tercih saklanır. Bu tercih, siparişin başlığındaki toplam gösteriminde
  // VE gerçekleştirilip cariye borç/alacak işlenirken KULLANILIR — yani sipariş bir kez bu para birimine
  // ayarlandıktan sonra, sonraki tüm aşamalarda (teslimat, cari hareketi) aynı para birimiyle devam eder.
  function siparisKayitParaGuncelle(siparisId, kayitParaBirimi, kayitKurlari) {
    onSave(siparisler.map((s) => (s.id === siparisId ? { ...s, kayitParaBirimi, kayitKurlari } : s)));
  }

  // "Kalemlere Ekle" butonuna ard arda basılması gibi durumlarda oluşmuş, AYNI ürün+renk+beden'e sahip
  // ve HÂLÂ PLANLANMAMIŞ (bekleyen) tekrar eden kalemleri tek bir satırda birleştirir — miktarları
  // toplar. Planlanmış/işlenmiş kalemlere KESİNLİKLE dokunmaz (bekleyenKalemleriBirlestir zaten sadece
  // planlama=null olanları birleştirir).
  function siparisKalemleriniBirlestir(siparisId) {
    const siparis = siparisler.find((s) => s.id === siparisId);
    if (!siparis) return;
    const oncekiSayi = siparis.kalemler.length;
    const birlesmis = bekleyenKalemleriBirlestir(siparis.kalemler);
    if (birlesmis.length === oncekiSayi) return showToast("Birleştirilecek tekrar eden kalem bulunamadı");
    onSave(siparisler.map((s) => (s.id === siparisId ? { ...s, kalemler: birlesmis } : s)));
    showToast(`${oncekiSayi - birlesmis.length} tekrar eden kalem birleştirildi`);
  }

  // ---- KAYDEDİLMİŞ SİPARİŞİ DÜZENLEME ---------------------------------------------------------
  //
  // Kullanıcı (6 Eylül): "Kaydedilmiş siparişi düzenlemek yok, düzenleme ekleyelim."
  //
  // Kalem SİLME zaten vardı ve iki kapısı vardı (planlanmış / karşılanmış). Düzenleme AYNI
  // kapılardan geçiyor — ayrı bir kural seti yazmak, birinin diğerinden gevşek kalması demekti.
  //
  // NEDEN BU KADAR SIKI: sipariş tek başına duran bir kayıt değil. Karşılanan miktar fişten
  // geliyor, planlama üretim/alış siparişine bağlı, hazır koliler siparişin kalanından düşülüyor.
  // Bunlardan biri varken kalemi değiştirmek, karşı taraftaki kaydı sessizce yalancı çıkarır.
  function kalemKilitSebebi(kalem) {
    if (!kalem) return "Kalem bulunamadı";
    if (kalem.planlama) return "Bu kalem planlanmış — önce planlamayı temizleyin";
    if ((kalem.karsilanan || 0) > 0) return "Bu kalem için teslimat/üretim girilmiş — düzenlenemez";
    return "";
  }

  function siparisSil(id) {
    const siparis = siparisler.find((s) => s.id === id);
    if (!siparis) return;

    // Bu bir Satış siparişiyse ve Tedarik Planlama üzerinden ona bağlı, HÂLÂ VAR OLAN bir Alış siparişi
    // varsa, silmeye izin verme — önce o Alış siparişinin (ve varsa fişlerinin) silinmesi gerekir.
    if (siparis.tip === "Satış") {
      const bagliAlisNolari = Array.from(new Set(
        siparis.kalemler
          .filter((k) => k.planlama && k.planlama.tip === "Satınalma")
          .map((k) => k.planlama.referansNo)
      ));
      const varOlanBagliAlislar = bagliAlisNolari.filter((no) =>
        siparisler.some((s) => s.tip === "Alış" && s.siparisNo === no)
      );
      if (varOlanBagliAlislar.length > 0) {
        return showToast(
          `Silinemiyor — önce bağlı ${varOlanBagliAlislar.join(", ")} alış siparişini (varsa fişleriyle birlikte) silmeniz gerekiyor.`
        );
      }
    }

    const islenmis = siparis.kalemler.some((k) => (k.karsilanan || 0) > 0);
    if (islenmis) {
      // Bu yol siparisSilCascade'e gider ve çöp kaydını orası oluşturur.
      onSilCascade(id);
    } else {
      // İŞLENMEMİŞ sipariş doğrudan siliniyor — çöp kaydı BURADA alınmalı. Silmelerin çöpte
      // görünmemesinin sebebi buydu: teslimatı olmayan siparişler (yani çoğu silinen sipariş)
      // cascade yoluna hiç uğramıyordu. Ürün silmede de aynı çift-yol vardı.
      // Teslimatı olmadığı için stok/cari yan etkisi yok; sorunsuz geri yüklenebilir.
      if (onCopaAt) {
        onCopaAt("siparis", `${siparis.tip} ${siparis.siparisNo}`, siparis, {
          ozet: `${(siparis.kalemler || []).length} kalem — teslimatsız, durum: ${siparis.durum}`,
          yanEtkiliMi: false,
        });
      }
      const nextSiparisler = siparisler
        .filter((s) => s.id !== id)
        .map((s) => {
          if (s.tip !== "Satış" || siparis.tip !== "Alış") return s;
          const etkilenen = s.kalemler.some((k) => k.planlama && k.planlama.referansNo === siparis.siparisNo);
          if (!etkilenen) return s;
          return {
            ...s,
            kalemler: bekleyenKalemleriBirlestir(s.kalemler.map((k) =>
              k.planlama && k.planlama.referansNo === siparis.siparisNo ? { ...k, planlama: null } : k
            )),
          };
        });
      onSave(nextSiparisler);
      showToast("Sipariş silindi — Tanımlar > Çöp Kutusu'ndan geri alınabilir");
    }
  }

  const siparisSirala = (a, b) => new Date(b.tarih || 0) - new Date(a.tarih || 0) || new Date(b.olusturuldu || 0) - new Date(a.olusturuldu || 0);
  const satisListeTumu = siparisler.filter((s) => s.tip === "Satış").sort(siparisSirala);
  const alisListeTumu = siparisler.filter((s) => s.tip === "Alış").sort(siparisSirala);

  function siparisAramaEslesiyor(s) {
    const q = siparisArama.trim().toLocaleLowerCase("tr-TR");
    if (!q) return true;
    const cariAdi = (cariler.find((c) => c.id === s.cariId) || {}).unvan || "";
    const parcalar = [
      s.siparisNo || "",
      s.musteriKodu || "",
      cariAdi,
      s.not || "",
      ...s.kalemler.flatMap((k) => [k.urunAd, k.renk, k.beden]),
    ];
    return parcalar.join(" ").toLocaleLowerCase("tr-TR").includes(q);
  }

  function siparisKolonEslesiyor(s) {
    const esle = (metin, aranan) =>
      String(metin || "").toLocaleLowerCase("tr-TR").includes(aranan.toLocaleLowerCase("tr-TR"));
    if (siparisKolonFiltre.no.trim() && !esle(s.siparisNo, siparisKolonFiltre.no.trim()) && !esle(s.musteriKodu, siparisKolonFiltre.no.trim())) return false;
    if (siparisKolonFiltre.cari.trim()) {
      const cariAdi = (cariler.find((c) => c.id === s.cariId) || {}).unvan || "";
      if (!esle(cariAdi, siparisKolonFiltre.cari.trim())) return false;
    }
    if (siparisKolonFiltre.tarih.trim()) {
      // Sipariş tarihi ve teslim tarihi birlikte taranır — kullanıcı hangi tarihi aradığını
      // önceden seçmek zorunda kalmasın.
      if (!esle(s.tarih, siparisKolonFiltre.tarih.trim()) && !esle(s.teslimTarihi, siparisKolonFiltre.tarih.trim())) return false;
    }
    return true;
  }

  const satisListe = satisListeTumu.filter((s) => (durumFiltre === "Tümü" || s.durum === durumFiltre) && siparisAramaEslesiyor(s) && siparisKolonEslesiyor(s));
  const alisListe = alisListeTumu.filter((s) => (durumFiltre === "Tümü" || s.durum === durumFiltre) && siparisAramaEslesiyor(s) && siparisKolonEslesiyor(s));


  // Model rengi pozisyonlarında seçilebilecek MAMUL renkleri. Kombinasyon etiketleri havuza girmez
  // (iç içe kombinasyon oluşmasın), hammadde renkleri de girmez (ayrı liste).
  // TEK RENK HAVUZU (9g): pozisyonlarda bütün stok renkleri seçilebilir; kombinasyon etiketleri hariç.
  const mamulRenkSecenekleri = (tanimlarRenkler || []).filter(
    (r) => !/^\d+\s*-\s*/.test(String(r.ad || ""))
  );

  // Panelden yeni mamul rengi oluşturur ve o pozisyona atar.
  // Renk Tanımlar'a "Mamul" tipiyle kaydedilir; bir daha her ürün için yeniden yazılması gerekmez.
  //
  // Kayıt eşzamanlı DEĞİL: onYeniRenkKaydet state'i günceller ve yeni kimlik ancak bir sonraki
  // render'da listeye düşer. Bu yüzden ad "bekleyen" olarak saklanır; aşağıdaki efekt, renk listede
  // belirdiği anda kimliği bulup pozisyona atar. Kimliği burada tahmin etmeye çalışmak, yanlış
  // renge bağlanma riski taşırdı.
  function yeniMamulRengiOlustur(poz) {
    const ad = yrYeniAd.trim();
    if (!ad) { showToast("Renk adı girin"); return; }
    if (!onYeniRenkKaydet) return;
    onYeniRenkKaydet(ad, "Hammadde", undefined);
    setYrBekleyenAdlar((onceki) => ({ ...onceki, [poz]: ad }));
    setYrYeniPozisyon(null);
    setYrYeniAd("");
  }

  useEffect(() => {
    const bekleyenler = Object.entries(yrBekleyenAdlar);
    if (bekleyenler.length === 0) return;
    const cozulen = {};
    const kalan = {};
    bekleyenler.forEach(([poz, ad]) => {
      // Tek renk havuzu (9g): tip filtresi yok — bütün renkler aynı listede.
      const bulunan = (tanimlarRenkler || []).find(
        (r) => !kombinasyonEtiketiFormatindaMi(r.ad) &&
          String(r.ad || "").toLocaleLowerCase("tr-TR") === ad.toLocaleLowerCase("tr-TR")
      );
      if (bulunan) cozulen[poz] = bulunan.id;
      else kalan[poz] = ad;
    });
    if (Object.keys(cozulen).length === 0) return;
    setYrPozisyonlar((onceki) => ({ ...onceki, ...cozulen }));
    setYrPozisyonYazi({});
    setYrBekleyenAdlar(kalan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tanimlarRenkler, yrBekleyenAdlar]);


  return (
    <div>
      {/* ---- TAM EKRAN SİPARİŞ ----
          Listedeki önizleme salt-okunurdur; düzenleme, teslim alma ve tedarik planlama BURADA
          yapılır. Pencere yöneticisinin sekme şeridiyle uyumlu çalışır: küçültülünce sekmede kalır,
          tıklanınca geri açılır. */}
      {(acikSiparisPencereleri || [])
        .filter((pn) => ((pn.veri && pn.veri.sahipTip) || null) === (sabitTip || null))
        .map((pn) => {
        const tamEkranSiparisId = pn.kayitId;
        const tamEkranSiparis = siparisler.find((x) => x.id === tamEkranSiparisId);
        if (!tamEkranSiparis) return null;
        // Etkin olmayan kart KURULU KALIYOR, yalnız gizli: içindeki yarım girişler korunuyor.
        const gorunur = aktifPencereId === `siparis-${tamEkranSiparisId}`;
        return (
        <div
          key={pn.id}
          data-siparis-karti={tamEkranSiparisId}
          style={{
            position: "fixed", top: PENCERE_SERIT_YUKSEKLIGI, left: "var(--menu-genislik, 0px)", right: 0, bottom: 0,
            zIndex: 100, background: "rgba(34,27,20,.55)",
            display: gorunur ? "flex" : "none", alignItems: "stretch", justifyContent: "center", padding: 0,
          }}
          onClick={(e) => { if (e.target === e.currentTarget && onPencereKucult) onPencereKucult(); }}
        >
          <div style={{ background: "var(--erp-panel-2)", width: "100%", height: "100%", display: "flex", flexDirection: "column", minWidth: 0 }}>
            {/* Başlık şeridi, siparişin tipine göre renklenir: satış çini mavisi, alış taba.
                Müşteri adı buradaki EN BELİRGİN öğe — tam ekranda çalışırken "kimin siparişindeyim"
                sorusu sürekli sorulan bir soru ve önceki halde sipariş numarasıyla aynı ağırlıktaydı. */}
            <div
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                background: tamEkranSiparis.tip === "Alış" ? "var(--erp-brown)" : "var(--erp-info)",
                color: "var(--erp-panel-2)", flexShrink: 0,
              }}
            >
              {tamEkranSiparis.tip === "Alış" ? <PackageCheck size={20} /> : <Truck size={20} />}
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.25 }}>
                {/* BELGE TÜRÜ — hangi tür kayda bakıldığını söyleyen üst başlık.
                    Müşteri adı tek başına, satış mı satın alma mı olduğunu söylemiyordu; renk ve ikon
                    ipucu veriyor ama okunabilir bir etiket kadar kesin değil. */}
                <span
                  className="mono"
                  style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", opacity: 0.75 }}
                >
                  {tamEkranSiparis.tip === "Alış" ? "Alış Siparişi" : "Satış Siparişi"}
                </span>
                <span style={{ fontSize: 18, fontWeight: 700, overflowWrap: "anywhere" }}>
                  {(cariler.find((c) => c.id === tamEkranSiparis.cariId) || {}).unvan || "—"}
                </span>
                <span className="mono" style={{ fontSize: 11, opacity: 0.85, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span>{tamEkranSiparis.siparisNo}</span>
                  {tamEkranSiparis.musteriKodu && <span>#{tamEkranSiparis.musteriKodu}</span>}
                  <span>{tamEkranSiparis.tarih}</span>
                </span>
              </span>
              <button
                className="btn-ghost"
                // Koyu zemin üzerinde ghost düğme okunmuyor; kendi renkleri veriliyor.
                style={{ marginLeft: "auto", padding: "6px 12px", fontSize: 12, background: "rgba(255,255,255,.14)", borderColor: "rgba(255,255,255,.35)", color: "var(--erp-panel-2)" }}
                onClick={() => onPencereKucult && onPencereKucult()}
                title="Küçült — sekme çubuğunda kalır"
              >
                <ChevronDown size={14} /> Küçült
              </button>
              <button
                className="btn-ghost"
                style={{ padding: "6px 12px", fontSize: 12, background: "rgba(255,255,255,.14)", borderColor: "rgba(255,255,255,.35)", color: "var(--erp-panel-2)" }}
                onClick={() => { onPencereKapat && onPencereKapat(`siparis-${tamEkranSiparisId}`); }}
              >
                <X size={14} /> Kapat
              </button>
            </div>
            <div style={{ padding: "12px 16px 16px", flex: 1, overflowY: "auto", minWidth: 0 }}>
              <SiparisCard
                mobilBolumAyari={mobilBolumAyari}
                showToast={showToast}
                siparis={tamEkranSiparis}
                koliler={koliler}
                cariler={cariler}
                stok={stok}
                stokRezervasyonlari={stokRezervasyonlari}
                tumSiparisler={siparisler}
                uretimSiparisleri={uretim}
                onSil={(id) => { siparisSil(id); onPencereKapat && onPencereKapat(`siparis-${id}`); }}
                onGerceklestir={onGerceklestir}
                onSatisFisiAc={onSatisFisiAc}
                onPlanlaUretim={onPlanlaUretim}
                onPlanlaSatinAlma={onPlanlaSatinAlma}
                baslangicAcik
                onSiparisGit={(hedefId) => tamEkranAc(hedefId, "Sipariş")}
                onGoToUretim={onGoToUretim}
                onPlanlamaTemizle={onPlanlamaTemizle}
                asortiler={asortiler}
                onAsortiOlustur={onAsortiOlustur}
                firmaBilgileri={firmaBilgileri}
                onPencereAc={onPencereAc}
                onDuzenle={siparisDuzenlemeyiBaslat}
                onFiseGitNo={onFiseGitNo}
                kurlar={kurlar}
                onKayitParaGuncelle={siparisKayitParaGuncelle}
                onKalemleriBirlestir={siparisKalemleriniBirlestir}
              />
            </div>
          </div>
        </div>
        );
        })}


      {showForm && (
        // DÜZENLEMEDE FORM ÖNDE (25 Eylül): düzenleme tam ekran sipariş kartından başlıyor. Form
        // modülün normal yerinde açılınca kartın ARKASINDA kalıyordu ve kullanıcı kartı kapatmak
        // zorundaydı. Düzenlemede form, kartla aynı konumda ve onun üstünde (zIndex) çiziliyor;
        // kaydedince/vazgeçince kapanıyor ve kart güncel hâliyle yerinde duruyor.
        <div
          data-siparis-duzenleme={duzenlenenId || undefined}
          style={duzenlenenId ? {
            position: "fixed", top: PENCERE_SERIT_YUKSEKLIGI, left: "var(--menu-genislik, 0px)", right: 0, bottom: 0,
            zIndex: 110, background: "var(--erp-panel-2)", overflowY: "auto", padding: "0 0 16px",
          } : undefined}
        >
        {duzenlenenId && (() => {
          const hedef = siparisler.find((s) => s.id === duzenlenenId) || {};
          // Başlık şeridi tam ekran kartınkiyle aynı: kullanıcı hangi siparişte olduğunu ve
          // DÜZENLEMEDE olduğunu (yeni sipariş değil) ilk bakışta görmeli.
          return (
            <div style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", marginBottom: 12,
              background: hedef.tip === "Alış" ? "var(--erp-brown)" : "var(--erp-info)", color: "var(--erp-panel-2)",
              position: "sticky", top: 0, zIndex: 1,
            }}>
              <Pencil size={18} />
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.25 }}>
                <span className="mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", opacity: 0.75 }}>
                  {hedef.tip === "Alış" ? "Alış siparişi düzenleniyor" : "Satış siparişi düzenleniyor"}
                </span>
                <span style={{ fontSize: 17, fontWeight: 700, overflowWrap: "anywhere" }}>
                  {(cariler.find((c) => c.id === hedef.cariId) || {}).unvan || "—"}
                  <span className="mono" style={{ fontSize: 12, fontWeight: 500, marginLeft: 8, opacity: 0.85 }}>{hedef.siparisNo}</span>
                </span>
              </span>
              <button
                className="btn-ghost"
                style={{ marginLeft: "auto", padding: "6px 12px", fontSize: 12, background: "rgba(255,255,255,.14)", borderColor: "rgba(255,255,255,.35)", color: "var(--erp-panel-2)" }}
                onClick={duzenlemedenCik}
              >
                <X size={14} /> Vazgeç
              </button>
            </div>
          );
        })()}
        <div id="siparis-yeni-form" style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 16, marginBottom: 20, ...(duzenlenenId ? { margin: "0 16px" } : {}) }}>
          {/* TİP SEÇİCİ — YALNIZ SABİT TİP YOKKEN. Alış ve satış siparişleri AYRI ana sekmelere
              bölündüğünde (`sabitTip`) bu satır İKİNCİ bir seçim noktası oluyordu: kullanıcı
              "Alış Siparişi" sekmesinden girip formda "Satış"a basabiliyordu ve hangisinin
              geçerli olduğu belirsizdi. Kullanıcı (6 Eylül): "nereden girmiş isek o kalsın." */}
          <div style={{ display: sabitTip || duzenlenenId ? "none" : "flex", gap: 8, marginBottom: 12 }}>
            {[{ t: "Satış", Icon: Truck, renk: "var(--erp-info)" }, { t: "Alış", Icon: PackageCheck, renk: "var(--erp-brown)" }].map(({ t, Icon, renk }) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTip(t); setCariId(""); setKUrunId(""); setKRenk(""); setKMiktarlar({}); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 16px", borderRadius: "var(--erp-r-pill)", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  border: `1.5px solid ${tip === t ? renk : "var(--erp-border)"}`,
                  background: tip === t ? alfaEkle(renk, "1A") : "#fff",
                  color: tip === t ? renk : "var(--erp-text)",
                }}
              >
                <Icon size={14} />
                {t} Siparişi
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.8fr 0.8fr", gap: 10 }}>
            <Field label={tip === "Satış" ? "Müşteri" : "Tedarikçi"}>
              {/* Düzenlemede teslimat yapılmışsa CARİ KİLİTLİ: fişler o cariye kesildi. Sebep
                  yanında yazılı — kaydedince reddedilmek yerine baştan görünsün. */}
              {(() => {
                const cariKilitli = duzenlenenId && kalemler.some((k) => (k.karsilanan || 0) > 0);
                return (
                  <>
                    <select value={cariId} onChange={(e) => setCariId(e.target.value)} style={inputStyle} disabled={cariKilitli} data-siparis-cari="1">
                      <option value="">Seçin…</option>
                      {cariUygun.map((c) => <option key={c.id} value={c.id}>{c.unvan}</option>)}
                    </select>
                    {cariKilitli && <span style={{ fontSize: 10, color: "var(--erp-brown)" }}>teslimat yapılmış, değiştirilemez</span>}
                  </>
                );
              })()}
            </Field>
            <Field label="Sipariş Tarihi">
              <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Teslim Tarihi">
              <input type="date" value={teslimTarihi} onChange={(e) => setTeslimTarihi(e.target.value)} style={inputStyle} />
            </Field>
            <Field label={tip === "Satış" ? "Müşteri Sipariş Kodu (opsiyonel)" : "Tedarikçi Sipariş Kodu (opsiyonel)"}>
              <input
                value={musteriKodu}
                onChange={(e) => setMusteriKodu(e.target.value)}
                placeholder="örn. karşı tarafın kendi sipariş/referans numarası"
                title="Sipariş No'nun yerine değil, yanında tutulur — müşterinin/tedarikçinin kendi sisteminde bu siparişe verdiği kod"
                style={inputStyle}
              />
            </Field>

            {/* Sipariş BAŞLIĞINDAKİ kutu alanı KALDIRILDI: kutu kalem bazında seçiliyor ve iki
                seviyenin birlikte durması "hangisi geçerli?" belirsizliği yaratıyordu. Kalem
                seviyesi zaten daha güçlü — aynı siparişte farklı modeller farklı kutuya girebilir. */}
          </div>

          <StitchDivider />

          {/* BARKOD OKUT — fuarda en hızlı yol: müşteriyi seç, kodları okut, kaydet.
              Asorti barkodu dağılımı toptan ekliyor, çift barkodu tek çift ekliyor; ikisi de
              aynı kutudan geçiyor çünkü personel eline hangi etiketin geldiğini seçmiyor. */}
          {!barkodPaneli ? (
            <button type="button" data-barkod-paneli-ac="1" onClick={() => barkodPaneliDegistir(true)}
              title="Barkod okutma, kamera, sesli giriş ve fotoğraftan bulma"
              style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", marginBottom: 10, padding: "6px 10px", fontSize: 12, fontWeight: 700,
                color: "#2E5670", background: "#EAF0F4", border: "1px dashed #3D6B8A", borderRadius: "var(--erp-r-md)", cursor: "pointer" }}>
              <ScanLine size={14} /> Barkod okut · kamera · ses · fotoğraf
              <ChevronDown size={14} style={{ marginLeft: "auto" }} />
            </button>
          ) : (
          <div style={{ border: "1.5px solid #3D6B8A", borderRadius: "var(--erp-r-md)", padding: 10, background: "#EAF0F4", marginBottom: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={{ display: "grid", gap: 3, flex: 1, minWidth: 200 }}>
              <span style={{ display: "flex", alignItems: "center", fontSize: 11, fontWeight: 700, color: "#2E5670" }}>
                Barkod okut (asorti ya da tek çift)
                {/* Kapat düğmesi etiketin içinde ama label'a tıklamayı kutuya odaklamaya çevirmesin. */}
                <button type="button" data-barkod-paneli-kapat="1" title="Barkod panelini kapat"
                  onClick={(e) => { e.preventDefault(); barkodPaneliDegistir(false); }}
                  style={{ marginLeft: "auto", border: "none", background: "none", color: "#2E5670", cursor: "pointer", display: "flex", alignItems: "center", gap: 2, padding: 0, fontSize: 11, fontWeight: 600 }}>
                  Gizle <ChevronUp size={14} />
                </button>
              </span>
              <input
                value={barkodGirisi}
                onChange={(e) => setBarkodGirisi(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); asortiBarkodOkut(barkodGirisi); } }}
                placeholder="Okutun ya da kodu yazıp Enter"
                title="Barkod"
                style={{ ...inputStyle, fontFamily: "monospace" }}
              />
            </label>
            <button type="button" className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => asortiBarkodOkut(barkodGirisi)}>
              <ScanLine size={13} /> Ekle
            </button>
            {/* SESLİ GİRİŞ BARKODUN SAĞINDA (kullanıcı, 6 Eylül: "sola barkod girişi, sağda
                mikrofon amblemi ile ses ile kayıt olsun, ekranı çok kaplamasın"). Kendi mor
                kutusunda formun en üstünde duruyordu ve açıklama satırıyla dört satır yer
                kaplıyordu. İkisi de "kalem eklemenin hızlı yolu" olduğu için aynı satırda
                olmaları da doğru. */}
            <SesliSiparisButonu tip={tip} cariUygun={cariUygun} urunUygun={urunUygun} onSonuc={sesliSonucUygula} showToast={showToast} />
            {/* KAMERAYLA OKUT (24 Eylül, v1.438.0 — kullanıcı: "siparişte kamera ile barkod okuma
                ekranı ekleyelim, daha önce yaptık"). Depo > Okut ve Depo > Sevkiyat'taki AYNI
                bileşen (`KameraOkuyucu`, 236): önce cihazın kendi okuyucusu (Android Chrome),
                yoksa yerleşik Code128 çözücü (iPhone). Okunan kod, elle yazılan barkodla AYNI
                kapıdan geçiyor (`asortiBarkodOkut`) — ikinci bir okuma mantığı yok.
                `flexBasis: "100%"`: kamera açılınca görüntü kendi satırına iniyor, barkod kutusunu
                ve mikrofonu ezmiyor. */}
            {/* FOTOĞRAFTAN TANI: barkodu olmayan / etiketi düşmüş ürün için. Barkod okutmanın
                yanında duruyor çünkü ikisi de "kalemi hızlı ekleme" yolu. */}
            <button type="button" className="btn-ghost" data-foto-ac="1"
              style={{ padding: "6px 12px", fontSize: 12 }}
              onClick={() => setFotoAcik(true)}
              title="Ürünün fotoğrafını çekip kayıtlı görsellerle eşleştir">
              <Camera size={13} /> Fotoğraftan bul
            </button>
            <div style={{ flexBasis: "100%" }}>
              <KameraOkuyucu onKod={(kod) => asortiBarkodOkut(kod)} />
            </div>
          </div>
          )}

          <GorselIleBul
            havuz={fotoHavuzu}
            acikMi={fotoAcik}
            onKapat={() => setFotoAcik(false)}
            onSec={fotoSecimi}
            showToast={showToast}
            altBilgi={(
              <div style={{ fontSize: 12, color: "#2E5670", marginBottom: 8 }}>
                {tip === "Alış" ? "Hammadde ve malzemeler" : "Mamuller"} aranıyor — kayıtlı ürün
                görselleriyle karşılaştırılıyor, dışarıya hiçbir şey gönderilmiyor.
              </div>
            )}
          />
          <div style={{ fontSize: 12, color: "var(--erp-text-2)", fontWeight: 700, marginBottom: 8 }}>Kalem Ekle</div>
          {/* YENİ MODEL RENGİ PANELİ — Tanımlar'daki Model Rengi mantığının aynısı.
              Renk adı serbest yazılmaz: kaç pozisyondan oluştuğu seçilir (1-4), her pozisyona
              Tanımlar'daki renklerden biri atanır ve kod otomatik verilir ("1011 - Siyah/Beyaz").
              Sebep: mamul renkleri zaten bu biçimde tutuluyor. Serbest yazılan bir ad aynı rengi iki
              yazımla ikiye böler ve reçetedeki pozisyon mantığıyla (1. Renk / 2. Renk) bağ kuramaz. */}
          {yeniRenkPaneli && seciliUrun && (() => {
            const kaynakSatirlar = (seciliUrun.recete || []).filter((r) => r.mamulRenk === yrKaynakRenk);
            // Aynı hammadde+proses+açıklama birden çok bedende tekrar eder; kullanıcıya TEK satır
            // gösterilir, seçim o gruptaki tüm satırlara uygulanır.
            const gruplar = [];
            const index = {};
            kaynakSatirlar.forEach((r) => {
              const key = `${r.hammaddeUrunId}__${r.aciklama || ""}__${r.proses || ""}__${r.renk}`;
              if (!(key in index)) {
                index[key] = gruplar.length;
                gruplar.push({ key, ornek: r, satirlar: [] });
              }
              gruplar[index[key]].satirlar.push(r);
            });

            const pozisyonlar = Array.from({ length: yrRenkSayisi }, (_, i) => i + 1);
            const tumPozisyonlarDolu = pozisyonlar.every((poz) => yrPozisyonlar[poz]);
            const secilenAdlar = pozisyonlar.map((poz) => {
              const r = (tanimlarRenkler || []).find((x) => x.id === yrPozisyonlar[poz]);
              return r ? r.ad : null;
            });
            const onizleme = tumPozisyonlarDolu ? secilenAdlar.join("/") : "";

            return (
              <div style={{ background: "#F4EFF7", border: "1.5px solid #C9B3D9", borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  <Palette size={14} color="var(--erp-purple)" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-purple)" }}>
                    {seciliUrun.ad} — yeni model rengi
                  </span>
                  <button type="button" className="btn-ghost" style={{ fontSize: 11, padding: "4px 9px", marginLeft: "auto" }} onClick={() => setYeniRenkPaneli(false)}>
                    <X size={11} /> Kapat
                  </button>
                </div>

                {/* Kaç renkten oluşuyor? — Tanımlar ekranındaki kontrolün aynısı. */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>Kaç renkten oluşuyor?</span>
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => { setYrRenkSayisi(n); setYrPozisyonlar({}); setYrPozisyonYazi({}); }}
                      style={{
                        width: 26, height: 26, borderRadius: "50%",
                        border: `1.5px solid ${yrRenkSayisi === n ? "var(--erp-purple)" : "var(--erp-border)"}`,
                        background: yrRenkSayisi === n ? "#EDE7F2" : "#fff",
                        color: yrRenkSayisi === n ? "var(--erp-purple)" : "var(--erp-text-2)",
                        cursor: "pointer", fontSize: 12, fontWeight: 700,
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {pozisyonlar.map((poz) => (
                    <label key={poz} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>{poz}. Renk</span>
                      {/* Seçim VE oluşturma bir arada. Mamul renkleri hammadde renklerinden ayrıldığı
                          için mamul listesi boş kalabiliyor; o durumda kullanıcı Tanımlar'a gidip renk
                          açmadan sipariş giremiyordu — tam da bu tıkanma yaşandı.
                          Aradığı renk listede yoksa buradan oluşturuyor; "Mamul" tipiyle kaydedilir. */}
                      {/* YAZARAK SEÇİM (v1.469.0). Etiket "Ad (ton kodu)"; seçim kimlikle tutuluyor.
                          "+ Yeni" düğmesi listede olmayan rengi oluşturuyor (eski "+ Yeni renk oluştur…"). */}
                      {(() => {
                        const etiket = (r) => `${r.ad}${r.kod ? ` (${r.kod})` : ""}`;
                        const secili = mamulRenkSecenekleri.find((r) => r.id === yrPozisyonlar[poz]);
                        return (
                          <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <span style={{ width: 170 }}>
                              <AramaliMetin
                                veriAdi="data-siparis-yeni-renk-poz"
                                deger={yrPozisyonYazi[poz] != null ? yrPozisyonYazi[poz] : (secili ? etiket(secili) : "")}
                                onDegis={(v) => {
                                  setYrPozisyonYazi((y) => ({ ...y, [poz]: v }));
                                  const bulunan = mamulRenkSecenekleri.find((r) => etiket(r) === v);
                                  setYrPozisyonlar((p) => ({ ...p, [poz]: bulunan ? bulunan.id : "" }));
                                }}
                                oneriler={mamulRenkSecenekleri.map(etiket)}
                                yalnizListeden
                                placeholder={mamulRenkSecenekleri.length === 0 ? "Renk tanımlı değil" : "Yazın ya da seçin…"}
                              />
                            </span>
                            {onYeniRenkKaydet && (
                              <button type="button" className="btn-ghost" title="Listede olmayan rengi oluştur"
                                style={{ padding: "5px 7px", fontSize: 11, whiteSpace: "nowrap" }}
                                onClick={() => { setYrYeniPozisyon(poz); setYrYeniAd(""); }}>
                                <Plus size={11} /> Yeni
                              </button>
                            )}
                          </span>
                        );
                      })()}
                      {yrYeniPozisyon === poz && (
                        <span style={{ display: "flex", gap: 4, marginTop: 3 }}>
                          <input
                            autoFocus
                            value={yrYeniAd}
                            onChange={(e) => setYrYeniAd(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") { setYrYeniPozisyon(null); setYrYeniAd(""); }
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              yeniMamulRengiOlustur(poz);
                            }}
                            placeholder="örn. Bordo"
                            style={{ ...inputStyle, width: 105, padding: "5px 7px", fontSize: 12 }}
                          />
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ padding: "5px 8px", fontSize: 11 }}
                            onClick={() => yeniMamulRengiOlustur(poz)}
                          >
                            <Check size={12} />
                          </button>
                        </span>
                      )}
                    </label>
                  ))}
                </div>

                {onizleme && (
                  <div style={{ fontSize: 12, color: "var(--erp-text)", marginBottom: 10 }}>
                    Model rengi: <b className="mono">{onizleme}</b>
                    <span style={{ color: "var(--erp-text-3)" }}> — kod otomatik atanır</span>
                  </div>
                )}

                <div style={{ marginBottom: 10, maxWidth: 320 }}>
                  <Field label="Reçeteyi şu renkten kopyala">
                    <select
                      value={yrKaynakRenk}
                      onChange={(e) => { setYrKaynakRenk(e.target.value); setYrHammaddeRenkleri({}); }}
                      style={inputStyle}
                    >
                      <option value="">Kopyalama (boş reçete)</option>
                      {renkSecenekleri.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Field>
                </div>

                {yrKaynakRenk && gruplar.length === 0 && (
                  <div style={{ fontSize: 11, color: "var(--erp-warn)", marginBottom: 10 }}>
                    "{yrKaynakRenk}" renginin de reçetesi yok — kopyalanacak satır bulunamadı.
                  </div>
                )}

                {gruplar.length > 0 && (
                  <div style={{ background: "#fff", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 8, marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: "var(--erp-text-2)", fontWeight: 700, marginBottom: 6 }}>
                      Kopyalanacak reçete — hammadde renklerini yeni renge göre ayarlayın
                    </div>
                    <div style={{ display: "grid", gap: 5 }}>
                      {gruplar.map((g) => {
                        const hm = (stok || []).find((x) => x.id === g.ornek.hammaddeUrunId);
                        const secenekler = hm ? Array.from(new Set(hm.variants.map((v) => v.renk))) : [];
                        // "kutu" rozeti yalnızca DEĞİŞKEN ambalaj satırında: sabit ambalaj satırının
                        // rengi reçetede belirleniyor, siparişteki kutu seçimi onu değiştirmiyor.
                        const ambalajMi = ambalajDegiskenSatirMi(g.ornek, hm);
                        // Satır bir POZİSYONA aitse (aciklama "2. Renk"), o pozisyon için seçilen renk
                        // varsayılan olarak önerilir — model rengiyle reçete arasındaki bağ budur ve
                        // elle tek tek seçmeyi çoğu durumda gereksiz kılar.
                        const pozNo = parseInt((g.ornek.aciklama || "").match(/^(\d+)\./)?.[1] || "", 10);
                        const pozRenkAdi = Number.isFinite(pozNo) ? secilenAdlar[pozNo - 1] : null;
                        const onerilen = pozRenkAdi && secenekler.includes(pozRenkAdi) ? pozRenkAdi : g.ornek.renk;
                        const secili = yrHammaddeRenkleri[g.ornek.id] || onerilen;
                        return (
                          <div key={g.key} style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                            <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text)", minWidth: 118 }}>
                              {g.ornek.hammaddeAd}
                              {ambalajMi && (
                                <span style={{ fontSize: 9, fontWeight: 700, color: "var(--erp-brown)", background: "#8A5A3818", padding: "1px 6px", borderRadius: "var(--erp-r-pill)", marginLeft: 5 }}>kutu</span>
                              )}
                            </span>
                            {g.ornek.aciklama && (
                              <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: "var(--erp-purple)", background: "#6B4E8A18", padding: "1px 6px", borderRadius: "var(--erp-r-pill)" }}>
                                {g.ornek.aciklama}
                              </span>
                            )}
                            {g.ornek.proses && (
                              <span className="mono" style={{ fontSize: 9, color: prosesRengi(g.ornek.proses), background: alfaEkle(prosesRengi(g.ornek.proses), "1A"), padding: "1px 6px", borderRadius: "var(--erp-r-pill)" }}>
                                {g.ornek.proses}
                              </span>
                            )}
                            <ArrowRight size={11} color="var(--erp-text-3)" />
                            <select
                              value={secili}
                              onChange={(e) => {
                                const yeni = { ...yrHammaddeRenkleri };
                                g.satirlar.forEach((r) => { yeni[r.id] = e.target.value; });
                                setYrHammaddeRenkleri(yeni);
                              }}
                              className="mono"
                              style={{ ...inputStyle, width: 130, padding: "4px 6px", fontSize: 12 }}
                            >
                              {secenekler.length === 0 && <option value={g.ornek.renk}>{g.ornek.renk}</option>}
                              {secenekler.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)" }}>
                              {g.ornek.miktar} {g.ornek.birim} · {g.satirlar.length} beden
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  className="btn-primary btn-save"
                  disabled={!tumPozisyonlarDolu}
                  style={{ padding: "7px 13px", fontSize: 12 }}
                  onClick={() => {
                    // Pozisyon önerilerini de gönderiyoruz: kullanıcı elle değiştirmediği satırlar
                    // için pozisyon rengi kullanılsın, ekranda görünenle kaydedilen aynı olsun.
                    const renkIdler = pozisyonlar.map((poz) => yrPozisyonlar[poz]);
                    const etkinRenkler = { ...yrHammaddeRenkleri };
                    gruplar.forEach((g) => {
                      if (etkinRenkler[g.ornek.id]) return;
                      const hm = (stok || []).find((x) => x.id === g.ornek.hammaddeUrunId);
                      const secenekler = hm ? Array.from(new Set(hm.variants.map((v) => v.renk))) : [];
                      const pozNo = parseInt((g.ornek.aciklama || "").match(/^(\d+)\./)?.[1] || "", 10);
                      const pozRenkAdi = Number.isFinite(pozNo) ? secilenAdlar[pozNo - 1] : null;
                      if (pozRenkAdi && secenekler.includes(pozRenkAdi)) {
                        g.satirlar.forEach((r) => { etkinRenkler[r.id] = pozRenkAdi; });
                      }
                    });
                    const etiket = onModelRengiVeRecete(seciliUrun.id, renkIdler, yrKaynakRenk || null, etkinRenkler);
                    if (!etiket) return;
                    setKRenk(etiket);
                    setKMiktarlar({});
                    setYeniRenkPaneli(false);
                    setYrPozisyonlar({}); setYrPozisyonYazi({}); setYrHammaddeRenkleri({});
                  }}
                >
                  <Save size={13} /> Model rengini ve reçetesini ekle
                </button>
              </div>
            );
          })()}

          {/* REÇETE DURUMU — kalem eklenmeden ÖNCE görünür. Reçetesi olmayan bir renk için sipariş
              girmek hammadde ihtiyacını SIFIR gösterir; eksik ancak üretim aşamasında, iş işten
              geçtikten sonra fark edilir. Buradaki bağlantı ürün kartını doğrudan reçete sekmesinde
              açar, böylece yeni renk eşleştirmesi sipariş ekranından ayrılmadan yapılabilir. */}
          {seciliRenkReceteDurumu && seciliRenkReceteDurumu.durum !== "tamam" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "var(--erp-orange-bg)", border: "1.5px solid #E1611F", borderRadius: "var(--erp-r-md)", padding: "8px 10px", marginBottom: 10 }}>
              <AlertTriangle size={14} color="var(--erp-warn)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#7A3B22", flex: 1, minWidth: 200 }}>
                {seciliRenkReceteDurumu.durum === "recetesiz"
                  ? <><b>{seciliUrun.ad}</b> için hiç reçete tanımlı değil — bu siparişten hammadde ihtiyacı hesaplanamaz.</>
                  : seciliRenkReceteDurumu.durum === "hammaddeEksik"
                    ? <><b>{kRenk}</b> rengi için şu hammaddelerin eşleşmesi yok: <b>{seciliRenkReceteDurumu.eksikHammaddeler.join(", ")}</b>. Üretimde bu hammaddeler düşülmez.</>
                    : <><b>{kRenk}</b> rengi için reçete eşleştirmesi yok. Sipariş girilebilir ama bu renk hammadde ihtiyacı üretmez.</>}
              </span>
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: "5px 10px", fontSize: 11, borderColor: "var(--erp-warn)", color: "var(--erp-warn)" }}
                onClick={() => onUruneGit && onUruneGit(seciliUrun.id, "recete", {
                  // Alış ve satış ayrı ana sekmelerde; hangisinden gelindiyse oraya dönülür.
                  tab: tip === "Alış" ? "satinalma" : "siparis",
                  etiket: tip === "Alış" ? "Satın Almaya dön" : "Siparişe dön",
                })}
              >
                <ArrowRight size={12} /> Reçeteyi aç
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* SABİT ORANLAR (1.4fr 0.9fr 0.8fr) DAR EKRANDA ÇÖKÜYORDU: Renk sütununa düşen pay,
                içindeki "+ Renk" düğmesi kırılmadığı için seçiciye ~50 px bırakıyordu — seçili renk
                okunamıyordu (kullanıcı bildirdi, 6 Eylül).
                `auto-fit` + `minmax`: her sütunun bir ALT SINIRI var; sığmayınca sütun daralmıyor,
                ALT SATIRA iniyor. Geniş ekranda üçü yan yana, dar ekranda alt alta. */}
            {/* FİYAT DA ÜST SATIRDA (v1.470.0 — kullanıcı: "birim fiyatı, para tipini üst satıra al,
                gerekirse yazıları ufalt"). Eşit sütunlu ızgara fiyatı ürün/renk kadar geniş istiyordu ve
                tablet genişliğinde üçüncü sütun alt satıra düşüyordu. Esnek satır: ürün ve renk geniş,
                fiyat dar (alt sınırları var); sığmayan yine alt satıra iner, telefonda alt alta. */}
            <div style={{
              flex: "1 1 320px", minWidth: 0,
              display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start",
            }}>
              <div style={{ flex: "1.5 1 180px", minWidth: 0 }}>
              <Field label="Ürün">
                {/* Sipariş girişinde de aramalı seçici: stok büyüdükçe açılır listeden ürün bulmak
                    reçetedeki kadar yavaşlıyor ve sipariş girişi seri yapılan bir iş. */}
                <AramaliUrunSecici
                  urunler={urunUygun}
                  seciliId={kUrunId}
                  onSec={urunSec}
                  placeholder={tip === "Alış" ? "Ürün ara…" : "Model ara…"}
                  ozelKodAlanlari={tanimlarOzelKodAlanlari}
                />
              </Field>
              </div>
              {!renkSorulmaz && (
              <div style={{ flex: "1.5 1 180px", minWidth: 0 }}>
              <Field label="Renk">
                {/* Düğme KIRILABİLİR: sığmazsa seçiciyi ezmek yerine alt satıra geçiyor.
                    Seçicinin alt sınırı var, çünkü asıl iş onda. */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {/* RENK YAZARAK + RESİMLİ (v1.469.0 — kullanıcı: "stok renk resimleri tanımlı ise renk
                      içinde resim göstersin, yazdıkça daralan liste"). Kutudaki metin ayrı tutuluyor
                      (`kRenkYazi`); `kRenk` yalnız listedeki bir renk seçilince değişiyor — yarım
                      yazım miktar matrisini ve kalemi bozmasın. */}
                  <div style={{ flex: "1 1 160px", minWidth: 140 }}>
                    <AramaliMetin
                      veriAdi="data-siparis-renk-arama"
                      deger={kRenkYazi}
                      onDegis={(v) => {
                        setKRenkYazi(v);
                        const gecerli = renkSecenekleri.includes(v) ? v : "";
                        if (gecerli !== kRenk) { setKRenk(gecerli); setKMiktarlar({}); }
                      }}
                      oneriler={renkSecenekleri}
                      resimler={(seciliUrun && seciliUrun.renkResimleri) || {}}
                      yalnizListeden
                      disabled={!seciliUrun}
                      placeholder={seciliUrun ? "Renk yazın ya da seçin…" : "Önce ürün seçin"}
                    />
                  </div>
                  {/* Aranan renk stokta yoksa sipariş girişini bırakıp Stok ekranına gitmek, oradan
                      renk ekleyip reçetesini kurmak ve geri dönmek gerekiyordu. Bu düğme aynı işi
                      sipariş ekranından yaptırır — renk ve reçete TEK adımda kurulur. */}
                  {seciliUrun && seciliUrun.kategori === "Mamul" && onModelRengiVeRecete && (
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: "8px 9px", fontSize: 11, whiteSpace: "nowrap", flex: "0 0 auto" }}
                      title="Bu ürüne yeni renk ekle ve reçetesini mevcut bir renkten kopyala"
                      onClick={() => {
                        setYeniRenkPaneli((v) => !v);
                        setYrRenkSayisi(1);
                        setYrPozisyonlar({});
                        setYrPozisyonYazi({});
                        setYrKaynakRenk(renkSecenekleri[0] || "");
                        setYrHammaddeRenkleri({});
                      }}
                    >
                      <Plus size={12} /> Renk
                    </button>
                  )}
                </div>
              </Field>
              </div>
              )}
              <div style={{ flex: "0.8 1 140px", minWidth: 0 }}>
              <Field label={<span title="Bu kalemin bütün ölçüleri için">Birim Fiyat</span>}>
                <div style={{ display: "flex", gap: 4 }}>
                  <input type="number" step="0.01" min="0" value={kFiyat} onChange={(e) => setKFiyat(e.target.value)}
                    data-siparis-birim-fiyat="1" placeholder="0"
                    style={{ ...inputStyle, flex: "1 1 60px", minWidth: 50, fontSize: 13, padding: "8px 6px" }} />
                  <select value={kParaBirimi} onChange={(e) => setKParaBirimi(e.target.value)}
                    style={{ ...inputStyle, width: 62, flex: "0 0 auto", fontSize: 12, padding: "8px 4px" }}>
                    {MUHASEBE_PARA_BIRIMLERI.map((pb) => <option key={pb} value={pb}>{pb}</option>)}
                  </select>
                </div>
              </Field>
              </div>

              {/* KUTU — ürün/renk seçimiyle AYNI satırda. Kutu, modele ve renge göre değişen bir
                  tercihtir: aynı siparişte iki farklı model iki farklı kutuya girebilir. Bu yüzden
                  sipariş başlığında değil, kalem eklerken seçilir. Başlıktaki seçim varsayılan
                  olarak kalır — kalem kendi tercihini belirtmezse o kullanılır. */}
              {/* Yalnızca RENK seçilir; hangi ambalaj ÜRÜNÜ olduğu reçeteden gelir ve değişmez.
                  Kutu ürünü seçtirmek gereksiz bir adımdı: reçete zaten hangi kutunun kullanıldığını
                  biliyor, değişen tek şey rengi. */}
              {tip === "Satış" && kAmbalajRenkleri.length > 0 && (
                <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                <Field label="Kutu rengi (bu kalem için)">
                  <select
                    value={kAmbalajRenk}
                    onChange={(e) => setKAmbalajRenk(e.target.value)}
                    style={inputStyle}
                    title="Reçetedeki ambalaj renginin yerine geçer. Boş bırakılırsa reçetedeki renk kullanılır."
                  >
                    <option value="">Reçetedeki kutu rengi</option>
                    {kAmbalajRenkleri.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
                </div>
              )}
            </div>
            {/* Ürün resmi küçük ve sağ üstte — önceden 144px ile çok yer kaplıyor, form alanlarının
                okunabilirliğini bozuyordu. Seçili ürünü/rengi doğrulamak için küçük önizleme yeterli. */}
            {seciliUrun && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0 }}>
                <ColorSwatch
                  src={(kRenk && (seciliUrun.renkResimleri || {})[kRenk]) || seciliUrun.kapakResmi}
                  editable={false}
                  size={56}
                />
                <span style={{ fontSize: 10, color: "var(--erp-text-2)", textAlign: "center", maxWidth: 90 }}>{seciliUrun.ad}{kRenk ? ` · ${kRenk}` : ""}</span>
              </div>
            )}
          </div>

          {kRenk && bedenSecenekleri.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600, marginBottom: 6 }}>
                Ölçülere göre miktar girin (birden fazla ölçüye birden girebilirsiniz)
              </div>
              {/* ASORTİ + AÇIKLAMA + EKLE TEK SATIRDA (v1.470.0 — kullanıcı: "asorti ve asorti seçiciyi
                  tek satıra topla, kalemlere ekle'nin adını Ekle yap, rengi yeşil olsun"). Asorti eskiden
                  matrisin solunda kesikli çizgiyle ayrı bir sütundu; dar ekranda matris onun altına,
                  "Kalemlere Ekle" de en sağ alta düşüyordu. Şimdi üstte tek satır, matris altında tam
                  genişlikte. Açıklama RENK BAZINDA (kullanıcı: "renk bazlı açıklama girebilelim, tek
                  tek"): bu ürün+rengin bütün ölçülerine yazılıyor, kalem listesinde satırda düzeltiliyor. */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                <AsortiUygulaKontrolu
                  asortiler={asortiler}
                  bedenSecenekleri={bedenSecenekleri}
                  olcuTipi={seciliUrun && seciliUrun.olcuTipi}
                  onUygula={(sonuc) => setKMiktarlar({ ...kMiktarlar, ...sonuc })}
                  satirIci
                />
                {/* PROSES BAZLI NOT (v1.476.0 — kullanıcı: "kesim için 'deriyi iyi yerinden kes', temizleme
                    için 'her tek poşete konacak'"). Proses "Genel" ya da reçetedeki bir proses; üretimde
                    o prosesin satırında görünür. Birden çok not "+" ile eklenir. */}
                <div data-siparis-kalem-notlari="1" style={{ flex: "1 1 240px", minWidth: 200 }}>
                  <KalemNotDuzenleyici key={kNotAnahtar} notlar={kNotlar} prosesler={notProsesleri(seciliUrun, kRenk)}
                    onDegis={setKNotlar} onTaslak={setKNotTaslak} />
                </div>
                <button type="button" data-kalemlere-ekle="1" onClick={kalemEkle} style={EKLE_DUGMESI}>
                  <PackagePlus size={15} /> Ekle
                </button>
              </div>
              <div>
                <div style={{ overflowX: "auto" }}>
                {/* `width: auto`: eskiden esnek satırın içinde kendiliğinden daralıyordu; tek başına
                    kalınca genel tablo kuralıyla tam genişliğe yayılıp hücreleri birbirinden koparıyordu. */}
                <table style={{ borderCollapse: "collapse", width: "auto" }}>
                  <thead>
                    <tr>
                      {bedenSecenekleri.map((b) => (
                        <th key={b} className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text)", padding: "3px 8px", textAlign: "center", borderBottom: "1px solid var(--erp-line-soft)" }}>
                          {olcuGoster(b, "Miktar")}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {bedenSecenekleri.map((b) => {
                        const mevcutStok = stokMiktari(seciliUrun, kRenk, b);
                        return (
                          <td key={b} className="mono" style={{ fontSize: 9, fontWeight: 600, color: mevcutStok <= 0 ? "var(--erp-warn)" : "var(--erp-text-3)", padding: "2px 8px", textAlign: "center" }}>
                            stok: {mevcutStok}
                          </td>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {bedenSecenekleri.map((b) => (
                        <td key={b} style={{ padding: "3px 8px", textAlign: "center" }}>
                          <input
                            type="number"
                            min="0"
                            value={kMiktarlar[b] || ""}
                            data-olcu-miktar={b}
                            onChange={(e) => setKMiktarlar({ ...kMiktarlar, [b]: e.target.value })}
                            style={{ ...inputStyle, width: 56, textAlign: "center", padding: "5px" }}
                          />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      {bedenSecenekleri.map((b) => {
                        const { fiyat: bedenFiyati, kaynak: bedenKaynak, paraBirimi: bedenPb } = fiyatBul(seciliUrun, kRenk, b, cariId, tip, cariler);
                        const bedenSembol = PARA_SEMBOLU[bedenPb] || bedenPb || "₺";   // kuralın kendi birimi (v1.481.0)
                        const girilenFiyat = parseFloat(kFiyat) || 0;
                        const fiyatFarkli = bedenKaynak !== "Genel" && bedenFiyati !== girilenFiyat;
                        return (
                          <td key={b} style={{ padding: "2px 8px", textAlign: "center" }}>
                            {fiyatFarkli && (
                              <button
                                type="button"
                                title={`${bedenKaynak} kuralına göre bu beden için özel fiyat: ${bedenFiyati} ${bedenSembol}. Uygulamak için tıklayın.`}
                                onClick={() => { setKFiyat(String(bedenFiyati)); if (bedenPb) setKParaBirimi(bedenPb); }}
                                className="mono"
                                style={{ fontSize: 9, fontWeight: 700, color: "#8A6A2E", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                              >
                                özel: {bedenFiyati}{bedenSembol}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>
              <AsortiOlusturTeklifi
                degerler={kMiktarlar}
                bedenSecenekleri={bedenSecenekleri}
                asortiler={asortiler}
                onOlustur={onAsortiOlustur}
              />
            </div>
          )}

          {!(kRenk && bedenSecenekleri.length > 0) && (
            <div style={{ marginTop: 10 }}>
              <button type="button" onClick={kalemEkle} style={EKLE_DUGMESI}><PackagePlus size={15} /> Ekle</button>
            </div>
          )}

          {kalemler.length > 0 && (() => {
            // Satırlar = Ürün+Renk grubu, sütunlar = o gruptaki tüm bedenlerin birleşimi. Aynı ürün+renk
            // için farklı bedenler tek satırda yan yana görünür — kart kart / satır satır tekrar etmez.
            const gruplar = [];
            const grupIndex = {};
            // KİLİTLİ KALEMLER AYRI SATIRDA (düzenleme, 25 Eylül): planlanmış/teslim alınmış bir
            // kalemle bekleyen bir kalem aynı ürün+renkte olabilir; tek satırda dursalar ürün/renk
            // seçicisi kilitliyi de değiştirecekmiş gibi görünürdü.
            kalemler.forEach((k) => {
              const kilit = kalemKilitSebebi(k);
              // Kilit SEBEBİ anahtarda: planlanmış ile teslim alınmış ayrı satırda, etiketi doğru kalsın.
              const key = `${k.urunId || k.urunAd}__${k.renk}__${kilit || "serbest"}`;
              if (!(key in grupIndex)) {
                grupIndex[key] = gruplar.length;
                gruplar.push({ key, urunId: k.urunId, urunAd: k.urunAd, renk: k.renk, kilit, kalemler: [] });
              }
              gruplar[grupIndex[key]].kalemler.push(k);
            });
            const tumBedenler = Array.from(new Set(kalemler.map((k) => k.beden)));

            return (
            <div style={{ marginTop: 12 }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ fontSize: 11, textAlign: "left", padding: "4px 8px" }}>Ürün</th>
                      <th style={{ fontSize: 11, textAlign: "left", padding: "4px 8px" }}>Renk</th>
                      {tumBedenler.map((b) => (
                        <th key={b} style={{ fontSize: 11, textAlign: "center", padding: "4px 8px", whiteSpace: "nowrap" }}>{olcuGoster(b, "Miktar")}</th>
                      ))}
                      <th style={{ fontSize: 11, textAlign: "right", padding: "4px 8px", borderLeft: "1px dashed var(--erp-line)" }}>Birim Fiyat</th>
                      <th style={{ fontSize: 11, textAlign: "right", padding: "4px 8px" }}>Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gruplar.map((g) => {
                      const birimFiyatlarFarkli = new Set(g.kalemler.map((k) => k.birimFiyat)).size > 1;
                      const grupTutar = g.kalemler.reduce((s, k) => s + k.miktar * k.birimFiyat, 0);
                      const urun = urunUygun.find((p) => p.id === g.urunId) || urunUygun.find((p) => p.ad === g.urunAd);
                      const gorsel = urun ? ((urun.renkResimleri || {})[g.renk] || urun.kapakResmi) : null;
                      const idler = g.kalemler.map((k) => k.id);
                      const renkSecenekleri = urunRenkleri(urun);
                      const renkEksik = !g.kilit && renkSecenekleri.length > 0 && !g.renk;
                      return (
                        <tr key={g.key} data-form-kalem-satiri={g.kilit ? "kilitli" : "serbest"} style={{ borderTop: "1px solid var(--erp-line-soft)", background: g.kilit ? "var(--erp-panel-2)" : undefined }}>
                          <td style={{ padding: "6px 8px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <ColorSwatch src={gorsel} editable={false} size={26} />
                              {/* ÜRÜN (STOK) DEĞİŞTİRİLEBİLİR — yalnız kilitsiz satırda. Kilitli satırda
                                  kilit ikonu ve sebebi (planlanmış / teslim alınmış) ipucunda. */}
                              {g.kilit ? (
                                <span title={g.kilit} data-kilitli-kalem="1" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                  {g.urunAd}
                                  {/* NEDEN KİLİTLİ, satırın üstünde yazıyor: ikon tek başına "neden
                                      değiştiremiyorum" sorusunu cevaplamıyordu. */}
                                  <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "var(--erp-brown)", background: "#8A5A3818", padding: "1px 7px", borderRadius: "var(--erp-r-pill)" }}>
                                    <Lock size={10} />
                                    {g.kalemler.some((k) => k.planlama) ? "planlandı" : "teslim alındı"}
                                  </span>
                                </span>
                              ) : (
                                <select
                                  value={urun ? urun.id : ""}
                                  onChange={(e) => grupUrunDegistir(idler, e.target.value)}
                                  data-form-kalem-urun="1"
                                  title="Ürünü değiştir — renk yeni üründe yoksa yeniden seçilmeli"
                                  style={{ padding: "3px 4px", fontSize: 12, fontWeight: 600, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", maxWidth: 200 }}
                                >
                                  {!urun && <option value="">{g.urunAd} (listede yok)</option>}
                                  {urunUygun.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
                                </select>
                              )}
                            </span>
                          </td>
                          <td className="mono" style={{ padding: "6px 8px", fontSize: 12, whiteSpace: "nowrap" }}>
                            {g.kilit || renkSecenekleri.length === 0 ? olcuGoster(g.renk) : (
                              <select
                                value={g.renk || ""}
                                onChange={(e) => e.target.value && grupDegistir(idler, { renk: e.target.value })}
                                data-form-kalem-renk="1"
                                title="Rengi değiştir — bu satırdaki bütün ölçülere uygulanır"
                                style={{ padding: "3px 4px", fontSize: 12, border: `1px solid ${renkEksik ? "var(--erp-danger, #B3261E)" : "var(--erp-line)"}`, borderRadius: "var(--erp-r-sm)" }}
                              >
                                {renkEksik && <option value="">Renk seçin…</option>}
                                {/* Kayıtlı renk üründe artık yoksa "(listede yok)" olarak kalıyor — yoksa
                                    tarayıcı ilk seçeneği gösterir ve kayıt sessizce başka renge döner. */}
                                {g.renk && !renkSecenekleri.includes(g.renk) && <option value={g.renk}>{olcuGoster(g.renk)} (listede yok)</option>}
                                {renkSecenekleri.map((r) => <option key={r} value={r}>{olcuGoster(r)}</option>)}
                              </select>
                            )}
                            {/* Kutu rozeti taslak listede de görünür: kalem eklendikten sonra
                                hangisine hangi kutunun atandığını kontrol etmek, siparişi
                                kaydetmeden önce yapılabilmeli. */}
                            {(() => {
                              const kutu = (g.kalemler.find((x) => x.ambalaj && x.ambalaj.renk) || {}).ambalaj;
                              if (!kutu) return null;
                              return (
                                <span
                                  className="mono"
                                  title={`Bu kalemin kutusu: ${kutu.renk}`}
                                  style={{ fontSize: 9, fontWeight: 700, color: "var(--erp-brown)", background: "#8A5A3818", padding: "1px 6px", borderRadius: "var(--erp-r-pill)", marginLeft: 5, whiteSpace: "nowrap" }}
                                >
                                  {kutu.renk}
                                </span>
                              );
                            })()}
                            {/* RENK BAZLI NOTLAR SATIRDA (v1.470.0 → v1.476.0 proses bazlı): bu ürün+rengin bütün
                                ölçülerine yazılır. Kilitli (planlanmış) satırda da düzenlenir — üretim notu
                                siparişten canlı okuyor (`grupNotDegistir`). */}
                            <div data-form-kalem-notlari="1" style={{ marginTop: 3, minWidth: 200, whiteSpace: "normal" }}>
                              <KalemNotDuzenleyici notlar={grupNotlari(g.kalemler)} prosesler={notProsesleri(urun, g.renk)}
                                onDegis={(yeni) => grupNotDegistir(idler, yeni)} kucuk />
                            </div>
                          </td>
                          {tumBedenler.map((b) => {
                            const k = g.kalemler.find((x) => x.beden === b);
                            if (!k) return <td key={b} style={{ padding: "4px 6px", textAlign: "center" }}><span style={{ fontSize: 11, color: "var(--erp-border)" }}>—</span></td>;
                            if (g.kilit) {
                              return (
                                <td key={b} className="mono" title={g.kilit} style={{ padding: "4px 6px", textAlign: "center", fontSize: 12, fontWeight: 600 }}>
                                  {k.miktar}
                                </td>
                              );
                            }
                            return (
                              <td key={b} style={{ padding: "4px 6px", textAlign: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                                  <input
                                    key={`${k.id}-${k.miktar}`}
                                    type="number" step="0.01" min="0"
                                    defaultValue={k.miktar}
                                    onBlur={(e) => {
                                      const yeni = parseFloat(e.target.value);
                                      if (!(yeni > 0) || yeni === k.miktar) return;
                                      kalemDuzenle(k.id, "miktar", yeni);
                                    }}
                                    className="mono"
                                    style={{ width: 48, padding: "3px 4px", fontSize: 11, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", textAlign: "center" }}
                                  />
                                  <button
                                    onClick={() => kalemSil(k.id)}
                                    title="Bu bedeni sil"
                                    style={{ border: "none", background: "none", color: "var(--erp-text-3)", cursor: "pointer", display: "flex", padding: 0 }}
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              </td>
                            );
                          })}
                          <td style={{ padding: "6px 8px", textAlign: "right", borderLeft: "1px dashed var(--erp-line)" }}>
                            {g.kilit ? (
                              <span className="mono" title={g.kilit} style={{ fontSize: 12 }}>
                                {birimFiyatlarFarkli ? "farklı" : `${g.kalemler[0].birimFiyat} ${g.kalemler[0].paraBirimi || "TRY"}`}
                              </span>
                            ) : birimFiyatlarFarkli ? (
                              <span title="Bu gruptaki bedenler farklı birim fiyatlara sahip — hücre bazında düzenleyin" style={{ fontSize: 10, color: "var(--erp-warn)" }}>
                                farklı
                              </span>
                            ) : (
                              <div style={{ display: "flex", gap: 3, justifyContent: "flex-end" }}>
                                <input
                                  key={`${g.key}-${g.kalemler[0].birimFiyat}-${g.kalemler[0].paraBirimi}`}
                                  type="number" step="0.01" min="0"
                                  defaultValue={g.kalemler[0].birimFiyat}
                                  onBlur={(e) => {
                                    const yeni = parseFloat(e.target.value);
                                    if (!(yeni >= 0) || yeni === g.kalemler[0].birimFiyat) return;
                                    // Bu gruptaki (aynı ürün+renk) TÜM bedenlerin birim fiyatı tek seferde güncellenir.
                                    g.kalemler.forEach((k) => kalemDuzenle(k.id, "birimFiyat", yeni));
                                  }}
                                  className="mono"
                                  style={{ width: 60, padding: "3px 5px", fontSize: 12, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", textAlign: "right" }}
                                />
                                <select
                                  value={g.kalemler[0].paraBirimi || "TRY"}
                                  onChange={(e) => g.kalemler.forEach((k) => kalemDuzenle(k.id, "paraBirimi", e.target.value))}
                                  className="mono"
                                  style={{ width: 56, padding: "3px 2px", fontSize: 11, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)" }}
                                >
                                  {MUHASEBE_PARA_BIRIMLERI.map((pb) => <option key={pb} value={pb}>{pb}</option>)}
                                </select>
                              </div>
                            )}
                          </td>
                          <td className="mono" style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>
                            {grupTutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {PARA_SEMBOLU[g.kalemler[0].paraBirimi || "TRY"] || g.kalemler[0].paraBirimi}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ textAlign: "right", marginTop: 8, fontSize: 14, fontWeight: 700 }}>
                {(() => {
                  // Farklı para birimlerindeki kalemleri TOPLAMAK anlamsız olduğu için, kalem para
                  // birimleri farklıysa toplam da her para birimi için AYRI AYRI gösterilir.
                  const pbToplamlari = {};
                  gruplar.forEach((g) => {
                    const pb = g.kalemler[0].paraBirimi || "TRY";
                    pbToplamlari[pb] = (pbToplamlari[pb] || 0) + g.kalemler.reduce((s, k) => s + k.miktar * k.birimFiyat, 0);
                  });
                  const pbler = Object.keys(pbToplamlari);
                  const pb = pbler[0] || "TRY";
                  return (
                    <>
                      {pbler.length <= 1 ? (
                        <>Toplam: <span className="mono">{(pbToplamlari[pb] || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {PARA_SEMBOLU[pb] || pb}</span></>
                      ) : (
                        <span>
                          Toplam:{" "}
                          {pbler.map((p, i) => (
                            <span key={p} className="mono">
                              {i > 0 && " + "}{pbToplamlari[p].toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {PARA_SEMBOLU[p] || p}
                            </span>
                          ))}
                        </span>
                      )}
                      {/* Kalem satırlarının kendi fiyatı/para birimi HİÇ DEĞİŞTİRİLMEZ — bu panel sadece
                          fişin GENEL toplamını, kur üzerinden TEK bir para biriminde HESAPLAYIP GÖSTERİR
                          (görüntüleme amaçlı, kalemlere geri yazılmaz). Tek para birimi olsa bile
                          gösterilir — kullanıcı isterse o tek toplamı da başka bir para birimine çevirebilir.
                          Seçim, form seviyesindeki state'e (kayitParaBirimi/kayitKurlari) yazılır ve
                          "Sipariş Kaydet" ile birlikte GERÇEKTEN siparişe kaydedilir — artık sadece bu
                          ekran açıkken geçerli olan, kaydedince kaybolan geçici bir önizleme DEĞİLDİR. */}
                      <FisToplamCeviriPaneli
                        pbToplamlari={pbToplamlari}
                        kurlar={kurlar}
                        deger={{ kayitParaBirimi, kayitKurlari }}
                        onDegistir={(yeni) => { setKayitParaBirimi(yeni.kayitParaBirimi); setKayitKurlari(yeni.kayitKurlari); }}
                      />
                    </>
                  );
                })()}
              </div>
            </div>
            );
          })()}

          <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Field label="Not">
              <input value={not} onChange={(e) => setNot(e.target.value)} placeholder="Opsiyonel" style={inputStyle} />
            </Field>
            <Field label="Cari Defteri">
              <select value={siparisDefter} onChange={(e) => setSiparisDefter(e.target.value)} style={{ ...inputStyle, width: 190 }}>
                <option value="Genel">Genel</option>
                <option value="Resmi">Resmi</option>
                <option value="Muhasebe">Muhasebe (ikisine de)</option>
              </select>
            </Field>
          </div>

          {/* DÜZENLEMEDE DÜĞME BAŞKA İŞ YAPAR. Aynı formun iki sonucu olduğu için düğmenin adı
              da değişiyor: "Siparişi Kaydet"e basıp var olan siparişe eklendiğini fark etmek
              (ya da tersi) geri alınması zahmetli bir sürpriz olurdu. */}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {duzenlenenId ? (
              <button className="btn-primary btn-save" onClick={siparisDuzenlemeKaydet} data-siparis-duzenle-kaydet="1">
                <Save size={14} /> {(siparisler.find((s) => s.id === duzenlenenId) || {}).siparisNo} Değişikliklerini Kaydet
              </button>
            ) : (
              <button className="btn-primary btn-save" onClick={siparisKaydet}>
                <Save size={14} /> {tip === "Alış" ? "Satın Almayı Kaydet" : "Siparişi Kaydet"}
              </button>
            )}
            <button
                          className="btn-ghost" onClick={() => (duzenlenenId ? duzenlemedenCik() : (setShowForm(false), resetForm()))}>
              <X size={14} /> Vazgeç
            </button>
          </div>
        </div>
        </div>
      )}

      {/* SIKI ÜST (kullanıcı, 13 Eylül: "sekmeler, üst bilgiler çok yer kaplıyor"): arama ve
          "Yeni Sipariş" tek satırda; modül alt başlığı sekme satırına küçük metin olarak; dolgular küçük. */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
      <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 420 }}>
        <Search size={14} style={{ position: "absolute", left: 9, top: 8, color: "var(--erp-text-3)" }} />
        <input
          value={siparisArama}
          onChange={(e) => setSiparisArama(e.target.value)}
          placeholder={ustSekme === "raporlar" ? "Raporda ara — cari, ürün, renk, sipariş no, aşama…" : "Cari, ürün, renk, sipariş no veya müşteri kodu ara…"}
          style={{
            width: "100%", padding: "6px 8px 6px 28px", borderRadius: "var(--erp-r-md)",
            border: "1px solid var(--erp-line)", background: "var(--erp-panel)", fontSize: 13,
          }}
        />
        {siparisArama && (
          <button
            type="button"
            onClick={() => setSiparisArama("")}
            style={{ position: "absolute", right: 8, top: 7, border: "none", background: "none", color: "var(--erp-text-3)", cursor: "pointer", display: "flex" }}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {ustSekme !== "raporlar" && (
        <button
          data-yeni-siparis="1"
          className="btn-primary"
          style={{ padding: "6px 12px", fontSize: 12, marginLeft: "auto" }}
          onClick={() => {
            if (cariler.length === 0) {
              showToast(siparisSekme === "alis" ? "Önce Cari ekranından tedarikçi ekleyin" : "Önce Cari ekranından müşteri ekleyin");
              onGoToCari();
              return;
            }
            setTip(siparisSekme === "alis" ? "Alış" : "Satış");
            setShowForm((v) => !v);
          }}
        >
          {/* "Satın Alma" değil "Alış Siparişi" (kullanıcı, 10 Eylül): ekranın adı Alış Siparişi,
              düğmenin başka bir ad kullanması hangi kaydın oluşacağını belirsizleştiriyordu. */}
          <Plus size={14} /> {siparisSekme === "alis" ? "Yeni Alış Siparişi" : "Yeni Sipariş"}
        </button>
      )}
      </div>

      {/* ÜST SEKME: Liste · Raporlar — sağda modül alt başlığı (20px h2 yerine küçük metin) */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8, borderBottom: "1px solid var(--erp-line)", alignItems: "center" }}>
        {[{ key: "liste", ad: "Liste" }, { key: "raporlar", ad: "Raporlar" }].map((t) => (
          <button key={t.key} type="button" data-ust-sekme={t.key} onClick={() => setUstSekme(t.key)}
            style={{
              padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", background: "none",
              border: "none", borderBottom: `3px solid ${ustSekme === t.key ? "var(--erp-text)" : "transparent"}`,
              color: ustSekme === t.key ? "var(--erp-text)" : "var(--erp-text-3)",
            }}>
            {t.ad}
          </button>
        ))}
        {sabitTip && (
          <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: sabitTip === "Alış" ? "var(--erp-brown)" : "var(--erp-info)", display: "inline-flex", alignItems: "center", gap: 5, paddingRight: 4 }}>
            {sabitTip === "Alış" ? <PackageCheck size={12} /> : <Truck size={12} />}
            {sabitTip === "Alış" ? "Alış Siparişi" : "Satış Siparişi"} · {(sabitTip === "Alış" ? alisListeTumu : satisListeTumu).length} kayıt
          </span>
        )}
      </div>
      {ustSekme === "raporlar" && onRaporlarKaydet && (
        <RaporSekmesi
          modulAnahtari={sabitTip === "Alış" ? "siparis-alis" : "siparis-satis"}
          baslik={sabitTip === "Alış" ? "Alış Siparişi Raporu" : "Satış Siparişi Raporu"}
          alanlar={SIPARIS_RAPOR_ALANLARI}
          satirlar={siparisRaporSatirlari(siparisler, cariler, sabitTip || (siparisSekme === "alis" ? "Alış" : "Satış"), uretim, stok)}
          raporlar={raporlar}
          onRaporlarKaydet={onRaporlarKaydet}
          aktifKullanici={aktifKullanici}
          showToast={showToast}
          arama={siparisArama}
          tanimlarProsesler={tanimlarProsesler}
        />
      )}
      <div style={{ display: ustSekme === "raporlar" ? "none" : undefined }}>
      <div style={{ display: sabitTip ? "none" : "flex", gap: 6, marginBottom: 8 }}>
        {[
          { key: "satis", label: "Sipariş", renk: "var(--erp-info)", sayi: satisListeTumu.length, Icon: Truck },
          { key: "alis", label: "Alış Siparişi", renk: "var(--erp-brown)", sayi: alisListeTumu.length, Icon: PackageCheck },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setSiparisSekme(t.key)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px", borderRadius: "var(--erp-r-pill)", fontWeight: 700, fontSize: 13, cursor: "pointer",
              border: `1.5px solid ${siparisSekme === t.key ? t.renk : "var(--erp-border)"}`,
              background: siparisSekme === t.key ? alfaEkle(t.renk, "1A") : "#fff",
              color: siparisSekme === t.key ? t.renk : "var(--erp-text)",
            }}
          >
            <t.Icon size={14} />
            {t.label} <span className="mono" style={{ fontWeight: 400 }}>({t.sayi})</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
        {["Tümü", "Bekliyor", "Onaylandı", "Hazırlanıyor", "Kısmi Teslim", "Tamamlandı", "İptal"].map((d) => {
          const aktif = durumFiltre === d;
          const renk = d === "Tümü" ? "var(--erp-text)" : (SIPARIS_DURUM_RENK[d] || "var(--erp-text-2)");
          const sayi = d === "Tümü"
            ? (siparisSekme === "satis" ? satisListeTumu.length : alisListeTumu.length)
            : (siparisSekme === "satis" ? satisListeTumu : alisListeTumu).filter((s) => s.durum === d).length;
          return (
            <button
              key={d}
              type="button"
              data-durum-cip={d}
              onClick={() => setDurumFiltre(d)}
              style={{
                padding: "3px 8px", borderRadius: "var(--erp-r-pill)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                border: `1.5px solid ${aktif ? renk : "var(--erp-border)"}`,
                background: aktif ? alfaEkle(renk, "1A") : "#fff",
                color: aktif ? renk : "var(--erp-text-2)",
              }}
            >
              {d} <span className="mono" style={{ fontWeight: 400 }}>({sayi})</span>
            </button>
          );
        })}
      </div>

      {/* ---- ALAN BAZLI FİLTRE ŞERİDİ + SÜZÜLEN TOPLAM ---- */}
      {(() => {
        const aktifListe = siparisSekme === "satis" ? satisListe : alisListe;
        const aktifTumu = siparisSekme === "satis" ? satisListeTumu : alisListeTumu;
        const suzulduMu = siparisKolonAktif || durumFiltre !== "Tümü" || !!siparisArama.trim();

        // Toplamlar PARA BİRİMİ BAZINDA ayrı tutulur. Farklı birimleri tek sayıda toplamak
        // matematiksel olarak anlamsız; ayrıca birimleri çevirmek için hangi kurun kullanılacağı
        // (sipariş anındaki mi, bugünkü mü) muhasebe açısından tartışmalı bir karardır — bu yüzden
        // çevirmiyor, olduğu gibi ayrı gösteriyoruz.
        const pbToplamlar = {};
        let karisikSayisi = 0;
        aktifListe.forEach((s) => {
          const oz = siparisOzetToplami(s, kurlar);
          if (oz.karisik) karisikSayisi++;
          if (!pbToplamlar[oz.paraBirimi]) pbToplamlar[oz.paraBirimi] = { tutar: 0, adet: 0 };
          pbToplamlar[oz.paraBirimi].tutar += oz.toplam;
          pbToplamlar[oz.paraBirimi].adet += s.kalemler.reduce((t, k) => t + k.miktar, 0);
        });

        const sFiltreKutusu = (alan, ipucu) => (
          <input
            type="text"
            value={siparisKolonFiltre[alan]}
            onChange={(e) => setSiparisKolonFiltre({ ...siparisKolonFiltre, [alan]: e.target.value })}
            placeholder={ipucu}
            className="mono"
            style={{
              padding: "4px 7px", fontSize: 11, minWidth: 110, flex: "1 1 110px", maxWidth: 200,
              border: `1px solid ${siparisKolonFiltre[alan].trim() ? "var(--erp-brown)" : "var(--erp-border-2)"}`,
              background: siparisKolonFiltre[alan].trim() ? "var(--erp-hover)" : "#fff",
              borderRadius: "var(--erp-r-sm)", boxSizing: "border-box",
            }}
          />
        );

        return (
          <>
            {/* Kolon süzgeçleri ve toplam AYNI satırda (13 Eylül): toplam kutusu tek başına bir
                satır kaplıyordu. Dar ekranda sarılır. */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
              <Search size={13} color="var(--erp-text-3)" style={{ flexShrink: 0 }} />
              {sFiltreKutusu("no", "sipariş / müşteri kodu…")}
              {sFiltreKutusu("cari", "cari…")}
              {sFiltreKutusu("tarih", "tarih / teslim…")}
              {siparisKolonAktif && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: 10, padding: "4px 8px" }}
                  onClick={() => setSiparisKolonFiltre({ no: "", cari: "", tarih: "" })}
                >
                  <X size={10} /> Temizle
                </button>
              )}
            {aktifListe.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "4px 8px", background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", marginLeft: "auto" }}>
                <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: "var(--erp-text-2)" }}>
                  {suzulduMu ? "SÜZÜLEN TOPLAM" : "TOPLAM"}
                </span>
                <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)" }}>
                  {aktifListe.length}{suzulduMu ? ` / ${aktifTumu.length}` : ""} sipariş
                </span>
                {Object.entries(pbToplamlar).map(([pbx, v]) => (
                  <span key={pbx} className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)" }}>
                    {v.tutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {PARA_SEMBOLU[pbx] || pbx}
                    <span style={{ fontWeight: 400, color: "var(--erp-text-3)" }}> · {Math.round(v.adet * 100) / 100} adet</span>
                  </span>
                ))}
                {karisikSayisi > 0 && (
                  <span
                    className="mono"
                    title="Bu siparişlerde birden fazla para birimi var ve kur bilgisi eksik olduğu için çevrilemedi — toplamları ham değerleriyle ₺ altında sayıldı."
                    style={{ fontSize: 10, fontWeight: 700, color: "var(--erp-warn)", background: "#B85C2E18", padding: "2px 7px", borderRadius: "var(--erp-r-pill)" }}
                  >
                    {karisikSayisi} sipariş karışık para birimi
                  </span>
                )}
              </div>
            )}
            </div>
          </>
        );
      })()}

      {siparisSekme === "satis" ? (
        satisListe.length === 0 ? (
          <EmptyState text={
            (durumFiltre !== "Tümü" || siparisArama || siparisKolonAktif)
              ? "Bu filtre/aramayla eşleşen satış siparişi yok."
              : "Henüz satış siparişi yok. Yeni sipariş oluşturarak başlayın."
          } />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {satisListe.map((s) => (
              /* Her sipariş TEK bir dış çerçeve içinde: özet satırı ve açık detay birlikte.
                 Önceden ikisi ayrı kutulardı ve aralarındaki boşluk, bir siparişin nerede bitip
                 diğerinin nerede başladığını belirsizleştiriyordu — özellikle detay açıkken. */
              <div
                key={s.id}
                style={{
                  border: `1px solid ${acikSiparisId === s.id ? (s.tip === "Alış" ? "var(--erp-brown)" : "var(--erp-info)") : "var(--erp-line-soft)"}`,
                  borderRadius: "var(--erp-r-lg)",
                  overflow: "hidden",
                  boxShadow: acikSiparisId === s.id ? "0 2px 10px rgba(34,27,20,.12)" : "none",
                }}
              >
                <SiparisOzetSatiri siparis={s} cariler={cariler} onAc={() => setAcikSiparisId(acikSiparisId === s.id ? null : s.id)} onTamEkran={() => tamEkranAc(s.id, `${s.tip}: ${s.siparisNo}`)} tumSiparisler={siparisler} uretimSiparisleri={uretim} acikMi={acikSiparisId === s.id} kurlar={kurlar} />
                {acikSiparisId === s.id && (
                  <div style={{ background: "var(--erp-panel-2)", padding: 12 }}>
                    <SiparisCard
                      mobilBolumAyari={mobilBolumAyari}
                      showToast={showToast}
                showToast={showToast}
                      key={s.id}
                      siparis={s}
                      koliler={koliler}
                      cariler={cariler}
                      stok={stok}
                      stokRezervasyonlari={stokRezervasyonlari}
                      tumSiparisler={siparisler}
                      uretimSiparisleri={uretim}
                            onSil={(id) => { siparisSil(id); setAcikSiparisId(null); }}
                      onGerceklestir={onGerceklestir}
                onSatisFisiAc={onSatisFisiAc}
                      onPlanlaUretim={onPlanlaUretim}
                      onPlanlaSatinAlma={onPlanlaSatinAlma}
                      baslangicAcik
                      saltOkunur
                      onSiparisGit={(hedefId) => {
                        const hedef = siparisler.find((x) => x.id === hedefId);
                        // BAŞKA MODÜLDEKİ SİPARİŞ (15 Eylül): alış kartındaki "Kaynak: SAT-…" satış
                        // siparişine gider; bu modülde satış siparişi listelenmediği için tıklama
                        // sessizce hiçbir şey yapmıyordu. Tip uyuşmuyorsa App'in gezinmesi çağrılıyor
                        // (modülü de değiştirir); sekme çubuğu sayesinde kapatınca buraya dönülür.
                        if (hedef && sabitTip && hedef.tip !== sabitTip && onSiparisGitGlobal) { onSiparisGitGlobal(hedefId); return; }
                        if (hedef) setSiparisSekme(hedef.tip === "Alış" ? "alis" : "satis");
                        setAcikSiparisId(hedefId);
                      }}
                      onGoToUretim={onGoToUretim}
                      onPlanlamaTemizle={onPlanlamaTemizle}
                      asortiler={asortiler}
                      onAsortiOlustur={onAsortiOlustur}
                      firmaBilgileri={firmaBilgileri}
                      onPencereAc={onPencereAc}
                onFiseGitNo={onFiseGitNo}
                      kurlar={kurlar}
                      onKayitParaGuncelle={siparisKayitParaGuncelle}
                      onKalemleriBirlestir={siparisKalemleriniBirlestir}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        alisListe.length === 0 ? (
          <EmptyState text={
            (durumFiltre !== "Tümü" || siparisArama || siparisKolonAktif)
              ? "Bu filtre/aramayla eşleşen alış siparişi yok."
              : "Henüz alış siparişi yok. Yeni sipariş oluşturarak başlayın."
          } />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {alisListe.map((s) => (
              <div
                key={s.id}
                style={{
                  border: `1px solid ${acikSiparisId === s.id ? "var(--erp-brown)" : "var(--erp-line-soft)"}`,
                  borderRadius: "var(--erp-r-lg)",
                  overflow: "hidden",
                  boxShadow: acikSiparisId === s.id ? "0 2px 10px rgba(34,27,20,.12)" : "none",
                }}
              >
                <SiparisOzetSatiri siparis={s} cariler={cariler} onAc={() => setAcikSiparisId(acikSiparisId === s.id ? null : s.id)} onTamEkran={() => tamEkranAc(s.id, `${s.tip}: ${s.siparisNo}`)} tumSiparisler={siparisler} uretimSiparisleri={uretim} acikMi={acikSiparisId === s.id} kurlar={kurlar} />
                {acikSiparisId === s.id && (
                  <div style={{ background: "var(--erp-panel-2)", padding: 12 }}>
                    <SiparisCard
                      mobilBolumAyari={mobilBolumAyari}
                      showToast={showToast}
                showToast={showToast}
                      key={s.id}
                      siparis={s}
                      koliler={koliler}
                      cariler={cariler}
                      stok={stok}
                      stokRezervasyonlari={stokRezervasyonlari}
                      tumSiparisler={siparisler}
                      uretimSiparisleri={uretim}
                            onSil={(id) => { siparisSil(id); setAcikSiparisId(null); }}
                      onGerceklestir={onGerceklestir}
                onSatisFisiAc={onSatisFisiAc}
                      onPlanlaUretim={onPlanlaUretim}
                      onPlanlaSatinAlma={onPlanlaSatinAlma}
                      baslangicAcik
                      saltOkunur
                      onSiparisGit={(hedefId) => {
                        const hedef = siparisler.find((x) => x.id === hedefId);
                        // BAŞKA MODÜLDEKİ SİPARİŞ (15 Eylül): alış kartındaki "Kaynak: SAT-…" satış
                        // siparişine gider; bu modülde satış siparişi listelenmediği için tıklama
                        // sessizce hiçbir şey yapmıyordu. Tip uyuşmuyorsa App'in gezinmesi çağrılıyor
                        // (modülü de değiştirir); sekme çubuğu sayesinde kapatınca buraya dönülür.
                        if (hedef && sabitTip && hedef.tip !== sabitTip && onSiparisGitGlobal) { onSiparisGitGlobal(hedefId); return; }
                        if (hedef) setSiparisSekme(hedef.tip === "Alış" ? "alis" : "satis");
                        setAcikSiparisId(hedefId);
                      }}
                      onGoToUretim={onGoToUretim}
                      onPlanlamaTemizle={onPlanlamaTemizle}
                      asortiler={asortiler}
                      onAsortiOlustur={onAsortiOlustur}
                      firmaBilgileri={firmaBilgileri}
                      onPencereAc={onPencereAc}
                onFiseGitNo={onFiseGitNo}
                      kurlar={kurlar}
                      onKayitParaGuncelle={siparisKayitParaGuncelle}
                      onKalemleriBirlestir={siparisKalemleriniBirlestir}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
      </div>
    </div>
  );
}

