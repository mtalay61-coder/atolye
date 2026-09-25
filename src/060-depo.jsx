// =============================================================================================
// VERİ KAYBI KORUMASI
//
// Açılışta bir depolama anahtarı OKUNAMAZSA (geçici hata, hız sınırı, ağ kesintisi), uygulama o
// veriyi BOŞ kabul edip çalışmaya devam ederdi. Kullanıcı ardından herhangi bir kayıt yaptığında
// boş dizi diske yazılır ve ESKİ VERİ KALICI OLARAK SİLİNİRDİ — sessizce, hiçbir uyarı olmadan.
// Belirtisi tam olarak şuydu: planlanmış satış kalemleri duruyor ama bağlı üretim kayıtları yok
// ("Kayıt yok").
//
// Çözüm: okuma hatası tespit edilirse YAZMA KİLİTLENİR. Bozuk bir okumadan sonra hiçbir şey diske
// yazılmaz; kullanıcı uyarılır ve sayfayı yenilemesi istenir. Veri kaybetmektense kaydı reddetmek
// her zaman daha iyidir — kayıp geri alınamaz, reddedilen kayıt tekrar denenebilir.
// =============================================================================================
const VERI_KILIDI = { aktif: false, sebep: "" };

// Kilitliyken kullanıcıyı uyarmak için: uygulama, kilit devredeyken bir kaydetme denendiğinde
// haber verilsin diye buraya bir geri çağırım takar. Kısma (throttle) var — art arda 20 yazma
// denemesinde 20 bildirim çıkması kullanıcıyı boğardı, ama HİÇ bildirmemek de yanlıştı: kullanıcı
// kaydettiğini sanıp çalışmaya devam ediyordu.
const VERI_KILIDI_UYARI = { bildir: null, sonBildirim: 0 };

// Depolama, anahtar başına 5 MB sınırı uygular. Ürün görselleri (kapakResmi, renkResimleri) base64
// olarak stok kaydının İÇİNDE saklandığı için "stok:items" bu sınıra en hızlı yaklaşan anahtardır.
// Sınır aşıldığında yazma hata verir ve hiçbir stok değişikliği kalıcı olmaz — silme yapılır, ekranda
// gider, sayfa yenilenince geri gelir. Belirti tam olarak budur.
// =============================================================================================
// PASİF (ARŞİV) MANTIĞI
//
// Geçmişi olan kayıtlar silinemiyor (bkz. silme korumaları) — ve silinmemeli de. Ama artık
// kullanılmayan bir ürün/cari/hesap, seçim listelerinde durmaya devam ederse liste zamanla
// kullanılamaz hale gelir ve yanlış seçim riski doğar.
//
// Pasif, silmenin YERİNE geçen doğru araçtır: kayıt ve tüm geçmişi olduğu gibi kalır, raporlarda
// görünmeye devam eder, ama YENİ işlemlerde seçilemez.
//
// Kritik incelik: bir kayıt pasife alındığında, onu ZATEN kullanan eski kayıtlar bozulmamalı. Bu
// yüzden seçim listeleri pasifleri gizlerken, o an SEÇİLİ olanı listede tutar — aksi halde eski bir
// siparişi açtığınızda cari alanı boş görünür ve kaydederken sessizce silinirdi.
// =============================================================================================
// Seçim (dropdown) listeleri için: pasifleri ele, ama hâlihazırda seçili olanı koru.
function secilebilirler(liste, seciliId) {
  return (liste || []).filter((x) => !x.pasif || x.id === seciliId);
}

// Seçenek etiketine "(pasif)" ekler — kullanıcı, eski bir kaydın artık kullanımdan kalkmış bir
// karta bağlı olduğunu görebilmeli.
function secenekEtiketi(kayit, ad) {
  return kayit && kayit.pasif ? `${ad} (pasif)` : ad;
}

// Açık pencere sekmelerinin şeridi ekranın en üstünde SABİT durur (position: fixed, zIndex: 500).
// Tam ekran açılan pencereler inset:0 ile başladığında kendi başlık çubukları bu şeridin ALTINDA
// kalıyor ve Kapat/küçült düğmeleri erişilemez oluyordu. Bu yüzden tam ekran pencereler şeridin
// yüksekliği kadar aşağıdan başlar. Tek yerde tanımlı ki şerit yüksekliği değişirse hepsi uyar.
// ÜST BÖLGE YÜKSEKLİĞİ (v1.449.0): tam ekran pencereler bunun ALTINDAN başlıyor. Masaüstünde
// üst menü (UST_MENU_YUKSEKLIGI) + sekme şeridi; mobilde üst menü gizli, yalnız şerit. Menü
// yüksekliği CSS değişkeninde (100-app yazıyor), o yüzden değer bir calc() dizesi.
const SEKME_SERIDI_YUKSEKLIGI = 40;
const UST_MENU_YUKSEKLIGI = 56;
const PENCERE_SERIT_YUKSEKLIGI = `calc(var(--ust-menu-h, 0px) + ${SEKME_SERIDI_YUKSEKLIGI}px)`;

