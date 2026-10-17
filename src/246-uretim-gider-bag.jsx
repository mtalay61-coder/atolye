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
  const proses = iscilikFisProsesi(h && h.fisNo, tanimlar && tanimlar.prosesler);
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
  const prosesler = Array.from(new Set(iscilik.map((h) => iscilikFisProsesi(h.fisNo, tanimlar && tanimlar.prosesler)).filter(Boolean)));
  const hammadde = hammaddeCikisGiderKarti(tanimlar) ? [] : uretimHammaddeCikislari(stok, kurlar);
  return { iscilikSayisi: iscilik.length, prosesler, hammaddeSayisi: hammadde.length };
}

// Gelir/Gider ekranındaki bağlantı paneli.
function UretimGiderBaglari({ tanimlar, onSave, cariler, stok, kurlar }) {
  const kartlar = (tanimlar && tanimlar.giderKartlari) || [];
  const giderKartlari = kartlar.filter((k) => (k.tur || "gider") !== "gelir");
  const bag = (tanimlar && tanimlar.prosesGiderKartlari) || {};
  // Hem tanımlı prosesler hem işçilik fişlerinde geçen (tanımdan silinmiş olabilir) prosesler.
  const fisProsesleri = uretimIscilikHareketleri(cariler).map((h) => iscilikFisProsesi(h.fisNo, tanimlar && tanimlar.prosesler)).filter(Boolean);
  const prosesler = Array.from(new Set([...((tanimlar && tanimlar.prosesler) || []).map((p) => p.ad).filter(Boolean), ...fisProsesleri]));
  const eksik = karsiliksizUretimFisleri(tanimlar, cariler, stok, kurlar);
  const secici = (deger, onDegis, veri) => (
    <select value={deger || ""} data-uretim-gider-bag={veri} onChange={(e) => onDegis(e.target.value)}
      style={{ ...inputStyle, width: 220, fontSize: 12, borderColor: deger ? "var(--erp-line)" : "var(--erp-warn)" }}>
      <option value="">— bağlı değil —</option>
      {giderKartlari.map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
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
      {(eksik.iscilikSayisi > 0 || eksik.hammaddeSayisi > 0) && (
        <div data-karsiliksiz-uretim style={{ padding: "6px 10px", marginBottom: 10, borderRadius: "var(--erp-r-md)", border: "1.5px solid var(--erp-warn)", background: "var(--erp-orange-bg)", color: "var(--erp-warn)", fontSize: 12, fontWeight: 600 }}>
          ⚠ Karşılığı olmayan fiş: {eksik.iscilikSayisi > 0 ? `${eksik.iscilikSayisi} işçilik (${eksik.prosesler.join(", ")})` : ""}
          {eksik.iscilikSayisi > 0 && eksik.hammaddeSayisi > 0 ? " · " : ""}{eksik.hammaddeSayisi > 0 ? `${eksik.hammaddeSayisi} hammadde çıkışı` : ""}
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
        </div>
      )}
    </div>
  );
}
