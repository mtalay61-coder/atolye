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
        const varyant = hm ? (hm.variants || []).find((v) => stokAnahtarNrm(v.renk) === stokAnahtarNrm(etkinRenk) && stokAnahtarNrm(v.beden) === stokAnahtarNrm(r.beden)) : null;
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
    // SATIN ALMA DURUMU (v1.632.0): Planlama'daki gibi — bu satış siparişi için verilmiş alış siparişlerinde henüz teslim
    // alınmamış (yolda) miktar. Durum standardı (HAMMADDE_DURUMLARI): yeterli / yolda / kismen / eksik.
    const satinAlma = hammaddeSatinAlmaDurumu(g.hammaddeUrunId, g.renk, g.beden, new Set([siparis.id]), tumSiparisler || []);
    g.yolda = satinAlma.yolda || 0;
    g.netEksik = Math.round(Math.max(0, g.eksik - g.yolda) * 1000) / 1000;
    g.durum = hammaddeDurumu(g.eksik, g.yolda);
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
      // ÖLÇÜM BAŞINA KAYIT (v1.592.0 — kullanıcı: "üretimler silindi, eski üretimdeki farkları hesapladı; gerçekleşen
      // üretimden alsın, silinenleri almasın"). Toplam/olcum sayacı silinen üretimi geri çıkaramıyordu; artık her ölçüm
      // üretim numarasıyla duruyor (son 60), özet var olan üretimlere göre yeniden kurulur (`receteGerceklesmeCanli`).
      olcumler: [{ uretimNo: o.uretimNo || null, tarih: o.tarih || null, gerceklesen: o.gerceklesen, planlanan: o.planlanan || 0,
        toplamFark: o.toplamFark != null ? o.toplamFark : null }, ...(eski.olcumler || [])].slice(0, 60),
    };
  });
  return ozet;
}

// CANLI ÖZET (v1.592.0): yalnız VAR OLAN üretimlerin ölçümleri. `uretimNolari`: mamulün bugünkü üretim kayıtlarının
// numaraları (Set). Ölçüm başına kaydı olan anahtarlar ondan yeniden kurulur; eski toplu kayıt (ölçüm listesi yok) ancak
// mamulün hâlâ en az bir üretimi varsa gösterilir — hangi üretimden geldiği bilinmediği için silinenle ayrıştırılamaz.
// Giriş nesnesi değiştirilmez.
function receteGerceklesmeCanli(ozet, uretimNolari) {
  const sonuc = {};
  const kume = uretimNolari instanceof Set ? uretimNolari : new Set(uretimNolari || []);
  Object.entries(ozet || {}).forEach(([anahtar, kayit]) => {
    if (!kayit) return;
    if (Array.isArray(kayit.olcumler)) {
      const canli = kayit.olcumler.filter((o) => o && o.gerceklesen > 0 && (!o.uretimNo || kume.has(String(o.uretimNo))));
      if (!canli.length) return;
      const plan = canli[0].planlanan || kayit.planlanan || 0;
      sonuc[anahtar] = {
        olcum: canli.length,
        toplam: Math.round(canli.reduce((t, o) => t + o.gerceklesen, 0) * 10000) / 10000,
        planlanan: plan,
        sonTarih: canli[0].tarih || kayit.sonTarih || null,
        sapmalar: canli.filter((o) => plan > 0 && Math.abs(o.gerceklesen - plan) / plan >= 0.005)
          .map((o) => ({ uretimNo: o.uretimNo || "?", tarih: o.tarih, birimFark: Math.round((o.gerceklesen - plan) * 10000) / 10000, toplamFark: o.toplamFark })),
        olcumler: canli,
      };
      return;
    }
    if (kume.size === 0) return;   // eski toplu kayıt, mamulün üretimi kalmamış → gösterme
    const sapmalar = (kayit.sapmalar || []).filter((sp) => !sp.uretimNo || sp.uretimNo === "?" || kume.has(String(sp.uretimNo)));
    sonuc[anahtar] = { ...kayit, sapmalar };
  });
  return sonuc;
}

