// Bugünün tarihini YEREL GÜNE göre verir (YYYY-AA-GG).
//
// `bugunYerel()` UTC gününü döndürüyordu. Türkiye UTC+3 olduğu için
// gece yarısı ile 03:00 arasında girilen her kayıt BİR GÜN GERİYE damgalanıyordu: 30 Ağustos
// 00:05'te açılan sipariş "2026-08-29" olarak kaydediliyordu.
//
// Bu yalnızca görünüş meselesi değil: gün bazlı süzgeçler ("Bugün", "Bu Hafta") ve vade
// hesapları da yanlış güne düşüyordu.
function bugunYerel(tarih) {
  const d = tarih ? new Date(tarih) : new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Tarihi YEREL SAATLE, okunabilir biçimde yazar.
//
// Kayıtlar ISO/UTC olarak saklanıyor ("2026-08-29T21:00:45.842Z") — bu doğru: farklı saat
// dilimlerindeki iki bilgisayar aynı anı aynı şekilde kaydeder. Ama ham hâliyle EKRANA basmak,
// kullanıcıya UTC saatini gösteriyordu: Türkiye UTC+3 olduğu için 21:00Z aslında 00:00'dır.
// Kullanıcı haklı olarak "saat tutmuyor" diyordu.
//
// Saat isteğe bağlı: gün bazlı listelerde saat gürültüdür, fiş geçmişinde ise gereklidir.
function tarihYaz(deger, saatliMi) {
  if (!deger) return "";

  // SADECE GÜN olan değerler ("2026-08-30") ayrı ele alınır. JavaScript bu biçimi UTC gece
  // yarısı sayıyor; Türkiye UTC+3 olduğu için ekrana "30.08.2026 03:00" diye basılıyordu.
  // O 03:00 gerçek bir saat değil, saat dilimi çevirisinin artığı — kullanıcı haklı olarak
  // "tarih yanlış" diyordu. Cari hareketleri gün damgasıyla saklanıyor (bugunYerel), saatleri
  // yok; olmayan bir saati uydurmak yerine hiç göstermiyoruz.
  const sadeGun = /^\d{4}-\d{2}-\d{2}$/.test(String(deger).trim());
  if (sadeGun) {
    const [y, a, g] = String(deger).trim().split("-");
    return `${g}.${a}.${y}`;
  }

  const d = new Date(deger);
  if (isNaN(d.getTime())) return String(deger);
  const tarih = d.toLocaleDateString("tr-TR");

  // SAAT ARTIK VARSAYILAN. Önceden çağıranın açıkça istemesi gerekiyordu ve 13 çağrının 9'u
  // istemiyordu; sonuçta saati kaydedilmiş bir hareket bile ekranda yalnızca günle görünüyordu.
  // Kural basitleşti: değerde saat VARSA gösterilir, yoksa gösterilmez. Gün damgaları zaten
  // yukarıda ayrılıyor, yani buraya gelen her değerin gerçek bir saati var.
  // Çağıran açıkça `false` derse yine saatsiz yazılır (dar sütunlar için).
  if (saatliMi === false) return tarih;
  return `${tarih} ${d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
}

function stokYuvarla(sayi) {
  return Math.round((Number(sayi) || 0) * 1e6) / 1e6;
}

function kaynakRenkStili(kaynak) {
  const kod = KAYNAK_RENK[kaynak];
  if (!kod) return {};
  return {
    background: alfaEkle(kod, "14"),           // ~%8 opaklık: yazı okunaklı kalsın
    borderLeft: `4px solid ${kod}`,   // sol kenar kalın — dikey tararken göze çarpan yer
    border: `1px solid ${kod}55`,
  };
}

// =============================================================================================
// PROSES İKONLARI
//
// Renk tek başına yetmiyor: sekiz prosesten sonrası aynı renkleri tekrar kullanmaya başlıyor ve
// atölye ekranında hızlı bakışta hangi adımda olunduğu karışıyor. İkon, renkten bağımsız ikinci
// bir ayırt edici.
//
// DÜRÜST NOT: ikon kütüphanesinde "dikiş makinesi" ya da "taburede çekiç sallayan usta" gibi
// birebir karşılıklar yok. Aşağıdaki liste, mevcut ikonlar içinden anlamca en yakın olanları
// içeriyor — ve kullanıcı hepsini değiştirebiliyor, çünkü hangi ikonun neyi çağrıştırdığı
// atölyeden atölyeye değişir.
const PROSES_IKONLARI = {
  makas:      { Ikon: Scissors,    etiket: "Makas — kesim" },
  gomlek:     { Ikon: Shirt,       etiket: "Dikiş — saya" },
  cekic:      { Ikon: Hammer,      etiket: "Çekiç — kalfa" },
  tabure:     { Ikon: Armchair,    etiket: "Tabure — el işi" },
  ayakkabi:   { Ikon: Footprints,  etiket: "Ayakkabı — üste/monta" },
  acikKutu:   { Ikon: PackageOpen, etiket: "Açık kutu — temizleme/paketleme" },
  kutu:       { Ikon: Package,     etiket: "Kapalı kutu — sevkiyat" },
  parlak:     { Ikon: Sparkles,    etiket: "Parlaklık — cila/temizlik" },
  firca:      { Ikon: Paintbrush,  etiket: "Fırça — boya" },
  anahtar:    { Ikon: Wrench,      etiket: "Anahtar — montaj" },
  cetvel:     { Ikon: Ruler,       etiket: "Cetvel — ölçü/kalıp" },
  katman:     { Ikon: Layers,      etiket: "Katman — astar/taban" },
  alev:       { Ikon: Flame,       etiket: "Alev — ısı/pres" },
  damla:      { Ikon: Droplet,     etiket: "Damla — yapıştırma" },
  simsek:     { Ikon: Zap,         etiket: "Şimşek — hızlı işlem" },
};

// Proses adına bakarak makul bir ikon önerir. Kullanıcı ikon seçmediyse bu kullanılır;
// böylece hiçbir şey yapmadan da anlamlı ikonlar görünür.
function prosesIkonVarsayilan(prosesAdi) {
  const ad = String(prosesAdi || "").toLocaleLowerCase("tr-TR");
  if (/kesim|kes/.test(ad)) return "makas";
  if (/saya|dikiş|dikis/.test(ad)) return "gomlek";
  if (/kalfa/.test(ad)) return "cekic";
  if (/üste|uste|monta|çekme|cekme/.test(ad)) return "ayakkabi";
  if (/temizle|paket|kutula/.test(ad)) return "acikKutu";
  if (/cila|parlat/.test(ad)) return "parlak";
  if (/boya/.test(ad)) return "firca";
  if (/taban|astar/.test(ad)) return "katman";
  if (/pres|ısı|isi/.test(ad)) return "alev";
  if (/yapış|yapis|tutkal/.test(ad)) return "damla";
  if (/zigzag|kampre|rekapta/.test(ad)) return "anahtar";
  return "katman";
}

// Bir prosesin ikon bileşenini verir.
function ProsesIkonu({ proses, tanimlarProsesler, size = 14, color }) {
  const kayit = (tanimlarProsesler || []).find((p) => p.ad === proses);
  const anahtar = (kayit && kayit.ikon) || prosesIkonVarsayilan(proses);
  const secim = PROSES_IKONLARI[anahtar] || PROSES_IKONLARI.katman;
  const Ikon = secim.Ikon;
  return <Ikon size={size} color={color} />;
}

function prosesRengi(prosesAdi, sira) {
  const ad = String(prosesAdi || "").trim();
  if (!ad || ad === "Belirtilmemiş") return "var(--erp-text-3)";
  if (Number.isFinite(sira) && sira >= 0) return PROSES_PALETI[sira % PROSES_PALETI.length];
  let toplam = 0;
  for (let i = 0; i < ad.length; i++) toplam = (toplam * 31 + ad.charCodeAt(i)) % 100000;
  return PROSES_PALETI[toplam % PROSES_PALETI.length];
}

// Aynı rengin şeffaf tonu — zemin için. Renk koduna alfa eklemek, ayrı bir açık ton tanımlamaktan
// daha güvenilir: zemin her zaman çerçeveyle AYNI renktir, sadece soluk.
function prosesZemini(prosesAdi, sira) {
  return alfaEkle(prosesRengi(prosesAdi, sira), "0F"); // ~%6 opaklık
}

// =============================================================================================
// SİPARİŞ AMBALAJI (KUTU)
//
// Aynı model, müşterisine göre farklı kutuya girer. Bunu reçetede çözmek her kutu rengi için ayrı
// bir mamul renk varyantı açmayı gerektirirdi — hem reçete hem sipariş listesi şişerdi.
//
// Bunun yerine ambalaj SİPARİŞ SEVİYESİNDE bir tercihtir: reçetedeki ambalaj satırının rengi, o
// siparişte seçilen renkle DEĞİŞTİRİLİR. Reçete olduğu gibi kalır (varsayılan kutu orada tanımlı),
// sipariş yalnızca bir sapma bildirir. Sipariş kutu seçmezse reçetedeki renk kullanılır.
//
// Malzeme tipi "Ambalaj" olan hammaddeler kutu adayıdır; kullanıcının ayrıca işaretlemesi gerekmez.
// =============================================================================================
// RENK — ÇOKLU MALZEME TİPİ
//
// Bir renk birden fazla malzeme türünde kullanılabilir: "Kahve" hem astar hem taban rengi olabilir.
// Eskiden tek bir `malzemeTipi` alanı vardı ve aynı adlı rengi ikinci bir tiple eklemek sessizce
// reddediliyordu (mükerrer sayıldığı için) — kullanıcı rengi ekleyemiyor, sebebini de göremiyordu.
//
// Yeni yapı `malzemeTipleri` dizisidir. Eski kayıtlar tek değerli `malzemeTipi` taşır; aşağıdaki
// yardımcı ikisini de okur, böylece veri göçü gerekmez ve eski kayıtlar bozulmaz.
// Boş dizi = "Genel", yani her tipte kullanılabilir.
function renkTipleri(renk) {
  if (!renk) return [];
  if (Array.isArray(renk.malzemeTipleri)) return renk.malzemeTipleri.filter(Boolean);
  return renk.malzemeTipi ? [renk.malzemeTipi] : [];
}

// Bir renk, verilen malzeme tipinde kullanılabilir mi? Tipsiz (Genel) renkler HER tipte geçerlidir.
// Ölçüler (beden/boyut) de renkler gibi malzeme tipine bağlanabilir: bağcık boyutu "16 cm",
// kutu boyutu "Büyük Boy". Aynı `malzemeTipleri` alanı ve aynı yardımcılar kullanılır — iki ayrı
// mekanizma kurmak, ileride birinde yapılan düzeltmenin diğerine taşınmamasına yol açardı.
const olcuTipleri = renkTipleri;
const olcuTipeUygunMu = (olcu, malzemeTipi) => renkTipeUygunMu(olcu, malzemeTipi);

function renkTipeUygunMu(renk, malzemeTipi) {
  if (!malzemeTipi) return true;
  const tipler = renkTipleri(renk);
  return tipler.length === 0 || tipler.includes(malzemeTipi);
}

// Bir ürünün tedarikçisi. Yeni kayıtlar cari KİMLİĞİ tutar (`tedarikciId`); eski kayıtlarda ise
// serbest yazılmış bir METİN vardı (`tedarikci`). İkisini birden okur, böylece göç gerekmez.
// Kimlik tutmanın önemi: cari adı değiştiğinde ürün kartı kendiliğinden güncellenir ve sipariş
// oluştururken doğrudan o cari seçilebilir — metin eşleştirmeye çalışmak gerekmez.
function urunTedarikcisi(urun, cariler) {
  if (!urun) return null;
  if (urun.tedarikciId) {
    const c = (cariler || []).find((x) => x.id === urun.tedarikciId);
    if (c) return { id: c.id, unvan: c.unvan, pasif: !!c.pasif };
    // Cari silinmişse kimlik yetim kalır; eski metin varsa onu göster, yoksa durumu belli et.
    return { id: null, unvan: urun.tedarikci || "(silinmiş cari)", silinmis: true };
  }
  return urun.tedarikci ? { id: null, unvan: urun.tedarikci, eskiKayit: true } : null;
}

// Ürün adlarını karşılaştırmak için normalleştirir: büyük/küçük harf farkı ve baştaki/sondaki
// boşluklar yok sayılır. Ayrıca içerideki ardışık boşluklar teke indirilir — "Deri  Nubuk" ile
// "Deri Nubuk" aynı üründür.
//
// toLocaleLowerCase("tr-TR") gerekli: JavaScript'in varsayılan küçültmesi "I" harfini "i" yapar,
// oysa Türkçede "I"nın küçüğü "ı"dır. "KIRMIZI" ile "kırmızı" varsayılan yöntemle FARKLI görünür.
function urunAdiAnahtari(ad) {
  return String(ad || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}


// KULLANILMIŞ EN BÜYÜK ÜRETİM NUMARASI.
//
// Numara SİLİNEN üretimleri de sayarak üretilir. Yalnızca mevcut üretimlere bakmak, silinen bir
// üretimin numarasını bir sonrakine geri veriyordu: eski fişler, etiketler ve parça barkodları
// ("1001-1") o numaraya bağlı kalıyor ve yeni üretime aitmiş gibi görünüyordu. Kullanıcının
// bildirdiği durum tam olarak buydu.
//
// Silinen kayıtlar çöp kutusunda TAM KOPYA olarak duruyor; numara oradan okunuyor. Çöp kutusu
// boşaltılırsa numara yeniden kullanılabilir hale gelir — bu, çöpü boşaltmanın bilinen bedeli.
// ÜRETİM NUMARALARI 5 HANE, 10001'DEN BAŞLAR.
//
// Personel barkodları proses bantlarından geliyor ve 4 hane (Kesim 1000-1999, Saya 2000-2999…).
// Üretim numaraları da 1001'den başlıyordu: "1001 üretim barkodu" ile "1001 kesici barkodu"
// çakışıyordu. Okutulan kod ikisinden hangisi belli olmuyordu.
//
// Ayrım HANE SAYISIYLA yapılıyor (kullanıcı kararı): personel 4 hane, üretim 5 hane. Harf ön eki
// de düşünüldü ama üretim numarası fiş numaralarında, etiketlerde ve ekranlarda görünen bir şey;
// biçimini değiştirmek bütün geçmişi okunmaz kılardı.
const URETIM_NO_TABAN = 10000;

function enBuyukUretimNo(uretim, cop) {
  let enb = URETIM_NO_TABAN;
  const bak = (no) => {
    const n = parseInt(no, 10);
    if (Number.isFinite(n) && n > enb) enb = n;
  };
  (uretim || []).forEach((o) => bak(o.siparisNo));
  (cop || []).forEach((k) => {
    if (k && k.tur === "uretim" && k.veri) bak(k.veri.siparisNo);
  });
  return enb;
}

// ÜRETİM BÖLÜNDÜ MÜ?
//
// Bildirilen hata: 104 çiftlik iş Saya'da 64 + 40 diye bölündü, Kalfa'da yine 104 olarak geldi.
// Sebep: ana kod (`10006`) bölünmeden SONRA da "kalanın tamamını al" anlamına geliyordu; Kalfa
// adımında hiç atama olmadığı için tamamı tek parça alınıyor ve iki parça birleşmiş gibi
// görünüyordu.
//
// Kullanıcının kuralı: "10006 üretimini kapatıp yoluna 10006-1 ve 10006-2 olarak devam etmesi
// gerekirdi." Yani bir kez bölünen üretimin ANA KODU KAPANIR; iş artık parça kodlarıyla yürür.
function uretimBolunmusMu(u) {
  const anaKod = (u && (u.takipKodu || u.siparisNo)) || "";
  return ((u && u.prosesIlerleme) || []).some((adim) =>
    (adim.atamalar || []).some((a) => a.barkod && a.barkod !== anaKod));
}

// Bir üretimin bölünmüş parça kodları (tekrarsız, sayısal sırayla).
function uretimParcaKodlari(u) {
  const anaKod = (u && (u.takipKodu || u.siparisNo)) || "";
  const kodlar = [];
  ((u && u.prosesIlerleme) || []).forEach((adim) => {
    (adim.atamalar || []).forEach((a) => {
      if (a.barkod && a.barkod !== anaKod && !kodlar.includes(a.barkod)) kodlar.push(a.barkod);
    });
  });
  return kodlar.sort((a, b) => String(a).localeCompare(String(b), "tr", { numeric: true }));
}
