// =============================================================================================
// VERİ KATMANI — kayıt bazlı yazma
//
// Uygulama bugüne kadar her değişiklikte TÜM diziyi diske yazıyordu:
//     guvenliYaz("stok:items", JSON.stringify(tumUrunler))
//
// Tek kullanıcıda sorun değil. ÜÇ kullanıcıda veri kaybettirir: Mehmet kaydettiğinde elindeki
// (Ahmet'in az önce eklediği siparişi içermeyen) listeyi diske yazar ve o siparişi SESSİZCE siler.
//
// Çözüm: yazmadan önce eski hâl ile yeni hâli karşılaştırıp yalnızca DEĞİŞEN kayıtları belirlemek.
// Çağrı yerlerini tek tek "hangi kayıt değişti" bilecek şekilde yazmak yerine farkı burada
// hesaplıyoruz — 84 çağrı yerinde bir kaydı atlama riski ortadan kalkıyor ve mantık tek yerde.
//
// Bugün fark yalnızca HESAPLANIYOR, yazma hâlâ toplu yapılıyor (davranış birebir aynı).
// Supabase'e geçildiğinde `tabloYaz` içindeki toplu yazma, satır bazlı upsert/delete ile
// değiştirilecek — başka hiçbir yere dokunmadan.
const _sonHal = {}; // tablo -> Map(id -> JSON dizesi)

// Bir tablonun eski ve yeni hâlini karşılaştırır.
function tabloFarki(tablo, kayitlar) {
  const onceki = _sonHal[tablo] || new Map();
  const yeni = new Map();
  const eklenen = [];
  const guncellenen = [];
  const silinen = [];

  (kayitlar || []).forEach((k) => {
    if (!k || k.id === undefined) return;
    const dize = JSON.stringify(k);
    yeni.set(k.id, dize);
    const eski = onceki.get(k.id);
    if (eski === undefined) eklenen.push(k);
    else if (eski !== dize) guncellenen.push(k);
  });
  // Silinen kaydın yalnızca KİMLİĞİ değil, KENDİSİ de dönüyor. Kimliği yapay olan tablolarda
  // (varyantlar: urun_id+renk+beden) silme sorgusu ancak sütun değerleriyle kurulabilir; o
  // değerler yalnızca burada, bellekteki eski hâlde duruyor. Kayıt gitmişse başka kaynağı yok.
  const silinenKayitlar = [];
  onceki.forEach((dize, id) => {
    if (yeni.has(id)) return;
    silinen.push(id);
    // JSON.parse KORUMASIZ: bu dizeyi biz yazdık, bozuksa bir şeyler ciddi biçimde yanlış
    // demektir. Yutulursa silme sessizce atlanır — düzeltmeye çalıştığımız hatanın ta kendisi.
    silinenKayitlar.push(JSON.parse(dize));
  });

  _sonHal[tablo] = yeni;
  return { eklenen, guncellenen, silinen, silinenKayitlar };
}

