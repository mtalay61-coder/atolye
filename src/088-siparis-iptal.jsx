// ================= SİPARİŞ İPTALİ — BAĞ ÇÖZME (28 Eylül, v1.512.0) =================
//
// KULLANICININ KURALI (28 Eylül): "Fişsiz hiçbir kayıt olamaz. Cari satış yaptığımızda satış fişi
// oluşacak, cari hareketi satış fişinden çekilecek. Sipariş ayrı konu — sipariş satış demek değil.
// Sipariş silindiğinde fişler silinmez; bağlı fişler siparişe bağlı değil, bağımsız fiş olur. Müşteri
// siparişi iptal ettiğinde alım vs. varsa bunlar yok olmaz, sadece o siparişle bağlantısı kalmaz;
// oluşan stok serbest stoğa düşer."
//
// ESKİ DAVRANIŞ (silme zinciri, 087): siparişe bağlı fişlerin stok VE cari hareketlerini siliyordu —
// teslim edilmiş malın fişi yok oluyor, stok geri dönüyor, müşteri borcu siliniyordu. Üstelik fiş
// geri almanın tek kapısını (`fisGeriAl`: fatura/çek/kasa kilitleri) atlıyordu. Ayrıca ayırmaları
// (hammadde rezervasyonu, alış kalemindeki rezervasyon, koli) bırakıyordu: iptal edilen siparişin
// malı serbest stoğa hiç düşmüyordu.
//
// YENİ: işlem görmüş sipariş SİLİNMEZ, İPTAL EDİLİR (kullanıcı onayı — kayıt "İptal" durumunda kalır,
// geçmişte izi durur). İptal yalnız BAĞ ÇÖZER, hiçbir fişe/miktara/tutara dokunmaz:
//   · Fişlerin stok + cari hareketleri → `siparisId`/`kalemId` kalkar; `siparisNo` "SAT-1001 (iptal)"
//     olur. Numara metin olarak kalıyor ("bu fiş nereden doğdu" sorusu cevapsız kalmasın) ama eşleşmez:
//     birçok ekran kimliksiz eski harekette numaraya bakıyor (340 Fişler sekmesi, 082, 087); düz
//     numara bırakmak fişi sessizce yeniden bağlardı. Sütun zaten var, SQL göçü gerekmiyor.
//   · Fiş defteri kayıtları (ve içlerindeki hareket kopyaları — "defterden yeniden kur" onları okuyor)
//     aynı şekilde.
//   · Başka kayıtlardaki "bu mal şu satış için" zinciri (`rezervasyonSiparisId`): mamul/alış hareketleri,
//     üretim emirleri, alış siparişleri → boşalır. Üretim ve alış DEVAM EDER; geldiğinde serbest stok.
//   · Alış kalemindeki rezervasyon satırları ve hammadde rezervasyon defteri → bu siparişin payı silinir
//     (talep kalkar, stok "ayrılmış"tan çıkar).
//   · Hazır koliler → siparişsiz koli; `iptalSiparisNo` işaretiyle mamul deposunda SERBEST sayılır ve
//     okutulunca carinin başka açık siparişine eşleşebilir (237 `koliSiparisiniCoz`).
//   · "Kaynak: SAT-1001" notları "(iptal)" ekiyle — bağlantı artık bir iptale gidiyor.
//
// SAF: state'e dokunmaz; yeni dizileri ve ne değiştiğinin özetini döndürür. Çağıran (087) yazar.
// Aynı fonksiyon "önizleme" için de kullanılıyor (`siparisIptalOzeti`): onay penceresinde gösterilen
// sayılar ile uygulanan işlem tek hesaptan çıkıyor, ikisi birbirinden ayrışamaz.

const IPTAL_EKI = " (iptal)";

// Sipariş hâlâ bir şeye bağlı mı? Bağlıysa İPTAL, değilse (yanlış açılmış, hiç işlem görmemiş) SİLME.
// `siparisBaglariniCoz` ile aynı eşleşmeleri kullanır — önizlemede "boş" deyip iptalde bir şey
// değiştirmek (ya da tersi) olmasın diye özetten okunuyor.
function siparisIslemGormusMu(ozet, siparis) {
  if (!ozet) return false;
  const karsilanan = (siparis && siparis.kalemler || []).some((k) => (k.karsilanan || 0) > 0);
  const planlanmis = (siparis && siparis.kalemler || []).some((k) => k.planlama);
  return ozet.bagSayisi > 0 || karsilanan || planlanmis;
}

