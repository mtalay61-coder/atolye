function TanimlarModule({ uretim, stokRezervasyonlari, onRezervasyonTemizle, muhasebe, onKarsilananOnar, fisDefteri, onDefterdenYenidenKur, onEksikHareketOnar, mobilDuzenKipi, onMobilDuzenKipi, mobilDuzenAktif, kullanimdakiOlculer, onTanimsizOlcuCevir, onOlcuAdDegistir, onSurumYayinla, yayinSurum, onAktifKullaniciGuncelle, onAcilisFisiKes, tanimlar, onSave, showToast, onVeritabaniSifirla, supabaseBagli, gocDurumu, onSupabaseyeGoc, onDefterTopluOnar, onHammaddeRenkAdDegistir, stok, cariler, siparisler, aktifKullanici, MODULLER, MODUL_ADLARI, onJsonYedekle, onJsonGeriYukle, onExcelAktar, cop, onCopGeriYukle, onCopKaliciSil, onCopBosalt, sonYedekTarihi, onSimdiYedekle, onYedektenGeriYukle }) {
  const [yeniRenkHammadde, setYeniRenkHammadde] = useState("");
  const [yeniFireSebep, setYeniFireSebep] = useState("");
  const [yeniBeden, setYeniBeden] = useState("");
  const [yeniBoyut, setYeniBoyut] = useState("");
  const [yeniKodAd, setYeniKodAd] = useState("");
  const [yeniKodKapsam, setYeniKodKapsam] = useState("genel|");
  const [yeniBirim, setYeniBirim] = useState("");
  const [aramaSorgusu, setAramaSorgusu] = useState("");
  const [filtreMalzemeTipi, setFiltreMalzemeTipi] = useState("Tümü");
  // Boyutlar için ayrı filtre ve ekleme tipi — bağcık boyutu "16 cm", kutu boyutu "Büyük Boy"
  // gibi malzemeye özgü ölçüler tek listede karışmasın diye.
  const [filtreBoyutTipi, setFiltreBoyutTipi] = useState("Tümü");
  const [yeniBoyutTipi, setYeniBoyutTipi] = useState("");
  const [yeniHammaddeTipi, setYeniHammaddeTipi] = useState("");
  const [yeniMamulTipi, setYeniMamulTipi] = useState("");
  const [yeniProses, setYeniProses] = useState("");
  const [yeniAraProses, setYeniAraProses] = useState("");
  const [yeniAraProsesCariId, setYeniAraProsesCariId] = useState("");
  const [yeniAraProsesUcret, setYeniAraProsesUcret] = useState("");
  const [yeniFiyatGrubu, setYeniFiyatGrubu] = useState("");
  const [yeniFiyatGrubuTipi, setYeniFiyatGrubuTipi] = useState("Satış");
  const [yeniSablonAdi, setYeniSablonAdi] = useState("");
  // Fiyat grubunun para birimi (21 Eylül): "Toptan USD" grubunun fiyatları dolarla tutulur.
  const [yeniFiyatGrubuPb, setYeniFiyatGrubuPb] = useState("TRY");
  const [yeniKullaniciAd, setYeniKullaniciAd] = useState("");
  const [yeniKullaniciAdi, setYeniKullaniciAdi] = useState("");
  const [yeniKullaniciSifre, setYeniKullaniciSifre] = useState("");
  const [yeniKullaniciRol, setYeniKullaniciRol] = useState("Kullanıcı");
  const [acikYetkiKullaniciId, setAcikYetkiKullaniciId] = useState(null);
  const [aktifTanimSekme, setAktifTanimSekme] = useState("firma"); // "genel" | "renkBeden" | "uretim" | "kullanicilar" | "cop"
  const [copTurFiltre, setCopTurFiltre] = useState("Tümü");
  const [copArama, setCopArama] = useState("");
  const [acikCopId, setAcikCopId] = useState(null);

  // Fire sebepleri: hurda ve tamir kaydedilirken seçilir, fire raporunun "neden" boyutunu oluşturur.
  // Serbest metin yerine tanımlı liste, çünkü rapor gruplaması ancak sebepler tutarlıysa anlamlı.
  function addFireSebep() {
    const ad = yeniFireSebep.trim();
    if (!ad) return;
    const mevcut = tanimlar.fireSebepleri || [];
    if (mevcut.some((x) => (typeof x === "string" ? x : x.ad).toLocaleLowerCase("tr-TR") === ad.toLocaleLowerCase("tr-TR"))) {
      return showToast("Bu sebep zaten tanımlı");
    }
    onSave({ ...tanimlar, fireSebepleri: [...mevcut, { id: uid("fsebep"), ad }] });
    setYeniFireSebep("");
  }
  function removeFireSebep(id) {
    onSave({ ...tanimlar, fireSebepleri: (tanimlar.fireSebepleri || []).filter((x) => (x.id || x) !== id) });
  }

  // RENK KODU TEK HAVUZDAN (kullanıcı, 13 Eylül: "hammadde ve mamul rengi kodları çakışıyor").
  // Mamul rengi kodu BÜTÜN renklerin, hammadde rengi kodu yalnız HAMMADDE renklerinin en büyüğünden
  // türetiliyordu: boş veritabanında mamul "Siyah" 101, ardından hammadde "Siyah" da 101 alıyordu.
  // Artık iki tip aynı havuzu kullanıyor; model rengi (kombinasyon) kodları da atlanıyor.
  function sonrakiRenkKodu() {
    const kullanilan = new Set([
      ...(tanimlar.renkler || []).map((r) => parseInt(r.kod, 10)),
      ...(tanimlar.renkKombinasyonlari || []).map((k) => parseInt(k.kod, 10)),
    ].filter((n) => !isNaN(n)));
    const renkKodlari = (tanimlar.renkler || []).map((r) => parseInt(r.kod, 10)).filter((n) => !isNaN(n));
    let sonraki = (renkKodlari.length > 0 ? Math.max(...renkKodlari) : 100) + 1;
    while (kullanilan.has(sonraki)) sonraki += 1;
    return String(sonraki);
  }



  function addRenk() {
    const ad = yeniRenkHammadde.trim();
    if (!ad) return;
    if (tanimlar.renkler.some((r) => r.ad.toLowerCase() === ad.toLowerCase() && r.tip === "Hammadde")) {
      return showToast("Bu renk zaten tanımlı");
    }
    onSave({ ...tanimlar, renkler: [...tanimlar.renkler, { id: uid("renk"), ad, tip: "Hammadde", renkKodu: "#C9B99A", kod: sonrakiRenkKodu() }] });
    setYeniRenkHammadde("");
  }

  // Var olan çakışmalar: aynı kodu taşıyan renkler. "Düzelt" ilk kaydı bırakır, sonrakilere yeni kod verir.
  const cakisanRenkKodlari = (() => {
    const gruplar = {};
    (tanimlar.renkler || []).forEach((r) => { if (r.kod) (gruplar[r.kod] = gruplar[r.kod] || []).push(r); });
    return Object.entries(gruplar).filter(([, l]) => l.length > 1).map(([kod, l]) => ({ kod, renkler: l }));
  })();
  function cakisanRenkKodlariniDuzelt() {
    const kullanilan = new Set([
      ...(tanimlar.renkler || []).map((r) => parseInt(r.kod, 10)),
      ...(tanimlar.renkKombinasyonlari || []).map((k) => parseInt(k.kod, 10)),
    ].filter((n) => !isNaN(n)));
    const gorulen = new Set();
    // Sıradaki numara RENK kodlarının en büyüğünden (kombinasyon 1001'lerden değil); kullanılanlar atlanır.
    const renkKodlari = (tanimlar.renkler || []).map((r) => parseInt(r.kod, 10)).filter((n) => !isNaN(n));
    let sonraki = (renkKodlari.length > 0 ? Math.max(...renkKodlari) : 100) + 1;
    const yeni = (tanimlar.renkler || []).map((r) => {
      if (!r.kod || !gorulen.has(r.kod)) { gorulen.add(r.kod); return r; }
      while (kullanilan.has(sonraki)) sonraki += 1;
      const kod = String(sonraki); kullanilan.add(sonraki); sonraki += 1;
      return { ...r, kod };
    });
    onSave({ ...tanimlar, renkler: yeni });
    showToast("Çakışan renk kodları yeniden numaralandı — etiket bastıysanız yeni kodla bir kez daha basın");
  }

  function renkKoduDegistir(id, kod) {
    onSave({ ...tanimlar, renkler: tanimlar.renkler.map((r) => (r.id === id ? { ...r, renkKodu: kod } : r)) });
  }

  function renkTonKoduDegistir(id, kod) {
    onSave({ ...tanimlar, renkler: tanimlar.renkler.map((r) => (r.id === id ? { ...r, kod } : r)) });
  }

  function kombinasyonEkle(renkIdler) {
    if (renkIdler.length < 1) return showToast("En az 1 renk seçin");
    // ÖNEMLİ: karşılaştırma SIRALI yapılır — "Siyah/Kahve/Siyah" ile "Kahve/Siyah/Siyah" aynı renkleri
    // içerse de pozisyon sıraları farklı olduğu için FARKLI modeller kabul edilir. Sadece pozisyonların
    // TEK TEK aynı renkte olduğu (gerçek bir tekrar) durumunda tekrar eklenmesi engellenir — bu, örn.
    // "Siyah" tek renkli modelinin yanlışlıkla 1001, 1010, 1011 gibi birden fazla kez tanımlanmasını önler.
    const zatenVar = (tanimlar.renkKombinasyonlari || []).find(
      (k) => k.renkIdler.length === renkIdler.length && k.renkIdler.every((id, i) => id === renkIdler[i])
    );
    if (zatenVar) {
      return showToast(`Bu renk seti zaten "${zatenVar.kod}" kodu ile tanımlı`);
    }
    // Otomatik sıra numarası: mevcut model rengi kodlarının en büyüğü + 1, 1001'den başlar.
    const mevcutKodlar = (tanimlar.renkKombinasyonlari || [])
      .filter((k) => /^\d+$/.test(k.kod || ""))
      .map((k) => parseInt(k.kod, 10));
    // Model rengi kodu barkodda RENK KODU olarak giriyor (077-barkod, 12 Eylül); bir renk tanımının
    // barkod kodunu atlamalı — çakışırsa okutulan etiket başka rengi gösterir.
    const renkKodlari = new Set((tanimlar.renkler || []).map((r) => Number(r.barkodKodu)).filter((v) => v > 0));
    let sonraki = (mevcutKodlar.length > 0 ? Math.max(...mevcutKodlar) : 1000) + 1;
    while (renkKodlari.has(sonraki)) sonraki += 1;
    const otomatikKod = String(sonraki);
    onSave({
      ...tanimlar,
      renkKombinasyonlari: [...(tanimlar.renkKombinasyonlari || []), { id: uid("kombi"), kod: otomatikKod, renkIdler }],
    });
    showToast(`Model rengi ${otomatikKod} olarak eklendi`);
  }

  // Bir model rengi kombinasyonunun görünen etiketini (örn. "1001 - Siyah/Beyaz") hesaplar.
  function kombinasyonEtiketiHesapla(kombi) {
    return `${kombi.kod} - ${kombi.renkIdler.map((id) => ((tanimlar.renkler.find((r) => r.id === id) || {}).ad || "?")).join("/")}`;
  }

  // Bir renk STRING'inin (mamul renk varyantı ya da hammadde renk varyantı) hangi stok ürünlerinde
  // kullanıldığını, ürün adı listesi olarak döndürür.
  function renkStringiniKullananUrunler(renkStr) {
    return (stok || [])
      .filter((p) => (p.variants || []).some((v) => v.renk === renkStr))
      .map((p) => p.ad);
  }

  // Bir hammadde renginin, doğrudan (Hammadde ürün varyantı olarak) ya da dolaylı (bir model rengi
  // kombinasyonunun parçası olarak Mamul ürün varyantında) kullanıldığı tüm ürün adlarını döndürür.
  function hammaddeRenkKullanildigiUrunler(renkId) {
    const renk = tanimlar.renkler.find((r) => r.id === renkId);
    if (!renk) return [];
    const dogrudan = renkStringiniKullananUrunler(renk.ad);
    const kombinasyonlarUzerinden = (tanimlar.renkKombinasyonlari || [])
      .filter((k) => k.renkIdler.includes(renkId))
      .flatMap((k) => renkStringiniKullananUrunler(kombinasyonEtiketiHesapla(k)));
    return Array.from(new Set([...dogrudan, ...kombinasyonlarUzerinden]));
  }

  function kombinasyonSil(id) {
    const kombi = (tanimlar.renkKombinasyonlari || []).find((k) => k.id === id);
    if (!kombi) return;
    const kullananlar = renkStringiniKullananUrunler(kombinasyonEtiketiHesapla(kombi));
    if (kullananlar.length > 0) {
      return showToast(`Silinemiyor — bu model rengi şu ürünlerde kullanılıyor: ${kullananlar.join(", ")}`);
    }
    onSave({ ...tanimlar, renkKombinasyonlari: (tanimlar.renkKombinasyonlari || []).filter((k) => k.id !== id) });
  }

  function addOlcu(tip) {
    const ad = (tip === "Boyut" ? yeniBoyut : yeniBeden).trim();
    if (!ad) return;
    const mevcut = tanimlar.bedenler.find((b) => b.ad.toLowerCase() === ad.toLowerCase() && (b.tip || "Beden") === tip);

    // Aynı adlı ölçü varsa yeniden oluşturulmaz — istenen malzeme tipi listesinde yoksa ona EKLENİR.
    // Renk tarafındaki davranışın aynısı: "16 cm" hem bağcık hem fermuar ölçüsü olabilir.
    if (mevcut) {
      const istenenTip = tip === "Boyut" ? yeniBoyutTipi : "";
      const mevcutTipler = olcuTipleri(mevcut);
      if (!istenenTip || mevcutTipler.includes(istenenTip)) {
        return showToast(tip === "Boyut" ? "Bu boyut zaten tanımlı" : "Bu beden zaten tanımlı");
      }
      onSave({
        ...tanimlar,
        bedenler: tanimlar.bedenler.map((b) =>
          b.id === mevcut.id ? { ...b, malzemeTipleri: [...mevcutTipler, istenenTip] } : b
        ),
      });
      showToast(`"${ad}" boyutuna "${istenenTip}" tipi eklendi`);
      setYeniBoyut("");
      return;
    }

    const yeni = { id: uid("olcu"), ad, tip };
    if (tip === "Boyut" && yeniBoyutTipi) yeni.malzemeTipleri = [yeniBoyutTipi];
    onSave({ ...tanimlar, bedenler: [...tanimlar.bedenler, yeni] });
    if (tip === "Boyut") setYeniBoyut("");
    else setYeniBeden("");
  }

  // Bir malzeme tipini ölçüye ekler/çıkarır (renkteki toggle'ın ölçü karşılığı).
  function olcuMalzemeTipiToggle(id, malzemeTipi) {
    onSave({
      ...tanimlar,
      bedenler: tanimlar.bedenler.map((b) => {
        if (b.id !== id) return b;
        const mevcut = olcuTipleri(b);
        return {
          ...b,
          malzemeTipleri: mevcut.includes(malzemeTipi)
            ? mevcut.filter((t) => t !== malzemeTipi)
            : [...mevcut, malzemeTipi],
        };
      }),
    });
  }

  function addBirim() {
    const ad = yeniBirim.trim();
    if (!ad) return;
    if ((tanimlar.birimler || []).some((b) => b.ad.toLowerCase() === ad.toLowerCase())) {
      return showToast("Bu birim zaten tanımlı");
    }
    onSave({ ...tanimlar, birimler: [...(tanimlar.birimler || []), { id: uid("birim"), ad }] });
    setYeniBirim("");
  }

  function addHammaddeTipi() {
    const ad = yeniHammaddeTipi.trim();
    if (!ad) return;
    if ((tanimlar.hammaddeTipleri || []).some((h) => h.ad.toLowerCase() === ad.toLowerCase())) {
      return showToast("Bu malzeme tipi zaten tanımlı");
    }
    onSave({ ...tanimlar, hammaddeTipleri: [...(tanimlar.hammaddeTipleri || []), { id: uid("htip"), ad }] });
    setYeniHammaddeTipi("");
  }

  function removeHammaddeTipi(id) {
    const tip = (tanimlar.hammaddeTipleri || []).find((h) => h.id === id);
    if (!tip) return;
    const kullananRenkler = tanimlar.renkler.filter((r) => renkTipleri(r).includes(tip.ad));
    if (kullananRenkler.length > 0) {
      return showToast(`Silinemiyor — bu tipteki şu renkler kullanılıyor: ${kullananRenkler.map((r) => r.ad).join(", ")}`);
    }
    onSave({ ...tanimlar, hammaddeTipleri: (tanimlar.hammaddeTipleri || []).filter((h) => h.id !== id) });
  }

  // Mamul Tipi: Malzeme Tipi'nin Mamul karşılığı — "Spor Ayakkabı", "Sandalet" gibi ürün türlerini
  // tanımlar, Stok'ta ürün eklerken/filtrelerken kullanılır.
  function addMamulTipi() {
    const ad = yeniMamulTipi.trim();
    if (!ad) return;
    if ((tanimlar.mamulTipleri || []).some((m) => m.ad.toLowerCase() === ad.toLowerCase())) {
      return showToast("Bu mamül tipi zaten tanımlı");
    }
    onSave({ ...tanimlar, mamulTipleri: [...(tanimlar.mamulTipleri || []), { id: uid("mtip"), ad }] });
    setYeniMamulTipi("");
  }

  function removeMamulTipi(id) {
    const tip = (tanimlar.mamulTipleri || []).find((m) => m.id === id);
    if (!tip) return;
    const kullananUrunler = (stok || []).filter((p) => p.mamulTipi === tip.ad);
    if (kullananUrunler.length > 0) {
      return showToast(`Silinemiyor — bu tipteki şu ürünler kullanılıyor: ${kullananUrunler.map((p) => p.ad).join(", ")}`);
    }
    onSave({ ...tanimlar, mamulTipleri: (tanimlar.mamulTipleri || []).filter((m) => m.id !== id) });
  }

  // Bir malzeme tipini renge EKLER ya da ondan ÇIKARIR. Tek değerli atama yerine geçti: bir renk
  // birden fazla türde kullanılabildiği için ("Kahve" hem astar hem taban) atama değil, üyelik.
  function renkMalzemeTipiToggle(id, malzemeTipi) {
    onSave({
      ...tanimlar,
      renkler: tanimlar.renkler.map((r) => {
        if (r.id !== id) return r;
        const mevcut = renkTipleri(r);
        const yeni = mevcut.includes(malzemeTipi)
          ? mevcut.filter((t) => t !== malzemeTipi)
          : [...mevcut, malzemeTipi];
        return { ...r, malzemeTipleri: yeni, malzemeTipi: undefined };
      }),
    });
  }

  function addProses() {
    const ad = yeniProses.trim();
    if (!ad) return;
    const mevcut = tanimlar.prosesler || [];
    if (mevcut.some((p) => p.ad.toLowerCase() === ad.toLowerCase())) {
      return showToast("Bu proses zaten tanımlı");
    }
    const maxSira = mevcut.reduce((m, p) => Math.max(m, p.sira ?? 0), -1);
    // Her proses, barkod numaralarının birbirine karışmaması için farklı bir "binlik" aralıktan
    // başlar (1. proses 1000'ler, 2. proses 2000'ler, 3. proses 3000'ler...) — böylece bir barkod
    // numarasına bakarak hangi prosese ait olduğu otomatik anlaşılır. Zaten kullanılan bir aralıkla
    // çakışmayı da önler (proses silinip yeniden eklense bile).
    const kullanilanBaslangiclar = new Set(mevcut.map((p) => p.baslangicNo ?? 1000));
    let aday = 1000;
    while (kullanilanBaslangiclar.has(aday)) aday += 1000;
    onSave({ ...tanimlar, prosesler: [...mevcut, { id: uid("proses"), ad, sira: maxSira + 1, baslangicNo: aday }] });
    setYeniProses("");
  }

  function prosesBaslangicNoGuncelle(id, deger) {
    onSave({
      ...tanimlar,
      prosesler: (tanimlar.prosesler || []).map((p) => (p.id === id ? { ...p, baslangicNo: parseInt(deger, 10) || 1000 } : p)),
    });
  }

  function prosesSiraDegistir(id, yon) {
    const liste = [...(tanimlar.prosesler || [])].sort((a, b) => a.sira - b.sira);
    const idx = liste.findIndex((p) => p.id === id);
    const hedef = idx + yon;
    if (idx < 0 || hedef < 0 || hedef >= liste.length) return;
    const gecici = liste[idx].sira;
    liste[idx] = { ...liste[idx], sira: liste[hedef].sira };
    liste[hedef] = { ...liste[hedef], sira: gecici };
    onSave({ ...tanimlar, prosesler: liste });
  }

  function removeRenk(id) {
    // Stok kartlarında (doğrudan ya da bir model rengi kombinasyonu içinde) kullanılıyorsa silmeye izin verme.
    const kullananlar = hammaddeRenkKullanildigiUrunler(id);
    if (kullananlar.length > 0) {
      return showToast(`Silinemiyor — bu renk şu ürünlerde kullanılıyor: ${kullananlar.join(", ")}`);
    }
    // Kullanılmıyorsa: bu renge bağlı model rengi kombinasyonları varsa önce onları kaldır, sonra rengi sil.
    const baglıKombinasyonlar = (tanimlar.renkKombinasyonlari || []).filter((k) => k.renkIdler.includes(id));
    const kalanKombinasyonlar = (tanimlar.renkKombinasyonlari || []).filter((k) => !k.renkIdler.includes(id));
    onSave({
      ...tanimlar,
      renkler: tanimlar.renkler.filter((r) => r.id !== id),
      renkKombinasyonlari: kalanKombinasyonlar,
    });
    if (baglıKombinasyonlar.length > 0) {
      showToast(`Renk silindi — bağlı ${baglıKombinasyonlar.length} model rengi de kaldırıldı`);
    }
  }

  function removeOlcu(id) {
    onSave({ ...tanimlar, bedenler: tanimlar.bedenler.filter((b) => b.id !== id) });
  }

  function removeBirim(id) {
    onSave({ ...tanimlar, birimler: (tanimlar.birimler || []).filter((b) => b.id !== id) });
  }

  function removeProses(id) {
    onSave({ ...tanimlar, prosesler: (tanimlar.prosesler || []).filter((p) => p.id !== id) });
  }

  // Ara Proses: kendi başına "İşi Ver / Teslim Al" akışı işletilmeyen, sabit bir cariye (personele) bağlı
  // küçük bir işçilik kalemi. Reçetede bir asıl prosesin ARDINA eklenir; kendisinden sonraki asıl proses
  // işe verildiğinde otomatik olarak tamamlanır ve işçiliği kendi cariId'sine işlenir.
  function araProsesEkle(ad, cariId, ucret) {
    const temizAd = ad.trim();
    if (!temizAd) return showToast("Ara proses adı gerekli");
    if (!cariId) return showToast("Bir cari (personel) seçin");
    const mevcut = tanimlar.araProsesler || [];
    if (mevcut.some((p) => p.ad.toLowerCase() === temizAd.toLowerCase())) {
      return showToast("Bu ara proses zaten tanımlı");
    }
    onSave({ ...tanimlar, araProsesler: [...mevcut, { id: uid("araproses"), ad: temizAd, cariId, ucret: parseFloat(ucret) || 0 }] });
  }

  function araProsesUcretGuncelle(id, ucret) {
    onSave({
      ...tanimlar,
      araProsesler: (tanimlar.araProsesler || []).map((p) => (p.id === id ? { ...p, ucret: parseFloat(ucret) || 0 } : p)),
    });
  }

  function araProsesSil(id) {
    onSave({ ...tanimlar, araProsesler: (tanimlar.araProsesler || []).filter((p) => p.id !== id) });
  }

  // Fiyat Grupları: cariler bu gruplara atanır (Cari kartından), ürünlere de bu gruplar için özel
  // fiyat tanımlanabilir (Stok → ürün kartı → Fiyatlandırma). "Tip" o grubun Satış (müşteri grubu) ya
  // da Alış (tedarikçi grubu) fiyatlarında mı kullanılacağını belirtir.
  function fiyatGrubuEkle(ad, tip, paraBirimi = "TRY") {
    const temizAd = ad.trim();
    if (!temizAd) return showToast("Grup adı gerekli");
    const mevcut = tanimlar.fiyatGruplari || [];
    if (mevcut.some((g) => g.ad.toLowerCase() === temizAd.toLowerCase() && g.tip === tip)) {
      return showToast("Bu isimde bir grup zaten var");
    }
    onSave({ ...tanimlar, fiyatGruplari: [...mevcut, { id: uid("fgrup"), ad: temizAd, tip, paraBirimi }] });
  }

  function fiyatGrubuSil(id) {
    onSave({ ...tanimlar, fiyatGruplari: (tanimlar.fiyatGruplari || []).filter((g) => g.id !== id) });
  }

  // Kullanıcı tanımlama ve yetkilendirme (sadece Yönetici rolündeki kullanıcı bu bölümü kullanabilir).
  //
  // BULUT HESABI DA BURADAN (kullanıcı, 12 Eylül: "bulut hesabını uygulama içinden Supabase'e
  // bağlayalım"). Ekle / şifre / sil önce Supabase fonksiyonuna gidiyor; BULUT BAŞARISIZSA
  // Tanımlar kaydı DEĞİŞMİYOR — Tanımlar'da var, bulutta yok bir hesap (yarım kalmış) olmasın.
  //
  // ŞİFRE TANIMLAR'DA HİÇ SAKLANMIYOR (v1.445.0'dan beri): şifre doğrudan Supabase'e gidiyor.
  // Eski "yalnız yerel kaydet" yolu kaldırıldı — giriş yalnız bulut hesabıyla yapıldığı için
  // yerel kayıt giriş yapamazdı. Eskiden kalma `bulutHesabi: false` kayıtlar listede rozetle
  // görünür; satırdaki "şifre ver" bulut hesabını açar ve düz metin şifreyi siler.
  const [bulutIslemi, setBulutIslemi] = useState(null);
  const [yeniGrup, setYeniGrup] = useState({ ad: "", bas: "", son: "" });

  async function kullaniciEkle(ad, kullaniciAdi, sifre, rol) {
    const temizAd = ad.trim(), temizKA = kullaniciAdi.trim();
    if (!temizAd || !temizKA || !sifre) { showToast("Ad, kullanıcı adı ve şifre gerekli"); return false; }
    if (sifre.length < 6) { showToast("Şifre en az 6 karakter olmalı (bulut hesabı kuralı)"); return false; }
    const mevcut = tanimlar.kullanicilar || [];
    if (mevcut.some((k) => k.kullaniciAdi.toLocaleLowerCase("tr-TR") === temizKA.toLocaleLowerCase("tr-TR"))) {
      showToast("Bu kullanıcı adı zaten kullanılıyor"); return false;
    }
    const bosYetkiler = {};
    (MODULLER || []).forEach((m) => { bosYetkiler[m] = { goruntuleme: false, duzenleme: false, kaydetme: false, silme: false }; });
    // İLK KULLANICI HEP YÖNETİCİ (kullanıcı, 13 Eylül: veritabanını sıfırlayıp ilk kullanıcıyı
    // "Kullanıcı" rolüyle ekledi, girişi açtı, kısıtlı girdi — ve Kullanıcılar bölümü yalnız
    // Yönetici'ye göründüğü için düzeltemedi). Listede hiç Yönetici yoksa eklenen kişi Yönetici olur.
    const yoneticiVar = mevcut.some((k) => k.rol === "Yönetici");
    const nihaiRol = yoneticiVar ? (rol || "Kullanıcı") : "Yönetici";
    if (!yoneticiVar && rol !== "Yönetici") showToast("İlk kullanıcı Yönetici olarak eklendi — listede yönetici yoktu");
    const yeni = { id: uid("kullanici"), ad: temizAd, kullaniciAdi: temizKA, rol: nihaiRol, yetkiler: bosYetkiler };
    const eposta = kullaniciEposta(yeni);

    // OTURUMSUZ EKLEME = PANELDE AÇILMIŞ HESABI DOĞRULAMA (24 Eylül, v1.445.0). Hesap açan
    // `kullanici` fonksiyonu yönetici jetonu istiyor. Giriş kapalıyken (yeni kurulum, veritabanı
    // sıfırlandıktan sonra) jeton YOK — yerel kayıt yolu da kalktığı için ilk kullanıcı hiç
    // eklenemez, giriş de yöneticisiz açılamazdı: kilit. Çıkış: hesap Supabase panelinde açılır,
    // burada aynı e-posta + şifreyle GİRİŞ DENENİR; tutarsa kayıt bulut hesaplı eklenir. Doğrulama
    // için açılan oturum hemen kapatılıyor — giriş kapalıyken kimlik değişmesin.
    if (!(await gecerliJeton())) {
      setBulutIslemi("ekle");
      try {
        await supabaseGiris(eposta, sifre);
        supabaseCikis();
      } catch (e) {
        setBulutIslemi(null);
        showToast("Kullanıcı eklenmedi — bulut hesabı doğrulanamadı");
        window.alert(`Kullanıcı EKLENMEDİ: bulut oturumu yok ve ${eposta} hesabıyla giriş denenemedi.\n${bulutGirisSebebi(e)}\n\nGiriş kapalıyken hesap uygulamadan açılamaz. Supabase > Authentication > Users > Add user ile ${eposta} hesabını (aynı şifreyle, \"Auto Confirm\" işaretli) açıp tekrar ekleyin.`);
        return false;
      }
      setBulutIslemi(null);
      onSave({ ...tanimlar, kullanicilar: [...mevcut, { ...yeni, eposta, bulutHesabi: true }] });
      showToast(`${temizAd} eklendi · bulut hesabı doğrulandı: ${eposta}`);
      return true;
    }

    setBulutIslemi("ekle");
    const sonuc = await bulutKullaniciIslemi("ekle", eposta, sifre);
    setBulutIslemi(null);
    if (sonuc.tamam) {
      onSave({ ...tanimlar, kullanicilar: [...mevcut, { ...yeni, eposta, bulutHesabi: true }] });
      showToast(`${temizAd} eklendi · bulut hesabı: ${eposta}`);
      return true;
    }
    // BULUT OLMADI → KULLANICI EKLENMİYOR (24 Eylül, v1.445.0 — yerel şifre yedeği kaldırıldı).
    // Giriş artık YALNIZ Supabase'den: bulut hesabı olmayan kayıt hiçbir zaman giriş yapamaz.
    // Eskiden "yine de yerel kaydedilsin mi?" sorulup şifre Tanımlar'a DÜZ METİN yazılıyordu;
    // o kayıt hem işe yaramaz hem de şifreyi buluta açık taşırdı. Form doldurulmuş hâliyle
    // kalıyor (dönüş false) — sebep giderilince tek tıkla yeniden denenir.
    // Sebep hem toast'ta hem kalıcı pencerede: toast kaybolur, kurulum hatası okunmalı.
    showToast(`Kullanıcı eklenmedi — bulut hesabı açılamadı`);
    window.alert(`Kullanıcı EKLENMEDİ: bulut hesabı açılamadı.\n${sonuc.hata}\n\nGiriş yalnız bulut hesabıyla yapılıyor; hesap açılmadan eklenen kullanıcı giriş yapamazdı.`);
    return false;
  }

  async function kullaniciSil(id) {
    const k = (tanimlar.kullanicilar || []).find((x) => x.id === id);
    if (!k) return;
    if ((tanimlar.kullanicilar || []).filter((x) => x.rol === "Yönetici").length <= 1 && k.rol === "Yönetici") {
      return showToast("Son Yönetici hesabı silinemez");
    }
    if (aktifKullanici && aktifKullanici.id === id) return showToast("Kendi hesabınızı silemezsiniz");
    if (!window.confirm(`${k.ad} silinsin mi? Bulut hesabı da (${kullaniciEposta(k)}) silinecek.`)) return;
    setBulutIslemi("sil");
    const sonuc = await bulutKullaniciIslemi("sil", kullaniciEposta(k));
    setBulutIslemi(null);
    // Bulut oturumu/fonksiyon yoksa ve kullanıcının zaten bulut hesabı yoktu: yerel silme yeter.
    if (!sonuc.tamam && k.bulutHesabi !== false) {
      return showToast(`Bulut hesabı silinemedi, kayıt DURUYOR: ${sonuc.hata}`);
    }
    onSave({ ...tanimlar, kullanicilar: (tanimlar.kullanicilar || []).filter((x) => x.id !== id) });
    showToast(`${k.ad} silindi${sonuc.tamam ? " · bulut hesabı da silindi" : ""}`);
  }

  // Şifre değiştirme / bulut hesabını sonradan açma — listedeki kullanıcı satırından.
  async function kullaniciSifreDegistir(id, sifre) {
    const k = (tanimlar.kullanicilar || []).find((x) => x.id === id);
    if (!k) return false;
    if (!sifre || sifre.length < 6) { showToast("Şifre en az 6 karakter olmalı"); return false; }
    const eposta = kullaniciEposta(k);
    setBulutIslemi("sifre");
    // "ekle" idempotent: hesap varsa şifre güncellenir, yoksa açılır — "bulut hesabı aç" ile
    // "şifre değiştir" tek düğme.
    const sonuc = await bulutKullaniciIslemi("ekle", eposta, sifre);
    setBulutIslemi(null);
    if (!sonuc.tamam) { showToast(`Bulut: ${sonuc.hata}`); return false; }
    // Bulut kabul etti: yerel düz metin şifre SİLİNİYOR, e-posta ve rozet yazılıyor.
    onSave({
      ...tanimlar,
      kullanicilar: (tanimlar.kullanicilar || []).map((x) => {
        if (x.id !== id) return x;
        const { sifre: _eski, ...kalan } = x;
        return { ...kalan, eposta, bulutHesabi: true };
      }),
    });
    showToast(`${k.ad}: ${sonuc.mesaj}`);
    return true;
  }

  // ROL ŞABLONU UYGULA: rolü yazar ve yetki kutularını şablondan doldurur. "Özel (elle)" seçilirse
  // yalnız rol boşalır, kutulara DOKUNULMAZ — kullanıcı elle kurduğu yetkileri kaybetmesin.
  function rolSablonuUygula(id, rolKey) {
    const liste = (tanimlar.kullanicilar || []).map((k) => {
      if (k.id !== id) return k;
      if (!rolKey) return { ...k, rol: "" };
      const sablon = rolSablonu(rolKey);
      return {
        ...k,
        rol: rolKey,
        yetkiler: rolYetkileriKur(rolKey, MODULLER),
        panelEkrani: sablon && sablon.panelMi ? (k.panelEkrani || "barkod") : undefined,
      };
    });
    onSave({ ...tanimlar, kullanicilar: liste });
    showToast(rolKey ? `${rolKey} şablonu uygulandı` : "Yetkiler elle düzenlenecek");
  }

  function kullaniciAlanDegistir(id, alanlar) {
    onSave({ ...tanimlar, kullanicilar: (tanimlar.kullanicilar || []).map((k) => (k.id === id ? { ...k, ...alanlar } : k)) });
  }

  function kullaniciYetkiDegistir(id, modul, islemTipi, deger) {
    onSave({
      ...tanimlar,
      kullanicilar: (tanimlar.kullanicilar || []).map((k) =>
        k.id === id
          ? { ...k, yetkiler: { ...k.yetkiler, [modul]: { ...(k.yetkiler || {})[modul], [islemTipi]: deger } } }
          : k
      ),
    });
  }

  function kullaniciRolDegistir(id, rol) {
    onSave({ ...tanimlar, kullanicilar: (tanimlar.kullanicilar || []).map((k) => (k.id === id ? { ...k, rol } : k)) });
  }

  function firmaBilgisiGuncelle(alan, deger) {
    onSave({ ...tanimlar, firmaBilgileri: { ...(tanimlar.firmaBilgileri || {}), [alan]: deger } });
  }

  function firmaLogoYukle(dosya) {
    const okuyucu = new FileReader();
    okuyucu.onload = () => firmaBilgisiGuncelle("logo", okuyucu.result);
    okuyucu.readAsDataURL(dosya);
  }

  // ---- ÖZEL KOD ALANLARI ------------------------------------------------------------------
  // Kapsam "tur|ad" biçiminde tek değerde taşınıyor: `select` tek değer döndürüyor ve ikisini
  // ayrı state'te tutmak, birinin diğerinden habersiz değişmesine kapı açardı.
  function ozelKodAlaniEkle() {
    const ad = yeniKodAd.trim();
    if (!ad) return showToast("Alan adı gerekli");
    const [kapsamTuru, kapsamAd] = yeniKodKapsam.split("|");
    // Aynı kapsamda aynı ad iki kez: ürün kartında iki özdeş başlık çıkardı, hangisine
    // yazdığınızı ayırt edemezdiniz.
    const cakisma = (tanimlar.ozelKodAlanlari || []).some((a) =>
      (a.kapsamTuru || "genel") === kapsamTuru && String(a.kapsamAd || "") === (kapsamAd || "")
      && a.ad.toLocaleLowerCase("tr-TR") === ad.toLocaleLowerCase("tr-TR"));
    if (cakisma) return showToast("Bu kapsamda aynı adlı alan zaten var");
    onSave({
      ...tanimlar,
      ozelKodAlanlari: [...(tanimlar.ozelKodAlanlari || []),
        { id: uid("oka"), ad, kapsamTuru, kapsamAd: kapsamAd || "" }],
    });
    setYeniKodAd("");
  }

  function ozelKodAlaniAdDegistir(id, ad) {
    // Yalnız AD değişiyor; kimlik sabit kaldığı için girilmiş değerler yerinde kalıyor.
    onSave({
      ...tanimlar,
      ozelKodAlanlari: (tanimlar.ozelKodAlanlari || []).map((a) => (a.id === id ? { ...a, ad } : a)),
    });
  }

  function ozelKodAlaniSil(id) {
    // Alan siliniyor ama ÜRÜNLERDEKİ DEĞERLER silinmiyor: kayıtta duruyorlar. Alan geri
    // eklenirse aynı kimlikle gelmez, yani değer görünmez olur — ama veri kaybı yaşanmaz ve
    // yedekten dönmek mümkün kalır. Ürünleri tek tek gezip değer silmek, bir tanım
    // değişikliğinin yapmaması gereken bir şey.
    onSave({
      ...tanimlar,
      ozelKodAlanlari: (tanimlar.ozelKodAlanlari || []).filter((a) => a.id !== id),
    });
  }

  function asortiEkle(ad, oranlar) {
    const temizAd = ad.trim();
    if (!temizAd) return showToast("Asorti adı gerekli");
    const dolular = oranlar.filter((o) => parseFloat(o.oran) > 0);
    if (dolular.length === 0) return showToast("En az bir bedene oran girin");
    if ((tanimlar.asortiler || []).some((a) => a.ad.toLowerCase() === temizAd.toLowerCase())) {
      return showToast("Bu asorti adı zaten kullanılıyor");
    }
    onSave({
      ...tanimlar,
      asortiler: [...(tanimlar.asortiler || []), {
        id: uid("asorti"), ad: temizAd,
        oranlar: dolular.map((o) => ({ beden: o.beden, oran: parseFloat(o.oran) })),
      }],
    });
  }

  function asortiSil(id) {
    onSave({ ...tanimlar, asortiler: (tanimlar.asortiler || []).filter((a) => a.id !== id) });
  }

  const ara = (ad) => !aramaSorgusu.trim() || ad.toLocaleLowerCase("tr-TR").includes(aramaSorgusu.trim().toLocaleLowerCase("tr-TR"));

  const bedenGrubuTumu = tanimlar.bedenler.filter((b) => (b.tip || "Beden") === "Beden");
  const boyutGrubuTumu = tanimlar.bedenler.filter((b) => b.tip === "Boyut");
  // TEK RENK HAVUZU (9g, 13 Eylül): bütün renkler tek listede; kombinasyon etiketleri
  // ("1010 - Bej/Siyah") listede gösterilmez, onlar Model Rengi bölümünde yönetilir.
  const hammaddeRenkleriTumu = tanimlar.renkler.filter((r) => !kombinasyonEtiketiFormatindaMi(r.ad));
  // Model Rengi kombinasyonları artık hem Hammadde hem Mamul renklerinden kurulabildiği için,
  // RenkKombinasyonBolumu'na renk adı/kod çözümlemesi için HER İKİ tipi de içeren liste geçirilir —
  // aksi halde Stok'ta bir Mamul rengiyle oluşturulan kombinasyon burada "?" olarak görünür.
  // Model rengi kombinasyonları MAMUL renklerinden kurulur — bir modelin rengi hammadde
  // renklerinden oluşamaz. Kombinasyon etiketlerinin kendileri de havuzda yer almaz (iç içe
  // kombinasyon oluşmasın diye).
  const modelRengiIcinTumRenkler = tanimlar.renkler.filter(
    (r) => !kombinasyonEtiketiFormatindaMi(r.ad)
  );
  const bedenGrubu = bedenGrubuTumu.filter((b) => ara(b.ad));
  const boyutGrubu = boyutGrubuTumu.filter((b) =>
    ara(b.ad) && (filtreBoyutTipi === "Tümü"
      ? true
      : filtreBoyutTipi === "Genel"
        ? olcuTipleri(b).length === 0
        : olcuTipleri(b).includes(filtreBoyutTipi))
  );
  const hammaddeRenkleri = hammaddeRenkleriTumu.filter((r) =>
    ara(r.ad) && (filtreMalzemeTipi === "Tümü"
      ? true
      : filtreMalzemeTipi === "Genel"
        ? renkTipleri(r).length === 0
        : renkTipleri(r).includes(filtreMalzemeTipi))
  );
  const birimlerTumu = tanimlar.birimler || [];
  const birimler = birimlerTumu.filter((b) => ara(b.ad));
  const hammaddeTipleriGorunen = (tanimlar.hammaddeTipleri || []).filter((h) => ara(h.ad));
  const mamulTipleriGorunen = (tanimlar.mamulTipleri || []).filter((m) => ara(m.ad));

  const asortilerGorunen = (tanimlar.asortiler || []).filter((a) => ara(a.ad));

  return (
    <>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
      {[
        { obek: "Tanımlar", key: "firma", ad: "Firma" },
        { key: "urun", ad: "Ürün" },
        { key: "uretim", ad: "Üretim" },
        { obek: "Sistem", key: "kullanicilar", ad: "Kullanıcılar" },
        { key: "gorunum", ad: "Görünüm" },
        { key: "yayin", ad: "Yayın", yalnizYonetici: true },
        { key: "surumGecmisi", ad: "Sürüm geçmişi" },
        { obek: "Veri", key: "yedek", ad: "Yedek & Bulut" },
        { key: "bakim", ad: "Bakım" },
        { key: "cop", ad: `Çöp Kutusu${(cop || []).length > 0 ? ` (${cop.length})` : ""}` },
      ].filter((s) => !s.yalnizYonetici || (aktifKullanici && aktifKullanici.rol === "Yönetici")).map((s) => {
        const aktif = aktifTanimSekme === s.key;
        return (
          <React.Fragment key={s.key}>
          {s.obek && (
            <span data-tanim-obek={s.obek} style={{ alignSelf: "center", fontSize: 10, fontWeight: 700, letterSpacing: 1,
              color: "var(--erp-text-3)", textTransform: "uppercase", marginLeft: s.obek === "Tanımlar" ? 0 : 14, marginRight: 2 }}>
              {s.obek}
            </span>
          )}
          <button
            type="button"
            data-tanim-sekme={s.key}
            onClick={() => setAktifTanimSekme(s.key)}
            style={{
              padding: "7px 16px", borderRadius: "var(--erp-r-pill)", fontWeight: 700, fontSize: 13, cursor: "pointer",
              border: `1.5px solid ${aktif ? "#6B7A8F" : "var(--erp-border)"}`,
              background: aktif ? "#6B7A8F1A" : "#fff",
              color: aktif ? "#6B7A8F" : "var(--erp-text)",
            }}
          >
            {s.ad}
          </button>
          </React.Fragment>
        );
      })}
    </div>

    <div style={{ position: "relative", maxWidth: 340, marginBottom: 20 }}>
      <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "var(--erp-text-3)" }} />
      <input
        value={aramaSorgusu}
        onChange={(e) => setAramaSorgusu(e.target.value)}
        placeholder="Tanımlarda ara — renk, beden, birim, proses…"
        style={{
          width: "100%", padding: "8px 10px 8px 32px", borderRadius: "var(--erp-r-md)",
          border: "1px solid var(--erp-line)", background: "var(--erp-panel)", fontSize: 14,
        }}
      />
      {aramaSorgusu && (
        <button
          type="button"
          onClick={() => setAramaSorgusu("")}
          style={{ position: "absolute", right: 8, top: 7, border: "none", background: "none", color: "var(--erp-text-3)", cursor: "pointer", display: "flex" }}
        >
          <X size={15} />
        </button>
      )}
    </div>

    {/* TANIMLAR YENİDEN DÜZENLENDİ (23 Eylül, v1.419.0 — kullanıcı: "tanımlar çok iç içe ve alakasız
        yerler de var, toparla"). Eski "Genel" sekmesi firma bilgisi, mobil düzen, yayın, yedek, bulut,
        onarım ve sıfırlamayı üst üste yığıyordu. Şimdi tek düzey, üç öbek:
          TANIMLAR  Firma · Ürün · Üretim
          SİSTEM    Kullanıcılar · Görünüm · Yayın
          VERİ      Yedek & Bulut · Bakım · Çöp
        Bölümlerin İÇİ değişmedi (aynı bileşenler, aynı veri); yalnız yerleri. Eski "Sürüm yayınla"
        (bağlantı yazma) KALDIRILDI: GitHub'a yayınla aynı kaydı kendi tazeliyor. */}
    {aktifTanimSekme === "firma" && (
    <>
    <div style={{ marginBottom: 24, background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-lg)", padding: 16 }}>
      <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: "0 0 4px" }}>Firma Bilgileri</h3>
      <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 12px" }}>
        Logonuz ve firma bilgileriniz; Anasayfa'da, sol menüde, Cari Ekstre'de ve yazdırılan fişlerde
        otomatik olarak gösterilir.
      </p>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          {(tanimlar.firmaBilgileri || {}).logo && (
            <img
              src={tanimlar.firmaBilgileri.logo}
              alt="Firma logosu"
              style={{ width: 120, height: 60, objectFit: "contain", background: "#fff", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 6 }}
            />
          )}
          <label className="btn-ghost" style={{ cursor: "pointer", fontSize: 12 }}>
            <ImageIcon size={13} /> Logo Değiştir
            <input
              type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => { if (e.target.files[0]) firmaLogoYukle(e.target.files[0]); }}
            />
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flex: 1, minWidth: 280 }}>
          <Field label="Firma Unvanı">
            <input
              value={(tanimlar.firmaBilgileri || {}).unvan || ""}
              onChange={(e) => firmaBilgisiGuncelle("unvan", e.target.value)}
              style={inputStyle} placeholder="örn. Nihat Deri Atölyesi"
            />
          </Field>
          <Field label="Telefon">
            <input
              value={(tanimlar.firmaBilgileri || {}).telefon || ""}
              onChange={(e) => firmaBilgisiGuncelle("telefon", e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="E-posta">
            <input
              value={(tanimlar.firmaBilgileri || {}).email || ""}
              onChange={(e) => firmaBilgisiGuncelle("email", e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Web Sitesi">
            <input
              value={(tanimlar.firmaBilgileri || {}).website || ""}
              onChange={(e) => firmaBilgisiGuncelle("website", e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Vergi No / Dairesi">
            <input
              value={(tanimlar.firmaBilgileri || {}).vergiNo || ""}
              onChange={(e) => firmaBilgisiGuncelle("vergiNo", e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Adres">
            <input
              value={(tanimlar.firmaBilgileri || {}).adres || ""}
              onChange={(e) => firmaBilgisiGuncelle("adres", e.target.value)}
              style={inputStyle}
            />
          </Field>
        </div>

        {/* E-POSTA GÖNDERİM AYARLARI (kullanıcı, 13 Eylül: "kullanıcı mail bilgilerini girsin, o mail
            ile PDF gönderelim"). Gönderimi Supabase `eposta` fonksiyonu yapıyor; ayarları buradan
            (Tanımlar kaydı) okuyor. Şifre burada tutuluyor — 2. aşama bitmeden veritabanı anahtarla
            açık; başka yerde kullanılan bir şifre değil, sağlayıcının verdiği "uygulama şifresi" olmalı. */}
        {(() => {
          const e = (tanimlar.firmaBilgileri || {}).eposta || {};
          const guncelle = (alan, deger) => firmaBilgisiGuncelle("eposta", { ...e, [alan]: deger });
          return (
            <div data-eposta-ayarlari="1" style={{ marginTop: 14, borderTop: "1px solid var(--erp-line-soft)", paddingTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>E-posta gönderim ayarları <span style={{ fontWeight: 400, color: "var(--erp-text-3)" }}>— isteğe bağlı</span></div>
              <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginBottom: 8 }}>
                Boş bırakılırsa "E-posta" düğmesi telefonun paylaşım menüsünü PDF ekli açar (WhatsApp'la aynı),
                siz posta uygulamanızı seçersiniz; alıcı adresi panoya kopyalanır. Buraya bir hesap girilirse
                PDF doğrudan cari kartındaki adrese gönderilir (Supabase'de <span className="mono">eposta</span>
                fonksiyonu gerekir). Gmail: smtp.gmail.com · 465 · Google "uygulama şifresi". Outlook/365:
                smtp.office365.com · 587.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                <Field label="SMTP sunucu"><input value={e.sunucu || ""} placeholder="smtp.gmail.com" onChange={(ev) => guncelle("sunucu", ev.target.value)} style={inputStyle} /></Field>
                <Field label="Port"><input value={e.port || ""} placeholder="465" onChange={(ev) => guncelle("port", ev.target.value)} style={inputStyle} /></Field>
                <Field label="Güvenlik">
                  <select value={e.tls || ""} onChange={(ev) => guncelle("tls", ev.target.value)} style={inputStyle}>
                    <option value="">Porttan (465 TLS, 587 STARTTLS)</option>
                    <option value="tls">TLS (465)</option>
                    <option value="starttls">STARTTLS (587)</option>
                  </select>
                </Field>
                <Field label="Kullanıcı (e-posta adresi)"><input value={e.kullanici || ""} placeholder="atolye@gmail.com" onChange={(ev) => guncelle("kullanici", ev.target.value)} style={inputStyle} /></Field>
                <Field label="Şifre / uygulama şifresi"><input type="password" value={e.sifre || ""} onChange={(ev) => guncelle("sifre", ev.target.value)} style={inputStyle} /></Field>
                <Field label="Gönderen adı"><input value={e.gonderenAd || ""} placeholder="New Diamond Shoes" onChange={(ev) => guncelle("gonderenAd", ev.target.value)} style={inputStyle} /></Field>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
    </>
    )}

    {aktifTanimSekme === "urun" && (
    <>
    <div className="tanimlar-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 24, alignItems: "start" }}>
      {/* Renkler */}
      <div>
        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: "0 0 4px" }}>Renkler</h3>
        <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 12px" }}>
          Hammadde renkleri burada tanımlanır. Mamul ürünlerin renk varyantları, aşağıdaki "Model Rengi" bölümünde
          bu hammadde renklerinin kombinasyonlarından oluşturulur.
        </p>

        {/* FİRE SEBEPLERİ — hurda ve tamir kaydedilirken seçilir. Tanımlı liste kullanmanın sebebi
            raporlama: serbest metinle "malzeme hatası" ve "Malzeme Hatasi" ayrı satır olur ve
            gruplama anlamını yitirir. */}
        <Bolum baslik="Fire Sebepleri" renk="var(--erp-warn)">
          <p style={{ fontSize: 11, color: "var(--erp-text-2)", margin: "0 0 8px" }}>
            Üretimde bir çift hurdaya çıktığında ya da tamire gönderildiğinde seçilecek sebepler.
            Fire raporu bu sebeplere göre gruplanır.
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              value={yeniFireSebep}
              onChange={(e) => setYeniFireSebep(e.target.value)}
              placeholder="Örn. Deri yırtığı"
              style={inputStyle}
              onKeyDown={(e) => e.key === "Enter" && addFireSebep()}
            />
            <button className="btn-primary" onClick={addFireSebep}><Plus size={14} /></button>
          </div>
          {(tanimlar.fireSebepleri || []).length === 0 && (
            <div style={{ background: "var(--erp-hover)", border: "1px solid #C9A063", borderRadius: "var(--erp-r-md)", padding: 9, marginBottom: 10, fontSize: 11, color: "#7A3B22", lineHeight: 1.6 }}>
              Sebep tanımlanmadı. Bu durumda teslim alma ekranında varsayılan liste kullanılır:
              Malzeme hatası, İşçilik hatası, Kalıp / ölçü, Makine arızası, İkinci kalite.
              Kendi sebeplerinizi ekleyerek bu listeyi değiştirebilirsiniz.
            </div>
          )}
          <TanimListesi
            list={(tanimlar.fireSebepleri || []).map((x) => (typeof x === "string" ? { id: x, ad: x } : x)).filter((x) => ara(x.ad))}
            onRemove={removeFireSebep}
            emptyText=""
          />
        </Bolum>

        <Bolum baslik="Mamul Tipleri" renk="var(--erp-info)">
          <p style={{ fontSize: 11, color: "var(--erp-text-3)", margin: "0 0 8px" }}>
            Spor Ayakkabı, Sandalet, Bot gibi ürün türlerini tanımlayın — mamul stok kartı oluştururken
            bu türü seçebilir, Stok listesinde bu türe göre filtreleyebilirsiniz.
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              value={yeniMamulTipi}
              onChange={(e) => setYeniMamulTipi(e.target.value)}
              placeholder="Örn. Sandalet"
              style={inputStyle}
              onKeyDown={(e) => e.key === "Enter" && addMamulTipi()}
            />
            <button className="btn-primary" onClick={addMamulTipi}><Plus size={14} /></button>
          </div>
          <TanimListesi list={mamulTipleriGorunen} onRemove={removeMamulTipi} emptyText="Henüz mamul tipi tanımlanmadı." />
        </Bolum>

        <Bolum baslik="Hammadde Malzeme Tipleri" renk="var(--erp-purple)">
          <p style={{ fontSize: 11, color: "var(--erp-text-3)", margin: "0 0 8px" }}>
            Deri, taban, bağcık gibi malzeme türlerini tanımlayın — her hammadde rengini bir türe atayabilir,
            hammadde stok kartı oluştururken de bu türü seçebilirsiniz.
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              value={yeniHammaddeTipi}
              onChange={(e) => setYeniHammaddeTipi(e.target.value)}
              placeholder="Örn. Taban"
              style={inputStyle}
              onKeyDown={(e) => e.key === "Enter" && addHammaddeTipi()}
            />
            <button className="btn-primary" onClick={addHammaddeTipi}><Plus size={14} /></button>
          </div>
          <TanimListesi list={hammaddeTipleriGorunen} onRemove={removeHammaddeTipi} emptyText="Henüz malzeme tipi tanımlanmadı." />
        </Bolum>

        {/* MAMUL RENKLERİ — hammadde renklerinden tamamen ayrı liste.
            Önceden mamul renklerini yönetecek bir yer yoktu: yalnızca ürün kartındaki "Yeni Renk"
            kutusundan oluşturulabiliyor, sonradan adı düzeltilemiyor ya da silinemiyordu. */}
        {cakisanRenkKodlari.length > 0 && (
          <div data-renk-kod-cakisma={cakisanRenkKodlari.length} style={{ background: "var(--erp-orange-bg)", border: "1px solid #E1611F", borderRadius: "var(--erp-r-md)", padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#8A3F1A", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <b>Aynı kodu taşıyan renkler var:</b>
            <span className="mono">{cakisanRenkKodlari.map((c) => `${c.kod} → ${c.renkler.map((r) => `${r.ad} (${r.tip || "Mamul"})`).join(", ")}`).join(" · ")}</span>
            <button type="button" className="btn-primary" data-renk-kod-duzelt="1" style={{ padding: "4px 10px", fontSize: 11, marginLeft: "auto" }} onClick={cakisanRenkKodlariniDuzelt}>Düzelt</button>
          </div>
        )}
        {/* "Mamul Renkleri" bölümü KALDIRILDI (9g, tek renk havuzu; 14 Eylül temizliğinde `{false && …}`
            gizli bloğu da silindi). Mamulün rengi bütün renklerden ya da model rengi (kombinasyon)
            listesinden seçilir. */}

        <Bolum baslik="Renkler" renk="var(--erp-brown)">
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              value={yeniRenkHammadde}
              onChange={(e) => setYeniRenkHammadde(e.target.value)}
              placeholder="Örn. Ham Bej"
              style={inputStyle}
              onKeyDown={(e) => e.key === "Enter" && addRenk()}
            />
            <button className="btn-primary" onClick={() => addRenk()}><Plus size={14} /></button>
          </div>

          {(tanimlar.hammaddeTipleri || []).length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
              {["Tümü", "Genel", ...(tanimlar.hammaddeTipleri || []).map((h) => h.ad)].map((t) => {
                const aktif = filtreMalzemeTipi === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFiltreMalzemeTipi(t)}
                    style={{
                      padding: "4px 10px", borderRadius: "var(--erp-r-pill)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                      border: `1.5px solid ${aktif ? "var(--erp-purple)" : "var(--erp-border)"}`,
                      background: aktif ? "#EDE7F2" : "#fff", color: aktif ? "var(--erp-purple)" : "var(--erp-text-2)",
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          )}

          <TanimListesi
            list={hammaddeRenkleri} onRemove={removeRenk} emptyText="Bu filtreyle eşleşen hammadde rengi yok."
            onRenkKoduChange={renkKoduDegistir} onRenkTonKoduChange={renkTonKoduDegistir} onAdDegistir={onHammaddeRenkAdDegistir}
            barkodKodu={{ ad: "Renk kodu", hane: 4 }}
            bagliKombinasyonSayisi={(id) => (tanimlar.renkKombinasyonlari || []).filter((k) => k.renkIdler.includes(id)).length}
            kullanimGetir={hammaddeRenkKullanildigiUrunler}
            hammaddeTipleri={tanimlar.hammaddeTipleri || []}
            onMalzemeTipiToggle={renkMalzemeTipiToggle}
            defaultOpen
          />
        </Bolum>
      </div>

      {/* Bedenler & Boyutlar */}
      <div>
        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: "0 0 4px" }}>Bedenler & Boyutlar</h3>
        <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 12px" }}>
          Beden, sayısal ölçüler (39, 40, 42…) için; Boyut ise S/M/L gibi farklı bir ölçü sistemi için kullanılır.
        </p>

        <Bolum baslik="Beden">
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              value={yeniBeden}
              onChange={(e) => setYeniBeden(e.target.value)}
              placeholder="Yeni beden, örn. 42"
              style={inputStyle}
              onKeyDown={(e) => e.key === "Enter" && addOlcu("Beden")}
            />
            <button className="btn-primary" onClick={() => addOlcu("Beden")}><Plus size={14} /></button>
          </div>
          <TanimListesi list={bedenGrubu} onRemove={removeOlcu} emptyText="Henüz beden tanımlanmadı." mono barkodKodu={{ ad: "Beden kodu", hane: 2 }}
            onAdDegistir={onOlcuAdDegistir} adIpucu="Bedenin adını değiştirmek için tıklayıp düzenleyin — ürün varyantları, reçete, sipariş, üretim, koli ve asorti kayıtları otomatik hizalanır" />
        </Bolum>

        {/* TANIMSIZ ÖLÇÜLER (kullanıcı, 14 Eylül: "beden adı değişen kayıt var, beden adı
            değişikliği orada düzenlenmesi gerekiyordu"). Kayıtlarda geçip TANIMDA olmayan ölçüler —
            geçmişte serbest yazılmış ("3840" gibi birleşmiş) ya da tanımdan silinmiş adlar. Tanım
            listesinde görünmedikleri için düzenlenemiyorlardı. Burada iki yol var:
            • "Tanıma ekle": olduğu gibi tanımlara girer, sonra normal yoldan adı düzenlenebilir.
            • "Şuna çevir": kayıtlardaki adı seçilen TANIMLI ölçüyle değiştirir (birleştirme). */}
        {(() => {
          const tanimliAdlar = new Set((tanimlar.bedenler || []).map((b) => String(b.ad || "").trim().toLocaleLowerCase("tr-TR")));
          const kullanilan = new Map();   // görünen ad → kaç kayıt
          (kullanimdakiOlculer || []).forEach(({ ad, sayi }) => {
            const n = String(ad || "").trim();
            if (!n || tanimliAdlar.has(n.toLocaleLowerCase("tr-TR"))) return;
            kullanilan.set(n, (kullanilan.get(n) || 0) + sayi);
          });
          if (kullanilan.size === 0) return null;
          const bedenAdlari = bedenSirala(bedenGrubuTumu.map((b) => b.ad));
          return (
            <Bolum baslik={`Tanımsız Ölçüler (${kullanilan.size})`} renk="var(--erp-warn)">
              <div style={{ fontSize: 11, color: "var(--erp-text-2)", marginBottom: 8 }}>
                Kayıtlarda geçen ama tanım listesinde olmayan ölçüler. Tanıma ekleyip adını düzeltebilir
                ya da doğrudan tanımlı bir ölçüyle birleştirebilirsiniz; kayıtlar (ürün, reçete, stok
                hareketi, sipariş, üretim, koli, asorti) hizalanır.
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                {[...kullanilan.entries()].map(([ad, sayi]) => (
                  <div key={ad} data-tanimsiz-olcu={ad} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
                    background: "#fff", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: "5px 10px" }}>
                    <b className="mono" style={{ fontSize: 13 }}>{ad}</b>
                    <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{sayi} kayıtta</span>
                    <button type="button" className="btn-ghost" data-tanimsiz-ekle={ad} style={{ padding: "3px 9px", fontSize: 11 }}
                      title="Bu ölçüyü tanım listesine ekle — sonra adını normal yoldan düzenleyebilirsiniz"
                      onClick={() => onSave({ ...tanimlar, bedenler: [...(tanimlar.bedenler || []), { id: uid("olcu"), ad, tip: "Beden" }] })}>
                      <Plus size={11} /> Tanıma ekle
                    </button>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                      <span style={{ fontSize: 11, color: "var(--erp-text-2)" }}>şuna çevir:</span>
                      <select data-tanimsiz-cevir={ad} defaultValue=""
                        onChange={(e) => {
                          const hedef = e.target.value;
                          e.target.value = "";
                          if (!hedef || !onTanimsizOlcuCevir) return;
                          if (!window.confirm(`"${ad}" geçen ${sayi} kayıt "${hedef}" olarak değiştirilecek. Devam edilsin mi?`)) return;
                          onTanimsizOlcuCevir(ad, hedef);
                        }}
                        style={{ ...inputStyle, width: 120, padding: "3px 6px", fontSize: 11 }}>
                        <option value="">Seçin…</option>
                        {bedenAdlari.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </span>
                  </div>
                ))}
              </div>
            </Bolum>
          );
        })()}

        {/* BEDEN GRUPLARI (kullanıcı, 14 Eylül: "beden grupları oluşturalım — 36-40 seçince 36,37,
            38,39,40 seçilmiş olsun"). Grup, TANIMLI bedenlerin sıralı listesinden bir ARALIK ya da
            tek tek seçimle kurulur; ürün kartında "Beden Ekle" içinde tek dokunuşla hepsi eklenir.
            Kayıt beden ADLARINI tutuyor (kimlik değil): beden adı değişince `olcuAdDegistir`
            (13. bölüm) grupları da hizalıyor. */}
        <Bolum baslik="Beden Grubu">
          {(() => {
            const bedenAdlari = bedenSirala(bedenGrubuTumu.map((b) => b.ad));
            const gruplar = tanimlar.bedenGruplari || [];
            const kaydet = (yeni) => onSave({ ...tanimlar, bedenGruplari: yeni });
            return (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <Field label="Grup adı">
                    <input value={yeniGrup.ad} data-beden-grup-ad="1" onChange={(e) => setYeniGrup({ ...yeniGrup, ad: e.target.value })}
                      placeholder="örn. 36-40" style={{ ...inputStyle, width: 140 }} />
                  </Field>
                  <Field label="Baştan">
                    <select value={yeniGrup.bas} data-beden-grup-bas="1" onChange={(e) => setYeniGrup({ ...yeniGrup, bas: e.target.value })} style={{ ...inputStyle, width: 110 }}>
                      <option value="">Seçin…</option>
                      {bedenAdlari.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </Field>
                  <Field label="Sona">
                    <select value={yeniGrup.son} data-beden-grup-son="1" onChange={(e) => setYeniGrup({ ...yeniGrup, son: e.target.value })} style={{ ...inputStyle, width: 110 }}>
                      <option value="">Seçin…</option>
                      {bedenAdlari.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </Field>
                  <button className="btn-primary" data-beden-grup-ekle="1" style={{ padding: "6px 12px", fontSize: 12 }}
                    onClick={() => {
                      const i = bedenAdlari.indexOf(yeniGrup.bas), j = bedenAdlari.indexOf(yeniGrup.son);
                      if (i < 0 || j < 0) return showToast("Baş ve son bedeni seçin");
                      const secilen = bedenAdlari.slice(Math.min(i, j), Math.max(i, j) + 1);
                      const ad = yeniGrup.ad.trim() || `${secilen[0]}-${secilen[secilen.length - 1]}`;
                      if (gruplar.some((g) => g.ad.toLocaleLowerCase("tr-TR") === ad.toLocaleLowerCase("tr-TR"))) return showToast("Bu grup adı zaten var");
                      kaydet([...gruplar, { id: uid("bgrup"), ad, bedenler: secilen }]);
                      setYeniGrup({ ad: "", bas: "", son: "" });
                      showToast(`${ad}: ${secilen.length} beden`);
                    }}>
                    <Plus size={14} /> Grup Ekle
                  </button>
                </div>
                {gruplar.length === 0 ? (
                  <EmptyState text="Henüz beden grubu yok. Baş ve son bedeni seçip grup kurun." />
                ) : (
                  <div style={{ display: "grid", gap: 4 }}>
                    {gruplar.map((g) => (
                      <div key={g.id} data-beden-grup={g.ad} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
                        background: "#fff", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: "5px 10px" }}>
                        <b style={{ fontSize: 13 }}>{g.ad}</b>
                        <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)" }}>{(g.bedenler || []).join(" · ")}</span>
                        <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>({(g.bedenler || []).length} beden)</span>
                        <SilOnayButonu onConfirm={() => kaydet(gruplar.filter((x) => x.id !== g.id))} boyut={12} baslikNormal={`${g.ad} grubu silinsin mi?`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </Bolum>

        <Bolum baslik="Boyut">
          <p style={{ fontSize: 11, color: "var(--erp-text-2)", margin: "0 0 8px" }}>
            Bedenden farklı ölçüler: bağcık boyu, kutu ebadı, fermuar uzunluğu… Malzeme tipi seçerseniz
            bu boyut yalnızca o tipteki hammaddelerde listelenir.
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <input
              value={yeniBoyut}
              onChange={(e) => setYeniBoyut(e.target.value)}
              placeholder="Yeni boyut, örn. 16 cm"
              style={{ ...inputStyle, flex: "1 1 140px" }}
              onKeyDown={(e) => e.key === "Enter" && addOlcu("Boyut")}
            />
            {(tanimlar.hammaddeTipleri || []).length > 0 && (
              <select
                value={yeniBoyutTipi}
                onChange={(e) => setYeniBoyutTipi(e.target.value)}
                style={{ ...inputStyle, width: 130 }}
                title="Bu boyutun hangi malzeme tipine ait olduğu — boş bırakılırsa her tipte görünür"
              >
                <option value="">Genel</option>
                {(tanimlar.hammaddeTipleri || []).map((h) => <option key={h.id} value={h.ad}>{h.ad}</option>)}
              </select>
            )}
            <button className="btn-primary" onClick={() => addOlcu("Boyut")}><Plus size={14} /></button>
          </div>

          {(tanimlar.hammaddeTipleri || []).length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
              {["Tümü", "Genel", ...(tanimlar.hammaddeTipleri || []).map((h) => h.ad)].map((t) => {
                const aktif = filtreBoyutTipi === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFiltreBoyutTipi(t)}
                    style={{
                      padding: "4px 10px", borderRadius: "var(--erp-r-pill)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                      border: `1.5px solid ${aktif ? "var(--erp-purple)" : "var(--erp-border)"}`,
                      background: aktif ? "#EDE7F2" : "#fff", color: aktif ? "var(--erp-purple)" : "var(--erp-text-2)",
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          )}

          <TanimListesi
            list={boyutGrubu}
            onRemove={removeOlcu}
            emptyText={filtreBoyutTipi === "Tümü" ? "Henüz boyut tanımlanmadı." : "Bu filtreyle eşleşen boyut yok."}
            mono
            barkodKodu={{ ad: "Boyut kodu", hane: 2 }}
            hammaddeTipleri={tanimlar.hammaddeTipleri || []}
            onMalzemeTipiToggle={olcuMalzemeTipiToggle}
            onAdDegistir={onOlcuAdDegistir}
            adIpucu="Boyutun adını değiştirmek için tıklayıp düzenleyin — bağlı kayıtlar otomatik hizalanır"
          />
        </Bolum>
      </div>
    </div>

    <RenkKombinasyonBolumu
      hammaddeRenkleri={modelRengiIcinTumRenkler}
      kombinasyonlar={tanimlar.renkKombinasyonlari || []}
      onEkle={kombinasyonEkle}
      onSil={kombinasyonSil}
      kullanimGetir={(kombiId) => {
        const kombi = (tanimlar.renkKombinasyonlari || []).find((k) => k.id === kombiId);
        return kombi ? renkStringiniKullananUrunler(kombinasyonEtiketiHesapla(kombi)) : [];
      }}
    />
    <div className="tanimlar-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 24, alignItems: "start" }}>
      {/* Birimler */}
      <div>
        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: "0 0 4px" }}>Birimler</h3>
        <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 12px" }}>
          Stok kaydederken kullanacağınız ölçü birimlerini tanımlayın (örn. çift, koli, metre, top).
        </p>
        {/* KULLANIMDA OLUP LİSTEDE OLMAYAN BİRİMLER.
            Ürünler bu listeden bağımsız bir birim taşıyabiliyor (eski kayıt, varsayılan değer,
            büyük/küçük harf farkı). Böyle bir ürünün kartı açıldığında birim seçici listedeki
            İLK değeri gösteriyor ve kullanıcı ürünün birimini yanlış biliyor — kaydete basınca da
            gerçekten değişiyordu. Eksikleri burada tek tıkla eklemek, sorunu kaynağında kapatır. */}
        {(() => {
          const listedekiler = new Set((tanimlar.birimler || []).map((b) => b.ad));
          const eksikler = Array.from(new Set(
            (stok || []).map((u) => u.birim).filter((b) => b && !listedekiler.has(b))
          )).sort((a, b) => a.localeCompare(b, "tr"));
          if (eksikler.length === 0) return null;
          return (
            <div style={{ background: "var(--erp-hover)", border: "1px solid #C9A063", borderRadius: "var(--erp-r-md)", padding: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#7A3B22", lineHeight: 1.6, marginBottom: 7 }}>
                Şu birimler ürünlerde kullanılıyor ama bu listede yok. Eklenmezse o ürünlerin
                kartında birim yanlış görünür.
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {eksikler.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => onSave({ ...tanimlar, birimler: [...(tanimlar.birimler || []), { id: uid("birim"), ad: b }] })}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: "var(--erp-r-pill)", fontSize: 11, fontWeight: 700, cursor: "pointer", border: "1.5px solid #C9A063", background: "#fff", color: "#7A3B22" }}
                  >
                    <Plus size={11} /> {b}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            value={yeniBirim}
            onChange={(e) => setYeniBirim(e.target.value)}
            placeholder="Yeni birim, örn. koli"
            style={inputStyle}
            onKeyDown={(e) => e.key === "Enter" && addBirim()}
          />
          <button className="btn-primary" onClick={addBirim}><Plus size={14} /></button>
        </div>
        <TanimListesi list={birimler} onRemove={removeBirim} emptyText="Henüz birim tanımlanmadı." mono />
      </div>
    </div>
    <div style={{ marginTop: 28 }}>
      <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: "0 0 4px" }}>Asortiler</h3>
      <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 12px" }}>
        Bedenlere göre standart oran/set tanımlayın (örn. 36:1, 37:2, 38:3, 39:3, 40:2, 41:1). Sipariş ve Üretim'de
        "1 asorti" dediğinizde bu oranlar otomatik uygulanır.
      </p>

      {asortilerGorunen.length > 0 && (
        <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
          {asortilerGorunen.map((a) => (
            <div key={a.id} style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{a.ad}</span>
                {/* BARKOD KODU — sistem atar, değiştirilemez. Asorti barkodunun son üç hanesi bu. */}
                <span
                  className="mono"
                  title="Asorti kodu — sistem atar, değiştirilemez. Asorti barkodunun son üç hanesi bu."
                  style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: "var(--erp-r-sm)",
                    border: "1px solid #D9E2E9", background: "#EEF4F8",
                    color: a.barkodKodu ? "var(--erp-info)" : "var(--erp-warn)",
                  }}
                >
                  {a.barkodKodu ? `Asorti kodu: ${String(a.barkodKodu).padStart(3, "0")}` : "Asorti kodu yok"}
                </span>
                <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>
                  (toplam {a.oranlar.reduce((s, o) => s + o.oran, 0)} adet/set)
                </span>
                <SilOnayButonu onConfirm={() => asortiSil(a.id)} boyut={12} baslikNormal="Asorti silinsin mi?" />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {a.oranlar.map((o, i) => (
                  <span
                    key={i}
                    className="mono"
                    style={{
                      fontSize: 12, fontWeight: 600, background: "#fff", border: "1px solid var(--erp-line-soft)",
                      borderRadius: "var(--erp-r-pill)", padding: "3px 9px",
                    }}
                  >
                    {o.beden}: {o.oran}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AsortiOlusturucu bedenler={bedenGrubuTumu.concat(boyutGrubuTumu)} onKaydet={asortiEkle} />
    </div>
    <div style={{ marginTop: 28 }}>
      <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: "0 0 4px" }}>Fiyat Grupları</h3>
      <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 12px" }}>
        Müşteri/tedarikçi carilerini gruplara ayırın (örn. "Toptan Müşteri", "VIP Tedarikçi"). Cari kartından bir
        cariyi bir gruba atayabilir, Stok'ta bir ürünün "Fiyatlandırma" bölümünden o gruba özel fiyat
        tanımlayabilirsiniz — o gruptaki tüm cariler otomatik olarak bu fiyatı görür. Bir cariye ayrıca grubundan
        bağımsız, tamamen özel bir fiyat da (grup harici) verilebilir.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <select value={yeniFiyatGrubuTipi} onChange={(e) => setYeniFiyatGrubuTipi(e.target.value)} style={{ ...inputStyle, width: 130 }}>
          <option value="Satış">Satış (Müşteri)</option>
          <option value="Alış">Alış (Tedarikçi)</option>
        </select>
        <select value={yeniFiyatGrubuPb} data-fiyat-grubu-pb="1" onChange={(e) => setYeniFiyatGrubuPb(e.target.value)}
          title="Bu grubun fiyatları hangi para biriminde" style={{ ...inputStyle, width: 90 }}>
          <option value="TRY">₺ TRY</option>
          <option value="USD">$ USD</option>
          <option value="EUR">€ EUR</option>
        </select>
        <input
          value={yeniFiyatGrubu}
          onChange={(e) => setYeniFiyatGrubu(e.target.value)}
          placeholder="Örn. Toptan Müşteri"
          style={inputStyle}
          onKeyDown={(e) => { if (e.key === "Enter") { fiyatGrubuEkle(yeniFiyatGrubu, yeniFiyatGrubuTipi, yeniFiyatGrubuPb); setYeniFiyatGrubu(""); } }}
        />
        <button className="btn-primary" onClick={() => { fiyatGrubuEkle(yeniFiyatGrubu, yeniFiyatGrubuTipi, yeniFiyatGrubuPb); setYeniFiyatGrubu(""); }}><Plus size={14} /></button>
      </div>
      {(tanimlar.fiyatGruplari || []).length === 0 ? (
        <EmptyState text="Henüz fiyat grubu tanımlanmadı." />
      ) : (
        <div style={{ border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", overflow: "hidden", background: "#fff" }}>
          {(tanimlar.fiyatGruplari || []).filter((g) => ara(g.ad)).map((g, i, arr) => (
            <div
              key={g.id}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--erp-line-soft)",
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: "var(--erp-r-pill)",
                  background: alfaEkle((g.tip === "Alış" ? "var(--erp-brown)" : "var(--erp-info)"), "22"), color: g.tip === "Alış" ? "var(--erp-brown)" : "var(--erp-info)",
                }}
              >
                {g.tip}{g.paraBirimi && g.paraBirimi !== "TRY" ? ` · ${g.paraBirimi}` : ""}
              </span>
              {/* GRUP DÜZENLEME (kullanıcı, 21 Eylül: "fiyat grubu"). Para birimi alanı v1.398'de
                  eklendi; ondan önce açılmış "Toptan USD" gibi gruplar TL sayılıyordu ve grubu
                  silip yeniden açmak tek yoldu. Ad, tip ve para birimi satır içinde düzenlenir;
                  değişiklik anında kaydedilir (tanımlar ekranının geri kalanı gibi). */}
              <input value={g.ad} data-fiyat-grubu-ad={g.id}
                onChange={(e) => onSave({ ...tanimlar, fiyatGruplari: tanimlar.fiyatGruplari.map((x) => (x.id === g.id ? { ...x, ad: e.target.value } : x)) })}
                style={{ fontSize: 13, flex: 1, padding: "4px 8px", border: "1px solid var(--erp-border-2)", borderRadius: "var(--erp-r-sm)", background: "#fff" }} />
              <select value={g.tip} data-fiyat-grubu-tip={g.id}
                onChange={(e) => onSave({ ...tanimlar, fiyatGruplari: tanimlar.fiyatGruplari.map((x) => (x.id === g.id ? { ...x, tip: e.target.value } : x)) })}
                style={{ fontSize: 12, padding: "4px 6px", border: "1px solid var(--erp-border-2)", borderRadius: "var(--erp-r-sm)" }}>
                <option value="Satış">Satış</option>
                <option value="Alış">Alış</option>
              </select>
              <select value={g.paraBirimi || "TRY"} data-fiyat-grubu-pb-duzenle={g.id}
                title="Bu grubun fiyatları hangi para biriminde — ürünlerdeki kayıtlı fiyatlar bu birimde okunur"
                onChange={(e) => onSave({ ...tanimlar, fiyatGruplari: tanimlar.fiyatGruplari.map((x) => (x.id === g.id ? { ...x, paraBirimi: e.target.value } : x)) })}
                style={{ fontSize: 12, padding: "4px 6px", border: "1px solid var(--erp-border-2)", borderRadius: "var(--erp-r-sm)",
                  fontWeight: 700, color: (g.paraBirimi || "TRY") === "TRY" ? "var(--erp-text-2)" : "var(--erp-info)" }}>
                <option value="TRY">₺ TRY</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
              </select>
              <SilOnayButonu onConfirm={() => fiyatGrubuSil(g.id)} boyut={13} baslikNormal={`"${g.ad}" fiyat grubu silinsin mi? Bu gruba atanmış carilerin grubu boşalır.`} />
            </div>
          ))}
        </div>
      )}
    </div>
    <div style={{ marginTop: 28 }}>
    <div style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-lg)", padding: 16 }}>
      <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: "0 0 4px" }}>Özel Kod Alanları</h3>
      <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 12px" }}>
        Alan <b>başlıkları</b> burada tanımlanır, <b>değerler</b> her ürünün kendi kartındaki
        Tanımlar › Ürün › Özel Kod Alanları bölümünden girilir (Düzenle ile). Alanlar <b>stok tipine</b> bağlanabilir:
        Taban'ın alanları Deri'de görünmez. "Genel" alanlar her üründe görünür.
        Başlık sonradan değişse de girilmiş değerler yerinde kalır — değer başlığa değil alanın
        KİMLİĞİNE bağlıdır.
      </p>

      {/* YENİ ALAN — ad + kapsam birlikte. Kapsamı sonradan seçtiren bir akış, alanın nereye ait
          olduğunu belirsiz bırakırdı. */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <input
          value={yeniKodAd}
          onChange={(e) => setYeniKodAd(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ozelKodAlaniEkle(); }}
          placeholder="Örn. Kalınlık"
          title="Yeni özel kod alanı adı"
          style={{ ...inputStyle, maxWidth: 220 }}
        />
        <select
          value={yeniKodKapsam}
          onChange={(e) => setYeniKodKapsam(e.target.value)}
          title="Alanın kapsamı"
          style={{ ...inputStyle, maxWidth: 260 }}
        >
          <option value="genel|">Genel — her üründe</option>
          {(tanimlar.hammaddeTipleri || []).map((h) => (
            <option key={`m${h.id}`} value={`malzeme|${h.ad}`}>Malzeme tipi: {h.ad}</option>
          ))}
          {(tanimlar.mamulTipleri || []).map((m) => (
            <option key={`u${m.id}`} value={`mamul|${m.ad}`}>Mamul tipi: {m.ad}</option>
          ))}
          {/* Sezon yalnız mamulde dolduruluyor; sezona bağlı alan da doğal olarak yalnız
              mamullerde çıkıyor. */}
          {SEZONLAR.map((sz) => (
            <option key={`s${sz}`} value={`sezon|${sz}`}>Sezon: {sz}</option>
          ))}
        </select>
        <button className="btn-primary" onClick={ozelKodAlaniEkle}><Plus size={14} /> Alan Ekle</button>
      </div>

      {(tanimlar.ozelKodAlanlari || []).length === 0 ? (
        // Boş liste ÇIKMAZ SOKAK OLMAMALI: ekleme formu yukarıda duruyor, burada yalnızca
        // durumun ne olduğu yazıyor. Alan yoksa ürün kartındaki sekme de çıkmıyor.
        <div style={{ fontSize: 13, color: "var(--erp-warn)" }}>
          Henüz özel kod alanı yok. Alan eklenmeden ürün kartında "Özel Kodlar" sekmesi görünmez.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {/* KAPSAMA GÖRE GRUPLANMIŞ. Düz bir liste, "bu alan hangi ürünlerde çıkıyor?" sorusunu
              her satırda yeniden sordururdu. */}
          {[
            { anahtar: "genel|", baslik: "Genel — her üründe" },
            ...(tanimlar.hammaddeTipleri || []).map((h) => ({ anahtar: `malzeme|${h.ad}`, baslik: `Malzeme tipi: ${h.ad}` })),
            ...(tanimlar.mamulTipleri || []).map((m) => ({ anahtar: `mamul|${m.ad}`, baslik: `Mamul tipi: ${m.ad}` })),
            ...SEZONLAR.map((sz) => ({ anahtar: `sezon|${sz}`, baslik: `Sezon: ${sz}` })),
          ].map((grup) => {
            const [tur, ad] = grup.anahtar.split("|");
            const alanlar = (tanimlar.ozelKodAlanlari || [])
              .filter((a) => (a.kapsamTuru || "genel") === tur && String(a.kapsamAd || "") === ad);
            if (alanlar.length === 0) return null;
            return (
              <div key={grup.anahtar}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text-2)", marginBottom: 6 }}>
                  {grup.baslik.toLocaleUpperCase("tr-TR")}
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {alanlar.map((a) => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: "6px 10px" }}>
                      <input
                        defaultValue={a.ad}
                        // Boş bırakılan ad kaydedilmiyor: adsız bir alan, değerini okunamaz kılar.
                        onBlur={(e) => {
                          const yeni = e.target.value.trim();
                          if (!yeni) { e.target.value = a.ad; return; }
                          if (yeni !== a.ad) ozelKodAlaniAdDegistir(a.id, yeni);
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                        title="Alan başlığı — değiştirmek girilmiş değerleri etkilemez"
                        style={{ ...inputStyle, flex: 1, minWidth: 120 }}
                      />
                      <SilOnayButonu onConfirm={() => ozelKodAlaniSil(a.id)} boyut={12} baslikNormal="Özel kod alanı silinsin mi?" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {/* KAPSAMI ARTIK OLMAYAN ALANLAR — tip silinmişse alan öksüz kalır. Gizlemek yerine
              gösteriliyor: değerleri hâlâ duruyor ve kullanıcı ne yapacağına kendisi karar versin. */}
          {(() => {
            const gecerli = new Set([
              "genel|",
              ...(tanimlar.hammaddeTipleri || []).map((h) => `malzeme|${h.ad}`),
              ...(tanimlar.mamulTipleri || []).map((m) => `mamul|${m.ad}`),
              ...SEZONLAR.map((sz) => `sezon|${sz}`),
            ]);   // sirasiz-tamam
            const oksuz = (tanimlar.ozelKodAlanlari || [])
              .filter((a) => !gecerli.has(`${a.kapsamTuru || "genel"}|${a.kapsamAd || ""}`));
            if (oksuz.length === 0) return null;
            return (
              <div style={{ border: "1px solid #C9A063", background: "var(--erp-hover)", borderRadius: "var(--erp-r-md)", padding: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#7A3B22", marginBottom: 6 }}>
                  Tipi silinmiş alanlar — hiçbir üründe görünmüyor
                </div>
                <div style={{ display: "grid", gap: 5 }}>
                  {oksuz.map((a) => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <span style={{ fontWeight: 600 }}>{a.ad}</span>
                      <span className="mono" style={{ fontSize: 11, color: "#7A3B22" }}>{a.kapsamAd}</span>
                      <SilOnayButonu onConfirm={() => ozelKodAlaniSil(a.id)} boyut={12} baslikNormal="Özel kod alanı silinsin mi?" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
    </div>
    </>
    )}

    {aktifTanimSekme === "uretim" && (
    <>
    <div className="tanimlar-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 24, alignItems: "start" }}>
      {/* Prosesler */}
      <div>
        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: "0 0 4px" }}>Prosesler</h3>
        <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 12px" }}>
          Üretim aşamalarını sırasıyla tanımlayın (örn. 1. Kesim, 2. Dikim, 3. Montaj). Reçetede hammadde eklerken
          hangi proseste kullanıldığını seçebilirsiniz; reçete listesi de bu sıraya göre gruplanır.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            value={yeniProses}
            onChange={(e) => setYeniProses(e.target.value)}
            placeholder="Yeni proses, örn. Kesim"
            style={inputStyle}
            onKeyDown={(e) => e.key === "Enter" && addProses()}
          />
          <button className="btn-primary" onClick={addProses}><Plus size={14} /></button>
        </div>
        {(tanimlar.prosesler || []).length === 0 ? (
          <EmptyState text="Henüz proses tanımlanmadı." />
        ) : (
          <div style={{ border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", overflow: "hidden", background: "#fff" }}>
            {[...tanimlar.prosesler].sort((a, b) => a.sira - b.sira).map((p, i, arr) => (
              // Proses rengi SIRAYA göre belirlenir; uygulamanın her yerinde (üretim kartı,
              // reçete rozetleri, atölye ekranı) aynı fonksiyon kullanılıyor. Tanımlar listesinin
              // renksiz kalması, kullanıcının rengi burada öğrenip başka ekranda tanımasını
              // engelliyordu — renk ancak tutarlı olduğunda bilgi taşır.
              <div
                key={p.id}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                  borderLeft: `4px solid ${prosesRengi(p.ad, i)}`,
                  background: prosesZemini(p.ad, i),
                  borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--erp-line-soft)",
                  opacity: ara(p.ad) ? 1 : 0.3,
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 11, fontWeight: 700, color: "var(--erp-panel-2)", background: prosesRengi(p.ad, i),
                    width: 22, height: 22, borderRadius: "50%", display: "flex",
                    alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                {/* İKON SEÇİCİ — prosesin kendi rengiyle. Renk sekiz prosesten sonra tekrara
                    başlıyor; ikon renkten bağımsız ikinci bir ayırt edici.
                    Seçilmezse addan türetilen makul bir varsayılan kullanılır. */}
                <select
                  value={p.ikon || prosesIkonVarsayilan(p.ad)}
                  onChange={(e) => {
                    const yeni = (tanimlar.prosesler || []).map((x) =>
                      x.id === p.id ? { ...x, ikon: e.target.value } : x
                    );
                    onSave({ ...tanimlar, prosesler: yeni });
                  }}
                  title="Bu prosesin ikonu — üretim kartında, reçetede ve atölye ekranında görünür"
                  style={{
                    width: 34, height: 26, padding: "0 2px", fontSize: 11, cursor: "pointer",
                    border: `1px solid ${alfaEkle(prosesRengi(p.ad, i), "55")}`, borderRadius: "var(--erp-r-sm)",
                    background: alfaEkle(prosesRengi(p.ad, i), "14"), color: prosesRengi(p.ad, i), flexShrink: 0,
                  }}
                >
                  {Object.entries(PROSES_IKONLARI).map(([anahtar, v]) => (
                    <option key={anahtar} value={anahtar}>{v.etiket}</option>
                  ))}
                </select>
                <span style={{ display: "flex", alignItems: "center", color: prosesRengi(p.ad, i), flexShrink: 0 }}>
                  <ProsesIkonu proses={p.ad} tanimlarProsesler={tanimlar.prosesler} size={18} />
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, flex: 1, color: prosesRengi(p.ad, i) }}>{p.ad}</span>
                <label style={{ display: "flex", alignItems: "center", gap: 4 }} title="Bu proses için otomatik barkod kodları bu numaradan başlayarak sıralanır">
                  <span style={{ fontSize: 10, color: "var(--erp-text-3)" }}>Barkod Başlangıç:</span>
                  <input
                    type="number"
                    defaultValue={p.baslangicNo ?? 1000}
                    onBlur={(e) => prosesBaslangicNoGuncelle(p.id, e.target.value)}
                    className="mono"
                    style={{ width: 60, padding: "2px 5px", fontSize: 11, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)" }}
                  />
                </label>
                <button
                  onClick={() => prosesSiraDegistir(p.id, -1)}
                  disabled={i === 0}
                  title="Yukarı taşı"
                  style={{ border: "none", background: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "var(--erp-border-2)" : "var(--erp-text-2)", display: "flex" }}
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => prosesSiraDegistir(p.id, 1)}
                  disabled={i === arr.length - 1}
                  title="Aşağı taşı"
                  style={{ border: "none", background: "none", cursor: i === arr.length - 1 ? "default" : "pointer", color: i === arr.length - 1 ? "var(--erp-border-2)" : "var(--erp-text-2)", display: "flex" }}
                >
                  <ChevronDown size={16} />
                </button>
                <button onClick={() => removeProses(p.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--erp-text-3)", display: "flex" }}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ara Prosesler */}
      <div style={{ marginTop: 28 }}>
        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: "0 0 4px" }}>Ara Prosesler</h3>
        <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 12px" }}>
          Kendi başına "İşi Ver / Teslim Al" adımı işletilmeyen, küçük ve sabit bir cariye (personele) bağlı
          işçilik kalemleri (örn. "Kampre" — saya dikişiyle birlikte otomatik yapılan bir iş). Reçetede bir
          asıl prosesin ardına eklendiğinde, kendisinden sonraki asıl proses işe verildiğinde otomatik olarak
          tamamlanır ve işçiliği kendi cariye (personele) işlenir.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <input
            value={yeniAraProses}
            onChange={(e) => setYeniAraProses(e.target.value)}
            placeholder="Yeni ara proses, örn. Kampre"
            style={{ ...inputStyle, flex: "1 1 200px" }}
          />
          <select value={yeniAraProsesCariId} onChange={(e) => setYeniAraProsesCariId(e.target.value)} style={{ ...inputStyle, width: 200 }}>
            <option value="">Cari (personel) seçin</option>
            {(cariler || []).filter((c) => c.tip === "Personel" || c.tip === "Her İkisi").map((c) => (
              <option key={c.id} value={c.id}>{c.unvan}</option>
            ))}
          </select>
          <input
            type="number" step="0.01" min="0"
            value={yeniAraProsesUcret}
            onChange={(e) => setYeniAraProsesUcret(e.target.value)}
            placeholder="Ücret (₺/adet)"
            style={{ ...inputStyle, width: 130 }}
          />
          <button
            className="btn-primary"
            onClick={() => {
              araProsesEkle(yeniAraProses, yeniAraProsesCariId, yeniAraProsesUcret);
              setYeniAraProses(""); setYeniAraProsesCariId(""); setYeniAraProsesUcret("");
            }}
          >
            <Plus size={14} />
          </button>
        </div>
        {(tanimlar.araProsesler || []).length === 0 ? (
          <EmptyState text="Henüz ara proses tanımlanmadı." />
        ) : (
          <div style={{ border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", overflow: "hidden", background: "#fff" }}>
            {tanimlar.araProsesler.map((p, i, arr) => {
              const cariAdi = ((cariler || []).find((c) => c.id === p.cariId) || {}).unvan;
              return (
                <div
                  key={p.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                    // Ara prosesler ALTIN tonda: ana proseslerle aynı listede değiller ve
                    // akışta ayrı davranıyorlar (kendi "iş ver / teslim al" adımı yok).
                    // Ayrı bir renk ailesi, bu farkı hatırlatır.
                    borderLeft: "4px solid #8A6A2E",
                    background: "#8A6A2E0F",
                    borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--erp-line-soft)",
                    opacity: ara(p.ad) ? 1 : 0.3,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, flex: 1, color: "#8A6A2E" }}>{p.ad}</span>
                  <span className="mono" style={{ fontSize: 12, color: "var(--erp-purple)", fontWeight: 600 }}>{cariAdi || "—"}</span>
                  <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="number" step="0.01" min="0"
                      defaultValue={p.ucret || ""}
                      onBlur={(e) => araProsesUcretGuncelle(p.id, e.target.value)}
                      placeholder="0"
                      className="mono"
                      style={{ width: 64, padding: "3px 5px", fontSize: 11, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)" }}
                    />
                    <span style={{ fontSize: 10, color: "var(--erp-text-3)" }}>₺/adet</span>
                  </label>
                  <button onClick={() => araProsesSil(p.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--erp-text-3)", display: "flex" }}>
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </>
    )}

    {/* REÇETE ŞABLONLARI (21 Eylül): standart malzeme listeleri. Ürün reçetesinde ve model
        reçetesinde "şablondan ekle" ile kullanılır; burada ad, satır miktarı düzenlenir, satır
        eklenir ya da silinir. Şablonu reçeteden de oluşturabilirsiniz (ürün › Reçete). */}
    {aktifTanimSekme === "uretim" && (
      <div data-recete-sablonlari="1" style={{ border: "1px solid var(--erp-border)", borderRadius: "var(--erp-r-md)", padding: 12, marginTop: 14, background: "#fff" }}>
        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: "0 0 4px" }}>Reçete şablonları</h3>
        <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 10px", lineHeight: 1.5 }}>
          Her ayakkabıda standart kullanılan malzemeler (yapıştırıcı, silme suyu, fort bombe…). Ürün ve model
          reçetesinde <b>şablondan ekle</b> ile tek seferde gelir; zaten olan malzeme tekrar eklenmez.
        </p>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <input value={yeniSablonAdi} data-yeni-sablon-adi="1" onChange={(e) => setYeniSablonAdi(e.target.value)}
            placeholder="Yeni şablon: Standart bot malzemeleri" style={{ ...inputStyle, maxWidth: 280 }} />
          <button type="button" className="btn-ghost" data-yeni-sablon-ekle="1" onClick={() => {
            const ad = String(yeniSablonAdi || "").trim(); if (!ad) return showToast("Şablon adı gerekli");
            onSave({ ...tanimlar, receteSablonlari: [...(tanimlar.receteSablonlari || []), { id: uid("rsab"), ad, satirlar: [] }] });
            setYeniSablonAdi(""); showToast(`"${ad}" şablonu açıldı — malzeme ekleyin`);
          }}><Plus size={12} /> Şablon aç</button>
        </div>
        {(tanimlar.receteSablonlari || []).length === 0 && <EmptyState text="Henüz şablon yok." />}
        {(tanimlar.receteSablonlari || []).map((sb) => {
          const guncelle = (yeni) => onSave({ ...tanimlar, receteSablonlari: (tanimlar.receteSablonlari || []).map((x) => (x.id === sb.id ? { ...x, ...yeni } : x)) });
          const hammaddeler = (stok || []).filter((u) => u.kategori === "Hammadde" && !u.pasif);
          return (
            <div key={sb.id} data-recete-sablonu={sb.id} style={{ border: "1px solid var(--erp-border-2)", borderRadius: "var(--erp-r-sm)", padding: 8, marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <input value={sb.ad} onChange={(e) => guncelle({ ad: e.target.value })}
                  style={{ flex: 1, fontSize: 13, fontWeight: 700, padding: "4px 8px", border: "1px solid var(--erp-border-2)", borderRadius: "var(--erp-r-sm)" }} />
                <SilOnayButonu boyut={13} baslikNormal={`"${sb.ad}" şablonu silinsin mi? Reçetelere eklenmiş satırlar kalır.`}
                  onConfirm={() => onSave({ ...tanimlar, receteSablonlari: (tanimlar.receteSablonlari || []).filter((x) => x.id !== sb.id) })} />
              </div>
              {(sb.satirlar || []).map((sa) => (
                <div key={sa.id} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, padding: "3px 0", borderTop: "1px solid var(--erp-border-2)", flexWrap: "wrap" }}>
                  <span style={{ flex: "1 1 160px", fontWeight: 700 }}>{sa.hammaddeAd}<span style={{ fontWeight: 400, color: "var(--erp-text-3)" }}>
                    {sa.renk && sa.renk !== "Standart" ? ` · ${sa.renk}` : ""}{sa.beden && sa.beden !== "Standart" ? ` · ${sa.beden}` : ""}{sa.proses ? ` · ${sa.proses}` : ""}</span></span>
                  <input type="number" min="0" step="any" defaultValue={sa.miktar}
                    onBlur={(e) => guncelle({ satirlar: sb.satirlar.map((x) => (x.id === sa.id ? { ...x, miktar: parseFloat(e.target.value) || 0 } : x)) })}
                    style={{ width: 80, padding: "2px 6px", fontSize: 12, textAlign: "right", border: "1px solid var(--erp-border)", borderRadius: "var(--erp-r-sm)" }} />
                  <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)", minWidth: 40 }}>{sa.birim}</span>
                  <SilOnayButonu boyut={11} baslikNormal={`${sa.hammaddeAd} şablondan çıkarılsın mı?`}
                    onConfirm={() => guncelle({ satirlar: sb.satirlar.filter((x) => x.id !== sa.id) })} />
                </div>
              ))}
              {/* Satır ekle: hammadde → renk/boy (varyantlarından) → proses → miktar */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
                <select data-sablon-hammadde={sb.id} defaultValue="" onChange={(e) => {
                  const h = hammaddeler.find((u) => u.id === e.target.value); e.target.value = "";
                  if (!h) return;
                  const v0 = (h.variants || [])[0] || {};
                  guncelle({ satirlar: [...(sb.satirlar || []), { id: uid("ss"), hammaddeUrunId: h.id, hammaddeAd: h.ad,
                    renk: v0.renk || "Standart", beden: v0.beden || "Standart", miktar: 1, birim: h.birim || "", proses: "" }] });
                }} style={{ ...inputStyle, maxWidth: 220, fontSize: 12, padding: "4px 6px" }}>
                  <option value="">+ malzeme ekle</option>
                  {hammaddeler.map((h) => <option key={h.id} value={h.id}>{h.ad}</option>)}
                </select>
                <span style={{ fontSize: 10, color: "var(--erp-text-3)" }}>Renk/boy ilk varyanttan gelir; farklıysa reçeteden şablon oluşturun.</span>
              </div>
            </div>
          );
        })}
      </div>
    )}

    {aktifTanimSekme === "kullanicilar" && (
    <>
      {/* KİLİT ÇÖZÜCÜ: giriş yapan Yönetici değil ve listede hiç Yönetici YOK — bu hesabı Yönetici
          yapmak tek çıkış. Yönetici varsa gösterilmez (yetki devri yöneticinin işi). */}
      {aktifKullanici && aktifKullanici.rol !== "Yönetici" && aktifKullanici.id !== "test-modu"
        && !(tanimlar.kullanicilar || []).some((k) => k.rol === "Yönetici") && (
        <div data-yonetici-yok="1" style={{ marginTop: 28, background: "var(--erp-orange-bg)", border: "1px solid #E1611F", borderRadius: "var(--erp-r-md)", padding: "10px 14px", fontSize: 12, color: "#8A3F1A", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <b>Listede hiç Yönetici yok.</b> Kullanıcı ve yetki yönetimi yalnız Yönetici'ye açık; bu hesabı Yönetici yapmadan kimse bu bölüme giremez.
          <button type="button" className="btn-primary" data-beni-yonetici-yap="1" style={{ padding: "4px 10px", fontSize: 11, marginLeft: "auto" }}
            onClick={() => {
              const yeni = (tanimlar.kullanicilar || []).map((k) => (k.id === aktifKullanici.id ? { ...k, rol: "Yönetici" } : k));
              onSave({ ...tanimlar, kullanicilar: yeni });
              if (onAktifKullaniciGuncelle) onAktifKullaniciGuncelle({ ...aktifKullanici, rol: "Yönetici" });
              showToast(`${aktifKullanici.ad} artık Yönetici`);
            }}>
            Bu hesabı Yönetici yap
          </button>
        </div>
      )}
      {/* Kullanıcılar ve Yetkiler — sadece Yönetici görebilir */}
      {aktifKullanici && aktifKullanici.rol === "Yönetici" && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: 0 }}>Kullanıcılar ve Yetkiler</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--erp-text-2)" }}>Kullanıcı Girişi:</span>
              {["Aktif", "Pasif"].map((durum) => {
                const secili = (durum === "Aktif") === !!tanimlar.girisAktifMi;
                return (
                  <button
                    key={durum}
                    type="button"
                    onClick={() => {
                      // Yöneticisiz listeyle giriş AÇILAMAZ: kimse Kullanıcılar bölümüne giremez, kilit kalıcı olur.
                      if (durum === "Aktif" && !(tanimlar.kullanicilar || []).some((k) => k.rol === "Yönetici")) {
                        return showToast("Giriş açılamadı: listede Yönetici rolünde kullanıcı yok");
                      }
                      onSave({ ...tanimlar, girisAktifMi: durum === "Aktif" });
                    }}
                    style={{
                      padding: "4px 12px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 700, cursor: "pointer",
                      border: `1.5px solid ${secili ? (durum === "Aktif" ? "var(--erp-primary)" : "var(--erp-warn)") : "var(--erp-border)"}`,
                      background: secili ? (durum === "Aktif" ? "#4E6B4E1A" : "#B85C2E1A") : "#fff",
                      color: secili ? (durum === "Aktif" ? "var(--erp-primary)" : "var(--erp-warn)") : "var(--erp-text-2)",
                    }}
                  >
                    {durum}
                  </button>
                );
              })}
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 12px" }}>
            {tanimlar.girisAktifMi ? (
              <>Yönetici rolü her zaman tam yetkiye sahiptir. Diğer kullanıcılar için, her modülde ayrı ayrı
              Görüntüleme / Düzenleme / Kaydetme / Silme yetkisi verebilirsiniz. Yetkisi olmayan bir işlem
              yapılmaya çalışıldığında, işlem doğrudan uygulanmaz — sizin onayınıza düşer.</>
            ) : (
              <>Kullanıcı girişi şu an <b>Pasif</b> — uygulama test aşamasında olduğu için herkes doğrudan
              tam yetkiyle giriyor, giriş ekranı ve şifre sorulmuyor. Kullanıma alırken buradan <b>Aktif</b> yapabilirsiniz.</>
            )}
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <input
              value={yeniKullaniciAd}
              onChange={(e) => setYeniKullaniciAd(e.target.value)}
              placeholder="Ad Soyad"
              style={{ ...inputStyle, flex: "1 1 140px" }}
            />
            <input
              value={yeniKullaniciAdi}
              onChange={(e) => setYeniKullaniciAdi(e.target.value)}
              placeholder="Kullanıcı adı"
              style={{ ...inputStyle, flex: "1 1 120px" }}
            />
            <input
              type="password"
              value={yeniKullaniciSifre}
              onChange={(e) => setYeniKullaniciSifre(e.target.value)}
              placeholder="Şifre"
              style={{ ...inputStyle, flex: "1 1 100px" }}
            />
            <select value={yeniKullaniciRol} onChange={(e) => setYeniKullaniciRol(e.target.value)} style={{ ...inputStyle, width: 130 }}>
              <option value="Kullanıcı">Kullanıcı</option>
              <option value="Yönetici">Yönetici</option>
            </select>
            <button
              className="btn-primary"
              disabled={!!bulutIslemi}
              data-kullanici-ekle="1"
              title="Kullanıcıyı ekle ve bulut hesabını aç"
              onClick={async () => {
                // Form yalnız kayıt GERÇEKTEN eklendiyse temizleniyor; bulut reddettiyse yazılanlar dursun.
                const eklendi = await kullaniciEkle(yeniKullaniciAd, yeniKullaniciAdi, yeniKullaniciSifre, yeniKullaniciRol);
                if (eklendi) { setYeniKullaniciAd(""); setYeniKullaniciAdi(""); setYeniKullaniciSifre(""); setYeniKullaniciRol("Kullanıcı"); }
              }}
            >
              <Plus size={14} />
            </button>
          </div>

          {(tanimlar.kullanicilar || []).length === 0 ? (
            <EmptyState text="Henüz kullanıcı tanımlanmadı." />
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {tanimlar.kullanicilar.map((k) => {
                const yetkiAcik = acikYetkiKullaniciId === k.id;
                return (
                  <div key={k.id} style={{ background: "#fff", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{k.ad}</span>
                      <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-3)" }}>@{k.kullaniciAdi}</span>
                      {/* BULUT ROZETİ: bu kayıt için Supabase hesabı açıldı mı. Bilinmiyorsa (eski kayıt,
                          elle açılmış olabilir) gri — girişte anlaşılır (7z-45 kartı). */}
                      <span data-bulut-rozet={k.bulutHesabi === true ? "var" : k.bulutHesabi === false ? "yok" : "bilinmiyor"}
                        title={k.bulutHesabi === true ? `Bulut hesabı: ${k.eposta || kullaniciEposta(k)}` : k.bulutHesabi === false ? "Bulut hesabı YOK — bu kullanıcı GİRİŞ YAPAMAZ (giriş yalnız bulut hesabıyla). Şifre vererek bulut hesabı açabilirsiniz." : "Bulut hesabı bilinmiyor (elle açılmış olabilir)"}
                        style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: "var(--erp-r-pill)",
                          background: k.bulutHesabi === true ? "#4E6B4E1A" : k.bulutHesabi === false ? "#B85C2E1A" : "var(--erp-border-2)",
                          color: k.bulutHesabi === true ? "var(--erp-primary)" : k.bulutHesabi === false ? "var(--erp-warn)" : "var(--erp-text-2)" }}>
                        {k.bulutHesabi === true ? "bulut" : k.bulutHesabi === false ? "yerel" : "bulut?"}
                      </span>
                      <KullaniciSifreKutusu
                        kilitli={!!bulutIslemi}
                        etiket={k.bulutHesabi === true ? "Şifre değiştir" : "Bulut hesabı aç / şifre"}
                        onUygula={(sifre) => kullaniciSifreDegistir(k.id, sifre)}
                      />
                      <select
                        value={k.rol}
                        onChange={(e) => kullaniciRolDegistir(k.id, e.target.value)}
                        style={{ ...inputStyle, width: 110, padding: "3px 6px", fontSize: 11 }}
                      >
                        <option value="Kullanıcı">Kullanıcı</option>
                        <option value="Yönetici">Yönetici</option>
                      </select>
                      {k.rol !== "Yönetici" && (
                        <button
                          className="btn-ghost"
                          style={{ padding: "3px 8px", fontSize: 11 }}
                          onClick={() => setAcikYetkiKullaniciId(yetkiAcik ? null : k.id)}
                        >
                          Yetkiler {yetkiAcik ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      )}
                      <button
                        onClick={() => kullaniciSil(k.id)}
                        disabled={!!bulutIslemi}
                        title="Kullanıcıyı ve bulut hesabını sil"
                        style={{ border: "none", background: "none", cursor: "pointer", color: "var(--erp-text-3)", display: "flex", marginLeft: "auto" }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {yetkiAcik && k.rol !== "Yönetici" && (
                      <div style={{ marginTop: 10, overflowX: "auto" }}>
                        {/* ROL ŞABLONU (17 Eylül): 28 kutuyu tek tek işaretlemek yerine hazır rol.
                            Şablon BAŞLANGIÇ, kilit değil — uygulandıktan sonra kutular elle
                            değiştirilebilir. */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10,
                          background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 8 }}>
                          <Field label="Rol şablonu">
                            <select value={k.rol || ""} data-rol-sablonu={k.kullaniciAdi}
                              onChange={(e) => rolSablonuUygula(k.id, e.target.value)}
                              style={{ ...inputStyle, width: 190 }}>
                              <option value="">Özel (elle)</option>
                              {ROL_SABLONLARI.map((r) => <option key={r.key} value={r.key}>{r.ad}</option>)}
                            </select>
                          </Field>
                          {/* PANEL: hangi ekrana kilitleneceği. */}
                          {k.rol === "Panel" && (
                            <Field label="Açılacak ekran">
                              <select value={k.panelEkrani || "barkod"} data-panel-ekrani={k.kullaniciAdi}
                                onChange={(e) => kullaniciAlanDegistir(k.id, { panelEkrani: e.target.value })}
                                style={{ ...inputStyle, width: 200 }}>
                                {PANEL_EKRANLARI.map((x) => <option key={x.key} value={x.key}>{x.ad}</option>)}
                              </select>
                            </Field>
                          )}
                          <div style={{ flex: "1 1 220px", fontSize: 11, color: "var(--erp-text-2)", lineHeight: 1.4 }}>
                            {(rolSablonu(k.rol) || {}).aciklama || "Yetkileri aşağıdan tek tek verin."}
                          </div>
                        </div>
                        <table style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr>
                              <th style={{ fontSize: 11, textAlign: "left", padding: "3px 8px" }}>Modül</th>
                              <th style={{ fontSize: 11, padding: "3px 8px" }}>Görüntüleme</th>
                              <th style={{ fontSize: 11, padding: "3px 8px" }}>Düzenleme</th>
                              <th style={{ fontSize: 11, padding: "3px 8px" }}>Kaydetme</th>
                              <th style={{ fontSize: 11, padding: "3px 8px" }}>Silme</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(MODULLER || []).map((m) => {
                              const y = (k.yetkiler || {})[m] || {};
                              return (
                                <tr key={m}>
                                  <td style={{ fontSize: 12, fontWeight: 600, padding: "3px 8px" }}>{MODUL_ADLARI[m] || m}</td>
                                  {["goruntuleme", "duzenleme", "kaydetme", "silme"].map((tip) => (
                                    <td key={tip} style={{ textAlign: "center", padding: "3px 8px" }}>
                                      <input
                                        type="checkbox"
                                        checked={!!y[tip]}
                                        onChange={(e) => kullaniciYetkiDegistir(k.id, m, tip, e.target.checked)}
                                        style={{ cursor: "pointer" }}
                                      />
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </>
    )}

    {aktifTanimSekme === "gorunum" && (
    <>
      {/* MOBİL GÖRÜNÜM DÜZENLEYİCİ (14 Eylül) — telefon düzenini kullanıcı kuruyor. */}
      <div style={{ border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 14, background: "#fff" }}>
        <MobilGorunumDuzenleyici tanimlar={tanimlar} onSave={onSave} showToast={showToast}
          mobilDuzenKipi={mobilDuzenKipi} onMobilDuzenKipi={onMobilDuzenKipi} mobilDuzenAktif={mobilDuzenAktif} />
      </div>
    </>
    )}

    {aktifTanimSekme === "yayin" && (
    <>
      {/* GITHUB'A YAYINLA (22 Eylül, v1.414.0): aşağıdaki "Sürüm yayınla" yalnız KAYDI günceller;
          dosyayı hâlâ elle yüklemek gerekiyordu. Bu bölüm dosyayı da yüklüyor (tek commit) ve
          kaydı kendi tazeliyor. Yalnız Yönetici. */}
      {aktifKullanici && aktifKullanici.rol === "Yönetici" && (
        <GitHubYayin showToast={showToast} onSurumYayinla={onSurumYayinla} yayinSurum={yayinSurum} />
      )}
    </>
    )}

    {aktifTanimSekme === "surumGecmisi" && <SurumGecmisi />}

    {aktifTanimSekme === "yedek" && (
    <>
    <div style={{ marginBottom: 24, background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-lg)", padding: 16 }}>
      <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: "0 0 4px" }}>Veri Yedekleme</h3>
      <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 12px" }}>
        Tüm atölye verinizin (stok ve görselleri, sipariş, üretim, cari, tanımlar, kasa/banka/çek, koliler)
        bir kopyasını bilgisayarınıza indirin. Düzenli aralıklarla (örn. haftada bir) JSON yedeği almanızı öneririz.
      </p>
      {/* GELİR / GİDER KARTLARI AYRI EKRANA TAŞINDI (kullanıcı, 20 Eylül: "gelir gider
          kartlarını tanımlardan çıkaralım, Finans'ın altına gelir gider olarak sekme aç").
          Tanımlar kurulum ekranı — bir kez doldurulup unutulan yer; gelir/gider ise her gün
          kullanılan bir defter. İkisini aynı sayfada tutmak, günlük işi kurulum ayarlarının
          arasına gömmekti. Artık `396-gelirgider.jsx`. */}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn-primary" onClick={onJsonYedekle}>
          <FileText size={15} /> JSON Yedek İndir
        </button>
        {/* DOSYADAN GERİ YÜKLE (13 Eylül): indirilen JSON'u geri yükleme yolu yoktu. Kutuya dokunulunca
            dosya seçilir; onay kutusunda yedeğin özeti (kaç ürün, cari, muhasebe var mı) görünür. */}
        {onJsonGeriYukle && (
          <label className="btn-ghost" data-json-geri-yukle="1" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
            title="İndirilmiş bir JSON yedeğini geri yükler — mevcut verilerin TAMAMI yedekle değiştirilir">
            <input type="file" accept="application/json,.json" style={{ display: "none" }}
              onChange={async (e) => { const d = e.target.files && e.target.files[0]; e.target.value = ""; if (d) await onJsonGeriYukle(d); }} />
            <ArrowRight size={15} style={{ transform: "rotate(-90deg)" }} /> JSON Yedeğinden Geri Yükle
          </label>
        )}
        <button className="btn-ghost" onClick={onExcelAktar}>
          <FileText size={15} /> Excel Özeti İndir
        </button>
      </div>
      <div style={{ fontSize: 11, color: "var(--erp-text-3)", marginTop: 8 }}>
        JSON yedeği tam ve kayıpsızdır — geri yükleme için en güvenilir seçenektir. Geri yüklemede mevcut
        verilerin tamamı (bulut dahil) yedekle değiştirilir; geri yükleme öncesi hâl ayrıca saklanır. Excel özeti
        sadece hızlı gözden geçirme/rapor amaçlıdır.
      </div>
      <SupabaseBolumu
        supabaseBagli={supabaseBagli}
        gocDurumu={gocDurumu}
        onSupabaseyeGoc={onSupabaseyeGoc}
      />
      <DepolamaDurumuBolumu stok={stok} cariler={cariler} tanimlar={tanimlar} />
      <OtomatikYedekBolumu
        sonYedekTarihi={sonYedekTarihi}
        onSimdiYedekle={onSimdiYedekle}
        onGeriYukle={onYedektenGeriYukle}
      />
    </div>
    </>
    )}

    {aktifTanimSekme === "bakim" && (
    <>
      <VeriDenetimiEkrani uretim={uretim} stokRezervasyonlari={stokRezervasyonlari} onRezervasyonTemizle={onRezervasyonTemizle} muhasebe={muhasebe} onKarsilananOnar={onKarsilananOnar} fisDefteri={fisDefteri} onDefterdenYenidenKur={onDefterdenYenidenKur} onEksikHareketOnar={onEksikHareketOnar} stok={stok} cariler={cariler} siparisler={siparisler} tanimlar={tanimlar} onAcilisFisiKes={onAcilisFisiKes} />
    <div style={{ marginTop: 20 }}>
      <DefterOnarimBolumu stok={stok} onOnar={onDefterTopluOnar} />
    </div>
    <VeritabaniSifirlaBolumu onVeritabaniSifirla={onVeritabaniSifirla} supabaseBagli={supabaseBagli} />
    </>
    )}

    {aktifTanimSekme === "cop" && (() => {
      const TUR_ADLARI = {
        urun: "Ürün", cari: "Cari", siparis: "Sipariş", uretim: "Üretim",
        stokHareketi: "Stok Hareketi", cariHareketi: "Cari Hareketi",
        kasa: "Kasa", banka: "Banka", kasaHareketi: "Kasa Fişi", bankaHareketi: "Banka Fişi", cek: "Çek",
      };
      const TUR_RENK = {
        urun: "var(--erp-brown)", cari: "#9C3D3D", siparis: "var(--erp-info)", uretim: "var(--erp-primary)",
        stokHareketi: "var(--erp-text-2)", cariHareketi: "var(--erp-purple)",
        kasa: "#2F6B4F", banka: "var(--erp-info)", kasaHareketi: "#2F6B4F", bankaHareketi: "var(--erp-info)", cek: "var(--erp-brown)",
      };
      const liste = (cop || []).filter((k) => {
        if (copTurFiltre !== "Tümü" && k.tur !== copTurFiltre) return false;
        if (copArama.trim()) {
          const q = copArama.trim().toLocaleLowerCase("tr-TR");
          const havuz = [k.baslik, k.ozet, k.kullaniciAd, TUR_ADLARI[k.tur], k.ustKayit && k.ustKayit.ad];
          if (!havuz.some((x) => String(x || "").toLocaleLowerCase("tr-TR").includes(q))) return false;
        }
        return true;
      });
      const turSayilari = {};
      (cop || []).forEach((k) => { turSayilari[k.tur] = (turSayilari[k.tur] || 0) + 1; });

      return (
        <div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 14 }}>
            <Trash2 size={16} color="var(--erp-brown)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: "var(--erp-text-2)", lineHeight: 1.7 }}>
              Silinen kayıtların tam kopyası burada tutulur — kim, ne zaman, neyi sildi.
              <b> Geri yükleme kaydın kendisini geri getirir, silme sırasındaki yan etkileri geri almaz:</b> bir
              sipariş silinirken stok hareketleri de geri sarılmıştı, siparişi geri yüklemek onları yeniden
              oluşturmaz. Yan etkili kayıtlar aşağıda ayrıca işaretlidir; geri yükledikten sonra ilgili
              stok ve cari bakiyelerini kontrol edin.
              <br />
              En fazla son 300 kayıt saklanır; sınır aşılınca en eskiler düşer.
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            {["Tümü", ...Object.keys(TUR_ADLARI).filter((t) => turSayilari[t])].map((t) => {
              const aktif = copTurFiltre === t;
              const sayi = t === "Tümü" ? (cop || []).length : turSayilari[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCopTurFiltre(t)}
                  className="mono"
                  style={{
                    fontSize: 11, fontWeight: 700, padding: "5px 11px", borderRadius: "var(--erp-r-pill)", cursor: "pointer",
                    border: `1.5px solid ${aktif ? (TUR_RENK[t] || "var(--erp-brown)") : "var(--erp-border-2)"}`,
                    background: aktif ? (TUR_RENK[t] || "var(--erp-brown)") : "#fff",
                    color: aktif ? "#fff" : "var(--erp-text-2)",
                  }}
                >
                  {t === "Tümü" ? "Tümü" : TUR_ADLARI[t]} ({sayi})
                </button>
              );
            })}
            <input
              value={copArama}
              onChange={(e) => setCopArama(e.target.value)}
              placeholder="Ara…"
              style={{ ...inputStyle, width: 180, fontSize: 12, marginLeft: "auto" }}
            />
            {(cop || []).length > 0 && (
              <SilOnayButonu
                onConfirm={onCopBosalt}
                boyut={13}
                baslikNormal="Çöp kutusunu tamamen boşalt"
                baslikOnay="Tüm kayıtlar kalıcı silinecek — tekrar dokunun"
              />
            )}
          </div>

          {liste.length === 0 ? (
            <EmptyState text={(cop || []).length === 0 ? "Çöp kutusu boş — henüz hiçbir kayıt silinmedi." : "Bu filtreyle eşleşen kayıt yok."} />
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {liste.map((k) => {
                const acik = acikCopId === k.id;
                const renk = TUR_RENK[k.tur] || "var(--erp-text-2)";
                return (
                  <div key={k.id} style={{ background: "#fff", border: "1px solid var(--erp-line-soft)", borderLeft: `3px solid ${renk}`, borderRadius: "var(--erp-r-md)", overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", flexWrap: "wrap" }}>
                      <span className="mono" style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: "var(--erp-r-pill)", background: alfaEkle(renk, "1A"), color: renk, whiteSpace: "nowrap" }}>
                        {TUR_ADLARI[k.tur] || k.tur}
                      </span>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text)", overflowWrap: "anywhere" }}>{k.baslik}</div>
                        {k.ozet && <div className="mono" style={{ fontSize: 10, color: "var(--erp-text-3)" }}>{k.ozet}</div>}
                        {k.ustKayit && (
                          <div className="mono" style={{ fontSize: 9, color: "var(--erp-text-3)" }}>içinde: {k.ustKayit.ad}</div>
                        )}
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--erp-text-2)", textAlign: "right", whiteSpace: "nowrap" }}>
                        <div>{new Date(k.silinmeTarihi).toLocaleString("tr-TR")}</div>
                        <div style={{ color: "var(--erp-text-3)" }}>{k.kullaniciAd}</div>
                      </div>
                      {k.yanEtkiliMi && (
                        <span
                          className="mono"
                          title="Silinirken stok/cari kayıtları da etkilendi — geri yükleme bunları düzeltmez"
                          style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: "var(--erp-r-pill)", background: "#B85C2E18", color: "var(--erp-warn)", whiteSpace: "nowrap" }}
                        >
                          yan etkili
                        </span>
                      )}
                      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                        <button type="button" className="btn-ghost" style={{ padding: "4px 9px", fontSize: 11 }} onClick={() => setAcikCopId(acik ? null : k.id)}>
                          {acik ? <ChevronUp size={12} /> : <ChevronDown size={12} />} İçerik
                        </button>
                        {k.geriAlinabilirMi ? (
                          <button type="button" className="btn-primary btn-save" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => onCopGeriYukle(k.id)}>
                            <ArrowRight size={12} /> Geri yükle
                          </button>
                        ) : (
                          <span className="mono" style={{ fontSize: 9, color: "var(--erp-text-3)", maxWidth: 110, lineHeight: 1.3 }} title="Bu tür kayıtlar otomatik geri yüklenemez; içeriği görüp elle girebilirsiniz">
                            geri yüklenemez
                          </span>
                        )}
                        <SilOnayButonu onConfirm={() => onCopKaliciSil(k.id)} boyut={12} baslikNormal="Kalıcı olarak sil" />
                      </div>
                    </div>

                    {acik && (
                      <div style={{ borderTop: "1px solid var(--erp-line-soft)", background: "var(--erp-panel)", padding: 10 }}>
                        {/* Ham içerik: kaydın silinmeden önceki tam hâli. Otomatik geri yüklenemeyen
                            türlerde (hareketler) kullanıcının değerleri okuyup elle girebilmesi için. */}
                        <pre className="mono" style={{ margin: 0, fontSize: 10, color: "var(--erp-text)", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 260, overflowY: "auto" }}>
                          {JSON.stringify(k.veri, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    })()}
    </>
  );
}



// Kullanıcı satırında şifre değiştirme / bulut hesabı açma kutusu: tıklanınca açılır, Enter ya da
// Uygula ile gönderir; bulut kabul edince kapanır.
function KullaniciSifreKutusu({ etiket, kilitli, onUygula }) {
  const [acik, setAcik] = useState(false);
  const [sifre, setSifre] = useState("");
  if (!acik) {
    return (
      <button type="button" className="btn-ghost" data-sifre-ac="1" disabled={kilitli} style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => setAcik(true)}>
        {etiket}
      </button>
    );
  }
  const gonder = async () => { if (await onUygula(sifre)) { setSifre(""); setAcik(false); } };
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      <input type="password" value={sifre} data-sifre-kutusu="1" placeholder="Yeni şifre (en az 6)" autoFocus
        onChange={(e) => setSifre(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") gonder(); }}
        style={{ padding: "3px 6px", fontSize: 11, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", width: 150 }} />
      <button type="button" className="btn-primary" data-sifre-uygula="1" disabled={kilitli} style={{ padding: "3px 8px", fontSize: 11 }} onClick={gonder}>Uygula</button>
      <button type="button" className="btn-ghost" style={{ padding: "3px 6px", fontSize: 11 }} onClick={() => { setAcik(false); setSifre(""); }}><X size={10} /></button>
    </span>
  );
}