// Silinen üretimin ölçümleri mamulden düşer (v1.592.0, 076 uretimSil). Değişiklik yoksa aynı nesne döner.
function receteGerceklesmeUretimSil(ozet, uretimNo) {
  if (!ozet || !uretimNo) return ozet;
  let degisti = false;
  const sonuc = {};
  Object.entries(ozet).forEach(([anahtar, kayit]) => {
    if (!kayit) return;
    const olcumler = Array.isArray(kayit.olcumler) ? kayit.olcumler.filter((o) => String(o.uretimNo) !== String(uretimNo)) : null;
    const sapmalar = (kayit.sapmalar || []).filter((sp) => String(sp.uretimNo) !== String(uretimNo));
    if ((olcumler && olcumler.length !== kayit.olcumler.length) || sapmalar.length !== (kayit.sapmalar || []).length) degisti = true;
    if (olcumler) {
      if (!olcumler.length) return;   // bu hammaddenin bütün ölçümleri o üretimdendi
      sonuc[anahtar] = { ...kayit, olcumler, sapmalar, olcum: olcumler.length,
        toplam: Math.round(olcumler.reduce((t, o) => t + (o.gerceklesen || 0), 0) * 10000) / 10000 };
    } else {
      sonuc[anahtar] = { ...kayit, sapmalar };
    }
  });
  return degisti ? sonuc : ozet;
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

// RENK POZİSYONU (v1.558.0 — kullanıcı: "Şablondan ekleme doğru çalışmıyor", 27080 D'den kurulan şablon 27081 D'ye
// uygulanınca dört mamul renginin HEPSİNDE deri "Kahve Süet" geldi). Şablon hammadde rengini harfiyen saklıyordu;
// oysa "mamul Kahve Süet → deri Kahve Süet" satırı rengi MAMUL RENGİNDEN alıyor. Artık şablon satırı bu bağı
// `pozisyon` olarak saklar: hammadde rengi mamul rengiyle aynıysa 1; model rengi (kombinasyon) etiketinde
// "1004 - Kırmızı/Bej" k'ıncı bileşenle aynıysa k; satır zaten "N. Renk" açıklamalıysa N. Uygulanırken her mamul
// rengi kendi rengini alır (`kombinasyonRengiCoz`). Mamul rengiyle bağı olmayan (Nikel, Standart) sabit kalır.
function sablonPozisyonu(r) {
  const m = String((r && r.aciklama) || "").match(/^(\d+)\. Renk$/);
  if (m) return Number(m[1]);
  const mr = String((r && r.mamulRenk) || "");
  if (!r || !r.renk || !mr) return null;
  if (kombinasyonEtiketiFormatindaMi(mr)) {
    const k = mr.match(/^.+? - (.+)$/);
    const parcalar = k ? k[1].split("/").map((x) => x.trim()) : [];
    const i = parcalar.findIndex((p) => kodEsit(p, r.renk));
    return i >= 0 ? i + 1 : null;
  }
  return kodEsit(r.renk, mr) ? 1 : null;
}
function sablonHedefRengi(sa, mamulRenk) {
  if (!sa.pozisyon) return sa.renk || "Standart";
  if (kombinasyonEtiketiFormatindaMi(mamulRenk)) return kombinasyonRengiCoz(mamulRenk, sa.pozisyon) || sa.renk || "Standart";
  return sa.pozisyon === 1 ? mamulRenk : (sa.renk || "Standart");
}

// Şablonu ürüne uygula: ürünün HER mamul rengi için bir satır ("Tüm Bedenler"). Aynı mamul
// renginde aynı hammadde+renk+boy+proses zaten varsa eklenmez — şablonu iki kez uygulamak
// reçeteyi ikiye katlamasın. Pozisyonlu satırın rengi hedef mamul renginden çözülür.
// İŞÇİLİK (v1.558.0): şablon işçilik ücretlerini ve ara prosesleri de taşır; hedefte BOŞ olanlar doldurulur,
// dolu olan EZİLMEZ. Döner: { eklenecekler, atlanan, ekAlanlar, iscilikSayisi, bedenEksikler, bosEslesmeler, gecmisSayisi, bedenGecmisSayisi }.
// RENK EŞLEŞTİRME — normal "Reçeteye Ekle" ile AYNI sistem (v1.561.0, kullanıcı: "renk eşleştirmeleri aynı
// sistemde getir, hatırla ve bilmediğini boş getir; renkli belirt, kullanıcı gözden kaçırmasın"). Eskiden şablon
// satırının rengi (kaynak modelin rengi, ör. Taban "Kahve") hedefin BÜTÜN renklerine aynen yazılıyordu.
// Sıra: (1) hammaddede mamul (pozisyon) rengiyle AYNI ADLI renk; (2) geçmiş reçetelerde bu mamul rengine
// verilmiş karar (`gecmisRenkOnerisi` — işaretlenir: `renkGecmisten`); (3) renksiz / tek renkli / "Standart"
// rengi olan hammaddede o renk (sabit); (4) BİLİNMİYOR → "" (satır açılmaz, matriste turuncu "eşleştir…").
// `ctx.tumUrunler` verilmezse (eski çağrı) şablonun rengi aynen — `sablonHedefRengi`.
function sablonRengiCoz(sa, mr, ctx, gecmisHarita) {
  if (!ctx || !ctx.tumUrunler) return { renk: sablonHedefRengi(sa, mr), gecmis: false };
  // Stok kartı bulunamayan hammadde (v1.566.0): kaynak rengi körlemesine kopyalanmaz; renk seçenekleri reçetelerde
  // kullanılmış renklerden kurulur ve aynı ad / geçmiş kuralı işler — bilinmeyen BOŞ kalır.
  const h = ctx.tumUrunler.find((u) => u.id === sa.hammaddeUrunId)
    || { id: sa.hammaddeUrunId, variants: hammaddeRenkSecenekleri(sa.hammaddeUrunId, ctx.tumUrunler).map((renk) => ({ renk, beden: "" })), kartYok: true };
  if (!h.kartYok && urunRenksizMi(h)) return { renk: sa.renk || "Standart", gecmis: false };
  const nrm = (x) => String(x || "").trim().toLocaleLowerCase("tr-TR");
  const hRenkler = Array.from(new Set((h.variants || []).map((v) => v.renk).filter(Boolean)));
  const kombi = kombinasyonEtiketiFormatindaMi(mr);
  const pozisyonRengi = kombi ? (kombinasyonRengiCoz(mr, sa.pozisyon || 1) || mr) : mr;
  const isim = hRenkler.find((a) => nrm(a) === nrm(pozisyonRengi));
  if (isim) return { renk: isim, gecmis: false };
  const gecmis = gecmisRenkOnerisi(gecmisHarita, pozisyonRengi, h.id, hRenkler);
  if (gecmis) return { renk: gecmis, gecmis: true };
  const standart = hRenkler.find((a) => nrm(a) === "standart");
  if (standart) return { renk: standart, gecmis: false };
  if (hRenkler.length === 1) return { renk: hRenkler[0], gecmis: false };
  return { renk: "", gecmis: false };
}

function sablonuUruneUygula(sablon, product, ctx) {
  const gecmisHarita = ctx && ctx.tumUrunler ? gecmisRenkEslesmeleri(ctx.tumUrunler) : null;
  const bedenHarita = ctx && ctx.tumUrunler ? gecmisBedenEslesmeleri(ctx.tumUrunler) : null;
  let bedenGecmisSayisi = 0;
  const bosEslesmeler = [];
  let gecmisSayisi = 0;
  const renkler = Array.from(new Set((product.variants || []).map((v) => v.renk)));
  const mevcut = product.recete || [];
  // HER ŞABLON SATIRINA AYRI eklemeId (v1.559.0). Reçete görünümü eklemeId'ye göre kart açar (145); tek kimlik
  // 13 hammaddeyi tek "Deri" kartına sıkıştırıyordu, öbürleri görünmüyordu. Kimlik mamul renkleri arasında
  // ORTAK — aynı hammaddenin tüm renk satırları tek kartta. "sablon-" öneki geri almada kullanılıyor (160).
  const eklemeIdleri = (sablon.satirlar || []).map(() => uid("sablon"));
  const eklemeTarihi = new Date().toISOString();
  const eklenecekler = [];
  let atlanan = 0;
  // BEDENE GÖRE DEĞİŞEN MALZEME (v1.560.0): `sa.bedenler = { mamulBedeni: { beden, miktar } }` taşıyan şablon satırı
  // hedefin HER mamul bedenine ayrı satır açar. `bedenAyni` (taban/fusbet: hammadde no = mamul no) kaynakta
  // olmayan bedene de uyar; haritalı satırda karşılığı olmayan beden atlanır ve ADI döner (sessiz eksik olmasın).
  const bedenEksikler = new Set();
  renkler.forEach((mr) => {
    const mamulBedenleri = bedenSirala(Array.from(new Set((product.variants || []).filter((v) => v.renk === mr).map((v) => v.beden).filter(Boolean))));
    (sablon.satirlar || []).forEach((sa, i) => {
      const eklemeId = eklemeIdleri[i];
      const cozum = sablonRengiCoz(sa, mr, ctx, gecmisHarita);
      const renk = cozum.renk;
      if (!renk) {
        // Kullanıcı boş eşleşmeyi sonradan doldurduysa (satır var) yeniden uygulamada "boş" sayılmaz.
        if (mevcut.some((r) => r.mamulRenk === mr && r.hammaddeUrunId === sa.hammaddeUrunId && (r.proses || "") === (sa.proses || ""))) { atlanan += 1; return; }
        bosEslesmeler.push({ hammaddeAd: sa.hammaddeAd || "?", mamulRenk: mr });
        return;
      }
      const ortak = {
        hammaddeUrunId: sa.hammaddeUrunId, hammaddeAd: sa.hammaddeAd, renk, birim: sa.birim || "", proses: sa.proses || "",
        aciklama: sa.pozisyon ? `${sa.pozisyon}. Renk` : `şablon: ${sablon.ad}`, eklemeId, eklemeTarihi, ambalajDegisken: false,
        ...(cozum.gecmis ? { renkGecmisten: true } : {}),
      };
      // Tekrar kontrolü RENGE BAKMAZ (v1.561.0): kullanıcı geçmişten gelen rengi değiştirdikten sonra şablon yeniden
      // uygulanınca aynı malzeme eski renkle ikinci kez eklenmesin.
      const ayniVarMi = (mb, hb) => mevcut.some((r) => r.mamulRenk === mr && r.hammaddeUrunId === sa.hammaddeUrunId
        && (mb == null || r.mamulBeden === mb)
        && (r.beden || "Standart") === hb && (r.proses || "") === (sa.proses || ""));
      if (sa.bedenler) {
        if (mamulBedenleri.length === 0) { bedenEksikler.add(sa.hammaddeAd || "?"); return; }
        mamulBedenleri.forEach((mb) => {
          const e = sa.bedenler[mb];
          // Kısmi malzeme (kaynakta yalnız bazı bedenlerde) karşılıksız bedende BİLEREK yok — uyarı gürültü olur.
          if (!e && sa.kismi) return;
          let hb = e ? e.beden : (sa.bedenAyni ? mb : null);
          // KARŞILIKSIZ BEDEN (v1.570.0): eskiden satır hiç açılmıyor, yalnız toast söylüyordu. Renkteki sıra: geçmiş
          // reçetelerde bu hammaddeye bu bedenle verilmiş boy (kırmızı, `bedenGecmisten`); o da yoksa satır açılmaz,
          // beden eşleşme şeridinde turuncu "eşleştir…" kutusu çıkar (ve `bedenEksikler`de adı geçer).
          let bedenGecmis = false;
          if (!hb) { const g = gecmisBedenOnerisi(bedenHarita, sa.hammaddeUrunId, mb); if (g) { hb = g; bedenGecmis = true; } }
          // Miktar bedene göre değişiyorsa (sa.miktar yok) karşılıksız bedene EN YAKIN bedenin miktarı — eskiden
          // boy = numara olan tabanda bile miktar bulunamayınca beden düşüyordu.
          let miktar = e ? e.miktar : sa.miktar;
          if (miktar == null && !e) { const yb = enYakinBeden(Object.keys(sa.bedenler), mb); miktar = yb ? sa.bedenler[yb].miktar : null; }
          if (!hb || miktar == null) { bedenEksikler.add(`${sa.hammaddeAd || "?"} (${mb})`); return; }
          if (ayniVarMi(mb, hb)) { atlanan += 1; return; }
          if (bedenGecmis) bedenGecmisSayisi += 1;
          eklenecekler.push({ mamulRenk: mr, mamulBeden: mb, beden: hb, miktar: parseFloat(miktar) || 0, ...ortak, ...(bedenGecmis ? { bedenGecmisten: true } : {}) });
        });
        return;
      }
      if (ayniVarMi(null, sa.beden || "Standart")) { atlanan += 1; return; }
      eklenecekler.push({ mamulRenk: mr, mamulBeden: "Tüm Bedenler", beden: sa.beden || "Standart", miktar: parseFloat(sa.miktar) || 0, ...ortak });
    });
  });
  const ekAlanlar = {};
  let iscilikSayisi = 0;
  const isc = sablon.iscilik || {};
  const pu = { ...(product.prosesUcretleri || {}) };
  Object.entries(isc.prosesUcretleri || {}).forEach(([p, u]) => { if (u > 0 && !(pu[p] > 0)) { pu[p] = u; iscilikSayisi++; } });
  if (iscilikSayisi) ekAlanlar.prosesUcretleri = pu;
  const ape = { ...(product.araProsesEklentileri || {}) };
  let apeSayisi = 0;
  Object.entries(isc.araProsesEklentileri || {}).forEach(([asil, v]) => { if (ape[asil] == null || (Array.isArray(ape[asil]) && ape[asil].length === 0)) { ape[asil] = v; apeSayisi++; } });
  if (apeSayisi) ekAlanlar.araProsesEklentileri = ape;
  const apu = { ...(product.araProsesUcretleri || {}) };
  let apuSayisi = 0;
  Object.entries(isc.araProsesUcretleri || {}).forEach(([id, u]) => { if (apu[id] == null) { apu[id] = u; apuSayisi++; } });
  if (apuSayisi) ekAlanlar.araProsesUcretleri = apu;
  gecmisSayisi = eklenecekler.filter((r) => r.renkGecmisten).length;
  return { eklenecekler, atlanan, ekAlanlar, iscilikSayisi: iscilikSayisi + apeSayisi, bedenEksikler: Array.from(bedenEksikler), bosEslesmeler, gecmisSayisi, bedenGecmisSayisi };
}

// Reçeteden şablon çıkar: EN ÇOK satırı olan mamul rengindeki (eskiden ilk renk — o renkte eksik malzeme varsa
// şablon eksik kalıyordu) satırlar. Bedenden bağımsız olan tek satır; bedene göre değişen (taban numarası,
// fusbet) v1.560.0'dan beri beden haritasıyla girer. Giremeyen (belirsiz) olursa ADI döner.
// Döner: { satirlar, atlanan, atlananlar }.
// `variants` (ürünün varyantları, isteğe bağlı): yalnız BAZI bedenlerde olan malzeme (ör. sadece 42'de) "tüm
// bedenler"e yayılmasın diye kaynak rengin beden sayısı bilinmeli; verilmezse eski davranış.
function recetedenSablonSatirlari(recete, variants) {
  const satirlar = recete || [];
  if (satirlar.length === 0) return { satirlar: [], atlanan: 0, atlananlar: [] };
  const sayac = {};
  satirlar.forEach((r) => { sayac[r.mamulRenk] = (sayac[r.mamulRenk] || 0) + 1; });
  const ilkRenk = Object.keys(sayac).sort((a, b) => sayac[b] - sayac[a])[0];
  const gruplar = {};
  satirlar.filter((r) => r.mamulRenk === ilkRenk).forEach((r) => {
    const a = `${r.hammaddeUrunId}|${r.renk || ""}|${r.proses || ""}`;
    (gruplar[a] = gruplar[a] || []).push(r);
  });
  const sonuc = [];
  const atlananlar = [];
  Object.values(gruplar).forEach((g) => {
    const boylar = new Set(g.map((r) => r.beden || "Standart"));
    const miktarlar = new Set(g.map((r) => r.miktar));
    const r = g[0];
    const pozisyon = sablonPozisyonu(r);
    const temel = { id: uid("ss"), hammaddeUrunId: r.hammaddeUrunId, hammaddeAd: r.hammaddeAd, renk: r.renk || "Standart",
      ...(pozisyon ? { pozisyon } : {}), birim: r.birim || "", proses: r.proses || "" };
    const ozelBedenler = new Set(g.map((x) => x.mamulBeden).filter((b) => b && b !== "Tüm Bedenler")); // sirasiz-tamam
    const kaynakBedenSayisi = new Set((variants || []).filter((v) => v.renk === ilkRenk && v.beden).map((v) => v.beden)).size; // sirasiz-tamam (yalnız sayılıyor)
    const kismi = ozelBedenler.size === g.length && kaynakBedenSayisi > 0 && ozelBedenler.size < kaynakBedenSayisi;
    if (boylar.size <= 1 && miktarlar.size <= 1 && !kismi) {
      sonuc.push({ ...temel, beden: r.beden || "Standart", miktar: r.miktar });
      return;
    }
    // BEDENE GÖRE DEĞİŞEN (v1.560.0 — kullanıcı: "yine eksik hammadde çekti"; taban, fusbet girmiyordu): mamul
    // bedeni → hammadde boyu + miktar haritası. "Tüm Bedenler" satırıyla karışık grup (belirsiz) yine girmez.
    if (g.some((x) => !x.mamulBeden || x.mamulBeden === "Tüm Bedenler")) { atlananlar.push(r.hammaddeAd || "?"); return; }
    const bedenler = {};
    g.forEach((x) => { bedenler[x.mamulBeden] = { beden: x.beden || "Standart", miktar: x.miktar }; });
    const bedenAyni = g.every((x) => kodEsit(x.beden || "", x.mamulBeden));
    sonuc.push({ ...temel, beden: bedenAyni ? "mamul bedeni" : "bedene göre", miktar: miktarlar.size === 1 ? r.miktar : null,
      bedenler, ...(bedenAyni ? { bedenAyni: true } : {}), ...(kismi ? { kismi: true } : {}) });
  });
  return { satirlar: sonuc, atlanan: atlananlar.length, atlananlar };
}

// Üründen şablonun işçilik kısmı: sıfırdan büyük proses ücretleri, ara proses seçimleri ve ücretleri. Saf.
function urundenSablonIsciligi(product) {
  const prosesUcretleri = {};
  Object.entries((product && product.prosesUcretleri) || {}).forEach(([p, u]) => { if (u > 0) prosesUcretleri[p] = u; });
  return { prosesUcretleri, araProsesEklentileri: { ...((product && product.araProsesEklentileri) || {}) },
    araProsesUcretleri: { ...((product && product.araProsesUcretleri) || {}) } };
}

// ================= YENİ RENK → REÇETE EŞLEŞTİRMESİ GEÇMİŞTEN (v1.564.0) =================
//
// Kullanıcı: "Yeni renk eklenince eşleştirmeyi geçmişten otomatik doldursun." Ürüne renk eklenince reçetede o renk
// için hiç satır açılmıyordu; her hammaddede turuncu "eşleştir…" kutusundan tek tek seçmek gerekiyordu.
// Her reçete grubu (ekleme + hammadde + proses + pozisyon) için ÖRNEK bir mevcut rengin satırları (bedenler, boy,
// miktar AYNEN) yeni renge kopyalanır; hammadde rengi şablonla AYNI kuralla çözülür (`sablonRengiCoz`): aynı ad →
// geçmiş karar (kırmızı, `renkGecmisten`) → tek renkli / Standart. Ek kural: grubun BÜTÜN mevcut renkleri (en az
// iki) aynı hammadde rengini kullanıyorsa o renk (ör. Silme Suyu hep Standart, Yapıştırıcı hep Beyaz) — sabit
// malzeme. Hiçbiri tutmazsa satır AÇILMAZ (matris turuncu "eşleştir…"). Ambalajda değişken satır aynen kopyalanır.
// Döner: { satirlar (id'siz), gecmisSayisi, bosGruplar: [hammaddeAd] }.
function yeniRenkReceteSatirlari(product, yeniRenk, tumUrunler) {
  const recete = (product && product.recete) || [];
  const sonuc = { satirlar: [], gecmisSayisi: 0, bosGruplar: [] };
  // v1.605.0: "renk zaten reçetede varsa hiç dokunma" erken dönüşü KALKTI — model rengi ekleme yolu (100
  // yeniRenkVeReceteEkle) kaynak renkten bazı satırları kopyalayıp kalan gruplar için buraya geliyor; grup zaten
  // kapsıyorsa `grupYeniRenkSatirlari` null döner, çift satır açılmaz.
  if (!yeniRenk || recete.length === 0) return sonuc;
  const gecmisHarita = gecmisRenkEslesmeleri(tumUrunler || []);
  const gruplar = new Map();
  recete.forEach((r) => {
    const k = `${r.eklemeId || ""}|${r.hammaddeUrunId}|${r.proses || ""}|${r.aciklama || ""}`;
    if (!gruplar.has(k)) gruplar.set(k, []);
    gruplar.get(k).push(r);
  });
  const eklemeTarihi = new Date().toISOString();
  gruplar.forEach((satirlar) => {
    const g = grupYeniRenkSatirlari(satirlar, yeniRenk, tumUrunler, gecmisHarita, eklemeTarihi, recete.concat(sonuc.satirlar));
    if (!g) return;
    if (g.bos) { sonuc.bosGruplar.push(g.hammaddeAd); return; }
    sonuc.satirlar.push(...g.satirlar);
    if (g.gecmis) sonuc.gecmisSayisi += 1;
  });
  return sonuc;
}

// Tek reçete grubunun (aynı ekleme+hammadde+proses+açıklama) satırlarını `yeniRenk` için kurar. Döner:
// null (grup yeni rengi zaten kapsıyor) | { bos: true, hammaddeAd } | { satirlar, gecmis }.
function grupYeniRenkSatirlari(satirlar, yeniRenk, tumUrunler, gecmisHarita, eklemeTarihi, tumRecete) {
  const nrmRenk = (x) => String(x || "").trim().toLocaleLowerCase("tr-TR");
  if (satirlar.some((r) => r.mamulRenk === yeniRenk)) return null;
  const s0g = satirlar[0];
  // DENETİM (v1.568.0): (a) aynı hammadde+proses+açıklama bu renkte BAŞKA bir eklemeyle zaten varsa grup o renk için
  // tamamdır — "Reçeteye Ekle" renk renk ayrı işlemlerle yapılabiliyor; yoksa çift satır (tüketim 2 kat) açılıyordu.
  if ((tumRecete || []).some((r) => r.mamulRenk === yeniRenk && r.hammaddeUrunId === s0g.hammaddeUrunId
    && (r.proses || "") === (s0g.proses || "") && (r.aciklama || "") === (s0g.aciklama || ""))) return null;
  // (b) "N. Renk" pozisyon satırı yalnız N'inci bileşeni OLAN model rengine uygulanır; tekli renge "2. Renk" açılmaz.
  const pozNo = parseInt((String(s0g.aciklama || "").match(/^(\d+)\. Renk$/) || [])[1] || "", 10) || null;
  if (pozNo && (kombinasyonEtiketiFormatindaMi(yeniRenk) ? !kombinasyonRengiCoz(yeniRenk, pozNo) : pozNo > 1)) return null;
  {
    const renkler = Array.from(new Set(satirlar.map((r) => r.mamulRenk)));
    // Örnek: en çok satırı olan mamul rengi (bedenleri en eksiksiz olan).
    const ornekRenk = renkler.sort((a, b) => satirlar.filter((r) => r.mamulRenk === b).length - satirlar.filter((r) => r.mamulRenk === a).length)[0];
    const ornek = satirlar.filter((r) => r.mamulRenk === ornekRenk);
    const s0 = ornek[0];
    const poz = parseInt((String(s0.aciklama || "").match(/^(\d+)\. Renk$/) || [])[1] || "", 10) || null;
    let cozum;
    if (s0.ambalajDegisken) cozum = { renk: s0.renk, gecmis: false };
    else {
      const kullanilan = Array.from(new Set(satirlar.map((r) => r.renk)));
      // (c) SABİT MALZEME ÖNCE (v1.568.0): en az iki renk aynı hammadde rengini kullanıyorsa (Toka hep Nikel) o renk —
      // "aynı ad" kuralı yeni rengi (Siyah) Toka Siyah'a çeviriyordu.
      if (renkler.length >= 2 && kullanilan.length === 1 && kullanilan[0]) cozum = { renk: kullanilan[0], gecmis: false };
      else cozum = sablonRengiCoz({ hammaddeUrunId: s0.hammaddeUrunId, renk: s0.renk, pozisyon: poz }, yeniRenk, { tumUrunler }, gecmisHarita);
      // Renksiz kullanım (hep "Standart") tek renkte de sabittir (v1.566.0: Takviye Bezi, Jut).
      if (!cozum.renk && kullanilan.every((x) => !x || nrmRenk(x) === "standart")) cozum = { renk: kullanilan[0] || "Standart", gecmis: false };
    }
    if (!cozum.renk) return { bos: true, hammaddeAd: s0.hammaddeAd || "?" };
    return { gecmis: !!cozum.gecmis, satirlar: ornek.map((r) => {
      const { id, renkGecmisten: _rg, ...rest } = r;
      return { ...rest, mamulRenk: yeniRenk, renk: cozum.renk, eklemeTarihi: rest.eklemeTarihi || eklemeTarihi,
        ...(cozum.gecmis ? { renkGecmisten: true } : {}) };
    }) };
  }
}

// EKSİK RENK EŞLEŞMELERİNİ DOLDUR (v1.566.0 — kullanıcı: "Eşleştirmede renk ve bedensizler otomatik eşleşecek, renk
// uyanlar otomatik, eskiden hatırlama mantığı da olacak"). v1.564'ten ÖNCE eklenen renkler (ya da elle bırakılmış
// boşluklar) için: ürünün her rengi × her reçete grubu, satırı yoksa `grupYeniRenkSatirlari` ile (aynı ad → geçmiş
// [kırmızı] → sabit/Standart → boş). Döner: { satirlar, gecmisSayisi, bosSayisi }.
function eksikRenkEslesmeleri(product, tumUrunler) {
  const recete = (product && product.recete) || [];
  const sonuc = { satirlar: [], gecmisSayisi: 0, bosSayisi: 0 };
  if (recete.length === 0) return sonuc;
  const renkler = Array.from(new Set((product.variants || []).map((v) => v.renk).filter(Boolean)));
  const gecmisHarita = gecmisRenkEslesmeleri(tumUrunler || []);
  const gruplar = new Map();
  recete.forEach((r) => {
    const k = `${r.eklemeId || ""}|${r.hammaddeUrunId}|${r.proses || ""}|${r.aciklama || ""}`;
    if (!gruplar.has(k)) gruplar.set(k, []);
    gruplar.get(k).push(r);
  });
  const eklemeTarihi = new Date().toISOString();
  gruplar.forEach((satirlar) => renkler.forEach((mr) => {
    const g = grupYeniRenkSatirlari(satirlar, mr, tumUrunler, gecmisHarita, eklemeTarihi, recete.concat(sonuc.satirlar));
    if (!g) return;
    if (g.bos) { sonuc.bosSayisi += 1; return; }
    sonuc.satirlar.push(...g.satirlar);
    if (g.gecmis) sonuc.gecmisSayisi += 1;
  }));
  return sonuc;
}

// ================= BAŞKA STOKTAN REÇETE ÇEK (v1.564.0) =================
//
// Kullanıcı: "Aynı şekilde kopyalayınca hiç değişmeyecek ve kopyalanan stoğa olduğu gibi yapıştırılacak. Başka stok
// içinden reçeteyi stoktan çek — o stoğun reçetesini kopyala, konuştuğumuz tüm şeyler eksiksiz olsun."
// Kurallar:
//  • Hedefin KAYNAKTA DA OLAN mamul rengi → kaynak satırları AYNEN (hammadde rengi, bedenler, boy, miktar, açıklama).
//  • Kaynakta OLMAYAN renk → `yeniRenkReceteSatirlari` (aynı ad → geçmiş [kırmızı] → sabit malzeme → boş [turuncu]).
//  • Bedenler: hedefte olmayan mamul bedeninin satırı alınmaz; kaynakta olmayan hedef bedeni, satırın boyu mamul
//    bedenine eşitse (taban/fusbet) aynı numarayla açılır, değilse `bedenEksikler`e (adıyla) yazılır.
//  • Hedefte zaten olan (renk+hammadde+proses+beden) satır tekrar eklenmez.
//  • Her kaynak eklemesi yeni bir "kopya-" kimliği alır (kart düzeni aynen; geri alma bu önekle).
//  • İşçilik / ara proses: hedefte BOŞ olanlar kaynaktan (şablonla aynı kural).
// Döner: { eklenecekler, ekAlanlar, iscilikSayisi, gecmisSayisi, bosGruplar, bedenEksikler, atlanan, ayniRenkSayisi, bedenGecmisSayisi }.
function stoktanReceteKopyala(kaynak, hedef, tumUrunler) {
  const kRecete = (kaynak && kaynak.recete) || [];
  const mevcut = (hedef && hedef.recete) || [];
  const hRenkler = Array.from(new Set((hedef.variants || []).map((v) => v.renk)));
  const hBedenleri = (mr) => bedenSirala(Array.from(new Set((hedef.variants || []).filter((v) => v.renk === mr).map((v) => v.beden).filter(Boolean))));
  const kRenkler = new Set(kRecete.map((r) => r.mamulRenk));
  const kimlikler = new Map();
  const yeniKimlik = (eid) => { const k = eid || "_"; if (!kimlikler.has(k)) kimlikler.set(k, uid("kopya")); return kimlikler.get(k); };
  const sonuc = { eklenecekler: [], ekAlanlar: {}, iscilikSayisi: 0, gecmisSayisi: 0, bosGruplar: [], bedenEksikler: [], atlanan: 0, ayniRenkSayisi: 0, bedenGecmisSayisi: 0 };
  const bedenHarita = gecmisBedenEslesmeleri(tumUrunler);
  const bedenEksik = new Set();
  const eklemeTarihi = new Date().toISOString();
  hRenkler.forEach((mr) => {
    let satirlar;
    if (kRenkler.has(mr)) {
      satirlar = kRecete.filter((r) => r.mamulRenk === mr).map(({ id, renkGecmisten: _rg, bedenGecmisten: _bg, ...rest }) => rest);
      sonuc.ayniRenkSayisi += 1;
    } else {
      const y = yeniRenkReceteSatirlari(kaynak, mr, tumUrunler);
      satirlar = y.satirlar;
      sonuc.gecmisSayisi += y.gecmisSayisi;
      y.bosGruplar.forEach((a) => sonuc.bosGruplar.push(`${a} · ${mr}`));
    }
    const bedenler = hBedenleri(mr);
    // Grup grup beden uyumu: hedefte olmayan bedeni at; kaynakta olmayan hedef bedenini (boy = numara ise) aç.
    const gruplar = new Map();
    satirlar.forEach((r) => {
      const k = `${r.eklemeId || ""}|${r.hammaddeUrunId}|${r.proses || ""}|${r.aciklama || ""}`;
      if (!gruplar.has(k)) gruplar.set(k, []);
      gruplar.get(k).push(r);
    });
    gruplar.forEach((g) => {
      const bedenli = g.filter((r) => r.mamulBeden && r.mamulBeden !== "Tüm Bedenler");
      let son = g.filter((r) => !r.mamulBeden || r.mamulBeden === "Tüm Bedenler");
      if (bedenli.length) {
        const varolan = bedenli.filter((r) => bedenler.length === 0 || bedenler.includes(r.mamulBeden));
        son = son.concat(varolan);
        const kapsanan = new Set(bedenli.map((r) => r.mamulBeden));
        const bedenAyni = bedenli.every((r) => kodEsit(r.beden || "", r.mamulBeden));
        bedenler.filter((b) => !kapsanan.has(b)).forEach((b) => {
          // Karşılıksız hedef bedeni (v1.570.0): kaynak satır = EN YAKIN beden (miktar ondan). Boy = numara ise aynı
          // numara; değilse geçmiş reçetelerde bu bedene verilmiş boy (kırmızı); o da yoksa açılmaz → turuncu kutu.
          const kaynakSatir = bedenli.find((r) => r.mamulBeden === enYakinBeden(bedenli.map((x) => x.mamulBeden), b)) || bedenli[bedenli.length - 1];
          if (bedenAyni) { son.push({ ...kaynakSatir, mamulBeden: b, beden: b }); return; }
          const gb = gecmisBedenOnerisi(bedenHarita, kaynakSatir.hammaddeUrunId, b);
          if (gb) { son.push({ ...kaynakSatir, mamulBeden: b, beden: gb, bedenGecmisten: true }); sonuc.bedenGecmisSayisi += 1; return; }
          bedenEksik.add(`${g[0].hammaddeAd || "?"} (${b})`);
        });
      }
      son.forEach((r) => {
        // Açıklama da karşılaştırılır (v1.568.0): hedefte Deri "Yüz" varken kaynaktaki Deri "Astar" atlanıyordu.
        const ayni = mevcut.some((m) => m.mamulRenk === mr && m.hammaddeUrunId === r.hammaddeUrunId && (m.proses || "") === (r.proses || "")
          && (m.mamulBeden || "Tüm Bedenler") === (r.mamulBeden || "Tüm Bedenler") && (m.aciklama || "") === (r.aciklama || ""));
        if (ayni) { sonuc.atlanan += 1; return; }
        sonuc.eklenecekler.push({ ...r, mamulRenk: mr, eklemeId: yeniKimlik(r.eklemeId), eklemeTarihi });
      });
    });
  });
  sonuc.bedenEksikler = Array.from(bedenEksik);
  // İşçilik: şablondaki kuralın aynısı — hedefte boş olan dolar, dolu olan ezilmez.
  const isc = urundenSablonIsciligi(kaynak);
  const pu = { ...(hedef.prosesUcretleri || {}) };
  Object.entries(isc.prosesUcretleri).forEach(([p, u]) => { if (u > 0 && !(pu[p] > 0)) { pu[p] = u; sonuc.iscilikSayisi++; } });
  if (sonuc.iscilikSayisi) sonuc.ekAlanlar.prosesUcretleri = pu;
  const ape = { ...(hedef.araProsesEklentileri || {}) };
  let n = 0;
  Object.entries(isc.araProsesEklentileri).forEach(([a, v]) => { if (ape[a] == null || (Array.isArray(ape[a]) && ape[a].length === 0)) { ape[a] = v; n++; } });
  if (n) sonuc.ekAlanlar.araProsesEklentileri = ape;
  const apu = { ...(hedef.araProsesUcretleri || {}) };
  let m = 0;
  Object.entries(isc.araProsesUcretleri).forEach(([id, u]) => { if (apu[id] == null) { apu[id] = u; m++; } });
  if (m) sonuc.ekAlanlar.araProsesUcretleri = apu;
  sonuc.iscilikSayisi += n;
  return sonuc;
}
