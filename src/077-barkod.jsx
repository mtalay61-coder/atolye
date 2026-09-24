// ================= BARKOD =================
//
// NEDEN KENDİ ÜRETİYORUZ
// Uygulama çevrimdışı da çalışıyor; barkod görselini bir servisten ya da CDN kütüphanesinden almak,
// internet yokken boş etiket basmak demekti. Code128 kodlaması küçük ve tam olarak belirlenmiş bir
// standart — burada üretiliyor.
//
// CODE128-B seçildi: rakam ve harf birlikte taşıyabiliyor. Sadece rakam taşıyan Code128-C daha kısa
// çubuk üretir ama ileride "K-" gibi ön ekli koli kodları da basılacak; tek kodlama ile devam etmek
// iki ayrı çözücü tutmaktan yeğdir.

// 107 desenin her biri 6 haneli: çubuk-boşluk genişlikleri (1-4 birim), sırayla.
// Standart tablo; elle değiştirilmemeli — tek hane hatası okunmayan barkod demektir.
const CODE128_DESENLER = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
  "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
  "114131","311141","411131","211412","211214","211232","233111",
];

// Kodu Code128-B çubuk dizisine çevirir. Dönen dizi: her elemanın genişliği (birim), sırayla
// çubuk-boşluk-çubuk… şeklinde. Geçersiz karakter varsa null döner — yanlış basılmış bir etiket,
// okunmayan etiketten daha kötüdür (yanlış ürünü sayar).
function code128Cubuklar(metin) {
  const s = String(metin || "");
  if (!s) return null;
  const degerler = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.charCodeAt(i);
    if (k < 32 || k > 126) return null;   // Code128-B aralığı
    degerler.push(k - 32);
  }
  const BASLA_B = 104;
  let toplam = BASLA_B;
  degerler.forEach((d, i) => { toplam += d * (i + 1); });
  const kontrol = toplam % 103;

  const desenler = [CODE128_DESENLER[BASLA_B], ...degerler.map((d) => CODE128_DESENLER[d]),
    CODE128_DESENLER[kontrol], CODE128_DESENLER[106]];
  const cubuklar = [];
  desenler.forEach((desen) => {
    for (let i = 0; i < desen.length; i++) cubuklar.push(Number(desen[i]));
  });
  // BİTİŞ ÇUBUĞU. Code128'in bitiş karakteri diğerlerinden farklı: 6 değil 7 elemanlı (2331112).
  // Tabloda altı hane tutulup sondaki 2 birimlik ÇUBUK burada ekleniyor. Bu çubuk olmadan
  // okuyucuların çoğu barkodu hiç okumuyor — testte tam olarak bu yakalandı.
  cubuklar.push(2);
  return cubuklar;
}

// Yazdırılabilir SVG. Genişlik çubuk sayısına göre hesaplanıyor; sabit genişliğe sıkıştırmak
// ince çubukları yuvarlatıp okunmaz hale getiriyordu.
// ---- CODE128 ÇÖZÜCÜ (22 Eylül, v1.411.0 — depoda telefon kamerasıyla okutma) ----------------
//
// NEDEN KENDİ ÇÖZÜCÜMÜZ: Android Chrome'da tarayıcının `BarcodeDetector`ı var ve önce o deneniyor;
// iPhone Safari'de YOK. Dış kütüphane eklemek yerine (çevrimdışı çalışma, "dışarıya bir şey
// gitmez" kararı) kodlayıcıyla AYNI tabloyu kullanan bir çözücü: hangi barkodu ürettiğimizi tam
// biliyoruz — yalnız Code128-B, kendi etiketlerimiz.
//
// YANLIŞ OKUMA, OKUMAMAKTAN KÖTÜ: her karakter en yakın desene eşleniyor ama sonuç ANCAK kontrol
// hanesi tutarsa kabul ediliyor; tutmazsa null (kamera bir sonraki karede yeniden dener).
//
// Adımlar: parlaklık satırı → yerel eşikle siyah/beyaz → koşu (run) genişlikleri → Start-B arama →
// her 6 koşuyu KENDİ toplamıyla 11 modüle normalle (ölçek kayması, eğik tutma) → en yakın desen →
// Stop → kontrol hanesi. Barkod ters tutulduysa kosular6 ters çevrilip yeniden denenir.
const CODE128_GENISLIKLER = CODE128_DESENLER.map((d) => d.split("").map(Number));
const CODE128_BASLA_B = 104;
const CODE128_DUR = 106;

