// =============================================================================================
// REÇETE KAPSAM DENETİMİ
//
// Üretim tüketimi, reçete satırlarının `mamulBeden` alanına bakar: her satır YALNIZCA kendi
// bedeninin üretilen adediyle çarpılır. Bir hammadde için yalnızca bazı bedenlerin satırı varsa,
// kalan bedenler için HİÇ tüketim olmaz — stok sessizce eksik düşer.
//
// Görülen belirti tam olarak buydu: 72 çiftlik üretimde 7,2 metre yerine 0,9 metre düşülmesi,
// reçetede o hammaddenin yalnızca 36 bedeni için satırı olduğu anlamına gelir (9 × 0,1).
//
// Bu fonksiyon, bir mamul rengin her hammaddesi için HANGİ bedenlerin eksik olduğunu döndürür.
// "Tüm Bedenler" satırı (bedensiz hammadde) her bedeni kapsar, eksik saymaz.
// Tek bir siparişin TOPLAM hammadde ihtiyacını, reçetelerinden hesaplar.
//
// mrpHesapla'dan farkı: o, TÜM siparişleri birlikte değerlendirir ve planlama durumuna göre süzer.
// Burada ise "bu sipariş tek başına neye mal olur?" sorusu cevaplanır — sipariş kartında, karar
// vermeden önce bakılan sayı budur. Planlanmış/planlanmamış ayrımı yapılmaz; sipariş ne kadar
// hammadde gerektiriyorsa o gösterilir.
//
// Kalem seviyesindeki kutu tercihi (ambalajRengiUygula) burada da uygulanır — aksi halde ekranda
// reçetedeki varsayılan kutunun stoğu görünür, oysa o siparişte başka bir kutu kullanılacaktır.
function siparisHammaddeIhtiyaci(siparis, stok, tumSiparisler, stokRez) {
  const sonuc = [];
  const index = {};
  let recetesizKalem = 0;

  (siparis.kalemler || []).forEach((k) => {
    const urun = (stok || []).find((p) => p.id === k.urunId);
    if (!urun || !Array.isArray(urun.recete) || urun.recete.length === 0) { recetesizKalem++; return; }
    const satirlar = urun.recete.filter(
      (r) => r.mamulRenk === k.renk && (r.mamulBeden === "Tüm Bedenler" || r.mamulBeden === k.beden)
    );
    if (satirlar.length === 0) { recetesizKalem++; return; }

    satirlar.forEach((r) => {
      const etkinRenk = ambalajRengiUygula(r, siparis, stok, k);
      const anahtar = `${r.hammaddeUrunId}|${etkinRenk}|${r.beden}|${r.proses || ""}`;
      if (!(anahtar in index)) {
        index[anahtar] = sonuc.length;
        const hm = (stok || []).find((p) => p.id === r.hammaddeUrunId);
        const varyant = hm ? hm.variants.find((v) => v.renk === etkinRenk && v.beden === r.beden) : null;
        sonuc.push({
          hammaddeUrunId: r.hammaddeUrunId, hammaddeAd: r.hammaddeAd,
          renk: etkinRenk, beden: r.beden, birim: hammaddeBirimi(r.hammaddeUrunId, stok, r.birim), proses: r.proses || "",
          gereken: 0,
          mevcutStok: varyant ? varyant.miktar : 0,
          // Hammadde kartında bu renk/beden hiç tanımlı değilse ayrıca işaretlenir: stok 0 görünür
          // ama sebebi "stok bitti" değil, "böyle bir varyant yok"tur — ikisi farklı sorunlardır.
          varyantYok: !varyant,
          alisFiyati: hm ? (hm.alisFiyati || 0) : 0,
          // Bu SİPARİŞE ayrılmış miktar (alış rezervasyonu + stok rezervasyonu, tüketilen düşülmüş).
          rezerve: 0,
        });
      }
      const g = sonuc[index[anahtar]];
      g.gereken = Math.round((g.gereken + r.miktar * (k.miktar || 0)) * 1000) / 1000;
    });
  });

  sonuc.forEach((g) => {
    // Bu siparişin bu malzeme için TALEBİ ve o talebin karşılanma durumu.
    // Karşılama tarih sırasına göre dağıtıldığı için, aynı malzemeyi bekleyen başka siparişler
    // varsa buradaki "açık" onların da etkisini yansıtır — gerçek durum budur.
    const kars = rezervasyonKarsilama(g.hammaddeUrunId, g.renk, g.beden, tumSiparisler, stokRez, stok);
    const bizim = kars.talepler.filter((t) => t.siparisId === siparis.id);
    g.rezerve = Math.round(bizim.reduce((t, x) => t + x.kalan, 0) * 1000) / 1000;
    g.rezerveAcik = Math.round(bizim.reduce((t, x) => t + x.acik, 0) * 1000) / 1000;
    g.eksik = Math.round(Math.max(0, g.gereken - g.mevcutStok) * 1000) / 1000;
    g.eksikMaliyet = Math.round(g.eksik * g.alisFiyati * 100) / 100;
  });

  // Proses sırasına göre değil, EKSİĞİ olanlar önce: kullanıcının bu ekranda aradığı şey eksiklerdir.
  sonuc.sort((a, b) => (b.eksik > 0) - (a.eksik > 0) || a.hammaddeAd.localeCompare(b.hammaddeAd, "tr"));
  return { kalemler: sonuc, recetesizKalem };
}

