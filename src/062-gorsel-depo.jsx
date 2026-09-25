// ================= GÖRSEL DEPOSU =================
//
// SORUN: ürün görselleri (`kapakResmi`, `renkResimleri`) ürün kaydının İÇİNDE duruyordu ve bütün
// ürünler TEK bir yerel anahtarda (`stok:items`) saklanıyor. `guvenliYaz` tek kayıt için 5 MB
// sınırı koyuyor ve sınırı AŞAN yazmayı depoya sormadan reddediyor — yani sınır tarayıcının değil,
// uygulamanın kendi kuralı ve IndexedDB'ye geçtikten sonra da duruyor.
//
// Görsel başına ~40-60 KB ile yüz ürünün birkaç rengi bu sınırı doldurur. Doldurduğunda STOK
// KAYDEDİLEMEZ hâle gelir — özellik kaybı değil, çalışmayı durduran bir hata. Katalog ve
// fotoğrafla bulma özellikleri görsel kullanmayı teşvik ettiği için sınıra gidiş hızlandı.
//
// BULUT TARAFI SIKIŞMIYOR: `urunler` tablosunda her ürün KENDİ satırında ve görselleri o satırda
// (`kapak_resmi`, `renk_resimleri`). Sıkışan yer yalnızca yerel tek anahtar. Bu yüzden çözüm de
// yalnız yerel tarafta: bulut şeması ve okuma yolu DEĞİŞMİYOR, SQL gerekmiyor.
//
// ÇÖZÜM: görseller yerelde ürün başına AYRI anahtarda (`gorsel:<urunId>`) tutuluyor. `stok:items`
// görselsiz yazılıyor, okurken geri birleştiriliyor. Uygulamanın geri kalanı değişmiyor —
// bellekteki ürün nesnesi görsellerini taşımaya devam ediyor, dolayısıyla katalog, ürün kartı,
// etiket yazdırma ve görsel eşleştirme kodlarına dokunulmadı.
const GORSEL_ON_EK = "gorsel:";

// Ürünün görsel bölümü. Boş görseller SAKLANMIYOR: boş bir anahtar hem yer kaplar hem "görsel var
// mı" kontrollerini yanıltır.
function urunGorselleri(u) {
  const renkler = {};
  Object.entries((u && u.renkResimleri) || {}).forEach(([renk, src]) => {
    if (src) renkler[renk] = src;
  });
  const kapak = (u && u.kapakResmi) || "";
  if (!kapak && Object.keys(renkler).length === 0) return null;   // sirasiz-tamam
  return { kapakResmi: kapak, renkResimleri: renkler };
}

// Görselleri ürün kayıtlarından AYIRIR. Dönen `stok` yerele yazılacak hâl (görselsiz),
// `gorseller` ise ürün başına ayrı yazılacak paketler.
function gorselleriAyir(stok) {
  const gorseller = [];
  const temiz = (stok || []).map((u) => {
    const g = urunGorselleri(u);
    if (g) gorseller.push({ urunId: u.id, veri: g });
    // Alanlar SİLİNMİYOR, BOŞALTILIYOR: `renkResimleri` yok olursa okuma tarafındaki
    // `(u.renkResimleri || {})` kalıpları çalışır ama bulut şeması alanı `{}` yerine `null`
    // sanabilir. Boş ama var olan alan, iki tarafı da tanıdık bırakıyor.
    return { ...u, kapakResmi: "", renkResimleri: {} };
  });
  return { stok: temiz, gorseller };
}

// Görselleri geri birleştirir. `gorselMap`: urunId -> { kapakResmi, renkResimleri }.
//
// ÜRÜNDE ZATEN GÖRSEL VARSA ONA DOKUNULMUYOR: buluttan okunan kayıt görselleri kendi satırında
// taşıyor ve o, ayrı anahtardaki kopyadan daha günceldir (bulut kaynak, yerel yedek).
function gorselleriBirlestir(stok, gorselMap) {
  return (stok || []).map((u) => {
    if (urunGorselleri(u)) return u;
    const g = gorselMap && gorselMap[u.id];
    if (!g) return u;
    return { ...u, kapakResmi: g.kapakResmi || "", renkResimleri: g.renkResimleri || {} };
  });
}

// Hangi görsel anahtarlarının YAZILMASI, hangilerinin SİLİNMESİ gerektiği. Her kayıtta bütün
// görselleri yeniden yazmak, tek bir miktar değişikliğinde onlarca megabaytı diske geri
// yazmak demekti.
function gorselFarki(gorseller, oncekiImzalar) {
  const yazilacak = [];
  const yeniImzalar = {};
  (gorseller || []).forEach((g) => {
    const imza = JSON.stringify(g.veri);
    yeniImzalar[g.urunId] = imza;
    if (oncekiImzalar[g.urunId] !== imza) yazilacak.push(g);
  });
  // Görseli kaldırılmış ya da ürünü silinmiş anahtarlar: yetim kalmasın.
  const silinecek = Object.keys(oncekiImzalar).filter((id) => !(id in yeniImzalar));   // sirasiz-tamam
  return { yazilacak, silinecek, yeniImzalar };
}