// 6 koşuluk bir karakteri tablodaki en yakın desene eşler: { deger, hata } ya da null.
function code128KarakterEsle(kosular6) {
  const toplam = kosular6.reduce((t, w) => t + w, 0);
  if (toplam <= 0) return null;
  const n = kosular6.map((w) => (w * 11) / toplam);
  let enIyi = -1, enAz = Infinity;
  for (let i = 0; i < CODE128_GENISLIKLER.length; i++) {
    const d = CODE128_GENISLIKLER[i];
    let h = 0;
    for (let j = 0; j < 6; j++) { const f = n[j] - d[j]; h += f * f; }
    if (h < enAz) { enAz = h; enIyi = i; }
  }
  // Bir modülden fazla sapma: bu kosular6 bir karakter değil (gürültü ya da yanlış hizalama).
  if (enAz > 1.6) return null;
  return { deger: enIyi, hata: enAz };
}

// Koşu dizisinden (çubuk ile başlayan, çubuk-boşluk sırayla) Code128-B metni; bulunamazsa null.
function code128KosulardanCoz(kosular) {
  for (let bas = 0; bas + 6 * 3 + 7 <= kosular.length; bas += 2) {
    const basla = code128KarakterEsle(kosular.slice(bas, bas + 6));
    if (!basla || basla.deger !== CODE128_BASLA_B) continue;
    const degerler = [];
    let i = bas + 6;
    let bitti = false;
    while (i + 6 <= kosular.length) {
      const k = code128KarakterEsle(kosular.slice(i, i + 6));
      if (!k) break;
      if (k.deger === CODE128_DUR) { bitti = true; break; }
      if (k.deger >= 103) break;   // başka bir Start ya da geçersiz
      degerler.push(k.deger);
      i += 6;
    }
    if (!bitti || degerler.length < 2) continue;
    const kontrol = degerler.pop();
    let t = CODE128_BASLA_B;
    degerler.forEach((d, j) => { t += d * (j + 1); });
    if (t % 103 !== kontrol) continue;
    return degerler.map((d) => String.fromCharCode(d + 32)).join("");
  }
  return null;
}

// Bir parlaklık satırını (0-255 dizisi) çözer. Eşik YEREL: kağıdın bir yanı gölgede kalsa da
// çubuklar ayrılsın diye her noktada çevresindeki en koyu ve en açığın ortası.
function code128SatirdanCoz(parlaklik) {
  const n = parlaklik.length;
  if (n < 40) return null;
  const pencere = Math.max(12, Math.round(n / 12));
  const koyu = new Uint8Array(n);
  let genelMin = 255, genelMax = 0;
  for (let x = 0; x < n; x++) { if (parlaklik[x] < genelMin) genelMin = parlaklik[x]; if (parlaklik[x] > genelMax) genelMax = parlaklik[x]; }
  if (genelMax - genelMin < 40) return null;   // karşıtlık yok: boş kare
  for (let x = 0; x < n; x++) {
    let mn = 255, mx = 0;
    const a = Math.max(0, x - pencere), b = Math.min(n - 1, x + pencere);
    for (let j = a; j <= b; j++) { const v = parlaklik[j]; if (v < mn) mn = v; if (v > mx) mx = v; }
    // Düz bölgede (çevrede karşıtlık yok) genel ortaya göre karar ver — gürültü çubuk sanılmasın.
    const esik = mx - mn < (genelMax - genelMin) / 4 ? (genelMin + genelMax) / 2 : (mn + mx) / 2;
    koyu[x] = parlaklik[x] < esik ? 1 : 0;
  }
  const kosular = [];
  let x = 0;
  while (x < n && !koyu[x]) x++;               // ilk çubuğa kadar atla
  while (x < n) {
    const renk = koyu[x];
    let u = 0;
    while (x < n && koyu[x] === renk) { u++; x++; }
    kosular.push(u);
  }
  if (kosular.length % 2 === 0) kosular.pop(); // sondaki beyaz (sessiz alan) koşusu değil
  const duz = code128KosulardanCoz(kosular);
  if (duz) return duz;
  // Ters tutulmuş barkod: okuma yönünü çevir.
  const ters = kosular.slice().reverse();
  return code128KosulardanCoz(ters);
}

