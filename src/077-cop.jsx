// ================= ÇÖP KUTUSU =================
//
// 19 Eylül (2. madde, 12. tur): silinen kayıtların gittiği yer ve geri alma.
//
// NEDEN VAR: bu sistemde silme, tek bir kartı değil ona bağlı bütün zinciri götürüyor (ekstre,
// fişler, stok hareketleri, kasa karşılıkları). Geri alınamayan böyle bir silme, aylarca sürmüş
// bir kaydın bir dokunuşla yok olması demekti. Çöp kutusu, "emin misiniz" sorusundan daha
// güvenli: soruyu yanlış cevaplamak da geri alınabilir oluyor.
// SAKLAMA KURALLARI (v1.549.0 — kullanıcı: "Çöp kutusunu daha verimli kullanalım, güvenliğe karşı" → "hepsini yap").
//   · SÜRE, SAYI DEĞİL: kayıt 90 gün çöpte kalır, sonra kendiliğinden düşer. Önce 300 kayıt sınırı vardı; yoğun bir
//     haftada eski silinenler haber vermeden kayboluyordu. Yine de sonsuz büyümesin diye sert bir tavan (5000) var;
//     ona yaklaşılınca uyarı.
//   · EN AZ 30 GÜN: 30 günden yeni kayıt kimse tarafından kalıcı silinemez ("sil, sonra çöpten de sil" ile iz
//     yok etmek mümkün olmasın).
//   · KALICI SİLME / BOŞALTMA YALNIZ YÖNETİCİ: diğerleri görür ve geri yükler.
//   · Sunucu tarafında ayrıca `silinen_arsiv` (silinen-arsiv.sql) var: çöpten düşen kayıt da orada durur.
const COP_SAKLAMA_GUN = 90;
const COP_EN_AZ_GUN = 30;
const COP_SERT_SINIR = 5000;
const GUN_MS = 24 * 60 * 60 * 1000;

function copYasiGun(kayit, simdi = Date.now()) {
  const t = Date.parse((kayit && kayit.silinmeTarihi) || "");
  return Number.isFinite(t) ? (simdi - t) / GUN_MS : 0;
}

// Saklama süresini aşanları atar ve sert tavanı uygular. Saf.
function copuBuda(liste, simdi = Date.now()) {
  return (liste || []).filter((k) => copYasiGun(k, simdi) <= COP_SAKLAMA_GUN).slice(0, COP_SERT_SINIR);
}

// Kalıcı silme izni. Döner: { ok, sebep }.
function copKaliciSilinebilirMi(kayit, kullanici, simdi = Date.now()) {
  if (!kullanici || kullanici.rol !== "Yönetici") return { ok: false, sebep: "Çöpten kalıcı silmeyi yalnız Yönetici yapabilir" };
  const yas = copYasiGun(kayit, simdi);
  if (yas < COP_EN_AZ_GUN) {
    const kalan = Math.ceil(COP_EN_AZ_GUN - yas);
    return { ok: false, sebep: `Kayıt en az ${COP_EN_AZ_GUN} gün çöpte kalır — ${kalan} gün sonra silinebilir` };
  }
  return { ok: true, sebep: "" };
}

// TOPLU SİLME ALARMI: son 10 dakikada aynı kişinin çöpe attığı kayıt sayısı. Eşik aşılınca (20) uyarı; aynı
// pencere içinde ikinci kez uyarmaz. Saf: zaman damgası listesi ve son uyarı zamanı dışarıda tutulur.
const TOPLU_SILME_PENCERE_MS = 10 * 60 * 1000;
const TOPLU_SILME_ESIK = 20;
function topluSilmeDurumu(zamanlar, sonUyari, simdi = Date.now()) {
  const pencere = (zamanlar || []).filter((t) => simdi - t <= TOPLU_SILME_PENCERE_MS);
  const uyar = pencere.length >= TOPLU_SILME_ESIK && !(sonUyari && simdi - sonUyari <= TOPLU_SILME_PENCERE_MS);
  return { pencere, sayi: pencere.length, uyar };
}
// LİSTEDEN DÜŞENLER (v1.549.0): görev/model gibi tek parça listelerde silmeyi yakalamak için. Kimlikle karşılaştırır.
function listedenDusenler(onceki, sonraki) {
  const kalan = new Set((sonraki || []).map((x) => x && x.id).filter(Boolean));
  return (onceki || []).filter((x) => x && x.id && !kalan.has(x.id));
}

