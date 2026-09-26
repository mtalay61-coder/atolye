// ================= FİNANS RAPORU — VARLIK / YÜKÜMLÜLÜK (25 Eylül, v1.463.0) =================
//
// Kullanıcı: "Finans raporu ekleyelim. Birden fazla rapor yapabileceğimiz, sipariş raporu gibi
// istediklerimizi kaydederiz. Varlık raporu örnek olarak: alacaklarımız, borçlarımız, hammadde stok
// mali değeri, mamul stok değeri, portföydeki çekler toplamı, yazılan çekler toplamı… çok detaylı.
// 2 defter için ayrı filtreleyerek rapor şablonu yapalım. Büyük uygulamalardan da esinlen."
//
// TASARIM (büyük ERP'lerin bilanço / varlık-kaynak raporundan):
//   • Her para kalemi TEK SATIR: bir kasa, bir banka hesabı, bir carinin bir para birimindeki
//     bakiyesi, bir çek, bir stok varyantı. Satırlar sipariş raporunun motoruna (`RaporSekmesi`)
//     veriliyor — süzgeç, gruplama, sıralama, Excel, yazdırma ve KAYITLI RAPORLAR hazır; ikinci bir
//     rapor mantığı yazılmadı. Hazır şablonlar (Varlık Raporu, Alacak/Borç, Çek vadeleri, Stok
//     değeri, Döviz pozisyonu, Nakit takvimi) kullanıcı raporu gibi açılıp değiştirilebiliyor.
//   • Üstte BİLANÇO ÖZETİ: varlıklar / yükümlülükler grup toplamları ve NET VARLIK (özkaynak
//     karşılığı). "Genel · Resmi yan yana" seçilince iki defter ve farkı aynı tabloda.
//   • DEFTER: cari ve kasa/banka hareketleri kendi defterinde ("Muhasebe" = ikisine de,
//     `defterKapsar`). Çek, doğduğu giriş hareketinin defterinde. STOK DEFTERSİZ: mal fiziksel ve
//     tek — stok hareketleri defter taşımıyor; her iki defterde de aynı stok görünür (ekranda yazılı).
//   • TARİH İTİBARIYLA: bakiyeler o güne kadarki hareketlerden; çek durumu geçmiş satırları o güne
//     kadar oynatılarak bulunuyor (geri alma satırları da durum değiştirdiği için doğru sonuç).
//   • TL KARŞILIĞI güncel kurla (`muhasebe.kurlar`); kuru olmayan birim toplamlara girmiyor ve
//     satırda "kur yok" yazıyor — sessizce 1:1 saymak raporu yanıltırdı (bkz. alisKuruEksik dersi).
//   • İŞARETLİ "Net Etki (TL)": varlık +, yükümlülük −, bilgi satırı 0. Bu sütunu toplayan her
//     rapor (hangi süzgeçle olursa olsun) doğrudan NET VARLIĞI verir.

const FINANS_RAPOR_ALANLARI = [
  { anahtar: "taraf", ad: "Taraf", tip: "metin", secenekler: ["Varlık", "Yükümlülük", "Bilgi"] },
  { anahtar: "grup", ad: "Grup", tip: "metin", secenekler: ["Hazır Değerler", "Ticari Alacaklar", "Alınan Çekler", "Stoklar", "Ticari Borçlar", "Verilen Çekler", "Ciro Edilen Çekler (risk)"] },
  { anahtar: "kalem", ad: "Kalem", tip: "metin" },
  { anahtar: "ad", ad: "Hesap / Cari / Ürün", tip: "metin" },
  { anahtar: "ayrinti", ad: "Ayrıntı", tip: "metin" },
  { anahtar: "defter", ad: "Defter", tip: "metin", secenekler: ["Tümü", "Genel", "Resmi"] },
  { anahtar: "paraBirimi", ad: "P.B.", tip: "metin", secenekler: ["TRY", "USD", "EUR"] },
  { anahtar: "tutar", ad: "Tutar", tip: "para", paraBirimiAlani: "paraBirimi" },
  { anahtar: "tlKarsiligi", ad: "TL Karşılığı", tip: "para" },
  { anahtar: "netEtki", ad: "Net Etki (TL)", tip: "para" },
  { anahtar: "miktar", ad: "Miktar", tip: "sayi" },
  { anahtar: "birimDeger", ad: "Birim Değer (TL)", tip: "para", toplanmaz: true },
  { anahtar: "vade", ad: "Vade", tip: "tarih" },
  { anahtar: "vadeAy", ad: "Vade Ayı", tip: "metin" },
  { anahtar: "vadeDurumu", ad: "Vade Durumu", tip: "metin", secenekler: ["Vadesi geçmiş", "0-30 gün", "31-60 gün", "61-90 gün", "90+ gün"] },
  { anahtar: "sonHareket", ad: "Son Hareket", tip: "tarih" },
  // YAŞLANDIRMA (v1.464.0) — yalnız cari satırlarında dolu; carinin kendi para biriminde.
  { anahtar: "yasVadesiGelmemis", ad: "Vadesi gelmemiş", tip: "para", paraBirimiAlani: "paraBirimi" },
  { anahtar: "yas0_30", ad: "0-30 gün", tip: "para", paraBirimiAlani: "paraBirimi" },
  { anahtar: "yas31_60", ad: "31-60 gün", tip: "para", paraBirimiAlani: "paraBirimi" },
  { anahtar: "yas61_90", ad: "61-90 gün", tip: "para", paraBirimiAlani: "paraBirimi" },
  { anahtar: "yas91_180", ad: "91-180 gün", tip: "para", paraBirimiAlani: "paraBirimi" },
  { anahtar: "yas180", ad: "180+ gün", tip: "para", paraBirimiAlani: "paraBirimi" },
  { anahtar: "vadesiGecen", ad: "Vadesi geçen", tip: "para", paraBirimiAlani: "paraBirimi" },
  { anahtar: "ortalamaGecikme", ad: "Ort. gecikme (gün)", tip: "sayi", toplanmaz: true },
  { anahtar: "enEskiGun", ad: "En eski (gün)", tip: "sayi", toplanmaz: true },
  // MALİYET AYRIMI (v1.465.0) — stok satırlarında: değerin hammadde ve işçilik payı; üretimdeki
  // mallarda işçiliğin ödenen / ödenmemiş kısmı.
  { anahtar: "hammaddeDegeri", ad: "Hammadde payı", tip: "para" },
  { anahtar: "iscilikDegeri", ad: "İşçilik payı", tip: "para" },
  { anahtar: "iscilikOdenen", ad: "İşçilik ödenen", tip: "para" },
  { anahtar: "iscilikOdenmemis", ad: "İşçilik ödenmemiş", tip: "para" },
  // Üretimdeki malda: harcananın stoğa giren bitmiş çiftlere geçen kısmı (değer = hammadde + işçilik − bu).
  { anahtar: "aktarilan", ad: "Mamule aktarılan", tip: "para" },
  { anahtar: "not", ad: "Not", tip: "metin" },
];

const FINANS_GRUP_SIRASI = ["Hazır Değerler", "Ticari Alacaklar", "Alınan Çekler", "Stoklar", "Ticari Borçlar", "Verilen Çekler", "Ciro Edilen Çekler (risk)"];

