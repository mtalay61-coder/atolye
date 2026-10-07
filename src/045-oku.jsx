let supabaseSonHata = null;

// =============================================================================================
// SUPABASE'DEN OKUMA
//
// Yazma tarafı kayıt bazlı; okuma tarafı ise TÜM tabloları çekip uygulamanın beklediği iç içe
// yapıya geri kurar. Uygulama kodu `stok[i].variants` ve `stok[i].hareketler` bekliyor —
// veritabanında bunlar ayrı tablolar. Dönüşüm burada yapılıyor ki uygulamanın geri kalanı
// veritabanı yapısını hiç bilmesin.
//
// Sayfalama: Supabase varsayılan olarak 1000 satır döndürür. Stok hareketleri kısa sürede bunu
// aşar, bu yüzden aralık başlığıyla parça parça çekiliyor — aksi halde eski hareketler sessizce
// kaybolur ve bakiye tutmaz.
async function supabaseTumSatirlar(tablo, sorgu = "select=*") {
  const parcaBoyu = 1000;
  let baslangic = 0;
  let jetonTekrari = 0;
  const hepsi = [];
  for (;;) {
    const yanit = await fetch(`${SUPABASE_URL}/rest/v1/${tablo}?${sorgu}`, {
      headers: {
        ...(await yetkiBasliklari()),
        Range: `${baslangic}-${baslangic + parcaBoyu - 1}`,
      },
    });
    // Jeton yenilenip aynı aralık tekrar isteniyor. SAYAÇ ŞART: yenileme başarılı olup sunucu
    // yine de 401 verirse (RLS reddi) koşul her turda tutar ve döngü hiç bitmezdi.
    if (yanit.status === 401 && _oturum && jetonTekrari === 0 && (await jetonTazele())) {
      jetonTekrari++;
      continue;
    }
    if (!yanit.ok) throw new Error(`${tablo}: HTTP ${yanit.status}`);
    const parca = await yanit.json();
    hepsi.push(...parca);
    if (parca.length < parcaBoyu) break;
    baslangic += parcaBoyu;
  }
  return hepsi;
}

// snake_case sütunları camelCase alanlara çevirir (okuma yönü).
// Sütun adı ile uygulama alanı birebir örtüşmediğinde açık eşleme gerekir; otomatik kural
// yetmez. `fiyat` sütunu uygulamada `birimFiyat` olarak yaşıyor.
// `on_yuz`/`arka_yuz` → `on`/`arka`: sütun adında "yüz" var çünkü "on" tek başına SQL'de
// okunaksız; uygulamada ise nesne zaten `cekGorsel` bağlamında, ikinci kelime gürültü.
const OKUMA_ISTISNA = {
  not_metni: "not", fiyat: "birimFiyat", min_stok: "minStok",
  on_yuz: "on", arka_yuz: "arka",
};
function alanAdi(sutun) {
  if (OKUMA_ISTISNA[sutun]) return OKUMA_ISTISNA[sutun];
  return sutun.replace(/_([a-z])/g, (_, h) => h.toUpperCase());
}
// `ek` köke açılır (v1.545.0, 035 `semaDisiAlanlar`): KDV oranı, kalem notları, iptal zamanı… Açılmazsa
// uygulama `k.kdvOrani` diye bakar, `k.ek.kdvOrani`yi görmez. Sütun değeri ek'tekini ezer (sütun asıl).
function ekiKokeAc(kayit) {
  const { ek, ...kalan } = kayit || {};
  return ek && typeof ek === "object" && !Array.isArray(ek) ? { ...ek, ...kalan } : kalan;
}

function kayitaCevir(satir) {
  const k = {};
  Object.entries(satir || {}).forEach(([s, v]) => {
    // `surum` UYGULAMA ALANI DEĞİL, altyapı sayacıdır. Kayda sızarsa fark hesabına girer ve
    // her başarılı yazmadan sonra kayıt "değişmiş" görünüp yeniden yazılır (bkz. _surumler).
    if (s === "surum") return;
    k[alanAdi(s)] = v;
  });
  return k;
}

