// KAPASİTE YÖNETİMİ (v1.703.0 — kullanıcı: "Kapasite yönetimi yapalım; tanımlara makine teçhizat, makinenin günlük
// iş yapabilme hacmi, makineye bağlı kalıp ve kalıpların her beden için ayrı günlük kapasitesi, elemanların günlük
// kapasitesi çalışma saatleri ile birlikte" + "Ürün stok içinde kullanılacak makine, kalıp bağla; örnek: modelin kesim
// prosesi kesim makinesi, x kalıp, x bıçak kullanacak; x kalıp ve bıçak kesim makinesinde saatlik … adet üretir.
// Planlamayı bunun üzerinden yapacağız").
//
// KARARLAR (kullanıcı seçti): tanımlar Tanımlar › Kapasite sekmesinde; günlük kapasiteyi MAKİNE + KALIP belirler
// (kalıbın o bedendeki saatlik adedi × makinenin günlük çalışma saati × makine adedi); eleman yalnız saat bilgisi
// (planlamada kimin ne kadar saati var — kapasiteyi kısmaz).
//
// VERİ (tanimlar.kapasite):
//   makineler: [{ id, ad, prosesler: [proses adı], adet, gunlukSaat, saatlikAdet }]
//     saatlikAdet: kalıpsız işte (dikiş gibi) makinenin saatlik genel hacmi.
//   kaliplar:  [{ id, ad, tur: "Kalıp"|"Bıçak", makineId, bedenSaatlik: { "<beden adı>": saatlik adet } }]
//     Kalıp/bıçak beden beden ayrı hızda çalışır (büyük numarada pastal az sığar); boş beden = o kalıp o bedeni kesmez.
//   elemanlar: [{ cariId, prosesler: [ad], baslangic: "08:00", bitis: "18:00", molaDk, saatlikAdet }]
// ÜRÜN (urun.kapasite): { "<proses adı>": { makineId, kalipIdler: [id], elemanIdler: [cariId] } } — Ürün kartı › Kapasite sekmesi.

function kapasiteTanimi(tanimlar) {
  const k = (tanimlar && tanimlar.kapasite) || {};
  return { makineler: k.makineler || [], kaliplar: k.kaliplar || [], elemanlar: k.elemanlar || [] };
}

const sayiYa = (x) => { const n = Number(String(x == null ? "" : x).replace(",", ".")); return Number.isFinite(n) && n > 0 ? n : 0; };

// "08:00"–"18:00", 60 dk mola → 9 saat. Bitiş başlangıçtan önceyse (gece vardiyası) ertesi güne sayılır.
function elemanGunlukSaat(e) {
  const dk = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "")); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  const b = dk(e && e.baslangic), s = dk(e && e.bitis);
  if (b == null || s == null) return 0;
  const fark = (s > b ? s - b : s + 1440 - b) - sayiYa(e.molaDk);
  return Math.max(0, Math.round((fark / 60) * 100) / 100);
}

// Bir ürünün bir prosesinde, verilen bedende SAATLİK ve GÜNLÜK kapasite.
// Kalıp/bıçak seçiliyse darboğaz en yavaş olanıdır (kalıp 40, bıçak 60 → saatte 40); seçili kalıp o bedeni
// tanımlamamışsa `eksik` döner — planlama "kapasite bilinmiyor" der, sıfırla bölmez.
function prosesKapasitesi(tanimlar, urun, proses, beden) {
  const kt = kapasiteTanimi(tanimlar);
  const bag = ((urun && urun.kapasite) || {})[proses];
  if (!bag || !bag.makineId) return { eksik: "makine bağlı değil" };
  const makine = kt.makineler.find((m) => m.id === bag.makineId);
  if (!makine) return { eksik: "makine silinmiş" };
  const kaliplar = (bag.kalipIdler || []).map((id) => kt.kaliplar.find((k) => k.id === id)).filter(Boolean);
  let saatlik;
  if (kaliplar.length) {
    const hizlar = kaliplar.map((k) => sayiYa((k.bedenSaatlik || {})[beden]));
    if (hizlar.some((h) => !h)) return { makine, kaliplar, eksik: `${beden} bedeni kalıpta tanımlı değil` };
    saatlik = Math.min(...hizlar);
  } else {
    saatlik = sayiYa(makine.saatlikAdet);
    if (!saatlik) return { makine, kaliplar, eksik: "makinenin saatlik adedi yok" };
  }
  const adet = Math.max(1, sayiYa(makine.adet) || 1);
  const gunlukSaat = sayiYa(makine.gunlukSaat) || 8;
  return { makine, kaliplar, saatlik: saatlik * adet, gunluk: saatlik * adet * gunlukSaat, gunlukSaat };
}

