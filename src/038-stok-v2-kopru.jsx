// =============================================================================================================
// STOK v2 KÖPRÜSÜ (v1.726.0) — stok yazmaları buluta FİŞ/SATIR olarak, TEK SUNUCU İŞLEMİYLE gider
// =============================================================================================================
//
// Kullanıcı (28 Ekim): "Uygulama düzgün çalışmıyor sürekli hata ve yanlış yapıyor, sil baştan kurgulamamız lazım" →
// karar: "Modül modül kuralım, veriyi taşı, stokla başla." Plan ve veritabanı: stok-v2/PLAN.md, stok-v2/*.sql.
//
// NEDEN KÖPRÜ: uygulamanın bütün stok akışları (fiş, sipariş sevki, üretim teslimi, numune, açılış, fiş geri al,
// ad değişikliği, onarımlar — 25'ten fazla kapı) TEK bir geçitten yazıyor: bellekteki ürün listesinin farkı
// (040 `_tabloEsitleUygula`, alt tablolar varyantlar + stok_hareketleri). Bu farkı satır satır REST'e göndermek
// bugünkü hataların kaynağıydı: varyant renk ADIYLA anahtarlı olduğu için ad değişikliği yüzlerce silme + ekleme
// oluyor, istekler ayrı ayrı gidiyor, biri düşerse yazma yarım kalıyordu. Köprü aynı farkı TEK bir isteğe çevirir
// (`stk_yaz`), sunucu tek işlemde uygular — ya hepsi ya hiçbiri. Ekranlar ve akışlar DEĞİŞMEDİ; değişen yazma ve
// okumanın altındaki yapı. Akışlar modül modül doğrudan fiş işlemine (stk_fis_kaydet) taşındıkça köprü incelir.
//
// NE ZAMAN ÇALIŞIR: Supabase'de `stk_gecis()` yapılmışsa (`stk_ayar.aktif`). Açılış okuması (045) bayrağı okur;
// tablo yoksa (SQL çalıştırılmamış) ya da kapalıysa bugünkü yol aynen sürer. Geçişten sonra `varyantlar` ve
// `stok_hareketleri` adları v2'nin bugünkü biçimdeki GÖRÜNÜMLERİDİR: okuyan her yer (bu uygulama, gün sonu raporu,
// bulut sayımı) değişmeden v2'den okur; eski sürümde kalmış bir cihaz görünüme YAZAMAZ, hata alır.
//
// FARKTAN İSTEĞE (saf `stokV2Yuku`, birim testi `birim-stok-v2-kopru`):
//   · Renk ve ölçü buluta KİMLİKLE gider: ad, Tanımlar'dan kimliğe çevrilir (model rengi "1058 - Taba/Siyah" kodundan,
//     hammadde rengi adından, beden adından). Ad Tanımlar'da yoksa adıyla gider (sunucu 'serbest' renk açar; aynı ad
//     Tanımlar'a girince sunucu kendiliğinden bağlar).
//   · YENİDEN ADLANDIRMA YAZMA DEĞİLDİR: adı değişen varyantın eski/yeni satırları aynı kimliğe çıkar, birbirini götürür;
//     hareketin yalnız renk/beden YAZISI değiştiyse (kimlik aynı) satır gönderilmez. Bugün 305 rengin kodlanması binlerce
//     satır silip yazıyordu; köprüde sıfır istek.
//   · Kimliği DEĞİŞEN hareket (kodsuz rengin model rengine çevrilmesi gibi) yeniden yazılır: sunucu eski varyanttan düşer,
//     yenisine yazar.
//   · Silinen hareket SİLİNMEZ, iptal edilir (iz kalır, stoktan düşer). Kaldırılan varyant: stoğu yoksa kalkar.
//   · Hareketin fiş numarası yoksa (yazma geçidini atlayan eski bir yol) `OTO-<hareket>` fişine bağlanır — fişsiz satır
//     sunucuda yazılamaz, yazılamayan istek de bekleyen defterde sonsuza dek takılırdı.
// HATA: istek düşerse 040'ın bugünkü koruması aynen işler — fark belleği geri alınır, bekleyen kayıt defterine yazılır,
// yeniden denenir. `stk_yaz` her parçası tekrara dayanıklı olduğu için yeniden gönderim stoğu İKİ KEZ değiştirmez.

let _stokV2Aktif = false;
let _stokV2Tanimlar = null;
let _stokV2OncekiTanimlar = null;
let _stokV2TanimImzasi = "";
function stokV2Aktif() { return _stokV2Aktif; }
function stokV2AktifAyarla(aktif) { _stokV2Aktif = !!aktif; }
// Renk/beden tanımlarının imzası (kimlik + ad + kod): Tanımlar nesnesi her kayıtta yenilenir, ama köprüyü ilgilendiren
// yalnız bu üç liste.
function stokV2TanimImzasi(t) {
  if (!t) return "";
  const r = (t.renkler || []).map((x) => `${x && x.id}=${x && x.ad}`).join("|");
  const k = (t.renkKombinasyonlari || []).map((x) => `${x && x.id}=${x && x.kod}`).join("|");
  const b = (t.bedenler || []).map((x) => `${x && x.id}=${x && x.ad}=${x && x.tip}`).join("|");
  return `${r}#${k}#${b}`;
}
// App, Tanımlar her değiştiğinde verir (100): adı kimliğe çeviren sözlük yazma anındaki Tanımlar'la kurulur. Bir
// ÖNCEKİ hâl de saklanır: yeniden adlandırmada farkın ESKİ satırı eski adı taşır ("Taba"); o ad güncel Tanımlar'da
// artık yok, kimliği ancak önceki hâlden bulunur. Bulunamasaydı eski ve yeni satır farklı görünür, ad değişikliği
// gereksiz yazmaya dönerdi.
function stokV2TanimlarAyarla(tanimlar) {
  const t = tanimlar || null;
  if (t === _stokV2Tanimlar) return;
  const imza = stokV2TanimImzasi(t);
  if (imza !== _stokV2TanimImzasi) {
    _stokV2OncekiTanimlar = _stokV2Tanimlar;
    _stokV2TanimImzasi = imza;
  }
  _stokV2Tanimlar = t;
}

// Ad karşılaştırma anahtarı — sunucudaki `stk_nrm` ile aynı: baş/son ve çoklu boşluk yok sayılır, Türkçe küçük harf.
function stokV2Nrm(x) {
  return String(x == null ? "" : x).trim().replace(/\s+/g, " ").toLocaleLowerCase("tr");
}
function stokV2YerTutucuMu(x) {
  const n = stokV2Nrm(x);
  return n === "" || n === "standart";
}

