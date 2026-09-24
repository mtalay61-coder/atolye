// =============================================================================================
// ALIŞ / SATIŞ FİŞİ FORMU
//
// Cari kartındaki "Alış" ve "Satış" düğmeleri buraya açılır. Önceki hâli tek ürün + tek renk
// alan küçük bir paneldi; bir tedarikçiden aynı anda üç malzeme alındığında üç ayrı kayıt, üç
// ayrı fiş numarası çıkıyor ve o alışverişin tek bir belge olduğu bilgisi kayboluyordu.
//
// Düzen bilinçli olarak SATIN ALMA SİPARİŞİ ekranıyla aynı: ürün seç, renk seç, bedenlere miktar
// yaz, "Kalemlere Ekle". Kullanıcı iki ekran öğrenmek zorunda kalmıyor.
//
// FARK — burada SİPARİŞ OLUŞMAZ. Satın alma siparişi "gelecek" bir malı anlatır (yolda, bekleyen,
// teslim alınacak). Fiş ise OLMUŞ bir işlemdir: mal elde, borç doğdu. Bu yüzden kayıt doğrudan
// stok hareketi + cari hareketi olarak yazılır, Satın Alma listesine düşmez.
//
// Bütün kalemler TEK fiş numarasını paylaşır: fiş, işlemin belgesidir; kalemleri ayrı numaralara
// bölmek "bu üç satır aynı alışveriş" bilgisini yok ederdi.
// `baslangicKalemler`: fiş açılırken hazır gelen kalem listesi.
//
// Kullanıcı (7 Eylül): "Depodan alış fişi oluşturduğumuzda ihtiyaç otomatik çeksin, tekrar elle
// girmeyelim."
//
// Depo'dan tek ürünle geliniyordu; o tedarikçiden alınacak DİĞER eksikler ekranda görünmüş olsa
// bile fişe tek tek yazılıyordu. Aynı tedarikçiye zaten fiş kesiliyorsa, onun bütün eksiklerini
// aynı fişe koymak işin doğal hâli.
function StokFisiFormu({ pencereId, tip, cari: gelenCari, cariler, stok, asortiler, kurlar, muhasebe, onKaydet, onVazgec, showToast, baslangicKalemler, onCariDegisti, siparisler, koliler, uretim }) {
  // CARİ SEÇİMİ FORMUN İÇİNDE.
  //
  // Fiş, cari kartından açıldığında cari zaten belliydi ve seçim gerekmiyordu. Ama Depo'dan
  // açıldığında (v1.127.0) tedarikçi malzemenin varsayılanından geliyor — kullanıcı BAŞKA bir
  // cariden alım yapmak istediğinde değiştirecek bir yer yoktu. Satın alma ekranında seçim vardı,
  // fişte yoktu; aynı iş iki ekranda farklı davranıyordu.
  const [seciliCariId, setSeciliCariId] = useState((gelenCari && gelenCari.id) || "");
  const cari = (cariler || []).find((c) => c.id === seciliCariId) || null;
  // PENCERE BAŞLIĞI DA DEĞİŞSİN. Cari formda değiştirilebiliyor ama üstteki başlık açılıştaki
  // cariyi göstermeye devam ediyordu: kayıt doğru cariye gidiyor, ekran yanlış cariyi yazıyordu.
  // Ekranın kayıtla çelişmesi, kullanıcıya hangisinin doğru olduğunu sorduruyor.
  useEffect(() => {
    if (onCariDegisti) onCariDegisti(seciliCariId, cari ? cari.unvan : "");
  }, [seciliCariId]);

  // CARİ DEĞİŞİNCE PARA BİRİMİ DE DEĞİŞİYOR (kullanıcı, 9 Eylül: "cari açarken varsayılan para
  // birimini seçelim, alış veya satışta olan para birimini çeksin").
  //
  // Açılışta carininki alınıyordu ama form içinde cari değiştirilince eski değer kalıyordu:
  // dolarla çalışan bir tedarikçiye geçildiğinde fiş hâlâ TL diyordu ve kullanıcı her seferinde
  // elle düzeltiyordu.
  //
  // KULLANICI ELLE DEĞİŞTİRDİYSE DOKUNULMUYOR (`paraBirimiElle`): otomatik bir varsayılan,
  // kullanıcının bilinçli seçimini ezmemeli. "Varsayılan" ile "dayatma" arasındaki fark bu.
  const [paraBirimiElle, setParaBirimiElle] = useState(false);
  const alisMi = tip === "Alış";
  const ana = alisMi ? "var(--erp-brown)" : "var(--erp-info)";

  const [tarih, setTarih] = useState(bugunYerel());
  // Fiş no elle girilebilir: tedarikçinin kendi irsaliye/fatura numarası varsa ONA bağlanmak,
  // sistemin ürettiği numaradan daha değerlidir. Boş kalırsa sistem üretir (fişsiz hareket olmaz).
  const [fisNo, setFisNo] = useState("");
  const [odemeSekli, setOdemeSekli] = useState("Nakit");
  // KAYIT PARA BİRİMİ. İki işi birden görür:
  //   1) yeni eklenen kalemlerin varsayılan para birimi,
  //   2) fişin cariye HANGİ para biriminde yazılacağı.
  // Satırlar kendi para birimini taşıyabilir (bir fişte lira malzeme ile dolar aksesuar
  // birlikte gelebiliyor); kayıtta hepsi bu para birimine ÇEVRİLİR ve cariye TEK hareket
  // yazılır. Önce para birimi başına ayrı hareket yazılıyordu; "800 TL + 500 USD" iki satır
  // hâlinde duruyor, cari ekstresinde tek bir borç rakamı görünmüyordu.
  // Varsayılan carinin kendi para birimi: dolarla çalışılan tedarikçide her fişte elle
  // değiştirmek, er ya da geç unutulup yanlış para biriminde borç yazılması demekti.
  const [paraBirimi, setParaBirimi] = useState((cari && cari.paraBirimi) || "TRY");
  const pbSembol = PARA_SEMBOLU[paraBirimi] || paraBirimi;
  // Elle girilen kur düzeltmeleri. Biçim, Muhasebe'deki kurlarla BİREBİR aynı: "1 yabancı = X TRY".
  // Ters yönde ("1 TRY = ? USD") sormak kullanıcıyı da kodu da yanıltırdı; `paraCevirGenel`
  // zaten bu yönü bekliyor.
  const [kayitKurlari, setKayitKurlari] = useState({});
  const birlesikKurlar = { ...(kurlar || {}), ...kayitKurlari };
  const [vade, setVade] = useState("");
  // PEŞİN TAHSİLAT/ÖDEME — kullanıcı kararı (6 Eylül): para YALNIZCA burada hesap seçilirse
  // hareket eder. Otomatik olsaydı, varsayılan "Nakit" ile kesilmiş vadeli fişler de kasayı
  // boşaltırdı — ödeme şekli alanı bugün "peşin mi" sorusunu hiç sormuyor.
  // Boş bırakıldığında fiş eskisi gibi yalnız cari borcu yazıyor.
  const [pesinHesap, setPesinHesap] = useState("");        // "kasa:<id>" | "banka:<id>" | ""
  const [pesinTutar, setPesinTutar] = useState("");
  const [defter, setDefter] = useState("Genel");
  const [aciklama, setAciklama] = useState("");
  const [kalemler, setKalemler] = useState([]);
  useEffect(() => { setOnayGoster(false); }, [kalemler]);
  useEffect(() => {
    if (paraBirimiElle || !cari) return;
    // SİPARİŞTEN GELEN KALEMİN PARA BİRİMİ ÖNCELİKLİ (23 Eylül, v1.431.0): alış teslimi ortak
    // fiş ekranına taşınınca, USD fiyatlı bir sipariş TL fişe düşüyordu ve cari hareketi güncel
    // kurla TL'ye çevriliyordu — döviz borcu TL'ye dönüşüyordu (testte 75 USD → 3.600 TRY olarak
    // yakalandı). Fişteki kalemlerin hepsi tek para birimindeyse fiş o para biriminde açılıyor.
    const kalemPBleri = [...new Set((kalemler || []).map((k) => k.paraBirimi).filter(Boolean))];
    const pb = kalemPBleri.length === 1 ? kalemPBleri[0] : (cari.paraBirimi || "TRY");
    setParaBirimi(pb);
    // Kalem para birimi de aynı yerden: fişin geneli dolar iken satırın TL başlaması, her
    // kalemde iki ayrı yeri düzeltmek demekti.
    setKParaBirimi(pb);
  }, [seciliCariId, paraBirimiElle, kalemler]);   // eslint-disable-line react-hooks/exhaustive-deps
  const [siparistenSecAcik, setSiparistenSecAcik] = useState(false);
  // ONAY ADIMI (23 Eylül, v1.431.0 — kullanıcı 1. seçeneği seçti: "onay penceresini ortak fiş
  // ekranına taşı, alış ve satışta da çalışsın"). Sipariş kartındaki alış teslim formunda vardı;
  // alış tek ekrana taşınırken kaybolmasın diye buraya alındı. Kaydet artık DOĞRUDAN yazmıyor:
  // önce stok etkisinin özeti çıkıyor, veri hatası varsa kayıt engelleniyor.
  const [onayGoster, setOnayGoster] = useState(false);
  // ONAY AÇIKKEN KALEM DEĞİŞİRSE ONAY KAPANIR (23 Eylül, v1.431.0): eski teslim formunda da
  // böyleydi. Kullanıcı onayı okurken bir satırı değiştirirse, ekranda duran özet artık o fişi
  // anlatmıyor demektir — özet güncel olmayan bir karar için "evet" dedirtmemeli.
  // KOLİ LİSTESİ KATLANIYOR (23 Eylül, v1.428.0 — kullanıcı: "koliler ekranı çok dolduruyor,
  // nasıl azaltırız"). 19 koli tek tek listelenince ekranı kaplıyordu; aynı asortideki koliler tek
  // satırda toplanıp "kaç koli?" sorusuna indirgendi. Kod kod seçmek isteyen listeyi açabiliyor.
  const [acikKoliGruplari, setAcikKoliGruplari] = useState({});   // imza → true
  const [koliAdetleri, setKoliAdetleri] = useState({});           // imza → kaç koli eklenecek
  // DEPO'DAN GELEN BAĞLAM: hangi malzeme için basıldıysa ürün ve renk hazır seçili gelir.
  // Eskiden pencere başlığında ürün adı yazıyor ama form boş açılıyordu; kullanıcı Depo'da
  // gördüğü malzemeyi formda yeniden aramak zorundaydı.
  const [ilkSecimYapildi, setIlkSecimYapildi] = useState(false);


  const [kUrunId, setKUrunId] = useState("");
  const [kRenk, setKRenk] = useState("");
  // İHTİYAÇTAN GELEN KALEMLER — form açılır açılmaz listeye giriyor.
  //
  // Nereden geldikleri SÖYLENİYOR (aşağıdaki bilgi şeridi): kendiliğinden beliren satırlar,
  // söylenmezse "ben bunları girmedim" sorusu doğururdu. Hepsi silinebilir; alım ihtiyaçtan farklı
  // olabilir (tedarikçinin minimum sipariş adedi, yuvarlama, bütçe).
  const [ihtiyactanGelen, setIhtiyactanGelen] = useState(0);
  useEffect(() => {
    if (ilkSecimYapildi || !baslangicKalemler || baslangicKalemler.length === 0) return;
    // GELEN LİSTENİN KENDİ İÇİNDEKİ KOPYALAR da ayıklanıyor (bkz. `hazirKalemleriTekille`). Eskiden
    // yalnız formda ZATEN olan satırlarla karşılaştırılıyordu; aynı ihtiyacın iki kaynaktan
    // (tıklanan satır + MRP) gelmesi iki satır olarak listeye düşüyordu.
    const tekil = hazirKalemleriTekille(baslangicKalemler);
    setKalemler((onceki) => {
      // Zaten eklenmiş satır TEKRAR EKLENMİYOR: form yeniden çizilirse (cari değişimi, pencere
      // geri gelmesi) miktarlar ikiye katlanırdı.
      const varOlan = new Set(onceki.map(fisKalemAnahtari));
      const yeniler = tekil
        .filter((k) => !varOlan.has(fisKalemAnahtari(k)))
        .map((k) => ({ ...k, id: uid("fkalem") }));
      return [...onceki, ...yeniler];
    });
    // Şeritteki sayı TEKİLLENMİŞ listeden: kopyaları sayan bir "3 kalem" ekrandaki 2 satırla çelişirdi.
    setIhtiyactanGelen(tekil.length);
    setIlkSecimYapildi(true);
  }, [baslangicKalemler, ilkSecimYapildi]);

  // TEKİL `baslangicKalem` YOLU KALDIRILDI (7 Eylül).
  //
  // Form alanlarını dolduruyordu (ürün + renk + miktarlar) ama kalem listesine girmesi için
  // kullanıcının ayrıca "Kalem Ekle"ye basması gerekiyordu. Depo'da zaten "bunu alacağım" denmiş
  // bir satır için fazladan bir adım — kullanıcı bunu bildirdi.
  //
  // Artık tıklanan satır da diğer eksikler gibi `baslangicKalemler` içinde geliyor ve doğrudan
  // listeye düşüyor. TEK YOL: iki ayrı doldurma mekanizması, ikisinin zamanla ayrışması demekti.
  //
  // (Zaten bozulmuştu: iki `useEffect` aynı `ilkSecimYapildi` bayrağını paylaşıyordu ve çoğul
  //  olan önce çalışınca tekil olan HİÇ çalışmıyordu.)
  const [kMiktarlar, setKMiktarlar] = useState({});
  // Boyut/diğer ölçülerde kullanıcının seçtiği ölçü (bkz. olcuSecmeli).
  const [kSeciliOlcu, setKSeciliOlcu] = useState("");
  // Ürün arama kutusunun metni (seçili ürünün etiketiyle eşitleniyor).
  const [kUrunArama, setKUrunArama] = useState("");
  const [kFiyat, setKFiyat] = useState("");
  // KALEM PARA BİRİMİ — fiyatın hemen yanında seçilir. Eskiden yalnızca üstteki kayıt para
  // biriminden geliyordu: dolar fiyatlı bir kalem eklemek için önce yukarı çıkıp fişin para
  // birimini değiştirmek, sonra geri inmek gerekiyordu. Fiyat ile para birimi tek bir bilgidir;
  // ayrı yerlerde sorulması, yanlış parada fiyat girilmesine davetiye çıkarıyordu.
  // Kalem eklendikten sonra SIFIRLANMAZ: arka arkaya birkaç dolar kalemi girilecekse her
  // seferinde yeniden seçtirmek gereksiz iş olurdu.
  const [kParaBirimi, setKParaBirimi] = useState((cari && cari.paraBirimi) || "TRY");
  const kPbSembol = PARA_SEMBOLU[kParaBirimi] || kParaBirimi;

  const cekSenet = odemeSekli === "Çek" || odemeSekli === "Senet";
  const seciliUrun = (stok || []).find((p) => p.id === kUrunId);
  const renkSecenekleri = seciliUrun ? Array.from(new Set(seciliUrun.variants.map((v) => v.renk))) : [];
  // TEK SEÇENEK SORULMAZ (23 Eylül, v1.432.0 — kullanıcı: "renksiz hammaddeler de standart
  // seçtiriyoruz"). Yapıştırıcı, toka, kutu gibi renksiz malzemelerin tek varyantı var ve adı
  // "Standart" — bu bir RENK DEĞİL, yer tutucu (bkz. 077-barkod). Kullanıcıya tek seçenekli bir
  // listeden seçim yaptırmak boş bir adım; "Standart" ise alanı göstermek üstelik yanıltıcı.
  //   • tek renk varsa  → kendiliğinden seçilir
  //   • o renk "Standart" ise → alan hiç çizilmez, doğrudan miktara geçilir
  //   • gerçekten çok renkliyse → eskisi gibi seçtirilir
  const tekRenk = renkSecenekleri.length === 1 ? renkSecenekleri[0] : "";
  const renkSorulmaz = !!tekRenk && tekRenk === "Standart";
  useEffect(() => {
    if (tekRenk && kRenk !== tekRenk) { setKRenk(tekRenk); setKMiktarlar({}); setKSeciliOlcu(""); }
  }, [tekRenk]);   // eslint-disable-line react-hooks/exhaustive-deps
  const bedenSecenekleri = seciliUrun && kRenk
    ? bedenSirala(Array.from(new Set(seciliUrun.variants.filter((v) => v.renk === kRenk).map((v) => v.beden))))
    : [];

  // ÖLÇÜ SEÇMELİ (kullanıcı, 18 Eylül: "boyut olan ürünlerde tüm boyutlar gelmesin, seçim ile
  // girelim").
  //
  // Ayakkabı BEDENİ'nde bütün numaralara miktar girilir — asorti mantığı bu, kutuların hepsi açık
  // olmalı. Ama BOYUT'ta (bağcık 120/130/140/150/160 cm, deri ebadı…) tek seferde genelde BİR
  // boyut alınıyor; beş kutuyu birden açmak ekranı dolduruyor ve yanlış kutuya yazma riski
  // getiriyor. Onun için boyut/diğer ölçülerde önce ÇİP seçiliyor, kutu ancak seçilen ölçü için
  // açılıyor. Beden tipinde eski davranış aynen duruyor.
  const olcuSecmeli = !!(seciliUrun && seciliUrun.olcuTipi && seciliUrun.olcuTipi !== "Beden"
    && bedenSecenekleri.filter(Boolean).length > 1);
  const gosterilecekOlculer = olcuSecmeli
    ? bedenSecenekleri.filter((b) => b === kSeciliOlcu)
    : bedenSecenekleri;

  function urunSec(urunId) {
    setKUrunId(urunId);
    const secilen = (stok || []).find((x) => x.id === urunId);
    setKUrunArama(secilen ? secenekEtiketi(secilen, secilen.ad) : "");
    setKRenk(""); setKMiktarlar({}); setKSeciliOlcu("");
    const p = (stok || []).find((x) => x.id === urunId);
    if (!p) return;
    // Fiyat `fiyatBul` ile geliyor, ürün kartındaki ham alanla DEĞİL: o alan cariye özel fiyat
    // grubunu ve fiyat kurallarını görmez. Sipariş ekranı fiyatBul kullanıyor; burada ham alana
    // bakmak, aynı müşteri için iki ekranda iki farklı fiyat göstermek demekti.
    const bulunan = fiyatBul(p, null, null, cari ? cari.id : "", tip, cariler || []);
    // Kuralın birimi fişin biriminden farklıysa çevir (21 Eylül).
    const cevrim = fiyatFiseCevir(bulunan.fiyat, bulunan.paraBirimi, kParaBirimi, birlesikKurlar);
    if (cevrim.cevrilemedi) showToast && showToast(`${bulunan.paraBirimi} → ${kParaBirimi} kuru yok — fiyat çevrilmedi`);
    setKFiyat(cevrim.fiyat ? String(cevrim.fiyat) : "");
  }

  function stokMiktari(renk, beden) {
    if (!seciliUrun) return 0;
    const v = seciliUrun.variants.find((x) => x.renk === renk && x.beden === beden);
    return v ? v.miktar : 0;
  }

  function kalemEkle() {
    if (!seciliUrun || !kRenk) return showToast("Ürün ve renk seçin");
    const fiyat = parseFloat(kFiyat) || 0;
    // GÖSTERİLEN ölçüler üzerinden: çip seçimi kaldırılmış bir ölçünün eski miktarı kalemlere
    // sızmasın (ekranda görünmeyen bir satır eklenmesi, fişi sessizce bozardı).
    const eklenecekler = gosterilecekOlculer
      .map((b) => ({ beden: b, miktar: parseFloat(kMiktarlar[b]) || 0 }))
      .filter((x) => x.miktar > 0);
    if (eklenecekler.length === 0) return showToast("En az bir ölçüye miktar girin");

    // Aynı ürün+renk+beden ikinci kez eklenirse YENİ SATIR açılmaz, miktar ARTIRILIR. Sipariş
    // formunda da aynı kural var; ayrışması, aynı fişte aynı bedenin iki kez görünmesi demekti.
    let sonraki = [...kalemler];
    let yeni = 0, birlesen = 0;
    eklenecekler.forEach((x) => {
      const i = sonraki.findIndex((k) => k.urunId === seciliUrun.id && k.renk === kRenk && k.beden === x.beden);
      if (i >= 0) {
        birlesen++;
        sonraki = sonraki.map((k, j) => (j === i ? { ...k, miktar: stokYuvarla(k.miktar + x.miktar), birimFiyat: fiyat, paraBirimi: kParaBirimi } : k));
      } else {
        yeni++;
        sonraki = [...sonraki, {
          id: uid("fkalem"), urunId: seciliUrun.id, urunAd: seciliUrun.ad, birim: seciliUrun.birim || "",
          renk: kRenk, beden: x.beden, miktar: x.miktar, birimFiyat: fiyat,
          // Satır kendi para birimini TAŞIR. Fişin ayarına bakıp sonradan çözmek, o ayar
          // değişince eski satırların anlamının da değişmesi demekti.
          paraBirimi: kParaBirimi,
        }];
      }
    });
    setKalemler(sonraki);
    // FORM TAMAMEN SIFIRLANIR (kullanıcı, 18 Eylül: "kalemlere ekle deyince ürünü sıfırla, yeni
    // kalem başka ürün olabilir"). `kUrunId` sıfırlanıyordu ama ARAMA KUTUSUNUN METNİ ve seçili
    // ölçü kalıyordu: ekranda hâlâ eski ürünün adı yazıyor, altında renk alanı yok — kullanıcı
    // "ürün seçili mi değil mi" diye bakmak zorunda kalıyordu.
    setKUrunId(""); setKUrunArama(""); setKRenk(""); setKMiktarlar({}); setKSeciliOlcu(""); setKFiyat("");
    if (birlesen > 0 && yeni > 0) showToast(`${yeni} kalem eklendi, ${birlesen} kalem birleştirildi`);
    else if (birlesen > 0) showToast(`${birlesen} kalem var olan satırla birleştirildi`);
    else showToast(`${yeni} kalem eklendi`);
  }

  function kalemSil(id) { setKalemler((k) => k.filter((x) => x.id !== id)); }
  function kalemDuzenle(id, alan, deger) {
    setKalemler((k) => k.map((x) => (x.id === id ? { ...x, [alan]: deger } : x)));
  }

  // Para birimi başına ara toplam — çevrimin girdisi ve kullanıcıya gösterilen döküm.
  const toplamlar = (() => {
    const m = {};
    kalemler.forEach((k) => {
      const pb = k.paraBirimi || "TRY";
      m[pb] = stokYuvarla((m[pb] || 0) + k.miktar * k.birimFiyat);
    });
    return Object.entries(m);
  })();

  // Kayıt para biriminden FARKLI olan para birimleri — kur bunlar için sorulur.
  const cevrilecekler = toplamlar.filter(([pb]) => pb !== paraBirimi).map(([pb]) => pb);

  // Fişin kayıt para birimindeki toplamı. Gereken kur yoksa `null` döner ve kayıt ENGELLENİR:
  // eksik kurla hesaplanan bir tutar, cariye sessizce yanlış borç yazmak olurdu.
  // KALEM KALEM çevrilir, para birimi başına toplayıp öyle değil. Cariye de kalem kalem
  // yazılıyor; önce toplayıp sonra çevirseydik buradaki toplam ile ekstredeki satırların
  // toplamı yuvarlama kadar ayrışır, "satırlar toplanmıyor" görünürdü.
  const cevrimSonucu = (() => {
    let toplam = 0;
    const eksikler = new Set();
    kalemler.forEach((k) => {
      const c = paraCevirGenel(k.miktar * k.birimFiyat, k.paraBirimi || paraBirimi, paraBirimi, birlesikKurlar);
      if (c == null) { eksikler.add(k.paraBirimi || paraBirimi); return; }
      toplam += stokYuvarla(c);
    });
    return { toplam: stokYuvarla(toplam), eksikler: [...eksikler] };
  })();
  const cevrimEksik = cevrimSonucu.eksikler.length > 0;

  // Kur kutusu HER ZAMAN "1 yabancı = ? TRY" yönünde sorulur. Çevrilecek taraf TRY ise sorulacak
  // yabancı para, kayıt para birimidir (800 TL'yi USD'ye bölmek için gereken kur "1 USD = ? TRY").
  function sorulacakYabanci(pb) {
    return pb !== "TRY" ? pb : (paraBirimi !== "TRY" ? paraBirimi : null);
  }
  // İki yabancı arasında çevrim (USD satır → EUR kayıt) İKİ kur ister; ikisi de sorulur.
  const kurAnahtarlari = Array.from(new Set(
    cevrilecekler.flatMap((pb) => [sorulacakYabanci(pb), paraBirimi !== "TRY" ? paraBirimi : null])
      .filter(Boolean)
  ));

  // Kaydet düğmesi önce onayı açar; asıl yazma `kaydetOnayli`da.
  function kaydet() {
    setOnayGoster(true);
  }

  function kaydetOnayli() {
    setOnayGoster(false);
    kaydetYaz();
  }

  function kaydetYaz() {
    if (kalemler.length === 0) return showToast("Fişte kalem yok");
    // Eksik kurla kaydetmek, cariye uydurma bir borç yazmak olurdu.
    if (cevrimEksik) {
      return showToast(`${cevrimSonucu.eksikler.join(", ")} → ${paraBirimi} kuru girilmeden fiş kaydedilemez`);
    }
    // PEŞİN TUTAR FİŞ TOPLAMINI AŞAMAZ: aşarsa cari ters yöne geçer ve "bu carinin bize borcu
    // var" gibi görünür. Fazla ödeme meşru bir işlem ama kendi kaydı olmalı, fişin içine
    // sıkıştırılmamalı.
    const pesinSayi = pesinHesap ? (parseFloat(pesinTutar) || 0) : 0;
    if (pesinHesap && pesinSayi <= 0) return showToast("Peşin tutar girin ya da hesabı boş bırakın");
    if (pesinSayi > cevrimSonucu.toplam + 0.001) {
      return showToast(`Peşin tutar fiş toplamını aşamaz (${cevrimSonucu.toplam.toLocaleString("tr-TR")} ${paraBirimi})`);
    }
    onKaydet({
      tarih, fisNo: fisNo.trim(), odemeSekli, vade: cekSenet ? vade : "",
      // `paraBirimi` fişin KAYIT para birimi; satırlar kendi para birimini taşımaya devam eder.
      // `kayitKurlari` da gönderilir: kayıt anındaki kur, fişin bir parçasıdır.
      paraBirimi, kayitKurlari: birlesikKurlar, defter, aciklama: aciklama.trim(), kalemler,
      // Seçilen cari fişin bir parçası: pencere hangi cariyle açılmış olursa olsun, KAYIT
      // kullanıcının seçtiğine yazılır.
      cariId: seciliCariId,
      pesin: pesinHesap ? (() => {
        const [tur, id] = pesinHesap.split(":");
        const liste = tur === "kasa" ? ((muhasebe && muhasebe.kasalar) || []) : ((muhasebe && muhasebe.bankalar) || []);
        const hesap = liste.find((h) => h.id === id);
        return { hesapTur: tur, hesapId: id, hesapAd: hesap ? hesap.ad : "", tutar: pesinSayi, paraBirimi };
      })() : null,
    });
  }

  // PENCERE BAŞLIĞINA EYLEMLER (18 Eylül): Kaydet ve Vazgeç sağ üstte, Kapat'ın solunda. Formun
  // altındaki düğmeler DURUYOR — uzun formda göz aşağıdayken oraya bakılıyor. Aynı iş, aynı isim,
  // iki yerde: kafa karıştıran şey aynı işin iki farklı isimle durmasıdır, iki yerde olması değil.
  const kaydetPasif = kalemler.length === 0 || cevrimEksik || !seciliCariId;
  // KOLİDEKİ MALI DÜZ SATIRLA SATMA UYARISI (23 Eylül, v1.423.0): satış fişinde koliye bağlı olmayan
  // satır, SERBEST stoktan (stok − hazır kolilerdeki) fazlaysa mal kolidedir: düz satılırsa stok
  // düşer ama koliler "Hazır" kalır ve depo "serbest −N" gösterir (kullanıcının 152 çiftlik vakası).
  const koliUyarilari = tip !== "Satış" ? [] : (() => {
    const duz = new Map();
    kalemler.filter((k) => !k.koliId).forEach((k) => {
      const a = `${k.urunId}|${k.renk}|${k.beden}`;
      duz.set(a, (duz.get(a) || 0) + (k.miktar || 0));
    });
    const sonuc = [];
    duz.forEach((miktar, a) => {
      const [urunId, renk, beden] = a.split("|");
      const urun = (stok || []).find((u) => u.id === urunId);
      const v = urun && (urun.variants || []).find((x) => x.renk === renk && x.beden === beden);
      const kolide = (koliler || []).filter((kl) => (kl.durum || "Hazır") === "Hazır")
        .reduce((t, kl) => t + (kl.kalemler || []).filter((kk) => kk.urunId === urunId && kk.renk === renk && kk.beden === beden)
          .reduce((x, kk) => x + (kk.adet || 0), 0), 0);
      const serbest = stokYuvarla(((v && v.miktar) || 0) - kolide);
      if (kolide > 0 && miktar > serbest) sonuc.push(`${urun ? urun.ad : ""} ${renk} ${beden}: ${miktar} çift düz satırda, serbest ${Math.max(0, serbest)} (kolide ${kolide})`);
    });
    return sonuc;
  })();
  // BAYAT KAYDET (22 Eylül, v1.408.0, denetim 18 C): başlıktaki Kaydet ve Ctrl+S, efektin SON
  // çalıştığı çizimdeki `kaydet`i çağırıyordu. Efekt tarih, fiş no, ödeme şekli, vade ve peşine
  // bağlı DEĞİLDİ: kalemden sonra bunlar değiştirilip Ctrl+S'ye basılınca fiş ESKİ değerlerle
  // kaydediliyordu (kanıt: "SONRADAN-NO" + Havale/EFT → AF-… + Nakit). Alttaki düğme doğruydu.
  // Artık çubuk her zaman GÜNCEL fonksiyonu çağırıyor; efekt yalnız görünen şey (etiket, pasiflik)
  // değişince yeniden bildiriyor.
  const kaydetRef = useRef(kaydet);
  kaydetRef.current = kaydet;
  const vazgecRef = useRef(onVazgec);
  vazgecRef.current = onVazgec;
  useEffect(() => {
    if (!pencereId) return undefined;
    pencereEylemleriBildir(pencereId, [
      { tur: "kaydet", ad: alisMi ? "Alış Fişini Kaydet" : "Satış Fişini Kaydet", onClick: () => kaydetRef.current(), pasif: kaydetPasif,
        ipucu: kaydetPasif ? "Önce cari ve en az bir kalem gerekli" : "Fişi kaydet" },
      { tur: "vazgec", onClick: () => vazgecRef.current && vazgecRef.current(), ipucu: "Fişi kaydetmeden kapat" },
    ]);
    return () => pencereEylemleriBildir(pencereId, []);
  }, [pencereId, kaydetPasif, alisMi]);

  // BÖLÜM ÇİZGİLERİ KALINLAŞTIRILDI (23 Eylül, v1.424.0 — kullanıcı: "masaüstü için ekranı
  // toparladım, ekran 3 bölüm, bölümleri ayıran çizgileri belirginleştirelim ve kalınlaştıralım").
  // Üç ana bölüm — üst bilgi şeridi, Kalem Ekle, kalem tablosu — aynı koyu 2px kenarlık ve hafif
  // gölgeyle ayrılıyor; aralarındaki boşluk (gap) da büyüdü.
  const BOLUM_KENAR = "2px solid var(--erp-brown)";
  const BOLUM_GOLGE = "0 1px 3px rgba(74,54,37,0.08)";
  // KOLİYİ FİŞE EKLE — ORTAK (23 Eylül, v1.426.0): hem "Koli barkodu okut" hem "Siparişten seç"
  // altındaki koli listesi AYNI fonksiyonu çağırıyor — biri düzelince ikisi de düzelsin.
  function koliyiFiseEkle(koli) {
    if ((koli.durum || "Hazır") === "Sevk edildi") return showToast(`${koli.kod} zaten sevk edilmiş${koli.sevkFisNo ? ` (${koli.sevkFisNo})` : ""}`);
    if (kalemler.some((k) => k.koliId === koli.id)) return showToast(`${koli.kod} zaten fişte`);
    const koliCari = koliCarisiniCoz(koli, siparisler, uretim);
    if (!seciliCariId && koliCari) { setSeciliCariId(koliCari); }   // başlık useEffect ile güncellenir
    else if (seciliCariId && koliCari && koliCari !== seciliCariId) {
      const c = (cariler || []).find((x) => x.id === koliCari);
      return showToast(`${koli.kod} başka bir carinin kolisi (${c ? c.unvan : "?"}) — bu fişe eklenmedi`);
    }
    const { satirlar, siparis, yol, uyarilar } = koliKalemleriniFisSatirinaCevir(koli, { siparisler, uretim, stok, mevcutKalemler: kalemler });
    if (!satirlar.length) return showToast(`${koli.kod} boş`);
    // SİPARİŞTEN YÜKLÜ SATIRLAR "KALAN"DIR (23 Eylül, v1.422.0): sipariş kartından açılan fişte
    // kalan kalemler hazır geliyor; koli aynı sipariş satırını karşılıyorsa o satırdan DÜŞÜLÜR,
    // ikinci kez eklenmez (testte 2+2=4 satır, çift teslim çıkmıştı).
    setKalemler((o) => {
      const kalan = o.map((r) => {
        if (r.koliId || !r.kalemId) return r;
        const dusen = satirlar.filter((x) => x.kalemId === r.kalemId).reduce((t, x) => t + x.miktar, 0);
        return dusen > 0 ? { ...r, miktar: stokYuvarla(r.miktar - dusen) } : r;
      }).filter((r) => r.miktar > 0);
      return [...kalan, ...satirlar];
    });
    showToast(`${koli.kod} eklendi · ${satirlar.length} satır${siparis ? ` · ${siparis.siparisNo} (${yol})` : " · serbest"}${uyarilar.length ? ` · ⚠ ${uyarilar[0]}` : ""}`);
    return true;
  }


  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ background: "var(--erp-panel)", border: `2px solid ${ana}`, borderRadius: "var(--erp-r-md)", padding: "10px 12px", boxShadow: BOLUM_GOLGE }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <Receipt size={16} color={ana} />
          <span style={{ fontSize: 14, fontWeight: 700, color: ana }}>
            {alisMi ? "Cariden Alış Fişi" : "Cariye Satış Fişi"}
          </span>
          <span style={{ fontSize: 11, color: "var(--erp-text-2)" }}>
            {alisMi ? "mal stoğa girer, cariye borç yazılır" : "mal stoktan çıkar, cariye alacak yazılır"}
            {" · sipariş oluşturmaz"}
          </span>
          {/* PARA BİRİMİ VE DEFTER SAĞ ÜSTTE, KÜÇÜK (kullanıcı, 18 Eylül: "cari defteri ve
              p.birimini ufaltıp sağ üste koy"). İkisi de FİŞİN TAMAMINI ilgilendiren ayar, kalem
              kalem değişmiyor; alan satırında yer kaplıyor ve her fişte göze giriyorlardı. Asıl iş
              ürün/renk/miktar. */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
            <select value={paraBirimi} data-fis-pb="1"
              onChange={(e) => { setParaBirimi(e.target.value); setKParaBirimi(e.target.value); setParaBirimiElle(true); }}
              title="Fiş cariye bu para biriminde yazılır; farklı para birimindeki satırlar buna çevrilir"
              style={{ padding: "3px 6px", fontSize: 11, border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", background: "#fff" }}>
              {Object.keys(PARA_SEMBOLU).map((pb) => <option key={pb} value={pb}>{pb} {PARA_SEMBOLU[pb]}</option>)}
            </select>
            <select value={defter} data-fis-defter="1" onChange={(e) => setDefter(e.target.value)}
              title="Fişin yazılacağı cari defteri"
              style={{ padding: "3px 6px", fontSize: 11, border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", background: "#fff" }}>
              <option value="Genel">Genel</option>
              <option value="Resmi">Resmi</option>
              <option value="Muhasebe">Muhasebe (ikisine de)</option>
            </select>
          </div>
        </div>

        {/* `repeat(N, ...)` SABİT sütun sayısı demekti: beş alan × 125px = 625px, dar ekranda
            satır sarmalanmıyor, tüm pencere yana taşıyordu (telefonda Ödeme Şekli ekran dışında
            kalıyordu). `auto-fit` sütun sayısını genişliğe göre kendi seçer; geniş ekranda yine
            tek satır çıkar. */}
        {/* TOPARLANMIŞ ÜST SATIR (kullanıcı, 18 Eylül: "çok boş alan var, dağılmasına gerek yok,
            ekranı toparla"). `1fr` alanları ekran genişliğine YAYIYORDU: dört alan geniş ekranda
            400px'e kadar uzuyor, aralarında okunmayan boşluk kalıyordu. `max-content` alanı
            içeriği kadar tutuyor; dar ekranda `auto-fit` yine alt satıra sarıyor. */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
          {/* CARİ SEÇİMİ EN BAŞTA: fişin kime yazılacağı, tarihten de fiş numarasından da önce
              gelen karar. Depo'dan açıldığında malzemenin varsayılan tedarikçisi seçili gelir,
              kullanıcı başka bir cariye çevirebilir. */}
          {/* CARİ SEÇİCİ YALNIZ GEREKİRSE (kullanıcı, 18 Eylül: "cari içinden giriş yapıldığı için
              üstte cari adı var, tedarikçiyi kaldır"). Cari kartından açıldığında cari zaten belli
              ve başlıkta yazıyor; aynı bilgiyi ikinci kez seçtirmek satırı boşuna dolduruyordu.
              Depo/stok yolundan açıldığında cari boş gelir — o zaman seçici çıkar. */}
          {!seciliCariId && (
          <Field label={alisMi ? "Tedarikçi" : "Müşteri"}>
            <select
              value={seciliCariId}
              onChange={(e) => setSeciliCariId(e.target.value)}
              title={alisMi ? "Alışın yapılacağı cari" : "Satışın yapılacağı cari"}
              style={{ ...inputStyle, minWidth: 190 }}
            >
              <option value="">— Seçin —</option>
              {(cariler || [])
                .filter((c) => !c.pasif)
                .map((c) => <option key={c.id} value={c.id}>{c.unvan}</option>)}
            </select>
          </Field>
          )}
          <Field label="Fiş Tarihi" genislik={150}>
            <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Fiş No" genislik={160}>
            <input value={fisNo} onChange={(e) => setFisNo(e.target.value)} placeholder="Boşsa sistem üretir" style={inputStyle} />
          </Field>
          <Field label="Ödeme Şekli" genislik={140}>
            <select value={odemeSekli} onChange={(e) => setOdemeSekli(e.target.value)} style={inputStyle}>
              {ODEME_SEKILLERI.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          {cekSenet && (
            <Field label="Vade Tarihi" genislik={150}>
              <input type="date" value={vade} onChange={(e) => setVade(e.target.value)} style={inputStyle} />
            </Field>
          )}
          {/* PEŞİN KISIM. ÇEK/SENETTE GÖSTERİLMİYOR: orada kasadan para ÇIKMAZ, para vadesinde
              hareket eder ve çekler kendi defterinde takip ediliyor. */}
          {!cekSenet && (
            <>
              <Field label={tip === "Alış" ? "Peşin Ödendi (kasa/banka)" : "Peşin Tahsil (kasa/banka)"} genislik={200}>
                <select
                  value={pesinHesap}
                  onChange={(e) => {
                    setPesinHesap(e.target.value);
                    // Hesap seçilince tutar fişin TOPLAMIYLA doluyor: en sık durum peşinin
                    // tamamı. Kısmi ödeme isteyen üzerine yazıyor — sıfırdan doldurtmak, tam
                    // ödemeyi de elle yazdırmak demekti.
                    if (e.target.value) setPesinTutar(String(cevrimSonucu.toplam || ""));
                    else setPesinTutar("");
                  }}
                  title="Boş bırakılırsa para hareket etmez, yalnız cari borcu yazılır"
                  style={inputStyle}
                >
                  <option value="">Peşin yok (açık hesap)</option>
                  {((muhasebe && muhasebe.kasalar) || []).map((k) => (
                    <option key={`kasa:${k.id}`} value={`kasa:${k.id}`}>Kasa: {k.ad}</option>
                  ))}
                  {((muhasebe && muhasebe.bankalar) || []).map((b) => (
                    <option key={`banka:${b.id}`} value={`banka:${b.id}`}>Banka: {b.ad}</option>
                  ))}
                </select>
              </Field>
              {pesinHesap && (
                <Field label={`Peşin Tutar (${paraBirimi})`} genislik={130}>
                  <input
                    type="number" step="any" min="0"
                    value={pesinTutar}
                    onChange={(e) => setPesinTutar(e.target.value)}
                    title="Fişin tamamı peşin değilse buraya peşin kısmı yazın"
                    style={inputStyle}
                  />
                </Field>
              )}
            </>
          )}
        </div>
      </div>

      {/* ---- KALEM EKLEME ----
          İKİ SÜTUN (23 Eylül, v1.427.0 — kullanıcı: "masaüstü için ekran alt alta yığılmış, sağ
          taraf boş, toparla"). Geniş ekranda SOL sütun elle kalem girişi (ürün/renk/ölçü/fiyat →
          Kalemlere Ekle), SAĞ sütun hazır kaynaklardan ekleme (koli okut + fişteki koliler +
          Siparişten seç). İkisi ayrı iş: biri tek tek yazarak, öteki hazır olanı seçerek. Dar
          ekranda (<900px) tek sütuna iniyor — `minmax` + `auto-fit` ile, medya sorgusu olmadan. */}
      <div style={{ background: "#fff", border: BOLUM_KENAR, borderRadius: "var(--erp-r-md)", padding: 14, boxShadow: BOLUM_GOLGE }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text-2)", marginBottom: 10 }}>Kalem Ekle</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 18, alignItems: "start" }}>
        <div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10, alignItems: "flex-start" }}>
          {/* ÜRÜN — YAZARAK ARANIR (kullanıcı, 18 Eylül: "stok ve renk seçmeli ve yazarak da
              aratmak gerek"). Açılır listede 18 ürün varken bile aranan şeyi bulmak kaydırmayla
              oluyordu; 100 üründe imkânsız olur. `datalist` yazdıkça süzüyor ama dokunarak seçmeyi
              de bırakıyor. Seçilen etiket ürün kimliğine çevriliyor; aynı adda iki ürün varsa
              etiketteki kategori/birim ayırıyor. */}
          <Field label="Ürün">
            <input
              value={kUrunArama}
              data-urun-arama="1"
              list="fis-urun-listesi"
              placeholder="Ürün adı yazın ya da seçin"
              onChange={(e) => {
                const metin = e.target.value;
                setKUrunArama(metin);
                const bulunan = secilebilirler(stok, kUrunId)
                  .find((p) => secenekEtiketi(p, p.ad) === metin || p.ad === metin);
                if (bulunan) urunSec(bulunan.id);
                else if (kUrunId) { setKUrunId(""); setKRenk(""); setKMiktarlar({}); setKSeciliOlcu(""); }
              }}
              style={{ ...inputStyle, width: 190 }}
            />
            <datalist id="fis-urun-listesi">
              {secilebilirler(stok, kUrunId).map((p) => (
                <option key={p.id} value={secenekEtiketi(p, p.ad)} />
              ))}
            </datalist>
          </Field>
          {seciliUrun && !renkSorulmaz && (
            <Field label="Renk">
              {/* Renk de yazarak aranıyor: çok renkli hammaddede (deri) liste uzuyor. */}
              <input
                value={kRenk}
                data-renk-arama="1"
                list="fis-renk-listesi"
                placeholder="Renk yazın ya da seçin"
                onChange={(e) => { setKRenk(e.target.value); setKMiktarlar({}); setKSeciliOlcu(""); }}
                style={{ ...inputStyle, width: 130 }}
              />
              <datalist id="fis-renk-listesi">
                {renkSecenekleri.map((r) => <option key={r} value={r} />)}
              </datalist>
            </Field>
          )}
          {/* ÖLÇÜ RENGİN YANINDA (kullanıcı, 18 Eylül: "boyutu rengin yanına koy"). Ürün → renk →
              ölçü, seçim sırasıyla aynı hizada: göz soldan sağa akıyor, fiyat ve miktar sonra
              geliyor. Önce miktar kutularının yanındaydı ve seçim sırası kırılıyordu. */}
          {kRenk && olcuSecmeli && (
            <Field label={seciliUrun.olcuTipi || "Ölçü"}>
              <select value={kSeciliOlcu} data-olcu-secici="1"
                onChange={(e) => {
                  // Ölçü değişince eskisinin miktarı temizlenir: kapanan kutudaki sayı
                  // görünmez bir yerde beklemesin.
                  setKMiktarlar({});
                  setKSeciliOlcu(e.target.value);
                }}
                style={{ ...inputStyle, width: 130 }}>
                <option value="">{(seciliUrun.olcuTipi || "Ölçü").toLocaleLowerCase("tr-TR")} seçin</option>
                {bedenSecenekleri.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
          )}
          {kRenk && gosterilecekOlculer.length > 0 && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>
              Miktar
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {gosterilecekOlculer.map((b) => (
                  <span key={b} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: "var(--erp-text)" }}>{b || "—"}</span>
                    <input
                      type="number" step="any" min="0"
                      data-kalem-miktar={b || "tek"}
                      value={kMiktarlar[b] ?? ""}
                      onChange={(e) => setKMiktarlar({ ...kMiktarlar, [b]: e.target.value })}
                      className="mono"
                      // TEK SATIRA SIĞSIN (kullanıcı, 18 Eylül: "miktar da boyutun yanında olsun,
                      // tek satıra sığsın hepsi, gerekirse yazıları küçült"). Kutu 62→52,
                      // yazı 12→11; beden tipinde 5-6 kutu yan yana artık sarmalanmıyor.
                      style={{ width: 52, padding: "5px 4px", fontSize: 11, textAlign: "center", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)" }}
                    />
                    <span className="mono" style={{ fontSize: 9, color: "var(--erp-text-3)" }}>stok: {stokMiktari(kRenk, b)}</span>
                  </span>
                ))}
              </div>
            </label>
          )}
          <Field label={`Birim Fiyat (${kPbSembol})${seciliUrun && seciliUrun.birim ? ` / ${seciliUrun.birim}` : ""}`}>
            {/* step="any": reçete miktarları gibi kesirli birim fiyatlar (0,0125) `0.01` adımında
                reddediliyordu. */}
            <input type="number" step="any" min="0" data-kalem-fiyat="1" value={kFiyat} onChange={(e) => setKFiyat(e.target.value)} style={{ ...inputStyle, width: 120, width: 110 }} />
          </Field>
          {/* Para birimi FİYATIN YANINDA: ikisi tek bir bilgidir. */}
          <Field label="P.B.">
            <select value={kParaBirimi} onChange={(e) => setKParaBirimi(e.target.value)} style={{ ...inputStyle, width: 92 }}>
              {Object.keys(PARA_SEMBOLU).map((pb) => (
                <option key={pb} value={pb}>{pb} {PARA_SEMBOLU[pb]}</option>
              ))}
            </select>
          </Field>

          {/* MİKTAR, ürün/renk/fiyat ile AYNI SATIRDA. Ayrı bir bloktaydı: tek ölçülü malzemede
              (desi, kilo, adet) tek bir kutu için koca bir satır açılıyor, kullanıcı ekranda
              aşağı inip geri çıkıyordu. Çok ölçülü üründe kutular zaten sarmalanıp alt satıra
              geçiyor — dar ekranda da bozulmuyor. */}
        </div>

        {/* Asorti KENDİ SATIRINDA kaldı: seçici + set sayısı + düğmeden oluşuyor, miktar
            kutularının yanına sıkıştırılsaydı ikisi de okunmaz olurdu. */}
        {kRenk && bedenSecenekleri.length > 0 && (asortiler || []).length > 0 && (
          <AsortiUygulaKontrolu
            asortiler={asortiler}
            bedenSecenekleri={bedenSecenekleri}
            olcuTipi={seciliUrun && seciliUrun.olcuTipi}
            onUygula={(sonuc) => setKMiktarlar({ ...kMiktarlar, ...sonuc })}
          />
        )}

        <button
                          data-kalemlere-ekle="1" className="btn-primary" style={{ background: ana }} onClick={kalemEkle}>
          <Plus size={14} /> Kalemlere Ekle
        </button>
        </div>

        {/* SAĞ SÜTUN: hazır kaynaklardan ekleme (koli okut, fişteki koliler, siparişten seç).
            Başlık, soldaki "Kalem Ekle" ile aynı hizada — sütunun ne işe yaradığı ilk bakışta
            anlaşılsın; boş kaldığında da sütun boş bir alan gibi durmasın. */}
        <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text-2)" }}>
            {tip === "Satış" ? "Koliden / siparişten ekle" : "Siparişten ekle"}
          </div>

        {/* SİPARİŞTEN SEÇ (9b, 13 Eylül): bu carinin açık ALIŞ siparişlerinin kalemleri fişe alınır;
            satır siparişe bağlı yazılır (`siparis` + `kalemId`) → kayıtta o siparişin teslim alınanı
            artar, fiş silinince geri düşer (fisGeriAl hareketten okur). Sipariş kartındaki
            "Siparişten seç" ile aynı iş, aynı görünüm. */}
        {/* KOLİ OKUT (23 Eylül, v1.420.0 — kullanıcı: "koli okutulunca direkt cariyi seçip koliyi
            eklesin"). Satış fişinde: koli barkodu → cari boşsa kolininki seçilir → koli içeriği
            satırlara, her satır çözülen siparişe bağlı (237-koli-fis). Depo > Sevkiyat da aynı
            çözücüyü ve aynı kayıt kapısını kullanıyor — "ikisi aynı yere çıksın". */}
        {tip === "Satış" && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <BarkodGirdisi ikon={Truck} veriAdi="data-koli-okut" placeholder="Koli barkodu okutun ya da yazın" dugme="Koliyi ekle"
              onKod={(kod) => {
                const koli = (koliler || []).find((k) => (k.kod || "").toLocaleUpperCase("tr") === kod.toLocaleUpperCase("tr"));
                if (!koli) return showToast(`Koli bulunamadı: ${kod}`);
                koliyiFiseEkle(koli);
              }}
            />
            {/* FİŞTEKİ KOLİLER (23 Eylül, v1.423.0 — kullanıcı: "koli koli eklemesi, toplu adet ve koli
                no'larını da göstermesi lazım"). Her koli: no, çift, beden dağılımı; tek tek çıkarılabilir
                (koliye ait bütün satırlar birlikte gider — yarım koli sevk edilmez). */}
            {kalemler.some((k) => k.koliId) && (() => {
              const gruplar = new Map();
              kalemler.filter((k) => k.koliId).forEach((k) => {
                if (!gruplar.has(k.koliId)) gruplar.set(k.koliId, { kod: k.koliKod, cift: 0, bedenler: [] });
                const g = gruplar.get(k.koliId);
                g.cift = stokYuvarla(g.cift + (k.miktar || 0));
                g.bedenler.push(`${k.beden}:${k.miktar}`);
              });
              const toplam = [...gruplar.values()].reduce((t, g) => t + g.cift, 0);
              return (
                <div data-fis-koliler="1" style={{ fontSize: 11, border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-md)", background: "#fff", padding: "6px 8px" }}>
                  <b>{gruplar.size} koli · {stokYuvarla(toplam)} çift</b>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                    {[...gruplar.entries()].map(([id, g]) => (
                      <span key={id} data-fis-koli={g.kod} style={{ display: "inline-flex", gap: 4, alignItems: "center", padding: "2px 6px", border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-sm)" }}>
                        <b className="mono">{g.kod}</b> · {g.cift} çift
                        <span style={{ color: "var(--erp-text-3)" }}>({g.bedenler.join(" ")})</span>
                        <button type="button" title="Bu koliyi fişten çıkar" data-fis-koli-cikar={g.kod}
                          onClick={() => setKalemler((o) => o.filter((k) => k.koliId !== id))}
                          style={{ border: 0, background: "none", cursor: "pointer", padding: 0, color: "var(--erp-text-3)" }}>×</button>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* SATIŞTA DA (23 Eylül, v1.420.0 — kullanıcı: "cari içinden satış açınca siparişten seç
            butonu olsun, alış için de aynı mantık"). Blok tipe göre: alış fişine alış siparişleri,
            satış fişine satış siparişleri. Satırlar aynı biçimde siparişe bağlanıyor. */}
        {cari && (() => {
          // KALAN MİKTAR — VARLIK DEĞİL (23 Eylül, v1.426.0): eskiden "bu kalem fişte VAR MI"
          // diye bakıyordu (`!kalemler.some(f => f.kalemId === k.id)`). Bir koli kalemin yalnızca
          // BİR KISMINI taşıyabilir (152 çiftlik siparişte her koli 8 çift); tek koli eklenince o
          // kalem "fişte var" sayılıp TAMAMI bekleyen listesinden düşüyordu — kalan 144 çift
          // görünmez oluyordu. Artık fişteki bağlı satırların TOPLAM miktarı düşülüyor.
          const kalemKalani = (k) => {
            const eklenen = kalemler.filter((f) => f.kalemId === k.id).reduce((t, f) => t + (f.miktar || 0), 0);
            return stokYuvarla((k.miktar || 0) - (k.karsilanan || 0) - eklenen);
          };
          const acikSiparisler = (siparisler || []).filter((s) => s.tip === tip && s.cariId === cari.id && s.durum !== "İptal"
            && (s.kalemler || []).some((k) => kalemKalani(k) > 0));
          if (acikSiparisler.length === 0 && !siparistenSecAcik) return null;
          return (
            <div style={{ display: "grid", gap: 6 }}>
              <button type="button" className="btn-ghost" data-siparisten-sec="1" style={{ justifySelf: "start", padding: "4px 10px", fontSize: 11 }}
                onClick={() => setSiparistenSecAcik(!siparistenSecAcik)}
                title="Bu tedarikçinin açık alış siparişlerinden kalem al — satırlar siparişe bağlı yazılır, teslim alınan artar">
                <ClipboardList size={12} /> Siparişten seç ({acikSiparisler.length} açık {tip === "Alış" ? "alış" : "satış"} siparişi)
              </button>
              {siparistenSecAcik && acikSiparisler.map((s) => {
                const bekleyen = (s.kalemler || []).map((k) => ({ k, kalan: kalemKalani(k) })).filter((x) => x.kalan > 0);
                const bedenler = bedenSirala([...new Set(bekleyen.map((x) => x.k.beden || ""))]);
                const satirlar = [];
                bekleyen.forEach(({ k, kalan }) => {
                  const a = `${k.urunId}|${k.renk || ""}`;
                  let r = satirlar.find((x) => x.a === a);
                  if (!r) { r = { a, urunAd: k.urunAd, renk: k.renk || "", hucre: {} }; satirlar.push(r); }
                  r.hucre[k.beden || ""] = (r.hucre[k.beden || ""] || 0) + kalan;
                });
                return (
                  <div key={s.id} data-siparisten-sec-siparis={s.siparisNo} style={{ border: "1px solid #C9B99A", borderRadius: "var(--erp-r-md)", padding: 8, background: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <b className="mono" style={{ fontSize: 12 }}>{s.siparisNo}</b>
                      <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)" }}>{s.durum} · kalan {stokYuvarla(bekleyen.reduce((t, x) => t + x.kalan, 0))}</span>
                      {bekleyen.length > 0 && (
                      <button type="button" className="btn-primary" data-siparisten-ekle={s.siparisNo} style={{ marginLeft: "auto", padding: "3px 9px", fontSize: 11 }}
                        onClick={() => {
                          setKalemler((o) => [...o, ...bekleyen.map(({ k, kalan }) => ({
                            id: uid("fkalem"), urunId: k.urunId, urunAd: k.urunAd, birim: k.birim || "", renk: k.renk || "", beden: k.beden || "",
                            miktar: kalan, birimFiyat: k.birimFiyat || 0, paraBirimi: k.paraBirimi || "TRY",
                            kalemId: k.id, siparis: { id: s.id, siparisNo: s.siparisNo, rezervasyonSiparisId: s.rezervasyonSiparisId || null },
                          }))]);
                          showToast(`${s.siparisNo}: ${bekleyen.length} kalem fişe eklendi (siparişe bağlı)`);
                        }}>
                        <Plus size={11} /> {tip === "Satış" ? "Kolisiz kalanı ekle" : "Bu siparişin kalemlerini ekle"}
                      </button>
                      )}
                    </div>
                    {/* HAZIR KOLİLER BARKOD TARZINDA LİSTELENİYOR (23 Eylül, v1.426.0 — kullanıcı:
                        "Siparişten seçte tüm siparişi ekliyor, koli olarak listelesin, barkod
                        mantığında"). Her koli: kod, çift, beden dağılımı, tek tıkla ekle — koli
                        barkodu okutmuşçasına AYNI fonksiyon (`koliyiFiseEkle`) çalışıyor. Altındaki
                        matris artık yalnız KOLİYE GİRMEMİŞ (kolisiz) kalanı gösteriyor: eklenen her
                        koli `kalemId` taşıyor, `bekleyen` listesi onu otomatik düşürüyor. */}
                    {tip === "Satış" && (() => {
                      const siparisKolileri = (koliler || []).filter((kl) => (kl.durum || "Hazır") === "Hazır"
                        && !kalemler.some((f) => f.koliId === kl.id)
                        && (koliSiparisiniCoz(kl, siparisler, uretim).siparis || {}).id === s.id);
                      if (!siparisKolileri.length) return null;
                      const cift = (kl) => stokYuvarla((kl.kalemler || []).reduce((t, x) => t + (x.adet || 0), 0));
                      const koliIcerigi = (kl) => bedenSirala([...new Set((kl.kalemler || []).map((x) => x.beden))])
                        .map((b) => `${b}:${(kl.kalemler || []).filter((x) => x.beden === b).reduce((t, x) => t + (x.adet || 0), 0)}`).join(" ");
                      // ASORTİYE GÖRE GRUPLA: aynı beden dağılımındaki koliler tek satırda. 19 koli
                      // tek tek listeleniyordu; pratikte hepsi AYNI asorti oluyor (aynı üretimden
                      // çıkıyor) ve kullanıcı "şu kadar koli" diyor — kod kod seçmek istisna.
                      const gruplar = new Map();
                      siparisKolileri.forEach((kl) => {
                        const imza = koliIcerigi(kl);
                        if (!gruplar.has(imza)) gruplar.set(imza, { imza, cift: cift(kl), koliler: [] });
                        gruplar.get(imza).koliler.push(kl);
                      });
                      const toplamCift = stokYuvarla(siparisKolileri.reduce((t, kl) => t + cift(kl), 0));
                      return (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>
                              Hazır koliler: <b>{siparisKolileri.length}</b> koli · <b>{toplamCift}</b> çift
                            </span>
                            <button type="button" className="btn-ghost" data-siparis-koli-tumu={s.siparisNo}
                              style={{ padding: "2px 8px", fontSize: 11 }}
                              onClick={() => siparisKolileri.forEach((kl) => koliyiFiseEkle(kl))}>
                              Tümünü ekle
                            </button>
                          </div>
                          <div style={{ display: "grid", gap: 4 }}>
                            {[...gruplar.values()].map((g) => {
                              const acik = !!acikKoliGruplari[g.imza];
                              const adet = koliAdetleri[g.imza] === undefined ? "" : koliAdetleri[g.imza];
                              const ekleAdet = Math.max(1, Math.min(g.koliler.length, parseInt(adet, 10) || g.koliler.length));
                              return (
                                <div key={g.imza} data-koli-grup={g.imza} style={{ border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-sm)", padding: "4px 8px", background: "#fff" }}>
                                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", fontSize: 11 }}>
                                    <b>{g.koliler.length} koli</b>
                                    <span className="mono" style={{ color: "var(--erp-text-2)" }}>{g.cift} çift/koli</span>
                                    <span className="mono" style={{ color: "var(--erp-text-3)" }}>({g.imza})</span>
                                    {/* KAÇ KOLİ: boş bırakılırsa hepsi. Koliler kod sırasına göre alınır. */}
                                    <input type="number" min="1" max={g.koliler.length} value={adet}
                                      data-koli-grup-adet={g.imza} placeholder={String(g.koliler.length)}
                                      onChange={(e) => setKoliAdetleri((o) => ({ ...o, [g.imza]: e.target.value }))}
                                      style={{ width: 56, padding: "2px 6px", fontSize: 11, marginLeft: "auto" }} />
                                    <button type="button" className="btn-primary" data-koli-grup-ekle={g.imza}
                                      style={{ padding: "2px 8px", fontSize: 11 }}
                                      onClick={() => {
                                        g.koliler.slice(0, ekleAdet).forEach((kl) => koliyiFiseEkle(kl));
                                        setKoliAdetleri((o) => ({ ...o, [g.imza]: "" }));
                                      }}>
                                      <Plus size={10} /> {ekleAdet} koli ekle
                                    </button>
                                    <button type="button" className="btn-ghost" data-koli-grup-ac={g.imza}
                                      style={{ padding: "2px 6px", fontSize: 11 }}
                                      onClick={() => setAcikKoliGruplari((o) => ({ ...o, [g.imza]: !acik }))}>
                                      {acik ? "gizle" : "tek tek seç"}
                                    </button>
                                  </div>
                                  {acik && (
                                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                                      {g.koliler.map((kl) => (
                                        <button key={kl.id} type="button" data-siparis-koli-ekle={kl.kod} onClick={() => koliyiFiseEkle(kl)}
                                          style={{ display: "inline-flex", gap: 3, alignItems: "center", padding: "2px 6px", fontSize: 11,
                                            border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", background: "#fff", cursor: "pointer" }}>
                                          <Plus size={9} /><b className="mono">{kl.kod}</b>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                    {bekleyen.length > 0 && (
                    <table style={{ borderCollapse: "collapse" }}>
                      <thead><tr>
                        <th style={{ fontSize: 10, color: "var(--erp-text-2)", padding: "2px 6px", textAlign: "left" }}>Ürün</th>
                        <th style={{ fontSize: 10, color: "var(--erp-text-2)", padding: "2px 6px", textAlign: "left" }}>Renk</th>
                        {bedenler.map((b) => <th key={b} className="mono" style={{ fontSize: 10, color: "var(--erp-text-2)", padding: "2px 6px", textAlign: "center" }}>{b || "—"}</th>)}
                      </tr></thead>
                      <tbody>{satirlar.map((r) => (
                        <tr key={r.a}>
                          <td style={{ fontSize: 11, padding: "2px 6px", fontWeight: 600 }}>{r.urunAd}</td>
                          <td className="mono" style={{ fontSize: 11, padding: "2px 6px" }}>{olcuGoster(r.renk)}</td>
                          {bedenler.map((b) => <td key={b} className="mono" style={{ fontSize: 11, padding: "2px 6px", textAlign: "center" }}>{r.hucre[b] || "—"}</td>)}
                        </tr>
                      ))}</tbody>
                    </table>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
        </div>
        </div>
      </div>

      {/* ---- FİŞ KALEMLERİ ----
          MATRİS: satır = ürün+renk, sütun = beden. Düz liste aynı malzemeyi her beden için
          tekrar ederdi; beş bedenli bir alışta tek malzeme beş satır kaplardı. */}
      {kalemler.length === 0 ? (
        <EmptyState text="Fişte henüz kalem yok — yukarıdan ürün, renk ve miktar girip ekleyin." />
      ) : (() => {
        const gruplar = [];
        const index = {};
        kalemler.forEach((k) => {
          const anahtar = `${k.urunId}|${k.renk}`;
          if (!(anahtar in index)) {
            index[anahtar] = gruplar.length;
            gruplar.push({ anahtar, urunAd: k.urunAd, renk: k.renk, birim: k.birim, kalemler: [] });
          }
          gruplar[index[anahtar]].kalemler.push(k);
        });
        const tumBedenler = bedenSirala(Array.from(new Set(kalemler.map((k) => k.beden))));
        // KOLİDEN GELEN SATIRLAR AYRI GÖSTERİLİYOR (23 Eylül, v1.424.0 — kullanıcı: "koli içi miktar
        // ve koli adedi olarak detaylı; farklı asorti oldugunda alt satırda toplasın"). Her ürün+renk
        // grubu, koli içeriğindeki BEDEN DAĞILIMINA (asorti imzası) göre alt satırlara bölünüyor: aynı
        // dağılımdaki koliler TEK satırda toplanıyor (koli içi miktar × koli adet), farklı dağılım
        // ayrı satır. Koliye bağlı olmayan kalemler eskisi gibi tek, düzenlenebilir satırda kalıyor.
        const kolililerVarMi = kalemler.some((k) => k.koliId);
        function grubuBol(g) {
          const koliliKalemler = g.kalemler.filter((k) => k.koliId);
          const duzKalemler = g.kalemler.filter((k) => !k.koliId);
          const koliMap = new Map();   // koliId → { kod, bedenler: Map(beden→miktar), kalemler: [] }
          koliliKalemler.forEach((k) => {
            if (!koliMap.has(k.koliId)) koliMap.set(k.koliId, { kod: k.koliKod, bedenler: new Map(), kalemler: [] });
            const kk = koliMap.get(k.koliId);
            kk.bedenler.set(k.beden || "", (kk.bedenler.get(k.beden || "") || 0) + (k.miktar || 0));
            kk.kalemler.push(k);
          });
          const asortiGruplari = new Map();   // imza → { bedenler, koliKodlari, kalemler }
          koliMap.forEach((kk) => {
            const imza = [...kk.bedenler.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([b, m]) => `${b}:${m}`).join(",");
            if (!asortiGruplari.has(imza)) asortiGruplari.set(imza, { bedenler: kk.bedenler, koliKodlari: [], kalemler: [] });
            const ag = asortiGruplari.get(imza);
            ag.koliKodlari.push(kk.kod);
            ag.kalemler.push(...kk.kalemler);
          });
          return { koliAsortiGruplari: [...asortiGruplari.values()], duzKalemler };
        }
        return (
          <div style={{ background: "#fff", border: BOLUM_KENAR, borderRadius: "var(--erp-r-md)", padding: 14, boxShadow: BOLUM_GOLGE }}>
            {/* KALEMLERİN NEREDEN GELDİĞİ SÖYLENİYOR. 18 satırın kendiliğinden belirmesi,
                söylenmezse "ben bunları girmedim" sorusu doğurur. */}
            {ihtiyactanGelen > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10, padding: "8px 10px", background: "#F0F5EE", border: "1px solid #8FA888", borderRadius: "var(--erp-r-md)" }}>
                <Layers size={14} color="var(--erp-primary)" />
                <span style={{ fontSize: 12, color: "#2F4A2F" }}>
                  {/* Metin 12 Eylül'de değişti: fişe artık YALNIZ tıklanan ihtiyaç geliyor
                      (bkz. alisFisiAc). "Bu tedarikçinin eksiklerinden" demek yanlış olurdu. */}
                  <b>{ihtiyactanGelen} satır</b> Depo'da tıkladığınız açık ihtiyaçtan dolduruldu
                </span>
                <span style={{ fontSize: 11, color: "#5E7358" }}>
                  miktarlar değiştirilebilir, satırlar silinebilir
                </span>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ marginLeft: "auto", padding: "3px 10px", fontSize: 11 }}
                  title="İhtiyaçtan gelen satırların hepsini kaldır"
                  data-ihtiyac-temizle="1"
                  onClick={() => { setKalemler([]); setIhtiyactanGelen(0); }}
                >
                  <X size={12} /> Hepsini temizle
                </button>
              </div>
            )}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: 11, textAlign: "left", padding: "4px 8px", color: "var(--erp-text-2)" }}>ÜRÜN</th>
                    <th style={{ fontSize: 11, textAlign: "left", padding: "4px 8px", color: "var(--erp-text-2)" }}>RENK</th>
                    {tumBedenler.map((b) => (
                      <th key={b} className="mono" style={{ fontSize: 11, textAlign: "center", padding: "4px 8px", color: "var(--erp-text-2)", whiteSpace: "nowrap" }}>{olcuGoster(b, "Miktar")}</th>
                    ))}
                    {kolililerVarMi && (
                      <>
                        <th className="mono" style={{ fontSize: 11, textAlign: "right", padding: "4px 8px", color: "var(--erp-danger)", borderLeft: "1px dashed #C9B99A", whiteSpace: "nowrap" }}>KOLİ İÇ. MİK.</th>
                        <th className="mono" style={{ fontSize: 11, textAlign: "right", padding: "4px 8px", color: "var(--erp-danger)", whiteSpace: "nowrap" }}>KOLİ ADET</th>
                      </>
                    )}
                    <th style={{ fontSize: 11, textAlign: "right", padding: "4px 8px", color: "var(--erp-text-2)", borderLeft: kolililerVarMi ? undefined : "1px dashed #C9B99A", whiteSpace: "nowrap" }}>TOP. ADET</th>
                    <th style={{ fontSize: 11, textAlign: "right", padding: "4px 8px", color: "var(--erp-text-2)", whiteSpace: "nowrap" }}>BİRİM FİYAT</th>
                    <th style={{ fontSize: 11, textAlign: "center", padding: "4px 8px", color: "var(--erp-text-2)" }}>P.B.</th>
                    <th style={{ fontSize: 11, textAlign: "right", padding: "4px 8px", color: "var(--erp-text-2)" }}>TUTAR</th>
                  </tr>
                </thead>
                <tbody>
                  {gruplar.flatMap((g) => {
                    const { koliAsortiGruplari, duzKalemler } = grubuBol(g);
                    const altSatirlar = [];
                    koliAsortiGruplari.forEach((ag, i) => {
                      const koliIcMik = stokYuvarla([...ag.bedenler.values()].reduce((t, x) => t + x, 0));
                      altSatirlar.push({
                        tip: "koli", key: `${g.anahtar}|koli|${i}`, kalemler: ag.kalemler, bedenler: ag.bedenler,
                        koliIcMik, koliAdet: ag.koliKodlari.length,
                        toplamAdet: stokYuvarla(ag.kalemler.reduce((t, k) => t + k.miktar, 0)), koliKodlari: ag.koliKodlari,
                      });
                    });
                    if (duzKalemler.length > 0 || altSatirlar.length === 0) {
                      altSatirlar.push({ tip: "duz", key: `${g.anahtar}|duz`, kalemler: duzKalemler });
                    }
                    return altSatirlar.map((alt) => {
                      const fiyatlarFarkli = new Set(alt.kalemler.map((k) => k.birimFiyat)).size > 1;
                      const grupTutar = stokYuvarla(alt.kalemler.reduce((t, k) => t + k.miktar * k.birimFiyat, 0));
                      const grupPBler = Array.from(new Set(alt.kalemler.map((k) => k.paraBirimi || "TRY")));
                      const grupPB = grupPBler.length === 1 ? grupPBler[0] : "";
                      return (
                      <tr key={alt.key} style={{ borderTop: "1px solid #E4D8C0" }}>
                        <td style={{ padding: "6px 8px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                          {g.urunAd}
                          {/* Siparişe bağlı satır rozeti (9b): hangi alış siparişinin teslimi. */}
                          {[...new Set(alt.kalemler.map((k) => k.siparis && k.siparis.siparisNo).filter(Boolean))].map((no) => (
                            <span key={no} className="mono" data-fis-satir-siparis={no} title="Bu satır alış siparişine bağlı — kaydedilince teslim alınan artar"
                              style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: "var(--erp-r-pill)", background: "#3D6B8A1A", color: "var(--erp-info)" }}>{no}</span>
                          ))}
                        </td>
                        <td className="mono" style={{ padding: "6px 8px", fontSize: 12, whiteSpace: "nowrap" }}>{olcuGoster(g.renk)}</td>
                        {tumBedenler.map((b) => {
                          if (alt.tip === "koli") {
                            const m = alt.bedenler.get(b);
                            if (m === undefined) return <td key={b} style={{ padding: "4px 6px", textAlign: "center", color: "#CFC2A8", fontSize: 11 }}>—</td>;
                            // KOLİ İÇERİĞİ SALT OKUNUR (23 Eylül, v1.424.0): bu değer fiziksel kolinin
                            // içeriği — düzenlenirse fiş kolinin gerçek içeriğinden kopardı. Değiştirmek
                            // için koliyi üstteki listeden çıkarıp elle satır eklenir.
                            return (
                              <td key={b} style={{ padding: "4px 6px", textAlign: "center" }}>
                                <span className="mono" title={`${alt.koliAdet} kolinin her birinde ${m}`}
                                  style={{ display: "inline-block", minWidth: 40, padding: "3px 4px", fontSize: 11,
                                    border: "1px solid #E4D8C0", borderRadius: "var(--erp-r-sm)", background: "#F7F1E3", color: "var(--erp-text-2)" }}>
                                  {m}
                                </span>
                              </td>
                            );
                          }
                          const k = alt.kalemler.find((x) => x.beden === b);
                          if (!k) return <td key={b} style={{ padding: "4px 6px", textAlign: "center", color: "#CFC2A8", fontSize: 11 }}>—</td>;
                          return (
                            <td key={b} style={{ padding: "4px 6px", textAlign: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                                <input
                                  key={`${k.id}-${k.miktar}`}
                                  type="number" step="any" min="0"
                                  defaultValue={k.miktar}
                                  data-fis-miktar={`${g.renk}|${b}`}
                                  title={k.hazir ? `Hazır ${k.hazir}` : undefined}
                                  onBlur={(e) => {
                                    const yeni = parseFloat(e.target.value);
                                    if (!(yeni > 0) || yeni === k.miktar) return;
                                    kalemDuzenle(k.id, "miktar", yeni);
                                  }}
                                  className="mono"
                                  style={{ width: 52, padding: "3px 4px", fontSize: 11, border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", textAlign: "center" }}
                                />
                                <button onClick={() => kalemSil(k.id)} title="Bu bedeni fişten çıkar"
                                  style={{ border: "none", background: "none", color: "#A6957A", cursor: "pointer", display: "flex", padding: 0 }}>
                                  <X size={10} />
                                </button>
                              </div>
                            </td>
                          );
                        })}
                        {/* KOLİ İÇİ MİKTAR × KOLİ ADET (23 Eylül, v1.424.0 — kullanıcı: "koli içi miktar
                            ve koli adedi olarak detaylı"). Yalnız bu fişte koli varsa sütunlar görünür;
                            düz satırda "—" — o satırın koli karşılığı yok. */}
                        {kolililerVarMi && (
                          <>
                            <td className="mono" style={{ padding: "6px 8px", textAlign: "right", color: "var(--erp-text-2)", borderLeft: "1px dashed #C9B99A", whiteSpace: "nowrap" }}>
                              {alt.tip === "koli" ? alt.koliIcMik : "—"}
                            </td>
                            <td className="mono" style={{ padding: "6px 8px", textAlign: "right", color: "var(--erp-text-2)", whiteSpace: "nowrap" }}
                              title={alt.tip === "koli" ? alt.koliKodlari.join(", ") : undefined}>
                              {alt.tip === "koli" ? alt.koliAdet : "—"}
                            </td>
                          </>
                        )}
                        {/* TOPLAM ADET — bedenlere dağılmış miktarın satır toplamı. Matriste
                            her beden ayrı hücrede duruyor; "bu maldan toplam kaç aldım"
                            sorusunun cevabı için kullanıcı hücreleri kafadan toplamak
                            zorundaydı. */}
                        <td className="mono" style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", borderLeft: kolililerVarMi ? undefined : "1px dashed #C9B99A" }}>
                          {alt.tip === "koli" ? alt.toplamAdet : stokYuvarla(alt.kalemler.reduce((t, k) => t + k.miktar, 0))} {g.birim}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right" }}>
                          {alt.kalemler.length === 0 ? "—" : fiyatlarFarkli ? (
                            <span title="Bu gruptaki bedenler farklı birim fiyatta — hücreleri ayrı ayrı düzenleyin" style={{ fontSize: 10, color: "var(--erp-warn)" }}>farklı</span>
                          ) : (
                            <input
                              key={`${alt.key}-${alt.kalemler[0].birimFiyat}`}
                              type="number" step="any" min="0"
                              data-fis-satir-fiyat={alt.key}
                              defaultValue={alt.kalemler[0].birimFiyat}
                              onBlur={(e) => {
                                const yeni = parseFloat(e.target.value);
                                if (!(yeni >= 0) || yeni === alt.kalemler[0].birimFiyat) return;
                                alt.kalemler.forEach((k) => kalemDuzenle(k.id, "birimFiyat", yeni));
                              }}
                              className="mono"
                              style={{ width: 70, padding: "3px 5px", fontSize: 12, border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", textAlign: "right" }}
                            />
                          )}
                          {/* SON ALIŞ NOTU (kullanıcı, 12 Eylül): bu ürün+renk son ne kadara alındı.
                              Aynı rengin alışı yoksa ürünün herhangi bir rengi. Girilen fiyat
                              sondan farklıysa turuncu — fark ekranda, kaydetmeden önce görülsün. */}
                          {tip === "Alış" && alt.kalemler.length > 0 && (() => {
                            const ilk = alt.kalemler[0];
                            const son = (sonAlisFiyatlari(cariler, ilk.urunAd, { renk: ilk.renk, sinir: 1 })[0]
                              || sonAlisFiyatlari(cariler, ilk.urunAd, { sinir: 1 })[0]) || null;
                            if (!son) return null;
                            const ayniBirim = (grupPB || ilk.paraBirimi || "TRY") === son.paraBirimi;
                            const farkli = ayniBirim && !fiyatlarFarkli && Math.abs((ilk.birimFiyat || 0) - son.fiyat) > 0.005;
                            const tarih = /^\d{4}-\d{2}-\d{2}/.test(son.tarih) ? `${son.tarih.slice(8, 10)}.${son.tarih.slice(5, 7)}` : son.tarih;
                            return (
                              <div data-son-alis={ilk.urunAd} title={`Son alış: ${son.cariAd} · ${son.fisNo}${son.renk ? ` · ${son.renk}` : ""} · ${son.miktar} ${son.birim}`}
                                style={{ fontSize: 10, marginTop: 2, whiteSpace: "nowrap", color: farkli ? "var(--erp-warn)" : "var(--erp-text-3)", fontWeight: farkli ? 700 : 400 }}>
                                son {son.fiyat.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {PARA_SEMBOLU[son.paraBirimi] || son.paraBirimi} · {tarih}
                                {/* Bu rengin alışı yoksa başka rengin fiyatı: hangi renk olduğu yazılıyor. */}
                                {String(son.renk || "") !== String(ilk.renk || "") && son.renk ? ` (${son.renk})` : ""}
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ padding: "4px 6px", textAlign: "center" }}>
                          {/* Para birimi SATIR BAZINDA. Grup içindeki bedenler farklı para
                              biriminde kalmışsa (elle karıştırılmışsa) seçici gösterilmez —
                              tek bir kutunun iki değeri birden temsil etmesi yalan olurdu. */}
                          {alt.kalemler.length === 0 ? null : grupPB ? (
                            <select
                              value={grupPB}
                              onChange={(e) => alt.kalemler.forEach((k) => kalemDuzenle(k.id, "paraBirimi", e.target.value))}
                              className="mono"
                              style={{ padding: "3px 4px", fontSize: 11, border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", background: "#fff" }}
                            >
                              {Object.keys(PARA_SEMBOLU).map((pb) => <option key={pb} value={pb}>{pb}</option>)}
                            </select>
                          ) : (
                            <span title="Bu gruptaki bedenler farklı para biriminde" style={{ fontSize: 10, color: "var(--erp-warn)" }}>karışık</span>
                          )}
                        </td>
                        <td className="mono" style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>
                          {grupTutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {grupPB ? (PARA_SEMBOLU[grupPB] || grupPB) : "—"}
                        </td>
                      </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 10, textAlign: "right" }}>
              {/* Ara toplamlar yalnızca birden çok para birimi varsa gösterilir; tek para
                  birimliyse çevrim diye bir şey yok, iki kez aynı sayıyı yazmanın anlamı yok. */}
              {toplamlar.length > 1 && (
                <div className="mono" style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
                  {toplamlar.map(([pb, t], i) => (
                    <span key={pb}>
                      {i > 0 && <span style={{ color: "var(--erp-text-3)" }}> + </span>}
                      {t.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {PARA_SEMBOLU[pb] || pb}
                    </span>
                  ))}
                </div>
              )}

              {/* KUR KUTULARI — Muhasebe'deki güncel kur önerilir, kullanıcı değiştirebilir.
                  Fişe girilen kur kaydın bir parçasıdır: kurlar sonradan değişse de bu fişin
                  tutarı kaymaz. */}
              {cevrilecekler.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", marginTop: 6 }}>
                  {kurAnahtarlari.map((yp) => (
                    <label key={yp} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>
                      1 {yp} =
                      <input
                        type="number" step="0.0001" min="0"
                        value={kayitKurlari[yp] !== undefined ? kayitKurlari[yp] : ((kurlar || {})[yp] ?? "")}
                        onChange={(e) => {
                          const n = parseFloat(e.target.value);
                          setKayitKurlari((o) => ({ ...o, [yp]: Number.isFinite(n) && n > 0 ? n : e.target.value }));
                        }}
                        placeholder="kur?"
                        title="Muhasebe'deki güncel kurdan öneriliyor — değiştirebilirsiniz"
                        className="mono"
                        style={{ width: 72, padding: "3px 5px", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-sm)", fontSize: 11 }}
                      />
                      TRY
                    </label>
                  ))}
                </div>
              )}

              <div className="mono" style={{ marginTop: 6, fontSize: 15, fontWeight: 700, color: cevrimEksik ? "var(--erp-warn)" : ana }}>
                {cevrimEksik ? (
                  <>Kur eksik: {cevrimSonucu.eksikler.join(", ")} → {paraBirimi}</>
                ) : (
                  <>Fiş Toplamı: {cevrimSonucu.toplam.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {pbSembol}</>
                )}
              </div>
              {cevrilecekler.length > 0 && !cevrimEksik && (
                <div style={{ fontSize: 10, fontWeight: 400, color: "var(--erp-text-2)", marginTop: 2 }}>
                  Farklı para birimindeki satırlar {paraBirimi} karşılığına çevrildi; cariye tek hareket yazılır.
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <div style={{ background: "#fff", border: "1px solid #C9B99A", borderRadius: "var(--erp-r-md)", padding: 14 }}>
        <Field label="Açıklama">
          <input
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            placeholder={`Opsiyonel — boş kalırsa "${alisMi ? "Cariden Alış" : "Cariye Satış"} fişi" yazılır`}
            style={inputStyle}
          />
        </Field>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {koliUyarilari.length > 0 && (
          <div data-fis-koli-uyarisi="1" style={{ flexBasis: "100%", fontSize: 12, color: "var(--erp-danger)", background: "#FBEFEA", border: "1px solid #E4B8A8", borderRadius: "var(--erp-r-md)", padding: "6px 10px" }}>
            ⚠ Bu mal kolide. Koliyi okutmadan düz satarsanız stok düşer ama koliler "Hazır" kalır.
            {" "}{koliUyarilari.join(" · ")}
          </div>
        )}
        {/* ONAY PANELİ (23 Eylül, v1.431.0): kaydetmeden önce stok etkisinin özeti. Sipariş
            kartındaki alış teslim formundan taşındı — orada kullanıcının isteğiyle konmuştu ve
            alış tek ekrana geçerken kaybolmaması istendi. Matris (ürün satır, beden sütun) proje
            kuralı: düz liste beş bedenli modeli beş kez yazar, asıl soru tekrarın altında kaybolur.
            VERİ HATASI BARİYERİ: kalemin ürünü stokta tam olarak bir kez bulunmuyorsa kayıt
            engelleniyor — yoksa hareket hiçbir karta işlemez ya da yanlış karta işler. */}
        {onayGoster && (() => {
          const isaret = alisMi ? "+" : "-";
          const kontrollu = kalemler.map((k) => ({
            k, eslesenSayisi: (stok || []).filter((p) => p.id === k.urunId).length,
          }));
          const hataliVarMi = kontrollu.some((x) => x.eslesenSayisi !== 1);
          const ix = {};
          const satirlar = [];
          kontrollu.forEach(({ k }) => {
            const a = `${k.urunId}|${k.renk || ""}`;
            if (!(a in ix)) { ix[a] = satirlar.length; satirlar.push({ ad: k.urunAd, renk: k.renk || "", birim: k.birim || "", hucreler: {}, toplam: 0 }); }
            const st = satirlar[ix[a]];
            st.hucreler[k.beden || ""] = stokYuvarla((st.hucreler[k.beden || ""] || 0) + (k.miktar || 0));
            st.toplam = stokYuvarla(st.toplam + (k.miktar || 0));
          });
          const matris = satirlar.filter((r) => Object.keys(r.hucreler).length > 1);
          const tekil = satirlar.filter((r) => Object.keys(r.hucreler).length <= 1);
          const bedenler = bedenSirala(Array.from(new Set(matris.flatMap((r) => Object.keys(r.hucreler)))));
          const hatalilar = kontrollu.filter((x) => x.eslesenSayisi !== 1);
          return (
            <div data-fis-onay="1" style={{ flexBasis: "100%", background: "var(--erp-orange-bg)", border: "1.5px solid #E1611F",
              borderRadius: "var(--erp-r-md)", padding: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-warn)", marginBottom: 6 }}>
                Şunu onaylıyor musunuz? Aşağıdaki ürünlerin stoğu değişecek:
              </div>
              {cari && (
                <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginBottom: 6 }}>
                  <b>{cari.unvan}</b> · Cari hareketi <b>{defter === "Muhasebe" ? "hem Genel hem Resmi deftere" : `${defter} defterine`}</b> işlenecek.
                </div>
              )}
              <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
                {matris.length > 0 && (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ fontSize: 10, fontWeight: 700, color: "var(--erp-warn)", textAlign: "left", padding: "2px 8px 2px 0" }}>ÜRÜN</th>
                          {bedenler.map((b) => (
                            <th key={b} className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-warn)", textAlign: "center", padding: "2px 7px" }}>{b || "—"}</th>
                          ))}
                          <th className="mono" style={{ fontSize: 10, fontWeight: 700, color: "var(--erp-warn)", textAlign: "right", padding: "2px 0 2px 10px" }}>TOP.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matris.map((r, ri) => (
                          <tr key={ri} data-fis-onay-satir={r.ad}>
                            <td style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px 2px 0", whiteSpace: "nowrap" }}>
                              {r.ad}<span className="mono" style={{ fontSize: 11, fontWeight: 400, color: "#7A3B22" }}> · {r.renk}</span>
                            </td>
                            {bedenler.map((b) => (
                              <td key={b} className="mono" style={{ fontSize: 12, textAlign: "center", padding: "2px 7px", color: r.hucreler[b] ? "#221B14" : "#B9A88C" }}>
                                {r.hucreler[b] ? `${isaret}${r.hucreler[b]}` : "–"}
                              </td>
                            ))}
                            <td className="mono" style={{ fontSize: 12, fontWeight: 700, textAlign: "right", padding: "2px 0 2px 10px", whiteSpace: "nowrap" }}>
                              {isaret}{r.toplam} <span style={{ fontSize: 10, fontWeight: 400, color: "#7A3B22" }}>{r.birim}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {tekil.map((r, ri) => (
                  <div key={ri} data-fis-onay-satir={r.ad} className="mono" style={{ fontSize: 12 }}>
                    <b>{r.ad}</b>{r.renk ? ` · ${r.renk}` : ""}: {isaret}{r.toplam} {r.birim}
                  </div>
                ))}
                {hatalilar.map((x, i) => (
                  <div key={i} className="mono" style={{ fontSize: 11, color: "var(--erp-warn)", fontWeight: 700 }}>
                    ⚠ {x.k.urunAd} · {x.k.renk} {x.k.beden} —{" "}
                    {x.eslesenSayisi === 0 ? "stokta bu ürün bulunamadı!" : `stokta bu id'ye sahip ${x.eslesenSayisi} ürün var — veri hatası!`}
                  </div>
                ))}
              </div>
              {hataliVarMi && (
                <div style={{ fontSize: 12, fontWeight: 700, color: "#9C3D3D", marginBottom: 8, padding: "6px 8px", background: "#FCEAEA", borderRadius: "var(--erp-r-sm)" }}>
                  ⚠ Yukarıdaki veri hatası nedeniyle kaydetme engellendi. Sorunlu kalemi fişten çıkarıp
                  yalnız hatasız kalemleri kaydedin — sorunlu kaydı bildirin.
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" data-fis-onay-evet="1" className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }}
                  onClick={kaydetOnayli} disabled={hataliVarMi}>
                  Evet, Onayla ve Kaydet
                </button>
                <button type="button" data-fis-onay-vazgec="1" className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}
                  onClick={() => setOnayGoster(false)}>
                  Vazgeç, Düzenlemeye Dön
                </button>
              </div>
            </div>
          );
        })()}
        <button className="btn-primary btn-save" data-fis-kaydet="1" style={{ background: ana }} disabled={kalemler.length === 0 || cevrimEksik || !seciliCariId} onClick={kaydet}>
          <Save size={14} /> {alisMi ? "Alış Fişini Kaydet" : "Satış Fişini Kaydet"}
        </button>
        <button className="btn-ghost" data-fis-vazgec="1" onClick={onVazgec}><X size={14} /> Vazgeç</button>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--erp-text-2)", alignSelf: "center" }}>
          {cari ? `${cari.unvan} · ${kalemler.length} kalem` : ""}
        </span>
      </div>
    </div>
  );
}

