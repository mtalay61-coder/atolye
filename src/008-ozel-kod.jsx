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

// ---- ÇOK TİPLİ ALAN (v1.636.0 — kullanıcı, Tanımlar ekran görüntüsüyle: "tipler renk gibi ortak olabilsin") ----
//
// Önce bir alanın TEK kapsamı vardı (`kapsamTuru` + `kapsamAd`). "Taban" hem Ayakkabı'da hem Sandalet'te gerekiyorsa
// iki ayrı alan açılıyordu; ürün kartındaki "Mevcut alanlardan seç" de seçilen adla bu tipe YENİ bir alan açıyordu.
// Sonuç: Tanımlar'da üç "Taban", iki "Kalıp", iki "MODEL" — aynı bilgi üç kimlikte, süzgeç ve raporlarda adla
// birleştirme gerekiyor (v1.580). Artık renklerdeki `malzemeTipleri` gibi: alan BİR tane, `kapsamlar` dizisi
// ("malzeme|Deri", "mamul|Sandalet", "sezon|Yazlık") birden çok tip taşır; boş dizi = Genel.
// ESKİ KAYIT GÖÇSÜZ OKUNUR: `kapsamlar` yoksa eski tek kapsam tek elemanlı liste sayılır (renkTipleri ile aynı yol).
// Yazarken yalnız `kapsamlar` yazılır, eski iki alan temizlenir — iki kaynak yan yana kalırsa hangisinin geçerli
// olduğu belirsizleşirdi.
function ozelKodKapsamlari(alan) {
  if (!alan) return [];
  if (Array.isArray(alan.kapsamlar)) return alan.kapsamlar.filter(Boolean);
  const tur = alan.kapsamTuru || "genel";
  return tur === "genel" ? [] : [`${tur}|${alan.kapsamAd || ""}`];
}
const ozelKodGenelMi = (alan) => ozelKodKapsamlari(alan).length === 0;
// Alanı verilen kapsam listesiyle yeniden yazar (eski tek-kapsam alanları düşer). Liste tekilleştirilir.
function ozelKodKapsamYaz(alan, kapsamlar) {
  const { kapsamTuru: _t, kapsamAd: _a, ...geri } = alan || {};
  return { ...geri, kapsamlar: Array.from(new Set((kapsamlar || []).filter(Boolean))) };
}
// "mamul|Sandalet" → "Sandalet" (ekranda kısa ad); tür ön eki ayrı gösterilecekse `tur` da döner.
function ozelKodKapsamParcala(k) {
  const i = String(k || "").indexOf("|");
  return i < 0 ? { tur: "genel", ad: "" } : { tur: k.slice(0, i), ad: k.slice(i + 1) };
}
const ozelKodKapsamMetni = (alan) => ozelKodKapsamlari(alan).map((k) => ozelKodKapsamParcala(k).ad).join(", ");

// Bir alanın hangi ürünlere uyduğu. Kapsam metinle eşleşiyor çünkü ürün tipini METİN olarak
// taşıyor (`malzemeTipi` / `mamulTipi`); tip kaydının kimliğini taşımıyor. Kapsamlardan BİRİ uyarsa yeter.
function ozelKodAlaniUyar(alan, urun) {
  if (!alan || !urun) return false;
  const kapsamlar = ozelKodKapsamlari(alan);
  if (kapsamlar.length === 0) return true;
  const esit = (a, b) => String(a || "").toLocaleLowerCase("tr-TR") === String(b || "").toLocaleLowerCase("tr-TR");
  return kapsamlar.some((k) => {
    const { tur, ad } = ozelKodKapsamParcala(k);
    if (tur === "malzeme") return esit(urun.malzemeTipi, ad);
    if (tur === "mamul") return esit(urun.mamulTipi, ad);
    // "Tüm Sezon" JOKER DEĞİL, bir değer. Yazlık bir alanı "Tüm Sezon" ürünlerinde de göstermek
    // cazip görünüyor ama o zaman GERÇEKTEN her sezona ait ürünlere özel bir alan tanımlamak
    // imkânsız hale gelirdi. Eşleşme birebir; iki sezon isteniyorsa alana iki sezon da eklenir.
    if (tur === "sezon") return esit(urun.sezon, ad);
    return false;
  });
}