// TANIMLARDAN DÜŞENLER: Tanımlar tek kayıt; içindeki listelerden (renk, beden, proses, kullanıcı, asorti, gider
// kartı…) silinen her öğe. Kimlikli nesnelerde kimlikle, düz değer listelerinde (hammadde tipleri gibi) değerle
// karşılaştırılır. Tek tek her silme düğmesine bağlamak yerine kaydetme anında fark — yeni bir tanım listesi
// eklendiğinde de kendiliğinden çöpe düşer. Döner: [{ alan, kayit }].
// GİZLİ ALANLAR çöpe yazılmaz (kullanıcı kaydındaki şifre benzeri her alan): çöp bulutta, Tanımlar'a giren herkes görür.
const GIZLI_ALAN = /sifre|şifre|parola|password|hash|token|secret|apiKey|smtp/i;
// Derin: arşivdeki tanımlar görüntüsünde şifre `kullanicilar[].sifre` gibi iç içe duruyor.
function gizliAlanlariAt(kayit) {
  if (Array.isArray(kayit)) return kayit.map(gizliAlanlariAt);
  if (!kayit || typeof kayit !== "object") return kayit;
  const y = {};
  Object.keys(kayit).forEach((k) => { if (!GIZLI_ALAN.test(k)) y[k] = gizliAlanlariAt(kayit[k]); });
  return y;
}
function tanimdanDusenler(onceki, sonraki) {
  const sonuc = [];
  Object.keys(onceki || {}).forEach((alan) => {
    const a = onceki[alan];
    const b = (sonraki || {})[alan];
    if (!Array.isArray(a) || !Array.isArray(b)) return;
    if (a.every((x) => x && typeof x === "object" && x.id)) {
      listedenDusenler(a, b).forEach((kayit) => sonuc.push({ alan, kayit: gizliAlanlariAt(kayit) }));
    } else if (a.every((x) => typeof x === "string" || typeof x === "number")) {
      const kalan = new Set(b);
      a.filter((x) => !kalan.has(x)).forEach((kayit) => sonuc.push({ alan, kayit }));
    }
  });
  return sonuc;
}
const TANIM_ALAN_ADLARI = {
  renkler: "Renk", bedenler: "Beden/ölçü", birimler: "Birim", prosesler: "Proses", araProsesler: "Ara proses",
  kullanicilar: "Kullanıcı", asortiler: "Asorti", fiyatGruplari: "Fiyat grubu", ozelKodAlanlari: "Özel kod alanı",
  receteSablonlari: "Reçete şablonu", renkKombinasyonlari: "Renk kombinasyonu", giderKartlari: "Gider/gelir kartı",
  hammaddeTipleri: "Hammadde tipi", malzemeTipleri: "Malzeme tipi", mamulTipleri: "Mamul tipi",
};
function tanimKaydiAdi(alan, kayit) {
  const tur = TANIM_ALAN_ADLARI[alan] || alan;
  const ad = kayit && typeof kayit === "object" ? (kayit.ad || kayit.kullaniciAdi || kayit.kod || kayit.id) : kayit;
  return `${tur}: ${ad}`;
}

// Oturum boyunca silme zamanları (modül düzeyi: kancanın her çizimde yeniden kurulması sayacı sıfırlamasın).
const _silmeZamanlari = { liste: [], sonUyari: 0 };

