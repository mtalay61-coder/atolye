// ================= TEK KAPI: fisGeriAl =================
//
// `fisYaz`ın tersi. Bir veya birden çok hareketi (tek hareket ya da fişin tamamı) stok, cari ve
// sipariş taraflarından BİRLİKTE geri alır.
//
// NEDEN VAR
// Geri alma iki ayrı yerde yazılmıştı ve ikisi ayrışmıştı. Bu ayrışmalar gerçek hatalara döndü:
//   - Fişin tamamını silen yol siparişin `karsilanan`ını geri düşürmüyordu → mal stoktan çıkıyor,
//     borç siliniyor ama sipariş "Tamamlandı" kalıyor ve kalem bir daha teslim alınamıyordu (v1.40.0).
//   - Stok ve cari hareketi ayrı kimlik alıyordu → ekstreden silinen satırın malı stokta kalıyordu
//     (v1.41.0). `fisYaz` artık tek kimlik yazıyor; geri alma da o tek kimlikten yürüyor.
//
// SAF: state'e dokunmaz, çöpe atmaz, buluta yazmaz. Yalnızca yeni diziler ve "ne silindi"
// listelerini döndürür. Çöp kaydı ve yazma çağıranda kalır — iki çağrı yeri bu noktada hâlâ
// ayrışmış durumda (bkz. DEVAM-NOTU "Ayrışmalar", 6-7).
//
// ÜRETİM DE KAPSAMDA
// Üretim fişleri (hammadde çıkışı, işçilik, mamul girişi) stok/cari hareketi yazmakla kalmaz,
// üretim siparişinin ilerlemesini de işaretler (`atama.tamamlandiMi`, `stogaEklendiMi`). Fişi
// silip yalnızca stok/cariyi geri almak yarım bir işlemdi: mal stoğa geri geliyor ama üretim
// kartında proses hâlâ "teslim alındı" görünüyordu — kullanıcının bildirdiği hata tam olarak buydu.
//
// Bir üretim fişi silindiğinde AİLESİNİN TAMAMI silinir: `AS-1-Kesim`, `AS-1-Kesim-İşçilik` ve
// `AS-1-Kesim-Giriş` aynı teslim almanın üç yüzüdür. Yalnızca birini silmek mamulü stokta ya da
// işçiliği personelin carisinde bırakırdı. Bu, `uretimProsesAtamaTeslimGeriAl`ın yaptığının aynısı.
//
// GİRDİ
//   veri: { stok, cariler, siparisler, uretim, muhasebe, koliler } — mevcut veri
//   secenekler: {
//     hareketIdler: [id, ...] | Set   — silinecek hareket kimlikleri
//     cariHareketindenSiparisDus: bool — sipariş düşümünde cari hareketini de kaynak say
//     tarih, kullanici                 — geri alınan çek cirosunun geçmiş satırına yazılır
//   }
//
// ENGEL (hiçbir şey değişmeden döner):
//   "uretim-fisi" — üretim fişi yalnız üretim kartından geri alınır
//   "cek-islemde" — işlem görmüş çekin giriş hareketi silinmez (mesaj ne yapılacağını söyler)
//
// ÇIKTI
//   { engel, stok, cariler, siparisler, uretim, muhasebe, silinenCekler, geriAlinanCekler, cekDegisti,
//     silinenStokKayitlari, silinenCariKayitlari,
//     silinenStok, silinenCari, kalemDusumu, etkilenenSiparisler, etkilenenUretimler,
//     muhasebeBagIdler, hareketIdler }

