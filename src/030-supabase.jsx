// =============================================================================================
// SUPABASE BAĞLANTISI
//
// Aşağıdaki iki değeri Supabase panelinden alıp yapıştırın: Settings > API Keys
//   · Project URL      -> https://xxxxx.supabase.co
//   · Publishable key  -> sb_publishable_...
//
// Publishable anahtar GİZLİ DEĞİLDİR; tarayıcıda çalışan koda gömülmek üzere tasarlanmıştır.
// Güvenlik, anahtarı saklamakla değil, veritabanındaki satır seviyesi yetkiyle (RLS) sağlanır.
// SECRET anahtarı buraya ASLA yazmayın — o bütün güvenlik kurallarını atlar.
//
// Boş bırakılırsa uygulama eskisi gibi tarayıcı deposuyla çalışmaya devam eder; hiçbir şey bozulmaz.
//
// FİRMA BAĞLANTISI (v1.642.0 — kullanıcı: "Uygulamayı pazarlamak için nasıl yapmalıyım?" → "Başla"). Aynı uygulama
// birden çok firmaya satılacak; HER FİRMANIN AYRI Supabase projesi var (veri karışma riski sıfır, bir firmanın
// kuralı/yedeği ötekine dokunmaz). Hangi projeye bağlanılacağı CİHAZDA seçili firmadan (`firma:secim`) okunur;
// seçim yoksa uygulama AÇILMAZ, firma kodu sorulur (v1.643.0, kullanıcı: "benim kullandığım dahil herkeste istensin";
// kapı 100 AtolyeERP'de). VARSAYILAN_FIRMA yalnız iki yerde kalıyor: kapı kapalıyken sabitlerin bir değeri olsun diye
// ve "seçimsiz cihazın yerel verisi hangi projeye ait" sorusunun cevabı olarak (v1.642 öncesi hep ana proje — ilk
// seçimde aynı proje seçilirse veri taşınmaz, yerinde kalır). Seçim 032-firma'daki pencereden yapılır (firma kodu ya da adres + anahtar) ve sayfa yeniden yüklenir:
// bağlantı açılışta BİR KEZ çözülür ve sabittir — çalışırken başka projeye kaymak bellekteki veriyi öteki firmaya
// yazdırabilirdi.
// Bu bölüm 030'un başında ve yalnız düz fonksiyon + sabit kullanıyor: SUPABASE_URL dosya yüklenirken hesaplanıyor,
// sonraki dosyalardaki `const`lar o an henüz tanımlı değil.
const VARSAYILAN_FIRMA = Object.freeze({
  kod: "",
  url: "https://mqdgucoomgqcvhvgixbl.supabase.co",
  anahtar: "sb_publishable_MKOjcTQ8Dod9Ofh-P-V-uA_3kKm_Ei2",
});
const FIRMA_SECIM_ANAHTARI = "firma:secim";