// Kamera karesini (ImageData) çözer: ortadaki bantta birkaç yatay satır denenir; ilk tutan döner.
function kameraKaresiCoz(goruntu) {
  const { width: w, height: h, data } = goruntu;
  const satirlar = [0.5, 0.45, 0.55, 0.4, 0.6, 0.35, 0.65, 0.3, 0.7];
  for (const oran of satirlar) {
    const y = Math.round(h * oran);
    const p = new Uint8Array(w);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      p[x] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    }
    const kod = code128SatirdanCoz(p);
    if (kod) return kod;
  }
  return null;
}

function barkodSvg(kod, { birim = 2, yukseklik = 46, yaziGoster = true } = {}) {
  const cubuklar = code128Cubuklar(kod);
  if (!cubuklar) return "";
  const toplamBirim = cubuklar.reduce((t, g) => t + g, 0);
  const genislik = toplamBirim * birim;
  const yaziAlani = yaziGoster ? 14 : 0;
  let x = 0;
  let ciz = "";
  cubuklar.forEach((genisligi, i) => {
    const w = genisligi * birim;
    // Çift indisler ÇUBUK, tekler BOŞLUK — Code128 böyle başlar ve sırayla gider.
    if (i % 2 === 0) ciz += `<rect x="${x}" y="0" width="${w}" height="${yukseklik}" fill="#000"/>`;
    x += w;
  });
  const yazi = yaziGoster
    ? `<text x="${genislik / 2}" y="${yukseklik + 11}" text-anchor="middle" font-family="monospace" font-size="11" fill="#000">${kod}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${genislik}" height="${yukseklik + yaziAlani}" viewBox="0 0 ${genislik} ${yukseklik + yaziAlani}">${ciz}${yazi}</svg>`;
}

// ---- ESKİ ÇİFT BARKODU (KALDIRILDI, v1.136.0) -------------------------------------------------
//
// `8xxxxxxx` biçimli çift barkodları `variant.barkod` üstünde duruyordu. İki sebeple kaldırıldı:
//
//   1. KALICI DEĞİLDİ. `varyantlar` tablosunun sütunları TABLO_SEMA'da tek tek sayılıyor ve
//      `barkod` orada YOKTU; okuma tarafında da yoktu. Açılışta bulut kopyası yereli ezdiği için
//      atanan kodlar her yenilemede siliniyor, toplu atama sayacı baştan başlıyor ve AYNI KOD
//      BAŞKA VARYANTA düşebiliyordu. Basılmış etiket yanlış malı gösterir — okunmayan etiketten
//      kötüsü budur.
//   2. Yeni şema aynı işi kalıcı alanlardan kuruyor (aşağıda). İki kod ailesini birlikte taşımak,
//      hangi kodun hangi ekranda geçerli olduğunu ayrı ayrı hatırlamak demekti.
//
// Aynı sebeple `A-<varyantBarkod>-<asortiId>` biçimli asorti barkodu da kaldırıldı (kullanıcı
// kararı, 5 Eylül: "temiz geçiş"). O biçimle basılmış etiket varsa yeniden basılmalı.

// ---- KALICI KOD ŞEMASI ------------------------------------------------------------------------
//
// Kullanıcı (5 Eylül): "Barkod oluştururken bir hikâyeye göre oluştursun. Barkod hep 90 ile
// başlasın. Renk, beden, stok hepsinin arka planda kodu olsun — 42 no beden aslında 04 nolu beden
// gibi. Bu işleri kullanıcı da görsün ama değiştiremesin."
//
// Karar: stok no 4 hane, renk 4, beden 2, asorti 3. SEVİYE HANESİ YOK — dört seviyenin uzunlukları
// farklı olduğu için kodun uzunluğu hangi seviyede olduğunu söylüyor:
//
//     90 + stok(4)                        6 hane   900003          sadece stok
//     90 + stok(4) + renk(4)             10 hane   9000031021      stok + renk
//     90 + stok(4) + renk(4) + beden(2)  12 hane   900003102104    stok + renk + beden
//     90 + stok(4) + renk(4) + asorti(3) 13 hane   9000031021225   stok + renk + asorti
//
// UZUNLUKLAR ŞEMANIN PARÇASI. Bir alanın hane sayısı değişirse iki seviye aynı uzunluğa düşer ve
// kod çözülemez hâle gelir; hane sayıları tek yerde (KOD_HANE) duruyor ve uzunluklar oradan
// hesaplanıyor ki ikisi ayrışamasın.
//
// KODLAR TÜRETİLMİYOR, ATANIYOR. Ürünün ya da rengin ADI değişince kod DEĞİŞMEZ, basılmış etiket
// geçerli kalır. Bu ders bu projede üç kez öğrenildi (varyant barkodları, parça barkodları ve
// v1.135.0'ın türetilmiş asorti barkodu). Kod bir kez atanır; kullanıcı görür, değiştiremez.
const BARKOD_ON_EK = "90";

