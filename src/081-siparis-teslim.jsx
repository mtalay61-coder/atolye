// ================= SİPARİŞTEN TESLİM ALMA =================
//
// 19 Eylül (2. madde, 10. tur): siparişin karşılanmasını kaydeden yol — fiş kesilir, stok hareketi
// ve cari hareketi yazılır, siparişin karşılanan miktarı güncellenir.
//
// ATOMİK (22. bölüm, Adım 3): önce HESAP yapılır (hiçbir state'e dokunmadan), sonra FİŞ DEFTERİNE
// yazılır; defter yazılamazsa sipariş, stok, cari ve koli — hiçbiri değişmez. Bu sıra bir kez
// yanlış kurulmuştu: yan etkiler hesabın içindeydi ve defter reddetse bile stok değişiyordu.
//
// BİRDEN ÇOK SİPARİŞ: teslim satırı kendi `siparisId`sini taşıyabilir (aynı carinin başka bir
// siparişi). Fiş numarası ve sayaç ANA siparişten gelir, karşılanan miktar ise her siparişin
// kendisine yazılır — tek fişle iki siparişi kapatmak mümkün.
// Sipariş teslim fişinin fis_kes yükü (saf, v1.732.1).
function siparisTeslimSunucuYuku({ siparis, fisGovdesi2, sonuc, islenenler, defterKaydi, oncekiSiparisler, nextSiparisler, etkilenenIdler, yeniSayac, kullaniciAd, zaman, istek }) {
  const kimlikler = new Set([...(sonuc.kimlikler || new Map()).values()]);
  const stokSatirlari = [];
  (sonuc.stok || []).forEach((u) => (u.hareketler || []).forEach((h) => { if (kimlikler.has(h.id)) stokSatirlari.push(fisKesStokSatiri(u.id, h)); }));
  const cariHareketleri = (sonuc.cariHareketleri || []).map((h) => ({
    ...h, id: h.id || uid("hrk"), fisNo: FIS_YER, zaman: h.zaman || zaman, kullanici: h.kullanici || kullaniciAd,
  }));
  const etkSiparis = fisKesEtkilenen(oncekiSiparisler, nextSiparisler, [...etkilenenIdler, siparis.id]);
  const altSatirlar = etkSiparis.yeniler.flatMap((s) => fisKesSiparisKalemleri(s, islenenler.filter((k) => k._siparisId === s.id).map((k) => k.kalemId)));
  const tutar = stokYuvarla(cariHareketleri.filter((h) => h.defter !== "Resmi").reduce((t, h) => t + (h.tutar || 0), 0));
  const alis = siparis.tip === "Alış";
  const yuk = {
    istek,
    fis: {
      aile: "stok", tur: siparis.tip, onek: alis ? "AF" : "SF", kaynak: fisGovdesi2.kaynak, defter: fisGovdesi2.defter, tarih: fisGovdesi2.stokTarihi,
      cariId: siparis.cariId, siparisId: siparis.id, siparisNo: siparis.siparisNo, paraBirimi: siparis.kayitParaBirimi || null, tutar,
      aciklama: `${siparis.tip} siparişi ${siparis.siparisNo} — ${yeniSayac}. teslim`, kullanici: kullaniciAd, kalemler: (defterKaydi && defterKaydi.kalemler) || [],
      ek: { teslimSayaci: yeniSayac },
    },
    stok: { satirlar: stokSatirlari },
    cari: { satirlar: cariHareketleri.map((h) => fisKesCariSatiri(siparis.cariId, h)) },
    ...(altSatirlar.length ? { alt: { siparis_kalemleri: { satirlar: altSatirlar } } } : {}),
  };
  return { yuk, kimlikler, cariHareketleri, etkSiparis };
}