// Pencere başlığındaki "−" ve "Kapat" düğmelerinin ortak görünümü. Başlık şeridi koyu renkli
// olduğu için düğmeler saydam-açık kalıyor; her pencerede elle tekrarlanınca biri diğerinden
// ayrışıyordu.
const PENCERE_BASLIK_BUTONU = { background: "rgba(255,255,255,.14)", borderColor: "rgba(255,255,255,.35)", color: "var(--erp-panel-2)" };

const DEPO_SINIRI = 5 * 1024 * 1024;
const DEPO_UYARI_ESIGI = 4.5 * 1024 * 1024;

function veriBoyutu(deger) {
  const metin = typeof deger === "string" ? deger : JSON.stringify(deger);
  // Byte cinsinden gerçek boyut: Türkçe karakterler ve base64 nedeniyle karakter sayısı yanıltıcıdır.
  return new Blob([metin]).size;
}

// TARAYICI DEPOSUNUN KULLANIMI — anahtar anahtar.
//
// Neden gerekiyor: uygulama tarayıcıda `window.storage`ı localStorage üzerine kurulmuş bir köprüyle
// kullanıyor ve localStorage'ın TOPLAM sınırı var (çoğu tarayıcıda ~5 MB). Tek bir kaydın kendi
// sınırını (DEPO_SINIRI) geçmemesi yetmiyor: 523 KB'lık bir stok kaydı, depo başka kayıtlarla
// dolmuşsa yine yazılamıyor. Kullanıcının gördüğü hata "quota exceeded" oluyor ve HANGİ kaydın
// yer kapladığını söylemiyordu.
//
// Artifact ortamında localStorage yok; orada `null` döner ve çağıran yeri atlar.
function depoKullanimi() {
  if (typeof localStorage === "undefined" || !localStorage) return null;
  const kayitlar = [];
  let toplam = 0;
  let bizim = 0;
  let yabanci = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const tamAnahtar = localStorage.key(i);
      if (!tamAnahtar) continue;
      const deger = localStorage.getItem(tamAnahtar) || "";
      // Anahtar da yer kaplar; yalnızca değeri saymak toplamı olduğundan küçük gösterirdi.
      const bayt = new Blob([tamAnahtar + deger]).size;
      // BU UYGULAMANIN MI, BAŞKASININ MI?
      //
      // Dosyadan açılan sayfalar (file://) aynı depoyu PAYLAŞIYOR: telefondaki başka bir HTML
      // uygulaması da aynı localStorage'a yazıyor. Bildirilen olayda deponun %70'ini bu uygulamaya
      // ait OLMAYAN bir kayıt (`not-defteri:tasks`, 3,46 MB) doldurmuştu. "Ürün görsellerinizi
      // silin" demek, sorunu bizde aramaya yönlendiren yanlış bir tavsiye olurdu.
      const bizeAitMi = tamAnahtar.startsWith("atolye:");
      if (bizeAitMi) bizim += bayt; else yabanci += bayt;
      toplam += bayt;
      kayitlar.push({ anahtar: tamAnahtar.replace(/^atolye:/, ""), bayt, bizeAitMi });
    }
  } catch (e) {
    return null;
  }
  kayitlar.sort((a, b) => b.bayt - a.bayt);
  return { toplam, bizim, yabanci, kayitlar };
}

// localStorage'ın PRATİK sınırı ~5 milyon karakter (çoğu tarayıcıda 5 MB, UTF-16 sayımıyla).
// `navigator.storage.estimate()` bu sınırı BİLDİRMİYOR — o, IndexedDB/Cache gibi kotalı depoları
// ölçüyor ve localStorage için "0 B / 10 GB" gibi tamamen alakasız bir rakam döndürüyor.
// Bildirilen olayda tam olarak bu oldu; o rakama bakan bir panel depoyu bomboş sanırdı.
const LOCALSTORAGE_KARAKTER_SINIRI = 5 * 1024 * 1024;