// Tanımlardan ad → kimlik sözlüğü. Saf. `onceki` verilirse güncelde bulunamayan ad orada aranır (yalnız farkın ESKİ
// satırları için — yeni satır her zaman güncel Tanımlar'la çözülür).
function stokV2Cozucu(tanimlar, onceki) {
  const yedek = onceki ? stokV2Cozucu(onceki) : null;
  const t = tanimlar || {};
  const renk = new Map();
  (t.renkler || []).forEach((r) => {
    if (!r || !r.id || !r.ad) return;
    const k = stokV2Nrm(r.ad);
    if (!renk.has(k)) renk.set(k, r.id);
  });
  const kombi = new Map();
  (t.renkKombinasyonlari || []).forEach((k) => {
    if (k && k.id && k.kod != null && String(k.kod).trim()) kombi.set(String(k.kod).trim(), k.id);
  });
  const olcu = new Map();   // ad → [{ id, tip }]
  (t.bedenler || []).forEach((b) => {
    if (!b || !b.id || !b.ad) return;
    const k = stokV2Nrm(b.ad);
    if (!olcu.has(k)) olcu.set(k, []);
    olcu.get(k).push({ id: b.id, tip: b.tip || "Beden" });
  });
  return {
    // Model rengi etiketi "KOD - Ad1/Ad2": kod esas (bileşen adı değişse de aynı model rengi). Değilse hammadde rengi adı.
    renk(ad) {
      if (stokV2YerTutucuMu(ad)) return null;
      const m = /^\s*(\S+)\s+-\s+\S/.exec(String(ad));
      if (m && kombi.has(m[1])) return kombi.get(m[1]);
      return renk.get(stokV2Nrm(ad)) || (yedek ? yedek.renk(ad) : null);
    },
    olcu(ad, tip) {
      if (stokV2YerTutucuMu(ad)) return null;
      const adaylar = olcu.get(stokV2Nrm(ad)) || [];
      const uyan = adaylar.find((a) => a.tip === (tip || "Beden")) || adaylar[0];
      return uyan ? uyan.id : (yedek ? yedek.olcu(ad, tip) : null);
    },
  };
}

// Bir satırın (varyant ya da hareket; 035 şemasının sütun adlarıyla) renk/ölçü kimliği ve karşılaştırma anahtarı.
function stokV2SatirKimligi(satir, cozucu, olcuTipi) {
  const renkYok = stokV2YerTutucuMu(satir.renk);
  const olcuYok = stokV2YerTutucuMu(satir.beden);
  const renkId = renkYok ? null : cozucu.renk(satir.renk);
  const olcuId = olcuYok ? null : cozucu.olcu(satir.beden, olcuTipi);
  const rk = renkYok ? "" : (renkId || `ad:${stokV2Nrm(satir.renk)}`);
  const ok = olcuYok ? "" : (olcuId || `ad:${stokV2Nrm(satir.beden)}`);
  return {
    renkId, olcuId,
    renk: renkYok ? null : satir.renk,
    olcu: olcuYok ? null : satir.beden,
    anahtar: `${satir.urun_id}|${rk}|${ok}`,
  };
}

const STOK_V2_HAREKET_ALANLARI = ["fis_no", "miktar", "kaynak", "tarih", "siparis_id", "siparis_no", "kalem_id", "cari_id",
  "uretim_id", "rezervasyon_siparis_id", "fazla_gonderim", "aciklama", "ek"];

function stokV2HareketSatiri(h, kim) {
  return {
    id: h.id, fisId: h.fis_no || `OTO-${h.id}`, urunId: h.urun_id,
    renkId: kim.renkId, renk: kim.renk, olcuId: kim.olcuId, olcu: kim.olcu,
    miktar: Number(h.miktar) || 0, kaynak: h.kaynak || null, tarih: h.tarih || null,
    siparisId: h.siparis_id || null, siparisNo: h.siparis_no || null, kalemId: h.kalem_id || null,
    cariId: h.cari_id || null, uretimId: h.uretim_id || null, rezervasyonSiparisId: h.rezervasyon_siparis_id || null,
    fazlaGonderim: !!h.fazla_gonderim, aciklama: h.aciklama || null, ek: h.ek || {},
  };
}

