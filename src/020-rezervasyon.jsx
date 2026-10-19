// Bir tarih değerinin ÜST SINIRINI verir.
//
// Cari hareketleri tarihi GÜN bazlı saklar ("2026-08-27"), stok hareketleri ise tam zaman damgası
// ("2026-08-27T16:45:00Z"). İkisini doğrudan karşılaştırmak, aynı gün öğleden sonra yapılmış bir
// üretim girişini "teslimden sonra" saydırıyordu — çünkü gün bazlı değer gece yarısına denk gelir.
// Bu yüzden gün bazlı bir tarih, o günün SONU olarak ele alınır.
// =============================================================================================
// REZERVASYON TÜKETİMİ
//
// Bir hammadde, belirli bir satış siparişi için satın alındığında alış kaleminde bir rezervasyon
// kaydı oluşur: { siparisId, siparisNo, miktar }. Bu kayıt teslim alındığında "yolda" olmaktan
// çıkar ama AÇIK kalır — malzeme stokta durur ve hâlâ o sipariş içindir.
//
// Eksik olan, tüketim tarafıydı: üretim hammaddeyi tükettiğinde rezervasyona dokunulmuyordu.
// Bu yüzden bir rezervasyonun gerçekten kullanılıp kullanılmadığı hiçbir yerde görünmüyor,
// başka bir siparişin üretimi rezerveli malzemeyi yediğinde de iz kalmıyordu.
//
// Çözüm: rezervasyon kaydına `tuketilen` alanı eklenir. kalan = miktar − tuketilen.
// Kalan sıfırlanınca rezervasyon KAPANMIŞ olur.
//
// KARARLAR (bkz. konuşma):
//  · FIFO — birden fazla açık rezervasyon varsa en ESKİ alıştan düşülür; maliyet takibiyle tutarlı.
//  · Tüketim rezervasyonu aşarsa ENGELLENMEZ, yalnızca uyarılır. Atölyede fire gerçektir ve işi
//    durdurmak yanlış olur; aşan kısım "rezervasyonsuz tüketim" olarak işaretlenir.
//  · Kısmi teslimde bile tüketime izin verilir (stok eksiye düşebilir) — malzeme gelmeden üretimi
//    kilitlemek, atölyenin fiilen çalışma biçimine aykırı.
const rezervasyonKalan = (r) => Math.max(0, (r.miktar || 0) - (r.tuketilen || 0));

// GEÇERLİ REZERVASYONLAR (v1.713.0 — kullanıcı: "üretimi ben sildim bilerek, sorunum hatanın çıkması"). Üretim silinince
// silme zinciri rezervasyonunu da siler (076); ama rezervasyon defteri bütün liste hâlinde yazılan bir tablo ve başka bir
// yazma (iş verme, teslim, planlama) bayat kapanış listesiyle silinmiş üretimin satırlarını geri getirebiliyor — kullanıcıda
// üretim 10033 yokken 136 birimlik talebi duruyordu, Deri "3016 açık" gösteriyordu. Talep ARTIK TÜRETİLİR: üretim
// numarası taşıyan rezervasyon, o üretim listede yoksa kapanmış sayılır ve hiçbir ekranda talebe girmez (karşılanan
// sayacında v1.367.0'da yapılan geçişin aynısı). Ham defter yazma yollarında ve veri denetiminde olduğu gibi kalır;
// denetim yetimleri bildirir, kullanıcı isterse tek düğmeyle siler. Saf; birim testi `birim-gecerli-rezervasyon`.
function gecerliRezervasyonlar(rezervasyonlar, uretimListesi) {
  const nolar = new Set((uretimListesi || []).map((u) => u && String(u.siparisNo)));
  const liste = rezervasyonlar || [];
  const sonuc = liste.filter((r) => r && (!r.uretimNo || nolar.has(String(r.uretimNo))));
  return sonuc.length === liste.length ? liste : sonuc;
}