// Bir ürünün reçetesinde HANGİ MAMUL RENKLERİN eksik kaldığını bulur.
//
// Beden kapsamından (receteKapsamEksikleri) farklı bir eksiklik türü: orada bir renk için bazı
// bedenler eksiktir; burada ise bir hammadde, bazı model renkleri için HİÇ tanımlanmamıştır.
// Bağcık üç renge tanımlanıp diğer üçü boş bırakıldığında, o üç renkli üretimde bağcık hiç
// düşmez ve eksik ancak sayımda fark edilir.
// `stok` verilirse ambalaj satırları kapsam denetiminden MUAF tutulur: ambalaj rengi siparişte
// seçildiği için reçetede tüm renkleri kapsaması beklenmez. Muafiyet olmadan her ambalaj satırı
// "eksik renk" uyarısı üretiyor ve gerçek eksikleri gürültüde boğuyordu.
function receteRenkKapsamEksikleri(urun, stok) {
  if (!urun || !Array.isArray(urun.recete) || urun.recete.length === 0) return [];
  const mamulRenkler = Array.from(new Set((urun.variants || []).map((v) => v.renk)));
  if (mamulRenkler.length === 0) return [];

  // Hammadde + proses bazında hangi renklerin kapsandığı.
  const gruplar = {};
  urun.recete.forEach((r) => {
    // Muafiyet yalnızca DEĞİŞKEN ambalaj satırlarına: sabit ambalaj satırı sıradan bir malzemedir,
    // rengi reçetede seçilir ve tüm model renklerini kapsaması beklenir.
    if (stok && ambalajDegiskenSatirMi(r, (stok || []).find((x) => x.id === r.hammaddeUrunId))) return;
    const anahtar = `${r.hammaddeUrunId}|${r.proses || ""}`;
    if (!gruplar[anahtar]) {
      gruplar[anahtar] = { hammaddeAd: r.hammaddeAd, proses: r.proses || "", renkler: new Set() };
    }
    gruplar[anahtar].renkler.add(r.mamulRenk);
  });

  const eksikler = [];
  Object.values(gruplar).forEach((g) => {
    const eksik = mamulRenkler.filter((mr) => !g.renkler.has(mr));
    if (eksik.length > 0) {
      eksikler.push({ hammaddeAd: g.hammaddeAd, proses: g.proses, eksikRenkler: eksik });
    }
  });
  return eksikler;
}