// `urunler` sütunları görselsiz: şemanın satır üreticisinden (035) okunur ki sütun listesi ikinci bir yerde
// tekrarlanmasın; `ek` (şema dışı alanlar) ve `surum` (iyimser kilit) eklenir — ikisi şema satırında görünmez.
function urunResimsizSutunlari() {
  const ornek = TABLO_SEMA.urunler.satir({ id: "x", variants: [], hareketler: [] });
  const sutunlar = Object.keys(ornek).filter((k) => k !== "kapak_resmi" && k !== "renk_resimleri" && k !== "ek");
  sutunlar.push("ek");
  if (!surumDesteklenmiyor) sutunlar.push("surum");
  return sutunlar;
}

// Buluttan tüm veriyi çeker ve uygulamanın iç yapısına dönüştürür.
// `secenek.yalniz` (v1.611.0, değişiklik sayacı): yalnız bu TABLOLAR okunur, ötekiler boş gelir ve sürüm haritaları
// yalnız okunanlar için yenilenir — kısmi tazelemede okunmayan tablonun haritası silinirse sonraki yazması INSERT'e
// düşer ve başka cihazın kaydını ezer. `secenek.resimsiz`: `urunler` görsel sütunları dışarıda (kapak_resmi,
// renk_resimleri) — tazelemede 15 MB inmesin; görseller ekrandakinden korunur (100 `bulutDegisikligiUygula`).
async function supabasedenOku(secenek = {}) {
  const yalniz = secenek.yalniz ? new Set(secenek.yalniz) : null;
  const okunur = (tablo) => !yalniz || yalniz.has(tablo);
  const oku = (tablo, sorgu) => (okunur(tablo) ? supabaseTumSatirlar(tablo, sorgu) : Promise.resolve([]));
  // Sürüm sütunu var mı? Yazma başlamadan önce bilinmesi gerekiyor; sonra öğrenilirse ilk yazma
  // 400 alıp boşa giderdi.
  if (!yalniz) await surumDesteginiYokla();

  const [
    tanimSatir, cariSatir, cariHareket, urunSatir, varyantSatir, hareketSatir,
    sipSatir, kalemSatir, uretSatir, atamaSatir, rezSatir, onaySatir, copSatir, cekGorselSatir,
  ] = await Promise.all([
    oku("tanimlar"),
    oku("cariler"),
    oku("cari_hareketleri", "select=*&order=tarih.desc"),
    oku("urunler", secenek.resimsiz ? `select=${urunResimsizSutunlari().join(",")}` : "select=*"),
    oku("varyantlar"),
    oku("stok_hareketleri", "select=*&order=tarih.desc"),
    oku("siparisler"),
    oku("siparis_kalemleri", "select=*&order=sira.asc"),
    oku("uretim"),
    oku("uretim_atamalari"),
    oku("stok_rezervasyonlari"),
    oku("onaylar"),
    oku("cop"),
    oku("cek_gorselleri"),
  ]);

  // Sürüm sayaçları uygulama kaydına DEĞİL, ayrı haritaya alınır (bkz. _surumler yorumu).
  // Ham satırlar burada elde olduğu için okuma yeri burası.
  if (okunur("urunler")) surumleriYukle("urunler", urunSatir);
  if (okunur("cariler")) surumleriYukle("cariler", cariSatir);
  if (okunur("siparisler")) surumleriYukle("siparisler", sipSatir);
  if (okunur("uretim")) surumleriYukle("uretim", uretSatir);
  if (okunur("stok_rezervasyonlari")) surumleriYukle("stok_rezervasyonlari", rezSatir);
  if (okunur("onaylar")) surumleriYukle("onaylar", onaySatir);
  if (okunur("cop")) surumleriYukle("cop", copSatir);
  // Çek görselleri de sürüm takibine giriyor: olmazsa her güncelleme koşulsuz INSERT yoluna
  // düşer ve ikinci cihazdaki değişiklik sessizce ezilir (10. denetim bunu yakaladı).
  if (okunur("cek_gorselleri")) surumleriYukle("cek_gorselleri", cekGorselSatir);

  // Alt kayıtları ana kayda göre grupla — her seferinde filter çalıştırmak yerine tek geçiş.
  const grupla = (satirlar, alan) => {
    const m = new Map();
    satirlar.forEach((s) => {
      const a = s[alan];
      if (!m.has(a)) m.set(a, []);
      m.get(a).push(s);
    });
    return m;
  };
  const varyantMap = grupla(varyantSatir, "urun_id");
  const hareketMap = grupla(hareketSatir, "urun_id");
  const cariHareketMap = grupla(cariHareket, "cari_id");
  const kalemMap = grupla(kalemSatir, "siparis_id");
  const atamaMap = grupla(atamaSatir, "uretim_id");

  const cariler = cariSatir.map((c) => ({
    ...kayitaCevir(c),
    // Cari kökündeki `ek` (whatsapp) açılıyor — hareketlerdekiyle aynı gerekçe.
    ...(c.ek || {}),
    // `ek` AÇILIR: içindeki alanlar (beden, miktar, birim, birimFiyat, esId…) uygulamanın
    // doğrudan beklediği adlarla kaydın köküne konur. Açılmazsa yazılmış olmalarının bir
    // faydası olmaz — okuma tarafı `h.ek.miktar` diye bakmıyor, `h.miktar` diye bakıyor.
    // Boş/eksik değerler ELENİR: `beden: null` yazmak, hiç yazmamaktan farklı davranıyor
    // (ekranda "null" rozeti çıkardı).
    hareketler: (cariHareketMap.get(c.id) || []).map((h) => {
      const kayit = kayitaCevir(h);
      const ek = kayit.ek || {};
      delete kayit.ek;
      Object.entries(ek).forEach(([alan, deger]) => {
        if (deger !== null && deger !== undefined) kayit[alan] = deger;
      });
      return kayit;
    }),
  }));

  const stok = urunSatir.map((u) => ({
    ...ekiKokeAc(kayitaCevir(u)),
    variants: (varyantMap.get(u.id) || []).map((v) => ({
      renk: v.renk, renkId: v.renk_id || null, beden: v.beden,
      miktar: stokYuvarla(v.miktar), minStok: v.min_stok || 0,
    })),
    hareketler: (hareketMap.get(u.id) || []).map((h) => ekiKokeAc(kayitaCevir(h))),
  }));

  const siparisler = sipSatir.map((s) => ({
    ...ekiKokeAc(kayitaCevir(s)),
    kalemler: (kalemMap.get(s.id) || []).map((k) => ekiKokeAc(kayitaCevir(k))),
  }));

  // Atamalar prosesIlerleme'nin içine GERİ yerleştirilir: uygulama onları orada bekliyor.
  const uretim = uretSatir.map((o) => {
    const atamalar = atamaMap.get(o.id) || [];
    const ilerleme = (o.proses_ilerleme || []).map((p) => ({
      ...p,
      atamalar: atamalar.filter((a) => a.proses === p.proses).map((a) => ekiKokeAc(kayitaCevir(a))),
    }));
    return { ...ekiKokeAc(kayitaCevir(o)), prosesIlerleme: ilerleme };
  });

  return {
    tanimlar: (tanimSatir[0] && tanimSatir[0].veri) || null,
    cariler, stok, siparisler, uretim,
    stokRezervasyonlari: rezSatir.map(kayitaCevir),
    // Onaylar ve çöp `veri` sütununda bir bütün olarak duruyor; kayıt olduğu gibi geri alınır.
    onaylar: onaySatir.map((o) => o.veri || {}),
    cop: copSatir.map((c) => c.veri || {}),
    // Sütun adları alan adlarına çevriliyor: `on_yuz` → `on`. Kayıt köküne AÇILMIYOR çünkü
    // görseller ürünün/çekin kendi kaydının parçası değil, ayrı bir liste.
    cekGorselleri: (cekGorselSatir || []).map((g) => ({ id: g.id, on: g.on_yuz || "", arka: g.arka_yuz || "" })),
  };
}

