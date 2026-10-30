// ================= CARİ KARTINDAN FİŞ KESME =================
//
// 19 Eylül (2. madde, 5. tur): App'ten çıkarılan beşinci parça. Cari kartındaki "Alış Fişi" /
// "Satış Fişi" ekranından gelen kayıt yolu.
//
// KURALLAR (pahalıya öğrenilenler):
//   • Fiş SİPARİŞ OLUŞTURMAZ: fiş olmuş bir işin belgesidir (mal elde, borç doğdu); sipariş
//     gelecek bir malı anlatır. İkisini karıştırmak, kapanmış işi açık sipariş gibi göstermekti.
//   • TEK FİŞ NUMARASI bütün kalemleri bağlar ve cari tarafına TEK hareket yazılır — ekstre belge
//     bazlı okunur; üç malzemelik bir alışverişin üç ayrı satır olarak görünmesi değil.
//   • Defter yazılamazsa hiçbir türev tabloya dokunulmaz (atomik kapı, 22. bölüm).
// SİPARİŞE BAĞLI KALEMLERİN YENİ HÂLİ (saf) — iki yol da kullanır: fişin karşıladığı miktar kaleme eklenir, durum güncellenir.
function fisSiparisleriGuncelle(siparisListesi, bagliKalemler) {
  return (siparisListesi || []).map((s) => {
    const benim = bagliKalemler.filter((k) => k.siparis.id === s.id);
    if (benim.length === 0) return s;
    const nextKalemler = s.kalemler.map((k) => {
      const eklenecek = benim.filter((b) => b.kalemId === k.id).reduce((t, b) => t + (b.miktar || 0), 0);
      return eklenecek > 0 ? { ...k, karsilanan: Math.min(k.miktar, (k.karsilanan || 0) + eklenecek) } : k;
    });
    const tumuTam = nextKalemler.every((k) => (k.karsilanan || 0) >= k.miktar);
    const hicYok = nextKalemler.every((k) => (k.karsilanan || 0) === 0);
    return { ...s, kalemler: nextKalemler, durum: tumuTam ? "Tamamlandı" : hicYok ? s.durum : "Kısmi Teslim" };
  });
}