// Supabase proje adresi: yalnız https://<ref>.supabase.co. Serbest adres kabul edilmez — kullanıcıyı sahte bir
// sunucuya yönlendirip şifresini oraya yazdırmak (oltalama) bir bağlantıyla mümkün olurdu.
function firmaAdresiGecerli(url) {
  return /^https:\/\/[a-z0-9]{8,40}\.supabase\.co$/.test(String(url || ""));
}
// Anahtar: yalnız AÇIK (publishable / eski "anon" JWT) anahtar. SECRET anahtar (sb_secret_ ya da service_role JWT)
// bütün güvenlik kurallarını atlar — biri yanlışlıkla yapıştırırsa cihaza kaydedilmeden REDDEDİLİR. Sonuç: null =
// geçerli, metin = ret sebebi.
function firmaAnahtariSorunu(anahtar) {
  const a = String(anahtar || "").trim();
  if (!a) return "Anahtar boş";
  if (/^sb_secret_/i.test(a)) return "Bu GİZLİ (secret) anahtar — asla kullanılmaz. Supabase > Settings > API Keys'teki Publishable anahtarı girin.";
  if (/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(a)) return null;
  const parca = a.split(".");
  if (parca.length === 3) {
    try {
      const yuk = JSON.parse(atob(parca[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (yuk && yuk.role === "anon") return null;
      if (yuk && yuk.role === "service_role") return "Bu service_role (gizli) anahtar — asla kullanılmaz. anon / publishable anahtarı girin.";
    } catch (e) { /* çözülemeyen JWT: aşağıda reddedilir */ }
  }
  return "Anahtar tanınmadı — Supabase > Settings > API Keys'teki Publishable anahtarı (sb_publishable_…) girin.";
}
function firmaBaglantisiGecerli(f) {
  return !!(f && firmaAdresiGecerli(f.url) && !firmaAnahtariSorunu(f.anahtar));
}
// Cihazdaki seçim; bozuk ya da geçersizse yok sayılır (varsayılana düşer — sessizce yanlış projeye değil).
function firmaSecimiOku() {
  try {
    const h = typeof localStorage !== "undefined" && localStorage ? localStorage.getItem(FIRMA_SECIM_ANAHTARI) : null;
    const f = h ? JSON.parse(h) : null;
    // DEMO FİRMA (v1.645.0, 034): bulut YOK — adres/anahtar boş, `supabaseAcikMi()` false, uygulama yalnız bu
    // cihazın kendi (firma başına ayrı) yerel deposuyla çalışır. Gerçek veri değil; örnek veri 034'te yüklenir.
    if (f && f.demo === true) return { kod: "demo", demo: true, url: "", anahtar: "", ad: "" };
    return firmaBaglantisiGecerli(f) ? { kod: String(f.kod || ""), url: f.url, anahtar: String(f.anahtar).trim(), ad: f.ad || "" } : null;
  } catch (e) { return null; }
}
const AKTIF_FIRMA = firmaSecimiOku() || VARSAYILAN_FIRMA;
const SUPABASE_URL = AKTIF_FIRMA.url;
const SUPABASE_ANAHTAR = AKTIF_FIRMA.anahtar;

const supabaseAcikMi = () => !!(SUPABASE_URL && SUPABASE_ANAHTAR);

// =============================================================================================
// KİMLİK DOĞRULAMA
//
// SORUN: publishable anahtar HTML'in içinde ve RLS `anon` rolüne tam yetki veriyor. Yani dosyayı
// eline geçiren herkes — e-postayla gönderilmiş, USB'de taşınmış ya da sayfa kaynağını açmış —
// veritabanının tamamını dünyanın herhangi bir yerinden okuyup yazabilir. Atölye ağında bu kabul
// edilebilirdi; uzaktan erişim açılacaksa edilemez.
//
// Ayrıca uygulamanın kendi giriş ekranı GÖRSEL bir kontroldü: şifreyi tarayıcı karşılaştırıyordu
// ve şifreler `tanimlar.kullanicilar[].sifre` alanında DÜZ METİN olarak buluta gidiyordu.
//
// ÇÖZÜM: Supabase Auth. Kullanıcı giriş yapınca sunucudan süreli bir jeton alıyor; bütün istekler
// artık o jetonla imzalanıyor. Şifre sunucuda doğrulanıyor, tarayıcıya hiç inmiyor.
//
// İKİ AŞAMALI AÇILIŞ — bilerek:
//   1. AŞAMA (bu sürüm): uygulama jeton kullanmaya başlar, RLS'e DOKUNULMAZ. Bir şey ters giderse
//      anon yolu hâlâ açık olduğu için atölye durmaz.
//   2. AŞAMA (rls-kimlik.sql): birinci aşamanın beş bilgisayarda da çalıştığı doğrulandıktan
//      SONRA anon yetkisi kaldırılır. Bu sırayı bozmak, tek bir hatada beş bilgisayarı birden
//      veritabanından koparır.
let _oturum = null;              // { erisim, yenileme, sonaErme, email }
let _yenilemeIslemi = null;      // paralel isteklerin paylaştığı tek yenileme sözü
const OTURUM_ANAHTARI = "atolye:oturum";

function oturumOku() {
  try { const h = localStorage.getItem(OTURUM_ANAHTARI); return h ? JSON.parse(h) : null; }
  catch (e) { return null; }
}
function oturumYaz(o) {
  _oturum = o;
  _oturumOkundu = true;
  try {
    if (o) localStorage.setItem(OTURUM_ANAHTARI, JSON.stringify(o));
    else localStorage.removeItem(OTURUM_ANAHTARI);
  } catch (e) { /* depo dolu ya da kapalı: oturum bellekte yaşamaya devam eder */ }
}
// KAYITLI OTURUM İLK İSTEKTE OKUNUR (v1.609.0 — kullanıcı: "ilk açılışta 'buluta yazılamadı: muhasebe' yapıyor, sonra
// gidiyor"): `oturumBaslat` yükleme akışının ortasında çağrılıyor; açılışta ondan ÖNCE koşan yazmalar (döviz kuru
// güncellemesi muhasebeyi hemen yazıyor) `_oturum` boşken anonim gidip 401/42501 alıyordu. Jeton isteyen her yer
// (`gecerliJeton`) oturum hiç okunmadıysa önce depodan okur; çıkış (`oturumYaz(null)`) "okundu" sayılır ki eski
// oturum geri gelmesin.
let _oturumOkundu = false;
function oturumBaslat() { _oturum = oturumOku(); _oturumOkundu = true; return _oturum; }

// Kullanıcı adından e-posta türetir. Supabase Auth e-posta istiyor ama atölyede kimsenin
// kurumsal adresi yok; `@atolye.local` gerçek posta kutusu değil, yalnızca tekil bir kimlik.
// Türkçe harfler ASCII'ye indiriliyor: e-posta alanı onları kabul etmiyor.
function kullaniciEposta(k) {
  if (k && k.eposta) return k.eposta;
  const harita = { "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u" };
  // SIRA ÖNEMLİ: önce küçült, sonra eşle. Ters sırada büyük Ş/Ç/Ğ/Ö/Ü eşlemeye takılmıyor,
  // küçültüldükten sonra da ASCII süzgecinde siliniyordu: "Şükrü Çağ" -> "ukruag" oluyordu.
  // İki farklı kullanıcı aynı e-postaya düşebilirdi.
  const sade = String((k && k.kullaniciAdi) || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (h) => harita[h] || h)
    .replace(/[^a-z0-9._-]/g, "");
  return `${sade}@atolye.local`;
}

async function authIstek(yol, govde) {
  const yanit = await fetch(`${SUPABASE_URL}/auth/v1/${yol}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANAHTAR, "Content-Type": "application/json" },
    body: JSON.stringify(govde),
  });
  const veri = await yanit.json().catch(() => null);
  if (!yanit.ok) {
    throw new Error((veri && (veri.error_description || veri.msg || veri.message)) || `HTTP ${yanit.status}`);
  }
  return veri;
}

function oturumKur(veri, email) {
  oturumYaz({
    erisim: veri.access_token,
    yenileme: veri.refresh_token,
    // 60 saniye pay bırakılıyor: jeton tam istek yolda iken dolarsa gereksiz 401 yenir.
    sonaErme: Date.now() + Math.max(0, (veri.expires_in || 3600) - 60) * 1000,
    email: email || (veri.user && veri.user.email) || "",
  });
}

async function supabaseGiris(email, sifre) {
  const veri = await authIstek("token?grant_type=password", { email, password: sifre });
  oturumKur(veri, email);
  return _oturum;
}

function supabaseCikis() { oturumYaz(null); }

// ---- SÜRÜM DUYURUSU (kullanıcı, 14 Eylül: "her defasında ayrı HTML geliyor, tek tek atmak
// zorundayız; son uygulamada güncel sürüm eklense, içeri giren günceli indirse") ----------------
//
// Yayınlanan sürüm bilgisi buluttaki `surum` tablosunda tek satır olarak duruyor:
//   { surum: "1.279.0", url: "…", not: "…", zaman: ISO }
// Yönetici yeni HTML'i bir yere (Supabase Storage, Drive, şirket sitesi — fark etmez) yükleyip
// Tanımlar'dan bu üç alanı yazıyor. Herkesin uygulaması açılışta okuyup KENDİ sürümüyle
// karşılaştırıyor; yenisi varsa üstte bir şerit ve indirme bağlantısı çıkıyor. Kimseye dosya
// göndermek gerekmiyor.
//
// Okuma anahtarla yapılıyor (giriş gerekmez): sürüm bilgisi gizli değil ve giriş ekranından önce
// de görünmeli — eski sürümle girilemeyen bir durumda güncelleme yolunu göstermek gerekiyor.
async function yayinlananSurumuOku() {
  if (!supabaseAcikMi()) return null;
  try {
    const satirlar = await supabaseTumSatirlar("surum");
    return (satirlar[0] && satirlar[0].veri) || null;
  } catch (e) {
    return null;   // tablo yoksa ya da ağ yoksa: sessiz — güncelleme şeridi çıkmaz
  }
}

// YAYINDAKİ SÜRÜM DOSYASI (25 Eylül, v1.447.0). Yayın artık GitHub'da birleştirmeyle yapılıyor ve
// buluttaki `surum` kaydı güncellenmiyor; başlatıcının (index.html) okuduğu `surum.json` ise her
// yayında güncel. Uygulama da aynı dosyayı, KENDİ KLASÖRÜNDEN okuyor. Yalnız http(s)'te: dosyadan
// (file://) açılmışsa göreli adres okunamaz, sessizce null.
async function yayinlananSurumuDosyadanOku() {
  if (typeof location === "undefined" || !/^https?:$/.test(location.protocol)) return null;
  try {
    const y = await fetch(new URL("surum.json", location.href).href + "?t=" + Date.now(), { cache: "no-store" });
    if (!y.ok) return null;
    const v = await y.json();
    return v && v.surum && v.url ? v : null;
  } catch (e) {
    return null;
  }
}

// İKİ KAYNAKTAN YENİ OLANI: surum.json (GitHub yayını) ve buluttaki kayıt (eski "GitHub'a yayınla"
// yolu). Hangisi daha yeni sürümü söylüyorsa o geçerli; biri okunamazsa diğeri.
async function guncelSurumuOku() {
  const [dosya, bulut] = await Promise.all([yayinlananSurumuDosyadanOku(), yayinlananSurumuOku()]);
  if (dosya && bulut) return surumDahaYeniMi(bulut.surum, dosya.surum) ? bulut : dosya;
  return dosya || bulut;
}

// OTOMATİK GEÇİŞ — kullanıcı (25 Eylül): "Yeni sürüm haber versin ve ona geçiş yapsın. Uygulama
// olarak girdikleri için eski sürüm çıkabilir veya otomatik geçsin."
// Geçiş yalnız http(s)'te ve yayındaki sürüm bizimkinden YENİYSE. DÖNGÜ KORUMASI: aynı sürüme bu
// sekmede bir kez geçiliyor (sessionStorage). Yayın yanlış kurulmuşsa (surum.json 1.447 der ama
// dosya içeride eski sürümse) sayfa kendini sonsuza kadar yenilemez; şerit çıkar, gerisi kullanıcıda.
function surumeOtomatikGec(v, mevcutSurum) {
  if (!v || !v.url || !surumDahaYeniMi(v.surum, mevcutSurum)) return false;
  if (typeof location === "undefined" || !/^https?:$/.test(location.protocol)) return false;
  const anahtar = "surumGecisi:" + v.surum;
  try {
    if (window.sessionStorage.getItem(anahtar)) return false;
    window.sessionStorage.setItem(anahtar, "1");
  } catch (e) {
    return false;   // koruma kaydı yazılamıyorsa geçiş de yok — döngü riski alınmıyor
  }
  location.replace(v.url);   // `replace`: geri tuşu eski sürüme dönmesin
  return true;
}

// "1.279.0" > "1.278.0" — sayı sayı karşılaştırma. Metin karşılaştırması "1.9" ile "1.10"u ters
// sıralardı; sürüm numaraları ikinci haneyi geçtiğinde bu kesin bir hata olurdu.
function surumDahaYeniMi(aday, mevcut) {
  const par = (v) => String(v || "").split(".").map((x) => parseInt(x, 10) || 0);
  const a = par(aday), b = par(mevcut);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}

// ---- E-POSTA GÖNDERİMİ (Supabase fonksiyonu `eposta`, bkz. supabase-eposta-fonksiyonu.ts) ----
// PDF base64 olarak gidiyor; SMTP ayarlarını fonksiyon Tanımlar'dan okuyor (şifre ağdan geçmez).
async function epostaGonder({ kime, konu, metin, dosyaAdi, pdfBase64 }) {
  if (!supabaseAcikMi()) return { tamam: false, hata: "Supabase bağlantısı tanımlı değil" };
  const jeton = await gecerliJeton();
  if (!jeton) return { tamam: false, hata: "Bulut oturumu yok — e-posta için bulut kimliğiyle giriş yapılmalı" };
  let yanit;
  try {
    yanit = await fetch(`${SUPABASE_URL}/functions/v1/eposta`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANAHTAR, Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
      body: JSON.stringify({ kime, konu, metin, dosyaAdi, pdfBase64 }),
    });
  } catch (e) {
    return { tamam: false, hata: "Fonksiyona ulaşılamadı: " + bulutGirisSebebi(e) };
  }
  if (yanit.status === 404) return { tamam: false, hata: "Supabase'de `eposta` fonksiyonu kurulu değil (bkz. supabase-eposta-fonksiyonu.ts)" };
  const metinY = await yanit.text().catch(() => "");
  let veri = null; try { veri = JSON.parse(metinY); } catch (e) { /* */ }
  if (veri && veri.tamam) return veri;
  if (veri && veri.hata) return { tamam: false, hata: veri.hata };
  if (/hello/i.test(metinY) && /message/i.test(metinY)) return { tamam: false, hata: "`eposta` fonksiyonu ŞABLON kodla çalışıyor — dosya yapıştırılıp Deploy edilmemiş." };
  return { tamam: false, hata: `Fonksiyon beklenmeyen yanıt verdi (HTTP ${yanit.status}): ${metinY.slice(0, 200) || "(boş)"}` };
}

// ---- BULUT KULLANICI İŞLEMLERİ (Supabase fonksiyonu `kullanici`, bkz. supabase-kullanici-fonksiyonu.ts)
//
// Kullanıcı (11 Eylül): "Supabase'e girmeden uygulamadan Supabase kullanıcısı yazamaz mıyız?"
// Hesap açmak gizli anahtar ister; anahtar HTML'e giremez (iki kez yapılan hata). İş, Supabase
// sunucusunda çalışan fonksiyona devredildi: uygulama OTURUM JETONUYLA çağırır, fonksiyon çağıranın
// Tanımlar'da Yönetici olduğunu doğrular, sonra hesabı açar / şifre değiştirir / siler.
//
// Oturum yoksa (yerel giriş) hiç çağrılmıyor: fonksiyon zaten 401 döner. Hata mesajı OLDUĞU GİBİ
// çağırana dönüyor (7z-45 dersi: sebep görünmezse panelde ne düzeltileceği bilinmez).
async function bulutKullaniciIslemi(islem, eposta, sifre) {
  if (!supabaseAcikMi()) return { tamam: false, hata: "Supabase bağlantısı tanımlı değil" };
  const jeton = await gecerliJeton();
  if (!jeton) return { tamam: false, hata: "Bulut oturumu yok — bu işlem için bulut kimliğiyle giriş yapılmalı" };
  let yanit;
  try {
    yanit = await fetch(`${SUPABASE_URL}/functions/v1/kullanici`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANAHTAR, Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
      body: JSON.stringify({ islem, eposta, sifre: sifre || undefined }),
    });
  } catch (e) {
    return { tamam: false, hata: "Fonksiyona ulaşılamadı: " + bulutGirisSebebi(e) };
  }
  if (yanit.status === 404) {
    return { tamam: false, hata: "Supabase'de `kullanici` fonksiyonu kurulu değil (bkz. supabase-kullanici-fonksiyonu.ts)" };
  }
  const metin = await yanit.text().catch(() => "");
  let veri = null; try { veri = JSON.parse(metin); } catch (e) { /* JSON değil */ }
  if (veri && veri.tamam) return veri;
  if (veri && veri.hata) return { tamam: false, hata: veri.hata };
  // BEKLENMEYEN GÖVDE OLDUĞU GİBİ GÖSTERİLİYOR (kullanıcı, 12 Eylül: "Bulut hesabı açılamadı: HTTP
  // 200" — 200 ama `tamam` yok; sebep görünmeyince ne düzeltileceği bilinmez). En sık sebep:
  // panelde fonksiyon açılmış ama dosya yapıştırılmamış, Supabase'in "Hello" şablonu çalışıyor.
  if (/hello/i.test(metin) && /message/i.test(metin)) {
    return { tamam: false, hata: "Supabase'deki `kullanici` fonksiyonu ŞABLON kodla çalışıyor — dosya içeriği (supabase-kullanici-fonksiyonu.ts) yapıştırılıp Deploy edilmemiş." };
  }
  return { tamam: false, hata: `Fonksiyon beklenmeyen yanıt verdi (HTTP ${yanit.status}): ${metin.slice(0, 200) || "(boş)"}` };
}

// BULUT GİRİŞİ NEDEN OLMADI — kullanıcının okuyabileceği dille.
//
// Kullanıcı (11 Eylül): "Kullanıcı açtım ama yerel bağlantı diyor yine." Supabase'de hesap açılmıştı
// ama giriş yerel şifreye düşüyordu ve SEBEP hiçbir yerde görünmüyordu: hata yalnız konsola
// yazılıyor, ekranda "bu kullanıcının bulut hesabı yok" deniyordu — hesap VARKEN. Telefonda konsol
// da yok. Sebep görünmeden panelde neyin düzeltileceği tahmin edilemezdi.
//
// Supabase'in İngilizce mesajı eşleniyor; tanınmayan mesaj OLDUĞU GİBİ gösteriliyor (yutulmuyor).
function bulutGirisSebebi(hata) {
  const ham = String((hata && hata.message) || hata || "").trim();
  if (/invalid login credentials/i.test(ham)) {
    return "Kullanıcı adı ya da şifre hatalı (Supabase reddetti). Şifre Tanımlar > Kullanıcılar'dan yeniden verilebilir.";
  }
  if (/email not confirmed/i.test(ham)) {
    return "Bulut hesabı onaylanmamış. Supabase > Authentication > Users'da kullanıcıyı onaylayın (Confirm).";
  }
  if (/logins? are disabled|provider is disabled|email provider/i.test(ham)) {
    return "Supabase'de e-postayla giriş kapalı. Authentication > Sign In / Providers > Email açılmalı.";
  }
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(ham)) {
    return "Supabase'e ulaşılamadı (bağlantı yok ya da engelli).";
  }
  return ham || "Bilinmeyen hata";
}

async function jetonTazele() {
  if (!_oturum || !_oturum.yenileme) return null;
  // ÖTEKİ SEKME YENİLEMİŞSE ONUN OTURUMU (v1.640.0, denetim): aynı tarayıcıda iki sekme açıkken her sekme bellekteki
  // kendi yenileme jetonuyla yeniliyordu; Supabase yenileme jetonunu döndürdüğü için ikinci sekmenin eski jetonu
  // reddediliyor ("already used") ve `oturumYaz(null)` ORTAK anahtarı silip iki sekmeyi de düşürüyordu. Depodaki kayıt
  // daha yeniyse önce o alınır; erişim jetonu hâlâ geçerliyse yenilemeye hiç gidilmez.
  const kayitli = oturumOku();
  if (kayitli && kayitli.yenileme && kayitli.yenileme !== _oturum.yenileme && (kayitli.sonaErme || 0) >= (_oturum.sonaErme || 0)) {
    _oturum = kayitli;
    if ((kayitli.sonaErme || 0) > Date.now() + 30000) return _oturum;
  }
  // Açılışta on tablo aynı anda çekiliyor. Her biri ayrı yenileme başlatsaydı, ilk dönen
  // yenileme jetonu diğerlerini geçersiz kılar ve oturum kendi kendini düşürürdü.
  if (!_yenilemeIslemi) {
    _yenilemeIslemi = authIstek("token?grant_type=refresh_token", { refresh_token: _oturum.yenileme })
      .then((veri) => { oturumKur(veri, _oturum && _oturum.email); return _oturum; })
      .catch((e) => {
        // GEÇİCİ HATA OTURUMU DÜŞÜRMEZ (v1.609.0 — kullanıcı: "ilk açılışta 'buluta yazılamadı' yapıyor, sonra gidiyor"):
        // bilgisayar uykudan dönerken / Wi-Fi bağlanırken yenileme isteği ağa çıkamıyor (Failed to fetch) ya da sunucu
        // 5xx veriyordu; oturum siliniyor, o anki yazma anonim gidip 42501 alıyordu. Yenileme jetonu aslında geçerli.
        // Artık yalnız Supabase'in AÇIKÇA reddettiği (400/401, invalid grant) yenileme oturumu düşürür; geçici hatada
        // oturum durur, bu istek jetonsuz gider ve bir sonraki istek yenilemeyi yeniden dener (dakikalık otomatik
        // yeniden gönderim bekleyen kaydı götürür).
        const ham = String((e && e.message) || e || "");
        // 429 (hız sınırı) da geçicidir (v1.640.0).
        if (/failed to fetch|networkerror|load failed|network request failed|HTTP 5\d\d|HTTP 429|too many|timeout/i.test(ham)) {
          console.warn("Jeton yenilenemedi (geçici), oturum korunuyor:", ham);
          return null;
        }
        console.warn("Jeton yenilenemedi, oturum düştü:", e);
        oturumYaz(null);
        // OTURUM DÜŞTÜ BİLDİRİMİ (kullanıcı, 21 Eylül: "hiç işlem yapılmadı kasada" — ekranda
        // 42501/anon hatası). Jeton yenilenemeyince oturum sessizce siliniyor ve sonraki her
        // yazma ANONİM gidip reddediliyordu; kullanıcı ancak kırmızı şeritte ham hatayı görünce
        // fark ediyordu. Artık uygulama hemen haberdar ediliyor ve yeniden giriş istiyor.
        try { if (typeof _oturumDustuDinleyici === "function") _oturumDustuDinleyici(); } catch (x) { /* yut */ }
        return null;
      })
      .then((sonuc) => { _yenilemeIslemi = null; return sonuc; });
  }
  return _yenilemeIslemi;
}

let _oturumDustuDinleyici = null;
function oturumDustuDinle(fn) { _oturumDustuDinleyici = fn; }
function oturumVarMi() { if (!_oturum && !_oturumOkundu) oturumBaslat(); return !!_oturum; }

async function gecerliJeton() {
  if (!_oturum && !_oturumOkundu) oturumBaslat();
  if (!_oturum) return null;
  if (Date.now() >= _oturum.sonaErme) { const y = await jetonTazele(); return y ? y.erisim : null; }
  return _oturum.erisim;
}

// Oturum varsa jetonla, yoksa anon anahtarla imzalanır. İkinci aşamada anon yetkisi kalkınca
// jetonsuz istekler kendiliğinden reddedilmeye başlar — kod değişikliği gerekmez.
async function yetkiBasliklari() {
  const jeton = await gecerliJeton();
  return { apikey: SUPABASE_ANAHTAR, Authorization: `Bearer ${jeton || SUPABASE_ANAHTAR}` };
}

// Supabase REST çağrısı. supabase-js kütüphanesi yerine doğrudan REST kullanılıyor: tek ihtiyacımız
// upsert ve delete, bunun için 300 KB'lık bir kütüphane eklemek gereksiz.
// BAĞLANTI DURUMU (v1.556.1 — kullanıcı: "İnternet olmayınca uygulama çalışmayı durdursun. Kökten çözüm").
// Her bulut isteği sonucu bildirir: istek ağa hiç çıkamadıysa (fetch reddedildi) bağlantı YOK; herhangi bir
// HTTP cevabı geldiyse (401/500 dahil) internet VAR. App (`__baglantiDegisti`) yokken ekranı kilitler — internetsiz
// girilen işin buluta gitmeyip kaybolması (v1.556.0 "Jut") en baştan engellensin.
let _baglantiVar = true;
function baglantiBildir(varMi, sebep) {
  if (_baglantiVar === varMi) return;
  _baglantiVar = varMi;
  if (varMi && typeof tanimlarBayatla === "function") tanimlarBayatla("bağlantı geri geldi");
  if (typeof window !== "undefined" && window.__baglantiDegisti) window.__baglantiDegisti(varMi, sebep || "");
}
// Hafif yoklama: herhangi bir HTTP cevabı = internet var. Önbellek kapalı (eski cevap "var" demesin).
async function baglantiSina() {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/surum?select=surum&limit=1`, { headers: { apikey: SUPABASE_ANAHTAR }, cache: "no-store" });
    baglantiBildir(true);
    return true;
  } catch (e) {
    baglantiBildir(false, String((e && e.message) || e));
    return false;
  }
}

// AĞ HATASINDA YENİDEN DENEME (v1.724.1 — kullanıcı, telefonda 305 renk dönüştürürken: "Failed to fetch"). `fetch`in
// kendisi atarsa (cevap yok: bağlantı koptu, zaman aşımı) istek kısa aralıklarla 3 kez daha denenir. HTTP hatası (4xx/5xx)
// denenmez. Yazmalar bu yinelemeye dayanıklı: POST merge-duplicates ve DELETE aynı sonucu verir; sürüm koşullu PATCH ilk
// seferde yere inmişse ikinci deneme 0 satır döner, bunu 040'taki teşhis "sunucu bir fazla → sahte çakışma" olarak çözer.
const SUPABASE_YENIDEN_DENEME_MS = [700, 1500, 3000];

// ================= YAZMA KAPISI (v1.744.16) =================
// Kullanıcı (11 Kasım, günlük: 20:19 "Bilinmeyen — Tanımlar bulutla birleştirildi: başka cihazda eklenen 81 öğe korundu"):
// giriş ekranında sabahtan bekleyen bir cihaz, akşam bağlantı gelince sabahki tanım kopyasıyla kendiliğinden yazdı; bugün
// açılmış 81 öğeyi yalnız birleştirme kurtardı. Kurallar (kullanıcı kararı):
//   · OTURUM KAPALIYKEN sunucuya YAZMA YOK — otomatik yazma da, bekleyen kayıtların yeniden gönderilmesi de. Kuyrukta
//     beklerken oturum kapanırsa gönderim de durur: kapı her isteğin GÖNDERİLDİĞİ anda sorulur, kuyruğa girdiği anda değil.
//   · EKSİK YÜKLEME KİLİDİ (VERI_KILIDI, 060) sunucuya giden yazmayı da durdurur (eskiden yalnız yerel yazmayı durduruyordu).
// Oturum: App bildirir (`yazmaOturumuAyarla`): giriş sistemi açıkken kullanıcı girmiş ve bulut oturumu düşmemişse "acik";
// giriş sistemi kapalı kurulumda (girişsiz çalışma) "acik"; giriş ekranında / çıkışta / oturum düşünce "kapali". Açılış
// yüklemesi sürerken "bilinmiyor": yalnız kayıtlı bir bulut oturumu (jeton) varsa yazılır.
// Kapıdan MUAF: günlük kaydı (POST gunluk — engellenen işin izi de oraya düşer) ve salt-okur sunucu işlevleri.
let _yazmaOturumu = "bilinmiyor";
function yazmaOturumuAyarla(durum) { _yazmaOturumu = durum === "acik" || durum === "kapali" ? durum : "bilinmiyor"; }
function yazmaOturumuDurumu() { return _yazmaOturumu; }
// GİRİŞ DURUMU İPUCU (090 açılış): tanımlar okununca bildirilir. Girişsiz çalışan firmada (girisAktifMi=false) kimse giriş
// yapmaz, bulut jetonu da olmaz — açılıştaki göç yazmaları (App henüz "acik" demeden) "oturum kapalı" sanılmasın.
let _girisAktifIpucu = null;
function yazmaGirisDurumuBildir(girisAktif) { _girisAktifIpucu = !!girisAktif; }
function yazmaGirisIpucu() { return _girisAktifIpucu; }
function yazmaOturumuAcikMi() {
  return _yazmaOturumu === "acik" || (_yazmaOturumu === "bilinmiyor" && (oturumVarMi() || _girisAktifIpucu === false));
}
const YAZMA_KAPISI_MUAF_RPC = /^rpc\/(?:site_hesap_bilgi|site_kayit_listesi|site_raporu|kurulum_betigi)(?:\?|$)/;
function yazmaKapisiMuafMi(yol, yontem) {
  if (YAZMA_KAPISI_MUAF_RPC.test(String(yol))) return true;
  return /^POST$/i.test(yontem) && /^gunluk(?:\?|$)/.test(String(yol));
}
// Engel yoksa null; varsa { kod, mesaj }. kod: "eksik-yukleme" | "oturum-kapali".
function bulutYazmaEngeli() {
  if (typeof VERI_KILIDI !== "undefined" && VERI_KILIDI.aktif) {
    return { kod: "eksik-yukleme", mesaj: "Veriler eksik yüklendi — sunucuya yazma kapalı (sayfayı yenileyin)" };
  }
  if (!yazmaOturumuAcikMi()) return { kod: "oturum-kapali", mesaj: "Oturum kapalı — sunucuya yazılmadı (giriş yapınca gönderilir)" };
  return null;
}

// ================= TANIM TAZELİĞİ (v1.744.16) =================
// Otomatik tanım yazmadan önce (100 `otomatikTanimYaz`) bu cihazın tanımları güncel mi? Son sunucu okumasından sonra
// bağlantı geri geldiyse ya da sekme UZUN süre arka planda kaldıysa (yoklama o sırada durur) ya da son okuma 5 dk'dan eskiyse
// BAYAT: önce sunucudan okunur, okunamazsa yazılmaz. Okuma: açılış (045), değişiklik yoklaması (100), tanım yazmasının
// birleştirme okuması (aşağıda), tazeleme (100 `tanimlariTazele`).
const TANIM_TAZE_MS = 5 * 60 * 1000;
// Sıra numarası (`sira`) zaman damgası yerine: bayatlatma ile okuma AYNI milisaniyeye düşerse (bağlantı gelir gelmez okuma) damga
// eşitliği "bayat" sanıyordu; sıra hangisinin sonra olduğunu kesin söyler.
const _tanimTazelik = { okuma: 0, okumaSira: 0, bayatSira: 0, sira: 0, sebep: "", gizlendi: 0 };
function tanimlarOkundu() { _tanimTazelik.okuma = Date.now(); _tanimTazelik.okumaSira = ++_tanimTazelik.sira; }
function tanimlarBayatla(sebep) {
  _tanimTazelik.bayatSira = ++_tanimTazelik.sira; _tanimTazelik.sebep = sebep || "";
  // App dinler (100 `tanimBayatDalgasi`): okuyamadığı için vazgeçmiş otomatik tanım yazmaları bağlantı gelince / uzun beklemeden
  // dönünce yeniden denensin (önce tazeleyerek).
  try { if (typeof window !== "undefined" && window.dispatchEvent && typeof Event === "function") window.dispatchEvent(new Event("atolye:tanim-bayat")); } catch (e) { /* */ }
}
function tanimlarTazeMi() {
  const o = _tanimTazelik.okuma;
  return o > 0 && _tanimTazelik.okumaSira > _tanimTazelik.bayatSira && Date.now() - o < TANIM_TAZE_MS;
}
function tanimBayatlikSebebi() {
  if (!_tanimTazelik.okuma) return "hiç okunmadı";
  if (_tanimTazelik.bayatSira > _tanimTazelik.okumaSira) return _tanimTazelik.sebep || "bayat";
  return Date.now() - _tanimTazelik.okuma >= TANIM_TAZE_MS ? "son okuma 5 dakikadan eski" : "";
}
// Uzun bekleme eşiği (sınamalar `window.__uzunBeklemeMs` ile kısaltır).
const UZUN_BEKLEME_MS = 60 * 1000;
if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("online", () => tanimlarBayatla("bağlantı geri geldi"));
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { _tanimTazelik.gizlendi = Date.now(); return; }
      const esik = typeof window.__uzunBeklemeMs === "number" ? window.__uzunBeklemeMs : UZUN_BEKLEME_MS;
      if (_tanimTazelik.gizlendi && Date.now() - _tanimTazelik.gizlendi >= esik) tanimlarBayatla("uzun süre arka planda kaldı");
      _tanimTazelik.gizlendi = 0;
    });
  }
}

