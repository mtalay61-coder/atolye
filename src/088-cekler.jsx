// ================= ÇEK İŞLEMLERİ =================
//
// 19 Eylül (2. madde, 6. tur): App'ten çıkarılan altıncı parça. Çek görselleri, çek ekleme ve
// çek üzerindeki işlemler (ciro, tahsile verme, tahsil, iade, karşılıksız).
//
// KURALLAR:
//   • HER İŞLEM CARİYE YAZILIR (6 Eylül): "çeki iade et" deyince çeki VEREN cariye ters hareket
//     gider — onun borcu geri doğar. Eskiden yazılmıyordu ve çek geri verilmiş ama borç kapalı
//     görünüyordu.
//   • Çek görselleri AYRI TABLODA: bir çekin iki fotoğrafı, muhasebe kaydının içinde taşınırsa
//     her muhasebe yazmasında o fotoğraflar da gidip geliyordu.
//   • Fişe bağlı çekte fiş silinmeden çek durumu değiştirilemez (kilit rozeti) — iki kaydın
//     birbirini tutması, hangisinin "doğru" olduğunu tartışmaktan iyidir.
function useCekler(d) {
  const {
    addCariHareketFromStok, aktifKullanici, cariler, cekGorselleri, kaydetmeHatasiBildir,
    muhasebe, saveMuhasebe, setCekGorselleri, showToast,
  } = d;

const cekGorselKaydet = useCallback(async (cekId, gorseller) => {
  if (!cekId) return;
  const temiz = { on: (gorseller && gorseller.on) || "", arka: (gorseller && gorseller.arka) || "" };
  const doluMu = !!(temiz.on || temiz.arka);
  const sonraki = doluMu
    ? [...cekGorselleri.filter((g) => g.id !== cekId), { id: cekId, ...temiz }]
    : cekGorselleri.filter((g) => g.id !== cekId);
  setCekGorselleri(sonraki);
  cekGorselYaz(cekId, temiz).catch((e) => console.error("Çek görseli yerele yazılamadı:", e));
  try {
    await tabloYaz("cekgorsel:data", "cek_gorselleri", sonraki, []);
  } catch (e) {
    kaydetmeHatasiBildir(e, "Çek görseli", sonraki);
  }
}, [cekGorselleri, kaydetmeHatasiBildir]);

// ÇEK EKLEME — CARİYE DE İŞLENİYOR.
//
// Kullanıcı (6 Eylül, notta açık madde): "Şahsi çek çıkışı cari hareketi doğurmuyor. Kendi
// çekimizi yazmak, karşı tarafa borcumuzu kapatan bir işlem."
//
// Doğrusu iki yönde de geçerli:
//   VERİLEN (şahsi çek çıkışı) → biz ödeme yaptık, o cariye borcumuz azalır
//   ALINAN  (müşteri çeki)     → müşteri ödedi, bizden alacağı azalır
// Çek yazmak/almak bir SÖZ değil, karşılığında mal ya da borç kapanışı olan bir işlem.
//
// ÇİFT KAYIT KAPISI: cari kartından girilen çekte hareket ZATEN yazılıyor ve çeke `hareketId`
// olarak bağlanıyor. Orada ikinci bir hareket yazmak bakiyeyi iki katına çıkarırdı; bu yüzden
// yalnız `hareketId` YOKSA (yani Muhasebe ekranından girildiyse) hareket doğuyor.
//
// KASA HAREKETİ YOK — çek nakit değil, para vadesinde el değiştirir (7z-8'deki gerekçenin aynısı).
const cekEkleVeIsle = useCallback((veri) => {
  const cek = { id: uid("cek"), durum: "Portföyde", ...veri };
  const cari = veri.cariId ? cariler.find((c) => c.id === veri.cariId) : null;
  const hareketGerekli = !!cari && !veri.hareketId && (veri.tutar || 0) > 0;

  let hareket = null;
  if (hareketGerekli) {
    const verilen = (cek.tip || "Alınan") === "Verilen";
    const islemTipi = verilen ? "Ödeme" : "Tahsilat";
    hareket = {
      id: uid("hrk"),
      tarih: bugunYerel(),
      zaman: new Date().toISOString(),
      yon: hareketYonu(islemTipi),
      // CARİNİN HESAP BİRİMİNDE (v1.459.0): TL çek dolar carisine $ olarak işlenebilir; form
      // çevrimi `cariTutar`/`cariPB` ile getiriyor. Yoksa çekin kendi tutarı ve birimi.
      tutar: veri.cariPB && veri.cariTutar > 0 ? veri.cariTutar : cek.tutar,
      paraBirimi: veri.cariPB && veri.cariTutar > 0 ? veri.cariPB : (cek.paraBirimi || "TRY"),
      odemeSekli: "Çek",
      vade: cek.vadeTarihi || "",
      fisNo: fisNoSiradaki(fisOnEki(islemTipi), tumFisNumaralari(cariler)),
      islemTipi,
      aciklama: `${verilen ? "Şahsi çek çıkışı" : "Müşteri çeki"}${cek.cekNo ? ` · No ${cek.cekNo}` : ""}${cek.banka ? ` · ${cek.banka}` : ""}`,
      kullanici: (aktifKullanici && aktifKullanici.ad) || null,
      defter: "Genel",
      // Karşı taraf bilgisi 7z-7'nin alanlarıyla: ekstrede çekin kendi tutarı görünsün.
      hesapAd: `Çek${cek.cekNo ? ` No ${cek.cekNo}` : ""}`,
      hesapPB: cek.paraBirimi || "TRY",
      hesapTutar: cek.tutar,
      cekId: cek.id,
    };
    addCariHareketFromStok(veri.cariId, [hareket]);
    cek.hareketId = hareket.id;
  }

  saveMuhasebe({ ...muhasebe, cekler: [cek, ...(muhasebe.cekler || [])] });
  showToast(hareket
    ? `Çek eklendi — ${cari.unvan} carisine ${hareket.islemTipi} işlendi`
    : "Çek eklendi");
}, [muhasebe, cariler, addCariHareketFromStok, saveMuhasebe, showToast, aktifKullanici]);

const cekIslemYap = useCallback((cekId, islem, secim = {}) => {
  const cek = (muhasebe.cekler || []).find((c) => c.id === cekId);
  if (!cek) return showToast("Çek bulunamadı");
  const tanim = CEK_ISLEMLERI[islem];
  if (!tanim) return showToast("Bilinmeyen işlem");
  if (!tanim.izinliDurumlar.includes(cek.durum || "Portföyde")) {
    return showToast(`Çek "${cek.durum}" aşamasında — bu işlem yapılamaz`);
  }
  if (tanim.cariGerekli && !secim.cariId) return showToast("Cari seçin");
  if (tanim.bankaGerekli && !secim.bankaId) return showToast("Banka seçin — çekin hangi bankada tahsil beklediği takip edilecek");

  const tarih = secim.tarih || bugunYerel();
  const kullanici = (aktifKullanici && aktifKullanici.ad) || null;

  // BAĞLI KAYIT DOĞURAN ÜÇ İŞLEM (kullanıcı, 10 Eylül):
  //   ciro   → alıcı cariye ödeme (borcumuz azalır)
  //   iade   → çeki VEREN cariye ters hareket (onun borcu geri doğar) — eskiden YAZILMIYORDU,
  //            yorum iade hareket doğurur diyordu ama kod yalnız ciroda hareket yazıyordu
  //   tahsil → paranın girdiği kasa/banka hareketi — tahsildeki çekte verildiği banka
  // Tahsile verme bir YER DEĞİŞİKLİĞİ, karşılıksız çıkma kayıt doğurmuyor (kullanıcı: "diğer
  // ikisi doğru").
  //
  // Her kaydın kimliği geçmiş satırına yazılıyor: kayıt silinirse aşama geri alınıyor
  // (bkz. `cekIslemGeriAl` — değişmez kural, silme hangi uçtan başlarsa başlasın aynı sonuç).
  let hareket = null;
  let hedefCariId = null;
  if (islem === "ciro") {
    hedefCariId = secim.cariId;
    hareket = cekCiroHareketi(cek, {
      cariId: hedefCariId, tutar: secim.tutar, paraBirimi: secim.paraBirimi, tarih,
      fisNo: fisNoSiradaki(fisOnEki("Ödeme"), tumFisNumaralari(cariler)),
      aciklama: secim.aciklama, kullanici, defter: secim.defter || "Genel",
    });
  } else if (islem === "iade" && cek.cariId) {
    hedefCariId = cek.cariId;
    // Ters hareket GİRİŞİN aynası: girişin tutarı ve birimi (bkz. `cekIadeHareketi`).
    const girisHareketi = cek.hareketId
      ? cariler.flatMap((c) => c.hareketler || []).find((h) => h.id === cek.hareketId) || null
      : null;
    const iadeTipi = (cek.tip || "Alınan") === "Verilen" ? "Tahsilat" : "Ödeme";
    hareket = cekIadeHareketi(cek, {
      girisHareketi, tarih, kullanici,
      fisNo: fisNoSiradaki(fisOnEki(iadeTipi), tumFisNumaralari(cariler)),
    });
  }

  // TAHSİL HESABI. Tahsildeki çekin parası VERİLDİĞİ BANKAYA girer — seçim sorulmuyor
  // (kullanıcı: "para hangi bankaya verilmiş ise o bankanın kasasına girecek"). Portföydeki çek
  // doğrudan tahsil edildiyse (gişeden, elden) hesap formda seçiliyor.
  let hesapHareketi = null;
  let tahsilHesabi = null;
  if (islem === "tahsil") {
    const tahsilBankasi = cek.durum === "Tahsilde" && cek.tahsilBankaId
      ? (muhasebe.bankalar || []).find((b) => b.id === cek.tahsilBankaId) : null;
    if (tahsilBankasi) {
      tahsilHesabi = { tur: "banka", hesap: tahsilBankasi };
    } else if (secim.hesapId) {
      const liste = secim.hesapTur === "kasa" ? (muhasebe.kasalar || []) : (muhasebe.bankalar || []);
      const h = liste.find((x) => x.id === secim.hesapId);
      if (h) tahsilHesabi = { tur: secim.hesapTur === "kasa" ? "kasa" : "banka", hesap: h };
    }
    if (!tahsilHesabi) return showToast("Paranın girdiği kasa/bankayı seçin");
    const hesapPB = tahsilHesabi.hesap.paraBirimi || "TRY";
    const cekPB = cek.paraBirimi || "TRY";
    // Birimler farklıysa tutar formdan (kur çevirici) gelmek ZORUNDA: çekin tutarını başka bir
    // birimdeki hesaba olduğu gibi yazmak bakiyeyi sessizce bozardı.
    const hesapTutari = hesapPB === cekPB ? cek.tutar : (secim.tutar > 0 ? secim.tutar : null);
    if (hesapTutari == null) return showToast(`Hesap ${hesapPB}, çek ${cekPB} — hesaba girecek tutarı yazın`);
    const cekCarisi = cariler.find((c) => c.id === cek.cariId);
    hesapHareketi = cekTahsilHesapHareketi(cek, {
      tutar: hesapTutari, tarih, kullanici, cariAd: cekCarisi ? cekCarisi.unvan : null,
    });
  }

  const karsiCari = hedefCariId ? cariler.find((c) => c.id === hedefCariId) : null;

  const yeniCek = cekIslemUygula(cek, islem, {
    tarih, kullanici,
    cariId: hedefCariId || null,
    cariAd: karsiCari ? karsiCari.unvan : null,
    bankaId: tahsilHesabi ? tahsilHesabi.hesap.id : secim.bankaId,
    bankaAd: tahsilHesabi ? tahsilHesabi.hesap.ad : secim.bankaAd,
    tutar: hareket ? hareket.tutar : hesapHareketi ? hesapHareketi.tutar : cek.tutar,
    paraBirimi: hareket ? hareket.paraBirimi
      : tahsilHesabi ? (tahsilHesabi.hesap.paraBirimi || "TRY") : (cek.paraBirimi || "TRY"),
    hareketId: hareket && karsiCari ? hareket.id : null,
    hesapHareketId: hesapHareketi ? hesapHareketi.id : null,
    hesapTur: tahsilHesabi ? tahsilHesabi.tur : null,
    hesapId: tahsilHesabi ? tahsilHesabi.hesap.id : null,
    hesapAd: tahsilHesabi ? tahsilHesabi.hesap.ad : null,
    not: secim.not,
  });
  if (!yeniCek) return showToast("İşlem uygulanamadı");

  // Yazmalar ancak geçiş KESİNLEŞTİKTEN sonra: önce hareket yazılıp sonra geçiş reddedilseydi
  // karşılığı olmayan bir cari hareketi kalırdı.
  if (hareket && karsiCari) addCariHareketFromStok(hedefCariId, [hareket]);
  // TEK YAZIM: çek ve (varsa) kasa/banka hareketi AYNI kayıtta (`muhasebe`).
  const temel = hesapHareketi
    ? hesabaHareketEkle(muhasebe, tahsilHesabi.tur, tahsilHesabi.hesap.id, hesapHareketi)
    : muhasebe;
  saveMuhasebe({ ...temel, cekler: (temel.cekler || []).map((c) => (c.id === cekId ? yeniCek : c)) });
  gunlukYaz(`Çek ${tanim.ad}: ${cek.cekNo || "no yok"}`, "muhasebe", { cekId, islem });
  showToast(`${tanim.ad} — çek "${yeniCek.durum}" oldu` +
    (hareket && karsiCari ? ` · ${karsiCari.unvan} carisine ${hareket.islemTipi} işlendi` : "") +
    (hesapHareketi ? ` · ${tahsilHesabi.hesap.ad} hesabına ${hesapHareketi.yon === "Giriş" ? "girdi" : "çıktı"}` : ""));
}, [muhasebe, cariler, addCariHareketFromStok, saveMuhasebe, showToast, aktifKullanici]);

  return { cekGorselKaydet, cekEkleVeIsle, cekIslemYap };
}
