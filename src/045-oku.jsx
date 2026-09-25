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

// Buluttan tüm veriyi çeker ve uygulamanın iç yapısına dönüştürür.
async function supabasedenOku() {
  // Sürüm sütunu var mı? Yazma başlamadan önce bilinmesi gerekiyor; sonra öğrenilirse ilk yazma
  // 400 alıp boşa giderdi.
  await surumDesteginiYokla();

  const [
    tanimSatir, cariSatir, cariHareket, urunSatir, varyantSatir, hareketSatir,
    sipSatir, kalemSatir, uretSatir, atamaSatir, rezSatir, onaySatir, copSatir, cekGorselSatir,
  ] = await Promise.all([
    supabaseTumSatirlar("tanimlar"),
    supabaseTumSatirlar("cariler"),
    supabaseTumSatirlar("cari_hareketleri", "select=*&order=tarih.desc"),
    supabaseTumSatirlar("urunler"),
    supabaseTumSatirlar("varyantlar"),
    supabaseTumSatirlar("stok_hareketleri", "select=*&order=tarih.desc"),
    supabaseTumSatirlar("siparisler"),
    supabaseTumSatirlar("siparis_kalemleri", "select=*&order=sira.asc"),
    supabaseTumSatirlar("uretim"),
    supabaseTumSatirlar("uretim_atamalari"),
    supabaseTumSatirlar("stok_rezervasyonlari"),
    supabaseTumSatirlar("onaylar"),
    supabaseTumSatirlar("cop"),
    supabaseTumSatirlar("cek_gorselleri"),
  ]);

  // Sürüm sayaçları uygulama kaydına DEĞİL, ayrı haritaya alınır (bkz. _surumler yorumu).
  // Ham satırlar burada elde olduğu için okuma yeri burası.
  surumleriYukle("urunler", urunSatir);
  surumleriYukle("cariler", cariSatir);
  surumleriYukle("siparisler", sipSatir);
  surumleriYukle("uretim", uretSatir);
  surumleriYukle("stok_rezervasyonlari", rezSatir);
  surumleriYukle("onaylar", onaySatir);
  surumleriYukle("cop", copSatir);
  // Çek görselleri de sürüm takibine giriyor: olmazsa her güncelleme koşulsuz INSERT yoluna
  // düşer ve ikinci cihazdaki değişiklik sessizce ezilir (10. denetim bunu yakaladı).
  surumleriYukle("cek_gorselleri", cekGorselSatir);

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
    ...kayitaCevir(u),
    variants: (varyantMap.get(u.id) || []).map((v) => ({
      renk: v.renk, renkId: v.renk_id || null, beden: v.beden,
      miktar: stokYuvarla(v.miktar), minStok: v.min_stok || 0,
    })),
    hareketler: (hareketMap.get(u.id) || []).map(kayitaCevir),
  }));

  const siparisler = sipSatir.map((s) => ({
    ...kayitaCevir(s),
    kalemler: (kalemMap.get(s.id) || []).map(kayitaCevir),
  }));

  // Atamalar prosesIlerleme'nin içine GERİ yerleştirilir: uygulama onları orada bekliyor.
  const uretim = uretSatir.map((o) => {
    const atamalar = atamaMap.get(o.id) || [];
    const ilerleme = (o.proses_ilerleme || []).map((p) => ({
      ...p,
      atamalar: atamalar.filter((a) => a.proses === p.proses).map(kayitaCevir),
    }));
    return { ...kayitaCevir(o), prosesIlerleme: ilerleme };
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