// FARK → `stk_yaz` YÜKÜ. Saf.
//   varyantFarki / hareketFarki: 040'ın alt tablo farkları ({ eklenen, guncellenen, silinen, silinenKayitlar }).
//   eskiVaryant / eskiHareket: fark belleğinin YAZMADAN ÖNCEKİ hâli (Map: kimlik → JSON) — güncellenen satırın neyinin
//   değiştiğini görmek için.
//   olcuTipleri: Map ürün kimliği → ölçü tipi (Beden/Boyut).
// Döner: { varyantAc, satirlar, iptal, varyantKaldir, otoFis } — `otoFis`: fiş numarası olmadığı için OTO- fişine
// bağlanan hareketler (günlüğe yazılır).
function stokV2Yuku({ varyantFarki, hareketFarki, eskiVaryant, eskiHareket, tanimlar, oncekiTanimlar, olcuTipleri }) {
  const cozucu = stokV2Cozucu(tanimlar);
  const eskiCozucu = stokV2Cozucu(tanimlar, oncekiTanimlar);   // farkın eski satırları (silinen varyant, hareketin önceki hâli)
  const tip = (urunId) => (olcuTipleri && olcuTipleri.get ? olcuTipleri.get(urunId) : null) || "Beden";
  const eski = (harita, id) => {
    const d = harita && harita.get ? harita.get(id) : undefined;
    if (d === undefined) return null;
    try { return JSON.parse(d); } catch (e) { return null; }
  };
  const vf = varyantFarki || { eklenen: [], guncellenen: [], silinenKayitlar: [] };
  const hf = hareketFarki || { eklenen: [], guncellenen: [], silinen: [] };

  // VARYANTLAR — adı değişen varyant: eski ve yeni satırı aynı kimliğe çıkar, birbirini götürür. Eski ad Tanımlar'dan
  // çoktan kalkmış olabilir (adı çözülemez): o zaman varyantın kendi renk kimliği (renk_id, ad değişince korunur) eşler.
  const varyantKaldirHarita = new Map();
  const renkIdAnahtari = (v, cz) => (v.renk_id ? `${v.urun_id}|id:${v.renk_id}|${stokV2SatirKimligi(v, cz, tip(v.urun_id)).anahtar.split("|")[2]}` : null);
  const renkIdIleSilinen = new Map();
  (vf.silinenKayitlar || []).forEach((v) => {
    const kim = stokV2SatirKimligi(v, eskiCozucu, tip(v.urun_id));
    varyantKaldirHarita.set(kim.anahtar, { satir: v, kim });
    const ra = renkIdAnahtari(v, eskiCozucu);
    if (ra) renkIdIleSilinen.set(ra, kim.anahtar);
  });
  const acilacak = new Map();
  const varyantAcEkle = (v, kim) => {
    acilacak.set(kim.anahtar, { urunId: v.urun_id, renkId: kim.renkId, renk: kim.renk, olcuId: kim.olcuId, olcu: kim.olcu, minStok: Number(v.min_stok) || 0 });
  };
  (vf.eklenen || []).forEach((v) => {
    const kim = stokV2SatirKimligi(v, cozucu, tip(v.urun_id));
    const ra = renkIdAnahtari(v, cozucu);
    const gidenAnahtar = varyantKaldirHarita.has(kim.anahtar) ? kim.anahtar : (ra && renkIdIleSilinen.get(ra));
    const giden = gidenAnahtar ? varyantKaldirHarita.get(gidenAnahtar) : null;
    if (giden) {
      varyantKaldirHarita.delete(gidenAnahtar);
      if ((Number(giden.satir.min_stok) || 0) !== (Number(v.min_stok) || 0)) varyantAcEkle(v, kim);
      return;
    }
    varyantAcEkle(v, kim);
  });
  (vf.guncellenen || []).forEach((v) => {
    // Varyant satırı her stok değişiminde "güncellenir" (miktar türetilmiş, 012). Sunucuda miktar saklanmaz: yalnız
    // minimum stok değiştiyse gider.
    const o = eski(eskiVaryant, v.id);
    if (o && (Number(o.min_stok) || 0) === (Number(v.min_stok) || 0)) return;
    varyantAcEkle(v, stokV2SatirKimligi(v, cozucu, tip(v.urun_id)));
  });
  // Aynı anahtar hem açılıyor hem kaldırılıyorsa (iki ad aynı kimliğe çıktı) kaldırılmaz.
  acilacak.forEach((_, k) => varyantKaldirHarita.delete(k));

  // HAREKETLER
  const satirlar = [];
  const otoFis = [];
  const satirEkle = (h) => {
    const kim = stokV2SatirKimligi(h, cozucu, tip(h.urun_id));
    if (!h.fis_no) otoFis.push(h.id);
    satirlar.push(stokV2HareketSatiri(h, kim));
  };
  (hf.eklenen || []).forEach(satirEkle);
  (hf.guncellenen || []).forEach((h) => {
    const o = eski(eskiHareket, h.id);
    if (o && o.urun_id === h.urun_id) {
      const ayniKimlik = stokV2SatirKimligi(o, eskiCozucu, tip(o.urun_id)).anahtar === stokV2SatirKimligi(h, cozucu, tip(h.urun_id)).anahtar;
      const ayniAlanlar = STOK_V2_HAREKET_ALANLARI.every((a) => JSON.stringify(o[a] ?? null) === JSON.stringify(h[a] ?? null));
      // Yalnız renk/beden YAZISI değişti (yeniden adlandırma): sunucuda ad kimlikten gelir, gönderilecek bir şey yok.
      if (ayniKimlik && ayniAlanlar) return;
    }
    satirEkle(h);
  });
  const iptal = (hf.silinen || []).map(String);

  return {
    varyantAc: Array.from(acilacak.values()),
    satirlar,
    iptal,
    varyantKaldir: Array.from(varyantKaldirHarita.values()).map(({ satir, kim }) => ({
      urunId: satir.urun_id, renkId: kim.renkId, renk: kim.renk, olcuId: kim.olcuId, olcu: kim.olcu,
    })),
    otoFis,
  };
}

function stokV2YukBosMu(yuk) {
  return !yuk || (!yuk.varyantAc.length && !yuk.satirlar.length && !yuk.iptal.length && !yuk.varyantKaldir.length);
}

// Büyük yük (yedek geri yükleme, ilk eşitleme) parçalara bölünür: istek gövdesi ~800 KB'ı geçmesin (v1.725.1: büyük
// gövde ağ geçidinde "Failed to fetch" diye düşüyordu). Her parça kendi işleminde ve tekrara dayanıklı; yarıda düşen
// yazmanın yeniden gönderimi zarar vermez. Varyant açma ilk parçada (satırlar ona yazılır), iptal ve varyant kaldırma
// son parçada (taşınan satırlar önce yeni varyanta geçsin, eski varyant boşalınca kalksın).
const STOK_V2_PARCA_BAYT = 800 * 1024;
const STOK_V2_PARCA_SATIR = 500;
function stokV2Parcala(yuk, enFazlaBayt = STOK_V2_PARCA_BAYT, enFazlaSatir = STOK_V2_PARCA_SATIR) {
  const gruplar = [];
  let grup = [];
  let bayt = 0;
  (yuk.satirlar || []).forEach((s) => {
    const b = JSON.stringify(s).length;
    if (grup.length && (grup.length >= enFazlaSatir || bayt + b > enFazlaBayt)) { gruplar.push(grup); grup = []; bayt = 0; }
    grup.push(s);
    bayt += b;
  });
  if (grup.length || gruplar.length === 0) gruplar.push(grup);
  return gruplar.map((satirlar, i) => ({
    varyantAc: i === 0 ? yuk.varyantAc : [],
    satirlar,
    iptal: i === gruplar.length - 1 ? yuk.iptal : [],
    varyantKaldir: i === gruplar.length - 1 ? yuk.varyantKaldir : [],
  }));
}

// =============================================================================================================
// CARİ v2 KÖPRÜSÜ (v1.727.0) — cari hareketleri de tek kapıdan (`car_yaz`), silme yerine iptal
// =============================================================================================================
// Cari hareketinin kendi kimliği var, adı kimliğe çevrilecek bir şey yok (stoğun renk/beden derdi yok): fark aynen
// gider. Eklenen ve değişen satır `satirlar` (bugünkü cari_hareketleri sütun adlarıyla), silinen satır `iptal`.
// Supabase'de `car_gecis()` yapılmışsa (`stk_ayar.cari_aktif`) çalışır; yoksa bugünkü REST yolu.
let _cariV2Aktif = false;
function cariV2Aktif() { return _cariV2Aktif; }
function cariV2AktifAyarla(aktif) { _cariV2Aktif = !!aktif; }

