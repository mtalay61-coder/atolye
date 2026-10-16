// ================= YETKİ KURALI =================
//
// 19 Eylül (2. madde): App'ten çıkarılan ilk SAF kural. Girdisi tanımlar, aktif kullanıcı, modül
// ve işlem tipi; çıktısı evet/hayır. Hiçbir state'e, hiçbir React kancasına bağlı değil — bu yüzden
// tek başına okunabiliyor ve tek başına test edilebiliyor.
//
// KURALLAR (sırayla):
//   1. Giriş sistemi kapalıysa (kurulum/test aşaması) hiçbir kısıtlama yok.
//   2. Kullanıcı yoksa hiçbir şey yok — giriş sistemi açıkken kimliksiz erişim olmaz.
//   3. Yönetici her şeye yetkili (rol şablonu değil, rolün kendisi).
//   4. Diğerlerinde modül × işlem kutusuna bakılır.
//
// islemTipi: "goruntuleme" | "duzenleme" | "kaydetme" | "silme"
function yetkiVarMi(tanimlar, aktifKullanici, modul, islemTipi) {
  if (!tanimlar || !tanimlar.girisAktifMi) return true;
  if (!aktifKullanici) return false;
  if (aktifKullanici.rol === "Yönetici") return true;
  const yetkiler = aktifKullanici.yetkiler || {};
  return !!(yetkiler[modul] && yetkiler[modul][islemTipi]);
}

// ================= GÖRÜNÜRLÜK (v1.689.0) =================
//
// Kullanıcı: "Kullanıcılar için kısıtlama modüllerine ağırlık verelim; şimdiye kadar yapılan her şey patron içindi,
// kullanıcıların görmesini istemeyeceğim şeyler var." Modül yetkisi (görüntüleme/düzenleme/kaydetme/silme) bir ekrana
// GİRİLİP girilemeyeceğini söylüyor; bir ekrana giren kullanıcının o ekrandaki HASSAS BİLGİYİ görüp göremeyeceği ayrı
// bir soru. Bu liste o sorunun anahtarları — yeni bir hassas bilgi türü eklemek için buraya bir satır eklenir ve
// gösterildiği yerde `gorebilirMi(..., anahtar)` sorulur. Kural modül yetkisiyle aynı sırada:
//   giriş kapalıysa herkes görür · Yönetici her şeyi görür · diğerlerinde kullanıcının kutusu (VARSAYILAN KAPALI —
//   yeni bir hassas alan eklendiğinde mevcut kullanıcılar onu kendiliğinden görmeye başlamasın).
// Kullanıcının GÜNCEL kaydı tanımlardan okunur: Yönetici kutuyu kapatınca oturumdaki kullanıcıya hemen yansısın.
const GORUNURLUK_ALANLARI = [
  { key: "finansRaporlari", ad: "Finans raporları",
    aciklama: "Finans Raporu (Gün Sonu dahil), Gelir / Gider ve Kâr / Zarar, Ödeme & Tahsilat raporu, anasayfadaki alacak / kasa / çek özetleri" },
];
function gorebilirMi(tanimlar, aktifKullanici, alan) {
  if (!tanimlar || !tanimlar.girisAktifMi) return true;
  if (!aktifKullanici) return false;
  if (aktifKullanici.rol === "Yönetici") return true;
  const guncel = ((tanimlar.kullanicilar || []).find((k) => k.id === aktifKullanici.id)) || aktifKullanici;
  if (guncel.rol === "Yönetici") return true;
  return !!((guncel.gorunurluk || {})[alan]);
}
// Finans raporu sayılan sekmeler — menüde gizlenir, adresle/bağlantıyla açılmaya kalkılırsa Anasayfa'ya dönülür.
const FINANS_RAPOR_SEKMELERI = ["finansrapor", "gelirgider", "odemerapor"];

// ONAY SİSTEMİ KAPALI (v1.689.0 — kullanıcı: "onay sistemini deaktif etmemiz lazım"): yetkisi olmayan işlem artık
// yönetici onayına düşmez; düğmesi hiç gösterilmez (kullanıcı kararı: "düğme gizlensin"). Eski davranış Tanımlar ›
// Kullanıcılar'dan geri açılabilir (`tanimlar.onaySistemiAcik`). Mevcut bekleyen onaylar silinmez, karara bağlanabilir.
function onaySistemiAcikMi(tanimlar) { return !!(tanimlar && tanimlar.onaySistemiAcik); }