// ---- TARAYICI TARAFI ---------------------------------------------------------------------------
//
// İmzalar oturum boyunca bellekte tutuluyor: hangi ürünün görselinin en son ne olduğu. Diske
// yazılmıyor çünkü açılışta görseller zaten okunuyor ve imzalar oradan kuruluyor.
const _gorselImzalari = {};

async function gorselleriOku(anahtarKumesi) {
  const harita = {};
  let anahtarlar = [];
  try {
    const r = await window.storage.list(GORSEL_ON_EK, true);
    anahtarlar = (r && Array.isArray(r.keys)) ? r.keys : [];
  } catch (e) {
    return { gorseller: harita, hata: true };
  }
  let hata = false;
  for (const anahtar of anahtarlar) {
    const okuma = await guvenliOku(anahtar, anahtarKumesi);
    if (okuma.hata) { hata = true; continue; }
    if (!okuma.deger) continue;
    try {
      const veri = JSON.parse(okuma.deger);
      const urunId = anahtar.slice(GORSEL_ON_EK.length);
      harita[urunId] = veri;
      _gorselImzalari[urunId] = JSON.stringify(veri);
    } catch (e) { hata = true; }
  }
  return { gorseller: harita, hata };
}

// Değişen görselleri yazar, yetim kalanları siler. Ürün kaydının kendisini YAZMAZ — çağıran onu
// zaten yazıyor.
async function gorselleriYaz(gorseller) {
  const { yazilacak, silinecek, yeniImzalar } = gorselFarki(gorseller, _gorselImzalari);
  for (const g of yazilacak) {
    // katman-muaf: görsel buluta ÜRÜN SATIRINDAN gidiyor (`urunler.kapak_resmi` /
    // `renk_resimleri`, bkz. TABLO_SEMA). Bu anahtarlar yalnızca YEREL yansıma — amaçları
    // `stok:items`i 5 MB sınırının altında tutmak. `tabloYaz` kullanmak, aynı görseli buluta
    // ikinci kez, ikinci bir tabloya yazmak olurdu.
    await guvenliYaz(`${GORSEL_ON_EK}${g.urunId}`, JSON.stringify(g.veri), true);   // katman-muaf: yerel yansıma
  }
  for (const urunId of silinecek) {
    try { await window.storage.delete(`${GORSEL_ON_EK}${urunId}`, true); } catch (e) { /* yoksa sorun değil */ }
  }
  Object.keys(_gorselImzalari).forEach((k) => delete _gorselImzalari[k]);
  Object.assign(_gorselImzalari, yeniImzalar);
  return { yazilan: yazilacak.length, silinen: silinecek.length };
}

// ---- ÇEK GÖRSELLERİ ----------------------------------------------------------------------------
//
// Kullanıcı (6 Eylül): "Çek resmi olmalı, önü ve arkasının çekildiği."
//
// Çekler `muhasebe` TEKİL kaydının içinde duruyor. Görselleri oraya koymak, ürün görsellerinde
// yaşadığımız duvarın aynısı olurdu (7u): tek anahtar, 5 MB sınırı, dolduğunda MUHASEBE
// KAYDEDİLEMEZ. Çek başına iki fotoğraf (ön + arka) ile o sınıra ürünlerden daha hızlı gidilir.
//
// Bu yüzden görseller çek başına ayrı anahtarda: `cekgorsel:<cekId>`. `muhasebe` kaydı yalnız
// "görseli var mı" bilgisini taşıyor (`onYuz`/`arkaYuz` bayrakları), içeriği değil.
const CEK_GORSEL_ON_EK = "cekgorsel:";

async function cekGorselOku(cekId) {
  if (!cekId) return null;
  try {
    const okuma = await guvenliOku(`${CEK_GORSEL_ON_EK}${cekId}`, null);
    return okuma.deger ? JSON.parse(okuma.deger) : null;
  } catch (e) {
    return null;
  }
}

async function cekGorselYaz(cekId, gorseller) {
  if (!cekId) return null;
  const dolu = gorseller && (gorseller.on || gorseller.arka);
  if (!dolu) {
    try { await window.storage.delete(`${CEK_GORSEL_ON_EK}${cekId}`, true); } catch (e) { /* yoksa sorun değil */ }
    return null;
  }
  // katman-muaf: yerel yansıma — çek görselleri buluta `muhasebe` kaydından GİTMİYOR (bilerek,
  // bkz. yukarıdaki gerekçe) ve kendi tablosu yok. Bu, bilinen bir sınır: 7z-11'de yazılı.
  return guvenliYaz(`${CEK_GORSEL_ON_EK}${cekId}`, JSON.stringify(gorseller), true);   // katman-muaf: yerel yansıma
}
