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
// SİTE HESABI YÖNETİMİ (güvenlik denetimi, 16 Kasım — 1. madde): müşterinin site girişini oluştur / değiştir / kapat ve siteden
// gelen kayıt talebini onayla / reddet yalnız Yönetici. Sunucu aynı kuralı uygular (site-portal.sql `site_yonetici_kapisi`,
// fonksiyonların ilk satırı); bu yalnız düğmeleri gizler. Modül yetkisi SAYILMAZ (cari kaydetme yetkisi olan Kullanıcı da
// göremez) — sunucu da saymıyor. Sıra yetkiVarMi ile aynı: giriş kapalıysa kısıtlama yok (karar sunucuda); GÜNCEL kayıt
// tanımlardan okunur (rolü düşürülen kullanıcıda düğmeler hemen kaybolsun).
function siteYonetimiYetkisi(tanimlar, aktifKullanici) {
  if (!tanimlar || !tanimlar.girisAktifMi) return true;
  if (!aktifKullanici) return false;
  const guncel = ((tanimlar.kullanicilar || []).find((k) => k.id === aktifKullanici.id)) || aktifKullanici;
  return guncel.rol === "Yönetici";
}
// Finans raporu sayılan sekmeler — menüde gizlenir, adresle/bağlantıyla açılmaya kalkılırsa Anasayfa'ya dönülür.
const FINANS_RAPOR_SEKMELERI = ["finansrapor", "gelirgider", "odemerapor"];

// ONAY SİSTEMİ KAPALI (v1.689.0 — kullanıcı: "onay sistemini deaktif etmemiz lazım"): yetkisi olmayan işlem artık
// yönetici onayına düşmez; düğmesi hiç gösterilmez (kullanıcı kararı: "düğme gizlensin"). Eski davranış Tanımlar ›
// Kullanıcılar'dan geri açılabilir (`tanimlar.onaySistemiAcik`). Mevcut bekleyen onaylar silinmez, karara bağlanabilir.
function onaySistemiAcikMi(tanimlar) { return !!(tanimlar && tanimlar.onaySistemiAcik); }

// ================= FİŞ İPTALİ / "GERİ AL" YETKİSİ (v1.744.44) =================
// Kullanıcı kararı (27 Kasım): fiş iptali ve "Geri Al" silme yetkisi ister; kaydetme yetkisi buna GENİŞLETİLMEZ. Sunucu kuralı
// (`fis_iptal` / `fis_iptal_toplu` → `stk_yetki(array[…altı modül…], 'silme')`): bu ALTI modülden HERHANGİ birinde silme yeterli;
// giriş kapalıysa ya da kullanıcı Yönetici ise serbest. Liste sunucudakinin AYNISI olmalı — `tanimlar` gibi listede olmayan bir
// modülün silme yetkisi sayılmaz. Ekran sınamasında (personel akışları, P1) yalnız muhasebe / yalnız üretim hesabı "Sil" ve
// "Geri Al" düğmelerini görüyor, tıklayınca sunucudan 403 (42501) alıyordu: istemci ya tek modüle bakıyor ya hiç bakmıyordu.
// Kullanıcının GÜNCEL kaydı tanımlardan okunur (Yönetici silme kutusunu kapatınca düğmeler oturumdaki kullanıcıda hemen kaybolsun).
const FIS_IPTAL_MODULLERI = ["stok", "fisler", "siparis", "uretim", "cari", "muhasebe"];
function fisIptalYetkisi(tanimlar, aktifKullanici) {
  const guncel = (aktifKullanici && ((tanimlar && tanimlar.kullanicilar) || []).find((k) => k.id === aktifKullanici.id)) || aktifKullanici;
  return FIS_IPTAL_MODULLERI.some((modul) => yetkiVarMi(tanimlar, guncel, modul, "silme"));
}
// DÜĞME GİZLİ Mİ: yetki yoksa VE onay sistemi kapalıysa (varsayılan) iptal / Geri Al düğmesi hiç çizilmez (v1.689 "düğme gizlensin"
// kararı, `silmeGizli` deseni). Onay sistemi AÇIKKEN eski davranış aynen kalır — o akışın kendi "istek gönder" yolu var.
function fisIptalDugmesiGizli(tanimlar, aktifKullanici) {
  return !fisIptalYetkisi(tanimlar, aktifKullanici) && !onaySistemiAcikMi(tanimlar);
}
// Ekranlar prop zinciri kurmadan buradan okur (`window.__fiyatYetki` ile aynı desen; 100 her çizimde atar). Atanmamışsa (test, App
// dışı çizim) gizlenmez — karar zaten sunucuda.
function fisIptalGizliMi() { return typeof window !== "undefined" && window.__fisIptalGizli === true; }

