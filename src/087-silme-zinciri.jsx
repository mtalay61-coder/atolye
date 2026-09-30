// ================= SİLME ZİNCİRLERİ =================
//
// 19 Eylül (2. madde, 7. tur): App'ten çıkarılan yedinci parça. Cari, ürün ve sipariş silindiğinde
// ona bağlı ne varsa toplayan zincirler.
//
// NEDEN ZİNCİR: bir cariyi silmek yalnız kartı silmek değildir — ekstresi, fişleri, o fişlerin
// stok hareketleri, kasadaki karşılıkları da ona bağlıdır. Yalnız kartı silmek, sistemde hiçbir
// yere bağlanmayan "yetim" kayıtlar bırakıyordu; bir sonraki denetimde açıklanamaz farklar olarak
// çıkıyorlardı.
//
// SİLİNEN ÇÖPE GİDER: zincirin topladığı her şey çöp kutusuna yazılır. Yanlışlıkla silinen bir
// cari, aylarca sürmüş bir ekstrenin kaybolması demek; geri alınamayan silme, kullanıcıya
// "emin misiniz" diye sormaktan daha tehlikelidir.
function useSilmeZincirleri(d) {
  const { cariler, copaAt, showToast, siparisler, stok, uretim, koliler, stokRezervasyonlari, aktifKullanici,
    fisDefteriniDonustur, setCariler, setStok, setSiparisler, setUretim, setKoliler, setStokRezervasyonlari } = d;

// EN GÜNCEL VERİ (v1.538.0 — son denetim, kullanıcı kararı): sipariş kapatma birkaç yazmayı sırayla BEKLİYOR; her
// çizimde güncellenen bu ref sayesinde her tablo yazılmadan hemen önce bağ çözümü EN SON hâl üzerinden yeniden kurulur.
const sonVeriRef = useRef(null);
sonVeriRef.current = { stok, cariler, siparisler, uretim, koliler, stokRezervasyonlari };

const cariSilCascade = useCallback((cariId) => {
  const cari = cariler.find((c) => c.id === cariId);
  if (!cari) return;

  const engeller = [];
  const hareketSayisi = (cari.hareketler || []).length;
  if (hareketSayisi > 0) engeller.push(`${hareketSayisi} cari hareketi`);
  const bagliSiparisler = (siparisler || []).filter((s) => s.cariId === cariId);
  if (bagliSiparisler.length > 0) {
    engeller.push(`${bagliSiparisler.length} sipariş (${bagliSiparisler.slice(0, 3).map((s) => s.siparisNo).join(", ")}${bagliSiparisler.length > 3 ? "…" : ""})`);
  }
  const bagliStokUrunleri = (stok || []).filter((p) => (p.hareketler || []).some((h) => h.cariId === cariId));
  if (bagliStokUrunleri.length > 0) {
    engeller.push(`${bagliStokUrunleri.length} üründe stok hareketi`);
  }

  if (engeller.length > 0) {
    showToast(`"${cari.unvan}" silinemez — ${engeller.join(", ")} var. Geçmişi olan cari onayla da silinemez.`);
    return;
  }

  copaAt("cari", cari.unvan, cari, {
    ozet: `${cari.tip || "Cari"} — hareketsiz`,
    yanEtkiliMi: false,
  });
  setCariler((prev) => {
    const next = prev.filter((c) => c.id !== cariId);
    yazimiIzle(tabloYaz("cari:data", "cariler", next), "Cari kartları", next);
    return next;
  });
  showToast(`"${cari.unvan}" silindi — Tanımlar > Çöp Kutusu'ndan geri alınabilir`);
}, [cariler, siparisler, stok, showToast, copaAt]);

// Bir ürünü, ona bağlı TÜM kayıtlarla birlikte siler: bu ürünü kullanan üretim siparişlerini
// (tamamlanmış proseslerinin hammadde/cari etkilerini geri alarak) tamamen kaldırır, bu ürünü
// içeren sipariş kalemlerini siparişlerden çıkarır (bomboş kalan siparişi de siler), ve DİĞER
// ürünlerin reçetelerinde bu ürünü hammadde olarak kullanan satırları temizler.
// Eskiden burada CASCADE silme vardı: ürünle birlikte stok hareketleri, bağlı üretim siparişleri
// (etkileri geri sarılarak), sipariş kalemleri ve diğer ürünlerin reçete satırları da siliniyordu.
// Bu davranış kaldırıldı — bu kayıtlar birbirine bağlı bir ağ oluşturuyor ve bir düğümü çekip
// almak, bağlandığı her yerde (cari ekstresi, üretim geçmişi, reçete maliyeti) tutarsızlık
// bırakıyordu. Tek bir onayla geri alınamaz bir zincir başlıyordu.
//
// Bu fonksiyon artık KORUMALI silme yapıyor ve adı geriye dönük uyumluluk için korunuyor: yalnızca
// yönetici onayından geçen istekler buraya düşüyor, ama onay bile bağlantılı bir ürünü sildiremez.
// Aksi halde yetkisiz kullanıcı, doğrudan yapamadığı silmeyi onay üzerinden yaptırarak politikayı
// dolanabilirdi — kuralın en zayıf halkası, kuralın kendisi olur.
const urunSilCascade = useCallback((urunId) => {
  const urun = stok.find((p) => p.id === urunId);
  if (!urun) return;

  const engeller = [];
  const hareketSayisi = (urun.hareketler || []).length;
  if (hareketSayisi > 0) engeller.push(`${hareketSayisi} stok hareketi`);
  const bagliUretimler = uretim.filter((o) => o.urunId === urunId);
  if (bagliUretimler.length > 0) engeller.push(`${bagliUretimler.length} üretim siparişi`);
  const bagliSiparisler = siparisler.filter((s) => s.kalemler.some((k) => k.urunId === urunId));
  if (bagliSiparisler.length > 0) engeller.push(`${bagliSiparisler.length} sipariş`);
  const receteKullanan = stok.filter((p) => p.id !== urunId && (p.recete || []).some((r) => r.hammaddeUrunId === urunId));
  if (receteKullanan.length > 0) engeller.push(`${receteKullanan.length} ürünün reçetesi`);

  if (engeller.length > 0) {
    showToast(`"${urun.ad}" silinemez — ${engeller.join(", ")} var. Geçmişi olan ürün onayla da silinemez.`);
    return;
  }

  copaAt("urun", urun.ad, urun, {
    ozet: `${urun.kategori || "Ürün"}${urun.kod ? " · " + urun.kod : ""} — bağlantısız`,
    yanEtkiliMi: false,
  });
  setStok((prev) => {
    const next = prev.filter((p) => p.id !== urunId);
    yazimiIzle(tabloYaz("stok:items", "urunler", next), "Stok kartları", next);
    return next;
  });
  showToast(`"${urun.ad}" silindi — Tanımlar > Çöp Kutusu'ndan geri alınabilir`);
}, [stok, uretim, siparisler, showToast, copaAt]);


// SİPARİŞİ KAPAT: İPTAL ya da SİL (v1.512.0 — kullanıcı kuralı, bkz. 088-siparis-iptal).
//
// ESKİDEN (siparisSilCascade) siparişe bağlı fişlerin stok ve cari hareketlerini SİLİYORDU: teslim
// edilmiş malın satış fişi yok oluyor, stok geri dönüyor, müşterinin borcu siliniyordu; fatura/çek/kasa
// kilitlerini de (fisGeriAl) atlıyordu. Kullanıcı: "Sipariş silindiğinde fişler silinmez, bağımsız fiş
// olur; alım vs. yok olmaz, bağlantısı kalmaz, oluşan stok serbest stoğa düşer."
//
// KARAR (kendisi verir — kart, onay ekranı ve eski çağrılar aynı sonuca varsın):
//   · Siparişe ait FİŞ GİRİŞİ varsa (stok/cari hareketi, fiş defteri kaydı, teslim sayacı) → İPTAL: kayıt
//     "İptal" durumunda kalır, bütün bağlar çözülür, hiçbir fişe/miktara/tutara dokunulmaz.
//   · Fiş yoksa ya da zaten İptal ise → SİL: listeden çıkar, çöpe gider. Planlama/koli/rezervasyon gibi bilgi
//     bağları varsa SİLMEDE DE çözülür (v1.544.0 — önce bunlar da iptale zorluyordu; bkz. 088 `siparisIslemGormusMu`).
// Yazmalar beklenir; "iptal edildi" ancak hepsinin sonucu bilinince söylenir.
const siparisKapat = useCallback(async (siparisId) => {
  const siparis = siparisler.find((s) => s.id === siparisId);
  if (!siparis) return;
  const no = siparis.siparisNo;
  const zatenIptal = siparis.durum === "İptal";
  const veri = { stok, cariler, siparisler, uretim, koliler, stokRezervasyonlari };
  const onizleme = siparisBaglariniCoz(veri, siparisId);
  const sil = zatenIptal || !siparisIslemGormusMu(onizleme.ozet, siparis);
  const r = siparisBaglariniCoz(veri, siparisId, {
    sil, kullanici: (aktifKullanici && aktifKullanici.ad) || "",
  });
  const ozet = r.ozet;
  const nextSiparisler = sil ? r.siparisler.filter((s) => s.id !== siparisId) : r.siparisler;
  if (sil) {
    copaAt("siparis", `${siparis.tip} ${no}`, siparis, {
      ozet: `${(siparis.kalemler || []).length} kalem — ${zatenIptal ? "iptal edilmiş" : "fiş girişi yok"}, durum: ${siparis.durum}`
        + (onizleme.ozet.bagSayisi > 0 ? " · bağları çözüldü (planlama/koli/ayırma)" : ""),
      // Bağ çözüldüyse geri yükleme onları kurmaz (satışın planlaması boş kalır) — çöp ekranı uyarsın.
      yanEtkiliMi: onizleme.ozet.bagSayisi > 0,
    });
  }

  const sonuclar = [];
  // BAYAT ANLIK GÖRÜNTÜ YAZILMAZ (v1.538.0): eskiden bütün tablolar işlemin BAŞINDA hesaplanan dizilerle yazılıyordu;
  // fiş defteri ve bulut yazmaları beklenirken başka pencerede yapılan planlama/teslim eziliyordu. Artık her tablo,
  // yazılmadan hemen önce `sonVeriRef`teki güncel hâl üzerinden yeniden çözülür (aynı saf fonksiyon, aynı seçenekler).
  const secenek = { sil, kullanici: (aktifKullanici && aktifKullanici.ad) || "" };
  const yaz = async (alan, set, soz) => {
    const guncel = sonVeriRef.current || veri;
    const d = siparisBaglariniCoz({ ...guncel }, siparisId, secenek);
    if (!d || !d.degisenler[alan]) return;
    const sonrasi = d[alan];
    sonVeriRef.current = { ...(sonVeriRef.current || {}), [alan]: sonrasi };
    set(sonrasi);
    sonuclar.push(await soz(sonrasi));
  };
  await yaz("stok", setStok, (x) => yazimiIzle(tabloYaz("stok:items", "urunler", x), "Stok kartları", x));
  await yaz("cariler", setCariler, (x) => yazimiIzle(tabloYaz("cari:data", "cariler", x), "Cari kartları", x));
  sonuclar.push(await fisDefteriniDonustur((defter) => {
    // Yalnız hedef sipariş yeter (defterin bağı ona göre çözülüyor); bekleme öncesi listeyi okumaya gerek yok.
    const d = siparisBaglariniCoz({ siparisler: [siparis], fisDefteri: defter }, siparisId);
    return d ? d.fisDefteri : defter;
  }));
  await yaz("uretim", setUretim, (x) => yazimiIzle(tabloYaz("uretim:siparisler", "uretim", x), "Üretim", x));
  await yaz("koliler", setKoliler, (x) => yazimiIzle(tekilYaz("koli:data", "koliler", x), "Koliler", x));
  await yaz("stokRezervasyonlari", setStokRezervasyonlari,
    (x) => yazimiIzle(tabloYaz("stokrez:data", "stok_rezervasyonlari", x), "Stok rezervasyonları", x));
  // Sipariş EN SONA: bağlar çözülmeden sipariş "İptal"/silinmiş görünmesin. Bu da güncel listeden.
  {
    const guncel = sonVeriRef.current || veri;
    const d = siparisBaglariniCoz({ ...guncel }, siparisId, secenek);
    const sonrasi = d ? (sil ? d.siparisler.filter((x) => x.id !== siparisId) : d.siparisler) : nextSiparisler;
    setSiparisler(sonrasi);
    sonuclar.push(await yazimiIzle(tabloYaz("siparis:data", "siparisler", sonrasi), "Siparişler", sonrasi));
  }

  const basarisiz = sonuclar.filter((x) => x && x.ok === false);
  const eylem = sil ? "silindi" : "iptal edildi";
  gunlukYaz(
    basarisiz.length ? `Sipariş ${eylem} ama YARIM KALDI: ${no}` : `Sipariş ${eylem}: ${no}`,
    "siparis",
    { siparisNo: no, tip: siparis.tip, fisler: ozet.fisNolar, alislar: ozet.alislar.map((a) => a.siparisNo),
      uretimler: ozet.uretimler.map((u) => u.siparisNo), koliler: ozet.koliler.length,
      serbesteDonen: ozet.rezervasyonMiktari, basarisizYazma: basarisiz.length }
  );
  if (basarisiz.length > 0) {
    showToast(`⚠ ${no} bu bilgisayarda ${eylem} ama ${basarisiz.length} kayıt BULUTA YAZILAMADI (${basarisiz[0].hata}). ` +
      `Diğer bilgisayarlarda eski hâli görünür; sayfayı yenileyip tekrar deneyin.`);
    return;
  }
  if (sil) { showToast(`${no} silindi — Tanımlar > Çöp Kutusu'ndan geri alınabilir`); return; }
  const parcalar = [];
  if (ozet.fisNolar.length) parcalar.push(`${ozet.fisNolar.length} fiş bağımsız kaldı (stok ve cari değişmedi)`);
  const devam = [...ozet.alislar.map((a) => a.siparisNo), ...ozet.uretimler.map((u) => u.siparisNo)];
  if (devam.length) parcalar.push(`${devam.join(", ")} devam ediyor`);
  if (ozet.koliler.length) parcalar.push(`${ozet.koliler.length} koli siparişsiz kaldı`);
  if (ozet.rezervasyonMiktari > 0) parcalar.push(`${ozet.rezervasyonMiktari} birim ayrılmış malzeme serbest kaldı`);
  showToast(`${no} iptal edildi${parcalar.length ? " — " + parcalar.join(" · ") : ""}`);
}, [siparisler, stok, cariler, uretim, koliler, stokRezervasyonlari, aktifKullanici, showToast, copaAt, fisDefteriniDonustur]);

  return { cariSilCascade, urunSilCascade, siparisKapat };
}