// Tarayıcı deposunun dolduğunu söyleyen hata mı? Mesaj ve ad tarayıcıdan tarayıcıya değişiyor
// (Chrome "exceeded the quota", Safari "QuotaExceededError", Firefox kod 1014), bu yüzden hepsine
// bakılıyor — tek bir metne güvenmek bir tarayıcıda teşhisi kaçırırdı.
function kotaHatasiMi(hata) {
  if (!hata) return false;
  const ad = String(hata.name || "");
  const mesaj = String(hata.message || "");
  return /quota/i.test(ad) || /quota/i.test(mesaj) || hata.code === 22 || hata.code === 1014;
}

// TARAYICI KOTASI — artık ANLAMLI.
//
// `navigator.storage.estimate()` localStorage'ı kapsamıyor ama IndexedDB'yi KAPSIYOR. Veriler
// IndexedDB'ye taşındığı için (v1.69.0) bu ölçüm nihayet doğru şeyi gösteriyor: aynı cihazda
// 10 GB kota bildirmişti. Daha önce yanıltıcı olması, ölçümün değil BAKILAN DEPONUN yanlış olmasındandı.
async function depoKotasi() {
  try {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    const t = await navigator.storage.estimate();
    if (!t || typeof t.quota !== "number") return null;
    return { kullanilan: t.usage || 0, kota: t.quota };
  } catch (e) {
    return null;
  }
}

// localStorage kotası KARAKTER bazlı sayılır (UTF-16, karakter başına ~2 bayt); `veriBoyutu` ise
// UTF-8 bayt döndürür. İkisini karıştırmak, dolu bir depoyu yarı dolu göstermeye yol açıyordu.
function depoKarakterYuku() {
  if (typeof localStorage === "undefined" || !localStorage) return null;
  let karakter = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const a = localStorage.key(i);
      if (!a) continue;
      karakter += a.length + (localStorage.getItem(a) || "").length;
    }
  } catch (e) {
    return null;
  }
  return karakter;
}

function boyutMetni(bayt) {
  if (bayt < 1024) return `${bayt} B`;
  if (bayt < 1024 * 1024) return `${(bayt / 1024).toFixed(1)} KB`;
  return `${(bayt / (1024 * 1024)).toFixed(2)} MB`;
}

// ---- YAZMA KUYRUĞU ----
// Depolama çağrıları AYNI ANDA gönderildiğinde çakışıp biri hata verebiliyor. Bu, kodun başka bir
// yerinde zaten teşhis edilmiş bir davranış (bkz. MuhasebeModule > hareketEkle'deki not: kasa ve
// cari kayıtları art arda değil, await ile SIRAYLA yazılıyor).
//
// Ama o çözüm yereldi — sadece o iki çağrıyı kapsıyordu. Uygulama büyüdükçe aynı anda yazan başka
// çiftler ortaya çıktı: en belirgini SİLME işlemi, çünkü çöp kaydını (cop:data) ve asıl veriyi
// (örn. stok:items) neredeyse aynı anda yazıyor. Sonuç: ürün çöpe düşüyor ama stoktan silinmiyor.
//
// Çözüm merkezî olmalı: TÜM yazmalar tek bir kuyruğa girer, biri bitmeden diğeri başlamaz. Böylece
// her çağrı yerinde `await` yazmayı hatırlamaya gerek kalmaz — unutulan tek bir yer, sessiz veri
// tutarsızlığı demekti.
//
// Ayrıca geçici hatalar için bir kez tekrar denenir; kuyruk sayesinde tekrar denemeler de birbirine
// karışmaz.
let _yazmaKuyrugu = Promise.resolve();

function guvenliYaz(anahtar, deger, paylasimli) {
  if (VERI_KILIDI.aktif) {
    const simdi = Date.now();
    if (VERI_KILIDI_UYARI.bildir && simdi - VERI_KILIDI_UYARI.sonBildirim > 6000) {
      VERI_KILIDI_UYARI.sonBildirim = simdi;
      VERI_KILIDI_UYARI.bildir();
    }
    return Promise.resolve(null);
  }
  // Sınır aşımını depolamaya sormadan ÖNCE yakalıyoruz: depolamanın döndürdüğü hata mesajı genel
  // olduğu için kullanıcı "kaydedilemedi" görüp sebebini asla öğrenemiyordu.
  const bayt = veriBoyutu(deger);
  if (bayt > DEPO_SINIRI) {
    return Promise.reject(
      new Error(`BOYUT_ASIMI:${anahtar}:${bayt}`)
    );
  }
  const gorev = _yazmaKuyrugu.then(async () => {
    let sonHata = null;
    for (let deneme = 0; deneme < 3; deneme++) {
      try {
        return await window.storage.set(anahtar, deger, paylasimli);
      } catch (e) {
        sonHata = e;
        // Artan bekleme: anlık bir çakışma/hız sınırı ise ikinci ya da üçüncü deneme tutar.
        if (deneme < 2) await new Promise((r) => setTimeout(r, 200 * (deneme + 1)));
      }
    }
    throw sonHata || new Error("Depolama yazma hatası");
  });

  // Kuyruğun kendisi HATAYLA KIRILMAMALI: bir yazma başarısız olsa bile sıradakiler denenmeye devam
  // etmeli. Bu yüzden kuyruk zinciri ayrı, çağırana dönen söz (gorev) ayrı tutulur.
  _yazmaKuyrugu = gorev.catch(() => {});
  return gorev;
}

