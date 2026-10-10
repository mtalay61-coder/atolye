/* ================= SİPARİŞ MODÜLÜ (Satış / Alış) ================= */

const SIPARIS_DURUM_RENK = {
  "Bekliyor": "var(--erp-text-3)", "Onaylandı": "var(--erp-info)", "Hazırlanıyor": "#C97B3D",
  "Kısmi Teslim": "#B8860B", "Tamamlandı": "var(--erp-primary)", "İptal": "var(--erp-warn)",
};


// SESLİ SİPARİŞ KALDIRILDI (v1.639.0, denetim): düğme Anthropic API'ye anahtarsız istek atıyordu (her zaman 401,
// hiç çalışmadı) ve bütün cari ünvanlarıyla ürün adlarını dışarı gönderiyordu — proje kuralı: dışarıya veri gönderen
// AI/servis entegrasyonu yok. Klavyenin dikte tuşu metin kutularında zaten çalışıyor.


// Sipariş formunun "Ekle" düğmesi (v1.470.0 — kullanıcı: "kalemlere ekle'nin adını Ekle yap, rengi
// yeşil olsun, güzel bir ikonu da olabilir"). Hayalet düğme formdaki onca kutunun arasında
// kayboluyordu; kalemi listeye geçiren tek eylem olduğu için dolu ve yeşil. Sabit yeşil (tema
// değil): koyu temada da beyaz yazıyla okunuyor, "Kaydet"in kırmızısıyla karışmıyor.
const EKLE_DUGMESI = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "7px 16px", fontSize: 13, fontWeight: 700,
  color: "#fff", background: "#2F8F46", border: "1px solid #257238",
  borderRadius: "var(--erp-r-md)", cursor: "pointer", whiteSpace: "nowrap",
};

// ================= KALEM NOTLARI — PROSES BAZLI (26 Eylül, v1.476.0) =================
//
// Kullanıcı: "Not girdiğimizde üretime not varsa üretimin hangi prosesine ait onu da yazıp o proseste
// gösterecek. Örnek: kesim için 'deriyi iyi yerinden kes', temizleme için 'her tek poşete konacak'."
//
// Kalemde `notlar: [{ proses, metin }]` — proses "" = GENEL not (v1.470'teki renk bazlı açıklama).
// Bir renk satırının bütün ölçüleri aynı notları taşır. Eski `aciklama` alanı genel not olarak
// okunur (`kalemNotlari`); düzenlenince `notlar`a taşınır.
//
// ÜRETİM notları KOPYALAMAZ, siparişten CANLI okur (`uretimSiparisNotlari`): kalemin
// `planlama.referansNo`su üretim numarası. Böylece planlamadan SONRA eklenen not da atölyeye düşer,
// eski planlanmış işler de göç gerektirmeden notlarını gösterir. (Kutu rengi kopyalanıyor çünkü
// hammadde tüketimini değiştiriyor; not yalnız bilgi.)
// ================= SİPARİŞİN ÖDEMELERİ (v1.612.0) =================
// Kullanıcı (8 Ekim): "Siparişte ödeme girişi de olsun." Sipariş kartındaki "Tahsilat Gir / Ödeme Gir" düğmesi
// carinin kartını açıp tahsilat formunu siparişle dolu getiriyor; kaydedilen hareket `siparisId` taşıyor. Bu
// fonksiyon o hareketleri toplar: satışta Tahsilat, alışta Ödeme sayılır (tip: alan ya da fiş ön eki) (ters yönlü kayıt — iade — düşülmez;
// nadir ve ayrı bir iş). Para birimine göre ayrı toplanır: USD sipariş TL kasadan tahsil edilmiş olabilir,
// cari hareketi carinin birimindedir. "Kalan" yalnız siparişin para biriminde ödenen varsa hesaplanır.
//
// girdi: siparis, cari (hareketleriyle), siparisToplami, siparisPB
// dönen: { odemeler: [hareket…], toplamlar: { PB: tutar }, odenen: siparisPB'deki toplam, kalan }
function siparisOdemeOzeti(siparis, cari, siparisToplami, siparisPB) {
  const beklenenTip = siparis && siparis.tip === "Alış" ? "Ödeme" : "Tahsilat";
  // Tip `hareketIslemTipi` ile (200): cari kartının hunisi (addHareket) `islemTipi` alanını kayda YAZMAZ, tip fiş
  // numarasının ön ekinden (THS-/ODM-) okunur; fişten gelen peşin kaydında ise alan var.
  const odemeler = ((cari && cari.hareketler) || []).filter((h) => h && h.siparisId === siparis.id && hareketIslemTipi(h) === beklenenTip);
  const toplamlar = {};
  odemeler.forEach((h) => {
    const pb = h.paraBirimi || "TRY";
    toplamlar[pb] = (toplamlar[pb] || 0) + (Number(h.tutar) || 0);
  });
  const pb = siparisPB || "TRY";
  const odenen = toplamlar[pb] || 0;
  // KDV DAHİL KARŞILAŞTIRMA (v1.639.0, denetim): teslim fişi cariye KDV DAHİL yazılıyor (078) ve tahsilat KDV dahil
  // tutarla giriliyor; sipariş toplamı ise KDV hariç — "kalan" KDV kadar eksik, tam ödemede "ödenen > toplam" çıkıyordu.
  // Kalemlerin kendi KDV oranından çarpan: KDV yoksa 1 (eski davranış).
  const kalemler = (siparis && siparis.kalemler) || [];
  const kdvsiz = kalemler.reduce((t, k) => t + (Number(k.miktar) || 0) * (Number(k.birimFiyat) || 0), 0);
  const kdvli = kalemler.reduce((t, k) => t + (Number(k.miktar) || 0) * (Number(k.birimFiyat) || 0) * (1 + (Number(k.kdvOrani) || 0) / 100), 0);
  const kdvCarpani = kdvsiz > 0 ? kdvli / kdvsiz : 1;
  const kdvDahilHam = (Number(siparisToplami) || 0) * kdvCarpani;
  const kdvDahilToplam = Math.round(kdvDahilHam * 100) / 100;
  // Kalan ham değerden tek yuvarlama (çift yuvarlama kuruş kaydırıyordu: 20,005 → 20,01 − 10,555 = 9,46; doğrusu 9,45).
  const kalan = Math.max(0, Math.round((kdvDahilHam - odenen) * 100) / 100);
  return { odemeler, toplamlar, odenen, kalan, beklenenTip, kdvDahilToplam, kdvCarpani };
}

