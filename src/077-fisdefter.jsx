// ================= FİŞ DEFTERİ =================
//
// Kullanıcı (15 Eylül): *"Fişleri 3 defter değil de tek deftere yazsa ve oradan okusa nasıl olur?
// Alt yapının çok sağlam olması gerekir, bu hatalar kabul edilemez."* — Adım 1.
//
// SORUN (21. bölümün kökü): bir fiş ÜÇ yere yazıyor — stok hareketi, sipariş `karsilanan`ı, cari
// hareketi. Üçü ayrı tablolara gidiyor; biri buluta yazılamazsa işlemin YARISI olmuş oluyor.
// Uygulamanın hesabı doğru, yazma yolu yarım kalıyordu.
//
// ÇÖZÜM: her fiş ÖNCE tek bir kayıt olarak deftere yazılır (`fis_defteri`, tek satır, tek yazma).
// Bu yazma başarısızsa işlem HİÇ YAPILMAZ — ne stok değişir, ne sipariş, ne cari. Başarılıysa üç
// tablo eskisi gibi güncellenir; artık onlar defterin TÜREVİ sayılır. Bozulurlarsa defterden
// yeniden kurulabilir (Adım 2).
//
// NEDEN "önce defter, sonra türevler": tersi (önce türevler) yine yarım kalma riski taşırdı.
// Defter yazıldıysa işlem OLMUŞTUR; türevlerden biri yazılamazsa bekleyen yazma defteri (21)
// devreye girer ve açılışta yerel kopya kazanır, veri bölünmez.
//
// KAYIT BİÇİMİ (bir fiş = bir satır):
//   { id: fisNo, fisNo, tip: "Alış"|"Satış", kaynak, cariId, siparisId, siparisNo,
//     zaman, stokTarihi, cariTarihi, defter, kullanici,
//     kalemler: [{ urunId, urunAd, renk, beden, birim, miktar, birimFiyat, paraBirimi, kalemId, hareketId }],
//     stokHareketleri: [...], cariHareketleri: [...],
//     iptal: false, iptalZamani: null }
//
// İPTAL SİLMEZ: fiş geri alınınca defterdeki kayıt `iptal: true` olur ve öyle kalır. Ne olduğu
// kadar ne geri alındığı da tarihin parçası; silmek "bu hiç olmadı" demek olurdu.
const FIS_DEFTERI_ANAHTAR = "fisdefter:data";

// DEFTERDEN EKSİK ALAN ONARIMI (v1.546.0). Şema sütunları açıkça saydığı için cari ve stok hareketinin bazı
// alanları (cari: işlem tipi, çek kimliği…; stok: birim fiyat, kur, ürün adı…) buluta gitmiyor, buluttan
// yeniden yüklenen her cihazda kayboluyordu. Fiş defteri ise her fişin hareketlerinin TAM kopyasını tek
// jsonb'de saklıyor — kaybolan alanlar oradan geri doldurulabilir. KURAL: yalnız hareketTE OLMAYAN alan
// doldurulur, var olan değere dokunulmaz; BAĞ alanları (esId, siparisId, kalemId, rezervasyonSiparisId,
// urunId) hiç doldurulmaz — sipariş iptali, ikiz göçü gibi işlemler onları bilerek koparmış olabilir.
// İptal edilmiş fişin kopyası kullanılmaz. Saf: değişen kayıt yoksa aynı diziler döner.
const DEFTER_ONARIM_DISI = new Set(["id", "esId", "siparisId", "kalemId", "rezervasyonSiparisId", "urunId", "kaynakTip"]);
function defterdenEksikAlanlariTamamla(cariler, stok, defter) {
  const cariKopya = new Map();
  const stokKopya = new Map();
  (defter || []).forEach((k) => {
    if (!k || k.iptal) return;
    (k.cariHareketleri || []).forEach((h) => { if (h && h.id) cariKopya.set(h.id, h); });
    (k.stokHareketleri || []).forEach((h) => { if (h && h.id) stokKopya.set(h.id, h); });
  });
  let sayi = 0;
  const tamamla = (h, kopyalar) => {
    const k = h && h.id ? kopyalar.get(h.id) : null;
    if (!k) return h;
    let y = h;
    Object.keys(k).forEach((alan) => {
      if (DEFTER_ONARIM_DISI.has(alan) || h[alan] !== undefined || k[alan] === undefined || k[alan] === null) return;
      if (y === h) y = { ...h };
      y[alan] = k[alan];
    });
    if (y !== h) sayi++;
    return y;
  };
  const listeyiTamamla = (kayitlar, kopyalar) => {
    let degisti = false;
    const sonuc = (kayitlar || []).map((x) => {
      const hs = (x.hareketler || []).map((h) => tamamla(h, kopyalar));
      if (hs.every((h, i) => h === x.hareketler[i])) return x;
      degisti = true;
      return { ...x, hareketler: hs };
    });
    return degisti ? sonuc : kayitlar;
  };
  const yeniCariler = listeyiTamamla(cariler, cariKopya);
  const cariSayi = sayi;
  const yeniStok = listeyiTamamla(stok, stokKopya);
  return { cariler: yeniCariler, stok: yeniStok, cariSayi, stokSayi: sayi - cariSayi };
}