// Hareketin bu siparişe bağlı olup olmadığı. Kimliği olmayan ESKİ hareketlerde numara (bkz. 087'nin
// eski `hareketAit`i); kimlikli harekette yalnız kimlik — numara yeniden kullanılmış olabilir.
function siparisHareketiMi(h, siparis) {
  if (!h) return false;
  if (h.siparisId) return h.siparisId === siparis.id;
  return !!siparis.siparisNo && h.siparisNo === siparis.siparisNo;
}

function siparisBaglariniCoz(veri, siparisId, secenek) {
  const sec = secenek || {};
  // `null` da gelebilir (kart bazı ekranlarda koli/rezervasyon almadan çiziliyor): varsayılan değer yalnız
  // `undefined`ı karşılar, o yüzden `||`.
  const v = veri || {};
  const stok = v.stok || [], cariler = v.cariler || [], siparisler = v.siparisler || [], uretim = v.uretim || [];
  const koliler = v.koliler || [], stokRezervasyonlari = v.stokRezervasyonlari || [], fisDefteri = v.fisDefteri || [];
  const siparis = siparisler.find((s) => s.id === siparisId);
  if (!siparis) return null;
  const no = siparis.siparisNo || "";
  const iptalNo = no ? `${no}${IPTAL_EKI}` : null;
  const ozet = {
    siparisNo: no, fisNolar: new Set(), stokHareketi: 0, cariHareketi: 0, defterKaydi: 0,
    alislar: [], uretimler: [], koliler: [], rezervasyon: 0, rezervasyonMiktari: 0, zincir: 0,
    planlamasiBosalan: [],
  };
  const notuIsaretle = (not) => {
    const t = String(not || "");
    if (!no || !t.includes(no) || t.includes(iptalNo)) return not;
    // Yalnız TAM numara: "SAT-10" iptal edilirken "SAT-1001" içindeki "SAT-10" işaretlenmesin.
    return t.replace(new RegExp(`${no.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`, "g"), iptalNo);
  };

  // Hareketin bağını çöz. Değişmediyse AYNI nesne döner (fark hesabı gereksiz satır yazmasın).
  const hareketCoz = (h, sayac) => {
    let yeni = h;
    if (siparisHareketiMi(h, siparis)) {
      const { siparisId: _s, kalemId: _k, ...kalan } = h;
      yeni = { ...kalan, siparisNo: iptalNo };
      if (h.fisNo) ozet.fisNolar.add(h.fisNo);
      ozet[sayac] += 1;
    }
    if (yeni.rezervasyonSiparisId === siparisId) {
      yeni = { ...yeni, rezervasyonSiparisId: null };
      ozet.zincir += 1;
    }
    return yeni;
  };
  const listeCoz = (liste, sayac) => {
    let degisti = false;
    const sonuc = (liste || []).map((h) => { const y = hareketCoz(h, sayac); if (y !== h) degisti = true; return y; });
    return degisti ? sonuc : liste;
  };

  let stokDegisti = false;
  const yeniStok = stok.map((p) => {
    const h = listeCoz(p.hareketler, "stokHareketi");
    if (h === p.hareketler) return p;
    stokDegisti = true;
    return { ...p, hareketler: h };
  });

  let cariDegisti = false;
  const yeniCariler = cariler.map((c) => {
    const h = listeCoz(c.hareketler, "cariHareketi");
    if (h === c.hareketler) return c;
    cariDegisti = true;
    return { ...c, hareketler: h };
  });

  // Fiş defteri: kaydın kendisi + içindeki hareket kopyaları. Sayaç ayrı (özet fiş sayısını
  // hareketlerden alıyor; defterde olup hareketi kalmamış eski fiş de sayılsın).
  let defterDegisti = false;
  const yeniDefter = (fisDefteri || []).map((f) => {
    if (!f) return f;
    let y = f;
    if (f.siparisId === siparisId || (!f.siparisId && no && f.siparisNo === no)) {
      y = { ...f, siparisId: null, siparisNo: iptalNo };
      if (f.fisNo) ozet.fisNolar.add(f.fisNo);
      ozet.defterKaydi += 1;
    }
    ["stokHareketleri", "cariHareketleri"].forEach((alan) => {
      if (!Array.isArray(y[alan])) return;
      const once = ozet.stokHareketi; const onceC = ozet.cariHareketi; const onceZ = ozet.zincir;
      const l = listeCoz(y[alan], "stokHareketi");
      // Defter kopyaları sayaçları şişirmesin: asıl hareketler yukarıda sayıldı.
      ozet.stokHareketi = once; ozet.cariHareketi = onceC; ozet.zincir = onceZ;
      if (l !== y[alan]) y = { ...y, [alan]: l };
    });
    if (y !== f) defterDegisti = true;
    return y;
  });

  // Siparişler: hedef İPTAL (ya da çağıran silecekse dokunulmaz — `sec.sil`); diğerlerinde zincir.
  let siparisDegisti = false;
  const yeniSiparisler = siparisler.map((s) => {
    if (s.id === siparisId) {
      if (sec.sil) return s;
      siparisDegisti = true;
      return { ...s, durum: "İptal", iptalZamani: sec.zaman || new Date().toISOString(), ...(sec.kullanici ? { iptalEden: sec.kullanici } : {}) };
    }
    let y = s;
    // İPTAL/SİLİNEN ALIŞ, SATIŞIN PLANLAMASINI BOŞALTIR: o kalemin tedariki artık bu alıştan gelmeyecek;
    // planlama kalmazsa kalem "planlandı" görünür ve bir daha planlanamazdı. Bölünmüş parçalar yeniden
    // birleşir (eski silme yolunun `bekleyenKalemleriBirlestir` davranışı).
    if (siparis.tip === "Alış" && s.tip === "Satış" && no
      && (s.kalemler || []).some((k) => k.planlama && k.planlama.referansNo === no)) {
      y = { ...y, kalemler: bekleyenKalemleriBirlestir((s.kalemler || []).map((k) =>
        (k.planlama && k.planlama.referansNo === no ? { ...k, planlama: null } : k))) };
      ozet.planlamasiBosalan.push(s.siparisNo);
    }
    if (s.rezervasyonSiparisId === siparisId) y = { ...y, rezervasyonSiparisId: null };
    if (Array.isArray(s.rezervasyonSiparisIdleri) && s.rezervasyonSiparisIdleri.includes(siparisId)) {
      y = { ...y, rezervasyonSiparisIdleri: s.rezervasyonSiparisIdleri.filter((x) => x !== siparisId) };
    }
    let kalemDegisti = false;
    const kalemler = (s.kalemler || []).map((k) => {
      if (!Array.isArray(k.rezervasyonlar) || !k.rezervasyonlar.some((r) => r && r.siparisId === siparisId)) return k;
      kalemDegisti = true;
      k.rezervasyonlar.forEach((r) => { if (r && r.siparisId === siparisId) ozet.rezervasyonMiktari += Math.max(0, (r.miktar || 0) - (r.tuketilen || 0)); });
      return { ...k, rezervasyonlar: k.rezervasyonlar.filter((r) => !(r && r.siparisId === siparisId)) };
    });
    if (kalemDegisti) y = { ...y, kalemler };
    const not = notuIsaretle(s.not);
    if (not !== s.not) y = { ...y, not };
    if (y !== s) {
      siparisDegisti = true;
      if (s.tip === "Alış") ozet.alislar.push({ id: s.id, siparisNo: s.siparisNo, durum: s.durum });
    }
    // Satışın planladığı alış, alış tarafında hiçbir iz taşımıyorsa da (eski kayıt: not yok, zincir yok)
    // listede görünsün — kullanıcı "ne devam ediyor" sorusunun cevabını tam görmeli.
    if (siparis.tip === "Satış" && s.tip === "Alış" && !ozet.alislar.some((a) => a.id === s.id)
      && (siparis.kalemler || []).some((k) => k.planlama && k.planlama.tip === "Satınalma" && k.planlama.referansNo === s.siparisNo)) {
      ozet.alislar.push({ id: s.id, siparisNo: s.siparisNo, durum: s.durum });
    }
    return y;
  });

  let uretimDegisti = false;
  const yeniUretim = uretim.map((o) => {
    let y = o;
    if (o.rezervasyonSiparisId === siparisId) y = { ...y, rezervasyonSiparisId: null };
    const not = notuIsaretle(o.not);
    if (not !== o.not) y = { ...y, not };
    const planli = siparis.tip === "Satış" && (siparis.kalemler || []).some((k) => k.planlama && k.planlama.tip === "Üretim" && k.planlama.referansNo === o.siparisNo);
    if (y !== o || planli) ozet.uretimler.push({ id: o.id, siparisNo: o.siparisNo, model: o.model, tamamlandi: !!o.stogaEklendiMi });
    if (y === o) return o;
    uretimDegisti = true;
    return y;
  });

  let koliDegisti = false;
  const yeniKoliler = koliler.map((ko) => {
    if (!ko || ko.siparisId !== siparisId) return ko;
    koliDegisti = true;
    ozet.koliler.push({ id: ko.id, kod: ko.kod || ko.koliNo || ko.id, durum: ko.durum || "Hazır" });
    return { ...ko, siparisId: null, iptalSiparisNo: no || null };
  });

  const yeniRez = stokRezervasyonlari.filter((r) => {
    if (!r || r.siparisId !== siparisId) return true;
    ozet.rezervasyon += 1;
    ozet.rezervasyonMiktari += Math.max(0, (r.miktar || 0) - (r.tuketilen || 0));
    return false;
  });
  const rezDegisti = yeniRez.length !== stokRezervasyonlari.length;

  ozet.fisNolar = Array.from(ozet.fisNolar).sort();
  ozet.rezervasyonMiktari = stokYuvarla(ozet.rezervasyonMiktari);
  ozet.bagSayisi = ozet.stokHareketi + ozet.cariHareketi + ozet.defterKaydi + ozet.zincir
    + ozet.alislar.length + ozet.uretimler.length + ozet.koliler.length + ozet.rezervasyon
    + ozet.planlamasiBosalan.length;

  return {
    ozet,
    stok: stokDegisti ? yeniStok : stok,
    cariler: cariDegisti ? yeniCariler : cariler,
    siparisler: siparisDegisti ? yeniSiparisler : siparisler,
    uretim: uretimDegisti ? yeniUretim : uretim,
    koliler: koliDegisti ? yeniKoliler : koliler,
    stokRezervasyonlari: rezDegisti ? yeniRez : stokRezervasyonlari,
    fisDefteri: defterDegisti ? yeniDefter : fisDefteri,
    degisenler: { stok: stokDegisti, cariler: cariDegisti, siparisler: siparisDegisti, uretim: uretimDegisti,
      koliler: koliDegisti, stokRezervasyonlari: rezDegisti, fisDefteri: defterDegisti },
  };
}

