// Stok Hareketleri'ni de Stok Bilgileri'ndeki renk×beden matrisiyle aynı düzende gösterir.
// Her hücre o renk/bedene ait net hareketi gösterir, tıklanınca o hücrenin fiş geçmişi açılır.
function ProductMatrixCard({
  kurlar, receteSablonlari, onReceteSablonuKaydet,
  tanimlarAylikUretimHedefi, tanimlarGenelGiderler,
  onFiseGitNo,
  product, tanimlarRenkler, tanimlarBedenler, tanimlarBedenGruplari, onYeniOlcuKaydet, onYeniOzelKodAlani, onDefterDuzeltmeYaz, baslangicSekme,
  stokRezervasyonlari, tumSiparisler, onAddRenk, onAddBeden, onRemoveRenk, onRemoveBeden, onRemoveProduct, onPasifDegistir,
  onTeknikCizimEkle, onTeknikCizimSil, onTeknikCizimGuncelle, onTeknikNotChange, onTeknikCizimAc,
  onRenkResmiChange, onRenkResmiRemove, onKategoriChange, onKapakResmiChange, cariler, onGoToCari, onRemoveHareketGlobal,
  onEkFiyatEkle, onEkFiyatSil, tumUrunler, onKullanilanUrunAc, onHizliCariEkle, onHizliHammaddeEkle, onReceteSilToplu, onReceteGrubuGuncelle, onProsesUcretGuncelle, tanimlarProsesler, tanimlarAraProsesler, tanimlarBirimler, tanimlarHammaddeTipleri, onUrunGuncelle,
  onMinStokGuncelle, baslangicAcik, siparisler, uretim, onGoToSiparis, onGoToUretim, tanimlarOzelKodAlanlari, tanimlarKombinasyonlar, onYeniRenkKaydet, firmaBilgileri, tanimlarFiyatGruplari, onPencereAc, onKombinasyonOlustur, onGoToUrun, showToast, asortiler }) {
  const [open, setOpen] = useState(!!baslangicAcik);
  const [yeniKodAlaniGiris, setYeniKodAlaniGiris] = useState(false);
  const [yeniKodAlaniAdi, setYeniKodAlaniAdi] = useState("");
  // Barkod kurmak için gereken üç liste. Kartın elinde zaten ayrı ayrı duruyorlar; barkod
  // fonksiyonları üçünü birlikte istiyor çünkü bir kodu kurmak üçüne birden bakmayı gerektiriyor.
  const barkodTanimlari = { renkler: tanimlarRenkler, bedenler: tanimlarBedenler, asortiler };
  // baslangicSekme: dışarıdan gelen yönlendirmenin istediği sekme (ör. sipariş ekranındaki
  // "Reçeteyi aç" düğmesi). Yalnızca ilk açılışta uygulanır; kullanıcı sonradan sekme
  // değiştirdiğinde geri zıplamamalı.
  // "recete" sekmesi yalnızca MAMUL üründe var; hammadde için istenirse stok bilgilerine düşülür,
  // aksi halde boş bir sekme açılırdı.
  const gecerliBaslangicSekme =
    baslangicSekme === "recete" && product.kategori !== "Mamul" ? "stok" : baslangicSekme;
  const [cardTab, setCardTab] = useState(gecerliBaslangicSekme || "stok");
  // BEDEN ETİKETİ BASMA (22 Eylül, v1.413.0 — kullanıcı: "o düğmeyi ekle ve seçili bedenler için
  // toplu basım da koy"). Depoda okutulan asıl etiket beden etiketi; Barkodlar sekmesinde kodlar
  // görünüyordu ama basılamıyordu. Seçim varyantın KİMLİĞİYLE (renk|beden) tutuluyor, sıra
  // numarasıyla değil: varyant eklenip silinince sıra kayar ve yanlış etiket basılırdı.
  const [seciliEtiketler, setSeciliEtiketler] = useState([]);
  const [etiketKopya, setEtiketKopya] = useState(1);
  const etiketKimlik = (v) => `${v.renk || ""}|${v.beden || ""}`;
  // Tek etiketin gövdesi — tek basım da toplu basım da buradan geçiyor ki iki yerde iki farklı
  // etiket çıkmasın.
  const bedenEtiketiGovde = (v, kod) => `
    <div style="font-size:12px;font-weight:700">${product.ad}</div>
    <div style="font-size:11px">${v.renk || ""}${v.beden ? ` · ${v.beden}` : ""}</div>
    ${barkodSvg(kod, { birim: 2, yukseklik: 30 })}
  `;
  const barkodluVaryantlar = (product.variants || []).filter((v) => varyantinBarkodu(product, v, barkodTanimlari));
  const bedenEtiketiBas = (varyantlar, kopya = 1) => {
    const etiketler = [];
    varyantlar.forEach((v) => {
      const kod = varyantinBarkodu(product, v, barkodTanimlari);
      if (!kod) return;   // kodu olmayan varyantın etiketi basılmaz (yanlış mala bağlanmasın)
      for (let i = 0; i < Math.max(1, Math.min(20, kopya)); i++) etiketler.push(bedenEtiketiGovde(v, kod));
    });
    if (etiketler.length) etiketYazdir(etiketler, { genislikMM: 60, yukseklikMM: 40 });
  };
  // Reçete şablonu seçimi (21 Eylül).
  const [sablonSecim, setSablonSecim] = useState("");
  // Fiyat grubu ekleme satırı (21 Eylül).
  const [fgSecim, setFgSecim] = useState("");
  const [fgFiyat, setFgFiyat] = useState(""); // "stok" | "recete" | "fiyat" | "siparisler"
  const [hareketKaynakFiltre, setHareketKaynakFiltre] = useState("Tümü");
  // Stok hareketleri düz bir tablo değil, fiş kartları listesi. Bu yüzden "sütun filtre satırı"
  // yerine, aynı işi gören alan bazlı bir filtre şeridi kullanılıyor: her kutu tek bir alanı süzer.
  const [hareketFiltre, setHareketFiltre] = useState({ fis: "", tarih: "", cari: "" });
  const hareketFiltreAktif = Object.values(hareketFiltre).some((v) => String(v).trim() !== "");
  // Stok Hareketleri listesinde HER fiş varsayılan olarak KAPALI (sadece başlık satırı) gelir — çok
  // satırlı, uzun bir liste yerine, kullanıcı hangi fişin renk×beden matrisini görmek istiyorsa başlığa
  // tıklayıp açar. Aynı anda sadece TEK bir fiş açık tutulur (tek anahtar, dizi değil).
  // Fiş matrisleri VARSAYILAN OLARAK AÇIKTIR; burada KAPATILANLARIN anahtarları tutulur.
  // Tek bir "açık olan" değeri tutmak, ikinci bir fiş kapatıldığında ilkini geri açardı —
  // kullanıcı birkaç fişi birlikte daraltmak isteyebilir.
  const [kapaliFisler, setKapaliFisler] = useState(() => new Set());
  const fisKapatToggle = (key) => setKapaliFisler((onceki) => {
    const yeni = new Set(onceki);
    if (yeni.has(key)) yeni.delete(key); else yeni.add(key);
    return yeni;
  });
  const [urunSilOnay, setUrunSilOnay] = useState(false);
  const [seciliProses, setSeciliProses] = useState("");
  const [rAciklama, setRAciklama] = useState("");
  const [rPozisyonFiltre, setRPozisyonFiltre] = useState("Tümü"); // "Tümü" | 1 | 2 | 3 ...
  const [yeniHammaddeRenkGiris, setYeniHammaddeRenkGiris] = useState(null); // hangi eşleşme kutusunun yanında açık: "tumu" | "1" | "2" ... | null
  const [yeniHammaddeRenkAdi, setYeniHammaddeRenkAdi] = useState("");
  const [tumModellerRenk, setTumModellerRenk] = useState("");
  const [topluUygulamaBilgi, setTopluUygulamaBilgi] = useState("");
  const [tumBedenlerBeden, setTumBedenlerBeden] = useState("");
  const [topluBedenBilgi, setTopluBedenBilgi] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [addingRenk, setAddingRenk] = useState(false);
  const [yeniModelRengiModu, setYeniModelRengiModu] = useState(false); // 2. sistem: tanımlı listede yoksa, kaç-renk mantığıyla yeni Model Rengi oluştur
  const [renkEkleSayisi, setRenkEkleSayisi] = useState(1);
  const [yeniTekliRenkGiris, setYeniTekliRenkGiris] = useState(false);
  const [ymrPozisyonSecimleri, setYmrPozisyonSecimleri] = useState({}); // { [pozisyon]: renkAdi }
  const [stokMatrisAcik, setStokMatrisAcik] = useState(false); // "Renkler ve Bedenler" tek başlık altında tüm matris
  const [fkTip, setFkTip] = useState("Satış"); // "Alış" | "Satış"
  const [fkKapsam, setFkKapsam] = useState("renkBeden"); // "renkBeden" | "fiyatGrubu" | "cari"
  const [fkRenk, setFkRenk] = useState("");
  const [fkBeden, setFkBeden] = useState("");
  const [fkGrupId, setFkGrupId] = useState("");
  const [fkCariId, setFkCariId] = useState("");
  const [fkFiyat, setFkFiyat] = useState("");
  // Renk+Beden matrisinde bir satırı (renk) ya da sütunu (beden) "tek fiyat"a kilitleyip kilitlemediğimizi
  // tutar — kilitliyken o satır/sütunun tüm hücreleri yerine TEK bir ortak fiyat kutusu kullanılır.
  // TEK FİYAT VARSAYILAN AÇIK (kullanıcı, 17 Eylül: "varsayılanda renk beden için aynı fiyat
  // işaretli gelsin; özellikle renk veya bedene fiyat verilecekse farklı girilen satırlara değer
  // girilsin"). En sık durum: bütün renkler aynı fiyat. Matris boş açılınca kullanıcı 5 renk × 5
  // beden = 25 hücreyi tek tek dolduruyordu. Artık her renk satırı "tek fiyat" kipinde başlıyor,
  // farklılaştırmak isteyen o satırın kilidini açıyor.
  //
  // `null` = "kullanıcı henüz dokunmadı" → varsayılan AÇIK. Kullanıcı kapattığında `false` yazılıyor
  // ve o satır kilitsiz kalıyor; boş nesne kullansaydık "hiç dokunulmamış" ile "kapatılmış" aynı
  // görünürdü.
  const [fkTekFiyatRenkler, setFkTekFiyatRenkler] = useState({});
  const tekFiyatRenkAcikMi = (r) => (fkTekFiyatRenkler[r] === undefined ? true : !!fkTekFiyatRenkler[r]);
  const [fkTekFiyatBedenler, setFkTekFiyatBedenler] = useState({});
  const [showFiyatGecmisi, setShowFiyatGecmisi] = useState(false);
  const [addingBeden, setAddingBeden] = useState(false);
  const [serbestOlcuGiris, setSerbestOlcuGiris] = useState(false);
  const [newRenk, setNewRenk] = useState("");
  const [newBeden, setNewBeden] = useState("");
  const [rHammaddeId, setRHammaddeId] = useState("");
  const [rMap, setRMap] = useState({}); // { [mamulRenk]: hammaddeRenk }
  const [rBedenEslesme, setRBedenEslesme] = useState({}); // { [mamulBeden]: hammaddeBeden } — tüm renkler için ortak
  const [rMiktar, setRMiktar] = useState(""); // tüm renk/bedenler için ortak miktar
  // AMBALAJ SATIRI DEĞİŞKEN Mİ — reçete satırı bazında.
  //
  // Eskiden karar tümüyle ürünün malzeme tipine bağlıydı: tipi "Ambalaj" olan HER hammadde,
  // her reçetede otomatik olarak "rengi siparişte seçilir" davranıyordu. Ama ambalaj tipinde
  // birden çok malzeme tanımlanıyor ve hepsinin siparişten renk alması istenmiyor: kimi kutu
  // müşteriye göre değişir (değişken), kimi ambalaj malzemesi ise modelin sabit parçasıdır
  // (koruyucu poşet, kurutucu). Bu yüzden karar artık SATIR bazında veriliyor.
  //
  // Varsayılan `true`: eski satırlarda bu alan yok ve onların bugünkü davranışı "değişken".
  const [rAmbalajDegisken, setRAmbalajDegisken] = useState(true);
  // DEĞİŞKEN ambalaj satırında siparişte SEÇİLEBİLECEK renkler. Boş = hepsi.
  // Eskiden sipariş ekranı stoktaki BÜTÜN ambalaj renklerini listeliyordu; o modelde hiç
  // kullanılmayan kutular da listede çıkıyor ve yanlış seçime davetiye oluyordu.
  const [rAmbalajRenkler, setRAmbalajRenkler] = useState([]);

  const renkler = Array.from(new Set(product.variants.map((v) => v.renk)));
  const bedenler = bedenSirala(Array.from(new Set(product.variants.map((v) => v.beden))));
  // Toplama sırasında da birikme olur; gösterilen değer ayrıca yuvarlanır.
  const total = stokYuvarla(product.variants.reduce((sum, v) => sum + v.miktar, 0));
  const alisFiyati = product.alisFiyati || 0;
  const satisFiyati = product.satisFiyati || 0;
  const alisBirimi = product.alisParaBirimi || "₺";
  const satisBirimi = product.satisParaBirimi || "₺";
  // KÂR YALNIZCA AYNI PARA BİRİMİNDE HESAPLANIR. Dolarla alınıp euroyla satılan bir üründe
  // "satış - alış" bir sayı verir ama anlamı yoktur. Çevirmek de doğru değil: kur ürün kartında
  // yok ve hangi günün kuru olduğu belirsiz. Yanlış bir kâr göstermektense hiç göstermemek daha
  // iyi.
  const birimlerAyni = alisBirimi === satisBirimi;
  const kar = satisFiyati - alisFiyati;
  const karMarji = (birimlerAyni && satisFiyati > 0) ? Math.round((kar / satisFiyati) * 100) : null;
  const stokDegeri = total * satisFiyati;

  const isMamul = product.kategori === "Mamul";
  // Mamul ürünlerde renk seçimi hem Mamul hem Hammadde renk havuzundan beslenir (Tanımlar'daki Model
  // Rengi sistemi zaten Hammadde renklerinden kombinasyon kuruyor). Hammadde ürünlerde ise davranış
  // değişmedi: sadece Hammadde renkleri, varsa malzeme tipine göre daraltılmış.
  const eklenebilirRenkler = isMamul
    ? Array.from(
        new Map(
          tanimlarRenkler
            .filter((r) =>
              !renkler.includes(r.ad) &&
              !kombinasyonEtiketiFormatindaMi(r.ad)
              // TEK RENK HAVUZU (9g, 13 Eylül): mamul rengi = stok renginin kendisi ya da stok
              // renklerinin kombinasyonu (model rengi). Ayrı "Mamul rengi" listesi kalktı.
            )
            .map((r) => [r.ad, r])
        ).values()
      )
    : tanimlarRenkler.filter(
        (r) => !renkler.includes(r.ad)
          && renkTipeUygunMu(r, product.malzemeTipi)
          && !kombinasyonEtiketiFormatindaMi(r.ad)
      );
  const eklenebilirKombinasyonlar = (tanimlarKombinasyonlar || [])
    .map((k) => ({
      ...k,
      etiket: `${k.kod} - ${k.renkIdler.map((id) => ((tanimlarRenkler.find((r) => r.id === id) || {}).ad || "?")).join("/")}`,
    }))
    .filter((k) => !renkler.includes(k.etiket));
  const olcuTipi = product.olcuTipi || "Beden";
  // EKLEME SIRASINDAKİ tip, ürünün varsayılan tipinden AYRI tutulur.
  //
  // Ürünün `olcuTipi` alanı bir varsayılandır, katı bir kural değil: bir kutu hem "Bot/Standart"
  // gibi boyut hem de beden taşıyabiliyor. Ekleme düğmesini ürünün tipine kilitlemek, kullanıcıyı
  // ürünün tipini değiştirmeye zorluyordu — o da mevcut varyantların görünmesini bozardı.
  //
  // Mamulde ayrım yok: ayakkabı her zaman bedenlidir.
  const [eklemeOlcuTipi, setEklemeOlcuTipi] = useState(olcuTipi);
  const eklenebilirBedenler = tanimlarBedenler.filter((b) => {
    if (bedenler.includes(b.ad) || (b.tip || "Beden") !== eklemeOlcuTipi) return false;
    if (olcuTipi !== "Boyut") return true;
    // MAMUL yalnızca TİPSİZ (Genel) ölçüleri kullanır. "170 GR" takviye bezine, "16 cm" bağcığa
    // ait bir ölçüdür; bir ayakkabı modelinde listelenmesi anlamsızdı.
    // Önceki kural mamulü süzmeden GEÇİRİYORDU (tam tersi) — hata buradaydı.
    if (product.kategori === "Mamul") return olcuTipleri(b).length === 0;
    return olcuTipeUygunMu(b, product.malzemeTipi);
  });

  function getQty(renk, beden) {
    const v = product.variants.find((v) => v.renk === renk && v.beden === beden);
    return v ? v.miktar : 0;
  }

  function getMinStok(renk, beden) {
    const v = product.variants.find((v) => v.renk === renk && v.beden === beden);
    return v && v.minStok != null ? v.minStok : 0;
  }

  function editAc() {
    setEditForm({
      ad: product.ad,
      birim: product.birim,
      minStokTumu: "",
      olcuTipi: product.olcuTipi || "Beden",
      alisFiyati: String(alisFiyati),
      alisParaBirimi: product.alisParaBirimi || "₺",
      satisParaBirimi: product.satisParaBirimi || "₺",
      satisFiyati: String(satisFiyati),
      tedarikciId: product.tedarikciId || "",
      varsayilanProses: product.varsayilanProses || "",
      malzemeTipi: product.malzemeTipi || "",
      ozelKodlar: { ...(product.ozelKodlar || {}) },
    });
    setShowEdit(true);
  }

  function editKaydet() {
    const duzenlenenAd = editForm.ad.trim();
    if (!duzenlenenAd) { showToast("Ürün adı boş olamaz"); return; }
    // Kendisi hariç, aynı ada sahip başka ürün var mı? (Ad değiştirirken de mükerrer oluşamamalı.)
    const adCakismasi = (tumUrunler || []).find(
      (p) => p.id !== product.id && urunAdiAnahtari(p.ad) === urunAdiAnahtari(duzenlenenAd)
    );
    if (adCakismasi) {
      showToast(`"${adCakismasi.ad}" adında bir ürün zaten var — farklı bir ad girin`);
      return;
    }
    const fields = {
      ad: editForm.ad.trim(),
      birim: editForm.birim,
      olcuTipi: editForm.olcuTipi,
      alisFiyati: Math.max(0, parseFloat(editForm.alisFiyati) || 0),
      alisParaBirimi: editForm.alisParaBirimi,
      satisParaBirimi: editForm.satisParaBirimi,
      satisFiyati: Math.max(0, parseFloat(editForm.satisFiyati) || 0),
      tedarikciId: editForm.tedarikciId || "",
      varsayilanProses: editForm.varsayilanProses,
      ozelKodlar: editForm.ozelKodlar,
    };
    // Malzeme tipi yalnızca HAMMADDE için anlamlı. Mamulde de yazsaydık, kategori sonradan
    // değiştiğinde ortada sahibi olmayan bir alan kalırdı.
    if (product.kategori === "Hammadde") fields.malzemeTipi = editForm.malzemeTipi || "";
    if (editForm.minStokTumu !== "") {
      const yeniMin = parseFloat(editForm.minStokTumu) || 0;
      fields.minStok = yeniMin;
      fields.variants = product.variants.map((v) => ({ ...v, minStok: yeniMin }));
    }
    onUrunGuncelle(product.id, fields);
    setShowEdit(false);
    setEditForm(null);
  }

  const hammaddeUrunler = (tumUrunler || []).filter((p) => p.kategori !== "Mamul" && p.id !== product.id);
  const seciliHammadde = hammaddeUrunler.find((p) => p.id === rHammaddeId);

  // Seçili ambalaj hammaddesinin bütün renkleri — seçenek listesi ve "hepsi mi" kontrolü için.
  function ambalajRenkleriTumu() {
    if (!seciliHammadde) return [];
    return Array.from(new Set((seciliHammadde.variants || []).map((v) => v.renk).filter(Boolean)));
  }

  function hammaddeBedenleriTumu() {
    if (!seciliHammadde) return [];
    return bedenSirala(Array.from(new Set(seciliHammadde.variants.map((v) => v.beden))));
  }

  function hammaddeBedensizMi() {
    const hb = hammaddeBedenleriTumu();
    return hb.length === 1 && hb[0] === "Standart";
  }

  // Mamul rengin kaç "pozisyonu" (Model Rengi kombinasyonundaki tekil renk sayısı) olduğunu hesaplar.
  // Kombinasyon değilse (tekli/normal renk) her zaman 1 döner.
  function pozisyonSayisi(mamulRenk) {
    let n = 0;
    while (kombinasyonRengiCoz(mamulRenk, n + 1)) n++;
    return n || 1;
  }

  function hammaddeSec(id) {
    setRHammaddeId(id);
    // Hammadde değişince eşleşmeler baştan kurulur; toplu seçim kutusunda eski rengin yazılı kalması
    // "bu renk uygulanmış" izlenimi verir ve yanıltır.
    setTumModellerRenk("");
    setTopluUygulamaBilgi("");
    setTumBedenlerBeden("");
    setTopluBedenBilgi("");
    // Ambalaj seçenekleri hammaddeye özgü: önceki hammaddenin renkleri yenisinde anlamsız.
    // VARSAYILAN: malzeme tipi "Ambalaj" olan üründe "değişken", diğerlerinde "sabit". Tip artık
    // yalnızca varsayılanı belirliyor, kararı değil — kullanıcı her satırda değiştirebilir.
    const yeni = hammaddeUrunler.find((p) => p.id === id);
    setRAmbalajDegisken(ambalajUrunuMu(yeni));
    setRAmbalajRenkler([]);
    const h = yeni;
    if (!h) { setRMap({}); setRBedenEslesme({}); setRMiktar(""); return; }
    // PROSES SEÇİMİ KORUNUR.
    //
    // Önceden hammadde seçilince proses, o hammaddenin varsayılanıyla EZİLİYORDU. Kullanıcı
    // üstte "Kesim" seçip sonra bir hammadde seçtiğinde, hammaddenin varsayılanı boşsa seçim
    // sıfırlanıyor ve satır "Belirtilmemiş" grubuna düşüyordu — üstte proses seçmenin sebebi
    // tam da bu satırın hangi proseste tüketileceğini söylemekken.
    //
    // Artık varsayılan yalnızca kullanıcı HENÜZ SEÇİM YAPMAMIŞSA uygulanır; yapılmışsa
    // dokunulmaz. Hammaddenin varsayılanı bir öneridir, kullanıcının kararının üstüne yazamaz.
    if (h.varsayilanProses) setSeciliProses((onceki) => onceki || h.varsayilanProses);
    setRMiktar("");

    const normalize = (s) => (s || "").trim().toLocaleLowerCase("tr-TR");

    // OTOMATİK EŞLEŞME KURALI (hem renk hem beden için aynı sıra):
    //   1. İsim eşleşmesi — mamulün 38 numarası hammaddenin 38'ine, "Siyah" mamul rengi
    //      hammaddenin "Siyah"ına bağlanır.
    //   2. "Standart" — hammaddede Standart varsa ona bağlanır. Çelikli taban, tokа, tutkal gibi
    //      pek çok hammadde renksiz/ölçüsüz tutulur ve "Standart" tek değer olarak girilir; bunları
    //      her seferinde elle eşleştirmek gereksiz bir adımdı ve unutulduğunda reçete satırı hiç
    //      oluşmuyordu (sessiz başarısızlık).
    //   3. Tek seçenek — hammaddede yalnızca BİR renk/beden varsa seçim zaten belirsiz değildir,
    //      o değer kullanılır. ("New Diamond" tek renkli bir kutu ise onu seçmemek anlamsız.)
    //   4. Hiçbiri tutmazsa boş bırakılır ve kullanıcı elle seçer.
    const otomatikEsle = (hedef, adaylar) => {
      const isim = adaylar.find((a) => normalize(a) === normalize(hedef));
      if (isim) return isim;
      const standart = adaylar.find((a) => normalize(a) === "standart");
      if (standart) return standart;
      if (adaylar.length === 1) return adaylar[0];
      return "";
    };

    const hBedenlerTumu = bedenSirala(Array.from(new Set(h.variants.map((v) => v.beden))));
    const bedensiz = hBedenlerTumu.length === 1 && hBedenlerTumu[0] === "Standart";
    const bedenEslesme = {};
    if (bedensiz) {
      // Tek "Standart" bedeni olan hammadde, tüm mamul bedenleri için ortak tek satır üretir.
      bedenEslesme["_all_"] = "Standart";
    } else {
      bedenler.forEach((mb) => { bedenEslesme[mb] = otomatikEsle(mb, hBedenlerTumu); });
    }
    setRBedenEslesme(bedenEslesme);

    const hRenkler = Array.from(new Set(h.variants.map((v) => v.renk)));
    // Her mamul renk için: kombinasyonsa HER POZİSYONU, kendi gerçek renk adıyla eşleştirir.
    // Kombinasyon değilse pozisyon 1 üzerinden aynı mantık uygulanır.
    const yeniMap = {};
    renkler.forEach((mr) => {
      const n = pozisyonSayisi(mr);
      yeniMap[mr] = {};
      for (let p = 1; p <= n; p++) {
        const pozisyonRengi = kombinasyonRengiCoz(mr, p) || mr; // kombinasyon değilse mr'in kendisi
        yeniMap[mr][p] = otomatikEsle(pozisyonRengi, hRenkler);
      }
    });
    setRMap(yeniMap);
  }

  function ortakBedenDegistir(mamulBeden, deger) {
    setRBedenEslesme({ ...rBedenEslesme, [mamulBeden]: deger });
  }

  // "Tüm bedenlere aynı hammadde bedeni": fermuar, bağcık, astar gibi hammaddelerde çok sık görülen
  // durum — mamulün 36..45 bedenleri varken hammaddenin tek bir ölçüsü kullanılır. Eskiden bunun için
  // her beden tek tek seçiliyordu; 10 bedenlik bir üründe 10 ayrı işlem demekti ve isim eşleşmesi
  // tutmadığında (36 ≠ "10") otomatik eşleşme de boş kalıyordu.
  // Kaç bedene yazıldığını döndürür ki kullanıcı sonucu görebilsin.
  function tumBedenleriTekBedeneBagla(hammaddeBeden) {
    if (!hammaddeBeden) return 0;
    const yeni = { ...rBedenEslesme };
    bedenler.forEach((mb) => { yeni[mb] = hammaddeBeden; });
    setRBedenEslesme(yeni);
    return bedenler.length;
  }

  function renkEslesmesiDegistir(mamulRenk, pozisyonNo, yeniHammaddeRenk) {
    setRMap({ ...rMap, [mamulRenk]: { ...(rMap[mamulRenk] || {}), [pozisyonNo]: yeniHammaddeRenk } });
  }

  // "Tüm modelleri tek renge bağla": seçilen bir hammadde rengini, listedeki TÜM mamul renklerine
  // (ürünün tüm renk varyantlarına) tek seferde uygular. Aktif "Renk Pozisyonu" filtresine göre:
  // "Tümü" ise çoklu pozisyonlu her modelin TÜM pozisyonlarına, belirli bir pozisyon seçiliyse SADECE
  // o pozisyona uygulanır. Tekli (kombinasyonsuz) mamul renkler her durumda tek pozisyonuna (1) alır.
  function tumModelleriTekRengeBagla(hammaddeRenk) {
    if (!hammaddeRenk) return 0;
    let uygulanan = 0;
    const yeniRMap = { ...rMap };
    renkler.forEach((mr) => {
      const n = pozisyonSayisi(mr);
      const cokluPozisyon = n > 1;
      const mevcut = { ...(yeniRMap[mr] || {}) };
      if (cokluPozisyon) {
        if (rPozisyonFiltre === "Tümü") {
          for (let p = 1; p <= n; p++) mevcut[p] = hammaddeRenk;
          uygulanan++;
        } else if (Number(rPozisyonFiltre) <= n) {
          // Sayısal karşılaştırma: pozisyon filtresi select'ten METİN olarak gelebilir ve
          // "2" <= 3 karşılaştırması JavaScript'te beklenmedik sonuç verebilirdi.
          mevcut[Number(rPozisyonFiltre)] = hammaddeRenk;
          uygulanan++;
        }
      } else {
        mevcut[1] = hammaddeRenk;
        uygulanan++;
      }
      yeniRMap[mr] = mevcut;
    });
    setRMap(yeniRMap);
    return uygulanan;
  }

  // Reçetede bir mamul rengini seçili hammaddenin varyant renklerinden biriyle eşleştirirken,
  // istenen renk o hammaddede henüz yoksa buradan doğrudan yeni bir renk varyantı eklenebilir —
  // hem Tanımlar'a (Hammadde tipinde) kaydedilir hem seçili hammadde ürününe 0 miktarla eklenir.
  function hammaddeyeYeniRenkEkle(renkAdi) {
    const ad = (renkAdi || "").trim();
    if (!ad || !seciliHammadde) return null;
    if (onYeniRenkKaydet) onYeniRenkKaydet(ad, "Hammadde", seciliHammadde.malzemeTipi);
    if (onAddRenk) onAddRenk(seciliHammadde.id, ad);
    return ad;
  }

  // Fiyat kuralı ekler/günceller ve HER değişikliği fiyatGecmisi'ne (log) kaydeder — eski fiyat,
  // yeni fiyat, kimin/hangi kapsamın değiştiği ve ne zaman değiştiği kalıcı olarak tutulur.
  // Çekirdek kaydetme mantığı: state'teki (fkRenk/fkBeden/fkFiyat gibi) form alanlarına bağlı
  // olmadan, doğrudan verilen kapsam/değer/fiyat ile bir fiyat kuralı ekler ya da günceller. Hem tekli
  // form (fiyatKuraliKaydet) hem matris hücreleri (her hücre kendi başına, anında kaydedilir) bunu kullanır.
  function fiyatKuraliKaydetDogrudan(kapsam, deger, etiket, fiyat, ek) {
    if (!(fiyat > 0)) return;
    const mevcutKurallar = product.fiyatKurallari || [];
    // Cari kuralında AYNI cari için farklı renk/beden kırılımları ayrı kurallardır: eşleşme
    // kapsam+değer+renk+beden üzerinden yapılıyor, yoksa ikinci kırılım birincinin üzerine yazardı.
    const eskiKural = mevcutKurallar.find((k) => k.tip === fkTip && k.kapsam === kapsam && k.deger === deger
      && (k.renk || null) === ((ek && ek.renk) || null) && (k.beden || null) === ((ek && ek.beden) || null));
    const yeniKural = { id: eskiKural ? eskiKural.id : uid("fkural"), kapsam, deger, tip: fkTip, fiyat, etiket,
      renk: (ek && ek.renk) || null, beden: (ek && ek.beden) || null };
    const yeniKurallar = eskiKural
      ? mevcutKurallar.map((k) => (k.id === eskiKural.id ? yeniKural : k))
      : [...mevcutKurallar, yeniKural];
    const log = {
      id: uid("flog"), tarih: new Date().toISOString(), tip: fkTip, etiket,
      eskiFiyat: eskiKural ? eskiKural.fiyat : null, yeniFiyat: fiyat,
    };
    onUrunGuncelle(product.id, {
      fiyatKurallari: yeniKurallar,
      fiyatGecmisi: [log, ...(product.fiyatGecmisi || [])].slice(0, HAREKET_GECMIS_SINIRI),
    });
  }

  function fiyatKuraliKaydet() {
    const fiyat = parseFloat(fkFiyat);
    if (!fiyat || fiyat <= 0) return;
    let kapsam = fkKapsam;
    let deger, etiket;
    if (kapsam === "renk") {
      if (!fkRenk) return;
      deger = fkRenk; etiket = `Renk: ${fkRenk}`;
    } else if (kapsam === "beden") {
      if (!fkBeden) return;
      deger = fkBeden; etiket = `Beden: ${fkBeden}`;
    } else if (kapsam === "renkBeden") {
      if (!fkRenk || !fkBeden) return;
      deger = `${fkRenk}|${fkBeden}`; etiket = `${fkRenk} / ${fkBeden}`;
    } else if (kapsam === "fiyatGrubu") {
      if (!fkGrupId) return;
      const grup = (tanimlarFiyatGruplari || []).find((g) => g.id === fkGrupId);
      deger = fkGrupId; etiket = `Grup: ${grup ? grup.ad : "?"}`;
    } else if (kapsam === "cari") {
      if (!fkCariId) return;
      const c = (cariler || []).find((x) => x.id === fkCariId);
      // Renk/beden isteğe bağlı: boşsa carinin bütün varyantları, doluysa yalnız o kırılım.
      const kirilim = [fkRenk, fkBeden].filter(Boolean).join(" / ");
      deger = fkCariId;
      etiket = `Cari: ${c ? c.unvan : "?"}${kirilim ? ` · ${kirilim}` : " (tüm varyantlar)"}`;
      fiyatKuraliKaydetDogrudan(kapsam, deger, etiket, fiyat, { renk: fkRenk || null, beden: fkBeden || null });
      setFkRenk(""); setFkBeden(""); setFkGrupId(""); setFkCariId(""); setFkFiyat("");
      return;
    } else {
      return;
    }
    fiyatKuraliKaydetDogrudan(kapsam, deger, etiket, fiyat);
    setFkRenk(""); setFkBeden(""); setFkGrupId(""); setFkCariId(""); setFkFiyat("");
  }

  function fiyatKuraliSil(kuralId) {
    const kural = (product.fiyatKurallari || []).find((k) => k.id === kuralId);
    if (!kural) return;
    const log = {
      id: uid("flog"), tarih: new Date().toISOString(), tip: kural.tip, etiket: `${kural.etiket} (silindi)`,
      eskiFiyat: kural.fiyat, yeniFiyat: null,
    };
    onUrunGuncelle(product.id, {
      fiyatKurallari: (product.fiyatKurallari || []).filter((k) => k.id !== kuralId),
      fiyatGecmisi: [log, ...(product.fiyatGecmisi || [])].slice(0, HAREKET_GECMIS_SINIRI),
    });
  }

  // Reçete satırı ekleme, eskiden BEŞ ayrı noktada hiçbir şey söylemeden geri dönüyordu: hammadde
  // seçilmemişse, miktar girilmemişse, bir mamul rengin hammadde rengi boşsa, beden eşleşmesi
  // boşsa ve sonunda hiç satır üretilmemişse. Kullanıcı açısından sonuç hep aynıydı — düğmeye
  // basılıyor, hiçbir şey olmuyor, sebep hiçbir yerde yazmıyor.
  // Artık her engel kendi mesajını veriyor; "sessizce vazgeçme" davranışı tamamen kaldırıldı.
  // NOT: Reçete satırındaki `birim` alanı yalnızca YEDEK olarak saklanır (hammadde silinirse
  // geçmiş kayıt okunabilsin diye). Ekranlarda gösterilen birim, ürün kartından okunur —
  // bkz. hammaddeBirimi(). Böylece hammaddenin birimi düzeltildiğinde eski reçeteler de düzelir.
  function receteEkle() {
    const uyar = (m) => { if (showToast) showToast(m); };

    if (!seciliHammadde) { uyar("Önce bir hammadde seçin"); return; }
    // parseFloat DEĞİL: "1/8" yazıldığında parseFloat 1 döndürüp sessizce YANLIŞ miktarı
    // kaydederdi — hesap yapan bir alanda en tehlikeli sonuç bu. ifadeHesapla geçersiz girişte
    // null döner ve aşağıdaki kontrol yakalar.
    const miktar = ifadeHesapla(rMiktar);
    if (!(miktar > 0)) { uyar("Miktar girin — 0'dan büyük bir değer olmalı (hesap da yazabilirsiniz: 1/8)"); return; }

    const bedensiz = hammaddeBedensizMi();
    // Ambalaj kontrolü, doğrulamalardan ÖNCE belirlenir: hem beden hem renk eşleştirme
    // muafiyeti buna bağlı.
    // Kararı SATIR veriyor, ürünün malzeme tipi değil. Tip yalnızca varsayılanı belirledi.
    const ambalajMi = rAmbalajDegisken;

    // Beden eşleşmesi kontrolü: hammaddenin bedenleri mamulün bedenleriyle isim olarak eşleşmiyorsa
    // (ör. mamul 37/38/39, fermuar 15cm/18cm) otomatik eşleşme boş kalır ve HİÇBİR satır üretilmez.
    // Bu, en sık karşılaşılan sessiz başarısızlıktı.
    //
    // AMBALAJ MUAF: kutu her bedene aynı gider; beden eşleştirmesi anlamsızdır.
    if (!bedensiz && !ambalajMi) {
      const eslesenBedenSayisi = bedenler.filter((mb) => rBedenEslesme[mb]).length;
      if (eslesenBedenSayisi === 0) {
        uyar(
          `Beden eşleşmesi yapılmamış — "${seciliHammadde.ad}" bedenleri mamul bedenleriyle (${bedenler.join(", ")}) ` +
          "otomatik eşleşmedi. Yukarıdaki beden satırından en az bir eşleşme seçin."
        );
        return;
      }
    }

    // Renk eşleşmesi kontrolü: hiçbir mamul renge hammadde rengi atanmamışsa satır üretilmez.
    //
    // AMBALAJ HARİÇ: kutu rengi siparişte seçiliyor, reçetede atanan renk zaten kullanılmıyor
    // (bkz. ambalajRengiUygula). Kullanıcıyı hiç işe yaramayacak bir eşleştirmeye zorlamak,
    // reçeteyi eklemesini engellemekten başka bir şey yapmıyordu.
    if (!ambalajMi) {
      const renkAtanmisMi = renkler.some((mr) => {
        const poz = rMap[mr] || {};
        return Object.values(poz).some((v) => !!v);
      });
      if (!renkAtanmisMi) {
        uyar("Hiçbir modele hammadde rengi atanmamış — aşağıdan renk seçin ya da toplu atama yapın");
        return;
      }
    }

    // Bu ekleme işlemine ait tekil kimlik. Aynı hammaddenin farklı amaçlarla (örn. yüz derisi /
    // astar) eklenmiş satırları birbirinden ayırır; görüntülemede ayrı grup olarak çıkar.
    const eklemeId = uid("recekle");
    const eklemeTarihi = new Date().toISOString();

    const yeniSatirlar = [];
    renkler.forEach((mr) => {
      // AMBALAJ: renk eşleştirme yapılmadığı için `rMap` boş kalıyor ve aşağıdaki
      // `Object.entries(pozisyonMapHam)` döngüsü hiç çalışmıyordu — sonuçta hiçbir satır
      // üretilmiyor ve "Eklenecek satır oluşmadı" hatası çıkıyordu.
      //
      // Ambalaj satırları burada DOĞRUDAN üretilir: renk yer tutucudur, üretimde
      // ambalajRengiUygula() siparişteki tercihle değiştirir.
      if (ambalajMi) {
        const yerTutucuRenk = ((seciliHammadde.variants || [])[0] || {}).renk || "Standart";
        if (bedensiz) {
          yeniSatirlar.push({
            mamulRenk: mr, mamulBeden: "Tüm Bedenler",
            hammaddeUrunId: seciliHammadde.id, hammaddeAd: seciliHammadde.ad,
            renk: yerTutucuRenk, beden: "Standart", miktar, birim: seciliHammadde.birim,
            proses: seciliProses, aciklama: rAciklama, eklemeId, eklemeTarihi,
          });
          return;
        }
        bedenler.forEach((mb) => {
          // Ambalajda beden eşleşmesi de yapılmamış olabilir; yapılmışsa ona uyulur,
          // yapılmamışsa hammaddenin ilk bedeni kullanılır.
          const hb = rBedenEslesme[mb] || ((seciliHammadde.variants || [])[0] || {}).beden || "Standart";
          yeniSatirlar.push({
            mamulRenk: mr, mamulBeden: mb,
            hammaddeUrunId: seciliHammadde.id, hammaddeAd: seciliHammadde.ad,
            renk: yerTutucuRenk, beden: hb, miktar, birim: seciliHammadde.birim,
            proses: seciliProses, aciklama: rAciklama, eklemeId, eklemeTarihi,
          });
        });
        return;
      }

      const pozisyonMapHam = rMap[mr] || {};
      const cokluPozisyon = pozisyonSayisi(mr) > 1;
      const tumunuTekRenkleEsle = cokluPozisyon && rPozisyonFiltre === "Tümü";

      if (tumunuTekRenkleEsle) {
        // "Tümü" modunda TEK bir hammadde rengi seçilmiştir — kombinasyon, pozisyon ayrımı yapılmadan
        // tıpkı normal (kombinasyon olmayan) bir renk gibi TEK satır olarak reçeteye eklenir.
        // Ambalajda renk seçilmez: satır, hammaddenin İLK rengiyle oluşturulur ve üretimde
        // siparişteki tercihle değiştirilir. Bir renk yazmak zorunlu — satırın bir varyanta
        // bağlanması gerekiyor; hangisi olduğu ambalajda önemli değil çünkü zaten üzerine yazılıyor.
        const hammaddeRenk = ambalajMi
          ? (pozisyonMapHam[1] || ((seciliHammadde.variants || [])[0] || {}).renk || "Standart")
          : pozisyonMapHam[1];
        if (!hammaddeRenk) return;
        if (bedensiz) {
          yeniSatirlar.push({
            mamulRenk: mr, mamulBeden: "Tüm Bedenler",
            hammaddeUrunId: seciliHammadde.id, hammaddeAd: seciliHammadde.ad,
            renk: hammaddeRenk, beden: "Standart", miktar, birim: seciliHammadde.birim,
            proses: seciliProses, aciklama: rAciklama, eklemeId, eklemeTarihi,
          });
          return;
        }
        bedenler.forEach((mb) => {
          const hb = rBedenEslesme[mb];
          if (!hb) return;
          yeniSatirlar.push({
            mamulRenk: mr, mamulBeden: mb,
            hammaddeUrunId: seciliHammadde.id, hammaddeAd: seciliHammadde.ad,
            renk: hammaddeRenk, beden: hb, miktar, birim: seciliHammadde.birim,
            proses: seciliProses, aciklama: rAciklama, eklemeId, eklemeTarihi,
          });
        });
        return;
      }

      // Belirli bir pozisyon (Renk 1, Renk 2…) ya da kombinasyon olmayan tekli bir mamul renk.
      Object.entries(pozisyonMapHam).forEach(([pozisyonNo, hammaddeRenk]) => {
        // Bir pozisyon filtresi seçiliyse (Renk 1, Renk 2…), sadece o pozisyon işlenir —
        // diğer pozisyonlar bu ekleme işleminden etkilenmez, ayrı bir işlemle eklenebilirler.
        if (cokluPozisyon && rPozisyonFiltre !== "Tümü" && String(rPozisyonFiltre) !== pozisyonNo) return;
        if (!hammaddeRenk) return;
        // Kombinasyonun birden fazla pozisyonu varsa açıklama OTOMATİK "N. Renk" olur (gösterimde
        // gerçek renk adına çözülür). Tekli (kombinasyon olmayan) bir mamul renk, belirli bir pozisyon
        // filtresi ("1. Renk", "2. Renk"…) AKTİFKEN eklenirse, o da AYNI pozisyon etiketiyle kaydedilir —
        // böylece "1. Renk" grubunda birlikte eklediğiniz tekli renkler ayrı bir "Tekli renkler"
        // bölümüne düşmez, matriste o pozisyonun altına ek sütun olarak eklenir. Pozisyon filtresi
        // "Tümü" iken (ya da hiç kombinasyon yokken) tekli renkler hâlâ pozisyonsuz (rAciklama) kalır.
        const aciklama = cokluPozisyon
          ? `${pozisyonNo}. Renk`
          : (rPozisyonFiltre !== "Tümü" ? `${rPozisyonFiltre}. Renk` : rAciklama);
        if (bedensiz) {
          yeniSatirlar.push({
            mamulRenk: mr, mamulBeden: "Tüm Bedenler",
            hammaddeUrunId: seciliHammadde.id, hammaddeAd: seciliHammadde.ad,
            renk: hammaddeRenk, beden: "Standart", miktar, birim: seciliHammadde.birim,
            proses: seciliProses, aciklama, eklemeId, eklemeTarihi,
          });
          return;
        }
        bedenler.forEach((mb) => {
          const hb = rBedenEslesme[mb];
          if (!hb) return;
          yeniSatirlar.push({
            mamulRenk: mr, mamulBeden: mb,
            hammaddeUrunId: seciliHammadde.id, hammaddeAd: seciliHammadde.ad,
            renk: hammaddeRenk, beden: hb, miktar, birim: seciliHammadde.birim,
            proses: seciliProses, aciklama, eklemeId, eklemeTarihi,
          });
        });
      });
    });
    if (yeniSatirlar.length === 0) {
      uyar("Eklenecek satır oluşmadı — renk ve beden eşleşmelerini kontrol edin");
      return;
    }
    // Alan YALNIZCA ambalaj tipli hammaddede yazılır: diğer satırlarda anlamsız bir alan
    // taşımak, ileride "bu neden burada" sorusu üretirdi.
    // `false` da açıkça yazılır — yokluğu "değişken" demek olduğu için sabit satırın işareti şart.
    // İşaret HER satıra AÇIKÇA yazılır (true ya da false). Yokluğu "ürünün malzeme tipine bak"
    // demek; bu da kuralı yeniden serbest metne bağlardı. Açık yazınca satır kendi kendini anlatıyor.
    const eklenecekler = yeniSatirlar.map((x) => ({
      ...x,
      ambalajDegisken: rAmbalajDegisken,
      // Yalnızca değişken satırda anlamlı. Hepsi seçiliyken liste YAZILMAZ: sonradan eklenen bir
      // renk listenin dışında kalırdı. Boş = "o hammaddenin güncel tüm renkleri".
      ...(rAmbalajDegisken && rAmbalajRenkler.length > 0
        && rAmbalajRenkler.length < ambalajRenkleriTumu().length
        ? { ambalajSecenekleri: rAmbalajRenkler }
        : {}),
    }));
    // Tüm satırlar tek seferde (atomik) eklenir — art arda tekli ekleme, durağan veri yüzünden
    // önceki satırların kaybolmasına yol açardı.
    onReceteGrubuGuncelle(product.id, [], eklenecekler);
    uyar(`${eklenecekler.length} reçete satırı "${seciliProses || "Belirtilmemiş"}" prosesine eklendi`);
    // PROSES SEÇİLİ KALIR. Reçete kurarken aynı proses için arka arkaya birkaç hammadde eklenir
    // (kesimde deri, astar, takviye). Her seferinde prosesi yeniden seçtirmek gereksiz tekrar,
    // üstelik seçmeyi unutunca satır "Belirtilmemiş" grubuna düşüyordu.
    setRHammaddeId(""); setRMap({}); setRBedenEslesme({}); setRMiktar(""); setRAciklama("");
    setTumModellerRenk(""); setTopluUygulamaBilgi("");
    setTumBedenlerBeden(""); setTopluBedenBilgi("");
  }

  return (
    // Kartın tamamı kategori renginde çerçevelenir ve üstünde kalın bir şerit taşır.
    // Kategori önceden yalnızca küçük bir açılır etiketti; bir ürün kartına baktığında hammadde mi
    // mamul mü olduğu ancak o etiket okunarak anlaşılıyordu.
    <div
      style={{
        background: "var(--erp-panel)",
        border: `1px solid ${alfaEkle((CAT_COLORS[product.kategori] || "var(--erp-border-2)"), "55")}`,
        borderTop: `4px solid ${CAT_COLORS[product.kategori] || "var(--erp-border-2)"}`,
        borderRadius: "var(--erp-r-md)",
        // `overflow: hidden` DEĞİL. Köşeleri kırpmak için konmuştu ama kartın içindeki açılır
        // listeleri de kırpıyordu: hammadde arama önerileri kartın alt kenarında yarım kalıyor,
        // aşağıdaki ürünler hiç görünmüyordu ("ekran tam olmuyor"). Bir kabın kendi köşesini
        // düzeltmek için içindeki menüyü kesmesi, kazandığından çoğunu geri veren bir takas.
        // Köşe yuvarlaklığı zaten `borderRadius` ile duruyor; kırpma yalnızca köşeye DAYANAN
        // zeminli çocuklar için gerekliydi, burada öyle bir çocuk yok.
        overflow: "visible",
      }}
    >
      {/* Başlık şeridi: aç/kapa alanı ile eylem ikonları YAN YANA ama AYRI düğmeler.
          İkonları aç/kapa düğmesinin içine koymak iç içe <button> üretirdi — geçersiz HTML olur ve
          ikona tıklamak kartı da açıp kapatırdı. */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 16px 16px 16px" }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12,
            background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: 0,
          }}
        >
          {product.kapakResmi ? (
            <ColorSwatch src={product.kapakResmi} editable={false} size={44} />
          ) : (
            <div
              title={product.kategori}
              style={{
                width: 44, height: 44, borderRadius: "var(--erp-r-md)", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: alfaEkle((CAT_COLORS[product.kategori] || "var(--erp-text-2)"), "18"),
                border: `1px solid ${alfaEkle((CAT_COLORS[product.kategori] || "var(--erp-text-2)"), "33")}`,
              }}
            >
              <KategoriIkonu kategori={product.kategori} size={21} />
            </div>
          )}
          <span style={{ fontWeight: 700, fontSize: 16, flex: 1, overflowWrap: "anywhere", color: product.pasif ? "var(--erp-text-3)" : undefined }}>
            {product.ad}
            {product.pasif && (
              <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: "var(--erp-purple)", background: "#6B4E8A18", padding: "1px 6px", borderRadius: "var(--erp-r-pill)", marginLeft: 6 }}>pasif</span>
            )}
          </span>
          {open ? <ChevronDown size={18} color="var(--erp-text-3)" /> : <ChevronRight size={18} color="var(--erp-text-3)" />}
        </button>

        {/* DÜZENLEME MODUNDA BAŞLIK EYLEMLERİ (20 Eylül): Kaydet · Vazgeç. */}
        {showEdit && editForm && (
          <>
            <button type="button" className="btn-primary btn-save" data-kart-eylem="kaydet"
              title="Kaydet · Ctrl+S" onClick={(e) => { e.stopPropagation(); editKaydet(); }}
              style={{ padding: "5px 12px", fontSize: 12 }}>
              <Save size={13} /> Kaydet
            </button>
            <button type="button" className="btn-ghost" data-kart-eylem="vazgec"
              title="Vazgeç · Esc" onClick={(e) => { e.stopPropagation(); setShowEdit(false); setEditForm(null); }}
              style={{ padding: "5px 12px", fontSize: 12 }}>
              <X size={13} /> Vazgeç
            </button>
          </>
        )}
        {!showEdit && (<>
        <button
          type="button"
          data-kart-eylem="duzenle"
          onClick={() => { setOpen(true); editAc(); }}
          title="Ürünü düzenle"
          className="btn-ikon"
          style={{ flexShrink: 0 }}
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          data-kart-eylem="pasif"
          onClick={() => onPasifDegistir(product.id, !product.pasif)}
          title={
            product.pasif
              ? "Ürünü yeniden kullanıma aç — seçim listelerinde tekrar görünür"
              : "Ürünü kullanımdan kaldır. Kayıt, stok ve geçmişi durur; sadece YENİ işlemlerde seçilemez."
          }
          className="btn-ikon"
          style={{ color: product.pasif ? "var(--erp-primary)" : "var(--erp-purple)", flexShrink: 0 }}
        >
          {product.pasif ? <Check size={15} /> : <Archive size={15} />}
        </button>
        <button
          type="button"
          data-kart-eylem="sil"
          onClick={() => { setOpen(true); setUrunSilOnay(true); }}
          title="Ürünü sil"
          className="btn-ikon tehlike"
          style={{ flexShrink: 0 }}
        >
          <Trash2 size={15} />
        </button>
        </>)}
      </div>

      {open && (
        <div style={{ padding: "0 16px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <ColorSwatch
            src={product.kapakResmi}
            onUrlSave={(url) => onKapakResmiChange(product.id, url)}
            onRemove={() => onKapakResmiChange(product.id, "")}
            size={52}
          />
          <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={product.kategori}
              onChange={(e) => onKategoriChange(product.id, e.target.value)}
              className="mono"
              // Soluk zeminli etiket yerine DOLU rozet: kategori, karttaki en belirgin ikinci öğe.
              style={{
                fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: "var(--erp-r-pill)",
                background: CAT_COLORS[product.kategori] || "var(--erp-text-2)",
                color: "var(--erp-panel-2)",
                border: "none", cursor: "pointer", letterSpacing: ".02em",
              }}
            >
              {KATEGORILER.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: "var(--erp-text-3)", letterSpacing: ".03em" }}>
              {olcuTipi === "Boyut" ? "BOYUT BAZLI" : "BEDEN BAZLI"}
            </span>
            <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
              Toplam: <span className="mono" style={{ fontWeight: 600 }}>{total} {product.birim}</span>
            </span>
            {product.malzemeTipi && (
              <span
                className="mono"
                style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: "var(--erp-r-pill)", background: "#6B4E8A22", color: "var(--erp-purple)" }}
              >
                {product.malzemeTipi}
              </span>
            )}
            {product.mamulTipi && (
              <span
                className="mono"
                style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: "var(--erp-r-pill)", background: "#3D6B8A22", color: "var(--erp-info)" }}
              >
                {product.mamulTipi}
              </span>
            )}
            {product.sezon && (
              <span
                className="mono"
                style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: "var(--erp-r-pill)", background: "#4E6B4E22", color: "var(--erp-primary)" }}
              >
                {product.sezon}{product.sezonYili ? ` ${product.sezonYili}` : ""}
              </span>
            )}
            <span style={{ fontSize: 12, color: "var(--erp-text-3)" }}>· min. stok her renk/beden altında ayrı ayarlanır</span>
          </div>

          {isMamul ? (
            <div style={{ display: "flex", gap: 10, rowGap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
              {showEdit ? (
                <>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>
                    Alış
                    <input
                      type="number" step="any" min="0"
                      value={editForm.alisFiyati}
                      onChange={(e) => setEditForm({ ...editForm, alisFiyati: e.target.value })}
                      className="mono"
                      style={{ ...inputStyle, width: 74, padding: "4px 6px" }}
                    />
                    <select
                      value={editForm.alisParaBirimi}
                      onChange={(e) => setEditForm({ ...editForm, alisParaBirimi: e.target.value })}
                      className="mono"
                      style={{ border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", padding: "2px 3px", fontSize: 12, background: "#fff" }}
                    >
                      {PARA_BIRIMLERI.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>
                    Satış
                    <input
                      type="number" step="any" min="0"
                      value={editForm.satisFiyati}
                      onChange={(e) => setEditForm({ ...editForm, satisFiyati: e.target.value })}
                      className="mono"
                      style={{ ...inputStyle, width: 74, padding: "4px 6px" }}
                    />
                    {/* SATISIN KENDI PARA BIRIMI. Once burada "₺" sabit yaziliydi: dovizle
                        satilan bir urunun fiyati ekranda yanlis birimle gorunuyordu. Mamul ve
                        hammadde blogu AYNI kaliyor; ayrismalari "hammaddede doviz var, mamulde
                        yok" gibi bir tuhaflik uretirdi. */}
                    <select
                      value={editForm.satisParaBirimi}
                      onChange={(e) => setEditForm({ ...editForm, satisParaBirimi: e.target.value })}
                      className="mono"
                      style={{ border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", padding: "2px 3px", fontSize: 12, background: "#fff" }}
                    >
                      {PARA_BIRIMLERI.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
                    Alış: <span className="mono" style={{ fontWeight: 600 }}>{alisFiyati.toFixed(2)} {product.alisParaBirimi || "₺"}</span>
                  </span>
                  <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
                    Satış: <span className="mono" style={{ fontWeight: 600 }}>{satisFiyati.toFixed(2)} {satisBirimi}</span>
                  </span>
                </>
              )}
              {karMarji !== null ? (
                <span style={{ fontSize: 12, color: kar >= 0 ? "var(--erp-primary)" : "var(--erp-warn)", fontWeight: 600 }}>
                  Kâr: {kar.toFixed(2)} {satisBirimi} (%{karMarji})
                </span>
              ) : (!birimlerAyni && satisFiyati > 0 && alisFiyati > 0 ? (
                <span style={{ fontSize: 12, color: "var(--erp-brown)" }} title="Alış ve satış farklı para biriminde — kâr çevrilmeden hesaplanamaz">
                  Kâr: {alisBirimi} → {satisBirimi}, hesaplanmadı
                </span>
              ) : null)}
              <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
                Stok Değeri: <span className="mono" style={{ fontWeight: 600 }}>{stokDegeri.toFixed(2)} {satisBirimi}</span>
              </span>
              {(product.ekFiyatlar || []).map((f) => (
                <span
                  key={f.id}
                  className="mono"
                  style={{
                    display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600,
                    background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-pill)", padding: "3px 7px",
                  }}
                >
                  {f.tip === "Alış" ? "Alış" : "Satış"}: {f.paraBirimi}{f.tutar}
                  <button onClick={() => onEkFiyatSil(product.id, f.id)} style={{ border: "none", background: "none", color: "var(--erp-text-3)", cursor: "pointer", display: "flex" }}>
                    <X size={10} />
                  </button>
                </span>
              ))}
                          </div>
          ) : (
            <div style={{ display: "flex", gap: 10, rowGap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
              {showEdit ? (
                <>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>
                    Alış
                    <input
                      type="number" step="any" min="0"
                      value={editForm.alisFiyati}
                      onChange={(e) => setEditForm({ ...editForm, alisFiyati: e.target.value })}
                      className="mono"
                      style={{ ...inputStyle, width: 74, padding: "4px 6px" }}
                    />
                    <select
                      value={editForm.alisParaBirimi}
                      onChange={(e) => setEditForm({ ...editForm, alisParaBirimi: e.target.value })}
                      className="mono"
                      style={{ border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", padding: "2px 3px", fontSize: 12, background: "#fff" }}
                    >
                      {PARA_BIRIMLERI.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </label>
                  {/* HAMMADDEDE DE SATIŞ FİYATI: artan deri, fazla taban satılabiliyor ve satış
                      fişi kesilirken fiyatın bir yerden gelmesi gerekiyor. `fiyatBul` zaten
                      kategoriye bakmıyor, yalnızca alan boş olduğu için sıfır dönüyordu. */}
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>
                    Satış
                    <input
                      type="number" step="any" min="0"
                      value={editForm.satisFiyati}
                      onChange={(e) => setEditForm({ ...editForm, satisFiyati: e.target.value })}
                      className="mono"
                      style={{ ...inputStyle, width: 74, padding: "4px 6px" }}
                    />
                    {/* SATISIN KENDI PARA BIRIMI. Once burada "₺" sabit yaziliydi: dovizle
                        satilan bir urunun fiyati ekranda yanlis birimle gorunuyordu. Mamul ve
                        hammadde blogu AYNI kaliyor; ayrismalari "hammaddede doviz var, mamulde
                        yok" gibi bir tuhaflik uretirdi. */}
                    <select
                      value={editForm.satisParaBirimi}
                      onChange={(e) => setEditForm({ ...editForm, satisParaBirimi: e.target.value })}
                      className="mono"
                      style={{ border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", padding: "2px 3px", fontSize: 12, background: "#fff" }}
                    >
                      {PARA_BIRIMLERI.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </label>
                  <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
                    Değer: <span className="mono" style={{ fontWeight: 600 }}>{(total * alisFiyati).toFixed(2)} {product.alisParaBirimi || "₺"}</span>
                  </span>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>
                    Tedarikçi
                    <select
                      value={editForm.tedarikciId || ""}
                      onChange={(e) => {
                        // Yeni tedarikçi buradan da açılabilir — ürün düzenlerken listede yoksa
                        // formu kapatıp Cari modülüne gitmek gereksiz bir yol.
                        if (e.target.value === "__yeni__") {
                          const ad = window.prompt("Yeni tedarikçi unvanı:");
                          if (!ad || !ad.trim()) return;
                          const yeniId = onHizliCariEkle && onHizliCariEkle(ad, "Tedarikçi");
                          if (yeniId) setEditForm({ ...editForm, tedarikciId: yeniId });
                          return;
                        }
                        setEditForm({ ...editForm, tedarikciId: e.target.value });
                      }}
                      style={{ ...inputStyle, width: 150, padding: "4px 6px", fontWeight: 400 }}
                    >
                      <option value="">Seçilmedi</option>
                      {(cariler || [])
                        .filter((c) => (c.tip === "Tedarikçi" || c.tip === "Her İkisi") && (!c.pasif || c.id === editForm.tedarikciId))
                        .map((c) => <option key={c.id} value={c.id}>{secenekEtiketi(c, c.unvan)}</option>)}
                      {onHizliCariEkle && <option value="__yeni__">+ Yeni tedarikçi tanımla…</option>}
                    </select>
                  </label>
                  {/* PAKETLEME NOTU KALDIRILDI (kullanıcı, 19 Eylül: "şu an mantıksız, kaldıralım,
                      ekran sadeleşsin"). Serbest metin bir nottu ve HİÇBİR YER okumuyordu: ne
                      paketleme modülü, ne alış siparişi, ne fiş. Doldurulan bir alanın hiçbir işe
                      yaramaması, boş durmasından kötü — kullanıcı "bir yerde kullanılıyordur"
                      diye düşünür. (Paket büyüklüğüyle satın alma yuvarlaması istenirse SAYI
                      alanı olarak yeniden kurulur; metin notu o işi yapamazdı.) */}
                  {/* Malzeme tipi yalnızca oluşturma formunda vardı; kaydedildikten sonra
                      düzenlenemiyordu. Yanlış tip seçilmiş bir hammaddenin renk listesi ömür boyu
                      yanlış daralmış kalıyordu — tek çare ürünü silip yeniden açmaktı.
                      Yeni tip eklemek yine Tanımlar'dan; burası mevcutlar arasında seçim yeri. */}
                  {product.kategori === "Hammadde" && (
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>
                      Malzeme Tipi
                      <select
                        value={editForm.malzemeTipi}
                        onChange={(e) => setEditForm({ ...editForm, malzemeTipi: e.target.value })}
                        style={{ border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", padding: "4px 6px", fontSize: 12, background: "#fff", fontWeight: 400 }}
                      >
                        <option value="">Genel</option>
                        {/* Kayıtlı tip listeden silinmişse seçenek olarak KALIR: aksi halde tarayıcı
                            ilk seçeneği gösterir, kullanıcı "Genel" sanır ve kaydedince gerçekten
                            Genel olur — sessiz veri kaybı. */}
                        {editForm.malzemeTipi &&
                          !(tanimlarHammaddeTipleri || []).some((h) => h.ad === editForm.malzemeTipi) && (
                            <option value={editForm.malzemeTipi}>{editForm.malzemeTipi} (listede yok)</option>
                          )}
                        {(tanimlarHammaddeTipleri || []).map((h) => <option key={h.id} value={h.ad}>{h.ad}</option>)}
                      </select>
                    </label>
                  )}
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>
                    Proses
                    <select
                      value={editForm.varsayilanProses}
                      onChange={(e) => setEditForm({ ...editForm, varsayilanProses: e.target.value })}
                      className="mono"
                      style={{ border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", padding: "4px 6px", fontSize: 12, background: "#fff", fontWeight: 400 }}
                    >
                      <option value="">—</option>
                      {(tanimlarProsesler || []).map((p) => <option key={p.id} value={p.ad}>{p.ad}</option>)}
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
                    Alış: <span className="mono" style={{ fontWeight: 600 }}>{alisFiyati.toFixed(2)} {product.alisParaBirimi || "₺"}</span>
                  </span>
                  {/* Satış YALNIZCA GİRİLMİŞSE gösteriliyor. Çoğu hammadde satılmıyor; her satırda
                      "Satış: 0,00 ₺" taşımak, bilgi vermeyen bir gürültü olurdu. */}
                  {satisFiyati > 0 && (
                    <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
                      Satış: <span className="mono" style={{ fontWeight: 600 }}>{satisFiyati.toFixed(2)} {satisBirimi}</span>
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
                    Değer: <span className="mono" style={{ fontWeight: 600 }}>{(total * alisFiyati).toFixed(2)} {product.alisParaBirimi || "₺"}</span>
                  </span>
                  {(() => {
                    const ted = urunTedarikcisi(product, cariler);
                    return (
                      <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
                        Tedarikçi:{" "}
                        {ted ? (
                          <button
                            type="button"
                            onClick={() => ted.id && onGoToCari && onGoToCari(ted.id)}
                            disabled={!ted.id}
                            title={ted.id ? "Cari kartına git" : "Bu kayıt eski biçimde, serbest metin olarak girilmiş"}
                            style={{
                              border: "none", background: "none", padding: 0, fontWeight: 600,
                              color: ted.id ? "var(--erp-info)" : "var(--erp-text-3)", cursor: ted.id ? "pointer" : "default",
                            }}
                          >
                            {ted.unvan}
                          </button>
                        ) : <span style={{ fontWeight: 600 }}>—</span>}
                      </span>
                    );
                  })()}

                  <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>Proses: <span style={{ fontWeight: 600 }}>{product.varsayilanProses || "—"}</span></span>
                </>
              )}
              {(product.ekFiyatlar || []).map((f) => (
                <span
                  key={f.id}
                  className="mono"
                  style={{
                    display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600,
                    background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-pill)", padding: "3px 7px",
                  }}
                >
                  {f.tip === "Satış" ? "Satış" : "Alış"}: {f.paraBirimi}{f.tutar}
                  <button onClick={() => onEkFiyatSil(product.id, f.id)} style={{ border: "none", background: "none", color: "var(--erp-text-3)", cursor: "pointer", display: "flex" }}>
                    <X size={10} />
                  </button>
                </span>
              ))}
              {/* Hammaddede de satış olduğu için ek fiyat tipi artık seçilebiliyor; önceden
                  "Alış" sabit yazılıydı ve seçilen tip yok sayılıyordu.
                  YORUM ÖZNİTELİKLERİN ARASINA KONULAMAZ — sözdizimi hatası verir (bkz. sık
                  karşılaşılan hata kalıpları, 1. madde). */}
                          </div>
          )}
          </div>
        </div>
        {/* Düzenle / pasife al / sil ikonları kart BAŞLIĞINA taşındı — burada tekrar edilmiyor. */}
      </div>

      {urunSilOnay && (() => {
        const bagliUretimler = (uretim || []).filter((o) => o.urunId === product.id);
        const bagliSiparisSayisi = (siparisler || []).filter((s) => s.kalemler.some((k) => k.urunId === product.id)).length;
        const hammaddesiOlarakKullanan = (tumUrunler || []).filter(
          (p) => p.id !== product.id && (p.recete || []).some((r) => r.hammaddeUrunId === product.id)
        );
        const hareketSayisi = (product.hareketler || []).length;
        const baglantiVarMi = hareketSayisi > 0 || bagliUretimler.length > 0 || bagliSiparisSayisi > 0 || hammaddesiOlarakKullanan.length > 0;
        const alisSayisi = (product.hareketler || []).filter((h) => h.kaynak === "Satınalma").length;
        const satisSayisi = (product.hareketler || []).filter((h) => h.kaynak === "Satış").length;
        const uretimHareketSayisi = (product.hareketler || []).filter((h) => h.uretimId || (h.kaynak || "").startsWith("Üretim")).length;
        const digerHareketSayisi = hareketSayisi - alisSayisi - satisSayisi - uretimHareketSayisi;
        return (
          <div style={{ background: "var(--erp-orange-bg)", border: "1.5px solid #E1611F", borderRadius: "var(--erp-r-md)", padding: 10, marginBottom: 14 }}>
            {baglantiVarMi ? (
              <>
                {/* Bağlantılı ürün SİLİNMEZ. Eskiden burada "Evet, Hepsini Sil" düğmesi vardı ve
                    ürünle birlikte hareketleri, üretimleri, sipariş kalemlerini ve reçete satırlarını
                    da götürüyordu. Bu kayıtlar birbirine bağlı bir ağ; bir düğümü çekip almak bağlı
                    olduğu her yerde delik açıyordu. Artık silme değil, NEDEN silinemediği gösteriliyor. */}
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-warn)", marginBottom: 6 }}>
                  "{product.ad}" silinemez — geçmişi olan ürünler silinmez.
                </div>
                <div style={{ fontSize: 11, color: "#7A3B22", marginBottom: 6 }}>
                  Bu ürüne bağlı kayıtlar var. Ürünü silmek, bu kayıtların bağlandığı her yerde
                  (cari ekstresi, üretim geçmişi, reçete maliyeti) tutarsızlık bırakırdı.
                </div>
                <ul style={{ margin: "0 0 8px", paddingLeft: 18, fontSize: 12, color: "var(--erp-text)" }}>
                  {alisSayisi > 0 && <li>{alisSayisi} alış hareketi</li>}
                  {satisSayisi > 0 && <li>{satisSayisi} satış hareketi</li>}
                  {uretimHareketSayisi > 0 && <li>{uretimHareketSayisi} üretim hareketi</li>}
                  {digerHareketSayisi > 0 && <li>{digerHareketSayisi} diğer stok hareketi</li>}
                  {bagliUretimler.length > 0 && <li>{bagliUretimler.length} üretim siparişi ({bagliUretimler.map((o) => o.siparisNo).join(", ")})</li>}
                  {bagliSiparisSayisi > 0 && <li>{bagliSiparisSayisi} siparişte kullanılıyor</li>}
                  {hammaddesiOlarakKullanan.length > 0 && <li>Şu ürünlerin reçetesinde hammadde: {hammaddesiOlarakKullanan.map((p) => p.ad).join(", ")}</li>}
                </ul>
                <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginBottom: 8, lineHeight: 1.6 }}>
                  Ürünü kullanımdan kaldırmak istiyorsanız yeni işlem girmeyin; geçmişi olduğu gibi kalsın.
                  Gerçekten silmeniz gerekiyorsa önce bağlı kayıtları tek tek kaldırmanız gerekir.
                </div>
                <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setUrunSilOnay(false)}>
                  Anladım
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-warn)", marginBottom: 8 }}>
                  Bu ürünü silmek istediğinize emin misiniz?
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => { onRemoveProduct(product.id); setUrunSilOnay(false); }}>
                    <Trash2 size={13} /> Evet, Sil
                  </button>
                  <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setUrunSilOnay(false)}>
                    Vazgeç
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {showEdit && editForm && (
        <div style={{ background: "#fff", border: "1.5px solid #E1611F", borderRadius: "var(--erp-r-md)", padding: 14, marginBottom: 14 }}>
          {/* KAYDET/VAZGEÇ KART BAŞLIĞINA TAŞINDI (kullanıcı, 20 Eylül: "Kaydet bazen aşağıda
              bazen yukarıda... tek tipe almamız lazım"). Cari kartıyla aynı düzen: düzenleme
              modunda başlıkta Kaydet · Vazgeç, gövdede eylem düğmesi yok. */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 10 }}>
            <Field label="Ürün Adı">
              <input value={editForm.ad} onChange={(e) => setEditForm({ ...editForm, ad: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Birim">
              {/* ÜRÜNÜN MEVCUT BİRİMİ LİSTEDE YOKSA yine de gösterilir.
                  Aksi halde tarayıcı listenin İLK seçeneğini gösteriyor ve kullanıcı ürünün
                  birimini yanlış biliyor: "çift" olan bir ürün "Desi" görünüyor, kaydete
                  basıldığında da gerçekten Desi'ye dönüyordu.
                  Uyuşmazlık genelde büyük/küçük harften geliyor ("çift" ve "Çift" ayrı değerler). */}
              {(() => {
                const mevcut = editForm.birim || "";
                const secenekler = birimSecenekleri(tanimlarBirimler, mevcut);
                const listedeVar = (tanimlarBirimler || []).some((b) => b.ad === mevcut) ||
                  (!(tanimlarBirimler || []).length && BIRIMLER.includes(mevcut));
                return (
                  <>
                    <select
                      value={mevcut}
                      onChange={(e) => setEditForm({ ...editForm, birim: e.target.value })}
                      style={{ ...inputStyle, ...(listedeVar ? {} : { borderColor: "var(--erp-orange)" }) }}
                    >
                      {secenekler.map((ad) => (
                        <option key={ad} value={ad}>{ad}{!listedeVar && ad === mevcut ? " (tanımlı değil)" : ""}</option>
                      ))}
                    </select>
                    {!listedeVar && mevcut && (
                      <span style={{ fontSize: 10, color: "var(--erp-warn)", marginTop: 3, display: "block", lineHeight: 1.5 }}>
                        Bu birim Tanımlar'daki listede yok. Listeden birini seçebilir ya da
                        Tanımlar → Birimler'e ekleyebilirsiniz.
                      </span>
                    )}
                  </>
                );
              })()}
            </Field>
            {/* Mamulde ölçü tipi seçilmez — her zaman Beden. Alan gizlenir, değer korunur. */}
            {!isMamul && (
              <Field label="Ölçü Tipi">
                <select value={editForm.olcuTipi} onChange={(e) => setEditForm({ ...editForm, olcuTipi: e.target.value })} style={inputStyle}>
                  <option value="Beden">Beden</option>
                  <option value="Boyut">Boyut</option>
                </select>
              </Field>
            )}
            <Field label="Tüm Renk/Bedenlere Min. Stok Uygula (opsiyonel)">
              <input
                type="number" value={editForm.minStokTumu}
                onChange={(e) => setEditForm({ ...editForm, minStokTumu: e.target.value })}
                placeholder="Boş bırakırsanız değişmez"
                style={inputStyle}
              />
            </Field>
          </div>
        </div>
      )}

      {(() => {
        const siparisSayisi = (siparisler || []).filter((s) => s.kalemler.some((k) => k.urunId === product.id)).length;
        // Bu ürünü REÇETESİNDE kullanan mamuller. Bir hammaddeyi değiştirmeden ya da pasife almadan
        // önce "bu nerelerde kullanılıyor" sorusunun cevabı gerekiyor; şimdiye kadar bunu bulmanın
        // tek yolu ürünleri tek tek açıp reçetelerine bakmaktı.
        const kullananSayisi = (tumUrunler || []).filter(
          (u) => u.id !== product.id && (u.recete || []).some((r) => r.hammaddeUrunId === product.id)
        ).length;
        const sekmeler = [
          { key: "stok", label: "Stok Bilgileri" },
          // Sayı, HAM satır sayısı değil ekranda görünen SATIR (hammadde girişi) sayısıdır.
          // Ham sayı yanıltıcıydı: reçete her mamul renk × beden için ayrı kayıt tuttuğu için
          // 5 hammaddelik bir reçete "131" gibi görünüyor ve hiçbir şey ifade etmiyordu.
          ...(isMamul
            // Prosessiz reçete satırı üretimde HİÇ düşülmez — sekme etiketinde uyarmak, kullanıcının
            // reçeteyi açıp tek tek bakmasını beklemekten iyi.
            ? [{
                key: "recete",
                label: (() => {
                  const gruplar = receteGrupla(product.recete || []);
                  const prosessiz = gruplar.filter((g) => !(g.satirlar[0] && g.satirlar[0].proses)).length;
                  return `Reçete (${gruplar.length})${prosessiz > 0 ? ` ⚠ ${prosessiz} prosessiz` : ""}`;
                })(),
              }, { key: "maliyet", label: "Maliyet" }]
            : []),
          { key: "fiyat", label: `Fiyatlandırma${(product.fiyatKurallari || []).length > 0 ? ` (${(product.fiyatKurallari || []).length})` : ""}` },
          { key: "siparisler", label: `Siparişler (${siparisSayisi})` },
          // Stok hareketleri ve özel kodlar kartın EN ALTINDA duruyordu: her ürün açılışında
          // ekranı uzatıyor, arandığında ise sayfayı sonuna kadar kaydırmak gerekiyordu.
          { key: "hareketler", label: `Stok Hareketleri (${hareketleriGrupla(product.hareketler || []).length})` },
          // BARKODLAR — hangi renk/bedende hangi kod var, tek yerde.
          // Kodlar varyantların üstünde duruyordu ve yalnızca etiket basarken görülüyordu;
          // "bu kod hangi ürünün" sorusunu tersinden cevaplayacak bir yer yoktu.
          { key: "barkodlar", label: `Barkodlar (${(product.variants || []).filter((v) => varyantinBarkodu(product, v, barkodTanimlari)).length})` },
          // Sekme yalnızca gerçekten kullanılıyorsa çıkar; boş bir sekme göstermek gürültü olur.
          ...(kullananSayisi > 0 ? [{ key: "kullanim", label: `Kullanıldığı Ürünler (${kullananSayisi})` }] : []),
          // SEKME HER ZAMAN VAR. Önceden "uygulanan alan yoksa hiç çıkmasın" kuralı vardı;
          // gerekçesi "içi boş bir sekme kullanıcıyı 'bir şey mi eksik' diye düşündürür"dü.
          // Alan EKLEME buraya gelince o kural bir KISIR DÖNGÜYE dönüştü: alan eklemenin yolu
          // sekmenin içinde, sekme ise alan olmadan açılmıyordu. Boş sekme artık boş değil —
          // içinde "Alan Ekle" ve durumun sebebi var.
          // TEKNİK ÇİZİM (kullanıcı, 17 Eylül: "stok kartı içinde üretim teknik çizimlerini
          // yükleyeceğimiz, teknik resim detayları vereceğimiz sekme ekleyelim; o alan oluşsun,
          // altını dolduracağız"). Şimdilik iskelet: çizim görselleri + ölçü/malzeme notları.
          // Mamulde her zaman, hammaddede yalnız çizim varsa çıkıyor — deri/iplik kartında boş
          // bir "teknik çizim" sekmesi gürültü olurdu.
          ...((product.kategori === "Mamul" || (product.teknikCizimler || []).length > 0)
            ? [{ key: "teknik", label: `Teknik Çizim${(product.teknikCizimler || []).length > 0 ? ` (${product.teknikCizimler.length})` : ""}` }]
            : []),
          {
            key: "kodlar",
            label: (() => {
              const dolu = ozelKodCiftleri(product, tanimlarOzelKodAlanlari).length;
              return `Özel Kodlar${dolu > 0 ? ` (${dolu})` : ""}`;
            })(),
          },
        ];
        return (
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {sekmeler.map((t) => (
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
        );
      })()}

      {cardTab === "stok" && (
      <>
      {/* ---- STOK DURUMU ----
          Beş büyüklük ve ilişkileri (sütun başlıklarında da açıklanıyor):
            serbest         = stok − rezerve
            beklenenSerbest = serbest + rezervesiz satın alma
          Satıra tıklanınca hangi siparişin ne istediği ve hangi alışın yolda olduğu açılır. */}
      {(() => {
        const satirlar = [];
        (product.variants || []).forEach((v) => {
          const d = stokDurumu(product.id, v.renk, v.beden, tumSiparisler, stokRezervasyonlari, [product]);
          // Hareketsiz varyantları gizle: ne stok, ne talep, ne yoldaki alım varsa satır boş olur.
          if (d.stok === 0 && d.toplamTalep === 0 && d.yoldaSerbest === 0 && d.yoldaRezerve === 0) return;
          satirlar.push({ renk: v.renk, beden: v.beden, ...d });
        });
        if (satirlar.length === 0) return null;
        const acikVar = satirlar.some((s) => s.acikToplam > 0);
        return (
          <div style={{ background: "var(--erp-panel)", border: `1px solid ${acikVar ? "var(--erp-orange)" : "#C9A063"}`, borderRadius: "var(--erp-r-md)", padding: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7, flexWrap: "wrap" }}>
              <Boxes size={14} color="var(--erp-brown)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-brown)" }}>Stok Durumu</span>
              <span style={{ fontSize: 10, color: "var(--erp-text-3)" }}>
                {/* FORMÜL SAYILARI TUTMAK ZORUNDA.
                    Eskiden "beklenen = serbest + satın alma" yazıyordu. SATIN ALMA sütunu artık
                    REZERVELİ alımları da gösterdiği için (v1.110.0) formül sayıları tutmuyordu:
                    satırda serbest 1 · satın alma 6 · beklenen 1 görünüyor, formül 7 diyordu.
                    Beklenen yalnızca REZERVESİZ alımı sayar — rezerveli mal geldiğinde başka bir
                    siparişe gider, serbest kalmaz. */}
                {/* SÜTUN ADIYLA AÇIKLAMA AYNI KELİMEYİ KULLANMAK ZORUNDA.
                    Sütun başlığı AYRILAN'a çevrildi ama bu satır hâlâ "rezerve" diyordu; ekranda
                    iki farklı ad aynı sütunu anlatıyordu.

                    Kullanıcının ikinci sorusu: "her rengin rezervesi var ama sadece Beyaz 36'da
                    görünüyor, diğerlerinde neden yok?" Cevap AYRILAN'ın tanımında: stoktan ayrılır.
                    Stok yoksa ayrılacak bir şey de yoktur; rezervasyonun kendisi TALEP sütununda
                    duruyor. Bu cümle açıklamaya EKLENDİ — ipucunda yazıyordu ama telefonda ipucu
                    görünmüyor. */}
                ayrılan = açık taleplere STOKTAN verilen (otomatik) · stok yoksa 0 olur,
                {" "}rezervasyonun tamamı TALEP sütununda ·{" "}
                serbest = stok − ayrılan ·{" "}
                beklenen serbest = serbest + tahsis edilmemiş alış siparişi
              </span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--erp-text-3)" }}>satır detayı için tıklayın</span>
            </div>
            <StokDurumuTablosu
              satirlar={satirlar}
              birim={product.birim}
              onGoToSiparis={onGoToSiparis}
            />
          </div>
        );
      })()}

      <div>
        {/* Tek bir başlık: "Renkler ve Bedenler" — tıklanınca TÜM renk×beden matrisi birlikte açılır/kapanır. */}
        <button
          type="button"
          onClick={() => setStokMatrisAcik((v) => !v)}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
            background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", cursor: "pointer", textAlign: "left",
            marginBottom: stokMatrisAcik ? 10 : 0,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 13, color: "var(--erp-text)" }}>Renkler ve Bedenler</span>
          <span className="mono" style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
            {renkler.length} renk × {bedenler.length} beden
          </span>
          <span style={{ marginLeft: "auto", display: "flex" }}>
            {stokMatrisAcik ? <ChevronDown size={18} color="var(--erp-text-3)" /> : <ChevronRight size={18} color="var(--erp-text-3)" />}
          </span>
        </button>

        {stokMatrisAcik && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "auto", minWidth: "100%" }}>
              <thead>
                <tr>
                  <th>Renk \ Beden</th>
                  {bedenler.map((b) => (
                    <th key={b} className="mono" style={{ textAlign: "center", position: "relative" }}>
                      {b}
                      <SilOnayButonu onConfirm={() => onRemoveBeden(product.id, b)} boyut={12} baslikNormal={`${b} ölçüsü bu üründen kaldırılsın mı?`} />
                    </th>
                  ))}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {renkler.map((r) => (
                  <tr key={r}>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      <ColorSwatch
                        src={(product.renkResimleri || {})[r] || product.kapakResmi}
                        onUrlSave={(url) => onRenkResmiChange(product.id, r, url)}
                        onRemove={() => onRenkResmiRemove(product.id, r)}
                        size={26}
                      />
                      {r}
                      <SilOnayButonu onConfirm={() => onRemoveRenk(product.id, r)} boyut={12} baslikNormal={`${r} rengi bu üründen kaldırılsın mı?`} />
                    </td>
                    {bedenler.map((b) => {
                      const qty = getQty(r, b);
                      const minStok = getMinStok(r, b);
                      const low = qty <= minStok;
                      const rezerve = isMamul
                        ? mamulRezerveHesapla(product.id, r, b, siparisler)
                        : hammaddeRezerveHesapla(product.id, r, b, uretim, tumUrunler);
                      return (
                        <td key={b} style={{ textAlign: "center" }}>
                          <StokGirisHucre
                            qty={qty}
                            low={low}
                            minStok={minStok}
                            rezerve={rezerve}
                            onMinStokChange={(deger) => onMinStokGuncelle(product.id, r, b, deger)}
                            onGoToSiparis={onGoToSiparis}
                            onGoToUretim={onGoToUretim}
                          />
                        </td>
                      );
                    })}
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
        {addingRenk ? (
          <div style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 12, minWidth: 280 }}>
            {isMamul && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>Kaç renkli?</span>
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => { setRenkEkleSayisi(n); setNewRenk(""); setYeniModelRengiModu(false); setYmrPozisyonSecimleri({}); setYeniTekliRenkGiris(false); }}
                    style={{
                      width: 24, height: 24, borderRadius: "50%", border: `1.5px solid ${renkEkleSayisi === n ? "var(--erp-purple)" : "var(--erp-border)"}`,
                      background: renkEkleSayisi === n ? "#EDE7F2" : "#fff", color: renkEkleSayisi === n ? "var(--erp-purple)" : "var(--erp-text-2)",
                      cursor: "pointer", fontSize: 11, fontWeight: 700,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}

            {!yeniModelRengiModu ? (() => {
              // Seçilen "kaç renkli" değerine uygun, ZATEN TANIMLI (bu ürüne henüz eklenmemiş) renk/kombinasyonları listeler.
              const uygunSecenekler = !isMamul || renkEkleSayisi === 1
                ? eklenebilirRenkler.map((r) => ({ id: r.id, etiket: r.ad }))
                : eklenebilirKombinasyonlar.filter((k) => k.renkIdler.length === renkEkleSayisi);
              return (
                <div>
                  {uygunSecenekler.length > 0 ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                      <select value={newRenk} onChange={(e) => setNewRenk(e.target.value)} style={{ ...inputStyle, width: 180 }}>
                        <option value="">Seçin…</option>
                        {uygunSecenekler.map((s) => <option key={s.id} value={s.etiket}>{s.etiket}</option>)}
                      </select>
                      <button
                        className="btn-primary"
                        disabled={!newRenk}
                        onClick={() => {
                          onAddRenk(product.id, newRenk);
                          setNewRenk(""); setAddingRenk(false); setRenkEkleSayisi(1);
                        }}
                      >
                        Ekle
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--erp-text-3)", marginBottom: 8 }}>
                      {isMamul && renkEkleSayisi > 1
                        ? `${renkEkleSayisi} renkli tanımlı bir Model Rengi yok.`
                        : "Tanımlı renk yok."}
                    </div>
                  )}

                  {isMamul && renkEkleSayisi > 1 && onKombinasyonOlustur ? (
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ color: "var(--erp-purple)", fontSize: 12 }}
                      onClick={() => setYeniModelRengiModu(true)}
                    >
                      <Plus size={12} /> Bu sayıda yeni Model Rengi oluştur
                    </button>
                  ) : renkEkleSayisi === 1 && (
                    // 1 renkli için de tutarlı davranış: liste dolu olsa bile "yeni renk ekle" seçeneği
                    // her zaman erişilebilir — istediğiniz renk listede yoksa buradan ekleyebilirsiniz.
                    yeniTekliRenkGiris ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          autoFocus
                          value={newRenk}
                          onChange={(e) => setNewRenk(e.target.value)}
                          placeholder="Yeni renk"
                          style={{ ...inputStyle, width: 120 }}
                        />
                        <button
                          className="btn-ghost"
                          onClick={() => {
                            if (onYeniRenkKaydet) {
                              onYeniRenkKaydet(newRenk, "Hammadde", !isMamul ? product.malzemeTipi : undefined);
                            }
                            onAddRenk(product.id, newRenk);
                            setNewRenk(""); setAddingRenk(false); setRenkEkleSayisi(1); setYeniTekliRenkGiris(false);
                          }}
                        >
                          Ekle
                        </button>
                        <button className="btn-ghost" onClick={() => { setYeniTekliRenkGiris(false); setNewRenk(""); }}><X size={13} /></button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ color: "var(--erp-purple)", fontSize: 12 }}
                        onClick={() => { setYeniTekliRenkGiris(true); setNewRenk(""); }}
                      >
                        <Plus size={12} /> Listede Yok, Yeni Renk Ekle
                      </button>
                    )
                  )}
                </div>
              );
            })() : (
              // Sistem 2: seçilen sayıda tanımlı Model Rengi yoktu — pozisyon bazlı yeni oluşturma.
              <div>
                {/* Not: aynı renk birden fazla pozisyonda tekrar edebilir (örn. Siyah/Kahve/Siyah
                    geçerli, farklı bir modeldir) — pozisyonlar arasında kısıtlama yok. */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  {Array.from({ length: renkEkleSayisi }, (_, i) => i + 1).map((poz) => {
                    return (
                      <label key={poz} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>{poz}. Renk</span>
                        <select
                          value={ymrPozisyonSecimleri[poz] || ""}
                          onChange={(e) => setYmrPozisyonSecimleri({ ...ymrPozisyonSecimleri, [poz]: e.target.value })}
                          style={{ ...inputStyle, width: 130 }}
                        >
                          <option value="">Seçin…</option>
                          {Array.from(
                            new Map(
                              tanimlarRenkler
                                .filter((r) => !kombinasyonEtiketiFormatindaMi(r.ad))
                                .map((r) => [r.ad, r])
                            ).values()
                          ).map((r) => <option key={r.id} value={r.ad}>{r.ad}</option>)}
                        </select>
                      </label>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={Array.from({ length: renkEkleSayisi }, (_, i) => i + 1).some((poz) => !ymrPozisyonSecimleri[poz])}
                    onClick={() => {
                      const renkAdlari = Array.from({ length: renkEkleSayisi }, (_, i) => ymrPozisyonSecimleri[i + 1]);
                      const etiket = onKombinasyonOlustur(renkAdlari);
                      if (etiket) {
                        onAddRenk(product.id, etiket);
                        setYmrPozisyonSecimleri({}); setRenkEkleSayisi(1);
                        setYeniModelRengiModu(false); setAddingRenk(false);
                      }
                    }}
                  >
                    <Plus size={13} /> Model Rengi Olarak Ekle
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setYeniModelRengiModu(false)}>
                    ← Listeden Seçmeye Dön
                  </button>
                </div>
              </div>
            )}

            <button
              className="btn-ghost"
              style={{ marginTop: 8 }}
              onClick={() => { setAddingRenk(false); setYeniModelRengiModu(false); setRenkEkleSayisi(1); setNewRenk(""); setYeniTekliRenkGiris(false); }}
            >
              <X size={13} /> Vazgeç
            </button>
          </div>
        ) : (
          <button className="btn-ghost" onClick={() => { setAddingRenk(true); setYeniModelRengiModu(false); setRenkEkleSayisi(1); setYeniTekliRenkGiris(false); }}><Plus size={13} /> Renk Ekle</button>
        )}

        {addingBeden ? (
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {/* Tanımlı ölçüler açılır listede; listede olmayan bir ölçü serbest yazılabilir.
                Serbest yazılan bir BOYUT, ürünün malzeme tipine bağlanarak Tanımlar'a kaydedilir —
                bağcık ürününde eklenen "16 cm" bağcık boyutu olur, kutu ürününde listelenmez. */}
            {eklenebilirBedenler.length > 0 && !serbestOlcuGiris ? (
              <select value={newBeden} onChange={(e) => setNewBeden(e.target.value)} style={{ ...inputStyle, width: 110 }}>
                <option value="">{eklemeOlcuTipi} seçin</option>
                {eklenebilirBedenler.map((b) => <option key={b.id} value={b.ad}>{b.ad}</option>)}
              </select>
            ) : (
              <input
                autoFocus
                value={newBeden}
                onChange={(e) => setNewBeden(e.target.value)}
                placeholder={eklemeOlcuTipi === "Boyut" ? "örn. 16 cm" : `Yeni ${eklemeOlcuTipi.toLowerCase()}`}
                style={{ ...inputStyle, width: 110 }}
              />
            )}
            {eklenebilirBedenler.length > 0 && (
              <button
                className="btn-ghost"
                style={{ padding: "6px 10px", fontSize: 12, borderStyle: serbestOlcuGiris ? "solid" : "dashed" }}
                title={serbestOlcuGiris ? "Tanımlı listeden seç" : `Listede olmayan bir ${eklemeOlcuTipi.toLocaleLowerCase("tr-TR")} yaz`}
                onClick={() => { setSerbestOlcuGiris((v) => !v); setNewBeden(""); }}
              >
                {serbestOlcuGiris ? "Listeden seç" : <><Plus size={12} /> Yeni</>}
              </button>
            )}
            <button
              className="btn-ghost"
              onClick={() => {
                const ad = (newBeden || "").trim();
                if (!ad) return;
                // Tanımlarda yoksa önce oraya kaydedilir; boyutsa ürünün malzeme tipine bağlanır.
                const tanimliMi = (tanimlarBedenler || []).some(
                  (b) => b.ad.toLowerCase() === ad.toLowerCase() && (b.tip || "Beden") === eklemeOlcuTipi
                );
                if (!tanimliMi && onYeniOlcuKaydet) {
                  onYeniOlcuKaydet(ad, eklemeOlcuTipi, eklemeOlcuTipi === "Boyut" ? product.malzemeTipi : "");
                }
                onAddBeden(product.id, ad);
                setNewBeden("");
                setSerbestOlcuGiris(false);
                setAddingBeden(false);
              }}
            >
              Ekle
            </button>
            <button className="btn-ghost" onClick={() => { setAddingBeden(false); setSerbestOlcuGiris(false); setNewBeden(""); }}><X size={13} /></button>
            {/* BEDEN GRUBU (14 Eylül): tanımlı grup tek dokunuşla eklenir — "36-40" → 36,37,38,39,40.
                Üründe zaten olan bedenler atlanır, kaç tanesinin eklendiği söylenir. */}
            {eklemeOlcuTipi === "Beden" && (tanimlarBedenGruplari || []).length > 0 && (
              <span style={{ display: "inline-flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--erp-text-2)" }}>grup:</span>
                {(tanimlarBedenGruplari || []).map((g) => (
                  <button key={g.id} type="button" className="btn-ghost" data-beden-grup-ekle={g.ad}
                    style={{ padding: "4px 9px", fontSize: 11 }}
                    title={`${(g.bedenler || []).join(", ")} — üründe olmayanlar eklenir`}
                    onClick={() => {
                      const eklenecek = (g.bedenler || []).filter((b) => !bedenler.includes(b));
                      if (eklenecek.length) onAddBeden(product.id, eklenecek);   // TEK yazma
                      setAddingBeden(false); setNewBeden("");
                      showToast(eklenecek.length ? `${g.ad}: ${eklenecek.length} beden eklendi` : `${g.ad}: hepsi zaten var`);
                    }}>
                    {g.ad}
                  </button>
                ))}
              </span>
            )}
          </div>
        ) : (
          <>
            <button className="btn-ghost" onClick={() => { setEklemeOlcuTipi("Beden"); setAddingBeden(true); }}>
              <Plus size={13} /> Beden Ekle
            </button>
            {/* Boyut yalnızca HAMMADDE ve YARI MAMULDE: ayakkabı bedenle ölçülür, boyutla değil. */}
            {!isMamul && (
              <button className="btn-ghost" onClick={() => { setEklemeOlcuTipi("Boyut"); setAddingBeden(true); }}>
                <Plus size={13} /> Boyut Ekle
              </button>
            )}
          </>
        )}
      </div>


      </>
      )}

      {isMamul && cardTab === "recete" && (
        <div>
          {/* ŞABLON ÇUBUĞU (21 Eylül): standart malzemeleri (yapıştırıcı, silme suyu, fort bombe…)
              tek dokunuşla ekle ya da bu reçetenin standart kısmını şablon olarak sakla. */}
          <div data-recete-sablon-cubugu="1" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
            background: "var(--erp-panel)", border: "1px dashed var(--erp-border)", borderRadius: "var(--erp-r-md)", padding: "8px 10px", marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text-2)" }}>Reçete şablonu:</span>
            <select data-recete-sablon-sec="1" value={sablonSecim} onChange={(e) => setSablonSecim(e.target.value)}
              style={{ padding: "5px 8px", fontSize: 13, border: "1px solid var(--erp-border)", borderRadius: "var(--erp-r-sm)", minWidth: 160 }}>
              <option value="">— şablon seçin —</option>
              {(receteSablonlari || []).map((sb) => <option key={sb.id} value={sb.id}>{sb.ad} ({(sb.satirlar || []).length})</option>)}
            </select>
            <button type="button" className="btn-primary" data-recete-sablon-uygula="1" disabled={!sablonSecim}
              onClick={() => {
                const sb = (receteSablonlari || []).find((x) => x.id === sablonSecim);
                if (!sb) return;
                const { eklenecekler, atlanan } = sablonuUruneUygula(sb, product);
                if (eklenecekler.length === 0) { (showToast || (() => {}))(atlanan > 0 ? "Şablondaki malzemelerin hepsi zaten reçetede" : "Şablon boş"); return; }
                onReceteGrubuGuncelle(product.id, [], eklenecekler);
                (showToast || (() => {}))(`"${sb.ad}" şablonundan ${eklenecekler.length} satır eklendi${atlanan > 0 ? ` · ${atlanan} zaten vardı` : ""}`);
              }}
              style={{ padding: "5px 12px", fontSize: 12 }}>
              {(product.recete || []).length === 0 ? "Şablondan reçete oluştur" : "Şablondan reçeteye ekle"}
            </button>
            {(product.recete || []).length > 0 && onReceteSablonuKaydet && (
              <button type="button" className="btn-ghost" data-recete-sablon-kaydet="1"
                onClick={() => {
                  const ad = window.prompt("Şablon adı (örn. Standart bot malzemeleri):", "");
                  if (!ad || !ad.trim()) return;
                  const { satirlar, atlanan } = recetedenSablonSatirlari(product.recete);
                  if (satirlar.length === 0) { (showToast || (() => {}))("Bedenden bağımsız satır yok — şablon oluşmadı"); return; }
                  onReceteSablonuKaydet({ id: uid("rsab"), ad: ad.trim(), satirlar });
                  (showToast || (() => {}))(`"${ad.trim()}" şablonu ${satirlar.length} malzemeyle kaydedildi${atlanan > 0 ? ` · bedene göre değişen ${atlanan} malzeme girmedi` : ""}. Tanımlar › Üretim'den düzenlenir.`);
                }}
                style={{ padding: "5px 12px", fontSize: 12 }}>
                Bu reçeteden şablon oluştur
              </button>
            )}
          </div>
          {/* KAPSAM UYARISI — üretimde sessiz eksik tüketimin önüne geçer.
              Bir hammaddenin yalnızca bazı bedenleri tanımlıysa, üretim sırasında kalan bedenler
              için hiç stok düşülmez ve fark ancak sayımda ortaya çıkar. */}
          {/* ---- REÇETE GERÇEKLEŞMESİ ----------------------------------------------------------
              Kullanıcı (6 Eylül): "Hammadde birim adedi reçeteye NOT olarak yansısın — deri 30
              desi planlandı ama 31 desiden çıkıyor gibi."

              Reçete bir TAHMİN; burada onun yanına ÖLÇÜM konuyor. Rakamlar her zaman gösteriliyor
              (bilgi saklanmıyor) ama "reçeteni değiştir" önerisi yalnız yeterli ölçüm VE anlamlı
              fark birlikteyken çıkıyor — tek üretimde deri kötü çıkmış olabilir. */}
          {/* "Üretimden ölçülen tüketim" MALİYET SEKMESİNE TAŞINDI (21 Eylül). */}

          {(() => {
            const eksikRaporu = renkler
              .map((mr) => ({ renk: mr, eksikler: receteKapsamEksikleri(product, mr, bedenler) }))
              .filter((x) => x.eksikler.length > 0);
            // Renk kapsamı: bir hammadde bazı model renkleri için HİÇ tanımlanmamış olabilir.
            // Beden eksikliğinden farklı bir durum, bu yüzden ayrı hesaplanıp ayrı gösterilir.
            const renkEksikleri = receteRenkKapsamEksikleri(product, tumUrunler);
            if (eksikRaporu.length === 0 && renkEksikleri.length === 0) return null;
            return (
              <div style={{ background: "var(--erp-orange-bg)", border: "1.5px solid #E1611F", borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <AlertTriangle size={15} color="var(--erp-warn)" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-warn)" }}>
                    Reçete bazı bedenleri kapsamıyor — üretimde o bedenler için hammadde düşülmez
                  </span>
                </div>
                <div style={{ display: "grid", gap: 4 }}>
                  {eksikRaporu.map((x) => (
                    <div key={x.renk} style={{ fontSize: 13, color: "#7A3B22", lineHeight: 1.6 }}>
                      <b className="mono">{x.renk}</b>
                      {x.eksikler.map((e, i) => (
                        <span key={i}>
                          {" · "}{e.hammaddeAd}
                          {e.proses ? ` (${e.proses})` : ""}
                          {": "}
                          <b>{e.eksikBedenler.join(", ")}</b> eksik
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
                {renkEksikleri.length > 0 && (
                  <div style={{ display: "grid", gap: 4, marginTop: 8, paddingTop: 8, borderTop: "1px dashed #E0B4A4" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-warn)" }}>
                      Bazı hammaddeler şu model renkleri için hiç tanımlanmamış:
                    </span>
                    {renkEksikleri.map((e, i) => (
                      <div key={i} style={{ fontSize: 13, color: "#7A3B22", lineHeight: 1.6 }}>
                        <b>{e.hammaddeAd}</b>{e.proses ? ` (${e.proses})` : ""} — <b>{e.eksikRenkler.join(", ")}</b>
                      </div>
                    ))}
                    <span style={{ fontSize: 12, color: "var(--erp-text-3)" }}>
                      Bu renkler reçete matrisinde <b>eksik</b> etiketiyle görünür; oradaki kesik çizgili
                      kutudan hammadde rengini seçerek doğrudan eşleştirebilirsiniz.
                    </span>
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--erp-text-3)", marginTop: 6, lineHeight: 1.6 }}>
                  Eksik bedenleri kapsamak için o hammaddeyi yeniden ekleyin; beden eşleştirme satırında
                  <b> Hepsi →</b> ile tüm bedenlere aynı hammadde ölçüsünü atayabilirsiniz.
                </div>
              </div>
            );
          })()}

          {hammaddeUrunler.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--erp-text-3)" }}>
              Reçeteye eklenebilecek Hammadde/Yarı Mamul ürünü yok — önce Stok'a ekleyin.
            </div>
          ) : (
            <div style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)", marginBottom: 10 }}>Yeni Reçete Satırı Ekle</div>
              {/* Tek satırda toplanan giriş alanları. Miktar ve toplu beden ataması eskiden AŞAĞIDA,
                  ayrı bir kutuda duruyordu; hammadde seçtikten sonra göz aşağı inip yukarı dönüyordu.
                  En sık girilen üç alan (hammadde, miktar, ortak beden) artık yan yana. */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                {/* PROSES ÖNCE: reçete satırı önce hangi işe ait olduğuyla belirlenir. Ayrıca
                    hammadde arama kutusu seçili prosese ait hammaddeleri listenin başına aldığı için
                    (oncelikliProses), prosesin önceden seçilmiş olması aramayı da kısaltır. */}
                <div style={{ flex: "1 1 150px", minWidth: 140 }}>
                <Field label="Proses">
                  {(tanimlarProsesler || []).length > 0 || (tanimlarAraProsesler || []).length > 0 ? (
                    <select value={seciliProses} onChange={(e) => setSeciliProses(e.target.value)} style={inputStyle}>
                      <option value="">Belirtilmedi</option>
                      {[...tanimlarProsesler].sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0)).map((p) => <option key={p.id} value={p.ad}>{p.ad}</option>)}
                      {(tanimlarAraProsesler || []).length > 0 && (
                        <optgroup label="Ara Prosesler">
                          {tanimlarAraProsesler.map((ap) => <option key={ap.id} value={ap.ad}>{ap.ad} (ara proses)</option>)}
                        </optgroup>
                      )}
                    </select>
                  ) : (
                    <div style={{ fontSize: 13, color: "var(--erp-text-3)", padding: "8px 0" }}>
                      Proses tanımlanmadı (Tanımlar ekranından ekleyebilirsiniz)
                    </div>
                  )}
                </Field>
                </div>

                <div style={{ flex: "1 1 190px", minWidth: 170 }}>
                <Field label="Hammadde">
                  <AramaliUrunSecici
                    urunler={hammaddeUrunler}
                    seciliId={rHammaddeId}
                    onSec={hammaddeSec}
                    placeholder="Hammadde ara…"
                    oncelikliProses={seciliProses}
                    ozelKodAlanlari={tanimlarOzelKodAlanlari}
                    onHizliUrunEkle={onHizliHammaddeEkle}
                  />
                </Field>
                </div>

                {/* MİKTAR — hammaddeyle aynı satırda. Her ekleme için mutlaka girilmesi gereken alan
                    olduğu halde aşağıdaki beden kutusunun sağ ucunda, kolayca gözden kaçan bir yerdeydi. */}
                {seciliHammadde && (
                  <div style={{ flex: "0 0 auto" }}>
                    <Field label={`Miktar (${seciliHammadde.birim || "birim"})`}>
                      {/* step 0.0001: yapıştırıcı, boya, iplik gibi malzemeler çift başına
                          binde birler mertebesinde tüketiliyor. 0.01 adımı bunları sıfıra
                          yuvarlıyor ve reçete "0 adet yapıştırıcı" diyordu. */}
                      {/* type="number" DEĞİL: tarayıcı "1+4" gibi bir ifadeyi geçersiz sayıp
                          alanı boşaltıyor, kullanıcının yazdığı kayboluyordu. Hesap burada da
                          geçerli — mevcut satırların düzenleme hücresinde çalışıp yeni satır
                          formunda çalışmaması, aynı işi iki farklı yerde farklı yapmak olurdu. */}
                      <input
                        type="text" inputMode="decimal"
                        value={rMiktar}
                        onChange={(e) => setRMiktar(e.target.value)}
                        onKeyDown={(e) => {
                          // Miktar bu formun SON alanı: yazıp Enter'a basmak, fareyle aşağıdaki
                          // butona gitmekten hızlı. Enter'a tepki vermemesi, kullanıcının
                          // yazdığının kaydedilmediğini sanmasına yol açıyordu.
                          if (e.key !== "Enter") return;
                          e.preventDefault();
                          receteEkle();
                        }}
                        placeholder="0"
                        title="Hesap yazabilirsiniz: 1/8, 120/14, 2.5*3 · Enter ile ekleyin"
                        className="mono"
                        style={{
                          ...inputStyle, width: 100,
                          borderColor: rMiktar.trim() !== "" && ifadeHesapla(rMiktar) === null ? "var(--erp-orange)" : undefined,
                        }}
                      />
                      {/[+\-*/()]/.test(rMiktar.trim().slice(1)) && ifadeHesapla(rMiktar) !== null && (
                        <span className="mono" style={{ fontSize: 10, color: "var(--erp-primary)", fontWeight: 700 }}>
                          = {ifadeHesapla(rMiktar)}
                        </span>
                      )}
                      {rMiktar.trim() !== "" && ifadeHesapla(rMiktar) === null && (
                        <span className="mono" style={{ fontSize: 10, color: "var(--erp-warn)" }}>geçersiz</span>
                      )}
                    </Field>
                  </div>
                )}

                {/* TOPLU BEDEN — yine aynı satırda. Bedensiz hammaddede hiç gösterilmez. */}
                {seciliHammadde && !hammaddeBedensizMi() && (
                  <div style={{ flex: "0 0 auto" }}>
                    <Field label="Tüm bedenler için">
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <select
                          value={tumBedenlerBeden}
                          onChange={(e) => { setTumBedenlerBeden(e.target.value); setTopluBedenBilgi(""); }}
                          style={{ ...inputStyle, width: 92 }}
                        >
                          <option value="">Beden…</option>
                          {hammaddeBedenleriTumu().map((b) => <option key={b}>{b}</option>)}
                        </select>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={!tumBedenlerBeden}
                          style={{ padding: "7px 10px", fontSize: 13, background: tumBedenlerBeden ? "var(--erp-purple)" : undefined }}
                          onClick={() => {
                            const adet = tumBedenleriTekBedeneBagla(tumBedenlerBeden);
                            setTopluBedenBilgi(`${adet} bedene "${tumBedenlerBeden}"`);
                          }}
                        >
                          <Check size={12} /> Uygula
                        </button>
                        {topluBedenBilgi && (
                          <span className="mono" style={{ fontSize: 12, color: "var(--erp-primary)", fontWeight: 700, whiteSpace: "nowrap" }}>✓ {topluBedenBilgi}</span>
                        )}
                      </span>
                    </Field>
                  </div>
                )}

                {/* AÇIKLAMA artık serbest metin. Eskiden yalnızca "1. Renk … 6. Renk" seçilebiliyordu;
                    oysa bu alan reçete satırına not düşmek için de kullanılıyor ("dış astar", "iç taban"
                    gibi). Sabit liste, aynı hammaddenin farklı amaçlarla eklendiği durumları
                    adlandırmayı imkânsız kılıyordu. Pozisyon etiketi zaten "Pozisyon" seçicisinden
                    otomatik yazılıyor, burada tekrarlanmasına gerek yok. */}
                <div style={{ flex: "1 1 160px", minWidth: 150 }}>
                <Field label="Açıklama (opsiyonel)">
                  <input
                    value={rAciklama}
                    onChange={(e) => setRAciklama(e.target.value)}
                    placeholder="örn. dış astar, iç taban…"
                    style={inputStyle}
                    title="Bu reçete grubunu adlandırmak için serbest not. Boş bırakılabilir."
                  />
                </Field>
                </div>
              </div>

              {seciliHammadde && (
                <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                  {/* Açıklamalar kısaltıldı ve tam metinleri tooltip'e alındı: bu form zaten yoğun ve
                      her satır açıklaması ekranı gereksiz uzatıyordu. Bilgi kaybolmadı, sadece
                      isteyen görecek şekilde saklandı. */}
                  <div
                    style={{ fontSize: 13, color: "var(--erp-text-3)", lineHeight: 1.3 }}
                    title="Renk ve beden isimleri aynıysa eşleşmeler otomatik dolar. Farklıysa elle değiştirin; kullanmayacağınız satırları boş bırakın."
                  >
                    Aynı isimliler otomatik eşleşti — farklıysa değiştirin.
                  </div>

                  <div
                    style={{
                      border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 10, background: "#fff",
                      display: "flex", alignItems: "center", gap: 8, flexWrap: "nowrap", overflowX: "auto",
                    }}
                  >
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)", flexShrink: 0 }}>
                      {hammaddeBedensizMi() ? "Bedensiz —" : "Beden Eşleştirme"}
                    </span>

                    {/* Toplu beden ataması ve miktar artık en üstteki ana giriş satırında. */}

                    {!hammaddeBedensizMi() && bedenler.map((mb) => (
                      <div key={mb} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--erp-text-2)" }}>{mb}</span>
                        <ArrowRight size={13} color="var(--erp-text-3)" />
                        <select
                          value={rBedenEslesme[mb] || ""}
                          onChange={(e) => ortakBedenDegistir(mb, e.target.value)}
                          style={{ ...inputStyle, width: 68, padding: "5px 4px", fontSize: 12 }}
                        >
                          <option value="">—</option>
                          {hammaddeBedenleriTumu().map((b) => <option key={b}>{b}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>

                  {/* RENK KONTROLLERİ — pozisyon filtresi ve toplu renk atama TEK SATIRDA.
                      Beden satırıyla aynı düzen: solda "hepsine uygula" kontrolü, sağda ayrıntı.
                      Eskiden ikisi ayrı kutulardı ve form gereksiz uzuyordu; üstelik ikisi birlikte
                      anlam kazanıyor (pozisyon filtresi, toplu atamanın HANGİ pozisyona yazacağını
                      belirler) — ayrı durmaları bu bağı da gizliyordu. */}
                  {/* AMBALAJ SATIRI: DEĞİŞKEN Mİ, SABİT Mİ — satır bazında karar.
                      Eskiden karar tümüyle ürünün malzeme tipine bağlıydı; ambalaj tipinde
                      tanımlanan HER malzeme otomatik "rengi siparişten gelir" davranıyordu.
                      Oysa ambalaj tipinde birden çok malzeme var ve hepsi siparişe bağlı değil:
                      kutu müşteriye göre değişir, koruyucu poşet modelin sabit parçasıdır. */}
                  {!!seciliHammadde && (
                    <div style={{ display: "grid", gap: 8, border: "1px solid #C9A063", borderRadius: "var(--erp-r-md)", padding: "10px 12px", background: "var(--erp-hover)" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#7A3B22" }}>
                        <PackageCheck size={13} color="#8A6A2E" style={{ verticalAlign: "-2px", marginRight: 5 }} />
                        "{seciliHammadde.ad}" — bu satırda rengi kim belirlesin?
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {[
                          { deger: false, baslik: "Reçetede — sabit",
                            aciklama: "Normal malzeme. Rengi burada eşleştirilir, sipariş değiştirmez. Deri, astar, taban gibi." },
                          { deger: true, baslik: "Siparişte — değişken ambalaj",
                            aciklama: "Kutu, poşet gibi. Rengi sipariş girilirken seçilir ve üretimde otomatik uygulanır; aynı model farklı müşteriye farklı ambalajla gidebilir." },
                        ].map((o) => (
                          <button
                            key={String(o.deger)}
                            type="button"
                            onClick={() => setRAmbalajDegisken(o.deger)}
                            style={{
                              flex: "1 1 240px", textAlign: "left", cursor: "pointer",
                              border: rAmbalajDegisken === o.deger ? "1.5px solid #8A6A2E" : "1px solid var(--erp-line)",
                              background: rAmbalajDegisken === o.deger ? "#fff" : "transparent",
                              borderRadius: "var(--erp-r-md)", padding: "8px 10px",
                            }}
                          >
                            <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#7A3B22" }}>
                              {rAmbalajDegisken === o.deger ? "\u25CF " : "\u25CB "}{o.baslik}
                            </span>
                            <span style={{ display: "block", fontSize: 11, color: "var(--erp-text-2)", lineHeight: 1.6, marginTop: 2 }}>
                              {o.aciklama}
                            </span>
                          </button>
                        ))}
                      </div>
                      {/* SİPARİŞTE SEÇİLEBİLECEK RENKLER — yalnızca değişken satırda.
                          Sipariş ekranı eskiden stoktaki BÜTÜN ambalaj renklerini listeliyordu;
                          o modelde hiç kullanılmayan kutular da çıkıyor, yanlış seçime davetiye
                          oluyordu. Burada daraltılan liste, siparişteki açılır listeyi belirler.
                          Hiçbiri seçilmezse "hepsi" geçerlidir — sonradan eklenen bir renk de
                          otomatik listeye girsin diye "hepsi" durumu satıra YAZILMAZ. */}
                      {rAmbalajDegisken && ambalajRenkleriTumu().length > 0 && (
                        <div style={{ display: "grid", gap: 5 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#7A3B22" }}>
                            Siparişte seçilebilecek renkler
                            <span style={{ fontWeight: 400, color: "var(--erp-text-2)" }}>
                              {" "}— hiçbiri seçilmezse hepsi listelenir
                            </span>
                          </span>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {ambalajRenkleriTumu().map((r) => {
                              const secili = rAmbalajRenkler.includes(r);
                              return (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => setRAmbalajRenkler((onceki) =>
                                    onceki.includes(r) ? onceki.filter((x) => x !== r) : [...onceki, r])}
                                  style={{
                                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                                    padding: "3px 10px", borderRadius: "var(--erp-r-pill)",
                                    border: secili ? "1.5px solid #8A6A2E" : "1px solid var(--erp-line)",
                                    background: secili ? "#8A6A2E" : "#fff",
                                    color: secili ? "#fff" : "var(--erp-text-2)",
                                  }}
                                >
                                  {secili ? "\u2713 " : ""}{r}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {ambalajUrunuMu(seciliHammadde) && (
                        <span style={{ fontSize: 11, color: "var(--erp-text-2)" }}>
                          Malzeme Tipi "Ambalaj" olduğu için varsayılan "değişken" geldi — istersen değiştir.
                        </span>
                      )}
                    </div>
                  )}

                  {(() => {
                    // AMBALAJDA RENK EŞLEŞTİRME YOK.
                    //
                    // Kutu, poşet gibi ambalaj malzemelerinin rengi reçetede değil, SİPARİŞTE
                    // seçiliyor: aynı model farklı müşteriye farklı kutuyla gidebilir. Üretim
                    // sırasında ambalajRengiUygula() reçetedeki rengi siparişteki tercihle
                    // değiştiriyor — yani burada seçilen renk zaten kullanılmıyor.
                    //
                    // Kullanıcıdan hiç kullanılmayacak bir eşleştirme istemek, hem zaman kaybı
                    // hem de "eşleşmedi" uyarılarıyla gereksiz endişe üretiyordu.
                    // AMBALAJ SATIRI DEĞİŞKENSE renk eşleştirme yok: renk siparişte seçiliyor ve
                    // ambalajRengiUygula() üretimde reçetedeki rengin üzerine yazıyor. Seçim kutusu
                    // (yukarıda) "sabit" derse buraya düşülür ve satır sıradan bir malzeme gibi
                    // renk eşleştirmesi ister.
                    if (rAmbalajDegisken) return null;
                    const maxPozisyon = Math.max(1, ...renkler.map((mr) => pozisyonSayisi(mr)));
                    const pozisyonVar = maxPozisyon >= 2;
                    if (!pozisyonVar && renkler.length === 0) return null;
                    return (
                      <div
                        style={{
                          border: "1px solid #C9B3D9", borderRadius: "var(--erp-r-md)", padding: "8px 10px", background: "#F4EFF7",
                          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                        }}
                      >
                        {pozisyonVar && (
                          <>
                            <span style={{ fontSize: 12, color: "var(--erp-text-2)", fontWeight: 700, whiteSpace: "nowrap" }}>Pozisyon:</span>
                            <select
                              value={rPozisyonFiltre}
                              onChange={(e) => setRPozisyonFiltre(e.target.value === "Tümü" ? "Tümü" : parseInt(e.target.value, 10))}
                              title="Belirli bir pozisyon seçtiğinizde yalnızca o pozisyon için hammadde eşleştirip eklersiniz; diğer pozisyonları ayrı bir işlemle ekleyebilirsiniz."
                              style={{ ...inputStyle, width: 132, padding: "5px 6px", fontSize: 12 }}
                            >
                              <option value="Tümü">Tümü (hepsini eşle)</option>
                              {Array.from({ length: maxPozisyon }, (_, i) => i + 1).map((p) => (
                                <option key={p} value={p}>{p}. Renk</option>
                              ))}
                            </select>
                            <span style={{ width: 1, height: 20, background: "#C9B3D9", flexShrink: 0 }} />
                          </>
                        )}

                        {renkler.length > 0 && (
                          <>
                            <span style={{ fontSize: 13, color: "var(--erp-purple)", fontWeight: 700, whiteSpace: "nowrap" }}>Hepsi →</span>
                            <select
                              value={tumModellerRenk}
                              onChange={(e) => { setTumModellerRenk(e.target.value); setTopluUygulamaBilgi(""); }}
                              style={{ ...inputStyle, width: 132, padding: "5px 6px", fontSize: 12 }}
                            >
                              <option value="">Renk…</option>
                              {Array.from(new Set(seciliHammadde.variants.map((v) => v.renk))).map((r) => <option key={r}>{r}</option>)}
                            </select>
                            {/* Uygulama select'in onChange'ine BAĞLI DEĞİL, ayrı bir eylem: aynı rengi
                                tekrar uygulamak (satırları elle değiştirdikten sonra) mümkün olsun ve
                                sadece listeye bakmak için açmak eşleşmeleri ezmesin diye. */}
                            <button
                              type="button"
                              className="btn-primary"
                              disabled={!tumModellerRenk}
                              style={{ padding: "5px 10px", fontSize: 13, background: tumModellerRenk ? "var(--erp-purple)" : undefined }}
                              onClick={() => {
                                const adet = tumModelleriTekRengeBagla(tumModellerRenk);
                                setTopluUygulamaBilgi(
                                  adet > 0
                                    ? `${adet} modele "${tumModellerRenk}"`
                                    : "uygulanacak model yok"
                                );
                              }}
                            >
                              <Check size={12} /> Uygula
                            </button>
                            {topluUygulamaBilgi && (
                              <span className="mono" style={{ fontSize: 12, color: "var(--erp-primary)", fontWeight: 700, whiteSpace: "nowrap" }}>
                                ✓ {topluUygulamaBilgi}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* DEĞİŞKEN ambalajda mamul renk satırları gizlenir — hepsi "eşleşmedi" uyarısı
                      gösterir ve hiçbiri kullanılmaz. SABİT seçildiyse gösterilir: o satırın rengi
                      reçetede belirlenir. */}
                  {!rAmbalajDegisken && renkler.map((mr) => {
                    const n = pozisyonSayisi(mr);
                    const cokluPozisyon = n > 1;
                    const gosterilecekPozisyonlar = (cokluPozisyon && rPozisyonFiltre !== "Tümü")
                      ? [rPozisyonFiltre].filter((p) => p <= n)
                      : Array.from({ length: n }, (_, i) => i + 1);
                    return (
                      <div
                        key={mr}
                        style={{
                          border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 10, background: "#fff",
                          display: "flex", flexDirection: cokluPozisyon ? "column" : "row", alignItems: cokluPozisyon ? "stretch" : "center",
                          gap: 8, flexWrap: cokluPozisyon ? "nowrap" : "wrap", overflowX: cokluPozisyon ? "hidden" : "auto",
                        }}
                      >
                        <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text)", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
                          Mamul: {mr}
                          {/* Kombinasyon renkleri (ör. "1010 - Bej/Beyaz/Siyah") tek bir renk değil, birkaç
                              rengin adlandırılmış bileşimidir — bu yüzden satırı da farklı görünür: tek bir
                              seçim kutusu yerine pozisyon mantığı devreye girer. Rozet olmadan kullanıcı
                              "neden bu satır ötekilere benzemiyor?" diye haklı olarak takılıyordu. */}
                          {cokluPozisyon && (
                            <span
                              title={`Bu bir Model Rengi kombinasyonu: ${n} ayrı renk pozisyonu var. "Renk Pozisyonu: Tümü" seçiliyken hepsine tek hammadde rengi atanır ve reçeteye TEK satır olarak eklenir. Belirli bir pozisyon seçerseniz her pozisyonu ayrı ayrı eşleştirebilirsiniz.`}
                              style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: "var(--erp-r-pill)", background: "#6B4E8A18", color: "var(--erp-purple)", whiteSpace: "nowrap" }}
                            >
                              kombinasyon · {n} renk
                            </span>
                          )}
                        </span>
                        {cokluPozisyon ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", minWidth: 0 }}>
                            {rPozisyonFiltre === "Tümü" && (
                              // Hızlı doldurma: TEK bir hammadde rengi seçilip TÜM pozisyonlara aynı anda
                              // uygulanabilir — ama aşağıdaki pozisyon bazlı liste HER ZAMAN görünür kalır,
                              // böylece hangi pozisyonların otomatik eşleştiğini her durumda görebilirsiniz.
                              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--erp-panel)", borderRadius: "var(--erp-r-md)", padding: "6px 8px", overflowX: "auto" }}>
                                <span className="mono" style={{ fontSize: 13, color: "var(--erp-text-2)" }}>
                                  Tümüne ({n} renk) aynı hammadde rengi:
                                </span>
                                <ArrowRight size={12} color="var(--erp-text-3)" style={{ flexShrink: 0 }} />
                                <select
                                  value={(rMap[mr] || {})[1] || ""}
                                  onChange={(e) => {
                                    const yeni = {};
                                    for (let p = 1; p <= n; p++) yeni[p] = e.target.value;
                                    setRMap({ ...rMap, [mr]: yeni });
                                  }}
                                  style={{ ...inputStyle, width: 150, flexShrink: 0 }}
                                >
                                  <option value="">Renk seçin…</option>
                                  {Array.from(new Set(seciliHammadde.variants.map((v) => v.renk))).map((r) => <option key={r}>{r}</option>)}
                                </select>
                                {(rMap[mr] || {})[1] && (
                                  <span title="Bu hammadde rengi tüm pozisyonlara uygulandı" style={{ fontSize: 12, color: "var(--erp-primary)", flexShrink: 0 }}>✓ atandı</span>
                                )}
                                {yeniHammaddeRenkGiris === "tumu" ? (
                                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <input
                                      autoFocus
                                      value={yeniHammaddeRenkAdi}
                                      onChange={(e) => setYeniHammaddeRenkAdi(e.target.value)}
                                      placeholder="Yeni renk"
                                      style={{ ...inputStyle, width: 100, padding: "5px 8px", fontSize: 12 }}
                                    />
                                    <button
                                      type="button"
                                      className="btn-primary"
                                      style={{ padding: "5px 8px" }}
                                      onClick={() => {
                                        const ad = hammaddeyeYeniRenkEkle(yeniHammaddeRenkAdi);
                                        if (ad) {
                                          const yeni = {};
                                          for (let p = 1; p <= n; p++) yeni[p] = ad;
                                          setRMap({ ...rMap, [mr]: yeni });
                                        }
                                        setYeniHammaddeRenkAdi(""); setYeniHammaddeRenkGiris(null);
                                      }}
                                    >
                                      <Check size={13} />
                                    </button>
                                    <button type="button" className="btn-ghost" style={{ padding: "5px 6px" }} onClick={() => { setYeniHammaddeRenkGiris(null); setYeniHammaddeRenkAdi(""); }}>
                                      <X size={13} />
                                    </button>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn-ghost"
                                    style={{ padding: "4px 8px", fontSize: 13, color: "var(--erp-purple)" }}
                                    onClick={() => { setYeniHammaddeRenkGiris("tumu"); setYeniHammaddeRenkAdi(""); }}
                                  >
                                    <Plus size={13} /> Yeni Renk
                                  </button>
                                )}
                              </div>
                            )}
                            {rPozisyonFiltre !== "Tümü" && gosterilecekPozisyonlar.map((p) => {
                              const pozisyonRengi = kombinasyonRengiCoz(mr, p);
                              const otomatikBulundu = !!(rMap[mr] || {})[p];
                              return (
                                <div
                                  key={p}
                                  style={{
                                    display: "flex", alignItems: "center", gap: 8, padding: otomatikBulundu ? 0 : "4px 6px",
                                    borderRadius: "var(--erp-r-md)", background: otomatikBulundu ? "transparent" : "#3A2E2222",
                                    overflowX: "auto",
                                  }}
                                >
                                  <span
                                    className="mono"
                                    style={{ fontSize: 13, width: 130, flexShrink: 0, color: otomatikBulundu ? "var(--erp-text-2)" : "var(--erp-text)", fontWeight: otomatikBulundu ? 400 : 700 }}
                                  >
                                    {p}. Renk{pozisyonRengi ? ` (${pozisyonRengi})` : ""}
                                  </span>
                                  <ArrowRight size={12} color={otomatikBulundu ? "var(--erp-text-3)" : "var(--erp-text)"} style={{ flexShrink: 0 }} />
                                  <select
                                    value={(rMap[mr] || {})[p] || ""}
                                    onChange={(e) => renkEslesmesiDegistir(mr, p, e.target.value)}
                                    style={{
                                      ...inputStyle, width: 150, flexShrink: 0,
                                      borderColor: otomatikBulundu ? "var(--erp-primary)" : "var(--erp-text)",
                                      borderWidth: otomatikBulundu ? 1 : 2,
                                      fontWeight: otomatikBulundu ? 400 : 700,
                                    }}
                                  >
                                    <option value="">Renk seçin…</option>
                                    {Array.from(new Set(seciliHammadde.variants.map((v) => v.renk))).map((r) => <option key={r}>{r}</option>)}
                                  </select>
                                  {otomatikBulundu ? (
                                    <span title="İsim eşleşmesiyle otomatik bulundu" style={{ fontSize: 12, color: "var(--erp-primary)" }}>✓ otomatik</span>
                                  ) : (
                                    <span title="Otomatik eşleşme bulunamadı — elle seçim gerekiyor" style={{ fontSize: 12, color: "var(--erp-text)", fontWeight: 700 }}>
                                      ⚠ eşleşmedi
                                    </span>
                                  )}
                                  {yeniHammaddeRenkGiris === String(p) ? (
                                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                      <input
                                        autoFocus
                                        value={yeniHammaddeRenkAdi}
                                        onChange={(e) => setYeniHammaddeRenkAdi(e.target.value)}
                                        placeholder="Yeni renk"
                                        style={{ ...inputStyle, width: 100, padding: "5px 8px", fontSize: 12 }}
                                      />
                                      <button
                                        type="button"
                                        className="btn-primary"
                                        style={{ padding: "5px 8px" }}
                                        onClick={() => {
                                          const ad = hammaddeyeYeniRenkEkle(yeniHammaddeRenkAdi);
                                          if (ad) renkEslesmesiDegistir(mr, p, ad);
                                          setYeniHammaddeRenkAdi(""); setYeniHammaddeRenkGiris(null);
                                        }}
                                      >
                                        <Check size={13} />
                                      </button>
                                      <button type="button" className="btn-ghost" style={{ padding: "5px 6px" }} onClick={() => { setYeniHammaddeRenkGiris(null); setYeniHammaddeRenkAdi(""); }}>
                                        <X size={13} />
                                      </button>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn-ghost"
                                      style={{ padding: "4px 8px", fontSize: 13, color: "var(--erp-purple)" }}
                                      onClick={() => { setYeniHammaddeRenkGiris(String(p)); setYeniHammaddeRenkAdi(""); }}
                                    >
                                      <Plus size={13} /> Yeni Renk
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (() => {
                          const otomatikBulundu = !!(rMap[mr] || {})[1];
                          return (
                          <>
                            <ArrowRight size={13} color={otomatikBulundu ? "var(--erp-text-3)" : "var(--erp-text)"} style={{ flexShrink: 0 }} />
                            <select
                              value={(rMap[mr] || {})[1] || ""}
                              onChange={(e) => renkEslesmesiDegistir(mr, 1, e.target.value)}
                              style={{
                                ...inputStyle, width: 150, flexShrink: 0,
                                borderColor: otomatikBulundu ? "var(--erp-primary)" : "var(--erp-text)",
                                borderWidth: otomatikBulundu ? 1 : 2,
                                fontWeight: otomatikBulundu ? 400 : 700,
                              }}
                            >
                              <option value="">Renk seçin…</option>
                              {Array.from(new Set(seciliHammadde.variants.map((v) => v.renk))).map((r) => <option key={r}>{r}</option>)}
                            </select>
                            {otomatikBulundu ? (
                              <span title="İsim eşleşmesiyle otomatik bulundu" style={{ fontSize: 12, color: "var(--erp-primary)" }}>✓ otomatik</span>
                            ) : (
                              <span title="Otomatik eşleşme bulunamadı — elle seçim gerekiyor" style={{ fontSize: 12, color: "var(--erp-text)", fontWeight: 700 }}>
                                ⚠ eşleşmedi
                              </span>
                            )}
                            {yeniHammaddeRenkGiris === "tekli" ? (
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <input
                                  autoFocus
                                  value={yeniHammaddeRenkAdi}
                                  onChange={(e) => setYeniHammaddeRenkAdi(e.target.value)}
                                  placeholder="Yeni renk"
                                  style={{ ...inputStyle, width: 100, padding: "5px 8px", fontSize: 12 }}
                                />
                                <button
                                  type="button"
                                  className="btn-primary"
                                  style={{ padding: "5px 8px" }}
                                  onClick={() => {
                                    const ad = hammaddeyeYeniRenkEkle(yeniHammaddeRenkAdi);
                                    if (ad) renkEslesmesiDegistir(mr, 1, ad);
                                    setYeniHammaddeRenkAdi(""); setYeniHammaddeRenkGiris(null);
                                  }}
                                >
                                  <Check size={13} />
                                </button>
                                <button type="button" className="btn-ghost" style={{ padding: "5px 6px" }} onClick={() => { setYeniHammaddeRenkGiris(null); setYeniHammaddeRenkAdi(""); }}>
                                  <X size={13} />
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{ padding: "4px 8px", fontSize: 13, color: "var(--erp-purple)" }}
                                onClick={() => { setYeniHammaddeRenkGiris("tekli"); setYeniHammaddeRenkAdi(""); }}
                              >
                                <Plus size={13} /> Yeni Renk
                              </button>
                            )}
                          </>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <button className="btn-primary" onClick={receteEkle}>
                  <Plus size={14} /> Reçeteye Ekle
                </button>
              </div>
            </div>
          )}

          {(product.recete || []).length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <button
                className="btn-ghost"
                onClick={() => onPencereAc("recete", product.id, `Reçete: ${product.ad}`, { product, tumUrunler, tanimlarProsesler, tanimlarAraProsesler, firmaBilgileri })}
              >
                <Printer size={13} /> Reçete Yazdır (PDF)
              </button>
            </div>
          )}
          {/* MALİYET BLOĞU KENDİ SEKMESİNE TAŞINDI (kullanıcı, 21 Eylül: "bu listeyi maliyet
              sekmesi olarak aç, buradan satış fiyatı oluşturalım"). */}
          {(product.recete || []).length > 0 && (
            <button type="button" className="btn-ghost" data-maliyete-git="1" onClick={() => setCardTab("maliyet")}
              style={{ fontSize: 12, padding: "5px 12px", marginBottom: 10 }}>
              Maliyet ve satış fiyatı → Maliyet sekmesi
            </button>
          )}
          {(product.recete || []).length > 0 && (
            <>
              <div style={{ display: "grid", gap: 14, marginBottom: 12 }}>
              {(() => {
                const pgListesi = receteProsesGrupla(product.recete, tanimlarProsesler, product.receteProsesSirasiOverride);
                return pgListesi.map((pg, pgIndex) => (
                <div
                  key={pg.proses}
                  style={{
                    minWidth: 0,
                    // Prosesin kendi rengiyle çerçeve + aynı renkte şeffaf zemin. Sol kenar kalın:
                    // uzun listede dikey tarama yaparken grubun nerede başlayıp bittiğini çerçevenin
                    // tamamını görmeden ayırt etmeyi sağlar.
                    border: `1px solid ${alfaEkle(prosesRengi(pg.proses, pg.sira), "55")}`,
                    borderLeft: `4px solid ${prosesRengi(pg.proses, pg.sira)}`,
                    background: prosesZemini(pg.proses, pg.sira),
                    borderRadius: "var(--erp-r-md)",
                    padding: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    {pg.proses !== "Belirtilmemiş" && (() => {
                      // Tanımlar'daki genel proses sırası çoğu ürün için doğru, ama bazı istisnai
                      // ürünlerde farklı olması gerekebilir. Bu oklar, o ürüne ÖZEL bir sıra farkı
                      // (receteProsesSirasiOverride) kaydeder — Tanımlar'daki genel sıra DEĞİŞMEZ,
                      // sadece bu ürünün reçetesinde iki komşu prosesin sırası takas edilir.
                      const oncekiPg = pgListesi[pgIndex - 1];
                      const sonrakiPg = pgListesi[pgIndex + 1];
                      function siraTakasEt(digerPg) {
                        if (!digerPg || digerPg.proses === "Belirtilmemiş") return;
                        const yeniOverride = { ...(product.receteProsesSirasiOverride || {}) };
                        yeniOverride[pg.proses] = digerPg.sira;
                        yeniOverride[digerPg.proses] = pg.sira;
                        onUrunGuncelle(product.id, { receteProsesSirasiOverride: yeniOverride });
                      }
                      return (
                        <span style={{ display: "flex", flexDirection: "column" }}>
                          <button
                            type="button"
                            onClick={() => siraTakasEt(oncekiPg)}
                            disabled={!oncekiPg || oncekiPg.proses === "Belirtilmemiş"}
                            title="Bu ürüne özel olarak yukarı taşı (genel sıralamayı etkilemez)"
                            style={{
                              border: "none", background: "none", padding: 0, lineHeight: 0.7,
                              cursor: oncekiPg ? "pointer" : "default", color: oncekiPg ? "var(--erp-purple)" : "var(--erp-border-2)",
                            }}
                          >
                            <ChevronUp size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => siraTakasEt(sonrakiPg)}
                            disabled={!sonrakiPg || sonrakiPg.proses === "Belirtilmemiş"}
                            title="Bu ürüne özel olarak aşağı taşı (genel sıralamayı etkilemez)"
                            style={{
                              border: "none", background: "none", padding: 0, lineHeight: 0.7,
                              cursor: sonrakiPg ? "pointer" : "default", color: sonrakiPg ? "var(--erp-purple)" : "var(--erp-border-2)",
                            }}
                          >
                            <ChevronDown size={13} />
                          </button>
                        </span>
                      );
                    })()}
                    <div
                      className="mono"
                      style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 13, fontWeight: 700, color: pg.ozelSiraMi ? "var(--erp-warn)" : "var(--erp-purple)", textTransform: "uppercase", letterSpacing: ".04em" }}
                      title={pg.ozelSiraMi ? "Bu ürüne özel sıralama — Tanımlar'daki genel sıradan farklı" : undefined}
                    >
                      {pg.sira != null ? (
                        <>
                          <input
                            type="number"
                            min="1"
                            defaultValue={pg.sira + 1}
                            title="Bu prosesin sıra numarasını doğrudan yazın — örn. sıralamada boşluk (1,2,3,6 gibi) varsa, 6'yı 4 yaparak boşluğu kapatabilirsiniz. Sadece bu ürüne özeldir, Tanımlar'daki genel sırayı değiştirmez."
                            onBlur={(e) => {
                              const yeniNo = parseInt(e.target.value, 10);
                              if (!yeniNo || yeniNo < 1 || yeniNo - 1 === pg.sira) return;
                              onUrunGuncelle(product.id, {
                                receteProsesSirasiOverride: { ...(product.receteProsesSirasiOverride || {}), [pg.proses]: yeniNo - 1 },
                              });
                            }}
                            className="mono"
                            style={{
                              width: 32, padding: "1px 2px", fontSize: 13, fontWeight: 700, textAlign: "center",
                              border: `1px solid ${pg.ozelSiraMi ? "var(--erp-warn)" : "var(--erp-border)"}`, borderRadius: "var(--erp-r-sm)",
                              color: "inherit", background: "#fff",
                            }}
                          />
                          .
                        </>
                      ) : ""}
                      {pg.proses}{pg.ozelSiraMi ? " ★" : ""}
                    </div>
                    {pg.proses !== "Belirtilmemiş" && (
                      <label style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                        <span style={{ fontSize: 13, color: "var(--erp-text-2)" }}>İşçilik (₺/adet):</span>
                        <input
                          type="number" step="any" min="0"
                          defaultValue={(product.prosesUcretleri || {})[pg.proses] || ""}
                          onBlur={(e) => onProsesUcretGuncelle(product.id, pg.proses, parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="mono"
                          style={{ width: 64, padding: "3px 5px", fontSize: 13, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)" }}
                        />
                      </label>
                    )}
                    {pg.proses !== "Belirtilmemiş" && (tanimlarAraProsesler || []).length > 0 && (
                      <label style={{ display: "flex", alignItems: "center", gap: 4 }} title="Bu prosesten sonra, ardından gelen asıl proses işe verildiğinde otomatik tamamlanacak küçük bir işçilik kalemi seçin. Ücreti Tanımlar'da o ara proses için sabit olarak belirlenir.">
                        <span style={{ fontSize: 13, color: "var(--erp-purple)" }}>Ara Proses:</span>
                        <select
                          value={(product.araProsesEklentileri || {})[pg.proses] || ""}
                          onChange={(e) => onUrunGuncelle(product.id, {
                            araProsesEklentileri: { ...(product.araProsesEklentileri || {}), [pg.proses]: e.target.value || undefined },
                          })}
                          style={{ ...inputStyle, width: 120, padding: "3px 5px", fontSize: 13 }}
                        >
                          <option value="">Yok</option>
                          {tanimlarAraProsesler.map((ap) => <option key={ap.id} value={ap.id}>{ap.ad}</option>)}
                        </select>
                        {(product.araProsesEklentileri || {})[pg.proses] && (() => {
                          const secili = tanimlarAraProsesler.find((ap) => ap.id === (product.araProsesEklentileri || {})[pg.proses]);
                          if (!secili) return null;
                          // Bu üründe özel bir ücret girilmişse onu, girilmemişse Tanımlar'daki genel ücreti gösterir.
                          // Burada değiştirmek SADECE bu ürüne özel bir geçersiz kılma (override) kaydeder —
                          // Tanımlar'daki genel/varsayılan ücreti ETKİLEMEZ.
                          const ozelUcret = (product.araProsesUcretleri || {})[secili.id];
                          return (
                            <span style={{ display: "flex", alignItems: "center", gap: 3 }} title="Bu ürüne özel ücret — boş bırakırsanız Tanımlar'daki genel ücret kullanılır">
                              <input
                                type="number" step="any" min="0"
                                defaultValue={ozelUcret ?? ""}
                                onBlur={(e) => onUrunGuncelle(product.id, {
                                  araProsesUcretleri: { ...(product.araProsesUcretleri || {}), [secili.id]: e.target.value === "" ? undefined : (parseFloat(e.target.value) || 0) },
                                })}
                                placeholder={String(secili.ucret || 0)}
                                className="mono"
                                style={{ width: 50, padding: "4px 7px", fontSize: 12, border: `1px solid ${ozelUcret != null ? "var(--erp-brown)" : "var(--erp-border)"}`, borderRadius: "var(--erp-r-sm)" }}
                              />
                              <span className="mono" style={{ fontSize: 12, color: "var(--erp-text-3)" }}>
                                ₺/adet {ozelUcret != null ? "— ürüne özel" : "— genel"}
                              </span>
                            </span>
                          );
                        })()}
                        {(product.araProsesEklentileri || {})[pg.proses] && (() => {
                          const secili = tanimlarAraProsesler.find((ap) => ap.id === (product.araProsesEklentileri || {})[pg.proses]);
                          if (!secili) return null;
                          const ozelCariId = (product.araProsesCariOverride || {})[secili.id];
                          const personelListesiKart = (cariler || []).filter((c) => c.tip === "Personel" || c.tip === "Her İkisi");
                          const varsayilanPersonel = (cariler || []).find((c) => c.id === secili.cariId);
                          return (
                            <label style={{ display: "flex", alignItems: "center", gap: 3 }} title="Bu ürüne özel cari (personel) — boş bırakırsanız Tanımlar'daki genel cari kullanılır">
                              <select
                                value={ozelCariId || ""}
                                onChange={(e) => onUrunGuncelle(product.id, {
                                  araProsesCariOverride: { ...(product.araProsesCariOverride || {}), [secili.id]: e.target.value || undefined },
                                })}
                                style={{
                                  ...inputStyle, width: 110, padding: "4px 7px", fontSize: 12,
                                  border: `1px solid ${ozelCariId ? "var(--erp-brown)" : "var(--erp-border)"}`,
                                }}
                              >
                                <option value="">{varsayilanPersonel ? `${varsayilanPersonel.unvan} (genel)` : "Genel cari"}</option>
                                {personelListesiKart.map((per) => <option key={per.id} value={per.id}>{per.unvan}</option>)}
                              </select>
                            </label>
                          );
                        })()}
                      </label>
                    )}
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {receteGrupla(pg.satirlar).map((g) => {
                      const hepsiBedensiz = g.satirlar.every((r) => r.mamulBeden === "Tüm Bedenler");
                      // Pozisyonu OLAN satırlar (bir Model Rengi kombinasyonunun "1. Renk", "2. Renk"...
                      // parçaları) ile pozisyonu OLMAYAN satırlar (tek renkli mamul, hiç pozisyon kavramı
                      // yok) AYRILIR — aksi halde tekli renkler matriste anlamsız bir "—" (boş pozisyon)
                      // satırına sıkışıp kombinasyonlarla karışıyordu. Matris SADECE gerçek pozisyonlu
                      // verilerden kurulur; tekli renkler altında ayrı, sade bir liste olarak gösterilir.
                      const pozisyonluSatirlar = g.satirlar.filter((r) => (r.aciklama || "") !== "");
                      const tekliSatirlar = g.satirlar.filter((r) => (r.aciklama || "") === "");
                      const mamulRenkSayisiPoz = new Set(pozisyonluSatirlar.map((r) => r.mamulRenk)).size;
                      const mamulRenkSayisiTekli = new Set(tekliSatirlar.map((r) => r.mamulRenk)).size;
                      // İki durumda matris kurulur: (a) pozisyonlu veri varsa, satırlar=pozisyon,
                      // sütunlar=mamul renk; (b) hiç pozisyon yoksa ama birden fazla mamul renk TEK bir
                      // hammadde rengiyle eşleştirilmişse (örn. "Astar" — hepsi Siyah'a bağlanmış), YİNE
                      // matris kurulur, sadece TEK (etiketsiz) satırla — mamul renkler yine sütun olarak
                      // yan yana görünür, kart kart alt alta dizilmez.
                      const pozisyonluMatris = hepsiBedensiz && mamulRenkSayisiPoz > 1 && pozisyonluSatirlar.length > 0;
                      const tekliMatris = hepsiBedensiz && pozisyonluSatirlar.length === 0 && mamulRenkSayisiTekli > 1;
                      const pozisyonXRenkMatrisi = pozisyonluMatris || tekliMatris;

                      if (pozisyonXRenkMatrisi) {
                        const kaynakSatirlar = pozisyonluMatris ? pozisyonluSatirlar : tekliSatirlar;
                        const mamulRenkler2 = Array.from(new Set(kaynakSatirlar.map((r) => r.mamulRenk)));
                        // Bu hammaddenin HİÇ tanımlanmadığı mamul renkleri. Sütun olarak
                        // gösterilmezlerse eksik olduğu anlaşılmaz ve sonradan doldurulamaz —
                        // aynı düzeltme bedenli matriste yapılmıştı, bu blok atlanmıştı.
                        const eksikMamulRenkler2 = renkler.filter((mr) => !mamulRenkler2.includes(mr));
                        const pozisyonlar2 = pozisyonluMatris
                          ? Array.from(new Set(pozisyonluSatirlar.map((r) => r.aciklama))).sort((a, b) => {
                              const na = parseInt(a, 10) || 999, nb = parseInt(b, 10) || 999;
                              return na - nb;
                            })
                          : [null]; // pozisyonsuz durumda tek, etiketsiz satır
                        // Bu gruptaki TÜM satırların miktarı aynıysa (örn. hepsi 44), her hücrede tekrar
                        // tekrar göstermek yerine TEK bir düzenlenebilir kutu üstteki özet satırında tutulur.
                        const tumMiktarlarBu = new Set(kaynakSatirlar.map((r) => r.miktar));
                        const hepsiAyniMiktarBu = kaynakSatirlar.length > 0 && tumMiktarlarBu.size === 1 && pozisyonlar2.length <= 1;
                        const ortakMiktarBu = hepsiAyniMiktarBu ? kaynakSatirlar[0].miktar : null;
                        const ortakBirimBu = kaynakSatirlar[0] ? kaynakSatirlar[0].birim : "";
                        // Hammadde rengini DEĞİŞTİREBİLMEK için bu hammaddenin renk seçenekleri.
                        // (Bedenli gruplarda zaten vardı; bedensiz grupta renk salt okunur metindi ve
                        // değiştirmek için satırı silip yeniden eklemek gerekiyordu.)
                        const bedensizHammadde = (tumUrunler || []).find((p) => p.id === g.hammaddeUrunId);
                        const bedensizRenkSecenekleri = bedensizHammadde
                          ? Array.from(new Set(bedensizHammadde.variants.map((v) => v.renk)))
                          : [];

                        // Bir hücrenin hammadde rengini değiştirir. Aynı satırın tüm kayıtları tek
                        // seferde güncellenir ki kısmi (yarısı eski, yarısı yeni) bir durum oluşmasın.
                        const bedensizRenkDegistir = (satir, yeniRenk) => {
                          if (!yeniRenk || yeniRenk === satir.renk) return;
                          const { id, ...rest } = satir;
                          onReceteGrubuGuncelle(product.id, [satir.id], [{ ...rest, renk: yeniRenk }]);
                        };
                        return (
                          <div key={g.key} style={{ border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 10, background: "var(--erp-panel)", minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                              <ColorSwatch
                                src={(() => {
                                  const hammadde = (tumUrunler || []).find((p) => p.id === g.hammaddeUrunId);
                                  if (!hammadde) return null;
                                  const ilkRenk = kaynakSatirlar[0] ? kaynakSatirlar[0].renk : null;
                                  return (hammadde.renkResimleri || {})[ilkRenk] || hammadde.kapakResmi;
                                })()}
                                editable={false}
                                size={22}
                              />
                              <button
                                type="button"
                                onClick={() => onGoToUrun && onGoToUrun(g.satirlar[0].hammaddeUrunId)}
                                title="Bu hammaddenin stok kartını aç"
                                style={{ border: "none", background: "none", padding: 0, cursor: "pointer", color: "var(--erp-text)", fontWeight: 700, textDecoration: "underline", textDecorationStyle: "dotted" }}
                              >
                                {g.hammaddeAd}
                              </button>
                              <span
                                className="mono"
                                title="Bu hammadde kaç mamul renk ve kaç bedene tanımlı"
                                style={{ fontWeight: 400, color: "var(--erp-text-3)", fontSize: 12 }}
                              >
                                {(() => {
                                  // "131 satır" gibi ham sayı hiçbir şey anlatmıyordu; kullanıcı için
                                  // anlamlı olan KAÇ RENGE ve KAÇ BEDENE tanımlı olduğudur.
                                  // Ürünün TÜM renklerini kapsamıyorsa bu da burada belirtilir —
                                  // eksiklik, tabloyu açıp sütunları saymadan görünmeli.
                                  const renkSayisi = new Set(g.satirlar.map((r) => r.mamulRenk)).size;
                                  const bedenlerKume = new Set(g.satirlar.map((r) => r.mamulBeden));
                                  const bedensiz = bedenlerKume.size === 1 && bedenlerKume.has("Tüm Bedenler");
                                  const toplamRenk = renkler.length;
                                  const eksikRenk = Math.max(0, toplamRenk - renkSayisi);
                                  const temel = bedensiz
                                    ? `${renkSayisi} renk · tüm bedenler`
                                    : `${renkSayisi} renk × ${bedenlerKume.size} beden`;
                                  return eksikRenk > 0 ? `${temel} · ${eksikRenk} renk eksik` : temel;
                                })()}
                              </span>
                              {/* PROSES SEÇİCİ — yalnızca gösterim değil, DEĞİŞTİRİLEBİLİR.
                                  Aynı hammadde birden çok kez eklenmiş olabilir (ör. Deri Nubuk hem yüz hem
                                  astar olarak); her ekleme ayrı gruptur ve hangi prosese ait olduğu kritiktir —
                                  üretim tüketimi bu bilgiye göre hangi aşamada hangi malzemenin düşeceğini
                                  belirler. Proses boşsa malzeme üretimde HİÇ düşülmez.
                                  Önceden yalnızca ATANMIŞ prosesler görünüyordu; atanmamış olanı düzeltmenin
                                  yolu yoktu, oysa asıl düzeltilmesi gereken oydu. */}
                              {(() => {
                                const mevcut = (g.satirlar[0] && g.satirlar[0].proses) || "";
                                const pRenk = mevcut ? prosesRengi(mevcut, pg.sira) : "var(--erp-warn)";
                                return (
                                  <select
                                    value={mevcut}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      // Grubun TÜM satırları aynı prosese taşınır — grup zaten tek bir
                                      // eklemeyi temsil ediyor, satırları ayrı proseslere bölmek anlamsız.
                                      const yeni = e.target.value;
                                      const guncel = g.satirlar.map(({ id, ...rest }) => ({ ...rest, proses: yeni }));
                                      onReceteGrubuGuncelle(product.id, g.satirlar.map((s) => s.id), guncel);
                                    }}
                                    title={mevcut ? `Bu reçete ${mevcut} prosesinde tüketilir` : "Proses atanmamış — üretimde bu malzeme HİÇ düşülmez"}
                                    className="mono"
                                    style={{
                                      fontSize: 11, fontWeight: 700, color: pRenk, background: alfaEkle(pRenk, "1A"),
                                      padding: "3px 8px", borderRadius: "var(--erp-r-pill)", whiteSpace: "nowrap",
                                      border: mevcut ? `1px solid ${alfaEkle(pRenk, "44")}` : `1px dashed ${pRenk}`,
                                      cursor: "pointer", maxWidth: 190,
                                    }}
                                  >
                                    <option value="">⚠ proses seçin</option>
                                    {(tanimlarProsesler || []).map((p2) => (
                                      <option key={p2.id} value={p2.ad}>{p2.ad}</option>
                                    ))}
                                    {(tanimlarAraProsesler || []).length > 0 && (
                                      <optgroup label="Ara prosesler">
                                        {(tanimlarAraProsesler || []).map((p2) => (
                                          <option key={p2.id} value={p2.ad}>{p2.ad}</option>
                                        ))}
                                      </optgroup>
                                    )}
                                  </select>
                                );
                              })()}
                              {g.eklemeTarihi && (
                                <span
                                  className="mono"
                                  title={`Bu grup ${new Date(g.eklemeTarihi).toLocaleString("tr-TR")} tarihinde tek bir "Reçeteye Ekle" işlemiyle oluşturuldu`}
                                  style={{ fontSize: 11, color: "var(--erp-text-3)", whiteSpace: "nowrap" }}
                                >
                                  {tarihYaz(g.eklemeTarihi)}
                                </span>
                              )}
                              {/* ONAYLI SİLME (kullanıcı, 11 Eylül: "reçetede silme onaylı olsun, tek tıklama ile
                                  siliniyor"). Bu düğme hammaddenin BÜTÜN satırlarını siliyor — tek dokunuşla gitmemeli. */}
                              <span style={{ marginLeft: "auto", display: "flex" }}>
                                <SilOnayButonu
                                  onConfirm={() => onReceteSilToplu(product.id, g.satirlar.map((r) => r.id))}
                                  boyut={13}
                                  baslikNormal={`${g.hammaddeAd} hammaddesine ait tüm satırları (${g.satirlar.length}) sil`}
                                  baslikOnay={`${g.satirlar.length} satır silinecek — emin misiniz? Tekrar dokunun`}
                                />
                              </span>
                            </div>
                            {hepsiAyniMiktarBu && (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--erp-text-3)", marginBottom: 6 }}>
                                <span>Tüm eşleşmelerde aynı miktar</span>
                                ·
                                <input
                                  type="text" inputMode="decimal"
                                  defaultValue={ortakMiktarBu}
                                  className="mono"
                                  style={{ width: 78, padding: "3px 6px", fontSize: 12, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)" }}
                                  title="Hesap yazabilirsiniz: 1/8, 120/14"
                                  onBlur={(e) => {
                                    // Reçetedeki her miktar alanı hesap kabul ediyor; toplu
                                    // düzenlemenin etmemesi tutarsızlık olurdu.
                                    const yeni = ifadeHesapla(e.target.value);
                                    if (!(yeni > 0) || yeni === ortakMiktarBu) { e.target.value = ortakMiktarBu; return; }
                                    e.target.value = yeni;
                                    const guncellenecekler = kaynakSatirlar.map((r) => {
                                      const { id, ...rest } = r;
                                      return { ...rest, miktar: yeni };
                                    });
                                    onReceteGrubuGuncelle(product.id, kaynakSatirlar.map((r) => r.id), guncellenecekler);
                                  }}
                                  className="mono"
                                  style={{ width: 78, padding: "3px 6px", fontSize: 12, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", fontWeight: 700, color: "var(--erp-text)" }}
                                />
                                <span className="mono" style={{ fontWeight: 700, color: "var(--erp-text)" }}>{ortakBirimBu}</span>
                              </div>
                            )}
                            <div style={{ overflowX: "auto", maxWidth: "100%" }}>
                              <table style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                  <tr>
                                    <th style={{ fontSize: 13, textAlign: "left", padding: "4px 8px" }}>Pozisyon</th>
                                    {mamulRenkler2.map((mr) => (
                                      <th key={mr} style={{ fontSize: 13, textAlign: "center", padding: "4px 8px", whiteSpace: "nowrap" }}>{mr}</th>
                                    ))}
                                    {eksikMamulRenkler2.map((mr) => (
                                      <th
                                        key={`eksik-${mr}`}
                                        title="Bu model rengi için eşleşme yapılmamış — üretimde bu renkten hammadde düşülmez"
                                        style={{ fontSize: 13, textAlign: "center", padding: "4px 8px", whiteSpace: "nowrap", color: "var(--erp-warn)" }}
                                      >
                                        {mr}
                                        <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-warn)", background: "#B85C2E18", padding: "1px 5px", borderRadius: "var(--erp-r-pill)", marginLeft: 4 }}>
                                          eksik
                                        </span>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {pozisyonlar2.map((poz) => {
                                    const satirlarBu = mamulRenkler2
                                      .map((mr) => kaynakSatirlar.find((x) => x.mamulRenk === mr && (poz === null || x.aciklama === poz)))
                                      .filter(Boolean);
                                    const satirIdleri = satirlarBu.map((x) => x.id);
                                    // Bu POZİSYON satırının kendi içinde (farklı mamul renkler arasında)
                                    // miktar sabitse (örn. "1. Renk" hep 22, "2. Renk" hep 33), o satır için
                                    // her hücrede tekrar tekrar göstermek yerine satır başında TEK kutu yeterli.
                                    const satirMiktarlari = new Set(satirlarBu.map((r) => r.miktar));
                                    const satirSabit = satirlarBu.length > 0 && satirMiktarlari.size === 1;
                                    const satirOrtakMiktar = satirSabit ? satirlarBu[0].miktar : null;
                                    const satirOrtakBirim = satirlarBu[0] ? satirlarBu[0].birim : "";
                                    return (
                                    <tr key={poz ?? "__tekli__"}>
                                      <td style={{ padding: "4px 8px" }}>
                                        {poz != null && (
                                          <span
                                            className="mono"
                                            style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-brown)", background: "var(--erp-panel-2)", padding: "3px 8px", borderRadius: "var(--erp-r-pill)", whiteSpace: "nowrap" }}
                                          >
                                            {poz}
                                          </span>
                                        )}
                                        {satirIdleri.length > 0 && (
                                          <span style={{ display: "inline-flex", marginLeft: poz != null ? 4 : 0, verticalAlign: "middle" }}>
                                            <SilOnayButonu
                                              onConfirm={() => onReceteSilToplu(product.id, satirIdleri)}
                                              boyut={13}
                                              baslikNormal="Bu satırdaki tüm eşleşmeleri sil"
                                              baslikOnay={`${satirIdleri.length} eşleşme silinecek — emin misiniz? Tekrar dokunun`}
                                            />
                                          </span>
                                        )}
                                        {/* ÇİFT MİKTAR KUTUSU (kullanıcı, 21 Eylül: "reçetede 2 tane adet girilen satır
                                            var, alttakini kaldırabiliriz başka yerde kullanılmıyorsa"). Tek pozisyon
                                            varken bu kutu üstteki "tüm eşleşmelerde aynı miktar" kutusuyla AYNI işi
                                            yapıyordu. Yalnız birden çok pozisyon varsa gösteriliyor — o zaman her
                                            pozisyonun kendi miktarı olabilir. */}
                                        {satirSabit && pozisyonlar2.length > 1 && (
                                          <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 3 }}>
                                            <input
                                              type="number" step="any" min="0"
                                              defaultValue={satirOrtakMiktar}
                                              onBlur={(e) => {
                                                const yeni = parseFloat(e.target.value);
                                                if (!(yeni > 0) || yeni === satirOrtakMiktar) return;
                                                const guncellenecekler = satirlarBu.map((r) => {
                                                  const { id, ...rest } = r;
                                                  return { ...rest, miktar: yeni };
                                                });
                                                onReceteGrubuGuncelle(product.id, satirlarBu.map((r) => r.id), guncellenecekler);
                                              }}
                                              className="mono"
                                              style={{ width: 78, padding: "3px 6px", fontSize: 12, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", fontWeight: 700, color: "var(--erp-text)" }}
                                            />
                                            <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{satirOrtakBirim}</span>
                                          </div>
                                        )}
                                      </td>
                                      {mamulRenkler2.map((mr) => {
                                        const r = kaynakSatirlar.find((x) => x.mamulRenk === mr && (poz === null || x.aciklama === poz));
                                        return (
                                          <td key={mr} style={{ padding: "4px 8px", textAlign: "center" }}>
                                            {r ? (
                                              satirSabit ? (
                                                // Miktar bu satırda zaten sabit ve satır başında tek kutuda
                                                // düzenleniyor. O yüzden hücrede DEĞİŞKEN olan şey renktir —
                                                // salt okunur metin yerine açılır liste. Eskiden rengi
                                                // değiştirmek için satırı silip yeniden eklemek gerekiyordu.
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                                  <select
                                                    value={r.renk}
                                                    onChange={(e) => bedensizRenkDegistir(r, e.target.value)}
                                                    className="mono"
                                                    title={poz != null ? aciklamaGoster(poz, mr) : "Hammadde rengini değiştir"}
                                                    style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text)", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", padding: "1px 2px", background: "#fff" }}
                                                  >
                                                    {bedensizRenkSecenekleri.length === 0 && <option value={r.renk}>{r.renk}</option>}
                                                    {bedensizRenkSecenekleri.map((rr) => <option key={rr} value={rr}>{rr}</option>)}
                                                  </select>
                                                </span>
                                              ) : (
                                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                                <select
                                                  value={r.renk}
                                                  onChange={(e) => bedensizRenkDegistir(r, e.target.value)}
                                                  className="mono"
                                                  title={poz != null ? aciklamaGoster(poz, mr) : "Hammadde rengini değiştir"}
                                                  style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text)", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", padding: "1px 2px", background: "#fff" }}
                                                >
                                                  {bedensizRenkSecenekleri.length === 0 && <option value={r.renk}>{r.renk}</option>}
                                                  {bedensizRenkSecenekleri.map((rr) => <option key={rr} value={rr}>{rr}</option>)}
                                                </select>
                                                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                                  <MiktarGirisi
                                                    deger={r.miktar}
                                                    genislik={50}
                                                    onKaydet={(yeni) => {
                                                      const { id, ...rest } = r;
                                                      onReceteGrubuGuncelle(product.id, [r.id], [{ ...rest, miktar: yeni }]);
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                              )
                                            ) : (
                                              <span style={{ fontSize: 13, color: "var(--erp-border)" }}>—</span>
                                            )}
                                          </td>
                                        );
                                      })}
                                      {/* Eksik mamul renkleri için doldurulabilir hücre. Hammadde rengi
                                          seçildiğinde bu POZİSYON satırının kaydı o renge kopyalanır;
                                          miktar ve açıklama mevcut bir sütundan alınır. */}
                                      {eksikMamulRenkler2.map((mr) => (
                                        <td key={`eksik-${mr}`} style={{ padding: "6px 8px", textAlign: "center" }}>
                                          {satirlarBu.length > 0 ? (
                                            <select
                                              value=""
                                              onChange={(e) => {
                                                const yeniRenk = e.target.value;
                                                if (!yeniRenk) return;
                                                const { id, ...rest } = satirlarBu[0];
                                                onReceteGrubuGuncelle(product.id, [], [{ ...rest, mamulRenk: mr, renk: yeniRenk }]);
                                              }}
                                              className="mono"
                                              title={`"${mr}" için hammadde rengi seçin — eşleşme oluşturulur`}
                                              style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-warn)", border: "1px dashed #B85C2E", borderRadius: "var(--erp-r-sm)", padding: "1px 2px", background: "var(--erp-orange-bg)" }}
                                            >
                                              <option value="">eşleştir…</option>
                                              {bedensizRenkSecenekleri.map((rr) => <option key={rr} value={rr}>{rr}</option>)}
                                            </select>
                                          ) : (
                                            <span style={{ fontSize: 13, color: "var(--erp-border)" }}>—</span>
                                          )}
                                        </td>
                                      ))}
                                    </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            {pozisyonluMatris && tekliSatirlar.length > 0 && (
                              // TEKLİ RENKLER — pozisyonlu matrisin altındaki, pozisyon kavramı olmayan
                              // mamul renkleri; matrise karışmazlar. Düzen artık Astar/Fermuar
                              // bloklarıyla AYNI: sütun başlıkları mamul renkleri, sol hücre miktar,
                              // hücreler hammadde rengi. Eskiden yan yana akan kutucuklardı ve aynı
                              // ekranda üç farklı düzen görünüyordu.
                              //
                              // DİKKAT: burası `{kosul && (` içindeki bir JS İFADE konumudur — JSX
                              // yorumu ({/* ... */}) burada GEÇERSİZDİR, çünkü boş bir nesne değişmezi
                              // olarak ayrıştırılır ve ardından gelen JSX'i bozar. Bu konumda yalnızca
                              // // ya da /* */ biçimindeki JS yorumları kullanılabilir.
                              <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed var(--erp-line)" }}>
                                {(() => {
                                  const tekliMiktarlar = new Set(tekliSatirlar.map((r) => r.miktar));
                                  const tekliMiktarSabit = tekliMiktarlar.size === 1;
                                  const tekliOrtakMiktar = tekliMiktarSabit ? tekliSatirlar[0].miktar : null;
                                  const tekliOrtakBirim = tekliSatirlar[0] ? tekliSatirlar[0].birim : "";
                                  return (
                                    <div style={{ overflowX: "auto", maxWidth: "100%" }}>
                                      <div style={{ fontSize: 12, color: "var(--erp-text-3)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                                        Tekli renkler
                                        {tekliMiktarSabit && <span style={{ fontWeight: 700, color: "var(--erp-text)" }}>— hepsinde aynı miktar</span>}
                                        <SilOnayButonu
                                          onConfirm={() => onReceteSilToplu(product.id, tekliSatirlar.map((r) => r.id))}
                                          boyut={13}
                                          baslikNormal="Tekli renklerin tümünü sil"
                                          baslikOnay={`${tekliSatirlar.length} satır silinecek — emin misiniz? Tekrar dokunun`}
                                        />
                                      </div>
                                      <table style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
                                        <thead>
                                          <tr>
                                            <th style={{ fontSize: 13, textAlign: "left", padding: "4px 8px", whiteSpace: "nowrap" }}>Mamül Rengi</th>
                                            {tekliSatirlar.map((r) => (
                                              <th key={r.id} style={{ fontSize: 13, textAlign: "center", padding: "4px 8px", whiteSpace: "nowrap" }}>{r.mamulRenk}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr style={{ borderTop: "2px solid var(--erp-text)" }}>
                                            <td style={{ padding: "6px 8px", fontSize: 13, fontWeight: 700, color: "var(--erp-text)", whiteSpace: "nowrap" }}>
                                              Hammadde Rengi
                                              {tekliMiktarSabit && (
                                                <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 3 }}>
                                                  {/* step="0.01" bu alanda 0,0125 gibi bir miktarı
                                                      geçersiz sayıyordu. MiktarGirisi hem o sınırı hem
                                                      dar genişliği kaldırıyor, üstelik hesap kabul ediyor. */}
                                                  <MiktarGirisi
                                                    deger={tekliOrtakMiktar}
                                                    onKaydet={(yeni) => {
                                                      const guncellenecekler = tekliSatirlar.map((r) => {
                                                        const { id, ...rest } = r;
                                                        return { ...rest, miktar: yeni };
                                                      });
                                                      onReceteGrubuGuncelle(product.id, tekliSatirlar.map((r) => r.id), guncellenecekler);
                                                    }}
                                                  />
                                                  <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)", fontWeight: 400 }}>{tekliOrtakBirim}</span>
                                                </div>
                                              )}
                                            </td>
                                            {tekliSatirlar.map((r) => (
                                              <td key={r.id} style={{ padding: "6px 8px", textAlign: "center" }}>
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                                  <select
                                                    value={r.renk}
                                                    onChange={(e) => bedensizRenkDegistir(r, e.target.value)}
                                                    className="mono"
                                                    title="Hammadde rengini değiştir"
                                                    style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text)", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", padding: "1px 2px", background: "#fff" }}
                                                  >
                                                    {bedensizRenkSecenekleri.length === 0 && <option value={r.renk}>{r.renk}</option>}
                                                    {bedensizRenkSecenekleri.map((rr) => <option key={rr} value={rr}>{rr}</option>)}
                                                  </select>
                                                  {!tekliMiktarSabit && (
                                                    <MiktarGirisi
                                                    deger={r.miktar}
                                                    genislik={46}
                                                    onKaydet={(yeni) => {
                                                      const { id, ...rest } = r;
                                                      onReceteGrubuGuncelle(product.id, [r.id], [{ ...rest, miktar: yeni }]);
                                                    }}
                                                  />
                                                  )}
                                                </span>
                                              </td>
                                            ))}
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                            {g.satirlar[0] && g.satirlar[0].proses && (
                              // Proses adı artık grup başlığında renkli rozet olarak duruyor; buradaki
                              // tekrar kaldırıldı, yerine yalnızca renkli ince bir alt çizgi kaldı.
                              // (Burası `&& (` içindeki JS ifade konumu — JSX yorumu burada geçersizdir.)
                              <div style={{ marginTop: 6, height: 2, borderRadius: "var(--erp-r-sm)", background: alfaEkle(prosesRengi(g.satirlar[0].proses, pg.sira), "44") }} />
                            )}
                          </div>
                        );
                      }

                      // Aynı (mamul renk + pozisyon/açıklama + hammadde rengi + proses) paylaşan, sadece
                      // BEDEN'i farklı olan satırlar — yani bir eşleştirmenin tüm bedenlere uygulanmış hali —
                      // tek bir kompakt matris satırında toplanır (görüntüde; veride hâlâ ayrı ayrı tutulur).
                      const matrisSatirlari = [];
                      const matrisIndex = {};
                      g.satirlar.forEach((r) => {
                        // Miktar da anahtara dahil: aynı mamul renk/hammadde rengi için FARKLI miktar
                        // girilmişse bunlar ayrı eklemelerdir ve tek satırda birleştirilemez —
                        // birleştirildiğinde miktarlardan biri ekranda kayboluyordu.
                        const mKey = `${r.mamulRenk}__${r.aciklama || ""}__${r.renk}__${r.proses || ""}__${r.miktar}`;
                        if (!(mKey in matrisIndex)) {
                          matrisIndex[mKey] = matrisSatirlari.length;
                          matrisSatirlari.push({
                            key: mKey, mamulRenk: r.mamulRenk, aciklama: r.aciklama, renk: r.renk,
                            proses: r.proses, birim: hammaddeBirimi(r.hammaddeUrunId, hammaddeUrunler, r.birim), satirlar: [],
                          });
                        }
                        matrisSatirlari[matrisIndex[mKey]].satirlar.push(r);
                      });

                      // Bu grupta HİÇ satırı olmayan mamul renkleri. Matriste sütun olarak
                      // gösterilmezlerse eksik olduğu anlaşılmaz ve sonradan doldurulamaz.
                      const kapsananMamulRenkler = new Set(matrisSatirlari.map((ms) => ms.mamulRenk));
                      const eksikMamulRenkler = renkler.filter((mr) => !kapsananMamulRenkler.has(mr));

                      // Birden fazla mamul renk, birden fazla bedene sahipse: satırlar = mamul renk,
                      // sütunlar = beden olan kompakt bir matris kullanılır — her mamul renk için ayrı
                      // ayrı kart kart beden dökümü göstermek yerine, tek tabloda yan yana.
                      const tumBedenlerSet = new Set();
                      matrisSatirlari.forEach((ms) => ms.satirlar.forEach((r) => tumBedenlerSet.add(r.mamulBeden)));
                      const bedenMatrisiUygun = matrisSatirlari.length > 1 && tumBedenlerSet.size > 1 && !tumBedenlerSet.has("Tüm Bedenler");

                      if (bedenMatrisiUygun) {
                        const tumBedenler = Array.from(tumBedenlerSet).sort();
                        // Her satırın kendi bedenleri arasında miktar SABİT mi (ve tüm bedenleri kapsıyor
                        // mu) kontrol edilir. Bu durumda o kadar çok tekrar eden kutu göstermenin anlamı
                        // yok — TEK bir miktar kutusu yeterli, değiştirildiğinde o satırın TÜM bedenlerine
                        // birden uygulanır. Miktar bedenler arasında farklıysa (örn. büyük numarada daha
                        // fazla malzeme), o satır için normal beden bazlı döküm korunur.
                        const satirSabitMi = (ms) => {
                          if (ms.satirlar.length !== tumBedenler.length) return false;
                          const miktarlar = new Set(ms.satirlar.map((r) => r.miktar));
                          return miktarlar.size <= 1;
                        };
                        const hepsiSabit = matrisSatirlari.every(satirSabitMi);
                        // Hücrelerdeki hammadde rengini SADECE silip yeniden eklemek yerine, doğrudan
                        // değiştirebilmek için bu hammaddenin (tüm gruptaki hammadde AYNI) kendi renk
                        // seçeneklerini burada bir kez hesaplıyoruz.
                        const bedenHammadde = (tumUrunler || []).find((p) => p.id === g.hammaddeUrunId);
                        const bedenHammaddeRenkSecenekleri = bedenHammadde ? Array.from(new Set(bedenHammadde.variants.map((v) => v.renk))) : [];
                        return (
                          <div key={g.key} style={{ border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 10, background: "var(--erp-panel)", minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                              <ColorSwatch
                                src={(() => {
                                  const hammadde = (tumUrunler || []).find((p) => p.id === g.hammaddeUrunId);
                                  if (!hammadde) return null;
                                  const ilkRenk = matrisSatirlari[0] ? matrisSatirlari[0].renk : null;
                                  return (hammadde.renkResimleri || {})[ilkRenk] || hammadde.kapakResmi;
                                })()}
                                editable={false}
                                size={22}
                              />
                              <button
                                type="button"
                                onClick={() => onGoToUrun && onGoToUrun(g.satirlar[0].hammaddeUrunId)}
                                title="Bu hammaddenin stok kartını aç"
                                style={{ border: "none", background: "none", padding: 0, cursor: "pointer", color: "var(--erp-text)", fontWeight: 700, textDecoration: "underline", textDecorationStyle: "dotted" }}
                              >
                                {g.hammaddeAd}
                              </button>
                              <span
                                className="mono"
                                title="Bu hammadde kaç mamul renk ve kaç bedene tanımlı"
                                style={{ fontWeight: 400, color: "var(--erp-text-3)", fontSize: 12 }}
                              >
                                {(() => {
                                  // "131 satır" gibi ham sayı hiçbir şey anlatmıyordu; kullanıcı için
                                  // anlamlı olan KAÇ RENGE ve KAÇ BEDENE tanımlı olduğudur.
                                  // Ürünün TÜM renklerini kapsamıyorsa bu da burada belirtilir —
                                  // eksiklik, tabloyu açıp sütunları saymadan görünmeli.
                                  const renkSayisi = new Set(g.satirlar.map((r) => r.mamulRenk)).size;
                                  const bedenlerKume = new Set(g.satirlar.map((r) => r.mamulBeden));
                                  const bedensiz = bedenlerKume.size === 1 && bedenlerKume.has("Tüm Bedenler");
                                  const toplamRenk = renkler.length;
                                  const eksikRenk = Math.max(0, toplamRenk - renkSayisi);
                                  const temel = bedensiz
                                    ? `${renkSayisi} renk · tüm bedenler`
                                    : `${renkSayisi} renk × ${bedenlerKume.size} beden`;
                                  return eksikRenk > 0 ? `${temel} · ${eksikRenk} renk eksik` : temel;
                                })()}
                              </span>
                              {/* PROSES SEÇİCİ — yalnızca gösterim değil, DEĞİŞTİRİLEBİLİR.
                                  Aynı hammadde birden çok kez eklenmiş olabilir (ör. Deri Nubuk hem yüz hem
                                  astar olarak); her ekleme ayrı gruptur ve hangi prosese ait olduğu kritiktir —
                                  üretim tüketimi bu bilgiye göre hangi aşamada hangi malzemenin düşeceğini
                                  belirler. Proses boşsa malzeme üretimde HİÇ düşülmez.
                                  Önceden yalnızca ATANMIŞ prosesler görünüyordu; atanmamış olanı düzeltmenin
                                  yolu yoktu, oysa asıl düzeltilmesi gereken oydu. */}
                              {(() => {
                                const mevcut = (g.satirlar[0] && g.satirlar[0].proses) || "";
                                const pRenk = mevcut ? prosesRengi(mevcut, pg.sira) : "var(--erp-warn)";
                                return (
                                  <select
                                    value={mevcut}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      // Grubun TÜM satırları aynı prosese taşınır — grup zaten tek bir
                                      // eklemeyi temsil ediyor, satırları ayrı proseslere bölmek anlamsız.
                                      const yeni = e.target.value;
                                      const guncel = g.satirlar.map(({ id, ...rest }) => ({ ...rest, proses: yeni }));
                                      onReceteGrubuGuncelle(product.id, g.satirlar.map((s) => s.id), guncel);
                                    }}
                                    title={mevcut ? `Bu reçete ${mevcut} prosesinde tüketilir` : "Proses atanmamış — üretimde bu malzeme HİÇ düşülmez"}
                                    className="mono"
                                    style={{
                                      fontSize: 11, fontWeight: 700, color: pRenk, background: alfaEkle(pRenk, "1A"),
                                      padding: "3px 8px", borderRadius: "var(--erp-r-pill)", whiteSpace: "nowrap",
                                      border: mevcut ? `1px solid ${alfaEkle(pRenk, "44")}` : `1px dashed ${pRenk}`,
                                      cursor: "pointer", maxWidth: 190,
                                    }}
                                  >
                                    <option value="">⚠ proses seçin</option>
                                    {(tanimlarProsesler || []).map((p2) => (
                                      <option key={p2.id} value={p2.ad}>{p2.ad}</option>
                                    ))}
                                    {(tanimlarAraProsesler || []).length > 0 && (
                                      <optgroup label="Ara prosesler">
                                        {(tanimlarAraProsesler || []).map((p2) => (
                                          <option key={p2.id} value={p2.ad}>{p2.ad}</option>
                                        ))}
                                      </optgroup>
                                    )}
                                  </select>
                                );
                              })()}
                              {g.eklemeTarihi && (
                                <span
                                  className="mono"
                                  title={`Bu grup ${new Date(g.eklemeTarihi).toLocaleString("tr-TR")} tarihinde tek bir "Reçeteye Ekle" işlemiyle oluşturuldu`}
                                  style={{ fontSize: 11, color: "var(--erp-text-3)", whiteSpace: "nowrap" }}
                                >
                                  {tarihYaz(g.eklemeTarihi)}
                                </span>
                              )}
                              {/* ONAYLI SİLME (kullanıcı, 11 Eylül: "reçetede silme onaylı olsun, tek tıklama ile
                                  siliniyor"). Bu düğme hammaddenin BÜTÜN satırlarını siliyor — tek dokunuşla gitmemeli. */}
                              <span style={{ marginLeft: "auto", display: "flex" }}>
                                <SilOnayButonu
                                  onConfirm={() => onReceteSilToplu(product.id, g.satirlar.map((r) => r.id))}
                                  boyut={13}
                                  baslikNormal={`${g.hammaddeAd} hammaddesine ait tüm satırları (${g.satirlar.length}) sil`}
                                  baslikOnay={`${g.satirlar.length} satır silinecek — emin misiniz? Tekrar dokunun`}
                                />
                              </span>
                            </div>
                            {hepsiSabit ? (() => {
                              // Sadece bedenler arasında değil, TÜM mamul renkler arasında da miktar
                              // aynıysa (örn. hepsi "1"), bu tek değer özet satırında doğrudan gösterilir.
                              const tumMiktarlar = new Set(matrisSatirlari.map((ms) => ms.satirlar[0].miktar));
                              const hepsininMiktariAyni = tumMiktarlar.size === 1;
                              const ortakMiktar = hepsininMiktariAyni ? matrisSatirlari[0].satirlar[0].miktar : null;
                              const ortakBirim = matrisSatirlari[0] ? matrisSatirlari[0].birim : "";
                              return (
                              // Ters (transpoze) tablo: 1. satır mamul renkleri sütun başlığı gibi
                              // yan yana dizer, 2. satır her birinin altına SADECE hammadde rengini
                              // gösterir — miktar zaten üstteki özet satırında (hepsi ortak olduğu için)
                              // TEK bir düzenlenebilir kutuda tutulduğundan, her hücrede tekrarlanmaz.
                              <div style={{ overflowX: "auto", maxWidth: "100%" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--erp-text-3)", marginBottom: 6, flexWrap: "wrap" }}>
                                  <span>{tumBedenler.length} beden ({tumBedenler.join(", ")}) — hepsinde aynı miktar</span>
                                  {hepsininMiktariAyni ? (
                                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                      ·
                                      <input
                                        type="number" step="any" min="0"
                                        defaultValue={ortakMiktar}
                                        onBlur={(e) => {
                                          const yeni = parseFloat(e.target.value);
                                          if (!(yeni > 0) || yeni === ortakMiktar) return;
                                          // TÜM mamul renklerin TÜM bedenlerine yeni miktar tek seferde uygulanır.
                                          const tumSatirlar = matrisSatirlari.flatMap((ms) => ms.satirlar);
                                          const guncellenecekler = tumSatirlar.map((r) => {
                                            const { id, ...rest } = r;
                                            return { ...rest, miktar: yeni };
                                          });
                                          onReceteGrubuGuncelle(product.id, tumSatirlar.map((r) => r.id), guncellenecekler);
                                        }}
                                        className="mono"
                                        style={{ width: 78, padding: "3px 6px", fontSize: 12, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", fontWeight: 700, color: "var(--erp-text)" }}
                                      />
                                      <span className="mono" style={{ fontWeight: 700, color: "var(--erp-text)" }}>{ortakBirim}</span>
                                    </span>
                                  ) : (
                                    <span style={{ fontWeight: 700, color: "var(--erp-text)" }}> · {ortakMiktar} {ortakBirim}</span>
                                  )}
                                </div>
                                {/* EKSİK MAMUL RENKLERİ — bu hammaddenin reçetesi bazı model renkleri için
                                    hiç kurulmamış olabilir. Eskiden matris yalnızca VAR OLAN satırlardan
                                    sütun üretiyordu: eksik renkler ekranda hiç görünmüyor, dolayısıyla
                                    sonradan doldurulamıyordu. Kullanıcı eksiği ancak üretimde hammadde
                                    düşmediğinde fark ediyordu.
                                    Artık eksik renkler de sütun olarak çizilir ve doğrudan eşleştirilebilir. */}
                                <table style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
                                  <thead>
                                    <tr>
                                      <th style={{ fontSize: 13, textAlign: "left", padding: "4px 8px", whiteSpace: "nowrap" }}>Mamül Rengi</th>
                                      {matrisSatirlari.map((ms) => (
                                        <th key={ms.key} style={{ fontSize: 13, textAlign: "center", padding: "4px 8px", whiteSpace: "nowrap" }}>
                                          {ms.mamulRenk}
                                          {ms.aciklama && (
                                            <span
                                              className="mono"
                                              style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-brown)", background: "var(--erp-panel-2)", padding: "1px 5px", borderRadius: "var(--erp-r-pill)", marginLeft: 4 }}
                                            >
                                              {aciklamaGoster(ms.aciklama, ms.mamulRenk)}
                                            </span>
                                          )}
                                        </th>
                                      ))}
                                      {eksikMamulRenkler.map((mr) => (
                                        <th
                                          key={`eksik-${mr}`}
                                          title="Bu model rengi için eşleşme yapılmamış — üretimde bu renkten hammadde düşülmez"
                                          style={{ fontSize: 13, textAlign: "center", padding: "4px 8px", whiteSpace: "nowrap", color: "var(--erp-warn)" }}
                                        >
                                          {mr}
                                          <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-warn)", background: "#B85C2E18", padding: "1px 5px", borderRadius: "var(--erp-r-pill)", marginLeft: 4 }}>
                                            eksik
                                          </span>
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr style={{ borderTop: "2px solid var(--erp-text)" }}>
                                      {/* Sol hücre, Astar bloğundaki düzenle AYNI: satır etiketi + o satırın
                                          miktarı. Miktarı yalnızca üstteki özet satırında göstermek, tabloya
                                          bakarken "bu satır kaç birim?" sorusunu cevapsız bırakıyordu ve üç
                                          blok üç ayrı düzen kullandığı için ekran tutarsız görünüyordu. */}
                                      <td style={{ padding: "6px 8px", fontSize: 13, fontWeight: 700, color: "var(--erp-text)", whiteSpace: "nowrap" }}>
                                        Hammadde Rengi
                                        {/* Alttaki miktar kutusu KALDIRILDI (21 Eylül): üstteki "N beden — hepsinde aynı
                                            miktar" kutusuyla birebir aynı işi yapıyordu (tüm satırlara aynı miktar). */}
                                      </td>
                                      {matrisSatirlari.map((ms) => (
                                        <td key={ms.key} style={{ padding: "6px 8px", textAlign: "center" }}>
                                          {hepsininMiktariAyni ? (
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                              <select
                                                value={ms.renk}
                                                onChange={(e) => {
                                                  const yeniRenk = e.target.value;
                                                  if (!yeniRenk || yeniRenk === ms.renk) return;
                                                  const guncellenecekler = ms.satirlar.map((r) => {
                                                    const { id, ...rest } = r;
                                                    return { ...rest, renk: yeniRenk };
                                                  });
                                                  onReceteGrubuGuncelle(product.id, ms.satirlar.map((r) => r.id), guncellenecekler);
                                                }}
                                                className="mono"
                                                style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", padding: "1px 2px" }}
                                              >
                                                {bedenHammaddeRenkSecenekleri.map((r) => <option key={r} value={r}>{r}</option>)}
                                              </select>
                                            </span>
                                          ) : (
                                            // Mamul renkler arasında miktar FARKLIYSA (her biri kendi içinde
                                            // sabit ama birbirinden farklı), üstteki tek kutu yeterli olmaz —
                                            // her sütun kendi miktarını burada, hücrede taşımaya devam eder.
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                              <select
                                                value={ms.renk}
                                                onChange={(e) => {
                                                  const yeniRenk = e.target.value;
                                                  if (!yeniRenk || yeniRenk === ms.renk) return;
                                                  const guncellenecekler = ms.satirlar.map((r) => {
                                                    const { id, ...rest } = r;
                                                    return { ...rest, renk: yeniRenk };
                                                  });
                                                  onReceteGrubuGuncelle(product.id, ms.satirlar.map((r) => r.id), guncellenecekler);
                                                }}
                                                className="mono"
                                                style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", padding: "1px 2px" }}
                                              >
                                                {bedenHammaddeRenkSecenekleri.map((r) => <option key={r} value={r}>{r}</option>)}
                                              </select>
                                              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                                <input
                                                  type="number" step="any" min="0"
                                                  defaultValue={ms.satirlar[0].miktar}
                                                  onBlur={(e) => {
                                                    const yeni = parseFloat(e.target.value);
                                                    if (!(yeni > 0) || yeni === ms.satirlar[0].miktar) return;
                                                    const guncellenecekler = ms.satirlar.map((r) => {
                                                      const { id, ...rest } = r;
                                                      return { ...rest, miktar: yeni };
                                                    });
                                                    onReceteGrubuGuncelle(product.id, ms.satirlar.map((r) => r.id), guncellenecekler);
                                                  }}
                                                  className="mono"
                                                  style={{ width: 44, padding: "4px 7px", fontSize: 12, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)" }}
                                                />
                                                <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{ms.birim}</span>
                                              </div>
                                            </div>
                                          )}
                                        </td>
                                      ))}
                                      {/* Eksik mamul renkleri için doldurulabilir hücre: hammadde rengi
                                          seçildiği anda o renk için tüm bedenlere satır üretilir.
                                          Miktar ve beden dağılımı, bu gruptaki mevcut bir sütundan
                                          kopyalanır — kullanıcıya yeniden sordurmak gereksiz, çünkü aynı
                                          hammaddenin aynı prosesteki kullanımı zaten tanımlı. */}
                                      {eksikMamulRenkler.map((mr) => (
                                        <td key={`eksik-${mr}`} style={{ padding: "6px 8px", textAlign: "center" }}>
                                          <select
                                            value=""
                                            onChange={(e) => {
                                              const yeniRenk = e.target.value;
                                              if (!yeniRenk) return;
                                              const ornek = matrisSatirlari[0];
                                              if (!ornek) return;
                                              const yeniSatirlar = ornek.satirlar.map((r) => {
                                                const { id, ...rest } = r;
                                                return { ...rest, mamulRenk: mr, renk: yeniRenk };
                                              });
                                              onReceteGrubuGuncelle(product.id, [], yeniSatirlar);
                                            }}
                                            className="mono"
                                            title={`"${mr}" için hammadde rengi seçin — eşleşme oluşturulur`}
                                            style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-warn)", border: "1px dashed #B85C2E", borderRadius: "var(--erp-r-sm)", padding: "1px 2px", background: "var(--erp-orange-bg)" }}
                                          >
                                            <option value="">eşleştir…</option>
                                            {bedenHammaddeRenkSecenekleri.map((r) => <option key={r} value={r}>{r}</option>)}
                                          </select>
                                        </td>
                                      ))}
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              );
                            })() : (
                            <div style={{ overflowX: "auto", maxWidth: "100%" }}>
                              <table style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                  <tr>
                                    <th style={{ fontSize: 13, textAlign: "left", padding: "4px 8px" }}>Mamul → Hammadde Rengi</th>
                                    {tumBedenler.map((b) => (
                                      <th key={b} style={{ fontSize: 13, textAlign: "center", padding: "4px 8px", whiteSpace: "nowrap" }}>{b}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {matrisSatirlari.map((ms) => (
                                    <tr key={ms.key}>
                                      <td style={{ padding: "4px 8px", whiteSpace: "nowrap" }}>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--erp-text)" }}>{ms.mamulRenk}</span>
                                        <ArrowRight size={12} color="var(--erp-text-3)" style={{ margin: "0 3px", verticalAlign: "middle" }} />
                                        <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text)" }}>{ms.renk}</span>
                                        {ms.aciklama && (
                                          <span
                                            className="mono"
                                            style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-brown)", background: "var(--erp-panel-2)", padding: "1px 5px", borderRadius: "var(--erp-r-pill)", marginLeft: 4 }}
                                          >
                                            {aciklamaGoster(ms.aciklama, ms.mamulRenk)}
                                          </span>
                                        )}
                                      </td>
                                      {tumBedenler.map((b) => {
                                        const r = ms.satirlar.find((x) => x.mamulBeden === b);
                                        return (
                                          <td key={b} style={{ padding: "4px 8px", textAlign: "center" }}>
                                            {r ? (
                                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                                                <MiktarGirisi
                                                    deger={r.miktar}
                                                    genislik={44}
                                                    onKaydet={(yeni) => {
                                                      const { id, ...rest } = r;
                                                      onReceteGrubuGuncelle(product.id, [r.id], [{ ...rest, miktar: yeni }]);
                                                    }}
                                                  />
                                              </div>
                                            ) : (
                                              <span style={{ fontSize: 13, color: "var(--erp-border)" }}>—</span>
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            )}
                            {g.satirlar[0] && g.satirlar[0].proses && (
                              // Proses adı artık grup başlığında renkli rozet olarak duruyor; buradaki
                              // tekrar kaldırıldı, yerine yalnızca renkli ince bir alt çizgi kaldı.
                              // (Burası `&& (` içindeki JS ifade konumu — JSX yorumu burada geçersizdir.)
                              <div style={{ marginTop: 6, height: 2, borderRadius: "var(--erp-r-sm)", background: alfaEkle(prosesRengi(g.satirlar[0].proses, pg.sira), "44") }} />
                            )}
                          </div>
                        );
                      }

                      return (
                      <div key={g.key} style={{ border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 10, background: "var(--erp-panel)" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                          <ColorSwatch
                            src={(() => {
                              const hammadde = (tumUrunler || []).find((p) => p.id === g.hammaddeUrunId);
                              if (!hammadde) return null;
                              const ilkRenk = g.satirlar[0] ? g.satirlar[0].renk : null;
                              return (hammadde.renkResimleri || {})[ilkRenk] || hammadde.kapakResmi;
                            })()}
                            editable={false}
                            size={22}
                          />
                          <button
                                type="button"
                                onClick={() => onGoToUrun && onGoToUrun(g.satirlar[0].hammaddeUrunId)}
                                title="Bu hammaddenin stok kartını aç"
                                style={{ border: "none", background: "none", padding: 0, cursor: "pointer", color: "var(--erp-text)", fontWeight: 700, textDecoration: "underline", textDecorationStyle: "dotted" }}
                              >
                                {g.hammaddeAd}
                              </button>
                          <span
                                className="mono"
                                title="Bu hammadde kaç mamul renk ve kaç bedene tanımlı"
                                style={{ fontWeight: 400, color: "var(--erp-text-3)", fontSize: 12 }}
                              >
                                {(() => {
                                  // "131 satır" gibi ham sayı hiçbir şey anlatmıyordu; kullanıcı için
                                  // anlamlı olan KAÇ RENGE ve KAÇ BEDENE tanımlı olduğudur.
                                  // Ürünün TÜM renklerini kapsamıyorsa bu da burada belirtilir —
                                  // eksiklik, tabloyu açıp sütunları saymadan görünmeli.
                                  const renkSayisi = new Set(g.satirlar.map((r) => r.mamulRenk)).size;
                                  const bedenlerKume = new Set(g.satirlar.map((r) => r.mamulBeden));
                                  const bedensiz = bedenlerKume.size === 1 && bedenlerKume.has("Tüm Bedenler");
                                  const toplamRenk = renkler.length;
                                  const eksikRenk = Math.max(0, toplamRenk - renkSayisi);
                                  const temel = bedensiz
                                    ? `${renkSayisi} renk · tüm bedenler`
                                    : `${renkSayisi} renk × ${bedenlerKume.size} beden`;
                                  return eksikRenk > 0 ? `${temel} · ${eksikRenk} renk eksik` : temel;
                                })()}
                              </span>
                          {/* Aynı hammadde birden çok kez eklenmiş olabilir (ör. Deri Nubuk hem yüz hem astar
                              olarak). Her ekleme ayrı gruptur; hangi proses için ve ne zaman eklendiği başlıkta
                              görünmezse iki grup birbirinin aynısı sanılır. */}
                          {g.satirlar[0] && g.satirlar[0].proses && (
                            <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: prosesRengi(g.satirlar[0].proses, pg.sira), background: alfaEkle(prosesRengi(g.satirlar[0].proses, pg.sira), "1A"), padding: "3px 9px", borderRadius: "var(--erp-r-pill)", whiteSpace: "nowrap" }}>
                              {g.satirlar[0].proses}
                            </span>
                          )}
                          {g.eklemeTarihi && (
                            <span
                              className="mono"
                              title={`Bu grup ${new Date(g.eklemeTarihi).toLocaleString("tr-TR")} tarihinde tek bir "Reçeteye Ekle" işlemiyle oluşturuldu`}
                              style={{ fontSize: 11, color: "var(--erp-text-3)", whiteSpace: "nowrap" }}
                            >
                              {tarihYaz(g.eklemeTarihi)}
                            </span>
                          )}
                          {/* ONAYLI SİLME (kullanıcı, 11 Eylül: "reçetede silme onaylı olsun, tek tıklama ile
                              siliniyor"). Bu düğme hammaddenin BÜTÜN satırlarını siliyor — tek dokunuşla gitmemeli. */}
                          <span style={{ marginLeft: "auto", display: "flex" }}>
                            <SilOnayButonu
                              onConfirm={() => onReceteSilToplu(product.id, g.satirlar.map((r) => r.id))}
                              boyut={13}
                              baslikNormal={`${g.hammaddeAd} hammaddesine ait tüm satırları (${g.satirlar.length}) sil`}
                              baslikOnay={`${g.satirlar.length} satır silinecek — emin misiniz? Tekrar dokunun`}
                            />
                          </span>
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          {(() => {
                            const belirtilmemisHammadde = (tumUrunler || []).find((p) => p.id === g.hammaddeUrunId);
                            const belirtilmemisRenkSecenekleri = belirtilmemisHammadde ? Array.from(new Set(belirtilmemisHammadde.variants.map((v) => v.renk))) : [];
                            return matrisSatirlari.map((ms) => {
                            const tekBeden = ms.satirlar.length === 1 && ms.satirlar[0].mamulBeden === "Tüm Bedenler";
                            return (
                            <div key={ms.key} style={{ background: "#fff", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: "8px 10px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: tekBeden ? 0 : 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--erp-text)" }}>{ms.mamulRenk}</span>
                                <ArrowRight size={13} color="var(--erp-text-3)" />
                                {ms.aciklama && (
                                  <span
                                    className="mono"
                                    style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-brown)", background: "var(--erp-panel-2)", padding: "3px 8px", borderRadius: "var(--erp-r-pill)" }}
                                  >
                                    {aciklamaGoster(ms.aciklama, ms.mamulRenk)}
                                  </span>
                                )}
                                <select
                                  value={ms.renk}
                                  onChange={(e) => {
                                    const yeniRenk = e.target.value;
                                    if (!yeniRenk || yeniRenk === ms.renk) return;
                                    const guncellenecekler = ms.satirlar.map((r) => {
                                      const { id, ...rest } = r;
                                      return { ...rest, renk: yeniRenk };
                                    });
                                    onReceteGrubuGuncelle(product.id, ms.satirlar.map((r) => r.id), guncellenecekler);
                                  }}
                                  className="mono"
                                  style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", padding: "1px 2px" }}
                                >
                                  {belirtilmemisRenkSecenekleri.map((r) => <option key={r} value={r}>{r}</option>)}
                                </select>
                                {ms.proses && <span className="mono" style={{ fontSize: 12, color: "var(--erp-text-2)" }}>{ms.proses}</span>}
                                {tekBeden && (
                                  <>
                                    <input
                                      type="number" step="any" min="0"
                                      defaultValue={ms.satirlar[0].miktar}
                                      onBlur={(e) => {
                                        const yeni = parseFloat(e.target.value);
                                        const r = ms.satirlar[0];
                                        if (!(yeni > 0) || yeni === r.miktar) return;
                                        const { id, ...rest } = r;
                                        onReceteGrubuGuncelle(product.id, [r.id], [{ ...rest, miktar: yeni }]);
                                      }}
                                      className="mono"
                                      style={{ width: 64, padding: "3px 5px", fontSize: 13, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)" }}
                                    />
                                    <span className="mono" style={{ fontSize: 13, color: "var(--erp-text-3)" }}>{ms.birim}</span>
                                  </>
                                )}
                                <SilOnayButonu
                                  onConfirm={() => onReceteSilToplu(product.id, ms.satirlar.map((r) => r.id))}
                                  boyut={12}
                                  baslikNormal={tekBeden ? "Sil" : "Bu eşleştirmenin tüm bedenlerini sil"}
                                />
                              </div>
                              {!tekBeden && (
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                  {ms.satirlar.map((r) => (
                                    <div
                                      key={r.id}
                                      style={{
                                        display: "flex", alignItems: "center", gap: 4, background: "var(--erp-panel)",
                                        border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-sm)", padding: "3px 6px",
                                      }}
                                    >
                                      <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)" }}>
                                        {r.mamulBeden}{r.beden !== r.mamulBeden ? ` (${r.beden})` : ""}
                                      </span>
                                      <MiktarGirisi
                                                    deger={r.miktar}
                                                    genislik={44}
                                                    onKaydet={(yeni) => {
                                                      const { id, ...rest } = r;
                                                      onReceteGrubuGuncelle(product.id, [r.id], [{ ...rest, miktar: yeni }]);
                                                    }}
                                                  />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            );
                            });
                          })()}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
                ));
              })()}
            </div>
            </>
          )}

        </div>
      )}

      {/* MALİYET SEKMESİ (21 Eylül): reçete maliyet dökümü + fiyat gruplarına satış fiyatı. */}
      {isMamul && cardTab === "maliyet" && (
        <div data-maliyet-sekmesi="1" style={{ display: "grid", gap: 10 }}>
          {(product.recete || []).length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="btn-ghost" data-maliyet-yazdir-ac="1"
                onClick={() => onPencereAc("maliyet", product.id, `Maliyet: ${product.ad}`, { product })}
                title="Seçili para biriminde maliyet dökümünü yazdır">
                <Printer size={13} /> Maliyet Yazdır (PDF)
              </button>
            </div>
          )}
          {(product.recete || []).length === 0 && (
            <EmptyState text="Reçete boş — önce Reçete sekmesinden hammadde ekleyin, maliyet buradan çıkar." />
          )}
          {/* ÜRETİMDE REÇETEDEN SAPMALAR (kullanıcı, 21 Eylül: "üretimden ölçülen tüketimi de
              sekmeye taşıyabiliriz; üretimde fark yok ise göstermesine gerek yok, fark olan
              üretimde üretim no, stok ve fark miktarını belirtse yeterli"). Reçeteyle tutan
              ölçümler listelenmiyor; her sapma kendi üretim numarasıyla bir satır. */}
          {(() => {
            const ozet = product.receteGerceklesme || {};
            const satirlar = [];
            const oneriler = [];
            Object.keys(ozet).forEach((anahtar) => {
              const [hmId, renk, beden] = anahtar.split("|");
              const d = receteGerceklesmeDurumu(ozet, hmId, renk || "", beden || "");
              if (!d) return;
              const hm = (tumUrunler || []).find((u) => u.id === hmId);
              const ortak = { ad: hm ? hm.ad : "?", renk, beden, birim: (hm && hm.birim) || "" };
              if ((d.sapmalar || []).length > 0) {
                d.sapmalar.forEach((sp) => satirlar.push({ ...sp, ...ortak }));
              } else if (Math.abs(d.fark) >= 0.005 && d.planlanan > 0) {
                // ESKİ KAYIT: üretim numarası tutulmadan önceki ölçümler — ortalama fark olarak.
                satirlar.push({ ...ortak, uretimNo: `${d.olcum} ölçüm ort.`, tarih: d.sonTarih, birimFark: Math.round((d.ortalama - d.planlanan) * 10000) / 10000, toplamFark: null });
              }
              // ÖNERİ KORUNDU: yeterli ölçüm + anlamlı fark → reçeteyi güncellemeyi öner (otomatik değişiklik yok).
              if (d.oneriVar) oneriler.push({ ...ortak, ortalama: d.ortalama, planlanan: d.planlanan, olcum: d.olcum });
            });
            if (satirlar.length === 0 && oneriler.length === 0) return null;
            satirlar.sort((a, b) => String(b.tarih || "").localeCompare(String(a.tarih || "")));
            const yuvarla = (v) => (Math.round((v || 0) * 1000) / 1000).toLocaleString("tr-TR");
            return (
              <div data-uretim-sapmalari="1" style={{ background: "var(--erp-hover)", border: "1px solid #C9A063", borderRadius: "var(--erp-r-md)", padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-brown)", marginBottom: 6 }}>
                  Üretimde reçeteden sapma <span style={{ fontWeight: 400, color: "var(--erp-text-2)" }}>· yalnız farkı olan üretimler</span>
                </div>
                {satirlar.length > 0 && <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, background: "#fff" }}>
                  <thead><tr style={{ background: "var(--erp-panel-2)" }}>
                    {["Üretim", "Stok", "Fark (çift başı)", "Fark (toplam)"].map((h, k) => (
                      <th key={h} style={{ padding: "4px 8px", textAlign: k < 2 ? "left" : "right", fontSize: 10, textTransform: "uppercase", color: "var(--erp-text-2)" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {satirlar.slice(0, 50).map((x, k) => (
                      <tr key={k} data-sapma-satir={x.uretimNo} style={{ borderBottom: "1px solid var(--erp-border-2)" }}>
                        <td className="mono" style={{ padding: "4px 8px", fontWeight: 700 }}>{x.uretimNo}</td>
                        <td style={{ padding: "4px 8px" }}>{x.ad}<span style={{ color: "var(--erp-text-3)" }}>{x.renk ? ` · ${x.renk}` : ""}{x.beden ? ` · ${x.beden}` : ""}</span></td>
                        <td className="mono" style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700, color: x.birimFark > 0 ? "var(--erp-void)" : "var(--erp-ok)" }}>
                          {x.birimFark > 0 ? "+" : ""}{yuvarla(x.birimFark)} {x.birim}
                        </td>
                        <td className="mono" style={{ padding: "4px 8px", textAlign: "right", color: "var(--erp-text-2)" }}>
                          {x.toplamFark != null ? `${x.toplamFark > 0 ? "+" : ""}${yuvarla(x.toplamFark)} ${x.birim}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>}
                {oneriler.map((o, k) => (
                  <div key={`o${k}`} data-recete-onerisi="1" style={{ fontSize: 11, color: "var(--erp-brown)", fontStyle: "italic", marginTop: 4 }}>
                    → {o.ad}{o.renk ? ` · ${o.renk}` : ""}{o.beden ? ` · ${o.beden}` : ""}: {o.olcum} ölçümün ortalaması {o.ortalama} {o.birim}
                    (reçete {o.planlanan}) — reçeteyi {o.ortalama} yapmayı değerlendirin
                  </div>
                ))}
                <div style={{ fontSize: 10, color: "var(--erp-text-3)", marginTop: 4 }}>
                  Kırmızı: reçeteden fazla harcandı · yeşil: az.
                </div>
              </div>
            );
          })()}

          {(product.recete || []).length > 0 && (() => {
            const anaProsesIscilik = Object.values(product.prosesUcretleri || {}).reduce((s, u) => s + (u || 0), 0);
            // Ara proses ücretleri (bir ana prosesten sonra otomatik tamamlanan küçük işçilik kalemleri)
            // ana proses işçiliğine dahil DEĞİLDİR ve ayrı tutulur — bu yüzden toplam maliyete de
            // ayrıca eklenmesi gerekir; aksi halde reçetenin gerçek üretim maliyeti eksik hesaplanır.
            const araProsesIscilik = Object.entries(product.araProsesEklentileri || {}).reduce((s, [, araProsesId]) => {
              if (!araProsesId) return s;
              const ozelUcret = (product.araProsesUcretleri || {})[araProsesId];
              if (ozelUcret != null) return s + ozelUcret;
              const tanimliAp = (tanimlarAraProsesler || []).find((ap) => ap.id === araProsesId);
              return s + (tanimliAp ? (tanimliAp.ucret || 0) : 0);
            }, 0);
            const isciligToplami = anaProsesIscilik + araProsesIscilik;
            const receteVarRenk = renkler.find((mr) => (product.recete || []).some((r) => r.mamulRenk === mr));
            let hammaddeToplami = 0;
            const kuruEksikler = new Set();
            // REÇETE MALİYET DÖKÜMÜ (kullanıcı, 21 Eylül: "stoğun para birimi ve kendi birimi ile
            // tutarı ve TL tutarı; reçetede hangi para birimiyle maliyet isteniyorsa ona bölecek;
            // ayrı bir alanda her birimin toplamları"). Her satır: kendi biriminde fiyat ve tutar,
            // TL karşılığı, seçilen maliyet biriminde karşılığı.
            const maliyetDokumu = [];
            if (receteVarRenk) {
              const ilgiliSatirlar = product.recete.filter((r) => r.mamulRenk === receteVarRenk);
              receteProsesGrupla(ilgiliSatirlar, tanimlarProsesler, product.receteProsesSirasiOverride).forEach((pg) => {
                receteMaliyetGrupla(pg.satirlar).forEach((g) => {
                  const hammadde = (tumUrunler || []).find((p) => p.id === g.satirlar[0].hammaddeUrunId);
                  const miktar = g.satirlar[0].miktar || 0;
                  // PARA BİRİMİ (20 Eylül): USD/EUR alış fiyatı kurla TL'ye çevriliyor.
                  // RENK VE BOY DAHİL fiyat (21 Eylül): boy kuralındaki fiyat da okunuyor.
                  const bf = hammaddeBirimFiyati(hammadde, g.satirlar[0].renk, g.satirlar[0].beden, kurlar);
                  const fiyat = bf.tl;
                  if (bf.kendiFiyat > 0 && bf.pb !== "TRY" && !(parseFloat((kurlar || {})[bf.pb]) > 0)) kuruEksikler.add(bf.pb);
                  hammaddeToplami += miktar * fiyat;
                  maliyetDokumu.push({
                    hammaddeId: hammadde ? hammadde.id : null,
                    ad: hammadde ? hammadde.ad : (g.satirlar[0].hammaddeAd || "?"),
                    renk: g.satirlar[0].renk || "", boy: g.satirlar[0].beden || "",
                    miktar, birim: g.satirlar[0].birim || (hammadde && hammadde.birim) || "",
                    pb: bf.pb, kendiFiyat: bf.kendiFiyat, kendiTutar: bf.kendiFiyat * miktar, tl: miktar * fiyat, kaynak: bf.kaynak,
                  });
                });
              });
            }
            const genelToplam = isciligToplami + hammaddeToplami;
            if (isciligToplami === 0 && hammaddeToplami === 0) return null;
            // MALİYET BİRİMİ: ürüne kaydedilir (`maliyetBirimi`). Hesap her zaman önce TL'ye çevirip
            // sonra hedef birimin kuruna böler — çapraz kur (€ → $) da doğru çıkar. Hedefin kuru
            // yoksa TL'de kalınır ve söylenir.
            const PB_SIMGE = { TRY: "₺", USD: "$", EUR: "€", GBP: "£" };
            const istenenPb = product.maliyetBirimi || "TRY";
            const hedefKur = istenenPb === "TRY" ? 1 : parseFloat((kurlar || {})[istenenPb]) || 0;
            const hedefPb = hedefKur > 0 ? istenenPb : "TRY";
            const hedefe = (tl) => (hedefPb === "TRY" ? tl : tl / hedefKur);
            const para = (v, pb) => `${(Math.round((v || 0) * 100) / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${PB_SIMGE[pb] || pb}`;
            const hedefYaz = (tl) => para(hedefe(tl), hedefPb);
            // DÜZENLENEBİLİR MALİYET (kullanıcı, 21 Eylül: "maliyet tarafında birim fiyatlar
            // değiştirilebilir olsun, işçilikler ve genel giderler dahil"). Kutu gösterilen birimde
            // (hedef) yazılır, kayıt TL olarak; yuvarlama iki ondalık.
            const tlye = (v) => (hedefPb === "TRY" ? v : v * hedefKur);
            const sayiKutusu = (deger, kaydet, isaret, genislik = 78) => (
              <input type="number" min="0" step="any" key={`${isaret}-${deger}`} defaultValue={Math.round((deger || 0) * 100) / 100}
                data-maliyet-duzenle={isaret}
                onBlur={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v) && Math.abs(v - (deger || 0)) > 0.0001) kaydet(v); }}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                style={{ width: genislik, padding: "2px 6px", fontSize: 12, textAlign: "right", fontWeight: 700,
                  border: "1px solid var(--erp-border)", borderRadius: "var(--erp-r-sm)", background: "#fff" }} />
            );
            // Hammadde birim fiyatını KAYNAĞINA yaz: boy/renk kuralından geldiyse o kurala, yoksa karta.
            const birimFiyatKaydet = (d, yeni) => {
              const hm = (tumUrunler || []).find((u) => u.id === d.hammaddeId);
              if (!hm) return;
              const kurallar = hm.fiyatKurallari || [];
              const eslesen = (d.renk && d.boy && kurallar.find((k) => k.tip === "Alış" && k.kapsam === "renkBeden" && k.deger === `${d.renk}|${d.boy}`))
                || (d.boy && kurallar.find((k) => k.tip === "Alış" && k.kapsam === "beden" && k.deger === d.boy))
                || (d.renk && kurallar.find((k) => k.tip === "Alış" && k.kapsam === "renk" && k.deger === d.renk));
              if (d.kaynak !== "Kart" && eslesen) {
                onUrunGuncelle(hm.id, { fiyatKurallari: kurallar.map((k) => (k.id === eslesen.id ? { ...k, fiyat: yeni } : k)) });
              } else {
                onUrunGuncelle(hm.id, { alisFiyati: yeni });
              }
            };
            // Para birimine göre dağılım
            const dagilim = {};
            maliyetDokumu.forEach((d) => {
              if (!dagilim[d.pb]) dagilim[d.pb] = { kendi: 0, tl: 0 };
              dagilim[d.pb].kendi += d.kendiTutar; dagilim[d.pb].tl += d.tl;
            });
            return (
              <div style={{ background: "#F0F5EE", border: "1px solid #8FA888", borderRadius: "var(--erp-r-md)", padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "var(--erp-primary)" }}>
                {/* Maliyet birimi seçici TOPLAM FİYATIN yanına taşındı (21 Eylül). */}
                {/* SATIR DÖKÜMÜ: kendi biriminde fiyat/tutar, TL, seçilen birim */}
                {maliyetDokumu.length > 0 && (
                  <div style={{ overflowX: "auto", marginBottom: 8 }}>
                    <table data-maliyet-dokumu="1" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, background: "#fff" }}>
                      <thead>
                        <tr style={{ background: "var(--erp-panel-2)" }}>
                          {["Hammadde", "Miktar", "Birim fiyat", "Tutar (kendi)", "TL", ...(hedefPb !== "TRY" ? [PB_SIMGE[hedefPb]] : [])].map((h, k) => (
                            <th key={h} style={{ padding: "5px 8px", textAlign: k === 0 ? "left" : "right", fontSize: 10,
                              letterSpacing: ".04em", textTransform: "uppercase", color: "var(--erp-text-2)",
                              borderBottom: "2px solid var(--erp-border)" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {maliyetDokumu.map((d, k) => (
                          <tr key={k} style={{ borderBottom: "1px solid var(--erp-border-2)" }}>
                            <td style={{ padding: "4px 8px", fontWeight: 700 }}>
                              {d.ad}{d.renk ? <span style={{ fontWeight: 400, color: "var(--erp-text-3)" }}> · {d.renk}</span> : null}
                              {d.boy ? <span data-maliyet-boy="1" style={{ fontWeight: 400, color: "var(--erp-text-3)" }}> · {d.boy}</span> : null}
                            </td>
                            <td className="mono" style={{ padding: "4px 8px", textAlign: "right" }}>
                              {(Math.round(d.miktar * 1000) / 1000).toLocaleString("tr-TR")} {d.birim}
                            </td>
                            <td className="mono" style={{ padding: "4px 8px", textAlign: "right", whiteSpace: "nowrap" }}>
                              {d.hammaddeId
                                ? <>{sayiKutusu(d.kendiFiyat, (v) => birimFiyatKaydet(d, v), `hm-${d.hammaddeId}-${d.renk}-${d.boy}`)} {PB_SIMGE[d.pb] || d.pb}</>
                                : para(d.kendiFiyat, d.pb)}
                              {d.kaynak && d.kaynak !== "Kart" && <div data-fiyat-kaynagi="1" style={{ fontSize: 9, color: "var(--erp-text-3)" }}>{d.kaynak.replace("Renk+Beden", "Renk+boy").replace("Beden", "Boy")} fiyatı</div>}
                            </td>
                            <td className="mono" style={{ padding: "4px 8px", textAlign: "right" }}>{para(d.kendiTutar, d.pb)}</td>
                            <td className="mono" style={{ padding: "4px 8px", textAlign: "right" }}>{para(d.tl, "TRY")}</td>
                            {hedefPb !== "TRY" && (
                              <td className="mono" style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700 }}>{para(hedefe(d.tl), hedefPb)}</td>
                            )}
                          </tr>
                        ))}
                        <tr style={{ background: "var(--erp-panel-2)", fontWeight: 700 }}>
                          <td style={{ padding: "5px 8px" }} colSpan={4}>Toplam</td>
                          <td className="mono" style={{ padding: "5px 8px", textAlign: "right" }}>{para(hammaddeToplami, "TRY")}</td>
                          {hedefPb !== "TRY" && (
                            <td className="mono" style={{ padding: "5px 8px", textAlign: "right" }}>{para(hedefe(hammaddeToplami), hedefPb)}</td>
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* PARA BİRİMİNE GÖRE DAĞILIM: maliyetin ne kadarı hangi kura bağlı */}
                {Object.keys(dagilim).length > 1 && (
                  <div data-maliyet-dagilim="1" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    {Object.entries(dagilim).sort((x, y) => y[1].tl - x[1].tl).map(([pb, v]) => (
                      <span key={pb} className="mono" style={{ fontSize: 12, background: "#fff", border: "1px solid var(--erp-border)",
                        borderRadius: "var(--erp-r-sm)", padding: "4px 10px" }}>
                        <b>{PB_SIMGE[pb] || pb}</b> {para(v.kendi, pb)}
                        {pb !== "TRY" && <span style={{ color: "var(--erp-text-2)" }}> = {para(v.tl, "TRY")}</span>}
                        <span style={{ color: "var(--erp-text-3)" }}> · %{hammaddeToplami > 0 ? Math.round((v.tl / hammaddeToplami) * 100) : 0}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* ESKİ YATAY ÖZET KALDIRILDI (21 Eylül): rakamlar tek sütunda, sağa yaslı — aşağıda. */}
                  {kuruEksikler.size > 0 && (
                    <span data-kur-eksik="1" style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-void)",
                      background: "var(--erp-void-tint)", padding: "4px 8px", borderRadius: "var(--erp-r-sm)" }}>
                      {[...kuruEksikler].join(", ")} kuru girilmemiş — bu birimdeki fiyatlar çevrilmeden sayıldı,
                      maliyet eksik. üst şeritteki kur rozetinden girin.
                    </span>
                  )}

                {/* ÇİFT BAŞI GENEL GİDER + SATIŞ FİYATI (kullanıcı, 20 Eylül: "1 çift ürün için
                    çift başı genel gider, hammadde gideri, işçilik gideri ve kâr olarak satış
                    fiyatı çıkarabiliriz").
                    
                    Üretim maliyeti hammadde + işçiliktir; ama kira, elektrik, muhasebeci de o
                    çiftin üzerine biner. Genel gider defterindeki aylık toplam, aylık üretim
                    hedefine bölünerek çift başı yük bulunuyor (397-genel-gider ile AYNI hesap).
                    
                    MARJ ÜRÜNE ÖZEL: her modelin kârlılığı farklı olabilir; tek bir genel marj
                    dayatmak, pahalı modelde para kaybettirir. Girilmezse tanımlardaki varsayılan
                    kullanılıyor. */}
                {(() => {
                  const hedefAdet = parseFloat(tanimlarAylikUretimHedefi) || 0;
                  const aylikGenel = (tanimlarGenelGiderler || []).reduce((t, k) => t + (parseFloat(k.aylikTutar) || 0), 0);
                  // Ürüne özel çift başı genel gider (21 Eylül): maliyetten elle girilebilir; boşsa
                  // genel gider defteri ÷ aylık hedef.
                  const ozelGenel = product.genelGiderCiftBasi != null && product.genelGiderCiftBasi !== "" ? parseFloat(product.genelGiderCiftBasi) : null;
                  const ciftBasiGenel = ozelGenel != null && !Number.isNaN(ozelGenel) ? ozelGenel : (hedefAdet > 0 ? aylikGenel / hedefAdet : 0);
                  const tamMaliyet = genelToplam + ciftBasiGenel;
                  const marj = parseFloat(product.karMarji) != null && !Number.isNaN(parseFloat(product.karMarji))
                    ? parseFloat(product.karMarji) : 30;
                  const satisFiyati = tamMaliyet * (1 + marj / 100);
                  // Seçilen maliyet biriminde (21 Eylül).
                  const yaz = (v) => hedefYaz(v);
                  return (<>
                    {/* MALİYET ÖZETİ — TEK SÜTUN, SAĞA YASLI (kullanıcı, 21 Eylül: "fiyat
                        kalemlerini sağ tarafa at, kimi ortada kimi sağda olmasın: hammadde,
                        işçilik, genel gider, kâr, toplam fiyat; toplam fiyatın yakınına para
                        birimi tiplerini ekle"). Muhasebe fişi gibi: alt alta, rakamlar hizalı. */}
                    <div data-urun-maliyet="1" style={{ marginTop: 10, borderTop: "1px dashed #8FA888", paddingTop: 10,
                      display: "grid", gridTemplateColumns: "1fr auto", rowGap: 4, columnGap: 16, alignItems: "center",
                      maxWidth: 460, marginLeft: "auto", fontSize: 13 }}>
                      <span>Hammadde{receteVarRenk ? ` (${receteVarRenk})` : ""}</span>
                      <span className="mono" data-ozet-hammadde="1" style={{ textAlign: "right", fontWeight: 700 }}>{yaz(hammaddeToplami)}</span>
                      {/* İŞÇİLİK DETAYLI (kullanıcı, 21 Eylül: "işçilik fiyatları da detaylı şekilde
                          yazsın"): her proses ayrı satır, ara prosesler ayrı, altta toplam. */}
                      {Object.entries(product.prosesUcretleri || {}).filter(([, u]) => (u || 0) > 0).map(([pAd, u]) => (
                        <React.Fragment key={`isc-${pAd}`}>
                          <span style={{ fontSize: 12, color: "var(--erp-text-2)", paddingLeft: 12 }}>İşçilik · {pAd}</span>
                          <span className="mono" data-ozet-iscilik-satir={pAd} style={{ textAlign: "right", fontSize: 12, color: "var(--erp-text-2)", whiteSpace: "nowrap" }}>
                            {sayiKutusu(hedefe(u || 0), (v) => onUrunGuncelle(product.id, { prosesUcretleri: { ...(product.prosesUcretleri || {}), [pAd]: Math.round(tlye(v) * 100) / 100 } }), `isc-${pAd}`, 70)} {PB_SIMGE[hedefPb]}
                          </span>
                        </React.Fragment>
                      ))}
                      {Object.entries(product.araProsesEklentileri || {}).filter(([, apId]) => apId).map(([anaProses, apId]) => {
                        const ozel = (product.araProsesUcretleri || {})[apId];
                        const tanimli = (tanimlarAraProsesler || []).find((ap) => ap.id === apId);
                        const ucret = ozel != null ? ozel : (tanimli ? (tanimli.ucret || 0) : 0);
                        if (!(ucret > 0)) return null;
                        return (
                          <React.Fragment key={`ara-${apId}`}>
                            <span style={{ fontSize: 12, color: "var(--erp-text-2)", paddingLeft: 12 }}>İşçilik · {tanimli ? tanimli.ad : "ara proses"} <span style={{ fontSize: 10 }}>({anaProses} sonrası)</span></span>
                            <span className="mono" style={{ textAlign: "right", fontSize: 12, color: "var(--erp-text-2)" }}>{yaz(ucret)}</span>
                          </React.Fragment>
                        );
                      })}
                      <span>İşçilik toplamı</span>
                      <span className="mono" data-ozet-iscilik="1" style={{ textAlign: "right", fontWeight: 700 }}>{yaz(isciligToplami)}</span>
                      <span>
                        Genel gider (çift başı)
                        {hedefAdet > 0
                          ? <span style={{ fontSize: 10, color: "var(--erp-text-2)" }}> · {yaz(aylikGenel)} / {hedefAdet} çift</span>
                          : <span style={{ fontSize: 10, color: "var(--erp-warn)" }}> · hedef girilmemiş</span>}
                      </span>
                      <span className="mono" data-ozet-genel="1" style={{ textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {sayiKutusu(hedefe(ciftBasiGenel), (v) => onUrunGuncelle(product.id, { genelGiderCiftBasi: Math.round(tlye(v) * 100) / 100 }), "genel", 78)} {PB_SIMGE[hedefPb]}
                        {ozelGenel != null && (
                          <button type="button" data-genel-sifirla="1" title="Ürüne özel değeri kaldır, genel gider defterinden hesapla"
                            onClick={() => onUrunGuncelle(product.id, { genelGiderCiftBasi: null })}
                            style={{ marginLeft: 4, fontSize: 10, border: "none", background: "none", color: "var(--erp-info)", cursor: "pointer", textDecoration: "underline" }}>
                            ürüne özel · sıfırla
                          </button>
                        )}
                      </span>
                      <span style={{ borderTop: "1px solid var(--erp-border)", paddingTop: 4, fontWeight: 700 }}>Tam maliyet</span>
                      <span className="mono" data-ozet-tam="1" style={{ borderTop: "1px solid var(--erp-border)", paddingTop: 4, textAlign: "right", fontWeight: 700 }}>{yaz(tamMaliyet)}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        Kâr
                        <input type="number" min="0" step="any" data-kar-marji="1"
                          defaultValue={product.karMarji != null ? product.karMarji : 30}
                          onBlur={(e) => onUrunGuncelle(product.id, { karMarji: parseFloat(e.target.value) || 0 })}
                          style={{ width: 56, padding: "2px 6px", border: "1px solid var(--erp-border)", borderRadius: "var(--erp-r-sm)",
                            fontSize: 12, textAlign: "right", fontWeight: 700 }} />
                        <span style={{ fontSize: 11, color: "var(--erp-text-2)" }}>%</span>
                      </span>
                      <span className="mono" data-ozet-kar="1" style={{ textAlign: "right", fontWeight: 700, color: "var(--erp-ok)" }}>{yaz(satisFiyati - tamMaliyet)}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderTop: "2px solid var(--erp-text)", paddingTop: 6, fontSize: 14, fontWeight: 700 }}>
                        Toplam fiyat
                        {/* PARA BİRİMİ TİPLERİ toplam fiyatın yanında */}
                        <span style={{ display: "inline-flex", gap: 3 }}>
                          {["TRY", "USD", "EUR"].map((pb) => (
                            <button key={pb} type="button" data-maliyet-birimi-alt={pb}
                              disabled={pb !== "TRY" && !(parseFloat((kurlar || {})[pb]) > 0)}
                              onClick={() => onUrunGuncelle(product.id, { maliyetBirimi: pb })}
                              style={{ padding: "1px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer", borderRadius: "var(--erp-r-pill)",
                                border: `1px solid ${hedefPb === pb ? "var(--erp-primary)" : "var(--erp-border)"}`,
                                background: hedefPb === pb ? "var(--erp-primary)" : "#fff", color: hedefPb === pb ? "#fff" : "var(--erp-text-2)" }}>
                              {PB_SIMGE[pb]}
                            </button>
                          ))}
                        </span>
                      </span>
                      <span className="mono" data-ozet-toplam="1" style={{ borderTop: "2px solid var(--erp-text)", paddingTop: 6, textAlign: "right", fontSize: 16, fontWeight: 700, color: "var(--erp-info)" }}>{yaz(satisFiyati)}</span>
                    </div>
                    {/* FİYAT GRUPLARI (kullanıcı, 21 Eylül: "altta eklemek istediğimiz fiyat
                        gruplarını seçip girelim"). Tüm gruplar otomatik listelenmiyor: kullanıcı
                        grubu SEÇER, fiyat öneriyle dolu gelir, ister düzeltir, Ekle der. Kayıtlı
                        olanlar listede durur; oradan da güncellenir/silinir. */}
                    {(() => {
                      const satisGruplari = (tanimlarFiyatGruplari || []).filter((g) => g.tip === "Satış");
                      const kurTL = (pb) => (pb === "TRY" ? 1 : parseFloat((kurlar || {})[pb]) || 0);
                      const grupKurallari = (product.fiyatKurallari || []).filter((k) => k.tip === "Satış" && k.kapsam === "fiyatGrubu" && !k.renk && !k.beden);
                      const secim = fgSecim || "";
                      const secilenGrup = satisGruplari.find((g) => g.id === secim);
                      const secilenPb = secim === "__genel" ? hedefPb : (secilenGrup ? (secilenGrup.paraBirimi || "TRY") : "TRY");
                      const oneriHesapla = (pb) => { const k = kurTL(pb); return k > 0 ? Math.round((satisFiyati / k) * 100) / 100 : 0; };
                      const kaydet = (hedefKey, pb, fiyat) => {
                        if (!(fiyat > 0)) return;
                        const yuvarli = Math.round(fiyat * 100) / 100;
                        if (hedefKey === "__genel") {
                          onUrunGuncelle(product.id, { satisFiyati: yuvarli, satisParaBirimi: pb === "TRY" ? "₺" : pb === "USD" ? "$" : "€" });
                          return;
                        }
                        const grup = satisGruplari.find((g) => g.id === hedefKey);
                        const mevcutK = product.fiyatKurallari || [];
                        const eski = grupKurallari.find((k) => k.deger === hedefKey);
                        const yeniK = { id: eski ? eski.id : uid("fkural"), kapsam: "fiyatGrubu", deger: hedefKey, tip: "Satış",
                          fiyat: yuvarli, paraBirimi: pb, etiket: grup ? grup.ad : hedefKey, renk: null, beden: null, kaynak: "maliyet" };
                        const log = { id: uid("flog"), tarih: new Date().toISOString(), tip: "Satış", etiket: `${yeniK.etiket} (maliyetten)`,
                          eskiFiyat: eski ? eski.fiyat : null, yeniFiyat: yuvarli };
                        onUrunGuncelle(product.id, {
                          fiyatKurallari: eski ? mevcutK.map((k) => (k.id === eski.id ? yeniK : k)) : [...mevcutK, yeniK],
                          fiyatGecmisi: [log, ...(product.fiyatGecmisi || [])].slice(0, HAREKET_GECMIS_SINIRI),
                        });
                        setFgSecim(""); setFgFiyat("");
                      };
                      return (
                        <div data-fiyat-olustur="1" style={{ marginTop: 12, borderTop: "1px solid var(--erp-border)", paddingTop: 10 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Fiyat grupları</div>
                          {/* Ekleme satırı: grup seç → öneri dolu → düzelt → Ekle */}
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                            <select value={secim} data-fg-sec="1"
                              onChange={(e) => {
                                const v = e.target.value; setFgSecim(v);
                                const pb = v === "__genel" ? hedefPb : ((satisGruplari.find((g) => g.id === v) || {}).paraBirimi || "TRY");
                                setFgFiyat(v ? String(oneriHesapla(pb)) : "");
                              }}
                              style={{ padding: "5px 8px", fontSize: 13, border: "1px solid var(--erp-border)", borderRadius: "var(--erp-r-sm)", minWidth: 180 }}>
                              <option value="">— fiyat grubu seçin —</option>
                              <option value="__genel">Genel (grubu olmayan cariler)</option>
                              {satisGruplari.map((g) => <option key={g.id} value={g.id}>{g.ad} · {PB_SIMGE[g.paraBirimi || "TRY"]}</option>)}
                            </select>
                            {secim && (
                              <>
                                <input type="number" min="0" step="any" value={fgFiyat} data-fg-fiyat="1"
                                  onChange={(e) => setFgFiyat(e.target.value)}
                                  style={{ width: 110, padding: "5px 8px", fontSize: 13, textAlign: "right", fontWeight: 700,
                                    border: "1px solid var(--erp-border)", borderRadius: "var(--erp-r-sm)" }} />
                                <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{PB_SIMGE[secilenPb]}</span>
                                <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>öneri {para(oneriHesapla(secilenPb), secilenPb)}</span>
                                <button type="button" className="btn-primary" data-fg-ekle="1"
                                  onClick={() => kaydet(secim, secilenPb, parseFloat(fgFiyat))}
                                  style={{ padding: "5px 14px", fontSize: 13 }}>Ekle</button>
                              </>
                            )}
                            {satisGruplari.length === 0 && !secim && (
                              <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>
                                Grup yok — "Toptan USD" gibi gruplar Tanımlar › Fiyat Grupları'ndan eklenir.
                              </span>
                            )}
                          </div>
                          {/* Kayıtlı fiyatlar */}
                          {(() => {
                            const kayitli = [
                              ...(parseFloat(product.satisFiyati) > 0 ? [{ key: "__genel", ad: "Genel", pb: alisPbKodu({ alisParaBirimi: product.satisParaBirimi }), fiyat: parseFloat(product.satisFiyati) }] : []),
                              ...grupKurallari.map((k) => ({ key: k.deger, ad: (satisGruplari.find((g) => g.id === k.deger) || {}).ad || k.etiket || k.deger, pb: k.paraBirimi || "TRY", fiyat: k.fiyat, kuralId: k.id })),
                            ];
                            if (kayitli.length === 0) return <div style={{ fontSize: 11, color: "var(--erp-text-3)" }}>Henüz fiyat girilmedi.</div>;
                            return (
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, background: "#fff", maxWidth: 560 }}>
                                <tbody>
                                  {kayitli.map((r) => {
                                    const oneri = oneriHesapla(r.pb);
                                    const fark = oneri > 0 ? Math.round(((r.fiyat / oneri) - 1) * 100) : null;
                                    // Grubun para birimi sonradan değiştiyse kayıtlı fiyat eski birimde kalır — söylenmeli.
                                    const grupPb = r.key === "__genel" ? r.pb : ((satisGruplari.find((g) => g.id === r.key) || {}).paraBirimi || "TRY");
                                    const birimUyusmaz = grupPb !== r.pb;
                                    return (
                                      <tr key={r.key} data-fiyat-grubu-satir={r.key} style={{ borderBottom: "1px solid var(--erp-border-2)" }}>
                                        <td style={{ padding: "4px 8px", fontWeight: 700 }}>
                                          {r.ad}
                                          {birimUyusmaz && (
                                            <span data-birim-uyusmaz={r.key} style={{ fontSize: 10, marginLeft: 6, color: "var(--erp-void)", fontWeight: 700 }}>
                                              grup artık {PB_SIMGE[grupPb]} — fiyat {PB_SIMGE[r.pb]} ile kayıtlı, "Öneriye eşitle" ile yenileyin
                                            </span>
                                          )}
                                        </td>
                                        <td className="mono" data-grup-mevcut={r.key} style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700 }}>{para(r.fiyat, r.pb)}</td>
                                        <td className="mono" style={{ padding: "4px 8px", textAlign: "right", fontSize: 11, color: "var(--erp-text-3)" }}>öneri {para(oneri, r.pb)}</td>
                                        <td style={{ padding: "4px 8px", textAlign: "right", fontSize: 11, fontWeight: 700,
                                          color: fark == null || fark === 0 ? "var(--erp-text-3)" : fark < 0 ? "var(--erp-void)" : "var(--erp-ok)" }}>
                                          {fark == null ? "" : `${fark > 0 ? "+" : ""}%${fark}`}
                                        </td>
                                        <td style={{ padding: "4px 8px", textAlign: "right", whiteSpace: "nowrap" }}>
                                          <button type="button" className="btn-ghost" data-fiyat-uygula={r.key} title="Öneriye eşitle"
                                            onClick={() => kaydet(r.key, grupPb, oneriHesapla(grupPb))} style={{ fontSize: 11, padding: "2px 8px" }}>Öneriye eşitle</button>
                                          {r.kuralId && <SilOnayButonu onConfirm={() => fiyatKuraliSil(r.kuralId)} boyut={11} baslikNormal={`${r.ad} fiyatı silinsin mi?`} />}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            );
                          })()}
                          <div style={{ fontSize: 10, color: "var(--erp-text-3)", marginTop: 4 }}>
                            Kırmızı: kayıtlı fiyat önerinin altında. Gruba atanmış cariye kesilen fişte fiyat kendiliğinden gelir; farklı para biriminde çalışan cariye kurla çevrilir.
                          </div>
                        </div>
                      );
                    })()}
                  </>);
                })()}
              </div>
            );
          })()}
        </div>
      )}
        </div>
      )}

      {cardTab === "kodlar" && (() => {
        // BU ÜRÜNE UYGULANAN alanlar: genel + kendi tipi. Başka tipin alanı burada çıkmıyor —
        // taban stoğunun alanları deride görünseydi, ekran doldurulamayacak kutularla dolardı.
        const alanlar = urunOzelKodAlanlari(product, tanimlarOzelKodAlanlari);
        const tipMetni = product.malzemeTipi || product.mamulTipi || "";
        // YENİ ALANIN KAPSAMI ÜRÜNÜN KENDİ TİPİNDEN geliyor: burada açılan bir alan "bu ürüne
        // benzeyenlere" ait olmalı. Tipi olmayan üründe alan GENEL açılıyor.
        const kapsamTuru = product.kategori === "Mamul" ? "mamul" : "malzeme";
        const kapsamAd = product.kategori === "Mamul" ? (product.mamulTipi || "") : (product.malzemeTipi || "");
        const eklenecekKapsam = kapsamAd ? kapsamTuru : "genel";
        return (
        <div style={{ border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)" }}>Özel Kodlar</span>
            <span style={{ fontSize: 11, color: "var(--erp-text-2)" }}>
              {tipMetni ? `Genel alanlar + "${tipMetni}" tipine özel alanlar` : "Genel alanlar"}
            </span>
            {/* YERİNDE ALAN AÇMA — stok açılış formunda vardı, kartta yoktu (7l'de açık bırakılmıştı).
                Aynı işi iki ekrandan birinde yapabilmek, "hangi ekranda ne yapabiliyorum" diye
                hatırlamayı gerektiriyordu. */}
            {yeniKodAlaniGiris ? (
              <span style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                <input
                  autoFocus
                  value={yeniKodAlaniAdi}
                  onChange={(e) => setYeniKodAlaniAdi(e.target.value)}
                  placeholder="Örn. Taban"
                  style={{ ...inputStyle, width: 150, padding: "5px 8px", fontSize: 12 }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: "5px 8px" }}
                  onClick={() => {
                    const ad = yeniKodAlaniAdi.trim();
                    if (!ad) return;
                    const id = onYeniOzelKodAlani && onYeniOzelKodAlani(ad, eklenecekKapsam, kapsamAd);
                    if (!id) { showToast("Alan eklenemedi"); return; }
                    setYeniKodAlaniGiris(false);
                    setYeniKodAlaniAdi("");
                    showToast(eklenecekKapsam === "genel"
                      ? `"${ad}" genel alan olarak eklendi — her üründe görünür`
                      : `"${ad}" yalnız "${kapsamAd}" tipinde görünür`);
                  }}
                >
                  <Check size={13} />
                </button>
                <button type="button" className="btn-ghost" style={{ padding: "5px 8px" }} onClick={() => { setYeniKodAlaniGiris(false); setYeniKodAlaniAdi(""); }}>
                  <X size={13} />
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setYeniKodAlaniGiris(true)}
                className="btn-ghost"
                style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 12, fontWeight: 600, color: "var(--erp-info)", display: "flex", alignItems: "center", gap: 4 }}
                title={kapsamAd
                  ? `Yeni alan "${kapsamAd}" tipine ait olur`
                  : "Bu ürünün tipi yok — yeni alan GENEL olur, her üründe görünür"}
              >
                <Plus size={13} /> Alan Ekle
              </button>
            )}
          </div>
          {alanlar.length === 0 && !yeniKodAlaniGiris && (
            <div style={{ fontSize: 12, color: "var(--erp-text-3)", marginBottom: 6 }}>
              {kapsamAd
                ? `"${kapsamAd}" tipine ve genele tanımlı alan yok.`
                : "Henüz alan yok."}
            </div>
          )}
          {/* Değerler yalnız DÜZENLEME modunda yazılıyor; alan EKLEME her zaman açık, çünkü bu bir
              TANIM değişikliği, ürünün kendi kaydı değil. */}
          {alanlar.length > 0 && !showEdit && (
            <div style={{ fontSize: 11, color: "var(--erp-text-3)", marginBottom: 6 }}>
              Değer girmek için üstteki Düzenle'yi kullanın.
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
            {alanlar.map((alan) => (
              <label key={alan.id} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 13, color: "var(--erp-text-2)", fontWeight: 600 }}>
                  {alan.ad}
                  {/* Genel mi tipe özel mi — aynı adlı iki alan olabileceği için ayırt edilebilsin. */}
                  {(alan.kapsamTuru || "genel") !== "genel" && (
                    <span className="mono" style={{ fontSize: 9, marginLeft: 5, color: "var(--erp-text-3)" }}>{alan.kapsamAd}</span>
                  )}
                </span>
                {showEdit ? (
                  <AramaliMetin
                    veriAdi="data-ozel-kod-arama"
                    deger={(editForm.ozelKodlar || {})[alan.id] || ""}
                    onDegis={(v) => setEditForm((f) => ({
                      ...f,
                      // Değer ALAN KİMLİĞİNE yazılıyor. Sıraya yazılsaydı, ürünün tipi
                      // değiştiğinde alan listesi de değişeceği için değer başka bir alanda
                      // görünürdü — sessiz ve fark edilmesi zor bir bozulma.
                      ozelKodlar: { ...(f.ozelKodlar || {}), [alan.id]: v },
                    }))}
                    // Öneriler: bu alana DİĞER ürünlerde girilmiş değerler (25 Eylül).
                    oneriler={(tumUrunler || []).filter((u) => u.id !== product.id).map((u) => (u.ozelKodlar || {})[alan.id])}
                    placeholder="Yazın ya da seçin…"
                    stil={{ fontSize: 12, padding: "6px 8px" }}
                  />
                ) : (
                  <span style={{ fontSize: 12, color: "var(--erp-text)", fontWeight: 600, padding: "6px 0" }}>
                    {(product.ozelKodlar || {})[alan.id] || "—"}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
        );
      })()}

      {cardTab === "kullanim" && (() => {
        // Bu hammaddeyi kullanan mamuller, reçete satırlarıyla birlikte.
        // Gruplama MAMUL bazında: "Astar Dana hangi modellerde kullanılıyor" sorusu ürün
        // seviyesinde sorulur, satır seviyesinde değil.
        const kullananlar = [];
        (tumUrunler || []).forEach((u) => {
          if (u.id === product.id) return;
          const satirlar = (u.recete || []).filter((r) => r.hammaddeUrunId === product.id);
          if (satirlar.length === 0) return;

          // Aynı mamulde aynı hammadde birden çok kez geçebilir (farklı proses, farklı renk).
          // Renk×beden kombinasyonlarını tek tek listelemek yerine ÖZET veriliyor: kaç model
          // rengi, hangi prosesler, çift başına ne kadar.
          const prosesler = Array.from(new Set(satirlar.map((r) => r.proses || "—")));
          const mamulRenkler = Array.from(new Set(satirlar.map((r) => r.mamulRenk)));
          const miktarlar = Array.from(new Set(satirlar.map((r) => r.miktar)));
          kullananlar.push({
            urun: u, satirSayisi: satirlar.length, prosesler, mamulRenkler,
            miktarMetni: miktarlar.length === 1
              ? `${miktarlar[0]} ${hammaddeBirimi(product.id, tumUrunler, product.birim)}`
              : `${Math.min(...miktarlar)}–${Math.max(...miktarlar)} ${hammaddeBirimi(product.id, tumUrunler, product.birim)}`,
          });
        });
        kullananlar.sort((a, b) => a.urun.ad.localeCompare(b.urun.ad, "tr"));

        return (
          <div>
            <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 12px", lineHeight: 1.6 }}>
              <b>{product.ad}</b> bu ürünlerin reçetesinde kullanılıyor. Hammaddeyi pasife almadan ya da
              birimini değiştirmeden önce buraya bakın — değişiklik hepsini etkiler.
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {kullananlar.map((k) => (
                <button
                  key={k.urun.id}
                  type="button"
                  onClick={() => onKullanilanUrunAc && onKullanilanUrunAc(k.urun.id)}
                  title="Bu ürünün reçetesini aç"
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                    background: "#fff", border: "1px solid var(--erp-line-soft)", borderLeft: `4px solid ${CAT_COLORS[k.urun.kategori] || "var(--erp-text-3)"}`,
                    borderRadius: "var(--erp-r-md)", padding: 10, cursor: "pointer",
                  }}
                >
                  <ColorSwatch src={k.urun.kapakResmi} editable={false} size={34} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--erp-text)" }}>{k.urun.ad}</span>
                      <KategoriIkonu kategori={k.urun.kategori} size={13} />
                    </span>
                    <span style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
                      {k.prosesler.map((pr) => (
                        <span key={pr} className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--erp-panel-2)", background: prosesRengi(pr), padding: "2px 8px", borderRadius: "var(--erp-r-pill)" }}>
                          <ProsesIkonu proses={pr} tanimlarProsesler={tanimlarProsesler} size={11} />
                          {pr}
                        </span>
                      ))}
                      <span className="mono" style={{ fontSize: 13, color: "var(--erp-text-2)" }}>
                        {k.mamulRenkler.length} renk · çift başına {k.miktarMetni}
                      </span>
                    </span>
                  </span>
                  <ChevronRight size={18} color="var(--erp-text-3)" />
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* BARKODLAR SEKMESİ.
          Kullanıcı: "Stok barkodlarını stok içinde görebileceğimiz sekme yapalım."
          Kodlar varyantların üstünde saklanıyor ama yalnızca etiket basarken görülüyordu.
          Burada renk · beden · kod olarak listeleniyor; koda bakıp "bu hangi ürün" sorusunu
          tersinden cevaplamak da mümkün oluyor. */}
      {cardTab === "teknik" && (
        <div data-teknik-cizim="1" style={{ display: "grid", gap: 14 }}>
          <div style={{ fontSize: 12, color: "var(--erp-text-2)", lineHeight: 1.5 }}>
            Üretimin bu modeli nasıl yapacağını anlatan teknik çizimler ve ölçüler. Kalıpçıya,
            sayacıya ve montaja aynı bilgiyi vermek için; iş emrine de basılabilir.
          </div>

          {/* ÇİZİMLER — birden çok görsel: kalıp, sayada dikiş yerleri, taban ölçüsü… */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Çizimler</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
              {(product.teknikCizimler || []).map((c, i) => (
                <div key={c.id || i} data-teknik-gorsel={c.id || i}
                  style={{ width: 150, border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", overflow: "hidden", background: "#fff" }}>
                  <img src={c.gorsel} alt={c.baslik || "teknik çizim"}
                    onClick={() => onTeknikCizimAc && onTeknikCizimAc(c)}
                    title="Büyütmek için dokunun"
                    style={{ width: "100%", height: 110, objectFit: "contain", background: "var(--erp-panel)", cursor: "zoom-in", display: "block" }} />
                  <div style={{ padding: "6px 8px", display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      value={c.baslik || ""}
                      data-teknik-baslik={c.id || i}
                      placeholder="Başlık (örn. Kalıp)"
                      onChange={(e) => onTeknikCizimGuncelle(product.id, c.id, { baslik: e.target.value })}
                      style={{ flex: 1, minWidth: 0, border: "none", borderBottom: "1px solid var(--erp-line-soft)", fontSize: 11, padding: "2px 0", background: "transparent" }} />
                    <SilOnayButonu onConfirm={() => onTeknikCizimSil(product.id, c.id)} boyut={11} />
                  </div>
                </div>
              ))}
              {/* Yeni çizim: ColorSwatch zaten galeri/kamera/URL üçlüsünü taşıyor — ayrı bir
                  yükleyici yazmak aynı işi ikinci kez yapmak olurdu. */}
              <div style={{ width: 150 }}>
                <ColorSwatch
                  src=""
                  onUrlSave={(url) => onTeknikCizimEkle(product.id, url)}
                  size={110}
                  baslik="Çizim ekle"
                />
              </div>
            </div>
          </div>

          {/* ÖLÇÜ VE MALZEME NOTLARI — serbest metin; yapı netleşince alanlara bölünecek. */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Teknik detaylar</div>
            <textarea
              value={product.teknikNot || ""}
              data-teknik-not="1"
              onChange={(e) => onTeknikNotChange(product.id, e.target.value)}
              placeholder={"Örn.\n• Taban: 4 mm kauçuk, 38 numara kalıp 265 mm\n• Saya dikişi: 3 mm, çift iğne\n• Astar: deri, jarse takviyeli\n• Kalıp notu: 41 numaradan sonra genişlik +2 mm"}
              rows={8}
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 13, lineHeight: 1.6,
                border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", background: "#fff", fontFamily: "inherit", resize: "vertical" }} />
            <div style={{ fontSize: 11, color: "var(--erp-text-3)", marginTop: 4 }}>
              Yazdıkça kaydedilir. Alan yapısı (taban, saya, astar, kalıp…) netleştiğinde ayrı
              kutulara bölünecek — şimdilik serbest yazın.
            </div>
          </div>
        </div>
      )}

      {cardTab === "barkodlar" && (
        <div style={{ display: "grid", gap: 8 }}>
          {/* BARKOD ŞEMASI. Kod SAKLANMIYOR, üç KALICI koddan kuruluyor:
                90 + stok no(4) + renk kodu(4) + [ölçü kodu(2) | asorti kodu(3)]
              Kodlar bir kez atanır ve ürünün/rengin ADI değişse bile değişmez — basılmış etiket
              geçerli kalsın diye. Kullanıcı kodları görür ama değiştiremez. */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12, color: "var(--erp-text-2)" }}>
            <span>Şema: <b className="mono">90 · stok no · renk kodu · ölçü kodu / asorti kodu</b></span>
            <span className="mono" style={{
              background: product.stokNo ? "#EEF4F8" : "var(--erp-hover)", border: "1px solid var(--erp-line)",
              borderRadius: "var(--erp-r-sm)", padding: "1px 6px", fontWeight: 700,
              color: product.stokNo ? "var(--erp-info)" : "var(--erp-warn)",
            }}>
              {product.stokNo ? `stok no ${String(product.stokNo).padStart(4, "0")}` : "stok no atanmamış"}
            </span>
            <span>Kodlar bir kez atanır, ad değişse de değişmez.</span>
          </div>

          {/* SADECE STOK seviyesi — renksiz/bedensiz, ürünün kendi kodu. Depoda model bazında
              okutmak için. */}
          {product.stokNo ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <span style={{ color: "var(--erp-text-2)" }}>Ürün barkodu (renksiz):</span>
              <span className="mono" style={{ fontWeight: 700, color: "var(--erp-text)" }}>
                {urunBarkoduKur("stok", { stokNo: product.stokNo })}
              </span>
              <button
                className="btn-ikon"
                title="Ürün barkodunu bas (6×4 cm)"
                onClick={() => etiketYazdir([`
                  <div style="font-size:12px;font-weight:700">${product.ad}</div>
                  ${barkodSvg(urunBarkoduKur("stok", { stokNo: product.stokNo }), { birim: 2, yukseklik: 30 })}
                `], { genislikMM: 60, yukseklikMM: 40 })}
              >
                <Printer size={12} />
              </button>
            </div>
          ) : null}

          {/* ASORTİ BARKODLARI — her renk × asorti için bir kod. Sipariş ekranında okutulunca
              asortinin beden dağılımı kalem olarak ekleniyor. */}
          {(asortiler || []).length > 0 && (
            <div style={{ border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", background: "var(--erp-panel)", padding: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)", marginBottom: 6 }}>
                Asorti barkodları — sipariş ekranında okutulur
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                {Array.from(new Set((product.variants || []).map((v) => v.renk))).map((renk) => {
                  const ilk = (product.variants || []).find((v) => v.renk === renk);
                  const renkKod = renkKoduBul(barkodTanimlari, ilk && ilk.renkId, renk);
                  // renkKod SIFIR olabilir ("Standart" için ayrılmış kod) — doğrusu null kontrolü.
                  if (!product.stokNo || renkKod === null) return (
                    <div key={renk} style={{ fontSize: 11, color: "var(--erp-warn)" }}>
                      {renk}: {!product.stokNo ? "önce stok no atanmalı" : "bu renge renk kodu atanmamış"} (Paketleme → Eksik kodları ata)
                    </div>
                  );
                  return (asortiler || []).map((a) => {
                    const kod = urunBarkoduKur("asorti", { stokNo: product.stokNo, renkKod, asortiKod: a.barkodKodu });
                    const adet = (a.oranlar || []).reduce((t, o) => t + (o.oran || 0), 0);
                    if (!kod) return (
                      <div key={`${renk}|${a.id}`} style={{ fontSize: 11, color: "var(--erp-warn)" }}>
                        {renk} · {a.ad}: asorti kodu atanmamış
                      </div>
                    );
                    return (
                      <div key={`${renk}|${a.id}`} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
                        <span className="mono" style={{ fontWeight: 700, color: "var(--erp-text-2)", minWidth: 90 }}>{renk}</span>
                        <span>{a.ad}</span>
                        <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{adet} çift</span>
                        <span className="mono" style={{ fontSize: 11, color: "var(--erp-info)", background: "#fff", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", padding: "1px 6px" }}>{kod}</span>
                        <button
                          className="btn-ikon"
                          title="Bu asortinin barkod etiketini bas (6×4 cm)"
                          onClick={() => etiketYazdir([`
                            <div style="font-size:12px;font-weight:700">${product.ad}</div>
                            <div style="font-size:11px">${renk} · ${a.ad}</div>
                            ${barkodSvg(kod, { birim: 1, yukseklik: 28 })}
                            <div style="font-size:10px">${(a.oranlar || []).map((o) => `${o.beden}:${o.oran}`).join("  ")}</div>
                            <div style="font-size:11px;font-weight:700">${adet} çift</div>
                          `], { genislikMM: 60, yukseklikMM: 40 })}
                        >
                          <Printer size={12} />
                        </button>
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          )}

          {/* TOPLU BASIM ŞERİDİ: seçim varken görünür. Kopya sayısı depoda işe yarıyor — aynı
              bedenden birden çok kutuya etiket gerekir; her seferinde yeniden seçmek yerine
              bir kez seçip kopya vermek. */}
          {seciliEtiketler.length > 0 && (
            <div data-etiket-serit="1" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
              padding: "6px 10px", marginBottom: 6, background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)" }}>
              <b style={{ fontSize: 12 }}>{seciliEtiketler.length} satır seçili</b>
              <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                Kopya
                <input
                  type="number" min="1" max="20" value={etiketKopya}
                  data-etiket-kopya="1"
                  onChange={(e) => setEtiketKopya(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  style={{ width: 56, padding: "3px 6px" }}
                />
              </label>
              <button
                type="button" className="btn-primary" data-etiket-toplu-bas="1"
                style={{ padding: "4px 12px", fontSize: 12 }}
                onClick={() => bedenEtiketiBas(
                  barkodluVaryantlar.filter((v) => seciliEtiketler.includes(etiketKimlik(v))), etiketKopya)}
              >
                <Printer size={12} /> Seçilenleri bas ({seciliEtiketler.length * etiketKopya} etiket)
              </button>
              <button type="button" className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}
                onClick={() => setSeciliEtiketler([])}>Seçimi temizle</button>
            </div>
          )}

          {(product.variants || []).length === 0 ? (
            <EmptyState mesaj="Bu üründe renk/beden yok." />
          ) : (
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr style={{ background: "var(--erp-panel)" }}>
                  {/* İki sütun da "KOD" yazıyordu; hangisinin hangi kod olduğu ancak sırasından
                      anlaşılıyordu. Kodun adı, kodun kendisi kadar önemli — barkodun hangi
                      parçasını doldurduğunu söyleyen tek şey bu. */}
                  <th style={{ fontSize: 10, textAlign: "center", padding: "5px 6px", width: 28 }}>
                    <input
                      type="checkbox"
                      data-etiket-tumu="1"
                      title="Barkodu olan bütün satırları seç"
                      checked={barkodluVaryantlar.length > 0 && seciliEtiketler.length === barkodluVaryantlar.length}
                      onChange={(e) => setSeciliEtiketler(e.target.checked ? barkodluVaryantlar.map(etiketKimlik) : [])}
                    />
                  </th>
                  <th style={{ fontSize: 10, textAlign: "left", padding: "5px 8px" }}>RENK</th>
                  <th style={{ fontSize: 10, textAlign: "left", padding: "5px 8px" }}>RENK KODU</th>
                  <th style={{ fontSize: 10, textAlign: "left", padding: "5px 8px" }}>ÖLÇÜ</th>
                  <th style={{ fontSize: 10, textAlign: "left", padding: "5px 8px" }}>ÖLÇÜ KODU</th>
                  <th style={{ fontSize: 10, textAlign: "left", padding: "5px 8px" }}>BARKOD</th>
                  <th style={{ fontSize: 10, textAlign: "right", padding: "5px 8px" }}>STOK</th>
                  <th style={{ fontSize: 10, textAlign: "center", padding: "5px 6px" }}>ETİKET</th>
                </tr>
              </thead>
              <tbody>
                {(product.variants || []).map((v, i) => {
                  const renkKod = renkKoduBul(barkodTanimlari, v.renkId, v.renk);
                  const olcuKod = bedenKoduBul(barkodTanimlari, v.beden, product.olcuTipi);
                  const kod = varyantinBarkodu(product, v, barkodTanimlari);
                  return (
                    <tr key={`${v.renk}|${v.beden}|${i}`} style={{ borderTop: "1px solid var(--erp-head)" }}>
                      <td style={{ padding: "5px 6px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          data-etiket-sec={etiketKimlik(v)}
                          disabled={!kod}
                          title={kod ? "Toplu basıma ekle" : "Barkod kurulamıyor — önce kodları atayın"}
                          checked={seciliEtiketler.includes(etiketKimlik(v))}
                          onChange={(e) => setSeciliEtiketler((o) => (e.target.checked
                            ? [...o, etiketKimlik(v)]
                            : o.filter((x) => x !== etiketKimlik(v))))}
                        />
                      </td>
                      <td style={{ padding: "5px 8px", fontSize: 12 }}>{v.renk}</td>
                      {/* KODLAR GÖRÜNÜR AMA DÜZENLENEMEZ (kullanıcı kararı): kodu elle değiştirmek,
                          basılmış etiketi bir anda yanlış mala bağlar. */}
                      <td className="mono" style={{ padding: "5px 8px", fontSize: 11, color: renkKod === null ? "var(--erp-warn)" : "var(--erp-text-3)" }}
                          title={renkKod === OLCUSUZ_KOD ? "Renksiz stok kartı — 0000 bunun için ayrılmış kod" : undefined}>
                        {renkKod === null ? "—" : String(renkKod).padStart(4, "0")}
                      </td>
                      <td className="mono" style={{ padding: "5px 8px", fontSize: 12 }}>{v.beden || "—"}</td>
                      <td className="mono" style={{ padding: "5px 8px", fontSize: 11, color: olcuKod === null ? "var(--erp-warn)" : "var(--erp-text-3)" }}
                          title={olcuKod === OLCUSUZ_KOD ? "Ölçüsüz stok kartı — 00 bunun için ayrılmış kod" : undefined}>
                        {olcuKod === null ? "—" : String(olcuKod).padStart(2, "0")}
                      </td>
                      <td className="mono" style={{ padding: "5px 8px", fontSize: 12, fontWeight: 700, color: kod ? "var(--erp-text)" : "var(--erp-warn)" }}>
                        {kod || "barkod kurulamıyor"}
                      </td>
                      <td className="mono" style={{ padding: "5px 8px", fontSize: 12, textAlign: "right" }}>{v.miktar || 0}</td>
                      <td style={{ padding: "5px 6px", textAlign: "center" }}>
                        <button
                          className="btn-ikon"
                          data-etiket-bas={etiketKimlik(v)}
                          disabled={!kod}
                          title={kod ? "Bu bedenin etiketini bas (6×4 cm)" : "Barkod kurulamıyor — önce kodları atayın"}
                          onClick={() => bedenEtiketiBas([v], 1)}
                        >
                          <Printer size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {cardTab === "hareketler" && (
        <div>
          {/* Açma/kapama düğmesi KALDIRILDI: sekmeye tıklamak zaten "hareketleri görmek istiyorum"
              demektir. Araya ikinci bir tıklama koymak, kartın en altındayken anlamlıydı —
              orada listeyi katlamak yer kazandırıyordu. Sekmede ise yalnızca engel. */}
          {(() => {
            const tumFisGruplari = hareketleriGrupla(product.hareketler || []);
            const mevcutKaynaklar = Array.from(new Set(tumFisGruplari.map((g) => g.kaynak)));
            const kaynakUygulanmis = hareketKaynakFiltre === "Tümü"
              ? tumFisGruplari
              : tumFisGruplari.filter((g) => g.kaynak === hareketKaynakFiltre);

            const esler = (metin, aranan) =>
              String(metin || "").toLocaleLowerCase("tr-TR").includes(aranan.toLocaleLowerCase("tr-TR"));

            const fisGruplari = kaynakUygulanmis.filter((g) => {
              if (hareketFiltre.fis.trim()) {
                // Fiş kutusu hem fiş numarasında hem sipariş numarasında arar — kullanıcı elindeki
                // numaranın hangisi olduğunu ayırt etmek zorunda kalmasın.
                if (!esler(g.fisNo, hareketFiltre.fis.trim()) && !esler(g.siparisNo, hareketFiltre.fis.trim())) return false;
              }
              if (hareketFiltre.tarih.trim()) {
                const gunMetni = g.tarih ? tarihYaz(g.tarih) : "";
                // Hem "15.08.2026" hem "2026-08-15" biçiminde arama yapılabilsin diye iki gösterim de taranır.
                if (!esler(gunMetni, hareketFiltre.tarih.trim()) && !esler(String(g.tarih).slice(0, 10), hareketFiltre.tarih.trim())) return false;
              }
              if (hareketFiltre.cari.trim()) {
                const unvan = g.cariId ? (((cariler || []).find((c) => c.id === g.cariId) || {}).unvan || "") : "";
                if (!esler(unvan, hareketFiltre.cari.trim())) return false;
              }
              return true;
            });

            // Dipnot: GÖRÜNEN fişlerin net etkisi. Giriş ve çıkış ayrı gösterilir; tek bir "net"
            // sayı, 100 giriş + 100 çıkışı sıfır göstererek hareketliliği gizlerdi.
            const gorunenHareketler = fisGruplari.flatMap((g) => g.hareketler);
            const toplamGiris = gorunenHareketler.filter((h) => h.miktar > 0).reduce((s, h) => s + h.miktar, 0);
            const toplamCikis = gorunenHareketler.filter((h) => h.miktar < 0).reduce((s, h) => s + Math.abs(h.miktar), 0);

            const hFiltreKutusu = (alan, ipucu) => (
              <input
                type="text"
                value={hareketFiltre[alan]}
                onChange={(e) => setHareketFiltre({ ...hareketFiltre, [alan]: e.target.value })}
                placeholder={ipucu}
                className="mono"
                style={{
                  padding: "4px 7px", fontSize: 13, minWidth: 110, flex: "1 1 110px", maxWidth: 190,
                  border: `1px solid ${hareketFiltre[alan].trim() ? "var(--erp-brown)" : "var(--erp-border-2)"}`,
                  background: hareketFiltre[alan].trim() ? "var(--erp-hover)" : "#fff",
                  borderRadius: "var(--erp-r-sm)", boxSizing: "border-box",
                }}
              />
            );

            return (
              <div style={{ marginTop: 8 }}>
                {/* ---- ALAN BAZLI FİLTRE ŞERİDİ ---- */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                  <Search size={13} color="var(--erp-text-3)" style={{ flexShrink: 0 }} />
                  {hFiltreKutusu("fis", "fiş / sipariş no…")}
                  {hFiltreKutusu("tarih", "tarih…")}
                  {hFiltreKutusu("cari", "cari…")}
                  {hareketFiltreAktif && (
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ fontSize: 12, padding: "4px 8px" }}
                      onClick={() => setHareketFiltre({ fis: "", tarih: "", cari: "" })}
                    >
                      <X size={12} /> Temizle
                    </button>
                  )}
                </div>

                {/* ---- SÜZÜLEN TOPLAM ---- */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", padding: "6px 10px", background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", marginBottom: 10 }}>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text-2)" }}>
                    {hareketFiltreAktif || hareketKaynakFiltre !== "Tümü" ? "SÜZÜLEN TOPLAM" : "TOPLAM"}
                  </span>
                  <span className="mono" style={{ fontSize: 13, color: "var(--erp-text-2)" }}>
                    {fisGruplari.length}
                    {(hareketFiltreAktif || hareketKaynakFiltre !== "Tümü") ? ` / ${tumFisGruplari.length}` : ""} fiş
                  </span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-primary)" }}>Giriş: +{Math.round(toplamGiris * 100) / 100}</span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-warn)" }}>Çıkış: −{Math.round(toplamCikis * 100) / 100}</span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)" }}>
                    Net: {Math.round((toplamGiris - toplamCikis) * 100) / 100}
                  </span>
                </div>
                {/* ---- DEFTER / BAKİYE DENETİMİ ----
                    Varyantlardaki miktar bir BAKİYE, hareketler ise DEFTERDİR. İkisi ayrı saklandığı
                    için birbirinden ayrışabilir:
                      · ürün ilk açılırken matrise girilen miktarlar hareket üretmez (açılış bakiyesi),
                      · bir hareket silindiğinde bakiye geri alınmayabilir,
                      · geçmişte hatalı yazılmış tüketimler düzeltilirken iz kalabilir.
                    Fark sessiz kaldığında hangisinin doğru olduğu anlaşılamıyor. Burada ikisi yan yana
                    gösterilir; fark varsa, bakiyeyi DEĞİŞTİRMEDEN eksik hareketi deftere yazan bir
                    düzeltme sunulur — muhasebede doğru olan, bakiyeyi silmek değil kaydı tamamlamaktır. */}
                {(() => {
                  // Denetim TÜM hareketler üzerinden yapılır; ekrandaki süzgeç yalnızca görünümü etkiler.
                  const defterNet = stokYuvarla(
                    (product.hareketler || []).reduce((s, h) => s + (h.miktar || 0), 0)
                  );
                  const bakiye = stokYuvarla(product.variants.reduce((s, v) => s + v.miktar, 0));
                  const fark = stokYuvarla(bakiye - defterNet);
                  if (Math.abs(fark) < 0.000001) return null;
                  return (
                    <div style={{ background: "var(--erp-hover)", border: "1.5px solid #C9A063", borderRadius: "var(--erp-r-md)", padding: 10, marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                        <AlertTriangle size={14} color="var(--erp-brown)" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-brown)" }}>
                          Kayıtlı stok ile hareket geçmişi tutmuyor
                        </span>
                      </div>
                      <div className="mono" style={{ fontSize: 13, color: "var(--erp-text)", display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 6 }}>
                        <span>Kayıtlı stok: <b>{bakiye}</b> {product.birim}</span>
                        <span>Hareket neti: <b>{defterNet}</b> {product.birim}</span>
                        <span style={{ color: "var(--erp-warn)" }}>Fark: <b>{fark > 0 ? "+" : ""}{fark}</b></span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--erp-text-2)", lineHeight: 1.6, marginBottom: 8 }}>
                        {fark > 0
                          ? "Kayıtlı stok, hareketlerin toplamından fazla. Ürün açılırken girilen başlangıç miktarı hareket üretmemiş olabilir; ya da bir çıkış hareketi silinmiş olabilir."
                          : "Kayıtlı stok, hareketlerin toplamından az. Bir giriş hareketi silinmiş ya da bakiye elle düşürülmüş olabilir."}
                      </div>
                      {onDefterDuzeltmeYaz && (
                        <button
                          className="btn-ghost"
                          style={{ padding: "5px 11px", fontSize: 13, borderColor: "var(--erp-brown)", color: "var(--erp-brown)" }}
                          title="Kayıtlı stoğu DEĞİŞTİRMEZ; farkı açıklayan bir hareket ekler, böylece defter ile bakiye eşitlenir"
                          onClick={() => onDefterDuzeltmeYaz(product.id)}
                        >
                          Farkı açılış hareketi olarak yaz
                        </button>
                      )}
                    </div>
                  );
                })()}

                {mevcutKaynaklar.length > 1 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                    {["Tümü", ...mevcutKaynaklar].map((k) => {
                      const aktif = hareketKaynakFiltre === k;
                      const renk = k === "Tümü" ? "var(--erp-text)" : (KAYNAK_RENK[k] || "var(--erp-text-2)");
                      const sayi = k === "Tümü" ? tumFisGruplari.length : tumFisGruplari.filter((g) => g.kaynak === k).length;
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setHareketKaynakFiltre(k)}
                          style={{
                            padding: "4px 10px", borderRadius: "var(--erp-r-pill)", fontSize: 13, fontWeight: 700, cursor: "pointer",
                            border: `1.5px solid ${aktif ? renk : "var(--erp-border)"}`,
                            background: aktif ? alfaEkle(renk, "1A") : "#fff",
                            color: aktif ? renk : "var(--erp-text-2)",
                          }}
                        >
                          {/* ETİKET YÖNE GÖRE.
                              "Üretimden Giriş" SABİT yazıyordu. Mamulde doğru (üretim biter, mal
                              stoğa girer) ama HAMMADDEDE tersi: malzeme üretime ÇIKAR. Kullanıcı
                              astar kartında "üretimden giriş yazıyor, aslında üretime çıkış
                              yapılmış" dedi — etiket hareketin yönüne bakmıyordu.
                              Kategoriye değil, hareketlerin İŞARETİNE bakılıyor: veri ne diyorsa o.
                              İkisi karışıksa yön iddia edilmiyor, sade "Üretim" yazılıyor. */}
                          {k === "Tümü" ? k : kaynakEtiketi(k, tumFisGruplari)} <span className="mono" style={{ fontWeight: 400 }}>({sayi})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div style={{ display: "grid", gap: 8 }}>
                {fisGruplari.length === 0 && (
                  <div style={{ padding: "14px 10px", textAlign: "center", fontSize: 12, color: "var(--erp-text-3)" }}>
                    Bu filtreyle eşleşen fiş yok.
                  </div>
                )}
                {fisGruplari.map((g) => {
                  const cariAdi = g.cariId ? ((cariler || []).find((c) => c.id === g.cariId) || {}).unvan : null;
                  const uretimKaynakli = g.kaynak === "Üretim";
                  const gRenkler = Array.from(new Set(g.hareketler.map((h) => h.renk)));
                  const gBedenler = Array.from(new Set(g.hareketler.map((h) => h.beden)));

                  // BİRİM FİYAT VE TUTAR CARİ TARAFINDAN OKUNUR.
                  // Stok hareketi fiyat taşımaz (miktar, renk, beden, kaynak). Aynı fiş numarasına
                  // yazılmış CARİ hareketi ise birim fiyatı, para birimini ve tutarı taşıyor —
                  // `fisYaz` ikisini aynı fiş numarasıyla ve aynı kimlikle yazdığı için eşleşme kesin.
                  // Fiyatı stok hareketine de kopyalamak, aynı bilgiyi iki yerde tutmak olurdu.
                  const fisFiyatlari = (() => {
                    if (!g.fisNo) return null;
                    const eslesen = [];
                    (cariler || []).forEach((c) => {
                      (c.hareketler || []).forEach((h) => {
                        if (h.fisNo !== g.fisNo || h.urunAd !== product.ad) return;
                        // Muhasebe defterinde aynı kalem Genel+Resmi olarak iki kez yazılır; tutarı
                        // çift saymamak için yalnızca Genel alınır.
                        if ((h.defter || "Genel") === "Resmi") return;
                        eslesen.push(h);
                      });
                    });
                    if (eslesen.length === 0) return null;
                    const fiyatlar = Array.from(new Set(eslesen.map((h) => h.birimFiyat).filter((f) => f != null)));
                    const pbler = Array.from(new Set(eslesen.map((h) => h.paraBirimi || "TRY")));
                    return {
                      hareketler: eslesen,
                      birimFiyat: fiyatlar.length === 1 ? fiyatlar[0] : null,
                      sembol: pbler.length === 1 ? (PARA_SEMBOLU[pbler[0]] || pbler[0]) : "",
                      tutar: stokYuvarla(eslesen.reduce((t, h) => t + (h.tutar || 0), 0)),
                      renkFiyati: (renk) => {
                        const alt = eslesen.filter((h) => h.renk === renk);
                        const f = Array.from(new Set(alt.map((h) => h.birimFiyat).filter((x) => x != null)));
                        return {
                          birimFiyat: f.length === 1 ? f[0] : null,
                          tutar: stokYuvarla(alt.reduce((t, h) => t + (h.tutar || 0), 0)),
                        };
                      },
                    };
                  })();
                  const gToplamAdet = stokYuvarla(g.hareketler.reduce((t, h) => t + (h.miktar || 0), 0));
                  // Fiş matrisi VARSAYILAN OLARAK AÇIK. Fişin tek bilgi taşıyan kısmı zaten bu
                  // matris (hangi renk/bedenden ne kadar); kapalıyken kullanıcı her fiş için
                  // ayrıca tıklamak zorunda kalıyor ve başlıkta yalnızca fiş no ile tarih görüyor.
                  // Tıklama artık KAPATMAK için: uzun listede istenmeyen fişler daraltılabilir.
                  const acik = !kapaliFisler.has(g.key);
                  return (
                    <div
                      key={g.key}
                      style={{
                        background: uretimKaynakli ? "#F0F5EE" : "#fff",
                        border: `1px solid ${uretimKaynakli ? "#8FA888" : "var(--erp-border-2)"}`,
                        borderRadius: "var(--erp-r-md)", overflow: "hidden",
                      }}
                    >
                      <div
                        // Tıklama yalnızca çok renkli fişte anlamlı; tek renklide açılacak içerik yok.
                        role={gRenkler.length > 1 ? "button" : undefined}
                        tabIndex={gRenkler.length > 1 ? 0 : undefined}
                        onClick={gRenkler.length > 1 ? () => fisKapatToggle(g.key) : undefined}
                        onKeyDown={(e) => { if (gRenkler.length > 1 && (e.key === "Enter" || e.key === " ")) fisKapatToggle(g.key); }}
                        style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "8px 10px", cursor: gRenkler.length > 1 ? "pointer" : "default" }}
                      >
                        {uretimKaynakli && <Hammer size={13} color="var(--erp-primary)" />}
                        {/* FİŞ NUMARASI TIKLANABİLİR (kullanıcı, 10 Eylül) — sipariş kartındaki
                            ile AYNI davranış. Stok hareketini görüp "bu hangi fişten geldi" diye
                            merak eden kullanıcı numarayı elle aramak zorunda kalmasın. */}
                        {g.fisNo && (onFiseGitNo ? (
                          <button
                            type="button"
                            className="mono"
                            onClick={(e) => { e.stopPropagation(); onFiseGitNo(g.fisNo); }}
                            title={`${g.fisNo} fişini Fişler ekranında aç`}
                            style={{
                              fontSize: 12, fontWeight: 700, background: "none", border: "none",
                              padding: 0, cursor: "pointer", color: "var(--erp-info)", textDecoration: "underline",
                            }}
                          >
                            {g.fisNo}
                          </button>
                        ) : (
                          <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{g.fisNo}</span>
                        ))}
                        <span aria-hidden="true" style={{ color: "var(--erp-border)" }}>·</span>
                        <span className="mono" style={{ fontSize: 12, color: "var(--erp-text-2)" }}>
                          {tarihYaz(g.tarih)}
                        </span>
                        <span
                          className="mono"
                          style={{
                            fontSize: 13, fontWeight: 700, padding: "3px 9px", borderRadius: "var(--erp-r-pill)",
                            background: alfaEkle((KAYNAK_RENK[g.kaynak] || "var(--erp-text-2)"), "22"),
                            color: KAYNAK_RENK[g.kaynak] || "var(--erp-text-2)",
                          }}
                        >
                          {/* Rozette de aynı ad: süzgeçte "Alış Fişi" yazıp satırda "Satınalma"
                              görmek, ikisinin farklı şeyler olduğunu düşündürüyordu. */}
                          {kaynakEtiketi(g.kaynak, [g])}
                        </span>
                        {g.siparisNo && <span className="mono" style={{ fontSize: 13, color: "var(--erp-text-3)" }}>{g.siparisNo}</span>}
                        {cariAdi && <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>· {cariAdi}</span>}

                        {/* TEK RENKLİ FİŞ — miktarlar başlık satırında.
                            Çoğu fiş tek renkten oluşur; onun için ayrı bir tablo açmak (başlık satırı
                            + renk satırı) üç satır yer kaplıyor ve hareket listesini gereksiz uzatıyordu.
                            Beden:miktar çiftleri satır içinde gösterilince fiş tek satıra sığıyor;
                            tablo yalnızca ÇOK renkli fişlerde açılıyor. */}
                        {gRenkler.length === 1 && (
                          <span style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                            <span className="mono" style={{ fontSize: 13, color: "var(--erp-text-2)" }}>{gRenkler[0]}</span>
                            {gBedenler.map((b) => {
                              const eslesenler = g.hareketler.filter((x) => x.renk === gRenkler[0] && x.beden === b);
                              if (eslesenler.length === 0) return null;
                              const toplam = stokYuvarla(eslesenler.reduce((t, x) => t + x.miktar, 0));
                              return (
                                <span
                                  key={b}
                                  className="mono"
                                  title={eslesenler.length > 1 ? `${eslesenler.length} hareketin toplamı` : undefined}
                                  style={{ display: "inline-flex", alignItems: "baseline", gap: 3, fontSize: 13 }}
                                >
                                  <span style={{ color: "var(--erp-text-3)" }}>{b}</span>
                                  <span style={{ fontWeight: 700, color: toplam < 0 ? "var(--erp-warn)" : "var(--erp-primary)" }}>
                                    {toplam > 0 ? "+" : ""}{toplam}
                                  </span>
                                </span>
                              );
                            })}
                          </span>
                        )}
                        {/* SAĞDA ÖZET: birim fiyat · toplam adet · toplam tutar.
                            Fişin ne kadarlık bir iş olduğu, matristeki sayıları toplamadan görünmüyordu. */}
                        <span className="mono" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                          {fisFiyatlari && fisFiyatlari.birimFiyat != null && (
                            <span style={{ color: "var(--erp-text-2)" }}>
                              br. {fisFiyatlari.birimFiyat.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {fisFiyatlari.sembol}
                            </span>
                          )}
                          <span style={{ fontWeight: 700, color: gToplamAdet < 0 ? "var(--erp-warn)" : "var(--erp-primary)" }}>
                            {gToplamAdet > 0 ? "+" : ""}{gToplamAdet} {product.birim || ""}
                          </span>
                          {fisFiyatlari && (
                            <span style={{ fontWeight: 700, color: "var(--erp-text)" }}>
                              {fisFiyatlari.tutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {fisFiyatlari.sembol}
                            </span>
                          )}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                          <SilOnayButonu
                            onConfirm={() => g.hareketler.forEach((h) => onRemoveHareketGlobal(h.id))}
                            baslikNormal="Bu fişin tüm hareketlerini sil"
                            boyut={12}
                          />
                        </span>
                        {/* Ok yalnızca ÇOK renkli fişlerde: tek renklide açılacak bir şey yok,
                            miktarlar zaten başlık satırında. İşlevsiz bir ok tıklanıp
                            "bozuk mu?" dedirtirdi. */}
                        {gRenkler.length > 1 && (acik
                          ? <ChevronDown size={15} color="var(--erp-text-3)" />
                          : <ChevronRight size={15} color="var(--erp-text-3)" />)}
                      </div>
                      {acik && gRenkler.length > 1 && (
                      <div style={{ padding: "0 10px 10px", overflowX: "auto" }}>
                        <table style={{ width: "auto", minWidth: "100%" }}>
                          <thead>
                            <tr>
                              <th style={{ fontSize: 13 }}>Renk \ Beden</th>
                              {gBedenler.map((b) => (
                                <th key={b} className="mono" style={{ fontSize: 13, textAlign: "center" }}>{b}</th>
                              ))}
                              {/* Renk satırının kendi toplamı ve fiyatı: çok renkli fişte "bu renkten
                                  kaç adet, kaça" sorusu matristen tek tek toplanarak cevaplanıyordu. */}
                              <th className="mono" style={{ fontSize: 13, textAlign: "right", borderLeft: "1px dashed var(--erp-line)", paddingLeft: 8 }}>Toplam</th>
                              {fisFiyatlari && <th className="mono" style={{ fontSize: 13, textAlign: "right", paddingLeft: 8 }}>Br. Fiyat</th>}
                              {fisFiyatlari && <th className="mono" style={{ fontSize: 13, textAlign: "right", paddingLeft: 8 }}>Tutar</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {gRenkler.map((r) => (
                              // Fiş matrisi: satır, o fişin KAYNAĞININ rengiyle işaretlenir
                              // (Üretim zeytin, Satınalma taba, Satış mavi, Manuel mürdüm) —
                              // stok ekstresindeki kaynak rozetleriyle aynı dil.
                              <tr key={r} style={kaynakRenkStili(g.kaynak)}>
                                <td style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", padding: "3px 6px" }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                    <ColorSwatch src={(product.renkResimleri || {})[r] || product.kapakResmi} editable={false} size={28} />
                                    {r}
                                  </span>
                                </td>
                                {gBedenler.map((b) => {
                                  // Aynı fişte AYNI renk/beden için birden fazla hareket olabilir
                                  // (üretim tüketiminde her mamul beden ayrı satır yazar). `find` ile
                                  // yalnızca ilkini göstermek, hücreyi olduğundan küçük gösterirdi.
                                  const eslesenler = g.hareketler.filter((x) => x.renk === r && x.beden === b);
                                  const toplam = Math.round(eslesenler.reduce((s, x) => s + x.miktar, 0) * 1000) / 1000;
                                  const fazlaVar = eslesenler.some((x) => x.fazlaGonderim);
                                  return (
                                    <td key={b} style={{ textAlign: "center" }}>
                                      {eslesenler.length > 0 ? (
                                        <span
                                          className="mono"
                                          title={[
                                            fazlaVar ? "Sipariş miktarının üzerinde gönderildi" : null,
                                            eslesenler.length > 1 ? `${eslesenler.length} hareketin toplamı: ${eslesenler.map((x) => x.miktar).join(" + ")}` : null,
                                          ].filter(Boolean).join(" · ") || undefined}
                                          style={{
                                            fontSize: 12, fontWeight: 700,
                                            color: toplam < 0 ? "var(--erp-warn)" : "var(--erp-primary)",
                                          }}
                                        >
                                          {toplam > 0 ? "+" : ""}{toplam}
                                          {eslesenler.length > 1 && (
                                            <span style={{ fontSize: 11, fontWeight: 400, color: "var(--erp-text-3)" }}> ({eslesenler.length})</span>
                                          )}
                                          {fazlaVar && " ⚠"}
                                        </span>
                                      ) : (
                                        <span className="mono" style={{ fontSize: 12, color: "var(--erp-border)" }}>—</span>
                                      )}
                                    </td>
                                  );
                                })}
                                {(() => {
                                  const renkToplam = stokYuvarla(g.hareketler.filter((x) => x.renk === r).reduce((t, x) => t + (x.miktar || 0), 0));
                                  const rf = fisFiyatlari ? fisFiyatlari.renkFiyati(r) : null;
                                  return (
                                    <>
                                      <td className="mono" style={{ fontSize: 12, fontWeight: 700, textAlign: "right", borderLeft: "1px dashed var(--erp-line)", padding: "3px 8px", color: renkToplam < 0 ? "var(--erp-warn)" : "var(--erp-primary)" }}>
                                        {renkToplam > 0 ? "+" : ""}{renkToplam}
                                      </td>
                                      {fisFiyatlari && (
                                        <td className="mono" style={{ fontSize: 12, textAlign: "right", padding: "3px 8px", color: "var(--erp-text-2)", whiteSpace: "nowrap" }}>
                                          {rf.birimFiyat == null ? "karışık" : `${rf.birimFiyat.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${fisFiyatlari.sembol}`}
                                        </td>
                                      )}
                                      {fisFiyatlari && (
                                        <td className="mono" style={{ fontSize: 12, fontWeight: 600, textAlign: "right", padding: "3px 8px", whiteSpace: "nowrap" }}>
                                          {rf.tutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {fisFiyatlari.sembol}
                                        </td>
                                      )}
                                    </>
                                  );
                                })()}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {cardTab === "fiyat" && (() => {
        const renkSecenekleriFk = Array.from(new Set(product.variants.map((v) => v.renk)));

        const uygunGruplar = (tanimlarFiyatGruplari || []).filter((g) => g.tip === fkTip);
        const uygunCariler = (cariler || []).filter((c) =>
          !c.pasif && (c.tip === (fkTip === "Alış" ? "Tedarikçi" : "Müşteri") || c.tip === "Her İkisi")
        );
        const kurallarGorunen = (product.fiyatKurallari || []).filter((k) => k.tip === fkTip);
        return (
          <div>
            <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 14px" }}>
              Bu ürünün fiyatı renk, beden, fiyat grubu ya da tekil bir cariye göre farklılaştırılabilir. En
              spesifik kural kazanır: Cariye özel &gt; Fiyat grubu &gt; Renk+Beden &gt; Renk &gt; Beden &gt; Genel fiyat.
            </p>

            {/* SON ALIŞ FİYATLARI (kullanıcı, 12 Eylül): karttaki alış fiyatı ile GERÇEKLEŞEN alışlar
                yan yana — fark % ile. Kaynak cari hareketleri (bkz. sonAlisFiyatlari); ayrı bir kayıt
                tutulmuyor, fiş silinince liste kendiliğinden düzeliyor. */}
            {(() => {
              const alislar = sonAlisFiyatlari(cariler, product.ad, { sinir: 10 });
              const kartFiyati = product.alisFiyati || 0;
              const kartPB = paraKoduna(product.alisParaBirimi) || "TRY";
              return (
                <div data-son-alislar={alislar.length} style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: "10px 12px", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <b style={{ fontSize: 12 }}>Son alış fiyatları</b>
                    <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>gerçekleşen alış fişlerinden · karttaki alış fiyatıyla fark</span>
                    <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--erp-text-2)" }}>
                      kart: {kartFiyati.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {PARA_SEMBOLU[kartPB] || kartPB}
                    </span>
                  </div>
                  {alislar.length === 0 ? (
                    <div style={{ fontSize: 11, color: "var(--erp-text-3)" }}>Bu ürün için henüz alış fişi yok.</div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          {["Tarih", "Tedarikçi", "Fiş", "Renk", "Ölçü", "Miktar", "Fiyat", "Kart farkı"].map((b, i) => (
                            <th key={b} style={{ fontSize: 10, color: "var(--erp-text-2)", padding: "2px 6px", textAlign: i >= 5 ? "right" : "left" }}>{b}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {alislar.map((a, i) => {
                          const ayniBirim = a.paraBirimi === kartPB && kartFiyati > 0;
                          const fark = ayniBirim ? Math.round(((a.fiyat - kartFiyati) / kartFiyati) * 1000) / 10 : null;
                          return (
                            <tr key={`${a.fisNo}-${i}`} data-son-alis-satir={a.fisNo} style={{ borderTop: "1px solid var(--erp-line-soft)" }}>
                              <td className="mono" style={{ fontSize: 11, padding: "3px 6px" }}>{a.tarih}</td>
                              <td style={{ fontSize: 11, padding: "3px 6px" }}>{a.cariAd}</td>
                              <td className="mono" style={{ fontSize: 11, padding: "3px 6px" }}>{a.fisNo}</td>
                              <td className="mono" style={{ fontSize: 11, padding: "3px 6px" }}>{a.renk}</td>
                              <td className="mono" style={{ fontSize: 11, padding: "3px 6px" }}>{a.beden}</td>
                              <td className="mono" style={{ fontSize: 11, padding: "3px 6px", textAlign: "right" }}>{a.miktar} {a.birim}</td>
                              <td className="mono" style={{ fontSize: 12, padding: "3px 6px", textAlign: "right", fontWeight: 700 }}>
                                {a.fiyat.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {PARA_SEMBOLU[a.paraBirimi] || a.paraBirimi}
                              </td>
                              <td className="mono" style={{ fontSize: 11, padding: "3px 6px", textAlign: "right", fontWeight: 700,
                                color: fark == null ? "var(--erp-text-3)" : fark > 0 ? "var(--erp-warn)" : fark < 0 ? "var(--erp-primary)" : "var(--erp-text-2)" }}
                                title={fark == null ? "Para birimi karttan farklı — fark hesaplanmadı" : "Gerçekleşen fiyat − kart fiyatı"}>
                                {fark == null ? "—" : `${fark > 0 ? "+" : ""}${fark.toLocaleString("tr-TR")}%`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })()}

            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {["Satış", "Alış"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFkTip(t)}
                  style={{
                    padding: "5px 14px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    border: `1.5px solid ${fkTip === t ? (t === "Alış" ? "var(--erp-brown)" : "var(--erp-info)") : "var(--erp-border)"}`,
                    background: fkTip === t ? (t === "Alış" ? "#8A5A3822" : "#3D6B8A22") : "#fff",
                    color: fkTip === t ? (t === "Alış" ? "var(--erp-brown)" : "var(--erp-info)") : "var(--erp-text-2)",
                  }}
                >
                  {t} Fiyatı ({t === "Alış" ? (product.alisFiyati || 0) : (product.satisFiyati || 0)} ₺ genel)
                </button>
              ))}
            </div>

            <div style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)", marginBottom: 8 }}>Yeni Özel Fiyat Ekle</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {[
                  { key: "renkBeden", label: "Renk + Beden" },
                  { key: "fiyatGrubu", label: "Fiyat Grubuna Göre" },
                  { key: "cari", label: "Tekil Cariye Özel" },
                ].map((k) => (
                  <button
                    key={k.key}
                    type="button"
                    onClick={() => setFkKapsam(k.key)}
                    style={{
                      padding: "4px 10px", borderRadius: "var(--erp-r-pill)", fontSize: 11, fontWeight: 700, cursor: "pointer",
                      border: `1.5px solid ${fkKapsam === k.key ? "var(--erp-purple)" : "var(--erp-border)"}`,
                      background: fkKapsam === k.key ? "#6B4E8A1A" : "#fff",
                      color: fkKapsam === k.key ? "var(--erp-purple)" : "var(--erp-text-2)",
                    }}
                  >
                    {k.label}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                {fkKapsam === "fiyatGrubu" && (
                  uygunGruplar.length > 0 ? (
                    <Field label="Fiyat Grubu">
                      <select value={fkGrupId} onChange={(e) => setFkGrupId(e.target.value)} style={{ ...inputStyle, minWidth: 160 }}>
                        <option value="">Seçin…</option>
                        {uygunGruplar.map((g) => <option key={g.id} value={g.id}>{g.ad}</option>)}
                      </select>
                    </Field>
                  ) : (
                    <div style={{ fontSize: 11, color: "var(--erp-warn)" }}>
                      Bu tip için tanımlı fiyat grubu yok (Tanımlar → Üretim Tanımları'ndan ekleyin).
                    </div>
                  )
                )}
                {fkKapsam === "cari" && (
                  uygunCariler.length > 0 ? (
                    <Field label={fkTip === "Alış" ? "Tedarikçi" : "Müşteri"}>
                      <select value={fkCariId} onChange={(e) => setFkCariId(e.target.value)} style={{ ...inputStyle, minWidth: 160 }}>
                        <option value="">Seçin…</option>
                        {uygunCariler.map((c) => <option key={c.id} value={c.id}>{c.unvan}</option>)}
                      </select>
                    </Field>
                  ) : (
                    <div style={{ fontSize: 11, color: "var(--erp-warn)" }}>Kayıtlı uygun cari yok.</div>
                  )
                )}
                {/* CARİDE RENK / BEDEN (kullanıcı, 17 Eylül) — isteğe bağlı. Boş bırakılırsa kural
                    o carinin bütün varyantlarını kapsar (eski davranış). Doldurulursa yalnız o
                    renk/bedene işler ve daha özel olduğu için genel cari kuralını geçer. */}
                {fkKapsam === "cari" && fkCariId && (
                  <>
                    <Field label="Renk (hepsi için boş bırakın)" genislik={150}>
                      <select value={fkRenk} data-fk-renk="1" onChange={(e) => setFkRenk(e.target.value)} style={inputStyle}>
                        <option value="">Bütün renkler</option>
                        {renkSecenekleriFk.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </Field>
                    <Field label="Beden (hepsi için boş bırakın)" genislik={150}>
                      <select value={fkBeden} data-fk-beden="1" onChange={(e) => setFkBeden(e.target.value)} style={inputStyle}>
                        <option value="">Bütün bedenler</option>
                        {bedenSirala(Array.from(new Set(product.variants.map((v) => v.beden)))).filter(Boolean)
                          .map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </Field>
                  </>
                )}
                {(fkKapsam === "fiyatGrubu" || fkKapsam === "cari") && (
                  <>
                    <Field label="Fiyat (₺)">
                      <input type="number" step="any" min="0" value={fkFiyat} onChange={(e) => setFkFiyat(e.target.value)} style={{ ...inputStyle, width: 100 }} />
                    </Field>
                    <button className="btn-primary" onClick={fiyatKuraliKaydet}><Plus size={14} /> Ekle</button>
                  </>
                )}
              </div>

              {fkKapsam === "renkBeden" && (() => {
                // Tek tek hücre doldurmak yerine, bir SATIRI (renk) ya da SÜTUNU (beden) "Tek fiyat"a
                // kilitleyip, o satır/sütun için TEK bir ortak fiyat girilebilir — kilitli bir satırda/
                // sütunda ayrı ayrı hücre doldurmaya gerek kalmaz, hepsi aynı fiyatı paylaşır.
                const tumRenkler = renkSecenekleriFk;
                const tumBedenler = bedenSirala(Array.from(new Set(product.variants.map((v) => v.beden))));
                const kuralBul = (kapsam, deger) => (product.fiyatKurallari || []).find((k) => k.tip === fkTip && k.kapsam === kapsam && k.deger === deger);

                function renkTekFiyatToggle(r) {
                  setFkTekFiyatRenkler((prev) => ({ ...prev, [r]: !tekFiyatRenkAcikMi(r) }));
                }
                function bedenTekFiyatToggle(b) {
                  setFkTekFiyatBedenler((prev) => ({ ...prev, [b]: !prev[b] }));
                }

                return (
                  <div style={{ overflowX: "auto", maxWidth: "100%" }}>
                    <table style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ fontSize: 11, textAlign: "left", padding: "4px 8px" }}>Renk \ Beden</th>
                          {tumBedenler.map((b) => (
                            <th key={b} style={{ fontSize: 11, textAlign: "center", padding: "4px 8px", whiteSpace: "nowrap" }}>{b}</th>
                          ))}
                          <th style={{ fontSize: 11, textAlign: "center", padding: "4px 8px", whiteSpace: "nowrap", borderLeft: "1px dashed var(--erp-line)" }}>
                            Tek Fiyat (renk)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tumRenkler.map((r) => {
                          const renkKilitli = !!tekFiyatRenkAcikMi(r);
                          const renkKurali = kuralBul("renk", r);
                          return (
                            <tr key={r} style={{ borderTop: "1px solid var(--erp-line-soft)" }}>
                              <td className="mono" style={{ padding: "6px 8px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{r}</td>
                              {tumBedenler.map((b) => {
                                const deger = `${r}|${b}`;
                                const kural = kuralBul("renkBeden", deger);
                                return (
                                  <td key={b} style={{ padding: "4px 6px", textAlign: "center" }}>
                                    {renkKilitli ? (
                                      <span style={{ fontSize: 11, color: "var(--erp-border)" }}>—</span>
                                    ) : (
                                      <input
                                        type="number" step="any" min="0"
                                        defaultValue={kural ? kural.fiyat : ""}
                                        placeholder="—"
                                        onBlur={(e) => {
                                          const yeni = parseFloat(e.target.value);
                                          if (!(yeni > 0) || (kural && yeni === kural.fiyat)) return;
                                          fiyatKuraliKaydetDogrudan("renkBeden", deger, `${r} / ${b}`, yeni);
                                        }}
                                        className="mono"
                                        style={{ width: 64, padding: "3px 5px", fontSize: 11, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", textAlign: "center" }}
                                      />
                                    )}
                                  </td>
                                );
                              })}
                              <td style={{ padding: "4px 6px", textAlign: "center", borderLeft: "1px dashed var(--erp-line)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                                  <input type="checkbox" checked={renkKilitli} onChange={() => renkTekFiyatToggle(r)} title="Bu rengin tüm bedenlerine tek fiyat uygula" />
                                  {renkKilitli && (
                                    <input
                                      type="number" step="any" min="0"
                                      defaultValue={renkKurali ? renkKurali.fiyat : ""}
                                      placeholder="Fiyat"
                                      onBlur={(e) => {
                                        const yeni = parseFloat(e.target.value);
                                        if (!(yeni > 0) || (renkKurali && yeni === renkKurali.fiyat)) return;
                                        fiyatKuraliKaydetDogrudan("renk", r, `Renk: ${r}`, yeni);
                                      }}
                                      className="mono"
                                      style={{ width: 64, padding: "3px 5px", fontSize: 11, border: "1px solid #6B4E8A", borderRadius: "var(--erp-r-sm)", textAlign: "center" }}
                                    />
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        <tr style={{ borderTop: "2px solid var(--erp-line)" }}>
                          <td className="mono" style={{ padding: "6px 8px", fontSize: 11, fontWeight: 700, color: "var(--erp-text-2)" }}>Tek Fiyat (beden)</td>
                          {tumBedenler.map((b) => {
                            const bedenKilitli = !!fkTekFiyatBedenler[b];
                            const bedenKurali = kuralBul("beden", b);
                            return (
                              <td key={b} style={{ padding: "4px 6px", textAlign: "center" }}>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                                  <input type="checkbox" checked={bedenKilitli} onChange={() => bedenTekFiyatToggle(b)} title="Bu bedenin tüm renklerine tek fiyat uygula" />
                                  {bedenKilitli && (
                                    <input
                                      type="number" step="any" min="0"
                                      defaultValue={bedenKurali ? bedenKurali.fiyat : ""}
                                      placeholder="Fiyat"
                                      onBlur={(e) => {
                                        const yeni = parseFloat(e.target.value);
                                        if (!(yeni > 0) || (bedenKurali && yeni === bedenKurali.fiyat)) return;
                                        fiyatKuraliKaydetDogrudan("beden", b, `Beden: ${b}`, yeni);
                                      }}
                                      className="mono"
                                      style={{ width: 56, padding: "3px 5px", fontSize: 11, border: "1px solid #6B4E8A", borderRadius: "var(--erp-r-sm)", textAlign: "center" }}
                                    />
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td style={{ borderLeft: "1px dashed var(--erp-line)" }}></td>
                        </tr>
                      </tbody>
                    </table>
                    <p style={{ fontSize: 10, color: "var(--erp-text-3)", marginTop: 6 }}>
                      Bir rengi ya da bedeni "Tek Fiyat"a kilitlerseniz, o satır/sütundaki tekil hücreler yerine
                      tek bir ortak fiyat kullanılır (öncelik sırası: Renk+Beden &gt; Renk &gt; Beden &gt; Genel).
                    </p>
                  </div>
                );
              })()}
            </div>

            {kurallarGorunen.length === 0 ? (
              <EmptyState text={`Bu ürün için ${fkTip} tarafında özel fiyat tanımlanmadı — genel fiyat kullanılıyor.`} />
            ) : (
              <div style={{ border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", overflow: "hidden", background: "#fff", marginBottom: 16 }}>
                {kurallarGorunen.map((k, i, arr) => (
                  <div
                    key={k.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                      borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--erp-line-soft)",
                    }}
                  >
                    <span style={{ fontSize: 13, flex: 1 }}>{k.etiket}</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{(k.fiyat || 0).toLocaleString("tr-TR")} ₺</span>
                    <SilOnayButonu onConfirm={() => fiyatKuraliSil(k.id)} boyut={12} baslikNormal="Fiyat kuralı silinsin mi?" />
                  </div>
                ))}
              </div>
            )}

            <button className="btn-ghost" onClick={() => setShowFiyatGecmisi((v) => !v)}>
              <FileText size={13} /> Fiyat Değişiklik Geçmişi ({(product.fiyatGecmisi || []).length})
            </button>
            {showFiyatGecmisi && (
              (product.fiyatGecmisi || []).length === 0 ? (
                <EmptyState text="Henüz fiyat değişikliği kaydedilmedi." />
              ) : (
                <div style={{ marginTop: 8, border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", overflow: "hidden", background: "#fff" }}>
                  {product.fiyatGecmisi.map((log, i, arr) => (
                    <div
                      key={log.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", fontSize: 12,
                        borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--erp-line-soft)",
                      }}
                    >
                      <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)", width: 130 }}>
                        {new Date(log.tarih).toLocaleString("tr-TR")}
                      </span>
                      <span
                        className="mono"
                        style={{
                          fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: "var(--erp-r-pill)",
                          background: alfaEkle((log.tip === "Alış" ? "var(--erp-brown)" : "var(--erp-info)"), "22"), color: log.tip === "Alış" ? "var(--erp-brown)" : "var(--erp-info)",
                        }}
                      >
                        {log.tip}
                      </span>
                      <span style={{ flex: 1 }}>{log.etiket}</span>
                      <span className="mono" style={{ color: "var(--erp-text-2)" }}>
                        {log.eskiFiyat != null ? `${log.eskiFiyat} ₺` : "—"} → {log.yeniFiyat != null ? `${log.yeniFiyat} ₺` : "silindi"}
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        );
      })()}

      {cardTab === "siparisler" && (() => {
        const ilgiliSiparisler = (siparisler || [])
          .filter((s) => s.kalemler.some((k) => k.urunId === product.id))
          .sort((a, b) => new Date(b.olusturuldu || b.tarih || 0) - new Date(a.olusturuldu || a.tarih || 0));
        if (ilgiliSiparisler.length === 0) {
          return <EmptyState text="Bu ürün henüz hiçbir siparişte geçmiyor." />;
        }
        return (
          <div style={{ border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", overflow: "hidden", background: "#fff" }}>
            {ilgiliSiparisler.map((s, i) => {
              const tipRenk = s.tip === "Alış" ? "var(--erp-brown)" : "var(--erp-info)";
              const durumRenk = SIPARIS_DURUM_RENK[s.durum] || "var(--erp-text-2)";
              const ilgiliKalemler = s.kalemler.filter((k) => k.urunId === product.id);
              const toplamMiktar = ilgiliKalemler.reduce((sum, k) => sum + k.miktar, 0);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onGoToSiparis(s.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                    background: "transparent", border: "none", cursor: "pointer", textAlign: "left", flexWrap: "wrap",
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
                  <span
                    className="mono"
                    style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--erp-r-pill)", background: "var(--erp-panel-2)", color: "var(--erp-text)" }}
                  >
                    {ilgiliKalemler.length} kalem · {toplamMiktar} adet
                  </span>
                  <span
                    className="mono"
                    style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: "var(--erp-r-pill)", marginLeft: "auto", background: alfaEkle(durumRenk, "22"), color: durumRenk }}
                  >
                    {s.durum}
                  </span>
                  <ChevronRight size={16} color="var(--erp-text-3)" />
                </button>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

