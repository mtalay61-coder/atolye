// ================= STOK MİKTARI HAREKETLERDEN TÜRETİLİR =================
//
// Kullanıcı (16 Eylül): *"Stok için konuşuyorum. Tek defterden tutalım, her şey tek deftere
// yazılsın, girende çıkanda. Fişi olmayan kayıt aklım almıyor. Defterden okusun hareketleri."*
// → Parça 1.
//
// ÖNCE NE VARDI: aynı gerçek iki yerde tutuluyordu —
//   `variants[].miktar` (ekranların okuduğu özet sayı) ve `hareketler[]` (giriş/çıkış geçmişi).
// İkisi ayrı ayrı yazıldığı için ayrışabiliyorlardı; ürün kartındaki "kayıtlı stok ile hareket
// geçmişi tutmuyor" uyarısı tam olarak bu ayrışmanın ölçüsüydü. Hangisinin doğru olduğunu
// uygulama bilemediği için kullanıcıya iki olasılık sunuyordu.
//
// ŞİMDİ: `variants[].miktar` ARTIK YAZILAN DEĞİL TÜRETİLEN bir değer. Her stok güncellemesinde
// hareketlerden yeniden hesaplanıyor. Ayrışma mümkün değil — iki sayı değil, tek sayı var.
//
// OKUYUCULAR DEĞİŞMEDİ: kodda 130'dan fazla yer `variants[].miktar` okuyor. Hepsini "hesapla"
// çağrısına çevirmek yerine miktar aynı yerde duruyor, yalnız KAYNAĞI değişti. Bu, geçişi tek
// dosyaya sığdırdı ve ekranlara hiç dokunmadı.
//
// AÇILIŞ FARKI: hareketi olmayan ama miktarı olan varyantlar (ürün açılırken elle girilen
// başlangıç stokları) düz hesapta SIFIRLANIRDI — kimsenin malı buharlaşmamalı. Onun için geçişte
// bu farklar AÇILIŞ HAREKETİ olarak yazılıyor: fiş numarası `ACL-<tarih>-<sıra>`, kaynak "Açılış".
// Böylece hem stok korunuyor hem de "fişsiz kayıt" kalmıyor.

// FİŞSİZ HAREKET YAZILAMAZ (kullanıcı, 16 Eylül: "geçmişte fiş numarası olmayan kayıt varsa
// önemli değil, gelecekte olmasın yeterli").
//
// Numara ATAMA, stok yazımının tek geçidinde yapılıyor: bir hareket fiş numarasız geldiyse burada
// numara alıyor. Böylece "şu kapı numara üretmeyi unutmuş" durumu imkânsız — kapıya değil, geçide
// bakıyoruz. Ön ek hareketin kaynağından geliyor ki numaraya bakınca işin cinsi anlaşılsın.
const FIS_ON_EKLERI = { "Üretim": "URT", "Açılış": "ACL", "Satınalma": "ALS", "Satış": "SAT", "Sayım": "SYM", "Numune": "NUM", "Fire": "FRE", "Transfer": "TRF" };

function hareketFisOnEki(kaynak) {
  return FIS_ON_EKLERI[kaynak] || "MNL";
}

// Numarasız hareketlere numara verir. Aynı ürün+tarih+kaynak grubundaki numarasız hareketler AYNI
// numarayı alır: bir işlemde yazılan beş beden tek fiştir, beş ayrı fiş değil.
function fissizHareketlereNumaraVer(urunler, sayacUret) {
  let degistiMi = false;
  const grupNumaralari = new Map();
  const sonuc = (urunler || []).map((p) => {
    if (!p || !(p.hareketler || []).some((h) => !h.fisNo)) return p;
    degistiMi = true;
    const hareketler = (p.hareketler || []).map((h) => {
      if (h.fisNo) return h;
      const gunluk = String(h.tarih || "").slice(0, 10);
      const grup = `${p.id}|${gunluk}|${h.kaynak || ""}|${h.uretimId || ""}|${h.siparisNo || ""}`;
      if (!grupNumaralari.has(grup)) grupNumaralari.set(grup, sayacUret(hareketFisOnEki(h.kaynak)));
      return { ...h, fisNo: grupNumaralari.get(grup), fisOtomatik: true };
    });
    return { ...p, hareketler };
  });
  return degistiMi ? sonuc : urunler;
}

// Bir ürünün hareketlerinden renk/beden bazında net miktar.
function urunHareketToplami(urun) {
  const toplam = new Map();
  (urun.hareketler || []).forEach((h) => {
    const anahtar = `${stokAnahtarNrm(h.renk)}|${stokAnahtarNrm(h.beden)}`;
    toplam.set(anahtar, stokYuvarla((toplam.get(anahtar) || 0) + (Number(h.miktar) || 0)));
  });
  return toplam;
}

// EKRANDA "STANDART" YAZILMAZ (24 Eylül, v1.437.0 — kullanıcı: "Standart yazmasına gerek yok").
// "Standart" bir renk ya da beden DEĞİL, renksiz/ölçüsüz malzemenin yer tutucusu (bkz. 152-stok:
// renk seçilmeyince varyanta bu yazılıyor; 077-barkod'da ayrılmış kodu var). Veri tarafında zaten
// boş dizeyle aynı sayılıyor (`stokAnahtarNrm`); eksik olan GÖSTERİM tarafıydı: tablolarda renk
// hücresi ve beden sütun başlığı "Standart" diye doluyordu. Kayıt DEĞİŞMİYOR, yalnız gösterim.
function olcuGoster(deger, bos = "") {
  const d = deger == null ? "" : String(deger).trim();
  return d === "Standart" ? bos : d;
}