function receteKapsamEksikleri(urun, mamulRenk, mamulBedenler) {
  if (!urun || !Array.isArray(urun.recete) || urun.recete.length === 0) return [];
  const bedenler = (mamulBedenler || []).filter(Boolean);
  if (bedenler.length === 0) return [];

  // Hammadde + proses bazında grupla: aynı hammadde farklı proseslerde ayrı ayrı kullanılabilir ve
  // her kullanım kendi kapsamına sahiptir.
  const gruplar = {};
  urun.recete
    .filter((r) => r.mamulRenk === mamulRenk)
    .forEach((r) => {
      const anahtar = `${r.hammaddeUrunId}|${r.proses || ""}|${r.aciklama || ""}`;
      if (!gruplar[anahtar]) {
        gruplar[anahtar] = { hammaddeAd: r.hammaddeAd, proses: r.proses || "", aciklama: r.aciklama || "", kapsanan: new Set(), tumBedenlerMi: false };
      }
      if (r.mamulBeden === "Tüm Bedenler") gruplar[anahtar].tumBedenlerMi = true;
      else gruplar[anahtar].kapsanan.add(r.mamulBeden);
    });

  const eksikler = [];
  Object.values(gruplar).forEach((g) => {
    if (g.tumBedenlerMi) return;
    const eksik = bedenler.filter((b) => !g.kapsanan.has(b));
    if (eksik.length > 0) {
      eksikler.push({ hammaddeAd: g.hammaddeAd, proses: g.proses, aciklama: g.aciklama, eksikBedenler: eksik, kapsananSayi: g.kapsanan.size });
    }
  });
  return eksikler;
}

function ambalajUrunuMu(urun) {
  return !!urun && urun.kategori !== "Mamul" && (urun.malzemeTipi || "") === "Ambalaj";
}

// Bir REÇETE SATIRI için: rengi siparişteki ambalaj tercihi mi belirliyor?
//
// İki koşul birden: hammadde ambalaj tipinde OLMALI **ve** satır "değişken" işaretli olmalı.
// Yalnızca ürün tipine bakmak yetmiyordu — ambalaj tipinde birden çok malzeme tanımlanıyor ve
// hepsinin rengi siparişten gelmiyor: kutu müşteriye göre değişir, koruyucu poşet modelin sabit
// parçasıdır. Karar bu yüzden satır bazında.
//
// ESKİ SATIRLARDA ALAN YOK: `undefined` "değişken" sayılır, çünkü bu alan eklenmeden önce ambalaj
// tipli her satır zaten öyle davranıyordu. Geriye dönük uyum böyle korunuyor; "sabit" seçilmiş
// satırda alan açıkça `false` yazılır.
function ambalajDegiskenSatirMi(receteSatiri, urun) {
  // AÇIK İŞARET HER ŞEYİN ÖNÜNDE. Satırda `ambalajDegisken` yazıyorsa ürünün malzeme tipine
  // BAKILMAZ. Sebep: kural eskiden yalnızca `malzemeTipi === "Ambalaj"` metnine bağlıydı ve
  // kullanıcı kutusunu "Kutu" diye tanımlayınca seçenek hiç görünmüyordu — kuralın varlığı,
  // kullanıcının bir alana tam olarak doğru kelimeyi yazmasına bağlıydı.
  if (receteSatiri && receteSatiri.ambalajDegisken !== undefined) {
    return receteSatiri.ambalajDegisken === true;
  }
  // ESKİ SATIRLAR: alan yok. O günkü kural neyse o geçerli — ambalaj tipli hammadde = değişken.
  return ambalajUrunuMu(urun);
}