function useCopKutusu(d) {
  const {
    cop, setCop, showToast, aktifKullanici,
    stok, cariler, siparisler, uretim, koliler, muhasebe,
    setStok, setCariler, setSiparisler, setUretim, setKoliler, setMuhasebe,
    // v1.549.0: tanım/görev/model geri yükleyicileri ve toplu silme bildirimi — App'te bu kancadan SONRA
    // tanımlanan fonksiyonlara ref ile ulaşılıyor (tanımlanmadan önce kullanılmasınlar diye).
    ekGeriYukleRef, topluSilmeBildirRef,
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
    const next = copuBuda([kayit, ...prev]);
    yazimiIzle(tabloYaz("cop:data", "cop", next), "Çöp kutusu", next);
    return next;
  });
  // Toplu silme alarmı (oturum içi sayaç).
  const simdi = Date.now();
  const durum = topluSilmeDurumu([..._silmeZamanlari.liste, simdi], _silmeZamanlari.sonUyari, simdi);
  _silmeZamanlari.liste = durum.pencere;
  if (durum.uyar) {
    _silmeZamanlari.sonUyari = simdi;
    if (topluSilmeBildirRef && topluSilmeBildirRef.current) topluSilmeBildirRef.current(durum.sayi);
  }
}, [aktifKullanici]);

// Çöpten çıkarma — İZİN KONTROLÜ YOK; yalnız iç kullanım (geri yükleme sonrası). Dışarıya `coptanKaliciSil` açılır.
const coptanCikar = useCallback((copId) => {
  setCop((prev) => {
    const next = prev.filter((k) => k.id !== copId);
    yazimiIzle(tabloYaz("cop:data", "cop", next), "Çöp kutusu", next);
    return next;
  });
}, []);

const coptanKaliciSil = useCallback((copId) => {
  const kayit = (cop || []).find((k) => k.id === copId);
  if (!kayit) return;
  const izin = copKaliciSilinebilirMi(kayit, aktifKullanici);
  if (!izin.ok) { showToast(izin.sebep); return; }
  coptanCikar(copId);
  gunlukYaz(`Çöpten kalıcı silindi: ${kayit.baslik}`, "cop", { copId, tur: kayit.tur });
}, [cop, aktifKullanici, coptanCikar, showToast]);

// BOŞALT: yalnız Yönetici; yalnız en az 30 gündür çöpte olanlar gider, yeniler kalır.
const copuBosalt = useCallback(async () => {
  if (!aktifKullanici || aktifKullanici.rol !== "Yönetici") { showToast("Çöpü yalnız Yönetici boşaltabilir"); return; }
  const simdi = Date.now();
  const mevcut = cop || [];
  const silinecek = mevcut.filter((k) => copYasiGun(k, simdi) >= COP_EN_AZ_GUN);
  if (silinecek.length === 0) { showToast(`Çöpte ${COP_EN_AZ_GUN} günden eski kayıt yok — yeni kayıtlar en az ${COP_EN_AZ_GUN} gün kalır`); return; }
  const ids = new Set(silinecek.map((k) => k.id));
  // Kalan sayı setCop'tan ÖNCE hesaplanır (sonra `cop` okumak eski değeri verir — 18A).
  const kalan = mevcut.length - silinecek.length;
  // Durum işlevsel güncellenir (bu arada çöpe düşen kayıt kaybolmasın); yazma sözü dışarı alınıp
  // BEKLENİR — "silindi" mesajı ancak yazma tuttuysa verilir (13).
  let soz = null;
  setCop((prev) => {
    const next = prev.filter((k) => !ids.has(k.id));
    soz = yazimiIzle(tabloYaz("cop:data", "cop", next), "Çöp kutusu", next);
    return next;
  });
  const sonuc = soz ? await soz : { ok: true };
  gunlukYaz(`Çöp boşaltıldı: ${silinecek.length} kayıt (${COP_EN_AZ_GUN} günden eski)`, "cop", { sayi: silinecek.length });
  if (sonuc && sonuc.ok === false && sonuc.yerel) { showToast("Çöp boşaltılamadı — cihaza yazılamadı"); return; }
  showToast(`${silinecek.length} eski kayıt silindi${kalan > 0 ? ` — ${kalan} yeni kayıt ${COP_EN_AZ_GUN} gün dolana kadar kalıyor` : ""}`);
}, [cop, aktifKullanici, showToast]);

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
    // Tanım / görev / model (v1.549.0): kendi kaydetme yolları App'te — ref üzerinden.
    const ek = ekGeriYukleRef && ekGeriYukleRef.current && ekGeriYukleRef.current[kayit.tur];
    if (ek) {
      const r = await ek(kayit.veri);
      if (r && r.ok) {
        coptanCikar(copId);
        gunlukYaz(`Çöpten geri yüklendi: ${kayit.baslik}`, "cop", { copId, tur: kayit.tur });
        showToast(`"${kayit.baslik}" geri yüklendi${r.not ? ` — ${r.not}` : ""}`);
      } else showToast((r && r.mesaj) || "Geri yüklenemedi");
      return;
    }
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

  coptanCikar(copId);
  const yanEtki = kayit.yanEtkiliMi ? " — dikkat: silme sırasındaki stok/cari etkileri geri alınmadı, kontrol edin" : "";
  if (sonuc.ok === false) {
    gunlukYaz(`Çöpten geri yüklendi, BULUT YAZILAMADI: ${kayit.baslik}`, "cop", { copId, hata: sonuc.hata });
    showToast(`⚠ "${kayit.baslik}" bu bilgisayarda geri yüklendi ama buluta yazılamadı (${sonuc.hata}) — ` +
      `bağlantı gelince kendiliğinden yeniden denenecek${yanEtki}`);
  } else {
    showToast(`"${kayit.baslik}" geri yüklendi${yanEtki}`);
  }
}, [cop, stok, cariler, siparisler, uretim, coptanCikar, showToast]);

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

