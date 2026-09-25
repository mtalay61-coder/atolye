// ================= YEDEKLEME VE GERİ YÜKLEME =================
//
// 19 Eylül (2. madde, 2. tur): `100-app.jsx`ten çıkarılan ikinci büyük parça (~258 satır).
// Otomatik yedek, yedeği uygulama, JSON dosyasından ve tarihten geri yükleme, JSON/Excel dışa
// aktarma.
//
// NEDEN KANCA (hook), saf fonksiyon değil: bu işler BÜTÜN veriyi okuyup BÜTÜN state'i yeniden
// yazıyor — yedek geri yüklemek uygulamanın her tablosuna dokunmak demek. Saf fonksiyona
// çevirmek için on bir state'i ve on bir setter'ı parametre olarak taşımak gerekirdi; kanca
// onları tek nesnede topluyor ve App'te tek satır bırakıyor.
//
// KURAL KORUNDU: geri yükleme her tabloyu tek tek yazıyor ve her birinin sonucunu bekliyor —
// yarım kalan bir geri yükleme, yedeği olmayan bir veriden kötüdür.
// Kaç günde bir otomatik yedek alınacağı. Sabit: kullanıcıya sorulacak bir ayar değil, güvenlik
// ağının sıklığı — çok sık yedek depoyu şişirir, çok seyrek yedeği işe yaramaz hale getirir.
const YEDEK_GUN_SAYISI = 3;

