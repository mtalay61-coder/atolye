// ================= PROSESE İŞ VERME =================
//
// 19 Eylül (2. madde, 10. tur): bir üretim adımının personele/atölyeye verilmesi. Hammadde
// stoktan düşer, ara proses işçiliği varsa cariye yazılır, rezervasyonlar tüketilir.
//
// KURALLAR:
//   • Hammadde ÇIKIŞI iş verilirken olur, teslim alınırken değil: malzeme kalfanın eline
//     geçtiği anda stoktan çıkmıştır; teslimi beklemek, depoda olmayan malı var göstermekti.
//   • Rezervasyonlar önce TÜKETİLİR: o miktar zaten bu sipariş için ayrılmıştı, ikinci kez
//     ayırmak serbest stoğu olduğundan az gösterirdi.
//   • Ara proses işçiliği AYRI FİŞ: iki farklı kişiye iki farklı ücret ödeniyor, tek fişte
//     toplamak "kime ne ödendi" sorusunu cevapsız bırakırdı.
// ================= ARA PROSESLER — BİRDEN ÇOK, HAMMADDELİ (26 Eylül, v1.477.0) =================
//
// Kullanıcı: "Ara prosese de hammadde eklenebilir olmalı, normal proses gibi hareket edecek ve bir
// prosesin altına birden fazla ara proses eklenebilmeli." (Seçim: hammaddesi normal proses gibi;
// ara proses yine kendiliğinden tamamlanır — fasoncu.)
//
// `urun.araProsesEklentileri[asılProses]` artık DİZİ (eski kayıtta tek kimlik — ikisi de okunur).
// Üretim adımları tek fonksiyondan (`uretimProsesAdimlari`): hem elle açılan üretim (300) hem
// planlamadan doğan (078) aynı sırayı kuruyor. Önceden planlama ara adımı hiç eklemiyordu (iş
// verilirken sonradan yerleştiriliyordu) ve reçetede ara proses adına bağlı hammadde satırı varsa
// o ad İKİNCİ KEZ normal adım olarak açılıyordu — ara proses adları normal adımdan çıkarıldı.
function araProsesIdleri(urun, asilProses) {
  const v = ((urun && urun.araProsesEklentileri) || {})[asilProses];
  return (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean);
}
// Ürünün bütün (asıl proses, ara proses kimliği) çiftleri — maliyet ve baskı listeleri için.
function araProsesCiftleri(urun) {
  return Object.keys((urun && urun.araProsesEklentileri) || {}).flatMap((asil) => araProsesIdleri(urun, asil).map((id) => [asil, id]));
}
function uretimProsesAdimlari(urun, renk, tanimlar) {
  const siraMap = {};
  ((tanimlar && tanimlar.prosesler) || []).forEach((p) => { siraMap[p.ad] = p.sira ?? 999; });
  const araTanimlari = (tanimlar && tanimlar.araProsesler) || [];
  const araAdlari = new Set(araTanimlari.map((ap) => ap.ad));
  const asillar = Array.from(new Set(((urun && urun.recete) || [])
    .filter((r) => r.mamulRenk === renk && r.proses && !araAdlari.has(r.proses)).map((r) => r.proses)));
  if (asillar.length === 0) {
    return [{ proses: "Üretim", sira: 0, tamamlandiMi: false, personelId: null, tamamlanmaTarihi: null, atamalar: [] }];
  }
  const sonuc = [];
  asillar
    .map((p) => ({ proses: p, sira: siraMap[p] ?? 999, tamamlandiMi: false, personelId: null, tamamlanmaTarihi: null, atamalar: [] }))
    .sort((a, b) => a.sira - b.sira)
    .forEach((adim) => {
      sonuc.push(adim);
      // Ara adım kendisinden SONRAKİ asıl proses işe verilince otomatik tamamlanır; personel/verme
      // alanları boş doğar, yalnız hangi ara proses ve sabit carisi işaretli.
      araProsesIdleri(urun, adim.proses).forEach((id, i) => {
        const ap = araTanimlari.find((x) => x.id === id);
        if (!ap || sonuc.some((x) => x.proses === ap.ad)) return;   // aynı ad iki kez adım olmasın
        sonuc.push({ proses: ap.ad, sira: adim.sira + 0.5 + i * 0.01, tamamlandiMi: false, personelId: null, tamamlanmaTarihi: null,
          araProsesMi: true, araProsesId: ap.id, araProsesCariId: ap.cariId, atamalar: [] });
      });
    });
  return sonuc;
}