// ================= SUNUCU ARŞİVİ (v1.549.0) =================
// `silinen-arsiv.sql`: veritabanı tetikleyicisi silinen her satırı `silinen_arsiv`e kopyalar; uygulama
// yalnız OKUR (yazma/silme yetkisi yok). Çöp kutusu boşaltılsa ya da hesabı ele geçen biri çöpü de
// silse bile iz orada kalır. Aşağıdakiler okunan satırı insan diline çevirir.
const ARSIV_TABLO_ADLARI = {
  urunler: "Ürün", varyantlar: "Ürün varyantı", stok_hareketleri: "Stok hareketi", cariler: "Cari",
  cari_hareketleri: "Cari hareketi", siparisler: "Sipariş", siparis_kalemleri: "Sipariş kalemi",
  uretim: "Üretim", uretim_atamalari: "İş ataması", stok_rezervasyonlari: "Rezervasyon", onaylar: "Onay",
  cek_gorselleri: "Çek görseli", cop: "Çöp kaydı", tanimlar: "Tanımlar", modeller: "Modeller",
  gorevler: "Görevler", koliler: "Koliler", faturalar: "Faturalar", muhasebe: "Kasa/Banka",
};

function arsivSatiriOzeti(satir, kullanicilar) {
  const v = (satir && satir.veri) || {};
  // Satır tablolarında `veri` sütunu yoksa satırın kendisi; varsa (cop, onaylar) asıl kayıt içeride.
  const ic = v.veri && typeof v.veri === "object" && !Array.isArray(v.veri) ? v.veri : v;
  const baslik = satir && satir.islem === "GORUNTU"
    ? "Değişiklik öncesi anlık görüntü"
    : (v.baslik || ic.ad || ic.unvan || ic.siparisNo || ic.urunAdi || ic.aciklama || ic.no || satir.satir_id || "—");
  const ep = String((satir && satir.silen_eposta) || "").toLowerCase();
  const k = ep && (kullanicilar || []).find((x) => String(kullaniciEposta(x)).toLowerCase() === ep);
  return {
    tabloAdi: ARSIV_TABLO_ADLARI[satir && satir.tablo] || (satir && satir.tablo) || "?",
    baslik: String(baslik),
    kim: k ? k.ad || k.kullaniciAdi : (ep || "bilinmiyor"),
  };
}
