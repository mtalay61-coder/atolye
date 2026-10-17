// ================= ÜRETİM FİŞLERİ → GELİR/GİDER KARTI (v1.692) =================
//
// Kullanıcı: "Üretim fişleri gelir giderden bağlanması gerekiyor, rapor alırken karşılık olarak denge
// sağlanması için. Kesim için yapılan işçiliği kesim işçiliği giderine bağlayacağız, hangi prosesin hangi
// gidere bağlanacağı seçilecek. Üretim hammadde çıkışı da bir gidere bağlanmalı — boşa giden hiçbir fiş
// olmaması gerekir."
//
// BAĞ TANIMDA, FİŞTE DEĞİL: `tanimlar.prosesGiderKartlari` { [proses adı]: kartId } ve
// `tanimlar.hammaddeCikisGiderKartId`. Fişlere kart kimliği YAZILMAZ — bağ sonradan kurulsa da değişse de
// geçmiş fişler hemen doğru karta düşer (bölüm maaşının `bolumId` ile bağlanması gibi, 015 maasGiderKarti).
//
// İŞÇİLİK: proses `-<Proses>-İşçilik` fiş ekinden okunur (hareket proses alanı taşımıyor). Bağlı işçilik
// Kâr/Zarar'da "Üretim işçiliği" satırından çıkıp kartın grubunda gider olarak görünür — çift sayım yok.
//
// HAMMADDE ÇIKIŞI: üretimde tüketilen hammadde (stok hareketi, kaynak "Üretim", eksi miktar; iade artı) ×
// hammadde birim fiyatı (maliyetle aynı `hammaddeBirimFiyati`). Kartın ekstresinde ve toplamında görünür;
// Kâr/Zarar'a AYRICA eklenmez: satılan malın maliyeti (SMM) bu hammaddeyi zaten içeriyor, eklemek iki kez
// düşmek olurdu. Kart "karşılık"tır: tüketim nereye gitti sorusunun cevabı.