function stokFisiSunucuYuku({ cariId, tip, fis, fisGovdesi, sonuc, kalemler, kayitPB, fisAciklamasi, siparisler, kullaniciAd, zaman, istek }) {
  const alisMi = tip === "Alış";
  const kimlikler = new Set([...(sonuc.kimlikler || new Map()).values()]);
  // Cari satırlarına huninin (100 addCariHareketFromStok) damgası: kimlik, zaman, kullanıcı.
  const damgali = (sonuc.cariHareketleri || []).map((h) => ({
    ...h, id: h.id || uid("hrk"), fisNo: FIS_YER, zaman: h.zaman || zaman, kullanici: h.kullanici || kullaniciAd,
    islemTipi: h.islemTipi || undefined,
  }));
  const pesin = sonuc.pesinHareket && sonuc.pesinHareket.hesapId ? sonuc.pesinHareket : null;
  const pesinMi = (h) => pesin && h.muhasebeBagId && h.muhasebeBagId === pesin.bagId;
  // Makbuzun satırları: kendi numarası «FIS», fişe atıfları «ANAFIS».
  const makbuzYap = (x) => ({ ...JSON.parse(JSON.stringify(x).split(FIS_YER).join(ANA_FIS_YER)), fisNo: FIS_YER });
  const anaCari = damgali.filter((h) => !pesinMi(h));
  const makbuzCari = damgali.filter(pesinMi).map(makbuzYap);
  const makbuzKasa = pesin ? makbuzYap(pesin.hareket) : null;
  const toplamTutar = stokYuvarla(anaCari.filter((h) => h.defter !== "Resmi").reduce((t, h) => t + (h.tutar || 0), 0));
  const defterKaydi = fisDefterKaydiKur(fisGovdesi, sonuc, { kullanici: kullaniciAd || "" });

  // Sipariş kalemleri (fişe bağlı satırlar)
  const bagliKalemler = kalemler.filter((k) => k.siparis && k.siparis.id && k.kalemId);
  const yeniSiparisler = bagliKalemler.length > 0 ? fisSiparisleriGuncelle(siparisler, bagliKalemler) : siparisler;
  const etkSiparis = fisKesEtkilenen(siparisler, yeniSiparisler, [...new Set(bagliKalemler.map((k) => k.siparis.id))]);
  const altSatirlar = etkSiparis.yeniler.flatMap((s) => fisKesSiparisKalemleri(s, bagliKalemler.filter((k) => k.siparis.id === s.id).map((k) => k.kalemId)));

  const stokSatirlari = [];
  (sonuc.stok || []).forEach((u) => (u.hareketler || []).forEach((h) => { if (kimlikler.has(h.id)) stokSatirlari.push(fisKesStokSatiri(u.id, h)); }));
  const belgeNo = (fis.fisNo || "").trim();
  const yuk = {
    istek,
    fis: {
      aile: "stok", tur: tip, onek: alisMi ? "AF" : "SF", kaynak: fisGovdesi.kaynak, defter: fisGovdesi.defter, tarih: fisGovdesi.stokTarihi,
      cariId, paraBirimi: kayitPB, tutar: toplamTutar, aciklama: fisAciklamasi, kullanici: kullaniciAd, kalemler: defterKaydi.kalemler,
      ek: { odemeSekli: fisGovdesi.odemeSekli, vade: fisGovdesi.vade, ...(belgeNo ? { belgeNo } : {}), ...(fisGovdesi.resmi ? { resmi: fisGovdesi.resmi } : {}) },
    },
    stok: { satirlar: stokSatirlari },
    cari: { satirlar: anaCari.map((h) => fisKesCariSatiri(cariId, h)) },
    ...(pesin ? {
      bagli: {
        fis: { aile: "para", tur: alisMi ? "Ödeme" : "Tahsilat", onek: alisMi ? "ÖD" : "TH", defter: fisGovdesi.defter, tarih: fisGovdesi.cariTarihi,
          cariId, kasaHesapId: pesin.hesapId, paraBirimi: (makbuzCari[0] || {}).paraBirimi || kayitPB, tutar: (makbuzCari[0] || {}).tutar || null,
          aciklama: (makbuzCari[0] || {}).aciklama || null, kullanici: kullaniciAd },
        cari: { satirlar: makbuzCari.map((h) => fisKesCariSatiri(cariId, h)) },
        kasa: { hareketler: [fisKesKasaHareketi(pesin.hesapId, makbuzKasa)] },
      },
    } : {}),
    ...(altSatirlar.length ? { alt: { siparis_kalemleri: { satirlar: altSatirlar } } } : {}),
  };
  return { yuk, p: { kimlikler, anaCari, makbuzCari, makbuzKasa, pesin, toplamTutar, defterKaydi, bagliKalemler, yeniSiparisler, etkSiparis } };
}

// Sunucu numaraları gelince yerel kayıtların yeni hâli (saf): numaralar yerleşir, defter kayıtları kurulur.
function stokFisiSunucuSonucu({ p, sonuc, yuk, no, bno, cariId, fisGovdesi, kullaniciAd, zaman }) {
  const doldur = (x) => fisYerTutucuDoldur(x, no);
  const makbuzDoldur = (x) => fisYerTutucuDoldur(x, bno || no, no);
  const yeniStok = (sonuc.stok || []).map((u) => (u.hareketler || []).some((h) => p.kimlikler.has(h.id))
    ? { ...u, hareketler: u.hareketler.map((h) => (p.kimlikler.has(h.id) ? doldur(h) : h)) } : u);
  const yeniCariHareketleri = [...p.anaCari.map(doldur), ...p.makbuzCari.map(makbuzDoldur)];
  const kasaHareketi = p.pesin ? makbuzDoldur(p.makbuzKasa) : null;
  const anaKayit = { ...doldur(p.defterKaydi), id: no, fisNo: no, aile: "stok", sunucu: true, bagliFis: bno, ek: yuk.fis.ek, tutar: p.toplamTutar };
  const makbuzKaydi = bno ? {
    id: bno, fisNo: bno, aile: "para", tip: yuk.bagli.fis.tur, kaynak: yuk.bagli.fis.tur, cariId, zaman, defter: fisGovdesi.defter,
    kullanici: kullaniciAd || "", kalemler: [], stokHareketleri: [], cariHareketleri: p.makbuzCari.map(makbuzDoldur),
    kasaHareketleri: [kasaHareketi], iptal: false, iptalZamani: null, sunucu: true, bagliFis: no,
  } : null;
  return { yeniStok, yeniCariHareketleri, kasaHareketi, anaKayit, makbuzKaydi };
}