// Saf. hareketFarki: 040'ın cariler::cari_hareketleri farkı (satırlarda `id` = `__k` = hareket kimliği).
function cariV2Yuku(hareketFarki) {
  const hf = hareketFarki || { eklenen: [], guncellenen: [], silinen: [] };
  const temiz = ({ __k, ...satir }) => satir;
  return {
    satirlar: [...(hf.eklenen || []), ...(hf.guncellenen || [])].map(temiz),
    iptal: (hf.silinen || []).map(String),
  };
}
function cariV2YukBosMu(yuk) { return !yuk || (!yuk.satirlar.length && !yuk.iptal.length); }
function cariV2Parcala(yuk, enFazlaBayt = STOK_V2_PARCA_BAYT, enFazlaSatir = STOK_V2_PARCA_SATIR) {
  const gruplar = [];
  let grup = [];
  let bayt = 0;
  (yuk.satirlar || []).forEach((s) => {
    const b = JSON.stringify(s).length;
    if (grup.length && (grup.length >= enFazlaSatir || bayt + b > enFazlaBayt)) { gruplar.push(grup); grup = []; bayt = 0; }
    grup.push(s);
    bayt += b;
  });
  if (grup.length || gruplar.length === 0) gruplar.push(grup);
  return gruplar.map((satirlar, i) => ({ satirlar, iptal: i === gruplar.length - 1 ? yuk.iptal : [] }));
}

// =============================================================================================================
// SİPARİŞ KALEMİ / ÜRETİM ATAMASI KÖPRÜSÜ (v1.728.0, alt-v2.sql) — veri taşınmadan tek kapı (`alt_yaz`)
// =============================================================================================================
// Bu iki tablo zaten kimlikli, tipli satırlar; değişen yalnız yazma yolu: fark REST yerine `alt_yaz`a (ya da fişin
// stok/cari satırlarıyla birlikte `fis_yaz`a) gider. Silinen satır sunucuda silinir — kopyası sunucu arşivine düşer.
// Supabase'de `alt_gecis()` yapılmışsa (`stk_ayar.alt_aktif`) çalışır; geçişte bu tablolara doğrudan yazma kapanır.
let _altV2Aktif = false;
function altV2Aktif() { return _altV2Aktif; }
function altV2AktifAyarla(aktif) { _altV2Aktif = !!aktif; }
const ALT_V2_TABLOLARI = { siparisler: "siparis_kalemleri", uretim: "uretim_atamalari" };

// Saf. hareketFarki: 040'ın alt tablo farkı (satırlarda `id` = `__k` = satır kimliği).
function altV2Yuku(hf) {
  const f = hf || { eklenen: [], guncellenen: [], silinen: [] };
  const temiz = ({ __k, ...satir }) => satir;
  return { satirlar: [...(f.eklenen || []), ...(f.guncellenen || [])].map(temiz), sil: (f.silinen || []).map(String) };
}
function altV2YukBosMu(yuk) { return !yuk || (!yuk.satirlar.length && !yuk.sil.length); }
function altV2Parcala(yuk) {
  return cariV2Parcala({ satirlar: yuk.satirlar, iptal: yuk.sil }).map((p) => ({ satirlar: p.satirlar, sil: p.iptal }));
}

// =============================================================================================================
// KASA & BANKA v2 KÖPRÜSÜ (v1.729.0, kasa-v2.sql) — tek parça belge yerine hesap / hareket / çek SATIRLARI (`kas_yaz`)
// =============================================================================================================
// Kasa & Banka bugün TEK SATIRLIK bir JSON belgesi (muhasebe.veri). Her kayıtta belgenin TAMAMI gidiyordu; boş ya da bayat
// listeli bir cihaz (24 Ekim telefon: "Kasa & Banka 0 hesap") başka cihazın hesaplarını, hareketlerini silebiliyordu.
// v1.725.0'daki üç yönlü birleştirme deliği daralttı; v2 kökten kapatır: bu cihaz yalnız KENDİ DEĞİŞİKLİĞİNİ gönderir.
//
// FARK (saf `kasaV2Yuku`, birim testi `birim-kasa-v2`): TABAN (030 `tekilTabanOku("muhasebe")` — bu cihazın en son bildiği
// bulut hâli ya da en son başarıyla gönderdiği hâl) ile YENİ hâl karşılaştırılır:
//   · yeni ya da değişen hesap (hareketleri hariç alanları) → `hesaplar`; tabanda olup yenide olmayan → `hesapSil` (pasif)
//   · yeni / değişen / hesabı değişen hareket → `hareketler`; tabanda olup yenide olmayan → `hareketIptal` (silinmez)
//   · çekler aynı (`cekler`, `cekIptal`); öteki anahtarlar (kurlar, kur geçmişi…) değişense `ayar`, kalktıysa `ayarSil`.
// Başka cihazın eklediği kayıt bu cihazın ne tabanında ne yeni hâlinde var → hiç dokunulmaz. TABAN YOKSA (bulut okunamamış)
// yalnız ekleme / güncelleme gider, HİÇBİR ŞEY silinmez. Karşılaştırma anahtar sırasından bağımsız (047 `kararliJson`; jsonb
// anahtarları yeniden sıralar). Hesap sırası istemciden gitmez: yeni hesap sunucuda sona eklenir (ekran da sona ekler).
// Kimliği olmayan eski kayıt (hesap, hareket, çek) içeriğinden kalıcı bir kimlik alır — aynı içerik her seferinde aynı kimlik.
// HATA: istek düşerse 030'un bugünkü yolu — bekleyen defter, yeniden deneme; taban güncellenmediği için sonraki yazma
// düşen farkı da kapsar. `kas_yaz` kimlikle yazdığı için yeniden gönderim çift kayıt açmaz.
let _kasaV2Aktif = false;
function kasaV2Aktif() { return _kasaV2Aktif; }
function kasaV2AktifAyarla(aktif) { _kasaV2Aktif = !!aktif; }
const KASA_V2_LISTELER = { kasalar: "kasa", bankalar: "banka" };

// İçerikten kısa, kararlı kimlik (FNV-1a, iki tohum → 16 onaltılık hane). Güvenlik değil, yalnız kimlik.
function kasaV2Ozet(metin) {
  let a = 0x811c9dc5; let b = 0x01000193 ^ 0x5bd1e995;
  const s = String(metin);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x01000193 + 0x2f) >>> 0;
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