async function supabaseIstek(yol, secenekler = {}, tekrarMi = false, islemDenemesi = 0) {
  // YAZMA KAPISI (yukarıda): gönderilecek yazma bu anda sorulur — kuyrukta beklerken oturum kapandıysa burada durur.
  const yontem = String(secenekler.method || "GET").toUpperCase();
  if (/^(POST|PATCH|DELETE|PUT)$/.test(yontem) && !yazmaKapisiMuafMi(yol, yontem)) {
    const engel = bulutYazmaEngeli();
    if (engel) {
      const e = new Error(`${engel.mesaj} — ${yontem} ${String(yol).split("?")[0]}`);
      e.yazmaKapisi = engel.kod;
      throw e;
    }
  }
  let yanit;
  for (let deneme = 0; ; deneme++) {
    try {
      yanit = await fetch(`${SUPABASE_URL}/rest/v1/${yol}`, {
        ...secenekler,
        headers: {
          ...(await yetkiBasliklari()),
          "Content-Type": "application/json",
          "x-atolye-surum": SURUM,
          ...(secenekler.headers || {}),
        },
      });
      break;
    } catch (e) {
      // Tarayıcı "çevrimdışı" diyorsa beklemenin anlamı yok: kilit (v1.557) hemen insin. Testler `window.__supabaseYenidenDenemeMs`
      // ile aralıkları kısaltır (davranış aynı, bekleme yok).
      const aralar = (typeof window !== "undefined" && Array.isArray(window.__supabaseYenidenDenemeMs)) ? window.__supabaseYenidenDenemeMs : SUPABASE_YENIDEN_DENEME_MS;
      const cevrimdisi = typeof navigator !== "undefined" && navigator.onLine === false;
      // YALNIZ YAZMALAR denenir: okumalar (açılış yüklemesi, yoklamalar) hemen düşsün ki bulut yokken yerel kopyaya geçiş ve
      // çevrimdışı kilit gecikmesin — 15 okuma × 5 sn beklemek açılışı dakikaya çıkarırdı.
      const yazma = /^(POST|PATCH|DELETE|PUT)$/i.test(String(secenekler.method || "GET"));
      if (yazma && !cevrimdisi && deneme < aralar.length) {
        await new Promise((r) => setTimeout(r, aralar[deneme]));
        continue;
      }
      baglantiBildir(false, String((e && e.message) || e));
      // HANGİ İSTEK DÜŞTÜ (v1.725.1 — kullanıcı, telefonda 5 denemede de "Failed to fetch"). Tarayıcı, sunucunun CORS
      // başlıksız döndüğü hatayı (gövde çok büyük, adres çok uzun, ağ geçidi reddi) da "Failed to fetch" diye verir; mesaj
      // hangi tablonun, ne boyutta isteğin düştüğünü söylemiyordu. Asıl metin başta kalır (bağlantı yok sınıflandırması
      // `bulutHatasiAciklamasi` ona bakıyor), istek özeti eklenir.
      const govdeBoyu = typeof secenekler.body === "string" ? secenekler.body.length : 0;
      const ozet = `${String(secenekler.method || "GET").toUpperCase()} ${String(yol).split("?")[0]} · gövde ${Math.round(govdeBoyu / 1024)} KB · adres ${String(yol).length} karakter`;
      const hata = new Error(`${String((e && e.message) || e)} — ${ozet}`);
      hata.agHatasi = true;
      throw hata;
    }
  }
  baglantiBildir(true);
  // Jeton istek yoldayken dolmuş olabilir. Bir kez yenileyip tekrar deniyoruz; ikinci 401
  // gerçekten yetki yok demektir ve hata yukarı çıkar. Sonsuz döngü `tekrarMi` ile kesiliyor.
  if (yanit.status === 401 && !tekrarMi && _oturum) {
    const yeni = await jetonTazele();
    if (yeni) return supabaseIstek(yol, secenekler, true);
  }
  if (!yanit.ok) {
    const metin = await yanit.text().catch(() => "");
    let islemKodu = null;
    try { islemKodu = JSON.parse(metin).code; } catch (e) { /* geçersiz yanıt: normal hata */ }
    // Bu SQLSTATE'lerde transaction tamamen geri alınmıştır. Aynı istek kimliğiyle sınırlı tekrar güvenlidir.
    const atomikRpc = /^rpc\/(?:fis_(?:kes|iptal|iptal_toplu|bag_coz)|kas_yaz|alt_yaz|stk_yaz)(?:\?|$)/.test(yol);
    if (atomikRpc && (islemKodu === "40P01" || islemKodu === "40001") && islemDenemesi < 2) {
      await new Promise((r) => setTimeout(r, 40 * (islemDenemesi + 1)));
      return supabaseIstek(yol, secenekler, tekrarMi, islemDenemesi + 1);
    }

    // YETKİ HATASI İNSAN DİLİNDE (kullanıcı, 21 Eylül: "hiç işlem yapılmadı kasada" — ekranda
    // `{"code":"42501"..."permission denied for table muhasebe"}` görüp anlam verememişti).
    // 42501 = Postgres "yetersiz yetki". Bizde tek sebebi var: rls-kimlik.sql ile anonim rolün
    // yetkileri kaldırıldı, uygulama ise GİRİŞ YAPILMADAN (anon) yazmaya çalışıyor. Teknik
    // metin yerine ne olduğu ve ne yapılacağı yazılıyor; ham hata sonda, küçük.
    // MODÜL YETKİSİ / YÖNETİCİ KURALI (v1.642.0): rls-yazma.sql, rls-rol.sql ve kurulum_betigi() da 42501 döndürüyor ama
    // sebep "giriş yapılmamış" DEĞİL — kullanıcının o işe yetkisi yok. Sunucunun Türkçe mesajı olduğu gibi gösterilir.
    // KURAL REDDİ (v1.744.0, F2 — kullanıcı kararı 2 Kasım): sunucunun veri kuralları `KRnnn` koduyla reddeder (teslimli kalem
    // silinemez, bağı çözülmüş hareket yeniden bağlanamaz…). Bu KALICI bir rettir: aynı yazma tekrar gönderilse aynı cevabı alır.
    // Hata `kaliciRet` taşır — 040 tabloYaz reddedilen satırı paketten ayırıp "inceleme gerekiyor"a alır, kalanları gönderir; 100
    // bekleyen deneme döngüsü bu kaydı kendiliğinden yeniden göndermez. Mesaj sunucunun Türkçe metni (42501 çevirisine düşmez).
    const kural = kuralReddiOku(metin);
    if (kural) {
      const e = new Error(`${kural.mesaj} [${kural.kod}]`);
      e.kaliciRet = true; e.kod = kural.kod; e.satirId = kural.satirId;
      throw e;
    }
    const kuralMesaji = (metin.match(/"message"\s*:\s*"((?:Bu işlem için yetkiniz yok|[^"]*yalnız Yönetici)[^"]*)"/) || [])[1];
    if (kuralMesaji) throw new Error(kuralMesaji);
    if (/42501|permission denied/i.test(metin)) {
      const tablo = (metin.match(/for table (\w+)/) || [])[1] || "";
      throw new Error(`Buluta yazma yetkisi yok${tablo ? ` (${tablo})` : ""} — kimlik koruması açık ama giriş yapılmamış. `
        + `Sağ üstten kullanıcı girişi yapın; giriş yapınca bekleyen kayıtlar gönderilir. `
        + `(Girişsiz çalışmak istiyorsanız Supabase'de rls-kimlik.sql'in GERİ ALMA bloğunu çalıştırın.) `
        + `Ham hata: ${yanit.status} ${metin.slice(0, 80)}`);
    }
    throw new Error(`Supabase ${yanit.status}: ${metin.slice(0, 200)}`);
  }
  return yanit.status === 204 ? null : yanit.json().catch(() => null);
}

