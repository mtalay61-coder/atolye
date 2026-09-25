// ---- Planlama: MRP (Malzeme İhtiyaç Planlaması) ----
// Tüm bekleyen (henüz tam karşılanmamış) satış siparişi kalemlerine göre, reçete üzerinden GEREKEN
// toplam hammadde miktarını hesaplar, mevcut stokla karşılaştırır ve eksik olanları öne çıkarır. Bu,
// her siparişin kendi Tedarik Planlaması'ndan (renk/beden bazlı, sipariş bazlı) FARKLI bir bakış açısı
// sunar — TÜM siparişlerin toplam hammadde etkisini TEK bir yerde görmenizi sağlar.
//
// DOĞRULUK KURALLARI (kapsamlı ve dikkatli kurulmuş mantık):
// 1) Bir kalem SATINALMAYA planlanmışsa (k.planlama.tip === "Satınalma"), o mamul DIŞARIDAN hazır
//    olarak gelecek demektir — atölyede ÜRETİLMEYECEK, dolayısıyla BİZİM hammaddemizi HİÇ TÜKETMEYECEK.
//    Bu kalemler MRP hesabından TAMAMEN HARİÇ TUTULUR (önceki sürümde bu kontrol YOKTU — ciddi bir
//    fazla-tahmin hatasıydı, düzeltildi).
// 2) Bir kalem ÜRETİME planlanmışsa VE bağlı üretim siparişinde reçetedeki proses ZATEN tamamlanmışsa,
//    o prosesin hammaddesi ZATEN stoktan düşülmüştür (üretimProsesAtamaTeslimAl anında gerçekleşir) —
//    bu durumda o proses için TEKRAR hammadde ihtiyacı SAYILMAZ (aksi halde çift sayım/fazla-tahmin
//    olurdu: hem geçmişte düşülen hem gelecek için "gereken" olarak gösterilen aynı hammadde).
// 3) Bir kalem HİÇ planlanmamışsa (bekleyen), reçetedeki TÜM prosesler için TAM miktar hammadde
//    gerektiği varsayılır (henüz hiçbir şey tüketilmedi) — ANCAK `sadeceUretimPlanli=true` verilirse,
//    bu kalemler (henüz planlanmamış olanlar) TAMAMEN HARİÇ TUTULUR: "Sipariş İhtiyaç Planlama" sekmesi
//    SADECE zaten üretime gönderilmiş (aktif üretim emri olan) mamüllerin hammadde ihtiyacını gösterir —
//    "Hammadde İhtiyaç" sekmesi ise TÜM bekleyen talebi (planlanmış+planlanmamış) kapsar.
// ---------------------------------------------------------------------------------------------
// HAMMADDE SATIN ALMA REZERVASYONU — MİMARİ
//
// Bir hammadde ihtiyacı (hammadde + renk + beden) neredeyse HER ZAMAN BİRDEN FAZLA satış siparişinden
// birden beslenir: SIP-1001'in 40 çifti ve SIP-1004'ün 60 çifti aynı "Astar · Siyah · Tek Beden"i
// tüketir. Bu yüzden rezervasyon TEK bir sipariş kimliğiyle (`rezervasyonSiparisId`) modellenemez —
// mamul satın almasında kullanılan o yapı burada YETERSİZ kalır ve payları sessizce kaybeder.
//
// Kurulan yapı ŞU:
//   Alış siparişi (sipariş seviyesi):
//     hammaddeTalebiMi: true                 -> bu alış bir HAMMADDE ihtiyaç planından doğdu
//     rezervasyonSiparisIdleri: [id, id...]  -> hızlı filtreleme için kaynak satışların kimlikleri
//     rezervasyonSiparisId: id | null        -> SADECE tek kaynak varsa dolar (eski mantıkla uyum)
//   Alış siparişi KALEMİ (asıl doğruluk kaynağı):
//     rezervasyonlar: [{ siparisId, siparisNo, miktar }]
//       -> bu kalemin miktarının hangi satış siparişi için, NE KADAR alındığı. Toplamı kalem
//          miktarını aşmaz; atfedilemeyen artık kısım "serbest stok" sayılır ve yazılmaz.
//
// Neden kalem seviyesinde? Çünkü tek bir alış siparişinde birden çok hammadde kalemi olabilir ve her
// kalemin kaynak dağılımı FARKLIDIR. Dağılımı sipariş seviyesinde tutmak, "hangi hammaddenin ne
// kadarı hangi satış için" sorusunu cevapsız bırakırdı.
//
// ÖNEMLİ TASARIM KARARI: hammadde satın alma, satış siparişinin KALEMİNE DOKUNMAZ (mamul satın
// almasının aksine kalemi ikiye bölmez, planlama tipini değiştirmez). Satış kalemi "Üretim"e
// planlanmış olarak kalır — çünkü mamul hâlâ atölyede üretilecektir; sadece girdisi dışarıdan
// alınmaktadır. Bu ayrım korunmazsa MRP, kalemi satınalma sanıp hammadde ihtiyacından tamamen
// düşürür (bkz. mrpHesapla KURAL 1) ve ihtiyaç ekranı bir anda boşalırdı.
// ---------------------------------------------------------------------------------------------

