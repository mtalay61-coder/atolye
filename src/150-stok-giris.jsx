// Herhangi bir siparişe bağlı olmadan, doğrudan bir stok kartına giriş/çıkış yapmayı sağlayan bağımsız form.
function BagimsizStokGirisiFormu({ items, asortiler, onKaydet, onAsortiOlustur, onKapat }) {
  const [urunId, setUrunId] = useState("");
  const [renk, setRenk] = useState("");
  const [bedenMiktarlar, setBedenMiktarlar] = useState({});
  const [not, setNot] = useState("");

  const urun = items.find((p) => p.id === urunId);
  const renkler = urun ? Array.from(new Set(urun.variants.map((v) => v.renk))) : [];
  // Bedenler küçükten büyüğe: varyantlar ekleme sırasında duruyor, beden ise SIRA ifade eder.
  const bedenler = urun && renk
    ? bedenSirala(urun.variants.filter((v) => v.renk === renk).map((v) => v.beden))
    : [];
  const [manuelYon, setManuelYon] = useState("Giriş");
  const gercekYon = manuelYon;

  function urunSec(id) {
    setUrunId(id);
    setRenk("");
    setBedenMiktarlar({});
  }

  function renkSec(r) {
    setRenk(r);
    setBedenMiktarlar({});
  }

  function kaydet() {
    if (!urun || !renk) return;
    onKaydet(urunId, renk, bedenMiktarlar, gercekYon, not.trim(), null);
    setUrunId(""); setRenk(""); setBedenMiktarlar({}); setNot(""); setManuelYon("Giriş");
    onKapat();
  }

  return (
    <div style={{ background: "var(--erp-panel)", border: "1.5px solid #6B4E8A", borderRadius: "var(--erp-r-md)", padding: 14, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-purple)" }}>Bağımsız Stok Girişi / Çıkışı</div>
        <button className="btn-ghost" onClick={onKapat}><X size={14} /></button>
      </div>
      <p style={{ fontSize: 11, color: "var(--erp-text-2)", margin: "0 0 12px" }}>
        Bir sipariş oluşturmadan doğrudan stok düzeltmesi yapın (sayım farkı, numune, fire). Bir cariden alış/satış
        yapacaksanız, bunu artık Cari kartındaki "Cariden Alış / Cariye Satış" bölümünden yapabilirsiniz.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <Field label="Ürün">
          <select value={urunId} onChange={(e) => urunSec(e.target.value)} style={{ ...inputStyle, minWidth: 200 }}>
            <option value="">Ürün seçin…</option>
            {secilebilirler(items, urunId).map((p) => (
              <option key={p.id} value={p.id}>{secenekEtiketi(p, p.ad)} ({p.kategori})</option>
            ))}
          </select>
        </Field>
        {urun && (
          <Field label="Renk">
            <select value={renk} onChange={(e) => renkSec(e.target.value)} style={{ ...inputStyle, minWidth: 140 }}>
              <option value="">Renk seçin…</option>
              {renkler.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
        )}
        <Field label="Yön">
          <div style={{ display: "flex", gap: 6 }}>
            {["Giriş", "Çıkış"].map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setManuelYon(y)}
                style={{
                  padding: "8px 14px", borderRadius: "var(--erp-r-md)", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  border: `1.5px solid ${manuelYon === y ? (y === "Giriş" ? "var(--erp-primary)" : "var(--erp-warn)") : "var(--erp-border)"}`,
                  background: manuelYon === y ? (y === "Giriş" ? "#E5EEE3" : "#FCEAEA") : "#fff",
                  color: manuelYon === y ? (y === "Giriş" ? "var(--erp-primary)" : "var(--erp-warn)") : "var(--erp-text-2)",
                }}
              >
                {y === "Giriş" ? "+ Giriş" : "− Çıkış"}
              </button>
            ))}
          </div>
        </Field>
      </div>


      {renk && bedenler.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "var(--erp-text-2)", fontWeight: 600, marginBottom: 6 }}>
            Ölçülere göre {gercekYon === "Giriş" ? "eklenecek" : "düşülecek"} miktarı girin
          </div>
          <AsortiUygulaKontrolu
            asortiler={asortiler}
            bedenSecenekleri={bedenler}
            olcuTipi={urun.olcuTipi}
            onUygula={(sonuc) => setBedenMiktarlar({ ...bedenMiktarlar, ...sonuc })}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {bedenler.map((b) => {
              const varyant = urun.variants.find((v) => v.renk === renk && v.beden === b);
              return (
                <label key={b} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--erp-text)" }}>{b}</span>
                  <span className="mono" style={{ fontSize: 9, color: "var(--erp-text-3)" }}>mevcut: {varyant ? varyant.miktar : 0}</span>
                  <input
                    type="number"
                    min="0"
                    value={bedenMiktarlar[b] || ""}
                    onChange={(e) => setBedenMiktarlar({ ...bedenMiktarlar, [b]: e.target.value })}
                    style={{ ...inputStyle, width: 64, textAlign: "center", padding: "6px" }}
                  />
                </label>
              );
            })}
          </div>
          <AsortiOlusturTeklifi
            degerler={bedenMiktarlar}
            bedenSecenekleri={bedenler}
            asortiler={asortiler}
            onOlustur={onAsortiOlustur}
          />
        </div>
      )}

      {renk && (
        <Field label="Not (opsiyonel)">
          <input value={not} onChange={(e) => setNot(e.target.value)} placeholder="Örn. Sayım düzeltmesi, numune, fire…" style={inputStyle} />
        </Field>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="btn-primary btn-save" disabled={!renk} onClick={kaydet}><Save size={14} /> Kaydet</button>
        <button className="btn-ghost" onClick={onKapat}>Vazgeç</button>
      </div>
    </div>
  );
}