// Bir anahtarı, VAR OLUP OLMADIĞINI bilerek okur. window.storage.get, anahtar yoksa da okuma
// hatasında da HATA FIRLATIR — ikisini ayırt edemezsek "yeni kurulum" ile "veri okunamadı"yı
// karıştırırız. Bu yüzden önce mevcut anahtar listesi alınır.
//   • Anahtar listede yok  -> gerçekten boş, varsayılanla başla (normal ilk açılış).
//   • Anahtar listede var ama okunamıyor -> VERİ VAR AMA ERİŞİLEMİYOR: kilitle.
//   • Liste alınamıyor -> hangi durumda olduğumuzu bilemiyoruz: temkinli davranıp kilitle.
async function mevcutAnahtarlar() {
  try {
    const r = await window.storage.list("", true);
    return r && Array.isArray(r.keys) ? new Set(r.keys) : null;
  } catch (e) {
    return null;
  }
}

// Bir sonraki sipariş numarasını üretir. Eskiden numaralar LİSTE UZUNLUĞUNDAN türetiliyordu; bir
// kayıt silindiğinde uzunluk düşüyor ve hâlâ kullanımda olan bir numara ikinci kez veriliyordu.
// İki kaydın aynı numarayı taşıması, numaraya göre kurulmuş her bağlantıyı (planlama referansı,
// rezervasyon, cari fiş eşleşmesi) bozar. Bu yüzden sayım değil, KULLANILMIŞ EN BÜYÜK numara esas
// alınır — silinen numara bir daha asla geri dönmez.
function sonrakiSiparisNo(mevcutListe, onEk) {
  const enBuyuk = (mevcutListe || []).reduce((enb, s) => {
    if (!s || typeof s.siparisNo !== "string" || !s.siparisNo.startsWith(onEk)) return enb;
    const n = parseInt(s.siparisNo.slice(onEk.length), 10);
    return Number.isFinite(n) && n > enb ? n : enb;
  }, 1000);
  return onEk + (enBuyuk + 1);
}

async function guvenliOku(anahtar, anahtarKumesi) {
  // Anahtar listesi ALINABİLDİYSE ve anahtar listede yoksa: gerçekten yok. Okumaya bile gerek yok.
  if (anahtarKumesi && !anahtarKumesi.has(anahtar)) return { deger: null, hata: false, kesin: true };
  for (let deneme = 0; deneme < 2; deneme++) {
    try {
      const r = await window.storage.get(anahtar, true);
      return { deger: r ? r.value : null, hata: false, kesin: true };
    } catch (e) {
      if (deneme === 0) await new Promise((res) => setTimeout(res, 350));
    }
  }
  // Buraya düştüysek anahtar OKUNAMADI. İki ihtimal var ve ayırt etmek şart:
  //   • Anahtar listesi elimizdeyse ve anahtar listede VARSA -> gerçek okuma hatası, veri risk altında.
  //   • Liste alınamadıysa -> anahtar hiç var olmayabilir (yeni kurulum ya da yeni eklenen bir
  //     anahtar). Bunu "hata" saymak, uygulamayı sebepsiz yere kilitler.
  // ÖNCEKİ SÜRÜMÜN HATASI TAM OLARAK BUYDU: liste alınamadığında tüm anahtarlar hatalı sayılıyor,
  // yazma kilitleniyor ve kullanıcı hiçbir şeyi kaydedemiyordu. Artık kesin bilgi yoksa "şüpheli"
  // deriz; kilit kararı, aşağıda TÜM anahtarlar okunduktan sonra topluca verilir.
  return { deger: null, hata: !!anahtarKumesi, supheli: !anahtarKumesi, kesin: !!anahtarKumesi };
}