// ANA + ARA PROSESLER (v1.694, kullanıcı: "ara proseslere de aynı şekilde olması gerekli"): ara proses işçiliği de
// `<sipariş>-<AraProses>-İşçilik` fişiyle yazılır; aynı bağ tablosu (prosesGiderKartlari) ikisini de tutar.
function tumProsesTanimlari(tanimlar) {
  return [...((tanimlar && tanimlar.prosesler) || []), ...((tanimlar && tanimlar.araProsesler) || [])];
}
function iscilikFisProsesi(fisNo, prosesler) {
  const f = String(fisNo || "");
  if (!/-İşçilik$/.test(f)) return "";
  const govde = f.slice(0, -"-İşçilik".length);
  // En uzun eşleşen proses adı (ör. "Üste ve Temizleme" ile "Temizleme" ikisi de tanımlıysa uzunu).
  const adaylar = (prosesler || []).map((p) => p.ad || p).filter(Boolean).sort((a, b) => b.length - a.length);
  const bulunan = adaylar.find((ad) => govde.endsWith(`-${ad}`));
  if (bulunan) return bulunan;
  const i = govde.lastIndexOf("-");
  return i >= 0 ? govde.slice(i + 1) : "";
}
function iscilikGiderKarti(tanimlar, h) {
  const proses = iscilikFisProsesi(h && h.fisNo, tumProsesTanimlari(tanimlar));
  const id = proses && ((tanimlar && tanimlar.prosesGiderKartlari) || {})[proses];
  return (id && ((tanimlar && tanimlar.giderKartlari) || []).find((k) => k.id === id)) || null;
}
function hammaddeCikisGiderKarti(tanimlar) {
  const id = tanimlar && tanimlar.hammaddeCikisGiderKartId;
  return (id && ((tanimlar && tanimlar.giderKartlari) || []).find((k) => k.id === id)) || null;
}
// Bağa bakmadan bütün üretim işçiliği cari hareketleri (maaş hariç) — karşılıksız sayımı ve kart ekstresi için.
function uretimIscilikHareketleri(cariler) {
  const l = [];
  (cariler || []).forEach((c) => (c.hareketler || []).forEach((h) => {
    if (h.fisNo && /-İşçilik$/.test(h.fisNo)) l.push({ ...h, cariUnvan: c.unvan });
  }));
  return l;
}
// Üretim hammadde çıkışları — fiş başına bir satır (tutar TL). Mamul girişi (-Giriş) sayılmaz.
function uretimHammaddeCikislari(stok, kurlar) {
  const fisler = {};
  (stok || []).forEach((p) => {
    if (p.kategori === "Mamul") return;
    (p.hareketler || []).forEach((h) => {
      if (h.kaynak !== "Üretim" || !h.fisNo || /-Giriş$/.test(h.fisNo)) return;
      const m = -(parseFloat(h.miktar) || 0);
      if (!m) return;
      let tl = 0;
      try { tl = (hammaddeBirimFiyati(p, h.renk, h.beden, kurlar || {}) || {}).tl || 0; } catch (e) { tl = 0; }
      const f = fisler[h.fisNo] || (fisler[h.fisNo] = { fisNo: h.fisNo, tarih: String(h.tarih || "").slice(0, 10), tutar: 0, kalem: 0, siparisNo: h.siparisNo });
      f.tutar += m * tl;
      f.kalem += 1;
    });
  });
  return Object.values(fisler);
}
// Kartın üretim karşılıkları — 396 kart ekstresine eklenir (yon Çıkış = gider).
function kartUretimHareketleri(tanimlar, cariler, stok, kurlar, kartId) {
  const liste = [];
  uretimIscilikHareketleri(cariler).forEach((h) => {
    const k = iscilikGiderKarti(tanimlar, h);
    if (k && k.id === kartId) liste.push({ ...h, yon: "Çıkış", paraBirimi: h.paraBirimi || "TRY", hesapAd: `İşçilik tahakkuku · ${h.cariUnvan}`, uretimKarsiligi: true });
  });
  stokKartHareketleri(tanimlar, stok, kurlar, kartId).forEach((h) => liste.push(h));
  const hk = hammaddeCikisGiderKarti(tanimlar);
  if (hk && hk.id === kartId) {
    uretimHammaddeCikislari(stok, kurlar).forEach((f) => liste.push({ id: `uhc-${f.fisNo}`, fisNo: f.fisNo, tarih: f.tarih, tutar: Math.round(f.tutar * 100) / 100,
      yon: "Çıkış", paraBirimi: "TRY", hesapAd: `Hammadde çıkışı · ${f.kalem} kalem`, aciklama: `Üretim ${f.siparisNo || ""} hammadde tüketimi`, uretimKarsiligi: true }));
  }
  return liste;
}
// Karşılığı olmayan üretim fişleri (bağ kurulmamış).
function karsiliksizUretimFisleri(tanimlar, cariler, stok, kurlar) {
  const iscilik = uretimIscilikHareketleri(cariler).filter((h) => !iscilikGiderKarti(tanimlar, h));
  const prosesler = Array.from(new Set(iscilik.map((h) => iscilikFisProsesi(h.fisNo, tumProsesTanimlari(tanimlar))).filter(Boolean)));
  const hammadde = hammaddeCikisGiderKarti(tanimlar) ? [] : uretimHammaddeCikislari(stok, kurlar);
  const kv = (id) => id && ((tanimlar && tanimlar.giderKartlari) || []).some((k) => k.id === id);
  const manuel = stokManuelFisleri(stok, kurlar);
  const stokSayisi = manuel.filter((f) => (f.giris > 0 && !kv(tanimlar && tanimlar.stokGirisGelirKartId)) || (f.cikis > 0 && !kv(tanimlar && tanimlar.stokCikisGiderKartId))).length;
  return { iscilikSayisi: iscilik.length, prosesler, hammaddeSayisi: hammadde.length, stokSayisi };
}

