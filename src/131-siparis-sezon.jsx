// ================= SİPARİŞ SEZONLARI (v1.744.19) =================
//
// Kullanıcı (13 Kasım, sipariş formunda serbest "Sezon: 2027" kutusuyla): "Sipariş sezonu tanımlardan tanımlanır, seçtirilecek
// şekilde olsun; tanımlarda aktif / pasif de olabilsin. Örnek 2027 Yaz için siparişi giriyoruz, 2028 Yaz'a girince 2027 Yaz'ı
// seçtirmeye gerek kalmaz — tanımlardan sezonu pasife alınca çıkmaz."
//
// Tanım: `tanimlar.siparisSezonlari = [{ id, ad, pasif }]` (Tanımlar › Ürün › Sezonlar). Sipariş sezonu ADIYLA saklanır (eskisi
// gibi `siparis.sezon` metni): liste süzgeci, sipariş çıktısı, arama ve eski siparişler değişmeden çalışır. Bu yüzden sezonun
// ADI sonradan değiştirilemez (eski siparişler eski adla kalırdı) — yanlış girilen sezon silinip yenisi açılır.
// Ürün kartındaki sezon (İlkbahar/Yaz + yıl, 015 SEZONLAR) AYRI bir alan; bu liste yalnız siparişin sezonu.
// Pasif sezon formda seçilemez; ama düzenlenen eski siparişin sezonu pasif / listede olmayan bir ad ise O DEĞER seçenek olarak
// kalır ("(pasif)" / "(listede yok)") — yoksa <select> ilk seçeneği gösterip kayıtta sezonu sessizce silerdi (hata kalıbı 2).

function siparisSezonlari(liste) {
  return (Array.isArray(liste) ? liste : []).filter((s) => s && String(s.ad || "").trim());
}
// Formdaki seçenekler: aktif sezonlar (tanım sırasıyla) + mevcut değer aktif değilse onun etiketi. Saf (birim-siparis-sezon).
function siparisSezonSecenekleri(liste, mevcut) {
  const l = siparisSezonlari(liste);
  const aktif = l.filter((s) => !s.pasif).map((s) => ({ deger: s.ad, etiket: s.ad }));
  const m = String(mevcut || "").trim();
  if (m && !aktif.some((x) => x.deger === m)) {
    const tanimli = l.find((s) => s.ad === m);
    aktif.unshift({ deger: m, etiket: `${m} ${tanimli ? "(pasif)" : "(listede yok)"}` });
  }
  return aktif;
}

function SiparisSezonlariPaneli({ tanimlar, onSave, showToast, siparisler }) {
  const liste = siparisSezonlari(tanimlar.siparisSezonlari);
  const [yeni, setYeni] = useState("");
  const yaz = (l) => onSave({ ...tanimlar, siparisSezonlari: l });
  const ekle = (ad) => {
    const a = String(ad || "").trim();
    if (!a) return false;
    if (liste.some((s) => s.ad.toLocaleLowerCase("tr-TR") === a.toLocaleLowerCase("tr-TR"))) { showToast(`"${a}" zaten tanımlı`); return false; }
    yaz([...liste, { id: uid("szn"), ad: a, pasif: false }]);
    return true;
  };
  const kullanim = (ad) => (siparisler || []).filter((s) => s && s.sezon === ad).length;
  // Önceki siparişlerde yazılmış ama tanımlarda olmayan sezonlar — bir tıkla eklenir (eski serbest metinden geçiş).
  const tanimsiz = [...new Set((siparisler || []).map((s) => s && s.sezon).filter((z) => z && String(z).trim()))]
    .filter((z) => !liste.some((s) => s.ad === z)).sort((a, b) => a.localeCompare(b, "tr"));
  const satir = { display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", border: "1px solid var(--erp-line)", borderRadius: "var(--erp-r-md)", marginBottom: 6, background: "var(--erp-panel)" };
  return (
    <div data-siparis-sezonlari="1">
      <Bolum baslik="Sipariş Sezonları" renk="var(--erp-info)">
        <p style={{ fontSize: 11, color: "var(--erp-text-3)", margin: "0 0 8px", lineHeight: 1.5 }}>
          Sipariş girerken "Sezon" bu listeden seçilir. Sezonu bitince <b>Pasif</b> yapın: yeni siparişte seçenek olarak çıkmaz,
          eski siparişlerde ve listedeki süzgeçte yine görünür. Ürün kartındaki sezon (İlkbahar/Yaz + yıl) ayrı bir alandır.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input value={yeni} onChange={(e) => setYeni(e.target.value)} data-siparis-sezon-yeni="1" placeholder="Örn. 2027 Yaz" style={inputStyle}
            onKeyDown={(e) => { if (e.key === "Enter" && ekle(yeni)) setYeni(""); }} />
          <button className="btn-primary" title="Sezon ekle" data-siparis-sezon-ekle="1" onClick={() => { if (ekle(yeni)) setYeni(""); }}><Plus size={14} /></button>
        </div>
        {liste.length === 0 && <div style={{ fontSize: 12, color: "var(--erp-text-3)", marginBottom: 8 }}>Henüz sezon tanımlanmadı — sipariş formunda sezon serbest yazılır.</div>}
        {liste.map((s) => (
          <div key={s.id || s.ad} data-siparis-sezon-satir={s.ad} style={{ ...satir, opacity: s.pasif ? 0.6 : 1 }}>
            <span style={{ fontWeight: 600, flex: 1 }}>{s.ad}</span>
            <span style={{ fontSize: 11, color: "var(--erp-text-3)" }}>{kullanim(s.ad)} sipariş</span>
            <button type="button" data-siparis-sezon-durum={s.ad} className={s.pasif ? "btn-secondary" : "btn-primary"} style={{ fontSize: 11, padding: "3px 10px" }}
              title={s.pasif ? "Yeniden seçilebilir yap" : "Yeni siparişte seçilmesin"}
              onClick={() => yaz(liste.map((x) => (x === s ? { ...x, pasif: !x.pasif } : x)))}>
              {s.pasif ? "Pasif" : "Aktif"}
            </button>
            <button type="button" title="Sil" data-siparis-sezon-sil={s.ad} style={{ all: "unset", cursor: "pointer", color: "var(--erp-danger)" }}
              onClick={() => {
                const n = kullanim(s.ad);
                if (n && !window.confirm(`"${s.ad}" ${n} siparişte kullanılıyor. Silinirse o siparişlerde sezon yazısı kalır ama listeden seçilemez. Silinsin mi? (Bitti ise Pasif yapmanız önerilir.)`)) return;
                yaz(liste.filter((x) => x !== s));
              }}><Trash2 size={14} /></button>
          </div>
        ))}
        {tanimsiz.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12 }}>
            Siparişlerde yazılı ama tanımlı olmayan sezonlar: <b>{tanimsiz.join(", ")}</b>{" "}
            <button type="button" className="btn-secondary" data-siparis-sezon-aktar="1" style={{ fontSize: 11, padding: "3px 10px", marginLeft: 6 }}
              onClick={() => yaz([...liste, ...tanimsiz.map((ad) => ({ id: uid("szn"), ad, pasif: false }))])}>
              Tanımlara ekle ({tanimsiz.length})
            </button>
          </div>
        )}
      </Bolum>
    </div>
  );
}
