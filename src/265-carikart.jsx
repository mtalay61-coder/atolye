function CariCard({ onFiseGitNo, muhasebe, kurlar, onMuhasebeHareketi, showToast, cari, acik, onAcKapa, bakiye, genelBakiye, resmiBakiye, onAddHareket, onFisSil, onRemove, onFieldChange, onFieldsChange, siparisler, onGoToSiparis, stok, firmaBilgileri, tanimlarProsesler, tanimlarAraProsesler, onBagliProsesToggle, onBarkodOtomatikAta, tumCariler, onStokFisiAc, tanimlarFiyatGruplari, onPencereAc, onCekEkle }) {
  // Pasife al / aktife al — başlıktaki ikon ve kart altındaki yazılı düğme aynı yoldan.
  // Bildirim: liste Aktif/Pasifler diye ayrı olduğundan kart listeden "kayboluyor"; nereye
  // gittiği söylenmezse silindi sanılıyor.
  const pasifDegistir = () => {
    onFieldChange(cari.id, "pasif", !cari.pasif);
    if (showToast) showToast(cari.pasif
      ? `"${cari.unvan}" yeniden aktif — seçim listelerinde görünür`
      : `"${cari.unvan}" pasife alındı — geçmişi duruyor, yeni işlemlerde seçilemez. Pasifler sekmesinden geri alınabilir`);
  };
  const [kodAtamaProsesSecim, setKodAtamaProsesSecim] = useState("");
  // Açıklık durumu ARTIK ÜST BİLEŞENDE: aynı anda tek kart açık kalsın diye.
  const open = acik;
  const setOpen = (v) => { const hedef = typeof v === "function" ? v(acik) : v; if (hedef !== acik) onAcKapa(); };
  const [duzenleModu, setDuzenleModu] = useState(false);
  const [duzenleUnvan, setDuzenleUnvan] = useState(cari.unvan);
  const [duzenleTip, setDuzenleTip] = useState(cari.tip);
  const [duzenleParaBirimi, setDuzenleParaBirimi] = useState(cari.paraBirimi || "TRY");
  const [cardTab, setCardTab] = useState("hareketler"); // "hareketler" | "siparisler"
  // KART AÇILINCA DÜZENLEME ALANLARI GİZLİ. Telefon/vergi no/adres/fotoğraf ve personelin barkod
  // + proses ayarları kayıt sırasında giriliyor; kart günlük işte HAREKETLER için açılıyor.
  // Bu alanları hep açık tutmak ekranın üçte birini alıp asıl içeriği (ekstre) aşağı itiyordu.
  // Özet bilgi zaten başlıkta (ad · tip · proses · barkod). Değiştirmek gerektiğinde açılır.
  // Tek düzenleme modu (20 Eylül): iletişim alanları da başlıktaki kalemle açılır.
  const duzenleAcik = duzenleModu;
  const [defterFiltre, setDefterFiltre] = useState("Genel"); // "Tümü" | "Genel" | "Resmi"
  // SÜTUN BAZLI FİLTRE — başlıkların altındaki arama satırı. Üstteki defter/para birimi sekmeleri
  // "hangi hareket kümesine bakıyorum" sorusunu, bu satır ise "o küme içinde neyi arıyorum"u çözer.
  // İkisi ayrı katmandır ve birlikte çalışır.
  const [kolonFiltre, setKolonFiltre] = useState({ tarih: "", aciklama: "", borc: "", alacak: "" });
  // SADE GÖRÜNÜM (23 Eylül, v1.435.0 — kullanıcı: "cari hareketleri detaysız da göstersin, şu anki
  // hâli kalsın; tek satıra sığacak bilgiler yeterli"). Tercih TARAYICIDA saklanıyor: ekstreye her
  // girişte yeniden seçmek gerekmesin. Varsayılan DETAYLI — mevcut davranış değişmiyor.
  const [sadeGorunum, setSadeGorunum] = useState(() => {
    try { return window.localStorage.getItem("cari:ekstre-sade") === "1"; } catch (e) { return false; }
  });
  function sadeGorunumDegistir(yeni) {
    setSadeGorunum(yeni);
    try { window.localStorage.setItem("cari:ekstre-sade", yeni ? "1" : "0"); } catch (e) { /* yazılamazsa tercih bu oturumda kalır */ }
  }
  const kolonFiltreAktif = Object.values(kolonFiltre).some((v) => String(v).trim() !== "");
  const [pbFiltre, setPbFiltre] = useState("Tümü"); // Defter altında ikinci kademe: para birimine göre filtre
  const [showHareket, setShowHareket] = useState(false);
  const [hareketTipi, setHareketTipi] = useState(null); // "Alış" | "Satış" | "Ödeme" | "Tahsilat"
  const [silOnayGoster, setSilOnayGoster] = useState(false);
  // Alış ve Satış HER cari tipinde açık. Tipe göre kısıtlamak (tedarikçiden yalnızca alınır,
  // müşteriye yalnızca satılır) kâğıt üzerinde düzenli görünüyordu ama atölye gerçeğine uymuyor:
  // müşteriden mal iade alınır, tedarikçiye fazla malzeme geri satılır, personele malzeme verilir.
  // Kullanıcıyı doğru işlemi yapmak için cari tipini değiştirmeye zorlamak, tip alanını da bozar.
  const stokluTipler = ["Alış", "Satış"];
  const [hForm, setHForm] = useState(emptyHareket());

  function emptyHareket() {
    return {
      tarih: bugunYerel(), yon: "Borç", tutar: "", odemeSekli: "Nakit", vade: "", fisNo: "",
      aciklama: "", defter: "Genel",
      // CARİNİN KENDİ PARA BİRİMİ (kullanıcı, 9 Eylül). Sabit "TRY" idi: dolarla çalışan bir
      // cariye her hareket girişinde para birimi elle düzeltiliyordu. Kullanıcı yine
      // değiştirebilir — bu bir varsayılan, dayatma değil.
      paraBirimi: cari.paraBirimi || "TRY",
      // "kasa:<id>" | "banka:<id>" | "" — paranın nereye yazılacağı (yalnız tahsilat/ödemede).
      hesap: "",
      // Elle yazılan kur (boşsa tutarlardan türetiliyor).
      kurGirdi: "",
      // Hesabın KENDİ para birimindeki tutar. Cari hareketiyle aynı birimdeyse boş kalır ve
      // `tutar` kullanılır; farklıysa kullanıcı buraya gerçekte hareket eden parayı yazar.
      hesapTutar: "",
      // ÇEK AYRINTILARI ayrı bir alt nesnede. Hareketin kök alanlarına serpiştirmek, çek olmayan
      // hareketlerde altı boş alan taşımak demekti; ayrıca "bu banka alanı neyin bankası" sorusunu
      // doğuruyordu. Tek nesne hâlinde `ek.cek` olarak saklanıyor — bulut şemasında yeni sütun
      // gerekmiyor, `ek` zaten JSON.
      cek: { banka: "", sube: "", cekNo: "", iban: "", kesideci: "", sahiplik: "Kendi", not: "" },
    };
  }

  // Yön dört tipin hepsinde `hareketYonu`dan geliyor — fiş yollarıyla AYNI kural.
  // Satış/Ödeme bakiyeyi artırır, Alış/Tahsilat azaltır. Kullanıcı sadece anlamlı düğmeye basar;
  // teknik "yön" kavramıyla uğraşmaz. Bu form eskiden Alış'ı da "Borç" yazıyordu ve alış ile
  // satış aynı yöne gidiyordu.
  function hareketTipiSec(tip) {
    setHareketTipi(tip);
    setHForm({ ...emptyHareket(), yon: hareketYonu(tip) });
    setShowHareket(true);
  }

  function submitHareket() {
    const tutar = parseFloat(hForm.tutar);
    if (!tutar || tutar <= 0) return;
    const cekAyrintiliMi = cekSenet && !!(hForm.cek.cekNo || hForm.cek.banka || hForm.cek.kesideci);
    const ortak = {
      tarih: hForm.tarih,
      // YÖN TEK KURALDAN: form "Ödeme/Tahsilat/Alış/Satış" diyor, yönü `hareketYonu` çeviriyor.
      // Elle seçilen `hForm.yon` yalnız serbest (tipsiz) girişte kullanılıyor.
      yon: hareketTipi ? hareketYonu(hareketTipi) : hForm.yon,
      tutar,
      paraBirimi: hForm.paraBirimi || "TRY",
      odemeSekli: hForm.odemeSekli,
      // Yalnızca çek/senet hareketinde yazılıyor: boş bir `cek` nesnesini her harekete iliştirmek
      // kaydı şişirir ve "çeki var mı" sorusunu belirsizleştirirdi.
      cek: cekAyrintiliMi ? { ...hForm.cek } : undefined,
      vade: hForm.vade,
      // Kullanıcının yazdığı numara (tedarikçinin gerçek fiş numarası) varsa o korunur.
      // BOŞSA BURADA ÜRETİLMEZ: numara sıralı ve işlem tipine göre ön ekli (THS-, ODM-…) olacak,
      // bunun için BÜTÜN carilerdeki numaraları görmek gerekiyor. O bilgi huninin elinde.
      fisNo: hForm.fisNo.trim() || "",
      // Huninin doğru ön eki seçebilmesi için işlem tipi kayda giriyor.
      islemTipi: hareketTipi || null,
      // Aciklama boş bırakılırsa, hangi butonla (Alış/Satış/Ödeme/Tahsilat) girildiği otomatik eklenir —
      // "yon" alanı (Borç/Tahsilat) tek başına Alış'ı Satış'tan, Ödeme'yi Tahsilat'tan ayırt edemediği
      // için bu bilgi hareket geçmişinde kaybolmasın diye.
      // HANGİ KASAYA/BANKAYA İŞLENDİĞİ AÇIKLAMAYA GİRİYOR (kullanıcı bildirdi, 6 Eylül: "bazılarında
      // hangi kasaya işlendiği yazılı, bazılarında yazılmamış").
      //
      // Muhasebe ekranından girilen hareket bunu zaten yazıyordu ("Tahsilat (TL Kasa)"); cari
      // kartından girilen yazmıyordu. Aynı bilgi iki yoldan girilince biri hesabı söylüyor,
      // diğeri söylemiyordu — ekstreye bakan kişi paranın nereye gittiğini yalnız bazı
      // satırlarda görebiliyordu.
      aciklama: (() => {
        const yazi = hForm.aciklama.trim() || hareketTipi || "";
        const hesapAd = paraHareketi && seciliHesap ? seciliHesap.ad.replace(/^(Kasa|Banka): /, "") : "";
        return hesapAd ? `${yazi} (${hesapAd})` : yazi;
      })(),
    };
    // İKİ DAL DA AYNI ŞEYİ DÖNDÜRÜYORDU. İkiz kayıt kaldırıldığında (7t) bu blok yarım kalmış;
    // `resmiId` üretilip hiç kullanılmıyordu. Defter artık tek alan, dallanmaya gerek yok.
    //
    // PARA HAREKETİNDE KASA/BANKA DA YAZILIYOR (kullanıcı, 6 Eylül: "cariden ödeme/tahsilatta da
    // kasa banka seçilmesi gerekli, ödemenin nereye yazılacağı ile alakalı"). Bağ `muhasebeBagId`
    // ile kuruluyor — fişteki peşin ayağın ve kasa ekranından girilen hareketin kullandığı bağın
    // aynısı; üç yol da aynı çifti üretiyor.
    // ÇEVRİMDE HESAP TUTARI ZORUNLU: boş bırakılırsa kasaya sıfır yazılır ve para kaybolur.
    if (paraHareketi && hForm.hesap && cevrimGerekli && !(parseFloat(hForm.hesapTutar) > 0)) {
      showToast(`Hesaba işlenecek tutarı girin (${seciliHesap.pb})`);
      return;
    }
    // KASA/BANKA ZORUNLU (kullanıcı, 17 Eylül: "cariden kasa seçtirmeden giriş çıkış yapıyor,
    // tutar hangi deftere yazılıyor?").
    //
    // Seçim opsiyoneldi: boş bırakılınca YALNIZ cari hareketi yazılıyordu. Para cari ekstresinde
    // görünüyor ama hiçbir kasada/bankada görünmüyordu — kasa bakiyesi gerçeği yansıtmıyordu ve
    // "bu para nereye girdi" sorusunun cevabı kayıtta yoktu. Ödeme/tahsilat bir PARA hareketidir;
    // mutlaka bir hesaba girer ya da bir hesaptan çıkar.
    if (paraHareketi && !hForm.hesap) {
      showToast(uygunHesaplar.length === 0
        ? `${hForm.paraBirimi} hesabı tanımlı değil — Kasa & Banka ekranından kasa/banka açın, sonra kaydedin`
        : `${hareketTipi === "Tahsilat" ? "Paranın girdiği" : "Paranın çıktığı"} kasayı/bankayı seçin`);
      return;
    }
    const bagId = paraHareketi && hForm.hesap ? uid("mhbag") : null;
    // `fisNo` yayılan `ortak` nesnesinde var; kullanıcı boş bıraktıysa BOŞ gider ve numarayı huni
    // (`addCariHareketFromStok`) üretir — sıralı ve tipe göre ön ekli olması bütün carilerdeki
    // numaraları görmeyi gerektiriyor, o bilgi burada yok. Fişsiz hareket denetimi (12) bu satırı
    // 30 satırlık penceresinde `ortak`ın fişini göremediği için işaretliyordu.
    // KARŞI TARAF BİLGİSİ HAREKETİN ÜZERİNDE. Ekstrede "hangi kasaya, ne kadar" görünsün diye
    // alan olarak taşınıyor; açıklama metninden ayrıştırmak kırılgan olurdu.
    const hesapBilgisi = bagId ? {
      hesapAd: seciliHesap.ad.replace(/^(Kasa|Banka): /, ""),
      hesapPB: seciliHesap.pb,
      hesapTutar: cevrimGerekli ? (parseFloat(hForm.hesapTutar) || 0) : tutar,
    } : {};
    const hareketler = [{ ...ortak, fisNo: ortak.fisNo, id: uid("hrk"), kullanici: islemKullanicisiAd(), defter: hForm.defter, muhasebeBagId: bagId || undefined, ...hesapBilgisi }];
    onAddHareket(cari.id, hareketler);

    if (bagId) {
      const [tur, hesapId] = hForm.hesap.split(":");
      onMuhasebeHareketi({
        bagId, hesapTur: tur, hesapId,
        hareket: {
          id: uid("mhrk"),
          tarih: hForm.tarih,
          // TAHSİLAT kasaya GİRER, ÖDEME kasadan ÇIKAR — yön `kasaHesapYonu`dan (17 Eylül,
          // 207-kasa-cari-ortak). Muhasebe ekranı da aynı fonksiyonu kullanıyor; sözlük tek yerde.
          yon: kasaHesapYonu(hareketTipi),
          // HESABIN KENDİ PARA BİRİMİNDEKİ tutar. Çevrim yoksa cari tutarının aynısı.
          tutar: cevrimGerekli ? (parseFloat(hForm.hesapTutar) || 0) : tutar,
          // Karşı tarafın tutarı ve kur da kayda giriyor — muhasebe ekranından girilen hareketin
          // taşıdığı alanların aynısı, iki yön birbirine benzesin diye.
          cariTutar: tutar,
          cariPB: cariPB,
          kur: cevrimGerekli && hamOran ? hamOran : undefined,
          cariId: cari.id,
          muhasebeBagId: bagId,
          defter: hForm.defter,
          aciklama: `${hareketTipi} · ${cari.unvan}${ortak.aciklama ? ` · ${ortak.aciklama}` : ""}`,
        },
      });
    }

    // ÇEK, ÇEKLER LİSTESİNE DE DÜŞER.
    //
    // Eskiden caride girilen çek yalnızca cari hareketinde duruyordu; Muhasebe > Çekler listesi
    // ayrı ayrı, elle dolduruluyordu. Aynı çek iki yerde ve birbirinden habersiz — vadesi gelen
    // çeki hatırlatan liste, caride girileni hiç görmüyordu.
    //
    // `hareketId` bağı KURULUYOR: hangi cari hareketinden doğduğu belli olsun, ileride hareket
    // silinince çekin de bulunabilmesi için (o temizlik henüz yapılmadı — bkz. DEVAM-NOTU).
    if (cekAyrintiliMi && onCekEkle) {
      onCekEkle({
        // Tahsilat/Satış bize çek GELİYOR (Alınan); Ödeme/Alış çek VERİYORUZ.
        //
        // BAKİYE YÖNÜ BU AYRIMI YAPAMAZ: Satış ve Ödeme aynı yönde (ikisi de bakiyeyi artırır) ama
        // biri çek alır, diğeri çek verir. Yönle türetmeye çalışmak Tahsilat'ı "Verilen" yapıyordu.
        tip: hareketTipi === "Tahsilat" || hareketTipi === "Satış" ? "Alınan" : "Verilen",
        cariId: cari.id,
        tutar,
        paraBirimi: hForm.paraBirimi,
        vadeTarihi: hForm.vade || hForm.tarih,
        cekNo: hForm.cek.cekNo,
        banka: hForm.cek.banka,
        sube: hForm.cek.sube,
        iban: hForm.cek.iban,
        kesideci: hForm.cek.kesideci,
        sahiplik: hForm.cek.sahiplik,
        not: hForm.cek.not,
        hareketId: hareketler[0].id,
        fisNo: ortak.fisNo || null,
      });
    }

    setHForm(emptyHareket());
    setShowHareket(false);
    setHareketTipi(null);
  }

  const cekSenet = hForm.odemeSekli === "Çek" || hForm.odemeSekli === "Senet";
  // Ekstredeki bir fiş grubu işlem görmüş bir çeke mi bağlı (bkz. `cekHareketKilidi`). Bütün
  // cariler veriliyor: ciro fişinin hangi caride durduğunu mesaj söyleyebilsin.
  function cekKilidiBul(g) {
    return cekHareketKilidi((g.hareketler || []).map((h) => h.id), { cariler: tumCariler || [cari], muhasebe });
  }
  // PARA HAREKETİ: yalnız Tahsilat ve Ödeme. Alış/Satış cariye borç yazar, para hareket ettirmez —
  // onların peşin kısmı FİŞ formunda seçiliyor (7y).
  // ÇEK/SENET DIŞARIDA: para vadesinde hareket eder, çekler kendi defterinde takip ediliyor.
  const paraHareketi = (hareketTipi === "Tahsilat" || hareketTipi === "Ödeme") && !cekSenet;
  // BÜTÜN HESAPLAR listeleniyor — para birimi farklıysa ÇEVRİLİYOR.
  //
  // Kullanıcı (6 Eylül): "TL kasasına TL ödeme yapıp cariye başka kur ile işlemek gibi."
  // Muhasebe ekranında bu yön zaten vardı (kasa tutarı girilir, "Cariye İşlecek Tutar" ayrıca
  // hesaplanır). Buradaki ters yön eksikti ve hesap listesi aynı para birimiyle SÜZÜLÜYORDU:
  // dolar borcuna TL tahsilat girilemiyordu.
  const uygunHesaplar = [
    ...(((muhasebe && muhasebe.kasalar) || [])
      .map((k) => ({ deger: `kasa:${k.id}`, ad: `Kasa: ${k.ad}`, pb: k.paraBirimi || "TRY" }))),
    ...(((muhasebe && muhasebe.bankalar) || [])
      .map((b) => ({ deger: `banka:${b.id}`, ad: `Banka: ${b.ad}`, pb: b.paraBirimi || "TRY" }))),
  ];
  const seciliHesap = uygunHesaplar.find((h) => h.deger === hForm.hesap) || null;
  const cariPB = hForm.paraBirimi || "TRY";
  // ÇEVRİM GEREKİYOR MU: hesabın para birimi cari hareketinkinden farklıysa.
  const cevrimGerekli = !!seciliHesap && seciliHesap.pb !== cariPB;

  // HESABA İŞLENECEK TUTAR KULLANICIDAN, kur ondan TÜRETİLİYOR — tersi değil.
  // Pratikte iki tutar da biliniyor ("750 dolarlık borcuna 25.000 TL ödedi"); kuru yazdırıp
  // tutarı hesaplatmak, kullanıcının bildiği sayıyı ondalık kur oyunuyla yakalamaya çalışmak
  // olurdu. Alan boşsa güncel kurla ÖN DOLDURULUYOR.
  const hesapTutari = parseFloat(hForm.hesapTutar);
  // KUR HER ZAMAN DÖVİZ ÜZERİNDEN GÖSTERİLİYOR ("1 EUR = 56 TRY"). Ham oranı yazmak, TL cari +
  // döviz kasa durumunda "1 TRY = 0,0179 EUR" gibi kimsenin kafasında durmayan bir sayı verirdi
  // (kullanıcı bildirdi, 6 Eylül).
  const hamOran = (hesapTutari > 0 && parseFloat(hForm.tutar) > 0)
    ? hesapTutari / parseFloat(hForm.tutar) : null;
  const kurSoruAlan = seciliHesap ? kurSorusu(cariPB, seciliHesap.pb, kurlar) : null;
  // Kutuda GÖRÜNEN kur: kullanıcı yazdıysa onunki, yazmadıysa iki tutardan türetilen.
  const kurKutusu = (() => {
    if (hForm.kurGirdi !== "" && hForm.kurGirdi != null) return hForm.kurGirdi;
    if (!hamOran || !kurSoruAlan) return "";
    const deger = kurSoruAlan.bolme ? 1 / hamOran : hamOran;
    return Math.round(deger * 10000) / 10000;
  })();
  const kurGosterimi = (() => {
    if (!hamOran || !seciliHesap) return null;
    const soru = kurSorusu(cariPB, seciliHesap.pb, kurlar);
    if (!soru) return null;
    // `bolme` true ise ham oran ters yönde; döviz tabanlı gösterim için tersi alınıyor.
    const deger = soru.bolme ? 1 / hamOran : hamOran;
    return `1 ${soru.a} = ${deger.toLocaleString("tr-TR", { maximumFractionDigits: 4 })} ${soru.b}`;
  })();
  // Şube önerileri BÜTÜN carilerdeki çek kayıtlarından toplanıyor: şube bilgisi cariye değil
  // bankaya ait, tek bir carinin geçmişine bakmak öneriyi gereksiz daraltırdı.
  const gecmisCekler = (tumCariler || [])
    .flatMap((c) => (c.hareketler || []).map((h) => h.cek))
    .filter(Boolean);
  const subeOnerileri = bilinenSubeler(gecmisCekler, hForm.cek && hForm.cek.banka);

  return (
    <div style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
      <div
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10, padding: 14,
          background: "transparent", border: "none", textAlign: "left",
        }}
      >
        {/* Düzenleme modunda aç/kapa düğmesi <div>'e döner. Sebep: düzenleme alanları (input,
            select, kaydet düğmesi) bu kabın içinde yer alıyor; <button> içinde <button> geçersiz
            HTML'dir ve tarayıcılar bunu öngörülemez biçimde ele alır — alana tıklamak kartı da
            açıp kapatabiliyordu. Salt görüntüleme modunda düğme olarak kalır. */}
        {React.createElement(
          duzenleModu ? "div" : "button",
          duzenleModu
            ? {
                style: {
                  display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0,
                  background: "transparent", border: "none", textAlign: "left", padding: 0,
                },
              }
            : {
                type: "button",
                onClick: () => setOpen((v) => !v),
                style: {
                  display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0,
                  background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: 0,
                },
              },
          <>
        {/* Personel fotoğrafı — atölye ekranında kişinin kendini TANIMASININ tek yolu.
            Okuma yazma bilmeyen biri adını okuyamaz ama fotoğrafını tanır. Fotoğraf yoksa
            baş harflerden üretilen renkli avatar kullanılır; o da kişiye özel bir iz bırakır. */}
        {cari.resim ? (
          <img
            src={cari.resim}
            alt=""
            style={{ width: 38, height: 38, borderRadius: "var(--erp-r-md)", objectFit: "cover", flexShrink: 0, border: "1px solid var(--erp-line)" }}
          />
        ) : (
          <div style={{
            width: 38, height: 38, borderRadius: "var(--erp-r-md)", background: "#4B3625", color: "var(--erp-orange)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Users size={17} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {duzenleModu ? (
            <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <input
                value={duzenleUnvan}
                onChange={(e) => setDuzenleUnvan(e.target.value)}
                autoFocus
                className="mono"
                style={{ fontWeight: 700, fontSize: 14, padding: "3px 6px", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", minWidth: 140 }}
              />
              <select
                value={duzenleTip}
                onChange={(e) => setDuzenleTip(e.target.value)}
                style={{ fontSize: 12, padding: "3px 6px", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)" }}
              >
                {["Müşteri", "Tedarikçi", "Her İkisi", "Personel"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                value={duzenleParaBirimi}
                onChange={(e) => setDuzenleParaBirimi(e.target.value)}
                title="Bu carinin hesabı hangi para biriminde tutuluyor"
                style={{ fontSize: 12, padding: "3px 6px", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)" }}
              >
                {MUHASEBE_PARA_BIRIMLERI.map((pb) => <option key={pb} value={pb}>{pb}</option>)}
              </select>
              <button
                type="button"
                onClick={() => {
                  const yeniUnvan = duzenleUnvan.trim();
                  if (!yeniUnvan) return;
                  // HATA DÜZELTMESİ: üç alan üç ayrı onFieldChange çağrısıyla yazılıyordu. Her çağrı
                  // AYNI (henüz güncellenmemiş) cariler dizisinden yeni bir kopya üretip kaydettiği
                  // için, sonraki çağrı öncekinin değişikliğini görmüyor ve üzerine yazıyordu —
                  // yalnızca EN SON çağrı (paraBirimi) kalıcı oluyor, unvan ve tip kayboluyordu.
                  // Üçü tek seferde, atomik olarak yazılır.
                  onFieldsChange(cari.id, {
                    unvan: yeniUnvan,
                    tip: duzenleTip,
                    paraBirimi: duzenleParaBirimi,
                  });
                  setDuzenleModu(false);
                }}
                title="Kaydet"
                style={{ border: "none", background: "#4E6B4E22", color: "var(--erp-primary)", borderRadius: "var(--erp-r-sm)", padding: 4, display: "flex", cursor: "pointer" }}
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDuzenleUnvan(cari.unvan);
                  setDuzenleTip(cari.tip);
                  setDuzenleParaBirimi(cari.paraBirimi || "TRY");
                  setDuzenleModu(false);
                }}
                title="Vazgeç"
                style={{ border: "none", background: "none", color: "var(--erp-text-3)", borderRadius: "var(--erp-r-sm)", padding: 4, display: "flex", cursor: "pointer" }}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* KALICI KOD — unvanın SOLUNDA. Kod kimliğin kendisi; unvan değişebilir, kod değişmez.
                Kodu olmayan cari için rozet hiç çizilmiyor: boş bir rozet "kodu var ama okunamıyor"
                izlenimi verirdi. */}
            {cariKodMetni(cari) && (
              <span
                className="mono"
                title="Cari kodu — bir kez atanır, unvan değişse de değişmez"
                style={{
                  fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: "var(--erp-r-sm)",
                  border: "1px solid #D9E2E9", background: "#EEF4F8", color: "var(--erp-info)",
                }}
              >
                {cariKodMetni(cari)}
              </span>
            )}
            <span style={{ fontWeight: 700, fontSize: 15 }}>{cari.unvan}</span>
            <span
              className="mono"
              style={{
                fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: "var(--erp-r-pill)",
                background: alfaEkle((CARI_TIP_RENK[cari.tip] || "var(--erp-text-2)"), "22"), color: CARI_TIP_RENK[cari.tip] || "var(--erp-text-2)",
              }}
            >
              {cari.tip}
            </span>
            {(cari.paraBirimi || "TRY") !== "TRY" && (
              <span
                className="mono"
                title="Bu carinin hesabı bu para biriminde tutuluyor"
                style={{
                  fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: "var(--erp-r-pill)",
                  background: "#2F6B4F22", color: "#2F6B4F",
                }}
              >
                {cari.paraBirimi}
              </span>
            )}
            {cari.tip === "Personel" && (cari.bagliProsesler || []).length > 0 && (
              <span
                className="mono"
                title="Bağlı prosesler ve barkod kodu"
                style={{
                  fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: "var(--erp-r-pill)",
                  background: "#6B4E8A22", color: "var(--erp-purple)",
                }}
              >
                {cari.bagliProsesler.join(", ")}{cari.barkodKodu ? ` · ${cari.barkodKodu}` : ""}
              </span>
            )}
          </div>
          )}
          {(cari.telefon || cari.whatsapp || cari.eposta) && !duzenleModu && (
            <div style={{ fontSize: 12, color: "var(--erp-text-2)", marginTop: 2, display: "flex", gap: 8, alignItems: "center" }}>
              {cari.telefon && <span>{cari.telefon}</span>}
              {cari.whatsapp && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#25763D" }} title="WhatsApp"><MessageCircle size={11} />{cari.whatsapp}</span>}
              {cari.eposta && <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }} title="E-posta"><Mail size={11} />{cari.eposta}</span>}
            </div>
          )}
        </div>
        {/* Bakiye PARA BİRİMİ BAZINDA. Tek sayı toplayıp sonuna "₺" koymak, EUR ile çalışan bir
            caride yanlış sembol; karışık para birimli caride ise olmayan bir kur çevrimi demekti. */}
        <span className="mono" style={{ fontWeight: 700, fontSize: 15, color: bakiyeRengi(bakiyeYonu(bakiye)) }}>
          {bakiyeMetni(bakiye)}
        </span>
        {!duzenleModu && (open ? <ChevronDown size={18} color="var(--erp-text-3)" /> : <ChevronRight size={18} color="var(--erp-text-3)" />)}
          </>
        )}
        {!duzenleModu && (
          <button
            type="button"
            onClick={() => {
              setDuzenleUnvan(cari.unvan);
              setDuzenleTip(cari.tip);
              setDuzenleModu(true);
              setOpen(true);
            }}
            data-kart-eylem="duzenle"
            title="Düzenle · F2 — ad, tip, telefon, adres"
            style={{ border: "none", background: "none", color: "var(--erp-text-3)", cursor: "pointer", display: "flex", padding: 4, flexShrink: 0 }}
          >
            <Pencil size={15} />
          </button>
        )}
        {/* PASİFE AL / SİL — kart başlığında, düzenle ikonunun yanında.
            Önceden kartın EN ALTINDA, hareket listesinin ardında metinli düğmelerdi; uzun bir
            ekstrenin sonuna kadar kaydırmadan görünmüyorlardı. İkon olarak başlıkta durmaları hem
            her zaman erişilebilir kılıyor hem de alttaki asıl işlemlerle (Ekstre Yazdır) karışmıyor. */}
        <button
          type="button"
          data-kart-eylem="pasif"
          onClick={pasifDegistir}
          title={
            cari.pasif
              ? "Cariyi yeniden kullanıma aç — seçim listelerinde tekrar görünür"
              : "Cariyi kullanımdan kaldır. Kayıt ve geçmişi durur, sadece YENİ işlemlerde seçilemez."
          }
          className="btn-ikon"
          style={{ color: cari.pasif ? "var(--erp-primary)" : "var(--erp-purple)", flexShrink: 0 }}
        >
          {cari.pasif ? <Check size={15} /> : <Archive size={15} />}
        </button>
        <button
          data-kart-eylem="sil"
          type="button"
          onClick={() => { setSilOnayGoster(true); setOpen(true); }}
          title="Cariyi sil"
          className="btn-ikon tehlike"
          style={{ flexShrink: 0 }}
        >
          <Trash2 size={15} />
        </button>
      </div>

      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          {/* Silme onayı, kart gövdesinin EN BAŞINDA: tetikleyici düğme artık başlıkta olduğu için
              onayın da görüş alanında olması gerekiyor. Altta kalsaydı uzun bir ekstrede kullanıcı
              silme düğmesine basıp hiçbir şey olmamış gibi görürdü.
              NOT: Burası JSX gövdesi — yorumlar süslü parantez içinde yazılmalı. Çift eğik çizgiyle
              başlayan satırlar burada yorum DEĞİL, düz metindir ve ekranda aynen görünür. */}
          {silOnayGoster && (() => {
            const hareketSayisi = (cari.hareketler || []).length;
            const bagliSiparis = (siparisler || []).find((s) => s.cariId === cari.id);
            const bagliStokHareketi = (stok || []).find((p) => (p.hareketler || []).some((h) => h.cariId === cari.id));
            return (
              <div style={{ background: "var(--erp-orange-bg)", border: "1.5px solid #E1611F", borderRadius: "var(--erp-r-md)", padding: 10, marginTop: 10 }}>
                {bagliSiparis ? (
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-warn)" }}>
                    ⚠ "{cari.unvan}" silinemez — bu cariye ait "{bagliSiparis.siparisNo}" siparişi var.
                    Önce o siparişi silin ya da başka bir cariye taşıyın.
                  </div>
                ) : bagliStokHareketi ? (
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-warn)" }}>
                    ⚠ "{cari.unvan}" silinemez — bu cariye ait stok giriş/çıkış hareketi var
                    ({bagliStokHareketi.ad}).
                  </div>
                ) : hareketSayisi > 0 ? (
                  <>
                    {/* Hareketi olan cari SİLİNMEZ. Eskiden burada "Hareketleri de Sil" düğmesi vardı;
                        cari hareketi bir muhasebe kaydıdır ve silinmesi bakiyeyi değiştirir,
                        mutabakatı bozar, karşı taraftaki kasa/banka kaydını yetim bırakır. */}
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-warn)", marginBottom: 6 }}>
                      "{cari.unvan}" silinemez — geçmişi olan cariler silinmez.
                    </div>
                    <div style={{ fontSize: 11, color: "#7A3B22", marginBottom: 6 }}>
                      Bu carinin {hareketSayisi} hareket kaydı var
                      ({(cari.hareketler || []).filter((h) => h.yon === "Borç").length} borç,
                      {" "}{(cari.hareketler || []).filter((h) => h.yon !== "Borç").length} alacak).
                      Bunları silmek cari bakiyesini değiştirir, geçmiş mutabakatları bozar ve bir kısmının
                      kasa/banka tarafındaki karşılığını sahipsiz bırakır.
                    </div>
                    <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginBottom: 8, lineHeight: 1.6 }}>
                      Cariyi kullanımdan kaldırmak istiyorsanız yeni işlem girmeyin; ekstresi olduğu gibi kalsın.
                    </div>
                    <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setSilOnayGoster(false)}>
                      Anladım
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-warn)", marginBottom: 8 }}>
                      Bu cariyi silmek istediğinize emin misiniz?
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => { onRemove(cari.id); setSilOnayGoster(false); }}>
                        <Trash2 size={13} /> Evet, Sil
                      </button>
                      <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setSilOnayGoster(false)}>
                        Vazgeç
                      </button>
                    </div>
                  </>
                )}
                {(bagliSiparis || bagliStokHareketi) && (
                  <div style={{ marginTop: 8 }}>
                    <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setSilOnayGoster(false)}>
                      Kapat
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
          <div style={{ display: "flex", gap: 16, marginBottom: 10, padding: "8px 10px", background: "var(--erp-panel-2)", borderRadius: "var(--erp-r-md)", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
              Genel: <span className="mono" style={{ fontWeight: 700, color: bakiyeRengi(bakiyeYonu(genelBakiye)) }}>
                {bakiyeMetni(genelBakiye)}
              </span>
            </span>
            <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
              Resmi: <span className="mono" style={{ fontWeight: 700, color: bakiyeRengi(bakiyeYonu(resmiBakiye)) }}>
                {bakiyeMetni(resmiBakiye)}
              </span>
            </span>
            {/* İKİNCİ "DÜZENLE" KALDIRILDI (kullanıcı, 20 Eylül: "düzenleme tuşu caride iki kere
                var, bunları tek tipe almamız lazım"). Başlıktaki kalem ad/tipi, buradaki
                telefon/adresi açıyordu — iki düğme, iki mod, aynı yazı. Artık tek düzenleme
                modu: başlıktaki kalem hepsini birden açar. */}
          </div>
          {duzenleAcik && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>
              Telefon
              <input
                defaultValue={cari.telefon}
                onBlur={(e) => onFieldChange(cari.id, "telefon", e.target.value)}
                style={{ ...inputStyle, width: 120, padding: "4px 6px", fontWeight: 400 }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>
              WhatsApp
              <input
                defaultValue={cari.whatsapp || ""}
                placeholder="05xx…"
                title="Sipariş çıktısı bu numaraya gönderilir (kullanıcı, 13 Eylül). Boşsa telefon kullanılır."
                data-cari-whatsapp="1"
                onBlur={(e) => onFieldChange(cari.id, "whatsapp", e.target.value)}
                style={{ ...inputStyle, width: 130, padding: "4px 6px", fontWeight: 400 }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>
              E-posta
              <input
                defaultValue={cari.eposta || ""}
                placeholder="ad@firma.com"
                title="Sipariş PDF'i bu adrese e-postayla gönderilir (13 Eylül)"
                data-cari-eposta="1"
                onBlur={(e) => onFieldChange(cari.id, "eposta", e.target.value.trim())}
                style={{ ...inputStyle, width: 170, padding: "4px 6px", fontWeight: 400 }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>
              Vergi No
              <input
                defaultValue={cari.vergiNo}
                onBlur={(e) => onFieldChange(cari.id, "vergiNo", e.target.value)}
                style={{ ...inputStyle, width: 110, padding: "4px 6px", fontWeight: 400 }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>
              Adres
              <input
                defaultValue={cari.adres}
                onBlur={(e) => onFieldChange(cari.id, "adres", e.target.value)}
                style={{ ...inputStyle, width: 160, padding: "4px 6px", fontWeight: 400 }}
              />
            </label>
            {/* Fotoğraf yalnızca PERSONEL için sorulur — atölye ekranında kişinin kendini tanıması
                buna bağlı. Müşteri/tedarikçi carilerinde böyle bir ihtiyaç yok, alanı göstermek
                formu gereksiz kalabalıklaştırırdı. */}
            {cari.tip === "Personel" && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>
                Fotoğraf
                <ColorSwatch
                  src={cari.resim}
                  size={34}
                  onUrlSave={(url) => onFieldChange(cari.id, "resim", url)}
                  onRemove={() => onFieldChange(cari.id, "resim", "")}
                />
                <span style={{ fontSize: 10, color: "var(--erp-text-3)", fontWeight: 400 }}>atölye ekranında görünür</span>
              </label>
            )}
          </div>
          )}

          {duzenleAcik && cari.tip !== "Personel" && (tanimlarFiyatGruplari || []).some((g) => g.tip === (cari.tip === "Tedarikçi" ? "Alış" : "Satış") || cari.tip === "Her İkisi") && (
            <div style={{ marginBottom: 14, padding: "8px 10px", background: "#EAF0F4", borderRadius: "var(--erp-r-md)" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "var(--erp-info)", fontWeight: 600 }}>Fiyat Grubu:</span>
                <select
                  value={cari.fiyatGrubuId || ""}
                  onChange={(e) => onFieldChange(cari.id, "fiyatGrubuId", e.target.value || undefined)}
                  style={{ ...inputStyle, width: 200, padding: "4px 6px", fontSize: 12 }}
                >
                  <option value="">Grupsuz (standart fiyat)</option>
                  {(tanimlarFiyatGruplari || [])
                    .filter((g) => cari.tip === "Her İkisi" || g.tip === (cari.tip === "Tedarikçi" ? "Alış" : "Satış"))
                    .map((g) => <option key={g.id} value={g.id}>{g.ad} ({g.tip})</option>)}
                </select>
                <span style={{ fontSize: 10, color: "var(--erp-text-2)" }}>
                  Bu gruba özel fiyat tanımlanmış ürünlerde, bu cariye otomatik o fiyat uygulanır.
                </span>
              </label>
            </div>
          )}

          {duzenleAcik && cari.tip === "Personel" && (
            <div style={{ display: "grid", gap: 10, marginBottom: 14, padding: "8px 10px", background: "#F2E7F5", borderRadius: "var(--erp-r-md)" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--erp-purple)", fontWeight: 600 }}>
                  Barkod Kodu
                  <input
                    key={cari.barkodKodu || "bos"}
                    defaultValue={cari.barkodKodu || ""}
                    onBlur={(e) => onFieldChange(cari.id, "barkodKodu", e.target.value.trim())}
                    placeholder="örn. 1000"
                    className="mono"
                    style={{ ...inputStyle, width: 90, padding: "4px 6px", fontWeight: 400 }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12, color: "var(--erp-purple)", fontWeight: 600 }}>
                  Proses Seç
                  <select
                    value={kodAtamaProsesSecim}
                    onChange={(e) => setKodAtamaProsesSecim(e.target.value)}
                    style={{ ...inputStyle, width: 160, padding: "5px 7px", fontWeight: 400, fontSize: 12 }}
                  >
                    <option value="">Proses seçin…</option>
                    {(tanimlarProsesler || []).map((p) => <option key={p.id} value={p.ad}>{p.ad}</option>)}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: "6px 14px", fontSize: 12 }}
                  disabled={!kodAtamaProsesSecim}
                  onClick={() => onBarkodOtomatikAta(cari.id, kodAtamaProsesSecim)}
                  title="Seçilen proses için sıradaki kalan barkod kodunu otomatik atar (örn. Kesim: 1000, 1001, 1002…)"
                >
                  Kod Ata
                </button>
              </div>

              {kodAtamaProsesSecim && (() => {
                const prosesTanim = (tanimlarProsesler || []).find((p) => p.ad === kodAtamaProsesSecim);
                const baslangic = prosesTanim ? (prosesTanim.baslangicNo ?? 1000) : 1000;
                const bandSonu = baslangic + 999;
                const buBanttakiler = (tumCariler || [])
                  .filter((c) => c.id !== cari.id && c.barkodKodu && /^\d+$/.test(c.barkodKodu))
                  .map((c) => ({ unvan: c.unvan, kod: parseInt(c.barkodKodu, 10) }))
                  .filter((x) => x.kod >= baslangic && x.kod <= bandSonu)
                  .sort((a, b) => a.kod - b.kod);
                const sonrakiKod = buBanttakiler.length > 0 ? Math.max(...buBanttakiler.map((x) => x.kod)) + 1 : baslangic;
                return (
                  <div style={{ fontSize: 11, color: "var(--erp-purple)", background: "#fff", borderRadius: "var(--erp-r-md)", padding: "6px 10px" }}>
                    {/* ÜRETİM NUMARALARIYLA ÇAKIŞMA UYARISI.
                        Üretim numaraları 5 hane ve 10001'den başlıyor; personel bandı oraya
                        taşarsa aynı kod hem personele hem üretime denk gelir ve okutulan kodun
                        hangisi olduğu belirsizleşir. */}
                    {bandSonu >= URETIM_NO_TABAN && (
                      <div style={{ color: "var(--erp-warn)", fontWeight: 700, marginBottom: 4 }}>
                        Dikkat: bu bant üretim numaralarıyla çakışıyor (üretim {URETIM_NO_TABAN + 1}'den başlar).
                        Proses tanımından başlangıç numarasını küçültün.
                      </div>
                    )}
                    <b>{kodAtamaProsesSecim}</b> bandı: <span className="mono">{baslangic}-{bandSonu}</span>.{" "}
                    {buBanttakiler.length === 0 ? (
                      "Bu bantta henüz kimse yok."
                    ) : (
                      <>Kullanılan kodlar: {buBanttakiler.map((x) => `${x.kod} (${x.unvan})`).join(", ")}.</>
                    )}
                    {" "}"Kod Ata" derseniz verilecek: <span className="mono" style={{ fontWeight: 700 }}>{sonrakiKod}</span>
                  </div>
                );
              })()}

              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 12, color: "var(--erp-purple)", fontWeight: 600 }}>
                  Bağlı Olduğu Prosesler (barkod okutmada ve atölye ekranında bunlar listelenir)
                </span>
                {/* ANA PROSESLER */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(tanimlarProsesler || []).map((p) => {
                    const secili = (cari.bagliProsesler || []).includes(p.ad);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onBagliProsesToggle(cari.id, p.ad)}
                        style={{
                          padding: "3px 10px", borderRadius: "var(--erp-r-pill)", fontSize: 11, fontWeight: 700, cursor: "pointer",
                          border: `1.5px solid ${secili ? "var(--erp-purple)" : "var(--erp-border)"}`,
                          background: secili ? "#6B4E8A1A" : "#fff",
                          color: secili ? "var(--erp-purple)" : "var(--erp-text-2)",
                        }}
                      >
                        {p.ad}
                      </button>
                    );
                  })}
                </div>

                {/* ARA PROSESLER — bunlar seçilemediği için ara prosese bağlı bir personel hiçbir
                    prosese bağlı GÖRÜNMÜYOR, dolayısıyla süzme devre dışı kalıyor ve kişi bütün
                    prosesleri görüyordu. Ana proseslerden ayrı bir satırda, farklı renkle listelenir
                    ki hangi tür proses olduğu karışmasın. */}
                {(tanimlarAraProsesler || []).length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: "var(--erp-text-3)", alignSelf: "center" }}>ara proses:</span>
                    {(tanimlarAraProsesler || []).map((p) => {
                      const secili = (cari.bagliProsesler || []).includes(p.ad);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onBagliProsesToggle(cari.id, p.ad)}
                          style={{
                            padding: "3px 10px", borderRadius: "var(--erp-r-pill)", fontSize: 11, fontWeight: 700, cursor: "pointer",
                            border: `1.5px solid ${secili ? "#B8860B" : "var(--erp-border)"}`,
                            background: secili ? "#B8860B1A" : "#fff",
                            color: secili ? "#B8860B" : "var(--erp-text-2)",
                          }}
                        >
                          {p.ad}
                        </button>
                      );
                    })}
                  </div>
                )}
                {(() => {
                  // Bu carinin, Tanımlar'daki ara proseslerden HANGİLERİNİN varsayılan personeli
                  // olduğunu gösterir — böylece bir carinin sadece ana proseslerini değil, hangi
                  // ara proses(ler)in sorumlusu olduğunu da bu ekrandan görebilirsiniz. Salt bilgi
                  // amaçlıdır; atama Tanımlar → Ara Prosesler'den yapılır, buradan değiştirilmez.
                  const bagliAraProsesler = (tanimlarAraProsesler || []).filter((ap) => ap.cariId === cari.id);
                  if (bagliAraProsesler.length === 0) return null;
                  return (
                    <>
                      <span style={{ fontSize: 12, color: "var(--erp-brown)", fontWeight: 600, marginTop: 6 }}>
                        Varsayılan Personeli Olduğu Ara Prosesler
                      </span>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {bagliAraProsesler.map((ap) => (
                          <span
                            key={ap.id}
                            className="mono"
                            title="Bu ara prosesin varsayılan personeli — Tanımlar → Ara Prosesler'den değiştirilebilir"
                            style={{
                              padding: "3px 10px", borderRadius: "var(--erp-r-pill)", fontSize: 11, fontWeight: 700,
                              border: "1.5px solid #8A5A38", background: "#8A5A381A", color: "var(--erp-brown)",
                            }}
                          >
                            {ap.ad}
                          </span>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[
              { key: "hareketler", label: "Hareketler" },
              { key: "siparisler", label: `Siparişler (${(siparisler || []).filter((s) => s.cariId === cari.id).length})` },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setCardTab(t.key)}
                style={{
                  padding: "5px 12px", borderRadius: "var(--erp-r-pill)", fontWeight: 700, fontSize: 12, cursor: "pointer",
                  border: `1.5px solid ${cardTab === t.key ? "var(--erp-orange)" : "var(--erp-border)"}`,
                  background: cardTab === t.key ? "var(--erp-orange-bg)" : "#fff",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {cardTab === "hareketler" && (
          <>
          {showHareket ? (
            <div style={{ background: "#fff", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: "var(--erp-r-pill)",
                    background: alfaEkle((HAREKET_TIPI_RENK[hareketTipi] || "var(--erp-text-2)"), "22"), color: HAREKET_TIPI_RENK[hareketTipi] || "var(--erp-text-2)",
                  }}
                >
                  {hareketTipi}
                </span>
                {/* "Bakiye artacak/azalacak" tek başına ne anlama geldiğini söylemiyordu.
                    Pozitif bakiye "cari bize borçlu", negatif "biz cariye borçluyuz" demek. */}
                <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>
                  {hForm.yon === "Borç"
                    ? "Bakiye artacak — cari bize borçlanır"
                    : "Bakiye azalacak — biz cariye borçlanırız"}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                <Field label="Tarih">
                  <input type="date" value={hForm.tarih} onChange={(e) => setHForm({ ...hForm, tarih: e.target.value })} style={inputStyle} />
                </Field>
                <Field label="Tutar">
                  <div style={{ display: "flex", gap: 4 }}>
                    <input type="number" step="0.01" value={hForm.tutar} onChange={(e) => setHForm({ ...hForm, tutar: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                    <select value={hForm.paraBirimi || "TRY"} onChange={(e) => setHForm({ ...hForm, paraBirimi: e.target.value })} style={{ ...inputStyle, width: 68 }}>
                      {MUHASEBE_PARA_BIRIMLERI.map((pb) => <option key={pb} value={pb}>{pb}</option>)}
                    </select>
                  </div>
                </Field>
                <Field label="Defter">
                  <select value={hForm.defter} onChange={(e) => setHForm({ ...hForm, defter: e.target.value })} style={inputStyle}>
                    <option value="Genel">Genel</option>
                    <option value="Resmi">Resmi</option>
                    <option value="Muhasebe">Muhasebe (ikisine de)</option>
                  </select>
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: cekSenet ? "1fr 1fr 1fr 2fr" : "1fr 1fr 2fr", gap: 8, marginTop: 8 }}>
                <Field label="Fiş No">
                  <input value={hForm.fisNo} onChange={(e) => setHForm({ ...hForm, fisNo: e.target.value })} placeholder="Opsiyonel" style={inputStyle} />
                </Field>
                <Field label="Ödeme Şekli">
                  <select value={hForm.odemeSekli} onChange={(e) => setHForm({ ...hForm, odemeSekli: e.target.value })} style={inputStyle}>
                    {ODEME_SEKILLERI.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                {/* PARANIN NEREYE YAZILACAĞI. Tahsilat/ödeme tanımı gereği para hareketidir;
                    hesap seçilmezse cari bakiyesi düzelir ama para havada kalır — kasa ile cari
                    birbirini tutmaz. */}
                {paraHareketi && (
                  <Field label={hareketTipi === "Tahsilat" ? "Hangi kasaya/bankaya girdi?" : "Hangi kasadan/bankadan çıktı?"}>
                    {uygunHesaplar.length === 0 ? (
                      <span style={{ fontSize: 11, color: "var(--erp-warn)", padding: "6px 0", display: "block" }}>
                        {hForm.paraBirimi} hesabı tanımlı değil — Kasa & Banka ekranından kasa/banka
                        açın. Hesap seçilmeden ödeme/tahsilat kaydedilemez: para bir yere girmeli.
                      </span>
                    ) : (
                      <select
                        value={hForm.hesap}
                        onChange={(e) => {
                          const yeni = uygunHesaplar.find((h) => h.deger === e.target.value);
                          // Para birimi farklıysa tutar GÜNCEL KURLA ön dolduruluyor; kullanıcı
                          // gerçekte hareket eden parayı biliyorsa üzerine yazar.
                          let hesapTutar = "";
                          if (yeni && yeni.pb !== cariPB) {
                            const t = parseFloat(hForm.tutar);
                            const c = t > 0 ? paraCevirGenel(t, cariPB, yeni.pb, kurlar) : null;
                            hesapTutar = c != null ? String(stokYuvarla(c)) : "";
                          }
                          setHForm({ ...hForm, hesap: e.target.value, hesapTutar, kurGirdi: "" });
                        }}
                        style={inputStyle}
                      >
                        <option value="">Seçin…</option>
                        {uygunHesaplar.map((h) => (
                          <option key={h.deger} value={h.deger}>{h.ad}{h.pb !== cariPB ? ` (${h.pb})` : ""}</option>
                        ))}
                      </select>
                    )}
                  </Field>
                )}
                {/* KUR ÇEVİRİCİ — hesabın para birimi cari hareketininkinden farklıysa.
                    Örn. dolar borcuna TL kasadan tahsilat. İki tutar da kayda giriyor; kur
                    ikisinden TÜRETİLİYOR, ayrıca sorulmuyor. */}
                {paraHareketi && cevrimGerekli && (
                  <Field label={`Hesaba işlenecek (${seciliHesap.pb})`}>
                    <input
                      type="number" step="any" min="0"
                      value={hForm.hesapTutar}
                      // Tutar elle yazılınca kur girdisi SERBEST: kutu yeniden tutarlardan
                      // türetilmiş kuru gösterir, ekranda tutmayan bir çift kalmaz.
                      onChange={(e) => setHForm({ ...hForm, hesapTutar: e.target.value, kurGirdi: "" })}
                      title="Kasa/bankada gerçekten hareket eden tutar"
                      style={inputStyle}
                    />
                  </Field>
                )}
                {/* KUR DA YAZILABİLİR — çevirinin İKİNCİ yönü (kullanıcı, 6 Eylül: "bu kural tüm
                    para birimi çeviricilerde olsun"). Kuru bilip tutarı bilmeyen buraya yazıyor,
                    üstteki tutar kendiliğinden hesaplanıyor. İki alan tek gerçeğin iki yüzü. */}
                {paraHareketi && cevrimGerekli && (
                  <Field label={kurSoruAlan ? `Kur (1 ${kurSoruAlan.a} = ? ${kurSoruAlan.b})` : "Kur"}>
                    <input
                      type="number" step="any" min="0"
                      value={kurKutusu}
                      onChange={(e) => {
                        const kur = parseFloat(e.target.value);
                        const kaynak = parseFloat(hForm.tutar);
                        const hedef = kurSoruAlan ? kurUygula(kaynak, kur, kurSoruAlan.bolme) : null;
                        setHForm({ ...hForm, kurGirdi: e.target.value, hesapTutar: hedef != null ? String(hedef) : hForm.hesapTutar });
                      }}
                      title="Kuru biliyorsanız buraya yazın — üstteki tutar hesaplanır"
                      style={inputStyle}
                    />
                    <span style={{ fontSize: 10, color: "var(--erp-text-2)" }}>
                      {kurGosterimi || "İki alandan birini doldurun"}
                    </span>
                  </Field>
                )}
                {cekSenet && (
                  <Field label="Vade Tarihi">
                    <input type="date" value={hForm.vade} onChange={(e) => setHForm({ ...hForm, vade: e.target.value })} style={inputStyle} />
                  </Field>
                )}
                <Field label="Açıklama">
                  <input value={hForm.aciklama} onChange={(e) => setHForm({ ...hForm, aciklama: e.target.value })} placeholder={`Opsiyonel — boş kalırsa "${hareketTipi}" yazılır`} style={inputStyle} />
                </Field>
              </div>

              {/* ÇEK/SENET AYRINTILARI — yalnızca ödeme şekli çek ya da senetken.
                  Çek bir söz değil, BELGEDİR: karşılıksız çıktığında ya da ciro edildiğinde
                  bankası, numarası ve keşidecisi olmadan takip edilemez. Eskiden yalnızca vade
                  tarihi soruluyordu; çekin kimden geldiği açıklama satırına elle yazılıyordu. */}
              {cekSenet && (
                <div style={{ marginTop: 10, border: "1px solid #C9A063", borderRadius: "var(--erp-r-md)", background: "var(--erp-hover)", padding: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#7A3B22", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <FileText size={13} /> {hForm.odemeSekli} bilgileri
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                    <Field label={`${hForm.odemeSekli} No`}>
                      <input value={hForm.cek.cekNo} onChange={(e) => setHForm({ ...hForm, cek: { ...hForm.cek, cekNo: e.target.value } })} placeholder="Belge üzerindeki numara" style={inputStyle} />
                    </Field>
                    <Field label="Banka">
                      {/* HAZIR LİSTE + elle yazma. `list` ile açılır öneri: listede olmayan banka
                          da yazılabiliyor, seçenekler kilitli değil. */}
                      <input
                        list="banka-listesi"
                        value={hForm.cek.banka}
                        onChange={(e) => setHForm({ ...hForm, cek: { ...hForm.cek, banka: e.target.value } })}
                        placeholder="Seç ya da yaz"
                        style={inputStyle}
                      />
                      <datalist id="banka-listesi">
                        {BANKALAR.map((b) => <option key={b.kod} value={b.ad} />)}
                      </datalist>
                    </Field>
                    <Field label="Şube">
                      {/* Şubeler ÖĞRENİLİYOR: aynı bankaya girilmiş önceki şubeler öneri olarak
                          çıkıyor. Türkiye'de on binlerce şube var, hazır liste taşımak hem devasa
                          hem hızla eskir. */}
                      <input
                        list="sube-listesi"
                        value={hForm.cek.sube}
                        onChange={(e) => setHForm({ ...hForm, cek: { ...hForm.cek, sube: e.target.value } })}
                        placeholder={subeOnerileri.length ? "Seç ya da yaz" : "Opsiyonel"}
                        style={inputStyle}
                      />
                      <datalist id="sube-listesi">
                        {subeOnerileri.map((sb) => <option key={sb} value={sb} />)}
                      </datalist>
                    </Field>
                    <Field label="IBAN / Hesap No">
                      {/* IBAN yazılınca BANKA OTOMATİK doluyor: Türkiye IBAN'ının 5-9. hanesi banka
                          kodudur. Yalnızca banka alanı BOŞSA yazılıyor — kullanıcının seçimi ezilmiyor. */}
                      <input
                        value={hForm.cek.iban}
                        onChange={(e) => {
                          const iban = e.target.value;
                          const bulunan = ibandanBanka(iban);
                          setHForm({
                            ...hForm,
                            cek: { ...hForm.cek, iban, banka: hForm.cek.banka || bulunan },
                          });
                        }}
                        placeholder="TR.. — banka otomatik bulunur"
                        style={{ ...inputStyle, fontFamily: "monospace" }}
                      />
                    </Field>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 8, marginTop: 8, alignItems: "end" }}>
                    <Field label="Çekin sahibi">
                      {/* KENDİ Mİ CİROLU MU — takipte belirleyici: cirolu çek karşılıksız çıkarsa
                          alacak ciro edenden değil KEŞİDECİden istenir. */}
                      <div style={{ display: "flex", gap: 6 }}>
                        {["Kendi", "Cirolu"].map((se) => (
                          <button
                            key={se}
                            type="button"
                            onClick={() => setHForm({ ...hForm, cek: { ...hForm.cek, sahiplik: se } })}
                            style={{
                              fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: "var(--erp-r-md)", cursor: "pointer",
                              border: `1px solid ${hForm.cek.sahiplik === se ? "var(--erp-brown)" : "var(--erp-border)"}`,
                              background: hForm.cek.sahiplik === se ? "var(--erp-brown)" : "#fff",
                              color: hForm.cek.sahiplik === se ? "#fff" : "var(--erp-text-2)",
                            }}
                          >
                            {se}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label={hForm.cek.sahiplik === "Cirolu" ? "Keşideci (çeki yazan)" : "Keşideci"}>
                      <input
                        value={hForm.cek.kesideci}
                        onChange={(e) => setHForm({ ...hForm, cek: { ...hForm.cek, kesideci: e.target.value } })}
                        placeholder={hForm.cek.sahiplik === "Cirolu" ? "Çeki asıl yazan firma/kişi" : `Boş kalırsa ${cari.unvan}`}
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Field label="Not">
                      <input value={hForm.cek.not} onChange={(e) => setHForm({ ...hForm, cek: { ...hForm.cek, not: e.target.value } })} placeholder="Opsiyonel" style={inputStyle} />
                    </Field>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="btn-primary btn-save" onClick={submitHareket}><Save size={14} /> Kaydet</button>
                <button className="btn-ghost" onClick={() => { setShowHareket(false); setHareketTipi(null); }}><X size={14} /> Vazgeç</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {/* ALIŞ ve SATIŞ, FİŞ ekranını açar (Satın Alma sipariş formuyla aynı düzen).
                  Önce yalnızca cari hareketi yazılıyordu: mal alınıyor, borç kaydediliyor ama stok
                  hiç değişmiyordu. Sonra tek ürünlük küçük bir panel geldi; o da bir alışverişte
                  üç malzeme varsa üç ayrı fiş üretiyor, belgenin bütünlüğünü bozuyordu.
                  Ekran, cari kartının içinde değil ÜSTÜNDE açılıyor: çok kalemli form kartın
                  içine sığmıyor ve kullanıcı doldururken cari listesini kaybetmemeli.
                  Stok etkisi OLMAYAN parasal hareket hâlâ mümkün — aşağıdaki "Ürünsüz kayıt"
                  bağlantısıyla; ama artık istisna, varsayılan değil. */}
              {stokluTipler.map((tip) => (
                <button
                  key={tip}
                  className="btn-ghost"
                  style={{ borderColor: HAREKET_TIPI_RENK[tip], color: HAREKET_TIPI_RENK[tip] }}
                  data-cari-fis-ac={tip}
                  onClick={() => onStokFisiAc && onStokFisiAc(cari.id, tip, cari.unvan)}
                >
                  <Plus size={13} /> {tip} Fişi
                </button>
              ))}
              {["Ödeme", "Tahsilat"].map((tip) => (
                <button
                  key={tip}
                  className="btn-ghost"
                  style={{ borderColor: HAREKET_TIPI_RENK[tip], color: HAREKET_TIPI_RENK[tip] }}
                  onClick={() => hareketTipiSec(tip)}
                >
                  <Plus size={13} /> {tip}
                </button>
              ))}
              {/* Mal hareketi olmayan alış/satış (hizmet bedeli, navlun, iskonto…) için kaçış yolu. */}
              {stokluTipler.length > 0 && (
                <button
                  className="btn-ghost"
                  style={{ borderColor: "var(--erp-text-3)", color: "var(--erp-text-2)", fontSize: 11 }}
                  title="Stok etkisi olmadan yalnızca cari borç/alacak kaydı — hizmet bedeli, navlun, iskonto gibi"
                  onClick={() => hareketTipiSec(stokluTipler[0])}
                >
                  Ürünsüz kayıt
                </button>
              )}
            </div>
          )}


          {(cari.hareketler || []).length > 0 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {["Tümü", "Genel", "Resmi"].map((d) => {
                // SAYIM FİŞ BAZINDA, HAREKET BAZINDA DEĞİL.
                //
                // Bir satış fişi beden başına bir hareket yazıyor: 5 bedenli tek fiş, listede
                // "Tümü (5)" görünüyordu. Oysa ekstrede TEK satır var — sayı ile listenin boyu
                // birbirini tutmuyordu. Kullanıcı: "sadece 1 fiş kesildi ama 5 yazıyor."
                //
                // Ekstrenin kendisi `cariHareketleriGrupla` ile fişleri grupluyor; sayım da aynı
                // gruplamayı kullanıyor. İki ayrı sayma yöntemi, ikisinin ayrışması demekti.
                const dHareketler = d === "Tümü"
                  ? (cari.hareketler || [])
                  // `defterKapsar`: "Muhasebe" kaydı Genel'de de Resmi'de de sayılıyor. Kasa
                  // tarafındaki kuralın aynısı — iki tarafın ayrışmaması için tek fonksiyon.
                  : (cari.hareketler || []).filter((h) => defterKapsar(h.defter, d));
                const sayi = cariHareketleriGrupla(dHareketler).length;
                const aktif = defterFiltre === d;
                const renk = d === "Resmi" ? "var(--erp-info)" : d === "Genel" ? "var(--erp-brown)" : "var(--erp-text)";
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDefterFiltre(d)}
                    style={{
                      padding: "5px 12px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 700, cursor: "pointer",
                      border: `1.5px solid ${aktif ? renk : "var(--erp-border)"}`,
                      background: aktif ? alfaEkle(renk, "1A") : "#fff",
                      color: aktif ? renk : "var(--erp-text-2)",
                    }}
                  >
                    {d} <span className="mono" style={{ fontWeight: 400 }}>({sayi})</span>
                  </button>
                );
              })}
              {/* GÖRÜNÜM DEĞİŞTİRİCİ: defter çiplerinin yanında, çünkü ikisi de "listeyi nasıl
                  görüyorum" sorusunun cevabı. */}
              <button
                type="button"
                data-ekstre-gorunum={sadeGorunum ? "sade" : "detayli"}
                onClick={() => sadeGorunumDegistir(!sadeGorunum)}
                title={sadeGorunum ? "Ürün tablolarını göster" : "Her hareketi tek satırda göster"}
                style={{
                  marginLeft: "auto", padding: "5px 12px", borderRadius: "var(--erp-r-pill)", fontSize: 12,
                  fontWeight: 700, cursor: "pointer", border: "1.5px solid var(--erp-border)",
                  background: "#fff", color: "var(--erp-text-2)",
                }}
              >
                {sadeGorunum ? "Detaylı görünüm" : "Sade görünüm"}
              </button>
            </div>
          )}

          {(() => {
            // Defter filtresi UYGULANDIKTAN SONRAKİ hareketler üzerinden, para birimi sekmesi kurulur —
            // yani "Genel" sekmesindeyken sadece Genel deftedeki hareketlerin para birimleri sayılır.
            // "Muhasebe" kaydı iki defterde de listeleniyor (bkz. defterKapsar).
            const defterUygulanmis = defterFiltre === "Tümü"
              ? (cari.hareketler || [])
              : (cari.hareketler || []).filter((h) => defterKapsar(h.defter, defterFiltre));
            const mevcutPBler = Array.from(new Set(defterUygulanmis.map((h) => h.paraBirimi || "TRY")));
            if (mevcutPBler.length <= 1) return null;
            return (
              <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
                {["Tümü", ...mevcutPBler].map((pbSek) => {
                  // Burada da fiş bazında sayılıyor (bkz. yukarıdaki defter sekmeleri).
                  const pbHareketler = pbSek === "Tümü"
                    ? defterUygulanmis
                    : defterUygulanmis.filter((h) => (h.paraBirimi || "TRY") === pbSek);
                  const sayi = cariHareketleriGrupla(pbHareketler).length;
                  const aktif = pbFiltre === pbSek;
                  return (
                    <button
                      key={pbSek}
                      type="button"
                      onClick={() => setPbFiltre(pbSek)}
                      style={{
                        padding: "3px 10px", borderRadius: "var(--erp-r-pill)", fontSize: 11, fontWeight: 700, cursor: "pointer",
                        border: `1.5px solid ${aktif ? "var(--erp-purple)" : "var(--erp-border)"}`,
                        background: aktif ? "#6B4E8A1A" : "#fff",
                        color: aktif ? "var(--erp-purple)" : "var(--erp-text-2)",
                      }}
                    >
                      {pbSek} <span className="mono" style={{ fontWeight: 400 }}>({sayi})</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {(() => {
            // "Muhasebe" kaydı iki defterde de listeleniyor (bkz. defterKapsar).
            const defterUygulanmis = defterFiltre === "Tümü"
              ? (cari.hareketler || [])
              : (cari.hareketler || []).filter((h) => defterKapsar(h.defter, defterFiltre));
            const filtreliHareketler = pbFiltre === "Tümü"
              ? defterUygulanmis
              : defterUygulanmis.filter((h) => (h.paraBirimi || "TRY") === pbFiltre);
            return filtreliHareketler.length === 0 ? (
            <EmptyState text={defterFiltre === "Tümü" && pbFiltre === "Tümü" ? "Henüz hareket kaydı yok." : `Bu filtrede hareket yok.`} />
          ) : (() => {
            // SIRALAMA — ÖNCE ZAMAN, SONRA FİŞ NUMARASI.
            //
            // Eskiden yalnız fiş numarasına bakılıyordu ve ekstre karışık görünüyordu (kullanıcı
            // bildirdi, 6 Eylül): saatler 21:56 → 21:55 → 21:54 → (saatsiz) → 21:55 → 21:55 diye
            // gidiyordu.
            //
            // SEBEP: fiş sayacı ÖN EKE GÖRE ilerliyor (`fisNoSiradaki`, kök = "ODM-20260906-").
            // Yani `ODM-002` ile `THS-002` farklı anlara ait iki ayrı olay. Düz metin sıralaması
            // önce bütün ODM'leri, sonra bütün THS'leri getiriyor — kronoloji kayboluyor.
            // Fiş numarası tek başına sıralama anahtarı OLAMAZ.
            //
            // Zaman birincil, fiş numarası İKİNCİL: aynı saniyede girilmiş iki kayıt (toplu
            // işlemler böyle) yine de kararlı ve okunabilir bir sırada duruyor.
            const zamanDegeri = (g) => {
              const ham = g.zaman || g.tarih;
              const t = ham ? new Date(ham).getTime() : NaN;
              return Number.isNaN(t) ? 0 : t;
            };
            const gruplarSirali = cariHareketleriGrupla(filtreliHareketler).sort((a, b) => {
              const fark = zamanDegeri(a) - zamanDegeri(b);
              if (fark !== 0) return fark;
              return (a.fisNo || "").localeCompare(b.fisNo || "", "tr", { numeric: true });
            });
            // Koşan bakiye, HER PARA BİRİMİ İÇİN AYRI takip edilir — Kasa/Banka'daki ekstre mantığıyla
            // birebir aynı. Gruplar burada ESKİDEN YENİYE sıralanmış durumda hesaplanır, gösterimde ise
            // en yeni en üstte kalacak şekilde ters çevrilir.
            const kosanBakiyeler = {};
            const satirlar = gruplarSirali.map((g) => {
              const gorulmusImzalar = new Set();
              const tekilHareketler = g.hareketler.filter((h) => {
                const imza = `${h.tutar}|${h.aciklama || ""}|${h.urunAd || ""}|${h.renk || ""}|${h.beden || ""}`;
                if ((h.defter || "Genel") === "Resmi" && gorulmusImzalar.has(imza)) return false;
                gorulmusImzalar.add(imza);
                return true;
              });
              const toplamTutar = tekilHareketler.reduce((s, h) => s + h.tutar, 0);
              const ilk = g.hareketler[0];
              const grupPB = ilk.paraBirimi || "TRY";
              kosanBakiyeler[grupPB] = (kosanBakiyeler[grupPB] || 0) + (g.yon === "Borç" ? toplamTutar : -toplamTutar);
              const defterlerSet = new Set(g.hareketler.map((h) => h.defter || "Genel"));
              const defterEtiketi = defterlerSet.size > 1 ? "Muhasebe (Genel+Resmi)" : [...defterlerSet][0];
              const urunGruplari = urunRenkGrupla(tekilHareketler);
              const yapisizHareketler = tekilHareketler.filter((h) => !h.urunAd);
              return { g, ilk, toplamTutar, defterEtiketi, urunGruplari, yapisizHareketler, grupPB, kosanBakiye: kosanBakiyeler[grupPB] };
            }).reverse();

            // KRİTİK: koşan bakiye YUKARIDA, filtrelenmemiş tüm satırlar üzerinden hesaplandı ve
            // satırlara yazıldı. Filtreleme SADECE gösterimi kısar; bakiye sütunu ekstrenin gerçek
            // seyrini göstermeye devam eder. Filtrelenmiş küme üzerinden yeniden hesaplasaydık,
            // "bu tarihten sonrası" gibi bir aramada bakiye sıfırdan başlar ve tamamen yanlış olurdu.
            const metinEsler = (metin, aranan) =>
              String(metin || "").toLocaleLowerCase("tr-TR").includes(aranan.toLocaleLowerCase("tr-TR"));

            const gorunenSatirlar = satirlar.filter((satir) => {
              const { g, ilk, toplamTutar, urunGruplari, yapisizHareketler } = satir;
              if (kolonFiltre.tarih.trim() && !metinEsler(g.tarih, kolonFiltre.tarih.trim())) return false;
              if (kolonFiltre.aciklama.trim()) {
                const aranan = kolonFiltre.aciklama.trim();
                // Açıklama araması tek bir alana değil, satırda GÖRÜNEN her şeye bakar: fiş no,
                // sipariş no, serbest açıklama ve ürün adları. Kullanıcı ekranda okuduğu herhangi
                // bir kelimeyi yazdığında sonuç bulmayı bekler.
                const havuz = [
                  g.fisNo, ilk.siparisNo, ilk.aciklama, g.odemeSekli,
                  ...urunGruplari.map((u) => `${u.urunAd} ${u.renk || ""}`),
                  ...yapisizHareketler.map((h) => h.aciklama),
                ];
                if (!havuz.some((x) => metinEsler(x, aranan))) return false;
              }
              // Tutar filtreleri EN AZ eşiği olarak çalışır ve yönü de zorlar: "Borç" kutusuna sayı
              // yazmak, alacak satırlarını da eler. Tek kutuya yazıp iki sütunda birden arama
              // yapmak, kullanıcının beklentisine aykırı olurdu.
              const esikBorc = parseFloat(String(kolonFiltre.borc).replace(",", "."));
              if (Number.isFinite(esikBorc)) {
                if (g.yon !== "Borç" || toplamTutar < esikBorc) return false;
              }
              const esikAlacak = parseFloat(String(kolonFiltre.alacak).replace(",", "."));
              if (Number.isFinite(esikAlacak)) {
                if (g.yon === "Borç" || toplamTutar < esikAlacak) return false;
              }
              return true;
            });

            const filtreKutusu = (alan, ipucu, sayisalMi) => (
              <input
                type="text"
                inputMode={sayisalMi ? "decimal" : "text"}
                value={kolonFiltre[alan]}
                onChange={(e) => setKolonFiltre({ ...kolonFiltre, [alan]: e.target.value })}
                placeholder={ipucu}
                className="mono"
                style={{
                  width: "100%", minWidth: sayisalMi ? 62 : 80, padding: "3px 6px", fontSize: 11,
                  border: `1px solid ${kolonFiltre[alan].trim() ? "var(--erp-brown)" : "var(--erp-border-2)"}`,
                  background: kolonFiltre[alan].trim() ? "var(--erp-hover)" : "#fff",
                  borderRadius: "var(--erp-r-sm)", textAlign: sayisalMi ? "right" : "left", boxSizing: "border-box",
                }}
              />
            );

            return (
              <div style={{ overflowX: "auto" }}>
                {kolonFiltreAktif && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-brown)" }}>
                      {gorunenSatirlar.length} / {satirlar.length} fiş gösteriliyor
                    </span>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ fontSize: 10, padding: "3px 8px" }}
                      onClick={() => setKolonFiltre({ tarih: "", aciklama: "", borc: "", alacak: "" })}
                    >
                      <X size={10} /> Filtreleri temizle
                    </button>
                    <span style={{ fontSize: 10, color: "var(--erp-text-3)" }}>
                      Bakiye sütunu ekstrenin tamamına göre hesaplanır, filtreden etkilenmez.
                    </span>
                  </div>
                )}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1.5px solid var(--erp-line)" }}>
                      <th style={{ textAlign: "left", padding: "4px 6px", color: "var(--erp-text-2)" }}>Tarih</th>
                      <th style={{ textAlign: "left", padding: "4px 6px", color: "var(--erp-text-2)" }}>Açıklama</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", color: "var(--erp-warn)" }}>Borç</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", color: "var(--erp-primary)" }}>Alacak</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", color: "var(--erp-text-2)" }}>Bakiye</th>
                      <th style={{ width: 20 }}></th>
                    </tr>
                    {/* ---- SÜTUN FİLTRE SATIRI ----
                        Her kutu kendi sütununda arar. Metin kutuları içerik araması, tutar kutuları
                        "en az şu kadar" eşiği yapar. Bakiye sütununda kutu YOKTUR: bakiye türetilmiş
                        bir değerdir, onu filtrelemek ekstrenin akışını anlamsızlaştırırdı. */}
                    <tr style={{ borderBottom: "1px solid var(--erp-line-soft)" }}>
                      <th style={{ padding: "3px 6px" }}>{filtreKutusu("tarih", "tarih…")}</th>
                      <th style={{ padding: "3px 6px" }}>{filtreKutusu("aciklama", "fiş no, ürün, açıklama…")}</th>
                      <th style={{ padding: "3px 6px" }}>{filtreKutusu("borc", "≥", true)}</th>
                      <th style={{ padding: "3px 6px" }}>{filtreKutusu("alacak", "≥", true)}</th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {gorunenSatirlar.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: "14px 6px", textAlign: "center", fontSize: 12, color: "var(--erp-text-3)" }}>
                          Bu filtreyle eşleşen fiş yok.
                        </td>
                      </tr>
                    )}
                    {gorunenSatirlar.map(({ g, ilk, toplamTutar, defterEtiketi, urunGruplari, yapisizHareketler, grupPB, kosanBakiye }) => {
                      const sembolG = PARA_SEMBOLU[grupPB] || grupPB;
                      return (
                        <tr key={g.key} style={{ borderTop: "1px solid var(--erp-line-soft)", verticalAlign: "top" }}>
                          {/* KİMLİK BİLGİLERİ TARİHİN ALTINDA.
                              Eskiden fiş no + fiş türü + ödeme şekli, matrisin ÜSTÜNDE ayrı bir
                              satır kaplıyordu: her fiş üç satır oluyordu (kimlik, tablo başlığı,
                              detay). Sol sütun ise yalnızca tarihi tutup altı boş kalıyordu.
                              Kimlik oraya taşındı, fiş iki satıra indi. */}
                          <td className="mono" style={{ padding: "6px 6px", color: "var(--erp-text-3)", verticalAlign: "top" }}>
                            {/* `g.tarih` gün damgası; saat yok. Grubun ilk hareketinde gerçek zaman
                                damgası varsa onu kullanıyoruz — eski kayıtlarda yok, o zaman yalnızca
                                gün görünür. Olmayan saati uydurmuyoruz. */}
                            {/* KİMLİK TEK SATIRDA (24 Eylül, v1.436.0 — kullanıcı: "sadece görünümü
                                tek satır yap: tarih, fiş no, fiş tipi vs. tek satıra topla; detaylıda
                                da aynı şekilde, detaylıda daha yüksek olabilir, detay var sonuçta").
                                Tarih kendi satırında, kimlik parçaları da altında SARMALANIYORDU:
                                tek kalemli bir fiş bile solda üç satır kaplıyordu. Artık hepsi tek
                                satırda akıyor (`nowrap`); sığmazsa yatay kaydırma var, satır
                                bölünmüyor. Detaylı görünümde ürün tablosu bu satırın ALTINDA
                                durduğu için satır yine yüksek olabiliyor — orada sorun yok. */}
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap", whiteSpace: "nowrap" }}>
                              <span>{tarihYaz((ilk && ilk.zaman) || g.tarih, true)}</span>
                              {/* İŞÇİLİK ROZETİ + SADE FİŞ NO (23 Eylül, v1.433.0 — kullanıcı:
                                  "işçilik olan sanki alım yapmışız gibi gösteriyor, fiş no çok dolu,
                                  işçilik olduğunu açıklama satırına yazalım"). Fiş numarası
                                  "10003-Üste-İşçilik" gibi üç bilgiyi birden taşıyordu; numara
                                  sütununa sığmıyor, üstelik ekstrede alıştan ayırt edilemiyordu.
                                  Artık: numara sade (üretim no), türü ROZET söylüyor, ayrıntı
                                  açıklamada. */}
                              {hareketIslemTipi(ilk) === "İşçilik" && (
                                <span data-hareket-rozet="İşçilik" className="mono" style={{
                                  fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: "var(--erp-r-pill)",
                                  background: `${alfaEkle(HAREKET_TIPI_RENK["İşçilik"], "18")}`, color: HAREKET_TIPI_RENK["İşçilik"],
                                }}>İŞÇİLİK</span>
                              )}
                              {g.fisNo && (
                                ilk.siparisId ? (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onGoToSiparis(ilk.siparisId); }}
                                    className="mono"
                                    title="Bu fişin ait olduğu siparişi aç"
                                    style={{
                                      fontWeight: 700, fontSize: 11, color: "var(--erp-info)", background: "none",
                                      border: "none", padding: 0, cursor: "pointer", textDecoration: "underline",
                                      display: "flex", alignItems: "center", gap: 3,
                                    }}
                                  >
                                    {fisNoGoster(g.fisNo)} <ArrowRight size={10} />
                                  </button>
                                ) : (
                                  // SİPARİŞİ OLMAYAN FİŞ → FİŞE GİDİYOR (kullanıcı, 10 Eylül).
                                  // Siparişli olan zaten SİPARİŞE gidiyor (üstteki dal) ve o
                                  // davranış korunuyor: sipariş, fişten daha geniş bir bağlam.
                                  onFiseGitNo ? (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); onFiseGitNo(g.fisNo); }}
                                      className="mono"
                                      title={`${g.fisNo} fişini Fişler ekranında aç`}
                                      style={{
                                        fontWeight: 700, fontSize: 11, color: "var(--erp-info)", background: "none",
                                        border: "none", padding: 0, cursor: "pointer", textDecoration: "underline",
                                      }}
                                    >
                                      {fisNoGoster(g.fisNo)}
                                    </button>
                                  ) : (
                                    <span className="mono" style={{ fontWeight: 700, fontSize: 11, color: "var(--erp-text)" }}>{fisNoGoster(g.fisNo)}</span>
                                  )
                                )
                              )}
                              {ilk.siparisNo && ilk.siparisNo !== g.fisNo && (
                                <span className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)" }}>Sipariş: {ilk.siparisNo}</span>
                              )}
                              {/* AÇIKLAMA — matris varsa yalnızca fişin TÜRÜ yazılır ("Cariden Alış
                                  fişi"). Tam açıklama ürün·renk·beden·miktarı sayıyor; matris zaten
                                  hepsini tablo hâlinde gösterdiği için aynı bilgi iki kez yazılıyordu.
                                  Matris yoksa (ödeme, tahsilat, ürünsüz kayıt) açıklamanın kendisi
                                  tek bilgi kaynağıdır; o durumda AÇIKLAMA sütununda tam hâliyle durur. */}
                              {/* İŞÇİLİKTE AÇIKLAMA YAZILMIYOR (23 Eylül, v1.434.0 — kullanıcı:
                                  "işaretlediğim alana gerek yok, fişte var zaten detaylar").
                                  v1.433'te tam açıklama basılıyordu ama TEKRARDI: ürün, renk, adet,
                                  birim fiyat ve tutar sağdaki tabloda; prosesin adı fiş numarasında
                                  ("10003-Saya"); türü rozet söylüyor. Tablo YOKSA (ürünsüz işçilik
                                  kaydı) açıklama tek bilgi kaynağı olduğu için yazılmaya devam ediyor. */}
                              {ilk.aciklama && hareketIslemTipi(ilk) === "İşçilik" && urunGruplari.length === 0 && (
                                <span style={{ fontSize: 10, color: "var(--erp-text-2)" }}>{ilk.aciklama}</span>
                              )}
                              {ilk.aciklama && hareketIslemTipi(ilk) !== "İşçilik" && urunGruplari.length > 0 && (
                                <span style={{ fontSize: 10, color: "var(--erp-text-2)" }}>
                                  {String(ilk.aciklama).split(":")[0]}
                                </span>
                              )}
                              {defterEtiketi !== "Genel" && (
                                <span
                                  className="mono"
                                  style={{
                                    fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: "var(--erp-r-pill)",
                                    background: defterEtiketi === "Resmi" ? "#3D6B8A22" : defterEtiketi.startsWith("Muhasebe") ? "#6B4E8A22" : "#8A5A3822",
                                    color: defterEtiketi === "Resmi" ? "var(--erp-info)" : defterEtiketi.startsWith("Muhasebe") ? "var(--erp-purple)" : "var(--erp-brown)",
                                  }}
                                >
                                  {defterEtiketi}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "6px 6px" }}>
                            {/* ÖDEME ŞEKLİ VE ÇEK AYRINTISI — AÇIKLAMA SÜTUNUNDA.
                                Önce TARİH sütununda, fiş numarasının altındaydı. O sütun dar
                                olduğu için çek ayrıntısı üç satıra sarıyor ve tarihi boğuyordu;
                                açıklama sütunu ise tahsilatlarda neredeyse boş duruyordu.
                                Kullanıcı: "çek detayını açıklama bölümüne yazsın, tarihin altında
                                boşa kalabalık yapıyor."

                                Gösterim kuralı DEĞİŞMEDİ: çek/senet ve para hareketlerinde var,
                                satış/alış fişinde yok (fiş cariye borç yazar, kasadan para
                                çıkarmaz; "Nakit" etiketi ödenmiş izlenimi veriyordu). */}
                            {g.odemeSekli && (g.odemeSekli === "Çek" || g.odemeSekli === "Senet" || paraHareketiMi(ilk)) && (
                              <div
                                className="mono"
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 4, flexWrap: "wrap",
                                  fontSize: 10, fontWeight: 700, marginBottom: 3,
                                  padding: "2px 8px", borderRadius: "var(--erp-r-pill)",
                                  // TAHSİLAT YEŞİL, ÖDEME KİREMİT (bkz. HAREKET_TIPI_RENK).
                                  // Rozet daha önce her hareket tipinde aynı kahverengiydi; ekstreye
                                  // bakan kişi paranın hangi yöne gittiğini ancak tutar sütununa
                                  // bakarak anlıyordu.
                                  background: `${alfaEkle(HAREKET_TIPI_RENK[hareketIslemTipi(ilk)] || "var(--erp-brown)", "14")}`,
                                  color: HAREKET_TIPI_RENK[hareketIslemTipi(ilk)] || "var(--erp-brown)",
                                }}
                              >
                                <FileText size={10} />
                                {g.odemeSekli}
                                {g.vade ? ` · vade ${g.vade}` : ""}
                                {/* PARANIN NEREYE İŞLENDİĞİ (kullanıcı, 6 Eylül: "1000 USD ödeme,
                                    kasa TL gibi"). Hesap adı ve hesabın KENDİ birimindeki tutar.
                                    Tutar yalnız PARA BİRİMLERİ FARKLIYSA yazılıyor: aynı birimde
                                    cari sütunundaki sayının aynısı olurdu ve satırı gereksiz
                                    uzatırdı. */}
                                {ilk.hesapAd && ` · ${ilk.hesapAd}`}
                                {ilk.hesapAd && ilk.hesapPB && ilk.hesapPB !== (ilk.paraBirimi || "TRY")
                                  && ilk.hesapTutar != null
                                  ? ` ${ilk.hesapTutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${PARA_SEMBOLU[ilk.hesapPB] || ilk.hesapPB}`
                                  : ""}
                                {ilk && ilk.cek && [
                                  ilk.cek.cekNo ? `No ${ilk.cek.cekNo}` : "",
                                  ilk.cek.banka || "",
                                  ilk.cek.sube || "",
                                  ilk.cek.sahiplik === "Cirolu" ? "cirolu" : "",
                                  ilk.cek.kesideci ? `keşideci ${ilk.cek.kesideci}` : "",
                                ].filter(Boolean).map((p2) => ` · ${p2}`).join("")}
                              </div>
                            )}
                            {/* Matris yoksa açıklama TEK bilgi kaynağıdır, tam hâliyle burada durur.
                                AMA `yapisizHareketler` aşağıda zaten her hareketin açıklamasını
                                yazıyor ve ürünsüz bir kayıtta (tahsilat, ödeme) `ilk` de o listede
                                oluyordu — açıklama ALT ALTA İKİ KEZ görünüyordu (kullanıcı bildirdi,
                                6 Eylül). Burası artık yalnız aşağıdaki listenin kapsamadığı durumda
                                çiziliyor. */}
                            {ilk.aciklama && urunGruplari.length === 0 && yapisizHareketler.length === 0 && (
                              <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginBottom: 3 }}>{ilk.aciklama}</div>
                            )}
                            {/* Fişler ekranıyla AYNI bileşen — aynı fiş iki ekranda iki farklı
                                şekilde görününce "hangisi doğru" sorusu doğuyordu. */}
                            {/* SADE KİPTE TEK SATIR (23 Eylül, v1.435.0): ürün tablosu ve ürünsüz
                                hareketlerin tek tek dökümü yerine bir özet satırı. Bilgi atılmıyor,
                                sıkıştırılıyor (bkz. `hareketSadeOzet`); ayrıntı için Detaylı görünüm. */}
                            {sadeGorunum ? (
                              <div data-ekstre-sade-ozet="1" style={{ fontSize: 11, color: "var(--erp-text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {hareketSadeOzet(urunGruplari, yapisizHareketler, ilk, g)}
                              </div>
                            ) : (
                            <>
                            {urunGruplari.length > 0 && (
                              <FisKalemMatrisi urunGruplari={urunGruplari} stok={stok} kompakt />
                            )}
                            {yapisizHareketler.map((h) => {
                              let urunAdiIcin = h.urunAd || null;
                              if (!urunAdiIcin && h.aciklama) {
                                // İKİ BİÇİM birden tanınır. Eski kayıtlar "Üretim (Kesim): SS Model ·",
                                // yeniler "Kesim işçilik ücreti — SS Model ·" biçiminde. Yalnızca yeni
                                // biçimi tanısaydık, geçmiş hareketlerin ürün resmi ve bağlantısı
                                // kaybolurdu — biçim değişikliği eski veriyi bozmamalı.
                                const eslesme =
                                  /^(?:Üretim|Ara Proses) \([^)]+\): (.+?) ·/.exec(h.aciklama) ||
                                  /^.+? (?:işçilik|tamir) ücreti(?: \(ara proses\))? — (.+?) ·/.exec(h.aciklama);
                                if (eslesme) urunAdiIcin = eslesme[1];
                              }
                              const ilgiliUrun = urunAdiIcin ? (stok || []).find((p) => p.ad === urunAdiIcin) : null;
                              const gorselH = ilgiliUrun ? ((ilgiliUrun.renkResimleri || {})[h.renk] || ilgiliUrun.kapakResmi) : null;
                              return (
                                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                                  {ilgiliUrun && <ColorSwatch src={gorselH} editable={false} size={16} />}
                                  <span style={{ fontSize: 11, color: "var(--erp-text-2)" }}>{h.aciklama || "—"}</span>
                                </div>
                              );
                            })}
                            </>
                            )}
                          </td>
                          <td className="mono" style={{ padding: "6px 6px", textAlign: "right", color: "var(--erp-warn)", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {g.yon === "Borç" ? `${toplamTutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${sembolG}` : ""}
                          </td>
                          <td className="mono" style={{ padding: "6px 6px", textAlign: "right", color: "var(--erp-primary)", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {g.yon !== "Borç" ? `${toplamTutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${sembolG}` : ""}
                          </td>
                          {/* Koşan bakiye kart başlığıyla AYNI kuralla renkleniyor: aynı sayının
                              iki yerde iki farklı renkte görünmesi kafa karıştırıyordu. */}
                          <td className="mono" style={{ padding: "6px 6px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", color: bakiyeRengi(kosanBakiye) }}>
                            {kosanBakiye.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {sembolG}
                          </td>
                          <td style={{ padding: "6px 2px", textAlign: "center" }}>
                            {/* FİŞİN TAMAMI silinir, ilk satırı değil.
                                Eskiden yalnızca `g.hareketler[0]` siliniyordu: fiş artık kalem
                                kalem yazıldığı için kullanıcı aynı fişi silmek üzere beden beden
                                onay vermek zorunda kalıyordu — ve arada bıraktığı satırlar
                                bakiyeyi yarım bırakıyordu. */}
                            {/* ÜRETİM KİLİDİ — işçilik fişi buradan silinmez. Üretim prosesleri
                                sıralı ilerler; geri alma da sondan geriye doğru yapılmalı ve o
                                kontrol üretim kartında. Fişler ekranındaki kilidin aynısı. */}
                            {(g.hareketler || []).some((h) => h.uretimId) ? (
                              <span
                                title="Bu bir üretim işçilik fişi. Silmek için üretim kartından ilgili prosesin teslim alınmasını geri alın (prosesler sondan geriye doğru geri alınır)."
                                style={{ display: "inline-flex", color: "var(--erp-text-3)" }}
                              >
                                <Lock size={11} />
                              </span>
                            ) : cekKilidiBul(g) ? (
                              // ÇEK KİLİDİ — işlem görmüş çekin giriş hareketi silinmez. Kural ve
                              // mesaj `cekHareketKilidi`nde, `fisGeriAl` ile aynı yerden; ekran
                              // yalnızca önceden söylüyor ki kullanıcı basıp reddedilmesin.
                              <span
                                data-cek-kilidi="1"
                                title={cekKilidiBul(g).mesaj}
                                style={{ display: "inline-flex", color: "var(--erp-text-3)" }}
                              >
                                <Lock size={11} />
                              </span>
                            ) : (
                              <SilOnayButonu onConfirm={() => onFisSil({ fisNo: g.fisNo, hareketler: g.hareketler })} boyut={10} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* ---- DİPNOT TOPLAM SATIRI ----
                      GÖRÜNEN satırların toplamı. Filtre asıl değerini burada gösterir: "şu tedarikçiye
                      ait fişlerin toplamı ne?" sorusu tek kutuya yazıp alttan okumakla cevaplanır.
                      Para birimleri ayrı toplanır — farklı birimleri toplamak anlamsız olurdu. */}
                  {gorunenSatirlar.length > 0 && (() => {
                    const toplamlar = {};
                    gorunenSatirlar.forEach(({ g, toplamTutar, grupPB }) => {
                      if (!toplamlar[grupPB]) toplamlar[grupPB] = { borc: 0, alacak: 0 };
                      if (g.yon === "Borç") toplamlar[grupPB].borc += toplamTutar;
                      else toplamlar[grupPB].alacak += toplamTutar;
                    });
                    const pbListesi = Object.keys(toplamlar);
                    return (
                      <tfoot>
                        {pbListesi.map((pbx, i) => {
                          const t = toplamlar[pbx];
                          const sembolT = PARA_SEMBOLU[pbx] || pbx;
                          const netT = t.borc - t.alacak;
                          return (
                            <tr key={pbx} style={{ borderTop: i === 0 ? "2px solid var(--erp-line)" : "1px solid var(--erp-line-soft)", background: "var(--erp-panel)" }}>
                              <td style={{ padding: "6px 6px", fontSize: 10, fontWeight: 700, color: "var(--erp-text-2)", whiteSpace: "nowrap" }}>
                                {kolonFiltreAktif ? "SÜZÜLEN TOPLAM" : "TOPLAM"}
                              </td>
                              <td className="mono" style={{ padding: "6px 6px", fontSize: 10, color: "var(--erp-text-3)" }}>
                                {pbListesi.length > 1 ? pbx : ""}
                              </td>
                              <td className="mono" style={{ padding: "6px 6px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "var(--erp-warn)" }}>
                                {t.borc > 0 ? t.borc.toLocaleString("tr-TR", { maximumFractionDigits: 2 }) : "—"}
                              </td>
                              <td className="mono" style={{ padding: "6px 6px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "var(--erp-primary)" }}>
                                {t.alacak > 0 ? t.alacak.toLocaleString("tr-TR", { maximumFractionDigits: 2 }) : "—"}
                              </td>
                              {/* KURAL TERSTİ: pozitif net (cari bize borçlu) kırmızı yazılıyordu,
                                  kart başlığında ise aynı sayı yeşildi. Ayrıca `Math.abs` işareti
                                  siliyor, yönü yalnızca renge bırakıyordu — renk de yanlış olunca
                                  bakiyenin yönü ekranda hiç görünmüyordu. */}
                              <td className="mono" style={{ padding: "6px 6px", textAlign: "right", fontSize: 12, fontWeight: 700, color: bakiyeRengi(netT) }}>
                                {netT > 0 ? "+" : ""}{netT.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {sembolT}
                              </td>
                              <td></td>
                            </tr>
                          );
                        })}
                      </tfoot>
                    );
                  })()}
                </table>
              </div>
            );
          })();
          })()}
          </>
          )}

          {cardTab === "siparisler" && (() => {
            const ilgiliSiparisler = (siparisler || [])
              .filter((s) => s.cariId === cari.id)
              .sort((a, b) => new Date(b.tarih || 0) - new Date(a.tarih || 0) || new Date(b.olusturuldu || 0) - new Date(a.olusturuldu || 0));
            if (ilgiliSiparisler.length === 0) {
              return <EmptyState text="Bu cariye ait sipariş yok." />;
            }
            return (
              <div style={{ border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", overflow: "hidden", background: "#fff" }}>
                {ilgiliSiparisler.map((s, i) => {
                  const tipRenk = s.tip === "Alış" ? "var(--erp-brown)" : "var(--erp-info)";
                  const durumRenk = SIPARIS_DURUM_RENK[s.durum] || "var(--erp-text-2)";
                  const toplam = s.kalemler.reduce((sum, k) => sum + k.miktar * k.birimFiyat, 0);
                  const kalemPBleriHepsiAyniMi3 = new Set(s.kalemler.map((k) => k.paraBirimi || "TRY")).size <= 1;
                  const toplamSembol3 = kalemPBleriHepsiAyniMi3 && s.kalemler[0] ? (PARA_SEMBOLU[s.kalemler[0].paraBirimi || "TRY"] || s.kalemler[0].paraBirimi) : "₺";
                  const toplamAdet = s.kalemler.reduce((sum, k) => sum + k.miktar, 0);
                  // "Kalem sayısı" burada RENK+BEDEN satır sayısı değil, DİSTİNCT ÜRÜN (stok kalemi)
                  // sayısıdır — aynı ürünün farklı renk/bedenleri ayrı ayrı sayılmaz, tek ürün sayılır.
                  const kalemSayisi = new Set(s.kalemler.map((k) => k.urunId)).size;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onGoToSiparis(s.id)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                        // TAMAMLANAN SİPARİŞLER GERİ PLANDA.
                        //
                        // Bir sipariş tamamlandığında artık üzerinde iş yok; listede açık
                        // siparişlerle aynı ağırlıkta durması, gözün önce onlara takılmasına
                        // yol açıyordu. Soluk zemin ve sol kenar çizgisi, "bu bitti" bilgisini
                        // okumadan veriyor.
                        //
                        // Renk siparişin TİPİNDEN geliyor (satışta çini mavisi, alışta taba) —
                        // fiş listesindeki renklerle aynı dil.
                        // border ÖNCE sıfırlanır: sonra yazılan borderLeft/borderBottom'u ezmesin.
                        border: "none",
                        background: s.durum === "Tamamlandı" ? alfaEkle(tipRenk, "0F") : "transparent",
                        borderLeft: s.durum === "Tamamlandı" ? `3px solid ${tipRenk}` : "3px solid transparent",
                        opacity: s.durum === "Tamamlandı" ? 0.72 : 1,
                        cursor: "pointer", textAlign: "left", flexWrap: "wrap",
                        borderBottom: i === ilgiliSiparisler.length - 1 ? "none" : "1px solid var(--erp-line-soft)",
                      }}
                    >
                      <span
                        className="mono"
                        style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--erp-r-pill)", background: alfaEkle(tipRenk, "22"), color: tipRenk }}
                      >
                        {s.tip}
                      </span>
                      <span className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{s.siparisNo}</span>
                      <span className="mono" style={{ fontSize: 12, color: "var(--erp-text-3)" }}>{s.tarih || s.olusturuldu ? tarihYaz(s.olusturuldu || s.tarih) : "—"}</span>
                      <span
                        className="mono"
                        style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--erp-r-pill)", background: "var(--erp-panel-2)", color: "var(--erp-text)" }}
                      >
                        {kalemSayisi} kalem · {toplamAdet} adet
                      </span>
                      <span className="mono" style={{ fontSize: 12, color: "var(--erp-text-2)" }}>Teslim: {s.teslimTarihi ? tarihYaz(s.teslimTarihi) : "—"}</span>
                      <span
                        className="mono"
                        style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: "var(--erp-r-pill)", marginLeft: "auto", background: alfaEkle(durumRenk, "22"), color: durumRenk }}
                      >
                        {s.durum}
                      </span>
                      <span className="mono" style={{ fontWeight: 700, fontSize: 13 }}>
                        {toplam.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {toplamSembol3}
                      </span>
                      <ChevronRight size={16} color="var(--erp-text-3)" />
                    </button>
                  );
                })}
              </div>
            );
          })()}

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              className="btn-ghost"
              onClick={() => onPencereAc(
                "ekstre",
                `${cari.id}-${defterFiltre}`,
                `Ekstre: ${cari.unvan}${defterFiltre !== "Tümü" ? ` (${defterFiltre})` : ""}`,
                {
                  cari,
                  bakiye: defterFiltre === "Genel" ? genelBakiye : defterFiltre === "Resmi" ? resmiBakiye : bakiye,
                  firmaBilgileri,
                  defterFiltre,
                }
              )}
            >
              <Printer size={13} /> Ekstre Yazdır (PDF){defterFiltre !== "Tümü" ? ` — ${defterFiltre}` : ""}
            </button>
            {/* PASİFE AL YAZILI DÜĞME (25 Eylül, v1.458.0 — kullanıcı: "Cari pasife alma olsun").
                Özellik vardı ama yalnız başlıktaki yazısız arşiv ikonuydu; kullanıcı bulamadı.
                İkon başlıkta kalıyor (kart kapalıyken de erişilsin), burada adıyla da duruyor.
                Silme burada tekrar edilmiyor: son çare olan işlem göz önünde durmasın. */}
            <PasifButonu pasif={!!cari.pasif} onDegistir={pasifDegistir} etiket="Cari" />
          </div>

        </div>
      )}

    </div>
  );
}

