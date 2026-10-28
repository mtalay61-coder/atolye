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

// GÖNDERİCİ — 040 `_tabloEsitleUygula` urunler'in alt tablolarını REST yerine buradan yazar. Hata yukarı gider
// (bellek geri + bekleyen defter 040'ta).
async function stokV2Gonder(cocukFarklari, bellekYedegi, kayitlar) {
  const fark = (ad) => ((cocukFarklari || []).find((c) => c.cocuk && c.cocuk.tablo === ad) || {}).cFark;
  const olcuTipleri = new Map((kayitlar || []).filter(Boolean).map((u) => [u.id, u.olcuTipi || "Beden"]));
  const yuk = stokV2Yuku({
    varyantFarki: fark("varyantlar"),
    hareketFarki: fark("stok_hareketleri"),
    eskiVaryant: bellekYedegi && bellekYedegi["urunler::varyantlar"],
    eskiHareket: bellekYedegi && bellekYedegi["urunler::stok_hareketleri"],
    tanimlar: _stokV2Tanimlar,
    oncekiTanimlar: _stokV2OncekiTanimlar,
    olcuTipleri,
  });
  if (stokV2YukBosMu(yuk)) return null;
  const toplam = { varyantAc: 0, satir: 0, iptal: 0, varyantKaldir: 0, atlanan: [] };
  for (const parca of stokV2Parcala(yuk)) {
    const sonuc = await supabaseIstek("rpc/stk_yaz", { method: "POST", body: JSON.stringify({ p: parca }) });
    if (sonuc && typeof sonuc === "object") {
      ["varyantAc", "satir", "iptal", "varyantKaldir"].forEach((k) => { toplam[k] += Number(sonuc[k]) || 0; });
      if (Array.isArray(sonuc.atlanan)) toplam.atlanan.push(...sonuc.atlanan);
    }
  }
  if (yuk.otoFis.length) {
    gunlukYaz(`Stok v2: fiş numarası olmayan ${yuk.otoFis.length} hareket OTO- fişine bağlandı`, "veri", { hareketler: yuk.otoFis.slice(0, 50) });
  }
  if (toplam.atlanan.length) {
    // Kaldırılan ama stoğu olan varyant sunucuda kalır (stok kaybolmasın) — ekranda da hareketlerden geri gelir.
    gunlukYaz(`Stok v2: stoğu olduğu için kaldırılmayan ${toplam.atlanan.length} varyant`, "veri", { atlanan: toplam.atlanan.slice(0, 50) });
  }
  return toplam;
}