// ================= OKUNUR DEĞİŞİKLİK ÖZETİ (v1.744.17) =================
// Kullanıcı (12 Kasım, günlük ekran görüntüsü — "urunler: 1 güncellendi · guncellenen: 1" satırları): "Burada yapılan işlemi
// detaylı ver: X modeline Y rengi eklendi, Z modeline 5 beden eklendi…". Günlük yalnız SAYI tutuyordu; neyin değiştiği hiçbir
// yerde kalmıyordu. Yazma katmanı (040 `_yazmaHazirla`) kaydın ESKİ hâlini (fark belleği) ve YENİ hâlini biliyor; buradan
// kayıt başına okunur cümleler çıkar ("Bot (No 101): renk eklendi: Lacivert · beden eklendi: 42, 43 · kapak resmi değişti").
// Saf işlev (birim-degisim-ozeti). Görsel / büyük veri DEĞERİ yazılmaz (yalnız "eklendi / değişti"); kısa metin ve sayılar yazılır.
const DEGISIM_TABLO_ADI = { urunler: "Ürün", cariler: "Cari", siparisler: "Sipariş", uretim: "Üretim", stok_rezervasyonlari: "Rezervasyon", onaylar: "Onay", cop: "Çöp" };
// Alan → okunur ad. `deger: true` olanların eski → yeni değeri yazılır (kısa metin / sayı); ötekiler yalnız "değişti".
const DEGISIM_ALAN = {
  ad: { ad: "ad", deger: true }, unvan: { ad: "ünvan", deger: true }, kategori: { ad: "kategori", deger: true }, birim: { ad: "birim", deger: true },
  olcuTipi: { ad: "ölçü tipi", deger: true }, malzemeTipi: { ad: "malzeme tipi", deger: true }, mamulTipi: { ad: "mamul tipi", deger: true },
  alisFiyati: { ad: "alış fiyatı", deger: true }, alisParaBirimi: { ad: "alış para birimi", deger: true }, satisFiyati: { ad: "satış fiyatı", deger: true },
  satisParaBirimi: { ad: "satış para birimi", deger: true }, birimFiyat: { ad: "birim fiyat", deger: true }, kdvOrani: { ad: "KDV oranı", deger: true },
  sezon: { ad: "sezon", deger: true }, sezonYili: { ad: "sezon yılı", deger: true }, stokNo: { ad: "stok no", deger: true },
  durum: { ad: "durum", deger: true }, asama: { ad: "aşama", deger: true }, tarih: { ad: "tarih", deger: true }, teslimTarihi: { ad: "teslim tarihi", deger: true },
  adet: { ad: "adet", deger: true }, tip: { ad: "tip", deger: true }, paraBirimi: { ad: "para birimi", deger: true }, telefon: { ad: "telefon", deger: true },
  varsayilanProses: { ad: "varsayılan proses", deger: true }, tedarikciId: { ad: "tedarikçi" }, paketlemeNotu: { ad: "paketleme notu" },
  recete: { ad: "reçete" }, receteGerceklesme: { ad: "reçete gerçekleşmesi" }, fiyatKurallari: { ad: "fiyat kuralları" }, prosesUcretleri: { ad: "proses ücretleri" },
  ozelKodlar: { ad: "özel kodlar" }, hariciBarkodlar: { ad: "harici barkodlar" }, kapasite: { ad: "kapasite" }, notlar: { ad: "notlar" }, aciklama: { ad: "açıklama" },
  bedenMiktarlari: { ad: "beden miktarları" }, prosesIlerleme: { ad: "proses ilerlemesi" }, prosesPlani: { ad: "proses planı" }, adres: { ad: "adres" },
  vergiNo: { ad: "vergi no", deger: true }, vergiDairesi: { ad: "vergi dairesi", deger: true }, eposta: { ad: "e-posta", deger: true },
};
// Okunmayan / gürültü alanlar: sürüm damgaları, zaman, görsel ayrıntısı (aşağıda ayrıca söylenir).
const DEGISIM_ATLA = new Set(["id", "surum", "guncellendi", "guncelleme", "degistiren", "degistirmeZamani", "zaman", "sonGuncelleme", "kapakResmi", "renkResimleri", "variants", "hareketler", "kalemler"]);
function _degisimKisa(v) {
  if (v === undefined || v === null || v === "") return "boş";
  if (typeof v === "boolean") return v ? "evet" : "hayır";
  const m = typeof v === "object" ? JSON.stringify(v) : String(v);
  return m.length > 40 ? `${m.slice(0, 37)}…` : m;
}
function _degisimEtiket(tablo, k) {
  if (!k) return "?";
  const ad = k.ad || k.unvan || k.baslik || k.siparisNo || k.fisNo || k.model || k.id;
  const no = tablo === "urunler" && k.stokNo ? ` (No ${k.stokNo})` : (tablo === "uretim" && k.takipKodu ? ` (${k.takipKodu})` : "");
  return `${ad}${no}`;
}
const _benzersiz = (l) => [...new Set(l.filter((x) => x !== undefined && x !== null && x !== ""))];
const _liste = (l, n = 8) => (l.length > n ? `${l.slice(0, n).join(", ")} … (+${l.length - n})` : l.join(", "));
// Kimlikli alt liste (hareketler, kalemler): eklenen / çıkarılan / değişen sayısı.
function _altListeFarki(eski, yeni) {
  const e = new Map((eski || []).filter((x) => x && x.id).map((x) => [x.id, JSON.stringify(x)]));
  const y = new Map((yeni || []).filter((x) => x && x.id).map((x) => [x.id, JSON.stringify(x)]));
  let eklenen = 0; let cikan = 0; let degisen = 0;
  y.forEach((d, id) => { if (!e.has(id)) eklenen++; else if (e.get(id) !== d) degisen++; });
  e.forEach((d, id) => { if (!y.has(id)) cikan++; });
  return { eklenen, cikan, degisen };
}
// Tek kaydın eski → yeni değişiklik cümleleri.
function kayitDegisiklikleri(tablo, eski, yeni) {
  const c = [];
  const o = eski || {}; const n = yeni || {};
  if (tablo === "urunler") {
    const ov = o.variants || []; const nv = n.variants || [];
    const oRenk = _benzersiz(ov.map((v) => v.renk)); const nRenk = _benzersiz(nv.map((v) => v.renk));
    const oBeden = _benzersiz(ov.map((v) => v.beden)); const nBeden = bedenSirala(_benzersiz(nv.map((v) => v.beden)));
    const renkEk = nRenk.filter((r) => !oRenk.includes(r)); const renkCik = oRenk.filter((r) => !nRenk.includes(r));
    const bedenEk = nBeden.filter((b) => !oBeden.includes(b)); const bedenCik = oBeden.filter((b) => !nBeden.includes(b));
    if (renkEk.length) c.push(`${renkEk.length} renk eklendi: ${_liste(renkEk)}`);
    if (renkCik.length) c.push(`${renkCik.length} renk çıkarıldı: ${_liste(renkCik)}`);
    if (bedenEk.length) c.push(`${bedenEk.length} beden eklendi: ${_liste(bedenEk)}`);
    if (bedenCik.length) c.push(`${bedenCik.length} beden çıkarıldı: ${_liste(bedenCik)}`);
    // Stok miktarı (renk/beden aynı kalıp miktarı değişen varyantlar).
    const anahtar = (v) => `${v.renk}|${v.beden}`;
    const om = new Map(ov.map((v) => [anahtar(v), Number(v.miktar) || 0]));
    const miktarDegisen = nv.filter((v) => om.has(anahtar(v)) && om.get(anahtar(v)) !== (Number(v.miktar) || 0));
    if (miktarDegisen.length) {
      const top = (l) => l.reduce((t, v) => t + (Number(v.miktar) || 0), 0);
      c.push(`stok miktarı değişti (${miktarDegisen.length} renk/beden; toplam ${top(ov)} → ${top(nv)})`);
    }
    const nvMap = new Map(nv.map((v) => [anahtar(v), v]));
    const minDegisen = ov.filter((v) => nvMap.has(anahtar(v)) && (Number(v.minStok) || 0) !== (Number(nvMap.get(anahtar(v)).minStok) || 0));
    if (minDegisen.length) c.push(`min. stok değişti (${minDegisen.length} renk/beden)`);
    const h = _altListeFarki(o.hareketler, n.hareketler);
    if (h.eklenen) c.push(`${h.eklenen} stok hareketi eklendi`);
    if (h.cikan) c.push(`${h.cikan} stok hareketi silindi`);
    if (h.degisen) c.push(`${h.degisen} stok hareketi düzeltildi`);
    // Görseller: değer YAZILMAZ (büyük veri) — yalnız ne olduğu.
    if ((o.kapakResmi || "") !== (n.kapakResmi || "") && !(o.kapakResmi === undefined || n.kapakResmi === undefined)) {
      c.push(!o.kapakResmi ? "kapak resmi eklendi" : !n.kapakResmi ? "kapak resmi kaldırıldı" : "kapak resmi değişti");
    }
    if (o.renkResimleri !== undefined && n.renkResimleri !== undefined) {
      const or = o.renkResimleri || {}; const nr = n.renkResimleri || {};
      const ekR = Object.keys(nr).filter((k) => nr[k] && !or[k]); const cikR = Object.keys(or).filter((k) => or[k] && !nr[k]);
      const degR = Object.keys(nr).filter((k) => nr[k] && or[k] && JSON.stringify(nr[k]) !== JSON.stringify(or[k]));
      if (ekR.length) c.push(`renk resmi eklendi: ${_liste(ekR)}`);
      if (cikR.length) c.push(`renk resmi kaldırıldı: ${_liste(cikR)}`);
      if (degR.length) c.push(`renk resmi değişti: ${_liste(degR)}`);
    }
    if (!!o.pasif !== !!n.pasif) c.push(n.pasif ? "pasife alındı" : "yeniden aktif yapıldı");
  } else {
    const altAd = { hareketler: "hareket", kalemler: "kalem" };
    Object.keys(altAd).forEach((alan) => {
      if (!Array.isArray(o[alan]) && !Array.isArray(n[alan])) return;
      const f = _altListeFarki(o[alan], n[alan]);
      if (f.eklenen) c.push(`${f.eklenen} ${altAd[alan]} eklendi`);
      if (f.cikan) c.push(`${f.cikan} ${altAd[alan]} silindi`);
      if (f.degisen) c.push(`${f.degisen} ${altAd[alan]} değişti`);
    });
    if (!!o.pasif !== !!n.pasif) c.push(n.pasif ? "pasife alındı" : "yeniden aktif yapıldı");
  }
  // Kalan alanlar: tanımlıysa okunur adla, değilse ham adla — "ad: Bot → Bot Deri", "reçete değişti".
  const digerleri = [];
  new Set([...Object.keys(o), ...Object.keys(n)]).forEach((alan) => {
    if (DEGISIM_ATLA.has(alan) || alan === "pasif") return;
    if (JSON.stringify(o[alan] === undefined ? null : o[alan]) === JSON.stringify(n[alan] === undefined ? null : n[alan])) return;
    const t = DEGISIM_ALAN[alan];
    if (t && t.deger) c.push(`${t.ad}: ${_degisimKisa(o[alan])} → ${_degisimKisa(n[alan])}`);
    else if (t) c.push(`${t.ad} değişti`);
    else digerleri.push(alan);
  });
  if (digerleri.length) c.push(`öteki alanlar değişti: ${_liste(digerleri, 5)}`);
  return c;
}
// Bir yazmanın (040) bütün kayıtları için cümleler. `eskiHal`: fark belleğinin yazmadan önceki hâli (Map id → JSON dizesi).
// Döner: [{ etiket, islem: "eklendi"|"güncellendi"|"silindi", ayrinti: [cümle…] }] — en çok `sinir` kayıt.
function degisimOzeti(tablo, fark, eskiHal, sinir = 20) {
  const sonuc = [];
  const eskiOku = (id) => { try { const d = eskiHal && eskiHal.get(id); return d ? JSON.parse(d) : null; } catch (e) { return null; } };
  (fark.eklenen || []).forEach((k) => {
    const a = [];
    if (tablo === "urunler") {
      const v = k.variants || [];
      const r = _benzersiz(v.map((x) => x.renk)); const b = bedenSirala(_benzersiz(v.map((x) => x.beden)));
      if (r.length) a.push(`${r.length} renk: ${_liste(r)}`);
      if (b.length) a.push(`${b.length} beden: ${_liste(b)}`);
    }
    sonuc.push({ etiket: _degisimEtiket(tablo, k), islem: "eklendi", ayrinti: a });
  });
  (fark.guncellenen || []).forEach((k) => {
    const eski = eskiOku(k.id);
    sonuc.push({ etiket: _degisimEtiket(tablo, k), islem: "güncellendi", ayrinti: eski ? kayitDegisiklikleri(tablo, eski, k) : [] });
  });
  (fark.silinenKayitlar || []).forEach((k) => sonuc.push({ etiket: _degisimEtiket(tablo, k), islem: "silindi", ayrinti: [] }));
  return sonuc.slice(0, sinir);
}
// Günlük satırı: "Ürün güncellendi — Bot (No 101): 1 renk eklendi: Lacivert · 2 beden eklendi: 42, 43".
function degisimMetni(tablo, ozet) {
  const tur = DEGISIM_TABLO_ADI[tablo] || tablo;
  return (ozet || []).map((o) => `${tur} ${o.islem} — ${o.etiket}${o.ayrinti.length ? `: ${o.ayrinti.join(" · ")}` : ""}`);
}