// Fiş kaydını yazma sonuçlarından kurar. `sonuc` = fisYaz çıktısı.
function fisDefterKaydiKur(fis, sonuc, ek) {
  const stokHareketleri = [];
  (sonuc.stok || []).forEach((p) => {
    (p.hareketler || []).forEach((h) => {
      if (h.fisNo === fis.fisNo && [...(sonuc.kimlikler ? sonuc.kimlikler.values() : [])].includes(h.id)) {
        stokHareketleri.push({ ...h, urunId: p.id, urunAd: p.ad });
      }
    });
  });
  return {
    id: fis.fisNo,
    fisNo: fis.fisNo,
    tip: fis.tip,
    kaynak: fis.kaynak,
    cariId: fis.cariId || null,
    siparisId: (fis.siparis && fis.siparis.id) || null,
    siparisNo: (fis.siparis && fis.siparis.siparisNo) || null,
    zaman: fis.zaman || new Date().toISOString(),
    stokTarihi: fis.stokTarihi || null,
    cariTarihi: fis.cariTarihi || null,
    defter: fis.defter || "Genel",
    kullanici: (ek && ek.kullanici) || "",
    kalemler: (fis.kalemler || []).map((k) => ({
      urunId: k.urunId, urunAd: k.urunAd, renk: k.renk, beden: k.beden, birim: k.birim,
      miktar: k.miktar, birimFiyat: k.birimFiyat, paraBirimi: k.paraBirimi,
      // KDV oranı (v1.496.0): yalnız KDV'li fişte; fatura taslağı defterden oranı okuyacak.
      ...(typeof k.kdvOrani === "number" ? { kdvOrani: k.kdvOrani } : {}),
      kalemId: k.kalemId || null,
      hareketId: (sonuc.kimlikler && sonuc.kimlikler.get(k)) || null,
    })),
    stokHareketleri,
    cariHareketleri: (sonuc.cariHareketleri || []).map((h) => ({ ...h })),
    iptal: false,
    iptalZamani: null,
  };
}

// ================= PARÇA 2: HER HAREKET DEFTERE =================
//
// Kullanıcı (16 Eylül): *"Üretim için de, alış satış için de, tüm işlemler için o deftere yazsın."*
//
// Adım 1'de yalnız FİŞ YOLLARI (cari kartından kesilen fiş, sipariş teslimi) deftere yazıyordu.
// Üretim çıkışı/girişi, elle stok girişi, açılış ve onarım hareketleri defterin dışında kalıyordu.
// Onları da tek tek kapıya bağlamak yerine, hareketler STOK YAZIMININ KENDİSİNDEN toplanıyor:
// stok her güncellendiğinde yeni beliren hareketler bulunup deftere ekleniyor.
//
// NEDEN BÖYLE: 14 ayrı kapı var ve yenisi eklenebilir. Her kapıya "deftere de yaz" satırı koymak,
// bir gün birinin unutulması demekti — bu projede tam olarak bu sınıf hata yaşandı. Stok yazımı
// TEK geçit olduğu için oradan toplamak kaçak bırakmıyor.
//
// Fişi olmayan hareket de deftere düşüyor (`fisNo: null`), çünkü görünmez kalması daha kötü;
// Veri Denetimi onları "fişsiz hareket" olarak işaretliyor.

// Stok listelerini karşılaştırıp deftere girmemiş hareketleri döndürür.
function defteryeGirmemisHareketler(oncekiStok, yeniStok, defter) {
  const defterdekiler = new Set();
  (defter || []).forEach((f) => (f.stokHareketleri || []).forEach((h) => { if (h.id) defterdekiler.add(h.id); }));
  const oncekiler = new Set();
  (oncekiStok || []).forEach((p) => (p.hareketler || []).forEach((h) => { if (h.id) oncekiler.add(h.id); }));

  const yeniler = [];
  (yeniStok || []).forEach((p) => {
    (p.hareketler || []).forEach((h) => {
      if (!h.id || oncekiler.has(h.id) || defterdekiler.has(h.id)) return;
      yeniler.push({ ...h, urunId: p.id, urunAd: p.ad });
    });
  });
  return yeniler;
}