// Bir fiş numarasının hangi üretim adımına/atamasına ait olduğunu bulur.
// AYRIŞTIRMA DEĞİL, YENİDEN ÜRETME: fiş numarası teslim alma sırasında
// `${siparisNo}-${proses}${atamaEki}` formülüyle kuruluyor. Aynı formülü burada tekrar kurup
// karşılaştırmak, biçim değiştiğinde iki yerin birden bozulmasını (sessizce eşleşmemesini) önler.
// Bir üretim adımının/atamasının fiş ailesi: hammadde çıkışı, işçilik ve mamul girişi.
// Formül teslim alma sırasındakiyle AYNI olmalı; bu yüzden TEK yerde duruyor ve hem geri alma
// hem eşleştirme buradan besleniyor.
// FİŞ NUMARASININ ATAMA EKİ — TEK KURAL, ÜÇ ÇAĞRI YERİ.
//
// Ek KONUMDAN DEĞİL PARÇA BARKODUNDAN geliyor. Önce `sıra + 1` kullanılıyordu ve bir atama
// silindiğinde SONRAKİLERİN numarası kayıyordu: "1001-Kesim-2" fişi silmeden sonra bambaşka bir
// atamayı gösteriyordu. Parça barkodu ("1001-2") atamaya bir kez yazılıp saklandığı için
// silmeden etkilenmiyor. Barkodu olmayan ESKİ atamalarda konuma düşülüyor — başka dayanak yok.
function uretimAtamaEki(u, atamalar, atama) {
  if (atama && atama.barkod) {
    const anaKod = `${u.takipKodu || u.siparisNo}-`;
    const parcaNo = String(atama.barkod).startsWith(anaKod) ? String(atama.barkod).slice(anaKod.length) : "";
    if (parcaNo) return `-${parcaNo}`;
  }
  if (!atama) return "";
  const sira = (atamalar || []).findIndex((a) => a.id === atama.id);
  return sira >= 0 && (atamalar || []).length > 1 ? `-${sira + 1}` : "";
}

function uretimFisAdlari(u, adimIndex, atamaId) {
  const adim = (u.prosesIlerleme || [])[adimIndex];
  if (!adim) return [];
  const atamalar = adim.atamalar || [];
  const sira = atamaId == null ? -1 : atamalar.findIndex((a) => a.id === atamaId);
  // Ara prosesler tek parça (atamasız) tamamlanır — fiş numarasında atama eki olmaz.
  // Tek atamalı adımda da ek yazılmaz; ek yalnızca birden fazla atama varsa eklenir.
  //
  // EK, KONUMDAN DEĞİL PARÇA BARKODUNDAN GELİYOR.
  // Önce `sira + 1` kullanılıyordu ve bir atama silindiğinde SONRAKİLERİN numarası kayıyordu:
  // "1001-Kesim-2" fişi, silmeden sonra bambaşka bir atamayı gösteriyordu. Parça barkodu
  // ("1001-2") atamaya bir kez yazılıp saklandığı için silmeden etkilenmiyor.
  // Barkodu olmayan ESKİ atamalarda konuma düşülüyor — o kayıtlar için başka bir dayanak yok.
  const taban = `${u.siparisNo}-${adim.proses}${uretimAtamaEki(u, atamalar, sira >= 0 ? atamalar[sira] : null)}`;
  // `-İade`: kesimde artan hammaddenin stoğa dönüşü (17 Eylül). Ailenin parçası — adım geri
  // alınınca iade hareketi de geri alınmalı, yoksa iade edilen mal stokta kalırdı.
  // `-EkMalzeme` de aileye dahil (20 Eylül): iş sırasında alınan ek malzemenin çıkış hareketi
  // bu fişte duruyor; üretim silinince onun da geri alınması gerekiyor, yoksa stoktan düşmüş
  // ama hiçbir üretime bağlı olmayan bir hareket kalırdı.
  return [taban, `${taban}-İşçilik`, `${taban}-Giriş`, `${taban}-İade`, `${taban}-EkMalzeme`];
}

function uretimFisAilesi(u, fisNo) {
  const ilerleme = u.prosesIlerleme || [];
  for (let i = 0; i < ilerleme.length; i++) {
    const atamalar = ilerleme[i].atamalar || [];
    if (ilerleme[i].araProsesMi || atamalar.length === 0) {
      const fisler = uretimFisAdlari(u, i, null);
      if (fisler.includes(fisNo)) return { adimIndex: i, atamaId: null, fisler };
      continue;
    }
    for (let j = 0; j < atamalar.length; j++) {
      const fisler = uretimFisAdlari(u, i, atamalar[j].id);
      if (fisler.includes(fisNo)) return { adimIndex: i, atamaId: atamalar[j].id, fisler };
    }
  }
  return null;
}