// Uygulama ilk açıldığında diskten okunan hâli "başlangıç" olarak işaretler.
// Bu yapılmazsa ilk kayıtta her satır "yeni eklendi" görünür ve gereksiz yazma olur.
// Ana kayıtla BİRLİKTE alt kayıtların da fark belleğini kurar.
//
// SORUN (yaşandı): açılışta yalnızca ana tablolar kuruluyordu. Alt tabloların belleği boş
// kalıyor, sayfa açıldıktan sonraki İLK yazmada `silinen` listesi boş çıkıyordu — çünkü
// karşılaştırılacak bir "eski hâl" yoktu. Silinen hareket yerelde gidiyor, ekrandan kayboluyor,
// ama buluttan HİÇ silinmiyordu; yenileyince geri geliyordu. "Fiş temizlendi ama temizlenmiyor"
// şikâyetinin sebebi buydu. Aynı oturumda ikinci deneme çalışıyordu, çünkü bellek o arada
// dolmuş oluyordu — hatayı bu aralıklı davranış gizledi.
//
// Kayıt biçimi `_tabloEsitleUygula`'daki ile BİREBİR aynı olmalı (`__k` ve `id` dahil), yoksa
// ilk yazmada her alt kayıt "değişmiş" görünür ve gereksiz yazma seli olur.
function tabloBaslangicTam(tablo, kayitlar) {
  tabloBaslangic(tablo, kayitlar);
  const sema = TABLO_SEMA[tablo];
  if (!sema) return;
  (sema.cocuklar || []).forEach((cocuk) => {
    const duz = [];
    (kayitlar || []).forEach((k) => {
      cocuk.cikar(k).forEach((c) => {
        const anahtar = cocuk.anahtar(c);
        duz.push({ ...c, __k: anahtar, id: anahtar });
      });
    });
    tabloBaslangic(`${tablo}::${cocuk.tablo}`, duz);
  });
}

