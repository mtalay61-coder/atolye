// ================= FİŞ KES — TEK FİŞ DEFTERİ (v1.732.0, stok-v2/FIS-DEFTERI-PLAN.md) =================
//
// Kullanıcı (30 Ekim): "Fiş defterinden her işlem geçmesi lazım ve her yerin burayı okuması gerek… Para hareketi de fiş
// oluştursun." Sunucuda `fis_kes` (stok-v2/fis-defteri.sql) fişi ve bütün satırlarını (stok, cari, kasa; bağlı makbuz;
// sipariş kalemi) TEK İŞLEMDE yazar, numarayı KENDİSİ verir, aynı istek kimliğiyle ikinci kez gelen fişi yazmaz.
//
// YAZMA SIRASI BU YOLDA TERS: önce sunucu, sonra ekran. Fiş yerelde hesaplanır (fisYaz vb. — bugünkü kurallar), sunucuya
// gönderilir; ancak sunucu "yazıldı, numarası şu" deyince yerel durum uygulanır. Sunucu reddederse hiçbir şey değişmez,
// kullanıcı "kaydedilemedi" görür (yanlış kayıt yerine hata — kullanıcı kuralı).
// Uygulanan kayıtların FARK TABANI da kurulur (`fisKesTabaniKur`): yazma katmanı onları "buluta gitmemiş" sanıp eski yoldan
// yeniden göndermesin (kurallar açılınca o gönderim reddedilir).
//
// NE ZAMAN: sunucuda fiş defteri kuruluysa (`stk_ayar.fis_aktif` sütunu var) ve stok, cari, kasa, sipariş satırları v2'deyse.
// Değilse bugünkü yol — güncelleme SQL adımından önce yayınlansa da bir şey bozulmaz. Testlerde sunucu yok: bugünkü yol.
let _fisDefteriKurulu = false;
function fisDefteriKuruluAyarla(v) { _fisDefteriKurulu = !!v; }
function fisKesYolu() {
  return _fisDefteriKurulu && supabaseAcikMi() && stokV2Aktif() && cariV2Aktif() && kasaV2Aktif() && altV2Aktif();
}

// NUMARA YER TUTUCUSU — numara sunucudan gelmeden açıklamalar yazılır; sunucu ve uygulama aynı değişikliği yapar.
const FIS_YER = "«FIS»";
const ANA_FIS_YER = "«ANAFIS»";
// Saf: nesnenin bütün metinlerinde yer tutucuları değiştirir.
function fisYerTutucuDoldur(x, fisNo, anaNo) {
  if (x === undefined || x === null) return x;
  const metin = JSON.stringify(x).split(ANA_FIS_YER).join(anaNo || fisNo).split(FIS_YER).join(fisNo);
  return JSON.parse(metin);
}

// ---- Sunucu satır biçimleri (saf) — yazma katmanının kullandığı dönüşümlerle AYNI ----
// Stok hareketi: 035 şemasındaki hareket satırı → stk_yaz satırı (038 `stokV2HareketSatiri`). Renk / ölçü ADIYLA gider; sunucu
// kimliğe çözer (stk_varyant_coz).
function fisKesStokSatiri(urunId, h) {
  const cocuk = TABLO_SEMA.urunler.cocuklar.find((c) => c.tablo === "stok_hareketleri");
  const satir = cocuk.cikar({ id: urunId, hareketler: [h] })[0];
  return stokV2HareketSatiri(satir, {
    renkId: null, olcuId: null,
    renk: stokV2YerTutucuMu(satir.renk) ? null : satir.renk,
    olcu: stokV2YerTutucuMu(satir.beden) ? null : satir.beden,
  });
}
// Cari hareketi: 035 şemasındaki satır → car_yaz satırı (038 `cariV2Yuku` ile aynı biçim).
function fisKesCariSatiri(cariId, h) {
  const cocuk = TABLO_SEMA.cariler.cocuklar.find((c) => c.tablo === "cari_hareketleri");
  return cocuk.cikar({ id: cariId, hareketler: [h] })[0];
}
// Kasa/banka hareketi: kasa v2 satırı (038 `kasaV2Ac` — hareketin kendisi `veri`).
function fisKesKasaHareketi(hesapId, h) {
  return { id: String(h.id), hesap_id: hesapId, veri: h };
}
// Sipariş kalemi satırları (alt_yaz): siparişin yeni hâlinden, yalnız verilen kalemler.
function fisKesSiparisKalemleri(siparis, kalemIdler) {
  const cocuk = TABLO_SEMA.siparisler.cocuklar.find((c) => c.tablo === "siparis_kalemleri");
  const istenen = new Set(kalemIdler);
  return cocuk.cikar(siparis).filter((s) => istenen.has(s.id));
}