// Bu ürüne uygulanan alanlar: önce genel, sonra tipe özel. Sıra sabit tutuluyor ki aynı ürün her
// ekranda aynı düzende görünsün.
function urunOzelKodAlanlari(urun, alanlar) {
  const hepsi = alanlar || [];
  return [
    ...hepsi.filter((a) => ozelKodGenelMi(a)),
    ...hepsi.filter((a) => !ozelKodGenelMi(a) && ozelKodAlaniUyar(a, urun)),
  ];
}

// AD İLE ALAN EKLE / KAPSAMA BAĞLA (v1.636.0). Aynı adlı (büyük/küçük harf ve boşluk farkı yok sayılır) alan VARSA
// yeni alan açılmaz: kapsam ona eklenir (zaten genelse ya da kapsamı içeriyorsa dokunulmaz). Yoksa yeni alan açılır.
// `kapsam` "tur|ad"; "genel|" ya da boş = Genel. Saf: { alanlar, id, yeniMi, degisti }.
function ozelKodAlaniAdla(alanlar, ad, kapsam, yeniId) {
  const liste = alanlar || [];
  const temiz = String(ad || "").trim();
  if (!temiz) return { alanlar: liste, id: null, yeniMi: false, degisti: false };
  const genel = !kapsam || String(kapsam).startsWith("genel|") || kapsam === "genel";
  const mevcut = liste.find((a) => ozelKodAdAnahtari(a.ad) === ozelKodAdAnahtari(temiz));
  if (mevcut) {
    const k = ozelKodKapsamlari(mevcut);
    if (ozelKodGenelMi(mevcut) || (!genel && k.includes(kapsam))) return { alanlar: liste, id: mevcut.id, yeniMi: false, degisti: false };
    // Genel istendi: alan her üründe görünsün (kapsam listesi boşalır).
    const yeniK = genel ? [] : [...k, kapsam];
    return { alanlar: liste.map((a) => (a.id === mevcut.id ? ozelKodKapsamYaz(a, yeniK) : a)), id: mevcut.id, yeniMi: false, degisti: true };
  }
  const yeni = { id: yeniId, ad: temiz, kapsamlar: genel ? [] : [kapsam] };
  return { alanlar: [...liste, yeni], id: yeniId, yeniMi: true, degisti: true };
}

