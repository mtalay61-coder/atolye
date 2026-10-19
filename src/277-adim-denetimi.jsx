// ADIM SIRASI DENETİMİ (v1.710.0). v1.709.3'te kapatılan açık: ara prosesten (Kampre) sonraki adıma, ara prosesten
// önceki adım (Kesim) teslim edilmeden iş verilebiliyordu. O sürede açılmış üretimlerde "önceki adımın teslim ettiğinden
// fazlası sonraki adıma dağıtılmış" kayıtlar kalmış olabilir. Bu denetim onları BULUR, düzeltmez — düzeltme üretim
// kartından sondan geriye geri alma ile yapılır (stok/cari/fiş zinciri o yoldan doğru çözülür; otomatik silme kuralı
// "adım adım silinir" kuralını atlardı).

// Saf: [{ uretimId, siparisNo, model, renk, proses, onceki, beden, dagitilan, akan }]
function adimSirasiIhlalleri(uretim) {
  const l = [];
  (uretim || []).forEach((o) => {
    if (o.iptal) return;
    const pi = o.prosesIlerleme || [];
    pi.forEach((adim, i) => {
      if (i === 0 || adim.araProsesMi) return;
      const akan = oncekiAdimdanMevcutBedenler(pi, i, o.bedenMiktarlari);
      const dagitilan = {};
      (adim.atamalar || []).forEach((a) => {
        if (a.tamirMi) return;   // tamir dönüşü ayrı akış — sınır dışı
        Object.entries(a.bedenMiktarlari || {}).forEach(([b, m]) => { dagitilan[b] = (dagitilan[b] || 0) + (Number(m) || 0); });
      });
      let k = i - 1; while (k > 0 && pi[k].araProsesMi) k--;
      Object.entries(dagitilan).forEach(([beden, m]) => {
        if (m > (akan[beden] || 0) + 0.0001) {
          l.push({ uretimId: o.id, siparisNo: o.siparisNo, model: o.model, renk: o.renk, proses: adim.proses,
            onceki: pi[k] ? pi[k].proses : "", beden, dagitilan: m, akan: akan[beden] || 0 });
        }
      });
    });
  });
  return l;
}

function AdimSirasiDenetimi({ uretim }) {
  const [acik, setAcik] = useState(false);
  const l = acik ? adimSirasiIhlalleri(uretim) : null;
  return (
    <div data-adim-denetimi style={{ marginTop: 20, border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-lg)", padding: 14, background: "var(--erp-panel)" }}>
      <TanimBasligi ad="Üretim adım sırası denetimi" />
      <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 10px" }}>
        Önceki adım teslim etmeden sonraki adıma iş verilmiş üretimleri bulur (v1.709.3 öncesi ara proses açığı). Yalnız
        listeler; düzeltmek için üretim kartında sondan geriye geri alın, sonra sırayla yeniden verin.
      </p>
      <button type="button" className="btn-ghost" data-adim-denetle onClick={() => setAcik(true)}>Denetle</button>
      {l && (l.length === 0
        ? <div data-adim-sonuc="temiz" style={{ marginTop: 10, fontSize: 13, color: "var(--erp-ok)", fontWeight: 700 }}>✓ Sırası atlanmış üretim yok.</div>
        : (
          <div data-adim-sonuc={l.length} style={{ marginTop: 10, display: "grid", gap: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--erp-warn)" }}>{new Set(l.map((x) => x.uretimId)).size} üretimde sıra atlanmış:</div>
            {l.map((x, i) => (
              <div key={i} style={{ fontSize: 12 }}>
                <b className="mono">{x.siparisNo}</b> {x.model} · {x.renk} — <b>{x.proses}</b> {x.beden ? `(${x.beden})` : ""}: {x.dagitilan} çift verilmiş,
                önceki adım ({x.onceki}) yalnız {x.akan} teslim etmiş
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