// Onay penceresi için: iptal edilse ne olacağı (hiçbir şey yazılmaz).
function siparisIptalOzeti(veri, siparisId) {
  const r = siparisBaglariniCoz(veri, siparisId);
  return r ? r.ozet : null;
}

// Sipariş artık yok ama hareketleri hâlâ onun kimliğini taşıyor (v1.512.0 öncesi doğrudan silme yolu):
// kurala göre bu fişler zaten BAĞIMSIZ — yalnız kimlik kalıntısı temizlenir, numara "(iptal)" olur.
// Hareket sayısı, miktar, tutar değişmez. Dönüş: { stok, cariler, sayi, siparisNolar }.
function yetimSiparisBaglariniCoz(stok, cariler, siparisler) {
  const varOlan = new Set((siparisler || []).map((s) => s.id));
  const nolar = new Set();
  let sayi = 0;
  const coz = (h) => {
    if (!h || !h.siparisId || varOlan.has(h.siparisId)) return h;
    const { siparisId: _s, kalemId: _k, ...kalan } = h;
    sayi += 1;
    if (h.siparisNo) nolar.add(h.siparisNo);
    const n = String(h.siparisNo || "");
    return { ...kalan, siparisNo: n && !n.endsWith(IPTAL_EKI) ? `${n}${IPTAL_EKI}` : (n || null) };
  };
  const kayitlariCoz = (liste) => (liste || []).map((k) => {
    const h = (k.hareketler || []).map(coz);
    return h.some((x, i) => x !== k.hareketler[i]) ? { ...k, hareketler: h } : k;
  });
  const yeniStok = kayitlariCoz(stok);
  const yeniCariler = kayitlariCoz(cariler);
  return { stok: yeniStok, cariler: yeniCariler, sayi, siparisNolar: Array.from(nolar).sort() };
}
