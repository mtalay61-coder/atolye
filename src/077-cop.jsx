// ================= ÇÖP KUTUSU =================
//
// 19 Eylül (2. madde, 12. tur): silinen kayıtların gittiği yer ve geri alma.
//
// NEDEN VAR: bu sistemde silme, tek bir kartı değil ona bağlı bütün zinciri götürüyor (ekstre,
// fişler, stok hareketleri, kasa karşılıkları). Geri alınamayan böyle bir silme, aylarca sürmüş
// bir kaydın bir dokunuşla yok olması demekti. Çöp kutusu, "emin misiniz" sorusundan daha
// güvenli: soruyu yanlış cevaplamak da geri alınabilir oluyor.
// Çöpte tutulacak en fazla kayıt. Sabit: sınırsız çöp, silinen her şeyi sonsuza dek taşımak ve
// depoyu şişirmek demek; çok küçük bir sınır ise geri almayı işe yaramaz hale getirir.
const COP_SINIRI = 300;

function useCopKutusu(d) {
  const {
    cop, setCop, showToast, aktifKullanici,
    stok, cariler, siparisler, uretim, koliler, muhasebe,
    setStok, setCariler, setSiparisler, setUretim, setKoliler, setMuhasebe,
  } = d;

const copaAt = useCallback((tur, baslik, veri, secenekler) => {
  // Yazma kilitliyken çöpe kayıt EKLENMEZ. Aksi halde silme diske yazılamadığı için gerçekleşmez,
  // ama çöp kutusunda "silindi" görünen bir kayıt belirir; kullanıcı silinmemiş bir kaydı silinmiş
  // sanar. Bildirilen davranış tam olarak buydu.
  if (VERI_KILIDI.aktif) return;
  const s = secenekler || {};
  const kayit = {
    id: uid("cop"),
    tur,                                   // "urun" | "cari" | "siparis" | "uretim" | "hareket" | ...
    baslik,                                // listede görünen ad
    ozet: s.ozet || "",                    // tek satırlık açıklama
    veri,                                  // kaydın TAM kopyası
    ustKayit: s.ustKayit || null,          // alt kayıtlar için: hangi kaydın içindeydi
    yanEtkiliMi: !!s.yanEtkiliMi,
    geriAlinabilirMi: s.geriAlinabilirMi !== false,
    silinmeTarihi: new Date().toISOString(),
    kullaniciAd: (aktifKullanici && aktifKullanici.ad) || "—",
    kullaniciId: (aktifKullanici && aktifKullanici.id) || null,
  };
  setCop((prev) => {
    const next = [kayit, ...prev].slice(0, COP_SINIRI);
    yazimiIzle(tabloYaz("cop:data", "cop", next), "Çöp kutusu", next);
    return next;
  });
}, [aktifKullanici]);

const coptanKaliciSil = useCallback((copId) => {
  setCop((prev) => {
    const next = prev.filter((k) => k.id !== copId);
    yazimiIzle(tabloYaz("cop:data", "cop", next), "Çöp kutusu", next);
    return next;
  });
}, []);

const copuBosalt = useCallback(() => {
  setCop(() => {
    yazimiIzle(tabloYaz("cop:data", "cop", []), "Çöp kutusu", []);
    return [];
  });
  showToast("Çöp kutusu boşaltıldı");
}, [showToast]);

const coptanGeriYukle = useCallback(async (copId) => {
  const kayit = cop.find((k) => k.id === copId);
  if (!kayit) return;
  if (!kayit.geriAlinabilirMi) { showToast("Bu kayıt geri yüklenemez — yalnızca kayıt amaçlı saklanıyor"); return; }

  // Aynı kimlikle bir kayıt zaten varsa üzerine yazmıyoruz: silinen kayıt geri gelmiş olabilir
  // (ör. yedekten) ve mevcut hâli daha güncel olabilir.
  const zatenVarMi = (liste) => liste.some((x) => x.id === kayit.veri.id);

  // SIRA (22 Eylül, v1.410.0 — 13. denetim borcu): önce kayıt geri YAZILIR ve sonucu BEKLENİR;
  // kayıt çöpten ANCAK yazma diske tuttuysa çıkarılır. Eskiden yazma beklenmeden çöpten
  // siliniyordu: disk yazması başarısız olursa kayıt ne listede ne çöpte kalıyordu (sayfa
  // yenilenince kayıp). Bulut yazılamadıysa kayıt yine geri gelir (yerelde duruyor, bulut
  // kendiliğinden yeniden denenir) ama mesaj bunu açıkça söyler.
  const TUR = {
    urun: { liste: stok, set: setStok, anahtar: "stok:items", tablo: "urunler", etiket: "Stok kartları", basa: false, ad: "ürün" },
    cari: { liste: cariler, set: setCariler, anahtar: "cari:data", tablo: "cariler", etiket: "Cari kartları", basa: false, ad: "cari" },
    siparis: { liste: siparisler, set: setSiparisler, anahtar: "siparis:data", tablo: "siparisler", etiket: "Siparişler", basa: true, ad: "sipariş" },
    uretim: { liste: uretim, set: setUretim, anahtar: "uretim:siparisler", tablo: "uretim", etiket: "Üretim", basa: true, ad: "üretim siparişi" },
  }[kayit.tur];
  if (!TUR) {
    showToast("Bu tür kayıt otomatik geri yüklenemiyor — içeriği görüntüleyip elle girebilirsiniz");
    return;
  }
  if (zatenVarMi(TUR.liste)) { showToast(`Bu ${TUR.ad} zaten listede — geri yükleme yapılmadı`); return; }

  const onceki = TUR.liste;
  const n = TUR.basa ? [kayit.veri, ...onceki] : [...onceki, kayit.veri];
  TUR.set(n);
  const sonuc = await yazimiIzle(tabloYaz(TUR.anahtar, TUR.tablo, n), TUR.etiket, n);
  if (sonuc.yerel) {
    // Diske yazılamadı: ekranı eski hâline döndür, kayıt ÇÖPTE KALSIN (bildirim penceresi açıldı).
    TUR.set((simdiki) => simdiki.filter((x) => x.id !== kayit.veri.id));
    gunlukYaz(`Çöpten geri yükleme YAPILAMADI: ${kayit.baslik}`, "cop", { copId, hata: sonuc.hata });
    showToast(`⚠ "${kayit.baslik}" geri yüklenemedi — bu bilgisayara yazılamadı. Kayıt çöpte duruyor.`);
    return;
  }

  coptanKaliciSil(copId);
  const yanEtki = kayit.yanEtkiliMi ? " — dikkat: silme sırasındaki stok/cari etkileri geri alınmadı, kontrol edin" : "";
  if (sonuc.ok === false) {
    gunlukYaz(`Çöpten geri yüklendi, BULUT YAZILAMADI: ${kayit.baslik}`, "cop", { copId, hata: sonuc.hata });
    showToast(`⚠ "${kayit.baslik}" bu bilgisayarda geri yüklendi ama buluta yazılamadı (${sonuc.hata}) — ` +
      `bağlantı gelince kendiliğinden yeniden denenecek${yanEtki}`);
  } else {
    showToast(`"${kayit.baslik}" geri yüklendi${yanEtki}`);
  }
}, [cop, stok, cariler, siparisler, uretim, coptanKaliciSil, showToast]);

// Birden çok tabloya yazan silme işlemleri için ortak yürütücü.
//
// Tarayıcıdan çok tablolu işlem (transaction) açılamıyor: PostgREST her tabloyu ayrı istekle
// yazıyor. Bu yüzden "hepsi ya da hiçbiri" garantisi VERİLEMEZ. Verilebilecek olan şudur:
//   1. SIRA — etkiler önce geri alınır, ana kayıt EN SON silinir. Böylece yarıda kalırsa
//      geride öksüz hareket değil, etkileri geri alınmış bir kayıt kalır: görünür ve
//      tekrar denenebilir. Ters sırada kalan şey görünmez bir artık olurdu.
//   2. DURMA — ilk hatada devam edilmez. Devam etmek, hasarı büyütmekten başka bir şey değil.
//   3. DÜRÜST RAPOR — ne yapıldı, ne yapılamadı, kullanıcı ne yapmalı; hepsi söylenir.
  return { copaAt, coptanKaliciSil, copuBosalt, coptanGeriYukle };
}
