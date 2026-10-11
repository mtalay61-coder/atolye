// KİMİN YAPTIĞI — KAYIT KAPISINDA DAMGA (v1.645.9).
//
// Kullanıcı (Anasayfa › Son işlemler görüntüsüyle): "İşlemi yapan kullanıcı yazmıyor." Akışta yalnız fiş/tahsilat
// satırlarında ad vardı: kullanıcı adını yalnız cari hareketi hunisi (100 `addCariHareketFromStok`) yazıyordu. Üretim
// stok hareketleri, işçilik (proses teslimi carisine yazılan hak ediş), maaş, siparişler başka yollardan geliyor ve
// "—" kalıyordu. Fiş numarası / zaman damgası kuralıyla aynı gerekçe: tek tek yolları düzeltmek yerine KAPIDA tamamla
// ki yeni bir kayıt yolu eklendiğinde kimse unutamasın. Kapılar: 100 `setStok` (stok tek geçit), `setCariler`,
// `setSiparisler` sarmalayıcıları.
//
// Yalnız YENİ kayıt damgalanır: önceki listede kimliği olmayan hareket / sipariş. Eski kayda bugünkü kullanıcıyı
// yazmak yanlış bilgi olurdu (kim yaptığı bilinmiyor → "—" doğru). Adı olan kayda dokunulmaz ("sistem" maaş
// tahakkuku gibi). Kullanıcı yoksa (giriş kapalı kurulum) hiçbir şey yazılmaz. Zaman da eksikse eklenir: akış
// saatsiz kaydı gece yarısına (03:00 TR) koyuyordu. Hiçbir şey değişmezse AYNI dizi döner (gereksiz yazma yok). Saf.

// Liste: hareketler taşıyan kayıtlar (ürünler, cariler). Değişmeyen (aynı nesne) kayıtlara bakılmaz — her kayıtta
// bütün hareketleri taramak büyük stokta pahalı olurdu.
function yeniHareketleriDamgala(onceki, yeni, ad, simdi) {
  if (!ad || !Array.isArray(yeni)) return yeni;
  const eskiHarita = new Map((onceki || []).map((x) => [x && x.id, x]));
  let degisti = false;
  const sonuc = yeni.map((kayit) => {
    if (!kayit || !Array.isArray(kayit.hareketler)) return kayit;
    const eski = eskiHarita.get(kayit.id);
    if (eski === kayit) return kayit;
    const eskiIdler = new Set(((eski && eski.hareketler) || []).map((h) => h && h.id).filter(Boolean));
    let bu = false;
    const hareketler = kayit.hareketler.map((h) => {
      if (!h || h.kullanici || (h.id && eskiIdler.has(h.id))) return h;
      bu = true;
      return { ...h, kullanici: ad, ...(h.zaman ? {} : { zaman: simdi }) };
    });
    if (!bu) return kayit;
    degisti = true;
    return { ...kayit, hareketler };
  });
  return degisti ? sonuc : yeni;
}

// Siparişler: yeni siparişe `olusturan` (akış bunu okur, 110) ve eksikse `olusturuldu`.
function yeniSiparisleriDamgala(onceki, yeni, ad, simdi) {
  if (!ad || !Array.isArray(yeni)) return yeni;
  const eskiIdler = new Set((onceki || []).map((s) => s && s.id).filter(Boolean));
  let degisti = false;
  const sonuc = yeni.map((s) => {
    if (!s || s.olusturan || eskiIdler.has(s.id)) return s;
    degisti = true;
    return { ...s, olusturan: ad, ...(s.olusturuldu ? {} : { olusturuldu: simdi }) };
  });
  return degisti ? sonuc : yeni;
}

// ETKİN KULLANICININ ADI — App her çizimde günceller (100). Kayıt işlevleri (079/080 useCallback'leri, sipariş
// kaydı) bağımlılık listesine kullanıcı eklemeden en güncel adı okusun diye modül değişkeni.
let _damgaKullaniciAdi = null;
function damgaKullanicisiAyarla(ad) { _damgaKullaniciAdi = ad || null; }
function damgaKullaniciAdi() { return _damgaKullaniciAdi; }