// Bir MAMUL için siparişte seçilebilecek ambalaj renkleri.
//
// Kaynak, o mamulün reçetesindeki DEĞİŞKEN ambalaj satırlarıdır. Sipariş ekranı eskiden stoktaki
// bütün ambalaj renklerini listeliyordu: o modelde hiç kullanılmayan kutular da listede çıkıyor,
// yanlış seçime davetiye oluyordu. Artık liste reçeteden geliyor.
//
// Satırda `ambalajSecenekleri` yoksa (ya da boşsa) o hammaddenin TÜM renkleri geçerlidir —
// "hepsi" durumu bilinçli olarak satıra yazılmıyor ki sonradan eklenen bir renk de listeye girsin.
function ambalajRenkSecenekleri(mamul, stok) {
  const cikan = [];
  ((mamul && mamul.recete) || []).forEach((r) => {
    const urun = (stok || []).find((x) => x.id === r.hammaddeUrunId);
    if (!ambalajDegiskenSatirMi(r, urun)) return;
    if (!urun) return;
    const izinli = Array.isArray(r.ambalajSecenekleri) && r.ambalajSecenekleri.length > 0
      ? r.ambalajSecenekleri
      : (urun.variants || []).map((v) => v.renk);
    izinli.forEach((renk) => { if (renk && !cikan.includes(renk)) cikan.push(renk); });
  });
  return cikan;
}

// Bir reçete satırı ambalaj tercihinden etkileniyorsa yeni rengi, etkilenmiyorsa kendi rengini döner.
//
// Öncelik sırası: KALEM > SİPARİŞ > reçete.
// Kalem seviyesi asıl olandır: aynı siparişte farklı modeller farklı kutuya girebilir, hatta aynı
// modelin iki rengi farklı kutu isteyebilir. Sipariş seviyesi ise "bu siparişin tamamı şu kutuya"
// demek isteyenler için kısayol olarak kalır — kalem kendi tercihini belirtmediğinde devreye girer.
function ambalajRengiUygula(receteSatiri, siparis, stok, kalem) {
  const tercih = (kalem && kalem.ambalaj && kalem.ambalaj.renk)
    ? kalem.ambalaj
    : (siparis && siparis.ambalaj);
  if (!tercih || !tercih.renk) return receteSatiri.renk;
  // Normal akışta yalnızca RENK saklanır: reçetedeki ambalaj tipli satırların rengi değiştirilir.
  // Hangi kutu ürününün kullanıldığı zaten reçetede yazılıdır, kullanıcıya tekrar sordurmaya gerek yok.
  // `urunId` dallanması yalnızca GERİYE DÖNÜK UYUM içindir — bu alanın yazıldığı sürümde
  // oluşturulmuş sipariş kayıtları hâlâ doğru çalışsın diye korunuyor.
  if (tercih.urunId) return receteSatiri.hammaddeUrunId === tercih.urunId ? tercih.renk : receteSatiri.renk;
  const urun = (stok || []).find((x) => x.id === receteSatiri.hammaddeUrunId);
  return ambalajDegiskenSatirMi(receteSatiri, urun) ? tercih.renk : receteSatiri.renk;
}


// ================= REÇETE GERÇEKLEŞMESİ =================
//
// Kullanıcı (6 Eylül): "Bununla hem reçete kontrolü yaparız, gerçek maliyet yakalanıyor mu diye.
// Hammadde birim adedi reçeteye NOT olarak yansısın — deri 30 desi planlandı ama 31 desiden
// çıkıyor gibi."
//
// Reçete bir TAHMİNDİR. Gerçekte ne harcandığı ancak iş bitince belli olur: prosese verilen
// hammaddeden artan geri gelir (7z-18) ve aradaki fark GERÇEK tüketimdir.
//
//     gerçek birim tüketim = (verilen − iade) / teslim alınan adet
//
// TEK ÖLÇÜMDEN KARAR VERİLMEZ. Bir üretimde deri kötü çıkmış olabilir, kesici acemi olabilir,
// parti farklı gelmiş olabilir. Bu yüzden tek tek kayıt tutulmuyor; ÖZET biriktiriliyor:
// kaç ölçüm yapıldı ve toplam ne kadar tüketildi. Ortalama ikisinden çıkıyor.
//
// Özet tutmanın ikinci sebebi yer: her üretimin her hammaddesi için ayrı satır, ürün kaydını
// (ve dolayısıyla `urunler` tablosunu) sürekli şişirirdi.

