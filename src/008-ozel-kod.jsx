// ================= ÖZEL KOD ALANLARI =================
//
// Kullanıcı (6 Eylül): "Özel kod alanlarını her stok kendi içinde adlandırsın — taban stoğu için
// özel kod deriye uymaz… veya stok tipine göre özel kod kullandıralım."
//
// TİPE GÖRE seçildi, ürün başına değil. Sebep: ürün başına adlandırma FİLTRELEMEYİ ÖLDÜRÜR.
// "Taban kodu 147 olanları getir" sorusunun gruplanacak bir zemini kalmaz; 200 üründe 200 farklı
// başlık olur ve süzgecin değer listesi anlamsızlaşır. Tipe göre olduğunda soru kendi doğal
// hâlinde sorulabiliyor: "taban stokları içinde numara 147".
//
// ÜÇ KARAR (kullanıcı, 6 Eylül):
//   1. Başlıklar STOK TİPİNE göre tanımlanır.
//   2. Alan sayısı tipe göre SERBEST — taban iki alan isterken deri altı alan isteyebilir.
//   3. GENEL alanlar da kalır: "Tedarikçi Kodu" her üründe anlamlı.
//
// ---- DEĞER SIRAYA DEĞİL KİMLİĞE BAĞLI -----------------------------------------------------
//
// Eskiden değerler `ozelKodlar[0..4]` diziydi, yani SIRAYA bağlıydı. Tipe özel alanlarda sıra
// tipten tipe farklı anlama gelir: bir ürünün tipi Deri'den Taban'a çevrildiğinde "0,9 mm"
// sessizce "numara" alanında görünürdü — kimsenin fark etmeyeceği bir bozulma.
//
// Bu yüzden değer artık `ozelKodlar: { "<alanId>": "147" }`. Bağ KİMLİKLE kuruluyor; alanın adı
// değişse de, tipi değişse de, sırası değişse de değer doğru alanda kalıyor. Bu, barkod işinde
// (6b) öğrenilen dersin aynısı ve projenin genel kuralı.
// SEZON DA BİR KAPSAM EKSENİ (kullanıcı, 6 Eylül: "Mamulde sezon da kapsam ekseni olsun").
// Sezon yalnız mamulde dolduruluyor, dolayısıyla sezona bağlı bir alan doğal olarak yalnız
// mamullerde görünüyor — ayrıca "kategori mamul mü" diye bakmaya gerek yok.

// Bir alanın hangi ürünlere uyduğu. Kapsam metinle eşleşiyor çünkü ürün tipini METİN olarak
// taşıyor (`malzemeTipi` / `mamulTipi`); tip kaydının kimliğini taşımıyor.
function ozelKodAlaniUyar(alan, urun) {
  if (!alan || !urun) return false;
  const tur = alan.kapsamTuru || "genel";
  if (tur === "genel") return true;
  const esit = (a, b) => String(a || "").toLocaleLowerCase("tr-TR") === String(b || "").toLocaleLowerCase("tr-TR");
  if (tur === "malzeme") return esit(urun.malzemeTipi, alan.kapsamAd);
  if (tur === "mamul") return esit(urun.mamulTipi, alan.kapsamAd);
  // "Tüm Sezon" JOKER DEĞİL, bir değer. Yazlık bir alanı "Tüm Sezon" ürünlerinde de göstermek
  // cazip görünüyor ama o zaman GERÇEKTEN her sezona ait ürünlere özel bir alan tanımlamak
  // imkânsız hale gelirdi. Eşleşme birebir; kullanıcı iki sezona da alan açmak isterse iki alan
  // açar ya da alanı Genel yapar.
  if (tur === "sezon") return esit(urun.sezon, alan.kapsamAd);
  return false;
}

// Bu ürüne uygulanan alanlar: önce genel, sonra tipe özel. Sıra sabit tutuluyor ki aynı ürün her
// ekranda aynı düzende görünsün.
function urunOzelKodAlanlari(urun, alanlar) {
  const hepsi = alanlar || [];
  return [
    ...hepsi.filter((a) => (a.kapsamTuru || "genel") === "genel"),
    ...hepsi.filter((a) => (a.kapsamTuru || "genel") !== "genel" && ozelKodAlaniUyar(a, urun)),
  ];
}