// Tek satırlık tablolar (tanımlar) için: bir bütün olarak okunup yazılıyorlar, fark almanın
// anlamı yok. Yine de buluta gitmeleri gerekiyor — renkler, prosesler ve fire sebepleri
// tüm makinelerde aynı olmalı.
// ================= BEKLEYEN YAZMA DEFTERİ =================
//
// Kullanıcı (15 Eylül, dört ekran görüntüsü): "Stok tutarsızlığı var. Stoğun giriş ve çıkış
// fişleri var ama stokta sıkıntı var. Bu konu çok önemli; test aşamasının sonuna yaklaştık, gerçek
// veriyle devam edeceğiz."
//
// TEŞHİS: satış fişi kesildi → sipariş "karşılandı", cari fişi yazıldı, ama stok ÇIKIŞ hareketi
// ekranda yok. Ekranlarda sürekli "Buluta yazılamadı: cariler" uyarısı var. Yazma katmanı
// buluta yazamayınca YEREL kopyayı yine de güncelliyor (doğru), ama bir sonraki açılışta bulut
// okunuyor ve bulutun ESKİ hâli yerelin GÜNCEL hâlinin üstüne yazılıyor. Sonuç: bazı tablolar
// (sipariş, cari) buluta gitmiş, stok gitmemiş → veri ikiye bölünmüş. Tutarsızlık uygulamanın
// hesabında değil, yazma yolunun YARIM kalmasında.
//
// ÇÖZÜM: buluta gidemeyen her yazma bu deftere düşer (`bekleyen:yazma`, yerel). Açılışta defterde
// kayıtlı tablo varsa o tablo için BULUT DEĞİL YEREL kopya esas alınır ve yazma yeniden denenir.
// Başarılı yazma kaydı defterden siler. Ekranda "N tablo buluta bekliyor — Yeniden dene" şeridi.
// Böylece bulut bir süre yazılamasa da veri bölünmez; en kötü ihtimalle "henüz gönderilmedi" olur.
const BEKLEYEN_ANAHTAR = "bekleyen:yazma";
function bekleyenYazmalariOku() {
  try { return JSON.parse(window.localStorage.getItem(BEKLEYEN_ANAHTAR) || "{}") || {}; } catch (e) { return {}; }
}
// `ek` (v1.744.0): { inceleme: true, kod } — KALICI sunucu reddi (KRnnn): kendiliğinden yeniden denenmez (100), şeritte ayrı.
function bekleyenYazmaEkle(anahtar, tablo, hata, ek) {
  try {
    const d = bekleyenYazmalariOku();
    d[anahtar] = { tablo, hata: String(hata || "").slice(0, 300), zaman: new Date().toISOString(), deneme: ((d[anahtar] && d[anahtar].deneme) || 0) + 1,
      ...(ek && ek.inceleme ? { inceleme: true, kod: ek.kod || null } : {}) };
    window.localStorage.setItem(BEKLEYEN_ANAHTAR, JSON.stringify(d));
    if (window.__bekleyenYazmaDegisti) window.__bekleyenYazmaDegisti(d);
  } catch (e) { /* depo yoksa defter de yok */ }
}
function bekleyenYazmaSil(anahtar) {
  try {
    const d = bekleyenYazmalariOku();
    if (!(anahtar in d)) return;
    delete d[anahtar];
    window.localStorage.setItem(BEKLEYEN_ANAHTAR, JSON.stringify(d));
    if (window.__bekleyenYazmaDegisti) window.__bekleyenYazmaDegisti(d);
  } catch (e) { /* */ }
}

