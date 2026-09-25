// ================= RAPOR MOTORU — KULLANICININ KURDUĞU RAPORLAR =================
//
// Kullanıcı (12 Eylül): "Raporlar yapalım, her modülün içine sekme olarak bir veya daha fazla
// rapor. Raporu kullanıcı kendi yapabilsin: hangi bilgileri isteyecek, gruplu vs."
//
// TEK MOTOR, HER MODÜL: modül kendi verisini DÜZ SATIRLARA çevirip (sipariş kalemi, stok hücresi,
// cari hareketi…) alan listesiyle birlikte `RaporSekmesi`ne verir. Süzgeç, gruplama, toplam,
// sıralama, Excel ve yazdırma burada — modül başına ikinci bir rapor mantığı YAZILMAZ.
//
// Kaydedilen rapor bir TANIM: seçili sütunlar, süzgeçler, gruplama. Veriyi değil kuralı saklar;
// açıldığında o günkü veriyle yeniden hesaplanır.
//
// Kapsam (kullanıcı, 12 Eylül: "ikisi de seçilebilsin"): "ortak" herkes görür, "kisisel" yalnız
// kuran görür. İkisi de `tanimlar.raporlar`da ve buluta gidiyor — kişisel rapor makinede değil
// KULLANICIDA duruyor, aynı kullanıcı başka cihazdan da görsün diye.

const RAPOR_SUZGEC_ISLEMLERI = {
  metin: [
    { anahtar: "esit", ad: "eşit", uygula: (v, d) => rMetin(v) === rMetin(d) },
    { anahtar: "icerir", ad: "içerir", uygula: (v, d) => rMetin(v).includes(rMetin(d)) },
    { anahtar: "farkli", ad: "farklı", uygula: (v, d) => rMetin(v) !== rMetin(d) },
    { anahtar: "bos", ad: "boş", uygula: (v) => rMetin(v) === "", degersiz: true },
    { anahtar: "dolu", ad: "dolu", uygula: (v) => rMetin(v) !== "", degersiz: true },
  ],
  sayi: [
    { anahtar: "esit", ad: "=", uygula: (v, d) => rSayi(v) === rSayi(d) },
    { anahtar: "buyuk", ad: ">", uygula: (v, d) => rSayi(v) > rSayi(d) },
    { anahtar: "kucuk", ad: "<", uygula: (v, d) => rSayi(v) < rSayi(d) },
    { anahtar: "buyukesit", ad: "≥", uygula: (v, d) => rSayi(v) >= rSayi(d) },
    { anahtar: "kucukesit", ad: "≤", uygula: (v, d) => rSayi(v) <= rSayi(d) },
  ],
  tarih: [
    { anahtar: "esit", ad: "günü", uygula: (v, d) => (v || "") === (d || "") },
    { anahtar: "sonra", ad: "sonrası (dahil)", uygula: (v, d) => !!v && v >= d },
    { anahtar: "once", ad: "öncesi (dahil)", uygula: (v, d) => !!v && v <= d },
    { anahtar: "bos", ad: "boş", uygula: (v) => !v, degersiz: true },
  ],
};
RAPOR_SUZGEC_ISLEMLERI.para = RAPOR_SUZGEC_ISLEMLERI.sayi;

function rMetin(v) { return String(v == null ? "" : v).toLocaleLowerCase("tr-TR").trim(); }
function rSayi(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }
function rSayiMi(tip) { return tip === "sayi" || tip === "para"; }

// Boş tanım: sütunlar hepsi seçili, gruplama yok.
function raporTanimiBos(alanlar) {
  return {
    ad: "",
    kapsam: "ortak",
    sutunlar: (alanlar || []).map((a) => a.anahtar),
    suzgecler: [],      // [{ alan, islem, deger }]
    kolonAramalari: {}, // { alanAnahtari: "metin" } — başlık altı kutular
    gruplar: [],        // [alanAnahtari]
    siralama: null,     // { alan, yon: "artan" | "azalan" }
    // MATRİS VARSAYILAN (kullanıcı, 12 Eylül: "matris mantığımız burada da devam etsin" — düğmeyi
    // bulamayıp "neden olmadı?" dedi). Beden alanı olan raporda yeni rapor matris açılır.
    matris: (alanlar || []).some((a) => a.matrisAlan),
    sutunAyarlari: {},  // { anahtar: { ad, genislik } } — kısa başlık ve px genişlik (bkz. SütunAyarlari)
  };
}

// SÜZGEÇ: bütün koşullar birden (VE). Tanınmayan alan/işlem atlanır — eski bir kayıtta artık
// var olmayan bir alan raporu kilitlemesin.
function raporSuz(satirlar, alanlar, suzgecler) {
  const alanIndex = Object.fromEntries((alanlar || []).map((a) => [a.anahtar, a]));
  const etkin = (suzgecler || []).map((s) => {
    const alan = alanIndex[s.alan];
    if (!alan) return null;
    const islem = (RAPOR_SUZGEC_ISLEMLERI[alan.tip] || RAPOR_SUZGEC_ISLEMLERI.metin).find((i) => i.anahtar === s.islem);
    if (!islem) return null;
    if (!islem.degersiz && (s.deger == null || String(s.deger).trim() === "")) return null;
    return { alan, islem, deger: s.deger };
  }).filter(Boolean);
  if (etkin.length === 0) return satirlar || [];
  return (satirlar || []).filter((r) => etkin.every(({ alan, islem, deger }) => islem.uygula(r[alan.anahtar], deger)));
}

// GRUPLAMA: gruplama alanları anahtar, sayısal sütunlar TOPLANIR, metin sütunlarda tek değer varsa
// o, birden çoksa "(N farklı)". Satır sayısı `_adet`te. Gruplama yoksa satırlar olduğu gibi.
function raporGrupla(satirlar, alanlar, gruplar, sutunlar) {
  if (!gruplar || gruplar.length === 0) return (satirlar || []).map((r) => ({ ...r, _adet: 1 }));
  const alanIndex = Object.fromEntries((alanlar || []).map((a) => [a.anahtar, a]));
  const digerSutunlar = (sutunlar || []).filter((k) => !gruplar.includes(k) && alanIndex[k]);
  const index = new Map();
  (satirlar || []).forEach((r) => {
    const anahtar = gruplar.map((g) => String(r[g] == null ? "" : r[g])).join("\u0001");
    if (!index.has(anahtar)) {
      const grup = { _adet: 0, _grupMu: true };
      gruplar.forEach((g) => { grup[g] = r[g]; });
      // Toplanmayan sayı (birim fiyat) grupta metin gibi: tek değerse o, yoksa "(N farklı)".
      digerSutunlar.forEach((k) => { grup[k] = rSayiMi(alanIndex[k].tip) && !alanIndex[k].toplanmaz ? 0 : (alanIndex[k].tip === "resim" ? "" : new Set()); });
      index.set(anahtar, grup);
    }
    const grup = index.get(anahtar);
    grup._adet += 1;
    digerSutunlar.forEach((k) => {
      const alan = alanIndex[k];
      if (rSayiMi(alan.tip) && !alan.toplanmaz) {
        // BİR KEZ SAYILAN SÜTUN: aynı kaynak kaydın (`tekilAnahtar`, ör. kalem) birden çok satırı
        // varsa (aşama satırları) o kaydın sayısı gruba BİR kez girer — yoksa 10 çiftlik kalem üç
        // aşamaya bölündüğünde "sipariş miktarı" 30 çıkardı.
        if (alan.tekilAnahtar) {
          grup._tekil = grup._tekil || {};
          const gorulen = (grup._tekil[k] = grup._tekil[k] || new Set());
          const kimlik = r[alan.tekilAnahtar];
          if (kimlik != null && gorulen.has(kimlik)) return;
          if (kimlik != null) gorulen.add(kimlik);
        }
        grup[k] = Math.round((grup[k] + rSayi(r[k])) * 100) / 100;
      } else if (alan.tip === "resim") { if (!grup[k] && r[k]) grup[k] = r[k]; }   // ilk resim
      else grup[k].add(String(r[k] == null ? "" : r[k]));
    });
  });
  return [...index.values()].map((grup) => {
    const cikti = { ...grup };
    delete cikti._tekil;
    digerSutunlar.forEach((k) => {
      if (cikti[k] instanceof Set) {
        const degerler = [...cikti[k]].filter((x) => x !== "");
        cikti[k] = degerler.length === 0 ? "" : degerler.length === 1 ? degerler[0] : `(${degerler.length} farklı)`;
      }
    });
    return cikti;
  });
}

function raporSirala(satirlar, alanlar, siralama) {
  if (!siralama || !siralama.alan) return satirlar;
  const alan = (alanlar || []).find((a) => a.anahtar === siralama.alan);
  if (!alan) return satirlar;
  const yon = siralama.yon === "azalan" ? -1 : 1;
  return [...satirlar].sort((a, b) => {
    const x = a[alan.anahtar], y = b[alan.anahtar];
    if (rSayiMi(alan.tip)) return (rSayi(x) - rSayi(y)) * yon;
    return String(x == null ? "" : x).localeCompare(String(y == null ? "" : y), "tr") * yon;
  });
}

// TOPLAM SATIRI: sayısal sütunların toplamı — para sütununda birim karışıksa toplanmıyor
// (dolarla lirayı toplamak yanlış bir sayı verir; bkz. `paraBirimiAlani`).
// `hamSatirlar`: gruplama ÖNCESİ satırlar. Kalem başına bir kez sayılan sütunların GENEL toplamı
// buradan alınıyor — bir kalem iki aşama grubuna (Teslim edildi + Saya'da) dağılınca grup
// satırlarını toplamak kalemi iki kez sayıyordu (matris görünümünde ölçüldü: 29 yerine 19).
function raporToplam(satirlar, alanlar, sutunlar, hamSatirlar) {
  const alanIndex = Object.fromEntries((alanlar || []).map((a) => [a.anahtar, a]));
  const toplam = {};
  (sutunlar || []).forEach((k) => {
    const alan = alanIndex[k];
    if (!alan || !rSayiMi(alan.tip) || alan.toplanmaz) return;
    if (alan.tip === "para" && alan.paraBirimiAlani) {
      const birimler = new Set(satirlar.map((r) => r[alan.paraBirimiAlani] || "TRY"));
      if (birimler.size > 1) { toplam[k] = "(karışık p.b.)"; return; }
    }
    // Gruplanmamış satırlarda bir kez sayılan sütun kayıt başına BİR kez toplanır; gruplanmış
    // satırlarda o iş gruplamada yapıldı (grup satırının kimliği yok).
    const gorulen = new Set();
    const kaynak = alan.tekilAnahtar && hamSatirlar ? hamSatirlar : satirlar;
    toplam[k] = Math.round(kaynak.reduce((t, r) => {
      if (alan.tekilAnahtar && !r._grupMu) {
        const kimlik = r[alan.tekilAnahtar];
        if (kimlik != null) { if (gorulen.has(kimlik)) return t; gorulen.add(kimlik); }
      }
      return t + rSayi(r[k]);
    }, 0) * 100) / 100;
  });
  return toplam;
}