// =============================================================================================
// REZERVASYON KARŞILAMA
//
// Rezervasyon bir TALEPTİR; stok ise ARZ. İkisi ayrı büyüklüklerdir ve talep arzı aşabilir —
// aşması normaldir, satın almayı zaten o aşım tetikler.
//
// Bu fonksiyon talepleri stoğa dağıtır:
//   · Sıra TARİHE göre — önce rezerve eden sipariş önce karşılanır. Sonradan gelen bir sipariş,
//     önce söz verilmiş malı alamaz.
//   · Yoldaki alışlar da arz sayılır ama AYRI: o siparişe özel gelen mal yalnızca o talebi karşılar,
//     genel havuza girmez.
//   · Karşılanamayan kısım "açık"tır — satın alınması gereken miktar budur.
//
// Dönüş: { stok, talepler: [{...rez, karsilanan, yolda, acik}], toplamTalep, stoktanKarsilanan,
//          yoldaToplam, acikToplam, serbestStok }
// "Standart" / "" / null AYNI varyant (v1.639.0, denetim): varyant `stokAnahtarNrm` ile bulunurken defter ve alış
// kalemleri birebir karşılaştırılıyordu — "" kayıtlı varyanta bakınca talep 0 / açık 0 çıkıyordu.
function ayniVaryantMi(renk1, beden1, renk2, beden2) {
  return stokAnahtarNrm(renk1) === stokAnahtarNrm(renk2) && stokAnahtarNrm(beden1) === stokAnahtarNrm(beden2);
}

function rezervasyonKarsilama(urunId, renk, beden, tumSiparisler, stokRez, stokListesi) {
  const urun = (stokListesi || []).find((p) => p.id === urunId);
  // `stokAnahtarNrm` (v1.493.0): reçete renksiz hammaddeyi "Standart" yazar, hammaddenin kaydı ""
  // olabilir — birebir karşılaştırmada stok 0 görünüyordu (MRP 230, planlama 335, reçete 055 aynı).
  const varyant = urun ? (urun.variants || []).find((v) => stokAnahtarNrm(v.renk) === stokAnahtarNrm(renk) && stokAnahtarNrm(v.beden) === stokAnahtarNrm(beden)) : null;
  const stok = varyant ? varyant.miktar : 0;

  // Talepler: stok rezervasyon defteri (üretim kararında yazılan tam ihtiyaç).
  const talepler = (stokRez || [])
    .filter((r) => r.urunId === urunId && ayniVaryantMi(r.renk, r.beden, renk, beden) && rezervasyonKalan(r) > 0)
    .map((r) => ({ ...r, kalan: rezervasyonKalan(r) }))
    .sort((a, b) => String(a.tarih).localeCompare(String(b.tarih)));

  // Sipariş bazında yoldaki (teslim alınmamış) alış rezervasyonları — o talebe özel arz.
  const yoldaHaritasi = {};
  (tumSiparisler || []).forEach((s) => {
    if (s.tip !== "Alış" || s.durum === "İptal") return;
    (s.kalemler || []).forEach((k) => {
      if (k.urunId !== urunId || !ayniVaryantMi(k.renk, k.beden, renk, beden)) return;

      // YOLDAKİ MİKTAR ORANLA DEĞİL, FIFO PAYLAŞTIRMAYLA HESAPLANIR.
      //
      // Eskiden kalemin teslim oranı (karsilanan / miktar) rezervasyonların her birine ÇARPAN
      // olarak uygulanıyordu. Bu, çift/adet gibi BÖLÜNMEZ birimlerde küsurat üretiyordu:
      // ekranda "beklenen serbest 15.87", "açık 3.87" gibi sayılar çıkıyordu — yarım taban diye
      // bir şey yok. Kullanıcının bildirdiği belirti buydu.
      //
      // Doğrusu: kalemin HENÜZ GELMEMİŞ miktarı (miktar − karsilanan) bir havuzdur; rezervasyonlara
      // sırayla dağıtılır. Teslim alınan kısım zaten STOK sütununda sayılıyor, ikinci kez
      // düşülmemeli. Sonuç her zaman tam sayı kalır (girdiler tam sayıysa).
      let kalemBekleyen = stokYuvarla(Math.max(0, (k.miktar || 0) - (k.karsilanan || 0)));
      (k.rezervasyonlar || []).forEach((r) => {
        if (kalemBekleyen <= 0) return;
        const kalan = rezervasyonKalan(r);
        if (kalan <= 0) return;
        const yolda = Math.min(kalan, kalemBekleyen);
        kalemBekleyen = stokYuvarla(kalemBekleyen - yolda);
        yoldaHaritasi[r.siparisId] = stokYuvarla((yoldaHaritasi[r.siparisId] || 0) + yolda);
      });
    });
  });

  let kalanStok = stok;
  const sonuc = talepler.map((t) => {
    const stoktan = Math.min(kalanStok, t.kalan);
    kalanStok = stokYuvarla(kalanStok - stoktan);
    const kalanTalep = stokYuvarla(t.kalan - stoktan);
    const yolda = Math.min(yoldaHaritasi[t.siparisId] || 0, kalanTalep);
    yoldaHaritasi[t.siparisId] = stokYuvarla((yoldaHaritasi[t.siparisId] || 0) - yolda);
    return { ...t, karsilanan: stoktan, yolda, acik: stokYuvarla(kalanTalep - yolda) };
  });

  return {
    stok,
    talepler: sonuc,
    toplamTalep: stokYuvarla(sonuc.reduce((s, t) => s + t.kalan, 0)),
    stoktanKarsilanan: stokYuvarla(sonuc.reduce((s, t) => s + t.karsilanan, 0)),
    yoldaToplam: stokYuvarla(sonuc.reduce((s, t) => s + t.yolda, 0)),
    acikToplam: stokYuvarla(sonuc.reduce((s, t) => s + t.acik, 0)),
    serbestStok: stokYuvarla(kalanStok),
  };
}