// =============================================================================================
// RENK KİMLİĞİ
//
// SORUN: varyant, reçete, hareket ve sipariş kayıtları rengi METİN olarak tutuyor. Aynı metin
// dokuz ayrı yerde tekrarlanıyor. Tanımlardaki ad değiştiğinde hepsinin tek tek bulunup
// güncellenmesi gerekiyor; bir tanesi atlanınca renk iki isimle var olmaya başlıyor ve
// eşleşmeler sessizce kopuyor.
//
// ÇÖZÜM — İKİ AŞAMALI:
//   1. AŞAMA (bu): kayda `renkId` eklenir, `renk` alanı ÖNBELLEK olarak kalır.
//      Yeniden adlandırma kayıtları KİMLİKLE bulur — metin eşleştirmesi yok, kopukluk oluşamaz.
//      Mevcut 56 karşılaştırma (v.renk === h.renk gibi) bozulmadan çalışmaya devam eder.
//   2. AŞAMA (sonra): karşılaştırmalar da kimliğe çevrilir ve `renk` alanı tamamen kalkar.
//
// Aşamalara bölmenin sebebi: 56 karşılaştırmayı tek seferde çevirmek, birini atlama riskiyle
// gelir ve atlanan yer sessizce bozulur. Bu projede tam bu türden hatalar yaşandı.
//
// Kimliği olmayan eski kayıtlar ada göre eşleştirilip damgalanır (bkz. renkKimlikleriniDamgala).
function renkKimligiBul(ad, tanimliRenkler) {
  if (!ad) return null;
  const n = String(ad).trim().toLocaleLowerCase("tr-TR");
  const bulunan = (tanimliRenkler || []).find(
    (r) => String(r.ad || "").trim().toLocaleLowerCase("tr-TR") === n
  );
  return bulunan ? bulunan.id : null;
}

