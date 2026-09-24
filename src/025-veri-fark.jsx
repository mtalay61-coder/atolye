// =============================================================================================
// VERİ KATMANI — kayıt bazlı yazma
//
// Uygulama bugüne kadar her değişiklikte TÜM diziyi diske yazıyordu:
//     guvenliYaz("stok:items", JSON.stringify(tumUrunler))
//
// Tek kullanıcıda sorun değil. ÜÇ kullanıcıda veri kaybettirir: Mehmet kaydettiğinde elindeki
// (Ahmet'in az önce eklediği siparişi içermeyen) listeyi diske yazar ve o siparişi SESSİZCE siler.
//
// Çözüm: yazmadan önce eski hâl ile yeni hâli karşılaştırıp yalnızca DEĞİŞEN kayıtları belirlemek.
// Çağrı yerlerini tek tek "hangi kayıt değişti" bilecek şekilde yazmak yerine farkı burada
// hesaplıyoruz — 84 çağrı yerinde bir kaydı atlama riski ortadan kalkıyor ve mantık tek yerde.
//
// Bugün fark yalnızca HESAPLANIYOR, yazma hâlâ toplu yapılıyor (davranış birebir aynı).
// Supabase'e geçildiğinde `tabloYaz` içindeki toplu yazma, satır bazlı upsert/delete ile
// değiştirilecek — başka hiçbir yere dokunmadan.
const _sonHal = {}; // tablo -> Map(id -> JSON dizesi)

// Bir tablonun eski ve yeni hâlini karşılaştırır.
function tabloFarki(tablo, kayitlar) {
  const onceki = _sonHal[tablo] || new Map();
  const yeni = new Map();
  const eklenen = [];
  const guncellenen = [];
  const silinen = [];

  (kayitlar || []).forEach((k) => {
    if (!k || k.id === undefined) return;
    const dize = JSON.stringify(k);
    yeni.set(k.id, dize);
    const eski = onceki.get(k.id);
    if (eski === undefined) eklenen.push(k);
    else if (eski !== dize) guncellenen.push(k);
  });
  // Silinen kaydın yalnızca KİMLİĞİ değil, KENDİSİ de dönüyor. Kimliği yapay olan tablolarda
  // (varyantlar: urun_id+renk+beden) silme sorgusu ancak sütun değerleriyle kurulabilir; o
  // değerler yalnızca burada, bellekteki eski hâlde duruyor. Kayıt gitmişse başka kaynağı yok.
  const silinenKayitlar = [];
  onceki.forEach((dize, id) => {
    if (yeni.has(id)) return;
    silinen.push(id);
    // JSON.parse KORUMASIZ: bu dizeyi biz yazdık, bozuksa bir şeyler ciddi biçimde yanlış
    // demektir. Yutulursa silme sessizce atlanır — düzeltmeye çalıştığımız hatanın ta kendisi.
    silinenKayitlar.push(JSON.parse(dize));
  });

  _sonHal[tablo] = yeni;
  return { eklenen, guncellenen, silinen, silinenKayitlar };
}

// Uygulama ilk açıldığında diskten okunan hâli "başlangıç" olarak işaretler.
// Bu yapılmazsa ilk kayıtta her satır "yeni eklendi" görünür ve gereksiz yazma olur.
// Ana kayıtla BİRLİKTE alt kayıtların da fark belleğini kurar.
//
// SORUN (yaşandı): açılışta yalnızca ana tablolar kuruluyordu. Alt tabloların belleği boş
// kalıyor, sayfa açıldıktan sonraki İLK yazmada `silinen` listesi boş çıkıyordu — çünkü
// karşılaştırılacak bir "eski hâl" yoktu. Silinen hareket yerelde gidiyor, ekrandan kayboluyor,
// ama buluttan HİÇ silinmiyordu; yenileyince geri geliyordu. "Fiş temizlendi ama temizlenmiyor"
// şikâyetinin sebebi buydu. Aynı oturumda ikinci deneme çalışıyordu, çünkü bellek o arada
// dolmuş oluyordu — hatayı bu aralıklı davranış gizledi.
//
// Kayıt biçimi `_tabloEsitleUygula`'daki ile BİREBİR aynı olmalı (`__k` ve `id` dahil), yoksa
// ilk yazmada her alt kayıt "değişmiş" görünür ve gereksiz yazma seli olur.
function tabloBaslangicTam(tablo, kayitlar) {
  tabloBaslangic(tablo, kayitlar);
  const sema = TABLO_SEMA[tablo];
  if (!sema) return;
  (sema.cocuklar || []).forEach((cocuk) => {
    const duz = [];
    (kayitlar || []).forEach((k) => {
      cocuk.cikar(k).forEach((c) => {
        const anahtar = cocuk.anahtar(c);
        duz.push({ ...c, __k: anahtar, id: anahtar });
      });
    });
    tabloBaslangic(`${tablo}::${cocuk.tablo}`, duz);
  });
}