// Bir satış siparişinin, belirli bir hammadde+renk+beden için AÇIK rezervasyonlarını, en eski
// alıştan başlayarak sıralı döndürür.
function acikRezervasyonlar(satisSiparisId, hammaddeUrunId, renk, beden, tumSiparisler) {
  const sonuc = [];
  (tumSiparisler || []).forEach((s) => {
    if (s.tip !== "Alış" || s.durum === "İptal") return;
    (s.kalemler || []).forEach((k) => {
      if (k.urunId !== hammaddeUrunId || !ayniVaryantMi(k.renk, k.beden, renk, beden)) return;
      (k.rezervasyonlar || []).forEach((r, i) => {
        if (r.siparisId !== satisSiparisId) return;
        if (rezervasyonKalan(r) <= 0) return;
        sonuc.push({ alisId: s.id, alisNo: s.siparisNo, alisTarihi: s.tarih || "", kalemId: k.id, index: i, kalan: rezervasyonKalan(r) });
      });
    });
  });
  // FIFO: en eski alış önce. Tarih eşitse sipariş numarası ayırıcı olur.
  sonuc.sort((a, b) => String(a.alisTarihi).localeCompare(String(b.alisTarihi)) || String(a.alisNo).localeCompare(String(b.alisNo)));
  return sonuc;
}