// Tanımı veriye uygular: süz → grupla → sırala. Dışa aktarma ve ekran aynı sonucu kullanıyor.
// SERBEST ARAMA (kullanıcı, 12 Eylül: "raporlarda arama çalışmıyor"): modülün arama kutusu
// Raporlar sekmesinde de görünüyordu ama yalnız listeyi süzüyordu. Kutu artık raporun BÜTÜN
// metin sütunlarında arıyor (süzgeçlerden önce); süzgeç, belli bir alan için kesin koşul.
function raporAra(satirlar, alanlar, arama) {
  const q = rMetin(arama);
  if (!q) return satirlar || [];
  const metinAlanlar = (alanlar || []).filter((a) => !rSayiMi(a.tip) && a.tip !== "resim").map((a) => a.anahtar);
  return (satirlar || []).filter((r) => metinAlanlar.some((k) => rMetin(r[k]).includes(q)));
}

// SÜTUN ARAMALARI (kullanıcı, 12 Eylül: "birden fazla filtreleme için kolonların üzerine arama").
// Tablo başlığının altında her sütunun kendi kutusu; hepsi birden (VE). Metin/tarih: içerir.
// Sayı/para: "5" eşit, ">5", "<5", ">=5", "<=5", "5-10" aralık. Kutu boşsa o sütun süzülmez.
function raporSayiKosulu(girdi) {
  const g = String(girdi || "").replace(/\s+/g, "").replace(",", ".");
  if (!g) return null;
  let m;
  if ((m = g.match(/^(>=|<=|>|<|=)(-?\d+(?:\.\d+)?)$/))) {
    const n = parseFloat(m[2]);
    return { ">=": (v) => v >= n, "<=": (v) => v <= n, ">": (v) => v > n, "<": (v) => v < n, "=": (v) => v === n }[m[1]];
  }
  if ((m = g.match(/^(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)$/))) {
    const a = parseFloat(m[1]), b = parseFloat(m[2]);
    return (v) => v >= Math.min(a, b) && v <= Math.max(a, b);
  }
  if ((m = g.match(/^-?\d+(?:\.\d+)?$/))) { const n = parseFloat(g); return (v) => v === n; }
  return () => false; // anlaşılmayan girdi hiçbir satırı geçirmez — sessizce her şeyi göstermektense
}
function raporTarihGirdisi(girdi) {
  const g = rMetin(girdi);
  const m = g.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?$/);
  if (!m) return g;
  const gun = m[1].padStart(2, "0"), ay = m[2].padStart(2, "0");
  return m[3] ? `${m[3]}-${ay}-${gun}` : `-${ay}-${gun}`;
}
function raporKolonAra(satirlar, alanlar, kolonAramalari) {
  const alanIndex = Object.fromEntries((alanlar || []).map((a) => [a.anahtar, a]));
  const kosullar = Object.entries(kolonAramalari || {}).map(([k, girdi]) => {
    const alan = alanIndex[k];
    if (!alan || alan.tip === "resim" || String(girdi || "").trim() === "") return null;
    if (rSayiMi(alan.tip)) { const kosul = raporSayiKosulu(girdi); return kosul ? (r) => kosul(rSayi(r[k])) : null; }
    // Tarih kutusuna "12.09.2026" (ekranda görünen biçim) yazılırsa kayıttaki "2026-09-12" ile eşlensin.
    const q = alan.tip === "tarih" ? raporTarihGirdisi(girdi) : rMetin(girdi);
    return (r) => rMetin(r[k]).includes(q);
  }).filter(Boolean);
  if (kosullar.length === 0) return satirlar || [];
  return (satirlar || []).filter((r) => kosullar.every((f) => f(r)));
}

// MATRİS GÖRÜNÜMÜ (kullanıcı, 12 Eylül: "her bedene satır eklemesin; 36, 37, 38 üretimdeyse hepsi
// matris olarak listelensin, ayrılan olduğunda — 36 kesimde, diğerleri bitmişse — ayrı satır olsun.
// Matris mantığımız burada da devam etsin.")
//
// Uygulamanın her yerindeki düzen: satır = model+renk (+aşama), sütun = beden. Modül alan
// listesinde `matrisAlan` (beden) ve `matrisDeger` (o hücreye yazılacak sayı) söylüyor; motor
// satırları beden DIŞINDAKİ seçili metin sütunlarına göre birleştiriyor ve her bedeni bir sütun
// yapıyor. Aşama seçili sütunlardaysa aşaması farklı beden kendiliğinden ayrı satıra düşüyor —
// ayrı bir kural yazılmadı, gruplama anahtarının sonucu.
//
// Gruplama seçiliyse anahtar gruplama alanları; seçili değilse beden dışındaki bütün metin
// sütunları. Diğer sayısal sütunlar `raporGrupla` ile aynı kurallardan toplanıyor (kalem başına
// bir kez, toplanmaz…).
function raporMatris(satirlar, alanlar, tanim, sutunlar) {
  const alanIndex = Object.fromEntries((alanlar || []).map((a) => [a.anahtar, a]));
  const matrisAlan = (alanlar || []).find((a) => a.matrisAlan);
  if (!matrisAlan) return null;
  const bedenAnahtar = matrisAlan.matrisAlan, degerAnahtar = matrisAlan.matrisDeger;
  const anahtarlar = ((tanim.gruplar || []).length > 0 ? tanim.gruplar : sutunlar)
    .filter((k) => alanIndex[k] && !rSayiMi(alanIndex[k].tip) && alanIndex[k].tip !== "resim" && k !== bedenAnahtar);
  const bedenler = bedenSirala([...new Set(satirlar.map((r) => String(r[bedenAnahtar] == null ? "" : r[bedenAnahtar])))]);
  // Beden sütunlarına giren değer diğer sayısal sütunlarda tekrar toplanmasın diye gruplamaya
  // beden ve değer alanı verilmiyor; hücreler ayrıca dolduruluyor.
  // Resim sütunları anahtar değil (aynı kalıbın resmi aynı) ama satırın başında gösteriliyor.
  const resimSutunlari = sutunlar.filter((k) => alanIndex[k] && alanIndex[k].tip === "resim");
  const digerSutunlar = sutunlar.filter((k) => k !== bedenAnahtar && k !== degerAnahtar && !resimSutunlari.includes(k));
  const gruplu = raporGrupla(satirlar, alanlar, anahtarlar, [...digerSutunlar, ...resimSutunlari]);
  // HÜCREDE AŞAMA (kullanıcı, 12 Eylül, "seçenek 1"): aşama alanı (`matrisAyrim`) anahtarda
  // DEĞİLSE bedenler tek satırda toplanır ve her hücre aşamaya bölünür — "6 üretildi / 4 kesim
  // bekliyor". Anahtardaysa (Aşama sütunu seçili) eskisi gibi aşama başına satır. Hücre değeri:
  // sayı (ayrım yok) ya da [{ etiket, miktar }] (ayrım var); `_hucreToplam` her durumda sayı.
  const ayrimAnahtar = matrisAlan.matrisAyrim && !anahtarlar.includes(matrisAlan.matrisAyrim) && alanIndex[matrisAlan.matrisAyrim]
    ? matrisAlan.matrisAyrim : null;
  // HÜCRE ÖZETİ (kullanıcı, 15 Eylül: "üstte sipariş miktarı, bir altta giden miktar, en altta
  // kalan miktar"). Bu üç sayı KALEM bazlı (aşama satırlarında tekrar eder), o yüzden `_kalemId`
  // ile bir kez sayılıyor — aşama dökümünden bağımsız.
  const OZET_ALANLARI = [
    { anahtar: "miktar", ad: "sipariş", renk: "var(--erp-text)" },
    { anahtar: "karsilanan", ad: "giden", renk: "var(--erp-primary)" },
    { anahtar: "kalan", ad: "kalan", renk: "var(--erp-warn)" },
  ].filter((x) => alanIndex[x.anahtar]);
  const hucreIndex = new Map();
  satirlar.forEach((r) => {
    const anahtar = anahtarlar.map((g) => String(r[g] == null ? "" : r[g])).join("\u0001");
    const h = hucreIndex.get(anahtar) || { toplam: {}, ayrim: {}, proses: {}, ozet: {}, sayilanKalem: {} };
    const b = String(r[bedenAnahtar] == null ? "" : r[bedenAnahtar]);
    const m = rSayi(r[degerAnahtar]);
    h.toplam[b] = Math.round(((h.toplam[b] || 0) + m) * 100) / 100;
    if (ayrimAnahtar) {
      const e = String(r[ayrimAnahtar] == null ? "" : r[ayrimAnahtar]);
      h.ayrim[b] = h.ayrim[b] || {};
      h.ayrim[b][e] = Math.round(((h.ayrim[b][e] || 0) + m) * 100) / 100;
      const ikonAlani = alanIndex[ayrimAnahtar].ikonAlani;
      if (ikonAlani && r[ikonAlani]) h.proses[e] = r[ikonAlani];
    }
    // Özet: kalem başına bir kez.
    if (OZET_ALANLARI.length > 0) {
      const kalemId = r._kalemId == null ? `${anahtar}|${b}` : String(r._kalemId);
      h.sayilanKalem[b] = h.sayilanKalem[b] || new Set();
      if (!h.sayilanKalem[b].has(kalemId)) {
        h.sayilanKalem[b].add(kalemId);
        h.ozet[b] = h.ozet[b] || {};
        OZET_ALANLARI.forEach((o) => {
          h.ozet[b][o.anahtar] = Math.round(((h.ozet[b][o.anahtar] || 0) + rSayi(r[o.anahtar])) * 100) / 100;
        });
      }
    }
    hucreIndex.set(anahtar, h);
  });
  const sonuc = gruplu.map((g) => {
    const anahtar = anahtarlar.map((k) => String(g[k] == null ? "" : g[k])).join("\u0001");
    const h = hucreIndex.get(anahtar) || { toplam: {}, ayrim: {}, proses: {} };
    const hucreler = {};
    Object.entries(h.toplam).forEach(([b, t]) => {
      hucreler[b] = ayrimAnahtar
        ? Object.entries(h.ayrim[b] || {}).filter(([, m]) => m > 0).map(([etiket, miktar]) => ({ etiket, miktar, proses: h.proses[etiket] || "" }))
        : t;
    });
    const toplam = Math.round(Object.values(h.toplam).reduce((t, x) => t + x, 0) * 100) / 100;
    return { ...g, _hucreler: hucreler, _hucreToplam: h.toplam, _hucreOzet: h.ozet, [degerAnahtar]: toplam };
  });
  return { ozetAlanlari: OZET_ALANLARI, satirlar: sonuc, bedenler, anahtarlar, bedenAnahtar, degerAnahtar, ayrimAnahtar, resimSutunlari, digerSutunlar: digerSutunlar.filter((k) => !anahtarlar.includes(k)) };
}