// Kimliğe göre GÜNCEL adı verir. Kimlik yoksa ya da tanım silinmişse önbellekteki ada düşer —
// silinmiş bir rengin geçmiş kaydı okunamaz hale gelmemeli.
function renkAdiGetir(renkId, onbellekAd, tanimliRenkler) {
  if (!renkId) return onbellekAd || "";
  const bulunan = (tanimliRenkler || []).find((r) => r.id === renkId);
  return bulunan ? bulunan.ad : (onbellekAd || "");
}

// Kimliği olmayan kayıtları ada göre eşleştirip damgalar.
//
// Yükleme sırasında BİR KEZ çalışır. Damgalanan kayıtlar bundan sonra kimlikle bulunacağı için
// yeniden adlandırma metin eşleştirmesine muhtaç kalmaz.
//
// Adı tanımlarda bulunamayan kayıt damgalanmaz — uydurma bir kimlik atamak, yanlış renge
// bağlanmaktan daha kötü sonuç verirdi. O kayıtlar eskisi gibi metinle çalışmaya devam eder.
function renkKimlikleriniDamgala(urunler, tanimliRenkler) {
  let damgalanan = 0;
  const yeni = (urunler || []).map((u) => {
    let degisti = false;
    const variants = (u.variants || []).map((v) => {
      if (v.renkId) return v;
      const id = renkKimligiBul(v.renk, tanimliRenkler);
      if (!id) return v;
      degisti = true; damgalanan++;
      return { ...v, renkId: id };
    });
    const recete = (u.recete || []).map((r) => {
      if (r.renkId && r.mamulRenkId) return r;
      const hid = r.renkId || renkKimligiBul(r.renk, tanimliRenkler);
      const mid = r.mamulRenkId || renkKimligiBul(r.mamulRenk, tanimliRenkler);
      if (!hid && !mid) return r;
      degisti = true;
      return { ...r, ...(hid ? { renkId: hid } : {}), ...(mid ? { mamulRenkId: mid } : {}) };
    });
    return degisti ? { ...u, variants, recete } : u;
  });
  return { urunler: yeni, damgalanan };
}