// "Standart" BİR TANIM DEĞİL, YER TUTUCU. Renksiz/ölçüsüz stok kartlarında (tutkal, toka, çelikli
// taban) uygulama varyanta doğrudan "Standart" yazıyor (152-stok.jsx); `tanimlar.renkler` ya da
// `tanimlar.bedenler` içinde karşılığı YOK ve olmamalı — kullanıcının her ölçüsüz malzeme için
// "Standart" diye bir beden tanımlaması anlamsız olurdu.
//
// Bu yüzden 0 numarası AYRILDI: kod atama 1'den başlıyor, 0 hiçbir kayda verilmiyor. Ölçüsüz bir
// malzemenin barkodu böyle kuruluyor: 90 · stok · renk · 00.
//
// Kullanıcı gerçekten "Standart" adında bir renk/beden TANIMLARSA o tanımın kendi kodu kazanır —
// arama önce tanıma bakıyor, yer tutucuya sonra düşüyor.
const OLCUSUZ_AD = "Standart";
const OLCUSUZ_KOD = 0;
// `cari` BARKODUN PARÇASI DEĞİL — barkod uzunlukları aşağıda yalnız stok/renk/beden/asorti'den
// hesaplanıyor. Burada duruyor çünkü aynı makineyi kullanıyor: atanır, sayaç geri gitmez,
// silinen numara yeniden verilmez.
const KOD_HANE = { stok: 4, renk: 4, beden: 2, asorti: 3, cari: 4 };
const BARKOD_UZUNLUK = {
  stok: BARKOD_ON_EK.length + KOD_HANE.stok,
  renk: BARKOD_ON_EK.length + KOD_HANE.stok + KOD_HANE.renk,
  beden: BARKOD_ON_EK.length + KOD_HANE.stok + KOD_HANE.renk + KOD_HANE.beden,
  asorti: BARKOD_ON_EK.length + KOD_HANE.stok + KOD_HANE.renk + KOD_HANE.asorti,
};

// Sayıyı sabit haneye çevirir. Hane taşarsa BOŞ döner — kırpmak, başka bir kaydın barkodunu
// basmak demektir. Boş kod "etiket basılamaz" diye görünür; yanlış kod sessizce yanlış malı sayar.
function kodMetni(sayi, hane) {
  // null/undefined/"" ÖNCE eleniyor: `Number(null)` sıfır veriyor ve kodu atanmamış bir kayıt,
  // ayrılmış "Standart" kodunu (0000) almış gibi görünürdü.
  if (sayi === null || sayi === undefined || sayi === "") return "";
  const n = Number(sayi);
  if (!Number.isInteger(n) || n < 0) return "";
  const s = String(n);
  return s.length > hane ? "" : s.padStart(hane, "0");
}

// Sayaçlar `tanimlar.kodSayaclari` içinde duruyor ve GERİ GİTMİYOR: bir kaydı silmek numarasını
// serbest bırakmaz. Sayaç tutulmasaydı en yüksek numaralı renk silindiğinde o numara bir sonraki
// renge verilirdi ve basılmış etiket başka rengi gösterirdi.
function kodSayacIlerlet(sayaclar, aile, kullanilan) {
  const ust = Math.pow(10, KOD_HANE[aile]) - 1;
  let n = sayaclar[aile] || 0;
  while (n < ust) {
    n += 1;
    sayaclar[aile] = n;
    if (!kullanilan.has(n)) { kullanilan.add(n); return n; }
  }
  return null;   // aile doldu — çağıran bunu kullanıcıya söylemek zorunda
}