function tabloBaslangic(tablo, kayitlar) {
  const m = new Map();
  (kayitlar || []).forEach((k) => { if (k && k.id !== undefined) m.set(k.id, JSON.stringify(k)); });
  _sonHal[tablo] = m;
}

// =============================================================================================
// BEKLEYEN KAYIT DEFTERİ (v1.556.0) — buluta GİDEMEMİŞ kayıtlar, oturumlar arası.
//
// "Bekleyen yazma" defteri (030) yalnız "bu TABLO buluttan geride" der; HANGİ kayıtların gitmediğini
// bilmez. Fark belleği ise oturumla ölür. Sonuç (kullanıcı, 3 Ekim — "Jut" olayı): internetsizken açılan
// ürün buluta hiç gitmedi; açılışta yerel kopya esas alınıp fark tabanı da YERELDEN kuruldu, yani Jut
// "bulutta var" sayıldı; sonraki başarılı yazma bekleyen yazma defterini sildi; bir sonraki açılışta Jut
// yoktu. Bu defter, düşen yazmanın kayıt kimliklerini tutar; açılışta fark tabanından düşülür (ya da
// silinecekse tabana eklenir) ki ilk yazma onları da göndersin. Başarılı yazma tabloyu defterden siler.
// Biçim: { tablo: { ana: { id: "yaz" | "sil" }, cocuk: { altTablo: { anahtar: { t: "yaz" } | { t: "sil", k: kayıt } } } } }
const BEKLEYEN_KAYIT_ANAHTAR = "bekleyen:kayitlar";
function bekleyenKayitlariOku() {
  try {
    const d = JSON.parse((typeof window !== "undefined" && window.localStorage && window.localStorage.getItem(BEKLEYEN_KAYIT_ANAHTAR)) || "{}");
    return d && typeof d === "object" ? d : {};
  } catch (e) { return {}; }
}
function bekleyenKayitlariYaz(d) {
  try { window.localStorage.setItem(BEKLEYEN_KAYIT_ANAHTAR, JSON.stringify(d)); } catch (e) { /* depo yoksa defter yok */ }
}
// Düşen bir yazmanın farklarını deftere işler (öncekilerle birleşir; son durum kazanır).
function bekleyenKayitEkle(tablo, fark, cocukFarklari) {
  const d = bekleyenKayitlariOku();
  const t = d[tablo] || { ana: {}, cocuk: {} };
  t.ana = t.ana || {}; t.cocuk = t.cocuk || {};
  [...(fark.eklenen || []), ...(fark.guncellenen || [])].forEach((k) => { if (k && k.id !== undefined) t.ana[k.id] = "yaz"; });
  (fark.silinen || []).forEach((id) => { t.ana[id] = "sil"; });
  (cocukFarklari || []).forEach(({ cocuk, cFark }) => {
    const c = t.cocuk[cocuk.tablo] || {};
    // `p`: alt kaydın ANA kaydı (v1.569.0) — açılışta yalnız defterdeki ana kayıtlar yerelden alınabilsin.
    const ebeveynAlan = { urunler: "urun_id", cariler: "cari_id", siparisler: "siparis_id", uretim: "uretim_id" }[tablo];
    const ebeveyn = (k) => (ebeveynAlan && k[ebeveynAlan] != null ? String(k[ebeveynAlan]) : null);
    [...(cFark.eklenen || []), ...(cFark.guncellenen || [])].forEach((k) => { if (k && k.id !== undefined) c[k.id] = { t: "yaz", p: ebeveyn(k) }; });
    (cFark.silinenKayitlar || []).forEach((k) => { if (k && k.id !== undefined) c[k.id] = { t: "sil", k, p: ebeveyn(k) }; });
    t.cocuk[cocuk.tablo] = c;
  });
  d[tablo] = t;
  bekleyenKayitlariYaz(d);
}
function bekleyenKayitTemizle(tablo) {
  const d = bekleyenKayitlariOku();
  if (!d[tablo]) return;
  delete d[tablo];
  bekleyenKayitlariYaz(d);
}
// Açılışta, fark tabanı kurulduktan SONRA çağrılır: defterdeki "yaz"lar tabandan düşer (gönderilsin),
// "sil"ler tabana eklenir (silme gönderilsin). Döner: işlenen kayıt sayısı.
function bekleyenKayitlariTabanaUygula(tablo) {
  const t = bekleyenKayitlariOku()[tablo];
  if (!t) return 0;
  let n = 0;
  const m = _sonHal[tablo] || new Map();
  Object.entries(t.ana || {}).forEach(([id, tur]) => {
    n++;
    if (tur === "yaz") m.delete(id);
    else if (!m.has(id)) m.set(id, JSON.stringify({ id }));
  });
  _sonHal[tablo] = m;
  Object.entries(t.cocuk || {}).forEach(([alt, kayitlar]) => {
    const ad = `${tablo}::${alt}`;
    const cm = _sonHal[ad] || new Map();
    Object.entries(kayitlar || {}).forEach(([k, v]) => {
      n++;
      if (v && v.t === "yaz") cm.delete(k);
      else if (v && v.t === "sil" && v.k && !cm.has(k)) cm.set(k, JSON.stringify(v.k));
    });
    _sonHal[ad] = cm;
  });
  return n;
}
// BEKLEYEN YAZMASI OLAN TABLONUN AÇILIŞ TABANI. Durum (ekran) yerel kopyadır — bulutun gerisinde
// değil İLERİSİNDE. Taban ise BULUTUN GERÇEK HÂLİ olmalı ki yerelde olup bulutta olmayan her şey
// (internetsiz açılan ürün) ilk yazmada gitsin. Alt kayıtlarda bulutta olup yerelde OLMAYANLAR (başka
// cihazın aynı ürüne eklediği hareket) tabandan çıkarılır: silinmezler — veri kaybı silmekten değil
// eklenmemekten olsun. Yerelde bilerek silinenler defterden ("sil") tabana geri eklenir.
function tabloBaslangicBekleyen(tablo, bulutKayitlar, durumKayitlar) {
  tabloBaslangicTam(tablo, bulutKayitlar);
  const sema = TABLO_SEMA[tablo];
  (sema && sema.cocuklar || []).forEach((cocuk) => {
    const durumdakiler = new Set();
    (durumKayitlar || []).forEach((k) => cocuk.cikar(k).forEach((c) => durumdakiler.add(cocuk.anahtar(c))));
    const m = _sonHal[`${tablo}::${cocuk.tablo}`];
    if (m) [...m.keys()].forEach((k) => { if (!durumdakiler.has(k)) m.delete(k); });
  });
  bekleyenKayitlariTabanaUygula(tablo);
}
// Bekleyen yazma varken açılış durumu: YEREL kopya + bulutta olup yerelde olmayan ana kayıtlar (başka
// cihazın eklediği) — bu cihazda bilerek silinenler (defterde "sil") hariç. Saf.
function yereliBulutlaBirlestir(yerel, bulut, tablo) {
  const t = bekleyenKayitlariOku()[tablo] || {};
  const silinen = new Set(Object.entries(t.ana || {}).filter(([, v]) => v === "sil").map(([id]) => id));
  const yazilan = new Set(Object.entries(t.ana || {}).filter(([, v]) => v === "yaz").map(([id]) => id));
  const cocukYazVar = Object.values(t.cocuk || {}).some((kayitlar) => Object.keys(kayitlar || {}).length > 0);
  // YALNIZ DEFTERDEKİLER YERELDEN (v1.569.0, denetim — çok cihaz): önce bekleyen yazması olan tablonun TAMAMI yerelden
  // alınıyordu; yerelle bulut arasındaki BÜTÜN farklar (bayat kayıtlar dahil) gönderiliyor, başka cihazın bu arada
  // değiştirdiği kayıt (fiyat, varyant) eski hâline dönüyordu. Ayrıntılı defter (v1.556) varsa: defterde "yaz" olan
  // kayıt yerelden (+ buluttaki, bu cihazda silinmemiş hareketleri), "sil" olan hiç, GERİSİ BULUTTAN. Defter yoksa ya da
  // yalnız alt kayıt içeriyorsa (eski sürümden kalan bekleyen) eski davranış: yerel esas + buluttaki yeniler.
  const ebeveynsizCocuk = Object.values(t.cocuk || {}).some((kayitlar) => Object.values(kayitlar || {}).some((v) => v && v.p == null));
  if ((yazilan.size === 0 && silinen.size === 0 && !cocukYazVar) || ebeveynsizCocuk) {
    const yerelIdler = new Set((yerel || []).map((k) => k && k.id));
    return [...(yerel || []), ...(bulut || []).filter((k) => k && !yerelIdler.has(k.id) && !silinen.has(String(k.id)))];
  }
  const silinenCocuk = new Set();
  const cocukYazilan = new Set();   // alt kaydı defterde olan ana kayıtlar
  Object.values(t.cocuk || {}).forEach((kayitlar) => Object.entries(kayitlar || {}).forEach(([k, v]) => {
    if (v && v.t === "sil") silinenCocuk.add(String(k));
    if (v && v.p != null) cocukYazilan.add(String(v.p));
  }));
  const yerelHarita = new Map((yerel || []).filter(Boolean).map((k) => [String(k.id), k]));
  const hareketBirlestir = (yer, bul) => {
    if (!yer || !bul || !Array.isArray(yer.hareketler) || !Array.isArray(bul.hareketler)) return yer;
    const var_ = new Set(yer.hareketler.map((h) => h && String(h.id)));
    const ek = bul.hareketler.filter((h) => h && !var_.has(String(h.id)) && !silinenCocuk.has(String(h.id)));
    return ek.length ? { ...yer, hareketler: [...yer.hareketler, ...ek] } : yer;
  };
  // Alt kaydı defterde olan ana kayıt (yalnız hareket eklenmiş ürün) da yerelden — `p` ile bilinir. Eski defterde `p`
  // yoksa (`ebeveynsizCocuk`) yukarıdaki eski davranışa düşülür.
  const yereldenMi = (id) => yazilan.has(id) || cocukYazilan.has(id);
  const bulutIdler = new Set();
  const sonuc = [];
  (bulut || []).forEach((k) => {
    if (!k) return;
    const id = String(k.id);
    bulutIdler.add(id);
    if (silinen.has(id)) return;
    sonuc.push(yereldenMi(id) && yerelHarita.has(id) ? hareketBirlestir(yerelHarita.get(id), k) : k);
  });
  (yerel || []).forEach((k) => { if (k && !bulutIdler.has(String(k.id)) && (yazilan.has(String(k.id)) || cocukYazilan.has(String(k.id)))) sonuc.push(k); });
  return sonuc;
}

