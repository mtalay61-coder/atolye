// =============================================================================================
// MAMUL RENKLERİ KODLU (v1.717.0 — kullanıcı, 24 Ekim: "teklifte yeni renk ekleyince model renginden renk ekliyor ve
// renk kodunu da aynı satıra yazıyor; siparişte ve başka renk eklerken durum böyle değil, burada mantık hatası var —
// teklifteki durum doğru aslında, ya bu durumdan devam edelim ya diğer durumdan" → "İKİSİNİ DE YAP")
//
// İKİ KURAL ÇARPIŞIYORDU: sipariş/teklif formunun "Renk" paneli her rengi MODEL RENGİ olarak açıyordu ("1058 - Taba
// Süet": Tanımlar'da kodlu kombinasyon + ürün varyantı bu etiketle), ürün kartı ve stok formu ise tek rengi DÜZ ADLA
// ("Taba Süet") ekliyordu; kod ancak iki ve daha fazla renkli model renginde veriliyordu. Aynı ürünün renkleri yarı kodlu
// yarı düz kalıyor, barkod (077 `modelRengiTanimiBul` kodu etiketten okur), reçete pozisyonu ve asorti kodlu biçimi esas
// aldığı için düz adlılar "başka renk" sayılıyordu.
//
// KARAR (kullanıcı): kodlu biçim her yerde. Mamul ürüne eklenen HER renk — tek renk de — Tanımlar'da 1 renkli bir model
// rengi (kombinasyon) olur ve ürüne "KOD - Ad" etiketiyle yazılır. Hammadde renkleri değişmez (düz ad, kendi kodu).
// Mevcut kodsuz mamul renkleri Tanımlar › Bakım'daki araçla, kullanıcı onayıyla, bütün kayıtlarda yeniden adlandırılır.
//
// Buradaki üç yardımcı SAF: ne state okur ne yazar; birim testi `birim-mamul-renk-kodlama`.
// =============================================================================================

const MAMUL_RENK_YER_TUTUCU = new Set(["", "Standart"]);
const _adNrm = (x) => String(x || "").trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");