// Kodu OLMAYAN kayıtlara kod atar; olanlara DOKUNMAZ. Yeni bir renk/beden/asorti tanımlandığında
// da, eski kayıtları toplu doldururken de aynı yol kullanılıyor — iki ayrı atama mantığı,
// ayrışacak iki mantık demekti.
//
// Ölçü listesi bedenleri VE boyutları birlikte tutuyor (`tip` ile ayrılıyorlar); ikisi de aynı
// numara havuzundan besleniyor, yani boyut için ayrı bir seviye gerekmiyor.
function kodlariAta(stok, tanimlar) {
  const t = tanimlar || {};
  const sayaclar = { ...(t.kodSayaclari || {}) };
  const atanan = { stok: 0, renk: 0, beden: 0, asorti: 0 };
  const dolan = [];

  // Model rengi (kombinasyon) kodları renk koduyla AYNI 4 haneli alanı paylaşıyor (barkodda renk
  // yerine giriyor); renk sayacı o numaraları atlamalı — iki ayrı rengin aynı kodu olması, okutulan
  // etiketin başka rengi göstermesi demek.
  const kombinasyonKodlari = new Set((t.renkKombinasyonlari || []).map((k) => Number(k.kod)).filter((v) => v > 0));
  const doldur = (liste, aile, kodAl, kodYaz) => {
    const kullanilan = new Set(aile === "renk" ? kombinasyonKodlari : []);
    (liste || []).forEach((k) => { const v = Number(kodAl(k)); if (v > 0) kullanilan.add(v); });
    return (liste || []).map((k) => {
      if (Number(kodAl(k)) > 0) return k;
      const n = kodSayacIlerlet(sayaclar, aile, kullanilan);
      if (n === null) { if (!dolan.includes(aile)) dolan.push(aile); return k; }
      atanan[aile] += 1;
      return kodYaz(k, n);
    });
  };

  return {
    stok: doldur(stok, "stok", (u) => u.stokNo, (u, n) => ({ ...u, stokNo: n })),
    tanimlar: {
      ...t,
      // ALAN ADI `barkodKodu`, `kod` DEĞİL. `renk.kod` ZATEN DOLU: kullanıcının elle girdiği ton
      // kodu ("aynı isimli farklı tonları ayırt etmek için", bkz. onRenkTonKoduChange) ve
      // 130-tanimlar orada sayısal kombinasyon kodu arıyor. Barkod kodunu oraya yazmak kullanıcının
      // girdiği kodları ezerdi; tersinden, kullanıcının yazdığı "101" barkod kodu sanılırdı.
      // İkisi farklı iki şey: ton kodu serbest metin ve DEĞİŞTİRİLEBİLİR, barkod kodu atanır ve
      // değişmez — biri değişince basılmış etiket geçersiz olur.
      renkler: doldur(t.renkler, "renk", (r) => r.barkodKodu, (r, n) => ({ ...r, barkodKodu: n })),
      bedenler: doldur(t.bedenler, "beden", (b) => b.barkodKodu, (b, n) => ({ ...b, barkodKodu: n })),
      asortiler: doldur(t.asortiler, "asorti", (a) => a.barkodKodu, (a, n) => ({ ...a, barkodKodu: n })),
      kodSayaclari: sayaclar,
    },
    atanan,
    dolan,
  };
}

// CARİ KODU — kullanıcı (6 Eylül): "Tüm carilere değişmez kod verilmeli, ekranda görünmeli,
// değişmez kod id gibi."
//
// Carinin zaten bir `id`si var ama o iç kimlik: ekranda okunmaz, telefonda söylenmez, faturada
// yazılmaz. Bu kod insan içindir. Unvan değişse de değişmiyor ("Ahmet Tekstil" → "Ahmet Tekstil
// Ltd." aynı cari), silinen numara yeniden verilmiyor (sayaç `tanimlar.kodSayaclari`'nda ve geri
// gitmiyor) — yoksa eski bir evrakta yazan kod başka bir cariyi gösterirdi.
function cariKodlariAta(cariler, tanimlar) {
  const t = tanimlar || {};
  const sayaclar = { ...(t.kodSayaclari || {}) };
  const kullanilan = new Set();
  (cariler || []).forEach((c) => { const n = Number(c.kod); if (n > 0) kullanilan.add(n); });

  let atanan = 0;
  let doldu = false;
  const yeni = (cariler || []).map((c) => {
    if (Number(c.kod) > 0) return c;
    const n = kodSayacIlerlet(sayaclar, "cari", kullanilan);
    if (n === null) { doldu = true; return c; }
    atanan += 1;
    return { ...c, kod: n };
  });
  return { cariler: yeni, tanimlar: { ...t, kodSayaclari: sayaclar }, atanan, doldu };
}