function useYedekleme(d) {
  // Açılışta bir kez denensin: yükleme bitmeden yedek almak yarım veriyi yedeklemek olurdu.
  const yedekDenendi = useRef(false);
  const {
    loading,
    stok, cariler, siparisler, uretim, muhasebe, tanimlar, gorevler, mesajlar, koliler,
    cekGorselleri, showToast,
    setStok, setCariler, setSiparisler, setUretim, setMuhasebe, setTanimlar, setGorevler,
    setMesajlar, setKoliler, setCekGorselleri, setSonYedekTarihi,
  } = d;

const otomatikYedekAl = useCallback(async (sessiz) => {
  // Kilitliyken yedek ALINMAZ: elimizdeki veri eksik olabilir (bkz. VERI_KILIDI). Eksik veriyi
  // "yedek" adıyla kaydetmek, sağlam bir yedeği eksik olanla değiştirme riski taşır.
  if (VERI_KILIDI.aktif) return false;
  if (stok.length === 0 && cariler.length === 0 && siparisler.length === 0) return false;

  const bugun = bugunYerel();

  // GÖRSELLER YEDEĞE ALINMAZ. Ürün görselleri base64 olarak kayıtların içinde duruyor ve verinin
  // büyük kısmını onlar oluşturuyor. Hepsini tek bir yedek anahtarına koymak 5 MB sınırını aşar;
  // yedek her gün sessizce başarısız olur ve üstelik boşuna yazma trafiği üretir.
  // Görsel kaybı kabul edilebilir bir ödünç: yedeğin işi sayısal veriyi (stok, bakiye, sipariş)
  // kurtarmaktır. Görseller yeniden yüklenebilir, bir siparişin miktarı yüklenemez.
  const gorselsizStok = stok.map((p) => {
    const { kapakResmi, renkResimleri, ...kalan } = p;
    return kalan;
  });
  const yedek = {
    olusturulmaTarihi: new Date().toISOString(),
    surum: 2,
    gorsellerHaric: true,
    stok: gorselsizStok, siparisler, uretim, cariler, tanimlar, muhasebe, koliler, gorevler, mesajlar,
  };

  const yedekMetni = JSON.stringify(yedek);
  if (veriBoyutu(yedekMetni) > DEPO_UYARI_ESIGI) {
    if (!sessiz) showToast(`Yedek alınamadı — veri ${boyutMetni(veriBoyutu(yedekMetni))}, tek kayıt sınırına çok yakın`);
    return false;
  }

  try {
    await guvenliYaz(`yedek:${bugun}`, yedekMetni, true);

    // Eski yedekleri temizle — sınırsız birikirse depolama dolar. Anahtar adı tarih içerdiği için
    // sıralama alfabetik olarak da doğru çalışır.
    try {
      const liste = await window.storage.list("yedek:", true);
      const anahtarlar = (liste && liste.keys ? liste.keys : []).filter((k) => k.startsWith("yedek:")).sort();
      const silinecekler = anahtarlar.slice(0, Math.max(0, anahtarlar.length - YEDEK_GUN_SAYISI));
      for (const k of silinecekler) {
        try { await window.storage.delete(k, true); } catch (e) { /* yoksay */ }
      }
    } catch (e) { /* liste alınamadıysa temizlik atlanır, yedek yine de alındı */ }

    setSonYedekTarihi(bugun);
    if (!sessiz) showToast(`Yedek alındı — ${bugun}`);
    return true;
  } catch (e) {
    if (!sessiz) showToast("Yedek alınamadı");
    return false;
  }
}, [stok, siparisler, uretim, cariler, tanimlar, muhasebe, koliler, gorevler, mesajlar, showToast]);

// Günde BİR kez, veriler yüklendikten sonra. Ref ile korunuyor: her render'da tekrar denemek
// gereksiz yazma trafiği üretirdi.
useEffect(() => {
  if (loading || yedekDenendi.current || VERI_KILIDI.aktif) return;
  yedekDenendi.current = true;
  (async () => {
    const bugun = bugunYerel();
    try {
      const liste = await window.storage.list("yedek:", true);
      const anahtarlar = (liste && liste.keys ? liste.keys : []).filter((k) => k.startsWith("yedek:")).sort();
      if (anahtarlar.length > 0) setSonYedekTarihi(anahtarlar[anahtarlar.length - 1].slice(6));
      if (anahtarlar.includes(`yedek:${bugun}`)) return; // bugünün yedeği zaten var
    } catch (e) { /* liste alınamadı — yine de yedek almayı dene */ }
    otomatikYedekAl(true);
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [loading]);

// Bir yedeği geri yükler. Mevcut veriyi TAMAMEN değiştirir — bu yüzden çağıran taraf açık onay
// almalıdır (Tanımlar ekranındaki panel iki aşamalı onay uygular).
// YEDEĞİ UYGULA — bulut yedeği ve JSON dosyası AYNI yoldan (kullanıcı, 13 Eylül: "veriler
// gittiğinde JSON ile geri gelir mi?"). Eskiden JSON dosyası yalnız indiriliyordu, dosyadan geri
// yükleme YOKTU; yedekte muhasebe (kasa/banka/ÇEK) ve koliler de yoktu.
const yedegiUygula = useCallback(async (y, kaynakAd) => {
  if (!y || !Array.isArray(y.stok)) { showToast("Yedek okunamadı veya bozuk"); return false; }
  // Geri yüklemeden ÖNCE mevcut hâlin yedeği alınır: yanlış bir yedeğe dönmek, dönüşü olmayan
  // bir hata olmasın. Ayrı bir anahtara yazılır ki günlük yedeğin üzerine binmesin.
  await guvenliYaz("yedek:geri-yukleme-oncesi", JSON.stringify({
    olusturulmaTarihi: new Date().toISOString(), surum: 3,
    stok, siparisler, uretim, cariler, tanimlar, muhasebe, koliler,
  }), true);

  // Yedek görselsiz alındıysa, geri yüklerken MEVCUT görselleri koruyoruz — aksi halde yedeğe
  // dönmek, sayısal veriyi kurtarırken tüm ürün fotoğraflarını silerdi.
  const yedekStok = (y.stok || []).map((yp) => {
    if (!y.gorsellerHaric) return yp;
    const mevcut = stok.find((sp) => sp.id === yp.id);
    if (!mevcut) return yp;
    return { ...yp, kapakResmi: mevcut.kapakResmi || "", renkResimleri: mevcut.renkResimleri || {} };
  });

  setStok(yedekStok);
  setSiparisler(y.siparisler || []);
  setUretim(y.uretim || []);
  setCariler(y.cariler || []);
  if (y.tanimlar) setTanimlar(y.tanimlar);
  if (y.muhasebe) setMuhasebe(y.muhasebe);
  if (Array.isArray(y.koliler)) setKoliler(y.koliler);
  if (Array.isArray(y.gorevler)) setGorevler(y.gorevler);
  if (Array.isArray(y.mesajlar)) setMesajlar(y.mesajlar);

  // Geri yükleme TOPLU yazar: yedekteki hâl bütünüyle geçerli olmalı, kayıt kayıt fark almak
  // burada anlamsız. Katmanın "son bilinen hâl" belleği de yenilenir.
  await tabloYaz("stok:items", "urunler", yedekStok);
  await tabloYaz("siparis:data", "siparisler", y.siparisler || []);
  await tabloYaz("uretim:siparisler", "uretim", y.uretim || []);
  await tabloYaz("cari:data", "cariler", y.cariler || []);
  if (y.tanimlar) await tekilYaz("tanimlar:data", "tanimlar", y.tanimlar);
  if (y.muhasebe) await tekilYaz("muhasebe:data", "muhasebe", y.muhasebe);
  if (Array.isArray(y.koliler)) await tekilYaz("koli:data", "koliler", y.koliler);
  if (Array.isArray(y.gorevler)) await tekilYaz("gorev:data", "gorevler", y.gorevler);
  if (Array.isArray(y.mesajlar)) await tekilYaz("mesaj:data", "mesajlar", y.mesajlar);
  // Çek görselleri (varsa): toplu tablo yazımı + yerel kopya (cekGorselKaydet'in yaptığı iş,
  // burada toplu — o fonksiyon daha aşağıda tanımlı, bağımlılığa alınamaz).
  if (Array.isArray(y.cekGorselleri)) {
    const temizler = y.cekGorselleri.filter((g) => g && g.id).map((g) => ({ id: g.id, on: g.on || "", arka: g.arka || "" }));
    setCekGorselleri(temizler);
    try { await tabloYaz("cekgorsel:data", "cek_gorselleri", temizler, []); } catch (e) { console.error("Çek görselleri geri yüklenemedi:", e); }
    temizler.forEach((g) => cekGorselYaz(g.id, { on: g.on, arka: g.arka }).catch(() => {}));
  }
  showToast(`${kaynakAd} geri yüklendi — geri yükleme öncesi hâl de ayrıca saklandı`);
  return true;
}, [stok, siparisler, uretim, cariler, tanimlar, muhasebe, koliler, gorevler, mesajlar, showToast]);

// JSON DOSYASINDAN geri yükleme: Tanımlar > Veri Yedekleme > "JSON Yedeğinden Geri Yükle".
const jsonDosyasindanGeriYukle = useCallback(async (dosya) => {
  let y;
  try { y = JSON.parse(await dosya.text()); } catch (e) { showToast("Dosya JSON olarak okunamadı"); return false; }
  if (!y || !Array.isArray(y.stok)) { showToast("Bu bir Atölye ERP yedeği değil (stok listesi yok)"); return false; }
  const ozet = `${(y.stok || []).length} ürün · ${(y.cariler || []).length} cari · ${(y.siparisler || []).length} sipariş · ${(y.uretim || []).length} üretim` +
    `${y.muhasebe ? " · muhasebe" : " · MUHASEBE YOK"}${Array.isArray(y.koliler) ? " · koliler" : ""}` +
    `${y.olusturulmaTarihi ? ` · ${String(y.olusturulmaTarihi).slice(0, 10)}` : ""}`;
  if (!window.confirm(`Yedek: ${ozet}\n\nMEVCUT VERİLERİN TAMAMI bu yedekle DEĞİŞTİRİLECEK (bulut dahil). Geri yükleme öncesi hâl ayrıca saklanır.\n\nDevam edilsin mi?`)) return false;
  try { return await yedegiUygula(y, `JSON yedeği (${dosya.name})`); }
  catch (e) { showToast(`Geri yükleme başarısız: ${e && e.message}`); return false; }
}, [yedegiUygula, showToast]);

const yedektenGeriYukle = useCallback(async (tarih) => {
  try {
    const r = await window.storage.get(`yedek:${tarih}`, true);
    const y = JSON.parse(r.value);
    if (!y || !Array.isArray(y.stok)) { showToast("Yedek okunamadı veya bozuk"); return; }
    await yedegiUygula(y, `${tarih} tarihli yedek`);
    return;
    // Geri yüklemeden ÖNCE mevcut hâlin yedeği alınır: yanlış bir yedeğe dönmek, dönüşü olmayan
    // bir hata olmasın. Ayrı bir anahtara yazılır ki günlük yedeğin üzerine binmesin.
    await guvenliYaz("yedek:geri-yukleme-oncesi", JSON.stringify({
      olusturulmaTarihi: new Date().toISOString(), surum: 1,
      stok, siparisler, uretim, cariler, tanimlar, muhasebe,
    }), true);

    // Yedek görselsiz alındıysa, geri yüklerken MEVCUT görselleri koruyoruz — aksi halde yedeğe
    // dönmek, sayısal veriyi kurtarırken tüm ürün fotoğraflarını silerdi.
    const yedekStok = (y.stok || []).map((yp) => {
      if (!y.gorsellerHaric) return yp;
      const mevcut = stok.find((sp) => sp.id === yp.id);
      if (!mevcut) return yp;
      return { ...yp, kapakResmi: mevcut.kapakResmi || "", renkResimleri: mevcut.renkResimleri || {} };
    });

    setStok(yedekStok);
    setSiparisler(y.siparisler || []);
    setUretim(y.uretim || []);
    setCariler(y.cariler || []);
    if (y.tanimlar) setTanimlar(y.tanimlar);
    if (y.muhasebe) setMuhasebe(y.muhasebe);

    // Geri yükleme TOPLU yazar: yedekteki hâl bütünüyle geçerli olmalı, kayıt kayıt fark almak
    // burada anlamsız. Ama katmanın "son bilinen hâl" belleği de yenilenmeli — yenilenmezse
    // sonraki kayıtta fark yanlış hesaplanır ve geri yüklenen satırlar "silinmiş" görünür.
    await tabloYaz("stok:items", "urunler", yedekStok);
    await tabloYaz("siparis:data", "siparisler", y.siparisler || []);
    await tabloYaz("uretim:siparisler", "uretim", y.uretim || []);
    await tabloYaz("cari:data", "cariler", y.cariler || []);
    if (y.tanimlar) await tekilYaz("tanimlar:data", "tanimlar", y.tanimlar);
    if (y.muhasebe) await tekilYaz("muhasebe:data", "muhasebe", y.muhasebe);

    showToast(`${tarih} tarihli yedek geri yüklendi — geri yükleme öncesi hâl de ayrıca saklandı`);
  } catch (e) {
    showToast("Yedek geri yüklenemedi");
  }
}, [yedegiUygula, showToast]);

const verileriJsonYedekle = useCallback(() => {
  if (stok.length === 0 && cariler.length === 0 && siparisler.length === 0) {
    showToast("⚠ Veriler henüz tam yüklenmemiş olabilir — bir kaç saniye bekleyip tekrar deneyin");
    return;
  }
  // TAM YEDEK (13 Eylül): muhasebe (kasa/banka/ÇEK), koliler ve çek görselleri de içinde. Ürün
  // görselleri dahil (dosya büyük olabilir; bulut yedeğinin aksine burada sınır yok). Sürüm 3.
  const yedek = {
    olusturulmaTarihi: new Date().toISOString(),
    surum: 3, gorsellerHaric: false, uygulama: `Atölye ERP ${SURUM}`,
    stok, siparisler, uretim, cariler, tanimlar, muhasebe, koliler, cekGorselleri, gorevler, mesajlar,
  };
  const blob = new Blob([JSON.stringify(yedek, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `atolye-yedek-${bugunYerel()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("JSON yedeği indirildi");
}, [stok, siparisler, uretim, cariler, tanimlar, muhasebe, koliler, cekGorselleri, gorevler, mesajlar, showToast]);

// İnsan gözüyle hızlıca kontrol edilebilecek, okunabilir bir Excel özeti indirir (yedek amaçlı değil,
// gözden geçirme/rapor amaçlıdır — tam geri yükleme için JSON yedeğini kullanın).
const verileriExcelAktar = useCallback(() => {
  if (stok.length === 0 && cariler.length === 0 && siparisler.length === 0) {
    showToast("⚠ Veriler henüz tam yüklenmemiş olabilir — bir kaç saniye bekleyip tekrar deneyin");
    return;
  }
  const wb = XLSX.utils.book_new();

  const stokSatirlari = [];
  stok.forEach((p) => {
    (p.variants || []).forEach((v) => {
      stokSatirlari.push({
        Ürün: p.ad, Kategori: p.kategori, Renk: v.renk, Beden: v.beden, Miktar: v.miktar,
        Birim: p.birim, "Alış Fiyatı": p.alisFiyati || "", "Satış Fiyatı": p.satisFiyati || "",
      });
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stokSatirlari), "Stok");

  const siparisSatirlari = [];
  siparisler.forEach((s) => {
    s.kalemler.forEach((k) => {
      siparisSatirlari.push({
        "Sipariş No": s.siparisNo, Tip: s.tip, Tarih: s.tarih, Durum: s.durum,
        Ürün: k.urunAd, Renk: k.renk, Beden: k.beden, Miktar: k.miktar,
        "Birim Fiyat": k.birimFiyat, Karşılanan: k.karsilanan || 0,
      });
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(siparisSatirlari), "Siparişler");

  const uretimSatirlari = uretim.map((o) => ({
    "Sipariş No": o.siparisNo, Model: o.model, Renk: o.renk, Adet: o.adet,
    Termin: o.termin || "", "Stoğa Eklendi": o.stogaEklendiMi ? "Evet" : "Hayır",
    Aşama: (o.prosesIlerleme || []).find((p) => !p.tamamlandiMi)?.proses || "Tamamlandı",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(uretimSatirlari), "Üretim");

  const cariSatirlari = cariler.map((c) => {
    const bakiye = (c.hareketler || []).reduce((s, h) => s + (h.yon === "Borç" ? h.tutar : -h.tutar), 0);
    return { Unvan: c.unvan, Tip: c.tip, Telefon: c.telefon || "", Bakiye: bakiye };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cariSatirlari), "Cariler");

  XLSX.writeFile(wb, `atolye-ozet-${bugunYerel()}.xlsx`);
  showToast("Excel özeti indirildi");
}, [stok, siparisler, uretim, cariler, showToast]);


  return {
    otomatikYedekAl, yedegiUygula, jsonDosyasindanGeriYukle, yedektenGeriYukle,
    verileriJsonYedekle, verileriExcelAktar,
  };
}