// Dolu kodlar — ekranda ve aramada kullanılan tek kaynak. Alan adı ile değeri birlikte döndürüyor:
// çıplak bir "147", hangi alana ait olduğunu söylemiyor.
//
// TİPİ DEĞİŞMİŞ ÜRÜNÜN eski değeri burada GÖRÜNMÜYOR ama SİLİNMİYOR da: kayıtta duruyor, tip geri
// alınırsa yerine dönüyor. Sessizce silmek, yanlış tıklanan bir tip değişikliğini geri alınamaz
// hale getirirdi.
function ozelKodCiftleri(urun, alanlar) {
  const degerler = (urun && urun.ozelKodlar) || {};
  return urunOzelKodAlanlari(urun, alanlar)
    .map((a) => ({ id: a.id, etiket: a.ad, deger: String(degerler[a.id] || "").trim() }))
    .filter((x) => x.deger);
}

function ozelKodMetni(urun, alanlar) {
  return ozelKodCiftleri(urun, alanlar).map((x) => `${x.etiket} ${x.deger}`).join(" ");
}

// Sorguyla gerçekten eşleşen kodlar — rozet olarak yalnızca bunlar gösteriliyor. Hepsini basmak
// listede ürün adını ezerdi.
function eslesenOzelKodlar(urun, alanlar, q) {
  if (!q) return [];
  return ozelKodCiftleri(urun, alanlar)
    .filter((x) => `${x.etiket} ${x.deger}`.toLocaleLowerCase("tr-TR").includes(q));
}

// ---- GÖÇ ---------------------------------------------------------------------------------------
//
// Eski biçim: `tanimlar.ozelKodEtiketleri` (beş başlık) + `urun.ozelKodlar` (beş elemanlı DİZİ).
// Yeni biçim: `tanimlar.ozelKodAlanlari` (kimlikli, kapsamlı) + `urun.ozelKodlar` (kimlik→değer).
//
// Göç BİR KERELİK ve SESSİZ: eski etiketler "Genel" kapsamlı alanlara dönüşüyor, ürünlerdeki
// diziler indis sırasına göre o alanların kimliklerine bağlanıyor. Boş etiketler alan açmıyor —
// hiç kullanılmamış bir slot için ekranda başlık taşımanın anlamı yok.
//
// SAF FONKSİYON: kimlik üretimini çağıran veriyor (`kimlikUret`), böylece test edilebiliyor.
function ozelKodGoc(tanimlar, stok, kimlikUret) {
  const t = tanimlar || {};
  const zatenYeni = Array.isArray(t.ozelKodAlanlari);
  const eskiEtiketler = t.ozelKodEtiketleri || [];

  let alanlar = zatenYeni ? t.ozelKodAlanlari : [];
  // İndis → alan kimliği eşlemesi. Yeni biçime geçilmişse eski dizileri hâlâ taşıyan bir ürün
  // olabilir (başka cihazdan gelmiş kayıt), o yüzden eşleme her hâlükârda kuruluyor.
  const genelAlanlar = alanlar.filter((a) => (a.kapsamTuru || "genel") === "genel");

  if (!zatenYeni) {
    alanlar = eskiEtiketler
      .map((ad, i) => ({ ad: String(ad || "").trim(), i }))
      .filter((x) => x.ad)
      .map((x) => ({ id: kimlikUret(), ad: x.ad, kapsamTuru: "genel", kapsamAd: "", eskiIndis: x.i }));
  }
  const indisEslemesi = {};
  (zatenYeni ? genelAlanlar : alanlar).forEach((a, sira) => {
    const i = a.eskiIndis != null ? a.eskiIndis : sira;
    indisEslemesi[i] = a.id;
  });

  let degisenUrun = 0;
  const yeniStok = (stok || []).map((u) => {
    if (!Array.isArray(u.ozelKodlar)) return u;
    const nesne = {};
    u.ozelKodlar.forEach((deger, i) => {
      const ad = String(deger || "").trim();
      const alanId = indisEslemesi[i];
      if (ad && alanId) nesne[alanId] = ad;
    });
    degisenUrun += 1;
    return { ...u, ozelKodlar: nesne };
  });

  return {
    tanimlar: zatenYeni ? t : { ...t, ozelKodAlanlari: alanlar.map(({ eskiIndis, ...a }) => a) },
    stok: yeniStok,
    degisti: !zatenYeni || degisenUrun > 0,
    degisenUrun,
  };
}