// Beden → adet tablosu için gereken saat ve gün. Bir beden bile bilinmiyorsa `eksik` listelenir, kalanlar toplanır.
function isYukuHesapla(tanimlar, urun, proses, bedenAdet) {
  let saat = 0; const eksik = []; let gunlukSaat = 8;
  Object.entries(bedenAdet || {}).forEach(([beden, adet]) => {
    const n = sayiYa(adet); if (!n) return;
    const k = prosesKapasitesi(tanimlar, urun, proses, beden);
    if (k.eksik) { eksik.push(k.eksik); return; }
    gunlukSaat = k.gunlukSaat;
    saat += n / k.saatlik;
  });
  return { saat: Math.round(saat * 100) / 100, gun: Math.round((saat / gunlukSaat) * 100) / 100, eksik: Array.from(new Set(eksik)) };
}

function KapasiteTanimi({ tanimlar, onSave, cariler, showToast }) {
  const kt = kapasiteTanimi(tanimlar);
  const yaz = (alan, liste) => onSave({ ...tanimlar, kapasite: { ...kt, [alan]: liste } });
  const prosesAdlari = (tanimlar.prosesler || []).map((p) => p.ad);
  const bedenAdlari = (tanimlar.bedenler || []).filter((b) => (b.tip || "Beden") === "Beden").map((b) => b.ad);
  const personeller = (cariler || []).filter((c) => c.tip === "Personel" && !c.pasif);
  const [yeniMakine, setYeniMakine] = useState("");
  const [yeniKalip, setYeniKalip] = useState({ ad: "", tur: "Kalıp", makineId: "" });
  const kutu = { border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 10, background: "var(--erp-panel)", display: "grid", gap: 8 };
  const kucuk = { ...inputStyle, width: 80 };
  const prosesCipleri = (secili, onDegis, veri) => (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {prosesAdlari.map((p) => {
        const on = (secili || []).includes(p);
        return (
          <button key={p} type="button" data-kapasite-proses={`${veri}:${p}`}
            onClick={() => onDegis(on ? secili.filter((x) => x !== p) : [...(secili || []), p])}
            style={{ padding: "3px 10px", borderRadius: "var(--erp-r-pill)", fontSize: 12, cursor: "pointer",
              border: `1px solid ${on ? "var(--erp-accent, #2F6FB0)" : "var(--erp-border)"}`, background: on ? "#2F6FB01A" : "#fff",
              fontWeight: on ? 700 : 400 }}>{p}</button>
        );
      })}
    </div>
  );
  const makineEkle = () => {
    const ad = yeniMakine.trim(); if (!ad) return;
    if (kt.makineler.some((m) => m.ad.toLocaleLowerCase("tr") === ad.toLocaleLowerCase("tr"))) { if (showToast) showToast(`"${ad}" zaten var`); return; }
    yaz("makineler", [...kt.makineler, { id: uid("mak"), ad, prosesler: [], adet: 1, gunlukSaat: 9, saatlikAdet: "" }]);
    setYeniMakine("");
  };
  const makineGuncelle = (id, d) => yaz("makineler", kt.makineler.map((m) => (m.id === id ? { ...m, ...d } : m)));
  const kalipEkle = () => {
    const ad = yeniKalip.ad.trim(); if (!ad || !yeniKalip.makineId) { if (showToast) showToast("Kalıp adı ve makine seçin"); return; }
    yaz("kaliplar", [...kt.kaliplar, { id: uid("klp"), ad, tur: yeniKalip.tur, makineId: yeniKalip.makineId, bedenSaatlik: {} }]);
    setYeniKalip({ ...yeniKalip, ad: "" });
  };
  const kalipGuncelle = (id, d) => yaz("kaliplar", kt.kaliplar.map((k) => (k.id === id ? { ...k, ...d } : k)));
  const elemanGuncelle = (cariId, d) => {
    const var_ = kt.elemanlar.some((e) => e.cariId === cariId);
    yaz("elemanlar", var_ ? kt.elemanlar.map((e) => (e.cariId === cariId ? { ...e, ...d } : e))
      : [...kt.elemanlar, { cariId, prosesler: [], baslangic: "08:00", bitis: "18:00", molaDk: 60, ...d }]);
  };
  // Makine/kalıp silinirken ürünlerdeki bağ ürün kartında "makine silinmiş" diye görünür; burada sessizce silmek
  // yerine kullanıcıya sorulur.
  const sil = (alan, id, ad) => { if (window.confirm(`"${ad}" silinsin mi?`)) yaz(alan, kt[alan].filter((x) => x.id !== id)); };

  return (
    <div data-kapasite-tanimi style={{ display: "grid", gap: 22 }}>
      <div>
        <TanimBasligi ad="Makine / Teçhizat" />
        <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 10px" }}>
          Her makinenin hangi proseste kullanıldığını, kaç tane olduğunu ve günde kaç saat çalıştığını girin.
          Kalıpsız işlerde (dikiş gibi) saatlik adet makinenin kendi hızıdır; kalıplı işte hızı kalıp belirler.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input data-makine-yeni value={yeniMakine} onChange={(e) => setYeniMakine(e.target.value)} onKeyDown={(e) => e.key === "Enter" && makineEkle()}
            placeholder="Örn. Kesim Makinesi 1" style={{ ...inputStyle, width: 220 }} />
          <button type="button" className="btn-primary" data-makine-ekle onClick={makineEkle}><Plus size={14} /></button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {kt.makineler.map((m) => (
            <div key={m.id} data-makine={m.ad} style={kutu}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <Field label="Ad"><input value={m.ad} onChange={(e) => makineGuncelle(m.id, { ad: e.target.value })} style={{ ...inputStyle, width: 200 }} /></Field>
                <Field label="Adet"><input inputMode="numeric" data-makine-alan="adet" value={m.adet ?? 1} onChange={(e) => makineGuncelle(m.id, { adet: e.target.value })} style={kucuk} /></Field>
                <Field label="Günlük saat"><input inputMode="decimal" data-makine-alan="gunlukSaat" value={m.gunlukSaat ?? ""} onChange={(e) => makineGuncelle(m.id, { gunlukSaat: e.target.value })} style={kucuk} /></Field>
                <Field label="Saatlik adet (kalıpsız)"><input inputMode="numeric" data-makine-alan="saatlikAdet" value={m.saatlikAdet ?? ""} onChange={(e) => makineGuncelle(m.id, { saatlikAdet: e.target.value })} style={kucuk} /></Field>
                {sayiYa(m.saatlikAdet) > 0 && (
                  <span style={{ fontSize: 12, color: "var(--erp-text-2)", paddingBottom: 8 }}>
                    Günlük: <b>{Math.round(sayiYa(m.saatlikAdet) * (sayiYa(m.gunlukSaat) || 8) * Math.max(1, sayiYa(m.adet) || 1))}</b> adet
                  </span>
                )}
                <button type="button" className="btn-ghost" onClick={() => sil("makineler", m.id, m.ad)} title="Sil" style={{ marginLeft: "auto" }}><Trash2 size={14} /></button>
              </div>
              {prosesCipleri(m.prosesler, (l) => makineGuncelle(m.id, { prosesler: l }), m.ad)}
            </div>
          ))}
        </div>
      </div>

      <div>
        <TanimBasligi ad="Kalıp / Bıçak" />
        <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 10px" }}>
          Kalıp ve bıçak bir makinede kullanılır; saatlik adedi beden beden girin. Boş bırakılan beden o kalıpla kesilmiyor demektir.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <input data-kalip-yeni value={yeniKalip.ad} onChange={(e) => setYeniKalip({ ...yeniKalip, ad: e.target.value })} onKeyDown={(e) => e.key === "Enter" && kalipEkle()}
            placeholder="Örn. 27080 kesim kalıbı" style={{ ...inputStyle, width: 200 }} />
          <select value={yeniKalip.tur} onChange={(e) => setYeniKalip({ ...yeniKalip, tur: e.target.value })} style={{ ...inputStyle, width: 100 }}>
            <option>Kalıp</option><option>Bıçak</option>
          </select>
          <select data-kalip-makine value={yeniKalip.makineId} onChange={(e) => setYeniKalip({ ...yeniKalip, makineId: e.target.value })} style={{ ...inputStyle, width: 180 }}>
            <option value="">Makine seçin…</option>
            {kt.makineler.map((m) => <option key={m.id} value={m.id}>{m.ad}</option>)}
          </select>
          <button type="button" className="btn-primary" data-kalip-ekle onClick={kalipEkle}><Plus size={14} /></button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {kt.kaliplar.map((k) => (
            <div key={k.id} data-kalip={k.ad} style={kutu}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input value={k.ad} onChange={(e) => kalipGuncelle(k.id, { ad: e.target.value })} style={{ ...inputStyle, width: 200 }} />
                <select value={k.tur || "Kalıp"} onChange={(e) => kalipGuncelle(k.id, { tur: e.target.value })} style={{ ...inputStyle, width: 100 }}>
                  <option>Kalıp</option><option>Bıçak</option>
                </select>
                <select value={k.makineId || ""} onChange={(e) => kalipGuncelle(k.id, { makineId: e.target.value })} style={{ ...inputStyle, width: 180 }}>
                  <option value="">Makine seçin…</option>
                  {kt.makineler.map((m) => <option key={m.id} value={m.id}>{m.ad}</option>)}
                </select>
                <button type="button" className="btn-ghost" onClick={() => sil("kaliplar", k.id, k.ad)} title="Sil" style={{ marginLeft: "auto" }}><Trash2 size={14} /></button>
              </div>
              <div style={{ fontSize: 11, color: "var(--erp-text-3)" }}>Saatlik adet — beden beden</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {bedenAdlari.map((b) => (
                  <label key={b} style={{ display: "grid", gap: 2, fontSize: 11, textAlign: "center" }}>
                    {b}
                    <input inputMode="numeric" data-kalip-beden={b} value={(k.bedenSaatlik || {})[b] ?? ""}
                      onChange={(e) => kalipGuncelle(k.id, { bedenSaatlik: { ...(k.bedenSaatlik || {}), [b]: e.target.value } })}
                      style={{ ...inputStyle, width: 56, textAlign: "center", padding: "4px" }} />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <TanimBasligi ad="Eleman Çalışma Saatleri" />
        <p style={{ fontSize: 12, color: "var(--erp-text-2)", margin: "0 0 10px" }}>
          Personel tipindeki carilerin mesai başlangıç-bitişi, molası ve çalıştığı prosesler. Günlük saat planlamada
          kimin ne kadar zamanı olduğunu gösterir.
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {personeller.length === 0 && <div style={{ fontSize: 12, color: "var(--erp-text-3)" }}>Personel tipinde cari yok.</div>}
          {personeller.map((c) => {
            const e = kt.elemanlar.find((x) => x.cariId === c.id) || { baslangic: "", bitis: "", molaDk: "", prosesler: [] };
            return (
              <div key={c.id} data-eleman={c.unvan} style={kutu}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <b style={{ minWidth: 140, paddingBottom: 8 }}>{c.unvan}</b>
                  <Field label="Başlangıç"><input type="time" value={e.baslangic || ""} onChange={(ev) => elemanGuncelle(c.id, { baslangic: ev.target.value })} style={{ ...inputStyle, width: 110 }} /></Field>
                  <Field label="Bitiş"><input type="time" value={e.bitis || ""} onChange={(ev) => elemanGuncelle(c.id, { bitis: ev.target.value })} style={{ ...inputStyle, width: 110 }} /></Field>
                  <Field label="Mola (dk)"><input inputMode="numeric" value={e.molaDk ?? ""} onChange={(ev) => elemanGuncelle(c.id, { molaDk: ev.target.value })} style={kucuk} /></Field>
                  <Field label="Saatlik adet"><input inputMode="numeric" value={e.saatlikAdet ?? ""} onChange={(ev) => elemanGuncelle(c.id, { saatlikAdet: ev.target.value })} style={kucuk} /></Field>
                  <span style={{ fontSize: 12, color: "var(--erp-text-2)", paddingBottom: 8 }}>
                    Günlük: <b data-eleman-saat>{elemanGunlukSaat(e)}</b> saat
                    {sayiYa(e.saatlikAdet) > 0 && <> · <b>{Math.round(sayiYa(e.saatlikAdet) * elemanGunlukSaat(e))}</b> adet</>}
                  </span>
                </div>
                {prosesCipleri(e.prosesler, (l) => elemanGuncelle(c.id, { prosesler: l }), c.unvan)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Ürün kartı › Kapasite: reçetedeki her proses için makine ve kalıp/bıçak seçimi + bedene göre günlük adet önizlemesi.
function UrunKapasiteBagi({ product, tanimlar, cariler, onKaydet }) {
  const kt = kapasiteTanimi(tanimlar);
  const sira = {}; (tanimlar.prosesler || []).forEach((p) => { sira[p.ad] = p.sira ?? 999; });
  const prosesler = Array.from(new Set((product.recete || []).map((r) => r.proses).filter(Boolean)))
    .sort((a, b) => (sira[a] ?? 999) - (sira[b] ?? 999));
  const bedenler = Array.from(new Set((product.variants || []).map((v) => v.beden).filter(Boolean)));
  const bag = product.kapasite || {};
  const yaz = (proses, d) => onKaydet(product.id, { ...bag, [proses]: { ...(bag[proses] || {}), ...d } });
  if (!prosesler.length) return <div style={{ fontSize: 13, color: "var(--erp-text-3)", padding: 12 }}>Reçetede proses yok; önce reçeteye proses ekleyin.</div>;
  return (
    <div data-urun-kapasite style={{ display: "grid", gap: 10, padding: "4px 0" }}>
      {kt.makineler.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--erp-text-2)" }}>Makine tanımlı değil — Tanımlar › Kapasite'den ekleyin.</div>
      )}
      {prosesler.map((p) => {
        const b = bag[p] || {};
        const makineler = kt.makineler.filter((m) => !(m.prosesler || []).length || m.prosesler.includes(p));
        const kaliplar = kt.kaliplar.filter((k) => k.makineId === b.makineId);
        // PERSONEL (kullanıcı: "ürün için kapasiteyi kalıp, makine, personel olarak girebiliriz"): o prosesi
        // yapan elemanlar. Tanımlar › Kapasite'de bu prosese işaretlenmiş olanlar önce, hiçbiri yoksa tüm personel.
        const elemanTanimi = (id) => kt.elemanlar.find((e) => e.cariId === id) || {};
        const personeller = (cariler || []).filter((c) => c.tip === "Personel" && !c.pasif);
        const prosesPersoneli = personeller.filter((c) => (elemanTanimi(c.id).prosesler || []).includes(p));
        const personelSecenek = prosesPersoneli.length ? prosesPersoneli : personeller;
        return (
          <div key={p} data-kapasite-proses-satiri={p} style={{ border: "1px solid var(--erp-line-soft)", borderRadius: "var(--erp-r-md)", padding: 10, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <b style={{ minWidth: 110 }}>{p}</b>
              <select data-kapasite-makine={p} value={b.makineId || ""} onChange={(e) => yaz(p, { makineId: e.target.value, kalipIdler: [] })} style={{ ...inputStyle, width: 200 }}>
                <option value="">Makine yok</option>
                {makineler.map((m) => <option key={m.id} value={m.id}>{m.ad}</option>)}
              </select>
              {kaliplar.map((k) => {
                const on = (b.kalipIdler || []).includes(k.id);
                return (
                  <label key={k.id} style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 12, cursor: "pointer" }}>
                    <input type="checkbox" data-kapasite-kalip={k.ad} checked={on}
                      onChange={() => yaz(p, { kalipIdler: on ? b.kalipIdler.filter((x) => x !== k.id) : [...(b.kalipIdler || []), k.id] })} />
                    {k.tur || "Kalıp"}: {k.ad}
                  </label>
                );
              })}
            </div>
            {personelSecenek.length > 0 && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", fontSize: 12 }}>
                <span style={{ color: "var(--erp-text-3)", minWidth: 110 }}>Personel</span>
                {personelSecenek.map((c) => {
                  const on = (b.elemanIdler || []).includes(c.id);
                  const saat = elemanGunlukSaat(elemanTanimi(c.id));
                  return (
                    <label key={c.id} style={{ display: "flex", gap: 4, alignItems: "center", cursor: "pointer" }}>
                      <input type="checkbox" data-kapasite-personel={c.unvan} checked={on}
                        onChange={() => yaz(p, { elemanIdler: on ? b.elemanIdler.filter((x) => x !== c.id) : [...(b.elemanIdler || []), c.id] })} />
                      {c.unvan}{saat ? ` (${saat} s)` : ""}
                    </label>
                  );
                })}
              </div>
            )}
            {b.makineId && bedenler.length > 0 && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12 }}>
                {bedenler.map((bd) => {
                  const k = prosesKapasitesi(tanimlar, product, p, bd);
                  return (
                    <span key={bd} data-kapasite-gunluk={`${p}:${bd}`} title={k.eksik || `saatte ${k.saatlik}`}
                      style={{ color: k.eksik ? "var(--erp-danger, #B23B3B)" : "var(--erp-text-2)" }}>
                      {bd}: <b>{k.eksik ? "?" : Math.round(k.gunluk)}</b>/gün
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