function raporHesapla(satirlar, alanlar, tanim, arama) {
  const sutunlar = (tanim.sutunlar || []).filter((k) => (alanlar || []).some((a) => a.anahtar === k));
  const suzulmus = raporSuz(raporKolonAra(raporAra(satirlar, alanlar, arama), alanlar, tanim.kolonAramalari), alanlar, tanim.suzgecler);
  if (tanim.matris) {
    const m = raporMatris(suzulmus, alanlar, tanim, sutunlar);
    if (m) {
      const sirali = raporSirala(m.satirlar, alanlar, tanim.siralama);
      const gorunen = [...m.anahtarlar, ...m.digerSutunlar];
      const toplam = raporToplam(sirali, alanlar, gorunen, suzulmus);
      // Beden sütunlarının toplamı ve genel toplam.
      const bedenToplam = {};
      sirali.forEach((r) => Object.entries(r._hucreToplam).forEach(([b, v]) => { bedenToplam[b] = Math.round(((bedenToplam[b] || 0) + v) * 100) / 100; }));
      toplam[m.degerAnahtar] = Math.round(Object.values(bedenToplam).reduce((t, x) => t + x, 0) * 100) / 100;
      return { satirlar: sirali, sutunlar: gorunen, toplam, hamSayi: suzulmus.length, matris: { ...m, bedenToplam } };
    }
  }
  const gruplu = raporGrupla(suzulmus, alanlar, tanim.gruplar, sutunlar);
  const sirali = raporSirala(gruplu, alanlar, tanim.siralama);
  // Gruplamada gruplama alanları HEP başta ve görünür — gizlenirse satırların neye göre
  // toplandığı okunamaz.
  const gorunenSutunlar = [...(tanim.gruplar || []).filter((g) => (alanlar || []).some((a) => a.anahtar === g)),
    ...sutunlar.filter((k) => !(tanim.gruplar || []).includes(k))];
  return { satirlar: sirali, sutunlar: gorunenSutunlar, toplam: raporToplam(sirali, alanlar, gorunenSutunlar, suzulmus), hamSayi: suzulmus.length };
}

function raporDegerYaz(alan, deger) {
  if (deger == null || deger === "") return "";
  if (alan.tip === "resim") return deger ? "(resim)" : "";
  if (typeof deger === "string" && /^\(/.test(deger)) return deger;
  if (alan.tip === "para") return Number(deger).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (alan.tip === "sayi") return Number(deger).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  if (alan.tip === "tarih" && /^\d{4}-\d{2}-\d{2}$/.test(deger)) { const [y, m, d] = deger.split("-"); return `${d}.${m}.${y}`; }
  return String(deger);
}

// Sütun başlığı: kullanıcının kısalttığı ad varsa o (bkz. sutunAyarlari), yoksa alanın adı.
function raporSutunAdi(alanIndex, sutunAyarlari, k, varsayilan) {
  const ozel = ((sutunAyarlari || {})[k] || {}).ad;
  return (ozel && ozel.trim()) || varsayilan || (alanIndex[k] || {}).ad || k;
}

// EXCEL = EKRANDAKİ TABLO (kullanıcı, 12 Eylül: "Excel ve yazdır tabloda gördüğü gibi yapsın,
// tablo başka yazdır başka olmasın"). Veri modelinden ayrı bir çıktı üretmek yerine EKRANDAKİ
// tablo okunuyor: aynı sütunlar, aynı sıra, aynı kısa başlıklar, aynı hücre metinleri ("10 kesim
// bekliyor / 4 üretildi"), toplam satırı dahil. Yazdırma zaten aynı tabloyu basıyor
// (`indirYazdirilabilirHTML` → tablonun kendisi); böylece üçü tek kaynaktan.
//
// Atlananlar: sütun arama satırı (`no-print`) ve resim sütunu — hücreye resim girmiyor, o sütun
// "(resim)" yazar. Türkçe biçimli sayılar ("2.220,00") Excel'de SAYI olsun diye geri çevriliyor.
function raporExcelAktar(tabloKapId, ad) {
  const kap = document.getElementById(tabloKapId);
  const tablo = kap && kap.querySelector("table");
  if (!tablo) return;
  const sayiMi = (t) => /^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(t) || /^-?\d+(,\d+)?$/.test(t);
  const sayiya = (t) => parseFloat(t.replace(/\./g, "").replace(",", "."));
  const hucre = (el, baslikMi) => {
    if (el.querySelector("img")) return "(resim)";
    const alt = [...el.querySelectorAll(":scope > div")];
    const metin = (alt.length > 1 ? alt.map((d) => d.textContent.replace(/\s+/g, " ").trim()).join(" / ") : el.textContent.replace(/\s+/g, " ").trim());
    if (metin === "—") return "";
    // Başlık satırı METİN kalır ("41" beden başlığı sayıya dönmesin); gövdede sayı görünen sayıdır.
    return !baslikMi && sayiMi(metin) ? sayiya(metin) : metin;
  };
  const satirlar = [...tablo.querySelectorAll("tr")]
    .filter((tr) => !tr.classList.contains("no-print"))
    .map((tr) => [...tr.children].map((el) => hucre(el, tr.parentElement.tagName === "THEAD")));
  // Testin okuyabilmesi için son çıktı pencerede duruyor (dosya indirme ölçülemiyor).
  if (typeof window !== "undefined") window.__sonRaporExcel = satirlar;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(satirlar), (ad || "Rapor").slice(0, 30));
  XLSX.writeFile(wb, `${(ad || "rapor").replace(/[^\p{L}\p{N}_-]+/gu, "_")}-${bugunYerel()}.xlsx`);
}

// Küçük resim; yoksa boş kutu. Dokununca büyük görünsün diye `title` yok — yazdırmada da basılıyor.
function RaporResim({ src }) {
  if (!src) return <span style={{ display: "inline-block", width: 36, height: 36, borderRadius: "var(--erp-r-sm)", background: "var(--erp-panel-2)", border: "1px dashed var(--erp-line)" }} />;
  return <img src={src} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: "var(--erp-r-sm)", border: "1px solid var(--erp-line-soft)", display: "block" }} />;
}

// ---- EKRAN ---------------------------------------------------------------------------------------
//
// Üst: kayıtlı raporlar (sekme gibi). Altında kurucu: sütunlar · süzgeçler · gruplama · sıralama.
// En altta sonuç tablosu + Excel + Yazdır. Kurucu açık/kapalı — kayıtlı raporu açan kullanıcı
// önce SONUCU görsün, kurguyla uğraşmasın.
// Proses dışı aşamaların ikonu. Anahtar aşama metninin başı.
const ASAMA_IKONLARI = [
  { on: "Üretildi", Ikon: Package }, { on: "Teslim edildi", Ikon: Truck }, { on: "Teslim alındı", Ikon: PackageCheck },
  { on: "Alış siparişinde", Ikon: Truck }, { on: "Alış fişi kesildi", Ikon: PackageCheck }, { on: "Bekleniyor", Ikon: Truck },
  { on: "Hurda", Ikon: Trash2 }, { on: "Planlanmadı", Ikon: Compass }, { on: "Üretim bekliyor", Ikon: Hammer },
];
function AsamaIkonu({ asama, proses, tanimlarProsesler, size = 12 }) {
  if (proses) return <ProsesIkonu proses={proses} tanimlarProsesler={tanimlarProsesler} size={size} />;
  const secim = ASAMA_IKONLARI.find((x) => String(asama || "").startsWith(x.on));
  return secim ? <secim.Ikon size={size} /> : null;
}

