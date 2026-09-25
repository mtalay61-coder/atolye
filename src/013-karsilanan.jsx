// ================= KARŞILANAN MİKTARI TÜRETME =================
//
// Kullanıcı (20 Eylül): *"Karşılanan miktarı da stok hareketlerinden türetmek; stok miktarında
// yaptığımızın aynısı. Onu es geçmeden yapalım."*
//
// SORUN: `kalem.karsilanan` ayrı bir sayaçtı — teslim alınca artırılıyor, silinince azaltılması
// gerekiyordu. Silme yollarından biri bunu geri almayınca ortaya HAYALET KARŞILANAN çıkıyordu:
// 136 çiftlik siparişte 16 çift "karşılanmış" görünüyor, ama o sevkiyatın stok hareketi yok.
// O 16 çift ne planlanabiliyor ne teslim edilmiş sayılıyor — hiçbir yerde görünmeden kayboluyor.
//
// ÇÖZÜM, STOKTA YAPILANIN AYNISI (23. bölüm): sayacı tutmayı bırak, HAREKETLERDEN TÜRET.
// Hareket varsa sevk olmuştur, yoksa olmamıştır. İki kayıt tutulmayınca "hangisi doğru" sorusu
// da ortadan kalkar.
//
// ÖLÇÜ `siparisId` + `kalemId`: `fisYaz` her stok hareketine bunları yazıyor (078-fisyaz),
// çünkü geri alma da aynı çifti okuyor. Yani zincir zaten kurulu; eksik olan onu KAYNAK kabul
// etmekti.
//
// YÖN: satışta mal ÇIKAR (negatif hareket), alışta GİRER (pozitif). Her ikisinde de karşılanan
// POZİTİF bir sayıdır; işaret sipariş tipinden geliyor.
//
// KORUMA — HAREKETSİZ SİPARİŞE DOKUNULMAZ: hiç stok hareketi taşımayan bir siparişin kalemleri
// olduğu gibi bırakılıyor. Eski kayıtlarda (göçten önce kesilmiş fişler) hareketler `siparisId`
// taşımıyor olabilir; onları sıfırlamak, gerçekten teslim edilmiş bir siparişi açık göstermek
// olurdu. Veri Denetimi'ndeki "hayalet karşılanan" kuralı bu durumları ayrıca bildiriyor.
function siparisKarsilananlariHesapla(siparisler, stok) {
  if (!Array.isArray(siparisler) || siparisler.length === 0) return siparisler;

  // Hareketleri siparişe göre topla: { siparisId -> { kalemId -> adet } }
  const sevkler = {};
  let hicHareketVar = false;
  (stok || []).forEach((p) => {
    (p.hareketler || []).forEach((h) => {
      if (!h || !h.siparisId || !h.kalemId) return;
      hicHareketVar = true;
      if (!sevkler[h.siparisId]) sevkler[h.siparisId] = {};
      const d = sevkler[h.siparisId];
      d[h.kalemId] = (d[h.kalemId] || 0) + (h.miktar || 0);
    });
  });
  if (!hicHareketVar) return siparisler;

  let degisti = false;
  const sonuc = siparisler.map((sp) => {
    if (!sp || !Array.isArray(sp.kalemler)) return sp;
    const buSiparis = sevkler[sp.id];
    // Bu siparişe ait hiç hareket yoksa dokunma (bkz. koruma notu).
    if (!buSiparis) return sp;
    const alisMi = sp.tip === "Alış";
    let kalemDegisti = false;
    const kalemler = sp.kalemler.map((k) => {
      const ham = buSiparis[k.id];
      if (ham === undefined) return k;
      // Satışta hareket negatif; karşılanan pozitife çevriliyor.
      const turetilen = Math.max(0, alisMi ? ham : -ham);
      const yuvarli = Math.round(turetilen * 100) / 100;
      if ((k.karsilanan || 0) === yuvarli) return k;
      kalemDegisti = true;
      return { ...k, karsilanan: yuvarli };
    });
    if (!kalemDegisti) return sp;
    degisti = true;
    return { ...sp, kalemler };
  });
  return degisti ? sonuc : siparisler;
}