// Verilen renk adları için Tanımlar'da renk + 1 renkli model rengi (kombinasyon) HAZIRLAR; var olanı kullanır, olmayanı
// açar. Kodlar: renk kodu `yeniRenkKaydet` kuralıyla (renk + kombinasyon kodlarının birleşiminden boş olan ilk sayı,
// 101'den), kombinasyon kodu `kombinasyonOlusturGlobal` kuralıyla (1001'den). Zaten "KOD - Ad" biçimindeki ad olduğu gibi
// döner. Döner: { tanimlar, etiketler: { ad → "KOD - Ad" }, degisti, acilanRenkler, acilanKombinasyonlar }.
// `secenek.renkKodlari`: { ad → "#hex" } — yeni açılan rengin görünüm rengi (ürün kartındaki "renk aç" sorusundan).
function mamulRenkKodlamaPlani(tanimlar, adlar, secenek = {}) {
  const uidUret = secenek.uidUret || ((onek) => `${onek}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const renkKodlari = secenek.renkKodlari || {};
  let renkler = [...((tanimlar && tanimlar.renkler) || [])];
  let kombiler = [...((tanimlar && tanimlar.renkKombinasyonlari) || [])];
  const etiketler = {};
  const acilanRenkler = [];
  const acilanKombinasyonlar = [];
  const kombiEtiketi = (k) => `${k.kod} - ${(k.renkIdler || []).map((id) => ((renkler.find((r) => r.id === id) || {}).ad || "?")).join("/")}`;
  const kullanilanKodlar = () => new Set([...renkler.map((r) => parseInt(r.kod, 10)), ...kombiler.map((k) => parseInt(k.kod, 10))].filter((n) => !isNaN(n)));
  (adlar || []).forEach((hamAd) => {
    const ad = String(hamAd || "").trim();
    if (!ad || MAMUL_RENK_YER_TUTUCU.has(ad) || etiketler[ad] !== undefined) return;
    if (kombinasyonEtiketiFormatindaMi(ad)) { etiketler[ad] = ad; return; }
    let renk = renkler.find((r) => _adNrm(r.ad) === _adNrm(ad));
    if (!renk) {
      const kullanilan = kullanilanKodlar();
      const renkKodlariSayi = renkler.map((r) => parseInt(r.kod, 10)).filter((n) => !isNaN(n));
      let sonraki = (renkKodlariSayi.length > 0 ? Math.max(...renkKodlariSayi) : 100) + 1;
      while (kullanilan.has(sonraki)) sonraki += 1;
      renk = { id: uidUret("renk"), ad, tip: "Hammadde", renkKodu: renkKodlari[ad] || "#C9B99A", kod: String(sonraki), malzemeTipleri: [] };
      renkler.push(renk); acilanRenkler.push(renk);
    }
    let kombi = kombiler.find((k) => (k.renkIdler || []).length === 1 && k.renkIdler[0] === renk.id);
    if (!kombi) {
      const kombiKodlari = kombiler.filter((k) => /^\d+$/.test(k.kod || "")).map((k) => parseInt(k.kod, 10));
      let sonraki = (kombiKodlari.length > 0 ? Math.max(...kombiKodlari) : 1000) + 1;
      const kullanilan = kullanilanKodlar();
      while (kullanilan.has(sonraki)) sonraki += 1;
      kombi = { id: uidUret("kombi"), kod: String(sonraki), renkIdler: [renk.id] };
      kombiler.push(kombi); acilanKombinasyonlar.push(kombi);
    }
    etiketler[ad] = kombiEtiketi(kombi);
  });
  const degisti = acilanRenkler.length > 0 || acilanKombinasyonlar.length > 0;
  return {
    tanimlar: degisti ? { ...tanimlar, renkler, renkKombinasyonlari: kombiler } : tanimlar,
    etiketler, degisti, acilanRenkler, acilanKombinasyonlar,
  };
}

// Mamul ürünlerde kodsuz (düz adlı) renkler — Bakım aracının ön izlemesi. Döner: [{ urunId, urunAd, renk }], ürün sırasıyla.
function kodsuzMamulRenkleri(stok) {
  const sonuc = [];
  (stok || []).forEach((p) => {
    if (!p || p.kategori !== "Mamul") return;
    const gorulen = new Set();
    (p.variants || []).forEach((v) => {
      const renk = String((v && v.renk) || "").trim();
      if (MAMUL_RENK_YER_TUTUCU.has(renk) || kombinasyonEtiketiFormatindaMi(renk) || gorulen.has(renk)) return;
      gorulen.add(renk);
      sonuc.push({ urunId: p.id, urunAd: p.ad, renk });
    });
  });
  return sonuc;
}

// Mamul ürün bazında renk etiketini bütün kayıtlarda değiştirir — SAF. `eslesmeler`: [{ urunId, eski, yeni }].
// 082 `hammaddeRenkAdDegistir`in dokunduğu yerlerin ürüne kısıtlı sürümü: varyant, renk resmi, stok hareketi, harici
// barkod, reçetede mamulRenk (bu ürünün reçetesi), sipariş kalemi (urunId), üretim kaydı (urunId), koli kalemi (urunId),
// teklif kalemi (urunId; 326). Hammadde rezervasyonları hammadde rengi taşır, dokunulmaz. Eşleştirme büyük/küçük harf ve
// boşluk farkını yok sayar. Döner: { stok, siparisler, uretim, koliler, teklifler, sayilar: { urun, kalem, uretim, koli, teklif } }
// — değişmeyen liste aynı referans (çağıran yalnız değişeni yazar).
function mamulRenkleriniYenidenAdlandir(veri, eslesmeler) {
  const harita = new Map();   // urunId → Map(nrm(eski) → yeni)
  (eslesmeler || []).forEach((e) => {
    if (!e || !e.urunId || !e.eski || !e.yeni || e.eski === e.yeni) return;
    if (!harita.has(e.urunId)) harita.set(e.urunId, new Map());
    harita.get(e.urunId).set(_adNrm(e.eski), e.yeni);
  });
  const yeniAd = (urunId, renk) => { const m = harita.get(urunId); return m ? m.get(_adNrm(renk)) : undefined; };
  const sayilar = { urun: 0, kalem: 0, uretim: 0, koli: 0, teklif: 0 };
  let stokDegisti = false;
  const stok = (veri.stok || []).map((p) => {
    const m = p && harita.get(p.id);
    if (!m) return p;
    let degisti = false;
    const variants = (p.variants || []).map((v) => { const y = yeniAd(p.id, v.renk); if (!y) return v; degisti = true; return { ...v, renk: y }; });
    let renkResimleri = p.renkResimleri;
    if (renkResimleri) {
      const yeniR = {};
      Object.entries(renkResimleri).forEach(([k, g]) => { const y = yeniAd(p.id, k); if (y) degisti = true; yeniR[y || k] = g; });
      renkResimleri = yeniR;
    }
    const hareketler = (p.hareketler || []).map((h) => { const y = yeniAd(p.id, h.renk); if (!y) return h; degisti = true; return { ...h, renk: y }; });
    const hariciBarkodlar = Array.isArray(p.hariciBarkodlar)
      ? p.hariciBarkodlar.map((h) => { const y = yeniAd(p.id, h.renk); if (!y) return h; degisti = true; return { ...h, renk: y }; })
      : p.hariciBarkodlar;
    const recete = (p.recete || []).map((r) => { const y = yeniAd(p.id, r.mamulRenk); if (!y) return r; degisti = true; return { ...r, mamulRenk: y }; });
    if (!degisti) return p;
    sayilar.urun++; stokDegisti = true;
    return { ...p, variants, renkResimleri, hareketler, recete, ...(Array.isArray(p.hariciBarkodlar) ? { hariciBarkodlar } : {}) };
  });
  let sipDegisti = false;
  const siparisler = (veri.siparisler || []).map((s) => {
    let degisti = false;
    const kalemler = (s.kalemler || []).map((k) => { const y = yeniAd(k.urunId, k.renk); if (!y) return k; degisti = true; sayilar.kalem++; return { ...k, renk: y }; });
    if (!degisti) return s;
    sipDegisti = true;
    return { ...s, kalemler };
  });
  let uretimDegisti = false;
  const uretim = (veri.uretim || []).map((u) => {
    const y = u && yeniAd(u.urunId, u.renk);
    if (!y) return u;
    uretimDegisti = true; sayilar.uretim++;
    return { ...u, renk: y };
  });
  let koliDegisti = false;
  const koliler = (veri.koliler || []).map((k) => {
    let degisti = false;
    const kalemler = (k.kalemler || []).map((x) => { const y = yeniAd(x.urunId, x.renk); if (!y) return x; degisti = true; sayilar.koli++; return { ...x, renk: y }; });
    if (!degisti) return k;
    koliDegisti = true;
    return { ...k, kalemler };
  });
  let teklifDegisti = false;
  const teklifler = (veri.teklifler || []).map((t) => {
    let degisti = false;
    const kalemler = (t.kalemler || []).map((k) => { const y = yeniAd(k.urunId, k.renk); if (!y) return k; degisti = true; sayilar.teklif++; return { ...k, renk: y }; });
    if (!degisti) return t;
    teklifDegisti = true;
    return { ...t, kalemler };
  });
  return {
    stok: stokDegisti ? stok : veri.stok, siparisler: sipDegisti ? siparisler : veri.siparisler,
    uretim: uretimDegisti ? uretim : veri.uretim, koliler: koliDegisti ? koliler : veri.koliler,
    teklifler: teklifDegisti ? teklifler : veri.teklifler, sayilar,
  };
}