// Belirli bir hammadde hücresi (ürün+renk+beden) için, verilen satış siparişlerine ATFEDİLEBİLİR
// açık/kapanmış satın alma durumunu hesaplar. Kısmi teslimler oransal olarak paylaştırılır.
function hammaddeSatinAlmaDurumu(hammaddeUrunId, renk, beden, kaynakSiparisIdler, tumSiparisler) {
  const hedefIdler = kaynakSiparisIdler instanceof Set ? kaynakSiparisIdler : new Set(kaynakSiparisIdler || []);
  const fisler = [];
  let siparisEdilen = 0;
  let teslimAlinan = 0;

  (tumSiparisler || []).forEach((s) => {
    if (s.tip !== "Alış" || s.durum === "İptal") return;
    if (!s.hammaddeTalebiMi) return;
    (s.kalemler || []).forEach((k) => {
      if (k.urunId !== hammaddeUrunId || k.renk !== renk || k.beden !== beden) return;
      // Eski/elle oluşturulmuş kayıtlarda kalem seviyesinde rezervasyon olmayabilir — o durumda
      // sipariş seviyesindeki tekil kimliğe düşülür (geriye dönük uyum).
      const rezervasyonlar = Array.isArray(k.rezervasyonlar) && k.rezervasyonlar.length > 0
        ? k.rezervasyonlar
        : (s.rezervasyonSiparisId ? [{ siparisId: s.rezervasyonSiparisId, siparisNo: null, miktar: k.miktar }] : []);
      if (rezervasyonlar.length === 0) return;

      const pay = rezervasyonlar
        .filter((r) => hedefIdler.size === 0 || hedefIdler.has(r.siparisId))
        .reduce((t, r) => t + (r.miktar || 0), 0);
      if (!(pay > 0)) return;

      // Kısmi teslimde, teslim alınan miktar kalemin TAMAMI içindir — bize düşen payı oransal alırız.
      const oran = k.miktar > 0 ? Math.min(1, pay / k.miktar) : 0;
      const payKarsilanan = Math.round((k.karsilanan || 0) * oran * 100) / 100;
      const payYolda = Math.round(Math.max(0, pay - payKarsilanan) * 100) / 100;

      siparisEdilen = Math.round((siparisEdilen + pay) * 100) / 100;
      teslimAlinan = Math.round((teslimAlinan + payKarsilanan) * 100) / 100;
      fisler.push({
        alisSiparisId: s.id, alisSiparisNo: s.siparisNo, cariId: s.cariId, durum: s.durum,
        pay, payKarsilanan, payYolda,
        // Rezervasyonun ne kadarı ÜRETİMDE TÜKETİLDİ. "yolda"dan farklı: yolda henüz gelmemiş
        // olanı, tuketilen ise gelip kullanılmış olanı gösterir. kalan = pay − tuketilen.
        payTuketilen: Math.round(
          rezervasyonlar
            .filter((r) => hedefIdler.size === 0 || hedefIdler.has(r.siparisId))
            .reduce((t, r) => t + (r.tuketilen || 0), 0) * 100
        ) / 100,
        rezervasyonlar: rezervasyonlar.filter((r) => hedefIdler.size === 0 || hedefIdler.has(r.siparisId)),
      });
    });
  });

  return {
    siparisEdilen,
    teslimAlinan,
    // Rezervasyonun tüketilmiş toplamı ve kalanı — "bu rezervasyon kapandı mı?" sorusunun cevabı.
    tuketilen: Math.round(fisler.reduce((t, f) => t + (f.payTuketilen || 0), 0) * 100) / 100,
    rezerveKalan: Math.round(
      Math.max(0, fisler.reduce((t, f) => t + f.pay - (f.payTuketilen || 0), 0)) * 100
    ) / 100,
    yolda: Math.round(Math.max(0, siparisEdilen - teslimAlinan) * 100) / 100,
    fisler,
    acikFisler: fisler.filter((f) => f.payYolda > 0),
    durumEtiketi: siparisEdilen === 0
      ? null
      : (Math.round((siparisEdilen - teslimAlinan) * 100) / 100 <= 0
          ? "Teslim Alındı"
          : (teslimAlinan > 0 ? "Kısmi Teslim" : "Sipariş Verildi")),
  };
}

