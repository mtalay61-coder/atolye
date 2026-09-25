// ================= AD DEĞİŞTİRME (ÖLÇÜ VE RENK) =================
//
// 19 Eylül (2. madde, 9. tur): App'ten çıkarılan dokuzuncu parça.
//
// NEDEN BU KADAR YER TUTUYOR: bir bedenin ya da rengin adı değiştiğinde SEKİZ yerde birden
// hizalanması gerekiyor — ürün varyantları, reçete satırları, stok hareketleri, sipariş kalemleri,
// üretim beden dağılımları ve proses atamaları, koli kalemleri, asorti oranları, rezervasyonlar.
// Yoksa "41" ile "41 " iki ayrı beden olur ve üretim/stok eşleşmesi kopar.
//
// Eşleştirme büyük/küçük harf ve boşluk farkını yok sayar: kullanıcının gözünde aynı olan iki
// yazım, sistemde de aynı olmalı.
function useAdDegistirme(d) {
  const {
    tanimlar, stok, siparisler, uretim, koliler, stokRezervasyonlari, showToast,
    setStok, setSiparisler, setUretim, saveTanimlar, saveKoliler,
    setTanimlar, setKoliler, setStokRezervasyonlari, cariler,
  } = d;

const olcuAdDegistir = useCallback((olcuId, yeniAdHam) => {
  const yeniAd = String(yeniAdHam || "").trim();
  const eski = (tanimlar.bedenler || []).find((b) => b.id === olcuId);
  if (!eski || !yeniAd || eski.ad === yeniAd) return;
  const eskiAd = eski.ad;
  const ayniTipte = (tanimlar.bedenler || []).some((b) => b.id !== olcuId && (b.tip || "Beden") === (eski.tip || "Beden")
    && String(b.ad || "").toLocaleLowerCase("tr-TR") === yeniAd.toLocaleLowerCase("tr-TR"));
  if (ayniTipte) { showToast(`"${yeniAd}" zaten tanımlı`); return; }

  const nrm = (x) => String(x == null ? "" : x).trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
  const es = (deger) => nrm(deger) === nrm(eskiAd);
  const cevir = (deger) => (es(deger) ? yeniAd : deger);

  const nextTanimlar = {
    ...tanimlar,
    bedenler: (tanimlar.bedenler || []).map((b) => (b.id === olcuId ? { ...b, ad: yeniAd } : b)),
    // Beden grupları da ADLA tutuluyor (14. bölüm).
    bedenGruplari: (tanimlar.bedenGruplari || []).map((g) => ({
      ...g, bedenler: (g.bedenler || []).map((b) => (es(b) ? yeniAd : b)),
    })),
    // Asorti oranları beden ADIYLA tutuluyor.
    asortiler: (tanimlar.asortiler || []).map((a) => ({
      ...a,
      oranlar: Array.isArray(a.oranlar) ? a.oranlar.map((o) => (es(o.beden) ? { ...o, beden: yeniAd } : o)) : a.oranlar,
    })),
  };
  setTanimlar(nextTanimlar);
  yazimiIzle(tekilYaz("tanimlar:data", "tanimlar", nextTanimlar), "Tanımlar", nextTanimlar);

  const nextStok = stok.map((p) => {
    const variants = (p.variants || []).map((v) => (es(v.beden) ? { ...v, beden: yeniAd } : v));
    const recete = (p.recete || []).map((r) => (es(r.beden) || es(r.mamulBeden)
      ? { ...r, beden: cevir(r.beden), mamulBeden: cevir(r.mamulBeden) } : r));
    const hareketler = (p.hareketler || []).map((h) => (es(h.beden) ? { ...h, beden: yeniAd } : h));
    // `map` her zaman yeni dizi döndürüyor; içerik gerçekten değiştiyse yaz.
    const degisti = variants.some((v, i) => v !== (p.variants || [])[i])
      || recete.some((r, i) => r !== (p.recete || [])[i])
      || hareketler.some((h, i) => h !== (p.hareketler || [])[i]);
    return degisti ? { ...p, variants, recete, hareketler } : p;
  });
  const nextSiparisler = siparisler.map((sp) => {
    const kalemler = (sp.kalemler || []).map((k) => (es(k.beden) ? { ...k, beden: yeniAd } : k));
    return kalemler.some((k, i) => k !== (sp.kalemler || [])[i]) ? { ...sp, kalemler } : sp;
  });
  const nextUretim = uretim.map((u) => {
    const bedenMiktarlari = (u.bedenMiktarlari || []).map((b) => (es(b.beden) ? { ...b, beden: yeniAd } : b));
    const prosesIlerleme = (u.prosesIlerleme || []).map((adim) => ({
      ...adim,
      atamalar: (adim.atamalar || []).map((at) => {
        if (!at.bedenMiktarlari) return at;
        const yeniBM = {};
        Object.entries(at.bedenMiktarlari).forEach(([b, m]) => { yeniBM[es(b) ? yeniAd : b] = m; });
        return { ...at, bedenMiktarlari: yeniBM };
      }),
    }));
    return { ...u, beden: cevir(u.beden), bedenMiktarlari, prosesIlerleme };
  });
  const nextKoliler = (koliler || []).map((k) => ({
    ...k, kalemler: (k.kalemler || []).map((x) => (es(x.beden) ? { ...x, beden: yeniAd } : x)),
  }));

  setStok(nextStok); yazimiIzle(tabloYaz("stok:items", "urunler", nextStok), "Stok kartları", nextStok);
  setSiparisler(nextSiparisler); yazimiIzle(tabloYaz("siparis:data", "siparisler", nextSiparisler), "Siparişler", nextSiparisler);
  setUretim(nextUretim); yazimiIzle(tabloYaz("uretim:siparisler", "uretim", nextUretim), "Üretim", nextUretim);
  setKoliler(nextKoliler); yazimiIzle(tekilYaz("koli:data", "koliler", nextKoliler), "Koliler", nextKoliler);

  gunlukYaz(`Ölçü adı değişti: ${eskiAd} → ${yeniAd}`, "tanimlar", { olcuId });
  showToast(`"${eskiAd}" → "${yeniAd}" · kayıtlar hizalandı`);
}, [tanimlar, stok, siparisler, uretim, koliler, showToast]);

// KAYITLARDA GEÇEN ÖLÇÜLER (14 Eylül): Tanımlar "tanımsız ölçüler" bölümü için — hangi ad kaç
// kayıtta geçiyor. Ürün varyantı, reçete, stok hareketi, sipariş kalemi, üretim beden dağılımı.
// `useMemo` içe aktarılmadığı için düz hesap: listeler büyüdüğünde her render'da dolaşmak yerine
// Tanımlar ekranı açıkken zaten seyrek render var; yine de ucuz (tek geçiş).
const kullanimdakiOlculer = (() => {
  const sayac = new Map();
  const ekle = (ad) => { const n = String(ad == null ? "" : ad).trim(); if (n) sayac.set(n, (sayac.get(n) || 0) + 1); };
  stok.forEach((p) => {
    (p.variants || []).forEach((v) => ekle(v.beden));
    (p.recete || []).forEach((r) => { ekle(r.beden); ekle(r.mamulBeden); });
    (p.hareketler || []).forEach((h) => ekle(h.beden));
  });
  siparisler.forEach((s2) => (s2.kalemler || []).forEach((k) => ekle(k.beden)));
  uretim.forEach((u) => (u.bedenMiktarlari || []).forEach((b) => ekle(b.beden)));
  return [...sayac.entries()].map(([ad, sayi]) => ({ ad, sayi }));
})();

// Tanımsız bir ölçüyü TANIMLI bir ölçüyle birleştirme: `olcuAdDegistir`in kimliksiz kardeşi.
// Geçici bir tanım kaydı eklenip adı değiştirilmiyor; doğrudan kayıtlar hizalanıyor.
const tanimsizOlcuCevir = useCallback((eskiAdHam, yeniAdHam) => {
  const eskiAd = String(eskiAdHam || "").trim(), yeniAd = String(yeniAdHam || "").trim();
  if (!eskiAd || !yeniAd || eskiAd === yeniAd) return;
  const nrm = (x) => String(x == null ? "" : x).trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
  const es = (d) => nrm(d) === nrm(eskiAd);
  const cevir = (d) => (es(d) ? yeniAd : d);
  const nextStok = stok.map((p) => ({
    ...p,
    variants: (p.variants || []).map((v) => (es(v.beden) ? { ...v, beden: yeniAd } : v)),
    recete: (p.recete || []).map((r) => (es(r.beden) || es(r.mamulBeden) ? { ...r, beden: cevir(r.beden), mamulBeden: cevir(r.mamulBeden) } : r)),
    hareketler: (p.hareketler || []).map((h) => (es(h.beden) ? { ...h, beden: yeniAd } : h)),
  }));
  const nextSiparisler = siparisler.map((sp) => ({ ...sp, kalemler: (sp.kalemler || []).map((k) => (es(k.beden) ? { ...k, beden: yeniAd } : k)) }));
  const nextUretim = uretim.map((u) => ({
    ...u, beden: cevir(u.beden),
    bedenMiktarlari: (u.bedenMiktarlari || []).map((b) => (es(b.beden) ? { ...b, beden: yeniAd } : b)),
    prosesIlerleme: (u.prosesIlerleme || []).map((adim) => ({
      ...adim,
      atamalar: (adim.atamalar || []).map((at) => {
        if (!at.bedenMiktarlari) return at;
        const yeniBM = {};
        Object.entries(at.bedenMiktarlari).forEach(([b, m]) => { yeniBM[es(b) ? yeniAd : b] = m; });
        return { ...at, bedenMiktarlari: yeniBM };
      }),
    })),
  }));
  const nextKoliler = (koliler || []).map((k) => ({ ...k, kalemler: (k.kalemler || []).map((x) => (es(x.beden) ? { ...x, beden: yeniAd } : x)) }));
  setStok(nextStok); yazimiIzle(tabloYaz("stok:items", "urunler", nextStok), "Stok kartları", nextStok);
  setSiparisler(nextSiparisler); yazimiIzle(tabloYaz("siparis:data", "siparisler", nextSiparisler), "Siparişler", nextSiparisler);
  setUretim(nextUretim); yazimiIzle(tabloYaz("uretim:siparisler", "uretim", nextUretim), "Üretim", nextUretim);
  setKoliler(nextKoliler); yazimiIzle(tekilYaz("koli:data", "koliler", nextKoliler), "Koliler", nextKoliler);
  gunlukYaz(`Tanımsız ölçü birleştirildi: ${eskiAd} → ${yeniAd}`, "tanimlar", {});
  showToast(`"${eskiAd}" → "${yeniAd}" · kayıtlar hizalandı`);
}, [stok, siparisler, uretim, koliler, showToast]);

// EKSİK STOK HAREKETİNİ FİŞTEN YENİDEN YAZ (15 Eylül — Veri Denetimi onarımı).
//
// Durum: siparişin kalemi "karşılandı" (fiş kesildi, cari hareketi var) ama stok hareketi yok —
// bulut yazımı yarım kalmış ya da kayıt silinmişti. Fişin kimliği cari hareketlerinden
// (siparisId eşleşen, fişli) bulunur; eksik kadar hareket AYNI fiş numarasıyla yazılır ve varyant
// miktarı düzeltilir. Yalnız "siparişte var, stokta yok" yönü onarılır: fazla hareket hangisinin
// mükerrer olduğunu bilmeyi gerektirir, o elle bakılacak iş.
const eksikHareketOnar = useCallback((eksikler) => {
  let nextStok = stok;
  let yazilan = 0;
  const gunlukSatirlari = [];
  eksikler.forEach(({ siparisId, kalemId, eksik }) => {
    const sip = siparisler.find((x) => x.id === siparisId);
    const kalem = sip && (sip.kalemler || []).find((k) => k.id === kalemId);
    if (!sip || !kalem || !(eksik > 0)) return;
    const cari = cariler.find((c) => c.id === sip.cariId);
    // Fiş: bu siparişe bağlı en son fişli cari hareketi; yoksa sipariş numarasından türetilen ad.
    const fisliHareket = ((cari && cari.hareketler) || [])
      .filter((h) => h.fisNo && (h.siparisId ? h.siparisId === sip.id : h.siparisNo === sip.siparisNo))
      .sort((x, y) => String(y.tarih || "").localeCompare(String(x.tarih || "")))[0];
    const fisNo = (fisliHareket && fisliHareket.fisNo) || `${sip.siparisNo}-F${sip.teslimSayaci || 1}`;
    const tarih = (fisliHareket && fisliHareket.tarih) || bugunYerel();
    const alisMi = sip.tip === "Alış";
    nextStok = nextStok.map((p) => {
      if (p.id !== kalem.urunId) return p;
      const hareket = {
        id: uid("hrk"), tarih, renk: kalem.renk, beden: kalem.beden,
        miktar: alisMi ? eksik : -eksik,
        kaynak: alisMi ? "Satınalma" : "Satış",
        cariId: sip.cariId, fisNo, siparisNo: sip.siparisNo, siparisId: sip.id, kalemId: kalem.id,
        aciklama: "Onarım: eksik hareket fişten yeniden yazıldı",
      };
      const variants = (p.variants || []).some((v) => v.renk === kalem.renk && v.beden === kalem.beden)
        ? (p.variants || []).map((v) => (v.renk === kalem.renk && v.beden === kalem.beden ? { ...v, miktar: stokYuvarla((v.miktar || 0) + hareket.miktar) } : v))
        : [...(p.variants || []), { renk: kalem.renk, beden: kalem.beden, miktar: hareket.miktar }];
      yazilan++;
      gunlukSatirlari.push(`${sip.siparisNo} ${kalem.urunAd} ${kalem.renk}/${kalem.beden} ${hareket.miktar}`);
      return { ...p, variants, hareketler: [...(p.hareketler || []), hareket] };
    });
  });
  if (yazilan === 0) { showToast("Onarılacak eksik hareket bulunamadı"); return; }
  setStok(nextStok);
  yazimiIzle(tabloYaz("stok:items", "urunler", nextStok), "Stok kartları", nextStok);
  gunlukYaz(`Onarım: ${yazilan} eksik stok hareketi fişten yeniden yazıldı`, "denetim", { satirlar: gunlukSatirlari });
  showToast(`${yazilan} eksik stok hareketi fişten yeniden yazıldı; stok düzeltildi`);
}, [stok, siparisler, cariler, showToast]);

// DEFTERDEN YENİDEN KUR (Adım 2, 15 Eylül). Defter doğruluğun kaynağı: iptal edilmemiş bir fişin
// stok hareketi stokta yoksa BİREBİR geri yazılır — miktar, tarih, fiş no, sipariş bağı, hareket
// kimliği dahil. "Fişten yeniden yaz" (21) siparişin fişinden TÜRETİYORDU; bu ise kayıttan
// kopyalıyor, tahmin yok. Varyant miktarı da hareketin yönüne göre düzeltilir.
//
// Sipariş `karsilanan`ına DOKUNULMAZ: bu onarım kayıp hareketi geri koyar; karşılanan zaten
// hareketlerle karşılaştırılıp ayrıca denetleniyor (2. kural). İki onarımın aynı sayıyı iki kez
// düzeltmesi, eksik bırakmaktan daha tehlikeli olurdu.
const defterdenYenidenKur = useCallback((kayitlar) => {
  let nextStok = stok;
  let yazilan = 0;
  const gunluk = [];
  kayitlar.forEach(({ fisNo, hareket }) => {
    if (!hareket || !hareket.urunId) return;
    nextStok = nextStok.map((p) => {
      if (p.id !== hareket.urunId) return p;
      if ((p.hareketler || []).some((h) => h.id === hareket.id)) return p;   // zaten var
      const { urunId, urunAd, ...temiz } = hareket;
      const variants = (p.variants || []).some((v) => v.renk === hareket.renk && v.beden === hareket.beden)
        ? (p.variants || []).map((v) => (v.renk === hareket.renk && v.beden === hareket.beden
            ? { ...v, miktar: stokYuvarla((v.miktar || 0) + (hareket.miktar || 0)) } : v))
        : [...(p.variants || []), { renk: hareket.renk, beden: hareket.beden, miktar: hareket.miktar || 0 }];
      yazilan++;
      gunluk.push(`${fisNo} ${p.ad} ${hareket.renk}/${hareket.beden} ${hareket.miktar}`);
      return { ...p, variants, hareketler: [...(p.hareketler || []), temiz] };
    });
  });
  if (yazilan === 0) { showToast("Geri yazılacak hareket bulunamadı (hepsi zaten yerinde)"); return; }
  setStok(nextStok);
  yazimiIzle(tabloYaz("stok:items", "urunler", nextStok), "Stok kartları", nextStok);
  gunlukYaz(`Defterden yeniden kuruldu: ${yazilan} stok hareketi`, "denetim", { satirlar: gunluk });
  showToast(`${yazilan} hareket fiş defterinden birebir geri yazıldı`);
}, [stok, showToast]);

const hammaddeRenkAdDegistir = useCallback((renkId, yeniAdHam) => {
  const yeniAd = yeniAdHam.trim();
  const eskiRenk = tanimlar.renkler.find((r) => r.id === renkId);
  if (!eskiRenk || eskiRenk.ad === yeniAd) return;
  const eskiAd = eskiRenk.ad;

  // Bu rengi içeren her model rengi kombinasyonu için eski/yeni etiketi hesapla.
  const etiketEslesmeleri = (tanimlar.renkKombinasyonlari || [])
    .filter((k) => k.renkIdler.includes(renkId))
    .map((k) => {
      const adGetir = (id, kullanilacakAd) =>
        id === renkId ? kullanilacakAd : ((tanimlar.renkler.find((r) => r.id === id) || {}).ad || "?");
      const eskiEtiket = `${k.kod} - ${k.renkIdler.map((id) => adGetir(id, eskiAd)).join("/")}`;
      const yeniEtiket = `${k.kod} - ${k.renkIdler.map((id) => adGetir(id, yeniAd)).join("/")}`;
      return { eskiEtiket, yeniEtiket };
    });

  const nextTanimlar = { ...tanimlar, renkler: tanimlar.renkler.map((r) => (r.id === renkId ? { ...r, ad: yeniAd } : r)) };
  setTanimlar(nextTanimlar);
  yazimiIzle(tekilYaz("tanimlar:data", "tanimlar", nextTanimlar), "Tanımlar", nextTanimlar);

  // Rengin DOĞRUDAN kullanıldığı yerler de eşlemeye eklenir.
  //
  // Önceki sürüm yalnızca KOMBİNASYON etiketlerini ("1010 - Bej/Siyah") güncelliyordu. Ama bir
  // renk çoğu zaman doğrudan kullanılıyor: hammadde varyantı "T-28", reçete satırının hammadde
  // rengi "T-28", stok hareketi "T-28". Bu kayıtlar eski adla kalıyor ve renk iki farklı isimle
  // var olmaya başlıyordu — eşleşme kurulamadığı için üretim malzemeyi bulamıyor.
  //
  // Kombinasyonu olmayan bir rengi yeniden adlandırmak, hiçbir şeyi güncellemiyordu.
  const tumEslesmeler = [...etiketEslesmeleri, { eskiEtiket: eskiAd, yeniEtiket: yeniAd }];

  // Eşleştirme BÜYÜK/KÜÇÜK HARF ve BOŞLUK farkını yok sayar.
  //
  // Sebebi: geçmişte başarısız kalmış bir yeniden adlandırma, kayıtları öksüz bırakabiliyor —
  // tanımda "T-28", stokta "t-28". Sonraki denemede tam eşleşme aranırsa hiçbir şey bulunamaz
  // ve kullanıcı "değiştirdim ama olmadı" der. Oysa "t-28" ile "T-28" aynı renktir.
  //
  // Bu, aynı zamanda kopuklukları KENDİLİĞİNDEN onarır: bir kez yeniden adlandırınca
  // eski yazımdaki tüm kayıtlar yeni ada hizalanır.
  const normalize = (x) => String(x || "").trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
  const eslesmeBul = (deger) => {
    const n = normalize(deger);
    return tumEslesmeler.find((e) => normalize(e.eskiEtiket) === n);
  };

  // Kaç kayıt güncellendiği SAYILIR ve kullanıcıya söylenir.
  //
  // "senkronize edildi" demek, hiçbir şey bulunamadığında da aynı görünüyordu; kullanıcı
  // değişikliğin işe yarayıp yaramadığını anlayamıyordu. Sayı görünce belli oluyor:
  // 0 ise eşleşme yok demektir ve sebebi aranabilir.
  let guncellenenSayisi = 0;

  if (tumEslesmeler.length > 0) {
    const nextStok = stok.map((p) => {
      let degisti = false;
      let nextVariants = p.variants;
      let nextRenkResimleri = p.renkResimleri;
      let nextRecete = p.recete;
      let nextHareketler = p.hareketler;
      tumEslesmeler.forEach(({ eskiEtiket, yeniEtiket }) => {
        // KİMLİK ÖNCELİKLİ EŞLEŞTİRME.
        //
        // Kayıt damgalanmışsa kimlikle bulunur: ad ne kadar bozuk olursa olsun doğru kaydı
        // yakalar ve önbellekteki adı tazeler. Damgalanmamış eski kayıtlar için ada düşülür.
        //
        // Bu, "tanımda T-283 ama stokta t-28" gibi kopuklukların bir daha oluşmamasını sağlar:
        // kimlik metinden bağımsızdır.
        const es = (deger) => normalize(deger) === normalize(eskiEtiket);
        const kimlikEs = (v) => (v.renkId ? v.renkId === renkId : es(v.renk));

        if (nextVariants.some((v) => kimlikEs(v))) {
          degisti = true;
          nextVariants = nextVariants.map((v) =>
            kimlikEs(v) ? { ...v, renk: yeniEtiket, renkId: renkId } : v
          );
        }
        // Görsel anahtarı da farklı yazımda olabilir; tam eşleşme yerine tarayarak bulunur.
        const gorselAnahtar = Object.keys(nextRenkResimleri || {}).find((k) => es(k));
        if (gorselAnahtar) {
          degisti = true;
          const { [gorselAnahtar]: gorsel, ...kalan } = nextRenkResimleri;
          nextRenkResimleri = { ...kalan, [yeniEtiket]: gorsel };
        }
        // Reçetede renk İKİ ALANDA geçiyor: mamulRenk (hangi model rengi için) ve
        // renk (hangi hammadde rengi kullanılacak). İkincisi atlanınca üretim, adı
        // değişmiş hammaddeyi bulamıyordu.
        // Reçetede iki ayrı renk alanı var; her biri kendi kimliğiyle eşleştirilir.
        const receteHamEs = (r) => (r.renkId ? r.renkId === renkId : es(r.renk));
        const receteMamulEs = (r) => (r.mamulRenkId ? r.mamulRenkId === renkId : es(r.mamulRenk));
        if ((nextRecete || []).some((r) => receteMamulEs(r) || receteHamEs(r))) {
          degisti = true;
          nextRecete = nextRecete.map((r) => ({
            ...r,
            mamulRenk: receteMamulEs(r) ? yeniEtiket : r.mamulRenk,
            mamulRenkId: receteMamulEs(r) ? renkId : r.mamulRenkId,
            renk: receteHamEs(r) ? yeniEtiket : r.renk,
            renkId: receteHamEs(r) ? renkId : r.renkId,
          }));
        }
        // Stok hareketleri de güncellenmeli: aksi halde geçmiş, artık var olmayan bir
        // renk adına bakar ve varyant eşleşmesi kurulamaz (defter tutmaz).
        if ((nextHareketler || []).some((h) => es(h.renk))) {
          degisti = true;
          nextHareketler = nextHareketler.map((h) => (es(h.renk) ? { ...h, renk: yeniEtiket } : h));
        }
      });
      if (degisti) guncellenenSayisi++;
      return degisti ? { ...p, variants: nextVariants, renkResimleri: nextRenkResimleri, recete: nextRecete, hareketler: nextHareketler } : p;
    });
    setStok(nextStok);
    yazimiIzle(tabloYaz("stok:items", "urunler", nextStok), "Stok kartları", nextStok);

    const nextSiparisler = siparisler.map((s) => {
      let degisti = false;
      const nextKalemler = s.kalemler.map((k) => {
        const eslesme = eslesmeBul(k.renk);
        if (!eslesme) return k;
        degisti = true;
        return { ...k, renk: eslesme.yeniEtiket };
      });
      return degisti ? { ...s, kalemler: nextKalemler } : s;
    });
    setSiparisler(nextSiparisler);
    yazimiIzle(tabloYaz("siparis:data", "siparisler", nextSiparisler), "Siparişler", nextSiparisler);

    const nextUretim = uretim.map((o) => {
      const eslesme = eslesmeBul(o.renk);
      return eslesme ? { ...o, renk: eslesme.yeniEtiket } : o;
    });
    setUretim(nextUretim);
    yazimiIzle(tabloYaz("uretim:siparisler", "uretim", nextUretim), "Üretim", nextUretim);

    // Stok rezervasyonları da renk taşıyor. Güncellenmezse rezervasyon, adı değişmiş
    // hammaddeyle eşleşmez ve talep karşılanmamış görünür.
    const nextRez = stokRezervasyonlari.map((r) => {
      const eslesme = eslesmeBul(r.renk);
      return eslesme ? { ...r, renk: eslesme.yeniEtiket } : r;
    });
    if (nextRez.some((r, i) => r !== stokRezervasyonlari[i])) {
      setStokRezervasyonlari(nextRez);
      yazimiIzle(tabloYaz("stokrez:data", "stok_rezervasyonlari", nextRez), "Stok rezervasyonları", nextRez);
    }
  }

  showToast(
    guncellenenSayisi > 0
      ? `Renk adı "${eskiAd}" → "${yeniAd}" — ${guncellenenSayisi} üründe güncellendi`
      : `Renk adı "${eskiAd}" → "${yeniAd}" olarak değişti. Hiçbir üründe kullanılmıyordu.`
  );
}, [tanimlar, stok, siparisler, uretim, stokRezervasyonlari, showToast]);

  // Blok içinde duran onarım/çevirme işleri de buradan veriliyor: ikisi de AD/ÖLÇÜ hizalamasıyla
  // aynı aileden — "kayıtlar birbirini tutmuyorsa düzelt" işi.
  return {
    olcuAdDegistir, kullanimdakiOlculer, hammaddeRenkAdDegistir,
    defterdenYenidenKur, eksikHareketOnar, tanimsizOlcuCevir,
  };
}