function kalemNotlari(k) {
  if (!k) return [];
  const liste = [];
  if (k.aciklama) liste.push({ proses: "", metin: String(k.aciklama) });
  (k.notlar || []).forEach((n) => { if (n && String(n.metin || "").trim()) liste.push({ proses: n.proses || "", metin: String(n.metin).trim() }); });
  return notlariTekille(liste);
}
function notlariTekille(liste) {
  const gorulen = new Set();
  return (liste || []).filter((n) => { const a = `${n.proses}|${n.metin}`; if (gorulen.has(a)) return false; gorulen.add(a); return true; });
}
// Bir renk satırındaki (aynı ürün+renk, farklı ölçüler) kalemlerin notları.
function grupNotlari(kalemler) { return notlariTekille((kalemler || []).flatMap(kalemNotlari)); }
// Siparişteki TEKİL not sayısı (v1.621.0): genel not + her ürün/renk grubunun tekil notları — aynı notun ölçü tekrarları bir.
function siparisNotSayisi(siparis) {
  if (!siparis) return 0;
  const gruplar = {};
  (siparis.kalemler || []).forEach((k) => { const a = `${k.urunAd}|${k.renk || ""}`; (gruplar[a] = gruplar[a] || []).push(k); });
  return (siparis.not ? 1 : 0) + Object.values(gruplar).reduce((t, g) => t + grupNotlari(g).length, 0);
}
// Üretime bağlı satış kalemlerinin notları (üretim no = kalemin planlama referansı).
function uretimSiparisNotlari(u, siparisler) {
  if (!u || !u.siparisNo) return [];
  const kalemler = [];
  (siparisler || []).forEach((s) => (s.kalemler || []).forEach((k) => {
    if (k.planlama && k.planlama.tip === "Üretim" && k.planlama.referansNo === u.siparisNo) kalemler.push(k);
  }));
  return grupNotlari(kalemler);
}
const notEtiketi = (n) => (n.proses ? `${n.proses}: ${n.metin}` : n.metin);

