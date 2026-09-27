// ================= KDV (27 Eylül, v1.496.0) =================
//
// Kullanıcı (e-fatura yol haritası, Aşama 1): "Şu anda True Bilişim My Muhasebe ERP, QNB eFinans
// entegratör kesiyor faturayı. E-fatura mükellefiyim… KDV hariç fatura kesiyoruz, tevkifat olmuyor,
// döviz faturası arada kesiyoruz yurt içine." Karar (soruldu): yeni fişlerde CARİYE KDV DAHİL tutar
// yazılır (bakiye faturayla ve True'daki ile aynı olsun); alışta da KDV işlenir. Eski fişler aynen.
//
// NEDEN BİR AÇMA ANAHTARI VAR (`firmaBilgileri.kdvAktif`, varsayılan KAPALI): KDV'li fiş cariye
// farklı tutar yazar — dönüşü olmayan bir değişiklik. Oranlar mali müşavirle teyit edilip Tanımlar >
// Firma'dan açılana kadar hiçbir fiş değişmez (kalem `kdvOrani` taşımaz → `fisYaz` eskisi gibi yazar).
//
// ORAN NEREDEN GELİR (öncelik): fiş satırında elle seçilen → ürün kartındaki `kdvOrani` → Tanımlar'daki
// varsayılan (mamul / diğer ayrı: ayakkabı ile deri farklı oranda olabiliyor).
//
// TUTARLAR: `birimFiyat` ve MATRAH KDV hariç (stok maliyeti, kâr, sipariş raporları bunu okur); cari
// hareketin `tutar`ı KDV DAHİL (bakiye, yaşlandırma, nakit akışı, ekstre bunu okur). KDV satır bazında,
// kuruşa yuvarlanarak hesaplanır — e-faturada da satır satır.

const KDV_ORANLARI = [0, 1, 10, 20];

// Para yuvarlaması (kuruş). `stokYuvarla` 6 hane tutuyor — miktar için; vergi tutarı kuruşa iner.
function kuruslaYuvarla(x) {
  return Math.round((Number(x) || 0) * 100 + Number.EPSILON * 100) / 100;
}

function kdvAktifMi(firmaBilgileri) {
  return !!(firmaBilgileri && firmaBilgileri.kdvAktif);
}

// Tanımlar'daki varsayılan: mamul ve diğer (hammadde, yarı mamul, hizmet) ayrı. Girilmemişse %20.
function varsayilanKdvOrani(urun, firmaBilgileri) {
  const fb = firmaBilgileri || {};
  const deger = urun && urun.kategori === "Mamul" ? fb.kdvMamul : fb.kdvDiger;
  const n = Number(deger);
  return deger === "" || deger == null || !Number.isFinite(n) ? 20 : n;
}

function urunKdvOrani(urun, firmaBilgileri) {
  const o = urun ? urun.kdvOrani : null;
  if (o !== "" && o != null && Number.isFinite(Number(o))) return Number(o);
  return varsayilanKdvOrani(urun, firmaBilgileri);
}

// Kalemin oranı: satırda seçilmişse o, yoksa ürünün (kartı ya da varsayılan).
function kalemKdvOrani(kalem, stok, firmaBilgileri) {
  if (kalem && typeof kalem.kdvOrani === "number" && Number.isFinite(kalem.kdvOrani)) return kalem.kdvOrani;
  const urun = kalem ? (stok || []).find((p) => p.id === kalem.urunId) : null;
  return urunKdvOrani(urun, firmaBilgileri);
}

function kdvHesapla(matrah, oran) {
  return kuruslaYuvarla((Number(matrah) || 0) * (Number(oran) || 0) / 100);
}

// Fiş dip toplamı: satırların matrahından oran bazında KDV. `satirlar`: [{ matrah, kdvOrani }].
// Dönüş: { matrah, kdv, genelToplam, oranlar: [{ oran, matrah, kdv }] } — oranlar küçükten büyüğe.
function kdvOzeti(satirlar) {
  const harita = new Map();
  let matrah = 0; let kdv = 0;
  (satirlar || []).forEach((s) => {
    const m = Number(s.matrah) || 0;
    const oran = Number(s.kdvOrani) || 0;
    const v = kdvHesapla(m, oran);
    matrah += m; kdv += v;
    const o = harita.get(oran) || { oran, matrah: 0, kdv: 0 };
    o.matrah += m; o.kdv += v;
    harita.set(oran, o);
  });
  const oranlar = [...harita.values()].sort((a, b) => a.oran - b.oran)
    .map((o) => ({ oran: o.oran, matrah: kuruslaYuvarla(o.matrah), kdv: kuruslaYuvarla(o.kdv) }));
  return { matrah: kuruslaYuvarla(matrah), kdv: kuruslaYuvarla(kdv), genelToplam: kuruslaYuvarla(matrah + kdv), oranlar };
}