// Ekranda gösterilecek hâli. Kodu olmayan cari "—" değil BOŞ dönüyor; çağıran rozeti hiç
// çizmiyor, böylece "kodu var ama okunamıyor" izlenimi doğmuyor.
const cariKodMetni = (cari) => (Number(cari && cari.kod) > 0
  ? String(cari.kod).padStart(KOD_HANE.cari, "0") : "");

const kodEsit = (a, b) =>
  String(a || "").toLocaleLowerCase("tr-TR") === String(b || "").toLocaleLowerCase("tr-TR");

// Varyantın rengini tanımlı renge bağlar: ÖNCE kimlik, sonra ad. `renkId` asıl bağ, `renk` yalnızca
// okunabilir önbellek (bkz. 045-oku) — ada güvenmek, yeniden adlandırmada kodu kaybettirirdi.
//
// KOD DEĞİL KAYIT döndürüyor: "bu renk hiç tanımlı değil" ile "tanımlı ama kodu yok" iki ayrı
// sorun. İkisini tek bir sıfıra ezmek, kullanıcıya basınca hiçbir şeyin değişmediği bir
// "kodları ata" düğmesi göstermek demekti.
function renkTanimiBul(tanimlar, renkId, renkAd) {
  const liste = (tanimlar && tanimlar.renkler) || [];
  const renk = (renkId && liste.find((r) => r.id === renkId)) || liste.find((r) => kodEsit(r.ad, renkAd)) || null;
  if (renk) return renk;
  // MODEL RENGİ (renk kombinasyonu) — kullanıcı (12 Eylül, ekran görüntüsüyle): "model rengi
  // eşleşmeyen herhalde, orada kod tanımsızlığı var". Mamulün varyant rengi "1001 - KAHVE SÜET/Bej"
  // gibi bir kombinasyon etiketi; `tanimlar.renkler`de değil `renkKombinasyonlari`nde. Buraya
  // bakılmadığı için barkod "renk tanımsız" diyordu. Kombinasyon kendi 4 haneli KODUYLA (1001…)
  // renk kodu olarak barkoda giriyor — kod zaten değişmez ve tekil.
  return modelRengiTanimiBul(tanimlar, renkId, renkAd);
}

// Kombinasyonu tanım biçiminde döndürür: { id, ad (etiket), barkodKodu (kombinasyon kodu),
// modelRengiMi }. Eşleşme: kimlik, etiket, ya da etiketin "KOD - " başı (adlar değişse de kod kalır).
function modelRengiTanimiBul(tanimlar, renkId, renkAd) {
  const kombiler = (tanimlar && tanimlar.renkKombinasyonlari) || [];
  const renkler = (tanimlar && tanimlar.renkler) || [];
  const etiket = (k) => `${k.kod} - ${(k.renkIdler || []).map((id) => ((renkler.find((r) => r.id === id) || {}).ad || "?")).join("/")}`;
  const ad = String(renkAd || "");
  const k = (renkId && kombiler.find((x) => x.id === renkId))
    || kombiler.find((x) => kodEsit(etiket(x), ad))
    || kombiler.find((x) => x.kod && ad.startsWith(`${x.kod} - `))
    || null;
  if (!k) return null;
  return { id: k.id, ad: etiket(k), barkodKodu: /^\d+$/.test(String(k.kod || "")) ? Number(k.kod) : null, modelRengiMi: true };
}

// Barkod renk kodunu tanıma çevirir: önce renk tanımları, sonra model renkleri (kombinasyon kodu).
function renkTanimiKoddanBul(tanimlar, renkKod) {
  const renk = ((tanimlar && tanimlar.renkler) || []).find((r) => Number(r.barkodKodu) === renkKod);
  if (renk) return renk;
  const kombi = ((tanimlar && tanimlar.renkKombinasyonlari) || []).find((k) => Number(k.kod) === renkKod);
  return kombi ? modelRengiTanimiBul(tanimlar, kombi.id, "") : null;
}

// Beden ile boyut AYNI listede; ürünün ölçü tipi hangisine bakılacağını söyler. "42" hem beden hem
// boyut olarak tanımlıysa ikisi ayrı kayıt ve ayrı koddur.
function olcuTanimiBul(tanimlar, bedenAd, olcuTipi) {
  const tip = olcuTipi === "Boyut" ? "Boyut" : "Beden";
  return ((tanimlar && tanimlar.bedenler) || [])
    .find((b) => (b.tip || "Beden") === tip && kodEsit(b.ad, bedenAd)) || null;
}