// En az bu kadar ölçüm olmadan öneri yapılmaz.
//
// 3, "tesadüf değil" demek için yeterli en küçük sayı: iki ölçüm birbirini doğrulayabilir ama
// üçüncüsü olmadan hangisinin sapma olduğu bilinemez. Daha yükseği (5-10) daha güvenli olurdu
// ama atölyede bir modelden yılda birkaç üretim geçiyor; öneri hiç görünmezdi.
const RECETE_OLCUM_ESIGI = 3;

// Bu orandan küçük farklar için öneri yapılmaz.
//
// %5: kesim payı, tartı hassasiyeti ve yuvarlama zaten bu mertebede oynuyor. Daha düşük bir eşik
// gerçek bir sapmayı değil, ölçüm gürültüsünü bildirirdi.
const RECETE_FARK_ESIGI = 0.05;

function receteGerceklesmeAnahtari(hammaddeUrunId, renk, beden) {
  return `${hammaddeUrunId}|${renk || ""}|${beden || ""}`;
}

// Bir teslim almadan çıkan ölçümleri mevcut özete ekler.
//
// `olcumler`: [{ hammaddeUrunId, renk, beden, planlanan, gerceklesen }] — ADET BAŞINA değerler.
// Dönen: yeni özet nesnesi. Girdi nesnesi DEĞİŞTİRİLMEZ.
function receteGerceklesmeEkle(mevcut, olcumler) {
  const ozet = { ...(mevcut || {}) };
  (olcumler || []).forEach((o) => {
    if (!o || !o.hammaddeUrunId) return;
    // Sıfır ya da negatif tüketim ölçüm sayılmaz: veri girilmemiş demektir, ortalamayı bozar.
    if (!(o.gerceklesen > 0)) return;
    const anahtar = receteGerceklesmeAnahtari(o.hammaddeUrunId, o.renk, o.beden);
    const eski = ozet[anahtar] || { olcum: 0, toplam: 0, planlanan: o.planlanan || 0 };
    ozet[anahtar] = {
      olcum: eski.olcum + 1,
      toplam: Math.round((eski.toplam + o.gerceklesen) * 10000) / 10000,
      // Planlanan HER SEFERİNDE güncelleniyor: reçete değiştirilmişse karşılaştırma yeni
      // değere göre yapılmalı, yoksa kullanıcı çoktan düzelttiği bir farkı görmeye devam eder.
      planlanan: o.planlanan || eski.planlanan || 0,
      sonTarih: o.tarih || eski.sonTarih || null,
      // FARKLI ÜRETİMLER (21 Eylül): reçeteden sapan her ölçüm üretim numarasıyla saklanıyor
      // (son 30). Reçeteyle tutan ölçüm listeye girmiyor — kullanıcı: "üretimde fark yoksa
      // göstermesine gerek yok, fark olan üretimde üretim no, stok ve fark miktarı yeterli".
      sapmalar: (() => {
        const onceki = eski.sapmalar || [];
        const plan = o.planlanan || eski.planlanan || 0;
        const farkVar = plan > 0 && Math.abs(o.gerceklesen - plan) / plan >= 0.005;
        if (!farkVar) return onceki;
        return [{ uretimNo: o.uretimNo || "?", tarih: o.tarih || null, birimFark: Math.round((o.gerceklesen - plan) * 10000) / 10000,
          toplamFark: o.toplamFark != null ? o.toplamFark : null }, ...onceki].slice(0, 30);
      })(),
    };
  });
  return ozet;
}