function tabloBaslangic(tablo, kayitlar) {
  const m = new Map();
  (kayitlar || []).forEach((k) => { if (k && k.id !== undefined) m.set(k.id, JSON.stringify(k)); });
  _sonHal[tablo] = m;
}

// =============================================================================================
// SÜRÜM KONTROLÜ — İYİMSER KİLİTLEME
//
// SORUN: fark katmanı "hangi kayıt değişti" sorusunu çözdü ama "ben bu kaydı okuduktan SONRA
// başkası değiştirdi mi" sorusunu çözmedi. Ahmet ile Mehmet aynı siparişi açar; Ahmet kaydeder,
// ardından Mehmet kaydeder. Mehmet'in gönderdiği satır Ahmet'in değişikliğini SESSİZCE siler —
// uyarı yok, günlük yok, iz yok. Bir hafta sonra "ben bunu girmiştim" denir ve kimse bulamaz.
//
// ÇÖZÜM: her ana kaydın bir `surum` sayacı var. Güncelleme "sürümü hâlâ N ise yaz" koşuluyla
// gönderiliyor. Aradan başkası geçtiyse sürüm N+1 olmuştur, koşul tutmaz ve sunucu SIFIR satır
// günceller. Çakışmayı buradan anlıyoruz — tahminle değil, veritabanının cevabıyla.
//
// Sayacın UYGULAMA KAYDININ İÇİNDE tutulmaması bilinçli: içeride olsaydı her başarılı yazmadan
// sonra kayıt "değişmiş" görünür, fark katmanı onu yeniden yazmak ister ve kendi kendini besleyen
// bir yazma döngüsü kurulurdu.
// =============================================================================================
// GÜNLÜK (denetim izi)
//
// "Kim ne yaptı" sorusunun cevabı. Üç kural:
//
// 1. SALT EKLEME. Günlük kaydı güncellenmez, silinmez, fark katmanından geçmez. Değiştirilebilen
//    bir günlük günlük değildir. Bu yüzden `tabloYaz` kullanılmıyor — o katman fark hesaplayıp
//    üzerine yazıyor; günlük ise yalnızca ekleniyor.
//
// 2. HİÇBİR ZAMAN ENGELLEMEZ. Günlük yazılamazsa iş durmaz. Atölyenin fiş kesmesi, günlük
//    sunucusuna erişilemediği için durmamalı — günlük yardımcı bir kayıttır, işin kendisi değil.
//    Bu yüzden `await` edilmiyor ve hatası yalnızca konsola düşüyor.
//
// 3. İKİ KATMAN. Elle yazılan anlamlı kayıtlar ("Mahmut fiş sildi") VE yazma katmanına bağlı
//    otomatik taban ("urunler: 1 güncellendi"). Yalnızca elle yazılsaydı, bir sonraki özellikte
//    biri çağırmayı unutur ve günlükte sessiz bir delik açılırdı — bu projede aynı hata sınıfı
//    hareket/fiş tarafında zaten yaşandı.
let _gunlukKullanici = { id: null, ad: "Bilinmeyen" };
function gunlukKullaniciAyarla(k) {
  _gunlukKullanici = k ? { id: k.id || null, ad: k.ad || k.kullaniciAdi || "Bilinmeyen" } : { id: null, ad: "Bilinmeyen" };
}

// İŞLEMİ YAPAN KULLANICI (17 Eylül: "kullanıcı göstermiyor"). Günlük zaten bu bilgiyi tutuyordu;
// kayıtlara damga basmak isteyen yerler (kasa/cari hareketi, virman) de buradan okuyor. Prop
// zinciriyle taşımak yerine tek kaynaktan sormak, "bir yol unutuldu" hatasını engelliyor.
function islemKullanicisiAd() {
  const ad = (_gunlukKullanici && _gunlukKullanici.ad) || "";
  // "Bilinmeyen" damgalamıyoruz: giriş sistemi kapalıyken her satıra "Bilinmeyen" yazmak,
  // bilgi vermeden listeyi kirletir. Boş kalması "kayıt girişsiz yapıldı" demek.
  return ad === "Bilinmeyen" ? "" : ad;
}

function gunlukYaz(eylem, kapsam, ayrinti) {
  if (!supabaseAcikMi()) return;
  const kayit = {
    id: uid("log"),
    zaman: new Date().toISOString(),
    kullanici_id: _gunlukKullanici.id,
    kullanici_ad: _gunlukKullanici.ad,
    eylem: String(eylem || "").slice(0, 200),
    kapsam: kapsam || null,
    ayrinti: ayrinti || {},
  };
  supabaseIstek("gunluk", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([kayit]),
  }).catch((e) => console.warn("Günlük yazılamadı (iş durmadı):", e && e.message));
}

// Günlüğü tamamen boşaltır. YALNIZCA veritabanı sıfırlamada çağrılır; uygulamada tekil kayıt
// silme arayüzü yok. PostgREST süzgeçsiz DELETE kabul etmiyor (kazara tüm tabloyu silmeye karşı
// bir koruma), o yüzden "kimliği boş olmayan" koşulu veriliyor.
async function gunlukBosalt() {
  if (!supabaseAcikMi()) return;
  await supabaseIstek("gunluk?id=not.is.null", { method: "DELETE" });
}