// Verilen miktarı, o satış siparişinin açık rezervasyonlarından FIFO ile düşer.
// Dönüş: { yeniSiparisler, dusulen, rezervasyonsuz, kapananlar }
// `yon` = -1 tüketim, +1 geri alma (geri almada `tuketilen` azaltılır).
function rezervasyonTuket(tumSiparisler, satisSiparisId, hammaddeUrunId, renk, beden, miktar, yon = -1) {
  const bos = { yeniSiparisler: tumSiparisler, dusulen: 0, rezervasyonsuz: miktar, kapananlar: [] };
  if (!satisSiparisId || !(miktar > 0)) return bos;

  if (yon > 0) {
    // GERİ ALMA: tüketilmiş payları serbest bırakır. Bu adım atlanırsa, geri alınan bir üretimin
    // rezervasyonu kapalı görünmeye devam eder ve malzeme "kullanılmış" sayılır.
    let kalanIade = miktar;
    const yeni = (tumSiparisler || []).map((s) => {
      if (kalanIade <= 0 || s.tip !== "Alış") return s;
      let sDegisti = false;
      const kalemler = (s.kalemler || []).map((k) => {
        if (kalanIade <= 0) return k;
        if (k.urunId !== hammaddeUrunId || !ayniVaryantMi(k.renk, k.beden, renk, beden)) return k;
        if (!Array.isArray(k.rezervasyonlar)) return k;
        let kDegisti = false;
        const rez = k.rezervasyonlar.map((r) => {
          if (kalanIade <= 0 || r.siparisId !== satisSiparisId) return r;
          const iade = Math.min(r.tuketilen || 0, kalanIade);
          if (iade <= 0) return r;
          kalanIade = Math.round((kalanIade - iade) * 1000) / 1000;
          kDegisti = true; sDegisti = true;
          return { ...r, tuketilen: Math.round(((r.tuketilen || 0) - iade) * 1000) / 1000 };
        });
        return kDegisti ? { ...k, rezervasyonlar: rez } : k;
      });
      return sDegisti ? { ...s, kalemler } : s;
    });
    return { yeniSiparisler: yeni, dusulen: miktar - kalanIade, rezervasyonsuz: kalanIade, kapananlar: [] };
  }

  const acik = acikRezervasyonlar(satisSiparisId, hammaddeUrunId, renk, beden, tumSiparisler);
  if (acik.length === 0) return bos;

  // Hangi kayıttan ne kadar düşüleceğini önce planla, sonra tek geçişte uygula.
  let kalanIhtiyac = miktar;
  const plan = new Map(); // "alisId|kalemId|index" -> dusulecek
  const kapananlar = [];
  acik.forEach((a) => {
    if (kalanIhtiyac <= 0) return;
    const dus = Math.min(a.kalan, kalanIhtiyac);
    plan.set(`${a.alisId}|${a.kalemId}|${a.index}`, dus);
    kalanIhtiyac = Math.round((kalanIhtiyac - dus) * 1000) / 1000;
    if (dus >= a.kalan - 0.0001) kapananlar.push(a.alisNo);
  });

  const yeniSiparisler = (tumSiparisler || []).map((s) => {
    if (s.tip !== "Alış") return s;
    let sDegisti = false;
    const kalemler = (s.kalemler || []).map((k) => {
      if (k.urunId !== hammaddeUrunId || !ayniVaryantMi(k.renk, k.beden, renk, beden)) return k;
      if (!Array.isArray(k.rezervasyonlar)) return k;
      let kDegisti = false;
      const rez = k.rezervasyonlar.map((r, i) => {
        const dus = plan.get(`${s.id}|${k.id}|${i}`);
        if (!dus) return r;
        kDegisti = true; sDegisti = true;
        return { ...r, tuketilen: Math.round(((r.tuketilen || 0) + dus) * 1000) / 1000 };
      });
      return kDegisti ? { ...k, rezervasyonlar: rez } : k;
    });
    return sDegisti ? { ...s, kalemler } : s;
  });

  return {
    yeniSiparisler,
    dusulen: Math.round((miktar - kalanIhtiyac) * 1000) / 1000,
    rezervasyonsuz: kalanIhtiyac,
    kapananlar,
  };
}

// Stok rezervasyon defterinden FIFO düşer (yon=-1) ya da iade eder (yon=+1).
// Alış rezervasyonlarıyla aynı kurallar: en eski kayıt önce, aşan kısım engellenmez.
function stokRezervasyonTuket(defter, satisSiparisId, urunId, renk, beden, miktar, yon = -1) {
  if (!satisSiparisId || !(miktar > 0)) return { defter, dusulen: 0, kalanIhtiyac: miktar, kapananlar: [] };
  const sirali = (defter || [])
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.siparisId === satisSiparisId && r.urunId === urunId && ayniVaryantMi(r.renk, r.beden, renk, beden))
    .sort((a, b) => String(a.r.tarih).localeCompare(String(b.r.tarih)));

  let kalanIhtiyac = miktar;
  const plan = new Map();
  const kapananlar = [];
  sirali.forEach(({ r, i }) => {
    if (kalanIhtiyac <= 0) return;
    const uygun = yon > 0 ? (r.tuketilen || 0) : rezervasyonKalan(r);
    if (uygun <= 0) return;
    const d = Math.min(uygun, kalanIhtiyac);
    plan.set(i, d);
    kalanIhtiyac = stokYuvarla(kalanIhtiyac - d);
    if (yon < 0 && d >= uygun - 0.0001) kapananlar.push(r.uretimNo || r.siparisNo);
  });
  if (plan.size === 0) return { defter, dusulen: 0, kalanIhtiyac, kapananlar: [] };

  const yeni = (defter || []).map((r, i) => {
    const d = plan.get(i);
    if (!d) return r;
    return { ...r, tuketilen: stokYuvarla((r.tuketilen || 0) + (yon > 0 ? -d : d)) };
  });
  return { defter: yeni, dusulen: stokYuvarla(miktar - kalanIhtiyac), kalanIhtiyac, kapananlar };
}