// Bir hammadde için okunabilir durum döner; gösterilecek bir şey yoksa null.
function receteGerceklesmeDurumu(ozet, hammaddeUrunId, renk, beden) {
  const kayit = (ozet || {})[receteGerceklesmeAnahtari(hammaddeUrunId, renk, beden)];
  if (!kayit || !(kayit.olcum > 0)) return null;
  const ortalama = Math.round((kayit.toplam / kayit.olcum) * 10000) / 10000;
  const planlanan = kayit.planlanan || 0;
  const fark = planlanan > 0 ? (ortalama - planlanan) / planlanan : 0;
  return {
    olcum: kayit.olcum,
    ortalama,
    planlanan,
    fark,
    // ÖNERİ İKİ ŞARTA BAĞLI: yeterli ölçüm VE anlamlı fark. Biri eksikse rakamlar yine
    // gösteriliyor (bilgi saklanmıyor) ama "reçeteni değiştir" denmiyor.
    oneriVar: kayit.olcum >= RECETE_OLCUM_ESIGI && Math.abs(fark) >= RECETE_FARK_ESIGI && planlanan > 0,
    sonTarih: kayit.sonTarih || null,
    sapmalar: kayit.sapmalar || [],
  };
}

// EKSİ STOĞUN SEBEBİNİ TAHMİN EDER.
//
// Kullanıcı (7 Eylül), "eksi stoklar giriş fişi eksikliğinden mi, reçete fazla düştüğü için mi
// oluşuyor?" sorusuna: "İKİSİ DE OLABİLİR."
//
// İkisi de olabiliyorsa hangisi olduğunu VERİDEN çıkarmak gerekiyor — ve elimizde tam bunu
// ayırt eden veri var: reçete gerçekleşmesi (7z-29). Mantık şu:
//
//   Reçete FAZLA düşüyorsa (ölçülen < planlanan), her üretimde stoktan gereğinden çok düşülüyor
//   demektir. Eksi stok kendiliğinden birikir; giriş fişi eksik olmasa bile.
//
//   Tüketim reçeteyle UYUMLUYSA, düşülen miktar doğru demektir. O hâlde eksi, malzemenin
//   girişinin hiç yapılmamış olmasından geliyordur.
//
//   Hiç ölçüm yoksa bir şey söylenemez — ve SÖYLENMEZ. Uydurma bir teşhis, yanlış yeri
//   düzelttirir: reçeteyle uğraşırken asıl sorun kesilmemiş alış fişiyse eksi birikmeye devam eder.
//
// Reçete gerçekleşmesi MAMUL üzerinde tutuluyor, eksi stok ise HAMMADDE'de. Bu yüzden o hammaddeyi
// kullanan bütün mamullerin ölçümlerine bakılıyor.
function eksiStokSebebi(stok, hammaddeUrunId, renk, beden) {
  const supheliler = [];
  let olcumBulundu = false;

  (stok || []).forEach((urun) => {
    const durum = receteGerceklesmeDurumu(urun.receteGerceklesme, hammaddeUrunId, renk, beden);
    if (!durum) return;
    olcumBulundu = true;
    // YALNIZ "REÇETE FAZLA DÜŞÜYOR" yönü ilgilendiriyor: ölçülen planlanandan AZ.
    // Tersi (ölçülen fazla) eksi stoğu açıklamaz — o durumda reçete zaten az düşüyor demektir.
    if (durum.oneriVar && durum.ortalama < durum.planlanan) {
      supheliler.push({
        urunId: urun.id,
        urunAd: urun.ad,
        planlanan: durum.planlanan,
        olculen: durum.ortalama,
        olcum: durum.olcum,
      });
    }
  });

  if (supheliler.length > 0) return { tur: "recete", supheliler };
  if (olcumBulundu) return { tur: "giris" };
  return { tur: "bilinmiyor" };
}