// Gelir/Gider ekranındaki bağlantı paneli.
function UretimGiderBaglari({ tanimlar, onSave, cariler, stok, kurlar }) {
  const kartlar = (tanimlar && tanimlar.giderKartlari) || [];
  const giderKartlari = kartlar.filter((k) => (k.tur || "gider") !== "gelir");
  const bag = (tanimlar && tanimlar.prosesGiderKartlari) || {};
  // Hem tanımlı prosesler hem işçilik fişlerinde geçen (tanımdan silinmiş olabilir) prosesler.
  const fisProsesleri = uretimIscilikHareketleri(cariler).map((h) => iscilikFisProsesi(h.fisNo, tumProsesTanimlari(tanimlar))).filter(Boolean);
  const prosesler = Array.from(new Set([...tumProsesTanimlari(tanimlar).map((p) => p.ad).filter(Boolean), ...fisProsesleri]));
  const eksik = karsiliksizUretimFisleri(tanimlar, cariler, stok, kurlar);
  const secici = (deger, onDegis, veri, gelirMi) => (
    <select value={deger || ""} data-uretim-gider-bag={veri} onChange={(e) => onDegis(e.target.value)}
      style={{ ...inputStyle, width: 220, fontSize: 12, borderColor: deger ? "var(--erp-line)" : "var(--erp-warn)" }}>
      <option value="">— bağlı değil —</option>
      {(gelirMi ? kartlar.filter((k) => (k.tur || "gider") === "gelir") : giderKartlari).map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
    </select>
  );
  return (
    <div data-uretim-gider-baglari style={{ border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", padding: 12, marginBottom: 14, background: "#fff" }}>
      <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: "0 0 4px" }}>Üretim fişlerinin gider karşılığı</h3>
      <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 10px", lineHeight: 1.5 }}>
        Her prosesin işçilik fişi ve üretimde çıkan hammadde bir gider kartına bağlanır; kart ekstresinde ve toplamında görünür.
        Bağ geçmiş fişler için de geçerlidir. Bağlı işçilik Kâr/Zarar'da kartın grubunda gider olarak sayılır; hammadde çıkışı
        satılan malın maliyeti içinde olduğundan Kâr/Zarar'a ikinci kez eklenmez.
      </p>
      {(eksik.iscilikSayisi > 0 || eksik.hammaddeSayisi > 0 || eksik.stokSayisi > 0) && (
        <div data-karsiliksiz-uretim style={{ padding: "6px 10px", marginBottom: 10, borderRadius: "var(--erp-r-md)", border: "1.5px solid var(--erp-warn)", background: "var(--erp-orange-bg)", color: "var(--erp-warn)", fontSize: 12, fontWeight: 600 }}>
          ⚠ Karşılığı olmayan fiş: {eksik.iscilikSayisi > 0 ? `${eksik.iscilikSayisi} işçilik (${eksik.prosesler.join(", ")})` : ""}
          {eksik.iscilikSayisi > 0 && eksik.hammaddeSayisi > 0 ? " · " : ""}{eksik.hammaddeSayisi > 0 ? `${eksik.hammaddeSayisi} hammadde çıkışı` : ""}{eksik.stokSayisi > 0 ? ` · ${eksik.stokSayisi} stok giriş/çıkış fişi` : ""}
        </div>
      )}
      {giderKartlari.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--erp-text-3)" }}>Önce aşağıdan gider kartı ekleyin (ör. "Kesim işçiliği", "Üretim hammadde gideri").</div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {prosesler.map((p) => (
            <div key={p} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ width: 180, fontSize: 13, fontWeight: 600 }}>{p} işçiliği →</span>
              {secici(bag[p], (v) => onSave({ ...tanimlar, prosesGiderKartlari: { ...bag, [p]: v || undefined } }), p)}
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4, paddingTop: 6, borderTop: "1px solid var(--erp-line-soft)" }}>
            <span style={{ width: 180, fontSize: 13, fontWeight: 600 }}>Üretim hammadde çıkışı →</span>
            {secici(tanimlar && tanimlar.hammaddeCikisGiderKartId, (v) => onSave({ ...tanimlar, hammaddeCikisGiderKartId: v || null }), "hammadde-cikisi")}
          </div>
          {/* BAĞIMSIZ STOK GİRİŞ/ÇIKIŞ (v1.694): bütün ürünler tek gelir ve tek gider kartına. */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ width: 180, fontSize: 13, fontWeight: 600 }}>Stok girişi (bağımsız) →</span>
            {secici(tanimlar && tanimlar.stokGirisGelirKartId, (v) => onSave({ ...tanimlar, stokGirisGelirKartId: v || null }), "stok-girisi", true)}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ width: 180, fontSize: 13, fontWeight: 600 }}>Stok çıkışı (bağımsız) →</span>
            {secici(tanimlar && tanimlar.stokCikisGiderKartId, (v) => onSave({ ...tanimlar, stokCikisGiderKartId: v || null }), "stok-cikisi")}
          </div>
        </div>
      )}
    </div>
  );
}