// Belgeyi kimlikli haritalara açar. Saf.
function kasaV2Ac(belge) {
  const b = belge && typeof belge === "object" && !Array.isArray(belge) ? belge : {};
  const hesaplar = new Map();
  const hareketler = new Map();
  const cekler = new Map();
  Object.entries(KASA_V2_LISTELER).forEach(([anahtar, tur]) => {
    (Array.isArray(b[anahtar]) ? b[anahtar] : []).forEach((h, i) => {
      if (!h || typeof h !== "object") return;
      const { hareketler: hl, id, ...veri } = h;
      const hid = id ? String(id) : `kh-${kasaV2Ozet(`${tur}:${i}:${veri.ad || ""}`)}`;
      if (hesaplar.has(hid)) return;   // yinelenen kimlik: ilki (sunucu göçüyle aynı kural)
      hesaplar.set(hid, { tur, veri, json: kararliJson(veri) });
      const sayac = new Map();
      (Array.isArray(hl) ? hl : []).forEach((x) => {
        if (!x || typeof x !== "object") return;
        let xid = x.id ? String(x.id) : null;
        if (!xid) {
          const j = kararliJson(x);
          const n = (sayac.get(j) || 0) + 1;
          sayac.set(j, n);
          xid = `mh-${kasaV2Ozet(`${hid}:${n}:${j}`)}`;
        }
        if (!hareketler.has(xid)) hareketler.set(xid, { hesap_id: hid, veri: x, json: kararliJson(x) });
      });
    });
  });
  const csayac = new Map();
  (Array.isArray(b.cekler) ? b.cekler : []).forEach((c) => {
    if (!c || typeof c !== "object") return;
    let cid = c.id ? String(c.id) : null;
    if (!cid) {
      const j = kararliJson(c);
      const n = (csayac.get(j) || 0) + 1;
      csayac.set(j, n);
      cid = `cek-${kasaV2Ozet(`${n}:${j}`)}`;
    }
    if (!cekler.has(cid)) cekler.set(cid, { veri: c, json: kararliJson(c) });
  });
  const ayar = {};
  Object.keys(b).forEach((k) => { if (!(k in KASA_V2_LISTELER) && k !== "cekler" && b[k] !== undefined) ayar[k] = b[k]; });
  return { hesaplar, hareketler, cekler, ayar };
}

// Saf. taban: bu cihazın bildiği bulut hâli (yoksa null → silme yok); yeni: gönderilecek hâl.
function kasaV2Yuku(taban, yeni) {
  const tabanVar = !!(taban && typeof taban === "object");
  const t = kasaV2Ac(tabanVar ? taban : null);
  const y = kasaV2Ac(yeni);
  const yuk = { hesaplar: [], hesapSil: [], hareketler: [], hareketIptal: [], cekler: [], cekIptal: [], ayar: {}, ayarSil: [] };
  y.hesaplar.forEach((h, id) => {
    const e = t.hesaplar.get(id);
    if (!e || e.tur !== h.tur || e.json !== h.json) yuk.hesaplar.push({ id, tur: h.tur, veri: h.veri });
  });
  y.hareketler.forEach((x, id) => {
    const e = t.hareketler.get(id);
    if (!e || e.hesap_id !== x.hesap_id || e.json !== x.json) yuk.hareketler.push({ id, hesap_id: x.hesap_id, veri: x.veri });
  });
  y.cekler.forEach((c, id) => {
    const e = t.cekler.get(id);
    if (!e || e.json !== c.json) yuk.cekler.push({ id, veri: c.veri });
  });
  Object.keys(y.ayar).forEach((k) => {
    if (!(k in t.ayar) || kararliJson(t.ayar[k]) !== kararliJson(y.ayar[k])) yuk.ayar[k] = y.ayar[k];
  });
  if (tabanVar) {
    t.hesaplar.forEach((_, id) => { if (!y.hesaplar.has(id)) yuk.hesapSil.push(id); });
    t.hareketler.forEach((_, id) => { if (!y.hareketler.has(id)) yuk.hareketIptal.push(id); });
    t.cekler.forEach((_, id) => { if (!y.cekler.has(id)) yuk.cekIptal.push(id); });
    Object.keys(t.ayar).forEach((k) => { if (!(k in y.ayar)) yuk.ayarSil.push(k); });
  }
  return yuk;
}
function kasaV2YukBosMu(yuk) {
  return !yuk || (!yuk.hesaplar.length && !yuk.hesapSil.length && !yuk.hareketler.length && !yuk.hareketIptal.length
    && !yuk.cekler.length && !yuk.cekIptal.length && !Object.keys(yuk.ayar || {}).length && !(yuk.ayarSil || []).length);
}
// TOPLU İPTAL KİLİDİ (040 `topluSilmeEngeliMi` ile aynı ölçü, v1.712.0'ın kasa karşılığı). v2'de silme iptaldir, veri
// kaybolmaz; ama ekranı bir hata yüzünden boşalmış ya da yarım kalmış, tabanı DOLU bir cihaz bütün hareketleri iptal
// ettirebilirdi — ekranlarda Kasa & Banka yine "0 hesap" görünürdü. Kullanıcının hiçbir işlemi tek kayıtta hareketlerin ya da
// çeklerin yarısını götürmez; hesap da tek tek kaldırılır (hareketi olan hesap zaten silinemez, 205). Engel: hareket / çek
// iptali eşiği aşıyor ya da (en az iki hesap varken) hesapların HEPSİ birden kalkıyor. Saf.
function kasaV2TopluSilmeEngeli(taban, yuk) {
  if (!taban || typeof taban !== "object" || !yuk) return null;
  const t = kasaV2Ac(taban);
  if (topluSilmeEngeliMi(yuk.hareketIptal.length, t.hareketler.size)) return { tur: "hareket", silinen: yuk.hareketIptal.length, onceki: t.hareketler.size };
  if (topluSilmeEngeliMi(yuk.cekIptal.length, t.cekler.size)) return { tur: "çek", silinen: yuk.cekIptal.length, onceki: t.cekler.size };
  if (yuk.hesapSil.length >= 2 && yuk.hesapSil.length >= t.hesaplar.size) return { tur: "hesap", silinen: yuk.hesapSil.length, onceki: t.hesaplar.size };
  return null;
}
// 030 tekilYaz ve 040 zarfın ortak hazırlığı: taban → fark → kilit. Boş farkta null. Kilit tutarsa hata (`topluSilmeEngeli`:
// bekleyen deftere YAZILMAZ — yazılsaydı yeniden denenirdi). `secenek.topluSilmeIzni`: yedekten geri yükleme (093).
// TABAN YOKSA YAZILMAZ (v1.730.1 — baştan aşağı denetim). Taban, bu cihazın bulutta bildiği hâl; yoksa açılışta bulut
// OKUNAMAMIŞ ve ekranda eski yerel kopya var demektir. Fark o zaman "her şey yeni" çıkıyor ve bütün eski kayıtlar buluta
// basılıyordu: başka cihazda düzeltilen hareket eski hâline dönüyor, iptal edilen yeniden açılıyordu (ör. açılıştaki otomatik
// kur güncellemesi). v1.725.0'daki kural geri geldi: bulut okunamadıysa yazılmaz — bekleyen deftere düşer, yeniden açılışta
// taban kurulunca (090) yalnız bu cihazın farkı gider.
function v2TabanYokHatasi(tablo) {
  return new Error(`${tablo}: buluttaki hâl bu açılışta okunamadı — yazma bekletildi (sayfayı yenileyin; kayıt kaybolmaz)`);
}
function kasaV2YukHazirla(yeni, secenek) {
  const taban = tekilTabanOku("muhasebe");
  if (taban === undefined || taban === null) throw v2TabanYokHatasi("Kasa & Banka");
  const yuk = kasaV2Yuku(taban, yeni);
  const engel = secenek && secenek.topluSilmeIzni ? null : kasaV2TopluSilmeEngeli(taban, yuk);
  if (engel) {
    gunlukYaz(`TOPLU SİLME ENGELLENDİ: Kasa & Banka — ${engel.silinen} ${engel.tur} kaldırılacaktı (eski hâlde ${engel.onceki})`, "guvenlik",
      { tablo: "muhasebe", ...engel });
    const e = new Error(`Toplu silme engellendi: Kasa & Banka'da ${engel.silinen} ${engel.tur} (eldeki ${engel.onceki} kayıttan) tek yazmada `
      + `kaldırılacaktı; bu bir hata belirtisidir, buluta DOKUNULMADI. Sayfayı yenileyip buluttaki hâli yükleyin.`);
    e.topluSilmeEngeli = true;
    throw e;
  }
  return kasaV2YukBosMu(yuk) ? null : yuk;
}

