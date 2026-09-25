export default function AtolyeERP() {
  useFonts();
  // ---- SEKME KURALI (kullanıcı, 6 Eylül) --------------------------------------------------
  //
  // "Soldaki pencereden açılan her sayfa açık kalsın, bir sonraki sayfa onu ezmesin, üstte açık
  // sekmeler olsun. Bu bundan sonra NET KURAL olsun. Bir ekrandan bir yere geçiş var ise, geçiş
  // yapılan ekran kapatılınca önceki ekrana geri dönsün."
  //
  // Modüller zaten `display:none` ile gizleniyor, yani sekme değiştirmek form state'ini
  // KAYBETTİRMİYORDU — eksik olan şey açık sayfaların GÖRÜNMESİ ve kapatılabilmesiydi.
  // Kullanıcı hangi sayfaları açtığını sol menüye bakarak hatırlamak zorundaydı.
  //
  // `setTab` sarmalandı: her çağrı sekmeyi listeye ekliyor ve geçmişe yazıyor. Uygulamada
  // ~50 `setTab` çağrısı var; her birini elle değiştirmek, birini atlamak demekti.
  // YENİLEMEDE EKRAN KORUNUYOR (25 Eylül, v1.448.0 — bkz. `arayuzDurumuOku`): sekmeler ve canlı
  // pencereler sayfa yenilenince geri geliyor. İlk değerler kayıttan; kayıt yoksa ana sayfa.
  const kayitliArayuz = useRef(arayuzDurumuOku()).current;
  const [tab, setTabHam] = useState(kayitliArayuz ? kayitliArayuz.tab : "anasayfa");
  const [acikSekmeler, setAcikSekmeler] = useState(kayitliArayuz ? kayitliArayuz.acikSekmeler : ["anasayfa"]);
  // Ziyaret sırası. Sekme kapatılınca ÖNCEKİNE dönmek için gerekiyor: liste sırası "hangi sırayla
  // açıldı"yı söyler, "en son neredeydim"i değil.
  const sekmeGecmisi = useRef(kayitliArayuz ? kayitliArayuz.sekmeGecmisi : ["anasayfa"]);

  const setTab = useCallback((anahtar) => {
    if (!anahtar) return;
    setTabHam(anahtar);
    setAcikSekmeler((prev) => (prev.includes(anahtar) ? prev : [...prev, anahtar]));
    sekmeGecmisi.current = [...sekmeGecmisi.current.filter((k) => k !== anahtar), anahtar];
  }, []);

  const sekmeKapat = useCallback((anahtar) => {
    // ANA SAYFA KAPANMIYOR: her sekme kapandığında dönülecek bir yer kalmalı.
    if (anahtar === "anasayfa") return;
    setAcikSekmeler((prev) => {
      const kalan = prev.filter((k) => k !== anahtar);
      sekmeGecmisi.current = sekmeGecmisi.current.filter((k) => k !== anahtar);
      setTabHam((aktif) => {
        if (aktif !== anahtar) return aktif;
        // "Kapatılınca önceki ekrana dön": geçmişte hâlâ açık olan son sekme.
        const onceki = [...sekmeGecmisi.current].reverse().find((k) => kalan.includes(k));
        return onceki || "anasayfa";
      });
      return kalan.length > 0 ? kalan : ["anasayfa"];
    });
  }, []);
  const [siparisHedefId, setSiparisHedefId] = useState(null);
  // Başka bir modülden bir ürüne (ve gerekirse belirli bir sekmesine) yönlendirme.
  // Yalnızca pencere açmak yetmiyor: ürün kartını GÖSTEREN durum Stok modülünün içinde, bu yüzden
  // hedef oraya iletilir ve Stok sekmesine geçilir.
  const [stokHedefUrunId, setStokHedefUrunId] = useState(null);
  const [stokHedefSekme, setStokHedefSekme] = useState(null);

  // Nereden gelindiği. Kullanıcı sipariş girerken reçeteye atladığında, işi bitince elle sekme
  // aramak zorunda kalmamalı — hele ki kaydedilmemiş bir sipariş formu doldurmuşsa, o formu
  // bulmak için doğru sekmeyi hatırlaması gerekir.
  // Not: modüller display:none ile gizlendiği için form state'i korunur; sekmeye dönmek yeterlidir.
  const [donusHedefi, setDonusHedefi] = useState(null); // { tab, etiket } | null

  const uruneGit = useCallback((urunId, sekme, donus) => {
    setStokHedefUrunId(urunId);
    setStokHedefSekme(sekme || null);
    setDonusHedefi(donus || null);
    setTab("stok");
  }, []);

  const donusYap = useCallback(() => {
    if (!donusHedefi) return;
    setTab(donusHedefi.tab);
    setDonusHedefi(null);
  }, [donusHedefi]);
  const [uretimHedefId, setUretimHedefId] = useState(null);
  const [loading, setLoading] = useState(true);
  // Boş değilse: açılışta veri okunamadı, yazma kilitli. Ekranın tepesinde kalıcı uyarı gösterilir.
  const [veriKilidiSebep, setVeriKilidiSebep] = useState("");
  // ÇÖP KUTUSU: silinen her kaydın tam kopyası + kim/ne zaman/neden bilgisi. İki işi birden görür:
  // (1) denetim kaydı — "bu sipariş nereye gitti?" sorusunun cevabı, (2) geri yükleme.
  const [cop, setCop] = useState([]);
  // KOLİLER — paketleme defteri. Ayrı anahtarda: koli kaydı stok ya da siparişin alt kırılımı
  // değil, kendi başına bir belge (içinde farklı ürünler olabiliyor).
  const [koliler, setKoliler] = useState([]);
  // GÖREVLER (14 Eylül): koliler/muhasebe gibi tekil tablo; buluttan okunur, yerel kopya yedek.
  // FİŞ DEFTERİ (15 Eylül, Adım 1): her fişin tek kaydı. Doğruluğun kaynağı burası; stok/sipariş/
  // cari onun türevi.
  const [fisDefteri, setFisDefteri] = useState([]);
  // MODELHANE (17 Eylül): koleksiyona girmemiş modeller. Stok ürünü DEĞİL — ayrı tablo.
  const [modeller, setModeller] = useState([]);
  const [gorevler, setGorevler] = useState([]);
  const [hedefGorevId, setHedefGorevId] = useState(null);
  // SOHBET (14 Eylül): mesajlar görevlerle aynı kalıpta tekil tablo. `okumalar` kanal başına son
  // okunan mesajın damgası — okunmamış sayacı buradan.
  const [mesajlar, setMesajlar] = useState([]);
  const [mesajOkumalari, setMesajOkumalari] = useState({});
  const [gorevSekmesi, setGorevSekmesi] = useState("sohbet"); // sohbet | liste
  // YAYINLANAN SÜRÜM (14 Eylül): buluttaki `surum` kaydı; kendi sürümümüzden yeniyse üst şeritte
  // indirme bağlantısı çıkar. Kullanıcıya tek tek dosya göndermeye son.
  const [yayinSurum, setYayinSurum] = useState(null);
  // Buluta gidememiş yazmalar (030-supabase defteri). Şeritte sayı + "Yeniden dene".
  const [bekleyenYazmalar, setBekleyenYazmalar] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem("bekleyen:yazma") || "{}") || {}; } catch (e) { return {}; }
  });
  useEffect(() => {
    window.__bekleyenYazmaDegisti = (d) => setBekleyenYazmalar({ ...d });
    return () => { window.__bekleyenYazmaDegisti = null; };
  }, []);
  const [surumSeridiKapali, setSurumSeridiKapali] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [aktifKullanici, setAktifKullanici] = useState(null);
  // OTURUM SÜRDÜRME (kullanıcı, 15 Eylül: "sayfa yenilendiğinde tekrar kullanıcı adı ve şifre
  // girmemi istiyor"). `aktifKullanici` yalnız bellekteydi; her yenilemede giriş ekranı geliyordu.
  //
  // Saklanan: kullanıcı KİMLİĞİ, giriş zamanı ve kimliğin bulut mu yerel mi olduğu. ŞİFRE
  // SAKLANMIYOR — kullanıcı açılışta tanımlardaki listeden kimliğiyle bulunuyor; listede yoksa
  // (silinmiş/pasif) oturum geçersiz sayılıyor.
  //
  // SÜRE SINIRI 12 SAAT: atölye bilgisayarı paylaşılan bir cihaz olabilir; süresiz açık oturum,
  // ertesi gün başka birinin o kişinin adıyla işlem yapması demekti. 12 saat bir vardiyayı
  // kapsıyor, ertesi güne sarkmıyor.
  const OTURUM_ANAHTAR = "oturum:aktif";
  const OTURUM_SURESI = 12 * 60 * 60 * 1000;
  const oturumSakla = useCallback((kullanici, bulutMu) => {
    try {
      if (!kullanici || kullanici.id === "test-modu") return;
      window.localStorage.setItem(OTURUM_ANAHTAR, JSON.stringify({
        kullaniciId: kullanici.id, zaman: Date.now(), bulut: !!bulutMu,
      }));
    } catch (e) { /* özel sekme: oturum sürdürülemez, giriş istenir */ }
  }, []);
  const oturumTemizle = useCallback(() => {
    try { window.localStorage.removeItem(OTURUM_ANAHTAR); } catch (e) { /* */ }
  }, []);
  const oturumOku = useCallback(() => {
    try {
      const k = JSON.parse(window.localStorage.getItem(OTURUM_ANAHTAR) || "null");
      if (!k || !k.kullaniciId) return null;
      if (Date.now() - (k.zaman || 0) > OTURUM_SURESI) { oturumTemizle(); return null; }
      return k;
    } catch (e) { return null; }
  }, [oturumTemizle]);
  // Girişin BULUT kimliğiyle mi yoksa yerel şifreyle mi yapıldığı. İkinci aşamaya (RLS'i
  // sıkmaya) geçmeden önce herkesin bulut kimliğiyle girebildiğini görmek gerekiyor; bu
  // rozet o doğrulamanın gözle görülür hâli.
  const [bulutKimligi, setBulutKimligi] = useState(false);
  // Yerel girişe düşüldüyse NEDEN düşüldüğü ({ eposta, sebep }) ve açıklama kartının açık olup
  // olmadığı. Kart girişte kendiliğinden açılıyor; rozete dokununca yeniden açılıyor.
  const [bulutGirisAyrinti, setBulutGirisAyrinti] = useState(null);
  const [bulutAyrintiAcik, setBulutAyrintiAcik] = useState(false);
  // Sol menü VARSAYILAN OLARAK DARALTILMIŞ açılır. Bu uygulamanın asıl içeriği (stok matrisleri,
  // reçete tabloları, ekstreler) yatayda geniş; 220px'lik menü sürekli yer kaplayıp tabloları
  // kaydırma çubuğuna düşürüyordu. Menü ikonlarla çalışmaya devam eder, tek tıkla genişletilir.
  // Üst menüde açık olan açılır liste: grup adı ya da "kullanici" (v1.449.0 — yan menü kalktı).
  const [acikUstMenu, setAcikUstMenu] = useState(null);
  // ÜST MENÜ SIĞDIRMA: menü taşarsa kademeli sıkışır (CSS: .ust-menu.sik-N). Ölçüm DOM sınıfıyla,
  // React durumu olmadan: durumla yapılsa her ölçüm yeniden çizim → yeniden ölçüm döngüsü olurdu.
  const ustMenuRef = useRef(null);
  const ustMenuNavRef = useRef(null);
  const ustMenuSigdir = useCallback(() => {
    const menu = ustMenuRef.current, nav = ustMenuNavRef.current;
    if (!menu || !nav) return;
    for (let k = 0; k <= 3; k++) {
      menu.classList.remove("sik-1", "sik-2", "sik-3");
      if (k > 0) menu.classList.add(`sik-${k}`);
      // Taşma: içerik, ayrılan alandan geniş. (overflow görünür olsa da scrollWidth taşanı sayar.)
      if (nav.scrollWidth <= nav.clientWidth + 1) return;
    }
  }, []);
  // Her çizimden sonra (etkin sekme kalınlaşınca, yetkiyle öğe eklenince genişlik değişir), ekran
  // boyutu değişince ve yazı tipi yüklenince (DM Sans gelince yazılar genişler) yeniden ölçülür.
  React.useLayoutEffect(() => { ustMenuSigdir(); });
  useEffect(() => {
    window.addEventListener("resize", ustMenuSigdir);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ustMenuSigdir).catch(() => {});
    return () => window.removeEventListener("resize", ustMenuSigdir);
  }, [ustMenuSigdir]);
  // Bekleyen yazma şeridinde ayrıntısı açık olan kayıt (19 Eylül).
  const [bekleyenAcikAnahtar, setBekleyenAcikAnahtar] = useState(null);
  // Pencere başlığındaki eylem çubuğu modül tarafından bildiriliyor; bildirim gelince başlığın
  // yeniden çizilmesi için abone olunuyor (bkz. 352-eylem-cubugu).
  const [, setEylemTetik] = useState(0);
  useEffect(() => pencereEylemAbone(() => setEylemTetik((n) => n + 1)), []);

  // Menü genişliği hesabı için: mobil düzen bayrağı (aşağıda hesaplanıyor) ref'te tutuluyor.
  const mobilDuzenRef = useRef(false);
  const [mobilDuzenSurumu, setMobilDuzenSurumu] = useState(0);
  const [mobilMenuAcik, setMobilMenuAcik] = useState(false);

  // Sol menünün genişliği bir CSS değişkenine yazılır; tam ekran pencereler menünün SAĞINDAN
  // başlasın diye onu okurlar. Önceden pencereler `left: 0` ile menünün üstünü örtüyordu ve
  // pencere açıkken modüller arasında geçiş yapmak imkânsızdı — pencereyi kapatmak gerekiyordu.
  //
  // Mobilde sol menü hiç yok (alt sekme çubuğu var), o yüzden değer 0 olmalı. Genişliği burada,
  // ekran boyutuna bakarak belirliyoruz.
  useEffect(() => {
    const uygula = () => {
      // 720px, CSS'teki .sidebar { display: none } kırılma noktasıyla AYNI olmalı; farklı
      // olursa menü gizliyken pencere hâlâ boşluk bırakır ya da tersi.
      // YAN MENÜ YOK (v1.449.0): pencereler soldan 0'dan başlıyor. Yükseklik farkı artık ÜSTTE:
      // masaüstünde üst menü + sekme şeridi, mobilde yalnız şerit (menü gizli, alt çubuk var).
      document.documentElement.style.setProperty("--menu-genislik", "0px");
      document.documentElement.style.setProperty("--ust-menu-h", mobilDuzenRef.current ? "0px" : `${UST_MENU_YUKSEKLIGI}px`);
    };
    uygula();
    window.addEventListener("resize", uygula);
    return () => window.removeEventListener("resize", uygula);
    // `mobilDuzen` bileşenin aşağısında hesaplanıyor (TDZ); ref üzerinden okunuyor ve mobil düzen
    // değişince ayrıca çağrılıyor (aşağıdaki etki). Sınıfa bakmak yanlıştı: sınıf DOM'a effect
    // sırasında giriyor, ilk hesap 0 çıkıp sol menü sıfır genişlikte kalıyordu (15 Eylül).
  }, [mobilDuzenSurumu]);
  const [onaylar, setOnaylar] = useState([]);
  // "muhasebe" listeye SONRADAN eklendi. Mevcut kullanıcıların yetki nesnesinde bu anahtar yok;
  // kullaniciYetkisiVar tanımsız yetkiyi "yok" saydığı için, eskiden beri var olan kullanıcılar
  // muhasebeye erişemez hale gelir — bu bilinçli bir tercihtir: para hareketlerine erişim,
  // sessizce devralınacak bir hak değil, yöneticinin açıkça vermesi gereken bir yetkidir.
  const MODULLER = ["tanimlar", "stok", "uretim", "siparis", "cari", "fisler", "muhasebe"];
  const MODUL_ADLARI = { tanimlar: "Tanımlar", stok: "Stok", uretim: "Üretim", siparis: "Sipariş", cari: "Cari", fisler: "Fişler", muhasebe: "Muhasebe" };

  const [tanimlar, setTanimlar] = useState({ renkler: [], bedenler: [], birimler: BIRIMLER.map((ad) => ({ id: `birim-${ad}`, ad })), prosesler: [], asortiler: [], ozelKodAlanlari: [], renkKombinasyonlari: [], hammaddeTipleri: [], araProsesler: [], kullanicilar: [], firmaBilgileri: { logo: VARSAYILAN_LOGO, unvan: "", telefon: "", adres: "", email: "", website: "", vergiNo: "" }, girisAktifMi: false });
  // STOK MİKTARI TÜRETİLİR (16 Eylül, Parça 1). `setStok` artık doğrudan state'i yazmıyor: gelen
  // liste önce `stokMiktarlariniHesapla` ile hareketlerden yeniden hesaplanıyor. Böylece
  // `variants[].miktar` ile `hareketler[]` ayrışamaz — tek sayı var, kaynağı hareketler.
  // Çağıranlar değişmedi; hepsi eskisi gibi `setStok(next)` diyor.
  const [stok, setStokHam] = useState([]);
  // PARÇA 2 (16 Eylül): stok yazımı TEK geçit olduğu için yeni hareketler burada toplanıp deftere
  // gönderiliyor — üretim, açılış, elle giriş, onarım; hangi kapıdan gelirse gelsin.
  // Güncelleyici saf kalsın diye hareketler bir ref'e biriktiriliyor, deftere yazma effect'te.
  const defterBekleyenHareketler = useRef([]);
  const defterYazmaGerekli = useRef(false);
  const [defterTetik, setDefterTetik] = useState(0);
  const setStok = useCallback((next) => {
    setStokHam((onceki) => {
      const ham = typeof next === "function" ? next(onceki) : next;
      // FİŞSİZ HAREKET YAZILAMAZ (16 Eylül): numarasız gelen harekete burada numara veriliyor.
      const numarali = fissizHareketlereNumaraVer(ham, (onEk) => fisNoUret(onEk));
      // Numara verildiyse kalıcı yazma gerekir: aksi halde numara yalnız bellekte kalır ve bir
      // sonraki açılışta hareket yine numarasız görünürdü.
      if (numarali !== ham) defterYazmaGerekli.current = true;
      const yeni = stokMiktarlariniHesapla(numarali);
      const eklenen = defteryeGirmemisHareketler(onceki, yeni, []);
      if (eklenen.length > 0 || defterYazmaGerekli.current) {
        defterBekleyenHareketler.current = [...defterBekleyenHareketler.current, ...eklenen];
        sonStokRef.current = yeni;
        // setState güncelleyicisinin içinden başka state'i tetiklemek yasak; mikro görev kuyruğuna
        // atılıyor.
        Promise.resolve().then(() => setDefterTetik((n) => n + 1));
      }
      return yeni;
    });
  }, []);

  const sonStokRef = useRef(null);
  useEffect(() => {
    // Numara verilmişse stoğu da kalıcı yaz.
    if (defterYazmaGerekli.current && sonStokRef.current) {
      defterYazmaGerekli.current = false;
      yazimiIzle(tabloYaz("stok:items", "urunler", sonStokRef.current), "Stok kartları", sonStokRef.current);
    }
    const bekleyen = defterBekleyenHareketler.current;
    if (bekleyen.length === 0) return;
    defterBekleyenHareketler.current = [];
    setFisDefteri((onceki) => {
      // Deftere GİRMEMİŞ olanları süz: aynı hareket iki kez toplanmış olabilir (React'in
      // güncelleyiciyi iki kez çalıştırdığı geliştirme kipi).
      const defterdekiler = new Set((onceki || []).flatMap((f) => (f.stokHareketleri || []).map((h) => h.id)));
      const suzulmus = bekleyen.filter((h) => h.id && !defterdekiler.has(h.id));
      if (suzulmus.length === 0) return onceki;
      const yeni = defteriHareketlerleGuncelle(onceki, suzulmus, {
        kullanici: (aktifKullanici && aktifKullanici.ad) || "",
      });
      if (yeni === onceki) return onceki;
      yazimiIzle(tekilYaz(FIS_DEFTERI_ANAHTAR, "fis_defteri", yeni), "Fiş defteri", yeni);
      return yeni;
    });
  }, [defterTetik]); // eslint-disable-line react-hooks/exhaustive-deps
  const [uretim, setUretim] = useState([]);
  const [cariler, setCariler] = useState([]);
  const [siparisler, setSiparisler] = useState([]);
  const [muhasebe, setMuhasebe] = useState({ kasalar: [], bankalar: [], cekler: [] });
  // ÇEK GÖRSELLERİ ayrı tabloda: [{ id: cekId, on, arka }]. `muhasebe` içine koymak, tek kaydın
  // 5 MB sınırına çek başına iki fotoğrafla hızlıca çarpmak demekti (bkz. cek-gorselleri.sql).
  const [cekGorselleri, setCekGorselleri] = useState([]);
  // ---- STOK REZERVASYON DEFTERİ ----
  // Alış kalemindeki rezervasyonlar "bu malı şu sipariş için ALDIK" der. Ama üretim kararı
  // alındığında MEVCUT stoktan da ayırmak gerekir — o miktarın asılacağı bir alış yoktur.
  // Bu yüzden ayrı bir defter: { id, urunId, renk, beden, siparisId, siparisNo, miktar, tuketilen }
  // İki kaynak da aynı soruyu cevaplar: "bu hammaddenin ne kadarı hangi siparişe ayrılmış?"
  const [stokRezervasyonlari, setStokRezervasyonlari] = useState([]);
  const [gocDurumu, setGocDurumu] = useState(null);
  // Verinin nereden geldiği: buluttan mı, yerel kopyadan mı. Kullanıcı hangi hâle baktığını
  // bilmeli — bulut okunamadığında sessizce eski veriyle çalışmak, farkında olmadan yanlış
  // karar vermeye yol açar.
  const [veriKaynagi, setVeriKaynagi] = useState(null);
  // 2. AŞAMA (rls-kimlik.sql): bulut anahtarla okunamıyorsa (401/403) yerel kopyaya DÜŞÜLMEZ —
  // eski yerel kopya bayat veri, boşsa ilk kurulum ekranı demek. Bulut ön giriş ekranı gösterilir,
  // girişten sonra yükleme baştan çalışır (`yuklemeSayaci`). `bulutOnGiris`: girişi yapan kullanıcı;
  // veri gelince Tanımlar kaydıyla eşlenip doğrudan içeri alınır.
  const [bulutGirisGerekli, setBulutGirisGerekli] = useState(null); // null | { sebep }
  // Oturum kullanım SIRASINDA düştü mü (21 Eylül). Açılış girişinden farklı: veri yerelde duruyor,
  // yalnız buluta yazılamıyor — tam ekran giriş yerine üstte şerit + "Yeniden giriş yap".
  const [oturumDustu, setOturumDustu] = useState(false);
  useEffect(() => { oturumDustuDinle(() => setOturumDustu(true)); return () => oturumDustuDinle(null); }, []);
  const [yuklemeSayaci, setYuklemeSayaci] = useState(0);
  const [bulutOnGiris, setBulutOnGiris] = useState(null);
  // Buluta yazma hatası. Sessiz kalması, hiçbir şeyin kaydedilmediğinin günlerce fark
  // edilmemesine yol açabilirdi — bu yüzden ekranda görünür.
  const [yazmaHatasi, setYazmaHatasi] = useState(null);

  // Sürüm çakışması. Yazma hatasından AYRI tutuluyor çünkü sonucu farklı: yazma hatasında veri
  // bu bilgisayarda duruyor ve bağlantı düzelince gidiyor, çakışmada ise değişiklik KALICI OLARAK
  // kaydedilmedi ve kullanıcının yenileyip yeniden yapması gerekiyor.
  const [surumCakismasi, setSurumCakismasi] = useState(null);

  useEffect(() => {
    // Yazma katmanı bileşen dışında olduğu için hatayı bu köprüyle bildiriyor.
    window.__supabaseHataBildir = (tablo, mesaj) => setYazmaHatasi({ tablo, mesaj, zaman: Date.now() });
    window.__surumCakismaBildir = (tablo, idler, teshis) =>
      setSurumCakismasi({ tablo, adet: (idler || []).length, teshis: teshis || [], zaman: Date.now() });
    return () => {
      delete window.__supabaseHataBildir;
      delete window.__surumCakismaBildir;
    };
  }, []);

  const [toast, setToast] = useState(null);
  // KALICI HATA PANELİ.
  //
  // Hatalar toast olarak gösteriliyordu: 2,2 saniye sonra kayboluyor, telefonda uzun metin
  // kırpılıyor ve KOPYALANAMIYOR. Kullanıcı "hata veriyor ama okuyamıyorum" dedi — haklı: bir
  // hatayı bildiremiyorsa o hata yok sayılmış demektir. Hatalar artık kullanıcı kapatana kadar
  // duruyor ve kopyalanabiliyor.
  const [sonHata, setSonHata] = useState(null);

  // Pencere Yöneticisi: Reçete Yazdır, Fiş Yazdır, Cari Ekstre gibi "referans" pencereler artık
  // hangi modülde açıldığına bakılmaksızın ORTAK bir sekme çubuğunda listelenir. Aynı anda birden
  // fazlası açık kalabilir, aralarında sekme gibi geçiş yapılabilir — biri açıkken diğerini açmak
  // öncekini KAPATMAZ. Aynı pencere (aynı tip+id) tekrar açılırsa, yeni bir kopya oluşturmak yerine
  // var olanın sekmesine odaklanılır.
  // PENCERE SİSTEMİ AYRI DOSYADA (19 Eylül, 2. madde): `100-app.jsx` 7.758 satırdı ve her
  // değişiklik buraya dokunuyordu — Adım 3'ün yarım kalması gibi hatalar bu yoğunluktan çıktı.
  // Pencere açma/kapatma/küçültme mantığı kendi dosyasına (`095-pencereler.jsx`) taşındı;
  // App yalnız sonucu kullanıyor.
  const {
    acikPencereler, setAcikPencereler, aktifPencereId, setAktifPencereId,
    acikUrunIdleri, acikUretimIdleri, acikSiparisPencereleri,
    pencereAc, pencereKapat, pencereKucult,
  } = usePencereler(kayitliArayuz);

  // Ekranın hâli her değişimde kaydediliyor; yenilemede geri gelsin (bkz. 095-pencereler).
  useEffect(() => {
    arayuzDurumuYaz({ tab, acikSekmeler, sekmeGecmisi: sekmeGecmisi.current, acikPencereler, aktifPencereId });
  }, [tab, acikSekmeler, acikPencereler, aktifPencereId]);

  // GERİ GELEN PENCERENİN KAYDI SİLİNMİŞ OLABİLİR (başka bilgisayardan silindi, yenileme de tam
  // bunun için yapıldı). Yükleme bitince bir kez ayıklanıyor: kaydı olmayan pencere şeritte boş
  // bir sekme olarak kalmasın.
  const pencereAyiklandi = useRef(false);
  useEffect(() => {
    if (loading || pencereAyiklandi.current) return;
    pencereAyiklandi.current = true;
    const kayitVar = (p) => {
      if (p.tip === "urun") return stok.some((x) => x.id === p.kayitId);
      if (p.tip === "uretim") return uretim.some((x) => x.id === p.kayitId);
      if (p.tip === "siparis") return siparisler.some((x) => x.id === p.kayitId);
      return true;
    };
    if (acikPencereler.every(kayitVar)) return;
    const kalan = acikPencereler.filter(kayitVar);
    setAcikPencereler(kalan);
    if (!kalan.some((p) => p.id === aktifPencereId)) setAktifPencereId(null);
  }, [loading, stok, uretim, siparisler, acikPencereler, aktifPencereId, setAcikPencereler, setAktifPencereId]);

  // KISAYOLLAR (ERP standardı): aktif pencerenin çubuğundaki işlere bağlı. Ctrl+S tarayıcının
  // "sayfayı kaydet" penceresini, F5 yenilemeyi açmasın diye varsayılan engelleniyor — ama
  // yalnız çubukta karşılığı VARSA; yoksa tarayıcı davranışı korunuyor.
  useEffect(() => {
    const dinle = (e) => {
      if (!aktifPencereId) return;
      const hedef = kisayolEylemi(e, pencereEylemleriOku(aktifPencereId));
      if (!hedef) return;
      e.preventDefault();
      hedef.onClick();
    };
    window.addEventListener("keydown", dinle);
    return () => window.removeEventListener("keydown", dinle);
  }, [aktifPencereId]);

  // DEPO'DAN AÇILAN ÇALIŞMA PENCERELERİ.
  // Depo'daki bir satırdan iki iş doğuyor: "bunu planla" ve "bunun fişini kes". İkisi de sekme
  // DEĞİŞTİRMİYOR — sekme değiştirmek kullanıcıyı Depo'dan koparıyordu ve geri dönmek için
  // hangi satırda olduğunu hatırlaması gerekiyordu. Bunun yerine hedef ekran, var olan pencere
  // yöneticisiyle Depo'nun ÜSTÜNDE açılıyor: "−" ile küçültülür, "Kapat" ile kapanır, ikisinde
  // de altta Depo aynı yerde duruyor. Yeni bir ekran tasarlanmadı; pencerenin içinde var olan
  // Hammadde İhtiyaç ve Satın Alma ekranlarının kendisi çiziliyor.
  // Aynı satırın penceresi ZATEN AÇIKSA yeniden kurulmuyor, yalnızca öne getiriliyor.
  // `pencereAc` açık pencerenin verisini bilinçli olarak tazeler (bayat ekstre sorunu); burada
  // bu istenmez: yarım doldurulmuş bir alış formu, kullanıcı aynı satıra ikinci kez bastığında
  // sıfırlanır ve girdiği miktarlar sessizce kaybolurdu.
  const depoPencereAc = useCallback((pencereId, ac) => {
    if (acikPencereler.some((p) => p.id === pencereId)) setAktifPencereId(pencereId);
    else ac();
  }, [acikPencereler]);

  // `kalemler`: Depo'daki açık satırlar — renk + beden + miktar. Alış fişiyle AYNI biçim
  // (kullanıcı, 12 Eylül: "satın al ile alışta yaptığımızın aynısı olması gerekli, stok zaten
  // belli renk beden vs."). Eskiden tek bir `renk` ve yalnız bedene göre toplanmış `miktarlar`
  // gidiyordu; Depo satırı bütün renkleri tek grupta topladığı için renk boş kalıyordu.
  const hammaddeyiPlanla = useCallback((urunId, urunAd, kalemler) => {
    depoPencereAc(`depo-satinal-${urunId}`, () =>
      pencereAc("depo-satinal", urunId, `Satın Al: ${urunAd}`, {
        urunId, urunAd,
        // `odakla`: pencere tek bir malzeme için açıldığından liste o malzemeye daraltılır.
        hedef: { urunId, urunAd, odakla: true, kalemler: kalemler || [] },
      }));
  }, [pencereAc, depoPencereAc]);

  // Cari kartından açılan Alış/Satış fişi. Aynı cari + aynı tip için ikinci kez basıldığında
  // yarım kalan fiş korunur (bkz. depoPencereAc).
  // `baslangicKalemler`: fiş açılırken hazır gelen satırlar (siparişten geliniyorsa siparişin
  // bekleyen kalemleri).
  const stokFisiAc = useCallback((cariId, tip, cariUnvan, baslangicKalemler, gelinen) => {
    depoPencereAc(`stok-fisi-${cariId}|${tip}`, () =>
      pencereAc("stok-fisi", `${cariId}|${tip}`, `${tip} Fişi: ${cariUnvan}`, {
        cariId, tip, cariUnvan,
        baslangicKalemler: baslangicKalemler && baslangicKalemler.length > 0 ? baslangicKalemler : null,
      }, gelinen));
  }, [pencereAc, depoPencereAc]);

  // TEK SATIŞ EKRANI KÖPRÜSÜ (23 Eylül, v1.422.0): sipariş kartı bu fonksiyonu, Depo > Sevkiyat
  // `stokFisiAc`ı çağırır; ekran (255) ve kayıt kapısı (089) tek. Sipariş kartındaki satış formu ve
  // Depo > Sevkiyat'ın kendi kaydı kalktı — hata tek yerde aranır.
  // Fiş tipi siparişin tipinden geliyor: alış taşınmaya hazır olduğunda (bkz. 340, onay penceresi
  // kararı) burada değişiklik gerekmeyecek.
  const satisFisiAcSiparisten = useCallback((siparis, kalemler) => {
    const cari = cariler.find((c) => c.id === siparis.cariId);
    const fisTipi = siparis.tip === "Alış" ? "Alış" : "Satış";
    stokFisiAc(siparis.cariId, fisTipi, cari ? cari.unvan : "", kalemler, `sipariş ${siparis.siparisNo}`);
  }, [cariler, stokFisiAc]);

  // SİPARİŞTEN YENİ FİŞ KESME KALDIRILDI (10 Eylül).
  //
  // v1.215.0'da eklenmişti ama istek YANLIŞ ANLAŞILMIŞTI: kullanıcı yeni fiş kesmek değil,
  // KESİLMİŞ fişin içine girmek istiyordu ("zaten siparişten fiş kesebiliyor"). İki ayrı yol
  // yan yana durunca hangisinin ne yaptığı karışıyordu — kullanıcı kaldırılmasını istedi.
  //
  // KESİLMİŞ FİŞE GİT (kullanıcı, 10 Eylül). Sipariş kartındaki fiş geçmişinde fiş numarası
  // DÜZ METİNDİ; kullanıcı fişi görüyor ama içine giremiyordu. Artık numaraya tıklayınca Fişler
  // ekranı o fişle süzülmüş olarak açılıyor.
  const [hedefFisNo, setHedefFisNo] = useState(null);
  const fiseGit = useCallback((fisNo) => {
    if (!fisNo) return;
    setHedefFisNo(fisNo);
    setTab("fisler");
  }, [setTab]);


  // DEPO > ALIŞ FİŞİ — DOĞRUDAN ALIŞ GİRİŞİ.
  //
  // Bu düğme "depo-alis" penceresini açıyordu ve o pencere SİPARİŞ formunu çiziyordu: yani
  // "Alış Fişi"ne basınca alış SİPARİŞİ oluşuyordu. Kullanıcı ayrımı net koydu:
  //   alış fişi → sipariş olmadan, doğrudan cariden alım (mal elde, borç doğdu)
  //   satın al  → alış siparişi girişi (henüz mal yok, söz var)
  //
  // Artık cari kartındaki ile AYNI fiş ekranı açılıyor (`stok-fisi`). İki ayrı "alış girişi"
  // ekranı yazmak, ikisinin zamanla ayrışması demekti — bu projede tekrar eden hata.
  //
  // ÇİFT KAYIT KORUMASI: pencere anahtarı cari + tip. İkinci kez basıldığında YENİ bir form
  // değil, yarım kalan form geri geliyor (bkz. depoPencereAc). Eskiden her basış yeni bir
  // sipariş üretiyordu ve aynı miktarlar ikinci kez ekleniyordu.
  //
  // PLANLAMA BU ALIMI GÖRÜR: fiş stoğu ANINDA artırır, MRP de ihtiyacı mevcut stoktan hesaplar.
  // Yani doğrudan alış yapıldığında planlama o malzemeyi bir daha "eksik" göstermez — ayrı bir
  // bağ kurmaya gerek yok, tek gerçek kaynak stok.
  const alisFisiAc = useCallback((taslak) => {
    const urun = (stok || []).find((p) => p.id === taslak.urunId);
    const cariId = (urun && urun.tedarikciId) || "";
    const cari = (cariler || []).find((c) => c.id === cariId);
    const anahtar = `${cariId || "secilmemis"}|Alış`;

    // YALNIZ TIKLANAN İHTİYAÇ FİŞE GİRİYOR (kullanıcı, 12 Eylül: "sadece tıkladığım gelsin").
    //
    // 7 Eylül'de (7z-36) aynı tedarikçinin DİĞER eksikleri de kendiliğinden ekleniyordu; kullanıcı
    // bunu ekran görüntüsüyle bildirdi: Monta Çivisi'nden 1 paket ihtiyaç için basıldığında fişe
    // iki Yapıştırıcı satırı daha geliyordu. Kullanıcı tek ihtiyaç için fiş kesiyor; istemediği
    // satırları tek tek silmek, elle eklemekten daha çok iş.
    //
    // Diğer eksikler KAYBOLMUYOR: Depo'da satır satır duruyor, her birinin kendi "Alış Fişi"
    // düğmesi var ve aynı tedarikçiye ikinci kez basıldığında YARIM KALAN fiş geri geliyor
    // (pencere anahtarı cari + tip, bkz. depoPencereAc) — yani satırlar aynı fişte toplanabiliyor.
    //
    // TIKLANAN SATIR DOĞRUDAN KALEM OLUYOR (kullanıcı, 7 Eylül: "alış fişine tıkladığımda
    // tıklanan ihtiyacı otomatik ekrana getirsin; şu anda hammadde, renk ve miktar giriyoruz").
    //
    // Önce yalnız FORM ALANLARI dolduruluyordu (`baslangicKalem`): ürün ve renk seçili geliyor ama
    // kalem listesine girmesi için kullanıcının "Kalem Ekle"ye basması gerekiyordu. Depo'da zaten
    // "bunu alacağım" denmiş bir satır için bu fazladan bir adım.
    //
    // Artık satır, açık miktarlarıyla birlikte kalem olarak listeye giriyor.
    const tiklananKalemler = (() => {
      if (!urun || !taslak.urunId) return [];
      // Açık miktar yoksa (ör. yalnız "yolda" olan bir satır) kalem üretilmiyor: sıfır miktarlı
      // satır fişte anlamsız ve kaydetmeyi de engelliyor.
      const satirlar = (taslak.kalemler || []).filter((x) => (parseFloat(x.miktar) || 0) > 0);
      if (satirlar.length === 0) return [];
      const kod = paraKoduna(urun.alisParaBirimi);
      // RENK BOŞ GELİRSE ÜRÜNDEN ÇÖZÜLÜYOR. Depo'da renksiz bir satırdan gelindiğinde kalem
      // renksiz kalıyor, fiş kesilince hiçbir varyanta denk gelmiyordu (9 Eylül, stok
      // tutarsızlığı). Ürünün TEK rengi varsa o kullanılıyor; birden fazlaysa boş bırakılıyor —
      // yanlış varyanta yazmaktansa kullanıcıya sordurmak doğru.
      // Renk artık SATIR BAŞINA geliyor (11 Eylül): Depo satırı bütün renkleri tek grupta
      // topladığından grubun tek bir rengi yok (bkz. StokDurumuMatrisi, Alış Fişi düğmesi).
      const renkler = [...new Set((urun.variants || []).map((v) => v.renk).filter(Boolean))];
      return satirlar.map((x) => ({
        urunId: urun.id, urunAd: urun.ad, birim: urun.birim || "",
        renk: x.renk || (renkler.length === 1 ? renkler[0] : ""),
        beden: x.beden || "", miktar: parseFloat(x.miktar) || 0,
        // Karşılığı olmayan sembolde fiyat taşınmıyor (bkz. aşağıdaki gerekçe).
        birimFiyat: kod ? (urun.alisFiyati || 0) : 0,
        paraBirimi: kod || "TRY",
      }));
    })();

    depoPencereAc(`stok-fisi-${anahtar}`, () =>
      pencereAc("stok-fisi", anahtar, `Alış Fişi: ${cari ? cari.unvan : (taslak.urunAd || "yeni")}`, {
        cariId, tip: "Alış", cariUnvan: cari ? cari.unvan : "Tedarikçi seçin",
        baslangicKalemler: tiklananKalemler.length > 0 ? tiklananKalemler : null,
      }));
  }, [pencereAc, depoPencereAc, stok, cariler]);

  // Hata paneli: başlık + ayrıntı. Toast'tan farkı kendiliğinden kaybolmaması.
  const hataGoster = useCallback((baslik, ayrinti) => {
    setSonHata({ baslik, ayrinti, zaman: new Date().toISOString() });
  }, []);

  // ÖNCEKİ bildirimin zamanlayıcısı İPTAL EDİLMELİ. Edilmezse eski bildirimin sayacı dolduğunda
  // ekranda duran YENİ bildirimi siliyor: art arda barkod okutulduğunda uyarı 200 ms görünüp
  // kayboluyordu. Fuarda hızlı okutan biri "Tanınmayan barkod" uyarısını hiç görmezdi —
  // bildirimin görünmemesi, hiç uyarmamakla aynı şey.
  const toastZamanlayici = useRef(null);
  // UYARI SÜRESİ (kullanıcı, 15 Eylül: "uyarılar çok kısa sürüyor, okunmuyor; üzerine tıklayınca
  // kapansın"). 2,2 saniye kısa bir cümle için bile yetmiyordu; uzun uyarılar (kur bulunamadı, fiş
  // kaydedilemedi, onarım özeti) hiç okunamıyordu. Artık süre UZUNLUĞA GÖRE: temel 4 sn + her 20
  // karakter için 1 sn, en fazla 12 sn. Ve kullanıcı okuyunca dokunup kapatabiliyor.
  // GERİ AL (ERP standardı: "kaydetme sonrası sol altta toast + Geri al"). İkinci parametre
  // bir fonksiyon verirse toast'ta "Geri al" düğmesi çıkar; tıklanınca çağrılır. Fiş kesen
  // akışlar `fisNo` verir, düğme fişi geri alır (mevcut geri alma kapısı, yetkisi ve engelleri
  // ile — çek, üretim kilidi aynen geçerli).
  const [toastGeriAl, setToastGeriAl] = useState(null);
  const showToast = useCallback((msg, secenek) => {
    setToast(msg);
    setToastGeriAl(secenek && typeof secenek.geriAl === "function" ? () => secenek.geriAl : null);
    if (toastZamanlayici.current) clearTimeout(toastZamanlayici.current);
    const uzunluk = String(msg || "").length;
    const sure = Math.min(12000, 4000 + Math.ceil(uzunluk / 20) * 1000);
    // Geri al'lı toast daha uzun kalır: karar için zaman gerekir.
    const toplam = secenek && secenek.geriAl ? Math.max(sure, 9000) : sure;
    toastZamanlayici.current = setTimeout(() => { setToast(null); setToastGeriAl(null); toastZamanlayici.current = null; }, toplam);
  }, []);

  const toastKapat = useCallback(() => {
    if (toastZamanlayici.current) { clearTimeout(toastZamanlayici.current); toastZamanlayici.current = null; }
    setToast(null); setToastGeriAl(null);
  }, []);

  // GEÇİŞ (16 Eylül, Parça 1): hareketi olmayan başlangıç miktarlarını açılış hareketine bağlar.
  // Bir kez çalışır (`acilis:goc` damgası); çalışmazsa düz hesap o stokları sıfırlardı.
  // Damga TANIMLARDA tutuluyor, cihazda değil: veri ortak, göç de hesap başına bir kez olmalı.
  // (İlk sürümde `localStorage` kullanılmıştı; her cihazda tekrar çalışıp ikinci kez açılış
  // hareketi yazma riski vardı.)
  const acilisGocuUygula = useCallback((urunler, tanimlarSimdi) => {
    if (tanimlarSimdi && tanimlarSimdi.acilisGocuYapildi) return urunler;
    const { urunler: yeni, yazilan, satirlar } = acilisFarklariniHareketeCevir(urunler, {
      tarih: bugunYerel(),
      fisNoUret: () => fisNoUret("ACL"),
    });
    if (yazilan > 0) {
      yazimiIzle(tabloYaz("stok:items", "urunler", yeni), "Stok kartları", yeni);
      setTanimlar((onceki) => {
        const yeniT = { ...onceki, acilisGocuYapildi: true };
        yazimiIzle(tekilYaz("tanimlar:data", "tanimlar", yeniT), "Tanımlar", yeniT);
        return yeniT;
      });
      gunlukYaz(`Açılış göçü: ${yazilan} varyantın hareketsiz başlangıç miktarı açılış fişine bağlandı`, "stok", { satirlar });
      setTimeout(() => showToast(`${yazilan} varyantın başlangıç stoğu açılış fişine bağlandı — stok artık hareketlerden hesaplanıyor`), 1500);
    }
    return yeni;
  }, [showToast]);


  // AÇILIŞ YÜKLEME AYRI DOSYADA (19 Eylül, 2. madde, 4. tur): en büyük tek parça (627 satır).
  // Bütün state'leri o dolduruyor — bulut mu yerel mi, hangi tablo hangi sırayla, göç gerekiyor mu.
  // `090-yukleme.jsx`e taşındı; App yalnız çağırıyor.
  useAcilisYukleme({
    yuklemeSayaci, acilisGocuUygula, showToast,
    setBekleyenYazmalar, setBulutGirisGerekli, setCariler, setCekGorselleri, setCop, setFisDefteri, setGorevler, setKoliler, setLoading, setMesajOkumalari, setMesajlar, setModeller, setMuhasebe, setOnaylar, setSiparisler, setStok, setStokRezervasyonlari, setStorageOk, setTanimlar, setUretim, setVeriKaynagi, setVeriKilidiSebep,
  });

  // YÖNETİCİSİZ LİSTE KİLİDİ (kullanıcı, 13 Eylül: sıfırladıktan sonra "Kullanıcı" rolüyle ekleyip
  // girişi açtı, kısıtlı girdi). Kısıtlı kullanıcı Tanımlar'ı bile göremediği için hiçbir ekrandan
  // düzeltemez. Giriş yapmış kullanıcı Yönetici değil ve listede HİÇ Yönetici yoksa, giren kişi
  // Yönetici yapılır — başka çıkış yok; Yönetici varsa dokunulmaz.
  useEffect(() => {
    // `girisSistemiAktif` bileşenin daha aşağısında tanımlı (const, TDZ) — burada doğrudan okunuyor.
    if (!tanimlar.girisAktifMi || !aktifKullanici || aktifKullanici.id === "test-modu") return;
    if (aktifKullanici.rol === "Yönetici") return;
    const liste = tanimlar.kullanicilar || [];
    if (liste.some((k) => k.rol === "Yönetici") || !liste.some((k) => k.id === aktifKullanici.id)) return;
    const yeni = liste.map((k) => (k.id === aktifKullanici.id ? { ...k, rol: "Yönetici" } : k));
    saveTanimlar({ ...tanimlar, kullanicilar: yeni });
    setAktifKullanici({ ...aktifKullanici, rol: "Yönetici" });
    gunlukYaz("Yöneticisiz liste: giren kullanıcı Yönetici yapıldı", "oturum", { kullanici: aktifKullanici.ad });
    showToast(`Listede yönetici yoktu — ${aktifKullanici.ad} Yönetici yapıldı`);
  }, [aktifKullanici, tanimlar]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bulut ön girişi yapan kullanıcı, veri gelince Tanımlar kaydıyla eşleniyor ve içeri alınıyor.
  // Kayıt yoksa (Tanımlar'da olmayan ama bulutta hesabı olan biri) normal giriş ekranına düşer.
  useEffect(() => {
    if (!bulutOnGiris || loading || aktifKullanici) return;
    const ad = bulutOnGiris.kullaniciAdi.toLocaleLowerCase("tr-TR");
    const k = (tanimlar.kullanicilar || []).find((x) =>
      (x.eposta && x.eposta.toLowerCase() === bulutOnGiris.eposta) ||
      String(x.kullaniciAdi || "").toLocaleLowerCase("tr-TR") === ad);
    setBulutOnGiris(null);
    if (!k) { showToast("Bulut hesabı var ama Tanımlar'da bu kullanıcı yok — yöneticiye başvurun"); return; }
    setAktifKullanici(k);
    setBulutKimligi(true);
    gunlukKullaniciAyarla(k);
    gunlukYaz("Giriş yaptı", "oturum", { rol: k.rol, kimlik: "bulut", onGiris: true });
  }, [bulutOnGiris, loading, aktifKullanici, tanimlar]); // eslint-disable-line react-hooks/exhaustive-deps

  // (Bekleyen yazma defteri — state yukarıda; bu blok bütün state'ler ve showToast tanımlandıktan
  // SONRA duruyor: bağımlılık listesi tanım anında değerlendirilir, önce yazmak TDZ çöküşü.)
  // Yeniden gönder: defterdeki her anahtar için state'teki GÜNCEL veriyle yazma yolu tekrar.
  const bekleyenleriYenidenGonder = useCallback(async (sessiz) => {
    const d = bekleyenYazmalariOku();
    const isler = [];
    if (d["stok:items"]) isler.push(tabloYaz("stok:items", "urunler", stok));
    if (d["siparis:data"]) isler.push(tabloYaz("siparis:data", "siparisler", siparisler));
    if (d["uretim:siparisler"]) isler.push(tabloYaz("uretim:siparisler", "uretim", uretim));
    if (d["cari:data"]) isler.push(tabloYaz("cari:data", "cariler", cariler));
    if (d["tanimlar:data"]) isler.push(tekilYaz("tanimlar:data", "tanimlar", tanimlar));
    if (d["muhasebe:data"]) isler.push(tekilYaz("muhasebe:data", "muhasebe", muhasebe));
    if (d["koli:data"]) isler.push(tekilYaz("koli:data", "koliler", koliler));
    if (d["gorev:data"]) isler.push(tekilYaz("gorev:data", "gorevler", gorevler));
    if (d["mesaj:data"]) isler.push(tekilYaz("mesaj:data", "mesajlar", mesajlar));
    await Promise.all(isler.map((p2) => Promise.resolve(p2).catch(() => {})));
    const kalan = Object.keys(bekleyenYazmalariOku()).length;
    if (!sessiz || kalan === 0) showToast(kalan === 0 ? "Bekleyen kayıtların hepsi buluta gönderildi" : `${kalan} tablo hâlâ gönderilemedi — "Hata" düğmesinden sebebini okuyun`);
  }, [stok, siparisler, uretim, cariler, tanimlar, muhasebe, koliler, gorevler, mesajlar, showToast]);
  // Bağlantı gelince ve açılıştan kısa süre sonra kendiliğinden dene.
  // Kendiliğinden deneme: bağlantı geri gelince ve dakikada bir — SESSİZ (toast yok), yalnız
  // başarı bildirilir. Her açılışta hemen denemek, ağ yokken sürekli hata üretirdi.
  //
  // VERİ KAYBI (22 Eylül, v1.408.0, denetim 18 C): zamanlayıcı ve "online" dinleyicisi, efektin
  // SON kurulduğu çizimdeki `bekleyenleriYenidenGonder`i çağırıyordu. Efekt yalnız bekleyen tablo
  // SAYISI değişince yeniden kuruluyor; o kopya stok/cari/siparişin O ANKİ hâlini `tabloYaz` ile
  // hem yerele hem buluta yazıyordu. İnternet kesikken girilen iş, bağlantı gelince SİLİNİYORDU
  // (kanıt: iki fiş kesildi, "online" olayından sonra ikisi de yerel depodan gitti). Artık her
  // tetiklemede GÜNCEL fonksiyon çağrılıyor.
  const yenidenGonderRef = useRef(bekleyenleriYenidenGonder);
  yenidenGonderRef.current = bekleyenleriYenidenGonder;
  useEffect(() => {
    if (loading || Object.keys(bekleyenYazmalar).length === 0) return;
    const z = setInterval(() => { yenidenGonderRef.current(true); }, 60000);
    const cevrimici = () => yenidenGonderRef.current(true);
    window.addEventListener("online", cevrimici);
    return () => { clearInterval(z); window.removeEventListener("online", cevrimici); };
  }, [loading, Object.keys(bekleyenYazmalar).length]); // eslint-disable-line react-hooks/exhaustive-deps

  // SÜRÜM KONTROLÜ VE OTOMATİK GEÇİŞ (25 Eylül, v1.447.0 — bkz. `surumeOtomatikGec`).
  //   • AÇILIŞTA: yeni sürüm varsa sormadan geçilir. Henüz bir şey girilmedi, kaybolacak iş yok.
  //   • UZUN SÜRE ARKA PLANDA KALIP GERİ GELİNCE (telefonda "uygulama" olarak açılan ekran böyle
  //     döner — sayfa yeniden yüklenmez, eski sürüm bellekte kalır): 10 dakikadan uzun gizli
  //     kaldıysa geçilir. Kısa süreli geçişte (WhatsApp'a bakıp dönmek) GEÇİLMEZ: yarım form kaybolurdu.
  //   • ÇALIŞIRKEN (10 dakikada bir bakılır): geçilmez, üstte "Yeni sürüm — Güncelle" şeridi çıkar.
  // Yerel veri ve bekleyen yazmalar aynı adresin deposunda; yeni sürüm onları aynen görür.
  useEffect(() => {
    let durduruldu = false;
    let gizlenme = null;
    const esik = window.__surumGeriDonusEsigiMs || 10 * 60 * 1000;   // test kancası
    const bak = async (gecisSerbest) => {
      const v = await guncelSurumuOku();
      if (durduruldu) return;
      if (gecisSerbest && surumeOtomatikGec(v, SURUM)) return;
      setYayinSurum(v);
    };
    bak(true);
    const z = setInterval(() => bak(false), 10 * 60 * 1000);
    const gorunurluk = () => {
      if (document.visibilityState === "hidden") { gizlenme = Date.now(); return; }
      const uzunSure = gizlenme !== null && Date.now() - gizlenme >= esik;
      gizlenme = null;
      bak(uzunSure);
    };
    document.addEventListener("visibilitychange", gorunurluk);
    return () => { durduruldu = true; clearInterval(z); document.removeEventListener("visibilitychange", gorunurluk); };
  }, []);

  // ---- Kullanıcı yetkilendirme ve onay sistemi ----
  // Not: Bu, tarayıcı tarafında (client-side) çalışan bir yetki kontrolüdür — gerçek bir güvenlik
  // duvarı değildir, ama günlük kullanımda kimin ne yapabileceğini düzenlemek ve hassas işlemleri
  // yöneticinin onayına bağlamak için yeterlidir.
  // PANEL KULLANICISI (17 Eylül): menüsü yok, tek ekrana kilitli.
  const panelKullanicisi = !!(tanimlar.girisAktifMi && aktifKullanici && aktifKullanici.rol === "Panel");
  const panelEkranAyari = panelKullanicisi
    ? (PANEL_EKRANLARI.find((x) => x.key === (aktifKullanici.panelEkrani || "barkod")) || PANEL_EKRANLARI[0])
    : null;
  // Panel kullanıcısı hangi sekmede olursa olsun kendi ekranına döner: adres/geçmiş ya da
  // uygulamanın kendi yönlendirmesi onu başka bir modüle taşımasın.
  useEffect(() => {
    if (panelEkranAyari && tab !== panelEkranAyari.tab) setTab(panelEkranAyari.tab);
  }, [panelEkranAyari, tab]);

  // YETKİ KARARI AYRI DOSYADA (19 Eylül, 2. madde): saf bir kural — girdisi tanımlar, kullanıcı,
  // modül ve işlem; çıktısı evet/hayır. App'in içinde durmasının tek sebebi state'e yakınlığıydı.
  // `094-yetki.jsx`e taşındı; burada yalnız o kurala bağlanan ince bir sarmalayıcı kaldı.
  function kullaniciYetkisiVar(modul, islemTipi) {
    return yetkiVarMi(tanimlar, aktifKullanici, modul, islemTipi);
  }

  // ONAY SİSTEMİ APP'TE KALIYOR (19 Eylül denemesi): ayrı dosyaya taşınmak istendi ama
  // `onayUygula` SİLME ZİNCİRLERİNİ çağırıyor ve onlar App'te çok daha sonra tanımlanıyor.
  // Hook'a almak, henüz var olmayan fonksiyonları parametre olarak istemek demekti; taşıma geri
  // alındı. Bu blok, bölünmesi için önce silme zincirleriyle arasındaki bağın çözülmesi gereken
  // bir parça — bölmek her zaman doğru cevap değil.

  // HAYALET KARŞILANAN ONARIMI (20 Eylül): sipariş kaleminin sayacını, stok hareketlerinden
  // hesaplanan GERÇEK sevk miktarına çeker. Sevkiyat/üretim silindiğinde sayaç geri alınmadığı
  // için sipariş kısmen planlanamaz kalıyordu — 136 çiftin 16'sı hiçbir yerde görünmeden
  // kayboluyordu.
  // KARŞILANAN HAREKETLERDEN TÜRETİLİYOR (20 Eylül): stok ya da siparişler değiştiğinde yeniden
  // hesaplanıyor. `setStok` içinde yapmak yetmiyordu — açılışta stok, siparişlerden ÖNCE
  // yükleniyor ve türetme boş listeyle çalışıp sonra üzerine yazılıyordu.
  //
  // Sonsuz döngü yok: hesap bir şey değiştirmezse AYNI dizi referansı dönüyor, effect durur.


  // YETİM REZERVASYON TEMİZLEME (20 Eylül): silinmiş üretimlerin rezervasyon kayıtlarını siler.
  const rezervasyonTemizle = useCallback((uretimNolari) => {
    if (!uretimNolari || uretimNolari.length === 0) return;
    const kume = new Set(uretimNolari.map(String));
    setStokRezervasyonlari((onceki) => {
      const kalan = (onceki || []).filter((r) => !(r && r.uretimNo && kume.has(String(r.uretimNo))));
      yazimiIzle(tabloYaz("stokrez:data", "stok_rezervasyonlari", kalan), "Stok rezervasyonları", kalan);
      return kalan;
    });
    showToast(`${uretimNolari.length} silinmiş üretimin rezervasyonları temizlendi`);
  }, [setStokRezervasyonlari, showToast]);


  const karsilananOnar = useCallback((kayitlar) => {
    if (!kayitlar || kayitlar.length === 0) return;
    setSiparisler((onceki) => onceki.map((sp) => {
      const buna = kayitlar.filter((k) => k.siparisId === sp.id);
      if (buna.length === 0) return sp;
      return {
        ...sp,
        kalemler: (sp.kalemler || []).map((k) => {
          const d = buna.find((x) => x.kalemId === k.id);
          return d ? { ...k, karsilanan: d.gercek } : k;
        }),
      };
    }));
    showToast(`${kayitlar.length} kalemin karşılanan miktarı düzeltildi`);
  }, [setSiparisler, showToast]);

  // ONAY SİSTEMİ AYRI DOSYADA (19 Eylül, 2. madde, 13. tur): `075-onay.jsx`.
  //
  // İlk denemede (v1.350.0) taşınamamıştı: `onayUygula` SİLME ZİNCİRLERİNİ çağırıyor, onlar ise
  // App'te çok daha sonra tanımlanıyor. Bağ artık bir REF ile çözüldü — hook işleri ref üzerinden
  // çağırıyor, App zincirler hazır olunca ref'i dolduruyor. Böylece tanım sırası bağımlılık
  // olmaktan çıktı.
  const onayIsleriRef = useRef({});
  const {
    onaySave, onayIste, onayUygula, onayaKarar, onayliIslem, setOnayliIslem,
    muhasebeOnayliIslem, setMuhasebeOnayliIslem,
  } = useOnaySistemi({ onaylar, setOnaylar, aktifKullanici, showToast, siparisler, setSiparisler, islerRef: onayIsleriRef });

  const kaydetmeHatasiBildir = useCallback((hata, etiket, veri) => {
    const mesaj = String((hata && hata.message) || "");
    if (mesaj.startsWith("BOYUT_ASIMI")) {
      const bayt = veriBoyutu(veri);
      hataGoster(
        `${etiket} kaydedilemedi — boyut sınırı aşıldı`,
        `${etiket} verisi ${boyutMetni(bayt)}, sınır ${boyutMetni(DEPO_SINIRI)}.\n\n` +
        "Sebep genellikle ürün görselleridir: görseller ürün kaydının İÇİNDE saklanıyor ve hepsi tek " +
        "kayda sığmak zorunda. Bu kayıt buluta YAZILAMADI — değişiklik yalnızca bu cihazda duruyor, " +
        "sayfayı yenilerseniz kaybolur.\n\n" +
        "Ne yapmalı: Tanımlar > Depolama Durumu'ndan hangi kayıtların yer kapladığını görün ve " +
        "kullanılmayan ürün görsellerini kaldırın."
      );
      return;
    }
    // TARAYICI DEPOSU DOLDU. Bu, kaydın kendi boyutuyla ilgili DEĞİL: 523 KB'lık bir kayıt bile,
    // depoda yer kalmadıysa yazılamıyor. "Veri boyutu 523 KB" demek kullanıcıyı yanlış yere
    // bakmaya yönlendiriyordu — asıl soru "depoyu ne dolduruyor".
    if (kotaHatasiMi(hata)) {
      const kullanim = depoKullanimi();
      const enBuyukler = kullanim
        ? kullanim.kayitlar.slice(0, 8).map((k) => `  ${k.anahtar} — ${boyutMetni(k.bayt)}`).join("\n")
        : "  (okunamadı)";
      const karakter = depoKarakterYuku();
      hataGoster(
        `${etiket} kaydedilemedi — tarayıcı deposu dolu`,
        `Bu kayıt ${boyutMetni(veriBoyutu(veri))}, yani sorun onun büyüklüğü değil: TARAYICININ ` +
        `yerel deposunda yer kalmamış (çoğu tarayıcıda toplam sınır ~5 MB).\n\n` +
        (kullanim ? `Toplam kullanım: ${boyutMetni(kullanim.toplam)}` : "") +
        // localStorage kotası KARAKTER sayar (UTF-16), bayt değil. İkisini birlikte yazmak,
        // "850 KB veri var ama kota doldu" çelişkisini açıklıyor.
        (karakter != null ? ` · ${(karakter / 1024).toFixed(1)} bin karakter\n\n` : "\n\n") +
        `En çok yer kaplayanlar:\n${enBuyukler}\n\n` +
        "Bu değişiklik KAYDEDİLMEDİ — sayfayı yenilerseniz kaybolur.\n\n" +
        (kullanim && kullanim.yabanci > kullanim.bizim
          ? "DİKKAT: deponun çoğunu BU UYGULAMAYA AİT OLMAYAN kayıtlar kullanıyor " +
            `(${boyutMetni(kullanim.yabanci)}). Dosyadan açılan sayfalar aynı tarayıcı deposunu ` +
            "paylaşır. Buradan görsel silmek yer AÇMAZ; o kaydı ait olduğu uygulamadan temizlemeniz gerekir."
          : "Ne yapmalı: Tanımlar > Çöp Kutusu'nu boşaltmak en hızlı yer açma yolu; " +
            "ardından kullanılmayan ürün görsellerini kaldırın.")
      );
      return;
    }

    // Yazmalar artık sıraya alınıyor ve üç kez deneniyor; buraya düşen bir hata GEÇİCİ DEĞİL demektir.
    // Bu yüzden "tekrar deneyin" demiyoruz — gerçek sebebi gösterip ne yapılacağını söylüyoruz.
    hataGoster(
      `${etiket} kaydedilemedi`,
      `${mesaj || "depolama yanıt vermedi"}\n\n` +
      `Veri boyutu: ${boyutMetni(veriBoyutu(veri))}\n` +
      "Yazma sıraya alınıp üç kez denendi; buraya düşen hata GEÇİCİ DEĞİL. " +
      "Sorun sürerse sayfayı yenileyip tekrar deneyin."
    );
  }, [hataGoster]);
  // Yazma katmanının (`yazimiIzle`) yerel hata köprüsü — bkz. 040-esitle.
  useEffect(() => {
    window.__kayitHatasiBildir = kaydetmeHatasiBildir;
    return () => { if (window.__kayitHatasiBildir === kaydetmeHatasiBildir) delete window.__kayitHatasiBildir; };
  }, [kaydetmeHatasiBildir]);

  const saveTanimlar = useCallback(async (next) => {
    // YENİ TANIMA KODU ANINDA VERİLİYOR. Kod atamayı ayrı bir düğmeye bırakmak, kullanıcının rengi
    // tanımlayıp etiket basmaya kalktığında "kod atanmamış" görmesi demekti. `kodlariAta` kodu
    // OLANA dokunmuyor, o yüzden her kayıtta güvenle çağrılabilir.
    // Stok no burada atanmıyor: ürün listesi bu yolda değil, onu `kodlariTamamla` dolduruyor.
    const kodlu = kodlariAta([], next).tanimlar;
    setTanimlar(kodlu);
    try {
      await tekilYaz("tanimlar:data", "tanimlar", kodlu);
    } catch (e) {
      kaydetmeHatasiBildir(e, "Tanımlar", kodlu);
    }
  }, [showToast, kaydetmeHatasiBildir]);

  // REÇETE ŞABLONLARI (21 Eylül): tanımlarda tutuluyor; ürün kartı ve modelhane buradan yazar.
  const receteSablonuKaydet = useCallback((sablon) => {
    if (!sablon || !sablon.ad) return;
    const mevcut = tanimlar.receteSablonlari || [];
    const var_ = mevcut.find((x) => x.id === sablon.id);
    saveTanimlar({ ...tanimlar, receteSablonlari: var_ ? mevcut.map((x) => (x.id === sablon.id ? sablon : x)) : [...mevcut, sablon] });
  }, [tanimlar, saveTanimlar]);

  // KAYITLI RAPORLAR `tanimlar.raporlar`da (245-rapor). Tanımlar kaydı zaten buluta bütün olarak
  // gidiyor; ayrı bir tablo açmadan ortak/kişisel raporlar her cihazda görünüyor.
  const raporlariKaydet = useCallback((raporlar) => {
    saveTanimlar({ ...tanimlar, raporlar });
  }, [tanimlar, saveTanimlar]);


  // Bir mamule YENİ RENK ekler ve aynı anda reçetesini kurar.
  //
  // Neden tek fonksiyon: renk eklemek ile reçetesini kurmak ayrı adımlar olduğunda ikincisi
  // unutuluyor. Reçetesi olmayan bir renk için sipariş girildiğinde hammadde ihtiyacı SIFIR çıkıyor
  // ve eksik ancak üretim aşamasında fark ediliyor. İkisi birlikte, tek işlemde yapılır.
  //
  // Reçete VAR OLAN bir renkten kopyalanır — sıfırdan reçete kurmak sipariş ekranında yapılacak iş
  // değildir. `hammaddeRenkleri` ile kopyadaki hammadde renkleri (kutu dahil) satır satır değiştirilir.
  const yeniRenkVeReceteEkle = useCallback((urunId, yeniRenk, kaynakRenk, hammaddeRenkleri) => {
    const ad = String(yeniRenk || "").trim();
    if (!ad) { showToast("Renk seçin"); return false; }
    const urun = stok.find((p) => p.id === urunId);
    if (!urun) return false;
    if (urun.variants.some((v) => v.renk === ad)) { showToast(`"${ad}" bu üründe zaten var`); return false; }

    // Yeni renge, mevcut bedenlerin AYNISI açılıyor; bu liste ekrana çıkmıyor, varyant üretiyor.
    const bedenler = Array.from(new Set(urun.variants.map((v) => v.beden)));  // sirasiz-tamam
    const varsayilanMinStok = (urun.variants[0] || {}).minStok || 0;
    const yeniVariants = bedenler.map((b) => ({ renk: ad, renkId: renkKimligiBul(ad, (tanimlar.renkler || [])), beden: b, miktar: 0, minStok: varsayilanMinStok }));

    // Kaynak rengin reçete satırları yeni renge kopyalanır.
    //
    // ÖNEMLİ: kopya, kaynak satırın `eklemeId`sini AYNEN DEVRALIR — yeni bir kimlik ÜRETİLMEZ.
    // Sebep: reçete görünümü eklemeId'ye göre gruplanıyor. Yeni kimlik verildiğinde aynı hammadde
    // ekranda iki ayrı kart olarak beliriyordu ("Fermuar (15 satır)" ve altında "Fermuar (5 satır)"),
    // sanki ayrı bir kullanım eklenmiş gibi. Oysa yeni bir mamul rengi eklemek, VAR OLAN reçete
    // satırının yeni bir renge uzatılmasıdır — matriste yeni bir SÜTUN olarak görünmelidir.
    //
    // eklemeId ayrımı, "aynı hammadde farklı amaçla ikinci kez eklendi" durumu içindir (ör. Deri
    // Nubuk hem yüz hem astar). Renk kopyalama o durum değildir.
    const kaynakSatirlar = kaynakRenk ? (urun.recete || []).filter((r) => r.mamulRenk === kaynakRenk) : [];
    const yeniRecete = kaynakSatirlar.map((r) => {
      const { id, ...kalan } = r;
      const degistirilmis = hammaddeRenkleri && hammaddeRenkleri[r.id];
      return { ...kalan, id: uid("recete"), mamulRenk: ad, renk: degistirilmis || r.renk };
    });

    setStok((prev) => {
      const next = prev.map((p) =>
        p.id === urunId
          ? { ...p, variants: [...p.variants, ...yeniVariants], recete: [...(p.recete || []), ...yeniRecete] }
          : p
      );
      yazimiIzle(tabloYaz("stok:items", "urunler", next), "Stok kartları", next);
      return next;
    });

    showToast(
      yeniRecete.length > 0
        ? `"${ad}" rengi eklendi — "${kaynakRenk}" reçetesinden ${yeniRecete.length} satır kopyalandı`
        : `"${ad}" rengi eklendi — reçete kopyalanmadı, Stok ekranından tanımlayın`
    );
    return true;
  }, [stok, showToast, tanimlar]);

  const saveStok = useCallback(async (next) => {
    setStok(next);
    // GÖRSELLER AYRI YAZILIYOR. `stok:items` tek anahtar ve `guvenliYaz` 5 MB'ı aşan kaydı
    // depoya sormadan reddediyor; görseller o anahtarın içindeyken yüz ürünün birkaç rengi
    // sınırı dolduruyor ve STOK KAYDEDİLEMEZ hâle geliyordu. Buluta görselli gidiyor (orada her
    // ürün kendi satırında, sıkışma yok), yerele görselsiz.
    const { stok: yerelStok, gorseller } = gorselleriAyir(next);
    try {
      await tabloYaz("stok:items", "urunler", next, yerelStok);
      // Görsel yazımı stok yazımını BEKLETMİYOR ve hatası stok kaydını düşürmüyor: görsel
      // kaybı can sıkıcı, stok kaybı iş durduran bir şey.
      gorselleriYaz(gorseller).catch((e) => console.error("Görsel yazılamadı:", e));
    } catch (e) {
      kaydetmeHatasiBildir(e, "Stok", yerelStok);
    }
  }, [showToast, kaydetmeHatasiBildir]);

  // AÇILIŞ FİŞİ — stok önbelleğinin hareketlerle açıklanamayan kısmını tek satıra döker.
  // Miktarları DEĞİŞTİRMEZ; yalnız nereden geldiklerini kayda geçirir. Bir kereye mahsus:
  // ikinci çağrıda üretecek fark kalmıyor.
  // PEŞİN HAREKET KÖPRÜSÜ — `addCariHareketFromStok`ün muhasebe karşılığı.
  //
  // Hareketi BURASI ÜRETMİYOR: `fisYaz` üretiyor, burası yalnızca hesabın defterine yerleştirip
  // kaydediyor. Ayrı bir fonksiyon olmasının sebebi kapı sayımı: `stokFisiKaydet`in içinde
  // kalsaydı o fonksiyon "hareket yazan yeni bir kapı" gibi görünür ve 16. denetimin ölçtüğü
  // kopya sayısı yanıltıcı olurdu.
  const muhasebeyePesinIsle = useCallback((p) => {
    if (!p || !p.hesapId) return;
    setMuhasebe((onceki) => {
      const yeni = hesabaHareketEkle(onceki, p.hesapTur, p.hesapId, p.hareket);
      yazimiIzle(tekilYaz("muhasebe:data", "muhasebe", yeni), "Muhasebe", yeni);
      return yeni;
    });
  }, []);

  const acilisFisiKes = useCallback(() => {
    const sonuc = acilisFisleriUret(stok, {
      fisNoUretici: () => fisNoUret("ACL"),
      tarih: bugunYerel(),
    });
    if (sonuc.hareketler.length === 0) { showToast("Açık yok — bütün miktarların hareket karşılığı var"); return; }
    saveStok(sonuc.stok);
    gunlukYaz(`Açılış fişi: ${sonuc.hareketler.length} satır, ${sonuc.urunSayisi} üründe`, "stok");
    showToast(`Açılış fişi kesildi — ${sonuc.urunSayisi} üründe ${sonuc.hareketler.length} satır`);
  }, [stok, saveStok, showToast]);

  const saveUretim = useCallback(async (next) => {
    setUretim(next);
    try {
      await tabloYaz("uretim:siparisler", "uretim", next);
    } catch (e) {
      kaydetmeHatasiBildir(e, "Üretim", next);
    }
  }, [showToast, kaydetmeHatasiBildir]);

  // Satış siparişindeki eksik bir kalemi Üretim'e planlar: yeni üretim siparişi açar, kalemi işaretler.
  // Bir veya birden fazla kalemi Üretim'e planlar. Aynı renk için tek üretim siparişi (çoklu beden),
  // farklı renkler için ayrı üretim siparişleri açar; hepsi tek çağrıda oluşturulur.
  // girdiler: kalemId string dizisi (eskiden kalan tam miktar kullanılır) YA DA
  // {kalemId, miktar} çiftleri dizisi (kullanıcının girdiği özel adet kullanılır).
  // ---- HURDA TELAFİ ÜRETİMİ ----
  // Hurdaya çıkan çiftler için, aynı ürün/renk/bedende İLK PROSESTEN başlayan yeni bir üretim emri
  // açar. Sipariş eksik kalmasın diye gereklidir; elle açtırmak, unutulmaya ve siparişin eksik
  // teslim edilmesine açık bir adım olurdu.
  //
  // Kaynak üretimin bilgileri (renk, kutu tercihi, satış bağlantısı) kopyalanır — telafi üretimi
  // aslen aynı işin tekrarıdır ve aynı kurallara tabidir.
  // HURDA TELAFİ ÜRETİMİ AYRI DOSYADA (19 Eylül, 2. madde, 8. tur): `084-hurda-telafi.jsx`.
  const hurdaTelafiUretimiAc = useHurdaTelafi({ uretim, setUretim, stok, showToast, tanimlar, cop });

  // TEDARİK PLANLAMA AYRI DOSYADA (19 Eylül, 2. madde, 12. tur): `078-planlama.jsx`.
  const { planlaUretim, planlaSatinAlma, planlaHammaddeSatinAlma } = usePlanlama({
    uretim, stok, tanimlar, siparisler, cariler, stokRezervasyonlari, showToast, setUretim, setSiparisler, setStokRezervasyonlari, setStok, cop,
  });

  // Üretim siparişi "Tamamlandı" durumuna geçince, bağlı stok ürününe otomatik Üretim kaynaklı stok girişi yapar.
  // Bir üretim siparişinin belirli bir prosesini tamamlar: o proses için gereken hammaddeyi düşer,
  // atanan personele proses ücretini işler, ve tüm prosesler bitince mamulü otomatik stoğa ekler.
  // AŞAMA 1: İşi personele "ver" — hammadde ve işçilik bu proses için rezerve edilir (görüntüde),
  // ama stoktan HENÜZ düşülmez ve cariye HENÜZ işlenmez. Bunlar sadece "Teslim Al" aşamasında olur.
  // Bir proses adımı artık BİRDEN FAZLA personele KISMİ miktarlarla dağıtılabilir (örn. 100 çiftin
  // 30'u Ahmet'e, 70'i Mehmet'e). Her dağıtım "atama" olarak adım içindeki `atamalar` dizisine eklenir.
  // Adımın kendisi, TÜM adet dağıtılana kadar `verildiMi:false` kalır (kısmi dağıtım hâlâ devam ediyor demektir).
  // `parcaBarkod`: bir parça SONRAKİ prosese geçerken KENDİ kodunu taşır. Kullanıcı: "bölünen parça
  // yoluna -1 eki almış olarak devam edecek, sanki ayrı üretimmiş gibi." Kod verilmezse bölünme
  // kuralına göre üretilir (aşağıda).
  // PROSESE İŞ VERME AYRI DOSYADA (19 Eylül, 2. madde, 10. tur): `080-proses-ver.jsx`.
  const uretimProsesVer = useProsesVer({
    uretim, stok, cariler, tanimlar, siparisler, stokRezervasyonlari, showToast, setUretim, setStok, setCariler, setStokRezervasyonlari,
  });

  // "Verildi" ama henüz "teslim alınmadı" bir ATAMAYI geri alır — örn. yanlış personele/miktarla iş
  // verilmişse, hiçbir stok/cari etkisi henüz oluşmadığı için bu tamamen zararsız, basit bir geri
  // alma işlemidir. Atama tamamen kaldırılır, dağıtılan miktar geri "kalan"a döner.
  const uretimProsesVerGeriAl = useCallback((uretimId, prosesAdi, atamaId) => {
    const siparis = uretim.find((o) => o.id === uretimId);
    if (!siparis || !siparis.prosesIlerleme) return;
    const adimIndex = siparis.prosesIlerleme.findIndex((p) => p.proses === prosesAdi);
    if (adimIndex === -1) return;
    const adim = siparis.prosesIlerleme[adimIndex];
    const atama = (adim.atamalar || []).find((a) => a.id === atamaId);
    if (!atama || atama.tamamlandiMi) return;
    const nextProsesIlerleme = siparis.prosesIlerleme.map((p, i) => {
      if (i !== adimIndex) return p;
      const yeniAtamalar = (p.atamalar || []).filter((a) => a.id !== atamaId);
      return { ...p, atamalar: yeniAtamalar, verildiMi: false };
    });
    const nextUretim = uretim.map((o) => (o.id === uretimId ? { ...o, prosesIlerleme: nextProsesIlerleme } : o));
    setUretim(nextUretim);
    yazimiIzle(tabloYaz("uretim:siparisler", "uretim", nextUretim), "Üretim", nextUretim);
    showToast(`"${prosesAdi}" için ${atama.miktar} adetlik atama geri alındı`);
  }, [uretim, showToast]);

  // AŞAMA 2: Belirli bir ATAMAYI personelden "teslim al" — bu, o atamanın miktarına karşılık gelen
  // hammaddeyi gerçekten stoktan düşer ve işçilik ücretini gerçekten o personelin cari hesabına işler.
  // Adımın TAMAMI (tüm atamalar) bitmeden bir sonraki prosese geçilemez.
  // sonuc: { saglam:{beden:adet}, tamir:[{beden,miktar,hedefProses,sebep,hammaddeler:[urunId],ucret}],
  //          hurda:[{beden,miktar,sebep}] } — verilmezse tamamı sağlam sayılır.
  // ÜRETİM TESLİM ALMA AYRI DOSYADA (19 Eylül, 2. madde, 11. tur): `079-uretim-teslim.jsx`.
  const uretimProsesAtamaTeslimAl = useUretimTeslim({
    stok, cariler, uretim, siparisler, tanimlar, showToast, setStok, setCariler, setUretim, aktifKullanici,
    stokRezervasyonlari, setSiparisler, setStokRezervasyonlari,
  });

  // FİŞ DEFTERİ KANCASI BURADA (22 Eylül, v1.407.0): aşağıdaki geri alma bağımlılık dizisinde
  // `fisDefterindeIptal`i istiyor; dizi çizim anında okunduğu için ad ÖNCE tanımlı olmalı
  // (aşağıda tanımlıyken uygulama "before initialization" ile açılmıyordu). Eksik bağımlılığın
  // asıl sebebi de bu sıralamaydı.
  const { fisDefterineKayitYaz, fisDefterineYaz, fisDefterindeIptal } = useFisDefteriYazma({
    fisDefteri, setFisDefteri, showToast, kaydetmeHatasiBildir, aktifKullanici,
  });

  // Zaten "teslim alınmış" (tamamlandiMi) bir adımı geri alır: o prosese ait hammadde tüketimini
  // stoğa geri ekler, personele işlenmiş işçilik cari kaydını kaldırır, ve (son proses ise) stoğa
  // eklenmiş mamulü de geri düşer. Yalnızca bu adımdan SONRAKİ hiçbir adım başlamamışsa (verilmemişse)
  // izin verilir — aksi halde sıralı ilerleme bozulur.
  const uretimProsesAtamaTeslimGeriAl = useCallback((uretimId, prosesAdi, atamaId) => {
    const siparis = uretim.find((o) => o.id === uretimId);
    if (!siparis || !siparis.prosesIlerleme) return;
    const adimIndex = siparis.prosesIlerleme.findIndex((p) => p.proses === prosesAdi);
    if (adimIndex === -1) return;
    const adim = siparis.prosesIlerleme[adimIndex];
    const araProsesMi = !!adim.araProsesMi;

    // ---- UYGUNLUK ----
    // Ara prosesler tek parça (atamasız) tamamlanır — kendi basit dalı.
    const atama = araProsesMi ? null : (adim.atamalar || []).find((a) => a.id === atamaId);
    if (araProsesMi ? !adim.tamamlandiMi : (!atama || !atama.tamamlandiMi)) return;

    // SONDAN GERİYE DOĞRU: bu adımdan sonraki hiçbir adım başlamamış olmalı. Prosesler sıralıdır,
    // bir adımın çıktısı sonraki adımın girdisi; ortadaki bir adımı geri almak zinciri koparır.
    // Fişler ekranı ve cari ekstresi bu yüzden kilitli — kural burada, tek yerde.
    const sonrakilerBaslamamis = siparis.prosesIlerleme.slice(adimIndex + 1)
      .every((p) => !p.verildiMi && !p.tamamlandiMi && (!p.atamalar || p.atamalar.length === 0));
    if (!sonrakilerBaslamamis) {
      showToast("Sonraki prosesler başlamış — önce onları geri almalısınız");
      return;
    }

    // ---- TEK KAPI ----
    // Stok, cari ve üretim ilerlemesinin geri alınması `fisGeriAl`da. Fiş numarası ailesi de orada
    // kuruluyor (`uretimFisAdlari`) — teslim almadaki formülün tek kopyası. Burada kalan iş
    // rezervasyon iadesi, yazma ve bildirim.
    const sonuc = fisGeriAl({ stok, cariler, siparisler, uretim, muhasebe, koliler }, {
      uretimHedefi: { uretimId, prosesAdi, atamaId: araProsesMi ? null : atamaId },
      uretimeIzinVer: true,
    });
    if (sonuc.engel) { showToast("Geri alınamadı — ilgili üretim kaydı bulunamadı"); return; }
    (sonuc.silinenFisNolar || []).forEach(fisDefterindeIptal);   // defterde iptal işareti (Adım 1)

    // ---- REZERVASYON İADESİ ----
    // Geri alınan ÇIKIŞLAR serbest bırakılmalı: rezervasyondan düşülmüş paylar iade edilmezse
    // rezervasyon kapalı görünmeye devam eder ve malzeme "kullanılmış" sayılır.
    // Kaynak, silinen NEGATİF stok hareketleri (tüketim); iade, tüketimin TERSİ sırayla yapılır:
    // önce alış rezervasyonu, sonra stok rezervasyonu.
    //
    // Yalnızca ATAMALI prosesler için — eski davranış birebir korundu. Ara proseslerde iade hiç
    // yapılmıyordu; buraya taşımak rezervasyon sayılarını değiştirirdi (bkz. DEVAM-NOTU, ayrışma 10).
    let nextSiparislerRez = siparisler;
    let nextStokRezGeri = stokRezervasyonlari;
    let iadeEdilenRez = 0;
    if (!araProsesMi && siparis.rezervasyonSiparisId) {
      sonuc.silinenStokKayitlari.forEach(({ urun, hareket: h }) => {
        if (h.miktar >= 0) return;
        const miktar = Math.abs(h.miktar);
        const r = rezervasyonTuket(
          nextSiparislerRez, siparis.rezervasyonSiparisId, urun.id, h.renk, h.beden, miktar, +1
        );
        nextSiparislerRez = r.yeniSiparisler;
        iadeEdilenRez += r.dusulen;
        const kalanIade = miktar - r.dusulen;
        if (kalanIade > 0.0001) {
          const sr = stokRezervasyonTuket(
            nextStokRezGeri, siparis.rezervasyonSiparisId, urun.id, h.renk, h.beden, kalanIade, +1
          );
          nextStokRezGeri = sr.defter;
          iadeEdilenRez += sr.dusulen;
        }
      });
    }

    setStok(sonuc.stok);
    setCariler(sonuc.cariler);
    setUretim(sonuc.uretim);
    yazimiIzle(tabloYaz("stok:items", "urunler", sonuc.stok), "Stok kartları", sonuc.stok);
    yazimiIzle(tabloYaz("cari:data", "cariler", sonuc.cariler), "Cari kartları", sonuc.cariler);
    yazimiIzle(tabloYaz("uretim:siparisler", "uretim", sonuc.uretim), "Üretim", sonuc.uretim);
    if (nextSiparislerRez !== siparisler) {
      setSiparisler(nextSiparislerRez);
      yazimiIzle(tabloYaz("siparis:data", "siparisler", nextSiparislerRez), "Siparişler", nextSiparislerRez);
    }
    if (nextStokRezGeri !== stokRezervasyonlari) {
      setStokRezervasyonlari(nextStokRezGeri);
      yazimiIzle(tabloYaz("stokrez:data", "stok_rezervasyonlari", nextStokRezGeri), "Stok rezervasyonları", nextStokRezGeri);
    }

    showToast(
      araProsesMi
        ? `"${prosesAdi}" ara prosesinin otomatik tamamlanması geri alındı — hammadde ve işçilik geri alındı`
        : `"${prosesAdi}" için ${atama.miktar} adetlik teslim alma işlemi geri alındı — hammadde ve işçilik geri alındı` +
          (iadeEdilenRez > 0 ? " · rezervasyon payları serbest bırakıldı" : "")
    );
  }, [uretim, stok, cariler, siparisler, stokRezervasyonlari, showToast, muhasebe, koliler, fisDefterindeIptal]);

  // Bir üretim siparişini siler; bu üretime bağlı (Tedarik Planlama ile oluşmuş) bir satış kalemi varsa
  // o kalemin planlama referansını temizleyerek yeniden planlanabilir hale getirir.
  // cascade=true ise: bu üretimin tamamlanmış proseslerinde stoktan düşülen hammaddeleri geri ekler,
  // personele işlenmiş işçilik cari hareketlerini kaldırır, ve stoğa eklenmiş mamulü geri düşer.

  // ÇÖP KUTUSU AYRI DOSYADA (19 Eylül, 2. madde, 12. tur): `077-cop.jsx`.
  const { copaAt, coptanKaliciSil, copuBosalt, coptanGeriYukle } = useCopKutusu({
    cop, setCop, showToast, aktifKullanici,
    stok, cariler, siparisler, uretim, koliler, muhasebe,
    setStok, setCariler, setSiparisler, setUretim, setKoliler, setMuhasebe,
  });

  const adimlariYurut = useCallback(async (adimlar) => {
    const yapilan = [];
    for (const adim of adimlar) {
      adim.yerelUygula();
      const sonuc = await adim.yaz();
      if (!sonuc || sonuc.ok === false) {
        return { ok: false, yapilan, kalan: adim.ad, hata: (sonuc && sonuc.hata) || "bilinmeyen hata" };
      }
      yapilan.push(adim.ad);
    }
    return { ok: true, yapilan };
  }, []);

  // ÜRETİM SİLME AYRI DOSYADA (19 Eylül, 2. madde, 13. tur): `076-uretim-sil.jsx`.
  const uretimSil = useUretimSil({
    uretim, siparisler, stok, cariler, showToast, adimlariYurut, setUretim, setSiparisler, setStok, setCariler, copaAt, stokRezervasyonlari, setStokRezervasyonlari, aktifKullanici,
  });

  // Bir satış kalemindeki geçersiz (bağlı kaydı silinmiş) planlama referansını temizler.
  const planlamaTemizle = useCallback((satisSiparisId, kalemId) => {
    const nextSiparisler = siparisler.map((s) =>
      s.id === satisSiparisId
        ? { ...s, kalemler: bekleyenKalemleriBirlestir(s.kalemler.map((k) => (k.id === kalemId ? { ...k, planlama: null } : k))) }
        : s
    );
    setSiparisler(nextSiparisler);
    yazimiIzle(tabloYaz("siparis:data", "siparisler", nextSiparisler), "Siparişler", nextSiparisler);
    showToast("Geçersiz planlama referansı temizlendi — kalem yeniden planlanabilir");
  }, [siparisler, showToast]);

  // ---- KOLİ (PAKETLEME) ----
  // Koli kodu SIRALI: "K-20260902-001". Fiş numaralarıyla aynı gerekçe — barkod okunmadığında
  // insan gözüyle okunup elle aranabilmeli, rastgele bir blok bunu imkânsız kılıyordu.
  // SOHBET ANLIK AKSIN (kullanıcı, 17 Eylül: "sohbet anlık değil, gönderildiği gibi gitmiyor,
  // sayfa yenileyince gözüküyor").
  //
  // Mesajlar açılışta bir kez okunuyordu; karşı tarafın yazdığı, sayfa yenilenene kadar
  // görünmüyordu. Artık sohbet ekranı AÇIKKEN 6 saniyede bir buluttan tazeleniyor; ekran kapalıyken
  // yoklama durur (boşa istek atmamak için). Gerçek zamanlı abonelik daha zarif olurdu ama ayrı bir
  // bağlantı katmanı gerektiriyor; 6 saniyelik yoklama atölye için yeterince "anlık" ve basit.
  //
  // KENDİ MESAJIM ZATEN EKRANDA: gönderince yerel listeye giriyor, yoklama onu ezmiyor çünkü
  // gelen liste kendi yazdığımızı da içeriyor (aynı tekil tablo).
  useEffect(() => {
    if (tab !== "gorevler" || !supabaseAcikMi()) return;
    let durduruldu = false;
    const tazele = async () => {
      try {
        const satir = await supabaseTumSatirlar("mesajlar");
        if (durduruldu || !satir[0] || !satir[0].veri) return;
        setMesajlar((onceki) => {
          const gelen = satir[0].veri;
          // Referansı ancak GERÇEKTEN değiştiyse yenile: her yoklamada yeni dizi vermek
          // sohbet ekranını boşa yeniden çizer ve yazma alanını sıçratır.
          if (Array.isArray(gelen) && gelen.length === (onceki || []).length) return onceki;
          return gelen;
        });
      } catch (e) { /* çevrimdışıysa sessizce geç: yerel liste duruyor */ }
    };
    tazele();
    const zamanlayici = setInterval(tazele, 6000);
    return () => { durduruldu = true; clearInterval(zamanlayici); };
  }, [tab]);

  const saveMesajlar = useCallback(async (next) => {
    setMesajlar(next);
    try {
      await tekilYaz("mesaj:data", "mesajlar", next);
    } catch (e) {
      kaydetmeHatasiBildir(e, "Mesajlar", next);
    }
  }, [kaydetmeHatasiBildir]);

  // Okuma damgası YALNIZ YEREL: "hangi mesajı okudum" bilgisi cihaza ait, buluta yazmak başka
  // kullanıcının sayacını da etkilerdi.
  const okumaKaydet = useCallback((kanal, zaman) => {
    setMesajOkumalari((o) => {
      const next = { ...o, [kanal]: zaman };
      // Okuma damgası YALNIZ BU CİHAZA ait (kimin neyi okuduğu kişisel); buluta yazmak başka
      // kullanıcının okunmamış sayacını da değiştirirdi.
      guvenliYaz("mesaj:okuma", JSON.stringify(next), true).catch(() => {}); // katman-muaf: kişisel okuma damgası
      return next;
    });
  }, []);

  // ATOMİK FİŞ KAPISI (Adım 1). Fişin bütün yan etkileri BURADAN geçer:
  //   1. `fisYaz` sonucu hesaplanır (hiçbir şey kaydedilmez),
  //   2. fiş kaydı deftere TEK yazmada gider,
  //   3. yazma başarısızsa İŞLEM İPTAL: stok/sipariş/cari'ye dokunulmaz, çağıran `false` alır,
  //   4. başarılıysa çağıran türev tabloları günceller.
  // Böylece "yarısı yazıldı" durumu ortadan kalkar: ya fiş vardır ya yoktur.
  // Hazır kayıt yazan sürüm (sipariş yolu kaydı kendisi kuruyor).
  // FİŞ DEFTERİ YAZMA YOLLARI AYRI DOSYADA (19 Eylül, 2. madde): `091-fisdefter-yaz.jsx`.
  // Kancanın çağrısı YUKARIDA, üretim teslim geri almadan önce (bkz. orada).

  const saveModeller = useCallback((next) => {
    setModeller(next);
    yazimiIzle(tekilYaz("model:data", "modeller", next), "Modeller", next);
  }, []);

  // KOLEKSİYONA AL: model → mamul ürün kartı. Teknik çizimler, teknik not ve künye bilgisi
  // taşınıyor; model kaydı SİLİNMİYOR, "koleksiyon" aşamasına geçip arşivde kalıyor (gelecek
  // sezonda ona bakılacak) ve oluşan ürünün kimliğini taşıyor.
  // NUMUNE ÜRETİMİ (Modelhane 3. tur, 20 Eylül). Kullanıcı: "üretimi çift yapıyoruz ama
  // numune tek de üretilebiliyor, yani 1/2 çift."
  //
  // NEDEN ÜRETİM MODÜLÜ DEĞİL: numune modelcinin elinde, tek parça, proses takibi olmadan
  // yapılır. Üretim modülü stok ÜRÜNÜ ister; model ürün değil (1. tur kararı). Onu sanal ürünle
  // kandırmak, her okuma noktasına istisna koymak demekti. Numune için gereken tek şey:
  //   hammadde reçete × miktar kadar DÜŞER, mamul stoğuna GİRMEZ, kendi fişi olur (NUM-MMDD-n),
  //   maliyeti tura yazılır.
  //
  // YARIM ÇİFT: miktar çift cinsinden ama 0,5 olabilir (tek ayak). Reçete çift başına
  // yazıldığı için tüketim = reçete × 0,5. Kesirli tüketim stokYuvarla ile iki hanede.
  const numuneUret = useCallback((model, turId, { miktar, beden }) => {
    const adet = parseFloat(miktar) || 0;
    if (!(adet > 0)) { showToast("Numune miktarı girin (0,5 = tek ayak, 1 = çift)"); return false; }
    const recete = model.recete || [];
    if (recete.length === 0) { showToast("Önce reçete girin — numune neyden yapılacak?"); return false; }
    const fisNo = fisNoUret("NUM");
    const tarih = new Date().toISOString();
    let maliyet = 0;
    const eksikler = [];
    const nextStok = stok.map((u) => {
      const satirlar = recete.filter((r) => r.hammaddeUrunId === u.id);
      if (satirlar.length === 0) return u;
      let variants = u.variants || [];
      const yeniHareketler = [];
      satirlar.forEach((r) => {
        const tuket = stokYuvarla((parseFloat(r.miktar) || 0) * adet);
        if (tuket <= 0) return;
        // Renk eşleşmesi: reçetede renk yazılıysa o varyant, yoksa ilk varyant.
        const v = variants.find((x) => (r.renk ? (x.renk || "") === r.renk : true)) || variants[0];
        if (!v) { eksikler.push(`${u.ad}: varyant yok`); return; }
        if ((v.miktar || 0) < tuket) eksikler.push(`${u.ad} ${v.renk || ""}: stok ${v.miktar || 0}, gerekli ${tuket}`);
        variants = variants.map((x) => (x === v ? { ...x, miktar: stokYuvarla((x.miktar || 0) - tuket) } : x));
        maliyet += tuket * (u.alisFiyati || 0);
        yeniHareketler.push({
          id: uid("hrk"), tarih, renk: v.renk || "", beden: v.beden || "", miktar: -tuket,
          kaynak: "Numune", fisNo, siparisNo: model.kod, cariId: null,
          aciklama: `Numune ${model.kod} · ${adet} çift${beden ? ` · ${beden}` : ""}`,
        });
      });
      if (yeniHareketler.length === 0) return u;
      return { ...u, variants, hareketler: [...yeniHareketler, ...(u.hareketler || [])].slice(0, HAREKET_GECMIS_SINIRI) };
    });
    // OLMAYAN MALZEMEYLE NUMUNE YAPILMAZ: stok yetmiyorsa hiç yazma (satış kuralıyla aynı).
    if (eksikler.length > 0) { showToast(`Stok yetmiyor — ${eksikler.join(" · ")}`); return false; }
    // KALICI YAZMA: `setStok` yalnız bellek; diğer kapılar gibi `saveStok` (yerel + bulut).
    saveStok(nextStok);
    saveModeller((modeller || []).map((m) => (m.id !== model.id ? m : {
      ...m,
      numuneler: (m.numuneler || []).map((n) => (n.id !== turId ? n : {
        ...n, uretim: { fisNo, miktar: adet, beden: beden || "", tarih, maliyet: Math.round(maliyet * 100) / 100 },
      })),
      gecmis: [...(m.gecmis || []), { tarih, olay: `Numune üretildi: ${adet} çift${beden ? ` · ${beden}` : ""} · ${fisNo}` }],
    })));
    showToast(`Numune üretildi — ${fisNo} · hammadde ${Math.round(maliyet)} ₺`);
    return true;
  }, [stok, saveStok, modeller, saveModeller, fisNoUret, showToast]);

  // NUMUNE ÜRETİMİ (Modelhane 3. tur, 20 Eylül): model kartından üretim emri açılır.
  // Ürün kartı YOK — reçete ve ad emre kopyalanır, üretim modülü `uretimUrunu()` ile sanal
  // ürün görür. Hammadde düşer; mamul stoğuna girmez (girecek ürün yok). Beden serisi künyeden
  // (yoksa tek çift "—"). Onaylı numune kararı numune sekmesinde verilir, buradan değil.
  const numuneUretimiAc = useCallback((model) => {
    if (!model) return;
    const siraMap = {};
    (tanimlar.prosesler || []).forEach((p) => { siraMap[p.ad] = p.sira ?? 999; });
    const uretimNo = String(enBuyukUretimNo(uretim, cop) + 1);
    const recete = (model.recete || []).map((r) => ({ ...r, mamulRenk: r.mamulRenk || "Numune" }));
    const prosesler = Array.from(new Set(recete.filter((r) => r.proses).map((r) => r.proses)));
    const prosesIlerleme = prosesler.length > 0
      ? prosesler.map((p) => ({ proses: p, sira: siraMap[p] ?? 999, tamamlandiMi: false, personelId: null, tamamlanmaTarihi: null }))
          .sort((a, b) => a.sira - b.sira)
      : [{ proses: "Üretim", sira: 0, tamamlandiMi: false, personelId: null, tamamlanmaTarihi: null }];
    const bedenler = String(model.bedenSerisi || "").split(/[,\s\-–]+/).map((x) => x.trim()).filter(Boolean);
    const bedenMiktarlari = bedenler.length > 0 ? [{ beden: bedenler[0], miktar: 1 }] : [{ beden: "—", miktar: 1 }];
    const yeni = {
      id: uid("uretim"), siparisNo: uretimNo, takipKodu: uretimNo,
      numuneMi: true, modelId: model.id, modelKod: model.kod || "",
      model: `${model.ad || model.kod || "Model"} (NUMUNE)`,
      urunId: null, renk: "Numune", recete, prosesUcretleri: {},
      adet: 1, beden: `Numune · ${bedenMiktarlari[0].beden}:1`, bedenMiktarlari,
      stogaEklendiMi: false, prosesIlerleme, termin: "",
      not: `Numune üretimi — model ${model.kod || ""}`, asama: "Planlandı",
      olusturuldu: new Date().toISOString(),
    };
    const nextUretim = [...uretim, yeni];
    setUretim(nextUretim);
    yazimiIzle(tabloYaz("uretim:siparisler", "uretim", nextUretim), "Üretim", nextUretim);
    // Model geçmişine yaz.
    setModeller((onceki) => {
      const next = (onceki || []).map((m) => (m.id === model.id
        ? { ...m, gecmis: [...(m.gecmis || []), { tarih: new Date().toISOString(), olay: `Numune üretimi açıldı: ${uretimNo}` }],
            asama: m.asama === "fikir" || m.asama === "cizim" || m.asama === "kalip" ? "numune" : m.asama }
        : m));
      yazimiIzle(tabloYaz("model:data", "modeller", next), "Modeller", next);
      return next;
    });
    showToast(`Numune üretimi açıldı: ${uretimNo}`);
    return uretimNo;
  }, [uretim, cop, tanimlar, setUretim, setModeller, showToast]);

  const modeliKoleksiyonaAl = useCallback((model) => {
    if (model.urunId && stok.some((p) => p.id === model.urunId)) {
      showToast(`${model.kod} zaten ürüne dönüştürülmüş`);
      return;
    }
    const yeniUrun = {
      id: uid("urun"),
      ad: model.ad,
      kategori: "Mamul",
      birim: "çift",
      olcuTipi: "Beden",
      kapakResmi: model.kapakResmi || ((model.tasarimGorselleri || [])[0] || {}).gorsel || "",
      teknikCizimler: (model.teknikCizimler || []).map((c) => ({ ...c })),
      teknikNot: model.teknikNot || "",
      // Künye bilgisi ürün kartında not olarak duruyor: kalıp/taban/topuk alanları ürün kartında
      // yok, uydurmak yerine okunur biçimde taşınıyor.
      not: [model.kod, model.sezon && `Sezon: ${model.sezon}`, model.kalip && `Kalıp: ${model.kalip}`,
        model.taban && `Taban: ${model.taban}`, model.topuk && `Topuk: ${model.topuk}`]
        .filter(Boolean).join(" · "),
      variants: [],
      hareketler: [],
      recete: (model.recete || []).map((r) => ({ ...r })),
      modelId: model.id,
      olusturuldu: new Date().toISOString(),
    };
    const nextStok = [...stok, yeniUrun];
    setStok(nextStok);
    yazimiIzle(tabloYaz("stok:items", "urunler", nextStok), "Stok kartları", nextStok);
    saveModeller((modeller || []).map((m) => (m.id === model.id
      ? { ...m, asama: "koleksiyon", urunId: yeniUrun.id,
        gecmis: [...(m.gecmis || []), { zaman: new Date().toISOString(), olay: "Koleksiyona alındı — ürün kartı oluşturuldu" }] }
      : m)));
    gunlukYaz(`Model koleksiyona alındı: ${model.kod} → ${model.ad}`, "modelhane", { modelId: model.id });
    showToast(`${model.kod} koleksiyona alındı — Stok'ta "${model.ad}" ürün kartı açıldı`);
  }, [stok, modeller, saveModeller, showToast]);

  const saveGorevler = useCallback(async (next) => {
    setGorevler(next);
    try {
      await tekilYaz("gorev:data", "gorevler", next);
    } catch (e) {
      kaydetmeHatasiBildir(e, "Görevler", next);
    }
  }, [kaydetmeHatasiBildir]);

  // KOLİ (PAKETLEME) AYRI DOSYADA (19 Eylül, 2. madde): `092-koliler.jsx`.
  const { saveKoliler, koliEkle, koliEkleCoklu, koliSil } = useKoliler({ koliler, setKoliler, stok, showToast, copaAt, kaydetmeHatasiBildir, aktifKullanici });

  // KALICI KODLARI TAMAMLAR — ürünlere stok no, renk/ölçü/asorti tanımlarına kod atar.
  //
  // Barkodun tamamı bu kodlardan kuruluyor (90 + stok + renk + [beden | asorti]); biri eksikse
  // etiket basılamaz. Var olan kodlara DOKUNULMUYOR: kod bir kez atanır, basılmış etiket geçerli
  // kalır. Aralık dolarsa sessizce sarmak yerine söyleniyor — sarmak, aynı kodu iki kayda vermek
  // ve basılmış etiketin YANLIŞ malı göstermesi demek.
  const kodlariTamamla = useCallback(() => {
    const sonuc = kodlariAta(stok, tanimlar);
    const toplam = sonuc.atanan.stok + sonuc.atanan.renk + sonuc.atanan.beden + sonuc.atanan.asorti;
    if (toplam > 0) {
      if (sonuc.atanan.stok > 0) saveStok(sonuc.stok);
      saveTanimlar(sonuc.tanimlar);
    }
    if (sonuc.dolan.length) {
      const AILE_ADI = { stok: "stok no", renk: "renk kodu", beden: "ölçü kodu", asorti: "asorti kodu" };
      showToast(`Kod aralığı doldu: ${sonuc.dolan.map((a) => AILE_ADI[a] || a).join(", ")} — barkod şeması genişletilmeli`);
      return;
    }
    showToast(toplam > 0
      ? `${toplam} kod atandı — stok no ${sonuc.atanan.stok}, renk kodu ${sonuc.atanan.renk}, ölçü kodu ${sonuc.atanan.beden}, asorti kodu ${sonuc.atanan.asorti}`
      : "Kodu eksik kayıt yok");
  }, [stok, tanimlar, saveStok, saveTanimlar, showToast]);

  const saveCariler = useCallback(async (next) => {
    // YENİ CARİYE KODU ANINDA VERİLİYOR. Ayrı bir "kodları ata" adımına bırakmak, kullanıcının
    // cariyi açıp koduna baktığında boş görmesi demekti. `cariKodlariAta` kodu OLANA dokunmuyor,
    // o yüzden her kayıtta güvenle çağrılabiliyor.
    const sonuc = cariKodlariAta(next, tanimlar);
    if (sonuc.atanan > 0) {
      setTanimlar(sonuc.tanimlar);
      yazimiIzle(tekilYaz("tanimlar:data", "tanimlar", sonuc.tanimlar), "Tanımlar", sonuc.tanimlar);
    }
    if (sonuc.doldu) showToast("Cari kod aralığı doldu — şema genişletilmeli");
    setCariler(sonuc.cariler);
    try {
      await tabloYaz("cari:data", "cariler", sonuc.cariler);
    } catch (e) {
      kaydetmeHatasiBildir(e, "Cari", sonuc.cariler);
    }
  }, [tanimlar, showToast, kaydetmeHatasiBildir]);

  const saveSiparisler = useCallback(async (next) => {
    setSiparisler(next);
    try {
      await tabloYaz("siparis:data", "siparisler", next);
    } catch (e) {
      kaydetmeHatasiBildir(e, "Sipariş", next);
    }
  }, [showToast, kaydetmeHatasiBildir]);

  const karsilananTuretmeRef = useRef(false);
  useEffect(() => {
    const yeni = siparisKarsilananlariHesapla(siparisler, stok);
    if (yeni === siparisler) return;
    // Düzeltme KALICI olarak da yazılıyor: yalnız bellekte düzeltmek, diskte hayalet sayacı
    // bırakmak demekti — başka bir cihaz eski değeri okumaya devam ederdi.
    karsilananTuretmeRef.current = true;
    saveSiparisler(yeni);
  }, [stok, siparisler, saveSiparisler]);

  // Kur güncelleme, önce SADECE Muhasebe modülünün içindeydi. Kur artık her ekranın başlığında
  // görüneceği için (sipariş girerken, maliyet bakarken de gerekli), çekme mantığı uygulama
  // seviyesine taşındı; Muhasebe modülü de aynı fonksiyonu prop olarak kullanır — iki ayrı kopya
  // tutmak, birinin güncellenip diğerinin unutulmasına açık kapı bırakırdı.
  const [kurYukleniyorGlobal, setKurYukleniyorGlobal] = useState(false);

  // Kurları kaydeden ortak yol — hem otomatik çekim hem elle giriş buradan geçer, böylece kaynak
  // (TCMB / proxy / elle) ve zaman damgası HER ZAMAN birlikte yazılır. Kaynağı saklamak önemli:
  // elle girilmiş bir kurla resmî TCMB kurunu ekranda ayırt edememek, fatura/maliyet tarafında
  // sessiz bir güven sorunu yaratır.
  // Kur değişiklikleri GEÇMİŞE yazılır. Sebebi muhasebe: geçmiş bir faturanın hangi kurla
  // hesaplandığını sonradan açıklamak gerekebiliyor. Yalnızca "son kur" tutulursa, üç ay önce
  // girilmiş dövizli bir siparişin neden o tutara denk geldiği kanıtlanamaz.
  // `kurTarihi`: kurun AİT OLDUĞU gün (TCMB'nin XML'inde yazan tarih). Verilmezse kayıt anı
  // kullanılıyor.
  //
  // İkisi aynı şey değil: TCMB kuru günde bir açıklar, hafta sonu ve tatillerde son iş gününün
  // kurunu döner. Kayıt anını yazsaydık pazar günü çekilen cuma kuru "bugün alındı" görünür ve
  // bayatlık uyarısı hiç çalışmazdı — oysa o kur gerçekten iki günlük.
  const kurlariKaydet = useCallback((usd, eur, kaynak, kurTarihi) => {
    setMuhasebe((prev) => {
      const onceki = prev.kurlar || {};
      const zaman = kurTarihi || new Date().toISOString();
      // Yalnızca DEĞER DEĞİŞTİYSE geçmişe yazılır; aynı kuru tekrar kaydetmek geçmişi
      // anlamsız tekrarlarla doldururdu.
      const degistiMi = onceki.USD !== usd || onceki.EUR !== eur;
      const gecmis = degistiMi
        ? [{
            id: uid("kur"), tarih: zaman, USD: usd, EUR: eur, kaynak: kaynak || "Elle",
            oncekiUSD: onceki.USD ?? null, oncekiEUR: onceki.EUR ?? null,
          }, ...(prev.kurGecmisi || [])].slice(0, 500)
        : (prev.kurGecmisi || []);
      const next = { ...prev, kurlar: { USD: usd, EUR: eur, tarih: zaman, kaynak }, kurGecmisi: gecmis };
      yazimiIzle(tekilYaz("muhasebe:data", "muhasebe", next), "Muhasebe", next);
      return next;
    });
  }, []);

  // TCMB'nin XML akışı `Access-Control-Allow-Origin` başlığı GÖNDERMEZ. Bu, TCMB sunucusunun bir
  // tercihidir — tarayıcıdan doğrudan `fetch` etmek istemci tarafında ne yaparsak yapalım
  // engellenir; kodla çözülebilecek bir hata değildir. Bu yüzden üç katmanlı ilerliyoruz:
  //   1) Doğrudan TCMB — masaüstü/uygulama kabuğu gibi CORS uygulanmayan ortamlarda çalışır.
  //   2) Genel CORS proxy'leri — isteği sunucu tarafında yapıp yanıtı CORS başlığıyla döner.
  //      RESMİ TCMB verisi korunur (kur başka bir kaynaktan üretilmez), sadece taşıyıcı değişir.
  //      Üçüncü taraf servislerdir: yavaşlayabilir veya kapanabilir, bu yüzden zorunlu değiller.
  //   3) Elle giriş — internet/proxy hiç çalışmasa bile kullanıcı kuru başlıktaki rozetten girer.
  const kurlariCek = useCallback(async (sessiz) => {
    setKurYukleniyorGlobal(true);
    // Zincir uzun (birkaç saniye sürebilir) — kullanıcı elle tetiklediyse hemen bir işaret görmeli,
    // yoksa "tepki vermiyor" izlenimi doğar.
    if (!sessiz) showToast("Kur alınıyor…");

    // Ayrıştırma iki aşamalı: önce düzgün XML olarak denenir; bazı aracılar yanıtı HTML'e sarar ya
    // da kaçış karakterleriyle bozar, o durumda ham metin üzerinde desen araması yapılır. Tek bir
    // ayrıştırıcıya bağlı kalmak, aracı zincirinin yarısını boşa harcardı.
    // Kaynaklar sayıyı farklı biçimlerde döner: TCMB "48.0788" (nokta ondalık), Harem "48,0788"
    // (virgül ondalık, binlik nokta olabilir). Körü körüne nokta silmek "48.0788"i 480788 yapardı —
    // bu yüzden ondalık ayıracı, virgülün VARLIĞINA göre belirlenir.
    const sayiyaCevir = (ham) => {
      if (typeof ham === "number") return ham > 0 ? ham : null;
      if (ham == null) return null;
      const s = String(ham).trim();
      if (!s) return null;
      const v = s.includes(",") ? parseFloat(s.replace(/\./g, "").replace(",", ".")) : parseFloat(s);
      return v > 0 ? v : null;
    };

    const kurlariAyristir = (metin) => {
      if (!metin || metin.length < 50) return null;
      const xml = new DOMParser().parseFromString(metin, "text/xml");
      if (xml.getElementsByTagName("parsererror").length === 0) {
        const birimler = Array.from(xml.getElementsByTagName("Currency"));
        const oku = (kod) => {
          const d = birimler.find((b) => b.getAttribute("CurrencyCode") === kod);
          const alan = d && (d.getElementsByTagName("ForexSelling")[0] || d.getElementsByTagName("BanknoteSelling")[0]);
          const v = alan ? parseFloat(alan.textContent) : null;
          return v > 0 ? v : null;
        };
        const USD = oku("USD"), EUR = oku("EUR");
        if (USD && EUR) return { USD, EUR };
      }
      // Ham metin üzerinden: <Currency ... CurrencyCode="USD"> ... <ForexSelling>48,07</ForexSelling>
      const desenle = (kod) => {
        const blok = new RegExp(`CurrencyCode=["\\\\]*"?${kod}[\\s\\S]{0,600}?<ForexSelling>([\\d.,]+)<`, "i").exec(metin);
        if (!blok) return null;
        return sayiyaCevir(blok[1]);
      };
      const USD = desenle("USD"), EUR = desenle("EUR");
      return USD && EUR ? { USD, EUR } : null;
    };

    // ---- 0. KAYNAK: KENDİ ARACIMIZ (Supabase Edge Function) ----
    // Halka açık aracılar (allorigins, codetabs…) sık çöküyor, hız sınırına takılıyor ve ne zaman
    // çalışacağı belli olmuyor. Kendi fonksiyonumuz aynı işi yapar ama bize ait: TCMB'den XML'i
    // alır, ayrıştırır, CORS başlığıyla iki sayı döner. Veri yine RESMİ TCMB verisidir.
    //
    // Fonksiyon kurulmamışsa (404) sessizce sıradaki kaynağa geçilir — zorunlu değil, hızlandırıcı.
    // KUR FONKSİYONUNUN NEDEN ÇALIŞMADIĞI KAYDEDİLİYOR.
    //
    // Önceden bütün başarısızlıklar sessizce yutuluyordu: fonksiyon kurulu değil mi, adı mı yanlış,
    // JWT doğrulaması mı reddediyor, TCMB mi cevap vermiyor — hepsi aynı "Kur alınamadı" mesajına
    // çıkıyordu. Kullanıcı hangisini düzelteceğini bilemiyordu (7 Eylül: fonksiyon kuruldu ama
    // yine çekmedi, sebebi ancak elle denenerek bulunabildi).
    let fonksiyonTeshis = null;

    // ZAMAN AŞIMLI FETCH — zincirin HER adımı için.
    //
    // Kullanıcı (7 Eylül): "Kur alınıyor diyor ama hata da vermiyor." Sebep: son iki adımda
    // (Frankfurter ve model araması) zaman aşımı YOKTU. İndirilen HTML dosyasında dış isteklere
    // yanıt hiç gelmeyebiliyor; `await fetch(...)` süresiz askıda kalıyor, zincir ilerlemiyor ve
    // "Kur alınıyor…" bildirimi son söz oluyordu — ne sonuç ne hata.
    //
    // Sessiz bekleme, hatanın en kötü biçimi: kullanıcı çalıştığını sanıp bekliyor.
    const zamanAsimliGetir = async (url, secenekler = {}, sure = 8000) => {
      const kontrol = new AbortController();
      const sayac = setTimeout(() => kontrol.abort(), sure);
      try {
        return await fetch(url, { ...secenekler, signal: kontrol.signal });
      } finally {
        clearTimeout(sayac);
      }
    };
    if (supabaseAcikMi()) {
      try {
        const kontrol = new AbortController();
        // 8 SANİYE YETMİYORDU: fonksiyon TCMB'yi bekliyor (kendi sınırı 10 sn) ve biz ondan ÖNCE
        // vazgeçiyorduk — yani fonksiyon cevabını yetiştiremeden kesiyorduk ve ekranda hep
        // "ulaşılamadı" yazıyordu (kullanıcı bildirdi, 7 Eylül). Bekleme süresi fonksiyonun kendi
        // süresinden UZUN olmalı, yoksa fonksiyonun ürettiği gerçek teşhis hiç görünmez.
        const zamanAsimi = setTimeout(() => kontrol.abort(), 15000);
        // Authorization başlığı GÖNDERİLMİYOR: yeni tip anahtarlar (sb_publishable_…) JWT değildir
        // ve Edge Function'ın JWT doğrulaması bunları reddeder. Fonksiyon herkese açık kurulur
        // (Verify JWT kapalı) — taşıdığı veri zaten herkese açık TCMB kurudur.
        const res = await fetch(`${SUPABASE_URL}/functions/v1/kur`, {
          headers: { apikey: SUPABASE_ANAHTAR },
          signal: kontrol.signal,
        });
        clearTimeout(zamanAsimi);
        if (!res.ok) {
          // Durum koduna göre NE YAPILACAĞI söyleniyor; kod numarası tek başına bir şey anlatmıyor.
          // Fonksiyonun KENDİ hata metni varsa o gösteriliyor: "TCMB 6 saniyede yanıt vermedi"
          // gibi bir cümle, çıplak durum kodundan çok daha kullanışlı.
          let govde = null;
          try { govde = (await res.clone().json()).hata || null; } catch (e2) { /* JSON değilse boş ver */ }
          fonksiyonTeshis =
            res.status === 404 ? "Supabase'de 'kur' fonksiyonu bulunamadı — adı tam olarak 'kur' olmalı"
            : (res.status === 401 || res.status === 403) ? "Supabase 'kur' fonksiyonu yetki istedi — fonksiyon ayarlarından 'Verify JWT' seçeneğini KAPATIN"
            : govde ? `Supabase 'kur' fonksiyonu: ${govde}`
            : `Supabase 'kur' fonksiyonu ${res.status} döndü`;
        }
        if (res.ok) {
          const d = await res.json();
          if (d && d.USD > 0 && d.EUR > 0) {
            // TCMB'nin kendi tarihi ("02.09.2026" biçiminde) ISO'ya çevriliyor; ayrıştırılamazsa
            // kayıt anına düşülüyor.
            const parca = String(d.tarih || "").match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
            const tcmbTarihi = parca ? new Date(`${parca[3]}-${parca[2]}-${parca[1]}T12:00:00`).toISOString() : null;
            kurlariKaydet(d.USD, d.EUR, "TCMB", tcmbTarihi);
            showToast(
              `TCMB kurları güncellendi — USD: ${d.USD.toFixed(4)} ₺, EUR: ${d.EUR.toFixed(4)} ₺` +
              (d.tarih ? ` (${d.tarih})` : "")
            );
            setKurYukleniyorGlobal(false);
            return true;
          }
          // 200 döndü ama içinde USD/EUR yok: fonksiyon çalışıyor, TCMB tarafı sorunlu.
          fonksiyonTeshis = "Supabase 'kur' fonksiyonu çalıştı ama TCMB'den kur okuyamadı";
        }
      } catch (e) {
        // Ağ hatası ya da zaman aşımı: fonksiyon adresi hiç yanıt vermedi.
        if (!fonksiyonTeshis) fonksiyonTeshis = "Supabase 'kur' fonksiyonuna ulaşılamadı (ağ ya da zaman aşımı)";
        // Kurulu değil ya da ulaşılamadı — aşağıdaki zincir devam etsin.
      }
    }

    const TCMB = "https://www.tcmb.gov.tr/kurlar/today.xml";
    const enc = encodeURIComponent(TCMB);
    // Sıra bilinçli: önce doğrudan (en doğru ve en hızlı), sonra aracılar. Hepsi AYNI resmî TCMB
    // verisini taşır; aracı sadece CORS başlığını ekleyen bir postacıdır, kuru kendisi üretmez.
    const denemeler = [
      { ad: "TCMB", url: TCMB },
      { ad: "TCMB", url: `https://api.allorigins.win/raw?url=${enc}` },
      { ad: "TCMB", url: `https://api.codetabs.com/v1/proxy?quest=${enc}` },
      { ad: "TCMB", url: `https://corsproxy.io/?url=${enc}` },
      { ad: "TCMB", url: `https://thingproxy.freeboard.io/fetch/${TCMB}` },
    ];

    for (const deneme of denemeler) {
      try {
        // Takılan bir aracı, sıradakine geçişi süresiz geciktirmesin diye her denemeye zaman sınırı.
        const kontrol = new AbortController();
        const zamanAsimi = setTimeout(() => kontrol.abort(), 8000);
        const res = await fetch(deneme.url, { signal: kontrol.signal });
        clearTimeout(zamanAsimi);
        if (!res.ok) continue;
        const kurlar = kurlariAyristir(await res.text());
        if (!kurlar) continue;
        kurlariKaydet(kurlar.USD, kurlar.EUR, deneme.ad);
        showToast(`TCMB kurları güncellendi — USD: ${kurlar.USD.toFixed(4)} ₺, EUR: ${kurlar.EUR.toFixed(4)} ₺`);
        setKurYukleniyorGlobal(false);
        return true;
      } catch (e) {
        // Sıradaki kaynağa geç — her başarısız denemeyi ayrı ayrı bildirmek kullanıcıyı yorardı.
      }
    }

    // ---- 2. KAYNAK: HAREM DÖVİZ ----
    // TCMB'ye hiçbir yoldan ulaşılamadığında devreye girer. Harem'in canlı piyasa akışı JSON döner ve
    // USDTRY/EURTRY için alış-satış içerir; biz SATIŞ tarafını alırız (TCMB tarafında da satış kurunu
    // kullandığımız için tutarlı kalır). Bu bir PİYASA kurudur, TCMB'nin resmî kuru değildir — kaynak
    // adı ayrı kaydedilir ve rozette farklı görünür, çünkü resmî kayıt gerektiren yerlerde aradaki
    // fark önemlidir. Harem uç noktası da CORS göndermeyebilir; bu yüzden aynı aracı zinciri kullanılır.
    const haremAyristir = (metin) => {
      let d;
      try { d = JSON.parse(metin); } catch (e) { return null; }
      // Yanıt bazen doğrudan, bazen { data: {...} } sarmalı içinde gelir.
      const kok = (d && d.data) || d;
      if (!kok || typeof kok !== "object") return null;
      const al = (...adaylar) => {
        for (const ad of adaylar) {
          const x = kok[ad];
          if (!x) continue;
          const v = sayiyaCevir(typeof x === "object" ? (x.satis != null ? x.satis : x.alis) : x);
          if (v) return v;
        }
        return null;
      };
      const USD = al("USDTRY", "USD", "USDTRY_SATIS");
      const EUR = al("EURTRY", "EUR", "EURTRY_SATIS");
      return USD && EUR ? { USD, EUR } : null;
    };

    const HAREM = "https://canlipiyasalar.haremaltin.com/tmp/altin.json?dil_kodu=tr";
    const haremEnc = encodeURIComponent(HAREM);
    const haremDenemeleri = [
      HAREM,
      `https://api.allorigins.win/raw?url=${haremEnc}`,
      `https://api.codetabs.com/v1/proxy?quest=${haremEnc}`,
      `https://corsproxy.io/?url=${haremEnc}`,
    ];

    for (const url of haremDenemeleri) {
      try {
        const kontrol = new AbortController();
        const zamanAsimi = setTimeout(() => kontrol.abort(), 8000);
        const res = await fetch(url, { signal: kontrol.signal });
        clearTimeout(zamanAsimi);
        if (!res.ok) continue;
        const kurlar = haremAyristir(await res.text());
        if (!kurlar) continue;
        kurlariKaydet(kurlar.USD, kurlar.EUR, "Harem");
        showToast(`TCMB'ye ulaşılamadı — Harem Döviz kuru alındı (piyasa kuru): USD ${kurlar.USD.toFixed(4)} ₺, EUR ${kurlar.EUR.toFixed(4)} ₺`);
        setKurYukleniyorGlobal(false);
        return true;
      } catch (e) { /* sıradakine geç */ }
    }

    // SON ÇARE: TCMB'ye hiçbir yoldan ulaşılamadıysa, CORS'a açık bir piyasa kuru servisi denenir.
    // Bu kur TCMB'nin RESMÎ satış kuru DEĞİLDİR (birkaç binde fark eder) — bu yüzden ayrı bir kaynak
    // adıyla kaydedilir ve rozette farklı görünür. Muhasebe kaydı için elle doğrulanmalıdır.
    try {
      const res = await zamanAsimliGetir("https://api.frankfurter.app/latest?from=TRY&to=USD,EUR", {}, 8000);
      if (res.ok) {
        const d = await res.json();
        const usd = d && d.rates && d.rates.USD ? 1 / d.rates.USD : null;
        const eur = d && d.rates && d.rates.EUR ? 1 / d.rates.EUR : null;
        if (usd > 0 && eur > 0) {
          kurlariKaydet(Math.round(usd * 10000) / 10000, Math.round(eur * 10000) / 10000, "Piyasa");
          showToast(`⚠ TCMB'ye ulaşılamadı — piyasa kuru alındı (resmî kur değil): USD ${usd.toFixed(4)} ₺, EUR ${eur.toFixed(4)} ₺`);
          setKurYukleniyorGlobal(false);
          return true;
        }
      }
    } catch (e) { /* yoksay */ }

    // ---- SON KAYNAK: model üzerinden web araması ----
    // Bu uygulama bir Claude artifact'i olarak çalışıyor (verileri window.storage'da tutuyor). Bu
    // ortamda dış alan adlarına yapılan fetch istekleri güvenlik politikasıyla engellenebilir —
    // yukarıdaki TÜM kaynaklar (TCMB, aracılar, Harem) o zaman daha ağa çıkmadan başarısız olur.
    // Ancak Anthropic API'sine erişim açıktır ve web arama aracını kullanabilir. Yani kuru, modele
    // aratarak alabiliriz. Yavaştır (birkaç saniye) ve bu yüzden EN SONA konur, ama diğer her yol
    // kapalıyken çalışan tek otomatik yöntemdir.
    try {
      // Model araması doğası gereği yavaş (web araması yapıyor): 25 saniye. Ama SINIRSIZ değil —
      // bu adım askıda kalırsa kullanıcı hiçbir zaman cevap alamıyordu.
      const res = await zamanAsimliGetir("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content:
              "TCMB (Türkiye Cumhuriyet Merkez Bankası) günlük döviz SATIŞ kurunu web'de ara: " +
              "1 USD kaç TL ve 1 EUR kaç TL. Sadece şu JSON'u döndür, başka hiçbir şey yazma, " +
              "markdown kod bloğu da kullanma: " +
              '{"USD": 48.0788, "EUR": 56.0948, "kaynak": "TCMB", "tarih": "2026-08-25"}',
          }],
          tools: [{ type: "web_search_20250305", name: "web_search" }],
        }),
      }, 25000);
      if (res.ok) {
        const veri = await res.json();
        const metin = (veri.content || []).map((x) => (x.type === "text" ? x.text : "")).filter(Boolean).join("\n");
        const temiz = metin.replace(/```json|```/g, "").trim();
        // Model araç kullanırken açıklama da yazabilir — metnin içindeki İLK JSON nesnesini ayıklıyoruz.
        const eslesme = /\{[\s\S]*?\}/.exec(temiz);
        if (eslesme) {
          const d = JSON.parse(eslesme[0]);
          const usd = sayiyaCevir(d.USD), eur = sayiyaCevir(d.EUR);
          // Akla yatkınlık kontrolü: model yanlış bir sayı üretirse sessizce kabul etmeyelim.
          // (Bu aralık, kurun makul sınırlarını çok geniş tutar; amaç saçma değerleri elemektir.)
          if (usd && eur && usd > 1 && usd < 10000 && eur > 1 && eur < 10000) {
            kurlariKaydet(Math.round(usd * 10000) / 10000, Math.round(eur * 10000) / 10000, "Web");
            showToast(`Kur web aramasıyla alındı (doğrulayın) — USD ${usd.toFixed(4)} ₺, EUR ${eur.toFixed(4)} ₺`);
            setKurYukleniyorGlobal(false);
            return true;
          }
        }
      }
    } catch (e) {
      // Zaman aşımı burada da yutulmamalı: bu SON adım, sonrasında kullanıcıya söylenecek tek şey
      // aşağıdaki mesaj. Sebebi ona ekliyoruz.
      if (!fonksiyonTeshis) {
        fonksiyonTeshis = e && e.name === "AbortError"
          ? "hiçbir kaynak zamanında yanıt vermedi"
          : "hiçbir kaynağa ulaşılamadı";
      }
    }

    setKurYukleniyorGlobal(false);
    // Mesaj, kullanıcıya YAPABİLECEĞİ şeyi söylemeli. "Alınamadı" tek başına çaresizlik bildirir;
    // kendi aracımız kurulu değilse asıl çözüm odur.
    if (!sessiz) {
      // TEŞHİS VARSA ONU SÖYLE. Genel "alınamadı" mesajı, sorunu düzeltebilecek tek bilgiyi
      // (fonksiyon mu yok, yetki mi kapalı, TCMB mi cevapsız) gizliyordu.
      showToast(
        fonksiyonTeshis
          ? `Kur alınamadı — ${fonksiyonTeshis}`
          : (supabaseAcikMi()
            ? "Kur alınamadı — Supabase'de 'kur' fonksiyonu kuruluysa yeniden deneyin, yoksa rozetteki kalem ikonundan elle girin"
            : "Kur alınamadı — rozetteki kalem ikonundan elle girebilirsiniz")
      );
    }
    // Teşhis konsola da yazılıyor: bildirim birkaç saniyede kayboluyor, sorun giderirken
    // geriye dönüp bakılabilmeli.
    if (fonksiyonTeshis) console.warn("Kur fonksiyonu:", fonksiyonTeshis);
    return false;
  }, [showToast, kurlariKaydet]);

  // OTOMATİK ÇEKİM — kullanıcı hiç tıklamadan. Uygulama açıldığında kur yoksa ya da bugün
  // güncellenmemişse bir kez denenir. Bir kez: her render'da tekrar denemek, aracılar yavaşken
  // uygulamayı boğar ve başarısızlıkta sonsuz döngüye girerdi. Sessiz modda başarısızlık için
  // uyarı çıkarılmaz — açılışta karşılaşılan bir hata mesajı, kullanıcının yapabileceği bir şey
  // yokken sadece gürültüdür; rozetteki "Kur girilmedi" işareti zaten durumu anlatır.
  const kurOtomatikDenendi = useRef(false);
  useEffect(() => {
    if (loading || kurOtomatikDenendi.current) return;
    const k = muhasebe.kurlar || {};
    const bugun = new Date().toDateString();
    const guncelMi = k.USD && k.EUR && k.tarih && new Date(k.tarih).toDateString() === bugun;
    if (guncelMi) { kurOtomatikDenendi.current = true; return; }
    kurOtomatikDenendi.current = true;
    kurlariCek(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // ---------------------------------------------------------------------------------------------
  // ÇÖP KUTUSU
  //
  // Silme işlemleri artık kaydı yok etmiyor; tam kopyasını buraya taşıyor. Bu hem denetim kaydı
  // (kim, ne zaman, neyi sildi) hem de geri dönüş imkânı sağlıyor.
  //
  // DÜRÜST OLUNMASI GEREKEN SINIR: geri yükleme, kaydın KENDİSİNİ geri getirir; silme sırasında
  // yapılmış YAN ETKİLERİ geri almaz. Bir sipariş silinirken stok hareketleri de geri sarılmıştı;
  // siparişi geri yüklemek o stok hareketlerini yeniden oluşturmaz. Bu yüzden yan etkisi olan
  // türler `yanEtkiliMi: true` işaretlenir ve kullanıcı geri yüklemeden ÖNCE açıkça uyarılır.
  // Sessizce "geri yüklendi" demek, tutarsız bir veriyi doğruymuş gibi göstermek olurdu.
  // ---------------------------------------------------------------------------------------------
  const saveMuhasebe = useCallback(async (next) => {
    setMuhasebe(next);
    try {
      await tekilYaz("muhasebe:data", "muhasebe", next);
    } catch (e) {
      kaydetmeHatasiBildir(e, "Muhasebe", next);
    }
  }, [showToast, kaydetmeHatasiBildir]);

  // TÜM verileri (stok, sipariş, üretim, cari, tanımlar) kalıcı olarak siler ve varsayılana döner.
  const veritabaniSifirla = useCallback(async () => {
    // Sıfırlama uygulamadaki EN AĞIR SONUÇLU işlem.
    //
    // SIRA ÖNEMLİ: önce günlük boşaltılır, SONRA sıfırlama kaydı yazılır. Ters sırada kayıt da
    // silinirdi. "Her şeyi sıfırla" sözü günlüğü de kapsıyor — ama tamamen boş bir günlük,
    // aylar sonra "burada ne oldu" sorusunu cevapsız bırakır. Bu yüzden günlük boşalır ama boş
    // kalmaz: ilk satırı kimin, ne zaman, kaç kaydı sildiğidir.
    //
    // Sayılar silmeden ÖNCE okunuyor; sonra okunsaydı hepsi sıfır yazardı.
    const sifirlananSayilar = {
      urun: (stok || []).length, cari: (cariler || []).length,
      siparis: (siparisler || []).length, uretim: (uretim || []).length,
      cop: (cop || []).length,
    };
    try {
      await gunlukBosalt();
    } catch (e) {
      // Günlük silinemezse sıfırlama yine de sürer: eski kayıtların kalması, verinin
      // silinmemesinden iyidir. gunluk-silme.sql çalıştırılmamış olabilir.
      console.warn("Günlük boşaltılamadı (sıfırlama devam ediyor):", e && e.message);
    }
    gunlukYaz("VERİTABANI SIFIRLANDI", "veri", sifirlananSayilar);

    // SIFIRLAMA GERÇEKTEN SIFIRLAR: tanımlar da tamamen boşalır.
    //
    // Önceden birimler, özel kod etiketleri ve firma logosu varsayılan değerlerle geri geliyordu.
    // "Sıfırladım" diyen kullanıcı, temiz bir kurulum bekliyor; geri gelen değerler hem şaşırtıyor
    // hem de "acaba başka ne kaldı" şüphesi doğuruyordu.
    //
    // Özel kod ETİKETLERİ boş bırakılmıyor ama: alan başlıksız kalırsa ekranda beş adsız kutu
    // görünür. Boş dizi verilip bölüm hiç gösterilmiyor.
    const varsayilanTanimlar = {
      renkler: [], bedenler: [], birimler: [], prosesler: [], asortiler: [],
      ozelKodAlanlari: [], renkKombinasyonlari: [], hammaddeTipleri: [], mamulTipleri: [],
      araProsesler: [], fiyatGruplari: [], fireSebepleri: [], kullanicilar: [],
      firmaBilgileri: { logo: "", unvan: "", telefon: "", adres: "", email: "", website: "", vergiNo: "" },
      girisAktifMi: false,
    };
    setStok([]);
    setSiparisler([]);
    setUretim([]);
    setCariler([]);
    setTanimlar(varsayilanTanimlar);
    // Çöp kutusu da temizlenir: aksi halde "her şeyi sıfırladım" denen bir kurulumda, silinen
    // kayıtların TAM KOPYALARI çöpte durmaya devam ederdi — sıfırlama sözünü tutmayan bir davranış.
    setCop([]);

    setStokRezervasyonlari([]);
    setOnaylar([]);

    // Depolama isteklerini PARALEL değil SIRALI (birer birer) gönderiyoruz — aynı anda çok
    // istek atmak bazı durumlarda hız sınırına takılıp hataya yol açabiliyor. Her biri ayrıca
    // bir kere başarısız olursa tekrar deneniyor.
    //
    // tabloYaz/tekilYaz KULLANILIYOR, guvenliYaz DEĞİL: doğrudan yazmak veri katmanını atlıyordu
    // ve BULUT EL DEĞMEDEN KALIYORDU. "Veritabanı sıfırlandı" denip Supabase'de her şeyin durması,
    // sıfırlama sözünü tutmayan bir davranıştı — üstelik uygulama yeniden açıldığında veriler
    // buluttan geri geliyordu.
    const yazilacaklar = [
      ["stok:items", "urunler", []],
      ["siparis:data", "siparisler", []],
      ["uretim:siparisler", "uretim", []],
      ["cari:data", "cariler", []],
      ["stokrez:data", "stok_rezervasyonlari", []],
      ["onaylar:data", "onaylar", []],
      ["cop:data", "cop", []],
    ];
    const basarisizlar = [];
    for (const [key, tablo, deger] of yazilacaklar) {
      let denemeSayisi = 0;
      let basarili = false;
      while (denemeSayisi < 2 && !basarili) {
        try {
          await tabloYaz(key, tablo, deger);
          basarili = true;
        } catch (e) {
          denemeSayisi++;
          if (denemeSayisi < 2) await new Promise((r) => setTimeout(r, 400));
        }
      }
      if (!basarili) basarisizlar.push(key);
    }
    // Tanımlar tek satırlık tablo — ayrı yol.
    try { await tekilYaz("tanimlar:data", "tanimlar", varsayilanTanimlar); }
    catch (e) { basarisizlar.push("tanimlar:data"); }

    if (basarisizlar.length === 0) {
      showToast(supabaseAcikMi()
        ? "Veritabanı sıfırlandı — bulut ve bu bilgisayar temizlendi"
        : "Veritabanı sıfırlandı");
    } else {
      showToast(`Şunlar sıfırlanamadı: ${basarisizlar.join(", ")} — lütfen tekrar deneyin`);
    }
  }, [showToast, stok, cariler, siparisler, uretim, cop]);

  // Not: Bireysel işlemlerin her biri (sipariş kaydetme, üretim proses ilerlemesi, cari hareketi vb.)
  // kendi window.storage.set çağrısını zaten yapıyor — yani her işlem anında kaydediliyor, ayrı bir
  // "genel kaydet" adımına gerek yok. Her işlemden sonra sağ altta bir bildirim (showToast) çıkar.


  // Tüm verinin (stok, sipariş, üretim, cari, tanımlar) tam ve kayıpsız bir JSON yedeğini indirir.
  // Bu, geri yükleme için en güvenilir formattır — hiçbir iç içe yapı (varyantlar, hareketler, reçete vb.)
  // kaybolmaz. Claude aboneliği/erişimi değişse bile atölye verilerinin elinizde kalmasını sağlar.
  // ---------------------------------------------------------------------------------------------
  // OTOMATİK YEDEKLEME
  //
  // Elle yedekleme, alınması unutulduğunda hiç yoktur. Bu yüzden günde bir kez, arka planda ve
  // kullanıcıdan bir şey istemeden yedek alınır. Yedekler depolamada AYRI anahtarlarda tutulur
  // (yedek:YYYY-AA-GG) — asıl veri bozulsa bile yedekler ayrı yerde durur.
  //
  // Neden tarayıcıya indirilmiyor: indirme kullanıcı etkileşimi ister ve sekmeyi kesintiye uğratır.
  // Otomatik yedek "sessiz" olmalı. Elle indirme seçeneği zaten var ve yerinde duruyor; ikisi
  // birbirini tamamlar — otomatik olan yakın geçmişi, elle indirilen ise dış kopyayı sağlar.
  // YEDEK SAYISI 7 DEĞİL 3.
  //
  // Yedekler tam bir veri kopyası: bildirilen olayda üç günlük yedek 773 KB tutuyordu ve depo
  // 4,92 MB'de tıkanmıştı. Yedi gün tutmak, tıkanan bir depoda 1,8 MB'a kadar çıkabilirdi.
  // Yedeğin amacı "dün ne vardı"yı kurtarmak; üç gün bunu karşılıyor ve bulut yedeği zaten ayrı.

  const [sonYedekTarihi, setSonYedekTarihi] = useState(null);


  // ---- SUPABASE'E GÖÇ ----
  //
  // Tarayıcı deposundaki mevcut veriyi buluta taşır. TEK SEFERLİK bir işlemdir ama tekrar
  // çalıştırmak zarar vermez: kayıtlar id üzerinden upsert edilir, aynı kayıt iki kez oluşmaz.
  //
  // Gömülü diziler (varyantlar, hareketler, kalemler, atamalar) ayrı tablolara açılır — asıl iş
  // budur. Bunlar ürünün/siparişin içinde kaldığı sürece üç kişi aynı anda çalışamaz.
  // SUPABASE GÖÇÜ VE DEFTER ONARIMI AYRI DOSYADA (19 Eylül, 2. madde, 8. tur): `086-goc.jsx`.
  const { supabaseyeGoc, defterTopluOnar } = useGocVeOnarim({
    cariler, showToast, siparisler, stok, stokRezervasyonlari, tanimlar, uretim, setStok,
    setGocDurumu,
  });

  const hizliCariEkle = useCallback((unvan, tip) => {
    const ad = String(unvan || "").trim();
    if (!ad) return null;
    // Aynı unvanlı cari varsa YENİSİ AÇILMAZ, mevcut olan döner. Aksi halde her yazımda
    // kopya cari birikir ve bakiyeler ikiye bölünür.
    const mevcut = cariler.find(
      (c) => c.unvan.toLocaleLowerCase("tr-TR").trim() === ad.toLocaleLowerCase("tr-TR")
    );
    if (mevcut) { showToast(`"${ad}" zaten kayıtlı — mevcut cari seçildi`); return mevcut.id; }

    const cari = {
      id: uid("cari"), unvan: ad, tip: tip || "Tedarikçi",
      telefon: "", vergiNo: "", adres: "", notlar: "", hareketler: [],
    };
    saveCariler([cari, ...cariler]);
    showToast(`"${ad}" ${(tip || "Tedarikçi").toLowerCase()} olarak eklendi`);
    return cari.id;
  }, [cariler, showToast, saveCariler]);

  // YEDEKLEME AYRI DOSYADA (19 Eylül, 2. madde): `093-yedekleme.jsx`. Bütün veriyi okuyup bütün
  // state'i yeniden yazan işler orada; App yalnız sonucu kullanıyor.
  const {
    otomatikYedekAl, yedegiUygula, jsonDosyasindanGeriYukle, yedektenGeriYukle,
    verileriJsonYedekle, verileriExcelAktar,
  } = useYedekleme({
    loading,
    stok, cariler, siparisler, uretim, muhasebe, tanimlar, gorevler, mesajlar, koliler,
    cekGorselleri, showToast,
    setStok, setCariler, setSiparisler, setUretim, setMuhasebe, setTanimlar, setGorevler,
    setMesajlar, setKoliler, setCekGorselleri, setSonYedekTarihi,
  });


  // ÖLÇÜ (BEDEN/BOYUT) ADI DEĞİŞTİRME (kullanıcı, 14 Eylül: "Tanımlarda beden adı düzenleme olsun").
  // Renk adı değiştirmenin (aşağıda) ölçü karşılığı: tanım değişince ADLA eşleşen bütün kayıtlar
  // hizalanmalı — ürün varyantları, reçete satırları, stok hareketleri, sipariş kalemleri, üretim
  // beden dağılımları, koli kalemleri, asorti oranları. Yoksa "41" ile "41 " iki ayrı beden olur ve
  // üretim/stok eşleşmesi kopar. Eşleştirme büyük/küçük harf ve boşluk farkını yok sayar.
  // AD DEĞİŞTİRME (ÖLÇÜ VE RENK) AYRI DOSYADA (19 Eylül, 2. madde, 9. tur): `082-ad-degistir.jsx`.
  const {
    olcuAdDegistir, kullanimdakiOlculer, hammaddeRenkAdDegistir,
    defterdenYenidenKur, eksikHareketOnar, tanimsizOlcuCevir,
  } = useAdDegistirme({
    tanimlar, stok, siparisler, uretim, koliler, stokRezervasyonlari, showToast, setStok, setSiparisler, setUretim, saveTanimlar, saveKoliler,
    setTanimlar, setKoliler, setStokRezervasyonlari, cariler,
  });

  // Stok kartından serbest metinle YENİ bir renk eklendiğinde, bu rengi Tanımlar'daki renk listesine de
  // kaydeder — tip (Mamul/Hammadde) ve varsa malzeme tipiyle (Deri/Taban/Bağcık…) birlikte. Renk zaten
  // tanımlıysa dokunmaz.
  const yeniRenkKaydet = useCallback((ad, tip, malzemeTipi) => {
    const temizAd = (ad || "").trim();
    if (!temizAd) return;

    // Aynı adlı renk zaten varsa YENİDEN OLUŞTURULMAZ — ama istenen malzeme tipi listesinde
    // yoksa ona EKLENİR. Eskiden bu durumda işlem sessizce iptal ediliyordu: "Kahve" astar olarak
    // tanımlıysa taban rengi olarak eklenemiyor, kullanıcı da sebebini göremiyordu.
    // TEK RENK HAVUZU (9g): tip artık ayırt etmiyor — aynı adlı renk varsa o kullanılır.
    const mevcut = tanimlar.renkler.find((r) => r.ad.toLowerCase() === temizAd.toLowerCase());
    if (mevcut) {
      const mevcutTipler = renkTipleri(mevcut);
      if (!malzemeTipi || mevcutTipler.includes(malzemeTipi)) return;
      const nextT = {
        ...tanimlar,
        renkler: tanimlar.renkler.map((r) =>
          r.id === mevcut.id ? { ...r, malzemeTipleri: [...mevcutTipler, malzemeTipi], malzemeTipi: undefined } : r
        ),
      };
      setTanimlar(nextT);
      yazimiIzle(tekilYaz("tanimlar:data", "tanimlar", nextT), "Tanımlar", nextT);
      showToast(`"${temizAd}" rengine "${malzemeTipi}" tipi eklendi`);
      return;
    }
    // KOD HER TİPE VERİLİYOR (kullanıcı, 10 Eylül: "tanımlı model renklerine renk kodu sistem
    // otomatik atmadığı için barkod oluşturamıyor").
    //
    // Burası yalnız `tip === "Hammadde"` için kod üretiyordu; MAMUL renkleri kodsuz kalıyordu.
    // Barkod şeması renk kodunu ZORUNLU kullanıyor (077-barkod.jsx), kodsuz renk için barkod
    // üretilemiyordu. Tanımlar ekranındaki mamul rengi ekleme yolu kod veriyordu (130-tanimlar),
    // buradaki (model/reçete üzerinden eklenen) vermiyordu — aynı işi yapan iki yer, biri eksik.
    //
    // KOD TEK HAVUZDAN (13 Eylül, kullanıcı: "hammadde ve mamul rengi kodları çakışıyor"). Buradaki
    // sayaç tipe göre AYRI ilerliyordu ("birbirinin numarasını yemesin" diye) — sonuç, hammadde 101 ile
    // mamul 101'in aynı kodu taşıması oldu; kod etikette ve barkod eşleşmesinde tek anlam taşımalı.
    // Tanımlar ekranındaki `sonrakiRenkKodu` ile aynı kural: bütün renkler + kombinasyon kodları.
    const kullanilanKodlar = new Set([
      ...tanimlar.renkler.map((r) => parseInt(r.kod, 10)),
      ...(tanimlar.renkKombinasyonlari || []).map((k) => parseInt(k.kod, 10)),
    ].filter((n) => !isNaN(n)));
    const renkKodlari = tanimlar.renkler.map((r) => parseInt(r.kod, 10)).filter((n) => !isNaN(n));
    let sonrakiKod = (renkKodlari.length > 0 ? Math.max(...renkKodlari) : 100) + 1;
    while (kullanilanKodlar.has(sonrakiKod)) sonrakiKod += 1;
    const otomatikKod = String(sonrakiKod);
    const yeniRenkObj = { id: uid("renk"), ad: temizAd, tip: "Hammadde", renkKodu: "#C9B99A", kod: otomatikKod, malzemeTipleri: malzemeTipi ? [malzemeTipi] : [] };
    const nextTanimlar = { ...tanimlar, renkler: [...tanimlar.renkler, yeniRenkObj] };
    setTanimlar(nextTanimlar);
    yazimiIzle(tekilYaz("tanimlar:data", "tanimlar", nextTanimlar), "Tanımlar", nextTanimlar);
  }, [tanimlar, showToast]);

  // Stok ekranında ürün eklerken/düzenlerken, listede olmayan bir Malzeme Tipi (deri, taban, bağcık…)
  // gerekiyorsa Tanımlar'a gitmeden doğrudan burada tanımlanabilir — yeniRenkKaydet ile aynı desen.
  const yeniMalzemeTipiKaydet = useCallback((ad) => {
    const temizAd = (ad || "").trim();
    if (!temizAd) return null;
    const mevcut = tanimlar.hammaddeTipleri || [];
    const zatenVarOlan = mevcut.find((h) => h.ad.toLowerCase() === temizAd.toLowerCase());
    if (zatenVarOlan) return zatenVarOlan.ad;
    const yeniTip = { id: uid("htip"), ad: temizAd };
    const nextTanimlar = { ...tanimlar, hammaddeTipleri: [...mevcut, yeniTip] };
    setTanimlar(nextTanimlar);
    yazimiIzle(tekilYaz("tanimlar:data", "tanimlar", nextTanimlar), "Tanımlar", nextTanimlar);
    return yeniTip.ad;
  }, [tanimlar]);

  // Stok ekranında ürün eklerken, listede olmayan bir ölçü (beden/boyut) gerekiyorsa Tanımlar'a
  // gitmeden burada tanımlanabilir.
  //
  // `malzemeTipi` verilirse ölçü O TİPE bağlanır — "Bağcık" seçiliyken eklenen "16 cm", Tanımlar >
  // Boyut listesinde bağcık tipiyle görünür ve yalnızca bağcık ürünlerinde listelenir. Kullanıcının
  // ayrıca Tanımlar'a gidip tip ataması gerekmez; ürünü açarken zaten hangi malzemeyle çalıştığını
  // söylemiş oluyor.
  //
  // Aynı adlı ölçü zaten varsa yeniden oluşturulmaz; istenen tip listesinde yoksa ona eklenir —
  // renk tarafındaki davranışın aynısı ("16 cm" hem bağcık hem fermuar ölçüsü olabilir).
  const yeniOlcuKaydet = useCallback((ad, olcuTipi, malzemeTipi) => {
    const temizAd = (ad || "").trim();
    if (!temizAd) return null;
    const tip = olcuTipi === "Boyut" ? "Boyut" : "Beden";
    const mevcut = tanimlar.bedenler || [];
    const zatenVar = mevcut.find((b) => b.ad.toLowerCase() === temizAd.toLowerCase() && (b.tip || "Beden") === tip);

    if (zatenVar) {
      const mevcutTipler = olcuTipleri(zatenVar);
      // Boyut değilse ya da tip zaten varsa dokunma; adı yine de döndür ki çağıran seçebilsin.
      if (tip !== "Boyut" || !malzemeTipi || mevcutTipler.includes(malzemeTipi)) return zatenVar.ad;
      const nextT = {
        ...tanimlar,
        bedenler: mevcut.map((b) =>
          b.id === zatenVar.id ? { ...b, malzemeTipleri: [...mevcutTipler, malzemeTipi] } : b
        ),
      };
      setTanimlar(nextT);
      yazimiIzle(tekilYaz("tanimlar:data", "tanimlar", nextT), "Tanımlar", nextT);
      showToast(`"${temizAd}" ölçüsüne "${malzemeTipi}" tipi eklendi`);
      return zatenVar.ad;
    }

    const yeni = { id: uid("olcu"), ad: temizAd, tip };
    if (tip === "Boyut" && malzemeTipi) yeni.malzemeTipleri = [malzemeTipi];
    const nextTanimlar = { ...tanimlar, bedenler: [...mevcut, yeni] };
    setTanimlar(nextTanimlar);
    yazimiIzle(tekilYaz("tanimlar:data", "tanimlar", nextTanimlar), "Tanımlar", nextTanimlar);
    showToast(
      tip === "Boyut" && malzemeTipi
        ? `"${temizAd}" boyutu "${malzemeTipi}" tipine eklendi`
        : `"${temizAd}" ${tip.toLocaleLowerCase("tr-TR")} olarak eklendi`
    );
    return yeni.ad;
  }, [tanimlar, showToast]);

  // Stok ekranında Mamul ürün eklerken, listede olmayan bir Mamul Tipi (Spor Ayakkabı, Sandalet…)
  // gerekiyorsa Tanımlar'a gitmeden doğrudan burada tanımlanabilir — yeniMalzemeTipiKaydet ile aynı desen.
  // ÖZEL KOD ALANINI YERİNDE AÇMA — kullanıcı (6 Eylül): "Özel kodu burada stok açarken de
  // ekleyebiliriz, eklediğimiz özel kod o stoğa ait olur."
  //
  // Kapsam ÇAĞIRANDAN geliyor: stok formu, o an seçili malzeme/mamul tipini veriyor. Tip
  // seçilmemişse alan "Genel" oluyor — kapsamsız bir alan her üründe görünür, ki bu da
  // kullanıcının "bu stoğa ait olsun" niyetinin en yakın karşılığı.
  //
  // Aynı kapsamda aynı ad varsa YENİSİ AÇILMIYOR, var olanın kimliği dönüyor: iki özdeş başlık
  // ürün kartında hangisine yazdığınızı ayırt edilemez kılardı.
  const yeniOzelKodAlaniKaydet = useCallback((ad, kapsamTuru, kapsamAd) => {
    const temizAd = (ad || "").trim();
    if (!temizAd) return null;
    const tur = kapsamTuru || "genel";
    const kapsam = tur === "genel" ? "" : (kapsamAd || "");
    const mevcut = tanimlar.ozelKodAlanlari || [];
    const zatenVar = mevcut.find((a) =>
      (a.kapsamTuru || "genel") === tur && String(a.kapsamAd || "") === kapsam
      && a.ad.toLocaleLowerCase("tr-TR") === temizAd.toLocaleLowerCase("tr-TR"));
    if (zatenVar) return zatenVar.id;
    const yeni = { id: uid("oka"), ad: temizAd, kapsamTuru: tur, kapsamAd: kapsam };
    const nextTanimlar = { ...tanimlar, ozelKodAlanlari: [...mevcut, yeni] };
    setTanimlar(nextTanimlar);
    yazimiIzle(tekilYaz("tanimlar:data", "tanimlar", nextTanimlar), "Tanımlar", nextTanimlar);
    return yeni.id;
  }, [tanimlar]);

  const yeniMamulTipiKaydet = useCallback((ad) => {
    const temizAd = (ad || "").trim();
    if (!temizAd) return null;
    const mevcut = tanimlar.mamulTipleri || [];
    const zatenVarOlan = mevcut.find((m) => m.ad.toLowerCase() === temizAd.toLowerCase());
    if (zatenVarOlan) return zatenVarOlan.ad;
    const yeniTip = { id: uid("mtip"), ad: temizAd };
    const nextTanimlar = { ...tanimlar, mamulTipleri: [...mevcut, yeniTip] };
    setTanimlar(nextTanimlar);
    yazimiIzle(tekilYaz("tanimlar:data", "tanimlar", nextTanimlar), "Tanımlar", nextTanimlar);
    return yeniTip.ad;
  }, [tanimlar]);

  // Stok'ta ürün eklerken, Mamul rengi birden fazla renk bileşeninden (örn. gövde + taban rengi)
  // oluşuyorsa, seçilen renk adlarından bir "Model Rengi" kombinasyonu oluşturur (ya da aynı renk
  // seti zaten bir kombinasyon olarak tanımlıysa onu yeniden kullanır) ve mamul varyantlarında
  // kullanılacak nihai etiketi ("1001 - Siyah/Beyaz") döndürür.
  const kombinasyonOlusturGlobal = useCallback((renkAdlari) => {
    // Renk bileşenleri hem Mamul hem Hammadde renk havuzundan seçilebildiği için, isimden id
    // bulurken artık tip kısıtlaması uygulanmıyor.
    const renkIdler = renkAdlari.map((ad) => {
      const bulunan = tanimlar.renkler.find((r) => r.ad === ad);
      return bulunan ? bulunan.id : null;
    }).filter(Boolean);
    if (renkIdler.length !== renkAdlari.length) {
      showToast("Seçilen renklerden biri bulunamadı");
      return null;
    }
    const mevcut = tanimlar.renkKombinasyonlari || [];
    // ÖNEMLİ: karşılaştırma SIRALI yapılır (index index) — "Siyah/Kahve/Siyah" ile "Kahve/Siyah/Siyah"
    // aynı renkleri içerse de POZİSYON SIRALARI farklı olduğu için FARKLI modeller kabul edilir.
    // Sadece pozisyonların TEK TEK aynı renkte olduğu, gerçek bir tekrar durumunda "zaten var" denir.
    const zatenVar = mevcut.find(
      (k) => k.renkIdler.length === renkIdler.length && k.renkIdler.every((id, i) => id === renkIdler[i])
    );
    if (zatenVar) return `${zatenVar.kod} - ${renkAdlari.join("/")}`;
    const mevcutKodlar = mevcut.filter((k) => /^\d+$/.test(k.kod || "")).map((k) => parseInt(k.kod, 10));
    const otomatikKod = String((mevcutKodlar.length > 0 ? Math.max(...mevcutKodlar) : 1000) + 1);
    const yeniKombi = { id: uid("kombi"), kod: otomatikKod, renkIdler };
    const nextTanimlar = { ...tanimlar, renkKombinasyonlari: [...mevcut, yeniKombi] };
    setTanimlar(nextTanimlar);
    yazimiIzle(tekilYaz("tanimlar:data", "tanimlar", nextTanimlar), "Tanımlar", nextTanimlar);
    showToast(`Model rengi ${otomatikKod} olarak oluşturuldu`);
    return `${otomatikKod} - ${renkAdlari.join("/")}`;
  }, [tanimlar, showToast]);

  // Sipariş ekranından MODEL RENGİ oluşturup ürüne ekler ve reçetesini kurar.
  //
  // Serbest metinle renk yazmak yerine Tanımlar'daki Model Rengi mantığı kullanılır: pozisyon
  // pozisyon (1. Renk, 2. Renk…) renk seçilir, koda dönüştürülür ("1011 - Siyah/Beyaz").
  // Sebep: mamul renkleri zaten bu biçimde tutuluyor. Serbest yazılan bir ad, aynı rengi iki farklı
  // yazımla ("Bordo" / "bordo ") ikiye böler ve kombinasyon kodu üretmediği için reçetedeki
  // pozisyon mantığıyla (1. Renk / 2. Renk) hiç bağ kuramaz.
  //
  // Dönüş: oluşturulan renk etiketi (string) veya null.
  const modelRengiVeReceteEkle = useCallback((urunId, renkIdler, kaynakRenk, hammaddeRenkleri) => {
    if (!renkIdler || renkIdler.length === 0) { showToast("En az bir pozisyon için renk seçin"); return null; }
    const renkAdlari = renkIdler.map((id) => (tanimlar.renkler.find((r) => r.id === id) || {}).ad).filter(Boolean);
    if (renkAdlari.length !== renkIdler.length) { showToast("Seçilen renklerden biri bulunamadı"); return null; }

    // Kombinasyon zaten varsa yeniden oluşturulmaz, mevcut kodu kullanılır.
    const etiket = kombinasyonOlusturGlobal(renkAdlari);
    if (!etiket) return null;

    const eklendi = yeniRenkVeReceteEkle(urunId, etiket, kaynakRenk, hammaddeRenkleri);
    return eklendi ? etiket : null;
  }, [tanimlar, kombinasyonOlusturGlobal, yeniRenkVeReceteEkle, showToast]);


  const asortiOlustur = useCallback((ad, oranlar) => {
    const temizAd = (ad || "").trim();
    if (!temizAd) return showToast("Asorti adı gerekli");
    if ((tanimlar.asortiler || []).some((a) => a.ad.toLowerCase() === temizAd.toLowerCase())) {
      return showToast("Bu asorti adı zaten kullanılıyor");
    }
    const nextTanimlar = {
      ...tanimlar,
      asortiler: [...(tanimlar.asortiler || []), { id: uid("asorti"), ad: temizAd, oranlar }],
    };
    setTanimlar(nextTanimlar);
    yazimiIzle(tekilYaz("tanimlar:data", "tanimlar", nextTanimlar), "Tanımlar", nextTanimlar);
    showToast(`"${temizAd}" asortisi oluşturuldu`);
  }, [tanimlar, showToast]);

  const addCariHareketFromStok = useCallback((cariId, hareketVeyaDizi) => {
    setCariler((prev) => {
      const gelenler = Array.isArray(hareketVeyaDizi) ? hareketVeyaDizi : [hareketVeyaDizi];
      // TEK ÇAĞRI = TEK FİŞ (bkz. CariModule'deki aynı huni).
      const yeniNo = fisNoSiradaki(fisOnEki((gelenler[0] || {}).islemTipi), tumFisNumaralari(prev));
      const eklenecekler = gelenler
        // SON SAVUNMA HATTI: her cari hareketi bu huniden geçiyor. Fiş numarasını burada
        // tamamlamak, kuralı çağıran tarafın hatırlamasına bağlı olmaktan çıkarır. "OTO" ön eki
        // ayrıca bilgi taşır: kaynak numara vermemiş, sistem üretmiş demektir.
        // SON SAVUNMA HATTI (fiş numarasıyla aynı gerekçe): zaman damgası burada tamamlanır ki
        // yeni bir kayıt yolu eklendiğinde kimse eklemeyi unutamasın.
        .map((h) => ({
          ...h, id: h.id || uid("hrk"),
          fisNo: h.fisNo || yeniNo,
          zaman: h.zaman || new Date().toISOString(),
          // Kimin yaptığı da burada tamamlanır — fiş numarası ve zaman damgasıyla aynı gerekçe:
          // yeni bir kayıt yolu eklendiğinde kimse eklemeyi unutamasın.
          kullanici: h.kullanici || (aktifKullanici && aktifKullanici.ad) || null,
          islemTipi: undefined,
        }));
      const next = prev.map((c) =>
        c.id === cariId ? { ...c, hareketler: [...eklenecekler, ...(c.hareketler || [])] } : c
      );
      yazimiIzle(tabloYaz("cari:data", "cariler", next), "Cari kartları", next);
      return next;
    });
  }, [aktifKullanici]);




  // ---- ALIŞ / SATIŞ FİŞİ ----
  // Cari kartındaki "Alış Fişi" / "Satış Fişi" ekranından gelir. Sipariş OLUŞTURMAZ: fiş, olmuş
  // bir işlemin belgesidir (mal elde, borç doğdu), sipariş ise gelecek bir malı anlatır.
  //
  // TEK FİŞ NUMARASI bütün kalemleri bağlar. Önceki sürüm her ürün+renk için ayrı numara
  // üretiyordu; bir alışverişte üç malzeme varsa o üç satırın aynı belgeye ait olduğu bilgisi
  // hiçbir yerde durmuyordu. Cari tarafına da TEK hareket yazılıyor — cari ekstresi belge
  // bazlıdır, kalem bazlı değil; üç satır görmek ekstreyi okunmaz yapardı.
  // ÇEK İŞLEMLERİ — TEK KAPI.
  //
  // Kullanıcı (6 Eylül): "Çek hareketi 'ciro et' yetersiz. Çeki iade et, bankaya tahsil için ver
  // olmalı." Beş işlem var (ciro, iade, tahsile ver, tahsil edildi, karşılıksız) ve hepsi aynı
  // kapıdan geçiyor: hangi geçişin yapılabileceğine `cekIslemUygula` karar veriyor, buradaki iş
  // yalnız YAN ETKİLERİ (cari hareketi) kurmak ve kaydetmek.
  // ÇEK GÖRSELİ KAYDET.
  //
  // Buluta TAM LİSTE (`cek_gorselleri` tablosu, satır başına bir çek), yerele BOŞ liste —
  // `tabloYaz`ın dördüncü parametresi. Yerel kopya çek başına ayrı anahtarda tutuluyor
  // (`cekGorselYaz`), yoksa bütün fotoğraflar tek anahtarda toplanır ve 5 MB sınırına çarpardı.
  // ÇEK İŞLEMLERİ AYRI DOSYADA (19 Eylül, 2. madde, 6. tur): `088-cekler.jsx`.
  const { cekGorselKaydet, cekEkleVeIsle, cekIslemYap } = useCekler({
    addCariHareketFromStok, aktifKullanici, cariler, cekGorselleri, kaydetmeHatasiBildir, muhasebe, saveMuhasebe, setCekGorselleri, showToast,
  });

  // ATOMİK (Adım 1): fiş önce deftere yazılır; yazılamazsa hiçbir türev tabloya dokunulmaz.
  // CARİ KARTINDAN FİŞ KESME AYRI DOSYADA (19 Eylül, 2. madde, 5. tur): `089-carifisi.jsx`.
  // GERİ AL KÖPRÜSÜ (ERP standardı): fiş geri alma (`yetimFisTemizle`) bu hook'tan SONRA
  // tanımlı; ref ile geç bağlanıyor (onay sistemindeki çözümün aynısı).
  const fisGeriAlRef = useRef(null);
  const stokFisiKaydet = useCariFisiKaydet({
    fisGeriAlRef,
    addCariHareketFromStok, aktifKullanici, cariler, fisDefterineYaz, muhasebeyePesinIsle, setSiparisler, setStok, showToast, siparisler, stok,
    koliler, saveKoliler,
  });

  // Bir hareketi (stok veya cari tarafında oluşmuş olsun) her iki taraftan da kaldırır.
  // Stok tarafında bulunursa miktarı geri düşer; cari tarafında bulunursa listeden çıkarır.
  // KASA/BANKA KARŞI KAYDINI TEMİZLER — `muhasebeBagId` ile bağlı olanlar.
  //
  // Kullanıcı (6 Eylül): "Kasa hareketleri fişler ile bağımsız! Fişlerden sildiğim kasadan
  // silinmiyor! Çok önemli bu bağlantılar."
  //
  // SEBEP: bu temizlik `removeHareketEverywhere` (cari kartından tek hareket silme) içinde YAZILI
  // ama `yetimFisTemizle` (Fişler ekranından fişin tamamını silme) içinde YOKTU. İki silme yolu
  // aynı `fisGeriAl` sonucunu alıyor, biri `muhasebeBagIdler`ı uyguluyor diğeri görmezden
  // geliyordu — hareket cariden gidiyor, kasada YETİM kalıyordu ve kasa bakiyesi kalıcı olarak
  // şişik duruyordu.
  //
  // Ortak fonksiyona alındı: notun "aynı şeyi yapan iki yer, ayrışacak iki yer" kuralı. Üçüncü bir
  // silme yolu eklenirse de buradan geçecek.
  //
  // `temel`: temizliğin uygulanacağı muhasebe hâli. Çağıran zaten değiştirilmiş bir hâl
  // tutuyorsa (fiş silerken çek kayıtları da gidiyor) onu vermeli; yoksa mevcut state.
  //
  // SONUCU `setMuhasebe`nin İÇİNDE HESAPLAMIYORUZ: state güncelleyicisi ASENKRON çalışıyor,
  // yani fonksiyon dönerken yeni hâl henüz hazır değil ve diske yazılacak nesne `null` kalıyordu.
  // İlk denemede tam olarak bu oldu — cari hareketi siliniyor, kasa kaydı yerinde duruyordu.
  // MUHASEBE BAĞI TEMİZLEME AYRI DOSYADA (19 Eylül, 2. madde, 8. tur): `085-muhasebe-bagi.jsx`.
  const muhasebeBaglariniTemizle = useMuhasebeBagiTemizle({ muhasebe, setMuhasebe, cariler, showToast });

  const removeHareketEverywhere = useCallback((hareketId) => {
    // TEK KAPI: geri almanın kendisi `fisGeriAl`da. Burada kalan iş çöp kaydı, yazma ve bildirim.
    // `cariHareketindenSiparisDus`: bu yol tek bir hareketi siler ve o hareket yalnızca cari
    // tarafında duruyor olabilir (ürünsüz kayıt); sipariş bağı oradan okunur.
    const sonuc = fisGeriAl({ stok, cariler, siparisler, uretim, muhasebe, koliler }, {
      hareketIdler: [hareketId],
      cariHareketindenSiparisDus: true,
      kullanici: (aktifKullanici && aktifKullanici.ad) || null,
    });

    // ÇEK KİLİDİ: işlem görmüş çekin giriş hareketi silinmez. Mesaj ne yapılacağını söylüyor.
    if (sonuc.engel && sonuc.engel.sebep === "cek-islemde") {
      showToast(sonuc.engel.mesaj);
      gunlukYaz(`Çeke bağlı hareket silinmek istendi (reddedildi): ${sonuc.engel.cekNo || "no yok"}`, "muhasebe",
        { cekId: sonuc.engel.cekId, durum: sonuc.engel.durum });
      return;
    }

    // ÜRETİM KİLİDİ: üretim fişi buradan silinmez, üretim kartından geri alınır (sıra kontrolü orada).
    if (sonuc.engel && sonuc.engel.sebep === "uretim-fisi") {
      showToast(
        `Bu hareket "${sonuc.engel.uretimNo}" üretiminin "${sonuc.engel.proses || "?"}" prosesine ait — ` +
        `buradan silinemez. Üretim kartından o prosesin teslim alınmasını geri alın (prosesler sondan geriye doğru geri alınır).`
      );
      return;
    }

    // Çöp kayıtları state güncellemesinden ÖNCE alınır (sebep için bkz. siparisSilCascade).
    // Hareketler otomatik geri yüklenemez: geri koymak stok/bakiye düzeltmesi de gerektirir ve o
    // arada başka hareketler girmiş olabilir. Kayıt yine de değerli — "bu tutar/miktar nereden
    // gelip nereye gitti?" sorusunun tek cevabı burasıdır.
    sonuc.silinenStokKayitlari.forEach(({ urun: p, hareket: h }) => {
      copaAt("stokHareketi", `${p.ad} · ${h.renk || ""} ${h.beden || ""}`.trim(), h, {
        ozet: `${h.miktar > 0 ? "+" : ""}${h.miktar} — ${h.kaynak || "hareket"}${h.fisNo ? " · " + h.fisNo : ""}`,
        ustKayit: { tur: "urun", id: p.id, ad: p.ad },
        yanEtkiliMi: true,
        geriAlinabilirMi: false,
      });
    });
    sonuc.silinenCariKayitlari.forEach(({ cari: c, hareket: h }) => {
      copaAt("cariHareketi", c.unvan, h, {
        ozet: `${h.yon || ""} ${h.tutar || 0} ${h.paraBirimi || "TRY"}${h.aciklama ? " — " + h.aciklama : ""}${h.fisNo ? " · " + h.fisNo : ""}`,
        ustKayit: { tur: "cari", id: c.id, ad: c.unvan },
        yanEtkiliMi: true,
        geriAlinabilirMi: false,
      });
    });

    if (sonuc.silinenStok > 0) {
      (sonuc.silinenFisNolar || []).forEach(fisDefterindeIptal);   // defterde iptal işareti (Adım 1)
    setStok(sonuc.stok);
      yazimiIzle(tabloYaz("stok:items", "urunler", sonuc.stok), "Stok kartları", sonuc.stok);
    }
    if (sonuc.silinenCari > 0) {
      setCariler(sonuc.cariler);
      yazimiIzle(tabloYaz("cari:data", "cariler", sonuc.cariler), "Cari kartları", sonuc.cariler);
    }
    if (sonuc.etkilenenSiparisler.size > 0) {
      setSiparisler(sonuc.siparisler);
      yazimiIzle(tabloYaz("siparis:data", "siparisler", sonuc.siparisler), "Siparişler", sonuc.siparisler);
    }
    // ÇEK: harekete bağlı çek kaydı da gider. Ödemesi silinmiş bir çekin vadesi gelince
    // hatırlatılması, kullanıcıyı olmayan bir alacağın peşine düşürürdü.
    sonuc.silinenCekler.forEach((c) => {
      copaAt("cek", `${c.cekNo || "çek"} · ${c.banka || ""}`.trim(), c, {
        ozet: `${c.tip} · ${c.tutar} ${c.paraBirimi || "TRY"} · vade ${c.vadeTarihi || "—"}`,
        yanEtkiliMi: true,
        geriAlinabilirMi: false,
      });
    });
    // İŞLEM hareketi (ciro/iade) silindiyse çek bir önceki durumuna döndü (bkz. `cekIslemGeriAl`).
    sonuc.geriAlinanCekler.forEach((c) => {
      gunlukYaz(`Çek işlemi geri alındı: ${c.cekNo || "no yok"}`, "muhasebe", { cekId: c.id, durum: c.durum });
    });
    if (sonuc.geriAlinanCekler.length > 0) {
      const ilk = sonuc.geriAlinanCekler[0];
      const etiket = ((ilk.gecmis || [])[(ilk.gecmis || []).length - 1] || {}).islem || "İşlem geri alındı";
      showToast(sonuc.geriAlinanCekler.length === 1
        ? `${etiket} — ${ilk.cekNo || "çek"} yeniden "${ilk.durum}"`
        : `${sonuc.geriAlinanCekler.length} çekin işlemi geri alındı`);
    }
    // MUHASEBE TEK YAZIMLA. Kasa karşı kaydı ve çek değişikliği AYNI kayda (`muhasebe`) düşüyor.
    // Eskiden önce kasa temizliği yazılıp ardından çek değişikliği `sonuc.muhasebe` ile yazılıyordu:
    // ikincisi kasa temizliğini içermediği için onu EZİYORDU. Temizlik `sonuc.muhasebe` üzerine
    // yapıldığında çek değişikliği de içinde; ayrı bir yazıma gerek kalmıyor.
    if (sonuc.muhasebeBagIdler.length > 0) muhasebeBaglariniTemizle(sonuc.muhasebeBagIdler, sonuc.muhasebe);
    else if (sonuc.cekDegisti) saveMuhasebe(sonuc.muhasebe);
    // KOLİ: sevkiyat fişi geri alınınca koli yeniden "Hazır" olur ve tekrar okutulabilir.
    if (sonuc.etkilenenKoliler.length > 0) {
      saveKoliler(sonuc.koliler);
      showToast(`${sonuc.etkilenenKoliler.length} koli "Hazır" durumuna döndü`);
    }
    // ÜRETİM: hareket bir üretim fişine aitse o prosesin "teslim alındı" işareti de geri alınır.
    // Aksi halde mal stoğa geri gelir ama üretim kartında proses bitmiş görünür.
    if (sonuc.etkilenenUretimler.size > 0) {
      setUretim(sonuc.uretim);
      yazimiIzle(tabloYaz("uretim:siparisler", "uretim", sonuc.uretim), "Üretim", sonuc.uretim);
    }
    if (sonuc.etkilenenSiparisler.size > 0 || sonuc.etkilenenUretimler.size > 0) {
      showToast(
        "Hareket; stok, cari" +
        (sonuc.etkilenenSiparisler.size > 0 ? ", sipariş" : "") +
        (sonuc.etkilenenUretimler.size > 0 ? ", üretim" : "") +
        " kayıtlarından birlikte silindi"
      );
    }
  }, [showToast, copaAt, stok, cariler, siparisler, uretim, muhasebe, saveMuhasebe, koliler, saveKoliler, muhasebeBaglariniTemizle, aktifKullanici, fisDefterindeIptal]);

  // ÇEKİ BAĞLI GİRİŞ HAREKETİYLE BİRLİKTE SİL.
  //
  // Çek ekranından silinen çekin DOĞDUĞU cari hareketi (tahsilat/ödeme) caride kalıyordu: çek
  // gidiyor, bakiyeyi değiştirmiş "Çek No …" satırı ekstrede yetim duruyordu. Değişmez kuralın
  // ters yönü — silme hangi uçtan başlarsa başlasın aynı kapıdan geçmeli.
  //
  // İKİNCİ BİR SİLME MANTIĞI YAZILMADI: hareket `removeHareketEverywhere` ile siliniyor, çek de
  // `fisGeriAl`ın çek tarafında onunla birlikte gidiyor (çöp kaydı dahil). Buradaki iş yalnız
  // hareketi bulmak ve ne olduğunu söylemek.
  //
  // `false` dönerse çağıran çeki tek başına siler: bağlı hareket yoksa (kimliksiz eski kayıt ya da
  // hareket zaten silinmiş) silinecek başka bir şey de yoktur.
  const cekHareketiyleSil = useCallback((cekId) => {
    const cek = ((muhasebe && muhasebe.cekler) || []).find((c) => c.id === cekId);
    if (!cek || !cek.hareketId) return false;
    const sahip = cariler.find((c) => (c.hareketler || []).some((h) => h.id === cek.hareketId));
    if (!sahip) return false;
    const hareket = sahip.hareketler.find((h) => h.id === cek.hareketId);
    removeHareketEverywhere(cek.hareketId);
    showToast(`Çek ve bağlı ${hareket.islemTipi || "cari"} hareketi (${hareket.fisNo || "fiş no yok"} · ${sahip.unvan}) birlikte silindi`);
    return true;
  }, [muhasebe, cariler, removeHareketEverywhere, showToast]);

  // Bir cariyi (hareketleri varsa) siler — önce o cariye ait TÜM hareketleri (removeHareketEverywhere
  // ile aynı güvenli, sıralı, fonksiyonel state güncelleme deseniyle) temizler, sonra cariyi siler.
  // Bu iki adım aynı anda karışık şekilde yapılırsa (biri fonksiyonel, biri doğrudan state ataması)
  // React'ın state güncellemelerini işleme sırası yüzünden bazı hareketler "geri gelebilir" — o yüzden
  // cari silme işlemi de aynı fonksiyonel (prev => ...) desenle, hareket silmelerin ARDINDAN kuyruğa girer.
  // Adı geriye dönük uyumluluk için korunuyor ama artık CASCADE DEĞİL, KORUMALI silme yapıyor.
  // Buraya yalnızca yönetici onayından geçen istekler düşüyor; onay bile hareketi olan bir cariyi
  // sildiremez. Aksi halde yetkisiz kullanıcı, doğrudan yapamadığı silmeyi onay üzerinden
  // yaptırarak politikayı dolanabilirdi — ürün tarafında da aynı arka kapı kapatıldı.
  // SİLME ZİNCİRLERİ AYRI DOSYADA (19 Eylül, 2. madde, 7. tur): `087-silme-zinciri.jsx`.
  const { cariSilCascade, urunSilCascade, siparisSilCascade } = useSilmeZincirleri({
    cariler, copaAt, showToast, siparisler, stok, uretim,
    setCariler, setStok, setSiparisler,
  });

  // ONAY SİSTEMİNİN İŞ KANCALARI: zincirler ve üretim silme burada hazır olduğuna göre ref
  // doldurulabilir. Onay ekranından "onayla" denince hook bunları ref üzerinden çağırıyor.
  onayIsleriRef.current = { urunSilCascade, cariSilCascade, siparisSilCascade, uretimSil, copaAt };

  // Kaynağı (sipariş/üretim) artık var olmayan "yetim" bir fişi tamamen temizler — o fişe ait TÜM
  // stok ve cari hareketlerini siler, stok miktarlarını da (o hareketlerin etkisini geri alarak) düzeltir.
  const yetimFisTemizle = useCallback(async (fis) => {
    // Bu fonksiyon eskiden mesajı KOŞULSUZ basıyordu: hiçbir hareket eşleşmese bile "temizlendi"
    // diyordu. Kullanıcı temizlendiğini sanıp fişin listede durmasına anlam veremiyordu.
    // Artık her dal kendi gerçeğini söylüyor.
    const hareketIdler = (fis.hareketler || []).map((h) => h.id).filter(Boolean);
    if (hareketIdler.length === 0) {
      showToast(`"${fis.fisNo || "?"}" fişindeki hareketlerin kimliği yok — silinecek kayıt bulunamadı.`);
      gunlukYaz(`Yetim fiş temizlenemedi (kimliksiz): ${fis.fisNo || "?"}`, "stok", { fisNo: fis.fisNo || null });
      return;
    }

    // TEK KAPI: geri almanın kendisi `fisGeriAl`da (sipariş `karsilanan` düşümü ve `esId` kardeş
    // kaydının silinmesi dahil). Burada kalan iş çöp kaydı, yazma ve bildirim.
    const sonuc = fisGeriAl({ stok, cariler, siparisler, uretim, muhasebe, koliler }, {
      hareketIdler, kullanici: (aktifKullanici && aktifKullanici.ad) || null,
    });

    // ÇEK KİLİDİ — bkz. removeHareketEverywhere.
    if (sonuc.engel && sonuc.engel.sebep === "cek-islemde") {
      showToast(sonuc.engel.mesaj);
      gunlukYaz(`Çeke bağlı fiş silinmek istendi (reddedildi): ${fis.fisNo || "?"}`, "muhasebe",
        { fisNo: fis.fisNo || null, cekId: sonuc.engel.cekId, durum: sonuc.engel.durum });
      return;
    }

    // ÜRETİM KİLİDİ — bkz. removeHareketEverywhere. Üretim fişleri (çıkış / işçilik / mamul girişi)
    // Fişler ekranından temizlenmez: prosesler sıralı ilerler ve geri alma da sondan geriye doğru
    // yapılmalıdır. O kontrol üretim kartında; burada delinmesin diye kapı reddediyor.
    if (sonuc.engel && sonuc.engel.sebep === "uretim-fisi") {
      showToast(
        `"${fis.fisNo || "?"}" bir üretim fişi ("${sonuc.engel.uretimNo}" · ${sonuc.engel.proses || "?"}) — ` +
        `buradan temizlenemez. Üretim kartından prosesin teslim alınmasını geri alın; prosesler sondan geriye doğru geri alınır.`
      );
      gunlukYaz(`Üretim fişi Fişler ekranından silinmek istendi (reddedildi): ${fis.fisNo || "?"}`, "stok",
        { fisNo: fis.fisNo || null, uretimNo: sonuc.engel.uretimNo });
      return;
    }

    // ÇÖP KUTUSU — silinen cari hareketleri geri alınabilir kalsın.
    sonuc.silinenCariKayitlari.forEach(({ cari: c, hareket: h }) => {
      copaAt("cariHareketi", c.unvan, h, {
        ozet: `${h.yon || ""} ${h.tutar || 0} ${h.paraBirimi || "TRY"}${h.aciklama ? " — " + h.aciklama : ""}${h.fisNo ? " · " + h.fisNo : ""}`,
        ustKayit: { tur: "cari", id: c.id, ad: c.unvan },
        yanEtkiliMi: true,
        geriAlinabilirMi: false,
      });
    });

    // HİÇBİR EŞLEŞME YOK. Sessizce "oldu" demek yerine teşhis için gereken sayıyı veriyoruz: fişte
    // kaç hareket kimliği var ve hiçbiri bulunamadı. Bu, fişin ekrandaki hâliyle depodaki hâli
    // arasında bir kopukluk olduğunu söyler.
    if (sonuc.silinenStok === 0 && sonuc.silinenCari === 0) {
      showToast(
        `⚠ "${fis.fisNo || "?"}" temizlenemedi — fişteki ${sonuc.hareketIdler.size} hareketin hiçbiri ` +
        `stok/cari kayıtlarında bulunamadı. Sayfayı yenileyip tekrar deneyin; sorun sürerse bildirin.`
      );
      gunlukYaz(`Yetim fiş temizlenemedi (eşleşme yok): ${fis.fisNo || "?"}`, "stok",
        { fisNo: fis.fisNo || null, aranan: sonuc.hareketIdler.size });
      return;
    }

    // Yazmalar BEKLENİR. "Temizlendi" mesajı ancak buluta gerçekten yazıldıktan sonra verilir;
    // aksi halde kullanıcı silindiğini sanıp diğer bilgisayarda fişi görmeye devam ederdi.
    const sonuclar = [];
    (sonuc.silinenFisNolar || []).forEach(fisDefterindeIptal);   // defterde iptal işareti (Adım 1)
    if (sonuc.silinenStok > 0) { setStok(sonuc.stok); sonuclar.push(await tabloYaz("stok:items", "urunler", sonuc.stok)); }
    if (sonuc.silinenCari > 0) { setCariler(sonuc.cariler); sonuclar.push(await tabloYaz("cari:data", "cariler", sonuc.cariler)); }
    if (sonuc.etkilenenSiparisler.size > 0) { setSiparisler(sonuc.siparisler); sonuclar.push(await tabloYaz("siparis:data", "siparisler", sonuc.siparisler)); }
    // ÇEK: fişe bağlı çek kayıtları gider, ciro fişi silindiyse çek portföye döner
    // (bkz. removeHareketEverywhere).
    sonuc.silinenCekler.forEach((c) => {
      copaAt("cek", `${c.cekNo || "çek"} · ${c.banka || ""}`.trim(), c, {
        ozet: `${c.tip} · ${c.tutar} ${c.paraBirimi || "TRY"} · vade ${c.vadeTarihi || "—"}`,
        yanEtkiliMi: true,
        geriAlinabilirMi: false,
      });
    });
    sonuc.geriAlinanCekler.forEach((c) => {
      gunlukYaz(`Çek işlemi geri alındı: ${c.cekNo || "no yok"}`, "muhasebe", { cekId: c.id, fisNo: fis.fisNo || null });
    });
    // KASA/BANKA KARŞI KAYDI — BU SATIR EKSİKTİ. Fişten silinen bir peşin tahsilat/ödeme cariden
    // gidiyor ama kasada yetim kalıyordu (kullanıcı bildirdi, 6 Eylül).
    // TEK YAZIM: temizlik `sonuc.muhasebe` üzerine yapılıyor, yani çek değişikliği de içinde.
    if (sonuc.muhasebeBagIdler.length > 0) {
      const r = await muhasebeBaglariniTemizle(sonuc.muhasebeBagIdler, sonuc.muhasebe);
      if (r) sonuclar.push(r);
    } else if (sonuc.cekDegisti) {
      sonuclar.push(await tekilYaz("muhasebe:data", "muhasebe", sonuc.muhasebe));
      setMuhasebe(sonuc.muhasebe);
    }
    // KOLİ: bkz. removeHareketEverywhere.
    if (sonuc.etkilenenKoliler.length > 0) {
      setKoliler(sonuc.koliler);
      sonuclar.push(await tekilYaz("koli:data", "koliler", sonuc.koliler));
    }
    // ÜRETİM: üretim fişi silindiyse prosesin ilerlemesi de geri alınır (bkz. fisGeriAl).
    if (sonuc.etkilenenUretimler.size > 0) { setUretim(sonuc.uretim); sonuclar.push(await tabloYaz("uretim:siparisler", "uretim", sonuc.uretim)); }
    const basarisiz = sonuclar.filter((r) => r && r.ok === false);

    gunlukYaz(
      basarisiz.length ? `Yetim fiş temizleme YARIM KALDI: ${fis.fisNo || "?"}` : `Yetim fiş temizlendi: ${fis.fisNo || "?"}`,
      "stok",
      { fisNo: fis.fisNo || null, stokHareketi: sonuc.silinenStok, cariHareketi: sonuc.silinenCari,
        siparisKalemi: Object.keys(sonuc.kalemDusumu).length, uretim: sonuc.etkilenenUretimler.size,
        basarisizYazma: basarisiz.length }
    );

    if (basarisiz.length > 0) {
      showToast(
        `⚠ "${fis.fisNo || "?"}" bu bilgisayarda temizlendi ama BULUTA YAZILAMADI ` +
        `(${basarisiz[0].hata}). Diğer bilgisayarlarda fiş durmaya devam eder. Sayfayı yenileyip tekrar deneyin.`
      );
      return;
    }
    showToast(
      `"${fis.fisNo || "?"}" temizlendi — ${sonuc.silinenStok} stok, ${sonuc.silinenCari} cari hareketi silindi` +
      (Object.keys(sonuc.kalemDusumu).length > 0 ? `, ${Object.keys(sonuc.kalemDusumu).length} sipariş kalemi geri alındı` : "") +
      (sonuc.etkilenenUretimler.size > 0 ? ", üretim ilerlemesi geri alındı" : "") +
      (sonuc.geriAlinanCekler.length > 0 ? `, ${sonuc.geriAlinanCekler.length} çekin işlemi geri alındı (önceki durumuna döndü)` : "")
    );
  }, [stok, cariler, siparisler, uretim, muhasebe, koliler, showToast, copaAt, muhasebeBaglariniTemizle, aktifKullanici, fisDefterindeIptal]);
  // Toast'taki "Geri al" düğmesi fiş numarasıyla buraya gelir.
  useEffect(() => {
    fisGeriAlRef.current = (fisNo, hareketIdler) => {
      // Kimlikler verilmişse deftere bakılmaz; yoksa defterden aranır.
      const fis = (hareketIdler && hareketIdler.length > 0)
        ? { fisNo, hareketler: hareketIdler.map((id) => ({ id })) }
        : (fisDefteri || []).find((f) => f && f.fisNo === fisNo && !f.iptal);
      if (!fis) { showToast(`${fisNo} fişi bulunamadı — geri alınamadı`); return; }
      yetimFisTemizle(fis);
    };
  }, [fisDefteri, yetimFisTemizle, showToast]);

  // Bir siparişten seçilen kalemler için stok hareketi + cari hareketi oluşturur,
  // karşılanan miktarları günceller ve duruma göre siparişi otomatik tamamlar/kısmi işaretler.
  // ADIM 3 (15 Eylül): ARTIK ATOMİK. Eskiden bütün gövde `setSiparisler` güncelleyicisinin İÇİNDE
  // çalışıyordu; orada `await` edilemediği için fiş defterine yazma ancak güncelleme bittikten
  // SONRA yapılabiliyordu — yani "defter yazılamazsa hiçbir şey olmasın" güvencesi bu yolda yoktu.
  //
  // Şimdi sıra: (1) hesap (saf, hiçbir state'e dokunmaz) → (2) fiş defterine TEK yazma →
  // (3) başarısızsa ÇIK, hiçbir yan etki uygulanmaz → (4) başarılıysa sipariş/stok/cari/koli
  // güncellenir. Güncelleyici içinde `siparisler` yerine state'in kendisi okunuyor: düğmeye
  // basıldığı anda güncel olan odur, ve iki teslim aynı anda yapılmıyor.
  // SİPARİŞ TESLİM ALMA AYRI DOSYADA (19 Eylül, 2. madde, 10. tur): `081-siparis-teslim.jsx`.
  const siparisGerceklestir = useSiparisTeslim({
    siparisler, stok, cariler, muhasebe, koliler, showToast, aktifKullanici, saveKoliler, fisDefterineKayitYaz, setSiparisler, setStok, setCariler,
  });

  // Her modülün atölye paletinden kendine özgü vurgu rengi — gezinme ve başlıkta kullanılır.
  // Bir siparişe yönlendirirken tipine göre doğru ana sekme açılır: alış siparişleri artık
  // "Satın Alma" sekmesinde yaşıyor ve "siparis" sekmesinde hiç görünmüyor.
  const sipariseGit = useCallback((siparisId) => {
    setSiparisHedefId(siparisId);
    const hedef = siparisler.find((x) => x.id === siparisId);
    setTab(hedef && hedef.tip === "Alış" ? "satinalma" : "siparis");
  }, [siparisler]);


  const TAB_TITLES = {
    anasayfa: "Atölye ERP",
    tanimlar: "Tanımlar",
    stok: "Stok Yönetimi",
    uretim: "Üretim Takibi",
    cari: "Cari Hesaplar",
    siparis: "Sipariş Yönetimi",
    // ALIŞ SİPARİŞİ SEKMESİNİN BAŞLIĞI EKSİKTİ (kullanıcı ekran görüntüsüyle bildirdi,
    // 10 Eylül: "üst başlıkta Sipariş Yönetimi yazmıyor"). Anahtar `satinalma`; tabloda
    // karşılığı olmadığı için başlık başka bir yerden düşüyordu.
    satinalma: "Alış Siparişi",
    modelhane: "Modelhane",
    fisler: "Fişler",
    gelirgider: "Gelir / Gider Kartları",
    muhasebe: "Muhasebe",
    planlama: "Planlama",
    // DEPO BAŞLIĞI EKSİKTİ (kullanıcı ekran görüntüsüyle, 12 Eylül): üst şeritte boş bir nokta ve
    // çizgi duruyor, modül kendi büyük başlığını bir daha basıyordu. Başlık buraya, modülünki kalktı.
    depo: "Depo",
    // Paketleme de eksikti (aynı ekran görüntüsü): üst şeritte boş nokta.
    paketleme: "Paketleme",
  };
  const TAB_DESC = {
    anasayfa: "Atölyenizin günlük özeti burada.",
    tanimlar: "Renk, beden, proses, kullanıcı gibi tüm atölye tanımlarını buradan yönetin.",
    stok: "Tanımlı renk/bedenlerden seçerek ürün matrisi oluşturun; her ürünün rengine kendi görselini ekleyin.",
    uretim: "Sipariş aşamalarını kesimden sevkiyata kadar izleyin.",
    cari: "Müşteri ve tedarikçi bakiyelerini, çek/senet dahil hareketleriyle takip edin.",
    siparis: "Satış ve alış siparişlerinizi ayrı ayrı takip edin.",
    modelhane: "Koleksiyona girmeyen modeller: çizim, teknik resim, kalıp ve taban bilgisi. Onaylanan model Stok'a ürün olarak geçer.",
    fisler: "Kesilen bütün fişler tek listede: alış, satış, üretim, işçilik, tahsilat, ödeme. Tip çipleriyle daraltın.",
    gelirgider: "Alış olmayan gider ve gelirlerin kartları: kira, elektrik, personel, nakliye. Kâr-zarar raporu bu kartlardan okunuyor.",
    muhasebe: "Kasa, banka ve çek/senet hareketlerinizi tek yerden takip edin.",
    planlama: "Bekleyen siparişlere göre gereken hammaddeyi hesaplayın (MRP) ve stokla karşılaştırın.",
  };

  const kullaniciCikisYap = () => {
    gunlukYaz("Çıkış yaptı", "oturum", {});
    // Bulut jetonu da düşürülür. Yalnızca ekranı kapatıp jetonu bırakmak, "çıkış yaptım"
    // sanan kullanıcının oturumunun açık kalması demekti.
    supabaseCikis();
    oturumTemizle();
    arayuzDurumuSil();   // sonraki kullanıcı yenileyince bu kişinin ekranları açılmasın
    setBulutKimligi(false);
    setBulutGirisAyrinti(null);
    setBulutAyrintiAcik(false);
    setAktifKullanici(null);
  };
  const [onayPaneliAcik, setOnayPaneliAcik] = useState(false);
  const bekleyenOnaylar = onaylar.filter((o) => o.durum === "Bekliyor");
  const girisSistemiAktif = !!tanimlar.girisAktifMi;

  // Açılışta oturumu geri yükle: tanımlar (dolayısıyla kullanıcı listesi) hazır olduğunda bir kez.
  const oturumGeriYuklendi = useRef(false);
  useEffect(() => {
    if (loading || oturumGeriYuklendi.current || aktifKullanici) return;
    if (!girisSistemiAktif) return;
    const liste = tanimlar.kullanicilar || [];
    if (liste.length === 0) return;
    oturumGeriYuklendi.current = true;
    const kayit = oturumOku();
    if (!kayit) return;
    const kullanici = liste.find((k) => k.id === kayit.kullaniciId && !k.pasif);
    if (!kullanici) { oturumTemizle(); return; }
    setAktifKullanici(kullanici);
    setBulutKimligi(!!kayit.bulut);
    gunlukKullaniciAyarla(kullanici);
  }, [loading, girisSistemiAktif, tanimlar.kullanicilar, aktifKullanici, oturumOku, oturumTemizle]);

  // Giriş sistemi pasifken (uygulama test aşamasındayken), hiçbir hesap oluşturmaya/giriş yapmaya
  // gerek kalmadan, herkes tam yetkili bir "Yönetici" gibi doğrudan uygulamaya girer.
  useEffect(() => {
    if (!girisSistemiAktif && !aktifKullanici) {
      setAktifKullanici({ id: "test-modu", ad: "Test Kullanıcısı", rol: "Yönetici", yetkiler: {} });
    }
    if (girisSistemiAktif && aktifKullanici && aktifKullanici.id === "test-modu") {
      setAktifKullanici(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [girisSistemiAktif]);

  // SAHA MODU: giriş yapılmışsa ve mod açıksa tam ekranın YERİNE. Menüden çıkılabiliyor.
  // Giriş ekranı, ilk kurulum ve bulut ön girişi her zaman önce gelir — mod onların yerini almaz.
  const mobilGorunum = mobilGorunumCoz(tanimlar.mobilGorunum);

  // MOBİL DÜZEN KİPİ: "oto" (ekran/işaretçi), "acik" (her zaman mobil), "kapali" (her zaman masaüstü).
  // Tercih CİHAZA ait (`localStorage`), buluta yazılmıyor: aynı hesabı hem telefondan hem
  // bilgisayardan kullanan biri için doğru olan cihaz başına ayrı karar.
  const [mobilDuzenKipi, setMobilDuzenKipi] = useState(() => {
    try { return window.localStorage.getItem("mobil:duzen") || "oto"; } catch (e) { return "oto"; }
  });
  const mobilDuzenKipiAyarla = useCallback((kip) => {
    setMobilDuzenKipi(kip);
    try { window.localStorage.setItem("mobil:duzen", kip); } catch (e) { /* özel sekme */ }
  }, []);
  const [otoMobil, setOtoMobil] = useState(false);
  useEffect(() => {
    // Dokunmatik geniş telefon/tablet de mobil sayılıyor: parmakla kullanılan bir ekranda sol menü
    // ve yoğun tablolar 900px'te de zor.
    const sorgu = window.matchMedia("(max-width: 720px), (pointer: coarse) and (max-width: 1180px)");
    const uygula = () => setOtoMobil(sorgu.matches);
    uygula();
    if (sorgu.addEventListener) sorgu.addEventListener("change", uygula);
    else sorgu.addListener(uygula);
    return () => {
      if (sorgu.removeEventListener) sorgu.removeEventListener("change", uygula);
      else sorgu.removeListener(uygula);
    };
  }, []);
  const mobilDuzen = mobilDuzenKipi === "acik" ? true : mobilDuzenKipi === "kapali" ? false : otoMobil;
  useEffect(() => {
    const g = document.body;
    g.classList.toggle("mobil-duzen", mobilDuzen);
    g.classList.toggle("masaustu-duzen", !mobilDuzen);
    mobilDuzenRef.current = mobilDuzen;
    setMobilDuzenSurumu((n) => n + 1);   // menü genişliği yeniden hesaplansın
  }, [mobilDuzen]);

  // BULUT ÖN GİRİŞ (2. aşama): veri okunamadıysa her şeyden önce.
  //
  if (!loading && bulutGirisGerekli) {
    return (
      <BulutGirisEkrani
        sebep={bulutGirisGerekli.sebep}
        showToast={showToast}
        onGiris={(kim) => {
          setBulutOnGiris(kim);
          setBulutGirisGerekli(null);
          setOturumDustu(false);
          setLoading(true);
          setYuklemeSayaci((n) => n + 1);
        }}
      />
    );
  }

  if (!loading && storageOk && girisSistemiAktif) {
    if ((tanimlar.kullanicilar || []).length === 0) {
      return (
        <IlkKurulumEkrani
          onOlustur={(ad, kullaniciAdi, eposta) => {
            // Şifre YOK (v1.445.0): ekran bulut hesabını doğruladı, kimlik Supabase'de.
            const yeniKullanici = {
              id: uid("kullanici"), ad, kullaniciAdi, rol: "Yönetici", yetkiler: {}, eposta, bulutHesabi: true,
            };
            const nextTanimlar = { ...tanimlar, kullanicilar: [yeniKullanici] };
            saveTanimlar(nextTanimlar);
            setAktifKullanici(yeniKullanici);
            setBulutKimligi(true);
            oturumSakla(yeniKullanici, true);
          }}
        />
      );
    }
    if (!aktifKullanici) {
      return (
        <GirisEkrani
          kullanicilar={tanimlar.kullanicilar}
          onGiris={(kullanici, bulutMu, bulutAyrinti) => {
            setAktifKullanici(kullanici);
            // OTURUM DÜŞTÜ İŞARETİ SIFIRLANIYOR (24 Eylül, v1.443.0 — kullanıcının telefonunda:
            // Supabase "Last sign in" giriş yapıldığını gösteriyor ama kırmızı "Bulut oturumunuz
            // kapandı" şeridi ekranda duruyordu). `oturumDustu` yalnız BulutGirisEkrani yolunda
            // temizleniyordu; normal giriş ekranından bulutla girilince işaret asılı kalıyor ve
            // kullanıcı giriş yaptığı hâlde "hâlâ kapalı" diye okuyordu.
            // YEREL girişte işaret DURUYOR: bulut oturumu gerçekten yok, uyarı doğru.
            if (bulutMu) {
              setOturumDustu(false);
              // BEKLEYENLER KENDİLİĞİNDEN GÖNDERİLİYOR (24 Eylül, v1.443.0): şerit yalnız
              // `oturumDustu`dan değil, BEKLEYEN KAYDIN eski 401 hatasından da çiziliyor. Giriş
              // yapıldıktan sonra kayıt gönderilmedikçe uyarı ekranda kalıyor ve kullanıcı
              // "giriş yaptım ama hâlâ kapalı" diye okuyordu. Şeridin metni zaten bunu vaat
              // ediyor: "Yeniden giriş yapınca gönderilir."
              setTimeout(() => { try { yenidenGonderRef.current(true); } catch (e) { /* sessiz */ } }, 400);
            }
            oturumSakla(kullanici, bulutMu);
            setBulutKimligi(!!bulutMu);
            setBulutGirisAyrinti(bulutMu ? null : (bulutAyrinti || null));
            setBulutAyrintiAcik(!bulutMu);
            gunlukKullaniciAyarla(kullanici);
            gunlukYaz("Giriş yaptı", "oturum", {
              rol: kullanici.rol, kimlik: bulutMu ? "bulut" : "yerel",
              ...(bulutAyrinti ? { bulutEposta: bulutAyrinti.eposta, bulutSebep: bulutAyrinti.sebep } : {}),
            });
          }}
          showToast={showToast}
        />
      );
    }
  }

  return (
    <div
      style={{
        // TEMA KABUĞU (kullanıcı, 21 Eylül: "tema olmadı mı?"). Token CSS yüklüydü ama bu
        // kapsayıcı kendi fontunu (Inter) ve yeşil gradyanını basıp temayı EZİYORDU — görünen
        // tek fark birkaç düğmeydi. Font ve zemin artık standarttan: Archivo, --erp-page.
        // Gradyan efekti kaldırıldı; standart "panel her zaman zeminden açık, gölge yok" diyor.
        fontFamily: "var(--erp-font)",
        background: "var(--erp-page)",
        // `fixed`: gradyan sayfayla birlikte KAYMIYOR, ekrana sabitleniyor. Akıp gitseydi uzun
        // sayfalarda aşağı inildikçe zemin tek renge dönerdi — efekt yalnız sayfa başında
        // görünür, aşağısı düz kalırdı.
        backgroundAttachment: "fixed",
        minHeight: "100vh",
        color: "var(--erp-text)",
        display: "flex",
        // Şerit `absolute` olduğu için akıştan çıkıyor; sayfanın en üstündeki içerik onun altında
        // kalmasın diye boşluk yine gerekli. Fark şu: bu boşluk SAYFANIN BAŞINDA, ekranın değil —
        // aşağı kaydırıldığında şerit de boşluk da yukarıda kalıyor.
        paddingTop: PENCERE_SERIT_YUKSEKLIGI,
      }}
    >
      {/* İKON SPRITE (ERP standardı 2. adım): body açılışında bir kez; her yerde
          <svg><use href="#i-plus"/></svg> ile kullanılır. */}
      <div dangerouslySetInnerHTML={{ __html: ERP_ICONS_SVG }} aria-hidden="true" />
      <style>{`
        /* ---- TASARIM TOKENLARI (ERP standardı, 20 Eylül) ----
           Kullanıcı: "tasarımı ortak yapmamız lazım." 3.625 renk kullanımı, 119 farklı ton
           vardı; en sık 16'sı burada tek kaynakta. Kullanıcının erp-tokens.css'i gelince
           aynı isimlerle bu satırların ÜZERİNE yazar — kod değişmez, tema değişir. */
        ${erpTokenCss()}
        * { box-sizing: border-box; }
        input, select, button, textarea { font-family: inherit; }
        input:focus-visible, select:focus-visible, button:focus-visible {
          outline: 2px solid var(--modul-renk, #E1611F); outline-offset: 1px;
        }
        ::placeholder { color: var(--erp-text-3); }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        /* ---- BUTON DİLİ ----
           Üç anlam, üç görünüm. Renk burada süs değil, İŞLEVİN KENDİSİ: kullanıcı butonu okumadan,
           sadece rengine bakarak ne olacağını kestirebilmeli.
             • btn-primary  : modülün kendi rengi — "asıl eylem" (ekle, oluştur, uygula)
             • btn-save     : yeşil — "kaydet/onayla", geri alınabilir ve güvenli
             • btn-danger   : kiremit — "sil", geri alınamaz
           Silme butonu VARSAYILAN OLARAK dolu değil, çerçeveli: ekranda onlarca silme ikonu varken
           hepsi dolu kırmızı olsaydı ekran bir uyarı tablosuna dönerdi. Tehlike, üzerine gelindiğinde
           ve onay beklerken doluya geçerek belirir. */
        .btn-primary {
          background: var(--modul-renk, #221B14); color: #F2E8D8; border: none; border-radius: 6px;
          padding: 10px 16px; font-weight: 600; font-size: 14px; cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px;
          box-shadow: 0 1px 2px rgba(34,27,20,.18);
          transition: filter .15s, transform .08s, box-shadow .15s;
        }
        .btn-primary:hover { filter: brightness(1.12); box-shadow: 0 2px 6px rgba(34,27,20,.24); }
        .btn-primary:active { transform: translateY(1px); box-shadow: 0 1px 1px rgba(34,27,20,.2); }
        .btn-primary:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; filter: none; transform: none; }

        /* Kaydet: yeşil. btn-primary'nin YANINA yazılır (className="btn-primary btn-save") —
           böylece boyut/hizalama tek yerde tanımlı kalır, sadece renk değişir. */
        .btn-save { background: #4E6B4E; color: #F3F7F1; box-shadow: 0 1px 2px rgba(40,60,40,.28); }
        .btn-save:hover { background: #435C43; filter: none; box-shadow: 0 2px 7px rgba(40,60,40,.3); }
        .btn-save:disabled { background: #4E6B4E; }

        .btn-ghost {
          background: #fff; border: 1px solid #C9B99A; color: #4A3B28;
          border-radius: 6px; padding: 8px 12px; font-size: 13px; cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px;
          transition: border-color .15s, color .15s, background .15s;
        }
        .btn-ghost:hover { border-color: var(--modul-renk, #E1611F); color: var(--modul-renk, #E1611F); background: #FDF9F2; }
        .btn-ghost:disabled { opacity: .45; cursor: not-allowed; }

        .btn-danger {
          background: #fff; border: 1.5px solid #E0B4A4; color: #A63D2B;
          border-radius: 6px; padding: 6px 10px; font-size: 12px; font-weight: 600; cursor: pointer;
          display: inline-flex; align-items: center; gap: 5px;
          transition: background .15s, color .15s, border-color .15s;
        }
        .btn-danger:hover { background: #A63D2B; border-color: #A63D2B; color: #fff; }
        .btn-danger.onay { background: #A63D2B; border-color: #A63D2B; color: #fff; }

        /* Sadece ikon taşıyan kompakt buton — tablo satırlarındaki sil/düzenle için. */
        .btn-ikon {
          background: transparent; border: 1px solid transparent; border-radius: 5px;
          padding: 3px; cursor: pointer; color: #A6957A;
          display: inline-flex; align-items: center; justify-content: center;
          transition: background .15s, color .15s, border-color .15s;
        }
        .btn-ikon:hover { background: #F2E8D8; color: #4A3B28; border-color: #E4D8C0; }
        .btn-ikon.tehlike:hover { background: #A63D2B; color: #fff; border-color: #A63D2B; }
        table { border-collapse: collapse; width: 100%; }
        th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .06em;
             color: var(--erp-text-2); font-weight: 600; padding: 10px 12px; border-bottom: 1px solid var(--erp-line); }
        td { padding: 12px; border-bottom: 1px solid var(--erp-line-soft); font-size: 14px; }
        tr:hover td { background: var(--erp-hover); }
        /* MOBIL DUZEN SINIFLA DA ACILABILIR (kullanici, 15 Eylul: "alt cubuk mobilde gorunmuyor,
           tanimlarda yaptigim duzenleme cikmiyor"). SEBEP: kurallar yalniz 720px genislik esigine
           bagliydi; genis telefonlar/tabletler ve "masaustu site" kipi 720'nin ustunde kaliyor, bu
           yuzden alt cubuk hic cikmiyor ve mobil ayarlari uygulanmiyordu. Artik govdeye
           mobil-duzen sinifi konunca ayni kurallar genislikten bagimsiz gecerli; masaustu-duzen
           sinifi ise dar ekranda bile masaustu duzenini zorluyor.
           NOT: bu blok bir sablon dizesi icinde — yorumlarda ters tirnak KULLANILMAZ. */
        .ust-menu { display: flex; }
        body.mobil-duzen .sidebar, body.mobil-duzen .ust-menu { display: none; }
        body.mobil-duzen .mobile-tabs { display: flex !important; }
        body.mobil-duzen .main-area { padding: 16px !important; padding-bottom: 84px !important; max-width: 100% !important; }
        body.mobil-duzen .main-area.no-pad { padding: 0 0 84px !important; }
        body.mobil-duzen .tanimlar-grid { grid-template-columns: 1fr !important; }
        body.mobil-duzen table { font-size: 12px; }
        body.mobil-duzen th { padding: 6px 7px; font-size: 10px; }
        body.mobil-duzen td { padding: 6px 7px; font-size: 12px; }
        /* Masaustu kipinde sidebar'in KENDI display degeri korunuyor: "flex" diye zorlamak ic
           duzeni bozuyor ve dugmeler sifir genislige dusuyordu (15 Eylul). Yalnizca dar ekran
           media sorgusunun gizlemesini geri aliyoruz. */
        body.masaustu-duzen .sidebar { display: revert !important; }
        body.masaustu-duzen .ust-menu { display: flex !important; }
        /* UST MENU DAR EKRANDA (tablet dikey ~900px): once firma adi, sonra grup ikonlari gizlenir
           ki menu sagdaki ikonlarin altina girmesin. Kaydirma cozum degil: acilir listeler kirpilir. */
        @media (max-width: 1100px) { .ust-menu-unvan { display: none; } }
        /* SIKISIKLIK KADEMELERI (25 Eylul, kullanici tabletinde "Finans" ikonlarin altina girdi):
           genislik esigi yetmiyor, cihazin yazi boyutu ayari menuyu genisletiyor. Kademeyi olcum
           belirliyor (ustMenuSigdir): 1 grup ikonlari gizli, 2 yalniz ikon (yazilar gizli),
           3 ek olarak Anasayfa dugmesi gizli (logo zaten anasayfaya goturuyor). */
        .ust-menu.sik-1 .ust-menu-grup-ikon { display: none !important; }
        .ust-menu.sik-2 .ust-menu-etiket, .ust-menu.sik-3 .ust-menu-etiket { display: none; }
        .ust-menu.sik-3 [data-nav="Anasayfa"] { display: none !important; }
        body.masaustu-duzen .mobile-tabs { display: none !important; }

        /* MATRIS TABLO GORUNUMU (15 Eylul): baslik zemini, ince dikey cizgiler, zebra satir.
           Tek yerde duruyor ki butun matrisler ayni gorunsun (siparis, planlama, fis, tedarik). */
        .matris-tablo th { background: var(--erp-head); }
        .matris-tablo th, .matris-tablo td { border-right: 1px solid var(--erp-line-soft); }
        .matris-tablo th:last-child, .matris-tablo td:last-child { border-right: none; }
        .matris-tablo tbody tr:nth-child(even) > td { background: var(--erp-zebra); }
        .matris-tablo tbody tr:hover > td { background: var(--erp-hover); }

        @media (max-width: 720px) {
          .sidebar, .ust-menu { display: none; }
          .mobile-tabs { display: flex !important; }
          .main-area { padding: 16px !important; padding-bottom: 84px !important; max-width: 100% !important; }
          .main-area.no-pad { padding: 0 0 84px !important; }
          .tanimlar-grid { grid-template-columns: 1fr !important; }
          /* MATRİS DAR EKRANDA (kullanıcı, 14 Eylül: "matris her yerde olsun, ekrana sığmayacağı
             zaman küçülebilir veya alt satıra inebilir"). Tablolar satır kırmak yerine YATAY
             KAYDIRILIYOR ve bir tık küçülüyor: beden sütunlarını alt satıra indirmek matrisin
             okunma biçimini bozar (aynı beden aynı sütunda kalmalı). Kaydırma parmakla doğal. */
          table { font-size: 12px; }
          th { padding: 6px 7px; font-size: 10px; }
          td { padding: 6px 7px; font-size: 12px; }
          .matris-kap, .main-area table { max-width: 100%; }
          .matris-kap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        }
        @media print {
          body * { visibility: hidden; }
          #ekstre-yazdir-alani, #ekstre-yazdir-alani *,
          .yazdir-alani, .yazdir-alani * { visibility: visible; }
          #ekstre-yazdir-alani, .yazdir-alani { position: absolute; top: 0; left: 0; width: 100%; padding: 24px; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Mobil sekme çubuğu (üstte, sidebar gizliyken görünür) */}
      <nav
        className="mobile-tabs"
        style={{
          display: "none",
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          background: "var(--erp-topbar)",
          borderTop: "2px solid var(--erp-line)",
          padding: "8px 8px calc(8px + env(safe-area-inset-bottom))",
          gap: 4,
        }}
      >
        {/* ALT ÇUBUK KULLANICININ AYARINDAN (14 Eylül): Tanımlar > Mobil Görünüm'de sıralanan
            GÖRÜNÜR modüllerin ilk dördü. Ayar yoksa varsayılan sıra geçerli; on iki sekmeyi dar
            ekrana sığdırmaya çalışmak yerine dördü burada, gerisi "Tümü" listesinde. */}
        {(() => {
          const ikonlar = {
            anasayfa: <Home size={18} />, tanimlar: <Palette size={18} />, stok: <Boxes size={18} />,
            uretim: <Hammer size={18} />, cari: <Users size={18} />, siparis: <ClipboardList size={18} />,
            satinalma: <PackageCheck size={18} />, depo: <Layers size={18} />, paketleme: <PackageCheck size={18} />,
            gorevler: <MessageCircle size={18} />, planlama: <Compass size={18} />, fisler: <FileText size={18} />,
            muhasebe: <Wallet size={18} />,
          };
          return mobilGorunum.gorunur.slice(0, mobilGorunum.altCubukSayisi).map((k) => ({
            key: k, label: (MOBIL_MODULLER.find((m) => m.key === k) || {}).ad || k, icon: ikonlar[k] || <Home size={18} />,
          }));
        })().map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              padding: "6px 4px", borderRadius: "var(--erp-r-md)", border: "none",
              borderTop: "2px solid transparent",
              // SEÇİLİ ÖGE ZEMİNİ — palet değişikliğinde ATLANMIŞTI (kullanıcı ekran görüntüsüyle
              // bildirdi, 7 Eylül): koyu kahve kutu açık mor çubuğun içinde duruyor, üzerindeki
              // mor yazı okunmuyordu. Sol menüdeki `NavItem` ile aynı ton.
              // YENİ TASARIM (v1.449.0): üst menüyle aynı dil — açık kırmızı zemin, kırmızı ikon.
              background: tab === t.key ? "var(--erp-accent-tint)" : "transparent",
              color: tab === t.key ? "var(--erp-accent)" : "var(--erp-text-2)",
              fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}
          >
            {t.icon}
            <span style={{ color: tab === t.key ? "var(--erp-accent)" : "var(--erp-text-2)" }}>{t.label}</span>
          </button>
        ))}

        {/* TÜMÜ (kullanıcı, 15 Eylül: "masaüstü moda nasıl geçeceğiz"). Alt çubuğa sığmayan
            modüller ve DÜZEN ANAHTARI burada. Bu düğme olmadan telefonda ne diğer modüllere ne de
            masaüstü görünümüne dönmenin yolu vardı — "her zaman mobil" seçen kullanıcı kilitleniyordu. */}
        <button
          type="button"
          data-mobil-tumu="1"
          onClick={() => setMobilMenuAcik(true)}
          style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            border: "none", background: "transparent", color: "var(--erp-text-2)",
            fontSize: 11, fontWeight: 600, cursor: "pointer", padding: "4px 2px",
          }}
        >
          <Layers size={18} />
          <span>Tümü</span>
        </button>
      </nav>

      {/* TÜMÜ paneli: görünür bütün modüller + "Masaüstü görünümü" düğmesi. */}
      {mobilMenuAcik && (
        <div data-mobil-menu="1" onClick={() => setMobilMenuAcik(false)}
          style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(34,27,20,.45)", display: "flex", alignItems: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--erp-panel-2)", width: "100%", maxHeight: "80vh", overflowY: "auto",
              borderRadius: "14px 14px 0 0", padding: 14, paddingBottom: "calc(14px + env(safe-area-inset-bottom))" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <b style={{ fontSize: 15 }}>Tüm ekranlar</b>
              <button type="button" onClick={() => setMobilMenuAcik(false)}
                style={{ marginLeft: "auto", border: "none", background: "none", cursor: "pointer", color: "var(--erp-text-2)", display: "flex" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
              {mobilGorunum.gorunur.map((k) => (
                <button key={k} type="button" data-mobil-menu-modul={k}
                  onClick={() => { setTab(k); setMobilMenuAcik(false); }}
                  style={{ padding: "12px 10px", borderRadius: "var(--erp-r-lg)", border: `1px solid ${tab === k ? "var(--erp-text)" : "var(--erp-border)"}`,
                    background: tab === k ? "var(--erp-hover)" : "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                  {(MOBIL_MODULLER.find((m) => m.key === k) || {}).ad || k}
                </button>
              ))}
            </div>
            <button type="button" data-mobil-masaustu="1"
              onClick={() => { mobilDuzenKipiAyarla("kapali"); setMobilMenuAcik(false); showToast("Masaüstü görünümüne geçildi — geri dönmek için Tanımlar > Mobil Görünüm"); }}
              style={{ marginTop: 12, width: "100%", padding: "13px", borderRadius: "var(--erp-r-lg)", border: "1px solid #6B4E8A",
                background: "#6B4E8A1A", color: "var(--erp-purple)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Masaüstü görünümüne geç
            </button>
          </div>
        </div>
      )}

      {/* ---- ÜST MENÜ (25 Eylül, v1.449.0) ----
          Kullanıcı: "Tasarımımız çok eski… siyah kolon hoş değil, güncel tasarım lazım." Üç yön
          gösterildi, seçim "C'nin yerleşimi, A'nın renkleri": YAN KOLON YOK. Modüller üstte yatay
          menüde, gruplar açılır liste; açık sekmeler hemen altındaki şeritte. Tablette ekranın
          tamamı içeriğe kalıyor (yan kolon genişliğin dörtte birini yiyordu).

          Menü grupları ve yetki koşulları eski yan menüyle AYNI (17 Eylül kararları): Anasayfa ve
          Planlama grupsuz; Depo, Üretim, Siparişler, Finans açılır. Sohbet, Günlük, Onay ve
          Tanımlar sağda ikon; kullanıcı, sürüm ve çıkış kullanıcı menüsünde.

          AÇILIR LİSTE İÇERİĞİ KAPALIYKEN DE DOM'DA (display:none): modül düğmeleri `data-nav` ile
          her an bulunabiliyor (testler ve klavye kısayolları aynı düğmeye basıyor).

          PANEL kullanıcısında hiç çizilmiyor: menü yoksa yanlış ekrana gidilemez. Mobilde de
          gizli (CSS): orada alt sekme çubuğu var. */}
      {!panelKullanicisi && (() => {
        const grupAc = (ad) => setAcikUstMenu((o) => (o === ad ? null : ad));
        const git = (anahtar) => { setTab(anahtar); setAcikUstMenu(null); };
        const benId = aktifKullanici ? aktifKullanici.id : null;
        // ROZET = açık görevlerim + okunmamış mesajlar (eski yan menüdeki hesap, aynen).
        const sohbetRozeti = (() => {
          if (!benId) return 0;
          const gorevSayisi = acikGorevSayisi(gorevler, benId);
          const mesajSayisi = [...new Set((mesajlar || []).map((m) => m.kanal))]
            .filter((k) => k === "ekip" || String(k).split("|").includes(benId))
            .reduce((t, k) => t + okunmamisSayisi(mesajlar, k, (mesajOkumalari || {})[k], benId), 0);
          return gorevSayisi + mesajSayisi;
        })();
        const ustDugme = (etkin) => ({
          height: 36, display: "flex", alignItems: "center", gap: 5, padding: "0 11px", border: "none",
          borderRadius: "var(--erp-r-md)", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
          fontSize: 13.5, fontWeight: etkin ? 700 : 600,
          background: etkin ? "var(--erp-accent-tint)" : "transparent",
          color: etkin ? "var(--erp-accent)" : "var(--erp-text-2)",
        });
        const ikonDugme = { width: 38, height: 38, position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", borderRadius: "var(--erp-r-md)", background: "transparent", cursor: "pointer", color: "var(--erp-text-2)", flexShrink: 0 };
        const rozetStili = { position: "absolute", top: 2, right: 2, minWidth: 16, height: 16, padding: "0 4px", borderRadius: "var(--erp-r-pill)",
          background: "var(--erp-accent)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" };
        const Grup = ({ ad, ikon, sekmeler, children }) => {
          const icindeAktif = sekmeler.includes(tab);
          const acik = acikUstMenu === ad;
          return (
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button type="button" data-nav-grup={ad} aria-label={`${ad} menüsü`} aria-expanded={acik}
                onClick={() => grupAc(ad)} style={ustDugme(icindeAktif)}>
                <span className="ust-menu-grup-ikon" style={{ display: "flex" }}>{ikon}</span><span className="ust-menu-etiket">{ad}</span>{acik ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              <div data-ust-menu-liste={ad} style={{
                display: acik ? "flex" : "none", flexDirection: "column", gap: 2, position: "absolute", top: 42, left: 0, zIndex: 20,
                minWidth: 200, padding: 6, background: "var(--erp-panel)", border: "1px solid var(--erp-line)",
                borderRadius: "var(--erp-r-lg)", boxShadow: "0 12px 32px rgba(16, 24, 40, 0.12)",
              }}>
                {children}
              </div>
            </div>
          );
        };
        const oge = (anahtar, label, icon) => (
          <NavItem icon={icon} label={label} active={tab === anahtar} onClick={() => git(anahtar)} renk={MODUL_RENK[anahtar]} />
        );
        return (
          <header className="ust-menu" ref={ustMenuRef} style={{
            // `display` burada YOK, CSS'te (.ust-menu): satır içi stil mobilde gizleyen kuralı ezerdi.
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 510, height: UST_MENU_YUKSEKLIGI,
            alignItems: "center", gap: 2, padding: "0 12px",
            background: "var(--erp-topbar)", borderBottom: "1px solid var(--erp-line-soft)",
          }}>
            {/* Açık liste varken dışarı tıklamak kapatır (sayfanın geri kalanı tıklamayı almaz). */}
            {acikUstMenu && (
              <div onClick={() => setAcikUstMenu(null)} style={{ position: "fixed", inset: 0, zIndex: 1 }} aria-hidden="true" />
            )}
            <button type="button" onClick={() => git("anasayfa")} title="Anasayfa"
              style={{ display: "flex", alignItems: "center", gap: 9, marginRight: 10, padding: 0, border: "none", background: "none", cursor: "pointer", flexShrink: 0 }}>
              {(tanimlar.firmaBilgileri || {}).logo ? (
                <img src={tanimlar.firmaBilgileri.logo} alt="Logo" style={{ width: 32, height: 32, objectFit: "contain", borderRadius: "var(--erp-r-md)", background: "#fff" }} />
              ) : (
                <span style={{ width: 32, height: 32, borderRadius: "var(--erp-r-md)", background: "var(--erp-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Hammer size={17} color="#fff" />
                </span>
              )}
              <span className="ust-menu-unvan" style={{ fontWeight: 800, fontSize: 15, color: "var(--erp-text)", letterSpacing: "-0.01em" }}>
                {(tanimlar.firmaBilgileri || {}).unvan || "Atölye ERP"}
              </span>
            </button>
            <div ref={ustMenuNavRef} style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, minWidth: 0, position: "relative", zIndex: 2 }}>
              <button type="button" data-nav="Anasayfa" title="Anasayfa" onClick={() => git("anasayfa")} style={ustDugme(tab === "anasayfa")}>
                <span className="ust-menu-grup-ikon" style={{ display: "flex" }}><Home size={15} /></span><span className="ust-menu-etiket">Anasayfa</span>
              </button>
              <Grup ad="Depo" ikon={<Layers size={15} />} sekmeler={["stok", "depo", "paketleme"]}>
                {oge("stok", "Stok", <Boxes size={16} />)}
                {oge("depo", "Depo", <Layers size={16} />)}
                {oge("paketleme", "Paketleme", <PackageCheck size={16} />)}
              </Grup>
              <Grup ad="Üretim" ikon={<Hammer size={15} />} sekmeler={["uretim", "modelhane"]}>
                {kullaniciYetkisiVar("uretim", "goruntuleme") && oge("uretim", "Üretim", <Hammer size={16} />)}
                {kullaniciYetkisiVar("stok", "goruntuleme") && oge("modelhane", "Modelhane", <Palette size={16} />)}
              </Grup>
              {/* PLANLAMA GRUPSUZ (kullanıcı, 17 Eylül: "planlama başlı başına sekme olsun"). */}
              <button type="button" data-nav="Planlama" title="Planlama" onClick={() => git("planlama")} style={ustDugme(tab === "planlama")}>
                <span className="ust-menu-grup-ikon" style={{ display: "flex" }}><Compass size={15} /></span><span className="ust-menu-etiket">Planlama</span>
              </button>
              <Grup ad="Siparişler" ikon={<ClipboardList size={15} />} sekmeler={["siparis", "satinalma"]}>
                {oge("siparis", "Sipariş", <ClipboardList size={16} />)}
                {oge("satinalma", "Alış Siparişi", <PackageCheck size={16} />)}
              </Grup>
              <Grup ad="Finans" ikon={<Wallet size={15} />} sekmeler={["muhasebe", "fisler", "cari", "gelirgider"]}>
                {kullaniciYetkisiVar("cari", "goruntuleme") && oge("cari", "Cari", <Users size={16} />)}
                {kullaniciYetkisiVar("muhasebe", "goruntuleme") && oge("muhasebe", "Muhasebe", <Wallet size={16} />)}
                {/* GELİR / GİDER (20 Eylül): her gün kullanılan bir defter, finansın içinde. */}
                {kullaniciYetkisiVar("muhasebe", "goruntuleme") && oge("gelirgider", "Gelir / Gider", <FileText size={16} />)}
                {kullaniciYetkisiVar("fisler", "goruntuleme") && oge("fisler", "Fişler", <FileText size={16} />)}
              </Grup>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2, position: "relative", zIndex: 2 }}>
              {/* SOHBET: her an lazım, ikon + rozet. */}
              <button type="button" data-nav="Sohbet" aria-label="Sohbet" title="Sohbet" onClick={() => git("gorevler")}
                style={{ ...ikonDugme, ...(tab === "gorevler" ? { background: "var(--erp-accent-tint)", color: "var(--erp-accent)" } : {}) }}>
                <MessageCircle size={18} />
                {sohbetRozeti > 0 && <span className="mono" data-nav-rozet={sohbetRozeti} style={rozetStili}>{sohbetRozeti}</span>}
              </button>
              {kullaniciYetkisiVar("tanimlar", "goruntuleme") && (
                <button type="button" data-nav="Günlük" aria-label="Günlük" title="Günlük" onClick={() => git("gunluk")}
                  style={{ ...ikonDugme, ...(tab === "gunluk" ? { background: "var(--erp-accent-tint)", color: "var(--erp-accent)" } : {}) }}>
                  <ScrollText size={18} />
                </button>
              )}
              {aktifKullanici && aktifKullanici.rol === "Yönetici" && (
                <button type="button" aria-label="Onay Bekleyenler" title="Onay Bekleyenler" onClick={() => setOnayPaneliAcik(true)}
                  style={{ ...ikonDugme, color: bekleyenOnaylar.length > 0 ? "var(--erp-wait)" : "var(--erp-text-2)" }}>
                  <AlertTriangle size={18} />
                  {bekleyenOnaylar.length > 0 && <span className="mono" style={{ ...rozetStili, background: "var(--erp-wait)" }}>{bekleyenOnaylar.length}</span>}
                </button>
              )}
              {kullaniciYetkisiVar("tanimlar", "goruntuleme") && (
                <button type="button" aria-label="Tanımlar / Ayarlar" title="Tanımlar / Ayarlar" onClick={() => git("tanimlar")}
                  style={{ ...ikonDugme, ...(tab === "tanimlar" ? { background: "var(--erp-accent-tint)", color: "var(--erp-accent)" } : {}) }}>
                  <Settings size={18} />
                </button>
              )}
              {/* KULLANICI MENÜSÜ: ad, rol, sürüm (hata bildirirken hangi paket), çıkış. */}
              <div style={{ position: "relative", marginLeft: 4 }}>
                <button type="button" aria-label="Kullanıcı menüsü" title={aktifKullanici ? aktifKullanici.ad : "Kullanıcı"}
                  onClick={() => grupAc("kullanici")}
                  style={{ width: 34, height: 34, border: "none", borderRadius: "var(--erp-r-pill)", cursor: "pointer",
                    background: "var(--erp-text)", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                  {((aktifKullanici && aktifKullanici.ad) || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toLocaleUpperCase("tr-TR")}
                </button>
                <div style={{
                  display: acikUstMenu === "kullanici" ? "flex" : "none", flexDirection: "column", gap: 8, position: "absolute", top: 42, right: 0, zIndex: 20,
                  width: 250, padding: 14, background: "var(--erp-panel)", border: "1px solid var(--erp-line)",
                  borderRadius: "var(--erp-r-lg)", boxShadow: "0 12px 32px rgba(16, 24, 40, 0.12)",
                }}>
                  {aktifKullanici && (
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{aktifKullanici.ad}</div>
                      <div style={{ fontSize: 12, color: "var(--erp-text-2)" }}>{aktifKullanici.rol}</div>
                    </div>
                  )}
                  {!girisSistemiAktif && (
                    <div style={{ fontSize: 11, color: "var(--erp-text-2)", fontStyle: "italic" }}>Test modu — kullanıcı girişi pasif</div>
                  )}
                  <div style={{ fontSize: 11, color: "var(--erp-text-3)", lineHeight: 1.5 }}>
                    Veriler tüm kullanıcılar arasında paylaşılır. Ekip üyeleri aynı liste ve stokları görür.
                  </div>
                  {/* SÜRÜM — hata bildirilirken hangi paketin kullanıldığı bilinmeli. */}
                  <div className="mono" title={`${SURUM_NOTU}\n${SURUM_TARIHI}`} style={{ fontSize: 11, color: "var(--erp-text-3)" }}>
                    v{SURUM} · {SURUM_TARIHI}
                  </div>
                  {aktifKullanici && girisSistemiAktif && (
                    <button type="button" onClick={() => { setAcikUstMenu(null); kullaniciCikisYap(); }} title="Çıkış Yap"
                      style={{ display: "flex", alignItems: "center", gap: 8, height: 36, padding: "0 10px", border: "1px solid var(--erp-line)",
                        borderRadius: "var(--erp-r-md)", background: "var(--erp-panel)", color: "var(--erp-text)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      <LogOut size={15} /> Çıkış yap
                    </button>
                  )}
                </div>
              </div>
            </div>
          </header>
        );
      })()}

      {/* Content */}
      <main
        className={`main-area${tab === "anasayfa" ? " no-pad" : ""}`}
        style={{
          // GENİŞLİK SINIRI KALDIRILDI.
          //
          // 1100px, uzun metin okumak için makul bir ölçüdür; ama bu uygulama metin okutmuyor,
          // TABLO gösteriyor: 40 bedenlik reçete matrisi, stok durumu, sipariş kalemleri.
          // Sınır yüzünden tablolar yatay kaydırmaya düşüyor ve ekranın sağı boş kalıyordu.
          //
          // Üst sınır yine de var (1800px): çok geniş ekranlarda satırlar okunamayacak kadar
          // uzamasın diye.
          flex: 1, padding: tab === "anasayfa" ? 0 : "14px 32px 28px", maxWidth: tab === "anasayfa" ? "none" : 1800,
          minWidth: 0,
          "--modul-renk": MODUL_RENK[tab],
        }}
      >
        {/* BEKLEYEN YAZMA ŞERİDİ (15 Eylül): buluta gidememiş tablolar. Kapatılamaz — kapanması
            için gönderilmesi gerekir; gizlemek kullanıcıyı tekrar ikiye bölünmüş veriye götürür. */}
        {/* OTURUM DÜŞTÜ ŞERİDİ (21 Eylül): jeton yenilenemedi ya da bir yazma anonim gidip
            reddedildi. Veri bu cihazda duruyor; tek yapılacak yeniden giriş — sonra bekleyen
            kayıtlar "Yeniden dene" ile ya da kendiliğinden gönderilir. */}
        {(oturumDustu || Object.values(bekleyenYazmalar).some((v) => v && /42501|permission denied|yetkisi yok/i.test(String(v.hata || ""))
          && /anon|giriş yap/i.test(String(v.hata || "")))) && (
          <div data-oturum-dustu="1" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
            background: "var(--erp-void-tint)", border: "1px solid var(--erp-void)", borderRadius: "var(--erp-r-md)",
            padding: "8px 12px", marginBottom: 8, fontSize: 13, color: "var(--erp-void)" }}>
            <AlertTriangle size={16} />
            <span style={{ flex: "1 1 260px" }}>
              <b>Bulut oturumunuz kapandı.</b> Yaptığınız kayıtlar bu cihazda duruyor ama buluta gitmiyor.
              Yeniden giriş yapınca gönderilir.
            </span>
            <button type="button" className="btn-primary" data-yeniden-giris="1"
              onClick={() => setBulutGirisGerekli({ sebep: "oturum-dustu" })}
              style={{ padding: "6px 14px", fontSize: 13 }}>
              Yeniden giriş yap
            </button>
          </div>
        )}
        {Object.keys(bekleyenYazmalar).length > 0 && (
          <div data-bekleyen-yazma={Object.keys(bekleyenYazmalar).length}
            style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8, background: "var(--erp-orange-bg)",
              border: "1.5px solid #E1611F", borderRadius: "var(--erp-r-md)", padding: "7px 12px", fontSize: 12, color: "#8A3F1A" }}>
            <b>Buluta gönderilemeyen kayıt var:</b>
            {/* TIKLANABİLİR ÇİPLER (kullanıcı, 19 Eylül: "buluta gönderilmeyenlere detay versin,
                'bu stok' veya 'bu fiş' diye, üzerine tıklayınca"). Tablo adı veritabanının dili;
                kullanıcı "urunler" yazısından hangi işinin havada kaldığını anlamıyordu. Çip artık
                insan dilinde yazıyor, tıklanınca ayrıntı açılıyor. */}
            <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(bekleyenYazmalar).map(([k, v]) => {
                const bilgi = tabloAciklamasi(v.tablo);
                const acik = bekleyenAcikAnahtar === k;
                return (
                  <button key={k} type="button" data-bekleyen-cip={v.tablo}
                    onClick={() => setBekleyenAcikAnahtar(acik ? null : k)}
                    title="Ayrıntı için dokunun"
                    style={{ padding: "3px 10px", borderRadius: "var(--erp-r-pill)", fontSize: 11, fontWeight: 700, cursor: "pointer",
                      border: `1px solid ${acik ? "#8A3F1A" : "var(--erp-orange)"}`,
                      background: acik ? "#8A3F1A14" : "#fff", color: "#8A3F1A" }}>
                    {bilgi.ad}{v.deneme > 1 ? ` (${v.deneme}×)` : ""}
                  </button>
                );
              })}
            </span>
            <span style={{ color: "var(--erp-warn)" }}>Bu cihazdaki veri güncel; diğer cihazlar eksik görür, kapatmadan önce gönderin.</span>
            <button type="button" className="btn-primary" data-bekleyen-gonder="1" style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 11 }}
              onClick={() => bekleyenleriYenidenGonder(false)}>Yeniden dene</button>
            <button type="button" className="btn-ghost" data-bekleyen-hata="1" style={{ padding: "4px 8px", fontSize: 11 }}
              title="Son hata mesajı"
              onClick={() => hataGoster("Buluta yazılamadı", Object.entries(bekleyenYazmalar).map(([k, v]) => `${v.tablo} (${k})\n${v.zaman}\n${v.hata}`).join("\n\n"))}>
              Hata
            </button>
            {/* AYRINTI PANELİ — seçilen kayıt için: ne olduğu, kaç denendiği, ne zaman ve hata. */}
            {bekleyenAcikAnahtar && bekleyenYazmalar[bekleyenAcikAnahtar] && (() => {
              const v = bekleyenYazmalar[bekleyenAcikAnahtar];
              const bilgi = tabloAciklamasi(v.tablo);
              return (
                <div data-bekleyen-ayrinti={v.tablo} style={{ flexBasis: "100%", background: "#fff", border: "1px solid #E1611F",
                  borderRadius: "var(--erp-r-md)", padding: "8px 10px", marginTop: 4, fontSize: 12, color: "var(--erp-text)", lineHeight: 1.5 }}>
                  <b>{bilgi.ad}</b> — {bilgi.ayrinti}
                  <div className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)", marginTop: 4 }}>
                    {v.deneme} deneme · son: {v.zaman ? tarihYaz(v.zaman) : "—"}
                  </div>
                  {v.hata && bulutHatasiAciklamasi(v.hata) && (
                    <div data-bulut-hata-aciklama="1" style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)", marginTop: 4 }}>
                      {bulutHatasiAciklamasi(v.hata)}
                    </div>
                  )}
                  {v.hata && (
                    <div className="mono" style={{ fontSize: bulutHatasiAciklamasi(v.hata) ? 9 : 11, color: "var(--erp-danger)", marginTop: 4, wordBreak: "break-word" }}>
                      {v.hata}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginTop: 4 }}>
                    Bu cihazdaki kayıt güncel. Gönderilene kadar diğer cihazlar bu veriyi eksik görür.
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        {/* GÜNCELLEME ŞERİDİ HER EKRANDA: önce modül başlığının yanındaydı ve ANASAYFADA
            görünmüyordu (başlık bloğu yalnız diğer sekmelerde çiziliyor) — güncellemeyi en çok
            anasayfada duran kişinin görmesi gerekiyor (14 Eylül, senaryoda yakalandı). */}
        {/* GÜNCELLEME ŞERİDİ: yayınlanan sürüm bizimkinden yeniyse. Tıklanınca indirme
            bağlantısı açılır; kapatılırsa bu oturumda bir daha çıkmaz. */}
        {yayinSurum && !surumSeridiKapali && surumDahaYeniMi(yayinSurum.surum, SURUM) && (
          <span data-surum-seridi={yayinSurum.surum} style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", marginRight: 10,
            background: "#E7F0E3", border: "1.5px solid #4E6B4E", borderRadius: "var(--erp-r-pill)", padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "#3F5A33" }}>
            <ArrowRight size={13} style={{ transform: "rotate(90deg)" }} />
            Yeni sürüm v{yayinSurum.surum}
            {/* NE DEĞİŞTİ (23 Eylül, v1.421.0): not artık sürüm geçmişinden geliyor; kullanıcı görsün. */}
            {yayinSurum.not && (
              <span data-surum-notu="1" title={yayinSurum.not} style={{ fontWeight: 400, maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                — {yayinSurum.not}
              </span>
            )}
            {yayinSurum.url && (
              (() => {
                // Storage'dan (http/https) çalışıyorsak yeni sürüm AYNI SEKMEDE açılır — bu bir
                // "indirme" değil, güncellemedir. Dosyadan (file://) açıldıysa indirilir
                // (14 Eylül, bkz. storage-kurulum.md).
                const acilisYolu = typeof location !== "undefined" && /^https?:$/.test(location.protocol);
                return (
                  <a href={yayinSurum.url} data-surum-indir={acilisYolu ? "guncelle" : "indir"}
                    {...(acilisYolu ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                    title={yayinSurum.not || (acilisYolu ? "Yeni sürüme geç" : "Yeni sürümü indir")}
                    style={{ color: "var(--erp-primary-2)", fontWeight: 700 }}>
                    {acilisYolu ? "Güncelle" : "İndir"}
                  </a>
                );
              })()
            )}
            <button type="button" data-surum-kapat="1" onClick={() => setSurumSeridiKapali(true)} title="Şimdilik kapat"
              style={{ border: "none", background: "none", cursor: "pointer", color: "#3F5A33", display: "flex", padding: 0 }}><X size={11} /></button>
          </span>
        )}

        {tab !== "anasayfa" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
              {/* BAŞLIK 24 → 17: modül adı bir yön levhası, manşet değil. Zaten sekme şeridinde ve
                  sol menüde de yazıyor; üçüncü kez büyük puntoyla tekrar etmesi gereksiz. */}
              {/* YENİ TASARIM (v1.449.0): renkli nokta ve kesikli çizgi kalktı; başlık temanın
                  yazı tipinde, sade. Modül adı üst menüde ve sekmede de yazıyor — manşet değil. */}
              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: 0, color: "var(--erp-text)" }}>
                {TAB_TITLES[tab]}
              </h1>
              {/* VERİ KAYNAĞI ROZETİ — yalnızca bulut okunamadığında görünür.
                  Her şey yolundayken rozet göstermek gürültü olur; ama eski veriyle çalışıldığında
                  kullanıcının bunu BİLMESİ şart, yoksa farkında olmadan yanlış karar verir. */}
              {yazmaHatasi && (
                <button
                  type="button"
                  onClick={() => setYazmaHatasi(null)}
                  title={`Buluta yazılamadı — ${yazmaHatasi.tablo}\n${yazmaHatasi.mesaj}\n\nVeri bu bilgisayarda kayıtlı; bağlantı düzelince yeniden denenecek. Kapatmak için tıklayın.`}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", marginRight: 10,
                    background: "var(--erp-orange-bg)", border: "1.5px solid #E1611F", borderRadius: "var(--erp-r-pill)",
                    padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "var(--erp-warn)", cursor: "pointer",
                  }}
                >
                  <AlertTriangle size={13} />
                  Buluta yazılamadı: {yazmaHatasi.tablo}
                </button>
              )}
              {veriKaynagi && veriKaynagi.tur === "yerel" && veriKaynagi.hata && (
                <span
                  title={`Bulut okunamadı: ${veriKaynagi.hata}\nYerel kopyayla çalışıyorsunuz — başka bilgisayarlarda yapılan değişiklikler görünmüyor olabilir.`}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", marginRight: 10,
                    background: "var(--erp-orange-bg)", border: "1.5px solid #E1611F", borderRadius: "var(--erp-r-pill)",
                    padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "var(--erp-warn)", cursor: "help",
                  }}
                >
                  <AlertTriangle size={13} />
                  Çevrimdışı — yerel kopya
                </span>
              )}
              {girisSistemiAktif && aktifKullanici && !bulutKimligi && (
                // DÜĞME: dokununca sebep kartı açılıyor. Eskiden `title` ipucuydu — telefonda
                // üzerine gelinemediği için hiç okunamıyordu.
                <button
                  type="button"
                  data-yerel-giris="1"
                  onClick={() => setBulutAyrintiAcik(true)}
                  title={"Bu oturum YEREL şifreyle açıldı — bulut kimliği kullanılmadı.\n" +
                         "Veritabanı hâlâ anahtarı bilen herkese açık."}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", marginRight: 10,
                    background: "var(--erp-orange-bg)", border: "1.5px solid #E1611F", borderRadius: "var(--erp-r-pill)",
                    padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "var(--erp-warn)", cursor: "pointer",
                  }}
                >
                  <AlertTriangle size={13} />
                  Yerel giriş — bulut kimliği yok
                </button>
              )}
              {/* KUR ROZETİ BURADAN ALINDI → sol menünün en altına (kullanıcı, 7 Eylül).
                  Her modülün başlık satırında duruyordu ve genişliğinin yarısını yiyordu; oysa
                  kur MODÜLE AİT bir bilgi değil, uygulamanın geneline ait. Menüde tek yerde
                  durunca hangi ekranda olursanız olun aynı yerde. */}
            </div>
            {/* AÇIKLAMA SATIRI KALDIRILDI (kullanıcı: "başlıklar bilgiden fazla yer kaplıyor").
                "Tanımlı renk/bedenlerden seçerek ürün matrisi oluşturun…" gibi cümleler ilk gün
                işe yarar; her açılışta iki satır yer kaplamaları bilgiyi aşağı itiyordu.
                Ne olduğu başlığın kendisinde zaten yazılı. */}
            <div style={{ height: 14 }} />
          </>
        )}

        {/* ---- SÜRÜM ÇAKIŞMASI UYARISI ----
            Değişiklik buluta YAZILAMADI çünkü kaydı başka bir bilgisayar bu arada değiştirdi.
            Ekranda hâlâ kullanıcının yazdığı hâl duruyor; kaydedildiğini sanıp devam etmesi
            asıl tehlike. Bu yüzden uyarı kapatılamıyor ve tek çıkış yolu yenilemek. */}
        {surumCakismasi && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "var(--erp-orange-bg)", border: "2px solid #E1611F", borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 14 }}>
            <AlertTriangle size={18} color="var(--erp-warn)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--erp-warn)", marginBottom: 3 }}>
                Bu kaydı başka bir bilgisayar değiştirdi — değişikliğiniz kaydedilmedi
              </div>
              <div style={{ fontSize: 12, color: "#7A3B22", lineHeight: 1.6 }}>
                <b className="mono">{surumCakismasi.tablo}</b> tablosunda {surumCakismasi.adet} kayıt,
                siz düzenlerken başka bir bilgisayarda güncellenmiş. Onun yaptığı değişikliğin
                üzerine yazmamak için sizinki <b>buluta gönderilmedi</b>. Ekranda gördüğünüz hâl
                kaydedilmiş değildir — <b>sayfayı yenileyip</b> güncel hâli görün ve düzenlemenizi
                tekrar yapın.
              </div>
              {/* TEŞHİS: beklenen ve sunucudaki sürüm yan yana. Fark 1 ise değişikliği muhtemelen
                  bu bilgisayar yaptı (örtüşen ikinci yazma); daha büyükse gerçekten başkası
                  araya girmiştir. Bu satır olmadan ikisi ayırt edilemiyordu. */}
              {(surumCakismasi.teshis || []).length > 0 && (
                <div className="mono" style={{ fontSize: 10, color: "#7A3B22", marginTop: 6, opacity: 0.85 }}>
                  {surumCakismasi.teshis.slice(0, 5).map((t, i) => (
                    <div key={i}>
                      {String(t.id).slice(0, 18)} · beklenen {String(t.beklenen)} · sunucuda {String(t.sunucu)}
                      {t.sunucu != null && t.beklenen != null && t.sunucu - t.beklenen === 1 ? " (muhtemelen bu bilgisayar)" : ""}
                    </div>
                  ))}
                </div>
              )}
              <button
                className="btn-primary"
                style={{ marginTop: 8, padding: "6px 12px", fontSize: 12 }}
                onClick={() => window.location.reload()}
              >
                <RefreshCw size={12} /> Sayfayı yenile
              </button>
            </div>
          </div>
        )}

        {/* ---- VERİ KİLİDİ UYARISI ----
            Açılışta bir veya daha fazla kayıt okunamadıysa ekranda gördüğün veri EKSİKTİR. Bu
            uyarı gizlenemez ve kapatılamaz; yazma işlemleri kilitlidir. Kullanıcının bu durumda
            çalışmaya devam edip "kaydettim sandığı" bir işlem yapması, eksik hâli kalıcılaştırırdı. */}
        {veriKilidiSebep && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "var(--erp-orange-bg)", border: "2px solid #E1611F", borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 14 }}>
            <AlertTriangle size={18} color="var(--erp-warn)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--erp-warn)", marginBottom: 3 }}>
                Veriler eksik yüklendi — kayıt yapma geçici olarak kapatıldı
              </div>
              <div style={{ fontSize: 12, color: "#7A3B22", lineHeight: 1.6 }}>
                Şu kayıtlar okunamadı: <b className="mono">{veriKilidiSebep}</b>. Ekranda gördüğünüz liste
                eksik olabilir. Verinin üzerine eksik hâlinin yazılmaması için tüm kaydetme işlemleri
                durduruldu — <b>sayfayı yenileyin</b>. Sorun sürerse bu ekranı kapatmadan bildirin;
                kayıtlar diskte duruyor, silinmiş değil.
              </div>
              <button
                className="btn-primary"
                style={{ marginTop: 8, padding: "6px 12px", fontSize: 12 }}
                onClick={() => window.location.reload()}
              >
                <RefreshCw size={12} /> Sayfayı yenile
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--erp-text-2)", padding: 40 }}>
            <Loader2 size={18} className="mono" style={{ animation: "spin 1s linear infinite" }} />
            Yükleniyor…
          </div>
        ) : !storageOk ? (
          <div style={{ color: "var(--erp-warn)", padding: 28 }}>Depolama şu anda erişilemiyor. Sayfayı yenileyip tekrar deneyin.</div>
        ) : (
          <>
          {/* Her modül HER ZAMAN mount edilir, sadece aktif OLMAYANLAR "display:none" ile gizlenir.
              Böylece bir modülün İÇ STATE'İ (örn. Stok'ta açık bir ürün kartı, bir formun doldurulmuş
              hali) başka bir sekmeye geçilip geri dönüldüğünde KAYBOLMAZ — modül hiç unmount olmaz. */}
          <div style={{ display: tab === "anasayfa" ? undefined : "none" }}>
            <AnaSayfaModule
              gorevler={gorevler}
              aktifKullanici={aktifKullanici}
              onGoreveGit={() => setTab("gorevler")}
              stok={stok} uretim={uretim} tanimlar={tanimlar} cariler={cariler} siparisler={siparisler}
              muhasebe={muhasebe}
              uretim={uretim}
              stokRezervasyonlari={stokRezervasyonlari}
              onRezervasyonTemizle={rezervasyonTemizle}
              onNavigate={setTab}
              onGoToSiparis={sipariseGit}
              onGoToUretim={(id) => { setUretimHedefId(id || null); setTab("uretim"); }}
              onGoToUrun={(urunId) => uruneGit(urunId, null, { tab: "anasayfa", etiket: "Ana sayfaya dön" })}
              onGoToCari={() => setTab("cari")}
            />
          </div>
          <div style={{ display: tab === "tanimlar" ? undefined : "none" }}>
            <TanimlarModule
              fisDefteri={fisDefteri}
              onDefterdenYenidenKur={defterdenYenidenKur}
              onEksikHareketOnar={eksikHareketOnar}
              onKarsilananOnar={karsilananOnar}
              muhasebe={muhasebe}
              mobilDuzenKipi={mobilDuzenKipi}
              onMobilDuzenKipi={mobilDuzenKipiAyarla}
              mobilDuzenAktif={mobilDuzen}
              kullanimdakiOlculer={kullanimdakiOlculer}
              onTanimsizOlcuCevir={tanimsizOlcuCevir}
              yayinSurum={yayinSurum}
              onSurumYayinla={async (v) => {
                try { await yayinlananSurumuYaz(v); setYayinSurum(v); showToast(`Sürüm ${v.surum} yayınlandı — herkes açılışta görecek`); }
                catch (e) { showToast(`Yayınlanamadı: ${e && e.message}`); }
              }}
              onAktifKullaniciGuncelle={setAktifKullanici} onAcilisFisiKes={acilisFisiKes} tanimlar={tanimlar} onSave={saveTanimlar} showToast={showToast} onVeritabaniSifirla={veritabaniSifirla} supabaseBagli={supabaseAcikMi()} gocDurumu={gocDurumu} onSupabaseyeGoc={supabaseyeGoc} onDefterTopluOnar={defterTopluOnar} onHammaddeRenkAdDegistir={hammaddeRenkAdDegistir} onOlcuAdDegistir={olcuAdDegistir} stok={stok} cariler={cariler} siparisler={siparisler} aktifKullanici={aktifKullanici} MODULLER={MODULLER} MODUL_ADLARI={MODUL_ADLARI} onJsonYedekle={verileriJsonYedekle} onJsonGeriYukle={jsonDosyasindanGeriYukle} onExcelAktar={verileriExcelAktar} sonYedekTarihi={sonYedekTarihi} onSimdiYedekle={() => otomatikYedekAl(false)} onYedektenGeriYukle={yedektenGeriYukle} cop={cop} onCopGeriYukle={coptanGeriYukle} onCopKaliciSil={coptanKaliciSil} onCopBosalt={copuBosalt} />
          </div>
          {tab === "modelhane" && (
            <ModelhaneModule
              receteSablonlari={tanimlar.receteSablonlari || []}
              onReceteSablonuKaydet={receteSablonuKaydet}
              stok={stok}
              kurlar={muhasebe.kurlar || {}}
              onNumuneUret={numuneUret}
              modeller={modeller}
              onSave={saveModeller}
              onKoleksiyonaAl={modeliKoleksiyonaAl}
              onNumuneUretimi={numuneUretimiAc}
              showToast={showToast}
              kullaniciYetkisiVar={kullaniciYetkisiVar}
            />
          )}
          <div style={{ display: tab === "stok" ? undefined : "none" }}>
            <StokModule
              kurlar={muhasebe.kurlar || {}}
              onFiseGitNo={fiseGit}
              stokRezervasyonlari={stokRezervasyonlari}
              stokRezervasyonlari={stokRezervasyonlari}
              tumSiparisler={siparisler}
              hedefUrunId={stokHedefUrunId}
              hedefSekme={stokHedefSekme}
              onHedefTuketildi={() => { setStokHedefUrunId(null); setStokHedefSekme(null); }}
              donusHedefi={donusHedefi}
              onDonusYap={donusYap}
              items={stok}
              onSave={saveStok}
              showToast={showToast}
              tanimlar={tanimlar}
              onGoToTanimlar={() => setTab("tanimlar")}
              cariler={cariler}
              onCariHareket={addCariHareketFromStok}
              onGoToCari={() => setTab("cari")}
              onRemoveHareketGlobal={removeHareketEverywhere}
              siparisler={siparisler}
              uretim={uretim}
              onGoToSiparis={sipariseGit}
              onGoToUretim={(uretimId) => { setUretimHedefId(uretimId || null); setTab("uretim"); }}
              onYeniRenkKaydet={yeniRenkKaydet}
              onHizliCariEkle={hizliCariEkle}
              onYeniMalzemeTipiKaydet={yeniMalzemeTipiKaydet}
              onYeniOlcuKaydet={yeniOlcuKaydet}
              onReceteSablonuKaydet={receteSablonuKaydet}
              onYeniMamulTipiKaydet={yeniMamulTipiKaydet}
              onYeniOzelKodAlani={yeniOzelKodAlaniKaydet}
              onKombinasyonOlustur={kombinasyonOlusturGlobal}
              onAsortiOlustur={asortiOlustur}
              kullaniciYetkisiVar={kullaniciYetkisiVar}
              onayIste={onayIste}
              onCopaAt={copaAt}
              onPencereAc={pencereAc}
              aktifPencereId={aktifPencereId}
              onPencereKapat={pencereKapat}
              onPencereKucult={pencereKucult}
              // Şeritteki ürün sekmeleri — Stok modülü hangi kartları kurulu tutacağını buradan
              // okuyor (bkz. StokModule, "tek kaynak").
              acikUrunIdleri={acikUrunIdleri}
            />
          </div>
          <div style={{ display: tab === "uretim" ? undefined : "none" }}>
            <UretimModule
              panelKipi={panelEkranAyari && panelEkranAyari.tab === "uretim" ? panelEkranAyari.key : null}
              onPencereAc={pencereAc}
              aktifPencereId={aktifPencereId}
              onPencereKapat={pencereKapat}
              onPencereKucult={pencereKucult}
              acikUretimIdleri={acikUretimIdleri}
              onHurdaTelafi={hurdaTelafiUretimiAc}
              orders={uretim}
              onSave={saveUretim}
              showToast={showToast}
              stok={stok}
              tanimlar={tanimlar}
              onProsesTamamla={uretimProsesAtamaTeslimAl}
              onProsesVer={uretimProsesVer}
              onProsesVerGeriAl={uretimProsesVerGeriAl}
              onProsesTeslimGeriAl={uretimProsesAtamaTeslimGeriAl}
              onRemoveOrder={uretimSil}
              cariler={cariler}
              onGoToCari={() => setTab("cari")}
              siparisler={siparisler}
              onGoToSiparis={sipariseGit}
              hedefUretimId={uretimHedefId}
              onHedefTuketildi={() => setUretimHedefId(null)}
              onAsortiOlustur={asortiOlustur}
            />
          </div>
          <div style={{ display: tab === "cari" ? undefined : "none" }}>
            <CariModule
              onFiseGitNo={fiseGit}
              muhasebe={muhasebe}
              kurlar={muhasebe.kurlar}
              onMuhasebeHareketi={muhasebeyePesinIsle}
              cariler={cariler}
              onSave={saveCariler}
              // ÇEK KAYDI TEK YERE DÜŞSÜN: caride girilen çek Muhasebe > Çekler listesine de
              // yazılıyor. Aksi halde aynı çek iki ayrı yerde ayrı ayrı tutuluyordu — bu projede
              // "aynı bilgi iki yerde" kalıbı defalarca hataya döndü.
              onCekEkle={(cek) => saveMuhasebe({ ...muhasebe, cekler: [{ id: uid("cek"), durum: "Portföyde", ...cek }, ...(muhasebe.cekler || [])] })}
              showToast={showToast}
              onFisSil={yetimFisTemizle}
              siparisler={siparisler}
              stok={stok}
              onGoToSiparis={sipariseGit}
              firmaBilgileri={tanimlar.firmaBilgileri}
              tanimlarProsesler={tanimlar.prosesler || []}
              tanimlarAraProsesler={tanimlar.araProsesler || []}
              onCopaAt={copaAt}
              onStokFisiAc={stokFisiAc}
              tanimlarFiyatGruplari={tanimlar.fiyatGruplari || []}
              onPencereAc={pencereAc}
            />
          </div>
          <div style={{ display: tab === "paketleme" ? undefined : "none" }}>
            <PaketlemeModule
              koliler={koliler}
              stok={stok}
              siparisler={siparisler}
              cariler={cariler}
              uretim={uretim}
              asortiler={tanimlar.asortiler}
              onKoliEkle={koliEkle}
              onKoliEkleCoklu={koliEkleCoklu}
              onKolileriElleKapat={(idler, sebep) => {
                const zaman = new Date().toISOString();
                const kim = (aktifKullanici && aktifKullanici.ad) || "";
                saveKoliler((koliler || []).map((k) => (idler.includes(k.id)
                  ? { ...k, durum: "Sevk edildi", sevkFisNo: "", sevkZamani: zaman, elleKapatildi: { sebep, kim, zaman } }
                  : k)));
                gunlukYaz(`${idler.length} koli elle kapatıldı: ${sebep}`, "koli", { idler, kim });
                showToast(`${idler.length} koli "Sevk edildi" olarak kapatıldı (stok değişmedi)`);
              }}
              onKoliSil={koliSil}
              onKodlariAta={kodlariTamamla}
              tanimlar={tanimlar}
              showToast={showToast}
            />
          </div>
          <div style={{ display: tab === "gorevler" ? undefined : "none" }}>
            {/* SOHBET + GÖREVLER TEK EKRAN (kullanıcı, 14 Eylül: "sohbette olsun, kullanıcıyla aynı
                bu ekrandan devam etsin; sohbete görev ekleme gibi hepsi sohbetin parçası olsun").
                Sohbet ana sekme; görev listesi (süzgeç, kontrol, yazışma) ikinci sekmede, aynı veri. */}
            <div style={{ display: "flex", gap: 4, marginBottom: 8, borderBottom: "1px solid var(--erp-line)", alignItems: "center" }}>
              {[{ k: "sohbet", ad: "Sohbet" }, { k: "liste", ad: `Görevler${aktifKullanici && acikGorevSayisi(gorevler, aktifKullanici.id) ? ` (${acikGorevSayisi(gorevler, aktifKullanici.id)})` : ""}` }].map((x) => (
                <button key={x.k} type="button" data-gorev-sekme={x.k} onClick={() => setGorevSekmesi(x.k)}
                  style={{ padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", background: "none", border: "none",
                    borderBottom: `3px solid ${gorevSekmesi === x.k ? "var(--erp-purple)" : "transparent"}`,
                    color: gorevSekmesi === x.k ? "var(--erp-purple)" : "var(--erp-text-3)" }}>
                  {x.ad}
                </button>
              ))}
            </div>
            <div style={{ display: gorevSekmesi === "sohbet" ? undefined : "none" }}>
              <SohbetModule
                aktifMi={tab === "gorevler" && gorevSekmesi === "sohbet"}
                mesajlar={mesajlar}
                gorevler={gorevler}
                kullanicilar={(tanimlar.kullanicilar || [])}
                aktifKullanici={aktifKullanici}
                onMesajKaydet={saveMesajlar}
                onGorevKaydet={saveGorevler}
                okumalar={mesajOkumalari}
                onOkumaKaydet={okumaKaydet}
                showToast={showToast}
                siparisler={siparisler}
                uretim={uretim}
                stok={stok}
                onKaydaGit={(hedef) => {
                  if (!hedef) return;
                  if (hedef.tip === "siparis") sipariseGit(hedef.id);
                  else if (hedef.tip === "uretim") { setUretimHedefId(hedef.id); setTab("uretim"); }
                  else if (hedef.tip === "urun") uruneGit(hedef.id, null, { tab: "gorevler", etiket: "Sohbete dön" });
                }}
                onGoreveGit={(id) => { setGorevSekmesi("liste"); setHedefGorevId(id); }}
              />
            </div>
            <div style={{ display: gorevSekmesi === "liste" ? undefined : "none" }}>
            <GorevlerModule
              gorevler={gorevler}
              siparisler={siparisler}
              uretim={uretim}
              stok={stok}
              kullanicilar={(tanimlar.kullanicilar || [])}
              aktifKullanici={aktifKullanici}
              onKaydet={saveGorevler}
              showToast={showToast}
              hedefGorevId={hedefGorevId}
              onHedefTuketildi={() => setHedefGorevId(null)}
              onKaydaGit={(hedef) => {
                if (!hedef) return;
                if (hedef.tip === "siparis") sipariseGit(hedef.id);
                else if (hedef.tip === "uretim") { setUretimHedefId(hedef.id); setTab("uretim"); }
                else if (hedef.tip === "urun") uruneGit(hedef.id, null, { tab: "gorevler", etiket: "Görevlere dön" });
              }}
            />
            </div>
          </div>
          <div style={{ display: tab === "depo" ? undefined : "none" }}>
            <RezervasyonDeposu
              koliler={koliler}
              tanimlar={tanimlar}
              onFisAc={stokFisiAc}
              showToast={showToast}
              siparisler={siparisler}
              stok={stok}
              stokRezervasyonlari={stokRezervasyonlari}
              uretim={uretim}
              cariler={cariler}
              onGoToSiparis={sipariseGit}
              // GERİ DÖNÜŞ HEDEFİ VERİLİYOR. Ürün kartı kapanınca Stok ekranında bırakmak, kullanıcıyı
              // Depo'da baktığı satırı yeniden bulmaya zorluyordu. Sekmeler `display:none` ile
              // duruyor, yani Depo'nun kaydırma konumu ve açık satırları yerinde kalıyor.
              onGoToUrun={(id) => uruneGit(id, null, { tab: "depo", etiket: "Depoya dön" })}
              onSatinAlPlanla={hammaddeyiPlanla}
              onAlisFisi={alisFisiAc}
            />
          </div>
          <div style={{ display: tab === "siparis" ? undefined : "none" }}>
            <SiparisModule
              onSiparisGitGlobal={sipariseGit}
              mobilBolumAyari={mobilBolumCoz(tanimlar.mobilGorunum, "siparis")}
              onFiseGitNo={fiseGit}
              koliler={koliler}
              sabitTip="Satış"
              stokRezervasyonlari={stokRezervasyonlari}
              siparisler={siparisler}
              onSave={saveSiparisler}
              showToast={showToast}
              cariler={cariler}
              stok={stok}
              uretim={uretim}
              onGoToCari={() => setTab("cari")}
              onGoToUretim={(uretimId) => { setUretimHedefId(uretimId || null); setTab("uretim"); }}
              onGerceklestir={siparisGerceklestir}
              onSatisFisiAc={satisFisiAcSiparisten}
              onSilCascade={siparisSilCascade}
              onCopaAt={copaAt}
              onPlanlaUretim={planlaUretim}
              onPlanlaSatinAlma={planlaSatinAlma}
              onPlanlamaTemizle={planlamaTemizle}
              asortiler={tanimlar.asortiler || []}
              hedefSiparisId={siparisHedefId}
              onHedefTuketildi={() => setSiparisHedefId(null)}
              onAsortiOlustur={asortiOlustur}
              firmaBilgileri={tanimlar.firmaBilgileri}
              onPencereAc={pencereAc}
              aktifPencereId={aktifPencereId}
              onPencereKapat={pencereKapat}
              onPencereKucult={() => setAktifPencereId(null)}
              acikSiparisPencereleri={acikSiparisPencereleri}
              raporlar={tanimlar.raporlar || []}
              onRaporlarKaydet={raporlariKaydet}
              aktifKullanici={aktifKullanici}
              tanimlarProsesler={tanimlar.prosesler || []}
              onUruneGit={uruneGit}
              onYeniRenkKaydet={yeniRenkKaydet}
              onModelRengiVeRecete={modelRengiVeReceteEkle}
              tanimlarRenkler={tanimlar.renkler || []}
              tanimlarBedenler={tanimlar.bedenler || []}
              tanimlarBedenGruplari={tanimlar.bedenGruplari || []}
              tanimlarOzelKodAlanlari={tanimlar.ozelKodAlanlari || []}
              kurlar={muhasebe.kurlar || {}}
            />
          </div>
          {/* SATIN ALMA — aynı modül, alış tarafına sabitlenmiş. Ayrı bir bileşen yazmak,
              iki ekranın zamanla birbirinden ayrışmasına ve bir tarafta yapılan düzeltmenin
              diğerine taşınmamasına yol açardı. */}
          <div style={{ display: tab === "satinalma" ? undefined : "none" }}>
            <SiparisModule
              onSiparisGitGlobal={sipariseGit}
              mobilBolumAyari={mobilBolumCoz(tanimlar.mobilGorunum, "satinalma")}
              onFiseGitNo={fiseGit}
              koliler={koliler}
              sabitTip="Alış"
              stokRezervasyonlari={stokRezervasyonlari}
              siparisler={siparisler}
              onSave={saveSiparisler}
              showToast={showToast}
              cariler={cariler}
              stok={stok}
              uretim={uretim}
              onGoToCari={() => setTab("cari")}
              onGoToUretim={(uretimId) => { setUretimHedefId(uretimId || null); setTab("uretim"); }}
              onGerceklestir={siparisGerceklestir}
              onSatisFisiAc={satisFisiAcSiparisten}
              onSilCascade={siparisSilCascade}
              onCopaAt={copaAt}
              onPlanlaUretim={planlaUretim}
              onPlanlaSatinAlma={planlaSatinAlma}
              onPlanlamaTemizle={planlamaTemizle}
              asortiler={tanimlar.asortiler || []}
              hedefSiparisId={siparisHedefId}
              onHedefTuketildi={() => setSiparisHedefId(null)}
              onAsortiOlustur={asortiOlustur}
              firmaBilgileri={tanimlar.firmaBilgileri}
              onPencereAc={pencereAc}
              aktifPencereId={aktifPencereId}
              onPencereKapat={pencereKapat}
              onPencereKucult={() => setAktifPencereId(null)}
              acikSiparisPencereleri={acikSiparisPencereleri}
              raporlar={tanimlar.raporlar || []}
              onRaporlarKaydet={raporlariKaydet}
              aktifKullanici={aktifKullanici}
              tanimlarProsesler={tanimlar.prosesler || []}
              onUruneGit={uruneGit}
              onYeniRenkKaydet={yeniRenkKaydet}
              onModelRengiVeRecete={modelRengiVeReceteEkle}
              tanimlarRenkler={tanimlar.renkler || []}
              tanimlarBedenler={tanimlar.bedenler || []}
              tanimlarBedenGruplari={tanimlar.bedenGruplari || []}
              tanimlarOzelKodAlanlari={tanimlar.ozelKodAlanlari || []}
              kurlar={muhasebe.kurlar || {}}
            />
          </div>
          <div style={{ display: tab === "fisler" ? undefined : "none" }}>
            <FislerModule
              muhasebe={muhasebe}
              hedefFisNo={hedefFisNo}
              onHedefTuketildi={() => setHedefFisNo(null)}
              cariler={cariler}
              stok={stok}
              siparisler={siparisler}
              uretim={uretim}
              onGoToCari={() => setTab("cari")}
              onGoToSiparis={sipariseGit}
              onGoToUretim={(uretimId) => { setUretimHedefId(uretimId || null); setTab("uretim"); }}
              onYetimFisTemizle={yetimFisTemizle}
            />
          </div>
          {/* Menüyü gizlemek TEK BAŞINA yeterli değil (bkz. muhasebe): gövde de yetkiye bağlı.
              Günlük ayrıca `display:none` ile gizlenmiyor, HİÇ RENDER EDİLMİYOR — gizli bir
              sekmede duran veri, ağ sekmesini açan herkese görünür olurdu. */}
          {tab === "gunluk" && aktifKullanici && aktifKullanici.rol === "Yönetici" && (
            <GunlukPaneli showToast={showToast} />
          )}
          {/* GELİR / GİDER EKRANI (20 Eylül): sekme vardı ama ekran bağlı değildi — menüden
              tıklanınca boş sayfa açılıyordu. */}
          {tab === "gelirgider" && (
            !kullaniciYetkisiVar("muhasebe", "goruntuleme") ? (
              <EmptyState text="Gelir / Gider ekranını görüntüleme yetkiniz yok." />
            ) : (
              <GelirGiderEkrani
                stok={stok}
                tanimlar={tanimlar}
                onSave={saveTanimlar}
                muhasebe={muhasebe}
                cariler={cariler}
                showToast={showToast}
              />
            )
          )}

          <div style={{ display: tab === "muhasebe" ? undefined : "none" }}>
            {!kullaniciYetkisiVar("muhasebe", "goruntuleme") ? (
              <EmptyState text="Muhasebe modülünü görüntüleme yetkiniz yok. Erişim için yöneticinize başvurun." />
            ) : (
            <MuhasebeModule
              tanimlar={tanimlar}
              stok={stok}
              giderKartlari={tanimlar.giderKartlari || []}
              onCekIslem={cekIslemYap}
              onCekEkleIsle={cekEkleVeIsle}
              onCekHareketiyleSil={cekHareketiyleSil}
              cekGorselleri={cekGorselleri}
              onCekGorselKaydet={cekGorselKaydet}
              muhasebe={muhasebe}
              onSave={saveMuhasebe}
              onCopaAt={copaAt}
              kullaniciYetkisiVar={kullaniciYetkisiVar}
              onayIste={onayIste}
              onayliIslem={muhasebeOnayliIslem}
              onOnayliIslemBitti={() => setMuhasebeOnayliIslem(null)}
              showToast={showToast}
              cariler={cariler}
              onCarilerGuncelle={saveCariler}
            />
            )}
          </div>
          <div style={{ display: tab === "planlama" ? undefined : "none" }}>
            <PlanlamaModule
              siparisler={siparisler}
              stok={stok}
              uretim={uretim}
              cariler={cariler}
              asortiler={tanimlar.asortiler || []}
              onGoToSiparis={sipariseGit}
              // Ürün kimliği KULLANILIYOR: eskiden yalnızca sekme değiştiriliyordu, kullanıcı
              // tıkladığı ürünü Stok listesinde elle aramak zorunda kalıyordu.
              onGoToUrun={(urunId) => uruneGit(urunId, null, { tab: "planlama", etiket: "Planlamaya dön" })}
              onGoToUretim={(uretimId) => { setUretimHedefId(uretimId || null); setTab("uretim"); }}
              onPlanlaUretim={planlaUretim}
              onPlanlaSatinAlma={planlaSatinAlma}
              onPlanlaHammaddeSatinAlma={planlaHammaddeSatinAlma}
              onPlanlamaTemizle={planlamaTemizle}
              onAsortiOlustur={asortiOlustur}
            />
          </div>
          </>
        )}
      </main>

      {(() => {
        // NOT: fallback OLARAK "son pencere" seçilmiyor — aktifPencereId bilinçli olarak null yapıldıysa
        // (örn. "−" ile küçültüldüğünde) hiçbir pencere içeriği gösterilmez, SADECE sekme çubuğu kalır.
        // Kullanıcı bir sekmeye tıklayınca ilgili pencere tekrar (kaldığı yerden, hâlâ mount'lu değilse
        // yeniden oluşturularak) açılır.
        const aktifPencere = acikPencereler.find((p) => p.id === aktifPencereId) || null;
        return (
          <>
            <div
              style={{
                // ŞERİT HER ZAMAN EKRANDA (kullanıcı, 7 Eylül: "sol menü ve üst sekmeler HİÇ
                // KAYBOLMASIN!").
                //
                // Bir gün önce tersi istenmişti ("sekme bitene kadar kaysın") ve `absolute`
                // yapılmıştı; ama şerit kayınca sol menüyle birlikte ekranda hiçbir gezinme aracı
                // kalmadığı görüldü. Karar geri alındı: `fixed`, yani sayfa nereye kaydırılırsa
                // kaydırılsın tepede durur.
                //
                // Bedeli ekranın 40 pikseli; karşılığı her an gezinebilmek. Kullanıcı bu dengeyi
                // deneyerek seçti — iki hâli de gördü.
                // v1.449.0: şerit üst menünün ALTINDA (masaüstü); mobilde menü gizli, top 0.
                position: "fixed", top: "var(--ust-menu-h, 0px)", left: 0, right: 0, zIndex: 500,
                height: SEKME_SERIDI_YUKSEKLIGI, boxSizing: "border-box",
                // İKİ BÖLGE: solda kaydırılabilir sekmeler, sağda SABİT kur rozeti.
                // Kaydırma dış kapta olsaydı rozet de sekmelerle birlikte kayar, çok sekme
                // açıldığında ekrandan çıkardı — oysa kur her an görünmeli.
                display: "flex", alignItems: "center", gap: 8, padding: "0 10px",
                // `overflow: hidden` KALDIRILDI: kur rozetinin açılır paneli (elle giriş + kur
                // geçmişi) şeridin İÇİNDE `absolute` konumlu ve kırpılıyordu — panel açılıyor ama
                // görünmüyordu (kullanıcı bildirdi, 7 Eylül). Kaydırma zaten iç sarmalda.
                // Şerit sayfa zemininde; etkin sekme beyaz kart olarak öne çıkıyor.
                background: "var(--erp-page)", borderBottom: "1px solid var(--erp-line-soft)",
                boxShadow: "none",
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: 2,
                flex: 1, minWidth: 0, height: "100%",
                overflowX: "auto", overflowY: "hidden",
              }}>
              {/* AÇIK SAYFALAR — sol menüden açılan modüller. Pencerelerle AYNI şeritte, çünkü
                  kullanıcı için ikisi de "açık duran bir şey"; iki ayrı çubuk, ikisinin ne
                  farkı olduğunu sordururdu. Sayfalar solda, kayıt pencereleri sağda. */}
              {acikSekmeler.map((k) => {
                const bilgi = SEKME_BILGISI[k] || { ad: k };
                const aktifMi = tab === k && !aktifPencereId;
                return (
                  <div
                    key={`sayfa-${k}`}
                    onClick={() => { setTab(k); setAktifPencereId(null); }}
                    title={bilgi.ad}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: "var(--erp-r-md) var(--erp-r-md) 0 0",
                      // YENİ TASARIM (v1.449.0): pasif sekme zeminsiz, etkin sekme beyaz kart gibi.
                      background: aktifMi ? "var(--erp-panel)" : "transparent",
                      border: `1px solid ${aktifMi ? "var(--erp-line-soft)" : "transparent"}`, borderBottom: "none",
                      // AKTİF SEKMENİN YAZISI DA PALETTEN (kullanıcı, 7 Eylül: "turuncu yazılar iyi
                      // ama siyah çok sırıtıyor"). `#221B14` neredeyse siyahtı ve açık şeridin
                      // içinde tek başına kalıyordu. Menüdeki seçili öge yazısıyla aynı ton.
                      color: aktifMi ? "var(--erp-text)" : "var(--erp-text-2)",
                      fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                    }}
                  >
                    {bilgi.ad}
                    {/* Ana sayfanın kapatma düğmesi YOK: dönülecek bir yer hep kalmalı. */}
                    {k !== "anasayfa" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); sekmeKapat(k); }}
                        style={{ border: "none", background: "none", color: "inherit", cursor: "pointer", display: "flex", opacity: 0.7 }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
              {acikPencereler.length > 0 && (
                <span style={{ width: 1, alignSelf: "stretch", background: "var(--erp-line)", margin: "6px 6px 0", flexShrink: 0 }} />
              )}
              {acikPencereler.map((p) => (
                <div
                  key={p.id}
                  // Sekmeye tıklayınca ilgili kayda GİDİLİR.
                  //
                  // Beş pencere tipi açılıyor (urun, recete, fis, ekstre, siparis, uretim) ama
                  // yalnızca üçünün çizimi var; `siparis` ve `uretim` sekmeleri ne çiziliyor ne
                  // yönlendiriliyordu — tıklayınca hiçbir şey olmuyordu. `urun` için yönlendirme
                  // zaten vardı, diğer ikisi eklendi. Pencere kimliği zaten kaydın kimliği.
                  onClick={() => {
                    setAktifPencereId(p.id);
                    // KARTI ÇİZEN MODÜLE GİDİLİYOR; modül hangi kartı göstereceğini `aktifPencereId`den
                    // okuyor (kullanıcı, 11 Eylül: "üst sekmeler düzgün çalışmıyor").
                    //
                    // Eskiden sipariş için `sipariseGit(p.id)` çağrılıyordu: pencere kimliği
                    // (`siparis-s1`) kayıt kimliği sanılıyor, sipariş bulunamıyor, Alış siparişinde
                    // bile SATIŞ ekranına gidiliyordu — kart hiç görünmüyordu. Üretimde de aynı
                    // kimlik hedef olarak veriliyor ve hiçbir karta uymuyordu.
                    if (p.tip === "urun") setTab("stok");
                    else if (p.tip === "siparis") {
                      const kayit = siparisler.find((x) => x.id === p.kayitId);
                      const sahipTip = (p.veri && p.veri.sahipTip) || (kayit && kayit.tip);
                      setTab(sahipTip === "Alış" ? "satinalma" : "siparis");
                    }
                    else if (p.tip === "uretim") setTab("uretim");
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: "6px 6px 0 0",
                    background: aktifPencere && p.id === aktifPencere.id ? "var(--erp-panel)" : "transparent",
                    color: aktifPencere && p.id === aktifPencere.id ? "var(--erp-text)" : "var(--erp-text-2)",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                  }}
                >
                  {p.baslik}
                  <button
                    onClick={(e) => { e.stopPropagation(); pencereKapat(p.id); }}
                    style={{ border: "none", background: "none", color: "inherit", cursor: "pointer", display: "flex", opacity: 0.7 }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              </div>

              {/* KUR ROZETİ — ŞERİDİN SAĞ UCUNDA (kullanıcı, 7 Eylül: "bunu sağ üst bara alalım
                  en iyisi").
                  Sol menünün altındayken menü daraltılınca 64 piksele sıkışıyor ve iki satıra
                  kırılıyordu; ayrıca menü dibi ekranın en az bakılan köşesi. Şeritte hem her
                  ekranda görünür hem de yatay yerleşimle tek satıra sığıyor.
                  `flexShrink: 0`: sekmeler ne kadar çoğalırsa çoğalsın rozet daralmıyor —
                  daralsaydı sayılar yine kırılırdı. */}
              <div style={{ flexShrink: 0 }}>
                <KurRozeti
                  kurlar={muhasebe.kurlar}
                  kurGecmisi={muhasebe.kurGecmisi}
                  yukleniyor={kurYukleniyorGlobal}
                  onGuncelle={kurlariCek}
                  serit
                  onElleKaydet={(usd, eur) => {
                    kurlariKaydet(usd, eur, "Elle");
                    showToast(`Kurlar elle kaydedildi — USD: ${usd.toFixed(4)} ₺, EUR: ${eur.toFixed(4)} ₺`);
                  }}
                />
              </div>
            </div>

            {aktifPencere && aktifPencere.tip === "recete" && (
              <ReceteYazdir
                product={aktifPencere.veri.product}
                tumUrunler={aktifPencere.veri.tumUrunler}
                tanimlarProsesler={aktifPencere.veri.tanimlarProsesler}
                tanimlarAraProsesler={aktifPencere.veri.tanimlarAraProsesler}
                firmaBilgileri={aktifPencere.veri.firmaBilgileri}
                onClose={() => pencereKapat(aktifPencere.id)}
                onMinimize={() => setAktifPencereId(null)}
              />
            )}
            {aktifPencere && aktifPencere.tip === "maliyet" && (
              <MaliyetYazdir
                product={aktifPencere.veri.product}
                tumUrunler={stok}
                tanimlarProsesler={tanimlar.prosesler}
                tanimlarAraProsesler={tanimlar.araProsesler}
                kurlar={muhasebe.kurlar || {}}
                aylikUretimHedefi={tanimlar.aylikUretimHedefi}
                genelGiderler={tanimlar.genelGiderler}
                fiyatGruplari={tanimlar.fiyatGruplari}
                firmaBilgileri={tanimlar.firmaBilgileri}
                onClose={() => pencereKapat(aktifPencere.id)}
                onMinimize={() => setAktifPencereId(null)}
              />
            )}
            {aktifPencere && aktifPencere.tip === "fis" && (
              <FisYazdir
                fis={aktifPencere.veri.fis}
                siparis={aktifPencere.veri.siparis}
                cari={aktifPencere.veri.cari}
                stok={aktifPencere.veri.stok}
                firmaBilgileri={aktifPencere.veri.firmaBilgileri}
                onClose={() => pencereKapat(aktifPencere.id)}
                onMinimize={() => setAktifPencereId(null)}
              />
            )}
            {aktifPencere && aktifPencere.tip === "ekstre" && (
              <CariEkstre
                cari={aktifPencere.veri.cari}
                firmaBilgileri={aktifPencere.veri.firmaBilgileri}
                defterFiltre={aktifPencere.veri.defterFiltre}
                onClose={() => pencereKapat(aktifPencere.id)}
                onMinimize={() => setAktifPencereId(null)}
              />
            )}

            {/* ---- DEPO ÇALIŞMA PENCERELERİ ----
                Depo'daki "Satın Al" ve "Alış Fişi" butonları buraya düşer. İçlerinde YENİ bir
                ekran yok: Hammadde İhtiyaç ve Satın Alma ekranlarının kendisi çiziliyor, yalnızca
                bir pencere kabuğunun içinde. Böylece iki ekran tek yerde kalıyor.

                DİKKAT — `display:none` ile gizleniyor, unmount EDİLMİYOR. Küçültünce bileşen
                sökülseydi yarım kalan alış formu (girilen miktarlar, seçilen tedarikçi) silinir,
                geri açan kullanıcı boş form bulurdu. Pencerenin anlamı zaten "kaldığı yerden
                devam"; sökmek o sözü bozardı. */}
            {acikPencereler
              .filter((p) => p.tip === "depo-satinal" || p.tip === "depo-alis" || p.tip === "stok-fisi")
              .map((p) => {
                const planlamaMi = p.tip === "depo-satinal";
                const fisMi = p.tip === "stok-fisi";
                const fisAlisMi = fisMi && p.veri.tip === "Alış";
                return (
                  <div
                    key={p.id}
                    style={{
                      display: aktifPencereId === p.id ? "flex" : "none",
                      position: "fixed", top: PENCERE_SERIT_YUKSEKLIGI, left: "var(--menu-genislik, 0px)", right: 0, bottom: 0,
                      zIndex: 100, background: "rgba(34,27,20,.55)",
                      alignItems: "stretch", justifyContent: "center",
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) pencereKucult(); }}
                  >
                    <div style={{ background: "var(--erp-panel-2)", width: "100%", height: "100%", display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <div
                        className="erp-pencere-baslik"
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                          background: fisMi
                            ? (fisAlisMi ? MODUL_RENK.satinalma : MODUL_RENK.siparis)
                            : (planlamaMi ? MODUL_RENK.planlama : MODUL_RENK.satinalma),
                          color: "var(--erp-panel-2)", flexShrink: 0,
                        }}
                      >
                        {planlamaMi ? <Compass size={20} /> : <Receipt size={20} />}
                        <span style={{ display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.25 }}>
                          <span className="mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", opacity: 0.75 }}>
                            {fisMi ? `Cari · ${fisAlisMi ? "Alış Fişi" : "Satış Fişi"}` : `Depo · ${planlamaMi ? "Hammadde İhtiyaç" : "Yeni Alış"}`}
                          </span>
                          <span style={{ fontSize: 18, fontWeight: 700, overflowWrap: "anywhere" }}>
                            {/* Planlama penceresinde ARTIK TEK RENK YOK: Depo satırı ürünün bütün renklerini
                                kapsıyor (12 Eylül). Eskiden `p.veri.renk` basılıyordu ve başlıkta
                                "Deri · undefined" görünüyordu. */}
                            {fisMi ? p.veri.cariUnvan : p.veri.urunAd}
                          </span>
                        </span>
                        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                          {/* MODÜLÜN EYLEMLERİ (18 Eylül): Kaydet/Düzenle/Sil burada, Kapat'ın
                              SOLUNDA. Yıkıcı olan Sil sağ köşeye konmuyor — kapatma refleksiyle
                              giden parmak ona çarpmasın. Modül `pencereEylemleriBildir` ile
                              bildirir; bildirmeyen ekranda bu alan boş kalır. */}
                          <EylemCubugu eylemler={pencereEylemleriOku(p.id)} kucuk />
                          <button
                            className="btn-ghost"
                            style={PENCERE_BASLIK_BUTONU}
                            onClick={pencereKucult}
                            title="Sekmede bırak, kapatma — girdiğiniz bilgiler korunur"
                          >
                            <span style={{ fontWeight: 900, fontSize: 16, lineHeight: 1 }}>−</span>
                          </button>
                          <button
                            className="btn-ghost"
                            style={PENCERE_BASLIK_BUTONU}
                            onClick={() => pencereKapat(p.id)}
                            title="Pencereyi kapat — Depo'ya dönersiniz"
                          >
                            <X size={16} /> Kapat
                          </button>
                        </span>
                      </div>
                      <div style={{ flex: 1, overflow: "auto", padding: 16, minWidth: 0 }}>
                        {fisMi ? (
                          <StokFisiFormu
                            pencereId={p.id}
                            muhasebe={muhasebe}
                            tip={p.veri.tip}
                            cari={cariler.find((c) => c.id === p.veri.cariId) || null}
                            baslangicKalemler={p.veri.baslangicKalemler}
                            onCariDegisti={(cariId, unvan) => {
                              // Pencerenin başlığı ve kayıt hedefi güncelleniyor; ikisi ayrı
                              // kalırsa ekran bir cariyi, kayıt başkasını gösterir.
                              setAcikPencereler((prev) => prev.map((x) => (x.id === p.id
                                ? { ...x, baslik: `${p.veri.tip} Fişi: ${unvan || "Cari seçin"}`,
                                    veri: { ...x.veri, cariId, cariUnvan: unvan || "Cari seçin" } }
                                : x)));
                            }}
                            cariler={cariler}
                            stok={stok}
                            siparisler={siparisler}
                            koliler={koliler}
                            uretim={uretim}
                            asortiler={tanimlar.asortiler || []}
                            kurlar={muhasebe.kurlar || {}}
                            showToast={showToast}
                            onVazgec={() => pencereKapat(p.id)}
                            onKaydet={(fis) => {
                              // Kaydettikten sonra pencere KAPANIR: fiş tek seferlik bir belgedir,
                              // açık bırakmak aynı fişin ikinci kez kaydedilme riskini doğururdu.
                              // Cari FİŞTEN okunuyor: kullanıcı formda başka bir cari seçmiş
                              // olabilir. Pencerenin açıldığı cariyi kullanmak, seçimi yok sayardı.
                              stokFisiKaydet(fis.cariId || p.veri.cariId, p.veri.tip, fis);
                              pencereKapat(p.id);
                            }}
                          />
                        ) : planlamaMi ? (
                          <HammaddeIhtiyacSekmesi
                            siparisler={siparisler}
                            stok={stok}
                            uretim={uretim}
                            cariler={cariler}
                            onGoToSiparis={(id) => { pencereKapat(p.id); sipariseGit(id); }}
                            onGoToUrun={(id) => { pencereKapat(p.id); uruneGit(id); }}
                            onGoToUretim={(id) => { pencereKapat(p.id); setUretimHedefId(id || null); setTab("uretim"); }}
                            onPlanlaHammaddeSatinAlma={planlaHammaddeSatinAlma}
                            showToast={showToast}
                            hedefHammadde={p.veri.hedef}
                            onHedefTuketildi={() => {}}
                          />
                        ) : (
                          /* Pencere yöneticisi propları BİLİNÇLİ olarak verilmiyor. Bu ekranın
                             içinden ikinci bir pencere açılsaydı, o pencere bu pencerenin İÇİNDE
                             çizilecekti; aktif pencere değiştiği an bu kap gizlendiği için içerideki
                             pencere de görünmez olurdu — tıklayınca hiçbir şey olmayan bir ekran.
                             Tam ekran sipariş ve fiş yazdırma, Satın Alma sekmesinden yapılır. */
                          <SiparisModule
              onSiparisGitGlobal={sipariseGit}
              mobilBolumAyari={mobilBolumCoz(tanimlar.mobilGorunum, "satinalma")}
              onFiseGitNo={fiseGit}
              koliler={koliler}
                            sabitTip="Alış"
                            stokRezervasyonlari={stokRezervasyonlari}
                            siparisler={siparisler}
                            onSave={saveSiparisler}
                            showToast={showToast}
                            cariler={cariler}
                            stok={stok}
                            uretim={uretim}
                            onGoToCari={() => { pencereKapat(p.id); setTab("cari"); }}
                            onGoToUretim={(id) => { pencereKapat(p.id); setUretimHedefId(id || null); setTab("uretim"); }}
                            onGerceklestir={siparisGerceklestir}
              onSatisFisiAc={satisFisiAcSiparisten}
                            onSilCascade={siparisSilCascade}
                            onCopaAt={copaAt}
                            onPlanlaUretim={planlaUretim}
                            onPlanlaSatinAlma={planlaSatinAlma}
                            onPlanlamaTemizle={planlamaTemizle}
                            asortiler={tanimlar.asortiler || []}
                            onAsortiOlustur={asortiOlustur}
                            firmaBilgileri={tanimlar.firmaBilgileri}
                            onUruneGit={uruneGit}
                            onYeniRenkKaydet={yeniRenkKaydet}
                            onModelRengiVeRecete={modelRengiVeReceteEkle}
                            tanimlarRenkler={tanimlar.renkler || []}
                            tanimlarBedenler={tanimlar.bedenler || []}
              tanimlarBedenGruplari={tanimlar.bedenGruplari || []}
                            tanimlarOzelKodAlanlari={tanimlar.ozelKodAlanlari || []}
                            kurlar={muhasebe.kurlar || {}}
                            hedefYeniAlis={p.veri.taslak}
                            onYeniAlisTuketildi={() => {}}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </>
        );
      })()}

      {sonHata && (
        <div
          style={{
            position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 400,
            background: "var(--erp-hover)", border: "2px solid #B85C2E", borderRadius: "var(--erp-r-md)",
            padding: 14, boxShadow: "none", maxWidth: 620, margin: "0 auto",
            maxHeight: "60vh", overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
            <AlertTriangle size={16} color="var(--erp-warn)" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-warn)" }}>{sonHata.baslik}</span>
          </div>
          {/* `pre-wrap`: satır sonları korunur, uzun metin kırpılmaz. Toast'ta kaybolan buydu. */}
          <div style={{ fontSize: 12, color: "var(--erp-text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {sonHata.ayrinti}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button
              className="btn-ghost"
              style={{ padding: "5px 10px", fontSize: 12 }}
              onClick={() => {
                const metin = `${sonHata.baslik}\n\n${sonHata.ayrinti}\n\nSürüm: ${SURUM} · ${sonHata.zaman}`;
                // Pano API'si HTTPS dışında ve bazı tarayıcılarda yok; sessizce başarısız olmasın
                // diye eski yönteme düşülüyor.
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(metin).then(() => showToast("Hata metni kopyalandı"), () => showToast("Kopyalanamadı — metni seçip elle kopyalayın"));
                } else {
                  showToast("Kopyalanamadı — metni seçip elle kopyalayın");
                }
              }}
            >
              Kopyala
            </button>
            <button className="btn-primary" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setSonHata(null)}>
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* BULUT GİRİŞİ NEDEN OLMADI. Toast 2 saniyede kayboluyordu ve sebep hiç gösterilmiyordu;
          kart kullanıcı kapatana kadar duruyor ve Supabase'in cevabını okunur dille söylüyor. */}
      {girisSistemiAktif && aktifKullanici && !bulutKimligi && bulutAyrintiAcik && (
        <div
          data-bulut-giris-ayrinti="1"
          style={{
            position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 950,
            width: "min(520px, calc(100vw - 24px))", background: "var(--erp-panel)", border: "1.5px solid #E1611F",
            borderRadius: "var(--erp-r-lg)", padding: "12px 14px", boxShadow: "none", color: "var(--erp-text)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <AlertTriangle size={15} color="var(--erp-warn)" />
            <b style={{ fontSize: 13 }}>Yerel şifreyle girildi — bulut girişi olmadı</b>
            <button className="btn-ghost" style={{ marginLeft: "auto", padding: "2px 10px", fontSize: 12 }} onClick={() => setBulutAyrintiAcik(false)}>
              <X size={12} /> Kapat
            </button>
          </div>
          {bulutGirisAyrinti ? (
            <div style={{ fontSize: 12, display: "grid", gap: 4 }}>
              <div>Denenen bulut hesabı: <b className="mono">{bulutGirisAyrinti.eposta}</b></div>
              <div>Sebep: <b>{bulutGirisAyrinti.sebep}</b></div>
            </div>
          ) : (
            <div style={{ fontSize: 12 }}>Bulut girişi denenmedi (Supabase bağlantısı tanımlı değil).</div>
          )}
        </div>
      )}

      {toast && (
        <div
          data-toast="1"
          onClick={toastKapat}
          title="Kapatmak için dokunun"
          style={{
            position: "fixed",
            // SOL ALT (ERP standardı). Mobilde iki kenara yayılır.
            bottom: 24,
            left: 24,
            // Dar ekranda alt çubuğun üstünde ve tam genişlikte: köşede kalan küçük bir kutu
            // telefonda hem görünmüyor hem okunmuyordu.
            right: mobilDuzen ? 12 : undefined,
            maxWidth: mobilDuzen ? undefined : 420,
            zIndex: 300,
            background: "var(--erp-toast)",
            color: "var(--erp-panel-2)",
            padding: "12px 16px",
            borderRadius: "var(--erp-r-md)",
            fontSize: 13,
            lineHeight: 1.45,
            cursor: "pointer",
            boxShadow: "none",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <span style={{ flex: 1 }}>{toast}</span>
          {toastGeriAl && (
            <button type="button" data-toast-geri-al="1"
              onClick={() => { const f = toastGeriAl; toastKapat(); f(); }}
              style={{ background: "transparent", border: "1px solid var(--erp-shell-ink)", color: "var(--erp-shell-ink)",
                borderRadius: "var(--erp-r-sm)", padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Geri al
            </button>
          )}
          <X size={14} style={{ flexShrink: 0, marginTop: 2, opacity: .7 }} />
        </div>
      )}

      {onayPaneliAcik && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 300, background: "rgba(34,27,20,.55)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          <div style={{ background: "#fff", borderRadius: "var(--erp-r-lg)", maxWidth: 640, width: "100%", maxHeight: "85vh", overflow: "auto", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700 }}>Onay Bekleyenler</div>
              <button className="btn-ghost" onClick={() => setOnayPaneliAcik(false)}><X size={14} /></button>
            </div>

            {bekleyenOnaylar.length === 0 ? (
              <EmptyState text="Bekleyen onay isteği yok." />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {bekleyenOnaylar.map((istek) => (
                  <div key={istek.id} style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                      <span
                        className="mono"
                        style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-warn)", background: "var(--erp-orange-bg)", padding: "2px 8px", borderRadius: "var(--erp-r-pill)" }}
                      >
                        {istek.islemTipi}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--erp-text)" }}>{istek.kullaniciAd}</span>
                      <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)", marginLeft: "auto" }}>
                        {new Date(istek.tarih).toLocaleString("tr-TR")}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--erp-text)", marginBottom: 10 }}>{istek.aciklama}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn-primary" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => onayaKarar(istek.id, "Onaylandı")}>
                        Onayla
                      </button>
                      <button className="btn-ghost" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => onayaKarar(istek.id, "Reddedildi")}>
                        Reddet
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