// HAZIR ŞABLONLAR. Kayıtlı rapor biçiminde (245-rapor `kaydet` ile aynı alanlar); kimlikleri sabit.
// Kullanıcı birini değiştirip kaydederse aynı kimlikle `tanimlar.raporlar`a yazılır ve onunki
// geçerli olur. Silinen hazır şablon yeniden görünür — hazırlar kod ile gelir, veri değildir.
const FINANS_HAZIR_RAPORLAR = [
  { id: "hazir-finans-varlik", ad: "Varlık Raporu", tanim: {
    // Yalnız işaretli Net Etki: TL karşılığı sütununun toplamı varlıkla borcu toplardı.
    sutunlar: ["taraf", "grup", "kalem", "netEtki"], gruplar: ["taraf", "grup", "kalem"],
    suzgecler: [], siralama: { alan: "taraf", yon: "artan" } } },
  { id: "hazir-finans-alacak-borc", ad: "Alacaklar ve Borçlar", tanim: {
    sutunlar: ["kalem", "ad", "ayrinti", "defter", "paraBirimi", "tutar", "tlKarsiligi", "sonHareket"], gruplar: [],
    suzgecler: [{ alan: "grup", islem: "icerir", deger: "Ticari" }], siralama: { alan: "tlKarsiligi", yon: "azalan" } } },
  // YAŞLANDIRMA ŞABLONLARI (v1.464.0): ayrıntılı ekran "Yaşlandırma" görünümünde; bunlar Excel ve
  // kendi süzgeçlerini kurmak isteyenler için aynı sayılar.
  { id: "hazir-finans-alacak-yas", ad: "Alacak Yaşlandırma", tanim: {
    sutunlar: ["ad", "paraBirimi", "tutar", "yasVadesiGelmemis", "yas0_30", "yas31_60", "yas61_90", "yas91_180", "yas180", "ortalamaGecikme"], gruplar: [],
    suzgecler: [{ alan: "grup", islem: "esit", deger: "Ticari Alacaklar" }], siralama: { alan: "tutar", yon: "azalan" } } },
  { id: "hazir-finans-borc-yas", ad: "Borç Yaşlandırma", tanim: {
    sutunlar: ["ad", "paraBirimi", "tutar", "yasVadesiGelmemis", "yas0_30", "yas31_60", "yas61_90", "yas91_180", "yas180", "ortalamaGecikme"], gruplar: [],
    suzgecler: [{ alan: "grup", islem: "esit", deger: "Ticari Borçlar" }], siralama: { alan: "tutar", yon: "azalan" } } },
  { id: "hazir-finans-cekler", ad: "Çekler ve Vadeler", tanim: {
    sutunlar: ["kalem", "ad", "ayrinti", "vade", "vadeDurumu", "paraBirimi", "tutar", "tlKarsiligi"], gruplar: [],
    suzgecler: [{ alan: "grup", islem: "icerir", deger: "Çek" }], siralama: { alan: "vade", yon: "artan" } } },
  { id: "hazir-finans-stok", ad: "Stok Değeri", tanim: {
    sutunlar: ["kalem", "ad", "miktar", "hammaddeDegeri", "iscilikDegeri", "iscilikOdenmemis", "aktarilan", "tlKarsiligi"], gruplar: ["kalem", "ad"],
    suzgecler: [{ alan: "grup", islem: "esit", deger: "Stoklar" }], siralama: { alan: "tlKarsiligi", yon: "azalan" } } },
  { id: "hazir-finans-doviz", ad: "Döviz Pozisyonu", tanim: {
    sutunlar: ["paraBirimi", "taraf", "tutar", "tlKarsiligi", "netEtki"], gruplar: ["paraBirimi", "taraf"],
    suzgecler: [{ alan: "grup", islem: "farkli", deger: "Stoklar" }], siralama: { alan: "paraBirimi", yon: "artan" } } },
  { id: "hazir-finans-nakit-takvimi", ad: "Nakit Takvimi (çek vadeleri)", tanim: {
    sutunlar: ["vadeAy", "taraf", "kalem", "netEtki"], gruplar: ["vadeAy", "taraf", "kalem"],
    suzgecler: [{ alan: "grup", islem: "icerir", deger: "Çek" }, { alan: "taraf", islem: "farkli", deger: "Bilgi" }], siralama: { alan: "vadeAy", yon: "artan" } } },
].map((r) => ({ ...r, modul: "finans", kapsam: "ortak", sahip: null, hazir: true,
  tanim: { kolonAramalari: {}, matris: false, sutunAyarlari: {}, ...r.tanim } }));

// Tarih karşılaştırması gün düzeyinde ("2026-09-25" ya da ISO zaman damgası).
function finansGun(t) { return String(t || "").slice(0, 10); }

function finansVadeDurumu(vade, bugun) {
  if (!vade) return { vadeDurumu: "", vadeAy: "" };
  const gun = (t) => Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10));
  const fark = Math.round((gun(finansGun(vade)) - gun(bugun)) / 86400000);
  const vadeDurumu = fark < 0 ? "Vadesi geçmiş" : fark <= 30 ? "0-30 gün" : fark <= 60 ? "31-60 gün" : fark <= 90 ? "61-90 gün" : "90+ gün";
  return { vadeDurumu, vadeAy: finansGun(vade).slice(0, 7) };
}

// MAMULÜN BİRİM DEĞERİ (v1.465.0 — kullanıcı: "şu an için olan stok, yarı mamul, mamul tüm değerler
// göstersin"; işçilik dahil). Yöntemler:
//   "maliyet"  — hammadde + işçilik (VARSAYILAN): reçetedeki hammaddeler güncel alış fiyatıyla +
//                ürün kartındaki proses ücretleri + ara proses ücretleri (maliyet ekranının işçiliği).
//                Genel gider GİRMEZ: stok değeri üretim maliyetidir, idari gider dönem gideridir.
//   "hammadde" — yalnız reçete hammaddesi (v1.463 davranışı)
//   "satis" / "alis" — kart fiyatları
// Reçete satırı ürün kartındaki kuralla eşleşiyor (mamul rengi + "Tüm Bedenler" ya da o beden).
function finansIscilikBirim(urun, araProsesler) {
  let t = Object.values((urun && urun.prosesUcretleri) || {}).reduce((x, u) => x + (parseFloat(u) || 0), 0);
  Object.values((urun && urun.araProsesEklentileri) || {}).forEach((apId) => {
    if (!apId) return;
    const ap = (araProsesler || []).find((x) => x.id === apId);
    const u = (urun.araProsesUcretleri || {})[apId] != null ? urun.araProsesUcretleri[apId] : (ap ? ap.ucret : 0);
    t += parseFloat(u) || 0;
  });
  return t;
}

function finansMamulBirimDegeri(urun, renk, beden, yontem, stok, kurlar, araProsesler) {
  if (yontem === "satis" || yontem === "alis") {
    const fiyat = parseFloat(yontem === "satis" ? urun.satisFiyati : urun.alisFiyati) || 0;
    const pb = alisPbKodu({ alisParaBirimi: yontem === "satis" ? urun.satisParaBirimi : urun.alisParaBirimi });
    const kur = pb === "TRY" ? 1 : parseFloat((kurlar || {})[pb]) || 0;
    return { tl: kur ? fiyat * kur : 0, hammadde: null, iscilik: null, kurYok: !kur && fiyat > 0 ? pb : null, fiyatsiz: !(fiyat > 0) };
  }
  const satirlar = (urun.recete || []).filter((r) => stokAnahtarNrm(r.mamulRenk) === stokAnahtarNrm(renk)
    && (!r.mamulBeden || r.mamulBeden === "Tüm Bedenler" || stokAnahtarNrm(r.mamulBeden) === stokAnahtarNrm(beden)));
  let hammadde = 0; let kurYok = null;
  satirlar.forEach((r) => {
    const hm = (stok || []).find((p) => p.id === r.hammaddeUrunId);
    if (!hm) return;
    const bf = hammaddeBirimFiyati(hm, r.renk, r.beden, kurlar);
    if (bf.pb !== "TRY" && !(parseFloat((kurlar || {})[bf.pb]) > 0)) kurYok = bf.pb;
    hammadde += (parseFloat(r.miktar) || 0) * bf.tl;
  });
  const iscilik = yontem === "hammadde" ? 0 : finansIscilikBirim(urun, araProsesler);
  const tl = hammadde + iscilik;
  return { tl, hammadde, iscilik, kurYok, fiyatsiz: !(tl > 0), iscilikYok: yontem !== "hammadde" && !(iscilik > 0) };
}