function useCariFisiKaydet(d) {
  const {
    addCariHareketFromStok, aktifKullanici, cariler, fisDefterineYaz, muhasebeyePesinIsle,
    setSiparisler, setStok, showToast, siparisler, stok, fisGeriAlRef, koliler, saveKoliler,
    setCariler, setMuhasebe, setFisDefteri,
  } = d;

// ALIŞ / SATIŞ FİŞİ — SUNUCU YOLU (v1.732.0, tek fiş defteri). Hesap `fisYaz`ın (bugünküyle aynı); yazma `fis_kes` ile TEK
// işlemde: fiş (kalemleriyle) + stok satırları + cari satırı + sipariş kalemlerinin karşılananı; peşin kısım BAĞLI MAKBUZ
// (tahsilat / ödeme fişi: kasa satırı + cari satırı). Sunucu yazınca numaralar yerleşir ve ekran güncellenir; yazamazsa
// hiçbir şey değişmez.
const stokFisiSunucuyaKes = useCallback(async ({ cariId, tip, fis, fisGovdesi, sonuc, kalemler, kayitPB, fisAciklamasi }) => {
  const alisMi = tip === "Alış";
  const kullaniciAd = (aktifKullanici && aktifKullanici.ad) || null;
  const zaman = new Date().toISOString();
  const { yuk, p } = stokFisiSunucuYuku({ cariId, tip, fis, fisGovdesi, sonuc, kalemler, kayitPB, fisAciklamasi, siparisler, kullaniciAd, zaman, istek: uid("fis") });
  const { kimlikler, pesin, toplamTutar, yeniSiparisler, etkSiparis } = p;
  // Taban için ESKİ hâller bekleme ÖNCESİ alınır (fişi hesaplayan fotoğraf — farkın tabanı o).
  const stokEskiler = (stok || []).filter((u) => kalemler.some((k) => k.urunId === u.id));
  const cariEski = (cariler || []).find((c) => c.id === cariId);
  let r;
  try {
    r = await fisKesGonder(yuk);
  } catch (e) {
    showToast(`Fiş kaydedilemedi — hiçbir değişiklik yapılmadı (${String((e && e.message) || e).slice(0, 160)})`);
    gunlukYaz(`Fiş kaydedilemedi (${tip}): ${String((e && e.message) || e).slice(0, 200)}`, "cari", { cariId });
    return null;
  }
  const no = r.fisNo;
  const bno = r.bagliFisNo || null;
  const { yeniStok, yeniCariHareketleri, kasaHareketi, anaKayit, makbuzKaydi } = stokFisiSunucuSonucu({ p, sonuc, yuk, no, bno, cariId, fisGovdesi, kullaniciAd, zaman });

  // Stok: yalnız bu fişin hareketleri numaralandı; ürünlerin yeni hâli + taban
  const stokYeniler = yeniStok.filter((u) => stokEskiler.some((e) => e.id === u.id));
  setStok((onceki) => { const next = degisenKayitlariBirlestir(onceki, stokEskiler, stokYeniler); fisKesYerelYaz("stok:items", next); return next; }, { buluttan: true });
  fisKesTabaniKur("urunler", stokEskiler, stokMiktarlariniHesapla(stokYeniler));

  // Cari: fiş satırı + makbuz satırı
  setCariler((onceki) => {
    const next = (onceki || []).map((c) => (c.id === cariId ? { ...c, hareketler: [...yeniCariHareketleri, ...(c.hareketler || [])] } : c));
    fisKesYerelYaz("cari:data", next);
    return next;
  });
  if (cariEski) fisKesTabaniKur("cariler", [cariEski], [{ ...cariEski, hareketler: [...yeniCariHareketleri, ...(cariEski.hareketler || [])] }]);

  // Kasa (peşin)
  if (pesin) {
    setMuhasebe((onceki) => { const next = hesabaHareketEkle(onceki, pesin.hesapTur, pesin.hesapId, kasaHareketi); fisKesYerelYaz("muhasebe:data", next); return next; });
    fisKesKasaTabaniKur([{ hesapTur: pesin.hesapTur, hesapId: pesin.hesapId, hareket: kasaHareketi }]);
  }

  // Sipariş: kalemler sunucuda yazıldı (taban); durum (ana satır) bugünkü yoldan
  if (etkSiparis.yeniler.length > 0) {
    fisKesTabaniKur("siparisler", etkSiparis.eskiler, etkSiparis.yeniler, { anaDahil: false });
    setSiparisler((onceki) => {
      const next = degisenKayitlariBirlestir(onceki, siparisler, yeniSiparisler);   // bayat-muaf: farkın tabanı fişi hesaplayan fotoğraf
      yazimiIzle(tabloYaz("siparis:data", "siparisler", next), "Siparişler", next);
      return next;
    });
  }

  // Fiş defteri (sunucu fişleri — eski listeye yazılmaz)
  setFisDefteri((onceki) => [anaKayit, ...(makbuzKaydi ? [makbuzKaydi] : []), ...(onceki || [])]);

  // Okutulan koliler (bugünkü yolla aynı işaret)
  const koliIdler = [...new Set(kalemler.map((k) => k.koliId).filter(Boolean))];
  if (koliIdler.length && saveKoliler) {
    saveKoliler((koliler || []).map((k) => (koliIdler.includes(k.id) ? { ...k, durum: "Sevk edildi", sevkFisNo: no, sevkZamani: zaman } : k)));
  }
  gunlukYaz(`${tip} fişi kesildi: ${no}${bno ? ` + ${bno}` : ""}`, "cari", { fisNo: no, bagliFisNo: bno, cariId, tutar: toplamTutar });
  showToast(`${alisMi ? "Alış" : "Satış"} fişi kaydedildi — ${no}${bno ? ` (+ ${alisMi ? "ödeme" : "tahsilat"} ${bno})` : ""} · ${kalemler.length} kalem · ${toplamTutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${PARA_SEMBOLU[kayitPB] || kayitPB}`, {
    geriAl: () => fisGeriAlRef && fisGeriAlRef.current && fisGeriAlRef.current(no, [
      ...kimlikler, ...yeniCariHareketleri.map((h) => h.id),
    ]),
  });
  return no;
}, [stok, cariler, siparisler, koliler, saveKoliler, aktifKullanici, showToast, fisGeriAlRef, setStok, setCariler, setMuhasebe, setSiparisler, setFisDefteri]);

const stokFisiKaydet = useCallback(async (cariId, tip, fis) => {
  const alisMi = tip === "Alış";
  const kalemler = (fis.kalemler || []).filter((k) => (k.miktar || 0) > 0);
  if (kalemler.length === 0) { showToast("Fişte kalem yok"); return; }
  if (donemKilidiEngel(fis.tarih, showToast, "Fiş")) return;

  // Kullanıcının yazdığı numara (tedarikçinin gerçek irsaliye no'su) varsa o korunur.
  // Sıra numarası: "AF-20260902-001". Rastgele son blok yerine sayılabilir bir numara —
  // muhasebede fişlerin sıralı olması bekleniyor.
  // TEK FİŞ DEFTERİ (v1.732.0, 078): sunucuda fiş defteri kuruluysa numarayı SUNUCU verir; o gelene kadar metinlerde yer
  // tutucu durur. Kullanıcının yazdığı numara (tedarikçinin belge no'su) fişin ek bilgisi olarak saklanır.
  const sunucuYolu = fisKesYolu();
  const fisNo = sunucuYolu ? FIS_YER : ((fis.fisNo || "").trim() || fisNoSiradaki(alisMi ? "AF" : "SF", tumFisNumaralari(cariler)));
  // Stok hareketi tam zaman damgası tutar (sıralama saate duyarlı), cari hareketi gün bazlı.
  // Fiş tarihi kullanıcıdan geliyor; o günün saatini uydurmak yerine kaydın girildiği an eklenir.
  const zaman = new Date().toISOString();
  // STOK ZAMANI YEREL SAATLE (v1.639.0, denetim): fişin günü (yerel) + `zaman`ın UTC saati "Z" ile birleşince yerel
  // 01:30'da kesilen fiş ertesi güne, geçmiş tarihli fiş bir gün ileriye düşüyordu. Yerel gün + yerel saat → ISO.
  const simdi = new Date();
  const ikiHane = (n) => String(n).padStart(2, "0");
  const yerelZaman = new Date(`${fis.tarih}T${ikiHane(simdi.getHours())}:${ikiHane(simdi.getMinutes())}:${ikiHane(simdi.getSeconds())}`);
  const kayitPB = fis.paraBirimi || "TRY";
  const fisAciklamasi = fis.aciklama || `${alisMi ? "Cariden Alış" : "Cariye Satış"} fişi`;

  const fisGovdesi = {
    fisNo, tip, cariId,
    kaynak: alisMi ? "Satınalma" : "Satış",
    stokTarihi: Number.isNaN(yerelZaman.getTime()) ? zaman : yerelZaman.toISOString(),
    cariTarihi: fis.tarih,
    zaman,
    kayitParaBirimi: kayitPB,
    // Kur, fişin KENDİ kayıt kurudur (`kayitKurlari`) — güncel kur değil. Kurlar sonradan
    // değişse de bu fişin tutarı kaymaz; yoksa geçmiş bir alışın borcu her gün başka görünürdü.
    kurlar: fis.kayitKurlari || {},
    kurZorunlu: true,      // sessizce eksik tutar yazmaktansa hiç yazmamak
    tutarYuvarla: true,
    birimFiyatBolerek: false,
    // Yön TEK YERDEN geliyor (bkz. `hareketYonu`): alış cariye borçlanmaktır (−),
    // satış cariden alacaklı olmaktır (+). Burada elle "Borç" yazmak, iki fiş yolunun
    // birbirinden ayrışmasına ve alış ile satışın aynı yöne gitmesine yol açmıştı.
    yon: hareketYonu(tip),
    kullanici: (aktifKullanici && aktifKullanici.ad) || null,
    defter: fis.defter || "Genel",
    resmi: fis.resmi || null,   // v1.685.0: Muhasebe defterinde Resmi PB + oran (078 kalemlere dağıtır)
    odemeSekli: fis.odemeSekli || "Nakit",
    vade: fis.vade || "",
    // PEŞİN TAHSİLAT/ÖDEME — yalnızca formda hesap seçilmişse dolu gelir. Boşsa fiş eskisi
    // gibi yalnız cari borcu yazar; varsayılan davranış değişmiyor.
    pesin: fis.pesin || null,
    siparis: null,
    kalemler,
    stokAciklama: () => `${alisMi ? "Alış" : "Satış"} fişi · ${fisNo}`,
    cariAciklama: (k, c) =>
      `${fisAciklamasi}: ${k.urunAd} · ${k.renk}${k.beden ? " · " + k.beden : ""} · ` +
      `${k.miktar} ${k.birim || ""}`.trim() +
      (c.cevrildiMi
        ? ` (${(k.birimFiyat || 0).toLocaleString("tr-TR", { maximumFractionDigits: 4 })} ${c.kalemPB}` +
          `${c.kur ? ` × ${c.kur}` : ""}${c.kurHedef ? ` ÷ ${c.kurHedef}` : ""} = ` +
          `${c.birimFiyat.toLocaleString("tr-TR", { maximumFractionDigits: 4 })} ${c.hedefPB})`
        : ""),
  };
  const sonuc = fisYaz(stok, cariler, fisGovdesi);

  if (sonuc.yazilmadi) {
    showToast(`Kur bulunamadı (${[...sonuc.cevrilemeyenler].join(", ")} → ${kayitPB}) — fiş kaydedilmedi`);
    return null;
  }

  if (sunucuYolu) return stokFisiSunucuyaKes({ cariId, tip, fis, fisGovdesi, sonuc, kalemler, kayitPB, fisAciklamasi });

  // DEFTER KAPISI: buradan geçmeyen fişin hiçbir yan etkisi uygulanmaz.
  if (!(await fisDefterineYaz(fisGovdesi, sonuc))) return null;

  // Stok ÖNCE hesaplanıp SONRA yazılıyor. Eskiden `setStok` kur kontrolünden ÖNCE çağrılıyordu:
  // kur bulunamayınca fiş "kaydedilmedi" deniyor ama MAL ZATEN STOĞA GİRMİŞ oluyordu.
  // SİPARİŞE BAĞLI KALEMLER (9b): fiş kalemi `siparis` + `kalemId` taşıyorsa o siparişin teslim
  // alınanı artar, durum güncellenir — sipariş kartından kesilen fişle aynı sonuç. Geri alma
  // `fisGeriAl`da hareketten (`siparisId|kalemId`) okunuyor, burada ek bir şey gerekmez.
  const bagliKalemler = kalemler.filter((k) => k.siparis && k.siparis.id && k.kalemId);
  // Stok, cari ve (bağlı kalem varsa) sipariş TEK ZARFTA (v1.727.0 / v1.728.0): fişin malı, borcu ve siparişin teslim alınanı
  // v2'de tek sunucu işlemiyle yazılır — biri düşüp öteki kalamaz. Cari tarafı aşağıda huniden aynı zarfla gelir.
  // Peşin kısım (kasa/banka hareketi) da aynı zarfta (v1.729.0) — Kasa & Banka v2'deyse; değilse zarf onu beklemez (040).
  const pesinVar = !!(sonuc.pesinHareket && sonuc.pesinHareket.hesapId);
  const zarf = yazmaZarfi([...(bagliKalemler.length > 0 ? ["siparisler"] : []), "urunler", "cariler", ...(pesinVar ? ["muhasebe"] : [])]);
  if (bagliKalemler.length > 0) {
    setSiparisler((prev) => {
      const next = fisSiparisleriGuncelle(prev, bagliKalemler);
      yazimiIzle(tabloYaz("siparis:data", "siparisler", next, undefined, { zarf }), "Siparişler", next);
      return next;
    });
  }
  // Güncel listeye yalnız değişen ürünler işlenir (v1.639.0, bkz. 075 `degisenKayitlariBirlestir`): defter yazımı beklenirken
  // gelen başka değişiklik ezilmesin.
  setStok((onceki) => {
    const next = degisenKayitlariBirlestir(onceki, stok, sonuc.stok);   // bayat-muaf: bekleme öncesi fotoğraf BİLEREK — farkın tabanı, güncel liste `onceki`
    yazimiIzle(tabloYaz("stok:items", "urunler", next, undefined, { zarf }), "Stok kartları", next);
    return next;
  });
  // OKUTULAN KOLİLER (23 Eylül, v1.420.0): satırlar `koliId` taşıyorsa koli "Sevk edildi"ye geçer ve
  // hangi fişle çıktığını saklar — sipariş kartından kesilen fişle AYNI işaret; `fisGeriAl` bu bağdan
  // koliyi geri "Hazır" yapıyor. Fiş defteri yazımı yukarıda tuttuğu için buraya gelindi.
  const koliIdler = [...new Set(kalemler.map((k) => k.koliId).filter(Boolean))];
  if (koliIdler.length && saveKoliler) {
    const zaman = new Date().toISOString();
    saveKoliler((koliler || []).map((k) => (koliIdler.includes(k.id) ? { ...k, durum: "Sevk edildi", sevkFisNo: fisNo, sevkZamani: zaman } : k)));
  }
  // Cari tarafı huniden geçiyor (fiş no / kimlik / zaman güvencesi orada).
  addCariHareketFromStok(cariId, sonuc.cariHareketleri, { zarf });

  // PEŞİN KISIM: kasa/banka hareketi. Cari tarafı yukarıda yazıldı (fişin açtığı borcu kapatan
  // kayıt); burada yalnız hesabın kendi defteri güncelleniyor. İkisi `muhasebeBagId` ile bağlı,
  // yani fiş geri alınınca `fisGeriAl` bu hareketi de siliyor.
  if (sonuc.pesinHareket) muhasebeyePesinIsle(sonuc.pesinHareket, { zarf });

  const toplamTutar = stokYuvarla(sonuc.cariHareketleri
    .filter((h) => h.defter !== "Resmi")
    .reduce((t, h) => t + h.tutar, 0));
  showToast(`${alisMi ? "Alış" : "Satış"} fişi kaydedildi — ${fisNo} · ${kalemler.length} kalem · ${toplamTutar.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${PARA_SEMBOLU[kayitPB] || kayitPB}`, {
    // GERİ AL HAREKET KİMLİKLERİYLE (21 Eylül): fiş defterine bakmak yetmiyordu — defter yazımı
    // beklemede kalınca fiş bulunamıyor, geri al çalışmıyordu. `fisYaz` her stok hareketinin
    // kimliğini döndürüyor (`kimlikler`); cari hareketleri de kendi kimliğiyle. Geri alma
    // doğrudan bu kimliklerle yapılıyor, deftere bağlı değil.
    geriAl: () => fisGeriAlRef && fisGeriAlRef.current && fisGeriAlRef.current(fisNo, [
      ...[...(sonuc.kimlikler || new Map()).values()],
      ...((sonuc.cariHareketleri || []).map((h) => h.id).filter(Boolean)),
    ]),
  });
  return fisNo;
}, [stok, cariler, showToast, addCariHareketFromStok, muhasebeyePesinIsle, aktifKullanici, fisDefterineYaz, fisGeriAlRef, koliler, saveKoliler, stokFisiSunucuyaKes]);

  return stokFisiKaydet;
}