function useProsesVer(d) {
  const {
    uretim, stok, cariler, tanimlar, siparisler, stokRezervasyonlari, showToast,
    setUretim, setStok, setCariler, setStokRezervasyonlari, setSiparisler,
  } = d;

const uretimProsesVer = useCallback((uretimId, prosesAdi, personelId, bedenMiktarlariHam, parcaBarkod, verilenHammaddeler) => {
  const siparis = uretim.find((o) => o.id === uretimId);
  if (!siparis || !siparis.prosesIlerleme) return;
  const adimIndex = siparis.prosesIlerleme.findIndex((p) => p.proses === prosesAdi);
  if (adimIndex === -1 || siparis.prosesIlerleme[adimIndex].tamamlandiMi) return;
  if (!personelId) {
    showToast("Önce bir personel seçin");
    return;
  }

  const urun = uretimUrunu(siparis, stok);

  // "İyileştirme": bu üretim siparişi, ara proses ürüne bağlanmadan ÖNCE oluşturulmuş olabilir —
  // o zaman prosesIlerleme dizisinde ara proses adımı hiç yoktur. Hemen önceki GERÇEK adımın
  // ardına, ÜRÜNÜN GÜNCEL tanımına göre bağlı bir ara proses varsa, burada eksikse diziye ekleriz.
  // v1.477.0: birden çok ara proses — önceki ASIL adıma bağlı olup dizide olmayanların hepsi, hedef
  // adımın hemen önüne (varolan ara adımlardan sonra) ekleniyor.
  let calismaProsesIlerleme = siparis.prosesIlerleme;
  if (urun && adimIndex > 0 && !calismaProsesIlerleme[adimIndex].araProsesMi) {
    let k = adimIndex - 1;
    while (k >= 0 && calismaProsesIlerleme[k].araProsesMi) k--;
    const asil = k >= 0 ? calismaProsesIlerleme[k] : null;
    if (asil) {
      const eksikler = araProsesIdleri(urun, asil.proses)
        .map((id) => (tanimlar.araProsesler || []).find((ap) => ap.id === id))
        .filter((ap) => ap && !calismaProsesIlerleme.some((x) => x.araProsesId === ap.id || x.proses === ap.ad));
      if (eksikler.length) {
        const yeniAdimlar = eksikler.map((ap, i) => ({
          proses: ap.ad, sira: (asil.sira ?? 0) + 0.5 + (adimIndex - 1 - k + i) * 0.01, tamamlandiMi: false,
          personelId: null, tamamlanmaTarihi: null, verildiMi: false, verilmeTarihi: null,
          araProsesMi: true, araProsesId: ap.id, araProsesCariId: ap.cariId,
        }));
        calismaProsesIlerleme = [...calismaProsesIlerleme.slice(0, adimIndex), ...yeniAdimlar, ...calismaProsesIlerleme.slice(adimIndex)];
      }
    }
  }
  // Ara proses eklendiyse, hedef prosesin dizideki index'i bir kaydırılmış olabilir — yeniden bul.
  const gercekAdimIndex = calismaProsesIlerleme.findIndex((p) => p.proses === prosesAdi && !p.tamamlandiMi);
  const adim = calismaProsesIlerleme[gercekAdimIndex];
  const mevcutAtamalar = adim.atamalar || [];

  // Hemen önceki adım bir Ara Proses ise ve henüz tamamlanmadıysa, bu asıl proses işe verilirken
  // otomatik olarak tamamlanır — kendi sabit cariye (personele) işçiliği işlenir. Bu SADECE bu adıma
  // İLK KEZ bir atama yapılırken (yani adım daha önce hiç iş görmemişken) tetiklenir.
  const ilkAtamaMi = mevcutAtamalar.length === 0;
  // Birden çok ara proses (v1.477.0): hedefin hemen önündeki ARDIŞIK ara adımların tamamlanmamış
  // olanları, sırayla.
  const tamamlanacakAralar = [];
  if (ilkAtamaMi) {
    for (let k = gercekAdimIndex - 1; k >= 0 && calismaProsesIlerleme[k].araProsesMi; k--) {
      if (!calismaProsesIlerleme[k].tamamlandiMi) tamamlanacakAralar.unshift(calismaProsesIlerleme[k]);
    }
  }
  const araProsesOtomatikTamamlanacakMi = tamamlanacakAralar.length > 0;

  // "Önceki adımdan akan miktar" hesaplanır — ara proses adımları (araProsesMi) zaten kendi
  // doğaları gereği her zaman tam akış sağlar (bkz. oncekiAdimdanMevcutBedenler içindeki not),
  // bu yüzden burada ekstra bir "sanki tamamlanmış" varsayımına gerek yoktur.
  const mevcutBedenler = oncekiAdimdanMevcutBedenler(calismaProsesIlerleme, gercekAdimIndex, siparis.bedenMiktarlari);
  const bedenDurumu = adimBedenDurumu(adim, siparis.bedenMiktarlari, mevcutBedenler);

  // Girilen beden bazlı miktarları temizle (sayıya çevir, 0/negatif/boş olanları at) ve her bedenin
  // KENDİ kalan kotasını aşmadığını kontrol et.
  const bedenMiktarlari = {};
  let toplamGirilen = 0;
  for (const [beden, degerHam] of Object.entries(bedenMiktarlariHam || {})) {
    const deger = parseFloat(degerHam);
    if (!deger || deger <= 0) continue;
    const bd = bedenDurumu.find((x) => x.beden === beden);
    if (!bd) {
      showToast(`"${beden}" bu siparişte tanımlı değil`);
      return;
    }
    if (deger > bd.kalan) {
      showToast(`"${beden}" için en fazla ${bd.kalan} adet verebilirsiniz`);
      return;
    }
    bedenMiktarlari[beden] = deger;
    toplamGirilen += deger;
  }
  if (toplamGirilen <= 0) {
    showToast("En az bir bedene miktar girin");
    return;
  }

  // Artık önceki prosesin TAMAMEN bitmesi ŞART DEĞİL — önceki adımdan kısmen teslim alınmış
  // (tamamlandiMi=true olan atamalara ait) miktarlar, bu adıma dağıtılabilir hale gelir. Bu yüzden
  // burada sert bir "tümü tamamlanmalı" kontrolü YOK; onun yerine bedenDurumu zaten yukarıda önceki
  // adımdan akan miktarla sınırlandığı için, hiç akış yoksa (toplamGirilen<=0) doğal olarak reddedilir.
  const hicAkisYokMu = bedenDurumu.every((bd) => bd.toplam === 0);
  if (hicAkisYokMu) {
    showToast("Önceki prosesten henüz teslim alınmış (biten) bir ürün yok — iş dağıtılamaz");
    return;
  }

  const toplamAdet = siparis.bedenMiktarlari.reduce((s, bm) => s + bm.miktar, 0);
  let nextCariler = cariler;
  let araMesaj = "";

  // PARÇA BARKODU. Bir üretim ilerledikçe bölünebiliyor (32 çift → 12 + 20, iki ayrı kalfaya).
  // Her parça kendi barkodunu alıyor ve kod ANA KODDAN türüyor: "1001-1", "1001-2". Elindeki
  // etikete bakan biri hangi üretimin parçası olduğunu okuyabiliyor.
  //
  // Kod ATAMAYA YAZILIP SAKLANIYOR, sırasından türetilmiyor: bir atama silinirse sıradaki
  // parçanın kodu kayar ve basılmış etiket başka bir işi gösterirdi. (Varyant barkodlarında da
  // aynı karar verildi, sebep aynı.)
  // BÖLÜNME YOKSA KOD DEĞİŞMEZ.
  //
  // Önce her iş verme yeni bir kod alıyordu; bölünme olmasa bile Kesim "1000-1", Saya "1000-2"
  // oluyordu. Kullanıcı haklı olarak sordu: "mantık ne burada?" Numara MALI tanımalı, prosesi
  // değil — 32 çift bölünmeden ilerliyorsa Kesim'de de Saya'da da aynı bohça, aynı etiket.
  //
  // Kural: bu atama adımın KALANININ TAMAMINI alıyorsa ve adımda başka atama yoksa, bölünme
  // yok demektir → kod üretimin kendi kodudur. Aksi halde parça kodu doğar: "1000-1", "1000-2".
  // Parça numarası üretim boyunca ARTAR ve yeniden kullanılmaz (bkz. parcaBarkoduUret).
  const anaKod = siparis.takipKodu || siparis.siparisNo;
  const adimKalani = adimBedenDurumu(
    { ...calismaProsesIlerleme[gercekAdimIndex], atamalar: mevcutAtamalar },
    siparis.bedenMiktarlari, mevcutBedenler
  ).reduce((t, x) => t + (x.kalan || 0), 0);
  // ANA KOD BİR KEZ BÖLÜNDÜKTEN SONRA BİR DAHA VERİLMEZ. Üretim kartından yapılan atamalarda da
  // geçerli: bölünmüş bir üretimde yeni bir atama ana kodu alsaydı, iki parça yeniden tek işmiş
  // gibi görünürdü (bildirilen hata: 64 + 40 bölündü, sonraki proseste 104 olarak geldi).
  const bolunmeVar = mevcutAtamalar.length > 0
    || toplamGirilen < adimKalani - 0.001
    || uretimBolunmusMu(siparis);
  const uretimdekiKodlar = (calismaProsesIlerleme || [])
    .flatMap((p) => (p.atamalar || []).map((a) => a.barkod))
    .filter(Boolean);
  const yeniAtama = {
    id: uid("atama"), personelId, bedenMiktarlari, miktar: toplamGirilen, verildiMi: true, verilmeTarihi: new Date().toISOString(),
    // GERÇEKTE VERİLEN HAMMADDE (kullanıcı, 6 Eylül): reçete 300 desi diyor ama deri bölünmediği
    // için kesiciye 390 desilik kanat veriliyor. Artan ancak bu fark bilinirse hesaplanabilir.
    // Reçete kadar verildiyse alan yine yazılıyor — "girilmedi" ile "reçete kadar" ayrımı
    // sonradan yapılamaz ve teslim ekranı hangisi olduğunu bilmek zorunda.
    verilenHammaddeler: verilenHammaddeler || null,
    // Devralınan kod her şeyin önünde: parça hangi koda sahipse onunla devam eder.
    barkod: parcaBarkod || (bolunmeVar ? parcaBarkoduUret(anaKod, uretimdekiKodlar) : anaKod),
    tamamlandiMi: false, tamamlanmaTarihi: null,
  };
  let nextProsesIlerleme = calismaProsesIlerleme.map((p, i) => {
    if (i !== gercekAdimIndex) return p;
    const yeniAtamalar = [...mevcutAtamalar, yeniAtama];
    const yeniBedenDurumu = adimBedenDurumu({ ...p, atamalar: yeniAtamalar }, siparis.bedenMiktarlari, mevcutBedenler);
    const hepsiDagitildi = yeniBedenDurumu.every((x) => x.kalan === 0);
    return { ...p, atamalar: yeniAtamalar, verildiMi: hepsiDagitildi };
  });

  let nextStok = stok;

  // Ara prosesin hammaddesi REZERVASYONDAN da düşer (v1.477.0 — normal proses gibi): teslimdeki
  // `rezervasyonDusulecek` ile aynı biçim, aşağıda aynı sırayla (önce stok, sonra alış rezervasyonu).
  const araRezervasyonDusulecek = [];
  const araMesajlari = [];
  tamamlanacakAralar.forEach((oncekiAdim) => {
    // Ara prosesin ücreti, önce BU ÜRÜNE ÖZEL bir geçersiz kılma (override) var mı diye bakılır;
    // yoksa Tanımlar'da o ara proses için tanımlanmış GENEL/varsayılan ücret kullanılır.
    const araTanim = (tanimlar.araProsesler || []).find((ap) => ap.id === oncekiAdim.araProsesId)
      || (tanimlar.araProsesler || []).find((ap) => ap.cariId === oncekiAdim.araProsesCariId && ap.ad === oncekiAdim.proses);
    const ozelUcret = araTanim && urun ? (urun.araProsesUcretleri || {})[araTanim.id] : undefined;
    const araUcret = ozelUcret != null ? ozelUcret : (araTanim ? (araTanim.ucret || 0) : 0);
    // Cari de aynı şekilde ürüne özel değiştirilebilir — belirtilmemişse ara prosesin kendi sabit carisi kullanılır.
    const ozelCariId = araTanim && urun ? (urun.araProsesCariOverride || {})[araTanim.id] : undefined;
    const araCariId = ozelCariId || oncekiAdim.araProsesCariId;
    const araTutar = toplamAdet * araUcret;
    const araFisNo = `${siparis.siparisNo}-${oncekiAdim.proses}`;

    // Ara proses de tıpkı asıl bir proses gibi kendi reçetesindeki (aynı proses adına bağlı)
    // hammaddeleri tüketir — tek seferde TÜM sipariş adedi için (ara proses parçalı atama desteklemez).
    const hareketOzetAra = [];
    if (urun && urun.recete) {
      nextStok = nextStok.map((p) => {
        let pDegisti = false;
        let variants = p.variants;
        const yeniHareketler = [];
        urun.recete
          .filter((r) => r.proses === oncekiAdim.proses && r.mamulRenk === siparis.renk && r.hammaddeUrunId === p.id)
          .forEach((r) => {
            const bm = siparis.bedenMiktarlari.find((x) => x.beden === r.mamulBeden);
            const uretilenMiktar = r.mamulBeden === "Tüm Bedenler" ? toplamAdet : (bm ? bm.miktar : 0);
            if (!uretilenMiktar) return;
            const tuketilecek = r.miktar * uretilenMiktar;
            // HATA DÜZELTMESİ: burada doğrudan r.renk kullanılıyordu; siparişte seçilen KUTU RENGİ
            // yok sayılıyor ve üretim hep reçetedeki varsayılan renkten (genellikle "Standart")
            // düşüyordu. Sonuç: doğru renkten kutu satın alınıyor ama yanlış renkten stok çıkıyor —
            // alınan renk hiç azalmıyor, "Standart" ise eksiye düşüyordu.
            const etkinRenk = ambalajRengiUygula(r, siparis, stok);
            variants = variants.map((v) =>
              v.renk === etkinRenk && v.beden === r.beden ? { ...v, miktar: stokYuvarla(v.miktar - tuketilecek) } : v
            );
            pDegisti = true;
            hareketOzetAra.push(`${r.hammaddeAd} -${tuketilecek} ${r.birim}`);
            araRezervasyonDusulecek.push({ hammaddeUrunId: r.hammaddeUrunId, hammaddeAd: r.hammaddeAd, renk: etkinRenk, beden: r.beden, miktar: tuketilecek, birim: r.birim });
            yeniHareketler.push({
              id: uid("hrk"), tarih: new Date().toISOString(),
              renk: etkinRenk, beden: r.beden, miktar: -tuketilecek,
              kaynak: "Üretim", cariId: null, siparisNo: siparis.siparisNo, uretimId: siparis.id, fisNo: araFisNo,
            });
          });
        if (!pDegisti) return p;
        return { ...p, variants, hareketler: [...yeniHareketler, ...(p.hareketler || [])].slice(0, HAREKET_GECMIS_SINIRI) };
      });
    }

    if (araCariId && araTutar > 0) {
      nextCariler = nextCariler.map((c) =>
        c.id === araCariId
          ? {
              ...c,
              hareketler: [{
                id: uid("hrk"), tarih: bugunYerel(), zaman: new Date().toISOString(),
                // YÖN (22 Eylül, v1.409.0 — kullanıcı: "işçilik fişleri ters yazılıyor, bizim personele
                // borçlanmamız gerekli"). "Borç" yazılıyordu: personel bize borçlu görünüyor, ödeme de
                // bakiyeyi kapatmak yerine BÜYÜTÜYORDU. İşçilik bir hizmet alımıdır — alış gibi ALACAK.
                // Yön tek kaynaktan (`hareketYonu`), elle yazılmıyor: kural üç kez kurulmuştu, ikisi yanlıştı.
                // İŞLEM TİPİ YAZILIYOR (23 Eylül, v1.433.0 — kullanıcı: "işçilik olan sanki alım yapmışız gibi
                // gösteriyor"). Tip yoktu: cari ekstresi fiş numarasının önekine bakıp karar veriyor
                // (AF- alış, SF- satış…), işçilik hiçbirine uymadığı için ROZETSİZ kalıyor ve ürün alanları
                // olduğu için alış fişi gibi tablolanıyordu. Artık kendi tipiyle geliyor.
                islemTipi: "İşçilik",
                yon: hareketYonu("İşçilik"), tutar: araTutar, odemeSekli: "Nakit", vade: "", defter: "Genel",
                // İŞÇİLİK AYRI FİŞ. Hammadde çıkışı depodan mal çıkarır, işçilik bir kişiye
                // borç doğurur — iki farklı olay. Aynı fiş numarasını paylaştıkları için
                // Fişler ekranında tek satır görünüyor ve "bu fişin tutarı ne" sorusunun net
                // cevabı olmuyordu. Ayrı numara, ayrı satır, ayrı toplam.
                siparisNo: siparis.siparisNo, fisNo: `${araFisNo}-İşçilik`, uretimId: siparis.id,
                urunAd: siparis.model, renk: siparis.renk,
              // ADET VE BİRİM FİYAT ALAN OLARAK (kullanıcı, 19 Eylül: "üretim işçilikte br fiyat
              // ve adet göstermeli, sonuçta var bu"). Bilgi açıklama metninde vardı ama fiş
              // listesi ALANLARI okuyor; metinden ayrıştırmak kırılgan olurdu, o yüzden
              // miktar/birimFiyat/birim doğrudan yazılıyor.
                miktar: toplamAdet, birimFiyat: araUcret, birim: "adet",
                aciklama: `${oncekiAdim.proses} işçilik ücreti (ara proses) — ${siparis.model} · ${toplamAdet} adet × ${araUcret} ₺`,
              }, ...(c.hareketler || [])],
            }
          : c
      );
      araMesajlari.push(` — "${oncekiAdim.proses}" ara prosesi otomatik tamamlandı (${araTutar.toLocaleString("tr-TR")} ₺)${hareketOzetAra.length ? ` · ${hareketOzetAra.join(", ")}` : ""}`);
    } else if (!araCariId) {
      araMesajlari.push(` — ⚠ "${oncekiAdim.proses}" ara prosesi tamamlandı AMA cariye işlenemedi (cari tanımlı değil)`);
    } else if (!araTanim) {
      araMesajlari.push(` — ⚠ "${oncekiAdim.proses}" ara prosesi tamamlandı AMA cariye işlenemedi (tanımı bulunamadı — Tanımlar'dan kontrol edin)`);
    } else {
      araMesajlari.push(` — "${oncekiAdim.proses}" ara prosesi tamamlandı (ücreti 0 ₺ olduğu için cariye işlem yapılmadı)${hareketOzetAra.length ? ` · ${hareketOzetAra.join(", ")}` : ""}`);
    }
    nextProsesIlerleme = nextProsesIlerleme.map((p) =>
      p === oncekiAdim ? { ...p, tamamlandiMi: true, verildiMi: true, personelId: araCariId, tamamlanmaTarihi: new Date().toISOString() } : p
    );
  });
  araMesaj = araMesajlari.join("");

  let nextSiparislerRez = siparisler;
  let nextStokRez = stokRezervasyonlari;
  if (siparis.rezervasyonSiparisId && araRezervasyonDusulecek.length > 0) {
    araRezervasyonDusulecek.forEach((d) => {
      const stokSonuc = stokRezervasyonTuket(nextStokRez, siparis.rezervasyonSiparisId, d.hammaddeUrunId, d.renk, d.beden, d.miktar, -1);
      nextStokRez = stokSonuc.defter;
      if (stokSonuc.kalanIhtiyac > 0.0001) {
        const sonuc = rezervasyonTuket(nextSiparislerRez, siparis.rezervasyonSiparisId, d.hammaddeUrunId, d.renk, d.beden, stokSonuc.kalanIhtiyac, -1);
        nextSiparislerRez = sonuc.yeniSiparisler;
      }
    });
  }

  const nextUretim = uretim.map((o) => (o.id === uretimId ? { ...o, prosesIlerleme: nextProsesIlerleme } : o));
  setStok(nextStok);
  setCariler(nextCariler);


  setUretim(nextUretim);
  if (araProsesOtomatikTamamlanacakMi) {
    yazimiIzle(tabloYaz("stok:items", "urunler", nextStok), "Stok kartları", nextStok);
    yazimiIzle(tabloYaz("cari:data", "cariler", nextCariler), "Cari kartları", nextCariler);
  }
  if (nextStokRez !== stokRezervasyonlari) {
    setStokRezervasyonlari(nextStokRez);
    yazimiIzle(tabloYaz("stokrez:data", "stok_rezervasyonlari", nextStokRez), "Stok rezervasyonları", nextStokRez);
  }
  if (nextSiparislerRez !== siparisler && setSiparisler) {
    setSiparisler(nextSiparislerRez);
    yazimiIzle(tabloYaz("siparis:data", "siparisler", nextSiparislerRez), "Siparişler", nextSiparislerRez);
  }
  yazimiIzle(tabloYaz("uretim:siparisler", "uretim", nextUretim), "Üretim", nextUretim);
  const personelAdi = ((cariler || []).find((c) => c.id === personelId) || {}).unvan || "personel";
  const bedenOzet = Object.entries(bedenMiktarlari).map(([b, m]) => `${b}:${m}`).join(", ");
  showToast(`${toplamGirilen} adet (${bedenOzet}) ${personelAdi}'a verildi${araMesaj}`);
}, [uretim, stok, cariler, tanimlar, siparisler, stokRezervasyonlari, showToast]);

  return uretimProsesVer;
}