// Not listesi + ekleyici. `onTaslak`: yazılan ama henüz eklenmemiş not (sipariş formunda "Ekle"
// basılınca o da kaleme gitsin — "+"ya basmayı unutmak notu kaybettirmesin).
function KalemNotDuzenleyici({ notlar, prosesler, onDegis, onTaslak, salt = false, kucuk = false, veriAdi = "data-kalem-notlari" }) {
  const [proses, setProses] = useState("");
  const [metin, setMetin] = useState("");
  const ekle = () => {
    const m = metin.trim();
    if (!m) return;
    onDegis(notlariTekille([...(notlar || []), { proses, metin: m }]));
    setMetin(""); if (onTaslak) onTaslak(null);
  };
  const fs = kucuk ? 11 : 12;
  return (
    <div {...{ [veriAdi]: "1" }} style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", fontFamily: "var(--erp-font, sans-serif)" }}>
      {(notlar || []).map((n, i) => (
        <span key={`${n.proses}|${n.metin}`} data-kalem-not={notEtiketi(n)}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: fs, padding: "1px 7px", borderRadius: "var(--erp-r-pill)",
            background: n.proses ? "#FFF4DC" : "var(--erp-panel-2)", border: `1px solid ${n.proses ? "#E3C77A" : "var(--erp-line)"}`, whiteSpace: "normal" }}>
          {n.proses && <b style={{ color: "#8A6A2E" }}>{n.proses}:</b>}
          {n.metin}
          {!salt && (
            <button type="button" title="Notu sil" onClick={() => onDegis((notlar || []).filter((_, j) => j !== i))}
              style={{ border: "none", background: "none", cursor: "pointer", color: "var(--erp-text-3)", padding: 0, display: "flex" }}>
              <X size={10} />
            </button>
          )}
        </span>
      ))}
      {!salt && (
        <span style={{ display: "inline-flex", gap: 3, alignItems: "center", flex: "1 1 180px", minWidth: 150 }}>
          <select value={proses} onChange={(e) => { setProses(e.target.value); if (onTaslak && metin.trim()) onTaslak({ proses: e.target.value, metin: metin.trim() }); }}
            data-kalem-not-proses="1" title="Notun ait olduğu proses — üretimde o proseste gösterilir"
            style={{ fontSize: fs, padding: "3px 2px", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-sm)", maxWidth: 110 }}>
            <option value="">Genel</option>
            {(prosesler || []).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input value={metin} data-kalem-not-metin="1"
            onChange={(e) => { setMetin(e.target.value); if (onTaslak) onTaslak(e.target.value.trim() ? { proses, metin: e.target.value.trim() } : null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ekle(); } }}
            // KUTUDAN ÇIKINCA EKLENİR (v1.624.0 — kullanıcı: "sipariş satıra girdiğim notu göremiyorum"). Satırdaki ve
            // Notlar panelindeki düzenleyicide `onTaslak` yok: not yazılıp Enter/+ basılmadan Kaydet'e basılınca not
            // kaleme hiç gitmiyordu. Odak aynı düzenleyicinin proses seçicisine/düğmesine geçiyorsa eklenmez —
            // önce yazıp sonra proses seçen kullanıcının notu "Genel" diye düşmesin.
            onBlur={(e) => { if (e.relatedTarget && e.currentTarget.parentElement.contains(e.relatedTarget)) return; ekle(); }}
            placeholder={proses ? `${proses} notu…` : "Not…"}
            style={{ flex: 1, minWidth: 80, fontSize: fs, padding: "3px 6px", border: "1px dashed var(--erp-line)", borderRadius: "var(--erp-r-sm)", background: "transparent", fontFamily: "inherit" }} />
          <button type="button" data-kalem-not-ekle="1" onClick={ekle} disabled={!metin.trim()} title="Notu ekle"
            style={{ border: "1px solid var(--erp-line)", background: "#fff", borderRadius: "var(--erp-r-sm)", cursor: "pointer", padding: "2px 5px", display: "flex" }}>
            <Plus size={11} />
          </button>
        </span>
      )}
    </div>
  );
}

// Basılı belgelere (iş emri, teslim fişi) serbest metin yazarken: "<" gibi karakterler HTML'i bozmasın.
function htmlKacis(v) {
  return String(v == null ? "" : v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
}