// ---- ÜRETİMDEKİ MALLAR — GERÇEKLEŞEN MALİYET (v1.465.0) -----------------------------------------
//
// Kullanıcı: "Ödenen ve ödenmeyen işçilik olarak ayırmak lazım. Örnek: mamulün yarısı üretildi ve
// stok değeri 1000 TL oldu; toplam değeri 1500 olması gerekirken üretimde o kadar hammadde ve
// işçilik üretti. Bunu 1000 TL olarak hesaplar. Gerçekleşen o anki durumu göstermesi gerekir."
//
// Açık her üretim için DEĞER = gerçekten harcanan − bitmiş mala aktarılan:
//   • Hammadde: üretime bağlı (`uretimId`) stok hareketlerinin NET çıkışı (teslimde düşülen reçete
//     malzemesi, ek malzeme, eksi iade) × güncel birim fiyat. Hareketlerde fiyat yok (fiş fiyatsız
//     yazılıyor); stok değerlemesiyle aynı fiyat kullanılıyor ki iki taraf tutsun.
//   • İşçilik: üretime bağlı "-İşçilik" cari fişlerinin tutarı (personele yazılan, tahakkuk).
//   • Aktarılan: bu üretimden stoğa GİREN mamul çiftleri × mamulün birim maliyeti (hammadde+işçilik)
//     — o çiftler artık "Mamul" satırında sayılıyor; iki kez sayılmasın. Negatife düşmez.
// Tamamlanmış üretim listede yok (kalan fark bitmiş malın içinde). Numune de dahil (stoğa girmez).
//
// ÖDENEN / ÖDENMEMİŞ İŞÇİLİK: personel carisinde ödemeler EN ESKİ işçilik fişini kapatır (FIFO,
// `cariYaslandirma` — yaşlandırmayla aynı kural). Açık kalan işçilik fişleri ödenmemiş kısım; o
// tutar zaten "Personel borcu" olarak Ticari Borçlar'da duruyor (yükümlülük), burada bilgi olarak.
function finansUretimDegerleri({ uretim, stok, cariler, kurlar, tarih, araProsesler } = {}) {
  const bugun = tarih || bugunYerel();
  const bugunMu = !tarih || tarih >= bugunYerel();
  const kurTablosu = kurlar || {};
  const yuv = (x) => Math.round((x || 0) * 100) / 100;
  // Ödenmemiş işçilik: işçilik hareketi kimliği → açık kalan (personel carisinin borç yaşlandırması).
  const odenmemis = new Map();
  (cariler || []).forEach((c) => {
    if (!(c.hareketler || []).some((h) => /-İşçilik$/.test(h.fisNo || ""))) return;
    cariYaslandirma(c, { defter: "Tümü", tarih: bugun }).forEach((y) => {
      if (y.yon !== "borc") return;
      y.acikKalemler.forEach((k) => odenmemis.set(k.id, k.kalan));
    });
  });
  const iscilikHareketleri = new Map();   // uretimId → [{tutar, odenmemis}]
  (cariler || []).forEach((c) => (c.hareketler || []).forEach((h) => {
    if (!h.uretimId || !/-İşçilik$/.test(h.fisNo || "") || finansGun(h.tarih) > bugun) return;
    const liste = iscilikHareketleri.get(h.uretimId) || [];
    liste.push({ tutar: Math.abs(h.tutar || 0), odenmemis: odenmemis.get(h.id) || 0, personel: c.unvan });
    iscilikHareketleri.set(h.uretimId, liste);
  }));
  const sonuc = [];
  (uretim || []).forEach((u) => {
    if (!u) return;
    if (bugunMu && u.asama === "Tamamlandı") return;
    const urun = (stok || []).find((p) => p.id === u.urunId) || null;
    let hammadde = 0; let kurYok = null; let girenCift = 0; let aktarilan = 0; let sonHareket = "";
    (stok || []).forEach((p) => (p.hareketler || []).forEach((h) => {
      if (h.uretimId !== u.id || finansGun(h.tarih) > bugun) return;
      if (finansGun(h.tarih) > sonHareket) sonHareket = finansGun(h.tarih);
      if (urun && p.id === urun.id) {
        // Bu üretimden stoğa giren bitmiş çift: maliyeti mamul satırına geçti.
        const m = Number(h.miktar) || 0;
        girenCift += m;
        const d = finansMamulBirimDegeri(urun, h.renk, h.beden, "maliyet", stok, kurTablosu, araProsesler);
        aktarilan += m * d.tl;
        return;
      }
      const bf = hammaddeBirimFiyati(p, h.renk, h.beden, kurTablosu);
      if (bf.pb !== "TRY" && !(parseFloat(kurTablosu[bf.pb]) > 0) && bf.kendiFiyat > 0) kurYok = bf.pb;
      hammadde += -(Number(h.miktar) || 0) * bf.tl;
    }));
    const isc = iscilikHareketleri.get(u.id) || [];
    const iscilik = isc.reduce((t, x) => t + x.tutar, 0);
    const iscilikOdenmemis = isc.reduce((t, x) => t + x.odenmemis, 0);
    if (!(Math.abs(hammadde) > 0.004 || iscilik > 0.004)) return;   // henüz hiçbir şey harcanmamış
    // BÜTÜN ÇİFTLERİ STOĞA GİRMİŞ iş açık değil (aşaması henüz "Tamamlandı"ya çekilmemiş ya da geçmiş
    // tarihte bitmiş olabilir): kalan fark bitmiş malın içinde. Değeri sıfıra inen iş de listelenmez.
    const toplamAdet = (u.bedenMiktarlari || []).reduce((t, b) => t + (Number(b.miktar) || 0), 0) || Number(u.adet) || 0;
    if (toplamAdet > 0 && girenCift >= toplamAdet) return;
    const deger = Math.max(0, hammadde + iscilik - aktarilan);
    if (deger <= 0.004) return;
    sonuc.push({
      uretim: u, urunAd: (urun && urun.ad) || u.model || "?", renk: u.renk || "", toplamAdet, girenCift: stokYuvarla(girenCift),
      hammadde: yuv(hammadde), iscilik: yuv(iscilik), iscilikOdenmemis: yuv(iscilikOdenmemis), iscilikOdenen: yuv(iscilik - iscilikOdenmemis),
      aktarilan: yuv(Math.min(aktarilan, hammadde + iscilik)), deger: yuv(deger), kurYok, sonHareket,
      personeller: [...new Set(isc.map((x) => x.personel))],
    });
  });
  return sonuc;
}

// ---- ALACAK / BORÇ YAŞLANDIRMA (26 Eylül, v1.464.0) ----------------------------------------------
//
// Kullanıcı: "Alacak yaşlandırma yapalım."
//
// Büyük muhasebe programlarının yöntemi — FIFO KAPATMA: carinin karşı yöndeki hareketleri
// (tahsilat, iade, çek girişi…) EN ESKİ açık kalemden başlayarak kapatır; geriye kalan kalemler
// açık kalemdir ve her biri kendi yaşıyla dilime girer. Toplam bakiye yalnız "ne kadar" der;
// yaşlandırma "ne kadarı ne zamandan beri ödenmiyor" sorusunu cevaplar.
//
//   • Para birimi başına ayrı: dolar tahsilatı TL faturayı kapatmaz (bakiye de PB bazında).
//   • Yön bakiyeden: + bakiye (cari bize borçlu) → açık kalemler Borç hareketleri (satış…);
//     − bakiye (biz borçluyuz) → açık kalemler Alacak hareketleri (alış…). Aynı fonksiyon borç
//     yaşlandırmasını da veriyor.
//   • Yaşın başlangıcı: hareketin VADESİ, yoksa tarih + `varsayilanVade` gün. Vade tarihi rapor
//     gününden sonraysa "vadesi gelmemiş"; değilse geçen gün sayısıyla dilim.
//   • Defter ve tarih itibarıyla: finans raporuyla aynı kural (`defterKapsar`, tarih ≤ gün).
const YAS_DILIMLERI = [
  { anahtar: "yasVadesiGelmemis", ad: "Vadesi gelmemiş" },
  { anahtar: "yas0_30", ad: "0-30 gün", ust: 30 },
  { anahtar: "yas31_60", ad: "31-60 gün", ust: 60 },
  { anahtar: "yas61_90", ad: "61-90 gün", ust: 90 },
  { anahtar: "yas91_180", ad: "91-180 gün", ust: 180 },
  { anahtar: "yas180", ad: "180+ gün", ust: Infinity },
];