// =============================================================================================
// SÜRÜM KONTROLÜ — İYİMSER KİLİTLEME
//
// SORUN: fark katmanı "hangi kayıt değişti" sorusunu çözdü ama "ben bu kaydı okuduktan SONRA
// başkası değiştirdi mi" sorusunu çözmedi. Ahmet ile Mehmet aynı siparişi açar; Ahmet kaydeder,
// ardından Mehmet kaydeder. Mehmet'in gönderdiği satır Ahmet'in değişikliğini SESSİZCE siler —
// uyarı yok, günlük yok, iz yok. Bir hafta sonra "ben bunu girmiştim" denir ve kimse bulamaz.
//
// ÇÖZÜM: her ana kaydın bir `surum` sayacı var. Güncelleme "sürümü hâlâ N ise yaz" koşuluyla
// gönderiliyor. Aradan başkası geçtiyse sürüm N+1 olmuştur, koşul tutmaz ve sunucu SIFIR satır
// günceller. Çakışmayı buradan anlıyoruz — tahminle değil, veritabanının cevabıyla.
//
// Sayacın UYGULAMA KAYDININ İÇİNDE tutulmaması bilinçli: içeride olsaydı her başarılı yazmadan
// sonra kayıt "değişmiş" görünür, fark katmanı onu yeniden yazmak ister ve kendi kendini besleyen
// bir yazma döngüsü kurulurdu.
// =============================================================================================
// GÜNLÜK (denetim izi)
//
// "Kim ne yaptı" sorusunun cevabı. Üç kural:
//
// 1. SALT EKLEME. Günlük kaydı güncellenmez, silinmez, fark katmanından geçmez. Değiştirilebilen
//    bir günlük günlük değildir. Bu yüzden `tabloYaz` kullanılmıyor — o katman fark hesaplayıp
//    üzerine yazıyor; günlük ise yalnızca ekleniyor.
//
// 2. HİÇBİR ZAMAN ENGELLEMEZ. Günlük yazılamazsa iş durmaz. Atölyenin fiş kesmesi, günlük
//    sunucusuna erişilemediği için durmamalı — günlük yardımcı bir kayıttır, işin kendisi değil.
//    Bu yüzden `await` edilmiyor ve hatası yalnızca konsola düşüyor.
//
// 3. İKİ KATMAN. Elle yazılan anlamlı kayıtlar ("Mahmut fiş sildi") VE yazma katmanına bağlı
//    otomatik taban ("urunler: 1 güncellendi"). Yalnızca elle yazılsaydı, bir sonraki özellikte
//    biri çağırmayı unutur ve günlükte sessiz bir delik açılırdı — bu projede aynı hata sınıfı
//    hareket/fiş tarafında zaten yaşandı.
let _gunlukKullanici = { id: null, ad: "Bilinmeyen" };
function gunlukKullaniciAyarla(k) {
  _gunlukKullanici = k ? { id: k.id || null, ad: k.ad || k.kullaniciAdi || "Bilinmeyen" } : { id: null, ad: "Bilinmeyen" };
}