// Yeni hareketleri fiş numarasına göre gruplayıp defter kayıtlarına çevirir. Aynı fiş numarası
// defterde zaten varsa hareketler O KAYDA eklenir (fişin ikinci kalemi sonradan yazılmış olabilir).
function defteriHareketlerleGuncelle(defter, yeniHareketler, ek) {
  if (!yeniHareketler || yeniHareketler.length === 0) return defter;
  let sonuc = defter || [];
  const gruplar = new Map();
  yeniHareketler.forEach((h) => {
    const anahtar = h.fisNo || `FISSIZ:${h.id}`;
    if (!gruplar.has(anahtar)) gruplar.set(anahtar, []);
    gruplar.get(anahtar).push(h);
  });

  gruplar.forEach((hareketler, anahtar) => {
    const fisNo = hareketler[0].fisNo || null;
    const mevcutIndex = fisNo ? sonuc.findIndex((f) => f.fisNo === fisNo && !f.iptal) : -1;
    if (mevcutIndex >= 0) {
      const mevcut = sonuc[mevcutIndex];
      const varOlan = new Set((mevcut.stokHareketleri || []).map((h) => h.id));
      const eklenecek = hareketler.filter((h) => !varOlan.has(h.id));
      if (eklenecek.length === 0) return;
      sonuc = sonuc.map((f, i) => (i === mevcutIndex
        ? { ...f, stokHareketleri: [...(f.stokHareketleri || []), ...eklenecek] } : f));
      return;
    }
    const ilk = hareketler[0];
    sonuc = [{
      id: fisNo || `fissiz-${ilk.id}`,
      fisNo,
      // Kaynak alanı hareketin kendisinden geliyor: "Üretim", "Açılış", "Satınalma", "Satış"…
      tip: (ilk.miktar || 0) >= 0 ? "Giriş" : "Çıkış",
      kaynak: ilk.kaynak || "Bilinmiyor",
      cariId: ilk.cariId || null,
      siparisId: ilk.siparisId || null,
      siparisNo: ilk.siparisNo || null,
      uretimId: ilk.uretimId || null,
      zaman: new Date().toISOString(),
      stokTarihi: ilk.tarih || null,
      cariTarihi: null,
      defter: "Genel",
      kullanici: (ek && ek.kullanici) || "",
      kalemler: hareketler.map((h) => ({
        urunId: h.urunId, urunAd: h.urunAd, renk: h.renk, beden: h.beden,
        miktar: h.miktar, hareketId: h.id,
      })),
      stokHareketleri: hareketler,
      cariHareketleri: [],
      iptal: false,
      iptalZamani: null,
      // Fiş yollarından gelmeyen (üretim, açılış, elle giriş) kayıtlar böyle işaretleniyor:
      // defterde nereden geldiği görünsün.
      otomatik: true,
    }, ...sonuc];
  });
  return sonuc;
}

// Defterde fiş var mı? (Aynı numaranın iki kez yazılması — çift tıklama, yeniden deneme.)
function fisDefterindeVarMi(defter, fisNo) {
  return (defter || []).some((x) => x.fisNo === fisNo && !x.iptal);
}

// Bir fişi iptal işaretle (silme yok).
function fisDefterindeIptalEt(defter, fisNo) {
  let bulundu = false;
  const next = (defter || []).map((x) => {
    if (x.fisNo !== fisNo || x.iptal) return x;
    bulundu = true;
    return { ...x, iptal: true, iptalZamani: new Date().toISOString() };
  });
  return { defter: next, bulundu };
}

// Defterden TÜREV hesap: bir ürün+renk+beden için net stok hareketi toplamı. Adım 2'de (yeniden
// kurma) kullanılacak; şimdiden burada duruyor ki defterin neyi taşıdığı test edilebilsin.
function fisDefterindenStokToplami(defter) {
  const toplam = new Map();
  (defter || []).forEach((f) => {
    if (f.iptal) return;
    (f.stokHareketleri || []).forEach((h) => {
      const a = `${h.urunId}|${h.renk || ""}|${h.beden || ""}`;
      toplam.set(a, Math.round(((toplam.get(a) || 0) + (h.miktar || 0)) * 100) / 100);
    });
  });
  return toplam;
}
