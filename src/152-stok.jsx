function StokModule({ onReceteSablonuKaydet, kurlar, onFiseGitNo, hedefUrunId, hedefSekme, onHedefTuketildi, donusHedefi, onDonusYap, stokRezervasyonlari, tumSiparisler, items, onSave, showToast, tanimlar, onGoToTanimlar, cariler, onCariHareket, onGoToCari, onRemoveHareketGlobal, siparisler, uretim, onGoToSiparis, onGoToUretim, onCopaAt, onYeniRenkKaydet, onHizliCariEkle, onYeniMalzemeTipiKaydet, onYeniOlcuKaydet, onYeniMamulTipiKaydet, onYeniOzelKodAlani, onKombinasyonOlustur, onAsortiOlustur, kullaniciYetkisiVar, onayIste, onPencereAc, aktifPencereId, onPencereKapat, onPencereKucult, acikUrunIdleri }) {
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [filterCat, setFilterCat] = useState("Tümü");
  // Pasif görünümü: açıkken YALNIZCA pasif kartlar listelenir. Ayrı bir sekme olması bilinçli —
  // pasifleri aktiflerin arasına karıştırmak, pasife almanın amacını ortadan kaldırırdı.
  const [pasifSekme, setPasifSekme] = useState(false);
  // KATALOG AYRI SEKME DEĞİL, AYNI EKRANIN İKİNCİ GÖRÜNÜMÜ (kullanıcı kararı, 6 Eylül: "İlave
  // sekme açmayalım, burayı daha katalog gibi kullanalım"). Aynı `filtered` verisi, farklı çizim:
  // arama, kategori sekmeleri ve süzgeçler ikisinde de aynı işi görüyor. Ayrı sekme olsaydı
  // süzgeçler iki yerde durur ve ikisi ayrışırdı.
  const [katalogMod, setKatalogMod] = useState(false);
  // MÜŞTERİ GÖRÜNÜMÜ: maliyet tarafı gizlenir (alış fiyatı, tedarikçi, stok değeri). Ekranı
  // müşteriye çevirmek fuarda tek hareket; o hareketin maliyeti göstermemesi gerekiyor.
  const [musteriGorunumu, setMusteriGorunumu] = useState(false);
  const [katalogUrunId, setKatalogUrunId] = useState(null);
  const [katalogRenk, setKatalogRenk] = useState("");
  const [katalogFotoAcik, setKatalogFotoAcik] = useState(false);
  // ÖZEL KOD SÜZGECİ — iki aşamalı: önce HANGİ alan, sonra hangi DEĞER.
  // Tek aşamalı olsaydı bütün alanların bütün değerleri tek listede karışırdı; "147" hem taban
  // numarası hem kalıp numarası olabilir ve ikisi aynı şey değil.
  const [filterOzelKodId, setFilterOzelKodId] = useState("");
  const [filterOzelKodDeger, setFilterOzelKodDeger] = useState("Tümü");
  const [yeniKodAlaniGiris, setYeniKodAlaniGiris] = useState(false);
  const [yeniKodAlaniAdi, setYeniKodAlaniAdi] = useState("");
  // HANGİ ÜRÜN KARTI GÖRÜNÜYOR — TEK KAYNAK: uygulamanın pencere yöneticisi.
  //
  // Kullanıcı (11 Eylül): "Üst sekmeler düzgün çalışmıyor, stok içinden küçültüyoruz sonra geri
  // dönüşte o stoğu değil stok yönetimini açıyor."
  //
  // Eskiden modül KENDİ `acikUrunId`sini tutuyordu — tek bir değer. Şeritte birden çok ürün sekmesi
  // durabiliyordu ama modül yalnız EN SON açılanı hatırlıyordu: Deri küçültülüp Bot açılınca
  // `acikUrunId` Bot oluyor, şeritten Deri'ye dokunulunca `aktifPencereId` Deri ama kart koşulu
  // Bot'u beklediği için hiçbir kart çizilmiyor, Stok listesi görünüyordu — şerit "Deri" derken
  // ekran listeyi gösteriyordu. Bot kapatılınca da `acikUrunId` null oluyor, şerit Deri'yi etkin
  // gösterip ekran yine liste kalıyordu.
  //
  // Artık iki doğruluk kaynağı yok: açık kartlar `acikUrunIdleri`nden (şeritteki ürün sekmeleri),
  // görünen kart `aktifPencereId`den okunuyor.
  //
  // HER AÇIK KART KURULU KALIYOR, yalnız etkin olmayanlar gizli — modüllerin sekme değişiminde
  // durumunu korumasıyla aynı mantık. Tek kart çizilseydi Deri → Bot → Deri geçişinde Deri'nin
  // kartı yeniden kurulur, içindeki sekme ve yarım girişler kaybolurdu ("girdiğiniz bilgiler
  // korunur" sözü bozulurdu).
  //
  // Yönlendirmeyle gelen sekme ÜRÜN BAŞINA: { [urunId]: { sekme, sayac } }. `sayac` her
  // yönlendirmede artıyor ve kartın anahtarına giriyor — aynı ürüne aynı sekmeyle ikinci kez
  // gelindiğinde de kart yeniden kurulup sekme uygulanıyor (eski anahtar `id-sekme` bunu yapamıyordu).
  const [hedefSekmeleri, setHedefSekmeleri] = useState({});

  // Başka bir modülden gelen yönlendirme: ürünü aç ve istenen sekmeyi hazırla.
  // Hedef TÜKETİLİR (onHedefTuketildi) — aksi halde kullanıcı ürünü kapattığında aynı hedef
  // yeniden tetiklenir ve kart kendiliğinden tekrar açılırdı.
  useEffect(() => {
    if (!hedefUrunId) return;
    const p = items.find((x) => x.id === hedefUrunId);
    if (!p) { onHedefTuketildi && onHedefTuketildi(); return; }
    setHedefSekmeleri((onceki) => ({
      ...onceki,
      [hedefUrunId]: { sekme: hedefSekme || null, sayac: ((onceki[hedefUrunId] || {}).sayac || 0) + 1 },
    }));
    if (onPencereAc) onPencereAc("urun", hedefUrunId, `Ürün: ${p.ad}`, {});
    onHedefTuketildi && onHedefTuketildi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hedefUrunId]);

  // Reçete kurarken eksik hammaddeyi akışı bölmeden açar.
  //
  // Ürün AYRINTISIZ doğar: yalnızca ad, kategori ve birim. Renk/beden, fiyat ve tedarikçi
  // sonradan ürün kartından tamamlanır. Amaç reçeteyi bitirebilmek; eksiksiz bir ürün kartı
  // doldurmak için akışı durdurmak, kullanıcıyı asıl işinden koparıyordu.
  //
  // Dönüş: yeni ürünün kimliği — çağıran onu doğrudan seçebilsin.
  function hizliHammaddeEkle(ad) {
    const yeniAd = String(ad || "").trim();
    if (!yeniAd) return null;

    // Aynı adlı ürün varsa YENİSİ AÇILMAZ. Kopya ürün, stoğu ikiye böler ve reçeteler
    // farklı kayıtlara bağlanır — sonradan birleştirmesi çok zor bir karışıklık.
    const mevcut = items.find(
      (p) => p.ad.toLocaleLowerCase("tr-TR").trim() === yeniAd.toLocaleLowerCase("tr-TR")
    );
    if (mevcut) { showToast(`"${yeniAd}" zaten kayıtlı — mevcut ürün seçildi`); return mevcut.id; }

    const birim = (tanimlar.birimler && tanimlar.birimler.length > 0) ? tanimlar.birimler[0].ad : "";
    if (!birim) { showToast("Önce Tanımlar → Birimler bölümünden en az bir birim ekleyin"); return null; }

    const urun = {
      id: uid("stok"), ad: yeniAd, kategori: "Hammadde", birim,
      alisFiyati: 0, alisParaBirimi: "₺", satisFiyati: 0, satisParaBirimi: "₺",
      tedarikciId: "", kapakResmi: "", olcuTipi: "Boyut",
      varsayilanProses: "", malzemeTipi: "", mamulTipi: "", sezon: "", sezonYili: "",
      hareketler: [], ekFiyatlar: [], recete: [], prosesUcretleri: {},
      ozelKodlar: {},
      // Standart/Standart YER TUTUCU ile doğar, boş dizi ile değil.
      //
      // Varyantsız bir ürün, uygulamanın birçok yerinde "hiç satırı yok" durumuna düşüyor:
      // renk eklemek boş sonuç veriyor, stok girişi yapılamıyor, matris çizilmiyor.
      // Yer tutucu satır, ilk gerçek renk eklendiğinde onun yerini alır (bkz. placeholderMi).
      variants: [{ renk: "Standart", beden: "Standart", miktar: 0, minStok: 0 }],
      renkResimleri: {},
    };
    onSave([urun, ...items]);
    showToast(`"${yeniAd}" hammadde olarak eklendi — ayrıntıları Stok kartından tamamlayın`);
    return urun.id;
  }

  function urunAc(id) {
    const p = items.find((x) => x.id === id);
    if (onPencereAc && p) onPencereAc("urun", id, `Ürün: ${p.ad}`, {});
  }
  const [showBagimsizGiris, setShowBagimsizGiris] = useState(false);

  const [form, setForm] = useState(emptyForm());
  const [yeniTedarikciAcik, setYeniTedarikciAcik] = useState(false);
  const [yeniTedarikciAd, setYeniTedarikciAd] = useState("");

  function yeniTedarikciKaydet() {
    const yeniId = onHizliCariEkle && onHizliCariEkle(yeniTedarikciAd, "Tedarikçi");
    if (!yeniId) return;
    // Oluşan cari DOĞRUDAN seçili hale gelir: kullanıcının bir de listeden bulup seçmesi
    // gereksiz bir adım olurdu.
    setForm((onceki) => ({ ...onceki, tedarikciId: yeniId }));
    setYeniTedarikciAcik(false);
    setYeniTedarikciAd("");
  }
  const [selRenkler, setSelRenkler] = useState([]);
  const [selBedenler, setSelBedenler] = useState([]);
  const [bedensiz, setBedensiz] = useState(false);
  const [yeniMalzemeTipiGiris, setYeniMalzemeTipiGiris] = useState(false);
  const [yeniMalzemeTipiAdi, setYeniMalzemeTipiAdi] = useState("");
  // Ürün eklerken listede olmayan ölçüyü (beden/boyut) yerinde tanımlamak için.
  const [yeniOlcuAcik, setYeniOlcuAcik] = useState(false);
  const [yeniOlcuAdi, setYeniOlcuAdi] = useState("");
  const [yeniMamulTipiGiris, setYeniMamulTipiGiris] = useState(false);
  const [yeniMamulTipiAdi, setYeniMamulTipiAdi] = useState("");
  const [yeniRenkGiris, setYeniRenkGiris] = useState(false);
  const [yeniRenkAdi, setYeniRenkAdi] = useState("");
  const [mamulRenkSecimi, setMamulRenkSecimi] = useState("");
  const [renkDegiskenSayisi, setRenkDegiskenSayisi] = useState(1);
  const [kombiRenkSecimleri, setKombiRenkSecimleri] = useState({}); // { [pozisyon]: renkAdi }
  const [yeniModelRengiModuStok, setYeniModelRengiModuStok] = useState(false);
  const [matrix, setMatrix] = useState(null); // { renkler, bedenler, values, renkResimleri }

  function emptyForm() {
    // Varsayılan birim TANIMLARDAN gelir, sabit değil.
    //
    // Önceden "çift" sabit yazılıydı: kullanıcının birim listesinde olmayan bir değer, yeni açılan
    // her ürüne varsayılan olarak yapışıyordu. Sonra o ürünün kartında birim yanlış görünüyor,
    // reçete ve ihtiyaç tabloları da yanlış birimle çalışıyordu.
    //
    // Liste boşsa boş bırakılır — uydurulmuş bir birim, boş bırakmaktan daha zararlı.
    const ilkBirim = (tanimlar.birimler && tanimlar.birimler.length > 0) ? tanimlar.birimler[0].ad : "";
    return {
      ad: "", kategori: "Hammadde", birim: ilkBirim, minStok: "",
      alisFiyati: "", alisParaBirimi: "₺", satisFiyati: "", satisParaBirimi: "₺", tedarikciId: "", kapakResmi: "",
      olcuTipi: "Beden", varsayilanProses: "", malzemeTipi: "", mamulTipi: "", sezon: "", sezonYili: "",
    };
  }

  const isMamul = form.kategori === "Mamul";

  function toggleRenk(ad) {
    setSelRenkler((prev) => (prev.includes(ad) ? prev.filter((x) => x !== ad) : [...prev, ad]));
  }
  function toggleBeden(ad) {
    setSelBedenler((prev) => (prev.includes(ad) ? prev.filter((x) => x !== ad) : [...prev, ad]));
  }

  function buildMatrix() {
    if (!form.ad.trim()) return showToast("Ürün adı gerekli");
    // Renk/beden seçilmemişse varsayılan olarak "Standart" (renksiz/bedensiz basit stok kartı) kullanılır —
    // seçim zorunlu değildir, istenirse sonradan Stok kartından "Renk Ekle"/"Beden Ekle" ile genişletilebilir.
    const renkler = selRenkler.length > 0 ? selRenkler : ["Standart"];
    const bedenler = bedensiz ? ["Standart"] : (selBedenler.length > 0 ? selBedenler : ["Standart"]);
    const values = {};
    renkler.forEach((r) => bedenler.forEach((b) => (values[cellKey(r, b)] = "0")));
    setMatrix({ renkler, bedenler, values, renkResimleri: {} });
  }

  function setMatrixRenkResmi(renk, url) {
    setMatrix((m) => ({ ...m, renkResimleri: { ...m.renkResimleri, [renk]: url } }));
  }

  function removeMatrixRenkResmi(renk) {
    setMatrix((m) => {
      const ri = { ...m.renkResimleri };
      delete ri[renk];
      return { ...m, renkResimleri: ri };
    });
  }

  function saveProduct() {
    if (!matrix) return;

    // MÜKERRER AD KONTROLÜ. Aynı ürünün iki kez açılması, stok ve reçetelerin ikiye bölünmesi
    // demektir: siparişte hangisinin seçildiğine göre farklı hammadde ihtiyacı çıkar, stok
    // miktarları hiçbir zaman toplanmaz ve sorun genellikle çok geç fark edilir.
    // Kategori ayrımı YAPILMAZ: "Kutu" adında hem mamul hem hammadde olması da karışıklık üretir.
    const yeniAd = form.ad.trim();
    if (!yeniAd) { showToast("Ürün adı girin"); return; }
    // Birimsiz ürün, reçete ve ihtiyaç tablolarında boş sütun üretir. Tanımlarda hiç birim
    // yoksa kullanıcı önce oraya yönlendirilir; uydurulmuş bir varsayılan atamak yanlış olur.
    if (!form.birim) {
      showToast("Önce Tanımlar → Birimler bölümünden en az bir birim ekleyin");
      return;
    }
    const cakisan = items.find((p) => urunAdiAnahtari(p.ad) === urunAdiAnahtari(yeniAd));
    if (cakisan) {
      showToast(
        `"${cakisan.ad}" adında bir ürün zaten var (${cakisan.kategori})` +
        (cakisan.pasif ? " — pasif durumda, Pasifler sekmesinden aktife alabilirsiniz" : "")
      );
      return;
    }

    // Minimum stok artık ürün seviyesinde girilmiyor. Sebep: eşik renk/bedene göre değişir —
    // 38 numara siyahtan 20 çift bulundurulurken 45 numara bordodan 2 çift yeterli olabilir.
    // Tek bir ürün geneli değer, gerçek ihtiyacı yansıtmadığı için ya hep boş bırakılıyor ya da
    // yanlış uyarı üretiyordu. Yeni varyantlar 0 ile başlar; eşik, matristeki hücreye tıklanarak
    // renk/beden bazında girilir (StokGirisHucre > "min: 0").
    const varsayilanMinStok = 0;
    const variants = [];
    matrix.renkler.forEach((r) =>
      matrix.bedenler.forEach((b) => {
        variants.push({ renk: r, renkId: renkKimligiBul(r, (tanimlar.renkler || [])), beden: b, miktar: parseFloat(matrix.values[cellKey(r, b)]) || 0, minStok: varsayilanMinStok });
      })
    );
    const product = {
      id: uid("stok"),
      ad: form.ad.trim(),
      kategori: form.kategori,
      birim: form.birim,
      alisFiyati: parseFloat(form.alisFiyati) || 0,
      alisParaBirimi: form.alisParaBirimi || "₺",
      satisParaBirimi: form.satisParaBirimi || "₺",
      // HAMMADDEDE DE SATIŞ FİYATI VAR (kullanıcı, 6 Eylül). Atölye artan deriyi, fazla tabanı
      // satabiliyor; satış fişi kesilirken fiyatın bir yerden gelmesi gerekiyor. Eskiden bu alan
      // hammaddede sıfıra çekiliyordu.
      satisFiyati: parseFloat(form.satisFiyati) || 0,
      tedarikciId: isMamul ? "" : (form.tedarikciId || ""),
      kapakResmi: form.kapakResmi || "",
      olcuTipi: form.olcuTipi,
      varsayilanProses: form.varsayilanProses || "",
      malzemeTipi: form.kategori === "Hammadde" ? (form.malzemeTipi || "") : "",
      mamulTipi: form.kategori === "Mamul" ? (form.mamulTipi || "") : "",
      sezon: form.kategori === "Mamul" ? (form.sezon || "") : "",
      // Yıl da yalnız mamulde: hammaddenin koleksiyon yılı yok.
      sezonYili: form.kategori === "Mamul" ? (form.sezonYili || "") : "",
      // Boş bırakılan alanlar kayda YAZILMIYOR: boş anahtarlar kaydı şişirir ve "dolu mu"
      // kontrollerini yanıltır.
      ozelKodlar: Object.fromEntries(
        Object.entries(form.ozelKodlar || {}).filter(([, v]) => String(v || "").trim())),
      // AÇILIŞ HAREKETLERİ — ürün oluşturulurken girilen miktarlar için hareket yazılır.
      //
      // Önceden miktar doğrudan varyanta yazılıyor, hiç hareket üretmiyordu. Sonuç: kayıtlı stok
      // ile hareket geçmişi tutmuyor ("Fark: +264" uyarısı tam olarak bunun belirtisiydi) ve
      // stoğun nereden geldiği izlenemiyordu.
      //
      // Kaynak "Manuel": bu bir alım ya da üretim değil, sayım/devir kaydıdır.
      hareketler: variants
        .filter((v) => v.miktar > 0)
        .map((v) => ({
          id: uid("hrk"),
          tarih: new Date().toISOString(),
          renk: v.renk, beden: v.beden, miktar: v.miktar,
          kaynak: "Manuel",
          fisNo: `ACILIS-${bugunYerel()}`,
          aciklama: "Açılış stoğu (ürün oluşturulurken girildi)",
        })),
      ekFiyatlar: [],
      recete: [],
      prosesUcretleri: {},
      variants,
      renkResimleri: matrix.renkResimleri || {},
    };
    onSave([product, ...items]);
    setForm(emptyForm());
    setSelRenkler([]);
    setSelBedenler([]);
    setBedensiz(false);
    setMatrix(null);
    setShowForm(false);
    showToast("Ürün ve matris kaydedildi");
  }

  // Defter ile bakiye arasındaki farkı, BAKİYEYİ DEĞİŞTİRMEDEN deftere yazar.
  //
  // Normal stok girişi hem hareket ekler hem miktarı değiştirir. Burada istenen bunun yarısı:
  // miktar zaten doğru (kullanıcının saydığı, elindeki stok), eksik olan onu açıklayan KAYIT.
  // Bu yüzden yalnızca hareket eklenir, varyanta dokunulmaz.
  //
  // Muhasebede doğru olan da budur: tutmayan bir bakiyeyi silmek değil, farkı açıklayan kaydı
  // oluşturmak. Böylece geçmiş izlenebilir kalır ve bundan sonraki denetimler temiz çıkar.
  // Kayıtlı stok ile hareket geçmişini eşitler.
  //
  // FARKI TEK VARYANTA YAZMAK YANLIŞTI: 15 adetlik bir kutu stoğu üç ayrı renkte olabilir; hepsini
  // ilk renge yazmak toplamı düzeltir ama varyant bazında yeni bir yanlış üretir. Hangi rengin
  // hareketi eksikse ona yazılmalı.
  //
  // Bu yüzden fark VARYANT VARYANT hesaplanır: her renk/beden için "kayıtlı miktar − o varyantın
  // hareket neti" bulunur, sıfırdan farklı olanlara ayrı hareket yazılır.
  //
  // variants BİLEREK değiştirilmiyor: kayıtlı stok doğru kabul edilir, eksik olan geçmiştir.
  function defterDuzeltmeYaz(productId) {
    const urun = items.find((p) => p.id === productId);
    if (!urun) return;

    const hareketNeti = {};
    (urun.hareketler || []).forEach((h) => {
      const anahtar = `${h.renk}|${h.beden}`;
      hareketNeti[anahtar] = stokYuvarla((hareketNeti[anahtar] || 0) + (h.miktar || 0));
    });

    const zaman = new Date().toISOString();
    const yeniHareketler = [];
    (urun.variants || []).forEach((v) => {
      const anahtar = `${v.renk}|${v.beden}`;
      const fark = stokYuvarla((v.miktar || 0) - (hareketNeti[anahtar] || 0));
      if (Math.abs(fark) < 0.000001) return;
      yeniHareketler.push({
        id: uid("hrk"), tarih: zaman,
        renk: v.renk, beden: v.beden, miktar: fark,
        kaynak: "Manuel", cariId: null,
        fisNo: `ACILIS-${zaman.slice(0, 10)}`,
        aciklama: "Açılış / defter düzeltmesi — kayıtlı stok ile hareket geçmişi eşitlendi",
      });
    });

    // Hareketi olup varyantı olmayan durum: geçmişte silinmiş bir renk. Bunları da sıfırlamak
    // gerekir, yoksa defter toplamı tutmaz.
    Object.entries(hareketNeti).forEach(([anahtar, net]) => {
      const [renk, beden] = anahtar.split("|");
      const varyantVar = (urun.variants || []).some((v) => v.renk === renk && v.beden === beden);
      if (varyantVar || Math.abs(net) < 0.000001) return;
      yeniHareketler.push({
        id: uid("hrk"), tarih: zaman,
        renk, beden, miktar: -net,
        kaynak: "Manuel", cariId: null,
        fisNo: `ACILIS-${zaman.slice(0, 10)}`,
        aciklama: "Defter düzeltmesi — bu renk/beden artık üründe tanımlı değil",
      });
    });

    if (yeniHareketler.length === 0) { showToast("Fark yok — defter zaten tutuyor"); return; }

    const next = items.map((p) =>
      p.id === productId
        ? { ...p, hareketler: [...yeniHareketler, ...(p.hareketler || [])].slice(0, HAREKET_GECMIS_SINIRI) }
        : p
    );
    onSave(next);
    const toplam = stokYuvarla(yeniHareketler.reduce((t, h) => t + h.miktar, 0));
    showToast(`${yeniHareketler.length} düzeltme hareketi yazıldı (net ${toplam > 0 ? "+" : ""}${toplam} ${urun.birim || ""}) — stok miktarı değişmedi`);
  }


  // Herhangi bir siparişe bağlı olmadan, birden fazla beden için TEK seferde (atomik) stok girişi/çıkışı yapar.
  // bedenMiktarlari: { [beden]: miktarString }, yon: "Giriş" (+) veya "Çıkış" (-).
  function bagimsizStokGirisiYap(productId, renk, bedenMiktarlari, yon, not, cariBaglantisi) {
    // SIRALI NUMARA (16 Eylül): rastgele dört hane çakışabiliyordu — aynı numarayı taşıyan iki
    // ayrı giriş, geri alma ve defter eşleştirmesini bozar. `fisNoUret` sayaçlı ve tarihli.
    const fisNo = fisNoUret("MNL");
    const tarih = new Date().toISOString();
    let toplamDegisen = 0;
    let toplamMiktar = 0;
    let urunRef = null;
    const kaynak = cariBaglantisi ? (cariBaglantisi.tip === "Alış" ? "Satınalma" : "Satış") : "Manuel";
    const next = items.map((p) => {
      if (p.id !== productId) return p;
      urunRef = p;
      const yeniHareketler = [];
      Object.entries(bedenMiktarlari).forEach(([beden, miktarStr]) => {
        const miktar = parseFloat(miktarStr) || 0;
        if (miktar <= 0) return;
        const delta = yon === "Çıkış" ? -miktar : miktar;
        toplamDegisen++;
        toplamMiktar += miktar;
        yeniHareketler.push({
          id: uid("hrk"), tarih, renk, beden, miktar: delta,
          kaynak, cariId: (cariBaglantisi && cariBaglantisi.cariId) || null, fisNo, not: not || "",
        });
      });
      if (yeniHareketler.length === 0) return p;
      return {
        ...p,
        variants: p.variants.map((v) => {
          const h = yeniHareketler.find((x) => x.renk === v.renk && x.beden === v.beden);
          return h ? { ...v, miktar: stokYuvarla(v.miktar + h.miktar) } : v;
        }),
        hareketler: [...yeniHareketler, ...(p.hareketler || [])].slice(0, HAREKET_GECMIS_SINIRI),
      };
    });
    if (toplamDegisen === 0) {
      showToast("Girilen bir miktar yok");
      return;
    }
    onSave(next);

    if (cariBaglantisi && cariBaglantisi.cariId && urunRef) {
      const tutar = toplamMiktar * (parseFloat(cariBaglantisi.birimFiyat) || 0);
      const ortakHareket = {
        tarih: tarih.slice(0, 10),
        yon: cariBaglantisi.tip === "Alış" ? "Borç" : "Alacak",
        tutar,
        odemeSekli: "Nakit",
        vade: "",
        fisNo,
        urunAd: urunRef.ad, renk, beden: "Karma", miktar: toplamMiktar, birim: urunRef.birim,
        aciklama: `${cariBaglantisi.tip === "Alış" ? "Cariden Alış" : "Cariye Satış"}: ${urunRef.ad} · ${renk} · ${toplamMiktar} ${urunRef.birim}`,
      };
      const defter = cariBaglantisi.defter || "Genel";
      const hareketler = (() => {
        if (defter !== "Muhasebe") return [{ ...ortakHareket, id: uid("hrk"), defter }];
        const genelId = uid("hrk");
        const resmiId = uid("hrk");
        return [
          { ...ortakHareket, id: genelId, defter: "Muhasebe" },
        ];
      })();
      onCariHareket(cariBaglantisi.cariId, hareketler);
      showToast(`${cariBaglantisi.tip === "Alış" ? "Cariden alış" : "Cariye satış"} kaydedildi — fiş: ${fisNo}`);
    } else {
      showToast(`Stok ${yon === "Çıkış" ? "çıkışı" : "girişi"} kaydedildi — fiş: ${fisNo}`);
    }
  }

  // KALDIRILDI: stokDuzelt — matristeki miktara tıklayıp doğrudan yeni sayı yazma özelliği.
  // Sorun şuydu: miktarı değiştiriyor ama HİÇBİR HAREKET KAYDI oluşturmuyordu. Böylece stok
  // hareketleri listesiyle gerçek miktar birbirinden sessizce ayrılıyor, "bu 40 adet nereden
  // geldi?" sorusunun cevabı hiçbir yerde bulunamıyordu. Envanterin denetlenebilir kalması için
  // stok SADECE hareket üzerinden (bağımsız stok girişi, sipariş teslimi, üretim girişi) değişmeli.
  // Sayım farkı girmek gerekiyorsa doğru yol, "Bağımsız Stok Girişi" formundan giriş/çıkış fişi
  // oluşturmaktır — o zaman fark hem miktara işler hem geçmişte iz bırakır.

  function minStokGuncelle(productId, renk, beden, yeniMinStok) {
    const next = items.map((p) => {
      if (p.id !== productId) return p;
      return {
        ...p,
        variants: p.variants.map((v) =>
          v.renk === renk && v.beden === beden ? { ...v, minStok: Math.max(0, yeniMinStok) } : v
        ),
      };
    });
    onSave(next);
  }

  // Ürünün hâlâ "renksiz/bedensiz" varsayılan (tek Standart/Standart) durumda olup olmadığını tespit eder.
  // Ürün henüz "gerçek" bir renk/beden yapısına sahip değil mi?
  //
  // İKİ DURUM VAR ve önceden yalnızca birincisi kapsanıyordu:
  //   1. Tek bir Standart/Standart yer tutucu satırı
  //   2. HİÇ VARYANT YOK — reçeteden hızlı eklenen hammaddeler böyle doğuyor
  //
  // İkincisi kapsanmadığı için renk eklemek hiçbir şey yapmıyordu: `bedenler` listesi boş
  // olduğundan `bedenler.map(...)` boş dizi üretiyor, ürüne hiçbir varyant eklenmiyordu.
  // Kullanıcı düğmeye basıyor, hiçbir şey olmuyor ve sebebi de görünmüyordu.
  function placeholderMi(p) {
    if (!p.variants || p.variants.length === 0) return true;
    return p.variants.length === 1 && p.variants[0].renk === "Standart" && p.variants[0].beden === "Standart";
  }

  function addRenkToProduct(productId, renk) {
    renk = renk.trim();
    if (!renk) return;
    const next = items.map((p) => {
      if (p.id !== productId) return p;
      const varsayilanMinStok = (p.variants[0] || {}).minStok || 0;
      // Ürün hâlâ renksiz/bedensiz placeholder durumundaysa, yeni renk eklenince placeholder'ın
      // yerine geçilir (Standart/Standart satırı kalkar, gerçek renk devam eder).
      if (placeholderMi(p)) {
        return { ...p, variants: [{ renk, renkId: renkKimligiBul(renk, (tanimlar.renkler || [])), beden: "Standart", miktar: 0, minStok: varsayilanMinStok }] };
      }
      const bedenler = bedenSirala(Array.from(new Set(p.variants.map((v) => v.beden))));
      if (p.variants.some((v) => v.renk === renk)) return p;
      // Yeni varyant KİMLİKLE doğar: sonradan damgalanmayı beklemez, yeniden adlandırma
      // ilk andan itibaren güvenilir çalışır.
      const yeniRenkId = renkKimligiBul(renk, (tanimlar.renkler || []));
      const newVariants = bedenler.map((b) => ({ renk, renkId: yeniRenkId, beden: b, miktar: 0, minStok: varsayilanMinStok }));
      return { ...p, variants: [...p.variants, ...newVariants] };
    });
    onSave(next);
    showToast("Renk eklendi");
  }

  // Tek beden ya da BEDEN LİSTESİ (beden grubu, 14 Eylül). Liste tek `onSave` ile yazılıyor: art
  // arda çağrılan tekil eklemeler birbirinin üstüne yazıyor ve yalnız sonuncusu kalıyordu.
  function addBedenToProduct(productId, beden) {
    const adlar = (Array.isArray(beden) ? beden : [beden]).map((b) => String(b || "").trim()).filter(Boolean);
    if (adlar.length === 0) return;
    const next = items.map((p) => {
      if (p.id !== productId) return p;
      let sonuc = p;
      adlar.forEach((ad) => { sonuc = bedeniUrunEkle(sonuc, ad); });
      return sonuc;
    });
    onSave(next);
    showToast(adlar.length > 1 ? `${adlar.length} beden eklendi` : "Beden eklendi");
  }

  // Tek üründe tek beden: yeni ürün nesnesini döndürür, yazmaz (toplu ekleme için).
  function bedeniUrunEkle(urun, beden) {
    const next = [urun].map((p) => {
      const varsayilanMinStok = (p.variants[0] || {}).minStok || 0;
      // Aynı mantık: placeholder durumundaysa, yeni beden eklenince Standart/Standart satırı kalkar.
      if (placeholderMi(p)) {
        return { ...p, variants: [{ renk: "Standart", beden, miktar: 0, minStok: varsayilanMinStok }] };
      }
      const renkler = Array.from(new Set(p.variants.map((v) => v.renk)));
      if (p.variants.some((v) => v.beden === beden)) return p;
      const newVariants = renkler.map((r) => ({ renk: r, renkId: renkKimligiBul(r, (tanimlar.renkler || [])), beden, miktar: 0, minStok: varsayilanMinStok }));
      return { ...p, variants: [...p.variants, ...newVariants] };
    });
    return next[0];
  }

  // Bir renk/beden satır ya da sütununun silinmesini ENGELLEYEN nedenleri toplar.
  // Neden gerekli: silme işlemi variants dizisinden ilgili kayıtları çıkarır — yani üzerindeki
  // STOK MİKTARI da hiçbir hareket kaydı bırakmadan yok olur. Bu, envanterin kendiliğinden
  // eksilmesi demektir ve geri alınamaz. Ayrıca siparişler, üretimler ve reçeteler renk/beden
  // adına göre eşleştiği için, silinen bir beden o bağlantıları da sessizce kopartır.
  // Tek bir engel bile bulunursa silme reddedilir; kullanıcıya NEDEN reddedildiği tek tek söylenir.
  function renkBedenSilmeEngelleri(product, { renk, beden }) {
    const engeller = [];
    const eslesir = (v) => (renk ? v.renk === renk : true) && (beden ? v.beden === beden : true);

    const stokluVaryantlar = (product.variants || []).filter((v) => eslesir(v) && (v.miktar || 0) !== 0);
    if (stokluVaryantlar.length > 0) {
      const toplam = stokluVaryantlar.reduce((s, v) => s + v.miktar, 0);
      engeller.push(`üzerinde ${toplam} adet stok var`);
    }

    const hareketSayisi = (product.hareketler || []).filter((h) => (renk ? h.renk === renk : true) && (beden ? h.beden === beden : true)).length;
    if (hareketSayisi > 0) engeller.push(`${hareketSayisi} stok hareketi kayıtlı`);

    const siparisSayisi = (siparisler || []).filter((s) =>
      s.durum !== "İptal" && (s.kalemler || []).some((k) => k.urunId === product.id && (renk ? k.renk === renk : true) && (beden ? k.beden === beden : true))
    ).length;
    if (siparisSayisi > 0) engeller.push(`${siparisSayisi} siparişte kullanılıyor`);

    const uretimSayisi = (uretim || []).filter((o) => {
      if (o.urunId !== product.id) return false;
      if (renk && o.renk !== renk) return false;
      if (beden && !(o.bedenMiktarlari || []).some((bm) => bm.beden === beden)) return false;
      return true;
    }).length;
    if (uretimSayisi > 0) engeller.push(`${uretimSayisi} üretim siparişinde geçiyor`);

    // Bu ürün BAŞKA bir mamulün reçetesinde hammadde olarak, tam da bu renk/bedenle kullanılıyor olabilir.
    const receteKullanan = (items || []).filter((p2) =>
      (p2.recete || []).some((r) => r.hammaddeUrunId === product.id && (renk ? r.renk === renk : true) && (beden ? r.beden === beden : true))
    );
    if (receteKullanan.length > 0) {
      engeller.push(`${receteKullanan.length} ürünün reçetesinde hammadde olarak geçiyor (${receteKullanan.slice(0, 2).map((x) => x.ad).join(", ")}${receteKullanan.length > 2 ? "…" : ""})`);
    }

    // Mamulün KENDİ reçetesi renk/beden bazlı satırlar içeriyorsa, o satırlar sahipsiz kalırdı.
    const kendiRecete = (product.recete || []).filter((r) => (renk ? r.mamulRenk === renk : true) && (beden ? r.mamulBeden === beden : true)).length;
    if (kendiRecete > 0) engeller.push(`kendi reçetesinde ${kendiRecete} satıra bağlı`);

    return engeller;
  }

  function removeRenkFromProduct(productId, renk) {
    const product = items.find((p) => p.id === productId);
    if (!product) return;
    const engeller = renkBedenSilmeEngelleri(product, { renk });
    if (engeller.length > 0) {
      showToast(`"${renk}" rengi silinemez — ${engeller.join(", ")}. Önce bu kayıtları temizleyin.`);
      return;
    }
    const next = items.map((p) =>
      p.id === productId
        ? {
            ...p,
            variants: p.variants.filter((v) => v.renk !== renk),
            renkResimleri: Object.fromEntries(Object.entries(p.renkResimleri || {}).filter(([k]) => k !== renk)),
          }
        : p
    );
    onSave(next);
    showToast(`"${renk}" rengi kaldırıldı`);
  }

  function removeBedenFromProduct(productId, beden) {
    const product = items.find((p) => p.id === productId);
    if (!product) return;
    const engeller = renkBedenSilmeEngelleri(product, { beden });
    if (engeller.length > 0) {
      showToast(`"${beden}" bedeni silinemez — ${engeller.join(", ")}. Önce bu kayıtları temizleyin.`);
      return;
    }
    const next = items.map((p) =>
      p.id === productId ? { ...p, variants: p.variants.filter((v) => v.beden !== beden) } : p
    );
    onSave(next);
    showToast(`"${beden}" bedeni kaldırıldı`);
  }

  // Bir ürünün silinmesini engelleyen bağlantıları toplar. Renk/beden silmedeki
  // renkBedenSilmeEngelleri ile aynı mantık, ürün seviyesinde.
  function urunSilmeEngelleri(product) {
    const engeller = [];
    const hareketler = product.hareketler || [];
    const alisSayisi = hareketler.filter((h) => h.kaynak === "Satınalma").length;
    const satisSayisi = hareketler.filter((h) => h.kaynak === "Satış").length;
    const uretimHareketi = hareketler.filter((h) => h.uretimId || (h.kaynak || "").startsWith("Üretim")).length;
    const digerHareket = hareketler.length - alisSayisi - satisSayisi - uretimHareketi;

    if (alisSayisi > 0) engeller.push(`${alisSayisi} alış hareketi`);
    if (satisSayisi > 0) engeller.push(`${satisSayisi} satış hareketi`);
    if (uretimHareketi > 0) engeller.push(`${uretimHareketi} üretim hareketi`);
    if (digerHareket > 0) engeller.push(`${digerHareket} stok hareketi`);

    const bagliUretimler = (uretim || []).filter((o) => o.urunId === product.id);
    if (bagliUretimler.length > 0) {
      engeller.push(`${bagliUretimler.length} üretim siparişi (${bagliUretimler.slice(0, 3).map((o) => o.siparisNo).join(", ")}${bagliUretimler.length > 3 ? "…" : ""})`);
    }
    const bagliSiparisler = (siparisler || []).filter((s) => s.kalemler.some((k) => k.urunId === product.id));
    if (bagliSiparisler.length > 0) {
      engeller.push(`${bagliSiparisler.length} sipariş (${bagliSiparisler.slice(0, 3).map((s) => s.siparisNo).join(", ")}${bagliSiparisler.length > 3 ? "…" : ""})`);
    }
    const hammaddesiOlarakKullanan = items.filter(
      (p) => p.id !== product.id && (p.recete || []).some((r) => r.hammaddeUrunId === product.id)
    );
    if (hammaddesiOlarakKullanan.length > 0) {
      engeller.push(`${hammaddesiOlarakKullanan.length} ürünün reçetesi (${hammaddesiOlarakKullanan.slice(0, 3).map((p) => p.ad).join(", ")}${hammaddesiOlarakKullanan.length > 3 ? "…" : ""})`);
    }
    return engeller;
  }

  // ÖNEMLİ POLİTİKA DEĞİŞİKLİĞİ: bağlantılı ürünler ARTIK HİÇ SİLİNMİYOR — onayla bile.
  //
  // Eskiden "hepsini birlikte sil" (cascade) seçeneği vardı: ürünle beraber stok hareketleri, üretim
  // siparişleri, sipariş kalemleri ve diğer ürünlerin reçete satırları da siliniyordu. Sorun şu ki
  // bu kayıtlar birbirine bağlı bir AĞ oluşturuyor; bir düğümü çekip almak, bağlı olduğu her yerde
  // delik açıyor. Silinen bir sipariş kaleminin karşılığı cari ekstresinde duruyor, geri sarılan bir
  // üretim başka bir ürünün stoğunu değiştiriyor, boşalan reçete satırı maliyeti sessizce bozuyor.
  // Tek bir "evet" ile geri alınamaz bir zincir başlıyordu.
  //
  // Yeni kural: geçmişi olan kayıt silinmez. Kullanımdan kaldırılması gereken ürün silinmez, pasife
  // alınır ya da yeni işlem girilmez. Yalnızca HİÇ dokunulmamış (hareketsiz, siparişsiz, reçetesiz)
  // ürünler silinebilir — onların silinmesi hiçbir yerde delik açmaz.
  function removeProduct(id) {
    const product = items.find((p) => p.id === id);
    if (!product) return;

    const engeller = urunSilmeEngelleri(product);
    if (engeller.length > 0) {
      showToast(`"${product.ad}" silinemez — ${engeller.join(", ")} var. Geçmişi olan ürün silinmez; kullanımdan kaldırmak için yeni işlem girmeyin.`);
      return;
    }

    // Yetkisi olmayan bir kullanıcı silme yapmaya çalışırsa, doğrudan silmek yerine yöneticinin
    // onayına düşürülür; onay bekleyenler panelinden onaylanırsa bu fonksiyon bypassOnay=true ile
    // tekrar çağrılıp gerçek silme işlemi uygulanır.
    if (kullaniciYetkisiVar && !kullaniciYetkisiVar("stok", "silme")) {
      onayIste("stok", "Sil", `"${product.ad}" ürününü sil`, "urunSil", { productId: id });
      return;
    }

    // Buraya yalnızca bağlantısız ürünler ulaşır — yan etkisi yok, sorunsuz geri yüklenebilir.
    if (onCopaAt) {
      onCopaAt("urun", product.ad, product, {
        ozet: `${product.kategori || "Ürün"}${product.kod ? " · " + product.kod : ""} — bağlantısız`,
        yanEtkiliMi: false,
      });
    }
    onSave(items.filter((p) => p.id !== id));
    showToast("Ürün silindi — Tanımlar > Çöp Kutusu'ndan geri alınabilir");
  }


  function ekFiyatEkle(productId, tip, paraBirimi, tutar) {
    const n = parseFloat(tutar);
    if (!n || n <= 0) return;
    const next = items.map((p) =>
      p.id === productId
        ? { ...p, ekFiyatlar: [...(p.ekFiyatlar || []), { id: uid("fiyat"), tip, paraBirimi, tutar: n }] }
        : p
    );
    onSave(next);
  }

  function ekFiyatSil(productId, ekFiyatId) {
    const next = items.map((p) =>
      p.id === productId ? { ...p, ekFiyatlar: (p.ekFiyatlar || []).filter((f) => f.id !== ekFiyatId) } : p
    );
    onSave(next);
  }



  // Birden fazla reçete satırını TEK seferde (tek onSave çağrısıyla) siler — döngü içinde art arda
  // receteSatiriSil çağırmak, her çağrının aynı (henüz güncellenmemiş) items'ı kullanması yüzünden
  // sadece SON silinen id'nin etkili olmasına yol açıyordu (öncekiler geri "diriliyordu").
  function receteSatirlariSilToplu(productId, satirIdleri) {
    if (!satirIdleri || satirIdleri.length === 0) return;
    const idSet = new Set(satirIdleri);
    const next = items.map((p) =>
      p.id === productId ? { ...p, recete: (p.recete || []).filter((r) => !idSet.has(r.id)) } : p
    );
    onSave(next);
  }

  // Bir reçete grubunu tek seferde günceller: eski satırları siler ve yenilerini ekler (tutarlılık için tek işlemde).
  function receteGrubuGuncelle(productId, silinecekIdler, yeniSatirlar) {
    const next = items.map((p) => {
      if (p.id !== productId) return p;
      const kalanlar = (p.recete || []).filter((r) => !silinecekIdler.includes(r.id));
      const eklenenler = yeniSatirlar.map((s) => ({ id: uid("recete"), ...s }));
      return { ...p, recete: [...kalanlar, ...eklenenler] };
    });
    onSave(next);
  }

  function prosesUcretGuncelle(productId, proses, ucret) {
    const next = items.map((p) =>
      p.id === productId ? { ...p, prosesUcretleri: { ...(p.prosesUcretleri || {}), [proses]: ucret } } : p
    );
    onSave(next);
  }



  function urunGuncelle(productId, fields) {
    const next = items.map((p) => (p.id === productId ? { ...p, ...fields } : p));
    onSave(next);
    showToast("Ürün güncellendi");
  }

  function updateKategori(productId, kategori) {
    // Mamule çevrilen bir ürünün ölçü tipi de Beden'e alınır: mamulde boyut kavramı yok, aksi halde
    // ürün "Boyut bazlı" görünmeye devam eder ve beden ekleme listesi boş kalırdı.
    const next = items.map((p) =>
      p.id === productId
        ? { ...p, kategori, olcuTipi: kategori === "Mamul" ? "Beden" : (p.olcuTipi || "Beden") }
        : p
    );
    onSave(next);
    showToast("Kategori güncellendi");
  }

  function updateKapakResmi(productId, url) {
    const next = items.map((p) => (p.id === productId ? { ...p, kapakResmi: url } : p));
    onSave(next);
  }

  // TEKNİK ÇİZİM (17 Eylül): ürünün üretim çizimleri ve teknik notu.
  // Görseller `teknikCizimler: [{ id, gorsel, baslik }]`, not `teknikNot` (serbest metin).
  // Kapak resmiyle aynı yolu kullanıyor: ColorSwatch görseli veriyor, burada listeye giriyor.
  function teknikCizimEkle(productId, url) {
    if (!url) return;
    const next = items.map((p) => (p.id === productId
      ? { ...p, teknikCizimler: [...(p.teknikCizimler || []), { id: uid("tcz"), gorsel: url, baslik: "" }] }
      : p));
    onSave(next);
    showToast("Teknik çizim eklendi");
  }

  function teknikCizimSil(productId, cizimId) {
    const next = items.map((p) => (p.id === productId
      ? { ...p, teknikCizimler: (p.teknikCizimler || []).filter((c) => c.id !== cizimId) }
      : p));
    onSave(next);
  }

  function teknikCizimGuncelle(productId, cizimId, alanlar) {
    const next = items.map((p) => (p.id === productId
      ? { ...p, teknikCizimler: (p.teknikCizimler || []).map((c) => (c.id === cizimId ? { ...c, ...alanlar } : c)) }
      : p));
    onSave(next);
  }

  function teknikNotDegistir(productId, metin) {
    const next = items.map((p) => (p.id === productId ? { ...p, teknikNot: metin } : p));
    onSave(next);
  }

  function updateRenkResmi(productId, renk, url) {
    const next = items.map((p) =>
      p.id === productId ? { ...p, renkResimleri: { ...(p.renkResimleri || {}), [renk]: url } } : p
    );
    onSave(next);
  }

  function removeRenkResmi(productId, renk) {
    const next = items.map((p) => {
      if (p.id !== productId) return p;
      const ri = { ...(p.renkResimleri || {}) };
      delete ri[renk];
      return { ...p, renkResimleri: ri };
    });
    onSave(next);
  }

  const aktifItems = items.filter((p) => !p.pasif);
  const pasifSayisi = items.length - aktifItems.length;

  function pasifDegistir(id, yeniDurum) {
    const urun = items.find((p) => p.id === id);
    if (!urun) return;
    onSave(items.map((p) => (p.id === id ? { ...p, pasif: yeniDurum } : p)));
    showToast(
      yeniDurum
        ? `"${urun.ad}" pasife alındı — geçmişi duruyor, yeni işlemlerde seçilemez`
        : `"${urun.ad}" yeniden aktif`
    );
  }

  // TANIM SIRASI ÖNEMLİ: aşağıdaki `filtered` bunu kullanıyor. Sonra tanımlansaydı bileşen
  // "Cannot access before initialization" ile çöküyordu — TDZ denetleyicisi bileşen içindeki
  // `const` sırasına bakmadığı için bunu yakalamadı, tarayıcı senaryosu yakaladı.
  const ozelKodAlanlari = tanimlar.ozelKodAlanlari || [];

  const filtered = items.filter((p) => {
    // Pasifler ayrı sekmede. Varsayılan görünüm yalnızca aktifleri gösterir — pasifi de listelemek,
    // "pasife alma"nın işe yaramaması demek olurdu.
    if (pasifSekme ? !p.pasif : !!p.pasif) return false;
    // Özel kodlar ARAMAYA da giriyor: hem alan adı hem değer. "taban" yazmak taban alanı dolu
    // olanları, "147" yazmak o değere sahip olanı buluyor. Yalnızca ÜRÜNE UYGULANAN alanlar
    // taranıyor (genel + kendi tipi); başka tipin alanı bu üründe zaten yok.
    // TEK SÜZGEÇ: ARAMA ÇUBUĞU (kullanıcı, 6 Eylül: "stok yönetimi ekranı çok dolu, filtreler her
    // tarafı kapattı; üstteki hepsini kapat, arama çubuğundan filtre yapalım sadece").
    //
    // Beş ayrı açılır süzgeç (malzeme tipi, mamul tipi, sezon, sezon yılı, özel kod + değeri)
    // ekranın üst şeridini dolduruyordu. Hepsi ARAMANIN İÇİNE alındı: yazılan kelime ürün adında,
    // renk/bedende, özel kodlarda, KATEGORİDE, tipte, sezonda ve YILDA aranıyor.
    //
    // "hammadde" yazmak kategoriyi, "yazlık" sezonu, "2027" yılı, "taban" özel kod alanını
    // süzüyor — eskiden bunların her biri ayrı bir açılır listeydi.
    const haystack = [
      p.ad,
      p.kategori,
      p.malzemeTipi, p.mamulTipi,
      p.sezon, p.sezonYili,
      ozelKodMetni(p, ozelKodAlanlari),
      p.variants.map((v) => `${v.renk} ${v.beden}`).join(" "),
    ].filter(Boolean).join(" ").toLocaleLowerCase("tr-TR");
    // BOŞLUKLA AYRILAN HER KELİME AYRI ARANIYOR: "mamul yazlık" ikisini de taşıyanı bulur.
    // Tek dize olarak arasaydık kelime sırası önemli olurdu ve "yazlık mamul" hiçbir şey bulmazdı.
    const matchQ = query.trim().toLocaleLowerCase("tr-TR").split(/\s+/).filter(Boolean)
      .every((kelime) => haystack.includes(kelime));
    const matchCat = filterCat === "Tümü" || p.kategori === filterCat;
    // Alan seçili ama değer "Tümü" ise: O ALANI DOLU OLANLAR. "Tabanı olanları göster" ayrı ve
    // sık sorulan bir soru; boş bırakılmış kayıtları ayıklamanın da yolu bu.
    //
    // Eşleşme ALAN KİMLİĞİYLE. İndisle olsaydı, tipe göre alan listesi değiştiği için aynı indis
    // iki üründe iki farklı alanı gösterirdi.
    const matchOzelKod = !filterOzelKodId ? true : (() => {
      const dgr = String(((p.ozelKodlar || {})[filterOzelKodId]) || "").trim();
      return filterOzelKodDeger === "Tümü" ? !!dgr : dgr === filterOzelKodDeger;
    })();
    return matchQ && matchCat && matchOzelKod;
  });

  // ---- KATALOG ---------------------------------------------------------------------------------
  //
  // FİYAT KURALI — işin en ince noktası (kullanıcı, 6 Eylül): "Fiyatlar çekilecek ama burada ince
  // nokta, sadece ana ekrandaki fiyatlar; çünkü özel fiyatlar görünmesi tehlikeli."
  //
  // Bu yüzden katalog `fiyatBul`u HİÇ ÇAĞIRMIYOR. `fiyatBul` cari kimliği ve fiyat grubuyla
  // çalışıp müşteriye özel fiyatı döndürüyor; ekranda bir müşteriye başka bir müşterinin fiyatını
  // göstermek pahalı bir hata olurdu. Katalog yalnızca ürün kaydının KENDİ alanlarını okuyor:
  // `satisFiyati` ve `alisFiyati`. Fiyatlandırma sekmesindeki kurallar buraya sızmıyor.
  // İKİ FİYATIN İKİ AYRI BİRİMİ VAR. Önceden tek `paraBirimi` vardı ve ALIŞIN birimiydi:
  // katalogda satış fiyatı yanlış birimle gösteriliyordu.
  const katalogFiyat = (p) => ({
    satis: p.satisFiyati || 0,
    satisBirimi: p.satisParaBirimi || "₺",
    alis: p.alisFiyati || 0,
    alisBirimi: p.alisParaBirimi || "₺",
  });

  const katalogRenkleri = (p) => Array.from(new Set((p.variants || []).map((v) => v.renk)));   // sirasiz-tamam
  // Tam ekran gösterilen görsel: { url, ad } | null
  const [buyukGorsel, setBuyukGorsel] = useState(null);

  const katalogGorsel = (p, renk) => (renk ? (p.renkResimleri || {})[renk] : "") || p.kapakResmi || "";
  const katalogStok = (p, renk) => (p.variants || [])
    .filter((v) => !renk || v.renk === renk)
    .reduce((t, v) => t + (v.miktar || 0), 0);

  // Fotoğrafla bulma havuzu: SÜZÜLMÜŞ listenin ürün+renkleri. Kategori sekmesi ya da arama
  // daraltılmışsa arama da o kadar daralıyor — süzgeç ile aramanın ayrışmaması bu sayede.
  const katalogHavuzu = filtered.flatMap((p) => katalogRenkleri(p).map((r) => ({
    urunId: p.id, urunAd: p.ad, renk: r, gorsel: katalogGorsel(p, r),
    etiket: p.kategori,
  })));

  const katalogUrun = katalogUrunId ? filtered.find((p) => p.id === katalogUrunId) : null;

  function katalogAc(urunId, renk) {
    const p = items.find((x) => x.id === urunId);
    setKatalogUrunId(urunId);
    setKatalogRenk(renk || (p ? (katalogRenkleri(p)[0] || "") : ""));
    setKatalogFotoAcik(false);
  }

  // ---- KATALOG DETAYI — büyük görsel + çevresinde varyantlar --------------------------------
  //
  // Kullanıcı: "1 büyük resim ve etrafında varyant resimleri listelenecek… amaç web sitesinden
  // alışveriş yapıyor gibi." Varyanta tıklamak büyük görseli ve stok dökümünü birlikte
  // değiştiriyor: seçilen renk, bakılan şeyin tamamı.
  //
  // DETAY IZGARANIN İÇİNDE, TIKLANAN KARTIN HEMEN ALTINDA çiziliyor. Önceden ızgaranın ÜSTÜNDE
  // duruyordu: aşağıdaki bir karta tıklayan kullanıcı, açılan detayı görmek için sayfayı yukarı
  // kaydırmak zorunda kalıyordu (kullanıcı bildirdi, 6 Eylül). Fonksiyona çıkarıldı ki ızgaranın
  // içinden çağrılabilsin.
  const katalogDetayiCiz = (p) => {
        const fiyat = katalogFiyat(p);
        const renkler = katalogRenkleri(p);
        const seciliRenk = renkler.includes(katalogRenk) ? katalogRenk : (renkler[0] || "");
        const bedenler = (p.variants || [])
          .filter((v) => v.renk === seciliRenk)
          .slice()
          .sort((a, b) => String(a.beden).localeCompare(String(b.beden), "tr", { numeric: true }));
        const dolular = ozelKodCiftleri(p, ozelKodAlanlari);
        return (
          <div style={{ border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-lg)", background: "#fff", padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, color: "var(--erp-text)" }}>{p.ad}</h3>
              <KategoriIkonu kategori={p.kategori} size={16} />
              <span style={{ fontSize: 12, color: "var(--erp-text-2)" }}>{p.kategori}{p.mamulTipi ? ` · ${p.mamulTipi}` : ""}{p.sezon ? ` · ${p.sezon}` : ""}</span>
              <button className="btn-ghost" style={{ marginLeft: "auto", padding: "4px 12px", fontSize: 12 }} onClick={() => setKatalogUrunId(null)}>
                <X size={13} /> Kapat
              </button>
            </div>

            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
              {/* BÜYÜK GÖRSEL + ÇEVRESİNDEKİ VARYANTLAR */}
              <div style={{ display: "grid", gap: 8, flex: "0 0 auto" }}>
                <div style={{
                  width: 280, height: 280, borderRadius: "var(--erp-r-lg)", overflow: "hidden",
                  border: "1px solid var(--erp-line-soft)", background: "var(--erp-panel)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {/* RESME TIKLAYINCA TAM EKRAN (kullanıcı, 10 Eylül). 280 pikselik kutuda
                      `objectFit: cover` görüntüyü KIRPIYOR; deri deseni, taban dişi gibi
                      ayrıntılar için tam hâli gerekiyor. */}
                  {katalogGorsel(p, seciliRenk)
                    ? (
                      <img
                        src={katalogGorsel(p, seciliRenk)}
                        alt={p.ad}
                        onClick={() => setBuyukGorsel({ url: katalogGorsel(p, seciliRenk), ad: `${p.ad}${seciliRenk ? " · " + seciliRenk : ""}` })}
                        title="Büyütmek için tıklayın"
                        style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in" }}
                      />
                    )
                    : <span style={{ fontSize: 12, color: "var(--erp-text-3)" }}>görsel yok</span>}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 280 }}>
                  {renkler.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setKatalogRenk(r)}
                      title={r}
                      style={{
                        width: 54, height: 54, borderRadius: "var(--erp-r-md)", overflow: "hidden", cursor: "pointer", padding: 0,
                        border: `2px solid ${r === seciliRenk ? "var(--erp-info)" : "var(--erp-border-2)"}`,
                        background: "var(--erp-panel)",
                      }}
                    >
                      {katalogGorsel(p, r)
                        ? <img src={katalogGorsel(p, r)} alt={r} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontSize: 9, color: "var(--erp-text-2)" }}>{r}</span>}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--erp-text)" }}>{seciliRenk || "—"}</div>
              </div>

              {/* BİLGİLER */}
              <div style={{ display: "grid", gap: 12, flex: 1, minWidth: 260 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
                  <span className="mono" style={{ fontSize: 24, fontWeight: 700, color: "var(--erp-info)" }}>
                    {fiyat.satis ? `${fiyat.satis} ${fiyat.satisBirimi}` : "fiyat girilmemiş"}
                  </span>
                  {/* ALIŞ FİYATI YALNIZCA PERSONEL GÖRÜNÜMÜNDE. Müşteriye maliyet göstermek,
                      pazarlığın tamamını karşı tarafa vermek demek. */}
                  {!musteriGorunumu && fiyat.alis ? (
                    <span className="mono" style={{ fontSize: 13, color: "var(--erp-brown)" }}>alış {fiyat.alis} {fiyat.alisBirimi}</span>
                  ) : null}
                </div>

                {/* SEÇİLİ RENGİN BEDEN/STOK DÖKÜMÜ.
                    matris-muaf: tek renk için beden başına tek sayı; bu bir ürün kartı özeti,
                    malzeme·beden ihtiyaç listesi değil. */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text-2)", marginBottom: 5 }}>
                    {musteriGorunumu ? "MEVCUT ÖLÇÜLER" : "ÖLÇÜ / STOK"}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {bedenler.length === 0 ? <span style={{ fontSize: 12, color: "var(--erp-text-3)" }}>—</span> : bedenler.map((v) => (
                      <span
                        key={v.beden}
                        className="mono"
                        style={{
                          fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: "var(--erp-r-pill)",
                          border: "1px solid var(--erp-line-soft)",
                          background: (v.miktar || 0) > 0 ? "#EEF4F8" : "var(--erp-panel)",
                          color: (v.miktar || 0) > 0 ? "var(--erp-info)" : "var(--erp-text-3)",
                        }}
                      >
                        {/* Müşteriye ADET değil, VARLIK gösteriliyor: "3 tane kaldı" pazarlık
                            malzemesi, "var/yok" ise siparişin cevabı. */}
                        {v.beden}{musteriGorunumu ? "" : `: ${v.miktar || 0}`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* ÖZEL KODLAR — kullanıcı: "ürün bilgileri çekilecek, özel kodlar burada devreye
                    girecek". Boş olanlar çizilmiyor: beş boş satır bilgi değil gürültü. */}
                {dolular.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text-2)", marginBottom: 5 }}>ÜRÜN BİLGİLERİ</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 6 }}>
                      {dolular.map((x) => (
                        <div key={x.etiket} style={{ fontSize: 12 }}>
                          <span style={{ color: "var(--erp-text-2)" }}>{x.etiket}: </span>
                          <span style={{ color: "var(--erp-text)", fontWeight: 600 }}>{x.deger}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!musteriGorunumu && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn-ghost" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => urunAc(p.id)}>
                      Ürün kartını aç
                    </button>
                    {onGoToSiparis && (
                      <button className="btn-primary" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => onGoToSiparis(null)}>
                        Sipariş ekranına git
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
  };

  // Seçili alanın kullanılan değerleri — açılır listeyi dolduruyor. Elle yazdırmak yerine
  // seçtirmek, "147" ile "147 " arasındaki farkın süzgeci boş döndürmesini engelliyor.
  const ozelKodDegerleri = !filterOzelKodId ? [] : Array.from(new Set(
    aktifItems.map((p) => String(((p.ozelKodlar || {})[filterOzelKodId]) || "").trim()).filter(Boolean)
  )).sort((a, b) => String(a).localeCompare(String(b), "tr", { numeric: true }));

  // Süzgeçte YALNIZCA gerçekten kullanılan alanlar listeleniyor. Hiç doldurulmamış bir alanı
  // seçtirmek, boş bir sonuç listesine giden bir yol açmaktan başka bir işe yaramaz.
  const kullanilanOzelKodAlanlari = ozelKodAlanlari
    .filter((a) => aktifItems.some((p) => String(((p.ozelKodlar || {})[a.id]) || "").trim()));

  const lowStockProductCount = aktifItems.filter((p) => p.variants.some((v) => { const esik = v.minStok ?? p.minStok ?? 0; return esik > 0 && v.miktar < esik; })).length;
  const toplamStokDegeri = items.reduce((sum, p) => {
    const miktar = p.variants.reduce((s, v) => s + v.miktar, 0);
    const birimDeger = p.kategori === "Mamul" ? (p.satisFiyati || 0) : (p.alisFiyati || 0);
    return sum + miktar * birimDeger;
  }, 0);
  // Mamul artık DIŞARIDA BIRAKILMIYOR: satış para birimi eklenmeden önce mamulün dövizli bir
  // fiyatı olamıyordu, şimdi olabiliyor. Dışarıda bırakmak, dövizli mamulü olan bir kurulumda
  // toplamın sessizce yanlış çıkmasına yol açardı.
  const farkliParaBirimiVar = items.some((p) =>
    (p.alisParaBirimi || "₺") !== "₺" || (p.satisParaBirimi || "₺") !== "₺");

  const tanimEksik = tanimlar.renkler.length === 0 || tanimlar.bedenler.length === 0;

  const [bagliOlmayanGoster, setBagliOlmayanGoster] = useState(false);

  // Bir stok hareketi, bir siparişe/üretime/cariye referans (siparisId/uretimId/cariId) TAŞIYABİLİR —
  // eğer bu referans DOLU ama işaret ettiği kayıt artık YOKSA (sipariş/üretim/cari başka bir yerden
  // silinmiş ama BU hareket temizlenmemişse), bu hareket "bağlantısız" (yetim) sayılır. Bu, "Fişler"
  // modülündeki fişNo bazlı gruplamadan BAĞIMSIZ, doğrudan ham hareket seviyesinde bir kontroldür —
  // fişNo'su olmayan ya da fiş gruplamasına hiç girmemiş tekil hareketleri de yakalar.
  const bagliOlmayanHareketler = [];
  items.forEach((p) => {
    (p.hareketler || []).forEach((h) => {
      const sorunlar = [];
      if (h.siparisId && !(siparisler || []).some((s) => s.id === h.siparisId)) sorunlar.push("bağlı sipariş silinmiş");
      if (h.uretimId && !(uretim || []).some((o) => o.id === h.uretimId)) sorunlar.push("bağlı üretim silinmiş");
      if (h.cariId && !(cariler || []).some((c) => c.id === h.cariId)) sorunlar.push("bağlı cari silinmiş");
      if (sorunlar.length > 0) {
        bagliOlmayanHareketler.push({ urunId: p.id, urunAd: p.ad, ...h, sorunlar });
      }
    });
  });

  function bagliOlmayanHareketiSil(urunId, hareketId) {
    onSave(items.map((p) => {
      if (p.id !== urunId) return p;
      const h = (p.hareketler || []).find((x) => x.id === hareketId);
      if (!h) return p;
      return {
        ...p,
        variants: p.variants.map((v) => (v.renk === h.renk && v.beden === h.beden ? { ...v, miktar: stokYuvarla(v.miktar - h.miktar) } : v)),
        hareketler: (p.hareketler || []).filter((x) => x.id !== hareketId),
      };
    }));
    showToast("Bağlantısız hareket temizlendi, stok miktarı düzeltildi");
  }

  return (
    <div>
      {/* TAM EKRAN GÖRSEL — kullanıcı, 10 Eylül: "stok resmine tıklayınca büyük resmini açsın".
          Zemin ve resim TIKLANINCA KAPANIYOR: ayrı bir kapatma düğmesi aramak zorunda kalmasın.
          `zIndex` 900: pencerelerin (600) üstünde ama şeridin altında değil — görsel her şeyin
          önünde durmalı. */}
      {buyukGorsel && (
        <div
          onClick={() => setBuyukGorsel(null)}
          title="Kapatmak için tıklayın"
          style={{
            position: "fixed", inset: 0, zIndex: 900, background: "rgba(30,24,16,.86)",
            display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
            gap: 12, padding: 20, cursor: "zoom-out",
          }}
        >
          <img
            src={buyukGorsel.url}
            alt={buyukGorsel.ad}
            // `contain`: kırpma YOK — büyütmenin amacı tam hâli görmek.
            style={{ maxWidth: "100%", maxHeight: "85vh", objectFit: "contain", borderRadius: "var(--erp-r-md)" }}
          />
          <div className="mono" style={{ color: "var(--erp-panel-2)", fontSize: 13 }}>{buyukGorsel.ad}</div>
        </div>
      )}

      {bagliOlmayanHareketler.length > 0 && (
        <div style={{ background: "var(--erp-orange-bg)", border: "1.5px solid #E1611F", borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <AlertTriangle size={16} color="var(--erp-warn)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-warn)" }}>
              {bagliOlmayanHareketler.length} bağlantısız stok hareketi bulundu — bunlar silinmiş sipariş/üretim/cari kayıtlarına işaret ediyor, stok miktarınızı yanlış şişiriyor olabilir.
            </span>
            <button type="button" className="btn-ghost" style={{ marginLeft: "auto", fontSize: 12 }} onClick={() => setBagliOlmayanGoster((v) => !v)}>
              {bagliOlmayanGoster ? "Gizle" : "Listeyi Göster"}
            </button>
          </div>
          {bagliOlmayanGoster && (
            <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
              {bagliOlmayanHareketler.map((h) => (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: "#fff", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: "6px 10px", fontSize: 12 }}>
                  <span className="mono" style={{ color: "var(--erp-text-3)" }}>{h.tarih ? tarihYaz(h.tarih) : "—"}</span>
                  <span style={{ fontWeight: 700 }}>{h.urunAd}</span>
                  {/* matris-muaf: bu bir denetim listesi, miktar dökümü değil. Her satır tek bir
                      BOZUK HAREKET kaydı ve tek tek silinebiliyor; birleştirmek silme hedefini
                      belirsizleştirirdi. */}
                  <span className="mono">{h.renk} · {h.beden}</span>
                  <span className="mono" style={{ fontWeight: 700, color: h.miktar >= 0 ? "var(--erp-primary)" : "var(--erp-warn)" }}>{h.miktar > 0 ? "+" : ""}{h.miktar}</span>
                  {h.fisNo && <span className="mono" style={{ color: "var(--erp-text-2)" }}>Fiş: {h.fisNo}</span>}
                  <span style={{ color: "var(--erp-warn)", fontStyle: "italic" }}>{h.sorunlar.join(", ")}</span>
                  <SilOnayButonu onConfirm={() => bagliOlmayanHareketiSil(h.urunId, h.id)} boyut={11} baslikNormal="Bu hareketi sil" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TEK SATIR, SIKI (kullanıcı, 12 Eylül): arama · stok değeri · iki düğme. Dolgular küçüldü,
          düğmeler kısa; telefonda iki satıra sarılsa da liste bir ekran yukarı geldi. */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={14} style={{ position: "absolute", left: 9, top: 8, color: "var(--erp-text-3)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ara: ürün, renk, beden, kategori, tip, sezon…"
            title="Boşlukla ayırarak birden çok kelime yazabilirsiniz — hepsini birden taşıyan ürünler listelenir (örn. &quot;mamul yazlık 2027&quot;)"
            style={{
              width: "100%",
              padding: "6px 8px 6px 28px",
              borderRadius: "var(--erp-r-md)",
              border: "1px solid var(--erp-line)",
              background: "var(--erp-panel)",
              fontSize: 13,
            }}
          />
        </div>
        {lowStockProductCount > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--erp-warn)" }}>
            <AlertTriangle size={14} /> {lowStockProductCount} üründe kritik seviyede varyant var
          </span>
        )}
        {items.length > 0 && (
          <span className="mono" style={{ fontSize: 11, color: "var(--erp-primary)", fontWeight: 600, whiteSpace: "nowrap" }} title="Toplam stok değeri">
            Stok değeri: {toplamStokDegeri.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
            {farkliParaBirimiVar && (
              <span title="Bazı ürünlerin alış ya da satış fiyatı ₺ dışında girilmiş; bu toplam kur çevrimi yapılmadan ham sayıyla hesaplanmıştır" style={{ color: "var(--erp-warn)", marginLeft: 4 }}>
                *
              </span>
            )}
          </span>
        )}
        <button
          className="btn-ghost"
          style={{ marginLeft: "auto", padding: "5px 10px", fontSize: 12 }}
          title="Bağımsız stok girişi — siparişsiz giriş/çıkış"
          onClick={() => setShowBagimsizGiris((s) => !s)}
        >
          <ArrowRight size={14} style={{ transform: "rotate(-90deg)" }} /> Stok Girişi
        </button>
        <button
          className="btn-primary"
          style={{ padding: "5px 12px", fontSize: 12 }}
          onClick={() => {
            if (tanimEksik) {
              showToast("Önce Tanımlar ekranından renk ve beden ekleyin");
              onGoToTanimlar();
              return;
            }
            // Hangi kategori sekmesi açıksa yeni ürün doğrudan o kategoriyle açılır — "Tümü" sekmesindeyken varsayılan Hammadde.
            const yeniKategori = filterCat !== "Tümü" ? filterCat : "Hammadde";
            // Mamul her zaman beden bazlıdır; kategori Mamul ise ölçü tipi zorla Beden'e alınır.
            // Aksi halde önce hammadde açıp "Boyut" seçen, sonra mamul açan kullanıcıda ölçü tipi
            // Boyut'ta takılı kalıyor ve beden listesi boş görünüyordu.
            setForm((f) => ({
              ...f,
              kategori: yeniKategori,
              malzemeTipi: "",
              olcuTipi: yeniKategori === "Mamul" ? "Beden" : f.olcuTipi,
            }));
            // Mamulde "bedensiz" seçeneği yok; önceki üründen kalan işaret temizlenir, aksi halde
            // kutu görünmediği için kaldırılamayan gizli bir durum oluşurdu.
            if (yeniKategori === "Mamul") setBedensiz(false);
            setSelBedenler([]);
            setSelRenkler([]);
            setShowForm((s) => !s);
            setMatrix(null);
          }}
        >
          <Plus size={14} /> Ürün Ekle
        </button>
      </div>

      {showBagimsizGiris && (
        <BagimsizStokGirisiFormu
          items={items}
          asortiler={tanimlar.asortiler || []}
          onKaydet={bagimsizStokGirisiYap}
          onAsortiOlustur={onAsortiOlustur}
          onKapat={() => setShowBagimsizGiris(false)}
        />
      )}

      <div style={{ display: "flex", gap: 2, marginBottom: 8, borderBottom: "1px solid var(--erp-line-soft)", flexWrap: "wrap", alignItems: "center" }}>
        {/* PASİF SEKMESİ — pasife alınan kartlar buradan görülür ve geri alınabilir.
            Sayı sıfırsa sekme hiç gösterilmez: hiç pasif kaydı olmayan bir kullanıcıya boş bir
            sekme sunmak, arayüzü sebepsiz kalabalıklaştırırdı. */}
        {pasifSayisi > 0 && (
          <button
            type="button"
            onClick={() => setPasifSekme((v) => !v)}
            style={{
              padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              border: "none", background: "transparent",
              color: pasifSekme ? "var(--erp-purple)" : "var(--erp-text-3)",
              borderBottom: pasifSekme ? "2px solid #6B4E8A" : "2px solid transparent",
            }}
          >
            Pasifler ({pasifSayisi})
          </button>
        )}
        {["Tümü", ...KATEGORILER].map((k) => {
          const sayi = k === "Tümü" ? aktifItems.length : aktifItems.filter((p) => p.kategori === k).length;
          const aktif = filterCat === k;
          const renk = k === "Tümü" ? "var(--erp-text)" : (CAT_COLORS[k] || "var(--erp-text-2)");
          return (
            <button
              key={k}
              type="button"
              onClick={() => setFilterCat(k)}
              // Seçili sekme DOLU: ince alt çizgi, hangi kategoride çalışıldığını yeterince
              // söylemiyordu — özellikle uzun bir listede aşağı inildiğinde sekme görüş alanından
              // çıkıyor ve kullanıcı hangi kategoride olduğunu unutabiliyor.
              style={{
                padding: "5px 10px", fontSize: 12, fontWeight: aktif ? 700 : 600, cursor: "pointer",
                background: aktif ? renk : "transparent",
                color: aktif ? "var(--erp-panel-2)" : "var(--erp-text-3)",
                border: "none",
                borderRadius: "6px 6px 0 0",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {k !== "Tümü" && <KategoriIkonu kategori={k} size={14} renkSabit={aktif ? "var(--erp-panel-2)" : undefined} />}
              {k}
              <span
                className="mono"
                style={{
                  fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: "var(--erp-r-pill)",
                  background: aktif ? "rgba(255,255,255,.22)" : "var(--erp-panel-2)", color: aktif ? "var(--erp-panel-2)" : "var(--erp-text-3)",
                }}
              >
                {sayi}
              </span>
            </button>
          );
        })}
        {/* GÖRÜNÜM ANAHTARI AYNI SATIRDA (kullanıcı, 12 Eylül: "ekranın yarısına yakını arama, sekme
            vs. — bunları saralım"). Liste/Katalog ayrı bir satır kaplıyordu; kategori sekmelerinin
            sağına alındı. Katalog ayrı bir sekme DEĞİL: arama, kategori ve süzgeçler ikisinde de
            aynı listeyi belirliyor, yalnız çizim değişiyor. */}
        <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginLeft: "auto", padding: "3px 0" }}>
        {[{ k: false, ad: "Liste" }, { k: true, ad: "Katalog" }].map((g) => (
          <button
            key={g.ad}
            type="button"
            onClick={() => { setKatalogMod(g.k); setKatalogUrunId(null); }}
            style={{
              padding: "4px 12px", borderRadius: "var(--erp-r-pill)", fontWeight: 700, fontSize: 12, cursor: "pointer",
              border: `1.5px solid ${katalogMod === g.k ? "var(--erp-info)" : "var(--erp-border)"}`,
              background: katalogMod === g.k ? "#3D6B8A1A" : "#fff",
              color: katalogMod === g.k ? "var(--erp-info)" : "var(--erp-text)",
            }}
          >
            {g.ad}
          </button>
        ))}
        {katalogMod && (
          <>
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: "5px 12px", fontSize: 12 }}
              onClick={() => setKatalogFotoAcik(!katalogFotoAcik)}
            >
              <Camera size={13} /> Fotoğrafla Bul
            </button>
            {/* MÜŞTERİ GÖRÜNÜMÜ tek düğme: ekranı müşteriye çevirmek fuarda bir hareket, o yüzden
                gizlemenin de tek hareket olması gerekiyor. Menüye gömülü bir ayar, gerektiği anda
                hatırlanmazdı. */}
            <button
              type="button"
              onClick={() => setMusteriGorunumu(!musteriGorunumu)}
              style={{
                padding: "4px 10px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 700,
                cursor: "pointer",
                border: `1.5px solid ${musteriGorunumu ? "#5B7B4A" : "var(--erp-border)"}`,
                background: musteriGorunumu ? "#5B7B4A1A" : "#fff",
                color: musteriGorunumu ? "#3F5A33" : "var(--erp-text-2)",
              }}
              title={musteriGorunumu
                ? "Müşteri görünümü AÇIK — alış fiyatı, tedarikçi ve stok değeri gizli"
                : "Personel görünümü — maliyet bilgileri görünür"}
            >
              {musteriGorunumu ? "Müşteri görünümü" : "Personel görünümü"}
            </button>
          </>
        )}
        </span>
      </div>


      {showForm && (
        <div style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600, marginBottom: 4 }}>Kapak Resmi</div>
              <ColorSwatch
                src={form.kapakResmi}
                onUrlSave={(url) => setForm({ ...form, kapakResmi: url })}
                onRemove={() => setForm({ ...form, kapakResmi: "" })}
                size={48}
              />
            </div>
            <div style={{ fontSize: 11, color: "var(--erp-text-3)", marginBottom: 8 }}>
              Renkten bağımsız, ürünün genel görseli — listede detaya girmeden görünür.
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 0.8fr", gap: 10 }}>
            <Field label="Ürün Adı">
              <input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} placeholder="Örn. Klasik Loafer 402" style={inputStyle} />
            </Field>
            <Field label="Kategori">
              <div
                className="mono"
                style={{
                  padding: "8px 10px", borderRadius: "var(--erp-r-md)", border: "1px solid var(--erp-line-soft)", background: "var(--erp-panel-2)",
                  fontSize: 14, fontWeight: 700, color: CAT_COLORS[form.kategori] || "var(--erp-text)",
                }}
                title="Kategori, hangi sekmede olduğunuza göre otomatik belirlenir"
              >
                {form.kategori}
              </div>
            </Field>
            <Field label="Birim">
              {/* Varsayılan "çift" değeri Tanımlar'daki listede olmayabilir; o durumda tarayıcı
                  ilk seçeneği gösterir ve kullanıcı yanlış birimle ürün açar. Değer listede
                  yoksa açıkça gösterilir. */}
              {(() => {
                const secenekler = birimSecenekleri(tanimlar.birimler, form.birim);
                return (
                  <select
                    value={form.birim}
                    onChange={(e) => setForm({ ...form, birim: e.target.value })}
                    style={inputStyle}
                  >
                    {secenekler.map((ad) => <option key={ad} value={ad}>{ad}</option>)}
                  </select>
                );
              })()}
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMamul ? "1fr 1fr" : "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
            <Field label={isMamul ? "Alış Fiyatı (çift başına)" : "Alış Fiyatı (birim başına)"}>
              <div style={{ display: "flex", gap: 4 }}>
                <select
                  value={form.alisParaBirimi}
                  onChange={(e) => setForm({ ...form, alisParaBirimi: e.target.value })}
                  style={{ ...inputStyle, width: 52, flex: "0 0 auto", padding: "8px 4px", textAlign: "center" }}
                >
                  {PARA_BIRIMLERI.map((p) => <option key={p}>{p}</option>)}
                </select>
                <input type="number" step="0.01" value={form.alisFiyati} onChange={(e) => setForm({ ...form, alisFiyati: e.target.value })} placeholder="Örn. 450" style={inputStyle} />
              </div>
            </Field>
            {/* SATIŞIN KENDİ PARA BİRİMİ — alışla AYNI OLMAK ZORUNDA DEĞİL ve bu HER KATEGORİDE
                geçerli: artan deri dolarla alınıp lirayla satılabiliyor. Etikette "₺" sabit
                yazılıydı; ürün kartında seçici varken formda olmaması, kartı açıp düzeltmeyi
                gerektiren gereksiz bir ikinci adımdı.
                Birim etiketten okunuyor: hammaddede "çift başına" yanlış olurdu (desi, metre, adet). */}
            <Field label={`Satış Fiyatı${form.birim ? ` (${form.birim} başına)` : ""}`}>
              <div style={{ display: "flex", gap: 4 }}>
                <select
                  value={form.satisParaBirimi}
                  onChange={(e) => setForm({ ...form, satisParaBirimi: e.target.value })}
                  style={{ ...inputStyle, width: 52, flex: "0 0 auto", padding: "8px 4px", textAlign: "center" }}
                >
                  {PARA_BIRIMLERI.map((p) => <option key={p}>{p}</option>)}
                </select>
                <input type="number" step="0.01" value={form.satisFiyati} onChange={(e) => setForm({ ...form, satisFiyati: e.target.value })} placeholder={isMamul ? "Örn. 890" : "Örn. 12"} style={inputStyle} />
              </div>
            </Field>
            {isMamul ? null : (
              <>
                <Field label="Tedarikçi">
                  {/* Serbest metin yerine cari seçimi: bu bilgi alış siparişi oluştururken
                      tedarikçiyi otomatik doldurmak için kullanılıyor, metin eşleştirmesi güvenilmez. */}
                  <select
                    value={form.tedarikciId || ""}
                    onChange={(e) => {
                      // Listede olmayan tedarikçi buradan açılır; Cari modülüne gidip geri dönmek
                      // yarım kalan ürün formunun kaybolmasına yol açıyordu.
                      if (e.target.value === "__yeni__") { setYeniTedarikciAcik(true); return; }
                      setForm({ ...form, tedarikciId: e.target.value });
                    }}
                    style={inputStyle}
                    title="Bu ürünün varsayılan tedarikçisi — alış siparişi açarken hazır gelir"
                  >
                    <option value="">Seçilmedi</option>
                    {(cariler || [])
                      .filter((c) => (c.tip === "Tedarikçi" || c.tip === "Her İkisi") && !c.pasif)
                      .map((c) => <option key={c.id} value={c.id}>{c.unvan}</option>)}
                    {onHizliCariEkle && <option value="__yeni__">+ Yeni tedarikçi tanımla…</option>}
                  </select>
                  {yeniTedarikciAcik && (
                    <span style={{ display: "flex", gap: 5, marginTop: 5 }}>
                      <input
                        autoFocus
                        value={yeniTedarikciAd}
                        onChange={(e) => setYeniTedarikciAd(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") { setYeniTedarikciAcik(false); setYeniTedarikciAd(""); }
                          if (e.key !== "Enter") return;
                          e.preventDefault();
                          yeniTedarikciKaydet();
                        }}
                        placeholder="Tedarikçi unvanı"
                        style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}
                      />
                      <button type="button" className="btn-primary" style={{ padding: "6px 10px", fontSize: 11 }} onClick={yeniTedarikciKaydet}>
                        <Check size={12} />
                      </button>
                      <button type="button" className="btn-ghost" style={{ padding: "6px 10px", fontSize: 11 }} onClick={() => { setYeniTedarikciAcik(false); setYeniTedarikciAd(""); }}>
                        <X size={12} />
                      </button>
                    </span>
                  )}
                </Field>
              </>
            )}
          </div>

          {!isMamul && (
            <div style={{ marginTop: 10, maxWidth: 260 }}>
              <Field label="Varsayılan Proses (opsiyonel)">
                {(tanimlar.prosesler || []).length > 0 ? (
                  <select value={form.varsayilanProses} onChange={(e) => setForm({ ...form, varsayilanProses: e.target.value })} style={inputStyle}>
                    <option value="">Belirtilmedi</option>
                    {tanimlar.prosesler.map((p) => <option key={p.id} value={p.ad}>{p.ad}</option>)}
                  </select>
                ) : (
                  <div style={{ fontSize: 11, color: "var(--erp-text-3)" }}>Tanımlar ekranından proses ekleyebilirsiniz</div>
                )}
              </Field>
            </div>
          )}

          {form.kategori === "Mamul" && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600, marginBottom: 6 }}>
                Mamül Tipi (Spor Ayakkabı, Sandalet, Bot… — opsiyonel)
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <select
                  value={form.mamulTipi || ""}
                  onChange={(e) => setForm({ ...form, mamulTipi: e.target.value })}
                  style={{ ...inputStyle, width: 180 }}
                >
                  <option value="">Genel</option>
                  {(tanimlar.mamulTipleri || []).map((m) => <option key={m.id} value={m.ad}>{m.ad}</option>)}
                </select>
                {yeniMamulTipiGiris ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      autoFocus
                      value={yeniMamulTipiAdi}
                      onChange={(e) => setYeniMamulTipiAdi(e.target.value)}
                      placeholder="Örn. Sandalet"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const eklenenAd = onYeniMamulTipiKaydet(yeniMamulTipiAdi);
                          if (eklenenAd) setForm({ ...form, mamulTipi: eklenenAd });
                          setYeniMamulTipiAdi(""); setYeniMamulTipiGiris(false);
                        }
                      }}
                      style={{ ...inputStyle, width: 120, padding: "5px 8px", fontSize: 13 }}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: "5px 10px" }}
                      onClick={() => {
                        const eklenenAd = onYeniMamulTipiKaydet(yeniMamulTipiAdi);
                        if (eklenenAd) setForm({ ...form, mamulTipi: eklenenAd });
                        setYeniMamulTipiAdi(""); setYeniMamulTipiGiris(false);
                      }}
                    >
                      <Check size={14} />
                    </button>
                    <button type="button" className="btn-ghost" style={{ padding: "5px 8px" }} onClick={() => { setYeniMamulTipiGiris(false); setYeniMamulTipiAdi(""); }}>
                      <X size={14} />
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setYeniMamulTipiGiris(true)}
                    className="btn-ghost"
                    style={{ padding: "6px 12px", fontSize: 13, fontWeight: 600, color: "var(--erp-info)", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <Plus size={13} /> Yeni Tip
                  </button>
                )}
              </div>
            </div>
          )}

          {form.kategori === "Mamul" && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600, marginBottom: 6 }}>
                Sezon (opsiyonel)
              </div>
              <select
                value={form.sezon || ""}
                onChange={(e) => setForm({ ...form, sezon: e.target.value })}
                style={{ ...inputStyle, width: 180 }}
              >
                <option value="">Belirtilmemiş</option>
                {SEZONLAR.map((sz) => <option key={sz} value={sz}>{sz}</option>)}
              </select>
              {/* YIL: "İlkbahar/Yaz" tek başına hangi koleksiyon olduğunu söylemiyor. Serbest
                  sayı — sabit bir aralık yazmak birkaç yıl sonra eskirdi. */}
              <input
                type="number" min="2000" max="2100" step="1"
                value={form.sezonYili || ""}
                onChange={(e) => setForm({ ...form, sezonYili: e.target.value })}
                placeholder="Yıl"
                title="Sezon yılı (örn. 2027)"
                className="mono"
                style={{ ...inputStyle, width: 88, marginLeft: 6 }}
              />
            </div>
          )}

          {/* ÖZEL KODLAR ÜRÜN AÇILIŞINDA (kullanıcı, 6 Eylül: "ürün açılışında özel kodlar da
              girilsin"). Alanlar seçilen KATEGORİ/TİP/SEZONA göre değişiyor, o yüzden blok
              onların ALTINDA: kullanıcı önce tipi seçiyor, alanlar ona göre beliriyor.
              Sonradan kartı açıp doldurmak, iki adımlı bir iş ve ikincisi unutuluyordu. */}
          {(() => {
            const formUrun = {
              kategori: form.kategori, malzemeTipi: form.malzemeTipi,
              mamulTipi: form.mamulTipi, sezon: form.sezon,
            };
            const alanlar = urunOzelKodAlanlari(formUrun, ozelKodAlanlari);
            // BLOK HER ZAMAN ÇİZİLİYOR. Önceden alan yoksa hiç görünmüyordu ve özellik yok
            // sanılıyordu — henüz alan tanımlamamış bir kurulumda tam olarak böyle oluyordu.
            // Şimdi boşken bile başlık ve "Alan Ekle" duruyor.
            const kapsamTuru = form.kategori === "Mamul" ? "mamul" : "malzeme";
            const kapsamAd = form.kategori === "Mamul" ? (form.mamulTipi || "") : (form.malzemeTipi || "");
            // Tip seçilmemişse alan GENEL açılıyor; kapsamsız alan her üründe görünür.
            const eklenecekKapsam = kapsamAd ? kapsamTuru : "genel";
            return (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>
                    Özel Kodlar (opsiyonel — tipe göre değişir)
                  </span>
                  {yeniKodAlaniGiris ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        autoFocus
                        value={yeniKodAlaniAdi}
                        onChange={(e) => setYeniKodAlaniAdi(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.nextSibling.click(); }}
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
                      style={{ padding: "4px 10px", fontSize: 12, fontWeight: 600, color: "var(--erp-info)", display: "flex", alignItems: "center", gap: 4 }}
                      title={kapsamAd
                        ? `Yeni alan "${kapsamAd}" tipine ait olur`
                        : "Tip seçilmedi — yeni alan GENEL olur, her üründe görünür"}
                    >
                      <Plus size={13} /> Alan Ekle
                    </button>
                  )}
                </div>
                {alanlar.length === 0 && !yeniKodAlaniGiris && (
                  <div style={{ fontSize: 12, color: "var(--erp-text-3)", marginBottom: 6 }}>
                    {kapsamAd
                      ? `"${kapsamAd}" tipine ve genele tanımlı alan yok.`
                      : "Henüz alan yok. Tip seçerseniz yeni alan o tipe ait olur."}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8, maxWidth: 720 }}>
                  {alanlar.map((alan) => (
                    <label key={alan.id} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>
                        {alan.ad}
                        {(alan.kapsamTuru || "genel") !== "genel" && (
                          <span className="mono" style={{ fontSize: 9, marginLeft: 5, color: "var(--erp-text-3)" }}>{alan.kapsamAd}</span>
                        )}
                      </span>
                      <input
                        value={(form.ozelKodlar || {})[alan.id] || ""}
                        onChange={(e) => setForm({ ...form, ozelKodlar: { ...(form.ozelKodlar || {}), [alan.id]: e.target.value } })}
                        style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          })()}

          {form.kategori === "Hammadde" && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600, marginBottom: 6 }}>
                Malzeme Tipi (deri, taban, bağcık… — opsiyonel, renk listesini buna göre daraltır)
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <select
                  value={form.malzemeTipi || ""}
                  onChange={(e) => { setForm({ ...form, malzemeTipi: e.target.value }); setSelRenkler([]); }}
                  style={{ ...inputStyle, width: 160 }}
                >
                  <option value="">Genel</option>
                  {(tanimlar.hammaddeTipleri || []).map((h) => <option key={h.id} value={h.ad}>{h.ad}</option>)}
                </select>
                {yeniMalzemeTipiGiris ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      autoFocus
                      value={yeniMalzemeTipiAdi}
                      onChange={(e) => setYeniMalzemeTipiAdi(e.target.value)}
                      placeholder="Örn. Astar"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const eklenenAd = onYeniMalzemeTipiKaydet(yeniMalzemeTipiAdi);
                          if (eklenenAd) { setForm({ ...form, malzemeTipi: eklenenAd }); setSelRenkler([]); }
                          setYeniMalzemeTipiAdi(""); setYeniMalzemeTipiGiris(false);
                        }
                      }}
                      style={{ ...inputStyle, width: 120, padding: "5px 8px", fontSize: 13 }}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: "5px 10px" }}
                      onClick={() => {
                        const eklenenAd = onYeniMalzemeTipiKaydet(yeniMalzemeTipiAdi);
                        if (eklenenAd) { setForm({ ...form, malzemeTipi: eklenenAd }); setSelRenkler([]); }
                        setYeniMalzemeTipiAdi(""); setYeniMalzemeTipiGiris(false);
                      }}
                    >
                      <Check size={14} />
                    </button>
                    <button type="button" className="btn-ghost" style={{ padding: "5px 8px" }} onClick={() => { setYeniMalzemeTipiGiris(false); setYeniMalzemeTipiAdi(""); }}>
                      <X size={14} />
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setYeniMalzemeTipiGiris(true)}
                    className="btn-ghost"
                    style={{ padding: "6px 12px", fontSize: 13, fontWeight: 600, color: "var(--erp-purple)", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <Plus size={13} /> Yeni Tip
                  </button>
                )}
              </div>
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600, marginBottom: 6 }}>
              Renkler (tek renk listesinden seçin — opsiyonel, hiç seçmezseniz ürün renksiz/tek stok kalemi olarak kaydedilir)
            </div>
            {isMamul ? (() => {
              // Mamul'de renk/kombinasyon sayısı çok olabilir — hepsini buton olarak dökmek yerine
              // "seç + ekle" deseni kullanılır: dropdown'dan seçip Ekle'ye basılır, seçilenler alttaki
              // listede çıkarılabilir chip olarak birikir. Ekran daha sade kalır.
              // Mamul renk seçimi hem Mamul hem Hammadde renk havuzundan beslenir — Tanımlar'daki Model
              // Rengi sistemi zaten Hammadde renklerinden kombinasyon kuruyor; ikisini ayrı tutmak
              // aynı rengin iki yerde tekrar tanımlanmasını gerektirirdi.
              // Mamul renk seçimi hem Mamul hem Hammadde renk havuzundan beslenir — Tanımlar'daki Model
              // Rengi sistemi zaten Hammadde renklerinden kombinasyon kuruyor; ikisini ayrı tutmak
              // aynı rengin iki yerde tekrar tanımlanmasını gerektirirdi. Aynı isim iki tipte de
              // tanımlıysa (örn. hem Mamul hem Hammadde "Siyah"), dropdown'da bir kez görünür.
              // Mamul renkleri, hammadde renklerinden AYRI bir listedir (bkz. eklenebilirRenkler).
              const tumRenklerTekil = Array.from(
                new Map(
                  tanimlar.renkler
                    .filter((r) => !kombinasyonEtiketiFormatindaMi(r.ad))   // tek renk havuzu (9g)
                    .map((r) => [r.ad, r])
                ).values()
              );
              const secilebilirRenkler = tumRenklerTekil.filter((r) => !selRenkler.includes(r.ad));
              const mamulRenkTanimli = tumRenklerTekil;
              return (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600 }}>
                      Bu rengin kaç parçadan (değişkenden) oluştuğunu seçin:
                    </span>
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => { setRenkDegiskenSayisi(n); setKombiRenkSecimleri({}); setYeniModelRengiModuStok(false); setMamulRenkSecimi(""); }}
                        style={{
                          width: 26, height: 26, borderRadius: "50%", border: `1.5px solid ${renkDegiskenSayisi === n ? "var(--erp-purple)" : "var(--erp-border)"}`,
                          background: renkDegiskenSayisi === n ? "#EDE7F2" : "#fff", color: renkDegiskenSayisi === n ? "var(--erp-purple)" : "var(--erp-text-2)",
                          cursor: "pointer", fontSize: 12, fontWeight: 700,
                        }}
                      >
                        {n}
                      </button>
                    ))}
                    <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>
                      {renkDegiskenSayisi === 1 ? "(tek renk)" : `(${renkDegiskenSayisi} rengin bir arada kullanıldığı "Model Rengi" kombinasyonu)`}
                    </span>
                  </div>

                  {renkDegiskenSayisi === 1 ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                    {secilebilirRenkler.length > 0 ? (
                      <>
                        <select
                          value={mamulRenkSecimi}
                          onChange={(e) => setMamulRenkSecimi(e.target.value)}
                          style={{ ...inputStyle, width: 180 }}
                        >
                          <option value="">Renk seçin…</option>
                          {secilebilirRenkler.map((r) => <option key={r.id} value={r.ad}>{r.ad}</option>)}
                        </select>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: "6px 14px" }}
                          disabled={!mamulRenkSecimi}
                          onClick={() => { toggleRenk(mamulRenkSecimi); setMamulRenkSecimi(""); }}
                        >
                          <Plus size={13} /> Ekle
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--erp-text-3)" }}>
                        {mamulRenkTanimli.length > 0
                          ? "Tanımlı renklerin tamamı zaten eklendi."
                          : "Mamul rengi tanımlanmadı — önce Tanımlar ekranından ekleyin."}
                      </span>
                    )}
                    {yeniRenkGiris ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                          autoFocus
                          value={yeniRenkAdi}
                          onChange={(e) => setYeniRenkAdi(e.target.value)}
                          placeholder="Örn. Kırmızı"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const ad = yeniRenkAdi.trim();
                              if (ad) { onYeniRenkKaydet(ad, "Hammadde", undefined); toggleRenk(ad); }
                              setYeniRenkAdi(""); setYeniRenkGiris(false);
                            }
                          }}
                          style={{ ...inputStyle, width: 120, padding: "5px 8px", fontSize: 13 }}
                        />
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: "5px 10px" }}
                          onClick={() => {
                            const ad = yeniRenkAdi.trim();
                            if (ad) { onYeniRenkKaydet(ad, "Hammadde", undefined); toggleRenk(ad); }
                            setYeniRenkAdi(""); setYeniRenkGiris(false);
                          }}
                        >
                          <Check size={14} />
                        </button>
                        <button type="button" className="btn-ghost" style={{ padding: "5px 8px" }} onClick={() => { setYeniRenkGiris(false); setYeniRenkAdi(""); }}>
                          <X size={14} />
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setYeniRenkGiris(true)}
                        className="btn-ghost"
                        style={{ padding: "6px 12px", fontSize: 13, fontWeight: 600, color: "var(--erp-purple)", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        <Plus size={13} /> Yeni Renk
                      </button>
                    )}
                  </div>
                  ) : (() => {
                    // 2+ renkli: ÖNCE bu sayıda ZATEN TANIMLI Model Rengi kombinasyonu var mı bakılır
                    // (henüz bu üründe seçilmemiş olanlar) — varsa doğrudan listeden seçilip eklenir.
                    // Yoksa (ya da kullanıcı "yeni oluştur" derse) pozisyon bazlı oluşturma ekranı açılır.
                    const uygunKombinasyonlarStok = (tanimlar.renkKombinasyonlari || [])
                      .filter((k) => k.renkIdler.length === renkDegiskenSayisi)
                      .map((k) => ({
                        id: k.id,
                        etiket: `${k.kod} - ${k.renkIdler.map((id) => ((tanimlar.renkler.find((r) => r.id === id) || {}).ad || "?")).join("/")}`,
                      }))
                      .filter((k) => !selRenkler.includes(k.etiket));
                    return (
                      <div style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 8 }}>
                        {!yeniModelRengiModuStok ? (
                          <div>
                            {uygunKombinasyonlarStok.length > 0 ? (
                              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                                <select
                                  value={mamulRenkSecimi}
                                  onChange={(e) => setMamulRenkSecimi(e.target.value)}
                                  style={{ ...inputStyle, width: 200 }}
                                >
                                  <option value="">Seçin…</option>
                                  {uygunKombinasyonlarStok.map((k) => <option key={k.id} value={k.etiket}>{k.etiket}</option>)}
                                </select>
                                <button
                                  type="button"
                                  className="btn-primary"
                                  disabled={!mamulRenkSecimi}
                                  onClick={() => { toggleRenk(mamulRenkSecimi); setMamulRenkSecimi(""); }}
                                >
                                  <Plus size={13} /> Ekle
                                </button>
                              </div>
                            ) : (
                              <div style={{ fontSize: 12, color: "var(--erp-text-3)", marginBottom: 8 }}>
                                {renkDegiskenSayisi} renkli tanımlı bir Model Rengi yok.
                              </div>
                            )}
                            <button
                              type="button"
                              className="btn-ghost"
                              style={{ color: "var(--erp-purple)", fontSize: 12 }}
                              onClick={() => setYeniModelRengiModuStok(true)}
                            >
                              <Plus size={12} /> Bu sayıda yeni Model Rengi oluştur
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                              {/* Not: aynı renk birden fazla pozisyonda tekrar edebilir (örn.
                                  1.Renk=Siyah, 2.Renk=Kahve, 3.Renk=Siyah geçerli, farklı bir modeldir) —
                                  pozisyonlar arasında kısıtlama yok. */}
                              {Array.from({ length: renkDegiskenSayisi }, (_, i) => i + 1).map((poz) => {
                                return (
                                  <label key={poz} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                    <span style={{ fontSize: 11, color: "var(--erp-text-2)", fontWeight: 600 }}>{poz}. Renk</span>
                                    <select
                                      value={kombiRenkSecimleri[poz] || ""}
                                      onChange={(e) => setKombiRenkSecimleri({ ...kombiRenkSecimleri, [poz]: e.target.value })}
                                      style={{ ...inputStyle, width: 140 }}
                                    >
                                      <option value="">Seçin…</option>
                                      {mamulRenkTanimli.map((r) => <option key={r.id} value={r.ad}>{r.ad}</option>)}
                                    </select>
                                  </label>
                                );
                              })}
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                type="button"
                                className="btn-primary"
                                disabled={Array.from({ length: renkDegiskenSayisi }, (_, i) => i + 1).some((poz) => !kombiRenkSecimleri[poz])}
                                onClick={() => {
                                  const renkAdlari = Array.from({ length: renkDegiskenSayisi }, (_, i) => kombiRenkSecimleri[i + 1]);
                                  const etiket = onKombinasyonOlustur(renkAdlari);
                                  if (etiket) {
                                    toggleRenk(etiket);
                                    setKombiRenkSecimleri({});
                                    setYeniModelRengiModuStok(false);
                                  }
                                }}
                              >
                                <Plus size={13} /> Model Rengi Olarak Ekle
                              </button>
                              <button type="button" className="btn-ghost" onClick={() => setYeniModelRengiModuStok(false)}>
                                ← Listeden Seçmeye Dön
                              </button>
                            </div>
                            {mamulRenkTanimli.length === 0 && (
                              <div style={{ fontSize: 11, color: "var(--erp-warn)", marginTop: 6 }}>
                                Önce en az bir Mamul rengi tanımlamanız gerekiyor (Tanımlar ekranından ya da "1" seçip "Yeni Renk" ile).
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {selRenkler.length > 0 && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {selRenkler.map((ad) => (
                        <span
                          key={ad}
                          className="mono"
                          style={{
                            display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
                            borderRadius: "var(--erp-r-pill)", border: "1.5px solid #E1611F", background: "var(--erp-orange-bg)", fontSize: 13, fontWeight: 600,
                          }}
                        >
                          {ad}
                          <button type="button" onClick={() => toggleRenk(ad)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--erp-warn)", display: "flex" }}>
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })() : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {tanimlar.renkler.filter((r) => (r.tip || "Mamul") === "Hammadde" && (form.kategori !== "Hammadde" || renkTipeUygunMu(r, form.malzemeTipi))).length === 0 && (
                <span style={{ fontSize: 12, color: "var(--erp-text-3)" }}>
                  Hammadde rengi tanımlanmadı — önce Tanımlar ekranından ekleyin.
                </span>
              )}
              {tanimlar.renkler
                .filter((r) => !kombinasyonEtiketiFormatindaMi(r.ad) && (form.kategori !== "Hammadde" || renkTipeUygunMu(r, form.malzemeTipi)))
                .map((r) => {
                  const active = selRenkler.includes(r.ad);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRenk(r.ad)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                        borderRadius: "var(--erp-r-pill)", border: `1.5px solid ${active ? "var(--erp-orange)" : "var(--erp-border)"}`,
                        background: active ? "var(--erp-orange-bg)" : "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600,
                      }}
                    >
                      {r.ad}
                      {active && <Check size={13} color="var(--erp-orange)" />}
                    </button>
                  );
                })}
              {yeniRenkGiris ? (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input
                    autoFocus
                    value={yeniRenkAdi}
                    onChange={(e) => setYeniRenkAdi(e.target.value)}
                    placeholder="Örn. Ham Bej"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const ad = yeniRenkAdi.trim();
                        if (ad) {
                          onYeniRenkKaydet(ad, "Hammadde", form.malzemeTipi);
                          toggleRenk(ad);
                        }
                        setYeniRenkAdi(""); setYeniRenkGiris(false);
                      }
                    }}
                    style={{ ...inputStyle, width: 120, padding: "5px 8px", fontSize: 13 }}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ padding: "5px 10px" }}
                    onClick={() => {
                      const ad = yeniRenkAdi.trim();
                      if (ad) {
                        onYeniRenkKaydet(ad, "Hammadde", form.malzemeTipi);
                        toggleRenk(ad);
                      }
                      setYeniRenkAdi(""); setYeniRenkGiris(false);
                    }}
                  >
                    <Check size={14} />
                  </button>
                  <button type="button" className="btn-ghost" style={{ padding: "5px 8px" }} onClick={() => { setYeniRenkGiris(false); setYeniRenkAdi(""); }}>
                    <X size={14} />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setYeniRenkGiris(true)}
                  style={{
                    padding: "6px 12px", borderRadius: "var(--erp-r-pill)", border: "1.5px dashed var(--erp-line)",
                    background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--erp-purple)",
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                  title={form.malzemeTipi ? `"${form.malzemeTipi}" malzeme tipine bağlı olarak eklenir` : undefined}
                >
                  <Plus size={13} /> Yeni Renk
                </button>
              )}
            </div>
            )}
          </div>

          <div style={{ marginTop: 14 }}>
            {/* "Beden/ölçü yok" YALNIZCA hammadde/yarı mamulde anlamlı: iplik, tutkal, kumaş gibi
                ölçüsüz kalemler için. Bir ayakkabı modelinin bedensiz açılması diye bir durum yok;
                seçenek mamulde gösterilince yanlışlıkla işaretlenmeye açık, boş bir tuzak oluyordu. */}
            {!isMamul && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={bedensiz}
                onChange={(e) => {
                  setBedensiz(e.target.checked);
                  setSelBedenler([]);
                  setMatrix(null);
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--erp-text)" }}>
                Bu üründe beden/ölçü yok (iplik, tutkal, kumaş vb. — tek stok kalemi olarak açılır)
              </span>
            </label>
            )}

            {!bedensiz && (
              <>
                {/* Ölçü tipi seçimi YALNIZCA hammadde/yarı mamulde çıkar. Mamul (ayakkabı) her zaman
                    BEDEN bazlıdır; "Boyut" seçeneğini sunmak, seçildiğinde beden listesini boşaltıp
                    kullanıcıyı çıkmaza sokan anlamsız bir seçenekti. */}
                {form.kategori !== "Mamul" && (
                <>
                <div style={{ fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600, marginBottom: 6 }}>Ölçü Tipi</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  {["Beden", "Boyut"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, olcuTipi: t });
                        setSelBedenler([]);
                        setMatrix(null);
                      }}
                      style={{
                        padding: "6px 14px", borderRadius: "var(--erp-r-pill)",
                        border: `1.5px solid ${form.olcuTipi === t ? "var(--erp-orange)" : "var(--erp-border)"}`,
                        background: form.olcuTipi === t ? "var(--erp-orange-bg)" : "#fff",
                        cursor: "pointer", fontSize: 13, fontWeight: 600,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                </>
                )}

                <div style={{ fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600, marginBottom: 6 }}>
                  {form.olcuTipi === "Boyut" ? "Boyutlar" : "Bedenler"}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {/* Boyutlar da renkler gibi malzeme tipine göre süzülür: bağcık ürününde yalnızca
                      bağcık boyutları, kutuda yalnızca kutu ebatları listelenir. Tipi olmayan
                      (Genel) ölçüler her üründe görünmeye devam eder. Bedenler süzülmez —
                      ayakkabı numarası malzemeye göre değişmez. */}
                  {(() => {
                    const uygunOlculer = tanimlar.bedenler.filter((b) => {
                      if ((b.tip || "Beden") !== form.olcuTipi) return false;
                      if (form.olcuTipi !== "Boyut") return true;
                      // Mamul yalnızca tipsiz (Genel) ölçüleri kullanır — bkz. eklenebilirBedenler.
                      if (form.kategori === "Mamul") return olcuTipleri(b).length === 0;
                      return olcuTipeUygunMu(b, form.malzemeTipi);
                    });
                    if (uygunOlculer.length === 0) {
                      return (
                        <span style={{ fontSize: 12, color: "var(--erp-text-3)" }}>
                          {form.olcuTipi === "Boyut" && form.malzemeTipi
                            ? `"${form.malzemeTipi}" tipinde boyut tanımlanmadı — Tanımlar > Boyut bölümünden ekleyin.`
                            : `${form.olcuTipi} tanımlanmadı — önce Tanımlar ekranından ekleyin.`}
                        </span>
                      );
                    }
                    // BEDEN GRUBU KISAYOLU (kullanıcı, 14 Eylül: "oluşturduğumuz beden grubunu stok
                    // kartından seçtirelim ve o bedenleri stoğa eklesin"). Grup düğmesi, grubun
                    // bedenlerinden bu üründe UYGUN olanları işaretliyor; ikinci dokunuş kaldırıyor.
                    // Ürün kartındaki "Beden Ekle" içindeki grup düğmeleriyle aynı iş (v1.283.0),
                    // burada YENİ ürün kurulurken.
                    const gruplar = form.olcuTipi === "Beden" ? (tanimlar.bedenGruplari || []) : [];
                    const uygunAdlar = uygunOlculer.map((b) => b.ad);
                    return [
                      ...gruplar.map((g) => {
                        const adlar = (g.bedenler || []).filter((b) => uygunAdlar.includes(b));
                        if (adlar.length === 0) return null;
                        const hepsiSecili = adlar.every((b) => selBedenler.includes(b));
                        return (
                          <button
                            key={`grup-${g.id}`}
                            type="button"
                            data-yeni-urun-grup={g.ad}
                            title={`${adlar.join(", ")} — ${hepsiSecili ? "seçimi kaldır" : "hepsini seç"}`}
                            onClick={() => setSelBedenler((o) => (hepsiSecili
                              ? o.filter((x) => !adlar.includes(x))
                              : [...o, ...adlar.filter((x) => !o.includes(x))]))}
                            style={{
                              padding: "6px 12px", borderRadius: "var(--erp-r-pill)", border: `1.5px dashed ${hepsiSecili ? "var(--erp-purple)" : "var(--erp-border)"}`,
                              background: hepsiSecili ? "#6B4E8A1A" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700,
                              color: hepsiSecili ? "var(--erp-purple)" : "var(--erp-text-2)",
                            }}
                          >
                            {g.ad}
                          </button>
                        );
                      }).filter(Boolean),
                      ...uygunOlculer.map((b) => {
                      const active = selBedenler.includes(b.ad);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => toggleBeden(b.ad)}
                          className="mono"
                          style={{
                            padding: "6px 12px", borderRadius: "var(--erp-r-pill)", border: `1.5px solid ${active ? "var(--erp-orange)" : "var(--erp-border)"}`,
                            background: active ? "var(--erp-orange-bg)" : "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600,
                          }}
                        >
                          {b.ad}
                        </button>
                      );
                    })];
                  })()}

                  {/* YENİ ÖLÇÜ — listede yoksa Tanımlar'a gitmeden burada tanımlanır.
                      Boyut eklerken o an seçili MALZEME TİPİNE bağlanır: "Bağcık" seçiliyken eklenen
                      "16 cm", Tanımlar > Boyut listesinde bağcık tipiyle görünür ve yalnızca bağcık
                      ürünlerinde listelenir. Tip bilgisi zaten formda seçili olduğu için kullanıcıya
                      ikinci kez sorulmaz. */}
                  {onYeniOlcuKaydet && (
                    yeniOlcuAcik ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <input
                          autoFocus
                          value={yeniOlcuAdi}
                          onChange={(e) => setYeniOlcuAdi(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") { setYeniOlcuAcik(false); setYeniOlcuAdi(""); }
                            if (e.key !== "Enter") return;
                            const eklenen = onYeniOlcuKaydet(
                              yeniOlcuAdi,
                              form.olcuTipi,
                              form.olcuTipi === "Boyut" ? form.malzemeTipi : ""
                            );
                            if (eklenen) { toggleBeden(eklenen); setYeniOlcuAdi(""); setYeniOlcuAcik(false); }
                          }}
                          placeholder={form.olcuTipi === "Boyut" ? "örn. 16 cm" : "örn. 42"}
                          className="mono"
                          style={{ ...inputStyle, width: 120, padding: "5px 8px", fontSize: 13 }}
                        />
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: "6px 10px", fontSize: 12 }}
                          onClick={() => {
                            const eklenen = onYeniOlcuKaydet(
                              yeniOlcuAdi,
                              form.olcuTipi,
                              form.olcuTipi === "Boyut" ? form.malzemeTipi : ""
                            );
                            if (eklenen) { toggleBeden(eklenen); setYeniOlcuAdi(""); setYeniOlcuAcik(false); }
                          }}
                        >
                          <Check size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: "6px 9px", fontSize: 12 }}
                          onClick={() => { setYeniOlcuAcik(false); setYeniOlcuAdi(""); }}
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ padding: "6px 12px", fontSize: 13, borderStyle: "dashed" }}
                        title={
                          form.olcuTipi === "Boyut" && form.malzemeTipi
                            ? `Yeni boyut ekle — "${form.malzemeTipi}" tipine kaydedilir`
                            : `Yeni ${form.olcuTipi.toLocaleLowerCase("tr-TR")} ekle`
                        }
                        onClick={() => setYeniOlcuAcik(true)}
                      >
                        <Plus size={13} /> Yeni {form.olcuTipi}
                        {form.olcuTipi === "Boyut" && form.malzemeTipi && (
                          <span style={{ fontSize: 10, color: "var(--erp-text-3)" }}>· {form.malzemeTipi}</span>
                        )}
                      </button>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <button className="btn-ghost" onClick={buildMatrix}>Matris Oluştur</button>
          </div>

          {matrix && (
            <div style={{ marginTop: 16, overflowX: "auto" }}>
              <div style={{ fontSize: 12, color: "var(--erp-text-2)", marginBottom: 8, fontWeight: 600 }}>
                Her renk satırının solundaki kutuya bu ürüne özel görsel ekleyebilirsiniz. Başlangıç miktarları 0'dır —
                stok girişleri kaydettikten sonra Üretim veya Satınalma kaynağıyla yapılır.
              </div>
              <table style={{ width: "auto", minWidth: "100%" }}>
                <thead>
                  <tr>
                    <th>Renk \ Beden</th>
                    {matrix.bedenler.map((b) => (
                      <th key={b} className="mono" style={{ textAlign: "center" }}>{b}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.renkler.map((r) => (
                    <tr key={r}>
                      <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                        <ColorSwatch
                          src={matrix.renkResimleri[r]}
                          onUrlSave={(url) => setMatrixRenkResmi(r, url)}
                          onRemove={() => removeMatrixRenkResmi(r)}
                          size={26}
                        />
                        {r}
                      </td>
                      {matrix.bedenler.map((b) => (
                        <td key={b} className="mono" style={{ textAlign: "center", color: "var(--erp-text-3)" }}>
                          0
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn-primary btn-save" onClick={saveProduct} disabled={!matrix}><Save size={14} /> Kaydet</button>
            <button
              className="btn-ghost"
              onClick={() => {
                setShowForm(false);
                setMatrix(null);
              }}
            >
              <X size={14} /> Vazgeç
            </button>
          </div>
        </div>
      )}

      {katalogMod && (
        <GorselIleBul
          havuz={katalogHavuzu}
          acikMi={katalogFotoAcik}
          onKapat={() => setKatalogFotoAcik(false)}
          onSec={(secim) => { setKatalogFotoAcik(false); katalogAc(secim.urunId, secim.renk); }}
          showToast={showToast}
        />
      )}


      {katalogMod && (
        filtered.length === 0 ? (
          <EmptyState text={items.length === 0 ? "Henüz stok kaydı yok. İlk ürünü ekleyerek başlayın." : "Aramanızla eşleşen ürün yok."} />
        ) : (
          // IZGARA — vitrin düzeni. Kart başına TEK görsel: kapak ya da ilk rengin görseli.
          // Renklerin hepsi ızgarada gösterilseydi tek model onlarca kutu kaplar ve "gezinme"
          // hissi kaybolurdu; renkler detayda.
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
            {filtered.map((p) => {
              const fiyat = katalogFiyat(p);
              const renkler = katalogRenkleri(p);
              const kapak = katalogGorsel(p, renkler[0]);
              const acikMi = katalogUrunId === p.id;
              return (
                <React.Fragment key={p.id}>
                <button
                  type="button"
                  // Açık karta tekrar tıklamak KAPATIYOR: detayı kapatmak için ayrı bir düğmeye
                  // uzanmak, tıklanan yerin uzağına gitmek demekti.
                  onClick={() => (acikMi ? setKatalogUrunId(null) : katalogAc(p.id, renkler[0]))}
                  style={{
                    display: "grid", gap: 6, padding: 0, cursor: "pointer", textAlign: "left",
                    border: `1px solid ${katalogUrunId === p.id ? "var(--erp-info)" : "var(--erp-border-2)"}`,
                    borderRadius: "var(--erp-r-lg)", overflow: "hidden", background: "#fff",
                  }}
                >
                  <div style={{ width: "100%", aspectRatio: "1 / 1", background: "var(--erp-panel)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {kapak
                      ? <img src={kapak} alt={p.ad} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <KategoriIkonu kategori={p.kategori} size={28} />}
                  </div>
                  <div style={{ padding: "0 10px 10px", display: "grid", gap: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-text)", lineHeight: 1.25 }}>{p.ad}</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-info)" }}>
                      {fiyat.satis ? `${fiyat.satis} ${fiyat.satisBirimi}` : "—"}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--erp-text-2)" }}>
                      {renkler.length} renk{musteriGorunumu ? "" : ` · stok ${katalogStok(p)}`}
                    </span>
                  </div>
                </button>
                {/* TAM SATIR: `1 / -1` ile ızgaranın bütün sütunlarını kaplıyor, yani detay
                    tıklanan kartın hemen ALTINDAKİ satırda açılıyor. Sütun sayısı `auto-fill`
                    ile tarayıcıda hesaplandığı için "satırın sonu" JS'te güvenilir biçimde
                    bulunamıyordu; bu, aynı sonucu CSS'e bırakan yol. */}
                {acikMi && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    {katalogDetayiCiz(p)}
                  </div>
                )}
                </React.Fragment>
              );
            })}
          </div>
        )
      )}

      {!katalogMod && (
      filtered.length === 0 ? (
        <EmptyState text={items.length === 0 ? "Henüz stok kaydı yok. İlk ürünü ekleyerek başlayın." : "Aramanızla eşleşen ürün yok."} />
      ) : filterCat !== "Tümü" ? (
        // Belirli bir kategori sekmesindeyken tek düz liste — başlık gereksiz, sekme zaten kategoriyi gösteriyor.
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map((p) => (
            <UrunOzetSatiri key={p.id} product={p} onAc={() => urunAc(p.id)} ozelKodAlanlari={ozelKodAlanlari} />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 28 }}>
          {KATEGORILER.map((kat) => {
            const grup = filtered.filter((p) => p.kategori === kat);
            if (grup.length === 0) return null;
            return (
              <div key={kat}>
                {/* Kategori başlığı, dolu bir bant. Düz yazı başlık listede bir "ayraç" gibi
                    okunmuyordu; bant, iki kategori arasındaki sınırı tartışmasız hale getirir. */}
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
                    background: CAT_COLORS[kat] || "var(--erp-text-2)", color: "var(--erp-panel-2)",
                    padding: "7px 12px", borderRadius: "var(--erp-r-md)",
                  }}
                >
                  <KategoriIkonu kategori={kat} size={16} renkSabit="var(--erp-panel-2)" />
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: ".02em" }}>
                    {kat}
                  </span>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: "var(--erp-r-pill)", background: "rgba(255,255,255,.2)" }}>
                    {grup.length}
                  </span>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {grup.map((p) => (
                    <UrunOzetSatiri
                      key={p.id}
                      product={p}
                      onAc={() => urunAc(p.id)}
                      ozelKodAlanlari={ozelKodAlanlari}
                      stokRezervasyonlari={stokRezervasyonlari}
                      tumSiparisler={tumSiparisler}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )
      )}

      {(acikUrunIdleri || []).map((acikId) => {
        const p = items.find((x) => x.id === acikId);
        if (!p) return null;
        const pencereId = `urun-${acikId}`;
        const gorunur = aktifPencereId === pencereId;
        const hedef = hedefSekmeleri[acikId] || null;
        return (
          <div
            key={pencereId}
            data-urun-karti={acikId}
            // TAM EKRAN: ürün kartı (reçete matrisi, beden/renk tabloları) yatayda çok yer istiyor.
            // 760px'lik dar bir pencerede tablolar sürekli kaydırma çubuğuna düşüyordu. Artık pencere
            // ekranı doldurur; başlık sabit kalır, yalnızca içerik kayar.
            style={{
              position: "fixed", top: PENCERE_SERIT_YUKSEKLIGI, left: "var(--menu-genislik, 0px)", right: 0, bottom: 0,
              zIndex: 100, background: "rgba(34,27,20,.55)",
              display: gorunur ? "flex" : "none", alignItems: "stretch", justifyContent: "center", padding: 0,
            }}
            onClick={(e) => { if (e.target === e.currentTarget && onPencereKucult) onPencereKucult(); }}
          >
            <div style={{ background: "var(--erp-panel-2)", width: "100%", height: "100%", display: "flex", flexDirection: "column", minWidth: 0 }}>
            {/* Ürün penceresinin başlığı da kategori renginde: hangi ürüne ve hangi kategoriye
                baktığın, sekme çubuğundaki küçük yazıya bakmadan görünür. Sipariş penceresiyle
                aynı dil — iki pencere de aynı biçimde tanıtıyor kendini. */}
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                  background: CAT_COLORS[p.kategori] || "var(--erp-text-2)", color: "var(--erp-panel-2)", flexShrink: 0,
                }}
              >
                <KategoriIkonu kategori={p.kategori} size={20} renkSabit="var(--erp-panel-2)" />
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.25 }}>
                  {/* Belge türü — sipariş penceresiyle aynı kalıp. */}
                  <span
                    className="mono"
                    style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", opacity: 0.75 }}
                  >
                    Stok Kartı
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 700, overflowWrap: "anywhere" }}>{p.ad}</span>
                  <span className="mono" style={{ fontSize: 11, opacity: 0.85, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span>{p.kategori}</span>
                    {p.malzemeTipi && <span>{p.malzemeTipi}</span>}
                    {p.mamulTipi && <span>{p.mamulTipi}</span>}
                    <span>{p.variants.length} renk/beden</span>
                  </span>
                </span>
                <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                {/* GERİ DÖN — yalnızca buraya başka bir ekrandan yönlendirilerek gelindiyse çıkar.
                    Doğrudan Stok ekranından açılan bir üründe dönülecek bir yer yok. */}
                {donusHedefi && onDonusYap && (
                  <button
                    className="btn-ghost"
                    style={{ padding: "6px 12px", fontSize: 12, background: "rgba(255,255,255,.14)", borderColor: "rgba(255,255,255,.35)", color: "var(--erp-panel-2)" }}
                    onClick={() => { if (onPencereKapat) onPencereKapat(`urun-${p.id}`); onDonusYap(); }}
                    title="Geldiğiniz ekrana dönün — girdiğiniz bilgiler korunur"
                  >
                    <ArrowLeft size={14} /> {donusHedefi.etiket || "Geri dön"}
                  </button>
                )}
                {onPencereKucult && (
                  <button
                    className="btn-ghost"
                    style={{ background: "rgba(255,255,255,.14)", borderColor: "rgba(255,255,255,.35)", color: "var(--erp-panel-2)" }}
                    onClick={onPencereKucult}
                    title="Sekmede bırak, kapatma"
                  >
                    <span style={{ fontWeight: 900, fontSize: 16, lineHeight: 1 }}>−</span>
                  </button>
                )}
                <button
                  className="btn-ghost"
                  style={{ background: "rgba(255,255,255,.14)", borderColor: "rgba(255,255,255,.35)", color: "var(--erp-panel-2)" }}
                  // Kapatmak da geldiğin yere döndürür. Aksi halde kullanıcı Stok ekranında kalıyor
                  // ve yarım bıraktığı sipariş formunu bulmak için sekmeyi elle aramak zorundaydı.
                  onClick={() => {
                    if (onPencereKapat) onPencereKapat(pencereId);
                    if (donusHedefi && onDonusYap) onDonusYap();
                  }}
                >
                  <X size={16} /> Kapat
                </button>
                </span>
              </div>
              <div style={{ padding: "12px 16px 16px", flex: 1, overflowY: "auto", minWidth: 0 }}>
                <ProductMatrixCard
                  kurlar={kurlar}
                  tanimlarAylikUretimHedefi={tanimlar.aylikUretimHedefi}
                  tanimlarGenelGiderler={tanimlar.genelGiderler}
                  onFiseGitNo={onFiseGitNo}
                  asortiler={tanimlar.asortiler || []}
                  // key'e hedef sekme dahil: aynı ürün zaten açıkken tekrar "Reçeteyi aç" denirse
                  // bileşen yeniden kurulur ve istenen sekme uygulanır. Aksi halde başlangıç değeri
                  // yalnızca ilk kurulumda okunduğu için ikinci yönlendirme etkisiz kalırdı.
                  key={`${p.id}-${hedef ? hedef.sayac : 0}`}
                  product={p}
                  baslangicAcik
                  baslangicSekme={hedef ? hedef.sekme : null}
                  tanimlarRenkler={tanimlar.renkler}
                  tanimlarKombinasyonlar={tanimlar.renkKombinasyonlari || []}
                  tanimlarBedenler={tanimlar.bedenler}
              tanimlarBedenGruplari={tanimlar.bedenGruplari || []}
                  onAddRenk={addRenkToProduct}
                  onAddBeden={addBedenToProduct}
                  onRemoveRenk={removeRenkFromProduct}
                  onRemoveBeden={removeBedenFromProduct}
                  onRemoveProduct={(id, cascade) => { removeProduct(id, cascade); if (onPencereKapat) onPencereKapat(pencereId); }}
                  onEkFiyatEkle={ekFiyatEkle}
                  onEkFiyatSil={ekFiyatSil}
                  tumUrunler={items}
                  tanimlarProsesler={tanimlar.prosesler || []}
                  tanimlarAraProsesler={tanimlar.araProsesler || []}
                  tanimlarBirimler={tanimlar.birimler || []}
                  tanimlarHammaddeTipleri={tanimlar.hammaddeTipleri || []}
                  onUrunGuncelle={urunGuncelle}
                  onMinStokGuncelle={minStokGuncelle}
                  onReceteGrubuGuncelle={receteGrubuGuncelle}
                  onProsesUcretGuncelle={prosesUcretGuncelle}
                  tanimlarOzelKodAlanlari={ozelKodAlanlari}
                  onReceteSilToplu={receteSatirlariSilToplu}
                  onYeniRenkKaydet={onYeniRenkKaydet}
                  onPasifDegistir={pasifDegistir}
                  onDefterDuzeltmeYaz={defterDuzeltmeYaz}
                  stokRezervasyonlari={stokRezervasyonlari}
                  tumSiparisler={tumSiparisler}
                  onKullanilanUrunAc={urunAc}
                  onHizliCariEkle={onHizliCariEkle}
                  onHizliHammaddeEkle={hizliHammaddeEkle}
                  onYeniOlcuKaydet={onYeniOlcuKaydet}
                  receteSablonlari={tanimlar.receteSablonlari || []}
                  onReceteSablonuKaydet={onReceteSablonuKaydet}
                  onYeniOzelKodAlani={onYeniOzelKodAlani}
                  showToast={showToast}
                  onKategoriChange={updateKategori}
                  onKapakResmiChange={updateKapakResmi}
                  onTeknikCizimEkle={teknikCizimEkle}
                  onTeknikCizimSil={teknikCizimSil}
                  onTeknikCizimGuncelle={teknikCizimGuncelle}
                  onTeknikNotChange={teknikNotDegistir}
                  // Büyütme, katalogdaki büyük görsel penceresinin aynısı: { url, ad } bekliyor.
                  onTeknikCizimAc={(c) => setBuyukGorsel({ url: c.gorsel, ad: c.baslik || "Teknik çizim" })}
                  cariler={cariler}
                  onGoToCari={onGoToCari}
                  onRemoveHareketGlobal={onRemoveHareketGlobal}
                  onRenkResmiChange={updateRenkResmi}
                  onRenkResmiRemove={removeRenkResmi}
                  siparisler={siparisler}
                  uretim={uretim}
                  onGoToSiparis={onGoToSiparis}
                  onGoToUretim={onGoToUretim}
                  firmaBilgileri={tanimlar.firmaBilgileri}
                  tanimlarFiyatGruplari={tanimlar.fiyatGruplari || []}
                  onPencereAc={onPencereAc}
                  onKombinasyonOlustur={onKombinasyonOlustur}
                  onGoToUrun={urunAc}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