// Kod yoksa NULL dönüyor, sıfır değil: sıfır artık geçerli bir kod ("Standart"). İkisini tek
// değere ezmek, kodu atanmamış bir rengi ölçüsüz sanmak demekti.
const renkKoduBul = (tanimlar, renkId, renkAd) => {
  const t = renkTanimiBul(tanimlar, renkId, renkAd);
  if (t) return t.barkodKodu ? Number(t.barkodKodu) : null;
  return kodEsit(renkAd, OLCUSUZ_AD) ? OLCUSUZ_KOD : null;
};
const bedenKoduBul = (tanimlar, bedenAd, olcuTipi) => {
  const t = olcuTanimiBul(tanimlar, bedenAd, olcuTipi);
  if (t) return t.barkodKodu ? Number(t.barkodKodu) : null;
  return kodEsit(bedenAd, OLCUSUZ_AD) ? OLCUSUZ_KOD : null;
};

// Barkodu kurulamayan yerleri SEBEBİYLE birlikte çıkarır. Üç ayrı sebep var ve çözümleri farklı:
//   - stok no yok / renk-ölçü tanımlı ama kodsuz  → "Eksik kodları ata" düğmesi çözer
//   - renk ya da ölçü HİÇ TANIMLI DEĞİL           → yalnızca kullanıcı tanım ekleyerek çözer
// Eski şemada kod varyantın üstüne yazıldığı için tanımsız renk de barkod alabiliyordu; yeni
// şemada kod tanımdan geliyor, dolayısıyla tanımsız renk/ölçü artık görünür bir eksik.
function barkodEksikleri(stok, tanimlar) {
  const stokNosuz = [];
  const kodsuz = new Set();
  const tanimsiz = new Set();
  (stok || []).forEach((u) => {
    if (!u.stokNo) stokNosuz.push(u.ad || u.id);
    const tip = u.olcuTipi === "Boyut" ? "Boyut" : "Beden";
    (u.variants || []).forEach((v) => {
      // "Standart" yer tutucusu EKSİK SAYILMAZ: ayrılmış kodu var, tanımlanması beklenmiyor.
      const rt = renkTanimiBul(tanimlar, v.renkId, v.renk);
      if (!rt) { if (!kodEsit(v.renk, OLCUSUZ_AD)) tanimsiz.add(`renk: ${v.renk || "?"}`); }
      else if (!rt.barkodKodu) kodsuz.add(`renk: ${rt.ad}`);
      const ot = olcuTanimiBul(tanimlar, v.beden, u.olcuTipi);
      if (!ot) { if (!kodEsit(v.beden, OLCUSUZ_AD)) tanimsiz.add(`${tip.toLocaleLowerCase("tr-TR")}: ${v.beden || "?"}`); }
      else if (!ot.barkodKodu) kodsuz.add(`${tip.toLocaleLowerCase("tr-TR")}: ${ot.ad}`);
    });
  });
  const kodsuzListe = Array.from(kodsuz);      // sirasiz-tamam
  const tanimsizListe = Array.from(tanimsiz);  // sirasiz-tamam
  return {
    stokNosuz,
    kodsuz: kodsuzListe,
    tanimsiz: tanimsizListe,
    // Düğmenin İŞE YARAYIP yaramayacağı: atanacak bir şey yoksa düğme gösterilmemeli.
    atamaCozer: stokNosuz.length > 0 || kodsuzListe.length > 0,
  };
}

// Kodları birleştirir. Parçalardan biri eksikse BOŞ döner: yarım bir kod basmak, okutulduğunda
// başka bir seviyeye denk gelebilir.
function urunBarkoduKur(seviye, { stokNo, renkKod, bedenKod, asortiKod } = {}) {
  const s = kodMetni(stokNo, KOD_HANE.stok);
  if (!s) return "";
  if (seviye === "stok") return BARKOD_ON_EK + s;
  const r = kodMetni(renkKod, KOD_HANE.renk);
  if (!r) return "";
  if (seviye === "renk") return BARKOD_ON_EK + s + r;
  if (seviye === "beden") {
    const b = kodMetni(bedenKod, KOD_HANE.beden);
    return b ? BARKOD_ON_EK + s + r + b : "";
  }
  if (seviye === "asorti") {
    const a = kodMetni(asortiKod, KOD_HANE.asorti);
    return a ? BARKOD_ON_EK + s + r + a : "";
  }
  return "";
}