// AYNI ADLI ALANLARI BİRLEŞTİR (v1.636.0). Eski kurulumda tip başına açılmış ikizler ("Taban" ×3) tek alanda toplanır:
// İLK alan kalır, kapsamlar birleşir (ikizlerden biri Genel'se sonuç Genel). Ürün değerleri ikizin kimliğinden kalan
// alanın kimliğine TAŞINIR; kalan alanda değer zaten doluysa ve farklıysa ÇAKIŞMA sayılır — kalan alanın değeri korunur,
// ikizin değeri kayıtta eski kimliğiyle DURUR (silinmez, veri kaybı yok) ve çakışma listesinde ürün adıyla bildirilir.
// Saf. Döner: { alanlar, urunler (yalnız değişenler), birlesenSayisi, cakismalar: [{ urunAd, alanAd, kalan, ikiz }] }.
function ozelKodAlanlariniBirlestir(alanlar, urunler) {
  const liste = alanlar || [];
  const gruplar = new Map();
  liste.forEach((a) => { const k = ozelKodAdAnahtari(a.ad); if (!gruplar.has(k)) gruplar.set(k, []); gruplar.get(k).push(a); });
  const eslem = {};   // ikizId → kalanId
  const kalanlar = new Map();
  gruplar.forEach((g) => {
    if (g.length < 2) return;
    const kalan = g[0];
    const genel = g.some((a) => ozelKodGenelMi(a));
    kalanlar.set(kalan.id, ozelKodKapsamYaz(kalan, genel ? [] : g.flatMap((a) => ozelKodKapsamlari(a))));
    g.slice(1).forEach((a) => { eslem[a.id] = kalan.id; });
  });
  const ikizSayisi = Object.keys(eslem).length;
  if (ikizSayisi === 0) return { alanlar: liste, urunler: [], birlesenSayisi: 0, cakismalar: [] };
  const yeniAlanlar = liste.filter((a) => !eslem[a.id]).map((a) => kalanlar.get(a.id) || a);
  const adi = (id) => ((liste.find((a) => a.id === id) || {}).ad || "");
  const cakismalar = [];
  const degisen = [];
  (urunler || []).forEach((u) => {
    const kodlar = u && u.ozelKodlar;
    if (!kodlar || typeof kodlar !== "object" || Array.isArray(kodlar)) return;
    let yeni = null;
    Object.keys(eslem).forEach((ikizId) => {
      const deger = String(kodlar[ikizId] == null ? "" : kodlar[ikizId]).trim();
      if (!deger) return;
      const hedef = eslem[ikizId];
      const mevcut = String(((yeni || kodlar)[hedef]) == null ? "" : (yeni || kodlar)[hedef]).trim();
      if (!mevcut || kodEsit(mevcut, deger)) {
        yeni = yeni || { ...kodlar };
        yeni[hedef] = mevcut || deger;
        delete yeni[ikizId];
      } else {
        cakismalar.push({ urunAd: u.ad, alanAd: adi(hedef), kalan: mevcut, ikiz: deger });
      }
    });
    if (yeni) degisen.push({ ...u, ozelKodlar: yeni });
  });
  return { alanlar: yeniAlanlar, urunler: degisen, birlesenSayisi: ikizSayisi, cakismalar };
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

// ÖZEL KOD SÜZGECİ (v1.553.0 — kullanıcı: "fiyatlandırma özel kodlarla filtrelenebilsin"). Listedeki
// ürünlerde DOLU olan her alan için seçilebilir değerler; boş alan süzgeçte görünmez (seçeneksiz kutu
// işe yaramaz). Saf. Döner: [{ id, ad, degerler: [..] }] — değerler tr sıralı.
// AYNI ADLI ALANLAR TEK SÜZGEÇ (v1.580.0 — kullanıcı: "Fiyat listesinde tek özel kod sanki çokmuş gibi filtrelendi; tek tek
// filtre olacağına tek atama olsun"). Farklı kapsamlarda ("Ayakkabı", "Sandalet"…) aynı adla açılmış alanlar (üç "Taban", iki
// "Kalıp") ayrı ayrı kutu açıyordu. Artık AD'a göre birleşir: tek kutu, değerler hepsinden; `id` ilk alanın kimliği (temsilci)
// — süzgeç (`ozelKodSuzgeceUyar`) o kimliğin ADINI taşıyan her alana bakar.
const ozelKodAdAnahtari = (ad) => String(ad || "").trim().toLocaleLowerCase("tr-TR");
function ozelKodSecenekleri(urunler, alanlar) {
  const harita = new Map();
  (urunler || []).forEach((u) => ozelKodCiftleri(u, alanlar).forEach((c) => {
    const k = ozelKodAdAnahtari(c.etiket);
    if (!harita.has(k)) harita.set(k, { ad: c.etiket, degerler: new Map() });
    const h = harita.get(k);
    if (!h.degerler.has(ozelKodAdAnahtari(c.deger))) h.degerler.set(ozelKodAdAnahtari(c.deger), c.deger);
  }));
  const goruldu = new Set();
  const sonuc = [];
  (alanlar || []).forEach((a) => {
    const k = ozelKodAdAnahtari(a.ad);
    if (!harita.has(k) || goruldu.has(k)) return;
    goruldu.add(k);
    const h = harita.get(k);
    sonuc.push({ id: a.id, ad: h.ad, degerler: Array.from(h.degerler.values()).sort((x, y) => x.localeCompare(y, "tr", { numeric: true })) });
  });
  return sonuc;
}
// Seçili değerlerin HEPSİNE uyuyor mu (VE). `secim`: { alanId: deger } — boş değer = o alanda süzme yok.
function ozelKodSuzgeceUyar(urun, alanlar, secim) {
  const etkin = Object.entries(secim || {}).filter(([, d]) => d);
  if (etkin.length === 0) return true;
  const ciftler = ozelKodCiftleri(urun, alanlar);
  const adi = (id) => ((alanlar || []).find((a) => a.id === id) || {}).ad;
  return etkin.every(([id, d]) => {
    const ad = adi(id);
    return ciftler.some((c) => (ad ? ozelKodAdAnahtari(c.etiket) === ozelKodAdAnahtari(ad) : c.id === id) && kodEsit(c.deger, d));
  });
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
  const genelAlanlar = alanlar.filter((a) => ozelKodGenelMi(a));

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