// OTOMATİK KART (v1.693, kullanıcı: "gider kartlarını otomatik oluştur prosesler için, bunu tanımlar prosese ekle").
// Bağı olmayan (ya da bağlı kartı silinmiş) her prosese "<Proses> işçiliği" kartı: aynı adlı kart varsa o bağlanır,
// yoksa Üretim grubunda açılır. Hammadde çıkışı için "Üretim hammadde gideri". Kullanıcının elle kurduğu bağa
// dokunulmaz. Değişiklik yoksa AYNI nesne döner (çağıran yazıp yazmayacağını buna bakarak bilir).
function prosesKartAdi(proses) { return `${proses} işçiliği`; }
function prosesGiderKartlariniTamamla(tanimlar) {
  const prosesler = Array.from(new Set(tumProsesTanimlari(tanimlar).map((p) => p.ad).filter(Boolean)));
  if (!prosesler.length) return tanimlar;
  let kartlar = tanimlar.giderKartlari || [];
  const bag = { ...(tanimlar.prosesGiderKartlari || {}) };
  let hamId = tanimlar.hammaddeCikisGiderKartId || null;
  let degisti = false;
  const gruplar = giderGelirGruplari(tanimlar);
  const grup = gruplar.find((g) => g.key === "uretim") || gruplar.find((g) => g.tur !== "gelir") || gruplar[0] || { key: "uretim", tur: "gider", tdhp: "730" };
  const kartBulAc = (ad) => {
    const var_ = kartlar.find((k) => kodEsit(k.ad, ad));
    if (var_) return var_.id;
    const yeni = { id: uid("gkart"), ad, grup: grup.key, tur: grup.tur, tdhp: grup.tdhp };
    kartlar = [...kartlar, yeni];
    return yeni.id;
  };
  prosesler.forEach((p) => {
    if (bag[p] && kartlar.some((k) => k.id === bag[p])) return;
    bag[p] = kartBulAc(prosesKartAdi(p));
    degisti = true;
  });
  if (!hamId || !kartlar.some((k) => k.id === hamId)) { hamId = kartBulAc("Üretim hammadde gideri"); degisti = true; }
  // Bağımsız stok giriş/çıkış kartları (v1.694): giriş "Diğer gelir" grubunda gelir kartı.
  let sgId = tanimlar.stokGirisGelirKartId || null, scId = tanimlar.stokCikisGiderKartId || null;
  if (!sgId || !kartlar.some((k) => k.id === sgId)) {
    const gg = gruplar.find((g) => g.tur === "gelir") || { key: "gelir", tur: "gelir", tdhp: "649" };
    const var_ = kartlar.find((k) => kodEsit(k.ad, "Stok girişi (sayım fazlası)"));
    if (var_) sgId = var_.id; else { const y = { id: uid("gkart"), ad: "Stok girişi (sayım fazlası)", grup: gg.key, tur: gg.tur, tdhp: gg.tdhp }; kartlar = [...kartlar, y]; sgId = y.id; }
    degisti = true;
  }
  if (!scId || !kartlar.some((k) => k.id === scId)) { scId = kartBulAc("Stok çıkışı (fire / sayım eksiği)"); degisti = true; }
  return degisti ? { ...tanimlar, giderKartlari: kartlar, prosesGiderKartlari: bag, hammaddeCikisGiderKartId: hamId, stokGirisGelirKartId: sgId, stokCikisGiderKartId: scId } : tanimlar;
}

// Sistemin kendiliğinden açtığı kart mı (proses işçiliği, hammadde çıkışı, bölüm)?
function otomatikGiderKartiMi(tanimlar, k) {
  if (!k) return false;
  if (k.bolumId) return true;
  if (tanimlar && [tanimlar.hammaddeCikisGiderKartId, tanimlar.stokGirisGelirKartId, tanimlar.stokCikisGiderKartId].includes(k.id)) return true;
  return Object.values((tanimlar && tanimlar.prosesGiderKartlari) || {}).includes(k.id);
}