// KURAL REDDİ OKUMA (v1.744.0): PostgREST gövdesi {"code":"KR002","message":"…(kalem k-1: …)…"}. Satır kimliği mesajdaki
// "(stk_hareket <id>", "(kalem <id>" ya da "(sipariş <id>" kalıbından — 040 o satırı paketten ayırır. Saf (birim testi).
function kuralReddiOku(metin) {
  let j = null;
  try { j = JSON.parse(metin); } catch (e) { j = null; }
  const kod = j && typeof j.code === "string" && /^(?:KR\d{3}|AT001)$/.test(j.code) ? j.code : null;
  if (!kod) return null;
  const mesaj = String(j.message || `Sunucu kuralı reddetti (${kod})`);
  const m = mesaj.match(/\((?:stk_hareket|kalem|sipariş)\s+([^\s:),]+)/);
  return { kod, mesaj, satirId: m ? m[1] : null };
}

// İNCELEME GEREKEN SATIRLAR (v1.744.0, kullanıcı kararı 2 Kasım: "reddedilen bu tür işlemler bekleyen kayıt defterinde sonsuz
// otomatik tekrar döngüsüne girmemeli; yerel kayıt silinmeden kullanıcıya açık hata gösterilmeli ve inceleme gerektiren duruma
// alınmalı"). Sunucunun kalıcı olarak reddettiği satır burada durur: { [tablo]: { [satirId]: { kod, sebep, anahtar, zaman,
// kayit } } }. 040 yazma hazırlığı bu satırları paketten AYIRIR (aynı tablonun öteki değişiklikleri gider), fark belleğinde
// "gönderilmedi" kalırlar; `kayit` reddedilen yerel hâlin yedeğidir (kullanıcı bırakmadan silinmez). Şerit (100) gösterir.
const INCELEME_ANAHTAR = "bekleyen:inceleme";
function incelemeOku() {
  try { return JSON.parse(window.localStorage.getItem(INCELEME_ANAHTAR) || "{}") || {}; } catch (e) { return {}; }
}
function incelemeYaz(d) {
  try {
    window.localStorage.setItem(INCELEME_ANAHTAR, JSON.stringify(d));
    if (window.__incelemeDegisti) window.__incelemeDegisti(d);
  } catch (e) { /* depo yoksa yalnız bellekte */ }
}
function incelemeEkle(tablo, satirId, bilgi) {
  const d = incelemeOku();
  d[tablo] = d[tablo] || {};
  d[tablo][satirId] = { ...(d[tablo][satirId] || {}), ...bilgi, zaman: new Date().toISOString() };
  incelemeYaz(d);
}
function incelemeKayitYedekle(tablo, satirId, kayit) {
  const d = incelemeOku();
  if (!d[tablo] || !d[tablo][satirId] || d[tablo][satirId].kayit) return;
  d[tablo][satirId].kayit = kayit;
  incelemeYaz(d);
}
function incelemeSil(tablo, satirId) {
  const d = incelemeOku();
  if (!d[tablo]) return;
  if (satirId === undefined) delete d[tablo]; else delete d[tablo][satirId];
  if (d[tablo] && Object.keys(d[tablo]).length === 0) delete d[tablo];
  incelemeYaz(d);
}
function incelemedekiSatirlar(tablo) { return new Set(Object.keys(incelemeOku()[tablo] || {})); }