// Büyük yük (taban yokken ilk yazma, yedek geri yükleme): hareketler ve çekler parça parça; hesaplar, ayar ve iptaller
// SON parçada (hareket hesaptan önce yazılabilir — aralarında yabancı anahtar yok; iptal, eklemelerden sonra).
function kasaV2Parcala(yuk, enFazlaBayt = STOK_V2_PARCA_BAYT, enFazlaSatir = STOK_V2_PARCA_SATIR) {
  const satirlar = [...yuk.hareketler.map((x) => ["hareketler", x]), ...yuk.cekler.map((x) => ["cekler", x])];
  const gruplar = [];
  let grup = [];
  let bayt = 0;
  satirlar.forEach((s) => {
    const b = JSON.stringify(s[1]).length;
    if (grup.length && (grup.length >= enFazlaSatir || bayt + b > enFazlaBayt)) { gruplar.push(grup); grup = []; bayt = 0; }
    grup.push(s);
    bayt += b;
  });
  if (grup.length || gruplar.length === 0) gruplar.push(grup);
  return gruplar.map((g, i) => {
    const son = i === gruplar.length - 1;
    const p = { hareketler: g.filter((s) => s[0] === "hareketler").map((s) => s[1]), cekler: g.filter((s) => s[0] === "cekler").map((s) => s[1]) };
    if (son) {
      Object.assign(p, { hesaplar: yuk.hesaplar, hesapSil: yuk.hesapSil, hareketIptal: yuk.hareketIptal, cekIptal: yuk.cekIptal, ayarSil: yuk.ayarSil });
      if (Object.keys(yuk.ayar).length) p.ayar = yuk.ayar;
    }
    return p;
  });
}

// =============================================================================================================
// TEK PARÇA LİSTELER v2 KÖPRÜSÜ (v1.730.0, liste-v2.sql) — teklif, fatura, koli, görev, model, fiş defteri, mesaj
// =============================================================================================================
// Bu yedi liste Kasa & Banka gibi tek satırlık birer JSON dizisiydi; her kayıtta dizinin TAMAMI yazılıyordu (v1.725.0'dan
// beri buluttakiyle üç yönlü birleşerek — ama "oku → birleştir → yaz" arasında başka cihazın kaydı yine ezilebiliyordu:
// iki kişi aynı anda mesaj atınca biri kaybolabiliyordu). v2'de her kayıt ayrı satır; bu cihaz yalnız KENDİ FARKINI
// gönderir (`lst_yaz`). Geçiş Supabase'de `lst_gecis()` ile; taşınan listeler `stk_ayar.liste_tablolari` (045 okur).
// FARK (saf `listeV2Yuku`, birim testi `birim-liste-v2`): taban (030 `tekilTabanOku`) ile yeni dizi kimlikle karşılaştırılır.
//   · yeni / değişen kayıt → `kayitlar`, tabanda olup yenide olmayan → `iptal` (silinmez). Taban yoksa silme yok.
//   · SIRA: yalnız YENİ kayıt sıra taşır. Listenin başına konduysa (önünde bilinen kayıt yok) eksi, sonuna / arasına
//     konduysa artı "şimdi" — yeniden okunan liste ekrandakiyle aynı sırada gelir. Var olan kaydın sırası değişmez.
//   · Kimliksiz eski kayıt içerikten kararlı kimlik alır (göçten sonra hepsi kimlikli; bu yalnız güvence).
//   · Toplu iptal kilidi (Kasa'daki gibi): bir yazma listenin yarısını (≥ 20 kayıt) götüremez; izin yalnız yedekten
//     geri yüklemede (093).
const LISTE_V2_TABLOLARI = ["teklifler", "faturalar", "koliler", "gorevler", "modeller", "fis_defteri", "mesajlar"];
let _listeV2Tablolari = new Set();
function listeV2Aktif(tablo) { return _listeV2Tablolari.has(tablo); }
function listeV2TablolariAyarla(liste) {
  _listeV2Tablolari = new Set((Array.isArray(liste) ? liste : []).filter((t) => LISTE_V2_TABLOLARI.includes(t)));
}

// Diziyi kimlik → { veri, json, sira } haritasına açar (sıra: dizideki konum). Saf.
function listeV2Ac(dizi) {
  const harita = new Map();
  const sayac = new Map();
  (Array.isArray(dizi) ? dizi : []).forEach((x, i) => {
    if (!x || typeof x !== "object" || Array.isArray(x)) return;
    let id = x.id !== undefined && x.id !== null && x.id !== "" ? String(x.id) : null;
    const json = kararliJson(x);
    if (!id) {
      const n = (sayac.get(json) || 0) + 1;
      sayac.set(json, n);
      id = `lx-${kasaV2Ozet(`${n}:${json}`)}`;
    }
    if (!harita.has(id)) harita.set(id, { veri: x, json, konum: i });
  });
  return harita;
}