function finansGunFarki(a, b) {
  const gun = (t) => Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10));
  return Math.round((gun(finansGun(a)) - gun(finansGun(b))) / 86400000);
}
function finansGunEkle(t, n) {
  const d = new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10) + (n || 0)));
  return d.toISOString().slice(0, 10);
}

function cariYaslandirma(cari, { defter = "Tümü", tarih, varsayilanVade = 0 } = {}) {
  const bugun = tarih || bugunYerel();
  const hareketler = ((cari && cari.hareketler) || [])
    .filter((h) => defterKapsar(h.defter, defter) && finansGun(h.tarih) && finansGun(h.tarih) <= bugun)
    .sort((a, b) => finansGun(a.tarih).localeCompare(finansGun(b.tarih)) || String(a.zaman || "").localeCompare(String(b.zaman || "")));
  const pbler = [...new Set(hareketler.map((h) => h.paraBirimi || "TRY"))];
  const yuv = (x) => Math.round(x * 100) / 100;
  return pbler.map((pb) => {
    const liste = hareketler.filter((h) => (h.paraBirimi || "TRY") === pb);
    const borc = liste.filter((h) => h.yon === "Borç");
    const alacak = liste.filter((h) => h.yon !== "Borç");
    const toplamBorc = borc.reduce((t, h) => t + (h.tutar || 0), 0);
    const toplamAlacak = alacak.reduce((t, h) => t + (h.tutar || 0), 0);
    const bakiye = yuv(toplamBorc - toplamAlacak);
    const yon = bakiye > 0 ? "alacak" : bakiye < 0 ? "borc" : "kapali";
    // Açık kalemler: bakiye yönündeki hareketler, karşı yöndeki toplam en eskiden düşülerek.
    const kalemler = yon === "alacak" ? borc : yon === "borc" ? alacak : [];
    let kapatan = yon === "alacak" ? toplamAlacak : toplamBorc;
    const acik = [];
    kalemler.forEach((h) => {
      const t = h.tutar || 0;
      const dusen = Math.min(t, kapatan);
      kapatan -= dusen;
      const kalan = yuv(t - dusen);
      if (kalan <= 0.004) return;
      const vade = h.vade ? finansGun(h.vade) : finansGunEkle(finansGun(h.tarih), varsayilanVade);
      const gecikme = finansGunFarki(bugun, vade);      // + = vadesi geçen gün
      acik.push({ id: h.id, tarih: finansGun(h.tarih), vade, fisNo: h.fisNo || "", aciklama: h.aciklama || h.islemTipi || "",
        tutar: t, kalan, gun: gecikme, kismen: dusen > 0.004 });
    });
    const kovalar = Object.fromEntries(YAS_DILIMLERI.map((d) => [d.anahtar, 0]));
    acik.forEach((k) => {
      const d = k.gun < 0 ? YAS_DILIMLERI[0] : YAS_DILIMLERI.slice(1).find((x) => k.gun <= x.ust);
      kovalar[d.anahtar] = yuv(kovalar[d.anahtar] + k.kalan);
    });
    const vadesiGecen = acik.filter((k) => k.gun >= 0);
    const gecenToplam = vadesiGecen.reduce((t, k) => t + k.kalan, 0);
    return {
      pb, bakiye, yon, acikKalemler: acik, kovalar,
      // Ağırlıklı ortalama gecikme: vadesi geçen tutarın ortalama kaç gündür beklediği.
      ortalamaGecikme: gecenToplam > 0 ? Math.round(vadesiGecen.reduce((t, k) => t + k.kalan * k.gun, 0) / gecenToplam) : 0,
      enEskiGun: acik.length ? Math.max(...acik.map((k) => k.gun)) : null,
      vadesiGecen: yuv(gecenToplam),
    };
  }).filter((x) => x.yon !== "kapali");
}