// ================= REÇETE ŞABLONLARI =================
//
// Kullanıcı (21 Eylül): "Modelhane ve reçete için reçete şablonu olsun: ayakkabı için olmazsa
// olmaz veya standart kullanılan malzemeleri eklediğimiz. Örnek: reçetede yapıştırıcı, taban
// silme, fort bombe gibi malzemelerin standart kullanıldığı alan; şablondan reçeteye ekle veya
// şablondan reçete oluştur."
//
// Şablon RENKTEN BAĞIMSIZ: standart malzemeler (yapıştırıcı T-28, silme suyu, fort bombe 1 mm)
// her mamul renginde aynıdır. Şablon satırı = { hammaddeUrunId, hammaddeAd, renk, beden (boy),
// miktar, birim, proses }. Tanımlarda `receteSablonlari: [{ id, ad, satirlar }]`.

// Şablonu ürüne uygula: ürünün HER mamul rengi için bir satır ("Tüm Bedenler"). Aynı mamul
// renginde aynı hammadde+renk+boy+proses zaten varsa eklenmez — şablonu iki kez uygulamak
// reçeteyi ikiye katlamasın. Döner: { eklenecekler, atlanan }.
function sablonuUruneUygula(sablon, product) {
  const renkler = Array.from(new Set((product.variants || []).map((v) => v.renk)));
  const mevcut = product.recete || [];
  const eklemeId = uid("sablon");
  const eklemeTarihi = new Date().toISOString();
  const eklenecekler = [];
  let atlanan = 0;
  renkler.forEach((mr) => {
    (sablon.satirlar || []).forEach((sa) => {
      const varMi = mevcut.some((r) => r.mamulRenk === mr && r.hammaddeUrunId === sa.hammaddeUrunId
        && (r.renk || "") === (sa.renk || "") && (r.beden || "Standart") === (sa.beden || "Standart")
        && (r.proses || "") === (sa.proses || ""));
      if (varMi) { atlanan += 1; return; }
      eklenecekler.push({
        mamulRenk: mr, mamulBeden: "Tüm Bedenler",
        hammaddeUrunId: sa.hammaddeUrunId, hammaddeAd: sa.hammaddeAd,
        renk: sa.renk || "Standart", beden: sa.beden || "Standart",
        miktar: parseFloat(sa.miktar) || 0, birim: sa.birim || "", proses: sa.proses || "",
        aciklama: `şablon: ${sablon.ad}`, eklemeId, eklemeTarihi, ambalajDegisken: false,
      });
    });
  });
  return { eklenecekler, atlanan };
}

// Reçeteden şablon çıkar: İLK mamul rengindeki satırlardan, bedenden bağımsız olanlar
// (tüm bedenlerde aynı boy ve miktar). Bedene göre değişen malzeme (taban numarası gibi)
// şablona girmez — "standart malzeme" değildir. Döner: { satirlar, atlanan }.
function recetedenSablonSatirlari(recete) {
  const satirlar = recete || [];
  if (satirlar.length === 0) return { satirlar: [], atlanan: 0 };
  const ilkRenk = satirlar[0].mamulRenk;
  const gruplar = {};
  satirlar.filter((r) => r.mamulRenk === ilkRenk).forEach((r) => {
    const a = `${r.hammaddeUrunId}|${r.renk || ""}|${r.proses || ""}`;
    (gruplar[a] = gruplar[a] || []).push(r);
  });
  const sonuc = [];
  let atlanan = 0;
  Object.values(gruplar).forEach((g) => {
    const boylar = new Set(g.map((r) => r.beden || "Standart"));
    const miktarlar = new Set(g.map((r) => r.miktar));
    if (boylar.size > 1 || miktarlar.size > 1) { atlanan += 1; return; }
    const r = g[0];
    sonuc.push({ id: uid("ss"), hammaddeUrunId: r.hammaddeUrunId, hammaddeAd: r.hammaddeAd, renk: r.renk || "Standart",
      beden: r.beden || "Standart", miktar: r.miktar, birim: r.birim || "", proses: r.proses || "" });
  });
  return { satirlar: sonuc, atlanan };
}