// REZERVASYON FARKINI GÜNCEL LİSTEYE UYGULA (v1.713.1 — kullanıcı: "üçünü de düzelt"). Teslim (079), iş verme (080) ve ad
// değiştirme (082) rezervasyon defterini kapanıştaki (render anındaki) listeden hesaplayıp BÜTÜN listeyi yazıyordu. Bu arada
// silinen bir üretimin satırları kapanışta hâlâ durduğu için yazma onları buluta geri getiriyordu (10033'ün 136'lık
// talebi böyle hayatta kalmış olmalı). Hesap yine kapanış listesinde yapılır (FIFO planı, uyarılar, kapanan rezervasyon
// listesi orada); ama YAZILAN liste güncel listedir: eski→yeni farkı (tuketilen, renk, beden) kayıt kimliğiyle güncel
// listeye uygulanır. Güncel listede olmayan kayıt (bu arada silinmiş) ATLANIR — geri gelmez. Kimliksiz eski kayıtlar
// sipariş+ürün+renk+beden+tarih ile eşlenir. Hiçbir şey değişmediyse aynı dizi döner. Saf; birim-gecerli-rezervasyon.
function rezervasyonAnahtari(r) {
  if (!r) return "";
  if (r.id != null) return `id:${r.id}`;
  return `k:${r.siparisId}|${r.urunId}|${r.renk}|${r.beden}|${r.tarih}`;
}
function rezervasyonFarkiniUygula(guncel, eskiListe, yeniListe) {
  const eski = new Map((eskiListe || []).map((r) => [rezervasyonAnahtari(r), r]));
  const degisen = new Map();
  (yeniListe || []).forEach((y) => {
    const k = rezervasyonAnahtari(y);
    const e = eski.get(k);
    if (!e || e === y) return;
    const fark = {};
    if ((y.tuketilen || 0) !== (e.tuketilen || 0)) fark.tuketilenFarki = stokYuvarla((y.tuketilen || 0) - (e.tuketilen || 0));
    if (y.renk !== e.renk) fark.renk = y.renk;
    if (y.beden !== e.beden) fark.beden = y.beden;
    if (Object.keys(fark).length) degisen.set(k, fark);
  });
  if (degisen.size === 0) return guncel;
  let degisti = false;
  const sonuc = (guncel || []).map((r) => {
    const f = degisen.get(rezervasyonAnahtari(r));
    if (!f) return r;
    degisti = true;
    const yeni = { ...r };
    if (f.tuketilenFarki) yeni.tuketilen = stokYuvarla((r.tuketilen || 0) + f.tuketilenFarki);
    if (f.renk !== undefined) yeni.renk = f.renk;
    if (f.beden !== undefined) yeni.beden = f.beden;
    return yeni;
  });
  return degisti ? sonuc : guncel;
}