// Anahtar başına yazma sayacı (v1.569.0): kuyrukta bekleyen ESKİ bir yazmanın birleşik hâli, arada yapılmış daha yeni
// yerel kaydın üstüne yazılmasın.
const _tekilSayac = {};
// BU CİHAZIN SON BULUT YAZMASI (v1.611.0, değişiklik sayacı): tablo → zaman. Yoklama, sayacı artan tablonun
// yazması bizden geldiyse (son 12 sn) tazelemeyi erteler — kendi kaydımızı buluttan geri okumak boşa iş.
// YOLDAKİ YAZMA (v1.645.2): damga yazma SIRAYA GİRERKEN basılıyordu. Kuyrukta bekleyen ya da yavaş ağda (mobil) 12 sn'den
// geç biten yazmanın sayaç artışı "başka cihaz" sanılıyor, tablo buluttan yeniden okunuyordu — üstelik o sırada aynı
// tabloya yoldaki DAHA YENİ bir yazma varsa ekrandaki yeni hâl buluttaki eski hâlle değişirdi. Artık yazma bitene kadar
// tablo "yazılıyor" sayılır (bulutSonYazma = şimdi) ve bittiğinde damga yeniden basılır.
const _bulutSonYazma = {};
const _bulutYoldakiYazma = {};
function bulutYazmaBasladi(tablo) { _bulutSonYazma[tablo] = Date.now(); _bulutYoldakiYazma[tablo] = (_bulutYoldakiYazma[tablo] || 0) + 1; }
function bulutYazmaBitti(tablo) { _bulutSonYazma[tablo] = Date.now(); _bulutYoldakiYazma[tablo] = Math.max(0, (_bulutYoldakiYazma[tablo] || 0) - 1); }
function bulutSonYazma(tablo) { return (_bulutYoldakiYazma[tablo] || 0) > 0 ? Date.now() : (_bulutSonYazma[tablo] || 0); }

