// ================= ÜRETİM SİLME =================
//
// 19 Eylül (2. madde, 13. tur): bir üretim siparişinin silinmesi ve ona bağlı her şeyin geri
// alınması (190 satır).
//
// NEDEN BU KADAR İŞ: üretim açıldığı andan itibaren dört yere dokunmuş oluyor — hammadde
// stoktan çıkmış, işçilik cariye yazılmış, mamul (tamamlandıysa) stoğa girmiş, satış siparişinin
// planlaması dolmuş. Silmek, bunların HEPSİNİ geri sarmak demek. Biri atlanırsa sistemde
// açıklanamayan bir fark kalır ve o fark haftalar sonra "stok neden tutmuyor" diye geri gelir.
//
// FİŞ AİLESİ BİRLİKTE SİLİNİR: `10015-Kesim`, `10015-Kesim-İşçilik`, `10015-Giriş`, `10015-İade`
// aynı işin parçaları; birini bırakmak, yarım bir belge zinciri bırakmaktı.
function useUretimSil(d) {
  const {
    uretim, siparisler, stok, cariler, showToast, adimlariYurut,
    setUretim, setSiparisler, setStok, setCariler, copaAt,
    stokRezervasyonlari, setStokRezervasyonlari, aktifKullanici,
  } = d;

const uretimSil = useCallback(async (uretimId, cascade) => {
  const siparis = uretim.find((o) => o.id === uretimId);
  if (!siparis) return;
  // Kaydın kopyası, HERHANGİ bir değişiklik yapılmadan ÖNCE alınır — aşağıdaki adımlar hem
  // üretimi hem bağlı stok/cari hareketlerini değiştiriyor, sonradan kopyalasak eksik olurdu.
  copaAt("uretim", `Üretim ${siparis.siparisNo}`, siparis, {
    ozet: `${siparis.urunAd || ""}${siparis.renk ? " · " + siparis.renk : ""} — ${(siparis.bedenMiktarlari || []).reduce((s, bm) => s + (bm.miktar || 0), 0)} adet`,
    yanEtkiliMi: true,
  });

  let etkilendiMi = false;
  const nextSiparisler = siparisler.map((s) => {
    if (s.tip !== "Satış") return s;
    const etkilenen = s.kalemler.some((k) => k.planlama && k.planlama.referansNo === siparis.siparisNo);
    if (!etkilenen) return s;
    etkilendiMi = true;
    return {
      ...s,
      kalemler: bekleyenKalemleriBirlestir(s.kalemler.map((k) =>
        k.planlama && k.planlama.referansNo === siparis.siparisNo ? { ...k, planlama: null } : k
      )),
    };
  });

  // TEMİZLİK KARARI TAHMİNLE VERİLMEZ.
  //
  // Çağıran taraf `cascade`i `prosesIlerleme` bayraklarına bakarak belirliyordu: "hiçbir adım
  // tamamlanmamış görünüyorsa yan etkisi de yoktur" varsayımı. Bu bir ÇIKARIM ve yanılabiliyor —
  // adım geri alınmış, atama bölünmüş ya da bayrağı kurmayan bir yoldan hareket yazılmışsa
  // bayraklar temiz görünür, hareketler ise yerinde durur. Sonuç: üretim silinir, hammadde
  // çıkış hareketleri öksüz kalır ve Fişler sekmesinde "kaynak bağlantısı bulunamadı" der.
  //
  // Doğru kaynak bayrak değil, HAREKETİN KENDİSİDİR. Bu üretimin kimliğini taşıyan tek bir
  // hareket bile varsa temizlik çalışır — çağıran ne derse desin. Öksüz hareket bırakmak
  // hiçbir koşulda doğru sonuç değil.
  const gercekEtkiVar =
    stok.some((p) => (p.hareketler || []).some((h) => h.kaynak === "Üretim" && h.uretimId === uretimId)) ||
    cariler.some((c) => (c.hareketler || []).some((h) => h.uretimId === uretimId));

  if (cascade || gercekEtkiVar) {
    // Bu üretime ait fiş numaraları: gerçek proseslerde HER TAMAMLANMIŞ ATAMA için
    // "{siparisNo}-{prosesAdi}" (o prosestte tek atama varsa) ya da "{siparisNo}-{prosesAdi}-{sıraNo}"
    // (birden fazla atama varsa — sıraNo, atamanın o prosesteki kaçıncı atama olduğu, 1'den başlar),
    // ara proseslerde (tek parça tamamlanır) "{siparisNo}-{prosesAdi}". BU FORMÜL,
    // uretimProsesAtamaTeslimAl'daki gerçek fisNo üretimiyle BİREBİR AYNI olmalıdır. Ancak fişNo
    // formülü tek başına KIRILGAN olabileceği için (ileride bir yerde değişirse eşleşme bozulabilir),
    // BİRİNCİL eşleşme kriteri olarak stok hareketlerinde zaten var olan SAĞLAM `uretimId` alanı da
    // kullanılır — fişNo eşleşmesi SADECE uretimId taşımayan (ya da cari tarafındaki) eski/farklı
    // kayıtlar için ek bir ağ görevi görür.
    const fisNolar = new Set();
    (siparis.prosesIlerleme || []).forEach((p) => {
      if (p.araProsesMi) {
        if (p.tamamlandiMi) fisNolar.add(`${siparis.siparisNo}-${p.proses}`);
      } else {
        const tumAtamalar = p.atamalar || [];
        tumAtamalar.filter((a) => a.tamamlandiMi).forEach((a) => {
          fisNolar.add(`${siparis.siparisNo}-${p.proses}${uretimAtamaEki(siparis, tumAtamalar, a)}`);
        });
      }
    });
    const mamulFisNo = siparis.stogaEklendiMi ? siparis.siparisNo : null;

    function buUretimeAitStokHareketiMi(h) {
      if (h.kaynak !== "Üretim") return false;
      if (h.uretimId === uretimId) return true;
      if (h.uretimId) return false; // BAŞKA bir üretime ait olduğu KESİN biliniyor, karıştırma.
      // uretimId taşımayan eski kayıtlar için fişNo'ya düş.
      return fisNolar.has(h.fisNo) || h.fisNo === mamulFisNo;
    }
    function buUretimeAitCariHareketiMi(h) {
      if (h.uretimId === uretimId) return true;
      if (h.uretimId) return false;
      // İşçilik fişleri "-İşçilik" ekiyle ayrıldı. Birincil eşleşme `uretimId` olduğu için
      // bağ kopmuyor; ama uretimId taşımayan ESKİ kayıtlar için fişNo yedeği duruyor ve
      // onun da yeni biçimi tanıması gerekiyor — yoksa silinen üretimin işçilik hareketi
      // öksüz kalırdı.
      if (h.siparisNo !== siparis.siparisNo) return false;
      if (fisNolar.has(h.fisNo)) return true;
      const ek = "-İşçilik";
      return typeof h.fisNo === "string" && h.fisNo.endsWith(ek)
        && fisNolar.has(h.fisNo.slice(0, -ek.length));
    }
    let silinenStokSayisi = 0;
    let silinenCariSayisi = 0;

    const nextStok = stok.map((p) => {
      let variants = p.variants;
      let degisti = false;
      const kalanHareketler = (p.hareketler || []).filter((h) => {
        if (!buUretimeAitStokHareketiMi(h)) return true;
        variants = variants.map((v) => (v.renk === h.renk && v.beden === h.beden ? { ...v, miktar: stokYuvarla(v.miktar - h.miktar) } : v));
        degisti = true;
        silinenStokSayisi++;
        return false;
      });
      if (!degisti) return p;
      return { ...p, variants, hareketler: kalanHareketler };
    });

    const nextCariler = cariler.map((c) => {
      const kalanHareketler = (c.hareketler || []).filter((h) => {
        const aitMi = buUretimeAitCariHareketiMi(h);
        if (aitMi) silinenCariSayisi++;
        return !aitMi;
      });
      if (kalanHareketler.length === (c.hareketler || []).length) return c;
      return { ...c, hareketler: kalanHareketler };
    });

    // DÜRÜSTLÜK NOTU: burada "silme sonrası tekrar kontrol et" tarzı bir doğrulama YAPMIYORUZ —
    // çünkü aynı eşleştirme fonksiyonunu (buUretimeAitStokHareketiMi/CariHareketiMi) filtrelemede
    // KULLANDIK, aynısını tekrar sonuç üzerinde çalıştırmak totolojik olur (filter zaten "ait"
    // sayılan HER ŞEYİ çıkardığı için bu kontrol HİÇBİR ZAMAN bir sorun YAKALAYAMAZ, yanlış bir
    // güven duygusu verir). Bunun yerine, gerçek/anlamlı tek sağlam kontrol şu: bu üretim GERÇEKTEN
    // ilerlemiş (bir proses/atama tamamlanmış ya da mamul stoğa eklenmiş) olmasına rağmen HİÇBİR
    // hareket bulunup silinmediyse, bu tutarsızlığa işaret eder — sadece BU durumda işlemi durdurup
    // kullanıcıyı uyarırız.
    const uretimIlerlemisMi = siparis.stogaEklendiMi || (siparis.prosesIlerleme || []).some(
      (p) => p.tamamlandiMi || (p.atamalar || []).some((a) => a.tamamlandiMi)
    );
    if (uretimIlerlemisMi && silinenStokSayisi === 0 && silinenCariSayisi === 0) {
      showToast("⚠ Bu üretim ilerlemiş görünüyor (tamamlanmış proses/atama var) ama hiçbir stok/cari hareketi eşleştirilip bulunamadı — güvenlik amacıyla üretim SİLİNMEDİ. Lütfen bildirin.");
      return;
    }

    // SIRA BİLİNÇLİ: hammadde ve cari etkileri önce geri alınır, üretim kaydı EN SON silinir.
    // Yarıda kalırsa geriye "etkileri geri alınmış ama hâlâ duran" bir üretim kalır — bu
    // görünür, anlaşılır ve yeniden denenebilir. Ters sırada kalan şey ise öksüz hareket
    // olurdu: görünmez, izlenemez, aylar sonra "bu miktar nereden çıktı" sorusu.
    const nextUretimListesi = uretim.filter((o) => o.id !== uretimId);
    const adimlar = [
      { ad: "hammadde hareketleri", yerelUygula: () => setStok(nextStok),
        yaz: () => tabloYaz("stok:items", "urunler", nextStok) },
      { ad: "cari hareketleri", yerelUygula: () => setCariler(nextCariler),
        yaz: () => tabloYaz("cari:data", "cariler", nextCariler) },
    ];
    if (etkilendiMi) {
      adimlar.push({ ad: "bağlı satış siparişi", yerelUygula: () => setSiparisler(nextSiparisler),
        yaz: () => tabloYaz("siparis:data", "siparisler", nextSiparisler) });
    }
    // REZERVASYON DEFTERİ DE TEMİZLENİYOR (kullanıcı, 20 Eylül: "üretim ihtiyacı her renk için
    // 0.30 adet gerçekte doğru; talep 1.96 diyor, ihtiyaç 2.56 diyor — eski kayıtlardan mı
    // çekiyor?").
    //
    // KÖK NEDEN BUYDU: üretim planlandığında hammadde için stok rezervasyonu yazılıyor
    // (`stokrez:data`, `uretimNo` alanıyla). Üretim SİLİNDİĞİNDE bu defterden hiçbir şey
    // silinmiyordu. Rezervasyon "açık talep" sayıldığı için Depo ekranında talep ve ihtiyaç
    // olduğundan yüksek çıkıyordu — silinmiş üretimlerin talebi defterde birikiyordu.
    // (Aynı sınıf hata `karsilanan` sayacında da vardı, v1.367.0'da türetmeye geçilerek kapandı.)
    const kalanRezervasyonlar = (stokRezervasyonlari || []).filter((r) => r.uretimNo !== siparis.siparisNo);
    if (kalanRezervasyonlar.length !== (stokRezervasyonlari || []).length) {
      adimlar.push({ ad: "stok rezervasyonları", yerelUygula: () => setStokRezervasyonlari(kalanRezervasyonlar),
        yaz: () => tabloYaz("stokrez:data", "stok_rezervasyonlari", kalanRezervasyonlar) });
    }
    adimlar.push({ ad: "üretim kaydı", yerelUygula: () => setUretim(nextUretimListesi),
      yaz: () => tabloYaz("uretim:siparisler", "uretim", nextUretimListesi) });

    const sonuc = await adimlariYurut(adimlar);
    // Başarı da başarısızlık da yazılır. Yarım kalan işlem, tamamlanandan DAHA çok iz gerektirir.
    gunlukYaz(
      sonuc.ok ? `Üretim silindi: ${siparis.siparisNo}` : `Üretim silme YARIM KALDI: ${siparis.siparisNo}`,
      "uretim",
      { siparisNo: siparis.siparisNo, urun: siparis.urunAd || "", stokHareketi: silinenStokSayisi,
        cariHareketi: silinenCariSayisi, kalanAdim: sonuc.ok ? null : sonuc.kalan, hata: sonuc.ok ? null : sonuc.hata }
    );
    if (!sonuc.ok) {
      // YARIM KALDI. Kullanıcıya ne olduğunu ve ne yapması gerektiğini SÖYLÜYORUZ.
      // Üretim kaydı hâlâ duruyor (en sona bırakıldığı için); silme yeniden denenebilir.
      showToast(
        `⚠ Silme YARIM KALDI — "${sonuc.kalan}" adımı kaydedilemedi (${sonuc.hata}). ` +
        `Tamamlanan: ${sonuc.yapilan.length ? sonuc.yapilan.join(", ") : "hiçbiri"}. ` +
        `Üretim kaydı SİLİNMEDİ, duruyor. Sayfayı yenileyip tekrar deneyin.`
      );
      return { ok: false };
    }
    // Sayılar açıkça yazılıyor: kullanıcı beklediğiyle uyuşup uyuşmadığını kendisi görsün.
    showToast(
      `Üretim siparişi silindi — ${silinenStokSayisi} stok hareketi, ${silinenCariSayisi} cari hareketi de birlikte temizlendi`
      + (etkilendiMi ? " · bağlı satış kalemi yeniden planlanabilir" : "")
    );
    return { ok: true };
  }

  // Etkisiz üretim: temizlenecek hareket yok, yine de sonuç DOĞRULANIR.
  const kalanUretim = uretim.filter((o) => o.id !== uretimId);
  const sadeAdimlar = [];
  if (etkilendiMi) {
    sadeAdimlar.push({ ad: "bağlı satış siparişi", yerelUygula: () => setSiparisler(nextSiparisler),
      yaz: () => tabloYaz("siparis:data", "siparisler", nextSiparisler) });
  }
  sadeAdimlar.push({ ad: "üretim kaydı", yerelUygula: () => setUretim(kalanUretim),
    yaz: () => tabloYaz("uretim:siparisler", "uretim", kalanUretim) });

  const sadeSonuc = await adimlariYurut(sadeAdimlar);
  if (!sadeSonuc.ok) {
    showToast(
      `⚠ Silme YARIM KALDI — "${sadeSonuc.kalan}" adımı kaydedilemedi (${sadeSonuc.hata}). ` +
      `Sayfayı yenileyip tekrar deneyin.`
    );
    return { ok: false };
  }
  showToast("Üretim siparişi silindi" + (etkilendiMi ? " — bağlı satış kalemi yeniden planlanabilir" : ""));
  return { ok: true };
}, [uretim, siparisler, stok, cariler, showToast, adimlariYurut, stokRezervasyonlari, copaAt]);

  return uretimSil;
}