// İŞLEMİ YAPAN KULLANICI (17 Eylül: "kullanıcı göstermiyor"). Günlük zaten bu bilgiyi tutuyordu;
// kayıtlara damga basmak isteyen yerler (kasa/cari hareketi, virman) de buradan okuyor. Prop
// zinciriyle taşımak yerine tek kaynaktan sormak, "bir yol unutuldu" hatasını engelliyor.
function islemKullanicisiAd() {
  const ad = (_gunlukKullanici && _gunlukKullanici.ad) || "";
  // "Bilinmeyen" damgalamıyoruz: giriş sistemi kapalıyken her satıra "Bilinmeyen" yazmak,
  // bilgi vermeden listeyi kirletir. Boş kalması "kayıt girişsiz yapıldı" demek.
  return ad === "Bilinmeyen" ? "" : ad;
}

function gunlukYaz(eylem, kapsam, ayrinti) {
  if (!supabaseAcikMi()) return;
  const kayit = {
    id: uid("log"),
    zaman: new Date().toISOString(),
    kullanici_id: _gunlukKullanici.id,
    kullanici_ad: _gunlukKullanici.ad,
    eylem: String(eylem || "").slice(0, 200),
    kapsam: kapsam || null,
    // CİHAZ + SÜRÜM (v1.744.16 — kullanıcı: 20:19 "Bilinmeyen" kaydının hangi cihazdan geldiği bilinmiyordu). Her kayda bu
    // tarayıcının kimliği (091 `cihazKimligi`, rastgele), kısa tarifi ve uygulama sürümü; parola / oturum anahtarı YAZILMAZ.
    ayrinti: { ...(ayrinti || {}), cihaz: typeof cihazKimligi === "function" ? cihazKimligi() : null,
      cihazTarifi: typeof cihazTarifi === "function" ? cihazTarifi() : null, surum: typeof SURUM !== "undefined" ? SURUM : null },
  };
  supabaseIstek("gunluk", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([kayit]),
  }).catch((e) => console.warn("Günlük yazılamadı (iş durmadı):", e && e.message));
}

