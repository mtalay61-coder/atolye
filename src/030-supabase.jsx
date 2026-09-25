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
const SUPABASE_URL = "https://mqdgucoomgqcvhvgixbl.supabase.co";
const SUPABASE_ANAHTAR = "sb_publishable_MKOjcTQ8Dod9Ofh-P-V-uA_3kKm_Ei2";

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
  try {
    if (o) localStorage.setItem(OTURUM_ANAHTARI, JSON.stringify(o));
    else localStorage.removeItem(OTURUM_ANAHTARI);
  } catch (e) { /* depo dolu ya da kapalı: oturum bellekte yaşamaya devam eder */ }
}
function oturumBaslat() { _oturum = oturumOku(); return _oturum; }

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

function yayinlananSurumuYaz(veri) {
  return tekilYaz("surum:data", "surum", veri);
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
  // Açılışta on tablo aynı anda çekiliyor. Her biri ayrı yenileme başlatsaydı, ilk dönen
  // yenileme jetonu diğerlerini geçersiz kılar ve oturum kendi kendini düşürürdü.
  if (!_yenilemeIslemi) {
    _yenilemeIslemi = authIstek("token?grant_type=refresh_token", { refresh_token: _oturum.yenileme })
      .then((veri) => { oturumKur(veri, _oturum && _oturum.email); return _oturum; })
      .catch((e) => {
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
function oturumVarMi() { return !!_oturum; }

async function gecerliJeton() {
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
async function supabaseIstek(yol, secenekler = {}, tekrarMi = false) {
  const yanit = await fetch(`${SUPABASE_URL}/rest/v1/${yol}`, {
    ...secenekler,
    headers: {
      ...(await yetkiBasliklari()),
      "Content-Type": "application/json",
      ...(secenekler.headers || {}),
    },
  });
  // Jeton istek yoldayken dolmuş olabilir. Bir kez yenileyip tekrar deniyoruz; ikinci 401
  // gerçekten yetki yok demektir ve hata yukarı çıkar. Sonsuz döngü `tekrarMi` ile kesiliyor.
  if (yanit.status === 401 && !tekrarMi && _oturum) {
    const yeni = await jetonTazele();
    if (yeni) return supabaseIstek(yol, secenekler, true);
  }
  if (!yanit.ok) {
    const metin = await yanit.text().catch(() => "");
    // YETKİ HATASI İNSAN DİLİNDE (kullanıcı, 21 Eylül: "hiç işlem yapılmadı kasada" — ekranda
    // `{"code":"42501"..."permission denied for table muhasebe"}` görüp anlam verememişti).
    // 42501 = Postgres "yetersiz yetki". Bizde tek sebebi var: rls-kimlik.sql ile anonim rolün
    // yetkileri kaldırıldı, uygulama ise GİRİŞ YAPILMADAN (anon) yazmaya çalışıyor. Teknik
    // metin yerine ne olduğu ve ne yapılacağı yazılıyor; ham hata sonda, küçük.
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
function bekleyenYazmaEkle(anahtar, tablo, hata) {
  try {
    const d = bekleyenYazmalariOku();
    d[anahtar] = { tablo, hata: String(hata || "").slice(0, 300), zaman: new Date().toISOString(), deneme: ((d[anahtar] && d[anahtar].deneme) || 0) + 1 };
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

function tekilYaz(anahtar, tablo, veri) {
  const yerel = guvenliYaz(anahtar, JSON.stringify(veri), true);
  if (!supabaseAcikMi()) return yerel;
  return Promise.all([
    yerel,
    supabaseIstek(tablo, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ id: "tekil", veri }]),
    }).then(() => { bekleyenYazmaSil(anahtar); }).catch((e) => {
      console.error("Supabase yazma hatası:", tablo, e);
      bekleyenYazmaEkle(anahtar, tablo, e && e.message);
      if (typeof window !== "undefined" && window.__supabaseHataBildir) {
        window.__supabaseHataBildir(tablo, String(e && e.message || e));
      }
    }),
  ]).then(() => yerel);
}