function RaporSekmesi({ modulAnahtari, baslik, alanlar, satirlar, raporlar, onRaporlarKaydet, aktifKullanici, showToast, arama, tanimlarProsesler }) {
  const kullaniciAd = (aktifKullanici && aktifKullanici.ad) || null;
  const modulRaporlari = (raporlar || []).filter((r) => r.modul === modulAnahtari
    && (r.kapsam !== "kisisel" || r.sahip === kullaniciAd));
  const [seciliId, setSeciliId] = useState(null);
  const [tanim, setTanim] = useState(() => raporTanimiBos(alanlar));
  // AYARLAR KAPALI GELİR (kullanıcı, 12 Eylül: "rapor kur kapalı gelsin, ayarlar bölümü olsun,
  // kullanılmayacak şeyler ekran önünde kalmasın"). Ekranda yalnız kayıtlı raporlar, sonuç ve
  // Ayarlar/Excel/Yazdır düğmeleri; kurucu + sütun ayarları + kaydet tek panelde.
  const [kurucuAcik, setKurucuAcik] = useState(false);
  const [kirli, setKirli] = useState(false);

  const alanIndex = Object.fromEntries((alanlar || []).map((a) => [a.anahtar, a]));
  const degistir = (parca) => { setTanim((t) => ({ ...t, ...parca })); setKirli(true); };

  const raporAc = (r) => {
    setSeciliId(r.id);
    setTanim({ ...raporTanimiBos(alanlar), ...r.tanim, ad: r.ad, kapsam: r.kapsam || "ortak" });
    setKurucuAcik(false);
    setKirli(false);
  };
  // "Yeni rapor" ayarları açıyor: yeni raporun ilk işi kurulmak.
  const yeniRapor = () => { setSeciliId(null); setTanim(raporTanimiBos(alanlar)); setKurucuAcik(true); setKirli(false); };

  const kaydet = () => {
    const ad = (tanim.ad || "").trim();
    if (!ad) return showToast("Rapora bir ad verin");
    const kayit = {
      id: seciliId || uid("rapor"),
      modul: modulAnahtari, ad, kapsam: tanim.kapsam || "ortak",
      sahip: kullaniciAd, guncelleme: new Date().toISOString(),
      tanim: { sutunlar: tanim.sutunlar, suzgecler: tanim.suzgecler, gruplar: tanim.gruplar, siralama: tanim.siralama, kolonAramalari: tanim.kolonAramalari || {}, matris: !!tanim.matris, sutunAyarlari: tanim.sutunAyarlari || {} },
    };
    const digerleri = (raporlar || []).filter((r) => r.id !== kayit.id);
    onRaporlarKaydet([...digerleri, kayit]);
    setSeciliId(kayit.id);
    setKirli(false);
    showToast(`"${ad}" kaydedildi`);
  };
  const sil = () => {
    if (!seciliId) return;
    onRaporlarKaydet((raporlar || []).filter((r) => r.id !== seciliId));
    yeniRapor();
  };

  const sonuc = raporHesapla(satirlar, alanlar, tanim, arama);
  // SÜTUN AYARLARI (kullanıcı, 12 Eylül: "sütunların yerlerini, boyutlarını değiştirip başlıkları
  // kısaltabileceğimiz bir yer"): kısa ad, px genişlik, sıra. Sıra `tanim.sutunlar` dizisinin sırası.
  const sutunAdi = (k, varsayilan) => raporSutunAdi(alanIndex, tanim.sutunAyarlari, k, varsayilan);
  const sutunStil = (k) => {
    const g = parseInt(((tanim.sutunAyarlari || {})[k] || {}).genislik, 10);
    return g > 0 ? { width: g, minWidth: g, maxWidth: g, overflow: "hidden", textOverflow: "ellipsis" } : {};
  };
  const sutunAyarla = (k, parca) => degistir({ sutunAyarlari: { ...(tanim.sutunAyarlari || {}), [k]: { ...((tanim.sutunAyarlari || {})[k] || {}), ...parca } } });
  // Gruplama alanları hep en solda (satırların neye göre toplandığı okunsun); onlar kendi
  // aralarında, diğer sütunlar kendi aralarında taşınıyor.
  const sutunListesi = (k) => ((tanim.gruplar || []).includes(k) ? "gruplar" : "sutunlar");
  const sutunTasi = (k, yon) => {
    const alanAdi = sutunListesi(k);
    const liste = [...(tanim[alanAdi] || [])];
    const i = liste.indexOf(k);
    const j = i + yon;
    if (i < 0 || j < 0 || j >= liste.length) return;
    [liste[i], liste[j]] = [liste[j], liste[i]];
    degistir({ [alanAdi]: liste });
  };
  const sutunBasaSona = (k, basa) => {
    const alanAdi = sutunListesi(k);
    const liste = (tanim[alanAdi] || []).filter((x) => x !== k);
    degistir({ [alanAdi]: basa ? [k, ...liste] : [...liste, k] });
  };
  const yazdirId = `rapor-yazdir-${modulAnahtari}`;

  const rozet = (aktif, renk) => ({
    padding: "4px 10px", borderRadius: "var(--erp-r-pill)", fontSize: 12, fontWeight: 600, cursor: "pointer",
    border: `1.5px solid ${aktif ? renk : "var(--erp-border)"}`, background: aktif ? alfaEkle(renk, "1A") : "#fff",
    color: aktif ? renk : "var(--erp-text-2)",
  });
  const kutu = { padding: "5px 7px", fontSize: 12, border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", background: "#fff" };

  return (
    <div data-rapor-sekmesi={modulAnahtari}>
      {/* KAYITLI RAPORLAR */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <button type="button" style={rozet(seciliId === null, "var(--erp-primary)")} onClick={yeniRapor}>
          <Plus size={11} /> Yeni rapor
        </button>
        {modulRaporlari.map((r) => (
          <button key={r.id} type="button" data-kayitli-rapor={r.ad} style={rozet(seciliId === r.id, "var(--erp-info)")} onClick={() => raporAc(r)}
            title={r.kapsam === "kisisel" ? `Kişisel — yalnız ${r.sahip || "kuran"} görür` : "Ortak — herkes görür"}>
            {r.kapsam === "kisisel" ? <User size={11} /> : <Users size={11} />} {r.ad}
          </button>
        ))}
        {modulRaporlari.length === 0 && <span style={{ fontSize: 12, color: "var(--erp-text-3)" }}>Henüz kayıtlı rapor yok — aşağıdan kurup kaydedin.</span>}
      </div>

      {/* SONUÇ ÜST ŞERİDİ: özet · Ayarlar · Excel · Yazdır */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <span className="mono" style={{ fontSize: 12, color: "var(--erp-text)", fontWeight: 700 }} data-rapor-ozet="1">
          {sonuc.satirlar.length} {sonuc.matris ? `matris satırı (${sonuc.hamSayi} kayıt)` : (tanim.gruplar || []).length > 0 ? `grup (${sonuc.hamSayi} satır)` : "satır"}
          {rMetin(arama) && <span style={{ fontWeight: 400, color: "var(--erp-text-2)" }}> · "{arama.trim()}" aramasıyla</span>}
        </span>
        {kirli && <span style={{ fontSize: 11, color: "var(--erp-warn)", fontWeight: 700 }}>kaydedilmedi</span>}
        <button type="button" className="btn-ghost" data-rapor-ayarlar="1" style={{ marginLeft: "auto", padding: "5px 10px", fontSize: 12, borderColor: kurucuAcik ? "var(--erp-brown)" : undefined, background: kurucuAcik ? "var(--erp-panel)" : undefined }}
          title="Düzen, sütunlar, süzgeçler, gruplama, sıralama, sütun ayarları, kaydet" onClick={() => setKurucuAcik(!kurucuAcik)}>
          <Settings size={12} /> Ayarlar {kurucuAcik ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <button type="button" className="btn-ghost" style={{ padding: "5px 10px", fontSize: 12 }}
          onClick={() => raporExcelAktar(yazdirId, tanim.ad || baslik)}><Download size={12} /> Excel</button>
        <button type="button" className="btn-ghost" style={{ padding: "5px 10px", fontSize: 12 }}
          onClick={() => indirYazdirilabilirHTML(`#${yazdirId}`, tanim.ad || baslik)}><Printer size={12} /> Yazdır / PDF</button>
      </div>

      {/* AYARLAR PANELİ (kapalı gelir) */}
      <div data-rapor-ayar-paneli={kurucuAcik ? "acik" : "kapali"} style={{ display: kurucuAcik ? undefined : "none", background: "#fff", border: "1px solid #8A5A38", borderRadius: "var(--erp-r-md)", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid var(--erp-line-soft)" }}>
          <b style={{ fontSize: 13 }}>{seciliId ? tanim.ad : "Yeni rapor"}</b>
          <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>
            {sonuc.sutunlar.length} sütun · {(tanim.suzgecler || []).filter((s) => s.alan).length + Object.values(tanim.kolonAramalari || {}).filter((v) => String(v || "").trim()).length} süzgeç
            {(tanim.gruplar || []).length > 0 && ` · gruplu: ${tanim.gruplar.map((g) => (alanIndex[g] || {}).ad || g).join(" › ")}`}
          </span>
        </div>
        {(
          <div style={{ padding: "4px 12px 12px", display: "grid", gap: 12 }}>
            {/* SÜTUNLAR */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text-2)", marginBottom: 6 }}>SÜTUNLAR</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {alanlar.map((a) => {
                  const secili = (tanim.sutunlar || []).includes(a.anahtar);
                  return (
                    <button key={a.anahtar} type="button" data-rapor-sutun={a.anahtar} style={rozet(secili, "var(--erp-text)")}
                      onClick={() => degistir({ sutunlar: secili ? tanim.sutunlar.filter((k) => k !== a.anahtar) : [...tanim.sutunlar, a.anahtar] })}>
                      {a.ad}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* SÜZGEÇLER */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text-2)", marginBottom: 6 }}>SÜZGEÇLER <span style={{ fontWeight: 400 }}>— hepsi birden sağlanmalı</span></div>
              <div style={{ display: "grid", gap: 6 }}>
                {(tanim.suzgecler || []).map((s, i) => {
                  const alan = alanIndex[s.alan];
                  const islemler = alan ? (RAPOR_SUZGEC_ISLEMLERI[alan.tip] || RAPOR_SUZGEC_ISLEMLERI.metin) : [];
                  const islem = islemler.find((x) => x.anahtar === s.islem);
                  const guncelle = (parca) => degistir({ suzgecler: tanim.suzgecler.map((x, j) => (j === i ? { ...x, ...parca } : x)) });
                  return (
                    <div key={i} data-rapor-suzgec={i} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <select value={s.alan || ""} style={kutu} onChange={(e) => {
                        const yeniAlan = alanIndex[e.target.value];
                        const ilk = yeniAlan ? (RAPOR_SUZGEC_ISLEMLERI[yeniAlan.tip] || RAPOR_SUZGEC_ISLEMLERI.metin)[0].anahtar : "";
                        guncelle({ alan: e.target.value, islem: ilk, deger: "" });
                      }}>
                        <option value="">Alan seçin…</option>
                        {alanlar.filter((a) => a.tip !== "resim").map((a) => <option key={a.anahtar} value={a.anahtar}>{a.ad}</option>)}
                      </select>
                      {alan && (
                        <select value={s.islem || ""} style={kutu} onChange={(e) => guncelle({ islem: e.target.value })}>
                          {islemler.map((x) => <option key={x.anahtar} value={x.anahtar}>{x.ad}</option>)}
                        </select>
                      )}
                      {alan && islem && !islem.degersiz && (
                        alan.secenekler ? (
                          <select value={s.deger || ""} style={kutu} onChange={(e) => guncelle({ deger: e.target.value })}>
                            <option value="">Seçin…</option>
                            {alan.secenekler.map((d) => <option key={d} value={d}>{d}</option>)}
                          </select>
                        ) : (
                          <input type={alan.tip === "tarih" ? "date" : rSayiMi(alan.tip) ? "number" : "text"} step="0.01"
                            value={s.deger || ""} style={{ ...kutu, width: alan.tip === "tarih" ? 150 : 140 }}
                            onChange={(e) => guncelle({ deger: e.target.value })} />
                        )
                      )}
                      <button type="button" className="btn-ghost" style={{ padding: "3px 8px", fontSize: 11 }}
                        onClick={() => degistir({ suzgecler: tanim.suzgecler.filter((_, j) => j !== i) })}><X size={11} /></button>
                    </div>
                  );
                })}
                <button type="button" className="btn-ghost" style={{ padding: "3px 10px", fontSize: 11, justifySelf: "start" }}
                  onClick={() => degistir({ suzgecler: [...(tanim.suzgecler || []), { alan: "", islem: "", deger: "" }] })}>
                  <Plus size={11} /> Süzgeç ekle
                </button>
              </div>
            </div>
            {/* GRUPLAMA + SIRALAMA + MATRİS */}
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              {alanlar.some((a) => a.matrisAlan) && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text-2)", marginBottom: 6 }}>DÜZEN</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" data-rapor-duzen="liste" style={rozet(!tanim.matris, "var(--erp-text)")} onClick={() => degistir({ matris: false })}>Liste</button>
                    <button type="button" data-rapor-duzen="matris" style={rozet(!!tanim.matris, "var(--erp-text)")} onClick={() => degistir({ matris: true })}
                      title="Bedenler sütun olur. Aşama sütunu seçiliyse aşama başına satır; seçili değilse tek satır ve aşama hücrenin içinde (10 kesim bekliyor / 4 üretildi)">Matris — bedenler sütun</button>
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text-2)", marginBottom: 6 }}>GRUPLA <span style={{ fontWeight: 400 }}>— sayılar toplanır, sırayla</span></div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {alanlar.filter((a) => !rSayiMi(a.tip) && a.tip !== "resim").map((a) => {
                    const sira = (tanim.gruplar || []).indexOf(a.anahtar);
                    return (
                      <button key={a.anahtar} type="button" data-rapor-grup={a.anahtar} style={rozet(sira >= 0, "var(--erp-brown)")}
                        onClick={() => degistir({ gruplar: sira >= 0 ? tanim.gruplar.filter((k) => k !== a.anahtar) : [...(tanim.gruplar || []), a.anahtar] })}>
                        {sira >= 0 && <span className="mono">{sira + 1}. </span>}{a.ad}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text-2)", marginBottom: 6 }}>SIRALA</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <select value={(tanim.siralama || {}).alan || ""} style={kutu}
                    onChange={(e) => degistir({ siralama: e.target.value ? { alan: e.target.value, yon: (tanim.siralama || {}).yon || "artan" } : null })}>
                    <option value="">Sıralama yok</option>
                    {alanlar.map((a) => <option key={a.anahtar} value={a.anahtar}>{a.ad}</option>)}
                  </select>
                  {tanim.siralama && (
                    <select value={tanim.siralama.yon} style={kutu} onChange={(e) => degistir({ siralama: { ...tanim.siralama, yon: e.target.value } })}>
                      <option value="artan">artan</option>
                      <option value="azalan">azalan</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
            {/* SÜTUN AYARLARI: sıra, kısa başlık, genişlik */}
        <div data-sutun-ayarlari="1" style={{ background: "var(--erp-panel)", border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: "8px 10px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text-2)", marginBottom: 6 }}>
            SÜTUN AYARLARI <span style={{ fontWeight: 400 }}>— sıra, kısa başlık, genişlik (px, boş = kendiliğinden). Rapor kaydedilince bunlar da saklanır.</span>
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            {[...(tanim.gruplar || []).filter((k) => alanIndex[k]), ...(tanim.sutunlar || []).filter((k) => alanIndex[k] && !(tanim.gruplar || []).includes(k)), ...(sonuc.matris ? ["_toplam"] : [])].map((k, i, liste) => {
              const varsayilan = k === "_toplam" ? `Toplam ${alanIndex[sonuc.matris.degerAnahtar].ad}` : alanIndex[k].ad;
              const ayar = (tanim.sutunAyarlari || {})[k] || {};
              const tasinir = k !== "_toplam";
              const grupMu = (tanim.gruplar || []).includes(k);
              return (
                <div key={k} data-sutun-ayar={k} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", gap: 2 }}>
                    <button type="button" className="btn-ghost" title="Başa al" disabled={!tasinir || i === 0} style={{ padding: "2px 6px", fontSize: 11 }} onClick={() => sutunBasaSona(k, true)}>⇈</button>
                    <button type="button" className="btn-ghost" title="Yukarı" disabled={!tasinir || i === 0} style={{ padding: "2px 6px", fontSize: 11 }} onClick={() => sutunTasi(k, -1)}>↑</button>
                    <button type="button" className="btn-ghost" title="Aşağı" disabled={!tasinir || i >= liste.length - 1 - (sonuc.matris ? 1 : 0)} style={{ padding: "2px 6px", fontSize: 11 }} onClick={() => sutunTasi(k, 1)}>↓</button>
                    <button type="button" className="btn-ghost" title="Sona al" disabled={!tasinir || i >= liste.length - 1 - (sonuc.matris ? 1 : 0)} style={{ padding: "2px 6px", fontSize: 11 }} onClick={() => sutunBasaSona(k, false)}>⇊</button>
                  </span>
                  <span style={{ fontSize: 11, color: "var(--erp-text-2)", minWidth: 150 }}>{varsayilan}{grupMu && <span style={{ color: "var(--erp-brown)" }}> · gruplama</span>}</span>
                  <input value={ayar.ad || ""} placeholder={`kısa ad (${varsayilan})`} data-sutun-ad={k}
                    onChange={(e) => sutunAyarla(k, { ad: e.target.value })}
                    style={{ ...kutu, width: 150 }} />
                  <input type="number" min="30" step="10" value={ayar.genislik || ""} placeholder="px" data-sutun-genislik={k}
                    onChange={(e) => sutunAyarla(k, { genislik: e.target.value })}
                    style={{ ...kutu, width: 70 }} />
                  {(ayar.ad || ayar.genislik) && (
                    <button type="button" className="btn-ghost" title="Bu sütunun ayarını sıfırla" style={{ padding: "2px 6px", fontSize: 11 }}
                      onClick={() => { const y = { ...(tanim.sutunAyarlari || {}) }; delete y[k]; degistir({ sutunAyarlari: y }); }}><X size={10} /></button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

            {/* KAYDET */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--erp-line-soft)", paddingTop: 10 }}>
              <input value={tanim.ad} placeholder="Rapor adı" data-rapor-ad="1" style={{ ...kutu, width: 220 }} onChange={(e) => degistir({ ad: e.target.value })} />
              <select value={tanim.kapsam} style={kutu} onChange={(e) => degistir({ kapsam: e.target.value })}>
                <option value="ortak">Ortak — herkes görür</option>
                <option value="kisisel">Kişisel — yalnız ben</option>
              </select>
              <button type="button" className="btn-primary" data-rapor-kaydet="1" style={{ padding: "6px 12px", fontSize: 12 }} onClick={kaydet}>
                <Save size={12} /> {seciliId ? "Güncelle" : "Kaydet"}
              </button>
              {seciliId && <SilOnayButonu onConfirm={sil} boyut={13} baslikNormal="Raporu sil" baslikOnay="Rapor silinecek — emin misiniz? Tekrar dokunun" />}
            </div>
          </div>
        )}
      </div>

      <div id={yazdirId} style={{ background: "#fff", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 10, overflowX: "auto" }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{tanim.ad || baslik} <span className="mono" style={{ fontWeight: 400, color: "var(--erp-text-3)", fontSize: 11 }}>{bugunYerel()}</span></div>
        {sonuc.sutunlar.length === 0 && !sonuc.matris ? (
          <EmptyState text="Hiç sütun seçili değil — yukarıdan en az bir sütun seçin." />
        ) : sonuc.matris ? (() => {
          const m = sonuc.matris;
          const degerAlan = alanIndex[m.degerAnahtar];
          const th = (metin, sag, ek, k) => <th title={metin} style={{ fontSize: 11, padding: "4px 8px", color: "var(--erp-text-2)", textAlign: sag ? "right" : "left", borderBottom: "2px solid var(--erp-text)", whiteSpace: "nowrap", ...(k ? sutunStil(k) : {}), ...(ek || {}) }}>{k ? sutunAdi(k, metin) : metin}</th>;
          return (
            <table data-rapor-tablo="1" data-rapor-matris="1" style={{ width: "auto", minWidth: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {m.resimSutunlari.map((k) => <React.Fragment key={k}>{th(alanIndex[k].ad, false, null, k)}</React.Fragment>)}
                  {m.anahtarlar.map((k) => <React.Fragment key={k}>{th(alanIndex[k].ad, false, null, k)}</React.Fragment>)}
                  {m.bedenler.map((b) => <React.Fragment key={`b-${b}`}>{th(b || "—", true, { textAlign: "center" })}</React.Fragment>)}
                  {th(`Toplam ${degerAlan.ad}`, true, { borderLeft: "1px dashed var(--erp-line)" }, "_toplam")}
                  {m.digerSutunlar.map((k) => <React.Fragment key={k}>{th(alanIndex[k].ad, rSayiMi(alanIndex[k].tip), null, k)}</React.Fragment>)}
                </tr>
                <tr data-rapor-kolon-arama="1" className="no-print">
                  {m.anahtarlar.map((k) => {
                    const deger = (tanim.kolonAramalari || {})[k] || "";
                    return (
                      <th key={k} style={{ padding: "2px 4px" }}>
                        <input value={deger} data-kolon-arama={k} placeholder="ara…"
                          onChange={(e) => degistir({ kolonAramalari: { ...(tanim.kolonAramalari || {}), [k]: e.target.value } })}
                          style={{ width: "100%", minWidth: 56, boxSizing: "border-box", padding: "3px 6px", fontSize: 11, border: `1px solid ${deger ? "var(--erp-brown)" : "var(--erp-border-2)"}`, borderRadius: "var(--erp-r-sm)", background: deger ? "var(--erp-panel)" : "#fff" }} />
                      </th>
                    );
                  })}
                  <th colSpan={m.bedenler.length + 1 + m.digerSutunlar.length + m.resimSutunlari.length} />
                </tr>
              </thead>
              <tbody>
                {sonuc.satirlar.map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--erp-line-soft)" }}>
                    {m.resimSutunlari.map((k) => <td key={k} style={{ padding: "2px 6px", ...sutunStil(k) }}><RaporResim src={r[k]} /></td>)}
                    {m.anahtarlar.map((k) => (
                      <td key={k} title={raporDegerYaz(alanIndex[k], r[k])} style={{ fontSize: 12, padding: "4px 8px", whiteSpace: "nowrap", ...sutunStil(k) }}>
                        {alanIndex[k].ikonAlani ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <span style={{ color: "var(--erp-brown)", display: "inline-flex" }}><AsamaIkonu asama={r[k]} proses={r[alanIndex[k].ikonAlani]} tanimlarProsesler={tanimlarProsesler} /></span>
                            {raporDegerYaz(alanIndex[k], r[k])}
                          </span>
                        ) : raporDegerYaz(alanIndex[k], r[k])}
                      </td>
                    ))}
                    {m.bedenler.map((b) => {
                      const v = r._hucreler[b];
                      const ozet = (r._hucreOzet || {})[b];
                      const ozetAlanlari = m.ozetAlanlari || [];
                      const bosMu = !v || (Array.isArray(v) && v.length === 0);
                      if (bosMu && !ozet) return <td key={`b-${b}`} className="mono" style={{ fontSize: 12, padding: "4px 8px", textAlign: "center", color: "var(--erp-border)" }}>—</td>;
                      // HÜCRE DÜZENİ (kullanıcı, 15 Eylül: "üstte sipariş miktarı, bir altta giden
                      // miktar, en altta kalan miktar; başka detay varsa onları da listeleyebiliriz").
                      // Üstte üç sayı sabit satırlarda; altında varsa AŞAMA dökümü küçük puntoyla.
                      // Aşama dökümü aynı bilgiyi başka açıdan söylüyor: üç sayı "ne kadar", aşama
                      // "nerede". İkisi bir arada, sıra bozulmadan.
                      return (
                        <td key={`b-${b}`} style={{ fontSize: 11, padding: "4px 6px", textAlign: "left", verticalAlign: "top", whiteSpace: "nowrap" }}>
                          {ozet && ozetAlanlari.map((o) => (
                            <div key={o.anahtar} data-hucre-ozet={o.anahtar} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <b className="mono" style={{ fontSize: 12, color: o.renk }}>{raporDegerYaz(degerAlan, ozet[o.anahtar] || 0)}</b>
                              <span style={{ color: "var(--erp-text-3)", fontSize: 10 }}>{o.ad}</span>
                            </div>
                          ))}
                          {Array.isArray(v) && v.length > 0 && (
                            <div style={{ marginTop: ozet ? 3 : 0, paddingTop: ozet ? 3 : 0, borderTop: ozet ? "1px dotted var(--erp-line-soft)" : "none" }}>
                              {v.map((x) => (
                                <div key={x.etiket} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <span style={{ color: "var(--erp-brown)", display: "inline-flex" }}><AsamaIkonu asama={x.etiket} proses={x.proses} tanimlarProsesler={tanimlarProsesler} /></span>
                                  <b className="mono" style={{ fontSize: 11 }}>{raporDegerYaz(degerAlan, x.miktar)}</b>
                                  <span style={{ color: "var(--erp-text-2)", fontSize: 10 }}>{x.etiket.toLocaleLowerCase("tr-TR")}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {!Array.isArray(v) && v != null && !ozet && (
                            <b className="mono" style={{ fontSize: 12 }}>{raporDegerYaz(degerAlan, v)}</b>
                          )}
                        </td>
                      );
                    })}
                    <td className="mono" style={{ fontSize: 12, padding: "4px 8px", textAlign: "right", fontWeight: 700, borderLeft: "1px dashed var(--erp-line)" }}>{raporDegerYaz(degerAlan, r[m.degerAnahtar])}</td>
                    {m.digerSutunlar.map((k) => (
                      <td key={k} className={rSayiMi(alanIndex[k].tip) ? "mono" : undefined} style={{ fontSize: 12, padding: "4px 8px", textAlign: rSayiMi(alanIndex[k].tip) ? "right" : "left", whiteSpace: "nowrap" }}>{raporDegerYaz(alanIndex[k], r[k])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr data-rapor-toplam="1" style={{ borderTop: "2px solid var(--erp-text)", fontWeight: 700 }}>
                  {m.resimSutunlari.map((k) => <td key={k} />)}
                  {m.anahtarlar.map((k, i) => <td key={k} style={{ fontSize: 12, padding: "5px 8px" }}>{i === 0 ? "Toplam" : ""}</td>)}
                  {m.bedenler.map((b) => <td key={`b-${b}`} className="mono" style={{ fontSize: 12, padding: "5px 8px", textAlign: "center" }}>{m.bedenToplam[b] ? raporDegerYaz(degerAlan, m.bedenToplam[b]) : ""}</td>)}
                  <td className="mono" style={{ fontSize: 12, padding: "5px 8px", textAlign: "right", borderLeft: "1px dashed var(--erp-line)" }}>{raporDegerYaz(degerAlan, sonuc.toplam[m.degerAnahtar])}</td>
                  {m.digerSutunlar.map((k) => <td key={k} className="mono" style={{ fontSize: 12, padding: "5px 8px", textAlign: rSayiMi(alanIndex[k].tip) ? "right" : "left" }}>{k in sonuc.toplam ? raporDegerYaz(alanIndex[k], sonuc.toplam[k]) : ""}</td>)}
                </tr>
              </tfoot>
            </table>
          );
        })() : (
          <table data-rapor-tablo="1" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {sonuc.sutunlar.map((k) => (
                  <th key={k} title={alanIndex[k].ad} style={{ fontSize: 11, padding: "4px 8px", color: "var(--erp-text-2)", textAlign: rSayiMi(alanIndex[k].tip) ? "right" : "left", borderBottom: "2px solid var(--erp-text)", whiteSpace: "nowrap", ...sutunStil(k) }}>{sutunAdi(k)}</th>
                ))}
                {(tanim.gruplar || []).length > 0 && <th style={{ fontSize: 11, padding: "4px 8px", color: "var(--erp-text-2)", textAlign: "right", borderBottom: "2px solid var(--erp-text)" }}>Satır</th>}
              </tr>
              {/* SÜTUN ARAMALARI: her sütunun altında kutu; hepsi birden. Sayıda ">5", "5-10" gibi.
                  Gruplanmış rapor da satırlara (gruplama öncesi) uygulanıyor — sayı sütununda arama
                  aşama/kalem satırını süzer, grubun toplamını değil. */}
              <tr data-rapor-kolon-arama="1" className="no-print">
                {sonuc.sutunlar.map((k) => {
                  const alan = alanIndex[k];
                  if (alan.tip === "resim") return <th key={k} />;   // resimde arama yok
                  const deger = (tanim.kolonAramalari || {})[k] || "";
                  // SEÇENEK LİSTESİ (kullanıcı, 12 Eylül: "tıklayınca dolu satırlar çıksa, yazdıkça
                  // daralsa, seçmeli olsa"). Kutuya dokununca o sütunda GERÇEKTEN var olan değerler
                  // listeleniyor (`datalist`: yazdıkça daralır, seçilir). Liste, DİĞER sütun
                  // aramalarıyla süzülmüş satırlardan: Renk "siyah" seçildiyse Beden listesinde yalnız
                  // siyahın bedenleri kalır. En çok 200 değer — telefonda daha uzunu açılmıyor.
                  const digerleri = { ...(tanim.kolonAramalari || {}) }; delete digerleri[k];
                  const kaynak = raporKolonAra(raporAra(satirlar, alanlar, arama), alanlar, digerleri);
                  // Sayıda HAM değer (2220, "2.220,00" değil): kutu ">2220" gibi girdileri okuyor,
                  // binlik noktasını sayı sanırdı. Tarihte gün.ay.yıl — kutu onu anlıyor (aşağıda).
                  const secenekler = [...new Set(kaynak.map((r) => (rSayiMi(alan.tip) ? String(rSayi(r[k])) : raporDegerYaz(alan, r[k]))).filter((v) => v !== ""))]
                    .sort((x, y) => (rSayiMi(alan.tip) ? rSayi(x) - rSayi(y) : x.localeCompare(y, "tr")))
                    .slice(0, 200);
                  const listeId = `${yazdirId}-liste-${k}`;
                  return (
                    <th key={k} style={{ padding: "2px 4px" }}>
                      <datalist id={listeId}>
                        {secenekler.map((v) => <option key={v} value={v} />)}
                      </datalist>
                      <input
                        value={deger}
                        list={listeId}
                        data-kolon-arama={k}
                        placeholder={rSayiMi(alan.tip) ? ">5, 5-10…" : "ara…"}
                        title={rSayiMi(alan.tip) ? "Sayı: 5 eşit · >5 · <5 · >=5 · <=5 · 5-10 aralık" : "İçerir — harf duyarsız"}
                        onChange={(e) => degistir({ kolonAramalari: { ...(tanim.kolonAramalari || {}), [k]: e.target.value } })}
                        style={{ width: "100%", minWidth: 56, boxSizing: "border-box", padding: "3px 6px", fontSize: 11, border: `1px solid ${deger ? "var(--erp-brown)" : "var(--erp-border-2)"}`, borderRadius: "var(--erp-r-sm)", background: deger ? "var(--erp-panel)" : "#fff", textAlign: rSayiMi(alan.tip) ? "right" : "left" }}
                      />
                    </th>
                  );
                })}
                {(tanim.gruplar || []).length > 0 && <th />}
              </tr>
            </thead>
            <tbody>
              {sonuc.satirlar.map((r, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--erp-line-soft)" }}>
                  {sonuc.sutunlar.map((k) => (
                    <td key={k} className={rSayiMi(alanIndex[k].tip) ? "mono" : undefined} title={alanIndex[k].tip === "resim" ? undefined : raporDegerYaz(alanIndex[k], r[k])}
                      style={{ fontSize: 12, padding: alanIndex[k].tip === "resim" ? "2px 6px" : "4px 8px", textAlign: rSayiMi(alanIndex[k].tip) ? "right" : "left", whiteSpace: "nowrap", ...sutunStil(k) }}>
                      {alanIndex[k].tip === "resim" ? <RaporResim src={r[k]} /> : alanIndex[k].ikonAlani ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <span style={{ color: "var(--erp-brown)", display: "inline-flex" }}><AsamaIkonu asama={r[k]} proses={r[alanIndex[k].ikonAlani]} tanimlarProsesler={tanimlarProsesler} /></span>
                          {raporDegerYaz(alanIndex[k], r[k])}
                        </span>
                      ) : raporDegerYaz(alanIndex[k], r[k])}
                    </td>
                  ))}
                  {(tanim.gruplar || []).length > 0 && <td className="mono" style={{ fontSize: 12, padding: "4px 8px", textAlign: "right" }}>{r._adet}</td>}
                </tr>
              ))}
            </tbody>
            {Object.keys(sonuc.toplam).length > 0 && (
              <tfoot>
                <tr data-rapor-toplam="1" style={{ borderTop: "2px solid var(--erp-text)", fontWeight: 700 }}>
                  {sonuc.sutunlar.map((k, i) => (
                    <td key={k} className="mono" style={{ fontSize: 12, padding: "5px 8px", textAlign: rSayiMi(alanIndex[k].tip) ? "right" : "left" }}>
                      {i === 0 && !(k in sonuc.toplam) ? "Toplam" : (k in sonuc.toplam ? raporDegerYaz(alanIndex[k], sonuc.toplam[k]) : "")}
                    </td>
                  ))}
                  {(tanim.gruplar || []).length > 0 && <td className="mono" style={{ fontSize: 12, padding: "5px 8px", textAlign: "right" }}>{sonuc.hamSayi}</td>}
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}

// ---- SİPARİŞ SATIRLARI ---------------------------------------------------------------------------
//
// Kullanıcı (12 Eylül): "Planlanmış olanın son durumu ayrı satırlarda: 200 çift ayakkabı üretimde,
// 100 çifti üretilmiş depoda, 40 çifti kesim bekliyor, 50 çifti sayada, 10 çift planlanmamış —
// her biri ayrı satırda, filtreleyebileyim. Aynı mantık üretimden ve planlamadan da bilgi çeksin."
//
// Her sipariş KALEMİ, bulunduğu AŞAMALARA bölünüp her aşama BİR SATIR oluyor. Kalem zaten planlama
// anında Üretim / Satın alma / planlanmamış parçalara bölünüyor (bkz. planlaUretim); üretime giden
// parça burada bir de ÜRETİMİN İÇİNDEKİ duruma göre bölünüyor:
//
//   Teslim edildi          — kalemin `karsilanan`ı (müşteriye gitti)
//   Üretildi (stokta)      — son prosesten sağlam çıkmış, henüz teslim edilmemiş
//   <Proses> bekliyor      — önceki prosesten gelmiş ama henüz kimseye verilmemiş
//   <Proses>'de            — verilmiş, teslim alınmamış (çalışılıyor)
//   Hurda                  — hurdaya ayrılmış (telafi üretimi ayrı üretim olarak sayılıyor)
//   Satın alma — yolda / teslim alındı
//   Planlanmadı
//
// Sipariş miktarı, birim fiyat ve tutar her aşama satırında TEKRAR EDER (kalemin bilgisi) ama
// gruplama ve toplamda kalem başına BİR kez sayılır (`tekilAnahtar: "_kalemId"`); aşamaya özgü
// sayı `asamaMiktar` her satırda ayrı toplanır.
//
// Bir üretim aynı bedeni birden çok kalemle paylaşıyorsa (nadir) üretimdeki miktar kalemlere
// oranla bölünüyor. Teslim edilen adet stoktaki üretilmişten düşülüyor: sevk edilen çift depoda
// değildir — üretim kaydı onu "sağlam çıktı" olarak tutmaya devam eder.
const SIPARIS_RAPOR_ALANLARI = [
  // RESİM (kullanıcı, 12 Eylül: "raporları stok resimlerine ekleyelim; renk resmi varsa o, yoksa
  // kapak"). Sipariş kartıyla aynı kural (`renkResimleri[renk] || kapakResmi`). Aranmaz,
  // gruplanmaz, süzülmez; gruplamada ilk resim; Excel'e girmez.
  { anahtar: "resim", ad: "Resim", tip: "resim" },
  { anahtar: "siparisNo", ad: "Sipariş No", tip: "metin" },
  { anahtar: "tarih", ad: "Tarih", tip: "tarih" },
  { anahtar: "teslimTarihi", ad: "Teslim Tarihi", tip: "tarih" },
  { anahtar: "cari", ad: "Cari", tip: "metin" },
  { anahtar: "durum", ad: "Sipariş Durumu", tip: "metin", secenekler: ["Bekliyor", "Onaylandı", "Hazırlanıyor", "Kısmi Teslim", "Tamamlandı", "İptal"] },
  { anahtar: "musteriKodu", ad: "Müşteri Kodu", tip: "metin" },
  { anahtar: "urun", ad: "Ürün", tip: "metin" },
  { anahtar: "renk", ad: "Renk", tip: "metin" },
  // MATRİS: bedenler sütun, hücrede aşama miktarı (bkz. raporMatris).
  { anahtar: "beden", ad: "Beden", tip: "metin", matrisAlan: "beden", matrisDeger: "asamaMiktar", matrisAyrim: "asama" },
  { anahtar: "birim", ad: "Birim", tip: "metin" },
  { anahtar: "planlamaTipi", ad: "Planlama", tip: "metin", secenekler: ["Üretim", "Alış Siparişi", "Planlanmadı"] },
  { anahtar: "referans", ad: "Üretim / Alış No", tip: "metin" },
  // İKON (kullanıcı, 12 Eylül: "proses ikonları var, onları da yanında göster"): proses aşamalarında
  // tanımlardaki proses ikonu (`_proses`), diğer aşamalarda sabit ikon (ASAMA_IKONLARI).
  { anahtar: "asama", ad: "Aşama", tip: "metin", ikonAlani: "_proses" },
  { anahtar: "asamaMiktar", ad: "Aşama Miktarı", tip: "sayi" },
  // Kalem bazlı sayılar her aşama satırında tekrar eder; gruplama ve toplamda kalem başına BİR
  // kez sayılır (`tekilAnahtar`).
  { anahtar: "miktar", ad: "Sipariş Miktarı", tip: "sayi", tekilAnahtar: "_kalemId" },
  { anahtar: "karsilanan", ad: "Teslim Edilen", tip: "sayi", tekilAnahtar: "_kalemId" },
  { anahtar: "kalan", ad: "Kalan", tip: "sayi", tekilAnahtar: "_kalemId" },
  // Birim fiyat TOPLANMAZ: 16 satırın fiyatını alt alta toplamak anlamsız bir sayı veriyordu
  // (kullanıcının ekran görüntüsünde 2.505,50).
  { anahtar: "birimFiyat", ad: "Birim Fiyat", tip: "para", paraBirimiAlani: "paraBirimi", tekilAnahtar: "_kalemId", toplanmaz: true },
  // Tutarlar (kullanıcı, 12 Eylül: "tutara ek teslim edilen tutar, kalan tutar, sipariş tutarı").
  // Kalem bazlılar kalem başına bir kez, aşama tutarı her aşama satırında ayrı.
  { anahtar: "tutar", ad: "Sipariş Tutarı", tip: "para", paraBirimiAlani: "paraBirimi", tekilAnahtar: "_kalemId" },
  { anahtar: "teslimTutar", ad: "Teslim Edilen Tutar", tip: "para", paraBirimiAlani: "paraBirimi", tekilAnahtar: "_kalemId" },
  { anahtar: "kalanTutar", ad: "Kalan Tutar", tip: "para", paraBirimiAlani: "paraBirimi", tekilAnahtar: "_kalemId" },
  { anahtar: "asamaTutar", ad: "Aşama Tutarı", tip: "para", paraBirimiAlani: "paraBirimi" },
  { anahtar: "paraBirimi", ad: "P.B.", tip: "metin", secenekler: ["TRY", "USD", "EUR"] },
];

// "Saya'da", "Kesim'de", "Montaj'da": bulunma ekini ünlü uyumu ve ünsüz sertleşmesiyle takar.
// Aşama adı proses adından geliyor; her prosese elle ek yazılamaz.
function bulunmaEki(kelime) {
  const k = String(kelime || "").toLocaleLowerCase("tr-TR");
  const sonHarf = k.slice(-1);
  const sonUnlu = [...k].reverse().find((h) => "aeıioöuü".includes(h)) || "e";
  const kalin = "aıou".includes(sonUnlu);
  const sert = "fstkçşhp".includes(sonHarf);
  return `${kelime}'${sert ? "t" : "d"}${kalin ? "a" : "e"}`;
}

// Bir üretimin her BEDENİ için aşama dağılımı: [{ asama, beden, miktar }]. Akış hesabı üretim
// kartıyla AYNI yardımcılardan (`oncekiAdimdanMevcutBedenler`, `adimBedenDurumu`, `atamaSonucu`);
// ikinci bir akış mantığı yazılmadı — ikisi bir gün ayrışırdı.
function uretimAsamaDagilimi(u) {
  const bedenler = u.bedenMiktarlari || [];
  const adimlar = u.prosesIlerleme || [];
  const satirlar = [];
  // `proses`: aşamanın ait olduğu proses (ikon için); proses dışı aşamalarda boş.
  const ekle = (asama, beden, miktar, proses) => { if (miktar > 0) satirlar.push({ asama, beden, miktar: Math.round(miktar * 100) / 100, proses: proses || "" }); };
  const gercekAdimlar = adimlar.map((a, i) => ({ a, i })).filter(({ a }) => !a.araProsesMi);
  if (gercekAdimlar.length === 0) {
    // Proses tanımlı olmayan (eski) üretim: ya stoğa eklendi ya bekliyor.
    bedenler.forEach((bm) => ekle(u.stogaEklendiMi ? "Üretildi (stokta)" : "Üretim bekliyor", bm.beden, bm.miktar));
    return satirlar;
  }
  gercekAdimlar.forEach(({ a: adim, i }) => {
    const mevcut = oncekiAdimdanMevcutBedenler(adimlar, i, bedenler);
    const durum = adimBedenDurumu(adim, bedenler, i > 0 ? mevcut : null);
    durum.forEach((d) => ekle(`${adim.proses} bekliyor`, d.beden, d.kalan, adim.proses));
    bedenler.forEach((bm) => {
      const calisiyor = (adim.atamalar || []).filter((x) => !x.tamamlandiMi)
        .reduce((t, x) => t + ((x.bedenMiktarlari || {})[bm.beden] || 0), 0);
      ekle(bulunmaEki(adim.proses), bm.beden, calisiyor, adim.proses);
      const hurda = (adim.atamalar || []).filter((x) => x.tamamlandiMi)
        .reduce((t, x) => t + atamaSonucu(x).hurda.filter((h) => h.beden === bm.beden).reduce((tt, h) => tt + (h.miktar || 0), 0), 0);
      ekle("Hurda", bm.beden, hurda);
    });
  });
  // Son gerçek prosesten SAĞLAM çıkan = üretildi. `oncekiAdimdanMevcutBedenler` "sonraki adıma
  // akan"ı hesapladığı için son adımın bir ötesine soruluyor.
  const son = gercekAdimlar[gercekAdimlar.length - 1];
  const ciktilar = oncekiAdimdanMevcutBedenler(adimlar, son.i + 1, bedenler);
  bedenler.forEach((bm) => ekle("Üretildi (stokta)", bm.beden, ciktilar[bm.beden] || 0));
  return satirlar;
}

function siparisRaporSatirlari(siparisler, cariler, tip, uretimler, stok) {
  const cariAd = (id) => ((cariler || []).find((c) => c.id === id) || {}).unvan || "";
  const resimBul = (urunId, renk) => {
    const u = (stok || []).find((x) => x.id === urunId);
    return u ? (((u.renkResimleri || {})[renk] || u.kapakResmi) || "") : "";
  };
  const uretimBul = (no) => (uretimler || []).filter((u) => u.siparisNo === no || u.hurdaKaynakUretimNo === no);
  const alisBul = (no) => (siparisler || []).find((s) => s.tip === "Alış" && s.siparisNo === no);
  return (siparisler || [])
    .filter((s) => !tip || s.tip === tip)
    .flatMap((s) => (s.kalemler || []).flatMap((k) => {
      const miktar = rSayi(k.miktar), karsilanan = rSayi(k.karsilanan);
      const kalan = Math.max(0, Math.round((miktar - karsilanan) * 100) / 100);
      const planTip = k.planlama ? (k.planlama.tip === "Üretim" ? "Üretim" : "Alış Siparişi") : "Planlanmadı";
      const temel = {
        _kalemId: k.id || `${s.id}|${k.urunId}|${k.renk}|${k.beden}`,
        resim: resimBul(k.urunId, k.renk || ""),
        siparisNo: s.siparisNo || "", tarih: s.tarih || "", teslimTarihi: s.teslimTarihi || "",
        cari: cariAd(s.cariId), durum: s.durum || "", musteriKodu: s.musteriKodu || "",
        urun: k.urunAd || "", renk: k.renk || "", beden: k.beden || "", birim: k.birim || "",
        planlamaTipi: planTip, referans: (k.planlama && k.planlama.referansNo) || "",
        miktar, karsilanan, kalan,
        birimFiyat: rSayi(k.birimFiyat), tutar: Math.round(miktar * rSayi(k.birimFiyat) * 100) / 100,
        teslimTutar: Math.round(karsilanan * rSayi(k.birimFiyat) * 100) / 100,
        kalanTutar: Math.round(kalan * rSayi(k.birimFiyat) * 100) / 100,
        paraBirimi: k.paraBirimi || "TRY",
      };
      const asamalar = [];
      if (karsilanan > 0) asamalar.push({ asama: s.tip === "Alış" ? "Teslim alındı" : "Teslim edildi", miktar: karsilanan });
      if (s.tip === "Alış") {
        if (kalan > 0) asamalar.push({ asama: "Bekleniyor (yolda)", miktar: kalan });
      } else if (planTip === "Planlanmadı") {
        if (kalan > 0) asamalar.push({ asama: "Planlanmadı", miktar: kalan });
      } else if (planTip === "Alış Siparişi") {
        const alis = alisBul(k.planlama.referansNo);
        const ak = alis && (alis.kalemler || []).find((x) => x.urunId === k.urunId && (x.renk || "") === (k.renk || "") && (x.beden || "") === (k.beden || ""));
        const alinan = ak ? Math.min(kalan, Math.max(0, rSayi(ak.karsilanan))) : 0;
        if (alinan > 0) asamalar.push({ asama: "Alış fişi kesildi", miktar: alinan });
        if (kalan - alinan > 0) asamalar.push({ asama: "Alış siparişinde (yolda)", miktar: Math.round((kalan - alinan) * 100) / 100 });
      } else {
        // ÜRETİM: üretimin bu bedene ait aşama dağılımı, kalemin payına oranlanıp yazılıyor.
        const uler = uretimBul(k.planlama.referansNo);
        const dagilim = uler.flatMap((u) => uretimAsamaDagilimi(u)).filter((d) => d.beden === (k.beden || ""));
        const uretimBeden = uler.reduce((t, u) => t + (u.bedenMiktarlari || []).filter((bm) => bm.beden === (k.beden || "")).reduce((tt, bm) => tt + rSayi(bm.miktar), 0), 0);
        const oran = uretimBeden > 0 ? Math.min(1, miktar / uretimBeden) : 1;
        let dusulecek = karsilanan; // teslim edilen çift stokta değil
        dagilim.forEach((d) => {
          let m = Math.round(d.miktar * oran * 100) / 100;
          if (d.asama === "Üretildi (stokta)" && dusulecek > 0) { const dus = Math.min(m, dusulecek); m -= dus; dusulecek -= dus; }
          if (m > 0) asamalar.push({ asama: d.asama, miktar: Math.round(m * 100) / 100, proses: d.proses });
        });
        if (dagilim.length === 0 && kalan > 0) asamalar.push({ asama: "Üretim bekliyor", miktar: kalan });
      }
      if (asamalar.length === 0) asamalar.push({ asama: "—", miktar: 0 });
      return asamalar.map((a) => ({ ...temel, asama: a.asama, asamaMiktar: a.miktar, asamaTutar: Math.round(a.miktar * rSayi(k.birimFiyat) * 100) / 100, _proses: a.proses || "" }));
    }));
}

// ---- SİPARİŞİN HAZIR ÜRÜNLERİ — satış fişi için --------------------------------------------------
//
// Kullanıcı (12 Eylül): "Bu ekrana (Stok Çıkışı) siparişin hazır ürünlerini getirecek bir bölüm
// olsun; üretilmiş veya tedarik edilmiş ürünler listelensin, oradan satış yapılsın."
//
// Aşama bölünmesinden (`siparisRaporSatirlari`) yalnız İKİ aşama "hazır" sayılıyor: "Üretildi
// (stokta)" ve "Satın alma — teslim alındı". Kesimde bekleyen ya da yolda olan hazır değildir.
// Aynı hesap: raporun "üretildi" dediği ile fişin "hazır" dediği bir gün ayrışmasın.
//
// `stokta`: o renk/bedenin gerçek depo miktarı. Hazır sayısı üretim kaydından, stok sayısı
// depodan geliyor; ikisi tutmuyorsa (stoğa girmemiş üretim, başka siparişe verilmiş mal) ekran
// bunu ⚠ ile söylüyor — sessizce küçüğünü almak, kullanıcıya "hazır" deyip fişe eksik yazmak olurdu.
function siparisHazirKalemleri(siparis, tumSiparisler, uretimler, stok) {
  if (!siparis) return [];
  const satirlar = siparisRaporSatirlari([siparis, ...(tumSiparisler || []).filter((s) => s.id !== siparis.id)], [], siparis.tip, uretimler)
    .filter((r) => r.siparisNo === siparis.siparisNo);
  return (siparis.kalemler || []).map((k) => {
    const kalemId = k.id || `${siparis.id}|${k.urunId}|${k.renk}|${k.beden}`;
    const benim = satirlar.filter((r) => r._kalemId === kalemId);
    const hazir = Math.round(benim
      .filter((r) => r.asama === "Üretildi (stokta)" || r.asama === "Alış fişi kesildi")
      .reduce((t, r) => t + r.asamaMiktar, 0) * 100) / 100;
    const kalan = Math.max(0, Math.round((rSayi(k.miktar) - rSayi(k.karsilanan)) * 100) / 100);
    const urun = (stok || []).find((u) => u.id === k.urunId);
    const varyant = urun && (urun.variants || []).find((v) => (v.renk || "") === (k.renk || "") && (v.beden || "") === (k.beden || ""));
    const kaynak = benim.some((r) => r.asama === "Alış fişi kesildi") ? "Alış fişi" : (hazir > 0 ? "Üretildi" : "");
    return {
      kalemId, urunId: k.urunId, urunAd: k.urunAd || (urun && urun.ad) || "", renk: k.renk || "", beden: k.beden || "",
      kalan, hazir: Math.min(hazir, kalan), stokta: varyant ? rSayi(varyant.miktar) : 0, kaynak,
    };
  }).filter((h) => h.hazir > 0);
}