// Sipariş edilecek bir miktarı, o hücreyi talep eden satış siparişlerine TÜKETİM ORANINDA dağıtır.
// Aynı satış siparişinden gelen birden fazla kalem tek satırda birleştirilir. Yuvarlama artığı son
// satıra bindirilir — böylece dağıtılan payların toplamı her zaman girilen miktara EŞİT kalır.
function hammaddeRezervasyonDagit(kaynaklar, miktar) {
  const m = Math.round((parseFloat(miktar) || 0) * 100) / 100;
  if (!(m > 0)) return [];

  // İHTİYACA GÖRE SIRAYLA DAĞITILIR — ORANLA DEĞİL.
  //
  // Eskiden alınan miktar, siparişlerin ağırlığına ORANLANARAK bölünüyordu:
  //   pay = m × (o siparişin ağırlığı / toplam ağırlık)
  // Bu, çift/adet gibi bölünmez birimlerde küsurat üretiyordu. Kullanıcının ekranında:
  // 177 çiftlik alış → SAT-1004 123.13 · SAT-1001 46.17 · SAT-1002 7.7. Yarım taban yok.
  //
  // Doğrusu: her satış siparişinin bu hammaddeye KENDİ ihtiyacı zaten belli. Alınan miktar
  // sırayla dağıtılıyor; her sipariş ihtiyacı kadar alıyor, kalan bir sonrakine geçiyor.
  // İhtiyaçlar tam sayıysa paylar da tam sayı kalıyor — oranlama gibi yeni küsurat doğurmuyor.
  //
  // ALINAN MİKTAR TOPLAM İHTİYAÇTAN FAZLAYSA fazlası rezervesiz kalır: o kısım kimseye söz
  // verilmemiştir, geldiğinde serbest stok olur. Eskiden fazlalık da son siparişe yazılıyordu ve
  // o sipariş ihtiyacından çoğunu rezerve etmiş görünüyordu.
  const index = {};
  const sirali = [];
  (kaynaklar || []).forEach((k) => {
    if (!index[k.siparisId]) {
      index[k.siparisId] = { siparisId: k.siparisId, siparisNo: k.siparisNo, ihtiyac: 0 };
      sirali.push(index[k.siparisId]);
    }
    index[k.siparisId].ihtiyac += (k.hammaddeMiktar != null ? k.hammaddeMiktar : k.adet) || 0;
  });

  let kalan = m;
  const cikan = [];
  sirali.forEach((x) => {
    if (kalan <= 0 || !(x.ihtiyac > 0)) return;
    const pay = Math.round(Math.min(x.ihtiyac, kalan) * 100) / 100;
    kalan = Math.round((kalan - pay) * 100) / 100;
    if (pay > 0) cikan.push({ siparisId: x.siparisId, siparisNo: x.siparisNo, miktar: pay });
  });
  return cikan;
}