function fisGeriAl(veri, secenekler = {}) {
  const { stok, cariler, siparisler, uretim, muhasebe, koliler } = veri;
  // `esId` KÜMEYE GİRER: Muhasebe defterinde bir kayıt Genel+Resmi olarak İKİ satır yazılır.
  // Yalnızca birini silmek diğerini yetim bırakır ve bakiyeyi bozar. Kümeyi burada genişletmek,
  // çağıranın bunu hatırlamasına bağlı olmaktan çıkarır.
  const idler = new Set([...(secenekler.hareketIdler || [])].filter(Boolean));
  const esGenislet = () => {
    (cariler || []).forEach((c) => {
      (c.hareketler || []).forEach((h) => {
        if (idler.has(h.id) && h.esId) idler.add(h.esId);
        if (h.esId && idler.has(h.esId)) idler.add(h.id);
      });
    });
  };
  esGenislet();

  // ENGEL: HİÇBİR ŞEY DEĞİŞMEDEN döner. Kilit veri katmanında — yeni bir ekran eklense de
  // delinemez. Üretim ve çek kilidi aynı biçimi kullanıyor ki çağıranlar tek dalla ele alabilsin.
  const engelliSonuc = (engel) => ({
    engel,
    stok, cariler, siparisler, uretim, muhasebe, koliler, silinenCekler: [], geriAlinanCekler: [],
    cekDegisti: false, etkilenenKoliler: [],
    silinenStokKayitlari: [], silinenCariKayitlari: [], silinenStok: 0, silinenCari: 0,
    kalemDusumu: {}, etkilenenSiparisler: new Set(), etkilenenUretimler: new Set(),
    muhasebeBagIdler: [], hareketIdler: idler,
  });

  // ---- üretim fişi ailesini kümeye kat ----------------------------------------------------------
  // Silinecek hareketlerin arasında üretim kaynaklı olan varsa, o teslim almanın BÜTÜN fişleri
  // (hammadde çıkışı + işçilik + mamul girişi) birlikte gider.
  const uretimEslesmeleri = new Map(); // uretimId -> { adimIndex, atamaId }
  const tumHareketler = [
    ...(stok || []).flatMap((p) => p.hareketler || []),
    ...(cariler || []).flatMap((c) => c.hareketler || []),
  ];
  // (a) Üretim kartından doğrudan hedef verildiyse: adım/atama biliniyor, fiş ailesi oradan kurulur.
  if (secenekler.uretimHedefi) {
    const { uretimId, prosesAdi, atamaId } = secenekler.uretimHedefi;
    const u = (uretim || []).find((o) => o.id === uretimId);
    const adimIndex = u ? (u.prosesIlerleme || []).findIndex((p) => p.proses === prosesAdi) : -1;
    if (u && adimIndex >= 0) {
      uretimEslesmeleri.set(u.id, {
        adimIndex, atamaId: atamaId == null ? null : atamaId,
        fisler: uretimFisAdlari(u, adimIndex, atamaId), uretim: u,
      });
    }
  }

  // (b) Silinmek istenen bir hareket üretime aitse: hangi adım/atama olduğunu fiş numarasından bul.
  // ESKİ KAYITLARDA `uretimId` YOK — o yüzden kimlik yoksa bütün üretimlerde fiş numarası aranır.
  // Yalnızca `uretimId`ye bakmak, alan eklenmeden önce yazılmış fişleri kilidin dışında bırakırdı.
  tumHareketler.forEach((h) => {
    if (!idler.has(h.id) || !h.fisNo) return;
    const adaylar = h.uretimId
      ? (uretim || []).filter((o) => o.id === h.uretimId)
      // Üretim kaydı artık yoksa geri alınacak ilerleme de yok: fiş kalıntıdır, serbestçe temizlenir.
      : (uretim || []);
    for (const u of adaylar) {
      const eslesme = uretimFisAilesi(u, h.fisNo);
      if (eslesme) { uretimEslesmeleri.set(u.id, { ...eslesme, uretim: u }); break; }
    }
  });

  // ---- KİLİT: üretim fişi yalnızca ÜRETİM KARTINDAN geri alınır ---------------------------------
  // Üretim prosesleri sıralıdır: bir adımın teslim alınması sonraki adımın girdisidir. Fişler
  // ekranından ortadaki bir fişi silmek, sonraki adımlar çoktan başlamışken zinciri ortasından
  // koparırdı — stok geri gelir ama sonraki proseste zaten tüketilmiş olur. Üretim kartındaki geri
  // alma bu sırayı kontrol ediyor ("sonraki prosesler başlamış — önce onları geri almalısınız");
  // burada aynı kontrolü tekrarlamak yerine yolu tek kapıya indiriyoruz: bu iş üretim kartının işi.
  if (uretimEslesmeleri.size > 0 && !secenekler.uretimeIzinVer) {
    const ilk = [...uretimEslesmeleri.values()][0];
    return engelliSonuc({
      sebep: "uretim-fisi",
      uretimId: ilk.uretim.id,
      uretimNo: ilk.uretim.siparisNo,
      proses: (ilk.uretim.prosesIlerleme || [])[ilk.adimIndex] && (ilk.uretim.prosesIlerleme || [])[ilk.adimIndex].proses,
    });
  }

  // İzin verildiyse (üretim kartından gelen geri alma) fişin AİLESİ birlikte gider.
  uretimEslesmeleri.forEach((eslesme, uretimId) => {
    const aile = new Set(eslesme.fisler);
    tumHareketler.forEach((x) => {
      // Kimliği olmayan eski kayıtlar da alınır: fiş numarası zaten o üretime özgü.
      if (aile.has(x.fisNo) && (!x.uretimId || x.uretimId === uretimId)) idler.add(x.id);
    });
  });
  if (uretimEslesmeleri.size > 0) esGenislet();

  // FİŞİN PEŞİN AYAĞI DA GİDER.
  //
  // Peşin tahsilat/ödeme, fişin açtığı borcu kapatan AYRI bir cari kaydı ve onun kimliği
  // kalemlerin kimliğinden farklı. Çağıran yalnız kalem kimliklerini veriyor; peşin ayak
  // toplanmazsa fiş silinir ama tahsilat kaydı ile kasa hareketi ortada kalır — cari bakiyesi
  // kalıcı olarak yanlışa döner.
  //
  // ARAMA DAR: aynı FİŞ NUMARASINA sahip VE `muhasebeBagId` taşıyan cari kayıtları. Yalnız fiş
  // numarasına bakmak, aynı fişe elle eklenmiş başka kayıtları da silerdi.
  {
    const silinecekFisNolar = new Set();   // sirasiz-tamam
    (stok || []).forEach((p) => (p.hareketler || []).forEach((h) => {
      if (idler.has(h.id) && h.fisNo) silinecekFisNolar.add(h.fisNo);
    }));
    (cariler || []).forEach((c) => (c.hareketler || []).forEach((h) => {
      if (idler.has(h.id) && h.fisNo) silinecekFisNolar.add(h.fisNo);
    }));
    if (silinecekFisNolar.size > 0) {
      (cariler || []).forEach((c) => (c.hareketler || []).forEach((h) => {
        if (h.muhasebeBagId && h.fisNo && silinecekFisNolar.has(h.fisNo)) idler.add(h.id);
      }));
    }
  }

  // ---- KİLİT: işlem görmüş çekin GİRİŞ hareketi silinmez -----------------------------------------
  // Küme SON hâlindeyken bakılıyor (eş kayıt, üretim ailesi ve peşin ayak eklendikten sonra): aksi
  // hâlde genişletmeyle kümeye giren bir çek girişi kilidin dışında kalırdı.
  // Kural ve mesaj `cekHareketKilidi`nde; ekranlar da aynı fonksiyonu okuyor.
  {
    const cekKilidi = cekHareketKilidi(idler, { cariler, muhasebe });
    if (cekKilidi) return engelliSonuc(cekKilidi);
  }

  // ---- ne siliniyor: önce topla, sonra uygula ---------------------------------------------------
  // Çöp kaydı çağıranda alınacağı için silinen kayıtların KENDİSİ döndürülüyor; kimlik yetmez,
  // kayıt gittikten sonra tek kaynak bu liste olur.
  const silinenStokKayitlari = [];
  const silinenCariKayitlari = [];
  const muhasebeBagIdler = new Set();

  (stok || []).forEach((p) => {
    (p.hareketler || []).forEach((h) => {
      if (idler.has(h.id)) silinenStokKayitlari.push({ urun: p, hareket: h });
    });
  });
  (cariler || []).forEach((c) => {
    (c.hareketler || []).forEach((h) => {
      if (!idler.has(h.id)) return;
      silinenCariKayitlari.push({ cari: c, hareket: h });
      // Bu hareket bir kasa/banka işleminden geldiyse karşı kaydı da temizlenmeli; yoksa cari
      // tarafında kaybolur ama kasada "yetim" olarak görünmeye devam eder.
      if (h.muhasebeBagId) muhasebeBagIdler.add(h.muhasebeBagId);
    });
  });

  // ---- sipariş geri alımı ----------------------------------------------------------------------
  // Kaynak olarak STOK hareketi tercih edilir: `siparisId` + `kalemId` + gerçekte giren miktar
  // orada durur. Cari hareketinden okumak tutarı verir, miktarı değil.
  // Aynı kaleme ait birden çok hareket olabilir (kısmi teslimler), bu yüzden kalem başına TOPLANIP
  // bir kez düşülür.
  const kalemDusumu = {};
  const sayilanIdler = new Set();
  const dus = (h) => {
    if (!h.siparisId || !h.kalemId || sayilanIdler.has(h.id)) return;
    sayilanIdler.add(h.id);
    const anahtar = `${h.siparisId}|${h.kalemId}`;
    kalemDusumu[anahtar] = (kalemDusumu[anahtar] || 0) + Math.abs(h.miktar || 0);
  };
  silinenStokKayitlari.forEach(({ hareket }) => dus(hareket));
  if (secenekler.cariHareketindenSiparisDus) {
    silinenCariKayitlari.forEach(({ hareket }) => dus(hareket));
  }

  // ---- stok tarafı ------------------------------------------------------------------------------
  // Miktar KIRPILMADAN geri alınır (`Math.max(0, …)` yok): eksi stok bir görüntü sorunu değil,
  // "girişlerin eksik" bilgisidir. Kırpmak, hareketi geri alınca miktarın buharlaşmasına yol açardı.
  let silinenStok = 0;
  const yeniStok = (stok || []).map((p) => {
    const silinecekler = (p.hareketler || []).filter((h) => idler.has(h.id));
    if (silinecekler.length === 0) return p;
    silinenStok += silinecekler.length;
    let variants = p.variants;
    silinecekler.forEach((h) => {
      variants = variants.map((v) =>
        v.renk === h.renk && v.beden === h.beden ? { ...v, miktar: stokYuvarla(v.miktar - h.miktar) } : v
      );
    });
    return { ...p, variants, hareketler: (p.hareketler || []).filter((h) => !idler.has(h.id)) };
  });

  // ---- cari tarafı ------------------------------------------------------------------------------
  let silinenCari = 0;
  const yeniCariler = (cariler || []).map((c) => {
    const kalan = (c.hareketler || []).filter((h) => !idler.has(h.id));
    if (kalan.length === (c.hareketler || []).length) return c;
    silinenCari += (c.hareketler || []).length - kalan.length;
    return { ...c, hareketler: kalan };
  });

  // ---- sipariş tarafı ---------------------------------------------------------------------------
  // Durum kuralı TEK YERDE: iki yol farklı durum üretirse aynı işlem iki ekrandan yapıldığında
  // sipariş farklı görünürdü. "İptal" korunur — iptal, teslim durumundan bağımsız bir karardır.
  const etkilenenSiparisler = new Set(Object.keys(kalemDusumu).map((a) => a.split("|")[0]));
  let yeniSiparisler = siparisler || [];
  if (etkilenenSiparisler.size > 0) {
    yeniSiparisler = yeniSiparisler.map((sip) => {
      if (!etkilenenSiparisler.has(sip.id)) return sip;
      const nextKalemler = (sip.kalemler || []).map((k) => {
        const d = kalemDusumu[`${sip.id}|${k.id}`];
        if (!d) return k;
        return { ...k, karsilanan: stokYuvarla(Math.max(0, (k.karsilanan || 0) - d)) };
      });
      const tumuTam = nextKalemler.every((k) => (k.karsilanan || 0) >= k.miktar);
      const hicYok = nextKalemler.every((k) => (k.karsilanan || 0) === 0);
      const yeniDurum = tumuTam ? "Tamamlandı" : hicYok ? "Bekliyor" : "Kısmi Teslim";
      return { ...sip, kalemler: nextKalemler, durum: sip.durum === "İptal" ? sip.durum : yeniDurum };
    });
  }

  // ---- üretim tarafı ----------------------------------------------------------------------------
  // `uretimProsesAtamaTeslimGeriAl`ın üretim güncellemesiyle AYNI: atama "teslim alınmadı"ya döner,
  // adım tamamlanmamış sayılır, son prosesse mamul girişi işareti kalkar ve aşama o prosese geri alınır.
  // ATAMA SİLİNMEZ, yalnızca teslim geri alınır: iş hâlâ personelde: kullanıcı tekrar teslim alabilir.
  const etkilenenUretimler = new Set(uretimEslesmeleri.keys());
  let yeniUretim = uretim || [];
  if (etkilenenUretimler.size > 0) {
    yeniUretim = yeniUretim.map((u) => {
      const eslesme = uretimEslesmeleri.get(u.id);
      if (!eslesme) return u;
      const ilerleme = u.prosesIlerleme || [];
      const adim = ilerleme[eslesme.adimIndex];
      if (!adim) return u;
      const sonProsesMi = eslesme.adimIndex === ilerleme.length - 1;
      const yeniIlerleme = ilerleme.map((p, i) => {
        if (i !== eslesme.adimIndex) return p;
        if (eslesme.atamaId == null) {
          return { ...p, tamamlandiMi: false, tamamlanmaTarihi: null, verildiMi: false, personelId: null, verilmeTarihi: null };
        }
        return {
          ...p,
          atamalar: (p.atamalar || []).map((a) =>
            a.id === eslesme.atamaId ? { ...a, tamamlandiMi: false, tamamlanmaTarihi: null } : a
          ),
          tamamlandiMi: false,
          tamamlanmaTarihi: null,
        };
      });
      return {
        ...u,
        prosesIlerleme: yeniIlerleme,
        asama: adim.proses,
        stogaEklendiMi: sonProsesMi ? false : u.stogaEklendiMi,
      };
    });
  }

  // ---- çek tarafı ------------------------------------------------------------------------------
  // BEŞİNCİ DEFTER. Caride çek girildiğinde Muhasebe > Çekler listesine de bir kayıt düşüyor
  // (v1.78.0). Hareket silinince o kayıt ORTADA KALIYORDU: ödemesi silinmiş bir çek, vadesi
  // gelince hâlâ hatırlatılıyordu. Üretimde birebir aynısı yaşanmıştı (bkz. 2c) — yeni bir defter
  // eklendiğinde yazma kapısına bağlanıp GERİ ALMA kapısına bağlanmamak, bu projenin tekrar eden
  // hatası. Bağ `hareketId` üzerinden; `fisNo` yedek eşleşme (eski kayıtlarda hareketId yok).
  //
  // GİRİŞ hareketi silinen çek gider. Buraya yalnız İŞLEM GÖRMEMİŞ çek ulaşır: işlem görmüş olanın
  // girişi yukarıdaki kilitte reddedildi. Eşleşme kilitle AYNI fonksiyondan (`cekGirisHareketineBagliMi`).
  const silinenCariFisNolar = new Set(silinenCariKayitlari.map(({ hareket }) => hareket.fisNo).filter(Boolean));
  const silinenCekler = ((muhasebe && muhasebe.cekler) || [])
    .filter((c) => cekGirisHareketineBagliMi(c, idler, silinenCariFisNolar));

  // İŞLEM hareketi (ciro, iade) silinen çek bir önceki durumuna döner (kullanıcı, 10 Eylül: "çek
  // bağını kapat"). Eskiden çek "Ciro Edildi" kalıyordu — cariye verilmiş görünen ama karşılığında
  // kayıt olmayan bir çek. Tahsilin kaydı kasa/banka hareketi; o `hareketSil`de geri alınıyor.
  const silinenCariIdler = new Set(silinenCariKayitlari.map(({ hareket }) => hareket.id));
  const geriAlinanCekler = [];
  const cekDegisti = silinenCekler.length > 0 || ((muhasebe && muhasebe.cekler) || []).some((c) =>
    !silinenCekler.includes(c) && cekIslemGeriAl(c, silinenCariIdler) !== null);
  const yeniMuhasebe = cekDegisti
    ? {
        ...muhasebe,
        cekler: (muhasebe.cekler || [])
          .filter((c) => !silinenCekler.includes(c))
          .map((c) => {
            const geriAlinmis = cekIslemGeriAl(c, silinenCariIdler, { tarih: secenekler.tarih, kullanici: secenekler.kullanici });
            if (!geriAlinmis) return c;
            geriAlinanCekler.push(geriAlinmis);
            return geriAlinmis;
          }),
      }
    : muhasebe;

  // ---- koli tarafı ------------------------------------------------------------------------------
  // ALTINCI DEFTER. Sevkiyatta okutulan koli "Sevk edildi"ye geçiyor ve hangi fişle çıktığını
  // saklıyor. Fiş geri alınınca koli yeniden "Hazır" olmalı: aksi halde mal depoya döner ama koli
  // sevk edilmiş görünür ve bir daha okutulamaz. Üretim ve çekte birebir aynısı yaşandı.
  const silinenFisNolar = new Set([
    ...silinenStokKayitlari.map(({ hareket }) => hareket.fisNo),
    ...silinenCariKayitlari.map(({ hareket }) => hareket.fisNo),
  ].filter(Boolean));
  const etkilenenKoliler = (koliler || []).filter((k) => k.sevkFisNo && silinenFisNolar.has(k.sevkFisNo));
  const yeniKoliler = etkilenenKoliler.length > 0
    ? (koliler || []).map((k) => (etkilenenKoliler.includes(k)
        // `sevkFisNo` ve `sevkZamani` TEMİZLENİYOR: kalan bir fiş numarası, koliyi ileride yanlış
        // bir fişe bağlı gösterirdi.
        ? { ...k, durum: "Hazır", sevkFisNo: null, sevkZamani: null }
        : k))
    : koliler;

  return {
    engel: null,
    // Geri alınan fiş numaraları: çağıran bunlarla FİŞ DEFTERİNDE iptal işaretler (15 Eylül, Adım 1).
    silinenFisNolar: [...silinenFisNolar],
    muhasebe: yeniMuhasebe,
    koliler: yeniKoliler,
    etkilenenKoliler,
    silinenCekler,
    geriAlinanCekler,
    cekDegisti,
    stok: yeniStok,
    cariler: yeniCariler,
    siparisler: yeniSiparisler,
    uretim: yeniUretim,
    etkilenenUretimler,
    silinenStokKayitlari,
    silinenCariKayitlari,
    silinenStok,
    silinenCari,
    kalemDusumu,
    etkilenenSiparisler,
    muhasebeBagIdler: [...muhasebeBagIdler],
    hareketIdler: idler,
  };
}