async function gunlukOku(sinir = 300) {
  if (!supabaseAcikMi()) return [];
  return supabaseIstek(`gunluk?select=*&order=zaman.desc&limit=${Math.min(sinir, 1000)}`);
}

const _surumler = {}; // tablo -> Map(id -> surum)

// =============================================================================================
// NEDEN STOK SIFIRIN ALTINA İNEBİLİR
//
// Hareket geri alma yolları eskiden `Math.max(0, ...)` kullanıyordu: miktarın eksiye düşmesi
// çirkin göründüğü için sıfırda tutuluyordu. Kırpma aradaki farkı SESSİZCE yutuyor ve defterle
// stoğu ayırıyordu.
//
// "Kampre Bezi" olayında yaşandı: stok −13,2 iken üç üretim hareketi geri alındı.
//     −13,2 + 0,8 = −12,4  ->  kırpıldı, 0 oldu        (12,4 metre buhar oldu)
//        0 + 0,8 =   0,8
//      0,8 + 13,2 =  14,0                               (defter 0 derken stok 14)
//
// Eksi stok bir GÖRÜNTÜ sorunu değil BİLGİDİR: "kayıtta olduğundan fazlasını tükettin, girişlerin
// eksik" demektir. Sıfırda tutmak o bilgiyi siler ve yerine uydurma bir sayı koyar. Sekiz yerde
// kırpma vardı, hepsi kaldırıldı; eksi stok artık olduğu gibi görünüyor.
// =============================================================================================

// Şema eski olabilir (`surum` sütunu eklenmemiş). O durumda kilitleme sessizce kapanır ve yazma
// eski yoluyla sürer; aksi hâlde şema güncellenene kadar hiçbir şey kaydedilemezdi.
let surumDesteklenmiyor = false;

function surumleriYukle(tablo, satirlar) {
  const m = new Map();
  (satirlar || []).forEach((r) => {
    if (r && r.id !== undefined && r.surum !== undefined && r.surum !== null) m.set(r.id, r.surum);
  });
  _surumler[tablo] = m;
}

function surumCakismasiBildir(tablo, idler, teshis) {
  console.warn("Sürüm çakışması:", tablo, idler, teshis);
  if (typeof window !== "undefined" && window.__surumCakismaBildir) {
    window.__surumCakismaBildir(tablo, idler, teshis);
  }
}

// Sütunun varlığı açılışta BİR KEZ yoklanır. Boş tabloya bakıp karar vermek yetmez: satır yoksa
// hangi sütunların olduğu anlaşılmaz. Sütun sorgusu ise tablo boş olsa da kesin cevap verir.
async function surumDesteginiYokla() {
  try {
    await supabaseIstek("urunler?select=surum&limit=1");
    surumDesteklenmiyor = false;
  } catch (e) {
    surumDesteklenmiyor = true;
    console.warn("`surum` sütunu bulunamadı — iyimser kilitleme kapalı. surum-sutunu.sql çalıştırılmalı.", e);
  }
}

// Renk yeniden adlandırma gibi işlemler yüzlerce kaydı birden güncelleyebiliyor. Her kayıt ayrı
// istek olduğu için hepsini aynı anda açmak tarayıcıyı da sunucuyu da tıkar; sınırlı sayıda
// istek paralel yürütülür.
async function sirayla(isler, esZamanli = 6) {
  for (let i = 0; i < isler.length; i += esZamanli) {
    await Promise.all(isler.slice(i, i + esZamanli).map((f) => f()));
  }
}

// Kimliği PostgREST koşuluna gömer.
//
// TIRNAK YOK — ve bu ayrım pahalıya mal oldu. PostgREST'te `in.("a","b")` içindeki çift tırnaklar
// AYIRICI görevi görür ve soyulur; `eq."a"` içindekiler ise DEĞERİN PARÇASI sayılır. Yani tırnaklı
// bir eq koşulu, tırnak karakterlerini de içeren bir kimlik arar ve hiçbir satıra denk gelmez.
//
// Sonuç: her koşullu güncelleme sıfır satır günceller ve iyimser kilitleme bunu "başka bilgisayar
// değiştirdi" sanır. Kullanıcı sürekli sahte çakışma görür, hiçbir kaydı güncelleyemez. Teşhis
// satırında "beklenen 7 · sunucuda 7" (yani EŞİT) görülmesi bunu ele verdi — sürümler tutuyorsa
// koşulun tutmamasının tek sebebi kimlik filtresidir.
//
// `in.()` tarafında tırnak DOĞRU ve gerekli (bkz. supabaseSil); ikisini karıştırmamak lazım.
// encodeURIComponent nokta, virgül, parantez gibi karakterleri zaten güvenli hâle getiriyor.
function pgKimlik(id) {
  return encodeURIComponent(String(id));
}