// Bir ana kaydın değişen alt satırları (alt_yaz biçimi, saf): yeni hâlde olup eskisinden farklı (ya da yeni) olanlar `satirlar`,
// eskide olup yenide olmayanlar `sil`. Üretim atamaları için (teslim: atama tamamlandı + kalan / tamir ataması doğdu; geri alma:
// tersi) — yalnız etkilenen satır gider, ötekiler (başka ustanın aynı anda aldığı iş) dokunulmadan kalır.
function fisKesAltFarki(tablo, cocukTablo, eski, yeni) {
  const cocuk = TABLO_SEMA[tablo].cocuklar.find((c) => c.tablo === cocukTablo);
  const eskiler = new Map((eski ? cocuk.cikar(eski) : []).map((c) => [cocuk.anahtar(c), JSON.stringify(c)]));
  const yeniler = yeni ? cocuk.cikar(yeni) : [];
  const satirlar = yeniler.filter((c) => eskiler.get(cocuk.anahtar(c)) !== JSON.stringify(c));
  const kalan = new Set(yeniler.map((c) => cocuk.anahtar(c)));
  const sil = [...eskiler.keys()].filter((k) => !kalan.has(k));
  return { satirlar, sil };
}

// Gönderici. Aynı `istek` ile tekrar çağrılabilir (ağ yeniden denemesi): sunucu ikinci kez yazmaz, ilk numarayı döner.
async function fisKesGonder(yuk) {
  const r = await supabaseIstek("rpc/fis_kes", { method: "POST", body: JSON.stringify({ p: yuk }) });
  if (!r || !r.fisNo) throw new Error("Sunucu fiş numarası döndürmedi");
  return r;
}
async function fisIptalGonder(no, sebep, alt) {
  return supabaseIstek("rpc/fis_iptal", { method: "POST", body: JSON.stringify({ p: { no, sebep: sebep || null, ...(alt ? { alt } : {}) } }) });
}

// ---- Fark tabanı (025 `_sonHal`) — sunucuya yazılmış kayıtlar "buluttaki hâl" olarak işaretlenir ----
// `eskiler` / `yeniler`: etkilenen ana kayıtların (ürün, cari, sipariş) önceki ve yeni hâli. Eskinin alt satırları tabandan
// çıkar, yeninin alt satırları girer; ana kayıt `anaDahil` ise o da (değilse ana satırın farkı bugünkü yoldan gider —
// siparişin durumu gibi). Biçim `tabloBaslangicTam` ile birebir aynı (`__k` + `id`), yoksa her satır "değişmiş" görünür.
function fisKesTabaniKur(tablo, eskiler, yeniler, { anaDahil = true } = {}) {
  const sema = TABLO_SEMA[tablo];
  if (!_sonHal[tablo]) return;   // taban hiç kurulmamış (açılış bitmedi) — dokunma
  if (anaDahil) (yeniler || []).forEach((k) => { if (k && k.id !== undefined) _sonHal[tablo].set(k.id, JSON.stringify(k)); });
  ((sema && sema.cocuklar) || []).forEach((cocuk) => {
    const ad = `${tablo}::${cocuk.tablo}`;
    if (!_sonHal[ad]) return;
    (eskiler || []).forEach((k) => { if (k) cocuk.cikar(k).forEach((c) => _sonHal[ad].delete(cocuk.anahtar(c))); });
    (yeniler || []).forEach((k) => {
      if (!k) return;
      cocuk.cikar(k).forEach((c) => { const anahtar = cocuk.anahtar(c); _sonHal[ad].set(anahtar, JSON.stringify({ ...c, __k: anahtar, id: anahtar })); });
    });
  });
}
// SUNUCUDA İPTAL EDİLMİŞ SATIRLAR tabandan çıkar (v1.733.0): ekrandan kalkan satır, yazma katmanına "silinmiş" görünüp eski
// yoldan bir daha gönderilmesin (fis_iptal zaten iptal etti; kurallar açılınca o silme reddedilir). Aynı yazmadaki öteki
// farklar (eski usul satırlar, ana kayıt) bugünkü yoldan gitmeye devam eder.
function fisKesTabandanCikar(tablo, cocukTablo, anahtarlar) {
  const m = _sonHal[`${tablo}::${cocukTablo}`];
  if (!m) return;
  (anahtarlar || []).forEach((k) => m.delete(k));
}
// Geri alınan / silinen satırlardan SUNUCU FİŞİNE bağlı olanlar (saf): üretim satırı sunucu fişindeyse `uretimFisAdi` taşır
// (079-uretim-teslim), numarası `fisNo`dadır. Döner: iptal edilecek fiş numaraları + satır kimlikleri.
function uretimSunucuFisSatirlari(stokKayitlari, cariKayitlari) {
  const fisler = new Set();
  const stokIdler = [];
  const cariIdler = [];
  (stokKayitlari || []).forEach(({ hareket: h }) => { if (h && h.uretimFisAdi && h.fisNo) { fisler.add(h.fisNo); stokIdler.push(h.id); } });
  (cariKayitlari || []).forEach(({ hareket: h }) => { if (h && h.uretimFisAdi && h.fisNo) { fisler.add(h.fisNo); cariIdler.push(h.id); } });
  return { fisler: [...fisler].sort(), stokIdler, cariIdler };
}