// TEK PARÇA TABLO TABANI (v1.725.0, 089 `ucYonluBirlestir`): tablo → bu cihazın en son bildiği bulut hâli. Açılış okuması
// (090), değişiklik yoklaması (100 `bulutDegisikligiUygula`) ve bu cihazın başarılı yazması kurar. Yoksa (bulut okunamamış)
// yazma birleşimle gider: buluttaki hiçbir kayıt düşmez.
const _tekilTaban = {};
function tekilTabanAyarla(tablo, veri) {
  if (veri === undefined || veri === null) { delete _tekilTaban[tablo]; return; }
  try { _tekilTaban[tablo] = JSON.parse(JSON.stringify(veri)); } catch (e) { delete _tekilTaban[tablo]; }
}
function tekilTabanOku(tablo) {
  if (_tekilTaban[tablo] === undefined && tablo === "tanimlar") return tanimBekleyenTabanOku();
  return _tekilTaban[tablo];
}
// BEKLEYEN TANIM KAYDININ TABANI (v1.744.16). Tanım yazması sunucuya gidemeyince (oturum kapalı, okuma düştü, ağ) değişiklik
// bekleyen deftere düşer; sayfa yenilenince bellekteki taban (değişikliğin dayandığı sunucu hâli) kayboluyordu. Açılışta yerel
// kopya sunucuyla İKİ yönlü birleşince aynı kimlikte bu cihaz kazanıyor → başka cihazın bu arada DEĞİŞTİRDİĞİ tanım (ad, kod)
// eski kopyayla geri alınıyordu. Taban burada saklanır (ilk düşüşteki — sonraki düşüşler aynı tabana göre değişiklik), başarılı
// tanım yazmasında silinir; açılışta (090) ve tabansız yeniden gönderimde üç yönlü uzlaştırmanın tabanı olur.
// Yerel depoda (localStorage) — kullanıcı tanımları; parola / oturum anahtarı DEĞİL (kullanıcı kaydında parola tutulmaz).
// Çok büyükse (1,5 MB) saklanmaz: yer kotası öteki kayıtları (bekleyen defter) düşürmesin; o zaman eski (iki yönlü) davranış.
const TANIM_BEKLEYEN_TABAN = "tanimlar:bekleyen-taban";
function tanimBekleyenTabanOku() {
  try { const m = window.localStorage.getItem(TANIM_BEKLEYEN_TABAN); return m ? JSON.parse(m) : undefined; } catch (e) { return undefined; }
}
function tanimBekleyenTabanSakla(taban) {
  if (!taban) return;
  try {
    if (window.localStorage.getItem(TANIM_BEKLEYEN_TABAN)) return;   // ilk düşüşteki taban kalır
    const m = JSON.stringify(taban);
    if (m.length > 1.5 * 1024 * 1024) return;
    window.localStorage.setItem(TANIM_BEKLEYEN_TABAN, m);
  } catch (e) { /* kota / erişim yok — iki yönlü birleştirmeye düşer */ }
}
function tanimBekleyenTabanSil() { try { window.localStorage.removeItem(TANIM_BEKLEYEN_TABAN); } catch (e) { /* */ } }