// Saf. taban: bu cihazın bildiği bulut dizisi (yoksa null → silme yok, sıra yok); yeni: gönderilecek dizi; simdi: ms.
function listeV2Yuku(taban, yeni, simdi = Date.now()) {
  const tabanVar = Array.isArray(taban);
  const t = listeV2Ac(tabanVar ? taban : null);
  const y = listeV2Ac(yeni);
  const kayitlar = [];
  // Önünde tabandan bilinen bir kayıt olmayan yeni kayıt "başa" eklenmiştir (dizi yeniden eskiye tutulan listeler).
  let bilinenGoruldu = false;
  const sirali = Array.from(y.entries()).sort((a, b) => a[1].konum - b[1].konum);
  sirali.forEach(([id, x]) => {
    const e = t.get(id);
    if (e) {
      bilinenGoruldu = true;
      if (e.json !== x.json) kayitlar.push({ id, veri: x.veri });
      return;
    }
    const k = { id, veri: x.veri };
    if (tabanVar) k.sira = (bilinenGoruldu || t.size === 0) ? simdi * 1000 + x.konum : -simdi * 1000 + x.konum;
    kayitlar.push(k);
  });
  const iptal = tabanVar ? Array.from(t.keys()).filter((id) => !y.has(id)) : [];
  return { kayitlar, iptal, tabanBoyu: t.size };
}
function listeV2YukBosMu(yuk) { return !yuk || (!yuk.kayitlar.length && !yuk.iptal.length); }

// 030 tekilYaz'ın hazırlığı: taban → fark → toplu iptal kilidi. Boş farkta null; kilit tutarsa `topluSilmeEngeli` hatası.
function listeV2YukHazirla(tablo, yeni, secenek) {
  const taban = tekilTabanOku(tablo);
  if (!Array.isArray(taban)) throw v2TabanYokHatasi(tablo);   // bkz. kasaV2YukHazirla (v1.730.1)
  const yuk = listeV2Yuku(taban, yeni);
  if (!(secenek && secenek.topluSilmeIzni) && topluSilmeEngeliMi(yuk.iptal.length, yuk.tabanBoyu)) {
    gunlukYaz(`TOPLU SİLME ENGELLENDİ: ${tablo} — ${yuk.iptal.length} kayıt kaldırılacaktı (eski hâlde ${yuk.tabanBoyu})`, "guvenlik",
      { tablo, silinen: yuk.iptal.length, onceki: yuk.tabanBoyu });
    const e = new Error(`Toplu silme engellendi: ${tablo} listesinden ${yuk.iptal.length} kayıt (eldeki ${yuk.tabanBoyu} kayıttan) tek yazmada `
      + `kaldırılacaktı; bu bir hata belirtisidir, buluta DOKUNULMADI. Sayfayı yenileyip buluttaki hâli yükleyin.`);
    e.topluSilmeEngeli = true;
    throw e;
  }
  return listeV2YukBosMu(yuk) ? null : yuk;
}

// Gönderici: büyük yük (model görselleri, uzun fiş defteri) parça parça; iptaller son parçada. Her parça tekrara dayanıklı.
async function listeV2Gonder(tablo, yuk, enFazlaBayt = STOK_V2_PARCA_BAYT, enFazlaSatir = STOK_V2_PARCA_SATIR) {
  const parcalar = cariV2Parcala({ satirlar: yuk.kayitlar, iptal: yuk.iptal }, enFazlaBayt, enFazlaSatir);
  let sonuc = null;
  for (const p of parcalar) {
    sonuc = await supabaseIstek("rpc/lst_yaz", { method: "POST", body: JSON.stringify({ p: { tablo, kayitlar: p.satirlar, iptal: p.iptal } }) });
  }
  return sonuc;
}

// =============================================================================================================
// 040 İLE BAĞ — bir tablonun alt farkı köprüden mi gidecek? (040 `_yazmaHazirla` bağlamı `y`)
// =============================================================================================================
// Döner: null (köprü yok → REST) ya da { tur: "stok" | "cari", yuk, ozet } — yük boş olabilir (köprü açık ama
// gönderilecek bir şey yok: REST'e DÜŞMEZ, çünkü o tablolar artık görünüm).
function v2KopruYuku(y) {
  if (!y) return null;
  const fark = (ad) => ((y.cocukFarklari || []).find((c) => c.cocuk && c.cocuk.tablo === ad) || {}).cFark;
  if (y.tablo === "urunler" && stokV2Aktif()) {
    const olcuTipleri = new Map((y.kayitlar || []).filter(Boolean).map((u) => [u.id, u.olcuTipi || "Beden"]));
    const yuk = stokV2Yuku({
      varyantFarki: fark("varyantlar"),
      hareketFarki: fark("stok_hareketleri"),
      eskiVaryant: y.bellekYedegi && y.bellekYedegi["urunler::varyantlar"],
      eskiHareket: y.bellekYedegi && y.bellekYedegi["urunler::stok_hareketleri"],
      tanimlar: _stokV2Tanimlar,
      oncekiTanimlar: _stokV2OncekiTanimlar,
      olcuTipleri,
    });
    return { tur: "stok", yuk: stokV2YukBosMu(yuk) ? null : yuk };
  }
  if (y.tablo === "cariler" && cariV2Aktif()) {
    const yuk = cariV2Yuku(fark("cari_hareketleri"));
    return { tur: "cari", yuk: cariV2YukBosMu(yuk) ? null : yuk };
  }
  if (ALT_V2_TABLOLARI[y.tablo] && altV2Aktif()) {
    const altTablo = ALT_V2_TABLOLARI[y.tablo];
    const yuk = altV2Yuku(fark(altTablo));
    return { tur: "alt", tablo: altTablo, yuk: altV2YukBosMu(yuk) ? null : yuk };
  }
  return null;
}