// ================= BAĞIMSIZ STOK GİRİŞ / ÇIKIŞ → GELİR / GİDER KARTI (v1.694) =================
// Kullanıcı: "Stok çıkış ve girişini de gelir gidere bağlayalım; 100 farklı ürün girişi ve çıkışı olduğunda tek gelir
// ve gider olarak yazabiliriz." Bağımsız Stok Girişi/Çıkışı (MNL- fişi; sayım fazlası/eksiği, fire, numune) cari
// karşılığı olmayan tek stok hareketidir. Ürün ne olursa olsun hepsi TEK karta: girişler `stokGirisGelirKartId`
// (gelir), çıkışlar `stokCikisGiderKartId` (gider). Tutar = miktar × birim fiyat (maliyetle aynı `hammaddeBirimFiyati`).
// Açılış (ACILIS-) devirdir, gelir/gider değildir — sayılmaz. Bunlar SMM'de olmadığı için Kâr/Zarar'a da girer.
function stokManuelFisleri(stok, kurlar) {
  const fisler = {};
  (stok || []).forEach((p) => (p.hareketler || []).forEach((h) => {
    if (h.kaynak !== "Manuel" || !/^MNL-/.test(String(h.fisNo || ""))) return;
    const m = parseFloat(h.miktar) || 0;
    if (!m) return;
    let tl = 0;
    try { tl = (hammaddeBirimFiyati(p, h.renk, h.beden, kurlar || {}) || {}).tl || 0; } catch (e) { tl = 0; }
    const f = fisler[h.fisNo] || (fisler[h.fisNo] = { fisNo: h.fisNo, tarih: String(h.tarih || "").slice(0, 10), giris: 0, cikis: 0, urunler: new Set() });
    if (m > 0) f.giris += m * tl; else f.cikis += -m * tl;
    f.urunler.add(p.ad);
  }));
  return Object.values(fisler).map((f) => ({ ...f, urunSayisi: f.urunler.size, urunler: undefined }));
}
function stokKartHareketleri(tanimlar, stok, kurlar, kartId) {
  const gi = tanimlar && tanimlar.stokGirisGelirKartId, ci = tanimlar && tanimlar.stokCikisGiderKartId;
  if (kartId !== gi && kartId !== ci) return [];
  const l = [];
  stokManuelFisleri(stok, kurlar).forEach((f) => {
    if (kartId === gi && f.giris > 0) l.push({ id: `sg-${f.fisNo}`, fisNo: f.fisNo, tarih: f.tarih, tutar: Math.round(f.giris * 100) / 100, yon: "Giriş", paraBirimi: "TRY", hesapAd: `Stok girişi · ${f.urunSayisi} ürün`, aciklama: "Bağımsız stok girişi", uretimKarsiligi: true });
    if (kartId === ci && f.cikis > 0) l.push({ id: `sc-${f.fisNo}`, fisNo: f.fisNo, tarih: f.tarih, tutar: Math.round(f.cikis * 100) / 100, yon: "Çıkış", paraBirimi: "TRY", hesapAd: `Stok çıkışı · ${f.urunSayisi} ürün`, aciklama: "Bağımsız stok çıkışı", uretimKarsiligi: true });
  });
  return l;
}
// Kâr/Zarar için dönem toplamları (tarih süzgeci dışarıdan).
function stokManuelToplamlari(tanimlar, stok, kurlar, tarihUygun) {
  const gk = ((tanimlar && tanimlar.giderKartlari) || []);
  const giris = gk.find((k) => k.id === (tanimlar && tanimlar.stokGirisGelirKartId)) || null;
  const cikis = gk.find((k) => k.id === (tanimlar && tanimlar.stokCikisGiderKartId)) || null;
  let g = 0, c = 0;
  stokManuelFisleri(stok, kurlar).forEach((f) => { if (tarihUygun && !tarihUygun(f.tarih)) return; g += f.giris; c += f.cikis; });
  return { girisKart: giris, cikisKart: cikis, giris: g, cikis: c };
}