function useSiparisTeslim(d) {
  const {
    siparisler, stok, cariler, muhasebe, koliler, showToast, aktifKullanici, saveKoliler,
    fisDefterineKayitYaz, setSiparisler, setStok, setCariler, tanimlar, setFisDefteri, fisGeriAlRef,
  } = d;

// SİPARİŞ TESLİMİ — SUNUCU YOLU (v1.732.1, tek fiş defteri). Hesap bugünküyle aynı (`fisYaz` + karşılanan + durum); yazma
// `fis_kes` ile TEK işlemde: fiş + stok satırları + cari satırları + bütün etkilenen siparişlerin kalemleri (karşılanan).
// Sunucu yazınca numara yerleşir, ekran güncellenir; yazamazsa hiçbir şey değişmez (çağıran false alır, koli listede kalır).
const siparisTeslimSunucuyaKes = useCallback(async ({ hesap, defterKaydi, koliIdler }) => {
  const { sonuc, islenenler, fisGovdesi2, siparis, nextSiparisler, etkilenenIdler, yeniSayac, tumuTam, rezervasyonUyarisi } = hesap;
  const kullaniciAd = (aktifKullanici && aktifKullanici.ad) || null;
  const zaman = new Date().toISOString();
  const { yuk, kimlikler, cariHareketleri, etkSiparis } = siparisTeslimSunucuYuku({ siparis, fisGovdesi2, sonuc, islenenler, defterKaydi,
    oncekiSiparisler: siparisler, nextSiparisler, etkilenenIdler, yeniSayac, kullaniciAd, zaman, istek: uid("fis") });
  // Taban için eski hâller bekleme ÖNCESİ (hesabı yapan fotoğraf).
  const urunIdler = [...new Set(islenenler.map((k) => k.urunId))];
  const stokEskiler = (stok || []).filter((u) => urunIdler.includes(u.id));
  const cariEski = (cariler || []).find((c) => c.id === siparis.cariId);
  let r;
  try {
    r = await fisKesGonder(yuk);
  } catch (e) {
    showToast(`Teslim kaydedilemedi — hiçbir değişiklik yapılmadı (${String((e && e.message) || e).slice(0, 160)})`);
    gunlukYaz(`Sipariş teslimi kaydedilemedi (${siparis.siparisNo}): ${String((e && e.message) || e).slice(0, 200)}`, "siparis", { siparisId: siparis.id });
    return false;
  }
  const no = r.fisNo;
  const doldur = (x) => fisYerTutucuDoldur(x, no);
  const stokYeniler = (sonuc.stok || []).filter((u) => urunIdler.includes(u.id))
    .map((u) => ({ ...u, hareketler: (u.hareketler || []).map((h) => (kimlikler.has(h.id) ? doldur(h) : h)) }));
  setStok((onceki) => { const n = degisenKayitlariBirlestir(onceki, stokEskiler, stokYeniler); fisKesYerelYaz("stok:items", n); return n; }, { buluttan: true });
  fisKesTabaniKur("urunler", stokEskiler, stokMiktarlariniHesapla(stokYeniler));
  const yeniCari = cariHareketleri.map(doldur);
  setCariler((onceki) => {
    const n = (onceki || []).map((c) => (c.id === siparis.cariId ? { ...c, hareketler: [...yeniCari, ...(c.hareketler || [])] } : c));
    fisKesYerelYaz("cari:data", n);
    return n;
  });
  if (cariEski) fisKesTabaniKur("cariler", [cariEski], [{ ...cariEski, hareketler: [...yeniCari, ...(cariEski.hareketler || [])] }]);
  // Siparişler: kalemler (karşılanan) sunucuda yazıldı (taban); ana satır (durum, teslim sayacı, defter tercihi) bugünkü yoldan.
  fisKesTabaniKur("siparisler", etkSiparis.eskiler, etkSiparis.yeniler, { anaDahil: false });
  setSiparisler((onceki) => {
    const n = degisenKayitlariBirlestir(onceki, etkSiparis.eskiler, etkSiparis.yeniler);
    yazimiIzle(tabloYaz("siparis:data", "siparisler", n), "Siparişler", n);
    return n;
  });
  if (koliIdler && koliIdler.length > 0) {
    saveKoliler((koliler || []).map((k) => (koliIdler.includes(k.id) ? { ...k, durum: "Sevk edildi", sevkFisNo: no, sevkZamani: zaman } : k)));
  }
  const kayit = { ...doldur(defterKaydi), id: no, fisNo: no, aile: "stok", sunucu: true, bagliFis: null, ek: yuk.fis.ek, tutar: yuk.fis.tutar };
  setFisDefteri((onceki) => [kayit, ...(onceki || [])]);
  gunlukYaz(`Sipariş teslimi: ${siparis.siparisNo} → ${no}`, "siparis", { siparisId: siparis.id, fisNo: no });
  showToast(`${no} kaydedildi (${siparis.siparisNo}) — ${tumuTam ? "Sipariş tamamlandı" : "Kısmi teslim/tahsil işlendi, eksik var"}${rezervasyonUyarisi}`, {
    geriAl: () => fisGeriAlRef && fisGeriAlRef.current && fisGeriAlRef.current(no, [...kimlikler, ...yeniCari.map((h) => h.id)]),
  });
  return true;
}, [siparisler, stok, cariler, koliler, saveKoliler, aktifKullanici, showToast, setStok, setCariler, setSiparisler, setFisDefteri, fisGeriAlRef]);

const siparisGerceklestir = useCallback(async (siparisId, teslimler, defter = "Genel", koliIdler = []) => {
  const sunucuYolu = fisKesYolu();
  let defterKaydiBekleyen = null;
  let koliIslemi = null;
  const hesap = (() => {
    const prevSiparisler = siparisler;
    const siparis = prevSiparisler.find((s) => s.id === siparisId);
    if (!siparis) return null;

    const yeniSayac = (siparis.teslimSayaci || 0) + 1;
    // TEK FİŞ DEFTERİ (v1.732.1, 078): sunucuda fiş defteri kuruluysa numarayı SUNUCU verir (AF / SF); o gelene kadar yer tutucu.
    const fisNo = sunucuYolu ? FIS_YER : `${siparis.siparisNo}-F${yeniSayac}`;

    // Teslim satırları fiş kalemlerine çevriliyor. `kalan` da taşınıyor: sipariş fazlası hem
    // hareket üzerinde işaretlenecek hem de kullanıcıya özetlenecek.
    //
    // BİRDEN ÇOK SİPARİŞ (9b, 13 Eylül): teslim satırı `siparisId` taşıyorsa kalem O siparişten
    // alınır (aynı carinin başka bir alış siparişi). Fiş numarası ve fiş sayacı ANA (açılan)
    // siparişin; diğer siparişler yalnız `karsilanan`/durum günceller. Başka cariye ait sipariş
    // reddedilir — fiş tek cariye kesilir.
    const siparisBul = (id) => (!id || id === siparisId ? siparis : prevSiparisler.find((s) => s.id === id));
    const fisKalemleri = [];
    teslimler.forEach((t) => {
      if (!t.miktar || t.miktar <= 0) return;
      const kaynakSiparis = siparisBul(t.siparisId);
      if (!kaynakSiparis || kaynakSiparis.cariId !== siparis.cariId || kaynakSiparis.tip !== siparis.tip) return;
      const kalem = kaynakSiparis.kalemler.find((k) => k.id === t.kalemId);
      if (!kalem) return;
      const kalan = kalem.miktar - (kalem.karsilanan || 0);
      fisKalemleri.push({
        urunId: kalem.urunId, urunAd: kalem.urunAd, renk: kalem.renk, beden: kalem.beden,
        // FİŞ FİYATI (kullanıcı, 14 Eylül: "alış fişi girişinde fiyat ve para birimi de olsun ve
        // değiştirilebilir olsun"). Teslim satırı fiyat taşıyorsa O geçerli: gerçekleşen alış,
        // sipariş fiyatından farklı olabilir. Sipariş kaydının fiyatı DEĞİŞMEZ — sipariş ne
        // konuşulduğunu, fiş ne olduğunu gösterir.
        birim: kalem.birim, miktar: t.miktar,
        birimFiyat: t.birimFiyat != null && t.birimFiyat !== "" ? Number(t.birimFiyat) : kalem.birimFiyat,
        paraBirimi: t.paraBirimi || kalem.paraBirimi || "TRY",
        kalemId: kalem.id, kalan, fazlaGonderim: t.miktar > kalan,
        // KDV (v1.502.0): Tanımlar'da açıksa siparişte satırla girilen oran fişe geçer; oransız eski
        // kalemde ürünün oranı. Kapalıysa oran taşınmaz — fiş eskisi gibi KDV'siz (anahtar tek yerde).
        ...(kdvAktifMi(tanimlar && tanimlar.firmaBilgileri)
          ? { kdvOrani: kalemKdvOrani(kalem, stok, tanimlar.firmaBilgileri) } : {}),
        _siparisId: kaynakSiparis.id,
        ...(kaynakSiparis.id !== siparis.id
          ? { siparis: { id: kaynakSiparis.id, siparisNo: kaynakSiparis.siparisNo, rezervasyonSiparisId: kaynakSiparis.rezervasyonSiparisId } }
          : {}),
      });
    });

    // SEVKİYATTA OKUTULAN KOLİLER. Fiş numarası burada belli olduğu için işaretleme de burada:
    // koli "Sevk edildi"ye geçer ve hangi fişle çıktığını saklar. `fisGeriAl` bu bağdan geri döner.
    if (koliIdler && koliIdler.length > 0) {
      const zaman = new Date().toISOString();
      // ERTELENDİ (Adım 3): defter yazımı başarısız olursa koli "sevk edildi" kalmasın.
      koliIslemi = () => saveKoliler((koliler || []).map((k) => (koliIdler.includes(k.id)
        ? { ...k, durum: "Sevk edildi", sevkFisNo: fisNo, sevkZamani: zaman }
        : k)));
    }

    const fisGovdesi2 = {
      fisNo, tip: siparis.tip, cariId: siparis.cariId,
      kaynak: siparis.tip === "Alış" ? "Satınalma" : "Satış",
      stokTarihi: new Date().toISOString(),
      cariTarihi: bugunYerel(),
      // AYRIŞMA 5 KAPANDI: sipariş yolu cari hareketine zaman damgası YAZMIYORDU (bu yol
      // `addCariHareketFromStok` hunisinden geçmediği için). Sonuç: aynı gün kesilen fişler
      // ekstrede yalnızca günle görünüyor, hangisinin önce olduğu anlaşılmıyordu. Cari hareketi
      // gün bazlı saklanmaya devam ediyor; `zaman` onun yanında duran ayrı bir damga.
      zaman: new Date().toISOString(),
      // Sipariş bir "kayıt para birimi"ne ayarlanmışsa cariye işlenecek tutar HER ZAMAN o para
      // biriminde ve kayıtlı kurla hesaplanır; ayarlanmamışsa kalemin KENDİ para birimi kullanılır.
      kayitParaBirimi: siparis.kayitParaBirimi || null,
      kurlar: { ...(muhasebe.kurlar || {}), ...(siparis.kayitKurlari || {}) },
      kurZorunlu: false,
      tutarYuvarla: false,
      birimFiyatBolerek: true,
      yon: hareketYonu(siparis.tip),
      kullanici: (aktifKullanici && aktifKullanici.ad) || null,
      defter,
      odemeSekli: "Nakit",
      vade: "",
      siparis: { id: siparis.id, siparisNo: siparis.siparisNo, rezervasyonSiparisId: siparis.rezervasyonSiparisId },
      kalemler: fisKalemleri,
      cariAciklama: (k, c) =>
        `${siparis.tip} Siparişi ${(k.siparis && k.siparis.siparisNo) || siparis.siparisNo}: ${olcuMetni([k.urunAd, k.renk, k.beden])} · ${k.miktar} ${k.birim}${k.fazlaGonderim ? " (sipariş fazlası)" : ""}`
        + (c.cevrildiMi ? ` (${c.hamTutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${c.kalemPB} karşılığı)` : ""),
    };
    const sonuc = fisYaz(stok, cariler, fisGovdesi2);

    // Veri bütünlüğü: aynı id'ye sahip birden fazla ürün varsa (ya da hiç yoksa) o kalem
    // işlenmez ve kullanıcı açıkça uyarılır — sessizce yanlış ürünü güncellemektense.
    sonuc.atlananlar.forEach(({ kalem, sebep }) => {
      showToast(sebep === "yok"
        ? `Uyarı: "${kalem.urunAd}" ürünü stokta bulunamadı (id: ${kalem.urunId}) — bu kalem işlenmedi.`
        : `Veri hatası: "${kalem.urunAd}" için birden fazla ürün aynı id'yi taşıyor — bu kalem işlenmedi, lütfen bildirin.`);
    });
    const atlanan = new Set(sonuc.atlananlar.map((a) => a.kalem));
    const islenenler = fisKalemleri.filter((k) => !atlanan.has(k));
    // FİŞ DEFTERİ kaydı hazırlanıyor; YAZMA dışarıda, hesap bittikten sonra (Adım 3).
    defterKaydiBekleyen = fisDefterKaydiKur(fisGovdesi2, sonuc, { kullanici: (aktifKullanici && aktifKullanici.ad) || "" });
    if (islenenler.length === 0) {
      showToast("İşlenecek bir miktar girilmedi");
      return null;
    }
    // FAZLA SEVK REDDEDİLİYOR (kullanıcı, 19 Eylül: "sevkiyat fazla yapılamasın, olmayan ürün
    // satılamaz, mantığı iyi oturtalım").
    //
    // Eskiden fazla gönderim yalnız İŞARETLENİYORDU: fiş kesiliyor, sipariş kapanıyor ve fark
    // ancak aylar sonra fatura tutmayınca görülüyordu. 136 çiftlik siparişe 160 çift çıkmıştı.
    // Artık işlem HİÇ yapılmıyor ve hangi bedende ne kadar fazla olduğu tek tek yazılıyor —
    // "sipariş aşılıyor" demek kullanıcıya nereyi düzelteceğini söylemiyordu.
    const fazlalar = islenenler.filter((k) => k.fazlaGonderim)
      .map((k) => ({ ad: k.urunAd, renk: k.renk, beden: k.beden, fazla: k.miktar - k.kalan }));
    if (fazlalar.length > 0) {
      showToast(`Sipariş aşılıyor — ${fazlalar.map((f) => `${olcuMetni([f.ad, f.renk, f.beden], " ")}: ${f.fazla} fazla`).join(" · ")}`);
      return null;
    }

    // OLMAYAN ÜRÜN SATILAMAZ: sevk edilen miktar mevcut stoğu aşamaz. Eksi stok teknik olarak
    // mümkün (açılış göçü, sayım farkı) ama SATIŞLA eksiye düşmek başka: depoda olmayan malı
    // sevk etmiş görünmek, hem müşteriye hem muhasebeye yanlış bilgi vermekti.
    // YALNIZ SATIŞTA: alış siparişinde mal GİRİYOR, stok kontrolü anlamsız (ilk denemede alış
    // teslimatı da reddedilmişti).
    const stokAsanlar = [];
    if (siparis.tip !== "Alış") islenenler.forEach((k) => {
      const urun = (stok || []).find((u) => u.id === k.urunId || u.ad === k.urunAd);
      if (!urun) return;
      const v = (urun.variants || []).find((x) => stokAnahtarNrm(x.renk) === stokAnahtarNrm(k.renk) && stokAnahtarNrm(x.beden) === stokAnahtarNrm(k.beden));
      const mevcut = v ? (v.miktar || 0) : 0;
      if (k.miktar > mevcut) stokAsanlar.push(`${olcuMetni([k.urunAd, k.renk, k.beden], " ")}: stok ${mevcut}, sevk ${k.miktar}`);
    });
    if (stokAsanlar.length > 0) {
      showToast(`Stokta yok — ${stokAsanlar.join(" · ")}`);
      return null;
    }

    const nextStok = sonuc.stok;
    const nextCariler = sonuc.cariler;

    // Her etkilenen siparişin kalemleri ve durumu kendi kaydında güncellenir. İşlenen kalemler
    // (atlananlar hariç) esas alınır.
    const islenenAnahtarlar = new Set(islenenler.map((k) => `${k._siparisId}|${k.kalemId}`));
    const etkilenenIdler = new Set(islenenler.map((k) => k._siparisId));
    const siparisiGuncelle = (s) => {
      const nextKalemler = s.kalemler.map((k) => {
        if (!islenenAnahtarlar.has(`${s.id}|${k.id}`)) return k;
        const t = teslimler.find((x) => x.kalemId === k.id && (x.siparisId || siparisId) === s.id);
        const eklenecek = t && t.miktar > 0 ? t.miktar : 0;
        // karşılanan, sipariş miktarını aşamaz (fazlalık ayrıca bildirilir), gerçek stok/cari hareketi tam miktarla işlendi
        return { ...k, karsilanan: Math.min(k.miktar, (k.karsilanan || 0) + eklenecek) };
      });
      const tumuTam = nextKalemler.every((k) => (k.karsilanan || 0) >= k.miktar);
      const hicYok = nextKalemler.every((k) => (k.karsilanan || 0) === 0);
      const yeniDurum = tumuTam ? "Tamamlandı" : hicYok ? s.durum : "Kısmi Teslim";
      return { ...s, kalemler: nextKalemler, durum: yeniDurum };
    };
    // Bu siparişin ilk teslimatında seçilen defter, sonraki tüm fişlerde varsayılan olarak hatırlanır.
    const yeniDefterTercihi = siparis.defterTercihi || defter;

    const nextSiparisler = prevSiparisler.map((s) => {
      if (s.id === siparisId) return { ...siparisiGuncelle(s), teslimSayaci: yeniSayac, defterTercihi: yeniDefterTercihi };
      if (etkilenenIdler.has(s.id)) return siparisiGuncelle(s);
      return s;
    });
    // Aşağıdaki rezervasyon uyarısı ana siparişin "tamamlandı" bilgisini kullanıyor.
    const anaSiparisSonra = nextSiparisler.find((s) => s.id === siparisId) || siparis;
    const tumuTam = anaSiparisSonra.durum === "Tamamlandı";

    // ATOMİKLİK (15 Eylül düzeltmesi): stok/cari yazımı ve depolama BURADAN kaldırıldı.
    // Hesap fonksiyonu SAF olmalı — burada `setStok` çağırmak, fiş defterine yazma başarısız
    // olsa bile stoğun değişmesi demekti; Adım 3'ün güvencesi yarım kalıyordu.

    // Bu Alış siparişi bir satış siparişi için rezerve edilmişti ama teslim alınana kadar o satış
    // BAŞKA şekilde (mevcut stoktan) zaten karşılanmış olabilir. Böyle bir çakışma varsa kullanıcıyı
    // açıkça bilgilendiriyoruz — teslim alınan ürün zaten genel stoğa eklendi, ekstra işlem gerekmez.
    let rezervasyonUyarisi = "";
    // hammaddeTalebiMi olan alışlarda bu kontrol ANLAMSIZDIR: kalemler HAMMADDEDİR, bağlı satış
    // siparişinin kalemleri ise MAMUL — urunId'ler hiçbir zaman eşleşmez, dolayısıyla kontrol ya
    // sessizce hiçbir şey bulmaz ya da (aynı ürün hem satılıp hem girdi olarak kullanılıyorsa)
    // yanıltıcı bir uyarı üretirdi. Bu yüzden hammadde alışları buradan hariç tutulur.
    if (tumuTam && siparis.tip === "Alış" && siparis.rezervasyonSiparisId && !siparis.hammaddeTalebiMi) {
      const bagliSatis = prevSiparisler.find((s) => s.id === siparis.rezervasyonSiparisId);
      if (bagliSatis) {
        const ilgiliUrunIdler = new Set(siparis.kalemler.map((k) => k.urunId));
        const ilgiliKalemler = bagliSatis.kalemler.filter((k) => ilgiliUrunIdler.has(k.urunId));
        const hepsiKarsilanmis = ilgiliKalemler.length > 0 && ilgiliKalemler.every((k) => (k.karsilanan || 0) >= k.miktar);
        if (hepsiKarsilanmis) {
          rezervasyonUyarisi = ` — ⚠ Bu satın alma "${bagliSatis.siparisNo}" siparişi için rezerve edilmişti, ama o sipariş teslim alınmadan önce zaten (stoktan) karşılanmış. Alınan ürün genel stoğa eklendi, başka bir sipariş için kullanılabilir.`;
        }
      }
    }

    return { nextSiparisler, nextStok, nextCariler, sonuc, islenenler, fisGovdesi2, siparis, etkilenenIdler, yeniSayac, tumuTam, rezervasyonUyarisi, bildirim: fazlalar.length > 0
      ? `${fisNo} · Sipariş fazlası gönderildi: ${fazlalar.map((f) => `${olcuMetni([f.ad, f.renk, f.beden], " ")} (+${f.fazla})`).join(", ")}${rezervasyonUyarisi}`
      : `${fisNo} kaydedildi — ${tumuTam ? "Sipariş tamamlandı" : "Kısmi teslim/tahsil işlendi, eksik var"}${rezervasyonUyarisi}` };
  })();

  // ---- ATOMİK KAPI (Adım 3, 15 Eylül) ----
  // Hesap bitti, hiçbir state'e dokunulmadı. Önce FİŞ DEFTERİ; yazılamazsa çıkılır ve sipariş,
  // stok, cari, koli — hiçbiri değişmez.
  // DÖNÜŞ DEĞERİ (22 Eylül, v1.415.0): çağıran işin OLUP OLMADIĞINI bilmeli. Depo > Sevkiyat
  // ekranı okutulan koliyi ancak sevk gerçekleştiyse listeden düşürüyor; defter reddederse koli
  // listede kalmalı. Uyarıyı yine bu kapı veriyor, çağıran yalnız true/false'a bakıyor.
  if (!hesap) return false;
  if (sunucuYolu) return siparisTeslimSunucuyaKes({ hesap, defterKaydi: defterKaydiBekleyen, koliIdler });
  if (!hesap) return false;
  if (defterKaydiBekleyen && !(await fisDefterineKayitYaz(defterKaydiBekleyen))) return false;

  const { nextSiparisler, nextStok, nextCariler, bildirim } = hesap;
  // GÜNCEL LİSTEYE YALNIZ DEĞİŞENLER (v1.639.0, denetim): defter yazımı beklenirken (yukarıdaki await) başka pencerede/
  // cihazdan gelen değişiklik tam liste set edilince eziliyor, buluta eski hâl gidiyordu. Her tablo kendi güncelleyicisinde
  // birleşir ve yazılır (`tabloYaz` zaten sıraya alıp yeniden deniyor; 100-app `yazimiIzle` hatayı şeride taşır).
  // Sipariş (karşılanan), stok çıkışı ve cari (satış) TEK ZARFTA (v1.727.0 / v1.728.0): üç güncelleyici aynı çizimde çalışır.
  const zarf = yazmaZarfi(["siparisler", "urunler", "cariler"]);
  setSiparisler((onceki) => { const n = degisenKayitlariBirlestir(onceki, siparisler, nextSiparisler); yazimiIzle(tabloYaz("siparis:data", "siparisler", n, undefined, { zarf }), "Siparişler", n); return n; });   // bayat-muaf: bekleme öncesi fotoğraf BİLEREK — farkın tabanı, güncel liste `onceki`
  if (koliIslemi) koliIslemi();
  setStok((onceki) => { const n = degisenKayitlariBirlestir(onceki, stok, nextStok); yazimiIzle(tabloYaz("stok:items", "urunler", n, undefined, { zarf }), "Stok kartları", n); return n; });   // bayat-muaf: farkın tabanı (yukarıdaki gerekçe)
  setCariler((onceki) => { const n = degisenKayitlariBirlestir(onceki, cariler, nextCariler); yazimiIzle(tabloYaz("cari:data", "cariler", n, undefined, { zarf }), "Cari kartları", n); return n; });   // bayat-muaf: farkın tabanı (yukarıdaki gerekçe)
  showToast(bildirim);
  return true;
}, [siparisler, stok, cariler, showToast, muhasebe, aktifKullanici, koliler, saveKoliler, fisDefterineKayitYaz, tanimlar, siparisTeslimSunucuyaKes]);

  return siparisGerceklestir;
}