// =============================================================================================
// STOK DURUMU — tek varyantın tam tablosu
//
// Beş büyüklük ve aralarındaki ilişki:
//
//   stok                       elde fiilen duran
//   rezerve                    stoğun siparişlere ayrılmış kısmı
//   serbest    = stok − rezerve            bugün başka bir işe verilebilecek
//   yoldaSerbest               sipariş edilmiş ama HİÇBİR siparişe rezerve edilmemiş alım
//   beklenenSerbest = serbest + yoldaSerbest   mallar geldiğinde elde kalacak serbest miktar
//
// Ayrıca rezerveli yoldaki alım (yoldaRezerve) ayrı tutulur: o mal gelecek ama BAŞKA bir siparişe
// ait olduğu için serbest miktara eklenmez. Bu ayrımı yapmamak, "yolda mal var" diye yeni bir işe
// girişmeye ve o malı iki kez söz vermeye yol açardı.
function stokDurumu(urunId, renk, beden, tumSiparisler, stokRez, stokListesi) {
  const kars = rezervasyonKarsilama(urunId, renk, beden, tumSiparisler, stokRez, stokListesi);

  // Rezervasyonsuz (genel) alımlar: kaleminde hiç rezervasyon taşımayan, henüz teslim alınmamış
  // alış satırları. Bunlar geldiğinde serbest stoğa eklenir.
  let yoldaSerbest = 0;
  // YOLDAKİ TOPLAM ALIM — TALEPTEN BAĞIMSIZ.
  //
  // `yoldaToplam` (rezervasyonKarsilama'dan) talebe göre KIRPILIYOR: bir satırın talebi stoktan
  // karşılandıysa yoldaki alım 0 görünüyor. "Satın alma var mı?" sorusunun cevabı ise talepten
  // bağımsızdır — mal yolda, gelecek. Bildirilen belirti: Beyaz·36'ya 7 çift girildi, talebi (6)
  // stoktan karşılandı ve SATIN ALMA sütunu "—" oldu; oysa o beden için de 12'lik alış vardı.
  let yoldaToplamAlim = 0;
  let yoldaRezerveliAlim = 0;
  const bekleyenAlislar = [];
  (tumSiparisler || []).forEach((s) => {
    if (s.tip !== "Alış" || s.durum === "İptal") return;
    (s.kalemler || []).forEach((k) => {
      if (k.urunId !== urunId || !ayniVaryantMi(k.renk, k.beden, renk, beden)) return;
      const bekleyen = stokYuvarla(Math.max(0, (k.miktar || 0) - (k.karsilanan || 0)));
      if (bekleyen <= 0) return;
      const rezerveliMi = Array.isArray(k.rezervasyonlar) && k.rezervasyonlar.some((r) => rezervasyonKalan(r) > 0);
      bekleyenAlislar.push({
        alisId: s.id, alisNo: s.siparisNo, cariId: s.cariId, durum: s.durum,
        miktar: bekleyen, rezerveliMi,
        rezervasyonlar: (k.rezervasyonlar || []).filter((r) => rezervasyonKalan(r) > 0),
      });
      yoldaToplamAlim = stokYuvarla(yoldaToplamAlim + bekleyen);
      if (rezerveliMi) yoldaRezerveliAlim = stokYuvarla(yoldaRezerveliAlim + bekleyen);
      else yoldaSerbest = stokYuvarla(yoldaSerbest + bekleyen);
    });
  });

  const serbest = stokYuvarla(kars.stok - kars.stoktanKarsilanan);
  return {
    ...kars,
    rezerve: kars.stoktanKarsilanan,
    serbest,
    // `yoldaRezerve`: talebe TAHSİS EDİLMİŞ yoldaki miktar (talep hesabında kullanılıyor).
    yoldaRezerve: kars.yoldaToplam,
    // `yoldaToplamAlim` / `yoldaRezerveliAlim`: fiilen yolda olan alım. SATIN ALMA sütunu bunu
    // gösteriyor — talep karşılanmış olsa bile mal yolda.
    yoldaToplamAlim,
    yoldaRezerveliAlim,
    yoldaSerbest,
    // BEKLENEN SERBEST = serbest + TAHSİS EDİLMEMİŞ yoldaki alım.
    //
    // Önce yalnızca "rezervesiz" alım sayılıyordu ve bu eksikti: rezerveli bir alım, talebi
    // STOKTAN karşılanmışsa artık o siparişe gerekmiyor — geldiğinde serbest stoğa girecek.
    // Kullanıcının satırı tam olarak buydu: stok 7, talep 6 (stoktan karşılandı), yolda rezerveli 6.
    // "Beklenen 1" diyordu; oysa o 6 geldiğinde elde 7 serbest kalacak.
    //
    // `kars.yoldaToplam` yoldaki alımın taleplere FİİLEN tahsis edilen kısmı (talep stoktan
    // karşılandıysa 0). Geri kalanı sahipsiz: serbest kalacak.
    beklenenSerbest: stokYuvarla(serbest + Math.max(0, yoldaToplamAlim - kars.yoldaToplam)),
    bekleyenAlislar,
  };
}

function tarihUstSinir(tarihStr) {
  const s = String(tarihStr || "");
  const t = new Date(s).getTime();
  if (isNaN(t)) return Infinity;
  // Saat bilgisi yoksa (yalnızca YYYY-AA-GG) günün sonuna taşınır.
  return s.includes("T") ? t : t + 24 * 60 * 60 * 1000 - 1;
}

// Bir hammaddenin birimi. Reçete satırındaki `birim` alanı, satır OLUŞTURULURKEN kopyalanmış bir
// anlık görüntüdür: hammaddenin birimi sonradan düzeltilse (çift → desi) eski satırlarda yanlış
// kalır ve ekranda "352 çift astar" gibi anlamsız değerler görünür.
//
// Bu yüzden gösterimde ÜRÜN KARTINDAKİ birim esas alınır — tek doğru kaynak odur ve kullanıcı
// birimi düzelttiğinde tüm ekranlar kendiliğinden düzelir. Ürün bulunamazsa reçetedeki değere
// düşülür (silinmiş ürünün geçmiş kaydı okunabilsin diye).
function hammaddeBirimi(urunId, stokListesi, yedekBirim) {
  const u = (stokListesi || []).find((p) => p.id === urunId);
  return (u && u.birim) || yedekBirim || "";
}