// Matris tablosunun köşe başlığı (v1.474.0). "Renk \ Beden" yalnız ikisi de gerçekse; renksiz
// üründe "Beden", bedensiz üründe "Renk", ikisi de yer tutucuysa boş — satır/sütunda "Standart"
// yazılmadığı (`olcuGoster`) hâlde köşede "Renk \ Beden" kalınca olmayan eksenleri anlatıyordu.
function matrisKoseBasligi(renkler, bedenler) {
  const renkVar = (renkler || []).some((r) => olcuGoster(r));
  const bedenVar = (bedenler || []).some((b) => olcuGoster(b));
  return [renkVar ? "Renk" : null, bedenVar ? "Beden" : null].filter(Boolean).join(" \\ ");
}

// "Standart" yer tutucusu ile boş dize aynı varyantı gösteriyor (078-fisyaz'daki kuralın aynısı).
function stokAnahtarNrm(x) {
  const d = x == null ? "" : String(x).trim();
  return d === "Standart" ? "" : d;
}

// Ürün listesinin varyant miktarlarını hareketlerden yeniden hesaplar.
//
// - Varyantı olup hareketi olmayan → 0 (hareket yoksa stok da yok).
// - Hareketi olup varyantı olmayan → varyant eklenir (fiş bir renk/bedeni ilk kez getirmiş olabilir).
// - Varyantın diğer alanları (minStok, özel alanlar) korunur; yalnız `miktar` değişir.
function stokMiktarlariniHesapla(urunler) {
  return (urunler || []).map((p) => {
    // Hizmet gibi stok tutmayan kayıtlar dokunulmadan geçer.
    if (!p || p.kategori === "Hizmet") return p;
    // HİÇ HAREKETİ OLMAYAN ÜRÜN DOKUNULMADAN GEÇER. Sebep: açılış göçü henüz çalışmamış bir veride
    // (ya da göç sırasında yeni açılmış üründe) bütün stokları sıfırlamak, var olan malı yok
    // saymak olurdu. Göç çalıştıktan sonra her miktarın bir hareketi olur ve bu istisna kendiliğinden
    // devre dışı kalır — o noktadan sonra kural tam işler: stok = hareketlerin toplamı.
    //
    // Ayrışmayı önleme amacı ZARAR GÖRMEZ: ayrışma ancak hareket VARKEN oluşur (hareket yazılıp
    // miktar güncellenmemiş ya da tersi), o durum da aşağıdaki hesapla düzelir.
    if (!(p.hareketler || []).length) return p;
    const toplam = urunHareketToplami(p);
    const kullanilan = new Set();
    let degisti = false;
    const variants = (p.variants || []).map((v) => {
      const anahtar = `${stokAnahtarNrm(v.renk)}|${stokAnahtarNrm(v.beden)}`;
      kullanilan.add(anahtar);
      const yeni = toplam.has(anahtar) ? toplam.get(anahtar) : 0;
      if ((v.miktar || 0) === yeni) return v;
      degisti = true;
      return { ...v, miktar: yeni };
    });
    toplam.forEach((miktar, anahtar) => {
      if (kullanilan.has(anahtar)) return;
      const [renk, beden] = anahtar.split("|");
      degisti = true;
      variants.push({ renk: renk || "Standart", beden: beden || "Standart", miktar, minStok: 0 });
    });
    return degisti ? { ...p, variants } : p;
  });
}

// GEÇİŞ: hareketi olmayan başlangıç miktarlarını açılış hareketine çevirir.
// Dönen `{ urunler, yazilan }` — `yazilan` kaç varyant için açılış hareketi yazıldığı.
function acilisFarklariniHareketeCevir(urunler, { tarih, fisNoUret }) {
  let yazilan = 0;
  const satirlar = [];
  const sonuc = (urunler || []).map((p) => {
    if (!p || p.kategori === "Hizmet") return p;
    const toplam = urunHareketToplami(p);
    const eklenecek = [];
    (p.variants || []).forEach((v) => {
      const anahtar = `${stokAnahtarNrm(v.renk)}|${stokAnahtarNrm(v.beden)}`;
      const hareketNeti = toplam.get(anahtar) || 0;
      const fark = stokYuvarla((v.miktar || 0) - hareketNeti);
      // YALNIZ POZİTİF FARK: "kayıtlı stok hareketlerden FAZLA" → hareketsiz başlangıç miktarı,
      // açılışa bağlanır. Ters yön ("kayıtlı stok hareketlerden AZ") bir giriş hareketinin fazladan
      // olduğu ya da varyantın elle düşürüldüğü anlamına gelir; oraya açılış hareketi yazmak
      // hareketleri geçersiz kılardı. O durumda hareketler esas alınır (türetme zaten uygular).
      if (fark <= 0) return;
      eklenecek.push({
        id: uid("hrk"),
        tarih,
        renk: v.renk, beden: v.beden,
        miktar: fark,
        kaynak: "Açılış",
        fisNo: fisNoUret(),
        aciklama: "Açılış: hareketsiz başlangıç miktarı fişe bağlandı (16 Eylül geçişi)",
      });
      yazilan++;
      satirlar.push(`${p.ad} ${v.renk}/${v.beden} ${fark > 0 ? "+" : ""}${fark}`);
    });
    if (eklenecek.length === 0) return p;
    return { ...p, hareketler: [...(p.hareketler || []), ...eklenecek] };
  });
  return { urunler: sonuc, yazilan, satirlar };
}
