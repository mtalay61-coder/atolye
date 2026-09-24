// ================= TEK KAPI: fisYaz =================
//
// NEDEN VAR
// Bu projede "fiş" diye bir nesne yok: aynı fiş numarasını taşıyan stok + cari hareketlerinden
// SONRADAN çıkarılan bir kavram. Fişi yazan kod birden çok yere dağılmıştı ve aynı hata sınıfı
// altı kez döndü — her seferinde sebebi aynıydı: bir kopya güncellendi, diğerleri güncellenmedi
// (kimlik bağı, birim fiyat, sipariş geri alımı, bulut şeması...). 16. denetleyici bu yüzden var.
//
// `fisYaz` o kopyaların tek gövdesi. SAF bir fonksiyon: state'e dokunmaz, toast göstermez,
// buluta yazmaz — yalnızca yeni `stok` ve `cariler` dizilerini döndürür. Sebep: iki çağrı yerinin
// biri `setStok` içinden, diğeri `setSiparisler` güncelleyicisinin İÇİNDEN çalışıyor; yan etkili
// bir fonksiyon o ikinci yerde kullanılamazdı. Kaydetme ve kullanıcıya bildirim çağıranda kalır.
//
// PARAMETRELİ — ÇÜNKÜ İKİ YOL BUGÜN AYRIŞMIŞ DURUMDA
// Fiş yolu (`stokFisiKaydet`) ile sipariş teslim yolu (`siparisGerceklestir`) beş noktada farklı
// davranıyor. Bunları burada sessizce birleştirmek, kullanıcının gördüğü rakamları değiştirirdi.
// Bu yüzden farklar BAYRAK olarak duruyor: kapı tek, davranış bugünküyle birebir aynı. Her bayrak
// kapatılmayı bekleyen bir karardır (bkz. DEVAM-NOTU "Ayrışmalar"):
//   1. `yon`            — fiş: Alış→Borç, Satış→Alacak · sipariş: her ikisi de Borç
//   2. `kurZorunlu`     — fiş: kur yoksa kaydı REDDET · sipariş: ham tutarla devam et
//   3. `tutarYuvarla`   — fiş: çevrilen tutarı yuvarlar · sipariş: yuvarlamaz
//   4. `birimFiyatBolerek` — sipariş: tutar/miktar · fiş: birim fiyatı ayrıca çevirir
//   5. `zaman`          — KAPANDI (v1.57.0): iki yol da yazıyor
//
// GİRDİ (`fis`)
//   fisNo, tip ("Alış"|"Satış"), cariId, kaynak ("Satınalma"|"Satış"),
//   stokTarihi (ISO), cariTarihi ("YYYY-AA-GG"), zaman (ISO|null),
//   kayitParaBirimi (null ise kalemin kendi para birimi), kurlar, kurZorunlu,
//   yon, defter ("Genel"|"Resmi"|"Muhasebe"), odemeSekli, vade,
//   siparis: { id, siparisNo, rezervasyonSiparisId } | null,
//   kalemler: [{ urunId, urunAd, renk, beden, birim, miktar>0, birimFiyat, paraBirimi,
//                kalemId?, fazlaGonderim? }],
//   stokAciklama(kalem)?           — stok hareketinin açıklaması (yoksa alan hiç yazılmaz)
//   cariAciklama(kalem, cevrim)    — cari hareketinin açıklaması
//
// ÇIKTI
//   { stok, cariler, cariHareketleri, kimlikler, atlananlar, cevrilemeyenler, yazilmadi }
//   `cariHareketleri` ayrıca dönüyor: fiş yolu cariye `addCariHareketFromStok` HUNİSİNDEN yazar
//   (fiş numarası/kimlik/zaman güvencesi orada), hazır `cariler` dizisini kullanmaz.
//   `kimlikler`: kalem -> hareket kimliği. AYNI kimlik hem stok hem cari tarafında kullanılır;
//   bağ kopunca ekstreden silinen satırın malı stokta kalıyordu (v1.41.0'ın kök sebebi).
function fisYaz(stok, cariler, fis) {
  const kalemler = (fis.kalemler || []).filter((k) => (k.miktar || 0) > 0);
  const kimlikler = new Map();
  const atlananlar = [];
  const cevrilemeyenler = new Set();

  // Ürün doğrulaması: aynı id'den birden fazla (ya da hiç) varsa o kalem İŞLENMEZ. Sessizce
  // yanlış ürünü güncellemektense atlamak; çağıran `atlananlar`ı kullanıcıya bildirir.
  const islenecek = [];
  kalemler.forEach((kalem) => {
    const eslesen = stok.filter((p) => p.id === kalem.urunId);
    if (eslesen.length === 0) return atlananlar.push({ kalem, sebep: "yok" });
    if (eslesen.length > 1) return atlananlar.push({ kalem, sebep: "cift" });
    kimlikler.set(kalem, uid("hrk"));
    islenecek.push(kalem);
  });

  // ---- 1) Para çevrimi ------------------------------------------------------------------------
  // Her kalem AYRI çevrilir, çünkü her kalem ayrı bir hareket satırı olacak. Önce toplayıp sonra
  // çevirseydik satırların toplamı fişin toplamını tutmazdı ve ekstre "toplanmıyor" görünürdü.
  const cevrimler = new Map();
  islenecek.forEach((kalem) => {
    const kalemPB = kalem.paraBirimi || fis.kayitParaBirimi || "TRY";
    const istenenPB = fis.kayitParaBirimi || kalemPB;
    const hamTutar = kalem.miktar * (kalem.birimFiyat || 0);
    const cevrilmis = istenenPB === kalemPB ? hamTutar : paraCevirGenel(hamTutar, kalemPB, istenenPB, fis.kurlar || {});

    if (cevrilmis == null) cevrilemeyenler.add(kalemPB);
    // Kur yoksa: fiş yolu kaydı reddeder (eksik borç, fark edilmesi en zor hatadır), sipariş yolu
    // ham tutarla devam eder. `hedefPB` o durumda kalemin kendi para birimine düşer.
    const basarisiz = cevrilmis == null;
    const hedefPB = basarisiz ? kalemPB : istenenPB;
    const tutarHam = basarisiz ? hamTutar : cevrilmis;
    const tutar = fis.tutarYuvarla ? stokYuvarla(tutarHam) : tutarHam;
    const cevrildiMi = hedefPB !== kalemPB;

    // Birim fiyat kayıt para biriminde tutulur ki ekstrede "adet × birim fiyat = tutar" okunabilsin.
    const cevrilmisBirim = cevrildiMi ? paraCevirGenel(kalem.birimFiyat || 0, kalemPB, hedefPB, fis.kurlar || {}) : (kalem.birimFiyat || 0);
    const birimFiyat = fis.birimFiyatBolerek
      ? (kalem.miktar > 0 ? tutar / kalem.miktar : (kalem.birimFiyat || 0))
      : (cevrilmisBirim == null ? 0 : cevrilmisBirim);

    // İKİ KUR birden saklanır, çünkü çevrim tek yönlü değil. Sözleşme her yerde aynı:
    // "1 yabancı = X TRY". USD→TRY çarpma, TRY→USD bölme, USD→EUR ikisi. Tek kur saklayıp ekranda
    // hep "×" yazmak, bölme yapılan durumda YANLIŞ işlem göstermek olurdu.
    cevrimler.set(kalem, {
      kalemPB, hedefPB, cevrildiMi, hamTutar, tutar, birimFiyat,
      kur: cevrildiMi && kalemPB !== "TRY" ? ((fis.kurlar || {})[kalemPB] || null) : null,
      kurHedef: cevrildiMi && hedefPB !== "TRY" ? ((fis.kurlar || {})[hedefPB] || null) : null,
    });
  });

  if (fis.kurZorunlu && cevrilemeyenler.size > 0) {
    return { stok, cariler, cariHareketleri: [], kimlikler, atlananlar, cevrilemeyenler, pesinHareket: null, yazilmadi: true };
  }

  // ---- 2) Stok tarafı -------------------------------------------------------------------------
  // EKSİ STOK KIRPILMAZ: satışta stok eksiye düşebilir. Eksi stok bir görüntü sorunu değil,
  // "girişlerin eksik" bilgisidir; `Math.max(0, …)` o bilgiyi sessizce yok ederdi.
  const alisMi = fis.tip === "Alış";
  const yeniStok = stok.map((p) => {
    const kendi = islenecek.filter((k) => k.urunId === p.id);
    if (kendi.length === 0) return p;
    const yeniHareketler = kendi.map((k) => {
      const h = {
        id: kimlikler.get(k),
        tarih: fis.stokTarihi,
        renk: k.renk, beden: k.beden,
        miktar: alisMi ? k.miktar : -k.miktar,
        kaynak: fis.kaynak,
        cariId: fis.cariId,
      };
      // KALEM DÜZEYİNDE SİPARİŞ (9b, 13 Eylül): bir fiş birden çok siparişi karşılayabilir ("aynı
      // tedarikçinin diğer alış siparişlerinden satır ekle"). Kalemde `siparis` varsa o, yoksa
      // fişin siparişi. Geri alma (`fisGeriAl`) zaten `siparisId|kalemId`yi hareketten okuyor —
      // hangi siparişin `karsilanan`ı düşecekse kendi kimliğini taşıyor.
      const kSip = k.siparis || fis.siparis;
      if (kSip) h.siparisNo = kSip.siparisNo;
      h.fisNo = fis.fisNo;
      if (kSip) {
        h.siparisId = kSip.id;
        h.kalemId = k.kalemId;
        // Bu alış bir satış siparişinin tedariki için açıldıysa o satışın GERÇEK kimliği buraya
        // taşınır — "bu ürün hangi satıştan geldi" tahmin değil, kesin bir zincir olur.
        h.rezervasyonSiparisId = kSip.rezervasyonSiparisId || null;
        h.fazlaGonderim = !!k.fazlaGonderim;
      }
      const ac = fis.stokAciklama && fis.stokAciklama(k);
      if (ac) h.aciklama = ac;
      return h;
    });
    // KARŞILIĞI OLMAYAN HAREKET İÇİN VARYANT AÇILIYOR.
    //
    // Kullanıcı (9 Eylül): "Yine başladı stok tutarsızlığı. Depodan alış fişine tıklayarak giriş
    // yaptım ama sorun bu." Ekranda iki alış fişi (+8 ve +8) duruyor, hareket neti 16, ama kayıtlı
    // stok 0 — "Kayıtlı stok ile hareket geçmişi tutmuyor" uyarısı.
    //
    // SEBEP: eşleşme `renk === v.renk && beden === v.beden` ile aranıyordu ve bulunamazsa hareket
    // yazılıp varyant SESSİZCE atlanıyordu. Yani fiş kesiliyor, ekstre doğru, ama stok hiç
    // artmıyordu. Kalemin rengi boş/`null` geldiğinde (Depo'dan renksiz bir satırla gelinince)
    // tam olarak bu oluyordu.
    //
    // "Fişsiz hareket olmaz" kuralının simetriği burada eksikti: HAREKETSİZ STOK DA OLMAZ.
    // Hareket yazılıyorsa karşılığı stokta görünmek ZORUNDA.
    //
    // Eşleşme normalleştirilerek aranıyor (`null` ile `""` aynı sayılıyor — veri iki biçimi de
    // taşıyor). Yine de bulunamazsa varyant EKLENİYOR: yeni bir renk ilk kez alınıyor olabilir.
    // "Standart" YER TUTUCUSU BOŞLA AYNI SAYILIYOR. Aynı varyant kimi kayıtta `""`, kimi kayıtta
    // "Standart" olarak duruyor; ikisini farklı saymak aynı malzeme için iki satır açardı — ekran
    // görüntüsündeki "Siyah · Standart" ile "· Standart" ikilisi tam olarak bu.
    const nrm = (x) => {
      const d = x == null ? "" : String(x).trim();
      return d === "Standart" ? "" : d;
    };
    const eslesen = (v, x) => nrm(x.renk) === nrm(v.renk) && nrm(x.beden) === nrm(v.beden);
    const kullanilan = new Set();
    // BÜTÜN EŞLEŞENLER TOPLANIR (23 Eylül, v1.423.0): `find` yalnız İLK eşleşen hareketi alıyordu.
    // Aynı renk/beden fişte iki satırda geçince (iki koli, ya da elle iki satır) ikincisi
    // "eşleşmedi" sayılıp YENİ bir varyant satırı açılıyordu: stok kartında "37: 3" ve "37: −3"
    // yan yana (toplam doğru, kayıt bölünmüş). Senaryo iki koliyle yakaladı.
    const guncelVaryantlar = p.variants.map((v) => {
      const eslesenler = yeniHareketler.filter((x) => !kullanilan.has(x) && eslesen(v, x));
      if (!eslesenler.length) return v;
      eslesenler.forEach((x) => kullanilan.add(x));
      return { ...v, miktar: stokYuvarla(v.miktar + eslesenler.reduce((t, x) => t + x.miktar, 0)) };
    });
    // Kartta hiç olmayan renk/beden: AYNI yeni varyanta toplanır (iki satır → tek varyant).
    const yeniVaryantlar = new Map();
    yeniHareketler.forEach((h) => {
      if (kullanilan.has(h)) return;
      const a = `${nrm(h.renk) || "Standart"}|${nrm(h.beden) || "Standart"}`;
      if (yeniVaryantlar.has(a)) { yeniVaryantlar.get(a).miktar = stokYuvarla(yeniVaryantlar.get(a).miktar + h.miktar); return; }
      // BOŞ DEĞİL "Standart" YAZILIYOR. Uygulamada renksiz/ölçüsüz varyant `renk: "Standart",
      // beden: "Standart"` olarak tutuluyor (bkz. 152-stok.jsx ve 077-barkod.jsx) — boş dize
      // DEĞİL. v1.213.0'da buraya `""` yazılmıştı ve stok kartında adsız bir renk satırı
      // belirdi (kullanıcı ekran görüntüsüyle bildirdi, 10 Eylül).
      const yeni = { renk: nrm(h.renk) || "Standart", beden: nrm(h.beden) || "Standart", miktar: stokYuvarla(h.miktar), minStok: 0 };
      yeniVaryantlar.set(a, yeni);
      guncelVaryantlar.push(yeni);
    });
    return {
      ...p,
      variants: guncelVaryantlar,
      hareketler: [...yeniHareketler, ...(p.hareketler || [])].slice(0, HAREKET_GECMIS_SINIRI),
    };
  });

  // ---- 3) Cari tarafı -------------------------------------------------------------------------
  // KALEM KALEM yazılır, hepsi AYNI fiş numarasıyla. Tek toplu hareket yazıldığında ekstrede
  // "2 ürün · Karma · Karma" diye tek satır çıkıyor, hangi maldan kaça alındığı kayboluyordu.
  const cariHareketleri = [];
  islenecek.forEach((k) => {
    const c = cevrimler.get(k);
    const ortak = { tarih: fis.cariTarihi };
    if (fis.zaman) ortak.zaman = fis.zaman;
    // Kimin kestiği kayda giriyor: ana sayfadaki işlem akışı bunu gösteriyor. Yalnızca varsa
    // yazılıyor — eski kayıtlarda alan yok ve `null` yazmak "bilinmiyor"u "boş kullanıcı"ya çevirirdi.
    if (fis.kullanici) ortak.kullanici = fis.kullanici;
    ortak.yon = fis.yon;
    ortak.tutar = c.tutar;
    ortak.paraBirimi = c.hedefPB;
    ortak.odemeSekli = fis.odemeSekli || "Nakit";
    ortak.vade = fis.vade || "";
    const kSip = k.siparis || fis.siparis;
    if (kSip) ortak.siparisNo = kSip.siparisNo;
    ortak.fisNo = fis.fisNo;
    if (kSip) { ortak.siparisId = kSip.id; ortak.kalemId = k.kalemId; }
    ortak.urunAd = k.urunAd; ortak.renk = k.renk; ortak.beden = k.beden;
    ortak.miktar = k.miktar; ortak.birim = k.birim || "";
    ortak.birimFiyat = c.birimFiyat;
    // Ham fiyat ve kur yalnızca çevrim YAPILDIYSA saklanır; yoksa ikisi de gürültü olurdu.
    ortak.hamBirimFiyat = c.cevrildiMi ? (k.birimFiyat || 0) : null;
    ortak.kur = c.kur;
    ortak.kurHedef = c.kurHedef;
    ortak.kalemParaBirimi = c.cevrildiMi ? c.kalemPB : null;
    ortak.aciklama = fis.cariAciklama ? fis.cariAciklama(k, c) : "";

    // Kimlik stok hareketiyle ORTAK — fiş geri alınırken ikisi aynı kimlikten bulunuyor.
    // TEK KAYIT. "Muhasebe" üçüncü bir defter değil, "ikisine de" demek; hangi deftere
    // gireceğine `defterKapsar` karar veriyor. Eskiden Genel+Resmi diye İKİYE bölünüyordu ve
    // bedeli her yere yayılmıştı (silerken ikizi bul, toplarken ikizi sayma, denetimde çiftin
    // kopmadığını kontrol et). Kasa/banka tarafı zaten tek kayıttı; iki taraf artık aynı.
    // `fisNo` yayılan nesnede zaten var; burada TEKRAR yazılması bilinçli. Fişsiz hareket
    // yasağının (12. denetim) hareketin doğduğu satırda görünür olmasını sağlıyor.
    cariHareketleri.push({ ...ortak, fisNo: fis.fisNo, id: kimlikler.get(k), defter: fis.defter || "Genel" });
  });

  // ---- 4) PEŞİN TAHSİLAT / ÖDEME --------------------------------------------------------------
  //
  // Kullanıcı (6 Eylül): "Fiş şu an yalnız borç yazıyor, kasadan para çıkarmıyor."
  //
  // Kararlar (kullanıcı):
  //   • Para YALNIZCA fişte kasa/banka seçilirse hareket eder. Otomatik olsaydı, bugüne kadar
  //     varsayılan "Nakit" ile kesilmiş VADELİ fişler de kasayı boşaltırdı — ödeme şekli alanı
  //     bugün "peşin mi" sorusunu hiç sormuyor.
  //   • Hesap fişte ELLE seçilir.
  //   • KISMİ olabilir: fişin bir kısmı peşin, kalanı açık hesap.
  //
  // ÇEK/SENET DIŞARIDA: o ikisinde kasadan para ÇIKMAZ, para vadesinde hareket eder ve çekler
  // kendi defterinde takip ediliyor. Çağıran zaten seçtirmiyor; burada da yazılmıyor.
  //
  // BAĞ `muhasebeBagId` İLE KURULUYOR — kasa tarafındaki mevcut kalıbın aynısı (205-muhasebe).
  // `fisGeriAl` bu bağı zaten tanıyor ve fiş geri alınınca kasa hareketini de siliyor; yeni bir
  // temizleme yolu yazmaya gerek kalmadı.
  let pesinHareket = null;
  const pesin = fis.pesin;
  if (pesin && (pesin.tutar || 0) > 0 && pesin.hesapId) {
    const bagId = uid("mhbag");
    const alis = fis.tip === "Alış";
    // YÖN FİŞİN TERSİ: alışta borçlanıyoruz, peşin ödersek kasadan ÇIKAR; satışta alacaklıyız,
    // peşin tahsil edersek kasaya GİRER.
    const kasaYonu = alis ? "Çıkış" : "Giriş";
    const cariAciklama = `${alis ? "Ödeme" : "Tahsilat"} (${pesin.hesapAd || "hesap"}) · ${fis.fisNo}`;

    // Cari tarafı: fişin açtığı borcu/alacağı KAPATAN kayıt.
    cariHareketleri.push({
      id: uid("hrk"),
      tarih: fis.cariTarihi,
      zaman: fis.zaman,
      yon: "Tahsilat",
      tutar: pesin.tutar,
      paraBirimi: pesin.paraBirimi || fis.kayitParaBirimi,
      odemeSekli: pesin.hesapTur === "kasa" ? "Nakit" : "Havale/EFT",
      vade: "",
      fisNo: fis.fisNo,
      muhasebeBagId: bagId,
      aciklama: cariAciklama,
      kullanici: fis.kullanici || null,
      defter: fis.defter || "Genel",
      // Karşı taraf: ekstrede "hangi kasaya, ne kadar" görünsün diye alan olarak taşınıyor.
      hesapAd: pesin.hesapAd || null,
      hesapPB: pesin.paraBirimi || fis.kayitParaBirimi,
      hesapTutar: pesin.tutar,
    });

    // Kasa/banka tarafı: ÇAĞIRAN uyguluyor. `fisYaz` stok ve carinin sahibi; muhasebe kaydı
    // onun elinde değil ve buraya almak fonksiyonu üçüncü bir defterin sahibi yapardı.
    pesinHareket = {
      bagId,
      hesapTur: pesin.hesapTur,
      hesapId: pesin.hesapId,
      hareket: {
        id: uid("mhrk"),
        tarih: fis.cariTarihi,
        yon: kasaYonu,
        tutar: pesin.tutar,
        cariId: fis.cariId,
        muhasebeBagId: bagId,
        defter: fis.defter || "Genel",
        aciklama: cariAciklama,
      },
    };
  }

  const yeniCariler = cariHareketleri.length === 0 ? cariler : cariler.map((c) =>
    c.id === fis.cariId ? { ...c, hareketler: [...cariHareketleri, ...(c.hareketler || [])] } : c
  );

  return { stok: yeniStok, cariler: yeniCariler, cariHareketleri, kimlikler, atlananlar, cevrilemeyenler, pesinHareket, yazilmadi: false };
}