// ANA FONKSİYON — düz satırlar. `defter`: "Tümü" | "Genel" | "Resmi"; `tarih`: "YYYY-AA-GG"
// (boşsa bugün). `mamulDegerleme`: "maliyet" | "satis" | "alis".
function finansRaporSatirlari({ cariler, muhasebe, stok, uretim, araProsesler, kurlar, defter = "Tümü", tarih, mamulDegerleme = "maliyet", varsayilanVade = 0 } = {}) {
  const bugun = tarih || bugunYerel();
  const bugunMu = !tarih || tarih >= bugunYerel();
  const kurTablosu = kurlar || (muhasebe && muhasebe.kurlar) || {};
  const tl = (tutar, pb) => {
    if ((pb || "TRY") === "TRY") return { tl: tutar, kurYok: null };
    const kur = parseFloat(kurTablosu[pb]);
    return kur > 0 ? { tl: Math.round(tutar * kur * 100) / 100, kurYok: null } : { tl: null, kurYok: pb };
  };
  const yuv = (x) => Math.round((x || 0) * 100) / 100;
  const defterEtiketi = defter === "Tümü" ? "Tümü" : defter;
  const satirlar = [];
  const ekle = (s) => {
    const cevrim = s.tlKarsiligi !== undefined ? { tl: s.tlKarsiligi, kurYok: s.kurYok || null } : tl(s.tutar, s.paraBirimi);
    const isaret = s.taraf === "Varlık" ? 1 : s.taraf === "Yükümlülük" ? -1 : 0;
    satirlar.push({
      defter: defterEtiketi, ayrinti: "", vade: "", vadeAy: "", vadeDurumu: "", sonHareket: "", miktar: null, birimDeger: null,
      ...s,
      tutar: yuv(s.tutar),
      tlKarsiligi: cevrim.tl == null ? null : yuv(cevrim.tl),
      netEtki: cevrim.tl == null ? 0 : yuv(cevrim.tl * isaret),
      not: [s.not, cevrim.kurYok ? `${cevrim.kurYok} kuru yok — toplamlara girmedi` : ""].filter(Boolean).join(" · "),
    });
  };
  const kapsar = (d) => defterKapsar(d, defter);

  // ---- HAZIR DEĞERLER: kasa ve banka ----
  [["kasalar", "Kasa"], ["bankalar", "Banka"]].forEach(([anahtar, kalem]) => {
    ((muhasebe && muhasebe[anahtar]) || []).forEach((h) => {
      const hareketler = (h.hareketler || []).filter((x) => kapsar(x.defter) && finansGun(x.tarih) <= bugun);
      const bakiye = hareketler.reduce((t, x) => t + (x.yon === "Giriş" ? (x.tutar || 0) : -(x.tutar || 0)), 0);
      if (Math.abs(bakiye) < 0.005 && h.pasif) return;
      ekle({ taraf: "Varlık", grup: "Hazır Değerler", kalem, ad: h.ad, ayrinti: h.banka || "", paraBirimi: h.paraBirimi || "TRY", tutar: bakiye,
        sonHareket: hareketler.reduce((m, x) => (finansGun(x.tarih) > m ? finansGun(x.tarih) : m), ""),
        not: bakiye < 0 ? "eksi bakiye" : "" });
    });
  });

  // ---- CARİLER: para birimi başına bakiye. + alacak (varlık), − borç (yükümlülük) ----
  // Cari tipine göre kalem: müşteriye verilen avans da "alacak", tedarikçinin bize borcu da.
  (cariler || []).forEach((c) => {
    // Son hareket PB başına; bakiye ve yaş dilimleri yaşlandırmadan (aynı süzgeç, aynı toplam).
    const pbSon = {};
    (c.hareketler || []).filter((h) => kapsar(h.defter) && finansGun(h.tarih) <= bugun).forEach((h) => {
      const pb = h.paraBirimi || "TRY";
      if (finansGun(h.tarih) > (pbSon[pb] || "")) pbSon[pb] = finansGun(h.tarih);
    });
    cariYaslandirma(c, { defter, tarih: bugun, varsayilanVade }).forEach((y) => {
      const tip = c.tip || "Müşteri";
      const alacak = y.yon === "alacak";
      ekle({
        taraf: alacak ? "Varlık" : "Yükümlülük",
        grup: alacak ? "Ticari Alacaklar" : "Ticari Borçlar",
        kalem: `${tip} ${alacak ? "alacağı" : "borcu"}`,
        ad: c.unvan, ayrinti: tip + (c.pasif ? " · pasif" : ""), paraBirimi: y.pb, tutar: Math.abs(y.bakiye), sonHareket: pbSon[y.pb] || "",
        ...y.kovalar, vadesiGecen: y.vadesiGecen, ortalamaGecikme: y.ortalamaGecikme, enEskiGun: y.enEskiGun,
      });
    });
  });

  // ---- ÇEKLER — durum o tarihe kadarki geçmişten ----
  const tumHareketler = new Map();
  (cariler || []).forEach((c) => (c.hareketler || []).forEach((h) => tumHareketler.set(h.id, { cari: c, h })));
  ((muhasebe && muhasebe.cekler) || []).forEach((cek) => {
    const giris = cek.hareketId ? tumHareketler.get(cek.hareketId) : null;
    const girisDefteri = (giris && giris.h.defter) || "Genel";
    if (!kapsar(girisDefteri)) return;
    const girisTarihi = finansGun((giris && giris.h.tarih) || cek.tarih || ((cek.gecmis || [])[0] || {}).tarih || "");
    if (girisTarihi && girisTarihi > bugun) return;
    let durum = "Portföyde";
    (cek.gecmis || []).forEach((g) => { if (!g.tarih || finansGun(g.tarih) <= bugun) durum = g.yeniDurum || durum; });
    if (bugunMu) durum = cek.durum || durum;
    const verilen = (cek.tip || "Alınan") === "Verilen";
    const cari = (cariler || []).find((c) => c.id === cek.cariId);
    const ortak = {
      ad: `${cek.cekNo || "numarasız"}${cek.banka ? ` · ${cek.banka}` : ""}`,
      ayrinti: cari ? cari.unvan : "", paraBirimi: cek.paraBirimi || "TRY", tutar: cek.tutar || 0, vade: cek.vadeTarihi || "",
      ...finansVadeDurumu(cek.vadeTarihi, bugun),
    };
    if (!verilen) {
      if (durum === "Portföyde") ekle({ ...ortak, taraf: "Varlık", grup: "Alınan Çekler", kalem: "Portföydeki çek" });
      else if (durum === "Tahsilde") ekle({ ...ortak, taraf: "Varlık", grup: "Alınan Çekler", kalem: "Bankada tahsildeki çek", not: cek.tahsilBankaAd || "" });
      else if (durum === "Karşılıksız") ekle({ ...ortak, taraf: "Varlık", grup: "Alınan Çekler", kalem: "Karşılıksız (şüpheli) çek" });
      // CİRO RİSKİ (nazım hesap): ciro ettiğimiz çek vadesinde ödenmezse bize döner. Vadesi
      // geçmemiş cirolu çek bilgi olarak listelenir, net varlığa girmez.
      else if (durum === "Ciro Edildi" && (!cek.vadeTarihi || finansGun(cek.vadeTarihi) >= bugun)) {
        const son = [...cekEtkinGecmis(cek)].reverse().find((g) => g.yeniDurum === "Ciro Edildi");
        ekle({ ...ortak, taraf: "Bilgi", grup: "Ciro Edilen Çekler (risk)", kalem: "Ciro edilen, vadesi gelmemiş", not: son && son.cariAd ? `→ ${son.cariAd}` : "" });
      }
    } else if (durum === "Portföyde" || durum === "Tahsilde") {
      // Şahsi çek "Portföyde" = verildi, henüz ödenmedi: vadesinde hesaptan çıkacak BORÇ.
      ekle({ ...ortak, taraf: "Yükümlülük", grup: "Verilen Çekler", kalem: "Ödenecek şahsi çek" });
    }
  });

  // ---- STOKLAR — defter taşımıyor, her defterde aynı ----
  (stok || []).forEach((p) => {
    if (!p || p.kategori === "Hizmet") return;
    const mamul = p.kategori === "Mamul";
    const miktarlar = new Map();
    if ((p.hareketler || []).length) {
      p.hareketler.filter((h) => finansGun(h.tarih) <= bugun).forEach((h) => {
        const k = `${stokAnahtarNrm(h.renk)}|${stokAnahtarNrm(h.beden)}`;
        miktarlar.set(k, (miktarlar.get(k) || 0) + (Number(h.miktar) || 0));
      });
    } else if (bugunMu) {
      (p.variants || []).forEach((v) => {
        const k = `${stokAnahtarNrm(v.renk)}|${stokAnahtarNrm(v.beden)}`;
        miktarlar.set(k, (miktarlar.get(k) || 0) + (Number(v.miktar) || 0));
      });
    }
    miktarlar.forEach((miktar, k) => {
      miktar = stokYuvarla(miktar);
      if (Math.abs(miktar) < 0.0005) return;
      const [renk, beden] = k.split("|");
      let birim = 0; let kurYok = null; let fiyatsiz = false; let pay = null; let iscilikYok = false;
      if (mamul) {
        const d = finansMamulBirimDegeri(p, renk, beden, mamulDegerleme, stok, kurTablosu, araProsesler);
        birim = d.tl; kurYok = d.kurYok; fiyatsiz = d.fiyatsiz; iscilikYok = d.iscilikYok;
        if (d.hammadde != null) pay = { hammaddeDegeri: yuv(miktar * d.hammadde), iscilikDegeri: yuv(miktar * d.iscilik) };
      } else {
        const bf = hammaddeBirimFiyati(p, renk, beden, kurTablosu);
        birim = bf.tl; fiyatsiz = !(bf.kendiFiyat > 0);
        if (bf.pb !== "TRY" && !(parseFloat(kurTablosu[bf.pb]) > 0) && bf.kendiFiyat > 0) kurYok = bf.pb;
      }
      const deger = kurYok ? null : miktar * birim;
      ekle({
        taraf: "Varlık", grup: "Stoklar", kalem: p.kategori || "Hammadde", ad: p.ad,
        ayrinti: [olcuGoster(renk), olcuGoster(beden)].filter(Boolean).join(" · "),
        paraBirimi: "TRY", tutar: deger || 0, tlKarsiligi: deger, kurYok, miktar, birimDeger: kurYok ? null : yuv(birim),
        ...(pay || (!mamul && deger != null ? { hammaddeDegeri: yuv(deger), iscilikDegeri: 0 } : {})),
        not: [fiyatsiz ? "fiyat/maliyet yok — değer 0" : "", iscilikYok && !fiyatsiz ? "proses ücreti yok — işçilik 0" : "", miktar < 0 ? "eksi stok" : ""].filter(Boolean).join(" · "),
      });
    });
  });

  // ---- ÜRETİMDEKİ MALLAR (yarı mamul) — gerçekleşen maliyet, deftersiz (stok gibi) ----
  finansUretimDegerleri({ uretim, stok, cariler, kurlar: kurTablosu, tarih: bugun, araProsesler }).forEach((w) => {
    ekle({
      taraf: "Varlık", grup: "Stoklar", kalem: "Üretimdeki mal (yarı mamul)",
      ad: `Üretim ${w.uretim.siparisNo || ""} · ${w.urunAd}`.trim(),
      ayrinti: [w.renk, w.toplamAdet ? `${w.girenCift}/${w.toplamAdet} çift stoğa girdi` : "", w.uretim.asama || ""].filter(Boolean).join(" · "),
      paraBirimi: "TRY", tutar: w.kurYok ? 0 : w.deger, tlKarsiligi: w.kurYok ? null : w.deger, kurYok: w.kurYok,
      miktar: w.toplamAdet ? stokYuvarla(w.toplamAdet - w.girenCift) : null,
      hammaddeDegeri: w.hammadde, iscilikDegeri: w.iscilik, iscilikOdenen: w.iscilikOdenen, iscilikOdenmemis: w.iscilikOdenmemis, aktarilan: w.aktarilan,
      sonHareket: w.sonHareket,
      not: [w.aktarilan > 0 ? `bitmiş mala aktarılan ${w.aktarilan.toLocaleString("tr-TR")} ₺ düşüldü` : "",
        w.iscilikOdenmemis > 0 ? `ödenmemiş işçilik ${w.iscilikOdenmemis.toLocaleString("tr-TR")} ₺ (${w.personeller.join(", ")}) — personel borcunda` : ""].filter(Boolean).join(" · "),
    });
  });

  return satirlar;
}

