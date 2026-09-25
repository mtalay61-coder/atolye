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
  const { cariler, copaAt, showToast, siparisler, stok, uretim,
    setCariler, setStok, setSiparisler } = d;

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


// Bir siparişi silerken, o siparişten doğan tüm stok ve cari hareketlerini de geri alır (miktarları düzeltir).
// GERÇEK KİMLİK (siparisId) ile eşleştirilir — sadece siparisNo (metin) kullanmak, veritabanı sıfırlandıktan
// sonra sayaç yeniden başlayıp AYNI numara başka bir siparişe de atandığında, o farklı siparişin hareketlerini
// de YANLIŞLIKLA silme/geri alma riski taşırdı.
const siparisSilCascade = useCallback((siparisId) => {
  // Yazma SÖZLERİ toplanıyor. Bu fonksiyonda yazmalar `setX` güncelleyicilerinin içinde
  // olduğu için sıralı `await` kurulamıyor; ama sonucu görmezden gelmek de kabul edilemez.
  // Sözler biriktirilip başarı mesajı EN SONA, hepsinin sonucu bilindikten sonra bırakılıyor.
  // Böylece "silindi" yazısı bir olgu oluyor, temenni değil.
  const yazmalar = [];
  // HATA DÜZELTMESİ: çöp kaydı eskiden setSiparisler'in güncelleyicisinin İÇİNDEN alınıyordu.
  // React'te bir state güncelleyicisi SAF olmalıdır; içinden başka bir state'i güncellemek
  // (setCop) güvenilir değildir — React güncelleyiciyi iki kez çağırabilir ya da içteki
  // setState'i yok sayabilir. Sipariş silmelerinin çöpte hiç görünmemesinin sebebi buydu.
  const silinecek = siparisler.find((s) => s.id === siparisId);
  if (silinecek) {
    copaAt("siparis", `${silinecek.tip} ${silinecek.siparisNo}`, silinecek, {
      ozet: `${(silinecek.kalemler || []).length} kalem — durum: ${silinecek.durum}`,
      yanEtkiliMi: true,
    });
  }
  setSiparisler((prevSiparisler) => {
    const siparis = prevSiparisler.find((s) => s.id === siparisId);
    if (!siparis) return prevSiparisler;
    const siparisNo = siparis.siparisNo;
    const hareketAit = (h) => (h.siparisId ? h.siparisId === siparisId : h.siparisNo === siparisNo);

    setStok((prevStok) => {
      let touched = false;
      const next = prevStok.map((p) => {
        const ilgili = (p.hareketler || []).filter(hareketAit);
        if (ilgili.length === 0) return p;
        touched = true;
        let variants = p.variants;
        ilgili.forEach((h) => {
          variants = variants.map((v) =>
            v.renk === h.renk && v.beden === h.beden ? { ...v, miktar: stokYuvarla(v.miktar - h.miktar) } : v
          );
        });
        return {
          ...p,
          variants,
          hareketler: (p.hareketler || []).filter((h) => !hareketAit(h)),
        };
      });
      if (touched) yazmalar.push(tabloYaz("stok:items", "urunler", next));
      return touched ? next : prevStok;
    });

    setCariler((prevCariler) => {
      let touched = false;
      const next = prevCariler.map((c) => {
        const has = (c.hareketler || []).some(hareketAit);
        if (!has) return c;
        touched = true;
        return {
          ...c,
          hareketler: (c.hareketler || []).filter((h) => !hareketAit(h)),
        };
      });
      if (touched) yazmalar.push(tabloYaz("cari:data", "cariler", next));
      return touched ? next : prevCariler;
    });

    const nextSiparisler = prevSiparisler
      .filter((s) => s.id !== siparisId)
      .map((s) => {
        if (s.tip !== "Satış" || siparis.tip !== "Alış") return s;
        const etkilenen = s.kalemler.some((k) => k.planlama && k.planlama.referansNo === siparisNo);
        if (!etkilenen) return s;
        return {
          ...s,
          kalemler: bekleyenKalemleriBirlestir(s.kalemler.map((k) =>
            k.planlama && k.planlama.referansNo === siparisNo ? { ...k, planlama: null } : k
          )),
        };
      });
    yazmalar.push(tabloYaz("siparis:data", "siparisler", nextSiparisler));
    // Mesaj burada değil, sözler çözüldükten SONRA veriliyor.
    Promise.all(yazmalar).then((sonuclar) => {
      const basarisiz = sonuclar.filter((r) => r && r.ok === false);
      gunlukYaz(
        basarisiz.length ? `Sipariş silme YARIM KALDI: ${siparisNo}` : `Sipariş silindi: ${siparisNo}`,
        "siparis",
        { siparisNo, tip: siparis.tip, basarisizYazma: basarisiz.length }
      );
      if (basarisiz.length > 0) {
        showToast(
          `⚠ Sipariş bu bilgisayarda silindi ama ${basarisiz.length} kayıt BULUTA YAZILAMADI ` +
          `(${basarisiz[0].hata}). Diğer bilgisayarlarda eski hâli görünmeye devam eder. ` +
          `Sayfayı yenileyip tekrar deneyin.`
        );
      } else {
        showToast("Sipariş ve bağlı stok/cari hareketleri silindi");
      }
    });
    return nextSiparisler;
  });
}, [showToast, copaAt, siparisler]);

  return { cariSilCascade, urunSilCascade, siparisSilCascade };
}