// KURAL PROVASI KAYDI (v1.742.0, test/kural-provasi.js): fiş defteri kurallar açılınca (19. adım) hareket tablolarına yalnız fis_kes /
// fis_iptal yazar; köprüden (stk_yaz / car_yaz / kas_yaz / fis_yaz) HAREKET SATIRI taşıyan yazma reddedilir. Fiş kesici tabanı
// önceden ilerlettiği için onun ardındaki yazmanın farkı boştur — buraya hareket satırıyla gelen her yük eski yoldur. Yalnız test
// açar (`window.__eskiYolKaydi` dizisi); uygulamada hiçbir şey yapmaz. Hesap tanımı, çek kaydı, ayar, varyant açma kurallara takılmaz.
function eskiYolKaydinaYaz(dolu) {
  if (typeof window === "undefined" || !Array.isArray(window.__eskiYolKaydi)) return;
  dolu.forEach((k) => {
    const y = k.yuk || {};
    const satir = k.tur === "kasa" ? (y.hareketler || []).length : (y.satirlar || []).length;
    const iptal = k.tur === "kasa" ? (y.hareketIptal || []).length : (y.iptal || []).length;
    if (k.tur === "alt" || (!satir && !iptal)) return;
    const ornek = (k.tur === "kasa" ? (y.hareketler || []).map((h) => (h.veri && (h.veri.aciklama || h.veri.fisNo)) || h.id)
      : (y.satirlar || []).map((h) => [h.kaynak || h.islemTipi || h.tip, h.fisId || h.fis_no || h.fisNo, h.aciklama].filter(Boolean).join(" · "))).slice(0, 3);
    window.__eskiYolKaydi.push({ tur: k.tur, satir, iptal, fisYolu: typeof fisKesYolu === "function" ? fisKesYolu() : null, ornek });
  });
}

// GÖNDERİCİ — bir ya da birkaç köprü yükü (stok, cari, sipariş kalemi / üretim ataması, kasa & banka). Birden çok parça varsa ve
// her biri tek parçaya sığıyorsa TEK `fis_yaz` isteği (tek veritabanı işlemi: ya hepsi ya hiçbiri). Sığmıyorsa (yedek
// geri yükleme gibi büyük yazma) her biri kendi işlemiyle, parça parça — her parça tekrara dayanıklı. Hata yukarı gider
// (bellek geri + bekleyen defter 040'ta).
async function v2KopruGonder(kopruler) {
  const dolu = (kopruler || []).filter((k) => k && k.yuk);
  if (!dolu.length) return null;
  eskiYolKaydinaYaz(dolu);
  const stok = dolu.find((k) => k.tur === "stok");
  const cari = dolu.find((k) => k.tur === "cari");
  const altlar = dolu.filter((k) => k.tur === "alt");
  const kasa = dolu.find((k) => k.tur === "kasa");
  const stokParcalari = stok ? stokV2Parcala(stok.yuk) : [];
  const cariParcalari = cari ? cariV2Parcala(cari.yuk) : [];
  const altParcalari = altlar.map((k) => ({ tablo: k.tablo, parcalar: altV2Parcala(k.yuk) }));
  const kasaParcalari = kasa ? kasaV2Parcala(kasa.yuk) : [];
  const tekParca = stokParcalari.length <= 1 && cariParcalari.length <= 1 && altParcalari.every((a) => a.parcalar.length <= 1)
    && kasaParcalari.length <= 1;
  const sonuc = { stok: null, cari: null, alt: null, kasa: null };
  if (tekParca && dolu.length > 1) {
    const p = {};
    if (stok) p.stok = stokParcalari[0];
    if (cari) p.cari = cariParcalari[0];
    if (altParcalari.length) p.alt = Object.fromEntries(altParcalari.map((a) => [a.tablo, a.parcalar[0]]));
    if (kasa) p.kasa = kasaParcalari[0];
    const r = await supabaseIstek("rpc/fis_yaz", { method: "POST", body: JSON.stringify({ p }) });
    // GÖNDERİLEN HER PARÇA YANITTA OLMALI (v1.730.1 denetim): sunucudaki fis_yaz eski bir kurulum dosyasıyla daralırsa kasa / alt
    // parçasını hatasız atlıyordu, istemci "yazıldı" sanıp tabanı ilerletiyordu. Eksik parça → hata → bekleyen defter.
    const eksik = Object.keys(p).filter((k) => !r || r[k] === null || r[k] === undefined);
    if (eksik.length) throw new Error(`fis_yaz yanıtında ${eksik.join(", ")} yok — sunucudaki fis_yaz eski; Supabase'de 15. adımı çalıştırın`);
    sonuc.stok = r && r.stok;
    sonuc.cari = r && r.cari;
    sonuc.alt = r && r.alt;
    sonuc.kasa = r && r.kasa;
  } else {
    if (stok) {
      const toplam = { varyantAc: 0, satir: 0, iptal: 0, varyantKaldir: 0, atlanan: [] };
      for (const parca of stokParcalari) {
        const r = await supabaseIstek("rpc/stk_yaz", { method: "POST", body: JSON.stringify({ p: parca }) });
        if (r && typeof r === "object") {
          ["varyantAc", "satir", "iptal", "varyantKaldir"].forEach((k) => { toplam[k] += Number(r[k]) || 0; });
          if (Array.isArray(r.atlanan)) toplam.atlanan.push(...r.atlanan);
        }
      }
      sonuc.stok = toplam;
    }
    if (cari) {
      for (const parca of cariParcalari) await supabaseIstek("rpc/car_yaz", { method: "POST", body: JSON.stringify({ p: parca }) });
      sonuc.cari = { satir: cari.yuk.satirlar.length, iptal: cari.yuk.iptal.length };
    }
    for (const a of altParcalari) {
      for (const parca of a.parcalar) await supabaseIstek("rpc/alt_yaz", { method: "POST", body: JSON.stringify({ p: { [a.tablo]: parca } }) });
    }
    for (const parca of kasaParcalari) sonuc.kasa = await supabaseIstek("rpc/kas_yaz", { method: "POST", body: JSON.stringify({ p: parca }) });
  }
  if (stok && stok.yuk.otoFis.length) {
    gunlukYaz(`Stok v2: fiş numarası olmayan ${stok.yuk.otoFis.length} hareket OTO- fişine bağlandı`, "veri", { hareketler: stok.yuk.otoFis.slice(0, 50) });
  }
  const atlanan = (sonuc.stok && Array.isArray(sonuc.stok.atlanan)) ? sonuc.stok.atlanan : [];
  if (atlanan.length) {
    // Kaldırılan ama stoğu olan varyant sunucuda kalır (stok kaybolmasın) — ekranda da hareketlerden geri gelir.
    gunlukYaz(`Stok v2: stoğu olduğu için kaldırılmayan ${atlanan.length} varyant`, "veri", { atlanan: atlanan.slice(0, 50) });
  }
  return sonuc;
}