function tekilYaz(anahtar, tablo, veri, secenek = {}) {
  // SUNUCU FİŞLERİ (v1.732.0, 078 fiş kes): `sunucu: true` işaretli defter kaydı fiş defteri tablosunda (stk_fis) duruyor;
  // eski liste tablosuna (fis_defteri) yazılırsa ikinci kopya olur. Yerel kopyaya da yazılmaz — açılışta sunucudan okunur.
  if (tablo === "fis_defteri" && Array.isArray(veri) && veri.some((f) => f && f.sunucu)) veri = veri.filter((f) => !(f && f.sunucu));
  const yerel = guvenliYaz(anahtar, JSON.stringify(veri), true);
  if (!supabaseAcikMi()) return yerel;
  // EKSİK YÜKLEME (v1.744.16): kilitliyken yerel yazma zaten yapılmıyor (guvenliYaz); sunucuya da gitmez ve BEKLEYEN DEFTERE
  // DE DÜŞMEZ — eksik hâl sonraki açılışta "yerel esas" sayılıp buluttakini ezmesin. Kullanıcıyı guvenliYaz uyardı.
  if (typeof VERI_KILIDI !== "undefined" && VERI_KILIDI.aktif) return yerel;
  bulutYazmaBasladi(tablo);
  const benimSiram = (_tekilSayac[anahtar] = (_tekilSayac[anahtar] || 0) + 1);
  // TANIMLAR BULUTLA BİRLEŞEREK YAZILIR (v1.552.0, 089). Tanımlar tek satır; bütün hâli yazılınca başka
  // cihazda açılmış model renkleri/renkler bu cihazın eski listesiyle siliniyordu (kullanıcı: Paketleme'de
  // "1017 - Beyaz Deri/Gümüş … Tanımlar'da yok"). Yazmadan önce buluttaki hâl okunur; bu cihazda SİLİNMEMİŞ
  // eksik öğeler eklenir. Bulut okunamazsa birleştirmesiz yazılır. Yedekten geri yükleme ve sıfırlama
  // bilerek bütününü yazar: `{ birlestirme: false }`.
  const birlestir = tablo === "tanimlar" && secenek.birlestirme !== false && typeof tanimlariBirlestir === "function";
  // DİĞER TEK PARÇA TABLOLAR BULUTLA ÜÇ YÖNLÜ BİRLEŞEREK (v1.725.0 — kullanıcı: teklif başka cihazdan kayboldu; telefonda
  // Kasa & Banka "0 hesap"). Bütün hâli basmak, eski listeyi tutan cihazın başka cihazın kaydını silmesi demekti. Bulut
  // OKUNAMAZSA yazılmaz (hata → bekleyen defter, yeniden denenir): birleştirmesiz basmak tam da kapatılan delik.
  // `{ birlestirme: false }` (bilerek bütününü yazanlar: sıfırlama, arşivden geri dönüş) ikisini de kapatır.
  const ucYonlu = tablo !== "tanimlar" && secenek.birlestirme !== false && typeof ucYonluBirlestir === "function";
  const gonderilen = veri;
  // SIRALI (v1.569.0, denetim): tek satırlık tablolar kuyruğa girmiyordu; iki hızlı kayıtta önce başlayan (okuma +
  // birleştirme + yazma) SONRA bitebiliyor, bulutta eski liste kalıyordu. `tabloYaz` ile aynı tablo kuyruğu.
  // TANIMLAR (v1.744.16): (1) sunucu OKUNAMAZSA YAZILMAZ — eskiden birleştirmesiz yazılıyordu, yani tam da korunmak istenen
  // "eski kopyayı bütünüyle gönderme" oluyordu; hata → bekleyen defter, oturum açıkken uzlaştırılarak yeniden denenir.
  // (2) ÜÇ YÖNLÜ (089 `tanimlarUzlastir`): bu cihazın bildiği son sunucu hâli (taban) varsa başka cihazın DEĞİŞTİRDİĞİ öğe
  // de korunur (eskiden aynı kimlikte bu cihaz kazanıyordu); eklenen / silinen koruması (`tanimlariBirlestir`) aynen sürer.
  const tetikleyen = secenek.tetikleyen || "kayıt";
  const isi = () => (birlestir
    ? supabaseIstek("tanimlar?id=eq.tekil&select=veri").catch((e) => {
        const h = new Error(`Tanımlar sunucudan okunamadı — eski kopya gönderilmedi (${String((e && e.message) || e).slice(0, 120)})`);
        if (e && e.yazmaKapisi) h.yazmaKapisi = e.yazmaKapisi;
        throw h;
      }).then((r) => {
        const bulut = Array.isArray(r) && r[0] ? r[0].veri : null;
        if (typeof tanimlarOkundu === "function") tanimlarOkundu();
        const u = tanimlarUzlastir(veri, bulut, tekilTabanOku("tanimlar"), tanimSilinenleriOku());
        // Ortak silinenler (`__silinenler`) her yazmada buluta taşınır; yerel/ekran yalnız öğe eklendi/çıkarıldı/değiştiyse.
        if (u.toplam === 0) return u.tanimlar;
        // katman-muaf: tekilYaz'ın kendi gövdesi — birleşik hâl yerele de yazılır (arada daha yeni kayıt yoksa).
        if (_tekilSayac[anahtar] === benimSiram) guvenliYaz(anahtar, JSON.stringify(u.tanimlar), true);
        console.info(`Tanımlar bulutla birleştirildi (${tetikleyen}): ${u.metin}`);
        if (typeof window !== "undefined" && window.__tanimlarBirlesti) window.__tanimlarBirlesti({ birlesik: u.tanimlar, gonderilen: veri, ozet: u, tetikleyen });
        return u.tanimlar;
      })
    : ucYonlu
      ? supabaseIstek(`${tablo}?id=eq.tekil&select=veri`).then((r) => {
          const bulut = Array.isArray(r) && r[0] ? r[0].veri : null;
          if (bulut === null || bulut === undefined) return veri;
          const b = ucYonluBirlestir(veri, bulut, tekilTabanOku(tablo));
          if (JSON.stringify(b) !== JSON.stringify(veri)) {
            // katman-muaf: tekilYaz'ın kendi gövdesi — birleşik hâl yerele de yazılır (arada daha yeni kayıt yoksa).
            if (_tekilSayac[anahtar] === benimSiram) guvenliYaz(anahtar, JSON.stringify(b), true);
            if (typeof window !== "undefined" && window.__tekilBirlesti) window.__tekilBirlesti(tablo, b, gonderilen);
          }
          return b;
        })
      : Promise.resolve(veri)).then((v) => supabaseIstek(tablo, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ id: "tekil", veri: v }]),
    }).then(() => {
      // Taban = bu cihazın ekranındaki hâl (gönderdiği), birleşik hâl değil: ekran henüz birleşiği göstermiyorsa bir sonraki
      // yazmada buluttan gelen kayıtlar "bu cihaz sildi" sayılmasın. Ekran birleşiğe geçince (yoklama) taban da güncellenir.
      // TANIMLAR (v1.744.16): ekran birleşik hâle hemen geçer (100 `__tanimlarBirlesti`) — taban sunucuya giden birleşik hâl.
      tekilTabanAyarla(tablo, birlestir ? v : gonderilen);
      if (tablo === "tanimlar") tanimBekleyenTabanSil();
    }));
  // KASA & BANKA v2 (v1.729.0, 038 `kasaV2Yuku`): geçiş yapıldıysa (`stk_ayar.kasa_aktif`) belge YAZILMAZ — `muhasebe` artık
  // salt-okur görünüm. Bu cihazın tabanla yeni hâl arasındaki farkı satır olarak `kas_yaz`a gider: başka cihazın kaydına
  // dokunulmaz, bayat ya da boş liste hiçbir şeyi silemez, silme iptaldir. Fark kuyrukta SIRASI GELİNCE hesaplanır (önceki
  // yazmanın kurduğu taban üstünden); düşen yazmada taban ilerlemez, sonraki yazma düşen farkı da taşır. Birleştirme ve
  // `birlestirme: false` burada anlamsız (fark zaten yalnız bu cihazın değişikliği). İşlem zarfı (`secenek.zarf`, 040):
  // tahsilat / ödeme / peşin fişte kasa satırları cari (ve stok) satırlarıyla tek `fis_yaz`da — zarf kendi kuyruğunu tutar.
  const kasaV2 = tablo === "muhasebe" && typeof kasaV2Aktif === "function" && kasaV2Aktif();
  const kasaIsi = () => {
    const yuk = kasaV2YukHazirla(gonderilen, secenek);   // toplu iptal kilidi burada (038)
    return yuk ? v2KopruGonder([{ tur: "kasa", yuk }]) : Promise.resolve();
  };
  // TEK PARÇA LİSTELER v2 (v1.730.0, 038 `listeV2Yuku`): teklif, fatura, koli, görev, model, fiş defteri, mesaj — Kasa ile aynı
  // ilke: geçiş yapılmış listede dizi YAZILMAZ, bu cihazın farkı `lst_yaz`a gider; kuyrukta, taban üstünden, kilitli.
  const listeV2 = !kasaV2 && typeof listeV2Aktif === "function" && listeV2Aktif(tablo);
  const listeIsi = () => {
    const yuk = listeV2YukHazirla(tablo, gonderilen, secenek);   // toplu iptal kilidi burada (038)
    return yuk ? listeV2Gonder(tablo, yuk) : Promise.resolve();
  };
  // Sunucu ayarı okunamadıysa (045) muhasebe ve listeler bekletilir: hangi yoldan yazılacağı bilinmiyor.
  const ayarEngeli = typeof v2AyarYazmaEngeli === "function" ? v2AyarYazmaEngeli(tablo) : null;
  const gidecek = ayarEngeli
    ? Promise.reject(ayarEngeli)
    : listeV2
    ? tabloKuyrugunaAl(tablo, listeIsi).then(() => { tekilTabanAyarla(tablo, gonderilen); })
    : kasaV2
    ? ((secenek.zarf && secenek.zarf.kabul(tablo)) ? secenek.zarf.ekle(tablo, gonderilen, secenek) : tabloKuyrugunaAl(tablo, kasaIsi))
      .then((r) => {
        // Zarfın öteki tablosunda sürüm çakışması: hiçbiri yazılmadı — kasa da bekleyen deftere (yeniden gönderilir).
        if (r && r.__cakisma) throw new Error("sürüm çakışması — Kasa & Banka buluta yazılmadı");
        tekilTabanAyarla(tablo, gonderilen);
      })
    : (typeof tabloKuyrugunaAl === "function" ? tabloKuyrugunaAl(tablo, isi) : isi());
  gidecek.then(() => bulutYazmaBitti(tablo), () => bulutYazmaBitti(tablo));
  return Promise.all([
    yerel,
    gidecek.then(() => { bekleyenYazmaSil(anahtar); if (typeof window !== "undefined" && window.__supabaseBasariBildir) window.__supabaseBasariBildir(tablo); }).catch((e) => {
      console.error("Supabase yazma hatası:", tablo, e);
      // Toplu silme engeli (Kasa & Banka / liste v2, 038) bekleyen yazma DEĞİLDİR — 040 tabloYaz ile aynı kural.
      // Kalıcı ret (v1.744.0, KRnnn): tek parça belgede satır ayrılamaz — kayıt "inceleme" işaretlenir, kendiliğinden denenmez.
      // Eksik yükleme kilidi (kapı, v1.744.16) bekleyen DEĞİLDİR: eksik hâl sonraki açılışta "yerel esas" sayılmasın.
      if (e && e.yazmaKapisi === "eksik-yukleme") return;
      if (tablo === "tanimlar") tanimBekleyenTabanSakla(_tekilTaban.tanimlar);
      if (!(e && e.topluSilmeEngeli) || bekleyenYazmalariOku()[anahtar]) bekleyenYazmaEkle(anahtar, tablo, e && e.message, e && e.kaliciRet ? { inceleme: true, kod: e.kod } : undefined);
      if (typeof window !== "undefined" && window.__supabaseHataBildir) {
        window.__supabaseHataBildir(tablo, String(e && e.message || e));
      }
    }),
  ]).then(() => yerel);
}

