function MuhasebeModule({ kapsam = "genel", tanimlar, stok, giderKartlari, onCekIslem, onCekEkleIsle, onCekHareketiyleSil, cekGorselleri, onCekGorselKaydet, muhasebe, onSave, showToast, cariler, onCarilerGuncelle, onCopaAt, kullaniciYetkisiVar, onayIste, onayliIslem, onOnayliIslemBitti }) {
  const [altSekmeSecimi, setAltSekme] = useState("kasa"); // "kasa" | "banka" | "cek" | "karzarar"
  // KAPSAM (v1.458.0): menüde "Kasa & Banka" ve "Çek & Senet" ayrı öğe; ikisi de bu tek örneği
  // gösteriyor. Çek & Senet'te sekme şeridi yok, hep çek; Kasa & Banka'da Çek sekmesi yok — orada
  // son seçim "cek" kaldıysa Kasa'ya düşülüyor (seçim silinmiyor, çeke dönünce sorun çıkmasın).
  const altSekme = kapsam === "cek" ? "cek" : kapsam === "kasabanka" && altSekmeSecimi === "cek" ? "kasa" : altSekmeSecimi;
  const kasalar = muhasebe.kasalar || [];
  const bankalar = muhasebe.bankalar || [];
  const cekler = muhasebe.cekler || [];
  const kurlar = muhasebe.kurlar || { USD: null, EUR: null, tarih: null };

  // KUR ÇEKME VE ELLE GİRİŞ BURADAN KALDIRILDI (7 Eylül).
  //
  // Burada İKİNCİ ve zayıf bir kopya vardı: doğrudan `tcmb.gov.tr` adresine `fetch` atıyordu ve
  // CORS yüzünden tarayıcıda neredeyse hiç çalışmıyordu. Ana uygulamadaki zincir ise beş kaynaklı
  // (kendi Supabase fonksiyonumuz → aracılar → Harem → Frankfurter → web araması).
  //
  // Aynı işi yapan iki yer, ayrışacak iki yer. Buradaki kopya ayrıca `kurGecmisi`ne HİÇ
  // YAZMIYORDU — bu düğmeyle güncellenen kurun geçmişi kayboluyordu.

  function hesapEkle(tur, veri) {
    const yeni = { id: uid(tur), hareketler: [], ...veri };
    const key = tur === "kasa" ? "kasalar" : "bankalar";
    onSave({ ...muhasebe, [key]: [...muhasebe[key], yeni] });
    showToast(`"${veri.ad}" eklendi`);
  }
  // HESAP BİLGİSİ GÜNCELLEME (19 Eylül): ad, banka, IBAN. Para birimi ve hareketler
  // DEĞİŞMİYOR — hareketler o para biriminde yazıldı, sonradan değiştirmek geçmişi yanlış
  // gösterirdi; düzeltme gerekiyorsa yeni hesap açılıp virman yapılır.
  function hesapGuncelle(tur, id, alanlar) {
    const key = tur === "kasa" ? "kasalar" : "bankalar";
    const temiz = {};
    ["ad", "banka", "iban"].forEach((k) => { if (alanlar[k] != null) temiz[k] = String(alanlar[k]).trim(); });
    if (!temiz.ad) return showToast("Hesap adı boş olamaz");
    onSave({ ...muhasebe, [key]: muhasebe[key].map((h) => (h.id === id ? { ...h, ...temiz } : h)) });
    showToast(`"${temiz.ad}" güncellendi`);
  }

  function hesapPasifDegistir(tur, id, yeniDurum) {
    const key = tur === "kasa" ? "kasalar" : "bankalar";
    const hesap = muhasebe[key].find((h) => h.id === id);
    if (!hesap) return;
    onSave({ ...muhasebe, [key]: muhasebe[key].map((h) => (h.id === id ? { ...h, pasif: yeniDurum } : h)) });
    showToast(
      yeniDurum
        ? `"${hesap.ad}" pasife alındı — bakiyesi ve hareketleri duruyor, yeni işlemlerde seçilemez`
        : `"${hesap.ad}" yeniden aktif`
    );
  }

  function hesapSil(tur, id, onaylandi) {
    const key = tur === "kasa" ? "kasalar" : "bankalar";
    const hesap = muhasebe[key].find((h) => h.id === id);
    if (!hesap) return;

    // HAREKET GÖREN HESAP SİLİNEMEZ — onayla bile.
    // Sebep: hesabı silmek, içindeki tüm giriş/çıkış kayıtlarını da götürür. O hareketlerin bir
    // kısmı cari ekstresinde karşılığı olan işlemlerdir; hesap gidince cari tarafı "yetim" kalır
    // ve iki defter birbirini tutmaz. Kapatılması gereken bir hesap SİLİNMEZ, bakiyesi sıfırlanıp
    // kullanımdan kaldırılır. Bu yüzden burada yönetici onayı seçeneği de sunulmuyor: bu bir
    // yetki meselesi değil, muhasebe bütünlüğü meselesi.
    const hareketSayisi = (hesap.hareketler || []).length;
    if (hareketSayisi > 0) {
      showToast(`"${hesap.ad}" silinemez — ${hareketSayisi} hareket kayıtlı. Hesap geçmişi silinemez; hesabı kullanımdan kaldırmak için bakiyesini sıfırlayıp yeni işlem girmeyin.`);
      return;
    }

    // Yetkisi olmayan kullanıcı: doğrudan silmek yerine yönetici onayına düşer.
    if (!onaylandi && kullaniciYetkisiVar && !kullaniciYetkisiVar("muhasebe", "silme")) {
      onayIste("muhasebe", "Sil", `"${hesap.ad}" ${tur === "kasa" ? "kasasını" : "banka hesabını"} sil`, "muhasebeHesapSil", { tur, id });
      return;
    }
    // Hesap silinince İÇİNDEKİ TÜM HAREKETLER de gider. Kopya, hareketleriyle birlikte alınır —
    // aksi halde bir kasanın tüm geçmişi tek tıkla, hiç iz bırakmadan kaybolurdu.
    if (onCopaAt) {
      onCopaAt(tur === "kasa" ? "kasa" : "banka", hesap.ad, hesap, {
        ozet: `hareketsiz · bakiye ${hesapBakiyesi(hesap).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${PARA_SEMBOLU[hesap.paraBirimi || "TRY"] || ""}`,
        yanEtkiliMi: false,
        geriAlinabilirMi: false,
      });
    }
    onSave({ ...muhasebe, [key]: muhasebe[key].filter((h) => h.id !== id) });
    showToast("Hesap silindi — Tanımlar > Çöp Kutusu'nda kaydı duruyor");
  }


  async function hareketEkle(tur, hesapId, hareket) {
    const key = tur === "kasa" ? "kasalar" : "bankalar";
    const hesap = muhasebe[key].find((h) => h.id === hesapId);

    // Kasa/banka bakiyesi HER ZAMAN kendi para biriminde, ÇEVRİMSİZ değişir — "Tutar" alanı zaten
    // hesabın kendi para biriminde girildiği için burada hiçbir dönüşüm yapılmaz. Cariye işlenecek
    // tutar/para birimi ise (varsa) formda AYRICA hesaplanıp hareket.cariTutar / hareket.cariPB olarak
    // BURAYA hazır gelir — burada TEKRAR bir çevrim/otomatik cari.paraBirimi eşlemesi YAPILMAZ, çünkü
    // hangi para birimine ve hangi kurla çevrileceği artık formda açıkça (Dönüştürülecek P.Birimi + Kur
    // alanlarıyla) kullanıcı tarafından belirleniyor.
    const bagId = uid("mhbag");
    const yeniHareket = { id: uid("mhrk"), tarih: bugunYerel(), muhasebeBagId: bagId, kullanici: islemKullanicisiAd(), ...hareket };
    // İki ayrı kayıt (kasa/banka + varsa cari) art arda AYNI ANDA tetiklenirse, arka plandaki depolama
    // çağrıları çakışıp birinin "kaydedilemedi" hatası vermesine yol açabiliyordu — bu yüzden burada
    // kasa/banka kaydının bitmesini (await) BEKLEYİP, cari kaydını ANCAK ONDAN SONRA başlatıyoruz.
    await onSave({
      ...muhasebe,
      [key]: muhasebe[key].map((h) => (h.id === hesapId ? { ...h, hareketler: [yeniHareket, ...(h.hareketler || [])] } : h)),
    });
    if (hareket.cariId && onCarilerGuncelle) {
      const hesapAdi = hesap ? hesap.ad : (tur === "kasa" ? "Kasa" : "Banka");
      // TEK ÇEKİRDEK (17 Eylül): cari hareketi artık burada elle kurulmuyor; iki ekran da
      // `kasaCariHareketiKur`u çağırıyor (207-kasa-cari-ortak). Yön, açıklama, karşı taraf
      // alanları ve bağ kimliği tek yerden geliyor — ayrışma imkânsız.
      const { cariHareketi } = kasaCariHareketiKur({
        islemTipi: kasaIslemTipi(yeniHareket.yon),
        tarih: yeniHareket.tarih,
        cariId: hareket.cariId,
        cariTutar: hareket.cariTutar,
        cariPB: hareket.cariPB,
        hesapTur: tur, hesapId, hesapAd: hesapAdi,
        hesapPB: hesap ? (hesap.paraBirimi || "TRY") : null,
        hesapTutar: yeniHareket.tutar,
        defter: yeniHareket.defter,
        aciklama: yeniHareket.aciklama,
        fisNo: fisNoSiradaki(fisOnEki(kasaIslemTipi(yeniHareket.yon)), tumFisNumaralari(cariler)),
      });
      // Kasa/banka kaydı YUKARIDA zaten yazıldı; buradan yalnız cari tarafı gidiyor. Bağ kimliği
      // ikisini birbirine bağlayan alan, o yüzden kasa kaydındaki `bagId` korunuyor.
      const ortak = { ...cariHareketi, muhasebeBagId: bagId };
      // TEK KAYIT: "Muhasebe (ikisine de)" üçüncü bir defter değil; hangi deftere gireceğine
      // `defterKapsar` karar veriyor. Cari listesi tümüyle yazılıyor (kasa silmede olduğu gibi).
      onCarilerGuncelle(cariler.map((c) => (c.id === hareket.cariId
        ? { ...c, hareketler: [ortak, ...(c.hareketler || [])] }
        : c)));
    }
  }
  // VİRMAN (17 Eylül): kasalar/bankalar arası aktarım. Kaynaktan ÇIKIŞ, hedefe GİRİŞ; aynı bağ
  // kimliğiyle. Cari YOK — para şirket içinde yer değiştiriyor, kimseye borç doğmuyor.
  // Para birimi farklıysa hedefe geçen tutar ayrıca soruluyor: kur burada tahmin edilmiyor,
  // gerçekte kaç para geçtiğini kullanıcı bilir (döviz bozdurmada makas vardır).
  async function virmanYap({ kaynak, hedef, aciklama, sebep }) {
    const bagId = uid("mhbag");
    const zaman = bugunYerel();
    const fisNo = fisNoUret("VRM");
    // Sebep ALAN olarak taşınıyor (yalnız açıklama metninde değil): raporda "döviz bozdurmalar"
    // diye süzmek için metin ayrıştırmak kırılgan olurdu.
    const ortak = { tarih: zaman, muhasebeBagId: bagId, fisNo, virmanMi: true, virmanSebebi: sebep || null,
      kullanici: islemKullanicisiAd(), defter: "Genel" };
    const sebepMetni = sebep ? ` · ${sebep}` : "";
    const cikis = {
      ...ortak, id: uid("mhrk"), yon: "Çıkış", tutar: kaynak.tutar,
      aciklama: `Virman → ${hedef.ad}${sebepMetni}${aciklama ? ` · ${aciklama}` : ""}`,
    };
    const giris = {
      ...ortak, id: uid("mhrk"), yon: "Giriş", tutar: hedef.tutar,
      aciklama: `Virman ← ${kaynak.ad}${sebepMetni}${aciklama ? ` · ${aciklama}` : ""}`,
    };
    const kaynakKey = kaynak.tur === "kasa" ? "kasalar" : "bankalar";
    const hedefKey = hedef.tur === "kasa" ? "kasalar" : "bankalar";
    // TEK YAZMA: iki hesap aynı `muhasebe` nesnesinde; ayrı ayrı yazmak yarım kalma riski demekti.
    const sonraki = { ...muhasebe };
    sonraki[kaynakKey] = (muhasebe[kaynakKey] || []).map((x) => (x.id === kaynak.id
      ? { ...x, hareketler: [cikis, ...(x.hareketler || [])] } : x));
    sonraki[hedefKey] = (sonraki[hedefKey] || []).map((x) => (x.id === hedef.id
      ? { ...x, hareketler: [giris, ...(x.hareketler || [])] } : x));
    await onSave(sonraki);
    showToast(`Virman: ${kaynak.ad} → ${hedef.ad} · ${fisNo}`);
  }

  // HAREKET GÜNCELLEME (17 Eylül): tutar/tarih/açıklama düzeltmesi. Cariye bağlı hareketlerde
  // KARŞI TARAF da aynı bağ (`muhasebeBagId`) üzerinden güncelleniyor — yalnız kasayı düzeltmek
  // iki defteri ayrıştırırdı ve bugüne kadarki hataların hepsi tam olarak bu ayrışmadan çıktı.
  //
  // Para birimi ve yön DEĞİŞTİRİLMİYOR: yön işlemin cinsini (tahsilat/ödeme) belirliyor, onu
  // değiştirmek başka bir işlem demek — o zaman silinip yeniden girilmeli.
  async function hareketGuncelle(tur, hesapId, hareketId, yeni) {
    const key = tur === "kasa" ? "kasalar" : "bankalar";
    const hesap = (muhasebe[key] || []).find((h) => h.id === hesapId);
    const eski = hesap && (hesap.hareketler || []).find((h) => h.id === hareketId);
    if (!eski) return;
    const guncel = { ...eski, tutar: yeni.tutar, tarih: yeni.tarih || eski.tarih, aciklama: yeni.aciklama };
    await onSave({
      ...muhasebe,
      [key]: (muhasebe[key] || []).map((h) => (h.id === hesapId
        ? { ...h, hareketler: (h.hareketler || []).map((x) => (x.id === hareketId ? guncel : x)) } : h)),
    });
    if (eski.muhasebeBagId && onCarilerGuncelle) {
      // Cari tarafındaki tutar hesabın tutarıyla AYNI değil olabilir (kur çevrimi): oran korunuyor.
      const oran = eski.tutar ? yeni.tutar / eski.tutar : 1;
      onCarilerGuncelle((cariler || []).map((c) => ({
        ...c,
        hareketler: (c.hareketler || []).map((h) => (h.muhasebeBagId === eski.muhasebeBagId
          ? {
            ...h,
            tutar: Math.round((h.tutar || 0) * oran * 100) / 100,
            tarih: yeni.tarih || h.tarih,
            hesapTutar: yeni.tutar,
            aciklama: yeni.aciklama || h.aciklama,
          }
          : h)),
      })));
      showToast("Hareket ve cari karşılığı güncellendi");
    } else {
      showToast("Hareket güncellendi");
    }
  }

  async function hareketSil(tur, hesapId, hareketId, onaylandi) {
    const key = tur === "kasa" ? "kasalar" : "bankalar";
    const hesap = muhasebe[key].find((h) => h.id === hesapId);
    const silinecekHareket = hesap ? (hesap.hareketler || []).find((h) => h.id === hareketId) : null;

    // Kasa/banka hareketi silmek para kaydını değiştirir; yetkisi olmayan kullanıcı doğrudan
    // yapamaz, isteği yöneticinin onayına düşer. Yönetici rolü kullaniciYetkisiVar içinde zaten
    // tüm kontrolleri geçtiği için ayrıca "admin mi" diye bakmaya gerek yok.
    if (!onaylandi && kullaniciYetkisiVar && !kullaniciYetkisiVar("muhasebe", "silme")) {
      const ozet = silinecekHareket
        ? `${silinecekHareket.yon || ""} ${silinecekHareket.tutar || 0}${silinecekHareket.aciklama ? " — " + silinecekHareket.aciklama : ""}`
        : "hareket";
      onayIste("muhasebe", "Sil", `"${hesap ? hesap.ad : tur}" hesabından ${ozet} kaydını sil`, "muhasebeHareketSil", { tur, hesapId, hareketId });
      return;
    }
    if (silinecekHareket && onCopaAt) {
      onCopaAt(tur === "kasa" ? "kasaHareketi" : "bankaHareketi", hesap.ad, silinecekHareket, {
        ozet: `${silinecekHareket.yon || ""} ${silinecekHareket.tutar || 0} ${PARA_SEMBOLU[hesap.paraBirimi || "TRY"] || ""}${silinecekHareket.aciklama ? " — " + silinecekHareket.aciklama : ""}${silinecekHareket.tarih ? " · " + silinecekHareket.tarih : ""}`,
        ustKayit: { tur: tur === "kasa" ? "kasa" : "banka", id: hesap.id, ad: hesap.ad },
        // Cariye bağlı hareketler karşı tarafta da siliniyor — geri yükleme iki tarafı birden
        // düzeltmeyi gerektirir, bu yüzden otomatik geri yükleme sunulmuyor.
        yanEtkiliMi: !!silinecekHareket.muhasebeBagId,
        geriAlinabilirMi: false,
      });
    }
    // ÇEK TAHSİLİ GERİ ALINIR. Silinen hareket bir çekin tahsil kaydıysa çek bir önceki durumuna
    // (Tahsilde/Portföyde) döner ve geçmişe "Tahsil geri alındı" eklenir. Değişmez kural: tahsil
    // kasa/banka hareketi doğurduğuna göre o hareketin silinmesi de aşamayı geri almalı — yoksa
    // parası hesapta olmayan bir çek "Tahsil Edildi" görünürdü.
    // Kural `cekIslemGeriAl`de, cari tarafındaki ciro/iade geri almasıyla AYNI fonksiyon.
    const geriAlinanCekler = [];
    const yeniCekler = (muhasebe.cekler || []).map((c) => {
      const geriAlinmis = cekIslemGeriAl(c, new Set([hareketId]));
      if (!geriAlinmis) return c;
      geriAlinanCekler.push(geriAlinmis);
      return geriAlinmis;
    });
    // VİRMAN TEK İŞLEM (kullanıcı, 17 Eylül: "virmanda 2 fiş oluşuyor sanırım, birini silince
    // diğeri girmiyor; tek fiş oluştursa daha sağlıklı olmaz mı?").
    //
    // Virman doğası gereği iki HAREKET (birinden çıkış, diğerine giriş) ama TEK İŞLEM: ikisi aynı
    // `muhasebeBagId`yi ve aynı `VRM-…` fiş numarasını taşıyor — yani "iki fiş" görünen şey tek
    // fişin iki ayağı. Biri silinip diğeri kalınca para havada kalıyordu: kaynak kasa eksilmiş,
    // hedef kasa şişmiş. Artık bağın İKİ AYAĞI BİRLİKTE siliniyor, hangi satırdan silinirse silinsin.
    const virmanBagi = silinecekHareket && silinecekHareket.virmanMi ? silinecekHareket.muhasebeBagId : null;
    const hareketleriSuz = (liste) => (liste || []).filter((x) => (virmanBagi
      ? x.muhasebeBagId !== virmanBagi
      : x.id !== hareketId));
    await onSave({
      ...muhasebe,
      // Virmanda karşı ayak ÖTEKİ hesapta olduğu için iki liste de süzülüyor.
      kasalar: (muhasebe.kasalar || []).map((h) => ((virmanBagi || h.id === hesapId)
        ? { ...h, hareketler: hareketleriSuz(h.hareketler) } : h)),
      bankalar: (muhasebe.bankalar || []).map((h) => ((virmanBagi || h.id === hesapId)
        ? { ...h, hareketler: hareketleriSuz(h.hareketler) } : h)),
      ...(geriAlinanCekler.length > 0 ? { cekler: yeniCekler } : {}),
    });
    if (virmanBagi) showToast("Virmanın iki ayağı birlikte silindi");
    geriAlinanCekler.forEach((c) => {
      gunlukYaz(`Çek işlemi geri alındı: ${c.cekNo || "no yok"}`, "muhasebe", { cekId: c.id, durum: c.durum });
      showToast(`Tahsil geri alındı — ${c.cekNo || "çek"} yeniden "${c.durum}"`);
    });
    if (!silinecekHareket || !onCarilerGuncelle) return;
    // Bu hareket bir cariye bağlıysa (muhasebeBagId ile), cari tarafındaki karşılığını da bulup sil —
    // aksi halde kasadan silinen bir işlem, cari ekstresinde "yetim" olarak kalır.
    if (silinecekHareket.muhasebeBagId) {
      onCarilerGuncelle(
        cariler.map((c) => ({
          ...c,
          hareketler: (c.hareketler || []).filter((h) => h.muhasebeBagId !== silinecekHareket.muhasebeBagId),
        }))
      );
      return;
    }
    // Geriye dönük uyumluluk: muhasebeBagId TAŞIMAYAN eski kayıtlar için (bu bağlantı özelliği
    // eklenmeden ÖNCE oluşturulmuş hareketler), cariId + tutar + tarih + hesap adını içeren açıklama
    // eşleşmesiyle karşılığını bulmaya çalışırız — ama SADECE TEK bir eşleşme varsa siler; birden
    // fazla aday varsa (belirsizlik durumunda) hiçbirine dokunmaz, yanlış bir kaydı silme riskini almaz.
    if (silinecekHareket.cariId) {
      const hesapAdi = hesap ? hesap.ad : "";
      const cari = cariler.find((c) => c.id === silinecekHareket.cariId);
      if (cari) {
        const adaylar = (cari.hareketler || []).filter((h) =>
          !h.muhasebeBagId && h.tutar === silinecekHareket.tutar && h.tarih === silinecekHareket.tarih
          && h.aciklama && hesapAdi && h.aciklama.includes(hesapAdi)
          && (h.aciklama.startsWith("Tahsilat (") || h.aciklama.startsWith("Ödeme ("))
        );
        if (adaylar.length === 1) {
          // Eski veride ikiz kalmış olabilir; `esId` varsa o da siliniyor. Yeni kayıtlarda
          // ikiz yok, küme tek elemanlı kalıyor.
          const esIdSet = new Set([adaylar[0].id, adaylar[0].esId].filter(Boolean));
          onCarilerGuncelle(
            cariler.map((c) =>
              c.id === silinecekHareket.cariId
                ? { ...c, hareketler: (c.hareketler || []).filter((h) => !esIdSet.has(h.id)) }
                : c
            )
          );
        } else if (adaylar.length > 1) {
          showToast("⚠ Bu eski hareketin cari karşılığı otomatik bulunamadı (birden fazla aday var) — cari kartından elle silmeniz gerekebilir");
        }
      }
    }
  }
  // TEK KAPI: çek kaydı ve cari hareketi birlikte, uygulamanın `cekEkleVeIsle`sinde. Burada
  // ikinci bir yazma yolu bırakmak, birinin cariye işleyip diğerinin işlememesi demekti.
  function cekEkle(veri) {
    onCekEkleIsle(veri);
  }
  // DURUM ARTIK ELLE SEÇİLMİYOR — işlemler penceresinden geçiyor (bkz. `cekIslemYap`). Serbest
  // durum değiştirme, "ciro edildi" yazıp karşı tarafta hiçbir kayıt doğurmamak demekti.
  // Fonksiyon duruyor: onay akışı (bekleyen muhasebe isteği) hâlâ çağırıyor.

  // Yönetici bekleyen bir muhasebe silme isteğini onayladığında, işlem BURADA uygulanır — yani
  // kullanıcının doğrudan yaptığıyla birebir aynı fonksiyonlar üzerinden. İşlem mantığını onay
  // tarafında ikinci kez yazsaydık, iki kopya zamanla birbirinden ayrılır ve onaylı silme ile
  // normal silme farklı davranmaya başlardı.
  useEffect(() => {
    if (!onayliIslem) return;
    const i = onayliIslem;
    if (i.tip === "muhasebeHareketSil") hareketSil(i.tur, i.hesapId, i.hareketId, true);
    else if (i.tip === "muhasebeHesapSil") hesapSil(i.tur, i.id, true);
    else if (i.tip === "muhasebeCekSil") cekSil(i.id, true);
    onOnayliIslemBitti && onOnayliIslemBitti();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onayliIslem]);

  function cekSil(id, onaylandi) {
    const cek = cekler.find((c) => c.id === id);
    // AŞAMA GEÇMİŞİ OLAN ÇEK SİLİNMEZ (kullanıcı, 6 Eylül: "ciro edilen çek silinememeli, aşama
    // aşama ilerlediği için"). Portföyden çıkmış çek karşı tarafta kayıt doğurmuştur; silmek
    // onları yetim bırakır. Kontrol YETKİDEN ÖNCE: yönetici olmak da bu kaydı silmeye yetmez,
    // çünkü sorun izin değil TUTARLILIK.
    const silinebilir = cekSilinebilirMi(cek);
    if (cek && !silinebilir.olur) {
      showToast(silinebilir.sebep);
      return;
    }
    if (!onaylandi && cek && kullaniciYetkisiVar && !kullaniciYetkisiVar("muhasebe", "silme")) {
      onayIste("muhasebe", "Sil", `"${cek.cekNo || "Çek"}" çekini sil (${cek.tutar || 0})`, "muhasebeCekSil", { id });
      return;
    }
    // BAĞLI GİRİŞ HAREKETİ de gider — kapı uygulamada (`cekHareketiyleSil`). Çek tek başına
    // silinseydi, onu doğuran tahsilat/ödeme ekstrede yetim kalıp bakiyeyi bozardı.
    if (cek && cek.hareketId && onCekHareketiyleSil && onCekHareketiyleSil(cek.id)) return;
    if (cek && onCopaAt) {
      onCopaAt("cek", `${cek.cekNo || "Çek"} · ${cek.kesideci || ""}`.trim(), cek, {
        ozet: `${cek.tutar || 0} ${PARA_SEMBOLU[cek.paraBirimi || "TRY"] || ""} · vade ${cek.vadeTarihi || "—"} · ${cek.durum || ""}`,
        yanEtkiliMi: false,
        geriAlinabilirMi: false,
      });
    }
    onSave({ ...muhasebe, cekler: cekler.filter((c) => c.id !== id) });
    showToast("Çek silindi — Tanımlar > Çöp Kutusu'nda kaydı duruyor");
  }

  // Genel TL karşılığı: Kasa + Banka + Portföydeki çeklerin, güncel kur üzerinden TOPLAM TL değeri.
  // Kur bilinmeyen bir para birimi varsa (henüz güncellenmediyse), o kısım toplama KATILMAZ ve
  // kullanıcıya ayrıca bildirilir — sessizce yanlış/eksik bir toplam gösterilmez.
  function tlKarsiligiHesapla() {
    let toplam = 0;
    let eksikPB = new Set();
    function ekle(pb, tutar) {
      if (pb === "TRY") { toplam += tutar; return; }
      const kur = kurlar[pb];
      if (!kur) { eksikPB.add(pb); return; }
      toplam += tutar * kur;
    }
    [...kasalar, ...bankalar].forEach((h) => ekle(h.paraBirimi || "TRY", hesapBakiyesi(h)));
    cekler.filter((c) => c.durum === "Portföyde").forEach((c) => ekle(c.paraBirimi || "TRY", c.tutar * (c.tip === "Alınan" ? 1 : -1)));
    return { toplam, eksikPB: Array.from(eksikPB) };
  }
  const tlKarsiligi = tlKarsiligiHesapla();

  return (
    <div>
      {/* GENEL TL KARŞILIĞI — kur kutuları ve "TCMB'den Kur Çek" düğmesi BURADAN KALDIRILDI
          (kullanıcı, 7 Eylül: "en üstte kur var, buna gerek yok daha").
          Kur artık üst şeritte: değerler orada, elle giriş (kalem) orada, yenileme orada.
          İki yerde birden kur girmek ayrıca riskli — hangisinin en son yazıldığı belli olmaz.
          Toplam KALIYOR: o bir muhasebe bilgisi, kur değil. */}
      <div style={{ background: "#F0F5EE", border: "1px solid #8FA888", borderRadius: "var(--erp-r-md)", padding: "10px 12px", marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: "var(--erp-text)" }}>Genel TL Karşılığı (Kasa + Banka + Portföydeki Çekler): </span>
        <span className="mono" style={{ fontWeight: 700, fontSize: 16, color: "var(--erp-primary)" }}>
          {tlKarsiligi.toplam.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺
        </span>
        {tlKarsiligi.eksikPB.length > 0 && (
          <span style={{ fontSize: 11, color: "var(--erp-warn)", marginLeft: 8 }}>
            ⚠ {tlKarsiligi.eksikPB.join(", ")} kuru bilinmiyor — sağ üstteki rozetten girebilirsiniz
          </span>
        )}
      </div>

      {kapsam !== "cek" && (
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { key: "kasa", label: "Kasa", icon: <Wallet size={14} /> },
          { key: "banka", label: "Banka", icon: <Landmark size={14} /> },
          kapsam !== "kasabanka" && { key: "cek", label: "Çek", icon: <Receipt size={14} /> },
          // KÂR / ZARAR (18 Eylül): gelir-gider kartlarının meyvesi. Kasa/banka/çek "para nerede"
          // sorusunu cevaplıyor; bu sekme "kazanıyor muyuz" sorusunu.
          { key: "karzarar", label: "Kâr / Zarar", icon: <FileText size={14} /> },
        ].filter(Boolean).map((s) => (
          <button
            key={s.key}
            onClick={() => setAltSekme(s.key)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: "var(--erp-r-pill)",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              border: `1.5px solid ${altSekme === s.key ? MUHASEBE_RENK : "var(--erp-border)"}`,
              background: altSekme === s.key ? alfaEkle(MUHASEBE_RENK, "1A") : "#fff",
              color: altSekme === s.key ? MUHASEBE_RENK : "var(--erp-text-2)",
            }}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>
      )}

      {altSekme === "kasa" && (
        <HesapListesi
          hesaplar={kasalar}
          birimAdi="Kasa" ekleAlanlari={[{ key: "ad", label: "Kasa Adı", placeholder: "örn. Ana Kasa" }]}
          onHesapEkle={(v) => hesapEkle("kasa", v)}
          onHesapGuncelle={(id, v) => hesapGuncelle("kasa", id, v)}
          onHesapSil={(id) => hesapSil("kasa", id)}
          onHesapPasifDegistir={(id, d) => hesapPasifDegistir("kasa", id, d)}
          silmeYetkisiVar={!kullaniciYetkisiVar || kullaniciYetkisiVar("muhasebe", "silme")}
          tumHesaplar={[
            ...(muhasebe.kasalar || []).map((k) => ({ ...k, tur: "kasa" })),
            ...(muhasebe.bankalar || []).map((b2) => ({ ...b2, tur: "banka" })),
          ]}
          onVirman={virmanYap}
          giderKartlari={giderKartlari}
          onHareketGuncelle={(hid, hrid, y) => hareketGuncelle("kasa", hid, hrid, y)}
          onHareketEkle={(hid, h) => hareketEkle("kasa", hid, h)}
          onHareketSil={(hid, hrid) => hareketSil("kasa", hid, hrid)}
          cariler={cariler}
          kurlar={muhasebe.kurlar || {}}
          showToast={showToast}
        />
      )}
      {altSekme === "banka" && (
        <HesapListesi
          hesaplar={bankalar}
          birimAdi="Banka Hesabı"
          ekleAlanlari={[
            { key: "ad", label: "Hesap Adı", placeholder: "örn. Ziraat Vadesiz" },
            { key: "banka", label: "Banka", placeholder: "örn. Ziraat Bankası" },
            { key: "iban", label: "IBAN", placeholder: "TR.." },
          ]}
          onHesapEkle={(v) => hesapEkle("banka", v)}
          onHesapGuncelle={(id, v) => hesapGuncelle("banka", id, v)}
          onHesapSil={(id) => hesapSil("banka", id)}
          onHesapPasifDegistir={(id, d) => hesapPasifDegistir("banka", id, d)}
          silmeYetkisiVar={!kullaniciYetkisiVar || kullaniciYetkisiVar("muhasebe", "silme")}
          tumHesaplar={[
            ...(muhasebe.kasalar || []).map((k) => ({ ...k, tur: "kasa" })),
            ...(muhasebe.bankalar || []).map((b2) => ({ ...b2, tur: "banka" })),
          ]}
          onVirman={virmanYap}
          giderKartlari={giderKartlari}
          onHareketGuncelle={(hid, hrid, y) => hareketGuncelle("banka", hid, hrid, y)}
          onHareketEkle={(hid, h) => hareketEkle("banka", hid, h)}
          onHareketSil={(hid, hrid) => hareketSil("banka", hid, hrid)}
          cariler={cariler}
          kurlar={muhasebe.kurlar || {}}
          showToast={showToast}
        />
      )}
      {altSekme === "karzarar" && (
        <KarZararPaneli stok={stok} cariler={cariler} muhasebe={muhasebe} giderKartlari={giderKartlari} tanimlar={tanimlar} />
      )}

      {altSekme === "cek" && (
        <CekListesi cekler={cekler} cariler={cariler} kurlar={kurlar} onEkle={cekEkle} onSil={cekSil} onIslem={onCekIslem} bankalar={bankalar} kasalar={kasalar} gorseller={cekGorselleri} onGorselKaydet={onCekGorselKaydet} />
      )}
    </div>
  );
}