// Bir ALIŞ siparişinin rezervasyon özeti: kalemlerdeki payları satış siparişi bazında birleştirir.
// Sipariş Yönetimi ekranında "bu alış hangi satış siparişleri için açıldı" sorusunu cevaplar.
// siparisNo alanı kalemde boş olabilir (eski kayıt) — o durumda gerçek siparişten çözülür.
function alisRezervasyonOzeti(alisSiparisi, tumSiparisler) {
  if (!alisSiparisi || alisSiparisi.tip !== "Alış") return [];
  const index = {};
  const ekle = (siparisId, siparisNo, miktar, birim) => {
    if (!siparisId) return;
    if (!index[siparisId]) {
      const kaynak = (tumSiparisler || []).find((s) => s.id === siparisId);
      index[siparisId] = {
        siparisId,
        siparisNo: siparisNo || (kaynak ? kaynak.siparisNo : "—"),
        // Kaynak sipariş silinmişse bunu SESSİZCE geçmiyoruz: kullanıcı "rezerve ama nereye?" sorusunu
        // sorabilmeli, bu yüzden açıkça işaretlenir.
        kaynakSilinmis: !kaynak,
        miktar: 0,
        birimler: new Set(),
      };
    }
    index[siparisId].miktar = Math.round((index[siparisId].miktar + (miktar || 0)) * 100) / 100;
    if (birim) index[siparisId].birimler.add(birim);
  };

  let kalemDuzeyindeVarMi = false;
  (alisSiparisi.kalemler || []).forEach((k) => {
    if (Array.isArray(k.rezervasyonlar) && k.rezervasyonlar.length > 0) {
      kalemDuzeyindeVarMi = true;
      k.rezervasyonlar.forEach((r) => ekle(r.siparisId, r.siparisNo, r.miktar, k.birim));
    }
  });
  // Geriye dönük uyum: mamul satın almasından gelen eski alışlarda kalem düzeyinde rezervasyon yoktur,
  // sadece sipariş düzeyinde tekil bir kimlik bulunur.
  if (!kalemDuzeyindeVarMi && alisSiparisi.rezervasyonSiparisId) {
    (alisSiparisi.kalemler || []).forEach((k) => ekle(alisSiparisi.rezervasyonSiparisId, null, k.miktar, k.birim));
  }

  return Object.values(index)
    .map((x) => ({ ...x, birim: x.birimler.size === 1 ? Array.from(x.birimler)[0] : "" }))
    .sort((a, b) => b.miktar - a.miktar);
}

// Ters yön: bir SATIŞ siparişi için açılmış hammadde alışlarını bulur. Satış siparişini açan kişi,
// "girdilerim sipariş edildi mi, geldi mi" sorusunu Planlama ekranına gitmeden görebilsin diye.
function satisIcinHammaddeAlislari(satisSiparisId, tumSiparisler) {
  const sonuc = [];
  (tumSiparisler || []).forEach((s) => {
    if (s.tip !== "Alış" || !s.hammaddeTalebiMi || s.durum === "İptal") return;
    let pay = 0;
    const kalemler = [];
    (s.kalemler || []).forEach((k) => {
      const rez = (k.rezervasyonlar || []).filter((r) => r.siparisId === satisSiparisId);
      if (rez.length === 0) return;
      const kalemPay = rez.reduce((t, r) => t + (r.miktar || 0), 0);
      if (!(kalemPay > 0)) return;
      pay = Math.round((pay + kalemPay) * 100) / 100;
      const oran = k.miktar > 0 ? Math.min(1, kalemPay / k.miktar) : 0;
      kalemler.push({
        urunAd: k.urunAd, renk: k.renk, beden: k.beden, birim: k.birim,
        pay: kalemPay,
        payTeslim: Math.round((k.karsilanan || 0) * oran * 100) / 100,
        // Üretimde tüketilmiş pay. kalan = pay − tuketilen; sıfırlanınca rezervasyon KAPANMIŞTIR.
        tuketilen: Math.round(rez.reduce((t, r) => t + (r.tuketilen || 0), 0) * 100) / 100,
      });
    });
    if (pay > 0) {
      const teslim = Math.round(kalemler.reduce((t, k) => t + k.payTeslim, 0) * 100) / 100;
      const tuketilen = Math.round(kalemler.reduce((t, k) => t + (k.tuketilen || 0), 0) * 100) / 100;
      sonuc.push({
        alisSiparisId: s.id, alisSiparisNo: s.siparisNo, cariId: s.cariId, durum: s.durum,
        pay, teslim, yolda: Math.round(Math.max(0, pay - teslim) * 100) / 100,
        tuketilen,
        kalan: Math.round(Math.max(0, pay - tuketilen) * 100) / 100,
        kapandiMi: tuketilen >= pay - 0.0001,
        kalemler,
      });
    }
  });
  return sonuc;
}