// Kasa & Banka tabanı (tek parça belge, 030 `tekilTabanOku`): eklenen hareketler hesabına, iptal edilenler çıkar.
function fisKesKasaTabaniKur(ekle, silIdler) {
  const taban = tekilTabanOku("muhasebe");
  if (!taban || typeof taban !== "object") return;
  let yeni = taban;
  (ekle || []).forEach((e) => { yeni = hesabaHareketEkle(yeni, e.hesapTur, e.hesapId, e.hareket); });
  const sil = new Set((silIdler || []).map(String));
  if (sil.size) {
    const temizle = (liste) => (liste || []).map((h) => ({ ...h, hareketler: (h.hareketler || []).filter((x) => !sil.has(String(x.id))) }));
    yeni = { ...yeni, kasalar: temizle(yeni.kasalar), bankalar: temizle(yeni.bankalar) };
  }
  tekilTabanAyarla("muhasebe", yeni);
}

// Değişen ana kayıtlar (saf): iki listeden kimliği verilenlerin eski ve yeni hâli.
function fisKesEtkilenen(eskiListe, yeniListe, idler) {
  const s = new Set(idler);
  return {
    eskiler: (eskiListe || []).filter((k) => k && s.has(k.id)),
    yeniler: (yeniListe || []).filter((k) => k && s.has(k.id)),
  };
}

// SUNUCU FİŞLERİ (fis_listesi) — fiş defteri ekranı, denetim ve geri alma bunları da okur. `sunucu: true` işaretli kayıt eski
// liste tablosuna (fis_defteri) YAZILMAZ (030 tekilYaz süzer); yerel defterle birleştirilir, aynı numara iki kez görünmez.
async function sunucuFisleriniOku() {
  const satirlar = await supabaseTumSatirlar("fis_listesi", "select=veri&order=olusturma.desc");
  return (satirlar || []).map((s) => ({ ...(s.veri || {}), sunucu: true })).filter((f) => f.fisNo);
}
function defterSunucuFisleriyleBirlestir(defter, sunucuFisleri) {
  const sunucuNo = new Set((sunucuFisleri || []).map((f) => f.fisNo));
  return [...(sunucuFisleri || []), ...(defter || []).filter((f) => f && !f.sunucu && !sunucuNo.has(f.fisNo))];
}

// Değişen ana kayıtların kimlikleri (saf): yeni listede nesnesi değişmiş (ya da eklenmiş / çıkmış) olanlar.
function fisKesDegisenIdler(eskiListe, yeniListe) {
  const eski = new Map((eskiListe || []).map((k) => [k.id, k]));
  const yeni = new Map((yeniListe || []).map((k) => [k.id, k]));
  const idler = [];
  yeni.forEach((k, id) => { if (eski.get(id) !== k) idler.push(id); });
  eski.forEach((_, id) => { if (!yeni.has(id)) idler.push(id); });
  return idler;
}
// Kasa belgesinden bağ kimliğine göre hareket çıkarır (saf) — 085 muhasebeBaglariniTemizle'nin yazmasız hâli.
function kasadanBaglariCikar(muhasebe, bagIdler) {
  const kume = new Set(bagIdler || []);
  const silinen = [];
  const temizle = (liste) => (liste || []).map((h) => ({
    ...h,
    hareketler: (h.hareketler || []).filter((x) => { if (kume.has(x.muhasebeBagId)) { silinen.push(String(x.id)); return false; } return true; }),
  }));
  return { muhasebe: { ...muhasebe, kasalar: temizle(muhasebe && muhasebe.kasalar), bankalar: temizle(muhasebe && muhasebe.bankalar) }, silinen };
}

// YEREL KOPYA (v1.732.0): sunucuya yazılmış durum tarayıcının yedek kopyasına da yazılır — yazma katmanı (tabloYaz / tekilYaz)
// bu yolda çağrılmadığı için kendiliğinden olmaz. Bayat kalırsa sonraki bir bekleyen yazmada eski hâl esas alınır ve sunucudaki
// satırlar "silinmiş" görünürdü. Stok görselsiz (saveStok kuralı). Yerel yazma düşerse (depo dolu) iş durmaz: bulut asıl.
function fisKesYerelYaz(anahtar, veri) {
  try {
    const deger = anahtar === "stok:items" ? gorselleriAyir(veri).stok : veri;
    // katman-muaf: bulut kopyası fis_kes / fis_iptal ile ZATEN yazıldı; bu yalnız tarayıcının yedek kopyası.
    const r = guvenliYaz(anahtar, JSON.stringify(deger), true);
    if (r && typeof r.catch === "function") r.catch((e) => console.warn("Yerel kopya yazılamadı:", anahtar, e && e.message));
  } catch (e) { console.warn("Yerel kopya yazılamadı:", anahtar, e && e.message); }
}