// ================= FİYAT ALANI YETKİSİ (v1.744.42, inceleme 25 B3a-2) =================
// Kullanıcı kararı (27 Kasım): satış fiyatları ve müşterinin fiyat grubu → sipariş DÜZENLEME; alış fiyatı ve maliyet → muhasebe
// DÜZENLEME; müşterinin fiyat grubunu değiştirmek ayrıca cari DÜZENLEME. Stok personeli fiyatı değiştiremese de ürünün öteki alanlarını
// kaydeder. Sunucu (29-b3a2-uygula.sql) GERÇEK alan değişikliğini denetler; istemci aynı kuralı iki yerde uygular:
//   • fiyat kutuları yetkisizken kapalıdır (window.__fiyatYetki — 100 ayarlar);
//   • kayıt yolunda (saveStok / saveCariler) yetkisiz fiyat değişikliği ESKİ değerine döndürülür — bir ekran kutuyu kapatmayı unutsa da
//     kaydın tamamı sunucuda reddedilmesin, öteki alanlar yazılsın. Kullanıcıya ne olduğu söylenir.
function fiyatAlanYetkileri(tanimlar, aktifKullanici) {
  const guncel = (aktifKullanici && ((tanimlar && tanimlar.kullanicilar) || []).find((k) => k.id === aktifKullanici.id)) || aktifKullanici;
  const y = (modul, islem) => yetkiVarMi(tanimlar, guncel, modul, islem);
  return { satis: y("siparis", "duzenleme"), alis: y("muhasebe", "duzenleme"), cariFiyatGrubu: y("siparis", "duzenleme") && y("cari", "duzenleme") };
}
const fiyatKuraliAlisMi = (k) => !!k && (k.tip || "Satış") === "Alış";
const fiyatSayi = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
// Saf. Yetkisiz fiyat alanlarını eski değerine döndürür; değişiklik yoksa AYNI diziyi döndürür. `geriAlinan`: etkilenen ürün sayısı.
function fiyatDegisiklikleriniSuz(eskiListe, yeniListe, yetki) {
  if (!Array.isArray(yeniListe) || !yetki || (yetki.satis && yetki.alis)) return { liste: yeniListe, geriAlinan: 0, satis: 0, alis: 0 };
  const eski = new Map((eskiListe || []).map((u) => [u.id, u]));
  const ayni = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  let satis = 0, alis = 0;
  const liste = yeniListe.map((u) => {
    if (!u) return u;
    const e = eski.get(u.id);
    if (e === u) return u;
    let s = u;
    for (const [alisMi, izin] of [[false, yetki.satis], [true, yetki.alis]]) {
      if (izin) continue;
      const fA = alisMi ? "alisFiyati" : "satisFiyati", pA = alisMi ? "alisParaBirimi" : "satisParaBirimi";
      const kurallar = (x) => ((x && x.fiyatKurallari) || []).filter((k) => fiyatKuraliAlisMi(k) === alisMi);
      const degisti = e
        ? fiyatSayi(u[fA]) !== fiyatSayi(e[fA]) || (u[pA] || "") !== (e[pA] || "") || !ayni(kurallar(u), kurallar(e))
        : fiyatSayi(u[fA]) !== 0 || kurallar(u).length > 0;
      if (!degisti) continue;
      const oteki = ((s.fiyatKurallari) || []).filter((k) => fiyatKuraliAlisMi(k) !== alisMi);
      s = { ...s, [fA]: e ? e[fA] : 0, ...(e ? { [pA]: e[pA] } : {}), fiyatKurallari: [...oteki, ...kurallar(e)] };
      if (alisMi) alis += 1; else satis += 1;
    }
    return s;
  });
  return satis + alis === 0 ? { liste: yeniListe, geriAlinan: 0, satis: 0, alis: 0 } : { liste, geriAlinan: satis + alis, satis, alis };
}
// Saf. Yetkisizken müşterinin fiyat grubu değişikliği geri alınır (yeni caride boş kalır). Alan `fiyatGrubuId` (ek'te saklanır);
// eski kayıtlarda `fiyatGrubu` — ikisi de korunur.
function cariFiyatGrubuSuz(eskiListe, yeniListe, izinli) {
  if (izinli || !Array.isArray(yeniListe)) return { liste: yeniListe, geriAlinan: 0 };
  const eski = new Map((eskiListe || []).map((c) => [c.id, c]));
  let n = 0;
  const liste = yeniListe.map((c) => {
    if (!c) return c;
    const e = eski.get(c.id);
    if (e === c) return c;
    let s = c;
    for (const a of ["fiyatGrubuId", "fiyatGrubu"]) {
      if ((c[a] || "") === ((e && e[a]) || "")) continue;
      s = { ...s, [a]: e ? e[a] : "" };
    }
    if (s !== c) n += 1;
    return s;
  });
  return n === 0 ? { liste: yeniListe, geriAlinan: 0 } : { liste, geriAlinan: n };
}