// Günlüğü tamamen boşaltır. YALNIZCA veritabanı sıfırlamada çağrılır; uygulamada tekil kayıt
// silme arayüzü yok. PostgREST süzgeçsiz DELETE kabul etmiyor (kazara tüm tabloyu silmeye karşı
// bir koruma), o yüzden "kimliği boş olmayan" koşulu veriliyor.
async function gunlukBosalt() {
  if (!supabaseAcikMi()) return;
  await supabaseIstek("gunluk?id=not.is.null", { method: "DELETE" });
}

async function gunlukOku(sinir = 300) {
  if (!supabaseAcikMi()) return [];
  return supabaseIstek(`gunluk?select=*&order=zaman.desc&limit=${Math.min(sinir, 1000)}`);
}

const _surumler = {}; // tablo -> Map(id -> surum)

// =============================================================================================
// NEDEN STOK SIFIRIN ALTINA İNEBİLİR
//
// Hareket geri alma yolları eskiden `Math.max(0, ...)` kullanıyordu: miktarın eksiye düşmesi
// çirkin göründüğü için sıfırda tutuluyordu. Kırpma aradaki farkı SESSİZCE yutuyor ve defterle
// stoğu ayırıyordu.
//
// "Kampre Bezi" olayında yaşandı: stok −13,2 iken üç üretim hareketi geri alındı.
//     −13,2 + 0,8 = −12,4  ->  kırpıldı, 0 oldu        (12,4 metre buhar oldu)
//        0 + 0,8 =   0,8
//      0,8 + 13,2 =  14,0                               (defter 0 derken stok 14)
//
// Eksi stok bir GÖRÜNTÜ sorunu değil BİLGİDİR: "kayıtta olduğundan fazlasını tükettin, girişlerin
// eksik" demektir. Sıfırda tutmak o bilgiyi siler ve yerine uydurma bir sayı koyar. Sekiz yerde
// kırpma vardı, hepsi kaldırıldı; eksi stok artık olduğu gibi görünüyor.
// =============================================================================================