// BİLANÇO ÖZETİ — grup toplamları (TL) ve net varlık. Kuru olmayan satırlar toplam dışı, sayılıyor.
function finansOzet(satirlar) {
  const gruplar = {};
  let varlik = 0, yukumluluk = 0, bilgi = 0, kurYok = 0;
  (satirlar || []).forEach((s) => {
    if (s.tlKarsiligi == null) { kurYok += 1; return; }
    gruplar[s.grup] = gruplar[s.grup] || { taraf: s.taraf, toplam: 0, adet: 0 };
    gruplar[s.grup].toplam += s.tlKarsiligi;
    gruplar[s.grup].adet += 1;
    if (s.taraf === "Varlık") varlik += s.tlKarsiligi;
    else if (s.taraf === "Yükümlülük") yukumluluk += s.tlKarsiligi;
    else bilgi += s.tlKarsiligi;
  });
  const yuv = (x) => Math.round(x * 100) / 100;
  Object.values(gruplar).forEach((g) => { g.toplam = yuv(g.toplam); });
  return { gruplar, varlik: yuv(varlik), yukumluluk: yuv(yukumluluk), net: yuv(varlik - yukumluluk), bilgi: yuv(bilgi), kurYok };
}

// GRID TAŞMASI: grid öğesinin varsayılan min-width'i içeriği kadar; geniş tablo (yaşlandırma,
// 20+ sütunlu rapor) kabı büyütüp bütün sayfayı yana kaydırıyordu (ekran görüntüsünde ölçüldü).
// Kaplar `minmax(0, 1fr)` ile daraltılıyor; tablo kendi kabında kayıyor.
function FinansRaporu({ cariler, muhasebe, stok, uretim, araProsesler, raporlar, onRaporlarKaydet, aktifKullanici, showToast, firmaBilgileri }) {
  const [defter, setDefter] = useState("Tümü");   // "Tümü" | "Genel" | "Resmi" | "YanYana"
  const [tarih, setTarih] = useState("");
  const [mamulDegerleme, setMamulDegerleme] = useState("maliyet");
  // GÖRÜNÜM (v1.464.0): "ozet" varlık özeti · "yas" alacak/borç yaşlandırma. Kayıtlı raporlar ikisinde de.
  const [gorunum, setGorunum] = useState("ozet");
  const [yasYon, setYasYon] = useState("alacak");
  const [varsayilanVade, setVarsayilanVade] = useState("0");
  const kurlar = (muhasebe && muhasebe.kurlar) || {};
  const vadeGun = Math.max(0, parseInt(varsayilanVade, 10) || 0);
  const ortak = { cariler, muhasebe, stok, uretim, araProsesler, kurlar, tarih, mamulDegerleme, varsayilanVade: vadeGun };
  // YAN YANA: iki defterin satırları birlikte (Defter sütunu ayırır); özet iki sütunlu.
  const satirlar = defter === "YanYana"
    ? [...finansRaporSatirlari({ ...ortak, defter: "Genel" }), ...finansRaporSatirlari({ ...ortak, defter: "Resmi" })]
    : finansRaporSatirlari({ ...ortak, defter });
  const ozetler = defter === "YanYana"
    ? [["Genel", finansOzet(satirlar.filter((s) => s.defter === "Genel"))], ["Resmi", finansOzet(satirlar.filter((s) => s.defter === "Resmi"))]]
    : [[defter === "Tümü" ? "Tüm defterler" : defter, finansOzet(satirlar)]];
  const para = (v) => `${(v || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
  const fiyatsizSayisi = satirlar.filter((s) => s.grup === "Stoklar" && /fiyat\/maliyet yok/.test(s.not || "")).length;
  const kurYokSayisi = satirlar.filter((s) => s.tlKarsiligi == null).length;
  // Hazır şablonlar + kayıtlılar. Kaydedilen (değiştirilmiş) hazır şablon kendi kimliğiyle geçerli.
  const kayitli = raporlar || [];
  const gorunenRaporlar = [...FINANS_HAZIR_RAPORLAR.filter((h) => !kayitli.some((r) => r.id === h.id)), ...kayitli];
  // Kaydederken DOKUNULMAMIŞ hazır şablonlar veriye yazılmıyor (nesne kimliğiyle ayırt ediliyor).
  const raporlariKaydet = (liste) => onRaporlarKaydet((liste || []).filter((r) => !FINANS_HAZIR_RAPORLAR.includes(r)));
  const secim = (deger, set, secenekler) => (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {secenekler.map(([d, ad]) => (
        <button key={d} type="button" onClick={() => set(d)} data-finans-secim={d}
          style={{ padding: "5px 11px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 700, cursor: "pointer",
            border: `1.5px solid ${deger === d ? "var(--erp-primary)" : "var(--erp-line)"}`,
            background: deger === d ? "var(--erp-primary)" : "#fff", color: deger === d ? "#fff" : "var(--erp-text-2)" }}>
          {ad}
        </button>
      ))}
    </div>
  );
  const etiket = { fontSize: 11, fontWeight: 700, color: "var(--erp-text-3)", textTransform: "uppercase", letterSpacing: ".04em" };
  const gruplar = FINANS_GRUP_SIRASI.filter((g) => ozetler.some(([, o]) => o.gruplar[g]));
  const taraflar = [["Varlık", "VARLIKLAR"], ["Yükümlülük", "YÜKÜMLÜLÜKLER"], ["Bilgi", "BİLGİ (net varlığa girmez)"]];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14 }}>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-end", background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <span style={etiket}>Görünüm</span>
          {secim(gorunum, setGorunum, [["ozet", "Varlık Özeti"], ["yas", "Yaşlandırma"]])}
        </div>
        <div style={{ display: "grid", gap: 4 }}>
          <span style={etiket}>Defter</span>
          {secim(defter, setDefter, [["Tümü", "Tümü"], ["Genel", "Genel"], ["Resmi", "Resmi"], ["YanYana", "Genel · Resmi yan yana"]])}
        </div>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={etiket}>Tarih itibarıyla</span>
          <input type="date" data-finans-tarih="1" value={tarih} onChange={(e) => setTarih(e.target.value)} style={{ ...inputStyle, width: 160 }} />
        </label>
        {/* VARSAYILAN VADE: satış fişlerinde vade çoğunlukla boş; "30" yazılırsa vadesiz her kalem
            30 gün vadeli sayılır (yaş vade gününden başlar). Vadesi yazılı kalem kendi vadesini kullanır. */}
        <label style={{ display: "grid", gap: 4 }}>
          <span style={etiket}>Varsayılan vade (gün)</span>
          <input type="number" min="0" step="1" data-finans-vade="1" value={varsayilanVade} onChange={(e) => setVarsayilanVade(e.target.value)} style={{ ...inputStyle, width: 90 }} />
        </label>
        {gorunum === "ozet" && <div style={{ display: "grid", gap: 4 }}>
          <span style={etiket}>Mamul değerleme</span>
          {secim(mamulDegerleme, setMamulDegerleme, [["maliyet", "Hammadde + işçilik"], ["hammadde", "Yalnız hammadde"], ["satis", "Satış fiyatı"], ["alis", "Kart alış fiyatı"]])}
        </div>}
      </div>

      {gorunum === "yas" && (
        <div id="finans-yas-yazdir" style={{ background: "#fff", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 14, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {secim(yasYon, setYasYon, [["alacak", "Alacaklar"], ["borc", "Borçlar"]])}
            <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)" }}>
              {tarih ? `${tarihYaz(tarih)} itibarıyla` : "bugün itibarıyla"} · FIFO: ödemeler en eski kalemi kapatır{vadeGun ? ` · vadesiz kalemler ${vadeGun} gün vadeli` : ""}
            </span>
            <button type="button" className="btn-ghost no-print" style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 12 }}
              onClick={() => indirYazdirilabilirHTML("#finans-yas-yazdir", `${yasYon === "alacak" ? "Alacak" : "Borc"}-Yaslandirma-${tarih || bugunYerel()}`)}>
              <Printer size={13} /> Yazdır
            </button>
          </div>
          {(defter === "YanYana" ? ["Genel", "Resmi"] : [defter]).map((d) => (
            <YaslandirmaTablosu key={d} cariler={cariler} defter={d} tarih={tarih} varsayilanVade={vadeGun} yon={yasYon} kurlar={kurlar}
              baslik={`${yasYon === "alacak" ? "Alacak" : "Borç"} Yaşlandırma${d === "Tümü" ? "" : ` — ${d} defter`}`} />
          ))}
        </div>
      )}

      {gorunum === "ozet" && <div id="finans-ozet-yazdir" data-finans-ozet="1" style={{ background: "#fff", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 14, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <b style={{ fontSize: 15 }}>Varlık Özeti{(firmaBilgileri || {}).unvan ? ` — ${firmaBilgileri.unvan}` : ""}</b>
          <span className="mono" style={{ fontSize: 11, color: "var(--erp-text-2)" }}>
            {tarih ? `${tarihYaz(tarih)} itibarıyla` : "bugün itibarıyla"} · kurlar: {Object.entries(kurlar).filter(([k, v]) => /^[A-Z]{3}$/.test(k) && v).map(([k, v]) => `${k} ${v}`).join(", ") || "yok"}
          </span>
          <button type="button" className="btn-ghost no-print" style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 12 }}
            onClick={() => indirYazdirilabilirHTML("#finans-ozet-yazdir", `Varlik-Ozeti-${tarih || bugunYerel()}`)}>
            <Printer size={13} /> Yazdır
          </button>
        </div>
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Grup</th>
              {ozetler.map(([ad]) => <th key={ad} style={{ textAlign: "right" }}>{ad}</th>)}
              {ozetler.length === 2 && <th style={{ textAlign: "right" }}>Fark (Genel − Resmi)</th>}
            </tr>
          </thead>
          <tbody>
            {taraflar.map(([taraf, baslik]) => {
              const tarafGruplari = gruplar.filter((g) => ozetler.some(([, o]) => o.gruplar[g] && o.gruplar[g].taraf === taraf));
              if (tarafGruplari.length === 0) return null;
              return (
                <React.Fragment key={taraf}>
                  <tr><td colSpan={ozetler.length + 2} style={{ fontSize: 11, fontWeight: 800, color: "var(--erp-text-3)", paddingTop: 10 }}>{baslik}</td></tr>
                  {tarafGruplari.map((g) => {
                    const deger = (o) => (o.gruplar[g] ? o.gruplar[g].toplam : 0);
                    return (
                      <tr key={g} data-finans-ozet-grup={g}>
                        <td>{g}</td>
                        {ozetler.map(([ad, o]) => <td key={ad} className="mono" style={{ textAlign: "right" }}>{para(deger(o))}</td>)}
                        {ozetler.length === 2 && <td className="mono" style={{ textAlign: "right", color: "var(--erp-text-2)" }}>{para(deger(ozetler[0][1]) - deger(ozetler[1][1]))}</td>}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
            {[["Toplam varlık", "varlik"], ["Toplam yükümlülük", "yukumluluk"], ["NET VARLIK", "net"]].map(([ad, k]) => (
              <tr key={k} data-finans-ozet-toplam={k} style={{ borderTop: "2px solid var(--erp-line)" }}>
                <td style={{ fontWeight: 800 }}>{ad}</td>
                {ozetler.map(([d, o]) => (
                  <td key={d} className="mono" style={{ textAlign: "right", fontWeight: 800, color: k === "net" ? (o.net >= 0 ? "var(--erp-primary)" : "var(--erp-warn)") : undefined }}>{para(o[k])}</td>
                ))}
                {ozetler.length === 2 && <td className="mono" style={{ textAlign: "right", fontWeight: 700 }}>{para(ozetler[0][1][k] - ozetler[1][1][k])}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize: 11, color: "var(--erp-text-2)", display: "grid", gap: 2 }}>
          <span>Stok defter ayırmaz (mal fiziksel ve tek) — her iki defterde aynı stok değeri görünür.
            {mamulDegerleme === "maliyet" ? " Mamul = reçete hammaddesi (güncel alış fiyatı) + kartın proses ücretleri; genel gider stok değerine girmez." : mamulDegerleme === "hammadde" ? " Mamul = yalnız reçete hammaddesi; işçilik dahil değil." : ""}</span>
          {/* ÜRETİMDEKİ MALLAR — gerçekleşen maliyet ve işçiliğin ödenen/ödenmemiş kısmı (v1.465.0). */}
          {(() => {
            const wip = satirlar.filter((x) => x.kalem === "Üretimdeki mal (yarı mamul)" && (defter !== "YanYana" || x.defter === "Genel"));
            if (wip.length === 0) return null;
            const t = (k) => wip.reduce((a, x) => a + (x[k] || 0), 0);
            return (
              <span data-finans-uretim-ozet="1">
                Üretimdeki mallar ({wip.length} üretim): <b className="mono">{para(t("tlKarsiligi"))}</b> — gerçekleşen hammadde {para(t("hammaddeDegeri"))} +
                işçilik {para(t("iscilikDegeri"))} (ödenen {para(t("iscilikOdenen"))} · <b>ödenmemiş {para(t("iscilikOdenmemis"))}</b>, personel borçlarında), bitmiş mala aktarılan düşülerek.
              </span>
            );
          })()}
          {fiyatsizSayisi > 0 && <span style={{ color: "#B7791F" }}>⚠ {fiyatsizSayisi} stok kaleminin fiyatı/maliyeti yok — değeri 0 sayıldı ("Stok Değeri" raporunda Not sütununda).</span>}
          {kurYokSayisi > 0 && <span style={{ color: "var(--erp-warn)" }}>⚠ {kurYokSayisi} kalemin para biriminde kur yok — toplamlara girmedi. Üst şeritteki kur rozetinden girin.</span>}
        </div>
      </div>}

      <RaporSekmesi
        modulAnahtari="finans"
        baslik="Finans Raporu"
        alanlar={FINANS_RAPOR_ALANLARI}
        satirlar={satirlar}
        raporlar={gorunenRaporlar}
        onRaporlarKaydet={raporlariKaydet}
        aktifKullanici={aktifKullanici}
        showToast={showToast}
        arama=""
      />
    </div>
  );
}

// ---- YAŞLANDIRMA GÖRÜNÜMÜ (v1.464.0) ----------------------------------------------------------
// Üstte dilim toplamları (TL) ve yığılmış çubuk; altında cari başına tablo. Satıra dokununca o
// carinin AÇIK KALEMLERİ (hangi fiş, ne kadarı kaldı, kaç gündür) açılıyor — "neden 90+ gün?"
// sorusunun cevabı. Para birimi başına ayrı satır; TL toplamı kurla (kur yoksa dışarıda, yazılı).
const YAS_RENKLERI = ["#5B8C5A", "#9DB35A", "#D6B24C", "#E0913F", "#D0643A", "#A8322D"];

function YaslandirmaTablosu({ cariler, defter, tarih, varsayilanVade, yon, kurlar, baslik }) {
  const [acikId, setAcikId] = useState(null);
  const kurTL = (pb) => (pb === "TRY" ? 1 : parseFloat((kurlar || {})[pb]) || 0);
  const satirlar = (cariler || []).flatMap((c) => cariYaslandirma(c, { defter, tarih, varsayilanVade })
    .filter((y) => y.yon === yon)
    .map((y) => ({ ...y, cari: c, anahtar: `${c.id}|${y.pb}`, tl: kurTL(y.pb) ? Math.abs(y.bakiye) * kurTL(y.pb) : null })))
    .sort((a, b) => (b.tl || 0) - (a.tl || 0));
  const tlDilim = Object.fromEntries(YAS_DILIMLERI.map((d) => [d.anahtar, 0]));
  let tlToplam = 0; const kursuz = new Set();
  satirlar.forEach((s) => {
    const k = kurTL(s.pb);
    if (!k) { kursuz.add(s.pb); return; }
    YAS_DILIMLERI.forEach((d) => { tlDilim[d.anahtar] += s.kovalar[d.anahtar] * k; });
    tlToplam += Math.abs(s.bakiye) * k;
  });
  const pbToplam = {};
  satirlar.forEach((s) => {
    const t = (pbToplam[s.pb] = pbToplam[s.pb] || { bakiye: 0, ...Object.fromEntries(YAS_DILIMLERI.map((d) => [d.anahtar, 0])) });
    t.bakiye += Math.abs(s.bakiye);
    YAS_DILIMLERI.forEach((d) => { t[d.anahtar] += s.kovalar[d.anahtar]; });
  });
  const sayi = (v) => (v ? (Math.round(v * 100) / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
  const tlYaz = (v) => `${(Math.round(v * 100) / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
  const hucre = { padding: "5px 8px", fontSize: 12, borderBottom: "1px solid var(--erp-line-soft)" };
  const sag = { ...hucre, textAlign: "right" };
  const kapId = `finans-yas-${yon}-${defter}`;
  const gecenOran = tlToplam > 0 ? Math.round(((tlToplam - tlDilim.yasVadesiGelmemis) / tlToplam) * 100) : 0;

  return (
    <div data-finans-yas={`${yon}|${defter}`} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <b style={{ fontSize: 14 }}>{baslik}</b>
        <span className="mono" style={{ fontSize: 12 }} data-finans-yas-toplam="1">Toplam {tlYaz(tlToplam)} · vadesi geçen %{gecenOran}</span>
        <button type="button" className="btn-ghost no-print" style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 12 }}
          onClick={() => raporExcelAktar(kapId, `${baslik}`)}>
          <Download size={13} /> Excel
        </button>
      </div>
      {/* DİLİM ÇUBUĞU — tutarın yaşa göre dağılımı; renk yeşilden (vadesi gelmemiş) kırmızıya. */}
      {tlToplam > 0 && (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", border: "1px solid var(--erp-line-soft)" }}>
            {YAS_DILIMLERI.map((d, i) => (tlDilim[d.anahtar] > 0 ? (
              <div key={d.anahtar} title={`${d.ad}: ${tlYaz(tlDilim[d.anahtar])}`} style={{ width: `${(tlDilim[d.anahtar] / tlToplam) * 100}%`, background: YAS_RENKLERI[i] }} />
            ) : null))}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11 }}>
            {YAS_DILIMLERI.map((d, i) => (
              <span key={d.anahtar} data-finans-yas-dilim={d.anahtar} style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: YAS_RENKLERI[i] }} />
                {d.ad}: <b className="mono">{tlYaz(tlDilim[d.anahtar])}</b>
                <span style={{ color: "var(--erp-text-3)" }}>(%{Math.round((tlDilim[d.anahtar] / tlToplam) * 100)})</span>
              </span>
            ))}
          </div>
        </div>
      )}
      <div id={kapId} style={{ overflowX: "auto" }}>
        {satirlar.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--erp-text-3)", padding: 10 }}>{yon === "alacak" ? "Açık alacak yok." : "Açık borç yok."}</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Cari", "P.B.", "Bakiye", ...YAS_DILIMLERI.map((d) => d.ad), "Ort. gecikme", "En eski"].map((b, i) => (
                  <th key={b} style={{ ...hucre, fontSize: 11, color: "var(--erp-text-2)", textAlign: i < 2 ? "left" : "right", borderBottom: "2px solid var(--erp-text)", whiteSpace: "nowrap" }}>{b}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {satirlar.map((s) => (
                <React.Fragment key={s.anahtar}>
                  <tr data-finans-yas-satir={s.cari.unvan} onClick={() => setAcikId(acikId === s.anahtar ? null : s.anahtar)} style={{ cursor: "pointer" }}>
                    <td style={{ ...hucre, fontWeight: 600 }}>{s.cari.unvan}{s.cari.pasif ? <span style={{ fontSize: 10, color: "var(--erp-purple)" }}> · pasif</span> : null}</td>
                    <td className="mono" style={hucre}>{s.pb}</td>
                    <td className="mono" style={{ ...sag, fontWeight: 700 }}>{sayi(Math.abs(s.bakiye))}</td>
                    {YAS_DILIMLERI.map((d, i) => (
                      <td key={d.anahtar} className="mono" style={{ ...sag, color: s.kovalar[d.anahtar] ? YAS_RENKLERI[i] : undefined, fontWeight: s.kovalar[d.anahtar] && i >= 3 ? 700 : 400 }}>{sayi(s.kovalar[d.anahtar])}</td>
                    ))}
                    <td className="mono" style={sag}>{s.ortalamaGecikme ? `${s.ortalamaGecikme} gün` : ""}</td>
                    <td className="mono" style={sag}>{s.enEskiGun != null && s.enEskiGun >= 0 ? `${s.enEskiGun} gün` : ""}</td>
                  </tr>
                  {/* AÇIK KALEMLER — hangi fişin ne kadarı ödenmedi. Excel ve baskıya girmez. */}
                  {acikId === s.anahtar && (
                    <tr className="no-print" data-finans-yas-kalemler={s.cari.unvan}>
                      <td colSpan={5 + YAS_DILIMLERI.length} style={{ padding: "6px 8px 10px 20px", background: "var(--erp-panel)" }}>
                        <div style={{ display: "grid", gap: 3 }}>
                          {s.acikKalemler.map((k) => (
                            <div key={k.id} className="mono" style={{ fontSize: 11, display: "flex", gap: 10, flexWrap: "wrap" }}>
                              <span style={{ color: "var(--erp-text-3)", minWidth: 74 }}>{tarihYaz(k.tarih)}</span>
                              <span style={{ minWidth: 110 }}>{k.fisNo || "fiş no yok"}</span>
                              <span style={{ color: "var(--erp-text-2)", flex: 1, minWidth: 120 }}>{k.aciklama}</span>
                              <span>vade {tarihYaz(k.vade)}</span>
                              <b>{sayi(k.kalan)} {PARA_SEMBOLU[s.pb] || s.pb}</b>
                              {k.kismen && <span style={{ color: "var(--erp-text-3)" }}>({sayi(k.tutar)} tutarın kalanı)</span>}
                              <span style={{ color: k.gun < 0 ? YAS_RENKLERI[0] : k.gun > 90 ? YAS_RENKLERI[5] : YAS_RENKLERI[3], fontWeight: 700 }}>
                                {k.gun < 0 ? `vadeye ${-k.gun} gün` : `${k.gun} gün gecikmiş`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              {Object.entries(pbToplam).map(([pb, t]) => (
                <tr key={pb} data-finans-yas-pb-toplam={pb} style={{ fontWeight: 700, borderTop: "2px solid var(--erp-text)" }}>
                  <td style={hucre}>Toplam</td>
                  <td className="mono" style={hucre}>{pb}</td>
                  <td className="mono" style={sag}>{sayi(t.bakiye)}</td>
                  {YAS_DILIMLERI.map((d) => <td key={d.anahtar} className="mono" style={sag}>{sayi(t[d.anahtar])}</td>)}
                  <td style={hucre} /><td style={hucre} />
                </tr>
              ))}
            </tfoot>
          </table>
        )}
      </div>
      {kursuz.size > 0 && <span style={{ fontSize: 11, color: "var(--erp-warn)" }}>⚠ {[...kursuz].join(", ")} kuru yok — TL toplamına ve çubuğa girmedi (tabloda kendi biriminde).</span>}
    </div>
  );
}