// Bir varyantın çift barkodu. Etiket basan her yer buradan geçiyor ki kodun nasıl kurulduğu
// tek yerde kalsın.
function varyantinBarkodu(urun, variant, tanimlar) {
  if (!urun || !variant) return "";
  return urunBarkoduKur("beden", {
    stokNo: urun.stokNo,
    renkKod: renkKoduBul(tanimlar, variant.renkId, variant.renk),
    bedenKod: bedenKoduBul(tanimlar, variant.beden, urun.olcuTipi),
  });
}

// Okutulan kodu çözer — okutma ekranlarının TEK giriş noktası.
//
// Tanınmayan koda `null` dönüyor, "en yakın" tahmin YAPILMIYOR: fuarda yanlış ürünü siparişe
// yazmak, hiç yazmamaktan pahalıdır.
function urunBarkoduCoz(kod, stok, tanimlar) {
  const temiz = String(kod || "").trim();
  if (!/^\d+$/.test(temiz)) return null;
  if (temiz.slice(0, BARKOD_ON_EK.length) !== BARKOD_ON_EK) return null;
  const govde = temiz.slice(BARKOD_ON_EK.length);

  const stokNo = Number(govde.slice(0, KOD_HANE.stok));
  const urun = (stok || []).find((u) => Number(u.stokNo) === stokNo);
  if (!urun) return null;
  if (temiz.length === BARKOD_UZUNLUK.stok) return { seviye: "stok", urun };

  const renkKod = Number(govde.slice(KOD_HANE.stok, KOD_HANE.stok + KOD_HANE.renk));
  const renkTanim = renkTanimiKoddanBul(tanimlar, renkKod);
  // Ayrılmış 0 kodu tanıma değil, "Standart" yer tutucusuna denk geliyor.
  if (!renkTanim && renkKod !== OLCUSUZ_KOD) return null;
  // Kod doğru olabilir ama o renk BU üründe olmayabilir; olmayan bir satırı döndürmek, sipariş
  // ekranına karşılığı üretilemeyecek bir kalem yazdırırdı.
  const renkVaryantlari = (urun.variants || []).filter((v) => (renkTanim
    ? (v.renkId ? v.renkId === renkTanim.id : kodEsit(v.renk, renkTanim.ad))
    : kodEsit(v.renk, OLCUSUZ_AD)));
  if (renkVaryantlari.length === 0) return null;
  const renk = renkVaryantlari[0].renk;
  if (temiz.length === BARKOD_UZUNLUK.renk) return { seviye: "renk", urun, renk, renkTanim };

  const son = Number(govde.slice(KOD_HANE.stok + KOD_HANE.renk));

  if (temiz.length === BARKOD_UZUNLUK.beden) {
    const tip = urun.olcuTipi === "Boyut" ? "Boyut" : "Beden";
    const bedenTanim = ((tanimlar && tanimlar.bedenler) || [])
      .find((b) => Number(b.barkodKodu) === son && (b.tip || "Beden") === tip) || null;
    if (!bedenTanim && son !== OLCUSUZ_KOD) return null;
    const bedenAd = bedenTanim ? bedenTanim.ad : OLCUSUZ_AD;
    const variant = renkVaryantlari.find((v) => kodEsit(v.beden, bedenAd));
    if (!variant) return null;
    return { seviye: "beden", urun, renk, renkTanim, beden: variant.beden, variant };
  }

  if (temiz.length === BARKOD_UZUNLUK.asorti) {
    const asorti = ((tanimlar && tanimlar.asortiler) || []).find((a) => Number(a.barkodKodu) === son);
    if (!asorti) return null;
    const urunBedenleri = new Set(renkVaryantlari.map((v) => v.beden));   // sirasiz-tamam
    const dolu = (asorti.oranlar || []).filter((o) => (o.oran || 0) > 0);
    const dagilim = dolu.filter((o) => urunBedenleri.has(o.beden)).map((o) => ({ beden: o.beden, adet: o.oran }));
    return {
      seviye: "asorti", urun, renk, renkTanim, asorti, dagilim,
      toplam: dagilim.reduce((t, d) => t + d.adet, 0),
      // Üründe olmayan beden SESSİZCE atlanmıyor: sipariş eksik girilmiş olacak, kullanıcı bilsin.
      eksikBedenler: dolu.filter((o) => !urunBedenleri.has(o.beden)).map((o) => o.beden),
    };
  }
  return null;
}