// Şema eski olabilir (`surum` sütunu eklenmemiş). O durumda kilitleme sessizce kapanır ve yazma
// eski yoluyla sürer; aksi hâlde şema güncellenene kadar hiçbir şey kaydedilemezdi.
let surumDesteklenmiyor = false;

function surumleriYukle(tablo, satirlar) {
  const m = new Map();
  (satirlar || []).forEach((r) => {
    if (r && r.id !== undefined && r.surum !== undefined && r.surum !== null) m.set(r.id, r.surum);
  });
  _surumler[tablo] = m;
}

function surumCakismasiBildir(tablo, idler, teshis) {
  console.warn("Sürüm çakışması:", tablo, idler, teshis);
  if (typeof window !== "undefined" && window.__surumCakismaBildir) {
    window.__surumCakismaBildir(tablo, idler, teshis);
  }
}

// Sütunun varlığı açılışta BİR KEZ yoklanır. Boş tabloya bakıp karar vermek yetmez: satır yoksa
// hangi sütunların olduğu anlaşılmaz. Sütun sorgusu ise tablo boş olsa da kesin cevap verir.
async function surumDesteginiYokla() {
  try {
    await supabaseIstek("urunler?select=surum&limit=1");
    surumDesteklenmiyor = false;
  } catch (e) {
    surumDesteklenmiyor = true;
    console.warn("`surum` sütunu bulunamadı — iyimser kilitleme kapalı. surum-sutunu.sql çalıştırılmalı.", e);
  }
}

// Renk yeniden adlandırma gibi işlemler yüzlerce kaydı birden güncelleyebiliyor. Her kayıt ayrı
// istek olduğu için hepsini aynı anda açmak tarayıcıyı da sunucuyu da tıkar; sınırlı sayıda
// istek paralel yürütülür.
async function sirayla(isler, esZamanli = 6) {
  for (let i = 0; i < isler.length; i += esZamanli) {
    await Promise.all(isler.slice(i, i + esZamanli).map((f) => f()));
  }
}

// Kimliği PostgREST koşuluna gömer.
//
// TIRNAK YOK — ve bu ayrım pahalıya mal oldu. PostgREST'te `in.("a","b")` içindeki çift tırnaklar
// AYIRICI görevi görür ve soyulur; `eq."a"` içindekiler ise DEĞERİN PARÇASI sayılır. Yani tırnaklı
// bir eq koşulu, tırnak karakterlerini de içeren bir kimlik arar ve hiçbir satıra denk gelmez.
//
// Sonuç: her koşullu güncelleme sıfır satır günceller ve iyimser kilitleme bunu "başka bilgisayar
// değiştirdi" sanır. Kullanıcı sürekli sahte çakışma görür, hiçbir kaydı güncelleyemez. Teşhis
// satırında "beklenen 7 · sunucuda 7" (yani EŞİT) görülmesi bunu ele verdi — sürümler tutuyorsa
// koşulun tutmamasının tek sebebi kimlik filtresidir.
//
// `in.()` tarafında tırnak DOĞRU ve gerekli (bkz. supabaseSil); ikisini karıştırmamak lazım.
// encodeURIComponent nokta, virgül, parantez gibi karakterleri zaten güvenli hâle getiriyor.
function pgKimlik(id) {
  return encodeURIComponent(String(id));
}

